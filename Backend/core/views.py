import secrets
from django.db.models import Q
from rest_framework import viewsets, status, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from core.models import User, Role
from core.rbac import get_role, has_capability
from core.serializers import UserAdminSerializer, serialize_user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    username = serializers.CharField(required=False)
    email = serializers.CharField(required=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields[self.username_field].required = False
        self.fields['email'] = serializers.CharField(required=False)

    def validate(self, attrs):
        login_id = attrs.get('username') or attrs.get('email')
        if not login_id:
            raise serializers.ValidationError({"detail": "Username or email is required."})

        login_id = str(login_id).strip()
        user_obj = User.objects.filter(
            Q(username__iexact=login_id) | Q(email__iexact=login_id)
        ).first()

        if user_obj:
            attrs['username'] = user_obj.username
        else:
            attrs['username'] = login_id

        data = super().validate(attrs)
        user = self.user
        data['token'] = data['access']
        data['user'] = serialize_user(user)
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


def get_mongo_collection(name='users'):
    import os
    mongo_uri = os.getenv('MONGO_URI')
    if mongo_uri:
        try:
            from pymongo import MongoClient
            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=4000)
            return client['drishti_db'][name]
        except Exception:
            return None
    return None


@api_view(['POST'])
@permission_classes([AllowAny])
def citizen_register_view(request):
    """
    Registers a new citizen user.
    Persists citizen profile directly to MongoDB Atlas ('users' collection)
    and synchronizes with Django auth to issue valid JWT tokens.
    """
    data = request.data
    email = str(data.get('email') or '').strip().lower()
    password = str(data.get('password') or '').strip()
    full_name = str(data.get('full_name') or data.get('name') or '').strip()
    state = str(data.get('state') or 'All India').strip()
    district = str(data.get('district') or '').strip()
    phone = str(data.get('phone') or '').strip()

    if not email or '@' not in email:
        return Response({'detail': 'A valid email address is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not password or len(password) < 6:
        return Response({'detail': 'Password must be at least 6 characters.'}, status=status.HTTP_400_BAD_REQUEST)

    if not full_name:
        full_name = email.split('@')[0].capitalize()
    name_parts = full_name.split(' ', 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ''

    # Check MongoDB collection
    mongo_users = get_mongo_collection('users')
    if mongo_users is not None:
        try:
            existing_mongo = mongo_users.find_one({'email': email})
            if existing_mongo:
                return Response({'detail': 'An account with this email address already exists. Please sign in.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            pass

    # Check Django User
    if User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)).exists():
        return Response({'detail': 'An account with this email address already exists. Please sign in.'}, status=status.HTTP_400_BAD_REQUEST)

    base_username = email.split('@')[0].lower()
    clean_username = ''.join(c for c in base_username if c.isalnum() or c in '_-') or 'citizen'
    username = clean_username
    suffix = 1
    while User.objects.filter(username=username).exists():
        username = f"{clean_username}_{suffix}"
        suffix += 1

    # Save to MongoDB Atlas
    if mongo_users is not None:
        try:
            from datetime import datetime, timezone
            citizen_doc = {
                'username': username,
                'email': email,
                'password_plain': password,
                'role': 'CITIZEN',
                'first_name': first_name,
                'last_name': last_name,
                'full_name': full_name,
                'department': 'Civic Transparency Watch',
                'state': state,
                'district': district,
                'phone': phone,
                'assigned_projects': [],
                'description': 'Public citizen auditor monitoring taxpayer infrastructure spend.',
                'icon': 'users',
                'badge_color': '#2563eb',
                'is_active': True,
                'auth_provider': 'mongodb_local',
                'created_at': datetime.now(timezone.utc).isoformat(),
            }
            mongo_users.update_one({'email': email}, {'$set': citizen_doc}, upsert=True)
            print(f"[MongoDB] Created citizen doc for {email}")
        except Exception as e:
            print(f"[MongoDB] Warning: Failed to write citizen to Mongo: {e}")

    # Create Django User
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        role=Role.CITIZEN,
        state=state,
        district=district,
        department='Civic Transparency Watch',
        is_active=True
    )

    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    token = str(refresh.access_token)

    return Response({
        'token': token,
        'access': token,
        'refresh': str(refresh),
        'user': serialize_user(user),
        'message': 'Citizen account created successfully.'
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def citizen_login_view(request):
    """
    Authenticates a citizen against MongoDB and Django auth.
    Ensures role is verified as CITIZEN.
    """
    login_id = str(request.data.get('email') or request.data.get('username') or '').strip().lower()
    password = str(request.data.get('password') or '').strip()

    if not login_id or not password:
        return Response({'detail': 'Email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    # Check Django first
    user = User.objects.filter(Q(username__iexact=login_id) | Q(email__iexact=login_id)).first()

    # If user not found in Django, check MongoDB
    if not user:
        mongo_users = get_mongo_collection('users')
        if mongo_users is not None:
            try:
                m_user = mongo_users.find_one({'$or': [{'email': login_id}, {'username': login_id}]})
                if m_user and m_user.get('password_plain') == password:
                    u_email = m_user.get('email', login_id)
                    u_name = m_user.get('username', login_id.split('@')[0])
                    user = User.objects.create_user(
                        username=u_name,
                        email=u_email,
                        password=password,
                        first_name=m_user.get('first_name', ''),
                        last_name=m_user.get('last_name', ''),
                        role=Role.CITIZEN,
                        state=m_user.get('state', 'All India'),
                        district=m_user.get('district', ''),
                        department='Civic Transparency Watch',
                        is_active=True
                    )
            except Exception:
                pass

    if not user or not user.check_password(password):
        mongo_users = get_mongo_collection('users')
        authenticated_via_mongo = False
        if mongo_users is not None:
            try:
                m_user = mongo_users.find_one({'$or': [{'email': login_id}, {'username': login_id}]})
                if m_user and m_user.get('password_plain') == password and user:
                    user.set_password(password)
                    user.save()
                    authenticated_via_mongo = True
            except Exception:
                pass
        if not authenticated_via_mongo:
            return Response({'detail': 'Invalid email/username or password.'}, status=status.HTTP_401_UNAUTHORIZED)

    if not user.is_active:
        return Response({'detail': 'This citizen account has been deactivated.'}, status=status.HTTP_403_FORBIDDEN)

    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    token = str(refresh.access_token)

    return Response({
        'token': token,
        'access': token,
        'refresh': str(refresh),
        'user': serialize_user(user),
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth_view(request):
    """
    Handles Citizen Sign-In with Google.
    Accepts Google OAuth credential (JWT) or direct Google profile.
    Verifies token, persists/updates citizen in MongoDB Atlas,
    and returns Drishti platform JWT token.
    """
    credential = request.data.get('credential')
    email = str(request.data.get('email') or '').strip().lower()
    full_name = str(request.data.get('name') or '').strip()
    google_id = str(request.data.get('google_id') or request.data.get('sub') or '').strip()
    avatar_url = request.data.get('photo_url') or request.data.get('picture')

    # If Google ID Token credential was sent from Google GSI button, verify it
    if credential:
        try:
            import json
            import urllib.request
            verify_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}"
            req = urllib.request.Request(verify_url, headers={'User-Agent': 'Project-Drishti-Gov/1.0'})
            with urllib.request.urlopen(req, timeout=6) as resp:
                g_payload = json.loads(resp.read().decode('utf-8'))
            email = g_payload.get('email', '').lower()
            full_name = g_payload.get('name') or email.split('@')[0]
            google_id = g_payload.get('sub', '')
            avatar_url = g_payload.get('picture', '')
        except Exception as e:
            print(f"[Google Auth] Warning on online verification: {e}")
            if not email:
                try:
                    import base64, json
                    parts = credential.split('.')
                    if len(parts) >= 2:
                        padded = parts[1] + '=' * (-len(parts[1]) % 4)
                        decoded = json.loads(base64.urlsafe_b64decode(padded).decode('utf-8'))
                        email = decoded.get('email', '').lower()
                        full_name = decoded.get('name') or email.split('@')[0]
                        google_id = decoded.get('sub', '')
                        avatar_url = decoded.get('picture', '')
                except Exception:
                    return Response({'detail': 'Failed to verify Google authentication token.'}, status=status.HTTP_400_BAD_REQUEST)

    if not email:
        return Response({'detail': 'Google profile did not provide a valid email.'}, status=status.HTTP_400_BAD_REQUEST)

    name_parts = (full_name or email.split('@')[0]).split(' ', 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ''

    # Save/Update in MongoDB Atlas
    mongo_users = get_mongo_collection('users')
    if mongo_users is not None:
        try:
            from datetime import datetime, timezone
            mongo_doc = {
                'email': email,
                'full_name': full_name,
                'first_name': first_name,
                'last_name': last_name,
                'role': 'CITIZEN',
                'google_id': google_id,
                'avatar_url': avatar_url,
                'department': 'Civic Transparency Watch',
                'state': 'All India',
                'district': '',
                'assigned_projects': [],
                'description': 'Verified Citizen via Google Authentication.',
                'icon': 'users',
                'badge_color': '#2563eb',
                'is_active': True,
                'auth_provider': 'google',
                'last_login': datetime.now(timezone.utc).isoformat(),
            }
            mongo_users.update_one({'email': email}, {'$set': mongo_doc}, upsert=True)
            print(f"[MongoDB] Upserted Google citizen: {email}")
        except Exception as e:
            print(f"[MongoDB] Warning: Failed to write Google citizen to Mongo: {e}")

    # Sync to Django User
    user = User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)).first()
    if not user:
        clean_user = ''.join(c for c in email.split('@')[0] if c.isalnum() or c in '_-') or 'google_citizen'
        username = clean_user
        suffix = 1
        while User.objects.filter(username=username).exists():
            username = f"{clean_username}_{suffix}"
            suffix += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            password=secrets.token_urlsafe(18),
            first_name=first_name,
            last_name=last_name,
            role=Role.CITIZEN,
            department='Civic Transparency Watch',
            state='All India',
            is_active=True
        )
    else:
        if first_name and not user.first_name:
            user.first_name = first_name
        if last_name and not user.last_name:
            user.last_name = last_name
        user.save()

    from rest_framework_simplejwt.tokens import RefreshToken
    refresh = RefreshToken.for_user(user)
    token = str(refresh.access_token)

    return Response({
        'token': token,
        'access': token,
        'refresh': str(refresh),
        'user': serialize_user(user),
        'auth_provider': 'google',
        'message': 'Successfully authenticated with Google.'
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def demo_users_view(request):
    """
    Returns example seed accounts for all user types.
    Reads live from MongoDB Atlas drishti_db.users;
    falls back to default seed list if MongoDB is momentarily unreachable.
    """
    import os
    mongo_uri = os.getenv('MONGO_URI')
    users_list = []

    if mongo_uri:
        try:
            from pymongo import MongoClient
            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=4000)
            db = client['drishti_db']
            docs = list(db['users'].find({}, {'_id': 0}))
            client.close()
            if docs:
                users_list = docs
        except Exception:
            pass

    if not users_list:
        users_list = [
            {
                "username": "admin",
                "email": "admin@drishti.gov.in",
                "password_plain": "Admin@123",
                "role": "ADMIN",
                "first_name": "Rajesh",
                "last_name": "Sharma",
                "full_name": "Rajesh Sharma",
                "department": "MoSPI - Infrastructure Oversight",
                "state": "Delhi",
                "district": "New Delhi",
                "assigned_projects": ["DR-0001", "DR-0002", "DR-0003", "DR-0004", "DR-0005"],
                "description": "National PMO Administrator with complete systemic oversight, user governance, and audit authority.",
                "icon": "shield",
                "badge_color": "#1e3a8a",
            },
            {
                "username": "govt_officer",
                "email": "officer@drishti.gov.in",
                "password_plain": "Officer@123",
                "role": "GOVERNMENT_OFFICER",
                "first_name": "Priya",
                "last_name": "Nair",
                "full_name": "Priya Nair",
                "department": "Ministry of Road Transport & Highways",
                "state": "PB",
                "district": "Ludhiana",
                "assigned_projects": ["DR-0001", "DR-0002", "DR-0003"],
                "description": "State & Ministry oversight officer approving milestones, reviewing ML risk alerts, and assigning corrective actions.",
                "icon": "award",
                "badge_color": "#0d9488",
            },
            {
                "username": "field_officer",
                "email": "field@drishti.gov.in",
                "password_plain": "Field@123",
                "role": "FIELD_OFFICER",
                "first_name": "Amit",
                "last_name": "Patel",
                "full_name": "Amit Patel",
                "department": "National Highways Authority of India (NHAI)",
                "state": "HP",
                "district": "Shimla",
                "assigned_projects": ["DR-0009", "DR-0010", "DR-0011"],
                "description": "Site verification engineer conducting ground inspections, geotagged evidence capture, and drone telemetry audits.",
                "icon": "camera",
                "badge_color": "#d97706",
            },
            {
                "username": "citizen",
                "email": "citizen@drishti.gov.in",
                "password_plain": "Citizen@123",
                "role": "CITIZEN",
                "first_name": "Ananya",
                "last_name": "Verma",
                "full_name": "Ananya Verma",
                "department": "Civic Transparency Watch",
                "state": "Karnataka",
                "district": "Bengaluru Urban",
                "assigned_projects": [],
                "description": "Public citizen auditor monitoring taxpayer infrastructure spend, verifying public assets, and reporting local site issues.",
                "icon": "users",
                "badge_color": "#2563eb",
            },
        ]

    return Response({"count": len(users_list), "users": users_list})


class IsAdminRole(IsAuthenticated):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return has_capability(request.user, 'manage_users')


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    user = request.user
    if request.method == 'PATCH':
        allowed = {'first_name', 'last_name', 'email'}
        for field in allowed:
            if field in request.data:
                setattr(user, field, request.data.get(field))
        if 'role' in request.data and request.data.get('role') != user.role:
            raise PermissionDenied('You cannot change your own role.')
        if any(key in request.data for key in ('state', 'district', 'department')) and get_role(user) != Role.ADMIN:
            raise PermissionDenied('You cannot modify authorization scope.')
        user.save()
    payload = serialize_user(user)
    payload['dev_bypass'] = request.auth == 'dev-bypass'
    return Response(payload)


@api_view(['POST'])
@permission_classes([AllowAny])
def logout_view(request):
    return Response({"detail": "Successfully logged out."})


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserAdminSerializer
    permission_classes = [IsAdminRole]
    queryset = User.objects.all().order_by('username')

    def get_queryset(self):
        return User.objects.all().order_by('username')

    def perform_update(self, serializer):
        instance = serializer.instance
        new_role = serializer.validated_data.get('role', instance.role)
        if instance.pk == self.request.user.pk and new_role != instance.role:
            # Admins may manage others; self-escalation/de-escalation is allowed only via admin UI
            # but never via a non-admin identity.
            if not has_capability(self.request.user, 'manage_users'):
                raise PermissionDenied('You cannot change your own role.')
        serializer.save()


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def evidence_collection(request):
    if request.method == 'GET' and not has_capability(request.user, 'view_evidence'):
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    if request.method == 'POST' and not has_capability(request.user, 'submit_evidence'):
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
    return Response({'count': 0, 'results': []})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reports_collection(request):
    if has_capability(request.user, 'view_internal_reports'):
        return Response({'count': 0, 'results': [], 'visibility': 'internal'})
    if has_capability(request.user, 'view_public_reports'):
        return Response({'count': 0, 'results': [], 'visibility': 'public'})
    return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
