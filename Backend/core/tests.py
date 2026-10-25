from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from core.models import User, Role

class AuthAndRBACTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(username='admin', password='password123', role=Role.ADMIN)
        self.gov_officer = User.objects.create_user(username='gov', password='password123', role=Role.GOVERNMENT_OFFICER, state='Karnataka')
        self.citizen = User.objects.create_user(username='citizen', password='password123', role=Role.CITIZEN)
        
    def test_invalid_login(self):
        res = self.client.post('/api/auth/login/', {'username': 'admin', 'password': 'wrongpassword'})
        self.assertEqual(res.status_code, 401)
        
    def test_valid_login(self):
        res = self.client.post('/api/auth/login/', {'username': 'admin', 'password': 'password123'})
        self.assertEqual(res.status_code, 200)
        self.assertIn('token', res.data)
        self.assertIn('user', res.data)
        
    def test_citizen_read_only(self):
        self.client.force_authenticate(user=self.citizen)
        res = self.client.get('/api/projects/')
        self.assertEqual(res.status_code, 200)
        
        res = self.client.post('/api/projects/', {'project_id': 'NEW-01', 'project_name': 'New'})
        self.assertEqual(res.status_code, 403)
        
    def test_gov_officer_scope(self):
        self.client.force_authenticate(user=self.gov_officer)
        res = self.client.get('/api/projects/')
        self.assertEqual(res.status_code, 200)
        # All returned projects must strictly match the officer's state jurisdiction
        for p in res.data['results']:
            self.assertEqual(p['state'], 'Karnataka')
        
    def test_admin_scope(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/projects/')
        self.assertEqual(res.status_code, 200)
        self.assertGreater(len(res.data['results']), 0)
        
    @override_settings(DRISHTI_DEV_AUTH_BYPASS=True, DEBUG=True)
    def test_dev_bypass_active(self):
        client = APIClient()
        res = client.get('/api/projects/', HTTP_X_DEV_ROLE='ADMIN')
        self.assertEqual(res.status_code, 200)
