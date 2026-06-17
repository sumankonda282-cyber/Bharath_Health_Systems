/**
 * @shared-pool
 * NICUAssessmentForm — Neonatal Intensive Care Unit Assessment
 * Silverman-Anderson RDS score, SNAPPE-II severity, HIE Sarnat grading,
 * neonatal sepsis (EOS/LOS), Thompson HIE score, neonatal seizures,
 * prematurity complications, NEC (Bell staging), TPN monitoring
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useMemo } from 'react';
import { Lock, AlertTriangle, Activity } from 'lucide-react';
import api from '../../../api/client';

const A = {
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
  violet: { bg:'bg-violet-50',  border:'border-violet-300',  text:'text-violet-700',
            pill:'bg-violet-100 border-violet-400 text-violet-800',
            active:'bg-violet-600 text-white border-violet-600' },
  orange: { bg:'bg-orange-50',  border:'border-orange-300',  text:'text-orange-700',
            pill:'bg-orange-100 border-orange-400 text-orange-800',
            active:'bg-orange-600 text-white border-orange-600' },
};

function Pills({ options, value, onChange, accent = 'indigo', multi = false }) {
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

function Section({ title, applicable, onApplicable, accent = 'indigo', children }) {
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

function ScoreRow({ label, options, value, onChange, accent = 'indigo' }) {
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

export default function NICUAssessmentForm({ patientId, encounterId, onSaved }) {
  const [sec, setSec] = useState({
    demographics: 'Applicable', rds: 'Applicable', hie: 'Applicable',
    sepsis: 'Applicable', prematurity: 'Applicable', nec: 'Applicable',
    seizures: 'Applicable', tpn: 'Applicable', monitoring: 'Applicable',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  // Demographics
  const [ga, setGa] = useState('');
  const [birthWeight, setBirthWeight] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [dol, setDol] = useState(''); // day of life
  const [sex, setSex] = useState('');
  const [delivery, setDelivery] = useState('');
  const [apgar1, setApgar1] = useState('');
  const [apgar5, setApgar5] = useState('');
  const [resusNeeded, setResusNeeded] = useState('');
  const [resusType, setResusType] = useState([]);

  // Silverman-Anderson RDS
  const [saUpperChest, setSaUpperChest] = useState('');
  const [saLowerChest, setSaLowerChest] = useState('');
  const [saXiphoid, setSaXiphoid] = useState('');
  const [saNares, setSaNares] = useState('');
  const [saExpression, setSaExpression] = useState('');

  // HIE — Sarnat grading + Thompson score
  const [hieGate, setHieGate] = useState('');
  const [sarnatLevel, setSarnatLevel] = useState('');
  const [sarnatFeatures, setSarnatFeatures] = useState([]);
  const [thompsontone, setThompsonTone] = useState('');
  const [thompsonLoc, setThompsonLoc] = useState('');
  const [thompsonFit, setThompsonFit] = useState('');
  const [thompsonPosture, setThompsonPosture] = useState('');
  const [thompsonReflex, setThompsonReflex] = useState('');
  const [thompsonSuck, setThompsonSuck] = useState('');
  const [thompsonFontanelle, setThompsonFontanelle] = useState('');
  const [thompsonRespiration, setThompsonRespiration] = useState('');
  const [coolingTherapy, setCoolingTherapy] = useState('');

  // Neonatal sepsis
  const [sepsisGate, setSepsisGate] = useState('');
  const [sepsisType, setSepsisType] = useState('');
  const [sepsisRiskFactors, setSepsisRiskFactors] = useState([]);
  const [sepsisFeatures, setSepsisFeatures] = useState([]);
  const [cbc, setCbc] = useState('');
  const [itRatio, setItRatio] = useState('');
  const [crp, setCrp] = useState('');
  const [bloodCulture, setBloodCulture] = useState('');
  const [lpDone, setLpDone] = useState('');
  const [empiricalAbx, setEmpiricalAbx] = useState('');

  // Prematurity complications
  const [premGate, setPremGate] = useState('');
  const [ivhGrade, setIvhGrade] = useState('');
  const [ropGrade, setRopGrade] = useState('');
  const [pvlPresent, setPvlPresent] = useState('');
  const [bpd, setBpd] = useState('');
  const [antenatalCortico, setAntenatalCortico] = useState('');
  const [surfactant, setSurfactant] = useState('');
  const [caffeine, setCaffeine] = useState('');

  // NEC — Bell staging
  const [necGate, setNecGate] = useState('');
  const [necBell, setNecBell] = useState('');
  const [necFeatures, setNecFeatures] = useState([]);
  const [necXray, setNecXray] = useState([]);
  const [necMgmt, setNecMgmt] = useState('');

  // Neonatal seizures
  const [nszGate, setNszGate] = useState('');
  const [nszType, setNszType] = useState([]);
  const [nszCause, setNszCause] = useState('');
  const [nszGlucose, setNszGlucose] = useState('');
  const [nszAed, setNszAed] = useState([]);
  const [aEEG, setaEEG] = useState('');

  // TPN
  const [tpnGate, setTpnGate] = useState('');
  const [tpnDay, setTpnDay] = useState('');
  const [glucose, setGlucose] = useState('');
  const [protein, setProtein] = useState('');
  const [lipid, setLipid] = useState('');
  const [enteral, setEnteral] = useState('');
  const [feedMode, setFeedMode] = useState('');

  // Monitoring
  const [ventMode, setVentMode] = useState('');
  const [fio2, setFio2] = useState('');
  const [spo2, setSpo2] = useState('');
  const [pco2, setPco2] = useState('');
  const [ph, setPh] = useState('');
  const [glucose2, setGlucose2] = useState('');
  const [bilirubin, setBilirubin] = useState('');
  const [phototherapy, setPhototherapy] = useState('');
  const [uvc, setUvc] = useState('');
  const [uac, setUac] = useState('');

  // SA score
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
    Object.entries(vals).forEach(([k, v]) => { if (map[k][v] !== undefined) { total += map[k][v]; filled++; } });
    return { total, filled };
  }, [saUpperChest, saLowerChest, saXiphoid, saNares, saExpression]);

  const saSeverity = useMemo(() => {
    if (saScore.filled < 5) return null;
    const t = saScore.total;
    if (t === 0) return { label: 'No respiratory distress', color: 'text-green-700' };
    if (t <= 3) return { label: 'Mild RDS', color: 'text-amber-700' };
    if (t <= 6) return { label: 'Moderate RDS', color: 'text-orange-700 font-semibold' };
    return { label: 'Severe RDS — surfactant/intubation', color: 'text-red-700 font-bold' };
  }, [saScore]);

  // Thompson HIE score
  const thompsonScore = useMemo(() => {
    const map = {
      thompsontone: { 'Normal':0, 'Hypertonia':1, 'Hypotonia':2, 'Flaccid':3 },
      thompsonLoc: { 'Normal':0, 'Hyperalert/agitated':1, 'Lethargic':2, 'Comatose':3 },
      thompsonFit: { 'None':0, 'Infrequent':1, 'Frequent':2, 'Continuous':3 },
      thompsonPosture: { 'Normal':0, 'Fisting/cycling':1, 'Decerebrate':2, 'Decorticate':2, 'Opisthotonus':3 },
      thompsonReflex: { 'Normal':0, 'Overactive':1, 'Depressed':2, 'Absent':3 },
      thompsonSuck: { 'Normal':0, 'Poor':1, 'Absent':2 },
      thompsonFontanelle: { 'Normal':0, 'Full':1, 'Tense/bulging':3 },
      thompsonRespiration: { 'Normal':0, 'Hyperventilation':1, 'Brief apnoea':2, 'IPPV':3 },
    };
    const vals = { thompsontone, thompsonLoc, thompsonFit, thompsonPosture, thompsonReflex, thompsonSuck, thompsonFontanelle, thompsonRespiration };
    let total = 0; let filled = 0;
    Object.entries(vals).forEach(([k, v]) => { if (map[k][v] !== undefined) { total += map[k][v]; filled++; } });
    return { total, filled };
  }, [thompsontone, thompsonLoc, thompsonFit, thompsonPosture, thompsonReflex, thompsonSuck, thompsonFontanelle, thompsonRespiration]);

  const thompsonRisk = useMemo(() => {
    if (thompsonScore.filled < 8) return null;
    const t = thompsonScore.total;
    if (t <= 3) return { label: 'Mild HIE — favourable prognosis', color: 'text-green-700' };
    if (t <= 9) return { label: 'Moderate HIE — consider cooling', color: 'text-amber-700' };
    return { label: 'Severe HIE — poor prognosis, cooling indicated', color: 'text-red-700 font-bold' };
  }, [thompsonScore]);

  const hieAlert = hieGate === 'Yes' && (sarnatLevel === 'Grade II — Moderate' || sarnatLevel === 'Grade III — Severe');
  const necAlert = necBell === 'Stage IIB' || necBell === 'Stage IIIA — Advanced' || necBell === 'Stage IIIB — Perforation';

  const handleSave = async () => {
    await api.post('/assessments', {
      type: 'nicu-assessment',
      patientId, encounterId,
      data: {
        demographics: { ga, birthWeight, currentWeight, dol, sex, delivery, apgar1, apgar5, resusNeeded, resusType },
        rds: { saUpperChest, saLowerChest, saXiphoid, saNares, saExpression, saTotal: saScore.total, severity: saSeverity?.label },
        hie: { gate: hieGate, sarnat: sarnatLevel, features: sarnatFeatures, thompsonTotal: thompsonScore.total, thompsonRisk: thompsonRisk?.label, coolingTherapy },
        sepsis: { gate: sepsisGate, type: sepsisType, riskFactors: sepsisRiskFactors, features: sepsisFeatures, cbc, itRatio, crp, bloodCulture, lpDone, empiricalAbx },
        prematurity: { gate: premGate, ivhGrade, ropGrade, pvlPresent, bpd, antenatalCortico, surfactant, caffeine },
        nec: { gate: necGate, bellStage: necBell, features: necFeatures, xray: necXray, management: necMgmt },
        seizures: { gate: nszGate, type: nszType, cause: nszCause, glucose: nszGlucose, aed: nszAed, aEEG },
        tpn: { gate: tpnGate, day: tpnDay, glucose, protein, lipid, enteral, feedMode },
        monitoring: { ventMode, fio2, spo2, pco2, ph, glucose: glucose2, bilirubin, phototherapy, uvc, uac },
      }
    });
    onSaved?.();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 opacity-80" />
          <div>
            <h2 className="text-xl font-bold">NICU Assessment</h2>
            <p className="text-indigo-100 text-sm">Silverman-Anderson RDS · HIE Sarnat/Thompson · Neonatal Sepsis EOS/LOS · NEC Bell Staging · Prematurity Complications</p>
          </div>
        </div>
      </div>

      {(hieAlert || necAlert) && (
        <div className="bg-red-50 border-2 border-red-600 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700">NICU Emergency</p>
            {hieAlert && <p className="text-sm text-red-600">Moderate/Severe HIE — Therapeutic hypothermia (33-34°C × 72h) if criteria met and within 6h of birth</p>}
            {necAlert && <p className="text-sm text-red-600">NEC Stage IIB/III — NPO, NG decompression, broad-spectrum antibiotics, surgical consultation</p>}
          </div>
        </div>
      )}

      {/* Demographics */}
      <Section title="Neonatal Demographics" applicable={sec.demographics} onApplicable={v => sa('demographics', v)} accent="indigo">
        <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
          <p className={`font-semibold ${A.amber.text}`}>India NICU context</p>
          <p className="text-gray-600 mt-1">India NMR (Neonatal Mortality Rate): 20/1000 live births (2021). Prematurity (#1 cause NMR), birth asphyxia (#2), neonatal sepsis (#3).
            LBW 28% of births. Kangaroo Mother Care (KMC) mandated for stable LBW &lt;2000g. NRP (Neonatal Resuscitation Programme) IAP.
            Surfactant: available in Level III NICUs; INSURE protocol preferred for RDS in preterm.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Gestational age" sub="weeks">
            <input type="number" step="0.1" value={ga} onChange={e => setGa(e.target.value)} placeholder="28.0" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
            {ga && <p className={`text-xs mt-1 ${parseFloat(ga) < 28 ? 'text-red-700 font-bold' : parseFloat(ga) < 32 ? 'text-red-600' : parseFloat(ga) < 37 ? 'text-amber-600' : 'text-green-700'}`}>
              {parseFloat(ga) < 28 ? 'Extremely preterm' : parseFloat(ga) < 32 ? 'Very preterm' : parseFloat(ga) < 37 ? 'Late preterm' : 'Term'}
            </p>}
          </FL>
          <FL label="Birth weight" sub="kg">
            <input type="number" step="0.01" value={birthWeight} onChange={e => setBirthWeight(e.target.value)} placeholder="1.500" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          </FL>
          <FL label="Day of life" sub="DOL">
            <input type="number" value={dol} onChange={e => setDol(e.target.value)} placeholder="1" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          </FL>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Sex"><Pills options={['Male','Female','Ambiguous']} value={sex} onChange={setSex} accent="indigo" /></FL>
          <FL label="Delivery mode"><Pills options={['SVD','LSCS — elective','LSCS — emergency','Assisted (forceps/vacuum)','Undelivered']} value={delivery} onChange={setDelivery} accent="indigo" /></FL>
          <FL label="Resuscitation needed?"><Pills options={['Yes','No']} value={resusNeeded} onChange={setResusNeeded} accent="red" /></FL>
        </div>
        {resusNeeded === 'Yes' && (
          <FL label="Resuscitation type (NRP steps)">
            <Pills options={['Stimulation + drying','Suction','Supplemental O2','PPV (bag-mask)','Chest compressions','Intubation','Medications (Epinephrine)']}
              value={resusType} onChange={setResusType} accent="red" multi />
          </FL>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FL label="APGAR at 1 min"><Pills options={['0-3 (Severe)','4-6 (Moderate)','7-10 (Normal)']} value={apgar1} onChange={setApgar1} accent="indigo" /></FL>
          <FL label="APGAR at 5 min"><Pills options={['0-3 (Severe)','4-6 (Moderate)','7-10 (Normal)']} value={apgar5} onChange={setApgar5} accent="indigo" /></FL>
        </div>
      </Section>

      {/* Silverman-Anderson */}
      <Section title="Silverman-Anderson Respiratory Distress Score" applicable={sec.rds} onApplicable={v => sa('rds', v)} accent="blue">
        <div className="bg-white rounded-xl border divide-y">
          <ScoreRow label="Upper chest movement" accent="blue" value={saUpperChest} onChange={setSaUpperChest}
            options={[{label:'Synchronised',score:0},{label:'Lag on inspiration',score:1},{label:'See-saw',score:2}]} />
          <ScoreRow label="Lower chest retractions" accent="blue" value={saLowerChest} onChange={setSaLowerChest}
            options={[{label:'No retractions',score:0},{label:'Just visible',score:1},{label:'Marked',score:2}]} />
          <ScoreRow label="Xiphoid retractions" accent="blue" value={saXiphoid} onChange={setSaXiphoid}
            options={[{label:'None',score:0},{label:'Just visible',score:1},{label:'Marked',score:2}]} />
          <ScoreRow label="Nasal flaring" accent="blue" value={saNares} onChange={setSaNares}
            options={[{label:'None',score:0},{label:'Minimal',score:1},{label:'Marked',score:2}]} />
          <ScoreRow label="Expiratory grunt" accent="blue" value={saExpression} onChange={setSaExpression}
            options={[{label:'No grunt',score:0},{label:'Grunt with steth',score:1},{label:'Grunt audible',score:2}]} />
        </div>
        {saScore.filled === 5 && (
          <div className={`p-3 rounded-lg border ${saScore.total >= 7 ? 'bg-red-50 border-red-400' : saScore.total >= 4 ? 'bg-amber-50 border-amber-400' : 'bg-green-50 border-green-400'}`}>
            <p className="font-bold text-gray-700">S-A Score: {saScore.total}/10</p>
            {saSeverity && <p className={`text-sm ${saSeverity.color}`}>{saSeverity.label}</p>}
          </div>
        )}
        <FL label="Respiratory support">
          <Pills options={['None (room air)','Supplemental O2','CPAP','NIPPV','HFNC','Conventional MV','HFOV','iNO']}
            value={ventMode} onChange={setVentMode} accent="blue" />
        </FL>
      </Section>

      {/* HIE */}
      <Section title="Hypoxic-Ischaemic Encephalopathy (HIE)" applicable={sec.hie} onApplicable={v => sa('hie', v)} accent="red">
        <FL label="HIE suspected?">
          <Pills options={['Yes','No','Possible']} value={hieGate} onChange={setHieGate} accent="red" />
        </FL>
        {hieGate === 'Yes' && (
          <>
            <FL label="Sarnat grading">
              <Pills options={['Grade I — Mild (hyperalert, jitteriness)','Grade II — Moderate (lethargy, seizures, hypotonia)','Grade III — Severe (coma, flaccid, no suck)']}
                value={sarnatLevel} onChange={setSarnatLevel} accent="red" />
            </FL>
            <FL label="Features (select all)">
              <Pills options={['Seizures','Altered tone (hypo/hypertonia)','Abnormal primitive reflexes','Abnormal eye movements',
                'Autonomic instability','Abnormal suck/swallow','Requires ventilatory support','Multiorgan dysfunction']}
                value={sarnatFeatures} onChange={setSarnatFeatures} accent="red" multi />
            </FL>
            <div className={`p-3 rounded-lg text-sm ${A.violet.bg} ${A.violet.border} border`}>
              <p className={`font-semibold ${A.violet.text}`}>Thompson HIE Score (0–22)</p>
            </div>
            <div className="bg-white rounded-xl border divide-y">
              <ScoreRow label="Tone" accent="violet" value={thompsontone} onChange={setThompsonTone}
                options={[{label:'Normal',score:0},{label:'Hypertonia',score:1},{label:'Hypotonia',score:2},{label:'Flaccid',score:3}]} />
              <ScoreRow label="Level of consciousness" accent="violet" value={thompsonLoc} onChange={setThompsonLoc}
                options={[{label:'Normal',score:0},{label:'Hyperalert',score:1},{label:'Lethargic',score:2},{label:'Comatose',score:3}]} />
              <ScoreRow label="Fits / seizures" accent="violet" value={thompsonFit} onChange={setThompsonFit}
                options={[{label:'None',score:0},{label:'Infrequent',score:1},{label:'Frequent',score:2},{label:'Continuous',score:3}]} />
              <ScoreRow label="Posture" accent="violet" value={thompsonPosture} onChange={setThompsonPosture}
                options={[{label:'Normal',score:0},{label:'Fisting/cycling',score:1},{label:'Decerebrate/Decorticate',score:2},{label:'Opisthotonus',score:3}]} />
              <ScoreRow label="Moro/primitive reflexes" accent="violet" value={thompsonReflex} onChange={setThompsonReflex}
                options={[{label:'Normal',score:0},{label:'Overactive',score:1},{label:'Depressed',score:2},{label:'Absent',score:3}]} />
              <ScoreRow label="Suck" accent="violet" value={thompsonSuck} onChange={setThompsonSuck}
                options={[{label:'Normal',score:0},{label:'Poor',score:1},{label:'Absent',score:2}]} />
              <ScoreRow label="Fontanelle" accent="violet" value={thompsonFontanelle} onChange={setThompsonFontanelle}
                options={[{label:'Normal',score:0},{label:'Full',score:1},{label:'Tense/bulging',score:3}]} />
              <ScoreRow label="Respiration" accent="violet" value={thompsonRespiration} onChange={setThompsonRespiration}
                options={[{label:'Normal',score:0},{label:'Hyperventilation',score:1},{label:'Brief apnoea',score:2},{label:'IPPV required',score:3}]} />
            </div>
            {thompsonScore.filled >= 8 && (
              <div className={`p-3 rounded-lg border ${thompsonScore.total >= 10 ? 'bg-red-50 border-red-400' : thompsonScore.total >= 4 ? 'bg-amber-50 border-amber-400' : 'bg-green-50 border-green-400'}`}>
                <p className="font-bold text-gray-700">Thompson Score: {thompsonScore.total}/22</p>
                {thompsonRisk && <p className={`text-sm ${thompsonRisk.color}`}>{thompsonRisk.label}</p>}
              </div>
            )}
            <FL label="Therapeutic hypothermia (cooling) status">
              <Pills options={['Yes — ongoing (33-34°C × 72h)','Yes — completed','Not indicated (mild HIE)','Contraindicated','Outside 6h window','Not available at this centre']}
                value={coolingTherapy} onChange={setCoolingTherapy} accent="teal" />
            </FL>
          </>
        )}
      </Section>

      {/* Neonatal Sepsis */}
      <Section title="Neonatal Sepsis (EOS / LOS)" applicable={sec.sepsis} onApplicable={v => sa('sepsis', v)} accent="orange">
        <FL label="Neonatal sepsis suspected?">
          <Pills options={['Yes — EOS (<72h)','Yes — LOS (>72h)','No','Culture-proven']} value={sepsisGate} onChange={setSepsisGate} accent="orange" />
        </FL>
        {sepsisGate !== '' && sepsisGate !== 'No' && (
          <>
            <FL label="Risk factors for EOS">
              <Pills options={['PROM >18h','GBS colonisation (mother)','Intrapartum fever (mother >38°C)','Chorioamnionitis','Preterm <35w','Birth asphyxia','Unclean delivery']}
                value={sepsisRiskFactors} onChange={setSepsisRiskFactors} accent="orange" multi />
            </FL>
            <FL label="Clinical features">
              <Pills options={['Temperature instability (hypo/hyperthermia)','Feeding intolerance/poor suck','Apnoea/bradycardia','Respiratory distress',
                'Hypotonia','Seizures','Jaundice (early/prolonged)','Abdominal distension','Petechiae/purpura']}
                value={sepsisFeatures} onChange={setSepsisFeatures} accent="orange" multi />
            </FL>
            <div className="grid grid-cols-3 gap-3">
              <FL label="CBC — WBC">
                <Pills options={['Leucocytosis (>20k)','Leucopenia (<5k)','Normal','Not done']} value={cbc} onChange={setCbc} accent="orange" />
              </FL>
              <FL label="I:T ratio">
                <Pills options={['>0.2 (abnormal)','<0.2 (normal)','Not done']} value={itRatio} onChange={setItRatio} accent="orange" />
              </FL>
              <FL label="CRP" sub="mg/L">
                <input type="number" value={crp} onChange={e => setCrp(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="mg/L" />
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Blood culture">
                <Pills options={['Sent — pending','Positive (organism pending)','Positive — GBS','Positive — E. coli','Positive — Staph aureus','Positive — Klebsiella (ESBL)','Negative']}
                  value={bloodCulture} onChange={setBloodCulture} accent="red" />
              </FL>
              <FL label="LP / CSF">
                <Pills options={['Done — normal','Done — abnormal (meningitis)','Deferred — unstable','Not done']}
                  value={lpDone} onChange={setLpDone} accent="orange" />
              </FL>
            </div>
            <FL label="Empirical antibiotics">
              <Pills options={['Ampicillin + Gentamicin (EOS)','Piperacillin-Tazobactam + Amikacin (LOS)',
                'Vancomycin + Cefotaxime (MRSA risk)','Meropenem (ESBL/carbapenem risk)','Fluconazole (fungal risk — preterm)']}
                value={empiricalAbx} onChange={setEmpiricalAbx} accent="teal" />
            </FL>
          </>
        )}
      </Section>

      {/* Prematurity complications */}
      <Section title="Prematurity Complications" applicable={sec.prematurity} onApplicable={v => sa('prematurity', v)} accent="violet">
        <FL label="Prematurity complications to document?">
          <Pills options={['Yes','No']} value={premGate} onChange={setPremGate} accent="violet" />
        </FL>
        {premGate === 'Yes' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FL label="IVH grade (cranial USS)">
                <Pills options={['No IVH','Grade I (germinal matrix)','Grade II (IVH without dilation)','Grade III (IVH with dilation)','Grade IV (parenchymal extension)']}
                  value={ivhGrade} onChange={setIvhGrade} accent="violet" />
              </FL>
              <FL label="ROP grade (ophthalmology)">
                <Pills options={['No ROP','Stage 1','Stage 2','Stage 3 (threshold)','Stage 4a','Stage 4b','Stage 5','Plus disease']}
                  value={ropGrade} onChange={setRopGrade} accent="indigo" />
              </FL>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FL label="PVL (periventricular leukomalacia)">
                <Pills options={['Present','Absent','Suspected','USS not done']} value={pvlPresent} onChange={setPvlPresent} accent="violet" />
              </FL>
              <FL label="BPD (bronchopulmonary dysplasia)">
                <Pills options={['Mild','Moderate','Severe','None']} value={bpd} onChange={setBpd} accent="blue" />
              </FL>
              <FL label="Antenatal corticosteroids?">
                <Pills options={['Complete (2 doses)','Partial','None']} value={antenatalCortico} onChange={setAntenatalCortico} accent="teal" />
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Surfactant given?">
                <Pills options={['Yes — prophylactic','Yes — rescue','INSURE protocol','Not given','Not indicated']}
                  value={surfactant} onChange={setSurfactant} accent="blue" />
              </FL>
              <FL label="Caffeine citrate?">
                <Pills options={['Yes — loading given','Yes — maintenance','Not started','Stopped (>34w CA)']}
                  value={caffeine} onChange={setCaffeine} accent="teal" />
              </FL>
            </div>
          </>
        )}
      </Section>

      {/* NEC */}
      <Section title="Necrotising Enterocolitis — Bell Staging" applicable={sec.nec} onApplicable={v => sa('nec', v)} accent="red">
        <FL label="NEC suspected?">
          <Pills options={['Yes','No','Possible (Stage I suspect)']} value={necGate} onChange={setNecGate} accent="red" />
        </FL>
        {necGate !== '' && necGate !== 'No' && (
          <>
            <FL label="Bell staging">
              <Pills options={['Stage IA — Suspect (mild GI signs)','Stage IB — Suspect (gross blood in stool)','Stage IIA — Definite (mild)','Stage IIB — Definite (moderate, acidosis)','Stage IIIA — Advanced (critically ill)','Stage IIIB — Perforation']}
                value={necBell} onChange={setNecBell} accent="red" />
            </FL>
            <FL label="Clinical features">
              <Pills options={['Abdominal distension','Feeding intolerance','Blood in stool','Abdominal wall erythema','Bilious aspirates','Absent bowel sounds','Peritonitis']}
                value={necFeatures} onChange={setNecFeatures} accent="red" multi />
            </FL>
            <FL label="X-ray / USS findings">
              <Pills options={['Pneumatosis intestinalis (pathognomonic)','Portal venous gas','Pneumoperitoneum (perforation)','Fixed dilated loop','Ileus','Normal']}
                value={necXray} onChange={setNecXray} accent="orange" multi />
            </FL>
            <FL label="Management">
              <Pills options={['NPO + NG decompression + IV fluids','Broad-spectrum antibiotics (Pip-Tazo + Metronidazole)','Surgical referral — laparotomy','Peritoneal drain','Medical management only (Stage I/IIA)']}
                value={necMgmt} onChange={setNecMgmt} accent="teal" />
            </FL>
          </>
        )}
      </Section>

      {/* Neonatal seizures */}
      <Section title="Neonatal Seizures" applicable={sec.seizures} onApplicable={v => sa('seizures', v)} accent="indigo">
        <FL label="Neonatal seizures present?">
          <Pills options={['Yes','No','Subtle seizures only']} value={nszGate} onChange={setNszGate} accent="indigo" />
        </FL>
        {(nszGate === 'Yes' || nszGate === 'Subtle seizures only') && (
          <>
            <FL label="Seizure type">
              <Pills options={['Subtle (chewing/cycling)','Clonic — focal','Clonic — multifocal','Tonic — focal','Tonic — generalised','Myoclonic']}
                value={nszType} onChange={setNszType} accent="indigo" multi />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Bedside glucose">
                <input type="number" step="0.1" value={nszGlucose} onChange={e => setNszGlucose(e.target.value)} placeholder="mmol/L" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
                {parseFloat(nszGlucose) < 2.6 && nszGlucose !== '' && <p className="text-red-700 text-xs font-bold mt-1">Hypoglycaemia — treat immediately (D10W 2mL/kg IV)</p>}
              </FL>
              <FL label="Likely cause">
                <Pills options={['HIE','Hypoglycaemia','Hyponatraemia','Hypocalcaemia','Meningitis/Sepsis','IVH','Structural malformation','Pyridoxine-dependent','Unknown']}
                  value={nszCause} onChange={setNszCause} accent="indigo" />
              </FL>
            </div>
            <FL label="AED treatment">
              <Pills options={['Phenobarbitone IV (20mg/kg loading)','Levetiracetam IV','Phenytoin IV','Midazolam IV','Pyridoxine (B6) trial','No AED — monitoring only']}
                value={nszAed} onChange={setNszAed} accent="indigo" multi />
            </FL>
            <FL label="aEEG monitoring">
              <Pills options={['Continuous aEEG — normal background','Continuous aEEG — mildly abnormal','Continuous aEEG — severely abnormal (burst suppression)','Electrographic seizures on aEEG','Not available']}
                value={aEEG} onChange={setaEEG} accent="violet" />
            </FL>
          </>
        )}
      </Section>

      {/* TPN */}
      <Section title="TPN / Nutritional Support" applicable={sec.tpn} onApplicable={v => sa('tpn', v)} accent="teal">
        <FL label="TPN / parenteral nutrition needed?">
          <Pills options={['Yes — full TPN','Yes — partial (peripheral PN)','No — full enteral']} value={tpnGate} onChange={setTpnGate} accent="teal" />
        </FL>
        {tpnGate !== 'No — full enteral' && tpnGate !== '' && (
          <>
            <div className="grid grid-cols-4 gap-3">
              <FL label="TPN day"><input type="number" value={tpnDay} onChange={e => setTpnDay(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
              <FL label="Glucose" sub="mg/kg/min"><input type="number" step="0.5" value={glucose} onChange={e => setGlucose(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
              <FL label="Protein" sub="g/kg/d"><input type="number" step="0.5" value={protein} onChange={e => setProtein(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
              <FL label="Lipid" sub="g/kg/d"><input type="number" step="0.5" value={lipid} onChange={e => setLipid(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
            </div>
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FL label="Enteral feeds" sub="mL/kg/d">
            <input type="number" value={enteral} onChange={e => setEnteral(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="mL/kg/d" />
          </FL>
          <FL label="Feed mode">
            <Pills options={['Breastmilk (expressed)','Donor breastmilk','Preterm formula','NG tube (continuous)','NG tube (bolus)','Oral (cup/syringe)','Direct breastfeeding']}
              value={feedMode} onChange={setFeedMode} accent="teal" />
          </FL>
        </div>
      </Section>

      {/* Monitoring */}
      <Section title="NICU Monitoring" applicable={sec.monitoring} onApplicable={v => sa('monitoring', v)} accent="blue">
        <div className="grid grid-cols-3 gap-3">
          <FL label="SpO2 target" sub="%"><input type="number" value={spo2} onChange={e => setSpo2(e.target.value)} placeholder="91-95%" className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
          <FL label="pCO2" sub="mmHg"><input type="number" value={pco2} onChange={e => setPco2(e.target.value)} placeholder="35-45" className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
          <FL label="pH"><input type="number" step="0.01" value={ph} onChange={e => setPh(e.target.value)} placeholder="7.35-7.45" className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Bilirubin" sub="mg/dL"><input type="number" step="0.1" value={bilirubin} onChange={e => setBilirubin(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
          <FL label="Blood glucose" sub="mmol/L"><input type="number" step="0.1" value={glucose2} onChange={e => setGlucose2(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
          <FL label="Phototherapy"><Pills options={['Yes','No','Intensive PT']} value={phototherapy} onChange={setPhototherapy} accent="amber" /></FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="UVC in situ?"><Pills options={['Yes — functioning','Yes — removed','No']} value={uvc} onChange={setUvc} accent="blue" /></FL>
          <FL label="UAC in situ?"><Pills options={['Yes — functioning','Yes — removed','No']} value={uac} onChange={setUac} accent="blue" /></FL>
        </div>
      </Section>

      <button type="button" onClick={handleSave}
        className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-lg transition-all">
        Save NICU Assessment
      </button>
    </div>
  );
}
