from django.test import TestCase
from rest_framework.test import APIClient
from core.models import User, Role
from .risk_engine import analyze_project_risk, CONFIG

class RiskEngineTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.citizen, _ = User.objects.get_or_create(username='test_citizen', defaults={'role': Role.CITIZEN})
        self.govt_officer, _ = User.objects.get_or_create(username='test_govt', defaults={'role': Role.GOVERNMENT_OFFICER, 'state': 'KA'})

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


from datetime import datetime, timezone, timedelta
from rest_framework import status
from projects.models import Project
from projects.corrective_actions import (
    ActionStatus, ActionPriority, compute_action_metadata,
    _TEST_ACTIONS_STORE
)

class Phase7CorrectiveActionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        _TEST_ACTIONS_STORE.clear()

        # Users across different roles and scopes
        self.admin = User.objects.create_user(
            username='admin_user', password='password123', role=Role.ADMIN
        )
        self.gov_punjab = User.objects.create_user(
            username='gov_punjab', password='password123', role=Role.GOVERNMENT_OFFICER, state='Punjab'
        )
        self.gov_haryana = User.objects.create_user(
            username='gov_haryana', password='password123', role=Role.GOVERNMENT_OFFICER, state='Haryana'
        )
        self.field_punjab = User.objects.create_user(
            username='field_punjab', password='password123', role=Role.FIELD_OFFICER, state='Punjab'
        )
        self.contractor_agency = User.objects.create_user(
            username='contractor_corp', password='password123', role=Role.IMPLEMENTING_AGENCY, department='InfraCorp'
        )
        self.citizen = User.objects.create_user(
            username='citizen_ram', password='password123', role=Role.CITIZEN
        )

        # Projects in different jurisdictions
        self.project_pb = Project.objects.create(
            project_id='DR-0001',
            project_name='Punjab Expressway Phase 1',
            state='Punjab',
            district='Amritsar',
            department='PWD',
            verification_status='IN_REVIEW'
        )
        self.project_hr = Project.objects.create(
            project_id='DR-0002',
            project_name='Haryana Water Supply',
            state='Haryana',
            district='Gurugram',
            department='PHED',
            verification_status='NOT_REVIEWED'
        )

    def test_citizen_access_denied(self):
        """Citizens must be blocked with 403 Forbidden on all corrective action endpoints."""
        self.client.force_authenticate(user=self.citizen)

        # List
        res = self.client.get('/api/corrective-actions/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Create
        res = self.client.post('/api/corrective-actions/', {
            'project_id': 'DR-0001',
            'title': 'Citizen Action',
            'description': 'Attempting creation',
            'reason': 'Test',
            'due_date': '2026-11-01'
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthorized_guessed_ids(self):
        """Querying an unknown or non-existent action ID returns 404."""
        self.client.force_authenticate(user=self.gov_punjab)
        res = self.client.get('/api/corrective-actions/CA-NON-EXISTENT-ID/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_jurisdiction_and_project_scope_restrictions(self):
        """Gov Officer in Punjab cannot create or access actions for a project in Haryana."""
        self.client.force_authenticate(user=self.gov_punjab)

        # Attempt to create action on Haryana project -> 403 Forbidden
        res = self.client.post('/api/corrective-actions/', {
            'project_id': 'DR-0002', # Haryana
            'title': 'Unauthorized jurisdiction action',
            'description': 'Trying to create on Haryana project',
            'reason': 'Audit finding',
            'due_date': '2026-11-01'
        })
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("jurisdiction", res.data['error'])

    def test_create_action_with_findings_and_evidence(self):
        """Authorized Gov Officer creates an action linked to risk, ML, and evidence findings."""
        self.client.force_authenticate(user=self.gov_punjab)

        future_date = (datetime.now(timezone.utc) + timedelta(days=14)).strftime('%Y-%m-%d')
        payload = {
            'project_id': 'DR-0001',
            'title': 'Rectify Subgrade Compaction Failure',
            'description': 'Soil compaction density fell below 95% standard between Ch 12+000 to 14+500.',
            'reason': 'Material density test failure identified during Phase 5 verification inspection.',
            'priority': 'HIGH',
            'due_date': future_date,
            'assigned_to': 'contractor_corp',
            'assigned_agency': 'InfraCorp',
            'risk_assessment_id': 'RISK-ASSESS-2026-001',
            'ml_assessment_id': 'ML-ASSESS-2026-004',
            'verification_id': 'VERIF-REC-009',
            'evidence_ids': ['E001', 'E003']
        }

        res = self.client.post('/api/corrective-actions/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        action_id = res.data['action_id']
        self.assertTrue(action_id.startswith('CA-2026-'))
        self.assertEqual(res.data['status'], ActionStatus.ASSIGNED)
        self.assertEqual(res.data['priority'], ActionPriority.HIGH)
        self.assertEqual(res.data['risk_assessment_id'], 'RISK-ASSESS-2026-001')
        self.assertEqual(res.data['ml_assessment_id'], 'ML-ASSESS-2026-004')
        self.assertEqual(res.data['evidence_ids'], ['E001', 'E003'])
        self.assertEqual(res.data['is_overdue'], False)
        self.assertGreaterEqual(res.data['days_remaining'], 13)

        # Verify audit history
        self.assertGreaterEqual(len(res.data['audit_history']), 1)
        self.assertEqual(res.data['audit_history'][0]['event_type'], 'ACTION_CREATED')

        # Retrieve detail endpoint
        detail_res = self.client.get(f'/api/corrective-actions/{action_id}/')
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_res.data['action_id'], action_id)

    def test_overdue_calculation_and_escalation(self):
        """Overdue actions are flagged correctly; closed/cancelled actions are never overdue."""
        past_date = (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()

        # Action with past due date in OPEN status -> Overdue
        doc_open = {
            'action_id': 'CA-TEST-OVERDUE-1',
            'project_id': 'DR-0001',
            'title': 'Overdue Action',
            'status': ActionStatus.IN_PROGRESS,
            'priority': ActionPriority.CRITICAL,
            'due_date': past_date
        }
        meta_open = compute_action_metadata(doc_open)
        self.assertTrue(meta_open['is_overdue'])
        self.assertGreaterEqual(meta_open['days_overdue'], 4)
        self.assertEqual(meta_open['escalation_level'], 'CRITICAL_OVERDUE_ESCALATION')

        # Closed action with past due date -> NOT overdue
        doc_closed = dict(doc_open)
        doc_closed['status'] = ActionStatus.CLOSED
        meta_closed = compute_action_metadata(doc_closed)
        self.assertFalse(meta_closed['is_overdue'])
        self.assertEqual(meta_closed['days_overdue'], 0)

        # Cancelled action with past due date -> NOT overdue
        doc_cancelled = dict(doc_open)
        doc_cancelled['status'] = ActionStatus.CANCELLED
        meta_cancelled = compute_action_metadata(doc_cancelled)
        self.assertFalse(meta_cancelled['is_overdue'])

    def test_full_lifecycle_and_separation_of_duties(self):
        """
        Tests:
        1. Action creation (Admin/Gov)
        2. Progress update (Assignee) -> Status transitions to IN_PROGRESS
        3. Resolution submission (Assignee) -> Status transitions to AWAITING_REVIEW
        4. Separation of Duties enforcement: Assignee CANNOT approve own closure (403)
        5. Authorized reviewer approves closure -> Status transitions to CLOSED
        6. Reopen action by Admin with reason -> Status transitions to REOPENED
        """
        # Step 1: Create action
        self.client.force_authenticate(user=self.gov_punjab)
        future_date = (datetime.now(timezone.utc) + timedelta(days=7)).strftime('%Y-%m-%d')
        res = self.client.post('/api/corrective-actions/', {
            'project_id': 'DR-0001',
            'title': 'Pavement Surface Re-grading',
            'description': 'Regrade uneven sections at chainage 5.',
            'reason': 'Quality check failure',
            'priority': 'MEDIUM',
            'due_date': future_date,
            'assigned_to': 'contractor_corp',
            'assigned_agency': 'InfraCorp'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        action_id = res.data['action_id']

        # Step 2: Implementing agency posts progress update
        self.client.force_authenticate(user=self.contractor_agency)
        prog_res = self.client.post(f'/api/corrective-actions/{action_id}/progress/', {
            'message': 'Completed grading on first 500m section.',
            'progress_pct': 50,
            'supporting_evidence': ['E005']
        }, format='json')
        self.assertEqual(prog_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(prog_res.data['status'], ActionStatus.IN_PROGRESS)
        self.assertEqual(len(prog_res.data['progress_updates']), 1)

        # Step 3: Implementing agency submits resolution
        res_submit = self.client.post(f'/api/corrective-actions/{action_id}/submit-resolution/', {
            'resolution_summary': 'Re-grading completed and verified by third-party surveyor.',
            'supporting_evidence': ['E005', 'E006']
        }, format='json')
        self.assertEqual(res_submit.status_code, status.HTTP_200_OK)
        self.assertEqual(res_submit.data['status'], ActionStatus.AWAITING_REVIEW)
        self.assertEqual(res_submit.data['resolution_submitted_by'], 'contractor_corp')

        # Step 4: Separation of Duties Check!
        # Contractor agency attempts to review/approve their own resolution closure -> 403 Forbidden
        self_close = self.client.post(f'/api/corrective-actions/{action_id}/review-resolution/', {
            'approved': True,
            'review_notes': 'I approve my own work'
        }, format='json')
        self.assertEqual(self_close.status_code, status.HTTP_403_FORBIDDEN)

        # Even if contractor called /close/ directly -> 403 Forbidden
        direct_close = self.client.post(f'/api/corrective-actions/{action_id}/close/', {
            'closure_notes': 'Closing'
        }, format='json')
        self.assertEqual(direct_close.status_code, status.HTTP_403_FORBIDDEN)

        # What if Gov Officer was the assigned user? Test separation of duties for officers too
        doc = _TEST_ACTIONS_STORE[action_id]
        doc['assigned_to'] = 'gov_punjab'
        self.client.force_authenticate(user=self.gov_punjab)
        gov_self_close = self.client.post(f'/api/corrective-actions/{action_id}/review-resolution/', {
            'approved': True,
            'review_notes': 'Gov officer self approval'
        }, format='json')
        self.assertEqual(gov_self_close.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Separation of duties", gov_self_close.data['error'])

        # Step 5: Independent Authorized Reviewer (Admin) approves closure
        doc['assigned_to'] = 'contractor_corp' # restore assignee
        self.client.force_authenticate(user=self.admin)
        admin_close = self.client.post(f'/api/corrective-actions/{action_id}/review-resolution/', {
            'approved': True,
            'review_notes': 'Inspected site survey photographs and verified elevation compliance. Approved.'
        }, format='json')
        self.assertEqual(admin_close.status_code, status.HTTP_200_OK)
        self.assertEqual(admin_close.data['status'], ActionStatus.CLOSED)
        self.assertEqual(admin_close.data['closure_reviewer'], 'admin_user')

        # Step 6: Reopen action
        reopen_res = self.client.post(f'/api/corrective-actions/{action_id}/reopen/', {
            'reopen_reason': 'Secondary visual inspection revealed subsidence after rainfall.'
        }, format='json')
        self.assertEqual(reopen_res.status_code, status.HTTP_200_OK)
        self.assertEqual(reopen_res.data['status'], ActionStatus.REOPENED)
        self.assertEqual(reopen_res.data['reopen_reason'], 'Secondary visual inspection revealed subsidence after rainfall.')

        # Step 7: Check audit history preservation
        hist_res = self.client.get(f'/api/corrective-actions/{action_id}/history/')
        self.assertEqual(hist_res.status_code, status.HTTP_200_OK)
        events = hist_res.data['events']
        self.assertGreaterEqual(len(events), 5)
        event_types = [e['event_type'] for e in events]
        self.assertIn('ACTION_CREATED', event_types)
        self.assertIn('PROGRESS_UPDATED', event_types)
        self.assertIn('RESOLUTION_SUBMITTED', event_types)
        self.assertIn('RESOLUTION_APPROVED_AND_CLOSED', event_types)
        self.assertIn('ACTION_REOPENED', event_types)

    def test_cancellation_preserves_reason_and_history(self):
        """Cancelled actions retain their status, cancellation reason, and history."""
        self.client.force_authenticate(user=self.gov_punjab)
        res = self.client.post('/api/corrective-actions/', {
            'project_id': 'DR-0001',
            'title': 'Action to be cancelled',
            'description': 'Temporary action',
            'reason': 'Mistakenly opened',
            'due_date': '2026-11-20'
        }, format='json')
        action_id = res.data['action_id']

        # Missing cancellation_reason -> 400
        cancel_bad = self.client.post(f'/api/corrective-actions/{action_id}/cancel/', {}, format='json')
        self.assertEqual(cancel_bad.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid cancellation
        cancel_ok = self.client.post(f'/api/corrective-actions/{action_id}/cancel/', {
            'cancellation_reason': 'Duplicate of action CA-2026-0001.'
        }, format='json')
        self.assertEqual(cancel_ok.status_code, status.HTTP_200_OK)
        self.assertEqual(cancel_ok.data['status'], ActionStatus.CANCELLED)
        self.assertEqual(cancel_ok.data['cancellation_reason'], 'Duplicate of action CA-2026-0001.')

        # Further edits on cancelled action are prevented -> 400
        edit_res = self.client.patch(f'/api/corrective-actions/{action_id}/', {'title': 'New Title'}, format='json')
        self.assertEqual(edit_res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nested_project_corrective_actions_endpoint(self):
        """Test GET and POST on /api/projects/{id}/corrective-actions/."""
        self.client.force_authenticate(user=self.gov_punjab)

        # Create via nested endpoint
        res = self.client.post('/api/projects/DR-0001/corrective-actions/', {
            'title': 'Nested Action Creation',
            'description': 'Created via project details endpoint',
            'reason': 'Project review',
            'due_date': '2026-11-15'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['project_id'], 'DR-0001')

        # List via nested endpoint
        list_res = self.client.get('/api/projects/DR-0001/corrective-actions/')
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(list_res.data['count'], 1)
        self.assertTrue(any(a['title'] == 'Nested Action Creation' for a in list_res.data['results']))


class Phase8ReportingAndOversightTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(username='admin_p8', role=Role.ADMIN)
        self.gov_punjab = User.objects.create_user(username='gov_p8', role=Role.GOVERNMENT_OFFICER, state='Punjab')
        self.citizen = User.objects.create_user(username='citizen_p8', role=Role.CITIZEN)

        # Projects
        self.p_pb = Project.objects.create(
            project_id='DR-P8-PB',
            project_name='Punjab Road P8',
            state='Punjab',
            department='Roads & Highways',
            original_cost=500000000,
            expenditure=200000000,
            reported_progress=40.0,
            verification_status='NOT_REVIEWED',
            data_source_type='OFFICIAL'
        )
        self.p_hr = Project.objects.create(
            project_id='DR-P8-HR',
            project_name='Haryana Transmission Line P8',
            state='Haryana',
            department='Power & Energy',
            original_cost=300000000,
            expenditure=150000000,
            reported_progress=50.0,
            verification_status='NOT_REVIEWED',
            data_source_type='OFFICIAL'
        )
        self.p_synthetic = Project.objects.create(
            project_id='DR-P8-SYNTHETIC',
            project_name='Synthetic Benchmark Demo',
            state='Haryana',
            department='Power & Energy',
            original_cost=100000000,
            data_source_type='SYNTHETIC_DEMO'
        )

    def test_oversight_dashboard_admin(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/reports/dashboard/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('project_counts', res.data)
        self.assertIn('risk_distribution', res.data)
        self.assertIn('ml_anomaly_distribution', res.data)
        self.assertIn('verification_distribution', res.data)
        self.assertIn('data_provenance', res.data)
        self.assertEqual(res.data['project_counts']['total_projects'], 2)
        self.assertEqual(res.data['project_counts']['synthetic_projects'], 0)

    def test_oversight_dashboard_citizen_scope(self):
        self.client.force_authenticate(user=self.citizen)
        res = self.client.get('/api/reports/dashboard/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['project_counts']['synthetic_projects'], 0)
        self.assertEqual(res.data['risk_distribution'], {})
        self.assertEqual(res.data['ml_anomaly_distribution'], {})

    def test_oversight_dashboard_jurisdiction_scoping(self):
        self.client.force_authenticate(user=self.gov_punjab)
        res = self.client.get('/api/reports/dashboard/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['filter_options']['states'], ['All States', 'Punjab'])

    def test_reports_list_risk_assessments(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/reports/?report_type=risk_assessments')
        self.assertEqual(res.status_code, 200)
        self.assertIn('results', res.data)
        self.assertGreaterEqual(res.data['count'], 2)

    def test_reports_csv_export(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get('/api/reports/export/?report_type=risk_assessments')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res['Content-Type'], 'text/csv; charset=utf-8')
        self.assertIn('attachment; filename="drishti_risk_assessments_', res['Content-Disposition'])
        content = res.content.decode('utf-8')
        self.assertIn('PROJECT DRISHTI', content)
        self.assertIn('MoSPI PAIMANA', content)

    def test_citizen_public_report_redaction(self):
        self.client.force_authenticate(user=self.citizen)
        res = self.client.get('/api/reports/?report_type=unresolved_findings')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['report_type'], 'public_oversight')
        for item in res.data['results']:
            self.assertNotIn('rule_risk_score', item)
            self.assertNotIn('ml_anomaly_score', item)


