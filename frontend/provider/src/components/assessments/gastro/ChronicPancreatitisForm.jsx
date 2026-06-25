/**
 * @shared-pool
 * ChronicPancreatitisForm — Chronic pancreatitis & exocrine insufficiency assessment
 * Cambridge classification, M-ANNHEIM, exocrine/endocrine function, tropical calcific pancreatitis
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */

import React, { useState, useMemo } from 'react';
import { Lock, ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  indigo: { bg:'bg-indigo-50', border:'border-indigo-300', text:'text-indigo-700', pill:'bg-indigo-100 border-indigo-400 text-indigo-800', active:'bg-indigo-600 text-white border-indigo-600' },
  violet: { bg:'bg-violet-50', border:'border-violet-300', text:'text-violet-700', pill:'bg-violet-100 border-violet-400 text-violet-800', active:'bg-violet-600 text-white border-violet-600' },
  blue:   { bg:'bg-blue-50',   border:'border-blue-300',   text:'text-blue-700',   pill:'bg-blue-100 border-blue-400 text-blue-800',   active:'bg-blue-600 text-white border-blue-600' },
  amber:  { bg:'bg-amber-50',  border:'border-amber-300',  text:'text-amber-700',  pill:'bg-amber-100 border-amber-400 text-amber-800',  active:'bg-amber-500 text-white border-amber-500' },
  orange: { bg:'bg-orange-50', border:'border-orange-300', text:'text-orange-700', pill:'bg-orange-100 border-orange-400 text-orange-800', active:'bg-orange-500 text-white border-orange-500' },
  red:    { bg:'bg-red-50',    border:'border-red-300',    text:'text-red-700',    pill:'bg-red-100 border-red-400 text-red-800',    active:'bg-red-600 text-white border-red-600' },
  green:  { bg:'bg-green-50',  border:'border-green-300',  text:'text-green-700',  pill:'bg-green-100 border-green-400 text-green-800',  active:'bg-green-600 text-white border-green-600' },
  gray:   { bg:'bg-gray-50',   border:'border-gray-300',   text:'text-gray-700',   pill:'bg-gray-100 border-gray-400 text-gray-800',   active:'bg-gray-600 text-white border-gray-600' },
};

