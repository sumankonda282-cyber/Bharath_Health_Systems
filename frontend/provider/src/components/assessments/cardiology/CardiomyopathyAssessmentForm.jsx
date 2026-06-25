/** @shared-pool CardiomyopathyAssessmentForm — portal-agnostic */

import React, { useState, useMemo } from 'react';
import api from '../../../api/client';

// ---------------------------------------------------------------------------
// Color palette map
// ---------------------------------------------------------------------------
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
  red: {
    bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-800',
    pill: 'bg-white border-red-300 text-red-700 hover:bg-red-50',
    active: 'bg-red-600 border-red-600 text-white',
  },
};

// ---------------------------------------------------------------------------
// Pills — single/multi-select pill buttons
// ---------------------------------------------------------------------------
function Pills({ options, value, onChange, color = 'purple', multi = false }) {
  const c = A[color] || A.purple;
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
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-3 py-1 rounded-full border text-sm font-medium transition-colors ${
              active ? c.active : c.pill
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FL — field label with optional sub-label
// ---------------------------------------------------------------------------
function FL({ label, sub, children }) {
  return (
    <div className="mb-4">
      <div className="mb-1">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        {sub && <span className="ml-2 text-xs text-gray-500">{sub}</span>}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gate — yes/no binary toggle that expands children when Yes
// ---------------------------------------------------------------------------
function Gate({ label, value, onChange, children, alertText, color = 'purple' }) {
  const c = A[color] || A.purple;
  return (
    <div className="mb-3">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <div className="flex gap-1">
          {['Yes', 'No'].map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(value === opt ? '' : opt)}
              className={`px-3 py-1 rounded-full border text-sm font-medium transition-colors ${
                value === opt
                  ? opt === 'Yes'
                    ? 'bg-purple-700 border-purple-700 text-white'
                    : 'bg-gray-500 border-gray-500 text-white'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
      {value === 'Yes' && alertText && (
        <div className="mb-2 px-3 py-2 bg-red-50 border border-red-300 rounded text-red-800 text-xs font-medium">
          ⚠️ {alertText}
        </div>
      )}
      {value === 'Yes' && children && (
        <div className="pl-4 border-l-2 border-purple-300">{children}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section — section with applicable gate (collapses when Not Applicable)
// ---------------------------------------------------------------------------
function Section({ title, icon, applicable, onApplicable, children, accent = 'purple' }) {
  const c = A[accent] || A.purple;
  return (
    <div className={`mb-6 rounded-xl border ${c.border} ${c.bg} overflow-hidden`}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white/60">
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <span className={`font-bold text-base ${c.text}`}>{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Applicable?</span>
          {['Yes', 'No'].map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onApplicable(applicable === opt ? '' : opt)}
              className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                applicable === opt
                  ? opt === 'Yes'
                    ? 'bg-purple-700 border-purple-700 text-white'
                    : 'bg-gray-400 border-gray-400 text-white'
                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
      {applicable === 'No' ? (
        <div className="flex items-center gap-2 px-5 py-4 text-gray-400 text-sm">
          <span className="text-xl">🔒</span>
          <span>Not applicable — section locked</span>
        </div>
      ) : applicable === 'Yes' ? (
        <div className="px-5 py-4">{children}</div>
      ) : (
        <div className="px-5 py-4 text-gray-400 text-sm italic">
          Set "Applicable?" above to expand this section.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NumInput — numeric input helper
// ---------------------------------------------------------------------------
function NumInput({ value, onChange, placeholder, unit, min, max }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
      />
      {unit && <span className="text-xs text-gray-500 font-medium">{unit}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function CardiomyopathyAssessmentForm({ patientId, encounterId, onSaved }) {

  // Section applicable gates
  const [sec1, setSec1] = useState('');
  const [sec2, setSec2] = useState('');
  const [sec3, setSec3] = useState('');
  const [sec4, setSec4] = useState('');
  const [sec5, setSec5] = useState('');
  const [sec6, setSec6] = useState('');

  // Section 1 — Classification & Type
  const [cmpType, setCmpType] = useState('');
  const [onset, setOnset] = useState('');
  const [familyHxCmp, setFamilyHxCmp] = useState('');
  const [familyRelative, setFamilyRelative] = useState([]);

  // Section 2 — Symptoms & Functional Status
  const [nyha, setNyha] = useState('');
  const [symptoms, setSymptoms] = useState([]);
  const [syncopeGate, setSyncopeGate] = useState('');
  const [exertionalSyncope, setExertionalSyncope] = useState('');
  const [prevArrest, setPrevArrest] = useState('');

  // Section 3 — Echo & Investigations
  const [ef, setEf] = useState('');
  const [wallMotion, setWallMotion] = useState('');
  const [septalThickness, setSeptalThickness] = useState('');
  const [posteriorWall, setPosteriorWall] = useState('');
  const [lvedd, setLvedd] = useState('');
  const [lvesd, setLvesd] = useState('');
  const [lvotGrad, setLvotGrad] = useState('');
  const [rvFunction, setRvFunction] = useState('');
  const [cmrDone, setCmrDone] = useState('');
  const [lgePatt, setLgePatt] = useState('');

  // Section 4 — HCM SCD Risk
  const [hcmAge, setHcmAge] = useState('');
  const [laSize, setLaSize] = useState('');
  const [fhScd, setFhScd] = useState('');
  const [nsvt, setNsvt] = useState('');
  const [hcmSyncope, setHcmSyncope] = useState('');

  // Section 5 — Aetiology & Triggers
  const [secondaryCause, setSecondaryCause] = useState('');
  const [causePills, setCausePills] = useState([]);
  const [geneticTest, setGeneticTest] = useState('');
  const [geneticResult, setGeneticResult] = useState('');

  // Section 6 — Management & Devices
  const [betaBlocker, setBetaBlocker] = useState('');
  const [raas, setRaas] = useState('');
  const [mra, setMra] = useState('');
  const [sglt2i, setSglt2i] = useState('');
  const [disopyramide, setDisopyramide] = useState('');
  const [mavacamten, setMavacamten] = useState('');
  const [icd, setIcd] = useState('');
  const [crt, setCrt] = useState('');
  const [septalIntervention, setSeptalIntervention] = useState('');
  const [transplant, setTransplant] = useState('');
  const [followUp, setFollowUp] = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // ---------------------------------------------------------------------------
  // Auto-computations
  // ---------------------------------------------------------------------------

  // EF classification
  const efClass = useMemo(() => {
    const v = Number(ef);
    if (!ef || isNaN(v)) return null;
    if (v < 40) return { label: 'HFrEF (<40%)', color: 'bg-red-100 border-red-400 text-red-800' };
    if (v < 50) return { label: 'HFmrEF (40–49%)', color: 'bg-orange-100 border-orange-400 text-orange-800' };
    return { label: 'HFpEF (≥50%)', color: 'bg-green-100 border-green-400 text-green-800' };
  }, [ef]);

  // LVOTO flag
  const lvotoFlag = useMemo(() => Number(lvotGrad) >= 30, [lvotGrad]);
  const sevLvoto = useMemo(() => Number(lvotGrad) >= 50, [lvotGrad]);

  // Amyloidosis flag
  const amyloidFlag = useMemo(() => {
    const infiltrative = cmpType === 'Infiltrative (Amyloid/Sarcoid)';
    const cmrPatt = lgePatt === 'Patchy/diffuse (amyloid)';
    const thickSeptum = Number(septalThickness) >= 15;
    return infiltrative && (cmrPatt || thickSeptum);
  }, [cmpType, lgePatt, septalThickness]);

  // HCM Risk-SCD 5-year risk
  const maxWall = septalThickness; // reuse septal thickness as max wall thickness proxy
  const hcmRisk5yr = useMemo(() => {
    // ESC HCM Risk-SCD: simplified categorical
    const riskFactors = [
      fhScd === 'Yes',
      nsvt === 'Yes',
      hcmSyncope === 'Yes',
      Number(maxWall) >= 30,
      Number(laSize) >= 45,
      Number(lvotGrad) >= 30,
    ].filter(Boolean).length;
    if (riskFactors >= 3) return { label: 'High ≥6%/5yr — ICD recommended', color: 'bg-red-100 border-red-400 text-red-800', icd: true };
    if (riskFactors >= 2) return { label: 'Intermediate 4–6%/5yr — ICD may be considered', color: 'bg-orange-100 border-orange-400 text-orange-800', icd: false };
    return { label: 'Low <4%/5yr — ICD not routinely indicated', color: 'bg-green-100 border-green-400 text-green-800', icd: false };
  }, [fhScd, nsvt, hcmSyncope, maxWall, laSize, lvotGrad]);

  // Urgent alert flag
  const urgentAlert = useMemo(() => {
    return (
      prevArrest === 'Yes' ||
      (exertionalSyncope === 'Yes' && cmpType === 'HCM (Hypertrophic)') ||
      sevLvoto
    );
  }, [prevArrest, exertionalSyncope, cmpType, sevLvoto]);

  // ---------------------------------------------------------------------------
  // Save handler
  // ---------------------------------------------------------------------------
  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    const payload = {
      patientId,
      encounterId,
      formType: 'CardiomyopathyAssessment',
      // Section 1
      cmpType, onset, familyHxCmp, familyRelative,
      // Section 2
      nyha, symptoms, syncopeGate, exertionalSyncope, prevArrest,
      // Section 3
      ef, wallMotion, septalThickness, posteriorWall, lvedd, lvesd,
      lvotGrad, rvFunction, cmrDone, lgePatt,
      // Section 4
      hcmAge, laSize, fhScd, nsvt, hcmSyncope,
      // Section 5
      secondaryCause, causePills, geneticTest, geneticResult,
      // Section 6
      betaBlocker, raas, mra, sglt2i, disopyramide, mavacamten,
      icd, crt, septalIntervention, transplant, followUp,
      // Computed
      efClassLabel: efClass?.label || null,
      lvotoFlag,
      sevLvoto,
      amyloidFlag,
      hcmRisk5yrLabel: cmpType === 'HCM (Hypertrophic)' ? hcmRisk5yr.label : null,
      urgentAlert,
      recordedAt: new Date().toISOString(),
    };
    try {
      await api.post('/assessments', payload);
      setSaved(true);
      if (onSaved) onSaved(payload);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto pb-12">

      {/* ---- Header ---- */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-700 via-violet-700 to-purple-900 text-white px-6 py-5 mb-6 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Cardiomyopathy Assessment</h1>
            <p className="text-purple-200 text-sm mt-0.5">
              ESC 2023 · ACC/AHA 2024 · HCM Risk-SCD · Indian context
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {efClass && (
              <span className={`px-3 py-1 rounded-full border text-xs font-bold ${efClass.color}`}>
                {efClass.label}
              </span>
            )}
            {cmpType === 'HCM (Hypertrophic)' && (
              <span className={`px-3 py-1 rounded-full border text-xs font-bold ${hcmRisk5yr.color}`}>
                HCM SCD: {hcmRisk5yr.label}
              </span>
            )}
          </div>
        </div>
        {urgentAlert && (
          <div className="mt-3 px-4 py-2 bg-red-500/90 rounded-lg flex items-center gap-2 animate-pulse">
            <span className="text-lg">🚨</span>
            <span className="text-white text-sm font-bold">
              URGENT — High SCD risk indicator present. Immediate cardiology review required.
            </span>
          </div>
        )}
        <div className="mt-3 px-3 py-2 bg-white/10 rounded-lg text-purple-100 text-xs">
          <span className="font-semibold">Indian context:</span> PPCM prevalent in India (higher parity). Alcohol CMP — local spirits (toddy, arrack). Mavacamten not yet widely available in India.
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 1 — Classification & Type                                  */}
      {/* ------------------------------------------------------------------ */}
      <Section
        title="Section 1 — Classification & Type"
        icon="🫀"
        applicable={sec1}
        onApplicable={setSec1}
        accent="purple"
      >
        <FL label="Cardiomyopathy Type" sub="single-select">
          <Pills
            options={[
              'DCM (Dilated)',
              'HCM (Hypertrophic)',
              'ARVC (Arrhythmogenic RV)',
              'Restrictive',
              'Takotsubo',
              'PPCM (Peripartum)',
              'Alcoholic',
              'Chemotherapy-induced',
              'Infiltrative (Amyloid/Sarcoid)',
            ]}
            value={cmpType}
            onChange={setCmpType}
            color="purple"
          />
        </FL>

        <FL label="Onset">
          <Pills
            options={['Acute', 'Subacute', 'Chronic']}
            value={onset}
            onChange={setOnset}
            color="violet"
          />
        </FL>

        <Gate
          label="Family history of CMP or sudden cardiac death (SCD)?"
          value={familyHxCmp}
          onChange={setFamilyHxCmp}
        >
          <FL label="Affected relative(s)" sub="multi-select">
            <Pills
              options={['Father', 'Mother', 'Sibling', 'Child', 'Multiple']}
              value={familyRelative}
              onChange={setFamilyRelative}
              color="rose"
              multi
            />
          </FL>
        </Gate>
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2 — Symptoms & Functional Status                           */}
      {/* ------------------------------------------------------------------ */}
      <Section
        title="Section 2 — Symptoms & Functional Status"
        icon="🫁"
        applicable={sec2}
        onApplicable={setSec2}
        accent="violet"
      >
        <FL label="NYHA Functional Class">
          <Pills
            options={['I', 'II', 'III', 'IV']}
            value={nyha}
            onChange={setNyha}
            color="violet"
          />
        </FL>

        <FL label="Symptoms" sub="multi-select — all that apply">
          <Pills
            options={[
              'Dyspnoea',
              'Orthopnoea',
              'PND',
              'Syncope',
              'Palpitations',
              'Angina',
              'Oedema',
              'Fatigue',
              'Pre-syncope',
            ]}
            value={symptoms}
            onChange={setSymptoms}
            color="blue"
            multi
          />
        </FL>

        <Gate
          label="Syncope episodes?"
          value={syncopeGate}
          onChange={setSyncopeGate}
        >
          <Gate
            label="Exertional syncope?"
            value={exertionalSyncope}
            onChange={setExertionalSyncope}
            alertText="Exertional syncope in HCM — high SCD risk. Urgent specialist evaluation required."
          />
        </Gate>

        <FL label="Previous cardiac arrest">
          <Pills
            options={['Yes', 'No']}
            value={prevArrest}
            onChange={setPrevArrest}
            color={prevArrest === 'Yes' ? 'red' : 'purple'}
          />
          {prevArrest === 'Yes' && (
            <div className="mt-2 px-3 py-2 bg-red-50 border border-red-300 rounded text-red-800 text-xs font-medium">
              ⚠️ Prior cardiac arrest — ICD implantation strongly indicated (secondary prevention).
            </div>
          )}
        </FL>
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 3 — Echo & Investigations                                  */}
      {/* ------------------------------------------------------------------ */}
      <Section
        title="Section 3 — Echo & Investigations"
        icon="📊"
        applicable={sec3}
        onApplicable={setSec3}
        accent="blue"
      >
        <div className="grid grid-cols-2 gap-4 mb-4">
          <FL label="Left ventricular EF" sub="biplane Simpson's">
            <NumInput value={ef} onChange={setEf} placeholder="e.g. 35" unit="%" min={5} max={85} />
            {efClass && (
              <span className={`mt-1 inline-block px-2 py-0.5 rounded-full border text-xs font-bold ${efClass.color}`}>
                {efClass.label}
              </span>
            )}
          </FL>

          <FL label="Septal / Max Wall Thickness">
            <NumInput value={septalThickness} onChange={setSeptalThickness} placeholder="e.g. 15" unit="mm" min={4} max={50} />
          </FL>

          <FL label="Posterior Wall Thickness">
            <NumInput value={posteriorWall} onChange={setPosteriorWall} placeholder="e.g. 11" unit="mm" min={4} max={40} />
          </FL>

          <FL label="LVEDD">
            <NumInput value={lvedd} onChange={setLvedd} placeholder="e.g. 60" unit="mm" min={20} max={100} />
          </FL>

          <FL label="LVESD">
            <NumInput value={lvesd} onChange={setLvesd} placeholder="e.g. 45" unit="mm" min={15} max={90} />
          </FL>

          <FL label="LV Outflow Tract Gradient">
            <NumInput value={lvotGrad} onChange={setLvotGrad} placeholder="e.g. 35" unit="mmHg" min={0} max={200} />
            {lvotoFlag && !sevLvoto && (
              <span className="mt-1 inline-block px-2 py-0.5 rounded-full border text-xs font-bold bg-orange-100 border-orange-400 text-orange-800">
                Significant LVOTO (≥30 mmHg)
              </span>
            )}
            {sevLvoto && (
              <span className="mt-1 inline-block px-2 py-0.5 rounded-full border text-xs font-bold bg-red-100 border-red-400 text-red-800">
                Severe LVOTO (≥50 mmHg) — urgent intervention threshold
              </span>
            )}
          </FL>
        </div>

        <FL label="Wall Motion Pattern">
          <Pills
            options={[
              'Normal',
              'Segmental (ischaemic pattern)',
              'Global hypokinesis',
              'Paradoxical septal motion',
            ]}
            value={wallMotion}
            onChange={setWallMotion}
            color="blue"
          />
        </FL>

        <FL label="Right Ventricular Function">
          <Pills
            options={['Normal', 'Mildly impaired', 'Severely impaired']}
            value={rvFunction}
            onChange={setRvFunction}
            color="teal"
          />
        </FL>

        <Gate
          label="Cardiac MRI (CMR) performed?"
          value={cmrDone}
          onChange={setCmrDone}
        >
          <FL label="Fibrosis / LGE Pattern" sub="late gadolinium enhancement">
            <Pills
              options={[
                'None',
                'Midwall',
                'Subendocardial',
                'Patchy/diffuse (amyloid)',
                'ARVC pattern',
              ]}
              value={lgePatt}
              onChange={setLgePatt}
              color="violet"
            />
          </FL>
        </Gate>

        {amyloidFlag && (
          <div className="mt-3 px-4 py-3 bg-amber-50 border border-amber-400 rounded-lg text-amber-800 text-sm font-medium">
            ⚠️ <span className="font-bold">Consider ATTR/AL amyloid workup:</span> serum/urine protein electrophoresis, bone scintigraphy (DPD/PYP scan), serum free light chains, fat pad biopsy.
          </div>
        )}
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 4 — HCM SCD Risk Score (only shown when HCM selected)     */}
      {/* ------------------------------------------------------------------ */}
      {cmpType === 'HCM (Hypertrophic)' && (
        <Section
          title="Section 4 — HCM Risk-SCD Score"
          icon="⚡"
          applicable={sec4}
          onApplicable={setSec4}
          accent="rose"
        >
          <div className="mb-4 px-3 py-2 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
            ESC 2014 HCM Risk-SCD simplified categorical model. Uses septal thickness captured in Section 3.
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <FL label="Patient Age" sub="years — inversely weighted">
              <NumInput value={hcmAge} onChange={setHcmAge} placeholder="e.g. 42" unit="yrs" min={10} max={100} />
            </FL>

            <FL label="Left Atrial Diameter" sub="parasternal long axis">
              <NumInput value={laSize} onChange={setLaSize} placeholder="e.g. 42" unit="mm" min={20} max={80} />
            </FL>
          </div>

          <div className="mb-4 text-xs text-gray-500 font-medium">
            Max wall thickness and LVOT gradient are sourced from Section 3.
          </div>

          <div className="grid grid-cols-1 gap-2 mb-4">
            <Gate
              label="Family history of SCD (sudden cardiac death)?"
              value={fhScd}
              onChange={setFhScd}
            />
            <Gate
              label="NSVT on Holter / ambulatory monitor?"
              value={nsvt}
              onChange={setNsvt}
            />
            <Gate
              label="Unexplained syncope (related to HCM)?"
              value={hcmSyncope}
              onChange={setHcmSyncope}
            />
          </div>

          {/* HCM Risk-SCD result card */}
          <div className={`px-4 py-3 rounded-xl border-2 ${hcmRisk5yr.color}`}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-70">
              HCM Risk-SCD 5-year Estimate
            </div>
            <div className="text-sm font-bold">{hcmRisk5yr.label}</div>
            {hcmRisk5yr.icd && (
              <div className="mt-1 text-xs font-medium opacity-80">
                ICD implantation recommended — discuss with patient. Secondary prevention in cardiac arrest survivors is class I indication.
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Section 5 — Aetiology & Triggers                                   */}
      {/* ------------------------------------------------------------------ */}
      <Section
        title="Section 5 — Aetiology & Triggers"
        icon="🔬"
        applicable={sec5}
        onApplicable={setSec5}
        accent="amber"
      >
        <Gate
          label="Secondary / reversible cause identified?"
          value={secondaryCause}
          onChange={setSecondaryCause}
        >
          <FL label="Aetiology" sub="multi-select — all that apply">
            <Pills
              options={[
                'Alcohol (>21 units/wk)',
                'Chemotherapy (anthracyclines)',
                'Peripartum',
                'Tachycardia-induced',
                'Iron overload (haemochromatosis)',
                'Sarcoidosis',
                'Amyloidosis',
                'Chagas disease',
                'Viral myocarditis',
                'Hypertensive',
                'Ischaemic',
                'Thyroid disease',
                'Cocaine',
              ]}
              value={causePills}
              onChange={setCausePills}
              color="amber"
              multi
            />
          </FL>
        </Gate>

        <FL label="Genetic / Familial Testing">
          <Pills
            options={['Done', 'Pending', 'Declined', 'Not indicated']}
            value={geneticTest}
            onChange={setGeneticTest}
            color="teal"
          />
        </FL>

        {(geneticTest === 'Done' || geneticTest === 'Pending') && (
          <FL label="Genetic Test Result">
            <Pills
              options={[
                'Pathogenic variant found',
                'Variant of uncertain significance',
                'Negative',
                'Pending',
              ]}
              value={geneticResult}
              onChange={setGeneticResult}
              color="teal"
            />
            {geneticResult === 'Pathogenic variant found' && (
              <div className="mt-2 px-3 py-2 bg-purple-50 border border-purple-300 rounded text-purple-800 text-xs font-medium">
                Pathogenic variant identified — cascade screening of first-degree relatives recommended.
              </div>
            )}
          </FL>
        )}
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 6 — Management & Devices                                   */}
      {/* ------------------------------------------------------------------ */}
      <Section
        title="Section 6 — Management & Devices"
        icon="💊"
        applicable={sec6}
        onApplicable={setSec6}
        accent="green"
      >
        <div className="mb-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Pharmacotherapy — GDMT</h3>

          <FL label="Beta-Blocker">
            <Pills
              options={['Metoprolol', 'Carvedilol', 'Bisoprolol', 'None']}
              value={betaBlocker}
              onChange={setBetaBlocker}
              color="purple"
            />
          </FL>

          <FL label="RAAS Blockade" sub="for DCM / HFrEF (EF <40%)">
            <Pills
              options={['Ramipril', 'Enalapril', 'Sacubitril-valsartan', 'Candesartan', 'None']}
              value={raas}
              onChange={setRaas}
              color="violet"
            />
          </FL>

          <FL label="Mineralocorticoid Receptor Antagonist (MRA)">
            <Pills
              options={['Spironolactone', 'Eplerenone', 'None']}
              value={mra}
              onChange={setMra}
              color="teal"
            />
          </FL>

          <FL label="SGLT2 Inhibitor">
            <Pills
              options={['Dapagliflozin 10mg', 'Empagliflozin 10mg', 'None']}
              value={sglt2i}
              onChange={setSglt2i}
              color="blue"
            />
          </FL>
        </div>

        {cmpType === 'HCM (Hypertrophic)' && (
          <div className="mb-5 p-3 bg-purple-50 border border-purple-200 rounded-xl">
            <h3 className="text-sm font-bold text-purple-800 mb-3 uppercase tracking-wide">HCM-Specific Therapy</h3>

            <FL label="Disopyramide" sub="negative inotrope for LVOTO">
              <Pills
                options={['Yes', 'No']}
                value={disopyramide}
                onChange={setDisopyramide}
                color="purple"
              />
            </FL>

            <FL label="Mavacamten" sub="cardiac myosin inhibitor — not yet widely available in India">
              <Pills
                options={['Yes', 'No', 'Not available India']}
                value={mavacamten}
                onChange={setMavacamten}
                color="violet"
              />
              {mavacamten === 'Yes' && (
                <div className="mt-1 text-xs text-violet-700 font-medium">
                  Mavacamten: ECEF monitoring required. Watch for systolic dysfunction.
                </div>
              )}
            </FL>
          </div>
        )}

        <div className="mb-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Devices & Interventions</h3>

          <FL label="ICD (Implantable Cardioverter-Defibrillator)">
            <Pills
              options={['Implanted', 'Recommended-pending', 'Not indicated']}
              value={icd}
              onChange={setIcd}
              color={icd === 'Implanted' ? 'green' : 'purple'}
            />
          </FL>

          <FL label="CRT (Cardiac Resynchronisation Therapy)">
            <Pills
              options={['Implanted', 'Recommended', 'Not indicated']}
              value={crt}
              onChange={setCrt}
              color={crt === 'Implanted' ? 'green' : 'blue'}
            />
          </FL>

          {cmpType === 'HCM (Hypertrophic)' && (
            <FL label="Septal Reduction (Alcohol Septal Ablation / Surgical Myectomy)">
              <Pills
                options={['Planned', 'Done', 'Not indicated']}
                value={septalIntervention}
                onChange={setSeptalIntervention}
                color="amber"
              />
            </FL>
          )}

          <FL label="Cardiac Transplant Listing">
            <Pills
              options={['Yes', 'Pending', 'No']}
              value={transplant}
              onChange={setTransplant}
              color={transplant === 'Yes' ? 'rose' : 'purple'}
            />
          </FL>
        </div>

        <FL label="Follow-up Interval">
          <Pills
            options={['2 weeks', '1 month', '3 months', '6 months']}
            value={followUp}
            onChange={setFollowUp}
            color="teal"
          />
        </FL>
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* Auto-computation summary card                                       */}
      {/* ------------------------------------------------------------------ */}
      {(efClass || lvotoFlag || amyloidFlag || (cmpType === 'HCM (Hypertrophic)')) && (
        <div className="mb-6 rounded-xl border border-purple-200 bg-purple-50 px-5 py-4">
          <h3 className="text-sm font-bold text-purple-800 mb-3 uppercase tracking-wide">
            Auto-computed Flags
          </h3>
          <div className="flex flex-wrap gap-2">
            {efClass && (
              <span className={`px-3 py-1 rounded-full border text-xs font-bold ${efClass.color}`}>
                {efClass.label}
              </span>
            )}
            {lvotoFlag && (
              <span className={`px-3 py-1 rounded-full border text-xs font-bold ${sevLvoto ? 'bg-red-100 border-red-400 text-red-800' : 'bg-orange-100 border-orange-400 text-orange-800'}`}>
                {sevLvoto ? 'Severe LVOTO ≥50 mmHg' : 'Significant LVOTO ≥30 mmHg'}
              </span>
            )}
            {amyloidFlag && (
              <span className="px-3 py-1 rounded-full border text-xs font-bold bg-amber-100 border-amber-400 text-amber-800">
                Amyloid workup indicated
              </span>
            )}
            {cmpType === 'HCM (Hypertrophic)' && (
              <span className={`px-3 py-1 rounded-full border text-xs font-bold ${hcmRisk5yr.color}`}>
                HCM SCD: {hcmRisk5yr.label}
              </span>
            )}
            {urgentAlert && (
              <span className="px-3 py-1 rounded-full border text-xs font-bold bg-red-100 border-red-400 text-red-800 animate-pulse">
                🚨 URGENT — High-risk features present
              </span>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Save button                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-700 to-violet-700 text-white font-bold text-sm shadow-md hover:from-purple-800 hover:to-violet-800 disabled:opacity-60 transition-all"
        >
          {saving ? 'Saving…' : 'Save Cardiomyopathy Assessment'}
        </button>

        {saved && (
          <span className="text-green-700 text-sm font-semibold">
            ✓ Assessment saved successfully
          </span>
        )}

        {error && (
          <span className="text-red-600 text-sm font-semibold">
            ✗ {error}
          </span>
        )}
      </div>
    </div>
  );
}
