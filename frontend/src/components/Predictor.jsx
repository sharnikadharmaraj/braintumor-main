import React, { useState, useRef } from 'react';
import axios from 'axios';
import { UploadCloud, Image as ImageIcon, Trash2, CheckCircle, AlertTriangle, Cpu, ArrowRight, ShieldAlert } from 'lucide-react';

export default function Predictor({ API_BASE, onPredictionCompleted }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedSampleId, setSelectedSampleId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stageText, setStageText] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

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
      'Phase 3: Convolutional Feature Extraction in Keras...',
      'Phase 4: Multi-Class Softmax Posterior Calculation...',
      'Phase 5: Committing Record to MongoDB Database...'
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

      const res = await axios.post(`${API_BASE}/api/predict`, formData);
      clearInterval(interval);
      setResult(res.data);
      if (onPredictionCompleted) {
        onPredictionCompleted(res.data);
      }
    } catch (err) {
      clearInterval(interval);
      setError(err.response?.data?.error || err.message || 'Prediction failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Input Column */}
      <div className="lg:col-span-5 bg-[#111622] border border-white/10 rounded-2xl p-6 shadow-xl shadow-black/40">
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
          Upload a neuroimaging cross-section to perform deep convolutional feature analysis, detect space-occupying lesions, and classify pathology.
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

        {/* Quick Sample Selector */}
        <div className="mt-4">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Quick Test with Pre-Configured Scans:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => selectSample('glioma_sample.jpg')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition ${
                selectedSampleId === 'glioma_sample.jpg'
                  ? 'border-red-500 bg-red-500/10 text-white'
                  : 'border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/5'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-500"></span>
              Glioma Mass
            </button>

            <button
              type="button"
              onClick={() => selectSample('meningioma_sample.jpg')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition ${
                selectedSampleId === 'meningioma_sample.jpg'
                  ? 'border-amber-500 bg-amber-500/10 text-white'
                  : 'border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/5'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500"></span>
              Meningioma
            </button>

            <button
              type="button"
              onClick={() => selectSample('pituitary_sample.jpg')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition ${
                selectedSampleId === 'pituitary_sample.jpg'
                  ? 'border-purple-500 bg-purple-500/10 text-white'
                  : 'border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/5'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-500 shadow-sm shadow-purple-500"></span>
              Pituitary Mass
            </button>

            <button
              type="button"
              onClick={() => selectSample('notumor_sample.jpg')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition ${
                selectedSampleId === 'notumor_sample.jpg'
                  ? 'border-emerald-500 bg-emerald-500/10 text-white'
                  : 'border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/5'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500"></span>
              Healthy Normal
            </button>
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
          <span>{loading ? 'Executing Deep Learning Inference...' : 'Predict Brain Tumor Class'}</span>
        </button>
      </div>

      {/* Right Results Column */}
      <div className="lg:col-span-7 bg-[#111622] border border-white/10 rounded-2xl p-6 shadow-xl shadow-black/40 min-h-[500px]">
        {/* Loading State */}
        {loading && (
          <div className="py-16 text-center">
            <div className="relative w-28 h-28 mx-auto mb-6 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 overflow-hidden shadow-xl shadow-cyan-500/20">
              <Cpu className="w-12 h-12" />
              <div className="laser-beam absolute top-0 left-0 right-0 h-1 bg-white shadow-[0_0_12px_3px_#06B6D4]"></div>
            </div>
            <h3 className="font-heading font-bold text-lg text-white mb-2">Analyzing Neuroimaging Tensors...</h3>
            <p className="text-xs text-cyan-400 font-medium mb-6 animate-pulse">{stageText}</p>
            <div className="w-64 h-1.5 bg-slate-800 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full animate-pulse w-3/4"></div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !result && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-slate-500">
              <Cpu className="w-8 h-8" />
            </div>
            <h3 className="font-heading font-bold text-lg text-white mb-1">Diagnostic Engine Idle</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">
              Upload a brain MRI scan or select one of the pre-configured test samples on the left to initiate model inference.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">1. Preprocess</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">2. TensorFlow CNN</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">3. Class Probabilities</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">4. Save to MongoDB</span>
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
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-emerald-500/10 border-emerald-500/30'
              }`}
            >
              <div>
                <span
                  className={`inline-block text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-1.5 text-white ${
                    result.is_tumor ? 'bg-red-500' : 'bg-emerald-500'
                  }`}
                >
                  {result.is_tumor ? 'Space-Occupying Mass Detected' : 'No Tumor / Normal Scan'}
                </span>
                <h1 className="font-heading font-extrabold text-2xl text-white">
                  {result.display_name}
                </h1>
                <p className="text-xs text-slate-300 mt-0.5">{result.category}</p>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`w-20 h-20 rounded-full bg-black/40 border-2 flex flex-col items-center justify-center ${
                    result.is_tumor ? 'border-red-500' : 'border-emerald-500'
                  }`}
                >
                  <span className="font-heading font-extrabold text-xl text-white">
                    {result.confidence}%
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400">Confidence</span>
                </div>
              </div>
            </div>

            {/* MongoDB Record Tag */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900/60 border border-white/5 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">
                  Stored in <strong>MongoDB</strong> with ID:
                </span>
                <code className="text-cyan-400 font-mono bg-cyan-950/60 px-1.5 py-0.5 rounded text-[11px]">
                  {result.prediction_id}
                </code>
              </div>
              <span className="text-slate-500 text-[11px]">
                Model: <strong>{result.model_version}</strong>
              </span>
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
                      glioma: 'bg-red-500',
                      meningioma: 'bg-amber-500',
                      pituitary: 'bg-purple-500',
                      notumor: 'bg-emerald-500'
                    };
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-200">{item.display_name}</span>
                          <span className="text-white">{item.percentage}%</span>
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
                Pathological Profile & Assessment
              </div>
              <p className="text-slate-300 leading-relaxed">{result.description}</p>
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-slate-400">Risk Assessment:</span>
                <span className="font-semibold text-white">{result.risk_level}</span>
              </div>
            </div>

            {/* Academic Notice */}
            <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-[11px] text-red-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
              <span>
                <strong>Educational Notice:</strong> This prediction is produced by an academic Deep Learning CNN model for demonstration and educational testing. It does not constitute medical advice or clinical diagnosis.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
