/**
 * app.js
 * NeuroScan AI - Brain Tumor Prediction & Explainable AI Frontend Logic
 * Full support for User/Clinician Specifications, Patient Demographics, and Tumor Library.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // ---------------------------------------------------------------------------
  // 1. Clinician / User Profile Management
  // ---------------------------------------------------------------------------
  const DEFAULT_USER_PROFILE = {
    userId: "USR-8421",
    userName: "Dr. Sarah Mitchell, MD",
    role: "Senior Consultant Neuro-Radiologist",
    department: "Department of Radiodiagnosis & Neuro-Oncology",
    hospital: "NeuroScan Academic Medical Center",
    licenseId: "NMC-RAD-88341"
  };

  const CLINICIAN_PRESETS = {
    mitchell: {
      userId: "USR-8421",
      userName: "Dr. Sarah Mitchell, MD",
      role: "Senior Consultant Neuro-Radiologist",
      department: "Department of Radiodiagnosis & Neuro-Oncology",
      hospital: "NeuroScan Academic Medical Center",
      licenseId: "NMC-RAD-88341"
    },
    rivera: {
      userId: "USR-5190",
      userName: "Dr. Alex Rivera, PhD",
      role: "AI Diagnostic Research Fellow",
      department: "Center for Computational Neuro-Science",
      hospital: "University Brain Institute",
      licenseId: "RES-AI-2024-519"
    },
    patel: {
      userId: "USR-9023",
      userName: "Dr. Priya Patel, MD, DM",
      role: "Attending Neurologist & Neuro-Oncologist",
      department: "Division of Clinical Neurology",
      hospital: "Metropolitan Neurology Hospital",
      licenseId: "NMC-NEUR-9023"
    }
  };

  let currentUserProfile = { ...DEFAULT_USER_PROFILE };
  try {
    const saved = localStorage.getItem("neuroscan_user_profile");
    if (saved) {
      currentUserProfile = JSON.parse(saved);
    }
  } catch (e) {
    console.warn("Could not read user profile from storage", e);
  }

  // Update header & scanner UI indicators for active clinician
  function updateClinicianUI() {
    const headerUserName = document.getElementById("headerUserName");
    const headerUserId = document.getElementById("headerUserId");
    const scannerEvaluatorText = document.getElementById("scannerEvaluatorText");

    if (headerUserName) {
      headerUserName.textContent = currentUserProfile.userName.split(",")[0];
    }
    if (headerUserId) {
      headerUserId.textContent = currentUserProfile.userId;
    }
    if (scannerEvaluatorText) {
      scannerEvaluatorText.textContent = `${currentUserProfile.userName} (${currentUserProfile.userId})`;
    }
  }
  updateClinicianUI();

  // ---------------------------------------------------------------------------
  // 2. Patient Case Presets
  // ---------------------------------------------------------------------------
  const PATIENT_CASE_PRESETS = {
    glioma: {
      patientId: "PID-40291",
      patientName: "Eleanor Vance",
      age: "45",
      gender: "Female",
      bloodGroup: "A+",
      referringPhysician: "Dr. Robert Hayes, MD (Neurology)",
      clinicalNotes: "Progressive morning cephalalgia for 6 weeks, nausea, focal motor seizure in left arm.",
      sampleFile: "glioma_sample.jpg"
    },
    meningioma: {
      patientId: "PID-38104",
      patientName: "Marcus Chen",
      age: "52",
      gender: "Male",
      bloodGroup: "O+",
      referringPhysician: "Dr. Lisa Thorne, MD (Neuro-Surgery)",
      clinicalNotes: "Chronic progressive right convexity headaches, transient sensory deficit, no papilledema.",
      sampleFile: "meningioma_sample.jpg"
    },
    pituitary: {
      patientId: "PID-71920",
      patientName: "Sophia Davis",
      age: "39",
      gender: "Female",
      bloodGroup: "B+",
      referringPhysician: "Dr. Alan Moore, MD (Endocrinology)",
      clinicalNotes: "Bitemporal hemianopsia, chronic hyperprolactinemia, visual acuity drop in left eye.",
      sampleFile: "pituitary_sample.jpg"
    },
    notumor: {
      patientId: "PID-19402",
      patientName: "David Wilson",
      age: "31",
      gender: "Male",
      bloodGroup: "O-",
      referringPhysician: "Dr. Emily Watson, MD (General Medicine)",
      clinicalNotes: "Post-concussive routine screening MRI. Neurologically intact, normal cranial reflexes.",
      sampleFile: "notumor_sample.jpg"
    }
  };

  // State Management
  const state = {
    selectedFile: null,
    selectedSampleId: null,
    currentScanId: null,
    currentScanData: null,
    vizMode: "overlay" // 'overlay' | 'heatmap' | 'original'
  };

  // DOM Elements
  const navTabs = document.querySelectorAll(".nav-tab");
  const viewPanels = document.querySelectorAll(".view-panel");

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const browseBtn = document.getElementById("browseBtn");
  const dropzonePrompt = document.getElementById("dropzonePrompt");
  const previewContainer = document.getElementById("previewContainer");
  const previewImage = document.getElementById("previewImage");
  const previewFileName = document.getElementById("previewFileName");
  const previewFileSize = document.getElementById("previewFileSize");
  const removeFileBtn = document.getElementById("removeFileBtn");

  const analyzeBtn = document.getElementById("analyzeBtn");
  const sampleChips = document.querySelectorAll(".sample-chip");
  const samplesGallery = document.getElementById("samplesGallery");

  // Patient inputs
  const patientIdInput = document.getElementById("patientIdInput");
  const patientNameInput = document.getElementById("patientNameInput");
  const patientAgeInput = document.getElementById("patientAgeInput");
  const patientGenderInput = document.getElementById("patientGenderInput");
  const patientBloodInput = document.getElementById("patientBloodInput");
  const refPhysicianInput = document.getElementById("refPhysicianInput");
  const clinicalNotesInput = document.getElementById("clinicalNotesInput");
  const genPatientIdBtn = document.getElementById("genPatientIdBtn");

  // Results State Containers
  const emptyState = document.getElementById("emptyState");
  const loadingState = document.getElementById("loadingState");
  const resultsDisplay = document.getElementById("resultsDisplay");
  const loaderTitle = document.getElementById("loaderTitle");
  const loaderSubtitle = document.getElementById("loaderSubtitle");

  // Results UI
  const resultBanner = document.getElementById("resultBanner");
  const resultPill = document.getElementById("resultPill");
  const resultTitle = document.getElementById("resultTitle");
  const resultCategory = document.getElementById("resultCategory");
  const confidenceVal = document.getElementById("confidenceVal");
  const resOriginalImg = document.getElementById("resOriginalImg");
  const resOverlayImg = document.getElementById("resOverlayImg");
  const probBarsGrid = document.getElementById("probBarsGrid");
  const resAnatomicalSite = document.getElementById("resAnatomicalSite");
  const resRiskLevel = document.getElementById("resRiskLevel");
  const resDescription = document.getElementById("resDescription");
  const resClinicalRelevance = document.getElementById("resClinicalRelevance");

  // Results Verified Metadata Elements
  const resPatientName = document.getElementById("resPatientName");
  const resPatientDetails = document.getElementById("resPatientDetails");
  const resClinicianName = document.getElementById("resClinicianName");
  const resClinicianDetails = document.getElementById("resClinicianDetails");

  const vizButtons = document.querySelectorAll(".viz-btn");
  const blendSliderGroup = document.getElementById("blendSliderGroup");
  const blendRange = document.getElementById("blendRange");
  const blendVal = document.getElementById("blendVal");

  const downloadPdfBtn = document.getElementById("downloadPdfBtn");
  const printReportBtn = document.getElementById("printReportBtn");
  const resetScanBtn = document.getElementById("resetScanBtn");

  // Modal Elements
  const userProfileModal = document.getElementById("userProfileModal");
  const openUserModalBtn = document.getElementById("openUserModalBtn");
  const closeUserModalBtn = document.getElementById("closeUserModalBtn");
  const cancelUserModalBtn = document.getElementById("cancelUserModalBtn");
  const editEvaluatorBtn = document.getElementById("editEvaluatorBtn");
  const userProfileForm = document.getElementById("userProfileForm");
  const modalUserId = document.getElementById("modalUserId");
  const modalGenUserIdBtn = document.getElementById("modalGenUserIdBtn");
  const modalUserName = document.getElementById("modalUserName");
  const modalUserRole = document.getElementById("modalUserRole");
  const modalDepartment = document.getElementById("modalDepartment");
  const modalHospital = document.getElementById("modalHospital");
  const modalLicenseId = document.getElementById("modalLicenseId");
  const presetPills = document.querySelectorAll(".preset-pill");

  // Tumor Library Elements
  const tumorSearchInput = document.getElementById("tumorSearchInput");
  const libFilterChips = document.querySelectorAll(".lib-chip");
  const toggleMatrixBtn = document.getElementById("toggleMatrixBtn");
  const comparativeMatrixWrapper = document.getElementById("comparativeMatrixWrapper");
  const knowledgeGrid = document.getElementById("knowledgeGrid");

  /* ==========================================================================
     1. NAVIGATION & TAB SWITCHING
     ========================================================================== */
  function switchTab(targetId) {
    navTabs.forEach(t => t.classList.remove("active"));
    viewPanels.forEach(p => p.classList.remove("active"));

    const activeTabBtn = Array.from(navTabs).find(t => t.dataset.target === targetId);
    if (activeTabBtn) activeTabBtn.classList.add("active");

    const targetPanel = document.getElementById(targetId);
    if (targetPanel) {
      targetPanel.classList.add("active");
    }

    if (targetId === "samplesView") {
      loadSamplesGallery();
    }
  }

  navTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      switchTab(tab.dataset.target);
    });
  });

  /* ==========================================================================
     2. CLINICIAN USER PROFILE MODAL
     ========================================================================== */
  function populateModalForm() {
    if (modalUserId) modalUserId.value = currentUserProfile.userId;
    if (modalUserName) modalUserName.value = currentUserProfile.userName;
    if (modalUserRole) modalUserRole.value = currentUserProfile.role;
    if (modalDepartment) modalDepartment.value = currentUserProfile.department;
    if (modalHospital) modalHospital.value = currentUserProfile.hospital;
    if (modalLicenseId) modalLicenseId.value = currentUserProfile.licenseId;
  }

  function openUserModal() {
    populateModalForm();
    if (userProfileModal) {
      userProfileModal.classList.remove("hidden");
      if (window.lucide) lucide.createIcons();
    }
  }

  function closeUserModal() {
    if (userProfileModal) {
      userProfileModal.classList.add("hidden");
    }
  }

  if (openUserModalBtn) openUserModalBtn.addEventListener("click", openUserModal);
  if (editEvaluatorBtn) editEvaluatorBtn.addEventListener("click", openUserModal);
  if (closeUserModalBtn) closeUserModalBtn.addEventListener("click", closeUserModal);
  if (cancelUserModalBtn) cancelUserModalBtn.addEventListener("click", closeUserModal);

  // Close modal when clicking outside card
  if (userProfileModal) {
    userProfileModal.addEventListener("click", (e) => {
      if (e.target === userProfileModal) closeUserModal();
    });
  }

  // Clinician preset pills
  presetPills.forEach(pill => {
    pill.addEventListener("click", () => {
      presetPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      const key = pill.dataset.clinician;
      const data = CLINICIAN_PRESETS[key];
      if (data) {
        if (modalUserId) modalUserId.value = data.userId;
        if (modalUserName) modalUserName.value = data.userName;
        if (modalUserRole) modalUserRole.value = data.role;
        if (modalDepartment) modalDepartment.value = data.department;
        if (modalHospital) modalHospital.value = data.hospital;
        if (modalLicenseId) modalLicenseId.value = data.licenseId;
      }
    });
  });

  // Auto-generate User ID
  if (modalGenUserIdBtn) {
    modalGenUserIdBtn.addEventListener("click", () => {
      const rnd = `USR-${Math.floor(1000 + Math.random() * 9000)}`;
      if (modalUserId) modalUserId.value = rnd;
    });
  }

  // Save profile form
  if (userProfileForm) {
    userProfileForm.addEventListener("submit", (e) => {
      e.preventDefault();
      currentUserProfile = {
        userId: modalUserId.value.trim() || "USR-8421",
        userName: modalUserName.value.trim() || "Dr. Sarah Mitchell, MD",
        role: modalUserRole.value.trim() || "Consultant Neuro-Radiologist",
        department: modalDepartment.value.trim() || "Department of Radiodiagnosis & Neuro-Oncology",
        hospital: modalHospital.value.trim() || "NeuroScan Academic Medical Center",
        licenseId: modalLicenseId.value.trim() || "NMC-RAD-88341"
      };

      try {
        localStorage.setItem("neuroscan_user_profile", JSON.stringify(currentUserProfile));
      } catch (err) {
        console.warn("Storage failed", err);
      }

      updateClinicianUI();
      closeUserModal();
    });
  }

  /* ==========================================================================
     3. PATIENT DEMOGRAPHICS & CASE PRESETS
     ========================================================================== */
  if (genPatientIdBtn) {
    genPatientIdBtn.addEventListener("click", () => {
      const rnd = `PID-${Math.floor(10000 + Math.random() * 90000)}`;
      if (patientIdInput) patientIdInput.value = rnd;
    });
  }

  function applyPatientPreset(presetKey) {
    const preset = PATIENT_CASE_PRESETS[presetKey];
    if (!preset) return;

    if (patientIdInput) patientIdInput.value = preset.patientId;
    if (patientNameInput) patientNameInput.value = preset.patientName;
    if (patientAgeInput) patientAgeInput.value = preset.age;
    if (patientGenderInput) patientGenderInput.value = preset.gender;
    if (patientBloodInput) patientBloodInput.value = preset.bloodGroup;
    if (refPhysicianInput) refPhysicianInput.value = preset.referringPhysician;
    if (clinicalNotesInput) clinicalNotesInput.value = preset.clinicalNotes;

    // Also select the matching sample MRI
    selectSample(preset.sampleFile);
  }

  document.querySelectorAll(".btn-case-preset").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".btn-case-preset").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      applyPatientPreset(btn.dataset.preset);
    });
  });

  /* ==========================================================================
     4. VIVA ACCORDION
     ========================================================================== */
  document.querySelectorAll(".viva-question").forEach(q => {
    q.addEventListener("click", () => {
      const item = q.parentElement;
      item.classList.toggle("open");
    });
  });

  /* ==========================================================================
     5. FILE UPLOAD & DROPZONE
     ========================================================================== */
  if (browseBtn) {
    browseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  if (dropZone) {
    dropZone.addEventListener("click", () => {
      if (!state.selectedFile && !state.selectedSampleId) {
        fileInput.click();
      }
    });

    ["dragenter", "dragover"].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add("drag-over");
      });
    });

    ["dragleave", "drop"].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove("drag-over");
      });
    });

    dropZone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        handleFileSelection(files[0]);
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        handleFileSelection(e.target.files[0]);
      }
    });
  }

  if (removeFileBtn) {
    removeFileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      resetUpload();
    });
  }

  function handleFileSelection(file) {
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      alert("Unsupported file format. Please upload a PNG, JPG, or WebP brain MRI scan.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert("File size exceeds 15 MB limit.");
      return;
    }

    state.selectedFile = file;
    state.selectedSampleId = null;

    sampleChips.forEach(c => c.classList.remove("active"));
    document.querySelectorAll(".btn-case-preset").forEach(b => b.classList.remove("active"));

    previewFileName.textContent = file.name;
    previewFileSize.textContent = formatBytes(file.size);

    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result;
      dropzonePrompt.classList.add("hidden");
      previewContainer.classList.remove("hidden");
      analyzeBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  function resetUpload() {
    state.selectedFile = null;
    state.selectedSampleId = null;
    state.currentScanId = null;
    state.currentScanData = null;

    fileInput.value = "";
    previewImage.src = "";
    previewContainer.classList.add("hidden");
    dropzonePrompt.classList.remove("hidden");
    analyzeBtn.disabled = true;

    sampleChips.forEach(c => c.classList.remove("active"));
    document.querySelectorAll(".btn-case-preset").forEach(b => b.classList.remove("active"));
  }

  function formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  /* ==========================================================================
     6. SAMPLE SELECTION
     ========================================================================== */
  function selectSample(sampleId) {
    state.selectedFile = null;
    state.selectedSampleId = sampleId;

    sampleChips.forEach(chip => {
      chip.classList.toggle("active", chip.dataset.sample === sampleId);
    });

    previewFileName.textContent = sampleId;
    previewFileSize.textContent = "Calibrated Test Scan";
    previewImage.src = `/static/samples/${sampleId}`;

    dropzonePrompt.classList.add("hidden");
    previewContainer.classList.remove("hidden");
    analyzeBtn.disabled = false;
  }

  sampleChips.forEach(chip => {
    chip.addEventListener("click", () => {
      selectSample(chip.dataset.sample);
    });
  });

  async function loadSamplesGallery() {
    if (!samplesGallery || samplesGallery.children.length > 0) return;

    try {
      const response = await fetch("/api/samples");
      const data = await response.json();
      const samples = data.samples || [];

      samplesGallery.innerHTML = "";
      samples.forEach(sample => {
        const card = document.createElement("div");
        card.className = "sample-card";
        card.innerHTML = `
          <div class="sample-img-box">
            <img src="${sample.url}" alt="${sample.title}" loading="lazy">
            <span class="sample-tag">${sample.tumor_type}</span>
          </div>
          <div class="sample-info">
            <h4>${sample.title}</h4>
            <p>${sample.notes}</p>
            <button type="button" class="btn btn-secondary btn-sm select-sample-btn" data-sample="${sample.filename}">
              <i data-lucide="arrow-right"></i> <span>Load into Scanner</span>
            </button>
          </div>
        `;
        samplesGallery.appendChild(card);
      });

      if (window.lucide) lucide.createIcons();

      document.querySelectorAll(".select-sample-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const sampleFilename = btn.dataset.sample;
          selectSample(sampleFilename);
          switchTab("scannerView");
        });
      });

    } catch (err) {
      console.error("Failed to load sample test gallery:", err);
    }
  }

  /* ==========================================================================
     7. INFERENCE TRIGGER
     ========================================================================== */
  if (analyzeBtn) {
    analyzeBtn.addEventListener("click", () => {
      if (!state.selectedFile && !state.selectedSampleId) return;
      analyzeMRI();
    });
  }

  async function analyzeMRI() {
    emptyState.classList.add("hidden");
    resultsDisplay.classList.add("hidden");
    loadingState.classList.remove("hidden");
    analyzeBtn.disabled = true;

    const stages = [
      "Phase 1: Validating DICOM / Axial Matrix Dimensions...",
      "Phase 2: Resizing (224×224) & Normalizing ImageNet Tensors...",
      "Phase 3: ResNet-18 Convolutional Feature Extraction...",
      "Phase 4: Computing Grad-CAM Activation Gradients on Layer 4...",
      "Phase 5: Calculating Multi-Class Softmax Posterior..."
    ];

    let stageIdx = 0;
    const stageInterval = setInterval(() => {
      stageIdx = (stageIdx + 1) % stages.length;
      loaderSubtitle.textContent = stages[stageIdx];
    }, 450);

    try {
      const formData = new FormData();
      if (state.selectedFile) {
        formData.append("file", state.selectedFile);
      } else if (state.selectedSampleId) {
        formData.append("sample_id", state.selectedSampleId);
      }

      // Append Patient Demographics
      formData.append("patient_id", patientIdInput ? patientIdInput.value.trim() : "PID-40291");
      formData.append("patient_name", patientNameInput ? patientNameInput.value.trim() : "Eleanor Vance");
      formData.append("patient_age", patientAgeInput ? patientAgeInput.value.trim() : "45");
      formData.append("patient_gender", patientGenderInput ? patientGenderInput.value : "Female");
      formData.append("patient_blood_group", patientBloodInput ? patientBloodInput.value : "A+");
      formData.append("referring_physician", refPhysicianInput ? refPhysicianInput.value.trim() : "Dr. Robert Hayes, MD");
      formData.append("clinical_notes", clinicalNotesInput ? clinicalNotesInput.value.trim() : "Axial study");

      // Append Active Clinician User Details
      formData.append("user_id", currentUserProfile.userId || "USR-8421");
      formData.append("user_name", currentUserProfile.userName || "Dr. Sarah Mitchell, MD");
      formData.append("user_role", currentUserProfile.role || "Consultant Neuro-Radiologist");
      formData.append("user_department", currentUserProfile.department || "Department of Radiodiagnosis & Neuro-Oncology");

      const response = await fetch("/api/predict", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Inference failed.");
      }

      const result = await response.json();
      clearInterval(stageInterval);

      state.currentScanId = result.scan_id;
      state.currentScanData = result;

      renderResults(result);

      loadingState.classList.add("hidden");
      resultsDisplay.classList.remove("hidden");
      analyzeBtn.disabled = false;

    } catch (err) {
      clearInterval(stageInterval);
      loadingState.classList.add("hidden");
      emptyState.classList.remove("hidden");
      analyzeBtn.disabled = false;
      alert("Analysis error: " + err.message);
    }
  }

  /* ==========================================================================
     8. RENDER RESULTS & VISUALIZATIONS
     ========================================================================== */
  function renderResults(data) {
    const isTumor = data.is_tumor;
    resultBanner.className = isTumor ? "result-banner" : "result-banner healthy";
    resultPill.textContent = isTumor ? "SPACE-OCCUPYING MASS DETECTED" : "NO MASS / NORMAL SCAN";
    resultTitle.textContent = data.display_name;
    resultCategory.textContent = data.category;
    confidenceVal.textContent = `${data.confidence}%`;

    // Verified Patient & Clinician Metadata
    const pMeta = data.patient_details || {};
    const uMeta = data.user_details || {};

    if (resPatientName) {
      resPatientName.textContent = pMeta.patient_name || (patientNameInput ? patientNameInput.value : "Eleanor Vance");
    }
    if (resPatientDetails) {
      const pid = pMeta.patient_id || (patientIdInput ? patientIdInput.value : "PID-40291");
      const age = pMeta.patient_age || (patientAgeInput ? patientAgeInput.value : "45");
      const sex = pMeta.patient_gender || (patientGenderInput ? patientGenderInput.value : "Female");
      const bld = pMeta.patient_blood_group || (patientBloodInput ? patientBloodInput.value : "A+");
      const ref = pMeta.referring_physician || (refPhysicianInput ? refPhysicianInput.value : "Dr. Robert Hayes, MD");
      resPatientDetails.textContent = `${pid} • ${age}y / ${sex} • Blood: ${bld} • Ref: ${ref}`;
    }

    if (resClinicianName) {
      resClinicianName.textContent = uMeta.user_name || currentUserProfile.userName;
    }
    if (resClinicianDetails) {
      const uid = uMeta.user_id || currentUserProfile.userId;
      const dept = uMeta.user_department || currentUserProfile.department;
      resClinicianDetails.textContent = `User ID: ${uid} • ${dept}`;
    }

    // Visuals
    resOriginalImg.src = data.original_image;
    resOverlayImg.src = data.gradcam_overlay;

    // Reset viz buttons
    vizButtons.forEach(b => b.classList.remove("active"));
    if (vizButtons[0]) vizButtons[0].classList.add("active");
    state.vizMode = "overlay";
    blendSliderGroup.classList.remove("hidden");
    blendRange.value = 65;
    blendVal.textContent = "65%";
    resOverlayImg.style.opacity = "1";

    // Multi-class probabilities bars
    probBarsGrid.innerHTML = "";
    const probs = data.probabilities || {};
    const sortedEntries = Object.entries(probs).sort((a, b) => b[1].percentage - a[1].percentage);

    sortedEntries.forEach(([key, info]) => {
      const item = document.createElement("div");
      item.className = "prob-item";
      item.innerHTML = `
        <div class="prob-header">
          <span>${info.display_name}</span>
          <span><strong>${info.percentage}%</strong></span>
        </div>
        <div class="prob-track">
          <div class="prob-fill ${key}" style="width: 0%"></div>
        </div>
      `;
      probBarsGrid.appendChild(item);

      setTimeout(() => {
        const fill = item.querySelector(".prob-fill");
        if (fill) fill.style.width = `${info.percentage}%`;
      }, 50);
    });

    // Clinical Information
    resAnatomicalSite.textContent = data.anatomical_site;
    resRiskLevel.textContent = data.risk_level;
    resDescription.textContent = data.description;
    resClinicalRelevance.textContent = data.clinical_relevance;

    if (window.lucide) lucide.createIcons();
  }

  /* ==========================================================================
     9. VIZ TOOLBAR CONTROLS (OVERLAY / HEATMAP / ORIGINAL)
     ========================================================================== */
  vizButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      if (!state.currentScanData) return;
      vizButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const mode = btn.dataset.mode;
      state.vizMode = mode;

      if (mode === "overlay") {
        resOverlayImg.src = state.currentScanData.gradcam_overlay;
        resOverlayImg.style.opacity = (blendRange.value / 100).toString();
        blendSliderGroup.classList.remove("hidden");
      } else if (mode === "heatmap") {
        resOverlayImg.src = state.currentScanData.raw_heatmap || state.currentScanData.gradcam_overlay;
        resOverlayImg.style.opacity = "1";
        blendSliderGroup.classList.add("hidden");
      } else if (mode === "original") {
        resOverlayImg.src = state.currentScanData.original_image;
        resOverlayImg.style.opacity = "1";
        blendSliderGroup.classList.add("hidden");
      }
    });
  });

  if (blendRange) {
    blendRange.addEventListener("input", (e) => {
      const val = e.target.value;
      blendVal.textContent = `${val}%`;
      if (state.vizMode === "overlay") {
        resOverlayImg.style.opacity = (val / 100).toString();
      }
    });
  }

  /* ==========================================================================
     10. PDF EXPORT & PRINT
     ========================================================================== */
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener("click", async () => {
      if (!state.currentScanId) return;

      downloadPdfBtn.disabled = true;
      const originalText = downloadPdfBtn.innerHTML;
      downloadPdfBtn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Generating PDF...`;
      if (window.lucide) lucide.createIcons();

      try {
        const response = await fetch("/api/export-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scan_id: state.currentScanId,
            patient_id: patientIdInput ? patientIdInput.value.trim() : "PID-40291",
            patient_name: patientNameInput ? patientNameInput.value.trim() : "Eleanor Vance",
            patient_age: patientAgeInput ? patientAgeInput.value.trim() : "45",
            patient_gender: patientGenderInput ? patientGenderInput.value : "Female",
            patient_blood_group: patientBloodInput ? patientBloodInput.value : "A+",
            referring_physician: refPhysicianInput ? refPhysicianInput.value.trim() : "Dr. Robert Hayes, MD",
            clinical_notes: clinicalNotesInput ? clinicalNotesInput.value.trim() : "Brain MRI study",
            user_id: currentUserProfile.userId || "USR-8421",
            user_name: currentUserProfile.userName || "Dr. Sarah Mitchell, MD",
            user_role: currentUserProfile.role || "Consultant Neuro-Radiologist",
            user_department: currentUserProfile.department || "Department of Radiodiagnosis & Neuro-Oncology"
          })
        });

        if (!response.ok) {
          throw new Error("PDF generation failed on server.");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `NeuroScan_Report_${state.currentScanId}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

      } catch (err) {
        alert("PDF Error: " + err.message);
      } finally {
        downloadPdfBtn.disabled = false;
        downloadPdfBtn.innerHTML = originalText;
        if (window.lucide) lucide.createIcons();
      }
    });
  }

  if (printReportBtn) {
    printReportBtn.addEventListener("click", () => {
      window.print();
    });
  }

  if (resetScanBtn) {
    resetScanBtn.addEventListener("click", () => {
      resetUpload();
      resultsDisplay.classList.add("hidden");
      emptyState.classList.remove("hidden");
    });
  }

  /* ==========================================================================
     11. TUMOR LIBRARY CONTROLS (SEARCH, FILTERS, MATRIX, DIRECT INSPECT)
     ========================================================================== */
  if (toggleMatrixBtn && comparativeMatrixWrapper) {
    toggleMatrixBtn.addEventListener("click", () => {
      comparativeMatrixWrapper.classList.toggle("hidden");
      toggleMatrixBtn.classList.toggle("active");
    });
  }

  function filterTumorCards() {
    const query = tumorSearchInput ? tumorSearchInput.value.toLowerCase().trim() : "";
    const activeChip = document.querySelector(".lib-chip.active");
    const activeCat = activeChip ? activeChip.dataset.filter : "all";

    const cards = document.querySelectorAll(".knowledge-card");
    cards.forEach(card => {
      const cardCat = card.dataset.category;
      const cardText = card.textContent.toLowerCase();

      const matchesCat = (activeCat === "all") || (cardCat === activeCat);
      const matchesQuery = !query || cardText.includes(query);

      if (matchesCat && matchesQuery) {
        card.style.display = "flex";
      } else {
        card.style.display = "none";
      }
    });
  }

  if (tumorSearchInput) {
    tumorSearchInput.addEventListener("input", filterTumorCards);
  }

  libFilterChips.forEach(chip => {
    chip.addEventListener("click", () => {
      libFilterChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      filterTumorCards();
    });
  });

  // Direct inspect sample from Tumor Library cards
  document.querySelectorAll(".btn-inspect-sample").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const presetKey = btn.dataset.preset;
      applyPatientPreset(presetKey);
      switchTab("scannerView");
    });
  });

  // Initial load of sample scans in background
  loadSamplesGallery();
});
