/**
 * @shared-pool
 * BiliaryGallstoneForm — Biliary tract & gallstone disease assessment
 * Tokyo Guidelines (cholecystitis/cholangitis), choledocholithiasis, ERCP, Mirizzi syndrome
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */

import React, { useState, useMemo } from 'react';
import { Lock, ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  yellow: { bg:'bg-yellow-50', border:'border-yellow-300', text:'text-yellow-700', pill:'bg-yellow-100 border-yellow-400 text-yellow-800', active:'bg-yellow-500 text-white border-yellow-500' },
  amber:  { bg:'bg-amber-50',  border:'border-amber-300',  text:'text-amber-700',  pill:'bg-amber-100 border-amber-400 text-amber-800',  active:'bg-amber-500 text-white border-amber-500' },
  orange: { bg:'bg-orange-50', border:'border-orange-300', text:'text-orange-700', pill:'bg-orange-100 border-orange-400 text-orange-800', active:'bg-orange-500 text-white border-orange-500' },
  red:    { bg:'bg-red-50',    border:'border-red-300',    text:'text-red-700',    pill:'bg-red-100 border-red-400 text-red-800',    active:'bg-red-600 text-white border-red-600' },
  blue:   { bg:'bg-blue-50',   border:'border-blue-300',   text:'text-blue-700',   pill:'bg-blue-100 border-blue-400 text-blue-800',   active:'bg-blue-600 text-white border-blue-600' },
  green:  { bg:'bg-green-50',  border:'border-green-300',  text:'text-green-700',  pill:'bg-green-100 border-green-400 text-green-800',  active:'bg-green-600 text-white border-green-600' },
  teal:   { bg:'bg-teal-50',   border:'border-teal-300',   text:'text-teal-700',   pill:'bg-teal-100 border-teal-400 text-teal-800',   active:'bg-teal-600 text-white border-teal-600' },
  violet: { bg:'bg-violet-50', border:'border-violet-300', text:'text-violet-700', pill:'bg-violet-100 border-violet-400 text-violet-800', active:'bg-violet-600 text-white border-violet-600' },
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

export default function BiliaryGallstoneForm({patientId,encounterId,onSaved}){
  const[sec,setSec]=useState({presentation:'Applicable',gallstones:'Applicable',cbd:'Applicable',cholangitis:'Applicable',ercp:'Applicable',surgery:'Applicable'});
  const sa=(k,v)=>setSec(s=>({...s,[k]:v}));

  /* Presentation */
  const[diagnosis,setDiagnosis]=useState('');
  const[symptoms,setSymptoms]=useState([]);
  const[painCharacter,setPainCharacter]=useState([]);
  const[temp,setTemp]=useState('');const[hr,setHr]=useState('');const[sbp,setSbp]=useState('');
  const[bilirubin,setBilirubin]=useState('');const[alp,setAlp]=useState('');const[ggt,setGgt]=useState('');
  const[alt,setAlt]=useState('');const[wbc,setWbc]=useState('');const[crp,setCrp]=useState('');
  const[jaundicePresent,setJaundicePresent]=useState('');

  /* Gallstones */
  const[gallstoneType,setGallstoneType]=useState('');
  const[gallstoneCount,setGallstoneCount]=useState('');
  const[gallstoneSize,setGallstoneSize]=useState('');
  const[gbWallThickness,setGbWallThickness]=useState('');
  const[pericholecysticFluid,setPericholecysticFluid]=useState('');
  const[murphysUss,setMurphysUss]=useState('');
  const[gallbladderPolyp,setGallbladderPolyp]=useState('');
  const[riskFactors,setRiskFactors]=useState([]);

  /* CBD / Choledocholithiasis */
  const[cbdDiameter,setCbdDiameter]=useState('');
  const[cbdStone,setCbdStone]=useState('');
  const[preTestProb,setPreTestProb]=useState('');
  const[mrcpResult,setMrcpResult]=useState('');
  const[endoUssResult,setEndoUssResult]=useState('');

  /* Cholangitis */
  const[charcotTriad,setCharcotTriad]=useState([]);
  const[reynoldsPentad,setReynoldsPentad]=useState([]);
  const[tokyoGrade,setTokyoGrade]=useState('');
  const[bloodCultures,setBloodCultures]=useState('');
  const[sepsis,setSepsis]=useState('');

  /* ERCP */
  const[ercpIndication,setErcpIndication]=useState([]);
  const[ercpDone,setErcpDone]=useState('');
  const[ercpFindings,setErcpFindings]=useState([]);
  const[ercpTx,setErcpTx]=useState([]);
  const[postErcp,setPostErcp]=useState([]);

  /* Surgery */
  const[surgeryType,setSurgeryType]=useState('');
  const[surgeryTiming,setSurgeryTiming]=useState('');
  const[surgicalRisk,setSurgicalRisk]=useState('');
  const[intraopCholangiography,setIntraopCholangiography]=useState('');
  const[notes,setNotes]=useState('');

  const charcotComplete=charcotTriad.length===3;
  const reynoldsAlert=reynoldsPentad.length>=1;

  /* Probability of CBD stone (ASGE criteria) */
  const cbdProbability=useMemo(()=>{
    const highCriteria=[
      parseInt(bilirubin||0)>68.4,
      cbdStone==='CBD stone visible on USS',
      parseInt(cbdDiameter||0)>6,
    ].filter(Boolean).length;
    const intermediateCriteria=[
      parseInt(bilirubin||0)>34.2&&parseInt(bilirubin||0)<=68.4,
      parseInt(alt||0)>3*40,
      parseInt(cbdDiameter||0)>4&&parseInt(cbdDiameter||0)<=6,
      parseInt(wbc||0)>10,
    ].filter(Boolean).length;
    if(highCriteria>=1)return{label:'High probability (>50%) — proceed to ERCP',color:'red'};
    if(intermediateCriteria>=1)return{label:'Intermediate probability — EUS or MRCP first',color:'amber'};
    return{label:'Low probability — laparoscopic cholecystectomy alone',color:'green'};
  },[bilirubin,cbdStone,cbdDiameter,alt,wbc]);

  const handleSave=async()=>{
    try{
      await api.post('/assessments',{type:'biliary-gallstone',patientId,encounterId,data:{diagnosis,symptoms,painCharacter,vitals:{temp,hr,sbp},labs:{bilirubin,alp,ggt,alt,wbc,crp},jaundicePresent,gallstones:{type:gallstoneType,count:gallstoneCount,size:gallstoneSize,gbWallThickness,pericholecysticFluid,murphysUss,gallbladderPolyp,riskFactors},cbd:{diameter:cbdDiameter,stone:cbdStone,preTestProb,mrcpResult,endoUssResult,probability:cbdProbability.label},cholangitis:{charcotTriad,reynoldsPentad,grade:tokyoGrade,bloodCultures,sepsis},ercp:{indication:ercpIndication,done:ercpDone,findings:ercpFindings,treatment:ercpTx,postProcedure:postErcp},surgery:{type:surgeryType,timing:surgeryTiming,risk:surgicalRisk,intraopCholangiography},notes}});
      onSaved?.();
    }catch(e){console.error(e);}
  };

  return(
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-2xl p-5 shadow-lg">
        <h2 className="text-xl font-bold">Biliary & Gallstone Disease Assessment</h2>
        <p className="text-yellow-100 text-sm mt-1">Tokyo Guidelines · Choledocholithiasis (ASGE) · ERCP · Cholecystectomy planning</p>
      </div>

      {reynoldsAlert&&(
        <div className="bg-red-700 text-white rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-6 h-6 shrink-0"/>
          <div><p className="font-bold">Reynold's Pentad — Severe Cholangitis with Septic Shock</p><p className="text-sm text-red-100">Urgent biliary decompression (ERCP or PTC) + IV antibiotics + resuscitation. Tokyo Grade III.</p></div>
        </div>
      )}

      <Section title="Presentation" applicable={sec.presentation} onApplicable={v=>sa('presentation',v)} accent="amber">
        <FL label="Working diagnosis">
          <Pills options={['Biliary colic (symptomatic cholelithiasis)','Acute cholecystitis','Chronic cholecystitis','Choledocholithiasis (CBD stone)','Acute cholangitis','Mirizzi syndrome','Gallstone pancreatitis','Gallbladder polyp','Gallbladder carcinoma','Primary sclerosing cholangitis (PSC)','Primary biliary cholangitis (PBC)','Cholangiocarcinoma']} value={diagnosis} onChange={setDiagnosis} accent="amber"/>
        </FL>
        <FL label="Symptoms" sub="multi-select">
          <Pills options={['RUQ / epigastric pain','Pain radiating to right shoulder tip','Pain post-fatty meals','Nausea / vomiting','Fever / rigors','Jaundice','Dark urine / pale stools','Pruritus','Murphy\'s sign positive']} value={symptoms} onChange={setSymptoms} accent="amber" multi/>
        </FL>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Temp (°C)"><input type="number" step="0.1" value={temp} onChange={e=>setTemp(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="HR (bpm)"><input type="number" value={hr} onChange={e=>setHr(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="SBP (mmHg)"><input type="number" value={sbp} onChange={e=>setSbp(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="Total bilirubin (µmol/L)"><input type="number" step="0.1" value={bilirubin} onChange={e=>setBilirubin(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="ALP (U/L)"><input type="number" value={alp} onChange={e=>setAlp(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="GGT (U/L)"><input type="number" value={ggt} onChange={e=>setGgt(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="ALT (U/L)"><input type="number" value={alt} onChange={e=>setAlt(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="WBC (×10⁹/L)"><input type="number" step="0.1" value={wbc} onChange={e=>setWbc(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="CRP (mg/L)"><input type="number" value={crp} onChange={e=>setCrp(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
        </div>
        <FL label="Jaundice">
          <Pills options={['No jaundice','Mild (bilirubin 34–85 µmol/L)','Moderate (85–170 µmol/L)','Severe (>170 µmol/L)','Obstructive pattern (ALP/GGT predominantly elevated)']} value={jaundicePresent} onChange={setJaundicePresent} accent="yellow"/>
        </FL>
        <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
          <p className={`font-semibold ${A.amber.text}`}>India context</p>
          <p className="text-gray-600 mt-1">Gallbladder cancer highest incidence globally in North India (Ganga plain — Varanasi, Lucknow) — median age 50s, female predominance, often presents late. Phrygian cap GB (anatomical variant) common. Ascariasis can cause biliary colic and CBD obstruction. Typhoid hepatitis can mimic biliary disease. Mirizzi syndrome relatively common given delayed presentation.</p>
        </div>
      </Section>

      <Section title="Gallstone Disease (USS)" applicable={sec.gallstones} onApplicable={v=>sa('gallstones',v)} accent="yellow">
        <div className="grid grid-cols-2 gap-3">
          <FL label="Gallstone type">
            <Pills options={['Cholesterol (pale, usually single)','Pigment — black (haemolysis/cirrhosis)','Pigment — brown (infection/biliary stasis)','Mixed','Sludge only']} value={gallstoneType} onChange={setGallstoneType} accent="yellow"/>
          </FL>
          <FL label="Number">
            <Pills options={['Solitary','Multiple (2–5)','Numerous (>5)','Sludge / sand']} value={gallstoneCount} onChange={setGallstoneCount} accent="yellow"/>
          </FL>
          <FL label="Largest stone size">
            <Pills options={['<10mm','10–20mm','20–30mm','>30mm (large)']} value={gallstoneSize} onChange={setGallstoneSize} accent="yellow"/>
          </FL>
          <FL label="GB wall thickness">
            <Pills options={['Normal (<4mm)','Borderline (4–6mm)','Thickened (>6mm — cholecystitis)','Irregular / nodular (suspect carcinoma)']} value={gbWallThickness} onChange={setGbWallThickness} accent="amber"/>
          </FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Pericholecystic fluid">
            <Pills options={['None','Present (acute cholecystitis)','Perforation suspected']} value={pericholecysticFluid} onChange={setPericholecysticFluid} accent="orange"/>
          </FL>
          <FL label="Sonographic Murphy's sign">
            <Pills options={['Positive','Negative','Equivocal']} value={murphysUss} onChange={setMurphysUss} accent="orange"/>
          </FL>
        </div>
        <Gate label="Gallbladder polyp identified?" value={gallbladderPolyp} onChange={setGallbladderPolyp} accent="orange">
          <div className="space-y-2">
            <Pills options={['<6mm — 1-yearly USS surveillance','6–9mm — 6-monthly USS surveillance','≥10mm — cholecystectomy recommended','≥10mm with risk factors — urgent cholecystectomy','Malignancy suspected']} value={gallbladderPolyp==='Yes'?'':undefined} onChange={()=>{}} accent="orange"/>
            <p className="text-xs text-gray-500">Risk factors for malignancy: solitary polyp, sessile, age &gt;50, primary sclerosing cholangitis.</p>
          </div>
        </Gate>
        <FL label="Gallstone risk factors" sub="multi-select">
          <Pills options={['Female sex (4F: fat, female, forty, fertile)','Obesity / metabolic syndrome','Rapid weight loss','Prolonged fasting / TPN','Haemolytic anaemia (sickle cell)','Cirrhosis','Ileal disease / resection (Crohn\'s)','Diabetes mellitus','Family history','Pregnancy']} value={riskFactors} onChange={setRiskFactors} accent="amber" multi/>
        </FL>
      </Section>

      <Section title="CBD Stones / Choledocholithiasis" applicable={sec.cbd} onApplicable={v=>sa('cbd',v)} accent="orange">
        <div className="grid grid-cols-2 gap-3">
          <FL label="CBD diameter on USS (mm)"><input type="number" value={cbdDiameter} onChange={e=>setCbdDiameter(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder=">8mm dilated (>6mm if cholecystectomy done)"/></FL>
          <FL label="Stone on USS">
            <Pills options={['CBD stone visible on USS','Dilated CBD only — no stone seen','Normal CBD','Not visualised']} value={cbdStone} onChange={setCbdStone} accent="orange"/>
          </FL>
        </div>
        <div className={`rounded-xl border-2 ${A[cbdProbability.color]?.border} ${A[cbdProbability.color]?.bg} p-3`}>
          <p className={`font-bold text-sm ${A[cbdProbability.color]?.text}`}>ASGE CBD Stone Probability: {cbdProbability.label}</p>
        </div>
        <FL label="MRCP result">
          <Pills options={['Not done','CBD stone confirmed on MRCP','Dilated CBD — no stone','Normal','Stricture / cholangiocarcinoma — refer MDT']} value={mrcpResult} onChange={setMrcpResult} accent="orange"/>
        </FL>
        <FL label="EUS (endoscopic ultrasound) result">
          <Pills options={['Not done','CBD stone confirmed on EUS','CBD clear — no stone','Periampullary mass (refer MDT)']} value={endoUssResult} onChange={setEndoUssResult} accent="orange"/>
        </FL>
      </Section>

      <Section title="Acute Cholangitis" applicable={sec.cholangitis} onApplicable={v=>sa('cholangitis',v)} accent="red">
        <FL label="Charcot's triad" sub="multi-select">
          <Pills options={['Fever / chills (biliary sepsis)','Jaundice (obstructive)','RUQ pain']} value={charcotTriad} onChange={setCharcotTriad} accent="red" multi/>
        </FL>
        {charcotComplete&&<div className="bg-orange-50 border border-orange-300 rounded-lg p-3 text-sm text-orange-700 font-medium">Charcot's triad complete — acute cholangitis confirmed.</div>}
        <FL label="Reynold's pentad (Grade III cholangitis)" sub="multi-select">
          <Pills options={['Altered mental status','Haemodynamic shock (SBP &lt;90)']} value={reynoldsPentad} onChange={setReynoldsPentad} accent="red" multi/>
        </FL>
        <FL label="Tokyo TG18 severity grade">
          <div className="space-y-1">
            {[
              ['Grade I — Mild: responds to antibiotics alone','amber'],
              ['Grade II — Moderate: systemic signs (leukocytosis/fever/elderly) — early ERCP','orange'],
              ['Grade III — Severe: organ failure — urgent ERCP + ICU','red'],
            ].map(([lbl,col])=>(
              <button key={lbl} type="button" onClick={()=>setTokyoGrade(tokyoGrade===lbl?'':lbl)} className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${tokyoGrade===lbl?A[col].active:A[col].pill}`}>{lbl}</button>
            ))}
          </div>
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Blood cultures taken">
            <Pills options={['Yes — before antibiotics','Yes — after antibiotics started','Not taken']} value={bloodCultures} onChange={setBloodCultures} accent="red"/>
          </FL>
          <FL label="Sepsis / septic shock">
            <Pills options={['No SIRS criteria','SIRS (sepsis)','Septic shock']} value={sepsis} onChange={setSepsis} accent="red"/>
          </FL>
        </div>
      </Section>

      <Section title="ERCP" applicable={sec.ercp} onApplicable={v=>sa('ercp',v)} accent="blue">
        <FL label="ERCP indication" sub="multi-select">
          <Pills options={['Choledocholithiasis (CBD stone)','Acute cholangitis — biliary decompression','Gallstone pancreatitis + cholangitis','Biliary stricture (benign/malignant)','Stent placement (palliation)','Post-cholecystectomy bile leak','Sphincter of Oddi dysfunction','Ampullary tumour diagnosis/treatment']} value={ercpIndication} onChange={setErcpIndication} accent="blue" multi/>
        </FL>
        <FL label="ERCP status">
          <Pills options={['Not yet performed','Scheduled','Performed successfully','Failed — alternative required','Declined by patient']} value={ercpDone} onChange={setErcpDone} accent="blue"/>
        </FL>
        {ercpDone==='Performed successfully'&&(
          <>
            <FL label="ERCP findings" sub="multi-select">
              <Pills options={['CBD stone extracted','Multiple CBD stones — complete clearance','Multiple CBD stones — incomplete clearance','Biliary stricture','Ampullary stenosis','Normal cholangiogram','Bile leak site identified','Periampullary tumour']} value={ercpFindings} onChange={setErcpFindings} accent="blue" multi/>
            </FL>
            <FL label="ERCP therapeutic interventions" sub="multi-select">
              <Pills options={['Sphincterotomy (EST)','Balloon trawl stone extraction','Mechanical lithotripsy','Cholangioscopy (SpyGlass)','Biliary plastic stent','Metal stent (SEMS) — malignant','Nasobiliary drain','Balloon dilatation of stricture']} value={ercpTx} onChange={setErcpTx} accent="blue" multi/>
            </FL>
            <FL label="Post-ERCP complications" sub="multi-select">
              <Pills options={['None observed','Post-ERCP pancreatitis (PEP)','Bleeding (post-sphincterotomy)','Cholangitis','Perforation','Contrast reaction','No complications']} value={postErcp} onChange={setPostErcp} accent="orange" multi/>
            </FL>
            {postErcp.includes('Post-ERCP pancreatitis (PEP)')&&(
              <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 text-sm text-orange-700 font-medium">
                PEP: Most common ERCP complication (~3–5%). Risk reduced with rectal indomethacin 100mg PR + aggressive IV crystalloid pre-procedure. Monitor amylase/lipase 4–6h post-ERCP.
              </div>
            )}
          </>
        )}
      </Section>

      <Section title="Surgical Management" applicable={sec.surgery} onApplicable={v=>sa('surgery',v)} accent="green">
        <FL label="Surgical procedure">
          <Pills options={['Laparoscopic cholecystectomy (LC) — standard','Open cholecystectomy (OC) — high-risk/complicated','LC + intraoperative cholangiography (IOC)','LC + laparoscopic CBD exploration','Cholecystostomy (percutaneous — high surgical risk)','Subtotal cholecystectomy (technically difficult)','Bile duct repair / hepaticojejunostomy','Whipple (ampullary/periampullary carcinoma)']} value={surgeryType} onChange={setSurgeryType} accent="green"/>
        </FL>
        <FL label="Surgery timing">
          <Pills options={['Immediate (<24h) — gangrenous/perforation','Early (within 72h) — acute cholecystitis (Tokyo I/II)','Elective (6–12 weeks) — after ERCP stone clearance','Elective (same admission)','Elective (after delayed interval)']} value={surgeryTiming} onChange={setSurgeryTiming} accent="green"/>
        </FL>
        <FL label="Surgical fitness">
          <Pills options={['Low risk — proceed','Moderate risk — optimise first','High risk — percutaneous cholecystostomy preferred','Very high risk — non-surgical management only','Fit for laparoscopic — anaesthetic assessment done']} value={surgicalRisk} onChange={setSurgicalRisk} accent="green"/>
        </FL>
        <FL label="Intraoperative cholangiography (IOC)">
          <Pills options={['Not performed','Performed — CBD clear','Performed — CBD stone identified → laparoscopic exploration','Performed — contrast not flowing → ERCP post-op']} value={intraopCholangiography} onChange={setIntraopCholangiography} accent="teal"/>
        </FL>
        <FL label="Clinical notes"><textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="USS/MRCP findings, ERCP outcome, surgical plan, consent..."/></FL>
        <button type="button" onClick={handleSave} className="w-full py-3 rounded-xl bg-amber-500 text-white font-bold text-sm shadow">Save Assessment</button>
      </Section>
    </div>
  );
}
