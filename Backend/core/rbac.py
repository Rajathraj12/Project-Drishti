"""Canonical RBAC matrix for Project Drishti.

Backend is the authority. Frontend copies of this matrix are UX-only.
"""
from core.models import Role

PUBLIC_PROJECT_FIELDS = (
    'project_id',
    'project_name',
    'project_description',
    'state',
    'district',
    'scheme',
    'department',
    'project_category',
    'work_type',
    'location_from',
    'location_to',
    'latitude',
    'longitude',
    'original_cost',
    'revised_cost',
    'reported_progress',
    'data_source_type',
    'verification_status',
    'is_public',
)

INTERNAL_ONLY_FIELDS = (
    'risk_score',
    'risk_level',
    'ml_anomaly_score',
    'anomaly_flag',
    'anomaly_status',
    'ml_explanation',
    'expenditure',
    'financial_utilization_pct',
    'cost_deviation_pct',
    'delay_days',
    'progress_gap_pct',
    'expenditure_progress_ratio',
)

CAPABILITIES = {
    'view_internal_risk': {Role.ADMIN, Role.GOVERNMENT_OFFICER, Role.FIELD_OFFICER},
    'view_ml_assessment': {Role.ADMIN, Role.GOVERNMENT_OFFICER},
    'run_rule_analysis': {Role.ADMIN, Role.GOVERNMENT_OFFICER, Role.FIELD_OFFICER},
    'run_ml_analysis': {Role.ADMIN, Role.GOVERNMENT_OFFICER},
    'bulk_analyze': {Role.ADMIN, Role.GOVERNMENT_OFFICER},
    'view_verifications': {Role.ADMIN, Role.GOVERNMENT_OFFICER, Role.FIELD_OFFICER},
    'submit_verification': {Role.ADMIN, Role.GOVERNMENT_OFFICER, Role.FIELD_OFFICER},
    'view_evidence': {Role.ADMIN, Role.GOVERNMENT_OFFICER, Role.FIELD_OFFICER, Role.IMPLEMENTING_AGENCY},
    'submit_evidence': {Role.ADMIN, Role.GOVERNMENT_OFFICER, Role.FIELD_OFFICER, Role.IMPLEMENTING_AGENCY},
    'view_corrective_actions': {Role.ADMIN, Role.GOVERNMENT_OFFICER, Role.FIELD_OFFICER, Role.IMPLEMENTING_AGENCY},
    'create_corrective_actions': {Role.ADMIN, Role.GOVERNMENT_OFFICER},
    'close_corrective_actions': {Role.ADMIN, Role.GOVERNMENT_OFFICER},
    'update_assigned_actions': {
        Role.ADMIN, Role.GOVERNMENT_OFFICER, Role.FIELD_OFFICER, Role.IMPLEMENTING_AGENCY
    },
    'manage_users': {Role.ADMIN},
    'write_project': {Role.ADMIN, Role.GOVERNMENT_OFFICER, Role.FIELD_OFFICER},
    'create_project': {Role.ADMIN},
    'view_contractors': {Role.ADMIN, Role.GOVERNMENT_OFFICER},
    'view_inspections': {Role.ADMIN, Role.GOVERNMENT_OFFICER, Role.FIELD_OFFICER},
    'view_internal_reports': {Role.ADMIN, Role.GOVERNMENT_OFFICER},
    'view_public_reports': {
        Role.ADMIN, Role.GOVERNMENT_OFFICER, Role.FIELD_OFFICER, Role.IMPLEMENTING_AGENCY, Role.CITIZEN
    },
}

VALID_ROLES = {choice[0] for choice in Role.choices}


def get_role(user):
    if not user or not getattr(user, 'is_authenticated', False):
        return None
    role = getattr(user, 'role', None)
    return role if role in VALID_ROLES else Role.CITIZEN


def has_capability(user, capability):
    role = get_role(user)
    if not role:
        return False
    return role in CAPABILITIES.get(capability, set())


def assigned_project_ids(user):
    if not user or not getattr(user, 'is_authenticated', False):
        return set()
    manager = getattr(user, 'project_assignments', None)
    if manager is None:
        return set()
    try:
        return set(manager.values_list('project_id', flat=True))
    except Exception:
        return set()


