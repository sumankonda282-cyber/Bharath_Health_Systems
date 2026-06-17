/**
 * @shared-pool
 * PericardialDiseaseForm — portal-agnostic cardiology assessment
 * ESC 2015 Pericarditis Guidelines | Beck's Triad | TB pericarditis India
 */

import React, { useState, useMemo } from 'react';
import api from '../../../api/client';

/* ─── tiny shared UI ─────────────────────────────────────── */
const Pills = ({ options, value, onChange, multi = false, color = 'blue' }) => {
  const active = `bg-${color}-600 text-white border-${color}-600`;
  const inactive = 'bg-white text-gray-700 border-gray-300 hover:border-gray-400';
  const toggle = (v) => {
    if (multi) {
      const arr = Array.isArray(value) ? value : [];
      onChange(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
    } else {
      onChange(value === v ? null : v);
    }
  };
  const isActive = (v) => multi ? (Array.isArray(value) && value.includes(v)) : value === v;
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const label = typeof o === 'string' ? o : o.label;
        const val = typeof o === 'string' ? o : (o.value ?? o.label);
        return (
          <button key={val} type="button" onClick={() => toggle(val)}
            className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${isActive(val) ? active : inactive}`}>
            {label}
          </button>
        );
      })}
    </div>
  );
};

const FL = ({ label, sub, children }) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-medium text-gray-700">
      {label}{sub && <span className="ml-1 text-xs text-gray-400 font-normal">{sub}</span>}
    </label>
    {children}
  </div>
);

const Gate = ({ label, value, onChange, children, color = 'blue' }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex gap-2">
        {['Yes', 'No'].map(opt => (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            className={`px-3 py-1 rounded-full border text-sm font-medium transition-all ${value === opt
              ? (opt === 'Yes' ? `bg-${color}-600 text-white border-${color}-600` : 'bg-gray-500 text-white border-gray-500')
              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
    {value === 'Yes' && <div className="pl-4 border-l-2 border-gray-200 space-y-3">{children}</div>}
  </div>
);

const Section = ({ title, applicable, onApplicable, color = 'blue', children }) => {
  if (applicable === 'No') {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-400">{title}</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">🔒 Not applicable — section locked</span>
            <button type="button" onClick={() => onApplicable('Yes')}
              className="px-3 py-1 rounded-full border border-gray-300 text-xs text-gray-500 hover:border-gray-400">Reopen</button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={`rounded-xl border border-${color}-100 bg-${color}-50/30 p-5 space-y-4`}>
      <div className="flex items-center justify-between">
        <h3 className={`font-semibold text-${color}-900`}>{title}</h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Applicable?</span>
          {['Yes', 'No'].map(opt => (
            <button key={opt} type="button" onClick={() => onApplicable(opt)}
              className={`px-2.5 py-0.5 rounded-full border text-xs font-medium transition-all ${applicable === opt
                ? (opt === 'Yes' ? `bg-${color}-600 text-white border-${color}-600` : 'bg-gray-400 text-white border-gray-400')
                : 'bg-white text-gray-500 border-gray-300'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      {applicable === 'Yes' && <div className="space-y-4">{children}</div>}
    </div>
  );
};

/* ─── ESC 2015 Pericarditis diagnostic criteria ───────────── */
/*
  ESC 2015: ≥2 of the following 4:
  1. Pericarditic chest pain (sharp, pleuritic, positional)
  2. Pericardial rub
  3. New ST elevation or PR depression on ECG
  4. Pericardial effusion (new or worsening)
  Supporting: elevated CRP/ESR/WBC, fever, pericarditis on CT/CMR
*/

/* ─── main form ─────────────────────────────────────────────── */
export default function PericardialDiseaseForm({ patientId, encounterId, onSave }) {
  const [saving, setSaving] = useState(false);

  /* Section gates */
  const [appDiagnosis,   setAppDiagnosis]   = useState(null);
  const [appEffusion,    setAppEffusion]    = useState(null);
  const [appTamponade,   setAppTamponade]   = useState(null);
  const [appAetiology,   setAppAetiology]   = useState(null);
  const [appTreatment,   setAppTreatment]   = useState(null);
  const [appFollowUp,    setAppFollowUp]    = useState(null);

  /* ── Diagnosis / ESC criteria ── */
  const [pericardialPain,  setPericardialPain]  = useState(null); /* sharp, pleuritic, positional */
  const [pericardialRub,   setPericardialRub]   = useState(null);
  const [ecgChanges,       setEcgChanges]       = useState(null); /* ST elevation saddle/PR depression */
  const [ecgPattern,       setEcgPattern]       = useState([]);
  const [newEffusion,      setNewEffusion]      = useState(null);
  /* supporting */
  const [fever,            setFever]            = useState(null);
  const [crpElevated,      setCrpElevated]      = useState(null);
  const [crpValue,         setCrpValue]         = useState('');
  const [esrElevated,      setEsrElevated]      = useState(null);
  const [wbcElevated,      setWbcElevated]      = useState(null);
  const [cmrConfirmed,     setCmrConfirmed]     = useState(null);
  /* episode type */
  const [episodeType,      setEpisodeType]      = useState(null); /* first/recurrent/incessant/chronic */
  const [priorPericarditis,setPriorPericarditis]= useState(null);

  /* ── Effusion ── */
  const [effusionPresent,  setEffusionPresent]  = useState(null);
  const [effusionSize,     setEffusionSize]     = useState(null); /* trivial/small/moderate/large/very large */
  const [effusionCharacter,setEffusionCharacter]= useState(null);
  const [effusionMm,       setEffusionMm]       = useState(''); /* mm on echo */
  const [raCollapse,       setRaCollapse]       = useState(null); /* RA collapse */
  const [rvCollapse,       setRvCollapse]       = useState(null); /* RV collapse */
  const [ivsSeptalBounce,  setIvsSeptalBounce]  = useState(null);
  const [respirPhasic,     setRespirPhasic]     = useState(null); /* respirophasic variation */

  /* ── Tamponade ── */
  const [tamponadePresent, setTamponadePresent] = useState(null);
  /* Beck's triad */
  const [hypotension,      setHypotension]      = useState(null); /* SBP <90 */
  const [jvpRaised,        setJvpRaised]        = useState(null); /* raised JVP / distended neck veins */
  const [muteHeartSounds,  setMuteHeartSounds]  = useState(null); /* muffled / distant heart sounds */
  /* extra tamponade signs */
  const [pulsusParadoxus,  setPulsusParadoxus]  = useState(null); /* >10 mmHg inspiratory drop */
  const [pulsusValue,      setPulsusValue]      = useState('');
  const [kussmaulsSign,    setKussmaulsSign]    = useState(null);
  const [ecgAlternans,     setEcgAlternans]     = useState(null); /* electrical alternans */
  const [pericardiocentesisNeeded, setPericardiocentesisNeeded] = useState(null);

  /* ── Aetiology ── */
  const [aetiology,        setAetiology]        = useState([]);
  const [tbSuspected,      setTbSuspected]      = useState(null);
  const [tbSymptoms,       setTbSymptoms]       = useState([]);
  const [tbTests,          setTbTests]          = useState([]);
  const [tbTestResults,    setTbTestResults]    = useState([]);
  const [hivStatus,        setHivStatus]        = useState(null);
  const [immunosuppressed, setImmunosuppressed] = useState(null);

  /* ── Treatment ── */
  const [aspirin,          setAspirin]          = useState(null);
  const [ibuprofen,        setIbuprofen]        = useState(null);
  const [colchicine,       setColchicine]       = useState(null);
  const [colchicineDose,   setColchicineDose]   = useState(null);
  const [corticosteroid,   setCorticosteroid]   = useState(null);
  const [steroidIndication,setSteroidIndication]= useState([]);
  const [steroidDose,      setSteroidDose]      = useState(null);
  const [ivig,             setIvig]             = useState(null);
  const [tbTreatment,      setTbTreatment]      = useState(null);
  const [activityRestriction, setActivityRestriction] = useState(null);
  const [hospitalize,      setHospitalize]      = useState(null);
  const [hospitalizationReason, setHospitalizationReason] = useState([]);

  /* ── Follow-up ── */
  const [crpOnFollowUp,    setCrpOnFollowUp]    = useState(null);
  const [followUpWeeks,    setFollowUpWeeks]    = useState(null);
  const [recurrenceCount,  setRecurrenceCount]  = useState(null);
  const [anakinra,         setAnakinra]         = useState(null); /* IL-1 blocker for recurrent */

  /* ─── computed: ESC 2015 criteria count ──────────────────── */
  const escCriteriaCount = useMemo(() => {
    return [pericardialPain === 'Yes', pericardialRub === 'Yes', ecgChanges === 'Yes', newEffusion === 'Yes'].filter(Boolean).length;
  }, [pericardialPain, pericardialRub, ecgChanges, newEffusion]);

  const pericardiosisDiagnosis = useMemo(() => {
    if (escCriteriaCount >= 2) {
      return { label: `ESC Criteria Met (${escCriteriaCount}/4) — Pericarditis confirmed`, color: 'bg-red-100 border-red-400 text-red-800', met: true };
    }
    if (escCriteriaCount === 1) {
      return { label: `ESC Criteria: ${escCriteriaCount}/4 — Possible pericarditis (need ≥2)`, color: 'bg-yellow-100 border-yellow-400 text-yellow-800', met: false };
    }
    return { label: 'ESC Criteria: 0/4 — Pericarditis unlikely', color: 'bg-green-100 border-green-400 text-green-800', met: false };
  }, [escCriteriaCount]);

  /* ─── computed: Beck's triad count ──────────────────────── */
  const beckCount = useMemo(() => {
    return [hypotension === 'Yes', jvpRaised === 'Yes', muteHeartSounds === 'Yes'].filter(Boolean).length;
  }, [hypotension, jvpRaised, muteHeartSounds]);

  const tamponadeRisk = useMemo(() => {
    const echoDemonstrates = rvCollapse === 'Yes' || raCollapse === 'Yes' || respirPhasic === 'Yes';
    if (beckCount === 3 && echoDemonstrates) return { label: 'Beck\'s Triad COMPLETE + Echo findings — Pericardiocentesis required urgently', color: 'bg-red-200 border-red-600 text-red-900 animate-pulse', urgent: true };
    if (beckCount === 3) return { label: 'Beck\'s Triad COMPLETE — Urgent Echo + Pericardiocentesis', color: 'bg-red-100 border-red-500 text-red-800 animate-pulse', urgent: true };
    if (beckCount >= 2 || echoDemonstrates) return { label: 'Tamponade physiology likely — prepare for pericardiocentesis', color: 'bg-orange-100 border-orange-500 text-orange-800', urgent: false };
    if (beckCount === 1) return { label: 'Possible tamponade — close monitoring, serial echo', color: 'bg-yellow-100 border-yellow-400 text-yellow-800', urgent: false };
    return null;
  }, [beckCount, rvCollapse, raCollapse, respirPhasic]);

  /* ─── computed: high-risk features (ESC 2015) ────────────── */
  const highRiskFeatures = useMemo(() => {
    const flags = [];
    if (fever === 'Yes') flags.push('Fever >38°C');
    if (aetiology.includes('Immunosuppressed / organ transplant')) flags.push('Immunosuppressed host');
    if (aetiology.includes('Oral anticoagulants')) flags.push('On anticoagulants — haemopericardium risk');
    if (Number(effusionMm) > 20) flags.push('Large effusion (>20mm)');
    if (pulsusParadoxus === 'Yes') flags.push('Pulsus paradoxus present');
    if (priorPericarditis === 'Yes' && episodeType === 'Recurrent') flags.push('Recurrent pericarditis — consider colchicine + IL-1 blocker');
    return flags;
  }, [fever, aetiology, effusionMm, pulsusParadoxus, priorPericarditis, episodeType]);

  /* ─── computed: TB pericarditis flag ─────────────────────── */
  const tbFlag = useMemo(() => {
    if (!tbSuspected) return null;
    if (tbSuspected === 'Yes') {
      return { label: 'TB pericarditis suspected — CBNAAT/Xpert, ADA, histology; start anti-TB if high clinical suspicion', color: 'bg-orange-100 border-orange-400 text-orange-800' };
    }
    return null;
  }, [tbSuspected]);

  /* ─── save ────────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        type: 'pericardial_disease', patientId, encounterId,
        diagnosis: {
          escCriteria: { pericardialPain, pericardialRub, ecgChanges, ecgPattern, newEffusion },
          supporting: { fever, crpElevated, crpValue, esrElevated, wbcElevated, cmrConfirmed },
          episodeType, priorPericarditis,
        },
        effusion: { present: effusionPresent, size: effusionSize, character: effusionCharacter, mm: effusionMm, raCollapse, rvCollapse, ivsSeptalBounce, respiratoryPhasic: respirPhasic },
        tamponade: {
          present: tamponadePresent,
          becksTriad: { hypotension, jvpRaised, muteHeartSounds },
          beckCount,
          pulsusParadoxus, pulsusValue, kussmaulsSign, ecgAlternans, pericardiocentesisNeeded,
        },
        aetiology: { causes: aetiology, tbSuspected, tbSymptoms, tbTests, tbTestResults, hivStatus, immunosuppressed },
        treatment: { aspirin, ibuprofen, colchicine, colchicineDose, corticosteroid, steroidIndication, steroidDose, ivig, tbTreatment, activityRestriction, hospitalize, hospitalizationReason },
        followUp: { crpOnFollowUp, followUpWeeks, recurrenceCount, anakinra },
        computed: {
          escCriteriaCount,
          diagnosisLabel: pericardiosisDiagnosis?.label,
          tamponadeLabel: tamponadeRisk?.label,
          highRiskFeatures,
          tbFlagLabel: tbFlag?.label,
        },
      };
      await api.post('/assessments', payload);
      onSave?.();
    } finally {
      setSaving(false);
    }
  };

  const isUrgent = tamponadeRisk?.urgent || beckCount >= 2;

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-10">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-600 to-gray-800 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <h2 className="text-xl font-bold">Pericardial Disease Assessment</h2>
        </div>
        <p className="text-sm text-gray-300">ESC 2015 Pericarditis · Beck's Triad · TB Pericarditis India</p>
        {isUrgent && (
          <div className="mt-3 bg-red-600 rounded-lg px-4 py-2 text-sm font-semibold animate-pulse">
            ⚠ URGENT: Tamponade physiology — immediate pericardiocentesis required
          </div>
        )}
        {pericardiosisDiagnosis && (
          <div className={`mt-2 rounded-lg px-4 py-2 text-sm font-semibold border ${pericardiosisDiagnosis.color}`}>
            {pericardiosisDiagnosis.label}
          </div>
        )}
        {tamponadeRisk && (
          <div className={`mt-2 rounded-lg px-4 py-2 text-sm font-semibold border ${tamponadeRisk.color}`}>
            {tamponadeRisk.label}
          </div>
        )}
        {tbFlag && (
          <div className={`mt-2 rounded-lg px-4 py-2 text-sm font-semibold border ${tbFlag.color}`}>
            {tbFlag.label}
          </div>
        )}
        {highRiskFeatures.length > 0 && (
          <div className="mt-2 bg-yellow-500/20 rounded-lg px-4 py-2">
            <p className="text-xs font-semibold text-yellow-200 mb-1">High-risk features (hospitalize):</p>
            {highRiskFeatures.map(f => <p key={f} className="text-xs text-yellow-100">• {f}</p>)}
          </div>
        )}
      </div>

      {/* Section 1 — Diagnosis / ESC Criteria */}
      <Section title="1. Diagnosis — ESC 2015 Pericarditis Criteria" applicable={appDiagnosis} onApplicable={setAppDiagnosis} color="slate">
        <p className="text-xs text-gray-500 font-medium">≥2 of the following 4 criteria required for diagnosis</p>
        <div className="space-y-3">
          <FL label="1. Pericarditic chest pain (sharp, pleuritic, worse supine, relieved leaning forward)?">
            <Pills options={['Yes','No']} value={pericardialPain} onChange={setPericardialPain} color="slate" />
          </FL>
          <FL label="2. Pericardial friction rub on auscultation?">
            <Pills options={['Yes','No']} value={pericardialRub} onChange={setPericardialRub} color="slate" />
          </FL>
          <FL label="3. New ST-elevation or PR-depression on ECG?">
            <Pills options={['Yes','No']} value={ecgChanges} onChange={setEcgChanges} color="slate" />
          </FL>
          {ecgChanges === 'Yes' && (
            <FL label="ECG pattern">
              <Pills options={['Saddle-shaped ST elevation','PR depression (most leads)','Electrical alternans','Low voltage','Both ST + PR changes']} value={ecgPattern} onChange={setEcgPattern} multi color="slate" />
            </FL>
          )}
          <FL label="4. New or worsening pericardial effusion on echo?">
            <Pills options={['Yes','No']} value={newEffusion} onChange={setNewEffusion} color="slate" />
          </FL>
        </div>
        <div className={`rounded-lg px-4 py-2 text-sm font-semibold border ${pericardiosisDiagnosis.color}`}>
          ESC Criteria: {escCriteriaCount}/4 — {pericardiosisDiagnosis.label.split(' — ')[1] || ''}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Fever >38°C?">
            <Pills options={['Yes','No']} value={fever} onChange={setFever} color="slate" />
          </FL>
          <FL label="CRP elevated?">
            <Pills options={['Yes','No']} value={crpElevated} onChange={setCrpElevated} color="slate" />
          </FL>
        </div>
        {crpElevated === 'Yes' && (
          <FL label="CRP value" sub="mg/L">
            <input type="number" step="0.1" value={crpValue} onChange={e => setCrpValue(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-slate-400" placeholder="e.g. 45" />
          </FL>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FL label="ESR elevated?">
            <Pills options={['Yes','No']} value={esrElevated} onChange={setEsrElevated} color="slate" />
          </FL>
          <FL label="WBC elevated?">
            <Pills options={['Yes','No']} value={wbcElevated} onChange={setWbcElevated} color="slate" />
          </FL>
        </div>
        <FL label="CMR confirmed pericarditis/myopericarditis?">
          <Pills options={['Yes — LGE pericardial enhancement','Yes — myocardial involvement (myopericarditis)','No','Not done']} value={cmrConfirmed} onChange={setCmrConfirmed} color="slate" />
        </FL>
        <FL label="Episode type">
          <Pills options={['First episode','Recurrent (≥28 days after symptom-free)','Incessant (continuous <3 months)','Chronic (>3 months)']} value={episodeType} onChange={setEpisodeType} color="slate" />
        </FL>
        <Gate label="Previous pericarditis episode?" value={priorPericarditis} onChange={setPriorPericarditis} color="slate">
          <FL label="Number of prior episodes">
            <Pills options={['1','2','3','>3']} value={recurrenceCount} onChange={setRecurrenceCount} color="slate" />
          </FL>
        </Gate>
      </Section>

      {/* Section 2 — Pericardial Effusion */}
      <Section title="2. Pericardial Effusion" applicable={appEffusion} onApplicable={setAppEffusion} color="blue">
        <FL label="Effusion present?">
          <Pills options={['Yes','No']} value={effusionPresent} onChange={setEffusionPresent} color="blue" />
        </FL>
        {effusionPresent === 'Yes' && (
          <>
            <FL label="Effusion size (echo classification)">
              <Pills options={['Trivial (<10 mm)','Small (10–20 mm)','Moderate (10–20 mm circumferential)','Large (>20 mm)','Very large (>25 mm + haemodynamic compromise)']} value={effusionSize} onChange={setEffusionSize} color="blue" />
            </FL>
            <FL label="Effusion size" sub="mm (echo diastolic)">
              <input type="number" step="1" value={effusionMm} onChange={e => setEffusionMm(e.target.value)}
                className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400" placeholder="e.g. 18" />
            </FL>
            <FL label="Effusion character">
              <Pills options={['Anechoic (serous/transudative)','Echogenic (haemorrhagic/exudate)','Fibrinous strands','Loculated']} value={effusionCharacter} onChange={setEffusionCharacter} color="blue" />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="RA systolic collapse?">
                <Pills options={['Yes','No']} value={raCollapse} onChange={setRaCollapse} color="blue" />
              </FL>
              <FL label="RV diastolic collapse?">
                <Pills options={['Yes','No']} value={rvCollapse} onChange={setRvCollapse} color="blue" />
              </FL>
              <FL label="IVS septal bounce?">
                <Pills options={['Yes','No']} value={ivsSeptalBounce} onChange={setIvsSeptalBounce} color="blue" />
              </FL>
              <FL label="Respiratory phasic variation (≥25%)?">
                <Pills options={['Yes','No']} value={respirPhasic} onChange={setRespirPhasic} color="blue" />
              </FL>
            </div>
            {(rvCollapse === 'Yes' || respirPhasic === 'Yes') && (
              <div className="rounded-lg bg-red-50 border border-red-300 px-4 py-2">
                <p className="text-sm text-red-700 font-semibold">⚠ Echo tamponade physiology — urgent pericardiocentesis assessment</p>
              </div>
            )}
          </>
        )}
      </Section>

      {/* Section 3 — Tamponade / Beck's Triad */}
      <Section title="3. Cardiac Tamponade — Beck's Triad" applicable={appTamponade} onApplicable={setAppTamponade} color="red">
        <p className="text-xs text-gray-500 font-medium">Beck's Triad: Hypotension + Raised JVP + Muffled heart sounds</p>
        <div className="space-y-3">
          <FL label="1. Hypotension (SBP <90 mmHg)?">
            <Pills options={['Yes','No']} value={hypotension} onChange={setHypotension} color="red" />
          </FL>
          <FL label="2. Raised JVP / Distended neck veins?">
            <Pills options={['Yes','No']} value={jvpRaised} onChange={setJvpRaised} color="red" />
          </FL>
          <FL label="3. Muffled / distant heart sounds?">
            <Pills options={['Yes','No']} value={muteHeartSounds} onChange={setMuteHeartSounds} color="red" />
          </FL>
        </div>
        <div className={`rounded-lg px-4 py-3 text-sm font-semibold border ${
          beckCount === 3 ? 'bg-red-200 border-red-600 text-red-900 animate-pulse' :
          beckCount === 2 ? 'bg-orange-100 border-orange-500 text-orange-900' :
          beckCount === 1 ? 'bg-yellow-100 border-yellow-400 text-yellow-800' :
          'bg-gray-100 border-gray-300 text-gray-600'}`}>
          Beck's Triad: {beckCount}/3 criteria present
          {beckCount === 3 && ' — COMPLETE TRIAD — EMERGENCY'}
        </div>
        <FL label="Pulsus paradoxus (>10 mmHg inspiratory SBP drop)?">
          <Pills options={['Yes','No']} value={pulsusParadoxus} onChange={setPulsusParadoxus} color="red" />
        </FL>
        {pulsusParadoxus === 'Yes' && (
          <FL label="Pulsus paradoxus magnitude" sub="mmHg">
            <input type="number" step="1" value={pulsusValue} onChange={e => setPulsusValue(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-400" placeholder="e.g. 18" />
          </FL>
        )}
        <FL label="Kussmaul's sign (JVP rises on inspiration)?">
          <Pills options={['Yes (suggests constrictive)','No']} value={kussmaulsSign} onChange={setKussmaulsSign} color="red" />
        </FL>
        <FL label="Electrical alternans on ECG?">
          <Pills options={['Yes','No']} value={ecgAlternans} onChange={setEcgAlternans} color="red" />
        </FL>
        {ecgAlternans === 'Yes' && (
          <div className="rounded-lg bg-red-50 border border-red-300 px-4 py-2">
            <p className="text-sm text-red-700 font-semibold">Electrical alternans — pathognomonic of large pericardial effusion with tamponade physiology</p>
          </div>
        )}
        <FL label="Pericardiocentesis required?">
          <Pills options={['Yes — immediate (haemodynamic compromise)','Yes — semi-elective (diagnostic)','No','Done — drainage performed']} value={pericardiocentesisNeeded} onChange={setPericardiocentesisNeeded} color="red" />
        </FL>
        {tamponadeRisk && (
          <div className={`rounded-lg px-4 py-2 text-sm font-semibold border ${tamponadeRisk.color}`}>
            {tamponadeRisk.label}
          </div>
        )}
      </Section>

      {/* Section 4 — Aetiology */}
      <Section title="4. Aetiology" applicable={appAetiology} onApplicable={setAppAetiology} color="amber">
        <FL label="Cause of pericardial disease" sub="multi-select">
          <Pills options={['Idiopathic / Viral (most common)','Tuberculosis','Bacterial / Purulent','Fungal','Uraemic','Autoimmune (SLE/RA/Scleroderma)','Malignancy (metastatic)','Post-MI (Dressler syndrome)','Post-cardiac surgery','Hypothyroidism','Radiation-induced','Drugs (hydralazine/INH)','Oral anticoagulants','Aortic dissection','Immunosuppressed / organ transplant']} value={aetiology} onChange={setAetiology} multi color="amber" />
        </FL>
        <Gate label="TB pericarditis suspected?" value={tbSuspected} onChange={setTbSuspected} color="amber">
          <FL label="TB symptoms" sub="multi-select">
            <Pills options={['Weight loss >5%','Night sweats','Persistent cough (>2 weeks)','Haemoptysis','Contact with TB case','HIV positive','Prior TB']} value={tbSymptoms} onChange={setTbSymptoms} multi color="amber" />
          </FL>
          <FL label="TB investigations done" sub="multi-select">
            <Pills options={['CBNAAT/Xpert MTB (pericardial fluid)','ADA (adenosine deaminase) pericardial fluid','Culture (Lowenstein-Jensen)','Chest X-ray','HRCT thorax','IGRA/Mantoux','HIV test']} value={tbTests} onChange={setTbTests} multi color="amber" />
          </FL>
          <FL label="TB test results" sub="multi-select">
            <Pills options={['CBNAAT positive','ADA >40 U/L','Mantoux >10mm','IGRA positive','CXR: mediastinal/hilar adenopathy','HRCT: tree-in-bud / cavities']} value={tbTestResults} onChange={setTbTestResults} multi color="amber" />
          </FL>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            India: TB pericarditis accounts for ~90% of bacterial pericarditis. ADA >40 U/L has sensitivity ~87%, specificity ~89% for TB pericarditis. CBNAAT of pericardial fluid is diagnostic. Start anti-TB empirically if high clinical suspicion — 2HRZE / 4HR. Consider corticosteroids (prednisolone 1 mg/kg × 2–4 weeks) to reduce constriction.
          </div>
        </Gate>
        <FL label="HIV status">
          <Pills options={['Positive','Negative','Not tested','Known positive on ART']} value={hivStatus} onChange={setHivStatus} color="amber" />
        </FL>
        <FL label="Immunosuppressed?">
          <Pills options={['Yes — steroids','Yes — chemotherapy','Yes — biologics','Yes — organ transplant','No']} value={immunosuppressed} onChange={setImmunosuppressed} color="amber" />
        </FL>
      </Section>

      {/* Section 5 — Treatment */}
      <Section title="5. Treatment" applicable={appTreatment} onApplicable={setAppTreatment} color="green">
        <FL label="Aspirin">
          <Pills options={['500 mg TDS × 2 weeks','500 mg TDS × 3–4 weeks','Not used (NSAID preferred)','Contraindicated']} value={aspirin} onChange={setAspirin} color="green" />
        </FL>
        <FL label="Ibuprofen">
          <Pills options={['600 mg TDS','800 mg TDS','400 mg TDS','Not used','Contraindicated (renal/GI)']} value={ibuprofen} onChange={setIbuprofen} color="green" />
        </FL>
        <FL label="Colchicine (first-line adjunct — ESC Class I)">
          <Pills options={['Yes — prescribed','No','Contraindicated (severe renal failure/pregnancy)']} value={colchicine} onChange={setColchicine} color="green" />
        </FL>
        {colchicine === 'Yes — prescribed' && (
          <FL label="Colchicine dose">
            <Pills options={['0.5 mg BD (<70 kg)','0.5 mg OD (<70 kg, reduce dose)','1.0 mg BD (≥70 kg)','0.5 mg BD × 3 months (first episode)','0.5 mg BD × 6 months (recurrent)']} value={colchicineDose} onChange={setColchicineDose} color="green" />
          </FL>
        )}
        <Gate label="Corticosteroids?" value={corticosteroid} onChange={setCorticosteroid} color="green">
          <FL label="Indication" sub="multi-select">
            <Pills options={['Failed NSAID/colchicine','Autoimmune cause (SLE/RA)','TB pericarditis (adjunct)','Uraemic pericarditis','Recurrent pericarditis (refractory)','Pregnancy (NSAIDs contraindicated 3rd trimester)']} value={steroidIndication} onChange={setSteroidIndication} multi color="green" />
          </FL>
          <FL label="Steroid dose">
            <Pills options={['Prednisolone 0.25 mg/kg/day (low dose)','Prednisolone 0.5 mg/kg/day','Prednisolone 1 mg/kg/day (severe)','Methylprednisolone IV (haemodynamically unstable)']} value={steroidDose} onChange={setSteroidDose} color="green" />
          </FL>
        </Gate>
        <FL label="IVIG (refractory recurrent — off-label)?">
          <Pills options={['Yes','No','Not available']} value={ivig} onChange={setIvig} color="green" />
        </FL>
        <Gate label="Anti-TB treatment started?" value={tbTreatment} onChange={setTbTreatment} color="green">
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-xs text-green-800">
            Standard RNTCP/NTP regimen: 2HRZE / 4HR. Duration for TB pericarditis: minimum 6 months. Notify to district TB officer. Enter in Nikshay portal.
          </div>
        </Gate>
        <FL label="Activity restriction">
          <Pills options={['Strict rest (competitive sports banned) until symptom-free + CRP normal','Moderate restriction (light activity only)','Normal activity allowed (mild/no symptoms)']} value={activityRestriction} onChange={setActivityRestriction} color="green" />
        </FL>
        <Gate label="Hospitalisation indicated?" value={hospitalize} onChange={setHospitalize} color="green">
          <FL label="Reason" sub="multi-select">
            <Pills options={['High-risk features (fever/large effusion)','Tamponade','Elevated troponin (myopericarditis)','Immunosuppressed','Failed outpatient NSAID','Diagnostic uncertainty']} value={hospitalizationReason} onChange={setHospitalizationReason} multi color="green" />
          </FL>
        </Gate>
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-xs text-green-800">
          ESC 2015 first-line: Aspirin/NSAID + Colchicine (Class I-A). Corticosteroids only if NSAID contraindicated or failed. Athletes: return to sport only after CRP normal + symptoms resolved + echo normal (minimum 3 months for myopericarditis).
        </div>
      </Section>

      {/* Section 6 — Follow-up */}
      <Section title="6. Follow-up & Monitoring" applicable={appFollowUp} onApplicable={setAppFollowUp} color="slate">
        <FL label="CRP at follow-up (guide treatment duration)">
          <Pills options={['Normalised (<5 mg/L)','Still elevated','Not checked']} value={crpOnFollowUp} onChange={setCrpOnFollowUp} color="slate" />
        </FL>
        {crpOnFollowUp === 'Still elevated' && (
          <div className="rounded-lg bg-amber-50 border border-amber-300 px-4 py-2">
            <p className="text-sm text-amber-700 font-medium">CRP still elevated — do not taper treatment. Reassess aetiology. Consider CMR to exclude myopericarditis.</p>
          </div>
        )}
        <FL label="IL-1 blocker (Anakinra) for refractory recurrent pericarditis?">
          <Pills options={['Recommended — refer rheumatology','Already started','Not indicated','Cost barrier']} value={anakinra} onChange={setAnakinra} color="slate" />
        </FL>
        <FL label="Follow-up interval">
          <Pills options={['1 week (high-risk)','2 weeks','4 weeks (stable first episode)','3 months','6 months']} value={followUpWeeks} onChange={setFollowUpWeeks} color="slate" />
        </FL>
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700">
          Constrictive pericarditis: suspect if Kussmaul's sign + pericardial knock + paradoxical septal motion on echo + calcified pericardium on CT. Pericardiectomy if severe chronic constrictive pericarditis.
        </div>
      </Section>

      {/* Save */}
      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-slate-600 to-gray-700 text-white font-semibold shadow hover:from-slate-700 hover:to-gray-800 disabled:opacity-50 transition-all">
        {saving ? 'Saving…' : 'Save Pericardial Disease Assessment'}
      </button>
    </div>
  );
}
