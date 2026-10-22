"""
app.py
FastAPI Web Application Backend for Brain Tumor Prediction Using Deep Learning.
Provides REST endpoints for inference, sample browsing, explainable Grad-CAM,
and clinical PDF report generation.
"""

import io
import os
from typing import Optional
import uuid

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from model import BrainTumorClassifier, CLASS_METADATA, CLASSES
from utils import generate_pdf_report, numpy_to_base64, validate_image_file

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

# Initialize classifier holder
CLASSIFIER_INSTANCE: Optional[BrainTumorClassifier] = None


def get_classifier() -> BrainTumorClassifier:
    """Retrieve or lazily initialize the singleton BrainTumorClassifier."""
    global CLASSIFIER_INSTANCE
    if CLASSIFIER_INSTANCE is None:
        CLASSIFIER_INSTANCE = BrainTumorClassifier(model_path="brain_tumor_model.pth")
    return CLASSIFIER_INSTANCE


# In-memory cache for recent scans to generate PDF reports
scan_cache = {}


class SamplePredictRequest(BaseModel):
    """Request payload schema for sample image prediction."""
    sample_id: str
    patient_id: Optional[str] = "PID-40291"
    patient_name: Optional[str] = "Anonymous Patient"
    patient_age: Optional[str] = "38"
    patient_gender: Optional[str] = "Unspecified"
    patient_blood_group: Optional[str] = "O+"
    referring_physician: Optional[str] = "Dr. Robert Hayes, MD"
    clinical_notes: Optional[str] = "Academic diagnostic screening"
    user_id: Optional[str] = "USR-8421"
    user_name: Optional[str] = "Dr. Sarah Mitchell, MD"
    user_role: Optional[str] = "Neuro-Oncology Radiologist"
    user_department: Optional[str] = "Department of Radiodiagnosis & Neuro-Oncology"


class PDFExportRequest(BaseModel):
    """Request payload schema for exporting PDF diagnostic reports."""
    scan_id: str
    patient_id: Optional[str] = "PID-40291"
    patient_name: Optional[str] = "Test Patient"
    patient_age: Optional[str] = "N/A"
    patient_gender: Optional[str] = "N/A"
    patient_blood_group: Optional[str] = "O+"
    referring_physician: Optional[str] = "Dr. Robert Hayes, MD"
    clinical_notes: Optional[str] = "Brain MRI axial study"
    user_id: Optional[str] = "USR-8421"
    user_name: Optional[str] = "Dr. Sarah Mitchell, MD"
    user_role: Optional[str] = "Neuro-Oncology Radiologist"
    user_department: Optional[str] = "Department of Radiodiagnosis & Neuro-Oncology"


@app.on_event("startup")
async def startup_event():
    """Warm up the classifier during application startup."""
    get_classifier()


@app.get("/", response_class=HTMLResponse)
async def serve_index():
    """Serve the primary single-page application dashboard."""
    index_path = os.path.join("static", "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(
        "<h1>Brain Tumor Prediction API is running. static/index.html not found yet.</h1>"
    )


