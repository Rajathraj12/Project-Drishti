import os
import uuid
from datetime import datetime, timezone, timedelta
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.conf import settings
from core.models import Role, AuditEvent
from core.rbac import check_user_project_scope as rbac_project_scope, has_capability, get_role

# Centralized status and priority constants
class ActionStatus:
    OPEN = 'OPEN'
    ASSIGNED = 'ASSIGNED'
    IN_PROGRESS = 'IN_PROGRESS'
    AWAITING_REVIEW = 'AWAITING_REVIEW'
    RESOLVED = 'RESOLVED'
    CLOSED = 'CLOSED'
    REOPENED = 'REOPENED'
    CANCELLED = 'CANCELLED'

    CHOICES = [
        OPEN, ASSIGNED, IN_PROGRESS, AWAITING_REVIEW,
        RESOLVED, CLOSED, REOPENED, CANCELLED
    ]

class ActionPriority:
    LOW = 'LOW'
    MEDIUM = 'MEDIUM'
    HIGH = 'HIGH'
    CRITICAL = 'CRITICAL'

    CHOICES = [LOW, MEDIUM, HIGH, CRITICAL]

# Central valid status transition mapping
VALID_TRANSITIONS = {
    ActionStatus.OPEN: [ActionStatus.ASSIGNED, ActionStatus.IN_PROGRESS, ActionStatus.CANCELLED],
    ActionStatus.ASSIGNED: [ActionStatus.ASSIGNED, ActionStatus.IN_PROGRESS, ActionStatus.CANCELLED],
    ActionStatus.IN_PROGRESS: [ActionStatus.AWAITING_REVIEW, ActionStatus.CANCELLED],
    ActionStatus.AWAITING_REVIEW: [ActionStatus.RESOLVED, ActionStatus.CLOSED, ActionStatus.IN_PROGRESS, ActionStatus.REOPENED, ActionStatus.CANCELLED],
    ActionStatus.RESOLVED: [ActionStatus.CLOSED, ActionStatus.REOPENED, ActionStatus.IN_PROGRESS],
    ActionStatus.CLOSED: [ActionStatus.REOPENED],
    ActionStatus.REOPENED: [ActionStatus.ASSIGNED, ActionStatus.IN_PROGRESS, ActionStatus.AWAITING_REVIEW, ActionStatus.CANCELLED],
    ActionStatus.CANCELLED: [ActionStatus.REOPENED],
}

# In-memory store fallback for testing or when Mongo is not reachable
_TEST_ACTIONS_STORE = {}

def get_mongo_db():
    """Returns the drishti_db database from MongoClient, or None if unavailable/testing without mongo."""
    if getattr(settings, 'TESTING', False) and not getattr(settings, 'USE_MONGO_IN_TESTS', False):
        return None
    mongo_uri = os.getenv('MONGO_URI')
    if not mongo_uri:
        return None
    try:
        from pymongo import MongoClient
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        return client['drishti_db']
    except Exception:
        return None

def parse_utc_timestamp(dt_str):
    """Parses ISO timestamp string to timezone-aware UTC datetime."""
    if not dt_str:
        return None
    try:
        # Handle trailing Z
        cleaned = dt_str.replace('Z', '+00:00')
        dt = datetime.fromisoformat(cleaned)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None

