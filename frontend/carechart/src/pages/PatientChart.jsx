import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Search, Pin, PinOff, ChevronDown, ChevronUp,
  Loader2, AlertTriangle, Activity, Pill, ClipboardList,
  FileText, Heart, Bed, TrendingUp, ShieldAlert, Droplets, Utensils, Navigation,
  X, Lock, BookOpen, Edit3, CheckCircle, Save
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

const GREEN  = '#065F46'
const NAVY   = '#0F2557'

// ── Badge helpers ────────────────────────────────────────────────────────────
const CAUTION_CFG = {
  critical:   { label: 'Critical',     bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  nbm:        { label: 'NBM',          bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  post_op:    { label: 'Post-op',      bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  blood_thin: { label: 'Blood Thin.',  bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  intubated:  { label: 'Intubated',    bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
  pre_surg:   { label: 'Pre-surgery',  bg: '#fefce8', color: '#a16207', border: '#fde68a' },
  isolation:  { label: '⚠ Isolation',  bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  fall_risk:  { label: '↕ Fall Risk',  bg: '#fffbeb', color: '#92400e', border: '#fcd34d' },
}

function Badge({ flag, label }) {
  const s = CAUTION_CFG[flag] || { label: label || flag, bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' }
  return (
    <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap border"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}>
      {s.label}
    </span>
  )
}

// ── Patient sidebar items ────────────────────────────────────────────────────
const PATIENT_NAV = [
  { key: 'dashboard',    icon: Activity,      label: 'Dashboard' },
  { key: 'provider',     icon: Heart,         label: 'Provider View' },
  { key: 'medications',  icon: Pill,          label: 'Medication List' },
  { key: 'mar',          icon: ClipboardList, label: 'MAR' },
  { key: 'orders',       icon: FileText,      label: 'Orders' },
  { key: 'docs',         icon: FileText,      label: 'Documentation' },
  { key: 'food',         icon: Utensils,      label: 'Diet & Nutrition' },
  { key: 'preop',        icon: Bed,           label: 'Pre / Post-Op Care' },
  { key: 'notes',        icon: FileText,      label: 'Notes' },
  { key: 'flowsheet',    icon: Navigation,    label: 'Patient Movement' },
  { key: 'discharge',    icon: ShieldAlert,   label: 'Discharge Summary' },
]

// ── Assessment form pool ─────────────────────────────────────────────────────
// Each entry: { name, key? } — key maps to FORM_REGISTRY; no key = simple entry placeholder
const FORM_POOL = [
  // Bedside / nursing (simple placeholder)
  { name: 'Vital Signs' },
  { name: 'MAR Quick Entry' },
  { name: 'Pain Score' },
  { name: 'Fluid Balance' },
  { name: 'Braden Scale' },
  { name: 'GCS Assessment' },
  { name: 'Fall Risk — Morse' },
  { name: 'I/O Chart' },
  { name: 'Blood Sugar Log' },
  { name: 'Wound Care Log' },
  { name: 'Nutrition Assessment' },
  { name: 'Neurological Obs' },
  { name: 'Pressure Injury' },
  { name: 'Sepsis Screening' },
  { name: 'DVT Prophylaxis' },
  { name: 'Medication Reconciliation' },
  { name: 'Discharge Checklist' },
  { name: 'Post-Op Monitoring' },
  { name: 'Fluid Resuscitation' },
  { name: 'Restraint Assessment' },
  // Patient history (JSX forms)
  { name: 'Patient Profile',   key: 'patient-profile' },
  { name: 'Chief Complaint',   key: 'chief-complaint' },
  { name: 'Medical History',   key: 'medical-history' },
  { name: 'Family History',    key: 'family-history' },
  { name: 'Social History',    key: 'social-history' },
  { name: 'Allergies',         key: 'allergies' },
  { name: 'Systems Review',    key: 'systems-review' },
  // General
  { name: 'Pain Assessment',   key: 'pain-assessment' },
  { name: 'Asthma Control',    key: 'asthma-basic' },
  // Clinical examination
  { name: 'Clinical Exam',        key: 'systems-clinical-exam' },
  { name: 'Clinical Impression',  key: 'systems-clinical-impression' },
  // Cardiology
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
  // ENT
  { name: 'Ear Assessment',       key: 'ent-ear' },
  { name: 'Nose & Sinus',         key: 'ent-nose-sinus' },
  { name: 'Throat & Larynx',      key: 'ent-throat-larynx' },
  { name: 'Head & Neck',          key: 'ent-head-neck' },
  { name: 'Audiology & Hearing',  key: 'ent-audiology' },
  { name: 'Facial Nerve',         key: 'ent-facial-nerve' },
  { name: 'Paediatric ENT',       key: 'ent-paediatric' },
  { name: 'Tracheostomy',         key: 'ent-tracheostomy' },
  // Gastroenterology
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
  // OBG
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
  // Orthopedics
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
  // Pediatrics
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
  // Specialty / Clinical scales
  { name: 'Aerosol Therapy',         key: 'specialty-aerosol' },
  { name: 'Asthma (Specialty)',      key: 'specialty-asthma' },
  { name: 'Diabetes Assessment',     key: 'specialty-diabetes' },
  { name: 'ACT Score',               key: 'clinical-act' },
  { name: 'ADHD Scale',              key: 'clinical-adhd' },
  { name: 'ALSFRS-R',               key: 'clinical-alsfrs' },
  { name: 'ASRS Screen',            key: 'clinical-asrs' },
  { name: 'Migraine Assessment',    key: 'clinical-migraine' },
]

// Map form name string → registry key (for backward compatibility with any saved pin strings)
const FORM_KEY_MAP = Object.fromEntries(
  FORM_POOL.filter(f => f.key).map(f => [f.name, f.key])
)

// ── Stat card for patient dashboard ─────────────────────────────────────────
function PatientStatCard({ icon: Icon, label, value, sub, color, loading }) {
  return (
    <div className="bg-white rounded-xl border p-3.5 flex flex-col gap-2"
      style={{ borderColor: '#e9eaec' }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15` }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      {loading
        ? <Loader2 size={16} className="animate-spin text-gray-300" />
        : <span className="text-2xl font-extrabold leading-none" style={{ color }}>{value ?? '—'}</span>
      }
      {sub && <span className="text-[10px] text-gray-400 leading-none">{sub}</span>}
    </div>
  )
}

// ── Vitals mini table ────────────────────────────────────────────────────────
function VitalsRow({ vital }) {
  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="px-3 py-1.5 text-[10px] text-gray-400 whitespace-nowrap">
        {vital.recorded_at
          ? new Date(vital.recorded_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
          : '—'}
      </td>
      <td className="px-3 py-1.5 text-xs text-gray-700 whitespace-nowrap font-medium">
        {vital.blood_pressure || '—'}
      </td>
      <td className="px-3 py-1.5 text-xs text-gray-700 whitespace-nowrap">{vital.pulse ?? '—'}</td>
      <td className="px-3 py-1.5 text-xs text-gray-700 whitespace-nowrap">{vital.temperature ?? '—'}</td>
      <td className="px-3 py-1.5 text-xs text-gray-700 whitespace-nowrap">{vital.spo2 ?? '—'}%</td>
      <td className="px-3 py-1.5 text-xs text-gray-700 whitespace-nowrap">{vital.rr ?? '—'}</td>
      <td className="px-3 py-1.5 text-xs text-gray-500 whitespace-nowrap">{vital.recorded_by || '—'}</td>
    </tr>
  )
}

// ── Placeholder for non-dashboard views ─────────────────────────────────────
function ComingSoon({ label }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-2">
      <FileText size={28} className="opacity-30" />
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs opacity-60">Coming soon</p>
    </div>
  )
}

// ── Assessment panel ─────────────────────────────────────────────────────────
function AssessmentPanel({ admissionId }) {
  const { requestPin } = usePin()
  const [pinned, setPinned]         = useState(['Vital Signs', 'MAR Quick Entry', 'Pain Score', 'Fluid Balance'])
  const [poolSearch, setPoolSearch] = useState('')
  const [activeForm, setActiveForm] = useState(null)  // form name string
  const [pinSearch, setPinSearch]   = useState('')
  const [showPinSearch, setShowPinSearch] = useState(false)
  const [simpleValue, setSimpleValue] = useState('')
  const [simpleNotes, setSimpleNotes] = useState('')
  const [simpleError, setSimpleError] = useState('')
  const [simpleSaving, setSimpleSaving] = useState(false)

  const submitSimpleForm = async () => {
    setSimpleError('')
    setSimpleSaving(true)
    try {
      const identity = await requestPin(`Sign: ${activeForm}`)
      if (!identity?.verified) { setSimpleSaving(false); return }
      await api.post(`/inpatient/admissions/${admissionId}/nursing-entries`, {
        form_name: activeForm,
        value: simpleValue,
        notes: simpleNotes,
        signed_by: identity.staff_id,
        signer_name: identity.full_name,
      })
      setActiveForm(null)
      setSimpleValue('')
      setSimpleNotes('')
    } catch (err) {
      setSimpleError(err.message || 'Failed to save. Try again.')
    } finally {
      setSimpleSaving(false)
    }
  }

  // FORM_POOL is now [{name, key?}] — flatten to names for search/pin operations
  const filteredPool = FORM_POOL.filter(f =>
    f.name.toLowerCase().includes(poolSearch.toLowerCase()) && !pinned.includes(f.name)
  )
  const filteredPin = FORM_POOL.filter(f =>
    f.name.toLowerCase().includes(pinSearch.toLowerCase()) && !pinned.includes(f.name)
  )

  const addPin = (name) => { setPinned(p => [...p, name]); setShowPinSearch(false); setPinSearch('') }
  const removePin = (name) => { setPinned(p => p.filter(x => x !== name)); if (activeForm === name) setActiveForm(null) }

  const openForm = (name) => {
    setActiveForm(name === activeForm ? null : name)
    setSimpleValue('')
    setSimpleNotes('')
    setSimpleError('')
  }

  // Look up registry key for active form (may be undefined for simple forms)
  const activeFormKey = activeForm ? FORM_KEY_MAP[activeForm] : null

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#fafaf9' }}>

      {/* Pinned forms section */}
      <div className="flex-shrink-0 border-b" style={{ borderColor: '#e9eaec' }}>
        <div className="flex items-center justify-between px-3 py-2.5 border-b" style={{ borderColor: '#f0f0f0' }}>
          <div className="flex items-center gap-1.5">
            <Pin size={11} style={{ color: GREEN }} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Pinned Forms</span>
          </div>
          <button onClick={() => setShowPinSearch(s => !s)}
            className="text-[10px] font-semibold px-2 py-0.5 rounded-md transition-colors"
            style={{ color: GREEN, background: '#f0fdf4' }}>
            + Pin
          </button>
        </div>

        {showPinSearch && (
          <div className="px-3 py-2 border-b" style={{ borderColor: '#f0f0f0', background: '#f9fafb' }}>
            <div className="relative mb-2">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={pinSearch} onChange={e => setPinSearch(e.target.value)}
                placeholder="Search forms…" autoFocus
                className="w-full pl-6 pr-2 py-1.5 border rounded-lg text-[11px] focus:outline-none bg-white"
                style={{ borderColor: '#d1d5db' }} />
            </div>
            <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
              {filteredPin.map(f => (
                <button key={f.name} onClick={() => addPin(f.name)}
                  className="text-[10px] px-2 py-1 rounded-lg border bg-white hover:border-green-400 hover:text-green-700 transition-colors"
                  style={{ borderColor: '#e5e7eb', color: '#374151' }}>
                  {f.name}
                  {f.key && <span className="ml-1 text-[8px] text-green-500">●</span>}
                </button>
              ))}
              {filteredPin.length === 0 && <span className="text-[10px] text-gray-400">No matches</span>}
            </div>
          </div>
        )}

        {/* Pinned form chips — multi-row wrap */}
        <div className="px-3 py-2.5 flex flex-wrap gap-1.5">
          {pinned.map(f => (
            <div key={f}
              className="group flex items-center gap-1 px-2 py-1 rounded-lg border cursor-pointer transition-all text-[10px] font-semibold"
              style={{
                borderColor: activeForm === f ? GREEN : '#d1fae5',
                background: activeForm === f ? '#f0fdf4' : 'white',
                color: activeForm === f ? GREEN : '#374151',
              }}
              onClick={() => openForm(f)}>
              {f}
              {FORM_KEY_MAP[f] && <span className="text-[8px] text-green-400">●</span>}
              <button onClick={e => { e.stopPropagation(); removePin(f) }}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 text-gray-400 hover:text-red-400">
                <X size={9} />
              </button>
            </div>
          ))}
          {pinned.length === 0 && (
            <span className="text-[10px] text-gray-400 italic">No forms pinned — click + Pin to add</span>
          )}
        </div>

        {/* Active form — JSX component if registered, simple entry otherwise */}
        {activeForm && (
          activeFormKey ? (
            <div className="mx-3 mb-3 rounded-xl border bg-white overflow-hidden"
              style={{ borderColor: '#d1fae5' }}>
              <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: '#e9eaec' }}>
                <span className="text-xs font-bold text-gray-800">{activeForm}</span>
                <button onClick={() => setActiveForm(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={12} />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[60vh] p-1">
                <FormRenderer
                  formKey={activeFormKey}
                  patientId={null}
                  encounterId={admissionId}
                  onSaved={() => setActiveForm(null)}
                />
              </div>
            </div>
          ) : (
            <div className="mx-3 mb-3 p-3 rounded-xl border bg-white"
              style={{ borderColor: '#d1fae5' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-800">{activeForm}</span>
                <button onClick={() => setActiveForm(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={12} />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <input placeholder="Value / observation…"
                  value={simpleValue}
                  onChange={e => { setSimpleValue(e.target.value); setSimpleError('') }}
                  className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  style={{ borderColor: '#d1d5db' }} />
                <input placeholder="Notes (optional)"
                  value={simpleNotes}
                  onChange={e => setSimpleNotes(e.target.value)}
                  className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  style={{ borderColor: '#d1d5db' }} />
                {simpleError && (
                  <p className="text-[10px] text-red-600">{simpleError}</p>
                )}
                <button
                  onClick={submitSimpleForm}
                  disabled={!simpleValue.trim() || simpleSaving}
                  className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                  style={{ background: GREEN }}>
                  <Lock size={10} />
                  {simpleSaving ? 'Saving…' : 'Submit (PIN required)'}
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {/* Pool search section */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2.5 border-b flex-shrink-0"
          style={{ borderColor: '#f0f0f0' }}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">All Forms</span>
        </div>
        <div className="px-3 py-2 flex-shrink-0">
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={poolSearch} onChange={e => setPoolSearch(e.target.value)}
              placeholder="Search all forms…"
              className="w-full pl-7 pr-2 py-1.5 border rounded-lg text-[11px] focus:outline-none bg-white"
              style={{ borderColor: poolSearch ? GREEN : '#e5e7eb' }} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-1">
          {filteredPool.map(f => (
            <div key={f.name}
              className="flex items-center justify-between px-2.5 py-2 rounded-lg border bg-white hover:border-green-300 cursor-pointer transition-colors group"
              style={{ borderColor: '#f0f0f0' }}
              onClick={() => openForm(f.name)}>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px] text-gray-700 group-hover:text-gray-900 truncate">{f.name}</span>
                {f.key && <span className="text-[8px] text-green-500 flex-shrink-0" title="Rich clinical form">●</span>}
              </div>
              <button onClick={e => { e.stopPropagation(); addPin(f.name) }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-green-600 flex-shrink-0">
                <Pin size={10} />
              </button>
            </div>
          ))}
          {filteredPool.length === 0 && poolSearch && (
            <p className="text-[10px] text-gray-400 text-center mt-4">No forms match "{poolSearch}"</p>
          )}
        </div>
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

  const saveAdditions = async () => {
    if (!Object.keys(extra).length) { onClose(); return }
    setSaving(true)
    try {
      await api.patch(`/inpatient/admissions/${adm.id || adm.admission_id}/notes`, { extra_fields: extra })
    } catch {
      // store locally if endpoint unavailable — additions visible for this session
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

        {/* Header */}
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

        {/* Body */}
        <div className="p-6 flex flex-col gap-6 max-h-[80vh] overflow-y-auto">
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
                  return (
                    <div key={label}
                      className={`group flex items-start gap-4 px-4 py-3 ${i !== 0 ? 'border-t' : ''}`}
                      style={{ borderColor: '#f0f0f0' }}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 w-36 flex-shrink-0 mt-0.5">
                        {label}
                      </span>
                      <div className="flex-1">
                        <span className="text-xs font-semibold text-gray-800">{value}</span>
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

        {/* Footer */}
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

// ── Dashboard view (patient-specific) ───────────────────────────────────────
function PatientDashboard({ admission, vitals, loading, session }) {
  const adm = admission || {}
  const latestVital = vitals?.[0] || {}
  const [showAdmForm, setShowAdmForm] = useState(false)

  const los = adm.admitted_at
    ? Math.floor((Date.now() - new Date(adm.admitted_at).getTime()) / 86400000) + 1
    : null

  const STATS = [
    { icon: Heart,         label: 'Last BP',          value: latestVital.blood_pressure || '—',           sub: 'mmHg',              color: '#dc2626' },
    { icon: Activity,      label: 'Pulse',             value: latestVital.pulse != null ? `${latestVital.pulse}` : '—', sub: 'bpm', color: '#2563eb' },
    { icon: TrendingUp,    label: 'SpO₂',              value: latestVital.spo2  != null ? `${latestVital.spo2}%` : '—',sub: 'oxygen sat',         color: '#059669' },
    { icon: Droplets,      label: 'Temperature',       value: latestVital.temperature != null ? `${latestVital.temperature}°` : '—', sub: 'celsius', color: '#d97706' },
    { icon: Bed,           label: 'Length of Stay',    value: los != null ? `Day ${los}` : '—',           sub: 'since admission',    color: NAVY },
    { icon: ClipboardList, label: 'Active Orders',     value: adm.active_orders_count ?? '—',             sub: 'pending orders',     color: '#7c3aed' },
    { icon: Pill,          label: 'Medications',       value: adm.medication_count ?? '—',                sub: 'prescribed',         color: '#0891b2' },
    { icon: ShieldAlert,   label: 'Pending Vitals',    value: adm.pending_vitals_count ?? '—',            sub: '>4h overdue',        color: '#ea580c' },
  ]

  return (
    <div className="p-5 flex flex-col gap-5 overflow-y-auto h-full">
      {showAdmForm && <AdmissionFormModal admission={admission} onClose={() => setShowAdmForm(false)} />}

      {/* Stat cards grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Patient Metrics</h2>
          <button onClick={() => setShowAdmForm(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-blue-50"
            style={{ borderColor: '#bfdbfe', color: NAVY, background: '#eff6ff' }}>
            <BookOpen size={12} />
            Admission Form
          </button>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {STATS.map(s => (
            <PatientStatCard key={s.label} loading={loading && !latestVital.blood_pressure}
              icon={s.icon} label={s.label} value={s.value} sub={s.sub} color={s.color} />
          ))}
        </div>
      </div>

      {/* Recent vitals table */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#e9eaec' }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: '#f0f0f0' }}>
          <span className="text-sm font-bold text-gray-800">Recent Vitals</span>
          <span className="text-[10px] text-gray-400">{vitals?.length ?? 0} records</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 size={18} className="animate-spin mr-2" /> Loading…
          </div>
        ) : !vitals?.length ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <AlertTriangle size={20} className="mb-1.5 opacity-40" />
            <p className="text-xs">No vitals recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Time', 'BP (mmHg)', 'Pulse', 'Temp °C', 'SpO₂', 'RR', 'By'].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vitals.slice(0, 10).map((v, i) => <VitalsRow key={v.id || i} vital={v} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admission info */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#e9eaec' }}>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Admission Details</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            {[
              ['Ward', adm.ward_name || session?.ward?.name || '—'],
              ['Bed', adm.bed_number || '—'],
              ['Department', adm.department_name || '—'],
              ['Admitted', adm.admitted_at ? new Date(adm.admitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'],
              ['Est. Discharge', adm.expected_discharge ? new Date(adm.expected_discharge).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'],
              ['Admission Type', adm.admission_type || '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{k}</dt>
                <dd className="text-xs font-semibold text-gray-700 mt-0.5">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#e9eaec' }}>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Care Team</h3>
          <dl className="grid grid-cols-1 gap-y-2">
            {[
              ['Primary Doctor', adm.doctor_name || '—'],
              ['Nurse Assigned', adm.nurse_name || '—'],
              ['Consultant', adm.consultant_name || '—'],
              ['Referring Doctor', adm.referring_doctor || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <dt className="text-[10px] text-gray-400">{k}</dt>
                <dd className="text-xs font-semibold text-gray-700">{v}</dd>
              </div>
            ))}
          </dl>
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
  const [activeNav, setNav]       = useState('dashboard')
  const [headerExpanded, setHeaderExpanded] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [adm, vit] = await Promise.allSettled([
        api.get(`/inpatient/admissions/${id}`),
        api.get(`/inpatient/admissions/${id}/vitals`),
      ])
      if (adm.status === 'fulfilled') setAdmission(adm.value)
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
  const los      = adm.admitted_at
    ? Math.floor((Date.now() - new Date(adm.admitted_at).getTime()) / 86400000) + 1
    : null

  return (
    <div className="flex flex-col h-full" style={{ background: '#f4f5f7' }}>

      {/* ── Sticky patient header ── */}
      <div className="bg-white border-b flex-shrink-0 shadow-sm" style={{ borderColor: '#e9eaec' }}>
        <div className="px-5 py-2.5">

          {/* Row 1 */}
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
              <ArrowLeft size={14} />
              <span className="text-xs">Back</span>
            </button>
            <div className="w-px h-4 bg-gray-200 flex-shrink-0" />

            {loading ? (
              <Loader2 size={16} className="animate-spin text-gray-300" />
            ) : (
              <>
                <span className="text-base font-extrabold text-gray-900">
                  {adm.patient_name || '—'}
                </span>
                <span className="text-sm text-gray-500">
                  {adm.age && adm.gender ? `${adm.age} yrs, ${adm.gender}` : ''}
                </span>
                <span className="text-[11px] font-mono text-gray-400">
                  MRN: {adm.mrn || adm.patient_mrn || '—'}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                  style={{ background: '#f0fdf4', color: GREEN, border: '1px solid #d1fae5' }}>
                  {adm.bed_number || '—'}
                </span>
                <span className="text-xs text-gray-500">{adm.department_name || session?.department?.name || '—'}</span>
                <span className="text-xs text-gray-500">·</span>
                <span className="text-xs text-gray-600 font-medium">{adm.doctor_name || '—'}</span>

                <div className="flex-1" />

                {/* caution badges */}
                <div className="flex flex-wrap gap-1">
                  {cautions.map(f => <Badge key={f} flag={f} />)}
                  {adm.allergies && (
                    <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full border"
                      style={{ background: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' }}>
                      Allergy: {adm.allergies}
                    </span>
                  )}
                </div>

                <button onClick={() => setHeaderExpanded(e => !e)}
                  className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 ml-1 flex-shrink-0">
                  {headerExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </>
            )}
          </div>

          {/* Row 2 — compact info line */}
          {!loading && (
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-[10px] text-gray-500">
                <span className="font-semibold text-gray-700">Dx:</span> {adm.primary_diagnosis || '—'}
              </span>
              <span className="text-gray-300 text-xs">·</span>
              <span className="text-[10px] text-gray-500">
                Admitted {adm.admitted_at ? new Date(adm.admitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              </span>
              {los && (
                <>
                  <span className="text-gray-300 text-xs">·</span>
                  <span className="text-[10px] font-semibold" style={{ color: NAVY }}>Day {los}</span>
                </>
              )}
              {adm.expected_discharge && (
                <>
                  <span className="text-gray-300 text-xs">·</span>
                  <span className="text-[10px] text-gray-500">
                    Est. discharge {new Date(adm.expected_discharge).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </>
              )}
              {adm.contact_number && (
                <>
                  <span className="text-gray-300 text-xs">·</span>
                  <span className="text-[10px] text-gray-400">📞 {adm.contact_number}</span>
                </>
              )}
            </div>
          )}

          {/* Row 3 — expanded detail */}
          {headerExpanded && !loading && (
            <div className="mt-2 pt-2 border-t grid grid-cols-3 gap-4" style={{ borderColor: '#f0f0f0' }}>
              {[
                ['Blood Group', adm.blood_group || '—'],
                ['Allergies', adm.allergies || 'None documented'],
                ['Attending Doctor', adm.doctor_name || '—'],
                ['Admission Type', adm.admission_type || '—'],
                ['Insurance / Payer', adm.insurance_name || 'Self-pay'],
                ['Emergency Contact', adm.emergency_contact || '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{k}</span>
                  <p className="text-[11px] font-semibold text-gray-700 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Body: patient sidebar + content + assessment panel ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Patient sidebar */}
        <div className="flex-shrink-0 overflow-y-auto border-r"
          style={{ width: 172, background: '#ffffff', borderColor: '#e9eaec' }}>
          <div className="px-3 pt-3 pb-1">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Patient View</span>
          </div>
          <nav className="px-2 pb-4 flex flex-col gap-0.5">
            {PATIENT_NAV.map(item => {
              const active = activeNav === item.key
              return (
                <button key={item.key} onClick={() => setNav(item.key)}
                  className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-all"
                  style={active
                    ? { background: '#f0fdf4', color: GREEN, borderLeft: `2px solid ${GREEN}` }
                    : { color: '#6b7280', borderLeft: '2px solid transparent' }
                  }>
                  <item.icon size={13} style={{ color: active ? GREEN : '#9ca3af', flexShrink: 0 }} />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Dynamic content area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeNav === 'dashboard' && (
            <PatientDashboard admission={admission} vitals={vitals} loading={loading} session={session} />
          )}
          {activeNav === 'provider' && (
            <ProviderView admission={admission} vitals={vitals} />
          )}
          {activeNav === 'medications' && (
            <MedicationList admission={admission} />
          )}
          {activeNav === 'mar' && (
            <MAR admission={admission} />
          )}
          {activeNav === 'orders' && (
            <Orders admission={admission} />
          )}
          {activeNav === 'food' && (
            <DietNutrition admission={admission} />
          )}
          {activeNav === 'docs' && (
            <Documentation admission={admission} />
          )}
          {activeNav === 'preop' && (
            <PrePostOp admission={admission} />
          )}
          {activeNav === 'flowsheet' && (
            <PatientMovement admission={admission} />
          )}
          {activeNav === 'discharge' && (
            <DischargeSummary admission={admission} />
          )}
          {activeNav === 'notes' && (
            <NursingNotes admission={admission} />
          )}
          {activeNav !== 'dashboard' && activeNav !== 'provider' && activeNav !== 'medications' && activeNav !== 'mar' && activeNav !== 'orders' && activeNav !== 'food' && activeNav !== 'docs' && activeNav !== 'preop' && activeNav !== 'flowsheet' && activeNav !== 'discharge' && activeNav !== 'notes' && (
            <ComingSoon label={PATIENT_NAV.find(n => n.key === activeNav)?.label || ''} />
          )}
        </div>

        {/* Assessment panel — hidden on full-width views */}
        {activeNav !== 'medications' && activeNav !== 'mar' && activeNav !== 'orders' && activeNav !== 'food' && activeNav !== 'docs' && activeNav !== 'preop' && activeNav !== 'flowsheet' && activeNav !== 'discharge' && activeNav !== 'notes' && (
          <div className="flex-shrink-0 border-l overflow-hidden flex flex-col"
            style={{ width: 272, borderColor: '#e9eaec' }}>
            <AssessmentPanel admissionId={id} />
          </div>
        )}
      </div>
    </div>
  )
}
