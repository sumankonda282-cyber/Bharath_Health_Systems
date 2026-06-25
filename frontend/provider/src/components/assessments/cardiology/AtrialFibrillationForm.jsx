/**
 * @shared-pool
 * AtrialFibrillationForm — Comprehensive AF assessment
 * CHA₂DS₂-VASc + HAS-BLED auto-calculated, rate vs rhythm, anticoagulation
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */

import React, { useState, useMemo } from 'react';
import { Activity, Lock, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  indigo: { bg:'bg-indigo-50', border:'border-indigo-300', text:'text-indigo-700', pill:'bg-indigo-100 border-indigo-400 text-indigo-800', active:'bg-indigo-600 text-white border-indigo-600' },
  blue:   { bg:'bg-blue-50',   border:'border-blue-300',   text:'text-blue-700',   pill:'bg-blue-100 border-blue-400 text-blue-800',   active:'bg-blue-600 text-white border-blue-600' },
  red:    { bg:'bg-red-50',    border:'border-red-300',    text:'text-red-700',    pill:'bg-red-100 border-red-400 text-red-800',    active:'bg-red-600 text-white border-red-600' },
  orange: { bg:'bg-orange-50', border:'border-orange-300', text:'text-orange-700', pill:'bg-orange-100 border-orange-400 text-orange-800', active:'bg-orange-500 text-white border-orange-500' },
  violet: { bg:'bg-violet-50', border:'border-violet-300', text:'text-violet-700', pill:'bg-violet-100 border-violet-400 text-violet-800', active:'bg-violet-600 text-white border-violet-600' },
  green:  { bg:'bg-green-50',  border:'border-green-300',  text:'text-green-700',  pill:'bg-green-100 border-green-400 text-green-800',  active:'bg-green-600 text-white border-green-600' },
  teal:   { bg:'bg-teal-50',   border:'border-teal-300',   text:'text-teal-700',   pill:'bg-teal-100 border-teal-400 text-teal-800',   active:'bg-teal-600 text-white border-teal-600' },
  amber:  { bg:'bg-amber-50',  border:'border-amber-300',  text:'text-amber-700',  pill:'bg-amber-100 border-amber-400 text-amber-800',  active:'bg-amber-500 text-white border-amber-500' },
};

