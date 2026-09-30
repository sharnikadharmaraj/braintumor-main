"""
backend/db.py
Database integration using PyMongo for MongoDB with automatic resilient fallback.
Stores and manages prediction history records cleanly.
"""

import os
import json
import uuid
from datetime import datetime
from pymongo import MongoClient, DESCENDING
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from backend.config import MONGO_URI, MONGO_DB_NAME, MONGO_COLLECTION_NAME

# Local fallback directory
FALLBACK_DIR = os.path.join(os.path.dirname(__file__), "database")
FALLBACK_FILE = os.path.join(FALLBACK_DIR, "history_store.json")
os.makedirs(FALLBACK_DIR, exist_ok=True)

class DatabaseManager:
    def __init__(self):
        self.is_mongo_active = False
        self.client = None
        self.db = None
        self.collection = None
        self._init_mongo()

    def _init_mongo(self):
        try:
            # Set short timeout so connection attempt is swift
            self.client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=1500)
            self.client.admin.command('ping')
            self.db = self.client[MONGO_DB_NAME]
            self.collection = self.db[MONGO_COLLECTION_NAME]
            self.is_mongo_active = True
            print(f"[Database] Successfully connected to live MongoDB at {MONGO_URI} (DB: {MONGO_DB_NAME})")
        except (ConnectionFailure, ServerSelectionTimeoutError, Exception) as e:
            self.is_mongo_active = False
            print(f"[Database] MongoDB service offline or unreachable ({e}). Operating in Local Resilient Fallback Mode.")

    def _read_fallback(self) -> list:
        if not os.path.exists(FALLBACK_FILE):
            return []
        try:
            with open(FALLBACK_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def _write_fallback(self, data: list):
        try:
            with open(FALLBACK_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"[Database] Error writing local store: {e}")

    def save_prediction(self, record: dict) -> dict:
        """
        Saves a prediction record.
        Fields: prediction_id, filename, prediction_class, confidence, model_version, created_at
        """
        if "prediction_id" not in record:
            record["prediction_id"] = f"PRED-{uuid.uuid4().hex[:10].upper()}"

        if "created_at" not in record:
            record["created_at"] = datetime.now().isoformat()

        if self.is_mongo_active:
            try:
                # Insert into MongoDB
                insert_doc = dict(record)
                self.collection.insert_one(insert_doc)
                # Remove MongoDB _id before returning clean record
                insert_doc.pop("_id", None)
                return insert_doc
            except Exception as e:
                print(f"[Database] MongoDB insert failed ({e}), falling back to local file.")
                self.is_mongo_active = False

        # Fallback local store
        records = self._read_fallback()
        records.insert(0, record)
        self._write_fallback(records[:200]) # Keep latest 200 records
        return record

    def get_predictions(self, limit: int = 50) -> list:
        """Retrieves prediction history sorted by newest first."""
        if self.is_mongo_active:
            try:
                docs = list(self.collection.find({}, {"_id": 0}).sort("created_at", DESCENDING).limit(limit))
                return docs
            except Exception as e:
                print(f"[Database] MongoDB query failed ({e}), using local file.")
                self.is_mongo_active = False

        records = self._read_fallback()
        return records[:limit]

    def delete_prediction(self, prediction_id: str) -> bool:
        """Deletes a single prediction record by prediction_id."""
        deleted = False
        if self.is_mongo_active:
            try:
                res = self.collection.delete_one({"prediction_id": prediction_id})
                if res.deleted_count > 0:
                    deleted = True
            except Exception as e:
                print(f"[Database] MongoDB delete failed ({e})")

        # Also remove from local fallback if present
        records = self._read_fallback()
        new_records = [r for r in records if r.get("prediction_id") != prediction_id]
        if len(new_records) < len(records):
            self._write_fallback(new_records)
            deleted = True

        return deleted

    def clear_all(self) -> int:
        """Clears all records."""
        count = 0
        if self.is_mongo_active:
            try:
                res = self.collection.delete_many({})
                count += res.deleted_count
            except Exception as e:
                print(f"[Database] MongoDB clear failed ({e})")

        records = self._read_fallback()
        count += len(records)
        self._write_fallback([])
        return count

    def get_status(self) -> dict:
        return {
            "engine": "MongoDB" if self.is_mongo_active else "Local Fallback Store (PyMongo Ready)",
            "is_mongo_connected": self.is_mongo_active,
            "database_name": MONGO_DB_NAME,
            "collection_name": MONGO_COLLECTION_NAME
        }

# Global database singleton
db = DatabaseManager()
