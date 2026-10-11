import os
import joblib
import pandas as pd
import numpy as np

from ml.config import MODEL_VERSION

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
model_path = os.path.join(base_dir, "ml", "models", "isolation_forest.joblib")

_model = None

def get_model():
    global _model
    if _model is None:
        if os.path.exists(model_path):
            _model = joblib.load(model_path)
    return _model

def predict_anomaly(project_doc):
    """
    Returns (anomaly_flag, anomaly_score_0_to_100)
    """
    model = get_model()
    if not model:
        return False, 0.0
        
    orig = project_doc.get("original_cost_cr", 0) or 0
    revised = project_doc.get("revised_cost_cr", orig) or orig
    exp = project_doc.get("expenditure_cr", 0) or 0
    prog = project_doc.get("reported_progress_pct", 0) or 0
    
    current_cost = revised if revised > 0 else orig
    utilization = (exp / current_cost * 100) if current_cost > 0 else 0
    cost_dev = ((revised - orig) / orig * 100) if orig > 0 else 0
    cost_overrun = revised - orig if revised > orig else 0
    
    features = {
        "original_cost_cr": [orig],
        "revised_cost_cr": [revised],
        "expenditure_cr": [exp],
        "reported_progress_pct": [prog],
        "financial_utilization_pct": [utilization],
        "cost_deviation_pct": [cost_dev],
        "cost_overrun_cr": [cost_overrun]
    }
    
    df = pd.DataFrame(features)
    score = model.decision_function(df)[0]
    pred = model.predict(df)[0]
    
    # decision_function gives lower values for anomalies (often negative)
    # let's normalize it to a 0-100 risk score where higher is more anomalous.
    # Typically scores range from -0.3 to +0.3. 
    # We can use min-max scaling loosely.
    # Score goes from e.g. 0.2 (normal) to -0.3 (anomaly).
    # Risk = 50 - score * 100? Let's just do:
    normalized_risk = max(0, min(100, 50 - (score * 200)))
    
    flag = bool(pred == -1)
    
    return flag, normalized_risk
