/**
 * @shared-pool
 * ACSAssessmentForm — Acute Coronary Syndrome assessment
 * STEMI/NSTEMI/UA auto-classification, GRACE score, Killip class, reperfusion strategy
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */

import React, { useState, useMemo } from 'react';
import { Zap, Lock, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  red:    { bg:'bg-red-50',    border:'border-red-300',    text:'text-red-700',    pill:'bg-red-100 border-red-400 text-red-800',    active:'bg-red-600 text-white border-red-600' },
  orange: { bg:'bg-orange-50', border:'border-orange-300', text:'text-orange-700', pill:'bg-orange-100 border-orange-400 text-orange-800', active:'bg-orange-500 text-white border-orange-500' },
  amber:  { bg:'bg-amber-50',  border:'border-amber-300',  text:'text-amber-700',  pill:'bg-amber-100 border-amber-400 text-amber-800',  active:'bg-amber-500 text-white border-amber-500' },
  blue:   { bg:'bg-blue-50',   border:'border-blue-300',   text:'text-blue-700',   pill:'bg-blue-100 border-blue-400 text-blue-800',   active:'bg-blue-600 text-white border-blue-600' },
  violet: { bg:'bg-violet-50', border:'border-violet-300', text:'text-violet-700', pill:'bg-violet-100 border-violet-400 text-violet-800', active:'bg-violet-600 text-white border-violet-600' },
  green:  { bg:'bg-green-50',  border:'border-green-300',  text:'text-green-700',  pill:'bg-green-100 border-green-400 text-green-800',  active:'bg-green-600 text-white border-green-600' },
  teal:   { bg:'bg-teal-50',   border:'border-teal-300',   text:'text-teal-700',   pill:'bg-teal-100 border-teal-400 text-teal-800',   active:'bg-teal-600 text-white border-teal-600' },
  rose:   { bg:'bg-rose-50',   border:'border-rose-300',   text:'text-rose-700',   pill:'bg-rose-100 border-rose-400 text-rose-800',   active:'bg-rose-600 text-white border-rose-600' },
};

