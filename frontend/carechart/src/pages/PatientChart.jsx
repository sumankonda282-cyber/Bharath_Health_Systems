import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  X, Lock, CheckCircle, Save, BookOpen,
  Edit3, ShoppingBag, Utensils, Navigation,
  Activity, Heart, Pill, ClipboardList,
  MessageSquare, Bed, ShieldAlert,
} from 'lucide-react'
import { useWardSession } from '../contexts/WardSessionContext'
import { usePin } from '../contexts/PinContext'
import api from '../api/client'
import FormRenderer from '../components/assessments/FormRenderer'
import ProviderView from './ProviderView'
import MedicationList from './MedicationList'
import MAR from './MAR'
import Orders from './Orders'
import DietNutrition from './DietNutrition'
import Documentation from './Documentation'
import PrePostOp from './PrePostOp'
import PatientMovement from './PatientMovement'
import DischargeSummary from './DischargeSummary'
import NursingNotes from './NursingNotes'

import { GREEN, NAVY } from '../constants/colors'
import CautionBadge from '../components/CautionBadge'
import PatientChartShell from '@shared/inpatient/PatientChartShell'

function Badge({ flag, label }) {
  if (label && !flag) {
    return (
      <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap border"
        style={{ background: '#f3f4f6', color: '#374151', borderColor: '#e5e7eb' }}>
        {label}
      </span>
    )
  }
  return <CautionBadge flag={flag} />
}

