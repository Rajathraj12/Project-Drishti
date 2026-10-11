import os
import sys

sys.path.append('f:/Projects/Project Drishti/Backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from projects.views import ProjectViewSet
from django.test import RequestFactory
from core.models import Role

factory = RequestFactory()

class MockUser:
    is_authenticated = True
    role = Role.ADMIN

req = factory.post('/api/projects/bulk-analyze/')
from rest_framework.test import force_authenticate
force_authenticate(req, user=MockUser())

view = ProjectViewSet.as_view({'post': 'bulk_analyze'})
res = view(req)
print('Bulk Response:', res.data)
