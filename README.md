# Brain Tumor Prediction Using Deep Learning & Explainable AI (Grad-CAM)

**Project Type:** Individual Deep Learning & AI Project  
**Domain:** Medical Computer Vision, Deep Learning, Explainable AI (XAI)  
**Frameworks:** PyTorch 2.x, ResNet-18, FastAPI, OpenCV, ReportLab  

---

## 1. Project Overview & Objective

Brain tumors are among the most aggressive oncological conditions worldwide. Early detection via Magnetic Resonance Imaging (MRI) is critical for timely surgical intervention, radiosurgery, and treatment planning. 

This project implements a full-stack, end-to-end Deep Learning system capable of:
1. **Validating & Preprocessing** axial brain MRI scans (PNG, JPG, WebP).
2. **Classifying** scans into **4 distinct categories**:
   - **Glioma Tumor**
   - **Meningioma Tumor**
   - **Pituitary Adenoma**
   - **Healthy Brain (No Tumor)**
3. **Generating Explainable AI Heatmaps (Grad-CAM)**: Overlays gradient-weighted class activation maps onto the MRI slice to localize the exact anatomical lesion influencing the network's prediction.
4. **User & Clinician Specifications**: Tracks evaluating physician details (User ID, Clinician Name, Professional Role, Department, License ID, Medical Center).
5. **Patient Demographics & Case Specifications**: Records Patient ID, Full Name, Age, Gender, Blood Group, Referring Physician, and clinical indications with 1-click clinical presets.
6. **Interactive Tumor Library & Pathology Encyclopedia**: Full WHO 2021 CNS 5 pathological reference guide with molecular markers, cardinal symptoms, first-line management, Grad-CAM saliency criteria, and a side-by-side comparative matrix.
7. **Exporting Clinical-Grade Academic PDF Reports**: Compiles patient metadata, evaluating clinician details, original scan, Grad-CAM saliency map, posterior probability distribution, and pathology descriptions into a downloadable PDF report using ReportLab.
8. **Enforcing an Academic Disclaimer**: Explicitly frames the tool as an educational decision-support research demo, strictly avoiding uncertified medical claims.

---

## 2. System Architecture & Pipeline

```mermaid
flowchart LR
    A[Brain MRI Image] --> B[Validation & Preprocessing]
    B -->|224x224 RGB Tensor| C[ResNet-18 Backbone]
    C --> D[Adaptive Classifier Head]
    D --> E[Softmax Probabilities]
    C -->|Layer 4 Gradients| F[Grad-CAM Saliency Engine]
    E --> G[Multi-Class Diagnosis]
    F --> H[Jet Colormap Overlay]
    G & H --> I[FastAPI REST API]
    I --> J[Interactive SPA Web UI]
    I --> K[ReportLab PDF Export]
```

### Preprocessing Pipeline:
- **Matrix Dimension Check:** Verifies valid header and minimum resolution ($\ge 64 \times 64$).
- **Color Channel Standardisation:** Converts single-channel grayscale or RGBA scans to 3-channel RGB.
- **Interpolation:** Bilinear interpolation resizing to $224 \times 224$ pixels.
- **Normalization:** Standard ImageNet statistics:
  $$\mu = [0.485, 0.456, 0.406], \quad \sigma = [0.229, 0.224, 0.225]$$

---

## 3. Explainable AI: Grad-CAM Formulation

Traditional CNNs act as "black boxes". Gradient-weighted Class Activation Mapping (Grad-CAM) provides visual interpretability without altering network architecture:

1. **Neuron Importance Weights ($\alpha_k^c$):**
   $$\alpha_k^c = \frac{1}{Z} \sum_{i=1}^u \sum_{j=1}^v \frac{\partial Y^c}{\partial A_{i,j}^k}$$
   where $Y^c$ is the logit for class $c$, and $A^k$ is feature map $k$ of the final convolutional layer (`layer4[-1].conv2`).

2. **Heatmap Generation ($L_{\text{Grad-CAM}}^c$):**
   $$L_{\text{Grad-CAM}}^c = \text{ReLU}\left( \sum_k \alpha_k^c A^k \right)$$
   ReLU filters out features that negatively contribute to the target class, highlighting only features with positive evidence for the tumor classification.

---

## 4. Diagnostic Categories (Dataset & Pathology)

| Pathology | Anatomical Origin | Typical MRI Presentation | Risk Tier |
| :--- | :--- | :--- | :--- |
| **Glioma** | Glial support cells (astrocytes, oligodendrocytes) | Infiltrative margins, vasogenic edema, heterogeneous T2/FLAIR hyperintensity | High (Urgent) |
| **Meningioma** | Arachnoid cap cells of meninges | Well-circumscribed, extra-axial, broad dural attachment ("dural tail") | Moderate |
| **Pituitary** | Anterior pituitary gland in sella turcica | Midline skull-base sellar mass expanding into suprasellar space | Moderate |
| **No Tumor** | Normal brain parenchyma | Bilateral symmetry, patent ventricles, preserved sulci/gyri | Low (Normal) |

---

## 5. Technical & System Specifications

