/**
 * @shared-pool
 * DysphagiaEsophagealForm — Dysphagia & oesophageal motility assessment
 * Eckardt Score (achalasia), Chicago Classification, dysphagia grading, Barrett's surveillance
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */

import React, { useState, useMemo } from 'react';
import { Lock, ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  blue:   { bg:'bg-blue-50',   border:'border-blue-300',   text:'text-blue-700',   pill:'bg-blue-100 border-blue-400 text-blue-800',   active:'bg-blue-600 text-white border-blue-600' },
  indigo: { bg:'bg-indigo-50', border:'border-indigo-300', text:'text-indigo-700', pill:'bg-indigo-100 border-indigo-400 text-indigo-800', active:'bg-indigo-600 text-white border-indigo-600' },
  red:    { bg:'bg-red-50',    border:'border-red-300',    text:'text-red-700',    pill:'bg-red-100 border-red-400 text-red-800',    active:'bg-red-600 text-white border-red-600' },
  orange: { bg:'bg-orange-50', border:'border-orange-300', text:'text-orange-700', pill:'bg-orange-100 border-orange-400 text-orange-800', active:'bg-orange-500 text-white border-orange-500' },
  amber:  { bg:'bg-amber-50',  border:'border-amber-300',  text:'text-amber-700',  pill:'bg-amber-100 border-amber-400 text-amber-800',  active:'bg-amber-500 text-white border-amber-500' },
  green:  { bg:'bg-green-50',  border:'border-green-300',  text:'text-green-700',  pill:'bg-green-100 border-green-400 text-green-800',  active:'bg-green-600 text-white border-green-600' },
  violet: { bg:'bg-violet-50', border:'border-violet-300', text:'text-violet-700', pill:'bg-violet-100 border-violet-400 text-violet-800', active:'bg-violet-600 text-white border-violet-600' },
  gray:   { bg:'bg-gray-50',   border:'border-gray-300',   text:'text-gray-700',   pill:'bg-gray-100 border-gray-400 text-gray-800',   active:'bg-gray-600 text-white border-gray-600' },
};