function Pills({options,value,onChange,accent='indigo',multi=false}){
  const c=A[accent]; const sel=multi?(Array.isArray(value)?value:[]):value;
  const toggle=opt=>{if(multi){const a=Array.isArray(sel)?sel:[];onChange(a.includes(opt)?a.filter(x=>x!==opt):[...a,opt]);}else onChange(sel===opt?'':opt);};
  return(<div className="flex flex-wrap gap-2">{options.map(opt=>{const active=multi?sel.includes(opt):sel===opt;return<button key={opt} type="button" onClick={()=>toggle(opt)} className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${active?c.active:c.pill}`}>{opt}</button>;})}</div>);
}
function FL({label,sub,children}){return(<div className="space-y-1"><label className="block text-sm font-semibold text-gray-700">{label}{sub&&<span className="ml-1 text-xs font-normal text-gray-500">{sub}</span>}</label>{children}</div>);}
function Gate({label,value,onChange,accent='indigo',children}){
  const c=A[accent];
  return(<div className={`rounded-lg border ${c.border} ${c.bg} p-3`}><div className="flex items-center justify-between flex-wrap gap-2"><span className="text-sm font-medium text-gray-700">{label}</span><div className="flex gap-2">{['Yes','No'].map(opt=>(<button key={opt} type="button" onClick={()=>onChange(value===opt?'':opt)} className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all ${value===opt?c.active:c.pill}`}>{opt}</button>))}</div></div>{value==='Yes'&&children&&<div className="mt-3 space-y-3">{children}</div>}</div>);
}
function Section({title,applicable,onApplicable,accent='indigo',children}){
  const c=A[accent];const[open,setOpen]=useState(true);
  if(applicable==='N/A')return(<div className={`rounded-xl border-2 border-dashed ${c.border} p-4 flex items-center gap-3 opacity-60`}><Lock className="w-5 h-5 text-gray-400"/><span className="text-sm text-gray-500 font-medium">{title} — Not applicable · section locked</span><button type="button" onClick={()=>onApplicable('Applicable')} className="ml-auto text-xs text-blue-600 underline">Unlock</button></div>);
  return(<div className={`rounded-xl border-2 ${c.border} overflow-hidden`}><div className={`${c.bg} px-4 py-3 flex items-center justify-between flex-wrap gap-2`}><span className={`font-bold text-base ${c.text}`}>{title}</span><div className="flex items-center gap-2"><div className="flex gap-1">{['Applicable','N/A'].map(v=>(<button key={v} type="button" onClick={()=>onApplicable(v)} className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold transition-all ${applicable===v?c.active:c.pill}`}>{v}</button>))}</div><button type="button" onClick={()=>setOpen(o=>!o)} className={`${c.text} p-1`}>{open?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</button></div></div>{open&&applicable==='Applicable'&&<div className="p-4 space-y-4">{children}</div>}</div>);
}

/* ── CHA₂DS₂-VASc items ── */
const CHADS_ITEMS=[
  {key:'chf',    label:'C — Congestive HF or LV dysfunction (EF<40%)', pts:1},
  {key:'htn',    label:'H — Hypertension (treated or untreated)', pts:1},
  {key:'age75',  label:'A₂ — Age ≥75 years', pts:2},
  {key:'dm',     label:'D — Diabetes mellitus', pts:1},
  {key:'stroke', label:'S₂ — Stroke / TIA / thromboembolism', pts:2},
  {key:'vasc',   label:'V — Vascular disease (prior MI, PAD, aortic plaque)', pts:1},
  {key:'age6574',label:'A — Age 65–74 years (if not already ≥75)', pts:1},
  {key:'female', label:'Sc — Female sex', pts:1},
];

/* ── HAS-BLED items ── */
const HASBLED_ITEMS=[
  {key:'hbp',    label:'H — Uncontrolled hypertension (SBP>160)', pts:1},
  {key:'renal',  label:'A — Abnormal renal function (dialysis/Cr>200/transplant)', pts:1},
  {key:'liver',  label:'A — Abnormal liver function (cirrhosis/bilirubin>3× / AST>3×)', pts:1},
  {key:'hstroke',label:'S — Stroke history', pts:1},
  {key:'bleed',  label:'B — Bleeding history or predisposition (anaemia)', pts:1},
  {key:'inr',    label:'L — Labile INR (TTR<60% on Warfarin)', pts:1},
  {key:'elderly',label:'E — Elderly (age>65)', pts:1},
  {key:'drugs',  label:'D — Antiplatelet / NSAIDs use', pts:1},
  {key:'alcohol',label:'D — Alcohol (≥8 drinks/week)', pts:1},
];

const STAGES=['History & Presentation','ECG & Classification','CHA₂DS₂-VASc Score','HAS-BLED Score','Rate vs Rhythm Control','Anticoagulation'];

export default function AtrialFibrillationForm({patientId,encounterId,onSaved}){
  const[stage,setStage]=useState(0);
  const[sec,setSec]=useState({history:'Applicable',ecg:'Applicable',chads:'Applicable',hasbled:'Applicable',rate:'Applicable',anticoag:'Applicable'});
  const sa=(k,v)=>setSec(s=>({...s,[k]:v}));

  /* Stage 0 */
  const[age,setAge]=useState('');const[sex,setSex]=useState('');
  const[afType,setAfType]=useState('');const[afDuration,setAfDuration]=useState('');
  const[symptoms,setSymptoms]=useState([]);const[eacsScore,setEacsScore]=useState('');
  const[trigger,setTrigger]=useState([]);
  const[priorHistory,setPriorHistory]=useState([]);

  /* Stage 1 */
  const[sbp,setSbp]=useState('');const[hr,setHr]=useState('');const[spo2,setSpo2]=useState('');
  const[ecgConfirmed,setEcgConfirmed]=useState('');
  const[ecgRateControl,setEcgRateControl]=useState('');
  const[echoFindings,setEchoFindings]=useState([]);
  const[laSize,setLaSize]=useState('');const[lvef,setLvef]=useState('');
  const[tteThrombus,setTteThrombus]=useState('');const[toeRequired,setToeRequired]=useState('');

  /* Stage 2 — CHA₂DS₂-VASc */
  const[chadsFlags,setChadsFlags]=useState({});
  const setC=(k,v)=>setChadsFlags(s=>({...s,[k]:v}));

  /* Stage 3 — HAS-BLED */
  const[hbFlags,setHbFlags]=useState({});
  const setH=(k,v)=>setHbFlags(s=>({...s,[k]:v}));

  /* Stage 4 */
  const[strategy,setStrategy]=useState('');
  const[rateTarget,setRateTarget]=useState('');
  const[rateAgent,setRateAgent]=useState([]);
  const[rhythmMethod,setRhythmMethod]=useState('');
  const[cardioversionType,setCardioversionType]=useState('');
  const[aadAgent,setAadAgent]=useState('');
  const[ablationCandidate,setAblationCandidate]=useState('');

  /* Stage 5 */
  const[anticoagDecision,setAnticoagDecision]=useState('');
  const[oac,setOac]=useState('');
  const[warfarinInr,setWarfarinInr]=useState('');
  const[kidneyCheck,setKidneyCheck]=useState('');
  const[bridging,setBridging]=useState('');
  const[leftAtrialAppendage,setLeftAtrialAppendage]=useState('');

  const[saving,setSaving]=useState(false);const[saved,setSaved]=useState(false);

  /* ── AUTO: CHA₂DS₂-VASc ── */
  const chadsTotal=useMemo(()=>CHADS_ITEMS.reduce((s,{key,pts})=>s+(chadsFlags[key]==='Yes'?pts:0),0),[chadsFlags]);
  const chadsRec=useMemo(()=>{
    const isFemale=chadsFlags['female']==='Yes';
    const score=chadsTotal;
    if(isFemale&&score<=1) return {label:'No anticoagulation (female sex alone = 0 net)',color:'bg-green-100 border-green-400 text-green-800',ac:false};
    if(!isFemale&&score===0) return {label:'No anticoagulation recommended',color:'bg-green-100 border-green-400 text-green-800',ac:false};
    if(!isFemale&&score===1) return {label:'Consider anticoagulation — shared decision',color:'bg-yellow-100 border-yellow-400 text-yellow-800',ac:true};
    return {label:'Anticoagulation RECOMMENDED',color:'bg-red-100 border-red-400 text-red-800 font-bold',ac:true};
  },[chadsTotal,chadsFlags]);

  /* ── AUTO: HAS-BLED ── */
  const hasBledTotal=useMemo(()=>HASBLED_ITEMS.reduce((s,{key,pts})=>s+(hbFlags[key]==='Yes'?pts:0),0),[hbFlags]);
  const hasBledRisk=useMemo(()=>{
    if(hasBledTotal>=3) return {label:`HAS-BLED ${hasBledTotal} — High bleeding risk (address modifiable factors; do not withhold OAC)`,color:'bg-red-100 border-red-400 text-red-800'};
    if(hasBledTotal===2) return {label:`HAS-BLED ${hasBledTotal} — Moderate bleeding risk`,color:'bg-orange-100 border-orange-400 text-orange-800'};
    return {label:`HAS-BLED ${hasBledTotal} — Low bleeding risk`,color:'bg-green-100 border-green-400 text-green-800'};
  },[hasBledTotal]);

  /* ── AUTO: urgent alerts ── */
  const urgentAlerts=useMemo(()=>{
    const a=[];
    if(Number(hr)>150&&hr) a.push(`HR ${hr} bpm — Rapid AF. Rate control urgently. Consider electrical cardioversion if haemodynamically unstable`);
    if(Number(sbp)<90&&sbp) a.push('Hypotension — haemodynamically unstable AF. Emergency DC cardioversion (if AF-related)');
    if(afDuration==='<48 hours' && strategy?.includes('cardioversion')) a.push('AF <48h duration — cardioversion without prior anticoagulation may be performed. Anticoagulate post-cardioversion for ≥4 weeks');
    if(afDuration?.includes('>48')&&strategy?.includes('cardioversion')&&!toeRequired?.includes('TOE clear')) a.push('AF >48h / unknown duration — exclude LA thrombus (TOE) before cardioversion OR anticoagulate ≥3 weeks before cardioversion');
    return a;
  },[hr,sbp,afDuration,strategy,toeRequired]);

  const handleSave=async()=>{
    setSaving(true);
    try{
      await api.post('/assessments',{type:'af_assessment',patientId,encounterId,
        data:{history:{age,sex,afType,afDuration,symptoms,eacsScore,trigger,priorHistory},
          ecg:{sbp,hr,spo2,ecgConfirmed,ecgRateControl,echoFindings,laSize,lvef,tteThrombus,toeRequired},
          chads:{flags:chadsFlags,total:chadsTotal,recommendation:chadsRec},
          hasbled:{flags:hbFlags,total:hasBledTotal,risk:hasBledRisk},
          rateRhythm:{strategy,rateTarget,rateAgent,rhythmMethod,cardioversionType,aadAgent,ablationCandidate},
          anticoag:{anticoagDecision,oac,warfarinInr,kidneyCheck,bridging,leftAtrialAppendage},
        },
      });
      setSaved(true);onSaved?.();
    }catch(e){console.error(e);}finally{setSaving(false);}
  };

  const CheckItem=({label,pts,value,onChange})=>(
    <div className={`flex items-center justify-between px-4 py-2.5 rounded-lg border-2 transition-all ${value==='Yes'?'border-indigo-500 bg-indigo-50':'border-gray-200'}`}>
      <span className="text-sm font-medium flex-1">{label} <span className="text-xs text-gray-400 font-normal">(+{pts})</span></span>
      <div className="flex gap-2 ml-3">{['Yes','No'].map(opt=><button key={opt} type="button" onClick={()=>onChange(value===opt?'':opt)} className={`px-3 py-1 rounded-full border text-xs font-bold transition-all ${value===opt?(opt==='Yes'?'bg-indigo-600 text-white border-indigo-600':'bg-gray-500 text-white border-gray-500'):'bg-indigo-50 border-indigo-300 text-indigo-700'}`}>{opt}</button>)}</div>
    </div>
  );

  const progress=Math.round(((stage+1)/STAGES.length)*100);

  return(
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-indigo-700 to-blue-500 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2"><Activity className="w-8 h-8"/>
          <div><h1 className="text-2xl font-bold">Atrial Fibrillation Assessment</h1>
            <p className="text-indigo-100 text-sm">CHA₂DS₂-VASc · HAS-BLED · Rate vs Rhythm · Anticoagulation</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {chadsTotal>0&&<span className={`px-3 py-1 rounded-full border text-xs font-bold ${chadsRec.color}`}>CHA₂DS₂-VASc {chadsTotal} — {chadsRec.label}</span>}
          {hasBledTotal>0&&<span className={`px-3 py-1 rounded-full border text-xs font-bold ${hasBledRisk.color}`}>{hasBledRisk.label}</span>}
          {afType&&<span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold">{afType}</span>}
        </div>
        {urgentAlerts.length>0&&<div className="mt-2 space-y-1">{urgentAlerts.map((a,i)=><div key={i} className="flex items-start gap-2 px-3 py-1.5 rounded-lg bg-red-900/80 text-white text-xs font-semibold animate-pulse"><AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"/>{a}</div>)}</div>}
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-indigo-600 h-2 rounded-full transition-all" style={{width:`${progress}%`}}/></div>
      <div className="flex flex-wrap gap-2">{STAGES.map((s,i)=><button key={i} type="button" onClick={()=>setStage(i)} className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${stage===i?'bg-indigo-600 text-white border-indigo-600':'bg-indigo-50 border-indigo-300 text-indigo-700'}`}>{i+1}. {s}</button>)}</div>

      {stage===0&&(
        <Section title="History & Presentation" applicable={sec.history} onApplicable={v=>sa('history',v)} accent="indigo">
          <div className="grid grid-cols-3 gap-3">
            <FL label="Age group"><Pills options={['<40','40–60','60–75','>75']} value={age} onChange={setAge} accent="indigo"/></FL>
            <FL label="Sex"><Pills options={['Male','Female']} value={sex} onChange={setSex} accent="indigo"/></FL>
          </div>
          <FL label="AF Type / Pattern">
            {[{v:'First-detected AF',d:'First episode, may be paroxysmal or persistent — unclear'},
              {v:'Paroxysmal AF',d:'Self-terminating within 7 days (usually <48h)'},
              {v:'Persistent AF',d:'Sustained >7 days, or requires cardioversion'},
              {v:'Long-standing persistent AF',d:'>12 months, rhythm control still pursued'},
              {v:'Permanent AF',d:'Rate control accepted; rhythm control not pursued'},
            ].map(({v,d})=>(
              <button key={v} type="button" onClick={()=>setAfType(afType===v?'':v)}
                className={`w-full text-left px-4 py-2 rounded-lg border-2 text-sm transition-all mb-1 ${afType===v?'border-indigo-500 bg-indigo-50 text-indigo-800 font-semibold':'border-gray-200'}`}>
                <span className="font-semibold">{v}</span> — <span className="text-xs text-gray-500">{d}</span>
              </button>
            ))}
          </FL>
          <FL label="Duration of current episode"><Pills options={['<12 hours','12–48 hours','>48 hours','Unknown / chronic','Chronic / permanent']} value={afDuration} onChange={setAfDuration} accent="indigo"/></FL>
          <FL label="Symptoms (EACS)" sub="(multi-select)">
            <Pills options={['None (asymptomatic)','Palpitations','Dyspnoea','Fatigue / reduced exercise tolerance','Dizziness / lightheadedness','Presyncope / syncope','Chest discomfort','Anxiety','Polyuria (ANP release)']}
              value={symptoms} onChange={setSymptoms} accent="indigo" multi/>
          </FL>
          <FL label="EHRA symptom severity"><Pills options={['EHRA I — No symptoms','EHRA II a — Mild (normal daily activity unaffected)','EHRA II b — Moderate (not troubled but activity affected)','EHRA III — Severe (daily activities affected)','EHRA IV — Disabling (normal activity abandoned)']} value={eacsScore} onChange={setEacsScore} accent="indigo"/></FL>
          <FL label="Possible triggers" sub="(multi-select)">
            <Pills options={['Alcohol (common trigger — binge drinking)','Caffeine excess','Physical exertion','Infection/sepsis','Hyperthyroidism','Electrolyte imbalance','Post-cardiac surgery','Sleep deprivation','Emotional stress','Illicit drugs','Festive binge eating + alcohol (holiday heart India)','None identified']}
              value={trigger} onChange={setTrigger} accent="indigo" multi/>
          </FL>
          <FL label="Prior cardiac history" sub="(multi-select)">
            <Pills options={['Hypertensive heart disease','Rheumatic mitral valve disease (very common in India — MS/MR)','Ischaemic cardiomyopathy','Dilated cardiomyopathy','Prior cardiac surgery','Thyrotoxicosis','OSA','No structural heart disease (lone AF)']}
              value={priorHistory} onChange={setPriorHistory} accent="indigo" multi/>
          </FL>
          {priorHistory.includes('Rheumatic mitral valve disease (very common in India — MS/MR)')&&(
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-800 font-semibold">
              <Info className="w-4 h-4 inline mr-1"/>Rheumatic mitral valve disease + AF: high thromboembolic risk. DOACs NOT appropriate — use Warfarin (target INR 2.5–3.5 for MS, 2–3 for MR). CHA₂DS₂-VASc applies to non-valvular AF only.
            </div>
          )}
        </Section>
      )}

      {stage===1&&(
        <Section title="ECG & Echo" applicable={sec.ecg} onApplicable={v=>sa('ecg',v)} accent="blue">
          <div className="grid grid-cols-3 gap-3">
            <FL label="HR on presentation (bpm)"><input type="number" value={hr} onChange={e=>setHr(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="—"/>{Number(hr)>110&&hr&&<p className="text-xs text-red-600 mt-1">Rate uncontrolled (&gt;110 bpm)</p>}</FL>
            <FL label="SBP (mmHg)"><input type="number" value={sbp} onChange={e=>setSbp(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="—"/></FL>
            <FL label="SpO₂ (%)"><input type="number" value={spo2} onChange={e=>setSpo2(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="—"/></FL>
          </div>
          <FL label="AF confirmed on ECG / Holter?"><Pills options={['Yes — 12-lead ECG','Yes — Holter monitor','Yes — cardiac monitor','Yes — implantable loop recorder','Not yet confirmed — awaiting ECG']} value={ecgConfirmed} onChange={setEcgConfirmed} accent="blue"/></FL>
          <FL label="Ventricular rate on ECG"><Pills options={['Controlled (<80 bpm at rest)','Borderline (80–110 bpm)','Fast (110–150 bpm)','Very fast (>150 bpm)','Bradycardia (<50 bpm — AV nodal disease?)']} value={ecgRateControl} onChange={setEcgRateControl} accent="blue"/></FL>
          <FL label="Echo findings" sub="(multi-select)">
            <Pills options={['Normal LV function','Reduced LV function (EF<50%)','LV hypertrophy','Mitral valve disease (rheumatic)','Aortic valve disease','Left atrial dilation','LA thrombus on TTE','No LA thrombus on TTE','Pulmonary hypertension','Pericardial effusion']}
              value={echoFindings} onChange={setEchoFindings} accent="blue" multi/>
          </FL>
          <div className="grid grid-cols-2 gap-3">
            <FL label="LA diameter / volume"><Pills options={['Normal (<4 cm / <34 mL/m²)','Mildly dilated (4–4.6 cm)','Moderately dilated (4.6–5.2 cm)','Severely dilated (>5.2 cm)']} value={laSize} onChange={setLaSize} accent="blue"/></FL>
            <FL label="LVEF (%)"><input type="number" value={lvef} onChange={e=>setLvef(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="—"/></FL>
          </div>
          <Gate label="TOE (Trans-oesophageal echo) required before cardioversion?" value={toeRequired} onChange={setToeRequired} accent="blue">
            <FL label="TOE result"><Pills options={['TOE clear — no LA thrombus (safe to cardiovert)','LA/LAA thrombus found — anticoagulate 3 weeks + repeat TOE','LAA sludge — treat as thrombus','Spontaneous echo contrast — increased risk']} value={tteThrombus} onChange={setTteThrombus} accent="blue"/></FL>
          </Gate>
        </Section>
      )}

      {stage===2&&(
        <Section title="CHA₂DS₂-VASc Score" applicable={sec.chads} onApplicable={v=>sa('chads',v)} accent="violet">
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-xs text-violet-800 mb-2">
            <Info className="w-4 h-4 inline mr-1"/>CHA₂DS₂-VASc: Men — score ≥1 → consider anticoagulation; Women — score ≥2 → recommend anticoagulation (female sex alone not sufficient for anticoagulation). For rheumatic valve disease — Warfarin regardless of score.
          </div>
          <div className="space-y-2">
            {CHADS_ITEMS.map(({key,label,pts})=>(
              <CheckItem key={key} label={label} pts={pts} value={chadsFlags[key]||''} onChange={v=>setC(key,v)}/>
            ))}
          </div>
          {chadsTotal>0&&(
            <div className={`px-4 py-3 rounded-xl border-2 ${chadsRec.color}`}>
              <div className="flex justify-between">
                <span className="text-lg font-bold">CHA₂DS₂-VASc: {chadsTotal}</span>
                <span className="text-sm font-bold">{chadsRec.ac?'OAC RECOMMENDED':'No OAC'}</span>
              </div>
              <p className="text-xs mt-0.5">{chadsRec.label}</p>
            </div>
          )}
        </Section>
      )}

      {stage===3&&(
        <Section title="HAS-BLED Bleeding Risk" applicable={sec.hasbled} onApplicable={v=>sa('hasbled',v)} accent="orange">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-800 mb-2">
            <Info className="w-4 h-4 inline mr-1"/>HAS-BLED ≥3 = High bleeding risk. HIGH BLEEDING RISK IS NOT A REASON TO WITHHOLD OAC — address modifiable risk factors (BP control, stop NSAIDs/antiplatelet if not needed, reduce alcohol). Anticoagulation benefit generally exceeds risk when CHA₂DS₂-VASc ≥2.
          </div>
          <div className="space-y-2">
            {HASBLED_ITEMS.map(({key,label,pts})=>(
              <CheckItem key={key} label={label} pts={pts} value={hbFlags[key]||''} onChange={v=>setH(key,v)}/>
            ))}
          </div>
          {hasBledTotal>0&&(
            <div className={`px-4 py-3 rounded-xl border-2 ${hasBledRisk.color}`}>
              <span className="text-sm font-bold">{hasBledRisk.label}</span>
              {hasBledTotal>=3&&<p className="text-xs mt-1">Modifiable risk factors: control BP, avoid NSAIDs/antiplatelet (unless essential), reduce alcohol, correct anaemia. Ensure labile INR corrected (consider DOAC over Warfarin).</p>}
            </div>
          )}
        </Section>
      )}

      {stage===4&&(
        <Section title="Rate vs Rhythm Control" applicable={sec.rate} onApplicable={v=>sa('rate',v)} accent="teal">
          <FL label="Management Strategy">
            <Pills options={['Rate control (permanent AF / elderly / asymptomatic / failed cardioversion)','Rhythm control (symptomatic / younger / first-detected / HF with AF)','Rhythm control — early (within 1 year of AF onset — EAST-AFNET 4 benefit)']}
              value={strategy} onChange={setStrategy} accent="teal"/>
          </FL>
          {strategy?.includes('Rate control')&&(
            <>
              <FL label="HR target"><Pills options={['Lenient rate control (<110 bpm at rest — RACE II)','Strict rate control (<80 bpm at rest + <110 on exercise)','Lenient initially then reassess symptoms']} value={rateTarget} onChange={setRateTarget} accent="teal"/></FL>
              <FL label="Rate control agent(s)" sub="(multi-select)">
                <Pills options={['Beta-blocker (Metoprolol/Bisoprolol) — first-line (not if COPD/asthma)','Verapamil / Diltiazem — if beta-blocker contraindicated (not if HFrEF)','Digoxin — adjunct (elderly, sedentary, HFrEF, AF+HF) — low cost India','Amiodarone (acute rate control refractory to above)','Combination beta-blocker + digoxin']}
                  value={rateAgent} onChange={setRateAgent} accent="teal" multi/>
              </FL>
            </>
          )}
          {strategy?.includes('Rhythm control')&&(
            <>
              <FL label="Rhythm control method"><Pills options={['Pharmacological cardioversion (if <7 days)','Electrical cardioversion (DC cardioversion)','Anti-arrhythmic drug (AAD) — maintenance','Catheter ablation (pulmonary vein isolation — PVI)']} value={rhythmMethod} onChange={setRhythmMethod} accent="teal"/></FL>
              {rhythmMethod?.includes('cardioversion')&&(
                <FL label="Cardioversion type"><Pills options={['Synchronised DC cardioversion (preferred — 200J biphasic)','IV Flecainide (pill-in-pocket — no structural HD)','IV Vernakalant (if available — rapid pharmacological)','Oral Flecainide loading (200–300 mg for acute termination)','Amiodarone IV (structural HD / HF)']} value={cardioversionType} onChange={setCardioversionType} accent="teal"/></FL>
              )}
              {rhythmMethod?.includes('Anti-arrhythmic')&&(
                <FL label="AAD for maintenance">
                  <Pills options={['Flecainide (no structural HD / normal LV function)','Propafenone (no structural HD)','Sotalol (no significant LVH / HF — monitor QT)','Amiodarone (structural HD / HF — most effective but toxicity)','Dronedarone (stable HF / recent decompensation CI)']}
                    value={aadAgent} onChange={setAadAgent} accent="teal"/>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mt-1 text-xs text-amber-800">India: Amiodarone widely used due to efficacy and cost. Monitor TFTs, LFTs, CXR, corneal microdeposits annually. Amiodarone pulmonary toxicity rare but serious.</div>
                </FL>
              )}
              <Gate label="Catheter ablation candidate?" value={ablationCandidate} onChange={setAblationCandidate} accent="teal">
                <p className="text-xs text-teal-700">AF ablation (PVI): superior to AAD for rhythm control in symptomatic paroxysmal/persistent AF (CABANA, CASTLE-AF if HFrEF). Available in major Indian centres (AIIMS, PGI, Apollo, Fortis). Continue OAC ≥2 months post-ablation (regardless of CHA₂DS₂-VASc).</p>
              </Gate>
            </>
          )}
        </Section>
      )}

      {stage===5&&(
        <Section title="Anticoagulation" applicable={sec.anticoag} onApplicable={v=>sa('anticoag',v)} accent="green">
          <FL label="Anticoagulation Decision">
            <Pills options={['OAC recommended (CHA₂DS₂-VASc ≥1 M / ≥2 F)','OAC not indicated (CHA₂DS₂-VASc 0 M / ≤1 F)','OAC recommended — valvular AF (Warfarin only — mechanical valve / rheumatic MS)','OAC withheld — high bleeding risk (document reasons + reassess)']}
              value={anticoagDecision} onChange={setAnticoagDecision} accent="green"/>
          </FL>
          <FL label="OAC agent choice">
            <Pills options={['Apixaban 5 mg BD (preferred — ARISTOTLE; best bleeding profile)','Apixaban 2.5 mg BD (reduced dose if ≥2 of: age≥80, weight≤60kg, Cr≥133)','Rivaroxaban 20 mg OD with evening meal','Dabigatran 150 mg BD (superior efficacy; avoid if eGFR<30)','Dabigatran 110 mg BD (if age>80 / high bleeding risk / on verapamil)','Edoxaban 60 mg OD (30 mg if eGFR 15–50 / weight≤60kg / P-gp inhibitor)','Warfarin (INR 2–3) — valvular AF / mechanical valve / CKD5/dialysis / antiphospholipid','Warfarin INR 2.5–3.5 — mechanical prosthetic valve']}
              value={oac} onChange={setOac} accent="green"/>
          </FL>
          {oac?.includes('Warfarin')&&(
            <FL label="INR target range / monitoring"><Pills options={['INR 2.0–3.0 (non-valvular AF / bioprosthetic)','INR 2.5–3.0 (rheumatic MS)','INR 2.5–3.5 (mechanical mitral valve)','INR 2.0–3.0 (mechanical aortic valve, low risk)','TTR (Time in Therapeutic Range) — aim >70%']} value={warfarinInr} onChange={setWarfarinInr} accent="green"/></FL>
          )}
          <FL label="Renal function check before DOAC">
            <Pills options={['eGFR >60 — full DOAC dose appropriate','eGFR 30–60 — dose-reduce (check individual DOAC criteria)','eGFR 15–30 — use with caution (apixaban preferred)','eGFR <15 / dialysis — Warfarin preferred (DOACs not licensed)','Not checked yet']}
              value={kidneyCheck} onChange={setKidneyCheck} accent="green"/>
          </FL>
          <Gate label="Bridging anticoagulation required? (peri-procedure / cardioversion)" value={bridging} onChange={setBridging} accent="green">
            <p className="text-xs text-green-700">Bridging with LMWH (Enoxaparin): if Warfarin held for procedure AND CHA₂DS₂-VASc ≥2. DOACs generally do NOT require bridging — resume as soon as haemostasis achieved. For cardioversion: ensure OAC ≥3 weeks before OR TOE to exclude LA thrombus.</p>
          </Gate>
          <Gate label="Left atrial appendage occlusion (LAAO — Watchman device) considered?" value={leftAtrialAppendage} onChange={setLeftAtrialAppendage} accent="teal">
            <p className="text-xs text-teal-700">LAAO (Watchman/Amulet): for patients with high stroke risk + absolute contraindication to OAC (major bleeding history, falls risk, non-compliance). Available in select Indian centres. Discuss with interventional cardiologist.</p>
          </Gate>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <Info className="w-4 h-4 inline mr-1"/>India context: Warfarin is cheapest and widely available. INR monitoring at nearest PHC/lab. DOACs (apixaban/rivaroxaban) — generic brands available (Eliquis/Xarelto generics). Dabigatran not on NLEM. OAC compliance counselling essential — many patients stop OAC after 1 year.
          </div>
        </Section>
      )}

      <div className="flex items-center justify-between pt-2">
        <button type="button" disabled={stage===0} onClick={()=>setStage(s=>s-1)} className="px-4 py-2 rounded-lg border border-indigo-300 text-indigo-700 text-sm font-semibold disabled:opacity-40">← Previous</button>
        <span className="text-xs text-gray-500">Stage {stage+1} of {STAGES.length}</span>
        {stage<STAGES.length-1?<button type="button" onClick={()=>setStage(s=>s+1)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold">Next →</button>
          :<button type="button" onClick={handleSave} disabled={saving||saved} className="px-6 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center gap-2">{saved?<><CheckCircle className="w-4 h-4"/>Saved</>:saving?'Saving…':'Save Assessment'}</button>}
      </div>
    </div>
  );
}
