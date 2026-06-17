/**
 * @shared-pool
 * PediatricRespiratoryForm — Pediatric Respiratory Assessment
 * Westley Croup Score, PRAM/PASS (Asthma), Silverman-Anderson (RDS),
 * WHO pneumonia classification, ARDS (Paediatric Berlin), RSV/Bronchiolitis,
 * GINA pediatric stepwise therapy, peak flow, SpO2 targets
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useMemo } from 'react';
import { Lock, AlertTriangle, Wind } from 'lucide-react';
import api from '../../../api/client';

const A = {
  sky:    { bg:'bg-sky-50',     border:'border-sky-300',     text:'text-sky-700',
            pill:'bg-sky-100 border-sky-400 text-sky-800',
            active:'bg-sky-600 text-white border-sky-600' },
  blue:   { bg:'bg-blue-50',    border:'border-blue-300',    text:'text-blue-700',
            pill:'bg-blue-100 border-blue-400 text-blue-800',
            active:'bg-blue-600 text-white border-blue-600' },
  red:    { bg:'bg-red-50',     border:'border-red-300',     text:'text-red-700',
            pill:'bg-red-100 border-red-400 text-red-800',
            active:'bg-red-600 text-white border-red-600' },
  amber:  { bg:'bg-amber-50',   border:'border-amber-300',   text:'text-amber-700',
            pill:'bg-amber-100 border-amber-400 text-amber-800',
            active:'bg-amber-600 text-white border-amber-600' },
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

function Pills({ options, value, onChange, accent = 'sky', multi = false }) {
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

function Gate({ label, value, onChange, accent = 'sky', children }) {
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

function Section({ title, applicable, onApplicable, accent = 'sky', children }) {
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

function ScoreRow({ label, options, value, onChange, accent = 'sky' }) {
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

export default function PediatricRespiratoryForm({ patientId, encounterId, onSaved }) {
  const [sec, setSec] = useState({
    vitals: 'Applicable', croup: 'Applicable', asthma: 'Applicable',
    pneumonia: 'Applicable', bronchiolitis: 'Applicable', rd: 'Applicable',
    cf: 'Applicable', tb: 'Applicable', imaging: 'Applicable', plan: 'Applicable',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  // Vitals
  const [age, setAge] = useState('');
  const [ageUnit, setAgeUnit] = useState('months');
  const [spo2, setSpo2] = useState('');
  const [rr, setRr] = useState('');
  const [hr, setHr] = useState('');
  const [fio2, setFio2] = useState('');
  const [o2delivery, setO2delivery] = useState('');

  // Westley Croup Score
  const [wStridor, setWStridor] = useState('');
  const [wRetractions, setWRetractions] = useState('');
  const [wAirEntry, setWAirEntry] = useState('');
  const [wCyanosis, setWCyanosis] = useState('');
  const [wConsciousness, setWConsciousness] = useState('');

  // Asthma — PRAM (Pediatric Respiratory Assessment Measure)
  const [asthmaGate, setAsthmaGate] = useState('');
  const [pramOxygen, setPramOxygen] = useState('');
  const [pramSuprasternal, setPramSuprasternal] = useState('');
  const [pramScalene, setPramScalene] = useState('');
  const [pramAirEntry, setPramAirEntry] = useState('');
  const [pramWheeze, setPramWheeze] = useState('');
  const [asthmaGina, setAsthmaGina] = useState('');
  const [peakflow, setPeakflow] = useState('');
  const [peakflowPct, setPeakflowPct] = useState('');
  const [asthmaTrigger, setAsthmaTrigger] = useState([]);
  const [salbutamol, setSalbutamol] = useState('');
  const [ipratropium, setIpratropium] = useState('');
  const [ivMgso4, setIvMgso4] = useState('');

  // WHO Pneumonia
  const [pneuGate, setPneuGate] = useState('');
  const [pneuWHO, setPneuWHO] = useState('');
  const [pneuFeatures, setPneuFeatures] = useState([]);
  const [pneuEtiology, setPneuEtiology] = useState('');
  const [pneuXray, setPneuXray] = useState('');
  const [pneuAbx, setPneuAbx] = useState('');

  // RSV/Bronchiolitis
  const [bronchGate, setBronchGate] = useState('');
  const [bronchScore, setBronchScore] = useState('');
  const [rsvTest, setRsvTest] = useState('');
  const [bronchFeed, setBronchFeed] = useState('');

  // Respiratory distress / Silverman-Anderson
  const [rdGate, setRdGate] = useState('');
  const [saUpperChest, setSaUpperChest] = useState('');
  const [saLowerChest, setSaLowerChest] = useState('');
  const [saXiphoid, setSaXiphoid] = useState('');
  const [saNares, setSaNares] = useState('');
  const [saExpression, setSaExpression] = useState('');
  const [ventMode, setVentMode] = useState('');

  // CF
  const [cfGate, setCfGate] = useState('');
  const [sweatTest, setSweatTest] = useState('');
  const [cftrMutation, setCftrMutation] = useState('');

  // TB
  const [tbGate, setTbGate] = useState('');
  const [tbSigns, setTbSigns] = useState([]);
  const [mantoux, setMantoux] = useState('');
  const [igra, setIgra] = useState('');
  const [tbXray, setTbXray] = useState('');

  // Imaging
  const [cxr, setCxr] = useState('');
  const [cxrFindings, setCxrFindings] = useState([]);
  const [ctChest, setCtChest] = useState('');
  const [echo, setEcho] = useState('');

  // Plan
  const [o2target, setO2target] = useState('');
  const [admitPlan, setAdmitPlan] = useState('');
  const [referral, setReferral] = useState('');
  const [planNotes, setPlanNotes] = useState('');

  // Westley score
  const westleyScore = useMemo(() => {
    const map = {
      wStridor: { 'None':0, 'With agitation':1, 'At rest':2 },
      wRetractions: { 'None':0, 'Mild':1, 'Moderate':2, 'Severe':3 },
      wAirEntry: { 'Normal':0, 'Decreased':1, 'Markedly decreased':2 },
      wCyanosis: { 'None':0, 'With agitation':4, 'At rest':5 },
      wConsciousness: { 'Normal':0, 'Altered':5 },
    };
    const vals = { wStridor, wRetractions, wAirEntry, wCyanosis, wConsciousness };
    let total = 0; let filled = 0;
    Object.entries(vals).forEach(([k, v]) => {
      if (map[k][v] !== undefined) { total += map[k][v]; filled++; }
    });
    return { total, filled };
  }, [wStridor, wRetractions, wAirEntry, wCyanosis, wConsciousness]);

  const westleySeverity = useMemo(() => {
    if (westleyScore.filled < 5) return null;
    const t = westleyScore.total;
    if (t <= 2) return { label: 'Mild croup', color: 'text-green-700' };
    if (t <= 5) return { label: 'Moderate croup', color: 'text-amber-700' };
    if (t <= 11) return { label: 'Severe croup', color: 'text-red-700 font-bold' };
    return { label: 'Impending respiratory failure', color: 'text-red-900 font-bold' };
  }, [westleyScore]);

  // PRAM score
  const pramScore = useMemo(() => {
    const map = {
      pramOxygen: { '≥95%':0, '92-94%':1, '<92%':3 },
      pramSuprasternal: { 'Absent':0, 'Present':2 },
      pramScalene: { 'Absent':0, 'Present':2 },
      pramAirEntry: { 'Normal':0, 'Decreased at base':1, 'Widespread decrease':2, 'Absent/minimal':3 },
      pramWheeze: { 'Absent':0, 'Expiratory only':1, 'Inspiratory and expiratory':2, 'Audible without stethoscope':3 },
    };
    const vals = { pramOxygen, pramSuprasternal, pramScalene, pramAirEntry, pramWheeze };
    let total = 0; let filled = 0;
    Object.entries(vals).forEach(([k, v]) => {
      if (map[k][v] !== undefined) { total += map[k][v]; filled++; }
    });
    return { total, filled };
  }, [pramOxygen, pramSuprasternal, pramScalene, pramAirEntry, pramWheeze]);

  const pramSeverity = useMemo(() => {
    if (pramScore.filled < 5) return null;
    const t = pramScore.total;
    if (t <= 3) return { label: 'Mild asthma', color: 'text-green-700' };
    if (t <= 6) return { label: 'Moderate asthma', color: 'text-amber-700' };
    return { label: 'Severe asthma', color: 'text-red-700 font-bold' };
  }, [pramScore]);

  // Silverman-Anderson score
  const saScore = useMemo(() => {
    const map = {
      saUpperChest: { 'Synchronised':0, 'Lag on inspiration':1, 'See-saw':2 },
      saLowerChest: { 'No retractions':0, 'Just visible':1, 'Marked':2 },
      saXiphoid: { 'None':0, 'Just visible':1, 'Marked':2 },
      saNares: { 'None':0, 'Minimal':1, 'Marked':2 },
      saExpression: { 'No grunt':0, 'Grunt with steth':1, 'Grunt audible':2 },
    };
    const vals = { saUpperChest, saLowerChest, saXiphoid, saNares, saExpression };
    let total = 0; let filled = 0;
    Object.entries(vals).forEach(([k, v]) => {
      if (map[k][v] !== undefined) { total += map[k][v]; filled++; }
    });
    return { total, filled };
  }, [saUpperChest, saLowerChest, saXiphoid, saNares, saExpression]);

  const saSeverity = useMemo(() => {
    if (saScore.filled < 5) return null;
    const t = saScore.total;
    if (t === 0) return { label: 'No distress', color: 'text-green-700' };
    if (t <= 3) return { label: 'Mild respiratory distress', color: 'text-amber-700' };
    if (t <= 6) return { label: 'Moderate distress', color: 'text-orange-700 font-semibold' };
    return { label: 'Severe distress — imminent failure', color: 'text-red-700 font-bold' };
  }, [saScore]);

  const severeAlert = saSeverity?.label?.includes('Severe') || pramSeverity?.label?.includes('Severe') || westleySeverity?.label?.includes('Severe');

  const handleSave = async () => {
    await api.post('/assessments', {
      type: 'pediatric-respiratory',
      patientId, encounterId,
      data: {
        vitals: { age, ageUnit, spo2, rr, hr, fio2, o2delivery },
        croup: { wStridor, wRetractions, wAirEntry, wCyanosis, wConsciousness, westleyTotal: westleyScore.total, severity: westleySeverity?.label },
        asthma: { gate: asthmaGate, pramOxygen, pramSuprasternal, pramScalene, pramAirEntry, pramWheeze, pramTotal: pramScore.total, severity: pramSeverity?.label, gina: asthmaGina, peakflow, peakflowPct, triggers: asthmaTrigger, salbutamol, ipratropium, ivMgso4 },
        pneumonia: { gate: pneuGate, who: pneuWHO, features: pneuFeatures, etiology: pneuEtiology, xray: pneuXray, antibiotics: pneuAbx },
        bronchiolitis: { gate: bronchGate, score: bronchScore, rsvTest, feedingImpact: bronchFeed },
        respiratoryDistress: { gate: rdGate, saUpperChest, saLowerChest, saXiphoid, saNares, saExpression, saTotal: saScore.total, severity: saSeverity?.label, ventMode },
        cf: { gate: cfGate, sweatTest, cftrMutation },
        tb: { gate: tbGate, signs: tbSigns, mantoux, igra, xray: tbXray },
        imaging: { cxr, cxrFindings, ctChest, echo },
        plan: { o2target, admitPlan, referral, planNotes },
      }
    });
    onSaved?.();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <Wind className="w-8 h-8 opacity-80" />
          <div>
            <h2 className="text-xl font-bold">Pediatric Respiratory Assessment</h2>
            <p className="text-sky-100 text-sm">Westley Croup · PRAM Asthma · WHO Pneumonia · Silverman-Anderson · Bronchiolitis · CF · TB</p>
          </div>
        </div>
      </div>

      {severeAlert && (
        <div className="bg-red-50 border-2 border-red-600 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700">Severe Respiratory Distress</p>
            <p className="text-sm text-red-600">Immediate airway assessment · High-flow O2 · Senior paediatrician · Consider PICU transfer</p>
          </div>
        </div>
      )}

      {/* Vitals */}
      <Section title="Respiratory Vitals & Oxygenation" applicable={sec.vitals} onApplicable={v => sa('vitals', v)} accent="sky">
        <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
          <p className={`font-semibold ${A.amber.text}`}>India context — Respiratory disease burden</p>
          <p className="text-gray-600 mt-1">Pneumonia is #1 cause of child death under 5 (18% globally, India RMNCH+A target).
            Asthma prevalence 10-15% (India). TB: India has 26% of global burden — high index of suspicion in children.
            SpO2 target: ≥95% (pneumonia), ≥92% (severe asthma), avoid hyperoxia in preterm.</p>
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
          <FL label="SpO2" sub="%">
            <input type="number" value={spo2} onChange={e => setSpo2(e.target.value)} placeholder="%" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
            {parseFloat(spo2) < 90 && <p className="text-red-700 text-xs font-bold mt-1">Critical hypoxia!</p>}
            {parseFloat(spo2) >= 90 && parseFloat(spo2) < 95 && <p className="text-amber-700 text-xs mt-1">Hypoxia — O2 needed</p>}
          </FL>
          <FL label="Respiratory Rate" sub="/min">
            <input type="number" value={rr} onChange={e => setRr(e.target.value)} placeholder="/min" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          </FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="O2 delivery method">
            <Pills options={['Room air','Nasal prongs','Simple face mask','Non-rebreather mask','HFNC','CPAP','BiPAP','Intubated — MV']}
              value={o2delivery} onChange={setO2delivery} accent="sky" />
          </FL>
          <FL label="FiO2" sub="(if on oxygen)">
            <input type="number" step="0.05" value={fio2} onChange={e => setFio2(e.target.value)} placeholder="0.21" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          </FL>
        </div>
      </Section>

      {/* Westley Croup */}
      <Section title="Westley Croup Score" applicable={sec.croup} onApplicable={v => sa('croup', v)} accent="blue">
        <div className={`p-3 rounded-lg text-sm ${A.blue.bg} ${A.blue.border} border`}>
          <p className={`font-semibold ${A.blue.text}`}>Croup (Laryngotracheobronchitis) — commonly 6m–3y, parainfluenza</p>
          <p className="text-gray-600 mt-1">Score: mild ≤2 (oral dexamethasone), moderate 3–5 (neb epinephrine + dex), severe ≥6 (PICU).</p>
        </div>
        <div className="bg-white rounded-xl border divide-y">
          <ScoreRow label="Stridor" accent="blue" value={wStridor} onChange={setWStridor}
            options={[{label:'None',score:0},{label:'With agitation',score:1},{label:'At rest',score:2}]} />
          <ScoreRow label="Retractions" accent="blue" value={wRetractions} onChange={setWRetractions}
            options={[{label:'None',score:0},{label:'Mild',score:1},{label:'Moderate',score:2},{label:'Severe',score:3}]} />
          <ScoreRow label="Air entry" accent="blue" value={wAirEntry} onChange={setWAirEntry}
            options={[{label:'Normal',score:0},{label:'Decreased',score:1},{label:'Markedly decreased',score:2}]} />
          <ScoreRow label="Cyanosis" accent="blue" value={wCyanosis} onChange={setWCyanosis}
            options={[{label:'None',score:0},{label:'With agitation',score:4},{label:'At rest',score:5}]} />
          <ScoreRow label="Level of consciousness" accent="blue" value={wConsciousness} onChange={setWConsciousness}
            options={[{label:'Normal',score:0},{label:'Altered',score:5}]} />
        </div>
        {westleyScore.filled === 5 && (
          <div className={`p-3 rounded-lg border ${westleyScore.total >= 6 ? 'bg-red-50 border-red-400' : westleyScore.total >= 3 ? 'bg-amber-50 border-amber-400' : 'bg-green-50 border-green-400'}`}>
            <p className="font-bold text-gray-700">Westley Score: {westleyScore.total}/17</p>
            {westleySeverity && <p className={`text-sm ${westleySeverity.color}`}>{westleySeverity.label}</p>}
          </div>
        )}
      </Section>

      {/* Asthma — PRAM */}
      <Section title="Asthma Assessment — PRAM Score" applicable={sec.asthma} onApplicable={v => sa('asthma', v)} accent="teal">
        <FL label="Asthma / wheeze present?">
          <Pills options={['Yes','No','First episode','Recurrent']} value={asthmaGate} onChange={setAsthmaGate} accent="teal" />
        </FL>
        {asthmaGate === 'Yes' && (
          <>
            <div className={`p-3 rounded-lg text-sm ${A.teal.bg} ${A.teal.border} border`}>
              <p className={`font-semibold ${A.teal.text}`}>PRAM — Pediatric Respiratory Assessment Measure (2–17y)</p>
              <p className="text-gray-600 mt-1">0–3: mild; 4–6: moderate; 7–12: severe. Also use GINA stepwise management.
                Salbutamol 2.5–5mg neb (or 4–8 puffs MDI via spacer) q20min × 3 in first hour for severe.</p>
            </div>
            <div className="bg-white rounded-xl border divide-y">
              <ScoreRow label="SpO2 on room air" accent="teal" value={pramOxygen} onChange={setPramOxygen}
                options={[{label:'≥95%',score:0},{label:'92-94%',score:1},{label:'<92%',score:3}]} />
              <ScoreRow label="Suprasternal retractions" accent="teal" value={pramSuprasternal} onChange={setPramSuprasternal}
                options={[{label:'Absent',score:0},{label:'Present',score:2}]} />
              <ScoreRow label="Scalene muscle use" accent="teal" value={pramScalene} onChange={setPramScalene}
                options={[{label:'Absent',score:0},{label:'Present',score:2}]} />
              <ScoreRow label="Air entry (auscultation)" accent="teal" value={pramAirEntry} onChange={setPramAirEntry}
                options={[{label:'Normal',score:0},{label:'Decreased at base',score:1},{label:'Widespread decrease',score:2},{label:'Absent/minimal',score:3}]} />
              <ScoreRow label="Wheeze (auscultation)" accent="teal" value={pramWheeze} onChange={setPramWheeze}
                options={[{label:'Absent',score:0},{label:'Expiratory only',score:1},{label:'Insp and exp',score:2},{label:'Audible without stetho',score:3}]} />
            </div>
            {pramScore.filled === 5 && (
              <div className={`p-3 rounded-lg border ${pramScore.total >= 7 ? 'bg-red-50 border-red-400' : pramScore.total >= 4 ? 'bg-amber-50 border-amber-400' : 'bg-green-50 border-green-400'}`}>
                <p className="font-bold text-gray-700">PRAM Score: {pramScore.total}/12</p>
                {pramSeverity && <p className={`text-sm ${pramSeverity.color}`}>{pramSeverity.label}</p>}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <FL label="GINA classification">
                <Pills options={['Intermittent','Mild persistent','Moderate persistent','Severe persistent']}
                  value={asthmaGina} onChange={setAsthmaGina} accent="teal" />
              </FL>
              <FL label="Peak Flow" sub="L/min">
                <input type="number" value={peakflow} onChange={e => setPeakflow(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="L/min" />
              </FL>
            </div>
            <FL label="Asthma triggers">
              <Pills options={['Dust mites','Air pollution','Pollen','Exercise','URTI','Smoke','Cold air','GERD','Aspirin/NSAIDs','Strong odours']}
                value={asthmaTrigger} onChange={setAsthmaTrigger} accent="amber" multi />
            </FL>
            <div className="grid grid-cols-3 gap-3">
              <FL label="Salbutamol given?"><Pills options={['Yes','No']} value={salbutamol} onChange={setSalbutamol} accent="teal" /></FL>
              <FL label="Ipratropium given?"><Pills options={['Yes','No']} value={ipratropium} onChange={setIpratropium} accent="teal" /></FL>
              <FL label="IV MgSO4?"><Pills options={['Yes','No']} value={ivMgso4} onChange={setIvMgso4} accent="violet" /></FL>
            </div>
          </>
        )}
      </Section>

      {/* WHO Pneumonia */}
      <Section title="WHO Pneumonia Classification" applicable={sec.pneumonia} onApplicable={v => sa('pneumonia', v)} accent="blue">
        <FL label="Pneumonia present?">
          <Pills options={['Yes','No','Possible']} value={pneuGate} onChange={setPneuGate} accent="blue" />
        </FL>
        {pneuGate === 'Yes' && (
          <>
            <FL label="WHO Classification (2013)">
              <Pills options={['Fast breathing only (no severe signs)','Chest indrawing pneumonia','Severe pneumonia (danger signs)']}
                value={pneuWHO} onChange={setPneuWHO} accent="red" />
            </FL>
            <FL label="Clinical features (select all)">
              <Pills options={['Fast breathing (WHO age criteria)','Chest indrawing','Grunting','Nasal flaring',
                'Head nodding','Cyanosis','Unable to drink','Altered consciousness','Wheeze','Stridor at rest']}
                value={pneuFeatures} onChange={setPneuFeatures} accent="blue" multi />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Likely etiology">
                <Pills options={['Bacterial (typical)','Bacterial (atypical — Mycoplasma)','Viral','Fungal (immunocompromised)','TB','COVID-19','Unknown']}
                  value={pneuEtiology} onChange={setPneuEtiology} accent="blue" />
              </FL>
              <FL label="Antibiotics">
                <Pills options={['Amoxicillin PO (ambulatory)','Co-amoxiclav','Ampicillin IV','Ceftriaxone IV','Azithromycin (atypical)','Vancomycin']}
                  value={pneuAbx} onChange={setPneuAbx} accent="teal" />
              </FL>
            </div>
          </>
        )}
      </Section>

      {/* Bronchiolitis */}
      <Section title="Bronchiolitis / RSV" applicable={sec.bronchiolitis} onApplicable={v => sa('bronchiolitis', v)} accent="sky">
        <FL label="Bronchiolitis suspected?">
          <Pills options={['Yes','No']} value={bronchGate} onChange={setBronchGate} accent="sky" />
        </FL>
        {bronchGate === 'Yes' && (
          <>
            <FL label="RSV rapid test">
              <Pills options={['Positive','Negative','Not done']} value={rsvTest} onChange={setRsvTest} accent="sky" />
            </FL>
            <FL label="Bronchiolitis severity (Lowell/RDAI)">
              <Pills options={['Mild (SpO2 ≥95%, feeds well)','Moderate (SpO2 92-94%, feeds reduced)','Severe (SpO2 <92%, apnoea risk)']}
                value={bronchScore} onChange={setBronchScore} accent="sky" />
            </FL>
            <FL label="Feeding impact">
              <Pills options={['Normal','Reduced intake','Unable to feed — NG tube','IV fluids']}
                value={bronchFeed} onChange={setBronchFeed} accent="amber" />
            </FL>
          </>
        )}
      </Section>

      {/* Silverman-Anderson */}
      <Section title="Silverman-Anderson Respiratory Distress Score" applicable={sec.rd} onApplicable={v => sa('rd', v)} accent="violet">
        <FL label="Respiratory distress assessment needed?">
          <Pills options={['Yes','No']} value={rdGate} onChange={setRdGate} accent="violet" />
        </FL>
        {rdGate === 'Yes' && (
          <>
            <div className={`p-3 rounded-lg text-sm ${A.violet.bg} ${A.violet.border} border`}>
              <p className={`font-semibold ${A.violet.text}`}>Silverman-Anderson Score — neonates/infants</p>
              <p className="text-gray-600 mt-1">0 = no distress; 1–3 = mild; 4–6 = moderate; 7–10 = severe. Consider CPAP/intubation for ≥7.</p>
            </div>
            <div className="bg-white rounded-xl border divide-y">
              <ScoreRow label="Upper chest movement" accent="violet" value={saUpperChest} onChange={setSaUpperChest}
                options={[{label:'Synchronised',score:0},{label:'Lag on inspiration',score:1},{label:'See-saw',score:2}]} />
              <ScoreRow label="Lower chest retractions" accent="violet" value={saLowerChest} onChange={setSaLowerChest}
                options={[{label:'No retractions',score:0},{label:'Just visible',score:1},{label:'Marked',score:2}]} />
              <ScoreRow label="Xiphoid retractions" accent="violet" value={saXiphoid} onChange={setSaXiphoid}
                options={[{label:'None',score:0},{label:'Just visible',score:1},{label:'Marked',score:2}]} />
              <ScoreRow label="Nasal flaring" accent="violet" value={saNares} onChange={setSaNares}
                options={[{label:'None',score:0},{label:'Minimal',score:1},{label:'Marked',score:2}]} />
              <ScoreRow label="Expiratory grunt" accent="violet" value={saExpression} onChange={setSaExpression}
                options={[{label:'No grunt',score:0},{label:'Grunt with steth',score:1},{label:'Grunt audible',score:2}]} />
            </div>
            {saScore.filled === 5 && (
              <div className={`p-3 rounded-lg border ${saScore.total >= 7 ? 'bg-red-50 border-red-400' : saScore.total >= 4 ? 'bg-amber-50 border-amber-400' : 'bg-green-50 border-green-400'}`}>
                <p className="font-bold text-gray-700">S-A Score: {saScore.total}/10</p>
                {saSeverity && <p className={`text-sm ${saSeverity.color}`}>{saSeverity.label}</p>}
              </div>
            )}
            <FL label="Ventilatory support">
              <Pills options={['None required','CPAP','BiPAP/NIPPV','HFNC','Intubated — conventional MV','HFOV','iNO']}
                value={ventMode} onChange={setVentMode} accent="violet" />
            </FL>
          </>
        )}
      </Section>

      {/* CF */}
      <Section title="Cystic Fibrosis Evaluation" applicable={sec.cf} onApplicable={v => sa('cf', v)} accent="emerald">
        <FL label="CF suspected?">
          <Pills options={['Yes','No','Known CF — follow-up']} value={cfGate} onChange={setCfGate} accent="emerald" />
        </FL>
        {(cfGate === 'Yes' || cfGate === 'Known CF — follow-up') && (
          <div className="grid grid-cols-2 gap-3">
            <FL label="Sweat chloride test" sub="mmol/L">
              <Pills options={['<30 (Normal)','30-59 (Intermediate)','≥60 (Positive for CF)','Not done']}
                value={sweatTest} onChange={setSweatTest} accent="emerald" />
            </FL>
            <FL label="CFTR mutation analysis">
              <Pills options={['Homozygous','Compound heterozygous','Single mutation','No mutation','Not done']}
                value={cftrMutation} onChange={setCftrMutation} accent="blue" />
            </FL>
          </div>
        )}
      </Section>

      {/* TB */}
      <Section title="Tuberculosis Assessment (Childhood)" applicable={sec.tb} onApplicable={v => sa('tb', v)} accent="amber">
        <FL label="TB suspected?">
          <Pills options={['Yes','No','Known TB — follow-up']} value={tbGate} onChange={setTbGate} accent="amber" />
        </FL>
        {(tbGate === 'Yes' || tbGate === 'Known TB — follow-up') && (
          <>
            <FL label="Signs / symptoms (select all)">
              <Pills options={['Fever >2 weeks','Cough >2 weeks','Weight loss/failure to thrive','Night sweats',
                'Lymphadenopathy','Miliary TB pattern on CXR','TB contact history','HIV co-infection','Erythema nodosum']}
                value={tbSigns} onChange={setTbSigns} accent="amber" multi />
            </FL>
            <div className="grid grid-cols-3 gap-3">
              <FL label="Mantoux/TST" sub="mm induration">
                <input type="number" value={mantoux} onChange={e => setMantoux(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="mm" />
                {parseFloat(mantoux) >= 10 && <p className="text-amber-700 text-xs mt-1">Significant ≥10mm</p>}
              </FL>
              <FL label="IGRA (Quantiferon/T-SPOT)">
                <Pills options={['Positive','Negative','Indeterminate','Not done']} value={igra} onChange={setIgra} accent="amber" />
              </FL>
              <FL label="CXR findings">
                <Pills options={['Hilar lymphadenopathy','Miliary','Consolidation','Pleural effusion','Cavity','Normal','Not done']}
                  value={tbXray} onChange={setTbXray} accent="amber" />
              </FL>
            </div>
          </>
        )}
      </Section>

      {/* Plan */}
      <Section title="Disposition & Plan" applicable={sec.plan} onApplicable={v => sa('plan', v)} accent="sky">
        <div className="grid grid-cols-2 gap-3">
          <FL label="SpO2 target">
            <Pills options={['≥95% (standard)','≥92% (asthma/COPD)','94-98% (pneumonia)','Custom']} value={o2target} onChange={setO2target} accent="sky" />
          </FL>
          <FL label="Disposition">
            <Pills options={['Discharge home','Observation ward','Paediatric ward','HDU','PICU','Transfer to higher centre']}
              value={admitPlan} onChange={setAdmitPlan} accent="blue" />
          </FL>
        </div>
        <FL label="Specialist referral">
          <Pills options={['None','Paediatric pulmonologist','Paediatric intensivist','Paediatric cardiologist','ENT (CF/structural)','DOTS (TB)']}
            value={referral} onChange={setReferral} accent="emerald" />
        </FL>
        <FL label="Additional notes">
          <textarea value={planNotes} onChange={e => setPlanNotes(e.target.value)} rows={3}
            className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Treatment response, follow-up plan, parent education..." />
        </FL>
      </Section>

      <button type="button" onClick={handleSave}
        className="w-full py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-base shadow-lg transition-all">
        Save Respiratory Assessment
      </button>
    </div>
  );
}
