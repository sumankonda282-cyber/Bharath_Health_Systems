/**
 * @shared-pool
 * AcuteAbdomenForm — Acute abdomen surgical assessment
 * Alvarado/MANTRELS (appendicitis), Tokyo Guidelines (cholecystitis), bowel obstruction, peritonitis
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */

import React, { useState, useMemo } from 'react';
import { Lock, ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  red:    { bg:'bg-red-50',    border:'border-red-300',    text:'text-red-700',    pill:'bg-red-100 border-red-400 text-red-800',    active:'bg-red-600 text-white border-red-600' },
  orange: { bg:'bg-orange-50', border:'border-orange-300', text:'text-orange-700', pill:'bg-orange-100 border-orange-400 text-orange-800', active:'bg-orange-500 text-white border-orange-500' },
  amber:  { bg:'bg-amber-50',  border:'border-amber-300',  text:'text-amber-700',  pill:'bg-amber-100 border-amber-400 text-amber-800',  active:'bg-amber-500 text-white border-amber-500' },
  blue:   { bg:'bg-blue-50',   border:'border-blue-300',   text:'text-blue-700',   pill:'bg-blue-100 border-blue-400 text-blue-800',   active:'bg-blue-600 text-white border-blue-600' },
  green:  { bg:'bg-green-50',  border:'border-green-300',  text:'text-green-700',  pill:'bg-green-100 border-green-400 text-green-800',  active:'bg-green-600 text-white border-green-600' },
  violet: { bg:'bg-violet-50', border:'border-violet-300', text:'text-violet-700', pill:'bg-violet-100 border-violet-400 text-violet-800', active:'bg-violet-600 text-white border-violet-600' },
  teal:   { bg:'bg-teal-50',   border:'border-teal-300',   text:'text-teal-700',   pill:'bg-teal-100 border-teal-400 text-teal-800',   active:'bg-teal-600 text-white border-teal-600' },
  gray:   { bg:'bg-gray-50',   border:'border-gray-300',   text:'text-gray-700',   pill:'bg-gray-100 border-gray-400 text-gray-800',   active:'bg-gray-600 text-white border-gray-600' },
};

