import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Search, Pin, PinOff, ChevronDown, ChevronUp,
  Loader2, AlertTriangle, Activity, Pill, ClipboardList,
  FileText, Heart, Bed, TrendingUp, ShieldAlert, Droplets, Utensils,
  X, Lock
} from 'lucide-react'
import { useWardSession } from '../contexts/WardSessionContext'
import api from '../api/client'
import ProviderView from './ProviderView'
import MedicationList from './MedicationList'
import MAR from './MAR'
import Orders from './Orders'
import DietNutrition from './DietNutrition'
import Documentation from './Documentation'
import PrePostOp from './PrePostOp'

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
  { key: 'flowsheet',    icon: TrendingUp,    label: 'Flow Sheet' },
  { key: 'discharge',    icon: ShieldAlert,   label: 'Discharge Summary' },
]

// ── Assessment form pool ─────────────────────────────────────────────────────
const FORM_POOL = [
  'Vital Signs', 'MAR Quick Entry', 'Pain Score', 'Fluid Balance',
  'Braden Scale', 'GCS Assessment', 'Fall Risk — Morse', 'I/O Chart',
  'Blood Sugar Log', 'Wound Care Log', 'Nutrition Assessment',
  'Neurological Obs', 'Pressure Injury', 'Sepsis Screening',
  'DVT Prophylaxis', 'Medication Reconciliation', 'Discharge Checklist',
  'Post-Op Monitoring', 'Fluid Resuscitation', 'Restraint Assessment',
]

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
  const [pinned, setPinned]       = useState(['Vital Signs', 'MAR Quick Entry', 'Pain Score', 'Fluid Balance'])
  const [poolSearch, setPoolSearch] = useState('')
  const [activeForm, setActiveForm] = useState(null)
  const [pinSearch, setPinSearch]  = useState('')
  const [showPinSearch, setShowPinSearch] = useState(false)

  const filteredPool = FORM_POOL.filter(f =>
    f.toLowerCase().includes(poolSearch.toLowerCase()) && !pinned.includes(f)
  )
  const filteredPin = FORM_POOL.filter(f =>
    f.toLowerCase().includes(pinSearch.toLowerCase()) && !pinned.includes(f)
  )

  const addPin = (f) => { setPinned(p => [...p, f]); setShowPinSearch(false); setPinSearch('') }
  const removePin = (f) => { setPinned(p => p.filter(x => x !== f)); if (activeForm === f) setActiveForm(null) }

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
                <button key={f} onClick={() => addPin(f)}
                  className="text-[10px] px-2 py-1 rounded-lg border bg-white hover:border-green-400 hover:text-green-700 transition-colors"
                  style={{ borderColor: '#e5e7eb', color: '#374151' }}>
                  {f}
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
              onClick={() => setActiveForm(f === activeForm ? null : f)}>
              {f}
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

        {/* Active form placeholder */}
        {activeForm && (
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
                className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                style={{ borderColor: '#d1d5db' }} />
              <input placeholder="Notes (optional)"
                className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                style={{ borderColor: '#d1d5db' }} />
              <button className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-xs font-bold text-white"
                style={{ background: GREEN }}>
                <Lock size={10} />
                Submit (PIN required)
              </button>
            </div>
          </div>
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
            <div key={f}
              className="flex items-center justify-between px-2.5 py-2 rounded-lg border bg-white hover:border-green-300 cursor-pointer transition-colors group"
              style={{ borderColor: '#f0f0f0' }}>
              <span className="text-[11px] text-gray-700 group-hover:text-gray-900">{f}</span>
              <button onClick={() => addPin(f)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-green-600">
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

// ── Dashboard view (patient-specific) ───────────────────────────────────────
function PatientDashboard({ admission, vitals, loading }) {
  const adm = admission || {}
  const latestVital = vitals?.[0] || {}

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

      {/* Stat cards grid */}
      <div>
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Patient Metrics</h2>
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
          {activeNav !== 'dashboard' && activeNav !== 'provider' && activeNav !== 'medications' && activeNav !== 'mar' && activeNav !== 'orders' && activeNav !== 'food' && activeNav !== 'docs' && activeNav !== 'preop' && (
            <ComingSoon label={PATIENT_NAV.find(n => n.key === activeNav)?.label || ''} />
          )}
        </div>

        {/* Assessment panel — hidden on full-width views */}
        {activeNav !== 'medications' && activeNav !== 'mar' && activeNav !== 'orders' && activeNav !== 'food' && activeNav !== 'docs' && activeNav !== 'preop' && (
          <div className="flex-shrink-0 border-l overflow-hidden flex flex-col"
            style={{ width: 272, borderColor: '#e9eaec' }}>
            <AssessmentPanel admissionId={id} />
          </div>
        )}
      </div>
    </div>
  )
}
