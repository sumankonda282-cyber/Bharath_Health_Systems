/**
 * @shared-pool
 * PediatricGrowthDevelopmentForm — Pediatric Growth & Development Assessment
 * WHO Z-scores (WAZ/HAZ/WHZ), Denver II milestones, SAM/MAM classification,
 * MUAC, RBSK 4D screening, Tanner staging preview, head circumference
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useMemo } from 'react';
import { Lock, ChevronDown, ChevronUp, AlertTriangle, TrendingUp } from 'lucide-react';
import api from '../../../api/client';

const A = {
  emerald:{ bg:'bg-emerald-50', border:'border-emerald-300', text:'text-emerald-700',
            pill:'bg-emerald-100 border-emerald-400 text-emerald-800',
            active:'bg-emerald-600 text-white border-emerald-600' },
  amber:  { bg:'bg-amber-50',   border:'border-amber-300',   text:'text-amber-700',
            pill:'bg-amber-100 border-amber-400 text-amber-800',
            active:'bg-amber-600 text-white border-amber-600' },
  red:    { bg:'bg-red-50',     border:'border-red-300',     text:'text-red-700',
            pill:'bg-red-100 border-red-400 text-red-800',
            active:'bg-red-600 text-white border-red-600' },
  blue:   { bg:'bg-blue-50',    border:'border-blue-300',    text:'text-blue-700',
            pill:'bg-blue-100 border-blue-400 text-blue-800',
            active:'bg-blue-600 text-white border-blue-600' },
  violet: { bg:'bg-violet-50',  border:'border-violet-300',  text:'text-violet-700',
            pill:'bg-violet-100 border-violet-400 text-violet-800',
            active:'bg-violet-600 text-white border-violet-600' },
  pink:   { bg:'bg-pink-50',    border:'border-pink-300',    text:'text-pink-700',
            pill:'bg-pink-100 border-pink-400 text-pink-800',
            active:'bg-pink-600 text-white border-pink-600' },
};

function Pills({ options, value, onChange, accent = 'emerald', multi = false }) {
  const ac = A[accent];
  const vals = multi ? (Array.isArray(value) ? value : []) : value;
  const toggle = (o) => {
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

function Gate({ label, value, onChange, accent = 'emerald', children }) {
  const ac = A[accent];
  return (
    <div className={`border rounded-xl p-4 ${value === 'Yes' ? ac.bg + ' ' + ac.border : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-gray-800 text-sm">{label}</span>
        <div className="flex gap-2">
          {['Yes', 'No'].map(opt => (
            <button key={opt} type="button" onClick={() => onChange(opt)}
              className={`px-4 py-1 rounded-full border text-sm font-medium transition-all
                ${value === opt ? ac.active : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      {value === 'Yes' && <div className="mt-3 space-y-4">{children}</div>}
    </div>
  );
}

function Section({ title, applicable, onApplicable, accent = 'emerald', children }) {
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
                  : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'}`}>
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

function ScoreRow({ label, options, value, onChange, accent = 'emerald' }) {
  const ac = A[accent];
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-700 flex-1">{label}</span>
      <div className="flex gap-1 flex-wrap justify-end">
        {options.map(o => (
          <button key={o.label} type="button" onClick={() => onChange(o.label)}
            className={`px-2 py-0.5 rounded border text-xs font-medium transition-all
              ${value === o.label ? ac.active : ac.pill}`}>
            {o.label} {o.score !== undefined && <span className="opacity-70">({o.score})</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PediatricGrowthDevelopmentForm({ patientId, encounterId, onSaved }) {
  const [sec, setSec] = useState({
    anthro: 'Applicable', zscores: 'Applicable', milestones: 'Applicable',
    nutrition: 'Applicable', rbsk: 'Applicable', bonage: 'Applicable',
    tanner: 'Applicable', notes: 'Applicable',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  // Anthropometric measurements
  const [age, setAge] = useState('');
  const [ageUnit, setAgeUnit] = useState('months');
  const [sex, setSex] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [hc, setHc] = useState('');
  const [muac, setMuac] = useState('');
  const [birthWeight, setBirthWeight] = useState('');

  // Z-scores (entered after plotting on WHO charts)
  const [waz, setWaz] = useState('');
  const [haz, setHaz] = useState('');
  const [whz, setWhz] = useState('');
  const [baz, setBaz] = useState('');

  // Milestone domains — each with Pass/Emerging/Fail
  const [gross, setGross] = useState({});
  const [fine, setFine] = useState({});
  const [language, setLanguage] = useState({});
  const [social, setSocial] = useState({});

  // Nutrition
  const [feedingMode, setFeedingMode] = useState('');
  const [dietDiversity, setDietDiversity] = useState('');
  const [vitAStatus, setVitAStatus] = useState('');
  const [ironStatus, setIronStatus] = useState('');
  const [diarrhea, setDiarrhea] = useState('');
  const [oedema, setOedema] = useState('');
  const [oedemaGrade, setOedemaGrade] = useState('');

  // RBSK 4D screening
  const [defects, setDefects] = useState([]);
  const [deficiencies, setDeficiencies] = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [devDelay, setDevDelay] = useState([]);

  // Bone age
  const [boneAgeDone, setBoneAgeDone] = useState('');
  const [boneAge, setBoneAge] = useState('');
  const [boneAgeCorr, setBoneAgeCorr] = useState('');

  // Tanner staging
  const [tannerBreast, setTannerBreast] = useState('');
  const [tannerPubic, setTannerPubic] = useState('');
  const [tannerGenital, setTannerGenital] = useState('');
  const [menarche, setMenarche] = useState('');

  // Notes
  const [growth_concern, setGrowthConcern] = useState([]);
  const [referral, setReferral] = useState('');
  const [planNotes, setPlanNotes] = useState('');

  // Derived classifications
  const muacClass = useMemo(() => {
    const v = parseFloat(muac);
    if (isNaN(v)) return null;
    if (v < 11.5) return { label: 'SAM', color: 'text-red-700 font-bold' };
    if (v < 12.5) return { label: 'MAM', color: 'text-orange-600 font-bold' };
    return { label: 'Normal', color: 'text-green-700' };
  }, [muac]);

  const whzClass = useMemo(() => {
    const v = parseFloat(whz);
    if (isNaN(v)) return null;
    if (v < -3) return { label: 'SAM (Severe Wasting)', color: 'text-red-700 font-bold' };
    if (v < -2) return { label: 'MAM (Moderate Wasting)', color: 'text-orange-600 font-bold' };
    if (v > 2) return { label: 'Overweight', color: 'text-yellow-700' };
    if (v > 3) return { label: 'Obese', color: 'text-orange-700 font-bold' };
    return { label: 'Normal', color: 'text-green-700' };
  }, [whz]);

  const hazClass = useMemo(() => {
    const v = parseFloat(haz);
    if (isNaN(v)) return null;
    if (v < -3) return { label: 'Severe Stunting', color: 'text-red-700 font-bold' };
    if (v < -2) return { label: 'Moderate Stunting', color: 'text-orange-600 font-bold' };
    return { label: 'Normal Height for Age', color: 'text-green-700' };
  }, [haz]);

  const wazClass = useMemo(() => {
    const v = parseFloat(waz);
    if (isNaN(v)) return null;
    if (v < -3) return { label: 'Severe Underweight', color: 'text-red-700 font-bold' };
    if (v < -2) return { label: 'Moderate Underweight', color: 'text-orange-600 font-bold' };
    if (v > 2) return { label: 'Overweight', color: 'text-yellow-700' };
    return { label: 'Normal', color: 'text-green-700' };
  }, [waz]);

  const samAlert = (muacClass?.label === 'SAM' || whzClass?.label?.includes('SAM') || oedema === 'Yes');

  const handleSave = async () => {
    await api.post('/assessments', {
      type: 'pediatric-growth-development',
      patientId, encounterId,
      data: {
        demographics: { age, ageUnit, sex },
        anthropometry: { weight, height, hc, muac, birthWeight },
        zscores: { waz, haz, whz, baz },
        classifications: { muacClass: muacClass?.label, whzClass: whzClass?.label, hazClass: hazClass?.label, wazClass: wazClass?.label },
        milestones: { gross, fine, language, social },
        nutrition: { feedingMode, dietDiversity, vitAStatus, ironStatus, diarrhea, oedema, oedemaGrade },
        rbsk: { defects, deficiencies, diseases, devDelay },
        boneAge: { done: boneAgeDone, age: boneAge, correlation: boneAgeCorr },
        tanner: { breast: tannerBreast, pubicHair: tannerPubic, genital: tannerGenital, menarche },
        plan: { growth_concern, referral, planNotes },
      }
    });
    onSaved?.();
  };

  const grossMilestones = {
    '0-3m': ['Head control (prone)','Social smile','Tracks 180°'],
    '3-6m': ['Rolls over','Sits with support','Bears weight on legs'],
    '6-9m': ['Sits without support','Stands with support','Crawls'],
    '9-12m': ['Pulls to stand','Cruises','First steps'],
    '12-18m': ['Walks independently','Runs (15m)','Climbs stairs with support'],
    '18-24m': ['Runs well','Kicks ball','Climbs furniture'],
    '2-3y': ['Jumps with both feet','Rides tricycle','Throws overhand'],
    '3-5y': ['Hops on one foot','Skips','Catches ball'],
  };

  const fineMilestones = {
    '0-3m': ['Hands fisted → open','Grasp reflex fades','Reaches for objects'],
    '3-6m': ['Palmar grasp','Transfers hand to hand','Holds rattle'],
    '6-9m': ['Inferior pincer','Bangs objects','Mouths objects'],
    '9-12m': ['Mature pincer grasp','Puts in/out container','Points index finger'],
    '12-18m': ['Tower of 2 blocks','Scribbles','Turns pages'],
    '18-24m': ['Tower of 4-6 blocks','Copies vertical line','Spoon use'],
    '2-3y': ['Tower 8 blocks','Copies circle','Dresses with help'],
    '3-5y': ['Copies cross/square','Uses scissors','Draws person (3+ parts)'],
  };

  const langMilestones = {
    '0-3m': ['Coos','Startles to sound','Vocalizes pleasure'],
    '3-6m': ['Laughs aloud','Babbles','Responds to name'],
    '6-9m': ['Mama/Dada (non-specific)','Imitates sounds','Responds to "No"'],
    '9-12m': ['1-2 meaningful words','Jargon','Follows 1-step command'],
    '12-18m': ['5-10 words','Points to show','Uses "no" purposefully'],
    '18-24m': ['20-50 words','2-word phrases','Names pictures'],
    '2-3y': ['3-word sentences','Asks questions','Strangers understand 75%'],
    '3-5y': ['Full sentences','Tells stories','Knows colors/numbers'],
  };

  const socialMilestones = {
    '0-3m': ['Smiles responsively','Fixes gaze on face','Calms with voice'],
    '3-6m': ['Recognizes caregiver','Anticipates feeding','Stranger awareness begins'],
    '6-9m': ['Stranger anxiety','Waves bye','Plays peek-a-boo'],
    '9-12m': ['Separation anxiety','Imitates gestures','Shows objects'],
    '12-18m': ['Plays near others','Uses spoon/cup','Gives toys when asked'],
    '18-24m': ['Parallel play','Points to body parts','Temper tantrums'],
    '2-3y': ['Cooperative play begins','Dresses with help','Understands mine/yours'],
    '3-5y': ['Interactive play','Follows rules','Separates easily from parent'],
  };

  const ageGroups = ['0-3m','3-6m','6-9m','9-12m','12-18m','18-24m','2-3y','3-5y'];

  function MilestoneTable({ title, data, state, setState, accent }) {
    const ac = A[accent];
    return (
      <div>
        <h4 className={`font-semibold text-sm mb-2 ${ac.text}`}>{title}</h4>
        {ageGroups.map(grp => data[grp] && (
          <div key={grp} className="mb-2">
            <p className="text-xs font-semibold text-gray-500 mb-1">{grp}</p>
            <div className="space-y-1">
              {data[grp].map(m => (
                <div key={m} className="flex items-center justify-between gap-2 bg-white border rounded-lg px-3 py-1">
                  <span className="text-xs text-gray-700 flex-1">{m}</span>
                  <div className="flex gap-1">
                    {['Pass','Emerging','Fail','N/A'].map(s => (
                      <button key={s} type="button"
                        onClick={() => setState(prev => ({ ...prev, [m]: s }))}
                        className={`px-2 py-0.5 rounded text-xs border font-medium transition-all
                          ${state[m] === s
                            ? s === 'Pass' ? 'bg-green-500 text-white border-green-500'
                            : s === 'Fail' ? 'bg-red-500 text-white border-red-500'
                            : s === 'Emerging' ? 'bg-amber-400 text-white border-amber-400'
                            : 'bg-gray-400 text-white border-gray-400'
                            : 'bg-gray-50 border-gray-300 text-gray-500'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-8 h-8 opacity-80" />
          <div>
            <h2 className="text-xl font-bold">Pediatric Growth & Development Assessment</h2>
            <p className="text-emerald-100 text-sm">WHO Z-scores · Denver II Milestones · SAM/MAM · RBSK Screening</p>
          </div>
        </div>
      </div>

      {/* SAM Alert */}
      {samAlert && (
        <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700">SAM / Severe Acute Malnutrition Detected</p>
            <p className="text-sm text-red-600">Refer immediately to NRC (Nutritional Rehabilitation Centre) · RUTF therapy · Treat medical complications</p>
          </div>
        </div>
      )}

      {/* Demographics */}
      <Section title="Patient Demographics & Anthropometry" applicable={sec.anthro} onApplicable={v => sa('anthro', v)} accent="emerald">
        <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
          <p className={`font-semibold ${A.amber.text}`}>India context — Growth burden</p>
          <p className="text-gray-600 mt-1">India NFHS-5 (2019-21): 35.5% children stunted, 19.3% wasted, 32.1% underweight.
            Use WHO Multicentre Growth Reference Standards (MGRS) 0-5y; WHO 2007 reference 5-19y.
            RBSK (Rashtriya Bal Swasthya Karyakram) screens 0-18y for 4Ds at school/Anganwadi level.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Age">
            <div className="flex gap-2">
              <input type="number" value={age} onChange={e => setAge(e.target.value)}
                placeholder="0" className="w-20 border rounded-lg px-2 py-1.5 text-sm" />
              <select value={ageUnit} onChange={e => setAgeUnit(e.target.value)}
                className="flex-1 border rounded-lg px-2 py-1.5 text-sm">
                <option>days</option><option>months</option><option>years</option>
              </select>
            </div>
          </FL>
          <FL label="Sex">
            <Pills options={['Male','Female']} value={sex} onChange={setSex} accent="emerald" />
          </FL>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Weight" sub="kg">
            <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
              placeholder="kg" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          </FL>
          <FL label="Height/Length" sub="cm">
            <input type="number" value={height} onChange={e => setHeight(e.target.value)}
              placeholder="cm" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          </FL>
          <FL label="Head Circumference" sub="cm">
            <input type="number" value={hc} onChange={e => setHc(e.target.value)}
              placeholder="cm" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          </FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="MUAC" sub="cm — mid-upper arm circumference">
            <input type="number" value={muac} onChange={e => setMuac(e.target.value)}
              placeholder="cm" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
            {muacClass && <p className={`text-sm mt-1 ${muacClass.color}`}>{muacClass.label}</p>}
          </FL>
          <FL label="Birth Weight" sub="kg">
            <input type="number" value={birthWeight} onChange={e => setBirthWeight(e.target.value)}
              placeholder="kg" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          </FL>
        </div>
        <FL label="Presence of Bilateral Pitting Oedema (nutritional)">
          <Pills options={['No','Yes — Grade 1 (+)','Yes — Grade 2 (++)','Yes — Grade 3 (+++']} value={oedema} onChange={setOedema} accent="red" />
        </FL>
      </Section>

      {/* WHO Z-scores */}
      <Section title="WHO Z-score Classification" applicable={sec.zscores} onApplicable={v => sa('zscores', v)} accent="blue">
        <div className={`p-3 rounded-lg text-sm ${A.blue.bg} ${A.blue.border} border`}>
          <p className={`font-semibold ${A.blue.text}`}>Plot on WHO growth charts, enter Z-scores</p>
          <p className="text-gray-600 mt-1">Use iGrowUp app (WHO) or NIN-ICMR charts. SAM = WHZ &lt;-3 OR MUAC &lt;11.5cm OR bilateral oedema.
            MAM = WHZ -3 to -2 OR MUAC 11.5-12.5cm. Refer all SAM to NRC (48 centres in India).</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FL label="WAZ — Weight for Age Z-score">
            <input type="number" step="0.1" value={waz} onChange={e => setWaz(e.target.value)}
              placeholder="-2.0" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
            {wazClass && <p className={`text-sm mt-1 ${wazClass.color}`}>{wazClass.label}</p>}
          </FL>
          <FL label="HAZ — Height for Age Z-score">
            <input type="number" step="0.1" value={haz} onChange={e => setHaz(e.target.value)}
              placeholder="-2.0" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
            {hazClass && <p className={`text-sm mt-1 ${hazClass.color}`}>{hazClass.label}</p>}
          </FL>
          <FL label="WHZ — Weight for Height Z-score">
            <input type="number" step="0.1" value={whz} onChange={e => setWhz(e.target.value)}
              placeholder="-2.0" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
            {whzClass && <p className={`text-sm mt-1 ${whzClass.color}`}>{whzClass.label}</p>}
          </FL>
          <FL label="BAZ — BMI for Age Z-score (≥5y)">
            <input type="number" step="0.1" value={baz} onChange={e => setBaz(e.target.value)}
              placeholder="-2.0" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          </FL>
        </div>
      </Section>

      {/* Developmental Milestones */}
      <Section title="Developmental Milestones (Denver II)" applicable={sec.milestones} onApplicable={v => sa('milestones', v)} accent="violet">
        <div className={`p-3 rounded-lg text-sm ${A.violet.bg} ${A.violet.border} border`}>
          <p className={`font-semibold ${A.violet.text}`}>Denver Developmental Screening Test (DDST-II)</p>
          <p className="text-gray-600 mt-1">4 domains: Gross Motor, Fine Motor-Adaptive, Language, Personal-Social.
            Failure = cannot perform a task that 90% of children same age can perform.
            Refer to developmental paediatrician if ≥2 domains delayed or any global developmental delay (GDD).</p>
        </div>
        <MilestoneTable title="Gross Motor" data={grossMilestones} state={gross} setState={setGross} accent="emerald" />
        <MilestoneTable title="Fine Motor / Adaptive" data={fineMilestones} state={fine} setState={setFine} accent="blue" />
        <MilestoneTable title="Language / Communication" data={langMilestones} state={language} setState={setLanguage} accent="violet" />
        <MilestoneTable title="Personal-Social" data={socialMilestones} state={social} setState={setSocial} accent="pink" />
      </Section>

      {/* Nutrition */}
      <Section title="Nutritional Assessment" applicable={sec.nutrition} onApplicable={v => sa('nutrition', v)} accent="amber">
        <div className="grid grid-cols-2 gap-3">
          <FL label="Feeding Mode">
            <Pills options={['Exclusive breastfeeding','Partial breastfeeding','Complementary feeding','Weaned','Formula','Mixed']}
              value={feedingMode} onChange={setFeedingMode} accent="amber" />
          </FL>
          <FL label="Dietary Diversity" sub="(≥5 food groups = adequate)">
            <Pills options={['<3 groups','3-4 groups','5+ groups']} value={dietDiversity} onChange={setDietDiversity} accent="amber" />
          </FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Vitamin A Status (IAP guidelines)">
            <Pills options={['Supplemented','Night blindness','Bitot spots','Xerophthalmia','Deficient — clinical signs','Not assessed']}
              value={vitAStatus} onChange={setVitAStatus} accent="amber" multi />
          </FL>
          <FL label="Iron Status / Anaemia">
            <Pills options={['Normal','Mild anaemia','Moderate anaemia','Severe anaemia','IDA confirmed','Not assessed']}
              value={ironStatus} onChange={setIronStatus} accent="red" />
          </FL>
        </div>
        <FL label="Diarrhoea in last 2 weeks (IMNCI)">
          <Pills options={['No','Yes — acute','Yes — persistent (>14d)','Yes — with blood (dysentery)']}
            value={diarrhea} onChange={setDiarrhea} accent="amber" />
        </FL>
        <FL label="Growth Concern / Faltering">
          <Pills options={['Weight faltering','Height faltering','Head growth concern (micro/macrocephaly)','Weight loss','Crossing centiles downward','No concern']}
            value={growth_concern} onChange={setGrowthConcern} accent="red" multi />
        </FL>
      </Section>

      {/* RBSK */}
      <Section title="RBSK 4D Screening (0–18 years)" applicable={sec.rbsk} onApplicable={v => sa('rbsk', v)} accent="emerald">
        <div className={`p-3 rounded-lg text-sm ${A.emerald.bg} ${A.emerald.border} border`}>
          <p className={`font-semibold ${A.emerald.text}`}>Rashtriya Bal Swasthya Karyakram — 4Ds</p>
          <p className="text-gray-600 mt-1">Screen for 30 conditions across 4Ds. Mobile Health Teams (MHTs) screen at Anganwadis and schools.
            Positive screens → District Early Intervention Centre (DEIC) → tertiary if needed. Free corrective surgery under PM-JAY/RBSK.</p>
        </div>
        <FL label="Defects at Birth" sub="(select all present)">
          <Pills options={['Congenital heart disease','Down syndrome','Cleft lip/palate','Talipes','Developmental dysplasia hip',
            'Neural tube defect','Cataracts','Hearing impairment','Hypospadias','None detected']}
            value={defects} onChange={setDefects} accent="red" multi />
        </FL>
        <FL label="Deficiencies" sub="(select all present)">
          <Pills options={['Anaemia (Hb <11g/dL)','Vitamin A deficiency','Vitamin D deficiency (rickets)',
            'Iodine deficiency (goitre)','Zinc deficiency','Fluorosis','None detected']}
            value={deficiencies} onChange={setDeficiencies} accent="amber" multi />
        </FL>
        <FL label="Diseases" sub="(select all present)">
          <Pills options={['SAM — Severe Acute Malnutrition','Skin disorders','Rheumatic heart disease',
            'Reactive airway disease','Epilepsy','Sickle cell disease','Thalassaemia',
            'G6PD deficiency','Dental caries','None detected']}
            value={diseases} onChange={setDiseases} accent="blue" multi />
        </FL>
        <FL label="Developmental Delays / Disabilities" sub="(select all present)">
          <Pills options={['Motor delay','Speech-language delay','Cognitive delay','Autism spectrum',
            'ADHD','Cerebral palsy','Hearing loss','Visual impairment','Learning disability','None detected']}
            value={devDelay} onChange={setDevDelay} accent="violet" multi />
        </FL>
      </Section>

      {/* Bone Age */}
      <Section title="Bone Age Assessment" applicable={sec.bonage} onApplicable={v => sa('bonage', v)} accent="blue">
        <FL label="X-ray left wrist performed for bone age">
          <Pills options={['Yes','No','Pending']} value={boneAgeDone} onChange={setBoneAgeDone} accent="blue" />
        </FL>
        {boneAgeDone === 'Yes' && (
          <div className="grid grid-cols-2 gap-3">
            <FL label="Bone Age (Greulich-Pyle / TW2)" sub="years">
              <input type="number" step="0.5" value={boneAge} onChange={e => setBoneAge(e.target.value)}
                placeholder="years" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
            </FL>
            <FL label="Correlation with Chronological Age">
              <Pills options={['Advanced (>2y ahead)','Appropriate','Delayed (>2y behind)']}
                value={boneAgeCorr} onChange={setBoneAgeCorr} accent="blue" />
            </FL>
          </div>
        )}
      </Section>

      {/* Tanner Staging */}
      <Section title="Tanner Staging (Pubertal Assessment)" applicable={sec.tanner} onApplicable={v => sa('tanner', v)} accent="pink">
        <div className={`p-3 rounded-lg text-sm ${A.pink.bg} ${A.pink.border} border`}>
          <p className={`font-semibold ${A.pink.text}`}>Sexual maturity rating — Marshall & Tanner</p>
          <p className="text-gray-600 mt-1">Precocious puberty: girls &lt;8y, boys &lt;9y. Delayed: girls &gt;13y, boys &gt;14y.
            Endocrine referral for central vs peripheral precocity (GnRH stimulation test).</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Breast / Thelarche (Female)">
            <Pills options={['B1 — Prepubertal','B2 — Bud (thelarche)','B3 — Enlargement','B4 — Adult shape','B5 — Adult']}
              value={tannerBreast} onChange={setTannerBreast} accent="pink" />
          </FL>
          <FL label="Genital Development (Male)">
            <Pills options={['G1 — Prepubertal','G2 — Early enlargement','G3 — Elongation','G4 — Glans development','G5 — Adult']}
              value={tannerGenital} onChange={setTannerGenital} accent="blue" />
          </FL>
        </div>
        <FL label="Pubic Hair (Both sexes)">
          <Pills options={['PH1 — None','PH2 — Sparse','PH3 — Darker/curly','PH4 — Adult type (limited)','PH5 — Adult (medial thigh)']}
            value={tannerPubic} onChange={setTannerPubic} accent="violet" />
        </FL>
        <FL label="Menarche (Female)">
          <Pills options={['Not yet','Yes — recent (<6m)','Yes — regular cycles','Irregular','Amenorrhoea']}
            value={menarche} onChange={setMenarche} accent="pink" />
        </FL>
      </Section>

      {/* Plan */}
      <Section title="Assessment Summary & Plan" applicable={sec.notes} onApplicable={v => sa('notes', v)} accent="emerald">
        <FL label="Referral Required">
          <Pills options={['None','NRC (SAM)','DEIC (developmental)','Endocrinology','Gastroenterology',
            'Child neurology','Dietitian','Social worker','PM-JAY/RBSK referral']}
            value={referral} onChange={setReferral} accent="emerald" />
        </FL>
        <FL label="Additional clinical notes">
          <textarea value={planNotes} onChange={e => setPlanNotes(e.target.value)} rows={3}
            className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Growth trajectory, interventions planned, parent counselling..." />
        </FL>
      </Section>

      <button type="button" onClick={handleSave}
        className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg transition-all">
        Save Growth & Development Assessment
      </button>
    </div>
  );
}
