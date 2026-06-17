/**
 * @shared-pool
 * PediatricEmergencyForm — Pediatric Emergency Assessment
 * PEWS (Pediatric Early Warning Score), Broselow tape weight estimation,
 * PALS algorithms (sepsis, respiratory failure, shock, arrest),
 * Pediatric sepsis Goldstein criteria, drowning (Modell classification),
 * head trauma (GCS), burns (Lund-Browder), poisoning/toxicology,
 * trauma primary survey (ABCDE paediatric)
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useMemo } from 'react';
import { Lock, AlertTriangle, Zap } from 'lucide-react';
import api from '../../../api/client';

const A = {
  red:    { bg:'bg-red-50',     border:'border-red-300',     text:'text-red-700',
            pill:'bg-red-100 border-red-400 text-red-800',
            active:'bg-red-600 text-white border-red-600' },
  orange: { bg:'bg-orange-50',  border:'border-orange-300',  text:'text-orange-700',
            pill:'bg-orange-100 border-orange-400 text-orange-800',
            active:'bg-orange-600 text-white border-orange-600' },
  amber:  { bg:'bg-amber-50',   border:'border-amber-300',   text:'text-amber-700',
            pill:'bg-amber-100 border-amber-400 text-amber-800',
            active:'bg-amber-600 text-white border-amber-600' },
  blue:   { bg:'bg-blue-50',    border:'border-blue-300',    text:'text-blue-700',
            pill:'bg-blue-100 border-blue-400 text-blue-800',
            active:'bg-blue-600 text-white border-blue-600' },
  teal:   { bg:'bg-teal-50',    border:'border-teal-300',    text:'text-teal-700',
            pill:'bg-teal-100 border-teal-400 text-teal-800',
            active:'bg-teal-600 text-white border-teal-600' },
  violet: { bg:'bg-violet-50',  border:'border-violet-300',  text:'text-violet-700',
            pill:'bg-violet-100 border-violet-400 text-violet-800',
            active:'bg-violet-600 text-white border-violet-600' },
  emerald:{ bg:'bg-emerald-50', border:'border-emerald-300', text:'text-emerald-700',
            pill:'bg-emerald-100 border-emerald-400 text-emerald-800',
            active:'bg-emerald-600 text-white border-emerald-600' },
};

function Pills({ options, value, onChange, accent = 'red', multi = false }) {
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

function Section({ title, applicable, onApplicable, accent = 'red', children }) {
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

function ScoreRow({ label, options, value, onChange, accent = 'red' }) {
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

// Broselow tape weight estimation by height (approximate)
function brostelowWeight(height) {
  const h = parseFloat(height);
  if (isNaN(h)) return null;
  // Simplified Broselow approximation — use actual tape in practice
  if (h < 50) return '3-5 kg';
  if (h < 60) return '5-7 kg';
  if (h < 70) return '7-9 kg';
  if (h < 80) return '9-11 kg';
  if (h < 90) return '10-12 kg';
  if (h < 100) return '12-15 kg';
  if (h < 110) return '15-18 kg';
  if (h < 120) return '18-22 kg';
  if (h < 130) return '22-26 kg';
  if (h < 140) return '26-30 kg';
  if (h < 150) return '30-40 kg';
  return '>40 kg';
}

export default function PediatricEmergencyForm({ patientId, encounterId, onSaved }) {
  const [sec, setSec] = useState({
    triage: 'Applicable', pews: 'Applicable', abcde: 'Applicable',
    sepsis: 'Applicable', respiratory: 'Applicable', shock: 'Applicable',
    arrest: 'Applicable', trauma: 'Applicable', burns: 'Applicable',
    poisoning: 'Applicable', drowning: 'Applicable',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  // Triage
  const [age, setAge] = useState('');
  const [ageUnit, setAgeUnit] = useState('months');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [arrivalMode, setArrivalMode] = useState('');
  const [triageCategory, setTriageCategory] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');

  // PEWS
  const [pewsBehaviour, setPewsBehaviour] = useState('');
  const [pewsCardio, setPewsCardio] = useState('');
  const [pewsResp, setPewsResp] = useState('');

  // ABCDE
  const [airway, setAirway] = useState('');
  const [breathing, setBreathing] = useState('');
  const [spo2, setSpo2] = useState('');
  const [rr, setRr] = useState('');
  const [hr, setHr] = useState('');
  const [bp, setBp] = useState('');
  const [capRefill, setCapRefill] = useState('');
  const [gcs, setGcs] = useState('');
  const [pupils, setPupils] = useState('');
  const [temp, setTemp] = useState('');
  const [glucose, setGlucose] = useState('');

  // Sepsis
  const [sepsisGate, setSepsisGate] = useState('');
  const [sepsisTemp, setSepsisTemp] = useState('');
  const [sepsisHr, setSepsisHr] = useState('');
  const [sepsisRr, setSepsisRr] = useState('');
  const [sepsisWbc, setSepsisWbc] = useState('');
  const [sepsisOrgan, setSepsisOrgan] = useState([]);
  const [septicShock, setSepticShock] = useState('');
  const [fluidGiven, setFluidGiven] = useState('');
  const [vasopressor, setVasopressor] = useState('');
  const [antibiotics, setAntibiotics] = useState('');

  // Respiratory emergency
  const [respGate, setRespGate] = useState('');
  const [respType, setRespType] = useState('');
  const [respFeatures, setRespFeatures] = useState([]);
  const [o2Given, setO2Given] = useState('');
  const [intubated, setIntubated] = useState('');

  // Shock
  const [shockGate, setShockGate] = useState('');
  const [shockType, setShockType] = useState('');
  const [shockFeatures, setShockFeatures] = useState([]);
  const [fluidBolus, setFluidBolus] = useState('');

  // Cardiac arrest
  const [arrestGate, setArrestGate] = useState('');
  const [cprStarted, setCprStarted] = useState('');
  const [rosc, setRosc] = useState('');
  const [rhythm, setRhythm] = useState('');
  const [aed, setAed] = useState('');
  const [epinephrine, setEpinephrine] = useState('');

  // Trauma
  const [traumaGate, setTraumaGate] = useState('');
  const [traumaMechanism, setTraumaMechanism] = useState('');
  const [traumaFeatures, setTraumaFeatures] = useState([]);
  const [gcsE, setGcsE] = useState('');
  const [gcsV, setGcsV] = useState('');
  const [gcsM, setGcsM] = useState('');
  const [ctHead, setCtHead] = useState('');

  // Burns
  const [burnsGate, setBurnsGate] = useState('');
  const [burnsType, setBurnsType] = useState('');
  const [burnsDepth, setBurnsDepth] = useState([]);
  const [burnsTBSA, setBurnsTBSA] = useState('');
  const [parklandFluid, setParklandFluid] = useState('');

  // Poisoning
  const [poisonGate, setPoisonGate] = useState('');
  const [poisonAgent, setPoisonAgent] = useState('');
  const [poisonRoute, setPoisonRoute] = useState('');
  const [poisonFeatures, setPoisonFeatures] = useState([]);
  const [poisonTx, setPoisonTx] = useState([]);

  // Drowning
  const [drowningGate, setDrowningGate] = useState('');
  const [drowningDuration, setDrowningDuration] = useState('');
  const [drowningWater, setDrowningWater] = useState('');
  const [drowningStatus, setDrowningStatus] = useState('');

  // PEWS score
  const pewsScore = useMemo(() => {
    const map = {
      pewsBehaviour: { 'Playing/appropriate':0, 'Sleeping':1, 'Irritable':2, 'Reduced response':3, 'Unresponsive':4 },
      pewsCardio: { 'Normal':0, 'Pale or tachycardic (>20 above normal)':1, 'Mottled or tachycardic (>30 above normal)':2, 'Grey + tachycardic or bradycardic':4 },
      pewsResp: { 'Normal':0, 'Using accessory muscles or >10 above normal':1, '>20 above normal with retractions or SpO2 <95%':2, '>5 below normal with retractions SpO2 <90%':4 },
    };
    const vals = { pewsBehaviour, pewsCardio, pewsResp };
    let total = 0; let filled = 0;
    Object.entries(vals).forEach(([k, v]) => { if (map[k][v] !== undefined) { total += map[k][v]; filled++; } });
    return { total, filled };
  }, [pewsBehaviour, pewsCardio, pewsResp]);

  const pewsRisk = useMemo(() => {
    if (pewsScore.filled < 3) return null;
    const t = pewsScore.total;
    if (t <= 1) return { label: 'Low risk', color: 'text-green-700' };
    if (t <= 3) return { label: 'Medium risk — increase monitoring', color: 'text-amber-700' };
    return { label: 'High risk — medical emergency team', color: 'text-red-700 font-bold' };
  }, [pewsScore]);

  // GCS total
  const gcsPeds = useMemo(() => {
    const e = parseInt(gcsE) || 0;
    const v = parseInt(gcsV) || 0;
    const m = parseInt(gcsM) || 0;
    if (!e && !v && !m) return null;
    return e + v + m;
  }, [gcsE, gcsV, gcsM]);

  // Parkland formula
  const parkland = useMemo(() => {
    const bsa = parseFloat(burnsTBSA);
    const w = parseFloat(weight);
    if (!bsa || !w) return null;
    return (4 * w * bsa).toFixed(0);
  }, [burnsTBSA, weight]);

  const criticalAlert = pewsScore.total >= 4 || sepsisGate === 'Yes' || arrestGate === 'Yes';

  const handleSave = async () => {
    await api.post('/assessments', {
      type: 'pediatric-emergency',
      patientId, encounterId,
      data: {
        triage: { age, ageUnit, weight, height, brostelowEst: brostelowWeight(height), arrivalMode, category: triageCategory, chiefComplaint },
        pews: { behaviour: pewsBehaviour, cardiovascular: pewsCardio, respiratory: pewsResp, score: pewsScore.total, risk: pewsRisk?.label },
        abcde: { airway, breathing, spo2, rr, hr, bp, capRefill, gcs, pupils, temp, glucose },
        sepsis: { gate: sepsisGate, temp: sepsisTemp, hr: sepsisHr, rr: sepsisRr, wbc: sepsisWbc, organDysfunction: sepsisOrgan, shock: septicShock, fluid: fluidGiven, vasopressor, antibiotics },
        respiratory: { gate: respGate, type: respType, features: respFeatures, o2: o2Given, intubated },
        shock: { gate: shockGate, type: shockType, features: shockFeatures, fluidBolus },
        arrest: { gate: arrestGate, cpr: cprStarted, rosc, rhythm, aed, epinephrine },
        trauma: { gate: traumaGate, mechanism: traumaMechanism, features: traumaFeatures, gcs: gcsPeds, ctHead },
        burns: { gate: burnsGate, type: burnsType, depth: burnsDepth, tbsa: burnsTBSA, parklandTotal: parkland },
        poisoning: { gate: poisonGate, agent: poisonAgent, route: poisonRoute, features: poisonFeatures, treatment: poisonTx },
        drowning: { gate: drowningGate, duration: drowningDuration, water: drowningWater, status: drowningStatus },
      }
    });
    onSaved?.();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="bg-gradient-to-r from-red-700 to-orange-600 text-white rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <Zap className="w-8 h-8 opacity-80" />
          <div>
            <h2 className="text-xl font-bold">Pediatric Emergency Assessment</h2>
            <p className="text-red-100 text-sm">PEWS · Broselow · PALS · Pediatric Sepsis · Trauma · Burns · Poisoning · Drowning</p>
          </div>
        </div>
      </div>

      {criticalAlert && (
        <div className="bg-red-50 border-2 border-red-700 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-6 h-6 text-red-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700 text-lg">CRITICAL EMERGENCY</p>
            <p className="text-sm text-red-600">Activate emergency response · Call senior paediatrician · Prepare resuscitation trolley</p>
          </div>
        </div>
      )}

      {/* Triage */}
      <Section title="Emergency Triage & Weight Estimation" applicable={sec.triage} onApplicable={v => sa('triage', v)} accent="red">
        <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
          <p className={`font-semibold ${A.amber.text}`}>India pediatric emergency context</p>
          <p className="text-gray-600 mt-1">Unintentional injuries: 40% of under-5 deaths in India. Snake bite: 58,000 deaths/year (India — world's highest).
            Drowning: leading injury cause in &lt;14y. Burns: kerosene lamp/stove injuries common in rural India.
            Poisoning: organophosphate (agri), paracetamol OD, traditional medicine.
            Broselow tape should be used in all paediatric emergencies if weight unknown.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Age">
            <div className="flex gap-2">
              <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="0" className="w-14 border rounded-lg px-2 py-1.5 text-sm" />
              <select value={ageUnit} onChange={e => setAgeUnit(e.target.value)} className="flex-1 border rounded-lg px-2 py-1.5 text-sm">
                <option>months</option><option>years</option>
              </select>
            </div>
          </FL>
          <FL label="Weight" sub="kg (actual or estimated)">
            <input type="number" step="0.5" value={weight} onChange={e => setWeight(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          </FL>
          <FL label="Height/Length" sub="cm (for Broselow)">
            <input type="number" value={height} onChange={e => setHeight(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          </FL>
        </div>
        {height && (
          <div className="bg-blue-50 border border-blue-300 rounded-lg p-2 text-sm">
            <span className="font-semibold text-blue-700">Broselow weight estimate: </span>
            <span className="text-blue-600">{brostelowWeight(height)}</span>
            <span className="text-gray-500 text-xs ml-2">(confirm with actual weight)</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FL label="Arrival mode">
            <Pills options={['Walk-in','Ambulance','Private vehicle','Police/public','Air transport']} value={arrivalMode} onChange={setArrivalMode} accent="orange" />
          </FL>
          <FL label="Triage category (MTS/CTAS)">
            <Pills options={['Immediate — Red (life threat)','Urgent — Orange (severe)','Semi-urgent — Yellow (moderate)','Non-urgent — Green (minor)','Dead on arrival']}
              value={triageCategory} onChange={setTriageCategory} accent="red" />
          </FL>
        </div>
      </Section>

      {/* PEWS */}
      <Section title="PEWS — Pediatric Early Warning Score" applicable={sec.pews} onApplicable={v => sa('pews', v)} accent="orange">
        <div className="bg-white rounded-xl border divide-y">
          <ScoreRow label="Behaviour" accent="orange" value={pewsBehaviour} onChange={setPewsBehaviour}
            options={[{label:'Playing',score:0},{label:'Sleeping',score:1},{label:'Irritable',score:2},{label:'Reduced response',score:3},{label:'Unresponsive',score:4}]} />
          <ScoreRow label="Cardiovascular" accent="orange" value={pewsCardio} onChange={setPewsCardio}
            options={[{label:'Normal',score:0},{label:'Pale/tachy >20 above',score:1},{label:'Mottled/tachy >30 above',score:2},{label:'Grey/very tachy or brady',score:4}]} />
          <ScoreRow label="Respiratory" accent="orange" value={pewsResp} onChange={setPewsResp}
            options={[{label:'Normal',score:0},{label:'>10 above normal',score:1},{label:'>20 above + retractions',score:2},{label:'>5 below + SpO2 <90%',score:4}]} />
        </div>
        {pewsScore.filled === 3 && (
          <div className={`p-3 rounded-lg border font-bold ${pewsScore.total >= 4 ? 'bg-red-50 border-red-400 text-red-700' : pewsScore.total >= 2 ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-green-50 border-green-400 text-green-700'}`}>
            PEWS: {pewsScore.total} — {pewsRisk?.label}
          </div>
        )}
      </Section>

      {/* ABCDE Primary Survey */}
      <Section title="ABCDE Primary Survey" applicable={sec.abcde} onApplicable={v => sa('abcde', v)} accent="red">
        <FL label="A — Airway">
          <Pills options={['Patent','Partially obstructed','Obstructed','Secured (tube in situ)']} value={airway} onChange={setAirway} accent="red" />
        </FL>
        <div className="grid grid-cols-3 gap-3">
          <FL label="B — SpO2" sub="%"><input type="number" value={spo2} onChange={e => setSpo2(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
          <FL label="RR" sub="/min"><input type="number" value={rr} onChange={e => setRr(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
          <FL label="Breathing effort"><Pills options={['Normal','Mild distress','Severe distress']} value={breathing} onChange={setBreathing} accent="blue" /></FL>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FL label="C — HR" sub="bpm"><input type="number" value={hr} onChange={e => setHr(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
          <FL label="BP" sub="mmHg"><input type="text" value={bp} onChange={e => setBp(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="SBP/DBP" /></FL>
          <FL label="Cap refill"><Pills options={['<2s','2-3s','>3s (abnormal)']} value={capRefill} onChange={setCapRefill} accent="red" /></FL>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FL label="D — GCS (total)"><input type="number" value={gcs} onChange={e => setGcs(e.target.value)} placeholder="3-15" className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
          <FL label="Pupils"><Pills options={['Equal reactive','Unequal','Fixed dilated','Pinpoint']} value={pupils} onChange={setPupils} accent="violet" /></FL>
          <FL label="E — Glucose" sub="mmol/L"><input type="number" step="0.1" value={glucose} onChange={e => setGlucose(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Temperature" sub="°C"><input type="number" step="0.1" value={temp} onChange={e => setTemp(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
        </div>
      </Section>

      {/* Pediatric Sepsis */}
      <Section title="Pediatric Sepsis (Goldstein/PALS)" applicable={sec.sepsis} onApplicable={v => sa('sepsis', v)} accent="red">
        <FL label="Sepsis suspected?"><Pills options={['Yes','No']} value={sepsisGate} onChange={setSepsisGate} accent="red" /></FL>
        {sepsisGate === 'Yes' && (
          <>
            <FL label="Organ dysfunction (≥1 = severe sepsis)">
              <Pills options={['Cardiovascular (fluid-refractory hypotension)','Respiratory (PaO2/FiO2 <300)','Neurological (GCS drop ≥3)','Haematological (platelets <80k)','Renal (creatinine >2× normal)','Hepatic (bilirubin/ALT >2× normal)','None yet']}
                value={sepsisOrgan} onChange={setSepsisOrgan} accent="red" multi />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Septic shock?"><Pills options={['Yes — fluid refractory','Yes — catecholamine-resistant','No']} value={septicShock} onChange={setSepticShock} accent="red" /></FL>
              <FL label="IV fluid bolus given">
                <Pills options={['20mL/kg isotonic (PALS)','10mL/kg (neonatal/cardiac risk)','Multiple boluses (>40mL/kg)','None yet']}
                  value={fluidGiven} onChange={setFluidGiven} accent="blue" />
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Vasopressor"><Pills options={['Dopamine','Norepinephrine','Epinephrine','Dobutamine','None']} value={vasopressor} onChange={setVasopressor} accent="orange" /></FL>
              <FL label="Antibiotics within 1h"><Pills options={['Yes — given','No — start immediately']} value={antibiotics} onChange={setAntibiotics} accent="teal" /></FL>
            </div>
          </>
        )}
      </Section>

      {/* Cardiac arrest */}
      <Section title="Cardiac Arrest / PALS" applicable={sec.arrest} onApplicable={v => sa('arrest', v)} accent="red">
        <FL label="Cardiac arrest?"><Pills options={['Yes','No']} value={arrestGate} onChange={setArrestGate} accent="red" /></FL>
        {arrestGate === 'Yes' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FL label="CPR started"><Pills options={['Yes — high-quality CPR','No — bystander CPR only','Not started']} value={cprStarted} onChange={setCprStarted} accent="red" /></FL>
              <FL label="Arrest rhythm"><Pills options={['VF','Pulseless VT','Asystole','PEA']} value={rhythm} onChange={setRhythm} accent="red" /></FL>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FL label="AED/defibrillation"><Pills options={['Shocked (4J/kg)','Not shockable','Not available']} value={aed} onChange={setAed} accent="orange" /></FL>
              <FL label="Epinephrine IV/IO"><Pills options={['Given (0.01mg/kg)','Not given']} value={epinephrine} onChange={setEpinephrine} accent="red" /></FL>
              <FL label="ROSC achieved"><Pills options={['Yes','No — ongoing','Pronounced']} value={rosc} onChange={setRosc} accent="emerald" /></FL>
            </div>
          </>
        )}
      </Section>

      {/* Trauma */}
      <Section title="Paediatric Trauma" applicable={sec.trauma} onApplicable={v => sa('trauma', v)} accent="orange">
        <FL label="Significant trauma?"><Pills options={['Yes','No']} value={traumaGate} onChange={setTraumaGate} accent="orange" /></FL>
        {traumaGate === 'Yes' && (
          <>
            <FL label="Mechanism">
              <Pills options={['Road traffic accident (pedestrian)','RTA (passenger)','Fall from height','Bicycle accident','Sports injury','Drowning/submersion','Assault','Animal bite','Snake bite','Burns']}
                value={traumaMechanism} onChange={setTraumaMechanism} accent="orange" />
            </FL>
            <FL label="Injuries identified">
              <Pills options={['Head injury','Cervical spine injury','Chest injury (pneumothorax/haemothorax)','Abdominal trauma','Pelvic fracture','Long bone fracture','Open wound','Spinal injury','Eye injury']}
                value={traumaFeatures} onChange={setTraumaFeatures} accent="red" multi />
            </FL>
            <div className="grid grid-cols-3 gap-3">
              <FL label="GCS Eye" sub="(1-4)"><input type="number" min="1" max="4" value={gcsE} onChange={e => setGcsE(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
              <FL label="GCS Verbal" sub="(1-5)"><input type="number" min="1" max="5" value={gcsV} onChange={e => setGcsV(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
              <FL label="GCS Motor" sub="(1-6)"><input type="number" min="1" max="6" value={gcsM} onChange={e => setGcsM(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
            </div>
            {gcsPeds && <div className="bg-gray-50 border rounded-lg p-2 text-sm font-semibold">GCS Total: {gcsPeds}/15 {gcsPeds < 8 ? '— Intubation threshold' : ''}</div>}
            <FL label="CT head">
              <Pills options={['Normal','Extradural haematoma','Subdural haematoma','Diffuse axonal injury','Contusion','Skull fracture','Not done — stable']}
                value={ctHead} onChange={setCtHead} accent="violet" />
            </FL>
          </>
        )}
      </Section>

      {/* Burns */}
      <Section title="Burns Assessment (Lund-Browder)" applicable={sec.burns} onApplicable={v => sa('burns', v)} accent="orange">
        <FL label="Burns present?"><Pills options={['Yes','No']} value={burnsGate} onChange={setBurnsGate} accent="orange" /></FL>
        {burnsGate === 'Yes' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Burn type">
                <Pills options={['Thermal (flame/scald)','Chemical','Electrical','Radiation']} value={burnsType} onChange={setBurnsType} accent="orange" />
              </FL>
              <FL label="Burn depth">
                <Pills options={['Superficial (1st degree)','Superficial partial-thickness (2nd)','Deep partial-thickness','Full thickness (3rd degree)','4th degree (bone/tendon)']}
                  value={burnsDepth} onChange={setBurnsDepth} accent="red" multi />
              </FL>
            </div>
            <FL label="TBSA (% total body surface area — use Lund-Browder chart for children)">
              <input type="number" step="0.5" value={burnsTBSA} onChange={e => setBurnsTBSA(e.target.value)} className="w-32 border rounded-lg px-2 py-1.5 text-sm" placeholder="%" />
            </FL>
            {parkland && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
                <p className="text-sm font-semibold text-amber-800">Parkland formula (modified): {parkland} mL Ringer's lactate in 24h</p>
                <p className="text-xs text-amber-600">½ in first 8h, ½ in next 16h (from time of injury, not presentation)</p>
              </div>
            )}
          </>
        )}
      </Section>

      {/* Poisoning */}
      <Section title="Poisoning & Toxicology" applicable={sec.poisoning} onApplicable={v => sa('poisoning', v)} accent="violet">
        <FL label="Poisoning/overdose?"><Pills options={['Yes','No']} value={poisonGate} onChange={setPoisonGate} accent="violet" /></FL>
        {poisonGate === 'Yes' && (
          <>
            <FL label="Agent">
              <Pills options={['Organophosphate (OPC)','Paracetamol overdose','Iron tablets','Kerosene/hydrocarbon','Unknown — household chemical','Medication (name below)','Snake bite','Scorpion sting','Plant toxin','Alcohol']}
                value={poisonAgent} onChange={setPoisonAgent} accent="violet" />
            </FL>
            <FL label="Route"><Pills options={['Ingestion','Inhalation','Dermal','Injection']} value={poisonRoute} onChange={setPoisonRoute} accent="violet" /></FL>
            <FL label="Toxidrome features">
              <Pills options={['Cholinergic (SLUDGE — salivation, lacrimation, urination, defecation, GI, emesis)','Anticholinergic (dry as bone, blind as bat, red as beet)','Opioid (miosis, bradypnoea, coma)','Sympathomimetic (tachycardia, hypertension)','Serotonin syndrome','Seizures','Liver failure (paracetamol)','Hypoglycaemia']}
                value={poisonFeatures} onChange={setPoisonFeatures} accent="violet" multi />
            </FL>
            <FL label="Treatment given">
              <Pills options={['Activated charcoal (1g/kg)','Atropine (OPC)','Pralidoxime (OPC)','N-acetylcysteine (paracetamol)','Naloxone (opioid)','Deferoxamine (iron)','Antivenom (snake)','Lavage (rarely in children)','Decontamination (skin/eye)']}
                value={poisonTx} onChange={setPoisonTx} accent="teal" multi />
            </FL>
          </>
        )}
      </Section>

      {/* Drowning */}
      <Section title="Drowning / Near-Drowning" applicable={sec.drowning} onApplicable={v => sa('drowning', v)} accent="blue">
        <FL label="Drowning event?"><Pills options={['Yes','No']} value={drowningGate} onChange={setDrowningGate} accent="blue" /></FL>
        {drowningGate === 'Yes' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <FL label="Submersion duration"><Pills options={['<5 min (good prognosis)','5-10 min','10-25 min','>25 min (poor prognosis)']} value={drowningDuration} onChange={setDrowningDuration} accent="blue" /></FL>
              <FL label="Water type"><Pills options={['Fresh water','Salt water','Contaminated water','Pool (chlorinated)']} value={drowningWater} onChange={setDrowningWater} accent="blue" /></FL>
              <FL label="Status on arrival">
                <Pills options={['Alert and well','Breathing spontaneously','Apnoeic — CPR started','Cardiac arrest','Hypothermia']}
                  value={drowningStatus} onChange={setDrowningStatus} accent="red" />
              </FL>
            </div>
          </>
        )}
      </Section>

      <button type="button" onClick={handleSave}
        className="w-full py-3 rounded-2xl bg-red-700 hover:bg-red-800 text-white font-bold text-base shadow-lg transition-all">
        Save Emergency Assessment
      </button>
    </div>
  );
}
