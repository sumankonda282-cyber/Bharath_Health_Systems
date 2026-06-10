import { useEffect, useState } from 'react'
import { BedDouble, Activity, Pill, ArrowLeftRight, Loader2, Clock, User, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../contexts/AuthContext'

function timeAgo(dateStr) {
  if (!dateStr) return null
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000 / 60
  if (diff < 60) return `${Math.round(diff)}m ago`
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`
  return `${Math.round(diff / 1440)}d ago`
}

function StatCard({ icon: Icon, label, value, color, sub, to, badge }) {
  const inner = (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(6,95,70,0.05)' }}>
      <div className="w-13 h-13 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, width: 52, height: 52 }}>
        <Icon size={24} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-extrabold leading-none" style={{ color: '#0F2557' }}>{value}</div>
          {badge && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: `${color}18`, color }}>
              {badge}
            </span>
          )}
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
  const navigate = useNavigate()
  const [admissions, setAdmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/inpatient/admissions', { params: { status: 'active' } })
      .then(data => setAdmissions(Array.isArray(data) ? data : (data.items || data.results || [])))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const vitalsDue = admissions.filter(a => {
    if (!a.last_vital_at) return true
    return (Date.now() - new Date(a.last_vital_at).getTime()) / 1000 / 3600 > 4
  }).length

  const vitalsOk = admissions.length - vitalsDue

  const h = new Date().getHours()
  const shiftName  = h >= 6 && h < 14 ? 'Morning' : h >= 14 && h < 22 ? 'Afternoon' : 'Night'
  const shiftRange = h >= 6 && h < 14 ? '6am–2pm' : h >= 14 && h < 22 ? '2pm–10pm' : '10pm–6am'

  const greeting = h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0F2557' }}>
              {greeting}, {user?.full_name?.split(' ')[0] || 'Nurse'} 👋
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {shiftName} Shift · {shiftRange} ·{' '}
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: '#F5821E18', color: '#F5821E', border: '1px solid #F5821E30' }}>
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            {shiftName} Shift Active
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3.5 mb-5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 size={32} className="animate-spin" style={{ color: '#065F46' }} />
          <span className="text-sm text-gray-400">Loading ward data…</span>
        </div>
      ) : (
        <>
          {/* Stat grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={BedDouble} label="Active Admissions" value={admissions.length}
              color="#065F46" badge="Active" to="/ward-board"
            />
            <StatCard
              icon={AlertTriangle} label="Vitals Overdue" value={vitalsDue}
              color={vitalsDue > 0 ? '#CC1414' : '#16A34A'}
              sub={vitalsDue > 0 ? '> 4h since last charting' : 'All charted on time'}
              to="/vitals"
            />
            <StatCard
              icon={CheckCircle2} label="Vitals On Time" value={vitalsOk}
              color="#16A34A" sub="Charted within 4h" to="/vitals"
            />
            <StatCard
              icon={ArrowLeftRight} label="Shift Handoff" value={shiftName}
              color="#6366f1" sub={`Notes & summary for ${shiftRange}`} to="/handoff"
            />
          </div>

          {/* Quick actions */}
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <QuickAction label="Chart Vitals"     to="/vitals"     color="#065F46" icon={Activity} />
              <QuickAction label="Nursing Notes"    to="/notes"      color="#0F2557" icon={Pill} />
              <QuickAction label="MAR"              to="/mar"        color="#d97706" icon={Pill} />
              <QuickAction label="Shift Handoff"    to="/handoff"    color="#6366f1" icon={ArrowLeftRight} />
            </div>
          </div>

          {/* Admissions table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(6,95,70,0.05)' }}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-800">Active Admissions</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: '#06b48618', color: '#065F46' }}>
                  {admissions.length}
                </span>
              </div>
              <Link to="/ward-board" className="text-xs font-medium hover:underline" style={{ color: '#065F46' }}>
                Ward Board →
              </Link>
            </div>

            {admissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-gray-400">
                <User size={36} className="mb-3 opacity-25" />
                <p className="text-sm font-medium text-gray-500">No active admissions</p>
                <p className="text-xs text-gray-400 mt-1">Admissions will appear here once assigned</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead>
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">Patient</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">Admission #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">Ward / Bed</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">Diagnosis</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">Last Vitals</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {admissions.map(a => {
                      const name   = a.patient?.full_name || a.patient_name || 'Unknown'
                      const admNo  = a.admission_number || `#${a.id}`
                      const ward   = a.ward?.name || a.ward_name || '—'
                      const bed    = a.bed?.bed_number || a.bed_number || '—'
                      const diag   = a.diagnosis || a.primary_diagnosis || '—'
                      const ago    = timeAgo(a.last_vital_at)
                      const overdue = !a.last_vital_at ||
                        (Date.now() - new Date(a.last_vital_at).getTime()) / 1000 / 3600 > 4
                      return (
                        <tr key={a.id}
                          className="hover:bg-emerald-50/30 transition-colors cursor-pointer"
                          onClick={() => navigate(`/patient/${a.id}`)}>
                          <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">{name}</td>
                          <td className="px-4 py-3.5 text-sm font-mono text-gray-500">{admNo}</td>
                          <td className="px-4 py-3.5 text-sm text-gray-600">{ward} / {bed}</td>
                          <td className="px-4 py-3.5 text-sm text-gray-500 max-w-xs truncate">{diag}</td>
                          <td className="px-4 py-3.5 text-sm">
                            {ago ? (
                              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                                overdue
                                  ? 'bg-red-50 text-red-600'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}>
                                <Clock size={10} />{ago}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                                <Clock size={10} />Never charted
                              </span>
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
        </>
      )}
    </div>
  )
}
