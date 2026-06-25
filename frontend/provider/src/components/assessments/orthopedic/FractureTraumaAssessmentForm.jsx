/** @shared-pool */
import React, { useState, useMemo } from 'react';
import api from '../../../api/client';

// ─── Fracture Pattern SVG ─────────────────────────────────────────────────────
function FracturePatternSVG({ pattern = '' }) {
  const bones = [
    { type: 'transverse', label: 'Transverse', x: 10 },
    { type: 'oblique', label: 'Oblique', x: 80 },
    { type: 'spiral', label: 'Spiral', x: 150 },
    { type: 'comminuted', label: 'Communited', x: 220 },
  ];
  return (
    <svg viewBox="0 0 300 120" className="w-full max-w-xs mx-auto" role="img" aria-label="Fracture patterns">
      <text x="150" y="12" textAnchor="middle" fontSize="9" fill="#6b7280" fontWeight="bold">Fracture Pattern Reference</text>
      {bones.map(({ type, label, x }) => {
        const selected = pattern === type;
        const stroke = selected ? '#ef4444' : '#a0845c';
        const sw = selected ? 2.5 : 1.5;
        return (
          <g key={type} transform={`translate(${x}, 18)`}>
            {/* Bone outline */}
            <rect x="12" y="5" width="36" height="68" rx="18" fill="#fef3c7" stroke={stroke} strokeWidth={sw}/>
            <rect x="16" y="10" width="28" height="58" rx="14" fill="#fde68a" stroke="none"/>
            {/* Fracture line */}
            {type === 'transverse' && <line x1="10" y1="40" x2="50" y2="40" stroke="#ef4444" strokeWidth="2" strokeDasharray={selected ? '0' : '3 1'}/>}
            {type === 'oblique' && <line x1="10" y1="34" x2="50" y2="46" stroke="#ef4444" strokeWidth="2" strokeDasharray={selected ? '0' : '3 1'}/>}
            {type === 'spiral' && <>
              <path d="M14,30 Q32,38 50,32" stroke="#ef4444" strokeWidth="1.5" fill="none" strokeDasharray={selected ? '0' : '3 1'}/>
              <path d="M14,46 Q32,40 50,48" stroke="#ef4444" strokeWidth="1.5" fill="none" strokeDasharray={selected ? '0' : '3 1'}/>
            </>}
            {type === 'comminuted' && <>
              <line x1="12" y1="32" x2="48" y2="36" stroke="#ef4444" strokeWidth="1.5"/>
              <line x1="14" y1="42" x2="48" y2="45" stroke="#ef4444" strokeWidth="1.5"/>
              <line x1="24" y1="30" x2="30" y2="48" stroke="#ef4444" strokeWidth="1.5"/>
              <circle cx="30" cy="39" r="5" fill="#fca5a5" stroke="#ef4444" strokeWidth="1" opacity="0.7"/>
            </>}
            <text x="30" y="88" textAnchor="middle" fontSize="7.5" fill={selected ? '#ef4444' : '#6b7280'} fontWeight={selected ? 'bold' : 'normal'}>{label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────
const COLOR_MAP = {
  red: 'bg-red-100 text-red-800 border-red-300 data-[sel=true]:bg-red-500 data-[sel=true]:text-white data-[sel=true]:border-red-500',
  orange: 'bg-orange-100 text-orange-800 border-orange-300 data-[sel=true]:bg-orange-500 data-[sel=true]:text-white data-[sel=true]:border-orange-500',
  amber: 'bg-amber-100 text-amber-800 border-amber-300 data-[sel=true]:bg-amber-500 data-[sel=true]:text-white data-[sel=true]:border-amber-500',
  blue: 'bg-blue-100 text-blue-800 border-blue-300 data-[sel=true]:bg-blue-500 data-[sel=true]:text-white data-[sel=true]:border-blue-500',
  green: 'bg-green-100 text-green-800 border-green-300 data-[sel=true]:bg-green-500 data-[sel=true]:text-white data-[sel=true]:border-green-500',
  gray: 'bg-gray-100 text-gray-700 border-gray-300 data-[sel=true]:bg-gray-500 data-[sel=true]:text-white data-[sel=true]:border-gray-500',
};
function Pills({ label, options, value, onChange, multi = false, color = 'red' }) {
  const cls = COLOR_MAP[color] || COLOR_MAP.red;
  const isSelected = (v) => multi ? (Array.isArray(value) ? value.includes(v) : false) : value === v;
  const handleClick = (v) => { if (multi) { const a = Array.isArray(value) ? value : []; onChange(a.includes(v) ? a.filter(x => x !== v) : [...a, v]); } else { onChange(value === v ? '' : v); } };
  return (
    <div className="mb-3">
      {label && <div className="text-xs font-medium text-gray-600 mb-1">{label}</div>}
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => { const [v, lbl] = Array.isArray(opt) ? opt : [opt, opt]; return (
          <button key={v} type="button" data-sel={isSelected(v)} onClick={() => handleClick(v)}
            className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${cls}`}>{lbl}</button>
        ); })}
      </div>
    </div>
  );
}
function FL({ label, sub, children }) {
  return <div className="mb-3"><label className="block text-xs font-medium text-gray-600 mb-1">{label}{sub && <span className="text-gray-400 font-normal ml-1">{sub}</span>}</label>{children}</div>;
}
function Gate({ question, value, onChange, children }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm font-medium text-gray-700">{question}</span>
        {['yes','no'].map(v => (
          <button key={v} type="button" onClick={() => onChange(value === v ? null : v)}
            className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${value === v ? v === 'yes' ? 'bg-red-500 text-white border-red-500' : 'bg-gray-400 text-white border-gray-400' : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'}`}>
            {v === 'yes' ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
      {value === 'yes' && <div className="border-l-2 border-red-300 pl-3">{children}</div>}
      {value === 'no' && <div className="flex items-center gap-2 text-xs text-gray-400 italic py-1"><span>🔒</span><span>Not applicable — section locked</span></div>}
    </div>
  );
}
function Inp({ value, onChange, type = 'text', placeholder = '' }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"/>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FractureTraumaAssessmentForm({ patientId, encounterId }) {
  const [basicInfo, setBasicInfo] = useState({ mechanism: '', energyLevel: '', boneAffected: '', segment: '', side: '', dateOfInjury: '' });
  const [fracData, setFracData] = useState({ applicable: null, aoType: '', aoGroup: '', fracPattern: '', displacement: '', angulation: '', shortening: '', openFracture: '', gustilo: '', contamination: '', associatedInjuries: [] });
  const [neurovasc, setNeurovasc] = useState({ applicable: null, distalPulse: '', capRefill: '', motorFunction: '', sensation: '', ankleBI: '', arteryInjury: '', nerveInjury: '', nerveDetail: '' });
  const [messData, setMessData] = useState({ applicable: null, skeletal: '', ischemia: '', ischemiaOver6h: '', shock: '', age: '' });
  const [issData, setIssData] = useState({ applicable: null, head: '', face: '', chest: '', abdomen: '', extremity: '', external: '' });
  const [compartment, setCompartment] = useState({ applicable: null, signs: [], compartmentPressure: '', deltaPressure: '', emergency: '' });
  const [openFxManage, setOpenFxManage] = useState({ applicable: null, abx: '', tetanus: '', woundDebride: '', washout: '', tempFixation: '', definitiveFixation: '', timeToSurgery: '' });
  const [diagnosisData, setDiagnosisData] = useState({ applicable: null, primaryDx: '', classification: '', icd10: '', notes: '' });
  const [managementData, setManagementData] = useState({ applicable: null, emergencyMx: [], fixationType: '', implant: '', weightBearing: '', physio: '', followUp: '', notes: '' });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── MESS Score ───────────────────────────────────────────────────────────────
  const messScore = useMemo(() => {
    if (messData.applicable !== 'yes') return null;
    const skelPts = { low_energy: 1, medium_energy: 2, high_energy: 3, vascular_crush: 4 }[messData.skeletal] ?? null;
    if (skelPts === null) return null;
    let ischPts = { reduced_pulse: 1, pulseless_paresthesia: 2, cool_paralysed: 3 }[messData.ischemia] ?? 0;
    if (messData.ischemiaOver6h === 'yes') ischPts *= 2;
    const shockPts = { stable: 0, transient: 1, persistent: 2 }[messData.shock] ?? 0;
    const agePts = { lt30: 0, '30_50': 1, gt50: 2 }[messData.age] ?? 0;
    const total = skelPts + ischPts + shockPts + agePts;
    const salvageable = total < 7;
    return { total, salvageable, recommendation: total >= 7 ? 'Amputation likely indicated (MESS ≥7)' : 'Limb salvage may be feasible (MESS <7)' };
  }, [messData]);

  // ── ISS ──────────────────────────────────────────────────────────────────────
  const issScore = useMemo(() => {
    if (issData.applicable !== 'yes') return null;
    const vals = [parseInt(issData.head)||0, parseInt(issData.face)||0, parseInt(issData.chest)||0, parseInt(issData.abdomen)||0, parseInt(issData.extremity)||0, parseInt(issData.external)||0];
    if (vals.some(v => v === 6)) return { total: 75, severity: 'Unsurvivable', color: 'text-red-700' };
    const sorted = [...vals].sort((a, b) => b - a).slice(0, 3);
    const total = sorted.reduce((s, v) => s + v * v, 0);
    const severity = total >= 25 ? 'Severe' : total >= 16 ? 'Major' : total >= 9 ? 'Moderate' : 'Minor';
    const color = total >= 25 ? 'text-red-600' : total >= 16 ? 'text-orange-600' : 'text-amber-600';
    return { total, severity, color };
  }, [issData]);

  // ── Compartment syndrome alert ────────────────────────────────────────────────
  const compartmentAlert = useMemo(() => {
    const criticalSigns = ['pain_passive_stretch','paresthesia','paralysis'];
    const signCount = compartment.signs?.filter(s => criticalSigns.includes(s)).length || 0;
    const deltaP = parseFloat(compartment.deltaPressure);
    return (signCount >= 2 || deltaP <= 30) && compartment.applicable === 'yes';
  }, [compartment]);

  const secCls = 'bg-white rounded-xl border border-red-100 shadow-sm p-4 mb-4';
  const h2Cls = 'text-sm font-semibold text-red-800 mb-3 flex items-center gap-2';

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/assessments', { type: 'fracture_trauma', patientId, encounterId, data: { basicInfo, fracData, neurovasc, messData, messScore, issData, issScore, compartment, openFxManage, diagnosisData, managementData } });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-xl p-4 mb-4 text-white shadow">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h1 className="text-lg font-bold">Fracture & Trauma Assessment</h1>
            <p className="text-red-100 text-xs mt-0.5">AO/OTA Classification · ISS · MESS · Open Fx · Compartment Syndrome</p>
          </div>
          <div className="w-44 bg-white/10 rounded-lg p-1">
            <FracturePatternSVG pattern={fracData.fracPattern}/>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className={secCls}>
        <h2 className={h2Cls}>📋 Injury Information</h2>
        <Pills label="Mechanism of Injury" options={[['fall','Fall'],['rta','RTA'],['sports','Sports'],['direct_blow','Direct blow'],['crush','Crush'],['gunshot','Gunshot/blast'],['pathological','Pathological'],['stress','Stress/fatigue']]} value={basicInfo.mechanism} onChange={v => setBasicInfo(p => ({...p, mechanism: v}))} color="red"/>
        <Pills label="Energy Level" options={[['low_energy','Low energy'],['high_energy','High energy'],['very_high','Very high (polytrauma)']]} value={basicInfo.energyLevel} onChange={v => setBasicInfo(p => ({...p, energyLevel: v}))} color={basicInfo.energyLevel === 'very_high' ? 'red' : basicInfo.energyLevel === 'high_energy' ? 'orange' : 'amber'}/>
        <div className="grid grid-cols-2 gap-2">
          <Pills label="Side" options={[['left','Left'],['right','Right'],['bilateral','Bilateral'],['axial','Axial/spine']]} value={basicInfo.side} onChange={v => setBasicInfo(p => ({...p, side: v}))}/>
          <FL label="Date of Injury"><Inp type="date" value={basicInfo.dateOfInjury} onChange={v => setBasicInfo(p => ({...p, dateOfInjury: v}))}/></FL>
        </div>
        <Pills label="Bone Affected" options={[['humerus','Humerus'],['radius_ulna','Radius/Ulna'],['hand','Hand/Wrist'],['femur','Femur'],['tibia_fibula','Tibia/Fibula'],['foot_ankle','Foot/Ankle'],['pelvis','Pelvis/Acetabulum'],['spine','Spine'],['clavicle','Clavicle'],['multiple','Multiple']]} value={basicInfo.boneAffected} onChange={v => setBasicInfo(p => ({...p, boneAffected: v}))} color="orange"/>
        <Pills label="Segment" options={[['proximal','Proximal (1)'],['diaphysis','Diaphysis (2)'],['distal','Distal (3)'],['articular','Articular']]} value={basicInfo.segment} onChange={v => setBasicInfo(p => ({...p, segment: v}))}/>
      </div>

      {/* Fracture Characterisation */}
      <div className={secCls}>
        <h2 className={h2Cls}>🦴 Fracture Characterisation (AO/OTA)</h2>
        <Gate question="Is fracture characterisation applicable?" value={fracData.applicable} onChange={v => setFracData(p => ({...p, applicable: v}))}>
          <div className="bg-red-50 rounded-lg p-3 mb-3">
            <div className="text-xs font-semibold text-red-700 mb-2">AO/OTA Type</div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-xs text-gray-500 mb-1">Type</div>
                <Pills options={[['A','A — Simple'],['B','B — Wedge/partial'],['C','C — Complex/comminuted']]} value={fracData.aoType} onChange={v => setFracData(p => ({...p, aoType: v}))} color={fracData.aoType === 'C' ? 'red' : fracData.aoType === 'B' ? 'orange' : 'amber'}/>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Group (1–3)</div>
                <Pills options={[['1','1'],['2','2'],['3','3']]} value={fracData.aoGroup} onChange={v => setFracData(p => ({...p, aoGroup: v}))}/>
              </div>
            </div>
          </div>
          <Pills label="Fracture Pattern" options={[['transverse','Transverse'],['oblique','Oblique'],['spiral','Spiral'],['comminuted','Comminuted'],['segmental','Segmental'],['avulsion','Avulsion'],['impacted','Impacted'],['greenstick','Greenstick']]} value={fracData.fracPattern} onChange={v => setFracData(p => ({...p, fracPattern: v}))} color="orange"/>
          <div className="grid grid-cols-3 gap-2">
            <Pills label="Displacement" options={[['none','None'],['minimal','Minimal'],['significant','Significant'],['complete','Complete']]} value={fracData.displacement} onChange={v => setFracData(p => ({...p, displacement: v}))}/>
            <Pills label="Shortening" options={[['none','None'],['lt2cm','<2 cm'],['gt2cm','>2 cm']]} value={fracData.shortening} onChange={v => setFracData(p => ({...p, shortening: v}))}/>
            <FL label="Angulation (°)"><Inp type="number" value={fracData.angulation} onChange={v => setFracData(p => ({...p, angulation: v}))} placeholder="degrees"/></FL>
          </div>
          <Pills label="Open Fracture?" options={[['no','No — Closed'],['yes','Yes — Open']]} value={fracData.openFracture} onChange={v => setFracData(p => ({...p, openFracture: v}))} color={fracData.openFracture === 'yes' ? 'red' : 'gray'}/>
          {fracData.openFracture === 'yes' && <>
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-2">
              <div className="text-xs font-semibold text-red-700 mb-1">Gustilo-Anderson Classification</div>
              <Pills options={[['I','Type I — Clean wound <1 cm'],['II','Type II — Wound 1–10 cm'],['IIIA','Type IIIA — >10 cm, adequate coverage'],['IIIB','Type IIIB — Periosteal strip, needs flap'],['IIIC','Type IIIC — Arterial injury requiring repair']]} value={fracData.gustilo} onChange={v => setFracData(p => ({...p, gustilo: v}))} color={fracData.gustilo?.startsWith('III') ? 'red' : 'orange'}/>
              {(fracData.gustilo === 'IIIB' || fracData.gustilo === 'IIIC') && (
                <div className="text-xs text-red-700 font-semibold mt-1 animate-pulse">⚠ High-grade open fracture — urgent operative management. IV antibiotics within 1 hour.</div>
              )}
            </div>
            <Pills label="Wound Contamination" options={[['clean','Clean'],['contaminated','Contaminated'],['grossly_contaminated','Grossly contaminated (farm/soil)']]} value={fracData.contamination} onChange={v => setFracData(p => ({...p, contamination: v}))} color="red"/>
          </>}
          <Pills label="Associated Injuries" multi options={[['vascular','Vascular injury'],['nerve','Nerve injury'],['tendon','Tendon injury'],['skin_loss','Skin loss'],['joint_dislocation','Dislocation'],['ipsilateral_fracture','Ipsilateral fracture'],['visceral','Visceral injury']]} value={fracData.associatedInjuries} onChange={v => setFracData(p => ({...p, associatedInjuries: v}))} color="red"/>
        </Gate>
      </div>

      {/* Neurovascular Status */}
      <div className={secCls}>
        <h2 className={h2Cls}>🩺 Neurovascular Status</h2>
        <Gate question="Is neurovascular assessment applicable?" value={neurovasc.applicable} onChange={v => setNeurovasc(p => ({...p, applicable: v}))}>
          <div className="grid grid-cols-2 gap-2">
            <Pills label="Distal Pulse" options={[['present_normal','Present — normal'],['diminished','Diminished'],['absent','Absent']]} value={neurovasc.distalPulse} onChange={v => setNeurovasc(p => ({...p, distalPulse: v}))} color={neurovasc.distalPulse === 'absent' ? 'red' : neurovasc.distalPulse === 'diminished' ? 'orange' : 'green'}/>
            <Pills label="Capillary Refill" options={[['normal','Normal (<2s)'],['delayed','Delayed (2–5s)'],['absent','Absent/blue']]} value={neurovasc.capRefill} onChange={v => setNeurovasc(p => ({...p, capRefill: v}))} color={neurovasc.capRefill === 'absent' ? 'red' : neurovasc.capRefill === 'delayed' ? 'orange' : 'green'}/>
          </div>
          {(neurovasc.distalPulse === 'absent' || neurovasc.capRefill === 'absent') && (
            <div className="bg-red-100 border border-red-400 rounded-lg p-2 mb-2 text-red-800 text-xs font-semibold animate-pulse">
              🚨 VASCULAR EMERGENCY — absent pulse. Urgent vascular surgery consult. Do not delay.
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Pills label="Motor Function (distal)" options={[['intact','Intact'],['weak','Weakened'],['absent','Absent']]} value={neurovasc.motorFunction} onChange={v => setNeurovasc(p => ({...p, motorFunction: v}))} color={neurovasc.motorFunction === 'absent' ? 'red' : neurovasc.motorFunction === 'weak' ? 'orange' : 'green'}/>
            <Pills label="Sensation (distal)" options={[['intact','Intact'],['reduced','Reduced'],['absent','Absent']]} value={neurovasc.sensation} onChange={v => setNeurovasc(p => ({...p, sensation: v}))} color={neurovasc.sensation === 'absent' ? 'red' : neurovasc.sensation === 'reduced' ? 'orange' : 'green'}/>
          </div>
          <Pills label="Arterial Injury Suspected?" options={[['no','No'],['yes','Yes'],['confirmed','Confirmed on imaging']]} value={neurovasc.arteryInjury} onChange={v => setNeurovasc(p => ({...p, arteryInjury: v}))} color={neurovasc.arteryInjury !== 'no' ? 'red' : 'gray'}/>
          <Pills label="Nerve Injury Suspected?" options={[['no','No'],['neuropraxia','Neuropraxia'],['axonotmesis','Axonotmesis'],['neurotmesis','Neurotmesis']]} value={neurovasc.nerveInjury} onChange={v => setNeurovasc(p => ({...p, nerveInjury: v}))} color={neurovasc.nerveInjury !== 'no' ? 'orange' : 'gray'}/>
          {neurovasc.nerveInjury && neurovasc.nerveInjury !== 'no' && <FL label="Nerve(s) Involved"><Inp value={neurovasc.nerveDetail} onChange={v => setNeurovasc(p => ({...p, nerveDetail: v}))} placeholder="e.g. radial nerve, common peroneal"/></FL>}
        </Gate>
      </div>

      {/* MESS Score */}
      <div className={secCls}>
        <h2 className={h2Cls}>⚖️ MESS — Mangled Extremity Severity Score</h2>
        <Gate question="Is MESS assessment applicable (mangled/severely injured limb)?" value={messData.applicable} onChange={v => setMessData(p => ({...p, applicable: v}))}>
          {messScore && (
            <div className={`rounded-lg p-3 mb-3 border-2 ${messScore.salvageable ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-400 animate-pulse'}`}>
              <div className="flex items-baseline gap-3">
                <span className={`text-3xl font-bold ${messScore.salvageable ? 'text-green-700' : 'text-red-700'}`}>{messScore.total}</span>
                <span className={`text-sm font-semibold ${messScore.salvageable ? 'text-green-700' : 'text-red-700'}`}>{messScore.recommendation}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">MESS ≥7 = amputation typically recommended. Validated for lower extremity vascular injuries.</div>
            </div>
          )}
          <div className="text-xs text-gray-500 mb-2 bg-orange-50 rounded p-2">India context: High MESS due to RTA (40% of major trauma). Limb replant centres: AIIMS Delhi, PGIMER, CMC Vellore.</div>
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <Pills label="Skeletal/Soft Tissue Injury" options={[['low_energy','Low energy — stab, simple fx (1pt)'],['medium_energy','Medium energy — open/multi-level fx (2pt)'],['high_energy','High energy — close-range blast (3pt)'],['vascular_crush','Very high — vascular + crush (4pt)']]} value={messData.skeletal} onChange={v => setMessData(p => ({...p, skeletal: v}))} color="orange"/>
            <Pills label="Limb Ischaemia" options={[['reduced_pulse','Pulse reduced, normal perfusion (1pt)'],['pulseless_paresthesia','Pulseless, paraesthesia, ↓cap refill (2pt)'],['cool_paralysed','Cool, paralysed, insensate (3pt)']]} value={messData.ischemia} onChange={v => setMessData(p => ({...p, ischemia: v}))} color="red"/>
            <Pills label="Ischaemia >6 hours?" options={[['no','No'],['yes','Yes (×2 multiplier)']]} value={messData.ischemiaOver6h} onChange={v => setMessData(p => ({...p, ischemiaOver6h: v}))} color={messData.ischemiaOver6h === 'yes' ? 'red' : 'gray'}/>
            <Pills label="Haemodynamic Shock" options={[['stable','BP always >90 (0pt)'],['transient','Transient hypotension (1pt)'],['persistent','Persistent hypotension (2pt)']]} value={messData.shock} onChange={v => setMessData(p => ({...p, shock: v}))} color="red"/>
            <Pills label="Patient Age" options={[['lt30','<30 years (0pt)'],['30_50','30–50 years (1pt)'],['gt50','>50 years (2pt)']]} value={messData.age} onChange={v => setMessData(p => ({...p, age: v}))}/>
          </div>
        </Gate>
      </div>

      {/* ISS */}
      <div className={secCls}>
        <h2 className={h2Cls}>📊 Injury Severity Score (ISS)</h2>
        <Gate question="Is ISS assessment applicable (polytrauma / multi-system injury)?" value={issData.applicable} onChange={v => setIssData(p => ({...p, applicable: v}))}>
          {issScore && (
            <div className={`rounded-lg p-3 mb-3 border ${issScore.total >= 25 ? 'bg-red-50 border-red-400' : issScore.total >= 16 ? 'bg-orange-50 border-orange-300' : 'bg-amber-50 border-amber-300'}`}>
              <div className="flex items-baseline gap-3">
                <span className={`text-3xl font-bold ${issScore.color}`}>{issScore.total}</span>
                <span className={`text-base font-semibold ${issScore.color}`}>{issScore.severity} Trauma</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">ISS ≥16 = major trauma. ISS ≥25 = severe. Predicted mortality correlates with ISS.</div>
            </div>
          )}
          <div className="text-xs text-gray-500 mb-2">Rate each region using AIS: 0=None, 1=Minor, 2=Moderate, 3=Serious, 4=Severe, 5=Critical, 6=Unsurvivable</div>
          <div className="grid grid-cols-2 gap-2">
            {[['head','Head/Neck'],['face','Face'],['chest','Chest'],['abdomen','Abdomen/Pelvic organs'],['extremity','Extremity/Pelvis'],['external','External/Burns']].map(([k, lbl]) => (
              <div key={k} className="flex items-center justify-between border border-gray-200 rounded-lg px-2 py-1.5">
                <span className="text-xs text-gray-600">{lbl}</span>
                <div className="flex gap-0.5">
                  {[0,1,2,3,4,5,6].map(v => (
                    <button key={v} type="button"
                      onClick={() => setIssData(p => ({...p, [k]: String(v)}))}
                      className={`w-6 h-6 rounded text-xs font-medium transition-colors ${issData[k] === String(v) ? v >= 5 ? 'bg-red-600 text-white' : v >= 3 ? 'bg-orange-500 text-white' : 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-400 mt-2">ISS = sum of squares of 3 highest AIS scores from different regions</div>
        </Gate>
      </div>

      {/* Compartment Syndrome */}
      <div className={secCls}>
        <h2 className={h2Cls}>🚨 Compartment Syndrome Assessment</h2>
        <Gate question="Is compartment syndrome assessment applicable?" value={compartment.applicable} onChange={v => setCompartment(p => ({...p, applicable: v}))}>
          {compartmentAlert && (
            <div className="bg-red-100 border-2 border-red-500 rounded-lg p-3 mb-3 text-red-800 font-semibold text-sm animate-pulse">
              🚨 COMPARTMENT SYNDROME SUSPECTED — Emergent fasciotomy may be indicated. Do not delay.
            </div>
          )}
          <Pills label="Signs Present (6 P's)" multi
            options={[['pain','Pain — severe, out of proportion'],['pressure','Pressure — tense, swollen compartment'],['pain_passive_stretch','Pain on passive stretch ★'],['paresthesia','Paresthesia (tingling/numbness) ★'],['paralysis','Paralysis / muscle weakness ★'],['pallor','Pallor / skin discolouration'],['pulselessness','Pulselessness (late sign)']]}
            value={compartment.signs} onChange={v => setCompartment(p => ({...p, signs: v}))} color="red"/>
          <div className="text-xs text-orange-600 mb-2">★ = most reliable signs. Wait-for-pulselessness risks permanent damage.</div>
          <div className="grid grid-cols-2 gap-2">
            <FL label="Compartment Pressure (mmHg)" sub="normal <30 mmHg"><Inp type="number" value={compartment.compartmentPressure} onChange={v => setCompartment(p => ({...p, compartmentPressure: v}))} placeholder="mmHg"/></FL>
            <FL label="Delta Pressure (DP = diastolic − compartment)" sub="DP ≤30 → fasciotomy"><Inp type="number" value={compartment.deltaPressure} onChange={v => setCompartment(p => ({...p, deltaPressure: v}))} placeholder="mmHg"/></FL>
          </div>
          {parseFloat(compartment.compartmentPressure) >= 30 && <div className="text-xs text-red-600 font-semibold mb-2">⚠ Compartment pressure ≥30 mmHg — measure delta pressure. Consider fasciotomy.</div>}
          {parseFloat(compartment.deltaPressure) <= 30 && compartment.deltaPressure !== '' && <div className="text-xs text-red-700 font-bold mb-2 animate-pulse">🚨 ΔP ≤30 mmHg — fasciotomy indicated.</div>}
          <Pills label="Fasciotomy Decision" options={[['not_indicated','Not indicated'],['monitoring','Close monitoring'],['indicated','Indicated'],['performed','Performed']]} value={compartment.emergency} onChange={v => setCompartment(p => ({...p, emergency: v}))} color={compartment.emergency === 'indicated' || compartment.emergency === 'performed' ? 'red' : 'gray'}/>
        </Gate>
      </div>

      {/* Open Fracture Management */}
      <div className={secCls}>
        <h2 className={h2Cls}>🏥 Open Fracture Management</h2>
        <Gate question="Is open fracture management applicable?" value={openFxManage.applicable} onChange={v => setOpenFxManage(p => ({...p, applicable: v}))}>
          <div className="bg-orange-50 rounded-lg p-2 mb-2 text-xs text-orange-700">
            BOAST/BAPRAS guidelines: IV antibiotics within 1 h, tetanus prophylaxis, wound photograph, sterile dressing, no exploration in ED.
          </div>
          <Pills label="IV Antibiotics Given?" options={[['yes','Yes — co-amoxiclav/cefuroxime'],['metronidazole','+ Metronidazole (farm/bowel)'],['no','Not yet'],['allergy','Allergy — alternative used']]} value={openFxManage.abx} onChange={v => setOpenFxManage(p => ({...p, abx: v}))} color={openFxManage.abx === 'no' ? 'red' : 'green'}/>
          <Pills label="Tetanus Prophylaxis" options={[['up_to_date','Up to date'],['given_now','Given now'],['not_required','Not required'],['unknown','Unknown — given']]} value={openFxManage.tetanus} onChange={v => setOpenFxManage(p => ({...p, tetanus: v}))}/>
          <Pills label="Wound Debridement" options={[['planned','Planned — within 6h'],['done','Done in theatre'],['deferred','Deferred — stable patient']]} value={openFxManage.woundDebride} onChange={v => setOpenFxManage(p => ({...p, woundDebride: v}))}/>
          <Pills label="Skeletal Stabilisation" options={[['ex_fix','External fixator (temp)'],['intramedullary','IM nail'],['plate_screw','Plate & screws'],['k_wires','K-wires'],['splint','Splint (temp)']]} value={openFxManage.definitiveFixation} onChange={v => setOpenFxManage(p => ({...p, definitiveFixation: v}))}/>
          <FL label="Time to Surgery (hours from injury)"><Inp type="number" value={openFxManage.timeToSurgery} onChange={v => setOpenFxManage(p => ({...p, timeToSurgery: v}))} placeholder="hours"/></FL>
          {parseFloat(openFxManage.timeToSurgery) > 6 && fracData.gustilo?.startsWith('III') && (
            <div className="text-xs text-red-600 font-semibold mt-1">⚠ Gustilo III fracture with {'>'}6h delay to surgery — significantly increased infection risk.</div>
          )}
        </Gate>
      </div>

      {/* Diagnosis */}
      <div className={secCls}>
        <h2 className={h2Cls}>🩺 Diagnosis & Classification Summary</h2>
        <Gate question="Is diagnosis documentation applicable?" value={diagnosisData.applicable} onChange={v => setDiagnosisData(p => ({...p, applicable: v}))}>
          <FL label="Primary Diagnosis"><Inp value={diagnosisData.primaryDx} onChange={v => setDiagnosisData(p => ({...p, primaryDx: v}))} placeholder="e.g. Closed displaced # mid-shaft femur, Gustilo IIIB open tibia"/></FL>
          <FL label="Full AO/OTA Code"><Inp value={diagnosisData.classification} onChange={v => setDiagnosisData(p => ({...p, classification: v}))} placeholder="e.g. 32-A3 (femur diaphysis, simple transverse)"/></FL>
          <FL label="ICD-10 Code"><Inp value={diagnosisData.icd10} onChange={v => setDiagnosisData(p => ({...p, icd10: v}))} placeholder="e.g. S72.10, S82.20"/></FL>
          <FL label="Notes"><textarea value={diagnosisData.notes} onChange={e => setDiagnosisData(p => ({...p, notes: e.target.value}))} placeholder="polytrauma context, prior imaging, allergies..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-red-400"/></FL>
        </Gate>
      </div>

      {/* Management Plan */}
      <div className={secCls}>
        <h2 className={h2Cls}>💊 Management Plan</h2>
        <Gate question="Is management plan documentation applicable?" value={managementData.applicable} onChange={v => setManagementData(p => ({...p, applicable: v}))}>
          <Pills label="Emergency Measures" multi options={[['atls','ATLS — airway/breathing/circulation'],['haemostasis','Haemostasis — tourniquet/pressure'],['realign','Fracture realignment + splint'],['traction','Skin/skeletal traction'],['blood_products','Blood products/FFP'],['vascular_surgery','Vascular surgery consult'],['ortho_consult','Orthopaedic consult']]} value={managementData.emergencyMx} onChange={v => setManagementData(p => ({...p, emergencyMx: v}))} color="red"/>
          <Pills label="Definitive Fixation Type" options={[['conservative','Conservative/cast'],['ex_fix','External fixation'],['intramedullary_nail','Intramedullary nail'],['dynamic_hip_screw','DHS/DCS'],['plate_screw','Plate & screws'],['cannulated_screws','Cannulated screws'],['arthroplasty','Arthroplasty'],['amputation','Amputation']]} value={managementData.fixationType} onChange={v => setManagementData(p => ({...p, fixationType: v}))} color="orange"/>
          <FL label="Implant Details"><Inp value={managementData.implant} onChange={v => setManagementData(p => ({...p, implant: v}))} placeholder="nail size, plate type, screw dimensions"/></FL>
          <Pills label="Weight Bearing Status" options={[['nwb','NWB'],['toe_touch','Toe-touch WB'],['pwb','Partial WB'],['fwb_crutches','FWB with crutches'],['fwb','Full WB']]} value={managementData.weightBearing} onChange={v => setManagementData(p => ({...p, weightBearing: v}))}/>
          <FL label="Follow-up Plan"><Inp value={managementData.followUp} onChange={v => setManagementData(p => ({...p, followUp: v}))} placeholder="e.g. 2 weeks wound review, 6 weeks X-ray"/></FL>
          <FL label="Additional Notes"><textarea value={managementData.notes} onChange={e => setManagementData(p => ({...p, notes: e.target.value}))} placeholder="rehabilitation, financial constraints, PM-JAY, referral to trauma centre..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-red-400"/></FL>
        </Gate>
      </div>

      {/* Save */}
      <div className="flex justify-end gap-3 mt-2">
        <button type="button" onClick={handleSave} disabled={saving}
          className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-semibold text-sm shadow hover:from-red-600 hover:to-orange-600 disabled:opacity-60 transition-all">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Assessment'}
        </button>
      </div>
    </div>
  );
}
