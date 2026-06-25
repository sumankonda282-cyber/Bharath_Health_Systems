/**
 * @shared-pool
 * SpineAssessmentForm — portal-agnostic (ortho + neurology + neurosurgery)
 * VAS · ODI · NDI · mJOA (myelopathy) · ASIA · Frankel · AO spine classification
 */

import React, { useState, useMemo } from 'react';
import api from '../../../api/client';

/* ─── Spine Lateral Anatomy SVG ──────────────────────────── */
const SpineAnatomySVG = ({ highlightRegion = null }) => {
  const regionColor = (r) => highlightRegion === r ? '#dc2626' : '#d97706';
  const regionFill  = (r) => highlightRegion === r ? '#fee2e2' : '#fdefd6';
  return (
    <svg viewBox="0 0 220 520" className="w-full h-auto max-h-96" role="img" aria-label="Lateral spine anatomy">
      <rect width="220" height="520" fill="#f8fafc" rx="10"/>
      <text x="110" y="14" textAnchor="middle" fontSize="10" fontWeight="600" fill="#475569">Spine — Lateral View</text>

      {/* ── Cervical C1–C7 ── */}
      <text x="6" y="32" fontSize="9" fontWeight="700" fill={regionColor('cervical')}>CERVICAL</text>
      {[0,1,2,3,4,5,6].map(i => (
        <g key={`c${i}`}>
          <rect x="55" y={28 + i*28} width="70" height="18" rx="4" fill={regionFill('cervical')} stroke={regionColor('cervical')} strokeWidth="1.5"/>
          <text x="90" y={28 + i*28 + 12} textAnchor="middle" fontSize="8" fill="#78350f">C{i+1}</text>
          {/* Disc */}
          {i < 6 && <ellipse cx="90" cy={28 + i*28 + 22} rx="28" ry="5" fill="#bfdbfe" stroke="#3b82f6" strokeWidth="1"/>}
          {/* Spinous process */}
          <line x1="125" y1={28 + i*28 + 9} x2="155" y2={28 + i*28 + 14} stroke={regionColor('cervical')} strokeWidth="1.5"/>
        </g>
      ))}

      {/* ── Thoracic T1–T12 ── */}
      <text x="6" y="234" fontSize="9" fontWeight="700" fill={regionColor('thoracic')}>THORACIC</text>
      {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => (
        <g key={`t${i}`}>
          <rect x="55" y={228 + i*19} width="70" height="13" rx="3" fill={regionFill('thoracic')} stroke={regionColor('thoracic')} strokeWidth="1.2"/>
          <text x="90" y={228 + i*19 + 9} textAnchor="middle" fontSize="7" fill="#78350f">T{i+1}</text>
          {i < 11 && <ellipse cx="90" cy={228 + i*19 + 16} rx="28" ry="3.5" fill="#bfdbfe" stroke="#3b82f6" strokeWidth="0.8"/>}
          <line x1="125" y1={228 + i*19 + 6} x2="158" y2={228 + i*19 + 10} stroke={regionColor('thoracic')} strokeWidth="1"/>
        </g>
      ))}

      {/* ── Lumbar L1–L5 ── */}
      <text x="6" y="462" fontSize="9" fontWeight="700" fill={regionColor('lumbar')}>LUMBAR</text>
      {[0,1,2,3,4].map(i => (
        <g key={`l${i}`}>
          <rect x="52" y={458 + i*24} width="76" height="18" rx="4" fill={regionFill('lumbar')} stroke={regionColor('lumbar')} strokeWidth="1.5"/>
          <text x="90" y={458 + i*24 + 12} textAnchor="middle" fontSize="8" fill="#78350f">L{i+1}</text>
          {i < 4 && <ellipse cx="90" cy={458 + i*24 + 22} rx="30" ry="5" fill="#bfdbfe" stroke="#3b82f6" strokeWidth="1"/>}
          <line x1="128" y1={458 + i*24 + 8} x2="162" y2={458 + i*24 + 4} stroke={regionColor('lumbar')} strokeWidth="1.5"/>
        </g>
      ))}

      {/* Disc label */}
      <line x1="60" y1="55" x2="40" y2="55" stroke="#3b82f6" strokeWidth="1"/>
      <text x="38" y="51" textAnchor="end" fontSize="7.5" fill="#1d4ed8">IVD</text>

      {/* Spinous label */}
      <text x="158" y="38" fontSize="7.5" fill="#92400e">SP</text>

      {/* Sacrum */}
      <path d="M52,578 Q90,575 128,578 Q128,604 90,612 Q52,604 52,578Z" fill="#fdefd6" stroke="#d97706" strokeWidth="1.5"/>
      <text x="90" y="597" textAnchor="middle" fontSize="8" fill="#78350f">Sacrum</text>
    </svg>
  );
};

