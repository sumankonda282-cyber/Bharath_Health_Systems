import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { appointmentsApi, patientsApi, billingApi } from '../../api'
import { cachedFetch, TTL } from '../../utils/cache'
import { PageLoader } from '../../components/ui/Spinner'
import {
  Calendar, Clock, CheckCircle, Activity, UserPlus,
  FileText, FlaskConical, Stethoscope, TrendingUp, AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'

const STATUS_BADGE = {
  pending:     { cls: 'bg-amber-50 text-amber-700',   label: 'Pending' },
  confirmed:   { cls: 'bg-blue-50 text-blue-700',     label: 'Confirmed' },
  in_progress: { cls: 'bg-purple-50 text-purple-700', label: 'In Progress' },
  completed:   { cls: 'bg-emerald-50 text-emerald-700', label: 'Completed' },
  cancelled:   { cls: 'bg-red-50 text-red-600',       label: 'Cancelled' },
}

function StatCard({ label, value, icon: Icon, color, sub, to }) {
  const inner = (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(15,37,87,0.05)', cursor: to ? 'pointer' : 'default' }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <div className="text-2xl font-extrabold leading-none" style={{ color: '#0F2557' }}>
          {value ?? <span className="text-gray-300 text-xl">—</span>}
        </div>
        <div className="text-xs text-gray-500 font-medium mt-1">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
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

export default function Dashboard() {
  const { user } = useAuth()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [stats, setStats] = useState(null)
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)

  const h = new Date().getHours()
  const greeting = h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    cachedFetch(
      `dashboard_${today}`,
      () => Promise.all([
        appointmentsApi.list({ appointment_date: today, limit: 20 }),
        patientsApi.list({ limit: 1 }),
        billingApi.getInvoices({ status: 'paid', limit: 1 }),
      ]),
      ([appts]) => {
        const a = Array.isArray(appts) ? appts : []
        setQueue(a.slice(0, 10))
        setStats({
          todayAppts: a.length,
          waiting:    a.filter(x => x.status === 'pending' || x.status === 'confirmed').length,
          completed:  a.filter(x => x.status === 'completed').length,
        })
        setLoading(false)
      },
      TTL.QUEUE
    ).catch(() => { setStats({ todayAppts: 0, waiting: 0, completed: 0 }); setLoading(false) })
  }, [today])

  if (loading) return <PageLoader />

  const name = user?.full_name?.split(' ')[0] || 'Doctor'

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0F2557' }}>
            {greeting}, Dr. {name} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
            {user?.clinic_name && ` · ${user.clinic_name}`}
          </p>
        </div>
        <Link to="/appointments" className="btn-primary flex-shrink-0">
          <Calendar size={16} />
          Today's Queue
        </Link>
      </div>

      {/* Plan badge */}
      {!user?.clinic_verified && (
        <div className="flex items-center gap-2 p-3.5 mb-6 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          Your clinic is pending verification. Some features may be limited until approved.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Today's Appointments" value={stats?.todayAppts} icon={Calendar} color="#0F2557" to="/appointments" />
        <StatCard label="Waiting"              value={stats?.waiting}    icon={Clock}    color="#F5821E" to="/appointments" />
        <StatCard label="Completed"            value={stats?.completed}  icon={CheckCircle} color="#16A34A" to="/appointments" />
        <StatCard
          label="Plan"
          value={user?.clinic_plan?.toUpperCase() || 'FREE'}
          icon={Activity} color="#7c3aed"
          sub={user?.clinic_verified ? '✓ Verified clinic' : '⚠ Pending verification'}
        />
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction label="Register Patient" to="/patients/new"         color="#0F2557" icon={UserPlus} />
          <QuickAction label="Doctor Desk"      to="/doctor-desk"          color="#065F46" icon={Stethoscope} />
          <QuickAction label="Lab Orders"       to="/lab"                  color="#0891b2" icon={FlaskConical} />
          <QuickAction label="Progress Notes"   to="/progress-notes"       color="#7c3aed" icon={FileText} />
        </div>
      </div>

      {/* Today's Queue */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(15,37,87,0.05)' }}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-800">Today's Appointment Queue</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: '#0F255718', color: '#0F2557' }}>
              {queue.length}
            </span>
          </div>
          <Link to="/appointments" className="text-xs font-medium hover:underline" style={{ color: '#0F2557' }}>
            View all →
          </Link>
        </div>

        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-gray-400">
            <Calendar size={36} className="mb-3 opacity-25" />
            <p className="text-sm font-medium text-gray-500">No appointments today</p>
            <Link to="/appointments?walkin=1" className="btn-primary mt-4">
              Add Walk-in
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">Token</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">Patient</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">Doctor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">Status</th>
                  <th className="px-4 py-3 bg-gray-50/80" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {queue.map(appt => {
                  const badge = STATUS_BADGE[appt.status] || { cls: 'bg-gray-100 text-gray-600', label: appt.status }
                  return (
                    <tr key={appt.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-bold font-mono" style={{ color: '#0F2557' }}>
                        #{appt.token_number || appt.id}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-sm font-semibold text-gray-800">{appt.patient_name || appt.patient?.full_name}</div>
                        <div className="text-xs text-gray-400">{appt.patient?.mobile}</div>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-mono text-gray-600">{appt.appointment_time}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500">{appt.doctor_name || appt.doctor?.staff?.full_name}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {appt.status !== 'completed' && (
                          <Link to={`/encounter/${appt.id}`}
                            className="text-xs font-semibold hover:underline"
                            style={{ color: '#0F2557' }}>
                            Open →
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
