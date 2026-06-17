/**
 * @shared-pool
 * HeartFailureAssessmentForm — Comprehensive heart failure assessment
 * Guidelines: ESC 2021 HF Guidelines, ACC/AHA 2022 HF Guidelines, Indian context (RHD, PPCM, PMJAY)
 * EF-based classification (HFrEF/HFmrEF/HFpEF), NYHA, GDMT four pillars, BNP thresholds
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */

import React, { useState, useMemo } from 'react';
import { Heart, Lock, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  purple: {
    bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-800',
    pill: 'bg-white border-purple-300 text-purple-700 hover:bg-purple-50',
    active: 'bg-purple-700 border-purple-700 text-white',
  },
  violet: {
    bg: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-800',
    pill: 'bg-white border-violet-300 text-violet-700 hover:bg-violet-50',
    active: 'bg-violet-700 border-violet-700 text-white',
  },
  blue: {
    bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-800',
    pill: 'bg-white border-blue-300 text-blue-700 hover:bg-blue-50',
    active: 'bg-blue-600 border-blue-600 text-white',
  },
  rose: {
    bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-800',
    pill: 'bg-white border-rose-300 text-rose-700 hover:bg-rose-50',
    active: 'bg-rose-600 border-rose-600 text-white',
  },
  amber: {
    bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800',
    pill: 'bg-white border-amber-300 text-amber-700 hover:bg-amber-50',
    active: 'bg-amber-600 border-amber-600 text-white',
  },
  green: {
    bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-800',
    pill: 'bg-white border-green-300 text-green-700 hover:bg-green-50',
    active: 'bg-green-600 border-green-600 text-white',
  },
  teal: {
    bg: 'bg-teal-50', border: 'border-teal-300', text: 'text-teal-800',
    pill: 'bg-white border-teal-300 text-teal-700 hover:bg-teal-50',
    active: 'bg-teal-600 border-teal-600 text-white',
  },
};