/* ─── shared UI ──────────────────────────────────────────── */
const Pills = ({ options, value, onChange, multi = false, color = 'blue' }) => {
  const toggle = (v) => {
    if (multi) { const a = Array.isArray(value) ? value : []; onChange(a.includes(v) ? a.filter(x => x !== v) : [...a, v]); }
    else onChange(value === v ? null : v);
  };
  const isActive = (v) => multi ? (Array.isArray(value) && value.includes(v)) : value === v;
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const label = typeof o === 'string' ? o : o.label;
        const val   = typeof o === 'string' ? o : (o.value ?? o.label);
        return (
          <button key={val} type="button" onClick={() => toggle(val)}
            className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${isActive(val)
              ? `bg-${color}-600 text-white border-${color}-600`
              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}`}>
            {label}
          </button>
        );
      })}
    </div>
  );
};

const FL = ({ label, sub, children }) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-gray-700">
      {label}{sub && <span className="ml-1 text-xs text-gray-400 font-normal">{sub}</span>}
    </label>
    {children}
  </div>
);

const Gate = ({ label, value, onChange, children, color = 'blue' }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex gap-2">
        {['Yes', 'No'].map(opt => (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            className={`px-3 py-1 rounded-full border text-sm font-medium transition-all ${value === opt
              ? (opt === 'Yes' ? `bg-${color}-600 text-white border-${color}-600` : 'bg-gray-500 text-white border-gray-500')
              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
    {value === 'Yes' && <div className="pl-4 border-l-2 border-gray-200 space-y-3">{children}</div>}
  </div>
);

const Section = ({ title, applicable, onApplicable, color = 'blue', children }) => {
  if (applicable === 'No') return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-400">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">🔒 Not applicable — section locked</span>
          <button type="button" onClick={() => onApplicable('Yes')} className="px-3 py-1 rounded-full border border-gray-300 text-xs text-gray-500">Reopen</button>
        </div>
      </div>
    </div>
  );
  return (
    <div className={`rounded-xl border border-${color}-100 bg-${color}-50/30 p-5 space-y-4`}>
      <div className="flex items-center justify-between">
        <h3 className={`font-semibold text-${color}-900`}>{title}</h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Applicable?</span>
          {['Yes', 'No'].map(opt => (
            <button key={opt} type="button" onClick={() => onApplicable(opt)}
              className={`px-2.5 py-0.5 rounded-full border text-xs font-medium transition-all ${applicable === opt
                ? (opt === 'Yes' ? `bg-${color}-600 text-white border-${color}-600` : 'bg-gray-400 text-white border-gray-400')
                : 'bg-white text-gray-500 border-gray-300'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      {applicable === 'Yes' && <div className="space-y-4">{children}</div>}
    </div>
  );
};

/* ─── mJOA row ───────────────────────────────────────────── */
const ScoreRow = ({ label, options, value, onChange, color = 'teal' }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
    <span className="text-xs text-gray-600 w-48 shrink-0">{label}</span>
    <div className="flex flex-wrap gap-1.5">
      {options.map(([text, score]) => (
        <button key={score} type="button" onClick={() => onChange(value === score ? null : score)}
          className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${value === score
            ? `bg-${color}-600 text-white border-${color}-600`
            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
          {text} <span className="opacity-60">({score})</span>
        </button>
      ))}
    </div>
  </div>
);

/* ─── ASIA dermatome map ─────────────────────────────────── */
const ASIA_LEVELS = ['C2','C3','C4','C5','C6','C7','C8','T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12','L1','L2','L3','L4','L5','S1','S2','S3','S4-5'];

/* ─── main form ─────────────────────────────────────────────── */
export default function SpineAssessmentForm({ patientId, encounterId, onSave }) {
  const [saving, setSaving] = useState(false);

  /* Section gates */
  const [appPresent,   setAppPresent]   = useState(null);
  const [appHistory,   setAppHistory]   = useState(null);
  const [appExam,      setAppExam]      = useState(null);
  const [appNeuro,     setAppNeuro]     = useState(null);
  const [appImaging,   setAppImaging]   = useState(null);
  const [appScoring,   setAppScoring]   = useState(null);
  const [appManage,    setAppManage]    = useState(null);

  /* ── Presentation ── */
  const [region,         setRegion]         = useState(null);  /* cervical/thoracic/lumbar/sacral */
  const [diagnosis,      setDiagnosis]      = useState([]);
  const [onset,          setOnset]          = useState(null);
  const [mechanism,      setMechanism]      = useState(null);
  const [vasRest,        setVasRest]        = useState('');
  const [vasActivity,    setVasActivity]    = useState('');

  /* ── History ── */
  const [painCharacter,  setPainCharacter]  = useState([]);
  const [radiation,      setRadiation]      = useState(null);
  const [radiationPattern, setRadiationPattern] = useState([]);
  const [aggravatingFactors, setAggravatingFactors] = useState([]);
  const [relievingFactors, setRelievingFactors] = useState([]);
  const [redFlags,       setRedFlags]       = useState([]);
  const [bladderBowel,   setBladderBowel]   = useState(null);  /* cauda equina */
  const [saddleAnesthesia, setSaddleAnesthesia] = useState(null);
  const [previousTreatment, setPreviousTreatment] = useState([]);
  const [previousSurgery, setPreviousSurgery] = useState(null);
  const [previousSurgeryType, setPreviousSurgeryType] = useState([]);
  const [injections,     setInjections]     = useState([]);
  const [occupation,     setOccupation]     = useState(null);
  const [walkingDistance, setWalkingDistance] = useState(null);

  /* ── Physical Examination ── */
  const [posture,        setPosture]        = useState([]);
  const [spasm,          setSpasm]          = useState(null);
  const [tenderness,     setTenderness]     = useState([]);
  const [romCervFlex,    setRomCervFlex]    = useState('');
  const [romCervExt,     setRomCervExt]     = useState('');
  const [romCervLat,     setRomCervLat]     = useState('');
  const [romCervRot,     setRomCervRot]     = useState('');
  const [romLumFlex,     setRomLumFlex]     = useState('');  /* Schober test cm */
  const [romLumExt,      setRomLumExt]      = useState('');
  const [romLumLat,      setRomLumLat]      = useState('');
  const [slr,            setSlr]            = useState(null); /* SLR angle */
  const [slrAngle,       setSlrAngle]       = useState('');
  const [crossedSlr,     setCrossedSlr]     = useState(null);
  const [femStretch,     setFemStretch]     = useState(null);  /* femoral stretch test (L2-4) */
  const [spurling,       setSpurling]       = useState(null);
  const [distraction,    setDistraction]    = useState(null);
  const [lhermitte,      setLhermitte]      = useState(null);  /* myelopathy sign */
  const [hoffmann,       setHoffmann]       = useState(null);
  const [babinski,       setBabinski]       = useState(null);
  const [clonus,         setClonus]         = useState(null);

  /* ── Neurological ── */
  const [myelopathySigns, setMyelopathySigns] = useState([]);
  const [dermatomePain,  setDermatomePain]  = useState([]);
  const [myotomeWeakness, setMyotomeWeakness] = useState([]);
  const [reflexes,       setReflexes]       = useState({});  /* biceps/triceps/brachiorad/knee/ankle */
  const [asiaSensoryLevel, setAsiaSensoryLevel] = useState(null);
  const [asiaMotorLevel, setAsiaMotorLevel] = useState(null);
  const [asiaGrade,      setAsiaGrade]      = useState(null);
  const [caudaEquina,    setCaudaEquina]     = useState(null); /* full cauda equina syndrome */

  /* ── mJOA (modified Japanese Orthopaedic Association) ── */
  const [mjoaUE,         setMjoaUE]         = useState(null);  /* upper extremity motor */
  const [mjoaLE,         setMjoaLE]         = useState(null);  /* lower extremity motor */
  const [mjoaSensUE,     setMjoaSensUE]     = useState(null);  /* sensation UE */
  const [mjoaSensTrunk,  setMjoaSensTrunk]  = useState(null);  /* sensation trunk/LE */
  const [mjoaBladder,    setMjoaBladder]    = useState(null);  /* bladder */

  /* ── ODI (Oswestry Disability Index) — 10 items 0–5 ── */
  const ODI_ITEMS = [
    { key: 'odi_pain',      label: 'Pain intensity' },
    { key: 'odi_personal',  label: 'Personal care (washing, dressing)' },
    { key: 'odi_lifting',   label: 'Lifting' },
    { key: 'odi_walking',   label: 'Walking' },
    { key: 'odi_sitting',   label: 'Sitting' },
    { key: 'odi_standing',  label: 'Standing' },
    { key: 'odi_sleeping',  label: 'Sleeping' },
    { key: 'odi_sex',       label: 'Sex life' },
    { key: 'odi_social',    label: 'Social life' },
    { key: 'odi_travel',    label: 'Travelling' },
  ];
  const [odiScores, setOdiScores] = useState(() => Object.fromEntries(ODI_ITEMS.map(i => [i.key, null])));

  /* ── NDI (Neck Disability Index) — 10 items 0–5 ── */
  const NDI_ITEMS = [
    { key: 'ndi_pain',      label: 'Pain intensity' },
    { key: 'ndi_personal',  label: 'Personal care' },
    { key: 'ndi_lifting',   label: 'Lifting' },
    { key: 'ndi_reading',   label: 'Reading' },
    { key: 'ndi_headache',  label: 'Headaches' },
    { key: 'ndi_concentration', label: 'Concentration' },
    { key: 'ndi_work',      label: 'Work' },
    { key: 'ndi_driving',   label: 'Driving' },
    { key: 'ndi_sleeping',  label: 'Sleeping' },
    { key: 'ndi_recreation', label: 'Recreation' },
  ];
  const [ndiScores, setNdiScores] = useState(() => Object.fromEntries(NDI_ITEMS.map(i => [i.key, null])));

  /* ── Imaging ── */
  const [xrayDone,       setXrayDone]       = useState(null);
  const [xrayFindings,   setXrayFindings]   = useState([]);
  const [disc,           setDisc]           = useState(null); /* disc height */
  const [osteophytes,    setOsteophytes]    = useState(null);
  const [spondylosis,    setSpondylosis]    = useState(null);
  const [spondylolisthesis, setSpondylolisthesis] = useState(null);
  const [spondyloGrade,  setSpondyloGrade]  = useState(null);
  const [mriDone,        setMriDone]        = useState(null);
  const [mriLevel,       setMriLevel]       = useState([]);
  const [mriDisc,        setMriDisc]        = useState([]);
  const [mriCanalStenosis, setMriCanalStenosis] = useState(null);
  const [mriForaminalStenosis, setMriForaminalStenosis] = useState(null);
  const [mriCordSignal,  setMriCordSignal]  = useState(null);
  const [mriCordCompression, setMriCordCompression] = useState(null);
  const [pfirrmann,      setPfirrmann]      = useState(null); /* disc degeneration grade I-V */
  const [ctDone,         setCtDone]         = useState(null);
  const [ctFindings,     setCtFindings]     = useState([]);

  /* ── Management ── */
  const [conservative,   setConservative]   = useState([]);
  const [physioPlan,     setPhysioPlan]     = useState([]);
  const [injectionPlan,  setInjectionPlan]  = useState([]);
  const [surgical,       setSurgical]       = useState(null);
  const [surgicalPlan,   setSurgicalPlan]   = useState([]);
  const [urgency,        setUrgency]        = useState(null);
  const [followUp,       setFollowUp]       = useState(null);

  /* ─── computed: ODI ──────────────────────────────────────── */
  const odiTotal = useMemo(() => {
    const vals = Object.values(odiScores);
    if (vals.some(v => v === null)) return null;
    return Math.round((vals.reduce((s, v) => s + v, 0) / 50) * 100);
  }, [odiScores]);

  const odiInterp = useMemo(() => {
    if (odiTotal === null) return null;
    if (odiTotal <= 20) return { label: 'Minimal disability (0–20%)', color: 'bg-green-100 border-green-400 text-green-800' };
    if (odiTotal <= 40) return { label: 'Moderate disability (21–40%)', color: 'bg-yellow-100 border-yellow-400 text-yellow-800' };
    if (odiTotal <= 60) return { label: 'Severe disability (41–60%)', color: 'bg-orange-100 border-orange-400 text-orange-800' };
    if (odiTotal <= 80) return { label: 'Crippled (61–80%) — surgery consideration', color: 'bg-red-100 border-red-400 text-red-800' };
    return { label: 'Bed-bound (81–100%) — urgent surgical review', color: 'bg-red-200 border-red-600 text-red-900 animate-pulse' };
  }, [odiTotal]);

  /* ─── computed: NDI ──────────────────────────────────────── */
  const ndiTotal = useMemo(() => {
    const vals = Object.values(ndiScores);
    if (vals.some(v => v === null)) return null;
    return Math.round((vals.reduce((s, v) => s + v, 0) / 50) * 100);
  }, [ndiScores]);

  const ndiInterp = useMemo(() => {
    if (ndiTotal === null) return null;
    if (ndiTotal <= 8)  return { label: 'No disability (0–8%)', color: 'bg-green-100 border-green-400 text-green-800' };
    if (ndiTotal <= 28) return { label: 'Mild disability (9–28%)', color: 'bg-yellow-100 border-yellow-400 text-yellow-800' };
    if (ndiTotal <= 48) return { label: 'Moderate disability (29–48%)', color: 'bg-orange-100 border-orange-400 text-orange-800' };
    if (ndiTotal <= 64) return { label: 'Severe disability (49–64%)', color: 'bg-red-100 border-red-400 text-red-800' };
    return { label: 'Complete disability (65–100%)', color: 'bg-red-200 border-red-600 text-red-900' };
  }, [ndiTotal]);

  /* ─── computed: mJOA total ───────────────────────────────── */
  const mjoaTotal = useMemo(() => {
    const vals = [mjoaUE, mjoaLE, mjoaSensUE, mjoaSensTrunk, mjoaBladder];
    if (vals.some(v => v === null)) return null;
    return vals.reduce((s, v) => s + v, 0);
  }, [mjoaUE, mjoaLE, mjoaSensUE, mjoaSensTrunk, mjoaBladder]);

  const mjoaInterp = useMemo(() => {
    if (mjoaTotal === null) return null;
    if (mjoaTotal >= 15) return { label: 'Mild myelopathy (15–17)', color: 'bg-yellow-100 border-yellow-400 text-yellow-800' };
    if (mjoaTotal >= 12) return { label: 'Moderate myelopathy (12–14) — surgical review', color: 'bg-orange-100 border-orange-400 text-orange-800' };
    return { label: `Severe myelopathy (≤11) — surgery indicated`, color: 'bg-red-100 border-red-400 text-red-800 animate-pulse' };
  }, [mjoaTotal]);

  /* ─── computed: red flags ────────────────────────────────── */
  const criticalRedFlags = useMemo(() => {
    const flags = [];
    if (bladderBowel === 'Yes' || saddleAnesthesia === 'Yes' || caudaEquina === 'Yes') flags.push('CAUDA EQUINA SYNDROME — Emergency surgical decompression');
    if (redFlags.includes('Night pain (not postural)')) flags.push('Night pain — exclude malignancy/infection');
    if (redFlags.includes('Unexplained weight loss')) flags.push('Weight loss + back pain — malignancy screen');
    if (redFlags.includes('Fever / systemic upset')) flags.push('Fever — discitis/osteomyelitis/epidural abscess');
    if (redFlags.includes('History of cancer')) flags.push('Cancer history — spinal metastasis');
    if (redFlags.includes('Trauma / high-energy mechanism')) flags.push('Trauma — fracture until proved otherwise');
    if (mriCordCompression === 'Yes' && myelopathySigns.length > 0) flags.push('Cord compression with myelopathy signs — urgent decompression');
    return flags;
  }, [bladderBowel, saddleAnesthesia, caudaEquina, redFlags, mriCordCompression, myelopathySigns]);

  /* ─── save ────────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/assessments', {
        type: 'spine', patientId, encounterId,
        presentation: { region, diagnosis, onset, mechanism, vasRest, vasActivity },
        history: { painCharacter, radiation, radiationPattern, aggravatingFactors, relievingFactors, redFlags, bladderBowel, saddleAnesthesia, previousTreatment, previousSurgery, previousSurgeryType, injections, occupation, walkingDistance },
        exam: { posture, spasm, tenderness, rom: { cervFlex: romCervFlex, cervExt: romCervExt, cervLat: romCervLat, cervRot: romCervRot, lumFlex: romLumFlex, lumExt: romLumExt, lumLat: romLumLat }, slr, slrAngle, crossedSlr, femStretch, spurling, distraction, lhermitte, hoffmann, babinski, clonus },
        neurological: { myelopathySigns, dermatomePain, myotomeWeakness, reflexes, asiaSensoryLevel, asiaMotorLevel, asiaGrade, caudaEquina },
        imaging: { xrayDone, xrayFindings, disc, osteophytes, spondylosis, spondylolisthesis, spondyloGrade, mriDone, mriLevel, mriDisc, mriCanalStenosis, mriForaminalStenosis, mriCordSignal, mriCordCompression, pfirrmann, ctDone, ctFindings },
        scoring: { odiScores, odiTotal, odiInterp: odiInterp?.label, ndiScores, ndiTotal, ndiInterp: ndiInterp?.label, mjoaTotal, mjoaInterp: mjoaInterp?.label },
        management: { conservative, physioPlan, injectionPlan, surgical, surgicalPlan, urgency, followUp },
        computed: { criticalRedFlags },
      });
      onSave?.();
    } finally { setSaving(false); }
  };

  const isEmergency = criticalRedFlags.some(f => f.includes('CAUDA EQUINA') || f.includes('Emergency'));

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-10">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-700 to-gray-900 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-1">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
          </svg>
          <h2 className="text-xl font-bold">Spine Assessment</h2>
        </div>
        <p className="text-sm text-gray-400 mb-3">Ortho · Neurology · Neurosurgery · ODI · NDI · mJOA · ASIA</p>
        {isEmergency && (
          <div className="bg-red-600 rounded-lg px-4 py-2 text-sm font-bold animate-pulse mb-2">
            🚨 EMERGENCY — {criticalRedFlags[0]}
          </div>
        )}
        {criticalRedFlags.filter(f => !f.includes('Emergency')).map(f => (
          <div key={f} className="bg-orange-500/30 rounded-lg px-3 py-1.5 text-xs font-semibold text-orange-200 mb-1">⚠ {f}</div>
        ))}
        <div className="flex flex-wrap gap-2 mt-2">
          {odiInterp && <span className={`rounded-lg px-3 py-1 text-xs font-semibold border ${odiInterp.color}`}>ODI {odiTotal}% — {odiInterp.label.split(' (')[0]}</span>}
          {ndiInterp && <span className={`rounded-lg px-3 py-1 text-xs font-semibold border ${ndiInterp.color}`}>NDI {ndiTotal}% — {ndiInterp.label.split(' (')[0]}</span>}
          {mjoaInterp && <span className={`rounded-lg px-3 py-1 text-xs font-semibold border ${mjoaInterp.color}`}>mJOA {mjoaTotal}/17 — {mjoaInterp.label.split(' (')[0]}</span>}
        </div>
      </div>

      {/* Section 1 — Presentation + SVG */}
      <Section title="1. Presentation" applicable={appPresent} onApplicable={setAppPresent} color="slate">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <FL label="Region affected">
              <Pills options={['Cervical (neck)','Cervicothoracic junction','Thoracic','Thoracolumbar junction','Lumbar','Lumbosacral','Sacral / coccyx','Multi-level']} value={region} onChange={setRegion} color="slate" />
            </FL>
            <FL label="Primary diagnosis / working impression" sub="multi-select">
              <Pills options={['Disc prolapse / herniation (PIVD)','Disc degeneration','Spinal canal stenosis','Foraminal stenosis','Cervical spondylosis','Cervical myelopathy','Lumbar spondylosis','Spondylolisthesis','Spondylolysis','Facet joint arthropathy','Ligamentum flavum hypertrophy','OPLL (ossified posterior longitudinal ligament)','Fracture (trauma)','Compression fracture (osteoporotic)','Malignancy / metastasis','Infection (discitis/OM/epidural abscess)','Ankylosing spondylitis','Non-specific low back pain','Sciatica','Cervicogenic headache']} value={diagnosis} onChange={setDiagnosis} multi color="slate" />
            </FL>
            <FL label="Onset">
              <Pills options={['Acute (<48 h)','Subacute (days–weeks)','Chronic (>3 months)','Acute on chronic']} value={onset} onChange={setOnset} color="slate" />
            </FL>
            <FL label="Mechanism">
              <Pills options={['Gradual (degenerative)','Lifting/bending','Twisting','Road traffic accident','Fall','Post-surgical','Spontaneous / unknown']} value={mechanism} onChange={setMechanism} color="slate" />
            </FL>
            <div className="grid grid-cols-2 gap-2">
              <FL label="VAS rest" sub="0–10"><input type="number" min="0" max="10" value={vasRest} onChange={e => setVasRest(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-400" placeholder="0–10"/></FL>
              <FL label="VAS activity" sub="0–10"><input type="number" min="0" max="10" value={vasActivity} onChange={e => setVasActivity(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-400" placeholder="0–10"/></FL>
            </div>
          </div>
          <div className="bg-white rounded-xl p-2 border border-slate-100 shadow-sm flex items-center justify-center">
            <SpineAnatomySVG highlightRegion={
              region?.includes('Cervical') ? 'cervical' :
              region?.includes('Thoracic') ? 'thoracic' :
              region?.includes('Lumbar') || region?.includes('Lumbosacral') ? 'lumbar' : null
            } />
          </div>
        </div>
      </Section>

      {/* Section 2 — History */}
      <Section title="2. History & Symptom Characterisation" applicable={appHistory} onApplicable={setAppHistory} color="gray">
        <FL label="Pain character" sub="multi-select">
          <Pills options={['Axial (local spine)','Radicular (shooting/burning down limb)','Referred (dull/aching into buttock/thigh)','Neuropathic (burning/electric)','Mechanical (worse with activity)','Non-mechanical (worse at rest/night)','Band-like (thoracic myelopathy)']} value={painCharacter} onChange={setPainCharacter} multi color="gray" />
        </FL>
        <FL label="Radiation">
          <Pills options={['None','Into arm/hand (cervical)','Into chest/abdomen (thoracic)','Into buttock only','Into thigh (L2–L3)','Into knee (L3–L4)','Into shin/dorsum foot (L4–L5)','Into sole/lateral foot (L5–S1)','Bilateral legs']} value={radiation} onChange={setRadiation} color="gray" />
        </FL>
        <FL label="Aggravating factors" sub="multi-select">
          <Pills options={['Sitting','Standing','Walking','Bending forward','Bending backward (extension)','Coughing/sneezing/Valsalva','Lying flat','Morning (inflammatory)','End of day']} value={aggravatingFactors} onChange={setAggravatingFactors} multi color="gray" />
        </FL>
        <FL label="Relieving factors" sub="multi-select">
          <Pills options={['Rest','Lying down','Walking (spinal stenosis — worse with walking)','Leaning forward (neurogenic claudication)','NSAIDs','Heat/ice','Physiotherapy','Positional']} value={relievingFactors} onChange={setRelievingFactors} multi color="gray" />
        </FL>
        <FL label="🚩 Red flags" sub="multi-select — screen all patients">
          <Pills options={['Night pain (not postural)','Unexplained weight loss','Fever / systemic upset','History of cancer','Bladder/bowel dysfunction','Saddle anaesthesia','Bilateral leg symptoms','Trauma / high-energy mechanism','Age <20 or >55 (first episode)','Thoracic pain','Immunosuppression / IV drug use','Prolonged steroid use (osteoporosis)']} value={redFlags} onChange={setRedFlags} multi color="red" />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Bladder/bowel dysfunction?">
            <Pills options={['Yes','No']} value={bladderBowel} onChange={setBladderBowel} color="red" />
          </FL>
          <FL label="Saddle anaesthesia?">
            <Pills options={['Yes','No']} value={saddleAnesthesia} onChange={setSaddleAnesthesia} color="red" />
          </FL>
        </div>
        {(bladderBowel === 'Yes' || saddleAnesthesia === 'Yes') && (
          <div className="rounded-lg bg-red-50 border-2 border-red-500 px-4 py-3 animate-pulse">
            <p className="text-sm text-red-700 font-bold">🚨 CAUDA EQUINA SYNDROME — Emergency MRI + surgical consult STAT</p>
          </div>
        )}
        <FL label="Walking distance before symptoms">
          <Pills options={['Unlimited','1 km+','500 m (neurogenic claudication)','100–500 m','<100 m','Cannot walk']} value={walkingDistance} onChange={setWalkingDistance} color="gray" />
        </FL>
        <FL label="Previous treatment" sub="multi-select">
          <Pills options={['None','Physiotherapy','NSAIDs','Gabapentin/Pregabalin','Muscle relaxants','Opioids','Epidural steroid injection','Facet joint injection','TENS','Traction','Bed rest','Collar/brace']} value={previousTreatment} onChange={setPreviousTreatment} multi color="gray" />
        </FL>
        <Gate label="Previous spine surgery?" value={previousSurgery} onChange={setPreviousSurgery} color="gray">
          <FL label="Surgery type" sub="multi-select">
            <Pills options={['Discectomy (microdiscectomy)','Laminectomy','Laminotomy','Foraminotomy','ACDF (anterior cervical discectomy & fusion)','PLIF/TLIF/XLIF (lumbar interbody fusion)','Pedicle screw fixation','Vertebroplasty/kyphoplasty','Spinal cord stimulator','Total disc replacement']} value={previousSurgeryType} onChange={setPreviousSurgeryType} multi color="gray" />
          </FL>
        </Gate>
        <FL label="Previous spinal injections" sub="multi-select">
          <Pills options={['None','Epidural steroid (lumbar)','Epidural steroid (cervical)','Facet joint injection','Medial branch block','Trigger point injection','PRP']} value={injections} onChange={setInjections} multi color="gray" />
        </FL>
        <FL label="Occupation / activity">
          <Pills options={['Sedentary (desk)','Light manual','Heavy manual labour','Driver','Retired / homemaker','Student']} value={occupation} onChange={setOccupation} color="gray" />
        </FL>
      </Section>

      {/* Section 3 — Physical Examination */}
      <Section title="3. Physical Examination" applicable={appExam} onApplicable={setAppExam} color="blue">
        <FL label="Posture / deformity" sub="multi-select">
          <Pills options={['Normal','Scoliosis','Kyphosis (thoracic)','Hyperlordosis (lumbar)','Flat back','Lateral lean / list','Forward head posture']} value={posture} onChange={setPosture} multi color="blue" />
        </FL>
        <FL label="Paravertebral muscle spasm">
          <Pills options={['None','Mild (unilateral)','Moderate (bilateral)','Severe']} value={spasm} onChange={setSpasm} color="blue" />
        </FL>
        <FL label="Tenderness on palpation" sub="multi-select">
          <Pills options={['Spinous processes (midline)','Paravertebral muscles','Facet joints','Sacroiliac joint','Sciatic notch','Piriformis','Greater trochanter']} value={tenderness} onChange={setTenderness} multi color="blue" />
        </FL>

        {/* Cervical ROM */}
        {(region?.includes('Cervical') || !region) && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Cervical ROM (normal: flex 50°, ext 60°, lat 45°, rot 80°)</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <FL label="Flexion" sub="°"><input type="number" value={romCervFlex} onChange={e => setRomCervFlex(e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400" placeholder="50°"/></FL>
              <FL label="Extension" sub="°"><input type="number" value={romCervExt} onChange={e => setRomCervExt(e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400" placeholder="60°"/></FL>
              <FL label="Lateral flex" sub="°"><input type="number" value={romCervLat} onChange={e => setRomCervLat(e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400" placeholder="45°"/></FL>
              <FL label="Rotation" sub="°"><input type="number" value={romCervRot} onChange={e => setRomCervRot(e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400" placeholder="80°"/></FL>
            </div>
          </div>
        )}

        {/* Lumbar ROM */}
        {(region?.includes('Lumbar') || region?.includes('Lumbosacral') || !region) && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Lumbar ROM — Schober test: add 5 cm (normal ≥5 cm mark); Finger-to-floor distance</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <FL label="Flexion / Schober" sub="cm"><input type="number" step="0.5" value={romLumFlex} onChange={e => setRomLumFlex(e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400" placeholder="e.g. 6"/></FL>
              <FL label="Extension" sub="°"><input type="number" value={romLumExt} onChange={e => setRomLumExt(e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400" placeholder="25°"/></FL>
              <FL label="Lateral flexion" sub="°"><input type="number" value={romLumLat} onChange={e => setRomLumLat(e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400" placeholder="25°"/></FL>
            </div>
          </div>
        )}

        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Nerve tension tests</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <FL label="SLR (lumbar L4–S1)">
            <Pills options={['Positive','Negative','Not done']} value={slr} onChange={setSlr} color="blue" />
          </FL>
          {slr === 'Positive' && (
            <FL label="SLR angle" sub="°">
              <input type="number" value={slrAngle} onChange={e => setSlrAngle(e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400" placeholder="e.g. 40°"/>
            </FL>
          )}
          <FL label="Crossed SLR (contralateral)">
            <Pills options={['Positive','Negative','Not done']} value={crossedSlr} onChange={setCrossedSlr} color="blue" />
          </FL>
          <FL label="Femoral stretch test (L2–L4)">
            <Pills options={['Positive','Negative','Not done']} value={femStretch} onChange={setFemStretch} color="blue" />
          </FL>
          <FL label="Spurling's test (cervical)">
            <Pills options={['Positive','Negative','Not done']} value={spurling} onChange={setSpurling} color="blue" />
          </FL>
          <FL label="Cervical distraction">
            <Pills options={['Relieves pain (positive)','No change','Not done']} value={distraction} onChange={setDistraction} color="blue" />
          </FL>
        </div>
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Upper motor neuron / myelopathy signs</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FL label="Lhermitte's sign">
            <Pills options={['Positive','Negative']} value={lhermitte} onChange={setLhermitte} color="blue" />
          </FL>
          <FL label="Hoffmann's sign">
            <Pills options={['Positive','Negative']} value={hoffmann} onChange={setHoffmann} color="blue" />
          </FL>
          <FL label="Babinski sign">
            <Pills options={['Positive (upgoing)','Negative','Equivocal']} value={babinski} onChange={setBabinski} color="blue" />
          </FL>
          <FL label="Clonus">
            <Pills options={['Present (sustained)','Present (unsustained)','Absent']} value={clonus} onChange={setClonus} color="blue" />
          </FL>
        </div>
      </Section>

      {/* Section 4 — Neurological */}
      <Section title="4. Neurological Assessment" applicable={appNeuro} onApplicable={setAppNeuro} color="violet">
        <FL label="Myelopathy signs" sub="multi-select">
          <Pills options={['Spastic gait','Hand clumsiness / wasting','Tandem gait impaired','Wide-based gait','Positive Romberg','Hyperreflexia','Bowel/bladder dysfunction (myelopathy)','Hand intrinsic wasting']} value={myelopathySigns} onChange={setMyelopathySigns} multi color="violet" />
        </FL>
        <FL label="Dermatomal pain / sensory loss" sub="multi-select">
          <Pills options={['C5 — Lateral arm','C6 — Lateral forearm, thumb, index','C7 — Middle finger, triceps area','C8 — Medial forearm, ring/little finger','T1 — Medial arm','L1 — Groin','L2 — Anterior thigh','L3 — Medial thigh/knee','L4 — Medial shin/foot, big toe','L5 — Lateral shin, dorsum foot, big toe','S1 — Lateral/plantar foot, little toe','S2–S4 — Perineum/saddle','Bilateral — cauda equina']} value={dermatomePain} onChange={setDermatomePain} multi color="violet" />
        </FL>
        <FL label="Myotomal weakness" sub="multi-select">
          <Pills options={['C5 — Deltoid, elbow flexors','C6 — Wrist extensors, biceps','C7 — Elbow/wrist extensors, triceps','C8 — Finger flexors, intrinsics','T1 — Intrinsics (interossei)','L2 — Hip flexors','L3 — Knee extensors (quads)','L4 — Ankle dorsiflexors (foot drop)','L5 — EHL (big toe extension), peronei','S1 — Ankle plantarflexors, hip abductors']} value={myotomeWeakness} onChange={setMyotomeWeakness} multi color="violet" />
        </FL>
        <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Deep tendon reflexes</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[['Biceps (C5–C6)','biceps'],['Triceps (C7)','triceps'],['Knee (L3–L4)','knee'],['Ankle (S1)','ankle']].map(([label, key]) => (
            <FL key={key} label={label}>
              <Pills options={['0 — Absent','1+ — Diminished','2+ — Normal','3+ — Hyperreflexic','4+ — Clonus']} value={reflexes[key] ?? null} onChange={v => setReflexes(r => ({ ...r, [key]: v }))} color="violet" />
            </FL>
          ))}
        </div>
        <Gate label="Spinal cord injury (ASIA classification)?" value={caudaEquina === null ? null : 'No'} onChange={() => {}} color="violet">
          <></>
        </Gate>
        <div className="grid grid-cols-2 gap-3">
          <FL label="ASIA sensory level">
            <Pills options={ASIA_LEVELS} value={asiaSensoryLevel} onChange={setAsiaSensoryLevel} color="violet" />
          </FL>
          <FL label="ASIA motor level">
            <Pills options={ASIA_LEVELS} value={asiaMotorLevel} onChange={setAsiaMotorLevel} color="violet" />
          </FL>
        </div>
        <FL label="ASIA impairment grade">
          <Pills options={['A — Complete (no motor/sensory S4–S5)','B — Sensory only below level','C — Motor preserved, >half muscles grade <3','D — Motor preserved, >half muscles grade ≥3','E — Normal']} value={asiaGrade} onChange={setAsiaGrade} color="violet" />
        </FL>
        <FL label="Cauda equina syndrome">
          <Pills options={['Complete CES (retention)','Incomplete CES','Suspected — evolving','No CES']} value={caudaEquina} onChange={setCaudaEquina} color="violet" />
        </FL>
        {(caudaEquina && caudaEquina !== 'No CES') && (
          <div className="rounded-lg bg-red-50 border-2 border-red-500 px-4 py-3 animate-pulse">
            <p className="text-sm text-red-700 font-bold">🚨 CES — Emergency decompression within 24–48 h. MRI STAT. Urology + neurosurgery consult.</p>
          </div>
        )}
      </Section>

      {/* Section 5 — Imaging */}
      <Section title="5. Investigations & Imaging" applicable={appImaging} onApplicable={setAppImaging} color="sky">
        <Gate label="X-ray done?" value={xrayDone} onChange={setXrayDone} color="sky">
          <FL label="X-ray findings" sub="multi-select">
            <Pills options={['Normal','Disc space narrowing','Osteophytes (spondylosis)','Reduced lordosis (cervical)','Loss of lumbar lordosis','Scoliosis','Spondylolisthesis','Compression fracture','Endplate changes','OPLL','Bamboo spine (AS)','Transitional vertebra']} value={xrayFindings} onChange={setXrayFindings} multi color="sky" />
          </FL>
          <FL label="Spondylolisthesis grade (Meyerding)">
            <Pills options={['Grade I (<25%)','Grade II (25–50%)','Grade III (50–75%)','Grade IV (>75%)','Grade V — spondyloptosis']} value={spondyloGrade} onChange={setSpondyloGrade} color="sky" />
          </FL>
        </Gate>
        <Gate label="MRI done?" value={mriDone} onChange={setMriDone} color="sky">
          <FL label="Level(s) affected" sub="multi-select">
            <Pills options={['C3–C4','C4–C5','C5–C6','C6–C7','C7–T1','T10–T11','T11–T12','T12–L1','L1–L2','L2–L3','L3–L4','L4–L5','L5–S1','Multiple']} value={mriLevel} onChange={setMriLevel} multi color="sky" />
          </FL>
          <FL label="Disc pathology" sub="multi-select">
            <Pills options={['Bulge (diffuse)','Protrusion','Extrusion','Sequestered fragment','Annular tear','Disc desiccation','Vacuum disc phenomenon']} value={mriDisc} onChange={setMriDisc} multi color="sky" />
          </FL>
          <FL label="Pfirrmann disc degeneration grade">
            <Pills options={['Grade I — Bright white, normal','Grade II — White, clear nucleus/annulus','Grade III — Grey, unclear boundary','Grade IV — Grey-black, no distinction','Grade V — Black, collapsed']} value={pfirrmann} onChange={setPfirrmann} color="sky" />
          </FL>
          <div className="grid grid-cols-2 gap-3">
            <FL label="Spinal canal stenosis">
              <Pills options={['None','Mild','Moderate','Severe']} value={mriCanalStenosis} onChange={setMriCanalStenosis} color="sky" />
            </FL>
            <FL label="Foraminal stenosis">
              <Pills options={['None','Mild','Moderate','Severe']} value={mriForaminalStenosis} onChange={setMriForaminalStenosis} color="sky" />
            </FL>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FL label="Cord signal change (T2)">
              <Pills options={['None','High T2 signal (myelopathy)','Low T2 (chronic)','Not applicable (lumbar)']} value={mriCordSignal} onChange={setMriCordSignal} color="sky" />
            </FL>
            <FL label="Cord compression">
              <Pills options={['Yes','No']} value={mriCordCompression} onChange={setMriCordCompression} color="sky" />
            </FL>
          </div>
        </Gate>
        <Gate label="CT scan done?" value={ctDone} onChange={setCtDone} color="sky">
          <FL label="CT findings" sub="multi-select">
            <Pills options={['Fracture (describe)','Facet joint OA','OPLL calcification','Foraminal encroachment','Bony stenosis','Post-op changes','Instrumentation position']} value={ctFindings} onChange={setCtFindings} multi color="sky" />
          </FL>
        </Gate>
      </Section>

      {/* Section 6 — Scoring */}
      <Section title="6. Disability & Outcome Scores" applicable={appScoring} onApplicable={setAppScoring} color="emerald">
        {/* ODI */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-emerald-800">Oswestry Disability Index (ODI) — lumbar (0=no disability per item)</p>
          {ODI_ITEMS.map(item => (
            <ScoreRow key={item.key} label={item.label}
              options={[['0 — No limitation',0],['1 — Mild',1],['2 — Moderate',2],['3 — Severe',3],['4 — Very severe',4],['5 — Maximal',5]]}
              value={odiScores[item.key]}
              onChange={v => setOdiScores(s => ({ ...s, [item.key]: v }))}
              color="emerald" />
          ))}
          {odiInterp && (
            <div className={`rounded-lg px-4 py-2 text-sm font-semibold border ${odiInterp.color}`}>
              ODI: {odiTotal}% — {odiInterp.label}
            </div>
          )}
        </div>

        {/* NDI */}
        <div className="space-y-3 pt-3 border-t border-gray-200">
          <p className="text-sm font-semibold text-emerald-800">Neck Disability Index (NDI) — cervical</p>
          {NDI_ITEMS.map(item => (
            <ScoreRow key={item.key} label={item.label}
              options={[['0 — None',0],['1',1],['2',2],['3',3],['4',4],['5 — Complete',5]]}
              value={ndiScores[item.key]}
              onChange={v => setNdiScores(s => ({ ...s, [item.key]: v }))}
              color="emerald" />
          ))}
          {ndiInterp && (
            <div className={`rounded-lg px-4 py-2 text-sm font-semibold border ${ndiInterp.color}`}>
              NDI: {ndiTotal}% — {ndiInterp.label}
            </div>
          )}
        </div>

        {/* mJOA */}
        <div className="space-y-3 pt-3 border-t border-gray-200">
          <p className="text-sm font-semibold text-emerald-800">mJOA — Cervical myelopathy (17 = normal)</p>
          <ScoreRow label="Upper extremity motor"
            options={[['Impossible to use chopsticks/button',0],['Very difficult',1],['Difficult with clumsy fingers',2],['Minor loss of dexterity',3],['Normal',4]]}
            value={mjoaUE} onChange={setMjoaUE} color="emerald" />
          <ScoreRow label="Lower extremity motor"
            options={[['Complete loss of locomotion',0],['Needs aid on flat',1],['Needs aid on stairs only',2],['Independent but clumsy',3],['Normal',4]]}
            value={mjoaLE} onChange={setMjoaLE} color="emerald" />
          <ScoreRow label="Sensation — upper extremity"
            options={[['Complete loss',0],['Severe loss',1],['Mild loss',2],['Normal',3]]}
            value={mjoaSensUE} onChange={setMjoaSensUE} color="emerald" />
          <ScoreRow label="Sensation — trunk / lower extremity"
            options={[['Complete loss',0],['Severe loss',1],['Mild loss',2],['Normal',3]]}
            value={mjoaSensTrunk} onChange={setMjoaSensTrunk} color="emerald" />
          <ScoreRow label="Bladder function"
            options={[['Retention / incontinence',0],['Severe dysfunction',1],['Mild dysfunction',2],['Normal',3]]}
            value={mjoaBladder} onChange={setMjoaBladder} color="emerald" />
          {mjoaInterp && (
            <div className={`rounded-lg px-4 py-2 text-sm font-semibold border ${mjoaInterp.color}`}>
              mJOA: {mjoaTotal}/17 — {mjoaInterp.label}
            </div>
          )}
        </div>
      </Section>

      {/* Section 7 — Management */}
      <Section title="7. Management Plan" applicable={appManage} onApplicable={setAppManage} color="rose">
        <FL label="Urgency">
          <Pills options={['Routine outpatient','Urgent (within 2 weeks)','Semi-urgent (within 48 h)','Emergency (STAT)']} value={urgency} onChange={setUrgency} color="rose" />
        </FL>
        <FL label="Conservative management" sub="multi-select">
          <Pills options={['Activity modification','Short-term bed rest (max 2 days)','NSAIDs (Naproxen/Diclofenac)','Paracetamol','Muscle relaxants (Baclofen/Tizanidine)','Gabapentin / Pregabalin (neuropathic)','Duloxetine (chronic pain)','Oral steroids (short course — acute radiculopathy)','Cervical/lumbar collar/brace','TENS','Traction']} value={conservative} onChange={setConservative} multi color="rose" />
        </FL>
        <FL label="Physiotherapy plan" sub="multi-select">
          <Pills options={['McKenzie extension exercises (lumbar disc)','Core strengthening','Cervical stabilisation exercises','Traction (mechanical)','Manual therapy','Neural mobilisation / nerve flossing','Postural correction','Ergonomic advice','Heat/ultrasound/TENS','Hydrotherapy','Home exercise programme']} value={physioPlan} onChange={setPhysioPlan} multi color="rose" />
        </FL>
        <FL label="Interventional / injection plan" sub="multi-select">
          <Pills options={['Lumbar epidural steroid injection (interlaminar)','Lumbar epidural (transforaminal)','Cervical epidural steroid injection','Facet joint injection (C/T/L)','Medial branch block + RFA','Trigger point injection','Nerve root block','Intradiscal injection','Discography','None planned']} value={injectionPlan} onChange={setInjectionPlan} multi color="rose" />
        </FL>
        <Gate label="Surgical referral / planning?" value={surgical} onChange={setSurgical} color="rose">
          <FL label="Planned procedure" sub="multi-select">
            <Pills options={['Microdiscectomy (lumbar)','Laminectomy (decompression)','Laminoplasty (cervical myelopathy)','ACDF (anterior cervical discectomy + fusion)','Cervical disc replacement (ACDR)','PLIF — posterior lumbar interbody fusion','TLIF — transforaminal lumbar interbody fusion','XLIF — lateral interbody fusion','ALIF — anterior lumbar interbody fusion','Pedicle screw fixation + fusion','Vertebroplasty / kyphoplasty (compression fx)','Spinal cord stimulator implant','Tumour decompression / stabilisation']} value={surgicalPlan} onChange={setSurgicalPlan} multi color="rose" />
          </FL>
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
            India: Spine surgery available under PM-JAY at AIIMS/government centres. Microdiscectomy preferred for PIVD (90% success). ACDF widely done. Spinal cord stimulators — limited availability, high cost (₹4–8 lakhs). OPLL common in Indian patients (genetic predisposition).
          </div>
        </Gate>
        <FL label="Follow-up">
          <Pills options={['1 week (post-injection/acute)','2 weeks','4 weeks','6 weeks (post-surgery)','3 months','PRN']} value={followUp} onChange={setFollowUp} color="rose" />
        </FL>
      </Section>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-slate-700 to-gray-800 text-white font-semibold shadow hover:from-slate-800 hover:to-gray-900 disabled:opacity-50 transition-all">
        {saving ? 'Saving…' : 'Save Spine Assessment'}
      </button>
    </div>
  );
}
