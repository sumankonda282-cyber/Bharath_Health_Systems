/**
 * @shared-pool
 * ChestPainAssessmentForm — Algorithmic chest pain / ACS risk stratification
 * HEART score + TIMI UA/NSTEMI score auto-calculated
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */

import React, { useState, useMemo } from 'react';
import { Heart, Lock, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Info, Zap } from 'lucide-react';
import api from '../../../api/client';

const A = {
  red:    { bg:'bg-red-50',    border:'border-red-300',    text:'text-red-700',    pill:'bg-red-100 border-red-400 text-red-800',    active:'bg-red-600 text-white border-red-600' },
  rose:   { bg:'bg-rose-50',   border:'border-rose-300',   text:'text-rose-700',   pill:'bg-rose-100 border-rose-400 text-rose-800',   active:'bg-rose-600 text-white border-rose-600' },
  orange: { bg:'bg-orange-50', border:'border-orange-300', text:'text-orange-700', pill:'bg-orange-100 border-orange-400 text-orange-800', active:'bg-orange-500 text-white border-orange-500' },
  amber:  { bg:'bg-amber-50',  border:'border-amber-300',  text:'text-amber-700',  pill:'bg-amber-100 border-amber-400 text-amber-800',  active:'bg-amber-500 text-white border-amber-500' },
  yellow: { bg:'bg-yellow-50', border:'border-yellow-300', text:'text-yellow-700', pill:'bg-yellow-100 border-yellow-400 text-yellow-800', active:'bg-yellow-500 text-white border-yellow-500' },
  blue:   { bg:'bg-blue-50',   border:'border-blue-300',   text:'text-blue-700',   pill:'bg-blue-100 border-blue-400 text-blue-800',   active:'bg-blue-600 text-white border-blue-600' },
  violet: { bg:'bg-violet-50', border:'border-violet-300', text:'text-violet-700', pill:'bg-violet-100 border-violet-400 text-violet-800', active:'bg-violet-600 text-white border-violet-600' },
  green:  { bg:'bg-green-50',  border:'border-green-300',  text:'text-green-700',  pill:'bg-green-100 border-green-400 text-green-800',  active:'bg-green-600 text-white border-green-600' },
};

