"""
app.py
FastAPI Web Application Backend for Brain Tumor Prediction Using Deep Learning.
Provides REST endpoints for inference, sample browsing, explainable Grad-CAM,
and clinical PDF report generation.
"""

import os
import uuid
from typing import Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Response
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from PIL import Image
import io

from model import BrainTumorClassifier, CLASS_METADATA, CLASSES
from utils import numpy_to_base64, validate_image_file, generate_pdf_report

app = FastAPI(
    title="Brain Tumor Prediction API",
    description="Academic Deep Learning & Grad-CAM system for Brain MRI diagnosis",
    version="1.0.0"
)

# Enable CORS for flexible integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure required directories exist
os.makedirs("static/samples", exist_ok=True)
os.makedirs("static/css", exist_ok=True)
os.makedirs("static/js", exist_ok=True)

# Mount static folder
app.mount("/static", StaticFiles(directory="static"), name="static")

# Initialize classifier
classifier = None

def get_classifier():
    global classifier
    if classifier is None:
        classifier = BrainTumorClassifier(model_path="brain_tumor_model.pth")
    return classifier

# In-memory cache for recent scans to generate PDF reports
scan_cache = {}

class SamplePredictRequest(BaseModel):
    sample_id: str
    patient_name: Optional[str] = "Anonymous Patient"
    patient_age: Optional[str] = "38"
    patient_gender: Optional[str] = "Unspecified"
    clinical_notes: Optional[str] = "Academic diagnostic screening"

class PDFExportRequest(BaseModel):
    scan_id: str
    patient_name: Optional[str] = "Test Patient"
    patient_age: Optional[str] = "N/A"
    patient_gender: Optional[str] = "N/A"
    clinical_notes: Optional[str] = "Brain MRI axial study"

@app.on_event("startup")
async def startup_event():
    # Warm up classifier
    get_classifier()

