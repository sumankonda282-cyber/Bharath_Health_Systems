/** @shared-pool */
import React, { useState, useMemo } from 'react';
import api from '../../../api/client';

// ─── Pain Body Map SVG ────────────────────────────────────────────────────────
const BODY_REGIONS = [
  { id: 'left_jaw', label: 'L jaw', cx: 88, cy: 30 },
  { id: 'right_jaw', label: 'R jaw', cx: 112, cy: 30 },
  { id: 'left_shoulder', label: 'L shoulder', cx: 68, cy: 55 },
  { id: 'right_shoulder', label: 'R shoulder', cx: 132, cy: 55 },
  { id: 'left_upper_arm', label: 'L upper arm', cx: 58, cy: 80 },
  { id: 'right_upper_arm', label: 'R upper arm', cx: 142, cy: 80 },
  { id: 'left_lower_arm', label: 'L lower arm', cx: 52, cy: 110 },
  { id: 'right_lower_arm', label: 'R lower arm', cx: 148, cy: 110 },
  { id: 'left_hip', label: 'L hip', cx: 78, cy: 140 },
  { id: 'right_hip', label: 'R hip', cx: 122, cy: 140 },
  { id: 'chest', label: 'Chest', cx: 100, cy: 75 },
  { id: 'abdomen', label: 'Abdomen', cx: 100, cy: 105 },
  { id: 'left_upper_leg', label: 'L upper leg', cx: 82, cy: 168 },
  { id: 'right_upper_leg', label: 'R upper leg', cx: 118, cy: 168 },
  { id: 'left_lower_leg', label: 'L lower leg', cx: 82, cy: 200 },
  { id: 'right_lower_leg', label: 'R lower leg', cx: 118, cy: 200 },
  { id: 'neck', label: 'Neck', cx: 100, cy: 42 },
  { id: 'upper_back', label: 'Upper back', cx: 100, cy: 75 }, // used in posterior
  { id: 'lower_back', label: 'Lower back', cx: 100, cy: 120 },
  { id: 'left_buttock', label: 'L buttock', cx: 80, cy: 145 },
  { id: 'right_buttock', label: 'R buttock', cx: 120, cy: 145 },
];