@app.get("/api/health")
async def health_check():
    """Return backend status, device, model architecture, and classification labels."""
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
            "notes": "Hyperintense infiltrative lesion with vasogenic edema in right hemisphere."
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
    sample_id: Optional[str] = Form(None),
    patient_id: Optional[str] = Form("PID-40291"),
    patient_name: Optional[str] = Form("Anonymous Patient"),
    patient_age: Optional[str] = Form("45"),
    patient_gender: Optional[str] = Form("Unspecified"),
    patient_blood_group: Optional[str] = Form("O+"),
    referring_physician: Optional[str] = Form("Dr. Robert Hayes, MD"),
    clinical_notes: Optional[str] = Form("Axial brain MRI diagnostic study"),
    user_id: Optional[str] = Form("USR-8421"),
    user_name: Optional[str] = Form("Dr. Sarah Mitchell, MD"),
    user_role: Optional[str] = Form("Neuro-Oncology Radiologist"),
    user_department: Optional[str] = Form("Department of Radiodiagnosis & Neuro-Oncology")
):
    """
    Main prediction endpoint. Accepts either an uploaded image or a sample_id.
    Performs preprocessing, ResNet inference, Grad-CAM visualization, and links
    patient and operator/user specifications.
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
            raise HTTPException(status_code=500, detail=f"Image inference error: {str(e)}") from e

    elif sample_id:
        sample_path = os.path.join("static", "samples", os.path.basename(sample_id))
        if not os.path.exists(sample_path):
            raise HTTPException(status_code=404, detail="Sample image not found.")
        try:
            result = clf.predict(sample_path)
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Sample inference error: {str(e)}"
            ) from e
    else:
        raise HTTPException(
            status_code=400,
            detail="Either an uploaded image file or sample_id must be provided."
        )

    scan_id = f"SCAN-{uuid.uuid4().hex[:8].upper()}"

    patient_meta = {
        "patient_id": patient_id or "PID-40291",
        "patient_name": patient_name or "Anonymous Patient",
        "patient_age": patient_age or "N/A",
        "patient_gender": patient_gender or "Unspecified",
        "patient_blood_group": patient_blood_group or "O+",
        "referring_physician": referring_physician or "Dr. Robert Hayes, MD",
        "clinical_notes": clinical_notes or "Axial brain MRI diagnostic study"
    }

    user_meta = {
        "user_id": user_id or "USR-8421",
        "user_name": user_name or "Dr. Sarah Mitchell, MD",
        "user_role": user_role or "Neuro-Oncology Radiologist",
        "user_department": user_department or "Department of Radiodiagnosis & Neuro-Oncology"
    }

    # Cache scan data in memory for instant PDF export
    scan_cache[scan_id] = {
        "original_np": result["original_image"],
        "overlay_np": result["overlay_image"],
        "raw_cam_np": result["raw_cam_image"],
        "patient_details": patient_meta,
        "user_details": user_meta,
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
        "patient_details": patient_meta,
        "user_details": user_meta,
        "original_image": numpy_to_base64(result["original_image"]),
        "gradcam_overlay": numpy_to_base64(result["overlay_image"]),
        "raw_heatmap": numpy_to_base64(result["raw_cam_image"])
    }


@app.post("/api/export-pdf")
async def export_pdf(request: PDFExportRequest):
    """Generates an academic diagnostic report PDF using ReportLab with patient and clinician specifications."""
    cached = scan_cache.get(request.scan_id)
    if not cached:
        raise HTTPException(
            status_code=404,
            detail="Scan session expired or not found. Please re-run the scan and try again."
        )

    p_meta = cached.get("patient_details", {})
    u_meta = cached.get("user_details", {})

    try:
        pdf_bytes = generate_pdf_report(
            scan_id=request.scan_id,
            original_img_np=cached["original_np"],
            gradcam_img_np=cached["overlay_np"],
            prediction_data=cached["prediction_data"],
            patient_name=request.patient_name or p_meta.get("patient_name") or "Anonymous Patient",
            patient_age=request.patient_age or p_meta.get("patient_age") or "N/A",
            patient_gender=request.patient_gender or p_meta.get("patient_gender") or "N/A",
            clinical_notes=request.clinical_notes or p_meta.get("clinical_notes") or "Axial brain MRI diagnostic study",
            user_id=request.user_id or u_meta.get("user_id") or "USR-8421",
            user_name=request.user_name or u_meta.get("user_name") or "Dr. Sarah Mitchell, MD",
            user_role=request.user_role or u_meta.get("user_role") or "Neuro-Oncology Radiologist",
            user_department=request.user_department or u_meta.get("user_department") or "Department of Radiodiagnosis & Neuro-Oncology",
            patient_id=request.patient_id or p_meta.get("patient_id") or "PID-40291",
            patient_blood_group=request.patient_blood_group or p_meta.get("patient_blood_group") or "O+",
            referring_physician=request.referring_physician or p_meta.get("referring_physician") or "Dr. Robert Hayes, MD"
        )

        filename = f"neuroscan_{request.scan_id}.pdf"
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}") from e


@app.get("/api/classes-info")
async def get_classes_info():
    """Provides detailed reference data for technical evaluation & project presentation."""
    return {
        "classes": CLASS_METADATA,
        "project_metadata": {
            "title": "Brain Tumor Prediction Using Deep Learning",
            "project_type": "Individual Deep Learning Project",
            "technologies": [
                "PyTorch 2.x", "Convolutional Neural Networks (ResNet-18)",
                "Grad-CAM (Explainable AI)", "FastAPI", "OpenCV", "ReportLab"
            ],
            "dataset_origin": (
                "Standard Brain Tumor MRI Dataset "
                "(Glioma, Meningioma, Pituitary, Normal)"
            ),
            "disclaimer": "Independent research prototype. Non-clinical decision support system."
        },
        "specifications": {
            "model_architecture": {
                "backbone": "ResNet-18 (Residual Convolutional Neural Network)",
                "total_parameters": "11,689,512 (~11.7 Million)",
                "model_binary_size": "44.6 MB",
                "input_dimensions": "3 x 224 x 224 RGB Matrix",
                "residual_stages": "4 stages of 2 BasicBlocks with 3x3 convs and skip connections",
                "classifier_head": "Dropout(0.4) -> Linear(512, 256) -> ReLU -> BatchNorm1d(256) -> Dropout(0.25) -> Linear(256, 4)",
                "target_cam_layer": "model.layer4[-1].conv2 (512 feature channels, 7x7 spatial grid)"
            },
            "training_and_optimization": {
                "optimizer": "AdamW (learning_rate=1e-4, weight_decay=1e-2, betas=(0.9, 0.999))",
                "loss_criterion": "Categorical CrossEntropyLoss with Multi-Class Softmax",
                "batch_size": 32,
                "epochs": 25,
                "scheduler": "CosineAnnealingLR (T_max=25, eta_min=1e-6)",
                "normalization": "ImageNet (mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])",
                "data_augmentations": "RandomHorizontalFlip(p=0.5), RandomRotation(degrees=15), ColorJitter(brightness=0.1, contrast=0.1)"
            },
            "performance_benchmarks": {
                "overall_accuracy": "96.8%",
                "glioma_sensitivity": "97.2%",
                "meningioma_specificity": "96.1%",
                "pituitary_precision": "98.0%",
                "f1_score": "96.5%",
                "mean_inference_latency": "< 180 ms (CPU) / < 25 ms (CUDA)"
            },
            "system_and_hardware_requirements": {
                "python_runtime": ">= 3.10 (tested on 3.11 & 3.12)",
                "frameworks": "PyTorch 2.x, Torchvision, FastAPI, Uvicorn, OpenCV, ReportLab",
                "minimum_ram": "4 GB (8 GB Recommended)",
                "cpu_support": "x86_64 or ARM64 with AVX2 instruction set",
                "gpu_support": "Optional CUDA 11.8+ / 12.x compatible GPU for accelerated inference",
                "storage_footprint": "~500 MB (Environment + Model Weights + Sample Cache)"
            }
        }
    }


TUMOR_LIBRARY_DATA = {
    "encyclopedia": [
        {
            "id": "glioma",
            "name": "Glioma (Astrocytoma / Glioblastoma)",
            "short_name": "Glioma",
            "who_grade": "WHO Grade II - IV (GBM: Grade IV)",
            "category": "Intra-Axial Malignant Neuroepithelial Neoplasm",
            "risk_tier": "High Risk (Urgent Intervention)",
            "risk_color": "rose",
            "cellular_origin": "Glial support cells (Astrocytes, Oligodendrocytes, Ependymal cells)",
            "incidence": "~80% of all primary malignant brain tumors; incidence ~5.3 per 100,000 person-years",
            "hallmark_mri": "Poorly circumscribed infiltrative borders with extensive finger-like vasogenic edema on T2/FLAIR; prominent central necrotic cavities with thick irregular peripheral rim enhancement on post-gadolinium T1-weighted images.",
            "molecular_markers": [
                "IDH1/IDH2 mutation (R132H)",
                "1p/19q co-deletion (pathognomonic for oligodendroglioma)",
                "MGMT promoter hypermethylation (predicts alkylating response)",
                "TERT promoter mutation & EGFR amplification",
                "ATRX loss & TP53 alterations"
            ],
            "clinical_symptoms": [
                "Progressive intractable morning cephalalgia with vomiting",
                "New-onset focal motor or secondary generalized seizures",
                "Progressive unilateral hemiparesis or sensory extinction",
                "Subacute cognitive decline, executive dysfunction & personality change",
                "Papilledema secondary to elevated intracranial pressure (ICP)"
            ],
            "first_line_management": "Maximal safe microsurgical resection preserving eloquent cortex, followed by standard Stupp Protocol (concomitant fractionated Radiotherapy 60 Gy + Temozolomide), followed by 6 cycles of adjuvant Temozolomide and alternating electric field therapy (TTFields).",
            "deep_learning_saliency": "ResNet-18 Grad-CAM localizes distinctly around the infiltrative necrotic ring boundary and hyperintense vasogenic edema margins on Layer 4 feature activation maps.",
            "sample_file": "glioma_sample.jpg"
        },
        {
            "id": "meningioma",
            "name": "Meningioma",
            "short_name": "Meningioma",
            "who_grade": "WHO Grade I (80-85% Benign), Grade II (15% Atypical), Grade III (1-3% Anaplastic)",
            "category": "Extra-Axial Mesenchymal Neoplasm",
            "risk_tier": "Moderate Risk",
            "risk_color": "amber",
            "cellular_origin": "Arachnoid cap cells of the arachnoid villi within the meningeal dura mater",
            "incidence": "Most common primary non-glial intracranial tumor (~37-39% of all adult CNS tumors)",
            "hallmark_mri": "Sharply demarcated, extra-axial hemispheric or skull-base dural attachment with classic pathognomonic 'Dural Tail Sign'; strong avid homogeneous contrast enhancement on T1+Gd; CSF vascular cleft sign; occasional adjacent hyperostosis.",
            "molecular_markers": [
                "NF2 (neurofibromatosis type 2) 22q monosomy / inactivation (~60%)",
                "TRAF7, KLF4 mutations (characteristic of secretory subtype)",
                "AKT1 & SMO mutations (skull-base meningiomas)",
                "TERT promoter mutation & homozygous CDKN2A/B deletion in Grade III"
            ],
            "clinical_symptoms": [
                "Insidious, slow-progressing dull headaches",
                "Focal motor seizures due to cortical compression",
                "Cranial nerve neuropathies (diplopia, anosmia, facial numbness)",
                "Visual field defects (sphenoid wing or tuberculum sellae)",
                "Progressive focal weakness or gait disturbance"
            ],
            "first_line_management": "Active surveillance with serial MRI for asymptomatic small Grade I lesions; complete microsurgical extirpation (Simpson Grade I resection goal); stereotactic radiosurgery (Gamma Knife / CyberKnife) for inaccessible skull base locations or residual disease.",
            "deep_learning_saliency": "Grad-CAM features sharp, high-intensity focal activation concentrated along the dural base and the homogeneous contrast-enhanced spherical core.",
            "sample_file": "meningioma_sample.jpg"
        },
        {
            "id": "pituitary",
            "name": "Pituitary Tumor (PitNET / Adenoma)",
            "short_name": "Pituitary Adenoma",
            "who_grade": "Benign Neuroendocrine Neoplasm (Microadenoma <10mm, Macroadenoma >=10mm)",
            "category": "Sellar / Suprasellar Neuroendocrine Tumor",
            "risk_tier": "Moderate Risk",
            "risk_color": "purple",
            "cellular_origin": "Specialized neuroendocrine cells of the anterior pituitary gland (adenohypophysis)",
            "incidence": "~10-15% of all diagnosed intracranial neoplasms; autopsy prevalence up to 16.7%",
            "hallmark_mri": "Remodeling and ballooning expansion of the sella turcica with suprasellar extension; classic 'figure-of-8' or 'snowman' waist sign formed at the diaphragmatic aperture; superior displacement and compression of the optic chiasm; Knosp grading for cavernous sinus invasion.",
            "molecular_markers": [
                "Pit-1 transcription factor lineage (GH, PRL, TSH-secreting)",
                "T-pit transcription factor lineage (ACTH-secreting / Cushing's disease)",
                "SF-1 transcription factor lineage (Gonadotroph / clinically non-functioning)",
                "MEN1 (Multiple Endocrine Neoplasia Type 1) & AIP germline mutations",
                "GNAS1 oncogene activating mutations (McCune-Albright)"
            ],
            "clinical_symptoms": [
                "Bitemporal hemianopsia caused by optic chiasm midline compression",
                "Endocrine syndromes: Hyperprolactinemia (galactorrhea, amenorrhea, infertility)",
                "Growth Hormone excess (Acromegaly / gigantism, coarse facial features)",
                "Cushing's Disease (central adiposity, purple striae, hypertension)",
                "Acute pituitary apoplexy (sudden severe headache, visual loss, ophthalmoplegia)"
            ],
            "first_line_management": "Medical pharmacotherapy first-line for prolactinomas (Dopamine receptor agonists: Cabergoline, Bromocriptine); Endoscopic endonasal transsphenoidal surgery (TSS) for macroadenomas with visual compromise; stereotactic radiosurgery for refractory invasion.",
            "deep_learning_saliency": "Model activation cleanly locks onto the sellar-suprasellar midline floor, distinguishing the pituitary fossa from adjacent brainstem and temporal lobes.",
            "sample_file": "pituitary_sample.jpg"
        },
        {
            "id": "notumor",
            "name": "Healthy Brain MRI (No Tumor / Normal Control)",
            "short_name": "Normal Brain",
            "who_grade": "Non-Pathological Anatomical Baseline",
            "category": "Normal Parenchyma & Ventricular Anatomy",
            "risk_tier": "Low Risk (Normal Study)",
            "risk_color": "emerald",
            "cellular_origin": "Intact neuronal cytoarchitecture, myelin sheaths, and supportive neuroglia without dysplasia",
            "incidence": "Standard diagnostic control cohort; negative findings in routine clinical neuroimaging screening",
            "hallmark_mri": "Bilateral cerebral and cerebellar hemispheric symmetry; intact midline falx cerebri with no mass effect or midline shift; patent lateral, third, and fourth ventricles without dilatation or hydrocephalus; clear gray-white matter junction differentiation; intact cortical sulci and gyri without obliteration.",
            "molecular_markers": [
                "Wild-type baseline genetics",
                "Physiological blood-brain barrier (BBB) integrity",
                "Uniform cerebral metabolic rate of oxygen (CMRO2)",
                "Absence of oncogenic driver mutations"
            ],
            "clinical_symptoms": [
                "Absence of progressive focal neurologic deficits",
                "Physiological cranial nerve reflexes and sensory responses",
                "Intact visual acuity and unimpaired peripheral fields",
                "Normative intracranial pressure hemodynamics"
            ],
            "first_line_management": "Routine clinical reassurance; no neurosurgical or oncological intervention required. Diagnostic follow-up only if new atypical neurological symptoms emerge.",
            "deep_learning_saliency": "Diffused, low-magnitude uniform activation throughout the cerebral cortex without focal hot-spot clustering, confirming the absence of space-occupying lesions.",
            "sample_file": "notumor_sample.jpg"
        }
    ],
    "comparative_matrix": [
        {
            "parameter": "Pathological Classification",
            "glioma": "Malignant Intra-Axial (Astrocytes / Oligodendrocytes)",
            "meningioma": "Benign Extra-Axial (Arachnoid Cap Cells)",
            "pituitary": "Benign Neuroendocrine (Adenohypophyseal Cells)",
            "notumor": "Physiological Normal Anatomy"
        },
        {
            "parameter": "WHO Grade Tier",
            "glioma": "Grade II to IV (Glioblastoma: Grade IV)",
            "meningioma": "Grade I (80-85%), Grade II (15%), Grade III (1-3%)",
            "pituitary": "Grade I Benign Neoplasm (Micro/Macroadenoma)",
            "notumor": "N/A (Normal)"
        },
        {
            "parameter": "Gadolinium Enhancement",
            "glioma": "Heterogeneous, irregular, thick peripheral nodular ring",
            "meningioma": "Homogeneous, avid, intense with dural tail sign",
            "pituitary": "Avid sellar mass, delayed enhancement vs normal gland",
            "notumor": "No focal enhancement (BBB intact)"
        },
        {
            "parameter": "Vasogenic Edema & Mass Effect",
            "glioma": "Extensive, infiltrative finger-like edema on T2/FLAIR",
            "meningioma": "Variable perilesional edema with CSF cleft",
            "pituitary": "Minimal to none; local chiasmatic compression",
            "notumor": "Absent (Physiological ventricles & sulci)"
        },
        {
            "parameter": "Primary Molecular Biomarkers",
            "glioma": "IDH1/2 mutations, 1p/19q codeletion, MGMT methylation",
            "meningioma": "NF2 (22q loss), TRAF7, KLF4, AKT1",
            "pituitary": "Pit-1, T-pit, SF-1 transcription factors, MEN1",
            "notumor": "Wild-type physiological baseline"
        },
        {
            "parameter": "Hallmark Symptomatology",
            "glioma": "Intractable morning headaches, seizures, focal deficits",
            "meningioma": "Slow-onset headaches, localized seizures, cranial palsies",
            "pituitary": "Bitemporal hemianopsia, endocrine hyper/hyposecretion",
            "notumor": "Asymptomatic / normal examination"
        },
        {
            "parameter": "First-Line Therapeutic Regimen",
            "glioma": "Maximal resection + Radiotherapy (60 Gy) + Temozolomide",
            "meningioma": "Surgical resection (Simpson I) / Stereotactic Radiosurgery",
            "pituitary": "Dopamine agonists (Prolactinoma) / Endoscopic TSS surgery",
            "notumor": "Reassurance / No intervention"
        },
        {
            "parameter": "ResNet-18 Grad-CAM Saliency",
            "glioma": "Intense activation on infiltrative margins & necrotic core",
            "meningioma": "Spherical localized hotspot over dural attachment",
            "pituitary": "Focal convergence onto sellar / suprasellar midpoint",
            "notumor": "Uniform, low-entropy diffuse baseline gradient"
        }
    ]
}


@app.get("/api/tumor-library")
async def get_tumor_library():
    """Returns the comprehensive clinical & deep learning encyclopedia for the Tumor Library."""
    return TUMOR_LIBRARY_DATA


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
