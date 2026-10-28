from django.db.models import Q
from rest_framework import viewsets, status, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from core.models import User, Role
from core.rbac import get_role, has_capability
from core.serializers import UserAdminSerializer, serialize_user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username = serializers.CharField(required=False)
    email = serializers.CharField(required=False)

    def validate(self, attrs):
        login_id = attrs.get('username') or attrs.get('email')
        if not login_id:
            raise serializers.ValidationError({"detail": "Username or email is required."})

        login_id = str(login_id).strip()
        user_obj = User.objects.filter(
            Q(username__iexact=login_id) | Q(email__iexact=login_id)
        ).first()

        if user_obj:
            attrs['username'] = user_obj.username
        else:
            attrs['username'] = login_id

        data = super().validate(attrs)
        user = self.user
        data['token'] = data['access']
        data['user'] = serialize_user(user)
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


@api_view(['GET'])
@permission_classes([AllowAny])
def demo_users_view(request):
    """
    Returns example seed accounts for all user types.
    Reads live from MongoDB Atlas drishti_db.users;
    falls back to default seed list if MongoDB is momentarily unreachable.
    """
    import os
    mongo_uri = os.getenv('MONGO_URI')
    users_list = []

    if mongo_uri:
        try:
            from pymongo import MongoClient
            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=4000)
            db = client['drishti_db']
            docs = list(db['users'].find({}, {'_id': 0}))
            client.close()
            if docs:
                users_list = docs
        except Exception:
            pass

    if not users_list:
        users_list = [
            {
                "username": "admin",
                "email": "admin@drishti.gov.in",
                "password_plain": "Admin@123",
                "role": "ADMIN",
                "first_name": "Rajesh",
                "last_name": "Sharma",
                "full_name": "Rajesh Sharma",
                "department": "MoSPI - Infrastructure Oversight",
                "state": "Delhi",
                "district": "New Delhi",
                "assigned_projects": ["DR-0001", "DR-0002", "DR-0003", "DR-0004", "DR-0005"],
                "description": "National PMO Administrator with complete systemic oversight, user governance, and audit authority.",
                "icon": "shield",
                "badge_color": "#1e3a8a",
            },
            {
                "username": "govt_officer",
                "email": "officer@drishti.gov.in",
                "password_plain": "Officer@123",
                "role": "GOVERNMENT_OFFICER",
                "first_name": "Priya",
                "last_name": "Nair",
                "full_name": "Priya Nair",
                "department": "Ministry of Road Transport & Highways",
                "state": "PB",
                "district": "Ludhiana",
                "assigned_projects": ["DR-0001", "DR-0002", "DR-0003"],
                "description": "State & Ministry oversight officer approving milestones, reviewing ML risk alerts, and assigning corrective actions.",
                "icon": "award",
                "badge_color": "#0d9488",
            },
            {
                "username": "field_officer",
                "email": "field@drishti.gov.in",
                "password_plain": "Field@123",
                "role": "FIELD_OFFICER",
                "first_name": "Amit",
                "last_name": "Patel",
                "full_name": "Amit Patel",
                "department": "National Highways Authority of India (NHAI)",
                "state": "HP",
                "district": "Shimla",
                "assigned_projects": ["DR-0009", "DR-0010", "DR-0011"],
                "description": "Site verification engineer conducting ground inspections, geotagged evidence capture, and drone telemetry audits.",
                "icon": "camera",
                "badge_color": "#d97706",
            },
            {
                "username": "citizen",
                "email": "citizen@drishti.gov.in",
                "password_plain": "Citizen@123",
                "role": "CITIZEN",
                "first_name": "Ananya",
                "last_name": "Verma",
                "full_name": "Ananya Verma",
                "department": "Civic Transparency Watch",
                "state": "Karnataka",
                "district": "Bengaluru Urban",
                "assigned_projects": [],
                "description": "Public citizen auditor monitoring taxpayer infrastructure spend, verifying public assets, and reporting local site issues.",
                "icon": "users",
                "badge_color": "#2563eb",
            },
        ]

    return Response({"count": len(users_list), "users": users_list})


class IsAdminRole(IsAuthenticated):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return has_capability(request.user, 'manage_users')


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    user = request.user
    if request.method == 'PATCH':
        allowed = {'first_name', 'last_name', 'email'}
        for field in allowed:
            if field in request.data:
                setattr(user, field, request.data.get(field))
        if 'role' in request.data and request.data.get('role') != user.role:
            raise PermissionDenied('You cannot change your own role.')
        if any(key in request.data for key in ('state', 'district', 'department')) and get_role(user) != Role.ADMIN:
            raise PermissionDenied('You cannot modify authorization scope.')
        user.save()
    payload = serialize_user(user)
    payload['dev_bypass'] = request.auth == 'dev-bypass'
    return Response(payload)


@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    return Response({"detail": "Successfully logged out."})


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserAdminSerializer
    permission_classes = [IsAdminRole]
    queryset = User.objects.all().order_by('username')

    def get_queryset(self):
        return User.objects.all().order_by('username')

    def perform_update(self, serializer):
        instance = serializer.instance
        new_role = serializer.validated_data.get('role', instance.role)
        if instance.pk == self.request.user.pk and new_role != instance.role:
            # Admins may manage others; self-escalation/de-escalation is allowed only via admin UI
            # but never via a non-admin identity.
            if not has_capability(self.request.user, 'manage_users'):
                raise PermissionDenied('You cannot change your own role.')
        serializer.save()


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def evidence_collection(request):
    if request.method == 'GET' and not has_capability(request.user, 'view_evidence'):
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    if request.method == 'POST' and not has_capability(request.user, 'submit_evidence'):
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    return Response({'count': 0, 'results': []})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reports_collection(request):
    if has_capability(request.user, 'view_internal_reports'):
        return Response({'count': 0, 'results': [], 'visibility': 'internal'})
    if has_capability(request.user, 'view_public_reports'):
        return Response({'count': 0, 'results': [], 'visibility': 'public'})
    return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
