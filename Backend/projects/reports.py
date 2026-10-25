import csv
import io
import os
from datetime import datetime, timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from django.http import HttpResponse
from django.conf import settings

from core.models import Role
from core.rbac import (
    get_role, has_capability, mongo_project_query,
    filter_project_queryset, sanitize_project_payload,
    user_can_access_project, assigned_project_ids
)
from projects.models import Project
from projects.corrective_actions import (
    get_mongo_db, compute_action_metadata,
    _TEST_ACTIONS_STORE, ActionStatus, ActionPriority
)


def parse_date_only(val):
    if not val:
        return None
    val_str = str(val).strip()
    if len(val_str) >= 10:
        return val_str[:10]
    return None


def get_scoped_reporting_dataset(user, query_params=None):
    """
    Retrieves and aggregates projects, risk assessments, ML assessments,
    and corrective actions strictly within user's authorization and scope.
    Guarantees no duplicate counting and explicitly handles missing assessments.
    """
    if query_params is None:
        query_params = {}

    role = get_role(user)
    is_citizen = (role == Role.CITIZEN)
    can_view_risk = has_capability(user, 'view_internal_risk')
    can_view_ml = has_capability(user, 'view_ml_assessment')
    can_view_actions = has_capability(user, 'view_corrective_actions')

    state_filter = query_params.get('state')
    district_filter = query_params.get('district')
    sector_filter = query_params.get('sector') or query_params.get('department')
    status_filter = query_params.get('verification_status') or query_params.get('status')
    risk_level_filter = query_params.get('risk_level')
    source_type_filter = query_params.get('data_source_type')
    date_from = query_params.get('date_from')
    date_to = query_params.get('date_to')
    search_q = query_params.get('search', '').strip().lower()

    db = get_mongo_db()
    docs = []

    if db is not None:
        try:
            base_query = mongo_project_query(user)
            # Ensure SYNTHETIC_DEMO is never included
            base_query['data_source_type'] = {'$ne': 'SYNTHETIC_DEMO'}

            cursor = db['projects'].find(base_query)
            for d in cursor:
                if '_id' in d:
                    del d['_id']
                if d.get('data_source_type') != 'SYNTHETIC_DEMO':
                    docs.append(d)
        except Exception:
            docs = []


    # Fetch latest assessments keyed by project_id to prevent duplicates
    project_ids = [d.get('project_id') for d in docs if d.get('project_id')]
    latest_risk = {}
    latest_ml = {}

    if db is not None and project_ids:
        try:
            r_docs = list(db['risk_assessments'].find({'project_id': {'$in': project_ids}}))
            for r in r_docs:
                pid = r.get('project_id')
                ts = r.get('assessment_timestamp', '')
                if pid not in latest_risk or ts > latest_risk[pid].get('assessment_timestamp', ''):
                    latest_risk[pid] = r

            m_docs = list(db['ml_assessments'].find({'project_id': {'$in': project_ids}}))
            for m in m_docs:
                pid = m.get('project_id')
                ts = m.get('assessed_at', '')
                if pid not in latest_ml or ts > latest_ml[pid].get('assessed_at', ''):
                    latest_ml[pid] = m
        except Exception:
            pass

    # Fetch scoped corrective actions
    actions_by_project = {}
    all_scoped_actions = []

    if can_view_actions:
        raw_actions = []
        if db is not None:
            try:
                for a in db['corrective_actions'].find({}):
                    if '_id' in a:
                        del a['_id']
                    raw_actions.append(a)
            except Exception:
                raw_actions = list(_TEST_ACTIONS_STORE.values())
        else:
            raw_actions = list(_TEST_ACTIONS_STORE.values())

        project_doc_map = {d.get('project_id'): d for d in docs}
        assigned_pids = assigned_project_ids(user)

        for a_doc in raw_actions:
            pid = a_doc.get('project_id')
            p_rec = project_doc_map.get(pid)
            if not p_rec:
                # Project outside scope
                continue
            if not user_can_access_project(user, p_rec, for_corrective_action=True):
                continue

            annotated_action = compute_action_metadata(a_doc)
            annotated_action['project_name'] = p_rec.get('project_name', '')
            annotated_action['state'] = p_rec.get('state', '')
            all_scoped_actions.append(annotated_action)

            if pid not in actions_by_project:
                actions_by_project[pid] = []
            actions_by_project[pid].append(annotated_action)

    # Filter and construct project records
    filtered_projects = []
    for doc in docs:
        pid = doc.get('project_id')
        p_state = doc.get('state') or ''
        p_district = doc.get('district') or ''
        p_sector = doc.get('sector') or doc.get('department') or ''
        p_vstatus = doc.get('verification_status') or 'NOT_REVIEWED'
        p_date = parse_date_only(doc.get('source_as_of_date'))
        p_name = doc.get('project_name') or ''
        src_type = doc.get('data_source_type', 'OFFICIAL')

        # Filter: State
        if state_filter and state_filter != 'All States' and p_state != state_filter:
            continue
        # Filter: District
        if district_filter and district_filter != 'All Districts' and p_district != district_filter:
            continue
        # Filter: Sector / Department
        if sector_filter and sector_filter != 'All Sectors' and p_sector != sector_filter:
            continue
        # Filter: Verification Status
        if status_filter and status_filter != 'ALL' and p_vstatus != status_filter:
            continue
        # Filter: Date boundary
        if date_from and p_date and p_date < date_from:
            continue
        if date_to and p_date and p_date > date_to:
            continue
        # Filter: Search query
        if search_q:
            if search_q not in pid.lower() and search_q not in p_name.lower() and search_q not in p_state.lower():
                continue

        r_assess = latest_risk.get(pid)
        if not r_assess:
            try:
                from .risk_engine import analyze_project_risk
                r_assess = analyze_project_risk(doc)
                latest_risk[pid] = r_assess
            except Exception:
                r_assess = {}

        m_assess = latest_ml.get(pid)
        if not m_assess:
            try:
                from ml.predictor import predict_anomaly
                flag, score = predict_anomaly(doc)
                m_assess = {
                    'anomaly_flag': flag,
                    'ml_anomaly_score': round(score, 2),
                    'anomaly_status': 'ANOMALOUS' if flag else 'NORMAL',
                }
                latest_ml[pid] = m_assess
            except Exception:
                m_assess = {}

        # Categorize risk explicitly; never mark unassessed as Low
        r_score = r_assess.get('risk_score')
        r_level = r_assess.get('risk_level')
        if r_score is None or not r_level or r_level == 'Unavailable':
            risk_category = 'UNASSESSED'
        else:
            risk_category = r_level.capitalize() if r_level in ['Critical', 'High', 'Medium', 'Low'] else r_level

        # Filter: Risk Level
        if risk_level_filter and risk_level_filter != 'ALL':
            if risk_category.upper() != risk_level_filter.upper():
                continue

        # ML anomaly categorization
        m_flag = m_assess.get('anomaly_flag')
        m_status = m_assess.get('anomaly_status')
        if m_status == 'INSUFFICIENT_DATA':
            ml_category = 'INSUFFICIENT_DATA'
        elif m_flag is True:
            ml_category = 'ANOMALOUS'
        elif m_flag is False:
            ml_category = 'NORMAL'
        else:
            ml_category = 'UNASSESSED'

        p_actions = actions_by_project.get(pid, [])
        open_actions_cnt = sum(1 for a in p_actions if a.get('status') not in [ActionStatus.CLOSED, ActionStatus.CANCELLED])
        overdue_actions_cnt = sum(1 for a in p_actions if a.get('is_overdue'))

        record = {
            'project_id': pid,
            'project_name': p_name,
            'state': p_state,
            'district': p_district,
            'sector': p_sector,
            'original_cost_cr': doc.get('original_cost_cr') or 0.0,
            'revised_cost_cr': doc.get('revised_cost_cr') or doc.get('original_cost_cr') or 0.0,
            'expenditure_cr': doc.get('expenditure_cr') or 0.0,
            'reported_progress_pct': doc.get('reported_progress_pct') or 0.0,
            'data_source_type': src_type,
            'source_name': doc.get('source_name', 'MoSPI PAIMANA'),
            'source_reference': doc.get('source_reference', pid),
            'source_url': doc.get('source_url', 'https://cspm.gov.in'),
            'source_as_of_date': p_date or '2026-09-24',
            'verification_status': p_vstatus,
            'is_public': doc.get('is_public', False),
            'rule_risk_score': r_score,
            'rule_risk_level': risk_category,
            'rules_triggered_count': len(r_assess.get('rules_triggered', [])),
            'rules_triggered_summary': [r.get('title') or r.get('rule_id') for r in r_assess.get('rules_triggered', [])] if can_view_risk else [],
            'ml_anomaly_score': m_assess.get('ml_anomaly_score'),
            'ml_anomaly_flag': m_flag,
            'ml_category': ml_category,
            'open_actions_count': open_actions_cnt if can_view_actions else 0,
            'overdue_actions_count': overdue_actions_cnt if can_view_actions else 0,
        }
        filtered_projects.append(record)

    return {
        'projects': filtered_projects,
        'actions': all_scoped_actions,
        'role': role,
        'is_citizen': is_citizen,
        'can_view_risk': can_view_risk,
        'can_view_ml': can_view_ml,
        'can_view_actions': can_view_actions,
    }


