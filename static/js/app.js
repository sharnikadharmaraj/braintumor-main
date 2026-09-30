/**
 * app.js
 * NeuroScan AI - Brain Tumor Prediction & Explainable AI Frontend Logic
 */

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    lucide.createIcons();
  }

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

  // Accordions
  const metaAccordionTrigger = document.getElementById("metaAccordionTrigger");
  const metaAccordionContent = document.getElementById("metaAccordionContent");

  // Patient inputs
  const patientNameInput = document.getElementById("patientNameInput");
  const patientAgeInput = document.getElementById("patientAgeInput");
  const clinicalNotesInput = document.getElementById("clinicalNotesInput");

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

  const vizButtons = document.querySelectorAll(".viz-btn");
  const blendSliderGroup = document.getElementById("blendSliderGroup");
  const blendRange = document.getElementById("blendRange");
  const blendVal = document.getElementById("blendVal");

  const downloadPdfBtn = document.getElementById("downloadPdfBtn");
  const printReportBtn = document.getElementById("printReportBtn");
  const resetScanBtn = document.getElementById("resetScanBtn");

  /* ==========================================================================
     1. NAVIGATION & TAB SWITCHING
     ========================================================================== */
  navTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetId = tab.dataset.target;
      navTabs.forEach(t => t.classList.remove("active"));
      viewPanels.forEach(p => p.classList.remove("active"));

      tab.classList.add("active");
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add("active");
      }

      if (targetId === "samplesView") {
        loadSamplesGallery();
      }
    });
  });

  /* ==========================================================================
     2. ACCORDION CONTROLS
     ========================================================================== */
  if (metaAccordionTrigger) {
    metaAccordionTrigger.addEventListener("click", () => {
      metaAccordionTrigger.classList.toggle("open");
      metaAccordionContent.classList.toggle("open");
    });
  }

  // Viva Accordion
  document.querySelectorAll(".viva-question").forEach(q => {
    q.addEventListener("click", () => {
      const item = q.closest(".viva-item");
      item.classList.toggle("open");
    });
  });

  /* ==========================================================================
     3. FILE UPLOAD & DRAG/DROP
     ========================================================================== */
  browseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  dropZone.addEventListener("click", () => {
    if (!state.selectedFile && !state.selectedSampleId) {
      fileInput.click();
    }
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleSelectedFile(e.target.files[0]);
    }
  });

  function handleSelectedFile(file) {
    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert("Invalid file format. Please upload a brain MRI scan in PNG, JPG, or WebP format.");
      return;
    }

    // Validate size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      alert("File size exceeds 15 MB limit.");
      return;
    }

    state.selectedFile = file;
    state.selectedSampleId = null;

    // Deselect sample chips
    sampleChips.forEach(c => c.classList.remove("active"));

    // Render Preview
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result;
      previewFileName.textContent = file.name;
      previewFileSize.textContent = (file.size / 1024).toFixed(1) + " KB";
      dropzonePrompt.classList.add("hidden");
      previewContainer.classList.remove("hidden");
      analyzeBtn.disabled = false;
      if (window.lucide) lucide.createIcons();
    };
    reader.readAsDataURL(file);
  }

  removeFileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    resetUpload();
  });

  function resetUpload() {
    state.selectedFile = null;
    state.selectedSampleId = null;
    fileInput.value = "";
    previewImage.src = "";
    previewContainer.classList.add("hidden");
    dropzonePrompt.classList.remove("hidden");
    analyzeBtn.disabled = true;
    sampleChips.forEach(c => c.classList.remove("active"));
  }

  /* ==========================================================================
     4. SAMPLE CHIPS SELECTION
     ========================================================================== */
  sampleChips.forEach(chip => {
    chip.addEventListener("click", () => {
      const sampleFile = chip.dataset.sample;
      selectSample(sampleFile);
      sampleChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
    });
  });

  function selectSample(sampleFileName) {
    state.selectedSampleId = sampleFileName;
    state.selectedFile = null;
    fileInput.value = "";

    previewImage.src = `/static/samples/${sampleFileName}`;
    previewFileName.textContent = sampleFileName;
    previewFileSize.textContent = "Curated MRI Scan";
    dropzonePrompt.classList.add("hidden");
    previewContainer.classList.remove("hidden");
    analyzeBtn.disabled = false;
    if (window.lucide) lucide.createIcons();
  }

  /* ==========================================================================
     5. SAMPLES GALLERY (VIEW 2)
     ========================================================================== */
  let samplesLoaded = false;
  async function loadSamplesGallery() {
    if (samplesLoaded) return;
    try {
      const res = await fetch("/api/samples");
      const data = await res.json();
      renderSamplesGallery(data.samples || []);
      samplesLoaded = true;
    } catch (err) {
      console.error("Error loading sample gallery:", err);
    }
  }

  function renderSamplesGallery(samples) {
    samplesGallery.innerHTML = "";
    samples.forEach(sample => {
      const card = document.createElement("div");
      card.className = "sample-card";
      
      const tagClass = sample.tumor_type.toLowerCase().includes("no") ? "dot-healthy" : "dot-glioma";

      card.innerHTML = `
        <div class="sample-thumb-wrapper">
          <img src="${sample.url}" alt="${sample.title}" loading="lazy">
          <span class="sample-tag"><span class="dot ${tagClass}"></span> ${sample.tumor_type}</span>
        </div>
        <div class="sample-info">
          <div>
            <h4 class="sample-card-title">${sample.title}</h4>
            <p class="sample-card-notes">${sample.notes}</p>
          </div>
          <button type="button" class="btn btn-primary btn-sm test-sample-btn" data-id="${sample.id}">
            <i data-lucide="scan"></i> Load Into Scanner
          </button>
        </div>
      `;

      card.querySelector(".test-sample-btn").addEventListener("click", () => {
        // Switch to scanner view
        navTabs[0].click();
        selectSample(sample.id);
        // Highlight corresponding chip if exists
        sampleChips.forEach(c => {
          c.classList.toggle("active", c.dataset.sample === sample.id);
        });
      });

      samplesGallery.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
  }

  /* ==========================================================================
     6. MODEL INFERENCE & SCAN SIMULATION
     ========================================================================== */
  analyzeBtn.addEventListener("click", runInference);

  async function runInference() {
    if (!state.selectedFile && !state.selectedSampleId) return;

    // Show loading animation
    emptyState.classList.add("hidden");
    resultsDisplay.classList.add("hidden");
    loadingState.classList.remove("hidden");
    analyzeBtn.disabled = true;

    // Simulated multi-stage progress messages
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
     7. RENDER RESULTS & VISUALIZATIONS
     ========================================================================== */
  function renderResults(data) {
    // Diagnosis Banner
    const isTumor = data.is_tumor;
    resultBanner.className = isTumor ? "result-banner" : "result-banner healthy";
    resultPill.textContent = isTumor ? "SPACE-OCCUPYING MASS DETECTED" : "NO MASS / NORMAL SCAN";
    resultTitle.textContent = data.display_name;
    resultCategory.textContent = data.category;
    confidenceVal.textContent = `${data.confidence}%`;

    // Visuals
    resOriginalImg.src = data.original_image;
    resOverlayImg.src = data.gradcam_overlay;

    // Reset viz buttons
    vizButtons.forEach(b => b.classList.remove("active"));
    vizButtons[0].classList.add("active");
    state.vizMode = "overlay";
    blendSliderGroup.classList.remove("hidden");
    blendRange.value = 65;
    blendVal.textContent = "65%";
    resOverlayImg.style.opacity = "1";

    // Multi-class probabilities bars
    probBarsGrid.innerHTML = "";
    const probs = data.probabilities || {};
    
    // Sort classes with highest probability first
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

      // Animate bar fill
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
     8. VIZ TOOLBAR CONTROLS (OVERLAY / HEATMAP / ORIGINAL)
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
        resOverlayImg.src = state.currentScanData.raw_heatmap;
        resOverlayImg.style.opacity = "1";
        blendSliderGroup.classList.add("hidden");
      } else if (mode === "original") {
        resOverlayImg.src = state.currentScanData.original_image;
        resOverlayImg.style.opacity = "1";
        blendSliderGroup.classList.add("hidden");
      }
    });
  });

  // Blend range slider
  blendRange.addEventListener("input", (e) => {
    const val = e.target.value;
    blendVal.textContent = `${val}%`;
    if (state.vizMode === "overlay") {
      resOverlayImg.style.opacity = (val / 100).toString();
    }
  });

  /* ==========================================================================
     9. PDF EXPORT & PRINT
     ========================================================================== */
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
          patient_name: patientNameInput.value.trim() || "Anonymous Patient",
          patient_age: patientAgeInput.value.trim() || "N/A",
          patient_gender: "Unspecified",
          clinical_notes: clinicalNotesInput.value.trim() || "Axial brain MRI diagnostic study"
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

  printReportBtn.addEventListener("click", () => {
    window.print();
  });

  resetScanBtn.addEventListener("click", () => {
    resetUpload();
    resultsDisplay.classList.add("hidden");
    emptyState.classList.remove("hidden");
  });

  // Initial load of sample scans in background
  loadSamplesGallery();
});
