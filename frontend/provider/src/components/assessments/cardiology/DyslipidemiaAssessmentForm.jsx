/**
 * @shared-pool
 * DyslipidemiaAssessmentForm — portal-agnostic cardiology assessment
 * ACC/AHA 2019 · CSI India · ASCVD 10-yr risk tier · LDL targets
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

/* ─── ASCVD 10-yr risk tiers (pooled cohort simplified) ────── */
/*
  We use risk-factor counting + clinical ASCVD as a simplified categorical
  approach (full PCE requires birth-year lookup tables). For algorithmic
  auto-risk, we use the NCEP/AHA categorical method:
  - Very High: clinical ASCVD (MI/stroke/PAD/PCI/CABG)
  - High: LDL ≥190, DM aged 40-75, 10-yr PCE ≥10%
  - Borderline: 7.5–10%
  - Low: <7.5%
*/

/* ─── LDL target table ───────────────────────────────────── */
const LDL_TARGETS = {
  'Very High (Clinical ASCVD)':          { ldl: '<55 mg/dL (1.4 mmol/L)', nonHdl: '<85 mg/dL', intensity: 'High-intensity statin + Ezetimibe ± PCSK9i', esc: 'ESC 2019 very high risk' },
  'High (10-yr ≥10% or DM/FH)':         { ldl: '<70 mg/dL (1.8 mmol/L)', nonHdl: '<100 mg/dL', intensity: 'High-intensity statin ± Ezetimibe', esc: 'ESC 2019 high risk' },
  'Intermediate (10-yr 7.5–10%)':       { ldl: '<100 mg/dL (2.6 mmol/L)', nonHdl: '<130 mg/dL', intensity: 'Moderate-intensity statin', esc: 'ESC 2019 moderate risk' },
  'Low-Moderate (10-yr <7.5%)':         { ldl: '<130 mg/dL (3.4 mmol/L)', nonHdl: '<160 mg/dL', intensity: 'Lifestyle ± low-intensity statin', esc: 'ESC 2019 low risk' },
};

