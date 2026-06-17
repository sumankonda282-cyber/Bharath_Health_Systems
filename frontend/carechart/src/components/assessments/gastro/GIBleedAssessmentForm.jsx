/**
 * @shared-pool
 * GIBleedAssessmentForm — Upper & Lower GI Bleeding assessment
 * Glasgow-Blatchford Score, Rockall Score, Forrest classification, variceal vs non-variceal
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */

import React, { useState, useMemo } from 'react';
import { Lock, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  red:    { bg:'bg-red-50',    border:'border-red-300',    text:'text-red-700',    pill:'bg-red-100 border-red-400 text-red-800',    active:'bg-red-600 text-white border-red-600' },
  rose:   { bg:'bg-rose-50',   border:'border-rose-300',   text:'text-rose-700',   pill:'bg-rose-100 border-rose-400 text-rose-800',   active:'bg-rose-600 text-white border-rose-600' },
  orange: { bg:'bg-orange-50', border:'border-orange-300', text:'text-orange-700', pill:'bg-orange-100 border-orange-400 text-orange-800', active:'bg-orange-500 text-white border-orange-500' },
  amber:  { bg:'bg-amber-50',  border:'border-amber-300',  text:'text-amber-700',  pill:'bg-amber-100 border-amber-400 text-amber-800',  active:'bg-amber-500 text-white border-amber-500' },
  blue:   { bg:'bg-blue-50',   border:'border-blue-300',   text:'text-blue-700',   pill:'bg-blue-100 border-blue-400 text-blue-800',   active:'bg-blue-600 text-white border-blue-600' },
  green:  { bg:'bg-green-50',  border:'border-green-300',  text:'text-green-700',  pill:'bg-green-100 border-green-400 text-green-800',  active:'bg-green-600 text-white border-green-600' },
  violet: { bg:'bg-violet-50', border:'border-violet-300', text:'text-violet-700', pill:'bg-violet-100 border-violet-400 text-violet-800', active:'bg-violet-600 text-white border-violet-600' },
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
function ScoreRow({label,options,value,onChange,accent='red'}){
  const c=A[accent];
  return(<div className="flex items-center gap-3 flex-wrap"><span className="text-sm text-gray-600 w-48 shrink-0">{label}</span><div className="flex flex-wrap gap-1">{options.map(([lbl,pts])=>{const active=value===pts;return<button key={lbl} type="button" onClick={()=>onChange(active?null:pts)} className={`px-2.5 py-1 rounded border text-xs font-medium transition-all ${active?c.active:c.pill}`}>{lbl} ({pts>0?'+':''}{pts})</button>;})}</div>{value!=null&&<span className={`text-xs font-bold ${c.text}`}>{value>0?'+':''}{value}pts</span>}</div>);
}

const STAGES=['Presentation & Haemodynamics','Glasgow-Blatchford Score','Endoscopy & Forrest','Rockall Score','Management & Disposition'];

export default function GIBleedAssessmentForm({patientId,encounterId,onSaved}){
  const[stage,setStage]=useState(0);
  const[sec,setSec]=useState({present:'Applicable',gbs:'Applicable',endo:'Applicable',rockall:'Applicable',mgmt:'Applicable'});
  const sa=(k,v)=>setSec(s=>({...s,[k]:v}));

  /* Stage 0 — Presentation */
  const[bleedType,setBleedType]=useState('');
  const[symptoms,setSymptoms]=useState([]);
  const[onset,setOnset]=useState('');
  const[estimatedLoss,setEstimatedLoss]=useState('');
  const[sbp,setSbp]=useState('');const[hr,setHr]=useState('');
  const[haemodynamic,setHaemodynamic]=useState('');
  const[hb,setHb]=useState('');const[urea,setUrea]=useState('');
  const[riskFactors,setRiskFactors]=useState([]);
  const[medications,setMedications]=useState([]);
  const[liverDisease,setLiverDisease]=useState('');

  /* Stage 1 — Glasgow-Blatchford */
  const[gbsUrea,setGbsUrea]=useState(null);
  const[gbsHb,setGbsHb]=useState(null);
  const[gbsSex,setGbsSex]=useState('');
  const[gbsSbp,setGbsSbp]=useState(null);
  const[gbsHr,setGbsHr]=useState(null);
  const[gbsMelena,setGbsMelena]=useState(false);
  const[gbsSyncope,setGbsSyncope]=useState(false);
  const[gbsLiverDisease,setGbsLiverDisease]=useState(false);
  const[gbsCardiacFailure,setGbsCardiacFailure]=useState(false);

  /* Stage 2 — Endoscopy */
  const[endoscopyDone,setEndoscopyDone]=useState('');
  const[endoscopyTiming,setEndoscopyTiming]=useState('');
  const[findingType,setFindingType]=useState('');
  const[forrestClass,setForrestClass]=useState('');
  const[varicesGrade,setVaricesGrade]=useState('');
  const[endoscopicTx,setEndoscopicTx]=useState([]);
  const[ppiProtocol,setPpiProtocol]=useState('');

  /* Stage 3 — Rockall (post-endoscopy) */
  const[rAge,setRAge]=useState(null);
  const[rShock,setRShock]=useState(null);
  const[rComorbidity,setRComorbidity]=useState(null);
  const[rDiagnosis,setRDiagnosis]=useState(null);
  const[rStigmata,setRStigmata]=useState(null);

  /* Stage 4 — Management */
  const[resuscitation,setResuscitation]=useState([]);
  const[bloodProducts,setBloodProducts]=useState([]);
  const[targetHb,setTargetHb]=useState('');
  const[antibiotics,setAntibiotics]=useState('');
  const[vasopressors,setVasopressors]=useState('');
  const[repeatEndoscopy,setRepeatEndoscopy]=useState('');
  const[surgical,setSurgical]=useState('');
  const[disposition,setDisposition]=useState('');
  const[notes,setNotes]=useState('');

  /* GBS calculation */
  const gbsScore=useMemo(()=>{
    let s=0;
    if(gbsUrea!=null)s+=gbsUrea;
    if(gbsHb!=null)s+=gbsHb;
    if(gbsSbp!=null)s+=gbsSbp;
    if(gbsHr!=null)s+=gbsHr;
    if(gbsMelena)s+=1;if(gbsSyncope)s+=2;
    if(gbsLiverDisease)s+=2;if(gbsCardiacFailure)s+=2;
    return s;
  },[gbsUrea,gbsHb,gbsSbp,gbsHr,gbsMelena,gbsSyncope,gbsLiverDisease,gbsCardiacFailure]);
  const gbsInterp=useMemo(()=>{
    if(gbsScore===0)return{label:'Low risk — outpatient management possible',color:'green'};
    if(gbsScore<=2)return{label:'Low risk — consider early discharge',color:'green'};
    if(gbsScore<=5)return{label:'Moderate risk — admit for endoscopy',color:'amber'};
    return{label:'High risk — urgent endoscopy, ICU/HDU consideration',color:'red'};
  },[gbsScore]);

  /* Rockall score */
  const rockallScore=useMemo(()=>{
    let s=0;
    if(rAge!=null)s+=rAge;if(rShock!=null)s+=rShock;
    if(rComorbidity!=null)s+=rComorbidity;if(rDiagnosis!=null)s+=rDiagnosis;
    if(rStigmata!=null)s+=rStigmata;
    return s;
  },[rAge,rShock,rComorbidity,rDiagnosis,rStigmata]);
  const rockallInterp=useMemo(()=>{
    if(rockallScore<=2)return{label:'Low risk — <5% rebleed, <1% mortality',color:'green'};
    if(rockallScore<=4)return{label:'Moderate risk — consider early discharge vs observation',color:'amber'};
    if(rockallScore<=6)return{label:'High risk — significant rebleed/mortality risk',color:'orange'};
    return{label:'Very high risk — >40% mortality, intensive monitoring',color:'red'};
  },[rockallScore]);

  const haemodynamicShock=parseInt(hr||0)>100&&parseInt(sbp||0)<100;

  const handleSave=async()=>{
    try{
      await api.post('/assessments',{type:'gi-bleed',patientId,encounterId,data:{bleedType,symptoms,onset,estimatedLoss,sbp,hr,haemodynamic,hb,urea,riskFactors,medications,liverDisease,gbs:{urea:gbsUrea,hb:gbsHb,sex:gbsSex,sbp:gbsSbp,hr:gbsHr,melena:gbsMelena,syncope:gbsSyncope,liverDisease:gbsLiverDisease,cardiacFailure:gbsCardiacFailure,score:gbsScore,interp:gbsInterp.label},endoscopy:{done:endoscopyDone,timing:endoscopyTiming,findingType,forrestClass,varicesGrade,treatment:endoscopicTx,ppiProtocol},rockall:{age:rAge,shock:rShock,comorbidity:rComorbidity,diagnosis:rDiagnosis,stigmata:rStigmata,score:rockallScore,interp:rockallInterp.label},management:{resuscitation,bloodProducts,targetHb,antibiotics,vasopressors,repeatEndoscopy,surgical,disposition},notes}});
      onSaved?.();
    }catch(e){console.error(e);}
  };

  const STAGE_LABELS=['Presentation','GBS','Endoscopy','Rockall','Management'];

  return(
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-2xl p-5 shadow-lg">
        <h2 className="text-xl font-bold">GI Bleed Assessment</h2>
        <p className="text-red-100 text-sm mt-1">Glasgow-Blatchford · Forrest · Rockall · Variceal management</p>
      </div>

      {haemodynamicShock&&(
        <div className="bg-red-600 text-white rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-6 h-6 shrink-0"/>
          <div><p className="font-bold">Haemodynamic Shock — HR &gt;100 + SBP &lt;100</p><p className="text-sm text-red-100">Immediate resuscitation · 2 large-bore IV · cross-match · urgent endoscopy</p></div>
        </div>
      )}

      {/* Stage nav */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STAGE_LABELS.map((l,i)=>(
          <button key={i} type="button" onClick={()=>setStage(i)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${stage===i?'bg-red-600 text-white':'bg-red-50 text-red-700 border border-red-200'}`}>{i+1}. {l}</button>
        ))}
      </div>

      {/* Stage 0 — Presentation */}
      {stage===0&&(
        <div className="space-y-4">
          <Section title="Presentation & Haemodynamics" applicable={sec.present} onApplicable={v=>sa('present',v)} accent="red">
            <FL label="Bleed location">
              <Pills options={['Upper GI (UGIB)','Lower GI (LGIB)','Suspected but unclear']} value={bleedType} onChange={setBleedType} accent="red"/>
            </FL>
            <FL label="Presenting symptoms" sub="multi-select">
              <Pills options={['Haematemesis','Coffee-ground vomiting','Melaena','Haematochezia','Rectal bleeding','Syncope/presyncope','Abdominal pain','Anaemia symptoms']} value={symptoms} onChange={setSymptoms} accent="rose" multi/>
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Onset">
                <Pills options={['<6 hours','6–24 hours','>24 hours','Unknown']} value={onset} onChange={setOnset} accent="red"/>
              </FL>
              <FL label="Estimated blood loss">
                <Pills options={['<250 mL','250–500 mL','500–1000 mL','>1000 mL']} value={estimatedLoss} onChange={setEstimatedLoss} accent="red"/>
              </FL>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FL label="SBP (mmHg)"><input type="number" value={sbp} onChange={e=>setSbp(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
              <FL label="Heart rate (bpm)"><input type="number" value={hr} onChange={e=>setHr(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
              <FL label="Haemodynamic status">
                <Pills options={['Stable','Unstable','Shock']} value={haemodynamic} onChange={setHaemodynamic} accent="red"/>
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Haemoglobin (g/dL)"><input type="number" step="0.1" value={hb} onChange={e=>setHb(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
              <FL label="Blood urea (mmol/L)"><input type="number" step="0.1" value={urea} onChange={e=>setUrea(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
            </div>
            <FL label="Risk factors" sub="multi-select">
              <Pills options={['Previous UGIB','NSAIDs/aspirin','Anticoagulants','Steroids','Alcohol excess','Portal hypertension / cirrhosis','Known varices','Peptic ulcer disease','H. pylori infection','Malignancy','Aortic graft (aortoenteric fistula)']} value={riskFactors} onChange={setRiskFactors} accent="orange" multi/>
            </FL>
            <FL label="Anticoagulant / antiplatelet" sub="multi-select">
              <Pills options={['Aspirin','Clopidogrel','DAPT','Warfarin','DOAC (rivaroxaban/apixaban/dabigatran)','Heparin','Low-molecular-weight heparin']} value={medications} onChange={setMedications} accent="amber" multi/>
            </FL>
            <FL label="Liver disease / cirrhosis">
              <Pills options={['None','Suspected','Known Child A','Known Child B','Known Child C']} value={liverDisease} onChange={setLiverDisease} accent="amber"/>
            </FL>
            <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
              <p className={`font-semibold ${A.amber.text}`}>India context</p>
              <p className="text-gray-600 mt-1">High NSAID use (OTC availability), alcohol-related portal hypertension, H. pylori seroprevalence ~60–80%. Typhoid-related ileal perforation can mimic LGIB. Ensure hepatitis B/C screen in cirrhotic bleeds.</p>
            </div>
          </Section>
        </div>
      )}

      {/* Stage 1 — GBS */}
      {stage===1&&(
        <div className="space-y-4">
          <Section title="Glasgow-Blatchford Score" applicable={sec.gbs} onApplicable={v=>sa('gbs',v)} accent="rose">
            <p className="text-xs text-gray-500">Pre-endoscopy risk stratification — score ≥1 warrants inpatient endoscopy</p>
            <div className="space-y-2">
              <FL label="Patient sex">
                <Pills options={['Male','Female']} value={gbsSex} onChange={setGbsSex} accent="rose"/>
              </FL>
              <ScoreRow label="Blood urea (mmol/L)" options={[['<6.5',0],['6.5–7.9',2],['8.0–9.9',3],['10.0–24.9',4],['≥25',6]]} value={gbsUrea} onChange={setGbsUrea} accent="rose"/>
              <ScoreRow label={`Haemoglobin (${gbsSex==='Male'?'Male':'Female/unspecified'})`}
                options={gbsSex==='Male'?[['≥13 g/dL',0],['12.0–12.9',1],['10.0–11.9',3],['<10',6]]:[['≥12 g/dL',0],['10.0–11.9',1],['<10',6]]}
                value={gbsHb} onChange={setGbsHb} accent="rose"/>
              <ScoreRow label="SBP (mmHg)" options={[['≥110',0],['100–109',1],['90–99',2],['<90',3]]} value={gbsSbp} onChange={setGbsSbp} accent="rose"/>
              <ScoreRow label="Heart rate ≥100" options={[['No',0],['Yes',1]]} value={gbsHr} onChange={setGbsHr} accent="rose"/>
              <div className="grid grid-cols-2 gap-2">
                {[['Melaena on presentation',gbsMelena,setGbsMelena,1],['Syncope',gbsSyncope,setGbsSyncope,2],['Liver disease',gbsLiverDisease,setGbsLiverDisease,2],['Cardiac failure',gbsCardiacFailure,setGbsCardiacFailure,2]].map(([lbl,val,setter,pts])=>(
                  <button key={lbl} type="button" onClick={()=>setter(!val)} className={`p-2.5 rounded-lg border text-sm font-medium text-left transition-all ${val?A.rose.active:A.rose.pill}`}>{lbl} (+{pts}pts) {val?'✓':''}</button>
                ))}
              </div>
            </div>
            <div className={`rounded-xl border-2 ${A[gbsInterp.color]?.border||'border-gray-300'} ${A[gbsInterp.color]?.bg||'bg-gray-50'} p-4`}>
              <div className="flex items-center justify-between">
                <span className={`text-2xl font-black ${A[gbsInterp.color]?.text||'text-gray-700'}`}>GBS: {gbsScore}</span>
                <span className={`text-sm font-semibold ${A[gbsInterp.color]?.text||'text-gray-700'}`}>{gbsInterp.label}</span>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* Stage 2 — Endoscopy */}
      {stage===2&&(
        <div className="space-y-4">
          <Section title="Endoscopy & Forrest Classification" applicable={sec.endo} onApplicable={v=>sa('endo',v)} accent="violet">
            <FL label="Endoscopy performed">
              <Pills options={['Yes','Not yet','Declined','Not indicated']} value={endoscopyDone} onChange={setEndoscopyDone} accent="violet"/>
            </FL>
            {endoscopyDone==='Yes'&&(
              <>
                <FL label="Timing of endoscopy">
                  <Pills options={['Emergency (<12h)','Early (12–24h)','Elective (>24h)']} value={endoscopyTiming} onChange={setEndoscopyTiming} accent="violet"/>
                </FL>
                <FL label="Endoscopic finding type">
                  <Pills options={['Peptic ulcer (PU)','Oesophageal varices','Gastric varices','Portal hypertensive gastropathy','Mallory-Weiss tear','Dieulafoy lesion','Oesophagitis/erosions','Angiodysplasia','Tumour/malignancy','Colonic diverticulosis','Colitis','Normal']} value={findingType} onChange={setFindingType} accent="violet"/>
                </FL>
                {findingType==='Peptic ulcer (PU)'&&(
                  <FL label="Forrest classification">
                    <div className="space-y-1">
                      {[
                        ['Ia — Active arterial spurting','High (rebleed ~55%)','red'],
                        ['Ib — Active oozing','High (rebleed ~55%)','red'],
                        ['IIa — Non-bleeding visible vessel','High (rebleed ~43%)','orange'],
                        ['IIb — Adherent clot','Intermediate (rebleed ~22%)','amber'],
                        ['IIc — Flat pigmented spot','Low (rebleed ~10%)','green'],
                        ['III — Clean-based ulcer','Very low (rebleed ~5%)','green'],
                      ].map(([lbl,risk,col])=>(
                        <button key={lbl} type="button" onClick={()=>setForrestClass(forrestClass===lbl?'':lbl)} className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all flex justify-between items-center ${forrestClass===lbl?A[col].active:A[col].pill}`}>
                          <span>{lbl}</span><span className="opacity-75">{risk}</span>
                        </button>
                      ))}
                    </div>
                    {(forrestClass.startsWith('Ia')||forrestClass.startsWith('Ib')||forrestClass.startsWith('IIa'))&&(
                      <div className="mt-2 bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-700 font-medium">
                        High-risk stigmata — endoscopic haemostasis mandatory. Dual therapy (injection + thermal/clip). IV PPI bolus + infusion post-endoscopy.
                      </div>
                    )}
                  </FL>
                )}
                {(findingType==='Oesophageal varices'||findingType==='Gastric varices')&&(
                  <FL label="Variceal grade">
                    <Pills options={['Grade I — Small, straight','Grade II — Tortuous','Grade III — Large, occluding lumen','Gastric varices (GOV1)','Gastric varices (GOV2/IGV)']} value={varicesGrade} onChange={setVaricesGrade} accent="violet"/>
                  </FL>
                )}
                <FL label="Endoscopic treatment" sub="multi-select">
                  <Pills options={['Injection sclerotherapy','Adrenaline injection','Thermal coagulation','Haemoclip','Band ligation (variceal)','Cyanoacrylate (gastric varices)','APC (angiodysplasia)','No treatment required']} value={endoscopicTx} onChange={setEndoscopicTx} accent="violet" multi/>
                </FL>
              </>
            )}
            <FL label="PPI protocol post-endoscopy">
              <Pills options={['IV PPI bolus + 72h infusion (high-risk)','IV PPI bolus → oral (intermediate)','Oral PPI bd (low-risk / prophylaxis)','Not indicated']} value={ppiProtocol} onChange={setPpiProtocol} accent="violet"/>
            </FL>
          </Section>
        </div>
      )}

      {/* Stage 3 — Rockall */}
      {stage===3&&(
        <div className="space-y-4">
          <Section title="Rockall Score (post-endoscopy)" applicable={sec.rockall} onApplicable={v=>sa('rockall',v)} accent="orange">
            <p className="text-xs text-gray-500">Complete post-endoscopy for rebleed/mortality risk stratification</p>
            <div className="space-y-2">
              <ScoreRow label="Age" options={[['<60',0],['60–79',1],['≥80',2]]} value={rAge} onChange={setRAge} accent="orange"/>
              <ScoreRow label="Shock" options={[['No shock (SBP≥100, HR<100)',0],['Tachycardia (HR≥100, SBP≥100)',1],['Hypotension (SBP<100)',2]]} value={rShock} onChange={setRShock} accent="orange"/>
              <ScoreRow label="Comorbidity" options={[['None',0],['Cardiac failure / IHD / major illness',2],['Renal / hepatic failure / disseminated malignancy',3]]} value={rComorbidity} onChange={setRComorbidity} accent="orange"/>
              <ScoreRow label="Diagnosis" options={[['Mallory-Weiss / no lesion found',0],['All other diagnoses',1],['GI malignancy',2]]} value={rDiagnosis} onChange={setRDiagnosis} accent="orange"/>
              <ScoreRow label="Stigmata of recent haemorrhage" options={[['None / dark spot only',0],['Blood in upper GI tract, adherent clot, visible / spurting vessel',2]]} value={rStigmata} onChange={setRStigmata} accent="orange"/>
            </div>
            <div className={`rounded-xl border-2 ${A[rockallInterp.color]?.border||'border-gray-300'} ${A[rockallInterp.color]?.bg||'bg-gray-50'} p-4`}>
              <div className="flex items-center justify-between">
                <span className={`text-2xl font-black ${A[rockallInterp.color]?.text||'text-gray-700'}`}>Rockall: {rockallScore}</span>
                <span className={`text-sm font-semibold ${A[rockallInterp.color]?.text||'text-gray-700'} max-w-xs text-right`}>{rockallInterp.label}</span>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* Stage 4 — Management */}
      {stage===4&&(
        <div className="space-y-4">
          <Section title="Management & Disposition" applicable={sec.mgmt} onApplicable={v=>sa('mgmt',v)} accent="red">
            <FL label="Resuscitation measures" sub="multi-select">
              <Pills options={['2 large-bore IV cannulae','IV crystalloid resuscitation','Urinary catheter','NG tube','O2 therapy','NBM / nil by mouth']} value={resuscitation} onChange={setResuscitation} accent="red" multi/>
            </FL>
            <FL label="Blood products" sub="multi-select">
              <Pills options={['PRBC transfusion','FFP','Platelets','Cryoprecipitate','Vitamin K','Protamine (reversal)','DOAC reversal agent']} value={bloodProducts} onChange={setBloodProducts} accent="red" multi/>
            </FL>
            <FL label="Target Hb post-transfusion">
              <Pills options={['≥7 g/dL (restrictive — non-variceal)','≥8 g/dL (liberal — cardiovascular disease)','≥7–8 g/dL (variceal — avoid over-transfusion)']} value={targetHb} onChange={setTargetHb} accent="red"/>
            </FL>
            <Gate label="Prophylactic antibiotics (variceal bleed / cirrhosis)?" value={antibiotics} onChange={setAntibiotics} accent="amber">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                IV ceftriaxone 1g OD × 7 days (preferred) or oral norfloxacin 400mg bd × 7 days. Reduces mortality and bacterial infections in cirrhotic UGIB.
              </div>
            </Gate>
            <Gate label="Vasoactive agents (variceal bleed)?" value={vasopressors} onChange={setVasopressors} accent="violet">
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-sm text-violet-800">
                Terlipressin 2mg IV q4h (preferred — only agent with mortality benefit). Or octreotide 50mcg bolus + 50mcg/h infusion × 5 days.
              </div>
            </Gate>
            <Gate label="Repeat/rescue endoscopy required?" value={repeatEndoscopy} onChange={setRepeatEndoscopy} accent="orange">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
                TIPS if variceal rebleed after 2nd endoscopy fails. Surgery (oversewing/Billroth) for non-variceal rebleed not amenable to endoscopic control.
              </div>
            </Gate>
            <Gate label="Surgical/radiological intervention required?" value={surgical} onChange={setSurgical} accent="red">
              <div className="space-y-2">
                <Pills options={['Angiography + embolisation','Surgical ligation','TIPS','Portosystemic shunt','Laparotomy']} value={surgical==='Yes'?[]:undefined} onChange={()=>{}} accent="red" multi/>
                <p className="text-xs text-gray-500">Select appropriate intervention</p>
              </div>
            </Gate>
            <FL label="Disposition">
              <Pills options={['ICU','HDU','GI ward','Discharge with follow-up','Discharge — low risk GBS 0']} value={disposition} onChange={setDisposition} accent="red"/>
            </FL>
            <FL label="Clinical notes"><textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Endoscopy findings, plan, escalation decisions..."/></FL>
          </Section>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center pt-2">
        <button type="button" onClick={()=>setStage(s=>Math.max(0,s-1))} disabled={stage===0} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 disabled:opacity-40">← Previous</button>
        {stage<4?(<button type="button" onClick={()=>setStage(s=>Math.min(4,s+1))} className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold">Next →</button>):(
          <button type="button" onClick={handleSave} className="px-6 py-2 rounded-lg bg-red-600 text-white text-sm font-bold shadow">Save Assessment</button>
        )}
      </div>
    </div>
  );
}
