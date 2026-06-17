/**
 * @shared-pool
 * FunctionalGIDisorderForm — IBS, functional dyspepsia, constipation, celiac disease
 * Rome IV criteria, IBS-SSS, Bristol Stool Scale, Marsh classification
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */

import React, { useState, useMemo } from 'react';
import { Lock, ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  green:  { bg:'bg-green-50',  border:'border-green-300',  text:'text-green-700',  pill:'bg-green-100 border-green-400 text-green-800',  active:'bg-green-600 text-white border-green-600' },
  emerald:{ bg:'bg-emerald-50',border:'border-emerald-300',text:'text-emerald-700',pill:'bg-emerald-100 border-emerald-400 text-emerald-800',active:'bg-emerald-600 text-white border-emerald-600' },
  teal:   { bg:'bg-teal-50',   border:'border-teal-300',   text:'text-teal-700',   pill:'bg-teal-100 border-teal-400 text-teal-800',   active:'bg-teal-600 text-white border-teal-600' },
  amber:  { bg:'bg-amber-50',  border:'border-amber-300',  text:'text-amber-700',  pill:'bg-amber-100 border-amber-400 text-amber-800',  active:'bg-amber-500 text-white border-amber-500' },
  orange: { bg:'bg-orange-50', border:'border-orange-300', text:'text-orange-700', pill:'bg-orange-100 border-orange-400 text-orange-800', active:'bg-orange-500 text-white border-orange-500' },
  blue:   { bg:'bg-blue-50',   border:'border-blue-300',   text:'text-blue-700',   pill:'bg-blue-100 border-blue-400 text-blue-800',   active:'bg-blue-600 text-white border-blue-600' },
  violet: { bg:'bg-violet-50', border:'border-violet-300', text:'text-violet-700', pill:'bg-violet-100 border-violet-400 text-violet-800', active:'bg-violet-600 text-white border-violet-600' },
  red:    { bg:'bg-red-50',    border:'border-red-300',    text:'text-red-700',    pill:'bg-red-100 border-red-400 text-red-800',    active:'bg-red-600 text-white border-red-600' },
};

