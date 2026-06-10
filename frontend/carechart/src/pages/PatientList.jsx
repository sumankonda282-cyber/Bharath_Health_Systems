import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Loader2, AlertTriangle, User, Filter } from 'lucide-react'
import api from '../api/client'

const FLAGS = ['All', 'Vitals Overdue', 'High Acuity', 'Long Stay']

function Flag({ color, label }) {
  const colors = {
    red:    'bg-red-100 text-red-700',
    orange: 'bg-orange-100 text-orange-700',
    purple: 'bg-purple-100 text-purple-700',
    blue:   'bg-blue-100 text-blue-700',
  }
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-semibold ${colors[color] || 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  )
}

function daysSince(dateStr) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

export default function PatientList() {
  const navigate = useNavigate()
  const [admissions, setAdmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [activeFlag, setActiveFlag] = useState('All')

  useEffect(() => {
    api.get('/inpatient/admissions', { params: { status: 'active' } })
      .then(data => setAdmissions(Array.isArray(data) ? data : (data.items || data.results || [])))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = admissions.filter(a => {
    const name = (a.patient?.full_name || a.patient_name || '').toLowerCase()
    const mrn  = String(a.patient?.mrn || a.patient?.id || '')
    const bed  = String(a.bed?.bed_number || a.bed_number || '')
    const diag = (a.primary_diagnosis || '').toLowerCase()
    const matchSearch = !search ||
      name.includes(search.toLowerCase()) ||
      mrn.includes(search) ||
      bed.includes(search) ||
      diag.includes(search.toLowerCase())

    const vitalsOverdue = !a.last_vital_at || (Date.now() - new Date(a.last_vital_at).getTime()) / 36e5 > 4
    const days = daysSince(a.admitted_at || a.admission_date)
    const longStay = days != null && days > 7

    if (activeFlag === 'Vitals Overdue' && !vitalsOverdue) return false
    if (activeFlag === 'High Acuity' && a.acuity !== 'high') return false
    if (activeFlag === 'Long Stay' && !longStay) return false

    return matchSearch
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Patients</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {admissions.length} active admission{admissions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex-1" />
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Name, MRN, bed, diagnosis…"
            className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white w-64"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter size={13} className="text-gray-400 flex-shrink-0" />
        {FLAGS.map(f => (
          <button
            key={f}
            onClick={() => setActiveFlag(f)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              activeFlag === f
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400 hover:text-emerald-700'
            }`}>
            {f}
          </button>
        ))}
        {filtered.length !== admissions.length && (
          <span className="text-xs text-gray-400 ml-1">Showing {filtered.length} of {admissions.length}</span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-emerald-600" size={28} />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle size={16} className="flex-shrink-0" /> {error}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(6,95,70,0.05)' }}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <User size={32} className="mb-2 opacity-25" />
              <p className="text-sm">No patients match your search or filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80">
                    {['Bed', 'Patient', 'Age / Sex', 'Blood Gp', 'Diagnosis', 'Days', 'Flags'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(a => {
                    const p    = a.patient || {}
                    const name = p.full_name || a.patient_name || 'Unknown'
                    const dob  = p.date_of_birth
                    const age  = p.age ?? (dob ? Math.floor((Date.now() - new Date(dob)) / 31557600000) : null)
                    const sex  = (p.gender || '').slice(0, 1).toUpperCase()
                    const bed  = a.bed?.bed_number || a.bed_number || '—'
                    const diag = a.primary_diagnosis || a.diagnosis || '—'
                    const bg   = p.blood_group || '—'
                    const days = daysSince(a.admitted_at || a.admission_date)
                    const vitalsOverdue = !a.last_vital_at || (Date.now() - new Date(a.last_vital_at).getTime()) / 36e5 > 4
                    const hasAllergy = p.allergies?.length > 0 || a.has_allergy

                    return (
                      <tr
                        key={a.id}
                        className="hover:bg-emerald-50/30 cursor-pointer transition-colors group"
                        onClick={() => navigate(`/patient/${a.id}`)}>
                        <td className="px-4 py-3 text-sm font-mono font-bold text-gray-700">{bed}</td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">{name}</div>
                          <div className="text-xs text-gray-400">MRN: {p.mrn || p.id || a.id}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {age != null ? `${age} yrs` : '—'}{sex ? ` / ${sex}` : ''}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            bg === '—' ? 'text-gray-400' : 'bg-red-50 text-red-700'
                          }`}>{bg}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px]">
                          <span className="block truncate" title={diag}>{diag}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {days != null ? (
                            <span className={days > 7 ? 'text-amber-600 font-semibold' : ''}>{days}d</span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {vitalsOverdue && <Flag color="red" label="Vitals Due" />}
                            {a.acuity === 'high' && <Flag color="orange" label="High Acuity" />}
                            {hasAllergy && <Flag color="purple" label="⚠ Allergy" />}
                            {days != null && days > 7 && <Flag color="blue" label="Long Stay" />}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
