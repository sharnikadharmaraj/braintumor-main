import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Dna,
  Stethoscope,
  Microscope,
  ArrowRight,
  Layers,
  Sparkles,
  CheckCircle2,
  Table as TableIcon
} from 'lucide-react';

export const TUMOR_LIBRARY_ITEMS = [
  {
    id: 'glioma',
    name: 'Glioma (Astrocytoma / Glioblastoma)',
    short_name: 'Glioma',
    who_grade: 'WHO Grade II - IV (GBM: Grade IV)',
    category: 'Intra-Axial Malignant Neoplasm',
    risk_tier: 'High Risk (Urgent Intervention)',
    risk_color: 'rose',
    sample_file: 'glioma_sample.jpg',
    cellular_origin: 'Glial support cells (Astrocytes, Oligodendrocytes, Ependymal cells)',
    incidence: '~80% of primary malignant brain tumors (~5.3 cases per 100,000 annually)',
    hallmark_mri: 'Poorly defined infiltrative margins, marked peritumoral vasogenic edema on T2/FLAIR, central necrosis with irregular thick peripheral nodular ring enhancement on post-gadolinium T1-weighted MRI.',
    molecular_markers: [
      'IDH1/IDH2 mutation (R132H)',
      '1p/19q co-deletion (oligodendroglioma)',
      'MGMT promoter hypermethylation',
      'TERT promoter mutation & EGFR amplification',
      'ATRX loss & TP53 alterations'
    ],
    clinical_symptoms: [
      'Progressive morning headaches with projectile vomiting',
      'New-onset adult focal motor or generalized seizures',
      'Contralateral hemiparesis and sensory deficit',
      'Subacute cognitive decline, executive dysfunction & personality change',
      'Papilledema and elevated intracranial pressure (ICP)'
    ],
    first_line_management: 'Maximal safe microsurgical resection preserving functional cortex, followed by Stupp Protocol (radiotherapy 60 Gy + concurrent Temozolomide), 6 maintenance TMZ cycles, and Tumor Treating Fields (TTFields).',
    deep_learning_saliency: 'ResNet-18 Grad-CAM features intense focal convergence along infiltrative necrotic ring transitions and peritumoral edema boundaries on Layer 4 feature maps.'
  },
  {
    id: 'meningioma',
    name: 'Meningioma',
    short_name: 'Meningioma',
    who_grade: 'WHO Grade I (80-85% Benign), Grade II (15%), Grade III (1-3%)',
    category: 'Extra-Axial Mesenchymal Neoplasm',
    risk_tier: 'Moderate Risk',
    risk_color: 'amber',
    sample_file: 'meningioma_sample.jpg',
    cellular_origin: 'Arachnoid cap cells of arachnoid villi within the meningeal dura mater',
    incidence: 'Most common primary non-glial intracranial neoplasm (~37-39% of all adult CNS tumors)',
    hallmark_mri: 'Sharply circumscribed extra-axial mass with broad dural base, pathognomonic "Dural Tail Sign" on contrast T1, avid homogeneous enhancement, CSF vascular cleft sign, and occasional adjacent hyperostosis.',
    molecular_markers: [
      'NF2 (22q loss / neurofibromin 2 inactivation)',
      'TRAF7 & KLF4 mutations (secretory subtype)',
      'AKT1 & SMO mutations (skull base)',
      'TERT promoter mutation & CDKN2A/B deletion (Grade III)'
    ],
    clinical_symptoms: [
      'Insidious, slowly progressing dull cephalalgia',
      'Focal motor seizures due to cortical compression',
      'Cranial nerve deficits (anosmia, diplopia, facial numbness)',
      'Visual field disturbances (sphenoid wing or tuberculum sellae)',
      'Localized calvarial bony prominence'
    ],
    first_line_management: 'Active observation with serial MRI for small asymptomatic lesions; complete microsurgical extirpation (Simpson Grade I-III goal); stereotactic radiosurgery (Gamma Knife / CyberKnife) for skull base or residual lesions.',
    deep_learning_saliency: 'Grad-CAM displays sharp, compact spherical activation maps centered along the dural border interface and homogeneous contrast-enhanced parenchyma.'
  },
  {
    id: 'pituitary',
    name: 'Pituitary Tumor (PitNET / Adenoma)',
    short_name: 'Pituitary Adenoma',
    who_grade: 'Benign Neuroendocrine Neoplasm (Microadenoma <10mm, Macroadenoma >=10mm)',
    category: 'Sellar / Suprasellar Neuroendocrine Neoplasm',
    risk_tier: 'Moderate Risk',
    risk_color: 'purple',
    sample_file: 'pituitary_sample.jpg',
    cellular_origin: 'Adenohypophyseal specialized neuroendocrine cells of the anterior pituitary gland',
    incidence: '~10-15% of all intracranial neoplasms; incidental autopsy prevalence up to 16.7%',
    hallmark_mri: 'Expansion of sella turcica with suprasellar extension, classic "figure-of-8" or "snowman" waist at diaphragmatic aperture, superior displacement of optic chiasm, and lateral cavernous sinus extension (Knosp grading).',
    molecular_markers: [
      'Pit-1 transcription factor lineage (GH, PRL, TSH)',
      'T-pit transcription factor lineage (ACTH / Cushing)',
      'SF-1 lineage (Gonadotroph / non-functioning)',
      'MEN1 & AIP germline susceptibility mutations',
      'GNAS1 activating mutations'
    ],
    clinical_symptoms: [
      'Bitemporal hemianopsia from midline optic chiasm compression',
      'Hyperprolactinemia (galactorrhea, amenorrhea, sexual dysfunction)',
      'Acromegaly / gigantism (excess Growth Hormone)',
      'Cushing\'s disease (ACTH excess with central adiposity)',
      'Pituitary apoplexy (acute headache and sudden visual failure)'
    ],
    first_line_management: 'Dopamine agonist pharmacotherapy (Cabergoline, Bromocriptine) first-line for prolactinomas; Endoscopic endonasal transsphenoidal surgery (TSS) for macroadenomas; stereotactic radiosurgery for refractory invasion.',
    deep_learning_saliency: 'Model activation cleanly converges onto the sellar-suprasellar midline floor, segmenting the pituitary fossa from adjacent brainstem structures.'
  },
  {
    id: 'notumor',
    name: 'Healthy Brain MRI (No Tumor / Normal Control)',
    short_name: 'Normal Brain',
    who_grade: 'Non-Pathological Anatomical Baseline',
    category: 'Normal Parenchyma & Ventricular Anatomy',
    risk_tier: 'Low Risk (Normal Baseline)',
    risk_color: 'emerald',
    sample_file: 'notumor_sample.jpg',
    cellular_origin: 'Intact neuroglial parenchymal architecture without cellular atypia or dysplasia',
    incidence: 'Negative control cohort in clinical neuroimaging screening protocols',
    hallmark_mri: 'Bilateral cerebral and cerebellar hemispheric symmetry; intact midline falx cerebri with no mass effect; patent lateral, third, and fourth ventricles without dilatation; intact gray-white matter differentiation; preserved sulcal spacing.',
    molecular_markers: [
      'Wild-type physiological baseline',
      'Intact blood-brain barrier (BBB) integrity',
      'Symmetric cerebral metabolic kinetics',
      'Absence of oncogenic driver alterations'
    ],
    clinical_symptoms: [
      'Absence of focal neurologic deficits',
      'Normative intracranial pressure hemodynamics',
      'Physiological cranial nerve examination',
      'Intact visual acuity and peripheral visual fields'
    ],
    first_line_management: 'Routine reassurance; no neurosurgical or oncological intervention indicated. Diagnostic follow-up only in the event of emergent atypical neurological indicators.',
    deep_learning_saliency: 'Diffused, low-magnitude uniform activation throughout the cortical mantle with absence of localized high-gradient anomaly clusters.'
  }
];

