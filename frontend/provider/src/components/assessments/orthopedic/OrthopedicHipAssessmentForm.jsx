/** @shared-pool */
import React, { useState, useMemo } from 'react';
import api from '../../../api/client';

// ─── Hip Anatomy SVG (AP Pelvis – Anterior View) ────────────────────────────
function HipAnatomySVG({ highlights = [] }) {
  const hi = (s) => highlights.includes(s);
  return (
    <svg viewBox="0 0 300 285" className="w-full max-w-xs mx-auto" role="img" aria-label="Hip anatomy AP view">
      <text x="150" y="13" textAnchor="middle" fontSize="9" fill="#6b7280" fontWeight="bold">AP Pelvis – Anterior View</text>
      {/* Iliac wings */}
      <path d="M8,72 Q28,12 78,22 Q114,28 140,62 L142,92 Q108,80 74,87 Q38,93 8,78 Z" fill="#f5edd8" stroke="#a0845c" strokeWidth="1.5"/>
      <path d="M292,72 Q272,12 222,22 Q186,28 160,62 L158,92 Q192,80 226,87 Q262,93 292,78 Z" fill="#f5edd8" stroke="#a0845c" strokeWidth="1.5"/>
      {/* Sacrum */}
      <path d="M140,62 L160,62 L167,118 L150,132 L133,118 Z" fill="#ede0c8" stroke="#a0845c" strokeWidth="1.5"/>
      {/* Pubic symphysis */}
      <ellipse cx="150" cy="150" rx="22" ry="12" fill="#ede0c8" stroke="#a0845c" strokeWidth="1.5"/>
      <line x1="128" y1="150" x2="103" y2="162" stroke="#a0845c" strokeWidth="2"/>
      <line x1="172" y1="150" x2="197" y2="162" stroke="#a0845c" strokeWidth="2"/>

      {/* ── LEFT HIP (right side of image) ── */}
      <circle cx="84" cy="120" r="29" fill="#e8d4b8" stroke="#a0845c" strokeWidth="2"/>
      <circle cx="84" cy="120" r="10" fill="#d4b896" stroke="#a0845c" strokeWidth="1"/>
      <circle cx="84" cy="120" r="33" fill="none"
        stroke={hi('labrum_left') ? '#8b5cf6' : '#b08aca'}
        strokeWidth={hi('labrum_left') ? 3 : 1.5} strokeDasharray="5 2.5"/>
      <circle cx="84" cy="120" r="21"
        fill={hi('femoral_head_left') ? '#fef08a' : '#fef3c7'}
        stroke={hi('avn_left') ? '#ef4444' : hi('femoral_head_left') ? '#f59e0b' : '#a0845c'}
        strokeWidth={hi('femoral_head_left') || hi('avn_left') ? 3 : 1.5}/>
      {hi('avn_left') && <circle cx="84" cy="115" r="7" fill="#fca5a5" stroke="#ef4444" strokeWidth="1.5"/>}
      {hi('cam_left') && <ellipse cx="84" cy="138" rx="9" ry="5" fill="#fb923c" stroke="#ea580c" strokeWidth="1.5"/>}
      <path d="M73,139 Q67,158 62,168" stroke="#a0845c" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <ellipse cx="53" cy="175" rx="10" ry="17"
        fill="#ede0c8" stroke={hi('gt_left') ? '#f59e0b' : '#a0845c'} strokeWidth={hi('gt_left') ? 2.5 : 1.5}/>
      <path d="M62,192 Q60,222 58,262" stroke="#a0845c" strokeWidth="5" fill="none" strokeLinecap="round"/>
      <text x="84" y="262" textAnchor="middle" fontSize="8" fill="#374151">L Hip</text>

      {/* ── RIGHT HIP (left side of image) ── */}
      <circle cx="216" cy="120" r="29" fill="#e8d4b8" stroke="#a0845c" strokeWidth="2"/>
      <circle cx="216" cy="120" r="10" fill="#d4b896" stroke="#a0845c" strokeWidth="1"/>
      <circle cx="216" cy="120" r="33" fill="none"
        stroke={hi('labrum_right') ? '#8b5cf6' : '#b08aca'}
        strokeWidth={hi('labrum_right') ? 3 : 1.5} strokeDasharray="5 2.5"/>
      <circle cx="216" cy="120" r="21"
        fill={hi('femoral_head_right') ? '#fef08a' : '#fef3c7'}
        stroke={hi('avn_right') ? '#ef4444' : hi('femoral_head_right') ? '#f59e0b' : '#a0845c'}
        strokeWidth={hi('femoral_head_right') || hi('avn_right') ? 3 : 1.5}/>
      {hi('avn_right') && <circle cx="216" cy="115" r="7" fill="#fca5a5" stroke="#ef4444" strokeWidth="1.5"/>}
      {hi('cam_right') && <ellipse cx="216" cy="138" rx="9" ry="5" fill="#fb923c" stroke="#ea580c" strokeWidth="1.5"/>}
      <path d="M227,139 Q233,158 238,168" stroke="#a0845c" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <ellipse cx="247" cy="175" rx="10" ry="17"
        fill="#ede0c8" stroke={hi('gt_right') ? '#f59e0b' : '#a0845c'} strokeWidth={hi('gt_right') ? 2.5 : 1.5}/>
      <path d="M238,192 Q240,222 242,262" stroke="#a0845c" strokeWidth="5" fill="none" strokeLinecap="round"/>
      <text x="216" y="262" textAnchor="middle" fontSize="8" fill="#374151">R Hip</text>

      {/* Legend */}
      <circle cx="12" cy="276" r="4" fill="none" stroke="#b08aca" strokeWidth="1.5" strokeDasharray="3 1.5"/>
      <text x="20" y="279" fontSize="7" fill="#6b7280">Labrum</text>
      <circle cx="75" cy="276" r="4" fill="#fca5a5" stroke="#ef4444" strokeWidth="1"/>
      <text x="83" y="279" fontSize="7" fill="#6b7280">AVN</text>
      <ellipse cx="135" cy="276" rx="5" ry="3" fill="#fb923c" stroke="#ea580c" strokeWidth="1"/>
      <text x="144" y="279" fontSize="7" fill="#6b7280">Cam bump</text>
      <ellipse cx="210" cy="276" rx="5" ry="9" fill="#ede0c8" stroke="#a0845c" strokeWidth="1"/>
      <text x="219" y="279" fontSize="7" fill="#6b7280">Gt. trochanter</text>
    </svg>
  );
}

