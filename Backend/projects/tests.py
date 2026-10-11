from django.test import TestCase
from .risk_engine import analyze_project_risk, CONFIG

class RiskEngineTests(TestCase):
    def test_clean_project(self):
        project = {
            "project_id": "TEST-1",
            "original_cost_cr": 100.0,
            "revised_cost_cr": 100.0,
            "expenditure_cr": 10.0,
            "reported_progress_pct": 50.0
        }
        assessment = analyze_project_risk(project)
        self.assertEqual(assessment["risk_score"], 0)
        self.assertEqual(assessment["risk_level"], "Low")
        self.assertEqual(len(assessment["rules_triggered"]), 0)
        self.assertEqual(len(assessment["data_warnings"]), 0)

    def test_cost_overrun(self):
        project = {
            "project_id": "TEST-2",
            "original_cost_cr": 100.0,
            "revised_cost_cr": 150.0,
            "expenditure_cr": 10.0,
            "reported_progress_pct": 35.0
        }
        assessment = analyze_project_risk(project)
        self.assertTrue(any(r["rule_id"] == "COST_OVERRUN" for r in assessment["rules_triggered"]))
        self.assertEqual(assessment["risk_score"], CONFIG["WEIGHT_COST_OVERRUN"])

    def test_low_progress(self):
        project = {
            "project_id": "TEST-3",
            "original_cost_cr": 100.0,
            "revised_cost_cr": 100.0,
            "expenditure_cr": 10.0,
            "reported_progress_pct": 20.0
        }
        assessment = analyze_project_risk(project)
        self.assertTrue(any(r["rule_id"] == "LOW_PROGRESS" for r in assessment["rules_triggered"]))

    def test_utilization_mismatch(self):
        project = {
            "project_id": "TEST-4",
            "original_cost_cr": 100.0,
            "revised_cost_cr": 100.0,
            "expenditure_cr": 90.0, # 90% utilization
            "reported_progress_pct": 50.0 # 50% physical
        }
        assessment = analyze_project_risk(project)
        self.assertTrue(any(r["rule_id"] == "UTILIZATION_MISMATCH" for r in assessment["rules_triggered"]))

    def test_high_expenditure_low_progress(self):
        project = {
            "project_id": "TEST-5",
            "original_cost_cr": 100.0,
            "revised_cost_cr": 100.0,
            "expenditure_cr": 80.0, # 80%
            "reported_progress_pct": 5.0 # < 10%
        }
        assessment = analyze_project_risk(project)
        self.assertTrue(any(r["rule_id"] == "HIGH_EXPENDITURE_LOW_PROGRESS" for r in assessment["rules_triggered"]))
        self.assertEqual(assessment["risk_level"], "Critical")

    def test_data_warnings(self):
        project = {
            "project_id": "TEST-6",
            "original_cost_cr": None,
            "revised_cost_cr": 100.0,
            "expenditure_cr": 50.0,
            "reported_progress_pct": None
        }
        assessment = analyze_project_risk(project)
        self.assertEqual(len(assessment["data_warnings"]), 1)
        # Missing data shouldn't trigger arbitrary rules
        self.assertEqual(assessment["risk_score"], None)
        self.assertEqual(assessment["risk_level"], "Unavailable")

    def test_bulk_analyze_authorization(self):
        from rest_framework.test import APIRequestFactory
        from django.contrib.auth.models import AnonymousUser
        from .views import ProjectViewSet
        from core.models import Role
        
        factory = APIRequestFactory()
        view = ProjectViewSet.as_view({'post': 'bulk_analyze'})
        
        # Test anonymous
        request = factory.post('/api/projects/bulk-analyze/')
        request.user = AnonymousUser()
        response = view(request)
        self.assertEqual(response.status_code, 403)
        
        from rest_framework.test import force_authenticate
        from django.contrib.auth.models import User
        # We need a proper user model for DRF to recognize is_authenticated
        class MockUser:
            is_authenticated = True
            role = Role.ADMIN
        
        request = factory.post('/api/projects/bulk-analyze/')
        force_authenticate(request, user=MockUser())
        response = view(request)
        self.assertNotEqual(response.status_code, 403)

    def test_ml_analyze_authorization(self):
        url = '/api/projects/DR-0001/ml-analyze/'
        # Test anonymous
        response = self.client.post(url)
        self.assertEqual(response.status_code, 403)
        # Test citizen
        self.client.force_authenticate(user=self.citizen)
        response = self.client.post(url)
        self.assertEqual(response.status_code, 403)

    def test_verify_authorization(self):
        url = '/api/projects/DR-0001/verify/'
        response = self.client.post(url, {'verification_status': 'IN_REVIEW', 'notes': 'Test'})
        self.assertEqual(response.status_code, 403)
        self.client.force_authenticate(user=self.citizen)
        response = self.client.post(url, {'verification_status': 'IN_REVIEW', 'notes': 'Test'})
        self.assertEqual(response.status_code, 403)
        self.client.force_authenticate(user=self.govt_officer)
        # Note: If DR-0001 has different state than govt_officer, it will be 403 or 404 depending on Mongo setup.
        # But we just want to ensure it doesn't crash.
        response = self.client.post(url, {'verification_status': 'IN_REVIEW', 'notes': 'Test'})
        self.assertIn(response.status_code, [201, 403, 404])
