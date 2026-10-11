import os, sys, django
sys.path.append('f:/Projects/Project Drishti/Backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from pymongo import MongoClient
from ml.predictor import predict_anomaly, get_model, MODEL_VERSION
from datetime import datetime
import uuid

mongo_uri = os.getenv('MONGO_URI')
client = MongoClient(mongo_uri)
db = client['drishti_db']
projects = list(db['projects'].find())

successful = 0
unavailable = 0
failures = 0

for project_doc in projects:
    pk = project_doc.get('project_id')
    if not pk: continue
    orig = project_doc.get('original_cost_cr')
    if orig is None or orig <= 0:
        assessment = {
            'assessment_id': str(uuid.uuid4()),
            'project_id': pk,
            'ml_anomaly_score': None,
            'anomaly_flag': None,
            'anomaly_status': 'INSUFFICIENT_DATA',
            'model_version': MODEL_VERSION,
            'feature_schema_version': '1.0',
            'assessed_at': datetime.utcnow().isoformat() + 'Z',
            'features_used': [],
            'data_quality_warnings': ['Missing valid original_cost_cr'],
            'explanation': 'Insufficient data to run ML analysis.'
        }
        unavailable += 1
    else:
        try:
            flag, ml_score = predict_anomaly(project_doc)
            explanation = "The observed pattern of cost and progress is highly unusual relative to the model's reference data. This flags the project as anomalous but does not prove misconduct." if flag else "The project's financial and physical progress patterns are consistent with the normal distribution of the reference dataset."
            assessment = {
                'assessment_id': str(uuid.uuid4()),
                'project_id': pk,
                'ml_anomaly_score': round(ml_score, 2),
                'anomaly_flag': bool(flag),
                'anomaly_status': 'ASSESSED',
                'model_version': MODEL_VERSION,
                'feature_schema_version': '1.0',
                'assessed_at': datetime.utcnow().isoformat() + 'Z',
                'features_used': ['original_cost_cr', 'revised_cost_cr', 'expenditure_cr', 'reported_progress_pct'],
                'data_quality_warnings': [],
                'explanation': explanation
            }
            successful += 1
        except Exception as e:
            assessment = {
                'assessment_id': str(uuid.uuid4()),
                'project_id': pk,
                'ml_anomaly_score': None,
                'anomaly_flag': None,
                'anomaly_status': 'ASSESSMENT_FAILED',
                'model_version': MODEL_VERSION,
                'feature_schema_version': '1.0',
                'assessed_at': datetime.utcnow().isoformat() + 'Z',
                'features_used': [],
                'data_quality_warnings': [f'Prediction failed: {str(e)}'],
                'explanation': 'Failed to compute prediction.'
            }
            failures += 1
    
    db['ml_assessments'].update_one({'project_id': pk}, {'$set': assessment}, upsert=True)

print({'total_projects': len(projects), 'successful': successful, 'unavailable': unavailable, 'failures': failures})