def compute_action_metadata(action_doc):
    """
    Computes derived fields:
    - is_overdue
    - days_overdue / days_remaining
    - escalation_level
    - notification_dispatch_status
    """
    now = datetime.now(timezone.utc)
    due_date_str = action_doc.get('due_date')
    due_dt = parse_utc_timestamp(due_date_str)
    
    st = action_doc.get('status', ActionStatus.OPEN)
    is_terminal = st in [ActionStatus.CLOSED, ActionStatus.CANCELLED]
    
    is_overdue = False
    days_overdue = 0
    days_remaining = None
    
    if due_dt and not is_terminal:
        if now > due_dt:
            is_overdue = True
            delta = now - due_dt
            days_overdue = delta.days if delta.days > 0 else 1
        else:
            delta = due_dt - now
            days_remaining = delta.days
            
    # Compute escalation level based on priority and overdue status
    priority = action_doc.get('priority', ActionPriority.MEDIUM)
    escalation_level = 'NORMAL'
    if is_overdue:
        if priority in [ActionPriority.HIGH, ActionPriority.CRITICAL]:
            escalation_level = 'CRITICAL_OVERDUE_ESCALATION'
        else:
            escalation_level = 'STANDARD_OVERDUE_ESCALATION'
            
    # Documentation of notification capability
    # Automated email/SMS escalation is unconfigured in development; tracking is visible in-app.
    notification_dispatch_status = "IN_APP_TRACKING_ONLY (Automated SMTP/SMS notifications unconfigured)"

    computed = dict(action_doc)
    computed['is_overdue'] = is_overdue
    computed['days_overdue'] = days_overdue
    computed['days_remaining'] = days_remaining
    computed['escalation_level'] = escalation_level
    computed['notification_dispatch_status'] = notification_dispatch_status
    return computed

def get_project_record(project_id):
    """Finds project document from MongoDB or Django ORM."""
    db = get_mongo_db()
    if db is not None:
        try:
            doc = db['projects'].find_one({"project_id": project_id, "data_source_type": {"$ne": "SYNTHETIC_DEMO"}})
            if doc:
                return doc
        except Exception:
            pass
    return None

def check_user_project_scope(user, project_doc):
    """Delegates to the canonical RBAC module. Corrective-action reads still apply assignment filters."""
    role = get_role(user)
    if role == Role.CITIZEN:
        return False, "Forbidden: Citizens do not have access to internal corrective actions."
    if not has_capability(user, 'view_corrective_actions') and not has_capability(user, 'create_corrective_actions'):
        return False, "Forbidden: not permitted to access corrective actions."
    return rbac_project_scope(user, project_doc, for_corrective_action=True)

def append_audit_entry(action_doc, actor_user, event_type, details=None):
    """Appends an immutable audit record to the action's audit_history."""
    if 'audit_history' not in action_doc or not isinstance(action_doc['audit_history'], list):
        action_doc['audit_history'] = []
        
    entry = {
        "event_id": str(uuid.uuid4()),
        "event_type": event_type,
        "actor_id": str(getattr(actor_user, 'id', actor_user.username)),
        "actor_username": getattr(actor_user, 'username', 'Unknown'),
        "actor_role": getattr(actor_user, 'role', 'Officer'),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": details or {}
    }
    action_doc['audit_history'].append(entry)
    
    # Also record in Django AuditEvent for persistent central auditing
    try:
        AuditEvent.objects.create(
            actor=actor_user if hasattr(actor_user, 'id') and getattr(actor_user, 'is_authenticated', False) else None,
            event_type='PROJECT_STATUS_UPDATED',
            entity_type='CorrectiveAction',
            entity_id=action_doc.get('action_id', ''),
            change_summary={"event": event_type, "details": details or {}}
        )
    except Exception:
        pass
    return entry

