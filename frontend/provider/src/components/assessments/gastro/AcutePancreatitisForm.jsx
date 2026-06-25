/**
 * @shared-pool
 * AcutePancreatitisForm — Acute pancreatitis severity assessment
 * BISAP score, Ranson criteria, CT Severity Index (Balthazar), local complications
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */

import React, { useState, useMemo } from 'react';
import { Lock, ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  violet: { bg:'bg-violet-50', border:'border-violet-300', text:'text-violet-700', pill:'bg-violet-100 border-violet-400 text-violet-800', active:'bg-violet-600 text-white border-violet-600' },
  purple: { bg:'bg-purple-50', border:'border-purple-300', text:'text-purple-700', pill:'bg-purple-100 border-purple-400 text-purple-800', active:'bg-purple-600 text-white border-purple-600' },
  red:    { bg:'bg-red-50',    border:'border-red-300',    text:'text-red-700',    pill:'bg-red-100 border-red-400 text-red-800',    active:'bg-red-600 text-white border-red-600' },
  orange: { bg:'bg-orange-50', border:'border-orange-300', text:'text-orange-700', pill:'bg-orange-100 border-orange-400 text-orange-800', active:'bg-orange-500 text-white border-orange-500' },
  amber:  { bg:'bg-amber-50',  border:'border-amber-300',  text:'text-amber-700',  pill:'bg-amber-100 border-amber-400 text-amber-800',  active:'bg-amber-500 text-white border-amber-500' },
  blue:   { bg:'bg-blue-50',   border:'border-blue-300',   text:'text-blue-700',   pill:'bg-blue-100 border-blue-400 text-blue-800',   active:'bg-blue-600 text-white border-blue-600' },
  green:  { bg:'bg-green-50',  border:'border-green-300',  text:'text-green-700',  pill:'bg-green-100 border-green-400 text-green-800',  active:'bg-green-600 text-white border-green-600' },
  gray:   { bg:'bg-gray-50',   border:'border-gray-300',   text:'text-gray-700',   pill:'bg-gray-100 border-gray-400 text-gray-800',   active:'bg-gray-600 text-white border-gray-600' },
};

