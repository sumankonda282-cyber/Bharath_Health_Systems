/**
 * @shared-pool
 * GICancerAssessmentForm — GI cancer staging & assessment
 * Colorectal (TNM), gastric (Lauren), HCC (BCLC), oesophageal cancer, India MDT centres
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */

import React, { useState, useMemo } from 'react';
import { Lock, ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  slate:  { bg:'bg-slate-50',  border:'border-slate-300',  text:'text-slate-700',  pill:'bg-slate-100 border-slate-400 text-slate-800',  active:'bg-slate-600 text-white border-slate-600' },
  gray:   { bg:'bg-gray-50',   border:'border-gray-300',   text:'text-gray-700',   pill:'bg-gray-100 border-gray-400 text-gray-800',   active:'bg-gray-600 text-white border-gray-600' },
  red:    { bg:'bg-red-50',    border:'border-red-300',    text:'text-red-700',    pill:'bg-red-100 border-red-400 text-red-800',    active:'bg-red-600 text-white border-red-600' },
  orange: { bg:'bg-orange-50', border:'border-orange-300', text:'text-orange-700', pill:'bg-orange-100 border-orange-400 text-orange-800', active:'bg-orange-500 text-white border-orange-500' },
  amber:  { bg:'bg-amber-50',  border:'border-amber-300',  text:'text-amber-700',  pill:'bg-amber-100 border-amber-400 text-amber-800',  active:'bg-amber-500 text-white border-amber-500' },
  blue:   { bg:'bg-blue-50',   border:'border-blue-300',   text:'text-blue-700',   pill:'bg-blue-100 border-blue-400 text-blue-800',   active:'bg-blue-600 text-white border-blue-600' },
  green:  { bg:'bg-green-50',  border:'border-green-300',  text:'text-green-700',  pill:'bg-green-100 border-green-400 text-green-800',  active:'bg-green-600 text-white border-green-600' },
  violet: { bg:'bg-violet-50', border:'border-violet-300', text:'text-violet-700', pill:'bg-violet-100 border-violet-400 text-violet-800', active:'bg-violet-600 text-white border-violet-600' },
};