def save_action_doc(action_doc):
    """Saves or updates action in MongoDB or test store."""
    action_id = action_doc['action_id']
    action_doc['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    db = get_mongo_db()
    if db is not None:
        try:
            # We save a copy to avoid mutating _id in memory
            to_save = dict(action_doc)
            db['corrective_actions'].update_one(
                {"action_id": action_id},
                {"$set": to_save},
                upsert=True
            )
        except Exception as e:
            print("MongoDB save error:", e)
            _TEST_ACTIONS_STORE[action_id] = dict(action_doc)
    else:
        _TEST_ACTIONS_STORE[action_id] = dict(action_doc)
        
    if "_id" in action_doc:
        del action_doc["_id"]
    return action_doc

def find_action_doc(action_id):
    """Fetches action document by action_id."""
    db = get_mongo_db()
    if db is not None:
        try:
            doc = db['corrective_actions'].find_one({"action_id": action_id})
            if doc:
                if "_id" in doc:
                    del doc["_id"]
                return doc
        except Exception:
            pass
    if action_id in _TEST_ACTIONS_STORE:
        return dict(_TEST_ACTIONS_STORE[action_id])
    return None

class CorrectiveActionViewSet(viewsets.ViewSet):
    """
    Full Phase 7 Corrective Action Lifecycle, RBAC, Finding Linking & Auditing.
    """
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        user = request.user
        role = getattr(user, 'role', Role.CITIZEN)
        if role == Role.CITIZEN:
            return Response({"error": "Forbidden: Citizens do not have access to internal corrective actions."}, status=status.HTTP_403_FORBIDDEN)
            
        project_id = request.query_params.get('project_id')
        status_filter = request.query_params.get('status')
        priority_filter = request.query_params.get('priority')
        assigned_to_filter = request.query_params.get('assigned_to')
        is_overdue_filter = request.query_params.get('is_overdue')

        # Retrieve all actions from MongoDB or fallback
        all_actions = []
        db = get_mongo_db()
        if db is not None:
            try:
                cursor = db['corrective_actions'].find({})
                for d in cursor:
                    if "_id" in d:
                        del d["_id"]
                    all_actions.append(d)
            except Exception:
                all_actions = list(_TEST_ACTIONS_STORE.values())
        else:
            all_actions = list(_TEST_ACTIONS_STORE.values())

        filtered = []
        for doc in all_actions:
            # Check project scope
            p_id = doc.get('project_id')
            p_record = get_project_record(p_id)
            if p_record:
                allowed, _ = check_user_project_scope(user, p_record)
                if not allowed:
                    continue

            # Apply query filters
            if project_id and doc.get('project_id') != project_id:
                continue
            if status_filter and doc.get('status') != status_filter:
                continue
            if priority_filter and doc.get('priority') != priority_filter:
                continue
            if assigned_to_filter and doc.get('assigned_to') != assigned_to_filter:
                continue

            annotated = compute_action_metadata(doc)
            if is_overdue_filter is not None:
                want_overdue = is_overdue_filter.lower() in ['true', '1']
                if annotated.get('is_overdue') != want_overdue:
                    continue

            filtered.append(annotated)

        # Sort by created_at descending
        filtered.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return Response({
            "count": len(filtered),
            "results": filtered
        })

    def retrieve(self, request, pk=None):
        user = request.user
        role = getattr(user, 'role', Role.CITIZEN)
        if role == Role.CITIZEN:
            return Response({"error": "Forbidden: Citizens do not have access to internal corrective actions."}, status=status.HTTP_403_FORBIDDEN)

        doc = find_action_doc(pk)
        if not doc:
            return Response({"error": "Corrective action not found."}, status=status.HTTP_404_NOT_FOUND)

        p_record = get_project_record(doc.get('project_id'))
        if p_record:
            allowed, _reason = check_user_project_scope(user, p_record)
            if not allowed:
                return Response({"error": "Corrective action not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(compute_action_metadata(doc))

    def create(self, request):
        user = request.user
        role = getattr(user, 'role', Role.CITIZEN)
        if role == Role.CITIZEN:
            return Response({"error": "Forbidden: Citizens cannot create corrective actions."}, status=status.HTTP_403_FORBIDDEN)

        if role not in [Role.ADMIN, Role.GOVERNMENT_OFFICER]:
            return Response({"error": "Forbidden: Only Admin or Government Officers can create corrective actions."}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        project_id = data.get('project_id')
        if not project_id:
            return Response({"error": "project_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        p_record = get_project_record(project_id)
        if not p_record:
            return Response({"error": f"Project '{project_id}' not found."}, status=status.HTTP_404_NOT_FOUND)

        allowed, reason = check_user_project_scope(user, p_record)
        if not allowed:
            return Response({"error": reason}, status=status.HTTP_403_FORBIDDEN)

        title = data.get('title', '').strip()
        description = data.get('description', '').strip()
        reason_text = data.get('reason', '').strip()
        due_date = data.get('due_date', '').strip()

        if not title:
            return Response({"error": "Title is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not description:
            return Response({"error": "Detailed description is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not reason_text:
            return Response({"error": "Reason for corrective action is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not due_date:
            return Response({"error": "Due date is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate due_date
        due_dt = parse_utc_timestamp(due_date)
        if not due_dt:
            return Response({"error": "Invalid due_date format. Please provide ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ)."}, status=status.HTTP_400_BAD_REQUEST)

        priority = data.get('priority', ActionPriority.MEDIUM).upper()
        if priority not in ActionPriority.CHOICES:
            return Response({"error": f"Invalid priority. Must be one of {ActionPriority.CHOICES}"}, status=status.HTTP_400_BAD_REQUEST)

        assigned_to = data.get('assigned_to', '').strip()
        assigned_agency = data.get('assigned_agency', '').strip()
        initial_status = ActionStatus.ASSIGNED if (assigned_to or assigned_agency) else ActionStatus.OPEN

        # Link Findings (Phase 3 risk, Phase 4 ML, Phase 5 verification, Phase 6 evidence)
        if hasattr(data, 'getlist') and 'evidence_ids' in data:
            evidence_ids = data.getlist('evidence_ids')
        else:
            evidence_ids = data.get('evidence_ids', [])
        if not isinstance(evidence_ids, list):
            evidence_ids = [evidence_ids] if evidence_ids else []

        action_id = f"CA-2026-{uuid.uuid4().hex[:8].upper()}"
        now_iso = datetime.now(timezone.utc).isoformat()

        action_doc = {
            "action_id": action_id,
            "project_id": project_id,
            "title": title,
            "description": description,
            "reason": reason_text,
            "priority": priority,
            "status": initial_status,
            "assigned_to": assigned_to or None,
            "assigned_agency": assigned_agency or None,
            "created_by": user.username,
            "creator_role": role,
            "created_at": now_iso,
            "updated_at": now_iso,
            "due_date": due_dt.isoformat(),
            # Finding references
            "risk_assessment_id": data.get('risk_assessment_id'),
            "ml_assessment_id": data.get('ml_assessment_id'),
            "verification_id": data.get('verification_id'),
            "observation": data.get('observation'),
            "evidence_ids": evidence_ids,
            # Workflow tracking
            "progress_updates": [],
            "resolution_summary": None,
            "resolution_submitted_by": None,
            "resolution_submitted_at": None,
            "closure_reviewer": None,
            "closure_reviewed_at": None,
            "closure_notes": None,
            "reopen_reason": None,
            "cancellation_reason": None,
            "audit_history": []
        }

        append_audit_entry(
            action_doc, user, 'ACTION_CREATED',
            details={
                "title": title,
                "initial_status": initial_status,
                "priority": priority,
                "assigned_to": assigned_to or None,
                "due_date": due_dt.isoformat(),
                "linked_risk_id": data.get('risk_assessment_id'),
                "linked_ml_id": data.get('ml_assessment_id')
            }
        )

        save_action_doc(action_doc)
        return Response(compute_action_metadata(action_doc), status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        user = request.user
        role = getattr(user, 'role', Role.CITIZEN)
        if role == Role.CITIZEN:
            return Response({"error": "Forbidden: Insufficient permissions to modify action details."}, status=status.HTTP_403_FORBIDDEN)

        doc = find_action_doc(pk)
        if not doc:
            return Response({"error": "Action not found."}, status=status.HTTP_404_NOT_FOUND)

        p_record = get_project_record(doc.get('project_id'))
        if p_record:
            allowed, reason = check_user_project_scope(user, p_record)
            if not allowed:
                return Response({"error": reason}, status=status.HTTP_403_FORBIDDEN)

        if doc.get('status') in [ActionStatus.CLOSED, ActionStatus.CANCELLED]:
            return Response({"error": f"Cannot edit an action that is {doc.get('status')}."}, status=status.HTTP_400_BAD_REQUEST)

        data = request.data
        changes = {}

        if 'title' in data and data['title'].strip():
            changes['title'] = (doc.get('title'), data['title'].strip())
            doc['title'] = data['title'].strip()

        if 'description' in data and data['description'].strip():
            changes['description'] = (doc.get('description'), data['description'].strip())
            doc['description'] = data['description'].strip()

        if 'priority' in data:
            new_p = data['priority'].upper()
            if new_p in ActionPriority.CHOICES:
                changes['priority'] = (doc.get('priority'), new_p)
                doc['priority'] = new_p

        if 'due_date' in data:
            due_dt = parse_utc_timestamp(data['due_date'])
            if due_dt:
                changes['due_date'] = (doc.get('due_date'), due_dt.isoformat())
                doc['due_date'] = due_dt.isoformat()

        if changes:
            append_audit_entry(doc, user, 'DETAILS_UPDATED', details=changes)
            save_action_doc(doc)

        return Response(compute_action_metadata(doc))

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        user = request.user
        role = getattr(user, 'role', Role.CITIZEN)
        if role not in [Role.ADMIN, Role.GOVERNMENT_OFFICER]:
            return Response({"error": "Forbidden: Only Admin or Government Officers can assign or reassign actions."}, status=status.HTTP_403_FORBIDDEN)

        doc = find_action_doc(pk)
        if not doc:
            return Response({"error": "Action not found."}, status=status.HTTP_404_NOT_FOUND)

        p_record = get_project_record(doc.get('project_id'))
        if p_record:
            allowed, reason = check_user_project_scope(user, p_record)
            if not allowed:
                return Response({"error": reason}, status=status.HTTP_403_FORBIDDEN)

        if doc.get('status') in [ActionStatus.CLOSED, ActionStatus.CANCELLED]:
            return Response({"error": f"Cannot assign an action in '{doc.get('status')}' status."}, status=status.HTTP_400_BAD_REQUEST)

        assigned_to = request.data.get('assigned_to', '').strip()
        assigned_agency = request.data.get('assigned_agency', '').strip()
        new_due_date = request.data.get('due_date', '').strip()

        if not assigned_to and not assigned_agency:
            return Response({"error": "assigned_to or assigned_agency must be specified."}, status=status.HTTP_400_BAD_REQUEST)

        prev_assigned_to = doc.get('assigned_to')
        prev_agency = doc.get('assigned_agency')
        doc['assigned_to'] = assigned_to or None
        doc['assigned_agency'] = assigned_agency or None

        if new_due_date:
            due_dt = parse_utc_timestamp(new_due_date)
            if due_dt:
                doc['due_date'] = due_dt.isoformat()

        if doc['status'] == ActionStatus.OPEN:
            doc['status'] = ActionStatus.ASSIGNED

        event_name = 'ACTION_REASSIGNED' if prev_assigned_to else 'ACTION_ASSIGNED'
        append_audit_entry(doc, user, event_name, details={
            "previous_assigned_to": prev_assigned_to,
            "new_assigned_to": assigned_to,
            "previous_agency": prev_agency,
            "new_agency": assigned_agency,
            "new_status": doc['status']
        })

        save_action_doc(doc)
        return Response(compute_action_metadata(doc))

    @action(detail=True, methods=['post'])
    def progress(self, request, pk=None):
        user = request.user
        role = getattr(user, 'role', Role.CITIZEN)
        if role == Role.CITIZEN:
            return Response({"error": "Forbidden: Citizens cannot post progress updates."}, status=status.HTTP_403_FORBIDDEN)

        doc = find_action_doc(pk)
        if not doc:
            return Response({"error": "Action not found."}, status=status.HTTP_404_NOT_FOUND)

        p_record = get_project_record(doc.get('project_id'))
        if p_record:
            allowed, reason = check_user_project_scope(user, p_record)
            if not allowed:
                return Response({"error": reason}, status=status.HTTP_403_FORBIDDEN)

        if doc.get('status') in [ActionStatus.CLOSED, ActionStatus.CANCELLED]:
            return Response({"error": f"Cannot add progress updates to a {doc.get('status')} action."}, status=status.HTTP_400_BAD_REQUEST)

        message = request.data.get('message', '').strip()
        if not message:
            return Response({"error": "Progress message is required."}, status=status.HTTP_400_BAD_REQUEST)

        evidence_refs = request.data.get('supporting_evidence', [])
        if not isinstance(evidence_refs, list):
            evidence_refs = [evidence_refs] if evidence_refs else []

        progress_pct = request.data.get('progress_pct')
        if progress_pct is not None:
            try:
                progress_pct = max(0, min(100, float(progress_pct)))
            except (ValueError, TypeError):
                progress_pct = None

        update_item = {
            "update_id": f"UPD-{uuid.uuid4().hex[:8].upper()}",
            "actor_id": str(getattr(user, 'id', user.username)),
            "actor_name": user.username,
            "actor_role": role,
            "message": message,
            "supporting_evidence": evidence_refs,
            "progress_pct": progress_pct,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        if 'progress_updates' not in doc:
            doc['progress_updates'] = []
        doc['progress_updates'].append(update_item)

        # Transition to IN_PROGRESS if currently OPEN or ASSIGNED
        status_changed = False
        prev_status = doc.get('status')
        if prev_status in [ActionStatus.OPEN, ActionStatus.ASSIGNED, ActionStatus.REOPENED]:
            doc['status'] = ActionStatus.IN_PROGRESS
            status_changed = True

        append_audit_entry(doc, user, 'PROGRESS_UPDATED', details={
            "update_id": update_item['update_id'],
            "message": message,
            "evidence_count": len(evidence_refs),
            "status_changed": status_changed,
            "new_status": doc['status']
        })

        save_action_doc(doc)
        return Response(compute_action_metadata(doc), status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='submit-resolution')
    def submit_resolution(self, request, pk=None):
        user = request.user
        role = getattr(user, 'role', Role.CITIZEN)
        if role == Role.CITIZEN:
            return Response({"error": "Forbidden: Citizens cannot submit resolutions."}, status=status.HTTP_403_FORBIDDEN)

        doc = find_action_doc(pk)
        if not doc:
            return Response({"error": "Action not found."}, status=status.HTTP_404_NOT_FOUND)

        p_record = get_project_record(doc.get('project_id'))
        if p_record:
            allowed, reason = check_user_project_scope(user, p_record)
            if not allowed:
                return Response({"error": reason}, status=status.HTTP_403_FORBIDDEN)

        current_status = doc.get('status')
        if current_status not in [ActionStatus.ASSIGNED, ActionStatus.IN_PROGRESS, ActionStatus.REOPENED]:
            return Response({"error": f"Cannot submit resolution from current status '{current_status}'. Must be ASSIGNED, IN_PROGRESS, or REOPENED."}, status=status.HTTP_400_BAD_REQUEST)

        resolution_summary = request.data.get('resolution_summary', '').strip()
        if not resolution_summary:
            return Response({"error": "Resolution summary is required before submitting for review."}, status=status.HTTP_400_BAD_REQUEST)

        evidence_refs = request.data.get('supporting_evidence', [])
        if not isinstance(evidence_refs, list):
            evidence_refs = [evidence_refs] if evidence_refs else []

        # Update resolution state
        now_iso = datetime.now(timezone.utc).isoformat()
        doc['resolution_summary'] = resolution_summary
        doc['resolution_submitted_by'] = user.username
        doc['resolution_submitted_at'] = now_iso
        doc['status'] = ActionStatus.AWAITING_REVIEW

        # Add to progress updates as resolution submission
        doc.setdefault('progress_updates', []).append({
            "update_id": f"RES-{uuid.uuid4().hex[:8].upper()}",
            "actor_id": str(getattr(user, 'id', user.username)),
            "actor_name": user.username,
            "actor_role": role,
            "message": f"Resolution submitted for review: {resolution_summary}",
            "supporting_evidence": evidence_refs,
            "progress_pct": 100,
            "timestamp": now_iso
        })

        append_audit_entry(doc, user, 'RESOLUTION_SUBMITTED', details={
            "summary": resolution_summary,
            "evidence_references": evidence_refs,
            "new_status": ActionStatus.AWAITING_REVIEW
        })

        save_action_doc(doc)
        return Response(compute_action_metadata(doc))

    @action(detail=True, methods=['post'], url_path='review-resolution')
    def review_resolution(self, request, pk=None):
        user = request.user
        role = getattr(user, 'role', Role.CITIZEN)
        if role not in [Role.ADMIN, Role.GOVERNMENT_OFFICER]:
            return Response({"error": "Forbidden: Only Admin or Government Officers can review resolutions."}, status=status.HTTP_403_FORBIDDEN)

        doc = find_action_doc(pk)
        if not doc:
            return Response({"error": "Action not found."}, status=status.HTTP_404_NOT_FOUND)

        p_record = get_project_record(doc.get('project_id'))
        if p_record:
            allowed, reason = check_user_project_scope(user, p_record)
            if not allowed:
                return Response({"error": reason}, status=status.HTTP_403_FORBIDDEN)

        current_status = doc.get('status')
        if current_status not in [ActionStatus.AWAITING_REVIEW, ActionStatus.RESOLVED]:
            return Response({"error": f"Action is not awaiting review (current status: {current_status})."}, status=status.HTTP_400_BAD_REQUEST)

        # Separation of duties:
        # The person responsible for completing an action or submitting its resolution cannot approve their own closure
        approved = request.data.get('approved', False)
        if isinstance(approved, str):
            approved = approved.lower() in ['true', '1', 'yes']

        if approved:
            if doc.get('assigned_to') == user.username:
                return Response({"error": "Separation of duties violation: The assigned responsible user cannot approve their own resolution closure."}, status=status.HTTP_403_FORBIDDEN)
            if doc.get('resolution_submitted_by') == user.username:
                return Response({"error": "Separation of duties violation: The submitter of the resolution cannot approve their own closure."}, status=status.HTTP_403_FORBIDDEN)

        review_notes = request.data.get('review_notes', '').strip()
        now_iso = datetime.now(timezone.utc).isoformat()

        if approved:
            doc['status'] = ActionStatus.CLOSED
            doc['closure_reviewer'] = user.username
            doc['closure_reviewed_at'] = now_iso
            doc['closure_notes'] = review_notes or "Resolution approved and verified."

            append_audit_entry(doc, user, 'RESOLUTION_APPROVED_AND_CLOSED', details={
                "review_notes": doc['closure_notes'],
                "new_status": ActionStatus.CLOSED
            })
        else:
            if not review_notes:
                return Response({"error": "Review notes / feedback are required when rejecting a resolution."}, status=status.HTTP_400_BAD_REQUEST)
            doc['status'] = ActionStatus.IN_PROGRESS
            append_audit_entry(doc, user, 'RESOLUTION_REJECTED', details={
                "review_notes": review_notes,
                "returned_to": ActionStatus.IN_PROGRESS
            })

        save_action_doc(doc)
        return Response(compute_action_metadata(doc))

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Direct closure by authorized reviewer."""
        user = request.user
        role = getattr(user, 'role', Role.CITIZEN)
        if role not in [Role.ADMIN, Role.GOVERNMENT_OFFICER]:
            return Response({"error": "Forbidden: Only Admin or Government Officers can close corrective actions."}, status=status.HTTP_403_FORBIDDEN)

        doc = find_action_doc(pk)
        if not doc:
            return Response({"error": "Action not found."}, status=status.HTTP_404_NOT_FOUND)

        p_record = get_project_record(doc.get('project_id'))
        if p_record:
            allowed, reason = check_user_project_scope(user, p_record)
            if not allowed:
                return Response({"error": reason}, status=status.HTTP_403_FORBIDDEN)

        # Separation of duties
        if doc.get('assigned_to') == user.username:
            return Response({"error": "Separation of duties violation: The assigned responsible user cannot approve their own closure."}, status=status.HTTP_403_FORBIDDEN)
        if doc.get('resolution_submitted_by') == user.username:
            return Response({"error": "Separation of duties violation: The submitter of the resolution cannot approve their own closure."}, status=status.HTTP_403_FORBIDDEN)

        closure_notes = request.data.get('closure_notes', '').strip()
        now_iso = datetime.now(timezone.utc).isoformat()
        doc['status'] = ActionStatus.CLOSED
        doc['closure_reviewer'] = user.username
        doc['closure_reviewed_at'] = now_iso
        doc['closure_notes'] = closure_notes or "Closed by authorized officer."

        append_audit_entry(doc, user, 'ACTION_CLOSED', details={
            "closure_notes": doc['closure_notes'],
            "new_status": ActionStatus.CLOSED
        })

        save_action_doc(doc)
        return Response(compute_action_metadata(doc))

    @action(detail=True, methods=['post'])
    def reopen(self, request, pk=None):
        user = request.user
        role = getattr(user, 'role', Role.CITIZEN)
        if role not in [Role.ADMIN, Role.GOVERNMENT_OFFICER]:
            return Response({"error": "Forbidden: Only Admin or Government Officers can reopen an action."}, status=status.HTTP_403_FORBIDDEN)

        doc = find_action_doc(pk)
        if not doc:
            return Response({"error": "Action not found."}, status=status.HTTP_404_NOT_FOUND)

        p_record = get_project_record(doc.get('project_id'))
        if p_record:
            allowed, reason = check_user_project_scope(user, p_record)
            if not allowed:
                return Response({"error": reason}, status=status.HTTP_403_FORBIDDEN)

        reopen_reason = request.data.get('reopen_reason', '').strip()
        if not reopen_reason:
            return Response({"error": "reopen_reason is required to reopen an action."}, status=status.HTTP_400_BAD_REQUEST)

        prev_status = doc.get('status')
        doc['status'] = ActionStatus.REOPENED
        doc['reopen_reason'] = reopen_reason

        append_audit_entry(doc, user, 'ACTION_REOPENED', details={
            "previous_status": prev_status,
            "reopen_reason": reopen_reason,
            "new_status": ActionStatus.REOPENED
        })

        save_action_doc(doc)
        return Response(compute_action_metadata(doc))

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        user = request.user
        role = getattr(user, 'role', Role.CITIZEN)
        if role not in [Role.ADMIN, Role.GOVERNMENT_OFFICER]:
            return Response({"error": "Forbidden: Only Admin or Government Officers can cancel an action."}, status=status.HTTP_403_FORBIDDEN)

        doc = find_action_doc(pk)
        if not doc:
            return Response({"error": "Action not found."}, status=status.HTTP_404_NOT_FOUND)

        p_record = get_project_record(doc.get('project_id'))
        if p_record:
            allowed, reason = check_user_project_scope(user, p_record)
            if not allowed:
                return Response({"error": reason}, status=status.HTTP_403_FORBIDDEN)

        cancellation_reason = request.data.get('cancellation_reason', '').strip()
        if not cancellation_reason:
            return Response({"error": "cancellation_reason is required to cancel an action."}, status=status.HTTP_400_BAD_REQUEST)

        prev_status = doc.get('status')
        doc['status'] = ActionStatus.CANCELLED
        doc['cancellation_reason'] = cancellation_reason

        append_audit_entry(doc, user, 'ACTION_CANCELLED', details={
            "previous_status": prev_status,
            "cancellation_reason": cancellation_reason,
            "new_status": ActionStatus.CANCELLED
        })

        save_action_doc(doc)
        return Response(compute_action_metadata(doc))

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        user = request.user
        role = getattr(user, 'role', Role.CITIZEN)
        if role == Role.CITIZEN:
            return Response({"error": "Forbidden: Citizens cannot view corrective action audit history."}, status=status.HTTP_403_FORBIDDEN)

        doc = find_action_doc(pk)
        if not doc:
            return Response({"error": "Action not found."}, status=status.HTTP_404_NOT_FOUND)

        p_record = get_project_record(doc.get('project_id'))
        if p_record:
            allowed, reason = check_user_project_scope(user, p_record)
            if not allowed:
                return Response({"error": reason}, status=status.HTTP_403_FORBIDDEN)

        history = doc.get('audit_history', [])
        return Response({
            "action_id": doc.get('action_id'),
            "count": len(history),
            "events": history
        })
