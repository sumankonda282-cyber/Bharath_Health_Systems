/**
 * @shared-pool
 * ValvularHeartDiseaseForm — portal-agnostic cardiology assessment
 * AHA/ACC 2021 valve guidelines | RHD India context | Wilkins score
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
          <button key={val} type="button"
            onClick={() => toggle(val)}
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
      <div className={`rounded-xl border-2 border-dashed border-gray-200 p-4`}>
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

/* ─── Wilkins score component ─────────────────────────────── */
const WILKINS_ROWS = [
  { key: 'mobility', label: 'Leaflet mobility', opts: [
    { label: 'Highly mobile, restricted only at tips (1)', score: 1 },
    { label: 'Reduced mobility of base & mid-portions (2)', score: 2 },
    { label: 'Forward movement in diastole only at base (3)', score: 3 },
    { label: 'No or minimal forward movement (4)', score: 4 },
  ]},
  { key: 'thickening', label: 'Valve thickening', opts: [
    { label: 'Near normal (4–5 mm) (1)', score: 1 },
    { label: 'Mid-leaflet thickening, edges near normal (2)', score: 2 },
    { label: 'Thickening extends through leaflet (3)', score: 3 },
    { label: 'Marked thickening of all leaflet tissue (4)', score: 4 },
  ]},
  { key: 'calcification', label: 'Subvalvular calcification', opts: [
    { label: 'Minimal, single area of brightness (1)', score: 1 },
    { label: 'Scattered areas, extending to chords (2)', score: 2 },
    { label: 'Brightness extends to distal third (3)', score: 3 },
    { label: 'Extensive thickening/brightening of chordal structures (4)', score: 4 },
  ]},
  { key: 'subvalvular', label: 'Subvalvular thickening', opts: [
    { label: 'Minimal thickening just below mitral leaflets (1)', score: 1 },
    { label: 'Thickening of chordal structures ≤1/3 chordal length (2)', score: 2 },
    { label: 'Thickening to distal third of chords (3)', score: 3 },
    { label: 'Extensive thickening/shortening of all chordal structures (4)', score: 4 },
  ]},
];

/* ─── AHA/ACC severity criteria references ─────────────────── */
const SEVERITY = {
  AS:  ['Mild (Vmax 2–3 m/s, AVA >1.5 cm²)', 'Moderate (Vmax 3–4 m/s, AVA 1.0–1.5 cm²)', 'Severe (Vmax ≥4 m/s, AVA ≤1.0 cm²)', 'Very Severe (Vmax ≥5 m/s, AVA ≤0.6 cm²)'],
  MS:  ['Mild (MVA >1.5 cm², mean grad <5 mmHg)', 'Moderate (MVA 1.0–1.5 cm², mean grad 5–10 mmHg)', 'Severe (MVA ≤1.0 cm², mean grad >10 mmHg)'],
  MR:  ['Mild (Regurgitant vol <30 mL, RF <30%)', 'Moderate (Regurgitant vol 30–59 mL, RF 30–49%)', 'Severe (Regurgitant vol ≥60 mL, RF ≥50%)'],
  AR:  ['Mild (RF <30%, VC <0.3 cm)', 'Moderate (RF 30–49%, VC 0.3–0.6 cm)', 'Severe (RF ≥50%, VC >0.6 cm)'],
  TR:  ['Mild', 'Moderate', 'Severe'],
  PR:  ['Mild', 'Moderate', 'Severe'],
};

