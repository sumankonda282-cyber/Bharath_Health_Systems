import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/client'
import {
  CalendarDays, Clock, CheckCircle, Video, CreditCard, ChevronRight,
  Check, X, BedDouble, Loader2, UserCircle2, AlertCircle, Bell,
  Stethoscope, Phone, Globe, Footprints,
} from 'lucide-react'

function todayIST() {
  return new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10)
}

const fmt = v => '₹' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })

function StatCard({ icon: Icon, label, value, color, onClick, loading }) {
  return (
    <button onClick={onClick}
      className="card p-5 flex items-center gap-4 w-full text-left transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '18' }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-bold" style={{ color: '#0F2557' }}>
          {loading ? <span className="text-gray-300 text-lg">—</span> : (value ?? 0)}
        </div>
        <div className="text-xs text-gray-500 font-medium">{label}</div>
      </div>
      <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
    </button>
  )
}

// ── Appointment Requests ──────────────────────────────────────────────────────

function BookingCard({ booking, onApprove, onReject, busy }) {
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState('')

  const modeIcon = booking.mode === 'phone' ? Phone : booking.mode === 'online' ? Globe : Footprints
  const ModeIcon = modeIcon

  return (
    <div className="bg-white border border-amber-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-gray-900 text-sm">{booking.patient_name}</span>
            <span className="text-xs text-gray-400 font-mono">{booking.patient_mobile}</span>
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1"><CalendarDays size={11} /> {booking.booking_date} at {booking.booking_time?.slice(0, 5)}</span>
            {booking.doctor && <span className="flex items-center gap-1"><Stethoscope size={11} /> {booking.doctor.full_name || booking.doctor.name}</span>}
            {booking.reason && <span className="text-gray-400 truncate max-w-[180px]">"{booking.reason}"</span>}
          </div>
        </div>
        <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full flex-shrink-0">Pending</span>
      </div>

      {showReject ? (
        <div className="space-y-2">
          <input value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Reason for rejection (optional)"
            className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-100" />
          <div className="flex gap-2">
            <button onClick={() => setShowReject(false)}
              className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={() => onReject(booking.id, reason)} disabled={busy}
              className="flex-1 px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1">
              {busy ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />} Confirm Reject
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => setShowReject(true)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50">
            <X size={12} /> Reject
          </button>
          <button onClick={() => onApprove(booking.id)} disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Check size={12} />} Approve & Book
          </button>
        </div>
      )}
    </div>
  )
}