function Pills({options,value,onChange,accent='green',multi=false}){
  const c=A[accent];const sel=multi?(Array.isArray(value)?value:[]):value;
  const toggle=opt=>{if(multi){const a=Array.isArray(sel)?sel:[];onChange(a.includes(opt)?a.filter(x=>x!==opt):[...a,opt]);}else onChange(sel===opt?'':opt);};
  return(<div className="flex flex-wrap gap-2">{options.map(opt=>{const active=multi?sel.includes(opt):sel===opt;return<button key={opt} type="button" onClick={()=>toggle(opt)} className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${active?c.active:c.pill}`}>{opt}</button>;})}</div>);
}
function FL({label,sub,children}){return(<div className="space-y-1"><label className="block text-sm font-semibold text-gray-700">{label}{sub&&<span className="ml-1 text-xs font-normal text-gray-500">{sub}</span>}</label>{children}</div>);}
function Gate({label,value,onChange,accent='green',children}){
  const c=A[accent];
  return(<div className={`rounded-lg border ${c.border} ${c.bg} p-3`}><div className="flex items-center justify-between flex-wrap gap-2"><span className="text-sm font-medium text-gray-700">{label}</span><div className="flex gap-2">{['Yes','No'].map(opt=>(<button key={opt} type="button" onClick={()=>onChange(value===opt?'':opt)} className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all ${value===opt?c.active:c.pill}`}>{opt}</button>))}</div></div>{value==='Yes'&&children&&<div className="mt-3 space-y-3">{children}</div>}</div>);
}
function Section({title,applicable,onApplicable,accent='green',children}){
  const c=A[accent];const[open,setOpen]=useState(true);
  if(applicable==='N/A')return(<div className={`rounded-xl border-2 border-dashed ${c.border} p-4 flex items-center gap-3 opacity-60`}><Lock className="w-5 h-5 text-gray-400"/><span className="text-sm text-gray-500 font-medium">{title} — Not applicable · section locked</span><button type="button" onClick={()=>onApplicable('Applicable')} className="ml-auto text-xs text-blue-600 underline">Unlock</button></div>);
  return(<div className={`rounded-xl border-2 ${c.border} overflow-hidden`}><div className={`${c.bg} px-4 py-3 flex items-center justify-between flex-wrap gap-2`}><span className={`font-bold text-base ${c.text}`}>{title}</span><div className="flex items-center gap-2"><div className="flex gap-1">{['Applicable','N/A'].map(v=>(<button key={v} type="button" onClick={()=>onApplicable(v)} className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold transition-all ${v===applicable?c.active:c.pill}`}>{v}</button>))}</div><button type="button" onClick={()=>setOpen(o=>!o)} className={`${c.text} p-1`}>{open?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</button></div></div>{open&&applicable==='Applicable'&&<div className="p-4 space-y-4">{children}</div>}</div>);
}

const IBS_SSS_ITEMS=[
  {key:'abdominalPain',label:'Abdominal pain / discomfort severity',max:100,description:'0 = no pain, 100 = very severe pain'},
  {key:'abdominalPainDays',label:'Number of days with abdominal pain in last 10 days',max:100,description:'0 days = 0, 10 days = 100'},
  {key:'distension',label:'Abdominal distension severity',max:100,description:'0 = none, 100 = very severe'},
  {key:'bowelSatisfaction',label:'Dissatisfaction with bowel habit',max:100,description:'0 = perfectly satisfied, 100 = extremely dissatisfied'},
  {key:'lifeInterference',label:'Interference with life in general',max:100,description:'0 = none at all, 100 = extremely'},
];

export default function FunctionalGIDisorderForm({patientId,encounterId,onSaved}){
  const[sec,setSec]=useState({diagnosis:'Applicable',ibs:'Applicable',constipation:'Applicable',celiac:'Applicable',sibo:'Applicable',treatment:'Applicable'});
  const sa=(k,v)=>setSec(s=>({...s,[k]:v}));

  /* Diagnosis */
  const[primaryDx,setPrimaryDx]=useState('');
  const[alarmFeatures,setAlarmFeatures]=useState([]);
  const[exclusionsDone,setExclusionsDone]=useState([]);

  /* IBS */
  const[ibsSubtype,setIbsSubtype]=useState('');
  const[romeIVMet,setRomeIVMet]=useState('');
  const[bowelFrequency,setBowelFrequency]=useState('');
  const[bristolType,setBristolType]=useState('');
  const[ibsSSS,setIbsSSS]=useState({abdominalPain:0,abdominalPainDays:0,distension:0,bowelSatisfaction:0,lifeInterference:0});
  const[ibsTriggers,setIbsTriggers]=useState([]);
  const[ibsOverlap,setIbsOverlap]=useState([]);

  /* Constipation */
  const[constipationType,setConstipationType]=useState('');
  const[romeCriteria,setRomeCriteria]=useState([]);
  const[anorectalTest,setAnorectalTest]=useState('');
  const[defaecationDysfunction,setDefaecationDysfunction]=useState('');

  /* Celiac */
  const[celiacSerologyTTG,setCeliacSerologyTTG]=useState('');
  const[celiacEMA,setCeliacEMA]=useState('');
  const[celiacBiopsy,setCeliacBiopsy]=useState('');
  const[marshGrade,setMarshGrade]=useState('');
  const[glutenFree,setGlutenFree]=useState('');

  /* SIBO */
  const[siboBreathTest,setSiboBreathTest]=useState('');
  const[siboTreatment,setSiboTreatment]=useState('');

  /* Treatment */
  const[dietAdvice,setDietAdvice]=useState([]);
  const[medications,setMedications]=useState([]);
  const[psychotherapy,setPsychotherapy]=useState('');
  const[probiotics,setProbiotics]=useState('');
  const[notes,setNotes]=useState('');

  /* IBS-SSS */
  const ibsSSSTotal=useMemo(()=>Object.values(ibsSSS).reduce((a,b)=>a+(b||0),0),[ibsSSS]);
  const ibsSSSInterp=useMemo(()=>{
    if(ibsSSSTotal<75)return{label:'In remission / mild',color:'green'};
    if(ibsSSSTotal<175)return{label:'Mild IBS',color:'green'};
    if(ibsSSSTotal<300)return{label:'Moderate IBS',color:'amber'};
    return{label:'Severe IBS',color:'red'};
  },[ibsSSSTotal]);

  const handleSave=async()=>{
    try{
      await api.post('/assessments',{type:'functional-gi',patientId,encounterId,data:{primaryDx,alarmFeatures,exclusionsDone,ibs:{subtype:ibsSubtype,romeIVMet,bowelFrequency,bristolType,sss:{...ibsSSS,total:ibsSSSTotal,interp:ibsSSSInterp.label},triggers:ibsTriggers,overlap:ibsOverlap},constipation:{type:constipationType,romeCriteria,anorectalTest,defaecationDysfunction},celiac:{ttg:celiacSerologyTTG,ema:celiacEMA,biopsy:celiacBiopsy,marsh:marshGrade,glutenFree},sibo:{breathTest:siboBreathTest,treatment:siboTreatment},treatment:{diet:dietAdvice,medications,psychotherapy,probiotics},notes}});
      onSaved?.();
    }catch(e){console.error(e);}
  };

  return(
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl p-5 shadow-lg">
        <h2 className="text-xl font-bold">Functional GI Disorders Assessment</h2>
        <p className="text-green-100 text-sm mt-1">IBS (Rome IV) · IBS-SSS · Constipation · Celiac (Marsh) · SIBO</p>
      </div>

      <Section title="Diagnosis & Exclusions" applicable={sec.diagnosis} onApplicable={v=>sa('diagnosis',v)} accent="green">
        <FL label="Primary diagnosis">
          <Pills options={['Irritable Bowel Syndrome (IBS)','Functional constipation','Functional diarrhoea','Functional bloating / distension','Celiac disease','Small intestinal bacterial overgrowth (SIBO)','Lactose intolerance','Fructose malabsorption','Functional dyspepsia (overlap)','Centrally mediated abdominal pain (CAPS)']} value={primaryDx} onChange={setPrimaryDx} accent="green"/>
        </FL>
        <FL label="Alarm features (must exclude before functional diagnosis)" sub="multi-select">
          <Pills options={['Rectal bleeding','Weight loss >5%','Iron deficiency anaemia','Nocturnal symptoms','Family history of CRC / IBD / celiac','Age >50 with new symptoms','Fever','Palpable mass']} value={alarmFeatures} onChange={setAlarmFeatures} accent="red" multi/>
        </FL>
        {alarmFeatures.length>0&&<div className="bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-700 font-medium">Alarm features present — functional diagnosis must not be made without structural exclusion (colonoscopy, imaging, bloods).</div>}
        <FL label="Structural / organic causes excluded" sub="multi-select">
          <Pills options={['Colonoscopy — normal','Bloods — CRP/FBC/LFTs/TFTs normal','Celiac serology negative','Stool culture / C. diff — negative','Faecal calprotectin <50 µg/g','Thyroid function normal','Coeliac excluded (biopsy)','IBD excluded']} value={exclusionsDone} onChange={setExclusionsDone} accent="green" multi/>
        </FL>
        <div className={`p-3 rounded-lg text-sm ${A.green.bg} ${A.green.border} border`}>
          <p className={`font-semibold ${A.green.text}`}>India context</p>
          <p className="text-gray-600 mt-1">Post-infectious IBS very common after enteric fever, gastroenteritis, or traveller's diarrhoea. Celiac disease rising — particularly in North India (wheat-eating belt). Lactose intolerance common in South Asia (~70%). SIBO under-diagnosed; breath test not widely available — empirical treatment with rifaximin.</p>
        </div>
      </Section>

      <Section title="IBS Assessment (Rome IV)" applicable={sec.ibs} onApplicable={v=>sa('ibs',v)} accent="emerald">
        <FL label="IBS-Rome IV criteria met?">
          <div className="space-y-1">
            {[
              'Yes — recurrent abdominal pain ≥1 day/week over last 3 months (onset ≥6 months), associated with ≥2 of: (1) defaecation, (2) change in stool frequency, (3) change in stool form/appearance',
              'Partial criteria — awaiting further assessment',
              'No — alternative diagnosis',
            ].map(lbl=>(
              <button key={lbl} type="button" onClick={()=>setRomeIVMet(romeIVMet===lbl?'':lbl)} className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${romeIVMet===lbl?A.emerald.active:A.emerald.pill}`}>{lbl}</button>
            ))}
          </div>
        </FL>
        <FL label="IBS subtype (based on predominant stool form)">
          <Pills options={['IBS-C — Constipation predominant (BSF type 1–2 >25%)','IBS-D — Diarrhoea predominant (BSF type 6–7 >25%)','IBS-M — Mixed bowel habit','IBS-U — Unclassified']} value={ibsSubtype} onChange={setIbsSubtype} accent="emerald"/>
        </FL>
        <FL label="Bristol Stool Form Scale">
          <div className="space-y-1">
            {[
              ['Type 1 — Separate hard lumps (constipated)','amber'],
              ['Type 2 — Sausage-shaped but lumpy','amber'],
              ['Type 3 — Sausage with cracks on surface (ideal)','green'],
              ['Type 4 — Smooth sausage or snake (ideal)','green'],
              ['Type 5 — Soft blobs with clear-cut edges','orange'],
              ['Type 6 — Fluffy pieces with ragged edges, mushy','orange'],
              ['Type 7 — Watery, no solid pieces (diarrhoea)','red'],
            ].map(([lbl,col])=>(
              <button key={lbl} type="button" onClick={()=>setBristolType(bristolType===lbl?'':lbl)} className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${bristolType===lbl?A[col].active:A[col].pill}`}>{lbl}</button>
            ))}
          </div>
        </FL>
        <FL label="IBS Symptom Severity Score (IBS-SSS)">
          <div className="space-y-3">
            {IBS_SSS_ITEMS.map(({key,label,max,description})=>(
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <span className="text-sm font-bold text-emerald-700">{ibsSSS[key]}</span>
                </div>
                <p className="text-xs text-gray-400">{description}</p>
                <input type="range" min={0} max={max} step={5} value={ibsSSS[key]} onChange={e=>setIbsSSS(s=>({...s,[key]:parseInt(e.target.value)}))} className="w-full accent-emerald-600"/>
              </div>
            ))}
          </div>
          <div className={`rounded-xl border-2 ${A[ibsSSSInterp.color]?.border} ${A[ibsSSSInterp.color]?.bg} p-3 mt-2`}>
            <div className="flex items-center justify-between">
              <span className={`text-xl font-black ${A[ibsSSSInterp.color]?.text}`}>IBS-SSS: {ibsSSSTotal}/500</span>
              <span className={`text-sm font-semibold ${A[ibsSSSInterp.color]?.text}`}>{ibsSSSInterp.label}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Remission &lt;75 | Mild 75–175 | Moderate 175–300 | Severe &gt;300</p>
          </div>
        </FL>
        <FL label="Triggers identified" sub="multi-select">
          <Pills options={['High-FODMAP foods','Wheat / gluten','Dairy / lactose','Stress / anxiety','Irregular meals','Spicy food','Caffeine','Alcohol','Antibiotics / medications']} value={ibsTriggers} onChange={setIbsTriggers} accent="emerald" multi/>
        </FL>
        <FL label="Overlap conditions" sub="multi-select">
          <Pills options={['Fibromyalgia','Chronic fatigue syndrome','Anxiety disorder','Depression','GERD / functional dyspepsia','Migraine','Endometriosis','Interstitial cystitis']} value={ibsOverlap} onChange={setIbsOverlap} accent="violet" multi/>
        </FL>
      </Section>

      <Section title="Functional Constipation / Defaecatory Disorders" applicable={sec.constipation} onApplicable={v=>sa('constipation',v)} accent="amber">
        <FL label="Constipation type">
          <Pills options={['Normal transit constipation (most common)','Slow transit constipation','Defaecatory disorder (dyssynergia/outlet obstruction)','Pelvic floor dysfunction']} value={constipationType} onChange={setConstipationType} accent="amber"/>
        </FL>
        <FL label="Rome IV criteria (functional constipation)" sub="multi-select — ≥2 in past 3 months">
          <Pills options={['Straining ≥25% of defaecations','Lumpy/hard stools ≥25%','Sensation of incomplete evacuation ≥25%','Sensation of anorectal blockage/obstruction ≥25%','Manual manoeuvres to facilitate ≥25%','<3 spontaneous complete bowel movements/week']} value={romeCriteria} onChange={setRomeCriteria} accent="amber" multi/>
        </FL>
        <FL label="Anorectal physiology tests">
          <Pills options={['Not done','Anorectal manometry — normal','Anorectal manometry — dyssynergia confirmed','Balloon expulsion test — failed (>120s)','Defaecating proctogram — ordered','Colonic transit study (Sitz markers) — ordered']} value={anorectalTest} onChange={setAnorectalTest} accent="amber"/>
        </FL>
      </Section>

      <Section title="Celiac Disease" applicable={sec.celiac} onApplicable={v=>sa('celiac',v)} accent="teal">
        <div className="grid grid-cols-2 gap-3">
          <FL label="Anti-tTG IgA">
            <Pills options={['Positive (>10× ULN)','Positive (1–10× ULN)','Negative','Not tested']} value={celiacSerologyTTG} onChange={setCeliacSerologyTTG} accent="teal"/>
          </FL>
          <FL label="Anti-EMA IgA">
            <Pills options={['Positive','Negative','Not tested']} value={celiacEMA} onChange={setCeliacEMA} accent="teal"/>
          </FL>
        </div>
        <FL label="Duodenal biopsy (D2/D3)">
          <Pills options={['Not done','Normal villi','Marsh 1 — Increased IEL only (≥25/100 enterocytes)','Marsh 2 — Crypt hyperplasia + increased IEL','Marsh 3a — Partial villous atrophy','Marsh 3b — Subtotal villous atrophy','Marsh 3c — Total villous atrophy']} value={celiacBiopsy} onChange={setCeliacBiopsy} accent="teal"/>
        </FL>
        {(celiacBiopsy.includes('Marsh 3')||celiacSerologyTTG.includes('Positive'))&&(
          <FL label="Gluten-free diet (GFD)">
            <Pills options={['Not yet started','Started — symptomatic improvement','Good adherence — serologies normalising','Poor adherence — ongoing symptoms','Non-responsive — refractory celiac (RCD) — refer']} value={glutenFree} onChange={setGlutenFree} accent="teal"/>
          </FL>
        )}
      </Section>

      <Section title="Treatment" applicable={sec.treatment} onApplicable={v=>sa('treatment',v)} accent="green">
        <FL label="Dietary advice" sub="multi-select">
          <Pills options={['Low-FODMAP diet (IBS — 6-week trial then reintroduce)','Gluten-free diet (celiac confirmed)','Lactose restriction (trial)','High-fibre diet (constipation)','Soluble fibre supplementation (psyllium)','Regular meals — avoid skipping','Adequate fluid intake (2L/day)','Avoid caffeine and carbonated drinks']} value={dietAdvice} onChange={setDietAdvice} accent="green" multi/>
        </FL>
        <FL label="Medications" sub="multi-select">
          <Pills options={['Antispasmodics (mebeverine/hyoscine/dicyclomine)','Loperamide (IBS-D — PRN)','Tricyclic antidepressant low-dose (amitriptyline 10–25mg nocte)','SSRI (duloxetine — IBS with anxiety)','Rifaximin 550mg TDS × 14 days (IBS-D / SIBO)','Laxatives — osmotic (lactulose/PEG)','Laxatives — stimulant (bisacodyl/senna)','Linaclotide (IBS-C)','Prucalopride (slow transit constipation)','Butyrate supplementation','Antidepressant (co-morbid depression)']} value={medications} onChange={setMedications} accent="green" multi/>
        </FL>
        <FL label="Psychotherapy / gut-directed hypnotherapy">
          <Pills options={['Not required','CBT referral (cognitive-behavioural therapy)','Gut-directed hypnotherapy','Mindfulness-based stress reduction (MBSR)','Relaxation techniques','Psychiatric referral (refractory)']} value={psychotherapy} onChange={setPsychotherapy} accent="violet"/>
        </FL>
        <FL label="Probiotics">
          <Pills options={['Not recommended (insufficient evidence for specific strain)','Lactobacillus rhamnosus GG (IBS-D)','VSL#3 (high-concentration multi-strain)','Bifidobacterium infantis','Saccharomyces boulardii (SIBO/antibiotic-associated)','Not started — awaiting evidence discussion']} value={probiotics} onChange={setProbiotics} accent="teal"/>
        </FL>
        <FL label="Clinical notes"><textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Symptom response, dietary diary review, follow-up plan..."/></FL>
        <button type="button" onClick={handleSave} className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm shadow">Save Assessment</button>
      </Section>
    </div>
  );
}
