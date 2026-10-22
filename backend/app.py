# pylint: skip-file
# type: ignore
"""
backend/app.py
Flask REST API Backend for Brain Tumor Prediction Using Deep Learning.
Technologies: Python, Flask, Flask-CORS, TensorFlow/Keras, PyMongo, OpenCV.
"""

import os
import json
import base64
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

from backend.config import (
    MODEL_TYPE, CLASSES, CLASS_METADATA, PORT, DEBUG,
    MONGO_DB_NAME, MONGO_COLLECTION_NAME
)
from backend.preprocess import validate_image_file, preprocess_image, TARGET_SIZE
from backend.model import detector, CNN_MODEL_PATH, TRANSFER_MODEL_PATH
from backend.db import db

app = Flask(
    __name__,
    static_folder=os.path.join(os.path.dirname(__file__), "static"),
    static_url_path="/static"
)

# Enable CORS for all routes (allows React frontend on port 5173 / localhost)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# Ensure static directories exist
SAMPLES_DIR = os.path.join(app.static_folder, "samples")
EVAL_DIR = os.path.join(app.static_folder, "eval")
os.makedirs(SAMPLES_DIR, exist_ok=True)
os.makedirs(EVAL_DIR, exist_ok=True)

METRICS_FILE = os.path.join(os.path.dirname(__file__), "evaluation_metrics.json")

# Ensure samples exist in backend/static/samples
ROOT_SAMPLES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "samples")
if os.path.exists(ROOT_SAMPLES_DIR):
    import shutil
    for fname in os.listdir(ROOT_SAMPLES_DIR):
        src = os.path.join(ROOT_SAMPLES_DIR, fname)
        dst = os.path.join(SAMPLES_DIR, fname)
        if os.path.isfile(src) and not os.path.exists(dst):
            shutil.copy2(src, dst)

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "online",
        "timestamp": datetime.now().isoformat(),
        "model_type": detector.model_type,
        "classes": CLASSES,
        "database": db.get_status()
    })

@app.route("/api/config", methods=["GET"])
def get_config():
    return jsonify({
        "active_model": detector.model_type,
        "supported_models": [
            {
                "id": "CNN",
                "name": "Custom Convolutional Neural Network (Primary)",
                "description": "4-block Deep CNN with BatchNormalization & Dropout",
                "weights_available": os.path.exists(CNN_MODEL_PATH)
            },
            {
                "id": "TRANSFER_LEARNING",
                "name": "Transfer Learning (MobileNetV2)",
                "description": "ImageNet Pretrained Backbone with Custom Dense Classifier",
                "weights_available": os.path.exists(TRANSFER_MODEL_PATH)
            }
        ],
        "database_status": db.get_status()
    })

@app.route("/api/config/switch-model", methods=["POST"])
def switch_model():
    data = request.get_json() or {}
    new_type = data.get("model_type")
    if not new_type or new_type.upper() not in ["CNN", "TRANSFER_LEARNING"]:
        return jsonify({"error": "Invalid model type. Choose 'CNN' or 'TRANSFER_LEARNING'"}), 400

    try:
        detector.switch_model_type(new_type)
        return jsonify({
            "message": f"Successfully activated {detector.model_type} architecture",
            "active_model": detector.model_type
        })
    except Exception as e:
        return jsonify({"error": f"Failed switching model: {str(e)}"}), 500

@app.route("/api/samples", methods=["GET"])
def get_samples():
    sample_files = []
    if os.path.exists(SAMPLES_DIR):
        for fname in sorted(os.listdir(SAMPLES_DIR)):
            if fname.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                tumor_type = "No Tumor" if "notumor" in fname else fname.split("_")[0].capitalize()
                sample_files.append({
                    "id": fname,
                    "filename": fname,
                    "tumor_type": tumor_type,
                    "url": f"/static/samples/{fname}"
                })
    return jsonify({"samples": sample_files})

