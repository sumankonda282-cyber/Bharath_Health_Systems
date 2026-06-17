/**
 * @shared-pool
 * PediatricEndocrinologyForm — Pediatric Endocrinology Assessment
 * T1DM/T2DM (ISPAD), hypothyroidism/hyperthyroidism (newborn + child),
 * short stature (Bayley-Pinneau, bone age), precocious/delayed puberty,
 * congenital adrenal hyperplasia (CAH), diabetes insipidus, obesity (IAP BMI),
 * thyroid disease, growth hormone deficiency, adrenal insufficiency
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useMemo } from 'react';
import { Lock, AlertTriangle, Zap } from 'lucide-react';
import api from '../../../api/client';

const A = {
  emerald:{ bg:'bg-emerald-50', border:'border-emerald-300', text:'text-emerald-700',
            pill:'bg-emerald-100 border-emerald-400 text-emerald-800',
            active:'bg-emerald-600 text-white border-emerald-600' },
  blue:   { bg:'bg-blue-50',    border:'border-blue-300',    text:'text-blue-700',
            pill:'bg-blue-100 border-blue-400 text-blue-800',
            active:'bg-blue-600 text-white border-blue-600' },
  amber:  { bg:'bg-amber-50',   border:'border-amber-300',   text:'text-amber-700',
            pill:'bg-amber-100 border-amber-400 text-amber-800',
            active:'bg-amber-600 text-white border-amber-600' },
  red:    { bg:'bg-red-50',     border:'border-red-300',     text:'text-red-700',
            pill:'bg-red-100 border-red-400 text-red-800',
            active:'bg-red-600 text-white border-red-600' },
  violet: { bg:'bg-violet-50',  border:'border-violet-300',  text:'text-violet-700',
            pill:'bg-violet-100 border-violet-400 text-violet-800',
            active:'bg-violet-600 text-white border-violet-600' },
  teal:   { bg:'bg-teal-50',    border:'border-teal-300',    text:'text-teal-700',
            pill:'bg-teal-100 border-teal-400 text-teal-800',
            active:'bg-teal-600 text-white border-teal-600' },
  pink:   { bg:'bg-pink-50',    border:'border-pink-300',    text:'text-pink-700',
            pill:'bg-pink-100 border-pink-400 text-pink-800',
            active:'bg-pink-600 text-white border-pink-600' },
};

function Pills({ options, value, onChange, accent = 'emerald', multi = false }) {
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

export default function PediatricEndocrinologyForm({ patientId, encounterId, onSaved }) {
  const [sec, setSec] = useState({
    overview: 'Applicable', diabetes: 'Applicable', thyroid: 'Applicable',
    growth: 'Applicable', puberty: 'Applicable', adrenal: 'Applicable',
    obesity: 'Applicable', di: 'Applicable', neonatalendo: 'Applicable',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  // Overview
  const [age, setAge] = useState('');
  const [ageUnit, setAgeUnit] = useState('years');
  const [sex, setSex] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [chief, setChief] = useState([]);

  // Diabetes mellitus
  const [dmGate, setDmGate] = useState('');
  const [dmType, setDmType] = useState('');
  const [glucose, setGlucose] = useState('');
  const [hba1c, setHba1c] = useState('');
  const [acidosis, setAcidosis] = useState('');
  const [ketones, setKetones] = useState('');
  const [dkaGate, setDkaGate] = useState('');
  const [ph, setPh] = useState('');
  const [bicarbonate, setBicarbonate] = useState('');
  const [insulin, setInsulin] = useState('');
  const [cgm, setCgm] = useState('');
  const [tir, setTir] = useState('');
  const [hypoglycaemiaFreq, setHypoglycaemiaFreq] = useState('');
  const [dmComplications, setDmComplications] = useState([]);

  // Thyroid
  const [thyGate, setThyGate] = useState('');
  const [thyroidType, setThyroidType] = useState('');
  const [tsh, setTsh] = useState('');
  const [ft4, setFt4] = useState('');
  const [ft3, setFt3] = useState('');
  const [thyAbAntibodies, setThyAbAntibodies] = useState([]);
  const [thyFeatures, setThyFeatures] = useState([]);
  const [thyTx, setThyTx] = useState('');
  const [nbs, setNbs] = useState('');

  // Growth
  const [growthGate, setGrowthGate] = useState('');
  const [heightSDS, setHeightSDS] = useState('');
  const [heightVelocity, setHeightVelocity] = useState('');
  const [midParentalHeight, setMidParentalHeight] = useState('');
  const [boneAge, setBoneAge] = useState('');
  const [ghdTest, setGhdTest] = useState('');
  const [igf1, setIgf1] = useState('');
  const [ghDeficiency, setGhDeficiency] = useState('');
  const [growthCause, setGrowthCause] = useState('');
  const [ghTherapy, setGhTherapy] = useState('');

  // Puberty
  const [pubertyGate, setPubertyGate] = useState('');
  const [pubertyType, setPubertyType] = useState('');
  const [pubertyAge, setPubertyAge] = useState('');
  const [pubertyFeatures, setPubertyFeatures] = useState([]);
  const [gnrhTest, setGnrhTest] = useState('');
  const [lhFsh, setLhFsh] = useState('');
  const [gnrhAnalogue, setGnrhAnalogue] = useState('');

  // Adrenal
  const [adrenalGate, setAdrenalGate] = useState('');
  const [adrenalType, setAdrenalType] = useState('');
  const [cortisol, setCortisol] = useState('');
  const [acth, setActh] = useState('');
  const [electrolytes, setElectrolytes] = useState('');
  const [cahFeatures, setCahFeatures] = useState([]);
  const [hydrocortisone, setHydrocortisone] = useState('');

  // Obesity
  const [obesityGate, setObesityGate] = useState('');
  const [bmi, setBmi] = useState('');
  const [bmiPercentile, setBmiPercentile] = useState('');
  const [waistCircumference, setWaistCircumference] = useState('');
  const [metabolicFeatures, setMetabolicFeatures] = useState([]);
  const [obesityCause, setObesityCause] = useState('');

  // DI
  const [diGate, setDiGate] = useState('');
  const [diType, setDiType] = useState('');
  const [urine24h, setUrine24h] = useState('');
  const [urineOsmolality, setUrineOsmolality] = useState('');
  const [sodiumLevel, setSodiumLevel] = useState('');

  // Neonatal endocrine
  const [neoGate, setNeoGate] = useState('');
  const [neoHypoglycaemia, setNeoHypoglycaemia] = useState('');
  const [neoCalcium, setNeoCalcium] = useState('');
  const [neoTSH, setNeoTSH] = useState('');
  const [cahNewborn, setCahNewborn] = useState('');
  const [ambiguousGenitalia, setAmbiguousGenitalia] = useState('');

  const dkaAlert = dkaGate === 'Yes' || parseFloat(glucose) > 20;
  const adrenalCrisis = adrenalType === 'Acute adrenal crisis' || (parseFloat(cortisol) < 100 && cortisol !== '');

  const bmiCalc = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100;
    if (!w || !h) return null;
    return (w / (h * h)).toFixed(1);
  }, [weight, height]);

  const handleSave = async () => {
    await api.post('/assessments', {
      type: 'pediatric-endocrinology',
      patientId, encounterId,
      data: {
        overview: { age, ageUnit, sex, weight, height, bmi: bmiCalc, chief },
        diabetes: { gate: dmGate, type: dmType, glucose, hba1c, acidosis, ketones, dka: dkaGate, ph, bicarbonate, insulin, cgm, tir, hypoglycaemiaFreq, complications: dmComplications },
        thyroid: { gate: thyGate, type: thyroidType, tsh, ft4, ft3, antibodies: thyAbAntibodies, features: thyFeatures, treatment: thyTx, nbs },
        growth: { gate: growthGate, heightSDS, velocity: heightVelocity, midParentalHeight, boneAge, ghdTest, igf1, ghDeficiency, cause: growthCause, therapy: ghTherapy },
        puberty: { gate: pubertyGate, type: pubertyType, ageOnset: pubertyAge, features: pubertyFeatures, gnrhTest, lhFsh, gnrhAnalogue },
        adrenal: { gate: adrenalGate, type: adrenalType, cortisol, acth, electrolytes, cahFeatures, hydrocortisone },
        obesity: { gate: obesityGate, bmi: bmiCalc, bmiPercentile, waistCircumference, metabolicFeatures, cause: obesityCause },
        di: { gate: diGate, type: diType, urine24h, urineOsmolality, sodium: sodiumLevel },
        neonatalEndocrine: { gate: neoGate, hypoglycaemia: neoHypoglycaemia, calcium: neoCalcium, tsh: neoTSH, cah: cahNewborn, ambiguousGenitalia },
      }
    });
    onSaved?.();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 opacity-80" />
          <div>
            <h2 className="text-xl font-bold">Pediatric Endocrinology Assessment</h2>
            <p className="text-emerald-100 text-sm">T1DM/DKA (ISPAD) · Thyroid · Growth/GHD · Puberty · CAH · Obesity (IAP) · DI · Neonatal Endocrine</p>
          </div>
        </div>
      </div>

      {(dkaAlert || adrenalCrisis) && (
        <div className="bg-red-50 border-2 border-red-600 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700">Endocrine Emergency</p>
            {dkaAlert && <p className="text-sm text-red-600">DKA — IV fluid resuscitation, insulin infusion 0.05-0.1 IU/kg/h, electrolyte monitoring, cerebral oedema watch</p>}
            {adrenalCrisis && <p className="text-sm text-red-600">Adrenal crisis — IV hydrocortisone 50-100mg/m² stat, IV dextrose-saline, monitor electrolytes</p>}
          </div>
        </div>
      )}

      {/* Overview */}
      <Section title="Patient Overview" applicable={sec.overview} onApplicable={v => sa('overview', v)} accent="emerald">
        <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
          <p className={`font-semibold ${A.amber.text}`}>India context — Paediatric endocrinology</p>
          <p className="text-gray-600 mt-1">T1DM: India has 3rd highest number of children with T1DM globally (~95,000). T2DM rapidly emerging in adolescents.
            Congenital hypothyroidism: NBS (newborn screening) available in some states; TSH &gt;20mIU/L = treat.
            Short stature: India cut-off — height &lt;3rd centile (IAP). Growth charts: ICMR IAP charts (recommended over WHO for &gt;5y).
            CAH (21-hydroxylase deficiency): most common adrenal disorder. AIIMS, Amrita, Rainbow hospitals are major centres.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Age">
            <div className="flex gap-2">
              <input type="number" value={age} onChange={e => setAge(e.target.value)} className="w-14 border rounded-lg px-2 py-1.5 text-sm" />
              <select value={ageUnit} onChange={e => setAgeUnit(e.target.value)} className="flex-1 border rounded-lg px-2 py-1.5 text-sm">
                <option>months</option><option>years</option>
              </select>
            </div>
          </FL>
          <FL label="Sex"><Pills options={['Male','Female','DSD/ambiguous']} value={sex} onChange={setSex} accent="emerald" /></FL>
          <FL label="Weight" sub="kg"><input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Height" sub="cm"><input type="number" value={height} onChange={e => setHeight(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
          <FL label="BMI (auto)"><div className="border rounded-lg px-2 py-1.5 bg-gray-50 text-sm font-semibold">{bmiCalc || '—'} kg/m²</div></FL>
        </div>
      </Section>

      {/* Diabetes */}
      <Section title="Diabetes Mellitus (ISPAD)" applicable={sec.diabetes} onApplicable={v => sa('diabetes', v)} accent="blue">
        <FL label="Diabetes present?">
          <Pills options={['Yes — T1DM','Yes — T2DM','Yes — MODY','Yes — secondary DM','No — normal']} value={dmGate} onChange={setDmGate} accent="blue" />
        </FL>
        {dmGate !== '' && dmGate !== 'No — normal' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <FL label="Blood glucose" sub="mmol/L">
                <input type="number" step="0.1" value={glucose} onChange={e => setGlucose(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
                {parseFloat(glucose) > 20 && <p className="text-red-700 text-xs font-bold mt-1">Hyperglycaemia — DKA risk</p>}
                {parseFloat(glucose) < 3.9 && glucose !== '' && <p className="text-red-700 text-xs font-bold mt-1">Hypoglycaemia — treat</p>}
              </FL>
              <FL label="HbA1c" sub="%">
                <input type="number" step="0.1" value={hba1c} onChange={e => setHba1c(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
                {parseFloat(hba1c) > 9 && <p className="text-red-700 text-xs font-bold mt-1">Poor control</p>}
              </FL>
              <FL label="Urine ketones">
                <Pills options={['Negative','Small','Moderate','Large (+++)']} value={ketones} onChange={setKetones} accent="red" />
              </FL>
            </div>
            <FL label="DKA present?">
              <Pills options={['Yes — mild (pH 7.2-7.3)','Yes — moderate (pH 7.1-7.2)','Yes — severe (pH <7.1)','No']}
                value={dkaGate} onChange={setDkaGate} accent="red" />
            </FL>
            {dkaGate !== '' && dkaGate !== 'No' && (
              <div className="grid grid-cols-2 gap-3">
                <FL label="pH"><input type="number" step="0.01" value={ph} onChange={e => setPh(e.target.value)} placeholder="7.35" className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
                <FL label="Bicarbonate" sub="mEq/L"><input type="number" value={bicarbonate} onChange={e => setBicarbonate(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <FL label="Insulin regimen">
                <Pills options={['Basal-bolus (MDI)','Insulin pump (CSII)','Premixed (twice daily)','OAD only (T2DM)','Insulin + metformin (T2DM)']}
                  value={insulin} onChange={setInsulin} accent="blue" />
              </FL>
              <FL label="CGM / Freestyle Libre">
                <Pills options={['Using — TIR >70%','Using — TIR 50-70%','Using — TIR <50%','Not using']}
                  value={cgm} onChange={setCgm} accent="blue" />
              </FL>
            </div>
            <FL label="Hypoglycaemia frequency">
              <Pills options={['None in past month','Mild (1-3/month)','Moderate (1-3/week)','Severe (requiring assistance)','Nocturnal hypoglycaemia']}
                value={hypoglycaemiaFreq} onChange={setHypoglycaemiaFreq} accent="amber" />
            </FL>
            <FL label="Complications screening (select all done/found)">
              <Pills options={['Retinopathy screening (fundus)','Nephropathy (urine ACR)','Neuropathy (vibration sense)','Thyroid disease (TPO Ab)','Celiac disease (tTG IgA)','Hypertension','Dyslipidaemia']}
                value={dmComplications} onChange={setDmComplications} accent="blue" multi />
            </FL>
          </>
        )}
      </Section>

      {/* Thyroid */}
      <Section title="Thyroid Disorders" applicable={sec.thyroid} onApplicable={v => sa('thyroid', v)} accent="teal">
        <FL label="Thyroid disorder present?">
          <Pills options={['Hypothyroidism — primary','Hypothyroidism — central','Hyperthyroidism (Graves)','Thyroiditis (Hashimoto)','Goitre only','Nodule','Congenital hypothyroidism','No']}
            value={thyGate} onChange={setThyGate} accent="teal" />
        </FL>
        {thyGate !== '' && thyGate !== 'No' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <FL label="TSH" sub="mIU/L">
                <input type="number" step="0.01" value={tsh} onChange={e => setTsh(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
                {parseFloat(tsh) > 20 && <p className="text-red-700 text-xs font-bold mt-1">Treat: overt hypothyroidism</p>}
                {parseFloat(tsh) < 0.1 && tsh !== '' && <p className="text-amber-700 text-xs font-bold mt-1">Suppressed: hyperthyroidism</p>}
              </FL>
              <FL label="Free T4" sub="pmol/L"><input type="number" step="0.1" value={ft4} onChange={e => setFt4(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
              <FL label="Free T3" sub="pmol/L"><input type="number" step="0.1" value={ft3} onChange={e => setFt3(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
            </div>
            <FL label="Thyroid antibodies">
              <Pills options={['TPO antibody (Hashimoto)','TRAb (Graves — TSH receptor)','Anti-thyroglobulin','All negative']}
                value={thyAbAntibodies} onChange={setThyAbAntibodies} accent="teal" multi />
            </FL>
            <FL label="Clinical features">
              <Pills options={['Goitre','Fatigue/sluggishness','Weight gain (hypo)','Constipation','Short stature/growth delay','Cold intolerance','Tachycardia (hyper)','Exophthalmos (Graves)','Tremor','Weight loss (hyper)']}
                value={thyFeatures} onChange={setThyFeatures} accent="teal" multi />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Treatment">
                <Pills options={['Levothyroxine (hypothyroid)','Carbimazole (Graves)','Propylthiouracil (Graves — 2nd line)','Beta-blocker (symptomatic)','Radioiodine (adolescents)','Thyroidectomy']}
                  value={thyTx} onChange={setThyTx} accent="teal" />
              </FL>
              <FL label="Newborn screening TSH (congenital)">
                <Pills options={['NBS TSH normal (<10)','NBS TSH 10-20 (borderline)','NBS TSH >20 (treat)','NBS not done','Not applicable']}
                  value={nbs} onChange={setNbs} accent="amber" />
              </FL>
            </div>
          </>
        )}
      </Section>

      {/* Growth */}
      <Section title="Short Stature & Growth Hormone Assessment" applicable={sec.growth} onApplicable={v => sa('growth', v)} accent="violet">
        <FL label="Growth concern present?">
          <Pills options={['Yes — short stature','Yes — growth deceleration','Yes — tall stature','No']} value={growthGate} onChange={setGrowthGate} accent="violet" />
        </FL>
        {growthGate !== '' && growthGate !== 'No' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <FL label="Height SDS" sub="(Z-score)">
                <input type="number" step="0.1" value={heightSDS} onChange={e => setHeightSDS(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="-2.0" />
                {parseFloat(heightSDS) < -2 && <p className="text-amber-700 text-xs font-bold mt-1">Short stature (&lt;-2 SDS)</p>}
                {parseFloat(heightSDS) < -3 && <p className="text-red-700 text-xs font-bold mt-1">Severe short stature (&lt;-3 SDS)</p>}
              </FL>
              <FL label="Height velocity" sub="cm/year">
                <input type="number" step="0.5" value={heightVelocity} onChange={e => setHeightVelocity(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
              </FL>
              <FL label="Mid-parental height" sub="cm">
                <input type="number" value={midParentalHeight} onChange={e => setMidParentalHeight(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="(father+mother±13)/2" />
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Bone age (X-ray left wrist)" sub="years">
                <input type="number" step="0.5" value={boneAge} onChange={e => setBoneAge(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
              </FL>
              <FL label="IGF-1 level" sub="ng/mL">
                <input type="number" value={igf1} onChange={e => setIgf1(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FL label="GH stimulation test result">
                <Pills options={['Peak GH >10 ng/mL (normal)','Peak GH 5-10 (partial deficiency)','Peak GH <5 ng/mL (GHD confirmed)','Not done','Failed adequate stimulation']}
                  value={ghdTest} onChange={setGhdTest} accent="violet" />
              </FL>
              <FL label="GH deficiency confirmed?">
                <Pills options={['Yes — isolated','Yes — multiple pituitary hormone deficiency','No','Not yet assessed']}
                  value={ghDeficiency} onChange={setGhDeficiency} accent="violet" />
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Cause of short stature">
                <Pills options={['Familial short stature','Constitutional delay of growth and puberty','GH deficiency','Hypothyroidism','Celiac disease','IBD','Chronic illness (renal/cardiac)','Turner syndrome','Skeletal dysplasia']}
                  value={growthCause} onChange={setGrowthCause} accent="violet" />
              </FL>
              <FL label="rhGH therapy">
                <Pills options={['Initiated','Ongoing — good response','Ongoing — poor response','Planned','Not indicated']}
                  value={ghTherapy} onChange={setGhTherapy} accent="teal" />
              </FL>
            </div>
          </>
        )}
      </Section>

      {/* Puberty */}
      <Section title="Puberty — Precocious / Delayed" applicable={sec.puberty} onApplicable={v => sa('puberty', v)} accent="pink">
        <FL label="Pubertal concern present?">
          <Pills options={['Precocious puberty (girls <8y, boys <9y)','Delayed puberty (girls >13y, boys >14y)','Normal puberty — monitoring','No concern']}
            value={pubertyGate} onChange={setPubertyGate} accent="pink" />
        </FL>
        {pubertyGate !== '' && !pubertyGate.includes('No') && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Type">
                <Pills options={['Central (GnRH-dependent)','Peripheral (GnRH-independent)','Constitutional delay','Hypogonadotrophic hypogonadism','Hypergonadotrophic hypogonadism']}
                  value={pubertyType} onChange={setPubertyType} accent="pink" />
              </FL>
              <FL label="Age of onset" sub="years">
                <input type="number" step="0.5" value={pubertyAge} onChange={e => setPubertyAge(e.target.value)} className="w-32 border rounded-lg px-2 py-1.5 text-sm" />
              </FL>
            </div>
            <FL label="Features (select all)">
              <Pills options={['Breast development (Tanner 2)','Testicular enlargement (>4mL)','Pubic/axillary hair','Menstruation','Acne/acneiform','Acelerrated linear growth','CNS pathology (precocious)','McCune-Albright syndrome features']}
                value={pubertyFeatures} onChange={setPubertyFeatures} accent="pink" multi />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="GnRH stimulation test">
                <Pills options={['LH >5 IU/L (pubertal = central)','LH <5 IU/L (pre-pubertal response)','Not done']}
                  value={gnrhTest} onChange={setGnrhTest} accent="pink" />
              </FL>
              <FL label="GnRH analogue (CPP treatment)">
                <Pills options={['Leuprolide acetate monthly','Triptorelin 3-monthly','Not started','Discontinued']}
                  value={gnrhAnalogue} onChange={setGnrhAnalogue} accent="teal" />
              </FL>
            </div>
          </>
        )}
      </Section>

      {/* Adrenal */}
      <Section title="Adrenal Disorders (CAH, AI, Cushing)" applicable={sec.adrenal} onApplicable={v => sa('adrenal', v)} accent="amber">
        <FL label="Adrenal disorder suspected?">
          <Pills options={['CAH (21-hydroxylase deficiency)','Acute adrenal crisis','Adrenal insufficiency (chronic)','Cushing syndrome/disease','Conn syndrome (hyperaldosteronism)','No']}
            value={adrenalGate} onChange={setAdrenalGate} accent="amber" />
        </FL>
        {adrenalGate !== '' && adrenalGate !== 'No' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <FL label="Cortisol (AM)" sub="nmol/L">
                <input type="number" value={cortisol} onChange={e => setCortisol(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
                {parseFloat(cortisol) < 200 && cortisol !== '' && <p className="text-amber-700 text-xs font-bold mt-1">Consider AI (&lt;200)</p>}
              </FL>
              <FL label="ACTH" sub="pg/mL">
                <input type="number" value={acth} onChange={e => setActh(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
              </FL>
              <FL label="Electrolytes (Na/K)">
                <Pills options={['Normal','Hyponatraemia','Hyperkalaemia','Both (adrenal crisis)','Hypokalaemia (Cushing)']}
                  value={electrolytes} onChange={setElectrolytes} accent="amber" />
              </FL>
            </div>
            <FL label="CAH features">
              <Pills options={['Ambiguous genitalia (female)','Salt-wasting crisis','Precocious puberty','Cliteromegaly','Labial fusion','17-OHP elevated','Elevated testosterone']}
                value={cahFeatures} onChange={setCahFeatures} accent="amber" multi />
            </FL>
            <FL label="Hydrocortisone replacement">
              <Pills options={['Yes — 10-15 mg/m²/d in 2-3 doses','Yes — fludrocortisone (salt-wasting)','Stress dosing protocol given to family','Not started']}
                value={hydrocortisone} onChange={setHydrocortisone} accent="teal" />
            </FL>
          </>
        )}
      </Section>

      {/* Obesity */}
      <Section title="Childhood Obesity (IAP Classification)" applicable={sec.obesity} onApplicable={v => sa('obesity', v)} accent="amber">
        <FL label="Obesity evaluation needed?">
          <Pills options={['Yes','No']} value={obesityGate} onChange={setObesityGate} accent="amber" />
        </FL>
        {obesityGate === 'Yes' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <FL label="BMI" sub="kg/m²"><div className="border rounded-lg px-2 py-1.5 bg-gray-50 text-sm font-semibold">{bmiCalc || '—'}</div></FL>
              <FL label="BMI percentile (IAP chart)">
                <Pills options={['<5th (underweight)','5-84th (healthy)','85-94th (overweight)','≥95th (obese)','≥99th (severe obese)']}
                  value={bmiPercentile} onChange={setBmiPercentile} accent="amber" />
              </FL>
              <FL label="Waist circumference" sub="cm">
                <input type="number" value={waistCircumference} onChange={e => setWaistCircumference(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
              </FL>
            </div>
            <FL label="Metabolic syndrome features (select all)">
              <Pills options={['Acanthosis nigricans','Hypertension','Dyslipidaemia','NAFLD/elevated transaminases','Insulin resistance (fasting glucose/HOMA-IR)','T2DM','PCOS (girls)','Sleep apnoea','Orthopaedic complications']}
                value={metabolicFeatures} onChange={setMetabolicFeatures} accent="amber" multi />
            </FL>
            <FL label="Cause">
              <Pills options={['Exogenous (dietary/lifestyle)','Hypothyroidism','Cushing syndrome','GH deficiency','Leptin deficiency','Prader-Willi syndrome','PCOS','Medications (steroids/antipsychotics)','Unknown']}
                value={obesityCause} onChange={setObesityCause} accent="amber" />
            </FL>
          </>
        )}
      </Section>

      {/* Neonatal endocrine */}
      <Section title="Neonatal Endocrine Emergencies" applicable={sec.neonatalendo} onApplicable={v => sa('neonatalendo', v)} accent="red">
        <FL label="Neonatal endocrine evaluation needed?">
          <Pills options={['Yes','No']} value={neoGate} onChange={setNeoGate} accent="red" />
        </FL>
        {neoGate === 'Yes' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Neonatal hypoglycaemia">
                <Pills options={['BG <2.6 mmol/L — treat','Persistent (Hyperinsulinism suspected)','Transient','Not present']}
                  value={neoHypoglycaemia} onChange={setNeoHypoglycaemia} accent="red" />
              </FL>
              <FL label="Neonatal calcium (Ca)">
                <Pills options={['Hypocalcaemia (<1.8 mmol/L)','Normal','Hypercalcaemia']}
                  value={neoCalcium} onChange={setNeoCalcium} accent="amber" />
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Newborn TSH screening">
                <Pills options={['Normal','Elevated (>20 mIU/L)','Very elevated (>100)','Not done']}
                  value={neoTSH} onChange={setNeoTSH} accent="teal" />
              </FL>
              <FL label="CAH newborn">
                <Pills options={['Salt-wasting crisis at 7-14d','Virilised female (46,XX)','Screening positive','Normal']}
                  value={cahNewborn} onChange={setCahNewborn} accent="amber" />
              </FL>
            </div>
            <FL label="Ambiguous genitalia / DSD (Disorders of Sex Development)">
              <Pills options={['Present — urgent karyotype + 17-OHP','46,XX DSD confirmed (CAH)','46,XY DSD','Chromosomal DSD','Not present']}
                value={ambiguousGenitalia} onChange={setAmbiguousGenitalia} accent="violet" />
            </FL>
          </>
        )}
      </Section>

      <button type="button" onClick={handleSave}
        className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg transition-all">
        Save Endocrinology Assessment
      </button>
    </div>
  );
}
