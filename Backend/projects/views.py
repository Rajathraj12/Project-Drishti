from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Project
from .serializers import ProjectSerializer
from core.models import Role

class ScopePermission(permissions.BasePermission):
    """
    Custom permission to implement Phase 1 RBAC and Scope Authorization.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        # Citizens cannot create or update
        if request.user.role == Role.CITIZEN and request.method not in permissions.SAFE_METHODS:
            return False
        return True

    def has_object_permission(self, request, view, obj):
        # Admin can do anything
        if request.user.role == Role.ADMIN:
            return True
        # Read-only for citizens
        if request.user.role == Role.CITIZEN and request.method in permissions.SAFE_METHODS:
            return True
        # For Govt Officer or Field Officer, check scopes
        if request.user.role in [Role.GOVERNMENT_OFFICER, Role.FIELD_OFFICER]:
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
        if not user.is_authenticated:
            return qs.none()
            
        if user.role == Role.ADMIN:
            return qs
            
        if user.role in [Role.GOVERNMENT_OFFICER, Role.FIELD_OFFICER]:
            if user.state:
                qs = qs.filter(state=user.state)
            if user.district:
                qs = qs.filter(district=user.district)
            if user.department:
                qs = qs.filter(department=user.department)
                
        # Citizens can see everything, or maybe a limited public view. 
        # Assuming they can see all for now unless restricted.
        return qs

    def perform_create(self, serializer):
        # Audit event will be handled by signals or overridden methods later
        serializer.save()

    def perform_update(self, serializer):
        serializer.save()

    @action(detail=True, methods=['post'])
    def analyze(self, request, pk=None):
        project = self.get_object()
        
        # 2. Run existing rule engine (Mock implementation for now)
        rule_signals = []
        if project.cost_deviation_pct and project.cost_deviation_pct > 20:
            rule_signals.append({
                "rule_code": "COST_DEVIATION",
                "triggered": True,
                "message": "Revised project cost is significantly above original cost."
            })
            
        # 3. Run Isolation Forest
        ml_score = 0.0
        anomaly_flag = False
        model_version = "iforest_v1"
        
        try:
            import os, joblib
            from ml.config import NUMERICAL_FEATURES
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            model_path = os.path.join(base_dir, "ml", "models", "isolation_forest.joblib")
            if os.path.exists(model_path):
                model = joblib.load(model_path)
                features = []
                for f in NUMERICAL_FEATURES:
                    val = getattr(project, f, 0)
                    features.append(float(val) if val is not None else 0.0)
                
                # Predict
                score = model.decision_function([features])[0]
                pred = model.predict([features])[0]
                ml_score = float(-score)
                anomaly_flag = bool(pred == -1)
        except Exception as e:
            print("ML Error:", e)

        # 4. Combine signals
        attention_level = "LOW"
        if anomaly_flag or len(rule_signals) > 0:
            attention_level = "HIGH"
            
        result = {
            "project_id": project.project_id,
            "rule_signals": rule_signals,
            "ml_score": ml_score,
            "anomaly_flag": anomaly_flag,
            "model_version": model_version,
            "attention_level": attention_level,
            "created_at": project.created_at.isoformat()
        }
        return Response(result)

    @action(detail=True, methods=['get'], url_path='why-flagged')
    def why_flagged(self, request, pk=None):
        project = self.get_object()
        
        rule_signals = []
        if project.cost_deviation_pct and project.cost_deviation_pct > 20:
            rule_signals.append({
                "rule_code": "COST_DEVIATION",
                "triggered": True,
                "message": "Revised project cost is significantly above original cost."
            })
            
        ml_signal = {
            "anomaly_flag": True, # Mock based on the DB or on the fly
            "model_version": "iforest_v1",
            "explanation": "The project's numerical feature combination is unusual compared with the training population."
        }
        
        return Response({
            "rule_signals": rule_signals,
            "ml_signal": ml_signal
        })