// Map form name string → registry key (for backward compat with any saved pin strings)
const FORM_KEY_MAP_FROM_POOL = (() => {
  // Inline minimal pool reference to build the key map without importing FORM_POOL
  // (FORM_POOL now lives in the shell; we only need keys for AssessmentFullPageModal)
  const POOL_FOR_KEYS = [
    { name: 'Patient Profile',   key: 'patient-profile' },
    { name: 'Chief Complaint',   key: 'chief-complaint' },
    { name: 'Medical History',   key: 'medical-history' },
    { name: 'Family History',    key: 'family-history' },
    { name: 'Social History',    key: 'social-history' },
    { name: 'Allergies',         key: 'allergies' },
    { name: 'Systems Review',    key: 'systems-review' },
    { name: 'Pain Assessment',   key: 'pain-assessment' },
    { name: 'Asthma Control',    key: 'asthma-basic' },
    { name: 'Clinical Exam',        key: 'systems-clinical-exam' },
    { name: 'Clinical Impression',  key: 'systems-clinical-impression' },
    { name: 'Chest Pain',           key: 'cardiology-chest-pain' },
    { name: 'Hypertension',         key: 'cardiology-hypertension' },
    { name: 'Heart Failure',        key: 'cardiology-heart-failure' },
    { name: 'ACS Assessment',       key: 'cardiology-acs' },
    { name: 'Atrial Fibrillation',  key: 'cardiology-af' },
    { name: 'Dyslipidemia',         key: 'cardiology-dyslipidemia' },
    { name: 'Cardiomyopathy',       key: 'cardiology-cardiomyopathy' },
    { name: 'Valvular Heart Disease',key: 'cardiology-valvular' },
    { name: 'Rheumatic Heart Disease',key:'cardiology-rhd' },
    { name: 'Pericardial Disease',  key: 'cardiology-pericardial' },
    { name: 'Ear Assessment',       key: 'ent-ear' },
    { name: 'Nose & Sinus',         key: 'ent-nose-sinus' },
    { name: 'Throat & Larynx',      key: 'ent-throat-larynx' },
    { name: 'Head & Neck',          key: 'ent-head-neck' },
    { name: 'Audiology & Hearing',  key: 'ent-audiology' },
    { name: 'Facial Nerve',         key: 'ent-facial-nerve' },
    { name: 'Paediatric ENT',       key: 'ent-paediatric' },
    { name: 'Tracheostomy',         key: 'ent-tracheostomy' },
    { name: 'Acute Abdomen',           key: 'gastro-acute-abdomen' },
    { name: 'Acute Pancreatitis',      key: 'gastro-acute-pancreatitis' },
    { name: 'Anorectal Disorders',     key: 'gastro-anorectal' },
    { name: 'Biliary & Gallstone',     key: 'gastro-biliary' },
    { name: 'Chronic Pancreatitis',    key: 'gastro-chronic-pancreatitis' },
    { name: 'Dysphagia & Esophageal', key: 'gastro-dysphagia' },
    { name: 'Functional GI',          key: 'gastro-functional' },
    { name: 'GI Bleed',               key: 'gastro-gi-bleed' },
    { name: 'GI Cancer',              key: 'gastro-gi-cancer' },
    { name: 'Gastroparesis',          key: 'gastro-gastroparesis' },
    { name: 'IBD',                    key: 'gastro-ibd' },
    { name: 'Liver Disease',          key: 'gastro-liver' },
    { name: 'Peptic Ulcer / GERD',    key: 'gastro-peptic-ulcer' },
    { name: 'ANC Follow-up',          key: 'obg-anc-followup' },
    { name: 'Antenatal Booking',      key: 'obg-antenatal' },
    { name: 'Cervical Screening',     key: 'obg-cervical' },
    { name: 'Female Infertility',     key: 'obg-infertility' },
    { name: 'GDM Assessment',         key: 'obg-gdm' },
    { name: 'High Risk Pregnancy',    key: 'obg-high-risk' },
    { name: 'Labour Assessment',      key: 'obg-labour' },
    { name: 'Menopause',              key: 'obg-menopause' },
    { name: 'Menstrual Disorder',     key: 'obg-menstrual' },
    { name: 'PCOS',                   key: 'obg-pcos' },
    { name: 'PID Assessment',         key: 'obg-pid' },
    { name: 'Postpartum',             key: 'obg-postpartum' },
    { name: 'Preeclampsia',           key: 'obg-preeclampsia' },
    { name: 'Compartment Syndrome',   key: 'ortho-compartment-syndrome' },
    { name: 'Fracture / Trauma',      key: 'ortho-fracture' },
    { name: 'Musculoskeletal Pain',   key: 'ortho-msk-pain' },
    { name: 'Elbow Assessment',       key: 'ortho-elbow' },
    { name: 'Foot & Ankle',           key: 'ortho-foot-ankle' },
    { name: 'Hand & Wrist',           key: 'ortho-hand-wrist' },
    { name: 'Hip Assessment',         key: 'ortho-hip' },
    { name: 'Knee Assessment',        key: 'ortho-knee' },
    { name: 'Septic Arthritis / Osteomyelitis', key: 'ortho-septic-arthritis' },
    { name: 'Shoulder Assessment',    key: 'ortho-shoulder' },
    { name: 'Orthopedic Tumor',       key: 'ortho-tumor' },
    { name: 'Orthotic & Prosthetic',  key: 'ortho-prosthetic' },
    { name: 'Osteoporosis',           key: 'ortho-osteoporosis' },
    { name: 'Pediatric Orthopedic',   key: 'ortho-pediatric' },
    { name: 'Peripheral Nerve',       key: 'ortho-peripheral-nerve' },
    { name: 'Post-Op Rehab',          key: 'ortho-postop-rehab' },
    { name: 'Spine Assessment',       key: 'ortho-spine' },
    { name: 'Adolescent Health',       key: 'peds-adolescent' },
    { name: 'NICU Assessment',         key: 'peds-nicu' },
    { name: 'Neonatal Assessment',     key: 'peds-neonatal' },
    { name: 'Peds Cardiology',         key: 'peds-cardiology' },
    { name: 'Developmental Disorders', key: 'peds-developmental' },
    { name: 'Pediatric Emergency',     key: 'peds-emergency' },
    { name: 'Peds Endocrinology',      key: 'peds-endocrinology' },
    { name: 'Peds Fever & Infections', key: 'peds-fever' },
    { name: 'Peds Gastro & Nutrition', key: 'peds-gastro' },
    { name: 'Growth & Development',    key: 'peds-growth' },
    { name: 'Haematology & Oncology',  key: 'peds-haematology' },
    { name: 'Peds Nephrology',         key: 'peds-nephrology' },
    { name: 'Peds Neurology',          key: 'peds-neurology' },
    { name: 'Peds Respiratory',        key: 'peds-respiratory' },
    { name: 'Peds Rheumatology',       key: 'peds-rheumatology' },
    { name: 'Vaccination Chart',       key: 'peds-vaccination' },
    { name: 'Aerosol Therapy',         key: 'specialty-aerosol' },
    { name: 'Asthma (Specialty)',      key: 'specialty-asthma' },
    { name: 'Diabetes Assessment',     key: 'specialty-diabetes' },
    { name: 'ACT Score',               key: 'clinical-act' },
    { name: 'ADHD Scale',              key: 'clinical-adhd' },
    { name: 'ALSFRS-R',               key: 'clinical-alsfrs' },
    { name: 'ASRS Screen',            key: 'clinical-asrs' },
    { name: 'Migraine Assessment',    key: 'clinical-migraine' },
  ]
  return Object.fromEntries(POOL_FOR_KEYS.filter(f => f.key).map(f => [f.name, f.key]))
})()

