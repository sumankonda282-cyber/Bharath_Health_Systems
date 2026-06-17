/**
 * @shared-pool
 * PediatricCardiologyForm — Pediatric Cardiology Assessment
 * Jones criteria (ARF/RHD), Kawasaki disease (AHA 2017),
 * Congenital heart disease (cyanotic vs acyanotic), Ross score (HF),
 * Marfan syndrome screening, arrhythmia assessment, infective endocarditis
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useMemo } from 'react';
import { Lock, AlertTriangle, Heart } from 'lucide-react';
import api from '../../../api/client';

const A = {
  rose:   { bg:'bg-rose-50',    border:'border-rose-300',    text:'text-rose-700',
            pill:'bg-rose-100 border-rose-400 text-rose-800',
            active:'bg-rose-600 text-white border-rose-600' },
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
  emerald:{ bg:'bg-emerald-50', border:'border-emerald-300', text:'text-emerald-700',
            pill:'bg-emerald-100 border-emerald-400 text-emerald-800',
            active:'bg-emerald-600 text-white border-emerald-600' },
};

function Pills({ options, value, onChange, accent = 'rose', multi = false }) {
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

function Gate({ label, value, onChange, accent = 'rose', children }) {
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

function Section({ title, applicable, onApplicable, accent = 'rose', children }) {
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

export default function PediatricCardiologyForm({ patientId, encounterId, onSaved }) {
  const [sec, setSec] = useState({
    vitals: 'Applicable', chd: 'Applicable', jones: 'Applicable',
    kawasaki: 'Applicable', hf: 'Applicable', arrhythmia: 'Applicable',
    endocarditis: 'Applicable', echo: 'Applicable', plan: 'Applicable',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  // Vitals
  const [age, setAge] = useState('');
  const [ageUnit, setAgeUnit] = useState('months');
  const [hr, setHr] = useState('');
  const [rr, setRr] = useState('');
  const [spo2Preductal, setSpo2Preductal] = useState('');
  const [spo2Postductal, setSpo2Postductal] = useState('');
  const [bp, setBp] = useState('');
  const [cyanosis, setCyanosis] = useState('');

  // CHD
  const [chdGate, setChdGate] = useState('');
  const [chdType, setChdType] = useState('');
  const [chdDiagnosis, setChdDiagnosis] = useState('');
  const [chdFeatures, setChdFeatures] = useState([]);
  const [murmurGrade, setMurmurGrade] = useState('');
  const [murmurType, setMurmurType] = useState('');
  const [murmurLocation, setMurmurLocation] = useState('');
  const [satTest, setSatTest] = useState('');
  const [prostaglandin, setProstaglandin] = useState('');

  // ARF / Jones criteria
  const [arfGate, setArfGate] = useState('');
  const [majorCriteria, setMajorCriteria] = useState([]);
  const [minorCriteria, setMinorCriteria] = useState([]);
  const [throatSwab, setThroatSwab] = useState('');
  const [aso, setAso] = useState('');
  const [asoValue, setAsoValue] = useState('');
  const [rhdGrade, setRhdGrade] = useState('');
  const [penProphylaxis, setPenProphylaxis] = useState('');

  // Kawasaki
  const [kawGate, setKawGate] = useState('');
  const [kawCriteria, setKawCriteria] = useState([]);
  const [kawFeverDays, setKawFeverDays] = useState('');
  const [coronaryArtery, setCoronaryArtery] = useState('');
  const [kawZscore, setKawZscore] = useState('');
  const [igiv, setIgiv] = useState('');
  const [aspirin, setAspirin] = useState('');

  // Heart failure — Ross score
  const [hfGate, setHfGate] = useState('');
  const [rSweat, setRSweat] = useState('');
  const [rPanting, setRPanting] = useState('');
  const [rFeed, setRFeed] = useState('');
  const [rFeedTime, setRFeedTime] = useState('');
  const [rRR, setRRR] = useState('');
  const [rHR, setRHR] = useState('');
  const [rHepat, setRHepat] = useState('');
  const [rRales, setRRales] = useState('');
  const [diuretic, setDiuretic] = useState('');
  const [digoxin, setDigoxin] = useState('');
  const [enalapril, setEnalapril] = useState('');

  // Arrhythmia
  const [arrhGate, setArrhGate] = useState('');
  const [arrhType, setArrhType] = useState('');
  const [arrhSymptoms, setArrhSymptoms] = useState([]);
  const [ecgDone, setEcgDone] = useState('');
  const [ecgFindings, setEcgFindings] = useState([]);
  const [holter, setHolter] = useState('');

  // Infective endocarditis — Duke
  const [ieGate, setIeGate] = useState('');
  const [ieMajor, setIeMajor] = useState([]);
  const [ieMinor, setIeMinor] = useState([]);
  const [bloodCulture, setBloodCulture] = useState('');

  // Echo
  const [echoDone, setEchoDone] = useState('');
  const [echoFindings, setEchoFindings] = useState([]);
  const [ef, setEf] = useState('');

  // Plan
  const [referral, setReferral] = useState('');
  const [surgery, setSurgery] = useState('');
  const [notes, setNotes] = useState('');

  // Ross HF score
  const rossScore = useMemo(() => {
    const map = {
      rSweat: { 'None':0, 'Head only (exertion)':1, 'Head and body (exertion)':2, 'Head and body (rest)':3 },
      rPanting: { 'None':0, 'With exertion':1, 'Moderate exertion':2, 'At rest':3 },
      rFeed: { 'Normal':0, 'Some reduction':1, 'Marked reduction':2, 'Dropper/tube':3 },
      rFeedTime: { '<40 min':0, '>40 min':2 },
      rRR: { 'Normal':0, 'Mildly increased':1, 'Moderately increased':2, 'Severely increased':3 },
      rHR: { 'Normal':0, 'Mildly increased':1, 'Moderately increased':2, 'Severely increased':3 },
      rHepat: { 'Normal':0, '<2cm':1, '2-3cm':2, '>3cm':3 },
      rRales: { 'None':0, 'Basal':1, 'Widespread':2, 'All zones + wheeze':3 },
    };
    const vals = { rSweat, rPanting, rFeed, rFeedTime, rRR, rHR, rHepat, rRales };
    let total = 0; let filled = 0;
    Object.entries(vals).forEach(([k, v]) => {
      if (map[k][v] !== undefined) { total += map[k][v]; filled++; }
    });
    return { total, filled };
  }, [rSweat, rPanting, rFeed, rFeedTime, rRR, rHR, rHepat, rRales]);

  const rossClass = useMemo(() => {
    const t = rossScore.total;
    if (rossScore.filled < 8) return null;
    if (t <= 2) return { label: 'Ross Class I — No HF', color: 'text-green-700' };
    if (t <= 6) return { label: 'Ross Class II — Mild HF', color: 'text-amber-700' };
    if (t <= 9) return { label: 'Ross Class III — Moderate HF', color: 'text-orange-700 font-semibold' };
    return { label: 'Ross Class IV — Severe HF', color: 'text-red-700 font-bold' };
  }, [rossScore]);

  // Jones criteria count
  const jonesMet = useMemo(() => {
    const major = majorCriteria.length;
    const minor = minorCriteria.length;
    const strep = throatSwab === 'GAS positive' || aso === 'Raised' || aso === 'Strongly raised';
    return { major, minor, strep };
  }, [majorCriteria, minorCriteria, throatSwab, aso]);

  const arfDiagnosis = useMemo(() => {
    if (!jonesMet.strep) return null;
    if (jonesMet.major >= 2) return 'ARF Probable (2 major + strep evidence)';
    if (jonesMet.major >= 1 && jonesMet.minor >= 2) return 'ARF Possible (1 major + 2 minor + strep evidence)';
    return 'Insufficient criteria';
  }, [jonesMet]);

  const criticalAlert = cyanosis === 'Severe central' || prostaglandin === 'Yes — indicated' || rossClass?.label?.includes('IV');

  const handleSave = async () => {
    await api.post('/assessments', {
      type: 'pediatric-cardiology',
      patientId, encounterId,
      data: {
        vitals: { age, ageUnit, hr, rr, spo2Preductal, spo2Postductal, bp, cyanosis },
        chd: { gate: chdGate, type: chdType, diagnosis: chdDiagnosis, features: chdFeatures, murmur: { grade: murmurGrade, type: murmurType, location: murmurLocation }, saturationTest: satTest, prostaglandin },
        arf: { gate: arfGate, major: majorCriteria, minor: minorCriteria, throatSwab, aso, asoValue, rhdGrade, diagnosis: arfDiagnosis, penProphylaxis },
        kawasaki: { gate: kawGate, criteria: kawCriteria, feverDays: kawFeverDays, coronaryArtery, zscore: kawZscore, ivig: igiv, aspirin },
        heartFailure: { gate: hfGate, rossScore: rossScore.total, rossClass: rossClass?.label, diuretic, digoxin, enalapril },
        arrhythmia: { gate: arrhGate, type: arrhType, symptoms: arrhSymptoms, ecg: ecgFindings, holter },
        endocarditis: { gate: ieGate, major: ieMajor, minor: ieMinor, bloodCulture },
        echo: { done: echoDone, findings: echoFindings, ef },
        plan: { referral, surgery, notes },
      }
    });
    onSaved?.();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <Heart className="w-8 h-8 opacity-80" />
          <div>
            <h2 className="text-xl font-bold">Pediatric Cardiology Assessment</h2>
            <p className="text-rose-100 text-sm">CHD · Jones Criteria (ARF/RHD) · Kawasaki · Ross HF Score · Arrhythmia · Endocarditis</p>
          </div>
        </div>
      </div>

      {criticalAlert && (
        <div className="bg-red-50 border-2 border-red-600 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700">Cardiac Emergency</p>
            {cyanosis === 'Severe central' && <p className="text-sm text-red-600">Severe cyanosis — suspect critical CHD, Prostaglandin E1 if duct-dependent</p>}
            {rossClass?.label?.includes('IV') && <p className="text-sm text-red-600">Severe heart failure (Ross IV) — urgent paediatric cardiologist</p>}
          </div>
        </div>
      )}

      {/* Vitals */}
      <Section title="Cardiac Vitals" applicable={sec.vitals} onApplicable={v => sa('vitals', v)} accent="rose">
        <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
          <p className={`font-semibold ${A.amber.text}`}>India context — Paediatric cardiac burden</p>
          <p className="text-gray-600 mt-1">CHD prevalence: 8-10/1000 live births (~200,000/year in India). RHD: 5-10M cases (world's highest burden).
            Pulse oximetry screening (CCHD) not yet universally implemented in India — high index of suspicion essential.
            AIIMS New Delhi, SGPGI Lucknow, Amrita Kochi, Narayana Hrudayalaya Bangalore are major paediatric cardiac centres.
            PM-JAY covers surgical correction of CHD.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Age">
            <div className="flex gap-2">
              <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="0" className="w-14 border rounded-lg px-2 py-1.5 text-sm" />
              <select value={ageUnit} onChange={e => setAgeUnit(e.target.value)} className="flex-1 border rounded-lg px-2 py-1.5 text-sm">
                <option>days</option><option>months</option><option>years</option>
              </select>
            </div>
          </FL>
          <FL label="Cyanosis">
            <Pills options={['None','Peripheral only','Mild central','Moderate central','Severe central']}
              value={cyanosis} onChange={setCyanosis} accent="red" />
          </FL>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <FL label="HR" sub="bpm"><input type="number" value={hr} onChange={e => setHr(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
          <FL label="RR" sub="/min"><input type="number" value={rr} onChange={e => setRr(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
          <FL label="SpO2 (pre-ductal)" sub="%"><input type="number" value={spo2Preductal} onChange={e => setSpo2Preductal(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
          <FL label="SpO2 (post-ductal)" sub="%"><input type="number" value={spo2Postductal} onChange={e => setSpo2Postductal(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" /></FL>
        </div>
        {parseFloat(spo2Preductal) > 0 && parseFloat(spo2Postductal) > 0 &&
          Math.abs(parseFloat(spo2Preductal) - parseFloat(spo2Postductal)) >= 3 && (
          <div className="bg-amber-50 border border-amber-400 rounded-lg p-2 text-sm text-amber-700 font-semibold">
            Pre/post ductal difference ≥3% — suspect duct-dependent circulation
          </div>
        )}
      </Section>

      {/* CHD */}
      <Section title="Congenital Heart Disease" applicable={sec.chd} onApplicable={v => sa('chd', v)} accent="blue">
        <FL label="CHD present or suspected?">
          <Pills options={['Yes — confirmed','Yes — suspected','No','Screening']} value={chdGate} onChange={setChdGate} accent="blue" />
        </FL>
        {chdGate !== '' && chdGate !== 'No' && (
          <>
            <FL label="Type">
              <Pills options={['Cyanotic','Acyanotic','Mixed (Eisenmenger)','Not yet classified']}
                value={chdType} onChange={setChdType} accent="blue" />
            </FL>
            <FL label="Specific diagnosis">
              <Pills options={[
                'VSD (ventricular septal defect)','ASD (atrial septal defect)','PDA (patent ductus arteriosus)',
                'PS (pulmonary stenosis)','CoA (coarctation of aorta)','AS (aortic stenosis)',
                'TOF (tetralogy of Fallot)','TGA (transposition of great arteries)','TAPVR','HLHS',
                'AVSD (AV septal defect)','Truncus arteriosus','Single ventricle','Other complex']}
                value={chdDiagnosis} onChange={setChdDiagnosis} accent="blue" />
            </FL>
            <FL label="Features (select all)">
              <Pills options={['Murmur','Poor feeding','Failure to thrive','Sweating with feeds','Tachypnoea',
                'Hepatomegaly','Recurrent chest infections','Cyanotic spell (Tet spell)','Clubbing','Poor weight gain']}
                value={chdFeatures} onChange={setChdFeatures} accent="blue" multi />
            </FL>
            <div className="grid grid-cols-3 gap-3">
              <FL label="Murmur grade">
                <Pills options={['I/VI','II/VI','III/VI','IV/VI','V/VI','VI/VI']} value={murmurGrade} onChange={setMurmurGrade} accent="rose" />
              </FL>
              <FL label="Murmur type">
                <Pills options={['Pansystolic','Ejection systolic','Continuous (machinery)','Diastolic','None']}
                  value={murmurType} onChange={setMurmurType} accent="rose" />
              </FL>
              <FL label="Best heard at">
                <Pills options={['LUSB','RUSB','LLSB','Apex','Back']} value={murmurLocation} onChange={setMurmurLocation} accent="rose" />
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Saturation test (hyperoxia test)">
                <Pills options={['PaO2 >250 (no CHD)','PaO2 <150 (cyanotic CHD)','Not done']}
                  value={satTest} onChange={setSatTest} accent="teal" />
              </FL>
              <FL label="Prostaglandin E1 (PGE1)">
                <Pills options={['Yes — indicated','Yes — started','No — not needed']}
                  value={prostaglandin} onChange={setProstaglandin} accent="red" />
              </FL>
            </div>
          </>
        )}
      </Section>

      {/* ARF / Jones Criteria */}
      <Section title="Acute Rheumatic Fever — Jones Criteria (2015)" applicable={sec.jones} onApplicable={v => sa('jones', v)} accent="amber">
        <FL label="ARF / RHD evaluation?">
          <Pills options={['Yes','No']} value={arfGate} onChange={setArfGate} accent="amber" />
        </FL>
        {arfGate === 'Yes' && (
          <>
            <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
              <p className={`font-semibold ${A.amber.text}`}>India — World's highest RHD burden: 5-10 million cases</p>
              <p className="text-gray-600 mt-1">ARF occurs 2-4 weeks after Group A Strep pharyngitis. Primary prevention: Benzathine Penicillin for pharyngitis.
                Secondary prevention: monthly Benzathine Penicillin G (1.2M units IM) for RHD. Duration: 5y/21y/lifelong based on severity.</p>
            </div>
            <FL label="Major criteria (Jones 2015)" sub="select all present">
              <Pills options={['Carditis (clinical/subclinical — echocardiographic)','Polyarthritis','Chorea (Sydenham)','Erythema marginatum','Subcutaneous nodules']}
                value={majorCriteria} onChange={setMajorCriteria} accent="red" multi />
            </FL>
            <FL label="Minor criteria" sub="select all present">
              <Pills options={['Fever (>38.5°C)','ESR ≥60mm/h and/or CRP ≥3.0mg/dL','Prolonged PR interval (ECG)','Arthralgia (if no arthritis as major)']}
                value={minorCriteria} onChange={setMinorCriteria} accent="amber" multi />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Throat swab / rapid antigen test">
                <Pills options={['GAS positive','Negative','Not done']} value={throatSwab} onChange={setThroatSwab} accent="amber" />
              </FL>
              <FL label="ASO titre">
                <Pills options={['Normal (<200 IU/mL)','Raised (200-400)','Strongly raised (>400)']}
                  value={aso} onChange={setAso} accent="amber" />
              </FL>
            </div>
            {arfDiagnosis && (
              <div className={`p-3 rounded-lg border font-semibold ${arfDiagnosis.includes('Probable') ? 'bg-amber-50 border-amber-400 text-amber-800' : arfDiagnosis.includes('Possible') ? 'bg-yellow-50 border-yellow-400 text-yellow-800' : 'bg-gray-50 border-gray-300 text-gray-600'}`}>
                {arfDiagnosis}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <FL label="RHD severity (echo)">
                <Pills options={['No RHD','Borderline RHD','Mild RHD','Moderate RHD','Severe RHD']}
                  value={rhdGrade} onChange={setRhdGrade} accent="rose" />
              </FL>
              <FL label="Benzathine Penicillin prophylaxis">
                <Pills options={['Started','Ongoing','Not yet started','Penicillin allergy — macrolide']}
                  value={penProphylaxis} onChange={setPenProphylaxis} accent="teal" />
              </FL>
            </div>
          </>
        )}
      </Section>

      {/* Kawasaki */}
      <Section title="Kawasaki Disease (AHA 2017)" applicable={sec.kawasaki} onApplicable={v => sa('kawasaki', v)} accent="rose">
        <FL label="Kawasaki disease suspected?">
          <Pills options={['Yes — classic (≥4 criteria)','Yes — incomplete (<4 criteria)','No']}
            value={kawGate} onChange={setKawGate} accent="rose" />
        </FL>
        {(kawGate === 'Yes — classic (≥4 criteria)' || kawGate === 'Yes — incomplete (<4 criteria)') && (
          <>
            <FL label="Principal features (≥4 for classic KD)">
              <Pills options={['Fever ≥5 days','Bilateral conjunctival injection (non-purulent)','Polymorphous rash',
                'Cervical lymphadenopathy (>1.5cm)','Oral changes (strawberry tongue/cracked lips)',
                'Extremity changes (erythema/oedema/peeling — late)']}
                value={kawCriteria} onChange={setKawCriteria} accent="rose" multi />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Fever duration" sub="days">
                <input type="number" value={kawFeverDays} onChange={e => setKawFeverDays(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
              </FL>
              <FL label="Coronary artery findings">
                <Pills options={['Normal (z<2.5)','Dilation (z 2.5-4.9)','Small aneurysm (z 5-9.9)','Medium aneurysm (z 10-24.9)','Giant aneurysm (z≥25)']}
                  value={coronaryArtery} onChange={setCoronaryArtery} accent="rose" />
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FL label="IVIG 2g/kg (within 10 days)">
                <Pills options={['Given','Planned','Refractory (needs 2nd dose)','Not given']} value={igiv} onChange={setIgiv} accent="teal" />
              </FL>
              <FL label="Aspirin">
                <Pills options={['High dose (80-100mg/kg/d) — febrile','Low dose (3-5mg/kg/d) — afebrile/maintenance','Stopped']}
                  value={aspirin} onChange={setAspirin} accent="amber" />
              </FL>
            </div>
          </>
        )}
      </Section>

      {/* Ross Heart Failure Score */}
      <Section title="Heart Failure — Ross Score" applicable={sec.hf} onApplicable={v => sa('hf', v)} accent="rose">
        <FL label="Heart failure evaluation needed?">
          <Pills options={['Yes','No']} value={hfGate} onChange={setHfGate} accent="rose" />
        </FL>
        {hfGate === 'Yes' && (
          <>
            <div className="bg-white rounded-xl border divide-y">
              {[
                { label:'Diaphoresis (sweating)', state:rSweat, setter:setRSweat, opts:['None','Head only (exertion)','Head and body (exertion)','Head and body (rest)'] },
                { label:'Tachypnoea (working to breathe)', state:rPanting, setter:setRPanting, opts:['None','With exertion','Moderate exertion','At rest'] },
                { label:'Feeding volume', state:rFeed, setter:setRFeed, opts:['Normal','Some reduction','Marked reduction','Dropper/tube'] },
                { label:'Feeding time', state:rFeedTime, setter:setRFeedTime, opts:['<40 min','>40 min'] },
                { label:'Respiratory rate', state:rRR, setter:setRRR, opts:['Normal','Mildly increased','Moderately increased','Severely increased'] },
                { label:'Heart rate', state:rHR, setter:setRHR, opts:['Normal','Mildly increased','Moderately increased','Severely increased'] },
                { label:'Hepatomegaly', state:rHepat, setter:setRHepat, opts:['Normal','<2cm','2-3cm','>3cm'] },
                { label:'Rales / wheeze', state:rRales, setter:setRRales, opts:['None','Basal','Widespread','All zones + wheeze'] },
              ].map(row => (
                <div key={row.label} className="px-3 py-2 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-700 w-36 flex-shrink-0">{row.label}</span>
                  <div className="flex gap-1 flex-wrap">
                    {row.opts.map(o => (
                      <button key={o} type="button" onClick={() => row.setter(o)}
                        className={`px-2 py-0.5 text-xs rounded border font-medium transition-all
                          ${row.state === o ? A.rose.active : A.rose.pill}`}>
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {rossScore.filled >= 8 && (
              <div className={`p-3 rounded-lg border font-bold ${rossScore.total >= 10 ? 'bg-red-50 border-red-400 text-red-700' : rossScore.total >= 7 ? 'bg-orange-50 border-orange-400 text-orange-700' : rossScore.total >= 3 ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-green-50 border-green-400 text-green-700'}`}>
                Ross Score: {rossScore.total}/24 — {rossClass?.label}
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <FL label="Diuretic?"><Pills options={['Furosemide','Spironolactone','Both','None']} value={diuretic} onChange={setDiuretic} accent="blue" /></FL>
              <FL label="Digoxin?"><Pills options={['Yes','No']} value={digoxin} onChange={setDigoxin} accent="blue" /></FL>
              <FL label="ACE inhibitor?"><Pills options={['Enalapril','Captopril','None']} value={enalapril} onChange={setEnalapril} accent="teal" /></FL>
            </div>
          </>
        )}
      </Section>

      {/* Arrhythmia */}
      <Section title="Arrhythmia" applicable={sec.arrhythmia} onApplicable={v => sa('arrhythmia', v)} accent="violet">
        <FL label="Arrhythmia present?">
          <Pills options={['Yes','No','Possible']} value={arrhGate} onChange={setArrhGate} accent="violet" />
        </FL>
        {arrhGate === 'Yes' && (
          <>
            <FL label="Arrhythmia type">
              <Pills options={['SVT (supraventricular tachycardia)','VT (ventricular tachycardia)','VF','Bradycardia','AF/flutter','AV block','LQTS','WPW syndrome','CHB (congenital)']}
                value={arrhType} onChange={setArrhType} accent="violet" />
            </FL>
            <FL label="Symptoms">
              <Pills options={['Palpitations','Syncope','Pre-syncope','Chest pain','Dyspnoea','Cardiac arrest']}
                value={arrhSymptoms} onChange={setArrhSymptoms} accent="violet" multi />
            </FL>
            <FL label="12-lead ECG findings">
              <Pills options={['Delta wave (WPW)','Prolonged QTc (>460ms)','ST changes','RBBB/LBBB','High-degree AV block','Epsilon wave (ARVC)','Normal']}
                value={ecgFindings} onChange={setEcgFindings} accent="violet" multi />
            </FL>
            <FL label="Holter monitoring">
              <Pills options={['Done — significant','Done — normal','Pending','Not done']} value={holter} onChange={setHolter} accent="blue" />
            </FL>
          </>
        )}
      </Section>

      {/* IE — Duke criteria */}
      <Section title="Infective Endocarditis (Modified Duke)" applicable={sec.endocarditis} onApplicable={v => sa('endocarditis', v)} accent="red">
        <FL label="IE suspected?">
          <Pills options={['Yes','No','Possible']} value={ieGate} onChange={setIeGate} accent="red" />
        </FL>
        {ieGate === 'Yes' && (
          <>
            <FL label="Duke major criteria">
              <Pills options={['Positive blood cultures (2 sets, typical organisms)','Echo evidence (vegetation/abscess)','New valvular regurgitation']}
                value={ieMajor} onChange={setIeMajor} accent="red" multi />
            </FL>
            <FL label="Duke minor criteria">
              <Pills options={['Predisposing cardiac condition/IVDU','Fever >38°C','Vascular phenomena (Janeway/emboli)','Immunological phenomena (Osler/Roth)','Positive blood culture (not major)','Echo evidence (not major)']}
                value={ieMinor} onChange={setIeMinor} accent="amber" multi />
            </FL>
            <FL label="Blood cultures">
              <Pills options={['Positive — Streptococcus viridans','Positive — Staphylococcus aureus','Positive — HACEK','Negative','Pending']}
                value={bloodCulture} onChange={setBloodCulture} accent="red" />
            </FL>
          </>
        )}
      </Section>

      {/* Echo */}
      <Section title="Echocardiogram Findings" applicable={sec.echo} onApplicable={v => sa('echo', v)} accent="blue">
        <FL label="Echocardiogram performed?">
          <Pills options={['Yes','No','Pending']} value={echoDone} onChange={setEchoDone} accent="blue" />
        </FL>
        {echoDone === 'Yes' && (
          <>
            <FL label="Findings">
              <Pills options={['Normal structure and function','VSD','ASD','PDA','Pericardial effusion','Cardiomyopathy',
                'Mitral regurgitation','Aortic regurgitation','Coronary artery dilation','Pulmonary hypertension','Vegetation']}
                value={echoFindings} onChange={setEchoFindings} accent="blue" multi />
            </FL>
            <FL label="Ejection fraction" sub="% (if measurable)">
              <input type="number" value={ef} onChange={e => setEf(e.target.value)} placeholder="55-65% normal" className="w-full border rounded-lg px-2 py-1.5 text-sm" />
            </FL>
          </>
        )}
      </Section>

      {/* Plan */}
      <Section title="Referral & Surgical Plan" applicable={sec.plan} onApplicable={v => sa('plan', v)} accent="teal">
        <div className="grid grid-cols-2 gap-3">
          <FL label="Referral to">
            <Pills options={['Paediatric cardiologist','Paediatric cardiac surgeon','Cardiology centre (AIIMS/Narayana/Amrita)',
              'PM-JAY referral for surgery','Rheumatology (RHD)','None required']}
              value={referral} onChange={setReferral} accent="teal" />
          </FL>
          <FL label="Surgery planned">
            <Pills options={['Urgent (within 24h)','Semi-urgent (within 1 week)','Elective','Catheter intervention','Balloon valvuloplasty','None']}
              value={surgery} onChange={setSurgery} accent="violet" />
          </FL>
        </div>
        <FL label="Additional notes">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Monitoring plan, family counselling, follow-up schedule..." />
        </FL>
      </Section>

      <button type="button" onClick={handleSave}
        className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-base shadow-lg transition-all">
        Save Cardiology Assessment
      </button>
    </div>
  );
}
