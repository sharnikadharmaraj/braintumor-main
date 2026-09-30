import React from 'react';
import { BrainCircuit, Activity, History, FolderSearch, BarChart2, ShieldCheck, Database } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, config, onSwitchModel }) {
  const isMongoLive = config?.database_status?.is_mongo_connected;

  return (
    <header className="sticky top-0 z-50 bg-[#0A0D14]/85 backdrop-blur-md border-b border-white/10 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <div className="font-heading font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
              NeuroScan <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">AI</span>
            </div>
            <div className="text-xs text-slate-400 font-medium">
              BCA Capstone • Brain Tumor Prediction Deep Learning System
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center bg-white/[0.04] p-1.5 rounded-xl border border-white/10 gap-1 overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('predictor')}
            className={`px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-semibold flex items-center gap-2 transition-all duration-200 whitespace-nowrap ${
              activeTab === 'predictor'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Diagnostic Scanner</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-semibold flex items-center gap-2 transition-all duration-200 whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Prediction History</span>
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-semibold flex items-center gap-2 transition-all duration-200 whitespace-nowrap ${
              activeTab === 'metrics'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Model Metrics</span>
          </button>

          <button
            onClick={() => setActiveTab('samples')}
            className={`px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-semibold flex items-center gap-2 transition-all duration-200 whitespace-nowrap ${
              activeTab === 'samples'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <FolderSearch className="w-4 h-4" />
            <span>Test Samples</span>
          </button>
        </nav>

        {/* Status Indicators & Model Switcher */}
        <div className="flex items-center gap-2.5">
          {/* Model Selector */}
          <div className="flex items-center bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-slate-400 mr-2 font-medium">Model:</span>
            <select
              value={config?.active_model || 'CNN'}
              onChange={(e) => onSwitchModel(e.target.value)}
              className="bg-transparent text-cyan-400 font-bold focus:outline-none cursor-pointer"
            >
              <option value="CNN" className="bg-slate-900 text-white">CNN (Primary)</option>
              <option value="TRANSFER_LEARNING" className="bg-slate-900 text-white">Transfer Learning (MobileNetV2)</option>
            </select>
          </div>

          {/* Database Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              isMongoLive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
            title={isMongoLive ? 'Connected to live MongoDB' : 'PyMongo Ready (Local Fallback)'}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{isMongoLive ? 'MongoDB' : 'PyMongo Store'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