@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_path = os.path.join("static", "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse("<h1>Brain Tumor Prediction API is running. static/index.html not found yet.</h1>")

@app.get("/api/health")
async def health_check():
    clf = get_classifier()
    return {
        "status": "online",
        "device": str(clf.device),
        "classes": CLASSES,
        "class_count": len(CLASSES),
        "model_architecture": "ResNet-18 Transfer Learning CNN",
        "explainable_ai": "Grad-CAM (Gradient-weighted Class Activation Mapping)"
    }

@app.get("/api/samples")
async def get_sample_scans():
    """Returns the list of available curated MRI sample scans."""
    sample_dir = "static/samples"
    samples = []
    
    metadata_map = {
        "glioma_sample.jpg": {
            "title": "Glioma MRI Scan (Axial)",
            "type": "Glioma",
            "notes": "Hyperintense infiltrative lesion with vasogenic edema in right cerebral hemisphere."
        },
        "glioma_sample_2.jpg": {
            "title": "Glioma MRI Scan (Variant 2)",
            "type": "Glioma",
            "notes": "Large intra-axial frontal lobe lesion."
        },
        "meningioma_sample.jpg": {
            "title": "Meningioma MRI Scan (Axial)",
            "type": "Meningioma",
            "notes": "Dural-based extra-axial homogeneous enhancing mass on left convexity."
        },
        "pituitary_sample.jpg": {
            "title": "Pituitary Adenoma MRI Scan",
            "type": "Pituitary",
            "notes": "Sellar mass expanding into the suprasellar space."
        },
        "notumor_sample.jpg": {
            "title": "Healthy Brain MRI Scan (Normal)",
            "type": "No Tumor",
            "notes": "Symmetric cerebral parenchyma, patent ventricles, no intracranial mass."
        },
        "notumor_sample_2.jpg": {
            "title": "Healthy Brain MRI Scan (Variant 2)",
            "type": "No Tumor",
            "notes": "Normal axial slice showing intact midline and cortex."
        }
    }

    if os.path.exists(sample_dir):
        for fname in sorted(os.listdir(sample_dir)):
            if fname.lower().endswith((".jpg", ".jpeg", ".png")):
                info = metadata_map.get(fname, {
                    "title": fname.replace("_", " ").replace(".jpg", "").title(),
                    "type": "Sample Scan",
                    "notes": "Neuroimaging axial scan"
                })
                samples.append({
                    "id": fname,
                    "filename": fname,
                    "title": info["title"],
                    "tumor_type": info["type"],
                    "notes": info["notes"],
                    "url": f"/static/samples/{fname}"
                })
    return {"samples": samples}

@app.post("/api/predict")
async def predict_mri(
    file: Optional[UploadFile] = File(None),
    sample_id: Optional[str] = Form(None)
):
    """
    Main prediction endpoint. Accepts either an uploaded image or a sample_id.
    Performs preprocessing, ResNet inference, and Grad-CAM visualization.
    """
    clf = get_classifier()

    if file is not None:
        contents = await file.read()
        is_valid, err_msg = validate_image_file(contents)
        if not is_valid:
            raise HTTPException(status_code=400, detail=err_msg)
        
        try:
            image_stream = io.BytesIO(contents)
            result = clf.predict(image_stream)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Image inference error: {str(e)}")
            
    elif sample_id:
        sample_path = os.path.join("static", "samples", os.path.basename(sample_id))
        if not os.path.exists(sample_path):
            raise HTTPException(status_code=404, detail="Sample image not found.")
        try:
            result = clf.predict(sample_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Sample inference error: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Either an uploaded image file or sample_id must be provided.")

    scan_id = f"SCAN-{uuid.uuid4().hex[:8].upper()}"

    # Cache scan data in memory for instant PDF export
    scan_cache[scan_id] = {
        "original_np": result["original_image"],
        "overlay_np": result["overlay_image"],
        "raw_cam_np": result["raw_cam_image"],
        "prediction_data": {
            "predicted_class": result["predicted_class"],
            "display_name": result["display_name"],
            "category": result["category"],
            "confidence": result["confidence"],
            "is_tumor": result["is_tumor"],
            "risk_level": result["risk_level"],
            "description": result["description"],
            "anatomical_site": result["anatomical_site"],
            "clinical_relevance": result["clinical_relevance"],
            "probabilities": result["probabilities"]
        }
    }

    # Limit cache to 50 scans
    if len(scan_cache) > 50:
        oldest_key = next(iter(scan_cache))
        del scan_cache[oldest_key]

    return {
        "scan_id": scan_id,
        "predicted_class": result["predicted_class"],
        "display_name": result["display_name"],
        "category": result["category"],
        "confidence": result["confidence"],
        "is_tumor": result["is_tumor"],
        "risk_level": result["risk_level"],
        "description": result["description"],
        "anatomical_site": result["anatomical_site"],
        "clinical_relevance": result["clinical_relevance"],
        "probabilities": result["probabilities"],
        "image_dims": result["image_dims"],
        "original_image": numpy_to_base64(result["original_image"]),
        "gradcam_overlay": numpy_to_base64(result["overlay_image"]),
        "raw_heatmap": numpy_to_base64(result["raw_cam_image"])
    }

@app.post("/api/export-pdf")
async def export_pdf(request: PDFExportRequest):
    """Generates an academic diagnostic report PDF using ReportLab."""
    cached = scan_cache.get(request.scan_id)
    if not cached:
        raise HTTPException(
            status_code=404,
            detail="Scan session expired or not found. Please re-run the scan and try again."
        )

    try:
        pdf_bytes = generate_pdf_report(
            scan_id=request.scan_id,
            original_img_np=cached["original_np"],
            gradcam_img_np=cached["overlay_np"],
            prediction_data=cached["prediction_data"],
            patient_name=request.patient_name or "Anonymous Patient",
            patient_age=request.patient_age or "N/A",
            patient_gender=request.patient_gender or "N/A",
            clinical_notes=request.clinical_notes or "Axial brain MRI diagnostic study"
        )

        filename = f"neuroscan_{request.scan_id}.pdf"
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

@app.get("/api/classes-info")
async def get_classes_info():
    """Provides detailed reference data for student viva & academic presentation."""
    return {
        "classes": CLASS_METADATA,
        "project_metadata": {
            "title": "Brain Tumor Prediction Using Deep Learning",
            "course": "Bachelor of Computer Applications (BCA)",
            "technologies": [
                "PyTorch 2.x", "Convolutional Neural Networks (ResNet-18)",
                "Grad-CAM (Explainable AI)", "FastAPI", "OpenCV", "ReportLab"
            ],
            "dataset_origin": "Standard Brain Tumor MRI Dataset (Glioma, Meningioma, Pituitary, Normal)",
            "disclaimer": "Academic research prototype. Non-clinical decision support system."
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
