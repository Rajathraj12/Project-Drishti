import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Ensure Backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

# Load .env
load_dotenv(backend_dir / '.env')

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import Role, ProjectAssignment
from pymongo import MongoClient

User = get_user_model()

# Seed accounts for each role
SEED_USERS = [
    {
        "username": "admin",
        "email": "admin@drishti.gov.in",
        "password": "Admin@123",
        "role": Role.ADMIN,
        "first_name": "Rajesh",
        "last_name": "Sharma",
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
        "password": "Officer@123",
        "role": Role.GOVERNMENT_OFFICER,
        "first_name": "Priya",
        "last_name": "Nair",
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
        "password": "Field@123",
        "role": Role.FIELD_OFFICER,
        "first_name": "Amit",
        "last_name": "Patel",
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
        "password": "Citizen@123",
        "role": Role.CITIZEN,
        "first_name": "Ananya",
        "last_name": "Verma",
        "department": "Civic Transparency Watch",
        "state": "Karnataka",
        "district": "Bengaluru Urban",
        "assigned_projects": [],
        "description": "Public citizen auditor monitoring taxpayer infrastructure spend, verifying public assets, and reporting local site issues.",
        "icon": "users",
        "badge_color": "#2563eb",
    },
]

def seed_mongodb():
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        print("[MongoDB] Warning: MONGO_URI not configured. Skipping Mongo seed.")
        return False

    try:
        print("[MongoDB] Connecting to MongoDB Atlas...")
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=8000)
        db = client['drishti_db']
        collection = db['users']

        # Ensure collection exists and create unique index on email & username
        collection.create_index("email", unique=True)
        collection.create_index("username", unique=True)

        for u in SEED_USERS:
            doc = {
                "username": u["username"],
                "email": u["email"].lower(),
                "password_plain": u["password"],
                "role": u["role"],
                "first_name": u["first_name"],
                "last_name": u["last_name"],
                "full_name": f"{u['first_name']} {u['last_name']}",
                "department": u["department"],
                "state": u["state"],
                "district": u["district"],
                "assigned_projects": u["assigned_projects"],
                "description": u["description"],
                "icon": u["icon"],
                "badge_color": u["badge_color"],
                "is_active": True,
            }
            collection.update_one(
                {"username": u["username"]},
                {"$set": doc},
                upsert=True
            )
            print(f"  [MongoDB] Seeded: {u['username']} ({u['email']}) -> Role: {u['role']}")

        client.close()
        print("[MongoDB] Successfully seeded users collection in MongoDB Atlas!")
        return True
    except Exception as e:
        print(f"[MongoDB] Error seeding MongoDB: {e}")
        return False

def seed_django():
    print("[Django] Seeding Django SQLite database...")
    for u in SEED_USERS:
        # Check if user exists
        user = User.objects.filter(username=u["username"]).first()
        if not user:
            user = User.objects.filter(email=u["email"]).first()

        if not user:
            user = User.objects.create_user(
                username=u["username"],
                email=u["email"].lower(),
                password=u["password"],
                first_name=u["first_name"],
                last_name=u["last_name"],
                role=u["role"],
                department=u["department"],
                state=u["state"],
                district=u["district"],
                is_active=True,
                is_staff=(u["role"] == Role.ADMIN),
                is_superuser=(u["role"] == Role.ADMIN),
            )
            print(f"  [Django] Created: {user.username} ({user.email}) -> Role: {user.role}")
        else:
            user.username = u["username"]
            user.email = u["email"].lower()
            user.first_name = u["first_name"]
            user.last_name = u["last_name"]
            user.role = u["role"]
            user.department = u["department"]
            user.state = u["state"]
            user.district = u["district"]
            user.is_active = True
            user.is_staff = (u["role"] == Role.ADMIN)
            user.is_superuser = (u["role"] == Role.ADMIN)
            user.set_password(u["password"])
            user.save()
            print(f"  [Django] Updated: {user.username} ({user.email}) -> Role: {user.role}")

        # Update Project Assignments
        wanted_projects = set(u.get("assigned_projects") or [])
        user.project_assignments.all().delete()
        for pid in wanted_projects:
            ProjectAssignment.objects.create(user=user, project_id=pid)

    print("[Django] Successfully seeded Django database!")

if __name__ == "__main__":
    print("=" * 60)
    print("PROJECT DRISHTI — ALL ROLES AUTH SEEDING")
    print("=" * 60)
    seed_mongodb()
    seed_django()
    print("=" * 60)
    print("Summary of Seed Accounts:")
    for u in SEED_USERS:
        print(f"  Role: {u['role']:<20} Email: {u['email']:<24} Password: {u['password']}")
    print("=" * 60)

