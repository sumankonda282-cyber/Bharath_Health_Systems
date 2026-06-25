/**
 * @shared-pool
 * LiverDiseaseAssessmentForm — Chronic liver disease, cirrhosis, viral hepatitis
 * Child-Pugh, MELD score, ascites, SBP, hepatic encephalopathy grading
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */

import React, { useState, useMemo } from 'react';
import { Lock, ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  amber:  { bg:'bg-amber-50',  border:'border-amber-300',  text:'text-amber-700',  pill:'bg-amber-100 border-amber-400 text-amber-800',  active:'bg-amber-500 text-white border-amber-500' },
  yellow: { bg:'bg-yellow-50', border:'border-yellow-300', text:'text-yellow-700', pill:'bg-yellow-100 border-yellow-400 text-yellow-800', active:'bg-yellow-500 text-white border-yellow-500' },
  orange: { bg:'bg-orange-50', border:'border-orange-300', text:'text-orange-700', pill:'bg-orange-100 border-orange-400 text-orange-800', active:'bg-orange-500 text-white border-orange-500' },
  red:    { bg:'bg-red-50',    border:'border-red-300',    text:'text-red-700',    pill:'bg-red-100 border-red-400 text-red-800',    active:'bg-red-600 text-white border-red-600' },
  blue:   { bg:'bg-blue-50',   border:'border-blue-300',   text:'text-blue-700',   pill:'bg-blue-100 border-blue-400 text-blue-800',   active:'bg-blue-600 text-white border-blue-600' },
  green:  { bg:'bg-green-50',  border:'border-green-300',  text:'text-green-700',  pill:'bg-green-100 border-green-400 text-green-800',  active:'bg-green-600 text-white border-green-600' },
  violet: { bg:'bg-violet-50', border:'border-violet-300', text:'text-violet-700', pill:'bg-violet-100 border-violet-400 text-violet-800', active:'bg-violet-600 text-white border-violet-600' },
  gray:   { bg:'bg-gray-50',   border:'border-gray-300',   text:'text-gray-700',   pill:'bg-gray-100 border-gray-400 text-gray-800',   active:'bg-gray-600 text-white border-gray-600' },
};

