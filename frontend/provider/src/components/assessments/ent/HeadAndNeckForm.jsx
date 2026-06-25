/**
 * @shared-pool
 * HeadAndNeckForm — Head & neck surgery assessment including oncology
 * Scoring: TNM staging (AJCC 8th), ECOG/Karnofsky performance, neck node level mapping,
 *   salivary gland tumour classification (WHO 2017), thyroid (TIRADS), parotid FNA Bethesda
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useMemo } from 'react';
import { Lock, AlertTriangle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700',
  pill: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  active: 'bg-emerald-600 border-emerald-700 text-white',
};

function Pills({ options, value, onChange, accent = A, multi = false }) {
  const vals = multi ? (Array.isArray(value) ? value : []) : value;
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const sel = multi ? vals.includes(o) : vals === o;
        return (
          <button key={o} type="button"
            onClick={() => multi ? onChange(sel ? vals.filter(x => x !== o) : [...vals, o]) : onChange(o)}
            className={`px-3 py-1 rounded-full border text-sm font-medium transition-all ${sel ? accent.active : accent.pill}`}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

function FL({ label, sub, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-semibold text-gray-700">{label}{sub && <span className="ml-1 text-xs font-normal text-gray-500">{sub}</span>}</label>
      {children}
    </div>
  );
}

function Section({ title, applicable, onApplicable, accent = A, children }) {
  return (
    <div className={`rounded-xl border-2 ${applicable === 'N/A' ? 'border-gray-200 bg-gray-50' : accent.border + ' ' + accent.bg} overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className={`font-bold text-base ${applicable === 'N/A' ? 'text-gray-400' : accent.text}`}>{title}</h3>
        <div className="flex items-center gap-2">
          {applicable === 'N/A' && <Lock size={14} className="text-gray-400" />}
          <Pills options={['Applicable', 'N/A']} value={applicable} onChange={onApplicable} accent={accent} />
        </div>
      </div>
      {applicable === 'N/A' && <div className="px-4 pb-3 text-xs text-gray-400 italic flex items-center gap-1"><Lock size={12} /> Not applicable · section locked</div>}
      {applicable === 'Applicable' && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  );
}

const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400";
const ta = inp + " min-h-[72px] resize-y";

export default function HeadAndNeckForm({ patientId, encounterId, onSaved }) {
  const [sec, setSec] = useState({
    history: 'Applicable', neckExam: 'Applicable', lymphadenopathy: 'N/A',
    thyroid: 'N/A', salivary: 'N/A', hnOncology: 'N/A',
    parathyroid: 'N/A', congenital: 'N/A', trauma: 'N/A',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  // History
  const [complaints, setComplaints] = useState([]);
  const [duration, setDuration] = useState('');
  const [smoking, setSmoking] = useState('');
  const [alcohol, setAlcohol] = useState('');
  const [gutka, setGutka] = useState('');
  const [radiation, setRadiation] = useState('');
  const [familyHistory, setFamilyHistory] = useState('');
  const [ecog, setEcog] = useState('');

  // Neck Examination
  const [neckSwelling, setNeckSwelling] = useState('');
  const [swellingSite, setSwellingSite] = useState([]);
  const [swellingSize, setSwellingSize] = useState('');
  const [swellingConsistency, setSwellingConsistency] = useState('');
  const [swellingMobility, setSwellingMobility] = useState('');
  const [pulsatile, setPulsatile] = useState('');
  const [transillumination, setTransillumination] = useState('');
  const [tracheaPosition, setTracheaPosition] = useState('');
  const [jvp, setJvp] = useState('');

  // Lymphadenopathy
  const [nodesLevel, setNodesLevel] = useState([]);
  const [nodeSize, setNodeSize] = useState('');
  const [nodeConsistency, setNodeConsistency] = useState('');
  const [nodeMobility, setNodeMobility] = useState('');
  const [nodeMatted, setNodeMatted] = useState('');
  const [nodeSkin, setNodeSkin] = useState('');
  const [lymphCause, setLymphCause] = useState('');
  const [fnacResult, setFnacResult] = useState('');
  const [lymphTreatment, setLymphTreatment] = useState([]);

  // Thyroid
  const [thyroidSwelling, setThyroidSwelling] = useState('');
  const [thyroidLobe, setThyroidLobe] = useState('');
  const [noduleSize, setNoduleSize] = useState('');
  const [noduleCount, setNoduleCount] = useState('');
  const [tsh, setTsh] = useState('');
  const [ft4, setFt4] = useState('');
  const [tpoAb, setTpoAb] = useState('');
  const [trab, setTrab] = useState('');
  const [thyroidUss, setThyroidUss] = useState('');
  const [tirads, setTirads] = useState('');
  const [thyroidFnac, setThyroidFnac] = useState('');
  const [thyroidDiagnosis, setThyroidDiagnosis] = useState('');
  const [thyroidTx, setThyroidTx] = useState([]);
  const [radioiodineUptake, setRadioiodineUptake] = useState('');

  // Salivary Gland
  const [salivaryGland, setSalivaryGland] = useState('');
  const [salivarySwelling, setSalivarySwelling] = useState('');
  const [salivaryPain, setSalivaryPain] = useState('');
  const [salivaryDuct, setSalivaryDuct] = useState('');
  const [salivaryCause, setSalivaryCause] = useState('');
  const [salivaryFnac, setSalivaryFnac] = useState('');
  const [salivaryTx, setSalivaryTx] = useState([]);
  const [facialNerve, setFacialNerve] = useState('');

  // Head & Neck Oncology
  const [primarySite, setPrimarySite] = useState('');
  const [histology, setHistology] = useState('');
  const [hpvStatus, setHpvStatus] = useState('');
  const [tnmT, setTnmT] = useState('');
  const [tnmN, setTnmN] = useState('');
  const [tnmM, setTnmM] = useState('');
  const [overallStage, setOverallStage] = useState('');
  const [resectability, setResectability] = useState('');
  const [hnTreatment, setHnTreatment] = useState([]);
  const [reconstructionType, setReconstructionType] = useState('');
  const [radiationFields, setRadiationFields] = useState('');
  const [hnComplications, setHnComplications] = useState([]);

  // Parathyroid
  const [parathyroidCa, setParathyroidCa] = useState('');
  const [serumCa, setSerumCa] = useState('');
  const [pth, setPth] = useState('');
  const [phosphate, setPhosphate] = useState('');
  const [parathyroidSymptoms, setParathyroidSymptoms] = useState([]);
  const [parathyroidScan, setParathyroidScan] = useState('');
  const [parathyroidTx, setParathyroidTx] = useState('');

  // Congenital Neck Masses
  const [congenitalType, setCongenitalType] = useState('');
  const [congenitalSide, setCongenitalSide] = useState('');
  const [congenitalFeatures, setCongenitalFeatures] = useState('');
  const [congenitalTx, setCongenitalTx] = useState('');

  // Trauma
  const [traumaMechanism, setTraumaMechanism] = useState('');
  const [traumaFindings, setTraumaFindings] = useState([]);
  const [airwayCompromise, setAirwayCompromise] = useState('');
  const [traumaTx, setTraumaTx] = useState([]);

  const criticalAlert = useMemo(() => {
    if (airwayCompromise === 'Yes') return 'Airway compromise — immediate airway management (intubation/surgical airway), trauma team activation';
    const ca = parseFloat(serumCa);
    if (!isNaN(ca) && ca > 3.5) return 'Hypercalcaemic crisis (Ca >3.5 mmol/L) — aggressive IV hydration, bisphosphonate, urgent parathyroid/endocrine review';
    return '';
  }, [airwayCompromise, serumCa]);

  const handleSave = async () => {
    await api.post('/assessments', { type: 'ent-head-neck', patientId, encounterId, data: { complaints, duration, smoking, alcohol, gutka, radiation, familyHistory, ecog, neckSwelling, swellingSite, swellingSize, swellingConsistency, swellingMobility, pulsatile, transillumination, tracheaPosition, jvp, nodesLevel, nodeSize, nodeConsistency, nodeMobility, nodeMatted, nodeSkin, lymphCause, fnacResult, lymphTreatment, thyroidSwelling, thyroidLobe, noduleSize, noduleCount, tsh, ft4, tpoAb, trab, thyroidUss, tirads, thyroidFnac, thyroidDiagnosis, thyroidTx, radioiodineUptake, salivaryGland, salivarySwelling, salivaryPain, salivaryDuct, salivaryCause, salivaryFnac, salivaryTx, facialNerve, primarySite, histology, hpvStatus, tnmT, tnmN, tnmM, overallStage, resectability, hnTreatment, reconstructionType, radiationFields, hnComplications, parathyroidCa, serumCa, pth, phosphate, parathyroidSymptoms, parathyroidScan, parathyroidTx, congenitalType, congenitalSide, congenitalFeatures, congenitalTx, traumaMechanism, traumaFindings, airwayCompromise, traumaTx } });
    onSaved?.();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">Head & Neck</h1>
            <p className="text-emerald-100 text-sm">Neck Masses · Thyroid (TIRADS) · Salivary Glands · HN Oncology (TNM AJCC 8) · Parathyroid</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 space-y-1">
        <div className="font-bold flex items-center gap-1"><Info size={14}/>India Context</div>
        <p>Head & neck cancer is the most common cancer in Indian men (30% of all cancers) — predominantly oral/oropharyngeal SCC from tobacco chewing (gutka/pan masala/khaini), bidi smoking, and alcohol. TB lymphadenitis is the leading cause of cervical lymphadenopathy in India. Thyroid nodules — high iodine deficiency historically; post-iodisation, autoimmune thyroid disease rising. Papillary thyroid cancer commonest thyroid malignancy. Parathyroid adenoma — primary hyperparathyroidism underdiagnosed. NPC high in Northeast India. Nasopharyngeal angiofibroma in adolescent males (key India ENT diagnosis). TATA Memorial, AIIMS, CMC Vellore, Kidwai Memorial (Bangalore) are major HN oncology centres.</p>
      </div>

      {criticalAlert && (
        <div className="rounded-xl border-2 border-red-500 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20}/>
          <div><div className="font-bold text-red-700">EMERGENCY</div><div className="text-red-800 text-sm">{criticalAlert}</div></div>
        </div>
      )}

      <Section title="History" applicable={sec.history} onApplicable={v => sa('history', v)}>
        <FL label="Complaints">
          <Pills options={['Neck swelling/mass', 'Pain in neck', 'Dysphagia', 'Hoarseness', 'Trismus', 'Weight loss', 'Dyspnoea', 'Neck stiffness', 'Skin changes over swelling', 'Ear pain (referred otalgia)']} value={complaints} onChange={setComplaints} multi />
        </FL>
        <FL label="Duration"><input className={inp} value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 6 weeks progressive" /></FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Tobacco use"><Pills options={['Non-user', 'Cigarette/bidi smoker', 'Gutka/pan masala', 'Khaini/chewable tobacco', 'Smokeless tobacco (snuff)', 'Mixed (smoked + chewed)']} value={smoking} onChange={setSmoking} /></FL>
          <FL label="Alcohol"><Pills options={['None', 'Occasional', 'Regular', 'Heavy/daily', 'Country liquor']} value={alcohol} onChange={setAlcohol} /></FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Prior radiation to H&N"><Pills options={['None', 'Yes — RT to H&N', 'Yes — childhood irradiation']} value={radiation} onChange={setRadiation} /></FL>
          <FL label="Family H/O thyroid/HN cancer"><input className={inp} value={familyHistory} onChange={e => setFamilyHistory(e.target.value)} placeholder="e.g. Father — thyroid cancer" /></FL>
        </div>
        <FL label="ECOG performance status">
          <Pills options={['0 — Fully active', '1 — Restricted but ambulatory', '2 — Up >50% of day', '3 — Confined >50% of day', '4 — Completely disabled']} value={ecog} onChange={setEcog} />
        </FL>
      </Section>

      <Section title="Neck Examination" applicable={sec.neckExam} onApplicable={v => sa('neckExam', v)}>
        <FL label="Neck swelling?"><Pills options={['Yes', 'No']} value={neckSwelling} onChange={setNeckSwelling} /></FL>
        {neckSwelling === 'Yes' && (
          <>
            <FL label="Site / level">
              <Pills options={['Level I (submental/submandibular)', 'Level II (upper jugular)', 'Level III (middle jugular)', 'Level IV (lower jugular)', 'Level V (posterior triangle)', 'Level VI (central compartment)', 'Supraclavicular', 'Midline', 'Anterior triangle', 'Posterior triangle']} value={swellingSite} onChange={setSwellingSite} multi />
            </FL>
            <div className="grid grid-cols-3 gap-3">
              <FL label="Size (cm)"><input className={inp} value={swellingSize} onChange={e => setSwellingSize(e.target.value)} placeholder="e.g. 4×3 cm" /></FL>
              <FL label="Consistency"><Pills options={['Soft', 'Firm', 'Hard', 'Cystic', 'Rubbery']} value={swellingConsistency} onChange={setSwellingConsistency} /></FL>
              <FL label="Mobility"><Pills options={['Mobile', 'Mobile (not with skin)', 'Mobile (not with underlying)', 'Fixed', 'Semi-fixed']} value={swellingMobility} onChange={setSwellingMobility} /></FL>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Pulsatile?"><Pills options={['Yes (expansile pulsation)', 'No']} value={pulsatile} onChange={setPulsatile} /></FL>
              <FL label="Transillumination"><Pills options={['Positive (cystic)', 'Negative', 'Not tested']} value={transillumination} onChange={setTransillumination} /></FL>
            </div>
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FL label="Trachea position"><Pills options={['Central', 'Deviated right', 'Deviated left']} value={tracheaPosition} onChange={setTracheaPosition} /></FL>
          <FL label="JVP"><Pills options={['Normal', 'Elevated', 'SVC obstruction features']} value={jvp} onChange={setJvp} /></FL>
        </div>
      </Section>

      <Section title="Cervical Lymphadenopathy" applicable={sec.lymphadenopathy} onApplicable={v => sa('lymphadenopathy', v)}>
        <FL label="Levels involved">
          <Pills options={['Level I', 'Level II', 'Level III', 'Level IV', 'Level V', 'Level VI', 'Bilateral', 'Generalised (non-cervical also)']} value={nodesLevel} onChange={setNodesLevel} multi />
        </FL>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Largest node size"><input className={inp} value={nodeSize} onChange={e => setNodeSize(e.target.value)} placeholder="e.g. 3×2 cm" /></FL>
          <FL label="Consistency"><Pills options={['Soft', 'Firm', 'Hard', 'Rubbery (lymphoma)', 'Fluctuant (abscess)']} value={nodeConsistency} onChange={setNodeConsistency} /></FL>
          <FL label="Matted?"><Pills options={['Yes', 'No']} value={nodeMatted} onChange={setNodeMatted} /></FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Mobility"><Pills options={['Freely mobile', 'Mobile (skin free)', 'Fixed to skin', 'Fixed to deep structures', 'Semi-fixed']} value={nodeMobility} onChange={setNodeMobility} /></FL>
          <FL label="Skin over node"><Pills options={['Normal', 'Erythema', 'Collar-stud (TB)', 'Discharging sinus', 'Engorged veins (malignant)']} value={nodeSkin} onChange={setNodeSkin} /></FL>
        </div>
        <FL label="Probable cause">
          <Pills options={['Reactive (URTI/viral)', 'Tuberculous (TBLN) — commonest in India', 'Metastatic SCC (H&N primary)', 'Lymphoma (Hodgkin/NHL)', 'NPC metastasis', 'Thyroid carcinoma metastasis', 'Infective (abscess/cat scratch/toxoplasma)', 'Sarcoidosis', 'Unknown primary (CUP)']} value={lymphCause} onChange={setLymphCause} />
        </FL>
        <FL label="FNAC / biopsy result">
          <input className={inp} value={fnacResult} onChange={e => setFnacResult(e.target.value)} placeholder="e.g. Granulomatous inflammation with caseation — AFB positive (Koch's lymphadenitis)" />
        </FL>
        <FL label="Treatment">
          <Pills options={['ATT (anti-TB therapy — 6 months HRZE/HRE)', 'Excision biopsy', 'Neck dissection (malignant nodes)', 'Chemotherapy (lymphoma)', 'Antibiotic (reactive/infective)', 'I&D (fluctuant abscess)', 'Observe (reactive <2 cm, resolving)']} value={lymphTreatment} onChange={setLymphTreatment} multi />
        </FL>
      </Section>

      <Section title="Thyroid" applicable={sec.thyroid} onApplicable={v => sa('thyroid', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Swelling character">
            <Pills options={['No goitre', 'Diffuse goitre', 'Single nodule', 'Multinodular goitre', 'Dominant nodule in MNG', 'Retrosternal extension']} value={thyroidSwelling} onChange={setThyroidSwelling} />
          </FL>
          <FL label="Lobe involved"><Pills options={['Right', 'Left', 'Isthmus', 'Bilateral', 'Whole gland']} value={thyroidLobe} onChange={setThyroidLobe} /></FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Nodule size" sub="cm"><input className={inp} value={noduleSize} onChange={e => setNoduleSize(e.target.value)} placeholder="e.g. 2.4 × 1.8 cm" /></FL>
          <FL label="Nodule count"><Pills options={['Solitary', '2–5 nodules', 'Multinodular (>5)']} value={noduleCount} onChange={setNoduleCount} /></FL>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FL label="TSH" sub="mIU/L"><input className={inp} value={tsh} onChange={e => setTsh(e.target.value)} placeholder="e.g. 0.1" /></FL>
          <FL label="Free T4" sub="pmol/L"><input className={inp} value={ft4} onChange={e => setFt4(e.target.value)} placeholder="e.g. 28" /></FL>
          <FL label="TPO antibody"><Pills options={['Positive', 'Negative', 'Not done']} value={tpoAb} onChange={setTpoAb} /></FL>
        </div>
        <FL label="TRAb (TSH receptor antibody)"><Pills options={['Positive (Graves)', 'Negative', 'Not done']} value={trab} onChange={setTrab} /></FL>
        <FL label="USS thyroid findings">
          <textarea className={inp} value={thyroidUss} onChange={e => setThyroidUss(e.target.value)} placeholder="e.g. Hypoechoic nodule, irregular margin, microcalcifications, no vascularity on Doppler..." />
        </FL>
        <FL label="ACR TIRADS classification">
          <Pills options={['TR1 (benign)', 'TR2 (not suspicious)', 'TR3 (mildly suspicious)', 'TR4 (moderately suspicious)', 'TR5 (highly suspicious — FNA mandatory)']} value={tirads} onChange={setTirads} />
        </FL>
        <FL label="FNAC result (Bethesda)">
          <Pills options={['Bethesda I — Non-diagnostic', 'Bethesda II — Benign', 'Bethesda III — AUS/FLUS', 'Bethesda IV — Follicular neoplasm', 'Bethesda V — Suspicious for malignancy', 'Bethesda VI — Malignant']} value={thyroidFnac} onChange={setThyroidFnac} />
        </FL>
        <FL label="Diagnosis">
          <Pills options={['Multinodular goitre (euthyroid)', 'Hashimoto thyroiditis', 'Graves disease', 'Toxic MNG', 'Toxic adenoma', 'Hypothyroidism', 'Papillary thyroid cancer (PTC)', 'Follicular thyroid cancer (FTC)', 'Medullary thyroid cancer (MTC)', 'Anaplastic thyroid cancer', 'Thyroid lymphoma', 'Metastasis to thyroid']} value={thyroidDiagnosis} onChange={setThyroidDiagnosis} />
        </FL>
        <FL label="Treatment">
          <Pills options={['Monitor (benign nodule <4cm, TR2)', 'Levothyroxine (hypothyroid/Hashimoto)', 'Carbimazole / PTU (Graves/toxic)', 'Radioiodine (I-131) ablation', 'Beta-blocker (symptomatic Graves)', 'Hemithyroidectomy / lobectomy', 'Total thyroidectomy', 'Central neck dissection (malignant)', 'RAI post-thyroidectomy (PTC/FTC)', 'Sorafenib/lenvatinib (RAI-refractory DTC)', 'Vandetanib/cabozantinib (MTC)']} value={thyroidTx} onChange={setThyroidTx} multi />
        </FL>
      </Section>

      <Section title="Salivary Glands" applicable={sec.salivary} onApplicable={v => sa('salivary', v)}>
        <FL label="Gland involved">
          <Pills options={['Parotid (right)', 'Parotid (left)', 'Bilateral parotid', 'Submandibular (right)', 'Submandibular (left)', 'Sublingual', 'Minor salivary gland']} value={salivaryGland} onChange={setSalivaryGland} />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Swelling character"><Pills options={['Diffuse gland enlargement', 'Discrete lump', 'Bilateral diffuse (Sjogren/sarcoid)', 'Tender (sialadenitis)', 'Non-tender (tumour)']} value={salivarySwelling} onChange={setSalivarySwelling} /></FL>
          <FL label="Pain / relation to meals"><Pills options={['Meal-related pain+swelling (calculus/obstruction)', 'Constant pain (malignancy/infection)', 'No pain', 'Pain worse on opening (trismus)']} value={salivaryPain} onChange={setSalivaryPain} /></FL>
        </div>
        <FL label="Duct examination"><Pills options={['Normal (Stensen/Wharton duct)', 'Purulent discharge from duct', 'Stone visible/palpable at duct', 'Reduced salivary flow', 'No flow (duct obstruction)']} value={salivaryDuct} onChange={setSalivaryDuct} /></FL>
        <FL label="Cause">
          <Pills options={['Pleomorphic adenoma (benign — 80% parotid tumours)', 'Warthin tumour (cystadenoma lymphomatosum)', 'Mucoepidermoid carcinoma', 'Adenoid cystic carcinoma', 'Acinic cell carcinoma', 'Acute bacterial sialadenitis', 'Chronic sialadenitis', 'Sialolithiasis (submandibular most common)', 'Sjogren syndrome (bilateral)', 'Sarcoidosis', 'HIV-related parotid cyst', 'Mumps']} value={salivaryCause} onChange={setSalivaryCause} />
        </FL>
        <FL label="FNAC result"><input className={inp} value={salivaryFnac} onChange={e => setSalivaryFnac(e.target.value)} placeholder="e.g. Pleomorphic adenoma / mucoepidermoid Ca (intermediate grade)" /></FL>
        <FL label="Facial nerve function (parotid)"><Pills options={['Normal (House-Brackmann I)', 'HB II (mild dysfunction)', 'HB III (moderate)', 'HB IV (moderate-severe)', 'HB V (severe)', 'HB VI (total palsy)']} value={facialNerve} onChange={setFacialNerve} /></FL>
        <FL label="Treatment">
          <Pills options={['Superficial parotidectomy (benign tumour)', 'Total parotidectomy', 'Submandibular gland excision', 'Sialendoscopy (stone retrieval)', 'Lithotripsy (stone fragmentation)', 'I&D (abscess)', 'Radiotherapy (adenoid cystic/high-grade)', 'Sialagogues + massage (sialadenitis)', 'Botox injection (salivary fistula/Frey syndrome)']} value={salivaryTx} onChange={setSalivaryTx} multi />
        </FL>
      </Section>

      <Section title="Head & Neck Oncology" applicable={sec.hnOncology} onApplicable={v => sa('hnOncology', v)}>
        <FL label="Primary site">
          <Pills options={['Oral cavity (tongue/floor of mouth/buccal)', 'Oropharynx (tonsil/BOT/soft palate)', 'Hypopharynx (piriform sinus/post-cricoid)', 'Larynx (supraglottic/glottic/subglottic)', 'Nasopharynx', 'Salivary gland', 'Thyroid', 'Unknown primary', 'Skin (SCC/BCC/melanoma H&N)']} value={primarySite} onChange={setPrimarySite} />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Histology"><input className={inp} value={histology} onChange={e => setHistology(e.target.value)} placeholder="e.g. Moderately differentiated SCC, p16 positive" /></FL>
          <FL label="HPV/p16 status (OPC)"><Pills options={['HPV+/p16 positive (better prognosis)', 'HPV−/p16 negative', 'Not tested']} value={hpvStatus} onChange={setHpvStatus} /></FL>
        </div>
        <div className="rounded-lg bg-white border border-emerald-200 p-3 space-y-2">
          <div className="font-bold text-emerald-700 text-sm">TNM Staging (AJCC 8th Edition)</div>
          <div className="grid grid-cols-3 gap-3">
            <FL label="T stage"><Pills options={['Tis', 'T1', 'T2', 'T3', 'T4a', 'T4b']} value={tnmT} onChange={setTnmT} /></FL>
            <FL label="N stage"><Pills options={['N0', 'N1', 'N2a', 'N2b', 'N2c', 'N3a', 'N3b']} value={tnmN} onChange={setTnmN} /></FL>
            <FL label="M stage"><Pills options={['M0', 'M1']} value={tnmM} onChange={setTnmM} /></FL>
          </div>
          <FL label="Overall stage"><Pills options={['Stage I', 'Stage II', 'Stage III', 'Stage IVA', 'Stage IVB', 'Stage IVC']} value={overallStage} onChange={setOverallStage} /></FL>
        </div>
        <FL label="Resectability"><Pills options={['Resectable', 'Borderline resectable', 'Unresectable (T4b/N3b/M1)', 'Not a surgical candidate (performance/comorbidity)']} value={resectability} onChange={setResectability} /></FL>
        <FL label="Treatment">
          <Pills options={['Surgery (primary resection)', 'Modified radical neck dissection', 'Selective neck dissection', 'Concurrent chemoradiation (platinum-based — definitive CRT)', 'Adjuvant radiation post-surgery', 'Adjuvant CRT (positive margins/ECE)', 'Induction chemotherapy (TPF)', 'Cetuximab (EGFR-targeting)', 'Pembrolizumab / nivolumab (recurrent/metastatic)', 'Palliative chemotherapy', 'Free flap reconstruction', 'Pedicled flap']} value={hnTreatment} onChange={setHnTreatment} multi />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Reconstruction type"><input className={inp} value={reconstructionType} onChange={e => setReconstructionType(e.target.value)} placeholder="e.g. ALT free flap / pectoralis major / radial forearm" /></FL>
          <FL label="Radiation fields/dose"><input className={inp} value={radiationFields} onChange={e => setRadiationFields(e.target.value)} placeholder="e.g. IMRT 70Gy/35fr to primary + 54Gy elective nodes" /></FL>
        </div>
        <FL label="Complications / toxicity">
          <Pills options={['Xerostomia (dry mouth — radiation)', 'Osteoradionecrosis (mandible)', 'Dysphagia (post-RT/surgery)', 'Trismus', 'Lymphoedema (neck)', 'Carotid blowout (rare but fatal)', 'Hypothyroidism (post-RT)', 'Shoulder dysfunction (XI nerve sacrifice)', 'Fistula/wound dehiscence', 'Flap failure']} value={hnComplications} onChange={setHnComplications} multi />
        </FL>
      </Section>

      <Section title="Parathyroid Disorders" applicable={sec.parathyroid} onApplicable={v => sa('parathyroid', v)}>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Serum calcium" sub="mmol/L"><input className={inp} value={serumCa} onChange={e => setSerumCa(e.target.value)} placeholder="e.g. 2.9" /></FL>
          <FL label="PTH" sub="pg/mL"><input className={inp} value={pth} onChange={e => setPth(e.target.value)} placeholder="e.g. 180" /></FL>
          <FL label="Serum phosphate" sub="mmol/L"><input className={inp} value={phosphate} onChange={e => setPhosphate(e.target.value)} placeholder="e.g. 0.7" /></FL>
        </div>
        <FL label="Cause"><Pills options={['Primary hyperparathyroidism (adenoma 80%)', 'Primary (double adenoma/hyperplasia)', 'Primary (parathyroid carcinoma)', 'Secondary (CKD-related)', 'Tertiary (autonomous after secondary)', 'Hypoparathyroidism (post-thyroidectomy)', 'MEN1 / MEN2A']} value={parathyroidCa} onChange={setParathyroidCa} /></FL>
        <FL label="Symptoms (bones, stones, groans, moans)">
          <Pills options={['Kidney stones (nephrolithiasis)', 'Osteoporosis/fragility fracture', 'Osteitis fibrosa cystica', 'Nausea/vomiting', 'Constipation', 'Pancreatitis', 'Depression/cognitive changes', 'Muscle weakness/fatigue', 'Polyuria/polydipsia', 'Band keratopathy']} value={parathyroidSymptoms} onChange={setParathyroidSymptoms} multi />
        </FL>
        <FL label="Imaging"><input className={inp} value={parathyroidScan} onChange={e => setParathyroidScan(e.target.value)} placeholder="e.g. Sestamibi scan — right inferior parathyroid adenoma 1.5g; USS confirming" /></FL>
        <FL label="Treatment"><Pills options={['Parathyroidectomy (single adenoma)', 'Bilateral exploration (hyperplasia)', '3½ gland parathyroidectomy (tertiary)', 'Cinacalcet (medical — secondary/inoperable)', 'Calcium + vitamin D (hypoparathyroidism)', 'IV calcium gluconate (acute hypocalcaemia post-op)']} value={parathyroidTx} onChange={setParathyroidTx} /></FL>
      </Section>

      <Section title="Congenital Neck Masses" applicable={sec.congenital} onApplicable={v => sa('congenital', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Type">
            <Pills options={['Thyroglossal duct cyst', 'Branchial cyst (2nd arch — most common)', 'Branchial fistula/sinus', 'Cystic hygroma (lymphatic malformation)', 'Dermoid cyst', 'Teratoma', 'Sternomastoid tumour (fibromatosis colli)', 'Cervical rib', 'Laryngocele']} value={congenitalType} onChange={setCongenitalType} />
          </FL>
          <FL label="Side"><Pills options={['Midline', 'Right', 'Left', 'Bilateral']} value={congenitalSide} onChange={setCongenitalSide} /></FL>
        </div>
        <FL label="Features"><textarea className={ta} value={congenitalFeatures} onChange={e => setCongenitalFeatures(e.target.value)} placeholder="e.g. Thyroglossal cyst — midline, moves up with tongue protrusion and swallowing; USS confirms track to hyoid..." /></FL>
        <FL label="Treatment"><Pills options={["Sistrunk operation (thyroglossal cyst — including hyoid body)", 'Excision of branchial cyst/sinus tract', 'Sclerotherapy (lymphatic malformation — bleomycin/doxycycline)', 'Surgical excision (cystic hygroma)', 'Surgical excision (dermoid)', 'Physiotherapy ± SMT excision (sternomastoid)']} value={congenitalTx} onChange={setCongenitalTx} /></FL>
      </Section>

      <Section title="Head & Neck Trauma" applicable={sec.trauma} onApplicable={v => sa('trauma', v)}>
        <FL label="Mechanism"><input className={inp} value={traumaMechanism} onChange={e => setTraumaMechanism(e.target.value)} placeholder="e.g. RTA, stab wound, clothesline injury, assault" /></FL>
        <FL label="Airway compromise?"><Pills options={['Yes', 'No']} value={airwayCompromise} onChange={setAirwayCompromise} /></FL>
        <FL label="Findings">
          <Pills options={['Laryngeal fracture', 'Tracheal disruption', 'Neck haematoma', 'Vascular injury (carotid/jugular)', 'Penetrating wound', 'Subcutaneous emphysema', 'Mandible fracture', 'Midface fracture', 'Cervical spine injury']} value={traumaFindings} onChange={setTraumaFindings} multi />
        </FL>
        <FL label="Management">
          <Pills options={['Airway management (intubation/cricothyrotomy/tracheostomy)', 'CXR + CT neck (without IV contrast if vascular injury suspected)', 'CT angiography (vascular injury)', 'Surgical exploration + repair', 'Vascular surgery (carotid/jugular repair)', 'Wound closure', 'IV antibiotics', 'Cervical spine immobilisation']} value={traumaTx} onChange={setTraumaTx} multi />
        </FL>
      </Section>

      <button onClick={handleSave} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow transition-all">
        Save Head & Neck Assessment
      </button>
    </div>
  );
}