function AppointmentRequests({ onCountChange }) {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [toast, setToast] = useState(null)

  const load = useCallback(async () => {
    try {
      const r = await api.get('/appointments/online-bookings', { params: { status: 'pending' } })
      const list = Array.isArray(r) ? r : []
      setBookings(list)
      onCountChange(list.length)
    } catch { setBookings([]); onCountChange(0) }
    finally { setLoading(false) }
  }, [onCountChange])

  useEffect(() => { load() }, [load])

  const approve = async (id) => {
    setBusy(id)
    try {
      await api.post(`/appointments/online-bookings/${id}/confirm`)
      setToast({ msg: 'Booking confirmed — appointment created', type: 'success' })
      load()
    } catch (e) {
      setToast({ msg: e?.response?.data?.detail || 'Confirmation failed', type: 'error' })
    } finally { setBusy(null) }
  }

  const reject = async (id, reason) => {
    setBusy(id)
    try {
      await api.post(`/appointments/online-bookings/${id}/cancel`, { reason })
      setToast({ msg: 'Booking rejected', type: 'success' })
      load()
    } catch (e) {
      setToast({ msg: e?.response?.data?.detail || 'Rejection failed', type: 'error' })
    } finally { setBusy(null) }
  }

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  if (loading) return (
    <div className="card p-5 flex items-center gap-3 text-gray-400">
      <Loader2 size={16} className="animate-spin" />
      <span className="text-sm">Loading appointment requests…</span>
    </div>
  )

  if (bookings.length === 0) return null

  return (
    <div className="card overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-amber-100 flex items-center gap-3" style={{ background: '#FFFBEB' }}>
        <Bell size={16} className="text-amber-600" />
        <span className="font-bold text-amber-800">Appointment Requests</span>
        <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold text-white bg-amber-500">{bookings.length}</span>
        <span className="text-xs text-amber-600 ml-1">Online bookings awaiting confirmation</span>
      </div>
      <div className="p-4 grid gap-3 sm:grid-cols-2">
        {bookings.map(b => (
          <BookingCard key={b.id} booking={b}
            onApprove={approve} onReject={reject} busy={busy === b.id} />
        ))}
      </div>
      {toast && (
        <div className={`mx-4 mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
          ${toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {toast.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ── Doctor Availability ───────────────────────────────────────────────────────

function DoctorAvailability({ appts, loading }) {
  const [doctors, setDoctors] = useState([])

  useEffect(() => {
    api.get('/clinic/doctors').then(r => setDoctors(Array.isArray(r) ? r : [])).catch(() => {})
  }, [])

  if (!loading && doctors.length === 0) return null

  const today = todayIST()
  const dayName = new Date(today).toLocaleDateString('en-IN', { weekday: 'long' }).toLowerCase()

  const doctorStats = doctors.map(doc => {
    const docAppts = appts.filter(a =>
      a.doctor_name === doc.full_name || a.doctor_id === doc.id
    )
    const waiting    = docAppts.filter(a => ['scheduled', 'waiting'].includes(a.status)).length
    const inProgress = docAppts.filter(a => a.status === 'in_progress').length
    const completed  = docAppts.filter(a => a.status === 'completed').length

    let status = 'available'
    if (inProgress > 0) status = 'busy'
    else if (waiting > 0) status = 'waiting'
    else if (completed > 0 && waiting === 0) status = 'done'

    return { ...doc, waiting, inProgress, completed, total: docAppts.length, status }
  })

  const statusConfig = {
    busy:      { dot: 'bg-violet-500', label: 'In Consultation', text: 'text-violet-700' },
    waiting:   { dot: 'bg-amber-400',  label: 'Patients Waiting', text: 'text-amber-700' },
    available: { dot: 'bg-green-400',  label: 'Available',        text: 'text-green-700' },
    done:      { dot: 'bg-gray-300',   label: 'Done for Today',   text: 'text-gray-500'  },
  }

  return (
    <div className="card overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <span className="font-semibold text-gray-700 flex items-center gap-2">
          <Stethoscope size={15} className="text-gray-400" />
          Doctor Availability — Today
        </span>
        <span className="text-xs text-gray-400 capitalize">{dayName}</span>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
      ) : (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {doctorStats.map(doc => {
            const cfg = statusConfig[doc.status] || statusConfig.available
            return (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                  style={{ background: '#0F255718', color: '#0F2557' }}>
                  {(doc.full_name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800 truncate">{doc.full_name}</div>
                  <div className="text-xs text-gray-400 truncate">{doc.specialty || 'General'}</div>
                  <div className={`flex items-center gap-1.5 mt-1 text-xs font-medium ${cfg.text}`}>
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </div>
                </div>
                {doc.total > 0 && (
                  <div className="text-right flex-shrink-0">
                    <div className="text-lg font-bold" style={{ color: '#0F2557' }}>{doc.total}</div>
                    <div className="text-xs text-gray-400">appts</div>
                    {doc.waiting > 0 && (
                      <div className="text-xs text-amber-600 font-medium">{doc.waiting} waiting</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {doctorStats.length === 0 && (
            <div className="col-span-full text-center py-6 text-gray-400 text-sm">
              <UserCircle2 size={28} className="mx-auto mb-2 opacity-30" />
              No doctors configured
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── IPD Snapshot (hospital only) ──────────────────────────────────────────────

function IPDSnapshot() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.get('/inpatient/beds/board')
      .then(r => {
        const beds = Array.isArray(r) ? r : []
        setStats({
          total:    beds.length,
          vacant:   beds.filter(b => b.status === 'vacant').length,
          occupied: beds.filter(b => b.status === 'occupied').length,
          maint:    beds.filter(b => b.status === 'maintenance').length,
        })
      })
      .catch(() => {})
  }, [])

  if (!stats) return null

  return (
    <div className="card p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <BedDouble size={15} className="text-gray-400" />
        <span className="font-semibold text-gray-700 text-sm">IPD Bed Snapshot</span>
        <span className="ml-auto text-xs text-gray-400">{stats.total} total beds</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-xl bg-green-50 border border-green-100">
          <div className="text-2xl font-bold text-green-700">{stats.vacant}</div>
          <div className="text-xs text-green-600 font-medium mt-0.5">Vacant</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-red-50 border border-red-100">
          <div className="text-2xl font-bold text-red-700">{stats.occupied}</div>
          <div className="text-xs text-red-600 font-medium mt-0.5">Occupied</div>
        </div>
        <div className="text-center p-3 rounded-xl bg-gray-50 border border-gray-100">
          <div className="text-2xl font-bold text-gray-500">{stats.maint}</div>
          <div className="text-xs text-gray-500 font-medium mt-0.5">Maintenance</div>
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isManager  = ['clinic_manager', 'clinic_admin'].includes(user?.role)
  const isHospital = user?.org_type === 'hospital'

  const [appts, setAppts]       = useState([])
  const [billing, setBilling]   = useState({ collected: 0, pending: 0 })
  const [loading, setLoading]   = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const timerRef = useRef(null)

  const load = useCallback(() => {
    const today = todayIST()
    api.get('/appointments', { params: { appointment_date: today, limit: 200 } })
      .then(r => setAppts(Array.isArray(r) ? r : []))
      .catch(() => {})
      .finally(() => setLoading(false))
    api.get('/billing/invoices', { params: { limit: 200 } })
      .then(r => {
        const list = Array.isArray(r) ? r : []
        const todayInvs = list.filter(i => (i.created_at || '').slice(0, 10) === today)
        setBilling({
          collected: todayInvs.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount || 0), 0),
          pending:   todayInvs.filter(i => i.status !== 'paid').reduce((s, i) => s + Number(i.total_amount || 0), 0),
        })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
    timerRef.current = setInterval(load, 30000)
    return () => clearInterval(timerRef.current)
  }, [load])

  const waiting    = appts.filter(a => ['scheduled', 'waiting'].includes(a.status)).length
  const inProgress = appts.filter(a => a.status === 'in_progress').length
  const completed  = appts.filter(a => a.status === 'completed').length
  const telehealth = appts.filter(a => a.mode === 'telehealth' || a.visit_type === 'telehealth').length

  const goFrontDesk  = (filter) => navigate(`/front-desk${filter ? `?status=${filter}` : ''}`)
  const goBilling    = () => navigate('/billing')
  const goOperations = () => navigate('/operations')

  return (
    <div>
      <div className="page-header flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">{isManager ? 'Manager Dashboard' : 'Staff Dashboard'}</h1>
          {pendingCount > 0 && (
            <p className="text-xs text-amber-600 font-medium mt-0.5 flex items-center gap-1">
              <Bell size={11} /> {pendingCount} appointment request{pendingCount !== 1 ? 's' : ''} need attention
            </p>
          )}
        </div>
        <span className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>

      {/* Appointment Requests (online bookings needing approval) */}
      {!isManager && (
        <AppointmentRequests onCountChange={setPendingCount} />
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <StatCard icon={CalendarDays} label="Total Today"     value={appts.length}  color="#0F2557" loading={loading}
          onClick={() => isManager ? goOperations() : goFrontDesk()} />
        <StatCard icon={Clock}        label="Waiting"         value={waiting}       color="#F5821E" loading={loading}
          onClick={() => isManager ? goOperations() : goFrontDesk('waiting')} />
        <StatCard icon={CalendarDays} label="In Consultation" value={inProgress}    color="#7C3AED" loading={loading}
          onClick={() => isManager ? goOperations() : goFrontDesk('in_progress')} />
        <StatCard icon={CheckCircle}  label="Completed"       value={completed}     color="#16A34A" loading={loading}
          onClick={() => isManager ? goOperations() : goFrontDesk('completed')} />
        <StatCard icon={Video}        label="Telehealth"      value={telehealth}    color="#0891B2" loading={loading}
          onClick={() => isManager ? goOperations() : goFrontDesk('telehealth')} />
      </div>

      {/* Doctor Availability (receptionist view) */}
      {!isManager && (
        <DoctorAvailability appts={appts} loading={loading} />
      )}

      {/* IPD Bed Snapshot (hospital only) */}
      {isHospital && !isManager && (
        <IPDSnapshot />
      )}

      {/* Billing snapshot */}
      <button onClick={goBilling}
        className="card p-4 mb-6 w-full flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-0.5 text-left">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#16a34a18' }}>
          <CreditCard size={20} style={{ color: '#16a34a' }} />
        </div>
        <div className="flex-1 flex flex-wrap gap-x-8 gap-y-1">
          <div>
            <div className="text-xs text-gray-500">Collected Today</div>
            <div className="font-bold text-green-700">{fmt(billing.collected)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Pending</div>
            <div className="font-bold text-red-600">{fmt(billing.pending)}</div>
          </div>
        </div>
        <div className="text-xs text-gray-400 flex items-center gap-1">
          View Billing <ChevronRight size={14} />
        </div>
      </button>

      {/* Today's schedule */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-gray-700">Today's Schedule</span>
          <button onClick={() => isManager ? goOperations() : goFrontDesk()}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
            View all <ChevronRight size={13} />
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
        ) : appts.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <CalendarDays size={32} className="mx-auto mb-2 opacity-30" />
            <p>No appointments today</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th className="th">#</th>
                  <th className="th">Patient</th>
                  <th className="th">Doctor</th>
                  <th className="th">Time</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appts.slice(0, 8).map(a => (
                  <tr key={a.id} className="tr-hover cursor-pointer"
                    onClick={() => isManager ? navigate(`/operations/${a.id}`) : goFrontDesk()}>
                    <td className="td font-bold text-center" style={{ color: '#0F2557' }}>#{a.token_number || a.id}</td>
                    <td className="td font-medium">{a.patient_name || '—'}</td>
                    <td className="td text-gray-500 text-sm">{a.doctor_name || '—'}</td>
                    <td className="td text-sm">{a.appointment_time || '—'}</td>
                    <td className="td">
                      <span className={`badge ${
                        a.status === 'completed'   ? 'badge-green' :
                        a.status === 'cancelled'   ? 'badge-red' :
                        a.status === 'in_progress' ? 'badge-purple' : 'badge-yellow'
                      }`}>{(a.status || '').replace(/_/g, ' ')}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {appts.length > 8 && (
              <div className="px-5 py-3 text-center border-t border-gray-100">
                <button onClick={() => isManager ? goOperations() : goFrontDesk()}
                  className="text-sm text-blue-600 hover:text-blue-800">
                  +{appts.length - 8} more — View all
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
