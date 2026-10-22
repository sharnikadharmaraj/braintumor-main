import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Cpu,
  ArrowRight,
  ShieldAlert,
  User,
  FileDown,
  Printer,
  RefreshCw,
  Layers,
  Sparkles,
  Stethoscope,
  Heart,
  Calendar,
  Flame,
  RotateCcw
} from 'lucide-react';

export const PATIENT_PRESETS = [
  {
    label: 'Case 1: Suspected Glioma',
    patientId: 'PID-40291',
    patientName: 'Eleanor Vance',
    age: '45',
    gender: 'Female',
    bloodGroup: 'A+',
    referringPhysician: 'Dr. Robert Hayes, MD (Neurology)',
    clinicalNotes: 'Intractable morning cephalalgia for 6 weeks, nausea, focal motor seizure in left arm.',
    sampleFile: 'glioma_sample.jpg'
  },
  {
    label: 'Case 2: Dural Meningioma',
    patientId: 'PID-38104',
    patientName: 'Marcus Chen',
    age: '52',
    gender: 'Male',
    bloodGroup: 'O+',
    referringPhysician: 'Dr. Lisa Thorne, MD (Neuro-Surgery)',
    clinicalNotes: 'Chronic progressive right convexity headaches, transient sensory deficit, no papilledema.',
    sampleFile: 'meningioma_sample.jpg'
  },
  {
    label: 'Case 3: Sellar Macroadenoma',
    patientId: 'PID-71920',
    patientName: 'Sophia Davis',
    age: '39',
    gender: 'Female',
    bloodGroup: 'B+',
    referringPhysician: 'Dr. Alan Moore, MD (Endocrinology)',
    clinicalNotes: 'Bitemporal hemianopsia, chronic hyperprolactinemia, visual acuity drop in left eye.',
    sampleFile: 'pituitary_sample.jpg'
  },
  {
    label: 'Case 4: Normal Screening Control',
    patientId: 'PID-19402',
    patientName: 'David Wilson',
    age: '31',
    gender: 'Male',
    bloodGroup: 'O-',
    referringPhysician: 'Dr. Emily Watson, MD (General Medicine)',
    clinicalNotes: 'Post-concussive routine screening MRI. Neurologically intact, normal cranial reflexes.',
    sampleFile: 'notumor_sample.jpg'
  }
];

