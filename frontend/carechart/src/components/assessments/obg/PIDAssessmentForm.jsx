/**
 * @shared-pool
 * PIDAssessmentForm — Pelvic Inflammatory Disease clinical assessment
 * Covers: CDC diagnostic criteria, Fitz-Hugh-Curtis, TOA, antibiotic regimes,
 * partner notification, Indian NACO/STI clinic context
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */

import React, { useState, useMemo } from 'react';
import { Activity, ChevronDown, ChevronUp, Lock, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import api from '../../../api/client';

/* ── accent palette ── */
const A = {
  red:     { bg: 'bg-red-50',     border: 'border-red-300',    text: 'text-red-700',     pill: 'bg-red-100 border-red-400 text-red-800',     active: 'bg-red-600 text-white border-red-600' },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-300',   text: 'text-rose-700',    pill: 'bg-rose-100 border-rose-400 text-rose-800',    active: 'bg-rose-600 text-white border-rose-600' },
  orange:  { bg: 'bg-orange-50',  border: 'border-orange-300', text: 'text-orange-700',  pill: 'bg-orange-100 border-orange-400 text-orange-800',  active: 'bg-orange-500 text-white border-orange-500' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-300',  text: 'text-amber-700',   pill: 'bg-amber-100 border-amber-400 text-amber-800',   active: 'bg-amber-500 text-white border-amber-500' },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-300', text: 'text-violet-700',  pill: 'bg-violet-100 border-violet-400 text-violet-800',  active: 'bg-violet-600 text-white border-violet-600' },
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-300',   text: 'text-blue-700',    pill: 'bg-blue-100 border-blue-400 text-blue-800',    active: 'bg-blue-600 text-white border-blue-600' },
  green:   { bg: 'bg-green-50',   border: 'border-green-300',  text: 'text-green-700',   pill: 'bg-green-100 border-green-400 text-green-800',   active: 'bg-green-600 text-white border-green-600' },
  teal:    { bg: 'bg-teal-50',    border: 'border-teal-300',   text: 'text-teal-700',    pill: 'bg-teal-100 border-teal-400 text-teal-800',    active: 'bg-teal-600 text-white border-teal-600' },
};

/* ── Pills ── */
function Pills({ options, value, onChange, accent = 'red', multi = false }) {
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
function Gate({ label, value, onChange, accent = 'red', children }) {
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
function Section({ title, applicable, onApplicable, accent = 'red', children }) {
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

const STAGES = [
  'History & Risk Factors',
  'Clinical Assessment (CDC Criteria)',
  'Investigations',
  'Complications (TOA / Fitz-Hugh-Curtis)',
  'Treatment',
  'Partner Management & Follow-up',
];

export default function PIDAssessmentForm({ patientId, encounterId, onSaved }) {
  const [stage, setStage] = useState(0);
  const [sec, setSec] = useState({
    history: 'Applicable', clinical: 'Applicable', investigations: 'Applicable',
    complications: 'Applicable', treatment: 'Applicable', partner: 'Applicable',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  /* ── Stage 0: History & Risk Factors ── */
  const [age, setAge] = useState('');
  const [lmp, setLmp] = useState('');
  const [pregnancyTest, setPregnancyTest] = useState('');
  const [contraception, setContraception] = useState('');
  const [iudPresent, setIudPresent] = useState('');
  const [iudType, setIudType] = useState('');
  const [iudInsertionDate, setIudInsertionDate] = useState('');
  const [recentInstrumentation, setRecentInstrumentation] = useState('');
  const [instrumentationDetail, setInstrumentationDetail] = useState([]);
  const [numberOfPartners, setNumberOfPartners] = useState('');
  const [newPartnerRecent, setNewPartnerRecent] = useState('');
  const [partnerSymptomatic, setPartnerSymptomatic] = useState('');
  const [stdHistory, setStdHistory] = useState([]);
  const [previousPid, setPreviousPid] = useState('');
  const [previousPidCount, setPreviousPidCount] = useState('');
  const [smokingStatus, setSmokingStatus] = useState('');
  const [hivStatus, setHivStatus] = useState('');
  const [symptoms, setSymptoms] = useState([]);
  const [symptomOnset, setSymptomOnset] = useState('');
  const [symptomDuration, setSymptomDuration] = useState('');
  const [sexuallyActive, setSexuallyActive] = useState('');

  /* ── Stage 1: Clinical Assessment ── */
  // CDC Minimum Criteria
  const [uterineTenderness, setUterineTenderness] = useState('');
  const [adnexalTenderness, setAdnexalTenderness] = useState('');
  const [cervicalMotionTenderness, setCervicalMotionTenderness] = useState('');
  // Additional criteria
  const [temperature, setTemperature] = useState('');
  const [mucopurulentDischarge, setMucopurulentDischarge] = useState('');
  const [wbcOnWetPrep, setWbcOnWetPrep] = useState('');
  const [elevatedCrp, setElevatedCrp] = useState('');
  const [elevatedEsr, setElevatedEsr] = useState('');
  const [confirmedGcOrChlamydia, setConfirmedGcOrChlamydia] = useState('');
  // Examination
  const [abdomenFindings, setAbdomenFindings] = useState([]);
  const [cervixAppearance, setCervixAppearance] = useState([]);
  const [adnexalMass, setAdnexalMass] = useState('');
  const [adnexalMassSide, setAdnexalMassSide] = useState('');
  const [peritoneism, setPeritoneism] = useState('');
  const [ruhSignRif, setRuhSignRif] = useState('');
  const [fitzHughCurtisSuspect, setFitzHughCurtisSuspect] = useState('');
  const [severity, setSeverity] = useState('');

  /* ── Stage 2: Investigations ── */
  const [hcgResult, setHcgResult] = useState('');
  const [wbc, setWbc] = useState('');
  const [neutrophils, setNeutrophils] = useState('');
  const [crpValue, setCrpValue] = useState('');
  const [esrValue, setEsrValue] = useState('');
  const [hbValue, setHbValue] = useState('');
  const [hvsSwab, setHvsSwab] = useState('');
  const [hvsResult, setHvsResult] = useState([]);
  const [endocervicalSwab, setEndocervicalSwab] = useState('');
  const [endocervicalResult, setEndocervicalResult] = useState([]);
  const [naat, setNaat] = useState('');
  const [naatResult, setNaatResult] = useState('');
  const [urine, setUrine] = useState('');
  const [urineResult, setUrineResult] = useState('');
  const [tvsScan, setTvsScan] = useState('');
  const [tvsScanFindings, setTvsScanFindings] = useState([]);
  const [laparoscopy, setLaparoscopy] = useState('');
  const [laparoscopyFindings, setLaparoscopyFindings] = useState([]);
  const [liverFunctionTests, setLiverFunctionTests] = useState('');

  /* ── Stage 3: Complications ── */
  const [toaConfirmed, setToaConfirmed] = useState('');
  const [toaSide, setToaSide] = useState('');
  const [toaSize, setToaSize] = useState('');
  const [toaRupture, setToaRupture] = useState('');
  const [fitzHughCurtis, setFitzHughCurtis] = useState('');
  const [fhcFeatures, setFhcFeatures] = useState([]);
  const [chronicPelvicPain, setChronicPelvicPain] = useState('');
  const [infertilityRisk, setInfertilityRisk] = useState('');
  const [ectopicRisk, setEctopicRisk] = useState('');
  const [previousEctopic, setPreviousEctopic] = useState('');
  const [sepsis, setSepsis] = useState('');
  const [sepsisFeatures, setSepsisFeatures] = useState([]);

  /* ── Stage 4: Treatment ── */
  const [managementSetting, setManagementSetting] = useState('');
  const [admissionIndications, setAdmissionIndications] = useState([]);
  const [antibioticRegime, setAntibioticRegime] = useState('');
  const [outpatientRegime, setOutpatientRegime] = useState('');
  const [inpatientRegime, setInpatientRegime] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [iudManagement, setIudManagement] = useState('');
  const [analgesiaGiven, setAnalgesiaGiven] = useState([]);
  const [surgicalIntervention, setSurgicalIntervention] = useState('');
  const [surgicalDetails, setSurgicalDetails] = useState([]);
  const [nssaids, setNssaids] = useState('');
  const [ivFluids, setIvFluids] = useState('');
  const [responseToTreatment, setResponseToTreatment] = useState('');

  /* ── Stage 5: Partner Management & Follow-up ── */
  const [partnerNotification, setPartnerNotification] = useState('');
  const [partnerTreatment, setPartnerTreatment] = useState('');
  const [partnerTreatmentRegime, setPartnerTreatmentRegime] = useState('');
  const [stiScreeningComplete, setStiScreeningComplete] = useState('');
  const [hivTesting, setHivTesting] = useState('');
  const [hepatitisTesting, setHepatitisTesting] = useState('');
  const [syphilisTesting, setSyphilisTesting] = useState('');
  const [counselling, setCounselling] = useState([]);
  const [contraceptionCounselling, setContraceptionCounselling] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpPlan, setFollowUpPlan] = useState([]);
  const [nacoReferral, setNacoReferral] = useState('');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /* ── AUTO: CDC minimum criteria met ── */
  const minimumCriteriaMet = useMemo(() => {
    return uterineTenderness === 'Present' ||
      adnexalTenderness === 'Present' ||
      cervicalMotionTenderness === 'Present';
  }, [uterineTenderness, adnexalTenderness, cervicalMotionTenderness]);

  /* ── AUTO: Additional supporting criteria count ── */
  const additionalCriteriaCount = useMemo(() => {
    let count = 0;
    if (Number(temperature) > 38.3) count++;
    if (mucopurulentDischarge === 'Yes') count++;
    if (wbcOnWetPrep === 'Yes') count++;
    if (elevatedCrp === 'Yes' || Number(crpValue) > 6) count++;
    if (elevatedEsr === 'Yes' || Number(esrValue) > 20) count++;
    if (confirmedGcOrChlamydia === 'Yes') count++;
    return count;
  }, [temperature, mucopurulentDischarge, wbcOnWetPrep, elevatedCrp, crpValue, elevatedEsr, esrValue, confirmedGcOrChlamydia]);

  /* ── AUTO: Urgent / alert flags ── */
  const urgentAlerts = useMemo(() => {
    const a = [];
    if (pregnancyTest === 'Positive') a.push('Positive pregnancy test — consider ectopic pregnancy (NOT PID). Urgent US + gynaecology assessment');
    if (toaRupture === 'Yes') a.push('RUPTURED TOA — SURGICAL EMERGENCY. Immediate laparotomy / laparoscopy required');
    if (sepsis === 'Yes') a.push('SEPSIS suspected — IV antibiotics, resuscitation, ICU/HDU consideration. Follow Surviving Sepsis guidelines');
    if (toaConfirmed === 'Yes') a.push('Tubo-ovarian abscess (TOA) confirmed — IV antibiotic therapy; surgical drainage if no response in 48–72 hrs');
    if (fitzHughCurtis === 'Yes') a.push('Fitz-Hugh-Curtis syndrome — perihepatitis complicating PID. RUQ pain with PID = Fitz-Hugh-Curtis until proven otherwise');
    if (peritoneism === 'Yes') a.push('Peritonism / guarding present — consider TOA rupture / appendicitis / other acute abdomen. Surgery may be required');
    if (iudPresent === 'Yes' && minimumCriteriaMet) a.push('IUD in situ with PID — discuss IUD removal (improves response) vs. retain; consult guidelines / senior');
    return a;
  }, [pregnancyTest, toaRupture, sepsis, toaConfirmed, fitzHughCurtis, peritoneism, iudPresent, minimumCriteriaMet]);

  /* ── AUTO: Diagnosis confidence ── */
  const diagnosisConfidence = useMemo(() => {
    if (!minimumCriteriaMet) return null;
    if (additionalCriteriaCount >= 3) return { label: 'PID — High confidence', color: 'bg-red-100 border-red-400 text-red-800' };
    if (additionalCriteriaCount >= 1) return { label: 'PID — Moderate confidence', color: 'bg-orange-100 border-orange-400 text-orange-800' };
    return { label: 'PID — Empirical (minimum criteria only)', color: 'bg-yellow-100 border-yellow-400 text-yellow-800' };
  }, [minimumCriteriaMet, additionalCriteriaCount]);

  /* ── Save ── */
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/assessments', {
        type: 'pid_assessment',
        patientId, encounterId,
        data: {
          history: {
            age, lmp, pregnancyTest, contraception, iudPresent, iudType, iudInsertionDate,
            recentInstrumentation, instrumentationDetail, numberOfPartners, newPartnerRecent,
            partnerSymptomatic, stdHistory, previousPid, previousPidCount, smokingStatus,
            hivStatus, symptoms, symptomOnset, symptomDuration, sexuallyActive,
          },
          clinical: {
            cdcMinimum: { uterineTenderness, adnexalTenderness, cervicalMotionTenderness },
            cdcAdditional: { temperature, mucopurulentDischarge, wbcOnWetPrep, elevatedCrp, elevatedEsr, confirmedGcOrChlamydia },
            examination: { abdomenFindings, cervixAppearance, adnexalMass, adnexalMassSide, peritoneism, ruhSignRif, fitzHughCurtisSuspect, severity },
            diagnosis: { minimumCriteriaMet, additionalCriteriaCount, diagnosisConfidence },
          },
          investigations: {
            hcgResult, wbc, neutrophils, crpValue, esrValue, hbValue,
            hvsSwab, hvsResult, endocervicalSwab, endocervicalResult,
            naat, naatResult, urine, urineResult,
            tvsScan, tvsScanFindings, laparoscopy, laparoscopyFindings, liverFunctionTests,
          },
          complications: {
            toaConfirmed, toaSide, toaSize, toaRupture,
            fitzHughCurtis, fhcFeatures,
            chronicPelvicPain, infertilityRisk, ectopicRisk, previousEctopic,
            sepsis, sepsisFeatures,
          },
          treatment: {
            managementSetting, admissionIndications, antibioticRegime, outpatientRegime,
            inpatientRegime, durationDays, iudManagement, analgesiaGiven, surgicalIntervention,
            surgicalDetails, nssaids, ivFluids, responseToTreatment,
          },
          partnerMgmt: {
            partnerNotification, partnerTreatment, partnerTreatmentRegime,
            stiScreeningComplete, hivTesting, hepatitisTesting, syphilisTesting,
            counselling, contraceptionCounselling, followUpDate, followUpPlan,
            nacoReferral, notes,
          },
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
      <div className="rounded-2xl bg-gradient-to-r from-rose-700 to-red-500 p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">PID Assessment</h1>
            <p className="text-rose-100 text-sm">CDC criteria · TOA · Fitz-Hugh-Curtis · Antibiotic management</p>
          </div>
        </div>

        {/* Diagnosis badge */}
        {diagnosisConfidence && (
          <div className={`mt-2 px-3 py-2 rounded-lg border text-sm font-bold ${diagnosisConfidence.color}`}>
            {diagnosisConfidence.label} · {additionalCriteriaCount} additional criteria met
          </div>
        )}
        {!minimumCriteriaMet && (uterineTenderness || adnexalTenderness || cervicalMotionTenderness) && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-yellow-400/30 text-sm text-white font-semibold">
            CDC minimum criteria NOT met — empiric treatment still indicated if high clinical suspicion
          </div>
        )}

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
      </div>

      {/* Progress */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-rose-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Stage tabs */}
      <div className="flex flex-wrap gap-2">
        {STAGES.map((s, i) => (
          <button key={i} type="button" onClick={() => setStage(i)}
            className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all
              ${stage === i ? 'bg-rose-600 text-white border-rose-600' : 'bg-rose-50 border-rose-300 text-rose-700'}`}>
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {/* ── Stage 0: History & Risk Factors ── */}
      {stage === 0 && (
        <Section title="History & Risk Factors" applicable={sec.history} onApplicable={v => sa('history', v)} accent="rose">
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800">
            <Info className="w-4 h-4 inline mr-1" />
            PID is the leading cause of preventable infertility in India. Predominantly young, sexually active women. Causative organisms: N. gonorrhoeae, C. trachomatis, anaerobes, and endogenous vaginal flora. Early empiric treatment is essential — delay worsens outcomes.
          </div>

          <FL label="Age (years)">
            <input type="number" value={age} onChange={e => setAge(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g., 24" />
            {Number(age) < 25 && age && <p className="text-xs text-orange-600 mt-1">Age &lt;25 — highest risk group for PID</p>}
          </FL>

          <FL label="LMP">
            <input type="date" value={lmp} onChange={e => setLmp(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </FL>

          <FL label="Pregnancy Test Result">
            <Pills options={['Negative', 'Positive', 'Not done', 'Awaiting']}
              value={pregnancyTest} onChange={setPregnancyTest} accent="rose" />
          </FL>

          {pregnancyTest === 'Positive' && (
            <div className="bg-red-100 border border-red-500 rounded-lg p-3 text-sm text-red-800 font-bold flex gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              POSITIVE PREGNANCY TEST — Exclude ectopic pregnancy first. PID in pregnancy is possible but rare. Do not diagnose PID without ruling out ectopic. Urgent TVUS + obstetric/gynae review.
            </div>
          )}

          <FL label="Contraception Method">
            <Pills options={['None', 'Copper IUCD (Cu-T 380A)', 'LNG-IUS (Mirena)', 'Combined OCP', 'Progesterone-only pill', 'DMPA injection', 'Condoms', 'Permanent sterilisation', 'Barrier (diaphragm)', 'Natural methods']}
              value={contraception} onChange={setContraception} accent="rose" />
          </FL>

          {(contraception === 'Copper IUCD (Cu-T 380A)' || contraception === 'LNG-IUS (Mirena)') && (
            <Gate label="IUD in situ confirmed?" value={iudPresent} onChange={setIudPresent} accent="rose">
              <div className="grid grid-cols-2 gap-3">
                <FL label="IUCD Type">
                  <Pills options={['Copper T 200', 'Copper T 380A (most common in India)', 'LNG-IUS (Mirena)', 'Unknown type']}
                    value={iudType} onChange={setIudType} accent="rose" />
                </FL>
                <FL label="Date of IUCD Insertion">
                  <input type="date" value={iudInsertionDate} onChange={e => setIudInsertionDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </FL>
              </div>
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-2 text-xs text-amber-800">
                IUD and PID: risk is highest in first 3 weeks post-insertion. IUCD does not need to be removed routinely — decision depends on severity, organisms, and response to treatment. Discuss with patient about fertility plans before removal.
              </div>
            </Gate>
          )}

          <Gate label="Recent uterine instrumentation (within 4 weeks)?" value={recentInstrumentation} onChange={setRecentInstrumentation} accent="rose">
            <FL label="Type of Instrumentation" sub="(multi-select)">
              <Pills options={['IUCD insertion', 'IUCD removal', 'Endometrial biopsy', 'D&C / MVA', 'Hysteroscopy', 'Hysterosalpingography (HSG)', 'Medical termination of pregnancy (MTP)', 'Surgical TOP', 'IVF embryo transfer']}
                value={instrumentationDetail} onChange={setInstrumentationDetail} accent="rose" multi />
            </FL>
          </Gate>

          <FL label="Sexual Activity">
            <Pills options={['Currently sexually active', 'Not currently active', 'Declined to disclose']}
              value={sexuallyActive} onChange={setSexuallyActive} accent="rose" />
          </FL>

          <div className="grid grid-cols-2 gap-4">
            <FL label="Number of Partners (12 months)">
              <Pills options={['1', '2', '3+', 'Not disclosed']}
                value={numberOfPartners} onChange={setNumberOfPartners} accent="rose" />
            </FL>
            <Gate label="New partner in last 3 months?" value={newPartnerRecent} onChange={setNewPartnerRecent} accent="rose" />
          </div>

          <Gate label="Partner has symptoms (urethral discharge, dysuria)?" value={partnerSymptomatic} onChange={setPartnerSymptomatic} accent="rose">
            <p className="text-xs text-rose-700">Symptomatic partner — strong epidemiological link; expedited partner treatment essential.</p>
          </Gate>

          <FL label="Previous STI History" sub="(multi-select)">
            <Pills options={['Chlamydia', 'Gonorrhoea', 'Trichomoniasis', 'Herpes (HSV)', 'Syphilis', 'Bacterial vaginosis (recurrent)', 'None known', 'Unknown / not tested']}
              value={stdHistory} onChange={setStdHistory} accent="rose" multi />
          </FL>

          <Gate label="Previous episode of PID?" value={previousPid} onChange={setPreviousPid} accent="rose">
            <FL label="Number of Previous Episodes">
              <Pills options={['1', '2', '3+']}
                value={previousPidCount} onChange={setPreviousPidCount} accent="rose" />
            </FL>
            <p className="text-xs text-rose-700">Each PID episode increases tubal damage and subsequent ectopic/infertility risk. 3+ episodes — infertility risk &gt;50%.</p>
          </Gate>

          <div className="grid grid-cols-2 gap-3">
            <FL label="Smoking Status">
              <Pills options={['Never', 'Ex-smoker', 'Current smoker']}
                value={smokingStatus} onChange={setSmokingStatus} accent="rose" />
            </FL>
            <Gate label="Known HIV positive?" value={hivStatus} onChange={setHivStatus} accent="red">
              <p className="text-xs text-red-700">HIV+ — more severe PID, higher TOA rate, atypical organisms possible. Consider broader spectrum antibiotics. Manage at higher-level facility.</p>
            </Gate>
          </div>

          <FL label="Presenting Symptoms" sub="(multi-select)">
            <Pills options={[
              'Lower abdominal / pelvic pain', 'Bilateral pelvic pain', 'Unilateral pelvic pain',
              'Vaginal discharge (purulent/mucopurulent)', 'Deep dyspareunia', 'Dysmenorrhoea (new/worsened)',
              'Irregular vaginal bleeding', 'Post-coital bleeding',
              'Fever / chills', 'Nausea / vomiting', 'Right upper quadrant pain (Fitz-Hugh-Curtis)',
              'Dysuria / urinary frequency', 'Backache', 'Rectal discomfort',
            ]}
              value={symptoms} onChange={setSymptoms} accent="rose" multi />
          </FL>

          {symptoms.includes('Right upper quadrant pain (Fitz-Hugh-Curtis)') && (
            <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 text-xs text-orange-700 flex gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              RUQ pain + pelvic pain — Fitz-Hugh-Curtis syndrome (gonococcal/chlamydial perihepatitis). Violin-string adhesions between liver capsule and anterior abdominal wall on laparoscopy. Liver function tests + USS liver required.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FL label="Symptom Onset">
              <Pills options={['Sudden', 'Gradual', 'Related to menses', 'Post-instrumentation', 'Post-delivery']}
                value={symptomOnset} onChange={setSymptomOnset} accent="rose" />
            </FL>
            <FL label="Duration">
              <Pills options={['<24 hours', '1–3 days', '4–7 days', '>1 week', '>2 weeks']}
                value={symptomDuration} onChange={setSymptomDuration} accent="rose" />
            </FL>
          </div>
        </Section>
      )}

      {/* ── Stage 1: Clinical Assessment ── */}
      {stage === 1 && (
        <Section title="Clinical Assessment (CDC Criteria)" applicable={sec.clinical} onApplicable={v => sa('clinical', v)} accent="red">
          <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-xs text-red-800">
            <strong>CDC 2021 — Minimum Criteria for Empiric Treatment:</strong> Any ONE of the three findings below is sufficient to start treatment in a sexually active woman with pelvic pain and no other identifiable cause. Higher specificity criteria should be sought but treatment should NOT be delayed.
          </div>

          <p className="text-sm font-bold text-red-700 uppercase tracking-wide">Minimum Criteria (any ONE = treat)</p>
          <div className="space-y-2">
            {[
              { label: 'Uterine Tenderness', value: uterineTenderness, onChange: setUterineTenderness },
              { label: 'Adnexal Tenderness', value: adnexalTenderness, onChange: setAdnexalTenderness },
              { label: 'Cervical Motion Tenderness (Chandelier sign)', value: cervicalMotionTenderness, onChange: setCervicalMotionTenderness },
            ].map(({ label, value, onChange }) => (
              <div key={label} className={`flex items-center justify-between px-4 py-3 rounded-lg border-2 ${value === 'Present' ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                <span className="text-sm font-medium">{label}</span>
                <div className="flex gap-2">
                  {['Present', 'Absent', 'Not assessed'].map(opt => (
                    <button key={opt} type="button" onClick={() => onChange(opt)}
                      className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all
                        ${value === opt
                          ? opt === 'Present' ? 'bg-red-600 text-white border-red-600' : 'bg-gray-500 text-white border-gray-500'
                          : 'bg-red-50 border-red-300 text-red-700'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {minimumCriteriaMet && (
            <div className="bg-red-100 border-2 border-red-400 rounded-lg px-4 py-2 text-sm font-bold text-red-800">
              ✓ Minimum criteria MET — empiric antibiotic treatment is indicated
            </div>
          )}

          <hr className="border-red-200" />
          <p className="text-sm font-bold text-orange-700 uppercase tracking-wide">Additional Supporting Criteria ({additionalCriteriaCount}/6)</p>

          <div className="grid grid-cols-2 gap-4">
            <FL label="Temperature">
              <input type="number" step="0.1" value={temperature} onChange={e => setTemperature(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="°C" />
              {Number(temperature) > 38.3 && <p className="text-xs text-red-600 mt-1">Fever &gt;38.3°C ✓ (additional criterion)</p>}
            </FL>
            <FL label="WBC on saline wet prep of vaginal secretions">
              <Pills options={['Yes (WBC present)', 'No', 'Not done']}
                value={wbcOnWetPrep} onChange={setWbcOnWetPrep} accent="red" />
            </FL>
          </div>

          <FL label="Mucopurulent cervical/vaginal discharge on examination">
            <Pills options={['Yes', 'No', 'Minimal / unclear']}
              value={mucopurulentDischarge} onChange={setMucopurulentDischarge} accent="red" />
          </FL>

          <div className="grid grid-cols-2 gap-3">
            <Gate label="Elevated CRP / ESR?" value={elevatedCrp} onChange={setElevatedCrp} accent="orange" />
            <Gate label="Lab-confirmed GC / Chlamydia?" value={confirmedGcOrChlamydia} onChange={setConfirmedGcOrChlamydia} accent="orange" />
          </div>

          <hr className="border-red-200" />
          <p className="text-sm font-bold text-red-700 uppercase tracking-wide">Abdominal & Pelvic Examination</p>

          <FL label="Abdominal Findings" sub="(multi-select)">
            <Pills options={['Soft abdomen', 'Lower abdominal tenderness', 'Bilateral iliac fossa tenderness', 'Rebound tenderness', 'Guarding', 'Rigidity', 'Mass palpable', 'RUQ tenderness (Fitz-Hugh-Curtis)', 'Normal']}
              value={abdomenFindings} onChange={setAbdomenFindings} accent="red" multi />
          </FL>

          <Gate label="Peritonism / Guarding present?" value={peritoneism} onChange={setPeritoneism} accent="red">
            <div className="bg-red-100 border border-red-400 rounded-lg p-2 text-xs text-red-700 font-semibold">
              Peritonism — consider TOA rupture, appendicitis, or other acute abdomen. Surgical emergency may be needed. CT/USS abdomen + surgery review.
            </div>
          </Gate>

          <FL label="Cervix Appearance" sub="(multi-select)">
            <Pills options={['Normal', 'Mucopurulent discharge from os', 'Cervicitis / friability', 'Contact bleeding', 'Ulceration / lesion']}
              value={cervixAppearance} onChange={setCervixAppearance} accent="red" multi />
          </FL>

          <Gate label="Adnexal mass palpable?" value={adnexalMass} onChange={setAdnexalMass} accent="red">
            <FL label="Side">
              <Pills options={['Right adnexa', 'Left adnexa', 'Bilateral', 'Midline mass']}
                value={adnexalMassSide} onChange={setAdnexalMassSide} accent="red" />
            </FL>
          </Gate>

          <FL label="Clinical Severity Assessment">
            <Pills options={['Mild (outpatient — no systemic features)', 'Moderate (outpatient or short admission)', 'Severe (inpatient — fever, vomiting, peritonism, TOA)', 'Critical (TOA rupture / sepsis)']}
              value={severity} onChange={setSeverity} accent="red" />
          </FL>

          <Gate label="Fitz-Hugh-Curtis syndrome suspected?" value={fitzHughCurtisSuspect} onChange={setFitzHughCurtisSuspect} accent="orange">
            <p className="text-xs text-orange-700">Perihepatitis — sharp right upper quadrant pain, pleuritic component, worse with movement. Diagnosis usually clinical or laparoscopic. LFTs usually mildly elevated. USS liver may show "violin string" adhesions in late stage.</p>
          </Gate>
        </Section>
      )}

      {/* ── Stage 2: Investigations ── */}
      {stage === 2 && (
        <Section title="Investigations" applicable={sec.investigations} onApplicable={v => sa('investigations', v)} accent="violet">
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-xs text-violet-800">
            <Info className="w-4 h-4 inline mr-1" />
            No single investigation diagnoses PID — diagnosis remains clinical. Investigations help confirm, assess severity, and guide antibiotic choice. Do NOT delay treatment pending results.
          </div>

          <FL label="Urine Pregnancy Test (hCG)">
            <Pills options={['Negative', 'Positive', 'Not done']}
              value={hcgResult} onChange={setHcgResult} accent="violet" />
          </FL>

          <div className="grid grid-cols-3 gap-4">
            <FL label="WBC (×10³/µL)">
              <input type="number" value={wbc} onChange={e => setWbc(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g., 14.5" />
              {Number(wbc) > 11 && <p className="text-xs text-red-600 mt-1">Leukocytosis ✓</p>}
            </FL>
            <FL label="Neutrophils (×10³/µL)">
              <input type="number" value={neutrophils} onChange={e => setNeutrophils(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g., 10.2" />
            </FL>
            <FL label="Hb (g/dL)">
              <input type="number" step="0.1" value={hbValue} onChange={e => setHbValue(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g., 11.5" />
            </FL>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FL label="CRP (mg/L)">
              <input type="number" value={crpValue} onChange={e => setCrpValue(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g., 45" />
              {Number(crpValue) > 6 && <p className="text-xs text-orange-600 mt-1">Elevated CRP ✓ (additional criterion)</p>}
            </FL>
            <FL label="ESR (mm/hr)">
              <input type="number" value={esrValue} onChange={e => setEsrValue(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g., 55" />
              {Number(esrValue) > 20 && <p className="text-xs text-orange-600 mt-1">Elevated ESR ✓</p>}
            </FL>
          </div>

          <Gate label="High vaginal swab (HVS) taken?" value={hvsSwab} onChange={setHvsSwab} accent="violet">
            <FL label="HVS Result" sub="(multi-select)">
              <Pills options={['Normal flora', 'BV (clue cells / Gardnerella)', 'Trichomonas vaginalis', 'Candida', 'No specific organism', 'Awaiting']}
                value={hvsResult} onChange={setHvsResult} accent="violet" multi />
            </FL>
          </Gate>

          <Gate label="Endocervical swab taken?" value={endocervicalSwab} onChange={setEndocervicalSwab} accent="violet">
            <FL label="Endocervical Result" sub="(multi-select)">
              <Pills options={['Neisseria gonorrhoeae detected', 'No GC isolated', 'Gram-negative intracellular diplococci seen', 'Chlamydia trachomatis detected (NAAT)', 'No Chlamydia detected', 'Awaiting']}
                value={endocervicalResult} onChange={setEndocervicalResult} accent="violet" multi />
            </FL>
          </Gate>

          <Gate label="NAAT (Nucleic Acid Amplification Test) performed?" value={naat} onChange={setNaat} accent="violet">
            <FL label="NAAT Result">
              <Pills options={['GC positive', 'Chlamydia positive', 'GC + Chlamydia positive', 'GC + Chlamydia negative', 'Awaiting']}
                value={naatResult} onChange={setNaatResult} accent="violet" />
            </FL>
          </Gate>

          <Gate label="Urine culture / Urinalysis performed?" value={urine} onChange={setUrine} accent="violet">
            <FL label="Urine Result">
              <Pills options={['Normal', 'UTI — organisms grown', 'Pyuria only', 'Awaiting']}
                value={urineResult} onChange={setUrineResult} accent="violet" />
            </FL>
          </Gate>

          <Gate label="Transvaginal ultrasound (TVUS) performed?" value={tvsScan} onChange={setTvsScan} accent="violet">
            <FL label="TVS Findings" sub="(multi-select)">
              <Pills options={[
                'Normal pelvic USS', 'Thickened / fluid-filled fallopian tube', 'Tubo-ovarian abscess (TOA)',
                'Free pelvic fluid (pouch of Douglas)', 'Ovarian cyst', 'Increased uterine vascularity',
                'Endometrial thickening', 'IUD in situ confirmed', 'Heterogeneous pelvic mass',
                'Haemoperitoneum', 'Normal sized ovaries', 'Polycystic appearing ovaries',
              ]}
                value={tvsScanFindings} onChange={setTvsScanFindings} accent="violet" multi />
            </FL>
          </Gate>

          <Gate label="Laparoscopy performed (gold standard)?" value={laparoscopy} onChange={setLaparoscopy} accent="violet">
            <FL label="Laparoscopy Findings" sub="(multi-select)">
              <Pills options={[
                'Normal — PID excluded', 'Hyperaemia of fallopian tubes', 'Oedema of fallopian tubes',
                'Purulent exudate from tubes', 'Tubo-ovarian abscess', 'Peritubal adhesions',
                'Perihepatic adhesions (Fitz-Hugh-Curtis — violin strings)', 'Pelvic adhesions',
                'Endometriosis co-existing', 'Appendicitis (alternative diagnosis)',
              ]}
                value={laparoscopyFindings} onChange={setLaparoscopyFindings} accent="violet" multi />
            </FL>
          </Gate>

          <Gate label="Liver function tests (if RUQ pain / Fitz-Hugh-Curtis suspected)?" value={liverFunctionTests} onChange={setLiverFunctionTests} accent="violet">
            <p className="text-xs text-violet-700">LFTs in Fitz-Hugh-Curtis: usually mildly elevated ALT/AST, may be normal. USS liver/abdominal to exclude other hepatic pathology.</p>
          </Gate>
        </Section>
      )}

      {/* ── Stage 3: Complications ── */}
      {stage === 3 && (
        <Section title="Complications" applicable={sec.complications} onApplicable={v => sa('complications', v)} accent="orange">
          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Tubo-Ovarian Abscess (TOA)</p>

          <Gate label="Tubo-Ovarian Abscess (TOA) confirmed?" value={toaConfirmed} onChange={setToaConfirmed} accent="red">
            <div className="grid grid-cols-2 gap-4">
              <FL label="Side">
                <Pills options={['Right', 'Left', 'Bilateral']}
                  value={toaSide} onChange={setToaSide} accent="red" />
              </FL>
              <FL label="TOA Size (cm)">
                <input type="number" step="0.5" value={toaSize} onChange={e => setToaSize(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g., 5.5" />
                {Number(toaSize) > 8 && <p className="text-xs text-red-600 mt-1">Large TOA (&gt;8 cm) — more likely to require surgical drainage</p>}
              </FL>
            </div>
            <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-xs text-red-700">
              TOA management: IV antibiotics (clindamycin + gentamicin / cefoxitin regimes). Drainage indicated if: no improvement after 48–72 hrs IV antibiotics, large abscess (&gt;8–9 cm), ruptured abscess, deteriorating patient. Drainage routes: TVUS-guided, laparoscopic, open (laparotomy).
            </div>
          </Gate>

          <Gate label="Ruptured TOA?" value={toaRupture} onChange={setToaRupture} accent="red">
            <div className="bg-red-100 border-2 border-red-500 rounded-lg p-3 text-sm text-red-800 font-bold flex gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              RUPTURED TOA = SURGICAL EMERGENCY. Resuscitate, urgent laparotomy/laparoscopy. Mortality if untreated. Consult senior surgeon/gynaecologist immediately.
            </div>
          </Gate>

          <hr className="border-orange-200" />
          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Fitz-Hugh-Curtis Syndrome</p>

          <Gate label="Fitz-Hugh-Curtis syndrome confirmed / suspected?" value={fitzHughCurtis} onChange={setFitzHughCurtis} accent="orange">
            <FL label="Fitz-Hugh-Curtis Features" sub="(multi-select)">
              <Pills options={[
                'Sharp right upper quadrant pain', 'Pleuritic component (worse on inspiration)',
                'Pain radiates to right shoulder', 'RUQ tenderness on palpation',
                'Concurrent lower abdominal / pelvic pain', 'Elevated ALT/AST (mild)',
                'Perihepatic adhesions on laparoscopy (violin strings)', 'Confirmed on USS',
              ]}
                value={fhcFeatures} onChange={setFhcFeatures} accent="orange" multi />
            </FL>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-xs text-orange-800">
              Fitz-Hugh-Curtis: caused by N. gonorrhoeae (classic) or C. trachomatis tracking along right paracolic gutter to liver capsule. Treat underlying PID — RUQ pain resolves with PID treatment. Rarely requires separate surgical intervention.
            </div>
          </Gate>

          <hr className="border-orange-200" />
          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Sepsis Screen</p>

          <Gate label="Sepsis features present?" value={sepsis} onChange={setSepsis} accent="red">
            <FL label="Sepsis Features" sub="(multi-select)">
              <Pills options={['HR &gt;100 bpm', 'RR &gt;20/min', 'Temperature &gt;38.5°C or &lt;36°C', 'SBP &lt;90 mmHg', 'Altered mental state', 'Reduced urine output', 'Lactate &gt;2 mmol/L']}
                value={sepsisFeatures} onChange={setSepsisFeatures} accent="red" multi />
            </FL>
            <div className="bg-red-100 border border-red-500 rounded-lg p-3 text-xs text-red-800 font-bold">
              Sepsis protocol: Blood cultures × 2 → IV antibiotics within 1 hour → IV fluids 500 mL crystalloid → Urine output monitoring → ICU/HDU review. Source control (drain TOA if confirmed).
            </div>
          </Gate>

          <hr className="border-orange-200" />
          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Long-term Complications (Counselling)</p>

          <div className="grid grid-cols-3 gap-3">
            <Gate label="Chronic pelvic pain risk discussed?" value={chronicPelvicPain} onChange={setChronicPelvicPain} accent="amber">
              <p className="text-xs text-amber-700">Up to 30% develop chronic pelvic pain after PID. Adhesions, hydrosalpinx contribute.</p>
            </Gate>
            <Gate label="Infertility risk counselling done?" value={infertilityRisk} onChange={setInfertilityRisk} accent="amber">
              <p className="text-xs text-amber-700">1 episode PID: ~10% infertility. 2 episodes: ~25%. 3+ episodes: ~50%+ (due to tubal damage).</p>
            </Gate>
            <Gate label="Ectopic pregnancy risk counselling done?" value={ectopicRisk} onChange={setEctopicRisk} accent="amber">
              <p className="text-xs text-amber-700">PID increases ectopic risk 6–10 fold due to tubal scarring/ciliary damage. Advise early USS in future pregnancies.</p>
            </Gate>
          </div>

          <Gate label="Previous ectopic pregnancy history?" value={previousEctopic} onChange={setPreviousEctopic} accent="amber" />
        </Section>
      )}

      {/* ── Stage 4: Treatment ── */}
      {stage === 4 && (
        <Section title="Treatment" applicable={sec.treatment} onApplicable={v => sa('treatment', v)} accent="teal">
          <FL label="Management Setting">
            <Pills options={['Outpatient (oral antibiotics)', 'Day case (IV then discharge)', 'Inpatient admission', 'ICU/HDU (sepsis / ruptured TOA)']}
              value={managementSetting} onChange={setManagementSetting} accent="teal" />
          </FL>

          <FL label="Indications for Inpatient Admission" sub="(multi-select)">
            <Pills options={[
              'Surgical emergency cannot be excluded', 'Tubo-ovarian abscess', 'Pregnancy',
              'Failure of outpatient therapy', 'Severe illness, nausea/vomiting', 'High fever (&gt;38.5°C)',
              'Peritonism / guarding', 'HIV positive (immunocompromised)', 'Unable to tolerate oral antibiotics',
              'Adolescent / vulnerable patient', 'Social concerns / compliance issues',
            ]}
              value={admissionIndications} onChange={setAdmissionIndications} accent="teal" multi />
          </FL>

          <FL label="Antibiotic Regime">
            <Pills options={['Outpatient oral regime', 'Inpatient IV regime', 'IV → switch to oral']}
              value={antibioticRegime} onChange={setAntibioticRegime} accent="teal" />
          </FL>

          {(antibioticRegime === 'Outpatient oral regime') && (
            <div className="space-y-2">
              <FL label="Outpatient Regime Choice">
                <Pills options={[
                  'Ceftriaxone 500 mg IM (single dose) + Doxycycline 100 mg BD × 14 days + Metronidazole 400 mg BD × 14 days (BASHH preferred)',
                  'Cefixime 400 mg oral (single dose) + Doxycycline 100 mg BD × 14 days + Metronidazole 400 mg BD × 14 days',
                  'Azithromycin 1g stat (if GC/chlamydia mix) + Metronidazole 400 mg BD × 14 days',
                  'Ofloxacin 400 mg BD + Metronidazole 400 mg BD × 14 days (only if GC prevalence low / GC excluded)',
                  'Levofloxacin 500 mg OD + Metronidazole 400 mg BD × 14 days',
                ]}
                  value={outpatientRegime} onChange={setOutpatientRegime} accent="teal" />
              </FL>
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-xs text-teal-800">
                <Info className="w-4 h-4 inline mr-1" />
                India context: N. gonorrhoeae resistance to fluoroquinolones is high in India — fluoroquinolone monotherapy NOT recommended for GC coverage. Ceftriaxone remains first-line for GC. Avoid quinolones unless GC has been excluded by NAAT.
              </div>
            </div>
          )}

          {(antibioticRegime === 'Inpatient IV regime' || antibioticRegime === 'IV → switch to oral') && (
            <div className="space-y-2">
              <FL label="IV Antibiotic Regime">
                <Pills options={[
                  'Cefoxitin 2g IV q6h + Doxycycline 100 mg IV/oral q12h (then oral Doxy + Metro to 14 days)',
                  'Clindamycin 900 mg IV q8h + Gentamicin 2 mg/kg loading → 1.5 mg/kg IV q8h (then oral Clindamycin 450 mg QID to 14 days)',
                  'Ceftriaxone 2g IV OD + Doxycycline 100 mg IV BD + Metronidazole 500 mg IV q8h',
                  'Piperacillin-tazobactam 4.5g IV q8h + Metronidazole + Doxycycline (if polymicrobial / TOA / post-surgical)',
                  'Meropenem (reserved for severe/resistant — TOA rupture / sepsis)',
                ]}
                  value={inpatientRegime} onChange={setInpatientRegime} accent="teal" />
              </FL>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                Switch IV to oral when: clinically improving, afebrile &gt;24 hrs, tolerating oral feeds. Complete a total of 14 days treatment. If Clindamycin + Gentamicin used IV: switch to oral Clindamycin 450 mg QID + Doxycycline 100 mg BD to complete course.
              </div>
            </div>
          )}

          <FL label="Treatment Duration">
            <Pills options={['14 days (standard — all regimes)', '10 days (minimum for mild)', 'Ongoing (inpatient until stable)']}
              value={durationDays} onChange={setDurationDays} accent="teal" />
          </FL>

          {iudPresent === 'Yes' && (
            <FL label="IUD Management Decision">
              <Pills options={[
                'IUD retained (mild PID — inform patient, close monitoring)',
                'IUD removed after starting antibiotics (failure to respond / patient request)',
                'IUD removal not done — patient declined',
                'IUD removal not done — no strong indication',
              ]}
                value={iudManagement} onChange={setIudManagement} accent="teal" />
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-2 mt-1 text-xs text-teal-800">
                BASHH/WHO: IUD removal NOT mandatory for mild-moderate PID. Removal recommended if: no improvement in 72 hrs, patient wishes removal, severe PID. If removed: offer emergency contraception if UPSI in last 5 days.
              </div>
            </FL>
          )}

          <FL label="Analgesia / Symptom Management" sub="(multi-select)">
            <Pills options={['Ibuprofen 400 mg TDS with food', 'Paracetamol 1g QDS', 'Diclofenac 50 mg TDS', 'Mefenamic acid 500 mg TDS', 'Tramadol (moderate-severe pain)', 'Antispasmodics (hyoscine)', 'IV morphine (severe / admission)']}
              value={analgesiaGiven} onChange={setAnalgesiaGiven} accent="teal" multi />
          </FL>

          <Gate label="IV fluids required?" value={ivFluids} onChange={setIvFluids} accent="teal" />

          <Gate label="Surgical intervention required?" value={surgicalIntervention} onChange={setSurgicalIntervention} accent="red">
            <FL label="Surgical Procedure" sub="(multi-select)">
              <Pills options={[
                'TVUS-guided TOA drainage', 'Laparoscopic drainage of TOA', 'Laparoscopic washout',
                'Laparotomy (ruptured TOA / septic)', 'Salpingectomy (irreversibly damaged tube)',
                'Appendicectomy (concurrent appendicitis)', 'Laparoscopic adhesiolysis',
              ]}
                value={surgicalDetails} onChange={setSurgicalDetails} accent="red" multi />
            </FL>
          </Gate>

          <FL label="Response to Treatment (at 72 hours / discharge)">
            <Pills options={['Good response — symptoms significantly improved', 'Partial response — continuing', 'Poor response — escalation needed', 'Deteriorating — surgery planned', 'Too early to assess']}
              value={responseToTreatment} onChange={setResponseToTreatment} accent="teal" />
          </FL>
        </Section>
      )}

      {/* ── Stage 5: Partner Management & Follow-up ── */}
      {stage === 5 && (
        <Section title="Partner Management & Follow-up" applicable={sec.partner} onApplicable={v => sa('partner', v)} accent="green">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
            <Info className="w-4 h-4 inline mr-1" />
            Partner notification is essential — all sexual contacts within 6 months should be tested and treated empirically for GC + Chlamydia, even if asymptomatic. In India, NACO-designated STI/RTI clinics provide free testing and treatment; refer partners there.
          </div>

          <FL label="Partner Notification">
            <Pills options={['Patient will notify partner(s) directly', 'Doctor / clinic will notify (provider referral)', 'Partner notification via NACO STI clinic', 'Patient unable / unwilling to notify', 'No identifiable partners to notify']}
              value={partnerNotification} onChange={setPartnerNotification} accent="green" />
          </FL>

          <Gate label="Partner agreed to treatment?" value={partnerTreatment} onChange={setPartnerTreatment} accent="green">
            <FL label="Partner Treatment Regime">
              <Pills options={[
                'Ceftriaxone 500 mg IM single dose + Azithromycin 1g stat (GC + Chlamydia empiric cover)',
                'Doxycycline 100 mg BD × 7 days (Chlamydia; if GC excluded)',
                'Azithromycin 1g single dose (Chlamydia — if compliance concern)',
                'Partner referred to NACO STI clinic for testing + treatment',
                'Partner treatment regime unknown',
              ]}
                value={partnerTreatmentRegime} onChange={setPartnerTreatmentRegime} accent="green" />
            </FL>
          </Gate>

          <hr className="border-green-200" />
          <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Comprehensive STI Screen</p>

          <div className="grid grid-cols-3 gap-3">
            <Gate label="HIV testing offered?" value={hivTesting} onChange={setHivTesting} accent="green">
              <p className="text-xs text-green-700">HIV NACO ICTC (Integrated Counselling and Testing Centre) referral if positive or testing declined.</p>
            </Gate>
            <Gate label="Hepatitis B/C testing offered?" value={hepatitisTesting} onChange={setHepatitisTesting} accent="green">
              <p className="text-xs text-green-700">HBsAg, anti-HCV. Hepatitis B vaccination series if non-immune.</p>
            </Gate>
            <Gate label="Syphilis (VDRL/TPHA) testing done?" value={syphilisTesting} onChange={setSyphilisTesting} accent="green">
              <p className="text-xs text-green-700">Syphilis co-infection not uncommon in high-prevalence STI populations.</p>
            </Gate>
          </div>

          <FL label="Complete STI screening done?">
            <Pills options={['Yes — all screens done', 'Partial — some pending', 'No — declined', 'Referred to NACO STI clinic for complete screen']}
              value={stiScreeningComplete} onChange={setStiScreeningComplete} accent="green" />
          </FL>

          <Gate label="Referral to NACO STI/RTI clinic?" value={nacoReferral} onChange={setNacoReferral} accent="green">
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-800">
              NACO STI Clinic network: free GC/Chlamydia/syphilis/HIV testing and treatment across India. Patients and partners can attend confidentially. Refer using standard STI referral slip.
            </div>
          </Gate>

          <hr className="border-green-200" />

          <FL label="Patient Counselling Provided" sub="(multi-select)">
            <Pills options={[
              'PID diagnosis explained in patient\'s language', 'Cause / transmission explained sensitively',
              'Importance of completing full 14-day antibiotic course', 'No sexual intercourse until treatment complete and partner treated',
              'Condom use for all future sexual contacts', 'Risk of recurrence if partner not treated',
              'Long-term risks (infertility, ectopic, chronic pain) explained',
              'Emergency contraception discussed (if IUD removed)',
              'Family planning / contraception counselling done',
              'Domestic violence / coercion screen done',
              'Shakti/Sneha helpline given (if coercion/abuse concern)',
            ]}
              value={counselling} onChange={setCounselling} accent="green" multi />
          </FL>

          <FL label="Contraception Counselling">
            <Pills options={['Discussed — patient satisfied with current method', 'Changed to barrier (condoms) for STI protection', 'IUD removed — alternative contraception prescribed', 'Referred for contraception counselling', 'Patient declined']}
              value={contraceptionCounselling} onChange={setContraceptionCounselling} accent="green" />
          </FL>

          <FL label="Follow-up Plan" sub="(multi-select)">
            <Pills options={[
              'Review at 72 hours (if outpatient — assess response)', 'Review at 1 week', 'Review at 2 weeks (end of treatment)',
              'Test of cure — NAAT at 3 weeks post-treatment', 'Repeat USS (if TOA — reassess size)',
              'Gynaecology OPD in 4–6 weeks', 'Fertility clinic referral (if infertility concern)',
              'NACO STI clinic follow-up arranged', 'Laparoscopy planned (if chronic pain / infertility)',
            ]}
              value={followUpPlan} onChange={setFollowUpPlan} accent="green" multi />
          </FL>

          <FL label="Follow-up Appointment Date">
            <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </FL>

          <FL label="Clinician Notes">
            <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Summary, differential diagnosis, escalation plan, partner contact tracing notes, special circumstances..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </FL>
        </Section>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button type="button" disabled={stage === 0} onClick={() => setStage(s => s - 1)}
          className="px-4 py-2 rounded-lg border border-rose-300 text-rose-700 text-sm font-semibold disabled:opacity-40">
          ← Previous
        </button>
        <span className="text-xs text-gray-500">Stage {stage + 1} of {STAGES.length}</span>
        {stage < STAGES.length - 1 ? (
          <button type="button" onClick={() => setStage(s => s + 1)}
            className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold">
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