function Pills({ options, value, onChange, accent='red', multi=false }) {
  const c = A[accent];
  const sel = multi ? (Array.isArray(value)?value:[]) : value;
  const toggle = opt => {
    if (multi) { const a=Array.isArray(sel)?sel:[]; onChange(a.includes(opt)?a.filter(x=>x!==opt):[...a,opt]); }
    else onChange(sel===opt?'':opt);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = multi ? sel.includes(opt) : sel===opt;
        return <button key={opt} type="button" onClick={()=>toggle(opt)}
          className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${active?c.active:c.pill}`}>{opt}</button>;
      })}
    </div>
  );
}

function FL({ label, sub, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-semibold text-gray-700">{label}
        {sub && <span className="ml-1 text-xs font-normal text-gray-500">{sub}</span>}
      </label>
      {children}
    </div>
  );
}

function Gate({ label, value, onChange, accent='red', children }) {
  const c = A[accent];
  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} p-3`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex gap-2">
          {['Yes','No'].map(opt=>(
            <button key={opt} type="button" onClick={()=>onChange(value===opt?'':opt)}
              className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all ${value===opt?c.active:c.pill}`}>{opt}</button>
          ))}
        </div>
      </div>
      {value==='Yes' && children && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}

function Section({ title, applicable, onApplicable, accent='red', children }) {
  const c = A[accent];
  const [open,setOpen] = useState(true);
  if (applicable==='N/A') return (
    <div className={`rounded-xl border-2 border-dashed ${c.border} p-4 flex items-center gap-3 opacity-60`}>
      <Lock className="w-5 h-5 text-gray-400"/>
      <span className="text-sm text-gray-500 font-medium">{title} — Not applicable · section locked</span>
      <button type="button" onClick={()=>onApplicable('Applicable')} className="ml-auto text-xs text-blue-600 underline">Unlock</button>
    </div>
  );
  return (
    <div className={`rounded-xl border-2 ${c.border} overflow-hidden`}>
      <div className={`${c.bg} px-4 py-3 flex items-center justify-between flex-wrap gap-2`}>
        <span className={`font-bold text-base ${c.text}`}>{title}</span>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {['Applicable','N/A'].map(v=>(
              <button key={v} type="button" onClick={()=>onApplicable(v)}
                className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold transition-all ${applicable===v?c.active:c.pill}`}>{v}</button>
            ))}
          </div>
          <button type="button" onClick={()=>setOpen(o=>!o)} className={`${c.text} p-1`}>
            {open?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}
          </button>
        </div>
      </div>
      {open && applicable==='Applicable' && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

/* ── HEART score helpers ── */
const HEART_ROWS = [
  { key:'history', label:'History (chest pain character)', opts:[
    {label:'Slightly suspicious (non-specific)',score:0},
    {label:'Moderately suspicious (some typical features)',score:1},
    {label:'Highly suspicious (classic anginal / crushing / radiation / diaphoresis)',score:2},
  ]},
  { key:'ecg', label:'ECG findings', opts:[
    {label:'Normal',score:0},
    {label:'Non-specific repolarisation disturbance / LBBB / LVH / early repol',score:1},
    {label:'Significant ST deviation / T-wave inversion / new changes',score:2},
  ]},
  { key:'age', label:'Age', opts:[
    {label:'< 45 years',score:0},
    {label:'45 – 64 years',score:1},
    {label:'≥ 65 years',score:2},
  ]},
  { key:'risk', label:'Risk factors', opts:[
    {label:'No known risk factors',score:0},
    {label:'1–2 risk factors (HTN, DM, hyperlipidaemia, obesity, smoking, family history)',score:1},
    {label:'≥ 3 risk factors OR known atherosclerotic disease',score:2},
  ]},
  { key:'troponin', label:'Troponin (initial)', opts:[
    {label:'≤ normal limit (negative)',score:0},
    {label:'1–3× normal limit',score:1},
    {label:'> 3× normal limit',score:2},
  ]},
];

const TIMI_ITEMS = [
  { key:'t_age65',   label:'Age ≥ 65 years' },
  { key:'t_rf3',     label:'≥ 3 CAD risk factors (family hx, HTN, hyperlipidaemia, DM, active smoker)' },
  { key:'t_stenosis',label:'Prior coronary stenosis ≥ 50% (known CAD)' },
  { key:'t_std',     label:'ST deviation on presenting ECG (≥ 0.5 mm)' },
  { key:'t_angina2', label:'≥ 2 anginal events in prior 24 hours' },
  { key:'t_asp',     label:'Aspirin use in last 7 days' },
  { key:'t_markers', label:'Elevated serum cardiac markers (troponin / CK-MB)' },
];

const STAGES = ['Presentation','Vitals & ECG','HEART Score','TIMI Score','Investigations','Risk & Management'];

export default function ChestPainAssessmentForm({ patientId, encounterId, onSaved }) {
  const [stage,setStage] = useState(0);
  const [sec,setSec] = useState({ present:'Applicable', vitals:'Applicable', heart:'Applicable', timi:'Applicable', ix:'Applicable', mgmt:'Applicable' });
  const sa = (k,v) => setSec(s=>({...s,[k]:v}));

  /* Stage 0 */
  const [age,setAge] = useState('');
  const [sex,setSex] = useState('');
  const [onsetTime,setOnsetTime] = useState('');
  const [painCharacter,setPainCharacter] = useState([]);
  const [painLocation,setPainLocation] = useState([]);
  const [painRadiation,setPainRadiation] = useState([]);
  const [painSeverity,setPainSeverity] = useState('');
  const [painDuration,setPainDuration] = useState('');
  const [associated,setAssociated] = useState([]);
  const [precipitants,setPrecipitants] = useState([]);
  const [relievingFactors,setRelievingFactors] = useState([]);
  const [priorACS,setPriorACS] = useState('');
  const [priorPCI,setPriorPCI] = useState('');
  const [priorCABG,setPriorCABG] = useState('');
  const [riskFactors,setRiskFactors] = useState([]);

  /* Stage 1 */
  const [sbp,setSbp] = useState('');
  const [dbp,setDbp] = useState('');
  const [hr,setHr] = useState('');
  const [spo2,setSpo2] = useState('');
  const [rr,setRr] = useState('');
  const [temp,setTemp] = useState('');
  const [ecgRhythm,setEcgRhythm] = useState('');
  const [ecgSTchanges,setEcgSTchanges] = useState('');
  const [ecgSTloc,setEcgSTloc] = useState([]);
  const [ecgTwave,setEcgTwave] = useState('');
  const [ecgBBB,setEcgBBB] = useState('');
  const [ecgOther,setEcgOther] = useState([]);
  const [killip,setKillip] = useState('');

  /* Stage 2 — HEART */
  const [heartScores,setHeartScores] = useState({ history:null, ecg:null, age:null, risk:null, troponin:null });
  const setHS = (k,v) => setHeartScores(s=>({...s,[k]:v}));

  /* Stage 3 — TIMI */
  const [timiFlags,setTimiFlags] = useState({});
  const setTF = (k,v) => setTimiFlags(s=>({...s,[k]:v}));

  /* Stage 4 */
  const [tropI1,setTropI1] = useState('');
  const [tropI2,setTropI2] = useState('');
  const [tropTime,setTropTime] = useState('');
  const [bnp,setBnp] = useState('');
  const [ddimer,setDdimer] = useState('');
  const [cbc,setCbc] = useState([]);
  const [rft,setRft] = useState([]);
  const [lft,setLft] = useState([]);
  const [glucose,setGlucose] = useState('');
  const [echo,setEcho] = useState('');
  const [echoFindings,setEchoFindings] = useState([]);
  const [ctAngio,setCtAngio] = useState('');
  const [ctResult,setCtResult] = useState('');
  const [xray,setXray] = useState([]);

  /* Stage 5 */
  const [finalDx,setFinalDx] = useState('');
  const [disposition,setDisposition] = useState('');
  const [treatmentGiven,setTreatmentGiven] = useState([]);
  const [anticoag,setAnticoag] = useState('');
  const [pciPlan,setPciPlan] = useState('');
  const [reperfusionTime,setReperfusionTime] = useState('');
  const [followUp,setFollowUp] = useState('');

  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);

  /* ── AUTO: HEART score ── */
  const heartTotal = useMemo(()=>{
    const vals = Object.values(heartScores);
    if(vals.some(v=>v===null)) return null;
    return vals.reduce((s,v)=>s+v,0);
  },[heartScores]);

  const heartRisk = useMemo(()=>{
    if(heartTotal===null) return null;
    if(heartTotal<=3) return { label:'Low Risk', detail:'MACE <2% — consider early discharge + outpatient follow-up', color:'bg-green-100 border-green-400 text-green-800' };
    if(heartTotal<=6) return { label:'Moderate Risk', detail:'MACE 12–17% — admit for observation, serial troponins, cardiology review', color:'bg-orange-100 border-orange-400 text-orange-800' };
    return { label:'High Risk', detail:'MACE 50–65% — urgent cardiology + likely early invasive strategy', color:'bg-red-100 border-red-500 text-red-800 animate-pulse' };
  },[heartTotal]);

  /* ── AUTO: TIMI score ── */
  const timiTotal = useMemo(()=>TIMI_ITEMS.filter(i=>timiFlags[i.key]==='Yes').length,[timiFlags]);

  const timiRisk = useMemo(()=>{
    const timiRiskMap = [[0,1,'5%','Low',false],[2,2,'8%','Low-Moderate',false],[3,3,'13%','Moderate',false],
      [4,4,'20%','Moderate-High',true],[5,5,'26%','High',true],[6,7,'41%','Very High',true]];
    const row = timiRiskMap.find(([lo,hi])=>timiTotal>=lo&&timiTotal<=hi);
    if(!row) return null;
    return { pct:row[2], label:row[3], urgent:row[4],
      color: row[4] ? 'bg-red-100 border-red-400 text-red-800' : timiTotal<=2?'bg-green-100 border-green-400 text-green-800':'bg-orange-100 border-orange-400 text-orange-800' };
  },[timiTotal]);

  /* ── AUTO: urgent alerts ── */
  const urgentAlerts = useMemo(()=>{
    const a=[];
    if(ecgSTchanges==='ST elevation (STEMI pattern)') a.push('STEMI pattern — activate Cath Lab / thrombolysis immediately. Door-to-balloon target <90 min');
    if(Number(sbp)<90) a.push(`Hypotension (SBP ${sbp} mmHg) — haemodynamic compromise. Rule out cardiogenic shock, tamponade, massive PE`);
    if(Number(spo2)<92) a.push(`SpO₂ ${spo2}% — supplemental oxygen, consider respiratory cause`);
    if(Number(hr)>150) a.push(`HR ${hr} bpm — tachyarrhythmia. Urgent ECG + cardiology`);
    if(Number(hr)<40) a.push(`HR ${hr} bpm — severe bradycardia / AV block. Atropine / pacing`);
    if(killip==='Killip IV (cardiogenic shock)') a.push('Killip Class IV — Cardiogenic shock. ICU, haemodynamic support, consider IABP/Impella');
    if(heartTotal>=7) a.push(`HEART Score ${heartTotal}/10 — HIGH RISK. Early invasive strategy recommended`);
    return a;
  },[ecgSTchanges,sbp,spo2,hr,killip,heartTotal]);

  const handleSave = async()=>{
    setSaving(true);
    try {
      await api.post('/assessments',{
        type:'chest_pain_assessment', patientId, encounterId,
        data:{ presentation:{ age,sex,onsetTime,painCharacter,painLocation,painRadiation,painSeverity,painDuration,associated,precipitants,relievingFactors,priorACS,priorPCI,priorCABG,riskFactors },
          vitals:{ sbp,dbp,hr,spo2,rr,temp }, ecg:{ rhythm:ecgRhythm,stChanges:ecgSTchanges,stLocation:ecgSTloc,tWave:ecgTwave,bbb:ecgBBB,other:ecgOther },
          killip, heartScores, heartTotal, heartRisk,
          timiFlags, timiTotal, timiRisk,
          investigations:{ tropI1,tropI2,tropTime,bnp,ddimer,cbc,rft,lft,glucose,echo,echoFindings,ctAngio,ctResult,xray },
          management:{ finalDx,disposition,treatmentGiven,anticoag,pciPlan,reperfusionTime,followUp },
        },
      });
      setSaved(true); onSaved?.();
    } catch(e){ console.error(e); } finally { setSaving(false); }
  };

  const progress = Math.round(((stage+1)/STAGES.length)*100);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-red-700 to-rose-500 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Heart className="w-8 h-8"/>
          <div>
            <h1 className="text-2xl font-bold">Chest Pain Assessment</h1>
            <p className="text-red-100 text-sm">HEART score · TIMI UA/NSTEMI · ACS risk stratification</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {heartTotal!==null && (
            <span className={`px-3 py-1 rounded-full border text-xs font-bold ${heartRisk?.color}`}>
              HEART {heartTotal}/10 — {heartRisk?.label}
            </span>
          )}
          {timiTotal>0 && (
            <span className={`px-3 py-1 rounded-full border text-xs font-bold ${timiRisk?.color}`}>
              TIMI {timiTotal}/7 — {timiRisk?.pct} MACE risk ({timiRisk?.label})
            </span>
          )}
        </div>
        {urgentAlerts.length>0 && (
          <div className="mt-2 space-y-1">
            {urgentAlerts.map((a,i)=>(
              <div key={i} className="flex items-start gap-2 px-3 py-1.5 rounded-lg bg-red-900/80 text-white text-xs font-semibold animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"/>{a}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-red-600 h-2 rounded-full transition-all" style={{width:`${progress}%`}}/>
      </div>

      <div className="flex flex-wrap gap-2">
        {STAGES.map((s,i)=>(
          <button key={i} type="button" onClick={()=>setStage(i)}
            className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all
              ${stage===i?'bg-red-600 text-white border-red-600':'bg-red-50 border-red-300 text-red-700'}`}>
            {i+1}. {s}
          </button>
        ))}
      </div>

      {/* Stage 0 */}
      {stage===0 && (
        <Section title="Presentation & History" applicable={sec.present} onApplicable={v=>sa('present',v)} accent="red">
          <div className="grid grid-cols-3 gap-3">
            <FL label="Age (years)">
              <input type="number" value={age} onChange={e=>setAge(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 55"/>
            </FL>
            <FL label="Sex">
              <Pills options={['Male','Female','Other']} value={sex} onChange={setSex} accent="red"/>
            </FL>
            <FL label="Onset">
              <Pills options={['<30 min','30 min–2 h','2–6 h','6–12 h','>12 h','Recurrent']} value={onsetTime} onChange={setOnsetTime} accent="red"/>
            </FL>
          </div>
          <FL label="Pain Character" sub="(multi-select)">
            <Pills options={['Crushing/squeezing','Pressure','Tightness','Burning','Sharp/stabbing','Tearing/ripping','Dull ache','Pleuritic (worse on breath)']}
              value={painCharacter} onChange={setPainCharacter} accent="red" multi/>
          </FL>
          <FL label="Location" sub="(multi-select)">
            <Pills options={['Central chest','Left chest','Retrosternal','Epigastric','Right chest','Jaw/neck','Left arm','Right arm','Back/interscapular']}
              value={painLocation} onChange={setPainLocation} accent="red" multi/>
          </FL>
          <FL label="Radiation" sub="(multi-select)">
            <Pills options={['None','Left arm','Right arm','Both arms','Jaw','Neck','Back','Shoulder','Epigastric']}
              value={painRadiation} onChange={setPainRadiation} accent="red" multi/>
          </FL>
          <div className="grid grid-cols-2 gap-4">
            <FL label="Severity (0–10 NRS)">
              <Pills options={['1–3 (mild)','4–6 (moderate)','7–9 (severe)','10 (worst ever)']}
                value={painSeverity} onChange={setPainSeverity} accent="rose"/>
            </FL>
            <FL label="Duration of episode">
              <Pills options={['<10 min','10–20 min','20–30 min','30 min–1 h','>1 h','Ongoing']}
                value={painDuration} onChange={setPainDuration} accent="rose"/>
            </FL>
          </div>
          <FL label="Associated symptoms" sub="(multi-select)">
            <Pills options={['Diaphoresis','Dyspnoea','Nausea/vomiting','Palpitations','Syncope/presyncope','Dizziness','Cough','Haemoptysis','Ankle oedema','Fever']}
              value={associated} onChange={setAssociated} accent="rose" multi/>
          </FL>
          <FL label="Precipitants" sub="(multi-select)">
            <Pills options={['Exertion','Rest','Emotion/stress','Food','Posture','Cold exposure','Spontaneous','Cocaine/stimulant use']}
              value={precipitants} onChange={setPrecipitants} accent="rose" multi/>
          </FL>
          <FL label="Relieving factors" sub="(multi-select)">
            <Pills options={['GTN (nitrate)','Rest','Antacids','Position change','Analgesia','Nothing relieves','Not tried GTN']}
              value={relievingFactors} onChange={setRelievingFactors} accent="rose" multi/>
          </FL>
          {relievingFactors.includes('GTN (nitrate)') && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-2 text-xs text-amber-800">
              <Info className="w-4 h-4 inline mr-1"/>GTN response is NOT specific for angina — oesophageal spasm also responds to GTN. Do not use as sole diagnostic criterion.
            </div>
          )}
          <FL label="Cardiovascular history" sub="(multi-select)">
            <Pills options={['Prior MI','Prior PCI/stent','Prior CABG','Known CAD (>50% stenosis)','Peripheral arterial disease','Stroke/TIA','None']}
              value={[priorACS==='Yes'?'Prior MI':'', priorPCI==='Yes'?'Prior PCI/stent':'', priorCABG==='Yes'?'Prior CABG':''].filter(Boolean)}
              onChange={v=>{ setPriorACS(v.includes('Prior MI')?'Yes':'No'); setPriorPCI(v.includes('Prior PCI/stent')?'Yes':'No'); setPriorCABG(v.includes('Prior CABG')?'Yes':'No'); }}
              accent="rose" multi/>
          </FL>
          <FL label="Risk factors" sub="(multi-select)">
            <Pills options={['Hypertension','Diabetes mellitus','Dyslipidaemia','Active smoker','Ex-smoker','Family history of premature CAD (<55 M / <65 F)','Obesity (BMI>30)','CKD','Hypothyroidism']}
              value={riskFactors} onChange={setRiskFactors} accent="orange" multi/>
          </FL>
        </Section>
      )}

      {/* Stage 1 */}
      {stage===1 && (
        <Section title="Vitals & ECG" applicable={sec.vitals} onApplicable={v=>sa('vitals',v)} accent="orange">
          <div className="grid grid-cols-3 gap-3">
            {[['SBP (mmHg)',sbp,setSbp],['DBP (mmHg)',dbp,setDbp],['HR (bpm)',hr,setHr],
              ['SpO₂ (%)',spo2,setSpo2],['RR (/min)',rr,setRr],['Temp (°C)',temp,setTemp]].map(([l,v,s])=>(
              <FL key={l} label={l}>
                <input type="number" value={v} onChange={e=>s(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="—"/>
              </FL>
            ))}
          </div>
          {/* BP classification */}
          {sbp && (
            <div className={`px-3 py-2 rounded-lg border text-xs font-semibold
              ${Number(sbp)>=180?'bg-red-100 border-red-400 text-red-800':Number(sbp)>=140?'bg-orange-100 border-orange-400 text-orange-800':Number(sbp)<90?'bg-red-100 border-red-400 text-red-800':'bg-green-100 border-green-400 text-green-800'}`}>
              BP: {sbp}/{dbp} mmHg — {Number(sbp)>=180?'Hypertensive crisis':Number(sbp)>=140?'Hypertensive':Number(sbp)<90?'HYPOTENSION — urgent':'Normotensive'}
            </div>
          )}
          <FL label="Killip Class">
            <Pills options={['Killip I (no HF signs)','Killip II (basal crackles / JVP raised / S3)','Killip III (pulmonary oedema)','Killip IV (cardiogenic shock)']}
              value={killip} onChange={setKillip} accent="orange"/>
          </FL>
          <hr className="border-orange-200"/>
          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">ECG</p>
          <FL label="Rhythm">
            <Pills options={['Sinus rhythm','Sinus tachycardia','Atrial fibrillation','Atrial flutter','AV block (1st)','AV block (2nd Mobitz I)','AV block (2nd Mobitz II)','Complete AV block (3rd)','VT','Paced']}
              value={ecgRhythm} onChange={setEcgRhythm} accent="orange"/>
          </FL>
          <FL label="ST changes">
            <Pills options={['No ST change','ST elevation (STEMI pattern)','ST depression ≥0.5 mm','ST depression ≥1 mm','Subtle STE (de Winter / Wellens)','Non-specific ST change']}
              value={ecgSTchanges} onChange={setEcgSTchanges} accent="red"/>
          </FL>
          {(ecgSTchanges?.includes('elevation')||ecgSTchanges?.includes('Wellens')||ecgSTchanges?.includes('Winter')) && (
            <FL label="ST change location" sub="(multi-select)">
              <Pills options={['V1–V4 (anterior)','V5–V6 (lateral)','I, aVL (lateral)','II, III, aVF (inferior)','V7–V9 (posterior)','aVR (circumflex/LMCA)','Diffuse (pericarditis / LMCA)']}
                value={ecgSTloc} onChange={setEcgSTloc} accent="red" multi/>
            </FL>
          )}
          <FL label="T-wave changes">
            <Pills options={['Normal','T-wave inversion (anterior V1–V4)','T-wave inversion (inferior)','T-wave inversion (lateral)','Tall peaked T-waves (hyperacute)','Biphasic T-waves (Wellens Type A)','Deep T-wave inversion (Wellens Type B)','Diffuse T-inversion']}
              value={ecgTwave} onChange={setEcgTwave} accent="orange"/>
          </FL>
          <FL label="Bundle branch block">
            <Pills options={['None','LBBB (new)','LBBB (old/known)','RBBB','LBBB — cannot assess ischaemia']}
              value={ecgBBB} onChange={setEcgBBB} accent="orange"/>
          </FL>
          <FL label="Other ECG findings" sub="(multi-select)">
            <Pills options={['LVH','RVH','Q waves (old MI)','Delta wave (WPW)','Long QT','PR prolongation','Epsilon wave (ARVC)','Brugada pattern','Normal axis','LAD','RAD']}
              value={ecgOther} onChange={setEcgOther} accent="amber" multi/>
          </FL>
        </Section>
      )}

      {/* Stage 2 — HEART Score */}
      {stage===2 && (
        <Section title="HEART Score" applicable={sec.heart} onApplicable={v=>sa('heart',v)} accent="red">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 mb-2">
            <Info className="w-4 h-4 inline mr-1"/>HEART score: 0–3 Low (MACE &lt;2%), 4–6 Moderate (~12–17%), 7–10 High (~50–65%). Select the most appropriate option for each domain.
          </div>
          {HEART_ROWS.map(({key,label,opts})=>(
            <div key={key} className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">{label}</p>
              <div className="grid gap-2">
                {opts.map(o=>(
                  <button key={o.score} type="button" onClick={()=>setHS(key,o.score)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg border-2 text-sm transition-all
                      ${heartScores[key]===o.score?'border-red-500 bg-red-50 text-red-800 font-semibold':'border-gray-200 hover:border-red-200'}`}>
                    <span className={`inline-block w-6 h-6 rounded-full text-xs font-bold mr-2 text-center leading-6
                      ${heartScores[key]===o.score?'bg-red-500 text-white':'bg-gray-200 text-gray-600'}`}>{o.score}</span>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {heartTotal!==null && (
            <div className={`flex flex-col gap-1 px-4 py-3 rounded-xl border-2 ${heartRisk?.color}`}>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">HEART Total: {heartTotal} / 10</span>
                <span className="text-sm font-bold">{heartRisk?.label}</span>
              </div>
              <p className="text-xs">{heartRisk?.detail}</p>
            </div>
          )}
        </Section>
      )}

      {/* Stage 3 — TIMI */}
      {stage===3 && (
        <Section title="TIMI UA/NSTEMI Score" applicable={sec.timi} onApplicable={v=>sa('timi',v)} accent="rose">
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800 mb-2">
            <Info className="w-4 h-4 inline mr-1"/>TIMI UA/NSTEMI: 1 point each. Total 0–7. ≥4 points = early invasive strategy recommended (angiography ≤24 h).
          </div>
          {TIMI_ITEMS.map(({key,label})=>(
            <div key={key} className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all
              ${timiFlags[key]==='Yes'?'border-rose-500 bg-rose-50':'border-gray-200'}`}>
              <span className="text-sm font-medium flex-1">{label}</span>
              <div className="flex gap-2 ml-3">
                {['Yes','No'].map(opt=>(
                  <button key={opt} type="button" onClick={()=>setTF(key,opt)}
                    className={`px-3 py-1 rounded-full border text-xs font-bold transition-all
                      ${timiFlags[key]===opt?(opt==='Yes'?'bg-rose-600 text-white border-rose-600':'bg-gray-500 text-white border-gray-500'):'bg-rose-50 border-rose-300 text-rose-700'}`}>{opt}</button>
                ))}
              </div>
            </div>
          ))}
          {timiTotal>0 && timiRisk && (
            <div className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 ${timiRisk.color}`}>
              <span className="text-lg font-bold">TIMI Score: {timiTotal} / 7</span>
              <div className="text-right">
                <p className="text-sm font-bold">{timiRisk.label}</p>
                <p className="text-xs">{timiRisk.pct} risk of death/MI/revascularisation at 14 days</p>
              </div>
            </div>
          )}
          {timiTotal>=4 && (
            <div className="bg-red-50 border border-red-400 rounded-lg p-3 text-xs text-red-700 font-semibold flex gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0"/>TIMI ≥4 — early invasive strategy: angiography within 24 hours recommended. Anticoagulation + dual antiplatelet therapy.
            </div>
          )}
        </Section>
      )}

      {/* Stage 4 */}
      {stage===4 && (
        <Section title="Investigations" applicable={sec.ix} onApplicable={v=>sa('ix',v)} accent="violet">
          <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Cardiac Biomarkers</p>
          <div className="grid grid-cols-3 gap-3">
            <FL label="Troponin I/T — T=0 (ng/L)">
              <input type="number" value={tropI1} onChange={e=>setTropI1(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Initial"/>
            </FL>
            <FL label="Troponin — T=3h/Serial">
              <input type="number" value={tropI2} onChange={e=>setTropI2(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Serial"/>
            </FL>
            <FL label="Serial interval">
              <Pills options={['1h (hs-TnI)','2h','3h','6h','Not done']} value={tropTime} onChange={setTropTime} accent="violet"/>
            </FL>
          </div>
          {tropI1 && tropI2 && Number(tropI2)>Number(tropI1)*1.2 && (
            <div className="bg-red-50 border border-red-400 rounded-lg p-2 text-xs text-red-700 font-semibold flex gap-2">
              <AlertTriangle className="w-4 h-4"/>Rising troponin (delta &gt;20%) — NSTEMI pattern. Cardiology review urgently.
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <FL label="BNP / NT-proBNP (pg/mL)">
              <input type="number" value={bnp} onChange={e=>setBnp(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="—"/>
              {Number(bnp)>400 && <p className="text-xs text-red-600 mt-1">BNP elevated — heart failure likely</p>}
            </FL>
            <FL label="D-dimer (μg/L)">
              <input type="number" value={ddimer} onChange={e=>setDdimer(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="—"/>
              {Number(ddimer)>500 && <p className="text-xs text-orange-600 mt-1">Elevated D-dimer — consider PE if age-adjusted cut-off exceeded</p>}
            </FL>
          </div>
          <FL label="Blood glucose (mmol/L or mg/dL)">
            <input type="number" value={glucose} onChange={e=>setGlucose(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="—"/>
          </FL>
          <FL label="CBC findings" sub="(multi-select)">
            <Pills options={['Normal','Anaemia (Hb<10)','Thrombocytopenia','Leukocytosis','Polycythaemia']}
              value={cbc} onChange={setCbc} accent="violet" multi/>
          </FL>
          <FL label="Renal function" sub="(multi-select)">
            <Pills options={['Normal','Elevated creatinine (AKI)','Elevated creatinine (CKD)','Hyperkalaemia','Hyponatraemia']}
              value={rft} onChange={setRft} accent="violet" multi/>
          </FL>
          <FL label="Chest X-ray findings" sub="(multi-select)">
            <Pills options={['Normal','Cardiomegaly','Pulmonary oedema','Pleural effusion','Widened mediastinum','Pneumothorax','Consolidation','Rib fracture/trauma','Not done']}
              value={xray} onChange={setXray} accent="violet" multi/>
          </FL>
          <Gate label="Echocardiogram performed?" value={echo} onChange={setEcho} accent="violet">
            <FL label="Echo findings" sub="(multi-select)">
              <Pills options={['Normal LV function','Regional wall motion abnormality (RWMA)','EF reduced (<40%)','EF mildly reduced (40–49%)','EF preserved (≥50%)','LV thrombus','Pericardial effusion','Valvular abnormality','RV dysfunction','LVOTO (HCM)']}
                value={echoFindings} onChange={setEchoFindings} accent="violet" multi/>
            </FL>
          </Gate>
          <Gate label="CT Coronary Angiography / CTPA ordered?" value={ctAngio} onChange={setCtAngio} accent="blue">
            <FL label="CT Result">
              <Pills options={['No significant stenosis (CAD-RADS 0)','Mild stenosis <50% (CAD-RADS 1–2)','Moderate stenosis 50–70% (CAD-RADS 3)','Severe stenosis >70% (CAD-RADS 4)','PE confirmed (CTPA)','PE excluded (CTPA)','Aortic dissection confirmed','Awaiting report']}
                value={ctResult} onChange={setCtResult} accent="blue"/>
            </FL>
          </Gate>
        </Section>
      )}

      {/* Stage 5 */}
      {stage===5 && (
        <Section title="Risk Stratification & Management" applicable={sec.mgmt} onApplicable={v=>sa('mgmt',v)} accent="green">
          <FL label="Final Diagnosis">
            <Pills options={['STEMI','NSTEMI','Unstable angina','Stable angina','Aortic dissection','Pulmonary embolism','Myopericarditis','Takotsubo (stress cardiomyopathy)','Non-cardiac chest pain — musculoskeletal','Non-cardiac — GORD/oesophageal','Non-cardiac — anxiety/hyperventilation','Non-cardiac — pleuritis/pneumonia','Undifferentiated — further evaluation']}
              value={finalDx} onChange={setFinalDx} accent="green"/>
          </FL>
          <FL label="Disposition">
            <Pills options={['Discharge (low risk — HEART ≤3, serial troponins negative)','Observe 6h then reassess','Admit — general cardiology','Admit — CCU/HDU','Admit — ICU (cardiogenic shock)','Activate Cath Lab (primary PCI)','Transfer to PCI centre','Thrombolysis given then transfer']}
              value={disposition} onChange={setDisposition} accent="green"/>
          </FL>
          <FL label="Immediate treatment given" sub="(multi-select)">
            <Pills options={['O₂ (if SpO₂<93%)','Aspirin 300 mg loading','Ticagrelor 180 mg loading','Clopidogrel 600 mg loading','Prasugrel 60 mg loading (if PCI planned)','GTN sublingual','GTN IV infusion','Morphine IV','Metoprolol IV/oral','Unfractionated heparin (UFH) IV','LMWH (Enoxaparin) SC','Fondaparinux SC','Bivalirudin','Statin (high-intensity: Rosuvastatin 40 mg)','ACE inhibitor/ARB','Loop diuretic (Furosemide) if HF']}
              value={treatmentGiven} onChange={setTreatmentGiven} accent="green" multi/>
          </FL>
          <FL label="Anticoagulation strategy">
            <Pills options={['Enoxaparin 1 mg/kg BD SC (NSTEMI)','UFH IV (STEMI/PCI)','Fondaparinux 2.5 mg OD SC (NSTEMI conservative)','Bivalirudin (PCI)','Not indicated']}
              value={anticoag} onChange={setAnticoag} accent="green"/>
          </FL>
          <Gate label="PCI planned?" value={pciPlan} onChange={setPciPlan} accent="green">
            <FL label="Reperfusion timing">
              <Pills options={['Primary PCI — door-to-balloon <90 min (target)','Urgent PCI — within 2 h (very high risk NSTEMI)','Early PCI — within 24 h (high risk NSTEMI)','Elective PCI — within 72 h (intermediate risk)','Thrombolysis + transfer (no cath lab available)']}
                value={reperfusionTime} onChange={setReperfusionTime} accent="green"/>
            </FL>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <Info className="w-4 h-4 inline mr-1"/>India context: Primary PCI centres available in major cities (Mumbai, Delhi, Chennai, Hyderabad). Thrombolysis (Tenecteplase) recommended if PCI not achievable within 120 min of STEMI diagnosis. PCI centres under PM Jan Arogya Yojana (PMJAY) — check empanelment.
            </div>
          </Gate>
          <FL label="Follow-up plan">
            <Pills options={['Outpatient cardiology — 2 weeks','Stress test (ETT/nuclear) — outpatient','Elective angiography','CATH lab follow-up','Cardiac rehab referral','Lifestyle counselling given']}
              value={followUp} onChange={setFollowUp} accent="green"/>
          </FL>
        </Section>
      )}

      <div className="flex items-center justify-between pt-2">
        <button type="button" disabled={stage===0} onClick={()=>setStage(s=>s-1)}
          className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm font-semibold disabled:opacity-40">← Previous</button>
        <span className="text-xs text-gray-500">Stage {stage+1} of {STAGES.length}</span>
        {stage<STAGES.length-1?(
          <button type="button" onClick={()=>setStage(s=>s+1)}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold">Next →</button>
        ):(
          <button type="button" onClick={handleSave} disabled={saving||saved}
            className="px-6 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center gap-2">
            {saved?<><CheckCircle className="w-4 h-4"/>Saved</>:saving?'Saving…':'Save Assessment'}
          </button>
        )}
      </div>
    </div>
  );
}
