/** @shared-pool PediatricOrthopedicAssessmentForm — portal-agnostic */

import React, { useState, useMemo } from 'react';
import api from '../../../api/client';

/* ─── Shared UI Primitives ──────────────────────────────────── */
const Pills = ({ options, value, onChange, multi = false, color = 'blue' }) => {
  const toggle = (v) => { if (multi) { const a = Array.isArray(value) ? value : []; onChange(a.includes(v) ? a.filter(x => x !== v) : [...a, v]); } else onChange(value === v ? null : v); };
  const isActive = (v) => multi ? (Array.isArray(value) && value.includes(v)) : value === v;
  return (<div className="flex flex-wrap gap-2">{options.map(o => { const label = typeof o === 'string' ? o : o.label; const val = typeof o === 'string' ? o : (o.value ?? o.label); return (<button key={val} type="button" onClick={() => toggle(val)} className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${isActive(val) ? `bg-${color}-600 text-white border-${color}-600` : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}`}>{label}</button>); })}</div>);
};
const FL = ({ label, sub, children }) => (<div className="space-y-1.5"><label className="block text-sm font-medium text-gray-700">{label}{sub && <span className="ml-1 text-xs text-gray-400 font-normal">{sub}</span>}</label>{children}</div>);
const Gate = ({ label, value, onChange, children, color = 'blue' }) => (<div className="space-y-3"><div className="flex items-center gap-3"><span className="text-sm font-medium text-gray-700">{label}</span><div className="flex gap-2">{['Yes', 'No'].map(opt => (<button key={opt} type="button" onClick={() => onChange(opt)} className={`px-3 py-1 rounded-full border text-sm font-medium transition-all ${value === opt ? (opt === 'Yes' ? `bg-${color}-600 text-white border-${color}-600` : 'bg-gray-500 text-white border-gray-500') : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>{opt}</button>))}</div></div>{value === 'Yes' && <div className="pl-4 border-l-2 border-gray-200 space-y-3">{children}</div>}</div>);
const Section = ({ title, applicable, onApplicable, color = 'blue', children }) => { if (applicable === 'No') return (<div className="rounded-xl border-2 border-dashed border-gray-200 p-4"><div className="flex items-center justify-between"><h3 className="font-semibold text-gray-400">{title}</h3><div className="flex items-center gap-2"><span className="text-xs text-gray-400">🔒 Not applicable — section locked</span><button type="button" onClick={() => onApplicable('Yes')} className="px-3 py-1 rounded-full border border-gray-300 text-xs text-gray-500 hover:border-gray-400">Reopen</button></div></div></div>); return (<div className={`rounded-xl border border-${color}-100 bg-${color}-50/30 p-5 space-y-4`}><div className="flex items-center justify-between"><h3 className={`font-semibold text-${color}-900`}>{title}</h3><div className="flex items-center gap-2 text-xs text-gray-500"><span>Applicable?</span>{['Yes', 'No'].map(opt => (<button key={opt} type="button" onClick={() => onApplicable(opt)} className={`px-2.5 py-0.5 rounded-full border text-xs font-medium transition-all ${applicable === opt ? (opt === 'Yes' ? `bg-${color}-600 text-white border-${color}-600` : 'bg-gray-400 text-white border-gray-400') : 'bg-white text-gray-500 border-gray-300'}`}>{opt}</button>))}</div></div>{applicable === 'Yes' && <div className="space-y-4">{children}</div>}</div>); };

/* ─── Pediatric Hip SVG ─────────────────────────────────────── */
const PediatricHipSVG = () => (
  <svg viewBox="0 0 300 200" className="w-full h-auto max-h-56" role="img" aria-label="DDH Hip comparison diagram">
    <rect width="300" height="200" fill="white" stroke="#d1d5db" strokeWidth="1" rx="8"/>
    {/* Title */}
    <text x="150" y="14" textAnchor="middle" fontSize="9" fontWeight="700" fill="#374151">Hip Dysplasia (DDH) Reference Diagram</text>

    {/* ── LEFT SIDE: Normal Hip ── */}
    {/* Pelvis left */}
    <path d="M 10,60 Q 30,40 60,45 Q 80,48 85,65 Q 90,80 80,90 Q 70,100 60,98 Q 40,98 25,90 Q 10,80 10,60 Z" fill="#fde8d0" stroke="#d97706" strokeWidth="1.5"/>
    {/* Acetabulum left — deep socket */}
    <path d="M 48,65 Q 60,55 72,65 Q 78,75 72,85 Q 60,92 48,85 Q 42,75 48,65 Z" fill="#fed7aa" stroke="#b45309" strokeWidth="1.5"/>
    {/* Femoral head left — normal, seated deeply */}
    <circle cx="60" cy="75" r="13" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5"/>
    {/* Femoral neck left */}
    <line x1="60" y1="88" x2="60" y2="120" stroke="#d97706" strokeWidth="4" strokeLinecap="round"/>
    {/* Femoral shaft left */}
    <rect x="56" y="118" width="8" height="50" rx="3" fill="#fde8d0" stroke="#d97706" strokeWidth="1.5"/>
    {/* Label */}
    <text x="60" y="178" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#065f46">Normal DDH</text>

    {/* ── RIGHT SIDE: Dysplastic Hip ── */}
    {/* Pelvis right */}
    <path d="M 215,60 Q 235,40 265,45 Q 285,48 290,65 Q 292,80 282,90 Q 272,100 262,98 Q 240,98 225,90 Q 213,80 215,60 Z" fill="#fde8d0" stroke="#d97706" strokeWidth="1.5"/>
    {/* Shallow acetabulum right */}
    <path d="M 248,70 Q 258,63 268,70 Q 272,78 268,84 Q 258,88 248,84 Q 244,77 248,70 Z" fill="#fed7aa" stroke="#b45309" strokeWidth="1.5"/>
    {/* Femoral head right — displaced laterally/superiorly */}
    <circle cx="278" cy="55" r="13" fill="#fef3c7" stroke="#ef4444" strokeWidth="2"/>
    {/* Femoral neck right — angled */}
    <line x1="271" y1="65" x2="258" y2="85" stroke="#d97706" strokeWidth="4" strokeLinecap="round"/>
    {/* Femoral shaft right */}
    <rect x="254" y="83" width="8" height="55" rx="3" fill="#fde8d0" stroke="#d97706" strokeWidth="1.5"/>
    {/* Displacement arrow */}
    <line x1="265" y1="58" x2="275" y2="50" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 2"/>
    {/* Label */}
    <text x="258" y="150" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#b91c1c">DDH Grade III</text>

    {/* ── Reference Lines ── */}
    {/* Hilgenreiner's Line — horizontal through triradiate cartilages */}
    <line x1="10" y1="90" x2="290" y2="90" stroke="#7c3aed" strokeWidth="1" strokeDasharray="5 3"/>
    <text x="150" y="87" textAnchor="middle" fontSize="7" fill="#7c3aed" fontWeight="600">Hilgenreiner's Line</text>

    {/* Perkin's Lines — vertical at lateral acetabular edges */}
    <line x1="78" y1="70" x2="78" y2="115" stroke="#0891b2" strokeWidth="1" strokeDasharray="4 3"/>
    <line x1="272" y1="70" x2="272" y2="115" stroke="#0891b2" strokeWidth="1" strokeDasharray="4 3"/>
    <text x="78" y="120" textAnchor="middle" fontSize="6.5" fill="#0891b2">Perkin's</text>
    <text x="272" y="120" textAnchor="middle" fontSize="6.5" fill="#0891b2">Perkin's</text>
    <text x="150" y="128" textAnchor="middle" fontSize="7" fill="#0891b2" fontWeight="600">Perkin's Line</text>

    {/* Acetabular Index — left (normal ~20°) */}
    <line x1="48" y1="90" x2="72" y2="65" stroke="#16a34a" strokeWidth="1.5"/>
    <line x1="48" y1="90" x2="72" y2="90" stroke="#16a34a" strokeWidth="1.5"/>
    <text x="58" y="103" textAnchor="middle" fontSize="6.5" fill="#16a34a">~20°</text>

    {/* Acetabular Index — right (dysplastic ~40°) */}
    <line x1="248" y1="90" x2="268" y2="65" stroke="#dc2626" strokeWidth="1.5"/>
    <line x1="248" y1="90" x2="268" y2="90" stroke="#dc2626" strokeWidth="1.5"/>
    <text x="258" y="103" textAnchor="middle" fontSize="6.5" fill="#dc2626">~40°</text>

    {/* Acetabular Index label */}
    <text x="150" y="115" textAnchor="middle" fontSize="7" fill="#374151" fontWeight="600">Acetabular Index</text>
    <text x="150" y="123" textAnchor="middle" fontSize="6.5" fill="#6b7280">(normal &lt;30°; abnormal &gt;30°)</text>
  </svg>
);

/* ─── Main Form Component ───────────────────────────────────── */
export default function PediatricOrthopedicAssessmentForm({ patientId }) {
  /* ── Save state ── */
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error

  /* ── Section applicability ── */
  const [sec1App, setSec1App] = useState('Yes');
  const [sec2App, setSec2App] = useState('Yes');
  const [sec3App, setSec3App] = useState('Yes');
  const [sec4App, setSec4App] = useState('Yes');
  const [sec5App, setSec5App] = useState('Yes');
  const [sec6App, setSec6App] = useState('Yes');

  /* ── Section 1: Patient Details & Presenting Complaint ── */
  const [ageValue, setAgeValue] = useState('');
  const [ageUnit, setAgeUnit] = useState('months');
  const [sex, setSex] = useState(null);
  const [chiefComplaint, setChiefComplaint] = useState([]);
  const [duration, setDuration] = useState(null);
  const [laterality, setLaterality] = useState(null);
  const [birthHistory, setBirthHistory] = useState([]);
  const [familyHistoryDDH, setFamilyHistoryDDH] = useState(null);

  /* ── Section 2: Developmental History ── */
  const [sittingMilestone, setSittingMilestone] = useState(null);
  const [standingMilestone, setStandingMilestone] = useState(null);
  const [walkingMilestone, setWalkingMilestone] = useState(null);
  const [walkingPattern, setWalkingPattern] = useState(null);
  const [newbornScreening, setNewbornScreening] = useState(null);
  const [immunisation, setImmunisation] = useState(null);
  const [nutrition, setNutrition] = useState(null);

  /* ── Section 3: Physical Examination ── */
  const [generalStatus, setGeneralStatus] = useState(null);
  const [temperature, setTemperature] = useState('');
  const [gait, setGait] = useState(null);
  const [limbLength, setLimbLength] = useState(null);
  const [lldType, setLldType] = useState(null);
  const [lldCm, setLldCm] = useState('');
  const [skinFindings, setSkinFindings] = useState([]);
  const [scoliosisAdamsFwd, setScoliosisAdamsFwd] = useState(null);
  const [ribHumpDeg, setRibHumpDeg] = useState('');
  const [kyphosis, setKyphosis] = useState(null);
  const [lordosis, setLordosis] = useState(null);
  const [barlowTest, setBarlowTest] = useState(null);
  const [ortolaniTest, setOrtolaniTest] = useState(null);
  const [galeazziTest, setGaleazziTest] = useState(null);
  const [hipAbductionL, setHipAbductionL] = useState('');
  const [hipAbductionR, setHipAbductionR] = useState('');
  const [fadirTest, setFadirTest] = useState(null);
  const [faberTest, setFaberTest] = useState(null);
  const [internalRotation, setInternalRotation] = useState('');
  const [footExam, setFootExam] = useState(null);
  const [caveScores, setCaveScores] = useState({ curvature: null, adductus: null, varus: null, equinus: null });
  const [kneeExam, setKneeExam] = useState(null);

  /* ── Section 4: Condition-Specific ── */
  const [ddhSuspected, setDdhSuspected] = useState(null);
  const [tonnisGrade, setTonnisGrade] = useState(null);
  const [ddhTreatment, setDdhTreatment] = useState(null);
  const [pavlikHours, setPavlikHours] = useState('');

  const [perthesSuspected, setPerthesSuspected] = useState(null);
  const [catterall, setCatterall] = useState(null);
  const [herring, setHerring] = useState(null);
  const [stulberg, setStulberg] = useState(null);
  const [perthesManagement, setPerthesManagement] = useState([]);

  const [scfeSuspected, setScfeSuspected] = useState(null);
  const [scfeBilateral, setScfeBilateral] = useState(null);
  const [scfeStability, setScfeStability] = useState(null);
  const [scfeSeverity, setScfeSeverity] = useState(null);
  const [scfeTreatment, setScfeTreatment] = useState(null);
  const [scfeEndoScreen, setScfeEndoScreen] = useState(null);

  const [clubfootPresent, setClubfootPresent] = useState(null);
  const [piraniScore, setPiraniScore] = useState('');
  const [ponsetiCastsDone, setPonsetiCastsDone] = useState('');
  const [ponsetiCastsTotal, setPonsetiCastsTotal] = useState('');
  const [achillesTenotomy, setAchillesTenotomy] = useState(null);
  const [afoApplied, setAfoApplied] = useState(null);
  const [clubfootRelapse, setClubfootRelapse] = useState(null);

  const [septicSuspected, setSepticSuspected] = useState(null);
  const [kocher, setKocher] = useState({ fever: null, nonWeightBearing: null, esr: null, wbc: null, crp: null });
  const [bloodsOrdered, setBloodsOrdered] = useState([]);
  const [septicManagement, setSepticManagement] = useState([]);

  /* ── Section 5: Imaging ── */
  const [xrays, setXrays] = useState([]);
  const [ussGate, setUssGate] = useState(null);
  const [grafClassification, setGrafClassification] = useState(null);
  const [alphaAngle, setAlphaAngle] = useState('');
  const [betaAngle, setBetaAngle] = useState('');
  const [effusion, setEffusion] = useState(null);
  const [mriFindings, setMriFindings] = useState([]);
  const [boneAgeResult, setBoneAgeResult] = useState(null);

  /* ── Section 6: Management Plan ── */
  const [workingDiagnosis, setWorkingDiagnosis] = useState([]);
  const [managementPlan, setManagementPlan] = useState([]);
  const [vitaminD, setVitaminD] = useState(null);
  const [vitaminDDose, setVitaminDDose] = useState(null);
  const [calcium, setCalcium] = useState(null);
  const [followUp, setFollowUp] = useState(null);
  const [geneticsReferral, setGeneticsReferral] = useState(null);

  /* ── Kocher score computation ── */
  const kocherScore = useMemo(() => {
    return Object.values(kocher).filter(v => v === 'Yes').length;
  }, [kocher]);

  const kocherProbability = useMemo(() => {
    const map = { 0: '0.2%', 1: '3%', 2: '40%', 3: '93%', 4: '99.6%' };
    return map[kocherScore] ?? '—';
  }, [kocherScore]);

  /* ── Submit ── */
  const handleSubmit = async () => {
    setSaveState('saving');
    const payload = {
      formType: 'pediatric_orthopedic_assessment',
      patientId,
      submittedAt: new Date().toISOString(),
      section1_patientDetails: {
        ageValue, ageUnit, sex, chiefComplaint, duration, laterality, birthHistory, familyHistoryDDH,
      },
      section2_developmentalHistory: {
        sittingMilestone, standingMilestone, walkingMilestone, walkingPattern,
        newbornScreening, immunisation, nutrition,
      },
      section3_physicalExamination: {
        generalStatus, temperature, gait, limbLength, lldType, lldCm,
        skinFindings, scoliosisAdamsFwd, ribHumpDeg, kyphosis, lordosis,
        barlowTest, ortolaniTest, galeazziTest,
        hipAbductionL, hipAbductionR, fadirTest, faberTest, internalRotation,
        footExam, caveScores, kneeExam,
      },
      section4_conditionSpecific: {
        ddhSuspected, tonnisGrade, ddhTreatment, pavlikHours,
        perthesSuspected, catterall, herring, stulberg, perthesManagement,
        scfeSuspected, scfeBilateral, scfeStability, scfeSeverity, scfeTreatment, scfeEndoScreen,
        clubfootPresent, piraniScore, ponsetiCastsDone, ponsetiCastsTotal,
        achillesTenotomy, afoApplied, clubfootRelapse,
        septicSuspected, kocher, kocherScore, kocherProbability, bloodsOrdered, septicManagement,
      },
      section5_imaging: {
        xrays, ussGate, grafClassification, alphaAngle, betaAngle, effusion, mriFindings, boneAgeResult,
      },
      section6_managementPlan: {
        workingDiagnosis, managementPlan, vitaminD, vitaminDDose, calcium, followUp, geneticsReferral,
      },
    };
    try {
      await api.post('/assessments', payload);
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 3000);
    } catch {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 4000);
    }
  };

  const cafeAuLaitWarning = skinFindings.includes('Café au lait (>6 → NF1)');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 px-6 py-8 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-white tracking-tight">Pediatric Orthopedic Assessment</h1>
          <p className="mt-1 text-green-100 text-sm">Comprehensive Pediatric Musculoskeletal Evaluation</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* ───────────── SECTION 1 ───────────── */}
        <Section title="Patient Details & Presenting Complaint" applicable={sec1App} onApplicable={setSec1App} color="green">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FL label="Age" sub="(Age critical for DDx)">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={ageValue}
                  onChange={e => setAgeValue(e.target.value)}
                  placeholder="Enter age"
                  className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <Pills options={['Months', 'Years']} value={ageUnit} onChange={v => setAgeUnit(v ? v.toLowerCase() : null)} color="green"/>
              </div>
            </FL>
            <FL label="Sex">
              <Pills options={['Male', 'Female']} value={sex} onChange={setSex} color="green"/>
            </FL>
          </div>

          <FL label="Chief Complaint" sub="(select all that apply)">
            <Pills
              options={[
                'Limp', 'Refusal to walk', 'Hip pain', 'Knee pain (referred hip)',
                'Leg deformity', 'Foot deformity', 'Spine deformity', 'Limb length discrepancy',
                'Toe-walking', 'In-toeing/out-toeing', 'Swollen joint',
                'Fever with joint pain (septic arthritis until proved otherwise)',
              ]}
              value={chiefComplaint}
              onChange={setChiefComplaint}
              multi
              color="green"
            />
          </FL>

          <FL label="Duration">
            <Pills options={['Acute (<1 week)', 'Subacute (1-4 weeks)', 'Chronic (>4 weeks)']} value={duration} onChange={setDuration} color="green"/>
          </FL>

          <FL label="Laterality">
            <Pills options={['Right', 'Left', 'Bilateral']} value={laterality} onChange={setLaterality} color="green"/>
          </FL>

          <FL label="Birth History" sub="(select all that apply)">
            <Pills
              options={['Normal', 'Breech (DDH risk)', 'Assisted delivery', 'Preterm', 'NICU stay']}
              value={birthHistory}
              onChange={setBirthHistory}
              multi
              color="green"
            />
          </FL>

          <FL label="Family History of DDH / Orthopaedic condition">
            <Pills options={['Yes', 'No']} value={familyHistoryDDH} onChange={setFamilyHistoryDDH} color="green"/>
          </FL>

          {/* Hip SVG */}
          <div className="bg-white rounded-xl border border-green-100 p-4 shadow-sm">
            <PediatricHipSVG />
            <p className="mt-2 text-center text-xs text-gray-500">
              Reference: Hilgenreiner's &amp; Perkin's lines for DDH — normal hip (left) vs Grade III dysplasia (right)
            </p>
          </div>
        </Section>

        {/* ───────────── SECTION 2 ───────────── */}
        <Section title="Developmental History" applicable={sec2App} onApplicable={setSec2App} color="emerald">
          <FL label="Sitting unsupported">
            <Pills options={['<6 months', '6-9 months', '>9 months', 'Not yet']} value={sittingMilestone} onChange={setSittingMilestone} color="emerald"/>
          </FL>

          <FL label="Standing">
            <Pills options={['<10 months', '10-14 months', '>14 months', 'Not yet']} value={standingMilestone} onChange={setStandingMilestone} color="emerald"/>
          </FL>

          <FL label="Walking">
            <Pills options={['<12 months', '12-18 months', '>18 months', 'Not yet']} value={walkingMilestone} onChange={setWalkingMilestone} color="emerald"/>
          </FL>

          <FL label="Walking Pattern">
            <Pills options={['Normal', 'Toe-walking', 'In-toeing', 'Out-toeing', 'Limp', 'Waddling']} value={walkingPattern} onChange={setWalkingPattern} color="emerald"/>
          </FL>

          <FL label="Previous Barlow/Ortolani Newborn Screening">
            <Pills options={['Normal', 'Abnormal', 'Not documented']} value={newbornScreening} onChange={setNewbornScreening} color="emerald"/>
          </FL>

          <FL label="Immunisation Status">
            <Pills options={['Up to date', 'Partial', 'Not immunised']} value={immunisation} onChange={setImmunisation} color="emerald"/>
          </FL>

          <FL label="Nutrition">
            <Pills
              options={['Normal', 'Vitamin D deficiency', "Rickets signs (bowing, Harrison's sulcus)"]}
              value={nutrition}
              onChange={setNutrition}
              color="emerald"
            />
          </FL>
        </Section>

        {/* ───────────── SECTION 3 ───────────── */}
        <Section title="Physical Examination" applicable={sec3App} onApplicable={setSec3App} color="teal">
          {/* General status */}
          <FL label="General Status">
            <Pills options={['Well', 'Distressed', 'Fever']} value={generalStatus} onChange={setGeneralStatus} color="teal"/>
          </FL>
          {generalStatus === 'Fever' && (
            <FL label="Temperature (°C)">
              <input
                type="number"
                step="0.1"
                value={temperature}
                onChange={e => setTemperature(e.target.value)}
                placeholder="e.g. 38.7"
                className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </FL>
          )}

          <FL label="Gait">
            <Pills options={['Normal', 'Antalgic', 'Trendelenburg', 'Waddling', 'Toe-walking', 'Scissor', 'Limping']} value={gait} onChange={setGait} color="teal"/>
          </FL>

          <FL label="Limb Length">
            <Pills options={['Equal', 'LLD']} value={limbLength} onChange={setLimbLength} color="teal"/>
          </FL>
          {limbLength === 'LLD' && (
            <div className="pl-4 border-l-2 border-gray-200 space-y-3">
              <FL label="LLD Type">
                <Pills options={['Apparent', 'True']} value={lldType} onChange={setLldType} color="teal"/>
              </FL>
              <FL label="LLD Amount (cm)">
                <input
                  type="number"
                  step="0.5"
                  value={lldCm}
                  onChange={e => setLldCm(e.target.value)}
                  placeholder="cm"
                  className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </FL>
            </div>
          )}

          <FL label="Skin Findings" sub="(select all that apply)">
            <Pills
              options={['Normal', 'Rash', 'Café au lait (>6 → NF1)', 'Port wine stain', 'Asymmetric skin folds (DDH)']}
              value={skinFindings}
              onChange={setSkinFindings}
              multi
              color="teal"
            />
          </FL>
          {cafeAuLaitWarning && (
            <div className="rounded-lg bg-amber-50 border border-amber-300 px-4 py-2 text-sm text-amber-800 font-medium">
              ⚠️ &gt;6 café-au-lait spots — consider NF1 referral
            </div>
          )}

          {/* Spine */}
          <div className="border-t border-teal-100 pt-3 space-y-3">
            <p className="text-sm font-semibold text-teal-800">Spine Assessment</p>
            <FL label="Adams Forward Bend Test">
              <Pills options={['Positive', 'Negative']} value={scoliosisAdamsFwd} onChange={setScoliosisAdamsFwd} color="teal"/>
            </FL>
            {scoliosisAdamsFwd === 'Positive' && (
              <FL label="Rib Hump Degree (°)">
                <input
                  type="number"
                  value={ribHumpDeg}
                  onChange={e => setRibHumpDeg(e.target.value)}
                  placeholder="degrees"
                  className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </FL>
            )}
            <FL label="Kyphosis">
              <Pills options={['Yes', 'No']} value={kyphosis} onChange={setKyphosis} color="teal"/>
            </FL>
            <FL label="Lordosis">
              <Pills options={['Normal', 'Increased', 'Decreased']} value={lordosis} onChange={setLordosis} color="teal"/>
            </FL>
          </div>

          {/* Hip tests */}
          <div className="border-t border-teal-100 pt-3 space-y-3">
            <p className="text-sm font-semibold text-teal-800">Hip Examination</p>
            <FL label="Barlow Test">
              <Pills options={['Positive', 'Negative', 'Not applicable (age >6m)']} value={barlowTest} onChange={setBarlowTest} color="teal"/>
            </FL>
            <FL label="Ortolani Test">
              <Pills options={['Positive', 'Negative', 'Not applicable (age >6m)']} value={ortolaniTest} onChange={setOrtolaniTest} color="teal"/>
            </FL>
            <FL label="Galeazzi Test">
              <Pills options={['Positive', 'Negative']} value={galeazziTest} onChange={setGaleazziTest} color="teal"/>
            </FL>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FL label="Hip Abduction — Left (°)" sub="(<60° asymmetric = DDH)">
                <input
                  type="number"
                  value={hipAbductionL}
                  onChange={e => setHipAbductionL(e.target.value)}
                  placeholder="degrees"
                  className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </FL>
              <FL label="Hip Abduction — Right (°)" sub="(<60° asymmetric = DDH)">
                <input
                  type="number"
                  value={hipAbductionR}
                  onChange={e => setHipAbductionR(e.target.value)}
                  placeholder="degrees"
                  className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </FL>
            </div>
            <FL label="FADIR Test">
              <Pills options={['Positive', 'Negative']} value={fadirTest} onChange={setFadirTest} color="teal"/>
            </FL>
            <FL label="FABER Test">
              <Pills options={['Positive', 'Negative']} value={faberTest} onChange={setFaberTest} color="teal"/>
            </FL>
            <FL label="Internal Rotation in Extension (°)" sub="(<20° IR in extension = FAI)">
              <input
                type="number"
                value={internalRotation}
                onChange={e => setInternalRotation(e.target.value)}
                placeholder="degrees"
                className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </FL>
          </div>

          {/* Foot */}
          <div className="border-t border-teal-100 pt-3 space-y-3">
            <p className="text-sm font-semibold text-teal-800">Foot Examination</p>
            <FL label="Foot">
              <Pills
                options={['Plantigrade', 'Clubfoot', 'Flatfoot', 'Cavus', 'Metatarsus adductus', 'Calcaneovalgus']}
                value={footExam}
                onChange={setFootExam}
                color="teal"
              />
            </FL>
            {footExam === 'Clubfoot' && (
              <div className="pl-4 border-l-2 border-teal-200 space-y-3">
                <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">CAVE Scoring</p>
                {(['curvature', 'adductus', 'varus', 'equinus']).map(component => (
                  <FL key={component} label={component.charAt(0).toUpperCase() + component.slice(1)}>
                    <Pills
                      options={[{ label: '0', value: '0' }, { label: '0.5', value: '0.5' }, { label: '1', value: '1' }]}
                      value={caveScores[component]}
                      onChange={v => setCaveScores(prev => ({ ...prev, [component]: v }))}
                      color="teal"
                    />
                  </FL>
                ))}
              </div>
            )}
          </div>

          {/* Knee */}
          <div className="border-t border-teal-100 pt-3 space-y-3">
            <p className="text-sm font-semibold text-teal-800">Knee Examination</p>
            <FL label="Knee Alignment">
              <Pills
                options={[
                  'Normal',
                  'Genu varum (bow legs normal <18m)',
                  'Genu valgum (knock knees normal 3-6yrs)',
                  "Blount's disease",
                ]}
                value={kneeExam}
                onChange={setKneeExam}
                color="teal"
              />
            </FL>
          </div>
        </Section>

        {/* ───────────── SECTION 4 ───────────── */}
        <Section title="Condition-Specific Assessment" applicable={sec4App} onApplicable={setSec4App} color="blue">

          {/* DDH Gate */}
          <Gate label="DDH suspected?" value={ddhSuspected} onChange={setDdhSuspected} color="blue">
            <FL label="Tönnis Grade">
              <Pills
                options={[
                  { label: '0 — Normal', value: '0' },
                  { label: 'I — Mild', value: 'I' },
                  { label: 'II — Moderate', value: 'II' },
                  { label: 'III — Severe', value: 'III' },
                  { label: 'IV — Complete dislocation', value: 'IV' },
                ]}
                value={tonnisGrade}
                onChange={setTonnisGrade}
                color="blue"
              />
            </FL>
            <FL label="Treatment">
              <Pills
                options={[
                  'Pavlik harness (age <6m)',
                  'Abduction splint',
                  'Closed reduction + spica cast',
                  'Open reduction + osteotomy',
                ]}
                value={ddhTreatment}
                onChange={setDdhTreatment}
                color="blue"
              />
            </FL>
            {ddhTreatment === 'Pavlik harness (age <6m)' && (
              <FL label="Pavlik Harness — Hours/day worn">
                <input
                  type="number"
                  min="0"
                  max="24"
                  value={pavlikHours}
                  onChange={e => setPavlikHours(e.target.value)}
                  placeholder="hours"
                  className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </FL>
            )}
          </Gate>

          {/* Perthes Gate */}
          <Gate label="Perthes suspected?" value={perthesSuspected} onChange={setPerthesSuspected} color="blue">
            <p className="text-xs text-gray-500 italic">Age peak: 4-8 years; male predominance 4:1; lateral pillar classification guides prognosis.</p>
            <FL label="Catterall Classification">
              <Pills
                options={[
                  { label: 'I — <25%', value: 'I' },
                  { label: 'II — 25-50%', value: 'II' },
                  { label: 'III — 75%', value: 'III' },
                  { label: 'IV — 100%', value: 'IV' },
                ]}
                value={catterall}
                onChange={setCatterall}
                color="blue"
              />
            </FL>
            <FL label="Herring Lateral Pillar Classification">
              <Pills
                options={['A', 'B', 'B-C border', 'C']}
                value={herring}
                onChange={setHerring}
                color="blue"
              />
            </FL>
            <FL label="Stulberg Class (outcome)">
              <Pills
                options={[
                  { label: '1', value: '1' },
                  { label: '2', value: '2' },
                  { label: '3', value: '3' },
                  { label: '4', value: '4' },
                  { label: '5', value: '5' },
                ]}
                value={stulberg}
                onChange={setStulberg}
                color="blue"
              />
            </FL>
            <FL label="Management" sub="(select all that apply)">
              <Pills
                options={[
                  'Observation',
                  'Physiotherapy ROM',
                  'Containment orthosis',
                  'Femoral osteotomy',
                  'Pelvic osteotomy Salter',
                  'Triple osteotomy',
                ]}
                value={perthesManagement}
                onChange={setPerthesManagement}
                multi
                color="blue"
              />
            </FL>
          </Gate>

          {/* SCFE Gate */}
          <Gate label="SCFE suspected?" value={scfeSuspected} onChange={setScfeSuspected} color="blue">
            <FL label="Bilateral involvement">
              <Pills options={['Yes', 'No']} value={scfeBilateral} onChange={setScfeBilateral} color="blue"/>
            </FL>
            <FL label="Stability">
              <Pills options={['Stable', 'Unstable']} value={scfeStability} onChange={setScfeStability} color="blue"/>
            </FL>
            {scfeStability === 'Unstable' && (
              <div className="rounded-lg bg-red-50 border border-red-400 px-4 py-2 text-sm text-red-800 font-semibold">
                🚨 URGENT — emergency in-situ fixation within 24h
              </div>
            )}
            <FL label="Severity">
              <Pills
                options={['Mild (<1/3)', 'Moderate (1/3-1/2)', 'Severe (>1/2)']}
                value={scfeSeverity}
                onChange={setScfeSeverity}
                color="blue"
              />
            </FL>
            <FL label="Treatment">
              <Pills
                options={['In-situ fixation cannulated screw', 'Osteotomy']}
                value={scfeTreatment}
                onChange={setScfeTreatment}
                color="blue"
              />
            </FL>
            <FL label="Hypothyroidism / Renal screen ordered">
              <Pills options={['Yes', 'No']} value={scfeEndoScreen} onChange={setScfeEndoScreen} color="blue"/>
            </FL>
          </Gate>

          {/* Clubfoot Gate */}
          <Gate label="Clubfoot present?" value={clubfootPresent} onChange={setClubfootPresent} color="blue">
            <FL label="Pirani Score (0-6)">
              <input
                type="number"
                min="0"
                max="6"
                step="0.5"
                value={piraniScore}
                onChange={e => setPiraniScore(e.target.value)}
                placeholder="0-6"
                className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </FL>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Ponseti Casts Done">
                <input
                  type="number"
                  min="0"
                  value={ponsetiCastsDone}
                  onChange={e => setPonsetiCastsDone(e.target.value)}
                  placeholder="number"
                  className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </FL>
              <FL label="Total Ponseti Casts Planned">
                <input
                  type="number"
                  min="0"
                  value={ponsetiCastsTotal}
                  onChange={e => setPonsetiCastsTotal(e.target.value)}
                  placeholder="number"
                  className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </FL>
            </div>
            <FL label="Achilles Tenotomy">
              <Pills options={['Yes', 'No', 'Planned']} value={achillesTenotomy} onChange={setAchillesTenotomy} color="blue"/>
            </FL>
            <FL label="AFO (Foot Abduction Brace)">
              <Pills options={['Yes', 'No']} value={afoApplied} onChange={setAfoApplied} color="blue"/>
            </FL>
            <FL label="Relapse">
              <Pills options={['Yes', 'No']} value={clubfootRelapse} onChange={setClubfootRelapse} color="blue"/>
            </FL>
          </Gate>

          {/* Septic Arthritis Gate */}
          <Gate label="Septic arthritis / OM suspected?" value={septicSuspected} onChange={setSepticSuspected} color="blue">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Kocher Criteria</p>
            {[
              { key: 'fever', label: 'Fever >38.5°C' },
              { key: 'nonWeightBearing', label: 'Non-weight bearing' },
              { key: 'esr', label: 'ESR >40 mm/h' },
              { key: 'wbc', label: 'WBC >12,000/μL' },
              { key: 'crp', label: 'CRP >2 mg/dL' },
            ].map(({ key, label }) => (
              <FL key={key} label={label}>
                <Pills
                  options={['Yes', 'No']}
                  value={kocher[key]}
                  onChange={v => setKocher(prev => ({ ...prev, [key]: v }))}
                  color="blue"
                />
              </FL>
            ))}
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-2 text-sm text-blue-900">
              <span className="font-semibold">Kocher Score: {kocherScore}/5</span>
              <span className="ml-3 text-blue-700">Predicted probability: {kocherProbability}</span>
            </div>
            {kocherScore >= 2 && (
              <div className="rounded-lg bg-red-50 border border-red-400 px-4 py-2 text-sm text-red-800 font-semibold">
                🚨 High probability septic arthritis — urgent aspiration / surgical washout
              </div>
            )}
            <FL label="Bloods Ordered" sub="(select all that apply)">
              <Pills
                options={['WBC', 'ESR', 'CRP', 'Blood culture']}
                value={bloodsOrdered}
                onChange={setBloodsOrdered}
                multi
                color="blue"
              />
            </FL>
            <FL label="Management" sub="(select all that apply)">
              <Pills
                options={['IV antibiotics', 'Surgical washout', 'Orthopaedic emergency referral']}
                value={septicManagement}
                onChange={setSepticManagement}
                multi
                color="blue"
              />
            </FL>
          </Gate>
        </Section>

        {/* ───────────── SECTION 5 ───────────── */}
        <Section title="Imaging" applicable={sec5App} onApplicable={setSec5App} color="sky">
          <FL label="X-rays Ordered" sub="(select all that apply)">
            <Pills
              options={['AP pelvis', 'Lateral frog-leg', 'AP knee', 'Foot weight-bearing', 'Spine PA+lateral', 'Other']}
              value={xrays}
              onChange={setXrays}
              multi
              color="sky"
            />
          </FL>

          <Gate label="USS hip performed?" value={ussGate} onChange={setUssGate} color="sky">
            <FL label="Graf Classification">
              <Pills
                options={[
                  { label: 'Type I — Normal α>60°', value: 'Type I' },
                  { label: 'IIa — Physiological immature', value: 'IIa' },
                  { label: 'IIb — Borderline', value: 'IIb' },
                  { label: 'IIc', value: 'IIc' },
                  { label: 'D', value: 'D' },
                  { label: 'III', value: 'III' },
                  { label: 'IV', value: 'IV' },
                ]}
                value={grafClassification}
                onChange={setGrafClassification}
                color="sky"
              />
            </FL>
            <div className="grid grid-cols-2 gap-4">
              <FL label="Alpha Angle (°)">
                <input
                  type="number"
                  value={alphaAngle}
                  onChange={e => setAlphaAngle(e.target.value)}
                  placeholder="degrees"
                  className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </FL>
              <FL label="Beta Angle (°)">
                <input
                  type="number"
                  value={betaAngle}
                  onChange={e => setBetaAngle(e.target.value)}
                  placeholder="degrees"
                  className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </FL>
            </div>
            <FL label="Effusion on USS">
              <Pills options={['Yes', 'No']} value={effusion} onChange={setEffusion} color="sky"/>
            </FL>
          </Gate>

          <FL label="MRI Findings" sub="(select all that apply)">
            <Pills
              options={[
                'Avascular necrosis pattern (Perthes)',
                'Bone marrow oedema (OM)',
                'Soft tissue collections',
              ]}
              value={mriFindings}
              onChange={setMriFindings}
              multi
              color="sky"
            />
          </FL>

          <FL label="Bone Age (Greulich-Pyle)">
            <Pills options={['Appropriate', 'Advanced', 'Delayed']} value={boneAgeResult} onChange={setBoneAgeResult} color="sky"/>
          </FL>
        </Section>

        {/* ───────────── SECTION 6 ───────────── */}
        <Section title="Management Plan" applicable={sec6App} onApplicable={setSec6App} color="indigo">
          <FL label="Working Diagnosis" sub="(select all that apply)">
            <Pills
              options={[
                'DDH', 'Perthes', 'SCFE', 'Clubfoot', 'Transient synovitis',
                'Septic arthritis', 'Osteomyelitis', 'Genu varum', 'Genu valgum',
                "Blount's disease", 'Scoliosis (idiopathic)', 'Scoliosis (congenital)',
                'Scoliosis (neuromuscular)', 'Spondylolisthesis', 'Limb length discrepancy',
                'Cerebral palsy (ortho complications)', 'Spina bifida', 'Syndromic',
              ]}
              value={workingDiagnosis}
              onChange={setWorkingDiagnosis}
              multi
              color="indigo"
            />
          </FL>

          <FL label="Management Plan" sub="(select all that apply)">
            <Pills
              options={[
                'Observation only', 'Physiotherapy', 'Orthotics/bracing',
                'Serial casting (Ponseti)', 'Pavlik harness', 'Surgical',
                'Multidisciplinary (CP/NF1/spina bifida)',
              ]}
              value={managementPlan}
              onChange={setManagementPlan}
              multi
              color="indigo"
            />
          </FL>

          {/* Indian context note */}
          <div className="rounded-xl bg-gray-100 border border-gray-300 px-5 py-4 text-sm text-gray-700 space-y-1">
            <p className="font-semibold text-gray-800">Indian Context Note</p>
            <p>Polio sequelae still seen. Rickets common — check alkaline phosphatase. TB bone/joint (Pott's disease) — hip/spine. Clubfoot — Ponseti method available at AIIMS/teaching hospitals.</p>
          </div>

          <FL label="Vitamin D Supplementation">
            <Pills options={['Yes', 'No']} value={vitaminD} onChange={setVitaminD} color="indigo"/>
          </FL>
          {vitaminD === 'Yes' && (
            <FL label="Vitamin D Dose">
              <Pills
                options={['200 IU', '400 IU', '600 IU', '1000 IU', '2000 IU']}
                value={vitaminDDose}
                onChange={setVitaminDDose}
                color="indigo"
              />
            </FL>
          )}

          <FL label="Calcium Supplementation">
            <Pills options={['Yes', 'No']} value={calcium} onChange={setCalcium} color="indigo"/>
          </FL>

          <FL label="Follow-up">
            <Pills
              options={['2 weeks', '4 weeks', '6 weeks', '3 months', '6 months']}
              value={followUp}
              onChange={setFollowUp}
              color="indigo"
            />
          </FL>

          <FL label="Genetics / Syndrome Referral">
            <Pills options={['Yes', 'No']} value={geneticsReferral} onChange={setGeneticsReferral} color="indigo"/>
          </FL>
        </Section>

        {/* ───────────── Save Button ───────────── */}
        <div className="flex items-center gap-4 pb-8">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saveState === 'saving'}
            className={`px-8 py-3 rounded-xl font-semibold text-white shadow-md transition-all
              ${saveState === 'saving'
                ? 'bg-gray-400 cursor-not-allowed'
                : saveState === 'saved'
                  ? 'bg-emerald-600'
                  : saveState === 'error'
                    ? 'bg-red-600'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 active:scale-95'
              }`}
          >
            {saveState === 'saving' && 'Saving…'}
            {saveState === 'saved' && '✓ Saved'}
            {saveState === 'error' && 'Error — Retry'}
            {saveState === 'idle' && 'Save Pediatric Ortho Assessment'}
          </button>
          {saveState === 'error' && (
            <p className="text-sm text-red-600">Failed to save. Please check your connection and try again.</p>
          )}
        </div>

      </div>
    </div>
  );
}
