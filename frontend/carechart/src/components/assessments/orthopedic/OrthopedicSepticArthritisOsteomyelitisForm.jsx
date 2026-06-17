/** @shared-pool */
import React, { useState, useMemo } from 'react';
import api from '../../../api/client';

const CM = { emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300 data-[sel=true]:bg-emerald-600 data-[sel=true]:text-white data-[sel=true]:border-emerald-600', red: 'bg-red-100 text-red-800 border-red-300 data-[sel=true]:bg-red-500 data-[sel=true]:text-white data-[sel=true]:border-red-500', orange: 'bg-orange-100 text-orange-800 border-orange-300 data-[sel=true]:bg-orange-500 data-[sel=true]:text-white data-[sel=true]:border-orange-500', blue: 'bg-blue-100 text-blue-800 border-blue-300 data-[sel=true]:bg-blue-500 data-[sel=true]:text-white data-[sel=true]:border-blue-500', green: 'bg-green-100 text-green-800 border-green-300 data-[sel=true]:bg-green-500 data-[sel=true]:text-white data-[sel=true]:border-green-500', gray: 'bg-gray-100 text-gray-700 border-gray-300 data-[sel=true]:bg-gray-500 data-[sel=true]:text-white data-[sel=true]:border-gray-500' };
function Pills({ label, options, value, onChange, multi = false, color = 'emerald' }) {
  const cls = CM[color] || CM.emerald;
  const isSel = (v) => multi ? (Array.isArray(value) ? value.includes(v) : false) : value === v;
  const click = (v) => { if (multi) { const a = Array.isArray(value) ? value : []; onChange(a.includes(v) ? a.filter(x => x !== v) : [...a, v]); } else onChange(value === v ? '' : v); };
  return (<div className="mb-3">{label && <div className="text-xs font-medium text-gray-600 mb-1">{label}</div>}<div className="flex flex-wrap gap-1.5">{options.map(opt => { const [v, l] = Array.isArray(opt) ? opt : [opt, opt]; return <button key={v} type="button" data-sel={isSel(v)} onClick={() => click(v)} className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${cls}`}>{l}</button>; })}</div></div>);
}
function FL({ label, sub, children }) { return <div className="mb-3"><label className="block text-xs font-medium text-gray-600 mb-1">{label}{sub && <span className="text-gray-400 font-normal ml-1">{sub}</span>}</label>{children}</div>; }
function Gate({ question, value, onChange, children }) {
  return (<div><div className="flex items-center gap-3 mb-3"><span className="text-sm font-medium text-gray-700">{question}</span>{['yes','no'].map(v => <button key={v} type="button" onClick={() => onChange(value === v ? null : v)} className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${value === v ? v === 'yes' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-gray-400 text-white border-gray-400' : 'bg-white text-gray-600 border-gray-300'}`}>{v === 'yes' ? 'Yes' : 'No'}</button>)}</div>{value === 'yes' && <div className="border-l-2 border-emerald-300 pl-3">{children}</div>}{value === 'no' && <div className="flex items-center gap-2 text-xs text-gray-400 italic py-1"><span>🔒</span><span>Not applicable — section locked</span></div>}</div>);
}
function Inp({ value, onChange, type = 'text', placeholder = '' }) { return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"/>; }

export default function OrthopedicSepticArthritisOsteomyelitisForm({ patientId, encounterId }) {
  const [basicInfo, setBasicInfo] = useState({ condition: '', site: '', side: '', age: '', onset: '', duration: '' });
  const [kocher, setKocher] = useState({ applicable: null, fever: '', nwb: '', esr: '', wbc: '', crp: '' });
  const [clinicalFeatures, setClinicalFeatures] = useState({ applicable: null, fever: '', temp: '', erythema: '', swelling: '', tenderness: '', rom: '', systemicSx: [], riskFactors: [] });
  const [investigations, setInvestigations] = useState({ applicable: null, wbc: '', esr: '', crp: '', procalcitonin: '', cultures: '', aspirate: '', aspirateWbc: '', aspirateOrganisms: '', xray: '', mri: '', boneScan: '' });
  const [omClassification, setOmClassification] = useState({ applicable: null, ciernyStageDuration: '', ciernyHost: '', ciernyStage: '', tbOsteomyelitis: '' });
  const [antibiotics, setAntibiotics] = useState({ applicable: null, empirical: '', organism: '', sensitivities: '', definitive: '', route: '', duration: '' });
  const [surgical, setSurgical] = useState({ applicable: null, washout: '', debridement: '', sequestrectomy: '', implantManagement: '', flap: '', bonegraft: '' });
  const [diagnosisData, setDiagnosisData] = useState({ applicable: null, primaryDx: '', icd10: '', notes: '' });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Kocher criteria (adult modified) ─────────────────────────────────────────
  const kocherScore = useMemo(() => {
    if (kocher.applicable !== 'yes') return null;
    let score = 0;
    if (kocher.fever === 'yes') score++;
    if (kocher.nwb === 'yes') score++;
    if (kocher.esr === 'yes') score++;
    if (kocher.wbc === 'yes') score++;
    if (kocher.crp === 'yes') score++;
    const prob = score === 0 ? '<0.2%' : score === 1 ? '3%' : score === 2 ? '40%' : score === 3 ? '93%' : '≥99%';
    return { score, prob, high: score >= 3 };
  }, [kocher]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/assessments', { type: 'septic_arthritis_osteomyelitis', patientId, encounterId, data: { basicInfo, kocher, kocherScore, clinicalFeatures, investigations, omClassification, antibiotics, surgical, diagnosisData } });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const secCls = 'bg-white rounded-xl border border-emerald-100 shadow-sm p-4 mb-4';
  const h2Cls = 'text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-50 p-4">
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl p-4 mb-4 text-white shadow">
        <h1 className="text-lg font-bold">Septic Arthritis / Osteomyelitis Assessment</h1>
        <p className="text-emerald-100 text-xs mt-0.5">Kocher Score · Cierny-Mader Classification · Culture-Directed Antibiotics · TB Osteomyelitis</p>
      </div>

      {/* Basic Info */}
      <div className={secCls}>
        <h2 className={h2Cls}>📋 Basic Information</h2>
        <Pills label="Primary Condition" options={[['septic_arthritis','Septic Arthritis'],['osteomyelitis','Osteomyelitis'],['both','Both (septic arthritis + osteomyelitis)'],['prosthetic_joint_infection','Prosthetic Joint Infection (PJI)']]} value={basicInfo.condition} onChange={v => setBasicInfo(p => ({...p, condition: v}))} color="red"/>
        <Pills label="Site Affected" options={[['knee','Knee'],['hip','Hip'],['shoulder','Shoulder'],['elbow','Elbow'],['ankle','Ankle'],['spine','Spine (spondylodiscitis)'],['long_bone','Long bone (tibia/femur)'],['small_bone','Hand/foot bones']]} value={basicInfo.site} onChange={v => setBasicInfo(p => ({...p, site: v}))} color="orange"/>
        <div className="grid grid-cols-3 gap-2">
          <Pills label="Side" options={[['left','Left'],['right','Right'],['bilateral','Bilateral'],['axial','Axial']]} value={basicInfo.side} onChange={v => setBasicInfo(p => ({...p, side: v}))}/>
          <Pills label="Age Group" options={[['neonate','Neonate'],['child','Child <12y'],['adult','Adult'],['elderly','Elderly']]} value={basicInfo.age} onChange={v => setBasicInfo(p => ({...p, age: v}))}/>
          <Pills label="Onset" options={[['acute','Acute (<2w)'],['subacute','Subacute (2–6w)'],['chronic','Chronic (>6w)']]} value={basicInfo.onset} onChange={v => setBasicInfo(p => ({...p, onset: v}))} color={basicInfo.onset === 'acute' ? 'red' : 'emerald'}/>
        </div>
      </div>

      {/* Kocher Criteria */}
      <div className={secCls}>
        <h2 className={h2Cls}>🧮 Kocher Criteria (Septic Arthritis Probability)</h2>
        <Gate question="Is Kocher criteria assessment applicable?" value={kocher.applicable} onChange={v => setKocher(p => ({...p, applicable: v}))}>
          {kocherScore && (
            <div className={`rounded-lg p-3 mb-3 border-2 ${kocherScore.high ? 'bg-red-50 border-red-400 animate-pulse' : 'bg-gray-50 border-gray-300'}`}>
              <div className="flex items-baseline gap-3">
                <span className={`text-2xl font-bold ${kocherScore.high ? 'text-red-700' : 'text-gray-700'}`}>{kocherScore.score}/5</span>
                <span className={`text-sm font-semibold ${kocherScore.high ? 'text-red-700' : 'text-gray-600'}`}>Probability: {kocherScore.prob}</span>
              </div>
              {kocherScore.high && <div className="text-xs text-red-700 font-medium mt-1">⚠ High probability of septic arthritis — urgent joint aspiration and surgical washout.</div>}
            </div>
          )}
          {[['fever','Fever (temperature >38.5°C)'],['nwb','Non-weight bearing'],['esr','ESR >40 mm/hr'],['wbc','WBC >12,000/mm³'],['crp','CRP >20 mg/L']].map(([k, lbl]) => (
            <div key={k} className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-xs text-gray-600">{lbl}</span>
              <div className="flex gap-1">
                {['yes','no','not_done'].map(v => (
                  <button key={v} type="button" onClick={() => setKocher(p => ({...p, [k]: v}))}
                    className={`px-2 py-0.5 rounded text-xs border transition-colors ${kocher[k] === v ? v === 'yes' ? 'bg-red-500 text-white border-red-500' : v === 'no' ? 'bg-green-500 text-white border-green-500' : 'bg-gray-400 text-white border-gray-400' : 'bg-white text-gray-500 border-gray-300'}`}>
                    {v === 'not_done' ? 'N/D' : v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Gate>
      </div>

      {/* Clinical Features */}
      <div className={secCls}>
        <h2 className={h2Cls}>🔬 Clinical Features</h2>
        <Gate question="Is clinical assessment applicable?" value={clinicalFeatures.applicable} onChange={v => setClinicalFeatures(p => ({...p, applicable: v}))}>
          <div className="grid grid-cols-2 gap-2">
            <Pills label="Fever" options={[['no','No'],['low_grade','Low grade (37.5–38.5°C)'],['high','High (>38.5°C)']]} value={clinicalFeatures.fever} onChange={v => setClinicalFeatures(p => ({...p, fever: v}))} color={clinicalFeatures.fever === 'high' ? 'red' : 'emerald'}/>
            <FL label="Temperature (°C)"><Inp type="number" value={clinicalFeatures.temp} onChange={v => setClinicalFeatures(p => ({...p, temp: v}))} placeholder="°C"/></FL>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[['erythema','Erythema'],['swelling','Swelling/effusion'],['tenderness','Localised tenderness'],['rom','Restricted ROM (all planes)']].map(([k, lbl]) => (
              <Pills key={k} label={lbl} options={[['no','No'],['yes','Yes']]} value={clinicalFeatures[k]} onChange={v => setClinicalFeatures(p => ({...p, [k]: v}))} color={clinicalFeatures[k] === 'yes' ? 'red' : 'gray'}/>
            ))}
          </div>
          <Pills label="Systemic Symptoms" multi options={[['rigors','Rigors'],['sepsis','Signs of sepsis (HR↑, BP↓)'],['lymphadenopathy','Lymphadenopathy'],['night_sweats','Night sweats (TB?)'],['weight_loss','Weight loss (TB?)']]} value={clinicalFeatures.systemicSx} onChange={v => setClinicalFeatures(p => ({...p, systemicSx: v}))} color="red"/>
          {(clinicalFeatures.systemicSx?.includes('night_sweats') || clinicalFeatures.systemicSx?.includes('weight_loss')) && <div className="text-xs text-orange-600 font-semibold mb-2">⚠ TB osteomyelitis/arthritis — common in India. Investigate: Mantoux, IGRA, AFB culture, Xpert MTB/RIF on biopsy.</div>}
          <Pills label="Risk Factors" multi options={[['diabetes','Diabetes mellitus'],['immunocompromised','Immunocompromised (HIV, steroids)'],['iv_drug_use','IV drug use'],['recent_procedure','Recent joint injection/surgery'],['skin_infection','Adjacent skin/soft tissue infection'],['sickle_cell','Sickle cell disease (Salmonella risk)'],['tb_contact','TB contact/endemic area']]} value={clinicalFeatures.riskFactors} onChange={v => setClinicalFeatures(p => ({...p, riskFactors: v}))} color="orange"/>
        </Gate>
      </div>

      {/* Investigations */}
      <div className={secCls}>
        <h2 className={h2Cls}>🧪 Investigations</h2>
        <Gate question="Is investigation assessment applicable?" value={investigations.applicable} onChange={v => setInvestigations(p => ({...p, applicable: v}))}>
          <div className="grid grid-cols-3 gap-2">
            <FL label="WBC (×10⁹/L)"><Inp type="number" value={investigations.wbc} onChange={v => setInvestigations(p => ({...p, wbc: v}))} placeholder="×10⁹/L"/></FL>
            <FL label="ESR (mm/hr)"><Inp type="number" value={investigations.esr} onChange={v => setInvestigations(p => ({...p, esr: v}))} placeholder="mm/hr"/></FL>
            <FL label="CRP (mg/L)"><Inp type="number" value={investigations.crp} onChange={v => setInvestigations(p => ({...p, crp: v}))} placeholder="mg/L"/></FL>
          </div>
          <FL label="Procalcitonin (ng/mL)" sub="if available"><Inp type="number" value={investigations.procalcitonin} onChange={v => setInvestigations(p => ({...p, procalcitonin: v}))} placeholder="ng/mL"/></FL>
          <Pills label="Blood Cultures" options={[['not_done','Not done'],['sent','Sent — awaiting'],['no_growth','No growth'],['positive','Positive — organism identified']]} value={investigations.cultures} onChange={v => setInvestigations(p => ({...p, cultures: v}))} color="blue"/>
          <Pills label="Joint Aspirate" options={[['not_done','Not done'],['done','Done — sent MC&S'],['turbid','Turbid/pus'],['clear','Clear (DDx gout/RA)']]} value={investigations.aspirate} onChange={v => setInvestigations(p => ({...p, aspirate: v}))} color={investigations.aspirate === 'turbid' ? 'red' : 'blue'}/>
          {(investigations.aspirate === 'done' || investigations.aspirate === 'turbid') && <>
            <FL label="Synovial fluid WBC (/mm³)" sub=">50,000 = septic arthritis likely"><Inp type="number" value={investigations.aspirateWbc} onChange={v => setInvestigations(p => ({...p, aspirateWbc: v}))} placeholder="/mm³"/></FL>
            {parseFloat(investigations.aspirateWbc) > 50000 && <div className="text-xs text-red-600 font-bold mb-2">⚠ Synovial WBC &gt;50,000 — highly suggestive of septic arthritis. Urgent surgical washout.</div>}
            <FL label="Organisms Identified"><Inp value={investigations.aspirateOrganisms} onChange={v => setInvestigations(p => ({...p, aspirateOrganisms: v}))} placeholder="e.g. S. aureus, Salmonella, Brucella, AFB"/></FL>
          </>}
          <div className="grid grid-cols-3 gap-2">
            <Pills label="X-ray" options={[['done','Done'],['not_done','Not done']]} value={investigations.xray} onChange={v => setInvestigations(p => ({...p, xray: v}))} color="gray"/>
            <Pills label="MRI" options={[['done','Done'],['not_done','Not done'],['pending','Pending']]} value={investigations.mri} onChange={v => setInvestigations(p => ({...p, mri: v}))} color="blue"/>
            <Pills label="Bone Scan" options={[['done','Done'],['not_done','Not done']]} value={investigations.boneScan} onChange={v => setInvestigations(p => ({...p, boneScan: v}))} color="gray"/>
          </div>
        </Gate>
      </div>

      {/* Cierny-Mader Osteomyelitis */}
      <div className={secCls}>
        <h2 className={h2Cls}>🦴 Cierny-Mader Osteomyelitis Classification</h2>
        <Gate question="Is osteomyelitis classification applicable?" value={omClassification.applicable} onChange={v => setOmClassification(p => ({...p, applicable: v}))}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-1">Anatomic Stage</div>
              <Pills options={[['I','Stage I — Medullary (intramedullary)'],['II','Stage II — Superficial (cortex only)'],['III','Stage III — Localised (cortex + medulla)'],['IV','Stage IV — Diffuse (circumferential)']]} value={omClassification.ciernyStage} onChange={v => setOmClassification(p => ({...p, ciernyStage: v}))} color={['III','IV'].includes(omClassification.ciernyStage) ? 'red' : 'orange'}/>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-1">Physiological Class (Host)</div>
              <Pills options={[['A','Class A — Normal host'],['B_local','Class B-local — Local compromise'],['B_systemic','Class B-systemic — Systemic disease'],['C','Class C — Prohibitive morbidity of treatment']]} value={omClassification.ciernyHost} onChange={v => setOmClassification(p => ({...p, ciernyHost: v}))} color={omClassification.ciernyHost === 'C' ? 'gray' : 'emerald'}/>
            </div>
          </div>
          <Pills label="Tuberculosis Osteomyelitis Features" options={[['not_suspected','Not suspected'],['suspected','Suspected — night sweats, constitutional features'],['confirmed','Confirmed TB — Xpert/culture positive']]} value={omClassification.tbOsteomyelitis} onChange={v => setOmClassification(p => ({...p, tbOsteomyelitis: v}))} color={omClassification.tbOsteomyelitis !== 'not_suspected' ? 'orange' : 'gray'}/>
          {omClassification.tbOsteomyelitis !== 'not_suspected' && omClassification.tbOsteomyelitis && <div className="text-xs text-orange-700 bg-orange-50 rounded p-2 mb-2">TB spondylodiscitis (Pott's disease): commonest cause of infectious spondylitis in India. Standard ATT ×18m. Drainage/stabilisation if neurological deficit.</div>}
        </Gate>
      </div>

      {/* Antibiotics */}
      <div className={secCls}>
        <h2 className={h2Cls}>💊 Antimicrobial Therapy</h2>
        <Gate question="Is antimicrobial therapy documentation applicable?" value={antibiotics.applicable} onChange={v => setAntibiotics(p => ({...p, applicable: v}))}>
          <FL label="Empirical Antibiotics (before culture results)"><Inp value={antibiotics.empirical} onChange={v => setAntibiotics(p => ({...p, empirical: v}))} placeholder="e.g. Flucloxacillin 2g IV QDS + Gentamicin (SA) | Ceftriaxone 2g IV OD (GN)"/></FL>
          <FL label="Organism Identified"><Inp value={antibiotics.organism} onChange={v => setAntibiotics(p => ({...p, organism: v}))} placeholder="e.g. MSSA, MRSA, Streptococcus, Salmonella, E.coli, Brucella"/></FL>
          <FL label="Sensitivities"><Inp value={antibiotics.sensitivities} onChange={v => setAntibiotics(p => ({...p, sensitivities: v}))} placeholder="antibiogram details"/></FL>
          <FL label="Definitive Antibiotic Regimen"><Inp value={antibiotics.definitive} onChange={v => setAntibiotics(p => ({...p, definitive: v}))} placeholder="e.g. Cloxacillin IV 2g QDS + switch to oral Clindamycin after 2w"/></FL>
          <div className="grid grid-cols-2 gap-2">
            <Pills label="Route" options={[['iv','IV (acute)'],['oral','Oral (step-down)'],['iv_to_oral','IV → Oral after 48–72h afebrile']]} value={antibiotics.route} onChange={v => setAntibiotics(p => ({...p, route: v}))} color="blue"/>
            <Pills label="Total Duration" options={[['2_4w','2–4 weeks (SA)'],['4_6w','4–6 weeks (OM acute)'],['6_8w','6–8 weeks (OM complex)'],['ati_18m','18 months (TB)']]} value={antibiotics.duration} onChange={v => setAntibiotics(p => ({...p, duration: v}))} color="emerald"/>
          </div>
          <div className="text-xs text-emerald-700 bg-emerald-50 rounded p-2 mt-1">India MRSA prevalence ~40% in hospitals. If no growth or HA-MRSA suspected: add Vancomycin/Linezolid. LAMA guidelines for antibiotic stewardship.</div>
        </Gate>
      </div>

      {/* Surgical Management */}
      <div className={secCls}>
        <h2 className={h2Cls}>🏥 Surgical Management</h2>
        <Gate question="Is surgical management applicable?" value={surgical.applicable} onChange={v => setSurgical(p => ({...p, applicable: v}))}>
          <Pills label="Arthroscopic/Open Washout" options={[['not_done','Not indicated'],['arthroscopic','Arthroscopic washout'],['open','Open washout & debridement'],['serial_washout','Serial washouts planned']]} value={surgical.washout} onChange={v => setSurgical(p => ({...p, washout: v}))} color="emerald"/>
          <Pills label="Bone Debridement" options={[['not_required','Not required'],['cortical_debridement','Cortical saucerisation'],['full_debridement','Full debridement ± sequestrectomy'],['amputation','Amputation (end-stage)']]} value={surgical.debridement} onChange={v => setSurgical(p => ({...p, debridement: v}))} color="orange"/>
          <Pills label="Implant Management (PJI)" options={[['na','N/A — no implant'],['retain','DAIR (Debride and retain implant)'],['exchange','Single-stage exchange'],['two_stage','Two-stage exchange'],['remove','Remove without replacement']]} value={surgical.implantManagement} onChange={v => setSurgical(p => ({...p, implantManagement: v}))} color="blue"/>
          <Pills label="Soft Tissue/Bone Reconstruction" options={[['not_needed','Not needed'],['flap_coverage','Soft tissue flap coverage'],['bone_graft','Bone grafting'],['cage_spacer','Antibiotic spacer/cage']]} value={surgical.flap} onChange={v => setSurgical(p => ({...p, flap: v}))} color="emerald"/>
        </Gate>
      </div>

      {/* Diagnosis */}
      <div className={secCls}>
        <h2 className={h2Cls}>🩺 Diagnosis</h2>
        <Gate question="Is diagnosis applicable?" value={diagnosisData.applicable} onChange={v => setDiagnosisData(p => ({...p, applicable: v}))}>
          <Pills label="Primary Diagnosis" options={[['acute_septic_arthritis','Acute septic arthritis'],['chronic_septic_arthritis','Chronic septic arthritis'],['acute_haematogenous_om','Acute haematogenous osteomyelitis'],['subacute_om','Subacute osteomyelitis (Brodie abscess)'],['chronic_om','Chronic osteomyelitis'],['tb_osteomyelitis','Tuberculous osteomyelitis'],['spondylodiscitis','Spondylodiscitis'],['pji','Prosthetic joint infection']]} value={diagnosisData.primaryDx} onChange={v => setDiagnosisData(p => ({...p, primaryDx: v}))} color="emerald"/>
          <FL label="ICD-10"><Inp value={diagnosisData.icd10} onChange={v => setDiagnosisData(p => ({...p, icd10: v}))} placeholder="e.g. M00.0 (SA), M86.1 (OM), M49.0 (TB spondylitis)"/></FL>
          <FL label="Notes"><textarea value={diagnosisData.notes} onChange={e => setDiagnosisData(p => ({...p, notes: e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-14 focus:outline-none focus:ring-2 focus:ring-emerald-400"/></FL>
        </Gate>
      </div>

      <div className="flex justify-end mt-2">
        <button type="button" onClick={handleSave} disabled={saving}
          className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-semibold text-sm shadow hover:from-emerald-600 hover:to-green-600 disabled:opacity-60 transition-all">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Assessment'}
        </button>
      </div>
    </div>
  );
}
