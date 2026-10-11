import os
import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    print("Error: MONGO_URI not found in .env file.")
    exit(1)

# Connect to MongoDB Atlas
print("Connecting to MongoDB Atlas...")
client = MongoClient(MONGO_URI)

# Select database and collection
db = client['drishti_db']
collection = db['projects']

# Path to the CSV file
csv_path = r"f:\Projects\Project Drishti\Backend\data\mock\projects.csv"

try:
    # Read the CSV
    print(f"Reading CSV from {csv_path}...")
    df = pd.read_csv(csv_path)
    
    # Clean data: Replace NaN with None so it becomes null in MongoDB
    df = df.where(pd.notnull(df), None)
    
    # Convert dataframe to a list of dictionaries
    records = df.to_dict(orient='records')
    
    if records:
        # Clear existing data optionally
        print("Clearing existing projects in MongoDB...")
        collection.delete_many({})
        
        print(f"Inserting {len(records)} records into MongoDB...")
        collection.insert_many(records)
        print("Successfully imported data into MongoDB!")
    else:
        print("No records found in CSV.")
except Exception as e:
    print(f"An error occurred: {e}")
finally:
    client.close()