@app.route("/api/predict", methods=["POST"])
def predict():
    """
    Main prediction endpoint.
    1. Validates uploaded MRI file or sample_id
    2. Runs model-compatible preprocessing (identical to training)
    3. Runs model inference (CNN or Transfer Learning)
    4. Saves record to MongoDB
    5. Returns prediction result
    """
    file = request.files.get("file")
    sample_id = request.form.get("sample_id")

    image_bytes = None
    filename = "unknown_scan.jpg"

    if file and file.filename != "":
        filename = secure_filename(file.filename)
        image_bytes = file.read()
        is_valid, err_msg = validate_image_file(image_bytes, filename)
        if not is_valid:
            return jsonify({"error": err_msg}), 400

    elif sample_id:
        sample_path = os.path.join(SAMPLES_DIR, os.path.basename(sample_id))
        if not os.path.exists(sample_path):
            return jsonify({"error": f"Sample image '{sample_id}' not found."}), 404
        filename = os.path.basename(sample_id)
        with open(sample_path, "rb") as f:
            image_bytes = f.read()
    else:
        return jsonify({"error": "No file uploaded and no sample_id specified."}), 400

    try:
        # Preprocess and predict
        result = detector.predict(image_bytes)

        # Generate base64 thumbnail for history preview
        thumbnail_b64 = f"data:image/jpeg;base64,{base64.b64encode(image_bytes).decode('utf-8')}"

        # Patient and Clinician/User Specifications
        patient_meta = {
            "patient_id": request.form.get("patient_id", "PID-40291"),
            "patient_name": request.form.get("patient_name", "Anonymous Patient"),
            "patient_age": request.form.get("patient_age", "45"),
            "patient_gender": request.form.get("patient_gender", "Female"),
            "patient_blood_group": request.form.get("patient_blood_group", "O+"),
            "referring_physician": request.form.get("referring_physician", "Dr. Robert Hayes, MD"),
            "clinical_notes": request.form.get("clinical_notes", "Axial MRI Study")
        }
        user_meta = {
            "user_id": request.form.get("user_id", "USR-8421"),
            "user_name": request.form.get("user_name", "Dr. Sarah Mitchell, MD"),
            "user_role": request.form.get("user_role", "Neuro-Oncology Radiologist"),
            "user_department": request.form.get("user_department", "Radiodiagnosis & Neuro-Oncology")
        }

        # Save record in MongoDB / PyMongo
        history_record = {
            "filename": filename,
            "prediction_class": result["prediction_class"],
            "display_name": result["display_name"],
            "confidence": result["confidence"],
            "is_tumor": result["is_tumor"],
            "risk_level": result["risk_level"],
            "model_version": result["model_version"],
            "model_type": result["model_type"],
            "image_preview": thumbnail_b64,
            "patient_details": patient_meta,
            "user_details": user_meta
        }
        saved_record = db.save_prediction(history_record)

        response_payload = {
            **result,
            "prediction_id": saved_record.get("prediction_id"),
            "created_at": saved_record.get("created_at"),
            "filename": filename,
            "image_preview": thumbnail_b64,
            "patient_details": patient_meta,
            "user_details": user_meta
        }
        return jsonify(response_payload)

    except Exception as e:
        return jsonify({"error": f"Inference execution error: {str(e)}"}), 500

@app.route("/api/history", methods=["GET"])
def get_history():
    limit = request.args.get("limit", default=50, type=int)
    records = db.get_predictions(limit=limit)
    return jsonify({
        "total_records": len(records),
        "history": records
    })

@app.route("/api/history/<prediction_id>", methods=["DELETE"])
def delete_history_record(prediction_id):
    success = db.delete_prediction(prediction_id)
    if success:
        return jsonify({"message": f"Record {prediction_id} deleted successfully."})
    return jsonify({"error": f"Record {prediction_id} not found."}), 404

@app.route("/api/history", methods=["DELETE"])
def clear_history():
    count = db.clear_all()
    return jsonify({"message": f"Successfully deleted {count} records."})

@app.route("/api/metrics", methods=["GET"])
def get_metrics():
    """Returns actual real model evaluation metrics and plot paths."""
    if os.path.exists(METRICS_FILE):
        try:
            with open(METRICS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            return jsonify(data)
        except Exception as e:
            return jsonify({"error": f"Failed reading metrics: {str(e)}"}), 500
    return jsonify({"message": "Metrics not yet generated. Please execute backend/train.py"}), 404

if __name__ == "__main__":
    print(f"Starting Flask API Server on http://127.0.0.1:{PORT}")
    app.run(host="127.0.0.1", port=PORT, debug=DEBUG)
