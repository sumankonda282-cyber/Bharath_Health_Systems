/** @shared-pool */
import React, { useState, useMemo } from 'react';
import api from '../../../api/client';

// ─── Elbow Anatomy SVG ────────────────────────────────────────────────────────
function ElbowAnatomySVG({ highlights = [] }) {
  const hi = (s) => highlights.includes(s);
  return (
    <svg viewBox="0 0 240 220" className="w-full max-w-xs mx-auto" role="img" aria-label="Elbow anatomy lateral view">
      <text x="120" y="12" textAnchor="middle" fontSize="9" fill="#6b7280" fontWeight="bold">Elbow — Lateral View</text>
      {/* Humerus shaft */}
      <rect x="100" y="15" width="28" height="80" rx="10" fill="#f5edd8" stroke="#a0845c" strokeWidth="1.5"/>
      {/* Lateral epicondyle */}
      <ellipse cx="134" cy="100" rx="14" ry="18"
        fill={hi('lateral_epicondyle') ? '#fca5a5' : '#fef3c7'}
        stroke={hi('lateral_epicondyle') ? '#ef4444' : '#a0845c'} strokeWidth={hi('lateral_epicondyle') ? 2.5 : 1.5}/>
      <text x="155" y="100" fontSize="7" fill={hi('lateral_epicondyle') ? '#ef4444' : '#6b4c2a'}>LE</text>
      {/* Medial epicondyle (behind) */}
      <ellipse cx="94" cy="100" rx="12" ry="16"
        fill={hi('medial_epicondyle') ? '#fca5a5' : '#e8d4b8'}
        stroke={hi('medial_epicondyle') ? '#ef4444' : '#a0845c'} strokeWidth={hi('medial_epicondyle') ? 2.5 : 1.2}/>
      <text x="70" y="100" textAnchor="end" fontSize="7" fill={hi('medial_epicondyle') ? '#ef4444' : '#6b4c2a'}>ME</text>
      {/* Capitellum */}
      <circle cx="130" cy="112" r="12" fill="#fde68a" stroke="#a0845c" strokeWidth="1.2"/>
      {/* Trochlea */}
      <circle cx="98" cy="112" r="10" fill="#fde68a" stroke="#a0845c" strokeWidth="1"/>
      {/* Radial head */}
      <circle cx="134" cy="130" r="14"
        fill={hi('radial_head') ? '#fef08a' : '#fef3c7'}
        stroke={hi('radial_head') ? '#f59e0b' : '#a0845c'} strokeWidth={hi('radial_head') ? 2.5 : 1.5}/>
      {/* Radius shaft */}
      <path d="M126,144 L120,210" stroke="#a0845c" strokeWidth="4" fill="none" strokeLinecap="round"/>
      {/* Ulna — olecranon */}
      <path d="M90,92 Q80,98 78,112 L80,200" stroke="#a0845c" strokeWidth="5" fill="none" strokeLinecap="round"/>
      <ellipse cx="82" cy="95" rx="14" ry="10"
        fill={hi('olecranon') ? '#fef08a' : '#ede0c8'}
        stroke={hi('olecranon') ? '#f59e0b' : '#a0845c'} strokeWidth={hi('olecranon') ? 2.5 : 1.5}/>
      <text x="60" y="92" textAnchor="end" fontSize="7" fill={hi('olecranon') ? '#f59e0b' : '#6b4c2a'}>Olecranon</text>
      {/* Cubital tunnel region */}
      {hi('cubital_tunnel') && <ellipse cx="88" cy="108" rx="12" ry="18" fill="#a855f7" stroke="#7c3aed" strokeWidth="1.5" opacity="0.4"/>}
      {hi('cubital_tunnel') && <text x="62" y="120" textAnchor="end" fontSize="7" fill="#7c3aed">Cubital tunnel</text>}
      {/* UCL */}
      <line x1="94" y1="110" x2="94" y2="136"
        stroke={hi('ucl') ? '#3b82f6' : '#94a3b8'} strokeWidth={hi('ucl') ? 3 : 1.5} strokeDasharray={hi('ucl') ? '0' : '4 2'}/>
      {/* Annular ligament */}
      <ellipse cx="134" cy="130" rx="18" ry="6" fill="none"
        stroke={hi('annular') ? '#f59e0b' : '#94a3b8'} strokeWidth={hi('annular') ? 2.5 : 1} strokeDasharray="3 2"/>

      {/* Legend */}
      <text x="8" y="212" fontSize="7" fill="#6b7280">LE=Lateral epicondyle  ME=Medial epicondyle</text>
    </svg>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
const CM = { indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300 data-[sel=true]:bg-indigo-500 data-[sel=true]:text-white data-[sel=true]:border-indigo-500', red: 'bg-red-100 text-red-800 border-red-300 data-[sel=true]:bg-red-500 data-[sel=true]:text-white data-[sel=true]:border-red-500', orange: 'bg-orange-100 text-orange-800 border-orange-300 data-[sel=true]:bg-orange-500 data-[sel=true]:text-white data-[sel=true]:border-orange-500', blue: 'bg-blue-100 text-blue-800 border-blue-300 data-[sel=true]:bg-blue-500 data-[sel=true]:text-white data-[sel=true]:border-blue-500', green: 'bg-green-100 text-green-800 border-green-300 data-[sel=true]:bg-green-500 data-[sel=true]:text-white data-[sel=true]:border-green-500', gray: 'bg-gray-100 text-gray-700 border-gray-300 data-[sel=true]:bg-gray-500 data-[sel=true]:text-white data-[sel=true]:border-gray-500', purple: 'bg-purple-100 text-purple-800 border-purple-300 data-[sel=true]:bg-purple-500 data-[sel=true]:text-white data-[sel=true]:border-purple-500' };
function Pills({ label, options, value, onChange, multi = false, color = 'indigo' }) {
  const cls = CM[color] || CM.indigo;
  const isSel = (v) => multi ? (Array.isArray(value) ? value.includes(v) : false) : value === v;
  const click = (v) => { if (multi) { const a = Array.isArray(value) ? value : []; onChange(a.includes(v) ? a.filter(x => x !== v) : [...a, v]); } else onChange(value === v ? '' : v); };
  return (<div className="mb-3">{label && <div className="text-xs font-medium text-gray-600 mb-1">{label}</div>}<div className="flex flex-wrap gap-1.5">{options.map(opt => { const [v, l] = Array.isArray(opt) ? opt : [opt, opt]; return <button key={v} type="button" data-sel={isSel(v)} onClick={() => click(v)} className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${cls}`}>{l}</button>; })}</div></div>);
}
function FL({ label, sub, children }) { return <div className="mb-3"><label className="block text-xs font-medium text-gray-600 mb-1">{label}{sub && <span className="text-gray-400 font-normal ml-1">{sub}</span>}</label>{children}</div>; }
function Gate({ question, value, onChange, children }) {
  return (<div><div className="flex items-center gap-3 mb-3"><span className="text-sm font-medium text-gray-700">{question}</span>{['yes','no'].map(v => <button key={v} type="button" onClick={() => onChange(value === v ? null : v)} className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${value === v ? v === 'yes' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-gray-400 text-white border-gray-400' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}>{v === 'yes' ? 'Yes' : 'No'}</button>)}</div>{value === 'yes' && <div className="border-l-2 border-indigo-300 pl-3">{children}</div>}{value === 'no' && <div className="flex items-center gap-2 text-xs text-gray-400 italic py-1"><span>🔒</span><span>Not applicable — section locked</span></div>}</div>);
}
function Inp({ value, onChange, type = 'text', placeholder = '' }) { return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"/>; }

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OrthopedicElbowAssessmentForm({ patientId, encounterId }) {
  const [basicInfo, setBasicInfo] = useState({ side: '', chiefComplaint: '', onset: '', duration: '', mechanism: '', hand: '' });
  const [physExam, setPhysExam] = useState({ applicable: null, flexion: '', extension: '', pronation: '', supination: '', tenderness: [], swelling: '', deformity: '', gripStrength: '' });
  const [specialTests, setSpecialTests] = useState({ applicable: null, cozens: '', mills: '', golfer: '', valgusStress: '', varusStress: '', trombone: '', moving_valgus: '', lateral_pivot_shift: '', tinelatElbow: '', elbowFlexion: '', fromon: '' });
  const [tennisElbow, setTennisElbow] = useState({ applicable: null, duration: '', severity: '', nrs: '', activity: '', conservative: [], injection: '', pep: '' });
  const [golfersElbow, setGolfersElbow] = useState({ applicable: null, nrs: '', ulnarNerveSymptoms: '', conservative: [], injection: '' });
  const [cubitalTunnel, setCubitalTunnel] = useState({ applicable: null, symptoms: [], severity: '', ncsStatus: '', intrinsic: '', management: '' });
  const [elbowOa, setElbowOa] = useState({ applicable: null, stiffness: '', looseBody: '', xrayGrade: '', management: '' });
  const [imagingData, setImagingData] = useState({ applicable: null, xrayDone: '', xrayFindings: '', mriDone: '', mriFindings: '', ussDone: '', ussFindings: '' });
  const [diagnosisData, setDiagnosisData] = useState({ applicable: null, primaryDx: '', icd10: '', notes: '' });
  const [managementData, setManagementData] = useState({ applicable: null, conservative: [], medications: '', injection: '', surgical: '', followUp: '', notes: '' });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const svgHighlights = useMemo(() => {
    const h = [];
    if (tennisElbow.applicable === 'yes') h.push('lateral_epicondyle');
    if (golfersElbow.applicable === 'yes') h.push('medial_epicondyle');
    if (cubitalTunnel.applicable === 'yes') h.push('cubital_tunnel');
    if (specialTests.valgusStress === 'positive' || specialTests.moving_valgus === 'positive') h.push('ucl');
    return h;
  }, [tennisElbow, golfersElbow, cubitalTunnel, specialTests]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/assessments', { type: 'orthopedic_elbow', patientId, encounterId, data: { basicInfo, physExam, specialTests, tennisElbow, golfersElbow, cubitalTunnel, elbowOa, imagingData, diagnosisData, managementData } });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const secCls = 'bg-white rounded-xl border border-indigo-100 shadow-sm p-4 mb-4';
  const h2Cls = 'text-sm font-semibold text-indigo-800 mb-3 flex items-center gap-2';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl p-4 mb-4 text-white shadow">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h1 className="text-lg font-bold">Orthopedic Elbow Assessment</h1>
            <p className="text-indigo-100 text-xs mt-0.5">Tennis/Golfer's Elbow · Cubital Tunnel · UCL · OCD · Elbow OA</p>
          </div>
          <div className="w-40 bg-white/10 rounded-lg p-1"><ElbowAnatomySVG highlights={svgHighlights}/></div>
        </div>
      </div>

      {/* Basic Info */}
      <div className={secCls}>
        <h2 className={h2Cls}>📋 Basic Information</h2>
        <div className="grid grid-cols-2 gap-3">
          <Pills label="Side" options={[['left','Left'],['right','Right'],['bilateral','Bilateral']]} value={basicInfo.side} onChange={v => setBasicInfo(p => ({...p, side: v}))}/>
          <Pills label="Dominant hand" options={[['right','Right-dominant'],['left','Left-dominant']]} value={basicInfo.hand} onChange={v => setBasicInfo(p => ({...p, hand: v}))} color="gray"/>
        </div>
        <FL label="Chief Complaint"><Inp value={basicInfo.chiefComplaint} onChange={v => setBasicInfo(p => ({...p, chiefComplaint: v}))} placeholder="e.g. lateral elbow pain, numbness in ring/little finger, stiffness"/></FL>
        <div className="grid grid-cols-2 gap-2">
          <Pills label="Onset" options={[['acute','Acute'],['chronic','Chronic']]} value={basicInfo.onset} onChange={v => setBasicInfo(p => ({...p, onset: v}))}/>
          <FL label="Duration"><Inp value={basicInfo.duration} onChange={v => setBasicInfo(p => ({...p, duration: v}))} placeholder="weeks/months"/></FL>
        </div>
        <Pills label="Mechanism/Activity" options={[['repetitive_forearm','Repetitive forearm use'],['sports_throwing','Throwing sports'],['manual_labour','Manual labour'],['computer','Computer/desk work'],['trauma','Trauma/fall']]} value={basicInfo.mechanism} onChange={v => setBasicInfo(p => ({...p, mechanism: v}))} color="indigo"/>
      </div>

      {/* Physical Exam */}
      <div className={secCls}>
        <h2 className={h2Cls}>🔬 Physical Examination</h2>
        <Gate question="Is physical examination applicable?" value={physExam.applicable} onChange={v => setPhysExam(p => ({...p, applicable: v}))}>
          <div className="bg-indigo-50 rounded-lg p-3 mb-3">
            <div className="text-xs font-semibold text-indigo-700 mb-2">Elbow ROM (degrees)</div>
            <div className="grid grid-cols-2 gap-2">
              {[['flexion','Flexion (0–145°)'],['extension','Extension (0°)'],['pronation','Pronation (0–80°)'],['supination','Supination (0–80°)']].map(([k, lbl]) => (
                <FL key={k} label={lbl}><Inp type="number" value={physExam[k]} onChange={v => setPhysExam(p => ({...p, [k]: v}))} placeholder="°"/></FL>
              ))}
            </div>
          </div>
          <Pills label="Tenderness" multi options={[['lateral_epicondyle','Lateral epicondyle'],['medial_epicondyle','Medial epicondyle'],['olecranon','Olecranon'],['radial_head','Radial head'],['cubital_fossa','Cubital fossa']]} value={physExam.tenderness} onChange={v => setPhysExam(p => ({...p, tenderness: v}))} color="red"/>
          <FL label="Grip Strength (kg)"><Inp type="number" value={physExam.gripStrength} onChange={v => setPhysExam(p => ({...p, gripStrength: v}))} placeholder="kg"/></FL>
          <Pills label="Deformity" options={[['none','None'],['cubitus_valgus','Cubitus valgus'],['cubitus_varus','Cubitus varus (gunstock)'],['flexion_contracture','Flexion contracture']]} value={physExam.deformity} onChange={v => setPhysExam(p => ({...p, deformity: v}))}/>
        </Gate>
      </div>

      {/* Special Tests */}
      <div className={secCls}>
        <h2 className={h2Cls}>🧪 Special Tests</h2>
        <Gate question="Are special tests applicable?" value={specialTests.applicable} onChange={v => setSpecialTests(p => ({...p, applicable: v}))}>
          {[
            ['cozens', "Cozen's test — lateral epicondylitis (resisted wrist ext)"],
            ['mills', "Mill's test — lateral epicondylitis (passive wrist flex)"],
            ['golfer', "Medial epicondyle tenderness — medial epicondylitis"],
            ['valgusStress', 'Valgus stress test — UCL integrity'],
            ['moving_valgus', 'Moving valgus stress test — UCL (throwing athletes)'],
            ['varusStress', 'Varus stress test — LCL integrity'],
            ['lateral_pivot_shift', 'Lateral pivot shift — posterolateral rotatory instability'],
            ['tinelatElbow', 'Tinel at cubital tunnel — ulnar nerve entrapment'],
            ['elbowFlexion', 'Elbow flexion test (60s) — cubital tunnel'],
            ['fromon', "Froment's sign — intrinsic weakness (ulnar nerve)"],
          ].map(([k, lbl]) => (
            <div key={k} className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-xs text-gray-600 flex-1">{lbl}</span>
              <div className="flex gap-1">
                {['negative','positive','not_done'].map(v => (
                  <button key={v} type="button" onClick={() => setSpecialTests(p => ({...p, [k]: v}))}
                    className={`px-2 py-0.5 rounded text-xs border transition-colors ${specialTests[k] === v ? v === 'positive' ? 'bg-red-500 text-white border-red-500' : v === 'negative' ? 'bg-green-500 text-white border-green-500' : 'bg-gray-400 text-white border-gray-400' : 'bg-white text-gray-500 border-gray-300'}`}>
                    {v === 'not_done' ? 'N/D' : v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Gate>
      </div>

      {/* Lateral Epicondylitis */}
      <div className={secCls}>
        <h2 className={h2Cls}>🎾 Lateral Epicondylitis (Tennis Elbow)</h2>
        <Gate question="Is lateral epicondylitis (tennis elbow) assessment applicable?" value={tennisElbow.applicable} onChange={v => setTennisElbow(p => ({...p, applicable: v}))}>
          <Pills label="Duration of Symptoms" options={[['lt6w','<6 weeks'],['6_12w','6–12 weeks'],['gt3m','>3 months (chronic)']]} value={tennisElbow.duration} onChange={v => setTennisElbow(p => ({...p, duration: v}))}/>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs text-gray-600">Pain NRS (0–10)</span>
            <div className="flex gap-1">
              {[0,1,2,3,4,5,6,7,8,9,10].map(v => (
                <button key={v} type="button" onClick={() => setTennisElbow(p => ({...p, nrs: String(v)}))}
                  className={`w-6 h-6 rounded text-xs font-medium ${tennisElbow.nrs === String(v) ? v >= 7 ? 'bg-red-500 text-white' : v >= 4 ? 'bg-orange-400 text-white' : 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{v}</button>
              ))}
            </div>
          </div>
          <Pills label="Activity Limitation" options={[['none','None'],['mild','Mild'],['moderate','Moderate'],['severe','Severe — off work/sport']]} value={tennisElbow.activity} onChange={v => setTennisElbow(p => ({...p, activity: v}))} color="orange"/>
          <Pills label="Conservative Tried" multi options={[['physiotherapy','Physiotherapy'],['eccentric','Eccentric loading'],['bracing','Counterforce brace'],['nsaids','NSAIDs'],['ice','Ice/cryotherapy']]} value={tennisElbow.conservative} onChange={v => setTennisElbow(p => ({...p, conservative: v}))} color="green"/>
          <Pills label="Injection" options={[['none','None'],['steroid','Corticosteroid (short-term)'],['prp','PRP — for recalcitrant'],['autologous','Autologous blood']]} value={tennisElbow.injection} onChange={v => setTennisElbow(p => ({...p, injection: v}))} color="blue"/>
          <Pills label="Surgical Referral" options={[['no','No — conservative'],['consider','Consider after 6m failure'],['referred','Referred — ECRB release']]} value={tennisElbow.pep} onChange={v => setTennisElbow(p => ({...p, pep: v}))} color="indigo"/>
          <div className="text-xs text-gray-400 mt-1">80–90% resolve with conservative treatment at 12 months. Prognosis good.</div>
        </Gate>
      </div>

      {/* Medial Epicondylitis */}
      <div className={secCls}>
        <h2 className={h2Cls}>⛳ Medial Epicondylitis (Golfer's Elbow)</h2>
        <Gate question="Is medial epicondylitis (golfer's elbow) assessment applicable?" value={golfersElbow.applicable} onChange={v => setGolfersElbow(p => ({...p, applicable: v}))}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs text-gray-600">Pain NRS (0–10)</span>
            <div className="flex gap-1">
              {[0,1,2,3,4,5,6,7,8,9,10].map(v => (
                <button key={v} type="button" onClick={() => setGolfersElbow(p => ({...p, nrs: String(v)}))}
                  className={`w-6 h-6 rounded text-xs font-medium ${golfersElbow.nrs === String(v) ? v >= 7 ? 'bg-red-500 text-white' : v >= 4 ? 'bg-orange-400 text-white' : 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{v}</button>
              ))}
            </div>
          </div>
          <Pills label="Associated Ulnar Nerve Symptoms?" options={[['no','No'],['yes','Yes — ring/little finger tingling']]} value={golfersElbow.ulnarNerveSymptoms} onChange={v => setGolfersElbow(p => ({...p, ulnarNerveSymptoms: v}))} color={golfersElbow.ulnarNerveSymptoms === 'yes' ? 'red' : 'gray'}/>
          {golfersElbow.ulnarNerveSymptoms === 'yes' && <div className="text-xs text-orange-600 mb-2">⚠ Co-existing cubital tunnel syndrome — assess below.</div>}
          <Pills label="Conservative" multi options={[['physiotherapy','Physiotherapy'],['eccentric','Eccentric programme'],['nsaids','NSAIDs'],['bracing','Medial brace'],['activity_modification','Activity modification']]} value={golfersElbow.conservative} onChange={v => setGolfersElbow(p => ({...p, conservative: v}))} color="green"/>
          <Pills label="Injection" options={[['none','None'],['steroid','Corticosteroid'],['prp','PRP']]} value={golfersElbow.injection} onChange={v => setGolfersElbow(p => ({...p, injection: v}))} color="blue"/>
        </Gate>
      </div>

      {/* Cubital Tunnel */}
      <div className={secCls}>
        <h2 className={h2Cls}>🧠 Cubital Tunnel Syndrome (Ulnar Neuropathy)</h2>
        <Gate question="Is cubital tunnel syndrome assessment applicable?" value={cubitalTunnel.applicable} onChange={v => setCubitalTunnel(p => ({...p, applicable: v}))}>
          <Pills label="Symptoms" multi options={[['ring_little_tingling','Ring & little finger tingling'],['night_symptoms','Night symptoms/positional'],['grip_weakness','Weak grip/pinch'],['intrinsic_wasting','Intrinsic muscle wasting (severe)'],['clawing','Ring/little clawing']]} value={cubitalTunnel.symptoms} onChange={v => setCubitalTunnel(p => ({...p, symptoms: v}))} color="purple"/>
          {cubitalTunnel.symptoms?.includes('intrinsic_wasting') && <div className="text-xs text-red-600 font-semibold mb-2">⚠ Intrinsic wasting — severe ulnar neuropathy. Surgical decompression/transposition likely required.</div>}
          <Pills label="Severity" options={[['mild','Mild — intermittent tingling'],['moderate','Moderate — constant, weak pinch'],['severe','Severe — wasting, clawing']]} value={cubitalTunnel.severity} onChange={v => setCubitalTunnel(p => ({...p, severity: v}))} color={cubitalTunnel.severity === 'severe' ? 'red' : 'purple'}/>
          <Pills label="NCS/EMG Status" options={[['not_done','Not done'],['mild','Mild slowing'],['moderate','Moderate — ↓amplitude'],['severe','Severe — absent SNAP/CMAP'],['normal','Normal']]} value={cubitalTunnel.ncsStatus} onChange={v => setCubitalTunnel(p => ({...p, ncsStatus: v}))} color="blue"/>
          <Pills label="Management" options={[['conservative','Conservative — elbow pad, night splint'],['decompression','In situ decompression'],['transposition','Anterior transposition'],['medial_epicondylectomy','Medial epicondylectomy']]} value={cubitalTunnel.management} onChange={v => setCubitalTunnel(p => ({...p, management: v}))} color="indigo"/>
        </Gate>
      </div>

      {/* Elbow OA / OCD */}
      <div className={secCls}>
        <h2 className={h2Cls}>🦴 Elbow OA / Osteochondritis Dissecans (OCD)</h2>
        <Gate question="Is elbow OA/OCD assessment applicable?" value={elbowOa.applicable} onChange={v => setElbowOa(p => ({...p, applicable: v}))}>
          <Pills label="Stiffness Pattern" options={[['none','None'],['extension_block','Extension block (most common)'],['flexion_block','Flexion block'],['painful_arc','Painful arc']]} value={elbowOa.stiffness} onChange={v => setElbowOa(p => ({...p, stiffness: v}))}/>
          <Pills label="Loose Body Signs" options={[['absent','Absent'],['locking','Locking/clicking'],['crepitus','Crepitus']]} value={elbowOa.looseBody} onChange={v => setElbowOa(p => ({...p, looseBody: v}))} color="orange"/>
          <Pills label="X-ray Grade" options={[['0','0 — Normal'],['1','I — Osteophytes only'],['2','II — JS narrowing'],['3','III — Subchondral sclerosis'],['4','IV — Gross destruction']]} value={elbowOa.xrayGrade} onChange={v => setElbowOa(p => ({...p, xrayGrade: v}))} color={['3','4'].includes(elbowOa.xrayGrade) ? 'red' : 'orange'}/>
          <Pills label="Management" options={[['physio','Physiotherapy/ROM exercises'],['arthroscopy','Arthroscopic debridement/loose body removal'],['arthroplasty','Total elbow arthroplasty']]} value={elbowOa.management} onChange={v => setElbowOa(p => ({...p, management: v}))} color="indigo"/>
        </Gate>
      </div>

      {/* Imaging */}
      <div className={secCls}>
        <h2 className={h2Cls}>🩻 Imaging</h2>
        <Gate question="Is imaging assessment applicable?" value={imagingData.applicable} onChange={v => setImagingData(p => ({...p, applicable: v}))}>
          <Pills label="X-ray" options={[['done','Done'],['not_done','Not done'],['pending','Pending']]} value={imagingData.xrayDone} onChange={v => setImagingData(p => ({...p, xrayDone: v}))} color="blue"/>
          {imagingData.xrayDone === 'done' && <FL label="X-ray Findings"><Inp value={imagingData.xrayFindings} onChange={v => setImagingData(p => ({...p, xrayFindings: v}))} placeholder="osteophytes, loose bodies, calcification, OCD lesion"/></FL>}
          <Pills label="MRI" options={[['done','Done'],['not_done','Not done'],['pending','Pending']]} value={imagingData.mriDone} onChange={v => setImagingData(p => ({...p, mriDone: v}))} color="blue"/>
          {imagingData.mriDone === 'done' && <FL label="MRI Findings"><Inp value={imagingData.mriFindings} onChange={v => setImagingData(p => ({...p, mriFindings: v}))} placeholder="tendon tear/degeneration, UCL, OCD, bone marrow oedema"/></FL>}
          <Pills label="USS" options={[['done','Done'],['not_done','Not done']]} value={imagingData.ussDone} onChange={v => setImagingData(p => ({...p, ussDone: v}))} color="gray"/>
          {imagingData.ussDone === 'done' && <FL label="USS Findings"><Inp value={imagingData.ussFindings} onChange={v => setImagingData(p => ({...p, ussFindings: v}))} placeholder="tendon thickness, tear, neo-vascularity"/></FL>}
        </Gate>
      </div>

      {/* Diagnosis */}
      <div className={secCls}>
        <h2 className={h2Cls}>🩺 Diagnosis</h2>
        <Gate question="Is diagnosis applicable?" value={diagnosisData.applicable} onChange={v => setDiagnosisData(p => ({...p, applicable: v}))}>
          <Pills label="Primary Diagnosis" options={[['lateral_epicondylitis','Lateral epicondylitis (tennis elbow)'],['medial_epicondylitis','Medial epicondylitis (golfer\'s elbow)'],['cubital_tunnel','Cubital tunnel syndrome'],['ucl_injury','UCL injury'],['ocd','OCD capitellum'],['elbow_oa','Elbow OA'],['elbow_fracture','Elbow fracture'],['loose_body','Loose body'],['radial_head_fx','Radial head fracture'],['olecranon_bursitis','Olecranon bursitis']]} value={diagnosisData.primaryDx} onChange={v => setDiagnosisData(p => ({...p, primaryDx: v}))} color="indigo"/>
          <FL label="ICD-10"><Inp value={diagnosisData.icd10} onChange={v => setDiagnosisData(p => ({...p, icd10: v}))} placeholder="e.g. M77.1 (lateral epicondylitis), G56.2 (cubital tunnel)"/></FL>
          <FL label="Notes"><textarea value={diagnosisData.notes} onChange={e => setDiagnosisData(p => ({...p, notes: e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-14 focus:outline-none focus:ring-2 focus:ring-indigo-400"/></FL>
        </Gate>
      </div>

      {/* Management */}
      <div className={secCls}>
        <h2 className={h2Cls}>💊 Management Plan</h2>
        <Gate question="Is management plan applicable?" value={managementData.applicable} onChange={v => setManagementData(p => ({...p, applicable: v}))}>
          <Pills label="Conservative" multi options={[['rest','Activity modification/rest'],['physio','Physiotherapy'],['eccentric','Eccentric loading protocol'],['counterforce_brace','Counterforce brace'],['nsaids','NSAIDs'],['ice','Ice massage']]} value={managementData.conservative} onChange={v => setManagementData(p => ({...p, conservative: v}))} color="green"/>
          <FL label="Medications"><Inp value={managementData.medications} onChange={v => setManagementData(p => ({...p, medications: v}))} placeholder="NSAIDs, topical diclofenac, gabapentin (neuropathy)"/></FL>
          <Pills label="Injection" options={[['none','None'],['steroid','Corticosteroid'],['prp','PRP'],['prolotherapy','Prolotherapy'],['autologous','Autologous blood']]} value={managementData.injection} onChange={v => setManagementData(p => ({...p, injection: v}))} color="blue"/>
          <Pills label="Surgical" options={[['none','None'],['release','Tendon release (epicondylitis)'],['cubital_decompression','Cubital tunnel decompression'],['ucl_reconstruction','UCL reconstruction'],['arthroscopy','Arthroscopic loose body removal'],['tep','Total elbow prosthesis']]} value={managementData.surgical} onChange={v => setManagementData(p => ({...p, surgical: v}))} color="orange"/>
          <FL label="Follow-up"><Inp value={managementData.followUp} onChange={v => setManagementData(p => ({...p, followUp: v}))} placeholder="e.g. 6 weeks, review NRS"/></FL>
          <FL label="Notes"><textarea value={managementData.notes} onChange={e => setManagementData(p => ({...p, notes: e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-14 focus:outline-none focus:ring-2 focus:ring-indigo-400"/></FL>
        </Gate>
      </div>

      <div className="flex justify-end mt-2">
        <button type="button" onClick={handleSave} disabled={saving}
          className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-xl font-semibold text-sm shadow hover:from-indigo-600 hover:to-blue-600 disabled:opacity-60 transition-all">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Assessment'}
        </button>
      </div>
    </div>
  );
}
