/**
 * @shared-pool
 * PediatricFeverInfectionsForm — Pediatric Fever & Infectious Diseases Assessment
 * Yale Observation Score, IMNCI danger signs, WHO dengue 2009 classification,
 * Malaria rapid assessment, Enteric fever (Typhoid), Meningitis, Kawasaki,
 * Sepsis (Goldstein pediatric criteria), COVID/respiratory viruses
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useMemo } from 'react';
import { Lock, ChevronDown, ChevronUp, AlertTriangle, Thermometer } from 'lucide-react';
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
  const toggle = (o) => {
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

function Gate({ label, value, onChange, accent = 'red', children }) {
  const ac = A[accent];
  return (
    <div className={`border rounded-xl p-4 ${value === 'Yes' ? ac.bg + ' ' + ac.border : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-gray-800 text-sm">{label}</span>
        <div className="flex gap-2">
          {['Yes', 'No'].map(opt => (
            <button key={opt} type="button" onClick={() => onChange(opt)}
              className={`px-4 py-1 rounded-full border text-sm font-medium transition-all
                ${value === opt ? ac.active : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      {value === 'Yes' && <div className="mt-3 space-y-4">{children}</div>}
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
                  : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'}`}>
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

export default function PediatricFeverInfectionsForm({ patientId, encounterId, onSaved }) {
  const [sec, setSec] = useState({
    overview: 'Applicable', yale: 'Applicable', imnci: 'Applicable',
    dengue: 'Applicable', malaria: 'Applicable', enteric: 'Applicable',
    meningitis: 'Applicable', sepsis: 'Applicable', kawasaki: 'Applicable',
    respiratory: 'Applicable', investigations: 'Applicable',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  // Overview
  const [age, setAge] = useState('');
  const [ageUnit, setAgeUnit] = useState('months');
  const [temp, setTemp] = useState('');
  const [feverDays, setFeverDays] = useState('');
  const [feverPattern, setFeverPattern] = useState('');
  const [vaccStatus, setVaccStatus] = useState('');

  // Yale Observation Score
  const [yaleQuality, setYaleQuality] = useState('');
  const [yaleHydration, setYaleHydration] = useState('');
  const [yalePeriphCirc, setYalePeriphCirc] = useState('');
  const [yaleReactivity, setYaleReactivity] = useState('');
  const [yaleSkin, setYaleSkin] = useState('');
  const [yaleResponse, setYaleResponse] = useState('');

  // IMNCI danger signs
  const [imnciFever, setImnciFever] = useState([]);
  const [imnciDanger, setImnciDanger] = useState([]);

  // Dengue
  const [dengueSuspect, setDengueSuspect] = useState('');
  const [dengueWarning, setDengueWarning] = useState([]);
  const [dengueClassification, setDengueClassification] = useState('');
  const [dengueNS1, setDengueNS1] = useState('');
  const [dengueIgM, setDengueIgM] = useState('');
  const [platelet, setPlatelet] = useState('');
  const [hematocrit, setHematocrit] = useState('');
  const [dengueLeakage, setDengueLeakage] = useState([]);

  // Malaria
  const [malariaSuspect, setMalariaSuspect] = useState('');
  const [malariaRDT, setMalariaRDT] = useState('');
  const [malariaSmear, setMalariaSmear] = useState('');
  const [malariaSpecies, setMalariaSpecies] = useState('');
  const [malariaSeverity, setMalariaSeverity] = useState([]);
  const [malariaParasitemia, setMalariaParasitemia] = useState('');

  // Enteric fever
  const [entericSuspect, setEntericSuspect] = useState('');
  const [widals, setWidals] = useState('');
  const [bloodCulture, setBloodCulture] = useState('');
  const [entericComp, setEntericComp] = useState([]);
  const [entericAbx, setEntericAbx] = useState('');

  // Meningitis
  const [meningitisSuspect, setMeningitisSuspect] = useState('');
  const [kernig, setKernig] = useState('');
  const [brudzinski, setBrudzinski] = useState('');
  const [csfDone, setCsfDone] = useState('');
  const [csfAppearance, setCsfAppearance] = useState('');
  const [csfProtein, setCsfProtein] = useState('');
  const [csfGlucose, setCsfGlucose] = useState('');
  const [csfCells, setCsfCells] = useState('');
  const [meningitisType, setMeningitisType] = useState('');

  // Sepsis
  const [sepsisSuspect, setSepsisSuspect] = useState('');
  const [sepsisSource, setSepsisSource] = useState('');
  const [hr, setHr] = useState('');
  const [rr, setRr] = useState('');
  const [bp, setBp] = useState('');
  const [gcs, setGcs] = useState('');
  const [septicShock, setSepticShock] = useState('');
  const [antibioticsGiven, setAntibioticsGiven] = useState('');

  // Kawasaki
  const [kawasakiSuspect, setKawasakiSuspect] = useState('');
  const [kawasakiCriteria, setKawasakiCriteria] = useState([]);
  const [echo, setEcho] = useState('');
  const [ivig, setIvig] = useState('');

  // Respiratory viral
  const [respSuspect, setRespSuspect] = useState('');
  const [covidStatus, setCovidStatus] = useState('');
  const [influenza, setInfluenza] = useState('');
  const [rsv, setRsv] = useState('');

  // Investigations
  const [cbc, setCbc] = useState('');
  const [cbcFindings, setCbcFindings] = useState([]);
  const [crp, setCrp] = useState('');
  const [procalcitonin, setProcalcitonin] = useState('');
  const [lft, setLft] = useState('');
  const [urine, setUrine] = useState('');

  // Yale score calculation
  const yaleScore = useMemo(() => {
    const map = {
      yaleQuality: { 'Strong/contented':1, 'If/stops crying':3, 'Weak/moaning':5 },
      yaleHydration: { 'Eyes normal/moist':1, 'Eyes sl.sunken':3, 'Eyes sunken/dry':5 },
      yalePeriphCirc: { 'Normal':1, 'Decreased':3, 'None':5 },
      yaleReactivity: { 'Brief cry then stops':1, 'Brief cry then awake':3, 'Continual cry/sleep':5 },
      yaleSkin: { 'Normal':1, 'Decreased':3, 'Tenting':5 },
      yaleResponse: { 'Smiles/alert':1, 'Brief smile':3, 'No smile/anxious':5 },
    };
    const vals = { yaleQuality, yaleHydration, yalePeriphCirc, yaleReactivity, yaleSkin, yaleResponse };
    let total = 0; let filled = 0;
    Object.entries(vals).forEach(([k, v]) => {
      if (map[k][v]) { total += map[k][v]; filled++; }
    });
    return { total, filled };
  }, [yaleQuality, yaleHydration, yalePeriphCirc, yaleReactivity, yaleSkin, yaleResponse]);

  const yaleRisk = useMemo(() => {
    const t = yaleScore.total;
    if (yaleScore.filled < 6) return null;
    if (t <= 10) return { label: 'Low risk', color: 'text-green-700' };
    if (t <= 15) return { label: 'Moderate risk — close observation', color: 'text-amber-700' };
    return { label: 'High risk — serious illness likely', color: 'text-red-700 font-bold' };
  }, [yaleScore]);

  const dengueAlert = dengueClassification === 'Severe dengue' || (parseFloat(platelet) < 20000);
  const sepsisAlert = septicShock === 'Yes';

  const handleSave = async () => {
    await api.post('/assessments', {
      type: 'pediatric-fever-infections',
      patientId, encounterId,
      data: {
        overview: { age, ageUnit, temp, feverDays, feverPattern, vaccStatus },
        yale: { yaleQuality, yaleHydration, yalePeriphCirc, yaleReactivity, yaleSkin, yaleResponse, score: yaleScore.total, risk: yaleRisk?.label },
        imnci: { imnciFever, imnciDanger },
        dengue: { suspect: dengueSuspect, warning: dengueWarning, classification: dengueClassification, ns1: dengueNS1, igm: dengueIgM, platelet, hematocrit, leakage: dengueLeakage },
        malaria: { suspect: malariaSuspect, rdt: malariaRDT, smear: malariaSmear, species: malariaSpecies, severity: malariaSeverity, parasitemia: malariaParasitemia },
        enteric: { suspect: entericSuspect, widals, bloodCulture, complications: entericComp, antibiotics: entericAbx },
        meningitis: { suspect: meningitisSuspect, kernig, brudzinski, csfDone, csfAppearance, csfProtein, csfGlucose, csfCells, type: meningitisType },
        sepsis: { suspect: sepsisSuspect, source: sepsisSource, hr, rr, bp, gcs, shock: septicShock, antibiotics: antibioticsGiven },
        kawasaki: { suspect: kawasakiSuspect, criteria: kawasakiCriteria, echo, ivig },
        respiratory: { suspect: respSuspect, covid: covidStatus, influenza, rsv },
        investigations: { cbc, cbcFindings, crp, procalcitonin, lft, urine },
      }
    });
    onSaved?.();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <Thermometer className="w-8 h-8 opacity-80" />
          <div>
            <h2 className="text-xl font-bold">Pediatric Fever & Infectious Diseases</h2>
            <p className="text-red-100 text-sm">Yale Score · IMNCI · Dengue WHO 2009 · Malaria · Enteric Fever · Meningitis · Kawasaki · Sepsis</p>
          </div>
        </div>
      </div>

      {/* Critical alerts */}
      {(dengueAlert || sepsisAlert) && (
        <div className="bg-red-50 border-2 border-red-600 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700">Critical Alert</p>
            {dengueAlert && <p className="text-sm text-red-600">Severe dengue / platelet &lt;20,000 — ICU monitoring, platelet transfusion protocol</p>}
            {sepsisAlert && <p className="text-sm text-red-600">Septic shock — aggressive fluid resuscitation, vasopressors, broad-spectrum IV antibiotics within 1 hour</p>}
          </div>
        </div>
      )}

      {/* Overview */}
      <Section title="Fever Overview" applicable={sec.overview} onApplicable={v => sa('overview', v)} accent="red">
        <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
          <p className={`font-semibold ${A.amber.text}`}>India context — Endemic burden</p>
          <p className="text-gray-600 mt-1">Dengue: 10+ lakh cases/year (monsoon peak Aug–Oct). Malaria: 0.5M cases/year (P. falciparum &amp; P. vivax).
            Enteric fever: 5M cases/year. JE endemic in 24 states. Scrub typhus emerging.
            IMNCI is GoI standard for under-5 assessment at PHC level.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Age">
            <div className="flex gap-2">
              <input type="number" value={age} onChange={e => setAge(e.target.value)}
                placeholder="0" className="w-16 border rounded-lg px-2 py-1.5 text-sm" />
              <select value={ageUnit} onChange={e => setAgeUnit(e.target.value)}
                className="flex-1 border rounded-lg px-2 py-1.5 text-sm">
                <option>days</option><option>months</option><option>years</option>
              </select>
            </div>
          </FL>
          <FL label="Temperature" sub="°C">
            <input type="number" step="0.1" value={temp} onChange={e => setTemp(e.target.value)}
              placeholder="38.5" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          </FL>
          <FL label="Fever duration" sub="days">
            <input type="number" value={feverDays} onChange={e => setFeverDays(e.target.value)}
              placeholder="days" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          </FL>
        </div>
        <FL label="Fever pattern">
          <Pills options={['Continuous','Remittent','Intermittent','Hectic/Saddleback','Step-ladder (Enteric)','Biphasic']}
            value={feverPattern} onChange={setFeverPattern} accent="red" />
        </FL>
        <FL label="Vaccination status">
          <Pills options={['Complete for age','Incomplete','Unvaccinated','Unknown']}
            value={vaccStatus} onChange={setVaccStatus} accent="amber" />
        </FL>
      </Section>

      {/* Yale Observation Score */}
      <Section title="Yale Observation Score (YOS)" applicable={sec.yale} onApplicable={v => sa('yale', v)} accent="orange">
        <div className={`p-3 rounded-lg text-sm ${A.orange.bg} ${A.orange.border} border`}>
          <p className={`font-semibold ${A.orange.text}`}>For febrile infants 3–36 months — YOS ≤10: low risk; ≥16: high risk SBI</p>
        </div>
        <div className="bg-white rounded-xl border divide-y">
          <ScoreRow label="Quality of cry" accent="orange" value={yaleQuality} onChange={setYaleQuality}
            options={[{label:'Strong/contented',score:1},{label:'If/stops crying',score:3},{label:'Weak/moaning',score:5}]} />
          <ScoreRow label="Reaction to parent stimulation" accent="orange" value={yaleReactivity} onChange={setYaleReactivity}
            options={[{label:'Brief cry then stops',score:1},{label:'Brief cry then awake',score:3},{label:'Continual cry/sleep',score:5}]} />
          <ScoreRow label="State variation" accent="orange" value={yaleSkin} onChange={setYaleSkin}
            options={[{label:'Normal',score:1},{label:'Decreased',score:3},{label:'Tenting',score:5}]} />
          <ScoreRow label="Colour" accent="orange" value={yalePeriphCirc} onChange={setYalePeriphCirc}
            options={[{label:'Normal',score:1},{label:'Decreased',score:3},{label:'None',score:5}]} />
          <ScoreRow label="Hydration" accent="orange" value={yaleHydration} onChange={setYaleHydration}
            options={[{label:'Eyes normal/moist',score:1},{label:'Eyes sl.sunken',score:3},{label:'Eyes sunken/dry',score:5}]} />
          <ScoreRow label="Response to social overtures" accent="orange" value={yaleResponse} onChange={setYaleResponse}
            options={[{label:'Smiles/alert',score:1},{label:'Brief smile',score:3},{label:'No smile/anxious',score:5}]} />
        </div>
        {yaleScore.filled === 6 && (
          <div className={`p-3 rounded-lg border ${yaleScore.total > 15 ? 'bg-red-50 border-red-400' : yaleScore.total > 10 ? 'bg-amber-50 border-amber-400' : 'bg-green-50 border-green-400'}`}>
            <p className="font-bold text-gray-700">YOS Total: {yaleScore.total}/30</p>
            {yaleRisk && <p className={`text-sm ${yaleRisk.color}`}>{yaleRisk.label}</p>}
          </div>
        )}
      </Section>

      {/* IMNCI */}
      <Section title="IMNCI Assessment (WHO/GoI)" applicable={sec.imnci} onApplicable={v => sa('imnci', v)} accent="red">
        <div className={`p-3 rounded-lg text-sm ${A.red.bg} ${A.red.border} border`}>
          <p className={`font-semibold ${A.red.text}`}>Integrated Management of Neonatal and Childhood Illness — India 2014</p>
        </div>
        <FL label="IMNCI General Danger Signs (ANY = refer immediately)">
          <Pills options={['Unable to drink/breastfeed','Vomits everything','Convulsions (current/recent)',
            'Lethargic/unconscious','Stridor at rest','Severe respiratory distress','None']}
            value={imnciDanger} onChange={setImnciDanger} accent="red" multi />
        </FL>
        <FL label="Fever Assessment (IMNCI — 2 months to 5 years)">
          <Pills options={['No stiff neck','Stiff neck → meningitis','Fever ≥5d → refer',
            'Measles (rash + fever)','Localised infection only','Malaria risk area','None']}
            value={imnciFever} onChange={setImnciFever} accent="orange" multi />
        </FL>
      </Section>

      {/* Dengue */}
      <Section title="Dengue Assessment (WHO 2009)" applicable={sec.dengue} onApplicable={v => sa('dengue', v)} accent="amber">
        <FL label="Dengue suspected?">
          <Pills options={['Yes','No','Possible']} value={dengueSuspect} onChange={setDengueSuspect} accent="amber" />
        </FL>
        {dengueSuspect === 'Yes' && (
          <>
            <FL label="Warning signs (WHO 2009)">
              <Pills options={['Abdominal pain/tenderness','Persistent vomiting','Clinical fluid accumulation',
                'Mucosal bleed','Lethargy/restlessness','Liver enlargement >2cm','Rapid ↓platelets + rising HCT']}
                value={dengueWarning} onChange={setDengueWarning} accent="amber" multi />
            </FL>
            <FL label="WHO Classification">
              <Pills options={['Dengue without warning signs','Dengue with warning signs','Severe dengue']}
                value={dengueClassification} onChange={setDengueClassification} accent="red" />
            </FL>
            <FL label="Plasma leakage evidence">
              <Pills options={['Pleural effusion','Ascites','↑Haematocrit >20%','Hypoalbuminaemia','Shock']}
                value={dengueLeakage} onChange={setDengueLeakage} accent="orange" multi />
            </FL>
            <div className="grid grid-cols-3 gap-3">
              <FL label="NS1 Antigen">
                <Pills options={['Positive','Negative','Pending']} value={dengueNS1} onChange={setDengueNS1} accent="amber" />
              </FL>
              <FL label="Platelet count" sub="×10³/µL">
                <input type="number" value={platelet} onChange={e => setPlatelet(e.target.value)}
                  className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="150" />
                {parseFloat(platelet) < 20 && <p className="text-red-700 text-xs font-bold mt-1">CRITICAL &lt;20k — Transfusion!</p>}
                {parseFloat(platelet) >= 20 && parseFloat(platelet) < 100 && <p className="text-amber-700 text-xs mt-1">Thrombocytopenia</p>}
              </FL>
              <FL label="Haematocrit" sub="%">
                <input type="number" value={hematocrit} onChange={e => setHematocrit(e.target.value)}
                  className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="%" />
              </FL>
            </div>
          </>
        )}
      </Section>

      {/* Malaria */}
      <Section title="Malaria Assessment" applicable={sec.malaria} onApplicable={v => sa('malaria', v)} accent="teal">
        <div className={`p-3 rounded-lg text-sm ${A.teal.bg} ${A.teal.border} border`}>
          <p className={`font-semibold ${A.teal.text}`}>India malaria burden</p>
          <p className="text-gray-600 mt-1">P. falciparum dominates in Odisha, Chhattisgarh, Jharkhand, MP, North-East (80%).
            P. vivax predominates in Gujarat, Rajasthan. Use rapid diagnostic tests (RDT) for rapid diagnosis.
            Treat falciparum with ACT (Artemether-Lumefantrine) per NVBDCP guidelines.</p>
        </div>
        <FL label="Malaria suspected?">
          <Pills options={['Yes','No','Possible']} value={malariaSuspect} onChange={setMalariaSuspect} accent="teal" />
        </FL>
        {malariaSuspect === 'Yes' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <FL label="RDT Result">
                <Pills options={['Pf positive','Pv positive','Both','Negative','Not done']}
                  value={malariaRDT} onChange={setMalariaRDT} accent="teal" />
              </FL>
              <FL label="Peripheral smear">
                <Pills options={['Pf','Pv','Pm','Mixed','Negative','Not done']}
                  value={malariaSmear} onChange={setMalariaSmear} accent="teal" />
              </FL>
              <FL label="Parasitemia level">
                <Pills options={['+','++','+++','++++']} value={malariaParasitemia} onChange={setMalariaParasitemia} accent="teal" />
              </FL>
            </div>
            <FL label="Severe malaria features (WHO 2015)">
              <Pills options={['Impaired consciousness','Seizures ≥2','Prostration (unable to sit)',
                'Respiratory distress','Severe anaemia (Hb <5)','Hyperparasitaemia (>5%)','Jaundice',
                'Haemoglobinuria','Shock','Bleeding','Hypoglycaemia','Pulmonary oedema','Renal failure']}
                value={malariaSeverity} onChange={setMalariaSeverity} accent="red" multi />
            </FL>
          </>
        )}
      </Section>

      {/* Enteric Fever */}
      <Section title="Enteric Fever (Typhoid)" applicable={sec.enteric} onApplicable={v => sa('enteric', v)} accent="violet">
        <FL label="Enteric fever suspected?">
          <Pills options={['Yes','No','Possible']} value={entericSuspect} onChange={setEntericSuspect} accent="violet" />
        </FL>
        {entericSuspect === 'Yes' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Widal Test">
                <Pills options={['O titre ≥1:160','H titre ≥1:160','Both ≥1:160','Negative','Not reliable (endemic area)']}
                  value={widals} onChange={setWidals} accent="violet" />
              </FL>
              <FL label="Blood/Bone marrow culture">
                <Pills options={['S. Typhi','S. Paratyphi A','S. Paratyphi B','Negative','Pending','Not done']}
                  value={bloodCulture} onChange={setBloodCulture} accent="violet" />
              </FL>
            </div>
            <FL label="Antibiotics" sub="(NVBDCP/IAP guidelines)">
              <Pills options={['Ceftriaxone IV','Azithromycin PO','Ciprofloxacin','Cefixime (oral)','ESBL — Meropenem']}
                value={entericAbx} onChange={setEntericAbx} accent="blue" />
            </FL>
            <FL label="Complications">
              <Pills options={['Intestinal perforation','Gastrointestinal haemorrhage','Hepatitis','Myocarditis',
                'Encephalopathy','Relapse','Carrier state','None']}
                value={entericComp} onChange={setEntericComp} accent="red" multi />
            </FL>
          </>
        )}
      </Section>

      {/* Meningitis */}
      <Section title="Meningitis / CNS Infection" applicable={sec.meningitis} onApplicable={v => sa('meningitis', v)} accent="red">
        <FL label="Meningitis suspected?">
          <Pills options={['Yes','No','Possible']} value={meningitisSuspect} onChange={setMeningitisSuspect} accent="red" />
        </FL>
        {meningitisSuspect === 'Yes' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Kernig's sign"><Pills options={['Positive','Negative']} value={kernig} onChange={setKernig} accent="red" /></FL>
              <FL label="Brudzinski's sign"><Pills options={['Positive','Negative']} value={brudzinski} onChange={setBrudzinski} accent="red" /></FL>
            </div>
            <FL label="Lumbar puncture done?">
              <Pills options={['Yes','No — contraindicated','No — CT first','Pending']} value={csfDone} onChange={setCsfDone} accent="red" />
            </FL>
            {csfDone === 'Yes' && (
              <div className="grid grid-cols-2 gap-3">
                <FL label="CSF appearance">
                  <Pills options={['Clear','Turbid','Xanthochromic','Bloody']} value={csfAppearance} onChange={setCsfAppearance} accent="red" />
                </FL>
                <FL label="CSF type">
                  <Pills options={['Bacterial','Viral (aseptic)','Tubercular','Fungal','Eosinophilic']}
                    value={meningitisType} onChange={setMeningitisType} accent="red" />
                </FL>
                <FL label="CSF Protein" sub="mg/dL">
                  <input type="number" value={csfProtein} onChange={e => setCsfProtein(e.target.value)}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="mg/dL" />
                </FL>
                <FL label="CSF Glucose" sub="mg/dL">
                  <input type="number" value={csfGlucose} onChange={e => setCsfGlucose(e.target.value)}
                    className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="mg/dL" />
                </FL>
              </div>
            )}
          </>
        )}
      </Section>

      {/* Pediatric Sepsis */}
      <Section title="Pediatric Sepsis (Goldstein Criteria)" applicable={sec.sepsis} onApplicable={v => sa('sepsis', v)} accent="red">
        <FL label="Sepsis suspected?">
          <Pills options={['Yes','No','Possible']} value={sepsisSuspect} onChange={setSepsisSuspect} accent="red" />
        </FL>
        {sepsisSuspect === 'Yes' && (
          <>
            <FL label="Suspected source">
              <Pills options={['Pneumonia','UTI','Skin/soft tissue','CNS','GI','Catheter-related','Unknown']}
                value={sepsisSource} onChange={setSepsisSource} accent="orange" />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Heart rate" sub="bpm"><input type="number" value={hr} onChange={e => setHr(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
              <FL label="Respiratory rate" sub="/min"><input type="number" value={rr} onChange={e => setRr(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
              <FL label="Blood pressure" sub="mmHg"><input type="text" value={bp} onChange={e => setBp(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="SBP/DBP" /></FL>
              <FL label="GCS"><input type="number" value={gcs} onChange={e => setGcs(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="3-15" /></FL>
            </div>
            <FL label="Septic shock present?">
              <Pills options={['Yes — fluid-refractory','Yes — catecholamine-resistant','No']}
                value={septicShock} onChange={setSepticShock} accent="red" />
            </FL>
            <FL label="Empirical antibiotics started">
              <Pills options={['Yes — within 1h','Yes — delayed','No — awaiting cultures','Not required']}
                value={antibioticsGiven} onChange={setAntibioticsGiven} accent="teal" />
            </FL>
          </>
        )}
      </Section>

      {/* Kawasaki */}
      <Section title="Kawasaki Disease" applicable={sec.kawasaki} onApplicable={v => sa('kawasaki', v)} accent="orange">
        <FL label="Kawasaki disease suspected?">
          <Pills options={['Yes — classic','Yes — incomplete','No']} value={kawasakiSuspect} onChange={setKawasakiSuspect} accent="orange" />
        </FL>
        {(kawasakiSuspect === 'Yes — classic' || kawasakiSuspect === 'Yes — incomplete') && (
          <>
            <FL label="Kawasaki criteria (≥4 of 5 for classic)">
              <Pills options={['Fever ≥5 days','Bilateral conjunctival injection (non-purulent)',
                'Polymorphous rash','Cervical lymphadenopathy (>1.5cm)','Oral changes (strawberry tongue/red lips)',
                'Extremity changes (erythema/oedema/peeling)']}
                value={kawasakiCriteria} onChange={setKawasakiCriteria} accent="orange" multi />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Echocardiogram">
                <Pills options={['Normal','Coronary artery dilatation (z≥2.5)','Coronary aneurysm','Not done']}
                  value={echo} onChange={setEcho} accent="red" />
              </FL>
              <FL label="IVIG given (2g/kg)">
                <Pills options={['Yes','No','Planned']} value={ivig} onChange={setIvig} accent="teal" />
              </FL>
            </div>
          </>
        )}
      </Section>

      {/* Investigations */}
      <Section title="Laboratory Investigations" applicable={sec.investigations} onApplicable={v => sa('investigations', v)} accent="blue">
        <div className="grid grid-cols-2 gap-3">
          <FL label="CBC / Complete blood count">
            <Pills options={['Normal','Leucocytosis','Leucopenia','Neutrophilia','Left shift','Anaemia','Thrombocytopenia','Atypical lymphocytes']}
              value={cbcFindings} onChange={setCbcFindings} accent="blue" multi />
          </FL>
          <FL label="CRP" sub="mg/L">
            <input type="number" value={crp} onChange={e => setCrp(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="mg/L" />
          </FL>
          <FL label="Procalcitonin" sub="ng/mL">
            <input type="number" step="0.1" value={procalcitonin} onChange={e => setProcalcitonin(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="ng/mL" />
          </FL>
          <FL label="LFT">
            <Pills options={['Normal','Raised transaminases','Jaundice','Not done']} value={lft} onChange={setLft} accent="amber" />
          </FL>
        </div>
      </Section>

      <button type="button" onClick={handleSave}
        className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-base shadow-lg transition-all">
        Save Fever & Infections Assessment
      </button>
    </div>
  );
}