function Pills({options,value,onChange,accent='red',multi=false}){
  const c=A[accent]; const sel=multi?(Array.isArray(value)?value:[]):value;
  const toggle=opt=>{if(multi){const a=Array.isArray(sel)?sel:[];onChange(a.includes(opt)?a.filter(x=>x!==opt):[...a,opt]);}else onChange(sel===opt?'':opt);};
  return(<div className="flex flex-wrap gap-2">{options.map(opt=>{const active=multi?sel.includes(opt):sel===opt;return<button key={opt} type="button" onClick={()=>toggle(opt)} className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${active?c.active:c.pill}`}>{opt}</button>;})}</div>);
}
function FL({label,sub,children}){return(<div className="space-y-1"><label className="block text-sm font-semibold text-gray-700">{label}{sub&&<span className="ml-1 text-xs font-normal text-gray-500">{sub}</span>}</label>{children}</div>);}
function Gate({label,value,onChange,accent='red',children}){
  const c=A[accent];
  return(<div className={`rounded-lg border ${c.border} ${c.bg} p-3`}><div className="flex items-center justify-between flex-wrap gap-2"><span className="text-sm font-medium text-gray-700">{label}</span><div className="flex gap-2">{['Yes','No'].map(opt=>(<button key={opt} type="button" onClick={()=>onChange(value===opt?'':opt)} className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all ${value===opt?c.active:c.pill}`}>{opt}</button>))}</div></div>{value==='Yes'&&children&&<div className="mt-3 space-y-3">{children}</div>}</div>);
}
function Section({title,applicable,onApplicable,accent='red',children}){
  const c=A[accent];const[open,setOpen]=useState(true);
  if(applicable==='N/A')return(<div className={`rounded-xl border-2 border-dashed ${c.border} p-4 flex items-center gap-3 opacity-60`}><Lock className="w-5 h-5 text-gray-400"/><span className="text-sm text-gray-500 font-medium">{title} — Not applicable · section locked</span><button type="button" onClick={()=>onApplicable('Applicable')} className="ml-auto text-xs text-blue-600 underline">Unlock</button></div>);
  return(<div className={`rounded-xl border-2 ${c.border} overflow-hidden`}><div className={`${c.bg} px-4 py-3 flex items-center justify-between flex-wrap gap-2`}><span className={`font-bold text-base ${c.text}`}>{title}</span><div className="flex items-center gap-2"><div className="flex gap-1">{['Applicable','N/A'].map(v=>(<button key={v} type="button" onClick={()=>onApplicable(v)} className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold transition-all ${applicable===v?c.active:c.pill}`}>{v}</button>))}</div><button type="button" onClick={()=>setOpen(o=>!o)} className={`${c.text} p-1`}>{open?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</button></div></div>{open&&applicable==='Applicable'&&<div className="p-4 space-y-4">{children}</div>}</div>);
}

/* ── GRACE score tables ── */
const GRACE_AGE    = [['<40',0],['40–49',18],['50–59',36],['60–69',55],['70–79',73],['≥80',91]];
const GRACE_HR     = [['<70',0],['70–89',7],['90–109',13],['110–149',23],['150–199',36],['≥200',46]];
const GRACE_SBP    = [['<80',63],['80–99',58],['100–119',47],['120–139',37],['140–159',26],['160–199',11],['≥200',0]];
const GRACE_CREAT  = [['0–34 µmol/L',2],['35–69',5],['70–104',8],['105–139',11],['140–174',14],['175–353',23],['≥354',31]];
const GRACE_KILLIP = [['Killip I — No HF signs',0],['Killip II — Mild HF (crackles/JVP/S3)',21],['Killip III — Pulmonary oedema',43],['Killip IV — Cardiogenic shock',64]];

const STAGES=['Presentation','ECG & Haemodynamics','GRACE Score','Investigations','Reperfusion & Acute Rx','Secondary Prevention'];

export default function ACSAssessmentForm({patientId,encounterId,onSaved}){
  const[stage,setStage]=useState(0);
  const[sec,setSec]=useState({present:'Applicable',ecg:'Applicable',grace:'Applicable',ix:'Applicable',reperfusion:'Applicable',secondary:'Applicable'});
  const sa=(k,v)=>setSec(s=>({...s,[k]:v}));

  /* Stage 0 */
  const[ageGroup,setAgeGroup]=useState('');const[sex,setSex]=useState('');
  const[onset,setOnset]=useState('');const[presenting,setPresenting]=useState([]);
  const[steOnEcg,setSteOnEcg]=useState('');const[newLbbb,setNewLbbb]=useState('');
  const[tropPositive,setTropPositive]=useState('');
  const[priorCvHistory,setPriorCvHistory]=useState([]);
  const[riskFactors,setRiskFactors]=useState([]);

  /* Stage 1 */
  const[sbp,setSbp]=useState('');const[dbp,setDbp]=useState('');
  const[hr,setHr]=useState('');const[spo2,setSpo2]=useState('');
  const[killip,setKillip]=useState('');
  const[ecgRhythm,setEcgRhythm]=useState('');
  const[steLoc,setSteLoc]=useState([]);
  const[stdLoc,setStdLoc]=useState([]);
  const[tWave,setTWave]=useState('');const[qWaves,setQWaves]=useState('');

  /* Stage 2 — GRACE */
  const[gAge,setGAge]=useState(null);const[gHr,setGHr]=useState(null);
  const[gSbp,setGSbp]=useState(null);const[gCreat,setGCreat]=useState(null);
  const[gKillip,setGKillip]=useState(null);
  const[gArrest,setGArrest]=useState('');
  const[gStDev,setGStDev]=useState('');
  const[gTrop,setGTrop]=useState('');

  /* Stage 3 */
  const[trop1,setTrop1]=useState('');const[trop2,setTrop2]=useState('');
  const[tropDelta,setTropDelta]=useState('');
  const[ckMb,setCkMb]=useState('');const[hb,setHb]=useState('');
  const[potassium,setPotassium]=useState('');const[creatinine,setCreatinine]=useState('');
  const[egfr,setEgfr]=useState('');const[glucose,setGlucose]=useState('');
  const[echoEf,setEchoEf]=useState('');const[echoFindings,setEchoFindings]=useState([]);
  const[angio,setAngio]=useState('');const[culpritVessel,setCulpritVessel]=useState('');
  const[timiFlowPre,setTimiFlowPre]=useState('');const[timiFlowPost,setTimiFlowPost]=useState('');
  const[mvd,setMvd]=useState('');

  /* Stage 4 */
  const[reperfStrategy,setReperfStrategy]=useState('');
  const[thrombolytic,setThrombolytic]=useState('');
  const[dtb,setDtb]=useState('');
  const[stentType,setStentType]=useState('');
  const[completeRevasc,setCompleteRevasc]=useState('');
  const[noReflow,setNoReflow]=useState('');
  const[acuteMeds,setAcuteMeds]=useState([]);
  const[complications,setComplications]=useState([]);

  /* Stage 5 */
  const[dapt,setDapt]=useState('');
  const[p2y12,setP2y12]=useState('');
  const[longTermMeds,setLongTermMeds]=useState([]);
  const[lipidTarget,setLipidTarget]=useState('');
  const[cardiacRehab,setCardiacRehab]=useState('');
  const[pmjay,setPmjay]=useState('');

  const[saving,setSaving]=useState(false);const[saved,setSaved]=useState(false);

  /* ── AUTO: ACS type ── */
  const acsType=useMemo(()=>{
    if(steOnEcg==='Yes'||newLbbb==='Yes') return {label:'STEMI',color:'bg-red-200 border-red-600 text-red-900 animate-pulse',urgent:true};
    if(steOnEcg==='No'&&tropPositive==='Yes') return {label:'NSTEMI',color:'bg-orange-100 border-orange-500 text-orange-900',urgent:true};
    if(steOnEcg==='No'&&tropPositive==='No') return {label:'Unstable Angina',color:'bg-yellow-100 border-yellow-500 text-yellow-900',urgent:false};
    return null;
  },[steOnEcg,newLbbb,tropPositive]);

  /* ── AUTO: GRACE score ── */
  const graceTotal=useMemo(()=>{
    if([gAge,gHr,gSbp,gCreat,gKillip].some(v=>v===null)) return null;
    let s=gAge+gHr+gSbp+gCreat+gKillip;
    if(gArrest==='Yes') s+=43;
    if(gStDev==='Yes') s+=30;
    if(gTrop==='Yes') s+=15;
    return s;
  },[gAge,gHr,gSbp,gCreat,gKillip,gArrest,gStDev,gTrop]);

  const graceRisk=useMemo(()=>{
    if(graceTotal===null) return null;
    if(graceTotal<=108) return {label:'Low Risk',inHosp:'<1%',sixMonth:'<3%',timing:'Conservative or invasive at discretion (>72h)',color:'bg-green-100 border-green-400 text-green-800'};
    if(graceTotal<=140) return {label:'Intermediate Risk',inHosp:'1–3%',sixMonth:'3–8%',timing:'Early invasive within 24–72h',color:'bg-orange-100 border-orange-400 text-orange-800'};
    return {label:'High Risk',inHosp:'>3%',sixMonth:'>8%',timing:'Urgent early invasive within 24h',color:'bg-red-100 border-red-500 text-red-800 animate-pulse'};
  },[graceTotal]);

  /* ── AUTO: urgent alerts ── */
  const urgentAlerts=useMemo(()=>{
    const a=[];
    if(acsType?.label==='STEMI') a.push('STEMI — ACTIVATE CATH LAB. Door-to-balloon <90 min target. Thrombolysis if PCI unavailable within 120 min');
    if(newLbbb==='Yes') a.push('New LBBB — Treat as STEMI equivalent. Activate Cath Lab');
    if(killip?.includes('IV')) a.push('Killip IV — Cardiogenic shock. ICU, vasopressors (Noradrenaline), consider IABP/Impella. Immediate PCI');
    if(killip?.includes('III')) a.push('Killip III — Pulmonary oedema. IV furosemide, CPAP/NIV, urgent PCI');
    if(graceTotal>140) a.push(`GRACE ${graceTotal} — High risk. Urgent angiography within 24h`);
    if(Number(spo2)<92&&spo2) a.push(`SpO₂ ${spo2}% — oxygen supplementation, consider NIV`);
    return a;
  },[acsType,newLbbb,killip,graceTotal,spo2]);

  const handleSave=async()=>{
    setSaving(true);
    try{
      await api.post('/assessments',{type:'acs_assessment',patientId,encounterId,
        data:{presentation:{ageGroup,sex,onset,presenting,steOnEcg,newLbbb,tropPositive,acsType,priorCvHistory,riskFactors},
          ecg:{sbp,dbp,hr,spo2,killip,ecgRhythm,steLoc,stdLoc,tWave,qWaves},
          grace:{gAge,gHr,gSbp,gCreat,gKillip,gArrest,gStDev,gTrop,graceTotal,graceRisk},
          investigations:{trop1,trop2,tropDelta,ckMb,hb,potassium,creatinine,egfr,glucose,echoEf,echoFindings,angio,culpritVessel,timiFlowPre,timiFlowPost,mvd},
          reperfusion:{reperfStrategy,thrombolytic,dtb,stentType,completeRevasc,noReflow,acuteMeds,complications},
          secondary:{dapt,p2y12,longTermMeds,lipidTarget,cardiacRehab,pmjay},
        },
      });
      setSaved(true);onSaved?.();
    }catch(e){console.error(e);}finally{setSaving(false);}
  };

  const progress=Math.round(((stage+1)/STAGES.length)*100);

  const ScoreRow=({label,options,selected,onSelect})=>(
    <div className="space-y-1">
      <p className="text-xs font-semibold text-gray-600">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([lbl,pts])=>(
          <button key={lbl} type="button" onClick={()=>onSelect(selected===pts?null:pts)}
            className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-all
              ${selected===pts?'bg-red-600 text-white border-red-600':'bg-red-50 border-red-200 text-red-700'}`}>
            {lbl} <span className="font-bold">({pts>0?'+':''}{pts})</span>
          </button>
        ))}
      </div>
    </div>
  );

  return(
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-red-800 to-orange-600 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2"><Zap className="w-8 h-8"/>
          <div><h1 className="text-2xl font-bold">ACS Assessment</h1>
            <p className="text-red-100 text-sm">STEMI/NSTEMI/UA · GRACE Score · Killip · Reperfusion strategy</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {acsType&&<span className={`px-3 py-1 rounded-full border text-sm font-bold ${acsType.color}`}>{acsType.label}</span>}
          {graceTotal!==null&&<span className={`px-3 py-1 rounded-full border text-xs font-bold ${graceRisk?.color}`}>GRACE {graceTotal} — {graceRisk?.label} (in-hosp mort {graceRisk?.inHosp})</span>}
          {killip&&<span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold">{killip.split('—')[0].trim()}</span>}
        </div>
        {urgentAlerts.length>0&&<div className="mt-2 space-y-1">{urgentAlerts.map((a,i)=><div key={i} className="flex items-start gap-2 px-3 py-1.5 rounded-lg bg-red-900/80 text-white text-xs font-semibold animate-pulse"><AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"/>{a}</div>)}</div>}
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-red-700 h-2 rounded-full transition-all" style={{width:`${progress}%`}}/></div>
      <div className="flex flex-wrap gap-2">{STAGES.map((s,i)=><button key={i} type="button" onClick={()=>setStage(i)} className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${stage===i?'bg-red-700 text-white border-red-700':'bg-red-50 border-red-300 text-red-700'}`}>{i+1}. {s}</button>)}</div>

      {stage===0&&(
        <Section title="Presentation & Classification" applicable={sec.present} onApplicable={v=>sa('present',v)} accent="red">
          <div className="grid grid-cols-3 gap-3">
            <FL label="Age group"><Pills options={['<40','40–49','50–59','60–69','70–79','≥80']} value={ageGroup} onChange={setAgeGroup} accent="red"/></FL>
            <FL label="Sex"><Pills options={['Male','Female','Other']} value={sex} onChange={setSex} accent="red"/></FL>
            <FL label="Symptom onset"><Pills options={['<12 h','12–24 h','24–48 h','>48 h','Uncertain']} value={onset} onChange={setOnset} accent="red"/></FL>
          </div>
          <FL label="Presenting symptoms" sub="(multi-select)">
            <Pills options={['Central chest pain','Atypical/epigastric pain','Dyspnoea alone','Cardiac arrest','Syncope','Left arm/jaw pain','Palpitations','Asymptomatic ECG finding']}
              value={presenting} onChange={setPresenting} accent="red" multi/>
          </FL>
          <div className="grid grid-cols-3 gap-3">
            <FL label="ST elevation on ECG?"><Pills options={['Yes','No','Equivocal']} value={steOnEcg} onChange={setSteOnEcg} accent="red"/></FL>
            <FL label="New LBBB?"><Pills options={['Yes','No','Unknown']} value={newLbbb} onChange={setNewLbbb} accent="red"/></FL>
            <FL label="Troponin elevated?"><Pills options={['Yes','No','Awaiting']} value={tropPositive} onChange={setTropPositive} accent="orange"/></FL>
          </div>
          {acsType&&<div className={`px-4 py-3 rounded-xl border-2 text-base font-bold text-center ${acsType.color}`}>{acsType.label} {acsType.urgent?'— URGENT MANAGEMENT REQUIRED':''}</div>}
          <FL label="Prior CV history" sub="(multi-select)">
            <Pills options={['No prior history','Prior MI','Prior PCI/stent','Prior CABG','Known CAD (>50% stenosis)','PAD','Stroke/TIA','Heart failure']}
              value={priorCvHistory} onChange={setPriorCvHistory} accent="orange" multi/>
          </FL>
          <FL label="Risk factors" sub="(multi-select)">
            <Pills options={['Hypertension','Diabetes mellitus','Dyslipidaemia','Active smoker','Ex-smoker','Family history premature CAD','Obesity','CKD','Hypothyroidism']}
              value={riskFactors} onChange={setRiskFactors} accent="orange" multi/>
          </FL>
        </Section>
      )}

      {stage===1&&(
        <Section title="ECG & Haemodynamics" applicable={sec.ecg} onApplicable={v=>sa('ecg',v)} accent="orange">
          <div className="grid grid-cols-3 gap-3">
            {[['SBP (mmHg)',sbp,setSbp],['DBP (mmHg)',dbp,setDbp],['HR (bpm)',hr,setHr],['SpO₂ (%)',spo2,setSpo2]].map(([l,v,s])=>(
              <FL key={l} label={l}><input type="number" value={v} onChange={e=>s(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="—"/></FL>
            ))}
          </div>
          <FL label="Killip Class">
            <Pills options={['Killip I — No HF signs','Killip II — Mild HF (crackles/JVP/S3)','Killip III — Pulmonary oedema','Killip IV — Cardiogenic shock (SBP<90 + hypoperfusion)']}
              value={killip} onChange={setKillip} accent="orange"/>
          </FL>
          <FL label="ECG Rhythm"><Pills options={['Sinus rhythm','Sinus tachycardia','AF','AV block (1st)','AV block (2nd Mobitz I)','AV block (2nd Mobitz II)','Complete AV block (3rd)','VT','VF','Paced']} value={ecgRhythm} onChange={setEcgRhythm} accent="orange"/></FL>
          {steOnEcg==='Yes'&&(
            <FL label="STE location" sub="(multi-select — determines culprit territory)">
              <Pills options={['V1–V4 (anterior — LAD)','V5–V6, I, aVL (lateral — LCX)','II, III, aVF (inferior — RCA/LCX)','V7–V9 (posterior — LCX/RCA)','V3R–V4R (right ventricle — proximal RCA)','aVR (LMCA/proximal LAD — diffuse depression + aVR STE)','Diffuse ST elevation (pericarditis pattern)']}
                value={steLoc} onChange={setSteLoc} accent="red" multi/>
            </FL>
          )}
          <FL label="ST depression location" sub="(multi-select — ischaemia or reciprocal)">
            <Pills options={['None','Anterior (V1–V4)','Inferior (II,III,aVF)','Lateral (I,aVL,V5–V6)','Diffuse','Reciprocal only']} value={stdLoc} onChange={setStdLoc} accent="orange" multi/>
          </FL>
          <FL label="T-wave changes"><Pills options={['Normal','Hyperacute T-waves (tall peaked)','Wellens Type A (biphasic V2–V3)','Wellens Type B (deep symmetric inversion V2–V3)','De Winter T-waves (LAD occlusion equivalent)','T-wave inversion anterior','T-wave inversion inferior','T-wave inversion lateral','Diffuse inversion','Normal T-waves']} value={tWave} onChange={setTWave} accent="orange"/></FL>
          <FL label="Q waves"><Pills options={['None','Old inferior Q waves','Old anterior Q waves','Old lateral Q waves','New Q waves (evolving MI)']} value={qWaves} onChange={setQWaves} accent="orange"/></FL>
        </Section>
      )}

      {stage===2&&(
        <Section title="GRACE Score" applicable={sec.grace} onApplicable={v=>sa('grace',v)} accent="red">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 mb-1">
            <Info className="w-4 h-4 inline mr-1"/>GRACE score: In-hospital mortality — ≤108 Low (&lt;1%), 109–140 Intermediate (1–3%), &gt;140 High (&gt;3%). Select each variable to auto-calculate.
          </div>
          <div className="space-y-4">
            <ScoreRow label="Age" options={GRACE_AGE} selected={gAge} onSelect={setGAge}/>
            <ScoreRow label="Heart Rate (bpm)" options={GRACE_HR} selected={gHr} onSelect={setGHr}/>
            <ScoreRow label="Systolic BP (mmHg)" options={GRACE_SBP} selected={gSbp} onSelect={setGSbp}/>
            <ScoreRow label="Creatinine (µmol/L)" options={GRACE_CREAT} selected={gCreat} onSelect={setGCreat}/>
            <ScoreRow label="Killip Class" options={GRACE_KILLIP} selected={gKillip} onSelect={setGKillip}/>
            <div className="grid grid-cols-3 gap-3">
              <FL label="Cardiac arrest at presentation">
                <div className="flex gap-2">{['Yes (+43)','No (0)'].map(opt=><button key={opt} type="button" onClick={()=>setGArrest(gArrest===opt.split(' ')[0]?'':opt.split(' ')[0])} className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${gArrest===opt.split(' ')[0]?'bg-red-600 text-white border-red-600':'bg-red-50 border-red-300 text-red-700'}`}>{opt}</button>)}</div>
              </FL>
              <FL label="ST deviation on ECG">
                <div className="flex gap-2">{['Yes (+30)','No (0)'].map(opt=><button key={opt} type="button" onClick={()=>setGStDev(gStDev===opt.split(' ')[0]?'':opt.split(' ')[0])} className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${gStDev===opt.split(' ')[0]?'bg-red-600 text-white border-red-600':'bg-red-50 border-red-300 text-red-700'}`}>{opt}</button>)}</div>
              </FL>
              <FL label="Elevated troponin">
                <div className="flex gap-2">{['Yes (+15)','No (0)'].map(opt=><button key={opt} type="button" onClick={()=>setGTrop(gTrop===opt.split(' ')[0]?'':opt.split(' ')[0])} className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${gTrop===opt.split(' ')[0]?'bg-red-600 text-white border-red-600':'bg-red-50 border-red-300 text-red-700'}`}>{opt}</button>)}</div>
              </FL>
            </div>
          </div>
          {graceTotal!==null&&(
            <div className={`px-4 py-3 rounded-xl border-2 ${graceRisk?.color}`}>
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold">GRACE Total: {graceTotal}</span>
                <span className="text-sm font-bold">{graceRisk?.label}</span>
              </div>
              <div className="text-xs mt-1">In-hospital mortality: <strong>{graceRisk?.inHosp}</strong> · 6-month mortality: <strong>{graceRisk?.sixMonth}</strong></div>
              <div className="text-xs mt-0.5 font-semibold">Angiography timing: {graceRisk?.timing}</div>
            </div>
          )}
          {graceTotal!==null&&graceTotal>140&&(
            <div className="bg-red-50 border border-red-400 rounded-lg p-3 text-xs text-red-700 font-semibold flex gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0"/>Very high risk — angiography within 24h. Dual antiplatelet + anticoagulation immediately.
            </div>
          )}
        </Section>
      )}

      {stage===3&&(
        <Section title="Investigations" applicable={sec.ix} onApplicable={v=>sa('ix',v)} accent="violet">
          <div className="grid grid-cols-3 gap-3">
            {[['Troponin T=0',trop1,setTrop1],['Troponin T=1h/3h',trop2,setTrop2],['CK-MB',ckMb,setCkMb],['Hb (g/dL)',hb,setHb],['K (mmol/L)',potassium,setPotassium],['Creatinine (µmol/L)',creatinine,setCreatinine],['eGFR',egfr,setEgfr],['Glucose (mmol/L)',glucose,setGlucose]].map(([l,v,s])=>(
              <FL key={l} label={l}><input type="number" value={v} onChange={e=>s(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="—"/></FL>
            ))}
          </div>
          {trop1&&trop2&&(
            <div className={`px-3 py-2 rounded-lg border text-xs font-semibold
              ${Number(trop2)>Number(trop1)*1.2?'bg-red-50 border-red-400 text-red-700':Number(trop2)<Number(trop1)*0.8?'bg-blue-50 border-blue-300 text-blue-700':'bg-gray-50 border-gray-300 text-gray-700'}`}>
              Troponin delta: {Number(trop2)>Number(trop1)*1.2?'Rising (>20% — NSTEMI pattern)':Number(trop2)<Number(trop1)*0.8?'Falling (peak passed)':'Stable'}
            </div>
          )}
          <FL label="Serial troponin pattern"><Pills options={['Single elevated (on presentation)','Rising pattern (NSTEMI evolving)','Peak + falling (MI pattern)','Persistently elevated (ongoing damage)','Negative ×2 (ACS excluded)','hs-TnI 0h/1h rapid protocol negative']} value={tropDelta} onChange={setTropDelta} accent="violet"/></FL>
          <FL label="Echo LVEF (%)"><input type="number" value={echoEf} onChange={e=>setEchoEf(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="—"/></FL>
          <FL label="Echo findings" sub="(multi-select)">
            <Pills options={['Normal LV function','RWMA anterior (LAD territory)','RWMA inferior (RCA territory)','RWMA lateral (LCX territory)','EF<40%','EF 40–49%','EF≥50%','LV thrombus','Ischaemic MR','Mechanical VSD','Pericardial effusion (Dressler\'s?)']}
              value={echoFindings} onChange={setEchoFindings} accent="violet" multi/>
          </FL>
          <Gate label="Coronary angiography performed?" value={angio} onChange={setAngio} accent="violet">
            <div className="grid grid-cols-2 gap-3">
              <FL label="Culprit vessel"><Pills options={['LAD (Left Anterior Descending)','LCX (Left Circumflex)','RCA (Right Coronary Artery)','LM (Left Main)','Saphenous vein graft','LIMA graft','No culprit identified']} value={culpritVessel} onChange={setCulpritVessel} accent="violet"/></FL>
              <FL label="Multivessel disease?"><Pills options={['Single vessel','2-vessel','3-vessel','Left main disease']} value={mvd} onChange={setMvd} accent="violet"/></FL>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FL label="TIMI flow pre-PCI"><Pills options={['TIMI 0 (no flow)','TIMI 1 (minimal)','TIMI 2 (partial)','TIMI 3 (normal)']} value={timiFlowPre} onChange={setTimiFlowPre} accent="violet"/></FL>
              <FL label="TIMI flow post-PCI"><Pills options={['TIMI 0','TIMI 1','TIMI 2','TIMI 3 (optimal)']} value={timiFlowPost} onChange={setTimiFlowPost} accent="violet"/></FL>
            </div>
          </Gate>
        </Section>
      )}

      {stage===4&&(
        <Section title="Reperfusion & Acute Management" applicable={sec.reperfusion} onApplicable={v=>sa('reperfusion',v)} accent="amber">
          <FL label="Reperfusion / Management Strategy">
            <Pills options={['Primary PCI (preferred if available within 120 min of STEMI)','Pharmacoinvasive — thrombolysis + PCI within 3–24h','Thrombolysis alone (no PCI available)','Urgent PCI within 2h (very high risk NSTEMI)','Early PCI within 24h (high risk NSTEMI — GRACE>140)','PCI within 72h (intermediate risk NSTEMI)','Conservative medical management (low risk / refused PCI)','Not applicable (UA — negative troponin)']}
              value={reperfStrategy} onChange={setReperfStrategy} accent="amber"/>
          </FL>
          {reperfStrategy?.includes('thrombolysis')||reperfStrategy?.includes('Thrombolysis')?(
            <FL label="Thrombolytic agent">
              <Pills options={['Tenecteplase (TNK) — weight-based, single IV bolus (preferred)','Streptokinase 1.5 MU over 60 min (cheapest — widely available India)','Alteplase (tPA) — accelerated regimen','Reteplase — double bolus']}
                value={thrombolytic} onChange={setThrombolytic} accent="amber"/>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mt-1 text-xs text-amber-800">India context: Streptokinase (SK) still widely used at district/taluk hospitals due to cost. Ensure Aspirin + Heparin co-administered. Transfer to PCI centre after thrombolysis (pharmacoinvasive strategy).</div>
            </FL>
          ):null}
          {reperfStrategy?.includes('PCI')&&(
            <>
              <FL label="Door-to-balloon time"><Pills options={['<60 min (excellent)','60–90 min (target)','90–120 min (acceptable)','120–180 min','>180 min','Not measured']} value={dtb} onChange={setDtb} accent="amber"/></FL>
              <div className="grid grid-cols-2 gap-3">
                <FL label="Stent type"><Pills options={['Drug-eluting stent (DES — preferred)','Bare metal stent (BMS — if compliance/bleeding concern)','Balloon angioplasty only','No stent']} value={stentType} onChange={setStentType} accent="amber"/></FL>
                <FL label="Complete revascularisation?"><Pills options={['Complete (all significant lesions treated)','Culprit-only (planned staged)','Culprit-only (no staged planned)','Incomplete (anatomy unsuitable)']} value={completeRevasc} onChange={setCompleteRevasc} accent="amber"/></FL>
              </div>
              <Gate label="No-reflow / slow flow observed?" value={noReflow} onChange={setNoReflow} accent="amber">
                <p className="text-xs text-amber-700">No-reflow: IC adenosine 100–200 µg, IC verapamil, IC nitroprusside, IC glycoprotein IIb/IIIa inhibitor (Abciximab/Eptifibatide). Thrombectomy catheter if large thrombus burden.</p>
              </Gate>
            </>
          )}
          <FL label="Acute medications given" sub="(multi-select)">
            <Pills options={['Aspirin 300 mg loading','Ticagrelor 180 mg (preferred — PLATO trial)','Clopidogrel 600 mg (widely used India — cost-effective)','Prasugrel 60 mg (if PCI, no prior stroke)','UFH IV bolus + infusion','Enoxaparin SC (NSTEMI conservative)','Fondaparinux 2.5 mg SC (NSTEMI)','Bivalirudin (PCI)','GTN sublingual / IV (if not hypotensive)','Morphine 2–4 mg IV (use cautiously — may reduce P2Y12 absorption)','O₂ (only if SpO₂<93%)','Metoprolol IV/oral (if HR fast + stable)','Rosuvastatin 40 mg / Atorvastatin 80 mg','ACEi/ARB (within 24h if EF<40/anterior MI)','IV Furosemide (if pulmonary oedema)','Atropine 0.6–1.2 mg IV (bradycardia)','GPIIb/IIIa inhibitor (Eptifibatide/Abciximab — high thrombus)']}
              value={acuteMeds} onChange={setAcuteMeds} accent="amber" multi/>
          </FL>
          <FL label="Acute complications" sub="(multi-select)">
            <Pills options={['None','Ventricular fibrillation (VF)','Sustained VT','Complete AV block (pacing required)','Acute pulmonary oedema','Cardiogenic shock','Mechanical complication — acute MR','Mechanical complication — VSD','RV infarction (inferior + hypotension + clear lungs + JVP raised)','Pericarditis (Dressler\'s)','Tamponade','Re-infarction','Bleeding complication']}
              value={complications} onChange={setComplications} accent="red" multi/>
          </FL>
          {complications.includes('RV infarction (inferior + hypotension + clear lungs + JVP raised)')&&(
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-800 font-semibold">
              RV infarction: AVOID nitrates, diuretics (preload-dependent). IV fluids (500 mL challenge). Maintain AV synchrony (pacing if AV block). Urgent primary PCI of RCA.
            </div>
          )}
        </Section>
      )}

      {stage===5&&(
        <Section title="Secondary Prevention" applicable={sec.secondary} onApplicable={v=>sa('secondary',v)} accent="green">
          <FL label="DAPT Duration">
            <Pills options={['1 month DES (very high bleeding risk — PRECISE-DAPT)','3 months DES (high bleeding risk)','6 months DES (standard ACS)','12 months (standard ACS — DES)','12 months then ticagrelor 60mg/prasugrel 5mg (high ischaemic risk — PEGASUS/PROMETHEUS)']}
              value={dapt} onChange={setDapt} accent="green"/>
          </FL>
          <FL label="P2Y12 agent (with aspirin)">
            <Pills options={['Ticagrelor 90 mg BD (preferred — superior to clopidogrel)','Clopidogrel 75 mg OD (widely used India — cost/generic availability)','Prasugrel 10 mg OD (if PCI — not prior stroke/TIA, age<75, weight>60kg)','Ticagrelor 60 mg BD (long-term >1 year)']}
              value={p2y12} onChange={setP2y12} accent="green"/>
          </FL>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
            <Info className="w-4 h-4 inline mr-1"/>India context: Clopidogrel is on the NLEM and available free in government hospitals. Ticagrelor has better evidence but costs more — discuss with patient. Generic clopidogrel is a practical choice for adherence in low-income settings.
          </div>
          <FL label="Long-term medications" sub="(multi-select)">
            <Pills options={['Aspirin 75 mg lifelong','High-intensity statin (Rosuvastatin 40 mg or Atorvastatin 40–80 mg)','Beta-blocker (if EF<40% / HTN — Metoprolol/Bisoprolol)','ACE inhibitor (if EF<40% / DM / HTN — Ramipril/Enalapril)','ARB (if ACEi intolerant)','Sacubitril/Valsartan (if EF<40% + HF symptoms)','SGLT2i (if DM or EF<40%)','Spironolactone/Eplerenone (if EF<35% + NYHA II-IV)','Ezetimibe (if LDL not at target on statin)','PCSK9 inhibitor (if LDL >1.4 mmol/L despite max statin + ezetimibe)']}
              value={longTermMeds} onChange={setLongTermMeds} accent="green" multi/>
          </FL>
          <FL label="LDL-C target">
            <Pills options={['<1.4 mmol/L (<55 mg/dL) — ESC very high risk (post-ACS)','<1.0 mmol/L (<40 mg/dL) — ESC extremely high risk (recurrent CV event within 2 years)','<1.8 mmol/L (<70 mg/dL) — ACC/AHA high intensity goal','Not yet assessed']}
              value={lipidTarget} onChange={setLipidTarget} accent="green"/>
          </FL>
          <FL label="Cardiac rehabilitation"><Pills options={['Referred — formal cardiac rehab programme','Advised home-based exercise programme','Not referred (patient declined)','Not available in area']} value={cardiacRehab} onChange={setCardiacRehab} accent="green"/></FL>
          <Gate label="PMJAY / Government scheme for PCI/ACS covered?" value={pmjay} onChange={setPmjay} accent="teal">
            <p className="text-xs text-teal-700">PMJAY covers ACS management + PCI in empanelled hospitals. Ensure Ayushman Bharat card verified. State schemes (e.g. AP Aarogyasri, Tamil Nadu CMCHIS) may also cover. Statin + antiplatelet available free on NLEM at PHC/CHC level.</p>
          </Gate>
        </Section>
      )}

      <div className="flex items-center justify-between pt-2">
        <button type="button" disabled={stage===0} onClick={()=>setStage(s=>s-1)} className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-semibold disabled:opacity-40">← Previous</button>
        <span className="text-xs text-gray-500">Stage {stage+1} of {STAGES.length}</span>
        {stage<STAGES.length-1?<button type="button" onClick={()=>setStage(s=>s+1)} className="px-4 py-2 rounded-lg bg-red-700 text-white text-sm font-semibold">Next →</button>
          :<button type="button" onClick={handleSave} disabled={saving||saved} className="px-6 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center gap-2">{saved?<><CheckCircle className="w-4 h-4"/>Saved</>:saving?'Saving…':'Save Assessment'}</button>}
      </div>
    </div>
  );
}
