/**
 * @shared-pool
 * PediatricNephrologyForm — Pediatric Nephrology Assessment
 * Nephrotic syndrome (ISKDC), UTI (NICE criteria), AKI in children (pRIFLE/KDIGO),
 * haematuria workup, hypertension staging (AAP 2017), chronic kidney disease,
 * vesicoureteric reflux (VUR grading), posterior urethral valves, CAKUT,
 * renal tubular disorders, HUS, nephrolithiasis
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useMemo } from 'react';
import { Lock, AlertTriangle, Droplets } from 'lucide-react';
import api from '../../../api/client';

const A = {
  blue:   { bg:'bg-blue-50',    border:'border-blue-300',    text:'text-blue-700',
            pill:'bg-blue-100 border-blue-400 text-blue-800',
            active:'bg-blue-600 text-white border-blue-600' },
  cyan:   { bg:'bg-cyan-50',    border:'border-cyan-300',    text:'text-cyan-700',
            pill:'bg-cyan-100 border-cyan-400 text-cyan-800',
            active:'bg-cyan-600 text-white border-cyan-600' },
  red:    { bg:'bg-red-50',     border:'border-red-300',     text:'text-red-700',
            pill:'bg-red-100 border-red-400 text-red-800',
            active:'bg-red-600 text-white border-red-600' },
  amber:  { bg:'bg-amber-50',   border:'border-amber-300',   text:'text-amber-700',
            pill:'bg-amber-100 border-amber-400 text-amber-800',
            active:'bg-amber-600 text-white border-amber-600' },
  teal:   { bg:'bg-teal-50',    border:'border-teal-300',    text:'text-teal-700',
            pill:'bg-teal-100 border-teal-400 text-teal-800',
            active:'bg-teal-600 text-white border-teal-600' },
  violet: { bg:'bg-violet-50',  border:'border-violet-300',  text:'text-violet-700',
            pill:'bg-violet-100 border-violet-400 text-violet-800',
            active:'bg-violet-600 text-white border-violet-600' },
  emerald:{ bg:'bg-emerald-50', border:'border-emerald-300', text:'text-emerald-700',
            pill:'bg-emerald-100 border-emerald-400 text-emerald-800',
            active:'bg-emerald-600 text-white border-emerald-600' },
};

function Pills({ options, value, onChange, accent = 'blue', multi = false }) {
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

function Section({ title, applicable, onApplicable, accent = 'blue', children }) {
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

export default function PediatricNephrologyForm({ patientId, encounterId, onSaved }) {
  const [sec, setSec] = useState({
    overview: 'Applicable', nephrotic: 'Applicable', uti: 'Applicable',
    aki: 'Applicable', haematuria: 'Applicable', htn: 'Applicable',
    ckd: 'Applicable', cakut: 'Applicable', hus: 'Applicable',
    tubular: 'Applicable', stones: 'Applicable',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  // Overview
  const [age, setAge] = useState('');
  const [ageUnit, setAgeUnit] = useState('years');
  const [sex, setSex] = useState('');
  const [weight, setWeight] = useState('');
  const [chief, setChief] = useState([]);

  // Nephrotic syndrome
  const [nsGate, setNsGate] = useState('');
  const [oedema, setOedema] = useState('');
  const [albumin, setAlbumin] = useState('');
  const [urineProtein, setUrineProtein] = useState('');
  const [pcrRatio, setPcrRatio] = useState('');
  const [cholesterol, setCholesterol] = useState('');
  const [nsType, setNsType] = useState('');
  const [biopsyDone, setBiopsyDone] = useState('');
  const [biopsyResult, setBiopsyResult] = useState('');
  const [steroidResponse, setSteroidResponse] = useState('');
  const [steroidTx, setSteroidTx] = useState('');

  // UTI
  const [utiGate, setUtiGate] = useState('');
  const [utiSymptoms, setUtiSymptoms] = useState([]);
  const [utiType, setUtiType] = useState('');
  const [urineMcs, setUrineMcs] = useState('');
  const [utiOrganism, setUtiOrganism] = useState('');
  const [vurGate, setVurGate] = useState('');
  const [vurGrade, setVurGrade] = useState('');
  const [renalScar, setRenalScar] = useState('');
  const [mCUG, setMCUG] = useState('');
  const [utiAbx, setUtiAbx] = useState('');
  const [prophylaxis, setProphylaxis] = useState('');

  // AKI
  const [akiGate, setAkiGate] = useState('');
  const [prifle, setPrifle] = useState('');
  const [akiCause, setAkiCause] = useState('');
  const [creatinine, setCreatinine] = useState('');
  const [creatinineBase, setCreatinineBase] = useState('');
  const [urine_output, setUrineOutput] = useState('');
  const [akiFeatures, setAkiFeatures] = useState([]);
  const [kdrt, setKdrt] = useState('');

  // Haematuria
  const [haemGate, setHaemGate] = useState('');
  const [haemType, setHaemType] = useState('');
  const [haemFeatures, setHaemFeatures] = useState([]);
  const [rbc, setRbc] = useState('');
  const [rbcMorphology, setRbcMorphology] = useState('');
  const [haemCause, setHaemCause] = useState('');

  // Hypertension
  const [htnGate, setHtnGate] = useState('');
  const [sbp, setSbp] = useState('');
  const [dbp, setDbp] = useState('');
  const [htnStage, setHtnStage] = useState('');
  const [htnCause, setHtnCause] = useState('');
  const [htnTx, setHtnTx] = useState('');
  const [organDamage, setOrganDamage] = useState([]);

  // CKD
  const [ckdGate, setCkdGate] = useState('');
  const [gfr, setGfr] = useState('');
  const [ckdStage, setCkdStage] = useState('');
  const [ckdCause, setCkdCause] = useState('');
  const [ckdComp, setCkdComp] = useState([]);
  const [dialysis, setDialysis] = useState('');

  // CAKUT
  const [cakutGate, setCakutGate] = useState('');
  const [cakutType, setCakutType] = useState([]);
  const [puvGate, setPuvGate] = useState('');

  // HUS
  const [husGate, setHusGate] = useState('');
  const [husTriad, setHusTriad] = useState([]);
  const [husEtiology, setHusEtiology] = useState('');
  const [husDialysis, setHusDialysis] = useState('');
  const [eculizumab, setEculizumab] = useState('');

  // Tubular
  const [tubGate, setTubGate] = useState('');
  const [tubType, setTubType] = useState('');
  const [tubFeatures, setTubFeatures] = useState([]);

  // Stones
  const [stoneGate, setStoneGate] = useState('');
  const [stoneType, setStoneType] = useState('');
  const [stoneFeatures, setStoneFeatures] = useState([]);
  const [stoneSize, setStoneSize] = useState('');

  // AKI pRIFLE auto classification
  const akiRifle = useMemo(() => {
    const curr = parseFloat(creatinine);
    const base = parseFloat(creatinineBase);
    if (!curr || !base) return null;
    const ratio = curr / base;
    const uo = parseFloat(urine_output);
    if (ratio >= 3 || uo < 0.3) return 'Failure';
    if (ratio >= 2 || (uo < 0.5 && uo >= 0.3)) return 'Injury';
    if (ratio >= 1.5) return 'Risk';
    return 'No AKI';
  }, [creatinine, creatinineBase, urine_output]);

  const htnAlert = parseFloat(dbp) > 110 || (htnStage === 'Hypertensive crisis');
  const akiAlert = prifle === 'Failure (F)' || akiRifle === 'Failure';
  const husAlert = husGate === 'Yes' && husDialysis === 'Yes';

  const handleSave = async () => {
    await api.post('/assessments', {
      type: 'pediatric-nephrology',
      patientId, encounterId,
      data: {
        overview: { age, ageUnit, sex, weight, chief },
        nephrotic: { gate: nsGate, oedema, albumin, urineProtein, pcrRatio, cholesterol, type: nsType, biopsy: biopsyDone, biopsyResult, steroidResponse, treatment: steroidTx },
        uti: { gate: utiGate, symptoms: utiSymptoms, type: utiType, mcs: urineMcs, organism: utiOrganism, vur: { gate: vurGate, grade: vurGrade }, renalScar, mcug: mCUG, antibiotics: utiAbx, prophylaxis },
        aki: { gate: akiGate, prifle, derivedRifle: akiRifle, cause: akiCause, creatinine, creatinineBaseline: creatinineBase, urineOutput: urine_output, features: akiFeatures, rrt: kdrt },
        haematuria: { gate: haemGate, type: haemType, features: haemFeatures, rbc, morphology: rbcMorphology, cause: haemCause },
        hypertension: { gate: htnGate, sbp, dbp, stage: htnStage, cause: htnCause, treatment: htnTx, organDamage },
        ckd: { gate: ckdGate, gfr, stage: ckdStage, cause: ckdCause, complications: ckdComp, dialysis },
        cakut: { gate: cakutGate, types: cakutType, puvGate },
        hus: { gate: husGate, triad: husTriad, etiology: husEtiology, dialysis: husDialysis, eculizumab },
        tubular: { gate: tubGate, type: tubType, features: tubFeatures },
        stones: { gate: stoneGate, type: stoneType, features: stoneFeatures, size: stoneSize },
      }
    });
    onSaved?.();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <Droplets className="w-8 h-8 opacity-80" />
          <div>
            <h2 className="text-xl font-bold">Pediatric Nephrology Assessment</h2>
            <p className="text-blue-100 text-sm">Nephrotic Syndrome (ISKDC) · UTI/VUR · AKI pRIFLE · Haematuria · HTN (AAP 2017) · CKD · HUS · CAKUT</p>
          </div>
        </div>
      </div>

      {(htnAlert || akiAlert || husAlert) && (
        <div className="bg-red-50 border-2 border-red-600 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700">Renal Emergency</p>
            {htnAlert && <p className="text-sm text-red-600">Hypertensive urgency/emergency — IV labetalol/nicardipine, target 25% reduction over 6-8h</p>}
            {akiAlert && <p className="text-sm text-red-600">AKI Failure stage — RRT consideration, nephrology urgent referral</p>}
            {husAlert && <p className="text-sm text-red-600">HUS with dialysis — atypical HUS consider eculizumab, PICU level care</p>}
          </div>
        </div>
      )}

      {/* Overview */}
      <Section title="Patient Overview" applicable={sec.overview} onApplicable={v => sa('overview', v)} accent="blue">
        <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
          <p className={`font-semibold ${A.amber.text}`}>India context — Paediatric nephrology</p>
          <p className="text-gray-600 mt-1">Nephrotic syndrome: India has one of the highest incidences globally. Steroid-sensitive NS (SSNS) responds in 80%.
            UTI: 2nd most common bacterial infection in children after URTI. CAKUT most common structural cause of CKD in children.
            HUS: E. coli O157:H7 (typical) + atypical HUS (CFH/CFI mutations). IgA nephropathy: most common GN globally.
            AIIMS, CMC Vellore, KIMS are major paediatric nephrology centres.</p>
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
          <FL label="Sex"><Pills options={['Male','Female']} value={sex} onChange={setSex} accent="blue" /></FL>
          <FL label="Weight" sub="kg"><input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
        </div>
        <FL label="Chief complaint">
          <Pills options={['Oedema/swelling','Haematuria','Reduced urine output','Frequent UTI','Hypertension','Proteinuria (incidental)','Renal failure','Abdominal pain/stones']}
            value={chief} onChange={setChief} accent="blue" multi />
        </FL>
      </Section>

      {/* Nephrotic Syndrome */}
      <Section title="Nephrotic Syndrome (ISKDC)" applicable={sec.nephrotic} onApplicable={v => sa('nephrotic', v)} accent="blue">
        <FL label="Nephrotic syndrome present?">
          <Pills options={['Yes — first episode','Yes — relapse','Yes — frequent relapse (≥2 in 6m)','No','Proteinuria only']}
            value={nsGate} onChange={setNsGate} accent="blue" />
        </FL>
        {nsGate !== '' && nsGate !== 'No' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <FL label="Serum albumin" sub="g/dL">
                <input type="number" step="0.1" value={albumin} onChange={e => setAlbumin(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
                {parseFloat(albumin) < 2.5 && albumin && <p className="text-red-700 text-xs font-bold mt-1">Nephrotic range &lt;2.5</p>}
              </FL>
              <FL label="PCR (protein:creatinine ratio)" sub="mg/mg">
                <input type="number" step="0.1" value={pcrRatio} onChange={e => setPcrRatio(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
                {parseFloat(pcrRatio) > 200 && pcrRatio && <p className="text-red-700 text-xs font-bold mt-1">Nephrotic (&gt;200)</p>}
              </FL>
              <FL label="Cholesterol" sub="mg/dL">
                <input type="number" value={cholesterol} onChange={e => setCholesterol(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
              </FL>
            </div>
            <FL label="Oedema extent">
              <Pills options={['Periorbital only','Facial + ankle','Ascites','Pleural effusion','Anasarca (severe)']}
                value={oedema} onChange={setOedema} accent="blue" />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="NS type">
                <Pills options={['Steroid-sensitive (SSNS)','Steroid-dependent (SDNS)','Frequently relapsing (FRNS)','Steroid-resistant (SRNS)','Congenital NS (onset <3m)']}
                  value={nsType} onChange={setNsType} accent="blue" />
              </FL>
              <FL label="Steroid response">
                <Pills options={['Complete remission (urine protein trace/nil)','Partial remission','No response at 8 weeks','Not yet assessed']}
                  value={steroidResponse} onChange={setSteroidResponse} accent="teal" />
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Biopsy done?">
                <Pills options={['Yes','No','Planned']} value={biopsyDone} onChange={setBiopsyDone} accent="violet" />
              </FL>
              <FL label="Biopsy result">
                <Pills options={['Minimal change disease (MCD)','Focal segmental glomerulosclerosis (FSGS)','Membranous nephropathy','Mesangial proliferative GN','C3 GN','IgA nephropathy','Normal']}
                  value={biopsyResult} onChange={setBiopsyResult} accent="violet" />
              </FL>
            </div>
            <FL label="Treatment">
              <Pills options={['Prednisolone (ISKDC 60mg/m²/d × 6w then 40mg/m² alternate days × 6w)','Cyclophosphamide (SDNS/FRNS)','MMF (mycophenolate)','Levamisole','Tacrolimus/cyclosporine (SRNS)','Rituximab (refractory)']}
                value={steroidTx} onChange={setSteroidTx} accent="teal" />
            </FL>
          </>
        )}
      </Section>

      {/* UTI / VUR */}
      <Section title="UTI & Vesicoureteric Reflux (VUR)" applicable={sec.uti} onApplicable={v => sa('uti', v)} accent="teal">
        <FL label="UTI present/suspected?">
          <Pills options={['Yes — first UTI','Yes — recurrent UTI','No']} value={utiGate} onChange={setUtiGate} accent="teal" />
        </FL>
        {utiGate !== '' && utiGate !== 'No' && (
          <>
            <FL label="Symptoms (select all)">
              <Pills options={['Fever (>38°C)','Dysuria','Frequency/urgency','Haematuria','Loin/flank pain','Suprapubic pain','Vomiting','Failure to thrive (infant)']}
                value={utiSymptoms} onChange={setUtiSymptoms} accent="teal" multi />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="UTI classification">
                <Pills options={['Lower UTI (cystitis)','Upper UTI (pyelonephritis)','Febrile UTI','Atypical UTI (NICE criteria)']}
                  value={utiType} onChange={setUtiType} accent="teal" />
              </FL>
              <FL label="Urine M/C/S">
                <Pills options={['Positive culture (>10⁵ CFU)','Dipstick positive only','Negative','Pending']}
                  value={urineMcs} onChange={setUrineMcs} accent="teal" />
              </FL>
            </div>
            <FL label="Antibiotic treatment">
              <Pills options={['Co-amoxiclav','Cefixime (oral)','Ceftriaxone IV','Nitrofurantoin (lower UTI)','Trimethoprim','Based on sensitivities']}
                value={utiAbx} onChange={setUtiAbx} accent="teal" />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Antibiotic prophylaxis?">
                <Pills options={['Yes — Trimethoprim low dose','Yes — Nitrofurantoin low dose','No','Not yet decided']}
                  value={prophylaxis} onChange={setProphylaxis} accent="teal" />
              </FL>
              <FL label="MCUG (voiding cystourethrogram)">
                <Pills options={['VUR confirmed','Normal','Pending','PUV found (male)','Not done']}
                  value={mCUG} onChange={setMCUG} accent="blue" />
              </FL>
            </div>
            <FL label="VUR grade (VCUG / radionuclide)">
              <Pills options={['Grade I — into ureter only','Grade II — into pelvis (no dilation)','Grade III — mild dilation','Grade IV — moderate dilation','Grade V — severe dilation/reflux nephropathy']}
                value={vurGrade} onChange={setVurGrade} accent="violet" />
            </FL>
          </>
        )}
      </Section>

      {/* AKI */}
      <Section title="Acute Kidney Injury — pRIFLE/KDIGO" applicable={sec.aki} onApplicable={v => sa('aki', v)} accent="red">
        <FL label="AKI suspected?">
          <Pills options={['Yes','No']} value={akiGate} onChange={setAkiGate} accent="red" />
        </FL>
        {akiGate === 'Yes' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <FL label="Current creatinine" sub="µmol/L or mg/dL">
                <input type="number" step="0.1" value={creatinine} onChange={e => setCreatinine(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
              </FL>
              <FL label="Baseline creatinine" sub="µmol/L or mg/dL">
                <input type="number" step="0.1" value={creatinineBase} onChange={e => setCreatinineBase(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
              </FL>
              <FL label="Urine output" sub="mL/kg/h">
                <input type="number" step="0.1" value={urine_output} onChange={e => setUrineOutput(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="mL/kg/h" />
              </FL>
            </div>
            {akiRifle && (
              <div className={`p-3 rounded-lg border font-semibold ${akiRifle === 'Failure' ? 'bg-red-50 border-red-400 text-red-700' : akiRifle === 'Injury' ? 'bg-orange-50 border-orange-400 text-orange-700' : akiRifle === 'Risk' ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-green-50 border-green-400 text-green-700'}`}>
                pRIFLE Stage (derived): {akiRifle}
              </div>
            )}
            <FL label="AKI cause">
              <Pills options={['Pre-renal (dehydration/shock)','Renal (GN/HUS/ATN)','Post-renal (obstruction/PUV)','Nephrotoxic drugs','Sepsis-associated','Unknown']}
                value={akiCause} onChange={setAkiCause} accent="red" />
            </FL>
            <FL label="Features">
              <Pills options={['Oliguria/anuria','Fluid overload','Hyperkalaemia (>6mEq/L)','Metabolic acidosis','Uraemic encephalopathy','Hypertension','Pulmonary oedema']}
                value={akiFeatures} onChange={setAkiFeatures} accent="red" multi />
            </FL>
            <FL label="Renal replacement therapy (RRT)">
              <Pills options={['Peritoneal dialysis','Intermittent haemodialysis','CRRT (CVVHF)','None — conservative','Planned']}
                value={kdrt} onChange={setKdrt} accent="teal" />
            </FL>
          </>
        )}
      </Section>

      {/* Hypertension */}
      <Section title="Hypertension (AAP 2017)" applicable={sec.htn} onApplicable={v => sa('htn', v)} accent="red">
        <FL label="Hypertension detected?">
          <Pills options={['Yes','No','Elevated (confirmed)']} value={htnGate} onChange={setHtnGate} accent="red" />
        </FL>
        {htnGate !== '' && htnGate !== 'No' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <FL label="SBP" sub="mmHg"><input type="number" value={sbp} onChange={e => setSbp(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
              <FL label="DBP" sub="mmHg"><input type="number" value={dbp} onChange={e => setDbp(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
              <FL label="AAP 2017 Stage">
                <Pills options={['Normal','Elevated (90th-95th)','Stage 1 (95th+12mmHg)','Stage 2 (95th+12mmHg)','Hypertensive crisis']}
                  value={htnStage} onChange={setHtnStage} accent="red" />
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Cause">
                <Pills options={['Primary (essential)','Renal parenchymal disease','Renovascular','Coarctation of aorta','Endocrine (phaeochromocytoma/primary aldosteronism)','Drug-induced','Unknown']}
                  value={htnCause} onChange={setHtnCause} accent="red" />
              </FL>
              <FL label="Target organ damage">
                <Pills options={['LVH (echo)','Retinopathy','Proteinuria','Elevated creatinine','Neurological symptoms']}
                  value={organDamage} onChange={setOrganDamage} accent="red" multi />
              </FL>
            </div>
            <FL label="Antihypertensive treatment">
              <Pills options={['Lifestyle modification only','Amlodipine','Enalapril/lisinopril','Losartan (proteinuria)','Atenolol','Nifedipine (acute)','IV labetalol (crisis)']}
                value={htnTx} onChange={setHtnTx} accent="teal" />
            </FL>
          </>
        )}
      </Section>

      {/* HUS */}
      <Section title="Haemolytic Uraemic Syndrome (HUS)" applicable={sec.hus} onApplicable={v => sa('hus', v)} accent="red">
        <FL label="HUS suspected?">
          <Pills options={['Yes — typical (STEC)','Yes — atypical (complement-mediated)','No']} value={husGate} onChange={setHusGate} accent="red" />
        </FL>
        {husGate !== '' && husGate !== 'No' && (
          <>
            <FL label="HUS triad">
              <Pills options={['Microangiopathic haemolytic anaemia (MAHA)','Thrombocytopenia','AKI (oliguria/anuria)']}
                value={husTriad} onChange={setHusTriad} accent="red" multi />
            </FL>
            <div className="grid grid-cols-3 gap-3">
              <FL label="Etiology">
                <Pills options={['STEC (O157:H7)','Streptococcus pneumoniae','Complement mutation (aHUS)','Drug-induced','Unknown']}
                  value={husEtiology} onChange={setHusEtiology} accent="orange" />
              </FL>
              <FL label="Dialysis needed?">
                <Pills options={['Yes — PD','Yes — HD','Not yet','No']} value={husDialysis} onChange={setHusDialysis} accent="red" />
              </FL>
              <FL label="Eculizumab (aHUS)">
                <Pills options={['Started','Considered','Not indicated','Not available']} value={eculizumab} onChange={setEculizumab} accent="violet" />
              </FL>
            </div>
          </>
        )}
      </Section>

      {/* CKD */}
      <Section title="Chronic Kidney Disease" applicable={sec.ckd} onApplicable={v => sa('ckd', v)} accent="violet">
        <FL label="CKD present?">
          <Pills options={['Yes','No']} value={ckdGate} onChange={setCkdGate} accent="violet" />
        </FL>
        {ckdGate === 'Yes' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <FL label="eGFR" sub="mL/min/1.73m²">
                <input type="number" value={gfr} onChange={e => setGfr(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
              </FL>
              <FL label="CKD Stage (KDIGO)">
                <Pills options={['G1 (≥90)','G2 (60-89)','G3a (45-59)','G3b (30-44)','G4 (15-29)','G5 (<15 — ESRD)']}
                  value={ckdStage} onChange={setCkdStage} accent="violet" />
              </FL>
              <FL label="Cause">
                <Pills options={['CAKUT','Glomerulonephritis','HUS (post)','Alport syndrome','FSGS','Polycystic kidney disease','Unknown']}
                  value={ckdCause} onChange={setCkdCause} accent="violet" />
              </FL>
            </div>
            <FL label="Complications">
              <Pills options={['Growth failure','Anaemia (EPO deficient)','Secondary hyperparathyroidism/CKD-MBD','Hypertension','Metabolic acidosis','Malnutrition','Cardiovascular risk']}
                value={ckdComp} onChange={setCkdComp} accent="violet" multi />
            </FL>
            <FL label="Renal replacement therapy">
              <Pills options={['Not yet required','Peritoneal dialysis','Haemodialysis','Transplant listed','Post-transplant']}
                value={dialysis} onChange={setDialysis} accent="teal" />
            </FL>
          </>
        )}
      </Section>

      {/* CAKUT */}
      <Section title="CAKUT — Congenital Anomalies of Kidney & Urinary Tract" applicable={sec.cakut} onApplicable={v => sa('cakut', v)} accent="cyan">
        <FL label="CAKUT present?">
          <Pills options={['Yes','No']} value={cakutGate} onChange={setCakutGate} accent="cyan" />
        </FL>
        {cakutGate === 'Yes' && (
          <>
            <FL label="CAKUT type(s)">
              <Pills options={['Renal agenesis (unilateral/bilateral)','Renal hypoplasia/dysplasia','Horseshoe kidney','Duplicated collecting system','PUJ obstruction','VUJ obstruction','Posterior urethral valves (PUV — male)','Bladder exstrophy','Prune belly syndrome','Multicystic dysplastic kidney']}
                value={cakutType} onChange={setCakutType} accent="cyan" multi />
            </FL>
            <FL label="Posterior urethral valves (PUV) — male infants">
              <Pills options={['Suspected (poor stream, UTI)','Confirmed (VCUG)','Post-ablation','Not applicable']}
                value={puvGate} onChange={setPuvGate} accent="blue" />
            </FL>
          </>
        )}
      </Section>

      {/* Renal stones */}
      <Section title="Nephrolithiasis" applicable={sec.stones} onApplicable={v => sa('stones', v)} accent="amber">
        <FL label="Renal stones present?">
          <Pills options={['Yes','No','Nephrocalcinosis']} value={stoneGate} onChange={setStoneGate} accent="amber" />
        </FL>
        {stoneGate !== '' && stoneGate !== 'No' && (
          <>
            <FL label="Stone type">
              <Pills options={['Calcium oxalate','Calcium phosphate','Uric acid','Struvite (infection)','Cystine (cystinuria)','Unknown']}
                value={stoneType} onChange={setStoneType} accent="amber" />
            </FL>
            <FL label="Features">
              <Pills options={['Renal colic','Haematuria','Recurrent UTI','Voiding symptoms','Hyperoxaluria','Hypercalciuria','Hypocitraturia']}
                value={stoneFeatures} onChange={setStoneFeatures} accent="amber" multi />
            </FL>
            <FL label="Size" sub="mm (USS/CT)">
              <input type="text" value={stoneSize} onChange={e => setStoneSize(e.target.value)} className="w-32 border rounded-lg px-2 py-1.5 text-sm" placeholder="mm" />
            </FL>
          </>
        )}
      </Section>

      <button type="button" onClick={handleSave}
        className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg transition-all">
        Save Nephrology Assessment
      </button>
    </div>
  );
}
