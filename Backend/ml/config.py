MODEL_VERSION = "iforest_v1"

# Isolation Forest Configuration
IFOREST_CONFIG = {
    "n_estimators": 300,
    "contamination": "auto",
    "random_state": 42,
    "n_jobs": -1
}

NUMERICAL_FEATURES = [
    "original_cost_cr",
    "revised_cost_cr",
    "expenditure_cr",
    "reported_progress_pct",
    "financial_utilization_pct",
    "cost_deviation_pct",
    "cost_overrun_cr"
]