def project_as_dict(project):
    if project is None:
        return None
    if isinstance(project, dict):
        return project
    return {
        'project_id': getattr(project, 'project_id', None),
        'state': getattr(project, 'state', None),
        'district': getattr(project, 'district', None),
        'department': getattr(project, 'department', None),
        'verification_status': getattr(project, 'verification_status', None),
        'is_public': getattr(project, 'is_public', False),
        'data_source_type': getattr(project, 'data_source_type', None),
    }


def is_public_project(project_doc):
    if not project_doc:
        return False
    if project_doc.get('data_source_type') == 'SYNTHETIC_DEMO':
        return False
    if project_doc.get('is_public'):
        return True
    if project_doc.get('data_source_type') == 'OFFICIAL':
        return True
    return project_doc.get('verification_status') == 'VERIFIED'


def matches_jurisdiction(user, project_doc):
    if user.state and project_doc.get('state') and user.state != project_doc.get('state'):
        return False
    if user.district and project_doc.get('district') and user.district != project_doc.get('district'):
        return False
    dept = project_doc.get('department') or project_doc.get('sector')
    if user.department and dept and user.department != dept:
        return False
    return True


def user_can_access_project(user, project, *, for_corrective_action=False):
    """Object-level project visibility. Fail closed when scope is unset."""
    if not user or not getattr(user, 'is_authenticated', False):
        return False
    doc = project_as_dict(project)
    if not doc:
        return False
    if doc.get('data_source_type') == 'SYNTHETIC_DEMO':
        return False

    role = get_role(user)
    if role == Role.ADMIN:
        return True

    if role == Role.CITIZEN:
        return is_public_project(doc)

    assigned = assigned_project_ids(user)
    project_id = doc.get('project_id')

    if role == Role.GOVERNMENT_OFFICER:
        if assigned:
            if project_id not in assigned:
                return False
        return matches_jurisdiction(user, doc)

    if role == Role.FIELD_OFFICER:
        if assigned:
            if project_id not in assigned:
                return False
        elif not (user.state or user.district or user.department):
            return False
        return matches_jurisdiction(user, doc)

    if role == Role.IMPLEMENTING_AGENCY:
        if for_corrective_action:
            return True
        if assigned and project_id in assigned:
            return True
        if user.department and doc.get('department') and user.department == doc.get('department'):
            return True
        return False

    return False


def check_user_project_scope(user, project_doc, *, for_corrective_action=False):
    if not user or not getattr(user, 'is_authenticated', False):
        return False, "Authentication required"
    if user_can_access_project(user, project_doc, for_corrective_action=for_corrective_action):
        return True, ""
    role = get_role(user)
    if role == Role.CITIZEN:
        return False, "Forbidden: Citizens do not have access to this resource."
    if role in (Role.GOVERNMENT_OFFICER, Role.FIELD_OFFICER):
        return False, "Forbidden: Project outside user jurisdiction"
    if role == Role.IMPLEMENTING_AGENCY:
        return False, "Forbidden: Project is not assigned to this agency."
    return False, "Unauthorized role"


def filter_project_queryset(qs, user):
    qs = qs.exclude(data_source_type='SYNTHETIC_DEMO')
    role = get_role(user)
    if not role:
        return qs.none()
    if role == Role.ADMIN:
        return qs
    if role == Role.CITIZEN:
        return qs.filter(models_q_public())

    assigned = assigned_project_ids(user)
    if role == Role.GOVERNMENT_OFFICER:
        if assigned:
            qs = qs.filter(project_id__in=assigned)
        if user.state:
            qs = qs.filter(state=user.state)
        if user.district:
            qs = qs.filter(district=user.district)
        if user.department:
            qs = qs.filter(department=user.department)
        return qs

    if role == Role.FIELD_OFFICER:
        if assigned:
            qs = qs.filter(project_id__in=assigned)
        elif not (user.state or user.district or user.department):
            return qs.none()
        if user.state:
            qs = qs.filter(state=user.state)
        if user.district:
            qs = qs.filter(district=user.district)
        if user.department:
            qs = qs.filter(department=user.department)
        return qs

    if role == Role.IMPLEMENTING_AGENCY:
        from django.db.models import Q
        query = Q(pk__in=[])
        if assigned:
            query |= Q(project_id__in=assigned)
        if user.department:
            query |= Q(department=user.department)
        return qs.filter(query)

    return qs.none()