// ─── Shared UI primitives ───────────────────────────────────────────────────
const COLOR_MAP = {
  amber: 'bg-amber-100 text-amber-800 border-amber-300 data-[sel=true]:bg-amber-500 data-[sel=true]:text-white data-[sel=true]:border-amber-500',
  orange: 'bg-orange-100 text-orange-800 border-orange-300 data-[sel=true]:bg-orange-500 data-[sel=true]:text-white data-[sel=true]:border-orange-500',
  red: 'bg-red-100 text-red-800 border-red-300 data-[sel=true]:bg-red-500 data-[sel=true]:text-white data-[sel=true]:border-red-500',
  blue: 'bg-blue-100 text-blue-800 border-blue-300 data-[sel=true]:bg-blue-500 data-[sel=true]:text-white data-[sel=true]:border-blue-500',
  green: 'bg-green-100 text-green-800 border-green-300 data-[sel=true]:bg-green-500 data-[sel=true]:text-white data-[sel=true]:border-green-500',
  gray: 'bg-gray-100 text-gray-700 border-gray-300 data-[sel=true]:bg-gray-500 data-[sel=true]:text-white data-[sel=true]:border-gray-500',
};

function Pills({ label, options, value, onChange, multi = false, color = 'amber' }) {
  const cls = COLOR_MAP[color] || COLOR_MAP.amber;
  const isSelected = (v) => multi ? (Array.isArray(value) ? value.includes(v) : false) : value === v;
  const handleClick = (v) => {
    if (multi) {
      const arr = Array.isArray(value) ? value : [];
      onChange(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
    } else {
      onChange(value === v ? '' : v);
    }
  };
  return (
    <div className="mb-3">
      {label && <div className="text-xs font-medium text-gray-600 mb-1">{label}</div>}
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => {
          const [v, lbl] = Array.isArray(opt) ? opt : [opt, opt];
          return (
            <button key={v} type="button"
              data-sel={isSelected(v)}
              onClick={() => handleClick(v)}
              className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${cls}`}>
              {lbl}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FL({ label, sub, children }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{sub && <span className="text-gray-400 font-normal ml-1">{sub}</span>}
      </label>
      {children}
    </div>
  );
}

function Gate({ question, value, onChange, children }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm font-medium text-gray-700">{question}</span>
        {['yes', 'no'].map(v => (
          <button key={v} type="button"
            onClick={() => onChange(value === v ? null : v)}
            className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${
              value === v
                ? v === 'yes' ? 'bg-amber-500 text-white border-amber-500' : 'bg-gray-400 text-white border-gray-400'
                : 'bg-white text-gray-600 border-gray-300 hover:border-amber-400'
            }`}>
            {v === 'yes' ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
      {value === 'yes' && <div className="border-l-2 border-amber-300 pl-3">{children}</div>}
      {value === 'no' && (
        <div className="flex items-center gap-2 text-xs text-gray-400 italic py-1">
          <span>🔒</span><span>Not applicable — section locked</span>
        </div>
      )}
    </div>
  );
}

function Inp({ value, onChange, type = 'text', placeholder = '', className = '' }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${className}`}/>
  );
}

function ScoreRow({ label, options, value, onChange }) {
  return (
    <div className="flex flex-wrap items-start gap-2 mb-2 py-1 border-b border-gray-100">
      <div className="w-40 text-xs text-gray-600 shrink-0 pt-1">{label}</div>
      <div className="flex flex-wrap gap-1">
        {options.map(([v, lbl, pts]) => (
          <button key={v} type="button"
            onClick={() => onChange(value === v ? '' : v)}
            className={`px-2 py-0.5 rounded border text-xs transition-colors ${
              value === v ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-300 hover:border-amber-400'
            }`}>
            {lbl}<span className="ml-1 opacity-60">({pts})</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function OrthopedicHipAssessmentForm({ patientId, encounterId }) {
  const [basicInfo, setBasicInfo] = useState({ side: '', mechanism: '', duration: '', chiefComplaint: '', onset: '', aggravating: [], relieving: [] });
  const [physExam, setPhysExam] = useState({ applicable: null, gait: '', trendelenburg: '', antalgicGait: '', lld: '', lldMeasurement: '', flexion: '', extension: '', abduction: '', adduction: '', internalRotation: '', externalRotation: '', groinTenderness: '', trochanterTenderness: '', ischialTenderness: '' });
  const [specialTests, setSpecialTests] = useState({ applicable: null, fadir: '', faberPatrick: '', anteriorImpingement: '', posteriorImpingement: '', logRoll: '', scourTest: '', thomasTest: '', elyTest: '', obers: '', stinchfield: '' });
  const [harrisData, setHarrisData] = useState({ applicable: null, pain: '', limp: '', support: '', distance: '', stairs: '', shoes: '', sitting: '', transport: '', defAdduction: '', defIR: '', defLLD: '', defFlexion: '', romFlex: '', romAbd: '', romER: '' });
  const [oxfordData, setOxfordData] = useState({ applicable: null, q1: '', q2: '', q3: '', q4: '', q5: '', q6: '', q7: '', q8: '', q9: '', q10: '', q11: '', q12: '' });
  const [womacData, setWomacData] = useState({ applicable: null, p1: '', p2: '', p3: '', p4: '', p5: '', s1: '', s2: '', f1: '', f2: '', f3: '', f4: '', f5: '', f6: '', f7: '', f8: '', f9: '', f10: '', f11: '', f12: '', f13: '', f14: '', f15: '', f16: '', f17: '' });
  const [imagingData, setImagingData] = useState({ applicable: null, xrayDone: '', klGrade: '', coxaValga: '', coxaVara: '', lcea: '', alphaAngle: '', crossoverSign: '', faiType: '', mriDone: '', labrumTear: '', labrumTearLocation: '', cartilage: '', boneMarrow: '', effusion: '', ctDone: '', ctFindings: '' });
  const [avnData, setAvnData] = useState({ applicable: null, riskFactors: [], ficatStage: '', arcoStage: '', lesionSize: '', subchondralCollapse: '', crescent: '', contralateral: '', notes: '' });
  const [diagnosisData, setDiagnosisData] = useState({ applicable: null, primaryDx: '', secondaryDx: '', severity: '', icd10: '', notes: '' });
  const [managementData, setManagementData] = useState({ applicable: null, conservative: [], analgesics: '', physio: '', injections: '', surgical: '', thrIndication: '', pmJay: '', followUp: '', notes: '' });

  const [svgHighlights, setSvgHighlights] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Harris Hip Score auto-calculation ──────────────────────────────────────
  const harrisScore = useMemo(() => {
    if (harrisData.applicable !== 'yes') return null;
    const painPts = { none: 44, slight: 40, mild: 30, moderate: 20, marked: 10, disabled: 0 }[harrisData.pain] ?? null;
    if (painPts === null) return null;
    const limpPts = { none: 11, slight: 8, moderate: 5, severe: 0 }[harrisData.limp] ?? 0;
    const supportPts = { none: 11, cane_long: 7, cane_most: 5, one_crutch: 3, two_crutches: 2, unable: 0 }[harrisData.support] ?? 0;
    const distancePts = { unlimited: 11, six_blocks: 8, two_three: 5, indoors: 2, bed_chair: 0 }[harrisData.distance] ?? 0;
    const stairsPts = { normal: 4, normal_rail: 2, any_way: 1, unable: 0 }[harrisData.stairs] ?? 0;
    const shoesPts = { ease: 4, difficulty: 2, unable: 0 }[harrisData.shoes] ?? 0;
    const sittingPts = { any_chair_1h: 5, high_chair_30min: 3, unable: 0 }[harrisData.sitting] ?? 0;
    const transportPts = harrisData.transport === 'yes' ? 1 : 0;
    const deformityPts = (harrisData.defAdduction === 'yes' && harrisData.defIR === 'yes' && harrisData.defLLD === 'yes' && harrisData.defFlexion === 'yes') ? 4 : 0;
    const romIndex = (parseFloat(harrisData.romFlex) || 0) + (parseFloat(harrisData.romAbd) || 0) * 0.6 + (parseFloat(harrisData.romER) || 0) * 0.4;
    const romPts = romIndex >= 210 ? 5 : romIndex >= 160 ? 4 : romIndex >= 110 ? 3 : romIndex >= 60 ? 2 : romIndex >= 30 ? 1 : 0;
    const total = painPts + limpPts + supportPts + distancePts + stairsPts + shoesPts + sittingPts + transportPts + deformityPts + romPts;
    const interp = total >= 90 ? 'Excellent' : total >= 80 ? 'Good' : total >= 70 ? 'Fair' : 'Poor';
    const interpColor = total >= 90 ? 'text-green-600' : total >= 80 ? 'text-blue-600' : total >= 70 ? 'text-amber-600' : 'text-red-600';
    return { total, interp, interpColor, breakdown: { pain: painPts, gait: limpPts + supportPts + distancePts, activities: stairsPts + shoesPts + sittingPts + transportPts, deformity: deformityPts, rom: romPts } };
  }, [harrisData]);

  // ── Oxford Hip Score ────────────────────────────────────────────────────────
  const oxfordScore = useMemo(() => {
    if (oxfordData.applicable !== 'yes') return null;
    const items = [oxfordData.q1, oxfordData.q2, oxfordData.q3, oxfordData.q4, oxfordData.q5, oxfordData.q6, oxfordData.q7, oxfordData.q8, oxfordData.q9, oxfordData.q10, oxfordData.q11, oxfordData.q12];
    const filled = items.filter(v => v !== '');
    if (filled.length === 0) return null;
    const total = filled.reduce((s, v) => s + parseInt(v), 0);
    const interp = total >= 40 ? 'Satisfactory' : total >= 30 ? 'Mild dysfunction' : total >= 20 ? 'Moderate dysfunction' : 'Severe dysfunction';
    const interpColor = total >= 40 ? 'text-green-600' : total >= 30 ? 'text-blue-600' : total >= 20 ? 'text-amber-600' : 'text-red-600';
    return { total, interp, interpColor };
  }, [oxfordData]);

  // ── WOMAC ───────────────────────────────────────────────────────────────────
  const womacScore = useMemo(() => {
    if (womacData.applicable !== 'yes') return null;
    const calc = (keys) => keys.reduce((s, k) => s + (parseInt(womacData[k]) || 0), 0);
    const painSum = calc(['p1', 'p2', 'p3', 'p4', 'p5']);
    const stiffSum = calc(['s1', 's2']);
    const funcSum = calc(['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12', 'f13', 'f14', 'f15', 'f16', 'f17']);
    const total = painSum + stiffSum + funcSum;
    return { painSum, stiffSum, funcSum, total, painPct: Math.round(painSum / 20 * 100), stiffPct: Math.round(stiffSum / 8 * 100), funcPct: Math.round(funcSum / 68 * 100), totalPct: Math.round(total / 96 * 100) };
  }, [womacData]);

  // ── Clinical pattern inference ──────────────────────────────────────────────
  const clinicalPattern = useMemo(() => {
    const p = [];
    if (specialTests.fadir === 'positive') p.push({ label: 'FAI / Labral pathology', color: 'bg-orange-100 text-orange-700' });
    if (specialTests.faberPatrick === 'positive') p.push({ label: 'Posterior hip / SIJ involvement', color: 'bg-blue-100 text-blue-700' });
    if (specialTests.trendelenburg === 'positive' || physExam.trendelenburg === 'positive') p.push({ label: 'Abductor weakness (Trendelenburg +)', color: 'bg-yellow-100 text-yellow-700' });
    if (specialTests.thomasTest === 'positive') p.push({ label: 'Hip flexor contracture', color: 'bg-purple-100 text-purple-700' });
    if (specialTests.logRoll === 'positive') p.push({ label: 'Intra-articular pathology / hip irritability', color: 'bg-red-100 text-red-700' });
    if (avnData.applicable === 'yes' && avnData.riskFactors?.length > 0) p.push({ label: `AVN risk: ${avnData.riskFactors.join(', ')}`, color: 'bg-red-100 text-red-700' });
    if (imagingData.faiType) p.push({ label: `FAI type: ${imagingData.faiType}`, color: 'bg-orange-100 text-orange-700' });
    return p;
  }, [specialTests, physExam, avnData, imagingData]);

  // ── SVG highlights from findings ────────────────────────────────────────────
  const computedHighlights = useMemo(() => {
    const h = [];
    const side = basicInfo.side;
    if (avnData.applicable === 'yes' && avnData.ficatStage) { if (side === 'left' || side === 'bilateral') h.push('avn_left'); if (side === 'right' || side === 'bilateral') h.push('avn_right'); }
    if (imagingData.labrumTear === 'yes') { if (side === 'left' || side === 'bilateral') h.push('labrum_left'); if (side === 'right' || side === 'bilateral') h.push('labrum_right'); }
    if (imagingData.faiType === 'cam' || imagingData.faiType === 'mixed') { if (side === 'left' || side === 'bilateral') h.push('cam_left'); if (side === 'right' || side === 'bilateral') h.push('cam_right'); }
    if (physExam.trochanterTenderness === 'yes') { if (side === 'left' || side === 'bilateral') h.push('gt_left'); if (side === 'right' || side === 'bilateral') h.push('gt_right'); }
    return h;
  }, [basicInfo.side, avnData, imagingData, physExam]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/assessments', { type: 'orthopedic_hip', patientId, encounterId, data: { basicInfo, physExam, specialTests, harrisData, harrisScore, oxfordData, oxfordScore, womacData, womacScore, imagingData, avnData, diagnosisData, managementData, clinicalPattern } });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const secCls = 'bg-white rounded-xl border border-amber-100 shadow-sm p-4 mb-4';
  const h2Cls = 'text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2';

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-500 rounded-xl p-4 mb-4 text-white shadow">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h1 className="text-lg font-bold">Orthopedic Hip Assessment</h1>
            <p className="text-amber-100 text-xs mt-0.5">Harris Hip Score · Oxford Hip · WOMAC · FAI · AVN Staging</p>
          </div>
          <div className="w-44 bg-white/10 rounded-lg p-2">
            <HipAnatomySVG highlights={computedHighlights}/>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className={secCls}>
        <h2 className={h2Cls}>📋 Basic Information</h2>
        <div className="grid grid-cols-2 gap-3">
          <Pills label="Side Affected" options={[['left','Left'],['right','Right'],['bilateral','Bilateral']]} value={basicInfo.side} onChange={v => setBasicInfo(p => ({...p, side: v}))}/>
          <Pills label="Onset" options={[['acute','Acute (<2w)'],['subacute','Sub-acute'],['chronic','Chronic (>3m)']]} value={basicInfo.onset} onChange={v => setBasicInfo(p => ({...p, onset: v}))}/>
        </div>
        <FL label="Chief Complaint"><Inp value={basicInfo.chiefComplaint} onChange={v => setBasicInfo(p => ({...p, chiefComplaint: v}))} placeholder="e.g. groin pain, limp, restricted ROM"/></FL>
        <FL label="Duration"><Inp value={basicInfo.duration} onChange={v => setBasicInfo(p => ({...p, duration: v}))} placeholder="e.g. 6 months"/></FL>
        <Pills label="Mechanism / Aetiology" multi options={[['oa','OA'],['trauma','Trauma'],['avascular_necrosis','AVN'],['fai','FAI'],['labral_tear','Labral tear'],['thr_followup','Post-THR'],['infection','Infection'],['inflammatory','Inflammatory'],['dysplasia','Dysplasia']]} value={basicInfo.aggravating} onChange={v => setBasicInfo(p => ({...p, aggravating: v}))} color="orange"/>
      </div>

      {/* Physical Examination */}
      <div className={secCls}>
        <h2 className={h2Cls}>🔬 Physical Examination</h2>
        <Gate question="Is physical examination applicable for this patient?" value={physExam.applicable} onChange={v => setPhysExam(p => ({...p, applicable: v}))}>
          <Pills label="Gait Pattern" options={[['normal','Normal'],['antalgic','Antalgic'],['trendelenburg','Trendelenburg'],['short_leg','Short-leg'],['stiff_hip','Stiff-hip']]} value={physExam.gait} onChange={v => setPhysExam(p => ({...p, gait: v}))}/>
          <Pills label="Trendelenburg Sign" options={[['negative','Negative'],['positive','Positive'],['positive_bilateral','Bilateral +']]} value={physExam.trendelenburg} onChange={v => setPhysExam(p => ({...p, trendelenburg: v}))} color="red"/>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Pills label="Leg Length Discrepancy" options={[['none','None'],['apparent','Apparent'],['true','True']]} value={physExam.lld} onChange={v => setPhysExam(p => ({...p, lld: v}))}/>
            {physExam.lld && physExam.lld !== 'none' && <FL label="LLD Measurement (cm)"><Inp type="number" value={physExam.lldMeasurement} onChange={v => setPhysExam(p => ({...p, lldMeasurement: v}))} placeholder="cm"/></FL>}
          </div>
          <div className="bg-amber-50 rounded-lg p-3 mt-2">
            <div className="text-xs font-semibold text-amber-700 mb-2">Range of Motion (degrees)</div>
            <div className="grid grid-cols-3 gap-2">
              {[['flexion','Flexion (0–130°)'],['extension','Extension (0–30°)'],['abduction','Abduction (0–45°)'],['adduction','Adduction (0–30°)'],['internalRotation','Int. Rotation (0–45°)'],['externalRotation','Ext. Rotation (0–45°)']].map(([k, lbl]) => (
                <FL key={k} label={lbl}><Inp type="number" value={physExam[k]} onChange={v => setPhysExam(p => ({...p, [k]: v}))} placeholder="°"/></FL>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[['groinTenderness','Groin tenderness'],['trochanterTenderness','GT tenderness'],['ischialTenderness','Ischial tenderness']].map(([k, lbl]) => (
              <Pills key={k} label={lbl} options={[['no','No'],['yes','Yes']]} value={physExam[k]} onChange={v => setPhysExam(p => ({...p, [k]: v}))} color={physExam[k] === 'yes' ? 'red' : 'gray'}/>
            ))}
          </div>
        </Gate>
      </div>

      {/* Special Tests */}
      <div className={secCls}>
        <h2 className={h2Cls}>🧪 Special Tests</h2>
        <Gate question="Are special tests applicable for this patient?" value={specialTests.applicable} onChange={v => setSpecialTests(p => ({...p, applicable: v}))}>
          <div className="space-y-1">
            {[
              ['fadir', 'FADIR (Flex-Add-IR) — FAI / labral'],
              ['faberPatrick', 'FABER / Patrick test — posterior hip, SIJ'],
              ['anteriorImpingement', 'Anterior impingement test (flex 90° + IR)'],
              ['posteriorImpingement', 'Posterior impingement (ext + ER)'],
              ['logRoll', 'Log roll test — intra-articular irritability'],
              ['scourTest', 'Scour (quadrant) test — cartilage/labrum'],
              ['thomasTest', 'Thomas test — hip flexor contracture'],
              ['elyTest', "Ely's test — rectus femoris contracture"],
              ['obers', "Ober's test — IT band tightness"],
              ['stinchfield', 'Stinchfield test (resist. SLR) — intra-articular'],
            ].map(([k, lbl]) => (
              <div key={k} className="flex items-center justify-between py-1.5 border-b border-gray-100">
                <span className="text-xs text-gray-600 flex-1">{lbl}</span>
                <div className="flex gap-1">
                  {['negative','positive','not_done'].map(v => (
                    <button key={v} type="button"
                      onClick={() => setSpecialTests(p => ({...p, [k]: v}))}
                      className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                        specialTests[k] === v
                          ? v === 'positive' ? 'bg-red-500 text-white border-red-500' : v === 'negative' ? 'bg-green-500 text-white border-green-500' : 'bg-gray-400 text-white border-gray-400'
                          : 'bg-white text-gray-500 border-gray-300'
                      }`}>
                      {v === 'not_done' ? 'N/D' : v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {clinicalPattern.length > 0 && (
            <div className="mt-3 bg-amber-50 rounded-lg p-2">
              <div className="text-xs font-semibold text-amber-700 mb-1">Clinical Pattern Inference</div>
              <div className="flex flex-wrap gap-1.5">
                {clinicalPattern.map((cp, i) => <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${cp.color}`}>{cp.label}</span>)}
              </div>
            </div>
          )}
        </Gate>
      </div>

      {/* Harris Hip Score */}
      <div className={secCls}>
        <h2 className={h2Cls}>📊 Harris Hip Score (HHS)</h2>
        <Gate question="Is Harris Hip Score assessment applicable?" value={harrisData.applicable} onChange={v => setHarrisData(p => ({...p, applicable: v}))}>
          {harrisScore && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-3 mb-3 border border-amber-200">
              <div className="flex items-baseline gap-3">
                <span className={`text-3xl font-bold ${harrisScore.interpColor}`}>{harrisScore.total}<span className="text-base font-normal text-gray-400">/100</span></span>
                <span className={`text-lg font-semibold ${harrisScore.interpColor}`}>{harrisScore.interp}</span>
              </div>
              <div className="flex gap-3 mt-1 text-xs text-gray-500">
                <span>Pain: {harrisScore.breakdown.pain}/44</span>
                <span>Gait: {harrisScore.breakdown.gait}/33</span>
                <span>Activity: {harrisScore.breakdown.activities}/14</span>
                <span>Deformity: {harrisScore.breakdown.deformity}/4</span>
                <span>ROM: {harrisScore.breakdown.rom}/5</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                <div className={`h-1.5 rounded-full ${harrisScore.total >= 90 ? 'bg-green-500' : harrisScore.total >= 80 ? 'bg-blue-500' : harrisScore.total >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${harrisScore.total}%` }}/>
              </div>
            </div>
          )}

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pain (max 44 pts)</div>
          <ScoreRow label="Pain level" value={harrisData.pain} onChange={v => setHarrisData(p => ({...p, pain: v}))}
            options={[['none','None',44],['slight','Slight',40],['mild','Mild',30],['moderate','Moderate',20],['marked','Marked',10],['disabled','Disabled',0]]}/>

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-2">Gait (max 33 pts)</div>
          <ScoreRow label="Limp" value={harrisData.limp} onChange={v => setHarrisData(p => ({...p, limp: v}))}
            options={[['none','None',11],['slight','Slight',8],['moderate','Moderate',5],['severe','Severe',0]]}/>
          <ScoreRow label="Support used" value={harrisData.support} onChange={v => setHarrisData(p => ({...p, support: v}))}
            options={[['none','None',11],['cane_long','Cane long walks',7],['cane_most','Cane most time',5],['one_crutch','One crutch',3],['two_crutches','Two crutches',2],['unable','Unable',0]]}/>
          <ScoreRow label="Distance walked" value={harrisData.distance} onChange={v => setHarrisData(p => ({...p, distance: v}))}
            options={[['unlimited','Unlimited',11],['six_blocks','6 blocks',8],['two_three','2–3 blocks',5],['indoors','Indoors only',2],['bed_chair','Bed/chair',0]]}/>

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-2">Activities (max 14 pts)</div>
          <ScoreRow label="Stairs" value={harrisData.stairs} onChange={v => setHarrisData(p => ({...p, stairs: v}))}
            options={[['normal','Normal no support',4],['normal_rail','Normal + railing',2],['any_way','Any way',1],['unable','Unable',0]]}/>
          <ScoreRow label="Shoes & socks" value={harrisData.shoes} onChange={v => setHarrisData(p => ({...p, shoes: v}))}
            options={[['ease','With ease',4],['difficulty','With difficulty',2],['unable','Unable',0]]}/>
          <ScoreRow label="Sitting" value={harrisData.sitting} onChange={v => setHarrisData(p => ({...p, sitting: v}))}
            options={[['any_chair_1h','Any chair 1 hr',5],['high_chair_30min','High chair 30 min',3],['unable','Unable',0]]}/>
          <ScoreRow label="Public transport" value={harrisData.transport} onChange={v => setHarrisData(p => ({...p, transport: v}))}
            options={[['yes','Yes',1],['no','No',0]]}/>

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-2">Deformity (max 4 pts — all 4 needed)</div>
          <div className="grid grid-cols-2 gap-2">
            {[['defAdduction','Fixed adduction <10°'],['defIR','Fixed IR <10°'],['defLLD','LLD <3.2 cm'],['defFlexion','Fixed flexion <30°']].map(([k, lbl]) => (
              <Pills key={k} label={lbl} options={[['yes','Met'],['no','Not met']]} value={harrisData[k]} onChange={v => setHarrisData(p => ({...p, [k]: v}))} color={harrisData[k] === 'yes' ? 'green' : 'gray'}/>
            ))}
          </div>

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-2">ROM for Score (degrees)</div>
          <div className="grid grid-cols-3 gap-2">
            <FL label="Flexion (°)"><Inp type="number" value={harrisData.romFlex} onChange={v => setHarrisData(p => ({...p, romFlex: v}))} placeholder="0–130"/></FL>
            <FL label="Abduction (°)"><Inp type="number" value={harrisData.romAbd} onChange={v => setHarrisData(p => ({...p, romAbd: v}))} placeholder="0–45"/></FL>
            <FL label="External Rotation (°)"><Inp type="number" value={harrisData.romER} onChange={v => setHarrisData(p => ({...p, romER: v}))} placeholder="0–45"/></FL>
          </div>
          <div className="text-xs text-gray-400 mt-1">ROM index = Flex×1.0 + Abd×0.6 + ER×0.4 → score 0–5 pts</div>
        </Gate>
      </div>

      {/* Oxford Hip Score */}
      <div className={secCls}>
        <h2 className={h2Cls}>📋 Oxford Hip Score (OHS)</h2>
        <Gate question="Is Oxford Hip Score applicable?" value={oxfordData.applicable} onChange={v => setOxfordData(p => ({...p, applicable: v}))}>
          {oxfordScore && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-3 mb-3 border border-amber-200 flex items-baseline gap-3">
              <span className={`text-3xl font-bold ${oxfordScore.interpColor}`}>{oxfordScore.total}<span className="text-base font-normal text-gray-400">/48</span></span>
              <span className={`text-base font-semibold ${oxfordScore.interpColor}`}>{oxfordScore.interp}</span>
              <span className="text-xs text-gray-400 ml-auto">↑ higher = better</span>
            </div>
          )}
          <div className="text-xs text-gray-500 mb-2">Rate each: 0=worst, 4=best (revised OHS)</div>
          {[
            [['q1','Pain at rest (None=4, Mild=3, Moderate=2, Severe=1, Extreme=0)']],
            [['q2','Trouble washing/drying (None=4 → Impossible=0)']],
            [['q3','Trouble with car/transport (None=4 → Impossible=0)']],
            [['q4','Walking duration before severe pain (>30min=4 → Not at all=0)']],
            [['q5','Pain rising from chair (None=4 → Unbearable=0)']],
            [['q6','Limping while walking (Never=4 → Always=0)']],
            [['q7','Ability to kneel and rise (Easily=4 → Impossible=0)']],
            [['q8','Night pain (No nights=4 → Every night=0)']],
            [['q9','Hip pain interference with work (None=4 → Total=0)']],
            [['q10','Sudden severe pain episodes (No days=4 → Every day=0)']],
            [['q11','Interference with walking ability (None=4 → Cannot walk=0)']],
            [['q12','Ability to go shopping alone (Easily=4 → Impossible=0)']],
          ].map(([[k, lbl]]) => (
            <div key={k} className="mb-2 pb-2 border-b border-gray-100">
              <div className="text-xs text-gray-600 mb-1">{lbl}</div>
              <div className="flex gap-1.5">
                {[4,3,2,1,0].map(v => (
                  <button key={v} type="button"
                    onClick={() => setOxfordData(p => ({...p, [k]: String(v)}))}
                    className={`w-8 h-7 rounded border text-xs font-medium transition-colors ${oxfordData[k] === String(v) ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-300'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Gate>
      </div>

      {/* WOMAC */}
      <div className={secCls}>
        <h2 className={h2Cls}>📊 WOMAC (Western Ontario & McMaster OA Index)</h2>
        <Gate question="Is WOMAC assessment applicable?" value={womacData.applicable} onChange={v => setWomacData(p => ({...p, applicable: v}))}>
          {womacScore && (
            <div className="bg-amber-50 rounded-lg p-3 mb-3 border border-amber-200">
              <div className="text-xs font-semibold text-amber-700 mb-2">WOMAC Summary (0=best, 96=worst)</div>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[['Pain', womacScore.painSum, 20, womacScore.painPct],['Stiffness', womacScore.stiffSum, 8, womacScore.stiffPct],['Function', womacScore.funcSum, 68, womacScore.funcPct],['Total', womacScore.total, 96, womacScore.totalPct]].map(([lbl, val, max, pct]) => (
                  <div key={lbl} className="bg-white rounded-lg p-2 shadow-sm">
                    <div className="text-xs text-gray-500">{lbl}</div>
                    <div className="text-lg font-bold text-amber-700">{val}<span className="text-xs text-gray-400">/{max}</span></div>
                    <div className="text-xs text-gray-500">{pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="text-xs text-gray-500 mb-2">Rate each item: 0=None, 1=Mild, 2=Moderate, 3=Severe, 4=Extreme</div>

          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Pain Subscale (5 items, max 20)</div>
          {[['p1','Walking on flat surface'],['p2','Going up/down stairs'],['p3','At night while in bed'],['p4','Sitting or lying'],['p5','Standing upright']].map(([k, lbl]) => (
            <div key={k} className="flex items-center justify-between py-1 border-b border-gray-100">
              <span className="text-xs text-gray-600 flex-1">{lbl}</span>
              <div className="flex gap-1">
                {[0,1,2,3,4].map(v => (
                  <button key={v} type="button"
                    onClick={() => setWomacData(p => ({...p, [k]: String(v)}))}
                    className={`w-7 h-6 rounded border text-xs transition-colors ${womacData[k] === String(v) ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-500 border-gray-300'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mt-3 mb-1">Stiffness Subscale (2 items, max 8)</div>
          {[['s1','Morning stiffness'],['s2','Stiffness later in the day']].map(([k, lbl]) => (
            <div key={k} className="flex items-center justify-between py-1 border-b border-gray-100">
              <span className="text-xs text-gray-600 flex-1">{lbl}</span>
              <div className="flex gap-1">
                {[0,1,2,3,4].map(v => (
                  <button key={v} type="button"
                    onClick={() => setWomacData(p => ({...p, [k]: String(v)}))}
                    className={`w-7 h-6 rounded border text-xs transition-colors ${womacData[k] === String(v) ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-500 border-gray-300'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mt-3 mb-1">Function Subscale (17 items, max 68)</div>
          {[['f1','Descending stairs'],['f2','Ascending stairs'],['f3','Rising from sitting'],['f4','Standing'],['f5','Bending to floor/picking up object'],['f6','Walking on flat surface'],['f7','Entering/exiting car'],['f8','Going shopping'],['f9','Putting on socks/stockings'],['f10','Rising from bed'],['f11','Taking off socks/stockings'],['f12','Lying in bed'],['f13','Bathing/showering'],['f14','Sitting'],['f15','Getting on/off toilet'],['f16','Heavy domestic duties'],['f17','Light domestic duties']].map(([k, lbl]) => (
            <div key={k} className="flex items-center justify-between py-1 border-b border-gray-100">
              <span className="text-xs text-gray-600 flex-1">{lbl}</span>
              <div className="flex gap-1">
                {[0,1,2,3,4].map(v => (
                  <button key={v} type="button"
                    onClick={() => setWomacData(p => ({...p, [k]: String(v)}))}
                    className={`w-7 h-6 rounded border text-xs transition-colors ${womacData[k] === String(v) ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-500 border-gray-300'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Gate>
      </div>

      {/* Imaging */}
      <div className={secCls}>
        <h2 className={h2Cls}>🩻 Imaging & Radiology</h2>
        <Gate question="Is imaging assessment applicable?" value={imagingData.applicable} onChange={v => setImagingData(p => ({...p, applicable: v}))}>
          <Pills label="X-ray done?" options={[['yes','Yes'],['no','No'],['pending','Pending']]} value={imagingData.xrayDone} onChange={v => setImagingData(p => ({...p, xrayDone: v}))}/>
          {imagingData.xrayDone === 'yes' && <>
            <Pills label="Kellgren-Lawrence OA Grade" options={[['0','Grade 0 – Normal'],['1','Grade I – Doubtful'],['2','Grade II – Minimal'],['3','Grade III – Moderate'],['4','Grade IV – Severe']]} value={imagingData.klGrade} onChange={v => setImagingData(p => ({...p, klGrade: v}))} color={imagingData.klGrade >= '3' ? 'red' : 'amber'}/>
            <div className="grid grid-cols-2 gap-2">
              <Pills label="Coxa Valga (neck-shaft >135°)" options={[['no','No'],['yes','Yes']]} value={imagingData.coxaValga} onChange={v => setImagingData(p => ({...p, coxaValga: v}))} color="orange"/>
              <Pills label="Coxa Vara (neck-shaft <120°)" options={[['no','No'],['yes','Yes']]} value={imagingData.coxaVara} onChange={v => setImagingData(p => ({...p, coxaVara: v}))} color="orange"/>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FL label="Lateral CE Angle (°)" sub="normal >25°"><Inp type="number" value={imagingData.lcea} onChange={v => setImagingData(p => ({...p, lcea: v}))} placeholder="degrees"/></FL>
              <FL label="Alpha Angle (°)" sub="cam FAI >55°"><Inp type="number" value={imagingData.alphaAngle} onChange={v => setImagingData(p => ({...p, alphaAngle: v}))} placeholder="degrees"/></FL>
            </div>
            {parseFloat(imagingData.alphaAngle) > 55 && <div className="text-xs text-orange-600 font-medium mb-2">⚠ Alpha angle &gt;55° — cam-type FAI likely</div>}
            <Pills label="Crossover Sign (Pincer FAI)" options={[['absent','Absent'],['present','Present']]} value={imagingData.crossoverSign} onChange={v => setImagingData(p => ({...p, crossoverSign: v}))} color="orange"/>
            <Pills label="FAI Type" options={[['cam','Cam'],['pincer','Pincer'],['mixed','Mixed'],['none','None']]} value={imagingData.faiType} onChange={v => setImagingData(p => ({...p, faiType: v}))} color="orange"/>
          </>}

          <Pills label="MRI done?" options={[['yes','Yes'],['no','No'],['pending','Pending']]} value={imagingData.mriDone} onChange={v => setImagingData(p => ({...p, mriDone: v}))} color="blue"/>
          {imagingData.mriDone === 'yes' && <>
            <Pills label="Labral Tear" options={[['no','No'],['yes','Yes — tear present'],['suspected','Suspected']]} value={imagingData.labrumTear} onChange={v => setImagingData(p => ({...p, labrumTear: v}))} color={imagingData.labrumTear === 'yes' ? 'red' : 'gray'}/>
            {imagingData.labrumTear === 'yes' && <Pills label="Tear Location" options={[['anterior','Anterior'],['anterosuperior','Anterosuperior'],['superior','Superior'],['posterior','Posterior']]} value={imagingData.labrumTearLocation} onChange={v => setImagingData(p => ({...p, labrumTearLocation: v}))}/>}
            <Pills label="Articular Cartilage" options={[['normal','Normal'],['thinning','Thinning'],['focal_defect','Focal defect'],['diffuse_loss','Diffuse loss']]} value={imagingData.cartilage} onChange={v => setImagingData(p => ({...p, cartilage: v}))} color="amber"/>
            <Pills label="Bone Marrow Oedema" options={[['absent','Absent'],['mild','Mild'],['moderate','Moderate'],['severe','Severe']]} value={imagingData.boneMarrow} onChange={v => setImagingData(p => ({...p, boneMarrow: v}))} color="orange"/>
            <Pills label="Joint Effusion" options={[['none','None'],['mild','Mild'],['moderate','Moderate'],['large','Large']]} value={imagingData.effusion} onChange={v => setImagingData(p => ({...p, effusion: v}))}/>
          </>}
          <Pills label="CT done?" options={[['yes','Yes'],['no','No']]} value={imagingData.ctDone} onChange={v => setImagingData(p => ({...p, ctDone: v}))} color="gray"/>
          {imagingData.ctDone === 'yes' && <FL label="CT Findings"><Inp value={imagingData.ctFindings} onChange={v => setImagingData(p => ({...p, ctFindings: v}))} placeholder="bone morphology, cam lesion, acetabular retroversion"/></FL>}
        </Gate>
      </div>

      {/* AVN Assessment */}
      <div className={secCls}>
        <h2 className={h2Cls}>⚠️ Avascular Necrosis (AVN) Assessment</h2>
        <Gate question="Is AVN assessment relevant for this patient?" value={avnData.applicable} onChange={v => setAvnData(p => ({...p, applicable: v}))}>
          <Pills label="Risk Factors" multi options={[['steroids','Steroids (nephrotic, SLE, asthma)'],['alcohol','Alcohol use'],['sickle_cell','Sickle cell disease'],['trauma','Femoral neck fracture/dislocation'],['radiation','Radiation therapy'],['caisson','Decompression (Caisson)'],['idiopathic','Idiopathic'],['coagulopathy','Coagulopathy'],['gauchers',"Gaucher's disease"]]} value={avnData.riskFactors} onChange={v => setAvnData(p => ({...p, riskFactors: v}))} color="red"/>
          {avnData.riskFactors.includes('steroids') && <div className="text-xs text-orange-600 bg-orange-50 rounded p-2 mb-2">⚠ Steroid-induced AVN: common in India — nephrotic syndrome, SLE, post-transplant, chronic asthma. Document steroid dose/duration.</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-1">Ficat & Arlet Staging</div>
              <Pills options={[['I','Stage I — pre-radiographic (MRI +ve)'],['II','Stage II — X-ray +ve, no collapse'],['IIB','Stage IIb — crescent sign'],['III','Stage III — subchondral collapse'],['IV','Stage IV — articular involvement + OA']]} value={avnData.ficatStage} onChange={v => setAvnData(p => ({...p, ficatStage: v}))} color={avnData.ficatStage && ['III','IV'].includes(avnData.ficatStage) ? 'red' : 'amber'}/>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-1">ARCO Staging</div>
              <Pills options={[['0','0 — Normal'],['I','I — MRI only'],['II','II — X-ray changes no collapse'],['III','III — Crescent/collapse'],['IV','IV — Joint space narrowing']]} value={avnData.arcoStage} onChange={v => setAvnData(p => ({...p, arcoStage: v}))} color={avnData.arcoStage && ['III','IV'].includes(avnData.arcoStage) ? 'red' : 'amber'}/>
            </div>
          </div>
          {(avnData.ficatStage === 'III' || avnData.ficatStage === 'IV' || avnData.arcoStage === 'III' || avnData.arcoStage === 'IV') && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-2 mt-1 text-xs text-red-700 font-medium">
              ⚠ Advanced AVN — consider total hip replacement (THR). Assess PM-JAY eligibility.
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Pills label="Subchondral collapse" options={[['no','No'],['crescent_sign','Crescent sign +'],['collapse','Collapse present']]} value={avnData.subchondralCollapse} onChange={v => setAvnData(p => ({...p, subchondralCollapse: v}))} color={avnData.subchondralCollapse !== 'no' ? 'red' : 'gray'}/>
            <Pills label="Lesion size" options={[['small','Small (<15%)'],['medium','Medium (15–30%)'],['large','Large (>30%)']]} value={avnData.lesionSize} onChange={v => setAvnData(p => ({...p, lesionSize: v}))} color="amber"/>
          </div>
          <Pills label="Contralateral hip involvement" options={[['no','No'],['yes','Yes — bilateral AVN'],['suspected','Suspected']]} value={avnData.contralateral} onChange={v => setAvnData(p => ({...p, contralateral: v}))} color={avnData.contralateral === 'yes' ? 'red' : 'gray'}/>
          <FL label="AVN Notes"><Inp value={avnData.notes} onChange={v => setAvnData(p => ({...p, notes: v}))} placeholder="steroid dose, duration, core decompression done, planned THR"/></FL>
        </Gate>
      </div>

      {/* Diagnosis */}
      <div className={secCls}>
        <h2 className={h2Cls}>🩺 Diagnosis</h2>
        <Gate question="Is diagnosis documentation applicable?" value={diagnosisData.applicable} onChange={v => setDiagnosisData(p => ({...p, applicable: v}))}>
          <Pills label="Primary Diagnosis" options={[['hip_oa','Hip OA'],['avascular_necrosis','AVN'],['fai','FAI'],['labral_tear','Labral tear'],['trochanteric_bursitis','Trochanteric bursitis'],['piriformis_syndrome','Piriformis syndrome'],['sij_dysfunction','SIJ dysfunction'],['hip_dysplasia','Dysplasia/DDH'],['stress_fracture','Stress fracture'],['septic_arthritis','Septic arthritis'],['rheumatoid','RA'],['post_thr','Post-THR'],['referred_pain','Referred pain (spine/knee)']]} value={diagnosisData.primaryDx} onChange={v => setDiagnosisData(p => ({...p, primaryDx: v}))} color="amber"/>
          <Pills label="Severity" options={[['mild','Mild'],['moderate','Moderate'],['severe','Severe']]} value={diagnosisData.severity} onChange={v => setDiagnosisData(p => ({...p, severity: v}))} color={diagnosisData.severity === 'severe' ? 'red' : diagnosisData.severity === 'moderate' ? 'orange' : 'green'}/>
          <div className="grid grid-cols-2 gap-2">
            <FL label="ICD-10 Code"><Inp value={diagnosisData.icd10} onChange={v => setDiagnosisData(p => ({...p, icd10: v}))} placeholder="e.g. M16.1, M87.3"/></FL>
            <FL label="Secondary Diagnosis"><Inp value={diagnosisData.secondaryDx} onChange={v => setDiagnosisData(p => ({...p, secondaryDx: v}))} placeholder="co-morbid conditions"/></FL>
          </div>
          <FL label="Clinical Notes"><textarea value={diagnosisData.notes} onChange={e => setDiagnosisData(p => ({...p, notes: e.target.value}))} placeholder="relevant clinical context, bilateral involvement, prior treatments..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-amber-400"/></FL>
        </Gate>
      </div>

      {/* Management Plan */}
      <div className={secCls}>
        <h2 className={h2Cls}>💊 Management Plan</h2>
        <Gate question="Is management plan documentation applicable?" value={managementData.applicable} onChange={v => setManagementData(p => ({...p, applicable: v}))}>
          <Pills label="Conservative Measures" multi options={[['rest','Activity modification'],['physiotherapy','Physiotherapy'],['weight_loss','Weight loss'],['walking_aid','Walking aid'],['ice_heat','Ice/heat'],['tens','TENS'],['orthotics','Orthotics / insoles']]} value={managementData.conservative} onChange={v => setManagementData(p => ({...p, conservative: v}))} color="green"/>
          <FL label="Medications"><Inp value={managementData.analgesics} onChange={v => setManagementData(p => ({...p, analgesics: v}))} placeholder="NSAIDs, paracetamol, glucosamine, duloxetine"/></FL>
          <Pills label="Injection Therapy" options={[['none','None'],['steroid','Intra-articular steroid'],['prp','PRP'],['ha','Hyaluronic acid'],['bone_stimulant','Bone stimulant (AVN)']]} value={managementData.injections} onChange={v => setManagementData(p => ({...p, injections: v}))} color="blue"/>
          <Pills label="Surgical Considerations" options={[['none','None'],['hip_arthroscopy','Hip arthroscopy (FAI/labrum)'],['core_decompression','Core decompression (AVN I–II)'],['osteotomy','Osteotomy'],['thr','Total Hip Replacement (THR)'],['hemiarthroplasty','Hemiarthroplasty']]} value={managementData.surgical} onChange={v => setManagementData(p => ({...p, surgical: v}))} color="orange"/>
          {managementData.surgical === 'thr' && <>
            <FL label="THR Indication"><Inp value={managementData.thrIndication} onChange={v => setManagementData(p => ({...p, thrIndication: v}))} placeholder="failed conservative 3–6 months, severe OA/AVN, HHS <70"/></FL>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-700 mb-2">
              <span className="font-semibold">PM-JAY / Ayushman Bharat:</span> THR covered under HBP-1501. Verify eligibility — family income &lt;₹5 lakh/year, SECC/state DB enrollment.
            </div>
            <Pills label="PM-JAY Eligible?" options={[['yes','Yes — enrolled'],['no','No'],['check','Check eligibility']]} value={managementData.pmJay} onChange={v => setManagementData(p => ({...p, pmJay: v}))} color="blue"/>
          </>}
          <FL label="Follow-up Plan"><Inp value={managementData.followUp} onChange={v => setManagementData(p => ({...p, followUp: v}))} placeholder="e.g. 6 weeks, repeat X-ray, PT review"/></FL>
          <FL label="Additional Notes"><textarea value={managementData.notes} onChange={e => setManagementData(p => ({...p, notes: e.target.value}))} placeholder="referral, specialist input, India-specific context..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-amber-400"/></FL>
        </Gate>
      </div>

      {/* Save */}
      <div className="flex justify-end gap-3 mt-2">
        <button type="button" onClick={handleSave} disabled={saving}
          className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold text-sm shadow hover:from-amber-600 hover:to-orange-600 disabled:opacity-60 transition-all">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Assessment'}
        </button>
      </div>
    </div>
  );
}
