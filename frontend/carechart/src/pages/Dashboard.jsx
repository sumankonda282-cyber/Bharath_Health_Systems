import { useEffect, useState } from 'react'
import {
  BedDouble, Activity, ArrowLeftRight, Loader2,
  Clock, User, AlertTriangle, CheckCircle2, TrendingUp, Bell
} from 'lucide-react'
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

function KPI({ icon: Icon, label, value, color, sub, to, urgent }) {
  const inner = (
    <div className={`bg-white rounded-2xl border p-5 flex items-center gap-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${urgent ? 'border-red-200' : 'border-gray-100'}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(6,95,70,0.04)' }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-extrabold leading-none" style={{ color: '#0F2557' }}>{value}</div>
        <div className="text-xs text-gray-500 font-medium mt-1">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
  return to ? <Link to={to} className="block">{inner}</Link> : inner
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

  const vitalsOverdue = admissions.filter(a =>
    !a.last_vital_at || (Date.now() - new Date(a.last_vital_at).getTime()) / 36e5 > 4
  )
  const longStay = admissions.filter(a => {
    const days = a.admitted_at ? Math.floor((Date.now() - new Date(a.admitted_at)) / 86400000) : 0
    return days > 7
  })

  // Derive clinical alerts from admission data
  const alerts = admissions.flatMap(a => {
    const items = []
    const p = a.patient || {}
    if (p.allergies?.length || a.has_allergy)
      items.push({ level: 'high', text: `Bed ${a.bed?.bed_number || a.bed_number || '?'} — ${p.full_name || a.patient_name}: Active allergy on record` })
    if (!a.last_vital_at || (Date.now() - new Date(a.last_vital_at).getTime()) / 36e5 > 8)
      items.push({ level: 'medium', text: `Bed ${a.bed?.bed_number || a.bed_number || '?'} — ${p.full_name || a.patient_name}: Vitals not charted in 8+ hours` })
    return items
  }).slice(0, 5)

  const h = new Date().getHours()
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0F2557' }}>
            {greeting}, {user?.full_name?.split(' ')[0] || 'Doctor'} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Link to="/patients"
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl text-white transition-colors"
          style={{ background: '#065F46' }}>
          <User size={15} /> View All Patients
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3.5 mb-5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle size={16} className="flex-shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 size={32} className="animate-spin" style={{ color: '#065F46' }} />
          <span className="text-sm text-gray-400">Loading ward data…</span>
        </div>
      ) : (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPI icon={BedDouble} label="Active Admissions" value={admissions.length}
              color="#065F46" sub="In this ward" to="/patients" />
            <KPI icon={AlertTriangle} label="Vitals Overdue" value={vitalsOverdue.length}
              color={vitalsOverdue.length > 0 ? '#CC1414' : '#16A34A'}
              sub={vitalsOverdue.length > 0 ? 'Need charting now' : 'All on time'}
              urgent={vitalsOverdue.length > 0} to="/patients?flag=vitals" />
            <KPI icon={TrendingUp} label="Long Stay ( >7d )" value={longStay.length}
              color="#D97706" sub="Review discharge plan" to="/patients" />
            <KPI icon={ArrowLeftRight} label="Shift Handoff" value="Pending"
              color="#6366F1" sub="Document before end of shift" to="/handoff" />
          </div>

          {/* Clinical alerts */}
          {alerts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Bell size={15} className="text-red-600" />
                <span className="text-sm font-semibold text-red-700">Clinical Alerts</span>
                <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-bold">{alerts.length}</span>
              </div>
              <div className="space-y-1.5">
                {alerts.map((a, i) => (
                  <div key={i} className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
                    a.level === 'high' ? 'bg-red-100 text-red-800' : 'bg-amber-50 text-amber-800'
                  }`}>
                    <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                    {a.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patient list summary table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-800 text-sm">Active Admissions</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: '#06b48618', color: '#065F46' }}>
                  {admissions.length}
                </span>
              </div>
              <Link to="/patients" className="text-xs font-medium hover:underline" style={{ color: '#065F46' }}>
                Full list →
              </Link>
            </div>

            {admissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                <User size={32} className="mb-2 opacity-25" />
                <p className="text-sm">No active admissions</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-50">
                  <thead>
                    <tr className="bg-gray-50/80">
                      {['Patient', 'Bed / Ward', 'Diagnosis', 'Last Vitals'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {admissions.slice(0, 10).map(a => {
                      const name  = a.patient?.full_name || a.patient_name || 'Unknown'
                      const ward  = a.ward?.name || a.ward_name || '—'
                      const bed   = a.bed?.bed_number || a.bed_number || '—'
                      const diag  = a.primary_diagnosis || a.diagnosis || '—'
                      const ago   = timeAgo(a.last_vital_at)
                      const overdue = !a.last_vital_at || (Date.now() - new Date(a.last_vital_at).getTime()) / 36e5 > 4
                      return (
                        <tr key={a.id}
                          className="hover:bg-emerald-50/30 cursor-pointer transition-colors"
                          onClick={() => navigate(`/patient/${a.id}`)}>
                          <td className="px-5 py-3 text-sm font-semibold text-gray-900">{name}</td>
                          <td className="px-5 py-3 text-sm text-gray-500">{ward} / {bed}</td>
                          <td className="px-5 py-3 text-sm text-gray-500 max-w-xs truncate">{diag}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                              overdue ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              <Clock size={10} />
                              {ago || 'Never charted'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {admissions.length > 10 && (
                  <div className="px-5 py-3 text-center border-t border-gray-50">
                    <Link to="/patients" className="text-xs text-emerald-600 hover:underline font-medium">
                      View all {admissions.length} patients →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
