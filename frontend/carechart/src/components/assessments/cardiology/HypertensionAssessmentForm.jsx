/**
 * @shared-pool
 * HypertensionAssessmentForm — Comprehensive hypertension assessment
 * ESH/ACC/AHA staging, end-organ damage, 10-yr ASCVD risk, Indian API/CSI guidelines
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */

import React, { useState, useMemo } from 'react';
import { Activity, Lock, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  blue:   { bg:'bg-blue-50',   border:'border-blue-300',   text:'text-blue-700',   pill:'bg-blue-100 border-blue-400 text-blue-800',   active:'bg-blue-600 text-white border-blue-600' },
  indigo: { bg:'bg-indigo-50', border:'border-indigo-300', text:'text-indigo-700', pill:'bg-indigo-100 border-indigo-400 text-indigo-800', active:'bg-indigo-600 text-white border-indigo-600' },
  violet: { bg:'bg-violet-50', border:'border-violet-300', text:'text-violet-700', pill:'bg-violet-100 border-violet-400 text-violet-800', active:'bg-violet-600 text-white border-violet-600' },
  red:    { bg:'bg-red-50',    border:'border-red-300',    text:'text-red-700',    pill:'bg-red-100 border-red-400 text-red-800',    active:'bg-red-600 text-white border-red-600' },
  orange: { bg:'bg-orange-50', border:'border-orange-300', text:'text-orange-700', pill:'bg-orange-100 border-orange-400 text-orange-800', active:'bg-orange-500 text-white border-orange-500' },
  amber:  { bg:'bg-amber-50',  border:'border-amber-300',  text:'text-amber-700',  pill:'bg-amber-100 border-amber-400 text-amber-800',  active:'bg-amber-500 text-white border-amber-500' },
  green:  { bg:'bg-green-50',  border:'border-green-300',  text:'text-green-700',  pill:'bg-green-100 border-green-400 text-green-800',  active:'bg-green-600 text-white border-green-600' },
  teal:   { bg:'bg-teal-50',   border:'border-teal-300',   text:'text-teal-700',   pill:'bg-teal-100 border-teal-400 text-teal-800',   active:'bg-teal-600 text-white border-teal-600' },
};