export const COMPARATIVE_MATRIX = [
  {
    parameter: 'Pathological Classification',
    glioma: 'Malignant Intra-Axial (Astrocytes / Oligodendrocytes)',
    meningioma: 'Benign Extra-Axial (Arachnoid Cap Cells)',
    pituitary: 'Benign Neuroendocrine (Adenohypophysis)',
    notumor: 'Physiological Normal Anatomy'
  },
  {
    parameter: 'WHO Grade Tier',
    glioma: 'Grade II to IV (Glioblastoma: Grade IV)',
    meningioma: 'Grade I (85%), Grade II (15%), Grade III (1-3%)',
    pituitary: 'Grade I Benign Neoplasm (Micro/Macroadenoma)',
    notumor: 'N/A (Non-Neoplastic)'
  },
  {
    parameter: 'Contrast Enhancement Pattern',
    glioma: 'Heterogeneous, irregular, thick peripheral ring enhancement',
    meningioma: 'Avid, homogeneous enhancement with dural tail sign',
    pituitary: 'Avid sellar mass; delayed uptake vs normal gland',
    notumor: 'No focal enhancement (BBB Intact)'
  },
  {
    parameter: 'Vasogenic Edema & Mass Effect',
    glioma: 'Extensive finger-like edema on T2/FLAIR',
    meningioma: 'Variable perilesional edema with CSF vascular cleft',
    pituitary: 'Minimal to none; local chiasmatic compression',
    notumor: 'Absent (Preserved sulci & ventricles)'
  },
  {
    parameter: 'Hallmark Molecular Biomarkers',
    glioma: 'IDH1/2 mutations, 1p/19q codeletion, MGMT methylation',
    meningioma: 'NF2 (22q loss), TRAF7, KLF4, AKT1',
    pituitary: 'Pit-1, T-pit, SF-1 transcription lineages, MEN1',
    notumor: 'Wild-type physiological baseline'
  },
  {
    parameter: 'Cardinal Clinical Symptom',
    glioma: 'Progressive morning headache, seizures, focal deficits',
    meningioma: 'Insidious dull headache, localized seizures, cranial palsies',
    pituitary: 'Bitemporal hemianopsia, endocrine syndromes',
    notumor: 'Asymptomatic / physiological baseline'
  },
  {
    parameter: 'First-Line Clinical Management',
    glioma: 'Maximal safe resection + Radiotherapy + Temozolomide',
    meningioma: 'Surgical excision (Simpson I) / Stereotactic Radiosurgery',
    pituitary: 'Dopamine agonists (Prolactinoma) / Endoscopic TSS surgery',
    notumor: 'Reassurance / No intervention'
  },
  {
    parameter: 'ResNet-18 Grad-CAM Saliency',
    glioma: 'Intense gradients along infiltrative necrotic ring boundaries',
    meningioma: 'Spherical hotspot over dural attachment interface',
    pituitary: 'Focal convergence onto sellar / suprasellar midpoint',
    notumor: 'Uniform, low-entropy diffuse baseline gradient'
  }
];

