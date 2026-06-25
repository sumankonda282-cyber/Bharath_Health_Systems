/**
 * @shared-pool
 * InflammatoryBowelDiseaseForm — Ulcerative Colitis & Crohn's Disease assessment
 * Mayo Score (UC), Harvey-Bradshaw Index (Crohn's), Montreal classification, biologics
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */

import React, { useState, useMemo } from 'react';
import { Lock, ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  orange: { bg:'bg-orange-50', border:'border-orange-300', text:'text-orange-700', pill:'bg-orange-100 border-orange-400 text-orange-800', active:'bg-orange-500 text-white border-orange-500' },
  amber:  { bg:'bg-amber-50',  border:'border-amber-300',  text:'text-amber-700',  pill:'bg-amber-100 border-amber-400 text-amber-800',  active:'bg-amber-500 text-white border-amber-500' },
  red:    { bg:'bg-red-50',    border:'border-red-300',    text:'text-red-700',    pill:'bg-red-100 border-red-400 text-red-800',    active:'bg-red-600 text-white border-red-600' },
  blue:   { bg:'bg-blue-50',   border:'border-blue-300',   text:'text-blue-700',   pill:'bg-blue-100 border-blue-400 text-blue-800',   active:'bg-blue-600 text-white border-blue-600' },
  green:  { bg:'bg-green-50',  border:'border-green-300',  text:'text-green-700',  pill:'bg-green-100 border-green-400 text-green-800',  active:'bg-green-600 text-white border-green-600' },
  violet: { bg:'bg-violet-50', border:'border-violet-300', text:'text-violet-700', pill:'bg-violet-100 border-violet-400 text-violet-800', active:'bg-violet-600 text-white border-violet-600' },
  teal:   { bg:'bg-teal-50',   border:'border-teal-300',   text:'text-teal-700',   pill:'bg-teal-100 border-teal-400 text-teal-800',   active:'bg-teal-600 text-white border-teal-600' },
  gray:   { bg:'bg-gray-50',   border:'border-gray-300',   text:'text-gray-700',   pill:'bg-gray-100 border-gray-400 text-gray-800',   active:'bg-gray-600 text-white border-gray-600' },
};

