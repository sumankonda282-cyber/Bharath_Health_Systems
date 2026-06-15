import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Loader2, Search, ChevronRight, AlertTriangle, Clock } from 'lucide-react'
import api from '../api/client'
import { useWardSession } from '../contexts/WardSessionContext'

function hoursAgo(dateStr) {
  if (!dateStr) return Infinity
  return (Date.now() - new Date(dateStr).getTime()) / 1000 / 3600
}

function getFlags(adm) {
  const flags = []
  if (hoursAgo(adm.last_vital_at) > 4) flags.push({ label: 'Vitals overdue', color: 'badge-red' })
  if (adm.status === 'pending_discharge') flags.push({ label: 'Pending discharge', color: 'badge-yellow' })
  if (adm.is_high_risk || adm.fall_risk === 'high') flags.push({ label: 'High fall risk', color: 'badge-orange' })
  if (!flags.length) flags.push({ label: 'Stable', color: 'badge-green' })
  return flags
}

const FILTERS = ['All', 'Critical', 'Post-op', 'Diabetic', 'High Fall Risk', 'Vitals Overdue']

export default function PatientList() {
  const navigate = useNavigate()
  const { ward, department } = useWardSession()
  const [admissions, setAdmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    api.get('/inpatient/admissions?status=active')
      .then(d => setAdmissions(Array.isArray(d) ? d : (d.items || d.results || [])))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = admissions.filter(adm => {
    const name = (adm.patient?.full_name || adm.patient_name || '').toLowerCase()
    const diag = (adm.diagnosis || adm.primary_diagnosis || '').toLowerCase()
    const bed  = String(adm.bed?.bed_number || adm.bed_number || '')
    const q = search.toLowerCase()
    const matchSearch = !q || name.includes(q) || diag.includes(q) || bed.includes(q)

    let matchFilter = true
    if (filter === 'Critical') matchFilter = (adm.acuity || '').toLowerCase() === 'critical'
    if (filter === 'Post-op')  matchFilter = diag.includes('post') || diag.includes('op')
    if (filter === 'Diabetic') matchFilter = diag.includes('diab') || diag.includes('dm')
    if (filter === 'High Fall Risk') matchFilter = adm.fall_risk === 'high' || adm.is_high_risk
    if (filter === 'Vitals Overdue') matchFilter = hoursAgo(adm.last_vital_at) > 4

    return matchSearch && matchFilter
  })

  const wardLabel = ward?.name || department?.name || 'Ward'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Patients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{wardLabel} · {filtered.length} active</p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-8" placeholder="Search by name, bed, diagnosis…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={filter === f ? { background: '#065F46' } : {}}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state py-20">
          <Users size={40} className="empty-state-icon" />
          <span className="empty-state-text">No patients found</span>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th className="th">Bed</th>
                <th className="th">Name</th>
                <th className="th">Age</th>
                <th className="th">Gender</th>
                <th className="th">Blood</th>
                <th className="th">Diagnosis</th>
                <th className="th">Flags</th>
                <th className="th">Last Vitals</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(adm => {
                const pt = adm.patient || {}
                const name  = pt.full_name || adm.patient_name || '—'
                const age   = pt.age || adm.patient_age || '—'
                const gender= (pt.gender || '—').charAt(0).toUpperCase()
                const blood = pt.blood_group || '—'
                const bed   = adm.bed?.bed_number || adm.bed_number || '—'
                const diag  = adm.diagnosis || adm.primary_diagnosis || '—'
                const flags = getFlags(adm)
                const vHrs  = hoursAgo(adm.last_vital_at)

                return (
                  <tr key={adm.id}
                    className="tr-hover cursor-pointer"
                    onClick={() => navigate(`/chart/${adm.id}`)}
                  >
                    <td className="td font-mono font-semibold" style={{ color: '#065F46' }}>{bed}</td>
                    <td className="td">
                      <div className="font-medium text-gray-800">{name}</div>
                      <div className="text-xs text-gray-400">{adm.admission_number}</div>
                    </td>
                    <td className="td text-gray-600">{age}</td>
                    <td className="td text-gray-600">{gender}</td>
                    <td className="td text-gray-600">{blood}</td>
                    <td className="td text-gray-700 max-w-[160px] truncate" title={diag}>{diag}</td>
                    <td className="td">
                      <div className="flex flex-wrap gap-1">
                        {flags.map((fl, i) => (
                          <span key={i} className={fl.color}>{fl.label}</span>
                        ))}
                      </div>
                    </td>
                    <td className="td text-xs">
                      {adm.last_vital_at
                        ? <span className={vHrs > 4 ? 'text-red-600 font-medium flex items-center gap-1' : 'text-gray-500'}>
                            {vHrs > 4 && <AlertTriangle size={11} />}
                            {vHrs < 1 ? `${Math.round(vHrs * 60)}m ago` : `${vHrs.toFixed(1)}h ago`}
                          </span>
                        : <span className="text-red-500 font-medium flex items-center gap-1">
                            <Clock size={11} /> Never
                          </span>
                      }
                    </td>
                    <td className="td">
                      <button className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
                        style={{ color: '#065F46' }}>
                        Chart <ChevronRight size={12} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
