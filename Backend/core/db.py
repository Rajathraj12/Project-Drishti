import os
from pymongo import MongoClient

_SHARED_CLIENT = None

def get_shared_mongo_client():
    global _SHARED_CLIENT
    mongo_uri = os.getenv('MONGO_URI')
    if not mongo_uri:
        return None
    if _SHARED_CLIENT is None:
        try:
            _SHARED_CLIENT = MongoClient(
                mongo_uri,
                maxPoolSize=50,
                minPoolSize=5,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                socketTimeoutMS=10000,
                retryWrites=True,
            )
        except Exception as e:
            print(f"[MongoDB Pool Init Error]: {e}")
            return None
    return _SHARED_CLIENT

def get_shared_mongo_db(db_name='drishti_db'):
    client = get_shared_mongo_client()
    if client is not None:
        try:
            return client[db_name]
        except Exception:
            return None
    return None

