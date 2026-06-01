import { useState, useEffect } from 'react'
import { adminApi } from '../api'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, ExternalLink, RefreshCw } from 'lucide-react'

const STATUS_TABS = ['all', 'active', 'pending', 'suspended', 'revoked']
const PLAN_COLORS = { free: 'badge-free', basic: 'badge-basic', pro: 'badge-pro', enterprise: 'badge-enterprise' }
const STATUS_BADGE = { active: 'badge-active', pending: 'badge-pending', suspended: 'badge-suspended', revoked: 'badge-revoked' }

export default function AllClinics() {
  const [searchParams] = useSearchParams()
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState(searchParams.get('status') || 'all')
  const [search, setSearch]   = useState('')

  const load = () => {
    setLoading(true)
    const params = {}
    if (tab !== 'all') params.status = tab
    if (search) params.search = search
    adminApi.getClinics(params).then(d => setClinics(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [tab])

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="page-title">All Clinics</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input className="input pl-8 w-48 text-sm py-1.5" placeholder="Search…"
              value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load()} />
          </div>
          <button onClick={load} className="btn-secondary py-1.5"><RefreshCw size={14} /></button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 p-1 rounded-xl mb-4 overflow-x-auto">
        {STATUS_TABS.map(s => (
          <button key={s} onClick={() => setTab(s)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-all ${tab === s ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-7 h-7 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : clinics.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No clinics found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr>
                <th className="th">Clinic</th><th className="th">City</th><th className="th">Status</th>
                <th className="th">Plan</th><th className="th">Doctors</th><th className="th">Monthly Bill</th><th className="th">Joined</th><th className="th"></th>
              </tr></thead>
              <tbody className="divide-y divide-gray-800">
                {clinics.map(c => (
                  <tr key={c.id} className="tr-hover">
                    <td className="td">
                      <div className="font-semibold text-white">{c.name}</div>
                      <div className="text-xs text-gray-500">{c.specialty}</div>
                    </td>
                    <td className="td text-gray-400 text-sm">{c.city}</td>
                    <td className="td">
                      <span className={`badge ${STATUS_BADGE[c.status] || 'badge-pending'}`}>{c.status}</span>
                    </td>
                    <td className="td">
                      <span className={`badge ${PLAN_COLORS[c.plan] || 'badge-free'}`}>{c.plan}</span>
                    </td>
                    <td className="td text-center text-white font-semibold">{c.doctor_count}</td>
                    <td className="td text-emerald-400 font-semibold">
                      {c.monthly_bill > 0 ? `₹${c.monthly_bill.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="td text-gray-500 text-xs">{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="td">
                      <Link to={`/clinics/${c.id}`} className="text-indigo-400 hover:text-indigo-300">
                        <ExternalLink size={15} />
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
