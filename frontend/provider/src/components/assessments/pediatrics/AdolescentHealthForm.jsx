/**
 * @shared-pool
 * AdolescentHealthForm — Adolescent Health Assessment (10–19 years)
 * Tanner staging, PHQ-A depression screening, CRAFFT substance use,
 * menstrual disorders (PALM-COEIN), HEADSS psychosocial assessment,
 * eating disorders (EDE-Q), adolescent nutrition, STI screening,
 * suicide risk (Columbia scale), sleep health, school performance
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useMemo } from 'react';
import { Lock, AlertTriangle, Star } from 'lucide-react';
import api from '../../../api/client';

const A = {
  pink:   { bg:'bg-pink-50',    border:'border-pink-300',    text:'text-pink-700',
            pill:'bg-pink-100 border-pink-400 text-pink-800',
            active:'bg-pink-600 text-white border-pink-600' },
  violet: { bg:'bg-violet-50',  border:'border-violet-300',  text:'text-violet-700',
            pill:'bg-violet-100 border-violet-400 text-violet-800',
            active:'bg-violet-600 text-white border-violet-600' },
  amber:  { bg:'bg-amber-50',   border:'border-amber-300',   text:'text-amber-700',
            pill:'bg-amber-100 border-amber-400 text-amber-800',
            active:'bg-amber-600 text-white border-amber-600' },
  red:    { bg:'bg-red-50',     border:'border-red-300',     text:'text-red-700',
            pill:'bg-red-100 border-red-400 text-red-800',
            active:'bg-red-600 text-white border-red-600' },
  blue:   { bg:'bg-blue-50',    border:'border-blue-300',    text:'text-blue-700',
            pill:'bg-blue-100 border-blue-400 text-blue-800',
            active:'bg-blue-600 text-white border-blue-600' },
  teal:   { bg:'bg-teal-50',    border:'border-teal-300',    text:'text-teal-700',
            pill:'bg-teal-100 border-teal-400 text-teal-800',
            active:'bg-teal-600 text-white border-teal-600' },
  emerald:{ bg:'bg-emerald-50', border:'border-emerald-300', text:'text-emerald-700',
            pill:'bg-emerald-100 border-emerald-400 text-emerald-800',
            active:'bg-emerald-600 text-white border-emerald-600' },
};

function Pills({ options, value, onChange, accent = 'pink', multi = false }) {
  const ac = A[accent];
  const vals = multi ? (Array.isArray(value) ? value : []) : value;
  const toggle = o => {
    if (!multi) { onChange(o === value ? '' : o); return; }
    const cur = Array.isArray(value) ? value : [];
    onChange(cur.includes(o) ? cur.filter(x => x !== o) : [...cur, o]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const active = multi ? vals.includes(o) : vals === o;
        return (
          <button key={o} type="button" onClick={() => toggle(o)}
            className={`px-3 py-1 rounded-full border text-sm font-medium transition-all ${active ? ac.active : ac.pill}`}>
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
        {label}{sub && <span className="ml-1 text-xs font-normal text-gray-400">{sub}</span>}
      </label>
      {children}
    </div>
  );
}

function Section({ title, applicable, onApplicable, accent = 'pink', children }) {
  const ac = A[accent];
  const isNA = applicable === 'N/A';
  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${isNA ? 'border-gray-200 opacity-60' : ac.border}`}>
      <div className={`flex items-center justify-between px-4 py-3 ${isNA ? 'bg-gray-100' : ac.bg}`}>
        <span className={`font-bold text-base ${isNA ? 'text-gray-400' : ac.text}`}>
          {isNA && <Lock className="inline w-4 h-4 mr-1" />}{title}
        </span>
        <div className="flex gap-2">
          {['Applicable', 'N/A'].map(v => (
            <button key={v} type="button" onClick={() => onApplicable(v)}
              className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all
                ${applicable === v
                  ? v === 'N/A' ? 'bg-gray-500 text-white border-gray-500' : ac.active
                  : 'bg-white border-gray-300 text-gray-500'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>
      {isNA
        ? <div className="px-4 py-2 text-xs text-gray-400 italic">Not applicable · section locked</div>
        : <div className="px-4 py-4 space-y-4">{children}</div>
      }
    </div>
  );
}

// PHQ-A scoring options
const PHQ_ITEMS = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself — or that you are a failure',
  'Trouble concentrating on things',
  'Moving or speaking so slowly / fidgety / restless',
  'Thoughts that you would be better off dead or of hurting yourself',
];

// CRAFFT questions
const CRAFFT_ITEMS = [
  { id:'car', q:'C — Have you ever ridden in a CAR driven by someone (including yourself) who was high or using alcohol or drugs?' },
  { id:'relax', q:'R — Do you ever use alcohol or drugs to RELAX, feel better, or fit in?' },
  { id:'alone', q:'A — Do you ever use alcohol or drugs while you are by yourself, ALONE?' },
  { id:'forget', q:'F — Do you ever FORGET things you did while using alcohol or drugs?' },
  { id:'family', q:'F — Do your FAMILY or FRIENDS ever tell you that you should cut down on your drinking or drug use?' },
  { id:'trouble', q:'T — Have you ever gotten into TROUBLE while you were using alcohol or drugs?' },
];

export default function AdolescentHealthForm({ patientId, encounterId, onSaved }) {
  const [sec, setSec] = useState({
    overview: 'Applicable', tanner: 'Applicable', menstrual: 'Applicable',
    headss: 'Applicable', phqa: 'Applicable', crafft: 'Applicable',
    eating: 'Applicable', nutrition: 'Applicable', suicide: 'Applicable',
    sti: 'Applicable', sleep: 'Applicable',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  // Overview
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [grade, setGrade] = useState('');
  const [chief, setChief] = useState([]);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');

  // Tanner
  const [tannerBreast, setTannerBreast] = useState('');
  const [tannerPubic, setTannerPubic] = useState('');
  const [tannerGenital, setTannerGenital] = useState('');
  const [axillaryHair, setAxillaryHair] = useState('');
  const [menarche, setMenarche] = useState('');
  const [menarche_age, setMenarcheAge] = useState('');

  // Menstrual
  const [menGate, setMenGate] = useState('');
  const [menCycle, setMenCycle] = useState('');
  const [menDuration, setMenDuration] = useState('');
  const [menFlow, setMenFlow] = useState('');
  const [dysmenorrhoea, setDysmenorrhoea] = useState('');
  const [menDisorder, setMenDisorder] = useState([]);
  const [pcos, setPcos] = useState('');
  const [endo, setEndo] = useState('');

  // HEADSS
  const [hHome, setHHome] = useState('');
  const [hEducation, setHEducation] = useState('');
  const [hActivities, setHActivities] = useState('');
  const [hDrugs, setHDrugs] = useState('');
  const [hSexuality, setHSexuality] = useState('');
  const [hSafety, setHSafety] = useState('');
  const [hSuicide, setHSuicide] = useState('');

  // PHQ-A
  const [phqAnswers, setPhqAnswers] = useState({});
  const phqOptions = ['Not at all (0)','Several days (1)','More than half (2)','Nearly every day (3)'];

  const phqScore = useMemo(() => {
    const vals = PHQ_ITEMS.map((_, i) => {
      const v = phqAnswers[i];
      return v ? parseInt(v.match(/\((\d)\)/)?.[1] || 0) : 0;
    });
    return vals.reduce((a, b) => a + b, 0);
  }, [phqAnswers]);

  const phqSeverity = useMemo(() => {
    if (Object.keys(phqAnswers).length < 9) return null;
    if (phqScore <= 4) return { label: 'Minimal depression', color: 'text-green-700' };
    if (phqScore <= 9) return { label: 'Mild depression', color: 'text-amber-700' };
    if (phqScore <= 14) return { label: 'Moderate depression', color: 'text-orange-700 font-semibold' };
    if (phqScore <= 19) return { label: 'Moderately severe depression', color: 'text-red-600 font-bold' };
    return { label: 'Severe depression', color: 'text-red-800 font-bold' };
  }, [phqScore, phqAnswers]);

  // CRAFFT
  const [crafftAnswers, setCrafftAnswers] = useState({});
  const crafftScore = useMemo(() => {
    return CRAFFT_ITEMS.filter(c => crafftAnswers[c.id] === 'Yes').length;
  }, [crafftAnswers]);

  // Eating disorders
  const [eatingGate, setEatingGate] = useState('');
  const [eatingConcern, setEatingConcern] = useState([]);
  const [bmi, setBmi] = useState('');
  const [eatingBehaviour, setEatingBehaviour] = useState([]);
  const [eatingDiagnosis, setEatingDiagnosis] = useState('');

  // Nutrition
  const [nutritionConcern, setNutritionConcern] = useState([]);
  const [ironStatus, setIronStatus] = useState('');
  const [calciumIntake, setCalciumIntake] = useState('');
  const [vitD, setVitD] = useState('');

  // Suicide risk — Columbia
  const [suicideGate, setSuicideGate] = useState('');
  const [suicideIdeation, setSuicideIdeation] = useState('');
  const [suicidePlan, setSuicidePlan] = useState('');
  const [suicideIntent, setSuicideIntent] = useState('');
  const [suicideAttempt, setSuicideAttempt] = useState('');
  const [suicideRisk, setSuicideRisk] = useState('');

  // STI
  const [stiGate, setStiGate] = useState('');
  const [sexuallyActive, setSexuallyActive] = useState('');
  const [contraception, setContraception] = useState('');
  const [stiSymptoms, setStiSymptoms] = useState([]);
  const [stiScreening, setStiScreening] = useState([]);

  // Sleep
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState('');
  const [screenTime, setScreenTime] = useState('');
  const [sleepDisorder, setSleepDisorder] = useState([]);

  const bmiCalc = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100;
    if (!w || !h) return null;
    return (w / (h * h)).toFixed(1);
  }, [weight, height]);

  const suicideAlert = suicideIdeation === 'Active ideation with plan' || suicideIntent === 'High — has means and plan';
  const depressionAlert = phqAnswers[8] === 'Nearly every day (3)' || phqSeverity?.label?.includes('Severe');

  const handleSave = async () => {
    await api.post('/assessments', {
      type: 'adolescent-health',
      patientId, encounterId,
      data: {
        overview: { age, sex, grade, chief, weight, height, bmi: bmiCalc },
        tanner: { breast: tannerBreast, pubicHair: tannerPubic, genital: tannerGenital, axillaryHair, menarche, menarcheAge: menarche_age },
        menstrual: { gate: menGate, cycle: menCycle, duration: menDuration, flow: menFlow, dysmenorrhoea, disorders: menDisorder, pcos, endometriosis: endo },
        headss: { home: hHome, education: hEducation, activities: hActivities, drugs: hDrugs, sexuality: hSexuality, safety: hSafety, suicide: hSuicide },
        phqa: { answers: phqAnswers, score: phqScore, severity: phqSeverity?.label },
        crafft: { answers: crafftAnswers, score: crafftScore, risk: crafftScore >= 2 ? 'High risk — substance use disorder screening' : 'Low risk' },
        eating: { gate: eatingGate, concerns: eatingConcern, bmi: bmiCalc, behaviours: eatingBehaviour, diagnosis: eatingDiagnosis },
        nutrition: { concerns: nutritionConcern, ironStatus, calciumIntake, vitD },
        suicide: { gate: suicideGate, ideation: suicideIdeation, plan: suicidePlan, intent: suicideIntent, attempt: suicideAttempt, riskLevel: suicideRisk },
        sti: { gate: stiGate, sexuallyActive, contraception, symptoms: stiSymptoms, screening: stiScreening },
        sleep: { hours: sleepHours, quality: sleepQuality, screenTime, disorders: sleepDisorder },
      }
    });
    onSaved?.();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <Star className="w-8 h-8 opacity-80" />
          <div>
            <h2 className="text-xl font-bold">Adolescent Health Assessment (10–19 years)</h2>
            <p className="text-pink-100 text-sm">Tanner Staging · HEADSS · PHQ-A Depression · CRAFFT Substance · Menstrual · Eating Disorders · Suicide Risk</p>
          </div>
        </div>
      </div>

      {(suicideAlert || depressionAlert) && (
        <div className="bg-red-50 border-2 border-red-600 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700">Mental Health Emergency</p>
            {suicideAlert && <p className="text-sm text-red-600">Active suicidal ideation with plan — do not leave alone, emergency psychiatric referral</p>}
            {depressionAlert && <p className="text-sm text-red-600">Severe depression / suicidal thoughts on PHQ-A Item 9 — urgent mental health assessment</p>}
          </div>
        </div>
      )}

      {/* Overview */}
      <Section title="Adolescent Overview" applicable={sec.overview} onApplicable={v => sa('overview', v)} accent="pink">
        <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
          <p className={`font-semibold ${A.amber.text}`}>India context — Adolescent health</p>
          <p className="text-gray-600 mt-1">India: 253 million adolescents (10-19y) — 21% of population. RKSK (Rashtriya Kishor Swasthya Karyakram) is GoI programme.
            Adolescent-friendly health services (AFHS) at CHC level. Key issues: anaemia (56% girls), early marriage,
            mental health (1 in 7 adolescents has mental disorder), substance use (India: tobacco 15%, alcohol 8%).
            WIFS: Weekly Iron Folic Acid Supplementation programme (all school/college going girls + boys 10-19y).</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Age" sub="years"><input type="number" value={age} onChange={e => setAge(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
          <FL label="Sex"><Pills options={['Male','Female','Other']} value={sex} onChange={setSex} accent="pink" /></FL>
          <FL label="School grade/class"><input type="text" value={grade} onChange={e => setGrade(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="e.g., Class 9" /></FL>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Weight" sub="kg"><input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
          <FL label="Height" sub="cm"><input type="number" value={height} onChange={e => setHeight(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
          <FL label="BMI (auto)"><div className="border rounded-lg px-2 py-1.5 bg-gray-50 text-sm font-semibold text-gray-700">{bmiCalc || '—'} kg/m²</div></FL>
        </div>
      </Section>

      {/* Tanner Staging */}
      <Section title="Tanner Staging — Pubertal Maturity" applicable={sec.tanner} onApplicable={v => sa('tanner', v)} accent="pink">
        <div className="grid grid-cols-2 gap-3">
          <FL label="Breast / Thelarche (Female)">
            <Pills options={['B1 — Prepubertal','B2 — Bud (thelarche)','B3 — Enlargement beyond areola','B4 — Areola secondary mound','B5 — Adult contour']}
              value={tannerBreast} onChange={setTannerBreast} accent="pink" />
          </FL>
          <FL label="Genital development (Male)">
            <Pills options={['G1 — Prepubertal (<4mL)','G2 — Slight enlargement','G3 — Longer, larger testes','G4 — Glans development','G5 — Adult size']}
              value={tannerGenital} onChange={setTannerGenital} accent="blue" />
          </FL>
        </div>
        <FL label="Pubic hair (Both sexes)">
          <Pills options={['PH1 — None','PH2 — Sparse, slightly pigmented','PH3 — Darker, curly, spreads','PH4 — Adult type, limited area','PH5 — Adult (medial thigh spread)']}
            value={tannerPubic} onChange={setTannerPubic} accent="violet" />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Axillary hair"><Pills options={['None','Present']} value={axillaryHair} onChange={setAxillaryHair} accent="pink" /></FL>
          <FL label="Menarche (Female)">
            <Pills options={['Not yet occurred','Occurred']} value={menarche} onChange={setMenarche} accent="pink" />
          </FL>
        </div>
        {menarche === 'Occurred' && (
          <FL label="Age at menarche" sub="years">
            <input type="number" step="0.5" value={menarche_age} onChange={e => setMenarcheAge(e.target.value)} className="w-32 border rounded-lg px-2 py-1.5 text-sm" />
          </FL>
        )}
      </Section>

      {/* Menstrual */}
      <Section title="Menstrual Health (Female)" applicable={sec.menstrual} onApplicable={v => sa('menstrual', v)} accent="pink">
        <FL label="Menstrual evaluation needed?">
          <Pills options={['Yes','No']} value={menGate} onChange={setMenGate} accent="pink" />
        </FL>
        {menGate === 'Yes' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <FL label="Cycle length" sub="days">
                <Pills options={['<21d (Polymenorrhoea)','21-35d (Normal)','35-90d (Oligomenorrhoea)','>90d']}
                  value={menCycle} onChange={setMenCycle} accent="pink" />
              </FL>
              <FL label="Duration" sub="days">
                <Pills options={['<2d','2-7d (Normal)','7-10d','>10d']}
                  value={menDuration} onChange={setMenDuration} accent="pink" />
              </FL>
              <FL label="Flow (pads/day)">
                <Pills options={['Scanty (<1/d)','Normal (2-4/d)','Heavy (>5/d)','Flooding/clots']}
                  value={menFlow} onChange={setMenFlow} accent="pink" />
              </FL>
            </div>
            <FL label="Dysmenorrhoea">
              <Pills options={['None','Mild (no analgesia)','Moderate (OTC analgesia)','Severe (misses school)','Incapacitating']}
                value={dysmenorrhoea} onChange={setDysmenorrhoea} accent="pink" />
            </FL>
            <FL label="Menstrual disorders (select all)">
              <Pills options={['Amenorrhoea (primary)','Amenorrhoea (secondary)','Oligomenorrhoea','Menorrhagia','Intermenstrual bleeding',
                'PCOS (polycystic ovary syndrome)','Endometriosis','Fibroids','Coagulation disorder (AUB-C)','Hyperprolactinaemia']}
                value={menDisorder} onChange={setMenDisorder} accent="red" multi />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="PCOS features">
                <Pills options={['Irregular cycles','Hyperandrogenism (acne/hirsutism)','Polycystic ovaries (USS)','Obesity','None']}
                  value={pcos} onChange={setPcos} accent="violet" />
              </FL>
              <FL label="Endometriosis suspected?">
                <Pills options={['Yes','No','Possible']} value={endo} onChange={setEndo} accent="pink" />
              </FL>
            </div>
          </>
        )}
      </Section>

      {/* HEADSS */}
      <Section title="HEADSS Psychosocial Assessment" applicable={sec.headss} onApplicable={v => sa('headss', v)} accent="violet">
        <div className={`p-3 rounded-lg text-sm ${A.violet.bg} ${A.violet.border} border`}>
          <p className={`font-semibold ${A.violet.text}`}>HEADSS framework — confidential adolescent interview</p>
          <p className="text-gray-600 mt-1">Explain confidentiality limits (safety risks must be shared). Use non-judgmental language.
            RKSK AFHS guidelines recommend routine HEADSS at every adolescent visit.</p>
        </div>
        {[
          { key:'Home', val:hHome, setter:setHHome, opts:['Stable, safe home','Recent conflict','Parent/caregiver separation','Abuse (physical/emotional/sexual)','Homelessness/shelter','Moves frequently'] },
          { key:'Education', val:hEducation, setter:setHEducation, opts:['Regular attendance, doing well','Irregular attendance','Struggling academically','School dropout','Bullying victim','School violence'] },
          { key:'Activities', val:hActivities, setter:setHActivities, opts:['Active hobbies/sports','Sedentary (screen time >6h)','Social isolation','Part-time work','Positive peer group','Antisocial peer group'] },
          { key:'Drugs', val:hDrugs, setter:setHDrugs, opts:['No use','Tobacco/cigarettes','E-cigarettes/vaping','Alcohol (social)','Alcohol (heavy)','Cannabis','Prescription misuse','Hard drugs','Not disclosed'] },
          { key:'Sexuality', val:hSexuality, setter:setHSexuality, opts:['Not yet sexually active','Sexually active (safe)','Sexually active (unprotected)','LGBTQ+ identity','Gender dysphoria','Sexual abuse history','Not disclosed'] },
          { key:'Safety', val:hSafety, setter:setHSafety, opts:['No safety concerns','Road safety concern (helmetless)','Violence exposure','Domestic violence','Weapons in home','Self-harm','Online safety concerns'] },
          { key:'Suicide/Mental Health', val:hSuicide, setter:setHSuicide, opts:['No concerns','Low mood/stress','Self-harm (non-suicidal)','Passive suicidal ideation','Active suicidal ideation','Previous attempt','Mental health diagnosis'] },
        ].map(row => (
          <FL key={row.key} label={row.key}>
            <Pills options={row.opts} value={row.val} onChange={row.setter} accent="violet" multi />
          </FL>
        ))}
      </Section>

      {/* PHQ-A */}
      <Section title="PHQ-A — Adolescent Depression Screening" applicable={sec.phqa} onApplicable={v => sa('phqa', v)} accent="blue">
        <div className={`p-3 rounded-lg text-sm ${A.blue.bg} ${A.blue.border} border`}>
          <p className={`font-semibold ${A.blue.text}`}>Patient Health Questionnaire — Adolescent (PHQ-A) — over last 2 weeks</p>
        </div>
        <div className="bg-white rounded-xl border divide-y overflow-hidden">
          {PHQ_ITEMS.map((item, i) => (
            <div key={i} className="px-3 py-2">
              <p className="text-xs font-semibold text-gray-700 mb-1">{i + 1}. {item}</p>
              <div className="flex gap-1 flex-wrap">
                {phqOptions.map(o => (
                  <button key={o} type="button" onClick={() => setPhqAnswers(prev => ({ ...prev, [i]: o }))}
                    className={`px-2 py-0.5 rounded text-xs border font-medium transition-all
                      ${phqAnswers[i] === o
                        ? i === 8 && o !== 'Not at all (0)' ? 'bg-red-600 text-white border-red-600' : A.blue.active
                        : A.blue.pill}`}>
                    {o}
                  </button>
                ))}
              </div>
              {i === 8 && phqAnswers[8] && phqAnswers[8] !== 'Not at all (0)' && (
                <p className="text-red-700 text-xs font-bold mt-1">⚠ Suicidal ideation endorsed — immediate risk assessment required</p>
              )}
            </div>
          ))}
        </div>
        {Object.keys(phqAnswers).length === 9 && (
          <div className={`p-3 rounded-lg border font-bold ${phqScore >= 15 ? 'bg-red-50 border-red-400 text-red-700' : phqScore >= 10 ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-green-50 border-green-400 text-green-700'}`}>
            PHQ-A Score: {phqScore}/27 — {phqSeverity?.label}
          </div>
        )}
      </Section>

      {/* CRAFFT */}
      <Section title="CRAFFT — Substance Use Screening" applicable={sec.crafft} onApplicable={v => sa('crafft', v)} accent="amber">
        <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
          <p className={`font-semibold ${A.amber.text}`}>CRAFFT — Validated for adolescents 12-21y. Score ≥2 = high risk</p>
        </div>
        <div className="bg-white rounded-xl border divide-y overflow-hidden">
          {CRAFFT_ITEMS.map(item => (
            <div key={item.id} className="px-3 py-3 flex items-center gap-3">
              <span className="text-xs text-gray-700 flex-1">{item.q}</span>
              <div className="flex gap-2">
                {['Yes', 'No'].map(opt => (
                  <button key={opt} type="button"
                    onClick={() => setCrafftAnswers(prev => ({ ...prev, [item.id]: opt }))}
                    className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all
                      ${crafftAnswers[item.id] === opt
                        ? opt === 'Yes' ? 'bg-amber-500 text-white border-amber-500' : 'bg-gray-400 text-white border-gray-400'
                        : 'bg-gray-50 border-gray-300 text-gray-600'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {Object.keys(crafftAnswers).length === 6 && (
          <div className={`p-3 rounded-lg border font-bold ${crafftScore >= 2 ? 'bg-amber-50 border-amber-400 text-amber-800' : 'bg-green-50 border-green-400 text-green-700'}`}>
            CRAFFT Score: {crafftScore}/6 — {crafftScore >= 2 ? 'High risk — brief intervention + referral' : 'Low risk'}
          </div>
        )}
      </Section>

      {/* Eating disorders */}
      <Section title="Eating Disorder Screening" applicable={sec.eating} onApplicable={v => sa('eating', v)} accent="pink">
        <FL label="Eating disorder concern?">
          <Pills options={['Yes','No','Possible']} value={eatingGate} onChange={setEatingGate} accent="pink" />
        </FL>
        {eatingGate !== '' && eatingGate !== 'No' && (
          <>
            <FL label="Concerns (select all)">
              <Pills options={['Weight loss / underweight','Restriction of calories','Binge eating','Purging (vomiting/laxatives)','Excessive exercise','Body dysmorphia','Fear of weight gain','Loss of control eating']}
                value={eatingConcern} onChange={setEatingConcern} accent="pink" multi />
            </FL>
            <FL label="Eating behaviours">
              <Pills options={['Caloric restriction','Skipping meals','Food rituals','Social eating avoidance','Night eating','Pica','Avoidant/restrictive intake (ARFID)']}
                value={eatingBehaviour} onChange={setEatingBehaviour} accent="pink" multi />
            </FL>
            <FL label="DSM-5 diagnosis">
              <Pills options={['Anorexia nervosa (restricting)','Anorexia nervosa (binge-purge)','Bulimia nervosa','Binge eating disorder','ARFID','OSFED','Not yet classified']}
                value={eatingDiagnosis} onChange={setEatingDiagnosis} accent="red" />
            </FL>
          </>
        )}
      </Section>

      {/* Suicide risk */}
      <Section title="Suicide Risk Assessment (Columbia Scale)" applicable={sec.suicide} onApplicable={v => sa('suicide', v)} accent="red">
        <FL label="Suicide risk assessment needed?">
          <Pills options={['Yes','No']} value={suicideGate} onChange={setSuicideGate} accent="red" />
        </FL>
        {suicideGate === 'Yes' && (
          <>
            <FL label="Suicidal ideation">
              <Pills options={['None','Passive (wishes to be dead)','Active ideation without plan','Active ideation with plan','Active ideation with intent to act']}
                value={suicideIdeation} onChange={setSuicideIdeation} accent="red" />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Has a plan?"><Pills options={['No','Vague plan','Specific plan']} value={suicidePlan} onChange={setSuicidePlan} accent="red" /></FL>
              <FL label="Intent / access to means"><Pills options={['Low — no means','Moderate — some means','High — has means and plan']} value={suicideIntent} onChange={setSuicideIntent} accent="red" /></FL>
            </div>
            <FL label="Previous attempt?">
              <Pills options={['None','Yes — low lethality','Yes — high lethality','Multiple attempts']}
                value={suicideAttempt} onChange={setSuicideAttempt} accent="red" />
            </FL>
            <FL label="Overall risk level">
              <Pills options={['Low — safety planning, follow-up','Moderate — close monitoring, refer','High — emergency psychiatric admission']}
                value={suicideRisk} onChange={setSuicideRisk} accent="red" />
            </FL>
          </>
        )}
      </Section>

      {/* STI */}
      <Section title="Sexual Health & STI Screening" applicable={sec.sti} onApplicable={v => sa('sti', v)} accent="teal">
        <FL label="Sexual health assessment needed?">
          <Pills options={['Yes','No']} value={stiGate} onChange={setStiGate} accent="teal" />
        </FL>
        {stiGate === 'Yes' && (
          <>
            <FL label="Sexually active?">
              <Pills options={['Yes','No','Not disclosed']} value={sexuallyActive} onChange={setSexuallyActive} accent="teal" />
            </FL>
            {sexuallyActive === 'Yes' && (
              <>
                <FL label="Contraception used?">
                  <Pills options={['Condom (male/female)','OCP','DMPA injection','IUCD','Emergency contraception','None']}
                    value={contraception} onChange={setContraception} accent="teal" />
                </FL>
                <FL label="STI symptoms?">
                  <Pills options={['Vaginal discharge','Penile discharge','Genital ulcer/sore','Dysuria','Pelvic pain','Testicular pain','Warts','None']}
                    value={stiSymptoms} onChange={setStiSymptoms} accent="teal" multi />
                </FL>
                <FL label="STI screening done?">
                  <Pills options={['HIV test','Syphilis (VDRL/RPR)','Gonorrhoea / Chlamydia (NAAT)','Hepatitis B','Hepatitis C','HPV (Pap smear)','Not done']}
                    value={stiScreening} onChange={setStiScreening} accent="teal" multi />
                </FL>
              </>
            )}
          </>
        )}
      </Section>

      {/* Sleep */}
      <Section title="Sleep Health" applicable={sec.sleep} onApplicable={v => sa('sleep', v)} accent="violet">
        <div className="grid grid-cols-3 gap-3">
          <FL label="Sleep hours" sub="hours/night">
            <input type="number" step="0.5" value={sleepHours} onChange={e => setSleepHours(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="8-10h recommended" />
            {parseFloat(sleepHours) < 7 && sleepHours !== '' && <p className="text-amber-700 text-xs mt-1">Sleep insufficient for age</p>}
          </FL>
          <FL label="Sleep quality">
            <Pills options={['Good','Fair','Poor','Very poor']} value={sleepQuality} onChange={setSleepQuality} accent="violet" />
          </FL>
          <FL label="Screen time before bed" sub="hours">
            <input type="number" step="0.5" value={screenTime} onChange={e => setScreenTime(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="hours" />
          </FL>
        </div>
        <FL label="Sleep disorder symptoms">
          <Pills options={['Insomnia (difficulty initiating)','Insomnia (maintaining)','Delayed sleep phase (DSPS)','Excessive daytime sleepiness','Snoring/OSA','Restless legs','Nightmares/parasomnias']}
            value={sleepDisorder} onChange={setSleepDisorder} accent="violet" multi />
        </FL>
      </Section>

      <button type="button" onClick={handleSave}
        className="w-full py-3 rounded-2xl bg-pink-600 hover:bg-pink-700 text-white font-bold text-base shadow-lg transition-all">
        Save Adolescent Health Assessment
      </button>
    </div>
  );
}
