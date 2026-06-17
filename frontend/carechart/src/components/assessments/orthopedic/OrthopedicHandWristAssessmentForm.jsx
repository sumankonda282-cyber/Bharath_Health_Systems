/** @shared-pool */
import React, { useState, useMemo } from 'react';
import api from '../../../api/client';

// ─── Hand & Wrist Anatomy SVG (dorsal view) ───────────────────────────────────
function HandWristSVG({ highlights = [] }) {
  const hi = (s) => highlights.includes(s);
  return (
    <svg viewBox="0 0 280 230" className="w-full max-w-xs mx-auto" role="img" aria-label="Hand and wrist anatomy">
      <text x="140" y="12" textAnchor="middle" fontSize="9" fill="#6b7280" fontWeight="bold">Hand & Wrist — Dorsal View</text>
      {/* Radius */}
      <rect x="80" y="16" width="36" height="48" rx="6" fill="#f5edd8" stroke="#a0845c" strokeWidth="1.5"/>
      {/* Ulna */}
      <rect x="124" y="16" width="26" height="44" rx="6" fill="#ede0c8" stroke="#a0845c" strokeWidth="1.2"/>
      {/* Distal radius / Lister's tubercle */}
      <rect x="78" y="60" width="40" height="16" rx="4" fill={hi('distal_radius') ? '#fef08a' : '#f5edd8'} stroke={hi('distal_radius') ? '#f59e0b' : '#a0845c'} strokeWidth={hi('distal_radius') ? 2.5 : 1.5}/>
      {/* Carpal tunnel region */}
      <rect x="76" y="76" width="76" height="24" rx="6"
        fill={hi('carpal_tunnel') ? '#fca5a5' : '#fef3c7'}
        stroke={hi('carpal_tunnel') ? '#ef4444' : '#a0845c'} strokeWidth={hi('carpal_tunnel') ? 2.5 : 1.2}/>
      <text x="114" y="91" textAnchor="middle" fontSize="7" fill={hi('carpal_tunnel') ? '#ef4444' : '#6b4c2a'}>Carpal tunnel</text>
      {/* Scaphoid */}
      <ellipse cx="88" cy="81" rx="9" ry="11" fill={hi('scaphoid') ? '#fef08a' : '#f5edd8'} stroke={hi('scaphoid') ? '#f59e0b' : '#a0845c'} strokeWidth={hi('scaphoid') ? 2.5 : 1}/>
      <text x="88" y="104" textAnchor="middle" fontSize="6" fill="#a0845c">Sc</text>
      {/* Metacarpals */}
      {[0,1,2,3,4].map(i => (
        <rect key={i} x={72 + i*22} y="100" width="14" height="46" rx="6"
          fill="#fef3c7" stroke="#a0845c" strokeWidth="1.2"/>
      ))}
      {/* MCP joints */}
      {[0,1,2,3,4].map(i => (
        <ellipse key={i} cx={79 + i*22} cy="148" rx="8" ry="7"
          fill={hi('mcp_joints') ? '#fef08a' : '#fde68a'}
          stroke={hi('mcp_joints') ? '#f59e0b' : '#a0845c'} strokeWidth={hi('mcp_joints') ? 2 : 1}/>
      ))}
      {/* Proximal phalanges */}
      {[0,1,2,3,4].map(i => (
        <rect key={i} x={72 + i*22} y="155" width="14" height="26" rx="5"
          fill="#fef3c7" stroke="#a0845c" strokeWidth="1"/>
      ))}
      {/* PIP joints */}
      {[0,1,2,3,4].map(i => (
        <ellipse key={i} cx={79 + i*22} cy="183" rx="7" ry="6"
          fill={hi('pip_joints') ? '#fca5a5' : '#fde68a'}
          stroke={hi('pip_joints') ? '#ef4444' : '#a0845c'} strokeWidth={hi('pip_joints') ? 2 : 1}/>
      ))}
      {/* Middle phalanges (not thumb) */}
      {[1,2,3,4].map(i => (
        <rect key={i} x={72 + i*22} y="189" width="14" height="18" rx="4"
          fill="#fef3c7" stroke="#a0845c" strokeWidth="1"/>
      ))}
      {/* DIP/IP joints */}
      {[0,1,2,3,4].map(i => (
        <ellipse key={i} cx={79 + i*22} cy={i === 0 ? 200 : 209} rx="6" ry="5"
          fill="#fde68a" stroke="#a0845c" strokeWidth="1"/>
      ))}
      {/* De Quervain marking (1st dorsal compartment) */}
      {hi('de_quervain') && <ellipse cx="68" cy="78" rx="10" ry="22" fill="#fca5a5" stroke="#ef4444" strokeWidth="2" opacity="0.6"/>}

      {/* Labels */}
      <text x="98" y="32" textAnchor="middle" fontSize="7" fill="#6b4c2a">Radius</text>
      <text x="137" y="30" textAnchor="middle" fontSize="7" fill="#6b4c2a">Ulna</text>
      {hi('de_quervain') && <text x="50" y="70" textAnchor="middle" fontSize="7" fill="#ef4444">DeQ</text>}

      {/* Legend */}
      <rect x="8" y="220" width="8" height="6" rx="2" fill="#fca5a5" stroke="#ef4444" strokeWidth="1"/>
      <text x="20" y="226" fontSize="7" fill="#6b7280">CTS/inflamed</text>
      <ellipse cx="95" cy="223" rx="5" ry="4" fill="#fef08a" stroke="#f59e0b" strokeWidth="1"/>
      <text x="103" y="226" fontSize="7" fill="#6b7280">Scaphoid</text>
      <rect x="160" y="218" width="8" height="8" rx="2" fill="#f5edd8" stroke="#a0845c" strokeWidth="1"/>
      <text x="172" y="226" fontSize="7" fill="#6b7280">Bone</text>
    </svg>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
const COLOR_MAP = {
  violet: 'bg-violet-100 text-violet-800 border-violet-300 data-[sel=true]:bg-violet-500 data-[sel=true]:text-white data-[sel=true]:border-violet-500',
  purple: 'bg-purple-100 text-purple-800 border-purple-300 data-[sel=true]:bg-purple-500 data-[sel=true]:text-white data-[sel=true]:border-purple-500',
  red: 'bg-red-100 text-red-800 border-red-300 data-[sel=true]:bg-red-500 data-[sel=true]:text-white data-[sel=true]:border-red-500',
  orange: 'bg-orange-100 text-orange-800 border-orange-300 data-[sel=true]:bg-orange-500 data-[sel=true]:text-white data-[sel=true]:border-orange-500',
  blue: 'bg-blue-100 text-blue-800 border-blue-300 data-[sel=true]:bg-blue-500 data-[sel=true]:text-white data-[sel=true]:border-blue-500',
  green: 'bg-green-100 text-green-800 border-green-300 data-[sel=true]:bg-green-500 data-[sel=true]:text-white data-[sel=true]:border-green-500',
  gray: 'bg-gray-100 text-gray-700 border-gray-300 data-[sel=true]:bg-gray-500 data-[sel=true]:text-white data-[sel=true]:border-gray-500',
};
function Pills({ label, options, value, onChange, multi = false, color = 'violet' }) {
  const cls = COLOR_MAP[color] || COLOR_MAP.violet;
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
            className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${value === v ? v === 'yes' ? 'bg-violet-500 text-white border-violet-500' : 'bg-gray-400 text-white border-gray-400' : 'bg-white text-gray-600 border-gray-300 hover:border-violet-400'}`}>
            {v === 'yes' ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
      {value === 'yes' && <div className="border-l-2 border-violet-300 pl-3">{children}</div>}
      {value === 'no' && <div className="flex items-center gap-2 text-xs text-gray-400 italic py-1"><span>🔒</span><span>Not applicable — section locked</span></div>}
    </div>
  );
}
function Inp({ value, onChange, type = 'text', placeholder = '' }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"/>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OrthopedicHandWristAssessmentForm({ patientId, encounterId }) {
  const [basicInfo, setBasicInfo] = useState({ side: '', hand: '', chiefComplaint: '', onset: '', duration: '', occupation: '', mechanism: '' });
  const [physExam, setPhysExam] = useState({ applicable: null, grip: '', pinch: '', wristFlexion: '', wristExtension: '', radialDev: '', ulnarDev: '', pronation: '', supination: '', swelling: [], tenderness: [], deformity: [] });
  const [specialTests, setSpecialTests] = useState({ applicable: null, phalen: '', tinel: '', durkan: '', finkelstein: '', allenTest: '', watsonTest: '', grindTest: '', eburnhamTest: '', brunelliTest: '' });
  const [quickDash, setQuickDash] = useState({ applicable: null, q1: '', q2: '', q3: '', q4: '', q5: '', q6: '', q7: '', q8: '', q9: '', q10: '', q11: '' });
  const [ctsData, setCtsData] = useState({ applicable: null, severity: '', symptoms: [], nocturnalSx: '', handDominance: '', bilateralCts: '', ncsStatus: '', conservTried: '', surgical: '' });
  const [triggerData, setTriggerData] = useState({ applicable: null, digit: '', quinnell: '', triggering: '', locked: '', steroidGiven: '' });
  const [deqData, setDeqData] = useState({ applicable: null, finkelsteinResult: '', tenderness: '', thickening: '', management: '' });
  const [dupuytrenData, setDupuytrenData] = useState({ applicable: null, digits: [], extension_deficit: '', cord: '', tubiana: '', management: '' });
  const [scaphoidData, setScaphoidData] = useState({ applicable: null, mechanism: '', snuffbox: '', stcTenderness: '', axialCompression: '', xray: '', mriCt: '', treatment: '' });
  const [imagingData, setImagingData] = useState({ applicable: null, xrayDone: '', xrayFindings: '', mriDone: '', mriFindings: '', ussDone: '', ussFindings: '', ncsStatus: '' });
  const [diagnosisData, setDiagnosisData] = useState({ applicable: null, primaryDx: '', icd10: '', notes: '' });
  const [managementData, setManagementData] = useState({ applicable: null, conservative: [], medications: '', splint: '', injection: '', surgical: '', occupationalTherapy: '', followUp: '', notes: '' });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── QuickDASH Score ──────────────────────────────────────────────────────────
  const quickDashScore = useMemo(() => {
    if (quickDash.applicable !== 'yes') return null;
    const items = ['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10','q11'].map(k => quickDash[k]).filter(v => v !== '');
    if (items.length === 0) return null;
    const n = items.length;
    const sum = items.reduce((s, v) => s + parseInt(v), 0);
    const score = ((sum / n) - 1) * 25;
    const interp = score <= 25 ? 'Mild disability' : score <= 50 ? 'Moderate disability' : score <= 75 ? 'Severe disability' : 'Very severe disability';
    const interpColor = score <= 25 ? 'text-green-600' : score <= 50 ? 'text-amber-600' : score <= 75 ? 'text-orange-600' : 'text-red-600';
    return { score: Math.round(score), interp, interpColor };
  }, [quickDash]);

  // ── SVG highlights ────────────────────────────────────────────────────────────
  const svgHighlights = useMemo(() => {
    const h = [];
    if (ctsData.applicable === 'yes') h.push('carpal_tunnel');
    if (scaphoidData.applicable === 'yes' && (scaphoidData.snuffbox === 'tender' || scaphoidData.mriCt)) h.push('scaphoid');
    if (deqData.applicable === 'yes') h.push('de_quervain');
    if (dupuytrenData.applicable === 'yes') h.push('pip_joints');
    if (physExam.deformity?.includes('mcp_swelling')) h.push('mcp_joints');
    return h;
  }, [ctsData, scaphoidData, deqData, dupuytrenData, physExam]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/assessments', { type: 'orthopedic_hand_wrist', patientId, encounterId, data: { basicInfo, physExam, specialTests, quickDash, quickDashScore, ctsData, triggerData, deqData, dupuytrenData, scaphoidData, imagingData, diagnosisData, managementData } });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const secCls = 'bg-white rounded-xl border border-violet-100 shadow-sm p-4 mb-4';
  const h2Cls = 'text-sm font-semibold text-violet-800 mb-3 flex items-center gap-2';

  const qdLabels = [
    'Open a tight or new jar',
    'Write',
    'Turn a key',
    'Prepare a meal',
    'Push open a heavy door',
    'Place an object on a shelf above head',
    'Do heavy household chores (wash floors, walls)',
    'Garden or do yard work',
    'Make a bed',
    'Carry a shopping bag or briefcase',
    'Wash your back',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-50 p-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl p-4 mb-4 text-white shadow">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h1 className="text-lg font-bold">Orthopedic Hand & Wrist Assessment</h1>
            <p className="text-violet-100 text-xs mt-0.5">QuickDASH · Carpal Tunnel · Trigger Finger · De Quervain's · Dupuytren's · Scaphoid</p>
          </div>
          <div className="w-40 bg-white/10 rounded-lg p-1">
            <HandWristSVG highlights={svgHighlights}/>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className={secCls}>
        <h2 className={h2Cls}>📋 Basic Information</h2>
        <div className="grid grid-cols-2 gap-3">
          <Pills label="Side" options={[['left','Left'],['right','Right'],['bilateral','Bilateral']]} value={basicInfo.side} onChange={v => setBasicInfo(p => ({...p, side: v}))}/>
          <Pills label="Dominant Hand" options={[['right','Right'],['left','Left'],['ambidextrous','Ambidextrous']]} value={basicInfo.hand} onChange={v => setBasicInfo(p => ({...p, hand: v}))}/>
        </div>
        <FL label="Chief Complaint"><Inp value={basicInfo.chiefComplaint} onChange={v => setBasicInfo(p => ({...p, chiefComplaint: v}))} placeholder="e.g. numbness, pain, triggering, contracture"/></FL>
        <div className="grid grid-cols-2 gap-2">
          <Pills label="Onset" options={[['acute','Acute'],['chronic','Chronic'],['insidious','Insidious']]} value={basicInfo.onset} onChange={v => setBasicInfo(p => ({...p, onset: v}))}/>
          <FL label="Duration"><Inp value={basicInfo.duration} onChange={v => setBasicInfo(p => ({...p, duration: v}))} placeholder="e.g. 3 months"/></FL>
        </div>
        <FL label="Occupation" sub="for ergonomic risk assessment"><Inp value={basicInfo.occupation} onChange={v => setBasicInfo(p => ({...p, occupation: v}))} placeholder="e.g. tailor, construction worker, office typist"/></FL>
      </div>

      {/* Physical Exam */}
      <div className={secCls}>
        <h2 className={h2Cls}>🔬 Physical Examination</h2>
        <Gate question="Is physical examination applicable?" value={physExam.applicable} onChange={v => setPhysExam(p => ({...p, applicable: v}))}>
          <div className="grid grid-cols-3 gap-2">
            <FL label="Grip Strength" sub="(kg or N)"><Inp type="number" value={physExam.grip} onChange={v => setPhysExam(p => ({...p, grip: v}))} placeholder="kg"/></FL>
            <FL label="Pinch Strength" sub="(kg)"><Inp type="number" value={physExam.pinch} onChange={v => setPhysExam(p => ({...p, pinch: v}))} placeholder="kg"/></FL>
          </div>
          <div className="bg-violet-50 rounded-lg p-3 mb-3">
            <div className="text-xs font-semibold text-violet-700 mb-2">Wrist/Forearm ROM (degrees)</div>
            <div className="grid grid-cols-3 gap-2">
              {[['wristFlexion','Flex (0–80°)'],['wristExtension','Ext (0–70°)'],['radialDev','Radial dev (0–20°)'],['ulnarDev','Ulnar dev (0–30°)'],['pronation','Pronation (0–80°)'],['supination','Supination (0–80°)']].map(([k, lbl]) => (
                <FL key={k} label={lbl}><Inp type="number" value={physExam[k]} onChange={v => setPhysExam(p => ({...p, [k]: v}))} placeholder="°"/></FL>
              ))}
            </div>
          </div>
          <Pills label="Swelling Location" multi options={[['wrist','Wrist'],['carpal','Carpal'],['mcp','MCP joint(s)'],['pip','PIP joint(s)'],['diffuse','Diffuse']]} value={physExam.swelling} onChange={v => setPhysExam(p => ({...p, swelling: v}))}/>
          <Pills label="Tenderness" multi options={[['radial_styloid','Radial styloid/1st compartment'],['snuffbox','Anatomical snuffbox'],['scaphoid_tubercle','Scaphoid tubercle'],['ulnar_styloid','Ulnar styloid'],['carpals','Carpals'],['mcp','MCP joints'],['pip_dip','PIP/DIP joints']]} value={physExam.tenderness} onChange={v => setPhysExam(p => ({...p, tenderness: v}))} color="red"/>
          <Pills label="Deformity" multi options={[['boutonnierre','Boutonnière'],['swan_neck','Swan neck'],['mallet_finger','Mallet finger'],['dupuytren','Dupuytren cord'],['dinner_fork','Dinner fork (Colles)'],['z_thumb','Z-deformity thumb (RA)']]} value={physExam.deformity} onChange={v => setPhysExam(p => ({...p, deformity: v}))} color="orange"/>
        </Gate>
      </div>

      {/* Special Tests */}
      <div className={secCls}>
        <h2 className={h2Cls}>🧪 Special Tests</h2>
        <Gate question="Are special tests applicable?" value={specialTests.applicable} onChange={v => setSpecialTests(p => ({...p, applicable: v}))}>
          {[
            ['phalen', "Phalen's test — CTS (wrist flexion 60s)"],
            ['tinel', "Tinel's sign at carpal tunnel"],
            ['durkan', "Durkan's compression test — CTS"],
            ['finkelstein', "Finkelstein test — De Quervain's tenosynovitis"],
            ['allenTest', "Allen's test — ulnar/radial artery patency"],
            ['watsonTest', "Watson scaphoid shift — scapholunate instability"],
            ['grindTest', 'Grind test — 1st CMC arthritis (thumb)'],
            ['eburnhamTest', "Eichhoff/Brunelli — wrist instability"],
          ].map(([k, lbl]) => (
            <div key={k} className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-xs text-gray-600 flex-1">{lbl}</span>
              <div className="flex gap-1">
                {['negative','positive','not_done'].map(v => (
                  <button key={v} type="button"
                    onClick={() => setSpecialTests(p => ({...p, [k]: v}))}
                    className={`px-2 py-0.5 rounded text-xs border transition-colors ${specialTests[k] === v ? v === 'positive' ? 'bg-red-500 text-white border-red-500' : v === 'negative' ? 'bg-green-500 text-white border-green-500' : 'bg-gray-400 text-white border-gray-400' : 'bg-white text-gray-500 border-gray-300'}`}>
                    {v === 'not_done' ? 'N/D' : v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Gate>
      </div>

      {/* QuickDASH */}
      <div className={secCls}>
        <h2 className={h2Cls}>📊 QuickDASH Score (Disabilities of Arm, Shoulder & Hand)</h2>
        <Gate question="Is QuickDASH assessment applicable?" value={quickDash.applicable} onChange={v => setQuickDash(p => ({...p, applicable: v}))}>
          {quickDashScore && (
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-lg p-3 mb-3 border border-violet-200">
              <div className="flex items-baseline gap-3">
                <span className={`text-3xl font-bold ${quickDashScore.interpColor}`}>{quickDashScore.score}<span className="text-base font-normal text-gray-400">/100</span></span>
                <span className={`text-base font-semibold ${quickDashScore.interpColor}`}>{quickDashScore.interp}</span>
                <span className="text-xs text-gray-400 ml-auto">↓ lower = better</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                <div className={`h-1.5 rounded-full ${quickDashScore.score <= 25 ? 'bg-green-500' : quickDashScore.score <= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${quickDashScore.score}%` }}/>
              </div>
            </div>
          )}
          <div className="text-xs text-gray-500 mb-2">Rate each: 1=No difficulty, 2=Mild difficulty, 3=Moderate difficulty, 4=Severe difficulty, 5=Unable to do</div>
          {qdLabels.map((lbl, i) => {
            const k = `q${i + 1}`;
            return (
              <div key={k} className="flex items-center justify-between py-1.5 border-b border-gray-100">
                <span className="text-xs text-gray-600 flex-1">{i + 1}. {lbl}</span>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(v => (
                    <button key={v} type="button"
                      onClick={() => setQuickDash(p => ({...p, [k]: String(v)}))}
                      className={`w-7 h-6 rounded border text-xs font-medium transition-colors ${quickDash[k] === String(v) ? 'bg-violet-500 text-white border-violet-500' : 'bg-white text-gray-500 border-gray-300'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="text-xs text-gray-400 mt-2">Formula: ((sum/n − 1) × 25). If &gt;3 items unanswered, score invalid.</div>
        </Gate>
      </div>

      {/* Carpal Tunnel */}
      <div className={secCls}>
        <h2 className={h2Cls}>🔵 Carpal Tunnel Syndrome (CTS)</h2>
        <Gate question="Is carpal tunnel syndrome assessment applicable?" value={ctsData.applicable} onChange={v => setCtsData(p => ({...p, applicable: v}))}>
          <Pills label="Severity" options={[['mild','Mild'],['moderate','Moderate'],['severe','Severe']]} value={ctsData.severity} onChange={v => setCtsData(p => ({...p, severity: v}))} color={ctsData.severity === 'severe' ? 'red' : ctsData.severity === 'moderate' ? 'orange' : 'green'}/>
          <Pills label="Symptoms" multi options={[['tingling','Tingling — median distribution'],['numbness','Numbness (thumb, index, middle, radial ring)'],['night_pain','Night pain/waking'],['weak_grip','Weak grip'],['thenar_wasting','Thenar wasting (severe)'],['cold_intolerance','Cold intolerance']]} value={ctsData.symptoms} onChange={v => setCtsData(p => ({...p, symptoms: v}))} color="violet"/>
          {ctsData.symptoms?.includes('thenar_wasting') && <div className="text-xs text-red-600 font-semibold mb-2">⚠ Thenar wasting — severe/long-standing CTS. Early surgical decompression recommended.</div>}
          <div className="grid grid-cols-2 gap-2">
            <Pills label="Nocturnal Symptoms" options={[['yes','Yes — wakes from sleep'],['no','No']]} value={ctsData.nocturnalSx} onChange={v => setCtsData(p => ({...p, nocturnalSx: v}))} color="violet"/>
            <Pills label="Bilateral CTS" options={[['no','No — unilateral'],['yes','Yes — bilateral']]} value={ctsData.bilateralCts} onChange={v => setCtsData(p => ({...p, bilateralCts: v}))}/>
          </div>
          <Pills label="NCS/EMG Status" options={[['not_done','Not done'],['mild','Mild — prolonged distal latency'],['moderate','Moderate'],['severe','Severe — absent SNAP'],['normal','Normal']]} value={ctsData.ncsStatus} onChange={v => setCtsData(p => ({...p, ncsStatus: v}))} color="blue"/>
          <Pills label="Conservative Tried?" options={[['no','Not yet'],['splint','Splinting tried'],['steroid','Steroid injection tried'],['both','Both tried — failed']]} value={ctsData.conservTried} onChange={v => setCtsData(p => ({...p, conservTried: v}))}/>
          <Pills label="Surgical Plan" options={[['not_indicated','Not indicated'],['open_release','Open carpal tunnel release'],['endoscopic','Endoscopic release'],['done','Decompression done']]} value={ctsData.surgical} onChange={v => setCtsData(p => ({...p, surgical: v}))} color="orange"/>
          <div className="text-xs text-gray-400 mt-1">India context: CTS common in manual workers, garment industry, construction. NCS available at most tertiary hospitals. PM-JAY covers CTR.</div>
        </Gate>
      </div>

      {/* Trigger Finger */}
      <div className={secCls}>
        <h2 className={h2Cls}>☝️ Trigger Finger</h2>
        <Gate question="Is trigger finger assessment applicable?" value={triggerData.applicable} onChange={v => setTriggerData(p => ({...p, applicable: v}))}>
          <Pills label="Affected Digit(s)" multi options={[['thumb','Thumb'],['index','Index'],['middle','Middle'],['ring','Ring'],['little','Little']]} value={triggerData.digit} onChange={v => setTriggerData(p => ({...p, digit: v}))} color="violet"/>
          <Pills label="Quinnell Grade" options={[['0','Grade 0 — no triggering'],['1','Grade I — uneven movement'],['2','Grade II — active correction'],['3','Grade III — passive correction needed'],['4','Grade IV — fixed/locked']]} value={triggerData.quinnell} onChange={v => setTriggerData(p => ({...p, quinnell: v}))} color={triggerData.quinnell === '4' ? 'red' : triggerData.quinnell === '3' ? 'orange' : 'violet'}/>
          {triggerData.quinnell === '4' && <div className="text-xs text-red-600 font-semibold mb-2">⚠ Fixed triggering — surgical A1 pulley release indicated.</div>}
          <Pills label="Steroid Injection" options={[['not_given','Not given'],['given','Given — date?'],['failed','Given — failed/recurred']]} value={triggerData.steroidGiven} onChange={v => setTriggerData(p => ({...p, steroidGiven: v}))} color="blue"/>
        </Gate>
      </div>

      {/* De Quervain */}
      <div className={secCls}>
        <h2 className={h2Cls}>🤙 De Quervain's Tenosynovitis</h2>
        <Gate question="Is De Quervain's assessment applicable?" value={deqData.applicable} onChange={v => setDeqData(p => ({...p, applicable: v}))}>
          <Pills label="Finkelstein Test" options={[['negative','Negative'],['positive','Positive (pain over 1st compartment)'],['strongly_positive','Strongly positive']]} value={deqData.finkelsteinResult} onChange={v => setDeqData(p => ({...p, finkelsteinResult: v}))} color={deqData.finkelsteinResult !== 'negative' ? 'red' : 'green'}/>
          <Pills label="Radial Styloid Tenderness" options={[['no','No'],['yes','Yes']]} value={deqData.tenderness} onChange={v => setDeqData(p => ({...p, tenderness: v}))} color={deqData.tenderness === 'yes' ? 'red' : 'gray'}/>
          <Pills label="Tendon Thickening on USS" options={[['not_done','Not done'],['no','No'],['yes','Yes — tendon sheath oedema']]} value={deqData.thickening} onChange={v => setDeqData(p => ({...p, thickening: v}))}/>
          <Pills label="Management" options={[['splint','Thumb spica splint'],['steroid','Corticosteroid injection'],['physio','Physiotherapy'],['surgical','Surgical release (failed conservative)']]} value={deqData.management} onChange={v => setDeqData(p => ({...p, management: v}))} color="violet"/>
          <div className="text-xs text-gray-400 mt-1">Common in new mothers (baby-lifting), farmers, cooks. First-line: steroid injection + splint — 70–80% response.</div>
        </Gate>
      </div>

      {/* Dupuytren's */}
      <div className={secCls}>
        <h2 className={h2Cls}>✊ Dupuytren's Contracture</h2>
        <Gate question="Is Dupuytren's contracture assessment applicable?" value={dupuytrenData.applicable} onChange={v => setDupuytrenData(p => ({...p, applicable: v}))}>
          <Pills label="Digits Affected" multi options={[['ring','Ring (most common)'],['little','Little'],['middle','Middle'],['index','Index'],['thumb','Thumb']]} value={dupuytrenData.digits} onChange={v => setDupuytrenData(p => ({...p, digits: v}))} color="violet"/>
          <FL label="PIP/MCP Extension Deficit (degrees)" sub="table-top test positive if >0°"><Inp type="number" value={dupuytrenData.extension_deficit} onChange={v => setDupuytrenData(p => ({...p, extension_deficit: v}))} placeholder="degrees unable to extend"/></FL>
          <Pills label="Tubiana Staging" options={[['N','N — palpable nodule, no contracture'],['T1','T1 — total flexion 0–45°'],['T2','T2 — total 45–90°'],['T3','T3 — total 90–135°'],['T4','T4 — total >135°']]} value={dupuytrenData.tubiana} onChange={v => setDupuytrenData(p => ({...p, tubiana: v}))} color={['T3','T4'].includes(dupuytrenData.tubiana) ? 'red' : 'orange'}/>
          <Pills label="Management Plan" options={[['observe','Observe (nodule only)'],['collagenase','Collagenase clostridium injection'],['needle_fasciotomy','Needle aponeurotomy'],['surgical','Fasciectomy'],['dermofasciectomy','Dermofasciectomy (recurrent)']]} value={dupuytrenData.management} onChange={v => setDupuytrenData(p => ({...p, management: v}))} color="orange"/>
          {(parseFloat(dupuytrenData.extension_deficit) >= 30) && <div className="text-xs text-orange-600 font-semibold mt-1">Table-top test positive — consider intervention if MCP ≥30° or any PIP contracture.</div>}
        </Gate>
      </div>

      {/* Scaphoid */}
      <div className={secCls}>
        <h2 className={h2Cls}>🦴 Scaphoid Fracture Assessment</h2>
        <Gate question="Is scaphoid fracture assessment applicable?" value={scaphoidData.applicable} onChange={v => setScaphoidData(p => ({...p, applicable: v}))}>
          <div className="bg-orange-50 rounded-lg p-2 mb-2 text-xs text-orange-700">Scaphoid fractures may be X-ray occult — if suspected, MRI or CT within 72h. Risk of AVN if untreated.</div>
          <Pills label="Anatomical Snuffbox Tenderness" options={[['no','No'],['yes','Yes — tender']]} value={scaphoidData.snuffbox} onChange={v => setScaphoidData(p => ({...p, snuffbox: v}))} color={scaphoidData.snuffbox === 'yes' ? 'red' : 'green'}/>
          <Pills label="Scaphoid Tubercle Tenderness" options={[['no','No'],['yes','Yes — palmar tenderness']]} value={scaphoidData.stcTenderness} onChange={v => setScaphoidData(p => ({...p, stcTenderness: v}))} color={scaphoidData.stcTenderness === 'yes' ? 'red' : 'green'}/>
          <Pills label="X-ray" options={[['normal','Normal (does not exclude)'],['fracture_seen','Fracture visible'],['not_done','Not done']]} value={scaphoidData.xray} onChange={v => setScaphoidData(p => ({...p, xray: v}))} color="blue"/>
          <Pills label="MRI/CT" options={[['not_done','Not done'],['normal','Normal — fracture excluded'],['confirmed','Fracture confirmed'],['avascular','AVN present']]} value={scaphoidData.mriCt} onChange={v => setScaphoidData(p => ({...p, mriCt: v}))} color={scaphoidData.mriCt === 'avascular' ? 'red' : 'blue'}/>
          <Pills label="Treatment" options={[['cast','Scaphoid cast (undisplaced)'],['screw_fixation','Headless compression screw'],['bone_graft','Bone grafting (AVN/non-union)']]} value={scaphoidData.treatment} onChange={v => setScaphoidData(p => ({...p, treatment: v}))} color="teal"/>
        </Gate>
      </div>

      {/* Imaging */}
      <div className={secCls}>
        <h2 className={h2Cls}>🩻 Imaging & NCS</h2>
        <Gate question="Is imaging/NCS applicable?" value={imagingData.applicable} onChange={v => setImagingData(p => ({...p, applicable: v}))}>
          <Pills label="X-ray" options={[['yes','Done'],['no','Not done'],['pending','Pending']]} value={imagingData.xrayDone} onChange={v => setImagingData(p => ({...p, xrayDone: v}))} color="blue"/>
          {imagingData.xrayDone === 'yes' && <FL label="X-ray Findings"><Inp value={imagingData.xrayFindings} onChange={v => setImagingData(p => ({...p, xrayFindings: v}))} placeholder="alignment, fracture, OA changes, calcification"/></FL>}
          <Pills label="MRI" options={[['yes','Done'],['no','Not done'],['pending','Pending']]} value={imagingData.mriDone} onChange={v => setImagingData(p => ({...p, mriDone: v}))} color="blue"/>
          {imagingData.mriDone === 'yes' && <FL label="MRI Findings"><Inp value={imagingData.mriFindings} onChange={v => setImagingData(p => ({...p, mriFindings: v}))} placeholder="TFCC, scaphoid, SLIL, ganglion"/></FL>}
          <Pills label="NCS/EMG" options={[['done','Done — see CTS section'],['not_done','Not done'],['pending','Pending']]} value={imagingData.ncsStatus} onChange={v => setImagingData(p => ({...p, ncsStatus: v}))} color="purple"/>
        </Gate>
      </div>

      {/* Diagnosis */}
      <div className={secCls}>
        <h2 className={h2Cls}>🩺 Diagnosis</h2>
        <Gate question="Is diagnosis documentation applicable?" value={diagnosisData.applicable} onChange={v => setDiagnosisData(p => ({...p, applicable: v}))}>
          <Pills label="Primary Diagnosis" options={[['cts','Carpal tunnel syndrome'],['de_quervain',"De Quervain's tenosynovitis"],['trigger_finger','Trigger finger/thumb'],['dupuytren',"Dupuytren's contracture"],['scaphoid_fx','Scaphoid fracture'],['colles_fx',"Colles' fracture"],['tfcc','TFCC tear'],['ganglion','Ganglion cyst'],['thumb_cmc_oa','Thumb CMC OA'],['wrist_oa','Wrist OA'],['mallet_finger','Mallet finger'],['flexor_tendon','Flexor tendon injury'],['extensor_tendon','Extensor tendon injury']]} value={diagnosisData.primaryDx} onChange={v => setDiagnosisData(p => ({...p, primaryDx: v}))} color="violet"/>
          <FL label="ICD-10"><Inp value={diagnosisData.icd10} onChange={v => setDiagnosisData(p => ({...p, icd10: v}))} placeholder="e.g. G54.2, M65.3, S62.00"/></FL>
          <FL label="Notes"><textarea value={diagnosisData.notes} onChange={e => setDiagnosisData(p => ({...p, notes: e.target.value}))} placeholder="bilateral, occupational context, diabetes (CTS association)..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-violet-400"/></FL>
        </Gate>
      </div>

      {/* Management */}
      <div className={secCls}>
        <h2 className={h2Cls}>💊 Management Plan</h2>
        <Gate question="Is management plan applicable?" value={managementData.applicable} onChange={v => setManagementData(p => ({...p, applicable: v}))}>
          <Pills label="Conservative" multi options={[['rest','Rest/activity modification'],['splint','Splinting'],['physio','Physiotherapy/hand therapy'],['nsaids','NSAIDs'],['heat_paraffin','Heat/paraffin bath'],['ergonomics','Ergonomic assessment']]} value={managementData.conservative} onChange={v => setManagementData(p => ({...p, conservative: v}))} color="green"/>
          <FL label="Medications"><Inp value={managementData.medications} onChange={v => setManagementData(p => ({...p, medications: v}))} placeholder="NSAIDs, gabapentin (neuropathy), topical diclofenac"/></FL>
          <FL label="Splinting Plan"><Inp value={managementData.splint} onChange={v => setManagementData(p => ({...p, splint: v}))} placeholder="type, duration, night/day wear"/></FL>
          <Pills label="Injection" options={[['none','None'],['steroid_cts','Steroid — carpal tunnel'],['steroid_trigger','Steroid — trigger finger'],['steroid_deq',"Steroid — De Quervain's"],['steroid_cmc','Steroid — CMC arthritis']]} value={managementData.injection} onChange={v => setManagementData(p => ({...p, injection: v}))} color="blue"/>
          <Pills label="Surgical" options={[['none','None'],['ctr','Carpal tunnel release'],['trigger_release','A1 pulley release'],['deq_release','De Quervain release'],['fasciectomy','Dupuytren fasciectomy'],['orif','ORIF fracture'],['tendon_repair','Tendon repair'],['wrist_arthroscopy','Wrist arthroscopy']]} value={managementData.surgical} onChange={v => setManagementData(p => ({...p, surgical: v}))} color="orange"/>
          <FL label="Follow-up"><Inp value={managementData.followUp} onChange={v => setManagementData(p => ({...p, followUp: v}))} placeholder="e.g. 6 weeks post-injection, 2 weeks post-op"/></FL>
          <FL label="Notes"><textarea value={managementData.notes} onChange={e => setManagementData(p => ({...p, notes: e.target.value}))} placeholder="occupational rehab, hand therapy, PM-JAY (CTR covered)..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-violet-400"/></FL>
        </Gate>
      </div>

      {/* Save */}
      <div className="flex justify-end mt-2">
        <button type="button" onClick={handleSave} disabled={saving}
          className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-semibold text-sm shadow hover:from-violet-600 hover:to-purple-600 disabled:opacity-60 transition-all">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Assessment'}
        </button>
      </div>
    </div>
  );
}
