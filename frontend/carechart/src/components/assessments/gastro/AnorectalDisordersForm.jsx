/**
 * @shared-pool
 * AnorectalDisordersForm — Haemorrhoids, fissures, fistulas, prolapse, anorectal abscess
 * Parks classification, Goligher grading, St Mark's incontinence score, India context
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */

import React, { useState, useMemo } from 'react';
import { Lock, ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  rose:   { bg:'bg-rose-50',   border:'border-rose-300',   text:'text-rose-700',   pill:'bg-rose-100 border-rose-400 text-rose-800',   active:'bg-rose-600 text-white border-rose-600' },
  red:    { bg:'bg-red-50',    border:'border-red-300',    text:'text-red-700',    pill:'bg-red-100 border-red-400 text-red-800',    active:'bg-red-600 text-white border-red-600' },
  orange: { bg:'bg-orange-50', border:'border-orange-300', text:'text-orange-700', pill:'bg-orange-100 border-orange-400 text-orange-800', active:'bg-orange-500 text-white border-orange-500' },
  amber:  { bg:'bg-amber-50',  border:'border-amber-300',  text:'text-amber-700',  pill:'bg-amber-100 border-amber-400 text-amber-800',  active:'bg-amber-500 text-white border-amber-500' },
  green:  { bg:'bg-green-50',  border:'border-green-300',  text:'text-green-700',  pill:'bg-green-100 border-green-400 text-green-800',  active:'bg-green-600 text-white border-green-600' },
  blue:   { bg:'bg-blue-50',   border:'border-blue-300',   text:'text-blue-700',   pill:'bg-blue-100 border-blue-400 text-blue-800',   active:'bg-blue-600 text-white border-blue-600' },
  violet: { bg:'bg-violet-50', border:'border-violet-300', text:'text-violet-700', pill:'bg-violet-100 border-violet-400 text-violet-800', active:'bg-violet-600 text-white border-violet-600' },
  gray:   { bg:'bg-gray-50',   border:'border-gray-300',   text:'text-gray-700',   pill:'bg-gray-100 border-gray-400 text-gray-800',   active:'bg-gray-600 text-white border-gray-600' },
};

