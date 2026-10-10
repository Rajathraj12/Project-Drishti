import os
import json
import joblib
from datetime import datetime
from sklearn.ensemble import IsolationForest

from .data_loader import load_and_clean_data
from .config import IFOREST_CONFIG, NUMERICAL_FEATURES, MODEL_VERSION

def train_and_save():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    csv_path = os.path.join(base_dir, "data", "ml", "project_drishti_clean_ml_training_dataset.csv")
    
    print("Loading data...")
    df = load_and_clean_data(csv_path)
    
    # 4. IMPORTANT: OFFICIAL DATA AS PRIMARY TRAINING POPULATION
    print("Filtering OFFICIAL records for training...")
    train_df = df[df["data_source_type"] == "OFFICIAL"].copy()
    
    if train_df.empty:
        raise ValueError("No OFFICIAL records found for training.")
        
    X_train = train_df[NUMERICAL_FEATURES]
    
    print(f"Training Isolation Forest with {len(X_train)} records...")
    model = IsolationForest(**IFOREST_CONFIG)
    model.fit(X_train)
    
    # Generate training predictions/scores
    scores = model.decision_function(X_train)
    predictions = model.predict(X_train)
    
    anomaly_count = sum(predictions == -1)
    
    print("--- Training Statistics ---")
    print(f"Total Training Records: {len(X_train)}")
    print(f"Anomalies Detected in Training: {anomaly_count}")
    print(f"Anomaly Rate: {anomaly_count / len(X_train) * 100:.2f}%")
    print(f"Score Distribution: min={scores.min():.4f}, max={scores.max():.4f}, median={sorted(scores)[len(scores)//2]:.4f}")
    
    # Save the model
    model_dir = os.path.join(base_dir, "ml", "models")
    os.makedirs(model_dir, exist_ok=True)
    
    model_path = os.path.join(model_dir, "isolation_forest.joblib")
    joblib.dump(model, model_path)
    
    # Save model metadata
    metadata = {
        "model_version": MODEL_VERSION,
        "algorithm": "IsolationForest",
        "training_records": len(X_train),
        "features": NUMERICAL_FEATURES,
        "random_state": IFOREST_CONFIG["random_state"],
        "n_estimators": IFOREST_CONFIG["n_estimators"],
        "contamination": IFOREST_CONFIG["contamination"],
        "training_date": datetime.now().isoformat()
    }
    
    meta_path = os.path.join(model_dir, "metadata.json")
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=4)
        
    print(f"Model saved to {model_path}")
    print(f"Metadata saved to {meta_path}")

    # Synthetic testing
    synth_df = df[df["data_source_type"] == "SYNTHETIC_DEMO"].copy()
    if not synth_df.empty:
        print("\n--- Synthetic Demo Testing ---")
        X_synth = synth_df[NUMERICAL_FEATURES]
        synth_scores = model.decision_function(X_synth)
        synth_preds = model.predict(X_synth)
        
        for i, (_, row) in enumerate(synth_df.iterrows()):
            print(f"[{row['project_id']}] {row['project_name']}")
            # Anomaly score: higher means more anomalous, decision_function is lower means anomalous
            anomaly_score = -synth_scores[i]
            flag = synth_preds[i] == -1
            print(f"   Score: {anomaly_score:.4f} | Anomaly: {flag}")

if __name__ == "__main__":
    train_and_save()