export default function Predictor({ API_BASE, onPredictionCompleted, userProfile, preloadedSample }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedSampleId, setSelectedSampleId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stageText, setStageText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Visualization Mode: 'overlay' | 'heatmap' | 'original'
  const [vizMode, setVizMode] = useState('overlay');
  const [blendOpacity, setBlendOpacity] = useState(65);
  const [pdfDownloading, setPdfDownloading] = useState(false);

  // Patient Specifications State
  const [patientId, setPatientId] = useState('PID-40291');
  const [patientName, setPatientName] = useState('Eleanor Vance');
  const [patientAge, setPatientAge] = useState('45');
  const [patientGender, setPatientGender] = useState('Female');
  const [patientBloodGroup, setPatientBloodGroup] = useState('A+');
  const [referringPhysician, setReferringPhysician] = useState('Dr. Robert Hayes, MD');
  const [clinicalNotes, setClinicalNotes] = useState('Intractable morning cephalalgia for 6 weeks, nausea, focal seizures.');

  const fileInputRef = useRef(null);

  // Handle external preloaded sample (e.g. from TumorLibrary)
  useEffect(() => {
    if (preloadedSample) {
      selectSample(preloadedSample.sampleFile || preloadedSample.sample_file || 'glioma_sample.jpg');
    }
  }, [preloadedSample]);

  const handleFile = (file) => {
    if (!file) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Unsupported file type. Please upload a brain MRI scan in PNG, JPG, or WebP format.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('File size exceeds the 15 MB limit.');
      return;
    }

    setError(null);
    setSelectedFile(file);
    setSelectedSampleId(null);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const selectSample = (sampleFileName) => {
    setError(null);
    setSelectedFile(null);
    setSelectedSampleId(sampleFileName);
    setPreviewUrl(`${API_BASE}/static/samples/${sampleFileName}`);
  };

  const handleApplyPreset = (preset) => {
    setPatientId(preset.patientId);
    setPatientName(preset.patientName);
    setPatientAge(preset.age);
    setPatientGender(preset.gender);
    setPatientBloodGroup(preset.bloodGroup);
    setReferringPhysician(preset.referringPhysician);
    setClinicalNotes(preset.clinicalNotes);
    selectSample(preset.sampleFile);
  };

  const handleGeneratePatientId = () => {
    const randomId = `PID-${Math.floor(10000 + Math.random() * 90000)}`;
    setPatientId(randomId);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setSelectedFile(null);
    setSelectedSampleId(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runPrediction = async () => {
    if (!selectedFile && !selectedSampleId) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const stages = [
      'Phase 1: Validating DICOM / Axial Matrix Dimensions...',
      'Phase 2: Resizing (224×224) & Normalizing Pixel Tensors [0.0, 1.0]...',
      'Phase 3: ResNet-18 Residual Convolutional Feature Extraction...',
      'Phase 4: Computing Layer 4 Grad-CAM Activation Gradients...',
      'Phase 5: Associating Patient & Clinician Specifications...'
    ];

    let step = 0;
    const interval = setInterval(() => {
      step = (step + 1) % stages.length;
      setStageText(stages[step]);
    }, 400);

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      } else if (selectedSampleId) {
        formData.append('sample_id', selectedSampleId);
      }

      // Patient Demographics
      formData.append('patient_id', patientId || 'PID-40291');
      formData.append('patient_name', patientName || 'Anonymous Patient');
      formData.append('patient_age', patientAge || 'N/A');
      formData.append('patient_gender', patientGender || 'Unspecified');
      formData.append('patient_blood_group', patientBloodGroup || 'O+');
      formData.append('referring_physician', referringPhysician || 'Dr. Robert Hayes, MD');
      formData.append('clinical_notes', clinicalNotes || 'Axial brain MRI diagnostic study');

      // Clinician / Operator Specifications
      formData.append('user_id', userProfile?.userId || 'USR-8421');
      formData.append('user_name', userProfile?.userName || 'Dr. Sarah Mitchell, MD');
      formData.append('user_role', userProfile?.role || 'Neuro-Oncology Radiologist');
      formData.append('user_department', userProfile?.department || 'Department of Radiodiagnosis & Neuro-Oncology');

      const res = await axios.post(`${API_BASE}/api/predict`, formData);
      clearInterval(interval);
      setResult(res.data);
      if (onPredictionCompleted) {
        onPredictionCompleted(res.data);
      }
    } catch (err) {
      clearInterval(interval);
      setError(err.response?.data?.error || err.response?.data?.detail || err.message || 'Prediction failed.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPdfReport = async () => {
    if (!result?.scan_id) return;
    setPdfDownloading(true);

    try {
      const response = await axios.post(
        `${API_BASE}/api/export-pdf`,
        {
          scan_id: result.scan_id,
          patient_id: patientId,
          patient_name: patientName,
          patient_age: patientAge,
          patient_gender: patientGender,
          patient_blood_group: patientBloodGroup,
          referring_physician: referringPhysician,
          clinical_notes: clinicalNotes,
          user_id: userProfile?.userId || 'USR-8421',
          user_name: userProfile?.userName || 'Dr. Sarah Mitchell, MD',
          user_role: userProfile?.role || 'Neuro-Oncology Radiologist',
          user_department: userProfile?.department || 'Department of Radiodiagnosis & Neuro-Oncology'
        },
        { responseType: 'blob' }
      );

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `NeuroScan_Report_${result.scan_id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('PDF generation error: ' + (err.response?.data?.detail || err.message));
    } finally {
      setPdfDownloading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Input Column */}
      <div className="lg:col-span-5 space-y-6">
        {/* Upload & Scanner Card */}
        <div className="bg-[#111622] border border-white/10 rounded-2xl p-6 shadow-xl shadow-black/40">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-bold text-lg text-white flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-cyan-400" />
              Upload Brain MRI Scan
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Axial T1/T2 View
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Upload an axial or coronal neuroimaging cross-section to perform deep convolutional feature analysis, detect space-occupying lesions, and generate Grad-CAM heatmaps.
          </p>

          {/* Dropzone */}
          <div
            onClick={() => !previewUrl && fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
            }}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 relative overflow-hidden ${
              previewUrl
                ? 'border-cyan-500/40 bg-black/40'
                : 'border-white/15 bg-black/20 hover:border-cyan-400 hover:bg-cyan-500/5'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
            />

            {!previewUrl ? (
              <div className="py-6">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <p className="font-semibold text-sm text-slate-200 mb-1">
                  Drag & Drop Brain MRI Scan Here
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  or <span className="text-cyan-400 underline font-medium">browse local filesystem</span>
                </p>
                <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">PNG</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">JPG</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">WebP</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">&lt; 15MB</span>
                </div>
              </div>
            ) : (
              <div className="relative group max-h-72 flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="MRI Preview"
                  className="max-h-72 max-w-full rounded-lg object-contain shadow-md"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90 p-3 flex items-end justify-between rounded-lg">
                  <span className="text-xs font-medium text-white truncate max-w-[200px]">
                    {selectedFile ? selectedFile.name : selectedSampleId}
                  </span>
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="p-1.5 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition"
                    title="Remove image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick 1-Click Case Presets */}
          <div className="mt-4">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              1-Click Patient & Scan Presets:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PATIENT_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={`p-2 rounded-lg text-left border text-xs transition ${
                    selectedSampleId === preset.sampleFile
                      ? 'border-cyan-500 bg-cyan-500/10 text-white'
                      : 'border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <div className="font-semibold truncate">{preset.label}</div>
                  <div className="text-[10px] text-slate-400 truncate">{preset.patientName} • {preset.patientId}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Error notification */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-xs text-red-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            disabled={!previewUrl || loading}
            onClick={runPrediction}
            className={`mt-5 w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg ${
              !previewUrl || loading
                ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-400'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-95 shadow-cyan-500/25 active:scale-[0.99]'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>{loading ? 'Executing Deep Learning Inference...' : 'Run Deep Learning Diagnostic'}</span>
          </button>
        </div>

        {/* Patient Demographics & Clinical Specifications Card */}
        <div className="bg-[#111622] border border-white/10 rounded-2xl p-6 shadow-xl shadow-black/40 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-cyan-400" />
              <h3 className="font-heading font-bold text-base text-white">
                Patient Demographics & Specifications
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Study Metadata</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
                <span>Patient Case ID</span>
                <button
                  type="button"
                  onClick={handleGeneratePatientId}
                  className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-2.5 h-2.5" /> New
                </button>
              </label>
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full bg-[#182032] border border-white/10 rounded-lg px-2.5 py-1.5 font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                placeholder="e.g. PID-40291"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Patient Full Name
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full bg-[#182032] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                placeholder="e.g. Eleanor Vance"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Age & Gender
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  className="w-1/2 bg-[#182032] border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                  placeholder="Age"
                />
                <select
                  value={patientGender}
                  onChange={(e) => setPatientGender(e.target.value)}
                  className="w-1/2 bg-[#182032] border border-white/10 rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Blood Group
              </label>
              <select
                value={patientBloodGroup}
                onChange={(e) => setPatientBloodGroup(e.target.value)}
                className="w-full bg-[#182032] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="A+">A Positive (A+)</option>
                <option value="A-">A Negative (A-)</option>
                <option value="B+">B Positive (B+)</option>
                <option value="B-">B Negative (B-)</option>
                <option value="AB+">AB Positive (AB+)</option>
                <option value="AB-">AB Negative (AB-)</option>
                <option value="O+">O Positive (O+)</option>
                <option value="O-">O Negative (O-)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Referring Physician
            </label>
            <input
              type="text"
              value={referringPhysician}
              onChange={(e) => setReferringPhysician(e.target.value)}
              className="w-full bg-[#182032] border border-white/10 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
              placeholder="e.g. Dr. Robert Hayes, MD (Neurology)"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Clinical Indication & History of Symptoms
            </label>
            <textarea
              rows={2}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              className="w-full bg-[#182032] border border-white/10 rounded-lg p-2.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 resize-none"
              placeholder="e.g. Progressive morning cephalalgia, nausea, focal seizures..."
            />
          </div>

          {/* Active Clinician Footer Tag */}
          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Evaluating Operator:</span>
            <span className="font-semibold text-cyan-300">
              {userProfile?.userName || 'Dr. Sarah Mitchell, MD'} ({userProfile?.userId || 'USR-8421'})
            </span>
          </div>
        </div>
      </div>

      {/* Right Results Column */}
      <div className="lg:col-span-7 bg-[#111622] border border-white/10 rounded-2xl p-6 shadow-xl shadow-black/40 min-h-[550px]">
        {/* Loading State */}
        {loading && (
          <div className="py-24 text-center">
            <div className="relative w-28 h-28 mx-auto mb-6 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 overflow-hidden shadow-xl shadow-cyan-500/20">
              <Cpu className="w-12 h-12" />
              <div className="laser-beam absolute top-0 left-0 right-0 h-1 bg-white shadow-[0_0_12px_3px_#06B6D4]"></div>
            </div>
            <h3 className="font-heading font-bold text-lg text-white mb-2">Analyzing Neuroimaging Features...</h3>
            <p className="text-xs text-cyan-400 font-medium mb-6 animate-pulse">{stageText}</p>
            <div className="w-64 h-1.5 bg-slate-800 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full animate-pulse w-3/4"></div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !result && (
          <div className="py-24 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-slate-500">
              <Cpu className="w-8 h-8" />
            </div>
            <h3 className="font-heading font-bold text-lg text-white mb-1">Diagnostic Pipeline Idle</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
              Upload a brain MRI scan or select one of the calibrated 1-click clinical case presets on the left to initiate model inference and Grad-CAM localization.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">1. Preprocess</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">2. ResNet-18</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">3. Grad-CAM XAI</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">4. PDF Export</span>
            </div>
          </div>
        )}

        {/* Active Result State */}
        {!loading && result && (
          <div className="space-y-5 animate-fadeIn">
            {/* Header Banner */}
            <div
              className={`p-5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                result.is_tumor
                  ? 'bg-rose-500/10 border-rose-500/30'
                  : 'bg-emerald-500/10 border-emerald-500/30'
              }`}
            >
              <div>
                <span
                  className={`inline-block text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-1.5 text-white ${
                    result.is_tumor ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                >
                  {result.is_tumor ? 'Space-Occupying Lesion Identified' : 'No Tumor / Normal Scan'}
                </span>
                <h1 className="font-heading font-extrabold text-2xl text-white">
                  {result.display_name}
                </h1>
                <p className="text-xs text-slate-300 mt-0.5">{result.category}</p>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`w-20 h-20 rounded-full bg-black/40 border-2 flex flex-col items-center justify-center ${
                    result.is_tumor ? 'border-rose-500' : 'border-emerald-500'
                  }`}
                >
                  <span className="font-heading font-extrabold text-xl text-white">
                    {result.confidence}%
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400">Confidence</span>
                </div>
              </div>
            </div>

            {/* Verified Patient Demographics & Evaluating Clinician Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 bg-slate-900/60 border border-white/10 rounded-xl text-xs">
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Patient Specifications:
                </div>
                <div className="text-white font-semibold">
                  {patientName} <span className="font-mono text-cyan-300">({patientId})</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Age: {patientAge} • Sex: {patientGender} • Blood: <span className="text-rose-400 font-bold">{patientBloodGroup}</span>
                </div>
                <div className="text-slate-400 text-[11px] truncate">
                  Ref: {referringPhysician}
                </div>
              </div>

              <div className="space-y-1 md:border-l md:border-white/10 md:pl-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                  <Stethoscope className="w-3 h-3" />
                  Evaluating Clinician / Operator:
                </div>
                <div className="text-white font-semibold">
                  {userProfile?.userName || 'Dr. Sarah Mitchell, MD'}
                </div>
                <div className="text-slate-400 text-[11px]">
                  User ID: <code className="font-mono text-cyan-400">{userProfile?.userId || 'USR-8421'}</code> • {userProfile?.role?.split(' ')[0] || 'Radiologist'}
                </div>
                <div className="text-slate-400 text-[11px] truncate">
                  {userProfile?.department || 'Neuro-Radiology & Oncology'}
                </div>
              </div>
            </div>

            {/* Explainable AI Visualizations: Grad-CAM / Heatmap / Original */}
            <div className="bg-[#182032] border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Explainable AI Grad-CAM Visualization
                  </span>
                </div>

                {/* Mode Toggles */}
                <div className="flex items-center bg-black/40 p-1 rounded-lg border border-white/10 text-xs">
                  <button
                    onClick={() => setVizMode('overlay')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      vizMode === 'overlay' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Overlay
                  </button>
                  <button
                    onClick={() => setVizMode('heatmap')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      vizMode === 'heatmap' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Heatmap
                  </button>
                  <button
                    onClick={() => setVizMode('original')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      vizMode === 'original' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Original MRI
                  </button>
                </div>
              </div>

              {/* Visualization Canvas */}
              <div className="relative bg-black rounded-xl overflow-hidden flex items-center justify-center min-h-[260px] border border-white/5">
                {vizMode === 'overlay' && (
                  <div className="relative max-h-72">
                    <img
                      src={result.original_image}
                      alt="Original"
                      className="max-h-72 object-contain"
                    />
                    <img
                      src={result.gradcam_overlay}
                      alt="Grad-CAM"
                      style={{ opacity: blendOpacity / 100 }}
                      className="max-h-72 object-contain absolute inset-0 mix-blend-screen pointer-events-none"
                    />
                  </div>
                )}
                {vizMode === 'heatmap' && (
                  <img
                    src={result.raw_heatmap || result.gradcam_overlay}
                    alt="Saliency Heatmap"
                    className="max-h-72 object-contain"
                  />
                )}
                {vizMode === 'original' && (
                  <img
                    src={result.original_image}
                    alt="Original MRI"
                    className="max-h-72 object-contain"
                  />
                )}
              </div>

              {/* Blend Opacity Slider */}
              {vizMode === 'overlay' && (
                <div className="flex items-center justify-between text-xs text-slate-400 px-2 pt-1">
                  <span>Heatmap Transparency Blend:</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={blendOpacity}
                      onChange={(e) => setBlendOpacity(Number(e.target.value))}
                      className="w-32 accent-cyan-400"
                    />
                    <span className="font-mono text-cyan-300 w-8 text-right">{blendOpacity}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Probability Breakdown */}
            <div className="bg-[#182032] border border-white/10 rounded-xl p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Multi-Class Softmax Probability Distribution
              </h4>
              <div className="space-y-2.5">
                {Object.entries(result.probabilities || {})
                  .sort((a, b) => b[1].percentage - a[1].percentage)
                  .map(([key, item]) => {
                    const colorMap = {
                      glioma: 'bg-rose-500',
                      meningioma: 'bg-amber-500',
                      pituitary: 'bg-purple-500',
                      notumor: 'bg-emerald-500'
                    };
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-200">{item.display_name}</span>
                          <span className="text-white font-mono">{item.percentage}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${colorMap[key] || 'bg-cyan-500'}`}
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Clinical Overview */}
            <div className="bg-[#182032] border border-white/10 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-300 uppercase tracking-wider">
                <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                Pathological Assessment & Anatomical Site
              </div>
              <p className="text-slate-300 leading-relaxed">{result.description}</p>
              <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-400">
                  Site: <strong className="text-slate-200">{result.anatomical_site}</strong>
                </span>
                <span className="font-semibold text-white">
                  Risk Tier: <span className="text-cyan-400">{result.risk_level}</span>
                </span>
              </div>
            </div>

            {/* Action Bar: PDF Report & Print */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={downloadPdfReport}
                disabled={pdfDownloading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
              >
                <FileDown className="w-4 h-4" />
                <span>{pdfDownloading ? 'Generating PDF...' : 'Download Clinical PDF Report'}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-semibold text-xs flex items-center gap-2 transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setSelectedFile(null);
                  setSelectedSampleId(null);
                  setPreviewUrl(null);
                }}
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold text-xs flex items-center gap-2 transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>New Scan</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