function Pills({options,value,onChange,accent='blue',multi=false}){
  const c=A[accent]; const sel=multi?(Array.isArray(value)?value:[]):value;
  const toggle=opt=>{if(multi){const a=Array.isArray(sel)?sel:[];onChange(a.includes(opt)?a.filter(x=>x!==opt):[...a,opt]);}else onChange(sel===opt?'':opt);};
  return(<div className="flex flex-wrap gap-2">{options.map(opt=>{const active=multi?sel.includes(opt):sel===opt;return<button key={opt} type="button" onClick={()=>toggle(opt)} className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${active?c.active:c.pill}`}>{opt}</button>;})}</div>);
}
function FL({label,sub,children}){return(<div className="space-y-1"><label className="block text-sm font-semibold text-gray-700">{label}{sub&&<span className="ml-1 text-xs font-normal text-gray-500">{sub}</span>}</label>{children}</div>);}
function Gate({label,value,onChange,accent='blue',children}){
  const c=A[accent];
  return(<div className={`rounded-lg border ${c.border} ${c.bg} p-3`}><div className="flex items-center justify-between flex-wrap gap-2"><span className="text-sm font-medium text-gray-700">{label}</span><div className="flex gap-2">{['Yes','No'].map(opt=>(<button key={opt} type="button" onClick={()=>onChange(value===opt?'':opt)} className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all ${value===opt?c.active:c.pill}`}>{opt}</button>))}</div></div>{value==='Yes'&&children&&<div className="mt-3 space-y-3">{children}</div>}</div>);
}
function Section({title,applicable,onApplicable,accent='blue',children}){
  const c=A[accent];const[open,setOpen]=useState(true);
  if(applicable==='N/A')return(<div className={`rounded-xl border-2 border-dashed ${c.border} p-4 flex items-center gap-3 opacity-60`}><Lock className="w-5 h-5 text-gray-400"/><span className="text-sm text-gray-500 font-medium">{title} — Not applicable · section locked</span><button type="button" onClick={()=>onApplicable('Applicable')} className="ml-auto text-xs text-blue-600 underline">Unlock</button></div>);
  return(<div className={`rounded-xl border-2 ${c.border} overflow-hidden`}><div className={`${c.bg} px-4 py-3 flex items-center justify-between flex-wrap gap-2`}><span className={`font-bold text-base ${c.text}`}>{title}</span><div className="flex items-center gap-2"><div className="flex gap-1">{['Applicable','N/A'].map(v=>(<button key={v} type="button" onClick={()=>onApplicable(v)} className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold transition-all ${applicable===v?c.active:c.pill}`}>{v}</button>))}</div><button type="button" onClick={()=>setOpen(o=>!o)} className={`${c.text} p-1`}>{open?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</button></div></div>{open&&applicable==='Applicable'&&<div className="p-4 space-y-4">{children}</div>}</div>);
}

/* ── BP staging (ESH 2023 / ACC/AHA 2017 comparison) ── */
function classifyBP(s,d){
  if(!s||!d) return null;
  const sys=Number(s),dia=Number(d);
  if(sys>=180||dia>=120) return {label:'Hypertensive Crisis / Emergency',stage:'Grade 3 / Stage 3',color:'bg-red-200 border-red-600 text-red-900',urgent:true};
  if(sys>=160||dia>=100) return {label:'Grade 3 Hypertension',stage:'Stage 2 Severe',color:'bg-red-100 border-red-500 text-red-800',urgent:true};
  if(sys>=140||dia>=90) return {label:'Grade 2 Hypertension',stage:'Stage 2',color:'bg-orange-100 border-orange-400 text-orange-800',urgent:false};
  if(sys>=130||dia>=80) return {label:'Grade 1 / Stage 1 Hypertension',stage:'Stage 1',color:'bg-yellow-100 border-yellow-400 text-yellow-800',urgent:false};
  if(sys>=120) return {label:'Elevated BP (pre-hypertension)',stage:'Elevated',color:'bg-amber-50 border-amber-300 text-amber-700',urgent:false};
  return {label:'Normal',stage:'Normal',color:'bg-green-50 border-green-300 text-green-700',urgent:false};
}

const STAGES=['Patient & Vitals','BP History','Risk Factors & EOD','Investigations','Treatment Plan','Follow-up'];

export default function HypertensionAssessmentForm({patientId,encounterId,onSaved}){
  const[stage,setStage]=useState(0);
  const[sec,setSec]=useState({vitals:'Applicable',history:'Applicable',risk:'Applicable',ix:'Applicable',tx:'Applicable',fu:'Applicable'});
  const sa=(k,v)=>setSec(s=>({...s,[k]:v}));

  /* Stage 0 */
  const[age,setAge]=useState('');
  const[sex,setSex]=useState('');
  const[bmi,setBmi]=useState('');
  const[waist,setWaist]=useState('');
  const[sbp1,setSbp1]=useState('');const[dbp1,setDbp1]=useState('');
  const[sbp2,setSbp2]=useState('');const[dbp2,setDbp2]=useState('');
  const[sbp3,setSbp3]=useState('');const[dbp3,setDbp3]=useState('');
  const[hr,setHr]=useState('');
  const[armDifference,setArmDifference]=useState('');
  const[posturalBP,setPosturalBP]=useState('');
  const[posturalDrop,setPosturalDrop]=useState('');
  const[homeMonitoring,setHomeMonitoring]=useState('');
  const[abpm,setAbpm]=useState('');
  const[abpmResult,setAbpmResult]=useState('');
  const[whiteCoat,setWhiteCoat]=useState('');
  const[maskedHTN,setMaskedHTN]=useState('');

  /* Stage 1 */
  const[htDuration,setHtDuration]=useState('');
  const[previousMaxBP,setPreviousMaxBP]=useState('');
  const[previousTx,setPreviousTx]=useState([]);
  const[currentMeds,setCurrentMeds]=useState([]);
  const[compliance,setCompliance]=useState('');
  const[sideEffects,setSideEffects]=useState([]);
  const[previousHypoK,setPreviousHypoK]=useState('');
  const[secondaryCause,setSecondaryCause]=useState('');
  const[secondaryFeatures,setSecondaryFeatures]=useState([]);
  const[sympt,setSympt]=useState([]);

  /* Stage 2 */
  const[riskFactors,setRiskFactors]=useState([]);
  const[smoking,setSmoking]=useState('');
  const[cvdHistory,setCvdHistory]=useState([]);
  const[familyHistory,setFamilyHistory]=useState('');
  const[eodRenal,setEodRenal]=useState([]);
  const[eodCardiac,setEodCardiac]=useState([]);
  const[eodNeuro,setEodNeuro]=useState([]);
  const[eodRetina,setEodRetina]=useState('');
  const[eodPeripheral,setEodPeripheral]=useState([]);
  const[fundoscopy,setFundoscopy]=useState('');

  /* Stage 3 */
  const[creatinine,setCreatinine]=useState('');
  const[egfr,setEgfr]=useState('');
  const[urea,setUrea]=useState('');
  const[potassium,setPotassium]=useState('');
  const[sodium,setSodium]=useState('');
  const[uacr,setUacr]=useState('');
  const[urine,setUrine]=useState([]);
  const[hba1c,setHba1c]=useState('');
  const[fastGluc,setFastGluc]=useState('');
  const[tc,setTc]=useState('');
  const[ldl,setLdl]=useState('');
  const[hdl,setHdl]=useState('');
  const[trig,setTrig]=useState('');
  const[ecgLVH,setEcgLVH]=useState('');
  const[echoLVH,setEchoLVH]=useState('');
  const[lvmi,setLvmi]=useState('');
  const[renalUS,setRenalUS]=useState([]);
  const[aldosterone,setAldosterone]=useState('');
  const[reninRatio,setReninRatio]=useState('');
  const[catecholamines,setCatecholamines]=useState('');
  const[thyroid,setThyroid]=useState('');

  /* Stage 4 */
  const[cvRiskCategory,setCvRiskCategory]=useState('');
  const[targetBP,setTargetBP]=useState('');
  const[lifestyleChanges,setLifestyleChanges]=useState([]);
  const[drugClass1,setDrugClass1]=useState('');
  const[drug1Name,setDrug1Name]=useState('');
  const[drugClass2,setDrugClass2]=useState('');
  const[drug2Name,setDrug2Name]=useState('');
  const[drugClass3,setDrugClass3]=useState('');
  const[drug3Name,setDrug3Name]=useState('');
  const[statinIndicated,setStatinIndicated]=useState('');
  const[antiplatelet,setAntiplatelet]=useState('');
  const[referralNeeded,setReferralNeeded]=useState('');
  const[referralType,setReferralType]=useState([]);

  /* Stage 5 */
  const[reviewInterval,setReviewInterval]=useState('');
  const[targetReached,setTargetReached]=useState('');
  const[monitoring,setMonitoring]=useState([]);
  const[patientEducation,setPatientEducation]=useState([]);
  const[npcdcs,setNpcdcs]=useState('');

  const[saving,setSaving]=useState(false);const[saved,setSaved]=useState(false);

  /* ── AUTO: average BP ── */
  const avgBP=useMemo(()=>{
    const readings=[[sbp1,dbp1],[sbp2,dbp2],[sbp3,dbp3]].filter(([s,d])=>s&&d).map(([s,d])=>[Number(s),Number(d)]);
    if(readings.length<1) return null;
    const useReadings=readings.length>=2?readings.slice(1):readings;
    const avgS=Math.round(useReadings.reduce((a,[s])=>a+s,0)/useReadings.length);
    const avgD=Math.round(useReadings.reduce((a,[,d])=>a+d,0)/useReadings.length);
    return {sys:avgS,dia:avgD,n:useReadings.length};
  },[sbp1,dbp1,sbp2,dbp2,sbp3,dbp3]);

  const bpClass=useMemo(()=>avgBP?classifyBP(avgBP.sys,avgBP.dia):null,[avgBP]);

  /* ── AUTO: end-organ damage flags ── */
  const eodFlags=useMemo(()=>{
    const f=[];
    if(Number(egfr)<60) f.push(`eGFR ${egfr} — CKD stage ${Number(egfr)<30?'4/5':Number(egfr)<45?'3b':'3a'}`);
    if(Number(creatinine)>130) f.push(`Elevated creatinine ${creatinine} µmol/L`);
    if(Number(uacr)>3) f.push(`Microalbuminuria UACR ${uacr} mg/mmol — early renal end-organ damage`);
    if(eodCardiac.includes('LVH on echo')) f.push('LVH on echo — cardiac end-organ damage');
    if(eodNeuro.includes('Stroke/TIA history')) f.push('Cerebrovascular disease');
    if(eodRetina==='Grade 3 or 4 (papilloedema)') f.push('Hypertensive retinopathy Grade 3/4 — hypertensive emergency');
    if(Number(potassium)<3.5) f.push(`Hypokalaemia (K ${potassium}) — consider primary hyperaldosteronism`);
    return f;
  },[egfr,creatinine,uacr,eodCardiac,eodNeuro,eodRetina,potassium]);

  /* ── AUTO: secondary HTN clues ── */
  const secondaryClues=useMemo(()=>{
    const f=[];
    if(secondaryFeatures.includes('Hypokalaemia (unprovoked)')) f.push('Hypokalaemia → ?Primary hyperaldosteronism (Conn\'s)');
    if(secondaryFeatures.includes('Episodic HTN + headache + sweating + palpitations')) f.push('Episodic symptoms → ?Phaeochromocytoma');
    if(secondaryFeatures.includes('Snoring / apnoeas / daytime somnolence')) f.push('OSA features → ?Obstructive sleep apnoea-driven HTN');
    if(secondaryFeatures.includes('Young onset (<30 years) + severe HTN')) f.push('Young severe HTN → ?Renovascular / FMD / coarctation');
    if(secondaryFeatures.includes('Arm-leg BP differential >20 mmHg')) f.push('Arm-leg differential → ?Coarctation of aorta');
    if(secondaryFeatures.includes('Abdominal bruit')) f.push('Abdominal bruit → ?Renal artery stenosis');
    if(secondaryFeatures.includes('Moon face / striae / buffalo hump')) f.push('Cushingoid features → ?Cushing\'s syndrome');
    if(thyroid==='Hypothyroid (untreated)') f.push('Hypothyroidism — treat before adjusting antihypertensives');
    return f;
  },[secondaryFeatures,thyroid]);

  const handleSave=async()=>{
    setSaving(true);
    try{
      await api.post('/assessments',{type:'hypertension_assessment',patientId,encounterId,
        data:{vitals:{age,sex,bmi,waist,readings:{sbp1,dbp1,sbp2,dbp2,sbp3,dbp3},hr,avgBP,bpClass,armDifference,posturalBP,posturalDrop,homeMonitoring,abpm,abpmResult,whiteCoat,maskedHTN},
          history:{htDuration,previousMaxBP,previousTx,currentMeds,compliance,sideEffects,previousHypoK,secondaryCause,secondaryFeatures,sympt},
          risk:{riskFactors,smoking,cvdHistory,familyHistory,eodRenal,eodCardiac,eodNeuro,eodRetina,eodPeripheral,fundoscopy,eodFlags,secondaryClues},
          ix:{creatinine,egfr,urea,potassium,sodium,uacr,urine,hba1c,fastGluc,tc,ldl,hdl,trig,ecgLVH,echoLVH,lvmi,renalUS,aldosterone,reninRatio,catecholamines,thyroid},
          treatment:{cvRiskCategory,targetBP,lifestyleChanges,drugs:[{class:drugClass1,name:drug1Name},{class:drugClass2,name:drug2Name},{class:drugClass3,name:drug3Name}],statinIndicated,antiplatelet,referralNeeded,referralType},
          followUp:{reviewInterval,targetReached,monitoring,patientEducation,npcdcs},
        },
      });
      setSaved(true);onSaved?.();
    }catch(e){console.error(e);}finally{setSaving(false);}
  };

  const progress=Math.round(((stage+1)/STAGES.length)*100);

  return(
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-600 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-8 h-8"/>
          <div><h1 className="text-2xl font-bold">Hypertension Assessment</h1>
            <p className="text-blue-100 text-sm">ESH/ACC-AHA staging · End-organ damage · CV risk · Indian guidelines</p>
          </div>
        </div>
        {avgBP && (
          <div className={`mt-2 px-4 py-2 rounded-lg border text-sm font-bold ${bpClass?.color}`}>
            Avg BP: {avgBP.sys}/{avgBP.dia} mmHg ({avgBP.n >= 2 ? '2nd + 3rd reading avg' : 'single reading'}) — {bpClass?.label}
          </div>
        )}
        {bpClass?.urgent && (
          <div className="mt-1 flex items-start gap-2 px-3 py-2 rounded-lg bg-red-900/80 text-white text-xs font-semibold animate-pulse">
            <AlertTriangle className="w-4 h-4 flex-shrink-0"/>Hypertensive emergency / urgency — check for end-organ damage. IV labetalol / sodium nitroprusside if emergency. Target: reduce MAP by max 25% in first hour.
          </div>
        )}
        {eodFlags.length>0 && (
          <div className="mt-2 space-y-1">
            {eodFlags.map((f,i)=><div key={i} className="px-3 py-1 rounded-lg bg-white/20 text-xs font-semibold">{f}</div>)}
          </div>
        )}
        {secondaryClues.length>0 && (
          <div className="mt-1 space-y-1">
            {secondaryClues.map((f,i)=><div key={i} className="px-3 py-1 rounded-lg bg-yellow-400/30 text-xs font-semibold">{f}</div>)}
          </div>
        )}
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full transition-all" style={{width:`${progress}%`}}/></div>
      <div className="flex flex-wrap gap-2">
        {STAGES.map((s,i)=><button key={i} type="button" onClick={()=>setStage(i)} className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${stage===i?'bg-blue-600 text-white border-blue-600':'bg-blue-50 border-blue-300 text-blue-700'}`}>{i+1}. {s}</button>)}
      </div>

      {stage===0&&(
        <Section title="Patient & BP Measurements" applicable={sec.vitals} onApplicable={v=>sa('vitals',v)} accent="blue">
          <div className="grid grid-cols-3 gap-3">
            <FL label="Age"><input type="number" value={age} onChange={e=>setAge(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="years"/></FL>
            <FL label="Sex"><Pills options={['Male','Female','Other']} value={sex} onChange={setSex} accent="blue"/></FL>
            <FL label="BMI (kg/m²)"><input type="number" value={bmi} onChange={e=>setBmi(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="—"/></FL>
          </div>
          <FL label="Waist circumference (cm)">
            <input type="number" value={waist} onChange={e=>setWaist(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="—"/>
            {waist&&((sex==='Male'&&Number(waist)>90)||(sex==='Female'&&Number(waist)>80))&&<p className="text-xs text-orange-600 mt-1">Central obesity — metabolic risk (South Asian cutoff: M &gt;90 cm, F &gt;80 cm)</p>}
          </FL>
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">BP Readings (take 3 readings, 2 min apart; avg 2nd + 3rd)</p>
          {[[1,sbp1,setSbp1,dbp1,setDbp1],[2,sbp2,setSbp2,dbp2,setDbp2],[3,sbp3,setSbp3,dbp3,setDbp3]].map(([n,s,ss,d,ds])=>(
            <div key={n} className="grid grid-cols-3 gap-3 items-end">
              <FL label={`Reading ${n} — SBP (mmHg)`}><input type="number" value={s} onChange={e=>ss(e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm ${n===1?'border-gray-300':'border-blue-300'}`} placeholder="—"/></FL>
              <FL label={`DBP (mmHg)`}><input type="number" value={d} onChange={e=>ds(e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-sm ${n===1?'border-gray-300':'border-blue-300'}`} placeholder="—"/></FL>
              {n===1&&<p className="text-xs text-gray-500 pb-2">Discarded (first reading)</p>}
              {n>1&&s&&d&&<p className={`text-xs pb-2 font-semibold ${classifyBP(s,d)?.urgent?'text-red-600':'text-blue-600'}`}>{classifyBP(s,d)?.label}</p>}
            </div>
          ))}
          {avgBP&&<div className={`px-4 py-2 rounded-lg border-2 text-sm font-bold ${bpClass?.color}`}>Average BP: {avgBP.sys}/{avgBP.dia} mmHg — {bpClass?.label}</div>}
          <FL label="Heart Rate (bpm)"><input type="number" value={hr} onChange={e=>setHr(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="—"/></FL>
          <FL label="Inter-arm BP difference">
            <Pills options={['<10 mmHg (normal)','10–15 mmHg (minor difference)','≥20 mmHg (significant — check both arms)']} value={armDifference} onChange={setArmDifference} accent="blue"/>
          </FL>
          <Gate label="Postural BP measured (orthostatic check)?" value={posturalBP} onChange={setPosturalBP} accent="blue">
            <FL label="Postural drop result"><Pills options={['<10 mmHg drop (normal)','10–20 mmHg drop','≥20 mmHg SBP drop (orthostatic hypotension)','Symptom-limited (dizziness)']} value={posturalDrop} onChange={setPosturalDrop} accent="blue"/></FL>
          </Gate>
          <Gate label="Home BP monitoring data available?" value={homeMonitoring} onChange={setHomeMonitoring} accent="blue">
            <p className="text-xs text-blue-700">Home HTN threshold: ≥135/85 mmHg. Record morning + evening readings for 7 days.</p>
          </Gate>
          <Gate label="ABPM (24-hour ambulatory BP) available?" value={abpm} onChange={setAbpm} accent="indigo">
            <FL label="ABPM Result"><Pills options={['Confirmed sustained HTN (24h avg ≥130/80)','White-coat HTN (clinic elevated, ABPM normal)','Masked HTN (clinic normal, ABPM elevated)','Nocturnal HTN (dip <10%)','Normal (24h avg <130/80)']} value={abpmResult} onChange={setAbpmResult} accent="indigo"/></FL>
          </Gate>
          <div className="grid grid-cols-2 gap-3">
            <Gate label="White-coat hypertension suspected?" value={whiteCoat} onChange={setWhiteCoat} accent="amber"><p className="text-xs text-amber-700">White-coat HTN: increased CV risk vs. true normotension. Lifestyle intervention + annual ABPM monitoring.</p></Gate>
            <Gate label="Masked hypertension suspected?" value={maskedHTN} onChange={setMaskedHTN} accent="orange"><p className="text-xs text-orange-700">Masked HTN: clinic BP normal but home/ABPM elevated. High CV risk. Treat as persistent HTN.</p></Gate>
          </div>
        </Section>
      )}

      {stage===1&&(
        <Section title="Hypertension History" applicable={sec.history} onApplicable={v=>sa('history',v)} accent="indigo">
          <div className="grid grid-cols-2 gap-4">
            <FL label="Duration of hypertension"><Pills options={['Newly diagnosed','<1 year','1–5 years','5–10 years','>10 years','Unknown']} value={htDuration} onChange={setHtDuration} accent="indigo"/></FL>
            <FL label="Highest ever BP recorded"><Pills options={['<160/100','160–179/100–109','180–199/110–119','≥200/120','Not known']} value={previousMaxBP} onChange={setPreviousMaxBP} accent="indigo"/></FL>
          </div>
          <FL label="Previous antihypertensive drugs tried" sub="(multi-select)">
            <Pills options={['ACE inhibitor (e.g. Ramipril, Enalapril)','ARB (e.g. Telmisartan, Losartan)','Amlodipine / CCB','Beta-blocker (Metoprolol, Atenolol)','Thiazide / Indapamide','Furosemide','Spironolactone','Alpha-blocker (Prazosin, Doxazosin)','Centrally acting (Clonidine, Methyldopa)','None tried']}
              value={previousTx} onChange={setPreviousTx} accent="indigo" multi/>
          </FL>
          <FL label="Current antihypertensive medications" sub="(multi-select)">
            <Pills options={['Ramipril','Enalapril','Lisinopril','Telmisartan','Losartan','Amlodipine','Nifedipine SR','Metoprolol','Atenolol','Indapamide','Hydrochlorothiazide','Spironolactone','Furosemide','Prazosin','Clonidine','Methyldopa (pregnancy)','None']}
              value={currentMeds} onChange={setCurrentMeds} accent="indigo" multi/>
          </FL>
          <FL label="Compliance with current medications">
            <Pills options={['Good (rarely misses doses)','Moderate (misses occasionally)','Poor (often misses)','Not on any medication','Stopped due to side effects']} value={compliance} onChange={setCompliance} accent="indigo"/>
          </FL>
          <FL label="Side effects from medications" sub="(multi-select)">
            <Pills options={['ACE inhibitor cough','Ankle oedema (CCB)','Dizziness / postural drop','Hyperkalaemia (ACEi/ARB/MRA)','Hyponatraemia (thiazide)','Hypokalaemia (loop/thiazide)','Fatigue (beta-blocker)','Sexual dysfunction (beta-blocker)','Erectile dysfunction','None']}
              value={sideEffects} onChange={setSideEffects} accent="indigo" multi/>
          </FL>
          <FL label="Current symptoms" sub="(multi-select)">
            <Pills options={['None','Headache (occipital)','Dizziness','Visual disturbance','Chest pain','Dyspnoea','Nocturia','Epistaxis','Palpitations','Leg swelling']}
              value={sympt} onChange={setSympt} accent="indigo" multi/>
          </FL>
          <Gate label="Features suggesting secondary hypertension?" value={secondaryCause} onChange={setSecondaryCause} accent="orange">
            <FL label="Secondary cause features" sub="(multi-select)">
              <Pills options={['Hypokalaemia (unprovoked)','Episodic HTN + headache + sweating + palpitations','Snoring / apnoeas / daytime somnolence','Young onset (<30 years) + severe HTN','Arm-leg BP differential >20 mmHg','Abdominal bruit','Moon face / striae / buffalo hump','Renal impairment','Abnormal renal USS','Family history of phaeochromocytoma / VHL']}
                value={secondaryFeatures} onChange={setSecondaryFeatures} accent="orange" multi/>
            </FL>
            {secondaryClues.length>0&&(
              <div className="space-y-1 mt-2">
                {secondaryClues.map((c,i)=><div key={i} className="px-3 py-1.5 bg-orange-100 border border-orange-300 rounded-lg text-xs text-orange-800 font-semibold">{c}</div>)}
              </div>
            )}
          </Gate>
        </Section>
      )}

      {stage===2&&(
        <Section title="Risk Factors & End-Organ Damage" applicable={sec.risk} onApplicable={v=>sa('risk',v)} accent="violet">
          <FL label="CV risk factors" sub="(multi-select)">
            <Pills options={['Diabetes mellitus','Dyslipidaemia','Obesity (BMI>30)','CKD','Obstructive sleep apnoea','Gout','Hyperuricaemia','Atrial fibrillation','Hypothyroidism','Metabolic syndrome']}
              value={riskFactors} onChange={setRiskFactors} accent="violet" multi/>
          </FL>
          <FL label="Smoking status"><Pills options={['Never','Ex-smoker (>1 year)','Current smoker','Passive smoker']} value={smoking} onChange={setSmoking} accent="violet"/></FL>
          <FL label="Family history of premature CVD"><Pills options={['None','Father/brother <55 years','Mother/sister <65 years','Both parents','Unknown']} value={familyHistory} onChange={setFamilyHistory} accent="violet"/></FL>
          <FL label="Pre-existing CV disease" sub="(multi-select)">
            <Pills options={['None','Prior MI','Prior PCI/CABG','Heart failure','Stroke/TIA','Peripheral arterial disease','Aortic aneurysm','AF']}
              value={cvdHistory} onChange={setCvdHistory} accent="violet" multi/>
          </FL>
          <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">End-organ damage screen</p>
          <FL label="Renal EOD" sub="(multi-select)">
            <Pills options={['None','Microalbuminuria (UACR 3–30)','Macroalbuminuria (UACR>30)','eGFR 45–59 (CKD 3a)','eGFR 30–44 (CKD 3b)','eGFR<30 (CKD 4/5)','Small kidneys on USS']}
              value={eodRenal} onChange={setEodRenal} accent="violet" multi/>
          </FL>
          <FL label="Cardiac EOD" sub="(multi-select)">
            <Pills options={['None','LVH on ECG (Sokolow–Lyon or Cornell)','LVH on echo (LVMI elevated)','Diastolic dysfunction','LV hypertrophy + diastolic dysfunction','Coronary artery calcification']}
              value={eodCardiac} onChange={setEodCardiac} accent="violet" multi/>
          </FL>
          <FL label="Neurological EOD" sub="(multi-select)">
            <Pills options={['None','Stroke/TIA history','Lacunar infarcts (MRI)','White matter lesions','Cognitive impairment','Carotid IMT elevated']}
              value={eodNeuro} onChange={setEodNeuro} accent="violet" multi/>
          </FL>
          <FL label="Hypertensive retinopathy (fundoscopy grade)">
            <Pills options={['Not done','Normal (Grade 0)','Grade 1 (arteriolar narrowing)','Grade 2 (AV nipping)','Grade 3 (flame haemorrhages / exudates)','Grade 3 or 4 (papilloedema)']}
              value={eodRetina} onChange={setEodRetina} accent="violet"/>
            {eodRetina==='Grade 3 or 4 (papilloedema)'&&<p className="text-xs text-red-600 mt-1 font-semibold">Grade 3/4 retinopathy — hypertensive emergency. Immediate BP management required.</p>}
          </FL>
          <FL label="Peripheral vascular EOD" sub="(multi-select)">
            <Pills options={['None','Reduced ankle-brachial index (<0.9)','Absent peripheral pulses','Intermittent claudication','Critical limb ischaemia']}
              value={eodPeripheral} onChange={setEodPeripheral} accent="violet" multi/>
          </FL>
        </Section>
      )}

      {stage===3&&(
        <Section title="Investigations" applicable={sec.ix} onApplicable={v=>sa('ix',v)} accent="teal">
          <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Renal Function</p>
          <div className="grid grid-cols-3 gap-3">
            {[['Creatinine (µmol/L)',creatinine,setCreatinine],['eGFR (mL/min/1.73m²)',egfr,setEgfr],['Urea (mmol/L)',urea,setUrea],['Potassium (mmol/L)',potassium,setPotassium],['Sodium (mmol/L)',sodium,setSodium]].map(([l,v,s])=>(
              <FL key={l} label={l}><input type="number" value={v} onChange={e=>s(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="—"/></FL>
            ))}
            <FL label="UACR (mg/mmol)"><input type="number" value={uacr} onChange={e=>setUacr(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="—"/></FL>
          </div>
          {Number(potassium)<3.5&&potassium&&<p className="text-xs text-orange-600 font-semibold">Hypokalaemia — check for primary hyperaldosteronism (aldosterone:renin ratio)</p>}
          <FL label="Urine dipstick / microscopy" sub="(multi-select)">
            <Pills options={['Normal','Proteinuria','Haematuria','Leucocytes','Casts','Glucose','Normal']} value={urine} onChange={setUrine} accent="teal" multi/>
          </FL>
          <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Metabolic</p>
          <div className="grid grid-cols-3 gap-3">
            {[['HbA1c (%)',hba1c,setHba1c],['Fasting glucose (mmol/L)',fastGluc,setFastGluc],['Total cholesterol',tc,setTc],['LDL-C (mmol/L)',ldl,setLdl],['HDL-C (mmol/L)',hdl,setHdl],['Triglycerides',trig,setTrig]].map(([l,v,s])=>(
              <FL key={l} label={l}><input type="number" step="0.1" value={v} onChange={e=>s(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="—"/></FL>
            ))}
          </div>
          <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Cardiac</p>
          <FL label="ECG — LVH"><Pills options={['No LVH','Sokolow–Lyon LVH (SV1+RV5>35mm)','Cornell LVH','Repolarisation changes (strain pattern)','LBBB']} value={ecgLVH} onChange={setEcgLVH} accent="teal"/></FL>
          <FL label="Echo — LV assessment"><Pills options={['Not done','Normal LV function + no LVH','Concentric LVH','Eccentric LVH','Concentric remodelling','Diastolic dysfunction only','Systolic dysfunction + LVH']} value={echoLVH} onChange={setEchoLVH} accent="teal"/></FL>
          {echoLVH&&echoLVH!=='Not done'&&<FL label="LV Mass Index (g/m²)"><input type="number" value={lvmi} onChange={e=>setLvmi(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Normal: M<95, F<89"/></FL>}
          <FL label="Renal ultrasound" sub="(multi-select)">
            <Pills options={['Normal bilateral kidneys','Small kidneys bilaterally (CKD)','Asymmetric kidneys (>1.5 cm difference — renovascular)','Cortical scarring','Renal cysts / PCKD','Adrenal mass / incidentaloma','Hydronephrosis','Not done']} value={renalUS} onChange={setRenalUS} accent="teal" multi/>
          </FL>
          <FL label="Thyroid function (TSH)"><Pills options={['Normal','Hypothyroid (untreated)','Hyperthyroid','On treatment — controlled','Not done']} value={thyroid} onChange={setThyroid} accent="teal"/></FL>
          <Gate label="Aldosterone:Renin Ratio (ARR) checked?" value={aldosterone} onChange={setAldosterone} accent="orange">
            <FL label="ARR Result"><Pills options={['Normal (<30)','Elevated (>30) — screen positive','Equivocal','Awaiting']} value={reninRatio} onChange={setReninRatio} accent="orange"/></FL>
            {reninRatio==='Elevated (>30) — screen positive'&&<p className="text-xs text-orange-700 font-semibold">ARR elevated — confirm with fludrocortisone suppression test. Adrenal CT + endocrinology referral.</p>}
          </Gate>
          <Gate label="Urine catecholamines / metanephrines (phaeochromocytoma screen)?" value={catecholamines} onChange={setCatecholamines} accent="orange">
            <p className="text-xs text-orange-700">24h urine metanephrines or plasma fractionated metanephrines if phaeochromocytoma suspected. Do NOT start beta-blocker before alpha-blockade in phaeochromocytoma.</p>
          </Gate>
        </Section>
      )}

      {stage===4&&(
        <Section title="Treatment Plan" applicable={sec.tx} onApplicable={v=>sa('tx',v)} accent="green">
          <FL label="10-year CV Risk Category">
            <Pills options={['Low (<10%)','Moderate (10–20%)','High (20–30%)','Very High (>30% or established CVD/CKD3+/DM with EOD)']} value={cvRiskCategory} onChange={setCvRiskCategory} accent="green"/>
          </FL>
          <FL label="BP Target">
            <Pills options={['<130/80 mmHg (high risk, DM, CVD, CKD)','<140/90 mmHg (moderate risk)','<150/90 mmHg (age >80 years if tolerated)','<130/80 mmHg (all, if tolerated — ACC/AHA 2017)','Individualised (frailty / orthostatic)']} value={targetBP} onChange={setTargetBP} accent="green"/>
          </FL>
          <FL label="Lifestyle modifications" sub="(multi-select)">
            <Pills options={['DASH diet','Low sodium diet (<5 g NaCl/day — Indian avg 9–10 g)','Weight reduction (target BMI 18.5–22.9)','Regular aerobic exercise 150 min/week','Smoking cessation','Alcohol reduction (<14 units/week M, <7 units/week F)','Stress reduction / yoga / pranayama (Indian context)','Reduce spicy/pickled food / papad / achaar (high salt)','Increase potassium (fruits / vegetables)']}
              value={lifestyleChanges} onChange={setLifestyleChanges} accent="green" multi/>
          </FL>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
            <Info className="w-4 h-4 inline mr-1"/>Indian guideline (API/CSI): Preferred first-line: ACEi or ARB (especially DM, CKD, proteinuria) + CCB (Amlodipine). Avoid ACEi+ARB combination. Thiazide-like preferred over HCTZ for BP lowering. Beta-blockers — not first line unless angina/HF/AF.
          </div>
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Antihypertensive Drugs</p>
          {[[drugClass1,setDrugClass1,drug1Name,setDrug1Name,'Drug 1'],[drugClass2,setDrugClass2,drug2Name,setDrug2Name,'Drug 2 (add-on)'],[drugClass3,setDrugClass3,drug3Name,setDrug3Name,'Drug 3 (triple therapy)']].map(([dc,sdc,dn,sdn,lbl])=>(
            <div key={lbl} className="grid grid-cols-2 gap-3">
              <FL label={`${lbl} — Drug Class`}>
                <Pills options={['ACE inhibitor','ARB','Calcium channel blocker (CCB)','Thiazide / Indapamide','Beta-blocker','MRA (Spironolactone/Eplerenone)','Alpha-blocker','Loop diuretic','Centrally acting','Not adding']}
                  value={dc} onChange={sdc} accent="green"/>
              </FL>
              <FL label={`${lbl} — Drug Name`}>
                <Pills options={dc==='ACE inhibitor'?['Ramipril 2.5–10 mg OD','Enalapril 5–20 mg BD','Lisinopril 5–40 mg OD','Perindopril 4–8 mg OD']:
                  dc==='ARB'?['Telmisartan 40–80 mg OD','Losartan 50–100 mg OD','Olmesartan 20–40 mg OD','Valsartan 80–320 mg OD','Azilsartan 40–80 mg OD']:
                  dc==='Calcium channel blocker (CCB)'?['Amlodipine 5–10 mg OD','Nifedipine SR 30–60 mg OD','Cilnidipine 5–10 mg OD (Indian generic — preferred)','Lercanidipine 10–20 mg OD']:
                  dc==='Thiazide / Indapamide'?['Indapamide SR 1.5 mg OD','Hydrochlorothiazide 12.5–25 mg OD','Chlorthalidone 12.5–25 mg OD']:
                  dc==='Beta-blocker'?['Metoprolol 25–100 mg BD','Metoprolol XL 50–200 mg OD','Atenolol 25–100 mg OD','Carvedilol 6.25–25 mg BD','Nebivolol 5–10 mg OD']:
                  dc==='MRA (Spironolactone/Eplerenone)'?['Spironolactone 25–100 mg OD','Eplerenone 50 mg OD']:['Select class first']}
                  value={dn} onChange={sdn} accent="teal"/>
              </FL>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <FL label="Statin indicated?"><Pills options={['Yes — initiate (CV risk >10% or LDL >3.0)','Already on statin','No','Reassess']} value={statinIndicated} onChange={setStatinIndicated} accent="green"/></FL>
            <FL label="Antiplatelet (aspirin) indicated?"><Pills options={['Yes — established CVD','No (primary prevention — not routinely recommended)','Already on aspirin']} value={antiplatelet} onChange={setAntiplatelet} accent="green"/></FL>
          </div>
          <Gate label="Referral needed?" value={referralNeeded} onChange={setReferralNeeded} accent="violet">
            <FL label="Referral type" sub="(multi-select)">
              <Pills options={['Cardiologist (resistant HTN / suspected secondary)','Nephrologist (CKD / proteinuria)','Endocrinologist (primary aldosteronism / phaeochromocytoma / Cushing\'s)','Ophthalmologist (Grade 3/4 retinopathy)','Hypertension specialist clinic','Dietitian','Sleep clinic (OSA)']}
                value={referralType} onChange={setReferralType} accent="violet" multi/>
            </FL>
          </Gate>
        </Section>
      )}

      {stage===5&&(
        <Section title="Follow-up Plan" applicable={sec.fu} onApplicable={v=>sa('fu',v)} accent="teal">
          <FL label="Review interval"><Pills options={['2 weeks (new treatment / high risk)','4 weeks','3 months','6 months','Annual (stable, controlled)']} value={reviewInterval} onChange={setReviewInterval} accent="teal"/></FL>
          <FL label="BP target reached?"><Pills options={['Yes — at target','Partial response — not at target','No response — escalate','White-coat effect — reassess with ABPM']} value={targetReached} onChange={setTargetReached} accent="teal"/></FL>
          <FL label="Monitoring parameters at follow-up" sub="(multi-select)">
            <Pills options={['BP (both arms)','Weight / BMI / waist','Renal function + electrolytes','HbA1c (if DM)','Lipid profile','Urine ACR','ECG (annual)','Echo (if LVH present)']}
              value={monitoring} onChange={setMonitoring} accent="teal" multi/>
          </FL>
          <FL label="Patient education given" sub="(multi-select)">
            <Pills options={['BP target explained','Home BP monitoring technique taught','Salt restriction counselling (reduce papad / achaar / pickles)','Medication importance (not to stop without advice)','Lifestyle modifications','Symptom recognition (hypertensive urgency)','Pregnancy planning (switch to methyldopa / labetalol if planning)','PMJAY / NPCDCS free medicines scheme explained']}
              value={patientEducation} onChange={setPatientEducation} accent="teal" multi/>
          </FL>
          <Gate label="Enrolled in NPCDCS (National Programme for CVD, DM, Cancer, Stroke)?" value={npcdcs} onChange={setNpcdcs} accent="teal">
            <p className="text-xs text-teal-700">NPCDCS provides free antihypertensives at public health facilities. Amlodipine, Enalapril, Atenolol, HCT available on NLEM (National List of Essential Medicines). Refer patient to PHC/CHC for long-term free drug supply.</p>
          </Gate>
        </Section>
      )}

      <div className="flex items-center justify-between pt-2">
        <button type="button" disabled={stage===0} onClick={()=>setStage(s=>s-1)} className="px-4 py-2 rounded-lg border border-blue-300 text-blue-700 text-sm font-semibold disabled:opacity-40">← Previous</button>
        <span className="text-xs text-gray-500">Stage {stage+1} of {STAGES.length}</span>
        {stage<STAGES.length-1?<button type="button" onClick={()=>setStage(s=>s+1)} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold">Next →</button>
          :<button type="button" onClick={handleSave} disabled={saving||saved} className="px-6 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center gap-2">{saved?<><CheckCircle className="w-4 h-4"/>Saved</>:saving?'Saving…':'Save Assessment'}</button>}
      </div>
    </div>
  );
}
