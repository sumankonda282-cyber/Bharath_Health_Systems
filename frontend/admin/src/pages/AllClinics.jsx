import { useState, useEffect, useMemo } from 'react'
import { adminApi } from '../api'
import { useSearchParams } from 'react-router-dom'
import { Search, X, Calendar, ChevronRight, Building2, Loader2, AlertCircle } from 'lucide-react'

const STATUS_TABS = ['all', 'active', 'pending', 'suspended', 'revoked']

const PLAN_BADGE = {
  free:       'surface-3 text-dim',
  basic:      'bg-blue-900/40 text-blue-300',
  pro:        'bg-indigo-900/40 text-indigo-300',
  enterprise: 'bg-purple-900/40 text-purple-300',
}

const STATUS_BADGE = {
  active:    'bg-emerald-900/40 text-emerald-300',
  pending:   'bg-yellow-900/40 text-yellow-300',
  suspended: 'bg-orange-900/40 text-orange-300',
  revoked:   'bg-red-900/40 text-red-400',
}

function fmtDate(dt) {
  if (!dt) return '—'
  try { return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '—' }
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────────────────────────
function ClinicDetailDrawer({ clinic, onClose }) {
  if (!clinic) return null

  const plan   = clinic.subscription_plan || clinic.plan || 'free'
  const status = clinic.status || 'pending'
  const mrr    = clinic.monthly_bill || (clinic.doctor_count && clinic.price_per_doctor ? clinic.doctor_count * clinic.price_per_doctor : null)

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 transition-opacity" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[70vw] max-w-3xl surface border-l border-app z-50 overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 surface border-b border-app px-6 py-4 flex items-start justify-between gap-4 z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-app truncate">{clinic.name}</h2>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_BADGE[status] || 'surface-3 text-dim'}`}>
                {status}
              </span>
            </div>
            <p className="text-xs text-faint">{[clinic.city, clinic.state].filter(Boolean).join(', ') || '—'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-dim hover:text-app hover-app transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-5 space-y-5">
          {/* Key stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Plan',     value: <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${PLAN_BADGE[plan] || PLAN_BADGE.free}`}>{plan}</span> },
              { label: 'Doctors',  value: <span className="text-app font-bold text-lg">{clinic.doctor_count ?? '—'}</span> },
              { label: 'Est. MRR', value: <span className="text-emerald-400 font-bold text-lg">{mrr ? `₹${mrr.toLocaleString('en-IN')}` : '—'}</span> },
            ].map(s => (
              <div key={s.label} className="surface-2 border border-app rounded-xl p-3">
                <p className="text-xs text-faint mb-1">{s.label}</p>
                <div>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Details */}
          <div className="surface-2 border border-app rounded-xl divide-y divide-[color:var(--border)]">
            {[
              { label: 'Specialty',    value: clinic.specialty || '—' },
              { label: 'City',         value: clinic.city || '—' },
              { label: 'State',        value: clinic.state || '—' },
              { label: 'Email',        value: clinic.email || '—' },
              { label: 'Phone',        value: clinic.phone || '—' },
              { label: 'Registered',   value: fmtDate(clinic.created_at) },
              { label: 'Sub. Expiry',  value: fmtDate(clinic.subscription_expiry || clinic.expiry) },
              { label: 'BHID',         value: clinic.bhid || '—' },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-faint">{r.label}</span>
                <span className="text-sm text-app font-medium">{r.value}</span>
              </div>
            ))}
          </div>

          {/* Description / notes */}
          {clinic.description && (
            <div className="surface-2 border border-app rounded-xl p-4">
              <p className="text-xs text-faint mb-1.5">Notes</p>
              <p className="text-sm text-dim leading-relaxed">{clinic.description}</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────────────────────
export default function AllClinics() {
  const [searchParams] = useSearchParams()
  const [clinics, setClinics]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [tab, setTab]               = useState(searchParams.get('status') || 'all')
  const [search, setSearch]         = useState('')
  const [filterState, setFilterState]       = useState('')
  const [filterSpecialty, setFilterSpecialty] = useState('')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')
  const [selectedClinic, setSelectedClinic] = useState(null)

  useEffect(() => {
    setLoading(true); setError('')
    const params = {}
    if (tab !== 'all') params.status = tab
    adminApi.getClinics(params)
      .then(d => setClinics(Array.isArray(d) ? d : []))
      .catch(e => setError(e.message || 'Failed to load clinics'))
      .finally(() => setLoading(false))
  }, [tab])

  const counts = useMemo(() => {
    const map = { all: clinics.length }
    STATUS_TABS.slice(1).forEach(s => { map[s] = clinics.filter(c => c.status === s).length })
    return map
  }, [clinics])

  const uniqueStates     = useMemo(() => [...new Set(clinics.map(c => c.state).filter(Boolean))].sort(), [clinics])
  const uniqueSpecialties = useMemo(() => [...new Set(clinics.map(c => c.specialty).filter(Boolean))].sort(), [clinics])

  const filtered = useMemo(() => clinics.filter(c => {
    const q = search.toLowerCase()
    if (q && !c.name?.toLowerCase().includes(q) && !c.city?.toLowerCase().includes(q) && !c.specialty?.toLowerCase().includes(q)) return false
    if (filterState     && c.state     !== filterState)     return false
    if (filterSpecialty && c.specialty !== filterSpecialty) return false
    if (dateFrom && c.created_at && c.created_at < dateFrom) return false
    if (dateTo   && c.created_at && c.created_at > dateTo + 'T23:59:59') return false
    return true
  }), [clinics, search, filterState, filterSpecialty, dateFrom, dateTo])

  const hasFilters = search || filterState || filterSpecialty || dateFrom || dateTo

  function clearFilters() {
    setSearch(''); setFilterState(''); setFilterSpecialty(''); setDateFrom(''); setDateTo('')
  }

  return (
    <div className="space-y-2.5">
      <ClinicDetailDrawer clinic={selectedClinic} onClose={() => setSelectedClinic(null)} />

      {/* Status tabs + search */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-base font-bold text-app">All Health Centers</h1>
        <div className="flex gap-0.5 surface border border-app p-0.5 rounded-lg overflow-x-auto">
          {STATUS_TABS.map(s => (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium capitalize whitespace-nowrap transition-all ${
                tab === s ? 'bg-[#F5821E] text-app' : 'text-dim hover:text-app'
              }`}
            >
              {s}
              {!loading && counts[s] !== undefined && (
                <span className={`text-[10px] ${tab === s ? 'opacity-70' : 'text-faint'}`}>
                  {counts[s]}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search health centers…"
            className="surface border border-app text-app text-xs rounded-lg pl-7 pr-7 py-1.5 outline-none focus:border-[#F5821E] w-44 placeholder-gray-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-app">
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Extra filters row */}
      <div className="flex flex-wrap items-center gap-2">
        {uniqueStates.length > 0 && (
          <select value={filterState} onChange={e => setFilterState(e.target.value)}
            className="surface border border-app text-app text-xs rounded-lg px-3 py-1.5 outline-none focus:border-[#F5821E]">
            <option value="">All States</option>
            {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {uniqueSpecialties.length > 0 && (
          <select value={filterSpecialty} onChange={e => setFilterSpecialty(e.target.value)}
            className="surface border border-app text-app text-xs rounded-lg px-3 py-1.5 outline-none focus:border-[#F5821E]">
            <option value="">All Specialties</option>
            {uniqueSpecialties.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        <div className="flex items-center gap-1.5 surface border border-app rounded-lg px-2.5 py-1.5">
          <Calendar size={11} className="text-faint" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-transparent text-xs text-app outline-none w-28" />
          <span className="text-faint text-xs">–</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-transparent text-xs text-app outline-none w-28" />
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-dim hover:text-app underline">Clear</button>
        )}
        <span className="text-xs text-faint ml-auto">{filtered.length} results</span>
      </div>

      {/* Table */}
      <div className="surface border border-app rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-faint" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center gap-3 py-16 text-red-400">
            <AlertCircle size={18} /><span className="text-sm">{error}</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-faint">
            <Building2 size={32} className="mb-3 opacity-30" />
            <p className="text-sm">{clinics.length === 0 ? 'No health centers found' : 'No health centers match your filters'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-app text-[10px] uppercase tracking-wider text-faint">
                  <th className="px-4 py-3 text-left">Health Center</th>
                  <th className="px-3 py-3 text-left">City / State</th>
                  <th className="px-3 py-3 text-left">Specialty</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-3 py-3 text-left">Plan</th>
                  <th className="px-3 py-3 text-center">Doctors</th>
                  <th className="px-3 py-3 text-right">Monthly Bill</th>
                  <th className="px-3 py-3 text-left">Joined</th>
                  <th className="px-3 py-3 text-right w-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {filtered.map(c => (
                  <tr
                    key={c.id}
                    className="hover-app transition-colors cursor-pointer"
                    onClick={() => setSelectedClinic(c)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-app">{c.name}</div>
                    </td>
                    <td className="px-3 py-3 text-dim text-xs">
                      {[c.city, c.state].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-3 py-3 text-dim text-xs">{c.specialty || '—'}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_BADGE[c.status] || 'surface-3 text-dim'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${PLAN_BADGE[c.plan || 'free'] || PLAN_BADGE.free}`}>
                        {c.plan || 'free'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-app font-semibold">{c.doctor_count ?? '—'}</td>
                    <td className="px-3 py-3 text-right text-emerald-400 font-semibold text-xs">
                      {c.monthly_bill > 0 ? `₹${c.monthly_bill.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-3 py-3 text-faint text-xs">
                      {fmtDate(c.created_at)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <ChevronRight size={14} className="text-faint" />
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
