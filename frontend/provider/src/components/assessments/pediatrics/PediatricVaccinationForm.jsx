/**
 * @shared-pool
 * PediatricVaccinationForm — Pediatric Immunisation Assessment
 * IAP 2023 recommended schedule, NIP (National Immunisation Programme) schedule,
 * catch-up immunisation, AEFI reporting, cold chain verification,
 * special vaccines (high-risk), travel vaccines, COVID-19 paediatric schedule
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useMemo } from 'react';
import { Lock, AlertTriangle, Shield } from 'lucide-react';
import api from '../../../api/client';

const A = {
  teal:   { bg:'bg-teal-50',    border:'border-teal-300',    text:'text-teal-700',
            pill:'bg-teal-100 border-teal-400 text-teal-800',
            active:'bg-teal-600 text-white border-teal-600' },
  emerald:{ bg:'bg-emerald-50', border:'border-emerald-300', text:'text-emerald-700',
            pill:'bg-emerald-100 border-emerald-400 text-emerald-800',
            active:'bg-emerald-600 text-white border-emerald-600' },
  amber:  { bg:'bg-amber-50',   border:'border-amber-300',   text:'text-amber-700',
            pill:'bg-amber-100 border-amber-400 text-amber-800',
            active:'bg-amber-600 text-white border-amber-600' },
  red:    { bg:'bg-red-50',     border:'border-red-300',     text:'text-red-700',
            pill:'bg-red-100 border-red-400 text-red-800',
            active:'bg-red-600 text-white border-red-600' },
  blue:   { bg:'bg-blue-50',    border:'border-blue-300',    text:'text-blue-700',
            pill:'bg-blue-100 border-blue-400 text-blue-800',
            active:'bg-blue-600 text-white border-blue-600' },
  violet: { bg:'bg-violet-50',  border:'border-violet-300',  text:'text-violet-700',
            pill:'bg-violet-100 border-violet-400 text-violet-800',
            active:'bg-violet-600 text-white border-violet-600' },
  indigo: { bg:'bg-indigo-50',  border:'border-indigo-300',  text:'text-indigo-700',
            pill:'bg-indigo-100 border-indigo-400 text-indigo-800',
            active:'bg-indigo-600 text-white border-indigo-600' },
};

function Pills({ options, value, onChange, accent = 'teal', multi = false }) {
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

function Section({ title, applicable, onApplicable, accent = 'teal', children }) {
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

const STATUS_COLORS = {
  'Given': 'bg-green-500 text-white border-green-500',
  'Due today': 'bg-blue-500 text-white border-blue-500',
  'Overdue': 'bg-red-500 text-white border-red-500',
  'Catch-up': 'bg-amber-500 text-white border-amber-500',
  'Not yet due': 'bg-gray-100 border-gray-300 text-gray-500',
  'Refused': 'bg-orange-400 text-white border-orange-400',
  'Contraindicated': 'bg-gray-500 text-white border-gray-500',
};

function VaccRow({ vaccine, age, nipOrIap, lotNo, date, status, onStatus, onDate, onLot }) {
  return (
    <div className="grid grid-cols-12 gap-1 items-center py-2 border-b border-gray-100 last:border-0 text-xs">
      <div className="col-span-3 font-semibold text-gray-800">{vaccine}</div>
      <div className="col-span-1 text-gray-500 text-center">{age}</div>
      <div className="col-span-1 text-center">
        <span className={`px-1 py-0.5 rounded text-xs font-medium ${nipOrIap === 'NIP' ? 'bg-teal-100 text-teal-700' : 'bg-violet-100 text-violet-700'}`}>{nipOrIap}</span>
      </div>
      <div className="col-span-3">
        <select value={status} onChange={e => onStatus(e.target.value)}
          className="w-full border rounded text-xs px-1 py-0.5">
          {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div className="col-span-2">
        <input type="date" value={date} onChange={e => onDate(e.target.value)}
          className="w-full border rounded text-xs px-1 py-0.5" />
      </div>
      <div className="col-span-2">
        <input type="text" value={lotNo} onChange={e => onLot(e.target.value)}
          placeholder="Lot#" className="w-full border rounded text-xs px-1 py-0.5" />
      </div>
    </div>
  );
}

const NIP_VACCINES = [
  { id:'bcg',    name:'BCG',            age:'Birth',   nipOrIap:'NIP' },
  { id:'hepb0',  name:'Hep B (birth)',  age:'Birth',   nipOrIap:'NIP' },
  { id:'opv0',   name:'OPV (birth)',    age:'Birth',   nipOrIap:'NIP' },
  { id:'dtpw1',  name:'DTPw + HepB + Hib (1)',age:'6w',nipOrIap:'NIP' },
  { id:'opv1',   name:'OPV (1)',        age:'6w',      nipOrIap:'NIP' },
  { id:'ipv1',   name:'IPV (1)',        age:'6w',      nipOrIap:'NIP' },
  { id:'rota1',  name:'Rotavirus (1)',  age:'6w',      nipOrIap:'NIP' },
  { id:'pcv1',   name:'PCV (1)',        age:'6w',      nipOrIap:'NIP' },
  { id:'dtpw2',  name:'DTPw + HepB + Hib (2)',age:'10w',nipOrIap:'NIP' },
  { id:'opv2',   name:'OPV (2)',        age:'10w',     nipOrIap:'NIP' },
  { id:'rota2',  name:'Rotavirus (2)',  age:'10w',     nipOrIap:'NIP' },
  { id:'dtpw3',  name:'DTPw + HepB + Hib (3)',age:'14w',nipOrIap:'NIP' },
  { id:'opv3',   name:'OPV (3)',        age:'14w',     nipOrIap:'NIP' },
  { id:'ipv2',   name:'IPV (2)',        age:'14w',     nipOrIap:'NIP' },
  { id:'rota3',  name:'Rotavirus (3)',  age:'14w',     nipOrIap:'NIP' },
  { id:'pcv2',   name:'PCV (2)',        age:'14w',     nipOrIap:'NIP' },
  { id:'measles1',name:'Measles-Rubella (1)',age:'9m',  nipOrIap:'NIP' },
  { id:'je1',    name:'JE (1)',         age:'9m (endemic)',nipOrIap:'NIP' },
  { id:'mrpcvboost',name:'MR+PCV boost',age:'15-18m',  nipOrIap:'NIP' },
  { id:'dtpboost1',name:'DTP + OPV booster (1)',age:'15-18m',nipOrIap:'NIP' },
  { id:'je2',    name:'JE (2)',         age:'16m',     nipOrIap:'NIP' },
  { id:'dtpboost2',name:'DTP booster (2)',age:'5-6y',  nipOrIap:'NIP' },
  { id:'tt1',    name:'TT (1)',         age:'10y',     nipOrIap:'NIP' },
  { id:'tt2',    name:'TT (2)',         age:'16y',     nipOrIap:'NIP' },
];

const IAP_VACCINES = [
  { id:'dtpa1',  name:'DTPa (1)',       age:'6w',      nipOrIap:'IAP' },
  { id:'dtpa2',  name:'DTPa (2)',       age:'10w',     nipOrIap:'IAP' },
  { id:'dtpa3',  name:'DTPa (3)',       age:'14w',     nipOrIap:'IAP' },
  { id:'dtpaboost',name:'DTPa booster', age:'15-18m',  nipOrIap:'IAP' },
  { id:'hepb1',  name:'Hep A (1)',      age:'12m',     nipOrIap:'IAP' },
  { id:'hepb2',  name:'Hep A (2)',      age:'18m',     nipOrIap:'IAP' },
  { id:'varicella1',name:'Varicella (1)',age:'15m',    nipOrIap:'IAP' },
  { id:'varicella2',name:'Varicella (2)',age:'4-6y',   nipOrIap:'IAP' },
  { id:'mmr1',   name:'MMR (1)',        age:'12-15m',  nipOrIap:'IAP' },
  { id:'mmr2',   name:'MMR (2)',        age:'4-6y',    nipOrIap:'IAP' },
  { id:'typhoid1',name:'Typhoid Vi (1)',age:'2y',      nipOrIap:'IAP' },
  { id:'typhoid2',name:'Typhoid Vi (booster)',age:'3y',nipOrIap:'IAP' },
  { id:'tdap',   name:'Tdap',           age:'10-12y',  nipOrIap:'IAP' },
  { id:'hpv1',   name:'HPV (1)',        age:'9-14y girls',nipOrIap:'IAP' },
  { id:'hpv2',   name:'HPV (2)',        age:'6m after HPV1',nipOrIap:'IAP' },
  { id:'meningococcal',name:'Meningococcal MenACWY',age:'≥9m (high risk)',nipOrIap:'IAP' },
  { id:'flu',    name:'Influenza (annual)',age:'≥6m',  nipOrIap:'IAP' },
  { id:'covid',  name:'COVID-19',       age:'≥12y',   nipOrIap:'IAP' },
];

export default function PediatricVaccinationForm({ patientId, encounterId, onSaved }) {
  const [sec, setSec] = useState({
    overview: 'Applicable', nip: 'Applicable', iap: 'Applicable',
    catchup: 'Applicable', highrisk: 'Applicable', aefi: 'Applicable',
    contraindications: 'Applicable',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  const [age, setAge] = useState('');
  const [ageUnit, setAgeUnit] = useState('months');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState('');
  const [cardPresent, setCardPresent] = useState('');
  const [vaccScheme, setVaccScheme] = useState('');

  // NIP vaccine states
  const [nipStatus, setNipStatus] = useState({});
  const [nipDate, setNipDate] = useState({});
  const [nipLot, setNipLot] = useState({});

  // IAP vaccine states
  const [iapStatus, setIapStatus] = useState({});
  const [iapDate, setIapDate] = useState({});
  const [iapLot, setIapLot] = useState({});

  const setNipVacc = (id, field, val) => {
    if (field === 'status') setNipStatus(s => ({ ...s, [id]: val }));
    if (field === 'date') setNipDate(s => ({ ...s, [id]: val }));
    if (field === 'lot') setNipLot(s => ({ ...s, [id]: val }));
  };

  const setIapVacc = (id, field, val) => {
    if (field === 'status') setIapStatus(s => ({ ...s, [id]: val }));
    if (field === 'date') setIapDate(s => ({ ...s, [id]: val }));
    if (field === 'lot') setIapLot(s => ({ ...s, [id]: val }));
  };

  // Catch-up
  const [catchupNeeded, setCatchupNeeded] = useState('');
  const [catchupVaccines, setCatchupVaccines] = useState([]);
  const [catchupNotes, setCatchupNotes] = useState('');

  // High-risk
  const [highRiskCondition, setHighRiskCondition] = useState([]);
  const [highRiskVaccines, setHighRiskVaccines] = useState([]);

  // AEFI
  const [aefiGate, setAefiGate] = useState('');
  const [aefiType, setAefiType] = useState('');
  const [aefiVaccine, setAefiVaccine] = useState('');
  const [aefiSeverity, setAefiSeverity] = useState('');
  const [aefiReported, setAefiReported] = useState('');
  const [aefiFeatures, setAefiFeatures] = useState([]);

  // Contraindications
  const [contraindications, setContraindications] = useState([]);
  const [deferral, setDeferral] = useState('');
  const [allergyHistory, setAllergyHistory] = useState('');

  const overdueCount = useMemo(() => {
    return Object.values(nipStatus).filter(s => s === 'Overdue').length +
           Object.values(iapStatus).filter(s => s === 'Overdue').length;
  }, [nipStatus, iapStatus]);

  const handleSave = async () => {
    const nipVaccinations = NIP_VACCINES.reduce((acc, v) => ({
      ...acc,
      [v.id]: { name: v.name, status: nipStatus[v.id] || '', date: nipDate[v.id] || '', lot: nipLot[v.id] || '' }
    }), {});
    const iapVaccinations = IAP_VACCINES.reduce((acc, v) => ({
      ...acc,
      [v.id]: { name: v.name, status: iapStatus[v.id] || '', date: iapDate[v.id] || '', lot: iapLot[v.id] || '' }
    }), {});
    await api.post('/assessments', {
      type: 'pediatric-vaccination',
      patientId, encounterId,
      data: {
        overview: { age, ageUnit, dob, sex, cardPresent, vaccScheme },
        nipVaccinations,
        iapVaccinations,
        catchup: { needed: catchupNeeded, vaccines: catchupVaccines, notes: catchupNotes },
        highRisk: { conditions: highRiskCondition, vaccines: highRiskVaccines },
        aefi: { occurred: aefiGate, type: aefiType, vaccine: aefiVaccine, severity: aefiSeverity, reported: aefiReported, features: aefiFeatures },
        contraindications: { list: contraindications, deferral, allergyHistory },
      }
    });
    onSaved?.();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 opacity-80" />
          <div>
            <h2 className="text-xl font-bold">Pediatric Immunisation Assessment</h2>
            <p className="text-teal-100 text-sm">NIP India 2023 · IAP Recommended Schedule · Catch-up · AEFI Reporting · High-risk Vaccines</p>
          </div>
        </div>
      </div>

      {overdueCount > 0 && (
        <div className="bg-amber-50 border-2 border-amber-500 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-700">{overdueCount} overdue vaccination(s)</p>
            <p className="text-sm text-amber-600">Administer today or schedule catch-up. Record in immunisation card and digital registry (eVIN/UWIN).</p>
          </div>
        </div>
      )}

      {/* Overview */}
      <Section title="Child Overview" applicable={sec.overview} onApplicable={v => sa('overview', v)} accent="teal">
        <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
          <p className={`font-semibold ${A.amber.text}`}>India context — Immunisation programme</p>
          <p className="text-gray-600 mt-1">Universal Immunisation Programme (UIP) / NIP India provides free vaccines at Government facilities.
            IAP recommends additional vaccines (private sector). eVIN (electronic vaccine intelligence network) tracks cold chain.
            Mission Indradhanush targets unvaccinated/under-vaccinated children. UWIN — digital immunisation registry.
            India achieved polio-free status 2014. Target: measles-rubella elimination 2025.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Date of birth">
            <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          </FL>
          <FL label="Current age">
            <div className="flex gap-2">
              <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="0" className="w-14 border rounded-lg px-2 py-1.5 text-sm" />
              <select value={ageUnit} onChange={e => setAgeUnit(e.target.value)} className="flex-1 border rounded-lg px-2 py-1.5 text-sm">
                <option>days</option><option>weeks</option><option>months</option><option>years</option>
              </select>
            </div>
          </FL>
          <FL label="Sex"><Pills options={['Male','Female']} value={sex} onChange={setSex} accent="teal" /></FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Immunisation card available?">
            <Pills options={['Yes — original','Yes — photocopy','No','Digital (UWIN)']} value={cardPresent} onChange={setCardPresent} accent="teal" />
          </FL>
          <FL label="Scheme/facility">
            <Pills options={['Government (UIP — free)','Private (full IAP)','Mission Indradhanush','Catch-up camp']}
              value={vaccScheme} onChange={setVaccScheme} accent="emerald" />
          </FL>
        </div>
      </Section>

      {/* NIP Schedule */}
      <Section title="NIP (National Immunisation Programme) Schedule" applicable={sec.nip} onApplicable={v => sa('nip', v)} accent="teal">
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-teal-50 text-xs font-bold text-teal-700 border-b">
            <div className="col-span-3">Vaccine</div>
            <div className="col-span-1 text-center">Age</div>
            <div className="col-span-1 text-center">Prog</div>
            <div className="col-span-3">Status</div>
            <div className="col-span-2">Date given</div>
            <div className="col-span-2">Lot/Batch</div>
          </div>
          {NIP_VACCINES.map(v => (
            <VaccRow key={v.id} vaccine={v.name} age={v.age} nipOrIap={v.nipOrIap}
              status={nipStatus[v.id] || 'Not yet due'}
              date={nipDate[v.id] || ''}
              lotNo={nipLot[v.id] || ''}
              onStatus={val => setNipVacc(v.id, 'status', val)}
              onDate={val => setNipVacc(v.id, 'date', val)}
              onLot={val => setNipVacc(v.id, 'lot', val)} />
          ))}
        </div>
      </Section>

      {/* IAP Schedule */}
      <Section title="IAP Recommended Schedule 2023" applicable={sec.iap} onApplicable={v => sa('iap', v)} accent="violet">
        <div className={`p-3 rounded-lg text-sm ${A.violet.bg} ${A.violet.border} border`}>
          <p className={`font-semibold ${A.violet.text}`}>IAP 2023 — recommended for all children (private sector funding required)</p>
          <p className="text-gray-600 mt-1">HPV vaccination: girls 9-14y (2-dose schedule); DTPa preferred over DTPw; Hepatitis A universal.
            Annual influenza recommended for all ≥6m. COVID-19 booster as per current guidance.
            Typhoid conjugate vaccine (TCV) preferred over Vi polysaccharide in endemic areas.</p>
        </div>
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-violet-50 text-xs font-bold text-violet-700 border-b">
            <div className="col-span-3">Vaccine</div>
            <div className="col-span-1 text-center">Age</div>
            <div className="col-span-1 text-center">Prog</div>
            <div className="col-span-3">Status</div>
            <div className="col-span-2">Date given</div>
            <div className="col-span-2">Lot/Batch</div>
          </div>
          {IAP_VACCINES.map(v => (
            <VaccRow key={v.id} vaccine={v.name} age={v.age} nipOrIap={v.nipOrIap}
              status={iapStatus[v.id] || 'Not yet due'}
              date={iapDate[v.id] || ''}
              lotNo={iapLot[v.id] || ''}
              onStatus={val => setIapVacc(v.id, 'status', val)}
              onDate={val => setIapVacc(v.id, 'date', val)}
              onLot={val => setIapLot(v.id, 'lot', val)} />
          ))}
        </div>
      </Section>

      {/* Catch-up */}
      <Section title="Catch-up Immunisation" applicable={sec.catchup} onApplicable={v => sa('catchup', v)} accent="amber">
        <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
          <p className={`font-semibold ${A.amber.text}`}>IAP catch-up principles</p>
          <p className="text-gray-600 mt-1">Minimum intervals between doses must be respected. Never restart series — continue from where left off.
            Live vaccines (MMR, Varicella) — give same day or ≥4 weeks apart. IPV can be given any age if missed.</p>
        </div>
        <FL label="Catch-up needed?">
          <Pills options={['Yes','No — up to date','Partial catch-up needed']} value={catchupNeeded} onChange={setCatchupNeeded} accent="amber" />
        </FL>
        {catchupNeeded !== 'No — up to date' && (
          <>
            <FL label="Vaccines to catch up (select all)">
              <Pills options={['BCG (missed at birth)','OPV','IPV','DTP','Hib','PCV','Rotavirus','MMR','Varicella','Hep A','Hep B','Typhoid','JE','Td/Tdap']}
                value={catchupVaccines} onChange={setCatchupVaccines} accent="amber" multi />
            </FL>
            <FL label="Catch-up schedule notes">
              <textarea value={catchupNotes} onChange={e => setCatchupNotes(e.target.value)} rows={2}
                className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Specific catch-up intervals, combined visits planned..." />
            </FL>
          </>
        )}
      </Section>

      {/* High-risk vaccines */}
      <Section title="Special / High-Risk Vaccines" applicable={sec.highrisk} onApplicable={v => sa('highrisk', v)} accent="blue">
        <FL label="High-risk condition(s)">
          <Pills options={['Asplenia/hyposplenia (sickle cell, post-splenectomy)','Immunocompromised (HIV/chemo)','Chronic heart disease','Chronic lung disease (asthma)','Chronic renal/liver disease','Prematurity/LBW','Cochlear implant (PCV)','Healthcare worker contacts','Travel to meningitis belt']}
            value={highRiskCondition} onChange={setHighRiskCondition} accent="blue" multi />
        </FL>
        <FL label="Additional vaccines indicated">
          <Pills options={['PCV (23-valent booster for asplenia)','Meningococcal MenACWY','Meningococcal B','Annual influenza (mandatory)','Rabies pre-exposure (high-exposure)','Yellow fever (travel)','Cholera (travel)','Hepatitis A + B accelerated','PPSV23']}
            value={highRiskVaccines} onChange={setHighRiskVaccines} accent="blue" multi />
        </FL>
      </Section>

      {/* AEFI */}
      <Section title="AEFI — Adverse Events Following Immunisation" applicable={sec.aefi} onApplicable={v => sa('aefi', v)} accent="red">
        <FL label="AEFI occurred?">
          <Pills options={['Yes — current visit','Yes — previous visit','No']} value={aefiGate} onChange={setAefiGate} accent="red" />
        </FL>
        {(aefiGate === 'Yes — current visit' || aefiGate === 'Yes — previous visit') && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Vaccine causing AEFI">
                <input type="text" value={aefiVaccine} onChange={e => setAefiVaccine(e.target.value)}
                  className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="Vaccine name + lot number" />
              </FL>
              <FL label="AEFI type (WHO classification)">
                <Pills options={['Vaccine product-related','Vaccine quality defect-related','Immunisation error-related','Immunisation anxiety-related','Coincidental','Unknown']}
                  value={aefiType} onChange={setAefiType} accent="red" />
              </FL>
            </div>
            <FL label="Clinical features">
              <Pills options={['Local reaction (swelling/redness)','Fever','Anaphylaxis','Persistent inconsolable crying',
                'Hypotonic-hyporesponsive episode (HHE)','Seizure','Lymphadenitis (BCG)','Encephalopathy/encephalitis','Intussusception (rotavirus)']}
                value={aefiFeatures} onChange={setAefiFeatures} accent="red" multi />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="AEFI severity">
                <Pills options={['Minor (local, fever)','Moderate','Severe (hospitalised)','Fatal']}
                  value={aefiSeverity} onChange={setAefiSeverity} accent="red" />
              </FL>
              <FL label="Reported to AEFI committee?">
                <Pills options={['Yes — online portal (MoHFW)','Yes — paper form','No — will report','Minor — no reporting needed']}
                  value={aefiReported} onChange={setAefiReported} accent="amber" />
              </FL>
            </div>
          </>
        )}
      </Section>

      {/* Contraindications */}
      <Section title="Contraindications & Deferrals" applicable={sec.contraindications} onApplicable={v => sa('contraindications', v)} accent="indigo">
        <FL label="Contraindications present">
          <Pills options={['Anaphylaxis to previous dose','Anaphylaxis to vaccine component (gelatin/neomycin)','Encephalopathy within 7d of DTP',
            'Immunocompromised (live vaccines)','Pregnancy (live vaccines)','High fever today (>38.5°C — defer)','None']}
            value={contraindications} onChange={setContraindications} accent="indigo" multi />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Deferral reason">
            <Pills options={['Acute illness (defer 2-4w)','High fever today','Moderate-severe illness','Planned surgery','None — proceed']}
              value={deferral} onChange={setDeferral} accent="amber" />
          </FL>
          <FL label="Allergy history">
            <Pills options={['Egg allergy — caution flu/MMR','Gelatin allergy','Yeast allergy (Hep B)','None known','Unknown']}
              value={allergyHistory} onChange={setAllergyHistory} accent="red" />
          </FL>
        </div>
      </Section>

      <button type="button" onClick={handleSave}
        className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-base shadow-lg transition-all">
        Save Immunisation Assessment
      </button>
    </div>
  );
}
