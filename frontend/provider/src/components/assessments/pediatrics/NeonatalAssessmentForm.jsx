/**
 * @shared-pool
 * NeonatalAssessmentForm — Newborn assessment
 * APGAR score, Ballard gestational age, Kramer jaundice zones, neonatal sepsis screen
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */

import React, { useState, useMemo } from 'react';
import { Lock, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import api from '../../../api/client';

const A = {
  yellow: { bg:'bg-yellow-50', border:'border-yellow-300', text:'text-yellow-700', pill:'bg-yellow-100 border-yellow-400 text-yellow-800', active:'bg-yellow-500 text-white border-yellow-500' },
  amber:  { bg:'bg-amber-50',  border:'border-amber-300',  text:'text-amber-700',  pill:'bg-amber-100 border-amber-400 text-amber-800',  active:'bg-amber-500 text-white border-amber-500' },
  orange: { bg:'bg-orange-50', border:'border-orange-300', text:'text-orange-700', pill:'bg-orange-100 border-orange-400 text-orange-800', active:'bg-orange-500 text-white border-orange-500' },
  red:    { bg:'bg-red-50',    border:'border-red-300',    text:'text-red-700',    pill:'bg-red-100 border-red-400 text-red-800',    active:'bg-red-600 text-white border-red-600' },
  blue:   { bg:'bg-blue-50',   border:'border-blue-300',   text:'text-blue-700',   pill:'bg-blue-100 border-blue-400 text-blue-800',   active:'bg-blue-600 text-white border-blue-600' },
  green:  { bg:'bg-green-50',  border:'border-green-300',  text:'text-green-700',  pill:'bg-green-100 border-green-400 text-green-800',  active:'bg-green-600 text-white border-green-600' },
  violet: { bg:'bg-violet-50', border:'border-violet-300', text:'text-violet-700', pill:'bg-violet-100 border-violet-400 text-violet-800', active:'bg-violet-600 text-white border-violet-600' },
  gray:   { bg:'bg-gray-50',   border:'border-gray-300',   text:'text-gray-700',   pill:'bg-gray-100 border-gray-400 text-gray-800',   active:'bg-gray-600 text-white border-gray-600' },
};
function Pills({options,value,onChange,accent='yellow',multi=false}){
  const c=A[accent];const sel=multi?(Array.isArray(value)?value:[]):value;
  const toggle=opt=>{if(multi){const a=Array.isArray(sel)?sel:[];onChange(a.includes(opt)?a.filter(x=>x!==opt):[...a,opt]);}else onChange(sel===opt?'':opt);};
  return(<div className="flex flex-wrap gap-2">{options.map(opt=>{const active=multi?sel.includes(opt):sel===opt;return<button key={opt} type="button" onClick={()=>toggle(opt)} className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${active?c.active:c.pill}`}>{opt}</button>;})}</div>);
}
function FL({label,sub,children}){return(<div className="space-y-1"><label className="block text-sm font-semibold text-gray-700">{label}{sub&&<span className="ml-1 text-xs font-normal text-gray-500">{sub}</span>}</label>{children}</div>);}
function Gate({label,value,onChange,accent='yellow',children}){
  const c=A[accent];
  return(<div className={`rounded-lg border ${c.border} ${c.bg} p-3`}><div className="flex items-center justify-between flex-wrap gap-2"><span className="text-sm font-medium text-gray-700">{label}</span><div className="flex gap-2">{['Yes','No'].map(opt=>(<button key={opt} type="button" onClick={()=>onChange(value===opt?'':opt)} className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all ${value===opt?c.active:c.pill}`}>{opt}</button>))}</div></div>{value==='Yes'&&children&&<div className="mt-3 space-y-3">{children}</div>}</div>);
}
function Section({title,applicable,onApplicable,accent='yellow',children}){
  const c=A[accent];const[open,setOpen]=useState(true);
  if(applicable==='N/A')return(<div className={`rounded-xl border-2 border-dashed ${c.border} p-4 flex items-center gap-3 opacity-60`}><Lock className="w-5 h-5 text-gray-400"/><span className="text-sm text-gray-500 font-medium">{title} — Not applicable · section locked</span><button type="button" onClick={()=>onApplicable('Applicable')} className="ml-auto text-xs text-blue-600 underline">Unlock</button></div>);
  return(<div className={`rounded-xl border-2 ${c.border} overflow-hidden`}><div className={`${c.bg} px-4 py-3 flex items-center justify-between flex-wrap gap-2`}><span className={`font-bold text-base ${c.text}`}>{title}</span><div className="flex items-center gap-2"><div className="flex gap-1">{['Applicable','N/A'].map(v=>(<button key={v} type="button" onClick={()=>onApplicable(v)} className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold transition-all ${v===applicable?c.active:c.pill}`}>{v}</button>))}</div><button type="button" onClick={()=>setOpen(o=>!o)} className={`${c.text} p-1`}>{open?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</button></div></div>{open&&applicable==='Applicable'&&<div className="p-4 space-y-4">{children}</div>}</div>);
}
function ScoreRow({label,options,value,onChange,accent='yellow'}){
  const c=A[accent];
  return(<div className="flex items-start gap-3 flex-wrap"><span className="text-sm text-gray-600 w-36 shrink-0 pt-1">{label}</span><div className="flex flex-wrap gap-1 flex-1">{options.map(([lbl,pts])=>{const active=value===pts;return<button key={lbl} type="button" onClick={()=>onChange(active?null:pts)} className={`px-2 py-1 rounded border text-xs font-medium transition-all ${active?c.active:c.pill}`}>{lbl}({pts})</button>;})}</div></div>);
}

export default function NeonatalAssessmentForm({patientId,encounterId,onSaved}){
  const[sec,setSec]=useState({delivery:'Applicable',apgar:'Applicable',ballard:'Applicable',jaundice:'Applicable',sepsis:'Applicable',feeding:'Applicable'});
  const sa=(k,v)=>setSec(s=>({...s,[k]:v}));

  /* Delivery */
  const[gestationalAge,setGestationalAge]=useState('');
  const[birthWeight,setBirthWeight]=useState('');
  const[deliveryMode,setDeliveryMode]=useState('');
  const[deliveryComplications,setDeliveryComplications]=useState([]);
  const[maternalHistory,setMaternalHistory]=useState([]);
  const[resuscitationRequired,setResuscitationRequired]=useState('');
  const[resuscitationSteps,setResuscitationSteps]=useState([]);

  /* APGAR */
  const[a1,setA1]=useState({appearance:null,pulse:null,grimace:null,activity:null,respiration:null});
  const[a5,setA5]=useState({appearance:null,pulse:null,grimace:null,activity:null,respiration:null});
  const[a10,setA10]=useState({appearance:null,pulse:null,grimace:null,activity:null,respiration:null});

  /* Ballard */
  const[ballardNM,setBallardNM]=useState({posture:null,squareWindow:null,armRecoil:null,poplitealAngle:null,scarfSign:null,heelToEar:null});
  const[ballardPM,setBallardPM]=useState({skin:null,lanugo:null,plFolds:null,breast:null,eyeEar:null,genitals:null});

  /* Jaundice */
  const[kramerZone,setKramerZone]=useState('');
  const[tsbValue,setTsbValue]=useState('');
  const[phototherapyIndicated,setPhototherapyIndicated]=useState('');
  const[exchangeIndicated,setExchangeIndicated]=useState('');
  const[jaundiceRisk,setJaundiceRisk]=useState([]);
  const[g6pdStatus,setG6pdStatus]=useState('');

  /* Sepsis */
  const[sepsisRisk,setSepsisRisk]=useState([]);
  const[sepsisScreen,setSepsisScreen]=useState({cbc:'',crp:'',bloodCulture:'',it_ratio:''});
  const[antibiotics,setAntibiotics]=useState('');

  /* Feeding */
  const[feedingMode,setFeedingMode]=useState('');
  const[feedingIssues,setFeedingIssues]=useState([]);
  const[weightTrend,setWeightTrend]=useState('');

  const apgarCalc=obj=>Object.values(obj).filter(v=>v!=null).reduce((a,b)=>a+b,0);
  const apgar1=useMemo(()=>apgarCalc(a1),[a1]);
  const apgar5=useMemo(()=>apgarCalc(a5),[a5]);
  const apgar10=useMemo(()=>apgarCalc(a10),[a10]);
  const apgarInterp=s=>s>=7?{label:'Normal',color:'green'}:s>=4?{label:'Moderate depression — stimulate/O2',color:'amber'}:{label:'Severe depression — resuscitation required',color:'red'};

  const ballardNMScore=useMemo(()=>Object.values(ballardNM).filter(v=>v!=null).reduce((a,b)=>a+b,0),[ballardNM]);
  const ballardPMScore=useMemo(()=>Object.values(ballardPM).filter(v=>v!=null).reduce((a,b)=>a+b,0),[ballardPM]);
  const ballardTotal=ballardNMScore+ballardPMScore;
  const ballardGA=useMemo(()=>{
    if(!ballardTotal&&ballardTotal!==0)return null;
    return Math.round((ballardTotal+200)/7*10)/10;
  },[ballardTotal]);

  const handleSave=async()=>{
    try{
      await api.post('/assessments',{type:'neonatal',patientId,encounterId,data:{delivery:{gestationalAge,birthWeight,mode:deliveryMode,complications:deliveryComplications,maternalHistory,resuscitationRequired,resuscitationSteps},apgar:{at1:{...a1,score:apgar1},at5:{...a5,score:apgar5},at10:{...a10,score:apgar10}},ballard:{neuromuscular:{...ballardNM,score:ballardNMScore},physical:{...ballardPM,score:ballardPMScore},total:ballardTotal,estimatedGA:ballardGA},jaundice:{kramerZone,tsb:tsbValue,phototherapyIndicated,exchangeIndicated,riskFactors:jaundiceRisk,g6pdStatus},sepsis:{riskFactors:sepsisRisk,screen:sepsisScreen,antibiotics},feeding:{mode:feedingMode,issues:feedingIssues,weightTrend}}});
      onSaved?.();
    }catch(e){console.error(e);}
  };

  const APGAR_CRITERIA=[
    {key:'appearance',label:'Colour',opts:[['Blue/pale(0)',0],['Body pink, extremities blue(1)',1],['Completely pink(2)',2]]},
    {key:'pulse',label:'Heart rate',opts:[['Absent(0)',0],['<100 bpm(1)',1],['≥100 bpm(2)',2]]},
    {key:'grimace',label:'Reflex irritability',opts:[['No response(0)',0],['Grimace(1)',1],['Cry/cough/sneeze(2)',2]]},
    {key:'activity',label:'Muscle tone',opts:[['Limp(0)',0],['Some flexion(1)',1],['Active motion(2)',2]]},
    {key:'respiration',label:'Breathing',opts:[['Absent(0)',0],['Slow/irregular(1)',1],['Good cry(2)',2]]},
  ];

  return(
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-2xl p-5 shadow-lg">
        <h2 className="text-xl font-bold">Neonatal Assessment</h2>
        <p className="text-yellow-100 text-sm mt-1">APGAR · Ballard (gestational age) · Kramer jaundice zones · Neonatal sepsis screen</p>
      </div>
      {apgar1<4&&<div className="bg-red-600 text-white rounded-xl p-4 flex items-center gap-3 animate-pulse"><AlertTriangle className="w-6 h-6 shrink-0"/><div><p className="font-bold">APGAR 1-min &lt;4 — Severe birth asphyxia</p><p className="text-sm text-red-100">Initiate NRP: PPV → chest compressions → adrenaline. Activate NICU team.</p></div></div>}
      {exchangeIndicated==='Yes'&&<div className="bg-red-600 text-white rounded-xl p-4 flex items-center gap-3 animate-pulse"><AlertTriangle className="w-6 h-6 shrink-0"/><div><p className="font-bold">Exchange Transfusion Indicated</p><p className="text-sm text-red-100">Double-volume exchange transfusion. Alert blood bank. NICU admission.</p></div></div>}

      <Section title="Delivery & Birth History" applicable={sec.delivery} onApplicable={v=>sa('delivery',v)} accent="yellow">
        <div className="grid grid-cols-3 gap-3">
          <FL label="Gestational age (weeks)"><input type="number" step="0.1" value={gestationalAge} onChange={e=>setGestationalAge(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="Birth weight (grams)"><input type="number" value={birthWeight} onChange={e=>setBirthWeight(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
        </div>
        {parseInt(birthWeight)>0&&parseInt(birthWeight)<1000&&<p className="text-xs text-red-600 font-bold">Extremely Low Birth Weight (ELBW &lt;1000g) — NICU mandatory</p>}
        {parseInt(birthWeight)>=1000&&parseInt(birthWeight)<1500&&<p className="text-xs text-orange-600 font-medium">Very Low Birth Weight (VLBW 1000–1500g) — NICU/SCBU care</p>}
        {parseInt(birthWeight)>=1500&&parseInt(birthWeight)<2500&&<p className="text-xs text-amber-600 font-medium">Low Birth Weight (LBW 1500–2500g) — close monitoring</p>}
        <FL label="Mode of delivery">
          <Pills options={['Normal vaginal delivery (NVD)','Assisted vaginal (forceps/vacuum)','Emergency LSCS','Elective LSCS','Breech delivery']} value={deliveryMode} onChange={setDeliveryMode} accent="yellow"/>
        </FL>
        <FL label="Delivery complications" sub="multi-select">
          <Pills options={['Meconium-stained liquor (thick)','Meconium-stained liquor (thin)','Prolonged labour (>18h)','Fetal distress (CTG changes)','Cord prolapse','Shoulder dystocia','Placental abruption','Birth trauma']} value={deliveryComplications} onChange={setDeliveryComplications} accent="orange" multi/>
        </FL>
        <FL label="Maternal history" sub="multi-select">
          <Pills options={['GDM / pre-existing DM','PIH / pre-eclampsia','Maternal fever / chorioamnionitis','PROM (>18h)','Group B Strep positive','Hepatitis B positive','HIV positive','TB on treatment','Thyroid disorder','Medications (steroids/MgSO4)']} value={maternalHistory} onChange={setMaternalHistory} accent="amber" multi/>
        </FL>
        <FL label="Resuscitation at birth required?">
          <Pills options={['No — vigorous cry at birth','Yes — stimulation only','Yes — PPV required','Yes — intubation required','Yes — chest compressions + adrenaline']} value={resuscitationRequired} onChange={setResuscitationRequired} accent="red"/>
        </FL>
        <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
          <p className={`font-semibold ${A.amber.text}`}>India context</p>
          <p className="text-gray-600 mt-1">LBW rate ~28% in India (highest globally). NVD at home common in rural areas — ensure BCG + OPV0 at birth. Maternal malnutrition + anaemia major contributors. G6PD deficiency ~10% in some regions (South India, tribals) — screen before phototherapy. Hepatitis B birth dose within 24h mandatory under UIP.</p>
        </div>
      </Section>

      <Section title="APGAR Score" applicable={sec.apgar} onApplicable={v=>sa('apgar',v)} accent="amber">
        {[['1 minute',a1,setA1,apgar1],['5 minutes',a5,setA5,apgar5],['10 minutes',a10,setA10,apgar10]].map(([time,state,setter,score])=>(
          <div key={time} className="space-y-2">
            <p className="text-sm font-bold text-gray-600">{time}</p>
            {APGAR_CRITERIA.map(({key,label,opts})=>(
              <ScoreRow key={key} label={label} options={opts} value={state[key]} onChange={v=>setter(s=>({...s,[key]:v}))} accent="amber"/>
            ))}
            <div className={`rounded-lg border-2 ${A[apgarInterp(score).color]?.border} ${A[apgarInterp(score).color]?.bg} p-2 flex justify-between items-center`}>
              <span className={`font-black text-lg ${A[apgarInterp(score).color]?.text}`}>APGAR {time}: {score}/10</span>
              <span className={`text-xs font-semibold ${A[apgarInterp(score).color]?.text}`}>{apgarInterp(score).label}</span>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Ballard Score (Gestational Age)" applicable={sec.ballard} onApplicable={v=>sa('ballard',v)} accent="yellow">
        <p className="text-xs text-gray-500">Neuromuscular + Physical maturity. Score range −10 to +50 → GA 20–44 weeks.</p>
        <p className="text-xs font-semibold text-yellow-700">Neuromuscular maturity</p>
        <div className="space-y-1">
          <ScoreRow label="Posture" options={[['Limp(−1)',-1],['Partial flex(0)',0],['Full flex hips(1)',1],['Arm+leg flex(2)',2],['Full flex(3)',3],['Tight flex(4)',4]]} value={ballardNM.posture} onChange={v=>setBallardNM(s=>({...s,posture:v}))} accent="yellow"/>
          <ScoreRow label="Square window" options={[['>90°(−1)',-1],['90°(0)',0],['60°(1)',1],['45°(2)',2],['30°(3)',3],['0°(4)',4]]} value={ballardNM.squareWindow} onChange={v=>setBallardNM(s=>({...s,squareWindow:v}))} accent="yellow"/>
          <ScoreRow label="Arm recoil" options={[['None(−1)',-1],['Weak(0)',0],['Partial(1)',1],['Complete(2)',2],['Brisk(3)',3],['Quick(4)',4]]} value={ballardNM.armRecoil} onChange={v=>setBallardNM(s=>({...s,armRecoil:v}))} accent="yellow"/>
          <ScoreRow label="Popliteal angle" options={[['>180°(−1)',-1],['180°(0)',0],['160°(1)',1],['140°(2)',2],['120°(3)',3],['90°(4)',4],['<90°(5)',5]]} value={ballardNM.poplitealAngle} onChange={v=>setBallardNM(s=>({...s,poplitealAngle:v}))} accent="yellow"/>
          <ScoreRow label="Scarf sign" options={[['Past hip(−1)',-1],['To opp side(0)',0],['Elbow cross(1)',1],['Midline(2)',2],['Elbow ipsi(3)',3],['Elbow front(4)',4]]} value={ballardNM.scarfSign} onChange={v=>setBallardNM(s=>({...s,scarfSign:v}))} accent="yellow"/>
          <ScoreRow label="Heel to ear" options={[['Touches(−1)',-1],['Near ear(0)',0],['Partial(1)',1],['45°(2)',2],['90°(3)',3],['Full resist(4)',4]]} value={ballardNM.heelToEar} onChange={v=>setBallardNM(s=>({...s,heelToEar:v}))} accent="yellow"/>
        </div>
        <p className="text-xs font-semibold text-yellow-700 mt-2">Physical maturity</p>
        <div className="space-y-1">
          <ScoreRow label="Skin" options={[['Sticky(−1)',-1],['Gelatinous(0)',0],['Smooth(1)',1],['Superficial peel(2)',2],['Cracking(3)',3],['Parchment(4)',4],['Leathery(5)',5]]} value={ballardPM.skin} onChange={v=>setBallardPM(s=>({...s,skin:v}))} accent="amber"/>
          <ScoreRow label="Lanugo" options={[['None(−1)',-1],['Sparse(0)',0],['Abundant(1)',1],['Thinning(2)',2],['Bald areas(3)',3],['Mostly bald(4)',4]]} value={ballardPM.lanugo} onChange={v=>setBallardPM(s=>({...s,lanugo:v}))} accent="amber"/>
          <ScoreRow label="Plantar folds" options={[['None(−1)',-1],['Faint red(0)',0],['Anterior(1)',1],['2/3 creases(2)',2],['Creases ant(3)',3],['Full creases(4)',4]]} value={ballardPM.plFolds} onChange={v=>setBallardPM(s=>({...s,plFolds:v}))} accent="amber"/>
          <ScoreRow label="Breast" options={[['Imperceptible(−1)',-1],['Barely perceptible(0)',0],['Flat areola(1)',1],['Stippled areola(2)',2],['Raised areola(3)',3],['Full areola 5–10mm(4)',4]]} value={ballardPM.breast} onChange={v=>setBallardPM(s=>({...s,breast:v}))} accent="amber"/>
          <ScoreRow label="Eye/Ear" options={[['Fused(−2)',-2],['Fused loose(−1)',-1],['Lids open(0)',0],['Sl curved pinna(1)',1],['Well curved(2)',2],['Formed/firm(3)',3],['Thick cartilage(4)',4]]} value={ballardPM.eyeEar} onChange={v=>setBallardPM(s=>({...s,eyeEar:v}))} accent="amber"/>
          <ScoreRow label="Genitals" options={[['Scrotum flat(−1)',-1],['Barely visible(0)',0],['Faint rugae(1)',1],['Small rugae(2)',2],['Descending(3)',3],['Fully descended(4)',4]]} value={ballardPM.genitals} onChange={v=>setBallardPM(s=>({...s,genitals:v}))} accent="amber"/>
        </div>
        {(ballardNMScore!==0||ballardPMScore!==0)&&(
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 flex justify-between items-center">
            <span className="text-xl font-black text-yellow-700">Ballard Total: {ballardTotal}</span>
            {ballardGA&&<span className="text-sm font-bold text-yellow-700">Estimated GA: ~{Math.floor(ballardGA)}–{Math.ceil(ballardGA)} weeks</span>}
          </div>
        )}
      </Section>

      <Section title="Neonatal Jaundice (Kramer Zones)" applicable={sec.jaundice} onApplicable={v=>sa('jaundice',v)} accent="orange">
        <FL label="Kramer zone (clinical assessment)">
          <div className="space-y-1">
            {[['Zone 1 — Face only (~5–6 mg/dL)','green'],['Zone 2 — Face + trunk to umbilicus (~7–9 mg/dL)','amber'],['Zone 3 — Trunk below umbilicus + thighs (~9–12 mg/dL)','amber'],['Zone 4 — Arms + lower legs (~12–15 mg/dL)','orange'],['Zone 5 — Palms + soles (>15 mg/dL)','red']].map(([lbl,col])=>(
              <button key={lbl} type="button" onClick={()=>setKramerZone(kramerZone===lbl?'':lbl)} className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${kramerZone===lbl?A[col].active:A[col].pill}`}>{lbl}</button>
            ))}
          </div>
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Total serum bilirubin (mg/dL)"><input type="number" step="0.1" value={tsbValue} onChange={e=>setTsbValue(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="G6PD status"><Pills options={['Normal','G6PD deficient','Not tested']} value={g6pdStatus} onChange={setG6pdStatus} accent="orange"/></FL>
        </div>
        <FL label="Jaundice risk factors" sub="multi-select">
          <Pills options={['ABO incompatibility','Rh incompatibility','G6PD deficiency','Cephalhaematoma / bruising','Prematurity','Exclusive breastfeeding + poor intake','Sibling with neonatal jaundice','Polycythaemia','Sepsis','Hypothyroidism']} value={jaundiceRisk} onChange={setJaundiceRisk} accent="orange" multi/>
        </FL>
        <FL label="Phototherapy">
          <Pills options={['Not required','Indicated — started','Intensive phototherapy (TSB near exchange level)','Discontinued — TSB adequate']} value={phototherapyIndicated} onChange={setPhototherapyIndicated} accent="orange"/>
        </FL>
        <FL label="Exchange transfusion">
          <Pills options={['Not required','Indicated — double-volume exchange','Performed','Declined by family']} value={exchangeIndicated} onChange={setExchangeIndicated} accent="red"/>
        </FL>
      </Section>

      <Section title="Neonatal Sepsis Screen" applicable={sec.sepsis} onApplicable={v=>sa('sepsis',v)} accent="red">
        <FL label="Risk factors for sepsis" sub="multi-select">
          <Pills options={['PROM >18 hours','Maternal fever / chorioamnionitis','GBS positive mother (untreated)','Preterm <37 weeks','Low birth weight','Birth asphyxia','Invasive procedures','Multiple gestation']} value={sepsisRisk} onChange={setSepsisRisk} accent="red" multi/>
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="CBC / Total WBC (×10³/µL)"><input type="text" value={sepsisScreen.cbc} onChange={e=>setSepsisScreen(s=>({...s,cbc:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="WBC / neutrophil count"/></FL>
          <FL label="CRP (mg/L)"><input type="number" step="0.1" value={sepsisScreen.crp} onChange={e=>setSepsisScreen(s=>({...s,crp:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder=">10 = positive"/></FL>
          <FL label="Blood culture"><input type="text" value={sepsisScreen.bloodCulture} onChange={e=>setSepsisScreen(s=>({...s,bloodCulture:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Organism / pending / no growth"/></FL>
          <FL label="I:T ratio"><input type="number" step="0.01" value={sepsisScreen.it_ratio} onChange={e=>setSepsisScreen(s=>({...s,it_ratio:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder=">0.2 = abnormal"/></FL>
        </div>
        <FL label="Antibiotics">
          <Pills options={['Not required','Ampicillin + Gentamicin (empirical EOS)','Piperacillin-tazobactam + amikacin (LOS/NICU)','Cefotaxime + amikacin','Vancomycin + meropenem (MDR/NICU)','De-escalated per culture','Completed — stopped']} value={antibiotics} onChange={setAntibiotics} accent="red"/>
        </FL>
      </Section>

      <Section title="Feeding" applicable={sec.feeding} onApplicable={v=>sa('feeding',v)} accent="green">
        <FL label="Feeding mode">
          <Pills options={['Exclusive breastfeeding','Expressed breast milk (EBM)','Donor breast milk','Formula supplementation','Nasogastric tube feeding','Orogastric tube feeding','IV fluids only (NPO)']} value={feedingMode} onChange={setFeedingMode} accent="green"/>
        </FL>
        <FL label="Feeding issues" sub="multi-select">
          <Pills options={['Poor latch / suck','Inadequate milk supply','Vomiting','Abdominal distension','Hypoglycaemia','Feeding intolerance','Cleft palate affecting feed']} value={feedingIssues} onChange={setFeedingIssues} accent="green" multi/>
        </FL>
        <FL label="Weight trend">
          <Pills options={['Appropriate weight gain (>15–30g/day)','Normal physiological loss (<10% birth weight)','Excessive weight loss (>10% — review feeding)','Regaining birth weight by day 10–14','Inadequate weight gain']} value={weightTrend} onChange={setWeightTrend} accent="green"/>
        </FL>
      </Section>

      <div className="pt-2">
        <button type="button" onClick={handleSave} className="w-full py-3 rounded-xl bg-yellow-500 text-white font-bold text-sm shadow">Save Assessment</button>
      </div>
    </div>
  );
}