function Pills({options,value,onChange,accent='indigo',multi=false}){
  const c=A[accent];const sel=multi?(Array.isArray(value)?value:[]):value;
  const toggle=opt=>{if(multi){const a=Array.isArray(sel)?sel:[];onChange(a.includes(opt)?a.filter(x=>x!==opt):[...a,opt]);}else onChange(sel===opt?'':opt);};
  return(<div className="flex flex-wrap gap-2">{options.map(opt=>{const active=multi?sel.includes(opt):sel===opt;return<button key={opt} type="button" onClick={()=>toggle(opt)} className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${active?c.active:c.pill}`}>{opt}</button>;})}</div>);
}
function FL({label,sub,children}){return(<div className="space-y-1"><label className="block text-sm font-semibold text-gray-700">{label}{sub&&<span className="ml-1 text-xs font-normal text-gray-500">{sub}</span>}</label>{children}</div>);}
function Gate({label,value,onChange,accent='indigo',children}){
  const c=A[accent];
  return(<div className={`rounded-lg border ${c.border} ${c.bg} p-3`}><div className="flex items-center justify-between flex-wrap gap-2"><span className="text-sm font-medium text-gray-700">{label}</span><div className="flex gap-2">{['Yes','No'].map(opt=>(<button key={opt} type="button" onClick={()=>onChange(value===opt?'':opt)} className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all ${value===opt?c.active:c.pill}`}>{opt}</button>))}</div></div>{value==='Yes'&&children&&<div className="mt-3 space-y-3">{children}</div>}</div>);
}
function Section({title,applicable,onApplicable,accent='indigo',children}){
  const c=A[accent];const[open,setOpen]=useState(true);
  if(applicable==='N/A')return(<div className={`rounded-xl border-2 border-dashed ${c.border} p-4 flex items-center gap-3 opacity-60`}><Lock className="w-5 h-5 text-gray-400"/><span className="text-sm text-gray-500 font-medium">{title} — Not applicable · section locked</span><button type="button" onClick={()=>onApplicable('Applicable')} className="ml-auto text-xs text-blue-600 underline">Unlock</button></div>);
  return(<div className={`rounded-xl border-2 ${c.border} overflow-hidden`}><div className={`${c.bg} px-4 py-3 flex items-center justify-between flex-wrap gap-2`}><span className={`font-bold text-base ${c.text}`}>{title}</span><div className="flex items-center gap-2"><div className="flex gap-1">{['Applicable','N/A'].map(v=>(<button key={v} type="button" onClick={()=>onApplicable(v)} className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold transition-all ${v===applicable?c.active:c.pill}`}>{v}</button>))}</div><button type="button" onClick={()=>setOpen(o=>!o)} className={`${c.text} p-1`}>{open?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</button></div></div>{open&&applicable==='Applicable'&&<div className="p-4 space-y-4">{children}</div>}</div>);
}

export default function ChronicPancreatitisForm({patientId,encounterId,onSaved}){
  const[sec,setSec]=useState({aetiology:'Applicable',cambridge:'Applicable',exocrine:'Applicable',endocrine:'Applicable',pain:'Applicable',complications:'Applicable',treatment:'Applicable'});
  const sa=(k,v)=>setSec(s=>({...s,[k]:v}));

  /* Aetiology */
  const[aetiology,setAetiology]=useState([]);
  const[tropicalCP,setTropicalCP]=useState('');
  const[geneticMutation,setGeneticMutation]=useState([]);
  const[duration,setDuration]=useState('');
  const[acuteEpisodes,setAcuteEpisodes]=useState('');

  /* Cambridge Classification */
  const[cambridgeGrade,setCambridgeGrade]=useState('');
  const[calcifications,setCalcifications]=useState('');
  const[ductDilation,setDuctDilation]=useState('');
  const[parenchyma,setParenchyma]=useState('');
  const[imagingModality,setImagingModality]=useState('');

  /* Exocrine insufficiency (EPI) */
  const[epiPresent,setEpiPresent]=useState('');
  const[epiSymptoms,setEpiSymptoms]=useState([]);
  const[feceElastase,setFeceElastase]=useState('');
  const[steatorrhoea,setSteatorrhoea]=useState('');
  const[nutritionalStatus,setNutritionalStatus]=useState('');
  const[vitamins,setVitamins]=useState([]);

  /* Endocrine / CFRD */
  const[pancreatogenicDM,setPancreatogenicDM]=useState('');
  const[hba1c,setHba1c]=useState('');
  const[insulinRequired,setInsulinRequired]=useState('');
  const[hypoglycaemiaRisk,setHypoglycaemiaRisk]=useState('');

  /* Pain */
  const[painPattern,setPainPattern]=useState('');
  const[nrsScore,setNrsScore]=useState('');
  const[opioidUse,setOpioidUse]=useState('');
  const[painMechanism,setPainMechanism]=useState([]);
  const[celiacPlexus,setCeliacPlexus]=useState('');

  /* Complications */
  const[complications,setComplications]=useState([]);
  const[pseudocyst,setPseudocyst]=useState('');
  const[splanchnicVein,setSplanchnicVein]=useState('');
  const[malignancySuspected,setMalignancySuspected]=useState('');

  /* Treatment */
  const[abstinence,setAbstinence]=useState('');
  const[pert,setPert]=useState('');
  const[pertDose,setPertDose]=useState('');
  const[analgesics,setAnalgesics]=useState([]);
  const[endoscopicTx,setEndoscopicTx]=useState([]);
  const[surgicalTx,setSurgicalTx]=useState('');
  const[nutritionSupport,setNutritionSupport]=useState([]);
  const[notes,setNotes]=useState('');

  const handleSave=async()=>{
    try{
      await api.post('/assessments',{type:'chronic-pancreatitis',patientId,encounterId,data:{aetiology,tropicalCP,geneticMutation,duration,acuteEpisodes,cambridge:{grade:cambridgeGrade,calcifications,ductDilation,parenchyma,imagingModality},epi:{present:epiPresent,symptoms:epiSymptoms,feceElastase,steatorrhoea,nutritionalStatus,vitamins},endocrine:{pancreatogenicDM,hba1c,insulinRequired,hypoglycaemiaRisk},pain:{pattern:painPattern,nrs:nrsScore,opioidUse,mechanism:painMechanism,celiacPlexus},complications:{list:complications,pseudocyst,splanchnicVein,malignancySuspected},treatment:{abstinence,pert,pertDose,analgesics,endoscopic:endoscopicTx,surgical:surgicalTx,nutrition:nutritionSupport},notes}});
      onSaved?.();
    }catch(e){console.error(e);}
  };

  return(
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl p-5 shadow-lg">
        <h2 className="text-xl font-bold">Chronic Pancreatitis Assessment</h2>
        <p className="text-indigo-100 text-sm mt-1">Cambridge Classification · Exocrine insufficiency · Pancreatogenic DM · Tropical calcific pancreatitis</p>
      </div>

      {malignancySuspected==='Yes'&&(
        <div className="bg-red-600 text-white rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <AlertTriangle className="w-6 h-6 shrink-0"/>
          <div><p className="font-bold">Malignancy Suspected — Urgent MDT referral</p><p className="text-sm text-red-100">CA 19-9, EUS-FNA, staging CT. Chronic pancreatitis increases pancreatic cancer risk ~16× (especially hereditary).</p></div>
        </div>
      )}

      <Section title="Aetiology" applicable={sec.aetiology} onApplicable={v=>sa('aetiology',v)} accent="indigo">
        <FL label="Aetiology (TIGAR-O classification)" sub="multi-select">
          <Pills options={['Toxic/metabolic — Alcohol (most common worldwide)','Toxic/metabolic — Smoking','Toxic/metabolic — Hypercalcaemia','Toxic/metabolic — Hyperlipidaemia','Idiopathic — Early onset (<35y)','Idiopathic — Late onset (>35y)','Genetic — CFTR mutation','Genetic — PRSS1 (hereditary pancreatitis)','Genetic — SPINK1 mutation','Autoimmune — Type 1 (IgG4)','Autoimmune — Type 2','Recurrent severe acute pancreatitis','Obstructive — Pancreatic divisum','Obstructive — Ampullary/ductal stricture','Tropical calcific pancreatitis (TCP)']} value={aetiology} onChange={setAetiology} accent="indigo" multi/>
        </FL>
        {aetiology.includes('Tropical calcific pancreatitis (TCP)')&&(
          <>
            <FL label="Tropical calcific pancreatitis (TCP) features">
              <Pills options={['Young age (<30y) at onset','Rural / low socioeconomic background','Cassava consumption (cyanogen hypothesis)','SPINK1 mutation — screened','Large intraductal calculi','Early-onset diabetes (type 3c)','Severe pain crises','Nutritional deficiency — chronic']} value={tropicalCP} onChange={setTropicalCP} accent="amber"/>
            </FL>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              TCP is India-specific. Highest prevalence in Kerala, Karnataka, Tamil Nadu. Previously called fibrocalculous pancreatic diabetes (FCPD) when diabetes dominates. Distinct from alcoholic CP. Pancreatic ductal stone burden often massive.
            </div>
          </>
        )}
        <FL label="Genetic mutations screened" sub="multi-select">
          <Pills options={['PRSS1 (cationic trypsinogen — hereditary pancreatitis)','SPINK1 (serine protease inhibitor)','CFTR (cystic fibrosis transmembrane)','CTRC (chymotrypsinogen C)','Not screened']} value={geneticMutation} onChange={setGeneticMutation} accent="violet" multi/>
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Duration of disease">
            <Pills options={['<2 years','2–5 years','5–10 years','>10 years']} value={duration} onChange={setDuration} accent="indigo"/>
          </FL>
          <FL label="Acute-on-chronic episodes">
            <Pills options={['None','1–2 episodes','3–5 episodes','>5 episodes','Chronic constant']} value={acuteEpisodes} onChange={setAcuteEpisodes} accent="indigo"/>
          </FL>
        </div>
        <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
          <p className={`font-semibold ${A.amber.text}`}>India context</p>
          <p className="text-gray-600 mt-1">India has highest global burden of tropical calcific pancreatitis (TCP). Alcohol CP increasingly common (rising consumption). SPINK1 mutations prevalent in South Asia. Autoimmune pancreatitis (AIP type 1, IgG4) — responds to steroids — do not operate. Malnutrition-related enzyme deficiency in paediatric patients.</p>
        </div>
      </Section>

      <Section title="Cambridge Classification (Imaging)" applicable={sec.cambridge} onApplicable={v=>sa('cambridge',v)} accent="blue">
        <FL label="Imaging modality used">
          <Pills options={['CECT abdomen','MRI / MRCP','Endoscopic ultrasound (EUS)','Plain AXR (calcifications)','ERCP (duct morphology)']} value={imagingModality} onChange={setImagingModality} accent="blue"/>
        </FL>
        <FL label="Cambridge grade">
          <div className="space-y-1">
            {[
              ['Grade 0 — Normal','green'],
              ['Grade 1 — Equivocal: <3 abnormal branches','green'],
              ['Grade 2 — Mild: ≥3 abnormal side branches, normal main duct','amber'],
              ['Grade 3 — Moderate: abnormal main duct + side branches','orange'],
              ['Grade 4 — Severe: Grade 3 + one or more of: large cavity, obstruction, filling defects, severe dilatation, contour irregularity','red'],
            ].map(([lbl,col])=>(
              <button key={lbl} type="button" onClick={()=>setCambridgeGrade(cambridgeGrade===lbl?'':lbl)} className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${cambridgeGrade===lbl?A[col].active:A[col].pill}`}>{lbl}</button>
            ))}
          </div>
        </FL>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Intraductal calcifications">
            <Pills options={['None','Fine scattered','Coarse (TCP typical)','Large stone(s)','Pancreatic head stone (obstructing)']} value={calcifications} onChange={setCalcifications} accent="blue"/>
          </FL>
          <FL label="Main duct diameter (mm)">
            <input type="number" step="0.1" value={ductDilation} onChange={e=>setDuctDilation(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder=">3mm = dilated"/>
          </FL>
          <FL label="Parenchyma">
            <Pills options={['Normal','Atrophy','Focal atrophy','Fibrosis','Heterogeneous','Calcification']} value={parenchyma} onChange={setParenchyma} accent="blue"/>
          </FL>
        </div>
      </Section>

      <Section title="Exocrine Pancreatic Insufficiency (EPI)" applicable={sec.exocrine} onApplicable={v=>sa('exocrine',v)} accent="orange">
        <FL label="EPI present?">
          <Pills options={['No — exocrine function preserved','Mild EPI — compensated','Moderate EPI — symptomatic','Severe EPI — steatorrhoea + malnutrition']} value={epiPresent} onChange={setEpiPresent} accent="orange"/>
        </FL>
        <FL label="EPI symptoms" sub="multi-select">
          <Pills options={['Steatorrhoea (pale, greasy, malodorous stools)','Oily diarrhoea','Abdominal bloating / flatulence','Weight loss despite adequate intake','Fat-soluble vitamin deficiency (A/D/E/K)','Muscle wasting / sarcopaenia','Nutritional deficiencies']} value={epiSymptoms} onChange={setEpiSymptoms} accent="orange" multi/>
        </FL>
        <FL label="Faecal elastase-1 (FE-1)">
          <Pills options={['Not tested','Normal (>200 µg/g — EPI excluded)','Moderate EPI (100–200 µg/g)','Severe EPI (<100 µg/g — PERT required)','Falsely low (diarrhoea / dilution)']} value={feceElastase} onChange={setFeceElastase} accent="orange"/>
        </FL>
        <FL label="Steatorrhoea (72h faecal fat — if done)">
          <Pills options={['Not done','Normal (<7g/day on 100g fat diet)','Mild (7–15 g/day)','Moderate (15–30 g/day)','Severe (>30 g/day)']} value={steatorrhoea} onChange={setSteatorrhoea} accent="orange"/>
        </FL>
        <FL label="Nutritional status">
          <Pills options={['Well-nourished (BMI >20)','Malnourished (BMI <18.5)','Sarcopaenic','Severe malnutrition — dietitian referral']} value={nutritionalStatus} onChange={setNutritionalStatus} accent="amber"/>
        </FL>
        <FL label="Vitamin deficiencies" sub="multi-select">
          <Pills options={['Vitamin A (night blindness)','Vitamin D (check 25-OH-VitD)','Vitamin E','Vitamin K (coagulopathy)','Vitamin B12','Zinc','Magnesium']} value={vitamins} onChange={setVitamins} accent="amber" multi/>
        </FL>
      </Section>

      <Section title="Pancreatogenic Diabetes (Type 3c)" applicable={sec.endocrine} onApplicable={v=>sa('endocrine',v)} accent="amber">
        <FL label="Diabetes mellitus / IGT">
          <Pills options={['No diabetes','Impaired glucose tolerance (IGT)','Type 3c DM — on oral agents','Type 3c DM — on insulin','Fibrocalculous pancreatic diabetes (FCPD — TCP variant)','Pre-existing Type 2 DM']} value={pancreatogenicDM} onChange={setPancreatogenicDM} accent="amber"/>
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="HbA1c (%)"><input type="number" step="0.1" value={hba1c} onChange={e=>setHba1c(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm"/></FL>
          <FL label="Insulin therapy">
            <Pills options={['Not required','Basal insulin only','Basal-bolus regime','Insulin pump']} value={insulinRequired} onChange={setInsulinRequired} accent="amber"/>
          </FL>
        </div>
        <FL label="Hypoglycaemia risk">
          <Pills options={['Low','Moderate — glucagon deficiency (alpha cell loss)','High — unpredictable swings (brittle)','Hypoglycaemia unawareness']} value={hypoglycaemiaRisk} onChange={setHypoglycaemiaRisk} accent="red"/>
        </FL>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          Type 3c DM: Both alpha (glucagon) and beta (insulin) cells destroyed → high hypoglycaemia risk. Avoid sulphonylureas. Titrate insulin carefully. PERT improves glycaemic control (gut incretin mechanism).
        </div>
      </Section>

      <Section title="Pain Assessment" applicable={sec.pain} onApplicable={v=>sa('pain',v)} accent="violet">
        <FL label="Pain pattern">
          <Pills options={['No significant pain (burnt-out CP)','Type A — intermittent pain episodes with pain-free intervals','Type B — persistent pain with severe exacerbations','Constant pain — opioid-dependent','Pain-free — EPI/DM predominant presentation']} value={painPattern} onChange={setPainPattern} accent="violet"/>
        </FL>
        <FL label="NRS pain score (0–10)">
          <div className="flex flex-wrap gap-1">
            {[0,1,2,3,4,5,6,7,8,9,10].map(n=>(
              <button key={n} type="button" onClick={()=>setNrsScore(nrsScore===n?'':n)} className={`w-9 h-9 rounded-lg border text-sm font-bold transition-all ${nrsScore===n?(n<=3?A.green.active:n<=6?A.amber.active:A.red.active):(n<=3?A.green.pill:n<=6?A.amber.pill:A.red.pill)}`}>{n}</button>
            ))}
          </div>
        </FL>
        <FL label="Opioid use">
          <Pills options={['No opioids','PRN tramadol/codeine','Regular weak opioid','Regular strong opioid (morphine/oxycodone)','High-dose opioid — dependent','Opioid hyperalgesia concern']} value={opioidUse} onChange={setOpioidUse} accent="red"/>
        </FL>
        <FL label="Pain mechanisms contributing" sub="multi-select">
          <Pills options={['Ductal hypertension (obstruction by stone/stricture)','Parenchymal hypertension','Neuropathic (perineural inflammation)','Inflammatory exacerbation (acute-on-chronic)','Central sensitisation','Psychological component','Coeliac plexus activation']} value={painMechanism} onChange={setPainMechanism} accent="violet" multi/>
        </FL>
        <FL label="Coeliac plexus block / neurolysis considered?">
          <Pills options={['Not yet considered','Considered — awaiting EUS assessment','EUS-guided coeliac block performed','CT-guided neurolysis performed','Failed — no benefit']} value={celiacPlexus} onChange={setCeliacPlexus} accent="violet"/>
        </FL>
      </Section>

      <Section title="Complications" applicable={sec.complications} onApplicable={v=>sa('complications',v)} accent="red">
        <FL label="Complications" sub="multi-select">
          <Pills options={['Pancreatic pseudocyst','Pancreatic ductal stricture','CBD stricture (biliary obstruction)','Duodenal obstruction','Splenic vein thrombosis (sinistral portal hypertension)','Portal / SMV thrombosis','Pancreatic ascites (ductal leak)','Pleural effusion (pancreatico-pleural fistula)','Pancreatic exocrine insufficiency (EPI)','Type 3c DM','Pancreatic malignancy (risk ×16)','Osteoporosis (chronic malabsorption + alcohol)']} value={complications} onChange={setComplications} accent="red" multi/>
        </FL>
        {complications.includes('Pancreatic pseudocyst')&&(
          <FL label="Pseudocyst details">
            <Pills options={['Asymptomatic — surveillance','Symptomatic — expanding (>6cm)','Infected','EUS-guided transgastric drainage performed','Surgically drained']} value={pseudocyst} onChange={setPseudocyst} accent="orange"/>
          </FL>
        )}
        <FL label="Malignancy suspected?">
          <Pills options={['No','Yes — CA 19-9 elevated, new mass on imaging','EUS-FNA ordered','MDT referral sent']} value={malignancySuspected} onChange={setMalignancySuspected} accent="red"/>
        </FL>
      </Section>

      <Section title="Treatment" applicable={sec.treatment} onApplicable={v=>sa('treatment',v)} accent="green">
        <FL label="Lifestyle — abstinence">
          <Pills options={['Alcohol cessation — complete abstinence mandatory','Smoking cessation — accelerates disease progression','Both alcohol + smoking cessation','De-addiction referral made','Abstinent — confirmed']} value={abstinence} onChange={setAbstinence} accent="green"/>
        </FL>
        <FL label="Pancreatic enzyme replacement therapy (PERT)">
          <Pills options={['Not required (EPI absent)','Started — Creon 25,000 (standard)','Creon 25,000 with main meals + 10,000 with snacks','Dose escalated — Creon 40,000–50,000 per meal','PERT inadequate — add PPI (reduces acid inactivation)','Response monitored (weight, steatorrhoea)']} value={pert} onChange={setPert} accent="green"/>
        </FL>
        <FL label="PERT dose / frequency">
          <input type="text" value={pertDose} onChange={e=>setPertDose(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Creon 25,000 × 3 capsules with main meals, 1 with snacks"/>
        </FL>
        <FL label="Analgesia" sub="multi-select">
          <Pills options={['Paracetamol (1st line — scheduled)','NSAIDs (short-term — avoid chronic use)','Pregabalin / gabapentin (neuropathic component)','Low-dose amitriptyline (central sensitisation)','Tramadol (2nd line)','Strong opioid (last resort)','Pain specialist referral','Multidisciplinary pain programme']} value={analgesics} onChange={setAnalgesics} accent="amber" multi/>
        </FL>
        <FL label="Endoscopic treatment" sub="multi-select">
          <Pills options={['ESWL (extracorporeal shockwave lithotripsy) — pancreatic stones','ERCP + pancreatic sphincterotomy','Pancreatic duct stenting (stricture)','EUS-guided pseudocyst drainage','EUS-guided coeliac plexus block','Biliary stenting (CBD stricture)']} value={endoscopicTx} onChange={setEndoscopicTx} accent="blue" multi/>
        </FL>
        <FL label="Surgical options">
          <Pills options={['Not required','Puestow (lateral pancreaticojejunostomy — dilated duct ≥7mm)','Frey (coring + lateral pancreaticojejunostomy)','Beger (duodenum-preserving pancreatic head resection)','Whipple (pancreaticoduodenectomy — head mass)','Distal pancreatectomy','Total pancreatectomy + islet autotransplantation (TPIAT)','Splanchnic denervation (thoracoscopic)']} value={surgicalTx} onChange={setSurgicalTx} accent="violet"/>
        </FL>
        <FL label="Nutritional support" sub="multi-select">
          <Pills options={['Dietitian referral','High-calorie high-protein diet','Fat-soluble vitamin supplementation (A/D/E/K)','Calcium supplementation','Enteral feeding (NGT/NJT) — severe malnutrition','TPN — if enteral not tolerated','Bone density (DEXA) — osteoporosis screening']} value={nutritionSupport} onChange={setNutritionSupport} accent="green" multi/>
        </FL>
        <FL label="Clinical notes"><textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Cambridge grade findings, PERT response, pain plan, ESWL/ERCP outcome..."/></FL>
        <button type="button" onClick={handleSave} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow">Save Assessment</button>
      </Section>
    </div>
  );
}
