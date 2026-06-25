/**
 * @shared-pool
 * MenopauseAssessmentForm — Comprehensive menopause clinical assessment
 * Covers: MRS scoring, vasomotor/psychological/urogenital symptoms,
 * HRT candidacy, bone/cardiovascular health, Indian context
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */

import React, { useState, useMemo } from 'react';
import { Flame, ChevronDown, ChevronUp, Lock, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import api from '../../../api/client';

/* ── accent palette ── */
const A = {
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-300',  text: 'text-amber-700',   pill: 'bg-amber-100 border-amber-400 text-amber-800',   active: 'bg-amber-500 text-white border-amber-500' },
  orange:  { bg: 'bg-orange-50',  border: 'border-orange-300', text: 'text-orange-700',  pill: 'bg-orange-100 border-orange-400 text-orange-800',  active: 'bg-orange-500 text-white border-orange-500' },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-300',   text: 'text-rose-700',    pill: 'bg-rose-100 border-rose-400 text-rose-800',    active: 'bg-rose-500 text-white border-rose-500' },
  red:     { bg: 'bg-red-50',     border: 'border-red-300',    text: 'text-red-700',     pill: 'bg-red-100 border-red-400 text-red-800',     active: 'bg-red-500 text-white border-red-500' },
  purple:  { bg: 'bg-purple-50',  border: 'border-purple-300', text: 'text-purple-700',  pill: 'bg-purple-100 border-purple-400 text-purple-800',  active: 'bg-purple-500 text-white border-purple-500' },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-300', text: 'text-violet-700',  pill: 'bg-violet-100 border-violet-400 text-violet-800',  active: 'bg-violet-500 text-white border-violet-500' },
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-300',   text: 'text-blue-700',    pill: 'bg-blue-100 border-blue-400 text-blue-800',    active: 'bg-blue-500 text-white border-blue-500' },
  green:   { bg: 'bg-green-50',   border: 'border-green-300',  text: 'text-green-700',   pill: 'bg-green-100 border-green-400 text-green-800',   active: 'bg-green-500 text-white border-green-500' },
};

/* ── Pills ── */
function Pills({ options, value, onChange, accent = 'amber', multi = false }) {
  const c = A[accent];
  const selected = multi ? (Array.isArray(value) ? value : []) : value;
  const toggle = (opt) => {
    if (multi) {
      const arr = Array.isArray(selected) ? selected : [];
      onChange(arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt]);
    } else {
      onChange(selected === opt ? '' : opt);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = multi ? selected.includes(opt) : selected === opt;
        return (
          <button key={opt} type="button" onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${active ? c.active : c.pill}`}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/* ── Field label ── */
function FL({ label, sub, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-semibold text-gray-700">
        {label}{sub && <span className="ml-1 text-xs font-normal text-gray-500">{sub}</span>}
      </label>
      {children}
    </div>
  );
}

/* ── Gate (inline yes/no expand) ── */
function Gate({ label, value, onChange, accent = 'amber', children }) {
  const c = A[accent];
  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} p-3`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex gap-2">
          {['Yes', 'No'].map(opt => (
            <button key={opt} type="button" onClick={() => onChange(value === opt ? '' : opt)}
              className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all ${value === opt ? c.active : c.pill}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      {value === 'Yes' && children && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}

/* ── Section ── */
function Section({ title, applicable, onApplicable, accent = 'amber', children }) {
  const c = A[accent];
  const [open, setOpen] = useState(true);
  if (applicable === 'N/A') {
    return (
      <div className={`rounded-xl border-2 border-dashed ${c.border} p-4 flex items-center gap-3 opacity-60`}>
        <Lock className="w-5 h-5 text-gray-400" />
        <span className="text-sm text-gray-500 font-medium">{title} — Not applicable · section locked</span>
        <button type="button" onClick={() => onApplicable('Applicable')}
          className="ml-auto text-xs text-blue-600 underline">Unlock</button>
      </div>
    );
  }
  return (
    <div className={`rounded-xl border-2 ${c.border} overflow-hidden`}>
      <div className={`${c.bg} px-4 py-3 flex items-center justify-between flex-wrap gap-2`}>
        <span className={`font-bold text-base ${c.text}`}>{title}</span>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {['Applicable', 'N/A'].map(v => (
              <button key={v} type="button" onClick={() => onApplicable(v)}
                className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold transition-all ${applicable === v ? c.active : c.pill}`}>
                {v}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setOpen(o => !o)} className={`${c.text} p-1`}>
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {open && applicable === 'Applicable' && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

/* ── MRS severity label ── */
function mrsSeverity(score, max) {
  const pct = score / max;
  if (pct === 0) return { label: 'None', color: 'text-green-700 bg-green-50 border-green-300' };
  if (pct <= 0.25) return { label: 'Mild', color: 'text-yellow-700 bg-yellow-50 border-yellow-300' };
  if (pct <= 0.5) return { label: 'Moderate', color: 'text-orange-700 bg-orange-50 border-orange-300' };
  if (pct <= 0.75) return { label: 'Severe', color: 'text-red-600 bg-red-50 border-red-300' };
  return { label: 'Very Severe', color: 'text-red-800 bg-red-100 border-red-400' };
}

const MRS_SCALE = ['None (0)', 'Mild (1)', 'Moderate (2)', 'Severe (3)', 'Very Severe (4)'];
const MRS_VALS  = [0, 1, 2, 3, 4];

/* ── Stages ── */
const STAGES = [
  'Patient & Menstrual Status',
  'Somatic Symptoms (MRS 1–4)',
  'Psychological Symptoms (MRS 5–8)',
  'Urogenital Symptoms (MRS 9–11)',
  'HRT Candidacy',
  'Bone & Cardiovascular Health',
  'Management Plan',
];

export default function MenopauseAssessmentForm({ patientId, encounterId, onSaved }) {
  /* ── stage / section applicable ── */
  const [stage, setStage] = useState(0);
  const [sec, setSec] = useState({
    menstrual: 'Applicable', somatic: 'Applicable', psychological: 'Applicable',
    urogenital: 'Applicable', hrt: 'Applicable', bone: 'Applicable', mgmt: 'Applicable',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  /* ── Stage 0: Patient & Menstrual Status ── */
  const [age, setAge] = useState('');
  const [bmi, setBmi] = useState('');
  const [menopausalStatus, setMenopausalStatus] = useState('');
  const [lastMenstrualPeriod, setLastMenstrualPeriod] = useState('');
  const [amenorrhoeaDuration, setAmenorrhoeaDuration] = useState('');
  const [fshLevel, setFshLevel] = useState('');
  const [e2Level, setE2Level] = useState('');
  const [menopausalType, setMenopausalType] = useState('');
  const [surgicalCause, setSurgicalCause] = useState('');
  const [perimenopauseFeatures, setPerimenopauseFeatures] = useState([]);
  const [prematureMenopause, setPrematureMenopause] = useState('');
  const [poi, setPoi] = useState('');

  /* ── Stage 1: Somatic (MRS 1–4) ── */
  const [mrs1HotFlush, setMrs1HotFlush] = useState(null);        // Hot flushes / sweating
  const [mrs2Heart, setMrs2Heart] = useState(null);              // Heart discomfort
  const [mrs3Sleep, setMrs3Sleep] = useState(null);              // Sleep problems
  const [mrs4Joint, setMrs4Joint] = useState(null);              // Muscle / joint problems

  // Vasomotor detail
  const [flushFrequency, setFlushFrequency] = useState('');
  const [flushTriggers, setFlushTriggers] = useState([]);
  const [nightSweats, setNightSweats] = useState('');
  const [palp, setPalp] = useState('');

  /* ── Stage 2: Psychological (MRS 5–8) ── */
  const [mrs5Depressed, setMrs5Depressed] = useState(null);      // Depressive mood
  const [mrs6Irritable, setMrs6Irritable] = useState(null);      // Irritability
  const [mrs7Anxious, setMrs7Anxious] = useState(null);          // Anxiety
  const [mrs8Exhaustion, setMrs8Exhaustion] = useState(null);    // Mental exhaustion
  const [phq2Anhedonia, setPhq2Anhedonia] = useState('');
  const [phq2LowMood, setPhq2LowMood] = useState('');
  const [selfHarmQuery, setSelfHarmQuery] = useState('');
  const [cognitiveComplaints, setCognitiveComplaints] = useState([]);

  /* ── Stage 3: Urogenital (MRS 9–11) ── */
  const [mrs9Sexual, setMrs9Sexual] = useState(null);            // Sexual problems
  const [mrs10Bladder, setMrs10Bladder] = useState(null);        // Bladder problems
  const [mrs11Vaginal, setMrs11Vaginal] = useState(null);        // Vaginal dryness
  const [dyspareunia, setDyspareunia] = useState('');
  const [libidoChange, setLibidoChange] = useState('');
  const [urinarySymptoms, setUrinarySymptoms] = useState([]);
  const [utiFrequency, setUtiFrequency] = useState('');
  const [prolapse, setProlapse] = useState('');
  const [prolapseGrade, setProlapseGrade] = useState('');

  /* ── Stage 4: HRT Candidacy ── */
  const [hrtDesired, setHrtDesired] = useState('');
  const [hrtContraindications, setHrtContraindications] = useState([]);
  const [breastCancerHistory, setBreastCancerHistory] = useState('');
  const [vteHistory, setVteHistory] = useState('');
  const [unexPlainedVagBleeding, setUnexplainedVagBleeding] = useState('');
  const [liverDisease, setLiverDisease] = useState('');
  const [smokingStatus, setSmokingStatus] = useState('');
  const [oestrogenType, setOestrogenType] = useState('');
  const [progestogenType, setProgestogenType] = useState('');
  const [hrtRoute, setHrtRoute] = useState('');
  const [tibolonaInterest, setTibolonaInterest] = useState('');
  const [hrtDuration, setHrtDuration] = useState('');
  const [hrtPreviousUse, setHrtPreviousUse] = useState('');
  const [ayurvedicSupplements, setAyurvedicSupplements] = useState([]);
  const [phytooestrogens, setPhytooestrogens] = useState('');

  /* ── Stage 5: Bone & Cardiovascular ── */
  const [dexa, setDexa] = useState('');
  const [dexaResult, setDexaResult] = useState('');
  const [tScoreLumbar, setTScoreLumbar] = useState('');
  const [tScoreHip, setTScoreHip] = useState('');
  const [fraxScore, setFraxScore] = useState('');
  const [fractureHistory, setFractureHistory] = useState('');
  const [steroidUse, setSteroidUse] = useState('');
  const [calciumIntake, setCalciumIntake] = useState('');
  const [vitDLevel, setVitDLevel] = useState('');
  const [cvRisk, setCvRisk] = useState('');
  const [lipidProfile, setLipidProfile] = useState('');
  const [diabetesStatus, setDiabetesStatus] = useState('');
  const [hypertension, setHypertension] = useState('');
  const [thyroidStatus, setThyroidStatus] = useState('');
  const [boneTherapy, setBoneTherapy] = useState([]);

  /* ── Stage 6: Management Plan ── */
  const [lifestyle, setLifestyle] = useState([]);
  const [nonHormonalTx, setNonHormonalTx] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [reviewPlan, setReviewPlan] = useState('');
  const [patientConcerns, setPatientConcerns] = useState('');
  const [culturalContext, setCulturalContext] = useState([]);
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /* ── AUTO: MRS subscale scores ── */
  const mrsScores = useMemo(() => {
    const somatic = [mrs1HotFlush, mrs2Heart, mrs3Sleep, mrs4Joint]
      .reduce((s, v) => s + (v !== null ? v : 0), 0);
    const psychological = [mrs5Depressed, mrs6Irritable, mrs7Anxious, mrs8Exhaustion]
      .reduce((s, v) => s + (v !== null ? v : 0), 0);
    const urogenital = [mrs9Sexual, mrs10Bladder, mrs11Vaginal]
      .reduce((s, v) => s + (v !== null ? v : 0), 0);
    const total = somatic + psychological + urogenital;
    return { somatic, psychological, urogenital, total };
  }, [mrs1HotFlush, mrs2Heart, mrs3Sleep, mrs4Joint, mrs5Depressed, mrs6Irritable, mrs7Anxious, mrs8Exhaustion, mrs9Sexual, mrs10Bladder, mrs11Vaginal]);

  /* ── AUTO: Overall MRS burden ── */
  const mrsBurden = useMemo(() => {
    const t = mrsScores.total;
    if (t === 0) return null;
    if (t <= 8) return { label: 'Mild burden', color: 'text-yellow-700 bg-yellow-50 border-yellow-300' };
    if (t <= 16) return { label: 'Moderate burden', color: 'text-orange-700 bg-orange-50 border-orange-300' };
    if (t <= 24) return { label: 'Severe burden', color: 'text-red-600 bg-red-50 border-red-300' };
    return { label: 'Very severe burden', color: 'text-red-900 bg-red-100 border-red-400 animate-pulse' };
  }, [mrsScores.total]);

  /* ── AUTO: HRT contraindication flags ── */
  const hrtContraAlert = useMemo(() => {
    const flags = [];
    if (breastCancerHistory === 'Yes') flags.push('Breast cancer history — HRT generally contraindicated; specialist decision required');
    if (vteHistory === 'Yes') flags.push('VTE history — oral oestrogen contraindicated; consider transdermal route');
    if (unexPlainedVagBleeding === 'Yes') flags.push('Unexplained vaginal bleeding — investigate before starting HRT');
    if (liverDisease === 'Yes') flags.push('Active liver disease — HRT relatively contraindicated');
    if (smokingStatus === 'Current smoker') flags.push('Current smoker — increased VTE risk with oral oestrogen; prefer transdermal');
    return flags;
  }, [breastCancerHistory, vteHistory, unexPlainedVagBleeding, liverDisease, smokingStatus]);

  /* ── AUTO: Bone risk ── */
  const boneRisk = useMemo(() => {
    const flags = [];
    const t = Number(tScoreLumbar) || Number(tScoreHip);
    if (t && t <= -2.5) flags.push('T-score ≤ −2.5 — Osteoporosis (treatment threshold met)');
    else if (t && t <= -1.0) flags.push('T-score −1.0 to −2.5 — Osteopenia (lifestyle + assess FRAX)');
    if (Number(vitDLevel) < 50) flags.push(`Vitamin D deficiency (${vitDLevel} nmol/L) — supplement required`);
    if (fractureHistory === 'Yes') flags.push('Fragility fracture history — high fracture risk, pharmacotherapy indicated');
    if (steroidUse === 'Yes') flags.push('Glucocorticoid use — glucocorticoid-induced osteoporosis risk');
    if (Number(age) < 45 && menopausalStatus === 'Premature menopause / POI') flags.push('POI — bone loss accelerated; HRT strongly recommended for bone protection until age 51');
    return flags;
  }, [tScoreLumbar, tScoreHip, vitDLevel, fractureHistory, steroidUse, age, menopausalStatus]);

  /* ── AUTO: POI / early menopause flag ── */
  const poiAlert = useMemo(() => {
    if (Number(age) < 40 && (poi === 'Yes' || menopausalStatus === 'Premature menopause / POI')) {
      return 'Premature Ovarian Insufficiency (POI) — age <40. HRT recommended until average menopausal age (51) for bone, cardiovascular, and cognitive protection. Fertility counselling required.';
    }
    if (Number(age) >= 40 && Number(age) < 45 && menopausalStatus === 'Premature menopause / POI') {
      return 'Early menopause (age 40–44) — increased long-term health risks. HRT strongly recommended.';
    }
    return null;
  }, [age, poi, menopausalStatus]);

  /* ── Save ── */
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/assessments', {
        type: 'menopause_assessment',
        patientId, encounterId,
        data: {
          age, bmi, menopausalStatus, lastMenstrualPeriod, amenorrhoeaDuration,
          fshLevel, e2Level, menopausalType, surgicalCause, perimenopauseFeatures,
          prematureMenopause, poi,
          mrs: {
            somatic: { hotFlush: mrs1HotFlush, heart: mrs2Heart, sleep: mrs3Sleep, joint: mrs4Joint },
            psychological: { depressed: mrs5Depressed, irritable: mrs6Irritable, anxious: mrs7Anxious, exhaustion: mrs8Exhaustion },
            urogenital: { sexual: mrs9Sexual, bladder: mrs10Bladder, vaginal: mrs11Vaginal },
            scores: mrsScores,
          },
          vasomotor: { flushFrequency, flushTriggers, nightSweats, palp },
          psychological: { phq2Anhedonia, phq2LowMood, selfHarmQuery, cognitiveComplaints },
          urogenital: { dyspareunia, libidoChange, urinarySymptoms, utiFrequency, prolapse, prolapseGrade },
          hrt: {
            desired: hrtDesired, contraindications: hrtContraindications,
            breastCancerHistory, vteHistory, unexPlainedVagBleeding, liverDisease, smokingStatus,
            oestrogenType, progestogenType, route: hrtRoute, tibolonaInterest,
            duration: hrtDuration, previousUse: hrtPreviousUse,
            ayurvedicSupplements, phytooestrogens,
          },
          bone: {
            dexa, dexaResult, tScoreLumbar, tScoreHip, fraxScore,
            fractureHistory, steroidUse, calciumIntake, vitDLevel,
          },
          cardiovascular: { cvRisk, lipidProfile, diabetesStatus, hypertension },
          thyroidStatus, boneTherapy,
          mgmt: { lifestyle, nonHormonalTx, referrals, reviewPlan, patientConcerns, culturalContext, notes },
        },
      });
      setSaved(true);
      onSaved?.();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  /* ── MRS item row ── */
  const MrsItem = ({ label, value, onChange }) => (
    <div className="space-y-1">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="flex flex-wrap gap-2">
        {MRS_SCALE.map((opt, i) => (
          <button key={i} type="button" onClick={() => onChange(i)}
            className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-all
              ${value === i ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 border-amber-300 text-amber-800'}`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  /* ── Progress ── */
  const progress = Math.round(((stage + 1) / STAGES.length) * 100);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-600 to-orange-500 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Flame className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Menopause Assessment</h1>
            <p className="text-amber-100 text-sm">MRS scoring · HRT candidacy · Bone & CV health</p>
          </div>
        </div>
        {/* MRS summary badges */}
        {mrsScores.total > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold">
              MRS Total: {mrsScores.total}/44
            </span>
            <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold">
              Somatic: {mrsScores.somatic}/16
            </span>
            <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold">
              Psychological: {mrsScores.psychological}/16
            </span>
            <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold">
              Urogenital: {mrsScores.urogenital}/12
            </span>
            {mrsBurden && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${mrsBurden.color}`}>
                {mrsBurden.label}
              </span>
            )}
          </div>
        )}
        {/* HRT contra alerts in header */}
        {hrtContraAlert.length > 0 && (
          <div className="mt-2 space-y-1">
            {hrtContraAlert.map((a, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-1.5 rounded-lg bg-red-600/80 text-white text-xs">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{a}</span>
              </div>
            ))}
          </div>
        )}
        {poiAlert && (
          <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-red-500/80 text-white text-xs font-semibold animate-pulse">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{poiAlert}</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Stage tabs */}
      <div className="flex flex-wrap gap-2">
        {STAGES.map((s, i) => (
          <button key={i} type="button" onClick={() => setStage(i)}
            className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all
              ${stage === i ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 border-amber-300 text-amber-700'}`}>
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {/* ── Stage 0: Patient & Menstrual Status ── */}
      {stage === 0 && (
        <Section title="Patient & Menstrual Status" applicable={sec.menstrual} onApplicable={v => sa('menstrual', v)} accent="amber">
          <div className="grid grid-cols-2 gap-4">
            <FL label="Age (years)">
              <input type="number" value={age} onChange={e => setAge(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g., 47" />
            </FL>
            <FL label="BMI (kg/m²)">
              <input type="number" value={bmi} onChange={e => setBmi(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g., 26.5" />
            </FL>
          </div>

          <FL label="Menopausal Status">
            <Pills options={['Premenopausal', 'Perimenopause', 'Postmenopause (natural)', 'Premature menopause / POI', 'Surgical menopause']}
              value={menopausalStatus} onChange={setMenopausalStatus} accent="amber" />
          </FL>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            <Info className="w-4 h-4 inline mr-1" />
            Average age of menopause in India: ~47 years (vs. 51 years in Western populations). Perimenopause may start 2–8 years before last period.
          </div>

          {(menopausalStatus === 'Perimenopause') && (
            <FL label="Perimenopause Features">
              <Pills options={['Irregular cycles', 'Cycle shortening <25 days', 'Missed periods', 'Vasomotor symptoms', 'Mood changes', 'Sleep disturbance']}
                value={perimenopauseFeatures} onChange={setPerimenopauseFeatures} accent="amber" multi />
            </FL>
          )}

          <FL label="Last Menstrual Period (LMP)">
            <input type="date" value={lastMenstrualPeriod} onChange={e => setLastMenstrualPeriod(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </FL>
          <FL label="Duration of Amenorrhoea">
            <input type="text" value={amenorrhoeaDuration} onChange={e => setAmenorrhoeaDuration(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g., 14 months" />
          </FL>

          <div className="grid grid-cols-2 gap-4">
            <FL label="FSH Level" sub="(mIU/mL)">
              <input type="number" value={fshLevel} onChange={e => setFshLevel(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g., 45" />
              {Number(fshLevel) >= 40 && <p className="text-xs text-orange-600 mt-1">FSH ≥40 mIU/mL — consistent with menopause/POI</p>}
            </FL>
            <FL label="Oestradiol (E2)" sub="(pmol/L)">
              <input type="number" value={e2Level} onChange={e => setE2Level(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g., 80" />
              {Number(e2Level) < 100 && e2Level && <p className="text-xs text-orange-600 mt-1">E2 low — supports menopausal state</p>}
            </FL>
          </div>

          {menopausalStatus === 'Surgical menopause' && (
            <FL label="Surgical Cause">
              <Pills options={['Bilateral oophorectomy', 'Bilateral oophorectomy + hysterectomy', 'Hysterectomy (ovaries retained)', 'Chemotherapy-induced', 'Radiotherapy-induced']}
                value={surgicalCause} onChange={setSurgicalCause} accent="amber" />
            </FL>
          )}

          <Gate label="Premature Ovarian Insufficiency (POI) / Premature menopause?" value={poi} onChange={setPoi} accent="red">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
              POI (age &lt;40): requires chromosomal karyotype, FMR1 premutation screening, autoimmune screen (thyroid, adrenal antibodies). HRT until age 51 for bone/CV/cognitive protection. Fertility counselling — donor egg IVF may be considered.
            </div>
          </Gate>
        </Section>
      )}

      {/* ── Stage 1: Somatic Symptoms (MRS 1–4) ── */}
      {stage === 1 && (
        <Section title="Somatic Symptoms (MRS Items 1–4)" applicable={sec.somatic} onApplicable={v => sa('somatic', v)} accent="orange">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-800 mb-2">
            <Info className="w-4 h-4 inline mr-1" />
            MRS Somatic subscale: Max 16. Each item rated 0 (None) to 4 (Very Severe).
            Severity — Mild ≤4, Moderate 5–8, Severe 9–12, Very Severe 13–16.
          </div>

          <MrsItem label="MRS Item 1: Hot flushes / sweating episodes" value={mrs1HotFlush} onChange={setMrs1HotFlush} />
          <MrsItem label="MRS Item 2: Heart discomfort (palpitations, pounding, racing)" value={mrs2Heart} onChange={setMrs2Heart} />
          <MrsItem label="MRS Item 3: Sleep problems (difficulty falling or staying asleep)" value={mrs3Sleep} onChange={setMrs3Sleep} />
          <MrsItem label="MRS Item 4: Muscle and joint problems (pain, stiffness)" value={mrs4Joint} onChange={setMrs4Joint} />

          {/* Somatic subscale score */}
          {mrsScores.somatic > 0 && (
            <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border text-sm font-semibold ${mrsSeverity(mrsScores.somatic, 16).color}`}>
              Somatic subscale: {mrsScores.somatic}/16 — {mrsSeverity(mrsScores.somatic, 16).label}
            </div>
          )}

          <hr className="border-orange-200" />

          {/* Vasomotor detail */}
          <FL label="Hot Flush Frequency">
            <Pills options={['Rare (<1/week)', '1–2 per day', '3–5 per day', '6–10 per day', '>10 per day (severe)']}
              value={flushFrequency} onChange={setFlushFrequency} accent="orange" />
          </FL>

          <FL label="Flush Triggers" sub="(multi-select)">
            <Pills options={['Hot beverages', 'Spicy food', 'Alcohol', 'Stress', 'Warm environment', 'Exercise', 'Religious fasting (Navratri/Ekadashi)', 'Synthetic fabrics']}
              value={flushTriggers} onChange={setFlushTriggers} accent="orange" multi />
          </FL>

          <FL label="Night Sweats Severity">
            <Pills options={['None', 'Mild (damp)', 'Moderate (soaked)', 'Severe (change clothes/sheets)']}
              value={nightSweats} onChange={setNightSweats} accent="orange" />
          </FL>

          <Gate label="Palpitations / heart racing?" value={palp} onChange={setPalp} accent="orange">
            <FL label="Palpitation Details">
              <textarea rows={2} value={palp === 'Yes' ? palp : ''} placeholder="Duration, frequency, associated symptoms..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                onChange={e => setPalp(e.target.value)} />
            </FL>
          </Gate>
        </Section>
      )}

      {/* ── Stage 2: Psychological Symptoms (MRS 5–8) ── */}
      {stage === 2 && (
        <Section title="Psychological Symptoms (MRS Items 5–8)" applicable={sec.psychological} onApplicable={v => sa('psychological', v)} accent="purple">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-800 mb-2">
            <Info className="w-4 h-4 inline mr-1" />
            MRS Psychological subscale: Max 16. Screen with PHQ-2 for depression. Menopausal depression is under-recognised in Indian women due to cultural stigma.
          </div>

          <MrsItem label="MRS Item 5: Depressive mood (feeling downhearted, sad, tearful)" value={mrs5Depressed} onChange={setMrs5Depressed} />
          <MrsItem label="MRS Item 6: Irritability (feeling nervous, tense, aggressive)" value={mrs6Irritable} onChange={setMrs6Irritable} />
          <MrsItem label="MRS Item 7: Anxiety (inner restlessness, panic)" value={mrs7Anxious} onChange={setMrs7Anxious} />
          <MrsItem label="MRS Item 8: Mental exhaustion (poor concentration, memory problems)" value={mrs8Exhaustion} onChange={setMrs8Exhaustion} />

          {mrsScores.psychological > 0 && (
            <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border text-sm font-semibold ${mrsSeverity(mrsScores.psychological, 16).color}`}>
              Psychological subscale: {mrsScores.psychological}/16 — {mrsSeverity(mrsScores.psychological, 16).label}
            </div>
          )}

          <hr className="border-purple-200" />

          <FL label="PHQ-2 Screen" sub="(Over the last 2 weeks)">
            <div className="space-y-2">
              <div className="space-y-1">
                <p className="text-xs text-gray-600">Little interest or pleasure in doing things?</p>
                <Pills options={['Not at all (0)', 'Several days (1)', 'More than half the days (2)', 'Nearly every day (3)']}
                  value={phq2Anhedonia} onChange={setPhq2Anhedonia} accent="purple" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-600">Feeling down, depressed, or hopeless?</p>
                <Pills options={['Not at all (0)', 'Several days (1)', 'More than half the days (2)', 'Nearly every day (3)']}
                  value={phq2LowMood} onChange={setPhq2LowMood} accent="purple" />
              </div>
            </div>
          </FL>

          {(phq2Anhedonia.includes('2)') || phq2Anhedonia.includes('3)') || phq2LowMood.includes('2)') || phq2LowMood.includes('3)')) && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-xs text-red-700 flex gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              PHQ-2 positive — consider full PHQ-9. Depression during menopause warrants specific treatment (HRT alone or SSRIs/SNRIs). Refer if needed.
            </div>
          )}

          <Gate label="Thoughts of self-harm or hopelessness?" value={selfHarmQuery} onChange={setSelfHarmQuery} accent="red">
            <div className="bg-red-100 border border-red-400 rounded-lg p-3 text-xs text-red-800 font-semibold">
              IMMEDIATE ASSESSMENT REQUIRED — Complete safety evaluation. Do not discharge without safety plan. Consider urgent psychiatry referral.
            </div>
          </Gate>

          <FL label="Cognitive Complaints" sub="(multi-select)">
            <Pills options={['Memory lapses', 'Word-finding difficulty', 'Poor concentration', 'Brain fog', 'Slowed thinking', 'None reported']}
              value={cognitiveComplaints} onChange={setCognitiveComplaints} accent="purple" multi />
          </FL>
        </Section>
      )}

      {/* ── Stage 3: Urogenital Symptoms (MRS 9–11) ── */}
      {stage === 3 && (
        <Section title="Urogenital Symptoms (MRS Items 9–11)" applicable={sec.urogenital} onApplicable={v => sa('urogenital', v)} accent="rose">
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 mb-2">
            <Info className="w-4 h-4 inline mr-1" />
            MRS Urogenital subscale: Max 12. GSM (Genitourinary Syndrome of Menopause) is under-reported in Indian women due to cultural modesty; direct questioning is essential.
          </div>

          <MrsItem label="MRS Item 9: Sexual problems (change in desire, activity, or satisfaction)" value={mrs9Sexual} onChange={setMrs9Sexual} />
          <MrsItem label="MRS Item 10: Bladder problems (frequency, urgency, incontinence)" value={mrs10Bladder} onChange={setMrs10Bladder} />
          <MrsItem label="MRS Item 11: Vaginal dryness / burning / itching during sex" value={mrs11Vaginal} onChange={setMrs11Vaginal} />

          {mrsScores.urogenital > 0 && (
            <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border text-sm font-semibold ${mrsSeverity(mrsScores.urogenital, 12).color}`}>
              Urogenital subscale: {mrsScores.urogenital}/12 — {mrsSeverity(mrsScores.urogenital, 12).label}
            </div>
          )}

          <hr className="border-rose-200" />

          <FL label="Dyspareunia (painful intercourse)">
            <Pills options={['None', 'Mild', 'Moderate — affecting sexual activity', 'Severe — avoiding intercourse']}
              value={dyspareunia} onChange={setDyspareunia} accent="rose" />
          </FL>

          <FL label="Libido Change">
            <Pills options={['No change', 'Mildly reduced', 'Significantly reduced', 'Absent', 'Increased']}
              value={libidoChange} onChange={setLibidoChange} accent="rose" />
          </FL>

          <FL label="Urinary Symptoms" sub="(multi-select)">
            <Pills options={['Frequency', 'Urgency', 'Urgency incontinence', 'Stress incontinence', 'Nocturia', 'Recurrent UTI', 'Dysuria', 'Incomplete emptying']}
              value={urinarySymptoms} onChange={setUrinarySymptoms} accent="rose" multi />
          </FL>

          {urinarySymptoms.includes('Recurrent UTI') && (
            <FL label="UTI Frequency (last 12 months)">
              <Pills options={['2 episodes', '3 episodes', '4+ episodes']}
                value={utiFrequency} onChange={setUtiFrequency} accent="rose" />
            </FL>
          )}

          <Gate label="Pelvic organ prolapse symptoms?" value={prolapse} onChange={setProlapse} accent="rose">
            <FL label="POP Quantification (if assessed)">
              <Pills options={['POP-Q Stage I', 'POP-Q Stage II', 'POP-Q Stage III', 'POP-Q Stage IV']}
                value={prolapseGrade} onChange={setProlapseGrade} accent="rose" />
            </FL>
          </Gate>
        </Section>
      )}

      {/* ── Stage 4: HRT Candidacy ── */}
      {stage === 4 && (
        <Section title="HRT Candidacy & Risk Assessment" applicable={sec.hrt} onApplicable={v => sa('hrt', v)} accent="violet">
          <FL label="Patient's Desire for HRT">
            <Pills options={['Keen to try HRT', 'Open to discussion', 'Prefers non-hormonal', 'Declines HRT', 'Already on HRT']}
              value={hrtDesired} onChange={setHrtDesired} accent="violet" />
          </FL>

          <FL label="Absolute/Relative Contraindications" sub="(multi-select)">
            <Pills options={['Breast cancer (current or recent)', 'Endometrial cancer', 'VTE (DVT/PE) history', 'Active liver disease', 'Undiagnosed vaginal bleeding', 'Active cardiovascular disease', 'Systemic lupus (anti-phospholipid)', 'Pregnancy']}
              value={hrtContraindications} onChange={setHrtContraindications} accent="violet" multi />
          </FL>

          <div className="grid grid-cols-2 gap-3">
            <Gate label="Personal/family history of breast cancer?" value={breastCancerHistory} onChange={setBreastCancerHistory} accent="red">
              <p className="text-xs text-red-700">Specialist oncologist/gynaecologist guidance required. Tibolone and combined HRT generally avoided. Oestrogen-only (post-hysterectomy) may be considered case-by-case.</p>
            </Gate>
            <Gate label="History of VTE (DVT or PE)?" value={vteHistory} onChange={setVteHistory} accent="red">
              <p className="text-xs text-red-700">Oral oestrogen avoided — increases VTE risk. Transdermal oestrogen is safer (no first-pass hepatic effect). LMWH cover may be required in high-risk procedures.</p>
            </Gate>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Gate label="Unexplained vaginal bleeding?" value={unexPlainedVagBleeding} onChange={setUnexplainedVagBleeding} accent="red">
              <p className="text-xs text-red-700">Endometrial biopsy / hysteroscopy required before HRT initiation.</p>
            </Gate>
            <Gate label="Active liver disease?" value={liverDisease} onChange={setLiverDisease} accent="red">
              <p className="text-xs text-red-700">Transdermal route preferred if HRT considered; LFTs monitoring required.</p>
            </Gate>
          </div>

          <FL label="Smoking Status">
            <Pills options={['Never smoked', 'Ex-smoker', 'Current smoker', 'Passive smoker']}
              value={smokingStatus} onChange={setSmokingStatus} accent="violet" />
          </FL>

          {hrtContraAlert.length > 0 && (
            <div className="space-y-2">
              {hrtContraAlert.map((a, i) => (
                <div key={i} className="flex items-start gap-2 bg-red-50 border border-red-300 rounded-lg p-3 text-xs text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{a}</span>
                </div>
              ))}
            </div>
          )}

          <hr className="border-violet-200" />

          <FL label="Oestrogen Type (if HRT planned)">
            <Pills options={['Conjugated equine oestrogen (CEE)', 'Micronised oestradiol (17β-E2)', 'Oestradiol valerate', 'Estriol (local/vaginal only)']}
              value={oestrogenType} onChange={setOestrogenType} accent="violet" />
          </FL>

          <FL label="HRT Route">
            <Pills options={['Oral', 'Transdermal patch', 'Transdermal gel', 'Vaginal ring', 'Vaginal cream/pessary (local only)', 'Subcutaneous implant']}
              value={hrtRoute} onChange={setHrtRoute} accent="violet" />
          </FL>

          {!['Vaginal ring', 'Vaginal cream/pessary (local only)'].includes(hrtRoute) && hrtRoute && (
            <FL label="Progestogen Type" sub="(if uterus intact)">
              <Pills options={['Micronised progesterone (Utrogestan — lowest breast risk)', 'Dydrogesterone (Femoston)', 'Medroxyprogesterone acetate (MPA)', 'Norethisterone (NET)', 'Levonorgestrel IUS (Mirena — systemic progestogen)']}
                value={progestogenType} onChange={setProgestogenType} accent="violet" />
            </FL>
          )}

          <FL label="Tibolone (Livial) interest?" sub="(for women >1 year postmenopausal)">
            <Pills options={['Yes — suitable candidate', 'No', 'Discuss']}
              value={tibolonaInterest} onChange={setTibolonaInterest} accent="violet" />
          </FL>

          <FL label="Planned HRT Duration">
            <Pills options={['Short-term (<2 years — symptom relief)', 'Medium-term (2–5 years)', 'Long-term (>5 years — bone/POI benefit)', 'Indefinite (POI until age 51)', 'Reassess annually']}
              value={hrtDuration} onChange={setHrtDuration} accent="violet" />
          </FL>

          <Gate label="Previous HRT use?" value={hrtPreviousUse} onChange={setHrtPreviousUse} accent="violet">
            <FL label="Details of previous HRT">
              <textarea rows={2} placeholder="Type, duration, reason for stopping..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </FL>
          </Gate>

          <hr className="border-violet-200" />
          <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Complementary / Alternative Therapies</p>

          <FL label="Ayurvedic / Herbal Supplements in Use" sub="(multi-select — note drug interactions)">
            <Pills options={['Shatavari (Asparagus racemosus)', 'Ashwagandha', 'Lodhra', 'Licorice (mulethi)', 'Nagkesar', 'Black cohosh', 'Red clover isoflavones', 'None']}
              value={ayurvedicSupplements} onChange={setAyurvedicSupplements} accent="violet" multi />
          </FL>

          <FL label="Interest in Phytoestrogens (soy isoflavones, flaxseed)?">
            <Pills options={['Yes — already using', 'Yes — interested', 'No', 'Unsure']}
              value={phytooestrogens} onChange={setPhytooestrogens} accent="violet" />
          </FL>

          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-xs text-violet-800">
            <Info className="w-4 h-4 inline mr-1" />
            Herbal therapies may interact with warfarin, tamoxifen, and antidepressants. Shatavari has mild oestrogenic activity — document use in patients with oestrogen-sensitive cancers.
          </div>
        </Section>
      )}

      {/* ── Stage 5: Bone & Cardiovascular Health ── */}
      {stage === 5 && (
        <Section title="Bone & Cardiovascular Health" applicable={sec.bone} onApplicable={v => sa('bone', v)} accent="blue">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Bone Health</p>

          <Gate label="DEXA scan performed?" value={dexa} onChange={setDexa} accent="blue">
            <div className="grid grid-cols-2 gap-4">
              <FL label="Lumbar Spine T-score">
                <input type="number" step="0.1" value={tScoreLumbar} onChange={e => setTScoreLumbar(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g., -1.8" />
                {tScoreLumbar && (
                  <p className={`text-xs mt-1 ${Number(tScoreLumbar) <= -2.5 ? 'text-red-600' : Number(tScoreLumbar) <= -1.0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {Number(tScoreLumbar) <= -2.5 ? 'Osteoporosis' : Number(tScoreLumbar) <= -1.0 ? 'Osteopenia' : 'Normal'}
                  </p>
                )}
              </FL>
              <FL label="Femoral Neck T-score">
                <input type="number" step="0.1" value={tScoreHip} onChange={e => setTScoreHip(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g., -1.5" />
                {tScoreHip && (
                  <p className={`text-xs mt-1 ${Number(tScoreHip) <= -2.5 ? 'text-red-600' : Number(tScoreHip) <= -1.0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {Number(tScoreHip) <= -2.5 ? 'Osteoporosis' : Number(tScoreHip) <= -1.0 ? 'Osteopenia' : 'Normal'}
                  </p>
                )}
              </FL>
            </div>
            <FL label="DEXA Result Summary">
              <Pills options={['Normal bone density', 'Osteopenia', 'Osteoporosis', 'Severe osteoporosis (with fracture)']}
                value={dexaResult} onChange={setDexaResult} accent="blue" />
            </FL>
          </Gate>

          <FL label="FRAX 10-year fracture risk" sub="(%)">
            <input type="number" value={fraxScore} onChange={e => setFraxScore(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Major osteoporotic fracture %" />
          </FL>

          <div className="grid grid-cols-2 gap-3">
            <Gate label="History of fragility fracture?" value={fractureHistory} onChange={setFractureHistory} accent="blue">
              <p className="text-xs text-blue-700">Site(s) of fracture — document in notes. High-risk — pharmacotherapy indicated.</p>
            </Gate>
            <Gate label="Chronic steroid use (prednisolone ≥5 mg/day ≥3 months)?" value={steroidUse} onChange={setSteroidUse} accent="blue">
              <p className="text-xs text-blue-700">Glucocorticoid-induced osteoporosis — consider bisphosphonate even at lower T-scores.</p>
            </Gate>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FL label="Calcium Intake">
              <Pills options={['Adequate (≥1000 mg/day)', 'Borderline (500–999 mg/day)', 'Insufficient (<500 mg/day)', 'On supplements']}
                value={calciumIntake} onChange={setCalciumIntake} accent="blue" />
            </FL>
            <FL label="Vitamin D Level" sub="(nmol/L)">
              <input type="number" value={vitDLevel} onChange={e => setVitDLevel(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g., 42" />
              {vitDLevel && (
                <p className={`text-xs mt-1 ${Number(vitDLevel) < 25 ? 'text-red-600' : Number(vitDLevel) < 50 ? 'text-orange-600' : 'text-green-600'}`}>
                  {Number(vitDLevel) < 25 ? 'Severe deficiency (<25)' : Number(vitDLevel) < 50 ? 'Deficiency (25–49)' : 'Adequate (≥50)'}
                </p>
              )}
            </FL>
          </div>

          <FL label="Bone-Protective Therapy" sub="(multi-select)">
            <Pills options={['HRT (bone benefit at any dose)', 'Alendronate 70 mg weekly', 'Risedronate 35 mg weekly', 'Zoledronic acid IV (annual)', 'Denosumab (Prolia)', 'Calcium + Vitamin D supplementation', 'Weight-bearing exercise programme', 'None indicated']}
              value={boneTherapy} onChange={setBoneTherapy} accent="blue" multi />
          </FL>

          {boneRisk.length > 0 && (
            <div className="space-y-1">
              {boneRisk.map((r, i) => (
                <div key={i} className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{r}
                </div>
              ))}
            </div>
          )}

          <hr className="border-blue-200" />
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Cardiovascular Health</p>

          <FL label="Cardiovascular Risk">
            <Pills options={['Low (<10% 10-year risk)', 'Moderate (10–20%)', 'High (>20%)', 'Known CVD']}
              value={cvRisk} onChange={setCvRisk} accent="blue" />
          </FL>

          <div className="grid grid-cols-2 gap-3">
            <Gate label="Hypertension?" value={hypertension} onChange={setHypertension} accent="blue">
              <p className="text-xs text-blue-700">BP control essential before HRT. Prefer transdermal oestrogen — less effect on renin-angiotensin system.</p>
            </Gate>
            <Gate label="Diabetes / pre-diabetes?" value={diabetesStatus} onChange={setDiabetesStatus} accent="blue">
              <p className="text-xs text-blue-700">Oestrogen improves insulin sensitivity. HMT may reduce T2DM risk. Monitor HbA1c.</p>
            </Gate>
          </div>

          <FL label="Lipid Profile">
            <Pills options={['Normal', 'Raised total cholesterol', 'Low HDL', 'High triglycerides', 'Mixed dyslipidaemia', 'On statins']}
              value={lipidProfile} onChange={setLipidProfile} accent="blue" />
          </FL>

          <Gate label="Thyroid dysfunction?" value={thyroidStatus} onChange={setThyroidStatus} accent="blue">
            <p className="text-xs text-blue-700">Hypothyroidism mimics menopausal symptoms. TSH screening recommended. Oral oestrogen increases TBG — adjust levothyroxine dose if starting oral HRT.</p>
          </Gate>
        </Section>
      )}

      {/* ── Stage 6: Management Plan ── */}
      {stage === 6 && (
        <Section title="Management Plan" applicable={sec.mgmt} onApplicable={v => sa('mgmt', v)} accent="green">
          <FL label="Lifestyle Interventions" sub="(multi-select)">
            <Pills options={[
              'Weight reduction', 'Low GI diet / millets (ragi, jowar, bajra)', 'Mediterranean diet',
              'Calcium-rich diet (dairy, sesame, ragi)', 'Reduce caffeine / alcohol / spicy food',
              'Aerobic exercise ≥150 min/week', 'Resistance/weight-bearing exercise',
              'Yoga / Pranayama', 'Mind-body techniques', 'Sleep hygiene',
              'Smoking cessation', 'Avoid synthetic fabrics (trigger flushes)',
            ]}
              value={lifestyle} onChange={setLifestyle} accent="green" multi />
          </FL>

          <FL label="Non-Hormonal Treatment Options" sub="(multi-select)">
            <Pills options={[
              'SSRIs (Paroxetine, Escitalopram — hot flush)', 'SNRIs (Venlafaxine, Desvenlafaxine)',
              'Gabapentin / Pregabalin', 'Clonidine (vasomotor)', 'Ospemifene (GSM — oral SERM)',
              'Vaginal oestrogen (local, minimal systemic)', 'Vaginal moisturisers (Replens)',
              'Lubricants (K-Y, Durex Play)', 'Pelvic floor physiotherapy',
              'CBT for menopausal symptoms', 'Cognitive training programme',
              'Phytoestrogens (soy, flaxseed) — low evidence', 'Acupuncture',
            ]}
              value={nonHormonalTx} onChange={setNonHormonalTx} accent="green" multi />
          </FL>

          <FL label="Referrals" sub="(multi-select)">
            <Pills options={[
              'Gynaecologist (HRT specialist)', 'Endocrinologist (POI / metabolic)',
              'Psychiatrist / Psychologist', 'Physiotherapist (pelvic floor)',
              'Dietitian', 'Cardiologist', 'Rheumatologist (bone / joint)',
              'Oncologist (cancer history)', 'Urologist (prolapse / urinary)',
              'Social worker / Counsellor',
            ]}
              value={referrals} onChange={setReferrals} accent="green" multi />
          </FL>

          <FL label="Review Plan">
            <Pills options={['6-week review (new HRT start)', '3-monthly', '6-monthly', 'Annual', 'As needed']}
              value={reviewPlan} onChange={setReviewPlan} accent="green" />
          </FL>

          <FL label="Cultural & Contextual Considerations" sub="(multi-select)">
            <Pills options={[
              'Patient views menopause as natural — no treatment desired',
              'Family / in-law pressure not to seek treatment',
              'Cultural taboo discussing menopause / sexuality',
              'Religious fasting affecting symptoms',
              'Ayurvedic treatment preference',
              'Financial constraints — generic HRT preferred',
              'Rural patient — PHC/CHC referral pathway',
              'ASHA worker involvement for follow-up',
            ]}
              value={culturalContext} onChange={setCulturalContext} accent="green" multi />
          </FL>

          <FL label="Patient's Main Concerns / Goals">
            <textarea rows={3} value={patientConcerns} onChange={e => setPatientConcerns(e.target.value)}
              placeholder="Patient's own words — main symptoms to target, fears, priorities..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </FL>

          <FL label="Clinician Notes">
            <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Summary, differential diagnoses, plan, next steps..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </FL>

          {/* MRS Summary */}
          {mrsScores.total > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
              <p className="text-sm font-bold text-amber-800 mb-2">MRS Summary</p>
              <div className="grid grid-cols-3 gap-3 text-center text-sm">
                {[
                  { label: 'Somatic', score: mrsScores.somatic, max: 16 },
                  { label: 'Psychological', score: mrsScores.psychological, max: 16 },
                  { label: 'Urogenital', score: mrsScores.urogenital, max: 12 },
                ].map(({ label, score, max }) => {
                  const s = mrsSeverity(score, max);
                  return (
                    <div key={label} className={`rounded-lg border p-2 ${s.color}`}>
                      <p className="text-xs text-gray-600">{label}</p>
                      <p className="text-lg font-bold">{score}/{max}</p>
                      <p className="text-xs font-semibold">{s.label}</p>
                    </div>
                  );
                })}
              </div>
              <div className={`mt-2 text-center rounded-lg border px-4 py-2 text-sm font-bold ${mrsBurden?.color || 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                Total MRS: {mrsScores.total}/44 {mrsBurden ? `— ${mrsBurden.label}` : ''}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button type="button" disabled={stage === 0} onClick={() => setStage(s => s - 1)}
          className="px-4 py-2 rounded-lg border border-amber-300 text-amber-700 text-sm font-semibold disabled:opacity-40">
          ← Previous
        </button>
        <span className="text-xs text-gray-500">Stage {stage + 1} of {STAGES.length}</span>
        {stage < STAGES.length - 1 ? (
          <button type="button" onClick={() => setStage(s => s + 1)}
            className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold">
            Next →
          </button>
        ) : (
          <button type="button" onClick={handleSave} disabled={saving || saved}
            className="px-6 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center gap-2">
            {saved ? <><CheckCircle className="w-4 h-4" /> Saved</> : saving ? 'Saving…' : 'Save Assessment'}
          </button>
        )}
      </div>
    </div>
  );
}
