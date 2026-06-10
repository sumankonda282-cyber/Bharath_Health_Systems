import { useEffect, useState } from 'react'
import {
  Home, AlertTriangle, CheckCircle2, ArrowLeftRight,
  Users, Heart, Activity, FileText, Pill,
  Loader2, User,
} from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { useWardSession } from '../contexts/WardSessionContext'

function timeAgo(dateStr) {
  if (!dateStr) return null
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000 / 60
  if (diff < 60) return `${Math.round(diff)}m ago`
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`
  return `${Math.round(diff / 1440)}d ago`
}

function daysSince(dateStr) {
  if (!dateStr) return null
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000 / 86400)
  return `Day ${days + 1}`
}

function StatCard({ icon: Icon, value, label, sub, color, bgColor, to }) {
  const inner = (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ width: 48, height: 48, background: bgColor }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <div className="font-black leading-none" style={{ fontSize: 30, letterSpacing: -1, color }}>{value}</div>
        <div className="text-sm font-semibold text-gray-700 mt-1">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
  return to ? <Link to={to} className="block">{inner}</Link> : inner
}

function QuickAction({ icon: Icon, title, sub, to, color, bgColor }) {
  return (
    <Link to={to}
      className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 hover:border-emerald-200 hover:bg-emerald-50 transition-all">
      <div className="rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ width: 36, height: 36, background: bgColor }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <div className="text-sm font-bold text-gray-900">{title}</div>
        <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { mode, department, ward } = useWardSession()
  const navigate = useNavigate()
  const [admissions, setAdmissions] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  useEffect(() => {
    setLoading(true)
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
  const shiftRange = h >= 6 && h < 14 ? '6am–2pm'  : h >= 14 && h < 22 ? '2pm–10pm'  : '10pm–6am'
  const greeting   = h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 17 ? 'Good afternoon' : 'Good evening'
  const firstName  = user?.full_name?.split(' ')[0] || 'there'
  const dateStr    = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const deptLabel  = department?.name || 'Ward'
  const wardLabel  = ward?.name || 'All Wards'

  return (
    <div>
      {/* Greeting */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: '#0f172a', letterSpacing: -0.3 }}>
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">{shiftName} Shift · {shiftRange} · {dateStr}</p>
        </div>
        <div className="flex items-center gap-2 bg-white border-2 border-yellow-200 rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap flex-shrink-0"
          style={{ color: '#92400e' }}>
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          {shiftName} Shift Active
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle size={15} className="flex-shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 size={30} className="animate-spin" style={{ color: '#065F46' }} />
          <span className="text-sm text-gray-400">Loading ward data…</span>
        </div>
      ) : (
        <>
          {/* Stat Cards — dynamic based on mode */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
            {mode === 'nurse' ? (
              <>
                <StatCard icon={Users}           value={admissions.length} label="My Patients"    sub="Assigned to you"          color="#065f46" bgColor="#ecfdf5" to="/ward-board" />
                <StatCard icon={Pill}            value={4}                 label="MAR Due"         sub="Medications pending"      color="#d97706" bgColor="#fffbeb" to="/mar" />
                <StatCard icon={Activity}        value={vitalsDue}         label="Vitals Overdue" sub="Needs immediate charting" color="#dc2626" bgColor="#fef2f2" to="/vitals" />
                <StatCard icon={FileText}        value={2}                 label="Pending Notes"  sub="Nursing notes due"        color="#7c3aed" bgColor="#f5f3ff" to="/notes" />
              </>
            ) : (
              <>
                <StatCard icon={Home}            value={admissions.length} label="Active Admissions" sub={`${deptLabel} · ${wardLabel}`} color="#065f46" bgColor="#ecfdf5" to="/ward-board" />
                <StatCard icon={AlertTriangle}   value={vitalsDue}         label="Vitals Overdue"    sub="> 4h since last charting"  color={vitalsDue > 0 ? '#dc2626' : '#16a34a'} bgColor={vitalsDue > 0 ? '#fef2f2' : '#f0fdf4'} to="/vitals" />
                <StatCard icon={CheckCircle2}    value={vitalsOk}          label="Vitals On Time"    sub="Charted within 4h"         color="#16a34a" bgColor="#f0fdf4" to="/vitals" />
                <StatCard icon={ArrowLeftRight}  value={shiftName}         label="Shift Handoff"     sub={`Notes & summary for ${shiftRange}`} color="#2563eb" bgColor="#eff6ff" to="/handoff" />
              </>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mb-7">
            <div className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-3">Quick Actions</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <QuickAction icon={Activity}      title="Chart Vitals"   sub="Record patient vitals"   to="/vitals"  color="#065f46" bgColor="#ecfdf5" />
              <QuickAction icon={FileText}      title="Nursing Notes"  sub="Write shift notes"       to="/notes"   color="#2563eb" bgColor="#eff6ff" />
              <QuickAction icon={Pill}          title="MAR"            sub="Medication admin record" to="/mar"     color="#d97706" bgColor="#fffbeb" />
              <QuickAction icon={ArrowLeftRight} title="Shift Handoff" sub="End of shift summary"    to="/handoff" color="#7c3aed" bgColor="#f5f3ff" />
            </div>
          </div>

          {/* Patient Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
              <span className="font-bold text-gray-900 text-sm">Ward Patients</span>
              <span className="text-xs text-gray-400">{deptLabel} · {wardLabel} · {admissions.length} active</span>
            </div>

            {admissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <User size={32} className="mb-2 opacity-25" />
                <p className="text-sm text-gray-500">No active admissions</p>
                <p className="text-xs text-gray-400 mt-1">Admissions will appear here once assigned</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Patient', 'IP No.', 'Bed', 'Diagnosis', 'Vitals', 'LOS'].map(col => (
                        <th key={col}
                          className="text-left px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide border-b border-gray-100 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {admissions.map(a => {
                      const name    = a.patient?.full_name || a.patient_name || 'Unknown'
                      const ipNo    = a.admission_number || `#${a.id}`
                      const wrd     = a.ward?.name || a.ward_name || '—'
                      const bed     = a.bed?.bed_number || a.bed_number || '—'
                      const diag    = a.diagnosis || a.primary_diagnosis || '—'
                      const ago     = timeAgo(a.last_vital_at)
                      const los     = daysSince(a.admission_date || a.admitted_at || a.created_at)
                      const overdue = !a.last_vital_at ||
                        (Date.now() - new Date(a.last_vital_at).getTime()) / 1000 / 3600 > 4

                      return (
                        <tr key={a.id}
                          className="hover:bg-emerald-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                          onClick={() => navigate(`/patient/${a.id}`)}>
                          <td className="px-4 py-3 text-sm font-bold text-gray-900">{name}</td>
                          <td className="px-4 py-3"><span className="text-xs font-mono text-gray-400">{ipNo}</span></td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{wrd} / {bed}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{diag}</td>
                          <td className="px-4 py-3">
                            {ago ? (
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold ${overdue ? 'text-amber-600' : 'text-green-600'}`}>
                                {overdue
                                  ? <AlertTriangle size={11} />
                                  : <CheckCircle2 size={11} />}
                                {ago}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500">
                                <AlertTriangle size={11} /> Never charted
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{los || '—'}</td>
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
