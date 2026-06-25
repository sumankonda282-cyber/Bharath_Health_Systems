/** @shared-pool */
import React, { useState, useMemo } from 'react';
import api from '../../../api/client';

const CM = { slate: 'bg-slate-100 text-slate-800 border-slate-300 data-[sel=true]:bg-slate-600 data-[sel=true]:text-white data-[sel=true]:border-slate-600', red: 'bg-red-100 text-red-800 border-red-300 data-[sel=true]:bg-red-500 data-[sel=true]:text-white data-[sel=true]:border-red-500', orange: 'bg-orange-100 text-orange-800 border-orange-300 data-[sel=true]:bg-orange-500 data-[sel=true]:text-white data-[sel=true]:border-orange-500', blue: 'bg-blue-100 text-blue-800 border-blue-300 data-[sel=true]:bg-blue-500 data-[sel=true]:text-white data-[sel=true]:border-blue-500', green: 'bg-green-100 text-green-800 border-green-300 data-[sel=true]:bg-green-500 data-[sel=true]:text-white data-[sel=true]:border-green-500', gray: 'bg-gray-100 text-gray-700 border-gray-300 data-[sel=true]:bg-gray-500 data-[sel=true]:text-white data-[sel=true]:border-gray-500', purple: 'bg-purple-100 text-purple-800 border-purple-300 data-[sel=true]:bg-purple-500 data-[sel=true]:text-white data-[sel=true]:border-purple-500' };
function Pills({ label, options, value, onChange, multi = false, color = 'slate' }) {
  const cls = CM[color] || CM.slate;
  const isSel = (v) => multi ? (Array.isArray(value) ? value.includes(v) : false) : value === v;
  const click = (v) => { if (multi) { const a = Array.isArray(value) ? value : []; onChange(a.includes(v) ? a.filter(x => x !== v) : [...a, v]); } else onChange(value === v ? '' : v); };
  return (<div className="mb-3">{label && <div className="text-xs font-medium text-gray-600 mb-1">{label}</div>}<div className="flex flex-wrap gap-1.5">{options.map(opt => { const [v, l] = Array.isArray(opt) ? opt : [opt, opt]; return <button key={v} type="button" data-sel={isSel(v)} onClick={() => click(v)} className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${cls}`}>{l}</button>; })}</div></div>);
}
function FL({ label, sub, children }) { return <div className="mb-3"><label className="block text-xs font-medium text-gray-600 mb-1">{label}{sub && <span className="text-gray-400 font-normal ml-1">{sub}</span>}</label>{children}</div>; }
function Gate({ question, value, onChange, children }) {
  return (<div><div className="flex items-center gap-3 mb-3"><span className="text-sm font-medium text-gray-700">{question}</span>{['yes','no'].map(v => <button key={v} type="button" onClick={() => onChange(value === v ? null : v)} className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${value === v ? v === 'yes' ? 'bg-slate-600 text-white border-slate-600' : 'bg-gray-400 text-white border-gray-400' : 'bg-white text-gray-600 border-gray-300'}`}>{v === 'yes' ? 'Yes' : 'No'}</button>)}</div>{value === 'yes' && <div className="border-l-2 border-slate-400 pl-3">{children}</div>}{value === 'no' && <div className="flex items-center gap-2 text-xs text-gray-400 italic py-1"><span>🔒</span><span>Not applicable — section locked</span></div>}</div>);
}
function Inp({ value, onChange, type = 'text', placeholder = '' }) { return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"/>; }

export default function OrthopedicTumorAssessmentForm({ patientId, encounterId }) {
  const [basicInfo, setBasicInfo] = useState({ site: '', side: '', age: '', chiefComplaint: '', duration: '', pain: '', nightPain: '' });
  const [clinicalFeatures, setClinicalFeatures] = useState({ applicable: null, size: '', consistency: '', tenderness: '', fixation: '', skinChanges: '', lymphNodes: '', neurovascular: '', pathFracture: '', redFlags: [] });
  const [imagingCharacteristics, setImagingCharacteristics] = useState({ applicable: null, xray: '', xrayFindings: '', mri: '', mriFindings: '', ct: '', ctFindings: '', boneScan: '', stagingCt: '' });
  const [enneking, setEnneking] = useState({ applicable: null, tumorType: '', grade: '', localExtent: '', metastases: '', stage: '' });
  const [biopsyData, setBiopsyData] = useState({ applicable: null, done: '', method: '', pathology: '', grading: '', immunohistochem: '' });
  const [diagnosisData, setDiagnosisData] = useState({ applicable: null, primaryDx: '', benignMalignant: '', icd10: '', notes: '' });
  const [managementData, setManagementData] = useState({ applicable: null, mdtReferral: '', surgery: '', chemotherapy: '', radiotherapy: '', adjuvant: '', followUp: '', notes: '' });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Enneking stage calculator ─────────────────────────────────────────────────
  const enneikingStage = useMemo(() => {
    if (enneking.applicable !== 'yes' || !enneking.grade || !enneking.localExtent) return null;
    const isLow = enneking.grade === 'low';
    const isIntra = enneking.localExtent === 'intracompartmental';
    const hasM = enneking.metastases === 'yes';
    if (hasM) return { stage: 'Stage III', label: 'Any grade, any extent, distant metastasis', color: 'text-red-700' };
    if (isLow && isIntra) return { stage: 'Stage IA', label: 'Low grade, intracompartmental', color: 'text-amber-600' };
    if (isLow && !isIntra) return { stage: 'Stage IB', label: 'Low grade, extracompartmental', color: 'text-orange-600' };
    if (!isLow && isIntra) return { stage: 'Stage IIA', label: 'High grade, intracompartmental', color: 'text-red-600' };
    if (!isLow && !isIntra) return { stage: 'Stage IIB', label: 'High grade, extracompartmental', color: 'text-red-700' };
    return null;
  }, [enneking]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/assessments', { type: 'orthopedic_tumor', patientId, encounterId, data: { basicInfo, clinicalFeatures, imagingCharacteristics, enneking, enneikingStage, biopsyData, diagnosisData, managementData } });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const secCls = 'bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-4';
  const h2Cls = 'text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4">
      <div className="bg-gradient-to-r from-slate-700 to-gray-700 rounded-xl p-4 mb-4 text-white shadow">
        <h1 className="text-lg font-bold">Orthopedic Tumor Assessment</h1>
        <p className="text-slate-300 text-xs mt-0.5">Enneking Staging · Biopsy Planning · Bone & Soft Tissue Tumors · MDT Referral</p>
      </div>

      {/* Basic Info */}
      <div className={secCls}>
        <h2 className={h2Cls}>📋 Basic Information</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-3 text-xs text-red-700 font-medium">⚠ Suspected musculoskeletal tumor — urgent MDT referral to bone tumor centre (AIIMS, Tata Memorial, RCC). Do NOT perform excision biopsy in non-specialist centre.</div>
        <Pills label="Site" options={[['femur','Femur'],['tibia','Tibia'],['humerus','Humerus'],['pelvis_acetabulum','Pelvis/Acetabulum'],['spine','Spine'],['hand_foot','Hand/Foot'],['scapula','Scapula/Clavicle'],['soft_tissue_thigh','Soft tissue — thigh'],['soft_tissue_arm','Soft tissue — arm'],['soft_tissue_retroperitoneum','Retroperitoneum/deep soft tissue']]} value={basicInfo.site} onChange={v => setBasicInfo(p => ({...p, site: v}))} color="slate"/>
        <div className="grid grid-cols-3 gap-2">
          <Pills label="Side" options={[['left','Left'],['right','Right']]} value={basicInfo.side} onChange={v => setBasicInfo(p => ({...p, side: v}))}/>
          <FL label="Age (years)"><Inp type="number" value={basicInfo.age} onChange={v => setBasicInfo(p => ({...p, age: v}))} placeholder="years"/></FL>
          <FL label="Duration of symptoms"><Inp value={basicInfo.duration} onChange={v => setBasicInfo(p => ({...p, duration: v}))} placeholder="weeks/months"/></FL>
        </div>
        <FL label="Chief Complaint"><Inp value={basicInfo.chiefComplaint} onChange={v => setBasicInfo(p => ({...p, chiefComplaint: v}))} placeholder="e.g. painless mass, bony swelling, pathological fracture"/></FL>
        <div className="grid grid-cols-2 gap-2">
          <Pills label="Pain" options={[['none','None (benign indicator)'],['activity_related','Activity-related'],['rest_pain','Rest pain'],['progressive','Progressive (malignant indicator)']]} value={basicInfo.pain} onChange={v => setBasicInfo(p => ({...p, pain: v}))} color={basicInfo.pain === 'progressive' ? 'red' : 'slate'}/>
          <Pills label="Night Pain" options={[['no','No'],['yes','Yes (malignant indicator)']]} value={basicInfo.nightPain} onChange={v => setBasicInfo(p => ({...p, nightPain: v}))} color={basicInfo.nightPain === 'yes' ? 'red' : 'gray'}/>
        </div>
      </div>

      {/* Clinical Features */}
      <div className={secCls}>
        <h2 className={h2Cls}>🔬 Clinical Examination</h2>
        <Gate question="Is clinical examination applicable?" value={clinicalFeatures.applicable} onChange={v => setClinicalFeatures(p => ({...p, applicable: v}))}>
          <div className="grid grid-cols-2 gap-2">
            <FL label="Size (cm)"><Inp type="number" value={clinicalFeatures.size} onChange={v => setClinicalFeatures(p => ({...p, size: v}))} placeholder="cm (>5cm = high risk)"/></FL>
          </div>
          {parseFloat(clinicalFeatures.size) > 5 && <div className="text-xs text-red-600 font-semibold mb-2">⚠ Size &gt;5cm — high-risk soft tissue sarcoma indicator.</div>}
          <Pills label="Consistency" options={[['soft','Soft (lipoma-like)'],['firm','Firm'],['hard_bony','Hard/bony'],['fluctuant','Fluctuant (cystic)']]} value={clinicalFeatures.consistency} onChange={v => setClinicalFeatures(p => ({...p, consistency: v}))} color={clinicalFeatures.consistency === 'hard_bony' ? 'red' : 'slate'}/>
          <Pills label="Tenderness" options={[['none','Non-tender'],['mild','Mild'],['marked','Marked tender']]} value={clinicalFeatures.tenderness} onChange={v => setClinicalFeatures(p => ({...p, tenderness: v}))}/>
          <Pills label="Fixation to deep structures" options={[['mobile','Mobile — superficial'],['fixed_deep','Fixed to deep structures (malignant indicator)']]} value={clinicalFeatures.fixation} onChange={v => setClinicalFeatures(p => ({...p, fixation: v}))} color={clinicalFeatures.fixation === 'fixed_deep' ? 'red' : 'green'}/>
          <div className="grid grid-cols-2 gap-2">
            <Pills label="Overlying skin" options={[['normal','Normal'],['warm_erythema','Warm/erythema'],['dilated_veins','Dilated veins'],['skin_tethering','Skin tethering/ulceration']]} value={clinicalFeatures.skinChanges} onChange={v => setClinicalFeatures(p => ({...p, skinChanges: v}))} color={clinicalFeatures.skinChanges === 'skin_tethering' ? 'red' : 'slate'}/>
            <Pills label="Regional lymph nodes" options={[['normal','Normal'],['enlarged','Enlarged/palpable']]} value={clinicalFeatures.lymphNodes} onChange={v => setClinicalFeatures(p => ({...p, lymphNodes: v}))} color={clinicalFeatures.lymphNodes === 'enlarged' ? 'red' : 'gray'}/>
          </div>
          <Pills label="Pathological Fracture" options={[['no','No'],['impending','Impending (>50% cortex destroyed)'],['present','Fracture present']]} value={clinicalFeatures.pathFracture} onChange={v => setClinicalFeatures(p => ({...p, pathFracture: v}))} color={clinicalFeatures.pathFracture !== 'no' ? 'red' : 'gray'}/>
          <Pills label="Red Flag Features Present" multi options={[['night_pain','Night pain'],['progressive','Progressive growth'],['deep_to_fascia','Deep to fascia'],['size_gt5','Size >5cm'],['systemic_symptoms','Weight loss/fever'],['neurovascular','Neurovascular compromise'],['age_gt40','Age >40 new bone lesion']]} value={clinicalFeatures.redFlags} onChange={v => setClinicalFeatures(p => ({...p, redFlags: v}))} color="red"/>
          {clinicalFeatures.redFlags?.length >= 2 && <div className="text-xs text-red-700 font-bold bg-red-50 rounded p-2 mt-1">⚠ Multiple red flags — urgent bone tumor centre referral. Do not biopsy locally.</div>}
        </Gate>
      </div>

      {/* Imaging */}
      <div className={secCls}>
        <h2 className={h2Cls}>🩻 Imaging Characteristics</h2>
        <Gate question="Is imaging assessment applicable?" value={imagingCharacteristics.applicable} onChange={v => setImagingCharacteristics(p => ({...p, applicable: v}))}>
          <Pills label="X-ray" options={[['done','Done'],['not_done','Not done']]} value={imagingCharacteristics.xray} onChange={v => setImagingCharacteristics(p => ({...p, xray: v}))} color="blue"/>
          {imagingCharacteristics.xray === 'done' && <FL label="X-ray Findings"><Inp value={imagingCharacteristics.xrayFindings} onChange={v => setImagingCharacteristics(p => ({...p, xrayFindings: v}))} placeholder="lytic/sclerotic/mixed, cortical breach, periosteal reaction (Codman triangle, sunburst), matrix mineralisation"/></FL>}
          <Pills label="MRI (mandatory for staging)" options={[['done','Done'],['not_done','Not done — request urgently'],['pending','Pending']]} value={imagingCharacteristics.mri} onChange={v => setImagingCharacteristics(p => ({...p, mri: v}))} color={imagingCharacteristics.mri === 'not_done' ? 'orange' : 'blue'}/>
          {imagingCharacteristics.mri === 'done' && <FL label="MRI Findings"><Inp value={imagingCharacteristics.mriFindings} onChange={v => setImagingCharacteristics(p => ({...p, mriFindings: v}))} placeholder="compartment involvement, neurovascular proximity, skip lesions, marrow extent, soft tissue extension"/></FL>}
          <Pills label="CT (chest/abdomen for staging)" options={[['done','Done — staging CT'],['not_done','Not done'],['pending','Pending']]} value={imagingCharacteristics.stagingCt} onChange={v => setImagingCharacteristics(p => ({...p, stagingCt: v}))} color="blue"/>
          <Pills label="Bone Scan / PET-CT" options={[['not_done','Not done'],['bone_scan_done','Tc-99m bone scan done'],['pet_ct','PET-CT done']]} value={imagingCharacteristics.boneScan} onChange={v => setImagingCharacteristics(p => ({...p, boneScan: v}))} color="gray"/>
        </Gate>
      </div>

      {/* Enneking Staging */}
      <div className={secCls}>
        <h2 className={h2Cls}>📊 Enneking / MSTS Surgical Staging</h2>
        <Gate question="Is Enneking staging applicable?" value={enneking.applicable} onChange={v => setEnneking(p => ({...p, applicable: v}))}>
          {enneikingStage && (
            <div className={`rounded-lg p-3 mb-3 border ${enneikingStage.stage === 'Stage III' ? 'bg-red-50 border-red-400' : 'bg-orange-50 border-orange-300'}`}>
              <div className={`text-xl font-bold ${enneikingStage.color}`}>{enneikingStage.stage}</div>
              <div className="text-xs text-gray-600 mt-0.5">{enneikingStage.label}</div>
            </div>
          )}
          <Pills label="Tumor Type" options={[['primary_bone','Primary bone tumor'],['primary_soft_tissue','Primary soft tissue tumor'],['metastatic','Metastatic (secondary)']]} value={enneking.tumorType} onChange={v => setEnneking(p => ({...p, tumorType: v}))} color="slate"/>
          <Pills label="Histological Grade" options={[['benign','Benign (G0)'],['low','Low grade (G1)'],['high','High grade (G2)']]} value={enneking.grade} onChange={v => setEnneking(p => ({...p, grade: v}))} color={enneking.grade === 'high' ? 'red' : enneking.grade === 'low' ? 'orange' : 'green'}/>
          <Pills label="Local Extent" options={[['intracompartmental','T1 — Intracompartmental'],['extracompartmental','T2 — Extracompartmental (fascia breach)']]} value={enneking.localExtent} onChange={v => setEnneking(p => ({...p, localExtent: v}))} color="orange"/>
          <Pills label="Distant Metastases" options={[['no','No (M0)'],['yes','Yes — lung/other (M1)']]} value={enneking.metastases} onChange={v => setEnneking(p => ({...p, metastases: v}))} color={enneking.metastases === 'yes' ? 'red' : 'green'}/>
        </Gate>
      </div>

      {/* Biopsy */}
      <div className={secCls}>
        <h2 className={h2Cls}>🔬 Biopsy</h2>
        <Gate question="Is biopsy assessment applicable?" value={biopsyData.applicable} onChange={v => setBiopsyData(p => ({...p, applicable: v}))}>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 mb-2 text-xs text-orange-700">Biopsy planning: must be planned by treating bone tumor surgeon. Tract must be excisable at definitive surgery. Avoid transcompartmental contamination.</div>
          <Pills label="Biopsy Status" options={[['not_done','Not done yet'],['core_needle','Core needle biopsy done'],['incisional','Incisional biopsy done'],['excisional','Excisional biopsy (benign only)'],['intraoperative','Intraoperative frozen section']]} value={biopsyData.done} onChange={v => setBiopsyData(p => ({...p, done: v}))}/>
          {biopsyData.done && biopsyData.done !== 'not_done' && <>
            <FL label="Histopathology Result"><Inp value={biopsyData.pathology} onChange={v => setBiopsyData(p => ({...p, pathology: v}))} placeholder="e.g. Ewing sarcoma, osteosarcoma, chondrosarcoma, GCT, enchondroma"/></FL>
            <FL label="Grading"><Inp value={biopsyData.grading} onChange={v => setBiopsyData(p => ({...p, grading: v}))} placeholder="grade/stage per histopathologist report"/></FL>
            <FL label="IHC/Molecular Markers"><Inp value={biopsyData.immunohistochem} onChange={v => setBiopsyData(p => ({...p, immunohistochem: v}))} placeholder="e.g. EWSR1 rearrangement, MDM2/CDK4 (WDL/DDLS), S100, SMA"/></FL>
          </>}
        </Gate>
      </div>

      {/* Diagnosis */}
      <div className={secCls}>
        <h2 className={h2Cls}>🩺 Diagnosis</h2>
        <Gate question="Is diagnosis applicable?" value={diagnosisData.applicable} onChange={v => setDiagnosisData(p => ({...p, applicable: v}))}>
          <Pills label="Primary Diagnosis" options={[['osteosarcoma','Osteosarcoma'],['ewing_sarcoma','Ewing sarcoma'],['chondrosarcoma','Chondrosarcoma'],['gcT_bone','Giant cell tumor (bone)'],['enchondroma','Enchondroma (benign)'],['osteochondroma','Osteochondroma (benign)'],['aneurysmal_bc','Aneurysmal bone cyst'],['simple_bc','Simple bone cyst'],['fibrous_dysplasia','Fibrous dysplasia'],['soft_tissue_sarcoma','Soft tissue sarcoma (NOS)'],['liposarcoma','Liposarcoma'],['rhabdomyosarcoma','Rhabdomyosarcoma'],['synovial_sarcoma','Synovial sarcoma'],['metastatic_carcinoma','Metastatic carcinoma'],['myeloma','Myeloma/plasmacytoma']]} value={diagnosisData.primaryDx} onChange={v => setDiagnosisData(p => ({...p, primaryDx: v}))} color="slate"/>
          <Pills label="Benign / Malignant" options={[['benign','Benign'],['locally_aggressive','Locally aggressive (intermediate)'],['malignant_low','Malignant — low grade'],['malignant_high','Malignant — high grade'],['metastatic','Metastatic']]} value={diagnosisData.benignMalignant} onChange={v => setDiagnosisData(p => ({...p, benignMalignant: v}))} color={diagnosisData.benignMalignant?.includes('malignant') ? 'red' : diagnosisData.benignMalignant === 'benign' ? 'green' : 'orange'}/>
          <FL label="ICD-10/ICD-O Code"><Inp value={diagnosisData.icd10} onChange={v => setDiagnosisData(p => ({...p, icd10: v}))} placeholder="e.g. C40.2 (OS femur), D16.2 (benign bone femur)"/></FL>
          <FL label="Notes"><textarea value={diagnosisData.notes} onChange={e => setDiagnosisData(p => ({...p, notes: e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-14 focus:outline-none focus:ring-2 focus:ring-slate-500"/></FL>
        </Gate>
      </div>

      {/* Management */}
      <div className={secCls}>
        <h2 className={h2Cls}>💊 Management Plan</h2>
        <Gate question="Is management plan applicable?" value={managementData.applicable} onChange={v => setManagementData(p => ({...p, applicable: v}))}>
          <Pills label="MDT Referral" options={[['not_done','Not done — refer urgently'],['referred','Referred to bone tumor centre'],['mdT_discussed','MDT discussion done']]} value={managementData.mdtReferral} onChange={v => setManagementData(p => ({...p, mdtReferral: v}))} color={managementData.mdtReferral === 'not_done' ? 'red' : 'green'}/>
          <Pills label="Surgical Plan" options={[['observation','Observation (benign incidental)'],['intralesional_curettage','Intralesional curettage (benign)'],['wide_resection','Wide resection (limb salvage)'],['limb_salvage_endo','Limb salvage + endoprosthesis'],['amputation','Amputation'],['stabilisation_only','Stabilisation + radiotherapy (metastatic)']]} value={managementData.surgery} onChange={v => setManagementData(p => ({...p, surgery: v}))} color="slate"/>
          <div className="grid grid-cols-2 gap-2">
            <Pills label="Chemotherapy" options={[['none','None'],['neoadjuvant','Neoadjuvant (pre-op)'],['adjuvant','Adjuvant (post-op)'],['palliative','Palliative']]} value={managementData.chemotherapy} onChange={v => setManagementData(p => ({...p, chemotherapy: v}))} color="purple"/>
            <Pills label="Radiotherapy" options={[['none','None'],['definitive','Definitive (Ewing/RMS)'],['adjuvant','Adjuvant'],['palliative','Palliative (bone mets)']]} value={managementData.radiotherapy} onChange={v => setManagementData(p => ({...p, radiotherapy: v}))} color="blue"/>
          </div>
          <FL label="Follow-up Plan"><Inp value={managementData.followUp} onChange={v => setManagementData(p => ({...p, followUp: v}))} placeholder="e.g. 3 months imaging, 5-year surveillance, NED check"/></FL>
          <FL label="Notes"><textarea value={managementData.notes} onChange={e => setManagementData(p => ({...p, notes: e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-14 focus:outline-none focus:ring-2 focus:ring-slate-500" placeholder="India context: Tata Memorial Mumbai, AIIMS Delhi, RCC Thiruvananthapuram. PM-JAY — check coverage for sarcoma MDT."/></FL>
        </Gate>
      </div>

      <div className="flex justify-end mt-2">
        <button type="button" onClick={handleSave} disabled={saving}
          className="px-6 py-2.5 bg-gradient-to-r from-slate-600 to-gray-700 text-white rounded-xl font-semibold text-sm shadow hover:from-slate-700 hover:to-gray-800 disabled:opacity-60 transition-all">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Assessment'}
        </button>
      </div>
    </div>
  );
}