function Pills({options,value,onChange,accent='slate',multi=false}){
  const c=A[accent];const sel=multi?(Array.isArray(value)?value:[]):value;
  const toggle=opt=>{if(multi){const a=Array.isArray(sel)?sel:[];onChange(a.includes(opt)?a.filter(x=>x!==opt):[...a,opt]);}else onChange(sel===opt?'':opt);};
  return(<div className="flex flex-wrap gap-2">{options.map(opt=>{const active=multi?sel.includes(opt):sel===opt;return<button key={opt} type="button" onClick={()=>toggle(opt)} className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${active?c.active:c.pill}`}>{opt}</button>;})}</div>);
}
function FL({label,sub,children}){return(<div className="space-y-1"><label className="block text-sm font-semibold text-gray-700">{label}{sub&&<span className="ml-1 text-xs font-normal text-gray-500">{sub}</span>}</label>{children}</div>);}
function Gate({label,value,onChange,accent='slate',children}){
  const c=A[accent];
  return(<div className={`rounded-lg border ${c.border} ${c.bg} p-3`}><div className="flex items-center justify-between flex-wrap gap-2"><span className="text-sm font-medium text-gray-700">{label}</span><div className="flex gap-2">{['Yes','No'].map(opt=>(<button key={opt} type="button" onClick={()=>onChange(value===opt?'':opt)} className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all ${value===opt?c.active:c.pill}`}>{opt}</button>))}</div></div>{value==='Yes'&&children&&<div className="mt-3 space-y-3">{children}</div>}</div>);
}
function Section({title,applicable,onApplicable,accent='slate',children}){
  const c=A[accent];const[open,setOpen]=useState(true);
  if(applicable==='N/A')return(<div className={`rounded-xl border-2 border-dashed ${c.border} p-4 flex items-center gap-3 opacity-60`}><Lock className="w-5 h-5 text-gray-400"/><span className="text-sm text-gray-500 font-medium">{title} — Not applicable · section locked</span><button type="button" onClick={()=>onApplicable('Applicable')} className="ml-auto text-xs text-blue-600 underline">Unlock</button></div>);
  return(<div className={`rounded-xl border-2 ${c.border} overflow-hidden`}><div className={`${c.bg} px-4 py-3 flex items-center justify-between flex-wrap gap-2`}><span className={`font-bold text-base ${c.text}`}>{title}</span><div className="flex items-center gap-2"><div className="flex gap-1">{['Applicable','N/A'].map(v=>(<button key={v} type="button" onClick={()=>onApplicable(v)} className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold transition-all ${v===applicable?c.active:c.pill}`}>{v}</button>))}</div><button type="button" onClick={()=>setOpen(o=>!o)} className={`${c.text} p-1`}>{open?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</button></div></div>{open&&applicable==='Applicable'&&<div className="p-4 space-y-4">{children}</div>}</div>);
}

export default function GICancerAssessmentForm({patientId,encounterId,onSaved}){
  const[sec,setSec]=useState({diagnosis:'Applicable',colorectal:'Applicable',gastric:'Applicable',hcc:'Applicable',oesophageal:'Applicable',treatment:'Applicable'});
  const sa=(k,v)=>setSec(s=>({...s,[k]:v}));

  const[cancerType,setCancerType]=useState('');
  const[symptoms,setSymptoms]=useState([]);
  const[performanceStatus,setPerformanceStatus]=useState('');

  /* Colorectal */
  const[crcLocation,setCrcLocation]=useState('');
  const[tnmT,setTnmT]=useState('');const[tnmN,setTnmN]=useState('');const[tnmM,setTnmM]=useState('');
  const[dukesStage,setDukesStage]=useState('');
  const[msi,setMsi]=useState('');const[kras,setKras]=useState('');const[braf,setBraf]=useState('');
  const[crcColonoscopy,setCrcColonoscopy]=useState('');
  const[crcSurgery,setCrcSurgery]=useState('');

  /* Gastric */
  const[gastricLocation,setGastricLocation]=useState('');
  const[laurenType,setLaurenType]=useState('');
  const[bormann,setBormann]=useState('');
  const[gastricT,setGastricT]=useState('');const[gastricN,setGastricN]=useState('');const[gastricM,setGastricM]=useState('');
  const[her2,setHer2]=useState('');

  /* HCC */
  const[bclcStage,setBclcStage]=useState('');
  const[afp,setAfp]=useState('');
  const[childPugh,setChildPugh]=useState('');
  const[hccSize,setHccSize]=useState('');
  const[hccNumber,setHccNumber]=useState('');
  const[portalVein,setPortalVein]=useState('');

  /* Oesophageal */
  const[oesType,setOesType]=useState('');
  const[siewert,setSiewert]=useState('');
  const[oesT,setOesT]=useState('');const[oesN,setOesN]=useState('');const[oesM,setOesM]=useState('');

  /* Treatment */
  const[mdtDiscussed,setMdtDiscussed]=useState('');
  const[treatmentIntent,setTreatmentIntent]=useState('');
  const[treatmentPlan,setTreatmentPlan]=useState([]);
  const[palliativeCare,setPalliativeCare]=useState('');
  const[clinicalTrial,setClinicalTrial]=useState('');
  const[notes,setNotes]=useState('');

  /* CRC stage */
  const crcStage=useMemo(()=>{
    if(tnmM==='M1')return'Stage IV — Metastatic';
    if(!tnmT||!tnmN)return null;
    if(tnmT==='T1'&&tnmN==='N0')return'Stage I';
    if(tnmT==='T2'&&tnmN==='N0')return'Stage I';
    if(tnmT==='T3'&&tnmN==='N0')return'Stage IIA';
    if(tnmT==='T4a'&&tnmN==='N0')return'Stage IIB';
    if(tnmT==='T4b'&&tnmN==='N0')return'Stage IIC';
    if(tnmN==='N1')return'Stage III';
    if(tnmN==='N2')return'Stage IIIC (node +)';
    return null;
  },[tnmT,tnmN,tnmM]);

  const handleSave=async()=>{
    try{
      await api.post('/assessments',{type:'gi-cancer',patientId,encounterId,data:{cancerType,symptoms,performanceStatus,colorectal:{location:crcLocation,tnm:{T:tnmT,N:tnmN,M:tnmM},stage:crcStage,dukesStage,msi,kras,braf,colonoscopy:crcColonoscopy,surgery:crcSurgery},gastric:{location:gastricLocation,laurenType,bormann,tnm:{T:gastricT,N:gastricN,M:gastricM},her2},hcc:{bclcStage,afp,childPugh,size:hccSize,number:hccNumber,portalVein},oesophageal:{type:oesType,siewert,tnm:{T:oesT,N:oesN,M:oesM}},treatment:{mdtDiscussed,intent:treatmentIntent,plan:treatmentPlan,palliativeCare,clinicalTrial},notes}});
      onSaved?.();
    }catch(e){console.error(e);}
  };

  return(
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="bg-gradient-to-r from-slate-600 to-gray-700 text-white rounded-2xl p-5 shadow-lg">
        <h2 className="text-xl font-bold">GI Cancer Assessment</h2>
        <p className="text-slate-200 text-sm mt-1">Colorectal TNM · Gastric (Lauren/Bormann) · HCC (BCLC) · Oesophageal staging</p>
      </div>

      <Section title="Diagnosis & Performance Status" applicable={sec.diagnosis} onApplicable={v=>sa('diagnosis',v)} accent="slate">
        <FL label="Cancer type">
          <Pills options={['Colorectal carcinoma (CRC)','Gastric carcinoma','Hepatocellular carcinoma (HCC)','Oesophageal carcinoma','Pancreatic carcinoma','Cholangiocarcinoma','Gallbladder carcinoma','GI neuroendocrine tumour (NET)','GIST','Small bowel carcinoma','Anal carcinoma']} value={cancerType} onChange={setCancerType} accent="slate"/>
        </FL>
        <FL label="Presenting symptoms" sub="multi-select">
          <Pills options={['Rectal bleeding','Change in bowel habit','Weight loss >5%','Iron deficiency anaemia','Dysphagia','Abdominal mass','Obstructive jaundice','Ascites','Fatigue','Pain','Anorexia']} value={symptoms} onChange={setSymptoms} accent="gray" multi/>
        </FL>
        <FL label="ECOG Performance Status">
          <div className="space-y-1">
            {[['0 — Fully active, no restriction'],['1 — Restricted but ambulatory, light work possible'],['2 — Ambulatory >50% of day; self-care only'],['3 — Limited self-care; >50% of time in bed'],['4 — Completely disabled; fully dependent']].map(([lbl])=>(
              <button key={lbl} type="button" onClick={()=>setPerformanceStatus(performanceStatus===lbl?'':lbl)} className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${performanceStatus===lbl?A.slate.active:A.slate.pill}`}>{lbl}</button>
            ))}
          </div>
        </FL>
        <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
          <p className={`font-semibold ${A.amber.text}`}>India context</p>
          <p className="text-gray-600 mt-1">Gastric cancer incidence higher in northeast India and Kashmir. Gallbladder cancer highest incidence globally in North India (Ganga belt). HCC often HBV/HCV-related (no alcoholic aetiology needed). CRC incidence rising in urban India. MDT referral: Tata Memorial Mumbai, AIIMS Delhi, Regional Cancer Centres.</p>
        </div>
      </Section>

      <Section title="Colorectal Cancer" applicable={sec.colorectal} onApplicable={v=>sa('colorectal',v)} accent="orange">
        <FL label="Tumour location">
          <Pills options={['Rectum','Sigmoid colon','Descending colon','Transverse colon','Hepatic flexure','Ascending colon','Caecum','Appendiceal']} value={crcLocation} onChange={setCrcLocation} accent="orange"/>
        </FL>
        <div className="grid grid-cols-3 gap-3">
          <FL label="T stage">
            <Pills options={['Tis','T1','T2','T3','T4a','T4b']} value={tnmT} onChange={setTnmT} accent="orange"/>
          </FL>
          <FL label="N stage">
            <Pills options={['N0','N1','N1a','N1b','N1c','N2','N2a','N2b']} value={tnmN} onChange={setTnmN} accent="orange"/>
          </FL>
          <FL label="M stage">
            <Pills options={['M0','M1','M1a','M1b','M1c']} value={tnmM} onChange={setTnmM} accent="red"/>
          </FL>
        </div>
        {crcStage&&<div className="bg-orange-50 border border-orange-300 rounded-lg p-3 text-center"><span className="font-bold text-orange-700 text-lg">{crcStage}</span></div>}
        <FL label="Molecular markers">
          <div className="grid grid-cols-3 gap-2">
            <FL label="MSI/dMMR"><Pills options={['MSI-H / dMMR','MSS / pMMR','Unknown']} value={msi} onChange={setMsi} accent="violet"/></FL>
            <FL label="KRAS/NRAS"><Pills options={['Wild-type','Mutated','Unknown']} value={kras} onChange={setKras} accent="violet"/></FL>
            <FL label="BRAF V600E"><Pills options={['Wild-type','Mutated','Unknown']} value={braf} onChange={setBraf} accent="violet"/></FL>
          </div>
        </FL>
        {msi==='MSI-H / dMMR'&&<p className="text-xs text-violet-700 font-medium">MSI-H — eligible for pembrolizumab (immunotherapy) in metastatic setting. Screen for Lynch syndrome.</p>}
        <FL label="Colonoscopy findings"><input type="text" value={crcColonoscopy} onChange={e=>setCrcColonoscopy(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Polyp/tumour description, biopsy result..."/></FL>
        <FL label="Surgical procedure">
          <Pills options={['Right hemicolectomy','Extended right hemicolectomy','Transverse colectomy','Left hemicolectomy','Sigmoid colectomy','Anterior resection (AR)','Low anterior resection (LAR)','Ultra-low AR + coloanal anastomosis','Abdominoperineal resection (APR)','Hartmann\'s','Total mesorectal excision (TME)','Endoscopic resection (EMR/ESD)','Stenting (palliation)']} value={crcSurgery} onChange={setCrcSurgery} accent="orange"/>
        </FL>
      </Section>

      <Section title="Gastric Cancer" applicable={sec.gastric} onApplicable={v=>sa('gastric',v)} accent="blue">
        <FL label="Tumour location">
          <Pills options={['Cardia (GEJ — Siewert I/II/III)','Fundus','Body — lesser curvature','Body — greater curvature','Antrum','Pylorus','Diffuse (linitis plastica)']} value={gastricLocation} onChange={setGastricLocation} accent="blue"/>
        </FL>
        <FL label="Lauren classification (histological)">
          <Pills options={['Intestinal type (well-differentiated, glandular)','Diffuse type (poorly differentiated, signet ring cells)','Mixed type','Indeterminate']} value={laurenType} onChange={setLaurenType} accent="blue"/>
        </FL>
        <FL label="Bormann macroscopic classification">
          <Pills options={['Type I — Polypoid (intraluminal, pedunculated)','Type II — Fungating (ulcerated, well-demarcated)','Type III — Infiltrating ulcer (poorly demarcated)','Type IV — Diffusely infiltrating (linitis plastica)','Type V — Unclassifiable']} value={bormann} onChange={setBormann} accent="blue"/>
        </FL>
        <div className="grid grid-cols-3 gap-2">
          <FL label="T stage"><Pills options={['T1a','T1b','T2','T3','T4a','T4b']} value={gastricT} onChange={setGastricT} accent="blue"/></FL>
          <FL label="N stage"><Pills options={['N0','N1','N2','N3','N3a','N3b']} value={gastricN} onChange={setGastricN} accent="blue"/></FL>
          <FL label="M stage"><Pills options={['M0','M1']} value={gastricM} onChange={setGastricM} accent="red"/></FL>
        </div>
        <FL label="HER2 status">
          <Pills options={['HER2 positive (3+ IHC or ISH amplified)','HER2 negative','HER2 equivocal (2+ IHC) — ISH pending','Unknown']} value={her2} onChange={setHer2} accent="blue"/>
        </FL>
        {her2==='HER2 positive (3+ IHC or ISH amplified)'&&<p className="text-xs text-blue-700 font-medium">HER2 positive — add trastuzumab to first-line FOLFOX/CAPOX in metastatic setting.</p>}
      </Section>

      <Section title="HCC — BCLC Staging" applicable={sec.hcc} onApplicable={v=>sa('hcc',v)} accent="amber">
        <div className="grid grid-cols-2 gap-3">
          <FL label="AFP (ng/mL)"><input type="number" value={afp} onChange={e=>setAfp(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="Child-Pugh class"><Pills options={['A','B','C','No cirrhosis']} value={childPugh} onChange={setChildPugh} accent="amber"/></FL>
          <FL label="Tumour size (largest nodule cm)"><input type="number" step="0.1" value={hccSize} onChange={e=>setHccSize(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="Number of nodules"><Pills options={['1 (solitary)','2–3','≥4']} value={hccNumber} onChange={setHccNumber} accent="amber"/></FL>
        </div>
        <FL label="Portal vein involvement">
          <Pills options={['No','Branch portal vein involvement','Main portal vein thrombosis (PVTT)']} value={portalVein} onChange={setPortalVein} accent="red"/>
        </FL>
        <FL label="BCLC Stage">
          <div className="space-y-1">
            {[
              ['0 — Very early: Solitary ≤2cm, Child A, PS 0 → Resection/ablation (5-yr OS >70%)','green'],
              ['A — Early: Solitary or ≤3 nodules ≤3cm, Child A–B, PS 0 → Resection/transplant/ablation (5-yr OS 50–70%)','green'],
              ['B — Intermediate: Multinodular, Child A–B, PS 0 → TACE (median OS 20 months)','amber'],
              ['C — Advanced: Vascular invasion or extrahepatic spread, Child A–B, PS 1–2 → Sorafenib/atezolizumab+bevacizumab (median OS 12 months)','orange'],
              ['D — Terminal: Child C, PS 3–4 → Best supportive care (OS <3 months)','red'],
            ].map(([lbl,col])=>(
              <button key={lbl} type="button" onClick={()=>setBclcStage(bclcStage===lbl?'':lbl)} className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${bclcStage===lbl?A[col].active:A[col].pill}`}>{lbl}</button>
            ))}
          </div>
        </FL>
        {parseInt(afp||0)>400&&<p className="text-xs text-amber-700 font-medium">AFP &gt;400 ng/mL — highly suggestive of HCC (sensitivity ~50% for small HCC).</p>}
      </Section>

      <Section title="Oesophageal Cancer" applicable={sec.oesophageal} onApplicable={v=>sa('oesophageal',v)} accent="violet">
        <FL label="Histological type">
          <Pills options={['Squamous cell carcinoma (SCC) — mid/upper oesophagus','Adenocarcinoma (ACA) — lower oesophagus / GEJ']} value={oesType} onChange={setOesType} accent="violet"/>
        </FL>
        {(oesType.includes('Adenocarcinoma')||oesType.includes('GEJ'))&&(
          <FL label="Siewert classification (GEJ adenocarcinoma)">
            <Pills options={['Type I — Distal oesophageal (>1cm above GEJ) — Ivor-Lewis/transhiatal','Type II — True GEJ cardia (1cm above to 2cm below GEJ) — transhiatal/total gastrectomy','Type III — Subcardial gastric (2–5cm below GEJ) — total gastrectomy']} value={siewert} onChange={setSiewert} accent="violet"/>
          </FL>
        )}
        <div className="grid grid-cols-3 gap-2">
          <FL label="T stage"><Pills options={['Tis','T1a','T1b','T2','T3','T4a','T4b']} value={oesT} onChange={setOesT} accent="violet"/></FL>
          <FL label="N stage"><Pills options={['N0','N1','N2','N3']} value={oesN} onChange={setOesN} accent="violet"/></FL>
          <FL label="M stage"><Pills options={['M0','M1']} value={oesM} onChange={setOesM} accent="red"/></FL>
        </div>
      </Section>

      <Section title="Multidisciplinary Management" applicable={sec.treatment} onApplicable={v=>sa('treatment',v)} accent="green">
        <FL label="MDT discussion">
          <Pills options={['MDT discussed — decision documented','Pending MDT','Tumour board referral sent','Not applicable (single-specialty decision)']} value={mdtDiscussed} onChange={setMdtDiscussed} accent="green"/>
        </FL>
        <FL label="Treatment intent">
          <Pills options={['Curative','Neoadjuvant → curative surgery','Adjuvant (post-resection)','Palliative — life-extending','Best supportive care (BSC)','Clinical trial']} value={treatmentIntent} onChange={setTreatmentIntent} accent="green"/>
        </FL>
        <FL label="Treatment plan" sub="multi-select">
          <Pills options={['Surgical resection','Endoscopic resection (EMR/ESD)','Laparoscopic surgery','Neoadjuvant chemotherapy','Neoadjuvant chemoradiation','Adjuvant chemotherapy','Palliative chemotherapy','Targeted therapy (trastuzumab/sorafenib/atezolizumab)','Immunotherapy (pembrolizumab/nivolumab)','TACE (HCC)','Thermal ablation (RFA/MWA)','SIRT (Y-90 radioembolisation)','External beam radiotherapy','Endoscopic palliation (stent/APC)','Colostomy (palliation)']} value={treatmentPlan} onChange={setTreatmentPlan} accent="green" multi/>
        </FL>
        <FL label="Palliative care referral">
          <Pills options={['Not yet required','Referred — symptom management','Integrated palliative care ongoing','Hospice referral']} value={palliativeCare} onChange={setPalliativeCare} accent="gray"/>
        </FL>
        <FL label="Clinical trial eligibility">
          <Pills options={['Not assessed','Assessed — not eligible','Assessed — eligible (trial: __)','Enrolled in trial']} value={clinicalTrial} onChange={setClinicalTrial} accent="gray"/>
        </FL>
        <FL label="Clinical notes"><textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="MDT outcome, staging CT/MRI findings, plan..."/></FL>
        <button type="button" onClick={handleSave} className="w-full py-3 rounded-xl bg-slate-600 text-white font-bold text-sm shadow">Save Assessment</button>
      </Section>
    </div>
  );
}
