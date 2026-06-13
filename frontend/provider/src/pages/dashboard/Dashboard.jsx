import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { appointmentsApi, patientsApi, billingApi } from '../../api'
import { cachedFetch, TTL } from '../../utils/cache'
import StatCard from '../../components/ui/StatCard'
import { PageLoader } from '../../components/ui/Spinner'
import { Calendar, Clock, CheckCircle, Activity } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { Link } from 'react-router-dom'

const STATUS_BADGE = {
  pending:     'badge-yellow',
  confirmed:   'badge-blue',
  in_progress: 'badge-purple',
  completed:   'badge-green',
  cancelled:   'badge-gray',
}

const STATUS_COLOR = {
  pending:     '#F59E0B',
  confirmed:   '#3B82F6',
  in_progress: '#8B5CF6',
  completed:   '#10B981',
  cancelled:   '#9CA3AF',
}

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ── Drill-down modal ──────────────────────────────────────────────────────────
function DrillModal({ title, appointments, onClose }) {
  if (!appointments) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none font-bold"
          >
            &times;
          </button>
        </div>
        {appointments.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No appointments in this group.</div>
        ) : (
          <div className="table-wrapper rounded-none border-0 max-h-96 overflow-y-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="th">Token#</th>
                  <th className="th">Patient</th>
                  <th className="th">Time</th>
                  <th className="th">Status</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map(appt => (
                  <tr key={appt.id} className="tr-hover">
                    <td className="td font-mono font-bold text-blue-600">
                      #{appt.token_number || appt.id}
                    </td>
                    <td className="td">
                      <div className="font-medium">{appt.patient_name || appt.patient?.full_name}</div>
                      <div className="text-xs text-gray-400">{appt.patient?.mobile}</div>
                    </td>
                    <td className="td font-mono">{appt.appointment_time}</td>
                    <td className="td">
                      <span className={STATUS_BADGE[appt.status] || 'badge-gray'}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="td">
                      <Link
                        to={`/encounter/${appt.id}`}
                        className="text-blue-600 text-xs hover:underline"
                      >
                        Chart →
                      </Link>
                    </td>
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
function WeeklyBarChart({ data }) {
  const W = 320, H = 120, PAD = { top: 10, right: 10, bottom: 30, left: 28 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const max = Math.max(...data.map(d => d.count), 1)
  const barW = innerW / data.length - 4

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {/* Y gridlines */}
      {[0, 0.5, 1].map(frac => {
        const y = PAD.top + innerH * (1 - frac)
        return (
          <line
            key={frac}
            x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
            stroke="#E5E7EB" strokeWidth="1"
          />
        )
      })}
      {data.map((d, i) => {
        const barH = max === 0 ? 0 : (d.count / max) * innerH
        const x = PAD.left + i * (innerW / data.length) + 2
        const y = PAD.top + innerH - barH
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={barW} height={barH}
              rx="3"
              fill={d.isToday ? '#0F2557' : '#BFDBFE'}
            />
            <text
              x={x + barW / 2} y={H - PAD.bottom + 14}
              textAnchor="middle"
              fontSize="9"
              fill="#6B7280"
            >
              {d.label}
            </text>
            {d.count > 0 && (
              <text
                x={x + barW / 2} y={y - 3}
                textAnchor="middle"
                fontSize="8"
                fill="#374151"
              >
                {d.count}
              </text>
            )}
          </g>
        )
      })}
      {/* Y axis label */}
      <text x={PAD.left - 4} y={PAD.top + innerH / 2} textAnchor="middle"
        fontSize="8" fill="#9CA3AF" transform={`rotate(-90, ${PAD.left - 4}, ${PAD.top + innerH / 2})`}>
        Appts
      </text>
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth()
  const today = format(new Date(), 'yyyy-MM-dd')

  const [stats, setStats]           = useState(null)
  const [todayAppts, setTodayAppts] = useState([])
  const [loading, setLoading]       = useState(true)
  const [weekData, setWeekData]     = useState([])
  const [weekLoading, setWeekLoading] = useState(true)
  const [modal, setModal]           = useState(null) // { title, appointments }

  // Load today's appointments + stats
  useEffect(() => {
    cachedFetch(
      `dashboard_${today}`,
      () => Promise.all([
        appointmentsApi.list({ appointment_date: today, limit: 100 }),
        patientsApi.list({ limit: 1 }),
        billingApi.getInvoices({ status: 'paid', limit: 1 }),
      ]),
      ([appts]) => {
        const a = Array.isArray(appts) ? appts : []
        setTodayAppts(a)
        setStats({
          todayAppts: a.length,
          waiting: a.filter(x => x.status === 'pending' || x.status === 'confirmed').length,
          completed: a.filter(x => x.status === 'completed').length,
        })
        setLoading(false)
      },
      TTL.QUEUE
    ).catch(() => {
      setStats({ todayAppts: 0, waiting: 0, completed: 0 })
      setLoading(false)
    })
  }, [today])

  // Load weekly trend
  useEffect(() => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i)
      return { date: format(d, 'yyyy-MM-dd'), label: DAY_ABBR[d.getDay()], isToday: i === 6 }
    })
    Promise.all(
      dates.map(({ date }) =>
        appointmentsApi.list({ appointment_date: date, limit: 100 })
          .then(r => (Array.isArray(r) ? r : []).length)
          .catch(() => 0)
      )
    ).then(counts => {
      setWeekData(dates.map((d, i) => ({ ...d, count: counts[i] })))
      setWeekLoading(false)
    })
  }, [today])

  const openModal = useCallback((title, appointments) => {
    setModal({ title, appointments })
  }, [])

  const closeModal = useCallback(() => setModal(null), [])

  if (loading) return <PageLoader />

  // Breakdown counts
  const breakdown = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(s => ({
    status: s,
    count: todayAppts.filter(a => a.status === s).length,
  }))
  const total = todayAppts.length || 1
  const completionRate = stats
    ? Math.round((stats.completed / (stats.todayAppts || 1)) * 100)
    : 0

  return (
    <div>
      {/* Drill-down modal */}
      {modal && (
        <DrillModal
          title={modal.title}
          appointments={modal.appointments}
          onClose={closeModal}
        />
      )}

      {/* Stat Cards — clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div
          className="cursor-pointer"
          onClick={() => openModal("Today's Appointments", todayAppts)}
        >
          <StatCard
            label="Today's Appointments"
            value={stats?.todayAppts}
            icon={Calendar}
            color="blue"
          />
        </div>
        <div
          className="cursor-pointer"
          onClick={() => openModal(
            'Waiting / Confirmed',
            todayAppts.filter(a => a.status === 'pending' || a.status === 'confirmed')
          )}
        >
          <StatCard
            label="Waiting"
            value={stats?.waiting}
            icon={Clock}
            color="orange"
          />
        </div>
        <div
          className="cursor-pointer"
          onClick={() => openModal(
            'Completed Today',
            todayAppts.filter(a => a.status === 'completed')
          )}
        >
          <StatCard
            label="Completed"
            value={stats?.completed}
            icon={CheckCircle}
            color="green"
          />
        </div>
        <StatCard
          label="Plan"
          value={user?.clinic_plan?.toUpperCase() || 'FREE'}
          icon={Activity}
          color="purple"
          sub={user?.clinic_verified ? '✓ Verified' : '⚠ Pending verification'}
          to="/admin"
        />
      </div>

      {/* Analytics row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">

        {/* Weekly Trend */}
        <div className="card md:col-span-2 p-5">
          <h2 className="font-semibold text-gray-900 mb-3 text-sm">Weekly Appointment Trend</h2>
          {weekLoading ? (
            <div className="h-28 flex items-center justify-center text-gray-300 text-sm">
              Loading…
            </div>
          ) : (
            <WeeklyBarChart data={weekData} />
          )}
        </div>

        {/* Today's Summary — completion rate */}
        <div className="card p-5 flex flex-col items-center justify-center text-center">
          <h2 className="font-semibold text-gray-900 mb-4 text-sm">Today's Completion</h2>
          <div
            className="text-5xl font-bold mb-1"
            style={{ color: completionRate >= 80 ? '#10B981' : completionRate >= 50 ? '#F59E0B' : '#EF4444' }}
          >
            {completionRate}%
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {stats?.completed} of {stats?.todayAppts} appointments done
          </p>
          {stats?.todayAppts === 0 && (
            <p className="text-xs text-gray-300 mt-2">No appointments today</p>
          )}
        </div>
      </div>

      {/* Appointment Breakdown */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4 text-sm">Today's Appointment Breakdown</h2>
        {todayAppts.length === 0 ? (
          <p className="text-sm text-gray-400">No appointments today.</p>
        ) : (
          <>
            {/* Stacked bar */}
            <div className="flex rounded-full overflow-hidden h-4 mb-4">
              {breakdown.filter(b => b.count > 0).map(b => (
                <div
                  key={b.status}
                  style={{
                    width: `${(b.count / total) * 100}%`,
                    backgroundColor: STATUS_COLOR[b.status],
                  }}
                  title={`${b.status}: ${b.count}`}
                />
              ))}
            </div>
            {/* Legend pills */}
            <div className="flex flex-wrap gap-3">
              {breakdown.map(b => (
                <button
                  key={b.status}
                  className="flex items-center gap-1.5 text-xs text-gray-700 hover:opacity-80 transition-opacity"
                  onClick={() => openModal(
                    b.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
                    todayAppts.filter(a => a.status === b.status)
                  )}
                  disabled={b.count === 0}
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: STATUS_COLOR[b.status] }}
                  />
                  <span className="capitalize">{b.status.replace('_', ' ')}</span>
                  <span className="font-semibold">{b.count}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
