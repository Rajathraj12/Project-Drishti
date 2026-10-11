from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Project
from .serializers import ProjectSerializer
from .risk_engine import analyze_project_risk
from core.models import Role

class ScopePermission(permissions.BasePermission):
    """
    Custom permission to implement Phase 1 RBAC and Scope Authorization.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Citizens cannot create or update
        if hasattr(request.user, 'role') and request.user.role == Role.CITIZEN and request.method not in permissions.SAFE_METHODS:
            return False
        return True

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        # Admin can do anything
        if hasattr(request.user, 'role') and request.user.role == Role.ADMIN:
            return True
        # Read-only for citizens
        if hasattr(request.user, 'role') and request.user.role == Role.CITIZEN and request.method in permissions.SAFE_METHODS:
            return True
        # For Govt Officer or Field Officer, check scopes
        if hasattr(request.user, 'role') and request.user.role in [Role.GOVERNMENT_OFFICER, Role.FIELD_OFFICER]:
            if request.user.state and obj.state != request.user.state:
                return False
            if request.user.district and obj.district != request.user.district:
                return False
            if request.user.department and obj.department != request.user.department:
                return False
            return True
            
        return False

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
        
        # Apply Phase 1 Scope filtering at the queryset level
        if not user or not user.is_authenticated:
            return qs.none()
            
        if hasattr(user, 'role') and user.role == Role.ADMIN:
            return qs
            
        if hasattr(user, 'role') and user.role in [Role.GOVERNMENT_OFFICER, Role.FIELD_OFFICER]:
            if user.state:
                qs = qs.filter(state=user.state)
            if user.district:
                qs = qs.filter(district=user.district)
            if user.department:
                qs = qs.filter(department=user.department)
                
        # Citizens can see everything, or maybe a limited public view. 
        # Assuming they can see all for now unless restricted.
        return qs

    def list(self, request, *args, **kwargs):
        """Fetch directly from MongoDB Atlas instead of SQLite"""
        import os
        from pymongo import MongoClient
        from rest_framework.response import Response
        
        mongo_uri = os.getenv('MONGO_URI')
        if not mongo_uri:
            # Fallback to SQLite if Mongo URI is not set
            return super().list(request, *args, **kwargs)
            
        try:
            client = MongoClient(mongo_uri)
            db = client['drishti_db']
            collection = db['projects']
            
            # Scoping query based on user role
            query = {}
            user = request.user
            if hasattr(user, 'role') and user.role in [Role.GOVERNMENT_OFFICER, Role.FIELD_OFFICER]:
                if user.state:
                    query['state'] = user.state
                    
            docs = list(collection.find(query))
            project_ids = [d.get("project_id") for d in docs if d.get("project_id")]
            assessments = list(db['risk_assessments'].find({"project_id": {"$in": project_ids}}))
            ml_assessments = list(db['ml_assessments'].find({"project_id": {"$in": project_ids}}))
            client.close()
            
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
                assessment = latest_assessments.get(pid, {})
                ml_assessment = latest_ml_assessments.get(pid, {})
                results.append({
                    "project_id": doc.get("project_id"),
                    "project_name": doc.get("project_name"),
                    "state": doc.get("state"),
                    "district": doc.get("district", ""),
                    "sector": doc.get("sector"),
                    "original_cost": doc.get("original_cost_cr"),
                    "revised_cost": doc.get("revised_cost_cr"),
                    "expenditure": doc.get("expenditure_cr"),
                    "reported_progress": doc.get("reported_progress_pct"),
                    "data_source_type": doc.get("data_source_type"),
                    "source_project_id": doc.get("source_project_id"),
                    "risk_score": assessment.get("risk_score", None),
                    "risk_level": assessment.get("risk_level", None),
                    "ml_anomaly_score": ml_assessment.get("ml_anomaly_score", None),
                    "anomaly_flag": ml_assessment.get("anomaly_flag", None),
                    "anomaly_status": ml_assessment.get("anomaly_status", "NOT_ASSESSED"),
                    "ml_explanation": ml_assessment.get("explanation", None)
                })
                
            return Response({
                "count": len(results),
                "next": None,
                "previous": None,
                "results": results
            })
        except Exception as e:
            # Fallback
            print(f"MongoDB Error: {e}")
            return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        # Audit event will be handled by signals or overridden methods later
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()

    def get_mongo_project(self, project_id):
        import os
        from pymongo import MongoClient
        mongo_uri = os.getenv('MONGO_URI')
        if not mongo_uri:
            return None
        try:
            client = MongoClient(mongo_uri)
            db = client['drishti_db']
            doc = db['projects'].find_one({"project_id": project_id})
            client.close()
            return doc
        except Exception:
            return None

    @action(detail=True, methods=['post'])
    def analyze(self, request, pk=None):
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
        user = request.user
        if not hasattr(user, 'role') or user.role not in [Role.ADMIN, Role.GOVERNMENT_OFFICER]:
            return Response({"error": "Unauthorized to perform bulk analysis"}, status=status.HTTP_403_FORBIDDEN)
            
        import os
        from pymongo import MongoClient
        mongo_uri = os.getenv('MONGO_URI')
        if not mongo_uri:
            return Response({"error": "Database not configured"}, status=500)
            
        try:
            client = MongoClient(mongo_uri)
            db = client['drishti_db']
            
            query = {}
            if user.role == Role.GOVERNMENT_OFFICER:
                if user.state:
                    query['state'] = user.state
                    
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
        user = request.user
        if not user or not user.is_authenticated:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            
        allowed_roles = [Role.ADMIN, Role.GOVERNMENT_OFFICER, Role.FIELD_OFFICER]
        if hasattr(user, 'role') and user.role not in allowed_roles:
            return Response({"error": "Forbidden: Citizens cannot submit verification records"}, status=status.HTTP_403_FORBIDDEN)
            
        project_doc = self.get_mongo_project(pk)
        if not project_doc:
            return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)
            
        # Check jurisdiction
        if hasattr(user, 'role') and user.role in [Role.GOVERNMENT_OFFICER, Role.FIELD_OFFICER]:
            if user.state and project_doc.get('state') != user.state:
                return Response({"error": "Forbidden: Project outside user state jurisdiction"}, status=status.HTTP_403_FORBIDDEN)
            if user.district and project_doc.get('district') != user.district:
                return Response({"error": "Forbidden: Project outside user district jurisdiction"}, status=status.HTTP_403_FORBIDDEN)
            if user.department and project_doc.get('department') != user.department:
                return Response({"error": "Forbidden: Project outside user department jurisdiction"}, status=status.HTTP_403_FORBIDDEN)

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
