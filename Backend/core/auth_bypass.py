from django.conf import settings
from django.http import JsonResponse
from core.models import User, Role
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

class DevAuthBypassAuthentication(BaseAuthentication):
    """
    Custom authentication class for DRF to allow dev bypass.
    DRF ignores middleware request.user for authenticated endpoints unless we return it from here.
    """
    def authenticate(self, request):
        bypass_enabled = getattr(settings, 'DRISHTI_DEV_AUTH_BYPASS', False)
        
        if bypass_enabled:
            if not settings.DEBUG:
                raise AuthenticationFailed("Auth bypass cannot be enabled when DEBUG is False.")
                
            requested_role = request.headers.get('X-Dev-Role', Role.GOVERNMENT_OFFICER)
            
            # Create or get a dummy user for the role
            user, _ = User.objects.get_or_create(username=f'dev_user_{requested_role}')
            user.role = requested_role
            # Clear dummy scopes so they can see everything
            if requested_role in [Role.GOVERNMENT_OFFICER, Role.FIELD_OFFICER]:
                user.state = None
            user.save()
            
            return (user, None)
            
        return None