function Pills({ options, value, onChange, accent = 'purple', multi = false }) {
  const c = A[accent];
  const sel = multi ? (Array.isArray(value) ? value : []) : value;
  const toggle = opt => {
    if (multi) {
      const a = Array.isArray(sel) ? sel : [];
      onChange(a.includes(opt) ? a.filter(x => x !== opt) : [...a, opt]);
    } else {
      onChange(sel === opt ? '' : opt);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = multi ? sel.includes(opt) : sel === opt;
        return (
          <button key={opt} type="button" onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${active ? c.active : c.pill}`}>
            {opt}
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
        {label}{sub && <span className="ml-1 text-xs font-normal text-gray-500">{sub}</span>}
      </label>
      {children}
    </div>
  );
}

function Gate({ label, value, onChange, accent = 'purple', children }) {
  const c = A[accent];
  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} p-3`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex gap-2">
          {['Yes', 'No'].map(opt => (
            <button key={opt} type="button" onClick={() => onChange(value === opt ? '' : opt)}
              className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all ${value === opt ? c.active : c.pill}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      {value === 'Yes' && children && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}

function Section({ title, applicable, onApplicable, accent = 'purple', children }) {
  const c = A[accent];
  const [open, setOpen] = useState(true);
  if (applicable === 'N/A') {
    return (
      <div className={`rounded-xl border-2 border-dashed ${c.border} p-4 flex items-center gap-3 opacity-60`}>
        <Lock className="w-5 h-5 text-gray-400" />
        <span className="text-sm text-gray-500 font-medium">{title} — Not applicable · section locked</span>
        <button type="button" onClick={() => onApplicable('Applicable')} className="ml-auto text-xs text-purple-600 underline">Unlock</button>
      </div>
    );
  }
  return (
    <div className={`rounded-xl border-2 ${c.border} overflow-hidden`}>
      <div className={`${c.bg} px-4 py-3 flex items-center justify-between flex-wrap gap-2`}>
        <span className={`font-bold text-base ${c.text}`}>{title}</span>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {['Applicable', 'N/A'].map(v => (
              <button key={v} type="button" onClick={() => onApplicable(v)}
                className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold transition-all ${applicable === v ? c.active : c.pill}`}>
                {v}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setOpen(o => !o)} className={`${c.text} p-1`}>
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {open && applicable === 'Applicable' && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

function NumInput({ value, onChange, placeholder, unit, min, max }) {
  return (
    <div className="flex items-center gap-2">
      <input type="number" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} min={min} max={max}
        className="w-28 px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
      {unit && <span className="text-xs text-gray-500">{unit}</span>}
    </div>
  );
}

const STAGES = [
  'Patient & Presentation',
  'Classification',
  'Aetiology & Triggers',
  'Investigations',
  'GDMT',
  'Monitoring & Prognosis',
];

export default function HeartFailureAssessmentForm({ patientId, encounterId, onSaved }) {
  const [stage, setStage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [sec, setSec] = useState({
    presentation: 'Applicable',
    classification: 'Applicable',
    aetiology: 'Applicable',
    investigations: 'Applicable',
    gdmt: 'Applicable',
    monitoring: 'Applicable',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  // Stage 1 — Patient & Presentation
  const [ageGroup, setAgeGroup] = useState('');
  const [sex, setSex] = useState('');
  const [nyha, setNyha] = useState('');
  const [accAhaStage, setAccAhaStage] = useState('');
  const [hfType, setHfType] = useState('');
  const [sbp, setSbp] = useState('');
  const [dbp, setDbp] = useState('');
  const [hr, setHr] = useState('');
  const [spo2, setSpo2] = useState('');
  const [rr, setRr] = useState('');
  const [weight, setWeight] = useState('');
  const [dryWeight, setDryWeight] = useState('');
  const [weightGain, setWeightGain] = useState('');
  const [symptoms, setSymptoms] = useState([]);
  const [pillows, setPillows] = useState('');
  const [signs, setSigns] = useState([]);

  // Stage 2 — Classification
  const [ef, setEf] = useState('');
  const [sixMwtStage2, setSixMwtStage2] = useState('');

  // Stage 3 — Aetiology & Triggers
  const [causes, setCauses] = useState([]);
  const [triggers, setTriggers] = useState([]);

  // Stage 4 — Investigations
  const [bnp, setBnp] = useState('');
  const [ntProBnp, setNtProBnp] = useState('');
  const [echoFindings, setEchoFindings] = useState([]);
  const [sTPA, setSTPA] = useState('');
  const [ivcDiam, setIvcDiam] = useState('');
  const [ecgFindings, setEcgFindings] = useState([]);
  const [sodium, setSodium] = useState('');
  const [potassium, setPotassium] = useState('');
  const [creatinine, setCreatinine] = useState('');
  const [egfr, setEgfr] = useState('');
  const [urea, setUrea] = useState('');
  const [haemoglobin, setHaemoglobin] = useState('');
  const [hba1c, setHba1c] = useState('');
  const [tsh, setTsh] = useState('');
  const [ferritin, setFerritin] = useState('');
  const [tsat, setTsat] = useState('');
  const [cxr, setCxr] = useState([]);
  const [sixMwt, setSixMwt] = useState('');

  // Stage 5 — GDMT
  const [betaBlocker, setBetaBlocker] = useState('');
  const [raasAgent, setRaasAgent] = useState('');
  const [mra, setMra] = useState('');
  const [sglt2i, setSglt2i] = useState('');
  const [deviceTherapy, setDeviceTherapy] = useState([]);
  const [diuretic, setDiuretic] = useState('');
  const [furosemideDose, setFurosemideDose] = useState('');
  const [digoxin, setDigoxin] = useState('');
  const [ivIron, setIvIron] = useState('');

  // Stage 6 — Monitoring & Prognosis
  const [reviewInterval, setReviewInterval] = useState('');
  const [monitorParams, setMonitorParams] = useState([]);
  const [fluidRestriction, setFluidRestriction] = useState('');
  const [sodiumRestriction, setSodiumRestriction] = useState('');
  const [hfNurse, setHfNurse] = useState('');
  const [pmjay, setPmjay] = useState('');
  const [cardiacRehab, setCardiacRehab] = useState('');
  const [palliativeCare, setPalliativeCare] = useState('');

  // ─── Auto-calculations ────────────────────────────────────────────────────
  const efClass = useMemo(() => {
    const v = parseFloat(ef);
    if (isNaN(v)) return null;
    if (v < 40) return { label: 'HFrEF', sub: 'EF <40% — GDMT fully indicated', color: 'bg-red-100 border-red-400 text-red-800' };
    if (v <= 49) return { label: 'HFmrEF', sub: 'EF 40–49% — emerging GDMT evidence', color: 'bg-amber-100 border-amber-400 text-amber-800' };
    return { label: 'HFpEF', sub: 'EF ≥50% — treat comorbidities, diuresis', color: 'bg-blue-100 border-blue-400 text-blue-800' };
  }, [ef]);

  const bnpInterp = useMemo(() => {
    const v = parseFloat(bnp);
    if (isNaN(v)) return null;
    if (v < 35) return { label: 'BNP unlikely HF (<35 pg/mL)', color: 'text-green-700' };
    if (v <= 100) return { label: 'BNP intermediate (35–100 pg/mL)', color: 'text-amber-700' };
    return { label: 'BNP likely HF (>100 pg/mL)', color: 'text-red-700' };
  }, [bnp]);

  const ntProBnpInterp = useMemo(() => {
    const v = parseFloat(ntProBnp);
    if (isNaN(v)) return null;
    if (v < 125) return { label: 'NT-proBNP unlikely HF (<125 pg/mL, age <75)', color: 'text-green-700' };
    return { label: 'NT-proBNP elevated — investigate (≥125 pg/mL)', color: 'text-red-700' };
  }, [ntProBnp]);

  const urgentAlerts = useMemo(() => {
    const alerts = [];
    if (nyha === 'IV') alerts.push('Acute decompensated HF — ICU/HDU. IV diuresis, haemodynamic monitoring');
    if (parseFloat(sbp) < 90) alerts.push('Cardiogenic shock — vasopressors, consider IABP/Impella');
    if (parseFloat(spo2) < 92) alerts.push('Respiratory failure — CPAP/NIV/intubation');
    if (parseFloat(potassium) > 5.5 && (raasAgent || mra)) alerts.push('Hyperkalaemia — hold MRA, reduce ACEi/ARB');
    return alerts;
  }, [nyha, sbp, spo2, potassium, raasAgent, mra]);

  const maggicFlags = useMemo(() => {
    const flags = [];
    if (parseFloat(ef) < 25) flags.push('EF <25%');
    if (['III', 'IV'].includes(nyha)) flags.push('NYHA III–IV');
    if (parseFloat(sbp) < 125) flags.push('SBP <125 mmHg');
    if (ageGroup === '>75') flags.push('Age >70');
    if (causes.includes('DM') || hba1c) flags.push('Diabetes');
    return flags;
  }, [ef, nyha, sbp, ageGroup, causes, hba1c]);

  const ironDeficiency = useMemo(() => {
    const f = parseFloat(ferritin);
    const t = parseFloat(tsat);
    if (isNaN(f)) return null;
    if (f < 100) return true;
    if (f <= 300 && !isNaN(t) && t < 20) return true;
    return false;
  }, [ferritin, tsat]);

  const progress = Math.round(((stage + 1) / STAGES.length) * 100);

  // ─── Save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/assessments', {
        type: 'heart_failure_assessment',
        patientId,
        encounterId,
        data: {
          presentation: { ageGroup, sex, nyha, accAhaStage, hfType, sbp, dbp, hr, spo2, rr, weight, dryWeight, weightGain, symptoms, pillows, signs },
          classification: { ef, efClass: efClass?.label, sixMwtStage2 },
          aetiology: { causes, triggers },
          investigations: { bnp, ntProBnp, echoFindings, sTPA, ivcDiam, ecgFindings, sodium, potassium, creatinine, egfr, urea, haemoglobin, hba1c, tsh, ferritin, tsat, cxr, sixMwt },
          gdmt: { betaBlocker, raasAgent, mra, sglt2i, deviceTherapy, diuretic, furosemideDose, digoxin, ivIron },
          monitoring: { reviewInterval, monitorParams, fluidRestriction, sodiumRestriction, hfNurse, pmjay, cardiacRehab, palliativeCare },
        },
      });
      setSaved(true);
      onSaved?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-8">

      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-700 to-violet-500 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <Heart className="w-8 h-8" />
          <div>
            <h1 className="text-xl font-bold">Heart Failure Assessment</h1>
            <p className="text-purple-200 text-sm">ESC 2021 · ACC/AHA 2022 · Indian Context (RHD, PPCM, PMJAY)</p>
          </div>
        </div>

        {/* Auto-badges */}
        <div className="flex flex-wrap gap-2 mt-3">
          {efClass && (
            <span className={`px-3 py-1 rounded-full border text-xs font-bold ${efClass.color}`}>
              {efClass.label} — {efClass.sub}
            </span>
          )}
          {nyha && (
            <span className="px-3 py-1 rounded-full border border-purple-200 bg-purple-900/40 text-white text-xs font-bold">
              NYHA Class {nyha}
            </span>
          )}
          {bnpInterp && (
            <span className="px-3 py-1 rounded-full border border-white/30 bg-white/20 text-white text-xs font-semibold">
              {bnpInterp.label}
            </span>
          )}
          {ntProBnpInterp && (
            <span className="px-3 py-1 rounded-full border border-white/30 bg-white/20 text-white text-xs font-semibold">
              {ntProBnpInterp.label}
            </span>
          )}
          {ironDeficiency && (
            <span className="px-3 py-1 rounded-full border border-amber-300 bg-amber-400/30 text-white text-xs font-semibold">
              Iron deficiency — IV iron indicated
            </span>
          )}
          {maggicFlags.length >= 3 && (
            <span className="px-3 py-1 rounded-full border border-red-300 bg-red-900/50 text-white text-xs font-bold">
              MAGGIC: High 1-year mortality risk ({maggicFlags.join(', ')})
            </span>
          )}
        </div>

        {/* Urgent alerts */}
        {urgentAlerts.length > 0 && (
          <div className="mt-2 space-y-1">
            {urgentAlerts.map((a, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-1.5 rounded-lg bg-red-900/80 text-white text-xs font-semibold animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{a}
              </div>
            ))}
          </div>
        )}

        {/* Progress */}
        <div className="mt-4 space-y-2">
          <div className="w-full bg-purple-900/40 rounded-full h-2">
            <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex flex-wrap gap-2">
            {STAGES.map((s, i) => (
              <button key={i} type="button" onClick={() => setStage(i)}
                className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all
                  ${stage === i ? 'bg-white text-purple-800 border-white' : 'bg-purple-800/40 border-purple-300/40 text-purple-100 hover:bg-purple-700/50'}`}>
                {i + 1}. {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stage 1: Patient & Presentation ─────────────────────────────── */}
      {stage === 0 && (
        <div className="space-y-4">
          <Section title="Patient & Presentation" applicable={sec.presentation} onApplicable={v => sa('presentation', v)} accent="purple">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FL label="Age group">
                <Pills options={['<40', '40–60', '60–75', '>75']} value={ageGroup} onChange={setAgeGroup} accent="purple" />
              </FL>
              <FL label="Sex">
                <Pills options={['Male', 'Female', 'Other']} value={sex} onChange={setSex} accent="violet" />
              </FL>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FL label="HF Presentation type">
                <Pills options={['New diagnosis', 'Acute decompensation', 'Chronic stable', 'Acute-on-chronic']} value={hfType} onChange={setHfType} accent="purple" />
              </FL>
              <FL label="ACC/AHA Stage">
                <Pills options={['A', 'B', 'C', 'D']} value={accAhaStage} onChange={setAccAhaStage} accent="violet" />
              </FL>
            </div>

            <FL label="NYHA Class" sub="(clinician-selected)">
              <div className="space-y-1">
                <Pills options={['I', 'II', 'III', 'IV']} value={nyha} onChange={setNyha} accent="purple" />
                {nyha === 'I' && <p className="text-xs text-gray-500 mt-1">No symptoms with ordinary activity</p>}
                {nyha === 'II' && <p className="text-xs text-gray-500 mt-1">Slight limitation — comfortable at rest, symptoms with moderate exertion</p>}
                {nyha === 'III' && <p className="text-xs text-amber-700 mt-1">Marked limitation — comfortable at rest, symptoms with minimal exertion</p>}
                {nyha === 'IV' && <p className="text-xs text-red-700 font-semibold mt-1">Symptoms at rest / inability to carry on any activity</p>}
              </div>
            </FL>

            {/* Vitals */}
            <div className="rounded-lg border border-purple-200 bg-purple-50/40 p-3 space-y-3">
              <p className="text-sm font-bold text-purple-800">Vital Signs</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <FL label="SBP" sub="mmHg">
                  <NumInput value={sbp} onChange={setSbp} placeholder="120" unit="mmHg" />
                  {parseFloat(sbp) < 90 && <p className="text-xs text-red-600 font-semibold mt-1">Critical — cardiogenic shock threshold</p>}
                </FL>
                <FL label="DBP" sub="mmHg">
                  <NumInput value={dbp} onChange={setDbp} placeholder="80" unit="mmHg" />
                </FL>
                <FL label="Heart rate" sub="bpm">
                  <NumInput value={hr} onChange={setHr} placeholder="72" unit="bpm" />
                </FL>
                <FL label="SpO₂" sub="%">
                  <NumInput value={spo2} onChange={setSpo2} placeholder="98" unit="%" />
                  {parseFloat(spo2) < 92 && <p className="text-xs text-red-600 font-semibold mt-1">Critical — respiratory failure</p>}
                </FL>
                <FL label="RR" sub="breaths/min">
                  <NumInput value={rr} onChange={setRr} placeholder="16" unit="/min" />
                </FL>
                <FL label="Weight" sub="kg">
                  <NumInput value={weight} onChange={setWeight} placeholder="70" unit="kg" />
                </FL>
                <FL label="Dry weight" sub="kg (target)">
                  <NumInput value={dryWeight} onChange={setDryWeight} placeholder="68" unit="kg" />
                </FL>
                <FL label="Weight gain" sub="kg in last week">
                  <NumInput value={weightGain} onChange={setWeightGain} placeholder="2" unit="kg/wk" />
                  {parseFloat(weightGain) >= 2 && <p className="text-xs text-amber-700 mt-1">≥2 kg/week — fluid overload flag</p>}
                </FL>
              </div>
            </div>

            <FL label="Symptoms" sub="(select all present)">
              <Pills multi options={[
                'Dyspnoea at rest', 'Exertional dyspnoea', 'Orthopnoea', 'PND',
                'Ankle oedema', 'Fatigue', 'Palpitations', 'Presyncope/syncope',
                'Reduced exercise tolerance', 'Abdominal bloating/ascites',
                'Nausea (mesenteric congestion)',
              ]} value={symptoms} onChange={setSymptoms} accent="purple" />
              {symptoms.includes('Orthopnoea') && (
                <FL label="Number of pillows" sub="for orthopnoea">
                  <Pills options={['1', '2', '3', '4+']} value={pillows} onChange={setPillows} accent="violet" />
                </FL>
              )}
            </FL>

            <FL label="Signs" sub="(select all present)">
              <Pills multi options={[
                'Raised JVP', 'S3 gallop', 'Bibasal crackles', 'Pleural effusion',
                'Hepatomegaly', 'Ascites', 'Bilateral ankle/leg oedema',
                'Pulsatile hepatomegaly (TR)', 'Displaced apex beat',
              ]} value={signs} onChange={setSigns} accent="violet" />
            </FL>
          </Section>
        </div>
      )}

      {/* ── Stage 2: Classification ───────────────────────────────────────── */}
      {stage === 1 && (
        <div className="space-y-4">
          <Section title="Classification" applicable={sec.classification} onApplicable={v => sa('classification', v)} accent="violet">

            <FL label="Ejection Fraction (EF)" sub="Echo-derived LVEF %">
              <div className="flex items-center gap-4 flex-wrap">
                <NumInput value={ef} onChange={setEf} placeholder="35" unit="%" min={0} max={100} />
                {efClass && (
                  <span className={`px-3 py-1.5 rounded-full border text-sm font-bold ${efClass.color}`}>
                    {efClass.label} — {efClass.sub}
                  </span>
                )}
              </div>
            </FL>

            <FL label="ACC/AHA Stage">
              <div className="space-y-1">
                <Pills options={['A', 'B', 'C', 'D']} value={accAhaStage} onChange={setAccAhaStage} accent="violet" />
                <div className="text-xs text-gray-500 space-y-0.5 mt-1">
                  <p><b>A</b> — At risk, no structural disease, no symptoms</p>
                  <p><b>B</b> — Structural disease, no symptoms (pre-HF)</p>
                  <p><b>C</b> — Structural disease + current/prior HF symptoms</p>
                  <p><b>D</b> — Refractory HF requiring advanced interventions</p>
                </div>
              </div>
            </FL>

            <FL label="NYHA Functional Class">
              <Pills options={['I', 'II', 'III', 'IV']} value={nyha} onChange={setNyha} accent="violet" />
            </FL>

            <FL label="6-Minute Walk Test (6MWT)" sub="metres">
              <NumInput value={sixMwtStage2} onChange={setSixMwtStage2} placeholder="400" unit="m" />
              {parseFloat(sixMwtStage2) < 300 && sixMwtStage2 && (
                <p className="text-xs text-amber-700 mt-1">Poor functional capacity (&lt;300m) — consider CRT/device assessment</p>
              )}
            </FL>

          </Section>
        </div>
      )}

      {/* ── Stage 3: Aetiology & Triggers ───────────────────────────────── */}
      {stage === 2 && (
        <div className="space-y-4">
          <Section title="Aetiology & Triggers" applicable={sec.aetiology} onApplicable={v => sa('aetiology', v)} accent="rose">

            <FL label="Underlying cause" sub="(select all that apply)">
              <Pills multi options={[
                'Ischaemic cardiomyopathy',
                'Hypertensive heart disease',
                'Rheumatic heart disease',
                'Idiopathic DCM',
                'Alcohol-related',
                'Peripartum cardiomyopathy (PPCM)',
                'Takotsubo',
                'Tachycardia-induced (AF)',
                'Drug-induced (anthracycline)',
                'Drug-induced (trastuzumab)',
                'Cardiac amyloid',
                'Haemochromatosis',
                'Thyroid disease',
                'Viral myocarditis',
                'HIV',
                'Sarcoidosis',
              ]} value={causes} onChange={setCauses} accent="rose" />
              {causes.includes('Rheumatic heart disease') && (
                <p className="text-xs text-amber-700 mt-1">RHD — very prevalent in India, especially younger patients. Screen all household contacts.</p>
              )}
              {causes.includes('Peripartum cardiomyopathy (PPCM)') && (
                <p className="text-xs text-amber-700 mt-1">PPCM — incidence 1:100–500 deliveries in India (higher than West). Bromocriptine may be considered.</p>
              )}
            </FL>

            <FL label="Precipitating triggers" sub="(select all that apply)">
              <Pills multi options={[
                'Non-compliance with medications',
                'Dietary indiscretion (excess salt)',
                'ACS',
                'AF with fast ventricular rate',
                'Infection / sepsis',
                'Anaemia',
                'Renal failure',
                'NSAIDs',
                'Poorly controlled hypertension',
                'New medication',
                'Thyrotoxicosis',
                'Pregnancy',
              ]} value={triggers} onChange={setTriggers} accent="rose" />
              {triggers.includes('NSAIDs') && (
                <p className="text-xs text-red-600 font-semibold mt-1">NSAIDs — widely available OTC in India; cause sodium/water retention and worsen HF. Stop immediately.</p>
              )}
              {triggers.includes('Dietary indiscretion (excess salt)') && (
                <p className="text-xs text-amber-700 mt-1">Salt excess — very common trigger in Indian diet context. Reinforce 2g/day sodium restriction.</p>
              )}
            </FL>

          </Section>
        </div>
      )}

      {/* ── Stage 4: Investigations ──────────────────────────────────────── */}
      {stage === 3 && (
        <div className="space-y-4">
          <Section title="Investigations" applicable={sec.investigations} onApplicable={v => sa('investigations', v)} accent="blue">

            {/* BNP / NT-proBNP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FL label="BNP" sub="pg/mL">
                <NumInput value={bnp} onChange={setBnp} placeholder="80" unit="pg/mL" />
                {bnpInterp && <p className={`text-xs mt-1 font-semibold ${bnpInterp.color}`}>{bnpInterp.label}</p>}
              </FL>
              <FL label="NT-proBNP" sub="pg/mL">
                <NumInput value={ntProBnp} onChange={setNtProBnp} placeholder="200" unit="pg/mL" />
                {ntProBnpInterp && <p className={`text-xs mt-1 font-semibold ${ntProBnpInterp.color}`}>{ntProBnpInterp.label}</p>}
              </FL>
            </div>

            {/* Echocardiography */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-3">
              <p className="text-sm font-bold text-blue-800">Echocardiography</p>
              <FL label="EF (Echo)" sub="%">
                <div className="flex items-center gap-3 flex-wrap">
                  <NumInput value={ef} onChange={setEf} placeholder="35" unit="%" min={0} max={100} />
                  {efClass && <span className={`px-2.5 py-1 rounded-full border text-xs font-bold ${efClass.color}`}>{efClass.label}</span>}
                </div>
              </FL>
              <FL label="Echo findings" sub="(select all present)">
                <Pills multi options={[
                  'LV dilation', 'LV hypertrophy', 'RWMA', 'Diastolic dysfunction Gr I',
                  'Diastolic dysfunction Gr II', 'Diastolic dysfunction Gr III',
                  'Elevated E/e ratio', 'LA dilation', 'RV dysfunction',
                  'Tricuspid regurgitation', 'Pulmonary hypertension', 'Pericardial effusion',
                  'Valve disease',
                ]} value={echoFindings} onChange={setEchoFindings} accent="blue" />
              </FL>
              <div className="grid grid-cols-2 gap-3">
                <FL label="sTPA estimate" sub="mmHg">
                  <NumInput value={sTPA} onChange={setSTPA} placeholder="30" unit="mmHg" />
                  {parseFloat(sTPA) > 40 && <p className="text-xs text-amber-700 mt-1">Pulmonary hypertension — consider right heart catheterisation</p>}
                </FL>
                <FL label="IVC diameter" sub="mm">
                  <NumInput value={ivcDiam} onChange={setIvcDiam} placeholder="18" unit="mm" />
                  {parseFloat(ivcDiam) > 21 && <p className="text-xs text-amber-700 mt-1">Dilated IVC — elevated RAP</p>}
                </FL>
              </div>
            </div>

            {/* ECG */}
            <FL label="ECG findings" sub="(select all present)">
              <Pills multi options={[
                'Sinus rhythm', 'AF', 'LVH', 'LBBB', 'RBBB',
                'Q waves (old MI)', 'PR prolongation', 'QRS >120ms',
              ]} value={ecgFindings} onChange={setEcgFindings} accent="blue" />
              {ecgFindings.includes('LBBB') && ecgFindings.includes('QRS >120ms') && parseFloat(ef) < 35 && (
                <p className="text-xs text-purple-700 font-semibold mt-1">LBBB + QRS &gt;120ms + EF &lt;35% — potential CRT candidate</p>
              )}
            </FL>

            {/* Bloods */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-3">
              <p className="text-sm font-bold text-blue-800">Blood Results</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <FL label="Sodium" sub="mmol/L">
                  <NumInput value={sodium} onChange={setSodium} placeholder="138" unit="mmol/L" />
                  {parseFloat(sodium) < 130 && <p className="text-xs text-red-600 mt-1">Hyponatraemia — poor prognosis marker</p>}
                </FL>
                <FL label="Potassium" sub="mmol/L">
                  <NumInput value={potassium} onChange={setPotassium} placeholder="4.2" unit="mmol/L" />
                  {parseFloat(potassium) > 5.5 && <p className="text-xs text-red-600 font-semibold mt-1">Hyperkalaemia — review MRA/ACEi/ARB</p>}
                  {parseFloat(potassium) < 3.5 && <p className="text-xs text-amber-700 mt-1">Hypokalaemia — arrhythmia risk, replace</p>}
                </FL>
                <FL label="Creatinine" sub="µmol/L">
                  <NumInput value={creatinine} onChange={setCreatinine} placeholder="90" unit="µmol/L" />
                </FL>
                <FL label="eGFR" sub="mL/min/1.73m²">
                  <NumInput value={egfr} onChange={setEgfr} placeholder="60" unit="mL/min" />
                  {parseFloat(egfr) < 30 && <p className="text-xs text-red-600 mt-1">CKD stage 4–5 — cardiorenal syndrome</p>}
                </FL>
                <FL label="Urea" sub="mmol/L">
                  <NumInput value={urea} onChange={setUrea} placeholder="6" unit="mmol/L" />
                </FL>
                <FL label="Haemoglobin" sub="g/dL">
                  <NumInput value={haemoglobin} onChange={setHaemoglobin} placeholder="12" unit="g/dL" />
                  {parseFloat(haemoglobin) < 11 && <p className="text-xs text-amber-700 mt-1">Anaemia — worsens HF symptoms; check iron studies</p>}
                </FL>
                <FL label="HbA1c" sub="%">
                  <NumInput value={hba1c} onChange={setHba1c} placeholder="6.5" unit="%" />
                </FL>
                <FL label="TSH" sub="mIU/L">
                  <NumInput value={tsh} onChange={setTsh} placeholder="2.5" unit="mIU/L" />
                  {(parseFloat(tsh) > 4.5 || parseFloat(tsh) < 0.4) && tsh && (
                    <p className="text-xs text-amber-700 mt-1">Thyroid dysfunction — treatable cause of HF</p>
                  )}
                </FL>
              </div>
            </div>

            {/* Iron studies */}
            <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 space-y-3">
              <p className="text-sm font-bold text-amber-800">Iron Deficiency Studies <span className="font-normal text-amber-600">(very common in India)</span></p>
              <div className="grid grid-cols-2 gap-3">
                <FL label="Serum ferritin" sub="µg/L">
                  <NumInput value={ferritin} onChange={setFerritin} placeholder="80" unit="µg/L" />
                </FL>
                <FL label="Transferrin saturation (Tsat)" sub="%">
                  <NumInput value={tsat} onChange={setTsat} placeholder="18" unit="%" />
                </FL>
              </div>
              {ironDeficiency !== null && (
                <p className={`text-xs font-semibold ${ironDeficiency ? 'text-red-700' : 'text-green-700'}`}>
                  {ironDeficiency
                    ? 'Iron deficiency confirmed — IV ferric carboxymaltose (FerriCarb) indicated'
                    : 'Iron replete — no IV iron indicated at this time'}
                </p>
              )}
            </div>

            {/* CXR */}
            <FL label="Chest X-ray findings" sub="(select all present)">
              <Pills multi options={[
                'Cardiomegaly', 'Upper lobe blood diversion', 'Kerley B lines',
                'Pulmonary oedema', 'Pleural effusion (R>L typical)', 'Normal',
              ]} value={cxr} onChange={setCxr} accent="blue" />
            </FL>

            <FL label="6-Minute Walk Test result" sub="metres">
              <NumInput value={sixMwt} onChange={setSixMwt} placeholder="350" unit="m" />
            </FL>

          </Section>
        </div>
      )}

      {/* ── Stage 5: GDMT ────────────────────────────────────────────────── */}
      {stage === 4 && (
        <div className="space-y-4">
          <Section title="Guideline-Directed Medical Therapy (GDMT)" applicable={sec.gdmt} onApplicable={v => sa('gdmt', v)} accent="green">

            {efClass && (
              <div className={`rounded-lg border px-3 py-2 text-xs font-semibold ${efClass.color}`}>
                <Info className="w-3.5 h-3.5 inline mr-1" />
                {efClass.label}: {efClass.sub}
              </div>
            )}

            {/* Four pillars of HFrEF GDMT */}
            <div className="rounded-lg border border-green-200 bg-green-50/40 p-3 space-y-4">
              <p className="text-sm font-bold text-green-800">HFrEF Four-Pillar GDMT</p>

              <FL label="1. Beta-blocker">
                <Pills options={[
                  'Carvedilol 3.125mg BD', 'Carvedilol 6.25mg BD', 'Carvedilol 12.5mg BD', 'Carvedilol 25mg BD',
                  'Bisoprolol 1.25mg OD', 'Bisoprolol 5mg OD', 'Bisoprolol 10mg OD',
                  'Metoprolol XL 25mg OD', 'Metoprolol XL 100mg OD', 'Metoprolol XL 200mg OD',
                  'Nebivolol 5mg OD', 'Not started',
                ]} value={betaBlocker} onChange={setBetaBlocker} accent="green" />
              </FL>

              <FL label="2. ACEi / ARB / ARNI">
                <Pills options={[
                  'Ramipril 2.5mg OD', 'Ramipril 5mg OD', 'Ramipril 10mg OD',
                  'Enalapril 5mg BD', 'Enalapril 10mg BD',
                  'Losartan 50mg OD', 'Losartan 100mg OD',
                  'Sacubitril/Valsartan 50mg BD', 'Sacubitril/Valsartan 100mg BD', 'Sacubitril/Valsartan 200mg BD',
                  'Vymada (Sun Pharma generic)', 'Not started',
                ]} value={raasAgent} onChange={setRaasAgent} accent="green" />
                {raasAgent?.includes('Sacubitril') && (
                  <p className="text-xs text-green-700 mt-1">ARNI — superior to ACEi for HFrEF. Vymada (Sun Pharma) is more affordable generic in India.</p>
                )}
              </FL>

              <FL label="3. MRA (Mineralocorticoid antagonist)">
                <Pills options={[
                  'Spironolactone 25mg OD', 'Spironolactone 50mg OD',
                  'Eplerenone 25mg OD', 'Eplerenone 50mg OD',
                  'Not started',
                ]} value={mra} onChange={setMra} accent="green" />
                {mra && mra !== 'Not started' && parseFloat(potassium) > 5.0 && (
                  <p className="text-xs text-red-600 font-semibold mt-1">Caution — K⁺ {potassium} mmol/L. Monitor closely; hold if K⁺ &gt;5.5.</p>
                )}
              </FL>

              <FL label="4. SGLT2 inhibitor" sub="(indicated for HFrEF AND HFpEF)">
                <Pills options={[
                  'Dapagliflozin 10mg OD (Forxiga)',
                  'Empagliflozin 10mg OD (Jardiance)',
                  'Not started',
                ]} value={sglt2i} onChange={setSglt2i} accent="green" />
              </FL>
            </div>

            {/* Diuretics */}
            <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-3 space-y-3">
              <p className="text-sm font-bold text-teal-800">Diuretics</p>
              <FL label="Loop diuretic">
                <Pills options={[
                  'Furosemide 20mg OD', 'Furosemide 40mg OD', 'Furosemide 80mg OD',
                  'Furosemide 40mg BD', 'Bumetanide 1mg OD', 'Bumetanide 2mg OD',
                  'Not required',
                ]} value={diuretic} onChange={setDiuretic} accent="teal" />
              </FL>
              <Gate label="Diuretic resistance — add Metolazone?" value={furosemideDose} onChange={setFurosemideDose} accent="teal">
                <FL label="Metolazone dose">
                  <Pills options={['2.5mg OD', '5mg OD', '10mg OD']} value={furosemideDose} onChange={setFurosemideDose} accent="teal" />
                  <p className="text-xs text-amber-700 mt-1">Metolazone — use with caution, monitor electrolytes closely (aggressive natriuresis risk)</p>
                </FL>
              </Gate>
            </div>

            {/* Device therapy */}
            <FL label="Device therapy" sub="(select if indicated)">
              <Pills multi options={[
                'ICD (EF<35% + NYHA II–III + optimal GDMT ≥3 months)',
                'CRT-D (EF<35% + LBBB + QRS>150ms + NYHA III–IV)',
                'CRT-P',
                'None indicated',
              ]} value={deviceTherapy} onChange={setDeviceTherapy} accent="purple" />
              {parseFloat(ef) < 35 && ['III', 'IV'].includes(nyha) && (
                <p className="text-xs text-purple-700 font-semibold mt-1">EF &lt;35% + NYHA III–IV — assess ICD/CRT eligibility after ≥3 months optimal GDMT</p>
              )}
            </FL>

            {/* Digoxin */}
            <FL label="Digoxin" sub="(AF rate control in HFrEF — still widely used in India)">
              <Pills options={[
                'Digoxin 0.0625mg OD', 'Digoxin 0.125mg OD', 'Digoxin 0.25mg OD', 'Not indicated',
              ]} value={digoxin} onChange={setDigoxin} accent="violet" />
            </FL>

            {/* IV Iron */}
            <FL label="IV Iron therapy">
              <Pills options={[
                'IV Ferric carboxymaltose (FerriCarb) — indicated',
                'IV iron not indicated',
                'Deferred pending further investigation',
              ]} value={ivIron} onChange={setIvIron} accent="amber" />
              {ironDeficiency && ivIron !== 'IV Ferric carboxymaltose (FerriCarb) — indicated' && (
                <p className="text-xs text-amber-700 font-semibold mt-1">Iron deficiency detected — IV ferric carboxymaltose indicated (ferritin &lt;100, or ferritin 100–300 + Tsat &lt;20%)</p>
              )}
            </FL>

            {/* HFpEF note */}
            {efClass?.label === 'HFpEF' && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 space-y-1">
                <p className="font-bold">HFpEF management priorities:</p>
                <p>• Treat comorbidities — hypertension, diabetes, AF, obesity</p>
                <p>• SGLT2i (dapagliflozin/empagliflozin) — now indicated for HFpEF</p>
                <p>• Diuretics for decongestion/symptomatic relief</p>
                <p>• No proven mortality benefit for ACEi/ARB/beta-blocker in HFpEF</p>
              </div>
            )}

          </Section>
        </div>
      )}

      {/* ── Stage 6: Monitoring & Prognosis ─────────────────────────────── */}
      {stage === 5 && (
        <div className="space-y-4">
          <Section title="Monitoring & Prognosis" applicable={sec.monitoring} onApplicable={v => sa('monitoring', v)} accent="teal">

            <FL label="Review interval">
              <Pills options={['1 week', '2 weeks', '1 month', '3 months', '6 months']} value={reviewInterval} onChange={setReviewInterval} accent="teal" />
            </FL>

            <FL label="Parameters to monitor" sub="(select all to track)">
              <Pills multi options={[
                'Daily weight', 'BP', 'Heart rate', 'Electrolytes', 'Creatinine/eGFR',
                'BNP trend', 'Fluid balance', 'Symptom diary',
              ]} value={monitorParams} onChange={setMonitorParams} accent="teal" />
            </FL>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FL label="Fluid restriction">
                <Pills options={['1.5L/day (severe HF)', '2L/day', 'No restriction', 'Review at each visit']} value={fluidRestriction} onChange={setFluidRestriction} accent="teal" />
              </FL>
              <FL label="Sodium restriction">
                <Pills options={['<2g/day', '<3g/day', 'Low salt diet education', 'DASH diet']} value={sodiumRestriction} onChange={setSodiumRestriction} accent="teal" />
              </FL>
            </div>

            {/* MAGGIC prognosis flags */}
            {maggicFlags.length > 0 && (
              <div className={`rounded-lg border p-3 space-y-2 ${maggicFlags.length >= 3 ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'}`}>
                <p className={`text-sm font-bold ${maggicFlags.length >= 3 ? 'text-red-800' : 'text-amber-800'}`}>
                  MAGGIC Risk Flags {maggicFlags.length >= 3 ? '— High 1-year mortality risk' : '— Elevated risk'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {maggicFlags.map(f => (
                    <span key={f} className="px-2 py-0.5 rounded-full bg-red-100 border border-red-300 text-red-700 text-xs font-semibold">{f}</span>
                  ))}
                </div>
                <p className="text-xs text-gray-600">Flags: age &gt;70, DM, COPD, non-ischaemic origin, SBP &lt;125, EF &lt;25%, NYHA III–IV</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FL label="HF nurse / ASHA worker follow-up">
                <Pills options={['Yes — arranged', 'Requested', 'Not available', 'N/A']} value={hfNurse} onChange={setHfNurse} accent="teal" />
              </FL>
              <FL label="PMJAY coverage">
                <Pills options={['Enrolled', 'Eligible — enrol', 'Not eligible', 'Unknown']} value={pmjay} onChange={setPmjay} accent="green" />
                {pmjay === 'Eligible — enrol' && (
                  <p className="text-xs text-green-700 mt-1">PMJAY covers HF hospitalisation — facilitate enrolment</p>
                )}
              </FL>
            </div>

            <FL label="Cardiac rehabilitation">
              <Pills options={['Referred', 'Self-supervised exercise plan given', 'Deferred', 'Not appropriate']} value={cardiacRehab} onChange={setCardiacRehab} accent="teal" />
            </FL>

            <FL label="Palliative care discussion" sub="(if NYHA IV or multiple hospitalisations)">
              <Pills options={['Discussed', 'Deferred', 'Family meeting arranged', 'Not yet applicable']} value={palliativeCare} onChange={setPalliativeCare} accent="violet" />
              {(nyha === 'IV' || urgentAlerts.length > 0) && palliativeCare !== 'Discussed' && (
                <p className="text-xs text-purple-700 font-semibold mt-1">NYHA IV / acute decompensation — goals of care discussion recommended</p>
              )}
            </FL>

          </Section>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button type="button" disabled={stage === 0} onClick={() => setStage(s => s - 1)}
          className="px-4 py-2 rounded-lg border border-purple-300 text-purple-700 text-sm font-semibold disabled:opacity-40 hover:bg-purple-50">
          ← Previous
        </button>
        <span className="text-xs text-gray-500">Stage {stage + 1} of {STAGES.length}</span>
        {stage < STAGES.length - 1 ? (
          <button type="button" onClick={() => setStage(s => s + 1)}
            className="px-4 py-2 rounded-lg bg-purple-700 text-white text-sm font-semibold hover:bg-purple-800">
            Next →
          </button>
        ) : (
          <button type="button" onClick={handleSave} disabled={saving || saved}
            className="px-6 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center gap-2 hover:bg-green-700">
            {saved ? <><CheckCircle className="w-4 h-4" />Saved</> : saving ? 'Saving…' : 'Save Assessment'}
          </button>
        )}
      </div>
    </div>
  );
}
