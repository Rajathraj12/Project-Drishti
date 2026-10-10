# Isolation Forest ML Engine

## Dataset
The dataset used for training is `project_drishti_clean_ml_training_dataset.csv`.

## Source / Provenance
The data consists of 69 total projects, containing 59 OFFICIAL records and 10 SYNTHETIC_DEMO records. The official records are primarily based on MoSPI PAIMANA government project data.

## Training Population
Only projects with `data_source_type = OFFICIAL` are used for the primary training population. The synthetic records exist only for controlled testing.

## Features
The following numerical features are used to train the Isolation Forest:
- `original_cost_cr`
- `revised_cost_cr`
- `expenditure_cr`
- `reported_progress_pct`
- `financial_utilization_pct`
- `cost_deviation_pct`
- `cost_overrun_cr`

## Isolation Forest Configuration
```python
IFOREST_CONFIG = {
    "n_estimators": 300,
    "contamination": "auto",
    "random_state": 42,
    "n_jobs": -1
}
```

## Model Version
The current model version is `iforest_v1`.

## Training Command
To train the model, run the following from the `backend` directory:
```bash
python -m ml.train_model
```

## Model Storage
The trained model (`isolation_forest.joblib`) and its metadata (`metadata.json`) are stored in `backend/ml/models/`. The API loads this model on demand (without retraining) during analysis requests.

## Prediction Flow
When the `/api/projects/{id}/analyze` endpoint is called:
1. The project data is loaded.
2. The existing rule engine executes deterministic rules.
3. The Isolation Forest model predicts an anomaly score (`-decision_function`).
4. The signals are combined into a final RiskAssessment and Attention Level.

## Limitations
Isolation Forest identifies unusual project patterns based on numerical features. It does not establish fraud, corruption, or wrongdoing. Human verification is required.