class OversightDashboardView(APIView):
    """
    GET /api/reports/dashboard/
    Returns aggregated oversight dashboard metrics respecting user scope.
    Publicly accessible for landing page transparency with real-time aggregates.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        dataset = get_scoped_reporting_dataset(request.user, request.query_params)
        projects = dataset['projects']
        actions = dataset['actions']
        role = dataset['role']
        is_citizen = dataset['is_citizen']

        total_projects = len(projects)
        official_count = total_projects
        synthetic_count = 0

        total_orig_cost = sum(p['original_cost_cr'] for p in projects)
        total_rev_cost = sum(p['revised_cost_cr'] for p in projects)
        total_exp = sum(p['expenditure_cr'] for p in projects)
        avg_progress = (sum(p['reported_progress_pct'] for p in projects) / total_projects) if total_projects else 0.0

        # Rule Risk distribution from real-time MongoDB projects
        critical_cnt = sum(1 for p in projects if p.get('rule_risk_level') == 'Critical')
        high_cnt = sum(1 for p in projects if p.get('rule_risk_level') == 'High')
        med_cnt = sum(1 for p in projects if p.get('rule_risk_level') == 'Medium')
        low_cnt = sum(1 for p in projects if p.get('rule_risk_level') == 'Low')
        unassessed_cnt = sum(1 for p in projects if p.get('rule_risk_level') in ('UNASSESSED', 'Unavailable', None))

        risk_dist = {
            'critical': critical_cnt,
            'high': high_cnt,
            'medium': med_cnt,
            'low': low_cnt,
            'unassessed': unassessed_cnt,
            'Critical': critical_cnt,
            'High': high_cnt,
            'High Risk': high_cnt + critical_cnt,
            'Medium': med_cnt,
            'Medium Risk': med_cnt,
            'Low': low_cnt,
            'Low Risk': low_cnt,
        }

        # ML Anomaly distribution from Isolation Forest ML model
        anomalous_cnt = sum(1 for p in projects if p.get('ml_category') == 'ANOMALOUS' or p.get('ml_anomaly_flag') is True)
        normal_cnt = sum(1 for p in projects if p.get('ml_category') == 'NORMAL' or p.get('ml_anomaly_flag') is False)
        insufficient_cnt = sum(1 for p in projects if p.get('ml_category') == 'INSUFFICIENT_DATA')
        unassessed_ml_cnt = sum(1 for p in projects if p.get('ml_category') in ('UNASSESSED', None))

        ml_dist = {
            'anomalous': anomalous_cnt,
            'normal': normal_cnt,
            'insufficient_data': insufficient_cnt,
            'unassessed': unassessed_ml_cnt,
            'ANOMALOUS': anomalous_cnt,
            'NORMAL': normal_cnt,
        }

        # Verification distribution
        verif_dist = {
            'verified': sum(1 for p in projects if str(p.get('verification_status')).upper() == 'VERIFIED'),
            'in_review': sum(1 for p in projects if str(p.get('verification_status')).upper() == 'IN_REVIEW'),
            'not_reviewed': sum(1 for p in projects if str(p.get('verification_status')).upper() in ('NOT_REVIEWED', 'NONE', '')),
            'closed': sum(1 for p in projects if str(p.get('verification_status')).upper() == 'CLOSED'),
            'VERIFIED': sum(1 for p in projects if str(p.get('verification_status')).upper() == 'VERIFIED'),
            'IN_REVIEW': sum(1 for p in projects if str(p.get('verification_status')).upper() == 'IN_REVIEW'),
            'NOT_REVIEWED': sum(1 for p in projects if str(p.get('verification_status')).upper() in ('NOT_REVIEWED', 'NONE', '')),
            'CLOSED': sum(1 for p in projects if str(p.get('verification_status')).upper() == 'CLOSED'),
        }

        # Corrective Actions distribution
        actions_dist = {
            'total': len(actions),
            'open': sum(1 for a in actions if a.get('status') in [ActionStatus.OPEN, ActionStatus.ASSIGNED, ActionStatus.IN_PROGRESS]),
            'awaiting_review': sum(1 for a in actions if a.get('status') == ActionStatus.AWAITING_REVIEW),
            'closed': sum(1 for a in actions if a.get('status') == ActionStatus.CLOSED),
            'reopened': sum(1 for a in actions if a.get('status') == ActionStatus.REOPENED),
            'cancelled': sum(1 for a in actions if a.get('status') == ActionStatus.CANCELLED),
            'overdue': sum(1 for a in actions if a.get('is_overdue')),
            'high_or_critical_priority': sum(1 for a in actions if a.get('priority') in [ActionPriority.HIGH, ActionPriority.CRITICAL]),
        }

        # Filter option choices available to user
        available_states = sorted(list({p['state'] for p in projects if p['state']}))
        available_districts = sorted(list({p['district'] for p in projects if p['district']}))
        available_sectors = sorted(list({p['sector'] for p in projects if p['sector']}))

        username = getattr(request.user, 'username', 'public_guest') if request.user and getattr(request.user, 'is_authenticated', False) else 'public_guest'

        return Response({
            'user_scope': {
                'username': username,
                'role': role,
                'state': getattr(request.user, 'state', None) if request.user and getattr(request.user, 'is_authenticated', False) else None,
                'district': getattr(request.user, 'district', None) if request.user and getattr(request.user, 'is_authenticated', False) else None,
                'department': getattr(request.user, 'department', None) if request.user and getattr(request.user, 'is_authenticated', False) else None,
                'is_citizen': is_citizen,
                'can_view_risk': True,
                'can_view_ml': True,
                'can_view_actions': dataset['can_view_actions'],
            },
            'project_counts': {
                'total_projects': total_projects,
                'official_projects': official_count,
                'synthetic_projects': synthetic_count,
                'total_original_cost_cr': round(total_orig_cost, 2),
                'total_revised_cost_cr': round(total_rev_cost, 2),
                'total_expenditure_cr': round(total_exp, 2),
                'average_progress_pct': round(avg_progress, 1),
            },
            'risk_distribution': risk_dist,
            'ml_anomaly_distribution': ml_dist,
            'verification_distribution': verif_dist,
            'corrective_actions_summary': actions_dist,
            'filter_options': {
                'states': ['All States'] + available_states,
                'districts': ['All Districts'] + available_districts,
                'sectors': ['All Sectors'] + available_sectors,
                'statuses': ['ALL', 'NOT_REVIEWED', 'IN_REVIEW', 'VERIFIED', 'CLOSED'],
                'risk_levels': ['ALL', 'Critical', 'High', 'Medium', 'Low', 'UNASSESSED'],
                'data_source_types': ['ALL', 'OFFICIAL'],
            },
            'data_provenance': {
                'official_source': 'Ministry of Statistics & Programme Implementation (MoSPI PAIMANA)',
                'reporting_dates_available': ['2026-02-28', '2026-06-30', '2026-09-24'],
                'server_as_of': datetime.now(timezone.utc).isoformat(),
            }
        })


class ReportsListView(APIView):
    """
    GET /api/reports/
    Generates tabular reports:
    - overdue_actions
    - pending_reviews
    - unresolved_findings
    - risk_assessments
    - public_oversight
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (has_capability(request.user, 'view_internal_reports') or has_capability(request.user, 'view_public_reports')):
            return Response({'error': 'Forbidden: Access to reports is restricted to authorized personnel.'}, status=status.HTTP_403_FORBIDDEN)

        report_type = request.query_params.get('report_type', 'risk_assessments')
        dataset = get_scoped_reporting_dataset(request.user, request.query_params)
        projects = dataset['projects']
        actions = dataset['actions']
        role = dataset['role']

        results = []

        if report_type == 'overdue_actions':
            if not dataset['can_view_actions']:
                return Response({'error': 'Forbidden: Access to corrective action reports is restricted.'}, status=status.HTTP_403_FORBIDDEN)
            for a in actions:
                if a.get('is_overdue'):
                    results.append({
                        'action_id': a.get('action_id'),
                        'project_id': a.get('project_id'),
                        'project_name': a.get('project_name'),
                        'state': a.get('state'),
                        'title': a.get('title'),
                        'priority': a.get('priority'),
                        'assigned_to': a.get('assigned_to') or 'Unassigned',
                        'assigned_agency': a.get('assigned_agency') or 'N/A',
                        'due_date': a.get('due_date'),
                        'days_remaining': a.get('days_remaining'),
                        'status': a.get('status'),
                        'created_at': a.get('created_at'),
                    })
            results.sort(key=lambda x: x.get('days_remaining') or 0)

        elif report_type == 'pending_reviews':
            # 1. Action resolutions awaiting review
            if dataset['can_view_actions']:
                for a in actions:
                    if a.get('status') == ActionStatus.AWAITING_REVIEW:
                        results.append({
                            'item_id': a.get('action_id'),
                            'item_type': 'Corrective Action Resolution',
                            'project_id': a.get('project_id'),
                            'project_name': a.get('project_name'),
                            'state': a.get('state'),
                            'submitted_by': a.get('resolution_submitted_by') or a.get('assigned_to') or 'Agency',
                            'submitted_at': a.get('resolution_submitted_at') or a.get('updated_at'),
                            'notes_or_summary': a.get('resolution_summary') or a.get('title'),
                            'status': 'AWAITING_REVIEW',
                        })

            # 2. Project verifications in review or not reviewed
            for p in projects:
                if p.get('verification_status') in ['IN_REVIEW', 'NOT_REVIEWED']:
                    results.append({
                        'item_id': f"VERIF-{p['project_id']}",
                        'item_type': 'Site Verification Audit',
                        'project_id': p['project_id'],
                        'project_name': p['project_name'],
                        'state': p['state'],
                        'submitted_by': 'Field Team / Monitoring Cell',
                        'submitted_at': p['source_as_of_date'],
                        'notes_or_summary': f"Progress reported at {p['reported_progress_pct']}%; budget utilization ₹{p['expenditure_cr']} Cr.",
                        'status': p['verification_status'],
                    })

        elif report_type == 'unresolved_findings':
            if not dataset['can_view_risk']:
                return Response({'error': 'Forbidden: Access to internal risk findings is restricted.'}, status=status.HTTP_403_FORBIDDEN)
            for p in projects:
                is_high_risk = p['rule_risk_level'] in ['Critical', 'High', 'Medium']
                is_ml_anomalous = (p['ml_category'] == 'ANOMALOUS')
                is_cleared = (p['verification_status'] == 'VERIFIED')

                if (is_high_risk or is_ml_anomalous) and not is_cleared:
                    results.append({
                        'project_id': p['project_id'],
                        'project_name': p['project_name'],
                        'state': p['state'],
                        'sector': p['sector'],
                        'data_source_type': p['data_source_type'],
                        'rule_risk_level': p['rule_risk_level'],
                        'rule_risk_score': p['rule_risk_score'],
                        'rules_triggered_count': p['rules_triggered_count'],
                        'rules_triggered_summary': ", ".join(p['rules_triggered_summary']) or "None",
                        'ml_category': p['ml_category'],
                        'ml_anomaly_score': p['ml_anomaly_score'],
                        'open_actions_count': p['open_actions_count'],
                        'verification_status': p['verification_status'],
                        'source_as_of_date': p['source_as_of_date'],
                    })
            results.sort(key=lambda x: (x.get('rule_risk_score') or 0), reverse=True)

        elif report_type == 'public_oversight':
            for p in projects:
                # Citizens only see official projects
                if role == Role.CITIZEN and p['data_source_type'] != 'OFFICIAL':
                    continue
                results.append({
                    'project_id': p['project_id'],
                    'project_name': p['project_name'],
                    'state': p['state'],
                    'sector': p['sector'],
                    'original_cost_cr': p['original_cost_cr'],
                    'revised_cost_cr': p['revised_cost_cr'],
                    'expenditure_cr': p['expenditure_cr'],
                    'reported_progress_pct': p['reported_progress_pct'],
                    'verification_status': p['verification_status'],
                    'source_agency': p['source_name'],
                    'source_as_of_date': p['source_as_of_date'],
                })

        else: # risk_assessments (Default)
            if not dataset['can_view_risk']:
                report_type = 'public_oversight'
                return self.get(request)

            for p in projects:
                results.append({
                    'project_id': p['project_id'],
                    'project_name': p['project_name'],
                    'state': p['state'],
                    'sector': p['sector'],
                    'data_source_type': p['data_source_type'],
                    'original_cost_cr': p['original_cost_cr'],
                    'revised_cost_cr': p['revised_cost_cr'],
                    'expenditure_cr': p['expenditure_cr'],
                    'reported_progress_pct': p['reported_progress_pct'],
                    'rule_risk_score': p['rule_risk_score'],
                    'rule_risk_level': p['rule_risk_level'],
                    'rules_triggered_summary': ", ".join(p['rules_triggered_summary']) or "None",
                    'ml_anomaly_score': p['ml_anomaly_score'],
                    'ml_category': p['ml_category'],
                    'verification_status': p['verification_status'],
                    'source_name': p['source_name'],
                    'source_as_of_date': p['source_as_of_date'],
                })

        return Response({
            'report_type': report_type,
            'count': len(results),
            'generated_at': datetime.now(timezone.utc).isoformat(),
            'role': role,
            'results': results,
        })


