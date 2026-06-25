/**
 * @shared-pool
 * OrthopedicShoulderAssessmentForm — portal-agnostic orthopedic assessment
 * Constant-Murley · QuickDASH · ASES · Oxford Shoulder Score · Neer/Hawkins/O'Brien
 */

import React, { useState, useMemo } from 'react';
import api from '../../../api/client';

/* ─── Shoulder Anatomy SVG ───────────────────────────────── */
const ShoulderAnatomySVG = ({ highlights = [] }) => {
  const hl = (s) => highlights.includes(s);
  const hc = (s, on, off) => hl(s) ? on : off;
  return (
    <svg viewBox="0 0 300 280" className="w-full h-auto max-h-64" role="img" aria-label="Right shoulder anterior view">
      <rect width="300" height="280" fill="#f8fafc" rx="10"/>
      <text x="150" y="14" textAnchor="middle" fontSize="10" fontWeight="600" fill="#475569">Right Shoulder — Anterior View</text>

      {/* Clavicle */}
      <path d="M 20,50 Q 80,38 130,52" fill="none" stroke="#d97706" strokeWidth="12" strokeLinecap="round"/>
      <path d="M 20,50 Q 80,38 130,52" fill="none" stroke="#fdefd6" strokeWidth="8" strokeLinecap="round"/>
      <text x="62" y="34" textAnchor="middle" fontSize="8" fill="#92400e">Clavicle</text>

      {/* AC joint */}
      <rect x="127" y="44" width="5" height="14" rx="1" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1"/>
      <text x="140" y="44" fontSize="7.5" fill="#0284c7">AC joint</text>

      {/* Acromion */}
      <path d="M 132,52 Q 158,48 170,58 L 168,72 Q 155,64 132,66 Z" fill="#fdefd6" stroke="#d97706" strokeWidth="1.5"/>
      <text x="152" y="82" textAnchor="middle" fontSize="7.5" fill="#92400e">Acromion</text>

      {/* Subacromial space */}
      <rect x="133" y="67" width="34" height="10" rx="3" fill="#bfdbfe" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 2"/>
      <text x="150" y="75" textAnchor="middle" fontSize="6" fill="#1d4ed8">Sub-acromial</text>

      {/* Coracoid process */}
      <path d="M 118,62 Q 110,72 112,84" fill="none" stroke="#d97706" strokeWidth="7" strokeLinecap="round"/>
      <path d="M 118,62 Q 110,72 112,84" fill="none" stroke="#fdefd6" strokeWidth="4" strokeLinecap="round"/>
      <text x="88" y="92" fontSize="7" fill="#92400e">Coracoid</text>

      {/* Scapula body */}
      <path d="M 58,68 Q 72,62 118,65 L 122,200 Q 90,220 58,200 Z" fill="#fdefd6" stroke="#d97706" strokeWidth="1.5"/>

      {/* Glenoid */}
      <ellipse cx="122" cy="126" rx="12" ry="22" fill="#fde8cc" stroke="#d97706" strokeWidth="2"/>
      <text x="82" y="128" textAnchor="middle" fontSize="7.5" fill="#92400e">Glenoid</text>

      {/* Labrum */}
      <ellipse cx="122" cy="126" rx="16" ry="26" fill="none" stroke={hc('labrum','#7c3aed','#c4b5fd')} strokeWidth={hl('labrum') ? 4 : 3} strokeDasharray="4 2"/>
      <text x="84" y="144" fontSize="7" fill="#7c3aed">Labrum</text>

      {/* Humeral head */}
      <circle cx="172" cy="118" r="42" fill="#fdefd6" stroke="#d97706" strokeWidth="2"/>

      {/* Humeral shaft */}
      <rect x="148" y="155" width="48" height="110" rx="10" fill="#fdefd6" stroke="#d97706" strokeWidth="2"/>
      <text x="172" y="218" textAnchor="middle" fontSize="9" fill="#92400e">Humerus</text>

      {/* Bicipital groove */}
      <line x1="168" y1="130" x2="168" y2="165" stroke="#64748b" strokeWidth="2" strokeDasharray="3 2"/>

      {/* Supraspinatus — top of humeral head */}
      <path d="M 132,78 Q 150,72 172,76 Q 185,80 190,88"
        fill="none" stroke={hc('supraspinatus','#dc2626','#fca5a5')} strokeWidth={hl('supraspinatus') ? 6 : 4} strokeLinecap="round"/>
      <text x="148" y="68" textAnchor="middle" fontSize="7" fill="#dc2626">Supraspinatus</text>

      {/* Subscapularis — anterior */}
      <path d="M 122,110 Q 138,104 155,108 Q 162,112 164,120"
        fill="none" stroke={hc('subscapularis','#2563eb','#93c5fd')} strokeWidth={hl('subscapularis') ? 6 : 4} strokeLinecap="round"/>
      <text x="90" y="108" textAnchor="end" fontSize="7" fill="#2563eb">Subscap.</text>

      {/* Biceps long head tendon */}
      <line x1="168" y1="84" x2="168" y2="130"
        stroke={hc('biceps','#d97706','#fcd34d')} strokeWidth={hl('biceps') ? 5 : 3}/>
      <text x="196" y="108" fontSize="7" fill="#d97706">Biceps LH</text>

      {/* Legend */}
      <rect x="4" y="244" width="292" height="30" rx="6" fill="#f1f5f9"/>
      <line x1="12" y1="256" x2="28" y2="256" stroke="#fca5a5" strokeWidth="4" strokeLinecap="round"/>
      <text x="32" y="260" fontSize="7" fill="#374151">Supraspinatus</text>
      <line x1="112" y1="256" x2="128" y2="256" stroke="#93c5fd" strokeWidth="4" strokeLinecap="round"/>
      <text x="132" y="260" fontSize="7" fill="#374151">Subscapularis</text>
      <line x1="204" y1="256" x2="220" y2="256" stroke="#fcd34d" strokeWidth="3"/>
      <text x="224" y="260" fontSize="7" fill="#374151">Biceps LH</text>
      <line x1="12" y1="270" x2="28" y2="270" stroke="#c4b5fd" strokeWidth="3" strokeDasharray="4 2"/>
      <text x="32" y="274" fontSize="7" fill="#374151">Labrum</text>
      <rect x="112" y="263" width="14" height="8" rx="2" fill="#bfdbfe" stroke="#3b82f6" strokeWidth="1"/>
      <text x="130" y="271" fontSize="7" fill="#374151">Sub-acromial space</text>
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

const ScoreRow = ({ label, options, value, onChange, color = 'blue' }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
    <span className="text-xs text-gray-600 w-44 shrink-0">{label}</span>
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

/* ─── main form ─────────────────────────────────────────────── */
export default function OrthopedicShoulderAssessmentForm({ patientId, encounterId, onSave }) {
  const [saving, setSaving] = useState(false);

  /* Section gates */
  const [appPresent,  setAppPresent]  = useState(null);
  const [appHistory,  setAppHistory]  = useState(null);
  const [appExam,     setAppExam]     = useState(null);
  const [appSpecial,  setAppSpecial]  = useState(null);
  const [appImaging,  setAppImaging]  = useState(null);
  const [appScoring,  setAppScoring]  = useState(null);
  const [appManage,   setAppManage]   = useState(null);

  /* ── Presentation ── */
  const [side,             setSide]             = useState(null);
  const [dominantArm,      setDominantArm]      = useState(null);
  const [chiefComplaint,   setChiefComplaint]   = useState([]);
  const [onset,            setOnset]            = useState(null);
  const [mechanism,        setMechanism]        = useState(null);
  const [vasRest,          setVasRest]          = useState('');
  const [vasActivity,      setVasActivity]      = useState('');
  const [structHighlight,  setStructHighlight]  = useState([]);

  /* ── History ── */
  const [painLocation,     setPainLocation]     = useState([]);
  const [radiation,        setRadiation]        = useState([]);
  const [nightPain,        setNightPain]        = useState(null);
  const [overhead,         setOverhead]         = useState(null);
  const [weakness,         setWeakness]         = useState(null);
  const [instability,      setInstability]      = useState(null);
  const [instabilityDir,   setInstabilityDir]   = useState([]);
  const [clicking,         setClicking]         = useState(null);
  const [stiffness,        setStiffness]        = useState(null);
  const [swelling,         setSwelling]         = useState(null);
  const [priorInjury,      setPriorInjury]      = useState(null);
  const [priorInjuryType,  setPriorInjuryType]  = useState([]);
  const [priorSurgery,     setPriorSurgery]     = useState(null);
  const [priorSurgeryType, setPriorSurgeryType] = useState([]);
  const [injections,       setInjections]       = useState([]);
  const [occupation,       setOccupation]       = useState(null);
  const [sport,            setSport]            = useState([]);
  const [handedness,       setHandedness]       = useState(null);

  /* ── Examination ── */
  const [inspection,       setInspection]       = useState([]);
  const [tenderness,       setTenderness]       = useState([]);
  const [romAbductAct,     setRomAbductAct]     = useState('');
  const [romAbductPass,    setRomAbductPass]    = useState('');
  const [romForwardFlex,   setRomForwardFlex]   = useState('');
  const [romER,            setRomER]            = useState('');  /* external rotation */
  const [romIR,            setRomIR]            = useState('');  /* internal rotation by vertebral level */
  const [romIRLevel,       setRomIRLevel]       = useState(null);
  const [romCross,         setRomCross]         = useState(''); /* cross-body adduction */
  const [arcOfPain,        setArcOfPain]        = useState(null); /* 60–120° painful arc */
  const [deltoidStrength,  setDeltoidStrength]  = useState(null);
  const [supraStrength,    setSupraStrength]    = useState(null);
  const [subScapStrength,  setSubScapStrength]  = useState(null);
  const [infraStrength,    setInfraStrength]    = useState(null);
  const [bicepsStrength,   setBicepsStrength]   = useState(null);
  const [scapularDyskinesis, setScapularDyskinesis] = useState(null);
  const [acJointTender,    setAcJointTender]    = useState(null);
  const [sterno,           setSterno]           = useState(null); /* sternoclavicular joint */

  /* ── Special Tests ── */
  const [neer,             setNeer]             = useState(null);
  const [hawkins,          setHawkins]          = useState(null);
  const [emptyCan,         setEmptyCan]         = useState(null);  /* Jobe — supraspinatus */
  const [fullCan,          setFullCan]          = useState(null);
  const [dropArm,          setDropArm]          = useState(null);  /* massive RC tear */
  const [hornBlower,       setHornBlower]       = useState(null);  /* teres minor */
  const [liftOff,          setLiftOff]          = useState(null);  /* Gerber — subscapularis */
  const [bellyCross,       setBellyCross]       = useState(null);  /* belly-press / Napoleon */
  const [bearHug,          setBearHug]          = useState(null);  /* subscapularis */
  const [obrien,           setObrien]           = useState(null);  /* O'Brien — SLAP */
  const [speeds,           setSpeeds]           = useState(null);  /* biceps tendon */
  const [yergason,         setYergason]         = useState(null);  /* biceps tendon */
  const [apprehension,     setApprehension]     = useState(null);  /* anterior instability */
  const [relocation,       setRelocation]       = useState(null);
  const [sulcusSign,       setSulcusSign]       = useState(null);  /* inferior instability */
  const [oactest,          setOactest]          = useState(null);  /* OAC — AC joint */
  const [crossBodyAdduct,  setCrossBodyAdduct]  = useState(null);  /* AC joint */
  const [spurling,         setSpurling]         = useState(null);  /* cervical referred pain */

  /* ── Imaging ── */
  const [xrayDone,         setXrayDone]         = useState(null);
  const [xrayFindings,     setXrayFindings]     = useState([]);
  const [acJointXray,      setAcJointXray]      = useState(null);
  const [ussDone,          setUssDone]          = useState(null);
  const [ussFindings,      setUssFindings]      = useState([]);
  const [mriDone,          setMriDone]          = useState(null);
  const [mriRcTear,        setMriRcTear]        = useState(null);
  const [mriTearSize,      setMriTearSize]      = useState(null);
  const [mriTearMuscle,    setMriTearMuscle]    = useState([]);
  const [mriLabrum,        setMriLabrum]        = useState(null);
  const [mriBankart,       setMriBankart]       = useState(null);
  const [mriHillSachs,     setMriHillSachs]     = useState(null);
  const [mriBiceps,        setMriBiceps]        = useState(null);
  const [mriAcJoint,       setMriAcJoint]       = useState(null);
  const [mriFattyAtrophy,  setMriFattyAtrophy]  = useState(null);

  /* ── Constant-Murley Score ── */
  const [cmsPain,          setCmsPain]          = useState(null); /* 0–15 */
  const [cmsAdl1,          setCmsAdl1]          = useState(null); /* work level 0–4 */
  const [cmsAdl2,          setCmsAdl2]          = useState(null); /* recreation 0–4 */
  const [cmsAdl3,          setCmsAdl3]          = useState(null); /* sleep 0–2 */
  const [cmsAdl4,          setCmsAdl4]          = useState(null); /* hand position */

  /* ── QuickDASH (11 items 1–5) ── */
  const QDASH_ITEMS = [
    { key: 'q1',  label: 'Open a tight jar' },
    { key: 'q2',  label: 'Write' },
    { key: 'q3',  label: 'Turn a key' },
    { key: 'q4',  label: 'Prepare a meal' },
    { key: 'q5',  label: 'Push open a heavy door' },
    { key: 'q6',  label: 'Place object on shelf above head' },
    { key: 'q7',  label: 'Do heavy household chores' },
    { key: 'q8',  label: 'Garden / do yard work' },
    { key: 'q9',  label: 'Make bed' },
    { key: 'q10', label: 'Carry a shopping bag' },
    { key: 'q11', label: 'Wash or blow-dry your hair' },
  ];
  const [qdashScores, setQdashScores] = useState(() => Object.fromEntries(QDASH_ITEMS.map(i => [i.key, null])));

  /* ── Management ── */
  const [diagnosis,        setDiagnosis]        = useState([]);
  const [conservative,     setConservative]     = useState([]);
  const [physioPlan,       setPhysioPlan]       = useState([]);
  const [injectionPlan,    setInjectionPlan]    = useState(null);
  const [surgical,         setSurgical]         = useState(null);
  const [surgicalPlan,     setSurgicalPlan]     = useState([]);
  const [followUp,         setFollowUp]         = useState(null);

  /* ─── computed: Constant-Murley Score ───────────────────── */
  const cmsRomScore = useMemo(() => {
    const flex = Number(romForwardFlex);
    const abd  = Number(romAbductAct);
    const er   = Number(romER);
    const irMap = { 'L3': 4, 'L1': 6, 'T12(2)': 6, 'Buttock': 0, 'Thigh': 2, 'Waist': 4, 'T12': 6, 'T7': 8, 'T5': 10 };
    const irScore = romIRLevel ? (irMap[romIRLevel] ?? 0) : 0;

    const flexScore = flex >= 171 ? 10 : flex >= 141 ? 8 : flex >= 91 ? 6 : flex >= 61 ? 4 : flex >= 31 ? 2 : 0;
    const abdScore  = abd  >= 171 ? 10 : abd  >= 141 ? 8 : abd  >= 91 ? 6 : abd  >= 61 ? 4 : abd  >= 31 ? 2 : 0;
    const erScore   = er   >= 60  ? 10 : er   >= 30  ? 6 : er   >= 0   ? 0 : 0;
    return flexScore + abdScore + erScore + irScore;
  }, [romForwardFlex, romAbductAct, romER, romIRLevel]);

  const cmsAdlTotal = useMemo(() => {
    const vals = [cmsAdl1, cmsAdl2, cmsAdl3, cmsAdl4];
    if (vals.some(v => v === null)) return null;
    return vals.reduce((s, v) => s + v, 0);
  }, [cmsAdl1, cmsAdl2, cmsAdl3, cmsAdl4]);

  const cmsTotal = useMemo(() => {
    if (cmsAdlTotal === null || cmsPain === null) return null;
    return (cmsAdlTotal + cmsPain + cmsRomScore); /* strength omitted — needs dynamometer */
  }, [cmsAdlTotal, cmsPain, cmsRomScore]);

  const cmsInterp = useMemo(() => {
    if (cmsTotal === null) return null;
    if (cmsTotal >= 80) return { label: 'Excellent (≥80)', color: 'bg-green-100 border-green-400 text-green-800' };
    if (cmsTotal >= 70) return { label: 'Good (70–79)', color: 'bg-blue-100 border-blue-400 text-blue-800' };
    if (cmsTotal >= 55) return { label: 'Fair (55–69)', color: 'bg-yellow-100 border-yellow-400 text-yellow-800' };
    return { label: 'Poor (<55) — significant impairment', color: 'bg-red-100 border-red-400 text-red-800' };
  }, [cmsTotal]);

  /* ─── computed: QuickDASH ────────────────────────────────── */
  const qdashTotal = useMemo(() => {
    const vals = Object.values(qdashScores);
    if (vals.some(v => v === null)) return null;
    const n = vals.length;
    const sum = vals.reduce((s, v) => s + v, 0);
    return Math.round(((sum / n) - 1) * 25);
  }, [qdashScores]);

  const qdashInterp = useMemo(() => {
    if (qdashTotal === null) return null;
    if (qdashTotal <= 25) return { label: 'Mild disability (0–25)', color: 'bg-green-100 border-green-400 text-green-800' };
    if (qdashTotal <= 50) return { label: 'Moderate disability (26–50)', color: 'bg-yellow-100 border-yellow-400 text-yellow-800' };
    if (qdashTotal <= 75) return { label: 'Severe disability (51–75)', color: 'bg-orange-100 border-orange-400 text-orange-800' };
    return { label: 'Very severe disability (76–100)', color: 'bg-red-100 border-red-400 text-red-800' };
  }, [qdashTotal]);

  /* ─── computed: special-test pattern ────────────────────── */
  const clinicalPattern = useMemo(() => {
    const flags = [];
    if (neer === 'Positive' || hawkins === 'Positive') flags.push('Subacromial impingement pattern');
    if (emptyCan === 'Positive' || dropArm === 'Positive') flags.push('Rotator cuff tear likely (supraspinatus)');
    if (liftOff === 'Positive' || bellyCross === 'Positive' || bearHug === 'Positive') flags.push('Subscapularis tear suspected');
    if (hornBlower === 'Positive') flags.push('Teres minor / infraspinatus tear suspected');
    if (obrien === 'Positive') flags.push('SLAP lesion suspected');
    if (speeds === 'Positive' || yergason === 'Positive') flags.push('Biceps tendon pathology');
    if (apprehension === 'Positive') flags.push('Anterior instability / dislocation risk');
    if (sulcusSign === 'Positive') flags.push('Multi-directional / inferior instability');
    if (oactest === 'Positive' || crossBodyAdduct === 'Positive' || acJointTender === 'Yes') flags.push('AC joint pathology');
    if (spurling === 'Positive') flags.push('Cervical radiculopathy — referred shoulder pain');
    return flags;
  }, [neer, hawkins, emptyCan, dropArm, liftOff, bellyCross, bearHug, hornBlower, obrien, speeds, yergason, apprehension, sulcusSign, oactest, crossBodyAdduct, acJointTender, spurling]);

  /* ─── save ────────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/assessments', {
        type: 'orthopedic_shoulder', patientId, encounterId,
        presentation: { side, dominantArm, chiefComplaint, onset, mechanism, vasRest, vasActivity, structHighlight },
        history: { painLocation, radiation, nightPain, overhead, weakness, instability, instabilityDir, clicking, stiffness, swelling, priorInjury, priorInjuryType, priorSurgery, priorSurgeryType, injections, occupation, sport },
        exam: { inspection, tenderness, rom: { abductActive: romAbductAct, abductPassive: romAbductPass, forwardFlex: romForwardFlex, ER: romER, IRlevel: romIRLevel, crossBody: romCross }, arcOfPain, strength: { deltoid: deltoidStrength, supraspinatus: supraStrength, subscapularis: subScapStrength, infraspinatus: infraStrength, biceps: bicepsStrength }, scapularDyskinesis, acJointTender, sterno },
        specialTests: { neer, hawkins, emptyCan, fullCan, dropArm, hornBlower, liftOff, bellyCross, bearHug, obrien, speeds, yergason, apprehension, relocation, sulcusSign, oactest, crossBodyAdduct, spurling },
        imaging: { xrayDone, xrayFindings, acJointXray, ussDone, ussFindings, mriDone, mriRcTear, mriTearSize, mriTearMuscle, mriLabrum, mriBankart, mriHillSachs, mriBiceps, mriAcJoint, mriFattyAtrophy },
        scoring: { cmsTotal, cmsInterp: cmsInterp?.label, cmsRomScore, cmsAdlTotal, qdashTotal, qdashInterp: qdashInterp?.label },
        management: { diagnosis, conservative, physioPlan, injectionPlan, surgical, surgicalPlan, followUp },
        computed: { clinicalPattern },
      });
      onSave?.();
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-10">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-1">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-bold">Ortho — Shoulder Assessment</h2>
        </div>
        <p className="text-sm text-cyan-100 mb-3">Constant-Murley · QuickDASH · ASES · Neer · Hawkins · O'Brien</p>
        {clinicalPattern.length > 0 && (
          <div className="space-y-1 mb-2">
            {clinicalPattern.map(f => (
              <div key={f} className="bg-white/20 rounded-lg px-3 py-1 text-xs font-medium">⚠ {f}</div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {cmsInterp && <span className={`rounded-lg px-3 py-1 text-xs font-semibold border ${cmsInterp.color}`}>CMS {cmsTotal} — {cmsInterp.label.split(' (')[0]}</span>}
          {qdashInterp && <span className={`rounded-lg px-3 py-1 text-xs font-semibold border ${qdashInterp.color}`}>QuickDASH {qdashTotal} — {qdashInterp.label.split(' (')[0]}</span>}
        </div>
      </div>

      {/* Section 1 — Presentation + SVG */}
      <Section title="1. Presentation" applicable={appPresent} onApplicable={setAppPresent} color="cyan">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <FL label="Side"><Pills options={['Right','Left','Bilateral']} value={side} onChange={setSide} color="cyan"/></FL>
              <FL label="Dominant arm"><Pills options={['Right','Left']} value={dominantArm} onChange={setDominantArm} color="cyan"/></FL>
            </div>
            <FL label="Chief complaint" sub="multi-select">
              <Pills options={['Pain','Weakness','Stiffness (frozen)','Instability / dislocation','Clicking / crepitus','Swelling','Loss of overhead function','Night pain']} value={chiefComplaint} onChange={setChiefComplaint} multi color="cyan"/>
            </FL>
            <FL label="Onset">
              <Pills options={['Acute (<48h)','Subacute','Chronic (>3 months)','Insidious (gradual)','Acute on chronic']} value={onset} onChange={setOnset} color="cyan"/>
            </FL>
            <FL label="Mechanism">
              <Pills options={['Fall on outstretched hand (FOOSH)','Fall on shoulder tip','Dislocation event','Overhead overuse','Lifting / heavy load','Post-surgical','Gradual / degenerative','Unknown']} value={mechanism} onChange={setMechanism} color="cyan"/>
            </FL>
            <div className="grid grid-cols-2 gap-2">
              <FL label="VAS rest" sub="0–10"><input type="number" min="0" max="10" value={vasRest} onChange={e => setVasRest(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400" placeholder="0–10"/></FL>
              <FL label="VAS activity" sub="0–10"><input type="number" min="0" max="10" value={vasActivity} onChange={e => setVasActivity(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400" placeholder="0–10"/></FL>
            </div>
            <FL label="Highlight structure" sub="multi-select">
              <Pills options={[{label:'Supraspinatus',value:'supraspinatus'},{label:'Subscapularis',value:'subscapularis'},{label:'Biceps LH',value:'biceps'},{label:'Labrum',value:'labrum'}]} value={structHighlight} onChange={setStructHighlight} multi color="indigo"/>
            </FL>
          </div>
          <div className="bg-white rounded-xl p-2 border border-cyan-100 shadow-sm">
            <ShoulderAnatomySVG highlights={structHighlight}/>
          </div>
        </div>
      </Section>

      {/* Section 2 — History */}
      <Section title="2. History & Symptoms" applicable={appHistory} onApplicable={setAppHistory} color="indigo">
        <FL label="Pain location" sub="multi-select">
          <Pills options={['Anterior (bicipital groove)','Lateral (deltoid insertion — subacromial)','Superior (AC joint)','Posterior (RC / labrum)','Neck radiation','Diffuse entire shoulder']} value={painLocation} onChange={setPainLocation} multi color="indigo"/>
        </FL>
        <FL label="Radiation">
          <Pills options={['None','Down arm to elbow','Down arm to hand/fingers','Into neck','Into chest','Bilateral']} value={radiation} onChange={setRadiation} multi color="indigo"/>
        </FL>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <FL label="Night pain?"><Pills options={['Yes','No']} value={nightPain} onChange={setNightPain} color="indigo"/></FL>
          <FL label="Overhead pain?"><Pills options={['Yes','No']} value={overhead} onChange={setOverhead} color="indigo"/></FL>
          <FL label="Weakness?"><Pills options={['Yes','No']} value={weakness} onChange={setWeakness} color="indigo"/></FL>
          <FL label="Clicking/crepitus?"><Pills options={['Yes','No']} value={clicking} onChange={setClicking} color="indigo"/></FL>
          <FL label="Stiffness / frozen?"><Pills options={['Yes','No']} value={stiffness} onChange={setStiffness} color="indigo"/></FL>
          <FL label="Visible swelling?"><Pills options={['Yes','No']} value={swelling} onChange={setSwelling} color="indigo"/></FL>
        </div>
        <Gate label="Instability / dislocation events?" value={instability} onChange={setInstability} color="indigo">
          <FL label="Direction" sub="multi-select">
            <Pills options={['Anterior (most common)','Posterior','Inferior (sulcus)','Multi-directional']} value={instabilityDir} onChange={setInstabilityDir} multi color="indigo"/>
          </FL>
        </Gate>
        <Gate label="Prior shoulder injury?" value={priorInjury} onChange={setPriorInjury} color="indigo">
          <FL label="Injury type" sub="multi-select">
            <Pills options={['Dislocation (anterior)','Dislocation (posterior)','RC tear','SLAP tear','AC joint injury (Rockwood)','Clavicle fracture','Proximal humerus fracture','Biceps rupture']} value={priorInjuryType} onChange={setPriorInjuryType} multi color="indigo"/>
          </FL>
        </Gate>
        <Gate label="Prior shoulder surgery?" value={priorSurgery} onChange={setPriorSurgery} color="indigo">
          <FL label="Surgery type" sub="multi-select">
            <Pills options={['Subacromial decompression (ASD)','RC repair (arthroscopic)','RC repair (open)','SLAP repair','Bankart repair (Latarjet)','AC joint stabilisation','Total shoulder replacement (TSR)','Hemi-arthroplasty','Biceps tenodesis / tenotomy','Manipulation under anaesthesia (MUA)']} value={priorSurgeryType} onChange={setPriorSurgeryType} multi color="indigo"/>
          </FL>
        </Gate>
        <FL label="Previous injections" sub="multi-select">
          <Pills options={['None','Subacromial steroid','AC joint steroid','Glenohumeral steroid','Hyaluronic acid','PRP','Hydrodistension (frozen shoulder)']} value={injections} onChange={setInjections} multi color="indigo"/>
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Occupation">
            <Pills options={['Overhead worker','Heavy manual','Desk / sedentary','Driver','Sportsperson','Retired']} value={occupation} onChange={setOccupation} color="indigo"/>
          </FL>
          <FL label="Sport / activity" sub="multi-select">
            <Pills options={['Cricket (bowling/throwing)','Swimming','Tennis/badminton','Gym/weightlifting','Martial arts','None']} value={sport} onChange={setSport} multi color="indigo"/>
          </FL>
        </div>
      </Section>

      {/* Section 3 — Examination */}
      <Section title="3. Physical Examination" applicable={appExam} onApplicable={setAppExam} color="blue">
        <FL label="Inspection findings" sub="multi-select">
          <Pills options={['Normal','Muscle wasting (deltoid)','Supraspinatus fossa wasting','Infraspinatus fossa wasting','AC joint prominence','Clavicle deformity','Anterior fullness (effusion)','Scapular winging','Asymmetry']} value={inspection} onChange={setInspection} multi color="blue"/>
        </FL>
        <FL label="Palpation tenderness" sub="multi-select">
          <Pills options={['Greater tuberosity (RC insertion)','Bicipital groove','AC joint','Sternoclavicular joint','Posterior joint line','Coracoid process','Acromioclavicular','Subacromial bursa','Trapezius / periscapular']} value={tenderness} onChange={setTenderness} multi color="blue"/>
        </FL>
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Range of Motion (normal: FFL 180°, Abd 180°, ER 60–90°, IR to T7–T8)</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <FL label="Forward flex" sub="°"><input type="number" value={romForwardFlex} onChange={e => setRomForwardFlex(e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400" placeholder="180°"/></FL>
          <FL label="Abduction (active)" sub="°"><input type="number" value={romAbductAct} onChange={e => setRomAbductAct(e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400" placeholder="180°"/></FL>
          <FL label="Abduction (passive)" sub="°"><input type="number" value={romAbductPass} onChange={e => setRomAbductPass(e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400" placeholder="180°"/></FL>
          <FL label="External rotation" sub="°"><input type="number" value={romER} onChange={e => setRomER(e.target.value)} className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-400" placeholder="60°"/></FL>
        </div>
        <FL label="Internal rotation (hand-behind-back) — vertebral level reached">
          <Pills options={['Buttock','Thigh','Waist','L1','T12','T10','T7 (normal)','T5 (excellent)']} value={romIRLevel} onChange={setRomIRLevel} color="blue"/>
        </FL>
        <FL label="Painful arc (60–120° abduction)?">
          <Pills options={['Present (subacromial impingement)','Present throughout arc (GHJ arthritis)','Absent']} value={arcOfPain} onChange={setArcOfPain} color="blue"/>
        </FL>
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mt-1">Muscle Strength (MRC 0–5)</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[['Deltoid (C5)','deltoidStrength',setDeltoidStrength],['Supraspinatus (C5)','supraStrength',setSupraStrength],['Subscapularis (C5–C6)','subScapStrength',setSubScapStrength],['Infraspinatus (C5–C6)','infraStrength',setInfraStrength],['Biceps (C5–C6)','bicepsStrength',setBicepsStrength]].map(([label, key, setter]) => (
            <FL key={key} label={label}>
              <Pills options={['5','4','3','2','1','0']} value={eval(key)} onChange={setter} color="blue"/>
            </FL>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Scapular dyskinesis">
            <Pills options={['None','Type I (inferior medial winging)','Type II (medial winging)','Type III (superior medial winging)','Obvious asymmetry']} value={scapularDyskinesis} onChange={setScapularDyskinesis} color="blue"/>
          </FL>
          <FL label="AC joint tenderness">
            <Pills options={['Yes','No']} value={acJointTender} onChange={setAcJointTender} color="blue"/>
          </FL>
        </div>
      </Section>

      {/* Section 4 — Special Tests */}
      <Section title="4. Special Tests" applicable={appSpecial} onApplicable={setAppSpecial} color="violet">
        {clinicalPattern.length > 0 && (
          <div className="rounded-lg bg-violet-50 border border-violet-300 px-4 py-2 space-y-1">
            {clinicalPattern.map(f => <p key={f} className="text-xs text-violet-800 font-semibold">→ {f}</p>)}
          </div>
        )}
        <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Impingement Tests</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <FL label="Neer's sign"><Pills options={['Positive','Negative','Not done']} value={neer} onChange={setNeer} color="violet"/></FL>
          <FL label="Hawkins-Kennedy"><Pills options={['Positive','Negative','Not done']} value={hawkins} onChange={setHawkins} color="violet"/></FL>
          <FL label="Painful arc (60–120°)"><Pills options={['Positive','Negative','Not done']} value={arcOfPain === null ? null : arcOfPain?.includes('subacromial') ? 'Positive' : 'Negative'} onChange={() => {}} color="violet"/></FL>
        </div>
        <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Rotator Cuff Tests</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <FL label="Empty can (Jobe) — Supra"><Pills options={['Positive (pain/weakness)','Negative','Not done']} value={emptyCan} onChange={setEmptyCan} color="violet"/></FL>
          <FL label="Full can — Supraspinatus"><Pills options={['Positive','Negative','Not done']} value={fullCan} onChange={setFullCan} color="violet"/></FL>
          <FL label="Drop arm test — massive RC"><Pills options={['Positive','Negative','Not done']} value={dropArm} onChange={setDropArm} color="violet"/></FL>
          <FL label="Lift-off (Gerber) — Subscap"><Pills options={['Positive','Negative','Not done']} value={liftOff} onChange={setLiftOff} color="violet"/></FL>
          <FL label="Belly-press / Napoleon — Subscap"><Pills options={['Positive','Negative','Not done']} value={bellyCross} onChange={setBellyCross} color="violet"/></FL>
          <FL label="Bear-hug — Subscapularis"><Pills options={['Positive','Negative','Not done']} value={bearHug} onChange={setBearHug} color="violet"/></FL>
          <FL label="Horn-blower — Teres minor"><Pills options={['Positive','Negative','Not done']} value={hornBlower} onChange={setHornBlower} color="violet"/></FL>
        </div>
        <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">SLAP & Biceps Tests</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <FL label="O'Brien (Active compression) — SLAP"><Pills options={['Positive','Negative','Not done']} value={obrien} onChange={setObrien} color="violet"/></FL>
          <FL label="Speed's test — Biceps LH"><Pills options={['Positive','Negative','Not done']} value={speeds} onChange={setSpeeds} color="violet"/></FL>
          <FL label="Yergason's — Biceps tendon"><Pills options={['Positive','Negative','Not done']} value={yergason} onChange={setYergason} color="violet"/></FL>
        </div>
        <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Instability Tests</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <FL label="Apprehension (anterior)"><Pills options={['Positive','Negative','Not done']} value={apprehension} onChange={setApprehension} color="violet"/></FL>
          <FL label="Relocation test"><Pills options={['Positive (relieves apprehension)','Negative','Not done']} value={relocation} onChange={setRelocation} color="violet"/></FL>
          <FL label="Sulcus sign (inferior)"><Pills options={['Grade I (<1 cm)','Grade II (1–2 cm)','Grade III (>2 cm)','Negative','Not done']} value={sulcusSign} onChange={setSulcusSign} color="violet"/></FL>
        </div>
        <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">AC Joint Tests</p>
        <div className="grid grid-cols-2 gap-3">
          <FL label="OAC test (AC stress)"><Pills options={['Positive','Negative','Not done']} value={oactest} onChange={setOactest} color="violet"/></FL>
          <FL label="Cross-body adduction test"><Pills options={['Positive','Negative','Not done']} value={crossBodyAdduct} onChange={setCrossBodyAdduct} color="violet"/></FL>
        </div>
        <FL label="Spurling's test (cervical referred pain)">
          <Pills options={['Positive — cervical radiculopathy','Negative','Not done']} value={spurling} onChange={setSpurling} color="violet"/>
        </FL>
      </Section>

      {/* Section 5 — Imaging */}
      <Section title="5. Investigations & Imaging" applicable={appImaging} onApplicable={setAppImaging} color="sky">
        <Gate label="X-ray done?" value={xrayDone} onChange={setXrayDone} color="sky">
          <FL label="X-ray findings" sub="multi-select">
            <Pills options={['Normal','Subacromial spurring','AC joint OA','Calcific tendinitis','Greater tuberosity sclerosis','Hill-Sachs lesion (impression fracture)','Bony Bankart (anterior glenoid loss)','Glenohumeral OA','Proximal humerus fracture','Clavicle fracture','AC joint dislocation (grade)']} value={xrayFindings} onChange={setXrayFindings} multi color="sky"/>
          </FL>
          <FL label="AC joint (Rockwood grade)">
            <Pills options={['Normal','Type I — AC sprain only','Type II — AC disrupted, CC intact','Type III — AC + CC disrupted','Type IV — posterior displacement','Type V — massive elevation','Type VI — inferior (rare)']} value={acJointXray} onChange={setAcJointXray} color="sky"/>
          </FL>
        </Gate>
        <Gate label="Ultrasound done?" value={ussDone} onChange={setUssDone} color="sky">
          <FL label="USS findings" sub="multi-select">
            <Pills options={['Normal','Supraspinatus partial tear','Supraspinatus full-thickness tear','Subscapularis tear','Infraspinatus tear','Subacromial bursitis','Calcific deposit','Biceps tendon pathology (tendinopathy/rupture)','AC joint effusion','Glenohumeral effusion']} value={ussFindings} onChange={setUssFindings} multi color="sky"/>
          </FL>
        </Gate>
        <Gate label="MRI done?" value={mriDone} onChange={setMriDone} color="sky">
          <FL label="Rotator cuff tear">
            <Pills options={['No tear','Partial thickness — articular surface','Partial thickness — bursal surface','Full-thickness small (<1 cm)','Full-thickness medium (1–3 cm)','Full-thickness large (3–5 cm)','Massive (>5 cm / ≥3 tendons)']} value={mriRcTear} onChange={setMriRcTear} color="sky"/>
          </FL>
          <FL label="Tendons involved" sub="multi-select">
            <Pills options={['Supraspinatus','Infraspinatus','Teres minor','Subscapularis']} value={mriTearMuscle} onChange={setMriTearMuscle} multi color="sky"/>
          </FL>
          <FL label="Fatty atrophy (Goutallier)">
            <Pills options={['Grade 0 — normal','Grade 1 — fatty streaks','Grade 2 — <50% fat','Grade 3 — 50% fat','Grade 4 — >50% fat (poor surgical prognosis)']} value={mriFattyAtrophy} onChange={setMriFattyAtrophy} color="sky"/>
          </FL>
          <div className="grid grid-cols-2 gap-3">
            <FL label="Labral tear">
              <Pills options={['None','Anteroinferior (Bankart)','Posterior','Superior (SLAP I–IV)','Pan-labral']} value={mriLabrum} onChange={setMriLabrum} color="sky"/>
            </FL>
            <FL label="Bony Bankart / Hill-Sachs">
              <Pills options={['None','Hill-Sachs (posterior humeral head)','Bony Bankart (anterior glenoid)','Both — engaging Hill-Sachs']} value={mriHillSachs} onChange={setMriHillSachs} color="sky"/>
            </FL>
            <FL label="Biceps LH status">
              <Pills options={['Normal','Tenosynovitis','Partial tear','Complete rupture','Subluxed out of groove']} value={mriBiceps} onChange={setMriBiceps} color="sky"/>
            </FL>
            <FL label="AC joint MRI">
              <Pills options={['Normal','OA changes','Edema (acute injury)','Meniscoid tear','Type III separation']} value={mriAcJoint} onChange={setMriAcJoint} color="sky"/>
            </FL>
          </div>
        </Gate>
      </Section>

      {/* Section 6 — Scoring */}
      <Section title="6. Outcome Scores" applicable={appScoring} onApplicable={setAppScoring} color="emerald">
        {/* Constant-Murley */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-emerald-800">Constant-Murley Score (100 = perfect)</p>
          <ScoreRow label="Pain (0=severe, 15=none)"
            options={[['None',15],['Mild',10],['Moderate',5],['Severe',0]]}
            value={cmsPain} onChange={setCmsPain} color="emerald"/>
          <ScoreRow label="Work level (ADL)"
            options={[['Full work',4],['Light work',3],['Desk work',2],['Housework',1],['Unable',0]]}
            value={cmsAdl1} onChange={setCmsAdl1} color="emerald"/>
          <ScoreRow label="Recreation / sport"
            options={[['Full',4],['Mild limitation',3],['Moderate limitation',2],['Severe limitation',1],['Unable',0]]}
            value={cmsAdl2} onChange={setCmsAdl2} color="emerald"/>
          <ScoreRow label="Sleep"
            options={[['Unaffected',2],['Occasionally disturbed',1],['Severely disturbed',0]]}
            value={cmsAdl3} onChange={setCmsAdl3} color="emerald"/>
          <ScoreRow label="Hand position (highest pain-free)"
            options={[['Up to waist',2],['Up to xiphoid',4],['Up to neck',6],['Top of head',8],['Above head',10]]}
            value={cmsAdl4} onChange={setCmsAdl4} color="emerald"/>
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-xs text-emerald-700">
            ROM score (auto): {cmsRomScore}/40 | ADL: {cmsAdlTotal ?? '?'}/20 | Pain: {cmsAdlTotal !== null && cmsAdl1 !== null ? cmsAdl1 : '?'}/15
          </div>
          {cmsInterp && (
            <div className={`rounded-lg px-4 py-2 text-sm font-semibold border ${cmsInterp.color}`}>
              Constant-Murley: {cmsTotal} — {cmsInterp.label}
            </div>
          )}
        </div>

        {/* QuickDASH */}
        <div className="space-y-3 pt-3 border-t border-gray-200">
          <p className="text-sm font-semibold text-emerald-800">QuickDASH (0 = no disability, 100 = most disability)</p>
          <p className="text-xs text-gray-500">1 = No difficulty → 5 = Unable</p>
          {QDASH_ITEMS.map(item => (
            <ScoreRow key={item.key} label={item.label}
              options={[['No diff.',1],['Mild',2],['Moderate',3],['Severe',4],['Unable',5]]}
              value={qdashScores[item.key]}
              onChange={v => setQdashScores(s => ({ ...s, [item.key]: v }))}
              color="emerald"/>
          ))}
          {qdashInterp && (
            <div className={`rounded-lg px-4 py-2 text-sm font-semibold border ${qdashInterp.color}`}>
              QuickDASH: {qdashTotal}/100 — {qdashInterp.label}
            </div>
          )}
        </div>
      </Section>

      {/* Section 7 — Management */}
      <Section title="7. Diagnosis & Management Plan" applicable={appManage} onApplicable={setAppManage} color="rose">
        <FL label="Working diagnosis" sub="multi-select">
          <Pills options={['Subacromial impingement syndrome','RC tear — partial','RC tear — full thickness','Massive RC tear','Calcific tendinitis','Adhesive capsulitis (frozen shoulder)','Glenohumeral OA','AC joint OA / injury','Anterior instability (chronic)','Posterior instability','MDI (multi-directional)','SLAP lesion','Biceps tendinopathy','Biceps tendon rupture (LH)','Proximal humerus fracture','Clavicle fracture','AC joint dislocation','Shoulder arthroplasty failure','Cervical radiculopathy (referred)']} value={diagnosis} onChange={setDiagnosis} multi color="rose"/>
        </FL>
        <FL label="Conservative management" sub="multi-select">
          <Pills options={['Activity modification','NSAIDs (Naproxen/Diclofenac)','Paracetamol','Sling (acute fracture/dislocation)','Ice / heat','Physiotherapy referral','Cervical spine treatment (if referred pain)']} value={conservative} onChange={setConservative} multi color="rose"/>
        </FL>
        <FL label="Physiotherapy plan" sub="multi-select">
          <Pills options={['RC strengthening programme','Posterior capsule stretching (sleeper stretch)','Scapular stabilisation exercises','Pendulum (Codman) exercises','Hydrodilatation / capsular stretching','Proprioception training','Posture correction','Return-to-sport protocol','Home exercise programme']} value={physioPlan} onChange={setPhysioPlan} multi color="rose"/>
        </FL>
        <FL label="Injection plan">
          <Pills options={['Subacromial corticosteroid','Glenohumeral corticosteroid','AC joint corticosteroid','Hydrodilatation (frozen shoulder)','PRP (RC tendinopathy)','Calcific tendinitis needling + aspiration','No injection']} value={injectionPlan} onChange={setInjectionPlan} color="rose"/>
        </FL>
        <Gate label="Surgical referral / planning?" value={surgical} onChange={setSurgical} color="rose">
          <FL label="Planned procedure" sub="multi-select">
            <Pills options={['Arthroscopic subacromial decompression (ASD)','Arthroscopic RC repair (partial)','Arthroscopic RC repair (full thickness)','Open RC repair (massive)','Superior capsular reconstruction (SCR)','Arthroscopic SLAP repair','Bankart repair (arthroscopic)','Latarjet procedure (bony Bankart)','Arthroscopic capsular release (frozen shoulder)','Biceps tenodesis','Biceps tenotomy','AC joint reconstruction','Total shoulder replacement (TSR)','Reverse shoulder arthroplasty (RSA — massive RC + OA)','Hemi-arthroplasty']} value={surgicalPlan} onChange={setSurgicalPlan} multi color="rose"/>
          </FL>
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
            India: Arthroscopic RC repair widely available at tertiary centres. Reverse shoulder arthroplasty increasingly available (₹3–6 lakhs). Physiotherapy is first-line for impingement — surgery if failed 3+ months conservative care. Frozen shoulder: hydrodilatation + aggressive physio before MUA/capsular release.
          </div>
        </Gate>
        <FL label="Follow-up">
          <Pills options={['2 weeks (post-injection)','4 weeks','6 weeks','3 months','6 months','PRN']} value={followUp} onChange={setFollowUp} color="rose"/>
        </FL>
      </Section>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 text-white font-semibold shadow hover:from-cyan-700 hover:to-blue-800 disabled:opacity-50 transition-all">
        {saving ? 'Saving…' : 'Save Shoulder Assessment'}
      </button>
    </div>
  );
}
