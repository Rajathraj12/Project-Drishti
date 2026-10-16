from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView, get_current_user, logout_view,
    UserViewSet, evidence_collection, reports_collection,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='auth_login'),
    path('auth/refresh/', TokenRefreshView.as_view(permission_classes=[AllowAny]), name='auth_refresh'),
    path('auth/logout/', logout_view, name='auth_logout'),
    path('auth/me/', get_current_user, name='auth_me'),
    path('evidence/', evidence_collection, name='evidence_collection'),
    path('reports/', reports_collection, name='reports_collection'),
    path('', include(router.urls)),
]