function Pills({options,value,onChange,accent='amber',multi=false}){
  const c=A[accent];const sel=multi?(Array.isArray(value)?value:[]):value;
  const toggle=opt=>{if(multi){const a=Array.isArray(sel)?sel:[];onChange(a.includes(opt)?a.filter(x=>x!==opt):[...a,opt]);}else onChange(sel===opt?'':opt);};
  return(<div className="flex flex-wrap gap-2">{options.map(opt=>{const active=multi?sel.includes(opt):sel===opt;return<button key={opt} type="button" onClick={()=>toggle(opt)} className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${active?c.active:c.pill}`}>{opt}</button>;})}</div>);
}
function FL({label,sub,children}){return(<div className="space-y-1"><label className="block text-sm font-semibold text-gray-700">{label}{sub&&<span className="ml-1 text-xs font-normal text-gray-500">{sub}</span>}</label>{children}</div>);}
function Gate({label,value,onChange,accent='amber',children}){
  const c=A[accent];
  return(<div className={`rounded-lg border ${c.border} ${c.bg} p-3`}><div className="flex items-center justify-between flex-wrap gap-2"><span className="text-sm font-medium text-gray-700">{label}</span><div className="flex gap-2">{['Yes','No'].map(opt=>(<button key={opt} type="button" onClick={()=>onChange(value===opt?'':opt)} className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all ${value===opt?c.active:c.pill}`}>{opt}</button>))}</div></div>{value==='Yes'&&children&&<div className="mt-3 space-y-3">{children}</div>}</div>);
}
function Section({title,applicable,onApplicable,accent='amber',children}){
  const c=A[accent];const[open,setOpen]=useState(true);
  if(applicable==='N/A')return(<div className={`rounded-xl border-2 border-dashed ${c.border} p-4 flex items-center gap-3 opacity-60`}><Lock className="w-5 h-5 text-gray-400"/><span className="text-sm text-gray-500 font-medium">{title} — Not applicable · section locked</span><button type="button" onClick={()=>onApplicable('Applicable')} className="ml-auto text-xs text-blue-600 underline">Unlock</button></div>);
  return(<div className={`rounded-xl border-2 ${c.border} overflow-hidden`}><div className={`${c.bg} px-4 py-3 flex items-center justify-between flex-wrap gap-2`}><span className={`font-bold text-base ${c.text}`}>{title}</span><div className="flex items-center gap-2"><div className="flex gap-1">{['Applicable','N/A'].map(v=>(<button key={v} type="button" onClick={()=>onApplicable(v)} className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold transition-all ${v===applicable?c.active:c.pill}`}>{v}</button>))}</div><button type="button" onClick={()=>setOpen(o=>!o)} className={`${c.text} p-1`}>{open?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</button></div></div>{open&&applicable==='Applicable'&&<div className="p-4 space-y-4">{children}</div>}</div>);
}
function ScoreRow({label,options,value,onChange,accent='amber'}){
  const c=A[accent];
  return(<div className="flex items-start gap-3 flex-wrap"><span className="text-sm text-gray-600 w-44 shrink-0 pt-1">{label}</span><div className="flex flex-wrap gap-1 flex-1">{options.map(([lbl,pts])=>{const active=value===pts;return<button key={lbl} type="button" onClick={()=>onChange(active?null:pts)} className={`px-2.5 py-1 rounded border text-xs font-medium transition-all ${active?c.active:c.pill}`}>{lbl}({pts})</button>;})}</div></div>);
}

export default function LiverDiseaseAssessmentForm({patientId,encounterId,onSaved}){
  const[sec,setSec]=useState({aetiology:'Applicable',cp:'Applicable',meld:'Applicable',complications:'Applicable',hepatitis:'Applicable',mgmt:'Applicable'});
  const sa=(k,v)=>setSec(s=>({...s,[k]:v}));

  /* Aetiology */
  const[aetiology,setAetiology]=useState([]);
  const[duration,setDuration]=useState('');
  const[prevDecompensation,setPrevDecompensation]=useState([]);
  const[currentPresentation,setCurrentPresentation]=useState([]);

  /* Child-Pugh */
  const[cpBili,setCpBili]=useState(null);
  const[cpAlbumin,setCpAlbumin]=useState(null);
  const[cpInr,setCpInr]=useState(null);
  const[cpAscites,setCpAscites]=useState(null);
  const[cpEnceph,setCpEnceph]=useState(null);

  /* MELD */
  const[creatinine,setCreatinine]=useState('');
  const[bilirubin,setBilirubin]=useState('');
  const[inr,setInr]=useState('');
  const[sodium,setSodium]=useState('');
  const[onDialysis,setOnDialysis]=useState('');

  /* Complications */
  const[ascitesGrade,setAscitesGrade]=useState('');
  const[sbpPresent,setSbpPresent]=useState('');
  const[ascitesFluid,setAscitesFluid]=useState({wbc:'',pmn:'',albumin:'',culture:''});
  const[encephalopathyGrade,setEncephalopathyGrade]=useState('');
  const[encephalopathyPrecipitant,setEncephalopathyPrecipitant]=useState([]);
  const[varicesKnown,setVaricesKnown]=useState('');
  const[hepatorenalType,setHepatorenalType]=useState('');
  const[hpsPresent,setHpsPresent]=useState('');
  const[jaundicePresent,setJaundicePresent]=useState('');

  /* Viral hepatitis */
  const[hbsAg,setHbsAg]=useState('');
  const[hbeAg,setHbeAg]=useState('');
  const[hbvDna,setHbvDna]=useState('');
  const[hbvFibrosis,setHbvFibrosis]=useState('');
  const[hcvAb,setHcvAb]=useState('');
  const[hcvRna,setHcvRna]=useState('');
  const[hcvGenotype,setHcvGenotype]=useState('');
  const[hevIgm,setHevIgm]=useState('');
  const[antiHav,setAntiHav]=useState('');

  /* Management */
  const[diuretics,setDiuretics]=useState([]);
  const[sbb,setSbb]=useState('');
  const[lactulose,setLactulose]=useState('');
  const[rifaximin,setRifaximin]=useState('');
  const[antivirals,setAntivirals]=useState([]);
  const[betaBlockers,setBetaBlockers]=useState('');
  const[transplantAssessment,setTransplantAssessment]=useState('');
  const[abstinence,setAbstinence]=useState('');
  const[notes,setNotes]=useState('');

  /* Child-Pugh score */
  const cpScore=useMemo(()=>[cpBili,cpAlbumin,cpInr,cpAscites,cpEnceph].filter(v=>v!=null).reduce((a,b)=>a+b,0),[cpBili,cpAlbumin,cpInr,cpAscites,cpEnceph]);
  const cpClass=useMemo(()=>{if(cpScore<=6)return{label:'Class A — Well-compensated (1-yr survival ~100%)',color:'green',pts:'5–6'};if(cpScore<=9)return{label:'Class B — Significant compromise (1-yr survival ~80%)',color:'amber',pts:'7–9'};return{label:'Class C — Decompensated (1-yr survival ~45%)',color:'red',pts:'10–15'};},[ cpScore]);

  /* MELD-Na score */
  const meldScore=useMemo(()=>{
    const cr=Math.min(parseFloat(creatinine)||0,4);
    const bili=parseFloat(bilirubin)||0;
    const i=parseFloat(inr)||0;
    if(!cr||!bili||!i)return null;
    const na=Math.min(Math.max(parseFloat(sodium)||130,125),137);
    const meld=Math.round(3.78*Math.log(bili)+11.2*Math.log(i)+9.57*Math.log(cr)+6.43);
    const meldNa=meld+1.32*(137-na)-(0.033*meld*(137-na));
    return{meld:Math.max(meld,6),meldNa:Math.round(Math.max(meldNa,6))};
  },[creatinine,bilirubin,inr,sodium]);
  const meldInterp=useMemo(()=>{
    if(!meldScore)return null;
    const s=meldScore.meldNa;
    if(s<10)return{label:'<10 — Low 90-day mortality (<2%)',color:'green'};
    if(s<20)return{label:'10–19 — Moderate mortality risk (6%)',color:'amber'};
    if(s<30)return{label:'20–29 — High mortality (20%)',color:'orange'};
    if(s<40)return{label:'30–39 — Very high mortality (53%)',color:'red'};
    return{label:'≥40 — >70% 90-day mortality — urgent transplant listing',color:'red'};
  },[meldScore]);

  const sbpAlert=parseInt(ascitesFluid.pmn||0)>=250;

  const handleSave=async()=>{
    try{
      await api.post('/assessments',{type:'liver-disease',patientId,encounterId,data:{aetiology,duration,prevDecompensation,currentPresentation,childPugh:{bilirubin:cpBili,albumin:cpAlbumin,inr:cpInr,ascites:cpAscites,encephalopathy:cpEnceph,score:cpScore,class:cpClass.label},meld:{creatinine,bilirubin,inr,sodium,onDialysis,...(meldScore||{})},complications:{ascitesGrade,sbpPresent,ascitesFluid,encephalopathyGrade,encephalopathyPrecipitant,varicesKnown,hepatorenalType,hpsPresent,jaundicePresent},hepatitis:{hbsAg,hbeAg,hbvDna,hbvFibrosis,hcvAb,hcvRna,hcvGenotype,hevIgm,antiHav},management:{diuretics,sbb,lactulose,rifaximin,antivirals,betaBlockers,transplantAssessment,abstinence},notes}});
      onSaved?.();
    }catch(e){console.error(e);}
  };

  return(
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-2xl p-5 shadow-lg">
        <h2 className="text-xl font-bold">Liver Disease Assessment</h2>
        <p className="text-amber-100 text-sm mt-1">Child-Pugh · MELD-Na · Cirrhosis complications · Viral hepatitis</p>
      </div>

      {sbpAlert&&(
        <div className="bg-red-600 text-white rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-6 h-6 shrink-0"/>
          <div><p className="font-bold">Probable SBP — Ascitic PMN ≥250 cells/mm³</p><p className="text-sm text-red-100">Start empirical cefotaxime/ceftriaxone immediately. Albumin 1.5g/kg at diagnosis + 1g/kg on day 3 to prevent HRS.</p></div>
        </div>
      )}

      <Section title="Aetiology & Presentation" applicable={sec.aetiology} onApplicable={v=>sa('aetiology',v)} accent="amber">
        <FL label="Aetiology of liver disease" sub="multi-select">
          <Pills options={['Alcohol-related liver disease (ALD)','Hepatitis B (HBV)','Hepatitis C (HCV)','Hepatitis E (acute)','NAFLD/NASH','Autoimmune hepatitis','Primary biliary cholangitis (PBC)','Primary sclerosing cholangitis (PSC)','Wilson disease','Haemochromatosis','Drug-induced (DILI)','Cryptogenic','Vascular (Budd-Chiari, PVST)']} value={aetiology} onChange={setAetiology} accent="amber" multi/>
        </FL>
        <FL label="Duration of known disease">
          <Pills options={['Acute (<6 months)','Chronic (>6 months)','Acute-on-chronic (AoCLD)','Unknown']} value={duration} onChange={setDuration} accent="amber"/>
        </FL>
        <FL label="Previous decompensation events" sub="multi-select">
          <Pills options={['Ascites','Variceal bleed','Hepatic encephalopathy','Spontaneous bacterial peritonitis (SBP)','Hepatorenal syndrome (HRS)','Hepatopulmonary syndrome (HPS)']} value={prevDecompensation} onChange={setPrevDecompensation} accent="orange" multi/>
        </FL>
        <FL label="Current presentation" sub="multi-select">
          <Pills options={['Ascites','Jaundice','Haematemesis / variceal bleed','Encephalopathy','Fever / infection','Acute kidney injury','Hepatocellular carcinoma concern','Routine surveillance']} value={currentPresentation} onChange={setCurrentPresentation} accent="orange" multi/>
        </FL>
        <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
          <p className={`font-semibold ${A.amber.text}`}>India context</p>
          <p className="text-gray-600 mt-1">HBV high endemicity (HBsAg ~3–4% prevalence). HEV most common cause of acute viral hepatitis in adults — epidemic outbreaks in monsoon season (waterborne). Alcohol-related liver disease rising rapidly. Ayurvedic/herbal DILI under-recognised. Screen all cirrhotic patients for HCC every 6 months (AFP + USG abdomen).</p>
        </div>
      </Section>

      <Section title="Child-Pugh Score" applicable={sec.cp} onApplicable={v=>sa('cp',v)} accent="amber">
        <div className="space-y-2">
          <ScoreRow label="Total bilirubin (µmol/L)" options={[['<34 (1)',1],['34–50 (2)',2],['>50 (3)',3]]} value={cpBili} onChange={setCpBili} accent="amber"/>
          <ScoreRow label="Serum albumin (g/L)" options={[['>35 (1)',1],['28–35 (2)',2],['<28 (3)',3]]} value={cpAlbumin} onChange={setCpAlbumin} accent="amber"/>
          <ScoreRow label="INR / PT" options={[['<1.7 (1)',1],['1.7–2.3 (2)',2],['>2.3 (3)',3]]} value={cpInr} onChange={setCpInr} accent="amber"/>
          <ScoreRow label="Ascites" options={[['None (1)',1],['Mild/controlled (2)',2],['Moderate/refractory (3)',3]]} value={cpAscites} onChange={setCpAscites} accent="amber"/>
          <ScoreRow label="Hepatic encephalopathy" options={[['None (1)',1],['Grade I–II (2)',2],['Grade III–IV (3)',3]]} value={cpEnceph} onChange={setCpEnceph} accent="amber"/>
        </div>
        {cpScore>0&&(
          <div className={`rounded-xl border-2 ${A[cpClass.color]?.border||'border-gray-300'} ${A[cpClass.color]?.bg||'bg-gray-50'} p-4 mt-2`}>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-black ${A[cpClass.color]?.text||'text-gray-700'}`}>Child-Pugh: {cpScore}</span>
              <span className={`text-sm font-semibold ${A[cpClass.color]?.text||'text-gray-700'} max-w-xs text-right`}>{cpClass.label}</span>
            </div>
          </div>
        )}
      </Section>

      <Section title="MELD-Na Score" applicable={sec.meld} onApplicable={v=>sa('meld',v)} accent="orange">
        <p className="text-xs text-gray-500">Used for transplant waitlist prioritisation. Values from same-day labs.</p>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Creatinine (mg/dL)"><input type="number" step="0.1" value={creatinine} onChange={e=>setCreatinine(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="Total bilirubin (mg/dL)"><input type="number" step="0.1" value={bilirubin} onChange={e=>setBilirubin(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="INR"><input type="number" step="0.01" value={inr} onChange={e=>setInr(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="Serum sodium (mmol/L)"><input type="number" value={sodium} onChange={e=>setSodium(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
        </div>
        <FL label="On dialysis / CRRT (≥2×/week)?">
          <Pills options={['Yes — creatinine capped at 4.0','No']} value={onDialysis} onChange={setOnDialysis} accent="orange"/>
        </FL>
        {meldScore&&(
          <div className={`rounded-xl border-2 ${A[meldInterp?.color||'gray']?.border} ${A[meldInterp?.color||'gray']?.bg} p-4`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className={`text-xl font-black ${A[meldInterp?.color||'gray']?.text}`}>MELD: {meldScore.meld} &nbsp;|&nbsp; MELD-Na: {meldScore.meldNa}</p>
              </div>
              <span className={`text-sm font-semibold ${A[meldInterp?.color||'gray']?.text} max-w-xs text-right`}>{meldInterp?.label}</span>
            </div>
          </div>
        )}
      </Section>

      <Section title="Cirrhosis Complications" applicable={sec.complications} onApplicable={v=>sa('complications',v)} accent="orange">
        <FL label="Ascites grade">
          <Pills options={['None','Grade 1 — Detectable only by USS','Grade 2 — Moderate, symmetrical distension','Grade 3 — Tense ascites','Refractory ascites']} value={ascitesGrade} onChange={setAscitesGrade} accent="orange"/>
        </FL>
        <Gate label="Diagnostic paracentesis performed / SBP suspected?" value={sbpPresent} onChange={setSbpPresent} accent="red">
          <div className="grid grid-cols-2 gap-3">
            <FL label="Ascitic WBC (cells/mm³)"><input type="number" value={ascitesFluid.wbc} onChange={e=>setAscitesFluid(f=>({...f,wbc:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
            <FL label="Ascitic PMN (cells/mm³)"><input type="number" value={ascitesFluid.pmn} onChange={e=>setAscitesFluid(f=>({...f,pmn:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
            <FL label="Ascitic albumin (g/L)"><input type="number" step="0.1" value={ascitesFluid.albumin} onChange={e=>setAscitesFluid(f=>({...f,albumin:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
            <FL label="Culture result"><input type="text" value={ascitesFluid.culture} onChange={e=>setAscitesFluid(f=>({...f,culture:e.target.value}))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Organism / pending"/></FL>
          </div>
          <p className="text-xs text-gray-500">SAAG = serum albumin − ascitic albumin. SAAG ≥1.1 g/dL = portal hypertension aetiology.</p>
        </Gate>
        <FL label="Hepatic encephalopathy grade">
          <div className="space-y-1">
            {[['None','No encephalopathy'],['Grade I','Mild confusion, euphoria or depression, slurred speech, disordered sleep'],['Grade II','Lethargy, moderate confusion, asterixis (flapping tremor)'],['Grade III','Somnolent but arousable, marked confusion, asterixis'],['Grade IV','Coma — unresponsive to stimuli']].map(([g,desc])=>(
              <button key={g} type="button" onClick={()=>setEncephalopathyGrade(encephalopathyGrade===g?'':g)} className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${encephalopathyGrade===g?A.orange.active:A.orange.pill}`}>
                <span className="font-bold">{g}</span> — {desc}
              </button>
            ))}
          </div>
        </FL>
        {encephalopathyGrade&&encephalopathyGrade!=='None'&&(
          <FL label="Precipitant" sub="multi-select">
            <Pills options={['GI bleed','Infection / sepsis','Constipation','Dehydration','Electrolyte imbalance','Renal failure','Sedatives / opiates','Excessive dietary protein','Portal vein thrombosis','Post-TIPS']} value={encephalopathyPrecipitant} onChange={setEncephalopathyPrecipitant} accent="orange" multi/>
          </FL>
        )}
        <FL label="Known oesophageal / gastric varices">
          <Pills options={['None known','Small varices — no prophylaxis yet','On primary prophylaxis (beta-blocker/ligation)','Previous variceal bleed — on secondary prophylaxis','Currently bleeding']} value={varicesKnown} onChange={setVaricesKnown} accent="red"/>
        </FL>
        <FL label="Hepatorenal syndrome (HRS)">
          <Pills options={['None','AKI-HRS (formerly HRS-1) — rapid AKI within 2 weeks','CKD-HRS (formerly HRS-2) — gradual renal impairment']} value={hepatorenalType} onChange={setHepatorenalType} accent="red"/>
        </FL>
      </Section>

      <Section title="Viral Hepatitis Serology" applicable={sec.hepatitis} onApplicable={v=>sa('hepatitis',v)} accent="blue">
        <p className="text-sm font-semibold text-gray-600">Hepatitis B</p>
        <div className="grid grid-cols-3 gap-2">
          <FL label="HBsAg"><Pills options={['Positive','Negative','Not tested']} value={hbsAg} onChange={setHbsAg} accent="blue"/></FL>
          <FL label="HBeAg"><Pills options={['Positive','Negative','Not tested']} value={hbeAg} onChange={setHbeAg} accent="blue"/></FL>
          <FL label="HBV DNA"><input type="text" value={hbvDna} onChange={e=>setHbvDna(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="IU/mL or undetectable"/></FL>
        </div>
        <FL label="Fibrosis staging (HBV)">
          <Pills options={['Not assessed','Fibroscan (kPa): ___','APRI <0.5 (F0–F1)','APRI 0.5–1.5 (F1–F2)','APRI >1.5 (F3–F4)','Liver biopsy (Metavir F__)','Cirrhosis confirmed']} value={hbvFibrosis} onChange={setHbvFibrosis} accent="blue"/>
        </FL>
        <p className="text-sm font-semibold text-gray-600 mt-2">Hepatitis C</p>
        <div className="grid grid-cols-3 gap-2">
          <FL label="Anti-HCV Ab"><Pills options={['Positive','Negative','Not tested']} value={hcvAb} onChange={setHcvAb} accent="blue"/></FL>
          <FL label="HCV RNA"><input type="text" value={hcvRna} onChange={e=>setHcvRna(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="IU/mL or undetectable"/></FL>
          <FL label="Genotype"><Pills options={['1','2','3','4','Not done']} value={hcvGenotype} onChange={setHcvGenotype} accent="blue"/></FL>
        </div>
        <p className="text-sm font-semibold text-gray-600 mt-2">Hepatitis E / A</p>
        <div className="grid grid-cols-2 gap-2">
          <FL label="HEV IgM"><Pills options={['Positive','Negative','Not tested']} value={hevIgm} onChange={setHevIgm} accent="blue"/></FL>
          <FL label="Anti-HAV (IgM)"><Pills options={['Positive','Negative','Not tested']} value={antiHav} onChange={setAntiHav} accent="blue"/></FL>
        </div>
      </Section>

      <Section title="Management" applicable={sec.mgmt} onApplicable={v=>sa('mgmt',v)} accent="green">
        <FL label="Diuretics (ascites)" sub="multi-select">
          <Pills options={['Spironolactone (100–400mg/day)','Furosemide (40–160mg/day)','IV furosemide (refractory)','Large-volume paracentesis + albumin (6g/L removed)','TIPS referral (refractory)']} value={diuretics} onChange={setDiuretics} accent="green" multi/>
        </FL>
        <FL label="Secondary bacterial prophylaxis (SBP)">
          <Pills options={['Not started','Norfloxacin 400mg OD (long-term)','Ciprofloxacin 500mg OD','Trimethoprim/sulfamethoxazole']} value={sbb} onChange={setSbb} accent="green"/>
        </FL>
        <FL label="Hepatic encephalopathy management">
          <Pills options={['Not required','Lactulose titrated to 2–3 stools/day','Rifaximin 550mg bd (long-term prevention)','Both lactulose + rifaximin']} value={lactulose} onChange={setLactulose} accent="green"/>
        </FL>
        <FL label="Antiviral therapy">
          <Pills options={['HBV — Tenofovir (TDF)','HBV — Entecavir','HBV — TAF (preferred if renal impairment)','HCV — Sofosbuvir/velpatasvir (pan-genotypic 12 weeks)','HCV — Sofosbuvir/ledipasvir (genotype 1/4/5/6)','Not indicated','Already on treatment']} value={antivirals} onChange={setAntivirals} accent="green" multi/>
        </FL>
        <FL label="Non-selective beta-blocker (variceal prophylaxis)">
          <Pills options={['Not required','Propranolol (target HR 55–60 bpm)','Carvedilol 6.25–12.5mg (preferred)','Contraindicated','On NSBB']} value={betaBlockers} onChange={setBetaBlockers} accent="green"/>
        </FL>
        <Gate label="Liver transplant assessment indicated?" value={transplantAssessment} onChange={setTransplantAssessment} accent="violet">
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-sm text-violet-800">
            Transplant criteria: MELD-Na ≥15, Child C cirrhosis, refractory complications, HCC within Milan criteria (single ≤5cm or ≤3 lesions all ≤3cm). Refer to ILBS (Delhi), AIIMS, CMC Vellore, or liver transplant centre.
          </div>
        </Gate>
        <Gate label="Alcohol-related disease — abstinence counselling?" value={abstinence} onChange={setAbstinence} accent="amber">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            Corticosteroids (prednisolone) if Maddrey discriminant function ≥32 or ABIC score ≥9. Abstinence is single most important intervention. Link to de-addiction centre.
          </div>
        </Gate>
        <FL label="Clinical notes"><textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Plan, investigations pending, follow-up..."/></FL>
        <button type="button" onClick={handleSave} className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold text-sm shadow">Save Assessment</button>
      </Section>
    </div>
  );
}