/* ─── main form ─────────────────────────────────────────────── */
export default function ValvularHeartDiseaseForm({ patientId, encounterId, onSave }) {
  const [saving, setSaving] = useState(false);

  /* Section applicability gates */
  const [appPresent,    setAppPresent]    = useState(null);
  const [appSymptoms,   setAppSymptoms]   = useState(null);
  const [appEcho,       setAppEcho]       = useState(null);
  const [appRHD,        setAppRHD]        = useState(null);
  const [appIntervention, setAppIntervention] = useState(null);
  const [appProphylaxis, setAppProphylaxis] = useState(null);

  /* ── Presentation ── */
  const [valvesAffected,  setValvesAffected]  = useState([]);
  const [aetiology,       setAetiology]       = useState([]);
  const [heartRhythm,     setHeartRhythm]     = useState(null);
  const [nyha,            setNyha]            = useState(null);

  /* ── Symptoms ── */
  const [symptoms,        setSymptoms]        = useState([]);
  const [syncope,         setSyncope]         = useState(null);
  const [cardiacArrest,   setCardiacArrest]   = useState(null);

  /* ── Severity — per valve ── */
  const [asSeverity,  setAsSeverity]  = useState(null);
  const [msSeverity,  setMsSeverity]  = useState(null);
  const [mrSeverity,  setMrSeverity]  = useState(null);
  const [arSeverity,  setArSeverity]  = useState(null);
  const [trSeverity,  setTrSeverity]  = useState(null);

  /* ── AS echo fields ── */
  const [asVmax,  setAsVmax]  = useState('');
  const [asGrad,  setAsGrad]  = useState('');
  const [asAva,   setAsAva]   = useState('');
  const [asLvef,  setAsLvef]  = useState('');
  const [asLfLg,  setAsLfLg]  = useState(null); /* low-flow low-gradient */

  /* ── MS echo fields ── */
  const [msMva,   setMsMva]   = useState('');
  const [msMgrad, setMsMgrad] = useState('');
  const [msPap,   setMsPap]   = useState('');
  const [msLaSize,setMsLaSize]= useState('');

  /* ── MR echo ── */
  const [mrMechanism, setMrMechanism] = useState(null);
  const [mrLvedd,     setMrLvedd]     = useState('');
  const [mrLvesd,     setMrLvesd]     = useState('');
  const [mrLvef,      setMrLvef]      = useState('');

  /* ── AR echo ── */
  const [arLvedd, setArLvedd] = useState('');
  const [arLvesd, setArLvesd] = useState('');
  const [arLvef,  setArLvef]  = useState('');

  /* ── Wilkins score (MS) ── */
  const [wilkins, setWilkins] = useState({ mobility: null, thickening: null, calcification: null, subvalvular: null });

  /* ── RHD ── */
  const [rhdConfirmed,     setRhdConfirmed]     = useState(null);
  const [rhdArfHistory,    setRhdArfHistory]    = useState(null);
  const [rhdStrep,         setRhdStrep]         = useState(null);
  const [rhdNpcdcs,        setRhdNpcdcs]        = useState(null);

  /* ── Intervention ── */
  const [interventionConsidered, setInterventionConsidered] = useState(null);
  const [interventionType,       setInterventionType]       = useState(null);
  const [interventionUrgency,    setInterventionUrgency]    = useState(null);
  const [contraindications,      setContraindications]      = useState([]);
  const [heartTeamReferral,      setHeartTeamReferral]      = useState(null);

  /* ── Prophylaxis / medications ── */
  const [benzPenicillin,  setBenzPenicillin]  = useState(null);
  const [benzDose,        setBenzDose]        = useState(null);
  const [benzDuration,    setBenzDuration]    = useState(null);
  const [anticoagulation, setAnticoagulation] = useState(null);
  const [diuretic,        setDiuretic]        = useState(null);
  const [vasodilator,     setVasodilator]     = useState(null);
  const [followUpWeeks,   setFollowUpWeeks]   = useState(null);

  /* ─── computed: Wilkins total ─────────────────────────────── */
  const wilkinsTotal = useMemo(() => {
    const vals = Object.values(wilkins);
    if (vals.some(v => v === null)) return null;
    return vals.reduce((s, v) => s + v, 0);
  }, [wilkins]);

  const wilkinsBmvCandidate = useMemo(() => {
    if (wilkinsTotal === null) return null;
    if (wilkinsTotal <= 8) return { label: 'Favorable for BMV', color: 'bg-green-100 border-green-400 text-green-800' };
    if (wilkinsTotal <= 11) return { label: 'Borderline for BMV — expert centre', color: 'bg-orange-100 border-orange-400 text-orange-800' };
    return { label: 'Unfavorable for BMV — surgery preferred', color: 'bg-red-100 border-red-400 text-red-800' };
  }, [wilkinsTotal]);

  /* ─── computed: AS intervention candidacy ────────────────── */
  const asIntervention = useMemo(() => {
    const sev = asSeverity;
    const symptoms = nyha && (nyha === 'II' || nyha === 'III' || nyha === 'IV');
    if (sev === 'Severe (Vmax ≥4 m/s, AVA ≤1.0 cm²)' || sev === 'Very Severe (Vmax ≥5 m/s, AVA ≤0.6 cm²)') {
      if (symptoms) return { label: 'Class I — AVR/TAVI indicated', color: 'bg-red-100 border-red-400 text-red-800' };
      const lvef = Number(asLvef);
      if (lvef && lvef < 50) return { label: 'Class I — AVR/TAVI (EF<50%)', color: 'bg-red-100 border-red-400 text-red-800' };
      return { label: 'Class IIa — AVR/TAVI if asymptomatic severe AS', color: 'bg-orange-100 border-orange-400 text-orange-800' };
    }
    return null;
  }, [asSeverity, nyha, asLvef]);

  /* ─── computed: MR LV remodelling alert ─────────────────── */
  const mrLvAlert = useMemo(() => {
    const edd = Number(mrLvedd);
    const esd = Number(mrLvesd);
    const ef = Number(mrLvef);
    const flags = [];
    if (esd && esd >= 40) flags.push('LVESD ≥40mm — surgery threshold');
    if (ef && ef < 60)    flags.push('LVEF <60% — surgery threshold');
    return flags;
  }, [mrLvedd, mrLvesd, mrLvef]);

  /* ─── computed: AR LV remodelling alert ─────────────────── */
  const arLvAlert = useMemo(() => {
    const edd = Number(arLvedd);
    const esd = Number(arLvesd);
    const ef = Number(arLvef);
    const flags = [];
    if (edd && edd >= 65) flags.push('LVEDD ≥65mm — surgery threshold');
    if (esd && esd >= 50) flags.push('LVESD ≥50mm — surgery threshold');
    if (ef && ef < 50)    flags.push('LVEF <50% — surgery threshold');
    return flags;
  }, [arLvedd, arLvesd, arLvef]);

  /* ─── save ────────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        type: 'valvular_heart_disease', patientId, encounterId,
        presentation: { valvesAffected, aetiology, heartRhythm, nyha },
        symptoms: { symptoms, syncope, cardiacArrest },
        echo: {
          as: { severity: asSeverity, vmax: asVmax, gradient: asGrad, ava: asAva, lvef: asLvef, lowFlowLowGradient: asLfLg },
          ms: { severity: msSeverity, mva: msMva, meanGrad: msMgrad, sPAP: msPap, laSize: msLaSize },
          mr: { severity: mrSeverity, mechanism: mrMechanism, lvedd: mrLvedd, lvesd: mrLvesd, lvef: mrLvef },
          ar: { severity: arSeverity, lvedd: arLvedd, lvesd: arLvesd, lvef: arLvef },
          tr: { severity: trSeverity },
          wilkins: { scores: wilkins, total: wilkinsTotal },
        },
        rhd: { confirmed: rhdConfirmed, arfHistory: rhdArfHistory, strepThroat: rhdStrep, npcdcsEnrolled: rhdNpcdcs },
        intervention: { considered: interventionConsidered, type: interventionType, urgency: interventionUrgency, contraindications, heartTeamReferral },
        prophylaxis: { benzathineGiven: benzPenicillin, benzDose, benzDuration, anticoagulation, diuretic, vasodilator, followUpWeeks },
        computed: { wilkinsTotal, wilkinsBmvCandidate: wilkinsBmvCandidate?.label, asIntervention: asIntervention?.label, mrLvAlerts: mrLvAlert, arLvAlerts: arLvAlert },
      };
      await api.post('/assessments', payload);
      onSave?.();
    } finally {
      setSaving(false);
    }
  };

  const hasUrgentFinding = (mrLvAlert.length > 0 || arLvAlert.length > 0 ||
    (asSeverity && asSeverity.includes('Severe') && (syncope === 'Yes' || cardiacArrest === 'Yes')));

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-10">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <h2 className="text-xl font-bold">Valvular Heart Disease Assessment</h2>
        </div>
        <p className="text-sm text-emerald-100">AHA/ACC 2021 · ESC 2021 · NPCDCS RHD India</p>
        {hasUrgentFinding && (
          <div className="mt-3 bg-red-600 rounded-lg px-4 py-2 text-sm font-semibold animate-pulse">
            ⚠ Urgent: Surgical/intervention threshold met — refer to Heart Team
          </div>
        )}
        {wilkinsBmvCandidate && (
          <div className={`mt-2 rounded-lg px-4 py-2 text-sm font-semibold border ${wilkinsBmvCandidate.color}`}>
            Wilkins {wilkinsTotal}/16 — {wilkinsBmvCandidate.label}
          </div>
        )}
        {asIntervention && (
          <div className={`mt-2 rounded-lg px-4 py-2 text-sm font-semibold border ${asIntervention.color}`}>
            AS: {asIntervention.label}
          </div>
        )}
      </div>

      {/* Section 1 — Presentation */}
      <Section title="1. Presentation & Valves Affected" applicable={appPresent} onApplicable={setAppPresent} color="emerald">
        <FL label="Which valves are affected?">
          <Pills options={['Aortic (AS/AR)','Mitral (MS/MR)','Tricuspid','Pulmonary','Mixed / Multiple']} value={valvesAffected} onChange={setValvesAffected} multi color="emerald" />
        </FL>
        <FL label="Aetiology / Cause">
          <Pills options={['Rheumatic','Degenerative/Calcific','Bicuspid aortic valve','Mitral valve prolapse','Infective endocarditis','Congenital','Post-MI (papillary muscle)','Post-radiation','Marfan / connective tissue','Unknown']} value={aetiology} onChange={setAetiology} multi color="emerald" />
        </FL>
        <FL label="Heart rhythm">
          <Pills options={['Sinus rhythm','Atrial fibrillation','Other arrhythmia']} value={heartRhythm} onChange={setHeartRhythm} color="emerald" />
        </FL>
        <FL label="NYHA functional class">
          <Pills options={['I','II','III','IV']} value={nyha} onChange={setNyha} color="emerald" />
        </FL>
      </Section>

      {/* Section 2 — Symptoms */}
      <Section title="2. Symptoms" applicable={appSymptoms} onApplicable={setAppSymptoms} color="teal">
        <FL label="Current symptoms">
          <Pills options={['Dyspnoea on exertion','Orthopnoea','PND','Angina','Palpitations','Presyncope','Oedema','Fatigue','Haemoptysis']} value={symptoms} onChange={setSymptoms} multi color="teal" />
        </FL>
        <Gate label="Syncope / Loss of consciousness?" value={syncope} onChange={setSyncope} color="teal">
          <p className="text-sm text-red-700 font-medium">Syncope with severe AS / HCM → urgent intervention</p>
        </Gate>
        <Gate label="Prior cardiac arrest?" value={cardiacArrest} onChange={setCardiacArrest} color="teal">
          <p className="text-sm text-red-700 font-medium">Cardiac arrest history — escalate urgency</p>
        </Gate>
      </Section>

      {/* Section 3 — Echocardiography */}
      <Section title="3. Echocardiography & Severity Grading" applicable={appEcho} onApplicable={setAppEcho} color="cyan">

        {/* AS */}
        {(valvesAffected.includes('Aortic (AS/AR)') || valvesAffected.length === 0) && (
          <div className="space-y-3 border border-cyan-200 rounded-lg p-4 bg-white/60">
            <h4 className="font-semibold text-cyan-800">Aortic Stenosis (AS)</h4>
            <FL label="AS Severity">
              <Pills options={SEVERITY.AS} value={asSeverity} onChange={setAsSeverity} color="cyan" />
            </FL>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <FL label="V-max" sub="m/s">
                <input type="number" step="0.1" value={asVmax} onChange={e => setAsVmax(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-transparent" placeholder="e.g. 4.2" />
              </FL>
              <FL label="Mean gradient" sub="mmHg">
                <input type="number" step="1" value={asGrad} onChange={e => setAsGrad(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-transparent" placeholder="e.g. 42" />
              </FL>
              <FL label="AVA" sub="cm²">
                <input type="number" step="0.1" value={asAva} onChange={e => setAsAva(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-transparent" placeholder="e.g. 0.8" />
              </FL>
              <FL label="LVEF" sub="%">
                <input type="number" step="1" value={asLvef} onChange={e => setAsLvef(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-transparent" placeholder="e.g. 55" />
              </FL>
            </div>
            <FL label="Low-flow low-gradient AS?">
              <Pills options={['Yes (paradoxical LFLG)','No','Not determined']} value={asLfLg} onChange={setAsLfLg} color="cyan" />
            </FL>
            {asIntervention && (
              <div className={`rounded-lg px-4 py-2 text-sm font-semibold border ${asIntervention.color}`}>
                {asIntervention.label}
              </div>
            )}
          </div>
        )}

        {/* MS */}
        {(valvesAffected.includes('Mitral (MS/MR)') || valvesAffected.length === 0) && (
          <div className="space-y-3 border border-cyan-200 rounded-lg p-4 bg-white/60">
            <h4 className="font-semibold text-cyan-800">Mitral Stenosis (MS) / Mitral Regurgitation (MR)</h4>
            <FL label="MS Severity">
              <Pills options={SEVERITY.MS} value={msSeverity} onChange={setMsSeverity} color="cyan" />
            </FL>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <FL label="MVA" sub="cm²">
                <input type="number" step="0.1" value={msMva} onChange={e => setMsMva(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-transparent" placeholder="e.g. 0.9" />
              </FL>
              <FL label="Mean gradient" sub="mmHg">
                <input type="number" step="1" value={msMgrad} onChange={e => setMsMgrad(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-transparent" placeholder="e.g. 12" />
              </FL>
              <FL label="sPAP" sub="mmHg">
                <input type="number" step="1" value={msPap} onChange={e => setMsPap(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-transparent" placeholder="e.g. 55" />
              </FL>
              <FL label="LA size" sub="mm">
                <input type="number" step="1" value={msLaSize} onChange={e => setMsLaSize(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-transparent" placeholder="e.g. 52" />
              </FL>
            </div>

            <div className="mt-2">
              <p className="text-sm font-semibold text-cyan-800 mb-2">Wilkins Score (BMV Candidacy)</p>
              {WILKINS_ROWS.map(row => (
                <div key={row.key} className="mb-3">
                  <FL label={row.label}>
                    <div className="flex flex-wrap gap-2">
                      {row.opts.map(opt => (
                        <button key={opt.score} type="button"
                          onClick={() => setWilkins(w => ({ ...w, [row.key]: wilkins[row.key] === opt.score ? null : opt.score }))}
                          className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${wilkins[row.key] === opt.score ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-gray-700 border-gray-300 hover:border-cyan-400'}`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </FL>
                </div>
              ))}
              {wilkinsTotal !== null && (
                <div className={`rounded-lg px-4 py-2 text-sm font-semibold border ${wilkinsBmvCandidate?.color}`}>
                  Wilkins Total: {wilkinsTotal}/16 — {wilkinsBmvCandidate?.label}
                </div>
              )}
            </div>

            <FL label="MR Severity">
              <Pills options={SEVERITY.MR} value={mrSeverity} onChange={setMrSeverity} color="cyan" />
            </FL>
            <FL label="MR Mechanism (Carpentier)">
              <Pills options={['Type I — Annular dilatation','Type II — Prolapse/flail (MVP)','Type IIIa — Rheumatic/restricted','Type IIIb — Ischaemic/functional']} value={mrMechanism} onChange={setMrMechanism} color="cyan" />
            </FL>
            <div className="grid grid-cols-3 gap-3">
              <FL label="LVEDD" sub="mm"><input type="number" step="1" value={mrLvedd} onChange={e => setMrLvedd(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400" placeholder="e.g. 58" /></FL>
              <FL label="LVESD" sub="mm"><input type="number" step="1" value={mrLvesd} onChange={e => setMrLvesd(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400" placeholder="e.g. 38" /></FL>
              <FL label="LVEF" sub="%"><input type="number" step="1" value={mrLvef} onChange={e => setMrLvef(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400" placeholder="e.g. 62" /></FL>
            </div>
            {mrLvAlert.length > 0 && (
              <div className="rounded-lg bg-red-50 border border-red-300 px-4 py-2 space-y-1">
                {mrLvAlert.map(f => <p key={f} className="text-sm text-red-700 font-semibold">⚠ {f}</p>)}
              </div>
            )}
          </div>
        )}

        {/* AR */}
        {(valvesAffected.includes('Aortic (AS/AR)') || valvesAffected.length === 0) && (
          <div className="space-y-3 border border-cyan-200 rounded-lg p-4 bg-white/60">
            <h4 className="font-semibold text-cyan-800">Aortic Regurgitation (AR)</h4>
            <FL label="AR Severity">
              <Pills options={SEVERITY.AR} value={arSeverity} onChange={setArSeverity} color="cyan" />
            </FL>
            <div className="grid grid-cols-3 gap-3">
              <FL label="LVEDD" sub="mm"><input type="number" step="1" value={arLvedd} onChange={e => setArLvedd(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400" placeholder="e.g. 62" /></FL>
              <FL label="LVESD" sub="mm"><input type="number" step="1" value={arLvesd} onChange={e => setArLvesd(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400" placeholder="e.g. 48" /></FL>
              <FL label="LVEF" sub="%"><input type="number" step="1" value={arLvef} onChange={e => setArLvef(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400" placeholder="e.g. 58" /></FL>
            </div>
            {arLvAlert.length > 0 && (
              <div className="rounded-lg bg-red-50 border border-red-300 px-4 py-2 space-y-1">
                {arLvAlert.map(f => <p key={f} className="text-sm text-red-700 font-semibold">⚠ {f}</p>)}
              </div>
            )}
          </div>
        )}

        {/* TR */}
        {(valvesAffected.includes('Tricuspid') || valvesAffected.length === 0) && (
          <div className="space-y-2 border border-cyan-200 rounded-lg p-4 bg-white/60">
            <h4 className="font-semibold text-cyan-800">Tricuspid / Pulmonary Valves</h4>
            <FL label="TR Severity">
              <Pills options={SEVERITY.TR} value={trSeverity} onChange={setTrSeverity} color="cyan" />
            </FL>
          </div>
        )}
      </Section>

      {/* Section 4 — RHD */}
      <Section title="4. Rheumatic Heart Disease (RHD)" applicable={appRHD} onApplicable={setAppRHD} color="rose">
        <Gate label="RHD confirmed (echo-confirmed or clinical)?" value={rhdConfirmed} onChange={setRhdConfirmed} color="rose">
          <FL label="History of Acute Rheumatic Fever (ARF)?">
            <Pills options={['Yes','No','Unknown']} value={rhdArfHistory} onChange={setRhdArfHistory} color="rose" />
          </FL>
          <FL label="Documented streptococcal throat infection?">
            <Pills options={['Yes','No','Unknown']} value={rhdStrep} onChange={setRhdStrep} color="rose" />
          </FL>
          <FL label="NPCDCS/NHM programme enrolled?">
            <Pills options={['Yes','No','Not available locally']} value={rhdNpcdcs} onChange={setRhdNpcdcs} color="rose" />
          </FL>
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
            RHD is the leading cause of valvular heart disease in India. Benzathine penicillin secondary prophylaxis must be offered to all patients aged &lt;40 years (or &lt;25 years with mild RHD).
          </div>
        </Gate>
      </Section>

      {/* Section 5 — Intervention */}
      <Section title="5. Intervention Candidacy" applicable={appIntervention} onApplicable={setAppIntervention} color="violet">
        <Gate label="Intervention being considered?" value={interventionConsidered} onChange={setInterventionConsidered} color="violet">
          <FL label="Intervention type">
            <Pills options={['AVR — Surgical','AVR — TAVI (TAVR)','MVR — Surgical','MVP Repair — Surgical','BMV (Balloon Mitral Valvotomy)','MitraClip (TEER)','Tricuspid repair/replace','Combined procedure']} value={interventionType} onChange={setInterventionType} color="violet" />
          </FL>
          <FL label="Urgency">
            <Pills options={['Elective','Semi-urgent (within weeks)','Urgent (within days)','Emergency']} value={interventionUrgency} onChange={setInterventionUrgency} color="violet" />
          </FL>
          <FL label="Contraindications / high-risk features" sub="multi-select">
            <Pills options={['High surgical risk (STS >8%)','Active endocarditis','Recent stroke','Severe co-morbidity','Patient declines','Unsuitable anatomy for TAVI','LA thrombus (BMV)']} value={contraindications} onChange={setContraindications} multi color="violet" />
          </FL>
          <FL label="Heart Team referral initiated?">
            <Pills options={['Yes','No','Pending']} value={heartTeamReferral} onChange={setHeartTeamReferral} color="violet" />
          </FL>
          <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-xs text-violet-800">
            TAVI preferred for high surgical risk or age &gt;75. BMV indicated for rheumatic MS with MVA ≤1.5 cm² if anatomy favorable (Wilkins ≤8). LA thrombus must be excluded before BMV.
          </div>
        </Gate>
      </Section>

      {/* Section 6 — Prophylaxis & Management */}
      <Section title="6. Prophylaxis & Medical Management" applicable={appProphylaxis} onApplicable={setAppProphylaxis} color="emerald">
        <Gate label="Benzathine penicillin secondary prophylaxis given?" value={benzPenicillin} onChange={setBenzPenicillin} color="emerald">
          <FL label="Dose">
            <Pills options={['1.2 MU (BWT ≥27 kg)','0.6 MU (BWT <27 kg)']} value={benzDose} onChange={setBenzDose} color="emerald" />
          </FL>
          <FL label="Duration">
            <Pills options={['10 years or age 21 (mild/no carditis)','10 years or age 25 (mild residual VHD)','Lifelong (moderate-severe VHD / recurrent ARF)']} value={benzDuration} onChange={setBenzDuration} color="emerald" />
          </FL>
        </Gate>
        <FL label="Anticoagulation">
          <Pills options={['Warfarin (INR 2–3)','Warfarin (INR 2.5–3.5 — mechanical valve)','DOAC','None']} value={anticoagulation} onChange={setAnticoagulation} color="emerald" />
        </FL>
        <FL label="Diuretics">
          <Pills options={['Furosemide','Torsemide','None needed']} value={diuretic} onChange={setDiuretic} color="emerald" />
        </FL>
        <FL label="Vasodilators (AR/MR)">
          <Pills options={['Amlodipine','Ramipril / ACEI','Sacubitril-valsartan','None']} value={vasodilator} onChange={setVasodilator} color="emerald" />
        </FL>
        <FL label="Follow-up interval">
          <Pills options={['2 weeks','4 weeks','3 months','6 months','1 year']} value={followUpWeeks} onChange={setFollowUpWeeks} color="emerald" />
        </FL>
      </Section>

      {/* Save */}
      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition-all">
        {saving ? 'Saving…' : 'Save Valvular Heart Disease Assessment'}
      </button>
    </div>
  );
}