function Pills({options,value,onChange,accent='red',multi=false}){
  const c=A[accent];const sel=multi?(Array.isArray(value)?value:[]):value;
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
  return(<div className={`rounded-xl border-2 ${c.border} overflow-hidden`}><div className={`${c.bg} px-4 py-3 flex items-center justify-between flex-wrap gap-2`}><span className={`font-bold text-base ${c.text}`}>{title}</span><div className="flex items-center gap-2"><div className="flex gap-1">{['Applicable','N/A'].map(v=>(<button key={v} type="button" onClick={()=>onApplicable(v)} className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold transition-all ${v===applicable?c.active:c.pill}`}>{v}</button>))}</div><button type="button" onClick={()=>setOpen(o=>!o)} className={`${c.text} p-1`}>{open?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</button></div></div>{open&&applicable==='Applicable'&&<div className="p-4 space-y-4">{children}</div>}</div>);
}

export default function AcuteAbdomenForm({patientId,encounterId,onSaved}){
  const[sec,setSec]=useState({presentation:'Applicable',alvarado:'Applicable',cholecystitis:'Applicable',obstruction:'Applicable',peritonitis:'Applicable',management:'Applicable'});
  const sa=(k,v)=>setSec(s=>({...s,[k]:v}));

  /* Presentation */
  const[diagnosis,setDiagnosis]=useState('');
  const[painLocation,setPainLocation]=useState('');
  const[painOnset,setPainOnset]=useState('');
  const[painCharacter,setPainCharacter]=useState([]);
  const[associatedSymptoms,setAssociatedSymptoms]=useState([]);
  const[temp,setTemp]=useState('');const[hr,setHr]=useState('');const[sbp,setSbp]=useState('');
  const[wbc,setWbc]=useState('');const[crp,setCrp]=useState('');
  const[peritonismSigns,setPeritonismSigns]=useState([]);

  /* Alvarado (appendicitis) */
  const[alvMigration,setAlvMigration]=useState(false);
  const[alvAnorexia,setAlvAnorexia]=useState(false);
  const[alvNausea,setAlvNausea]=useState(false);
  const[alvRifTenderness,setAlvRifTenderness]=useState(false);
  const[alvRebound,setAlvRebound]=useState(false);
  const[alvElevatedTemp,setAlvElevatedTemp]=useState(false);
  const[alvLeukocytosis,setAlvLeukocytosis]=useState(false);
  const[alvShift,setAlvShift]=useState(false);
  const[imagingAppendix,setImagingAppendix]=useState('');

  /* Tokyo cholecystitis */
  const[tokyoLocalA,setTokyoLocalA]=useState([]);
  const[tokyoSystemic,setTokyoSystemic]=useState([]);
  const[tokyoOrganFail,setTokyoOrganFail]=useState([]);
  const[murphysSign,setMurphysSign]=useState('');
  const[ussFinding,setUssFinding]=useState('');
  const[charcotTriad,setCharcotTriad]=useState([]);

  /* Obstruction */
  const[obstructionType,setObstructionType]=useState('');
  const[obstructionCause,setObstructionCause]=useState([]);
  const[obstructionLevel,setObstructionLevel]=useState('');
  const[strangulation,setStrangulation]=useState('');

  /* Peritonitis */
  const[peritonitisType,setPeritonitisType]=useState('');
  const[perforation,setPerforation]=useState('');
  const[perforationSite,setPerforationSite]=useState('');

  /* Management */
  const[resuscitation,setResuscitation]=useState([]);
  const[npo,setNpo]=useState('');
  const[antibiotics,setAntibiotics]=useState('');
  const[imaging,setImaging]=useState([]);
  const[surgicalApproach,setSurgicalApproach]=useState('');
  const[surgeryTiming,setSurgeryTiming]=useState('');
  const[notes,setNotes]=useState('');

  /* Alvarado score */
  const alvaradoScore=useMemo(()=>{
    let s=0;
    if(alvMigration)s+=1;if(alvAnorexia)s+=1;if(alvNausea)s+=1;
    if(alvRifTenderness)s+=2;if(alvRebound)s+=1;
    if(alvElevatedTemp)s+=1;if(alvLeukocytosis)s+=2;if(alvShift)s+=1;
    return s;
  },[alvMigration,alvAnorexia,alvNausea,alvRifTenderness,alvRebound,alvElevatedTemp,alvLeukocytosis,alvShift]);
  const alvaradoInterp=useMemo(()=>{
    if(alvaradoScore<=3)return{label:'Appendicitis unlikely — consider alternative diagnosis',color:'green'};
    if(alvaradoScore<=6)return{label:'Appendicitis possible — observe / imaging recommended',color:'amber'};
    if(alvaradoScore<=7)return{label:'Appendicitis probable — surgical consultation',color:'orange'};
    return{label:'Appendicitis highly likely — surgical intervention',color:'red'};
  },[alvaradoScore]);

  /* Tokyo grade */
  const tokyoGrade=useMemo(()=>{
    if(tokyoOrganFail.length>0)return{grade:'Grade III — Severe',color:'red',recommendation:'Urgent cholecystectomy or percutaneous cholecystostomy + IV antibiotics'};
    if(tokyoSystemic.length>0)return{grade:'Grade II — Moderate',color:'orange',recommendation:'Early cholecystectomy (within 72h) + antibiotics'};
    if(tokyoLocalA.length>=1)return{grade:'Grade I — Mild',color:'amber',recommendation:'Laparoscopic cholecystectomy (early preferred) ± antibiotics'};
    return null;
  },[tokyoLocalA,tokyoSystemic,tokyoOrganFail]);

  const emergencyAlert=peritonismSigns.includes('Guarding (voluntary)')||peritonismSigns.includes('Rigidity (involuntary)');

  const handleSave=async()=>{
    try{
      await api.post('/assessments',{type:'acute-abdomen',patientId,encounterId,data:{diagnosis,painLocation,painOnset,painCharacter,associatedSymptoms,vitals:{temp,hr,sbp},labs:{wbc,crp},peritonismSigns,alvarado:{migration:alvMigration,anorexia:alvAnorexia,nausea:alvNausea,rifTenderness:alvRifTenderness,rebound:alvRebound,elevatedTemp:alvElevatedTemp,leukocytosis:alvLeukocytosis,shift:alvShift,score:alvaradoScore,interp:alvaradoInterp.label,imaging:imagingAppendix},cholecystitis:{localA:tokyoLocalA,systemic:tokyoSystemic,organFail:tokyoOrganFail,murphysSign,uss:ussFinding,charcotTriad,grade:tokyoGrade?.grade},obstruction:{type:obstructionType,cause:obstructionCause,level:obstructionLevel,strangulation},peritonitis:{type:peritonitisType,perforation,perforationSite},management:{resuscitation,npo,antibiotics,imaging,surgicalApproach,surgeryTiming},notes}});
      onSaved?.();
    }catch(e){console.error(e);}
  };

  return(
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-2xl p-5 shadow-lg">
        <h2 className="text-xl font-bold">Acute Abdomen Assessment</h2>
        <p className="text-red-100 text-sm mt-1">Alvarado (Appendicitis) · Tokyo Guidelines (Cholecystitis/Cholangitis) · Obstruction · Peritonitis</p>
      </div>

      {emergencyAlert&&(
        <div className="bg-red-700 text-white rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-6 h-6 shrink-0"/>
          <div><p className="font-bold">Peritonitis Signs — Urgent surgical assessment</p><p className="text-sm text-red-100">Guarding / rigidity = peritoneal irritation. Resuscitate, IV antibiotics, urgent imaging + surgical consult. Nil by mouth.</p></div>
        </div>
      )}

      <Section title="Presentation & Examination" applicable={sec.presentation} onApplicable={v=>sa('presentation',v)} accent="red">
        <FL label="Working diagnosis">
          <Pills options={['Acute appendicitis','Acute cholecystitis','Acute cholangitis','Bowel obstruction','Sigmoid volvulus','Intussusception','Mesenteric ischaemia','Intestinal perforation','Acute pancreatitis','Renal/ureteric colic','Ectopic pregnancy (rule out)','Ovarian pathology','Incarcerated hernia','Diverticulitis','Not yet established']} value={diagnosis} onChange={setDiagnosis} accent="red"/>
        </FL>
        <FL label="Pain location">
          <Pills options={['Right iliac fossa (RIF)','Right upper quadrant (RUQ)','Left iliac fossa (LIF)','Left upper quadrant (LUQ)','Epigastric','Central / periumbilical','Generalised / diffuse','Loin / flank']} value={painLocation} onChange={setPainLocation} accent="red"/>
        </FL>
        <FL label="Pain onset">
          <Pills options={['Sudden (seconds — perforation/vascular)','Rapid (minutes — colic/obstruction)','Gradual (hours — appendicitis/cholecystitis)']} value={painOnset} onChange={setPainOnset} accent="red"/>
        </FL>
        <FL label="Character" sub="multi-select">
          <Pills options={['Colicky','Constant','Worse on movement','Radiates to shoulder tip (diaphragm irritation)','Radiates to back (pancreatitis/aorta)','Radiates to groin (ureteric colic)','Night sweats + weight loss (malignancy/TB)']} value={painCharacter} onChange={setPainCharacter} accent="orange" multi/>
        </FL>
        <FL label="Associated symptoms" sub="multi-select">
          <Pills options={['Nausea / vomiting','Anorexia','Fever','Jaundice','Absolute constipation (obstruction)','Diarrhoea','Rectal bleeding','Distension','Dysuria / haematuria']} value={associatedSymptoms} onChange={setAssociatedSymptoms} accent="orange" multi/>
        </FL>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Temperature (°C)"><input type="number" step="0.1" value={temp} onChange={e=>setTemp(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="HR (bpm)"><input type="number" value={hr} onChange={e=>setHr(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="SBP (mmHg)"><input type="number" value={sbp} onChange={e=>setSbp(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="WBC (×10⁹/L)"><input type="number" step="0.1" value={wbc} onChange={e=>setWbc(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="CRP (mg/L)"><input type="number" value={crp} onChange={e=>setCrp(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
        </div>
        <FL label="Peritonism signs" sub="multi-select">
          <Pills options={['Murphy\'s sign positive (RUQ)','Rovsing\'s sign (LIF pressure → RIF pain)','McBurney\'s point tenderness','Psoas sign','Obturator sign','Guarding (voluntary)','Rigidity (involuntary)','Rebound tenderness','Absent bowel sounds','Tinkling / high-pitched (obstruction)']} value={peritonismSigns} onChange={setPeritonismSigns} accent="red" multi/>
        </FL>
        <div className={`p-3 rounded-lg text-sm ${A.orange.bg} ${A.orange.border} border`}>
          <p className={`font-semibold ${A.orange.text}`}>India context</p>
          <p className="text-gray-600 mt-1">Sigmoid volvulus common in India (high-fibre diet, elderly rural males). TB peritonitis / ileocaecal TB mimics appendicitis and carcinoma — ascitic fluid ADA &gt;30 U/L suggestive. Typhoid intestinal perforation (ileal, 2nd–3rd week of fever). Amoebic liver abscess can present as acute abdomen.</p>
        </div>
      </Section>

      <Section title="Alvarado Score (Appendicitis)" applicable={sec.alvarado} onApplicable={v=>sa('alvarado',v)} accent="orange">
        <p className="text-xs text-gray-500">MANTRELS score — score ≥7 = high probability of appendicitis</p>
        <div className="space-y-1">
          {[
            ['Migration of pain from periumbilical to RIF (+1)',alvMigration,setAlvMigration],
            ['Anorexia or elevated acetone (+1)',alvAnorexia,setAlvAnorexia],
            ['Nausea or vomiting (+1)',alvNausea,setAlvNausea],
            ['Tenderness in RIF (+2)',alvRifTenderness,setAlvRifTenderness],
            ['Rebound tenderness (+1)',alvRebound,setAlvRebound],
            ['Elevated temperature >37.3°C (+1)',alvElevatedTemp,setAlvElevatedTemp],
            ['Leucocytosis WBC >10 × 10⁹/L (+2)',alvLeukocytosis,setAlvLeukocytosis],
            ['Left shift (>75% neutrophils) (+1)',alvShift,setAlvShift],
          ].map(([lbl,val,setter])=>(
            <button key={lbl} type="button" onClick={()=>setter(!val)} className={`w-full text-left px-3 py-2 rounded-lg border text-sm font-medium transition-all ${val?A.orange.active:A.orange.pill}`}>{val?'✓ ':''}{lbl}</button>
          ))}
        </div>
        <div className={`rounded-xl border-2 ${A[alvaradoInterp.color]?.border} ${A[alvaradoInterp.color]?.bg} p-4 mt-2`}>
          <div className="flex items-center justify-between">
            <span className={`text-2xl font-black ${A[alvaradoInterp.color]?.text}`}>Alvarado: {alvaradoScore}/10</span>
            <span className={`text-sm font-semibold ${A[alvaradoInterp.color]?.text}`}>{alvaradoInterp.label}</span>
          </div>
        </div>
        <FL label="Imaging for appendicitis">
          <Pills options={['Not done','USS abdomen — normal','USS — appendix not visualised','USS — dilated appendix >6mm, non-compressible (appendicitis)','CT abdomen-pelvis — appendicitis confirmed','CT — periappendiceal abscess','CT — perforation']} value={imagingAppendix} onChange={setImagingAppendix} accent="orange"/>
        </FL>
      </Section>

      <Section title="Cholecystitis / Cholangitis (Tokyo TG18)" applicable={sec.cholecystitis} onApplicable={v=>sa('cholecystitis',v)} accent="amber">
        <FL label="Murphy's sign">
          <Pills options={['Positive (RUQ tenderness on inspiration)','Negative','Equivocal']} value={murphysSign} onChange={setMurphysSign} accent="amber"/>
        </FL>
        <FL label="Charcot\'s triad (cholangitis)" sub="multi-select">
          <Pills options={['Fever / chills (biliary sepsis)','Jaundice (obstructive)','Right upper quadrant pain']} value={charcotTriad} onChange={setCharcotTriad} accent="amber" multi/>
        </FL>
        {charcotTriad.length===3&&(
          <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-700 font-medium">
            Complete Charcot triad — acute cholangitis. If Reynold's pentad (+ altered mental status + shock) → urgent ERCP + biliary decompression.
          </div>
        )}
        <FL label="Ultrasonography findings">
          <Pills options={['Gallstones','Thickened gallbladder wall >4mm','Pericholecystic fluid','Murphy\'s sign on USS','Dilated CBD >8mm (>10mm post-cholecystectomy)','CBD stone','Air in biliary tree (cholangitis)','Normal']} value={ussFinding} onChange={setUssFinding} accent="amber"/>
        </FL>
        <FL label="Local inflammatory signs (TG18 Grade I criteria)" sub="multi-select">
          <Pills options={['Murphy\'s sign positive','RUQ mass/pain/tenderness','Fever &gt;38°C','CRP &gt;3 mg/dL','WBC &gt;10 × 10⁹/L']} value={tokyoLocalA} onChange={setTokyoLocalA} accent="amber" multi/>
        </FL>
        <FL label="Systemic inflammatory signs (Grade II modifier)" sub="multi-select">
          <Pills options={['WBC &gt;18 × 10⁹/L','Fever &gt;39°C','Bilirubin &gt;85.5 µmol/L','Albumin &lt;30 g/L','Age &gt;72 years']} value={tokyoSystemic} onChange={setTokyoSystemic} accent="orange" multi/>
        </FL>
        <FL label="End-organ failure (Grade III criteria)" sub="multi-select">
          <Pills options={['Cardiovascular dysfunction (dopamine/noradrenaline required)','Neurological dysfunction','Respiratory dysfunction (PaO₂/FiO₂ &lt;300)','Renal dysfunction (oliguria/creatinine &gt;176 µmol/L)','Hepatic dysfunction (PT-INR &gt;1.5)','Haematological dysfunction (platelets &lt;100 × 10⁹/L)']} value={tokyoOrganFail} onChange={setTokyoOrganFail} accent="red" multi/>
        </FL>
        {tokyoGrade&&(
          <div className={`rounded-xl border-2 ${A[tokyoGrade.color]?.border} ${A[tokyoGrade.color]?.bg} p-4`}>
            <p className={`font-bold text-lg ${A[tokyoGrade.color]?.text}`}>{tokyoGrade.grade}</p>
            <p className={`text-sm font-medium ${A[tokyoGrade.color]?.text} mt-1`}>{tokyoGrade.recommendation}</p>
          </div>
        )}
      </Section>

      <Section title="Bowel Obstruction" applicable={sec.obstruction} onApplicable={v=>sa('obstruction',v)} accent="blue">
        <FL label="Type">
          <Pills options={['Small bowel obstruction (SBO)','Large bowel obstruction (LBO)','Closed-loop obstruction','Pseudo-obstruction (Ogilvie\'s)']} value={obstructionType} onChange={setObstructionType} accent="blue"/>
        </FL>
        <FL label="Cause" sub="multi-select">
          <Pills options={['Adhesions (post-op)','Incarcerated hernia (inguinal/femoral)','Sigmoid volvulus','Caecal volvulus','Colorectal cancer','Small bowel volvulus','Intussusception','Crohn\'s stricture','Gallstone ileus','Malignant peritoneal disease']} value={obstructionCause} onChange={setObstructionCause} accent="blue" multi/>
        </FL>
        <FL label="Level (AXR / CT)">
          <Pills options={['Proximal small bowel (high)','Mid small bowel','Distal small bowel (terminal ileum)','Sigmoid colon','Descending colon','Transverse colon','Ascending colon']} value={obstructionLevel} onChange={setObstructionLevel} accent="blue"/>
        </FL>
        <FL label="Strangulation / ischaemia?">
          <Pills options={['No — simple obstruction','Suspected — tachycardia, fever, peritonism, elevated WBC','Confirmed — CT ischaemia signs (fat stranding, pneumatosis)']} value={strangulation} onChange={setStrangulation} accent="red"/>
        </FL>
        {strangulation.includes('Confirmed')||strangulation.includes('Suspected')?(
          <div className="bg-red-600 text-white rounded-xl p-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5"/>
            <p className="text-sm font-bold">Strangulated obstruction — emergency surgery. IV antibiotics, fluid resuscitation, urgent laparotomy/laparoscopy.</p>
          </div>
        ):null}
      </Section>

      <Section title="Peritonitis" applicable={sec.peritonitis} onApplicable={v=>sa('peritonitis',v)} accent="red">
        <FL label="Peritonitis type">
          <Pills options={['Primary (SBP — cirrhotic)','Secondary — perforated viscus','Secondary — post-operative','Tertiary — persistent post-treatment','Faecal peritonitis (high mortality)']} value={peritonitisType} onChange={setPeritonitisType} accent="red"/>
        </FL>
        <Gate label="Perforation confirmed?" value={perforation} onChange={setPerforation} accent="red">
          <FL label="Perforation site">
            <Pills options={['Perforated peptic ulcer (PPU) — duodenal','Perforated peptic ulcer — gastric','Perforated appendix','Perforated sigmoid diverticulum (Hinchey III/IV)','Perforated bowel — ischaemic','Perforated tumour','Iatrogenic (post-endoscopy)']} value={perforationSite} onChange={setPerforationSite} accent="red"/>
          </FL>
        </Gate>
      </Section>

      <Section title="Management" applicable={sec.management} onApplicable={v=>sa('management',v)} accent="green">
        <FL label="Initial resuscitation" sub="multi-select">
          <Pills options={['IV access × 2','IV crystalloid resuscitation','Catheter — monitor UO','NBM / nasogastric tube drainage','Analgesia (IV morphine/fentanyl)','O2 therapy']} value={resuscitation} onChange={setResuscitation} accent="green" multi/>
        </FL>
        <FL label="Antibiotics">
          <Pills options={['Not required','Co-amoxiclav 1.2g IV TDS','Ceftriaxone 1g IV OD + Metronidazole 500mg IV TDS','Piperacillin-tazobactam 4.5g IV TDS','Imipenem/meropenem (severe/MDR)','Metronidazole alone (C. diff cover)']} value={antibiotics} onChange={setAntibiotics} accent="green"/>
        </FL>
        <FL label="Investigations ordered" sub="multi-select">
          <Pills options={['Erect CXR (pneumoperitoneum)','AXR (obstruction pattern)','USS abdomen','CT abdomen-pelvis (with contrast)','MRI abdomen','Diagnostic laparoscopy','Blood cultures']} value={imaging} onChange={setImaging} accent="teal" multi/>
        </FL>
        <FL label="Surgical approach">
          <Pills options={['Conservative management','Laparoscopic appendicectomy','Open appendicectomy','Laparoscopic cholecystectomy','Percutaneous cholecystostomy (Grade III)','ERCP + biliary decompression','Laparotomy (perforation/strangulation)','Hartmann\'s procedure (perforated sigmoid)','Flatus tube per rectum (sigmoid volvulus)','Colonic decompression (Ogilvie\'s)']} value={surgicalApproach} onChange={setSurgicalApproach} accent="teal"/>
        </FL>
        <FL label="Surgery timing">
          <Pills options={['Immediate (<2h) — perforation/strangulation','Urgent (<6h)','Early (<24h)','Semi-elective (24–72h)','Elective (>72h)']} value={surgeryTiming} onChange={setSurgeryTiming} accent="teal"/>
        </FL>
        <FL label="Clinical notes"><textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Imaging findings, surgical plan, consent..."/></FL>
        <button type="button" onClick={handleSave} className="w-full py-3 rounded-xl bg-red-600 text-white font-bold text-sm shadow">Save Assessment</button>
      </Section>
    </div>
  );
}
