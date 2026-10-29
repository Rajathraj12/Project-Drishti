from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView, get_current_user, logout_view, demo_users_view,
    citizen_register_view, citizen_login_view, google_auth_view,
    UserViewSet, evidence_collection, reports_collection,
    system_health_view, admin_settings_view,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='auth_login'),
    path('auth/refresh/', TokenRefreshView.as_view(permission_classes=[AllowAny]), name='auth_refresh'),
    path('auth/logout/', logout_view, name='auth_logout'),
    path('auth/me/', get_current_user, name='auth_me'),
    path('auth/demo-users/', demo_users_view, name='auth_demo_users'),
    path('auth/citizen/register/', citizen_register_view, name='citizen_register'),
    path('auth/citizen/login/', citizen_login_view, name='citizen_login'),
    path('auth/google/', google_auth_view, name='google_auth'),
    path('evidence/', evidence_collection, name='evidence_collection'),
    path('reports/', reports_collection, name='reports_collection'),
    path('system/health/', system_health_view, name='system_health'),
    path('system/settings/', admin_settings_view, name='system_settings'),
    path('', include(router.urls)),
]
