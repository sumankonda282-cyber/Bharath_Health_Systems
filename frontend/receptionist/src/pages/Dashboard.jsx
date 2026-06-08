import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { cachedFetch, TTL } from '../utils/cache'
import {
  CalendarDays, Users, CreditCard, Clock, CheckCircle,
  XCircle, Loader2, TrendingUp, UserPlus, ReceiptText,
  ClipboardList, AlertCircle
} from 'lucide-react'

function StatCard({ icon: Icon, label, value, color, to, trend }) {
  const inner = (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(15,37,87,0.05)', cursor: to ? 'pointer' : 'default' }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-extrabold leading-none" style={{ color: '#0F2557' }}>
          {value ?? <span className="text-gray-300 text-xl">—</span>}
        </div>
        <div className="text-xs text-gray-500 font-medium mt-1">{label}</div>
        {trend && (
          <div className="flex items-center gap-1 mt-1 text-xs font-medium" style={{ color: '#16A34A' }}>
            <TrendingUp size={11} />{trend}
          </div>
        )}
      </div>
    </div>
  )
  return to ? <Link to={to} className="block">{inner}</Link> : inner
}

function QuickAction({ label, to, color, icon: Icon }) {
  return (
    <Link to={to}
      className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-all duration-150 group"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">{label}</span>
    </Link>
  )
}

const STATUS_BADGE = {
  scheduled:   { cls: 'bg-blue-50 text-blue-700',   label: 'Scheduled' },
  waiting:     { cls: 'bg-amber-50 text-amber-700',  label: 'Waiting' },
  in_progress: { cls: 'bg-purple-50 text-purple-700',label: 'In Progress' },
  completed:   { cls: 'bg-emerald-50 text-emerald-700', label: 'Completed' },
  cancelled:   { cls: 'bg-red-50 text-red-600',     label: 'Cancelled' },
}

export default function Dashboard() {
  const [appts, setAppts] = useState([])
  const [loading, setLoading] = useState(true)
  const today = new Date().toISOString().split('T')[0]

  const h = new Date().getHours()
  const greeting = h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    cachedFetch(
      `recep_dashboard_${today}`,
      () => api.get('/appointments', { params: { appointment_date: today, limit: 100 } }),
      r => { setAppts(Array.isArray(r) ? r : []); setLoading(false) },
      TTL.QUEUE
    ).catch(() => setLoading(false))
    const interval = setInterval(() => {
      api.get('/appointments', { params: { appointment_date: today, limit: 100 } })
        .then(r => setAppts(Array.isArray(r) ? r : [])).catch(() => {})
    }, 30_000)
    return () => clearInterval(interval)
  }, [today])

  const waiting   = appts.filter(a => a.status === 'scheduled' || a.status === 'waiting').length
  const completed = appts.filter(a => a.status === 'completed').length
  const cancelled = appts.filter(a => a.status === 'cancelled').length

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0F2557' }}>
          {greeting} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 size={32} className="animate-spin text-gray-400" />
          <span className="text-sm text-gray-400">Loading…</span>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={CalendarDays} label="Today's Appointments" value={appts.length}  color="#0F2557" to="/appointments" />
            <StatCard icon={Clock}        label="Waiting"              value={waiting}        color="#F5821E" to="/appointments" />
            <StatCard icon={CheckCircle}  label="Completed"            value={completed}      color="#16A34A" to="/appointments" />
            <StatCard icon={XCircle}      label="Cancelled"            value={cancelled}      color="#CC1414" to="/appointments" />
          </div>

          {/* Quick actions */}
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <QuickAction label="New Appointment"  to="/appointments"    color="#0F2557" icon={CalendarDays} />
              <QuickAction label="Register Patient" to="/patients"        color="#065F46" icon={UserPlus} />
              <QuickAction label="Billing"          to="/billing"         color="#7c3aed" icon={ReceiptText} />
              <QuickAction label="Queue"            to="/queue"           color="#F5821E" icon={ClipboardList} />
            </div>
          </div>

          {/* Today's schedule */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(15,37,87,0.05)' }}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-800">Today's Schedule</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: '#0F255718', color: '#0F2557' }}>
                  {appts.length}
                </span>
              </div>
              <Link to="/appointments" className="text-xs font-medium hover:underline" style={{ color: '#0F2557' }}>
                View all →
              </Link>
            </div>
            {appts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-gray-400">
                <CalendarDays size={36} className="mb-3 opacity-25" />
                <p className="text-sm font-medium text-gray-500">No appointments today</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead>
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">Patient</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">Doctor</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {appts.map(a => {
                      const badge = STATUS_BADGE[a.status] || { cls: 'bg-gray-100 text-gray-600', label: a.status }
                      return (
                        <tr key={a.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="px-5 py-3.5 text-sm font-bold font-mono" style={{ color: '#0F2557' }}>
                            #{a.token_number || a.id}
                          </td>
                          <td className="px-4 py-3.5 text-sm font-medium text-gray-800">{a.patient_name || '—'}</td>
                          <td className="px-4 py-3.5 text-sm text-gray-500">{a.doctor_name || '—'}</td>
                          <td className="px-4 py-3.5 text-sm text-gray-600 font-mono">
                            {a.appointment_time
                              ? new Date('1970-01-01T' + a.appointment_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
