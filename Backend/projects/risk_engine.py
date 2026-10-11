import datetime
import uuid
from typing import Dict, Any, List

# Configuration for risk rules
CONFIG = {
    "LOW_PROGRESS_THRESHOLD": 30.0,
    "UTILIZATION_MISMATCH_THRESHOLD": 20.0,
    "HIGH_EXPENDITURE_THRESHOLD": 50.0,
    "HIGH_EXPENDITURE_PROGRESS_MAX": 10.0,
    
    # Rule Weights (Max Score: 100)
    "WEIGHT_COST_OVERRUN": 35,
    "WEIGHT_LOW_PROGRESS": 15,
    "WEIGHT_UTILIZATION_MISMATCH": 30,
    "WEIGHT_HIGH_EXPENDITURE": 20,
}

def analyze_project_risk(project: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run rule-based risk assessment for a project.
    """
    rules_triggered = []
    data_warnings = []
    total_score = 0
    
    # Extract data with defaults
    original_cost = project.get('original_cost_cr')
    revised_cost = project.get('revised_cost_cr')
    expenditure = project.get('expenditure_cr')
    reported_progress = project.get('reported_progress_pct')
    
    # 5. Missing or inconsistent monitoring data
    if original_cost is None or original_cost <= 0:
        data_warnings.append({"code": "MISSING_ORIGINAL_COST", "message": "Original cost is missing or zero."})
        return {
            "error": "Valid score cannot be calculated due to missing original cost.",
            "assessment_id": None,
            "project_id": project.get('project_id'),
            "risk_score": None,
            "risk_level": "Unavailable",
            "assessment_timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "rule_engine_version": "1.0",
            "rules_triggered": [],
            "data_warnings": data_warnings
        }
        
    if reported_progress is None:
        data_warnings.append({"code": "MISSING_PROGRESS", "message": "Reported progress percentage is missing."})
        
    # Calculate derived metrics if possible
    financial_utilization = 0
    current_cost = revised_cost if (revised_cost and revised_cost > 0) else original_cost
    if current_cost and current_cost > 0 and expenditure:
        financial_utilization = (expenditure / current_cost) * 100
        
    # 1. Cost overrun
    if original_cost and revised_cost and revised_cost > original_cost:
        overrun = revised_cost - original_cost
        pct_overrun = (overrun / original_cost) * 100
        total_score += CONFIG["WEIGHT_COST_OVERRUN"]
        rules_triggered.append({
            "rule_id": "COST_OVERRUN",
            "title": "Cost Overrun",
            "severity": "High",
            "description": f"Revised cost exceeds original cost by {pct_overrun:.1f}%.",
            "observed_values": {"original": original_cost, "revised": revised_cost},
            "threshold": f"> {original_cost}"
        })
        
    # 2. Low reported progress
    if reported_progress is not None and reported_progress < CONFIG["LOW_PROGRESS_THRESHOLD"]:
        total_score += CONFIG["WEIGHT_LOW_PROGRESS"]
        rules_triggered.append({
            "rule_id": "LOW_PROGRESS",
            "title": "Low Physical Progress",
            "severity": "Medium",
            "description": f"Physical progress ({reported_progress}%) is critically low.",
            "observed_values": {"progress": reported_progress},
            "threshold": f"< {CONFIG['LOW_PROGRESS_THRESHOLD']}%"
        })
        
    # 3. Financial utilization vs physical progress mismatch
    if reported_progress is not None and financial_utilization > 0:
        mismatch = financial_utilization - reported_progress
        if mismatch > CONFIG["UTILIZATION_MISMATCH_THRESHOLD"]:
            total_score += CONFIG["WEIGHT_UTILIZATION_MISMATCH"]
            rules_triggered.append({
                "rule_id": "UTILIZATION_MISMATCH",
                "title": "Utilization-Progress Mismatch",
                "severity": "High",
                "description": f"Financial utilization ({financial_utilization:.1f}%) significantly exceeds physical progress ({reported_progress}%).",
                "observed_values": {"utilization": round(financial_utilization, 2), "progress": reported_progress},
                "threshold": f"Difference > {CONFIG['UTILIZATION_MISMATCH_THRESHOLD']}%"
            })
            
    # 4. High expenditure with low progress
    if reported_progress is not None and financial_utilization > 0:
        if financial_utilization > CONFIG["HIGH_EXPENDITURE_THRESHOLD"] and reported_progress < CONFIG["HIGH_EXPENDITURE_PROGRESS_MAX"]:
            total_score += CONFIG["WEIGHT_HIGH_EXPENDITURE"]
            rules_triggered.append({
                "rule_id": "HIGH_EXPENDITURE_LOW_PROGRESS",
                "title": "High Expenditure, Low Progress",
                "severity": "Critical",
                "description": f"High expenditure ({financial_utilization:.1f}%) but progress is stalled ({reported_progress}%).",
                "observed_values": {"utilization": round(financial_utilization, 2), "progress": reported_progress},
                "threshold": f"Utilization > {CONFIG['HIGH_EXPENDITURE_THRESHOLD']}% & Progress < {CONFIG['HIGH_EXPENDITURE_PROGRESS_MAX']}%"
            })

    # Future ML placeholders -> Separated into Phase 4
    ml_score = None
    anomaly_flag = None

    # Bound score between 0 and 100
    total_score = min(max(int(round(total_score)), 0), 100)
    
    # Classification
    if total_score >= 70:
        risk_level = "High"
    elif total_score >= 40:
        risk_level = "Medium"
    else:
        risk_level = "Low"
        
    if any(r["severity"] == "Critical" for r in rules_triggered):
        risk_level = "Critical"

    return {
        "assessment_id": str(uuid.uuid4()),
        "project_id": project.get('project_id'),
        "risk_score": total_score,
        "risk_level": risk_level,
        "assessment_timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "rule_engine_version": "1.1",
        "rules_triggered": rules_triggered,
        "data_warnings": data_warnings,
        "ml_score": ml_score,
        "anomaly_flag": anomaly_flag,
        "model_version": "iforest_v1",
    }
