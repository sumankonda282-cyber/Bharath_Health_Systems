import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BedDouble, Activity, Pill, ArrowLeftRight,
  Loader2, Clock, User, AlertTriangle, TrendingUp, ChevronRight
} from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../contexts/AuthContext'

function timeAgo(dateStr) {
  if (!dateStr) return null
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000 / 60
  if (diff < 60) return `${Math.round(diff)}m ago`
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`
  return `${Math.round(diff / 1440)}d ago`
}

function getShiftName() {
  const h = new Date().getHours()
  if (h >= 6 && h < 14) return 'Morning'
  if (h >= 14 && h < 22) return 'Afternoon'
  return 'Night'
}

function StatCard({ icon: Icon, label, value, color, sub, urgent }) {
  return (
    <div className={`card p-4 flex items-start gap-3 ${urgent ? 'border-red-200 bg-red-50/50' : ''}`}>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${color}18` }}
      >
        <Icon size={20} style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold leading-tight" style={{ color: urgent ? '#DC2626' : '#0F2557' }}>{value}</div>
        <div className="text-xs font-medium text-gray-600 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [admissions, setAdmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/inpatient/admissions?status=active')
      .then(data => setAdmissions(Array.isArray(data) ? data : (data.items || data.results || [])))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const vitalsDue = admissions.filter(a => {
    if (!a.last_vital_at) return true
    return (Date.now() - new Date(a.last_vital_at).getTime()) / 3600000 > 4
  }).length

  const shiftName = getShiftName()

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Ward Dashboard</h1>
          <p className="text-gray-500 text-xs mt-0.5">
            {shiftName} Shift · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short' })}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">Welcome back</div>
          <div className="text-sm font-semibold text-gray-800">{user?.full_name || user?.email}</div>
        </div>
      </div>

      {error && (
        <div className="alert-red mb-4">
          <AlertTriangle size={15} />{error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <StatCard icon={BedDouble} label="Active Admissions" value={admissions.length} color="#065F46" />
            <StatCard
              icon={Activity} label="Vitals Due" value={vitalsDue}
              color={vitalsDue > 0 ? '#DC2626' : '#16A34A'}
              sub="> 4h since charting"
              urgent={vitalsDue > 0}
            />
            <StatCard icon={Pill} label="MAR Pending" value="—" color="#d97706" sub="Open MAR" />
            <StatCard icon={ArrowLeftRight} label="Shift Handoff" value={shiftName} color="#6366f1" sub="Handoff due at shift end" />
          </div>

          {vitalsDue > 0 && (
            <div className="alert-amber mb-4">
              <AlertTriangle size={15} />
              <span><strong>{vitalsDue} patient{vitalsDue > 1 ? 's' : ''}</strong> have vitals overdue (&gt;4h). Click a row to chart.</span>
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-600" />
                <h2 className="font-semibold text-gray-800 text-sm">Active Admissions</h2>
                <span className="badge-green">{admissions.length}</span>
              </div>
              <span className="text-xs text-gray-400">Click row to open chart</span>
            </div>

            {admissions.length === 0 ? (
              <div className="empty-state">
                <User size={28} className="empty-state-icon" />
                <span className="empty-state-text">No active admissions</span>
              </div>
            ) : (
              <div className="table-wrapper rounded-none border-0">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="th">Patient</th>
                      <th className="th">Ward / Bed</th>
                      <th className="th hidden sm:table-cell">Diagnosis</th>
                      <th className="th">Last Vitals</th>
                      <th className="th w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-50">
                    {admissions.map(a => {
                      const name = a.patient?.full_name || a.patient_name || 'Unknown'
                      const mrn = a.patient?.patient_id || a.patient?.mrn || ''
                      const ward = a.ward?.name || a.ward_name || '—'
                      const bed = a.bed?.bed_number || a.bed_number || '—'
                      const diag = a.diagnosis || a.primary_diagnosis || '—'
                      const ago = timeAgo(a.last_vital_at)
                      const overdue = !a.last_vital_at ||
                        (Date.now() - new Date(a.last_vital_at).getTime()) / 3600000 > 4
                      return (
                        <tr
                          key={a.id}
                          className="tr-hover cursor-pointer"
                          onClick={() => navigate(`/chart/${a.id}`)}
                        >
                          <td className="td">
                            <div className="font-medium text-gray-900 text-sm">{name}</div>
                            {mrn && <div className="text-xs text-gray-400">MRN {mrn}</div>}
                          </td>
                          <td className="td">
                            <div className="text-sm">{ward}</div>
                            <div className="text-xs text-gray-400">Bed {bed}</div>
                          </td>
                          <td className="td hidden sm:table-cell">
                            <span className="text-xs text-gray-600 line-clamp-2 max-w-xs">{diag}</span>
                          </td>
                          <td className="td">
                            {ago ? (
                              <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                                overdue ? 'text-red-600' : 'text-green-700'
                              }`}>
                                <Clock size={11} />{ago}
                                {overdue && <span className="ml-1 badge-red btn-xs">Due</span>}
                              </span>
                            ) : (
                              <span className="badge-red text-xs">Never charted</span>
                            )}
                          </td>
                          <td className="td text-gray-300">
                            <ChevronRight size={14} />
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