def models_q_public():
    from django.db.models import Q
    return Q(data_source_type='OFFICIAL') & (Q(is_public=True) | Q(verification_status='VERIFIED') | Q(data_source_type='OFFICIAL'))


def mongo_project_query(user):
    role = get_role(user)
    if not role:
        return {'data_source_type': 'OFFICIAL'}
    if role == Role.ADMIN:
        return {'data_source_type': {'$ne': 'SYNTHETIC_DEMO'}}
    if role == Role.CITIZEN:
        return {'data_source_type': 'OFFICIAL'}

    assigned = list(assigned_project_ids(user))
    if role == Role.GOVERNMENT_OFFICER:
        query = {'data_source_type': {'$ne': 'SYNTHETIC_DEMO'}}
        if assigned:
            query['project_id'] = {'$in': assigned}
        if user.state:
            query['state'] = user.state
        if user.district:
            query['district'] = user.district
        if user.department:
            query['$or'] = [{'department': user.department}, {'sector': user.department}]
        return query

    if role == Role.FIELD_OFFICER:
        query = {'data_source_type': {'$ne': 'SYNTHETIC_DEMO'}}
        if assigned:
            query['project_id'] = {'$in': assigned}
        elif not (user.state or user.district or user.department):
            return {'_id': {'$exists': False}}
        if user.state:
            query['state'] = user.state
        if user.district:
            query['district'] = user.district
        if user.department:
            query['$or'] = [{'department': user.department}, {'sector': user.department}]
        return query

    if role == Role.IMPLEMENTING_AGENCY:
        clauses = []
        if assigned:
            clauses.append({'project_id': {'$in': assigned}})
        if user.department:
            clauses.append({'department': user.department})
            clauses.append({'sector': user.department})
        if not clauses:
            return {'_id': {'$exists': False}}
        base_clause = {'$or': clauses} if len(clauses) > 1 else clauses[0]
        return {'$and': [{'data_source_type': {'$ne': 'SYNTHETIC_DEMO'}}, base_clause]}

    return {'_id': {'$exists': False}}


def sanitize_project_payload(user, payload):
    if not payload:
        return payload
    if has_capability(user, 'view_internal_risk') and has_capability(user, 'view_ml_assessment'):
        return payload
    data = dict(payload)
    if not has_capability(user, 'view_internal_risk'):
        for field in (
            'risk_score', 'risk_level', 'rules_triggered', 'rule_signals',
            'attention_level', 'why_flagged'
        ):
            data.pop(field, None)
    if not has_capability(user, 'view_ml_assessment'):
        for field in (
            'ml_anomaly_score', 'anomaly_flag', 'anomaly_status',
            'ml_explanation', 'explanation', 'features_used'
        ):
            data.pop(field, None)
    role = get_role(user)
    if role == Role.CITIZEN:
        public = {field: data.get(field) for field in PUBLIC_PROJECT_FIELDS if field in data}
        public['project_id'] = data.get('project_id')
        public['project_name'] = data.get('project_name')
        public['state'] = data.get('state')
        public['district'] = data.get('district', '')
        public['sector'] = data.get('sector')
        public['original_cost'] = data.get('original_cost')
        public['revised_cost'] = data.get('revised_cost')
        public['reported_progress'] = data.get('reported_progress')
        public['data_source_type'] = data.get('data_source_type')
        public['source_project_id'] = data.get('source_project_id')
        public['verification_status'] = data.get('verification_status')
        public['risk_level'] = data.get('risk_level')
        public['risk_score'] = data.get('risk_score')
        public['ml_anomaly_score'] = data.get('ml_anomaly_score')
        public['anomaly_flag'] = data.get('anomaly_flag')
        public['anomaly_status'] = data.get('anomaly_status')
        return public
    return data