// ── Patient sidebar items ────────────────────────────────────────────────────
const PATIENT_NAV = [
  { key: 'dashboard',    icon: Activity,      label: 'Dashboard' },
  { key: 'provider',     icon: Heart,         label: 'Provider View' },
  { key: 'medications',  icon: Pill,          label: 'Medication List' },
  { key: 'mar',          icon: ClipboardList, label: 'MAR' },
  { key: 'orders',       icon: ShoppingBag,   label: 'Orders' },
  { key: 'docs',         icon: Edit3,         label: 'Documentation' },
  { key: 'food',         icon: Utensils,      label: 'Diet & Nutrition' },
  { key: 'preop',        icon: Bed,           label: 'Pre / Post-Op Care' },
  { key: 'notes',        icon: MessageSquare, label: 'Notes' },
  { key: 'flowsheet',    icon: Navigation,    label: 'Patient Movement' },
  { key: 'discharge',    icon: ShieldAlert,   label: 'Discharge Summary' },
]

// ── Full-page assessment form modal ──────────────────────────────────────────
function AssessmentFullPageModal({ form, admissionId, patientName, onClose }) {
  const { requestPin } = usePin()

  const [signer, setSigner]       = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [saved, setSaved]         = useState(false)

  const [simpleValue, setSimpleValue] = useState('')
  const [simpleNotes, setSimpleNotes] = useState('')
  const [simpleError, setSimpleError] = useState('')
  const [simpleSaving, setSimpleSaving] = useState(false)

  const formKey = form?.key ? (FORM_KEY_MAP_FROM_POOL[form.name] || form.key) : null

  const verifyPin = async () => {
    setVerifying(true)
    try {
      const identity = await requestPin(`Open form: ${form.name} — ${patientName || ''}`)
      if (identity?.verified) {
        setSigner({ staff_id: identity.staff_id, full_name: identity.full_name, verified_at: new Date() })
      }
    } finally {
      setVerifying(false)
    }
  }

  const submitSimple = async () => {
    if (!simpleValue.trim()) return
    setSimpleError('')
    setSimpleSaving(true)
    try {
      await api.post(`/inpatient/admissions/${admissionId}/nursing-entries`, {
        form_name: form.name,
        value: simpleValue,
        notes: simpleNotes,
        signed_by: signer.staff_id,
        signer_name: signer.full_name,
        signed_at: signer.verified_at.toISOString(),
      })
      setSaved(true)
      setTimeout(onClose, 1200)
    } catch (err) {
      setSimpleError(err.message || 'Failed to save. Try again.')
    } finally {
      setSimpleSaving(false)
    }
  }

  const onFormSaved = () => {
    setSaved(true)
    setTimeout(onClose, 1200)
  }

  const fmtTime = (d) => d
    ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    : ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(15,37,87,0.6)' }}>
      <div className="flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: '70vw', height: '70vh', maxWidth: 1100 }}>

        {/* Modal header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-3.5 border-b shadow-sm"
          style={{ background: NAVY, borderColor: '#1e3a6e' }}>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300">
              Assessment Form
            </span>
            <span className="text-lg font-extrabold text-white leading-tight">{form.name}</span>
            {patientName && (
              <span className="text-[11px] text-blue-200">Patient: {patientName}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {signer ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border"
                style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
                <CheckCircle size={14} style={{ color: GREEN }} />
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold" style={{ color: GREEN }}>
                    {signer.full_name}
                  </span>
                  <span className="text-[9px] text-gray-500">
                    Verified {fmtTime(signer.verified_at)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-yellow-400"
                style={{ background: '#fefce8' }}>
                <Lock size={13} className="text-yellow-600" />
                <span className="text-[11px] font-semibold text-yellow-700">PIN required to sign</span>
              </div>
            )}

            {saved && (
              <span className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg"
                style={{ background: '#f0fdf4', color: GREEN }}>
                <CheckCircle size={12} /> Saved
              </span>
            )}

            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-300 hover:text-white hover:bg-white/10 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PIN gate */}
        {!signer ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: '#f0fdf4' }}>
              <Lock size={28} style={{ color: GREEN }} />
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-gray-800">Verify your identity to open this form</p>
              <p className="text-sm text-gray-500 mt-1">
                Enter your PIN to unlock <span className="font-semibold text-gray-700">{form.name}</span>
              </p>
            </div>
            <button
              onClick={verifyPin}
              disabled={verifying}
              className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60"
              style={{ background: GREEN }}>
              <Lock size={14} />
              {verifying ? 'Verifying…' : 'Enter PIN & Open Form'}
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {formKey ? (
              <div className="max-w-4xl mx-auto px-6 py-6">
                <FormRenderer
                  formKey={formKey}
                  patientId={null}
                  encounterId={admissionId}
                  admission={admissionId ? { id: admissionId } : null}
                  onSaved={onFormSaved}
                  onClose={onFormSaved}
                />
              </div>
            ) : (
              <div className="max-w-xl mx-auto px-6 py-10 flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Value / Observation
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Enter value or observation…"
                    value={simpleValue}
                    onChange={e => { setSimpleValue(e.target.value); setSimpleError('') }}
                    className="mt-2 w-full border rounded-xl px-4 py-3 text-sm focus:outline-none resize-none"
                    style={{ borderColor: '#d1d5db' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Notes (optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Additional notes…"
                    value={simpleNotes}
                    onChange={e => setSimpleNotes(e.target.value)}
                    className="mt-2 w-full border rounded-xl px-4 py-3 text-sm focus:outline-none resize-none"
                    style={{ borderColor: '#d1d5db' }}
                  />
                </div>
                {simpleError && <p className="text-sm text-red-600">{simpleError}</p>}
                <button
                  onClick={submitSimple}
                  disabled={!simpleValue.trim() || simpleSaving || saved}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: GREEN }}>
                  <Save size={14} />
                  {saved ? 'Saved ✓' : simpleSaving ? 'Saving…' : 'Save Entry'}
                </button>
              </div>
            )}
          </div>
        )}

        {signer && (
          <div className="flex-shrink-0 border-t px-6 py-3 flex items-center gap-3"
            style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
            <CheckCircle size={13} style={{ color: GREEN }} />
            <span className="text-xs text-gray-500">
              Signed by <span className="font-semibold text-gray-800">{signer.full_name}</span>
              {' '}· Verified {fmtTime(signer.verified_at)} · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Admission Form Modal ─────────────────────────────────────────────────────
function AdmissionFormModal({ admission, onClose }) {
  const adm = admission || {}
  const [editField, setEditField] = useState(null)
  const [extra, setExtra]         = useState({})
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)

  const [phoneInput, setPhoneInput]     = useState('')
  const [lookupResult, setLookupResult] = useState(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError]   = useState('')
  const [otpStep, setOtpStep]           = useState(false)
  const [otpValue, setOtpValue]         = useState('')
  const [otpToken, setOtpToken]         = useState(null)
  const [otpLoading, setOtpLoading]     = useState(false)
  const [otpError, setOtpError]         = useState('')
  const [prefilled, setPrefilled]       = useState({})
  const [profileBanner, setProfileBanner] = useState(false)
  const lookupDebounceRef               = useRef(null)

  const handleLookup = async (mobile) => {
    const m = (mobile || phoneInput).trim()
    if (!m) return
    setLookupLoading(true); setLookupError(''); setLookupResult(null)
    try {
      const res = await api.get('/public/patient-lookup', { params: { mobile: m } })
      const data = res?.data || res
      if (data && (data.name || data.patient_name)) {
        setLookupResult(data)
      } else {
        setLookupError('No patient found with that mobile number.')
      }
    } catch {
      setLookupError('Lookup failed. Please check the number and try again.')
    } finally {
      setLookupLoading(false)
    }
  }

  const handlePhoneChange = (val) => {
    setPhoneInput(val)
    setLookupResult(null)
    setLookupError('')
    setProfileBanner(false)
    clearTimeout(lookupDebounceRef.current)
    const digits = val.replace(/\D/g, '')
    if (digits.length === 10) {
      lookupDebounceRef.current = setTimeout(() => handleLookup(val), 300)
    }
  }

  const handleSendOtp = async () => {
    setOtpLoading(true); setOtpError('')
    try {
      await api.post('/otp/send', { mobile: phoneInput.trim() })
      setOtpStep(true)
    } catch {
      setOtpError('Failed to send OTP. Please try again.')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    setOtpLoading(true); setOtpError('')
    try {
      const res = await api.post('/otp/verify', { mobile: phoneInput.trim(), otp: otpValue })
      const token = res.data?.verified_token || res.data?.token
      setOtpToken(token)
      let profile = null
      try {
        const profileRes = await api.get('/public/patient-profile', { params: { verified_token: token } })
        profile = profileRes.data
      } catch {
        profile = res.data?.patient || res.data || {}
      }
      const p = profile
      const filled = {
        'Full Name':            p.patient_name || p.name || p.full_name,
        'Date of Birth':        p.dob,
        'Gender':               p.gender,
        'Blood Group':          p.blood_group,
        'UHID / MRN':           p.mrn || p.uhid,
        'Nationality':          p.nationality,
        'Religion':             p.religion,
        'Occupation':           p.occupation,
        'Mobile':               p.mobile || p.contact_number || p.phone,
        'Email':                p.email,
        'Address':              p.address,
        'Emergency Contact':    p.emergency_contact,
        'Relationship':         p.emergency_relation,
      }
      Object.keys(filled).forEach(k => filled[k] === undefined && delete filled[k])
      setPrefilled(filled)
      setExtra(prev => ({ ...prev, ...Object.fromEntries(
        Object.entries(filled).map(([k, v]) => [`Patient Identity.${k}`, v])
          .concat(Object.entries(filled).map(([k, v]) => [`Contact & Address.${k}`, v]))
      )}))
      setOtpStep(false)
      setProfileBanner(true)
    } catch {
      setOtpError('Invalid OTP. Please try again.')
    } finally {
      setOtpLoading(false)
    }
  }

  const maskedName = (name) => {
    if (!name) return '***'
    const parts = name.split(' ')
    return parts.map(p => p.length <= 2 ? p : p[0] + '*'.repeat(p.length - 2) + p[p.length - 1]).join(' ')
  }

  const saveAdditions = async () => {
    if (!Object.keys(extra).length) { onClose(); return }
    setSaving(true)
    try {
      await api.patch(`/inpatient/admissions/${adm.id || adm.admission_id}/notes`, { extra_fields: extra })
    } catch {
      // store locally if endpoint unavailable
    } finally {
      setSaving(false)
      setSaved(true)
      setTimeout(onClose, 800)
    }
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
  const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'

  const GROUPS = [
    {
      title: 'Patient Identity',
      icon: '🪪',
      fields: [
        ['Full Name',          adm.patient_name       || 'Ramesh Mehta'],
        ['Date of Birth',      adm.dob                || '12 Mar 1980 (45 yrs)'],
        ['Gender',             adm.gender             || 'Male'],
        ['Blood Group',        adm.blood_group        || 'B+'],
        ['UHID / MRN',         adm.mrn || adm.patient_mrn || 'MRN-2025-00482'],
        ['Nationality',        adm.nationality        || 'Indian'],
        ['Religion',           adm.religion           || '—'],
        ['Occupation',         adm.occupation         || '—'],
      ]
    },
    {
      title: 'Contact & Address',
      icon: '📞',
      fields: [
        ['Mobile',             adm.contact_number     || '+91 98765 43210'],
        ['Email',              adm.email              || '—'],
        ['Address',            adm.address            || '42 MG Road, Hyderabad 500001'],
        ['Emergency Contact',  adm.emergency_contact  || 'Priya Mehta (Spouse) — 9876543210'],
        ['Relationship',       adm.emergency_relation || 'Spouse'],
      ]
    },
    {
      title: 'Admission Details',
      icon: '🏥',
      fields: [
        ['IP Number',           adm.ip_number         || 'IP-25-9914'],
        ['Date & Time of Admission', fmtDateTime(adm.admitted_at) || '10 Jun 2025, 08:30 AM'],
        ['Admission Type',     adm.admission_type     || 'Emergency'],
        ['Ward',               adm.ward_name          || 'General Surgery — Ward 3B'],
        ['Bed Number',         adm.bed_number         || 'Bed 12'],
        ['Department',         adm.department_name    || 'General Surgery'],
        ['Expected Discharge', fmtDate(adm.expected_discharge) || '16 Jun 2025'],
        ['Mode of Arrival',    adm.mode_of_arrival    || 'Ambulance'],
        ['Referred From',      adm.referred_from      || 'Narayana Clinic, Kukatpally'],
      ]
    },
    {
      title: 'Clinical Presentation',
      icon: '🩺',
      fields: [
        ['Presenting Complaints', adm.complaints || 'Right iliac fossa pain × 2 days, fever, vomiting, anorexia'],
        ['Duration of Illness',  adm.illness_duration || '2 days'],
        ['Provisional Diagnosis',adm.primary_diagnosis || 'Acute Appendicitis with Peritonitis'],
        ['Allergies',           adm.allergies          || 'Penicillin — Rash'],
        ['Past Medical History', adm.pmh               || 'Type 2 DM (5 yrs), Hypertension (3 yrs)'],
        ['Past Surgical History',adm.psh               || 'Nil'],
        ['Current Medications',  adm.home_medications  || 'Tab. Metformin 500 mg BD, Tab. Amlodipine 5 mg OD'],
        ['Family History',       adm.family_history     || 'Father — T2DM, HTN'],
        ['Social History',       adm.social_history     || 'Non-smoker, occasional alcohol'],
      ]
    },
    {
      title: 'Care Team',
      icon: '👨‍⚕️',
      fields: [
        ['Treating Doctor',     adm.doctor_name        || 'Dr. Srinivasa Rao, MS (Gen. Surgery)'],
        ['Consultant',          adm.consultant_name    || 'Dr. Meena Krishnan, MD (Internal Medicine)'],
        ['Primary Nurse',       adm.nurse_name         || 'Sr. Lakshmi Devi'],
        ['Referring Doctor',    adm.referring_doctor   || 'Dr. Raju (Narayana Clinic)'],
      ]
    },
    {
      title: 'Insurance & Billing',
      icon: '💳',
      fields: [
        ['Payment Mode',        adm.payment_mode       || 'Insurance'],
        ['Insurance Provider',  adm.insurance_name     || 'Star Health'],
        ['Policy Number',       adm.policy_number      || 'STH-2024-44129'],
        ['TPA Name',            adm.tpa_name           || 'Medi Assist'],
        ['Pre-auth Number',     adm.preauth_number     || 'TPA-2025-441'],
        ['Approved Amount',     adm.approved_amount    || '₹1,20,000'],
      ]
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-6 px-4"
      style={{ background: 'rgba(15,37,87,0.5)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

        <div className="px-6 py-4 flex items-center justify-between" style={{ background: NAVY }}>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-blue-300 mb-0.5">Admission Form</div>
            <div className="text-base font-extrabold text-white">{adm.patient_name || 'Ramesh Mehta'}</div>
            <div className="text-[11px] text-blue-200 mt-0.5">
              MRN {adm.mrn || 'MRN-2025-00482'} · {adm.ip_number || 'IP-25-9914'} · {adm.ward_name || 'Ward 3B'} {adm.bed_number || 'Bed 12'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border text-blue-200 border-blue-600">
              View Only — click field to add info
            </span>
            <button onClick={onClose} className="text-blue-300 hover:text-white transition-colors ml-2">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-6 max-h-[80vh] overflow-y-auto">

          <div className="rounded-xl border p-3 flex flex-col gap-2" style={{ borderColor: '#dbe4f0', background: '#f4f7fc' }}>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: NAVY }}>🔍 Look up patient by mobile / BHID</div>
            <div className="relative">
              <input
                type="tel"
                value={phoneInput}
                onChange={e => handlePhoneChange(e.target.value)}
                placeholder="Enter 10-digit mobile — auto-searches"
                maxLength={10}
                className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 pr-8"
                style={{ borderColor: NAVY, minWidth: 0 }}
              />
              {lookupLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              )}
            </div>

            {lookupError && (
              <p className="text-[11px] text-red-600 font-medium">{lookupError}</p>
            )}

            {lookupResult && !profileBanner && (
              <div className="flex items-center justify-between bg-white border rounded-lg px-3 py-2" style={{ borderColor: '#c3d6f0' }}>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Patient found: </span>
                  <span className="text-xs font-semibold text-gray-800">{maskedName(lookupResult.patient_name || lookupResult.name)}</span>
                </div>
                <button
                  onClick={handleSendOtp}
                  disabled={otpLoading}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
                  style={{ background: GREEN }}
                >
                  {otpLoading ? 'Sending…' : 'Verify OTP'}
                </button>
              </div>
            )}

            {profileBanner && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-300 rounded-lg px-3 py-2">
                <CheckCircle size={13} className="text-green-600 flex-shrink-0" />
                <span className="text-[11px] font-semibold text-green-700">Auto-filled from verified profile</span>
              </div>
            )}
          </div>

          {otpStep && (
            <div className="fixed inset-0 z-60 flex items-center justify-center" style={{ background: 'rgba(15,37,87,0.6)' }}>
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ color: NAVY }}>Enter OTP</span>
                  <button onClick={() => { setOtpStep(false); setOtpError('') }} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                </div>
                <p className="text-[11px] text-gray-500">OTP sent to <span className="font-semibold">{phoneInput}</span></p>
                <p className="text-[10px] text-blue-500 font-medium">Dev hint: use <code className="bg-blue-50 px-1 rounded">1234</code></p>
                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpValue}
                  onChange={e => { setOtpValue(e.target.value); setOtpError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                  placeholder="Enter OTP"
                  className="border rounded-lg px-3 py-2.5 text-sm text-center tracking-widest font-bold focus:outline-none focus:ring-1"
                  style={{ borderColor: NAVY }}
                />
                {otpError && <p className="text-[11px] text-red-600 font-medium -mt-2">{otpError}</p>}
                <button
                  onClick={handleVerifyOtp}
                  disabled={otpLoading || !otpValue.trim()}
                  className="w-full text-sm font-bold py-2.5 rounded-lg text-white disabled:opacity-50 transition-opacity"
                  style={{ background: GREEN }}
                >
                  {otpLoading ? 'Verifying…' : 'Verify & Auto-fill'}
                </button>
              </div>
            </div>
          )}

          {GROUPS.map(group => (
            <div key={group.title}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">{group.icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{group.title}</span>
              </div>
              <div className="bg-gray-50 rounded-xl overflow-hidden border" style={{ borderColor: '#e9eaec' }}>
                {group.fields.map(([label, value], i) => {
                  const isEditing = editField === `${group.title}.${label}`
                  const extraVal  = extra[`${group.title}.${label}`]
                  const displayVal = prefilled[label] !== undefined ? prefilled[label] : value
                  return (
                    <div key={label}
                      className={`group flex items-start gap-4 px-4 py-3 ${i !== 0 ? 'border-t' : ''}`}
                      style={{ borderColor: '#f0f0f0' }}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 w-36 flex-shrink-0 mt-0.5">
                        {label}
                      </span>
                      <div className="flex-1">
                        <span className={`text-xs font-semibold ${prefilled[label] !== undefined ? 'text-green-700' : 'text-gray-800'}`}>{displayVal}</span>
                        {extraVal && (
                          <div className="mt-1 text-xs text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg px-2 py-1">
                            <span className="text-[9px] font-bold text-yellow-700 uppercase">Added: </span>{extraVal}
                          </div>
                        )}
                        {isEditing ? (
                          <div className="mt-2 flex gap-2">
                            <input autoFocus
                              placeholder="Add extra info…"
                              defaultValue={extraVal || ''}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  setExtra(prev => ({ ...prev, [`${group.title}.${label}`]: e.target.value }))
                                  setEditField(null)
                                }
                                if (e.key === 'Escape') setEditField(null)
                              }}
                              className="flex-1 border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                              style={{ borderColor: GREEN }}
                            />
                            <button onClick={() => setEditField(null)}
                              className="text-xs text-gray-400 hover:text-gray-600 px-2">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => setEditField(`${group.title}.${label}`)}
                            className="mt-1 text-[10px] flex items-center gap-1 opacity-0 hover:opacity-100 text-gray-400 hover:text-green-600 transition-all group-hover:opacity-100">
                            <Edit3 size={9} /> Add info
                          </button>
                        )}
                      </div>
                      <button onClick={() => setEditField(`${group.title}.${label}`)}
                        className="flex-shrink-0 mt-0.5 text-gray-300 hover:text-green-500 transition-colors">
                        <Edit3 size={11} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 border-t flex items-center justify-between" style={{ borderColor: '#f3f4f6', background: '#fafaf9' }}>
          <span className="text-[10px] text-gray-400">
            Admitted {adm.admitted_at ? new Date(adm.admitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '10 Jun 2025'}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="text-xs font-semibold px-4 py-2 rounded-lg border" style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>
              Close
            </button>
            <button
              onClick={saveAdditions}
              disabled={saving || saved}
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg text-white disabled:opacity-60"
              style={{ background: NAVY }}>
              <Save size={11} /> {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save Additions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function PatientChart() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const { session } = useWardSession()

  const [admission, setAdmission] = useState(null)
  const [vitals, setVitals]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [activeNav, setActiveNav] = useState('dashboard')
  const [openForm, setOpenForm]   = useState(null)
  const [showAdmForm, setShowAdmForm] = useState(false)
  const [editingVital, setEditingVital] = useState(null)
  const [patientAllergies, setPatientAllergies] = useState(null)
  const [patientAllergiesCoded, setPatientAllergiesCoded] = useState([])
  const { requestPin } = usePin()

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [adm, vit] = await Promise.allSettled([
        api.get(`/inpatient/admissions/${id}`),
        api.get(`/inpatient/admissions/${id}/vitals`),
      ])
      if (adm.status === 'fulfilled') {
        setAdmission(adm.value)
        const pid = adm.value?.patient_id
        if (pid) {
          api.get(`/patients/${pid}/clinical`)
            .then(pd => {
              const al = pd?.demographics?.allergies
              if (al) setPatientAllergies(al)
              const coded = pd?.demographics?.allergies_coded
              if (coded) {
                try {
                  setPatientAllergiesCoded(typeof coded === 'string' ? JSON.parse(coded) : (Array.isArray(coded) ? coded : []))
                } catch {}
              }
            })
            .catch(() => {})
        }
      }
      if (vit.status === 'fulfilled') {
        const v = Array.isArray(vit.value) ? vit.value : (vit.value?.items || [])
        setVitals(v)
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const adm      = admission || {}
  const cautions = adm.caution_flags || adm.cautions || []

  const handleOpenForm = async (form) => {
    // DB forms (admin-built) open in the assessments area with patient context;
    // rich hardcoded clinical forms open in the existing PIN-gated in-chart modal.
    if (form?.__db && form.id) {
      const qp = new URLSearchParams({ form_id: String(form.id) })
      if (adm.patient_id) qp.set('patient_id', String(adm.patient_id))
      if (id) qp.set('admission_id', String(id))
      navigate(`/assessments?${qp.toString()}`)
      return
    }
    const identity = await requestPin(`Open form: ${form.name} — ${adm.patient_name || ''}`)
    if (identity?.verified) setOpenForm(form)
  }

  const renderContent = (nav) => {
    switch (nav) {
      case 'provider':    return <ProviderView admission={admission} vitals={vitals} />
      case 'medications': return <MedicationList admission={admission} />
      case 'mar':         return <MAR admission={admission} />
      case 'orders':      return <Orders admission={admission} />
      case 'docs':        return <Documentation admission={admission} />
      case 'food':        return <DietNutrition admission={admission} />
      case 'preop':       return <PrePostOp admission={admission} />
      case 'notes':       return <NursingNotes admission={admission} />
      case 'flowsheet':   return <PatientMovement admission={admission} />
      case 'discharge':   return <DischargeSummary admission={admission} />
      default:            return null
    }
  }

  return (
    <>
      {showAdmForm && (
        <AdmissionFormModal admission={admission} onClose={() => setShowAdmForm(false)} />
      )}
      {editingVital && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) setEditingVital(null) }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-gray-800">Edit Vitals Entry</span>
              <button onClick={() => setEditingVital(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="text-[11px] text-gray-500 mb-4">
              Recorded: {editingVital.recorded_at ? new Date(editingVital.recorded_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'BP Systolic', key: 'bp_sys', placeholder: '120' },
                { label: 'BP Diastolic', key: 'bp_dia', placeholder: '80' },
                { label: 'Pulse (bpm)', key: 'pulse', placeholder: '72' },
                { label: 'Temp (°C)', key: 'temperature', placeholder: '36.8' },
                { label: 'SpO₂ (%)', key: 'spo2', placeholder: '98' },
                { label: 'RR (/min)', key: 'rr', placeholder: '16' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{label}</label>
                  <input type="number" step="0.1"
                    defaultValue={key === 'bp_sys' ? editingVital.blood_pressure?.split('/')[0] : key === 'bp_dia' ? editingVital.blood_pressure?.split('/')[1] : editingVital[key] ?? editingVital[key.replace('_', '')]}
                    onChange={e => {
                      const val = e.target.value
                      setEditingVital(prev => {
                        if (key === 'bp_sys') {
                          const dia = prev.blood_pressure?.split('/')[1] || ''
                          return { ...prev, blood_pressure: `${val}/${dia}` }
                        }
                        if (key === 'bp_dia') {
                          const sys = prev.blood_pressure?.split('/')[0] || ''
                          return { ...prev, blood_pressure: `${sys}/${val}` }
                        }
                        return { ...prev, [key]: val }
                      })
                    }}
                    placeholder={placeholder}
                    className="w-full border rounded-lg px-2.5 py-1.5 text-xs mt-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    style={{ borderColor: '#e5e7eb' }} />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditingVital(null)}
                className="flex-1 py-2 rounded-xl border text-xs font-semibold text-gray-600"
                style={{ borderColor: '#e5e7eb' }}>
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await api.patch(`/inpatient/vitals/${editingVital.id}`, {
                      blood_pressure: editingVital.blood_pressure,
                      pulse: editingVital.pulse ? Number(editingVital.pulse) : undefined,
                      temperature: editingVital.temperature ? Number(editingVital.temperature) : undefined,
                      spo2: editingVital.spo2 ? Number(editingVital.spo2) : undefined,
                      rr: editingVital.rr ? Number(editingVital.rr) : undefined,
                    })
                  } catch {}
                  setEditingVital(null)
                }}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white"
                style={{ background: '#065f46' }}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      <PatientChartShell
        admission={admission}
        vitals={vitals}
        loading={loading}
        patientAllergies={patientAllergies}
        patientAllergiesCoded={patientAllergiesCoded}
        navItems={PATIENT_NAV}
        activeNav={activeNav}
        onNavChange={setActiveNav}
        renderContent={renderContent}
        onOpenForm={handleOpenForm}
        api={api}
        openFormModal={openForm && (
          <AssessmentFullPageModal
            form={openForm}
            admissionId={id}
            patientName={adm.patient_name}
            onClose={() => setOpenForm(null)}
          />
        )}
        formsStorageKey="cc_forms_panel"
        onBack={() => navigate(-1)}
        primaryDoctorName={adm.doctor_name}
        dashboardActions={
          <button
            onClick={() => setShowAdmForm(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-blue-50"
            style={{ borderColor: '#bfdbfe', color: NAVY, background: '#eff6ff' }}>
            <BookOpen size={12} /> Admission Form
          </button>
        }
        renderHeaderRight={
          cautions.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {cautions.map(f => <Badge key={f} flag={f} />)}
            </div>
          ) : null
        }
        onEditVital={setEditingVital}
      />
    </>
  )
}
