/**
 * @shared-pool
 * CervicalScreeningForm — Comprehensive cervical cancer screening assessment
 * Covers: Pap smear (Bethesda), HPV testing, VIA/VILI, colposcopy, CIN management
 * Indian NCRP context, PHC/CHC VIA screening, HPV vaccination, ASCCP guidelines
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */

import React, { useState, useMemo } from 'react';
import { Shield, ChevronDown, ChevronUp, Lock, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import api from '../../../api/client';

/* ── accent palette ── */
const A = {
  teal:    { bg: 'bg-teal-50',   border: 'border-teal-300',   text: 'text-teal-700',   pill: 'bg-teal-100 border-teal-400 text-teal-800',   active: 'bg-teal-600 text-white border-teal-600' },
  cyan:    { bg: 'bg-cyan-50',   border: 'border-cyan-300',   text: 'text-cyan-700',   pill: 'bg-cyan-100 border-cyan-400 text-cyan-800',   active: 'bg-cyan-600 text-white border-cyan-600' },
  emerald: { bg: 'bg-emerald-50',border: 'border-emerald-300',text: 'text-emerald-700',pill: 'bg-emerald-100 border-emerald-400 text-emerald-800',active: 'bg-emerald-600 text-white border-emerald-600' },
  green:   { bg: 'bg-green-50',  border: 'border-green-300',  text: 'text-green-700',  pill: 'bg-green-100 border-green-400 text-green-800',  active: 'bg-green-600 text-white border-green-600' },
  red:     { bg: 'bg-red-50',    border: 'border-red-300',    text: 'text-red-700',    pill: 'bg-red-100 border-red-400 text-red-800',    active: 'bg-red-500 text-white border-red-500' },
  orange:  { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', pill: 'bg-orange-100 border-orange-400 text-orange-800', active: 'bg-orange-500 text-white border-orange-500' },
  violet:  { bg: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-700', pill: 'bg-violet-100 border-violet-400 text-violet-800', active: 'bg-violet-500 text-white border-violet-500' },
  blue:    { bg: 'bg-blue-50',   border: 'border-blue-300',   text: 'text-blue-700',   pill: 'bg-blue-100 border-blue-400 text-blue-800',   active: 'bg-blue-600 text-white border-blue-600' },
};

/* ── Pills ── */
function Pills({ options, value, onChange, accent = 'teal', multi = false }) {
  const c = A[accent];
  const selected = multi ? (Array.isArray(value) ? value : []) : value;
  const toggle = (opt) => {
    if (multi) {
      const arr = Array.isArray(selected) ? selected : [];
      onChange(arr.includes(opt) ? arr.filter(x => x !== opt) : [...arr, opt]);
    } else {
      onChange(selected === opt ? '' : opt);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = multi ? selected.includes(opt) : selected === opt;
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

/* ── Field label ── */
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

/* ── Gate ── */
function Gate({ label, value, onChange, accent = 'teal', children }) {
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

/* ── Section ── */
function Section({ title, applicable, onApplicable, accent = 'teal', children }) {
  const c = A[accent];
  const [open, setOpen] = useState(true);
  if (applicable === 'N/A') {
    return (
      <div className={`rounded-xl border-2 border-dashed ${c.border} p-4 flex items-center gap-3 opacity-60`}>
        <Lock className="w-5 h-5 text-gray-400" />
        <span className="text-sm text-gray-500 font-medium">{title} — Not applicable · section locked</span>
        <button type="button" onClick={() => onApplicable('Applicable')}
          className="ml-auto text-xs text-blue-600 underline">Unlock</button>
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

/* ── Bethesda result colour ── */
function bethesdaColor(result) {
  if (!result) return '';
  if (result.includes('Carcinoma') || result.includes('AIS') || result.includes('AGC')) return 'bg-red-100 border-red-500 text-red-800';
  if (result.includes('HSIL') || result.includes('ASC-H')) return 'bg-red-50 border-red-400 text-red-700';
  if (result.includes('LSIL') || result.includes('ASCUS')) return 'bg-orange-50 border-orange-400 text-orange-700';
  if (result.includes('NILM')) return 'bg-green-50 border-green-400 text-green-700';
  return 'bg-gray-50 border-gray-300 text-gray-700';
}

const STAGES = [
  'History & Risk Factors',
  'Cytology (Pap Smear)',
  'HPV Testing',
  'VIA / VILI',
  'Colposcopy',
  'Histology & Management',
];

export default function CervicalScreeningForm({ patientId, encounterId, onSaved }) {
  /* ── section applicable ── */
  const [stage, setStage] = useState(0);
  const [sec, setSec] = useState({
    history: 'Applicable', cytology: 'Applicable', hpv: 'Applicable',
    via: 'Applicable', colposcopy: 'Applicable', management: 'Applicable',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  /* ── Stage 0: History & Risk Factors ── */
  const [age, setAge] = useState('');
  const [parity, setParity] = useState('');
  const [ageFirstCoitus, setAgeFirstCoitus] = useState('');
  const [numberOfPartners, setNumberOfPartners] = useState('');
  const [lastPapSmear, setLastPapSmear] = useState('');
  const [lastPapResult, setLastPapResult] = useState('');
  const [screeningHistory, setScreeningHistory] = useState('');
  const [hpvVaccinationStatus, setHpvVaccinationStatus] = useState('');
  const [hpvVaccineType, setHpvVaccineType] = useState('');
  const [hpvVaccineDoses, setHpvVaccineDoses] = useState('');
  const [smokingStatus, setSmokingStatus] = useState('');
  const [hivStatus, setHivStatus] = useState('');
  const [immunosuppression, setImmunosuppression] = useState('');
  const [stdHistory, setStdHistory] = useState('');
  const [oralContraceptive, setOralContraceptive] = useState('');
  const [symptoms, setSymptoms] = useState([]);
  const [previousCervicalTx, setPreviousCervicalTx] = useState('');
  const [prevTxType, setPrevTxType] = useState('');
  const [familyHistory, setFamilyHistory] = useState('');
  const [socioeconomicFactors, setSocioeconomicFactors] = useState([]);

  /* ── Stage 1: Cytology ── */
  const [smearTechnique, setSmearTechnique] = useState('');
  const [smearAdequacy, setSmearAdequacy] = useState('');
  const [smearInadequacyReason, setSmearInadequacyReason] = useState('');
  const [bethesdaResult, setBethesdaResult] = useState('');
  const [bethesdaSubtype, setBethesdaSubtype] = useState('');
  const [endocervicalCells, setEndocervicalCells] = useState('');
  const [transformationZone, setTransformationZone] = useState('');
  const [additionalFindings, setAdditionalFindings] = useState([]);
  const [smearDate, setSmearDate] = useState('');
  const [smearPerformedBy, setSmearPerformedBy] = useState('');

  /* ── Stage 2: HPV Testing ── */
  const [hpvTestDone, setHpvTestDone] = useState('');
  const [hpvTestType, setHpvTestType] = useState('');
  const [hpvResult, setHpvResult] = useState('');
  const [hpvHighRiskType, setHpvHighRiskType] = useState([]);
  const [hpv16or18, setHpv16or18] = useState('');
  const [hpvTestDate, setHpvTestDate] = useState('');

  /* ── Stage 3: VIA / VILI ── */
  const [viaPerformed, setViaPerformed] = useState('');
  const [viaResult, setViaResult] = useState('');
  const [viaAcetowhiteArea, setViaAcetowhiteArea] = useState('');
  const [viaAcetowhiteLocation, setViaAcetowhiteLocation] = useState([]);
  const [viliPerformed, setViliPerformed] = useState('');
  const [viliResult, setViliResult] = useState('');
  const [viliMustardArea, setViliMustardArea] = useState('');
  const [viaScreeningLevel, setViaScreeningLevel] = useState('');
  const [treatAndScreen, setTreatAndScreen] = useState('');
  const [cryotherapyGiven, setCryotherapyGiven] = useState('');

  /* ── Stage 4: Colposcopy ── */
  const [colposcopyDone, setColposcopyDone] = useState('');
  const [colposcopyIndication, setColposcopyIndication] = useState([]);
  const [scjVisibility, setScjVisibility] = useState('');
  const [transformZoneType, setTransformZoneType] = useState('');
  const [colpoAdequacy, setColpoAdequacy] = useState('');
  const [acetowhiteFindings, setAcetowhiteFindings] = useState('');
  const [acetowhiteGrade, setAcetowhiteGrade] = useState('');
  const [mosaicism, setMosaicism] = useState('');
  const [punctuation, setPunctuation] = useState('');
  const [atypicalVessels, setAtypicalVessels] = useState('');
  const [lugoliodineResult, setLugoliodineResult] = useState('');
  const [ifsaColpoGrade, setIfsaColpoGrade] = useState('');
  const [biopsyTaken, setBiopsyTaken] = useState('');
  const [biopsySites, setBiopsySites] = useState([]);
  const [endocervicalCurettage, setEndocervicalCurettage] = useState('');

  /* ── Stage 5: Histology & Management ── */
  const [histologyResult, setHistologyResult] = useState('');
  const [cinGrade, setCinGrade] = useState('');
  const [histologyDetails, setHistologyDetails] = useState('');
  const [managementPlan, setManagementPlan] = useState('');
  const [treatmentType, setTreatmentType] = useState([]);
  const [lleetzDone, setLleetzDone] = useState('');
  const [lleetzMargins, setLleetzMargins] = useState('');
  const [excisionDepth, setExcisionDepth] = useState('');
  const [referralNeeded, setReferralNeeded] = useState('');
  const [referralDestination, setReferralDestination] = useState('');
  const [followUpSmear, setFollowUpSmear] = useState('');
  const [followUpInterval, setFollowUpInterval] = useState('');
  const [testOfCure, setTestOfCure] = useState('');
  const [patientCounselling, setPatientCounselling] = useState([]);
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /* ── AUTO: Urgent flags ── */
  const urgentFlags = useMemo(() => {
    const flags = [];
    if (symptoms.includes('Post-coital bleeding')) flags.push('Post-coital bleeding — cervical pathology must be excluded urgently');
    if (symptoms.includes('Intermenstrual bleeding') && Number(age) >= 40) flags.push('Intermenstrual bleeding age ≥40 — urgent evaluation');
    if (symptoms.includes('Visible cervical mass / ulcer')) flags.push('Visible cervical lesion — urgent biopsy / gynaecology oncology referral');
    if (bethesdaResult === 'Squamous cell carcinoma' || bethesdaResult === 'Adenocarcinoma') flags.push('Malignancy on cytology — URGENT referral to gynaecological oncology');
    if (bethesdaResult === 'AGC — favour neoplastic' || bethesdaResult === 'AIS') flags.push('AGC/AIS — urgent colposcopy + endocervical sampling required');
    if (hpv16or18 === 'HPV 16 or 18 positive') flags.push('HPV 16/18 positive — highest risk types; colposcopy required regardless of cytology');
    if (viaResult === 'Positive (acetowhite lesion)' && viaAcetowhiteArea === 'Touching os / >75% TZ') flags.push('VIA strongly positive (large acetowhite near os) — colposcopy / biopsy required');
    if (atypicalVessels === 'Present') flags.push('Atypical vessels on colposcopy — highly suspicious for invasive disease; biopsy urgently');
    if (histologyResult === 'Invasive carcinoma' || histologyResult === 'Microinvasive carcinoma') flags.push('Invasive carcinoma confirmed — gynaecological oncology referral');
    if (cinGrade === 'CIN 3' || cinGrade === 'CIN 2-3') flags.push('CIN 3 — high-grade disease; treatment within 8 weeks recommended (LEEP/LLETZ/CKC)');
    return flags;
  }, [symptoms, age, bethesdaResult, hpv16or18, viaResult, viaAcetowhiteArea, atypicalVessels, histologyResult, cinGrade]);

  /* ── AUTO: Management recommendation ── */
  const managementRec = useMemo(() => {
    if (bethesdaResult === 'NILM' && hpvResult === 'Negative') return 'Co-test negative — routine screening in 5 years (NILM + HPV negative)';
    if (bethesdaResult === 'NILM' && hpvResult === 'Positive') {
      if (hpv16or18 === 'HPV 16 or 18 positive') return 'NILM + HPV 16/18 — colposcopy now (high-risk types)';
      return 'NILM + HPV positive (not 16/18) — repeat co-test in 1 year';
    }
    if (bethesdaResult === 'ASCUS' && hpvResult === 'Negative') return 'ASCUS + HPV negative — routine screening in 3 years';
    if (bethesdaResult === 'ASCUS' && hpvResult === 'Positive') return 'ASCUS + HPV positive — colposcopy';
    if (bethesdaResult === 'ASCUS' && !hpvResult) return 'ASCUS + HPV unknown — repeat cytology in 1 year OR HPV reflex test';
    if (bethesdaResult === 'LSIL') return 'LSIL — colposcopy (or HPV test if age <25 observe and repeat in 1 year)';
    if (bethesdaResult === 'ASC-H' || bethesdaResult === 'HSIL') return 'ASC-H / HSIL — colposcopy immediately';
    if (bethesdaResult === 'AGC — NOS' || bethesdaResult === 'AGC — favour neoplastic') return 'AGC — colposcopy + endocervical sampling + endometrial biopsy if age ≥35';
    if (bethesdaResult === 'AIS') return 'AIS — colposcopy + endocervical curettage; cold knife cone if colposcopy negative';
    if (bethesdaResult === 'Squamous cell carcinoma' || bethesdaResult === 'Adenocarcinoma') return 'Invasive malignancy — urgent gynaecological oncology referral';
    if (viaResult === 'Positive (acetowhite lesion)') return 'VIA positive — colposcopy / biopsy; cryotherapy if eligible (ectocervical, <75% TZ, no features of invasion)';
    if (viaResult === 'Suspicious for cancer') return 'VIA suspicious — URGENT referral for biopsy and staging';
    return null;
  }, [bethesdaResult, hpvResult, hpv16or18, viaResult]);

  /* ── Save ── */
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/assessments', {
        type: 'cervical_screening',
        patientId, encounterId,
        data: {
          history: {
            age, parity, ageFirstCoitus, numberOfPartners, lastPapSmear, lastPapResult,
            screeningHistory, hpvVaccinationStatus, hpvVaccineType, hpvVaccineDoses,
            smokingStatus, hivStatus, immunosuppression, stdHistory, oralContraceptive,
            symptoms, previousCervicalTx, prevTxType, familyHistory, socioeconomicFactors,
          },
          cytology: {
            smearTechnique, smearAdequacy, smearInadequacyReason, bethesdaResult,
            bethesdaSubtype, endocervicalCells, transformationZone, additionalFindings,
            smearDate, smearPerformedBy,
          },
          hpv: { hpvTestDone, hpvTestType, hpvResult, hpvHighRiskType, hpv16or18, hpvTestDate },
          via: { viaPerformed, viaResult, viaAcetowhiteArea, viaAcetowhiteLocation, viliPerformed, viliResult, viliMustardArea, viaScreeningLevel, treatAndScreen, cryotherapyGiven },
          colposcopy: {
            colposcopyDone, colposcopyIndication, scjVisibility, transformZoneType, colpoAdequacy,
            acetowhiteFindings, acetowhiteGrade, mosaicism, punctuation, atypicalVessels,
            lugoliodineResult, ifsaColpoGrade, biopsyTaken, biopsySites, endocervicalCurettage,
          },
          management: {
            histologyResult, cinGrade, histologyDetails, managementPlan, treatmentType,
            lleetzDone, lleetzMargins, excisionDepth, referralNeeded, referralDestination,
            followUpSmear, followUpInterval, testOfCure, patientCounselling, notes,
          },
          autoFlags: { urgentFlags, managementRec },
        },
      });
      setSaved(true);
      onSaved?.();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const progress = Math.round(((stage + 1) / STAGES.length) * 100);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-600 to-cyan-500 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">Cervical Screening Assessment</h1>
            <p className="text-teal-100 text-sm">Pap smear · HPV · VIA/VILI · Colposcopy · CIN management</p>
          </div>
        </div>

        {/* Management recommendation badge */}
        {managementRec && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-white/20 text-sm font-semibold">
            Recommended action: {managementRec}
          </div>
        )}

        {/* Urgent flags */}
        {urgentFlags.length > 0 && (
          <div className="mt-2 space-y-1">
            {urgentFlags.map((f, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-1.5 rounded-lg bg-red-600/80 text-white text-xs font-semibold animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{f}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-teal-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Stage tabs */}
      <div className="flex flex-wrap gap-2">
        {STAGES.map((s, i) => (
          <button key={i} type="button" onClick={() => setStage(i)}
            className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all
              ${stage === i ? 'bg-teal-600 text-white border-teal-600' : 'bg-teal-50 border-teal-300 text-teal-700'}`}>
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {/* ── Stage 0: History & Risk Factors ── */}
      {stage === 0 && (
        <Section title="History & Risk Factors" applicable={sec.history} onApplicable={v => sa('history', v)} accent="teal">
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-xs text-teal-800">
            <Info className="w-4 h-4 inline mr-1" />
            Cervical cancer is the 2nd most common cancer in Indian women (NCRP data). Age-standardised incidence ~18/100,000. Screening coverage remains very low (~30%). VIA/VILI is the primary screening tool at PHC/CHC level under the National Cancer Screening Programme.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FL label="Age (years)">
              <input type="number" value={age} onChange={e => setAge(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g., 38" />
              {Number(age) >= 30 && Number(age) <= 65 && !lastPapSmear && (
                <p className="text-xs text-orange-600 mt-1">Target screening age (30–65 years) — screen if not done</p>
              )}
            </FL>
            <FL label="Parity (GxPx)">
              <input type="text" value={parity} onChange={e => setParity(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g., G3 P3" />
            </FL>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FL label="Age at First Sexual Intercourse">
              <Pills options={['<16 years', '16–18 years', '>18 years', 'Not disclosed']}
                value={ageFirstCoitus} onChange={setAgeFirstCoitus} accent="teal" />
              {ageFirstCoitus === '<16 years' && <p className="text-xs text-orange-600 mt-1">Early coitarche — increased HPV acquisition risk</p>}
            </FL>
            <FL label="Number of Lifetime Sexual Partners">
              <Pills options={['1', '2–3', '4+', 'Not disclosed']}
                value={numberOfPartners} onChange={setNumberOfPartners} accent="teal" />
            </FL>
          </div>

          <FL label="Previous Pap Smear">
            <div className="flex gap-2 items-center flex-wrap">
              <input type="date" value={lastPapSmear} onChange={e => setLastPapSmear(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              {!lastPapSmear && Number(age) >= 30 && <span className="text-xs text-red-600 font-semibold">Never screened</span>}
            </div>
          </FL>

          <FL label="Result of Last Pap Smear">
            <Pills options={['Normal / NILM', 'ASCUS', 'LSIL', 'HSIL', 'AGC', 'Inadequate/Unsatisfactory', 'Not available', 'First screening']}
              value={lastPapResult} onChange={setLastPapResult} accent="teal" />
          </FL>

          <FL label="Screening History">
            <Pills options={['Never screened', 'Screened once', 'Irregular screening', 'Regular 3-yearly', 'Regular 5-yearly', 'Post-treatment surveillance']}
              value={screeningHistory} onChange={setScreeningHistory} accent="teal" />
          </FL>

          <hr className="border-teal-200" />
          <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">HPV Vaccination</p>

          <FL label="HPV Vaccination Status">
            <Pills options={['Fully vaccinated', 'Partially vaccinated', 'Not vaccinated', 'Unknown']}
              value={hpvVaccinationStatus} onChange={setHpvVaccinationStatus} accent="teal" />
          </FL>

          {hpvVaccinationStatus && hpvVaccinationStatus !== 'Not vaccinated' && (
            <div className="grid grid-cols-2 gap-4">
              <FL label="Vaccine Type">
                <Pills options={['Gardasil 4 (HPV 6,11,16,18)', 'Gardasil 9 (9-valent)', 'Cervarix (HPV 16,18)', 'Cervavac (India — HPV 16,18)', 'Unknown']}
                  value={hpvVaccineType} onChange={setHpvVaccineType} accent="teal" />
              </FL>
              <FL label="Doses Received">
                <Pills options={['1 dose', '2 doses (complete <15 yrs)', '3 doses (complete ≥15 yrs)']}
                  value={hpvVaccineDoses} onChange={setHpvVaccineDoses} accent="teal" />
              </FL>
            </div>
          )}

          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-xs text-teal-800">
            <Info className="w-4 h-4 inline mr-1" />
            Cervavac (Serum Institute of India) — India's indigenous HPV vaccine, cost-effective option. HPV vaccination does NOT replace cervical screening. Continue Pap/VIA even in vaccinated women.
          </div>

          <hr className="border-teal-200" />
          <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Risk Factors</p>

          <FL label="Smoking Status">
            <Pills options={['Never', 'Ex-smoker', 'Current smoker', 'Passive']}
              value={smokingStatus} onChange={setSmokingStatus} accent="teal" />
          </FL>

          <div className="grid grid-cols-2 gap-3">
            <Gate label="HIV positive or known immunosuppression?" value={hivStatus} onChange={setHivStatus} accent="orange">
              <p className="text-xs text-orange-700">HIV+ women: annual Pap smear recommended. Higher risk of persistent HPV and rapid CIN progression. ART status important.</p>
            </Gate>
            <Gate label="Other immunosuppression (transplant, steroids, immunotherapy)?" value={immunosuppression} onChange={setImmunosuppression} accent="orange">
              <p className="text-xs text-orange-700">Immunocompromised — more frequent screening, lower threshold for colposcopy.</p>
            </Gate>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Gate label="History of STI (chlamydia, herpes, syphilis)?" value={stdHistory} onChange={setStdHistory} accent="orange" />
            <Gate label="OCP use ≥5 years?" value={oralContraceptive} onChange={setOralContraceptive} accent="orange">
              <p className="text-xs text-orange-700">Long-term OCP use (≥5 yrs) — modest increased risk of cervical cancer with HPV co-infection.</p>
            </Gate>
          </div>

          <FL label="Current Symptoms" sub="(multi-select)">
            <Pills options={['None', 'Post-coital bleeding', 'Intermenstrual bleeding', 'Postmenopausal bleeding', 'Vaginal discharge (abnormal)', 'Pelvic pain', 'Visible cervical mass / ulcer', 'Low back/leg pain']}
              value={symptoms} onChange={setSymptoms} accent="teal" multi />
          </FL>

          <Gate label="Previous cervical treatment?" value={previousCervicalTx} onChange={setPreviousCervicalTx} accent="teal">
            <FL label="Type of Previous Treatment">
              <Pills options={['LEEP / LLETZ', 'Cold knife conisation (CKC)', 'Cryotherapy', 'Laser ablation', 'Diathermy', 'Hysterectomy for CIN', 'Radical hysterectomy (cancer)']}
                value={prevTxType} onChange={setPrevTxType} accent="teal" />
            </FL>
          </Gate>

          <Gate label="Family history of cervical cancer?" value={familyHistory} onChange={setFamilyHistory} accent="teal" />

          <FL label="Socioeconomic / Access Factors" sub="(multi-select)">
            <Pills options={['Rural / remote patient', 'Low literacy', 'Financial constraints', 'No prior access to screening', 'Cultural barrier to examination', 'Husband objection to examination', 'Referred by ASHA / ANM / camp']}
              value={socioeconomicFactors} onChange={setSocioeconomicFactors} accent="teal" multi />
          </FL>
        </Section>
      )}

      {/* ── Stage 1: Cytology (Pap Smear) ── */}
      {stage === 1 && (
        <Section title="Cytology (Pap Smear)" applicable={sec.cytology} onApplicable={v => sa('cytology', v)} accent="cyan">
          <div className="grid grid-cols-2 gap-4">
            <FL label="Date of Smear">
              <input type="date" value={smearDate} onChange={e => setSmearDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </FL>
            <FL label="Performed By">
              <Pills options={['Gynaecologist', 'Medical officer', 'Trained nurse/ANM', 'ASHA (camp)', 'Referral from PHC/CHC']}
                value={smearPerformedBy} onChange={setSmearPerformedBy} accent="cyan" />
            </FL>
          </div>

          <FL label="Smear Technique">
            <Pills options={['Conventional Pap (Ayre spatula + endocervical brush)', 'Liquid-based cytology (LBC — SurePath / ThinPrep)', 'Self-collected (vaginal swab for HPV + LBC)']}
              value={smearTechnique} onChange={setSmearTechnique} accent="cyan" />
          </FL>

          <FL label="Smear Adequacy">
            <Pills options={['Satisfactory', 'Satisfactory but limited (no endocervical cells)', 'Unsatisfactory / inadequate']}
              value={smearAdequacy} onChange={setSmearAdequacy} accent="cyan" />
          </FL>

          {smearAdequacy === 'Unsatisfactory / inadequate' && (
            <FL label="Reason for Inadequacy">
              <Pills options={['Insufficient cells', 'Obscuring inflammation', 'Obscuring blood', 'Obscuring lubricant', 'Drying artefact', 'Poor fixation', 'Other']}
                value={smearInadequacyReason} onChange={setSmearInadequacyReason} accent="cyan" />
            </FL>
          )}

          <FL label="Endocervical / Transformation Zone Cells">
            <Pills options={['Present', 'Absent', 'Not stated']}
              value={endocervicalCells} onChange={setEndocervicalCells} accent="cyan" />
          </FL>

          <FL label="Bethesda System Result">
            <Pills options={[
              'NILM (Negative for intraepithelial lesion or malignancy)',
              'ASCUS (Atypical squamous cells — undetermined significance)',
              'ASC-H (Atypical squamous cells — cannot exclude HSIL)',
              'LSIL (Low-grade squamous intraepithelial lesion)',
              'HSIL (High-grade squamous intraepithelial lesion)',
              'AGC — NOS (Atypical glandular cells — NOS)',
              'AGC — favour neoplastic',
              'AIS (Endocervical adenocarcinoma in situ)',
              'Squamous cell carcinoma',
              'Adenocarcinoma',
              'Other malignancy',
            ]}
              value={bethesdaResult} onChange={setBethesdaResult} accent="cyan" />
          </FL>

          {bethesdaResult && (
            <div className={`px-4 py-2 rounded-lg border text-sm font-semibold ${bethesdaColor(bethesdaResult)}`}>
              Result: {bethesdaResult}
            </div>
          )}

          {(bethesdaResult === 'LSIL' || bethesdaResult === 'HSIL') && (
            <FL label="Bethesda Subtype">
              <Pills options={bethesdaResult === 'LSIL'
                ? ['LSIL (HPV / mild dysplasia / CIN 1)']
                : ['HSIL (moderate dysplasia / CIN 2)', 'HSIL (severe dysplasia / CIN 3)', 'HSIL — feature suggesting invasion']}
                value={bethesdaSubtype} onChange={setBethesdaSubtype} accent="cyan" />
            </FL>
          )}

          <FL label="Additional Cytology Findings" sub="(multi-select)">
            <Pills options={['Trichomonas vaginalis', 'Shift in flora (bacterial vaginosis)', 'Actinomyces (IUD related)', 'Reactive cellular changes (inflammation)', 'Endometrial cells (age ≥45)', 'Glandular cells post-hysterectomy', 'Radiation change', 'IUD-related change']}
              value={additionalFindings} onChange={setAdditionalFindings} accent="cyan" multi />
          </FL>

          {additionalFindings.includes('Endometrial cells (age ≥45)') && (
            <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 text-xs text-orange-700 flex gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Endometrial cells in woman ≥45 — endometrial biopsy required to exclude endometrial pathology.
            </div>
          )}

          {/* Management recommendation from cytology */}
          {managementRec && (
            <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 text-sm font-semibold text-blue-800 flex gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Recommended action: {managementRec}</span>
            </div>
          )}
        </Section>
      )}

      {/* ── Stage 2: HPV Testing ── */}
      {stage === 2 && (
        <Section title="HPV Testing" applicable={sec.hpv} onApplicable={v => sa('hpv', v)} accent="emerald">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800">
            <Info className="w-4 h-4 inline mr-1" />
            National Cancer Screening Programme (India): HPV primary screening recommended for women aged 30–65. Self-collected vaginal samples increasingly used for rural outreach. Co-testing (HPV + cytology) improves sensitivity.
          </div>

          <FL label="HPV Test Performed?">
            <Pills options={['Yes', 'No', 'Pending']}
              value={hpvTestDone} onChange={setHpvTestDone} accent="emerald" />
          </FL>

          {hpvTestDone === 'Yes' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FL label="HPV Test Type">
                  <Pills options={['Cobas HPV (Roche)', 'Hybrid Capture 2 (HC2)', 'Aptima HPV assay', 'GeneXpert HPV', 'BD Onclarity HPV', 'Indigenously developed (NACO/ICMR)', 'Other']}
                    value={hpvTestType} onChange={setHpvTestType} accent="emerald" />
                </FL>
                <FL label="Test Date">
                  <input type="date" value={hpvTestDate} onChange={e => setHpvTestDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </FL>
              </div>

              <FL label="HPV Test Overall Result">
                <Pills options={['Negative (no high-risk HPV detected)', 'Positive (high-risk HPV detected)', 'Equivocal']}
                  value={hpvResult} onChange={setHpvResult} accent="emerald" />
              </FL>

              {hpvResult === 'Positive (high-risk HPV detected)' && (
                <>
                  <FL label="HPV 16 / 18 Genotyping">
                    <Pills options={['HPV 16 or 18 positive', 'HPV 16 positive only', 'HPV 18 positive only', 'Other high-risk HPV (not 16/18)', 'Genotyping not performed']}
                      value={hpv16or18} onChange={setHpv16or18} accent="emerald" />
                  </FL>

                  {hpv16or18 === 'HPV 16 or 18 positive' && (
                    <div className="bg-red-50 border border-red-400 rounded-lg p-3 text-xs text-red-700 font-semibold flex gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      HPV 16/18 — highest-risk types (responsible for ~70% of cervical cancers). Colposcopy required regardless of cytology result.
                    </div>
                  )}

                  <FL label="Other High-Risk HPV Types Detected" sub="(multi-select if reported)">
                    <Pills options={['HPV 31', 'HPV 33', 'HPV 45', 'HPV 52', 'HPV 58', 'HPV 35', 'HPV 39', 'HPV 51', 'HPV 56', 'HPV 59', 'HPV 68']}
                      value={hpvHighRiskType} onChange={setHpvHighRiskType} accent="emerald" multi />
                  </FL>
                </>
              )}
            </>
          )}

          {hpvTestDone === 'No' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800">
              HPV test not performed — consider HPV primary screening at next visit. HPV-only primary screening with 5-year intervals is cost-effective and sensitive.
            </div>
          )}
        </Section>
      )}

      {/* ── Stage 3: VIA / VILI ── */}
      {stage === 3 && (
        <Section title="VIA / VILI (Visual Inspection)" applicable={sec.via} onApplicable={v => sa('via', v)} accent="orange">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-800">
            <Info className="w-4 h-4 inline mr-1" />
            VIA (Visual Inspection with Acetic Acid) and VILI (Lugol's Iodine) are the mainstay of community-level cervical cancer screening in India, performed at PHC/CHC/sub-district hospital level by trained ANMs and medical officers. See-and-treat (VIA → cryotherapy) strategy is recommended at primary care level.
          </div>

          <FL label="Screening Level">
            <Pills options={['PHC level', 'CHC level', 'District hospital', 'Medical college', 'Private facility', 'Cancer screening camp']}
              value={viaScreeningLevel} onChange={setViaScreeningLevel} accent="orange" />
          </FL>

          <Gate label="VIA (Acetic Acid 3–5%) performed?" value={viaPerformed} onChange={setViaPerformed} accent="orange">
            <FL label="VIA Result">
              <Pills options={['Negative (no acetowhite lesion)', 'Positive (acetowhite lesion)', 'Suspicious for cancer', 'Inadequate (SCJ not visualised)']}
                value={viaResult} onChange={setViaResult} accent="orange" />
            </FL>

            {viaResult === 'Positive (acetowhite lesion)' && (
              <>
                <FL label="Acetowhite Area Extent">
                  <Pills options={['<25% TZ', '25–75% TZ', 'Touching os / >75% TZ', 'Satellite lesion beyond TZ']}
                    value={viaAcetowhiteArea} onChange={setViaAcetowhiteArea} accent="orange" />
                </FL>
                <FL label="Acetowhite Location" sub="(multi-select)">
                  <Pills options={['Anterior lip', 'Posterior lip', 'Right', 'Left', 'Entire ectocervix', 'Touching external os', 'Extending to endocervical canal']}
                    value={viaAcetowhiteLocation} onChange={setViaAcetowhiteLocation} accent="orange" multi />
                </FL>
              </>
            )}
          </Gate>

          <Gate label="VILI (Lugol's Iodine) performed?" value={viliPerformed} onChange={setViliPerformed} accent="orange">
            <FL label="VILI Result">
              <Pills options={['Negative (normal brown/mahogany staining)', 'Positive (yellow/mustard non-staining area)', 'Suspicious for cancer', 'Inadequate']}
                value={viliResult} onChange={setViliResult} accent="orange" />
            </FL>
            {viliResult === 'Positive (yellow/mustard non-staining area)' && (
              <FL label="Iodine-negative Area Extent">
                <Pills options={['Focal <25%', 'Moderate 25–75%', 'Extensive >75%', 'Touching os']}
                  value={viliMustardArea} onChange={setViliMustardArea} accent="orange" />
              </FL>
            )}
          </Gate>

          {(viaResult === 'Positive (acetowhite lesion)' || viliResult === 'Positive (yellow/mustard non-staining area)') && (
            <>
              <Gate label="See-and-treat approach planned (cryotherapy at same visit)?" value={treatAndScreen} onChange={setTreatAndScreen} accent="orange">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-xs text-orange-800">
                  Cryotherapy eligibility: lesion &lt;75% TZ, lesion does not extend into endocervical canal, no features of invasion, tip of cryoprobe covers lesion. Not eligible: large lesion, extending into canal, suspicious for cancer, post-treatment recurrence.
                </div>
              </Gate>
              <Gate label="Cryotherapy given at this visit?" value={cryotherapyGiven} onChange={setCryotherapyGiven} accent="orange">
                <p className="text-xs text-orange-700">Document: probe size used, freeze-thaw-freeze technique, duration, patient counselling given (watery discharge 2–4 weeks, abstain 4 weeks, return if bleeding/pain/fever).</p>
              </Gate>
            </>
          )}
        </Section>
      )}

      {/* ── Stage 4: Colposcopy ── */}
      {stage === 4 && (
        <Section title="Colposcopy" applicable={sec.colposcopy} onApplicable={v => sa('colposcopy', v)} accent="violet">
          <Gate label="Colposcopy performed at this visit?" value={colposcopyDone} onChange={setColposcopyDone} accent="violet">
            <FL label="Indication for Colposcopy" sub="(multi-select)">
              <Pills options={['HSIL / ASC-H on cytology', 'LSIL (age ≥25 or persistent)', 'ASCUS + HPV positive', 'AGC / AIS on cytology', 'HPV 16/18 positive', 'VIA positive', 'VILI positive', 'Suspicious cervix on examination', 'Post-treatment surveillance', 'Unexplained vaginal bleeding', 'Abnormal cervix']}
                value={colposcopyIndication} onChange={setColposcopyIndication} accent="violet" multi />
            </FL>

            <div className="grid grid-cols-2 gap-4">
              <FL label="Squamocolumnar Junction (SCJ) Visibility">
                <Pills options={['Type 1 (fully visible ectocervix)', 'Type 2 (partially endocervical, fully visible)', 'Type 3 (not fully visible — endocervical)']}
                  value={scjVisibility} onChange={setScjVisibility} accent="violet" />
              </FL>
              <FL label="Transformation Zone Type">
                <Pills options={['Type 1 (fully ectocervical)', 'Type 2 (partially endocervical)', 'Type 3 (entirely endocervical)']}
                  value={transformZoneType} onChange={setTransformZoneType} accent="violet" />
              </FL>
            </div>

            <FL label="Colposcopy Adequacy">
              <Pills options={['Adequate — SCJ fully visualised', 'Inadequate — SCJ not fully visualised', 'Inadequate — cervicitis / inflammation obscuring']}
                value={colpoAdequacy} onChange={setColpoAdequacy} accent="violet" />
            </FL>

            <hr className="border-violet-200" />
            <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Acetic Acid Findings</p>

            <FL label="Acetowhite Epithelium">
              <Pills options={['Absent', 'Present — thin, irregular border', 'Present — dense/thick, sharp border']}
                value={acetowhiteFindings} onChange={setAcetowhiteFindings} accent="violet" />
            </FL>

            {acetowhiteFindings && acetowhiteFindings !== 'Absent' && (
              <FL label="IFCPC Acetowhite Grade">
                <Pills options={['Grade 1 (minor — thin, irregular, indistinct border)', 'Grade 2 (major — dense/thick, distinct/sharp border, inner border, ridge sign)']}
                  value={acetowhiteGrade} onChange={setAcetowhiteGrade} accent="violet" />
              </FL>
            )}

            <div className="grid grid-cols-3 gap-3">
              <FL label="Mosaicism">
                <Pills options={['Absent', 'Fine', 'Coarse']}
                  value={mosaicism} onChange={setMosaicism} accent="violet" />
              </FL>
              <FL label="Punctuation">
                <Pills options={['Absent', 'Fine', 'Coarse']}
                  value={punctuation} onChange={setPunctuation} accent="violet" />
              </FL>
              <FL label="Atypical Vessels">
                <Pills options={['Absent', 'Present']}
                  value={atypicalVessels} onChange={setAtypicalVessels} accent="violet" />
              </FL>
            </div>

            {atypicalVessels === 'Present' && (
              <div className="bg-red-50 border border-red-400 rounded-lg p-3 text-xs text-red-700 font-semibold flex gap-2 animate-pulse">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                Atypical vessels — highly suspicious for invasive disease. Biopsy required urgently. Consider urgent oncology referral.
              </div>
            )}

            <FL label="Lugol's Iodine (VILI on colposcopy)">
              <Pills options={['Normal staining (brown/mahogany)', 'Partial non-staining', 'Complete non-staining (iodine negative)', 'Not done']}
                value={lugoliodineResult} onChange={setLugoliodineResult} accent="violet" />
            </FL>

            <FL label="IFCPC Colposcopic Grade (2011)">
              <Pills options={['Normal colposcopy', 'Grade 1 (minor) — correlates CIN 1', 'Grade 2 (major) — correlates CIN 2/3', 'Suspected invasion', 'Non-specific — atrophic/inflammation/congenital transformation zone']}
                value={ifsaColpoGrade} onChange={setIfsaColpoGrade} accent="violet" />
            </FL>

            <Gate label="Biopsy taken?" value={biopsyTaken} onChange={setBiopsyTaken} accent="violet">
              <FL label="Biopsy Sites" sub="(multi-select)">
                <Pills options={['Most abnormal area (directed biopsy)', '12 o\'clock position', '3 o\'clock position', '6 o\'clock position', '9 o\'clock position', 'Random biopsies (no lesion seen)', 'Multiple quadrants']}
                  value={biopsySites} onChange={setBiopsySites} accent="violet" multi />
              </FL>
              <Gate label="Endocervical curettage (ECC) performed?" value={endocervicalCurettage} onChange={setEndocervicalCurettage} accent="violet">
                <p className="text-xs text-violet-700">ECC indicated when SCJ not fully visualised (Type 2/3 TZ), AGC on cytology, AIS, or inadequate colposcopy.</p>
              </Gate>
            </Gate>
          </Gate>
        </Section>
      )}

      {/* ── Stage 5: Histology & Management ── */}
      {stage === 5 && (
        <Section title="Histology & Management Plan" applicable={sec.management} onApplicable={v => sa('management', v)} accent="green">
          <FL label="Histology Result">
            <Pills options={['Normal / reactive changes', 'CIN 1 (mild dysplasia)', 'CIN 2 (moderate dysplasia)', 'CIN 2-3', 'CIN 3 (severe dysplasia / CIS)', 'AIS (adenocarcinoma in situ)', 'Microinvasive carcinoma (Stage IA1)', 'Invasive carcinoma', 'Insufficient tissue / non-diagnostic', 'Awaiting result']}
              value={histologyResult} onChange={setHistologyResult} accent="green" />
          </FL>

          {histologyResult && histologyResult !== 'Normal / reactive changes' && histologyResult !== 'Awaiting result' && (
            <FL label="CIN / Histology Grade">
              <Pills options={['CIN 1', 'CIN 2', 'CIN 3', 'AIS', 'Microinvasive', 'Invasive squamous cell', 'Invasive adenocarcinoma', 'Other malignancy']}
                value={cinGrade} onChange={setCinGrade} accent="green" />
            </FL>
          )}

          <FL label="Histology Details / Free Text">
            <textarea rows={2} value={histologyDetails} onChange={e => setHistologyDetails(e.target.value)}
              placeholder="Pathologist report summary, HPV type reported, margins..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </FL>

          <FL label="Management Plan">
            <Pills options={[
              'Routine screening — repeat Pap in 3 years',
              'Repeat co-test (Pap + HPV) in 1 year',
              'Repeat Pap in 6 months',
              'Refer for colposcopy',
              'Conservative management (observe — CIN 1)',
              'Ablative therapy (cryotherapy / laser)',
              'LEEP / LLETZ (excisional)',
              'Cold knife conisation (CKC)',
              'Hysterectomy (LLETZ not feasible / post-treatment recurrence)',
              'Gynaecological oncology referral',
              'Palliative / supportive care',
            ]}
              value={managementPlan} onChange={setManagementPlan} accent="green" />
          </FL>

          {managementRec && (
            <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 text-sm text-blue-800 font-semibold flex gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              Auto-recommendation: {managementRec}
            </div>
          )}

          <FL label="Treatment Performed" sub="(multi-select)">
            <Pills options={['Cryotherapy (VIA+ve)', 'LEEP / LLETZ', 'Cold knife conisation', 'Laser ablation', 'Laser conisation', 'Hysterectomy', 'None at this visit']}
              value={treatmentType} onChange={setTreatmentType} accent="green" multi />
          </FL>

          {(treatmentType.includes('LEEP / LLETZ') || treatmentType.includes('Cold knife conisation')) && (
            <Gate label="LEEP / LLETZ / Cone performed?" value={lleetzDone} onChange={setLleetzDone} accent="green">
              <div className="grid grid-cols-2 gap-4">
                <FL label="Excision Margins">
                  <Pills options={['Clear (>1 mm)', 'Close (<1 mm)', 'Involved (positive margins)', 'Cannot be assessed']}
                    value={lleetzMargins} onChange={setLleetzMargins} accent="green" />
                </FL>
                <FL label="Excision Depth">
                  <input type="text" value={excisionDepth} onChange={e => setExcisionDepth(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g., 15 mm" />
                </FL>
              </div>
              {lleetzMargins === 'Involved (positive margins)' && (
                <div className="bg-orange-50 border border-orange-300 rounded-lg p-2 text-xs text-orange-700 flex gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  Positive excision margins — increased risk of residual/recurrent disease. Consider repeat excision (re-LLETZ or CKC) or hysterectomy if complete. Discuss with senior.
                </div>
              )}
            </Gate>
          )}

          <Gate label="Referral to higher centre required?" value={referralNeeded} onChange={setReferralNeeded} accent="green">
            <FL label="Referral Destination">
              <Pills options={['Gynaecological oncology — cancer unit', 'Regional cancer centre (RCC)', 'Medical college gynaecology', 'District hospital specialist', 'AIIMS / Tata Memorial / state tertiary centre']}
                value={referralDestination} onChange={setReferralDestination} accent="green" />
            </FL>
          </Gate>

          <FL label="Follow-Up Smear Required?">
            <Pills options={['Yes', 'No — returned to routine screening']}
              value={followUpSmear} onChange={setFollowUpSmear} accent="green" />
          </FL>

          {followUpSmear === 'Yes' && (
            <FL label="Follow-Up Interval">
              <Pills options={['6 months', '1 year', '18 months', '2 years', '3 years', '5 years (routine resumption)']}
                value={followUpInterval} onChange={setFollowUpInterval} accent="green" />
            </FL>
          )}

          <FL label="Test of Cure (Post-treatment)">
            <Pills options={['Co-test (HPV + cytology) at 6 months', 'Cytology only at 6 months', 'HPV-only at 6 months', 'Colposcopy at 6 months', 'Not applicable', 'Not yet planned']}
              value={testOfCure} onChange={setTestOfCure} accent="green" />
          </FL>

          <FL label="Patient Counselling Provided" sub="(multi-select)">
            <Pills options={[
              'HPV transmission explained (not shameful — common infection)',
              'Cervical screening importance explained in local language',
              'Partner notification / testing discussed',
              'HPV vaccination offered (if age <45 and not fully vaccinated)',
              'Condom use reduces HPV transmission',
              'Smoking cessation counselling',
              'Post-LLETZ instructions (discharge, abstinence, warning signs)',
              'Post-cryotherapy care explained',
              'Follow-up appointment given',
              'Referral letter / summary given to patient',
            ]}
              value={patientCounselling} onChange={setPatientCounselling} accent="green" multi />
          </FL>

          <FL label="Clinician Notes">
            <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Clinical impression, differential, plan, colposcopy drawing notes..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </FL>
        </Section>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button type="button" disabled={stage === 0} onClick={() => setStage(s => s - 1)}
          className="px-4 py-2 rounded-lg border border-teal-300 text-teal-700 text-sm font-semibold disabled:opacity-40">
          ← Previous
        </button>
        <span className="text-xs text-gray-500">Stage {stage + 1} of {STAGES.length}</span>
        {stage < STAGES.length - 1 ? (
          <button type="button" onClick={() => setStage(s => s + 1)}
            className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold">
            Next →
          </button>
        ) : (
          <button type="button" onClick={handleSave} disabled={saving || saved}
            className="px-6 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center gap-2">
            {saved ? <><CheckCircle className="w-4 h-4" /> Saved</> : saving ? 'Saving…' : 'Save Assessment'}
          </button>
        )}
      </div>
    </div>
  );
}
