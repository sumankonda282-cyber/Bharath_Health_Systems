/**
 * @shared-pool
 * GastroparesisMotilityForm — Gastroparesis & gastric motility disorders assessment
 * GCSI score, PAGI-SYM, gastric emptying scintigraphy, diabetic gastropathy
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */

import React, { useState, useMemo } from 'react';
import { Lock, ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  teal:   { bg:'bg-teal-50',   border:'border-teal-300',   text:'text-teal-700',   pill:'bg-teal-100 border-teal-400 text-teal-800',   active:'bg-teal-600 text-white border-teal-600' },
  cyan:   { bg:'bg-cyan-50',   border:'border-cyan-300',   text:'text-cyan-700',   pill:'bg-cyan-100 border-cyan-400 text-cyan-800',   active:'bg-cyan-600 text-white border-cyan-600' },
  blue:   { bg:'bg-blue-50',   border:'border-blue-300',   text:'text-blue-700',   pill:'bg-blue-100 border-blue-400 text-blue-800',   active:'bg-blue-600 text-white border-blue-600' },
  amber:  { bg:'bg-amber-50',  border:'border-amber-300',  text:'text-amber-700',  pill:'bg-amber-100 border-amber-400 text-amber-800',  active:'bg-amber-500 text-white border-amber-500' },
  orange: { bg:'bg-orange-50', border:'border-orange-300', text:'text-orange-700', pill:'bg-orange-100 border-orange-400 text-orange-800', active:'bg-orange-500 text-white border-orange-500' },
  red:    { bg:'bg-red-50',    border:'border-red-300',    text:'text-red-700',    pill:'bg-red-100 border-red-400 text-red-800',    active:'bg-red-600 text-white border-red-600' },
  green:  { bg:'bg-green-50',  border:'border-green-300',  text:'text-green-700',  pill:'bg-green-100 border-green-400 text-green-800',  active:'bg-green-600 text-white border-green-600' },
  violet: { bg:'bg-violet-50', border:'border-violet-300', text:'text-violet-700', pill:'bg-violet-100 border-violet-400 text-violet-800', active:'bg-violet-600 text-white border-violet-600' },
};

