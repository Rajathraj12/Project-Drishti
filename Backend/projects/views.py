import os
import time
from pymongo import MongoClient

_SHARED_MONGO_CLIENT = None
_PROJECTS_CACHE = {}

def get_shared_mongo_db():
    global _SHARED_MONGO_CLIENT
    mongo_uri = os.getenv('MONGO_URI')
    if not mongo_uri:
        return None
    if _SHARED_MONGO_CLIENT is None:
        try:
            _SHARED_MONGO_CLIENT = MongoClient(
                mongo_uri,
                maxPoolSize=50,
                minPoolSize=5,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                socketTimeoutMS=10000,
            )
        except Exception as e:
            print(f"[MongoDB Pool Init Error]: {e}")
            return None
    return _SHARED_MONGO_CLIENT['drishti_db']

def invalidate_projects_cache():
    global _PROJECTS_CACHE
    _PROJECTS_CACHE.clear()

from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend
from .models import Project
from .serializers import ProjectSerializer, PublicProjectSerializer
from .risk_engine import analyze_project_risk
from core.models import Role
from core.rbac import (
    filter_project_queryset,
    get_role,
    has_capability,
    mongo_project_query,
    sanitize_project_payload,
    user_can_access_project,
)

class ScopePermission(permissions.BasePermission):
    """
    Role, capability, and jurisdictional authorization for project APIs.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        action_name = getattr(view, 'action', None)
        if action_name == 'create':
            return has_capability(request.user, 'create_project')
        if action_name in ('update', 'partial_update', 'destroy'):
            return has_capability(request.user, 'write_project')
        if action_name in ('analyze',):
            return has_capability(request.user, 'run_rule_analysis')
        if action_name in ('ml_analyze',):
            return has_capability(request.user, 'run_ml_analysis')
        if action_name in ('bulk_analyze',):
            return has_capability(request.user, 'bulk_analyze')
        if action_name in ('record_verification',):
            return has_capability(request.user, 'submit_verification')
        if action_name in ('corrective_actions',) and request.method == 'POST':
            return has_capability(request.user, 'create_corrective_actions')
        if action_name in ('corrective_actions',) and request.method == 'GET':
            return has_capability(request.user, 'view_corrective_actions')
        if action_name in ('checklist', 'all_checklists'):
            return True
        if request.method not in permissions.SAFE_METHODS and get_role(request.user) == Role.CITIZEN:
            return False
        return True

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user or not request.user.is_authenticated:
            return False
        if not user_can_access_project(request.user, obj):
            return False
        action_name = getattr(view, 'action', None)
        if action_name in ('update', 'partial_update', 'destroy'):
            return has_capability(request.user, 'write_project')
        return True

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [ScopePermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    filterset_fields = ['state', 'district', 'department', 'scheme', 'project_category', 'work_type', 'data_source_type', 'verification_status']
    search_fields = ['project_name', 'project_id', 'source_project_id']
    ordering_fields = ['created_at', 'updated_at', 'original_cost', 'delay_days', 'progress_gap_pct']
    ordering = ['-updated_at']

    def get_queryset(self):
        user = self.request.user
        qs = Project.objects.all()
        if not user or not user.is_authenticated:
            return qs.filter(data_source_type='OFFICIAL')
        return filter_project_queryset(qs, user)

    def get_serializer_class(self):
        if get_role(self.request.user) == Role.CITIZEN:
            return PublicProjectSerializer
        return ProjectSerializer

    def get_object(self):
        lookup = self.kwargs.get(self.lookup_field)
        qs = self.get_queryset()
        obj = qs.filter(project_id=lookup).first()
        if obj is None and str(lookup).isdigit():
            obj = qs.filter(pk=lookup).first()
        if obj is None:
            raise NotFound()
        self.check_object_permissions(self.request, obj)
        return obj

    def list(self, request, *args, **kwargs):
        """Fetch exclusively from MongoDB Atlas with persistent connection pool & cache."""
        now = time.time()
        scope = request.query_params.get('scope', 'default')
        user_id = getattr(request.user, 'id', 'anonymous') if request.user and request.user.is_authenticated else 'public'
        role = get_role(request.user) if request.user and request.user.is_authenticated else 'GUEST'
        cache_key = f"{role}:{user_id}:{scope}"
        
        if cache_key in _PROJECTS_CACHE:
            cached_data, expiry = _PROJECTS_CACHE[cache_key]
            if now < expiry:
                return Response(cached_data)

        db = get_shared_mongo_db()
        if db is None:
            return Response({"error": "MongoDB Atlas connection URI is not configured."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        try:
            collection = db['projects']
            
            if scope == 'all' and (not getattr(request.user, 'is_authenticated', False) or has_capability(request.user, 'view_contractors')):
                query = {'data_source_type': {'$ne': 'SYNTHETIC_DEMO'}}
            else:
                query = mongo_project_query(request.user)
            docs = list(collection.find(query).sort('project_id', 1))
            project_ids = [d.get("project_id") for d in docs if d.get("project_id")]
            assessments = list(db['risk_assessments'].find({"project_id": {"$in": project_ids}}))
            ml_assessments = list(db['ml_assessments'].find({"project_id": {"$in": project_ids}}))
            checklist_docs = list(db['inspection_checklists'].find({"project_id": {"$in": project_ids}}))
            
            latest_checklists = {c.get("project_id"): c.get("checked_items", {}) for c in checklist_docs}
            
            latest_assessments = {}
            for a in assessments:
                pid = a.get("project_id")
                if pid not in latest_assessments or a.get("assessment_timestamp", "") > latest_assessments[pid].get("assessment_timestamp", ""):
                    latest_assessments[pid] = a
                    
            latest_ml_assessments = {}
            for m in ml_assessments:
                pid = m.get("project_id")
                if pid not in latest_ml_assessments or m.get("assessed_at", "") > latest_ml_assessments[pid].get("assessed_at", ""):
                    latest_ml_assessments[pid] = m
            
            # Map CSV/Mongo fields to Frontend Expected Schema
            results = []
            for doc in docs:
                pid = doc.get("project_id")
                assessment = latest_assessments.get(pid)
                if not assessment:
                    try:
                        assessment = analyze_project_risk(doc)
                        latest_assessments[pid] = assessment
                    except Exception:
                        assessment = {}

                ml_assessment = latest_ml_assessments.get(pid)
                if not ml_assessment:
                    try:
                        from ml.predictor import predict_anomaly
                        flag, ml_score = predict_anomaly(doc)
                        ml_assessment = {
                            "ml_anomaly_score": round(ml_score, 2),
                            "anomaly_flag": bool(flag),
                            "anomaly_status": "ASSESSED",
                            "explanation": "Flagged by ML Isolation Forest model" if flag else "Within expected distribution"
                        }
                        latest_ml_assessments[pid] = ml_assessment
                    except Exception:
                        ml_assessment = {}

                payload = {
                    "project_id": doc.get("project_id"),
                    "project_name": doc.get("project_name"),
                    "state": doc.get("state"),
                    "district": doc.get("district", ""),
                    "sector": doc.get("sector"),
                    "latitude": doc.get("latitude"),
                    "longitude": doc.get("longitude"),
                    "location_from": doc.get("location_from"),
                    "location_to": doc.get("location_to"),
                    "original_cost": doc.get("original_cost_cr"),
                    "original_cost_cr": doc.get("original_cost_cr"),
                    "revised_cost": doc.get("revised_cost_cr"),
                    "revised_cost_cr": doc.get("revised_cost_cr"),
                    "expenditure": doc.get("expenditure_cr"),
                    "expenditure_cr": doc.get("expenditure_cr"),
                    "reported_progress": doc.get("reported_progress_pct"),
                    "data_source_type": doc.get("data_source_type") or "OFFICIAL",
                    "source_project_id": doc.get("source_project_id"),
                    "verification_status": doc.get("verification_status") or "NOT_REVIEWED",
                    "is_public": doc.get("is_public", True),
                    "risk_score": assessment.get("risk_score", None),
                    "risk_level": assessment.get("risk_level", None),
                    "ml_anomaly_score": ml_assessment.get("ml_anomaly_score", None),
                    "anomaly_flag": ml_assessment.get("anomaly_flag", None),
                    "anomaly_status": "ASSESSED" if ml_assessment.get("ml_anomaly_score") is not None else ml_assessment.get("anomaly_status", "NOT_ASSESSED"),
                    "ml_explanation": ml_assessment.get("explanation", None),
                    "inspection_checklist": latest_checklists.get(doc.get("project_id"), {})
                }
                results.append(sanitize_project_payload(request.user, payload))
                
            response_payload = {
                "count": len(results),
                "next": None,
                "previous": None,
                "results": results
            }
            _PROJECTS_CACHE[cache_key] = (response_payload, now + 30)
            return Response(response_payload)
        except Exception as e:
            return Response({"error": f"MongoDB Atlas Error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def create(self, request, *args, **kwargs):
        invalidate_projects_cache()
        """Create a new project document directly in MongoDB Atlas drishti_db.projects."""
        import os
        from datetime import datetime, timezone
        from pymongo import MongoClient
        
        mongo_uri = os.getenv('MONGO_URI')
        if not mongo_uri:
            return Response({"error": "MongoDB Atlas connection URI is not configured."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        data = request.data
        project_name = data.get('project_name')
        if not project_name or not str(project_name).strip():
            return Response({"error": "project_name is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            client = MongoClient(mongo_uri)
            db = client['drishti_db']
            collection = db['projects']
            
            # Auto-generate next project_id if not provided
            project_id = data.get('project_id')
            if not project_id:
                existing_ids = [d.get('project_id') for d in collection.find({}, {'project_id': 1})]
                highest_num = 0
                for pid in existing_ids:
                    if pid and str(pid).startswith('DR-'):
                        try:
                            num = int(str(pid)[3:])
                            if num > highest_num:
                                highest_num = num
                        except ValueError:
                            pass
                project_id = f"DR-{highest_num + 1:04d}"
            else:
                project_id = str(project_id).strip().upper()
                if collection.find_one({"project_id": project_id}):
                    client.close()
                    return Response({"error": f"Project with ID '{project_id}' already exists in MongoDB."}, status=status.HTTP_400_BAD_REQUEST)
            
            orig_cr = float(data.get('original_cost_cr') or data.get('original_cost') or 100.0)
            rev_cr = float(data.get('revised_cost_cr') or data.get('revised_cost') or orig_cr)
            exp_cr = float(data.get('expenditure_cr') or data.get('expenditure') or 0.0)
            progress_pct = float(data.get('reported_progress_pct') or data.get('reported_progress') or 0.0)
            
            doc = {
                "project_id": project_id,
                "project_name": str(project_name).strip(),
                "state": data.get('state', 'Delhi'),
                "district": data.get('district', '') or '',
                "sector": data.get('sector') or data.get('department', 'Infrastructure'),
                "department": data.get('department') or data.get('sector', 'Infrastructure'),
                "scheme": data.get('scheme', 'Central Infrastructure Scheme'),
                "project_category": data.get('project_category', 'Mega Project'),
                "work_type": data.get('work_type', 'Civil Construction'),
                "location_from": data.get('location_from', '') or '',
                "location_to": data.get('location_to', '') or '',
                "latitude": float(data.get('latitude') or 28.6139),
                "longitude": float(data.get('longitude') or 77.2090),
                "original_cost_cr": orig_cr,
                "revised_cost_cr": rev_cr,
                "expenditure_cr": exp_cr,
                "reported_progress_pct": progress_pct,
                "data_source_type": data.get('data_source_type', 'OFFICIAL'),
                "verification_status": data.get('verification_status', 'NOT_REVIEWED'),
                "is_public": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            
            collection.insert_one(doc)
            
            # Initialize empty checklist in inspection_checklists
            db['inspection_checklists'].update_one(
                {"project_id": project_id},
                {"$setOnInsert": {"project_id": project_id, "checked_items": {}, "updated_at": datetime.now(timezone.utc).isoformat()}},
                upsert=True
            )
            client.close()
            
            # Format payload for frontend
            doc.pop('_id', None)
            doc['reported_progress'] = progress_pct
            doc['original_cost'] = orig_cr
            doc['revised_cost'] = rev_cr
            doc['expenditure'] = exp_cr
            return Response(doc, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": f"Failed to create project in MongoDB: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        invalidate_projects_cache()
        """Update a project document in MongoDB Atlas drishti_db.projects."""
        import os
        from datetime import datetime, timezone
        from pymongo import MongoClient
        
        pk = kwargs.get('pk')
        mongo_uri = os.getenv('MONGO_URI')
        if not mongo_uri:
            return Response({"error": "MongoDB Atlas connection URI is not configured."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        data = request.data
        try:
            client = MongoClient(mongo_uri)
            db = client['drishti_db']
            collection = db['projects']
            
            existing = collection.find_one({"project_id": pk})
            if not existing:
                client.close()
                return Response({"error": f"Project '{pk}' not found in MongoDB."}, status=status.HTTP_404_NOT_FOUND)
            
            update_fields = {}
            field_mappings = {
                'project_name': str,
                'state': str,
                'district': str,
                'sector': str,
                'department': str,
                'scheme': str,
                'project_category': str,
                'work_type': str,
                'location_from': str,
                'location_to': str,
                'data_source_type': str,
                'verification_status': str,
            }
            for field, type_fn in field_mappings.items():
                if field in data and data[field] is not None:
                    update_fields[field] = type_fn(data[field])
            
            if 'original_cost_cr' in data or 'original_cost' in data:
                val = data.get('original_cost_cr', data.get('original_cost'))
                update_fields['original_cost_cr'] = float(val)
            if 'revised_cost_cr' in data or 'revised_cost' in data:
                val = data.get('revised_cost_cr', data.get('revised_cost'))
                update_fields['revised_cost_cr'] = float(val)
            if 'expenditure_cr' in data or 'expenditure' in data:
                val = data.get('expenditure_cr', data.get('expenditure'))
                update_fields['expenditure_cr'] = float(val)
            if 'reported_progress_pct' in data or 'reported_progress' in data:
                val = data.get('reported_progress_pct', data.get('reported_progress'))
                update_fields['reported_progress_pct'] = float(val)
            if 'latitude' in data and data['latitude'] is not None:
                update_fields['latitude'] = float(data['latitude'])
            if 'longitude' in data and data['longitude'] is not None:
                update_fields['longitude'] = float(data['longitude'])
            if 'is_public' in data and data['is_public'] is not None:
                update_fields['is_public'] = bool(data['is_public'])
                
            update_fields['updated_at'] = datetime.now(timezone.utc).isoformat()
            
            collection.update_one({"project_id": pk}, {"$set": update_fields})
            updated_doc = collection.find_one({"project_id": pk}, {'_id': 0})
            client.close()
            
            if updated_doc:
                updated_doc['reported_progress'] = updated_doc.get('reported_progress_pct')
                updated_doc['original_cost'] = updated_doc.get('original_cost_cr')
                updated_doc['revised_cost'] = updated_doc.get('revised_cost_cr')
                updated_doc['expenditure'] = updated_doc.get('expenditure_cr')
                return Response(updated_doc, status=status.HTTP_200_OK)
            return Response({"error": "Failed to retrieve updated document."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({"error": f"Failed to update project in MongoDB: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def destroy(self, request, *args, **kwargs):
        invalidate_projects_cache()
        """Delete a project document from MongoDB Atlas drishti_db.projects."""
        import os
        from pymongo import MongoClient
        
        pk = kwargs.get('pk')
        mongo_uri = os.getenv('MONGO_URI')
        if not mongo_uri:
            return Response({"error": "MongoDB Atlas connection URI is not configured."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        try:
            client = MongoClient(mongo_uri)
            db = client['drishti_db']
            
            res = db['projects'].delete_one({"project_id": pk})
            if res.deleted_count == 0:
                client.close()
                return Response({"error": f"Project '{pk}' not found in MongoDB."}, status=status.HTTP_404_NOT_FOUND)
                
            # Clean up associated checklists
            db['inspection_checklists'].delete_many({"project_id": pk})
            db['risk_assessments'].delete_many({"project_id": pk})
            db['ml_assessments'].delete_many({"project_id": pk})
            client.close()
            
            return Response({"message": f"Project '{pk}' successfully deleted from MongoDB Atlas.", "project_id": pk}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Failed to delete project from MongoDB: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get_mongo_project(self, project_id):
        import os
        from pymongo import MongoClient
        mongo_uri = os.getenv('MONGO_URI')
        if not mongo_uri:
            return None
        try:
            client = MongoClient(mongo_uri)
            db = client['drishti_db']
            doc = db['projects'].find_one({"project_id": project_id, "data_source_type": {"$ne": "SYNTHETIC_DEMO"}})
            client.close()
            return doc
        except Exception:
            return None

    def _load_project_record(self, project_id):
        return self.get_mongo_project(project_id)

    def _authorize_project(self, pk, capability=None):
        record = self._load_project_record(pk)
        if not record or not user_can_access_project(self.request.user, record):
            raise NotFound()
        if capability and not has_capability(self.request.user, capability):
            raise PermissionDenied()
        return record

    def retrieve(self, request, *args, **kwargs):
        pk = kwargs.get('pk')
        doc = self.get_mongo_project(pk)
        if doc and doc.get('project_id'):
            if not user_can_access_project(request.user, doc):
                raise NotFound()

            risk_assessment = {}
            ml_assessment = {}
            import os
            from pymongo import MongoClient, DESCENDING
            mongo_uri = os.getenv('MONGO_URI')
            if mongo_uri:
                try:
                    client = MongoClient(mongo_uri)
                    db = client['drishti_db']
                    r = db['risk_assessments'].find_one(
                        {"project_id": pk},
                        sort=[("assessment_timestamp", DESCENDING)]
                    )
                    if r:
                        if '_id' in r: del r['_id']
                        risk_assessment = r
                    m = db['ml_assessments'].find_one(
                        {"project_id": pk},
                        sort=[("assessed_at", DESCENDING)]
                    )
                    if m:
                        if '_id' in m: del m['_id']
                        ml_assessment = m
                    client.close()
                except Exception:
                    pass

            orig = doc.get("original_cost_cr") or 0.0
            rev = doc.get("revised_cost_cr") or orig
            exp = doc.get("expenditure_cr") or 0.0
            overrun = doc.get("cost_overrun_cr")
            if overrun is None:
                overrun = round(rev - orig, 2)

            fin_util = doc.get("financial_utilization_pct")
            if fin_util is None and rev > 0:
                fin_util = round((exp / rev) * 100.0, 2)

            cost_dev = doc.get("cost_deviation_pct")
            if cost_dev is None and orig > 0:
                cost_dev = round(((rev - orig) / orig) * 100.0, 2)

            progress_val = doc.get("reported_progress_pct") or 0.0

            payload = {
                "project_id": doc.get("project_id"),
                "project_name": doc.get("project_name"),
                "state": doc.get("state"),
                "district": doc.get("district", "") or "Unspecified",
                "sector": doc.get("sector") or doc.get("department", ""),
                "department": doc.get("department") or doc.get("sector", ""),
                "original_cost": orig,
                "original_cost_cr": orig,
                "revised_cost": rev,
                "revised_cost_cr": rev,
                "expenditure": exp,
                "expenditure_cr": exp,
                "cost_overrun_cr": overrun,
                "cost_deviation_pct": cost_dev or 0.0,
                "financial_utilization_pct": fin_util or 0.0,
                "expenditure_progress_ratio": doc.get("expenditure_progress_ratio", 0.0),
                "reported_progress": progress_val,
                "reported_progress_pct": progress_val,
                "data_source_type": doc.get("data_source_type", "OFFICIAL"),
                "source_project_id": doc.get("source_project_id", doc.get("project_id")),
                "source_name": doc.get("source_name", "MoSPI PAIMANA"),
                "source_reference": doc.get("source_reference", "PAIMANA Flash Report February 2026"),
                "source_url": doc.get("source_url", "https://cspm.gov.in"),
                "source_as_of_date": doc.get("source_as_of_date", "2026-02-28"),
                "verification_status": doc.get("verification_status", "NOT_REVIEWED"),
                "is_public": doc.get("is_public", True),
                "risk_score": risk_assessment.get("risk_score"),
                "risk_level": risk_assessment.get("risk_level"),
                "ml_anomaly_score": ml_assessment.get("ml_anomaly_score"),
                "anomaly_flag": ml_assessment.get("anomaly_flag"),
                "anomaly_status": "ASSESSED" if ml_assessment.get("ml_anomaly_score") is not None else ml_assessment.get("anomaly_status", "NOT_ASSESSED"),
                "ml_explanation": ml_assessment.get("explanation"),
            }
            return Response(sanitize_project_payload(request.user, payload))

        raise NotFound()

    @action(detail=True, methods=['post'])
    def analyze(self, request, pk=None):
        invalidate_projects_cache()
        self._authorize_project(pk, capability='run_rule_analysis')
        project_doc = self.get_mongo_project(pk)
        if not project_doc:
            return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)
            
        # Run Phase 3 Rule Engine
        assessment = analyze_project_risk(project_doc)
        
        # Save to MongoDB
        import os
        from pymongo import MongoClient
        mongo_uri = os.getenv('MONGO_URI')
        if mongo_uri:
            try:
                client = MongoClient(mongo_uri)
                db = client['drishti_db']
                db['risk_assessments'].update_one(
                    {"project_id": project_doc.get('project_id')},
                    {"$set": assessment.copy()},
                    upsert=True
                )
                client.close()
            except Exception as e:
                print("Failed to save assessment:", e)
                
        # Remove MongoDB _id for JSON serialization if present
        if "_id" in assessment:
            del assessment["_id"]
            
        return Response(assessment)

    @action(detail=True, methods=['get'])
    def risk(self, request, pk=None):
        self._authorize_project(pk, capability='view_internal_risk')
        import os
        from pymongo import MongoClient, DESCENDING
        mongo_uri = os.getenv('MONGO_URI')
        if not mongo_uri:
            return Response({"error": "Database not configured"}, status=500)
            
        try:
            client = MongoClient(mongo_uri)
            db = client['drishti_db']
            # Get latest assessment
            assessment = db['risk_assessments'].find_one(
                {"project_id": pk},
                sort=[("assessment_timestamp", DESCENDING)]
            )
            client.close()
            
            if not assessment:
                return Response({"error": "No assessment found"}, status=status.HTTP_404_NOT_FOUND)
                
            if "_id" in assessment:
                del assessment["_id"]
            return Response(assessment)
        except Exception as e:
            return Response({"error": str(e)}, status=500)
            
    @action(detail=True, methods=['get'], url_path='risk/history')
    def risk_history(self, request, pk=None):
        self._authorize_project(pk, capability='view_internal_risk')
        import os
        from pymongo import MongoClient, DESCENDING
        mongo_uri = os.getenv('MONGO_URI')
        if not mongo_uri:
            return Response({"error": "Database not configured"}, status=500)
            
        try:
            client = MongoClient(mongo_uri)
            db = client['drishti_db']
            cursor = db['risk_assessments'].find(
                {"project_id": pk},
                sort=[("assessment_timestamp", DESCENDING)]
            )
            assessments = list(cursor)
            client.close()
            
            for a in assessments:
                if "_id" in a:
                    del a["_id"]
                    
            return Response(assessments)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=True, methods=['post'], url_path='ml-analyze')
    def ml_analyze(self, request, pk=None):
        invalidate_projects_cache()
        self._authorize_project(pk, capability='run_ml_analysis')
        project_doc = self.get_mongo_project(pk)
        if not project_doc:
            return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)
            
        from ml.predictor import predict_anomaly, get_model, MODEL_VERSION
        from datetime import datetime
        import uuid
        
        # Check if enough valid data
        orig = project_doc.get("original_cost_cr")
        if orig is None or orig <= 0:
            assessment = {
                "assessment_id": str(uuid.uuid4()),
                "project_id": pk,
                "ml_anomaly_score": None,
                "anomaly_flag": None,
                "anomaly_status": "INSUFFICIENT_DATA",
                "model_version": MODEL_VERSION,
                "feature_schema_version": "1.0",
                "assessed_at": datetime.utcnow().isoformat() + "Z",
                "features_used": [],
                "data_quality_warnings": ["Missing valid original_cost_cr"],
                "explanation": "Insufficient data to run ML analysis."
            }
        else:
            model = get_model()
            if not model:
                assessment = {
                    "assessment_id": str(uuid.uuid4()),
                    "project_id": pk,
                    "ml_anomaly_score": None,
                    "anomaly_flag": None,
                    "anomaly_status": "MODEL_NOT_AVAILABLE",
                    "model_version": MODEL_VERSION,
                    "feature_schema_version": "1.0",
                    "assessed_at": datetime.utcnow().isoformat() + "Z",
                    "features_used": [],
                    "data_quality_warnings": ["Model file not found or failed to load"],
                    "explanation": "Model is unavailable."
                }
            else:
                try:
                    flag, ml_score = predict_anomaly(project_doc)
                    explanation = ""
                    if flag:
                        explanation = "The observed pattern of cost and progress is highly unusual relative to the model's reference data. This flags the project as anomalous but does not prove misconduct."
                    else:
                        explanation = "The project's financial and physical progress patterns are consistent with the normal distribution of the reference dataset."
                        
                    assessment = {
                        "assessment_id": str(uuid.uuid4()),
                        "project_id": pk,
                        "ml_anomaly_score": round(ml_score, 2),
                        "anomaly_flag": flag,
                        "anomaly_status": "ASSESSED",
                        "model_version": MODEL_VERSION,
                        "feature_schema_version": "1.0",
                        "assessed_at": datetime.utcnow().isoformat() + "Z",
                        "features_used": ["original_cost_cr", "revised_cost_cr", "expenditure_cr", "reported_progress_pct"],
                        "data_quality_warnings": [],
                        "explanation": explanation
                    }
                except Exception as e:
                    assessment = {
                        "assessment_id": str(uuid.uuid4()),
                        "project_id": pk,
                        "ml_anomaly_score": None,
                        "anomaly_flag": None,
                        "anomaly_status": "ASSESSMENT_FAILED",
                        "model_version": MODEL_VERSION,
                        "feature_schema_version": "1.0",
                        "assessed_at": datetime.utcnow().isoformat() + "Z",
                        "features_used": [],
                        "data_quality_warnings": [f"Prediction failed: {str(e)}"],
                        "explanation": "Failed to compute prediction."
                    }
                    
        import os
        from pymongo import MongoClient
        mongo_uri = os.getenv('MONGO_URI')
        if mongo_uri:
            try:
                client = MongoClient(mongo_uri)
                db = client['drishti_db']
                db['ml_assessments'].update_one(
                    {"project_id": pk},
                    {"$set": assessment.copy()},
                    upsert=True
                )
                client.close()
            except Exception as e:
                print("Failed to save ML assessment:", e)
                
        if "_id" in assessment:
            del assessment["_id"]
            
        return Response(assessment)

    @action(detail=True, methods=['get'], url_path='ml-risk')
    def ml_risk(self, request, pk=None):
        self._authorize_project(pk, capability='view_ml_assessment')
        import os
        from pymongo import MongoClient, DESCENDING
        mongo_uri = os.getenv('MONGO_URI')
        if not mongo_uri:
            return Response({"error": "Database not configured"}, status=500)
            
        try:
            client = MongoClient(mongo_uri)
            db = client['drishti_db']
            assessment = db['ml_assessments'].find_one(
                {"project_id": pk},
                sort=[("assessed_at", DESCENDING)]
            )
            client.close()
            
            if not assessment:
                return Response({"error": "No ML assessment found"}, status=status.HTTP_404_NOT_FOUND)
                
            if "_id" in assessment:
                del assessment["_id"]
            return Response(assessment)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=False, methods=['post'], url_path='bulk-analyze')
    def bulk_analyze(self, request):
        invalidate_projects_cache()
        user = request.user
        if not has_capability(user, 'bulk_analyze'):
            return Response({"error": "Unauthorized to perform bulk analysis"}, status=status.HTTP_403_FORBIDDEN)
            
        import os
        from pymongo import MongoClient
        mongo_uri = os.getenv('MONGO_URI')
        if not mongo_uri:
            return Response({"error": "Database not configured"}, status=500)
            
        try:
            client = MongoClient(mongo_uri)
            db = client['drishti_db']
            
            query = mongo_project_query(user)
                    
            docs = list(db['projects'].find(query))
            total = len(docs)
            successful = 0
            unavailable = 0
            failures = 0
            
            for doc in docs:
                try:
                    assessment = analyze_project_risk(doc)
                    if assessment.get('risk_level') == 'Unavailable':
                        unavailable += 1
                    else:
                        successful += 1
                        
                    db['risk_assessments'].update_one(
                        {"project_id": doc.get('project_id')},
                        {"$set": assessment},
                        upsert=True
                    )
                except Exception as e:
                    failures += 1
                    
            client.close()
            return Response({
                "total_projects": total,
                "successful": successful,
                "unavailable": unavailable,
                "failures": failures
            })
            
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=True, methods=['post'], url_path='verify')
    def record_verification(self, request, pk=None):
        invalidate_projects_cache()
        user = request.user
        if not user or not user.is_authenticated:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        if not has_capability(user, 'submit_verification'):
            return Response({"error": "Forbidden: not permitted to submit verification records"}, status=status.HTTP_403_FORBIDDEN)

        project_doc = self._load_project_record(pk)
        if not project_doc or not user_can_access_project(user, project_doc):
            return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('verification_status')
        valid_statuses = ['NOT_REVIEWED', 'IN_REVIEW', 'VERIFIED', 'CLOSED']
        if new_status and new_status not in valid_statuses:
            return Response({"error": f"Invalid status. Must be one of {valid_statuses}"}, status=status.HTTP_400_BAD_REQUEST)
            
        notes = request.data.get('notes', '')
        evidence_refs = request.data.get('evidence_references', [])
        if not isinstance(evidence_refs, list):
            evidence_refs = [evidence_refs]

        from datetime import datetime, timezone
        import uuid
        import os
        from pymongo import MongoClient

        record = {
            "verification_id": str(uuid.uuid4()),
            "project_id": pk,
            "reviewer_id": str(getattr(user, 'id', user.username)),
            "reviewer_name": getattr(user, 'username', 'Unknown'),
            "reviewer_role": getattr(user, 'role', 'Officer'),
            "verification_status": new_status or project_doc.get('verification_status', 'IN_REVIEW'),
            "notes": notes,
            "evidence_references": evidence_refs,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        mongo_uri = os.getenv('MONGO_URI')
        if mongo_uri:
            try:
                client = MongoClient(mongo_uri)
                db = client['drishti_db']
                
                # Save audit log
                db['verification_records'].insert_one(record.copy())
                
                # Update project document if status changed
                if new_status:
                    db['projects'].update_one(
                        {"project_id": pk},
                        {"$set": {"verification_status": new_status}}
                    )
                client.close()
            except Exception as e:
                return Response({"error": f"Database error: {str(e)}"}, status=500)

        # Clean _id for JSON output
        if "_id" in record:
            del record["_id"]

        return Response(record, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='verifications')
    def list_verifications(self, request, pk=None):
        self._authorize_project(pk, capability='view_verifications')
        import os
        from pymongo import MongoClient, DESCENDING
        mongo_uri = os.getenv('MONGO_URI')
        if not mongo_uri:
            return Response({"error": "Database not configured"}, status=500)
            
        try:
            client = MongoClient(mongo_uri)
            db = client['drishti_db']
            records = list(db['verification_records'].find({"project_id": pk}).sort("timestamp", DESCENDING))
            client.close()
            
            for r in records:
                if "_id" in r:
                    del r["_id"]
            return Response(records)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=True, methods=['get', 'post'], url_path='evidence')
    def evidence(self, request, pk=None):
        capability = 'submit_evidence' if request.method == 'POST' else 'view_evidence'
        self._authorize_project(pk, capability=capability)
        return Response({'count': 0, 'results': []})

    @action(detail=True, methods=['get', 'post'], url_path='corrective-actions')
    def corrective_actions(self, request, pk=None):
        capability = 'create_corrective_actions' if request.method == 'POST' else 'view_corrective_actions'
        self._authorize_project(pk, capability=capability)
        from .corrective_actions import CorrectiveActionViewSet
        handler = CorrectiveActionViewSet()
        handler.request = request
        handler.format_kwarg = None
        if request.method == 'GET':
            # inject project_id into query_params
            q_params = request.query_params.copy()
            q_params['project_id'] = pk
            request._request.GET = q_params
            return handler.list(request)
        elif request.method == 'POST':
            data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
            data['project_id'] = pk
            request._full_data = data
            return handler.create(request)
        return Response({"error": "Method not allowed"}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(detail=False, methods=['get'], url_path='checklists')
    def all_checklists(self, request):
        """Retrieve all Section 65B inspection checklists from MongoDB Atlas."""
        import os
        from pymongo import MongoClient
        mongo_uri = os.getenv('MONGO_URI')
        if not mongo_uri:
            return Response({"error": "MongoDB not configured"}, status=500)
        try:
            client = MongoClient(mongo_uri)
            db = client['drishti_db']
            docs = list(db['inspection_checklists'].find())
            client.close()
            results = {d.get("project_id"): d.get("checked_items", {}) for d in docs if d.get("project_id")}
            return Response(results)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=True, methods=['get', 'post', 'patch'], url_path='checklist')
    def checklist(self, request, pk=None):
        """Get or save Section 65B inspection checklist for a project in MongoDB Atlas."""
        import os
        from pymongo import MongoClient
        from datetime import datetime, timezone

        mongo_uri = os.getenv('MONGO_URI')
        if not mongo_uri:
            return Response({"error": "MongoDB not configured"}, status=500)

        try:
            client = MongoClient(mongo_uri)
            db = client['drishti_db']
            col = db['inspection_checklists']

            if request.method == 'GET':
                doc = col.find_one({"project_id": pk})
                client.close()
                if doc and "_id" in doc:
                    del doc["_id"]
                return Response(doc or {"project_id": pk, "checked_items": {}})

            # Save / update checklist
            checked_items = request.data.get("checked_items", {})
            user_name = getattr(request.user, "username", "Official Auditor")
            verified_count = sum(1 for v in checked_items.values() if v)

            doc = {
                "project_id": pk,
                "checked_items": checked_items,
                "verified_count": verified_count,
                "total_count": len(checked_items) or 7,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user_name
            }

            col.update_one({"project_id": pk}, {"$set": doc}, upsert=True)
            client.close()
            return Response({"status": "saved", "project_id": pk, "checked_items": checked_items, "verified_count": verified_count})
        except Exception as e:
            return Response({"error": str(e)}, status=500)

