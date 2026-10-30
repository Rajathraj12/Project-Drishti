"""
Seed script: inserts the 6 mock citizen grievance reports into
MongoDB Atlas → drishti_db.citizen_reports

Run from the Backend directory:
    python seed_citizen_reports.py
"""
import os
from pymongo import MongoClient

MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb+srv://rajathclans12_db_user:DLZg8sm4czlWsybG@drishti.elxloqs.mongodb.net/",
)

SEED_REPORTS = [
    {
        "referenceNo": "RPT-2026-00847",
        "projectId": "DR-0012",
        "projectName": "NH-48 Expressway Expansion Phase 2",
        "issueType": "Work stopped without reason",
        "description": (
            "Construction work has been completely halted for over 3 weeks. "
            "Heavy machinery is lying idle and no workers or supervisors have "
            "been seen at the bypass stretch."
        ),
        "location": "Sector 14, Gurugram, Haryana",
        "photoName": "nh48_idle_site.jpg",
        "state": "Haryana",
        "department": "National Highways (NHAI)",
        "citizenContact": "Guest Citizen (Public Whistleblower)",
        "userId": None,
        "status": "Under Review",
        "priority": "HIGH",
        "submittedAt": "2026-10-18T10:30:00Z",
        "lastUpdated": "2026-10-19T14:20:00Z",
        "assignedOfficer": "Rajesh Sharma",
        "assignedInspector": "Sunita Rao",
        "resolvedNote": None,
    },
    {
        "referenceNo": "RPT-2026-00721",
        "projectId": "DR-0031",
        "projectName": "Rural Drinking Water Supply Scheme - Block B",
        "issueType": "Poor material quality",
        "description": (
            "The pipeline fittings being installed appear severely substandard. "
            "Visible rust and hairline cracks were spotted on newly delivered DI "
            "pipes prior to trench filling."
        ),
        "location": "Village Rampur, District Meerut, UP",
        "photoName": "cracked_pipes_batch4.jpg",
        "state": "Uttar Pradesh",
        "department": "Water Resources & Jal Shakti",
        "citizenContact": "Guest Citizen (Public Whistleblower)",
        "userId": None,
        "status": "Resolved",
        "priority": "CRITICAL",
        "submittedAt": "2026-10-05T08:45:00Z",
        "lastUpdated": "2026-10-15T11:00:00Z",
        "assignedOfficer": "M. K. Deshmukh",
        "assignedInspector": "Sunita Rao",
        "resolvedNote": (
            "Site inspection conducted on Oct 10. Contractor ordered to remove "
            "and replace entire batch of defective pipe fittings. Re-inspection "
            "completed and verified compliant."
        ),
    },
    {
        "referenceNo": "RPT-2026-00689",
        "projectId": "DR-0055",
        "projectName": "Primary School Building Reconstruction",
        "issueType": "Safety hazards at site",
        "description": (
            "Deep foundation trenches right next to the operating classroom wing "
            "without any barricades or caution tape. School children play within "
            "feet of the open excavation."
        ),
        "location": "Shastri Nagar, Jaipur, Rajasthan",
        "photoName": None,
        "state": "Rajasthan",
        "department": "Public Works Department (PWD)",
        "citizenContact": "Guest Citizen (Public Whistleblower)",
        "userId": None,
        "status": "Closed",
        "priority": "HIGH",
        "submittedAt": "2026-09-28T16:10:00Z",
        "lastUpdated": "2026-10-02T09:30:00Z",
        "assignedOfficer": "Pooja Sundaram",
        "assignedInspector": None,
        "resolvedNote": (
            "Reinforced safety barricading and security perimeter erected within "
            "48 hours. Contractor issued formal warning notice for safety "
            "non-compliance."
        ),
    },
    {
        "referenceNo": "RPT-2026-00912",
        "projectId": "DR-0008",
        "projectName": "District Hospital Trauma Care Centre",
        "issueType": "Progress slower than expected",
        "description": (
            "The concrete roof casting was supposed to be completed two months "
            "ago according to the public signboard. Work is moving at a snail's "
            "pace with only 4-5 laborers on site."
        ),
        "location": "Civil Lines, Kanpur, Uttar Pradesh",
        "photoName": "trauma_center_slow_progress.jpg",
        "state": "Uttar Pradesh",
        "department": "Public Works Department (PWD)",
        "citizenContact": "Guest Citizen (Public Whistleblower)",
        "userId": None,
        "status": "Submitted",
        "priority": "MEDIUM",
        "submittedAt": "2026-10-19T11:15:00Z",
        "lastUpdated": "2026-10-19T11:15:00Z",
        "assignedOfficer": None,
        "assignedInspector": None,
        "resolvedNote": None,
    },
    {
        "referenceNo": "RPT-2026-00924",
        "projectId": "DR-0019",
        "projectName": "Rural Connectivity Bridge over Hindon Canal",
        "issueType": "Suspected irregularities",
        "description": (
            "The bridge approach road was asphalted last week during heavy rain. "
            "The asphalt layer is already crumbling and peeling away under light "
            "tractor traffic."
        ),
        "location": "Muradnagar, Ghaziabad, UP",
        "photoName": "eroded_asphalt_approach.jpg",
        "state": "Uttar Pradesh",
        "department": "Rural Development",
        "citizenContact": "Guest Citizen (Public Whistleblower)",
        "userId": None,
        "status": "Submitted",
        "priority": "HIGH",
        "submittedAt": "2026-10-20T14:40:00Z",
        "lastUpdated": "2026-10-20T14:40:00Z",
        "assignedOfficer": None,
        "assignedInspector": None,
        "resolvedNote": None,
    },
    {
        "referenceNo": "RPT-2026-00802",
        "projectId": "DR-0042",
        "projectName": "Urban Flyover & Grade Separator",
        "issueType": "Contractor absent from site",
        "description": (
            "Contractor site office locked and abandoned for 2 weeks. Open "
            "construction material occupying active traffic lanes causing severe "
            "daily jams."
        ),
        "location": "Ring Road Jn, Bhopal, MP",
        "photoName": None,
        "state": "Madhya Pradesh",
        "department": "Urban Development & PWD",
        "citizenContact": "Guest Citizen (Public Whistleblower)",
        "userId": None,
        "status": "Verified",
        "priority": "CRITICAL",
        "submittedAt": "2026-10-12T09:20:00Z",
        "lastUpdated": "2026-10-16T16:00:00Z",
        "assignedOfficer": "Rajesh Sharma",
        "assignedInspector": "K. Narayanaswamy",
        "resolvedNote": (
            "Field Inspector verified site abandonment. Notice to cure issued "
            "to contractor with 7-day cure period."
        ),
    },
]


def seed():
    print(f"Connecting to MongoDB Atlas...")
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000)

    db = client["drishti_db"]
    col = db["citizen_reports"]

    inserted = 0
    skipped = 0

    for report in SEED_REPORTS:
        ref = report["referenceNo"]
        if col.find_one({"referenceNo": ref}):
            print(f"  SKIP  {ref} (already exists)")
            skipped += 1
        else:
            col.insert_one(report)
            print(f"  INSERT {ref} — {report['projectName']}")
            inserted += 1

    print(f"\nDone. Inserted: {inserted}  Skipped (duplicates): {skipped}")
    print(f"Total documents in citizen_reports: {col.count_documents({})}")
    client.close()


if __name__ == "__main__":
    seed()

