import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { patientsApi } from '../../api'
import { PageLoader } from '../../components/ui/Spinner'
import { Search, Plus, User } from 'lucide-react'

function AgeBadge({ dob }) {
  if (!dob) return <span className="text-gray-300">—</span>
  const age = Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 60 * 60 * 1000))
  return <span>{age > 0 ? `${age} yrs` : '< 1 yr'}</span>
}

function BloodGroup({ value }) {
  if (!value) return <span className="text-gray-300">—</span>
  return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">{value}</span>
}

function TagChips({ tags }) {
  if (!tags?.length) return <span className="text-gray-300 text-xs">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(t => (
        <span key={t.id} className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
          {t.tag_name}
        </span>
      ))}
    </div>
  )
}

export default function PatientList() {
  const [patients, setPatients] = useState([])
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true)
      patientsApi.list({ search, limit: 50 })
        .then(r => setPatients(Array.isArray(r) ? r : []))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Patients</h1>
        <Link to="/patients/new" className="btn-primary">
          <Plus size={16} />Register Patient
        </Link>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search by name or clinic ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? <PageLoader /> : patients.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <User size={36} className="mx-auto mb-2 opacity-30" />
            <p>No patients found</p>
            <Link to="/patients/new" className="btn-primary mt-4 inline-flex">Register first patient</Link>
          </div>
        ) : (
          <div className="table-wrapper rounded-none border-0">
            <table className="table">
              <thead>
                <tr>
                  <th className="th">Clinic ID</th>
                  <th className="th">Name</th>
                  <th className="th">Age</th>
                  <th className="th">Gender</th>
                  <th className="th">Blood Group</th>
                  <th className="th">Conditions</th>
                  <th className="th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map(p => (
                  <tr key={p.id} className="tr-hover cursor-pointer align-middle"
                    onClick={() => navigate(`/patients/${p.id}`)}>
                    <td className="td font-mono text-xs text-gray-500 whitespace-nowrap">
                      {p.clinic_patient_id}
                    </td>
                    <td className="td">
                      <div className="font-medium text-gray-900">{p.full_name}</div>
                    </td>
                    <td className="td whitespace-nowrap text-sm text-gray-600">
                      <AgeBadge dob={p.date_of_birth} />
                    </td>
                    <td className="td text-sm text-gray-600 capitalize whitespace-nowrap">
                      {p.gender || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="td whitespace-nowrap">
                      <BloodGroup value={p.blood_group} />
                    </td>
                    <td className="td">
                      <TagChips tags={p.tags} />
                    </td>
                    <td className="td whitespace-nowrap">
                      <Link
                        to={`/patients/${p.id}`}
                        onClick={e => e.stopPropagation()}
                        className="text-blue-600 text-xs hover:underline"
                      >
                        View →
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