function Pills({options,value,onChange,accent='teal',multi=false}){
  const c=A[accent];const sel=multi?(Array.isArray(value)?value:[]):value;
  const toggle=opt=>{if(multi){const a=Array.isArray(sel)?sel:[];onChange(a.includes(opt)?a.filter(x=>x!==opt):[...a,opt]);}else onChange(sel===opt?'':opt);};
  return(<div className="flex flex-wrap gap-2">{options.map(opt=>{const active=multi?sel.includes(opt):sel===opt;return<button key={opt} type="button" onClick={()=>toggle(opt)} className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${active?c.active:c.pill}`}>{opt}</button>;})}</div>);
}
function FL({label,sub,children}){return(<div className="space-y-1"><label className="block text-sm font-semibold text-gray-700">{label}{sub&&<span className="ml-1 text-xs font-normal text-gray-500">{sub}</span>}</label>{children}</div>);}
function Gate({label,value,onChange,accent='teal',children}){
  const c=A[accent];
  return(<div className={`rounded-lg border ${c.border} ${c.bg} p-3`}><div className="flex items-center justify-between flex-wrap gap-2"><span className="text-sm font-medium text-gray-700">{label}</span><div className="flex gap-2">{['Yes','No'].map(opt=>(<button key={opt} type="button" onClick={()=>onChange(value===opt?'':opt)} className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all ${value===opt?c.active:c.pill}`}>{opt}</button>))}</div></div>{value==='Yes'&&children&&<div className="mt-3 space-y-3">{children}</div>}</div>);
}
function Section({title,applicable,onApplicable,accent='teal',children}){
  const c=A[accent];const[open,setOpen]=useState(true);
  if(applicable==='N/A')return(<div className={`rounded-xl border-2 border-dashed ${c.border} p-4 flex items-center gap-3 opacity-60`}><Lock className="w-5 h-5 text-gray-400"/><span className="text-sm text-gray-500 font-medium">{title} — Not applicable · section locked</span><button type="button" onClick={()=>onApplicable('Applicable')} className="ml-auto text-xs text-blue-600 underline">Unlock</button></div>);
  return(<div className={`rounded-xl border-2 ${c.border} overflow-hidden`}><div className={`${c.bg} px-4 py-3 flex items-center justify-between flex-wrap gap-2`}><span className={`font-bold text-base ${c.text}`}>{title}</span><div className="flex items-center gap-2"><div className="flex gap-1">{['Applicable','N/A'].map(v=>(<button key={v} type="button" onClick={()=>onApplicable(v)} className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold transition-all ${v===applicable?c.active:c.pill}`}>{v}</button>))}</div><button type="button" onClick={()=>setOpen(o=>!o)} className={`${c.text} p-1`}>{open?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</button></div></div>{open&&applicable==='Applicable'&&<div className="p-4 space-y-4">{children}</div>}</div>);
}

const GCSI_ITEMS=[
  {key:'nauseaSeverity',label:'Nausea severity',subscale:'Nausea/Vomiting'},
  {key:'retching',label:'Retching (dry heaving)',subscale:'Nausea/Vomiting'},
  {key:'vomiting',label:'Vomiting',subscale:'Nausea/Vomiting'},
  {key:'stomachFullness',label:'Stomach fullness',subscale:'Postprandial Fullness/Early Satiety'},
  {key:'unableToFinish',label:'Not able to finish a normal-sized meal',subscale:'Postprandial Fullness/Early Satiety'},
  {key:'feelingExcessivelyFull',label:'Feeling excessively full after meals',subscale:'Postprandial Fullness/Early Satiety'},
  {key:'lossOfAppetite',label:'Loss of appetite',subscale:'Postprandial Fullness/Early Satiety'},
  {key:'bloating',label:'Bloating',subscale:'Bloating'},
  {key:'abdomenVisible',label:'Stomach or belly visibly larger',subscale:'Bloating'},
];

export default function GastroparesisMotilityForm({patientId,encounterId,onSaved}){
  const[sec,setSec]=useState({presentation:'Applicable',gcsi:'Applicable',emptying:'Applicable',aetiology:'Applicable',investigations:'Applicable',treatment:'Applicable'});
  const sa=(k,v)=>setSec(s=>({...s,[k]:v}));

  /* Presentation */
  const[diagnosis,setDiagnosis]=useState('');
  const[symptoms,setSymptoms]=useState([]);
  const[onset,setOnset]=useState('');
  const[severity,setSeverity]=useState('');
  const[weightLoss,setWeightLoss]=useState('');
  const[nutritionImpact,setNutritionImpact]=useState('');
  const[hospitalAdmissions,setHospitalAdmissions]=useState('');

  /* GCSI */
  const[gcsiScores,setGcsiScores]=useState({nauseaSeverity:null,retching:null,vomiting:null,stomachFullness:null,unableToFinish:null,feelingExcessivelyFull:null,lossOfAppetite:null,bloating:null,abdomenVisible:null});

  /* Gastric emptying */
  const[geScintigraphy,setGeScintigraphy]=useState('');
  const[ge2h,setGe2h]=useState('');
  const[ge4h,setGe4h]=useState('');
  const[smartPill,setSmartPill]=useState('');
  const[antroduodenalManometry,setAntroduodenalManometry]=useState('');

  /* Aetiology */
  const[aetiology,setAetiology]=useState('');
  const[diabetesDuration,setDiabetesDuration]=useState('');
  const[hba1c,setHba1c]=useState('');
  const[postSurgical,setPostSurgical]=useState('');
  const[medications,setMedications]=useState([]);
  const[autoimmune,setAutoimmune]=useState('');

  /* Investigations */
  const[ogd,setOgd]=useState('');
  const[bezoar,setBezoar]=useState('');
  const[gastricRetention,setGastricRetention]=useState('');
  const[thyroid,setThyroid]=useState('');
  const[pyloric,setPyloric]=useState('');

  /* Treatment */
  const[dietModification,setDietModification]=useState([]);
  const[prokinetics,setProkinetics]=useState([]);
  const[antiemetics,setAntiemetics]=useState([]);
  const[glycaemicOptimisation,setGlycaemicOptimisation]=useState('');
  const[jejunalFeeding,setJejunalFeeding]=useState('');
  const[pyloricIntervention,setPyloricIntervention]=useState('');
  const[gastricStimulator,setGastricStimulator]=useState('');
  const[notes,setNotes]=useState('');

  /* GCSI calculation */
  const gcsiValues=Object.values(gcsiScores).filter(v=>v!=null);
  const gcsiTotal=useMemo(()=>gcsiValues.length>0?gcsiValues.reduce((a,b)=>a+b,0)/gcsiValues.length:null,[gcsiValues]);

  const nauseaSubscale=useMemo(()=>{
    const v=[gcsiScores.nauseaSeverity,gcsiScores.retching,gcsiScores.vomiting].filter(x=>x!=null);
    return v.length>0?v.reduce((a,b)=>a+b,0)/v.length:null;
  },[gcsiScores]);
  const fullnessSubscale=useMemo(()=>{
    const v=[gcsiScores.stomachFullness,gcsiScores.unableToFinish,gcsiScores.feelingExcessivelyFull,gcsiScores.lossOfAppetite].filter(x=>x!=null);
    return v.length>0?v.reduce((a,b)=>a+b,0)/v.length:null;
  },[gcsiScores]);
  const bloatingSubscale=useMemo(()=>{
    const v=[gcsiScores.bloating,gcsiScores.abdomenVisible].filter(x=>x!=null);
    return v.length>0?v.reduce((a,b)=>a+b,0)/v.length:null;
  },[gcsiScores]);

  const gcsiInterp=useMemo(()=>{
    if(gcsiTotal==null)return null;
    if(gcsiTotal<1.5)return{label:'Mild gastroparesis',color:'green'};
    if(gcsiTotal<3)return{label:'Moderate gastroparesis',color:'amber'};
    return{label:'Severe gastroparesis — consider NJT feeding / hospitalisation',color:'red'};
  },[gcsiTotal]);

  const severeAlert=gcsiTotal!=null&&gcsiTotal>=3;

  const handleSave=async()=>{
    try{
      await api.post('/assessments',{type:'gastroparesis-motility',patientId,encounterId,data:{diagnosis,symptoms,onset,severity,weightLoss,nutritionImpact,hospitalAdmissions,gcsi:{scores:gcsiScores,total:gcsiTotal!=null?Math.round(gcsiTotal*100)/100:null,nauseaSubscale:nauseaSubscale!=null?Math.round(nauseaSubscale*100)/100:null,fullnessSubscale:fullnessSubscale!=null?Math.round(fullnessSubscale*100)/100:null,bloatingSubscale:bloatingSubscale!=null?Math.round(bloatingSubscale*100)/100:null,interp:gcsiInterp?.label},gastricEmptying:{scintigraphy:geScintigraphy,retention2h:ge2h,retention4h:ge4h,smartPill,antroduodenalManometry},aetiology:{type:aetiology,diabetesDuration,hba1c,postSurgical,medications,autoimmune},investigations:{ogd,bezoar,gastricRetention,thyroid,pyloric},treatment:{diet:dietModification,prokinetics,antiemetics,glycaemicOptimisation,jejunalFeeding,pyloricIntervention,gastricStimulator},notes}});
      onSaved?.();
    }catch(e){console.error(e);}
  };

  return(
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-2xl p-5 shadow-lg">
        <h2 className="text-xl font-bold">Gastroparesis & Gastric Motility Assessment</h2>
        <p className="text-teal-100 text-sm mt-1">GCSI · Gastric emptying scintigraphy · Diabetic gastropathy · Pyloric interventions</p>
      </div>

      {severeAlert&&(
        <div className="bg-orange-600 text-white rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-6 h-6 shrink-0"/>
          <div><p className="font-bold">Severe Gastroparesis — Nutritional support required</p><p className="text-sm text-orange-100">Consider NJT / jejunal feeding. Optimise glycaemic control. Antiemetics + prokinetics. Hospitalise if dehydrated.</p></div>
        </div>
      )}

      <Section title="Presentation" applicable={sec.presentation} onApplicable={v=>sa('presentation',v)} accent="teal">
        <FL label="Diagnosis">
          <Pills options={['Diabetic gastroparesis','Idiopathic gastroparesis','Post-surgical gastroparesis','Post-viral gastroparesis (post-infectious)','Connective tissue disease (scleroderma/SLE)','Parkinson\'s disease related','Drug-induced gastroparesis','Rumination syndrome','Cyclic vomiting syndrome','Chronic nausea and vomiting syndrome (CNVS)']} value={diagnosis} onChange={setDiagnosis} accent="teal"/>
        </FL>
        <FL label="Symptoms" sub="multi-select">
          <Pills options={['Nausea (persistent)','Vomiting (> 1 hour after eating)','Early satiety','Postprandial fullness','Bloating / abdominal distension','Upper abdominal pain / discomfort','Regurgitation of undigested food (hours after eating)','Weight loss','Poor glycaemic control (diabetic)','Anorexia']} value={symptoms} onChange={setSymptoms} accent="teal" multi/>
        </FL>
        <FL label="Onset">
          <Pills options={['Acute — days to weeks','Subacute — weeks to months','Chronic — months to years']} value={onset} onChange={setOnset} accent="teal"/>
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Weight loss">
            <Pills options={['None','1–5% in 6 months','5–10% in 6 months','>10% in 6 months']} value={weightLoss} onChange={setWeightLoss} accent="orange"/>
          </FL>
          <FL label="Hospital admissions for gastroparesis">
            <Pills options={['None','1–2 admissions','3–5 admissions','>5 admissions (refractory)']} value={hospitalAdmissions} onChange={setHospitalAdmissions} accent="orange"/>
          </FL>
        </div>
        <FL label="Nutritional impact">
          <Pills options={['Tolerating oral diet — adequate intake','Reduced oral intake — but maintaining weight','Significant weight loss — oral supplementation required','Unable to maintain oral nutrition — tube feeding required']} value={nutritionImpact} onChange={setNutritionImpact} accent="orange"/>
        </FL>
        <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
          <p className={`font-semibold ${A.amber.text}`}>India context</p>
          <p className="text-gray-600 mt-1">Diabetic gastroparesis rising with T2DM epidemic (India 77 million diabetics). Post-infectious gastroparesis after enteric fever/gastroenteritis common. Gastric emptying scintigraphy limited availability — SmartPill or <sup>13</sup>C breath test alternatives. Domperidone widely used (India) despite cardiac risk — monitor QTc. Metoclopramide tardive dyskinesia risk with long-term use.</p>
        </div>
      </Section>

      <Section title="GCSI — Gastroparesis Cardinal Symptom Index" applicable={sec.gcsi} onApplicable={v=>sa('gcsi',v)} accent="cyan">
        <p className="text-xs text-gray-500">Rate each symptom over the past 2 weeks: 0=None, 1=Very mild, 2=Mild, 3=Moderate, 4=Severe, 5=Very severe. GCSI = mean of 3 subscale means.</p>
        {['Nausea/Vomiting','Postprandial Fullness/Early Satiety','Bloating'].map(subscale=>(
          <div key={subscale} className="space-y-2">
            <p className="text-xs font-bold text-cyan-700 uppercase tracking-wide">{subscale}</p>
            {GCSI_ITEMS.filter(i=>i.subscale===subscale).map(({key,label})=>(
              <div key={key} className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-600 w-56 shrink-0">{label}</span>
                <div className="flex gap-1">
                  {[0,1,2,3,4,5].map(n=>(
                    <button key={n} type="button" onClick={()=>setGcsiScores(s=>({...s,[key]:gcsiScores[key]===n?null:n}))} className={`w-8 h-8 rounded-lg border text-xs font-bold transition-all ${gcsiScores[key]===n?(n<=1?A.green.active:n<=3?A.amber.active:A.red.active):(n<=1?A.green.pill:n<=3?A.amber.pill:A.red.pill)}`}>{n}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
        {gcsiTotal!=null&&(
          <div className={`rounded-xl border-2 ${A[gcsiInterp?.color||'gray']?.border} ${A[gcsiInterp?.color||'gray']?.bg} p-4 mt-2`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className={`text-2xl font-black ${A[gcsiInterp?.color||'gray']?.text}`}>GCSI: {gcsiTotal.toFixed(2)}/5</p>
                <div className="flex gap-4 mt-1 text-xs text-gray-500">
                  {nauseaSubscale!=null&&<span>Nausea: {nauseaSubscale.toFixed(1)}</span>}
                  {fullnessSubscale!=null&&<span>Fullness: {fullnessSubscale.toFixed(1)}</span>}
                  {bloatingSubscale!=null&&<span>Bloating: {bloatingSubscale.toFixed(1)}</span>}
                </div>
              </div>
              <span className={`text-sm font-semibold ${A[gcsiInterp?.color||'gray']?.text} max-w-xs text-right`}>{gcsiInterp?.label}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Mild &lt;1.5 | Moderate 1.5–3 | Severe &gt;3</p>
          </div>
        )}
      </Section>

      <Section title="Gastric Emptying Studies" applicable={sec.emptying} onApplicable={v=>sa('emptying',v)} accent="blue">
        <FL label="Gastric emptying scintigraphy (GES — 4h solid meal standard)">
          <Pills options={['Not performed','Normal — &lt;10% retention at 4h','Mild delay — 10–15% retention at 4h','Moderate delay — 15–35% retention at 4h','Severe delay — &gt;35% retention at 4h','Rapid gastric emptying (dumping)']} value={geScintigraphy} onChange={setGeScintigraphy} accent="blue"/>
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Retention at 2h (%)"><input type="number" value={ge2h} onChange={e=>setGe2h(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder=">60% at 2h = delayed"/></FL>
          <FL label="Retention at 4h (%)"><input type="number" value={ge4h} onChange={e=>setGe4h(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder=">10% at 4h = gastroparesis"/></FL>
        </div>
        <FL label="SmartPill / wireless motility capsule">
          <Pills options={['Not done','Normal gastric emptying time (<5h)','Delayed (&gt;5h gastric residency)','Whole gut transit also assessed']} value={smartPill} onChange={setSmartPill} accent="blue"/>
        </FL>
        <FL label="Antroduodenal manometry">
          <Pills options={['Not done','Normal MMC (migrating motor complex)','Absent MMC (neuropathic gastroparesis)','Myopathic pattern (low amplitude contractions)','Functional obstruction pattern']} value={antroduodenalManometry} onChange={setAntroduodenalManometry} accent="blue"/>
        </FL>
      </Section>

      <Section title="Aetiology" applicable={sec.aetiology} onApplicable={v=>sa('aetiology',v)} accent="amber">
        <FL label="Primary aetiology">
          <Pills options={['Diabetic (Type 1 — autonomic neuropathy)','Diabetic (Type 2 — longer duration)','Idiopathic (largest group ~30%)','Post-surgical (post-vagotomy/fundoplication/gastrectomy)','Post-viral (Norovirus/CMV/EBV trigger)','Connective tissue disease (scleroderma)','Parkinson\'s disease','Hypothyroidism','Anorexia nervosa / eating disorder','Drug-induced (see below)']} value={aetiology} onChange={setAetiology} accent="amber"/>
        </FL>
        {(aetiology.includes('Diabetic')||aetiology.includes('Type 1')||aetiology.includes('Type 2'))&&(
          <div className="grid grid-cols-2 gap-3">
            <FL label="Diabetes duration"><input type="text" value={diabetesDuration} onChange={e=>setDiabetesDuration(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Years"/></FL>
            <FL label="HbA1c (%)"><input type="number" step="0.1" value={hba1c} onChange={e=>setHba1c(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          </div>
        )}
        <FL label="Causative medications" sub="multi-select">
          <Pills options={['GLP-1 agonists (semaglutide/liraglutide — slows emptying)','Opioids / opioid-induced bowel dysfunction','Anticholinergics (tricyclics/antihistamines)','Calcium channel blockers','Dopamine agonists (levodopa)','Alpha-2 agonists (clonidine)','Cyclosporin','Proton pump inhibitors (minor effect)']} value={medications} onChange={setMedications} accent="orange" multi/>
        </FL>
        {medications.includes('GLP-1 agonists (semaglutide/liraglutide — slows emptying)')&&(
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800 font-medium">
            GLP-1 agonist-induced delayed gastric emptying: Consider dose reduction or switch. Ensure patient is off GLP-1 for ≥1 week before gastric emptying scintigraphy.
          </div>
        )}
      </Section>

      <Section title="Investigations" applicable={sec.investigations} onApplicable={v=>sa('investigations',v)} accent="teal">
        <FL label="OGD findings">
          <Pills options={['Normal — no retained food','Retained food after 8-12h fast (diagnostic of gastroparesis)','Bezoar identified','Gastric outlet obstruction excluded','Peptic ulcer / gastritis — contributing','Normal mucosa']} value={ogd} onChange={setOgd} accent="teal"/>
        </FL>
        <FL label="Bezoar (retained gastric mass)">
          <Pills options={['Not present','Phytobezoar (plant material — most common)','Trichobezoar (hair)','Pharmacobezoar (medication)','Treated — endoscopic dissolution (cola/cellulase)','Treated — endoscopic fragmentation']} value={bezoar} onChange={setBezoar} accent="teal"/>
        </FL>
        <FL label="Thyroid function">
          <Pills options={['Normal','Hypothyroid — treated','Hyperthyroid — treated','Not checked']} value={thyroid} onChange={setThyroid} accent="teal"/>
        </FL>
        <FL label="Pyloric assessment">
          <Pills options={['Not assessed','Normal pyloric opening on OGD','Pyloric stenosis excluded','Functional pyloric obstruction (pylorospasm) — botox trialled','POEM-G / gastric peroral endoscopic myotomy candidate']} value={pyloric} onChange={setPyloric} accent="teal"/>
        </FL>
      </Section>

      <Section title="Treatment" applicable={sec.treatment} onApplicable={v=>sa('treatment',v)} accent="green">
        <FL label="Dietary modifications" sub="multi-select">
          <Pills options={['Small frequent meals (6 × per day)','Low-fat diet (<40g/day — fat delays emptying)','Low-fibre diet (avoid raw vegetables/fibrous foods causing bezoar)','Liquidised / blended diet','Avoid carbonated drinks','Avoid lying flat after meals (30-45° for 2h)','Avoid large meal volumes','Nutritional supplement drinks']} value={dietModification} onChange={setDietModification} accent="green" multi/>
        </FL>
        <FL label="Prokinetics" sub="multi-select">
          <Pills options={['Metoclopramide 10mg TDS (1st line — limit to 12 weeks max, tardive dyskinesia risk)','Domperidone 10mg TDS (India widely available, QTc monitoring)','Erythromycin 125–250mg TDS (short-term — motilin receptor agonist)','Prucalopride 1–2mg OD (5-HT4 agonist — off-label)','Mosapride 5mg TDS (available in India)']} value={prokinetics} onChange={setProkinetics} accent="green" multi/>
        </FL>
        <FL label="Antiemetics" sub="multi-select">
          <Pills options={['Ondansetron 4–8mg TDS (PRN)','Promethazine 25mg TDS (sedating)','Cyclizine 50mg TDS','Haloperidol low dose (refractory nausea)','Prochlorperazine 5mg TDS','Aprepitant (NK1 antagonist — chronic nausea)']} value={antiemetics} onChange={setAntiemetics} accent="amber" multi/>
        </FL>
        <Gate label="Glycaemic optimisation (diabetic gastroparesis)?" value={glycaemicOptimisation} onChange={setGlycaemicOptimisation} accent="amber">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            Target HbA1c &lt;7.5% — tight control improves gastric emptying. Switch to rapid-acting insulin post-meal (not pre-meal) due to unpredictable absorption. Avoid GLP-1 agonists. CSII (insulin pump) with sensor-augmented system useful in brittle diabetic gastroparesis.
          </div>
        </Gate>
        <Gate label="Jejunal / enteral feeding required?" value={jejunalFeeding} onChange={setJejunalFeeding} accent="violet">
          <div className="space-y-2">
            <Pills options={['Nasojejunal tube (NJT) — short-term','PEG-J (percutaneous endoscopic gastro-jejunostomy) — long-term','Venting gastrostomy + jejunal feeding','TPN — if enteral not tolerated']} value={jejunalFeeding==='Yes'?'':undefined} onChange={()=>{}} accent="violet"/>
          </div>
        </Gate>
        <FL label="Pyloric intervention">
          <Pills options={['Not yet','Botulinum toxin pyloric injection (OGD) — diagnostic/therapeutic trial','G-POEM — Gastric Per-Oral Endoscopic Myotomy (pyloromyotomy)','Surgical pyloroplasty','Transpyloric stent (palliation)']} value={pyloricIntervention} onChange={setPyloricIntervention} accent="violet"/>
        </FL>
        <Gate label="Gastric electrical stimulator (GES) considered?" value={gastricStimulator} onChange={setGastricStimulator} accent="blue">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            GES (Enterra device): Implanted surgically. Approved for refractory diabetic/idiopathic gastroparesis. Reduces nausea/vomiting — does not improve gastric emptying per se. Limited availability in India — refer to tertiary centre.
          </div>
        </Gate>
        <FL label="Clinical notes"><textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="GES scintigraphy result, GCSI trend, dietary response, prokinetic tolerance..."/></FL>
        <button type="button" onClick={handleSave} className="w-full py-3 rounded-xl bg-teal-600 text-white font-bold text-sm shadow">Save Assessment</button>
      </Section>
    </div>
  );
}
