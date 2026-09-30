"""
backend/config.py
Configuration module supporting environment variables and model selection:
- MODEL_TYPE: 'CNN' or 'TRANSFER_LEARNING'
- Database connection settings for MongoDB
"""

import os
from dotenv import load_dotenv

load_dotenv()

# Model Architecture Configuration
# Supported options: 'CNN' or 'TRANSFER_LEARNING'
MODEL_TYPE = os.getenv("MODEL_TYPE", "CNN").upper()
if MODEL_TYPE not in ["CNN", "TRANSFER_LEARNING"]:
    MODEL_TYPE = "CNN"

# Database Configuration (MongoDB)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "brain_tumor_db")
MONGO_COLLECTION_NAME = os.getenv("MONGO_COLLECTION_NAME", "predictions")

# Application Settings
PORT = int(os.getenv("PORT", 5000))
DEBUG = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")

# Classification Classes
CLASSES = ["glioma", "meningioma", "notumor", "pituitary"]

CLASS_METADATA = {
    "glioma": {
        "title": "Glioma Tumor",
        "category": "Malignant / Infiltrative Neoplasm",
        "description": "Gliomas originate in the supportive glial tissue of the brain. They are typically infiltrative with indistinct borders and associated vasogenic edema.",
        "risk_level": "High - Requires Urgent Neurosurgical Review",
        "is_tumor": True
    },
    "meningioma": {
        "title": "Meningioma Tumor",
        "category": "Extra-Axial Neoplasm",
        "description": "Arises from the arachnoid cap cells of the meninges covering the brain. Usually well-demarcated with characteristic broad dural attachment.",
        "risk_level": "Moderate - Specialist Evaluation Advised",
        "is_tumor": True
    },
    "pituitary": {
        "title": "Pituitary Tumor (Adenoma)",
        "category": "Sellar / Endocrine Mass",
        "description": "Develops in the pituitary gland within the sella turcica. Can compress the optic chiasm causing visual field deficits.",
        "risk_level": "Moderate - Endocrine & Neurosurgical Review",
        "is_tumor": True
    },
    "notumor": {
        "title": "Healthy / No Tumor Detected",
        "category": "Normal Neuroanatomy",
        "description": "Normal cerebral hemispheres, patent ventricular system, and no focal hyperintense or hypointense space-occupying lesions.",
        "risk_level": "Low - Normal Neuroanatomy Observed",
        "is_tumor": False
    }
}
