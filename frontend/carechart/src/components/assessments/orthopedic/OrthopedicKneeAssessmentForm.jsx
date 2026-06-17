/**
 * @shared-pool
 * OrthopedicKneeAssessmentForm — portal-agnostic orthopedic assessment
 * KOOS · Oxford Knee Score · Lysholm · Kellgren-Lawrence OA grading · IKDC
 */

import React, { useState, useMemo } from 'react';
import api from '../../../api/client';

/* ─── Knee Anatomy SVG ───────────────────────────────────── */
const KneeAnatomySVG = ({ highlights = [] }) => {
  const hl = (s) => highlights.includes(s);
  return (
    <svg viewBox="0 0 300 340" className="w-full h-auto max-h-64" role="img" aria-label="Right knee anterior view">
      <rect width="300" height="340" fill="#f8fafc" rx="10"/>
      <text x="150" y="15" textAnchor="middle" fontSize="10" fontWeight="600" fill="#475569">Right Knee — Anterior View</text>
      {/* Femur */}
      <rect x="110" y="22" width="80" height="82" rx="12" fill="#fdefd6" stroke="#d97706" strokeWidth="2"/>
      <text x="150" y="56" textAnchor="middle" fontSize="9" fill="#92400e" fontWeight="500">Femur</text>
      {/* Condyles */}
      <ellipse cx="118" cy="114" rx="30" ry="20" fill="#fdefd6" stroke="#d97706" strokeWidth="1.5"/>
      <ellipse cx="182" cy="114" rx="30" ry="20" fill="#fdefd6" stroke="#d97706" strokeWidth="1.5"/>
      <rect x="135" y="112" width="30" height="18" fill="#f8fafc"/>
      {/* Patella dashed */}
      <ellipse cx="150" cy="108" rx="24" ry="27" fill="none" stroke="#d97706" strokeWidth="2" strokeDasharray="5 3"/>
      <text x="150" y="110" textAnchor="middle" fontSize="7.5" fill="#92400e">Patella</text>
      {/* Medial meniscus C-shape */}
      <path d="M 76,128 C 60,128 55,146 62,158 C 69,170 88,173 97,162"
        fill="none" stroke={hl('med-meniscus') ? '#7c3aed' : '#a78bfa'} strokeWidth={hl('med-meniscus') ? 7 : 5} strokeLinecap="round"/>
      {/* Lateral meniscus O-shape */}
      <ellipse cx="208" cy="148" rx="18" ry="13" fill="none"
        stroke={hl('lat-meniscus') ? '#7c3aed' : '#a78bfa'} strokeWidth={hl('lat-meniscus') ? 7 : 5}/>
      {/* ACL */}
      <line x1="138" y1="132" x2="162" y2="172" stroke={hl('acl') ? '#b91c1c' : '#ef4444'} strokeWidth={hl('acl') ? 5 : 2.5}/>
      {/* PCL */}
      <line x1="162" y1="132" x2="138" y2="172" stroke={hl('pcl') ? '#1d4ed8' : '#60a5fa'} strokeWidth={hl('pcl') ? 5 : 2.5}/>
      {/* MCL */}
      <line x1="84" y1="108" x2="75" y2="200" stroke={hl('mcl') ? '#047857' : '#34d399'} strokeWidth={hl('mcl') ? 5 : 2.5}/>
      {/* LCL */}
      <line x1="216" y1="108" x2="228" y2="192" stroke={hl('lcl') ? '#b45309' : '#fbbf24'} strokeWidth={hl('lcl') ? 5 : 2.5}/>
      {/* Patellar tendon */}
      <rect x="144" y="135" width="12" height="58" rx="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5"/>
      {/* Tibial plateau */}
      <ellipse cx="150" cy="194" rx="52" ry="14" fill="#fdefd6" stroke="#d97706" strokeWidth="1.5"/>
      {/* Tibia */}
      <rect x="112" y="196" width="76" height="118" rx="12" fill="#fdefd6" stroke="#d97706" strokeWidth="2"/>
      <text x="150" y="248" textAnchor="middle" fontSize="9" fill="#92400e" fontWeight="500">Tibia</text>
      {/* Fibula */}
      <rect x="198" y="205" width="22" height="100" rx="5" fill="#fdefd6" stroke="#d97706" strokeWidth="1.5"/>
      <text x="214" y="252" textAnchor="middle" fontSize="8" fill="#92400e">Fibula</text>
      {/* Labels */}
      <text x="36" y="147" textAnchor="middle" fontSize="7.5" fill="#7c3aed">Med.</text>
      <text x="36" y="157" textAnchor="middle" fontSize="7.5" fill="#7c3aed">Men.</text>
      <text x="240" y="145" textAnchor="middle" fontSize="7.5" fill="#7c3aed">Lat.</text>
      <text x="240" y="155" textAnchor="middle" fontSize="7.5" fill="#7c3aed">Men.</text>
      <text x="168" y="150" fontSize="7.5" fill="#b91c1c" fontWeight="600">ACL</text>
      <text x="114" y="150" fontSize="7.5" fill="#1d4ed8" fontWeight="600">PCL</text>
      <text x="44" y="160" fontSize="7.5" fill="#047857" fontWeight="600">MCL</text>
      <text x="230" y="148" fontSize="7.5" fill="#b45309" fontWeight="600">LCL</text>
      {/* Legend */}
      <rect x="4" y="288" width="292" height="46" rx="6" fill="#f1f5f9"/>
      <line x1="14" y1="298" x2="34" y2="298" stroke="#ef4444" strokeWidth="2.5"/><text x="38" y="302" fontSize="7.5" fill="#374151">ACL</text>
      <line x1="70" y1="298" x2="90" y2="298" stroke="#60a5fa" strokeWidth="2.5"/><text x="94" y="302" fontSize="7.5" fill="#374151">PCL</text>
      <line x1="126" y1="298" x2="146" y2="298" stroke="#34d399" strokeWidth="2.5"/><text x="150" y="302" fontSize="7.5" fill="#374151">MCL</text>
      <line x1="186" y1="298" x2="206" y2="298" stroke="#fbbf24" strokeWidth="2.5"/><text x="210" y="302" fontSize="7.5" fill="#374151">LCL</text>
      <line x1="14" y1="316" x2="34" y2="316" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round"/><text x="38" y="320" fontSize="7.5" fill="#374151">Meniscus</text>
      <rect x="120" y="310" width="18" height="10" rx="2" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5"/><text x="142" y="320" fontSize="7.5" fill="#374151">Patellar tendon</text>
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
        const val = typeof o === 'string' ? o : (o.value ?? o.label);
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
          <button type="button" onClick={() => onApplicable('Yes')} className="px-3 py-1 rounded-full border border-gray-300 text-xs text-gray-500 hover:border-gray-400">Reopen</button>
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

/* ─── Scoring row ─────────────────────────────────────────── */
const ScoreRow = ({ label, options, value, onChange, color = 'blue' }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
    <span className="text-xs text-gray-600 w-44 shrink-0">{label}</span>
    <div className="flex flex-wrap gap-1.5">
      {options.map(([text, score]) => (
        <button key={score} type="button" onClick={() => onChange(value === score ? null : score)}
          className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${value === score
            ? `bg-${color}-600 text-white border-${color}-600`
            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
          {text} <span className="opacity-70">({score})</span>
        </button>
      ))}
    </div>
  </div>
);

/* ─── main form ─────────────────────────────────────────────── */
export default function OrthopedicKneeAssessmentForm({ patientId, encounterId, onSave }) {
  const [saving, setSaving] = useState(false);

  /* Section gates */
  const [appPresent,    setAppPresent]    = useState(null);
  const [appHistory,    setAppHistory]    = useState(null);
  const [appExam,       setAppExam]       = useState(null);
  const [appSpecial,    setAppSpecial]    = useState(null);
  const [appImaging,    setAppImaging]    = useState(null);
  const [appScoring,    setAppScoring]    = useState(null);
  const [appManagement, setAppManagement] = useState(null);

  /* ── Presentation ── */
  const [side,            setSide]            = useState(null);
  const [chiefComplaint,  setChiefComplaint]  = useState([]);
  const [onset,           setOnset]           = useState(null);
  const [duration,        setDuration]        = useState(null);
  const [mechanism,       setMechanism]       = useState(null);
  const [structuresHighlight, setStructuresHighlight] = useState([]);

  /* ── History ── */
  const [vasRest,         setVasRest]         = useState('');
  const [vasActivity,     setVasActivity]     = useState('');
  const [swelling,        setSwelling]        = useState(null);
  const [swellingOnset,   setSwellingOnset]   = useState(null);
  const [locking,         setLocking]         = useState(null);
  const [givingWay,       setGivingWay]       = useState(null);
  const [clicking,        setClicking]        = useState(null);
  const [stiffness,       setStiffness]       = useState(null);
  const [stiffnessWhen,   setStiffnessWhen]   = useState([]);
  const [walkingDistance, setWalkingDistance] = useState(null);
  const [stairsAbility,   setStairsAbility]   = useState(null);
  const [priorInjury,     setPriorInjury]     = useState(null);
  const [priorInjuryType, setPriorInjuryType] = useState([]);
  const [priorSurgery,    setPriorSurgery]    = useState(null);
  const [priorSurgeryType,setPriorSurgeryType]= useState([]);
  const [injections,      setInjections]      = useState([]);
  const [activityLevel,   setActivityLevel]   = useState(null);
  const [sport,           setSport]           = useState(null);
  const [bmi,             setBmi]             = useState('');

  /* ── Physical Examination ── */
  const [gait,            setGait]            = useState(null);
  const [alignmentCoronal,setAlignmentCoronal]= useState(null); /* varus/valgus/neutral */
  const [alignmentSagittal,setAlignmentSagittal]=useState(null); /* recurvatum/flexion contracture */
  const [muscleWasting,   setMuscleWasting]   = useState(null);
  const [effusion,        setEffusion]        = useState(null);
  const [effusionGrade,   setEffusionGrade]   = useState(null);
  const [warmth,          setWarmth]          = useState(null);
  const [tenderness,      setTenderness]      = useState([]);
  const [romFlex,         setRomFlex]         = useState('');
  const [romExt,          setRomExt]          = useState('');
  const [romExtDeficit,   setRomExtDeficit]   = useState('');
  const [quadStrength,    setQuadStrength]    = useState(null);
  const [hamStringStrength,setHamStringStrength]=useState(null);
  const [patellaPosition, setPatellaPosition] = useState(null);
  const [patellaTracking, setPatellaTracking] = useState(null);

  /* ── Special Tests ── */
  const [lachmans,        setLachmans]        = useState(null);
  const [anteriorDrawer,  setAnteriorDrawer]  = useState(null);
  const [pivotShift,      setPivotShift]      = useState(null);
  const [posteriorDrawer, setPosteriorDrawer] = useState(null);
  const [valgusStress,    setValgusStress]    = useState(null);
  const [varusStress,     setVarusStress]     = useState(null);
  const [mcMurray,        setMcMurray]        = useState(null);
  const [apley,           setApley]           = useState(null);
  const [thessaly,        setThessaly]        = useState(null);
  const [patellaGrind,    setPatellaGrind]    = useState(null);
  const [patellaApprehension,setPatellaApprehension]=useState(null);
  const [patellaTilt,     setPatellaTilt]     = useState(null);
  const [ober,            setOber]            = useState(null);
  const [poplyFossa,      setPoplyFossa]      = useState(null); /* popliteal cyst */

  /* ── Imaging ── */
  const [xrayDone,        setXrayDone]        = useState(null);
  const [klGrade,         setKlGrade]         = useState(null);
  const [compartment,     setCompartment]     = useState(null);
  const [jsn,             setJsn]             = useState(null);
  const [osteophytes,     setOsteophytes]     = useState(null);
  const [mriDone,         setMriDone]         = useState(null);
  const [mriAcl,          setMriAcl]          = useState(null);
  const [mriPcl,          setMriPcl]          = useState(null);
  const [mriMedMeniscus,  setMriMedMeniscus]  = useState(null);
  const [mriLatMeniscus,  setMriLatMeniscus]  = useState(null);
  const [mriCartilage,    setMriCartilage]    = useState(null);
  const [mriBoneEdema,    setMriBoneEdema]    = useState(null);
  const [mriPoplitealCyst,setMriPoplitealCyst]= useState(null);
  const [mriSynovitis,    setMriSynovitis]    = useState(null);

  /* ── Oxford Knee Score (12 items, 0–4 each, total 0–48, higher = better) ── */
  const OKS_ITEMS = [
    { key: 'oks_pain', label: 'Pain severity' },
    { key: 'oks_wash', label: 'Washing/drying difficulty' },
    { key: 'oks_transport', label: 'Transport difficulty' },
    { key: 'oks_socks', label: 'Putting on socks/stockings' },
    { key: 'oks_shopping', label: 'Shopping ability' },
    { key: 'oks_stairs', label: 'Stairs' },
    { key: 'oks_standing', label: 'Standing 1 hour' },
    { key: 'oks_limping', label: 'Limping' },
    { key: 'oks_work', label: 'Work/housework' },
    { key: 'oks_night', label: 'Night pain' },
    { key: 'oks_interfere', label: 'Pain interfering with life' },
    { key: 'oks_walking', label: 'Walking' },
  ];
  const [oksScores, setOksScores] = useState(() => Object.fromEntries(OKS_ITEMS.map(i => [i.key, null])));

  /* ── Lysholm score (8 items) ── */
  const [lysLimp,         setLysLimp]         = useState(null);
  const [lysSupport,      setLysSupport]       = useState(null);
  const [lysLocking,      setLysLocking]       = useState(null);
  const [lysInstability,  setLysInstability]   = useState(null);
  const [lysPain,         setLysPain]          = useState(null);
  const [lysSwelling,     setLysSwelling]      = useState(null);
  const [lysStairs,       setLysStairs]        = useState(null);
  const [lysSqauting,     setLysSqauting]      = useState(null);

  /* ── Management ── */
  const [diagnosis,       setDiagnosis]        = useState([]);
  const [conservative,    setConservative]     = useState([]);
  const [physioPlan,      setPhysioPlan]       = useState([]);
  const [injectionPlan,   setInjectionPlan]    = useState(null);
  const [surgical,        setSurgical]         = useState(null);
  const [surgicalPlan,    setSurgicalPlan]     = useState([]);
  const [followUp,        setFollowUp]         = useState(null);

  /* ─── computed: OKS total ────────────────────────────────── */
  const oksTotal = useMemo(() => {
    const vals = Object.values(oksScores);
    if (vals.some(v => v === null)) return null;
    return vals.reduce((s, v) => s + v, 0);
  }, [oksScores]);

  const oksInterpretation = useMemo(() => {
    if (oksTotal === null) return null;
    if (oksTotal >= 41) return { label: 'Satisfactory (41–48)', color: 'bg-green-100 border-green-400 text-green-800' };
    if (oksTotal >= 34) return { label: 'Borderline (34–40)', color: 'bg-yellow-100 border-yellow-400 text-yellow-800' };
    if (oksTotal >= 27) return { label: 'Moderate difficulty (27–33)', color: 'bg-orange-100 border-orange-400 text-orange-800' };
    return { label: 'Severe (0–26) — surgical review recommended', color: 'bg-red-100 border-red-400 text-red-800' };
  }, [oksTotal]);

  /* ─── computed: Lysholm total ───────────────────────────── */
  const lysholmTotal = useMemo(() => {
    const vals = [lysLimp, lysSupport, lysLocking, lysInstability, lysPain, lysSwelling, lysStairs, lysSqauting];
    if (vals.some(v => v === null)) return null;
    return vals.reduce((s, v) => s + v, 0);
  }, [lysLimp, lysSupport, lysLocking, lysInstability, lysPain, lysSwelling, lysStairs, lysSqauting]);

  const lysholmInterp = useMemo(() => {
    if (lysholmTotal === null) return null;
    if (lysholmTotal >= 95) return { label: 'Excellent (95–100)', color: 'bg-green-100 border-green-400 text-green-800' };
    if (lysholmTotal >= 84) return { label: 'Good (84–94)', color: 'bg-blue-100 border-blue-400 text-blue-800' };
    if (lysholmTotal >= 65) return { label: 'Fair (65–83)', color: 'bg-yellow-100 border-yellow-400 text-yellow-800' };
    return { label: 'Poor (<65) — significant knee dysfunction', color: 'bg-red-100 border-red-400 text-red-800' };
  }, [lysholmTotal]);

  /* ─── computed: KL OA severity ──────────────────────────── */
  const klSeverity = useMemo(() => {
    if (!klGrade) return null;
    const map = {
      'Grade 0 — Normal': { label: 'No OA', color: 'bg-green-100 border-green-400 text-green-800' },
      'Grade I — Doubtful': { label: 'Doubtful OA', color: 'bg-green-100 border-green-400 text-green-800' },
      'Grade II — Mild': { label: 'Mild OA — conservative management', color: 'bg-yellow-100 border-yellow-400 text-yellow-800' },
      'Grade III — Moderate': { label: 'Moderate OA — optimise non-surgical; consider joint injection', color: 'bg-orange-100 border-orange-400 text-orange-800' },
      'Grade IV — Severe': { label: 'Severe OA — TKR candidacy review', color: 'bg-red-100 border-red-400 text-red-800' },
    };
    return map[klGrade] || null;
  }, [klGrade]);

  /* ─── computed: ligament injury summary ─────────────────── */
  const ligamentFlags = useMemo(() => {
    const flags = [];
    if (lachmans === 'Positive' || anteriorDrawer === 'Positive' || pivotShift === 'Positive') flags.push('ACL injury suspected');
    if (posteriorDrawer === 'Positive') flags.push('PCL injury suspected');
    if (valgusStress === 'Positive') flags.push('MCL injury suspected');
    if (varusStress === 'Positive') flags.push('LCL injury suspected');
    if (mcMurray === 'Positive' || apley === 'Positive' || thessaly === 'Positive') flags.push('Meniscal pathology suspected');
    return flags;
  }, [lachmans, anteriorDrawer, pivotShift, posteriorDrawer, valgusStress, varusStress, mcMurray, apley, thessaly]);

  /* ─── save ────────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/assessments', {
        type: 'orthopedic_knee', patientId, encounterId,
        presentation: { side, chiefComplaint, onset, duration, mechanism, structuresHighlight },
        history: { vasRest, vasActivity, swelling, swellingOnset, locking, givingWay, clicking, stiffness, stiffnessWhen, walkingDistance, stairsAbility, priorInjury, priorInjuryType, priorSurgery, priorSurgeryType, injections, activityLevel, sport, bmi },
        exam: { gait, alignmentCoronal, alignmentSagittal, muscleWasting, effusion, effusionGrade, warmth, tenderness, romFlex, romExt, romExtDeficit, quadStrength, hamStringStrength, patellaPosition, patellaTracking },
        specialTests: { lachmans, anteriorDrawer, pivotShift, posteriorDrawer, valgusStress, varusStress, mcMurray, apley, thessaly, patellaGrind, patellaApprehension, patellaTilt, ober, poplyFossa },
        imaging: { xrayDone, klGrade, compartment, jsn, osteophytes, mriDone, mriAcl, mriPcl, mriMedMeniscus, mriLatMeniscus, mriCartilage, mriBoneEdema, mriPoplitealCyst, mriSynovitis },
        scoring: { oksScores, oksTotal, oksInterpretation: oksInterpretation?.label, lysholmTotal, lysholmInterp: lysholmInterp?.label },
        management: { diagnosis, conservative, physioPlan, injectionPlan, surgical, surgicalPlan, followUp },
        computed: { ligamentFlags, klSeverity: klSeverity?.label },
      });
      onSave?.();
    } finally { setSaving(false); }
  };

  const urgentLigament = ligamentFlags.length > 0 && mechanism === 'Acute trauma / sports injury';

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-10">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-1">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
          <h2 className="text-xl font-bold">Ortho — Knee Assessment</h2>
        </div>
        <p className="text-sm text-blue-200 mb-3">KOOS · Oxford Knee Score · Lysholm · Kellgren-Lawrence OA · IKDC</p>
        {urgentLigament && (
          <div className="bg-red-600 rounded-lg px-4 py-2 text-sm font-semibold animate-pulse mb-2">
            ⚠ Acute ligament injury suspected — imaging & urgent ortho review
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {oksInterpretation && (
            <span className={`rounded-lg px-3 py-1 text-xs font-semibold border ${oksInterpretation.color}`}>
              OKS {oksTotal}/48 — {oksInterpretation.label.split(' (')[0]}
            </span>
          )}
          {lysholmInterp && (
            <span className={`rounded-lg px-3 py-1 text-xs font-semibold border ${lysholmInterp.color}`}>
              Lysholm {lysholmTotal}/100 — {lysholmInterp.label.split(' (')[0]}
            </span>
          )}
          {klSeverity && (
            <span className={`rounded-lg px-3 py-1 text-xs font-semibold border ${klSeverity.color}`}>
              KL: {klSeverity.label.split(' —')[0]}
            </span>
          )}
        </div>
      </div>

      {/* Section 1 — Presentation + Anatomy SVG */}
      <Section title="1. Presentation" applicable={appPresent} onApplicable={setAppPresent} color="blue">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FL label="Side affected">
              <Pills options={['Right','Left','Bilateral']} value={side} onChange={setSide} color="blue" />
            </FL>
            <div className="mt-3">
              <FL label="Chief complaint" sub="multi-select">
                <Pills options={['Pain','Swelling','Locking','Giving way','Stiffness','Clicking/crepitus','Deformity','Inability to weight-bear']} value={chiefComplaint} onChange={setChiefComplaint} multi color="blue" />
              </FL>
            </div>
            <div className="mt-3">
              <FL label="Onset">
                <Pills options={['Acute (<48 h)','Subacute (days–weeks)','Chronic (>3 months)','Acute on chronic']} value={onset} onChange={setOnset} color="blue" />
              </FL>
            </div>
            <div className="mt-3">
              <FL label="Mechanism">
                <Pills options={['Acute trauma / sports injury','Twisting / pivoting','Direct blow','Gradual onset','Overuse','Post-operative','No clear mechanism']} value={mechanism} onChange={setMechanism} color="blue" />
              </FL>
            </div>
            <div className="mt-3">
              <FL label="Tap structure on SVG (highlight)" sub="multi-select">
                <Pills options={[{label:'ACL',value:'acl'},{label:'PCL',value:'pcl'},{label:'MCL',value:'mcl'},{label:'LCL',value:'lcl'},{label:'Medial Meniscus',value:'med-meniscus'},{label:'Lateral Meniscus',value:'lat-meniscus'}]} value={structuresHighlight} onChange={setStructuresHighlight} multi color="indigo" />
              </FL>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-blue-100 shadow-sm">
            <KneeAnatomySVG highlights={structuresHighlight} />
          </div>
        </div>
      </Section>

      {/* Section 2 — History */}
      <Section title="2. History & Symptom Characterisation" applicable={appHistory} onApplicable={setAppHistory} color="indigo">
        <div className="grid grid-cols-2 gap-3">
          <FL label="VAS at rest" sub="0–10">
            <input type="number" min="0" max="10" value={vasRest} onChange={e => setVasRest(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400" placeholder="0–10" />
          </FL>
          <FL label="VAS on activity" sub="0–10">
            <input type="number" min="0" max="10" value={vasActivity} onChange={e => setVasActivity(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400" placeholder="0–10" />
          </FL>
        </div>
        <FL label="Swelling">
          <Pills options={['None','Mild (minimal)','Moderate','Severe (tense)','Recurrent']} value={swelling} onChange={setSwelling} color="indigo" />
        </FL>
        {swelling && swelling !== 'None' && (
          <FL label="Swelling onset">
            <Pills options={['Immediate (<2 h — haemarthrosis)','Within 6–12 h','Delayed (>12 h — synovial effusion)']} value={swellingOnset} onChange={setSwellingOnset} color="indigo" />
          </FL>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <FL label="Locking (true)">
            <Pills options={['Yes','No']} value={locking} onChange={setLocking} color="indigo" />
          </FL>
          <FL label="Giving way">
            <Pills options={['Yes','No']} value={givingWay} onChange={setGivingWay} color="indigo" />
          </FL>
          <FL label="Clicking/crepitus">
            <Pills options={['Yes','No']} value={clicking} onChange={setClicking} color="indigo" />
          </FL>
        </div>
        <FL label="Stiffness">
          <Pills options={['None','Morning stiffness (<30 min — OA)','Morning stiffness (>30 min — inflammatory)','Activity-related','All day']} value={stiffness} onChange={setStiffness} color="indigo" />
        </FL>
        <FL label="Walking distance">
          <Pills options={['Unlimited','1 km+','500 m','100–500 m','<100 m','Housebound','Cannot weight-bear']} value={walkingDistance} onChange={setWalkingDistance} color="indigo" />
        </FL>
        <FL label="Stairs">
          <Pills options={['Normal','Rail needed','One step at a time','Unable']} value={stairsAbility} onChange={setStairsAbility} color="indigo" />
        </FL>
        <FL label="Activity level">
          <Pills options={['Sedentary','Light activity','Moderate (walking/cycling)','Active (sport <2/wk)','Competitive sport']} value={activityLevel} onChange={setActivityLevel} color="indigo" />
        </FL>
        <Gate label="Prior knee injury?" value={priorInjury} onChange={setPriorInjury} color="indigo">
          <FL label="Type" sub="multi-select">
            <Pills options={['ACL tear','PCL tear','Meniscal tear','MCL sprain','LCL sprain','Patella dislocation','Fracture','Osteochondral injury','Unknown']} value={priorInjuryType} onChange={setPriorInjuryType} multi color="indigo" />
          </FL>
        </Gate>
        <Gate label="Prior knee surgery?" value={priorSurgery} onChange={setPriorSurgery} color="indigo">
          <FL label="Surgery type" sub="multi-select">
            <Pills options={['ACL reconstruction','Meniscectomy (partial)','Meniscal repair','Chondroplasty','Microfracture','TKR','HTO (osteotomy)','Patella stabilisation','Arthroscopy (diagnostic)','Other']} value={priorSurgeryType} onChange={setPriorSurgeryType} multi color="indigo" />
          </FL>
        </Gate>
        <FL label="Previous injections">
          <Pills options={['None','Steroid (corticosteroid)','Hyaluronic acid (viscosupplementation)','PRP','Stem cell']} value={injections} onChange={setInjections} multi color="indigo" />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="BMI" sub="kg/m²">
            <input type="number" step="0.1" value={bmi} onChange={e => setBmi(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400" placeholder="e.g. 28.4" />
          </FL>
          <FL label="Sport / occupation">
            <Pills options={['Manual labour','Desk job','Cricket/football','Running','Weightlifting','None / retired']} value={sport} onChange={setSport} color="indigo" />
          </FL>
        </div>
        {Number(bmi) >= 30 && (
          <p className="text-xs text-orange-700 font-medium">BMI ≥30 — obesity is a modifiable risk factor for knee OA; weight management counselling recommended</p>
        )}
      </Section>

      {/* Section 3 — Physical Examination */}
      <Section title="3. Physical Examination" applicable={appExam} onApplicable={setAppExam} color="cyan">
        <FL label="Gait">
          <Pills options={['Normal','Antalgic','Trendelenburg','Varus thrust','Valgus thrust','High-steppage','Unable to walk']} value={gait} onChange={setGait} color="cyan" />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Coronal alignment">
            <Pills options={['Neutral','Varus (bow-legged)','Valgus (knock-kneed)']} value={alignmentCoronal} onChange={setAlignmentCoronal} color="cyan" />
          </FL>
          <FL label="Sagittal alignment">
            <Pills options={['Normal','Flexion contracture','Recurvatum (hyperextension)']} value={alignmentSagittal} onChange={setAlignmentSagittal} color="cyan" />
          </FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Quadriceps wasting">
            <Pills options={['None','Mild','Moderate','Severe']} value={muscleWasting} onChange={setMuscleWasting} color="cyan" />
          </FL>
          <FL label="Warmth">
            <Pills options={['None','Present']} value={warmth} onChange={setWarmth} color="cyan" />
          </FL>
        </div>
        <FL label="Effusion">
          <Pills options={['None','Trace','Grade 1 (small)','Grade 2 (moderate)','Grade 3 (large/tense)']} value={effusion} onChange={setEffusion} color="cyan" />
        </FL>
        <FL label="Tenderness location" sub="multi-select">
          <Pills options={['Medial joint line','Lateral joint line','Medial collateral ligament','Lateral collateral ligament','Patellar tendon','Tibial tuberosity','Pes anserinus','Popliteal fossa','Patella facets','Hoffa fat pad','Iliotibial band']} value={tenderness} onChange={setTenderness} multi color="cyan" />
        </FL>
        <div className="grid grid-cols-3 gap-3">
          <FL label="ROM Flexion" sub="°">
            <input type="number" value={romFlex} onChange={e => setRomFlex(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400" placeholder="e.g. 120" />
          </FL>
          <FL label="ROM Extension" sub="°">
            <input type="number" value={romExt} onChange={e => setRomExt(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400" placeholder="e.g. 0" />
          </FL>
          <FL label="Extension deficit" sub="°">
            <input type="number" value={romExtDeficit} onChange={e => setRomExtDeficit(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400" placeholder="e.g. 15" />
          </FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Quadriceps strength (MRC)">
            <Pills options={['5 — Normal','4 — Against resistance','3 — Against gravity','2 — Movement with gravity eliminated','1 — Flicker','0 — None']} value={quadStrength} onChange={setQuadStrength} color="cyan" />
          </FL>
          <FL label="Hamstring strength (MRC)">
            <Pills options={['5 — Normal','4 — Against resistance','3 — Against gravity','2 — Gravity eliminated','1 — Flicker','0 — None']} value={hamStringStrength} onChange={setHamStringStrength} color="cyan" />
          </FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Patella position">
            <Pills options={['Central','Alta (high)','Baja (low)','Lateral tilt','Lateral glide']} value={patellaPosition} onChange={setPatellaPosition} color="cyan" />
          </FL>
          <FL label="Patella tracking">
            <Pills options={['Normal J-tracking','J-sign present','Lateral subluxation','No tracking assessed']} value={patellaTracking} onChange={setPatellaTracking} color="cyan" />
          </FL>
        </div>
      </Section>

      {/* Section 4 — Special Tests */}
      <Section title="4. Special Tests" applicable={appSpecial} onApplicable={setAppSpecial} color="violet">
        {ligamentFlags.length > 0 && (
          <div className="rounded-lg bg-red-50 border border-red-300 px-4 py-2 space-y-1">
            {ligamentFlags.map(f => <p key={f} className="text-sm text-red-700 font-semibold">⚠ {f}</p>)}
          </div>
        )}
        <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">ACL Tests</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FL label="Lachman's test">
            <Pills options={['Positive','Negative','Not done']} value={lachmans} onChange={setLachmans} color="violet" />
          </FL>
          <FL label="Anterior drawer">
            <Pills options={['Positive','Negative','Not done']} value={anteriorDrawer} onChange={setAnteriorDrawer} color="violet" />
          </FL>
          <FL label="Pivot shift">
            <Pills options={['Positive','Negative','Not done']} value={pivotShift} onChange={setPivotShift} color="violet" />
          </FL>
        </div>
        <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">PCL & Collateral Tests</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FL label="Posterior drawer">
            <Pills options={['Positive','Negative','Not done']} value={posteriorDrawer} onChange={setPosteriorDrawer} color="violet" />
          </FL>
          <FL label="Valgus stress (MCL)">
            <Pills options={['Positive','Negative','Not done']} value={valgusStress} onChange={setValgusStress} color="violet" />
          </FL>
          <FL label="Varus stress (LCL)">
            <Pills options={['Positive','Negative','Not done']} value={varusStress} onChange={setVarusStress} color="violet" />
          </FL>
        </div>
        <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Meniscal Tests</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FL label="McMurray's test">
            <Pills options={['Positive (medial)','Positive (lateral)','Negative','Not done']} value={mcMurray} onChange={setMcMurray} color="violet" />
          </FL>
          <FL label="Apley's grind">
            <Pills options={['Positive','Negative','Not done']} value={apley} onChange={setApley} color="violet" />
          </FL>
          <FL label="Thessaly test (20°)">
            <Pills options={['Positive','Negative','Not done']} value={thessaly} onChange={setThessaly} color="violet" />
          </FL>
        </div>
        <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Patellofemoral Tests</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FL label="Patella grind / Clarke's">
            <Pills options={['Positive','Negative','Not done']} value={patellaGrind} onChange={setPatellaGrind} color="violet" />
          </FL>
          <FL label="Patella apprehension">
            <Pills options={['Positive','Negative','Not done']} value={patellaApprehension} onChange={setPatellaApprehension} color="violet" />
          </FL>
          <FL label="Patella tilt test">
            <Pills options={['Positive (tight lat. retinaculum)','Negative','Not done']} value={patellaTilt} onChange={setPatellaTilt} color="violet" />
          </FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Ober's test (ITB tightness)">
            <Pills options={['Positive','Negative','Not done']} value={ober} onChange={setOber} color="violet" />
          </FL>
          <FL label="Popliteal cyst / fullness">
            <Pills options={['Present','Absent','Not examined']} value={poplyFossa} onChange={setPoplyFossa} color="violet" />
          </FL>
        </div>
      </Section>

      {/* Section 5 — Imaging */}
      <Section title="5. Radiological Investigations" applicable={appImaging} onApplicable={setAppImaging} color="sky">
        <Gate label="X-ray done?" value={xrayDone} onChange={setXrayDone} color="sky">
          <FL label="Kellgren-Lawrence OA grade">
            <Pills options={['Grade 0 — Normal','Grade I — Doubtful','Grade II — Mild','Grade III — Moderate','Grade IV — Severe']} value={klGrade} onChange={setKlGrade} color="sky" />
          </FL>
          {klSeverity && (
            <div className={`rounded-lg px-4 py-2 text-sm font-semibold border ${klSeverity.color}`}>
              {klSeverity.label}
            </div>
          )}
          <FL label="Compartment most affected">
            <Pills options={['Medial tibiofemoral','Lateral tibiofemoral','Patellofemoral','Tricompartmental']} value={compartment} onChange={setCompartment} color="sky" />
          </FL>
          <FL label="Joint space narrowing">
            <Pills options={['None','Mild (<25%)','Moderate (25–50%)','Severe (>50%)','Bone-on-bone']} value={jsn} onChange={setJsn} color="sky" />
          </FL>
          <FL label="Osteophytes">
            <Pills options={['None','Marginal (doubtful)','Definite — small','Definite — large']} value={osteophytes} onChange={setOsteophytes} color="sky" />
          </FL>
        </Gate>
        <Gate label="MRI done?" value={mriDone} onChange={setMriDone} color="sky">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <FL label="ACL signal">
              <Pills options={['Intact','Partial tear','Complete tear','Post-reconstruction']} value={mriAcl} onChange={setMriAcl} color="sky" />
            </FL>
            <FL label="PCL signal">
              <Pills options={['Intact','Partial tear','Complete tear']} value={mriPcl} onChange={setMriPcl} color="sky" />
            </FL>
            <FL label="Medial meniscus">
              <Pills options={['Normal','Grade I','Grade II','Grade III tear — posterior horn','Grade III tear — anterior horn','Radial tear','Bucket-handle tear','Degenerative (complex)']} value={mriMedMeniscus} onChange={setMriMedMeniscus} color="sky" />
            </FL>
            <FL label="Lateral meniscus">
              <Pills options={['Normal','Grade I','Grade II','Grade III tear','Discoid meniscus']} value={mriLatMeniscus} onChange={setMriLatMeniscus} color="sky" />
            </FL>
            <FL label="Cartilage (MOAKS)">
              <Pills options={['Normal','Grade 1 — signal change only','Grade 2 — partial thickness','Grade 3 — >50% depth','Grade 4 — full thickness']} value={mriCartilage} onChange={setMriCartilage} color="sky" />
            </FL>
            <FL label="Bone marrow oedema">
              <Pills options={['None','Mild','Moderate','Severe (bone bruise / stress)']} value={mriBoneEdema} onChange={setMriBoneEdema} color="sky" />
            </FL>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FL label="Popliteal (Baker's) cyst">
              <Pills options={['None','Small','Large','Ruptured']} value={mriPoplitealCyst} onChange={setMriPoplitealCyst} color="sky" />
            </FL>
            <FL label="Synovitis">
              <Pills options={['None','Mild','Moderate','Severe']} value={mriSynovitis} onChange={setMriSynovitis} color="sky" />
            </FL>
          </div>
        </Gate>
      </Section>

      {/* Section 6 — Scoring */}
      <Section title="6. Outcome Scores" applicable={appScoring} onApplicable={setAppScoring} color="emerald">
        {/* Oxford Knee Score */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-emerald-800">Oxford Knee Score (OKS) — 0–4 per item, 48 = best</p>
          {OKS_ITEMS.map(item => (
            <ScoreRow key={item.key} label={item.label}
              options={[['None/Never',4],['Little/Rarely',3],['Moderate/Sometimes',2],['Severe/Often',1],['Extreme/Always',0]]}
              value={oksScores[item.key]}
              onChange={v => setOksScores(s => ({ ...s, [item.key]: v }))}
              color="emerald" />
          ))}
          {oksInterpretation && (
            <div className={`rounded-lg px-4 py-2 text-sm font-semibold border ${oksInterpretation.color}`}>
              OKS Total: {oksTotal}/48 — {oksInterpretation.label}
            </div>
          )}
        </div>

        {/* Lysholm */}
        <div className="space-y-3 pt-2 border-t border-gray-200">
          <p className="text-sm font-semibold text-emerald-800">Lysholm Knee Score (100 = best)</p>
          <ScoreRow label="Limp" options={[['None',5],['Slight/periodic',3],['Severe/constant',0]]} value={lysLimp} onChange={setLysLimp} color="emerald" />
          <ScoreRow label="Support" options={[['None needed',5],['Stick/crutch',3],['Weight-bearing impossible',0]]} value={lysSupport} onChange={setLysSupport} color="emerald" />
          <ScoreRow label="Locking" options={[['No locking',15],['Catching but no locking',10],['Locking occasionally',6],['Locking frequently',2],['Locked joint on exam',0]]} value={lysLocking} onChange={setLysLocking} color="emerald" />
          <ScoreRow label="Instability" options={[['Never',25],['Rarely (strenuous sport)',20],['Frequently (sport)',15],['Occasionally (daily)',10],['Often (daily)',5],['Every step',0]]} value={lysInstability} onChange={setLysInstability} color="emerald" />
          <ScoreRow label="Pain" options={[['None',25],['Inconstant/slight (strenuous)',20],['Marked (strenuous)',15],['Marked (walking >2 km)',10],['Marked (walking <2 km)',5],['Constant',0]]} value={lysPain} onChange={setLysPain} color="emerald" />
          <ScoreRow label="Swelling" options={[['None',10],['With strenuous activity',6],['With ordinary activity',2],['Constant',0]]} value={lysSwelling} onChange={setLysSwelling} color="emerald" />
          <ScoreRow label="Stairs" options={[['No problems',10],['Slightly impaired',6],['One step at a time',2],['Unable',0]]} value={lysStairs} onChange={setLysStairs} color="emerald" />
          <ScoreRow label="Squatting" options={[['No problems',5],['Slightly impaired',4],['Not past 90°',2],['Unable',0]]} value={lysSqauting} onChange={setLysSqauting} color="emerald" />
          {lysholmInterp && (
            <div className={`rounded-lg px-4 py-2 text-sm font-semibold border ${lysholmInterp.color}`}>
              Lysholm: {lysholmTotal}/100 — {lysholmInterp.label}
            </div>
          )}
        </div>
      </Section>

      {/* Section 7 — Management */}
      <Section title="7. Diagnosis & Management Plan" applicable={appManagement} onApplicable={setAppManagement} color="rose">
        <FL label="Working diagnosis" sub="multi-select">
          <Pills options={['ACL tear','PCL tear','Medial meniscal tear','Lateral meniscal tear','MCL sprain','LCL sprain','OA — medial compartment','OA — lateral compartment','OA — patellofemoral','Osteochondral defect','Patella dislocation/subluxation','Patellar tendinopathy','PFPS (patellofemoral pain)','Plica syndrome','IT band syndrome','Pes anserinus bursitis','Prepatellar bursitis','Baker cyst','Gout','Septic arthritis']} value={diagnosis} onChange={setDiagnosis} multi color="rose" />
        </FL>
        <FL label="Conservative management" sub="multi-select">
          <Pills options={['Activity modification','RICE protocol','NSAIDs (Ibuprofen/Naproxen)','Paracetamol','Duloxetine (chronic OA pain)','Bracing (hinged knee brace)','Patellar taping','Weight loss counselling','Walking aids']} value={conservative} onChange={setConservative} multi color="rose" />
        </FL>
        <FL label="Physiotherapy plan" sub="multi-select">
          <Pills options={['Quadriceps strengthening','VMO strengthening (PFPS)','Hamstring stretching','IT band stretching','Calf stretching','Proprioception/balance training','Hydrotherapy','Gait retraining','Post-surgical rehab protocol','Home exercise programme']} value={physioPlan} onChange={setPhysioPlan} multi color="rose" />
        </FL>
        <FL label="Injection plan">
          <Pills options={['Intra-articular steroid (triamcinolone/methylprednisolone)','Hyaluronic acid','PRP (platelet-rich plasma)','Aspiration only','No injection planned']} value={injectionPlan} onChange={setInjectionPlan} color="rose" />
        </FL>
        <Gate label="Surgical referral / planning?" value={surgical} onChange={setSurgical} color="rose">
          <FL label="Planned procedure" sub="multi-select">
            <Pills options={['ACL reconstruction (BPTB/hamstring graft)','PCL reconstruction','Meniscal repair (arthroscopic)','Partial meniscectomy (arthroscopic)','Chondroplasty/microfracture','ACI (autologous chondrocyte implantation)','HTO (high tibial osteotomy — varus OA)','DFO (distal femoral osteotomy — valgus OA)','TKR — Total Knee Replacement','UKR — Unicompartmental','Patella stabilisation (MPFL reconstruction)','Diagnostic arthroscopy']} value={surgicalPlan} onChange={setSurgicalPlan} multi color="rose" />
          </FL>
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
            India: Primary TKR available under PM-JAY (Ayushman Bharat) at empanelled hospitals. Generic implants 60–70% cost saving. Haemarthrosis after arthroscopy — standard. Rehab: NWB → PWB → FWB by 6 weeks post ACL reconstruction.
          </div>
        </Gate>
        <FL label="Follow-up">
          <Pills options={['2 weeks','4 weeks','6 weeks','3 months','6 months','PRN']} value={followUp} onChange={setFollowUp} color="rose" />
        </FL>
      </Section>

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 text-white font-semibold shadow hover:from-blue-800 hover:to-indigo-800 disabled:opacity-50 transition-all">
        {saving ? 'Saving…' : 'Save Knee Assessment'}
      </button>
    </div>
  );
}
