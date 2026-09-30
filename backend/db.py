# pylint: disable=import-error,broad-except,broad-exception-caught
"""
backend/db.py
Database integration using PyMongo for MongoDB with automatic resilient fallback.
Stores and manages prediction history records cleanly.
"""

import os
import sys
import json
import uuid
from datetime import datetime
from pymongo import MongoClient, DESCENDING
from pymongo.errors import PyMongoError, ConnectionFailure, ServerSelectionTimeoutError

# Ensure parent directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from backend.config import MONGO_URI, MONGO_DB_NAME, MONGO_COLLECTION_NAME
except ImportError:
    from config import MONGO_URI, MONGO_DB_NAME, MONGO_COLLECTION_NAME

# Local fallback directory
FALLBACK_DIR = os.path.join(os.path.dirname(__file__), "database")
FALLBACK_FILE = os.path.join(FALLBACK_DIR, "history_store.json")
os.makedirs(FALLBACK_DIR, exist_ok=True)


class DatabaseManager:
    """Manages prediction records with live MongoDB and resilient local JSON store."""

    def __init__(self):
        self.is_mongo_active = False
        self.client = None
        self.db = None
        self.collection = None
        self._init_mongo()

    def _init_mongo(self):
        """Initializes connection to MongoDB with timeout."""
        try:
            self.client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=1500)
            self.client.admin.command('ping')
            self.db = self.client[MONGO_DB_NAME]
            self.collection = self.db[MONGO_COLLECTION_NAME]
            self.is_mongo_active = True
            print(
                f"[Database] Connected to live MongoDB at {MONGO_URI} (DB: {MONGO_DB_NAME})"
            )
        except (ConnectionFailure, ServerSelectionTimeoutError, PyMongoError) as err:
            self.is_mongo_active = False
            print(
                f"[Database] MongoDB offline ({err}). Operating in Local Resilient Fallback Mode."
            )

    def _read_fallback(self) -> list:
        """Reads stored predictions from local JSON file."""
        if not os.path.exists(FALLBACK_FILE):
            return []
        try:
            with open(FALLBACK_FILE, "r", encoding="utf-8") as file:
                return json.load(file)
        except (IOError, OSError, json.JSONDecodeError):
            return []

    def _write_fallback(self, data: list):
        """Writes prediction list to local JSON fallback store."""
        try:
            with open(FALLBACK_FILE, "w", encoding="utf-8") as file:
                json.dump(data, file, indent=2)
        except (IOError, OSError) as err:
            print(f"[Database] Error writing local store: {err}")

    def save_prediction(self, record: dict) -> dict:
        """
        Saves a prediction record.
        Fields: prediction_id, filename, prediction_class, confidence, created_at
        """
        if "prediction_id" not in record:
            record["prediction_id"] = f"PRED-{uuid.uuid4().hex[:10].upper()}"

        if "created_at" not in record:
            record["created_at"] = datetime.now().isoformat()

        if self.is_mongo_active:
            try:
                insert_doc = dict(record)
                self.collection.insert_one(insert_doc)
                insert_doc.pop("_id", None)
                return insert_doc
            except PyMongoError as err:
                print(f"[Database] MongoDB insert failed ({err}), falling back to local file.")
                self.is_mongo_active = False

        records = self._read_fallback()
        records.insert(0, record)
        self._write_fallback(records[:200])  # Keep latest 200 records
        return record

    def get_predictions(self, limit: int = 50) -> list:
        """Retrieves prediction history sorted by newest first."""
        if self.is_mongo_active:
            try:
                cursor = self.collection.find({}, {"_id": 0})
                docs = list(cursor.sort("created_at", DESCENDING).limit(limit))
                return docs
            except PyMongoError as err:
                print(f"[Database] MongoDB query failed ({err}), using local file.")
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
            except PyMongoError as err:
                print(f"[Database] MongoDB delete failed ({err})")

        records = self._read_fallback()
        new_records = [r for r in records if r.get("prediction_id") != prediction_id]
        if len(new_records) < len(records):
            self._write_fallback(new_records)
            deleted = True

        return deleted

    def clear_all(self) -> int:
        """Clears all records from MongoDB and local fallback."""
        count = 0
        if self.is_mongo_active:
            try:
                res = self.collection.delete_many({})
                count += res.deleted_count
            except PyMongoError as err:
                print(f"[Database] MongoDB clear failed ({err})")

        records = self._read_fallback()
        count += len(records)
        self._write_fallback([])
        return count

    def get_status(self) -> dict:
        """Returns database connectivity and engine status."""
        return {
            "engine": "MongoDB" if self.is_mongo_active else "Local Fallback Store (PyMongo Ready)",
            "is_mongo_connected": self.is_mongo_active,
            "database_name": MONGO_DB_NAME,
            "collection_name": MONGO_COLLECTION_NAME
        }


# Global database singleton
db = DatabaseManager()
