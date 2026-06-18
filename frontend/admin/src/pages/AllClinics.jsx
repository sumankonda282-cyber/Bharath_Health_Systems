import { useState, useEffect } from 'react'
import { adminApi } from '../api'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, X } from 'lucide-react'

const STATUS_TABS = ['all', 'active', 'pending', 'suspended', 'revoked']
const PLAN_COLORS = {
  free:       'bg-gray-700/50 text-gray-400',
  basic:      'bg-blue-900/50 text-blue-300',
  pro:        'bg-indigo-900/50 text-indigo-300',
  enterprise: 'bg-purple-900/50 text-purple-300',
}
const STATUS_BADGE = {
  active:    'bg-emerald-900/50 text-emerald-300',
  pending:   'bg-yellow-900/50 text-yellow-300',
  suspended: 'bg-orange-900/50 text-orange-300',
  revoked:   'bg-red-900/50 text-red-300',
}

const STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa',
  'Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan',
  'Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
]

const ORG_TYPES = ['hospital', 'clinic', 'lab', 'pharmacy', 'diagnostic']

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function AllClinics() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState(searchParams.get('status') || 'all')
  const [search, setSearch]   = useState('')
  const [state, setState]     = useState('')
  const [orgType, setOrgType] = useState('')

  const load = () => {
    setLoading(true)
    const params = {}
    if (tab !== 'all') params.status = tab
    if (search)  params.search   = search
    if (state)   params.state    = state
    if (orgType) params.org_type = orgType
    adminApi.getClinics(params)
      .then(d => setClinics(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [tab, state, orgType])

  const filtered = clinics.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.city?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status tabs */}
        <div className="flex gap-0.5 bg-gray-900 border border-gray-800 p-0.5 rounded-lg">
          {STATUS_TABS.map(s => (
            <button key={s} onClick={() => setTab(s)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                tab === s ? 'bg-[#F5821E] text-white' : 'text-gray-400 hover:text-white'
              }`}>
              {s}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input className="bg-gray-900 border border-gray-800 text-white text-xs rounded-lg pl-8 pr-2 py-1.5 w-44 outline-none focus:border-gray-600 placeholder-gray-600"
            placeholder="Search name / city…"
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()} />
          {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X size={12} /></button>}
        </div>

        {/* State */}
        <select value={state} onChange={e => setState(e.target.value)}
          className="bg-gray-900 border border-gray-800 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-gray-600">
          <option value="">All States</option>
          {STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Type */}
        <select value={orgType} onChange={e => setOrgType(e.target.value)}
          className="bg-gray-900 border border-gray-800 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-gray-600">
          <option value="">All Types</option>
          {ORG_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
        </select>

        <span className="text-xs text-gray-600 ml-auto">{filtered.length} found</span>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-14">
            <div className="w-6 h-6 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#F5821E', borderTopColor: 'transparent' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">No clinics found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-2.5 text-left">Name</th>
                  <th className="px-3 py-2.5 text-left">State</th>
                  <th className="px-3 py-2.5 text-left">City</th>
                  <th className="px-3 py-2.5 text-left">Type</th>
                  <th className="px-3 py-2.5 text-left">Status</th>
                  <th className="px-3 py-2.5 text-left">Plan</th>
                  <th className="px-3 py-2.5 text-center">Doctors</th>
                  <th className="px-3 py-2.5 text-right">Monthly Bill</th>
                  <th className="px-3 py-2.5 text-left">Since</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/clinics/${c.id}`)}
                    className="hover:bg-gray-800/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-white text-sm">{c.name}</div>
                      {c.specialty && <div className="text-xs text-gray-500">{c.specialty}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-gray-400 text-xs">{c.state || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-400 text-xs">{c.city || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-400 text-xs capitalize">{c.org_type || c.type || '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[c.status] || 'bg-gray-700 text-gray-400'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[c.plan] || PLAN_COLORS.free}`}>
                        {c.plan || 'free'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-white font-semibold text-sm">{c.doctor_count ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-400 font-semibold text-sm">
                      {c.monthly_bill > 0 ? `₹${c.monthly_bill.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{fmtDate(c.created_at)}</td>
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
