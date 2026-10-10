import pandas as pd
import os

def load_and_clean_data(csv_path):
    """
    1. Load the CSV
    2. Validate required columns
    3. Convert numeric columns to numeric types
    4. Check for missing values
    5. Check for duplicate project IDs
    6. Return a clean pandas DataFrame
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Dataset not found at {csv_path}")
        
    df = pd.read_csv(csv_path)
    
    required_cols = [
        "project_id", "project_name", "state", "source_project_id", "sector",
        "data_source_type", "source_name", "source_reference", "source_url",
        "original_cost_cr", "revised_cost_cr", "expenditure_cr",
        "reported_progress_pct", "financial_utilization_pct",
        "cost_deviation_pct", "cost_overrun_cr"
    ]
    
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Missing required column: {col}")
            
    numeric_cols = [
        "original_cost_cr", "revised_cost_cr", "expenditure_cr",
        "reported_progress_pct", "financial_utilization_pct",
        "cost_deviation_pct", "cost_overrun_cr"
    ]
    
    for col in numeric_cols:
        df[col] = pd.to_numeric(df[col], errors='coerce')
        if df[col].isnull().any():
            raise ValueError(f"Missing or invalid numeric values in {col}")
            
    if df['project_id'].duplicated().any():
        raise ValueError("Duplicate project_id found in the dataset")
        
    return df
