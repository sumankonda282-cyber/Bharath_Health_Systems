import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import {
  Plus, Search, X, Check, Loader2, Video, RefreshCw,
  Clock, Calendar, User, AlertTriangle, ChevronRight, UserPlus,
} from 'lucide-react'

function todayIST() {
  return new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10)
}

function formatAge(dob) {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000) + 'y'
}

const STATUS_COLORS = {
  scheduled:   'bg-blue-100 text-blue-700',
  waiting:     'bg-amber-100 text-amber-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-gray-100 text-gray-500',
  no_show:     'bg-red-100 text-red-600',
}
const STATUS_LABELS = {
  scheduled: 'Scheduled', waiting: 'Waiting', in_progress: 'In Consultation',
  completed: 'Completed', cancelled: 'Cancelled', no_show: 'No Show',
}
const STATUS_ROW_COLOR = {
  waiting: '#F59E0B', in_progress: '#7C3AED', scheduled: '#3B82F6',
  completed: '#16A34A', no_show: '#EF4444', cancelled: '#9CA3AF',
}
const STATUS_ROW_BG = {
  waiting: 'rgba(245,158,11,0.04)', in_progress: 'rgba(124,58,237,0.04)',
}
const VISIT_LABELS = {
  walk_in: 'Walk-in', scheduled: 'Scheduled', follow_up: 'Follow-up',
  emergency: 'Emergency', telehealth: 'Telehealth',
}
const STATUS_ORDER = { waiting: 0, in_progress: 1, scheduled: 2, completed: 3, no_show: 4, cancelled: 5 }

// ─── 5 demo patients shown when no real appointments exist ────────────────────
const DEMO_APPTS = [
  { id: 9001, token_number: 1, patient_name: 'Rajesh Kumar',    patient_id: 9901, bh_id: 'BH-00234', age: 45, gender: 'male',   visit_type: 'walk_in',   mode: 'onsite',    status: 'waiting',     doctor_name: 'Dr. Priya Sharma', appointment_time: '10:00', blood_group: 'B+',  date_of_birth: '1980-03-15', _demo: true },
  { id: 9002, token_number: 2, patient_name: 'Sunita Devi',     patient_id: 9902, bh_id: 'BH-00891', age: 32, gender: 'female', visit_type: 'follow_up', mode: 'onsite',    status: 'in_progress', doctor_name: 'Dr. Arun Reddy',   appointment_time: '10:15', blood_group: 'A+',  date_of_birth: '1993-07-22', _demo: true },
  { id: 9003, token_number: 3, patient_name: 'Mohammed Farooq', patient_id: 9903, bh_id: 'BH-01045', age: 67, gender: 'male',   visit_type: 'scheduled', mode: 'telehealth', status: 'scheduled',  doctor_name: 'Dr. Priya Sharma', appointment_time: '10:30', blood_group: 'O+',  date_of_birth: '1958-11-08', _demo: true },
  { id: 9004, token_number: 4, patient_name: 'Lakshmi Patel',   patient_id: 9904, bh_id: 'BH-00567', age: 28, gender: 'female', visit_type: 'walk_in',   mode: 'onsite',    status: 'completed',  doctor_name: 'Dr. Arun Reddy',   appointment_time: '09:30', blood_group: 'AB-', date_of_birth: '1997-02-14', _demo: true },
  { id: 9005, token_number: 5, patient_name: 'Arjun Singh',     patient_id: 9905, bh_id: 'BH-01234', age: 12, gender: 'male',   visit_type: 'emergency', mode: 'onsite',    status: 'waiting',     doctor_name: 'Dr. Priya Sharma', appointment_time: '10:45', blood_group: 'B-',  date_of_birth: '2013-09-01', _demo: true },
]

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-[90] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
      ${type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
      {type === 'success' ? <Check size={15} className="text-green-600" /> : <AlertTriangle size={15} className="text-red-600" />}
      {msg}
    </div>
  )
}