function Pills({options,value,onChange,accent='blue',multi=false}){
  const c=A[accent];const sel=multi?(Array.isArray(value)?value:[]):value;
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
  return(<div className={`rounded-xl border-2 ${c.border} overflow-hidden`}><div className={`${c.bg} px-4 py-3 flex items-center justify-between flex-wrap gap-2`}><span className={`font-bold text-base ${c.text}`}>{title}</span><div className="flex items-center gap-2"><div className="flex gap-1">{['Applicable','N/A'].map(v=>(<button key={v} type="button" onClick={()=>onApplicable(v)} className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold transition-all ${v===applicable?c.active:c.pill}`}>{v}</button>))}</div><button type="button" onClick={()=>setOpen(o=>!o)} className={`${c.text} p-1`}>{open?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</button></div></div>{open&&applicable==='Applicable'&&<div className="p-4 space-y-4">{children}</div>}</div>);
}
function ScoreRow({label,options,value,onChange,accent='blue'}){
  const c=A[accent];
  return(<div className="flex items-start gap-3 flex-wrap"><span className="text-sm text-gray-600 w-40 shrink-0 pt-1">{label}</span><div className="flex flex-wrap gap-1 flex-1">{options.map(([lbl,pts])=>{const active=value===pts;return<button key={lbl} type="button" onClick={()=>onChange(active?null:pts)} className={`px-2.5 py-1 rounded border text-xs font-medium transition-all ${active?c.active:c.pill}`}>{lbl}({pts})</button>;})}</div></div>);
}

export default function DysphagiaEsophagealForm({patientId,encounterId,onSaved}){
  const[sec,setSec]=useState({presentation:'Applicable',eckardt:'Applicable',chicago:'Applicable',structure:'Applicable',investigations:'Applicable',treatment:'Applicable'});
  const sa=(k,v)=>setSec(s=>({...s,[k]:v}));

  /* Presentation */
  const[diagnosis,setDiagnosis]=useState('');
  const[dysphagiaGrade,setDysphagiaGrade]=useState('');
  const[symptoms,setSymptoms]=useState([]);
  const[onset,setOnset]=useState('');
  const[weightLoss,setWeightLoss]=useState('');
  const[aspirationRisk,setAspirationRisk]=useState('');

  /* Eckardt Score (Achalasia) */
  const[eckDysphagia,setEckDysphagia]=useState(null);
  const[eckRegurgitation,setEckRegurgitation]=useState(null);
  const[eckChestPain,setEckChestPain]=useState(null);
  const[eckWeightLoss,setEckWeightLoss]=useState(null);

  /* Chicago Classification / HRM */
  const[hrmDone,setHrmDone]=useState('');
  const[chicagoType,setChicagoType]=useState('');
  const[ivrResidualPressure,setIvrResidualPressure]=useState('');
  const[dciValue,setDciValue]=useState('');

  /* Structural */
  const[structuralDiagnosis,setStructuralDiagnosis]=useState([]);
  const[schatzki,setSchatzki]=useState('');
  const[webRing,setWebRing]=useState('');

  /* Investigations */
  const[barium,setBarium]=useState('');
  const[ogedFindings,setOgedFindings]=useState('');
  const[ctChest,setCtChest]=useState('');
  const[phStudy,setPhStudy]=useState('');
  const[barrettsSurveillance,setBarrettsSurveillance]=useState('');

  /* Treatment */
  const[treatmentPlan,setTreatmentPlan]=useState([]);
  const[dilatation,setDilatation]=useState('');
  const[botoxInjection,setBotoxInjection]=useState('');
  const[poemDone,setPoemDone]=useState('');
  const[hellersMyotomy,setHellersMyotomy]=useState('');
  const[notes,setNotes]=useState('');

  /* Eckardt score */
  const eckardtScore=useMemo(()=>[eckDysphagia,eckRegurgitation,eckChestPain,eckWeightLoss].filter(v=>v!=null).reduce((a,b)=>a+b,0),[eckDysphagia,eckRegurgitation,eckChestPain,eckWeightLoss]);
  const eckardtInterp=useMemo(()=>{
    if(eckardtScore<=1)return{label:'Remission (post-treatment target ≤3)',color:'green'};
    if(eckardtScore<=3)return{label:'Grade I — Mild achalasia',color:'green'};
    if(eckardtScore<=6)return{label:'Grade II — Moderate achalasia',color:'amber'};
    return{label:'Grade III — Severe achalasia',color:'red'};
  },[eckardtScore]);

  const handleSave=async()=>{
    try{
      await api.post('/assessments',{type:'dysphagia-oesophageal',patientId,encounterId,data:{diagnosis,dysphagiaGrade,symptoms,onset,weightLoss,aspirationRisk,eckardt:{dysphagia:eckDysphagia,regurgitation:eckRegurgitation,chestPain:eckChestPain,weightLoss:eckWeightLoss,score:eckardtScore,interp:eckardtInterp.label},chicago:{hrmDone,type:chicagoType,ivrResidualPressure,dciValue},structural:{diagnoses:structuralDiagnosis,schatzki,webRing},investigations:{barium,ogedFindings,ctChest,phStudy,barrettsSurveillance},treatment:{plan:treatmentPlan,dilatation,botoxInjection,poemDone,hellersMyotomy},notes}});
      onSaved?.();
    }catch(e){console.error(e);}
  };

  return(
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-5 shadow-lg">
        <h2 className="text-xl font-bold">Dysphagia & Oesophageal Assessment</h2>
        <p className="text-blue-100 text-sm mt-1">Eckardt Score · Chicago Classification · HRM · POEM · Structural oesophageal disease</p>
      </div>

      <Section title="Presentation" applicable={sec.presentation} onApplicable={v=>sa('presentation',v)} accent="blue">
        <FL label="Working diagnosis">
          <Pills options={['Achalasia cardia','Oesophageal spasm (DES/Jackhammer)','Ineffective oesophageal motility','Nutcracker/Hypercontractile oesophagus','Peptic stricture','Schatzki ring / lower oesophageal ring','Oesophageal web (Plummer-Vinson)','Oesophageal carcinoma','Extrinsic compression','Oropharyngeal dysphagia (neuromuscular)','Scleroderma oesophagus','Eosinophilic oesophagitis (EoE)','Boerhaave syndrome (oesophageal perforation)']} value={diagnosis} onChange={setDiagnosis} accent="blue"/>
        </FL>
        <FL label="Dysphagia grade (Ogilvie scale)">
          <div className="space-y-1">
            {[['Grade 0 — No dysphagia'],['Grade 1 — Dysphagia to solids only'],['Grade 2 — Dysphagia to semisolids'],['Grade 3 — Dysphagia to liquids also'],['Grade 4 — Complete dysphagia (aphagia)']].map(([lbl])=>(
              <button key={lbl} type="button" onClick={()=>setDysphagiaGrade(dysphagiaGrade===lbl?'':lbl)} className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${dysphagiaGrade===lbl?A.blue.active:A.blue.pill}`}>{lbl}</button>
            ))}
          </div>
        </FL>
        <FL label="Symptoms" sub="multi-select">
          <Pills options={['Solid food dysphagia','Liquid dysphagia','Odynophagia (painful swallowing)','Regurgitation of undigested food','Nocturnal regurgitation / aspiration','Chest pain (oesophageal)','Heartburn / acid reflux','Globus sensation','Hoarseness / dysphonia','Cough (aspiration)','Weight loss']} value={symptoms} onChange={setSymptoms} accent="blue" multi/>
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Duration of dysphagia">
            <Pills options={['<4 weeks','1–3 months','3–12 months','>1 year','Years — intermittent']} value={onset} onChange={setOnset} accent="blue"/>
          </FL>
          <FL label="Weight loss">
            <Pills options={['None','<5%','5–10%','>10% (alarm feature)']} value={weightLoss} onChange={setWeightLoss} accent="red"/>
          </FL>
        </div>
        <FL label="Aspiration risk">
          <Pills options={['Low','Moderate — coughing on swallowing','High — recurrent aspiration pneumonia','SLT assessment required']} value={aspirationRisk} onChange={setAspirationRisk} accent="orange"/>
        </FL>
      </Section>

      <Section title="Eckardt Score (Achalasia)" applicable={sec.eckardt} onApplicable={v=>sa('eckardt',v)} accent="indigo">
        <p className="text-xs text-gray-500">Score 0–12. Treatment success = post-treatment Eckardt ≤3.</p>
        <div className="space-y-2">
          <ScoreRow label="Dysphagia" options={[['None(0)',0],['Occasional(1)',1],['Daily(2)',2],['Each meal(3)',3]]} value={eckDysphagia} onChange={setEckDysphagia} accent="indigo"/>
          <ScoreRow label="Regurgitation" options={[['None(0)',0],['Occasional(1)',1],['Daily(2)',2],['Each meal(3)',3]]} value={eckRegurgitation} onChange={setEckRegurgitation} accent="indigo"/>
          <ScoreRow label="Chest pain" options={[['None(0)',0],['Occasional(1)',1],['Daily(2)',2],['Each meal(3)',3]]} value={eckChestPain} onChange={setEckChestPain} accent="indigo"/>
          <ScoreRow label="Weight loss" options={[['None(0)',0],['<5 kg(1)',1],['5–10 kg(2)',2],['>10 kg(3)',3]]} value={eckWeightLoss} onChange={setEckWeightLoss} accent="indigo"/>
        </div>
        <div className={`rounded-xl border-2 ${A[eckardtInterp.color]?.border} ${A[eckardtInterp.color]?.bg} p-4 mt-2`}>
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-black ${A[eckardtInterp.color]?.text}`}>Eckardt: {eckardtScore}/12</span>
            <span className={`text-sm font-semibold ${A[eckardtInterp.color]?.text}`}>{eckardtInterp.label}</span>
          </div>
        </div>
      </Section>

      <Section title="Chicago Classification (HRM)" applicable={sec.chicago} onApplicable={v=>sa('chicago',v)} accent="violet">
        <FL label="High-resolution manometry (HRM) performed">
          <Pills options={['Yes','Pending','Not available in this centre','Not indicated']} value={hrmDone} onChange={setHrmDone} accent="violet"/>
        </FL>
        {hrmDone==='Yes'&&(
          <>
            <div className="grid grid-cols-2 gap-3">
              <FL label="IRP (Integrated Relaxation Pressure mmHg)"><input type="number" step="0.1" value={ivrResidualPressure} onChange={e=>setIvrResidualPressure(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder=">15 mmHg = impaired EGJ relaxation"/></FL>
              <FL label="DCI (Distal Contractile Integral mmHg·s·cm)"><input type="number" value={dciValue} onChange={e=>setDciValue(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder=">8000 = Jackhammer; <100 = ineffective"/></FL>
            </div>
            <FL label="Chicago Classification v4.0 diagnosis">
              <div className="space-y-1">
                {[
                  ['Type I Achalasia — No peristalsis + impaired EGJ relaxation (IRP >15)','indigo'],
                  ['Type II Achalasia — Pan-oesophageal pressurisation + impaired EGJ relaxation','indigo'],
                  ['Type III Achalasia — Spastic/premature contractions + impaired EGJ relaxation','indigo'],
                  ['EGJ Outflow Obstruction — IRP elevated, preserved peristalsis','violet'],
                  ['Distal Oesophageal Spasm (DES) — Premature contractions DCI >450, normal IRP','orange'],
                  ['Jackhammer/Hypercontractile — DCI >8000 mmHg·s·cm in ≥20% swallows','orange'],
                  ['Absent Contractility — No peristalsis, normal IRP (scleroderma)','gray'],
                  ['Ineffective Oesophageal Motility (IEM) — Weak/failed peristalsis ≥70%','gray'],
                  ['Normal oesophageal motility','green'],
                ].map(([lbl,col])=>(
                  <button key={lbl} type="button" onClick={()=>setChicagoType(chicagoType===lbl?'':lbl)} className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${chicagoType===lbl?A[col].active:A[col].pill}`}>{lbl}</button>
                ))}
              </div>
            </FL>
          </>
        )}
      </Section>

      <Section title="Structural Oesophageal Disease" applicable={sec.structure} onApplicable={v=>sa('structure',v)} accent="orange">
        <FL label="Structural findings" sub="multi-select">
          <Pills options={['Peptic stricture','Schatzki ring (B ring at GEJ)','Oesophageal web (Plummer-Vinson syndrome)','Zenker\'s pharyngeal pouch','Epiphrenic diverticulum','Eosinophilic oesophagitis (EoE) — rings/furrows on OGD','Extrinsic compression (vascular/mediastinal)','Diaphragmatic hiatus hernia','Sliding hiatus hernia','Para-oesophageal hernia']} value={structuralDiagnosis} onChange={setStructuralDiagnosis} accent="orange" multi/>
        </FL>
        {structuralDiagnosis.includes('Plummer-Vinson syndrome')&&(
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            Plummer-Vinson: Iron-deficiency anaemia + dysphagia + oesophageal web (upper). Treat IDA first; endoscopic dilatation if symptomatic. Risk of SCC — surveillance.
          </div>
        )}
        <FL label="Schatzki ring features">
          <Pills options={['Not present','Incidental finding — asymptomatic','Symptomatic — lumen <13mm','Treated — endoscopic dilatation performed']} value={schatzki} onChange={setSchatzki} accent="orange"/>
        </FL>
      </Section>

      <Section title="Investigations" applicable={sec.investigations} onApplicable={v=>sa('investigations',v)} accent="blue">
        <FL label="Barium swallow / barium meal result">
          <Pills options={['Not done','Bird-beak deformity (achalasia)','Rat-tail narrowing (carcinoma)','Cobblestone (EoE)','Stricture — smooth (peptic/benign)','Stricture — irregular (malignant)','Corkscrew pattern (DES)','Hiatus hernia','Zenker\'s pouch','Normal']} value={barium} onChange={setBarium} accent="blue"/>
        </FL>
        <FL label="OGD findings">
          <input type="text" value={ogedFindings} onChange={e=>setOgedFindings(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Endoscopy findings, biopsies taken, dilatation performed..."/>
        </FL>
        <FL label="CT chest/abdomen result">
          <input type="text" value={ctChest} onChange={e=>setCtChest(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Mediastinal adenopathy, dilated oesophagus, mass..."/>
        </FL>
        <FL label="24-hour pH / impedance study">
          <Pills options={['Not done','DeMeester score elevated (>14.72)','Pathological acid exposure (>4% time pH <4)','Normal pH study','Reflux on impedance without acid']} value={phStudy} onChange={setPhStudy} accent="blue"/>
        </FL>
        <FL label="Barrett's surveillance schedule">
          <Pills options={['Not applicable','Non-dysplastic BE <3cm — 5-yearly OGD','Non-dysplastic BE ≥3cm — 3-yearly OGD','Low-grade dysplasia — 6-monthly or ablation','High-grade dysplasia — RFA / EMR / ESD']} value={barrettsSurveillance} onChange={setBarrettsSurveillance} accent="green"/>
        </FL>
      </Section>

      <Section title="Treatment" applicable={sec.treatment} onApplicable={v=>sa('treatment',v)} accent="green">
        <FL label="Treatment plan" sub="multi-select">
          <Pills options={['Pneumatic dilatation (HD)','Endoscopic botulinum toxin injection','POEM (Per-Oral Endoscopic Myotomy)','Heller\'s laparoscopic myotomy + fundoplication','Endoscopic dilatation (stricture/ring)','PPI therapy (GERD/peptic stricture)','Iron supplementation (Plummer-Vinson)','Budesonide/fluticasone swallowed (EoE)','Elimination diet (EoE — 6-food)','PEG tube / NGT (aspiration risk)','Oesophageal stenting (malignant)','Surgical referral (perforation/malignancy)']} value={treatmentPlan} onChange={setTreatmentPlan} accent="green" multi/>
        </FL>
        <Gate label="Pneumatic dilatation performed?" value={dilatation} onChange={setDilatation} accent="green">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
            Graded dilatation: 30mm → 35mm → 40mm. Perforation risk ~2%. Monitor post-procedure for 4–6h; CXR before discharge.
          </div>
        </Gate>
        <Gate label="POEM performed?" value={poemDone} onChange={setPoemDone} accent="green">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
            POEM success rate ~90% at 5 years. GERD complication in ~30% — prescribe PPI post-POEM. Available at AIIMS, Medanta, Asian Institute of Gastroenterology.
          </div>
        </Gate>
        <FL label="Clinical notes"><textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="HRM findings, procedure details, post-treatment Eckardt score..."/></FL>
        <button type="button" onClick={handleSave} className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm shadow">Save Assessment</button>
      </Section>
    </div>
  );
}
