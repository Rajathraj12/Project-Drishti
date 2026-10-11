from django.urls import path
from .views import CustomTokenObtainPairView, get_current_user, logout_view
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='auth_login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='auth_refresh'),
    path('auth/logout/', logout_view, name='auth_logout'),
    path('auth/me/', get_current_user, name='auth_me'),
]
