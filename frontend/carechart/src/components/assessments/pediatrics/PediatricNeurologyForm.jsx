/**
 * @shared-pool
 * PediatricNeurologyForm — Pediatric Neurology Assessment
 * Febrile seizures (AAP criteria), meningitis/encephalitis workup,
 * GMFCS (Cerebral Palsy), Lennox-Gastaut, West syndrome, neurocysticercosis,
 * developmental regression, headache (migraine vs raised ICP),
 * ADEM, childhood stroke, neuromuscular disorders
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useMemo } from 'react';
import { Lock, AlertTriangle, Brain } from 'lucide-react';
import api from '../../../api/client';

const A = {
  violet: { bg:'bg-violet-50',  border:'border-violet-300',  text:'text-violet-700',
            pill:'bg-violet-100 border-violet-400 text-violet-800',
            active:'bg-violet-600 text-white border-violet-600' },
  indigo: { bg:'bg-indigo-50',  border:'border-indigo-300',  text:'text-indigo-700',
            pill:'bg-indigo-100 border-indigo-400 text-indigo-800',
            active:'bg-indigo-600 text-white border-indigo-600' },
  red:    { bg:'bg-red-50',     border:'border-red-300',     text:'text-red-700',
            pill:'bg-red-100 border-red-400 text-red-800',
            active:'bg-red-600 text-white border-red-600' },
  amber:  { bg:'bg-amber-50',   border:'border-amber-300',   text:'text-amber-700',
            pill:'bg-amber-100 border-amber-400 text-amber-800',
            active:'bg-amber-600 text-white border-amber-600' },
  blue:   { bg:'bg-blue-50',    border:'border-blue-300',    text:'text-blue-700',
            pill:'bg-blue-100 border-blue-400 text-blue-800',
            active:'bg-blue-600 text-white border-blue-600' },
  teal:   { bg:'bg-teal-50',    border:'border-teal-300',    text:'text-teal-700',
            pill:'bg-teal-100 border-teal-400 text-teal-800',
            active:'bg-teal-600 text-white border-teal-600' },
  emerald:{ bg:'bg-emerald-50', border:'border-emerald-300', text:'text-emerald-700',
            pill:'bg-emerald-100 border-emerald-400 text-emerald-800',
            active:'bg-emerald-600 text-white border-emerald-600' },
};

function Pills({ options, value, onChange, accent = 'violet', multi = false }) {
  const ac = A[accent];
  const vals = multi ? (Array.isArray(value) ? value : []) : value;
  const toggle = o => {
    if (!multi) { onChange(o === value ? '' : o); return; }
    const cur = Array.isArray(value) ? value : [];
    onChange(cur.includes(o) ? cur.filter(x => x !== o) : [...cur, o]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const active = multi ? vals.includes(o) : vals === o;
        return (
          <button key={o} type="button" onClick={() => toggle(o)}
            className={`px-3 py-1 rounded-full border text-sm font-medium transition-all ${active ? ac.active : ac.pill}`}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

function FL({ label, sub, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-semibold text-gray-700">
        {label}{sub && <span className="ml-1 text-xs font-normal text-gray-400">{sub}</span>}
      </label>
      {children}
    </div>
  );
}

function Gate({ label, value, onChange, accent = 'violet', children }) {
  const ac = A[accent];
  return (
    <div className={`border rounded-xl p-4 ${value === 'Yes' ? ac.bg + ' ' + ac.border : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-gray-800 text-sm">{label}</span>
        <div className="flex gap-2">
          {['Yes', 'No'].map(opt => (
            <button key={opt} type="button" onClick={() => onChange(opt)}
              className={`px-4 py-1 rounded-full border text-sm font-medium transition-all
                ${value === opt ? ac.active : 'bg-white border-gray-300 text-gray-600'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      {value === 'Yes' && <div className="mt-3 space-y-4">{children}</div>}
    </div>
  );
}

function Section({ title, applicable, onApplicable, accent = 'violet', children }) {
  const ac = A[accent];
  const isNA = applicable === 'N/A';
  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${isNA ? 'border-gray-200 opacity-60' : ac.border}`}>
      <div className={`flex items-center justify-between px-4 py-3 ${isNA ? 'bg-gray-100' : ac.bg}`}>
        <span className={`font-bold text-base ${isNA ? 'text-gray-400' : ac.text}`}>
          {isNA && <Lock className="inline w-4 h-4 mr-1" />}{title}
        </span>
        <div className="flex gap-2">
          {['Applicable', 'N/A'].map(v => (
            <button key={v} type="button" onClick={() => onApplicable(v)}
              className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all
                ${applicable === v
                  ? v === 'N/A' ? 'bg-gray-500 text-white border-gray-500' : ac.active
                  : 'bg-white border-gray-300 text-gray-500'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>
      {isNA
        ? <div className="px-4 py-2 text-xs text-gray-400 italic">Not applicable · section locked</div>
        : <div className="px-4 py-4 space-y-4">{children}</div>
      }
    </div>
  );
}

function ScoreRow({ label, options, value, onChange, accent = 'violet' }) {
  const ac = A[accent];
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-700 flex-1">{label}</span>
      <div className="flex gap-1 flex-wrap justify-end">
        {options.map(o => (
          <button key={o.label} type="button" onClick={() => onChange(o.label)}
            className={`px-2 py-0.5 rounded border text-xs font-medium transition-all
              ${value === o.label ? ac.active : ac.pill}`}>
            {o.label} {o.score !== undefined && <span className="opacity-70">({o.score})</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PediatricNeurologyForm({ patientId, encounterId, onSaved }) {
  const [sec, setSec] = useState({
    overview: 'Applicable', seizure: 'Applicable', epilepsy: 'Applicable',
    meningitis: 'Applicable', cp: 'Applicable', devdelay: 'Applicable',
    headache: 'Applicable', stroke: 'Applicable', neuromuscular: 'Applicable',
    eeg: 'Applicable', imaging: 'Applicable',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  // Overview
  const [age, setAge] = useState('');
  const [ageUnit, setAgeUnit] = useState('months');
  const [sex, setSex] = useState('');
  const [chief, setChief] = useState([]);
  const [gcs, setGcs] = useState('');

  // Seizure
  const [szGate, setSzGate] = useState('');
  const [szType, setSzType] = useState('');
  const [szDuration, setSzDuration] = useState('');
  const [szFreq, setSzFreq] = useState('');
  const [szPostictal, setSzPostictal] = useState('');
  const [szContext, setSzContext] = useState('');
  const [febrile, setFebrile] = useState('');
  const [febrileSimple, setFebrileSimple] = useState('');
  const [seizureStatus, setSeizureStatus] = useState('');
  const [diasepam, setDiasepam] = useState('');
  const [phenobarb, setPhenobarb] = useState('');
  const [levetiracetam, setLevetiracetam] = useState('');

  // Epilepsy syndrome
  const [epilepsyGate, setEpilepsyGate] = useState('');
  const [epilepsySyndrome, setEpilepsySyndrome] = useState('');
  const [aed, setAed] = useState([]);
  const [aedResponse, setAedResponse] = useState('');
  const [dravet, setDravet] = useState('');

  // Meningitis/encephalitis
  const [menGate, setMenGate] = useState('');
  const [menFeatures, setMenFeatures] = useState([]);
  const [csfDone, setCsfDone] = useState('');
  const [csfResult, setCsfResult] = useState('');
  const [encephType, setEncephType] = useState('');
  const [nccGate, setNccGate] = useState('');
  const [nccCysts, setNccCysts] = useState('');
  const [nccMRI, setNccMRI] = useState('');

  // Cerebral Palsy — GMFCS
  const [cpGate, setCpGate] = useState('');
  const [cpType, setCpType] = useState('');
  const [cpDistrib, setCpDistrib] = useState('');
  const [gmfcs, setGmfcs] = useState('');
  const [macs, setMacs] = useState('');
  const [cfcs, setCfcs] = useState('');
  const [cpComorbid, setCpComorbid] = useState([]);
  const [botox, setBotox] = useState('');

  // Developmental delay
  const [ddGate, setDdGate] = useState('');
  const [ddDomains, setDdDomains] = useState([]);
  const [regression, setRegression] = useState('');
  const [regressionType, setRegressionType] = useState([]);
  const [gddCause, setGddCause] = useState('');
  const [metabolic, setMetabolic] = useState('');

  // Headache
  const [haGate, setHaGate] = useState('');
  const [haType, setHaType] = useState('');
  const [haFeatures, setHaFeatures] = useState([]);
  const [raisedICP, setRaisedICP] = useState('');

  // Stroke
  const [strokeGate, setStrokeGate] = useState('');
  const [strokeType, setStrokeType] = useState('');
  const [strokeFeatures, setStrokeFeatures] = useState([]);
  const [strokeCause, setStrokeCause] = useState([]);

  // Neuromuscular
  const [nmGate, setNmGate] = useState('');
  const [nmDiagnosis, setNmDiagnosis] = useState('');
  const [nmFeatures, setNmFeatures] = useState([]);
  const [ck, setCk] = useState('');
  const [emg, setEmg] = useState('');
  const [geneticTest, setGeneticTest] = useState('');

  // EEG
  const [eegDone, setEegDone] = useState('');
  const [eegFindings, setEegFindings] = useState('');

  // Imaging
  const [mriDone, setMriDone] = useState('');
  const [mriFindings, setMriFindings] = useState([]);
  const [ctDone, setCtDone] = useState('');
  const [ctFindings, setCtFindings] = useState([]);

  // Status epilepticus alert
  const seizureAlert = seizureStatus === 'Status epilepticus' || szDuration === '>30 min' || szDuration === '5-30 min ongoing';
  const raisedICPAlert = raisedICP === 'Yes';

  const handleSave = async () => {
    await api.post('/assessments', {
      type: 'pediatric-neurology',
      patientId, encounterId,
      data: {
        overview: { age, ageUnit, sex, chief, gcs },
        seizure: { gate: szGate, type: szType, duration: szDuration, frequency: szFreq, postictal: szPostictal, context: szContext, febrile, febrileSimple, status: seizureStatus, diazepam: diasepam, phenobarb, levetiracetam },
        epilepsy: { gate: epilepsyGate, syndrome: epilepsySyndrome, aed, aedResponse, dravet },
        meningitis: { gate: menGate, features: menFeatures, csfDone, csfResult, encephType, ncc: { gate: nccGate, cysts: nccCysts, mri: nccMRI } },
        cp: { gate: cpGate, type: cpType, distribution: cpDistrib, gmfcs, macs, cfcs, comorbidities: cpComorbid, botox },
        devDelay: { gate: ddGate, domains: ddDomains, regression, regressionType, cause: gddCause, metabolicWorkup: metabolic },
        headache: { gate: haGate, type: haType, features: haFeatures, raisedICP },
        stroke: { gate: strokeGate, type: strokeType, features: strokeFeatures, cause: strokeCause },
        neuromuscular: { gate: nmGate, diagnosis: nmDiagnosis, features: nmFeatures, ck, emg, genetic: geneticTest },
        eeg: { done: eegDone, findings: eegFindings },
        imaging: { mri: { done: mriDone, findings: mriFindings }, ct: { done: ctDone, findings: ctFindings } },
      }
    });
    onSaved?.();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 opacity-80" />
          <div>
            <h2 className="text-xl font-bold">Pediatric Neurology Assessment</h2>
            <p className="text-violet-100 text-sm">Febrile Seizures · Epilepsy Syndromes · Meningitis/Encephalitis · GMFCS (CP) · Developmental Delay · NCC · Stroke</p>
          </div>
        </div>
      </div>

      {(seizureAlert || raisedICPAlert) && (
        <div className="bg-red-50 border-2 border-red-600 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700">Neurological Emergency</p>
            {seizureAlert && <p className="text-sm text-red-600">Status epilepticus — IV Diazepam 0.3mg/kg → Lorazepam 0.1mg/kg → Phenobarbitone 20mg/kg IV</p>}
            {raisedICPAlert && <p className="text-sm text-red-600">Raised ICP — Head elevation 30°, mannitol 0.5-1g/kg, urgent neurosurgery</p>}
          </div>
        </div>
      )}

      {/* Overview */}
      <Section title="Patient Overview" applicable={sec.overview} onApplicable={v => sa('overview', v)} accent="violet">
        <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
          <p className={`font-semibold ${A.amber.text}`}>India context — Pediatric neurology</p>
          <p className="text-gray-600 mt-1">Epilepsy: 3-5M children in India. Neurocysticercosis (NCC) is #1 cause of acquired epilepsy in children.
            Cerebral malaria common in endemic regions. Pyridoxine-responsive seizures in neonates.
            TB meningitis — high burden; empirical antitubercular in high-risk. JE vaccination in endemic zones (24 states).
            NIMHANS Bangalore and CMC Vellore are major paediatric neurology centres.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Age">
            <div className="flex gap-2">
              <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="0" className="w-14 border rounded-lg px-2 py-1.5 text-sm" />
              <select value={ageUnit} onChange={e => setAgeUnit(e.target.value)} className="flex-1 border rounded-lg px-2 py-1.5 text-sm">
                <option>months</option><option>years</option>
              </select>
            </div>
          </FL>
          <FL label="GCS (if altered)">
            <input type="number" value={gcs} onChange={e => setGcs(e.target.value)} placeholder="3-15" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
            {parseFloat(gcs) < 8 && gcs !== '' && <p className="text-red-700 text-xs font-bold mt-1">Severe impairment — intubation threshold</p>}
          </FL>
        </div>
        <FL label="Chief complaint(s)">
          <Pills options={['Seizure/convulsion','Loss of consciousness','Headache','Developmental delay/regression',
            'Motor weakness','Movement disorder','Visual disturbance','Behaviour change','Meningismus']}
            value={chief} onChange={setChief} accent="violet" multi />
        </FL>
      </Section>

      {/* Seizure */}
      <Section title="Seizure Assessment (AAP / ILAE)" applicable={sec.seizure} onApplicable={v => sa('seizure', v)} accent="red">
        <FL label="Seizure present or history of seizure?">
          <Pills options={['Yes — acute','Yes — history','No']} value={szGate} onChange={setSzGate} accent="red" />
        </FL>
        {szGate !== '' && szGate !== 'No' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Seizure type (ILAE 2017)">
                <Pills options={['Focal onset aware','Focal onset impaired','Focal to bilateral tonic-clonic',
                  'Generalised tonic-clonic','Absence','Myoclonic','Atonic','Spasms (West)']}
                  value={szType} onChange={setSzType} accent="red" />
              </FL>
              <FL label="Duration">
                <Pills options={['<5 min','5-30 min','5-30 min ongoing','>30 min','Unknown']}
                  value={szDuration} onChange={setSzDuration} accent="red" />
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Frequency">
                <Pills options={['First ever','Recurrent (cluster)','Daily','Weekly','Monthly']}
                  value={szFreq} onChange={setSzFreq} accent="red" />
              </FL>
              <FL label="Postictal state">
                <Pills options={['None','Drowsy','Confused','Todd paralysis','Prolonged (>30min)']}
                  value={szPostictal} onChange={setSzPostictal} accent="red" />
              </FL>
            </div>
            <FL label="Context">
              <Pills options={['Febrile','Afebrile','Hypoglycaemia','Hyponatraemia','Head injury','Meningitis/encephalitis','Structural','Unknown']}
                value={szContext} onChange={setSzContext} accent="amber" />
            </FL>
            {szContext === 'Febrile' && (
              <>
                <FL label="Febrile seizure type (AAP 2011)">
                  <Pills options={['Simple (single, <15min, generalised, <24h)','Complex (prolonged >15min or focal or >1 in 24h)','Febrile status epilepticus']}
                    value={febrile} onChange={setFebrile} accent="amber" />
                </FL>
                {febrile && <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-sm text-amber-700">
                  <strong>AAP guidance:</strong> Simple FS — no antiepileptics, reassure, treat fever. Complex FS — EEG + MRI if recurrent.
                  Recurrence risk: 30% after first FS; genetic counselling.
                </div>}
              </>
            )}
            <FL label="Status epilepticus?">
              <Pills options={['No','Status epilepticus','Refractory status (>60min)','Super-refractory']}
                value={seizureStatus} onChange={setSeizureStatus} accent="red" />
            </FL>
            <div className="grid grid-cols-3 gap-3">
              <FL label="IV/Rectal Diazepam given?"><Pills options={['Yes','No']} value={diasepam} onChange={setDiasepam} accent="red" /></FL>
              <FL label="Phenobarbitone IV?"><Pills options={['Yes','No']} value={phenobarb} onChange={setPhenobarb} accent="red" /></FL>
              <FL label="Levetiracetam IV?"><Pills options={['Yes','No']} value={levetiracetam} onChange={setLevetiracetam} accent="violet" /></FL>
            </div>
          </>
        )}
      </Section>

      {/* Epilepsy Syndrome */}
      <Section title="Epilepsy Syndrome Classification" applicable={sec.epilepsy} onApplicable={v => sa('epilepsy', v)} accent="violet">
        <FL label="Known epilepsy syndrome?">
          <Pills options={['Yes','No — first presentation']} value={epilepsyGate} onChange={setEpilepsyGate} accent="violet" />
        </FL>
        {(epilepsyGate === 'Yes' || epilepsyGate === 'No — first presentation') && (
          <>
            <FL label="Syndrome (ILAE)">
              <Pills options={['Childhood absence epilepsy','Juvenile absence epilepsy','JME (Janz)','Lennox-Gastaut syndrome',
                "West syndrome (Infantile spasms)",'BECTS (Rolandic)','Dravet syndrome','Ohtahara','Progressive myoclonic epilepsy','Other']}
                value={epilepsySyndrome} onChange={setEpilepsySyndrome} accent="violet" />
            </FL>
            <FL label="AED current/planned">
              <Pills options={['Valproate','Levetiracetam','Carbamazepine','Oxcarbazepine','Lamotrigine','Clonazepam','Phenobarbitone','Vigabatrin','ACTH/steroids (West)','Ketogenic diet']}
                value={aed} onChange={setAed} accent="violet" multi />
            </FL>
            <FL label="AED response">
              <Pills options={['Seizure-free','Partial response','Drug-resistant epilepsy','Not yet assessed']}
                value={aedResponse} onChange={setAedResponse} accent="emerald" />
            </FL>
            <FL label="SCN1A mutation (Dravet)?">
              <Pills options={['Positive','Negative','Not tested','Pending']} value={dravet} onChange={setDravet} accent="red" />
            </FL>
          </>
        )}
      </Section>

      {/* CNS Infection / NCC */}
      <Section title="Meningitis / Encephalitis / NCC" applicable={sec.meningitis} onApplicable={v => sa('meningitis', v)} accent="red">
        <FL label="CNS infection suspected?">
          <Pills options={['Yes','No','Possible']} value={menGate} onChange={setMenGate} accent="red" />
        </FL>
        {menGate === 'Yes' && (
          <>
            <FL label="Clinical features">
              <Pills options={['Fever','Headache','Meningismus (neck stiffness)','Kernig positive','Brudzinski positive',
                'Bulging fontanelle','Photophobia','Altered consciousness','Focal deficit','Petechial rash (meningococcal)']}
                value={menFeatures} onChange={setMenFeatures} accent="red" multi />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="CSF / LP done">
                <Pills options={['Yes','No — contraindicated','CT first','Pending']} value={csfDone} onChange={setCsfDone} accent="red" />
              </FL>
              <FL label="CSF result">
                <Pills options={['Bacterial','TBM (high protein, low glucose, lymphocytes)','Viral (aseptic)','NCC','Fungal','Normal']}
                  value={csfResult} onChange={setCsfResult} accent="red" />
              </FL>
            </div>
            <FL label="Encephalitis type">
              <Pills options={['Viral (JE, HSV, CMV)','Autoimmune (anti-NMDAR, MOG-IgG)','ADEM','Rasmussen','Cerebral malaria','Metabolic','Unknown']}
                value={encephType} onChange={setEncephType} accent="violet" />
            </FL>
          </>
        )}
        <Gate label="Neurocysticercosis (NCC) suspected?" value={nccGate} onChange={setNccGate} accent="amber">
          <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
            <p className={`font-semibold ${A.amber.text}`}>NCC — India: most common cause of acquired epilepsy in children</p>
            <p className="text-gray-600 mt-1">Endemic: UP, Bihar, Rajasthan, Madhya Pradesh, Jharkhand. Tapeworm (T. solium).
              Albendazole + Praziquantel + steroids (dexamethasone). Seizures treated per epilepsy protocol.</p>
          </div>
          <FL label="Number of cysts (MRI)">
            <Pills options={['Single','2-3','4-10','>10','Disseminated','Not counted']} value={nccCysts} onChange={setNccCysts} accent="amber" />
          </FL>
          <FL label="MRI stage (Del Brutto criteria)">
            <Pills options={['Vesicular (active)','Colloidal vesicular','Granular nodular','Calcified (inactive)','Mixed']}
              value={nccMRI} onChange={setNccMRI} accent="amber" />
          </FL>
        </Gate>
      </Section>

      {/* Cerebral Palsy — GMFCS */}
      <Section title="Cerebral Palsy — GMFCS / MACS / CFCS" applicable={sec.cp} onApplicable={v => sa('cp', v)} accent="teal">
        <FL label="Cerebral palsy present?">
          <Pills options={['Yes — new diagnosis','Yes — known CP','No']} value={cpGate} onChange={setCpGate} accent="teal" />
        </FL>
        {cpGate !== '' && cpGate !== 'No' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FL label="CP Type">
                <Pills options={['Spastic','Dyskinetic (dystonic/choreoathetoid)','Ataxic','Hypotonic','Mixed']}
                  value={cpType} onChange={setCpType} accent="teal" />
              </FL>
              <FL label="Distribution">
                <Pills options={['Hemiplegia','Diplegia','Quadriplegia/tetraplegia','Monoplegia']}
                  value={cpDistrib} onChange={setCpDistrib} accent="teal" />
              </FL>
            </div>
            <FL label="GMFCS Level (Gross Motor Function Classification)">
              <Pills options={[
                'Level I — walks without limitations',
                'Level II — walks with limitations',
                'Level III — walks with assistive devices',
                'Level IV — self-mobility limited (may use powered chair)',
                'Level V — transported in manual wheelchair']}
                value={gmfcs} onChange={setGmfcs} accent="teal" />
            </FL>
            <FL label="MACS Level (Manual Ability Classification — hands)">
              <Pills options={['Level I — handles objects easily','Level II — handles most objects','Level III — handles with difficulty',
                'Level IV — limited handling with help','Level V — does not handle objects']}
                value={macs} onChange={setMacs} accent="blue" />
            </FL>
            <FL label="CFCS Level (Communication Function)">
              <Pills options={['Level I — effective sender/receiver','Level II — effective with familiar people','Level III — effective with familiar, inconsistent with unfamiliar',
                'Level IV — inconsistent','Level V — seldom effectively communicates']}
                value={cfcs} onChange={setCfcs} accent="violet" />
            </FL>
            <FL label="Co-morbidities">
              <Pills options={['Epilepsy','Intellectual disability','Visual impairment','Hearing impairment',
                'Speech-language disorder','Dysphagia','Feeding difficulties','Behaviour disorder','Sleep disorder']}
                value={cpComorbid} onChange={setCpComorbid} accent="amber" multi />
            </FL>
            <FL label="Botulinum toxin injections?">
              <Pills options={['Scheduled','Given — improved','Given — no benefit','Not indicated']} value={botox} onChange={setBotox} accent="teal" />
            </FL>
          </>
        )}
      </Section>

      {/* Developmental delay */}
      <Section title="Global Developmental Delay & Regression" applicable={sec.devdelay} onApplicable={v => sa('devdelay', v)} accent="indigo">
        <FL label="Developmental delay/regression present?">
          <Pills options={['Yes — GDD (all domains)','Yes — specific domain','Yes — regression/loss of skills','No']}
            value={ddGate} onChange={setDdGate} accent="indigo" />
        </FL>
        {ddGate !== '' && ddGate !== 'No' && (
          <>
            <FL label="Domains affected">
              <Pills options={['Gross motor','Fine motor','Language/communication','Cognitive','Personal-social','All domains (GDD)']}
                value={ddDomains} onChange={setDdDomains} accent="indigo" multi />
            </FL>
            <FL label="Regression (loss of previously acquired skills)?">
              <Pills options={['Yes','No']} value={regression} onChange={setRegression} accent="red" />
            </FL>
            {regression === 'Yes' && (
              <FL label="Regression type">
                <Pills options={['Motor regression','Language regression','Social regression (autism onset)',
                  'Post-seizure regression','Metabolic crisis','Slow progressive (neurodegenerative)']}
                  value={regressionType} onChange={setRegressionType} accent="red" multi />
              </FL>
            )}
            <FL label="Likely cause / workup">
              <Pills options={['Hypoxic-ischaemic','Genetic/chromosomal','Metabolic (IEM)','Structural brain lesion',
                'Hypothyroidism','Infections (congenital TORCH)','Unknown — further workup']}
                value={gddCause} onChange={setGddCause} accent="indigo" />
            </FL>
            <FL label="Metabolic workup done?">
              <Pills options={['Complete (urine OA, plasma AA, TANDEM MS)','Partial','Not done','Normal','Abnormal']}
                value={metabolic} onChange={setMetabolic} accent="amber" />
            </FL>
          </>
        )}
      </Section>

      {/* Headache */}
      <Section title="Headache Assessment" applicable={sec.headache} onApplicable={v => sa('headache', v)} accent="blue">
        <FL label="Headache present?">
          <Pills options={['Yes — acute','Yes — chronic/recurrent','No']} value={haGate} onChange={setHaGate} accent="blue" />
        </FL>
        {haGate !== '' && haGate !== 'No' && (
          <>
            <FL label="Headache type (ICHD-3)">
              <Pills options={['Migraine without aura','Migraine with aura','Tension-type','Cluster','Secondary (raised ICP)','Post-traumatic','Medication overuse','New daily persistent']}
                value={haType} onChange={setHaType} accent="blue" />
            </FL>
            <FL label="Red flag features">
              <Pills options={['"Thunderclap" onset','Worst headache ever','Nocturnal awakening','Worsens with Valsalva',
                'Associated vomiting (morning)','Papilloedema','Meningismus','Focal deficit']}
                value={haFeatures} onChange={setHaFeatures} accent="red" multi />
            </FL>
            <FL label="Raised ICP suspected?">
              <Pills options={['Yes','No','Investigate']} value={raisedICP} onChange={setRaisedICP} accent="red" />
            </FL>
          </>
        )}
      </Section>

      {/* Pediatric Stroke */}
      <Section title="Pediatric Stroke" applicable={sec.stroke} onApplicable={v => sa('stroke', v)} accent="red">
        <FL label="Stroke suspected?">
          <Pills options={['Yes — arterial ischaemic','Yes — haemorrhagic','Yes — CSVT','No','Stroke mimic']}
            value={strokeGate} onChange={setStrokeGate} accent="red" />
        </FL>
        {strokeGate !== '' && strokeGate !== 'No' && (
          <>
            <FL label="Clinical features">
              <Pills options={['Acute focal weakness','Dysphasia/aphasia','Facial droop','Hemianopia','Ataxia','Altered consciousness','Seizures']}
                value={strokeFeatures} onChange={setStrokeFeatures} accent="red" multi />
            </FL>
            <FL label="Underlying cause">
              <Pills options={['Cardiac embolism (CHD/cardiomyopathy)','Sickle cell disease','Coagulopathy','Arteriopathy (dissection/moyamoya)',
                'Vasculitis','Homocystinuria','Unknown — workup pending']}
                value={strokeCause} onChange={setStrokeCause} accent="violet" multi />
            </FL>
          </>
        )}
      </Section>

      {/* Neuromuscular */}
      <Section title="Neuromuscular Disorders" applicable={sec.neuromuscular} onApplicable={v => sa('neuromuscular', v)} accent="teal">
        <FL label="Neuromuscular disorder suspected?">
          <Pills options={['Yes','No','Known — follow-up']} value={nmGate} onChange={setNmGate} accent="teal" />
        </FL>
        {(nmGate === 'Yes' || nmGate === 'Known — follow-up') && (
          <>
            <FL label="Diagnosis">
              <Pills options={['Duchenne muscular dystrophy','Spinal muscular atrophy (SMA)','Myasthenia gravis (juvenile)',
                'Guillain-Barré syndrome','Congenital myopathy','Mitochondrial myopathy','HMSN/CMT','Other']}
                value={nmDiagnosis} onChange={setNmDiagnosis} accent="teal" />
            </FL>
            <FL label="Features">
              <Pills options={['Proximal weakness','Distal weakness','Gower sign','Toe-walking','Respiratory compromise',
                'Cardiomyopathy','Scoliosis','Calf pseudohypertrophy','Areflexia','Ptosis/ophthalmoplegia']}
                value={nmFeatures} onChange={setNmFeatures} accent="teal" multi />
            </FL>
            <div className="grid grid-cols-3 gap-3">
              <FL label="CK level" sub="IU/L">
                <input type="number" value={ck} onChange={e => setCk(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="IU/L" />
              </FL>
              <FL label="EMG/NCS">
                <Pills options={['Myopathic','Neuropathic','Normal','Not done']} value={emg} onChange={setEmg} accent="teal" />
              </FL>
              <FL label="Genetic testing">
                <Pills options={['Sent','Positive','Negative','Not done']} value={geneticTest} onChange={setGeneticTest} accent="violet" />
              </FL>
            </div>
          </>
        )}
      </Section>

      {/* EEG */}
      <Section title="EEG Findings" applicable={sec.eeg} onApplicable={v => sa('eeg', v)} accent="indigo">
        <FL label="EEG performed?">
          <Pills options={['Yes','No','Pending']} value={eegDone} onChange={setEegDone} accent="indigo" />
        </FL>
        {eegDone === 'Yes' && (
          <FL label="EEG findings">
            <textarea value={eegFindings} onChange={e => setEegFindings(e.target.value)} rows={3}
              className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Hypsarrhythmia, 3Hz spike-wave, focal spikes, burst suppression, normal EEG..." />
          </FL>
        )}
      </Section>

      {/* Imaging */}
      <Section title="Neuroimaging" applicable={sec.imaging} onApplicable={v => sa('imaging', v)} accent="blue">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FL label="MRI brain performed?">
              <Pills options={['Yes','No','Pending']} value={mriDone} onChange={setMriDone} accent="blue" />
            </FL>
            {mriDone === 'Yes' && (
              <FL label="MRI findings">
                <Pills options={['Normal','White matter changes (PVL)','Cortical malformation','Hypoxic-ischaemic injury','NCC (cysts/calcification)','Tumour','Haemorrhage','Infarct','Hydrocephalus','Atrophy']}
                  value={mriFindings} onChange={setMriFindings} accent="blue" multi />
              </FL>
            )}
          </div>
          <div>
            <FL label="CT brain performed?">
              <Pills options={['Yes','No','Pending']} value={ctDone} onChange={setCtDone} accent="blue" />
            </FL>
            {ctDone === 'Yes' && (
              <FL label="CT findings">
                <Pills options={['Normal','Calcification (NCC)','Hypodensity (infarct)','Haemorrhage','Oedema','Hydrocephalus']}
                  value={ctFindings} onChange={setCtFindings} accent="blue" multi />
              </FL>
            )}
          </div>
        </div>
      </Section>

      <button type="button" onClick={handleSave}
        className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-base shadow-lg transition-all">
        Save Neurology Assessment
      </button>
    </div>
  );
}
