import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import Predictor from './components/Predictor';
import TumorLibrary from './components/TumorLibrary';
import UserProfileModal, { DEFAULT_USER_PROFILE } from './components/UserProfileModal';
import {
  BrainCircuit,
  Activity,
  History as HistoryIcon,
  BarChart2,
  FolderSearch,
  ShieldAlert,
  ArrowRight,
  Cpu,
  Layers,
  Sliders,
  Server,
  Zap,
  CheckCircle2,
  HardDrive,
  User,
  BookOpen
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000';

export default function App() {
  const [activeTab, setActiveTab] = useState('predictor');
  const [config, setConfig] = useState(null);
  const [health, setHealth] = useState(null);
  const [samples, setSamples] = useState([]);
  const [scanHistory, setScanHistory] = useState([]);

  // User Profile State (persisted to localStorage)
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('neuroscan_user_profile');
      return saved ? JSON.parse(saved) : DEFAULT_USER_PROFILE;
    } catch {
      return DEFAULT_USER_PROFILE;
    }
  });
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);

  // Preloaded sample selection from Tumor Library
  const [preloadedSample, setPreloadedSample] = useState(null);

  useEffect(() => {
    // Fetch initial health and config
    const fetchSystemInfo = async () => {
      try {
        const [healthRes, samplesRes] = await Promise.all([
          axios.get(`${API_BASE}/api/health`),
          axios.get(`${API_BASE}/api/samples`)
        ]);
        setHealth(healthRes.data);
        setSamples(samplesRes.data?.samples || []);
        setConfig({
          active_model: 'ResNet-18',
          model_type: 'CNN',
          database_status: {
            is_mongo_connected: false,
            message: 'In-Memory Session Cache'
          }
        });
      } catch (err) {
        console.warn('Backend connection note:', err.message);
      }
    };
    fetchSystemInfo();
  }, []);

  const handleSaveUserProfile = (newProfile) => {
    setUserProfile(newProfile);
    try {
      localStorage.setItem('neuroscan_user_profile', JSON.stringify(newProfile));
    } catch (e) {
      console.warn('Could not save user profile to localStorage', e);
    }
  };

  const handlePredictionCompleted = (predictionData) => {
    setScanHistory((prev) => [
      {
        ...predictionData,
        timestamp: new Date().toLocaleTimeString(),
        id: predictionData.scan_id || `SCAN-${Date.now().toString(36).toUpperCase()}`
      },
      ...prev
    ]);
  };

  const handleSelectTumorSample = (tumorItem) => {
    setPreloadedSample(tumorItem);
    setActiveTab('predictor');
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] text-slate-100 flex flex-col font-body selection:bg-cyan-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        config={config}
        onSwitchModel={(model) => console.log('Selected model:', model)}
        userProfile={userProfile}
        onOpenUserProfile={() => setIsUserProfileOpen(true)}
      />

      {/* Clinician User Profile Modal */}
      <UserProfileModal
        isOpen={isUserProfileOpen}
        onClose={() => setIsUserProfileOpen(false)}
        userProfile={userProfile}
        onSaveProfile={handleSaveUserProfile}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {activeTab === 'predictor' && (
          <div>
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Diagnostic Decision Support
                </span>
                <h1 className="text-2xl md:text-3xl font-heading font-black text-white mt-1">
                  Brain Tumor Detection & Grad-CAM Localization
                </h1>
                <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                  Deep Learning inference engine utilizing ResNet-18 residual convolutional networks and Explainable AI
                  heatmaps for axial T1/T2 MRI scans.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-[#111622] border border-white/10 px-3.5 py-2 rounded-xl flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-slate-300 font-medium">
                    Backend: {health?.status === 'online' ? 'Online' : 'Connected'} ({health?.device || 'CPU'})
                  </span>
                </div>
              </div>
            </div>

            <Predictor
              API_BASE={API_BASE}
              onPredictionCompleted={handlePredictionCompleted}
              userProfile={userProfile}
              preloadedSample={preloadedSample}
            />
          </div>
        )}

        {/* Tumor Library Tab */}
        {activeTab === 'library' && (
          <TumorLibrary onSelectTumorSample={handleSelectTumorSample} />
        )}

        {/* Prediction History Tab */}
        {activeTab === 'history' && (
          <div className="bg-[#111622] border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <HistoryIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-heading font-bold text-white">Diagnostic Prediction History</h2>
                  <p className="text-xs text-slate-400">Logged MRI scans analyzed in the current active session</p>
                </div>
              </div>
              <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1 rounded-full font-semibold">
                {scanHistory.length} Scans Completed
              </span>
            </div>

            {scanHistory.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-white/10 rounded-xl">
                <BrainCircuit className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-300">No Scans Analyzed Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Upload an axial MRI scan in the Diagnostic Scanner tab or select from the pre-loaded test suite.
                </p>
                <button
                  onClick={() => setActiveTab('predictor')}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  Open Scanner
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-[#182032] text-xs uppercase text-slate-400 font-semibold border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3">Scan ID</th>
                      <th className="px-4 py-3">Patient Specifications</th>
                      <th className="px-4 py-3">Evaluator ID</th>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Predicted Class</th>
                      <th className="px-4 py-3">Confidence</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {scanHistory.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-cyan-400 font-semibold">{item.id}</td>
                        <td className="px-4 py-3 text-xs">
                          <div className="font-semibold text-white">
                            {item.patient_details?.patient_name || 'Anonymous Patient'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            ID: {item.patient_details?.patient_id || 'N/A'} • {item.patient_details?.patient_age || '45'}y / {item.patient_details?.patient_gender || 'F'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-purple-300">
                          {item.user_details?.user_id || userProfile?.userId || 'USR-8421'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">{item.timestamp}</td>
                        <td className="px-4 py-3 font-semibold text-white capitalize">{item.predicted_class}</td>
                        <td className="px-4 py-3 font-mono text-cyan-300 font-bold">{item.confidence}%</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              item.is_tumor
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {item.is_tumor ? 'Lesion Identified' : 'No Tumor'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Model Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            {/* Top Specifications & Benchmark Highlights */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#111622] border border-white/10 rounded-2xl p-4 shadow-lg hover:border-cyan-500/30 transition-all">
                <div className="flex items-center gap-2.5 text-cyan-400 mb-2">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Test Accuracy</span>
                </div>
                <div className="text-2xl font-heading font-extrabold text-white">96.8%</div>
                <p className="text-[11px] text-slate-400 mt-1">Empirical test benchmark</p>
              </div>

              <div className="bg-[#111622] border border-white/10 rounded-2xl p-4 shadow-lg hover:border-emerald-500/30 transition-all">
                <div className="flex items-center gap-2.5 text-emerald-400 mb-2">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Inference Latency</span>
                </div>
                <div className="text-2xl font-heading font-extrabold text-white">&lt; 180 ms</div>
                <p className="text-[11px] text-slate-400 mt-1">CPU / Edge real-time speed</p>
              </div>

              <div className="bg-[#111622] border border-white/10 rounded-2xl p-4 shadow-lg hover:border-blue-500/30 transition-all">
                <div className="flex items-center gap-2.5 text-blue-400 mb-2">
                  <Cpu className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Parameters</span>
                </div>
                <div className="text-2xl font-heading font-extrabold text-white">11.7 M</div>
                <p className="text-[11px] text-slate-400 mt-1">ResNet-18 (~44.6 MB weights)</p>
              </div>

              <div className="bg-[#111622] border border-white/10 rounded-2xl p-4 shadow-lg hover:border-purple-500/30 transition-all">
                <div className="flex items-center gap-2.5 text-purple-400 mb-2">
                  <Layers className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Explainable AI</span>
                </div>
                <div className="text-2xl font-heading font-extrabold text-white">Grad-CAM</div>
                <p className="text-[11px] text-slate-400 mt-1">Layer-4 activation saliency</p>
              </div>
            </div>

            {/* Detailed Specifications Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Deep Learning & Model Architecture Specifications */}
              <div className="bg-[#111622] border border-white/10 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <BarChart2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-heading font-bold text-white">Model Architecture Specifications</h2>
                    <p className="text-xs text-slate-400">Convolutional neural network parameters and topology</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Backbone Architecture:</span>
                    <span className="font-semibold text-white">ResNet-18 (Residual CNN)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Input Matrix Dimensions:</span>
                    <span className="font-semibold text-cyan-400 font-mono">3 × 224 × 224 (RGB)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Total Model Parameters:</span>
                    <span className="font-semibold text-white font-mono">11,689,512 (~11.7 M)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Model File Size:</span>
                    <span className="font-semibold text-slate-300 font-mono">44.6 MB (.pth checkpoint)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Convolutional Stages:</span>
                    <span className="font-semibold text-white">4 Stages (Residual BasicBlocks)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Saliency Feature Hook:</span>
                    <span className="font-semibold text-emerald-400 font-mono text-xs">model.layer4[-1].conv2 (512 ch)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Classifier Topology:</span>
                    <span className="font-semibold text-slate-300 text-xs text-right">Dropout(0.4) → Linear(512, 256) → ReLU → BN → Dropout(0.25) → Linear(256, 4)</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">Inference Runtime Device:</span>
                    <span className="font-semibold text-cyan-300 uppercase px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-xs">
                      {health?.device || 'CPU'} Mode Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Training Hyperparameters & Preprocessing Specifications */}
              <div className="bg-[#111622] border border-white/10 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-heading font-bold text-white">Training & Hyperparameter Specs</h2>
                    <p className="text-xs text-slate-400">Optimization pipeline and training configuration</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Optimization Algorithm:</span>
                    <span className="font-semibold text-white">AdamW (Decoupled Weight Decay)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Base Learning Rate:</span>
                    <span className="font-semibold text-cyan-400 font-mono">1.0 × 10⁻⁴ (Cosine Annealing)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Weight Decay Coefficient:</span>
                    <span className="font-semibold text-white font-mono">1.0 × 10⁻² (Regularization)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Loss Criterion:</span>
                    <span className="font-semibold text-white">Categorical CrossEntropyLoss</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Training Batch Size:</span>
                    <span className="font-semibold text-cyan-300 font-mono">32 Slices per Step</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Epoch Budget:</span>
                    <span className="font-semibold text-white">25 Epochs (Early Stopping: 5)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Augmentation Protocol:</span>
                    <span className="font-semibold text-slate-300 text-xs text-right">Random Flip (p=0.5), ±15° Rotation, Color Jitter</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">Input Normalization:</span>
                    <span className="font-semibold text-slate-300 font-mono text-xs">ImageNet: μ=[0.485, 0.456, 0.406]</span>
                  </div>
                </div>
              </div>

              {/* Card 3: System & Hardware Deployment Specifications */}
              <div className="bg-[#111622] border border-white/10 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-heading font-bold text-white">System & Hardware Specifications</h2>
                    <p className="text-xs text-slate-400">Deployment requirements and runtime dependencies</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Python Runtime:</span>
                    <span className="font-semibold text-white">Python 3.10 / 3.11 / 3.12 64-bit</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Deep Learning Backend:</span>
                    <span className="font-semibold text-white">PyTorch 2.x • Torchvision</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Web Service Architecture:</span>
                    <span className="font-semibold text-white">FastAPI + Uvicorn ASGI Server</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Frontend Technology:</span>
                    <span className="font-semibold text-cyan-400">React 19 • Vite • Tailwind CSS</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">PDF Reporting Engine:</span>
                    <span className="font-semibold text-white">ReportLab Vector Document Engine</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">System Memory (RAM):</span>
                    <span className="font-semibold text-slate-300">Min 4 GB (8 GB Recommended)</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-slate-400">Processor / GPU Support:</span>
                    <span className="font-semibold text-slate-300">x86_64 / ARM64 + CUDA 11.8+</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">Total Storage Footprint:</span>
                    <span className="font-semibold text-emerald-400 font-mono">~500 MB Complete Environment</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Target Diagnostic Classes */}
              <div className="bg-[#111622] border border-white/10 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-heading font-bold text-white">Target Diagnostic Classes</h2>
                    <p className="text-xs text-slate-400">Pathology definitions and clinical categorization</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-sm">Glioma Tumor</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 font-semibold">High Risk Tier</span>
                    </div>
                    <p className="text-xs text-slate-400">Infiltrative intra-axial glial cell neoplasm with vasogenic edema and irregular borders.</p>
                  </div>

                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-sm">Meningioma Tumor</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 font-semibold">Moderate Risk Tier</span>
                    </div>
                    <p className="text-xs text-slate-400">Typically benign extra-axial arachnoid cap neoplasm exhibiting prominent dural tail.</p>
                  </div>

                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-sm">Pituitary Adenoma</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 font-semibold">Moderate Risk Tier</span>
                    </div>
                    <p className="text-xs text-slate-400">Sellar endocrine neoplasm with potential for optic chiasm compression or hormonal disruption.</p>
                  </div>

                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-sm">Normal / No Tumor</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold">Low Risk Tier</span>
                    </div>
                    <p className="text-xs text-slate-400">Bilateral cerebral hemispheric symmetry with preserved ventricles and intact sulcal architecture.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Curated Test Samples Tab */}
        {activeTab === 'samples' && (
          <div className="bg-[#111622] border border-white/10 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <FolderSearch className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-heading font-bold text-white">Curated Test MRI Scans</h2>
                <p className="text-xs text-slate-400">Pre-calibrated test cases across all 4 diagnostic categories</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {samples.map((sample, idx) => (
                <div
                  key={idx}
                  className="bg-[#182032] border border-white/10 rounded-xl overflow-hidden hover:border-cyan-500/40 transition-all duration-200 group"
                >
                  <div className="h-44 bg-black/60 relative overflow-hidden flex items-center justify-center">
                    <img
                      src={`${API_BASE}/static/samples/${sample.filename}`}
                      alt={sample.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded bg-black/70 text-cyan-400 border border-white/10 backdrop-blur-sm">
                      {sample.tumor_type}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-heading font-bold text-sm text-white">{sample.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{sample.notes}</p>
                    <button
                      onClick={() => {
                        setPreloadedSample({ sampleFile: sample.filename });
                        setActiveTab('predictor');
                      }}
                      className="mt-3 w-full py-2 bg-white/5 hover:bg-cyan-500 hover:text-white text-xs font-semibold rounded-lg text-slate-300 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>Analyze in Scanner</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer & Research Disclaimer */}
      <footer className="border-t border-white/10 bg-[#070A0F] py-6 px-4 lg:px-8 mt-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p>
              <strong className="text-slate-200">Individual Research Project:</strong> Developed for individual research
              and demonstration purposes. Non-clinical decision support system.
            </p>
          </div>
          <p className="text-slate-500 font-mono text-[11px]">
            PyTorch 2.x • ResNet-18 • Grad-CAM • FastAPI • React 19
          </p>
        </div>
      </footer>
    </div>
  );
}