/* ─── main form ─────────────────────────────────────────────── */
export default function DyslipidemiaAssessmentForm({ patientId, encounterId, onSave }) {
  const [saving, setSaving] = useState(false);

  /* Section gates */
  const [appHistory,     setAppHistory]     = useState(null);
  const [appLipids,      setAppLipids]      = useState(null);
  const [appRisk,        setAppRisk]        = useState(null);
  const [appTreatment,   setAppTreatment]   = useState(null);
  const [appMonitoring,  setAppMonitoring]  = useState(null);

  /* ── History ── */
  const [age,             setAge]             = useState('');
  const [sex,             setSex]             = useState(null);
  const [dyslipType,      setDyslipType]      = useState([]);
  const [familyHistory,   setFamilyHistory]   = useState(null);
  const [fhPremature,     setFhPremature]     = useState(null); /* premature ASCVD <55M/<65F */
  const [xanthoma,        setXanthoma]        = useState(null);
  const [cornealArcus,    setCornealArcus]    = useState(null);
  const [clinicalAscvd,   setClinicalAscvd]   = useState(null);
  const [ascvdType,       setAscvdType]       = useState([]);
  const [diabetes,        setDiabetes]        = useState(null);
  const [hypertension,    setHypertension]    = useState(null);
  const [smoking,         setSmoking]         = useState(null);
  const [ckd,             setCkd]             = useState(null);
  const [hypothyroidism,  setHypothyroidism]  = useState(null);
  const [nephrotic,       setNephrotic]       = useState(null);
  const [secondary,       setSecondary]       = useState([]);

  /* ── Lipid panel ── */
  const [totalChol,  setTotalChol]  = useState('');
  const [ldl,        setLdl]        = useState('');
  const [hdl,        setHdl]        = useState('');
  const [tg,         setTg]         = useState('');
  const [nonHdl,     setNonHdl]     = useState('');
  const [lpa,        setLpa]        = useState('');
  const [apoB,       setApoB]       = useState('');
  const [fasting,    setFasting]    = useState(null);

  /* ── Risk ── */
  const [manualRiskTier, setManualRiskTier] = useState(null);
  const [riskEnhancers,  setRiskEnhancers]  = useState([]);

  /* ── Treatment ── */
  const [statinOnBoard,     setStatinOnBoard]     = useState(null);
  const [statinName,        setStatinName]        = useState(null);
  const [statinDose,        setStatinDose]        = useState(null);
  const [statinIntolerance, setStatinIntolerance] = useState(null);
  const [ezetimibe,         setEzetimibe]         = useState(null);
  const [pcsk9i,            setPcsk9i]            = useState(null);
  const [fibrateUsed,       setFibrateUsed]       = useState(null);
  const [omega3,            setOmega3]            = useState(null);
  const [lifestyleAdv,      setLifestyleAdv]      = useState([]);

  /* ── Monitoring ── */
  const [previousLdl,   setPreviousLdl]   = useState('');
  const [lftsChecked,   setLftsChecked]   = useState(null);
  const [ckChecked,     setCkChecked]     = useState(null);
  const [followUpWeeks, setFollowUpWeeks] = useState(null);

  /* ─── computed: auto risk tier ──────────────────────────── */
  const autoRiskTier = useMemo(() => {
    if (clinicalAscvd === 'Yes') return 'Very High (Clinical ASCVD)';
    const ldlNum = Number(ldl);
    if (ldlNum >= 190) return 'Very High (Clinical ASCVD)'; /* FH-range LDL */
    if (diabetes === 'Yes') return 'High (10-yr ≥10% or DM/FH)';
    if (fhPremature === 'Yes') return 'High (10-yr ≥10% or DM/FH)';
    /* risk factor count — simplified without full PCE */
    const rfCount = [hypertension === 'Yes', smoking === 'Yes', ckd === 'Yes',
      (hdl && Number(hdl) < 40)].filter(Boolean).length;
    if (rfCount >= 3) return 'High (10-yr ≥10% or DM/FH)';
    if (rfCount >= 1) return 'Intermediate (10-yr 7.5–10%)';
    return 'Low-Moderate (10-yr <7.5%)';
  }, [clinicalAscvd, ldl, diabetes, fhPremature, hypertension, smoking, ckd, hdl]);

  const effectiveRiskTier = manualRiskTier || autoRiskTier;
  const ldlTarget = LDL_TARGETS[effectiveRiskTier];

  /* ─── computed: LDL at target? ───────────────────────────── */
  const ldlAtTarget = useMemo(() => {
    if (!ldl || !ldlTarget) return null;
    const ldlNum = Number(ldl);
    const targetNum = parseFloat(ldlTarget.ldl);
    return ldlNum <= targetNum;
  }, [ldl, ldlTarget]);

  /* ─── computed: TG interpretation ──────────────────────────── */
  const tgInterp = useMemo(() => {
    const t = Number(tg);
    if (!t) return null;
    if (t < 150) return { label: 'Normal', color: 'text-green-700' };
    if (t < 200) return { label: 'Borderline high', color: 'text-yellow-700' };
    if (t < 500) return { label: 'High — fibrate/omega-3 consider', color: 'text-orange-700' };
    return { label: 'Very High (≥500) — pancreatitis risk! Start fibrate', color: 'text-red-700 font-bold' };
  }, [tg]);

  /* ─── computed: FH Dutch Criteria (simplified) ──────────── */
  const fhFlag = useMemo(() => {
    const ldlNum = Number(ldl);
    let pts = 0;
    if (fhPremature === 'Yes') pts += 2;
    if (xanthoma === 'Yes') pts += 6;
    if (cornealArcus === 'Yes') pts += 4;
    if (ldlNum >= 330) pts += 8;
    else if (ldlNum >= 250) pts += 5;
    else if (ldlNum >= 190) pts += 3;
    else if (ldlNum >= 155) pts += 1;
    if (pts >= 8) return { label: 'FH Definite (≥8 pts)', color: 'bg-red-100 border-red-400 text-red-800' };
    if (pts >= 6) return { label: 'FH Probable (6–7 pts)', color: 'bg-orange-100 border-orange-400 text-orange-800' };
    if (pts >= 3) return { label: 'FH Possible (3–5 pts)', color: 'bg-yellow-100 border-yellow-400 text-yellow-800' };
    return null;
  }, [fhPremature, xanthoma, cornealArcus, ldl]);

  /* ─── LDL reduction needed ───────────────────────────────── */
  const ldlReduction = useMemo(() => {
    if (!ldl || !ldlTarget) return null;
    const current = Number(ldl);
    const target = parseFloat(ldlTarget.ldl);
    if (current <= target) return null;
    const pct = Math.round((1 - target / current) * 100);
    return pct;
  }, [ldl, ldlTarget]);

  /* ─── save ────────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        type: 'dyslipidemia', patientId, encounterId,
        history: { age, sex, dyslipType, familyHistory, fhPremature, xanthoma, cornealArcus, clinicalAscvd, ascvdType, diabetes, hypertension, smoking, ckd, hypothyroidism, nephrotic, secondary },
        lipids: { totalChol, ldl, hdl, tg, nonHdl, lpa, apoB, fasting },
        risk: { autoRiskTier, manualRiskTier, effectiveRiskTier, riskEnhancers },
        ldlTarget: ldlTarget,
        treatment: { statinOnBoard, statinName, statinDose, statinIntolerance, ezetimibe, pcsk9i, fibrateUsed, omega3, lifestyleAdv },
        monitoring: { previousLdl, lftsChecked, ckChecked, followUpWeeks },
        computed: { fhFlag: fhFlag?.label, ldlAtTarget, ldlReductionNeeded: ldlReduction, tgInterp: tgInterp?.label },
      };
      await api.post('/assessments', payload);
      onSave?.();
    } finally {
      setSaving(false);
    }
  };

  const tgCritical = Number(tg) >= 500;

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-10">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h2 className="text-xl font-bold">Dyslipidaemia Assessment</h2>
        </div>
        <p className="text-sm text-amber-100">ACC/AHA 2019 · CSI India · ESC 2019 · NCEP ATP-III</p>
        {tgCritical && (
          <div className="mt-3 bg-red-600 rounded-lg px-4 py-2 text-sm font-semibold animate-pulse">
            ⚠ TG ≥500 mg/dL — Pancreatitis risk! Start fibrate immediately
          </div>
        )}
        {fhFlag && (
          <div className={`mt-2 rounded-lg px-4 py-2 text-sm font-semibold border ${fhFlag.color}`}>
            Dutch Criteria: {fhFlag.label} — cascade family screening
          </div>
        )}
        {ldlTarget && (
          <div className="mt-2 bg-white/20 rounded-lg px-4 py-2 text-sm">
            <span className="font-semibold">Risk: {effectiveRiskTier}</span>
            <span className="ml-2 text-amber-100">LDL target: {ldlTarget.ldl}</span>
            {ldlReduction && <span className="ml-2 text-amber-200">({ldlReduction}% reduction needed)</span>}
          </div>
        )}
        {ldlAtTarget === true && (
          <div className="mt-2 bg-green-600 rounded-lg px-4 py-2 text-sm font-semibold">✓ LDL at target</div>
        )}
      </div>

      {/* Section 1 — History & Risk Factors */}
      <Section title="1. History & Risk Factors" applicable={appHistory} onApplicable={setAppHistory} color="amber">
        <div className="grid grid-cols-2 gap-3">
          <FL label="Age" sub="years">
            <input type="number" value={age} onChange={e => setAge(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent" placeholder="e.g. 52" />
          </FL>
          <FL label="Sex">
            <Pills options={['Male','Female']} value={sex} onChange={setSex} color="amber" />
          </FL>
        </div>
        <FL label="Type of dyslipidaemia">
          <Pills options={['Isolated high LDL','Isolated high TG','Mixed (high LDL + TG)','Low HDL','Secondary dyslipidaemia','Familial Hypercholesterolaemia (FH)']} value={dyslipType} onChange={setDyslipType} multi color="amber" />
        </FL>
        <Gate label="Clinical ASCVD (prior MI, stroke, PCI/CABG, PAD)?" value={clinicalAscvd} onChange={setClinicalAscvd} color="amber">
          <FL label="Type of ASCVD event">
            <Pills options={['MI','Ischaemic stroke/TIA','PCI/CABG','PAD','ACS within 12 months','Multiple events']} value={ascvdType} onChange={setAscvdType} multi color="amber" />
          </FL>
        </Gate>
        <FL label="Diabetes mellitus">
          <Pills options={['Yes','No']} value={diabetes} onChange={setDiabetes} color="amber" />
        </FL>
        <FL label="Hypertension">
          <Pills options={['Yes','No']} value={hypertension} onChange={setHypertension} color="amber" />
        </FL>
        <FL label="Smoking status">
          <Pills options={['Current smoker','Ex-smoker','Never']} value={smoking} onChange={setSmoking} color="amber" />
        </FL>
        <FL label="CKD (eGFR <60)">
          <Pills options={['Yes','No']} value={ckd} onChange={setCkd} color="amber" />
        </FL>
        <Gate label="Family history of premature ASCVD? (1st degree <55M / <65F)" value={familyHistory} onChange={setFamilyHistory} color="amber">
          <FL label="Premature ASCVD confirmed in 1st-degree relative?">
            <Pills options={['Yes','No']} value={fhPremature} onChange={setFhPremature} color="amber" />
          </FL>
          <FL label="Xanthoma / tendon xanthoma?">
            <Pills options={['Yes','No']} value={xanthoma} onChange={setXanthoma} color="amber" />
          </FL>
          <FL label="Corneal arcus before age 45?">
            <Pills options={['Yes','No']} value={cornealArcus} onChange={setCornealArcus} color="amber" />
          </FL>
        </Gate>
        <FL label="Secondary causes">
          <Pills options={['Hypothyroidism','Nephrotic syndrome','Chronic liver disease','Obesity/metabolic syndrome','Medications (steroids/antipsychotics/HIV Rx)','Alcohol excess','None identified']} value={secondary} onChange={setSecondary} multi color="amber" />
        </FL>
      </Section>

      {/* Section 2 — Lipid Panel */}
      <Section title="2. Lipid Panel" applicable={appLipids} onApplicable={setAppLipids} color="orange">
        <FL label="Fasting sample?">
          <Pills options={['Yes (fasting ≥8h)','No (random)']} value={fasting} onChange={setFasting} color="orange" />
        </FL>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FL label="Total cholesterol" sub="mg/dL">
            <input type="number" step="1" value={totalChol} onChange={e => setTotalChol(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400" placeholder="e.g. 260" />
          </FL>
          <FL label="LDL-C" sub="mg/dL">
            <input type="number" step="1" value={ldl} onChange={e => setLdl(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400" placeholder="e.g. 160" />
          </FL>
          <FL label="HDL-C" sub="mg/dL">
            <input type="number" step="1" value={hdl} onChange={e => setHdl(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400" placeholder="e.g. 38" />
          </FL>
          <FL label="Triglycerides" sub="mg/dL">
            <input type="number" step="1" value={tg} onChange={e => setTg(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400" placeholder="e.g. 220" />
          </FL>
        </div>
        {tgInterp && (
          <p className={`text-sm font-medium ${tgInterp.color}`}>TG: {tgInterp.label}</p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <FL label="Non-HDL-C" sub="mg/dL">
            <input type="number" step="1" value={nonHdl} onChange={e => setNonHdl(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400" placeholder="e.g. 192" />
          </FL>
          <FL label="Lp(a)" sub="mg/dL (optional)">
            <input type="number" step="1" value={lpa} onChange={e => setLpa(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400" placeholder="e.g. 85" />
          </FL>
          <FL label="ApoB" sub="mg/dL (optional)">
            <input type="number" step="1" value={apoB} onChange={e => setApoB(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400" placeholder="e.g. 120" />
          </FL>
        </div>
        {Number(lpa) >= 50 && (
          <p className="text-sm text-orange-700 font-medium">Lp(a) ≥50 mg/dL — independent risk enhancer; consider reclassifying to higher risk tier</p>
        )}
      </Section>

      {/* Section 3 — ASCVD Risk */}
      <Section title="3. ASCVD Risk Classification" applicable={appRisk} onApplicable={setAppRisk} color="rose">
        <div className="rounded-lg bg-white border border-rose-200 p-4 space-y-2">
          <p className="text-sm font-semibold text-rose-800">Auto-classified risk tier</p>
          <div className={`rounded-lg px-4 py-2 text-sm font-semibold border ${
            autoRiskTier.startsWith('Very') ? 'bg-red-100 border-red-400 text-red-800' :
            autoRiskTier.startsWith('High') ? 'bg-orange-100 border-orange-400 text-orange-800' :
            autoRiskTier.startsWith('Inter') ? 'bg-yellow-100 border-yellow-400 text-yellow-800' :
            'bg-green-100 border-green-400 text-green-800'}`}>
            {autoRiskTier}
          </div>
          <p className="text-xs text-gray-500">Override below if clinical judgement differs</p>
        </div>
        <FL label="Risk enhancers present">
          <Pills options={['Metabolic syndrome','hsCRP ≥2 mg/L','Lp(a) ≥50 mg/dL','ABI <0.9','Subclinical atherosclerosis (CIMT/CT calcium)','Inflammatory disease (RA/psoriasis/SLE)','South Asian ethnicity (×1.5 risk)']} value={riskEnhancers} onChange={setRiskEnhancers} multi color="rose" />
        </FL>
        <FL label="Override risk tier (optional)">
          <Pills options={Object.keys(LDL_TARGETS)} value={manualRiskTier} onChange={setManualRiskTier} color="rose" />
        </FL>
        {ldlTarget && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 space-y-1">
            <p className="text-sm font-semibold text-rose-900">Treatment targets — {effectiveRiskTier}</p>
            <p className="text-sm text-rose-800">LDL target: <span className="font-bold">{ldlTarget.ldl}</span></p>
            <p className="text-sm text-rose-800">Non-HDL target: <span className="font-bold">{ldlTarget.nonHdl}</span></p>
            <p className="text-sm text-rose-700">Statin intensity: {ldlTarget.intensity}</p>
            <p className="text-xs text-rose-600">{ldlTarget.esc}</p>
          </div>
        )}
      </Section>

      {/* Section 4 — Treatment */}
      <Section title="4. Treatment Plan" applicable={appTreatment} onApplicable={setAppTreatment} color="violet">
        <Gate label="Statin currently prescribed?" value={statinOnBoard} onChange={setStatinOnBoard} color="violet">
          <FL label="Statin">
            <Pills options={['Atorvastatin','Rosuvastatin','Pitavastatin','Simvastatin','Pravastatin']} value={statinName} onChange={setStatinName} color="violet" />
          </FL>
          <FL label="Dose">
            <Pills options={['Low (e.g. Atorva 10 / Rosuva 5)','Moderate (e.g. Atorva 20–40 / Rosuva 10)','High (e.g. Atorva 80 / Rosuva 20–40)']} value={statinDose} onChange={setStatinDose} color="violet" />
          </FL>
        </Gate>
        <FL label="Statin intolerance?">
          <Pills options={['None','Myalgia (tolerable)','Myalgia (dose-limiting)','CK elevation >10×ULN','Rhabdomyolysis (stop statin)','Liver enzyme >3×ULN']} value={statinIntolerance} onChange={setStatinIntolerance} color="violet" />
        </FL>
        <FL label="Ezetimibe 10 mg?">
          <Pills options={['Yes (add-on)','Yes (monotherapy — statin intolerant)','No','Considering']} value={ezetimibe} onChange={setEzetimibe} color="violet" />
        </FL>
        <FL label="PCSK9 inhibitor?">
          <Pills options={['Evolocumab (Repatha)','Alirocumab (Praluent)','Inclisiran','Not indicated','Cost barrier']} value={pcsk9i} onChange={setPcsk9i} color="violet" />
        </FL>
        <FL label="Fibrate (high TG)">
          <Pills options={['Fenofibrate 145 mg','Fenofibrate 67 mg','Gemfibrozil','Not needed']} value={fibrateUsed} onChange={setFibrateUsed} color="violet" />
        </FL>
        <FL label="Omega-3 (high TG)">
          <Pills options={['Yes — icosapentaenoic acid (IPE)','Yes — EPA+DHA','No']} value={omega3} onChange={setOmega3} color="violet" />
        </FL>
        <FL label="Lifestyle advice given" sub="multi-select">
          <Pills options={['Reduce saturated fat (<7% calories)','No trans fat','Increase soluble fibre (oats, dal)','Mediterranean diet counselled','Reduce refined carbs/sugar','Alcohol moderation','Aerobic exercise 150 min/week','Weight reduction target','Quit smoking counselled']} value={lifestyleAdv} onChange={setLifestyleAdv} multi color="violet" />
        </FL>
        <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-xs text-violet-800">
          Indian context: Generic Atorvastatin and Rosuvastatin available under NLEM / PM-JAY. Pitavastatin preferred in metabolic syndrome (less diabetogenic). PCSK9i cost barrier — Evolocumab ~₹8,000/month.
        </div>
      </Section>

      {/* Section 5 — Monitoring */}
      <Section title="5. Monitoring & Response Assessment" applicable={appMonitoring} onApplicable={setAppMonitoring} color="sky">
        <FL label="Previous LDL on treatment" sub="mg/dL">
          <input type="number" step="1" value={previousLdl} onChange={e => setPreviousLdl(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-sky-400" placeholder="e.g. 130" />
        </FL>
        {previousLdl && ldl && (
          <div className={`rounded-lg px-4 py-2 text-sm font-semibold border ${Number(ldl) < Number(previousLdl) ? 'bg-green-100 border-green-400 text-green-800' : 'bg-red-100 border-red-400 text-red-800'}`}>
            {Number(ldl) < Number(previousLdl)
              ? `LDL reduced by ${Math.round((1 - Number(ldl)/Number(previousLdl))*100)}% on current therapy`
              : 'LDL has not improved — review adherence, up-titrate, or add ezetimibe'}
          </div>
        )}
        <FL label="LFTs checked since statin start?">
          <Pills options={['Yes — normal','Yes — mildly elevated (<3×ULN)','Yes — elevated (>3×ULN — stop statin)','Not done']} value={lftsChecked} onChange={setLftsChecked} color="sky" />
        </FL>
        <FL label="CK checked?">
          <Pills options={['Yes — normal','Yes — elevated (10×ULN — stop statin)','Not done']} value={ckChecked} onChange={setCkChecked} color="sky" />
        </FL>
        <FL label="Next lipid panel at">
          <Pills options={['4–6 weeks (after initiation/change)','3 months','6 months','12 months']} value={followUpWeeks} onChange={setFollowUpWeeks} color="sky" />
        </FL>
      </Section>

      {/* Save */}
      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold shadow hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 transition-all">
        {saving ? 'Saving…' : 'Save Dyslipidaemia Assessment'}
      </button>
    </div>
  );
}
