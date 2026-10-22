import React, { useState } from 'react';
import { User, Shield, Stethoscope, Building, Award, RefreshCw, X, Check } from 'lucide-react';

export const DEFAULT_USER_PROFILE = {
  userId: 'USR-8421',
  userName: 'Dr. Sarah Mitchell, MD',
  role: 'Senior Consultant Neuro-Radiologist',
  department: 'Department of Radiodiagnosis & Neuro-Oncology',
  hospital: 'NeuroScan Academic Medical Center',
  licenseId: 'NMC-RAD-88341'
};

const PRESETS = [
  {
    userId: 'USR-8421',
    userName: 'Dr. Sarah Mitchell, MD',
    role: 'Senior Consultant Neuro-Radiologist',
    department: 'Department of Radiodiagnosis & Neuro-Oncology',
    hospital: 'NeuroScan Academic Medical Center',
    licenseId: 'NMC-RAD-88341'
  },
  {
    userId: 'USR-5190',
    userName: 'Dr. Alex Rivera, PhD',
    role: 'AI Diagnostic Research Fellow',
    department: 'Center for Computational Neuro-Science',
    hospital: 'University Brain Institute',
    licenseId: 'RES-AI-2024-519'
  },
  {
    userId: 'USR-9023',
    userName: 'Dr. Priya Patel, MD, DM',
    role: 'Attending Neurologist & Neuro-Oncologist',
    department: 'Division of Clinical Neurology',
    hospital: 'Metropolitan Neurology Hospital',
    licenseId: 'NMC-NEUR-9023'
  }
];

export default function UserProfileModal({ isOpen, onClose, userProfile, onSaveProfile }) {
  const [formData, setFormData] = useState(userProfile || DEFAULT_USER_PROFILE);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyPreset = (preset) => {
    setFormData(preset);
  };

  const handleGenerateId = () => {
    const randomId = `USR-${Math.floor(1000 + Math.random() * 9000)}`;
    handleChange('userId', randomId);
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSaveProfile(formData);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111622] border border-white/15 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="px-6 py-4 bg-[#182032] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-white">Active Clinician Profile</h2>
              <p className="text-xs text-slate-400">Operator & Physician specifications for diagnostic logging</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets */}
        <div className="px-6 pt-4 pb-2 border-b border-white/5 bg-[#0D121D]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Quick Clinician Presets:
          </span>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`p-2 rounded-lg text-left border text-xs transition ${
                  formData.userId === preset.userId
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
                    : 'border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold truncate">{preset.userName.split(',')[0]}</div>
                <div className="text-[10px] text-slate-500 truncate">{preset.userId}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>User / Operator ID *</span>
                <button
                  type="button"
                  onClick={handleGenerateId}
                  className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-2.5 h-2.5" /> Auto
                </button>
              </label>
              <div className="relative">
                <Shield className="w-4 h-4 absolute left-3 top-3 text-cyan-400" />
                <input
                  type="text"
                  required
                  value={formData.userId}
                  onChange={(e) => handleChange('userId', e.target.value)}
                  className="w-full bg-[#182032] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. USR-8421"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Medical License / Staff ID
              </label>
              <div className="relative">
                <Award className="w-4 h-4 absolute left-3 top-3 text-purple-400" />
                <input
                  type="text"
                  value={formData.licenseId}
                  onChange={(e) => handleChange('licenseId', e.target.value)}
                  className="w-full bg-[#182032] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. NMC-RAD-88341"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Clinician Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                required
                value={formData.userName}
                onChange={(e) => handleChange('userName', e.target.value)}
                className="w-full bg-[#182032] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-cyan-500"
                placeholder="e.g. Dr. Sarah Mitchell, MD"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Designation / Professional Role
            </label>
            <div className="relative">
              <Stethoscope className="w-4 h-4 absolute left-3 top-3 text-emerald-400" />
              <input
                type="text"
                value={formData.role}
                onChange={(e) => handleChange('role', e.target.value)}
                className="w-full bg-[#182032] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                placeholder="e.g. Senior Consultant Neuro-Radiologist"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Department
              </label>
              <div className="relative">
                <Building className="w-4 h-4 absolute left-3 top-3 text-blue-400" />
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  className="w-full bg-[#182032] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. Radiodiagnosis & Neuro-Oncology"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Medical Center
              </label>
              <input
                type="text"
                value={formData.hospital}
                onChange={(e) => handleChange('hospital', e.target.value)}
                className="w-full bg-[#182032] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                placeholder="e.g. NeuroScan Academic Hospital"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setFormData(DEFAULT_USER_PROFILE)}
              className="text-xs text-slate-400 hover:text-white transition"
            >
              Reset to Defaults
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold hover:opacity-90 transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
              >
                {savedNotice ? <Check className="w-4 h-4" /> : null}
                <span>Save Clinician Specifications</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