function Pills({options,value,onChange,accent='violet',multi=false}){
  const c=A[accent];const sel=multi?(Array.isArray(value)?value:[]):value;
  const toggle=opt=>{if(multi){const a=Array.isArray(sel)?sel:[];onChange(a.includes(opt)?a.filter(x=>x!==opt):[...a,opt]);}else onChange(sel===opt?'':opt);};
  return(<div className="flex flex-wrap gap-2">{options.map(opt=>{const active=multi?sel.includes(opt):sel===opt;return<button key={opt} type="button" onClick={()=>toggle(opt)} className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${active?c.active:c.pill}`}>{opt}</button>;})}</div>);
}
function FL({label,sub,children}){return(<div className="space-y-1"><label className="block text-sm font-semibold text-gray-700">{label}{sub&&<span className="ml-1 text-xs font-normal text-gray-500">{sub}</span>}</label>{children}</div>);}
function Gate({label,value,onChange,accent='violet',children}){
  const c=A[accent];
  return(<div className={`rounded-lg border ${c.border} ${c.bg} p-3`}><div className="flex items-center justify-between flex-wrap gap-2"><span className="text-sm font-medium text-gray-700">{label}</span><div className="flex gap-2">{['Yes','No'].map(opt=>(<button key={opt} type="button" onClick={()=>onChange(value===opt?'':opt)} className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all ${value===opt?c.active:c.pill}`}>{opt}</button>))}</div></div>{value==='Yes'&&children&&<div className="mt-3 space-y-3">{children}</div>}</div>);
}
function Section({title,applicable,onApplicable,accent='violet',children}){
  const c=A[accent];const[open,setOpen]=useState(true);
  if(applicable==='N/A')return(<div className={`rounded-xl border-2 border-dashed ${c.border} p-4 flex items-center gap-3 opacity-60`}><Lock className="w-5 h-5 text-gray-400"/><span className="text-sm text-gray-500 font-medium">{title} — Not applicable · section locked</span><button type="button" onClick={()=>onApplicable('Applicable')} className="ml-auto text-xs text-blue-600 underline">Unlock</button></div>);
  return(<div className={`rounded-xl border-2 ${c.border} overflow-hidden`}><div className={`${c.bg} px-4 py-3 flex items-center justify-between flex-wrap gap-2`}><span className={`font-bold text-base ${c.text}`}>{title}</span><div className="flex items-center gap-2"><div className="flex gap-1">{['Applicable','N/A'].map(v=>(<button key={v} type="button" onClick={()=>onApplicable(v)} className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold transition-all ${v===applicable?c.active:c.pill}`}>{v}</button>))}</div><button type="button" onClick={()=>setOpen(o=>!o)} className={`${c.text} p-1`}>{open?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</button></div></div>{open&&applicable==='Applicable'&&<div className="p-4 space-y-4">{children}</div>}</div>);
}

export default function AcutePancreatitisForm({patientId,encounterId,onSaved}){
  const[sec,setSec]=useState({presentation:'Applicable',bisap:'Applicable',ranson:'Applicable',ctsi:'Applicable',complications:'Applicable',management:'Applicable'});
  const sa=(k,v)=>setSec(s=>({...s,[k]:v}));

  /* Presentation */
  const[aetiology,setAetiology]=useState('');
  const[aetiologyDetails,setAetiologyDetails]=useState([]);
  const[severity,setSeverity]=useState('');
  const[painOnset,setPainOnset]=useState('');
  const[painCharacter,setPainCharacter]=useState([]);
  const[amylase,setAmylase]=useState('');
  const[lipase,setLipase]=useState('');
  const[bilirubinTotal,setBilirubinTotal]=useState('');
  const[alt,setAlt]=useState('');
  const[alp,setAlp]=useState('');

  /* BISAP */
  const[bisapBun,setBisapBun]=useState(false);
  const[bisapMentalStatus,setBisapMentalStatus]=useState(false);
  const[bisapSirs,setBisapSirs]=useState(false);
  const[bisapAge,setBisapAge]=useState(false);
  const[bisapPleural,setBisapPleural]=useState(false);

  /* Ranson */
  const[ransonAge,setRansonAge]=useState(false);
  const[ransonWbc,setRansonWbc]=useState(false);
  const[ransonGlucose,setRansonGlucose]=useState(false);
  const[ransonLdh,setRansonLdh]=useState(false);
  const[ransonAst,setRansonAst]=useState(false);
  const[ransonHct,setRansonHct]=useState(false);
  const[ransonBun,setRansonBun]=useState(false);
  const[ransonCa,setRansonCa]=useState(false);
  const[ransonPo2,setRansonPo2]=useState(false);
  const[ransonBase,setRansonBase]=useState(false);
  const[ransonFluid,setRansonFluid]=useState(false);

  /* CTSI */
  const[balthazar,setBalthazar]=useState(null);
  const[necrosisPercent,setNecrosisPercent]=useState(null);

  /* Complications */
  const[localComplications,setLocalComplications]=useState([]);
  const[systemicComplications,setSystemicComplications]=useState([]);
  const[organFailure,setOrganFailure]=useState([]);

  /* Management */
  const[ivFluid,setIvFluid]=useState('');
  const[fluidRate,setFluidRate]=useState('');
  const[analgesics,setAnalgesics]=useState([]);
  const[nutrition,setNutrition]=useState('');
  const[antibiotics,setAntibiotics]=useState('');
  const[ercp,setErcp]=useState('');
  const[ercpTiming,setErcpTiming]=useState('');
  const[interventional,setInterventional]=useState([]);
  const[disposition,setDisposition]=useState('');
  const[notes,setNotes]=useState('');

  /* BISAP score */
  const bisapScore=useMemo(()=>[bisapBun,bisapMentalStatus,bisapSirs,bisapAge,bisapPleural].filter(Boolean).length,[bisapBun,bisapMentalStatus,bisapSirs,bisapAge,bisapPleural]);
  const bisapInterp=useMemo(()=>{
    if(bisapScore<=1)return{label:'Low risk (<1% mortality)',color:'green'};
    if(bisapScore<=2)return{label:'Intermediate risk (~2–5%)',color:'amber'};
    if(bisapScore<=3)return{label:'High risk (~10–15%)',color:'orange'};
    return{label:'Very high risk (>20% mortality)',color:'red'};
  },[bisapScore]);

  /* Ranson score */
  const ransonScore=useMemo(()=>[ransonAge,ransonWbc,ransonGlucose,ransonLdh,ransonAst,ransonHct,ransonBun,ransonCa,ransonPo2,ransonBase,ransonFluid].filter(Boolean).length,[ransonAge,ransonWbc,ransonGlucose,ransonLdh,ransonAst,ransonHct,ransonBun,ransonCa,ransonPo2,ransonBase,ransonFluid]);
  const ransonInterp=useMemo(()=>{
    if(ransonScore<3)return{label:'Mild pancreatitis — <5% mortality',color:'green'};
    if(ransonScore<=4)return{label:'Moderate pancreatitis — ~15% mortality',color:'amber'};
    if(ransonScore<=6)return{label:'Severe pancreatitis — ~40% mortality',color:'orange'};
    return{label:'Critical — >40% mortality',color:'red'};
  },[ransonScore]);

  /* CTSI */
  const ctsiScore=useMemo(()=>{
    const b=balthazar||0;const n=necrosisPercent||0;return b+n;
  },[balthazar,necrosisPercent]);
  const ctsiInterp=useMemo(()=>{
    if(ctsiScore<=2)return{label:'Mild — minimal complications',color:'green'};
    if(ctsiScore<=6)return{label:'Moderate — complications likely',color:'amber'};
    return{label:'Severe — high complication rate (>50%), 17% mortality',color:'red'};
  },[ctsiScore]);

  const severeAlert=bisapScore>=3||ransonScore>=3||organFailure.length>0;

  const handleSave=async()=>{
    try{
      await api.post('/assessments',{type:'acute-pancreatitis',patientId,encounterId,data:{aetiology,aetiologyDetails,severity,painOnset,painCharacter,labs:{amylase,lipase,bilirubinTotal,alt,alp},bisap:{bun:bisapBun,mentalStatus:bisapMentalStatus,sirs:bisapSirs,age:bisapAge,pleural:bisapPleural,score:bisapScore,interp:bisapInterp.label},ranson:{age:ransonAge,wbc:ransonWbc,glucose:ransonGlucose,ldh:ransonLdh,ast:ransonAst,hct:ransonHct,bun:ransonBun,ca:ransonCa,po2:ransonPo2,base:ransonBase,fluid:ransonFluid,score:ransonScore,interp:ransonInterp.label},ctsi:{balthazar,necrosisPercent,score:ctsiScore,interp:ctsiInterp.label},complications:{local:localComplications,systemic:systemicComplications,organFailure},management:{ivFluid,fluidRate,analgesics,nutrition,antibiotics,ercp,ercpTiming,interventional,disposition},notes}});
      onSaved?.();
    }catch(e){console.error(e);}
  };

  return(
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-2xl p-5 shadow-lg">
        <h2 className="text-xl font-bold">Acute Pancreatitis Assessment</h2>
        <p className="text-violet-100 text-sm mt-1">BISAP · Ranson Criteria · CT Severity Index · Local/Systemic complications</p>
      </div>

      {severeAlert&&(
        <div className="bg-red-600 text-white rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-6 h-6 shrink-0"/>
          <div><p className="font-bold">Severe/Critical Pancreatitis — ICU/HDU admission required</p><p className="text-sm text-red-100">Aggressive IV fluid resuscitation · Organ support · Early CECT abdomen · GI/HPB surgical referral</p></div>
        </div>
      )}

      <Section title="Presentation & Aetiology" applicable={sec.presentation} onApplicable={v=>sa('presentation',v)} accent="violet">
        <FL label="Aetiology">
          <Pills options={['Gallstone (biliary)','Alcohol','Idiopathic','Hypertriglyceridaemia','Post-ERCP','Drug-induced','Autoimmune','Hypercalcaemia','Trauma','Pancreatic tumour','Genetic (CFTR/PRSS1)']} value={aetiology} onChange={setAetiology} accent="violet"/>
        </FL>
        {aetiology==='Gallstone (biliary)'&&(
          <FL label="Biliary details" sub="multi-select">
            <Pills options={['Bile duct dilatation on USS','CBD stone confirmed','Cholangitis features (Charcot triad)','ERCP indicated','Cholecystectomy planned']} value={aetiologyDetails} onChange={setAetiologyDetails} accent="violet" multi/>
          </FL>
        )}
        {aetiology==='Hypertriglyceridaemia'&&(
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-sm text-violet-800">
            TG &gt;1000 mg/dL — treat with IV insulin + dextrose infusion or plasmapheresis in severe cases. Check TG level even if lipase equivocal (lipase can be falsely low in HTG pancreatitis).
          </div>
        )}
        <FL label="Severity (Atlanta 2012)">
          <Pills options={['Mild — no organ failure, no local complications','Moderately severe — transient organ failure (<48h) or local complications','Severe — persistent organ failure (≥48h)']} value={severity} onChange={setSeverity} accent="violet"/>
        </FL>
        <FL label="Pain onset">
          <Pills options={['<24 hours','24–48 hours','48–72 hours','>72 hours']} value={painOnset} onChange={setPainOnset} accent="violet"/>
        </FL>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Amylase (U/L)"><input type="number" value={amylase} onChange={e=>setAmylase(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="Lipase (U/L)"><input type="number" value={lipase} onChange={e=>setLipase(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="Total bilirubin (mg/dL)"><input type="number" step="0.1" value={bilirubinTotal} onChange={e=>setBilirubinTotal(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="ALT (U/L)"><input type="number" value={alt} onChange={e=>setAlt(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="ALP (U/L)"><input type="number" value={alp} onChange={e=>setAlp(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
        </div>
        {parseInt(alt||0)>150&&<p className="text-xs text-amber-700 font-medium">ALT &gt;150 U/L at admission — gallstone pancreatitis likely (PPV ~95%).</p>}
        <div className={`p-3 rounded-lg text-sm ${A.violet.bg} ${A.violet.border} border`}>
          <p className={`font-semibold ${A.violet.text}`}>India context</p>
          <p className="text-gray-600 mt-1">Gallstone pancreatitis most common in females. Alcohol pancreatitis common in males (rural/urban). Tropical pancreatitis (cassava/malnutrition-related, CFTR mutations) is India/Asia-specific — chronic calcific pancreatitis with early diabetes. High TG pancreatitis increasingly common with metabolic syndrome.</p>
        </div>
      </Section>

      <Section title="BISAP Score (at presentation)" applicable={sec.bisap} onApplicable={v=>sa('bisap',v)} accent="purple">
        <p className="text-xs text-gray-500">Bedside Index of Severity in Acute Pancreatitis — 5 binary criteria</p>
        <div className="space-y-2">
          {[
            ['BUN >25 mg/dL (>8.9 mmol/L)',bisapBun,setBisapBun],
            ['Impaired mental status (GCS <15 / disorientation)',bisapMentalStatus,setBisapMentalStatus],
            ['SIRS ≥2 criteria (Temp >38°C or <36°C, HR >90, RR >20 or PaCO₂ <32, WBC >12k or <4k or >10% bands)',bisapSirs,setBisapSirs],
            ['Age >60 years',bisapAge,setBisapAge],
            ['Pleural effusion on imaging',bisapPleural,setBisapPleural],
          ].map(([lbl,val,setter])=>(
            <button key={lbl} type="button" onClick={()=>setter(!val)} className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${val?A.purple.active:A.purple.pill}`}>
              {val?'✓ ':''}{lbl}
            </button>
          ))}
        </div>
        <div className={`rounded-xl border-2 ${A[bisapInterp.color]?.border} ${A[bisapInterp.color]?.bg} p-4 mt-2`}>
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-black ${A[bisapInterp.color]?.text}`}>BISAP: {bisapScore}/5</span>
            <span className={`text-sm font-semibold ${A[bisapInterp.color]?.text}`}>{bisapInterp.label}</span>
          </div>
        </div>
      </Section>

      <Section title="Ranson Criteria" applicable={sec.ranson} onApplicable={v=>sa('ranson',v)} accent="orange">
        <p className="text-xs text-gray-500">5 criteria at admission + 6 criteria at 48h. Scored for non-gallstone aetiology; modify thresholds for gallstone AP.</p>
        <p className="text-xs font-semibold text-orange-600 mt-1">At admission:</p>
        <div className="space-y-1">
          {[
            ['Age >55 years (non-biliary) / >70 (biliary)',ransonAge,setRansonAge],
            ['WBC >16,000/mm³ (non-biliary) / >18,000 (biliary)',ransonWbc,setRansonWbc],
            ['Blood glucose >11 mmol/L (>200 mg/dL)',ransonGlucose,setRansonGlucose],
            ['LDH >350 U/L (non-biliary) / >400 (biliary)',ransonLdh,setRansonLdh],
            ['AST >250 U/L (non-biliary) / >250 (biliary)',ransonAst,setRansonAst],
          ].map(([lbl,val,setter])=>(
            <button key={lbl} type="button" onClick={()=>setter(!val)} className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${val?A.orange.active:A.orange.pill}`}>{val?'✓ ':''}{lbl}</button>
          ))}
        </div>
        <p className="text-xs font-semibold text-orange-600 mt-2">At 48 hours:</p>
        <div className="space-y-1">
          {[
            ['Haematocrit fall >10%',ransonHct,setRansonHct],
            ['BUN rise >5 mg/dL (>1.8 mmol/L)',ransonBun,setRansonBun],
            ['Calcium <8 mg/dL (<2 mmol/L)',ransonCa,setRansonCa],
            ['PaO₂ <60 mmHg',ransonPo2,setRansonPo2],
            ['Base deficit >4 mEq/L',ransonBase,setRansonBase],
            ['Fluid sequestration >6L',ransonFluid,setRansonFluid],
          ].map(([lbl,val,setter])=>(
            <button key={lbl} type="button" onClick={()=>setter(!val)} className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${val?A.orange.active:A.orange.pill}`}>{val?'✓ ':''}{lbl}</button>
          ))}
        </div>
        <div className={`rounded-xl border-2 ${A[ransonInterp.color]?.border} ${A[ransonInterp.color]?.bg} p-4 mt-2`}>
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-black ${A[ransonInterp.color]?.text}`}>Ranson: {ransonScore}/11</span>
            <span className={`text-sm font-semibold ${A[ransonInterp.color]?.text}`}>{ransonInterp.label}</span>
          </div>
        </div>
      </Section>

      <Section title="CT Severity Index (Balthazar)" applicable={sec.ctsi} onApplicable={v=>sa('ctsi',v)} accent="blue">
        <p className="text-xs text-gray-500">CECT abdomen — perform 48–72h after onset (not on day 1). Balthazar grade + necrosis score = CTSI (max 10).</p>
        <FL label="Balthazar grade">
          <div className="space-y-1">
            {[['A — Normal pancreas (0)',0],['B — Focal/diffuse enlargement (1)',1],['C — Peripancreatic inflammation (2)',2],['D — Single fluid collection (3)',3],['E — Multiple fluid collections or gas (4)',4]].map(([lbl,pts])=>(
              <button key={lbl} type="button" onClick={()=>setBalthazar(balthazar===pts?null:pts)} className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${balthazar===pts?A.blue.active:A.blue.pill}`}>{lbl}</button>
            ))}
          </div>
        </FL>
        <FL label="Degree of pancreatic necrosis">
          <div className="space-y-1">
            {[['None (0)',0],['<33% necrosis (2)',2],['33–50% necrosis (4)',4],['>50% necrosis (6)',6]].map(([lbl,pts])=>(
              <button key={lbl} type="button" onClick={()=>setNecrosisPercent(necrosisPercent===pts?null:pts)} className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${necrosisPercent===pts?A.blue.active:A.blue.pill}`}>{lbl}</button>
            ))}
          </div>
        </FL>
        {(balthazar!=null||necrosisPercent!=null)&&(
          <div className={`rounded-xl border-2 ${A[ctsiInterp.color]?.border} ${A[ctsiInterp.color]?.bg} p-4`}>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-black ${A[ctsiInterp.color]?.text}`}>CTSI: {ctsiScore}/10</span>
              <span className={`text-sm font-semibold ${A[ctsiInterp.color]?.text}`}>{ctsiInterp.label}</span>
            </div>
          </div>
        )}
      </Section>

      <Section title="Complications" applicable={sec.complications} onApplicable={v=>sa('complications',v)} accent="red">
        <FL label="Local complications (revised Atlanta 2012)" sub="multi-select">
          <Pills options={['Acute peripancreatic fluid collection (APFC) — first 4 weeks','Acute necrotic collection (ANC) — first 4 weeks','Pancreatic pseudocyst (>4 weeks, walls)','Walled-off pancreatic necrosis (WOPN, >4 weeks)','Splenic vein thrombosis','Portal vein thrombosis','Pseudoaneurysm','Disconnected pancreatic duct']} value={localComplications} onChange={setLocalComplications} accent="red" multi/>
        </FL>
        <FL label="Systemic complications" sub="multi-select">
          <Pills options={['ARDS / respiratory failure','AKI / acute tubular necrosis','Haemodynamic instability / shock','Coagulopathy / DIC','Hyperglycaemia','Hypocalcaemia','Infected necrosis (fever + gas on CT)']} value={systemicComplications} onChange={setSystemicComplications} accent="red" multi/>
        </FL>
        <FL label="Organ failure" sub="multi-select">
          <Pills options={['Respiratory (PaO₂/FiO₂ <300)','Renal (creatinine >177 µmol/L)','Cardiovascular (SBP <90 despite fluids)']} value={organFailure} onChange={setOrganFailure} accent="red" multi/>
        </FL>
        {localComplications.includes('Infected necrosis (fever + gas on CT)')&&(
          <div className="bg-red-600 text-white rounded-xl p-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5"/>
            <p className="text-sm font-bold">Infected necrosis — IV antibiotics (imipenem or meropenem). Minimally-invasive necrosectomy (step-up approach): EUS-guided drainage → VARD if needed. Avoid surgery in first 4 weeks.</p>
          </div>
        )}
      </Section>

      <Section title="Management" applicable={sec.management} onApplicable={v=>sa('management',v)} accent="green">
        <FL label="IV fluid resuscitation">
          <Pills options={['Lactated Ringer\'s (preferred over NS — reduces SIRS)','Normal saline 0.9%','Hartmann\'s solution','Aggressive (250–500 mL/h initial)','Conservative (250 mL/h)','Guided by urine output >0.5 mL/kg/h']} value={ivFluid} onChange={setIvFluid} accent="green"/>
        </FL>
        <FL label="Target fluid rate">
          <input type="text" value={fluidRate} onChange={e=>setFluidRate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 500 mL/h × 2h then 250 mL/h, reassess 6-hourly"/>
        </FL>
        <FL label="Analgesia" sub="multi-select">
          <Pills options={['IV paracetamol','Tramadol IV/IM','Morphine PCA','Epidural analgesia','NSAIDS (avoid if renal impairment)','Pentazocine (common in India)']} value={analgesics} onChange={setAnalgesics} accent="green" multi/>
        </FL>
        <FL label="Nutrition">
          <Pills options={['Oral — tolerated (mild AP)','Nasogastric feeding (moderate/severe — early EN within 24–48h)','Nasojejunal feeding (post-pyloric, better tolerated)','TPN — only if EN not tolerated/feasible','NBM — reassess within 24–48h']} value={nutrition} onChange={setNutrition} accent="green"/>
        </FL>
        <FL label="Antibiotics">
          <Pills options={['Not indicated (mild/sterile pancreatitis)','IV meropenem (suspected infected necrosis)','Piperacillin-tazobactam','Ceftriaxone + metronidazole (cholangitis cover)','Imipenem (penetrates pancreatic necrosis well)']} value={antibiotics} onChange={setAntibiotics} accent="amber"/>
        </FL>
        <Gate label="ERCP indicated (biliary pancreatitis + cholangitis)?" value={ercp} onChange={setErcp} accent="blue">
          <FL label="ERCP timing">
            <Pills options={['Urgent ERCP <24h (cholangitis / CBD obstruction)','Early ERCP 48–72h (gallstone pancreatitis)','Elective (after recovery)']} value={ercpTiming} onChange={setErcpTiming} accent="blue"/>
          </FL>
        </Gate>
        <FL label="Interventional / surgical procedures" sub="multi-select">
          <Pills options={['EUS-guided pseudocyst drainage','Endoscopic WOPN debridement (step-up)','Percutaneous drainage','Video-assisted retroperitoneal debridement (VARD)','Open necrosectomy (last resort)','Cholecystectomy (laparoscopic — before discharge or within 2 weeks mild AP)','Whipple/distal pancreatectomy (tumour-related)']} value={interventional} onChange={setInterventional} accent="blue" multi/>
        </FL>
        <FL label="Disposition">
          <Pills options={['ICU','HDU / step-down unit','GI / general ward','Discharge — mild AP (pain resolved, tolerating oral)']} value={disposition} onChange={setDisposition} accent="violet"/>
        </FL>
        <FL label="Clinical notes"><textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Progress, imaging findings, plan..."/></FL>
        <button type="button" onClick={handleSave} className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold text-sm shadow">Save Assessment</button>
      </Section>
    </div>
  );
}
