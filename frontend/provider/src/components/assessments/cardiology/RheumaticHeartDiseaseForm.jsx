/** @shared-pool RheumaticHeartDiseaseForm — portal-agnostic */
import React, { useState, useMemo } from 'react';
import api from '../../../api/client';

// ── Inline helpers ────────────────────────────────────────────────────────────

const Pills = ({ label, options, value, onChange, color = 'rose', multi = false }) => {
  const base = 'px-3 py-1.5 rounded-full text-sm font-medium border transition-all cursor-pointer select-none';
  const colorMap = {
    rose:  { on: 'bg-rose-600 border-rose-600 text-white', off: 'bg-white border-rose-300 text-rose-700 hover:bg-rose-50' },
    red:   { on: 'bg-red-600 border-red-600 text-white',   off: 'bg-white border-red-300 text-red-700 hover:bg-red-50' },
    green: { on: 'bg-green-600 border-green-600 text-white', off: 'bg-white border-green-300 text-green-700 hover:bg-green-50' },
    blue:  { on: 'bg-blue-600 border-blue-600 text-white', off: 'bg-white border-blue-300 text-blue-700 hover:bg-blue-50' },
    amber: { on: 'bg-amber-500 border-amber-500 text-white', off: 'bg-white border-amber-300 text-amber-700 hover:bg-amber-50' },
    gray:  { on: 'bg-gray-600 border-gray-600 text-white', off: 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50' },
    violet:{ on: 'bg-violet-600 border-violet-600 text-white', off: 'bg-white border-violet-300 text-violet-700 hover:bg-violet-50' },
  };
  const c = colorMap[color] || colorMap.rose;

  const isSelected = (opt) => multi ? (Array.isArray(value) && value.includes(opt)) : value === opt;

  const handleClick = (opt) => {
    if (multi) {
      const arr = Array.isArray(value) ? value : [];
      onChange(arr.includes(opt) ? arr.filter(v => v !== opt) : [...arr, opt]);
    } else {
      onChange(value === opt ? null : opt);
    }
  };

  return (
    <div>
      {label && <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</div>}
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => handleClick(opt)}
            className={`${base} ${isSelected(opt) ? c.on : c.off}`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};

const FL = ({ label, sub, children }) => (
  <div className="space-y-1.5">
    <div>
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      {sub && <span className="ml-2 text-xs text-gray-400 italic">{sub}</span>}
    </div>
    {children}
  </div>
);

const Gate = ({ label, value, onChange, children, color = 'rose' }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <Pills
          options={['Yes', 'No']}
          value={value}
          onChange={onChange}
          color={color}
        />
      </div>
      {value === 'Yes' && (
        <div className="pl-4 border-l-2 border-rose-200 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};

const Section = ({ title, icon, children, defaultOpen = true }) => {
  const [applicable, setApplicable] = useState(null);

  return (
    <div className="bg-white rounded-xl border border-rose-100 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-rose-50 to-red-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-rose-100">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{icon}</span>
          <h3 className="font-semibold text-gray-800 text-base">{title}</h3>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-500 font-medium">Applicable?</span>
          <Pills
            options={['Yes', 'No']}
            value={applicable}
            onChange={setApplicable}
            color="rose"
          />
        </div>
      </div>
      {applicable === 'No' ? (
        <div className="px-5 py-6 flex items-center gap-3 text-gray-400 bg-gray-50">
          <span className="text-2xl">🔒</span>
          <span className="text-sm italic">Not applicable — section locked</span>
        </div>
      ) : applicable === 'Yes' ? (
        <div className="px-5 py-5 space-y-5">{children}</div>
      ) : (
        <div className="px-5 py-4 text-xs text-gray-400 italic">
          Select "Yes" or "No" above to proceed.
        </div>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export default function RheumaticHeartDiseaseForm({ patientId, encounterId, onSaved }) {
  // Section 1 — ARF / Jones criteria
  const [isARF, setIsARF] = useState(null);

  // Major criteria
  const [carditis, setCarditis]         = useState(null);
  const [polyarthritis, setPolyarthritis] = useState(null);
  const [chorea, setChorea]             = useState(null);
  const [erythema, setErythema]         = useState(null);
  const [nodules, setNodules]           = useState(null);

  // Minor criteria
  const [fever, setFever]       = useState(null);
  const [esr, setEsr]           = useState(null);
  const [prInterval, setPrInterval] = useState(null);
  const [arthralgia, setArthralgia] = useState(null);

  // GAS evidence
  const [asot, setAsot]               = useState(null);
  const [throatCulture, setThroatCulture] = useState(null);
  const [rapidAg, setRapidAg]         = useState(null);

  // Section 2 — Cardiac involvement
  const [valvesAffected, setValvesAffected] = useState([]);
  const [echoDone, setEchoDone]             = useState(null);
  const [subclinicalCarditis, setSubclinicalCarditis] = useState(null);
  const [morphoChanges, setMorphoChanges]   = useState([]);
  const [msPresent, setMsPresent]           = useState(null);
  const [mva, setMva]                       = useState('');
  const [mrSeverity, setMrSeverity]         = useState(null);
  const [arSeverity, setArSeverity]         = useState(null);
  const [nyha, setNyha]                     = useState(null);
  const [sPAP, setSPAP]                     = useState('');

  // Section 3 — Secondary prophylaxis
  const [prophylaxisStarted, setProphylaxisStarted] = useState(null);
  const [prophylaxisDrug, setProphylaxisDrug]       = useState(null);
  const [prophylaxisDose, setProphylaxisDose]       = useState(null);
  const [benzFreq, setBenzFreq]                     = useState(null);
  const [prophylaxisRoute, setProphylaxisRoute]     = useState(null);
  const [prophylaxisDuration, setProphylaxisDuration] = useState(null);
  const [lastInjDate, setLastInjDate]               = useState('');
  const [npcdcs, setNpcdcs]                         = useState(null);
  const [noProphylaxisReason, setNoProphylaxisReason] = useState([]);

  // Section 4 — Acute treatment
  const [aspirin, setAspirin]               = useState(null);
  const [naproxen, setNaproxen]             = useState(null);
  const [corticosteroid, setCorticosteroid] = useState(null);
  const [amoxicillin, setAmoxicillin]       = useState(null);
  const [benzathinePcn, setBenzathinePcn]   = useState(null);
  const [bedRest, setBedRest]               = useState(null);
  const [hfMeds, setHfMeds]                 = useState([]);

  // Section 5 — Long-term / Surgery
  const [surgicalReferral, setSurgicalReferral]   = useState(null);
  const [surgeryType, setSurgeryType]             = useState([]);
  const [anticoagulation, setAnticoagulation]     = useState(null);
  const [npcdcsEnroll, setNpcdcsEnroll]           = useState(null);
  const [echoInterval, setEchoInterval]           = useState(null);
  const [followUpClinic, setFollowUpClinic]       = useState(null);

  // Section 6 — Social & prevention
  const [householdCrowding, setHouseholdCrowding]   = useState(null);
  const [handHygiene, setHandHygiene]               = useState(null);
  const [throatAwareness, setThroatAwareness]       = useState(null);
  const [familyScreening, setFamilyScreening]       = useState(null);
  const [referSiblings, setReferSiblings]           = useState(null);

  // ── Auto-computations ──────────────────────────────────────────────────────

  const jonesDiagnosis = useMemo(() => {
    const majorCount = [carditis, polyarthritis, chorea, erythema, nodules].filter(v => v === 'Yes').length;
    const minorCount = [fever, esr, prInterval, (polyarthritis !== 'Yes' ? arthralgia : null)].filter(v => v === 'Yes').length;
    const gasEvidence = [asot, throatCulture, rapidAg].some(v => v === 'Positive' || v === 'Yes');
    if (!gasEvidence) return { label: 'GAS evidence required — diagnosis cannot be established', color: 'bg-gray-100 border-gray-400 text-gray-700', met: false };
    if (majorCount >= 2 || (majorCount >= 1 && minorCount >= 2)) {
      return { label: 'Jones Criteria MET — ARF confirmed', color: 'bg-red-100 border-red-400 text-red-800', met: true };
    }
    return { label: 'Jones Criteria NOT met — ARF unlikely', color: 'bg-green-100 border-green-400 text-green-800', met: false };
  }, [carditis, polyarthritis, chorea, erythema, nodules, fever, esr, prInterval, arthralgia, asot, throatCulture, rapidAg]);

  const nextInjDate = useMemo(() => {
    if (!lastInjDate || !benzFreq) return null;
    const d = new Date(lastInjDate);
    d.setDate(d.getDate() + (benzFreq === 'Every 21 days' ? 21 : 28));
    return d.toISOString().split('T')[0];
  }, [lastInjDate, benzFreq]);

  const urgentAlert = isARF === 'Yes' && jonesDiagnosis.met && (nyha === 'III' || nyha === 'IV');

  // ── Save ──────────────────────────────────────────────────────────────────

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const payload = {
        patientId,
        encounterId,
        formType: 'RheumaticHeartDisease',
        submittedAt: new Date().toISOString(),
        // Section 1
        isARF,
        jonesCriteria: {
          major: { carditis, polyarthritis, chorea, erythema, nodules },
          minor: { fever, esr, prInterval, arthralgia },
          gasEvidence: { asot, throatCulture, rapidAg },
          diagnosis: jonesDiagnosis.label,
          diagnosisMet: jonesDiagnosis.met,
        },
        // Section 2
        cardiacInvolvement: {
          valvesAffected,
          echoDone,
          subclinicalCarditis,
          morphoChanges,
          msPresent,
          mva: msPresent === 'Yes' ? parseFloat(mva) || null : null,
          mrSeverity,
          arSeverity,
          nyha,
          sPAP: sPAP ? parseFloat(sPAP) : null,
        },
        // Section 3
        secondaryProphylaxis: {
          prophylaxisStarted,
          drug: prophylaxisDrug,
          dose: prophylaxisDose,
          frequency: benzFreq,
          route: prophylaxisRoute,
          duration: prophylaxisDuration,
          lastInjectionDate: lastInjDate || null,
          nextInjectionDue: nextInjDate,
          npcdcs,
          noProphylaxisReason,
        },
        // Section 4
        acuteTreatment: {
          aspirin,
          naproxen,
          corticosteroid,
          amoxicillin,
          benzathinePcn,
          bedRest,
          heartFailureMeds: hfMeds,
        },
        // Section 5
        longTermManagement: {
          surgicalReferral,
          surgeryType,
          anticoagulation,
          npcdcsEnrollment: npcdcsEnroll,
          echoInterval,
          followUpClinic,
        },
        // Section 6
        socialPrevention: {
          householdCrowding,
          handHygiene,
          throatAwareness,
          familyScreening,
          referSiblings: familyScreening === 'Yes' ? referSiblings : null,
        },
      };
      await api.post('/assessments', payload);
      setSaveSuccess(true);
      if (onSaved) onSaved(payload);
    } catch (err) {
      setSaveError(err?.response?.data?.message || err.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">

      {/* ── Header ── */}
      <div className="rounded-2xl bg-gradient-to-br from-rose-600 via-red-600 to-rose-800 text-white px-6 py-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Rheumatic Heart Disease Assessment</h1>
            <p className="text-rose-100 text-sm mt-1">2015 Jones Criteria · NPCDCS Protocol · Secondary Prophylaxis</p>
            <p className="text-rose-200 text-xs mt-2 max-w-xl leading-relaxed">
              RHD burden: 5–7 million Indians affected. ARF peak age 5–15 years. Benzathine PCN under NLEM. NPCDCS — free prophylaxis at PHC level.
            </p>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0 items-end">
            {isARF === 'Yes' && (
              <div className={`text-xs font-semibold px-3 py-1.5 rounded-full border-2 ${jonesDiagnosis.color}`}>
                {jonesDiagnosis.label}
              </div>
            )}
            {urgentAlert && (
              <div className="animate-pulse bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-full border-2 border-amber-600">
                ⚠ URGENT — ARF + Severe Carditis (NYHA {nyha})
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 1 — ARF Diagnosis ── */}
      <Section title="Section 1 — Acute Rheumatic Fever (ARF) Diagnosis" icon="🫀">
        <Gate label="Is this an acute ARF episode?" value={isARF} onChange={setIsARF} color="red">

          {/* 2015 Jones Criteria */}
          <div className="bg-red-50 rounded-xl border border-red-100 p-4 space-y-5">
            <h4 className="font-semibold text-red-800 text-sm uppercase tracking-wide">2015 Jones Criteria</h4>

            {/* Major criteria */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Major Criteria</div>
              <FL label="Carditis" sub="clinical or subclinical echocardiographic">
                <Pills options={['Yes', 'No']} value={carditis} onChange={setCarditis} color="red" />
              </FL>
              <FL label="Polyarthritis" sub="migratory">
                <Pills options={['Yes', 'No']} value={polyarthritis} onChange={setPolyarthritis} color="red" />
              </FL>
              <FL label="Chorea" sub="Sydenham's">
                <Pills options={['Yes', 'No']} value={chorea} onChange={setChorea} color="red" />
              </FL>
              <FL label="Erythema marginatum">
                <Pills options={['Yes', 'No']} value={erythema} onChange={setErythema} color="red" />
              </FL>
              <FL label="Subcutaneous nodules">
                <Pills options={['Yes', 'No']} value={nodules} onChange={setNodules} color="red" />
              </FL>
            </div>

            {/* Minor criteria */}
            <div className="space-y-3 pt-2 border-t border-red-100">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Minor Criteria</div>
              <FL label="Fever ≥38.5°C">
                <Pills options={['Yes', 'No']} value={fever} onChange={setFever} color="amber" />
              </FL>
              <FL label="Elevated ESR (≥60 mm/h) or CRP">
                <Pills options={['Yes', 'No']} value={esr} onChange={setEsr} color="amber" />
              </FL>
              <FL label="Prolonged PR interval">
                <Pills options={['Yes', 'No']} value={prInterval} onChange={setPrInterval} color="amber" />
              </FL>
              <FL
                label="Arthralgia"
                sub={polyarthritis === 'Yes' ? '⚠ Disabled — polyarthritis selected as major criterion' : 'Only if polyarthritis NOT selected'}
              >
                <Pills
                  options={['Yes', 'No']}
                  value={polyarthritis === 'Yes' ? null : arthralgia}
                  onChange={polyarthritis === 'Yes' ? () => {} : setArthralgia}
                  color={polyarthritis === 'Yes' ? 'gray' : 'amber'}
                />
              </FL>
            </div>

            {/* GAS evidence */}
            <div className="space-y-3 pt-2 border-t border-red-100">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Evidence of Preceding GAS Infection <span className="text-red-500">(Required for ALL)</span></div>
              <FL label="ASOT positive">
                <Pills options={['Positive', 'Negative', 'Not done']} value={asot} onChange={setAsot} color="violet" />
              </FL>
              <FL label="Throat culture GAS positive">
                <Pills options={['Yes', 'No']} value={throatCulture} onChange={setThroatCulture} color="violet" />
              </FL>
              <FL label="Rapid antigen test positive">
                <Pills options={['Yes', 'No']} value={rapidAg} onChange={setRapidAg} color="violet" />
              </FL>
            </div>

            {/* Auto-diagnosis result */}
            <div className={`rounded-lg border-2 px-4 py-3 ${jonesDiagnosis.color} text-sm font-semibold`}>
              Auto-diagnosis: {jonesDiagnosis.label}
            </div>
          </div>
        </Gate>
      </Section>

      {/* ── Section 2 — Cardiac Involvement ── */}
      <Section title="Section 2 — Cardiac Involvement" icon="🫁">
        <FL label="Valve(s) affected" sub="multi-select">
          <Pills
            options={['Mitral', 'Aortic', 'Tricuspid', 'Pulmonary', 'Combined']}
            value={valvesAffected}
            onChange={setValvesAffected}
            color="rose"
            multi
          />
        </FL>

        <Gate label="Echocardiogram done?" value={echoDone} onChange={setEchoDone} color="rose">
          <FL label="Subclinical carditis (Doppler MR without auscultation)?">
            <Pills options={['Yes', 'No']} value={subclinicalCarditis} onChange={setSubclinicalCarditis} color="rose" />
          </FL>

          <FL label="Morphological changes" sub="multi-select">
            <Pills
              options={[
                'Anterior MV leaflet thickening ≥3mm',
                'Chordal thickening',
                'Restricted posterior leaflet',
                'Excessive leaflet tip motion (prolapse)',
              ]}
              value={morphoChanges}
              onChange={setMorphoChanges}
              color="rose"
              multi
            />
          </FL>

          <FL label="Mitral stenosis (MS) present?">
            <Pills options={['Yes', 'No']} value={msPresent} onChange={setMsPresent} color="rose" />
          </FL>
          {msPresent === 'Yes' && (
            <FL label="Mitral Valve Area (MVA)" sub="cm²">
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="6"
                value={mva}
                onChange={e => setMva(e.target.value)}
                placeholder="e.g. 1.2"
                className="w-32 px-3 py-1.5 rounded-lg border border-rose-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </FL>
          )}

          <FL label="MR severity">
            <Pills options={['Mild', 'Moderate', 'Severe']} value={mrSeverity} onChange={setMrSeverity} color="rose" />
          </FL>

          <FL label="AR severity">
            <Pills options={['Mild', 'Moderate', 'Severe']} value={arSeverity} onChange={setArSeverity} color="rose" />
          </FL>
        </Gate>

        <FL label="NYHA functional class">
          <Pills options={['I', 'II', 'III', 'IV']} value={nyha} onChange={setNyha} color="rose" />
        </FL>

        <FL label="Pulmonary hypertension — sPAP" sub="mmHg">
          <input
            type="number"
            min="15"
            max="120"
            value={sPAP}
            onChange={e => setSPAP(e.target.value)}
            placeholder="e.g. 45"
            className="w-32 px-3 py-1.5 rounded-lg border border-rose-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </FL>
      </Section>

      {/* ── Section 3 — Secondary Prophylaxis ── */}
      <Section title="Section 3 — Secondary Prophylaxis" icon="💊">
        <Gate label="Prophylaxis started?" value={prophylaxisStarted} onChange={setProphylaxisStarted} color="green">
          <FL label="Drug">
            <Pills
              options={['Benzathine Penicillin G', 'Oral Penicillin V', 'Erythromycin (if PCN allergic)']}
              value={prophylaxisDrug}
              onChange={setProphylaxisDrug}
              color="green"
            />
          </FL>

          <FL label="Dose">
            <Pills
              options={['1.2 MU (≥27 kg)', '0.6 MU (<27 kg)']}
              value={prophylaxisDose}
              onChange={setProphylaxisDose}
              color="green"
            />
          </FL>

          <FL label="Frequency">
            <Pills
              options={['Every 21 days', 'Every 28 days']}
              value={benzFreq}
              onChange={setBenzFreq}
              color="green"
            />
          </FL>

          <FL label="Route">
            <Pills options={['IM', 'Oral']} value={prophylaxisRoute} onChange={setProphylaxisRoute} color="green" />
          </FL>

          <FL label="Duration">
            <Pills
              options={[
                '5 yrs or age 21 (ARF no carditis)',
                '10 yrs or age 21 (ARF + carditis, no residual)',
                '10 yrs or age 25 (mild residual RHD)',
                'Lifelong (moderate-severe RHD / recurrent ARF)',
              ]}
              value={prophylaxisDuration}
              onChange={setProphylaxisDuration}
              color="green"
            />
          </FL>

          <FL label="Last injection date">
            <input
              type="date"
              value={lastInjDate}
              onChange={e => setLastInjDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-rose-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </FL>

          {nextInjDate && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm">
              <span className="font-semibold text-green-700">Next injection due: </span>
              <span className="text-green-800">{nextInjDate}</span>
              <span className="ml-2 text-green-500 text-xs">({benzFreq})</span>
            </div>
          )}

          <FL label="Registered with NPCDCS / NHM">
            <Pills options={['Yes', 'No', 'Not available']} value={npcdcs} onChange={setNpcdcs} color="blue" />
          </FL>
        </Gate>

        {prophylaxisStarted === 'No' && (
          <FL label="Reason for no prophylaxis" sub="multi-select">
            <Pills
              options={['PCN allergy — test done', 'Patient declined', 'Compliance concerns', 'Other']}
              value={noProphylaxisReason}
              onChange={setNoProphylaxisReason}
              color="gray"
              multi
            />
          </FL>
        )}
      </Section>

      {/* ── Section 4 — Acute Treatment ── */}
      <Section title="Section 4 — Acute Treatment (if active ARF)" icon="🏥">
        <div className="space-y-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Anti-inflammatory</div>
          <FL label="Aspirin 100 mg/kg/day (max 6g)">
            <Pills options={['Prescribed', 'Not indicated']} value={aspirin} onChange={setAspirin} color="rose" />
          </FL>
          <FL label="Naproxen (alternative)">
            <Pills options={['Yes', 'No']} value={naproxen} onChange={setNaproxen} color="rose" />
          </FL>
          <FL label="Corticosteroids">
            <Pills
              options={['Prednisolone (severe carditis)', 'Not needed', 'Already given']}
              value={corticosteroid}
              onChange={setCorticosteroid}
              color="rose"
            />
          </FL>
        </div>

        <div className="space-y-4 pt-3 border-t border-gray-100">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Penicillin — GAS eradication</div>
          <FL label="Amoxicillin 10-day course">
            <Pills options={['Yes', 'No']} value={amoxicillin} onChange={setAmoxicillin} color="blue" />
          </FL>
          <FL label="Benzathine PCN G single dose">
            <Pills options={['Yes', 'No']} value={benzathinePcn} onChange={setBenzathinePcn} color="blue" />
          </FL>
        </div>

        <FL label="Bed rest">
          <Pills
            options={[
              'Strict bed rest (severe carditis)',
              'Modified activity',
              'Normal activity (mild)',
            ]}
            value={bedRest}
            onChange={setBedRest}
            color="amber"
          />
        </FL>

        <FL label="Heart failure treatment" sub="if carditis with HF — multi-select">
          <Pills
            options={['Furosemide', 'Spironolactone', 'Digoxin']}
            value={hfMeds}
            onChange={setHfMeds}
            color="rose"
            multi
          />
        </FL>
      </Section>

      {/* ── Section 5 — Long-term Management & Surgery ── */}
      <Section title="Section 5 — Long-term Management & Surgery" icon="🔬">
        <FL label="Surgical referral">
          <Pills options={['Yes', 'No', 'Pending']} value={surgicalReferral} onChange={setSurgicalReferral} color="rose" />
        </FL>
        {surgicalReferral === 'Yes' && (
          <FL label="Surgery type" sub="multi-select">
            <Pills
              options={['BMV (Balloon Mitral Valvotomy)', 'MVR', 'AVR', 'Combined']}
              value={surgeryType}
              onChange={setSurgeryType}
              color="rose"
              multi
            />
          </FL>
        )}

        <FL label="Anticoagulation" sub="if AF or prosthetic valve">
          <Pills
            options={['Warfarin (target INR 2.5–3.5)', 'Not needed']}
            value={anticoagulation}
            onChange={setAnticoagulation}
            color="rose"
          />
        </FL>

        <FL label="NPCDCS programme enrollment">
          <Pills
            options={['Yes', 'No', 'Not available in district']}
            value={npcdcsEnroll}
            onChange={setNpcdcsEnroll}
            color="blue"
          />
        </FL>

        <FL label="Follow-up echocardiogram interval">
          <Pills
            options={['3 months', '6 months', '1 year']}
            value={echoInterval}
            onChange={setEchoInterval}
            color="rose"
          />
        </FL>

        <FL label="Follow-up clinic">
          <Pills
            options={['1 month', '3 months', '6 months']}
            value={followUpClinic}
            onChange={setFollowUpClinic}
            color="rose"
          />
        </FL>
      </Section>

      {/* ── Section 6 — Social & Prevention ── */}
      <Section title="Section 6 — Social & Prevention" icon="🏘️">
        <FL label="Household crowding (risk factor present)">
          <Pills options={['Yes', 'No']} value={householdCrowding} onChange={setHouseholdCrowding} color="amber" />
        </FL>
        <FL label="Hand hygiene counselled">
          <Pills options={['Yes', 'No']} value={handHygiene} onChange={setHandHygiene} color="green" />
        </FL>
        <FL label="Throat infection awareness counselled">
          <Pills options={['Yes', 'No']} value={throatAwareness} onChange={setThroatAwareness} color="green" />
        </FL>

        <Gate label="Family screening recommended?" value={familyScreening} onChange={setFamilyScreening} color="rose">
          <FL label="Refer siblings/children for echocardiographic screening">
            <Pills options={['Yes', 'No']} value={referSiblings} onChange={setReferSiblings} color="rose" />
          </FL>
        </Gate>
      </Section>

      {/* ── Save ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-7 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-semibold text-sm shadow-md hover:from-rose-700 hover:to-red-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save RHD Assessment'}
        </button>

        {saveSuccess && (
          <div className="text-sm text-green-700 font-medium bg-green-50 border border-green-200 rounded-lg px-4 py-2">
            Assessment saved successfully.
          </div>
        )}
        {saveError && (
          <div className="text-sm text-red-700 font-medium bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {saveError}
          </div>
        )}
      </div>

    </div>
  );
}