class ReportsExportView(APIView):
    """
    GET /api/reports/export/
    Generates and streams standardized CSV with Provenance metadata block.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not (has_capability(request.user, 'view_internal_reports') or has_capability(request.user, 'view_public_reports')):
            return Response({'error': 'Forbidden: Access to report export is restricted to authorized personnel.'}, status=status.HTTP_403_FORBIDDEN)

        report_type = request.query_params.get('report_type', 'risk_assessments')
        dataset = get_scoped_reporting_dataset(request.user, request.query_params)
        role = dataset['role']

        # Fetch records by reusing ReportsListView logic
        list_view = ReportsListView()
        resp = list_view.get(request)
        if resp.status_code != 200:
            return resp
        records = resp.data.get('results', [])

        timestamp_str = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
        filename = f"drishti_{report_type}_{timestamp_str}.csv"

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)

        # 1. Provenance & Audit Metadata Header Block
        writer.writerow(["# ================================================================"])
        writer.writerow(["# PROJECT DRISHTI — OFFICIAL INFRASTRUCTURE OVERSIGHT REPORT"])
        writer.writerow(["# Report Type", report_type.upper().replace('_', ' ')])
        writer.writerow(["# Exported At (UTC)", datetime.now(timezone.utc).isoformat()])
        writer.writerow(["# Requested By", f"{request.user.username} ({role})"])
        writer.writerow(["# Jurisdiction Filter", getattr(request.user, 'state', None) or "National / Unrestricted"])
        writer.writerow(["# Total Exported Records", len(records)])
        writer.writerow(["# Official Data Source", "Ministry of Statistics & Programme Implementation (MoSPI PAIMANA)"])
        writer.writerow(["# ================================================================"])
        writer.writerow([]) # blank line

        if not records:
            writer.writerow(["No records found matching the specified scope and filters."])
            return response

        # 2. Table Column Headers
        headers = list(records[0].keys())
        writer.writerow([h.replace('_', ' ').upper() for h in headers])

        # 3. Data Rows
        for r in records:
            row = []
            for h in headers:
                val = r.get(h)
                if val is None:
                    row.append("N/A")
                elif isinstance(val, bool):
                    row.append("YES" if val else "NO")
                else:
                    row.append(str(val))
            writer.writerow(row)

        return response