function Pills({options,value,onChange,accent='rose',multi=false}){
  const c=A[accent];const sel=multi?(Array.isArray(value)?value:[]):value;
  const toggle=opt=>{if(multi){const a=Array.isArray(sel)?sel:[];onChange(a.includes(opt)?a.filter(x=>x!==opt):[...a,opt]);}else onChange(sel===opt?'':opt);};
  return(<div className="flex flex-wrap gap-2">{options.map(opt=>{const active=multi?sel.includes(opt):sel===opt;return<button key={opt} type="button" onClick={()=>toggle(opt)} className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${active?c.active:c.pill}`}>{opt}</button>;})}</div>);
}
function FL({label,sub,children}){return(<div className="space-y-1"><label className="block text-sm font-semibold text-gray-700">{label}{sub&&<span className="ml-1 text-xs font-normal text-gray-500">{sub}</span>}</label>{children}</div>);}
function Gate({label,value,onChange,accent='rose',children}){
  const c=A[accent];
  return(<div className={`rounded-lg border ${c.border} ${c.bg} p-3`}><div className="flex items-center justify-between flex-wrap gap-2"><span className="text-sm font-medium text-gray-700">{label}</span><div className="flex gap-2">{['Yes','No'].map(opt=>(<button key={opt} type="button" onClick={()=>onChange(value===opt?'':opt)} className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all ${value===opt?c.active:c.pill}`}>{opt}</button>))}</div></div>{value==='Yes'&&children&&<div className="mt-3 space-y-3">{children}</div>}</div>);
}
function Section({title,applicable,onApplicable,accent='rose',children}){
  const c=A[accent];const[open,setOpen]=useState(true);
  if(applicable==='N/A')return(<div className={`rounded-xl border-2 border-dashed ${c.border} p-4 flex items-center gap-3 opacity-60`}><Lock className="w-5 h-5 text-gray-400"/><span className="text-sm text-gray-500 font-medium">{title} — Not applicable · section locked</span><button type="button" onClick={()=>onApplicable('Applicable')} className="ml-auto text-xs text-blue-600 underline">Unlock</button></div>);
  return(<div className={`rounded-xl border-2 ${c.border} overflow-hidden`}><div className={`${c.bg} px-4 py-3 flex items-center justify-between flex-wrap gap-2`}><span className={`font-bold text-base ${c.text}`}>{title}</span><div className="flex items-center gap-2"><div className="flex gap-1">{['Applicable','N/A'].map(v=>(<button key={v} type="button" onClick={()=>onApplicable(v)} className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold transition-all ${v===applicable?c.active:c.pill}`}>{v}</button>))}</div><button type="button" onClick={()=>setOpen(o=>!o)} className={`${c.text} p-1`}>{open?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</button></div></div>{open&&applicable==='Applicable'&&<div className="p-4 space-y-4">{children}</div>}</div>);
}
function ScoreRow({label,options,value,onChange,accent='rose'}){
  const c=A[accent];
  return(<div className="flex items-start gap-3 flex-wrap"><span className="text-sm text-gray-600 w-44 shrink-0 pt-1">{label}</span><div className="flex flex-wrap gap-1 flex-1">{options.map(([lbl,pts])=>{const active=value===pts;return<button key={lbl} type="button" onClick={()=>onChange(active?null:pts)} className={`px-2.5 py-1 rounded border text-xs font-medium transition-all ${active?c.active:c.pill}`}>{lbl}({pts})</button>;})}</div></div>);
}

export default function AnorectalDisordersForm({patientId,encounterId,onSaved}){
  const[sec,setSec]=useState({presentation:'Applicable',haemorrhoids:'Applicable',fissure:'Applicable',fistula:'Applicable',prolapse:'Applicable',incontinence:'Applicable',treatment:'Applicable'});
  const sa=(k,v)=>setSec(s=>({...s,[k]:v}));

  /* Presentation */
  const[primaryDx,setPrimaryDx]=useState('');
  const[symptoms,setSymptoms]=useState([]);
  const[duration,setDuration]=useState('');
  const[riskFactors,setRiskFactors]=useState([]);
  const[alarmFeatures,setAlarmFeatures]=useState([]);
  const[examinationFindings,setExaminationFindings]=useState([]);

  /* Haemorrhoids */
  const[goligherGrade,setGoligherGrade]=useState('');
  const[haemType,setHaemType]=useState('');
  const[haemSymptoms,setHaemSymptoms]=useState([]);
  const[thrombosed,setThrombosed]=useState('');

  /* Fissure */
  const[fissureType,setFissureType]=useState('');
  const[fissureLocation,setFissureLocation]=useState('');
  const[sphincterTone,setSphincterTone]=useState('');
  const[chronicFeatures,setChronicFeatures]=useState([]);
  const[atypicalFissure,setAtypicalFissure]=useState('');

  /* Fistula */
  const[parksClass,setParksClass]=useState('');
  const[fistulaCause,setFistulaCause]=useState('');
  const[internalOpening,setInternalOpening]=useState('');
  const[externalOpening,setExternalOpening]=useState('');
  const[fistulaMRI,setFistulaMRI]=useState('');
  const[crohnsFistula,setCrohnsFistula]=useState('');

  /* Prolapse */
  const[prolapseType,setProlapseType]=useState('');
  const[prolapseDegree,setProlapseDegree]=useState('');
  const[prolapseReducible,setProlapseReducible]=useState('');

  /* Incontinence */
  const[smScore,setSmScore]=useState({frequency:null,urge:null,flatus:null,lifestyle:null,pad:null,constipation:null,loperamide:null,needToRush:null});
  const[incontinenceType,setIncontinenceType]=useState('');
  const[sphincterIntegrity,setSphincterIntegrity]=useState('');
  const[anorectalManometry,setAnorectalManometry]=useState('');

  /* Treatment */
  const[dietLifestyle,setDietLifestyle]=useState([]);
  const[conservativeTx,setConservativeTx]=useState([]);
  const[procedureTx,setProcedureTx]=useState([]);
  const[surgicalTx,setSurgicalTx]=useState('');
  const[notes,setNotes]=useState('');

  /* St Mark's Incontinence Score */
  const smTotal=useMemo(()=>Object.values(smScore).filter(v=>v!=null).reduce((a,b)=>a+b,0),[smScore]);
  const smInterp=useMemo(()=>{
    if(smTotal===0)return{label:'Perfect continence',color:'green'};
    if(smTotal<=5)return{label:'Minor incontinence',color:'green'};
    if(smTotal<=10)return{label:'Moderate incontinence — consider further evaluation',color:'amber'};
    return{label:'Severe incontinence — surgical assessment',color:'red'};
  },[smTotal]);

  const alarmAlert=alarmFeatures.length>0;

  const handleSave=async()=>{
    try{
      await api.post('/assessments',{type:'anorectal-disorders',patientId,encounterId,data:{primaryDx,symptoms,duration,riskFactors,alarmFeatures,examinationFindings,haemorrhoids:{goligherGrade,type:haemType,symptoms:haemSymptoms,thrombosed},fissure:{type:fissureType,location:fissureLocation,sphincterTone,chronicFeatures,atypicalFissure},fistula:{parksClass,cause:fistulaCause,internalOpening,externalOpening,mri:fistulaMRI,crohnsFistula},prolapse:{type:prolapseType,degree:prolapseDegree,reducible:prolapseReducible},incontinence:{stMarks:{...smScore,total:smTotal,interp:smInterp.label},type:incontinenceType,sphincterIntegrity,anorectalManometry},treatment:{diet:dietLifestyle,conservative:conservativeTx,procedure:procedureTx,surgical:surgicalTx},notes}});
      onSaved?.();
    }catch(e){console.error(e);}
  };

  return(
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-2xl p-5 shadow-lg">
        <h2 className="text-xl font-bold">Anorectal Disorders Assessment</h2>
        <p className="text-rose-100 text-sm mt-1">Goligher (haemorrhoids) · Parks (fistula) · St Mark's incontinence · Prolapse grading</p>
      </div>

      {alarmAlert&&(
        <div className="bg-red-600 text-white rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-6 h-6 shrink-0"/>
          <div><p className="font-bold">Alarm Features — Colonoscopy / sigmoidoscopy required</p><p className="text-sm text-red-100">Do not attribute rectal bleeding to haemorrhoids without excluding colorectal malignancy.</p></div>
        </div>
      )}

      <Section title="Presentation & Examination" applicable={sec.presentation} onApplicable={v=>sa('presentation',v)} accent="rose">
        <FL label="Primary diagnosis">
          <Pills options={['Haemorrhoids (internal)','Haemorrhoids (external)','Haemorrhoids (mixed)','Anal fissure','Anorectal fistula','Anorectal abscess','Rectal prolapse','Mucosal prolapse','Solitary rectal ulcer syndrome (SRUS)','Faecal incontinence','Pruritus ani','Anal stenosis','Condylomata acuminata','Anal carcinoma']} value={primaryDx} onChange={setPrimaryDx} accent="rose"/>
        </FL>
        <FL label="Symptoms" sub="multi-select">
          <Pills options={['Bright red rectal bleeding (BRBPR)','Pain on defaecation','Perianal pain (constant)','Prolapse / lump per rectum','Mucus discharge','Pruritus ani','Faecal soiling','Incomplete evacuation','Swelling / lump','Purulent discharge (fistula/abscess)','Constipation','Straining']} value={symptoms} onChange={setSymptoms} accent="rose" multi/>
        </FL>
        <FL label="Duration">
          <Pills options={['<2 weeks (acute)','2–12 weeks','3–12 months','>1 year (chronic)']} value={duration} onChange={setDuration} accent="rose"/>
        </FL>
        <FL label="Risk factors" sub="multi-select">
          <Pills options={['Chronic constipation / straining','Low-fibre diet','Prolonged sitting (sedentary)','Pregnancy','Obesity','Portal hypertension (anorectal varices)','Crohn\'s disease','Previous anorectal surgery','Immunocompromised','HIV/AIDS']} value={riskFactors} onChange={setRiskFactors} accent="amber" multi/>
        </FL>
        <FL label="Alarm features (require colonoscopy)" sub="multi-select">
          <Pills options={['Age >40 with new rectal bleeding','Mixed blood (dark/clot)','Change in bowel habit','Weight loss','Iron deficiency anaemia','Family history of CRC','Anaemia','Mucus + blood']} value={alarmFeatures} onChange={setAlarmFeatures} accent="red" multi/>
        </FL>
        <FL label="Examination findings" sub="multi-select">
          <Pills options={['Perianal skin tags','External haemorrhoids visible','Thrombosed external haemorrhoid','Prolapsed internal haemorrhoid','Sentinel pile (fissure)','Fissure visible at 6/12 o\'clock','External fistula opening','Multiple fistula openings','Perianal cellulitis / abscess','Rectal mucosal prolapse','Full-thickness rectal prolapse','Normal PR exam']} value={examinationFindings} onChange={setExaminationFindings} accent="rose" multi/>
        </FL>
        <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
          <p className={`font-semibold ${A.amber.text}`}>India context</p>
          <p className="text-gray-600 mt-1">Haemorrhoids extremely common — low-fibre diet, squatting posture increases intra-abdominal pressure. Anorectal fistulas: always exclude TB (fistula-in-ano due to TB is common — send pus for AFB/PCR). Anorectal carcinoma can mimic haemorrhoids. Condylomata (HPV) rising with urban sexual practices. Portal hypertension → anorectal varices (not haemorrhoids — avoid banding).</p>
        </div>
      </Section>

      <Section title="Haemorrhoids" applicable={sec.haemorrhoids} onApplicable={v=>sa('haemorrhoids',v)} accent="rose">
        <FL label="Type">
          <Pills options={['Internal haemorrhoids','External haemorrhoids','Mixed (internal + external)']} value={haemType} onChange={setHaemType} accent="rose"/>
        </FL>
        <FL label="Goligher grading (internal haemorrhoids)">
          <div className="space-y-1">
            {[
              ['Grade I — Bleed but do not prolapse','green'],
              ['Grade II — Prolapse on straining but spontaneously reduce','amber'],
              ['Grade III — Prolapse and require manual reduction','orange'],
              ['Grade IV — Permanently prolapsed, irreducible','red'],
            ].map(([lbl,col])=>(
              <button key={lbl} type="button" onClick={()=>setGoligherGrade(goligherGrade===lbl?'':lbl)} className={`w-full text-left px-3 py-2 rounded-lg border text-sm font-medium transition-all ${goligherGrade===lbl?A[col].active:A[col].pill}`}>{lbl}</button>
            ))}
          </div>
        </FL>
        <FL label="Haemorrhoid symptoms" sub="multi-select">
          <Pills options={['Painless bright red bleeding (dripping after defaecation)','Prolapse','Mucus discharge','Pruritus','Pain (thrombosis)','Iron deficiency anaemia']} value={haemSymptoms} onChange={setHaemSymptoms} accent="rose" multi/>
        </FL>
        <FL label="Thrombosed external haemorrhoid">
          <Pills options={['No','Present — <72h (surgical excision preferred)','Present — >72h (conservative management)']} value={thrombosed} onChange={setThrombosed} accent="red"/>
        </FL>
      </Section>

      <Section title="Anal Fissure" applicable={sec.fissure} onApplicable={v=>sa('fissure',v)} accent="orange">
        <FL label="Type">
          <Pills options={['Acute fissure (<6 weeks)','Chronic fissure (>6 weeks)','Recurrent fissure']} value={fissureType} onChange={setFissureType} accent="orange"/>
        </FL>
        <FL label="Location">
          <Pills options={['Posterior midline (most common ~90%)','Anterior midline (~10% — especially females)','Lateral — atypical (exclude Crohn\'s/TB/HIV/malignancy)','Multiple fissures']} value={fissureLocation} onChange={setFissureLocation} accent="orange"/>
        </FL>
        <FL label="Internal sphincter tone on PR">
          <Pills options={['Normal','Hypertonic / tight (spasm)','Hypotonic (post-obstetric/neurological)']} value={sphincterTone} onChange={setSphincterTone} accent="orange"/>
        </FL>
        <FL label="Chronic fissure features" sub="multi-select">
          <Pills options={['Sentinel pile (skin tag at lower end)','Hypertrophied anal papilla (upper end)','Exposed internal sphincter fibres','Induration / fibrosis','Skin edges rolled']} value={chronicFeatures} onChange={setChronicFeatures} accent="amber" multi/>
        </FL>
        <FL label="Atypical fissure — exclude secondary cause">
          <Pills options={['Not atypical — typical posterior/anterior midline','Lateral — Crohn\'s disease screen','Lateral — TB fistula PCR/AFB sent','Lateral — HIV test offered','Lateral — malignancy biopsy taken']} value={atypicalFissure} onChange={setAtypicalFissure} accent="red"/>
        </FL>
      </Section>

      <Section title="Anorectal Fistula (Parks Classification)" applicable={sec.fistula} onApplicable={v=>sa('fistula',v)} accent="amber">
        <FL label="Parks classification">
          <div className="space-y-1">
            {[
              ['Intersphincteric (most common ~70%) — tract within intersphincteric plane','green'],
              ['Transsphincteric (~25%) — crosses both sphincters (EAS + IAS)','amber'],
              ['Suprasphincteric (rare ~5%) — above puborectalis then down','orange'],
              ['Extrasphincteric (rare <1%) — outside sphincter complex entirely','red'],
              ['Superficial / submucosal (not true Parks — simple low fistula)','green'],
            ].map(([lbl,col])=>(
              <button key={lbl} type="button" onClick={()=>setParksClass(parksClass===lbl?'':lbl)} className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${parksClass===lbl?A[col].active:A[col].pill}`}>{lbl}</button>
            ))}
          </div>
        </FL>
        <FL label="Aetiology">
          <Pills options={['Cryptoglandular (idiopathic — most common)','Crohn\'s disease','Tuberculosis (TB fistula)','Trauma / post-surgical','Malignancy','Actinomycosis','Lymphogranuloma venereum (LGV)']} value={fistulaCause} onChange={setFistulaCause} accent="amber"/>
        </FL>
        {fistulaCause==='Tuberculosis (TB fistula)'&&(
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 font-medium">
            TB fistula: Send pus/biopsy for AFB smear, culture, GeneXpert MTB/RIF. Multiple fistulas, atypical location, indolent course. ATT 6–9 months. Surgery after TB treatment completes.
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FL label="Internal opening location"><input type="text" value={internalOpening} onChange={e=>setInternalOpening(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 6 o'clock dentate line"/></FL>
          <FL label="External opening location"><input type="text" value={externalOpening} onChange={e=>setExternalOpening(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 3 cm from anal verge at 3 o'clock"/></FL>
        </div>
        <FL label="MRI pelvis (gold standard for fistula mapping)">
          <Pills options={['Not done','MRI ordered','Simple intersphincteric confirmed','Complex trans/suprasphincteric','Secondary extensions / horseshoe tract','Abscess cavity identified','Crohn\'s features']} value={fistulaMRI} onChange={setFistulaMRI} accent="blue"/>
        </FL>
        <FL label="Active Crohn's-related fistula?">
          <Pills options={['No','Crohn\'s fistula — non-draining seton in situ','Anti-TNF (infliximab/adalimumab) — on treatment','Combined seton + biologic','Complex Crohn\'s — MDT']} value={crohnsFistula} onChange={setCrohnsFistula} accent="violet"/>
        </FL>
      </Section>

      <Section title="Rectal Prolapse" applicable={sec.prolapse} onApplicable={v=>sa('prolapse',v)} accent="violet">
        <FL label="Prolapse type">
          <Pills options={['Mucosal prolapse only','Full-thickness rectal prolapse','Internal intussusception (occult prolapse)','Solitary rectal ulcer syndrome (SRUS)']} value={prolapseType} onChange={setProlapseType} accent="violet"/>
        </FL>
        <FL label="Degree">
          <Pills options={['Grade I — Intrarectal (occult)','Grade II — At anal verge','Grade III — Beyond anal verge — reducible','Grade IV — Permanent / irreducible']} value={prolapseDegree} onChange={setProlapseDegree} accent="violet"/>
        </FL>
        <FL label="Reducibility">
          <Pills options={['Spontaneously reduces','Manually reducible','Irreducible — urgent review','Strangulated prolapse — emergency']} value={prolapseReducible} onChange={setProlapseReducible} accent="red"/>
        </FL>
        {prolapseReducible==='Strangulated prolapse — emergency'&&(
          <div className="bg-red-600 text-white rounded-xl p-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5"/>
            <p className="text-sm font-bold">Strangulated rectal prolapse — emergency surgical reduction. Manual reduction with hyperosmolar agent (sugar), then Delorme/Altemeier if fails.</p>
          </div>
        )}
      </Section>

      <Section title="Faecal Incontinence (St Mark's Score)" applicable={sec.incontinence} onApplicable={v=>sa('incontinence',v)} accent="blue">
        <p className="text-xs text-gray-500">St Mark's score 0–24. 0 = perfect continence, 24 = total incontinence.</p>
        <div className="space-y-2">
          <ScoreRow label="Incontinence for solid stool" options={[['Never(0)',0],['Rarely(1)',1],['Sometimes(2)',2],['Weekly(3)',3],['Daily(4)',4]]} value={smScore.frequency} onChange={v=>setSmScore(s=>({...s,frequency:v}))} accent="blue"/>
          <ScoreRow label="Incontinence for liquid stool" options={[['Never(0)',0],['Rarely(1)',1],['Sometimes(2)',2],['Weekly(3)',3],['Daily(4)',4]]} value={smScore.urge} onChange={v=>setSmScore(s=>({...s,urge:v}))} accent="blue"/>
          <ScoreRow label="Incontinence for flatus" options={[['Never(0)',0],['Rarely(1)',1],['Sometimes(2)',2],['Weekly(3)',3],['Daily(4)',4]]} value={smScore.flatus} onChange={v=>setSmScore(s=>({...s,flatus:v}))} accent="blue"/>
          <ScoreRow label="Alteration in lifestyle" options={[['No(0)',0],['Yes(4)',4]]} value={smScore.lifestyle} onChange={v=>setSmScore(s=>({...s,lifestyle:v}))} accent="blue"/>
          <ScoreRow label="Need to wear pad or plug" options={[['No(0)',0],['Yes(2)',2]]} value={smScore.pad} onChange={v=>setSmScore(s=>({...s,pad:v}))} accent="blue"/>
          <ScoreRow label="Taking constipating medicines" options={[['No(0)',0],['Yes(2)',2]]} value={smScore.constipation} onChange={v=>setSmScore(s=>({...s,constipation:v}))} accent="blue"/>
          <ScoreRow label="Lack of ability to defer defaecation ≥15 min" options={[['No(0)',0],['Yes(4)',4]]} value={smScore.loperamide} onChange={v=>setSmScore(s=>({...s,loperamide:v}))} accent="blue"/>
        </div>
        {smTotal>0&&(
          <div className={`rounded-xl border-2 ${A[smInterp.color]?.border} ${A[smInterp.color]?.bg} p-4 mt-2`}>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-black ${A[smInterp.color]?.text}`}>St Mark's: {smTotal}/24</span>
              <span className={`text-sm font-semibold ${A[smInterp.color]?.text}`}>{smInterp.label}</span>
            </div>
          </div>
        )}
        <FL label="Incontinence type">
          <Pills options={['Passive incontinence (IAS dysfunction — leakage without urge)','Urge incontinence (EAS dysfunction — cannot defer)','Mixed','Post-defaecation seepage']} value={incontinenceType} onChange={setIncontinenceType} accent="blue"/>
        </FL>
        <FL label="Sphincter integrity (USS / MRI)">
          <Pills options={['Not assessed','Intact sphincter — functional cause','Anterior sphincter defect (obstetric)','Posterior defect (trauma/surgical)','Bilateral defects','Complete disruption']} value={sphincterIntegrity} onChange={setSphincterIntegrity} accent="blue"/>
        </FL>
      </Section>

      <Section title="Treatment" applicable={sec.treatment} onApplicable={v=>sa('treatment',v)} accent="green">
        <FL label="Diet & lifestyle" sub="multi-select">
          <Pills options={['High-fibre diet (25–35g/day)','Adequate fluid intake (2L/day)','Avoid straining — stool softeners','Sitz baths (warm water soaks 10–15 min TDS)','Avoid prolonged sitting on toilet','Weight reduction','Pelvic floor exercises']} value={dietLifestyle} onChange={setDietLifestyle} accent="green" multi/>
        </FL>
        <FL label="Conservative treatment" sub="multi-select">
          <Pills options={['Topical GTN 0.2% bd (fissure — IAS relaxation)','Topical diltiazem 2% bd (fissure — fewer headaches than GTN)','Botulinum toxin injection (refractory fissure)','Topical anaesthetic (lidocaine)','Bulk-forming laxatives (ispaghula/methylcellulose)','Stool softeners (lactulose)','Loperamide titrated (incontinence)','Biofeedback (incontinence)','Antifungal (pruritus ani — candida)','Topical corticosteroid short-term']} value={conservativeTx} onChange={setConservativeTx} accent="green" multi/>
        </FL>
        <FL label="Office / outpatient procedures" sub="multi-select">
          <Pills options={['Rubber band ligation (RBL) — Gr I–III haemorrhoids','Sclerotherapy — 5% phenol in almond oil','Infrared coagulation (IRC)','Incision & drainage — anorectal abscess','Excision thrombosed external haemorrhoid','Seton placement (fistula — cutting or non-cutting)','Anal dilatation (stricture — careful)']} value={procedureTx} onChange={setProcedureTx} accent="amber" multi/>
        </FL>
        <FL label="Surgical options">
          <Pills options={['Haemorrhoidectomy (Milligan-Morgan open / Ferguson closed)','MIPH — stapled haemorrhoidopexy (PPH)','HALO — haemorrhoidal artery ligation','Lateral internal sphincterotomy (LIS — chronic fissure)','Fistulotomy (simple low fistula)','Advancement flap (complex fistula)','LIFT procedure (ligation of intersphincteric fistula tract)','Delorme\'s procedure (rectal prolapse)','Altemeier\'s (perineal rectosigmoidectomy)','Abdominal rectopexy (laparoscopic)','Sphincter repair (sphincteroplasty)','Sacral nerve stimulation (incontinence)','Graciloplasty / artificial bowel sphincter']} value={surgicalTx} onChange={setSurgicalTx} accent="violet"/>
        </FL>
        <FL label="Clinical notes"><textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Examination findings, investigation results, surgical plan..."/></FL>
        <button type="button" onClick={handleSave} className="w-full py-3 rounded-xl bg-rose-600 text-white font-bold text-sm shadow">Save Assessment</button>
      </Section>
    </div>
  );
}
