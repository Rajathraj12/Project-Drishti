from django.conf import settings
from core.models import User, Role, ProjectAssignment
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

VALID_ROLES = {choice[0] for choice in Role.choices}


class DevAuthBypassAuthentication(BaseAuthentication):
    """
    Development-only authentication.

    Honors X-Dev-Role only when DEBUG=True and DRISHTI_DEV_AUTH_BYPASS=True.
    The header is ignored in every other configuration. Role values are never
    taken from request bodies or query parameters.
    """

    def authenticate(self, request):
        bypass_enabled = getattr(settings, 'DRISHTI_DEV_AUTH_BYPASS', False)
        if not bypass_enabled:
            return None

        if not settings.DEBUG:
            raise AuthenticationFailed("Auth bypass cannot be enabled when DEBUG is False.")

        requested_role = request.headers.get('X-Dev-Role')
        if not requested_role:
            return None

        if requested_role not in VALID_ROLES:
            raise AuthenticationFailed("Invalid development role.")

        profiles = getattr(settings, 'DRISHTI_DEV_BYPASS_PROFILES', {}) or {}
        profile = profiles.get(requested_role, {}) or {}

        username = profile.get('username') or f'dev_{requested_role.lower()}'
        user, _ = User.objects.get_or_create(username=username)

        user.role = requested_role
        user.email = profile.get('email') or f'{username}@drishti.gov.in'
        if not user.first_name:
            user.first_name = profile.get('first_name') or requested_role.replace('_', ' ').title()
        user.state = profile.get('state') or None
        user.district = profile.get('district') or None
        user.department = profile.get('department') or 'National PMO Oversight'
        user.is_active = True
        user.save()

        assigned_ids = profile.get('assigned_project_ids') or []
        if assigned_ids:
            try:
                existing = set(
                    ProjectAssignment.objects.filter(user=user).values_list('project_id', flat=True)
                )
                wanted = set(assigned_ids)
                ProjectAssignment.objects.filter(user=user, project_id__in=(existing - wanted)).delete()
                for project_id in wanted - existing:
                    ProjectAssignment.objects.get_or_create(user=user, project_id=project_id)
            except Exception:
                pass

        return (user, 'dev-bypass')
