/** @shared-pool PostOpRehabAssessmentForm — portal-agnostic */
import React, { useState, useMemo } from 'react';
import api from '../../../api/client';

const Pills = ({ options, value, onChange, multi = false, color = 'blue' }) => {
  const toggle = (v) => { if (multi) { const a = Array.isArray(value) ? value : []; onChange(a.includes(v) ? a.filter(x => x !== v) : [...a, v]); } else onChange(value === v ? null : v); };
  const isActive = (v) => multi ? (Array.isArray(value) && value.includes(v)) : value === v;
  return (<div className="flex flex-wrap gap-2">{options.map(o => { const label = typeof o === 'string' ? o : o.label; const val = typeof o === 'string' ? o : (o.value ?? o.label); return (<button key={val} type="button" onClick={() => toggle(val)} className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${isActive(val) ? `bg-${color}-600 text-white border-${color}-600` : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}`}>{label}</button>); })}</div>);
};
const FL = ({ label, sub, children }) => (<div className="space-y-1.5"><label className="block text-sm font-medium text-gray-700">{label}{sub && <span className="ml-1 text-xs text-gray-400 font-normal">{sub}</span>}</label>{children}</div>);
const Gate = ({ label, value, onChange, children, color = 'blue' }) => (<div className="space-y-3"><div className="flex items-center gap-3"><span className="text-sm font-medium text-gray-700">{label}</span><div className="flex gap-2">{['Yes', 'No'].map(opt => (<button key={opt} type="button" onClick={() => onChange(opt)} className={`px-3 py-1 rounded-full border text-sm font-medium transition-all ${value === opt ? (opt === 'Yes' ? `bg-${color}-600 text-white border-${color}-600` : 'bg-gray-500 text-white border-gray-500') : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>{opt}</button>))}</div></div>{value === 'Yes' && <div className="pl-4 border-l-2 border-gray-200 space-y-3">{children}</div>}</div>);
const Section = ({ title, applicable, onApplicable, color = 'blue', children }) => { if (applicable === 'No') return (<div className="rounded-xl border-2 border-dashed border-gray-200 p-4"><div className="flex items-center justify-between"><h3 className="font-semibold text-gray-400">{title}</h3><div className="flex items-center gap-2"><span className="text-xs text-gray-400">🔒 Not applicable — section locked</span><button type="button" onClick={() => onApplicable('Yes')} className="px-3 py-1 rounded-full border border-gray-300 text-xs text-gray-500 hover:border-gray-400">Reopen</button></div></div></div>); return (<div className={`rounded-xl border border-${color}-100 bg-${color}-50/30 p-5 space-y-4`}><div className="flex items-center justify-between"><h3 className={`font-semibold text-${color}-900`}>{title}</h3><div className="flex items-center gap-2 text-xs text-gray-500"><span>Applicable?</span>{['Yes', 'No'].map(opt => (<button key={opt} type="button" onClick={() => onApplicable(opt)} className={`px-2.5 py-0.5 rounded-full border text-xs font-medium transition-all ${applicable === opt ? (opt === 'Yes' ? `bg-${color}-600 text-white border-${color}-600` : 'bg-gray-400 text-white border-gray-400') : 'bg-white text-gray-500 border-gray-300'}`}>{opt}</button>))}</div></div>{applicable === 'Yes' && <div className="space-y-4">{children}</div>}</div>); };

const ROMDiagramSVG = () => (
  <svg viewBox="0 0 300 180" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
    {/* Knee Flexion 0-130° */}
    <g transform="translate(37,80)">
      <circle cx="0" cy="0" r="28" fill="none" stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="4 2" />
      <path d="M 28 0 A 28 28 0 0 0 -14.36 -24.25" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />
      <line x1="0" y1="0" x2="28" y2="0" stroke="#6b7280" strokeWidth="1.5" />
      <line x1="0" y1="0" x2="-14.36" y2="-24.25" stroke="#10b981" strokeWidth="1.5" />
      <text x="0" y="18" textAnchor="middle" fontSize="9" fill="#374151" fontWeight="600">Knee</text>
      <text x="0" y="28" textAnchor="middle" fontSize="7.5" fill="#6b7280">0°–130°</text>
      <text x="32" y="4" fontSize="7" fill="#6b7280">0°</text>
      <text x="-26" y="-26" fontSize="7" fill="#10b981">130°</text>
    </g>
    {/* Hip Flexion 0-120° */}
    <g transform="translate(112,80)">
      <circle cx="0" cy="0" r="28" fill="none" stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="4 2" />
      <path d="M 28 0 A 28 28 0 0 0 -14 -24.25" fill="none" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" />
      <line x1="0" y1="0" x2="28" y2="0" stroke="#6b7280" strokeWidth="1.5" />
      <line x1="0" y1="0" x2="-14" y2="-24.25" stroke="#6366f1" strokeWidth="1.5" />
      <text x="0" y="18" textAnchor="middle" fontSize="9" fill="#374151" fontWeight="600">Hip</text>
      <text x="0" y="28" textAnchor="middle" fontSize="7.5" fill="#6b7280">0°–120°</text>
      <text x="32" y="4" fontSize="7" fill="#6b7280">0°</text>
      <text x="-24" y="-26" fontSize="7" fill="#6366f1">120°</text>
    </g>
    {/* Shoulder Flexion 0-180° */}
    <g transform="translate(187,80)">
      <circle cx="0" cy="0" r="28" fill="none" stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="4 2" />
      <path d="M 28 0 A 28 28 0 0 0 -28 0" fill="none" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
      <line x1="0" y1="0" x2="28" y2="0" stroke="#6b7280" strokeWidth="1.5" />
      <line x1="0" y1="0" x2="-28" y2="0" stroke="#f59e0b" strokeWidth="1.5" />
      <text x="0" y="18" textAnchor="middle" fontSize="9" fill="#374151" fontWeight="600">Shoulder</text>
      <text x="0" y="28" textAnchor="middle" fontSize="7.5" fill="#6b7280">0°–180°</text>
      <text x="32" y="4" fontSize="7" fill="#6b7280">0°</text>
      <text x="-40" y="4" fontSize="7" fill="#f59e0b">180°</text>
    </g>
    {/* Ankle -20° to 50° */}
    <g transform="translate(262,80)">
      <circle cx="0" cy="0" r="28" fill="none" stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="4 2" />
      <path d="M 26.13 -9.56 A 28 28 0 0 0 18 -21.54" fill="none" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
      <line x1="0" y1="0" x2="28" y2="0" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="0" y1="0" x2="26.13" y2="-9.56" stroke="#ef4444" strokeWidth="1" />
      <line x1="0" y1="0" x2="18" y2="-21.54" stroke="#ef4444" strokeWidth="1" />
      <text x="0" y="18" textAnchor="middle" fontSize="9" fill="#374151" fontWeight="600">Ankle</text>
      <text x="0" y="28" textAnchor="middle" fontSize="7.5" fill="#6b7280">-20°–50°</text>
      <text x="30" y="-8" fontSize="6.5" fill="#ef4444">-20°</text>
      <text x="16" y="-24" fontSize="6.5" fill="#ef4444">50°</text>
    </g>
    {/* Title */}
    <text x="150" y="170" textAnchor="middle" fontSize="8.5" fill="#9ca3af">Normal ROM Reference Ranges</text>
  </svg>
);

export default function PostOpRehabAssessmentForm() {
  // Section 1 — Surgery Details
  const [procedure, setProcedure] = useState(null);
  const [surgeryDate, setSurgeryDate] = useState('');
  const [side, setSide] = useState(null);
  const [surgeon, setSurgeon] = useState('');
  const [hospital, setHospital] = useState('');
  const [implantUsed, setImplantUsed] = useState(null);
  const [implantType, setImplantType] = useState('');
  const [postOpStage, setPostOpStage] = useState(null);
  const [wound, setWound] = useState(null);

  // Section 2 — Current Status
  const [weightBearing, setWeightBearing] = useState(null);
  const [walkingAid, setWalkingAid] = useState(null);
  const [vasRest, setVasRest] = useState('');
  const [vasActivity, setVasActivity] = useState('');
  const [swelling, setSwelling] = useState(null);
  const [dvtSymptoms, setDvtSymptoms] = useState(null);
  const [woundInfectionSigns, setWoundInfectionSigns] = useState(null);
  const [exerciseCompliance, setExerciseCompliance] = useState(null);

  // Section 3 — ROM Assessment
  const [kneeFlexion, setKneeFlexion] = useState('');
  const [kneeFlexionTarget, setKneeFlexionTarget] = useState('');
  const [kneeExtDeficit, setKneeExtDeficit] = useState('');
  const [kneeExtTarget, setKneeExtTarget] = useState('');
  const [hipFlexion, setHipFlexion] = useState('');
  const [hipAbduction, setHipAbduction] = useState('');
  const [hipER, setHipER] = useState('');
  const [hipIR, setHipIR] = useState('');
  const [shoulderFF, setShoulderFF] = useState('');
  const [shoulderAbd, setShoulderAbd] = useState('');
  const [shoulderER, setShoulderER] = useState('');
  const [shoulderIR, setShoulderIR] = useState('');
  const [ankleDorsi, setAnkleDorsi] = useState('');
  const [anklePlantar, setAnklePlantar] = useState('');
  const [passiveVsActive, setPassiveVsActive] = useState(null);
  const [progressVsLast, setProgressVsLast] = useState(null);

  // Section 4 — Strength & Function
  const [mrcKneeExt, setMrcKneeExt] = useState(null);
  const [mrcKneeFlex, setMrcKneeFlex] = useState(null);
  const [mrcHipAbd, setMrcHipAbd] = useState(null);
  const [mrcHipExt, setMrcHipExt] = useState(null);
  const [mrcShoulderAbd, setMrcShoulderAbd] = useState(null);
  const [mrcShoulderER, setMrcShoulderER] = useState(null);
  const [mrcShoulderIR, setMrcShoulderIR] = useState(null);
  const [mrcAnkleDFPF, setMrcAnkleDFPF] = useState(null);
  const [quadLag, setQuadLag] = useState(null);
  const [quadLagDeg, setQuadLagDeg] = useState('');
  const [singleLegStance, setSingleLegStance] = useState(null);
  const [heelRaise, setHeelRaise] = useState(null);
  const [slr, setSlr] = useState(null);
  const [slqQuality, setSlqQuality] = useState(null);
  const [hopLSI, setHopLSI] = useState('');
  const [tugSeconds, setTugSeconds] = useState('');

  // Section 5 — Physio Goals
  const [rehabPhase, setRehabPhase] = useState(null);
  const [exercisesCompleted, setExercisesCompleted] = useState([]);
  const [goalsNextSession, setGoalsNextSession] = useState([]);
  const [modalitiesUsed, setModalitiesUsed] = useState([]);
  const [sessionComplications, setSessionComplications] = useState([]);

  // Section 6 — Milestones
  const [milestones, setMilestones] = useState({
    fullROM: '',
    walkingWithoutAid: '',
    walking500m: '',
    walking1km: '',
    stairsIndependent: '',
    driving: '',
    returnedLightWork: '',
    returnedManualWork: '',
    returnedSportsNonContact: '',
    returnedSportsFullContact: '',
    clearedBySurgeon: '',
  });
  const [quadStrengthCriteria, setQuadStrengthCriteria] = useState(null);
  const [noEffusion, setNoEffusion] = useState(null);
  const [fullROMCriteria, setFullROMCriteria] = useState(null);
  const [psychReadiness, setPsychReadiness] = useState(null);
  const [nextSurgeonReview, setNextSurgeonReview] = useState('');
  const [imagingAtReview, setImagingAtReview] = useState(null);

  // Section 7 — Medications & Complications
  const [medications, setMedications] = useState([]);
  const [anticoagEndDate, setAnticoagEndDate] = useState('');
  const [complications, setComplications] = useState([]);
  const [gpCommunication, setGpCommunication] = useState(null);
  const [dischargeLetter, setDischargeLetter] = useState(null);

  // Section applicability toggles
  const [sec1, setSec1] = useState('Yes');
  const [sec2, setSec2] = useState('Yes');
  const [sec3, setSec3] = useState('Yes');
  const [sec4, setSec4] = useState('Yes');
  const [sec5, setSec5] = useState('Yes');
  const [sec6, setSec6] = useState('Yes');
  const [sec7, setSec7] = useState('Yes');

  // Save state
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error

  // Auto-computations
  const daysSinceSurgery = useMemo(() => {
    if (!surgeryDate) return null;
    const surgery = new Date(surgeryDate);
    const today = new Date();
    const diff = Math.floor((today - surgery) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : null;
  }, [surgeryDate]);

  const phaseSuggestion = useMemo(() => {
    if (daysSinceSurgery === null) return null;
    if (daysSinceSurgery <= 7) return 'Phase 1 — Protection/Pain management';
    if (daysSinceSurgery <= 42) return 'Phase 2 — ROM restoration';
    if (daysSinceSurgery <= 84) return 'Phase 3 — Strengthening';
    if (daysSinceSurgery <= 180) return 'Phase 4 — Functional training';
    return 'Phase 5 — Return to sport/activity';
  }, [daysSinceSurgery]);

  const aclReadiness = useMemo(() => {
    const lsiOk = hopLSI !== '' && Number(hopLSI) >= 90;
    return lsiOk && quadStrengthCriteria === 'Yes' && noEffusion === 'Yes' && fullROMCriteria === 'Yes' && psychReadiness === 'Yes';
  }, [hopLSI, quadStrengthCriteria, noEffusion, fullROMCriteria, psychReadiness]);

  const updateMilestone = (key, val) => setMilestones(prev => ({ ...prev, [key]: val }));

  const mrcOptions = ['0', '1', '2', '3', '4', '5'];
  const exerciseOptions = [
    'ROM exercises', 'Quad sets', 'SLR', 'Terminal knee extension', 'Calf pumps',
    'Short arc quads', 'Mini squats', 'Leg press', 'Stationary cycling', 'Pool walking',
    'Balance board', 'Proprioception training', 'Running programme (graded)', 'Plyometrics', 'Sport-specific drills'
  ];
  const milestoneKeys = [
    { key: 'fullROM', label: 'Full ROM achieved' },
    { key: 'walkingWithoutAid', label: 'Walking without aid' },
    { key: 'walking500m', label: 'Walking 500m pain-free' },
    { key: 'walking1km', label: 'Walking 1km pain-free' },
    { key: 'stairsIndependent', label: 'Stairs independent' },
    { key: 'driving', label: 'Driving (6 weeks post-op left / 3 months right foot)' },
    { key: 'returnedLightWork', label: 'Returned to light work' },
    { key: 'returnedManualWork', label: 'Returned to manual work' },
    { key: 'returnedSportsNonContact', label: 'Returned to sports (non-contact)' },
    { key: 'returnedSportsFullContact', label: 'Returned to sports (full contact)' },
    { key: 'clearedBySurgeon', label: 'Cleared for sport by surgeon' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveStatus('saving');
    const payload = {
      formType: 'PostOpRehabAssessment',
      surgeryDetails: { procedure, surgeryDate, side, surgeon, hospital, implantUsed, implantType, postOpStage, wound, daysSinceSurgery },
      currentStatus: { weightBearing, walkingAid, vasRest, vasActivity, swelling, dvtSymptoms, woundInfectionSigns, exerciseCompliance },
      romAssessment: { kneeFlexion, kneeFlexionTarget, kneeExtDeficit, kneeExtTarget, hipFlexion, hipAbduction, hipER, hipIR, shoulderFF, shoulderAbd, shoulderER, shoulderIR, ankleDorsi, anklePlantar, passiveVsActive, progressVsLast },
      strengthFunction: { mrcKneeExt, mrcKneeFlex, mrcHipAbd, mrcHipExt, mrcShoulderAbd, mrcShoulderER, mrcShoulderIR, mrcAnkleDFPF, quadLag, quadLagDeg, singleLegStance, heelRaise, slr, slqQuality, hopLSI, tugSeconds },
      physioGoals: { rehabPhase, exercisesCompleted, goalsNextSession, modalitiesUsed, sessionComplications },
      milestones: { ...milestones, aclCriteria: { hopLSI, quadStrengthCriteria, noEffusion, fullROMCriteria, psychReadiness, aclReadiness }, nextSurgeonReview, imagingAtReview },
      medicationsComplications: { medications, anticoagEndDate, complications, gpCommunication, dischargeLetter },
    };
    try {
      await api.post('/assessments', payload);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-6 py-8 text-white">
        <h1 className="text-2xl font-bold tracking-tight">Post-Operative Rehabilitation Assessment</h1>
        <p className="mt-1 text-violet-200 text-sm">Surgical Recovery &amp; Physiotherapy Progress Tracking</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* SECTION 1 — Surgery Details */}
        <Section title="Surgery Details" applicable={sec1} onApplicable={setSec1} color="violet">
          <FL label="Procedure">
            <Pills color="violet" value={procedure} onChange={setProcedure} options={[
              'ACL reconstruction', 'PCL reconstruction', 'Meniscal repair', 'Meniscectomy',
              'TKR', 'UKR', 'HTO', 'THR', 'Hip arthroscopy', 'Shoulder RC repair',
              'Bankart repair', 'Shoulder arthroplasty', 'ORIF (which bone)', 'IM nailing',
              'Spine surgery (specify)', 'Ankle fusion', 'Foot osteotomy', 'Tendon repair',
              'Ligament reconstruction', 'Other'
            ]} />
          </FL>
          <FL label="Date of Surgery">
            <input
              type="date"
              value={surgeryDate}
              onChange={e => setSurgeryDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            {daysSinceSurgery !== null && (
              <p className="mt-1 text-sm text-gray-600">
                Days since surgery: <span className="font-semibold text-violet-700">{daysSinceSurgery} days ({Math.floor(daysSinceSurgery / 7)} weeks)</span>
              </p>
            )}
            {phaseSuggestion && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">
                <span>Suggested phase:</span><span>{phaseSuggestion}</span>
              </div>
            )}
          </FL>
          <FL label="Side">
            <Pills color="violet" value={side} onChange={setSide} options={['Right', 'Left', 'Bilateral']} />
          </FL>
          <div className="grid grid-cols-2 gap-4">
            <FL label="Surgeon" sub="(optional)">
              <input type="text" value={surgeon} onChange={e => setSurgeon(e.target.value)}
                placeholder="Surgeon name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </FL>
            <FL label="Hospital" sub="(optional)">
              <input type="text" value={hospital} onChange={e => setHospital(e.target.value)}
                placeholder="Hospital / clinic" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </FL>
          </div>
          <Gate label="Implant used?" value={implantUsed} onChange={setImplantUsed} color="violet">
            <FL label="Implant type / description">
              <input type="text" value={implantType} onChange={e => setImplantType(e.target.value)}
                placeholder="e.g. TKR cement, patellar tendon graft" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </FL>
          </Gate>
          <FL label="Post-op stage">
            <Pills color="violet" value={postOpStage} onChange={setPostOpStage} options={['POD 0-7', 'Week 2', 'Week 4-6', 'Week 8-12', '>3 months', '>6 months']} />
          </FL>
          <FL label="Wound status">
            <Pills color="violet" value={wound} onChange={setWound} options={['Healing well', 'Delayed healing', 'Infection', 'Dehiscence', 'Seroma']} />
          </FL>
          {/* ROM Reference Diagram */}
          <div className="bg-white rounded-xl border border-violet-100 p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-violet-800 mb-3 text-center">Normal ROM Reference Ranges</h4>
            <ROMDiagramSVG />
          </div>
        </Section>

        {/* SECTION 2 — Current Status */}
        <Section title="Current Status" applicable={sec2} onApplicable={setSec2} color="purple">
          <FL label="Weight-bearing status">
            <Pills color="purple" value={weightBearing} onChange={setWeightBearing} options={['NWB', 'PWB 50%', 'WBAT', 'FWB']} />
          </FL>
          <FL label="Walking aid">
            <Pills color="purple" value={walkingAid} onChange={setWalkingAid} options={['None', 'Single crutch', 'Bilateral crutches', 'Walking frame', 'Wheelchair']} />
          </FL>
          <div className="grid grid-cols-2 gap-4">
            <FL label="Pain at rest (VAS 0-10)">
              <input type="number" min="0" max="10" value={vasRest} onChange={e => setVasRest(e.target.value)}
                placeholder="0–10" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </FL>
            <FL label="Pain on activity (VAS 0-10)">
              <input type="number" min="0" max="10" value={vasActivity} onChange={e => setVasActivity(e.target.value)}
                placeholder="0–10" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </FL>
          </div>
          <FL label="Swelling">
            <Pills color="purple" value={swelling} onChange={setSwelling} options={['None', 'Mild', 'Moderate', 'Severe']} />
          </FL>
          <FL label="DVT symptoms">
            <Pills color="purple" value={dvtSymptoms} onChange={setDvtSymptoms} options={['No', 'Calf swelling + pain', 'Dyspnoea (refer urgent)']} />
          </FL>
          {(dvtSymptoms === 'Calf swelling + pain' || dvtSymptoms === 'Dyspnoea (refer urgent)') && (
            <div className="rounded-lg bg-red-50 border border-red-300 px-4 py-3 text-red-700 text-sm font-semibold flex items-center gap-2">
              <span>&#9888;</span> DVT suspected — Doppler USS urgent
            </div>
          )}
          <FL label="Wound infection signs">
            <Pills color="purple" value={woundInfectionSigns} onChange={setWoundInfectionSigns} options={['None', 'Redness', 'Discharge', 'Fever', 'Wound breakdown']} />
          </FL>
          <FL label="Exercise compliance">
            <Pills color="purple" value={exerciseCompliance} onChange={setExerciseCompliance} options={['Excellent', 'Good', 'Poor', 'Non-compliant']} />
          </FL>
        </Section>

        {/* SECTION 3 — Range of Motion */}
        <Section title="Range of Motion Assessment" applicable={sec3} onApplicable={setSec3} color="indigo">
          <p className="text-xs text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2 border border-indigo-100">
            Showing all joints — filter based on surgery type as applicable
          </p>
          {/* Knee */}
          <div className="bg-white rounded-lg border border-indigo-100 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-indigo-800">Knee</h4>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Flexion current°">
                <input type="number" value={kneeFlexion} onChange={e => setKneeFlexion(e.target.value)}
                  placeholder="e.g. 95" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </FL>
              <FL label="Flexion target°">
                <input type="number" value={kneeFlexionTarget} onChange={e => setKneeFlexionTarget(e.target.value)}
                  placeholder="e.g. 130" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </FL>
              <FL label="Extension deficit current°">
                <input type="number" value={kneeExtDeficit} onChange={e => setKneeExtDeficit(e.target.value)}
                  placeholder="e.g. 5" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </FL>
              <FL label="Extension deficit target°">
                <input type="number" value={kneeExtTarget} onChange={e => setKneeExtTarget(e.target.value)}
                  placeholder="e.g. 0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </FL>
            </div>
          </div>
          {/* Hip */}
          <div className="bg-white rounded-lg border border-indigo-100 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-indigo-800">Hip</h4>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Flexion°">
                <input type="number" value={hipFlexion} onChange={e => setHipFlexion(e.target.value)}
                  placeholder="e.g. 100" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </FL>
              <FL label="Abduction°">
                <input type="number" value={hipAbduction} onChange={e => setHipAbduction(e.target.value)}
                  placeholder="e.g. 40" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </FL>
              <FL label="External Rotation°">
                <input type="number" value={hipER} onChange={e => setHipER(e.target.value)}
                  placeholder="e.g. 45" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </FL>
              <FL label="Internal Rotation°">
                <input type="number" value={hipIR} onChange={e => setHipIR(e.target.value)}
                  placeholder="e.g. 35" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </FL>
            </div>
          </div>
          {/* Shoulder */}
          <div className="bg-white rounded-lg border border-indigo-100 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-indigo-800">Shoulder</h4>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Forward Flexion°">
                <input type="number" value={shoulderFF} onChange={e => setShoulderFF(e.target.value)}
                  placeholder="e.g. 150" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </FL>
              <FL label="Abduction°">
                <input type="number" value={shoulderAbd} onChange={e => setShoulderAbd(e.target.value)}
                  placeholder="e.g. 140" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </FL>
              <FL label="External Rotation°">
                <input type="number" value={shoulderER} onChange={e => setShoulderER(e.target.value)}
                  placeholder="e.g. 60" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </FL>
              <FL label="Internal Rotation°">
                <input type="number" value={shoulderIR} onChange={e => setShoulderIR(e.target.value)}
                  placeholder="e.g. 70" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </FL>
            </div>
          </div>
          {/* Ankle */}
          <div className="bg-white rounded-lg border border-indigo-100 p-4 space-y-3">
            <h4 className="text-sm font-semibold text-indigo-800">Ankle</h4>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Dorsiflexion°">
                <input type="number" value={ankleDorsi} onChange={e => setAnkleDorsi(e.target.value)}
                  placeholder="e.g. 15" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </FL>
              <FL label="Plantarflexion°">
                <input type="number" value={anklePlantar} onChange={e => setAnklePlantar(e.target.value)}
                  placeholder="e.g. 40" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </FL>
            </div>
          </div>
          <FL label="Passive vs Active comparison">
            <Pills color="indigo" value={passiveVsActive} onChange={setPassiveVsActive} options={['Equal', 'Passive > Active (stiffness)', 'Active > Passive (pain inhibition)']} />
          </FL>
          <FL label="Progress vs last visit">
            <Pills color="indigo" value={progressVsLast} onChange={setProgressVsLast} options={['Improved', 'Same', 'Declined']} />
          </FL>
        </Section>

        {/* SECTION 4 — Strength & Function */}
        <Section title="Strength & Function" applicable={sec4} onApplicable={setSec4} color="blue">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-blue-800">MRC Muscle Grading (0–5)</h4>
            <div className="bg-white rounded-lg border border-blue-100 overflow-hidden">
              {[
                { label: 'Knee extension (quadriceps)', value: mrcKneeExt, setter: setMrcKneeExt },
                { label: 'Knee flexion (hamstrings)', value: mrcKneeFlex, setter: setMrcKneeFlex },
                { label: 'Hip abduction (gluteus medius)', value: mrcHipAbd, setter: setMrcHipAbd },
                { label: 'Hip extension (gluteus maximus)', value: mrcHipExt, setter: setMrcHipExt },
                { label: 'Shoulder abduction', value: mrcShoulderAbd, setter: setMrcShoulderAbd },
                { label: 'Shoulder external rotation', value: mrcShoulderER, setter: setMrcShoulderER },
                { label: 'Shoulder internal rotation', value: mrcShoulderIR, setter: setMrcShoulderIR },
                { label: 'Ankle DF/PF', value: mrcAnkleDFPF, setter: setMrcAnkleDFPF },
              ].map(({ label, value, setter }, i) => (
                <div key={label} className={`flex items-center justify-between px-4 py-3 ${i % 2 === 0 ? 'bg-blue-50/30' : 'bg-white'}`}>
                  <span className="text-sm text-gray-700 w-56 shrink-0">{label}</span>
                  <div className="flex gap-1.5">
                    {mrcOptions.map(grade => (
                      <button key={grade} type="button" onClick={() => setter(value === grade ? null : grade)}
                        className={`w-9 h-8 rounded-lg border text-sm font-semibold transition-all ${value === grade ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
                        {grade}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <FL label="Quadriceps lag">
                <Pills color="blue" value={quadLag} onChange={setQuadLag} options={['Present', 'None']} />
              </FL>
              {quadLag === 'Present' && (
                <FL label="Lag degrees°">
                  <input type="number" value={quadLagDeg} onChange={e => setQuadLagDeg(e.target.value)}
                    placeholder="e.g. 15" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </FL>
              )}
            </div>
            <FL label="Single leg stance">
              <Pills color="blue" value={singleLegStance} onChange={setSingleLegStance} options={['Unable', '<5s', '5-10s', '>10s']} />
            </FL>
          </div>
          <FL label="Heel raise test">
            <Pills color="blue" value={heelRaise} onChange={setHeelRaise} options={['Unable', 'Partial', 'Normal (10 raises)']} />
          </FL>
          <FL label="Straight leg raise (SLR)">
            <Pills color="blue" value={slr} onChange={setSlr} options={['Unable', 'Possible']} />
          </FL>
          <div className="bg-blue-50/50 rounded-lg border border-blue-100 p-4 space-y-4">
            <h4 className="text-sm font-semibold text-blue-800">Return-to-Sport Tests</h4>
            <FL label="Single leg squat quality">
              <Pills color="blue" value={slqQuality} onChange={setSlqQuality} options={['Poor', 'Fair', 'Good', 'Excellent']} />
            </FL>
            <FL label="Limb Symmetry Index (%)" sub="Hop test LSI">
              <input type="number" min="0" max="100" value={hopLSI} onChange={e => setHopLSI(e.target.value)}
                placeholder="e.g. 92" className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </FL>
            <FL label="Timed Up &amp; Go (seconds)">
              <input type="number" min="0" value={tugSeconds} onChange={e => setTugSeconds(e.target.value)}
                placeholder="e.g. 11.5" step="0.1" className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </FL>
          </div>
        </Section>

        {/* SECTION 5 — Physiotherapy Goals & Protocol */}
        <Section title="Physiotherapy Goals & Protocol" applicable={sec5} onApplicable={setSec5} color="teal">
          <FL label="Current rehab phase">
            <Pills color="teal" value={rehabPhase} onChange={setRehabPhase} options={[
              'Phase 1 — Protection/Pain management (0-2 weeks)',
              'Phase 2 — ROM restoration (2-6 weeks)',
              'Phase 3 — Strengthening (6-12 weeks)',
              'Phase 4 — Functional training (3-6 months)',
              'Phase 5 — Return to sport/activity (>6 months)'
            ]} />
            {phaseSuggestion && (
              <p className="mt-1.5 text-xs text-teal-600 flex items-center gap-1">
                <span className="font-medium">Suggested:</span> {phaseSuggestion}
              </p>
            )}
          </FL>
          <FL label="Exercises completed this session">
            <Pills color="teal" value={exercisesCompleted} onChange={setExercisesCompleted} multi options={exerciseOptions} />
          </FL>
          <FL label="Goals for next session">
            <Pills color="teal" value={goalsNextSession} onChange={setGoalsNextSession} multi options={exerciseOptions} />
          </FL>
          <FL label="Modalities used">
            <Pills color="teal" value={modalitiesUsed} onChange={setModalitiesUsed} multi options={['Ice', 'Heat', 'TENS', 'Ultrasound', 'Massage', 'Taping (Kinesio/McConnell)']} />
          </FL>
          <FL label="Complications during session">
            <Pills color="teal" value={sessionComplications} onChange={setSessionComplications} multi options={['None', 'Increased swelling', 'Pain flare', 'Haemarthrosis', 'Fall', 'Wound issue', 'Patient distress']} />
          </FL>
        </Section>

        {/* SECTION 6 — Milestones & Return to Activity */}
        <Section title="Milestones & Return to Activity" applicable={sec6} onApplicable={setSec6} color="green">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-green-800">Milestone Tracker</h4>
            <div className="bg-white rounded-lg border border-green-100 divide-y divide-green-50 overflow-hidden">
              {milestoneKeys.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-700 flex-1 pr-4">{label}</span>
                  <div className="flex gap-2 shrink-0">
                    {['Yes', 'No'].map(opt => (
                      <button key={opt} type="button" onClick={() => updateMilestone(key, milestones[key] === opt ? '' : opt)}
                        className={`px-3 py-1 rounded-full border text-xs font-medium transition-all ${milestones[key] === opt ? (opt === 'Yes' ? 'bg-green-600 text-white border-green-600' : 'bg-gray-500 text-white border-gray-500') : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* ACL Return-to-Sport Criteria */}
          <div className="bg-green-50/60 rounded-lg border border-green-200 p-4 space-y-4">
            <h4 className="text-sm font-semibold text-green-800">ACL Return-to-Sport Criteria</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-gray-700 w-60">Hop test LSI ≥90% (enter in Section 4)</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${Number(hopLSI) >= 90 && hopLSI !== '' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {hopLSI !== '' ? (Number(hopLSI) >= 90 ? 'Met' : 'Not met') : 'Not entered'}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-gray-700 w-60">Quad strength ≥90% contralateral</span>
                <div className="flex gap-2">
                  {['Yes', 'No'].map(opt => (
                    <button key={opt} type="button" onClick={() => setQuadStrengthCriteria(quadStrengthCriteria === opt ? null : opt)}
                      className={`px-3 py-1 rounded-full border text-xs font-medium transition-all ${quadStrengthCriteria === opt ? (opt === 'Yes' ? 'bg-green-600 text-white border-green-600' : 'bg-gray-500 text-white border-gray-500') : 'bg-white text-gray-600 border-gray-300'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-gray-700 w-60">No effusion</span>
                <div className="flex gap-2">
                  {['Yes', 'No'].map(opt => (
                    <button key={opt} type="button" onClick={() => setNoEffusion(noEffusion === opt ? null : opt)}
                      className={`px-3 py-1 rounded-full border text-xs font-medium transition-all ${noEffusion === opt ? (opt === 'Yes' ? 'bg-green-600 text-white border-green-600' : 'bg-gray-500 text-white border-gray-500') : 'bg-white text-gray-600 border-gray-300'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-gray-700 w-60">Full ROM</span>
                <div className="flex gap-2">
                  {['Yes', 'No'].map(opt => (
                    <button key={opt} type="button" onClick={() => setFullROMCriteria(fullROMCriteria === opt ? null : opt)}
                      className={`px-3 py-1 rounded-full border text-xs font-medium transition-all ${fullROMCriteria === opt ? (opt === 'Yes' ? 'bg-green-600 text-white border-green-600' : 'bg-gray-500 text-white border-gray-500') : 'bg-white text-gray-600 border-gray-300'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-gray-700 w-60">Psychological readiness</span>
                <div className="flex gap-2">
                  {['Yes', 'No'].map(opt => (
                    <button key={opt} type="button" onClick={() => setPsychReadiness(psychReadiness === opt ? null : opt)}
                      className={`px-3 py-1 rounded-full border text-xs font-medium transition-all ${psychReadiness === opt ? (opt === 'Yes' ? 'bg-green-600 text-white border-green-600' : 'bg-gray-500 text-white border-gray-500') : 'bg-white text-gray-600 border-gray-300'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {aclReadiness && (
              <div className="rounded-lg bg-green-100 border border-green-400 px-4 py-3 text-green-800 text-sm font-semibold flex items-center gap-2">
                <span>&#10003;</span> Criteria met for return to sport
              </div>
            )}
          </div>
          <FL label="Next surgeon review date">
            <input type="date" value={nextSurgeonReview} onChange={e => setNextSurgeonReview(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </FL>
          <FL label="Imaging ordered at review">
            <Pills color="green" value={imagingAtReview} onChange={setImagingAtReview} options={['Yes', 'No']} />
          </FL>
        </Section>

        {/* SECTION 7 — Medications & Complications */}
        <Section title="Medications & Complications" applicable={sec7} onApplicable={setSec7} color="rose">
          <FL label="Medications">
            <Pills color="rose" value={medications} onChange={setMedications} multi options={[
              'NSAIDs', 'Paracetamol', 'Tramadol', 'Gabapentin',
              'Anticoagulant (specify)', 'Iron (post-op anaemia)', 'Calcium + Vit D'
            ]} />
          </FL>
          <FL label="Anticoagulation end date">
            <input type="date" value={anticoagEndDate} onChange={e => setAnticoagEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
          </FL>
          <FL label="Complications">
            <Pills color="rose" value={complications} onChange={setComplications} multi options={[
              'None', 'DVT', 'PE', 'Surgical site infection', 'Wound dehiscence',
              'Implant failure', 'Re-fracture', 'Neuropraxia', 'Heterotopic ossification',
              'Stiffness (arthrofibrosis)', 'Complex regional pain syndrome (CRPS)'
            ]} />
          </FL>
          {Array.isArray(complications) && complications.includes('PE') && (
            <div className="rounded-lg bg-red-50 border-2 border-red-400 px-4 py-3 text-red-700 text-sm font-bold flex items-center gap-2">
              <span>&#9888;</span> PE — emergency referral
            </div>
          )}
          <Gate label="GP / surgeon communication?" value={gpCommunication} onChange={setGpCommunication} color="rose">
            <FL label="Discharge letter generated">
              <Pills color="rose" value={dischargeLetter} onChange={setDischargeLetter} options={['Yes', 'No']} />
            </FL>
          </Gate>
        </Section>

        {/* Save Button */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={saveStatus === 'saving'}
            className={`px-8 py-3 rounded-xl font-semibold text-sm text-white shadow-md transition-all ${saveStatus === 'saving' ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 active:scale-95'}`}
          >
            {saveStatus === 'saving' ? 'Saving...' : 'Save Post-Op Rehab Assessment'}
          </button>
          {saveStatus === 'saved' && (
            <span className="text-sm text-green-600 font-medium">Assessment saved successfully</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm text-red-600 font-medium">Error saving — please try again</span>
          )}
        </div>
      </form>
    </div>
  );
}