export default function TumorLibrary({ onSelectTumorSample }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showMatrix, setShowMatrix] = useState(false);

  const filteredItems = TUMOR_LIBRARY_ITEMS.filter((item) => {
    const matchesCategory =
      activeCategory === 'all' ||
      (activeCategory === 'glioma' && item.id === 'glioma') ||
      (activeCategory === 'meningioma' && item.id === 'meningioma') ||
      (activeCategory === 'pituitary' && item.id === 'pituitary') ||
      (activeCategory === 'notumor' && item.id === 'notumor');

    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCategory;

    const matchesQuery =
      item.name.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.who_grade.toLowerCase().includes(query) ||
      item.hallmark_mri.toLowerCase().includes(query) ||
      item.molecular_markers.some((m) => m.toLowerCase().includes(query)) ||
      item.clinical_symptoms.some((s) => s.toLowerCase().includes(query)) ||
      item.first_line_management.toLowerCase().includes(query);

    return matchesCategory && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#111622] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 flex-shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-heading font-black text-white">
                  Brain Tumor Pathology & AI Library
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                  WHO 2021 CNS 5
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-3xl">
                Comprehensive clinical encyclopedia detailing histopathological classifications, hallmark neuroimaging
                biomarkers, molecular genetics, and Explainable AI (Grad-CAM) saliency criteria.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowMatrix(!showMatrix)}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 text-xs font-semibold text-slate-200 transition flex items-center gap-2 whitespace-nowrap self-start md:self-auto"
          >
            <TableIcon className="w-4 h-4 text-cyan-400" />
            <span>{showMatrix ? 'Hide Comparative Matrix' : 'View Comparative Matrix'}</span>
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pathology, biomarker, symptom, WHO grade..."
              className="w-full bg-[#182032] border border-white/10 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'All Pathologies (4)' },
              { id: 'glioma', label: 'Glioma (High Risk)' },
              { id: 'meningioma', label: 'Meningioma (Moderate)' },
              { id: 'pituitary', label: 'Pituitary (Sellar)' },
              { id: 'notumor', label: 'Healthy Normal' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  activeCategory === cat.id
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm shadow-cyan-500/20'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Comparative Matrix Section (Collapsible) */}
      {showMatrix && (
        <div className="bg-[#111622] border border-white/10 rounded-2xl p-6 shadow-xl animate-fadeIn">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <TableIcon className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-heading font-bold text-white">
                Multi-Class Neuro-Oncological Comparative Matrix
              </h2>
            </div>
            <span className="text-xs text-slate-400">Side-by-side diagnostic criteria breakdown</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#182032] uppercase text-[11px] text-slate-400 font-semibold border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 w-1/5">Clinical Dimension</th>
                  <th className="px-4 py-3 w-1/5 text-rose-400">Glioma Tumor</th>
                  <th className="px-4 py-3 w-1/5 text-amber-400">Meningioma</th>
                  <th className="px-4 py-3 w-1/5 text-purple-400">Pituitary Adenoma</th>
                  <th className="px-4 py-3 w-1/5 text-emerald-400">Healthy Normal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {COMPARATIVE_MATRIX.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 font-semibold text-white bg-white/[0.01]">
                      {row.parameter}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{row.glioma}</td>
                    <td className="px-4 py-3 text-slate-300">{row.meningioma}</td>
                    <td className="px-4 py-3 text-slate-300">{row.pituitary}</td>
                    <td className="px-4 py-3 text-slate-300">{row.notumor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pathology Encyclopedia Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredItems.map((item) => {
          const colorStyles = {
            rose: {
              border: 'border-rose-500/30 hover:border-rose-500/50',
              badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
              accent: 'text-rose-400',
              dot: 'bg-rose-500'
            },
            amber: {
              border: 'border-amber-500/30 hover:border-amber-500/50',
              badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              accent: 'text-amber-400',
              dot: 'bg-amber-500'
            },
            purple: {
              border: 'border-purple-500/30 hover:border-purple-500/50',
              badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
              accent: 'text-purple-400',
              dot: 'bg-purple-500'
            },
            emerald: {
              border: 'border-emerald-500/30 hover:border-emerald-500/50',
              badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              accent: 'text-emerald-400',
              dot: 'bg-emerald-500'
            }
          }[item.risk_color];

          return (
            <div
              key={item.id}
              className={`bg-[#111622] border ${colorStyles.border} rounded-2xl p-6 shadow-xl flex flex-col justify-between transition-all duration-200 group`}
            >
              <div>
                {/* Header Badge & Title */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${colorStyles.badge}`}>
                      {item.who_grade}
                    </span>
                    <h3 className="text-xl font-heading font-black text-white mt-1.5">
                      {item.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium">{item.category}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border whitespace-nowrap ${colorStyles.badge}`}>
                    {item.risk_tier.split(' ')[0]} Risk
                  </span>
                </div>

                {/* Cellular Origin & Incidence */}
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1.5 text-xs text-slate-300 mb-4">
                  <div>
                    <strong className="text-slate-200">Origin: </strong>
                    <span className="text-slate-400">{item.cellular_origin}</span>
                  </div>
                  <div>
                    <strong className="text-slate-200">Epidemiology: </strong>
                    <span className="text-slate-400">{item.incidence}</span>
                  </div>
                </div>

                {/* Hallmark MRI Presentation */}
                <div className="space-y-1 mb-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Microscope className="w-3.5 h-3.5" />
                    Hallmark Neuroimaging Features:
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed bg-[#182032] p-3 rounded-xl border border-white/5">
                    {item.hallmark_mri}
                  </p>
                </div>

                {/* Molecular Biomarkers */}
                <div className="mb-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5 mb-2">
                    <Dna className="w-3.5 h-3.5" />
                    Pathognomonic Molecular & Genetic Biomarkers:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.molecular_markers.map((marker, mIdx) => (
                      <span
                        key={mIdx}
                        className="text-[11px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-md"
                      >
                        {marker}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Clinical Symptoms */}
                <div className="mb-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-2">
                    <Activity className="w-3.5 h-3.5" />
                    Frequent Clinical Manifestations:
                  </div>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {item.clinical_symptoms.map((sym, sIdx) => (
                      <li key={sIdx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0"></span>
                        <span>{sym}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* First-Line Clinical Management */}
                <div className="mb-4 p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs space-y-1">
                  <div className="font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 text-[11px]">
                    <Stethoscope className="w-3.5 h-3.5" />
                    Clinical Management & Therapeutic Protocol:
                  </div>
                  <p className="text-slate-300 leading-relaxed">{item.first_line_management}</p>
                </div>

                {/* AI / Grad-CAM Saliency Criteria */}
                <div className="p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl text-xs space-y-1">
                  <div className="font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5" />
                    Deep Learning & Grad-CAM Recognition Pattern:
                  </div>
                  <p className="text-cyan-200/90 leading-relaxed text-[11px]">
                    {item.deep_learning_saliency}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => onSelectTumorSample(item)}
                className="mt-5 w-full py-2.5 px-4 bg-white/5 hover:bg-cyan-500 hover:text-white border border-white/10 hover:border-cyan-400 text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-cyan-500/10"
              >
                <span>Inspect Calibrated MRI Sample in Scanner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
