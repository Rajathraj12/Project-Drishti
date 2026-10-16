from rest_framework import viewsets, status
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
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        data['token'] = data['access']
        data['user'] = serialize_user(user)
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


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