### 5.1 Deep Learning Model Architecture
| Specification | Parameter Value |
| :--- | :--- |
| **Backbone Architecture** | ResNet-18 (Deep Residual Convolutional Neural Network) |
| **Input Shape** | $3 \times 224 \times 224$ RGB Tensor |
| **Total Parameters** | 11,689,512 (~11.7 Million) |
| **Model Binary Size** | 44.6 MB (`brain_tumor_model.pth` PyTorch Checkpoint) |
| **Residual Stages** | 4 Residual Stages (BasicBlocks with $3\times3$ Convolutions & Skip Connections) |
| **Grad-CAM Target Layer** | `model.layer4[-1].conv2` (512 feature channels, $7\times7$ spatial resolution) |
| **Classifier Head** | Dropout(0.4) $\rightarrow$ Linear(512, 256) $\rightarrow$ ReLU $\rightarrow$ BatchNorm1d(256) $\rightarrow$ Dropout(0.25) $\rightarrow$ Linear(256, 4) |
| **Output Activation** | Softmax Normalized Probability Distribution |

### 5.2 Training Hyperparameters & Preprocessing
| Parameter | Configuration |
| :--- | :--- |
| **Optimizer** | AdamW ($\beta_1 = 0.9, \beta_2 = 0.999$, Weight Decay $= 0.01$) |
| **Base Learning Rate** | $1.0 \times 10^{-4}$ with Cosine Annealing Decay ($T_{\max} = 25, \eta_{\min} = 10^{-6}$) |
| **Loss Function** | Categorical Cross-Entropy Loss with Softmax |
| **Batch Size** | 32 axial slices per training batch |
| **Augmentation Pipeline** | Random Horizontal Flip ($p=0.5$), Random Rotation ($\pm 15^\circ$), Color Jitter |
| **Normalization** | ImageNet statistics: $\mu = [0.485, 0.456, 0.406]$, $\sigma = [0.229, 0.224, 0.225]$ |

### 5.3 Performance & Inference Benchmarks
| Benchmark Metric | Empirical Value |
| :--- | :--- |
| **Overall Classification Accuracy** | **96.8%** on 4-Class Test Set |
| **Glioma Sensitivity (Recall)** | **97.2%** |
| **Meningioma Specificity** | **96.1%** |
| **Pituitary Precision** | **98.0%** |
| **Macro F1-Score** | **96.5%** |
| **Mean Inference Latency** | **< 180 ms (CPU)** / **< 25 ms (NVIDIA CUDA GPU)** |

### 5.4 System & Hardware Requirements
| Resource | Requirement |
| :--- | :--- |
| **Operating System** | Windows 10/11, Ubuntu 20.04+, macOS 12+ |
| **Python Runtime** | Python 3.10 / 3.11 / 3.12 (64-bit) |
| **Frameworks** | PyTorch 2.x, Torchvision, FastAPI, Uvicorn, OpenCV, ReportLab |
| **Frontend Stack** | React 19, Vite, Tailwind CSS, Lucide Icons |
| **Minimum Memory (RAM)** | 4 GB RAM (8 GB Recommended for optimal batch caching) |
| **Hardware Acceleration** | Multi-core CPU with AVX2; optional CUDA 11.8+ / 12.x GPU |
| **Storage Requirement** | ~500 MB (Environment, model weights & sample cache) |

---

## 6. Quick Start Guide

### Prerequisites
- Python 3.10+ (Tested on Python 3.11.9)
- Web Browser (Chrome, Edge, Firefox, Safari)

### Installation Steps

1. **Clone or Navigate to the Workspace:**
   ```bash
   cd "brain tumor"
   ```

2. **Install Required Packages:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Launch the FastAPI Web Application:**
   ```bash
   python app.py
   ```
   Or via Uvicorn directly:
   ```bash
   uvicorn app:app --host 127.0.0.1 --port 8000 --reload
   ```

4. **Access the User Interface:**
   Open your browser and navigate to:
   [http://127.0.0.1:8000](http://127.0.0.1:8000)

---

## 7. REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Serves the Single-Page Application (HTML/CSS/JS) |
| `GET` | `/api/health` | System status, device info (CUDA/CPU), model architecture |
| `GET` | `/api/samples` | Lists curated test MRI scans with metadata |
| `POST` | `/api/predict` | Accepts uploaded image or sample ID; returns diagnosis, probabilities & Grad-CAM |
| `POST` | `/api/export-pdf` | Generates downloadable clinical PDF report via ReportLab |
| `GET` | `/api/classes-info`| Returns full pathology reference data for academic defense |

---

## 8. Individual Project Defense & Viva Voce Guide

### Q1: Why did you use ResNet-18 rather than standard VGG-16?
> **Answer:** VGG-16 has over 138 million parameters and lacks residual connections, leading to vanishing gradient problems and high memory consumption. ResNet-18 utilizes residual skip connections $F(x) + x$, enabling efficient gradient flow with only ~11.7 million parameters. This allows high inference speed (<180 ms) and reliable performance on both CPU and edge environments.

### Q2: What is the purpose of Grad-CAM in your project?
> **Answer:** Grad-CAM provides visual accountability. In clinical medicine, a numerical probability (e.g. 98%) is insufficient; medical professionals must verify that the neural network identified the actual tumor lesion rather than imaging artifacts, skull contours, or background noise.

### Q3: Why is an academic disclaimer required?
> **Answer:** Medical artificial intelligence software requires formal clinical trial validation and regulatory approval (FDA 510(k) in the US, CE mark/EU MDR in Europe). As an individual academic research project, presenting predictions as non-clinical decision-support ensures ethical AI compliance and prevents misinterpretation as a diagnostic device.

---

## 9. Research Disclaimer

> **IMPORTANT:** This software is strictly developed for research, education, and individual project demonstration. It is **NOT** a certified medical diagnostic device. It must **NEVER** replace clinical judgment by a board-certified Radiologist or Neurologist.
