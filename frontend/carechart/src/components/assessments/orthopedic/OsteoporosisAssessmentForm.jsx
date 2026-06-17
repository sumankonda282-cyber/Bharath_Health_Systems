/** @shared-pool */
import React, { useState, useMemo } from 'react';
import api from '../../../api/client';

// ─── Shared UI ────────────────────────────────────────────────────────────────
const CM = { sky: 'bg-sky-100 text-sky-800 border-sky-300 data-[sel=true]:bg-sky-500 data-[sel=true]:text-white data-[sel=true]:border-sky-500', red: 'bg-red-100 text-red-800 border-red-300 data-[sel=true]:bg-red-500 data-[sel=true]:text-white data-[sel=true]:border-red-500', orange: 'bg-orange-100 text-orange-800 border-orange-300 data-[sel=true]:bg-orange-500 data-[sel=true]:text-white data-[sel=true]:border-orange-500', blue: 'bg-blue-100 text-blue-800 border-blue-300 data-[sel=true]:bg-blue-500 data-[sel=true]:text-white data-[sel=true]:border-blue-500', green: 'bg-green-100 text-green-800 border-green-300 data-[sel=true]:bg-green-500 data-[sel=true]:text-white data-[sel=true]:border-green-500', gray: 'bg-gray-100 text-gray-700 border-gray-300 data-[sel=true]:bg-gray-500 data-[sel=true]:text-white data-[sel=true]:border-gray-500', yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300 data-[sel=true]:bg-yellow-500 data-[sel=true]:text-white data-[sel=true]:border-yellow-500' };
function Pills({ label, options, value, onChange, multi = false, color = 'sky' }) {
  const cls = CM[color] || CM.sky;
  const isSel = (v) => multi ? (Array.isArray(value) ? value.includes(v) : false) : value === v;
  const click = (v) => { if (multi) { const a = Array.isArray(value) ? value : []; onChange(a.includes(v) ? a.filter(x => x !== v) : [...a, v]); } else onChange(value === v ? '' : v); };
  return (<div className="mb-3">{label && <div className="text-xs font-medium text-gray-600 mb-1">{label}</div>}<div className="flex flex-wrap gap-1.5">{options.map(opt => { const [v, l] = Array.isArray(opt) ? opt : [opt, opt]; return <button key={v} type="button" data-sel={isSel(v)} onClick={() => click(v)} className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${cls}`}>{l}</button>; })}</div></div>);
}
function FL({ label, sub, children }) { return <div className="mb-3"><label className="block text-xs font-medium text-gray-600 mb-1">{label}{sub && <span className="text-gray-400 font-normal ml-1">{sub}</span>}</label>{children}</div>; }
function Gate({ question, value, onChange, children }) {
  return (<div><div className="flex items-center gap-3 mb-3"><span className="text-sm font-medium text-gray-700">{question}</span>{['yes','no'].map(v => <button key={v} type="button" onClick={() => onChange(value === v ? null : v)} className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${value === v ? v === 'yes' ? 'bg-sky-500 text-white border-sky-500' : 'bg-gray-400 text-white border-gray-400' : 'bg-white text-gray-600 border-gray-300 hover:border-sky-400'}`}>{v === 'yes' ? 'Yes' : 'No'}</button>)}</div>{value === 'yes' && <div className="border-l-2 border-sky-300 pl-3">{children}</div>}{value === 'no' && <div className="flex items-center gap-2 text-xs text-gray-400 italic py-1"><span>🔒</span><span>Not applicable — section locked</span></div>}</div>);
}
function Inp({ value, onChange, type = 'text', placeholder = '' }) { return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"/>; }

export default function OsteoporosisAssessmentForm({ patientId, encounterId }) {
  const [basicInfo, setBasicInfo] = useState({ sex: '', age: '', menopause: '', amenorrhoea: '', chiefComplaint: '' });
  const [riskFactors, setRiskFactors] = useState({ applicable: null, factors: [], secondaryCauses: [] });
  const [dexaData, setDexaData] = useState({ applicable: null, done: '', tScoreLs: '', tScoreFn: '', tScoreTh: '', zScore: '', interpretation: '' });
  const [fraxData, setFraxData] = useState({ applicable: null, age: '', bmi: '', prevFx: '', parentHipFx: '', currentSmoker: '', glucocorticoids: '', rheumatoidArthritis: '', secondaryOsteoporosis: '', alcohol3plus: '', femNeckBmd: '', major10yr: '', hip10yr: '' });
  const [fracture, setFracture] = useState({ applicable: null, site: '', mechanism: '', vertebralFx: '', multipleFx: '' });
  const [fallsRisk, setFallsRisk] = useState({ applicable: null, fallsPastYear: '', tug: '', gait: '', orthostaticHypo: '', visualImpairment: '', medications: [] });
  const [biochem, setBiochem] = useState({ applicable: null, calcium: '', vitD: '', pth: '', phosphate: '', creatinine: '', alk_phos: '', tsh: '', testosterone: '' });
  const [managementData, setManagementData] = useState({ applicable: null, calciumVitD: '', bisphosphonate: '', denosumab: '', teriparatide: '', serm: '', fallsPrevention: [], monitoring: '', followUp: '', notes: '' });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── DEXA interpretation ───────────────────────────────────────────────────────
  const dexaInterp = useMemo(() => {
    const t = parseFloat(dexaData.tScoreFn) || parseFloat(dexaData.tScoreLs);
    if (!t) return null;
    if (t <= -2.5) return { label: 'Osteoporosis', color: 'text-red-600', bg: 'bg-red-50 border-red-300' };
    if (t < -1.0) return { label: 'Osteopenia', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-300' };
    return { label: 'Normal BMD', color: 'text-green-600', bg: 'bg-green-50 border-green-300' };
  }, [dexaData]);

  // ── FRAX interpretation ────────────────────────────────────────────────────────
  const fraxInterp = useMemo(() => {
    const major = parseFloat(fraxData.major10yr);
    const hip = parseFloat(fraxData.hip10yr);
    if (!major && !hip) return null;
    const treatMajor = major >= 20;
    const treatHip = hip >= 3;
    return { major, hip, recommend: treatMajor || treatHip ? 'Treatment recommended' : 'Monitor/reassess', color: (treatMajor || treatHip) ? 'text-red-600' : 'text-green-600' };
  }, [fraxData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/assessments', { type: 'osteoporosis', patientId, encounterId, data: { basicInfo, riskFactors, dexaData, dexaInterp, fraxData, fraxInterp, fracture, fallsRisk, biochem, managementData } });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const secCls = 'bg-white rounded-xl border border-sky-100 shadow-sm p-4 mb-4';
  const h2Cls = 'text-sm font-semibold text-sky-800 mb-3 flex items-center gap-2';

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-50 p-4">
      <div className="bg-gradient-to-r from-sky-600 to-blue-600 rounded-xl p-4 mb-4 text-white shadow">
        <h1 className="text-lg font-bold">Osteoporosis Assessment</h1>
        <p className="text-sky-100 text-xs mt-0.5">DEXA · FRAX Score · Falls Risk · Biochemistry · Bisphosphonate Therapy</p>
      </div>

      {/* Basic Info */}
      <div className={secCls}>
        <h2 className={h2Cls}>📋 Patient Details</h2>
        <div className="grid grid-cols-2 gap-3">
          <Pills label="Sex" options={[['female','Female'],['male','Male']]} value={basicInfo.sex} onChange={v => setBasicInfo(p => ({...p, sex: v}))}/>
          <FL label="Age (years)"><Inp type="number" value={basicInfo.age} onChange={v => setBasicInfo(p => ({...p, age: v}))} placeholder="years"/></FL>
        </div>
        {basicInfo.sex === 'female' && <Pills label="Menopausal Status" options={[['premenopausal','Premenopausal'],['perimenopausal','Perimenopausal'],['postmenopausal','Postmenopausal'],['surgical_menopause','Surgical menopause']]} value={basicInfo.menopause} onChange={v => setBasicInfo(p => ({...p, menopause: v}))}/>}
        <FL label="Chief Complaint"><Inp value={basicInfo.chiefComplaint} onChange={v => setBasicInfo(p => ({...p, chiefComplaint: v}))} placeholder="e.g. fragility fracture, back pain, height loss, incidental finding"/></FL>
      </div>

      {/* Risk Factors */}
      <div className={secCls}>
        <h2 className={h2Cls}>⚠️ Risk Factors</h2>
        <Gate question="Is risk factor assessment applicable?" value={riskFactors.applicable} onChange={v => setRiskFactors(p => ({...p, applicable: v}))}>
          <Pills label="Clinical Risk Factors" multi options={[['age_gt65','Age ≥65 (female) or ≥70 (male)'],['low_bmi','Low BMI (<19 kg/m²)'],['prev_fragility_fx','Prior fragility fracture'],['parent_hip_fx','Parent hip fracture'],['smoking','Current smoker'],['alcohol','Alcohol ≥3 units/day'],['steroid_gt5','Oral steroids >5mg/day ≥3m'],['rheumatoid','Rheumatoid arthritis'],['early_menopause','Early menopause (<45y)'],['prolonged_amenorrhoea','Prolonged amenorrhoea'],['immobility','Prolonged immobility'],['low_calcium_diet','Low calcium diet'],['low_vitd','Low vitamin D / limited sunlight']]} value={riskFactors.factors} onChange={v => setRiskFactors(p => ({...p, factors: v}))} color="sky"/>
          <Pills label="Secondary Causes" multi options={[['primary_hypogonadism','Primary hypogonadism'],['hyperthyroidism','Hyperthyroidism'],['hyperparathyroidism','Hyperparathyroidism'],['malabsorption','Malabsorption (coeliac, IBD)'],['ckd','CKD'],['t1dm','Type 1 diabetes'],['anorexia','Anorexia nervosa'],['myeloma','Myeloma'],['chemotherapy','Chemotherapy/aromatase inhibitor']]} value={riskFactors.secondaryCauses} onChange={v => setRiskFactors(p => ({...p, secondaryCauses: v}))} color="orange"/>
          <div className="text-xs text-sky-600 bg-sky-50 rounded p-2 mt-1">India context: Vitamin D deficiency extremely prevalent (>70% in adults). Calcium intake typically half of recommended. Low BMI common. Dark skin + indoor lifestyle = low D3 synthesis.</div>
        </Gate>
      </div>

      {/* DEXA */}
      <div className={secCls}>
        <h2 className={h2Cls}>🩻 DEXA Scan Results</h2>
        <Gate question="Is DEXA scan assessment applicable?" value={dexaData.applicable} onChange={v => setDexaData(p => ({...p, applicable: v}))}>
          <Pills label="DEXA Done?" options={[['yes','Yes'],['no','No — not done'],['pending','Pending']]} value={dexaData.done} onChange={v => setDexaData(p => ({...p, done: v}))} color="blue"/>
          {dexaData.done === 'yes' && <>
            {dexaInterp && (
              <div className={`rounded-lg p-3 mb-3 border ${dexaInterp.bg}`}>
                <div className={`text-lg font-bold ${dexaInterp.color}`}>{dexaInterp.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">T-score: normal ≥−1.0 | osteopenia −1.0 to −2.5 | osteoporosis ≤−2.5</div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <FL label="T-score — Lumbar spine"><Inp type="number" value={dexaData.tScoreLs} onChange={v => setDexaData(p => ({...p, tScoreLs: v}))} placeholder="e.g. -2.8"/></FL>
              <FL label="T-score — Femoral neck"><Inp type="number" value={dexaData.tScoreFn} onChange={v => setDexaData(p => ({...p, tScoreFn: v}))} placeholder="e.g. -2.1"/></FL>
              <FL label="T-score — Total hip"><Inp type="number" value={dexaData.tScoreTh} onChange={v => setDexaData(p => ({...p, tScoreTh: v}))} placeholder="e.g. -1.8"/></FL>
            </div>
            <FL label="Z-score" sub="for pre-menopausal/men <50y"><Inp type="number" value={dexaData.zScore} onChange={v => setDexaData(p => ({...p, zScore: v}))} placeholder="e.g. -1.5"/></FL>
            {dexaData.zScore !== '' && parseFloat(dexaData.zScore) < -2 && <div className="text-xs text-red-600 font-semibold mb-2">⚠ Z-score &lt;−2 — secondary osteoporosis should be investigated.</div>}
          </>}
        </Gate>
      </div>

      {/* FRAX */}
      <div className={secCls}>
        <h2 className={h2Cls}>📊 FRAX 10-Year Fracture Risk</h2>
        <Gate question="Is FRAX assessment applicable?" value={fraxData.applicable} onChange={v => setFraxData(p => ({...p, applicable: v}))}>
          <div className="text-xs text-gray-500 mb-2">Enter FRAX result from <span className="font-medium">frax.shef.ac.uk</span> (India model available)</div>
          {fraxInterp && (
            <div className={`rounded-lg p-3 mb-3 border ${fraxInterp.recommend.includes('recommended') ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
              <div className={`text-sm font-bold ${fraxInterp.color}`}>{fraxInterp.recommend}</div>
              <div className="text-xs text-gray-600 mt-1">
                Major osteoporotic fracture: <span className="font-semibold">{fraxInterp.major}%</span> (treat if ≥20%) &nbsp;|&nbsp; Hip fracture: <span className="font-semibold">{fraxInterp.hip}%</span> (treat if ≥3%)
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <FL label="10-yr Major Osteoporotic Fx Risk (%)"><Inp type="number" value={fraxData.major10yr} onChange={v => setFraxData(p => ({...p, major10yr: v}))} placeholder="%"/></FL>
            <FL label="10-yr Hip Fracture Risk (%)"><Inp type="number" value={fraxData.hip10yr} onChange={v => setFraxData(p => ({...p, hip10yr: v}))} placeholder="%"/></FL>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FL label="BMD (femoral neck g/cm²)" sub="optional"><Inp type="number" value={fraxData.femNeckBmd} onChange={v => setFraxData(p => ({...p, femNeckBmd: v}))} placeholder="g/cm²"/></FL>
            <FL label="BMI (kg/m²)"><Inp type="number" value={fraxData.bmi} onChange={v => setFraxData(p => ({...p, bmi: v}))} placeholder="kg/m²"/></FL>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[['prevFx','Previous fragility fracture'],['parentHipFx','Parent hip fracture'],['currentSmoker','Current smoker'],['glucocorticoids','Oral steroids ≥3m'],['rheumatoidArthritis','Rheumatoid arthritis'],['secondaryOsteoporosis','Secondary osteoporosis'],['alcohol3plus','Alcohol ≥3 units/day']].map(([k, lbl]) => (
              <Pills key={k} label={lbl} options={[['yes','Yes'],['no','No']]} value={fraxData[k]} onChange={v => setFraxData(p => ({...p, [k]: v}))} color={fraxData[k] === 'yes' ? 'orange' : 'gray'}/>
            ))}
          </div>
        </Gate>
      </div>

      {/* Fragility Fracture */}
      <div className={secCls}>
        <h2 className={h2Cls}>🦴 Fragility Fracture History</h2>
        <Gate question="Is fragility fracture assessment applicable?" value={fracture.applicable} onChange={v => setFracture(p => ({...p, applicable: v}))}>
          <Pills label="Fracture Site" options={[['wrist','Wrist (Colles)'],['spine','Vertebral (compression)'],['hip','Hip'],['humerus','Humerus'],['pelvis','Pelvis'],['multiple','Multiple sites']]} value={fracture.site} onChange={v => setFracture(p => ({...p, site: v}))} color="orange"/>
          <Pills label="Mechanism" options={[['minimal_trauma','Minimal trauma (ground-level fall)'],['spontaneous','Spontaneous/no trauma'],['high_energy','High energy (not fragility)']]} value={fracture.mechanism} onChange={v => setFracture(p => ({...p, mechanism: v}))} color={fracture.mechanism === 'spontaneous' ? 'red' : 'sky'}/>
          <Pills label="Vertebral Fractures (radiological)" options={[['none','None confirmed'],['one','1 vertebra'],['two_plus','2+ vertebrae (severe)']]} value={fracture.vertebralFx} onChange={v => setFracture(p => ({...p, vertebralFx: v}))} color={fracture.vertebralFx === 'two_plus' ? 'red' : 'sky'}/>
          {fracture.vertebralFx === 'two_plus' && <div className="text-xs text-red-600 font-semibold mb-2">⚠ Multiple vertebral fractures — severe osteoporosis. Consider teriparatide/romosozumab if eligible.</div>}
        </Gate>
      </div>

      {/* Falls Risk */}
      <div className={secCls}>
        <h2 className={h2Cls}>🚶 Falls Risk Assessment</h2>
        <Gate question="Is falls risk assessment applicable?" value={fallsRisk.applicable} onChange={v => setFallsRisk(p => ({...p, applicable: v}))}>
          <Pills label="Falls in past 12 months" options={[['none','None'],['one','1 fall'],['two_plus','≥2 falls (high risk)']]} value={fallsRisk.fallsPastYear} onChange={v => setFallsRisk(p => ({...p, fallsPastYear: v}))} color={fallsRisk.fallsPastYear === 'two_plus' ? 'red' : 'sky'}/>
          <FL label="Timed Up and Go (TUG)" sub="≥12s = increased falls risk"><Inp type="number" value={fallsRisk.tug} onChange={v => setFallsRisk(p => ({...p, tug: v}))} placeholder="seconds"/></FL>
          {parseFloat(fallsRisk.tug) >= 12 && <div className="text-xs text-orange-600 font-semibold mb-2">⚠ TUG ≥12s — increased falls risk. Refer for falls prevention programme.</div>}
          <Pills label="Gait Assessment" options={[['normal','Normal'],['unsteady','Unsteady'],['walking_aid','Requires walking aid']]} value={fallsRisk.gait} onChange={v => setFallsRisk(p => ({...p, gait: v}))} color={fallsRisk.gait === 'unsteady' ? 'orange' : 'sky'}/>
          <Pills label="Orthostatic Hypotension" options={[['no','No'],['yes','Yes (≥20 mmHg SBP drop)']]} value={fallsRisk.orthostaticHypo} onChange={v => setFallsRisk(p => ({...p, orthostaticHypo: v}))} color={fallsRisk.orthostaticHypo === 'yes' ? 'red' : 'gray'}/>
          <Pills label="High-risk Medications" multi options={[['benzodiazepines','Benzodiazepines'],['antidepressants','Antidepressants'],['antihypertensives','Antihypertensives (too many)'],['opioids','Opioids'],['diuretics','Diuretics'],['antipsychotics','Antipsychotics']]} value={fallsRisk.medications} onChange={v => setFallsRisk(p => ({...p, medications: v}))} color="orange"/>
        </Gate>
      </div>

      {/* Biochemistry */}
      <div className={secCls}>
        <h2 className={h2Cls}>🧪 Biochemistry</h2>
        <Gate question="Is biochemistry assessment applicable?" value={biochem.applicable} onChange={v => setBiochem(p => ({...p, applicable: v}))}>
          <div className="grid grid-cols-3 gap-2">
            {[['calcium','Serum calcium (mmol/L)'],['vitD','25-OH Vitamin D (nmol/L)'],['pth','PTH (pmol/L)'],['phosphate','Phosphate (mmol/L)'],['creatinine','Creatinine (µmol/L)'],['alk_phos','ALP (U/L)'],['tsh','TSH (mIU/L)'],['testosterone','Testosterone (men, nmol/L)']].map(([k, lbl]) => (
              <FL key={k} label={lbl}><Inp type="number" value={biochem[k]} onChange={v => setBiochem(p => ({...p, [k]: v}))} placeholder="value"/></FL>
            ))}
          </div>
          {parseFloat(biochem.vitD) < 50 && biochem.vitD !== '' && <div className="text-xs text-orange-600 font-semibold mt-1">⚠ Vitamin D deficiency (&lt;50 nmol/L) — replete before starting bisphosphonate to avoid hypocalcaemia.</div>}
        </Gate>
      </div>

      {/* Management */}
      <div className={secCls}>
        <h2 className={h2Cls}>💊 Management Plan</h2>
        <Gate question="Is management plan applicable?" value={managementData.applicable} onChange={v => setManagementData(p => ({...p, applicable: v}))}>
          <FL label="Calcium + Vitamin D Supplementation"><Inp value={managementData.calciumVitD} onChange={v => setManagementData(p => ({...p, calciumVitD: v}))} placeholder="e.g. Ca 1000mg + Vit D3 800IU daily. Replete D first if severe deficiency."/></FL>
          <Pills label="Bisphosphonate" options={[['none','None'],['alendronate','Alendronate 70mg weekly (1st line)'],['risedronate','Risedronate 35mg weekly'],['zoledronate','Zoledronate 5mg IV annual (can't take oral)'],['ibandronate','Ibandronate 150mg monthly']]} value={managementData.bisphosphonate} onChange={v => setManagementData(p => ({...p, bisphosphonate: v}))} color="sky"/>
          <Pills label="Other Agents" options={[['none','None'],['denosumab','Denosumab 60mg SC 6-monthly'],['teriparatide','Teriparatide (severe/recurrent — PTH analog)'],['romosozumab','Romosozumab (high risk)'],['raloxifene','Raloxifene (SERM — postmenopausal)'],['hrt','HRT (early menopause, short-term)']]} value={managementData.denosumab} onChange={v => setManagementData(p => ({...p, denosumab: v}))} color="blue"/>
          {managementData.bisphosphonate && managementData.bisphosphonate !== 'none' && <div className="text-xs text-sky-600 bg-sky-50 rounded p-2 mb-2">Bisphosphonate monitoring: dental review before IV; drug holiday after 5y (oral) or 3y (IV) depending on ongoing fracture risk; MRONJ risk (dental procedures).</div>}
          <Pills label="Falls Prevention Programme" multi options={[['balance_exercise','Balance/strengthening exercise'],['home_hazard','Home hazard assessment'],['medication_review','Medication review'],['vision_correction','Vision correction'],['hip_protectors','Hip protectors'],['footwear','Appropriate footwear']]} value={managementData.fallsPrevention} onChange={v => setManagementData(p => ({...p, fallsPrevention: v}))} color="green"/>
          <FL label="Monitoring Plan"><Inp value={managementData.monitoring} onChange={v => setManagementData(p => ({...p, monitoring: v}))} placeholder="Repeat DEXA 2 years, annual biochemistry, adherence review"/></FL>
          <FL label="Follow-up"><Inp value={managementData.followUp} onChange={v => setManagementData(p => ({...p, followUp: v}))} placeholder="e.g. 3 months (D repletion check), 12 months (DEXA interval)"/></FL>
          <FL label="Notes"><textarea value={managementData.notes} onChange={e => setManagementData(p => ({...p, notes: e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-14 focus:outline-none focus:ring-2 focus:ring-sky-400"/></FL>
        </Gate>
      </div>

      <div className="flex justify-end mt-2">
        <button type="button" onClick={handleSave} disabled={saving}
          className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-xl font-semibold text-sm shadow hover:from-sky-600 hover:to-blue-600 disabled:opacity-60 transition-all">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Assessment'}
        </button>
      </div>
    </div>
  );
}
