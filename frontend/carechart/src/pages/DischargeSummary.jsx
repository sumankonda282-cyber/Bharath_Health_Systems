import { useState, useEffect, useCallback } from 'react'
import {
  Printer, Save, CheckCircle, Edit3, Plus, X, Lock, ChevronRight,
  Loader2, AlertTriangle, User, Calendar, Stethoscope, Activity,
  Pill, FileText, Heart, TrendingUp, MapPin, Phone, Shield,
  ClipboardList, Thermometer, Droplets, BookOpen, Truck, Award
} from 'lucide-react'
import api from '../api/client'

const GREEN = '#065F46'
const NAVY  = '#0F2557'
const RED   = '#CC1414'

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}
function los(admitted) {
  if (!admitted) return null
  return Math.floor((Date.now() - new Date(admitted).getTime()) / 86400000) + 1
}

// ── Inline edit field ─────────────────────────────────────────────────────────
function EditField({ value, onChange, multiline = false, placeholder = 'Click to add…', readOnly = false }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(value || '')

  useEffect(() => { setDraft(value || '') }, [value])

  if (readOnly || !editing) {
    return (
      <div
        onClick={() => !readOnly && setEditing(true)}
        className={`text-sm text-gray-800 leading-relaxed min-h-[1.5rem] rounded-lg px-2 py-1 -mx-2 transition-colors ${readOnly ? '' : 'hover:bg-green-50 cursor-text group'}`}
      >
        {draft || <span className="text-gray-300 italic text-xs">{placeholder}</span>}
        {!readOnly && (
          <Edit3 size={10} className="inline ml-1.5 text-gray-300 group-hover:text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {multiline ? (
        <textarea
          autoFocus rows={4}
          value={draft} onChange={e => setDraft(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-1"
          style={{ borderColor: GREEN, ringColor: GREEN }}
          placeholder={placeholder}
        />
      ) : (
        <input
          autoFocus type="text"
          value={draft} onChange={e => setDraft(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1"
          style={{ borderColor: GREEN }}
          placeholder={placeholder}
        />
      )}
      <div className="flex gap-2">
        <button onClick={() => { onChange(draft); setEditing(false) }}
          className="text-xs font-bold px-3 py-1 rounded-lg text-white" style={{ background: GREEN }}>
          Save
        </button>
        <button onClick={() => { setDraft(value || ''); setEditing(false) }}
          className="text-xs font-bold px-3 py-1 rounded-lg text-gray-500 border" style={{ borderColor: '#e5e7eb' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function Section({ id, icon: Icon, title, iconBg, children, onRef }) {
  return (
    <div id={id} ref={onRef} className="bg-white rounded-2xl border overflow-hidden mx-5 mb-4" style={{ borderColor: '#e9eaec' }}>
      <div className="flex items-center gap-3 px-5 py-3.5 border-b" style={{ borderColor: '#f3f4f6', background: '#fafaf9' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: iconBg || '#f0fdf4' }}>
          <Icon size={14} style={{ color: GREEN }} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ── Field label+value pair ─────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      <div className="text-xs font-semibold text-gray-800">{children}</div>
    </div>
  )
}

// ── Nav dots ───────────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: 'header',        label: 'Patient Header' },
  { id: 'admission',     label: 'Admission Details' },
  { id: 'diagnosis',     label: 'Diagnosis' },
  { id: 'clinical',      label: 'Clinical Findings' },
  { id: 'investigations',label: 'Key Investigations' },
  { id: 'course',        label: 'Hospital Course' },
  { id: 'surgical',      label: 'Surgical Details' },
  { id: 'condition',     label: 'Discharge Condition' },
  { id: 'medications',   label: 'Discharge Medications' },
  { id: 'followup',      label: 'Follow-up & Instructions' },
  { id: 'education',     label: 'Patient Education' },
  { id: 'transport',     label: 'Transport' },
  { id: 'signatures',    label: 'Signatures' },
]

// ── Mock data (auto-populated from chart) ─────────────────────────────────────
function buildMockSummary(admission, vitals, orders, rounds, movement) {
  const adm = admission || {}
  const lastVital = vitals?.[0] || {}

  return {
    /* admission */
    admitted_at:        adm.admitted_at        || '2025-06-10T08:30:00',
    discharged_at:      adm.expected_discharge  || '2025-06-15T11:00:00',
    admission_type:     adm.admission_type      || 'Emergency',
    ward:               adm.ward_name           || 'General Surgery — Ward 3B',
    bed:                adm.bed_number          || 'Bed 12',
    uhid:               adm.mrn || adm.patient_mrn || 'MRN-2025-00482',
    ip_number:          adm.ip_number           || 'IP-25-9914',
    insurance:          adm.insurance_name      || 'Star Health — TPA Pre-auth #TPA-2025-441',

    /* primary dx */
    primary_diagnosis:  adm.primary_diagnosis   || 'Acute Appendicitis with Peritonitis',
    icd_code:           adm.icd_code            || 'K37',
    secondary_diagnoses:adm.secondary_diagnoses || [
      'Type 2 Diabetes Mellitus (E11.9)',
      'Hypertension (I10)',
      'Obesity BMI 31.2 (E66.09)',
    ],
    allergies:          adm.allergies            || 'Penicillin — Rash',

    /* care team */
    doctor_name:        adm.doctor_name          || 'Dr. Srinivasa Rao, MS (Gen. Surgery)',
    consultant:         adm.consultant_name      || 'Dr. Meena Krishnan, MD (Internal Medicine)',
    anaesthetist:       adm.anaesthetist         || 'Dr. Ravi Menon, DA, FFARCS',
    nurse:              adm.nurse_name           || 'Sr. Lakshmi Devi',

    /* presenting complaints */
    complaints:         adm.complaints           || 'Right iliac fossa pain × 2 days, nausea, fever, anorexia.',

    /* clinical findings */
    presenting_vitals: {
      bp:    adm.admission_bp    || lastVital.blood_pressure || '130/86',
      pulse: adm.admission_pulse || lastVital.pulse          || '102',
      temp:  adm.admission_temp  || lastVital.temperature    || '38.4',
      spo2:  adm.admission_spo2  || lastVital.spo2           || '97',
      rr:    adm.admission_rr    || lastVital.rr             || '20',
      wt:    adm.weight          || '74',
    },
    examination:        adm.examination || 'Abdomen: Guarding and rigidity in RIF. Rovsing\'s sign positive. Per rectum: tenderness at 10 o\'clock position.',

    /* investigations */
    investigations: adm.investigations || [
      { test: 'CBC', result: 'WBC 18,400/µL (N 82%), Hb 13.2 g/dL, Plt 2.1 L', date: '10 Jun', flag: 'High WBC' },
      { test: 'CRP', result: '148 mg/L', date: '10 Jun', flag: 'Elevated' },
      { test: 'USG Abdomen', result: 'Appendix diameter 10 mm, echogenic fat stranding, free fluid RIF', date: '10 Jun', flag: 'Positive' },
      { test: 'RBS', result: '198 mg/dL', date: '10 Jun', flag: '' },
      { test: 'S. Creatinine', result: '0.9 mg/dL', date: '10 Jun', flag: '' },
      { test: 'CECT Abdomen', result: 'Confirmed acute appendicitis with early perforation', date: '10 Jun', flag: 'Critical' },
    ],

    /* hospital course */
    hospital_course: adm.hospital_course || `Patient admitted through emergency with 2-day history of right iliac fossa pain, fever, and vomiting. Clinical and radiological diagnosis of acute appendicitis with early perforation was made.

Patient was optimised with IV fluids, antibiotics (Ceftriaxone + Metronidazole), and analgesics. Laparoscopic appendectomy was performed under general anaesthesia on 10 Jun at 14:30. Intra-operatively, a gangrenous appendix with early pericaecal collection was found; peritoneal washout performed with a drain placed.

Post-operative recovery was smooth. Blood sugars managed with insulin sliding scale. Surgical site healing satisfactorily. Drain removed POD 3. Diet gradually upgraded from clear liquids to full diet. Discharged on POD 5 in stable condition.`,

    /* surgical */
    procedure:          adm.procedure || 'Laparoscopic Appendectomy + Peritoneal Washout',
    op_date:            adm.op_date   || '2025-06-10T14:30:00',
    anaesthesia:        adm.anaesthesia_type || 'General Anaesthesia',
    duration:           adm.op_duration      || '55 min',
    implants:           adm.implants         || 'None',
    drains:             adm.drains           || 'Jackson-Pratt #10 RIF — removed POD 3',
    blood_loss:         adm.ebl              || '< 50 mL',
    complications:      adm.intraop_complications || 'Nil',

    /* discharge condition */
    condition:          adm.discharge_condition || 'Stable',
    gcs:                '15/15',
    discharge_vitals: {
      bp:    '122/78',
      pulse: '78',
      temp:  '36.8',
      spo2:  '99',
      rr:    '16',
    },
    wound_status:       'Surgical site clean, dry, healing well. Staples intact.',

    /* medications */
    discharge_medications: orders?.filter?.(o => o.status === 'active') || [
      { drug: 'Tab. Amoxicillin-Clavulanate 625 mg', dose: '1 tab', freq: 'TDS × 5 days', route: 'Oral', instructions: 'After food' },
      { drug: 'Tab. Metronidazole 400 mg', dose: '1 tab', freq: 'TDS × 5 days', route: 'Oral', instructions: 'After food' },
      { drug: 'Tab. Pantoprazole 40 mg', dose: '1 tab', freq: 'OD × 7 days', route: 'Oral', instructions: 'Empty stomach' },
      { drug: 'Tab. Paracetamol 500 mg', dose: '1 tab', freq: 'TDS × 3 days (PRN pain)', route: 'Oral', instructions: 'After food' },
      { drug: 'Tab. Metformin 500 mg', dose: '1 tab', freq: 'BD', route: 'Oral', instructions: 'Continue home medication' },
    ],

    /* follow-up */
    followup_date:      adm.followup_date || '2025-06-22T10:00:00',
    followup_doctor:    adm.doctor_name || 'Dr. Srinivasa Rao',
    followup_clinic:    'Surgical OPD',
    activity_restrictions: 'No heavy lifting >5 kg for 4 weeks. Light walking encouraged from Day 1. No strenuous activity for 6 weeks.',
    diet_instructions:  'Soft diet for 1 week. Increase fibre. 2–3 L fluids/day. No alcohol.',
    wound_care:         'Keep wound dry for 5 days. Review staples at OPD Day 7. Watch for redness/discharge.',
    warning_signs:      'Fever >38°C, wound redness/pus, persistent vomiting, abdominal distension, inability to eat — attend ER immediately.',
    special_instructions: 'Monitor blood sugar twice daily. Continue antihypertensives. Follow up with physician within 2 weeks for diabetes review.',

    /* education */
    education_topics: [
      { topic: 'Wound care and dressing technique', done: true },
      { topic: 'Medication schedule explained (written copy given)', done: true },
      { topic: 'Diet and fluid intake guidance', done: true },
      { topic: 'Activity restrictions discussed', done: true },
      { topic: 'Warning signs for readmission explained', done: true },
      { topic: 'Diabetes home monitoring', done: true },
      { topic: 'Patient education leaflet given', done: true },
      { topic: 'Next follow-up appointment confirmed', done: true },
    ],

    /* transport */
    transport_mode:     'Own vehicle',
    accompanied_by:     'Spouse — Priya Mehta (9876543210)',
    discharge_time:     '2025-06-15T11:00:00',

    /* status */
    status: 'draft',   /* draft | pending | signed */
    signatures: {
      doctor:   { name: adm.doctor_name || 'Dr. Srinivasa Rao', signed: false, time: null },
      counter:  { name: 'Dr. Anita Verma (HOD Surgery)',       signed: false, time: null },
      nurse:    { name: adm.nurse_name || 'Sr. Lakshmi Devi',  signed: false, time: null },
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export default function DischargeSummary({ admission }) {
  const adm = admission || {}
  const id  = adm.id || adm.admission_id

  const [loading, setLoading]   = useState(true)
  const [summary, setSummary]   = useState(null)
  const [activeSection, setActiveSection] = useState('header')
  const [pinModal, setPinModal] = useState(null)   /* { role } */
  const [pin, setPin]           = useState('')
  const [pinError, setPinError] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [saving, setSaving]     = useState(false)

  // Load all chart data to auto-populate
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [vits, ords, rds, mvt] = await Promise.allSettled([
        api.get(`/inpatient/admissions/${id}/vitals`),
        api.get(`/inpatient/admissions/${id}/orders`),
        api.get(`/inpatient/admissions/${id}/ward-rounds`),
        api.get(`/inpatient/admissions/${id}/patient-movement`),
      ])
      const vitals    = vits.status === 'fulfilled' ? (Array.isArray(vits.value) ? vits.value : vits.value?.items || []) : []
      const orders    = ords.status === 'fulfilled' ? (Array.isArray(ords.value) ? ords.value : ords.value?.items || []) : []
      const rounds    = rds.status  === 'fulfilled' ? (Array.isArray(rds.value)  ? rds.value  : rds.value?.items  || []) : []
      const movement  = mvt.status  === 'fulfilled' ? (Array.isArray(mvt.value)  ? mvt.value  : mvt.value?.items  || []) : []

      // Try to load saved summary from API
      try {
        const saved = await api.get(`/inpatient/admissions/${id}/discharge-summary`)
        if (saved && Object.keys(saved).length > 0) {
          setSummary(saved)
          return
        }
      } catch { /* not saved yet — build from chart */ }

      setSummary(buildMockSummary(adm, vitals, orders, rounds, movement))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { if (id) load() }, [load, id])
  useEffect(() => {
    if (!id && !loading) setSummary(buildMockSummary(adm, [], [], [], []))
  }, [id])

  // If no id, show mock immediately
  useEffect(() => {
    if (!id) { setSummary(buildMockSummary(adm, [], [], [], [])); setLoading(false) }
  }, [])

  const update = (path, value) => {
    setSummary(prev => {
      const next = { ...prev }
      const parts = path.split('.')
      let obj = next
      for (let i = 0; i < parts.length - 1; i++) {
        obj[parts[i]] = { ...obj[parts[i]] }
        obj = obj[parts[i]]
      }
      obj[parts[parts.length - 1]] = value
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.post(`/inpatient/admissions/${id}/discharge-summary`, summary)
    } catch { /* local only */ } finally {
      setSaving(false)
    }
  }

  const handleSign = async (role) => {
    setPinLoading(true)
    setPinError('')
    try {
      await api.post('/auth/staff/pin-identify', { pin })
      setSummary(prev => ({
        ...prev,
        signatures: {
          ...prev.signatures,
          [role]: { ...prev.signatures[role], signed: true, time: new Date().toISOString() }
        }
      }))
      setPinModal(null)
      setPin('')
    } catch {
      setPinError('Invalid PIN — try again')
    } finally {
      setPinLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full text-gray-400">
      <Loader2 size={22} className="animate-spin mr-2" /> Building discharge summary…
    </div>
  )
  if (!summary) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
      <AlertTriangle size={24} className="opacity-40" />
      <p className="text-sm">Unable to load summary</p>
    </div>
  )

  const s = summary
  const dayCount = s.admitted_at && s.discharged_at
    ? Math.ceil((new Date(s.discharged_at) - new Date(s.admitted_at)) / 86400000)
    : los(s.admitted_at)

  const allSigned = s.signatures.doctor.signed && s.signatures.counter.signed && s.signatures.nurse.signed

  return (
    <div className="flex h-full overflow-hidden" style={{ background: '#f0f2f5' }}>

      {/* ── Left Nav ── */}
      <div className="w-48 flex-shrink-0 bg-white border-r overflow-y-auto" style={{ borderColor: '#e9eaec' }}>
        <div className="px-4 pt-4 pb-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Sections</span>
        </div>
        <nav className="pb-4">
          {NAV_SECTIONS.map(sec => {
            const active = activeSection === sec.id
            const done   = sec.id === 'header' || sec.id === 'admission' || sec.id === 'diagnosis'
            const current= sec.id === 'course'
            return (
              <button key={sec.id}
                onClick={() => {
                  setActiveSection(sec.id)
                  document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className="flex items-center gap-2.5 w-full text-left px-4 py-2 text-[11px] font-semibold transition-all"
                style={active
                  ? { color: GREEN, borderLeft: `3px solid ${GREEN}`, background: '#f0fdf4' }
                  : { color: '#6b7280', borderLeft: '3px solid transparent' }
                }>
                <span className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: done ? GREEN : current ? '#f59e0b' : '#e5e7eb' }} />
                {sec.label}
              </button>
            )
          })}
        </nav>

        {/* Status + sign area in nav */}
        <div className="mx-3 mb-4 p-3 rounded-xl border" style={{ borderColor: '#e9eaec', background: '#fafaf9' }}>
          <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-2">Status</p>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border"
            style={allSigned
              ? { background: '#dcfce7', color: '#15803d', borderColor: '#a7f3d0' }
              : { background: '#f3f4f6', color: '#6b7280', borderColor: '#e5e7eb' }}>
            {allSigned ? <CheckCircle size={9} /> : <Edit3 size={9} />}
            {allSigned ? 'Finalised' : 'Draft'}
          </span>
        </div>
      </div>

      {/* ── Main scroll area ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Sticky topbar */}
        <div className="sticky top-0 z-30 bg-white border-b shadow-sm flex items-center gap-3 px-5 py-2.5 flex-shrink-0" style={{ borderColor: '#e9eaec' }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-gray-900 truncate">
                {adm.patient_name || 'Ramesh Mehta'}
              </span>
              <span className="text-xs text-gray-400">
                {adm.age || '45'} yrs · {adm.gender || 'Male'} · MRN {adm.mrn || s.uhid}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
                style={allSigned
                  ? { background: '#dcfce7', color: '#15803d', borderColor: '#a7f3d0' }
                  : { background: '#f3f4f6', color: '#6b7280', borderColor: '#e5e7eb' }}>
                {allSigned ? '✦ Signed' : '✎ Draft'}
              </span>
              {dayCount && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                  style={{ background: '#eff6ff', color: NAVY, borderColor: '#bfdbfe' }}>
                  LOS {dayCount} days
                </span>
              )}
              <span className="text-[10px] text-gray-400">
                {adm.primary_diagnosis || s.primary_diagnosis}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors hover:bg-gray-50"
              style={{ borderColor: '#e5e7eb', color: '#374151' }}>
              <Printer size={12} /> Print Full
            </button>
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors hover:bg-gray-50"
              style={{ borderColor: '#e5e7eb', color: '#374151' }}>
              <Printer size={12} /> Patient Copy
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
              style={{ borderColor: GREEN, color: GREEN, background: '#f0fdf4' }}>
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              Save Draft
            </button>
            <button onClick={() => setPinModal({ role: 'doctor' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors"
              style={{ background: GREEN }}>
              <Lock size={11} /> Sign &amp; Finalise
            </button>
          </div>
        </div>

        {/* ── Header card ── */}
        <div id="header" className="mx-5 mt-4 mb-4 rounded-2xl overflow-hidden border" style={{ borderColor: '#a7f3d0' }}>
          <div className="px-6 py-5 flex items-start justify-between gap-6" style={{ background: GREEN }}>
            <div>
              <div className="text-xs font-bold text-green-200 uppercase tracking-wider mb-1">Discharge Summary</div>
              <div className="text-2xl font-extrabold text-white">{adm.patient_name || 'Ramesh Mehta'}</div>
              <div className="text-sm text-green-200 mt-0.5">
                {adm.age || '45'} yrs · {adm.gender || 'Male'} · {adm.blood_group || 'B+'} · MRN {adm.mrn || s.uhid}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[10px] font-bold text-green-100 bg-green-700 px-2 py-0.5 rounded-full">
                  {s.ip_number}
                </span>
                <span className="text-[10px] text-green-200">{s.ward} · {s.bed}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold text-green-200 uppercase tracking-wider">Primary Diagnosis</div>
              <div className="text-sm font-bold text-white mt-1 max-w-56 text-right">{s.primary_diagnosis}</div>
              <div className="text-[10px] text-green-300 mt-0.5">ICD-10: {s.icd_code}</div>
              <div className="mt-3 text-[10px] font-bold text-green-200">Treating Surgeon</div>
              <div className="text-xs font-semibold text-white mt-0.5">{s.doctor_name}</div>
            </div>
          </div>
          {/* Meta strip */}
          <div className="flex divide-x" style={{ background: '#f0fdf4', borderTop: '1px solid #a7f3d0', divideColor: '#d1fae5' }}>
            {[
              { label: 'Admission', value: fmtDate(s.admitted_at) },
              { label: 'Discharge', value: fmtDate(s.discharged_at) },
              { label: 'Length of Stay', value: `${dayCount || '—'} days` },
              { label: 'Insurance', value: s.insurance?.split('—')[0]?.trim() || 'Self-Pay' },
              { label: 'Admission Type', value: s.admission_type },
            ].map(m => (
              <div key={m.label} className="flex-1 px-4 py-3 border-r last:border-r-0" style={{ borderColor: '#d1fae5' }}>
                <div className="text-[9px] font-bold uppercase tracking-wider text-green-600">{m.label}</div>
                <div className="text-xs font-bold text-gray-800 mt-0.5">{m.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Admission Details ── */}
        <Section id="admission" icon={ClipboardList} title="Admission Details" iconBg="#eff6ff">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-4">
            <Field label="IP Number">{s.ip_number}</Field>
            <Field label="UHID / MRN">{s.uhid}</Field>
            <Field label="Ward & Bed">{s.ward} · {s.bed}</Field>
            <Field label="Admission Type">{s.admission_type}</Field>
            <Field label="Date of Admission">{fmtDateTime(s.admitted_at)}</Field>
            <Field label="Date of Discharge">{fmtDateTime(s.discharged_at)}</Field>
            <Field label="Insurance / Payer">{s.insurance}</Field>
            <Field label="Allergies">
              <span className="text-red-600 font-bold">{s.allergies || 'NKDA'}</span>
            </Field>
          </div>
          <div className="border-t pt-4 mt-2 grid grid-cols-2 gap-x-8 gap-y-3" style={{ borderColor: '#f3f4f6' }}>
            <Field label="Treating Doctor">{s.doctor_name}</Field>
            <Field label="Consultant">{s.consultant}</Field>
            <Field label="Anaesthetist">{s.anaesthetist}</Field>
            <Field label="Primary Nurse">{s.nurse}</Field>
          </div>
          <div className="border-t pt-4 mt-4" style={{ borderColor: '#f3f4f6' }}>
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-2">Presenting Complaints</div>
            <EditField
              value={s.complaints}
              onChange={v => update('complaints', v)}
              multiline
              placeholder="Enter presenting complaints…"
            />
          </div>
        </Section>

        {/* ── Diagnosis ── */}
        <Section id="diagnosis" icon={Stethoscope} title="Diagnosis" iconBg="#fef2f2">
          <div className="mb-4">
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-2">Primary Diagnosis</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-gray-900">{s.primary_diagnosis}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold"
                style={{ background: '#eff6ff', color: NAVY, borderColor: '#bfdbfe' }}>
                ICD-10: {s.icd_code}
              </span>
            </div>
          </div>
          <div className="border-t pt-4" style={{ borderColor: '#f3f4f6' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Secondary / Comorbid Diagnoses</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(s.secondary_diagnoses || []).map((dx, i) => (
                <span key={i} className="text-xs px-3 py-1.5 rounded-full border font-medium"
                  style={{ background: '#fafaf9', borderColor: '#e9eaec', color: '#374151' }}>
                  {dx}
                </span>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Clinical Findings ── */}
        <Section id="clinical" icon={Activity} title="Clinical Findings" iconBg="#fff7ed">
          <div className="mb-4">
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-3">Vitals on Admission</div>
            <div className="grid grid-cols-6 gap-3">
              {[
                { label: 'BP', value: s.presenting_vitals.bp, unit: 'mmHg', color: '#dc2626' },
                { label: 'Pulse', value: s.presenting_vitals.pulse, unit: 'bpm', color: '#2563eb' },
                { label: 'Temp', value: s.presenting_vitals.temp, unit: '°C', color: '#d97706' },
                { label: 'SpO₂', value: `${s.presenting_vitals.spo2}%`, unit: '', color: '#059669' },
                { label: 'RR', value: s.presenting_vitals.rr, unit: '/min', color: '#7c3aed' },
                { label: 'Weight', value: `${s.presenting_vitals.wt} kg`, unit: '', color: '#0891b2' },
              ].map(v => (
                <div key={v.label} className="bg-gray-50 rounded-xl p-3 text-center border" style={{ borderColor: '#e9eaec' }}>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{v.label}</div>
                  <div className="text-lg font-extrabold mt-1" style={{ color: v.color }}>{v.value}</div>
                  {v.unit && <div className="text-[9px] text-gray-400">{v.unit}</div>}
                </div>
              ))}
            </div>
          </div>
          <div className="border-t pt-4" style={{ borderColor: '#f3f4f6' }}>
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-2">Physical Examination Findings</div>
            <EditField
              value={s.examination}
              onChange={v => update('examination', v)}
              multiline
              placeholder="Enter examination findings…"
            />
          </div>
        </Section>

        {/* ── Key Investigations ── */}
        <Section id="investigations" icon={TrendingUp} title="Key Investigations" iconBg="#f5f3ff">
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: '#fafaf9' }}>
                  {['Test / Investigation', 'Result', 'Date', 'Flag'].map(h => (
                    <th key={h} className="text-left text-[9px] font-bold uppercase tracking-wider text-gray-400 px-3 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ divideColor: '#f3f4f6' }}>
                {(s.investigations || []).map((inv, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: '#f3f4f6' }}>
                    <td className="px-3 py-2.5 font-semibold text-gray-800">{inv.test}</td>
                    <td className="px-3 py-2.5 text-gray-700 max-w-xs">{inv.result}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{inv.date}</td>
                    <td className="px-3 py-2.5">
                      {inv.flag && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                          style={inv.flag === 'Critical'
                            ? { background: '#fee2e2', color: '#b91c1c' }
                            : inv.flag.toLowerCase().includes('high') || inv.flag === 'Elevated' || inv.flag === 'Positive'
                            ? { background: '#fef9c3', color: '#a16207' }
                            : { background: '#f3f4f6', color: '#6b7280' }}>
                          {inv.flag}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── Hospital Course ── */}
        <Section id="course" icon={BookOpen} title="Hospital Course" iconBg="#f0fdf4">
          <p className="text-[10px] text-gray-400 mb-3 italic">
            Auto-compiled from ward rounds, nursing notes, and patient movement. Click to edit.
          </p>
          <EditField
            value={s.hospital_course}
            onChange={v => update('hospital_course', v)}
            multiline
            placeholder="Describe the hospital course, treatment given, and response…"
          />
        </Section>

        {/* ── Surgical Details ── */}
        <Section id="surgical" icon={Shield} title="Surgical / Procedural Details" iconBg="#f5f3ff">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Procedure</div>
              <EditField value={s.procedure} onChange={v => update('procedure', v)} placeholder="Procedure name…" />
            </div>
            <Field label="Date &amp; Time of Surgery">{fmtDateTime(s.op_date)}</Field>
            <Field label="Anaesthesia Type">{s.anaesthesia}</Field>
            <Field label="Duration">{s.duration}</Field>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Implants / Prosthetics</div>
              <EditField value={s.implants} onChange={v => update('implants', v)} placeholder="None / details…" />
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Drains Placed</div>
              <EditField value={s.drains} onChange={v => update('drains', v)} placeholder="Type, location, removed date…" />
            </div>
            <Field label="Estimated Blood Loss">{s.blood_loss}</Field>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Intra-op Complications</div>
              <EditField value={s.complications} onChange={v => update('complications', v)} placeholder="Nil / details…" />
            </div>
          </div>
        </Section>

        {/* ── Discharge Condition ── */}
        <Section id="condition" icon={Heart} title="Condition at Discharge" iconBg="#fef2f2">
          <div className="flex items-center gap-3 mb-5">
            {['Stable', 'Improved', 'Against Medical Advice', 'Referred', 'Deceased'].map(c => (
              <button key={c} onClick={() => update('condition', c)}
                className="text-xs font-bold px-3 py-1.5 rounded-full border transition-colors"
                style={s.condition === c
                  ? { background: c === 'Deceased' ? '#fee2e2' : c === 'Against Medical Advice' ? '#fef9c3' : '#dcfce7', color: c === 'Deceased' ? '#b91c1c' : c === 'Against Medical Advice' ? '#a16207' : '#15803d', borderColor: c === 'Deceased' ? '#fca5a5' : c === 'Against Medical Advice' ? '#fde047' : '#a7f3d0' }
                  : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}>
                {c}
              </button>
            ))}
          </div>
          <div className="mb-4">
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-3">Vitals at Discharge</div>
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: 'BP', value: s.discharge_vitals.bp, unit: 'mmHg', color: '#dc2626' },
                { label: 'Pulse', value: s.discharge_vitals.pulse, unit: 'bpm', color: '#2563eb' },
                { label: 'Temp', value: s.discharge_vitals.temp, unit: '°C', color: '#d97706' },
                { label: 'SpO₂', value: `${s.discharge_vitals.spo2}%`, unit: '', color: '#059669' },
                { label: 'RR', value: s.discharge_vitals.rr, unit: '/min', color: '#7c3aed' },
              ].map(v => (
                <div key={v.label} className="bg-gray-50 rounded-xl p-3 text-center border" style={{ borderColor: '#e9eaec' }}>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{v.label}</div>
                  <div className="text-lg font-extrabold mt-1" style={{ color: v.color }}>{v.value}</div>
                  {v.unit && <div className="text-[9px] text-gray-400">{v.unit}</div>}
                </div>
              ))}
            </div>
          </div>
          <div className="border-t pt-4" style={{ borderColor: '#f3f4f6' }}>
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-2">Wound / Surgical Site Status</div>
            <EditField value={s.wound_status} onChange={v => update('wound_status', v)} multiline placeholder="Wound appearance, healing, dressing status…" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Field label="GCS at Discharge">{s.gcs}</Field>
          </div>
        </Section>

        {/* ── Discharge Medications ── */}
        <Section id="medications" icon={Pill} title="Discharge Medications" iconBg="#fff7ed">
          <p className="text-[10px] text-gray-400 mb-3 italic">Auto-pulled from active medication orders. Doctors can add, edit, or remove.</p>
          <div className="overflow-x-auto -mx-1 mb-4">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: '#fafaf9' }}>
                  {['Drug / Brand', 'Dose', 'Frequency', 'Route', 'Special Instructions'].map(h => (
                    <th key={h} className="text-left text-[9px] font-bold uppercase tracking-wider text-gray-400 px-3 py-2 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(s.discharge_medications || []).map((m, i) => (
                  <tr key={i} className="border-b" style={{ borderColor: '#f3f4f6' }}>
                    <td className="px-3 py-2.5 font-semibold text-gray-800">{m.drug}</td>
                    <td className="px-3 py-2.5 text-gray-700">{m.dose}</td>
                    <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">{m.freq}</td>
                    <td className="px-3 py-2.5 text-gray-500">{m.route}</td>
                    <td className="px-3 py-2.5 text-gray-500">{m.instructions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
            style={{ color: GREEN, borderColor: '#d1fae5', background: '#f0fdf4' }}>
            <Plus size={12} /> Add Medication
          </button>
        </Section>

        {/* ── Follow-up & Instructions ── */}
        <Section id="followup" icon={Calendar} title="Follow-up & Instructions" iconBg="#eff6ff">
          <div className="grid grid-cols-3 gap-4 mb-5 p-4 rounded-xl border" style={{ background: '#f0fdf4', borderColor: '#a7f3d0' }}>
            <Field label="Follow-up Date">{fmtDateTime(s.followup_date)}</Field>
            <Field label="Doctor">{s.followup_doctor}</Field>
            <Field label="Clinic">{s.followup_clinic}</Field>
          </div>
          <div className="grid grid-cols-1 gap-5">
            {[
              { key: 'activity_restrictions', label: 'Activity Restrictions', icon: '🏃' },
              { key: 'diet_instructions',     label: 'Diet & Nutrition',       icon: '🍽' },
              { key: 'wound_care',            label: 'Wound Care',             icon: '🩹' },
              { key: 'special_instructions',  label: 'Special Instructions',   icon: '📋' },
            ].map(item => (
              <div key={item.key}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{item.label}</span>
                </div>
                <EditField
                  value={s[item.key]}
                  onChange={v => update(item.key, v)}
                  multiline
                  placeholder={`Add ${item.label.toLowerCase()}…`}
                />
              </div>
            ))}

            {/* Warning signs — red card */}
            <div className="rounded-xl p-4 border" style={{ background: '#fef2f2', borderColor: '#fca5a5' }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-600">Warning Signs — Return to ER Immediately</span>
              </div>
              <EditField
                value={s.warning_signs}
                onChange={v => update('warning_signs', v)}
                multiline
                placeholder="List symptoms requiring immediate ER visit…"
              />
            </div>
          </div>
        </Section>

        {/* ── Patient Education ── */}
        <Section id="education" icon={Award} title="Patient Education Checklist" iconBg="#f0fdf4">
          <div className="grid grid-cols-2 gap-2">
            {(s.education_topics || []).map((ed, i) => (
              <label key={i}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors"
                style={{ borderColor: ed.done ? '#a7f3d0' : '#e9eaec', background: ed.done ? '#f0fdf4' : 'white' }}>
                <input type="checkbox" checked={ed.done}
                  onChange={() => {
                    const topics = [...(s.education_topics || [])]
                    topics[i] = { ...topics[i], done: !topics[i].done }
                    update('education_topics', topics)
                  }}
                  className="rounded" style={{ accentColor: GREEN }} />
                <span className="text-xs font-medium" style={{ color: ed.done ? GREEN : '#374151' }}>{ed.topic}</span>
                {ed.done && <CheckCircle size={12} className="ml-auto flex-shrink-0" style={{ color: GREEN }} />}
              </label>
            ))}
          </div>
        </Section>

        {/* ── Transport ── */}
        <Section id="transport" icon={Truck} title="Transport & Discharge" iconBg="#f5f3ff">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Mode of Transport</div>
              <div className="flex flex-wrap gap-2">
                {['Own vehicle', 'Ambulance', 'Taxi', 'Public Transport'].map(m => (
                  <button key={m} onClick={() => update('transport_mode', m)}
                    className="text-xs px-3 py-1.5 rounded-full border font-medium transition-colors"
                    style={s.transport_mode === m
                      ? { background: '#f0fdf4', color: GREEN, borderColor: '#a7f3d0' }
                      : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Accompanied By</div>
              <EditField value={s.accompanied_by} onChange={v => update('accompanied_by', v)} placeholder="Name and contact…" />
            </div>
            <Field label="Actual Discharge Time">{fmtDateTime(s.discharge_time)}</Field>
          </div>
        </Section>

        {/* ── Signatures ── */}
        <Section id="signatures" icon={CheckCircle} title="Signatures" iconBg="#f0fdf4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { role: 'doctor',  label: 'Treating Doctor',   color: NAVY },
              { role: 'counter', label: 'Countersign (HOD)', color: '#7c3aed' },
              { role: 'nurse',   label: 'Nurse Sign-off',    color: GREEN },
            ].map(sl => {
              const sigData = s.signatures[sl.role]
              return (
                <div key={sl.role} className="rounded-xl border p-4 flex flex-col gap-3"
                  style={{ borderColor: sigData.signed ? '#a7f3d0' : '#e9eaec', background: sigData.signed ? '#f0fdf4' : 'white' }}>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{sl.label}</div>
                  <div className="text-xs font-semibold text-gray-800">{sigData.name}</div>
                  {sigData.signed ? (
                    <div className="flex items-center gap-1.5">
                      <CheckCircle size={13} style={{ color: GREEN }} />
                      <span className="text-[10px] font-bold" style={{ color: GREEN }}>
                        Signed · {fmtDateTime(sigData.time)}
                      </span>
                    </div>
                  ) : (
                    <button onClick={() => setPinModal({ role: sl.role })}
                      className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-white transition-colors"
                      style={{ background: sl.color }}>
                      <Lock size={11} /> Sign (PIN)
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {allSigned && (
            <div className="mt-5 p-4 rounded-xl border flex items-center gap-3"
              style={{ background: '#f0fdf4', borderColor: '#a7f3d0' }}>
              <CheckCircle size={18} style={{ color: GREEN }} />
              <div>
                <div className="text-sm font-bold" style={{ color: GREEN }}>Discharge Summary Finalised</div>
                <div className="text-[10px] text-gray-500 mt-0.5">All signatures obtained. Document is locked for further edits.</div>
              </div>
              <button onClick={handlePrint}
                className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white"
                style={{ background: NAVY }}>
                <Printer size={12} /> Print Summary
              </button>
            </div>
          )}
        </Section>

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>

      {/* ── PIN Modal ── */}
      {pinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-80 overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#f3f4f6' }}>
              <div className="flex items-center gap-2">
                <Lock size={14} style={{ color: GREEN }} />
                <span className="text-sm font-bold text-gray-800">Enter PIN to Sign</span>
              </div>
              <button onClick={() => { setPinModal(null); setPin(''); setPinError('') }}
                className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <p className="text-xs text-gray-500">
                Signing as: <span className="font-bold text-gray-800">{s.signatures[pinModal.role]?.name}</span>
              </p>
              <input
                type="password" value={pin} onChange={e => setPin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && pin.length >= 4 && handleSign(pinModal.role)}
                placeholder="4-6 digit PIN"
                className="w-full border rounded-xl px-4 py-3 text-center text-xl font-mono tracking-[.4em] focus:outline-none"
                style={{ borderColor: pinError ? RED : '#e5e7eb' }}
                autoFocus maxLength={6}
              />
              {pinError && <p className="text-xs text-red-500 text-center">{pinError}</p>}
              <button onClick={() => handleSign(pinModal.role)}
                disabled={pin.length < 4 || pinLoading}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: pin.length >= 4 ? GREEN : '#d1d5db' }}>
                {pinLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Confirm &amp; Sign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
