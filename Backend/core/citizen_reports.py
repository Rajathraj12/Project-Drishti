"""
Citizen Grievance Reports — MongoDB-backed API views.

Endpoints:
  GET  /api/citizen-reports/              — list reports (filtered by role)
  POST /api/citizen-reports/              — submit a new grievance (open to all)
  GET  /api/citizen-reports/<id>/         — fetch single report by _id or referenceNo
  PATCH /api/citizen-reports/<id>/        — update status/assignment (officers only)
"""

import random
import string
from datetime import datetime, timezone

from bson import ObjectId
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from core.rbac import get_role
from core.views import get_mongo_collection


# Priority auto-assignment based on issue type
_PRIORITY_MAP = {
    'contractor absent from site': 'CRITICAL',
    'safety hazards at site': 'HIGH',
    'suspected irregularities': 'HIGH',
    'work stopped without reason': 'HIGH',
}

_OFFICER_ROLES = {'ADMIN', 'GOVERNMENT_OFFICER', 'FIELD_OFFICER'}


def _serialize(doc: dict) -> dict:
    """Return a JSON-safe dict from a MongoDB document."""
    out = {k: v for k, v in doc.items() if k != '_id'}
    out['id'] = str(doc['_id'])
    return out


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def citizen_reports_list(request):
    """
    GET  — list citizen reports (role-filtered).
    POST — submit a new citizen grievance report.
    """
    col = get_mongo_collection('citizen_reports')

    # ------------------------------------------------------------------ POST
    if request.method == 'POST':
        data = request.data
        issue_type = (data.get('issueType') or '').strip()
        priority = _PRIORITY_MAP.get(issue_type.lower(), 'MEDIUM')

        ref_num = ''.join(random.choices(string.digits, k=5))
        reference_no = f"RPT-{datetime.now(timezone.utc).year}-{ref_num}"

        user = request.user
        citizen_contact = (data.get('citizenContact') or '').strip()
        user_id = None
        if user and getattr(user, 'is_authenticated', False):
            user_id = str(user.pk)
            if not citizen_contact:
                full_name = f"{user.first_name} {user.last_name}".strip() or user.username
                citizen_contact = f"{full_name} ({user.email or 'Citizen'})"

        now = datetime.now(timezone.utc).isoformat()
        doc = {
            'referenceNo': reference_no,
            'projectId': (data.get('projectId') or 'DR-UNSPECIFIED').strip(),
            'projectName': (
                data.get('projectName') or data.get('projectId') or 'Community Civic Project'
            ).strip(),
            'issueType': issue_type,
            'description': (data.get('description') or '').strip(),
            'location': (data.get('location') or '').strip(),
            'photoName': data.get('photoName') or None,
            'state': data.get('state') or None,
            'department': data.get('department') or None,
            'citizenContact': citizen_contact or 'Guest Citizen (Public Whistleblower)',
            'userId': user_id,
            'status': 'Submitted',
            'priority': priority,
            'submittedAt': now,
            'lastUpdated': now,
            'assignedOfficer': None,
            'assignedInspector': None,
            'resolvedNote': None,
        }

        if col is None:
            return Response(
                {'error': 'Database unavailable. Please try again later.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            result = col.insert_one(doc)
            doc['id'] = str(result.inserted_id)
        except Exception as exc:
            print(f"[MongoDB] citizen_reports insert error: {exc}")
            return Response({'error': 'Database write failed.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(_serialize(doc), status=status.HTTP_201_CREATED)

    # ------------------------------------------------------------------ GET
    user = request.user
    is_authenticated = user and getattr(user, 'is_authenticated', False)
    role = get_role(user) if is_authenticated else None
    is_officer = role in _OFFICER_ROLES

    if col is None:
        return Response({'count': 0, 'results': []})

    query: dict = {}

    if not is_officer:
        if not is_authenticated:
            # Unauthenticated guests: no personal reports
            return Response({'count': 0, 'results': []})
        # Citizens see only their own submissions
        query['$or'] = [
            {'userId': str(user.pk)},
            {'citizenContact': {'$regex': user.email or '^$', '$options': 'i'}},
        ]

    # Optional query-string filters (officers only)
    if is_officer:
        qs = request.query_params
        if qs.get('status'):
            query['status'] = qs['status']
        if qs.get('priority'):
            query['priority'] = qs['priority']
        if qs.get('state'):
            query['state'] = {'$regex': qs['state'], '$options': 'i'}
        if qs.get('project_id'):
            query['projectId'] = qs['project_id']

    _PROJECTION = {
        '_id': 1, 'referenceNo': 1, 'projectId': 1, 'projectName': 1,
        'issueType': 1, 'description': 1, 'location': 1, 'photoName': 1,
        'state': 1, 'department': 1, 'citizenContact': 1, 'status': 1,
        'priority': 1, 'submittedAt': 1, 'lastUpdated': 1,
        'assignedOfficer': 1, 'assignedInspector': 1, 'resolvedNote': 1,
    }

    try:
        cursor = col.find(query, _PROJECTION).sort('submittedAt', -1).limit(500)
        results = [_serialize(d) for d in cursor]
        return Response({'count': len(results), 'results': results})
    except Exception as exc:
        print(f"[MongoDB] citizen_reports list error: {exc}")
        return Response({'count': 0, 'results': []})


@api_view(['GET', 'PATCH'])
@permission_classes([AllowAny])
def citizen_report_detail(request, report_id):
    """
    GET   — fetch a single report by MongoDB ObjectId or referenceNo.
    PATCH — update status/assignment/note (ADMIN, GOVERNMENT_OFFICER, FIELD_OFFICER only).
    """
    col = get_mongo_collection('citizen_reports')
    if col is None:
        return Response({'error': 'Database unavailable.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    # Accept hex ObjectId or referenceNo string
    try:
        lookup: dict = {'_id': ObjectId(report_id)}
    except Exception:
        lookup = {'referenceNo': report_id}

    # ------------------------------------------------------------------ GET
    if request.method == 'GET':
        doc = col.find_one(lookup)
        if not doc:
            return Response({'error': 'Report not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Citizens can only fetch their own report
        user = request.user
        is_authenticated = user and getattr(user, 'is_authenticated', False)
        role = get_role(user) if is_authenticated else None
        if role not in _OFFICER_ROLES:
            # Allow if owner
            if is_authenticated:
                is_owner = (
                    doc.get('userId') == str(user.pk) or
                    (user.email and user.email.lower() in (doc.get('citizenContact') or '').lower())
                )
                if not is_owner:
                    return Response({'error': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
            else:
                return Response({'error': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)

        return Response(_serialize(doc))

    # ------------------------------------------------------------------ PATCH
    user = request.user
    is_authenticated = user and getattr(user, 'is_authenticated', False)
    role = get_role(user) if is_authenticated else None
    if role not in _OFFICER_ROLES:
        return Response(
            {'error': 'Forbidden: Only officers can update citizen reports.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    data = request.data
    _ALLOWED = ('status', 'priority', 'assignedOfficer', 'assignedInspector', 'resolvedNote', 'department', 'state')
    update_fields = {k: v for k, v in data.items() if k in _ALLOWED and v is not None}
    if not update_fields:
        return Response({'error': 'No valid fields to update.'}, status=status.HTTP_400_BAD_REQUEST)

    update_fields['lastUpdated'] = datetime.now(timezone.utc).isoformat()

    try:
        result = col.update_one(lookup, {'$set': update_fields})
        if result.matched_count == 0:
            return Response({'error': 'Report not found.'}, status=status.HTTP_404_NOT_FOUND)
        doc = col.find_one(lookup)
        return Response(_serialize(doc))
    except Exception as exc:
        print(f"[MongoDB] citizen_report_detail patch error: {exc}")
        return Response({'error': 'Database update failed.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

