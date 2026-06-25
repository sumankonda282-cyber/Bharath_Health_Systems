/**
 * @shared-pool
 * PepticUlcerGERDForm — Peptic ulcer disease & GERD assessment
 * GERD-Q questionnaire, LA classification, H. pylori, dyspepsia, alarm features
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */

import React, { useState, useMemo } from 'react';
import { Lock, ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  teal:   { bg:'bg-teal-50',   border:'border-teal-300',   text:'text-teal-700',   pill:'bg-teal-100 border-teal-400 text-teal-800',   active:'bg-teal-600 text-white border-teal-600' },
  cyan:   { bg:'bg-cyan-50',   border:'border-cyan-300',   text:'text-cyan-700',   pill:'bg-cyan-100 border-cyan-400 text-cyan-800',   active:'bg-cyan-600 text-white border-cyan-600' },
  red:    { bg:'bg-red-50',    border:'border-red-300',    text:'text-red-700',    pill:'bg-red-100 border-red-400 text-red-800',    active:'bg-red-600 text-white border-red-600' },
  orange: { bg:'bg-orange-50', border:'border-orange-300', text:'text-orange-700', pill:'bg-orange-100 border-orange-400 text-orange-800', active:'bg-orange-500 text-white border-orange-500' },
  amber:  { bg:'bg-amber-50',  border:'border-amber-300',  text:'text-amber-700',  pill:'bg-amber-100 border-amber-400 text-amber-800',  active:'bg-amber-500 text-white border-amber-500' },
  green:  { bg:'bg-green-50',  border:'border-green-300',  text:'text-green-700',  pill:'bg-green-100 border-green-400 text-green-800',  active:'bg-green-600 text-white border-green-600' },
  blue:   { bg:'bg-blue-50',   border:'border-blue-300',   text:'text-blue-700',   pill:'bg-blue-100 border-blue-400 text-blue-800',   active:'bg-blue-600 text-white border-blue-600' },
  gray:   { bg:'bg-gray-50',   border:'border-gray-300',   text:'text-gray-700',   pill:'bg-gray-100 border-gray-400 text-gray-800',   active:'bg-gray-600 text-white border-gray-600' },
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

const GERD_Q_QUESTIONS=[
  {q:'How often did you have a burning feeling behind your breastbone (heartburn)?',key:'heartburn'},
  {q:'How often did you have stomach contents (liquid or food) moving upwards to your throat or mouth (regurgitation)?',key:'regurgitation'},
  {q:'How often did you have pain in the centre of the upper stomach?',key:'epigastricPain'},
  {q:'How often did you have nausea?',key:'nausea'},
  {q:'How often did you have difficulty getting a good night\'s sleep because of your heartburn and/or regurgitation?',key:'sleepDisturbance'},
  {q:'How often did you take additional medication for your heartburn and/or regurgitation, other than what the physician told you to take?',key:'additionalMeds'},
];
const GERD_Q_OPTS_POS=[['0 days',0],['1 day',1],['2–3 days',2],['4–7 days',3]];
const GERD_Q_OPTS_NEG=[['0 days',3],['1 day',2],['2–3 days',1],['4–7 days',0]];

export default function PepticUlcerGERDForm({patientId,encounterId,onSaved}){
  const[sec,setSec]=useState({alarm:'Applicable',gerd:'Applicable',pud:'Applicable',hpylori:'Applicable',dyspepsia:'Applicable',treatment:'Applicable'});
  const sa=(k,v)=>setSec(s=>({...s,[k]:v}));

  /* Alarm features */
  const[alarmFeatures,setAlarmFeatures]=useState([]);
  const[primaryDiagnosis,setPrimaryDiagnosis]=useState('');
  const[symptomDuration,setSymptomDuration]=useState('');

  /* GERD */
  const[gerdScores,setGerdScores]=useState({heartburn:null,regurgitation:null,epigastricPain:null,nausea:null,sleepDisturbance:null,additionalMeds:null});
  const[laClassification,setLaClassification]=useState('');
  const[barrettsSuspected,setBarrettsSuspected]=useState('');
  const[complicationsGerd,setComplicationsGerd]=useState([]);

  /* PUD */
  const[ulcerLocation,setUlcerLocation]=useState('');
  const[ulcerSize,setUlcerSize]=useState('');
  const[forrestClassPUD,setForrestClassPUD]=useState('');
  const[perforationSuspected,setPerforationSuspected]=useState('');
  const[pyloric,setPyloric]=useState('');

  /* H. pylori */
  const[hpTest,setHpTest]=useState('');
  const[hpResult,setHpResult]=useState('');
  const[hpEradication,setHpEradication]=useState('');
  const[eradicationRegimen,setEradicationRegimen]=useState('');
  const[testOfCure,setTestOfCure]=useState('');

  /* Dyspepsia */
  const[dyspepsiaType,setDyspepsiaType]=useState('');
  const[romeIVDyspepsia,setRomeIVDyspepsia]=useState([]);

  /* Treatment */
  const[ppiRegimen,setPpiRegimen]=useState('');
  const[nsaidManagement,setNsaidManagement]=useState('');
  const[antacids,setAntacids]=useState('');
  const[lifestyleAdvice,setLifestyleAdvice]=useState([]);
  const[endoscopyPlan,setEndoscopyPlan]=useState('');
  const[notes,setNotes]=useState('');

  /* GERD-Q score */
  const gerdQScore=useMemo(()=>{
    const{heartburn,regurgitation,epigastricPain,nausea,sleepDisturbance,additionalMeds}=gerdScores;
    const vals=[heartburn,regurgitation,sleepDisturbance,additionalMeds,epigastricPain,nausea];
    if(vals.some(v=>v==null))return null;
    return vals.reduce((a,b)=>a+b,0);
  },[gerdScores]);
  const gerdQInterp=useMemo(()=>{
    if(gerdQScore==null)return null;
    if(gerdQScore<=7)return{label:'Low likelihood of GERD — further investigation if symptoms persist',color:'green'};
    if(gerdQScore<=10)return{label:'Likely GERD — trial of PPI therapy',color:'amber'};
    return{label:'High likelihood of GERD — PPI therapy + consider endoscopy',color:'orange'};
  },[gerdQScore]);

  const hasAlarmFeature=alarmFeatures.length>0;

  const handleSave=async()=>{
    try{
      await api.post('/assessments',{type:'peptic-ulcer-gerd',patientId,encounterId,data:{alarmFeatures,primaryDiagnosis,symptomDuration,gerd:{scores:gerdScores,gerdQScore,gerdQInterp:gerdQInterp?.label,laClassification,barrettsSuspected,complications:complicationsGerd},pud:{ulcerLocation,ulcerSize,forrestClass:forrestClassPUD,perforationSuspected,pyloric},hpylori:{test:hpTest,result:hpResult,eradication:hpEradication,regimen:eradicationRegimen,testOfCure},dyspepsia:{type:dyspepsiaType,romeIV:romeIVDyspepsia},treatment:{ppiRegimen,nsaidManagement,antacids,lifestyleAdvice,endoscopyPlan},notes}});
      onSaved?.();
    }catch(e){console.error(e);}
  };

  return(
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-2xl p-5 shadow-lg">
        <h2 className="text-xl font-bold">Peptic Ulcer Disease & GERD Assessment</h2>
        <p className="text-teal-100 text-sm mt-1">GERD-Q Score · LA Classification · H. pylori eradication · Alarm features</p>
      </div>

      {hasAlarmFeature&&(
        <div className="bg-red-600 text-white rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-6 h-6 shrink-0"/>
          <div><p className="font-bold">Alarm Features Present — Urgent endoscopy required</p><p className="text-sm text-red-100">Do not empirically treat without upper GI endoscopy. Malignancy must be excluded.</p></div>
        </div>
      )}

      <Section title="Alarm Features & Diagnosis" applicable={sec.alarm} onApplicable={v=>sa('alarm',v)} accent="red">
        <FL label="Alarm / red flag features" sub="multi-select — any = urgent endoscopy">
          <Pills options={['Dysphagia / odynophagia','Unintentional weight loss >5%','Progressive dysphagia','Anaemia (iron deficiency)','Haematemesis / melaena','Palpable abdominal mass','Persistent vomiting','Lymphadenopathy','Age >55 with new-onset dyspepsia','Family history of GI malignancy']} value={alarmFeatures} onChange={setAlarmFeatures} accent="red" multi/>
        </FL>
        <FL label="Primary diagnosis">
          <Pills options={['GERD / reflux oesophagitis','Peptic ulcer disease (PUD)','Functional dyspepsia','H. pylori gastritis','NSAID gastropathy','Acute gastritis','Barrett\'s oesophagus','Not yet established — investigations pending']} value={primaryDiagnosis} onChange={setPrimaryDiagnosis} accent="teal"/>
        </FL>
        <FL label="Symptom duration">
          <Pills options={['<4 weeks','4–12 weeks','3–12 months','>1 year','Chronic (>1 year) with recent worsening']} value={symptomDuration} onChange={setSymptomDuration} accent="teal"/>
        </FL>
        <div className={`p-3 rounded-lg text-sm ${A.teal.bg} ${A.teal.border} border`}>
          <p className={`font-semibold ${A.teal.text}`}>India context</p>
          <p className="text-gray-600 mt-1">H. pylori seroprevalence ~74% in adults (higher in rural). Over-the-counter PPI and antacid use is widespread — delays diagnosis. NSAID gastropathy very common (OTC ibuprofen/diclofenac). Spicy diet and irregular meals are common precipitants. Gastric cancer incidence higher in northeastern India.</p>
        </div>
      </Section>

      <Section title="GERD Assessment (GERD-Q Questionnaire)" applicable={sec.gerd} onApplicable={v=>sa('gerd',v)} accent="teal">
        <p className="text-xs text-gray-500">Frequency of symptoms in the past week. Score ≥8 suggests GERD (sensitivity 65%, specificity 71%).</p>
        <div className="space-y-3">
          {GERD_Q_QUESTIONS.map(({q,key},idx)=>{
            const isNeg=key==='epigastricPain'||key==='nausea';
            const opts=isNeg?GERD_Q_OPTS_NEG:GERD_Q_OPTS_POS;
            return(
              <div key={key} className="space-y-1">
                <p className="text-sm text-gray-700 font-medium">{idx+1}. {q}</p>
                <div className="flex flex-wrap gap-1">
                  {opts.map(([lbl,pts])=>(
                    <button key={lbl} type="button" onClick={()=>setGerdScores(s=>({...s,[key]:gerdScores[key]===pts?null:pts}))} className={`px-3 py-1 rounded-full border text-xs font-medium transition-all ${gerdScores[key]===pts?A.teal.active:A.teal.pill}`}>{lbl}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {gerdQScore!=null&&(
          <div className={`rounded-xl border-2 ${A[gerdQInterp?.color]?.border||'border-gray-300'} ${A[gerdQInterp?.color]?.bg||'bg-gray-50'} p-4 mt-2`}>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-black ${A[gerdQInterp?.color]?.text||'text-gray-700'}`}>GERD-Q: {gerdQScore}/18</span>
              <span className={`text-sm font-semibold ${A[gerdQInterp?.color]?.text||'text-gray-700'}`}>{gerdQInterp?.label}</span>
            </div>
          </div>
        )}
        <FL label="Endoscopic findings (LA classification — oesophagitis)">
          <div className="space-y-1">
            {[
              ['Grade N — No breaks in mucosa (non-erosive reflux disease, NERD)'],
              ['Grade A — One or more mucosal breaks <5mm, not extending between mucosal folds'],
              ['Grade B — One or more mucosal breaks >5mm, not extending between mucosal folds'],
              ['Grade C — Mucosal breaks continuous between ≥2 mucosal folds but <75% of circumference'],
              ['Grade D — Mucosal breaks >75% of oesophageal circumference'],
            ].map(([lbl])=>(
              <button key={lbl} type="button" onClick={()=>setLaClassification(laClassification===lbl?'':lbl)} className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${laClassification===lbl?A.teal.active:A.teal.pill}`}>{lbl}</button>
            ))}
          </div>
        </FL>
        <FL label="Barrett's oesophagus">
          <Pills options={['Not suspected','Suspected — awaiting biopsy','Confirmed — short segment (<3cm)','Confirmed — long segment (≥3cm)','High-grade dysplasia — refer for intervention']} value={barrettsSuspected} onChange={setBarrettsSuspected} accent="orange"/>
        </FL>
        {(barrettsSuspected.includes('High-grade')||barrettsSuspected.includes('Confirmed'))&&(
          <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 text-sm text-orange-800 font-medium">
            Barrett's confirmed — refer for radiofrequency ablation (RFA) / endoscopic mucosal resection (EMR). Surveillance endoscopy protocol required.
          </div>
        )}
        <FL label="GERD complications" sub="multi-select">
          <Pills options={['Reflux oesophagitis (LA A–D)','Peptic stricture','Barrett\'s oesophagus','Oesophageal adenocarcinoma','Extra-oesophageal — chronic cough','Extra-oesophageal — laryngitis','Extra-oesophageal — asthma']} value={complicationsGerd} onChange={setComplicationsGerd} accent="orange" multi/>
        </FL>
      </Section>

      <Section title="Peptic Ulcer Disease" applicable={sec.pud} onApplicable={v=>sa('pud',v)} accent="cyan">
        <FL label="Ulcer location">
          <Pills options={['Duodenal ulcer (DU) — D1 bulb','Post-bulbar duodenal ulcer','Gastric ulcer — lesser curvature','Gastric ulcer — greater curvature','Prepyloric','Pyloric channel','Multiple ulcers','Zollinger-Ellison suspected (multiple/unusual location)']} value={ulcerLocation} onChange={setUlcerLocation} accent="cyan"/>
        </FL>
        <FL label="Ulcer size">
          <Pills options={['<5mm (small)','5–10mm (medium)','10–20mm (large)','>20mm (giant)','Not measured']} value={ulcerSize} onChange={setUlcerSize} accent="cyan"/>
        </FL>
        <FL label="Haemostasis status (Forrest)">
          <Pills options={['Forrest Ia — Active arterial bleed','Forrest Ib — Active ooze','Forrest IIa — Visible vessel','Forrest IIb — Adherent clot','Forrest IIc — Pigmented spot','Forrest III — Clean base','No active bleeding']} value={forrestClassPUD} onChange={setForrestClassPUD} accent="cyan"/>
        </FL>
        <Gate label="Perforation suspected?" value={perforationSuspected} onChange={setPerforationSuspected} accent="red">
          <div className="bg-red-600 text-white rounded-xl p-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5"/>
            <p className="text-sm font-bold">Perforation — erect CXR (pneumoperitoneum). Urgent surgical consult. NBM, IV PPI, IV antibiotics, resuscitation. Laparoscopic Graham patch repair.</p>
          </div>
        </Gate>
        <FL label="Pyloric stenosis / gastric outlet obstruction">
          <Pills options={['No','Suspected — succussion splash','Confirmed on OGD/imaging']} value={pyloric} onChange={setPyloric} accent="cyan"/>
        </FL>
      </Section>

      <Section title="H. pylori Status" applicable={sec.hpylori} onApplicable={v=>sa('hpylori',v)} accent="orange">
        <FL label="Diagnostic test used">
          <Pills options={['Rapid urease test (RUT) — at endoscopy','Histology (Giemsa stain)','Urea breath test (UBT) — C13','H. pylori stool antigen test','Serology (IgG — not for test of cure)','Not tested']} value={hpTest} onChange={setHpTest} accent="orange"/>
        </FL>
        <FL label="H. pylori result">
          <Pills options={['Positive','Negative','Pending','Previous eradication confirmed']} value={hpResult} onChange={setHpResult} accent="orange"/>
        </FL>
        {hpResult==='Positive'&&(
          <>
            <FL label="Eradication therapy">
              <Pills options={['Not yet started','Started — in progress','Completed']} value={hpEradication} onChange={setHpEradication} accent="orange"/>
            </FL>
            <FL label="Eradication regimen">
              <div className="space-y-1">
                {[
                  'Standard triple 14d: PPI bd + Clarithromycin 500mg bd + Amoxicillin 1g bd',
                  'Bismuth quadruple 14d: PPI bd + Bismuth subcitrate 120mg QDS + Tetracycline 500mg QDS + Metronidazole 400mg TDS',
                  'Concomitant 14d: PPI bd + Clarithromycin + Amoxicillin + Metronidazole',
                  'Levofloxacin triple (2nd line): PPI bd + Levofloxacin 500mg OD + Amoxicillin 1g bd',
                  'Rifabutin triple (3rd line/rescue): PPI bd + Rifabutin 150mg bd + Amoxicillin 1g bd',
                ].map(lbl=>(
                  <button key={lbl} type="button" onClick={()=>setEradicationRegimen(eradicationRegimen===lbl?'':lbl)} className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${eradicationRegimen===lbl?A.orange.active:A.orange.pill}`}>{lbl}</button>
                ))}
              </div>
              <p className="text-xs text-amber-700 font-medium mt-1">India: Clarithromycin resistance ~30–40% — bismuth quadruple or concomitant preferred as first-line.</p>
            </FL>
          </>
        )}
        <FL label="Test of cure (≥4 weeks post-eradication, off PPI ≥2 weeks)">
          <Pills options={['Not yet due','UBT pending','UBT negative — eradication confirmed','UBT positive — re-treat with 2nd-line','Stool antigen negative']} value={testOfCure} onChange={setTestOfCure} accent="green"/>
        </FL>
      </Section>

      <Section title="Functional Dyspepsia (Rome IV)" applicable={sec.dyspepsia} onApplicable={v=>sa('dyspepsia',v)} accent="blue">
        <p className="text-xs text-gray-500">Diagnosis of exclusion — no structural cause on endoscopy. Symptoms ≥3 months, onset ≥6 months ago.</p>
        <FL label="Functional dyspepsia subtype">
          <Pills options={['Postprandial distress syndrome (PDS) — early satiety / postprandial fullness','Epigastric pain syndrome (EPS) — epigastric pain/burning not relieved by defecation','Overlap PDS + EPS']} value={dyspepsiaType} onChange={setDyspepsiaType} accent="blue"/>
        </FL>
        <FL label="Rome IV criteria met" sub="multi-select">
          <Pills options={['Bothersome postprandial fullness after normal meal ≥3×/week','Early satiation preventing normal meal ≥3×/week','Epigastric pain of moderate severity ≥1×/week','Epigastric burning of moderate severity ≥1×/week','No evidence of structural disease on OGD']} value={romeIVDyspepsia} onChange={setRomeIVDyspepsia} accent="blue" multi/>
        </FL>
      </Section>

      <Section title="Treatment" applicable={sec.treatment} onApplicable={v=>sa('treatment',v)} accent="green">
        <FL label="PPI therapy">
          <Pills options={['Not required','Omeprazole 20mg OD (standard dose)','Omeprazole 40mg OD (high dose)','Pantoprazole 40mg OD','Rabeprazole 20mg OD (preferred — less CYP2C19 interaction)','Esomeprazole 40mg OD','Lansoprazole 30mg OD','PPI bd (severe GERD / Zollinger-Ellison)','On-demand PPI (NERD)']} value={ppiRegimen} onChange={setPpiRegimen} accent="green"/>
        </FL>
        <FL label="NSAID management">
          <Pills options={['Not applicable (no NSAIDs)','NSAID discontinued','NSAID reduced to minimum effective dose','Switched to COX-2 inhibitor (celecoxib)','Gastroprotection added (PPI co-prescribing)','Topical NSAID instead (diclofenac gel)']} value={nsaidManagement} onChange={setNsaidManagement} accent="amber"/>
        </FL>
        <FL label="Lifestyle advice given" sub="multi-select">
          <Pills options={['Elevate head of bed 15–20cm','Avoid lying down 2–3h after meals','Avoid trigger foods (fatty/spicy/citrus/coffee/alcohol/chocolate/carbonated drinks)','Eat smaller, frequent meals','Weight loss counselling','Smoking cessation','Reduce alcohol intake','Avoid tight clothing']} value={lifestyleAdvice} onChange={setLifestyleAdvice} accent="teal" multi/>
        </FL>
        <FL label="Endoscopy plan">
          <Pills options={['Urgent OGD <2 weeks (alarm features)','Early OGD (within 4 weeks)','Repeat OGD in 6–8 weeks (gastric ulcer — to confirm healing and exclude malignancy)','Surveillance OGD (Barrett\'s / gastric intestinal metaplasia)','Not required','Patient declined']} value={endoscopyPlan} onChange={setEndoscopyPlan} accent="teal"/>
        </FL>
        <FL label="Clinical notes"><textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Endoscopy findings, management plan, H. pylori regimen dates..."/></FL>
        <button type="button" onClick={handleSave} className="w-full py-3 rounded-xl bg-teal-600 text-white font-bold text-sm shadow">Save Assessment</button>
      </Section>
    </div>
  );
}