function Pills({options,value,onChange,accent='orange',multi=false}){
  const c=A[accent];const sel=multi?(Array.isArray(value)?value:[]):value;
  const toggle=opt=>{if(multi){const a=Array.isArray(sel)?sel:[];onChange(a.includes(opt)?a.filter(x=>x!==opt):[...a,opt]);}else onChange(sel===opt?'':opt);};
  return(<div className="flex flex-wrap gap-2">{options.map(opt=>{const active=multi?sel.includes(opt):sel===opt;return<button key={opt} type="button" onClick={()=>toggle(opt)} className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${active?c.active:c.pill}`}>{opt}</button>;})}</div>);
}
function FL({label,sub,children}){return(<div className="space-y-1"><label className="block text-sm font-semibold text-gray-700">{label}{sub&&<span className="ml-1 text-xs font-normal text-gray-500">{sub}</span>}</label>{children}</div>);}
function Gate({label,value,onChange,accent='orange',children}){
  const c=A[accent];
  return(<div className={`rounded-lg border ${c.border} ${c.bg} p-3`}><div className="flex items-center justify-between flex-wrap gap-2"><span className="text-sm font-medium text-gray-700">{label}</span><div className="flex gap-2">{['Yes','No'].map(opt=>(<button key={opt} type="button" onClick={()=>onChange(value===opt?'':opt)} className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all ${value===opt?c.active:c.pill}`}>{opt}</button>))}</div></div>{value==='Yes'&&children&&<div className="mt-3 space-y-3">{children}</div>}</div>);
}
function Section({title,applicable,onApplicable,accent='orange',children}){
  const c=A[accent];const[open,setOpen]=useState(true);
  if(applicable==='N/A')return(<div className={`rounded-xl border-2 border-dashed ${c.border} p-4 flex items-center gap-3 opacity-60`}><Lock className="w-5 h-5 text-gray-400"/><span className="text-sm text-gray-500 font-medium">{title} — Not applicable · section locked</span><button type="button" onClick={()=>onApplicable('Applicable')} className="ml-auto text-xs text-blue-600 underline">Unlock</button></div>);
  return(<div className={`rounded-xl border-2 ${c.border} overflow-hidden`}><div className={`${c.bg} px-4 py-3 flex items-center justify-between flex-wrap gap-2`}><span className={`font-bold text-base ${c.text}`}>{title}</span><div className="flex items-center gap-2"><div className="flex gap-1">{['Applicable','N/A'].map(v=>(<button key={v} type="button" onClick={()=>onApplicable(v)} className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold transition-all ${v===applicable?c.active:c.pill}`}>{v}</button>))}</div><button type="button" onClick={()=>setOpen(o=>!o)} className={`${c.text} p-1`}>{open?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</button></div></div>{open&&applicable==='Applicable'&&<div className="p-4 space-y-4">{children}</div>}</div>);
}
function ScoreRow({label,options,value,onChange,accent='orange'}){
  const c=A[accent];
  return(<div className="flex items-start gap-3 flex-wrap"><span className="text-sm text-gray-600 w-44 shrink-0 pt-1">{label}</span><div className="flex flex-wrap gap-1 flex-1">{options.map(([lbl,pts])=>{const active=value===pts;return<button key={lbl} type="button" onClick={()=>onChange(active?null:pts)} className={`px-2.5 py-1 rounded border text-xs font-medium transition-all ${active?c.active:c.pill}`}>{lbl}({pts})</button>;})}</div></div>);
}

export default function InflammatoryBowelDiseaseForm({patientId,encounterId,onSaved}){
  const[sec,setSec]=useState({diagnosis:'Applicable',mayo:'Applicable',hbi:'Applicable',extraintestinal:'Applicable',investigations:'Applicable',treatment:'Applicable'});
  const sa=(k,v)=>setSec(s=>({...s,[k]:v}));

  /* Diagnosis */
  const[ibdType,setIbdType]=useState('');
  const[montreal,setMontreal]=useState('');
  const[montrealCrohn,setMontrealCrohn]=useState({age:'',location:'',behaviour:''});
  const[diseaseActivity,setDiseaseActivity]=useState('');
  const[currentFlare,setCurrentFlare]=useState('');
  const[symptoms,setSymptoms]=useState([]);

  /* Mayo Score (UC) */
  const[mayoStool,setMayoStool]=useState(null);
  const[mayoBlood,setMayoBlood]=useState(null);
  const[mayoMucosa,setMayoMucosa]=useState(null);
  const[mayoAssessment,setMayoAssessment]=useState(null);

  /* Harvey-Bradshaw Index (Crohn's) */
  const[hbiWellbeing,setHbiWellbeing]=useState(null);
  const[hbiAbdoPain,setHbiAbdoPain]=useState(null);
  const[hbiStools,setHbiStools]=useState('');
  const[hbiAbdoMass,setHbiAbdoMass]=useState(null);
  const[hbiComplications,setHbiComplications]=useState([]);

  /* Extraintestinal */
  const[extraIntestinal,setExtraIntestinal]=useState([]);
  const[perianal,setPerianal]=useState('');
  const[fistulas,setFistulas]=useState([]);

  /* Investigations */
  const[crp,setCrp]=useState('');
  const[esr,setEsr]=useState('');
  const[calprotectin,setCalprotectin]=useState('');
  const[hb,setHb]=useState('');
  const[albumin,setAlbumin]=useState('');
  const[endoscopyResult,setEndoscopyResult]=useState('');
  const[biopsyResult,setBiopsyResult]=useState('');
  const[imaging,setImaging]=useState('');
  const[tbScreen,setTbScreen]=useState('');

  /* Treatment */
  const[currentMeds,setCurrentMeds]=useState([]);
  const[steroids,setSteroids]=useState('');
  const[aminosalicylate,setAminosalicylate]=useState('');
  const[immunomodulator,setImmunomodulator]=useState('');
  const[biologic,setBiologic]=useState('');
  const[surgeryHistory,setSurgeryHistory]=useState('');
  const[surgeryIndication,setSurgeryIndication]=useState('');
  const[vaccinationsChecked,setVaccinationsChecked]=useState('');
  const[notes,setNotes]=useState('');

  /* Mayo Score calc */
  const mayoScore=useMemo(()=>[mayoStool,mayoBlood,mayoMucosa,mayoAssessment].filter(v=>v!=null).reduce((a,b)=>a+b,0),[mayoStool,mayoBlood,mayoMucosa,mayoAssessment]);
  const mayoInterp=useMemo(()=>{
    if(mayoScore<=2)return{label:'Remission',color:'green'};
    if(mayoScore<=5)return{label:'Mild UC',color:'amber'};
    if(mayoScore<=10)return{label:'Moderate UC',color:'orange'};
    return{label:'Severe UC — consider hospitalisation',color:'red'};
  },[mayoScore]);

  /* HBI calc */
  const hbiScore=useMemo(()=>{
    let s=0;
    if(hbiWellbeing!=null)s+=hbiWellbeing;
    if(hbiAbdoPain!=null)s+=hbiAbdoPain;
    s+=parseInt(hbiStools||0);
    if(hbiAbdoMass!=null)s+=hbiAbdoMass;
    s+=hbiComplications.length;
    return s;
  },[hbiWellbeing,hbiAbdoPain,hbiStools,hbiAbdoMass,hbiComplications]);
  const hbiInterp=useMemo(()=>{
    if(hbiScore<=4)return{label:'Remission',color:'green'};
    if(hbiScore<=7)return{label:'Mild Crohn\'s',color:'amber'};
    if(hbiScore<=16)return{label:'Moderate Crohn\'s',color:'orange'};
    return{label:'Severe Crohn\'s',color:'red'};
  },[hbiScore]);

  const severeAlert=(ibdType==='Ulcerative Colitis'&&mayoScore>=10)||(ibdType==="Crohn's Disease"&&hbiScore>16);

  const handleSave=async()=>{
    try{
      await api.post('/assessments',{type:'ibd',patientId,encounterId,data:{ibdType,montreal,montrealCrohn,diseaseActivity,currentFlare,symptoms,mayo:{stool:mayoStool,blood:mayoBlood,mucosa:mayoMucosa,assessment:mayoAssessment,score:mayoScore,interp:mayoInterp.label},hbi:{wellbeing:hbiWellbeing,abdoPain:hbiAbdoPain,stools:hbiStools,abdoMass:hbiAbdoMass,complications:hbiComplications,score:hbiScore,interp:hbiInterp.label},extraIntestinal,perianal,fistulas,investigations:{crp,esr,calprotectin,hb,albumin,endoscopyResult,biopsyResult,imaging,tbScreen},treatment:{currentMeds,steroids,aminosalicylate,immunomodulator,biologic,surgeryHistory,surgeryIndication,vaccinationsChecked},notes}});
      onSaved?.();
    }catch(e){console.error(e);}
  };

  return(
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl p-5 shadow-lg">
        <h2 className="text-xl font-bold">Inflammatory Bowel Disease Assessment</h2>
        <p className="text-orange-100 text-sm mt-1">Mayo Score · Harvey-Bradshaw Index · Montreal Classification · Biologics</p>
      </div>

      {severeAlert&&(
        <div className="bg-red-600 text-white rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-6 h-6 shrink-0"/>
          <div><p className="font-bold">Severe IBD Flare — Consider urgent admission</p><p className="text-sm text-red-100">IV steroids, GI/colorectal surgery referral, rule out CMV colitis and toxic megacolon.</p></div>
        </div>
      )}

      <Section title="Diagnosis & Classification" applicable={sec.diagnosis} onApplicable={v=>sa('diagnosis',v)} accent="orange">
        <FL label="IBD type">
          <Pills options={['Ulcerative Colitis','Crohn\'s Disease','IBD-Unclassified (IBDU)','Indeterminate colitis']} value={ibdType} onChange={setIbdType} accent="orange"/>
        </FL>
        {ibdType==='Ulcerative Colitis'&&(
          <FL label="Montreal classification (UC extent)">
            <Pills options={['E1 — Proctitis (distal to rectosigmoid junction)','E2 — Left-sided (distal to splenic flexure)','E3 — Extensive / pancolitis']} value={montreal} onChange={setMontreal} accent="orange"/>
          </FL>
        )}
        {ibdType==="Crohn's Disease"&&(
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-600">Montreal Classification (Crohn's)</p>
            <FL label="Age at diagnosis">
              <Pills options={['A1 — <17 years','A2 — 17–40 years','A3 — >40 years']} value={montrealCrohn.age} onChange={v=>setMontrealCrohn(c=>({...c,age:v}))} accent="orange"/>
            </FL>
            <FL label="Location">
              <Pills options={['L1 — Terminal ileum','L2 — Colonic','L3 — Ileocolonic','L4 — Upper GI (isolated)','L3+L4 — Ileocolonic + upper GI']} value={montrealCrohn.location} onChange={v=>setMontrealCrohn(c=>({...c,location:v}))} accent="orange"/>
            </FL>
            <FL label="Behaviour">
              <Pills options={['B1 — Non-stricturing, non-penetrating (inflammatory)','B2 — Stricturing','B3 — Penetrating','B2+B3 — Both','+ p — Perianal disease modifier']} value={montrealCrohn.behaviour} onChange={v=>setMontrealCrohn(c=>({...c,behaviour:v}))} accent="orange"/>
            </FL>
          </div>
        )}
        <FL label="Current disease status">
          <Pills options={['Remission','Mild flare','Moderate flare','Severe flare','Chronic active (refractory)','Newly diagnosed']} value={diseaseActivity} onChange={setDiseaseActivity} accent="amber"/>
        </FL>
        <FL label="Presenting symptoms" sub="multi-select">
          <Pills options={['Bloody diarrhoea','Mucus per rectum','Urgency','Tenesmus','Watery diarrhoea','Abdominal pain (colicky)','Weight loss','>5% weight loss','Fever','Anaemia symptoms','Perianal pain','Night symptoms','Mouth ulcers']} value={symptoms} onChange={setSymptoms} accent="amber" multi/>
        </FL>
        <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
          <p className={`font-semibold ${A.amber.text}`}>India context</p>
          <p className="text-gray-600 mt-1">IBD incidence rising in India — urban {'>'}  rural. Critical to exclude intestinal TB before starting immunosuppressives. Mantoux test, IGRA (QuantiFERON), chest X-ray, and colonoscopic biopsy for granulomas mandatory. Parasitic colitis (Entamoeba, Giardia) must also be ruled out.</p>
        </div>
      </Section>

      {ibdType==='Ulcerative Colitis'&&(
        <Section title="Mayo Score (Ulcerative Colitis)" applicable={sec.mayo} onApplicable={v=>sa('mayo',v)} accent="orange">
          <p className="text-xs text-gray-500">Each component 0–3. Total 0–12. Full Mayo includes endoscopy subscore.</p>
          <div className="space-y-2">
            <ScoreRow label="Stool frequency" options={[['Normal (0)',0],['1–2/day > normal (1)',1],['3–4/day > normal (2)',2],['≥5/day > normal (3)',3]]} value={mayoStool} onChange={setMayoStool} accent="orange"/>
            <ScoreRow label="Rectal bleeding" options={[['None (0)',0],['Streaks of blood <50% (1)',1],['Obvious blood most of time (2)',2],['Blood alone passed (3)',3]]} value={mayoBlood} onChange={setMayoBlood} accent="orange"/>
            <ScoreRow label="Endoscopy findings" options={[['Normal / inactive (0)',0],['Mild — erythema, decreased vascular pattern (1)',1],['Moderate — friability, erosions (2)',2],['Severe — ulceration, spontaneous bleeding (3)',3]]} value={mayoMucosa} onChange={setMayoMucosa} accent="orange"/>
            <ScoreRow label="Physician global assessment" options={[['Normal (0)',0],['Mild (1)',1],['Moderate (2)',2],['Severe (3)',3]]} value={mayoAssessment} onChange={setMayoAssessment} accent="orange"/>
          </div>
          <div className={`rounded-xl border-2 ${A[mayoInterp.color]?.border} ${A[mayoInterp.color]?.bg} p-4 mt-2`}>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-black ${A[mayoInterp.color]?.text}`}>Mayo: {mayoScore}/12</span>
              <span className={`text-sm font-semibold ${A[mayoInterp.color]?.text}`}>{mayoInterp.label}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Remission ≤2 (no blood) | Mild 3–5 | Moderate 6–10 | Severe 11–12</p>
          </div>
        </Section>
      )}

      {ibdType==="Crohn's Disease"&&(
        <Section title="Harvey-Bradshaw Index (Crohn's)" applicable={sec.hbi} onApplicable={v=>sa('hbi',v)} accent="amber">
          <p className="text-xs text-gray-500">Simplified CDAI. Score ≤4 = remission.</p>
          <div className="space-y-2">
            <ScoreRow label="General wellbeing" options={[['Very well (0)',0],['Slightly below par (1)',1],['Poor (2)',2],['Very poor (3)',3],['Terrible (4)',4]]} value={hbiWellbeing} onChange={setHbiWellbeing} accent="amber"/>
            <ScoreRow label="Abdominal pain" options={[['None (0)',0],['Mild (1)',1],['Moderate (2)',2],['Severe (3)',3]]} value={hbiAbdoPain} onChange={setHbiAbdoPain} accent="amber"/>
            <FL label="Number of liquid / very soft stools per day">
              <input type="number" min="0" value={hbiStools} onChange={e=>setHbiStools(e.target.value)} className="w-24 border rounded-lg px-3 py-2 text-sm"/>
              <span className="text-xs text-gray-500 ml-2">Each stool = 1 point</span>
            </FL>
            <ScoreRow label="Abdominal mass" options={[['None (0)',0],['Dubious (1)',1],['Definite (2)',2],['Definite + tender (3)',3]]} value={hbiAbdoMass} onChange={setHbiAbdoMass} accent="amber"/>
            <FL label="Complications" sub="1 point each, multi-select">
              <Pills options={['Arthralgia','Uveitis','Erythema nodosum','Aphthous ulcers','Pyoderma gangrenosum','Anal fissure','New fistula','Abscess']} value={hbiComplications} onChange={setHbiComplications} accent="amber" multi/>
            </FL>
          </div>
          <div className={`rounded-xl border-2 ${A[hbiInterp.color]?.border} ${A[hbiInterp.color]?.bg} p-4 mt-2`}>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-black ${A[hbiInterp.color]?.text}`}>HBI: {hbiScore}</span>
              <span className={`text-sm font-semibold ${A[hbiInterp.color]?.text}`}>{hbiInterp.label}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Remission ≤4 | Mild 5–7 | Moderate 8–16 | Severe &gt;16</p>
          </div>
        </Section>
      )}

      <Section title="Extraintestinal Manifestations & Complications" applicable={sec.extraintestinal} onApplicable={v=>sa('extraintestinal',v)} accent="violet">
        <FL label="Extraintestinal manifestations" sub="multi-select">
          <Pills options={['Peripheral arthropathy (Type 1 — pauciarticular, parallels bowel activity)','Peripheral arthropathy (Type 2 — polyarticular, independent)','Axial arthropathy / ankylosing spondylitis','Sacroiliitis','Episcleritis','Uveitis','Erythema nodosum','Pyoderma gangrenosum','Primary sclerosing cholangitis (PSC)','Cholelithiasis','Nephrolithiasis','Venous thromboembolism','Anaemia (iron deficiency / anaemia of chronic disease)']} value={extraIntestinal} onChange={setExtraIntestinal} accent="violet" multi/>
        </FL>
        <FL label="Perianal disease">
          <Pills options={['None','Skin tags','Anal fissure','Perianal fistula (simple)','Perianal fistula (complex)','Perianal abscess','Rectovaginal fistula']} value={perianal} onChange={setPerianal} accent="violet"/>
        </FL>
        <FL label="Fistulas / strictures / penetrating disease" sub="multi-select">
          <Pills options={['Enteroenteric fistula','Enterocutaneous fistula','Enterovesical fistula','Ileal stricture','Colonic stricture','Intra-abdominal abscess','Toxic megacolon']} value={fistulas} onChange={setFistulas} accent="red" multi/>
        </FL>
        {fistulas.includes('Toxic megacolon')&&(
          <div className="bg-red-600 text-white rounded-xl p-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5"/>
            <p className="text-sm font-bold">Toxic megacolon — urgent surgical consult. Colon transverse diameter &gt;6cm. Risk of perforation.</p>
          </div>
        )}
      </Section>

      <Section title="Investigations" applicable={sec.investigations} onApplicable={v=>sa('investigations',v)} accent="blue">
        <div className="grid grid-cols-3 gap-3">
          <FL label="CRP (mg/L)"><input type="number" step="0.1" value={crp} onChange={e=>setCrp(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="ESR (mm/hr)"><input type="number" value={esr} onChange={e=>setEsr(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="Faecal calprotectin (µg/g)"><input type="number" value={calprotectin} onChange={e=>setCalprotectin(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="Hb (g/dL)"><input type="number" step="0.1" value={hb} onChange={e=>setHb(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="Albumin (g/L)"><input type="number" step="0.1" value={albumin} onChange={e=>setAlbumin(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
        </div>
        {parseInt(calprotectin||0)>250&&<p className="text-xs text-orange-600 font-medium">Calprotectin &gt;250 µg/g suggests active mucosal inflammation — consider endoscopy.</p>}
        <FL label="Endoscopy findings">
          <input type="text" value={endoscopyResult} onChange={e=>setEndoscopyResult(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Describe endoscopic findings, extent, severity..."/>
        </FL>
        <FL label="Biopsy result">
          <input type="text" value={biopsyResult} onChange={e=>setBiopsyResult(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Histology — granulomas, crypt architecture, dysplasia..."/>
        </FL>
        <FL label="Imaging (MR enterography / CT)">
          <input type="text" value={imaging} onChange={e=>setImaging(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="MRI/CT findings — strictures, fistulas, abscess..."/>
        </FL>
        <FL label="TB exclusion (mandatory before immunosuppression)">
          <Pills options={['Not done yet','Mantoux done — result pending','Mantoux negative','Mantoux positive','IGRA (QuantiFERON) negative','IGRA positive — refer ID / chest','CXR clear','CXR — old TB changes']} value={tbScreen} onChange={setTbScreen} accent="red"/>
        </FL>
      </Section>

      <Section title="Treatment" applicable={sec.treatment} onApplicable={v=>sa('treatment',v)} accent="green">
        <FL label="Current medications" sub="multi-select">
          <Pills options={['5-ASA (mesalazine oral)','5-ASA (mesalazine topical/enema)','Sulfasalazine','Budesonide','Prednisolone (oral)','IV hydrocortisone','Azathioprine / 6-MP','Methotrexate','Infliximab','Adalimumab','Vedolizumab','Ustekinumab','Tofacitinib / JAK inhibitor','Ciclosporin (acute severe UC)']} value={currentMeds} onChange={setCurrentMeds} accent="green" multi/>
        </FL>
        <FL label="Current steroid therapy">
          <Pills options={['None','Oral prednisolone (dose: __ mg)','IV hydrocortisone 100mg QDS','Budesonide 9mg OD (Crohn\'s)','Steroid-dependent','Steroid-refractory']} value={steroids} onChange={setSteroids} accent="amber"/>
        </FL>
        <FL label="Biologic / advanced therapy">
          <Pills options={['Not on biologic','Infliximab (anti-TNF)','Adalimumab (anti-TNF)','Vedolizumab (gut-selective anti-integrin)','Ustekinumab (anti-IL12/23)','Tofacitinib (JAK1/3 — UC only)','Upadacitinib (JAK1 — UC)','Ozanimod (S1P — UC)','Biologic-naive','Primary non-responder','Secondary loss of response']} value={biologic} onChange={setBiologic} accent="violet"/>
        </FL>
        <Gate label="Surgical history?" value={surgeryHistory} onChange={setSurgeryHistory} accent="teal">
          <FL label="Surgery type">
            <Pills options={['Right hemicolectomy (ileal Crohn\'s)','Strictureplasty','Small bowel resection','Subtotal colectomy (acute severe UC)','Proctocolectomy + ileo-anal pouch (IPAA)','Proctocolectomy + permanent ileostomy','Diverting ileostomy','Abscess drainage']} value={surgeryIndication} onChange={setSurgeryIndication} accent="teal"/>
          </FL>
        </Gate>
        <FL label="Vaccinations checked before biologic?">
          <Pills options={['Yes — all up to date','Hepatitis B — given','Pneumococcal — given','Influenza — given','VZV — checked (live vaccines contraindicated on biologics)','Not yet reviewed']} value={vaccinationsChecked} onChange={setVaccinationsChecked} accent="teal"/>
        </FL>
        <FL label="Clinical notes"><textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Flare management plan, MDT discussion, monitoring..."/></FL>
        <button type="button" onClick={handleSave} className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm shadow">Save Assessment</button>
      </Section>
    </div>
  );
}
