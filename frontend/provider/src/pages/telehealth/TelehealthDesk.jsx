import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTelehealth } from '../../contexts/TelehealthContext'
import { useAuth } from '../../contexts/AuthContext'
import {
  Video, Clock, CheckCircle2, XCircle, Loader2,
  AlertTriangle, Calendar, FileText, UserCheck
} from 'lucide-react'
import api from '../../api/client'
import TransferDoctorModal from '../../components/TransferDoctorModal'

function todayIST() {
  const d = new Date(new Date().getTime() + 5.5 * 3600000)
  return d.toISOString().slice(0, 10)
}

const fmt12 = (t) => {
  if (!t) return t
  const str = String(t).slice(0, 5)
  const [h, m] = str.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return t
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

const STATE_META = {
  scheduled:   { label: 'Scheduled',   color: '#64748b', bg: '#f1f5f9' },
  ready:       { label: 'Waiting',     color: '#d97706', bg: '#fffbeb' },
  in_progress: { label: 'In Progress', color: '#16a34a', bg: '#dcfce7' },
  completed:   { label: 'Completed',   color: '#64748b', bg: '#f1f5f9' },
  expired:     { label: 'Expired',     color: '#dc2626', bg: '#fee2e2' },
}

function StatCard({ label, value, icon, pulse, accent }) {
  return (
    <div className={`bg-white rounded-2xl border p-4 flex items-center gap-4 ${accent ? 'border-green-200' : 'border-gray-100'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent ? 'bg-green-100' : 'bg-slate-100'}`}>
        {pulse ? (
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
          </span>
        ) : icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

function StatusBadge({ state }) {
  const m = STATE_META[state] || STATE_META.scheduled
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: m.bg, color: m.color }}>
      {state === 'in_progress' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
      {state === 'ready' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
      {m.label}
    </span>
  )
}

export default function TelehealthDesk() {
  const navigate = useNavigate()
  const { startCall, activeCall } = useTelehealth()
  const { user } = useAuth()
  const [appts, setAppts]     = useState([])
  const [transferAppt, setTransferAppt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [joiningId, setJoiningId] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true)
    // Doctor-level isolation: doctors see only their own telehealth visits;
    // front-desk/admin/manager roles see the whole clinic (to manage/transfer).
    const isDoctor = user?.role === 'doctor'
    api.get('/appointments', { params: { appointment_date: todayIST(), limit: 200, ...(isDoctor ? { mine: 1 } : {}) } })
      .then(data => {
        const list = Array.isArray(data) ? data : (data.items || data.results || [])
        setAppts(list.filter(a => a.mode === 'telehealth'))
        setLastUpdate(new Date())
        setError('')
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [user?.role])

  useEffect(() => {
    load()
    const interval = setInterval(() => load(true), 30000)
    return () => clearInterval(interval)
  }, [load])

  const join = async (appt) => {
    setJoiningId(appt.id)
    try {
      const data = await api.post(`/telehealth/appointments/${appt.id}/join`)
      startCall({
        url: data?.url || null,
        token: data?.token || null,
        provider: data?.provider || 'jitsi',
        appointmentId: appt.id,
        appt,
        windowEndsAt: data?.window_ends_at,
      })
    } catch (e) {
      alert(e.response?.data?.detail || e.message || 'Could not join. Check the appointment time window.')
    } finally {
      setJoiningId(null)
    }
  }

  const canJoin = (appt) => ['pending', 'confirmed', 'in_progress'].includes(appt.status)

  const live      = appts.filter(a => a.status === 'in_progress' || a.telehealth_state === 'in_progress')
  const completed = appts.filter(a => a.status === 'completed')

  return (
    <div>
      {/* Active call banner */}
      {activeCall && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-50 border border-blue-200 text-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
          </span>
          <span className="text-blue-700 font-semibold">Call active — {activeCall.appt?.patient_name}</span>
          <span className="text-blue-500 text-xs">Video widget is floating. Navigate freely — it persists on every page.</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Today" value={appts.length} icon={<Calendar size={18} className="text-slate-500" />} />
        <StatCard label="Live Now" value={live.length} accent pulse={live.length > 0} />
        <StatCard label="Waiting" value={appts.filter(a => a.telehealth_state === 'ready').length} icon={<Clock size={18} className="text-amber-500" />} />
        <StatCard label="Completed" value={completed.length} icon={<CheckCircle2 size={18} className="text-green-500" />} />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">Today's Telehealth Sessions</h2>
        {lastUpdate && <span className="text-xs text-gray-400">Auto-updated · {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {loading && appts.length === 0 ? (
        <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-gray-400" /></div>
      ) : appts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Video size={40} className="mb-3 opacity-25" />
          <p className="text-sm font-medium text-gray-500">No telehealth appointments today</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Time', 'Patient', 'Doctor', 'Status', 'Join', 'Chart'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide border-b border-gray-100">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {appts.map(a => {
                const isActive = activeCall?.appointmentId === a.id
                return (
                  <tr key={a.id}
                    className={`border-b border-gray-50 last:border-0 transition-colors ${isActive ? 'bg-blue-50/60' : 'hover:bg-blue-50/30'}`}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                        <Clock size={13} className="text-gray-400" />
                        {fmt12(a.appointment_time) || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                          {(a.patient_name || 'P')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{a.patient_name || '—'}</div>
                          {a.patient_mobile && <div className="text-xs text-gray-400">{a.patient_mobile}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">{a.doctor_name || a.doctor?.full_name || '—'}</td>
                    <td className="px-4 py-3.5">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> In Widget
                        </span>
                      ) : (
                        <StatusBadge state={a.telehealth_state || (a.status === 'in_progress' ? 'in_progress' : 'scheduled')} />
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {canJoin(a) ? (
                        <button onClick={() => join(a)} disabled={joiningId === a.id}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                          style={{ background: isActive ? '#2563eb' : '#0F2557' }}>
                          {joiningId === a.id
                            ? <><Loader2 size={14} className="animate-spin" /> Joining…</>
                            : <><Video size={14} /> {isActive ? 'Reopen' : 'Join'}</>}
                        </button>
                      ) : a.status === 'completed' ? (
                        <span className="flex items-center gap-1 text-xs text-gray-400"><CheckCircle2 size={14} /> Done</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-gray-400"><XCircle size={14} /> Unavailable</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => navigate(`/encounter/${a.id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors">
                          <FileText size={13} /> Open Chart
                        </button>
                        <button onClick={() => setTransferAppt(a)} title="Transfer to another doctor"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors">
                          <UserCheck size={13} /> Transfer
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {transferAppt && (
        <TransferDoctorModal
          appointmentId={transferAppt.id}
          currentDoctorId={null}
          patientName={transferAppt.patient_name}
          onTransferred={() => { setTransferAppt(null); load(true) }}
          onCancel={() => setTransferAppt(null)}
        />
      )}
    </div>
  )
}