function PainBodyMap({ selected = [], onToggle }) {
  return (
    <div className="flex gap-4 items-start justify-center">
      {/* Anterior */}
      <div>
        <div className="text-xs text-center text-gray-500 mb-1">Anterior</div>
        <svg viewBox="0 0 200 230" width="120" className="block">
          {/* Head */}
          <ellipse cx="100" cy="20" rx="18" ry="18" fill="#f5edd8" stroke="#a0845c" strokeWidth="1.5"/>
          {/* Neck */}
          <rect x="92" y="36" width="16" height="12" fill="#f5edd8" stroke="#a0845c" strokeWidth="1"/>
          {/* Torso */}
          <path d="M68,48 L132,48 L140,120 L60,120 Z" fill="#f5edd8" stroke="#a0845c" strokeWidth="1.5"/>
          {/* Pelvis */}
          <path d="M60,120 L140,120 L136,148 L64,148 Z" fill="#ede0c8" stroke="#a0845c" strokeWidth="1.2"/>
          {/* Arms */}
          <path d="M68,50 L52,60 L44,90 L48,130 L58,130 L58,90 L70,65 Z" fill="#f5edd8" stroke="#a0845c" strokeWidth="1"/>
          <path d="M132,50 L148,60 L156,90 L152,130 L142,130 L142,90 L130,65 Z" fill="#f5edd8" stroke="#a0845c" strokeWidth="1"/>
          {/* Legs */}
          <path d="M64,148 L78,148 L82,200 L72,200 Z" fill="#f5edd8" stroke="#a0845c" strokeWidth="1"/>
          <path d="M136,148 L122,148 L118,200 L128,200 Z" fill="#f5edd8" stroke="#a0845c" strokeWidth="1"/>
          {/* Feet */}
          <ellipse cx="72" cy="210" rx="12" ry="8" fill="#ede0c8" stroke="#a0845c" strokeWidth="1"/>
          <ellipse cx="128" cy="210" rx="12" ry="8" fill="#ede0c8" stroke="#a0845c" strokeWidth="1"/>
          {/* Clickable pain zones */}
          {[
            { id: 'neck', cx: 100, cy: 42, r: 8 },
            { id: 'left_shoulder', cx: 68, cy: 55, r: 10 },
            { id: 'right_shoulder', cx: 132, cy: 55, r: 10 },
            { id: 'chest', cx: 100, cy: 80, r: 18 },
            { id: 'abdomen', cx: 100, cy: 110, r: 14 },
            { id: 'left_upper_arm', cx: 53, cy: 88, r: 9 },
            { id: 'right_upper_arm', cx: 147, cy: 88, r: 9 },
            { id: 'left_lower_arm', cx: 51, cy: 118, r: 9 },
            { id: 'right_lower_arm', cx: 149, cy: 118, r: 9 },
            { id: 'left_hip', cx: 72, cy: 136, r: 10 },
            { id: 'right_hip', cx: 128, cy: 136, r: 10 },
            { id: 'left_upper_leg', cx: 74, cy: 168, r: 10 },
            { id: 'right_upper_leg', cx: 126, cy: 168, r: 10 },
            { id: 'left_lower_leg', cx: 74, cy: 196, r: 9 },
            { id: 'right_lower_leg', cx: 126, cy: 196, r: 9 },
          ].map(z => (
            <circle key={z.id} cx={z.cx} cy={z.cy} r={z.r}
              fill={selected.includes(z.id) ? '#ef4444' : 'transparent'}
              stroke={selected.includes(z.id) ? '#ef4444' : '#d1d5db'}
              strokeWidth="1" opacity={selected.includes(z.id) ? 0.7 : 0.4}
              className="cursor-pointer"
              onClick={() => onToggle(z.id)}/>
          ))}
        </svg>
      </div>
      {/* Posterior */}
      <div>
        <div className="text-xs text-center text-gray-500 mb-1">Posterior</div>
        <svg viewBox="0 0 200 230" width="120" className="block">
          <ellipse cx="100" cy="20" rx="18" ry="18" fill="#f5edd8" stroke="#a0845c" strokeWidth="1.5"/>
          <rect x="92" y="36" width="16" height="12" fill="#f5edd8" stroke="#a0845c" strokeWidth="1"/>
          <path d="M68,48 L132,48 L140,120 L60,120 Z" fill="#f5edd8" stroke="#a0845c" strokeWidth="1.5"/>
          <path d="M60,120 L140,120 L136,148 L64,148 Z" fill="#ede0c8" stroke="#a0845c" strokeWidth="1.2"/>
          <path d="M68,50 L52,60 L44,90 L48,130 L58,130 L58,90 L70,65 Z" fill="#f5edd8" stroke="#a0845c" strokeWidth="1"/>
          <path d="M132,50 L148,60 L156,90 L152,130 L142,130 L142,90 L130,65 Z" fill="#f5edd8" stroke="#a0845c" strokeWidth="1"/>
          <path d="M64,148 L78,148 L82,200 L72,200 Z" fill="#f5edd8" stroke="#a0845c" strokeWidth="1"/>
          <path d="M136,148 L122,148 L118,200 L128,200 Z" fill="#f5edd8" stroke="#a0845c" strokeWidth="1"/>
          <ellipse cx="72" cy="210" rx="12" ry="8" fill="#ede0c8" stroke="#a0845c" strokeWidth="1"/>
          <ellipse cx="128" cy="210" rx="12" ry="8" fill="#ede0c8" stroke="#a0845c" strokeWidth="1"/>
          {[
            { id: 'neck_post', cx: 100, cy: 42, r: 8 },
            { id: 'left_shoulder_post', cx: 68, cy: 55, r: 10 },
            { id: 'right_shoulder_post', cx: 132, cy: 55, r: 10 },
            { id: 'upper_back', cx: 100, cy: 78, r: 18 },
            { id: 'lower_back', cx: 100, cy: 112, r: 14 },
            { id: 'left_buttock', cx: 76, cy: 136, r: 10 },
            { id: 'right_buttock', cx: 124, cy: 136, r: 10 },
            { id: 'left_upper_leg_post', cx: 74, cy: 168, r: 10 },
            { id: 'right_upper_leg_post', cx: 126, cy: 168, r: 10 },
            { id: 'left_calf', cx: 74, cy: 196, r: 9 },
            { id: 'right_calf', cx: 126, cy: 196, r: 9 },
          ].map(z => (
            <circle key={z.id} cx={z.cx} cy={z.cy} r={z.r}
              fill={selected.includes(z.id) ? '#ef4444' : 'transparent'}
              stroke={selected.includes(z.id) ? '#ef4444' : '#d1d5db'}
              strokeWidth="1" opacity={selected.includes(z.id) ? 0.7 : 0.4}
              className="cursor-pointer"
              onClick={() => onToggle(z.id)}/>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
const COLOR_MAP = {
  rose: 'bg-rose-100 text-rose-800 border-rose-300 data-[sel=true]:bg-rose-500 data-[sel=true]:text-white data-[sel=true]:border-rose-500',
  pink: 'bg-pink-100 text-pink-800 border-pink-300 data-[sel=true]:bg-pink-500 data-[sel=true]:text-white data-[sel=true]:border-pink-500',
  red: 'bg-red-100 text-red-800 border-red-300 data-[sel=true]:bg-red-500 data-[sel=true]:text-white data-[sel=true]:border-red-500',
  orange: 'bg-orange-100 text-orange-800 border-orange-300 data-[sel=true]:bg-orange-500 data-[sel=true]:text-white data-[sel=true]:border-orange-500',
  blue: 'bg-blue-100 text-blue-800 border-blue-300 data-[sel=true]:bg-blue-500 data-[sel=true]:text-white data-[sel=true]:border-blue-500',
  green: 'bg-green-100 text-green-800 border-green-300 data-[sel=true]:bg-green-500 data-[sel=true]:text-white data-[sel=true]:border-green-500',
  gray: 'bg-gray-100 text-gray-700 border-gray-300 data-[sel=true]:bg-gray-500 data-[sel=true]:text-white data-[sel=true]:border-gray-500',
  purple: 'bg-purple-100 text-purple-800 border-purple-300 data-[sel=true]:bg-purple-500 data-[sel=true]:text-white data-[sel=true]:border-purple-500',
};
function Pills({ label, options, value, onChange, multi = false, color = 'rose' }) {
  const cls = COLOR_MAP[color] || COLOR_MAP.rose;
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
            className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${value === v ? v === 'yes' ? 'bg-rose-500 text-white border-rose-500' : 'bg-gray-400 text-white border-gray-400' : 'bg-white text-gray-600 border-gray-300 hover:border-rose-400'}`}>
            {v === 'yes' ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
      {value === 'yes' && <div className="border-l-2 border-rose-300 pl-3">{children}</div>}
      {value === 'no' && <div className="flex items-center gap-2 text-xs text-gray-400 italic py-1"><span>🔒</span><span>Not applicable — section locked</span></div>}
    </div>
  );
}
function Inp({ value, onChange, type = 'text', placeholder = '' }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"/>;
}
function NRS({ label, value, onChange }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-gray-500 mb-1"><span>{label}</span><span className="font-semibold text-rose-600">{value !== '' ? `${value}/10` : '—'}</span></div>
      <div className="flex gap-1">
        {[0,1,2,3,4,5,6,7,8,9,10].map(v => (
          <button key={v} type="button" onClick={() => onChange(String(v))}
            className={`flex-1 h-7 rounded text-xs font-medium transition-colors ${value === String(v) ? v >= 7 ? 'bg-red-500 text-white' : v >= 4 ? 'bg-orange-400 text-white' : 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            {v}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-0.5"><span>No pain</span><span>Worst possible</span></div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MusculoskeletalPainAssessmentForm({ patientId, encounterId }) {
  const [basicInfo, setBasicInfo] = useState({ chiefComplaint: '', duration: '', onset: '', distribution: '', character: [], aggravating: [], relieving: [] });
  const [bodyMap, setBodyMap] = useState({ applicable: null, regions: [] });
  const [nrsData, setNrsData] = useState({ applicable: null, worst: '', least: '', average: '', current: '' });
  const [bpiData, setBpiData] = useState({ applicable: null, worst: '', least: '', average: '', current: '', intActivity: '', intMood: '', intWalk: '', intWork: '', intRelations: '', intSleep: '', intEnjoyment: '', relief: '' });
  const [fibromyData, setFibromyData] = useState({ applicable: null, wpiRegions: [], fatigue: '', unrefreshed: '', cognitive: '', somaticSx: '', duration3mo: '', noOtherDisorder: '' });
  const [painType, setPainType] = useState({ applicable: null, nociceptive: '', neuropathic: '', nociplastic: '', central: '', dners: [] });
  const [psychosocial, setPsychosocial] = useState({ applicable: null, depression: '', anxiety: '', catastrophizing: '', kinesophobia: '', sleepDisturbance: '', workStatus: '' });
  const [opioidRisk, setOpioidRisk] = useState({ applicable: null, currentOpioids: '', priorSubstance: '', mentalHealth: '', priorAbuse: '', ort: '' });
  const [diagnosisData, setDiagnosisData] = useState({ applicable: null, primaryDx: '', chronicity: '', icd10: '', notes: '' });
  const [managementData, setManagementData] = useState({ applicable: null, pharmacological: [], nonPharmacological: [], rehabilitation: '', referrals: [], followUp: '', notes: '' });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Fibromyalgia criteria ─────────────────────────────────────────────────────
  const fibromyScore = useMemo(() => {
    if (fibromyData.applicable !== 'yes') return null;
    const wpi = fibromyData.wpiRegions?.length || 0;
    const fatiguePts = parseInt(fibromyData.fatigue) || 0;
    const unrefreshedPts = parseInt(fibromyData.unrefreshed) || 0;
    const cognitivePts = parseInt(fibromyData.cognitive) || 0;
    const ssPts = fatiguePts + unrefreshedPts + cognitivePts + (parseInt(fibromyData.somaticSx) || 0);
    const meetsCriteria = (wpi >= 7 && ssPts >= 5) || (wpi >= 4 && wpi <= 6 && ssPts >= 9);
    const criteriaAlsoMet = fibromyData.duration3mo === 'yes' && fibromyData.noOtherDisorder === 'yes';
    return { wpi, ssPts, meetsCriteria: meetsCriteria && criteriaAlsoMet, wpiThreshold: wpi >= 7 ? 'WPI ≥7 ✓' : wpi >= 4 ? 'WPI 4–6 ✓' : 'WPI <4 ✗' };
  }, [fibromyData]);

  // ── BPI interference mean ─────────────────────────────────────────────────────
  const bpiInterference = useMemo(() => {
    if (bpiData.applicable !== 'yes') return null;
    const vals = ['intActivity','intMood','intWalk','intWork','intRelations','intSleep','intEnjoyment'].map(k => parseInt(bpiData[k]) || null).filter(v => v !== null);
    if (vals.length === 0) return null;
    return (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1);
  }, [bpiData]);

  const toggleBodyRegion = (id) => {
    setBodyMap(p => ({ ...p, regions: p.regions.includes(id) ? p.regions.filter(r => r !== id) : [...p.regions, id] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/assessments', { type: 'musculoskeletal_pain', patientId, encounterId, data: { basicInfo, bodyMap, nrsData, bpiData, bpiInterference, fibromyData, fibromyScore, painType, psychosocial, opioidRisk, diagnosisData, managementData } });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const secCls = 'bg-white rounded-xl border border-rose-100 shadow-sm p-4 mb-4';
  const h2Cls = 'text-sm font-semibold text-rose-800 mb-3 flex items-center gap-2';

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 p-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-600 to-pink-600 rounded-xl p-4 mb-4 text-white shadow">
        <h1 className="text-lg font-bold">Musculoskeletal Pain Assessment</h1>
        <p className="text-rose-100 text-xs mt-0.5">NRS/BPI · Pain Body Map · Fibromyalgia (ACR 2016) · Pain Classification · Psychosocial Screening</p>
      </div>

      {/* Basic Info */}
      <div className={secCls}>
        <h2 className={h2Cls}>📋 Pain History</h2>
        <FL label="Chief Complaint"><Inp value={basicInfo.chiefComplaint} onChange={v => setBasicInfo(p => ({...p, chiefComplaint: v}))} placeholder="e.g. widespread musculoskeletal pain, low back pain, joint pain"/></FL>
        <div className="grid grid-cols-2 gap-2">
          <Pills label="Onset" options={[['acute','Acute (<3m)'],['chronic','Chronic (≥3m)'],['recurrent','Recurrent']]} value={basicInfo.onset} onChange={v => setBasicInfo(p => ({...p, onset: v}))}/>
          <FL label="Duration"><Inp value={basicInfo.duration} onChange={v => setBasicInfo(p => ({...p, duration: v}))} placeholder="months/years"/></FL>
        </div>
        <Pills label="Pain Distribution" options={[['focal','Focal/localised'],['regional','Regional'],['widespread','Widespread (both halves of body)'],['migratory','Migratory']]} value={basicInfo.distribution} onChange={v => setBasicInfo(p => ({...p, distribution: v}))} color="rose"/>
        <Pills label="Pain Character" multi options={[['aching','Aching'],['burning','Burning'],['shooting','Shooting'],['stabbing','Stabbing'],['throbbing','Throbbing'],['electric','Electric/shock-like'],['pressure','Pressure/squeezing'],['numbness','Numbness/tingling']]} value={basicInfo.character} onChange={v => setBasicInfo(p => ({...p, character: v}))} color="pink"/>
        <Pills label="Aggravating Factors" multi options={[['movement','Movement'],['rest','Rest/inactivity'],['cold','Cold'],['stress','Stress/anxiety'],['morning','Morning worse'],['evening','Evening worse'],['weather','Weather change'],['fatigue','Fatigue']]} value={basicInfo.aggravating} onChange={v => setBasicInfo(p => ({...p, aggravating: v}))} color="orange"/>
        <Pills label="Relieving Factors" multi options={[['rest','Rest'],['heat','Heat'],['nsaids','NSAIDs'],['exercise','Gentle exercise'],['sleep','Sleep'],['position','Positioning']]} value={basicInfo.relieving} onChange={v => setBasicInfo(p => ({...p, relieving: v}))} color="green"/>
      </div>

      {/* Pain Body Map */}
      <div className={secCls}>
        <h2 className={h2Cls}>🗺️ Pain Body Map</h2>
        <Gate question="Is pain body map applicable?" value={bodyMap.applicable} onChange={v => setBodyMap(p => ({...p, applicable: v}))}>
          <div className="text-xs text-gray-500 mb-2">Tap/click to mark painful regions (used for WPI count)</div>
          <PainBodyMap selected={bodyMap.regions} onToggle={toggleBodyRegion}/>
          {bodyMap.regions.length > 0 && (
            <div className="mt-2 bg-rose-50 rounded-lg p-2">
              <div className="text-xs font-medium text-rose-700 mb-1">Marked regions ({bodyMap.regions.length}):</div>
              <div className="flex flex-wrap gap-1">
                {bodyMap.regions.map(r => <span key={r} className="text-xs bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full">{r.replace(/_/g, ' ')}</span>)}
              </div>
            </div>
          )}
        </Gate>
      </div>

      {/* NRS Pain Scale */}
      <div className={secCls}>
        <h2 className={h2Cls}>🔢 Numeric Rating Scale (NRS)</h2>
        <Gate question="Is NRS pain assessment applicable?" value={nrsData.applicable} onChange={v => setNrsData(p => ({...p, applicable: v}))}>
          <NRS label="Current pain" value={nrsData.current} onChange={v => setNrsData(p => ({...p, current: v}))}/>
          <NRS label="Worst pain in past 24 hours" value={nrsData.worst} onChange={v => setNrsData(p => ({...p, worst: v}))}/>
          <NRS label="Least pain in past 24 hours" value={nrsData.least} onChange={v => setNrsData(p => ({...p, least: v}))}/>
          <NRS label="Average pain in past week" value={nrsData.average} onChange={v => setNrsData(p => ({...p, average: v}))}/>
          {nrsData.current !== '' && parseInt(nrsData.current) >= 7 && <div className="text-xs text-red-600 font-semibold mt-1">Severe pain (NRS ≥7) — review analgesic adequacy. Consider specialist referral.</div>}
        </Gate>
      </div>

      {/* BPI */}
      <div className={secCls}>
        <h2 className={h2Cls}>📊 Brief Pain Inventory (BPI-SF)</h2>
        <Gate question="Is BPI assessment applicable?" value={bpiData.applicable} onChange={v => setBpiData(p => ({...p, applicable: v}))}>
          {bpiInterference && (
            <div className="bg-rose-50 rounded-lg p-3 mb-3 border border-rose-200">
              <div className="text-xs font-semibold text-rose-700">Pain Interference Score</div>
              <div className={`text-2xl font-bold ${parseFloat(bpiInterference) >= 7 ? 'text-red-600' : parseFloat(bpiInterference) >= 4 ? 'text-orange-500' : 'text-amber-500'}`}>{bpiInterference}<span className="text-sm font-normal text-gray-400">/10</span></div>
            </div>
          )}
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pain Intensity</div>
          <NRS label="Worst pain (past 24h)" value={bpiData.worst} onChange={v => setBpiData(p => ({...p, worst: v}))}/>
          <NRS label="Least pain (past 24h)" value={bpiData.least} onChange={v => setBpiData(p => ({...p, least: v}))}/>
          <NRS label="Average pain" value={bpiData.average} onChange={v => setBpiData(p => ({...p, average: v}))}/>
          <NRS label="Current pain right now" value={bpiData.current} onChange={v => setBpiData(p => ({...p, current: v}))}/>

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-2">Pain Interference (0=no interference, 10=complete)</div>
          {[['intActivity','General activity'],['intMood','Mood'],['intWalk','Walking ability'],['intWork','Normal work'],['intRelations','Relations with others'],['intSleep','Sleep'],['intEnjoyment','Enjoyment of life']].map(([k, lbl]) => (
            <NRS key={k} label={lbl} value={bpiData[k]} onChange={v => setBpiData(p => ({...p, [k]: v}))}/>
          ))}
          <FL label="Pain Relief from treatment in past 24h (%)"><Inp type="number" value={bpiData.relief} onChange={v => setBpiData(p => ({...p, relief: v}))} placeholder="0–100%"/></FL>
        </Gate>
      </div>

      {/* Fibromyalgia */}
      <div className={secCls}>
        <h2 className={h2Cls}>🌡️ Fibromyalgia Screening (ACR 2016 Criteria)</h2>
        <Gate question="Is fibromyalgia assessment applicable?" value={fibromyData.applicable} onChange={v => setFibromyData(p => ({...p, applicable: v}))}>
          {fibromyScore && (
            <div className={`rounded-lg p-3 mb-3 border-2 ${fibromyScore.meetsCriteria ? 'bg-red-50 border-red-400' : 'bg-gray-50 border-gray-300'}`}>
              <div className="flex items-baseline gap-3">
                <span className={`text-lg font-bold ${fibromyScore.meetsCriteria ? 'text-red-700' : 'text-gray-600'}`}>
                  {fibromyScore.meetsCriteria ? 'Fibromyalgia Criteria MET' : 'Criteria NOT met'}
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-1">WPI: {fibromyScore.wpi} ({fibromyScore.wpiThreshold}) · SS Score: {fibromyScore.ssPts}/12</div>
            </div>
          )}
          <div className="text-xs font-semibold text-gray-600 mb-2">Widespread Pain Index (WPI) — past week (tick all painful)</div>
          <Pills multi options={[['jaw_left','L jaw'],['jaw_right','R jaw'],['shoulder_left','L shoulder'],['shoulder_right','R shoulder'],['upper_arm_left','L upper arm'],['upper_arm_right','R upper arm'],['lower_arm_left','L lower arm'],['lower_arm_right','R lower arm'],['hip_left','L hip'],['hip_right','R hip'],['upper_leg_left','L upper leg'],['upper_leg_right','R upper leg'],['lower_leg_left','L lower leg'],['lower_leg_right','R lower leg'],['chest','Chest'],['abdomen','Abdomen'],['neck','Neck'],['upper_back','Upper back'],['lower_back','Lower back']]}
            value={fibromyData.wpiRegions} onChange={v => setFibromyData(p => ({...p, wpiRegions: v}))} color="rose"/>
          <div className="text-xs text-rose-600 font-medium mb-2">WPI count: {fibromyData.wpiRegions?.length || 0}/19</div>

          <div className="text-xs font-semibold text-gray-600 mb-2">Symptom Severity Scale (SS) — rate 0=no problem to 3=severe/pervasive</div>
          {[['fatigue','Fatigue'],['unrefreshed','Waking unrefreshed'],['cognitive','Cognitive symptoms (thinking/memory)']].map(([k, lbl]) => (
            <div key={k} className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600">{lbl}</span>
              <div className="flex gap-1">
                {[0,1,2,3].map(v => (
                  <button key={v} type="button" onClick={() => setFibromyData(p => ({...p, [k]: String(v)}))}
                    className={`w-7 h-6 rounded border text-xs font-medium transition-colors ${fibromyData[k] === String(v) ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-gray-500 border-gray-300'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600">Somatic symptoms (headache, pain, weakness, nausea, etc.)</span>
            <div className="flex gap-1">
              {[[0,'None'],[1,'Few'],[2,'Moderate'],[3,'Many']].map(([v, lbl]) => (
                <button key={v} type="button" onClick={() => setFibromyData(p => ({...p, somaticSx: String(v)}))}
                  className={`px-2 py-0.5 rounded border text-xs transition-colors ${fibromyData.somaticSx === String(v) ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-gray-500 border-gray-300'}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Pills label="Symptoms ≥3 months?" options={[['yes','Yes'],['no','No']]} value={fibromyData.duration3mo} onChange={v => setFibromyData(p => ({...p, duration3mo: v}))} color={fibromyData.duration3mo === 'yes' ? 'green' : 'red'}/>
            <Pills label="No other disorder explains symptoms?" options={[['yes','Yes'],['no','No']]} value={fibromyData.noOtherDisorder} onChange={v => setFibromyData(p => ({...p, noOtherDisorder: v}))} color={fibromyData.noOtherDisorder === 'yes' ? 'green' : 'gray'}/>
          </div>
        </Gate>
      </div>

      {/* Pain Type Classification */}
      <div className={secCls}>
        <h2 className={h2Cls}>🧠 Pain Mechanism Classification</h2>
        <Gate question="Is pain mechanism classification applicable?" value={painType.applicable} onChange={v => setPainType(p => ({...p, applicable: v}))}>
          <Pills label="Dominant Pain Mechanism" options={[['nociceptive','Nociceptive — tissue damage'],['neuropathic','Neuropathic — nerve injury/sensitisation'],['nociplastic','Nociplastic — central sensitisation (no structural cause)'],['mixed','Mixed mechanisms']]} value={painType.nociceptive} onChange={v => setPainType(p => ({...p, nociceptive: v}))} color="rose"/>
          <Pills label="Central Sensitisation Features" multi options={[['allodynia','Allodynia (pain from non-painful stimuli)'],['hyperalgesia','Hyperalgesia (amplified pain)'],['widespread','Widespread distribution'],['fatigue','Fatigue disproportionate to pathology'],['cognitive','Cognitive fog'],['emotional_overlay','Significant emotional overlay']]} value={painType.dners} onChange={v => setPainType(p => ({...p, dners: v}))} color="purple"/>
          {painType.dners?.length >= 3 && <div className="text-xs text-purple-700 font-medium mt-1 bg-purple-50 rounded p-2">Multiple central sensitisation features — consider pain psychology referral + graded activity programme.</div>}
        </Gate>
      </div>

      {/* Psychosocial */}
      <div className={secCls}>
        <h2 className={h2Cls}>🧘 Psychosocial Screening</h2>
        <Gate question="Is psychosocial screening applicable?" value={psychosocial.applicable} onChange={v => setPsychosocial(p => ({...p, applicable: v}))}>
          <div className="grid grid-cols-2 gap-2">
            <Pills label="Depression screen" options={[['low','Low — PHQ-2 negative'],['moderate','Moderate concern'],['high','High — refer']]} value={psychosocial.depression} onChange={v => setPsychosocial(p => ({...p, depression: v}))} color={psychosocial.depression === 'high' ? 'red' : 'rose'}/>
            <Pills label="Anxiety screen" options={[['low','Low'],['moderate','Moderate'],['high','High — refer']]} value={psychosocial.anxiety} onChange={v => setPsychosocial(p => ({...p, anxiety: v}))} color={psychosocial.anxiety === 'high' ? 'red' : 'rose'}/>
            <Pills label="Pain catastrophizing" options={[['low','Low'],['moderate','Moderate (PCS 15–29)'],['high','High (PCS ≥30)']]} value={psychosocial.catastrophizing} onChange={v => setPsychosocial(p => ({...p, catastrophizing: v}))} color={psychosocial.catastrophizing === 'high' ? 'red' : 'orange'}/>
            <Pills label="Kinesiophobia (fear of movement)" options={[['low','Low'],['moderate','Moderate'],['high','High — TSK positive']]} value={psychosocial.kinesophobia} onChange={v => setPsychosocial(p => ({...p, kinesophobia: v}))} color={psychosocial.kinesophobia === 'high' ? 'red' : 'orange'}/>
            <Pills label="Sleep disturbance" options={[['none','None'],['mild','Mild'],['severe','Severe — ISI ≥15']]} value={psychosocial.sleepDisturbance} onChange={v => setPsychosocial(p => ({...p, sleepDisturbance: v}))} color="gray"/>
            <Pills label="Work Status" options={[['working','Working normally'],['modified','Modified duties'],['off_work','Off work due to pain'],['retired','Retired/not working']]} value={psychosocial.workStatus} onChange={v => setPsychosocial(p => ({...p, workStatus: v}))} color="blue"/>
          </div>
          {(psychosocial.depression === 'high' || psychosocial.anxiety === 'high') && <div className="text-xs text-red-600 font-semibold mt-1 bg-red-50 rounded p-2">Significant psychosocial distress — refer to psychologist/liaison psychiatry. Pain management programme may be appropriate.</div>}
        </Gate>
      </div>

      {/* Opioid Risk */}
      <div className={secCls}>
        <h2 className={h2Cls}>⚠️ Opioid Risk Screening</h2>
        <Gate question="Is opioid risk screening applicable?" value={opioidRisk.applicable} onChange={v => setOpioidRisk(p => ({...p, applicable: v}))}>
          <div className="bg-orange-50 rounded-lg p-2 mb-2 text-xs text-orange-700">India context: Opioid access limited outside palliative care. NDPS Act 1985. Morphine available under state palliative care programmes.</div>
          <Pills label="Current Opioid Use" options={[['none','No opioids'],['prn','PRN — intermittent'],['regular','Regular opioids'],['high_dose','High dose (>90 MME/day)']]} value={opioidRisk.currentOpioids} onChange={v => setOpioidRisk(p => ({...p, currentOpioids: v}))} color="orange"/>
          <div className="grid grid-cols-2 gap-2">
            <Pills label="Prior substance misuse Hx" options={[['no','No'],['yes','Yes']]} value={opioidRisk.priorSubstance} onChange={v => setOpioidRisk(p => ({...p, priorSubstance: v}))} color={opioidRisk.priorSubstance === 'yes' ? 'red' : 'gray'}/>
            <Pills label="Mental health history" options={[['no','No'],['yes','Yes']]} value={opioidRisk.mentalHealth} onChange={v => setOpioidRisk(p => ({...p, mentalHealth: v}))} color="gray"/>
          </div>
          <Pills label="ORT (Opioid Risk Tool) score" options={[['low','Low risk (0–3)'],['moderate','Moderate risk (4–7)'],['high','High risk (≥8)']]} value={opioidRisk.ort} onChange={v => setOpioidRisk(p => ({...p, ort: v}))} color={opioidRisk.ort === 'high' ? 'red' : opioidRisk.ort === 'moderate' ? 'orange' : 'green'}/>
          {(opioidRisk.ort === 'high' || opioidRisk.priorSubstance === 'yes') && <div className="text-xs text-red-600 font-semibold mt-1">High opioid risk — avoid long-term opioids. Refer to pain specialist/addictions service.</div>}
        </Gate>
      </div>

      {/* Diagnosis */}
      <div className={secCls}>
        <h2 className={h2Cls}>🩺 Diagnosis</h2>
        <Gate question="Is diagnosis documentation applicable?" value={diagnosisData.applicable} onChange={v => setDiagnosisData(p => ({...p, applicable: v}))}>
          <Pills label="Primary Diagnosis" options={[['fibromyalgia','Fibromyalgia'],['chronic_widespread_pain','Chronic widespread pain'],['myofascial_pain','Myofascial pain syndrome'],['complex_regional',"CRPS (Complex regional pain)"],['chronic_low_back','Chronic low back pain'],['osteoarthritis','OA pain'],['inflammatory_arthritis','Inflammatory arthritis pain'],['central_sensitisation','Central sensitisation syndrome']]} value={diagnosisData.primaryDx} onChange={v => setDiagnosisData(p => ({...p, primaryDx: v}))} color="rose"/>
          <Pills label="Chronicity" options={[['acute','Acute (<3m)'],['subacute','Sub-acute (3–6m)'],['chronic','Chronic (>6m)']]} value={diagnosisData.chronicity} onChange={v => setDiagnosisData(p => ({...p, chronicity: v}))}/>
          <FL label="ICD-10"><Inp value={diagnosisData.icd10} onChange={v => setDiagnosisData(p => ({...p, icd10: v}))} placeholder="M79.7 (fibromyalgia), M54.5 (LBP), etc."/></FL>
          <FL label="Notes"><textarea value={diagnosisData.notes} onChange={e => setDiagnosisData(p => ({...p, notes: e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-rose-400"/></FL>
        </Gate>
      </div>

      {/* Management */}
      <div className={secCls}>
        <h2 className={h2Cls}>💊 Management Plan</h2>
        <Gate question="Is management plan applicable?" value={managementData.applicable} onChange={v => setManagementData(p => ({...p, applicable: v}))}>
          <Pills label="Pharmacological" multi options={[['paracetamol','Paracetamol'],['nsaids','NSAIDs'],['duloxetine','Duloxetine (fibro/neuropathic)'],['amitriptyline','Amitriptyline'],['pregabalin','Pregabalin/gabapentin'],['muscle_relaxant','Muscle relaxants'],['topical_nsaid','Topical NSAIDs'],['tramadol','Tramadol (cautious)']]} value={managementData.pharmacological} onChange={v => setManagementData(p => ({...p, pharmacological: v}))} color="blue"/>
          <Pills label="Non-Pharmacological" multi options={[['aerobic_exercise','Aerobic exercise programme'],['hydrotherapy','Hydrotherapy'],['cbt_pain','CBT for pain'],['mindfulness','Mindfulness/MBSR'],['acupuncture','Acupuncture'],['tens','TENS'],['heat_cold','Heat/cold therapy'],['pacing','Activity pacing']]} value={managementData.nonPharmacological} onChange={v => setManagementData(p => ({...p, nonPharmacological: v}))} color="green"/>
          <Pills label="Referrals" multi options={[['pain_clinic','Pain clinic/specialist'],['psychology','Clinical psychology'],['rheumatology','Rheumatology'],['physiotherapy','Physiotherapy'],['occupational_therapy','Occupational therapy'],['psychiatry','Liaison psychiatry']]} value={managementData.referrals} onChange={v => setManagementData(p => ({...p, referrals: v}))} color="purple"/>
          <FL label="Follow-up"><Inp value={managementData.followUp} onChange={v => setManagementData(p => ({...p, followUp: v}))} placeholder="e.g. 4 weeks, pain clinic referral"/></FL>
          <FL label="Notes"><textarea value={managementData.notes} onChange={e => setManagementData(p => ({...p, notes: e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-rose-400"/></FL>
        </Gate>
      </div>

      {/* Save */}
      <div className="flex justify-end mt-2">
        <button type="button" onClick={handleSave} disabled={saving}
          className="px-6 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold text-sm shadow hover:from-rose-600 hover:to-pink-600 disabled:opacity-60 transition-all">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Assessment'}
        </button>
      </div>
    </div>
  );
}