// ─── Register Patient Modal ───────────────────────────────────────────────────
function RegisterPatientModal({ onClose, onRegistered }) {
  const [form, setForm] = useState({ full_name: '', mobile: '', date_of_birth: '', gender: '', blood_group: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const submit = async e => {
    e.preventDefault()
    if (form.mobile.length !== 10) { setErr('Mobile must be 10 digits'); return }
    setSaving(true); setErr('')
    try {
      const payload = { ...form }
      if (!payload.date_of_birth) delete payload.date_of_birth
      if (!payload.gender) delete payload.gender
      if (!payload.blood_group) delete payload.blood_group
      if (!payload.address) delete payload.address
      const p = await api.post('/patients', payload)
      onRegistered(p); onClose()
    } catch (ex) { setErr(ex.message || 'Registration failed') }
    finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: '#0F2557' }}>Register New Patient</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div><label className="label">Full Name *</label>
            <input className="input" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required placeholder="Patient's full name" /></div>
          <div><label className="label">Mobile * (10 digits)</label>
            <input className="input" type="tel" maxLength={10} value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value.replace(/\D/g, '') }))} required placeholder="10-digit mobile" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date of Birth</label>
              <input type="date" className="input" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} /></div>
            <div><label className="label">Gender</label>
              <select className="input" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">Select</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
              </select></div>
          </div>
          <div><label className="label">Blood Group</label>
            <select className="input" value={form.blood_group} onChange={e => setForm(f => ({ ...f, blood_group: e.target.value }))}>
              <option value="">Unknown</option>
              {'A+ A- B+ B- O+ O- AB+ AB-'.split(' ').map(g => <option key={g} value={g}>{g}</option>)}
            </select></div>
          <div><label className="label">Address</label>
            <textarea className="input resize-none" rows={2} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Optional" /></div>
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : 'Register Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Book Appointment Modal ───────────────────────────────────────────────────
function BookAppointmentModal({ patient, doctors, onClose, onBooked }) {
  const [form, setForm] = useState({ patient_id: patient?.id || '', doctor_id: '', appointment_date: todayIST(), appointment_time: '09:00', visit_type: 'walk_in', notes: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const submit = async e => {
    e.preventDefault(); setSaving(true); setErr('')
    try {
      await api.post('/appointments', { patient_id: parseInt(form.patient_id), doctor_id: parseInt(form.doctor_id), appointment_date: form.appointment_date, appointment_time: form.appointment_time, visit_type: form.visit_type, notes: form.notes })
      onBooked(); onClose()
    } catch (ex) { setErr(ex.message || 'Booking failed') }
    finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: '#0F2557' }}>Book Appointment</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
        </div>
        {patient && (
          <div className="mb-4 px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-2">
            <User size={14} className="text-blue-500" />
            <span className="text-sm font-semibold text-blue-900">{patient.full_name}</span>
            {patient.bh_id && <span className="ml-1 text-xs text-blue-500 font-mono">{patient.bh_id}</span>}
          </div>
        )}
        <form onSubmit={submit} className="space-y-3">
          <div><label className="label">Doctor *</label>
            <select className="input" value={form.doctor_id} onChange={e => setForm(f => ({ ...f, doctor_id: e.target.value }))} required>
              <option value="">Select doctor</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.staff?.full_name || `Dr. #${d.id}`}{d.specialty ? ` — ${d.specialty}` : ''}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date *</label>
              <input type="date" className="input" value={form.appointment_date} onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))} required /></div>
            <div><label className="label">Time *</label>
              <input type="time" className="input" value={form.appointment_time} onChange={e => setForm(f => ({ ...f, appointment_time: e.target.value }))} required /></div>
          </div>
          <div><label className="label">Visit Type</label>
            <select className="input" value={form.visit_type} onChange={e => setForm(f => ({ ...f, visit_type: e.target.value }))}>
              {Object.entries(VISIT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select></div>
          <div><label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional…" /></div>
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? <><Loader2 size={14} className="animate-spin" />Booking…</> : 'Book Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function FrontDesk() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [appts, setAppts] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const [filterSearch, setFilterSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '')
  const [filterDoctor, setFilterDoctor] = useState('')
  const [filterVisitType, setFilterVisitType] = useState('')

  const [searchExpanded, setSearchExpanded] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)

  const [showRegister, setShowRegister] = useState(false)
  const [bookModalPatient, setBookModalPatient] = useState(null)

  const searchTimer = useRef(null)
  const todayStr = todayIST()

  const showToast = (msg, type = 'success') => setToast({ msg, type })

  // ── Load doctors ───────────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/clinic/doctors').then(r => setDoctors(Array.isArray(r) ? r : [])).catch(() => {})
  }, [])

  // ── Load queue ─────────────────────────────────────────────────────────────
  const loadQueue = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true)
    setError('')
    try {
      const data = await api.get('/appointments', { params: { appointment_date: todayStr, limit: 200 } })
      setAppts(Array.isArray(data) ? data : [])
    } catch (ex) { setError(ex.message || 'Failed to load') }
    finally { setLoading(false); setRefreshing(false) }
  }, [todayStr])

  useEffect(() => {
    loadQueue()
    const id = setInterval(() => loadQueue(true), 30000)
    return () => clearInterval(id)
  }, [loadQueue])

  // ── Patient search (section) ───────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(searchTimer.current)
    if (!searchText.trim()) { setSearchResults([]); return }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const r = await api.get('/patients', { params: { search: searchText.trim(), limit: 30 } })
        setSearchResults(Array.isArray(r) ? r : [])
      } catch { setSearchResults([]) }
      finally { setSearchLoading(false) }
    }, 400)
    return () => clearTimeout(searchTimer.current)
  }, [searchText])

  // ── Status update ──────────────────────────────────────────────────────────
  const updateStatus = useCallback(async (apptId, status, isDemo) => {
    if (isDemo) { showToast('Demo mode — status changes are not saved', 'error'); return }
    try {
      await api.put(`/appointments/${apptId}`, { status })
      setAppts(prev => prev.map(a => a.id === apptId ? { ...a, status } : a))
      showToast(`Status updated to ${STATUS_LABELS[status] || status}`)
    } catch (ex) { showToast(ex.message || 'Update failed', 'error') }
  }, [])

  // ── Computed ───────────────────────────────────────────────────────────────
  const isDemo = !loading && appts.length === 0
  const displayAppts = isDemo ? DEMO_APPTS : appts

  const scheduledCount  = displayAppts.filter(a => a.status === 'scheduled').length
  const waitingCount    = displayAppts.filter(a => a.status === 'waiting').length
  const inProgressCount = displayAppts.filter(a => a.status === 'in_progress').length
  const completedCount  = displayAppts.filter(a => a.status === 'completed').length

  const doctorNames = [...new Set(displayAppts.map(a => a.doctor_name).filter(Boolean))].sort()
  const hasFilters  = filterSearch || filterStatus || filterDoctor || filterVisitType

  const visibleAppts = displayAppts.filter(a => {
    if (filterStatus    && a.status      !== filterStatus)    return false
    if (filterDoctor    && a.doctor_name !== filterDoctor)    return false
    if (filterVisitType && a.visit_type  !== filterVisitType) return false
    if (filterSearch) {
      const q = filterSearch.toLowerCase()
      if (!a.patient_name?.toLowerCase().includes(q) && !a.bh_id?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const sortedAppts = [...visibleAppts].sort((a, b) => {
    const ao = STATUS_ORDER[a.status] ?? 9, bo = STATUS_ORDER[b.status] ?? 9
    return ao !== bo ? ao - bo : (a.appointment_time || '').localeCompare(b.appointment_time || '')
  })

  const openChart = (appt) => {
    navigate(`/front-desk/chart/${appt.id}`, { state: { appt } })
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Front Desk</h1>
          <div className="flex items-center gap-2 text-sm text-gray-400 mt-0.5">
            <Clock size={13} />
            <span>{todayStr}</span>
            {refreshing && <Loader2 size={13} className="animate-spin text-blue-400" />}
            <span className={`badge text-xs ${refreshing ? 'badge-blue' : 'badge-green'}`}>
              {refreshing ? 'Refreshing' : isDemo ? 'Demo Mode' : 'Live'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowRegister(true)} className="btn-primary text-sm">
            <UserPlus size={15} />New Walk-in
          </button>
          <button onClick={() => loadQueue()} className="btn-secondary p-2" title="Refresh">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Scheduled',       count: scheduledCount,  color: '#3B82F6', bg: '#EFF6FF' },
          { label: 'Waiting',         count: waitingCount,    color: '#F59E0B', bg: '#FFFBEB' },
          { label: 'In Consultation', count: inProgressCount, color: '#7C3AED', bg: '#F5F3FF' },
          { label: 'Completed',       count: completedCount,  color: '#16A34A', bg: '#F0FDF4' },
        ].map(p => (
          <div key={p.label} className="card px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: p.bg }}>
              <div className="w-3 h-3 rounded-full" style={{ background: p.color }} />
            </div>
            <div>
              <div className="text-2xl font-extrabold leading-none" style={{ color: p.color }}>{p.count}</div>
              <div className="text-xs text-gray-500 mt-0.5 leading-tight">{p.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* WORKLIST TABLE                                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section className="card overflow-hidden">
        {/* Section header */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2 mr-auto">
            <span className="font-bold text-sm" style={{ color: '#0F2557' }}>My Desk</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
              {displayAppts.length}
            </span>
            {isDemo && (
              <span className="badge badge-blue text-xs">Demo</span>
            )}
          </div>
          {/* Filters */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search patient…"
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              className="input pl-8 w-44 text-sm py-1.5"
            />
          </div>
          <select className="input w-auto text-sm py-1.5" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="input w-auto text-sm py-1.5" value={filterDoctor} onChange={e => setFilterDoctor(e.target.value)}>
            <option value="">All Doctors</option>
            {doctorNames.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="input w-auto text-sm py-1.5" value={filterVisitType} onChange={e => setFilterVisitType(e.target.value)}>
            <option value="">All Types</option>
            {Object.entries(VISIT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {hasFilters && (
            <button onClick={() => { setFilterSearch(''); setFilterStatus(''); setFilterDoctor(''); setFilterVisitType('') }}
              className="btn-secondary text-xs py-1 px-2 flex items-center gap-1">
              <X size={11} />Clear
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-gray-300" /></div>
        ) : error ? (
          <div className="p-10 text-center">
            <AlertTriangle size={28} className="mx-auto mb-3 text-red-400" />
            <p className="text-red-600 text-sm mb-3">{error}</p>
            <button onClick={() => loadQueue()} className="btn-secondary text-sm"><RefreshCw size={14} />Retry</button>
          </div>
        ) : sortedAppts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
              <Calendar size={26} className="text-gray-300" />
            </div>
            <p className="font-semibold text-gray-400 mb-1">
              {hasFilters ? 'No appointments match filters' : 'No appointments today'}
            </p>
            <p className="text-sm text-gray-300">Appointments booked for today will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="th">Token</th>
                  <th className="th">Patient</th>
                  <th className="th">Age / Sex</th>
                  <th className="th">Visit</th>
                  <th className="th">Doctor</th>
                  <th className="th">Time</th>
                  <th className="th">Status</th>
                  <th className="th">Action</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedAppts.map(a => {
                  const isTelehealth = a.mode === 'telehealth' || a.visit_type === 'telehealth'
                  const age = a.age || formatAge(a.date_of_birth)
                  return (
                    <tr
                      key={a.id}
                      className="tr-hover cursor-pointer"
                      style={{
                        boxShadow: `inset 3px 0 0 ${STATUS_ROW_COLOR[a.status] || '#E5E7EB'}`,
                        background: STATUS_ROW_BG[a.status] || 'transparent',
                      }}
                      onClick={() => openChart(a)}
                    >
                      {/* Token */}
                      <td className="td" onClick={e => e.stopPropagation()}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#EEF2FF', color: '#0F2557' }}>
                          {a.token_number || a.id}
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="td">
                        <div className="font-semibold text-gray-900 text-sm">{a.patient_name}</div>
                        {a.bh_id && <div className="text-xs font-mono text-blue-500 mt-0.5">{a.bh_id}</div>}
                      </td>

                      {/* Age/Sex */}
                      <td className="td text-sm text-gray-600">
                        {age && <span>{age}</span>}
                        {a.gender && <span className="ml-1 uppercase text-xs text-gray-400">{a.gender.charAt(0)}</span>}
                      </td>

                      {/* Visit type */}
                      <td className="td">
                        <div className="flex items-center gap-1">
                          {isTelehealth
                            ? <span className="inline-flex items-center gap-1 text-xs font-medium text-cyan-600 bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded-full"><Video size={10} />Online</span>
                            : <span className="text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">Onsite</span>
                          }
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{VISIT_LABELS[a.visit_type] || a.visit_type}</div>
                      </td>

                      {/* Doctor */}
                      <td className="td text-sm text-gray-600">{a.doctor_name || '—'}</td>

                      {/* Time */}
                      <td className="td text-sm text-gray-500">
                        <div className="flex items-center gap-1"><Clock size={12} className="text-gray-300" />{a.appointment_time || '—'}</div>
                      </td>

                      {/* Status */}
                      <td className="td">
                        <span className={`badge text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[a.status] || 'bg-gray-100 text-gray-500'}`}>
                          {STATUS_LABELS[a.status] || a.status}
                        </span>
                      </td>

                      {/* Quick action */}
                      <td className="td" onClick={e => e.stopPropagation()}>
                        {a.status === 'scheduled' && (
                          <button onClick={() => updateStatus(a.id, 'waiting', a._demo)} className="btn-secondary text-xs py-1 px-2.5">
                            <Check size={12} />Check In
                          </button>
                        )}
                        {a.status === 'waiting' && (
                          <button onClick={() => updateStatus(a.id, 'in_progress', a._demo)} className="btn-primary text-xs py-1 px-2.5">
                            Start
                          </button>
                        )}
                        {a.status === 'in_progress' && (
                          <button onClick={() => updateStatus(a.id, 'completed', a._demo)} className="btn-success text-xs py-1 px-2.5">
                            Complete
                          </button>
                        )}
                        {a.status === 'completed' && (
                          <span className="text-xs text-green-600 font-medium flex items-center gap-1"><Check size={12} />Done</span>
                        )}
                      </td>

                      {/* Arrow */}
                      <td className="td">
                        <ChevronRight size={16} className="text-gray-300" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* PATIENT SEARCH & REGISTER                                            */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
          <button
            onClick={() => setSearchExpanded(e => !e)}
            className="flex items-center gap-2 font-semibold text-sm hover:opacity-70 transition-opacity"
            style={{ color: '#0F2557' }}
          >
            <Search size={16} />Patient Search
            <span className="text-gray-400 text-xs font-normal ml-1">{searchExpanded ? '▲' : '▼'}</span>
          </button>
          <button onClick={() => setShowRegister(true)} className="btn-primary text-sm">
            <UserPlus size={14} />Register Patient
          </button>
        </div>

        {searchExpanded && (
          <div className="p-4">
            <div className="relative mb-3">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-9" placeholder="Search by name, mobile, or BHID…" value={searchText} onChange={e => setSearchText(e.target.value)} autoFocus />
              {searchText && <button onClick={() => { setSearchText(''); setSearchResults([]) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={14} /></button>}
            </div>
            {searchLoading && <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-gray-400" /></div>}
            {!searchLoading && searchText && searchResults.length === 0 && (
              <div className="text-center py-6 text-gray-400">
                <User size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm mb-3">No patients found for "{searchText}"</p>
                <button onClick={() => setShowRegister(true)} className="btn-primary text-sm"><Plus size={14} />Register New Patient</button>
              </div>
            )}
            {!searchLoading && searchResults.length > 0 && (
              <div className="space-y-1.5">
                {searchResults.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:bg-blue-50/30 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">{p.full_name}</span>
                        {p.bh_id && <span className="text-xs font-mono text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{p.bh_id}</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                        {p.mobile && <span>{p.mobile}</span>}
                        {p.date_of_birth && <span>{formatAge(p.date_of_birth)}</span>}
                        {p.gender && <span className="capitalize">{p.gender}</span>}
                      </div>
                    </div>
                    <button onClick={() => setBookModalPatient(p)} className="btn-primary text-xs py-1 px-2.5">
                      <Calendar size={12} />Book
                    </button>
                  </div>
                ))}
              </div>
            )}
            {!searchLoading && !searchText && (
              <p className="text-sm text-gray-400 text-center py-4">Type a name, mobile or BHID to search patients</p>
            )}
          </div>
        )}
      </section>

      {/* Modals */}
      {showRegister && (
        <RegisterPatientModal
          onClose={() => setShowRegister(false)}
          onRegistered={p => showToast(`${p.full_name || 'Patient'} registered`)}
        />
      )}
      {bookModalPatient && (
        <BookAppointmentModal
          patient={bookModalPatient}
          doctors={doctors}
          onClose={() => setBookModalPatient(null)}
          onBooked={() => { showToast('Appointment booked'); loadQueue() }}
        />
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
