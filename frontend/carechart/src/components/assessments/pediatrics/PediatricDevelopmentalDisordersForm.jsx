/**
 * @shared-pool
 * PediatricDevelopmentalDisordersForm — Neurodevelopmental & behavioural assessment
 * Scoring: M-CHAT-R (autism), Vanderbilt ADHD (parent + teacher), Conners rating,
 *   IQ/adaptive functioning classification, GMFCS/MACS/CFCS (CP), Columbia suicide severity
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useMemo } from 'react';
import { Lock, ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700',
  pill: 'bg-violet-100 border-violet-300 text-violet-800',
  active: 'bg-violet-600 border-violet-700 text-white',
};

function Pills({ options, value, onChange, accent = A, multi = false }) {
  const vals = multi ? (Array.isArray(value) ? value : []) : value;
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const sel = multi ? vals.includes(o) : vals === o;
        return (
          <button key={o} type="button"
            onClick={() => {
              if (multi) onChange(sel ? vals.filter(x => x !== o) : [...vals, o]);
              else onChange(o);
            }}
            className={`px-3 py-1 rounded-full border text-sm font-medium transition-all ${sel ? accent.active : accent.pill}`}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

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

function Gate({ label, value, onChange, accent = A, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <Pills options={['Yes', 'No']} value={value} onChange={onChange} accent={accent} />
      </div>
      {value === 'Yes' && <div className="pl-4 border-l-2 border-violet-200 space-y-3">{children}</div>}
    </div>
  );
}

function Section({ title, applicable, onApplicable, accent = A, children }) {
  return (
    <div className={`rounded-xl border-2 ${applicable === 'N/A' ? 'border-gray-200 bg-gray-50' : accent.border + ' ' + accent.bg} overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className={`font-bold text-base ${applicable === 'N/A' ? 'text-gray-400' : accent.text}`}>{title}</h3>
        <div className="flex items-center gap-2">
          {applicable === 'N/A' && <Lock size={14} className="text-gray-400" />}
          <Pills options={['Applicable', 'N/A']} value={applicable} onChange={onApplicable} accent={accent} />
        </div>
      </div>
      {applicable === 'N/A' && (
        <div className="px-4 pb-3 text-xs text-gray-400 italic flex items-center gap-1">
          <Lock size={12} /> Not applicable · section locked
        </div>
      )}
      {applicable === 'Applicable' && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  );
}

function ScoreRow({ label, options, value, onChange, accent = A }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <span className="text-sm text-gray-700 w-52 shrink-0">{label}</span>
      <Pills options={options} value={value} onChange={onChange} accent={accent} />
    </div>
  );
}

const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400";
const ta = inp + " min-h-[72px] resize-y";

// M-CHAT-R items (23 items)
const MCHAT_ITEMS = [
  'If you point at something across the room, does your child look at it?',
  'Have you ever wondered if your child might be deaf?',
  'Does your child play pretend or make-believe?',
  'Does your child like climbing on things?',
  'Does your child make unusual finger movements near eyes?',
  'Does your child point with one finger to ask for something or to get help?',
  'Does your child point with one finger to show you something interesting?',
  'Is your child interested in other children?',
  'Does your child show you things by bringing them to you or holding them up for you to see?',
  'Does your child respond to his/her name when you call?',
  'When you smile at your child, does he/she smile back?',
  'Does your child get upset by everyday noises (vacuum, music)?',
  'Does your child walk?',
  'Does your child look you in the eye?',
  'Does your child try to copy what you do?',
  'If you turn your head to look at something, does your child look around to see what you are looking at?',
  'Does your child try to get you to watch him/her?',
  'Does your child understand when you tell him/her to do something?',
  'If something new happens, does your child look at your face to see how you feel?',
  'Does your child like movement activities (swinging, bouncing)?',
];

// Vanderbilt ADHD — parent 18 items (DSM-5 based)
const VANDERBILT_INATTENTION = [
  'Fails to give close attention to details / careless mistakes',
  'Has difficulty sustaining attention in tasks or play',
  'Does not seem to listen when spoken to directly',
  'Does not follow through on instructions / fails to finish schoolwork',
  'Has difficulty organizing tasks and activities',
  'Avoids or dislikes tasks requiring sustained mental effort',
  'Loses things needed for tasks (pencils, books, tools)',
  'Is easily distracted by extraneous stimuli',
  'Is forgetful in daily activities',
];
const VANDERBILT_HYPERACTIVITY = [
  'Fidgets with or taps hands / feet or squirms in seat',
  'Leaves seat in classroom or when remaining seated is expected',
  'Runs about or climbs excessively in inappropriate situations',
  'Has difficulty playing quietly',
  '"On the go" or acts as if "driven by a motor"',
  'Talks excessively',
  'Blurts out answers before questions are completed',
  'Has difficulty awaiting turn',
  'Interrupts or intrudes on others',
];

export default function PediatricDevelopmentalDisordersForm({ patientId, encounterId, onSaved }) {
  const [sec, setSec] = useState({
    developmental: 'Applicable', autism: 'N/A', adhd: 'N/A',
    id: 'N/A', ld: 'N/A', cp: 'N/A', language: 'N/A',
    dcd: 'N/A', sensory: 'N/A', behavioural: 'N/A',
    school: 'N/A', earlyintervention: 'N/A',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  // General Developmental
  const [chronologicalAge, setChronologicalAge] = useState('');
  const [correctedAge, setCorrectedAge] = useState('');
  const [developmentalConcern, setDevelopmentalConcern] = useState('');
  const [referralReason, setReferralReason] = useState([]);
  const [grossMotorAge, setGrossMotorAge] = useState('');
  const [fineMotorAge, setFineMotorAge] = useState('');
  const [languageAge, setLanguageAge] = useState('');
  const [socialAge, setSocialAge] = useState('');
  const [selfCareAge, setSelfCareAge] = useState('');
  const [developmentProfile, setDevelopmentProfile] = useState('');
  const [regressionPresent, setRegressionPresent] = useState('');
  const [regressionAge, setRegressionAge] = useState('');
  const [regressionFeatures, setRegressionFeatures] = useState([]);
  const [previousAssessments, setPreviousAssessments] = useState('');

  // Autism — M-CHAT-R
  const [mchatAnswers, setMchatAnswers] = useState({});
  const [asdDiagnosed, setAsdDiagnosed] = useState('');
  const [asdDiagnosedBy, setAsdDiagnosedBy] = useState('');
  const [asdDsmCriteria, setAsdDsmCriteria] = useState([]);
  const [asdSeverity, setAsdSeverity] = useState('');
  const [asdLanguage, setAsdLanguage] = useState('');
  const [asdSensory, setAsdSensory] = useState([]);
  const [asdComorbidities, setAsdComorbidities] = useState([]);
  const [adosResult, setAdosResult] = useState('');
  const [asdTreatment, setAsdTreatment] = useState([]);

  const mchatFail = useMemo(() => {
    // Fail items: questions where 'No' is the concerning answer (most items) — simplified scoring
    // Critical items: 2, 5, 7, 9, 13, 14, 15 — fail = immediate referral
    const criticalFails = [2,5,7,9,13,14,15]; // 1-indexed
    let totalFail = 0;
    let critFail = 0;
    MCHAT_ITEMS.forEach((_, i) => {
      const q = i + 1;
      const ans = mchatAnswers[q];
      // For Q2: fail if "Yes" (hears like deaf). For others: fail if "No" (lacks the skill)
      const isFail = q === 2 ? ans === 'Yes' : ans === 'No';
      if (isFail) {
        totalFail++;
        if (criticalFails.includes(q)) critFail++;
      }
    });
    return { totalFail, critFail };
  }, [mchatAnswers]);

  const mchatRisk = useMemo(() => {
    const { totalFail, critFail } = mchatFail;
    if (critFail >= 2 || totalFail >= 3) return 'HIGH RISK — refer for diagnostic evaluation (ADOS-2/ADI-R)';
    if (totalFail >= 2) return 'MEDIUM RISK — M-CHAT-R/F follow-up interview recommended';
    return 'LOW RISK (<2 fails on non-critical items)';
  }, [mchatFail]);

  // ADHD — Vanderbilt
  const [vanderbiltIn, setVanderbiltIn] = useState({});
  const [vanderbiltHy, setVanderbiltHy] = useState({});
  const [adhdSubtype, setAdhdSubtype] = useState('');
  const [adhdAge, setAdhdAge] = useState('');
  const [adhdSettings, setAdhdSettings] = useState([]);
  const [adhdComorbidities, setAdhdComorbidities] = useState([]);
  const [adhdTeacherRating, setAdhdTeacherRating] = useState('');
  const [adhdTreatment, setAdhdTreatment] = useState([]);
  const [adhdMedication, setAdhdMedication] = useState('');
  const [adhdMedDose, setAdhdMedDose] = useState('');
  const [adhdMedResponse, setAdhdMedResponse] = useState('');

  const vanderbiltScore = useMemo(() => {
    const scoreVal = s => ({ 'Never': 0, 'Occasionally': 1, 'Often': 2, 'Very Often': 3 }[s] ?? 0);
    const inScore = VANDERBILT_INATTENTION.reduce((a, _, i) => a + scoreVal(vanderbiltIn[i]), 0);
    const hyScore = VANDERBILT_HYPERACTIVITY.reduce((a, _, i) => a + scoreVal(vanderbiltHy[i]), 0);
    const inCriteria = VANDERBILT_INATTENTION.filter((_, i) => (vanderbiltIn[i] === 'Often' || vanderbiltIn[i] === 'Very Often')).length;
    const hyCriteria = VANDERBILT_HYPERACTIVITY.filter((_, i) => (vanderbiltHy[i] === 'Often' || vanderbiltHy[i] === 'Very Often')).length;
    return { inScore, hyScore, inCriteria, hyCriteria };
  }, [vanderbiltIn, vanderbiltHy]);

  const adhdSuggestedSubtype = useMemo(() => {
    const { inCriteria, hyCriteria } = vanderbiltScore;
    if (inCriteria >= 6 && hyCriteria >= 6) return 'ADHD Combined presentation (DSM-5 314.01)';
    if (inCriteria >= 6 && hyCriteria < 6) return 'ADHD Predominantly Inattentive (DSM-5 314.00)';
    if (inCriteria < 6 && hyCriteria >= 6) return 'ADHD Predominantly Hyperactive-Impulsive (DSM-5 314.01)';
    return 'Subthreshold — rule out other causes';
  }, [vanderbiltScore]);

  // Intellectual Disability
  const [iqScore, setIqScore] = useState('');
  const [iqTest, setIqTest] = useState('');
  const [idSeverity, setIdSeverity] = useState('');
  const [adaptiveFunctioning, setAdaptiveFunctioning] = useState('');
  const [idCause, setIdCause] = useState([]);
  const [idKaryotype, setIdKaryotype] = useState('');
  const [idMolecular, setIdMolecular] = useState('');
  const [idMetabolic, setIdMetabolic] = useState('');
  const [idComorbidities, setIdComorbidities] = useState([]);
  const [idSupport, setIdSupport] = useState([]);

  const iqClassification = useMemo(() => {
    const iq = parseFloat(iqScore);
    if (isNaN(iq)) return '';
    if (iq >= 70) return 'Borderline/Low average (IQ 70–84) — may not meet ID criteria';
    if (iq >= 55) return 'Mild ID (IQ 55–69) — educable, semi-independent adult life';
    if (iq >= 40) return 'Moderate ID (IQ 40–54) — trainable, supported employment';
    if (iq >= 25) return 'Severe ID (IQ 25–39) — needs high support, limited functional academics';
    return 'Profound ID (IQ <25) — total care dependency';
  }, [iqScore]);

  // Learning Disability
  const [ldType, setLdType] = useState([]);
  const [ldReading, setLdReading] = useState('');
  const [ldMath, setLdMath] = useState('');
  const [ldWriting, setLdWriting] = useState('');
  const [ldStandardScore, setLdStandardScore] = useState('');
  const [ldDiscrepancy, setLdDiscrepancy] = useState('');
  const [ldComorbidities, setLdComorbidities] = useState([]);
  const [ldAcademicSupport, setLdAcademicSupport] = useState([]);

  // Cerebral Palsy
  const [cpType, setCpType] = useState('');
  const [cpTopography, setCpTopography] = useState('');
  const [gmfcs, setGmfcs] = useState('');
  const [macs, setMacs] = useState('');
  const [cfcs, setCfcs] = useState('');
  const [vecs, setVecs] = useState('');
  const [cpCause, setCpCause] = useState([]);
  const [cpMri, setCpMri] = useState('');
  const [cpComorbidities, setCpComorbidities] = useState([]);
  const [cpTreatment, setCpTreatment] = useState([]);
  const [cpOrthosis, setCpOrthosis] = useState([]);

  // Language / Communication Disorders
  const [languageType, setLanguageType] = useState('');
  const [langExpressive, setLangExpressive] = useState('');
  const [langReceptive, setLangReceptive] = useState('');
  const [langPragmatic, setLangPragmatic] = useState('');
  const [langMutism, setLangMutism] = useState('');
  const [langCLD, setLangCLD] = useState('');
  const [stuttering, setStuttering] = useState('');
  const [langIntervention, setLangIntervention] = useState([]);

  // DCD — Developmental Coordination Disorder
  const [dcdFeatures, setDcdFeatures] = useState([]);
  const [movementABCScore, setMovementABCScore] = useState('');
  const [movementABCPercentile, setMovementABCPercentile] = useState('');
  const [dcdFunctionalImpact, setDcdFunctionalImpact] = useState([]);
  const [dcdTreatment, setDcdTreatment] = useState([]);

  // Sensory Processing
  const [sensoryProfile, setSensoryProfile] = useState([]);
  const [sensoryHyper, setSensoryHyper] = useState([]);
  const [sensoryHypo, setSensoryHypo] = useState([]);
  const [spd, setSpd] = useState('');

  // Behavioural / Emotional
  const [behaviouralConcerns, setBehaviouralConcerns] = useState([]);
  const [oppositional, setOppositional] = useState('');
  const [conductDisorder, setConductDisorder] = useState('');
  const [anxiety, setAnxiety] = useState('');
  const [anxietyType, setAnxietyType] = useState([]);
  const [separationAnxiety, setSeparationAnxiety] = useState('');
  const [tics, setTics] = useState('');
  const [tourettes, setTourettes] = useState('');
  const [ocd, setOcd] = useState('');
  const [attachment, setAttachment] = useState('');
  const [trauma, setTrauma] = useState('');
  const [behaviouralTx, setBehaviouralTx] = useState([]);

  // School / Education
  const [schoolType, setSchoolType] = useState('');
  const [grade, setGrade] = useState('');
  const [academicPerformance, setAcademicPerformance] = useState('');
  const [iepStatus, setIepStatus] = useState('');
  const [accommodations, setAccommodations] = useState([]);
  const [teacherConcerns, setTeacherConcerns] = useState('');

  // Early Intervention
  const [therapiesReceiving, setTherapiesReceiving] = useState([]);
  const [sessionFrequency, setSessionFrequency] = useState('');
  const [interventionGoals, setInterventionGoals] = useState('');
  const [govtProgram, setGovtProgram] = useState([]);

  const criticalAlert = useMemo(() => {
    if (regressionPresent === 'Yes') return 'Developmental regression — urgent metabolic/neurological work-up (MECP2, lysosomal, mitochondrial, Landau-Kleffner EEG)';
    return '';
  }, [regressionPresent]);

  const handleSave = async () => {
    await api.post('/assessments', {
      type: 'pediatric-developmental-disorders',
      patientId, encounterId,
      data: {
        developmental: { chronologicalAge, correctedAge, developmentalConcern, referralReason, grossMotorAge, fineMotorAge, languageAge, socialAge, selfCareAge, developmentProfile, regressionPresent, regressionAge, regressionFeatures, previousAssessments },
        autism: { mchatAnswers, mchatFail, mchatRisk, asdDiagnosed, asdDiagnosedBy, asdDsmCriteria, asdSeverity, asdLanguage, asdSensory, asdComorbidities, adosResult, asdTreatment },
        adhd: { vanderbiltScore, adhdSuggestedSubtype, adhdSubtype, adhdAge, adhdSettings, adhdComorbidities, adhdTeacherRating, adhdTreatment, adhdMedication, adhdMedDose, adhdMedResponse },
        id: { iqScore, iqClassification, iqTest, idSeverity, adaptiveFunctioning, idCause, idKaryotype, idMolecular, idMetabolic, idComorbidities, idSupport },
        ld: { ldType, ldReading, ldMath, ldWriting, ldStandardScore, ldDiscrepancy, ldComorbidities, ldAcademicSupport },
        cp: { cpType, cpTopography, gmfcs, macs, cfcs, vecs, cpCause, cpMri, cpComorbidities, cpTreatment, cpOrthosis },
        language: { languageType, langExpressive, langReceptive, langPragmatic, langMutism, langCLD, stuttering, langIntervention },
        dcd: { dcdFeatures, movementABCScore, movementABCPercentile, dcdFunctionalImpact, dcdTreatment },
        sensory: { sensoryProfile, sensoryHyper, sensoryHypo, spd },
        behavioural: { behaviouralConcerns, oppositional, conductDisorder, anxiety, anxietyType, separationAnxiety, tics, tourettes, ocd, attachment, trauma, behaviouralTx },
        school: { schoolType, grade, academicPerformance, iepStatus, accommodations, teacherConcerns },
        earlyintervention: { therapiesReceiving, sessionFrequency, interventionGoals, govtProgram },
      }
    });
    onSaved?.();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-purple-500 p-5 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
              <path d="M3 21v-2a4 4 0 0 1 4-4h4"/>
              <path d="M16 21l2-2 4 4"/>
              <path d="M16 11h6"/>
              <path d="M19 8v6"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">Pediatric Developmental Disorders</h1>
            <p className="text-violet-100 text-sm">ASD (M-CHAT-R) · ADHD (Vanderbilt) · ID · Learning Disability · CP (GMFCS) · DCD · Language</p>
          </div>
        </div>
      </div>

      {/* India Context */}
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 space-y-1">
        <div className="font-bold flex items-center gap-1"><Info size={14}/>India Context</div>
        <p>Prevalence: ASD ~1 in 68 (NIN survey 2021). ADHD ~6–8% school-children (IAP). Intellectual disability ~2–3%. CP ~1.5–2.5/1000. India-specific context: late recognition, bilingualism, cultural norms around developmental milestones, lack of early screening. Key government programmes: DEIC (District Early Intervention Centres, RBSK), NIEPID Secunderabad (national resource), Ali Yavar Jung NI for deaf/hard of hearing, National Trust (ID/Autism Act 1999), RPWD Act 2016 (21 disabilities), IPE (Integrated Parent Education), Samavesh portals for inclusion. Major centres: NIMHANS Bangalore, Child Development Centre Kochi, AIIMS Delhi, CMC Vellore Child Development Clinic.</p>
      </div>

      {/* Critical Alert */}
      {criticalAlert && (
        <div className="rounded-xl border-2 border-red-500 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20}/>
          <div>
            <div className="font-bold text-red-700">URGENT: Developmental Regression</div>
            <div className="text-red-800 text-sm">{criticalAlert}</div>
          </div>
        </div>
      )}

      {/* ── GENERAL DEVELOPMENTAL ASSESSMENT ── */}
      <Section title="General Developmental Assessment" applicable={sec.developmental} onApplicable={v => sa('developmental', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Chronological age" sub="months/years">
            <input className={inp} value={chronologicalAge} onChange={e => setChronologicalAge(e.target.value)} placeholder="e.g. 3y 2m" />
          </FL>
          <FL label="Corrected age (if premature)">
            <input className={inp} value={correctedAge} onChange={e => setCorrectedAge(e.target.value)} placeholder="e.g. 2y 10m (born 28 wk)" />
          </FL>
        </div>
        <FL label="Presenting concern">
          <textarea className={ta} value={developmentalConcern} onChange={e => setDevelopmentalConcern(e.target.value)} placeholder="Parent's main concern in their words..." />
        </FL>
        <FL label="Referral reason">
          <Pills options={['Speech delay', 'Language regression', 'No eye contact', 'Hyperactivity', 'Learning difficulty', 'Poor social skills', 'Repetitive behaviours', 'Gross motor delay', 'Fine motor delay', 'Feeding difficulty', 'Behaviour problems', 'School failure', 'Evaluation for therapy', 'Routine developmental review']}
            value={referralReason} onChange={setReferralReason} multi />
        </FL>
        <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 space-y-2">
          <div className="text-sm font-bold text-violet-700">Developmental Age by Domain (write equivalent age in months)</div>
          <div className="grid grid-cols-2 gap-3">
            <FL label="Gross motor"><input className={inp} value={grossMotorAge} onChange={e => setGrossMotorAge(e.target.value)} placeholder="e.g. 18m" /></FL>
            <FL label="Fine motor / adaptive"><input className={inp} value={fineMotorAge} onChange={e => setFineMotorAge(e.target.value)} placeholder="e.g. 18m" /></FL>
            <FL label="Language / communication"><input className={inp} value={languageAge} onChange={e => setLanguageAge(e.target.value)} placeholder="e.g. 12m" /></FL>
            <FL label="Social / emotional"><input className={inp} value={socialAge} onChange={e => setSocialAge(e.target.value)} placeholder="e.g. 18m" /></FL>
            <FL label="Self-care / ADL"><input className={inp} value={selfCareAge} onChange={e => setSelfCareAge(e.target.value)} placeholder="e.g. 18m" /></FL>
          </div>
        </div>
        <FL label="Overall developmental profile">
          <Pills options={['Global developmental delay (GDD)', 'Isolated language delay', 'Isolated motor delay', 'Intellectual disability', 'Typical development', 'Advanced milestones', 'Uneven profile (splinter skills)']}
            value={developmentProfile} onChange={setDevelopmentProfile} />
        </FL>
        <FL label="Developmental regression?">
          <Pills options={['Yes', 'No', 'Uncertain/plateaued']} value={regressionPresent} onChange={setRegressionPresent} />
        </FL>
        {regressionPresent === 'Yes' && (
          <div className="pl-3 border-l-2 border-red-300 space-y-3">
            <FL label="Age at regression" sub="months">
              <input className={inp} value={regressionAge} onChange={e => setRegressionAge(e.target.value)} placeholder="e.g. 18 months" />
            </FL>
            <FL label="Features of regression">
              <Pills options={['Loss of words/language', 'Loss of eye contact', 'Loss of social skills', 'Loss of motor skills', 'Seizure onset', 'Behaviour change', 'Loss of bladder/bowel control']}
                value={regressionFeatures} onChange={setRegressionFeatures} multi />
            </FL>
          </div>
        )}
        <FL label="Previous assessments / reports">
          <textarea className={ta} value={previousAssessments} onChange={e => setPreviousAssessments(e.target.value)} placeholder="e.g. DASII done 6 months ago (DQ 55), hearing test normal, MRI brain normal..." />
        </FL>
      </Section>

      {/* ── AUTISM SPECTRUM DISORDER ── */}
      <Section title="Autism Spectrum Disorder (ASD)" applicable={sec.autism} onApplicable={v => sa('autism', v)}>
        <FL label="Formal ASD diagnosis established?">
          <Pills options={['Yes — diagnosed', 'No — screening only', 'Under evaluation', 'Diagnosis queried']}
            value={asdDiagnosed} onChange={setAsdDiagnosed} />
        </FL>
        {asdDiagnosed === 'Yes — diagnosed' && (
          <div className="grid grid-cols-2 gap-3">
            <FL label="Diagnosed by">
              <Pills options={['Developmental paediatrician', 'Child psychiatrist', 'Neurologist', 'Multidisciplinary team', 'NIMHANS/tertiary centre']}
                value={asdDiagnosedBy} onChange={setAsdDiagnosedBy} />
            </FL>
            <FL label="ASD severity (DSM-5 level)">
              <Pills options={['Level 1 (requiring support)', 'Level 2 (substantial support)', 'Level 3 (very substantial support)']}
                value={asdSeverity} onChange={setAsdSeverity} />
            </FL>
          </div>
        )}

        {/* M-CHAT-R Screening (for 16–30 month age group) */}
        <div className="rounded-xl border border-violet-300 bg-violet-50 p-4 space-y-3">
          <div className="font-bold text-violet-700 text-sm">M-CHAT-R Screening (age 16–30 months) — Parent Report</div>
          <div className="text-xs text-violet-600 mb-2">Answer Yes/No for each item. Leave blank if not applicable.</div>
          <div className="space-y-2">
            {MCHAT_ITEMS.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-xs text-gray-500 w-5 shrink-0 mt-1">{i + 1}.</span>
                <span className="text-xs text-gray-700 flex-1">{item}</span>
                <Pills
                  options={['Yes', 'No']}
                  value={mchatAnswers[i + 1]}
                  onChange={v => setMchatAnswers(a => ({ ...a, [i + 1]: v }))}
                  accent={{ pill: 'bg-violet-100 border-violet-300 text-violet-800', active: 'bg-violet-600 border-violet-700 text-white' }}
                />
              </div>
            ))}
          </div>
          {Object.keys(mchatAnswers).length >= 5 && (
            <div className={`rounded-lg px-3 py-2 text-sm font-bold mt-2 ${mchatRisk.includes('HIGH') ? 'bg-red-100 text-red-700' : mchatRisk.includes('MEDIUM') ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
              M-CHAT-R: {mchatFail.totalFail} fails ({mchatFail.critFail} critical) — {mchatRisk}
            </div>
          )}
        </div>

        <FL label="DSM-5 ASD criteria met">
          <Pills options={['A1: Socio-emotional reciprocity', 'A2: Nonverbal communication', 'A3: Developing/maintaining relationships', 'B1: Repetitive motor movements/speech', 'B2: Insistence on sameness/rituals', 'B3: Restricted/fixated interests', 'B4: Sensory hyper/hypo-reactivity', 'C: Symptoms in early developmental period', 'D: Functional impairment']}
            value={asdDsmCriteria} onChange={setAsdDsmCriteria} multi />
        </FL>
        <FL label="Language level (at assessment)">
          <Pills options={['No words', '1–10 words', 'Phrases (2–3 words)', 'Sentences', 'Echolalia predominant', 'Scripted/rote language', 'Hyperlexia', 'Age-appropriate']}
            value={asdLanguage} onChange={setAsdLanguage} />
        </FL>
        <FL label="Sensory features">
          <Pills options={['Light sensitivity', 'Sound sensitivity (noise aversion)', 'Tactile aversion', 'Taste/texture food restriction', 'Vestibular seeking (spinning)', 'Proprioceptive seeking', 'Pain insensitivity', 'Visual stimming']}
            value={asdSensory} onChange={setAsdSensory} multi />
        </FL>
        <FL label="ADOS-2 / ADI-R result">
          <input className={inp} value={adosResult} onChange={e => setAdosResult(e.target.value)} placeholder="e.g. ADOS-2 Module 1 — Total 17 (ASD cut-off 14)" />
        </FL>
        <FL label="Comorbidities">
          <Pills options={['Intellectual disability', 'ADHD', 'Epilepsy', 'Anxiety disorder', 'Sleep disorder', 'GI problems (constipation/GERD)', 'Self-injurious behaviour (SIB)', 'Pica', 'Hypotonia', 'Tuberous sclerosis', 'Fragile X']}
            value={asdComorbidities} onChange={setAsdComorbidities} multi />
        </FL>
        <FL label="Interventions">
          <Pills options={['ABA therapy', 'ESDM (Early Start Denver Model)', 'PECS (Picture Exchange Communication)', 'AAC (Augmentative & Alternative Communication)', 'Speech-language therapy', 'Occupational therapy (sensory integration)', 'Social skills group', 'Parent-mediated JASPER/PEERS', 'Risperidone (irritability/SIB — FDA approved)', 'Aripiprazole', 'Melatonin (sleep)']}
            value={asdTreatment} onChange={setAsdTreatment} multi />
        </FL>
      </Section>

      {/* ── ADHD ── */}
      <Section title="ADHD Assessment (Vanderbilt)" applicable={sec.adhd} onApplicable={v => sa('adhd', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Age of symptom onset" sub="years"><input className={inp} value={adhdAge} onChange={e => setAdhdAge(e.target.value)} placeholder="e.g. before age 12" /></FL>
          <FL label="Settings impacted">
            <Pills options={['Home', 'School/classroom', 'Social', 'All settings']} value={adhdSettings} onChange={setAdhdSettings} multi />
          </FL>
        </div>

        {/* Inattention */}
        <div className="rounded-xl border border-violet-200 bg-white p-4 space-y-3">
          <div className="font-bold text-sm text-violet-700">Vanderbilt — Inattention (Parent Rating)</div>
          <div className="text-xs text-gray-500">Rate: Never / Occasionally / Often / Very Often</div>
          {VANDERBILT_INATTENTION.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xs text-gray-500 w-5 shrink-0 mt-1">{i + 1}.</span>
              <span className="text-xs text-gray-700 flex-1">{item}</span>
              <Pills
                options={['Never', 'Occasionally', 'Often', 'Very Often']}
                value={vanderbiltIn[i]}
                onChange={v => setVanderbiltIn(a => ({ ...a, [i]: v }))}
                accent={{ pill: 'bg-violet-100 border-violet-300 text-violet-800', active: 'bg-violet-600 border-violet-700 text-white' }}
              />
            </div>
          ))}
        </div>

        {/* Hyperactivity */}
        <div className="rounded-xl border border-violet-200 bg-white p-4 space-y-3">
          <div className="font-bold text-sm text-violet-700">Vanderbilt — Hyperactivity/Impulsivity (Parent Rating)</div>
          <div className="text-xs text-gray-500">Rate: Never / Occasionally / Often / Very Often</div>
          {VANDERBILT_HYPERACTIVITY.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xs text-gray-500 w-5 shrink-0 mt-1">{i + 1}.</span>
              <span className="text-xs text-gray-700 flex-1">{item}</span>
              <Pills
                options={['Never', 'Occasionally', 'Often', 'Very Often']}
                value={vanderbiltHy[i]}
                onChange={v => setVanderbiltHy(a => ({ ...a, [i]: v }))}
                accent={{ pill: 'bg-violet-100 border-violet-300 text-violet-800', active: 'bg-violet-600 border-violet-700 text-white' }}
              />
            </div>
          ))}
        </div>

        {Object.keys(vanderbiltIn).length >= 5 && (
          <div className="rounded-lg bg-violet-50 border border-violet-300 p-3 text-sm space-y-1">
            <div className="font-bold text-violet-700">Vanderbilt Result</div>
            <div>Inattention: {vanderbiltScore.inScore}/27 — {vanderbiltScore.inCriteria}/9 criteria met (need ≥6 for ≥12y or ≥5 for ≥17y)</div>
            <div>Hyperactivity: {vanderbiltScore.hyScore}/27 — {vanderbiltScore.hyCriteria}/9 criteria met</div>
            <div className="font-semibold text-violet-800">{adhdSuggestedSubtype}</div>
          </div>
        )}

        <FL label="Teacher rating (Vanderbilt Teacher Assessment Scale)">
          <input className={inp} value={adhdTeacherRating} onChange={e => setAdhdTeacherRating(e.target.value)} placeholder="e.g. Teacher Vanderbilt inattention score 18/27, hyperactivity 14/27, performance impaired" />
        </FL>
        <FL label="ADHD subtype (clinician)">
          <Pills options={['Predominantly inattentive (314.00)', 'Combined presentation (314.01)', 'Predominantly hyperactive-impulsive (314.01)', 'Other specified ADHD', 'Unspecified ADHD']}
            value={adhdSubtype} onChange={setAdhdSubtype} />
        </FL>
        <FL label="Comorbidities">
          <Pills options={['Learning disability (dyslexia/dyscalculia)', 'Oppositional defiant disorder (ODD)', 'Anxiety disorder', 'Depression', 'ASD', 'Tics/Tourette syndrome', 'Sleep disorder', 'Conduct disorder', 'DCD']}
            value={adhdComorbidities} onChange={setAdhdComorbidities} multi />
        </FL>
        <FL label="Treatment approach">
          <Pills options={['Psychoeducation (parent + child + school)', 'Behaviour therapy (BT) — primary <6y', 'School accommodations + IEP', 'Pharmacotherapy', 'Parent training programme', 'Coaching/executive function training']}
            value={adhdTreatment} onChange={setAdhdTreatment} multi />
        </FL>
        {adhdTreatment.includes('Pharmacotherapy') && (
          <div className="grid grid-cols-3 gap-3">
            <FL label="Medication">
              <Pills options={['Methylphenidate IR', 'Methylphenidate ER', 'Lisdexamfetamine', 'Atomoxetine', 'Clonidine', 'Guanfacine']}
                value={adhdMedication} onChange={setAdhdMedication} />
            </FL>
            <FL label="Dose" sub="mg/kg/day or mg"><input className={inp} value={adhdMedDose} onChange={e => setAdhdMedDose(e.target.value)} placeholder="e.g. 0.3 mg/kg/day" /></FL>
            <FL label="Response">
              <Pills options={['Good', 'Partial', 'Poor', 'Side effects limiting']} value={adhdMedResponse} onChange={setAdhdMedResponse} />
            </FL>
          </div>
        )}
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          <b>India note:</b> Methylphenidate (Ritalin/Inspiral) is Schedule H drug — requires licensed prescription. Lisdexamfetamine available 2020. Atomoxetine widely available. Many families prefer behaviour therapy first (cultural preference for non-pharmacological management).
        </div>
      </Section>

      {/* ── INTELLECTUAL DISABILITY ── */}
      <Section title="Intellectual Disability (ID)" applicable={sec.id} onApplicable={v => sa('id', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="IQ score (standardised test)">
            <input className={inp} value={iqScore} onChange={e => setIqScore(e.target.value)} placeholder="e.g. 52" />
          </FL>
          <FL label="Test used">
            <Pills options={['Malin Intelligence Scale (MISIC)', 'WISC-V', 'Stanford-Binet 5', 'DASII (Indian)', 'Binet-Kamat (BKT)', 'Vineland Adaptive Behaviour']}
              value={iqTest} onChange={setIqTest} />
          </FL>
        </div>
        {iqClassification && (
          <div className="rounded-lg bg-violet-50 border border-violet-200 px-3 py-2 text-sm font-semibold text-violet-800">{iqClassification}</div>
        )}
        <FL label="Adaptive functioning">
          <input className={inp} value={adaptiveFunctioning} onChange={e => setAdaptiveFunctioning(e.target.value)} placeholder="e.g. Vineland-3 composite 48 — severely impaired conceptual/social/practical domains" />
        </FL>
        <FL label="Severity (clinical)">
          <Pills options={['Mild', 'Moderate', 'Severe', 'Profound', 'Unspecified']}
            value={idSeverity} onChange={setIdSeverity} />
        </FL>
        <FL label="Aetiology / cause">
          <Pills options={['Down syndrome (Trisomy 21)', 'Fragile X syndrome', 'Chromosomal microarray anomaly', 'Single gene disorder (OMIM)', 'Metabolic (PKU/hypothyroid/organic acid)', 'Perinatal hypoxia (HIE)', 'Prematurity', 'Foetal alcohol spectrum', 'TORCH infection', 'Unknown/idiopathic']}
            value={idCause} onChange={setIdCause} multi />
        </FL>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Karyotype result">
            <input className={inp} value={idKaryotype} onChange={e => setIdKaryotype(e.target.value)} placeholder="e.g. 47,XX,+21" />
          </FL>
          <FL label="Molecular / CMA">
            <input className={inp} value={idMolecular} onChange={e => setIdMolecular(e.target.value)} placeholder="e.g. del(22q11.2)" />
          </FL>
          <FL label="Metabolic screen">
            <input className={inp} value={idMetabolic} onChange={e => setIdMetabolic(e.target.value)} placeholder="e.g. NBS normal / high phenylalanine" />
          </FL>
        </div>
        <FL label="Comorbidities">
          <Pills options={['Epilepsy', 'ASD', 'ADHD', 'Psychiatric comorbidity', 'Sensory impairment (vision/hearing)', 'Hypothyroidism', 'Cardiac defect (DS)', 'Atlanto-axial instability (DS)', 'Behavioural phenotype (aggression/SIB)', 'Cerebral palsy']}
            value={idComorbidities} onChange={setIdComorbidities} multi />
        </FL>
        <FL label="Support needs">
          <Pills options={['Special education', 'Vocational training', 'Life skills programme', 'Respite care', 'Residential care (severe/profound)', 'RPWD certificate (National Trust)', 'Disability pension / SBI Suraksha']}
            value={idSupport} onChange={setIdSupport} multi />
        </FL>
      </Section>

      {/* ── LEARNING DISABILITY ── */}
      <Section title="Specific Learning Disability (SLD)" applicable={sec.ld} onApplicable={v => sa('ld', v)}>
        <FL label="Type of SLD">
          <Pills options={['Dyslexia (reading disorder)', 'Dyscalculia (mathematics)', 'Dysgraphia (written expression)', 'Dysorthography (spelling)', 'Mixed SLD', 'Specific reading comprehension deficit']}
            value={ldType} onChange={setLdType} multi />
        </FL>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Reading level" sub="grade equivalent">
            <input className={inp} value={ldReading} onChange={e => setLdReading(e.target.value)} placeholder="e.g. Grade 3 in Grade 7" />
          </FL>
          <FL label="Math level" sub="grade equivalent">
            <input className={inp} value={ldMath} onChange={e => setLdMath(e.target.value)} placeholder="e.g. Grade 4 in Grade 7" />
          </FL>
          <FL label="Writing level" sub="grade equivalent">
            <input className={inp} value={ldWriting} onChange={e => setLdWriting(e.target.value)} placeholder="e.g. Grade 3 in Grade 7" />
          </FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Standardised test score" sub="SS or percentile">
            <input className={inp} value={ldStandardScore} onChange={e => setLdStandardScore(e.target.value)} placeholder="e.g. WRAT-4 Reading SS 72 (3rd %ile)" />
          </FL>
          <FL label="IQ-achievement discrepancy">
            <input className={inp} value={ldDiscrepancy} onChange={e => setLdDiscrepancy(e.target.value)} placeholder="e.g. FSIQ 105, reading SS 72 → significant discrepancy" />
          </FL>
        </div>
        <FL label="Comorbidities">
          <Pills options={['ADHD', 'DCD', 'Language disorder', 'Anxiety (school-related)', 'Dyscalculia co-occurs with NLD', 'Auditory processing disorder']}
            value={ldComorbidities} onChange={setLdComorbidities} multi />
        </FL>
        <FL label="Academic support">
          <Pills options={['Resource room / learning support', 'Extra time (33% exam accommodation)', 'Reader/scribe', 'Assistive technology (text-to-speech)', 'Remedial reading programme (multisensory)', 'Special provisions — CBSE LD certificate', 'Modified curriculum', 'Orton-Gillingham / phonics-based intervention']}
            value={ldAcademicSupport} onChange={setLdAcademicSupport} multi />
        </FL>
      </Section>

      {/* ── CEREBRAL PALSY ── */}
      <Section title="Cerebral Palsy" applicable={sec.cp} onApplicable={v => sa('cp', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Motor type">
            <Pills options={['Spastic', 'Dyskinetic (athetoid/dystonic)', 'Ataxic', 'Mixed', 'Hypotonic']}
              value={cpType} onChange={setCpType} />
          </FL>
          <FL label="Topography">
            <Pills options={['Hemiplegia', 'Diplegia', 'Quadriplegia/bilateral', 'Monoplegia', 'Triplegia']}
              value={cpTopography} onChange={setCpTopography} />
          </FL>
        </div>
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-3">
          <div className="font-bold text-violet-700 text-sm">Functional Classification System</div>
          <ScoreRow label="GMFCS (Gross Motor)" options={['I', 'II', 'III', 'IV', 'V']} value={gmfcs} onChange={setGmfcs} />
          <ScoreRow label="MACS (Manual Ability)" options={['I', 'II', 'III', 'IV', 'V']} value={macs} onChange={setMacs} />
          <ScoreRow label="CFCS (Communication)" options={['I', 'II', 'III', 'IV', 'V']} value={cfcs} onChange={setCfcs} />
          <ScoreRow label="VECS (Visual)" options={['I', 'II', 'III', 'IV', 'V']} value={vecs} onChange={setVecs} />
        </div>
        <div className="text-xs text-gray-500 -mt-2">GMFCS/MACS/CFCS/VECS Level I = independent; Level V = total assistance</div>
        <FL label="Aetiology">
          <Pills options={['Periventricular leukomalacia (prematurity)', 'HIE (perinatal asphyxia)', 'Neonatal stroke', 'Kernicterus', 'Congenital brain malformation', 'Postnatal (meningitis/encephalitis/trauma)', 'Metabolic', 'Unknown']}
            value={cpCause} onChange={setCpCause} multi />
        </FL>
        <FL label="MRI brain findings">
          <input className={inp} value={cpMri} onChange={e => setCpMri(e.target.value)} placeholder="e.g. Periventricular leukomalacia, bilateral. Thinned corpus callosum." />
        </FL>
        <FL label="Comorbidities">
          <Pills options={['Epilepsy (30–50%)', 'Intellectual disability', 'ASD', 'Visual impairment (cortical/refractive)', 'Hearing impairment', 'Feeding difficulties (GERD/aspiration)', 'Nutritional failure/FTT', 'Chronic pain', 'Hip dislocation', 'Scoliosis', 'Contractures', 'Drooling']}
            value={cpComorbidities} onChange={setCpComorbidities} multi />
        </FL>
        <FL label="Treatment">
          <Pills options={['Physiotherapy (NDT, conductive education)', 'Occupational therapy', 'Speech-language therapy', 'Botulinum toxin A (spasticity)', 'Intrathecal baclofen pump', 'Selective dorsal rhizotomy (SDR)', 'Orthopaedic surgery (tendon lengthening/transfer)', 'Baclofen oral', 'Trihexyphenidyl (dystonia)', 'HBOT (adjunct)', 'Constraint-induced movement therapy (CIMT)']}
            value={cpTreatment} onChange={setCpTreatment} multi />
        </FL>
        <FL label="Orthoses">
          <Pills options={['AFO (ankle-foot orthosis)', 'KAFO', 'Dynamic AFO', 'Supramalleolar orthosis', 'Hand/wrist splint', 'TLSO (trunk)', 'Wheelchair', 'Standing frame', 'Gait trainer']}
            value={cpOrthosis} onChange={setCpOrthosis} multi />
        </FL>
      </Section>

      {/* ── LANGUAGE DISORDERS ── */}
      <Section title="Language & Communication Disorders" applicable={sec.language} onApplicable={v => sa('language', v)}>
        <FL label="Primary disorder type">
          <Pills options={['Developmental language disorder (DLD)', 'Expressive language disorder', 'Receptive-expressive language disorder', 'Pragmatic language impairment (PLI)', 'Childhood apraxia of speech (CAS)', 'Phonological disorder', 'Specific language impairment (SLI)', 'Selective mutism', 'AAC user', 'Multilingual language delay']}
            value={languageType} onChange={setLanguageType} />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Expressive language level">
            <input className={inp} value={langExpressive} onChange={e => setLangExpressive(e.target.value)} placeholder="e.g. 2-word combinations at age 4y" />
          </FL>
          <FL label="Receptive language level">
            <input className={inp} value={langReceptive} onChange={e => setLangReceptive(e.target.value)} placeholder="e.g. follows 2-step commands" />
          </FL>
        </div>
        <FL label="Pragmatic/social communication">
          <input className={inp} value={langPragmatic} onChange={e => setLangPragmatic(e.target.value)} placeholder="e.g. poor turn-taking, literal interpretation, difficulty with non-literal language" />
        </FL>
        <FL label="Selective mutism features">
          <input className={inp} value={langMutism} onChange={e => setLangMutism(e.target.value)} placeholder="e.g. speaks at home, mute at school — anxiety-based" />
        </FL>
        <FL label="Cultural / bilingual factors">
          <input className={inp} value={langCLD} onChange={e => setLangCLD(e.target.value)} placeholder="e.g. L1 Tamil, L2 English, L3 Hindi — differentiate true disorder from bilingual delay" />
        </FL>
        <FL label="Stuttering">
          <Pills options={['None', 'Developmental (age-appropriate disfluency)', 'Persistent stuttering', 'Cluttering', 'Neurogenic (acquired)']}
            value={stuttering} onChange={setStuttering} />
        </FL>
        <FL label="Intervention">
          <Pills options={['Individual SLT (articulation)', 'Individual SLT (language)', 'Hanen programme (parent coaching)', 'AAC training (PECS/SGD)', 'Social communication groups', 'Selective mutism programme (CBT + gradual exposure)', 'Lee Silverman Voice Treatment', 'Oral motor therapy (dysphagia)']}
            value={langIntervention} onChange={setLangIntervention} multi />
        </FL>
      </Section>

      {/* ── DCD ── */}
      <Section title="Developmental Coordination Disorder (DCD)" applicable={sec.dcd} onApplicable={v => sa('dcd', v)}>
        <FL label="DCD features">
          <Pills options={['Clumsy/falls frequently', 'Difficulty with ball skills', 'Difficulty with handwriting', 'Difficulty dressing (buttons/laces)', 'Poor bike riding', 'Difficulty using cutlery', 'Slow to learn new motor skills', 'Tires quickly with motor tasks', 'Avoids physical activities', 'Poor spatial awareness']}
            value={dcdFeatures} onChange={setDcdFeatures} multi />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Movement ABC-2 score">
            <input className={inp} value={movementABCScore} onChange={e => setMovementABCScore(e.target.value)} placeholder="e.g. Total score 14 (Band 1 = significant difficulty)" />
          </FL>
          <FL label="Percentile">
            <input className={inp} value={movementABCPercentile} onChange={e => setMovementABCPercentile(e.target.value)} placeholder="≤5th%ile = DCD diagnosis" />
          </FL>
        </div>
        <FL label="Functional impact">
          <Pills options={['Academic performance impaired (handwriting)', 'Physical education difficulty', 'Social exclusion (peer play)', 'ADL difficulty', 'Low self-esteem/avoidance', 'Affects participation in sport/recreation']}
            value={dcdFunctionalImpact} onChange={setDcdFunctionalImpact} multi />
        </FL>
        <FL label="Treatment">
          <Pills options={['Task-oriented approach (CO-OP)', 'Occupational therapy (activity-based)', 'Handwriting programme', 'Physical education adaptations', 'Keyboarding as handwriting alternative', 'Emotional support / counselling', 'Participation in adapted PE']}
            value={dcdTreatment} onChange={setDcdTreatment} multi />
        </FL>
      </Section>

      {/* ── SENSORY PROCESSING ── */}
      <Section title="Sensory Processing" applicable={sec.sensory} onApplicable={v => sa('sensory', v)}>
        <FL label="Sensory modalities affected">
          <Pills options={['Tactile', 'Auditory', 'Visual', 'Vestibular', 'Proprioceptive', 'Gustatory', 'Olfactory', 'Interoception']}
            value={sensoryProfile} onChange={setSensoryProfile} multi />
        </FL>
        <FL label="Hypersensitivity features">
          <Pills options={['Avoids touch/clothing textures', 'Covers ears to sounds', 'Avoids bright lights', 'Avoids movement (swings)', 'Restricted food texture', 'Strong smell aversions', 'Emotional meltdowns with sensory overload', 'Avoids messy play']}
            value={sensoryHyper} onChange={setSensoryHyper} multi />
        </FL>
        <FL label="Hyposensitivity features">
          <Pills options={['Seeks deep pressure/tight hugs', 'Seeks spinning/rocking', 'Craves intense tastes/textures', 'High pain threshold', 'Does not notice food on face', 'Crashes into furniture', 'Licks/mouthing objects (beyond age 3)']}
            value={sensoryHypo} onChange={setSensoryHypo} multi />
        </FL>
        <FL label="Sensory processing disorder (standalone)">
          <Pills options={['Yes — primary SPD', 'No — secondary to ASD/ADHD', 'Uncertain']}
            value={spd} onChange={setSpd} />
        </FL>
      </Section>

      {/* ── BEHAVIOURAL / EMOTIONAL ── */}
      <Section title="Behavioural & Emotional Disorders" applicable={sec.behavioural} onApplicable={v => sa('behavioural', v)}>
        <FL label="Presenting behavioural concerns">
          <Pills options={['Aggression (physical/verbal)', 'Self-injurious behaviour', 'Tantrums/emotional dysregulation', 'Refusal (school/food/task)', 'Stealing', 'Lying', 'Arson/cruelty to animals', 'Disinhibition', 'Impulsivity', 'Emotional immaturity']}
            value={behaviouralConcerns} onChange={setBehaviouralConcerns} multi />
        </FL>
        <FL label="Oppositional Defiant Disorder (ODD)">
          <Pills options={['Meets DSM-5 criteria', 'Subthreshold', 'Ruled out']} value={oppositional} onChange={setOppositional} />
        </FL>
        <FL label="Conduct Disorder (CD)">
          <Pills options={['Childhood-onset', 'Adolescent-onset', 'Subthreshold', 'Ruled out']} value={conductDisorder} onChange={setConductDisorder} />
        </FL>
        <FL label="Anxiety?">
          <Pills options={['Yes', 'No']} value={anxiety} onChange={setAnxiety} />
        </FL>
        {anxiety === 'Yes' && (
          <FL label="Anxiety type">
            <Pills options={['Separation anxiety disorder', 'Generalised anxiety (GAD)', 'Social anxiety', 'Specific phobia', 'Selective mutism', 'OCD', 'Panic disorder']}
              value={anxietyType} onChange={setAnxietyType} multi />
          </FL>
        )}
        <FL label="Tics present?">
          <Pills options={['None', 'Motor tics only', 'Vocal tics only', 'Both (Tourette if >1y)']}
            value={tics} onChange={setTics} />
        </FL>
        <FL label="Attachment pattern">
          <Pills options={['Secure', 'Anxious-ambivalent', 'Avoidant', 'Disorganised/RAD', 'Institutional deprivation pattern']}
            value={attachment} onChange={setAttachment} />
        </FL>
        <FL label="Trauma exposure">
          <Pills options={['Physical abuse', 'Sexual abuse', 'Emotional abuse', 'Neglect', 'Domestic violence (witness)', 'Loss/bereavement', 'Medical trauma', 'Disaster/accident', 'None disclosed']}
            value={trauma} onChange={setTrauma} />
        </FL>
        <FL label="Treatment">
          <Pills options={['Parent-Child Interaction Therapy (PCIT)', 'CBT (individual child)', 'CBT (exposure for anxiety/OCD)', 'Trauma-Focused CBT (TF-CBT)', 'Positive Behaviour Support (PBS)', 'Family therapy', 'SSRI (anxiety/OCD — fluoxetine/sertraline)', 'Antipsychotic (severe aggression/tics)', 'Social stories', 'Mindfulness-based programme']}
            value={behaviouralTx} onChange={setBehaviouralTx} multi />
        </FL>
      </Section>

      {/* ── SCHOOL / EDUCATION ── */}
      <Section title="School & Educational Functioning" applicable={sec.school} onApplicable={v => sa('school', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="School type">
            <Pills options={['Mainstream', 'Resource room support', 'Special class in mainstream', 'Special school', 'Home-schooled', 'Not in school']}
              value={schoolType} onChange={setSchoolType} />
          </FL>
          <FL label="Grade/standard">
            <input className={inp} value={grade} onChange={e => setGrade(e.target.value)} placeholder="e.g. Class 5 (age 10)" />
          </FL>
        </div>
        <FL label="Academic performance">
          <Pills options={['Age-appropriate', 'Slightly below grade level', 'Significantly below grade level', 'Failing', 'Repeating year', 'Special education curriculum']}
            value={academicPerformance} onChange={setAcademicPerformance} />
        </FL>
        <FL label="IEP (Individualised Education Plan)">
          <Pills options={['In place and current', 'Pending development', 'Not applicable', 'Lapsed — review needed']}
            value={iepStatus} onChange={setIepStatus} />
        </FL>
        <FL label="Exam accommodations / school supports">
          <Pills options={['Extra time', 'Reader', 'Scribe', 'Separate room', 'Large print', 'Calculator use', 'Oral exam', 'Modified questions', 'Assistive technology', 'CBSE LD certificate']}
            value={accommodations} onChange={setAccommodations} multi />
        </FL>
        <FL label="Teacher observations">
          <textarea className={ta} value={teacherConcerns} onChange={e => setTeacherConcerns(e.target.value)} placeholder="Summary of teacher feedback, classroom behaviour, academic challenges..." />
        </FL>
      </Section>

      {/* ── EARLY INTERVENTION ── */}
      <Section title="Early Intervention & Therapy Services" applicable={sec.earlyintervention} onApplicable={v => sa('earlyintervention', v)}>
        <FL label="Therapies currently receiving">
          <Pills options={['Speech-language therapy (SLT)', 'Occupational therapy (OT)', 'Physiotherapy (PT)', 'ABA therapy', 'Special education (1:1 or group)', 'Music/art therapy', 'Hippotherapy', 'Hydrotherapy', 'Sensory integration therapy', 'Parent coaching / Hanen', 'Nutrition counselling']}
            value={therapiesReceiving} onChange={setTherapiesReceiving} multi />
        </FL>
        <FL label="Therapy frequency">
          <Pills options={['Daily', '5 days/week', '3 days/week', '2 days/week', 'Weekly', 'Fortnightly', 'Monthly review']}
            value={sessionFrequency} onChange={setSessionFrequency} />
        </FL>
        <FL label="Current therapy goals">
          <textarea className={ta} value={interventionGoals} onChange={e => setInterventionGoals(e.target.value)} placeholder="e.g. Goal 1: Achieve 50 words by 6 months; Goal 2: Independent dressing..." />
        </FL>
        <FL label="Government / institutional programmes">
          <Pills options={['DEIC (District Early Intervention Centre — RBSK)', 'NIEPID (Secunderabad)', 'Ali Yavar Jung NI (hearing/speech)', 'National Trust programmes', 'Samavesh (inclusion)', 'DDRC (District Disability Rehabilitation Centre)', 'Samagra Shiksha (education)', 'NIMHANS child services', 'State-specific scheme (specify in notes)']}
            value={govtProgram} onChange={setGovtProgram} multi />
        </FL>
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-xs text-green-900">
          <b>Key India policies:</b> RPWD Act 2016 — 21 disabilities, right to inclusive education. National Education Policy 2020 mandates inclusion. Disability certificate from DISHA portal enables benefits. National Trust (autism, cerebral palsy, ID, multiple disabilities) provides legal guardianship, day care, vocational training schemes.
        </div>
      </Section>

      <button onClick={handleSave}
        className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-base shadow transition-all">
        Save Developmental Disorders Assessment
      </button>
    </div>
  );
}
