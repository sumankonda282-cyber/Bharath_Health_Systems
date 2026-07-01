import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { appointmentsApi, clinicApi } from '../../api'
import { cachedFetch, TTL } from '../../utils/cache'
import StatCard from '../../components/ui/StatCard'
import { PageLoader } from '../../components/ui/Spinner'
import {
  Calendar, Clock, CheckCircle, Activity, UserPlus, Users,
  IndianRupee, Video, Globe, AlertTriangle,
} from 'lucide-react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'

const fmt12 = (t) => {
  if (!t) return t
  const str = String(t).slice(0, 5)
  const [h, m] = str.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return t
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

const inr = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`

const STATUS_BADGE = {
  pending: 'badge-yellow', confirmed: 'badge-blue',
  in_progress: 'badge-purple', completed: 'badge-green', cancelled: 'badge-gray',
}
const STATUS_COLOR = {
  pending: '#F59E0B', confirmed: '#3B82F6', in_progress: '#8B5CF6',
  completed: '#10B981', cancelled: '#9CA3AF',
}

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'Last 7 days' },
  { key: 'month', label: 'Last 30 days' },
]

// ── Drill-down modal ──────────────────────────────────────────────────────────
function DrillModal({ title, appointments, onClose }) {
  if (!appointments) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none font-bold">&times;</button>
        </div>
        {appointments.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No appointments in this group.</div>
        ) : (
          <div className="table-wrapper rounded-none border-0 max-h-96 overflow-y-auto">
            <table className="table">
              <thead><tr>
                <th className="th">Token#</th><th className="th">Patient</th>
                <th className="th">Time</th><th className="th">Status</th><th className="th"></th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map(appt => (
                  <tr key={appt.id} className="tr-hover">
                    <td className="td font-mono font-bold text-blue-600">#{appt.token_number || appt.id}</td>
                    <td className="td">
                      <div className="font-medium">{appt.patient_name || appt.patient?.full_name}</div>
                      <div className="text-xs text-gray-400">{appt.patient?.mobile}</div>
                    </td>
                    <td className="td font-mono">{fmt12(appt.appointment_time)}</td>
                    <td className="td"><span className={STATUS_BADGE[appt.status] || 'badge-gray'}>{appt.status}</span></td>
                    <td className="td"><Link to={`/encounter/${appt.id}`} className="text-blue-600 text-xs hover:underline">Chart →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Inline SVG bar chart ──────────────────────────────────────────────────────
function TrendBarChart({ data }) {
  const W = 640, H = 150, PAD = { top: 12, right: 10, bottom: 28, left: 30 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const max = Math.max(...data.map(d => d.count), 1)
  const slot = innerW / Math.max(data.length, 1)
  const barW = Math.max(2, slot - (data.length > 14 ? 2 : 6))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {[0, 0.5, 1].map(frac => {
        const y = PAD.top + innerH * (1 - frac)
        return <line key={frac} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#E5E7EB" strokeWidth="1" />
      })}
      {data.map((d, i) => {
        const barH = max === 0 ? 0 : (d.count / max) * innerH
        const x = PAD.left + i * slot + (slot - barW) / 2
        const y = PAD.top + innerH - barH
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx="2" fill={d.isToday ? '#0F2557' : '#BFDBFE'} />
            {data.length <= 14 && (
              <text x={x + barW / 2} y={H - PAD.bottom + 14} textAnchor="middle" fontSize="9" fill="#6B7280">{d.label}</text>
            )}
            {d.count > 0 && data.length <= 14 && (
              <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize="8" fill="#374151">{d.count}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const today = format(new Date(), 'yyyy-MM-dd')

  const [period, setPeriod]   = useState('today')
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [todayAppts, setTodayAppts] = useState([])
  const [modal, setModal]     = useState(null)

  // Period-aware KPIs (single aggregate call)
  useEffect(() => {
    setLoading(true)
    setError('')
    cachedFetch(
      `dashboard_stats_${period}`,
      () => clinicApi.getDashboardStats(period),
      d => { setStats(d || null); setLoading(false) },
      TTL.QUEUE
    ).catch(e => { setError(e.message || 'Could not load dashboard'); setLoading(false) })
  }, [period])

  // Today's appointment list — for drill-down (today period only)
  useEffect(() => {
    cachedFetch(
      `dashboard_today_${today}`,
      () => appointmentsApi.list({ appointment_date: today, limit: 100 }),
      r => setTodayAppts(Array.isArray(r) ? r : []),
      TTL.QUEUE
    ).catch(() => setTodayAppts([]))
  }, [today])

  const openModal = useCallback((title, appointments) => setModal({ title, appointments }), [])
  const closeModal = useCallback(() => setModal(null), [])

  if (loading && !stats) return <PageLoader />

  const s = stats || {}
  const byStatus = s.by_status || {}
  const total = s.appointments || 0
  const breakdown = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']
    .map(st => ({ status: st, count: byStatus[st] || 0 }))
  const barTotal = total || 1
  const isToday = period === 'today'

  return (
    <div>
      {modal && <DrillModal title={modal.title} appointments={modal.appointments} onClose={closeModal} />}

      {/* Header + period filter */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="text-lg font-bold" style={{ color: '#0F2557' }}>Overview</h1>
          {s.date_from && (
            <p className="text-xs text-gray-400">
              {isToday ? 'Today' : `${s.date_from} → ${s.date_to}`}
            </p>
          )}
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${period === p.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="card p-3 mb-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setPeriod(p => p)} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-red-200 hover:bg-red-100">Retry</button>
        </div>
      )}

      {/* KPI pills — compact, click-through, single tight row on wide screens */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 mb-5">
        <div className="cursor-pointer" onClick={() => isToday && openModal("Appointments", todayAppts)}>
          <StatCard compact label="Appointments" value={s.appointments ?? 0} icon={Calendar} color="blue" sub={isToday ? 'Tap to view' : 'in period'} />
        </div>
        <div className="cursor-pointer" onClick={() => isToday && openModal('Waiting / Confirmed', todayAppts.filter(a => a.status === 'pending' || a.status === 'confirmed'))}>
          <StatCard compact label="Waiting" value={s.waiting ?? 0} icon={Clock} color="orange" />
        </div>
        <div className="cursor-pointer" onClick={() => isToday && openModal('Completed', todayAppts.filter(a => a.status === 'completed'))}>
          <StatCard compact label="Completed" value={s.completed ?? 0} icon={CheckCircle} color="green" sub={`${s.completion_rate ?? 0}% completion rate`} />
        </div>
        <StatCard compact label="New Patients" value={s.new_patients ?? 0} icon={UserPlus} color="purple" />
        <StatCard compact label="Revenue" value={inr(s.revenue_collected)} icon={IndianRupee} color="green"
          sub={s.revenue_outstanding ? `${inr(s.revenue_outstanding)} outstanding` : 'all settled'} />
        <div className="cursor-pointer">
          <StatCard compact label="Pending Online" value={s.pending_online ?? 0} icon={Globe} color="orange" sub="Confirm from Appointments" to="/appointments" />
        </div>
        <StatCard compact label="Telehealth" value={s.telehealth ?? 0} icon={Video} color="blue" sub={`${s.walk_in ?? 0} walk-in`} />
        <StatCard compact label="Total Patients" value={s.total_patients ?? 0} icon={Users} color="purple" to="/patients" />
      </div>

      {/* Analytics row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="card lg:col-span-2 p-5">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm">Appointment Trend</h2>
          {(s.trend || []).length === 0
            ? <div className="h-32 flex items-center justify-center text-gray-300 text-sm">No data</div>
            : <TrendBarChart data={s.trend} />}
        </div>
        <div className="card p-5 flex flex-col items-center justify-center text-center">
          <h2 className="font-semibold text-gray-900 mb-4 text-sm">Completion Rate</h2>
          <div className="text-5xl font-bold mb-1"
            style={{ color: (s.completion_rate ?? 0) >= 80 ? '#10B981' : (s.completion_rate ?? 0) >= 50 ? '#F59E0B' : '#EF4444' }}>
            {s.completion_rate ?? 0}%
          </div>
          <p className="text-xs text-gray-400 mt-1">{s.completed ?? 0} of {s.appointments ?? 0} appointments done</p>
          {(s.appointments ?? 0) === 0 && <p className="text-xs text-gray-300 mt-2">No appointments in this period</p>}
        </div>
      </div>

      {/* Appointment Breakdown */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4 text-sm">Appointment Breakdown</h2>
        {total === 0 ? (
          <p className="text-sm text-gray-400">No appointments in this period.</p>
        ) : (
          <>
            <div className="flex rounded-full overflow-hidden h-4 mb-4">
              {breakdown.filter(b => b.count > 0).map(b => (
                <div key={b.status} style={{ width: `${(b.count / barTotal) * 100}%`, backgroundColor: STATUS_COLOR[b.status] }} title={`${b.status}: ${b.count}`} />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {breakdown.map(b => {
                const pill = (
                  <>
                    <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLOR[b.status] }} />
                    <span className="capitalize">{b.status.replace('_', ' ')}</span>
                    <span className="font-semibold">{b.count}</span>
                  </>
                )
                return isToday ? (
                  <button key={b.status} className="flex items-center gap-1.5 text-xs text-gray-700 hover:opacity-80 disabled:opacity-40"
                    onClick={() => openModal(b.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()), todayAppts.filter(a => a.status === b.status))}
                    disabled={b.count === 0}>
                    {pill}
                  </button>
                ) : (
                  <Link key={b.status} to={`/appointments?status=${b.status}`} className="flex items-center gap-1.5 text-xs text-gray-700 hover:opacity-80">
                    {pill}
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
