import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Search, X, ChevronLeft, ChevronRight, User, Loader2, AlertTriangle,
  Users, Building2, FlaskConical, Pill, FileText, IndianRupee,
} from 'lucide-react'
import { adminApi } from '../api'

const PAGE_SIZE = 50
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
const GENDERS = ['Male', 'Female', 'Other']

const EMPTY_FILTERS = {
  q: '',
  clinic_id: '',
  state: '',
  gender: '',
  age_from: '',
  age_to: '',
  reg_date_from: '',
  reg_date_to: '',
  has_portal_account: '',
  blood_group: '',
}

const DRAWER_TABS = ['Demographics', 'Health Centers', 'Timeline', 'Clinical', 'Financial']

function fmtDate(d) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function money(n) {
  const v = Number(n || 0)
  return '₹' + v.toLocaleString('en-IN')
}

function PortalBadge({ value }) {
  return value
    ? <span className="badge-xs bg-green-500/15 text-green-400 border border-green-500/30">Yes</span>
    : <span className="badge-xs bg-gray-700/40 text-gray-400 border border-gray-700">No</span>
}

function StatusBadge({ status }) {
  return <span className="badge-xs bg-[#F5821E]/15 text-[#F5821E] border border-[#F5821E]/30">{status || '—'}</span>
}

function KV({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-white break-words">{value || '—'}</span>
    </div>
  )
}

function KpiChip({ icon: Icon, label, value, accent }) {
  return (
    <div className="kpi-card flex flex-col gap-1 p-3 rounded-lg bg-[#0a0f1e] border border-gray-800/60">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 uppercase tracking-wide">
        <Icon size={13} className="text-gray-500" />
        {label}
      </div>
      <span className={`text-base font-semibold ${accent || 'text-white'}`}>{value}</span>
    </div>
  )
}

function PatientDrawer({ patientId, onClose }) {
  const [tab, setTab] = useState('Demographics')
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setTab('Demographics')
    setDetail(null)
    setError(null)
    setLoading(true)
    adminApi.getPatientDetail(patientId)
      .then((d) => { if (active) setDetail(d) })
      .catch(() => { if (active) setError('Failed to load patient details.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [patientId])

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-30" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[480px] bg-[#0f172a] border-l border-gray-800/60 z-40 flex flex-col shadow-2xl transition-transform">
        <div className="flex items-start justify-between p-4 border-b border-gray-800/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#F5821E]/15 flex items-center justify-center shrink-0">
              <User size={18} className="text-[#F5821E]" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">{detail?.full_name || 'Patient'}</div>
              <div className="text-[11px] text-gray-500">{detail?.bh_id || '—'}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 px-4 py-2.5 border-b border-gray-800/60">
          {DRAWER_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-2.5 py-1 rounded-full text-[12px] border transition-colors ${
                tab === t
                  ? 'bg-[#F5821E]/15 text-[#F5821E] border-[#F5821E]/40'
                  : 'bg-transparent text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="text-[#F5821E] animate-spin" />
            </div>
          )}

          {!loading && error && (
            <div className="card-sm flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          {!loading && !error && detail && (
            <>
              {tab === 'Demographics' && (
                <div className="grid grid-cols-2 gap-4">
                  <KV label="Mobile" value={detail.mobile} />
                  <KV label="Email" value={detail.email} />
                  <KV label="Gender" value={detail.gender} />
                  <KV label="Age" value={detail.age != null ? String(detail.age) : ''} />
                  <KV label="Date of Birth" value={fmtDate(detail.date_of_birth)} />
                  <KV label="Blood Group" value={detail.blood_group} />
                  <KV label="ABHA" value={detail.abha_id} />
                  <KV label="UHID" value={detail.uhid} />
                  <div className="col-span-2"><KV label="Address" value={detail.address} /></div>
                  <KV label="City" value={detail.city} />
                  <KV label="State" value={detail.state} />
                  <KV label="Pincode" value={detail.pincode} />
                  <KV label="Portal Account" value={detail.has_portal_account ? 'Yes' : 'No'} />
                  <KV label="Emergency Contact" value={detail.emergency_contact_name} />
                  <KV label="Emergency Phone" value={detail.emergency_contact_phone} />
                  <KV label="Primary Health Center" value={detail.primary_clinic} />
                  <KV label="Registered" value={fmtDate(detail.created_at)} />
                </div>
              )}

              {tab === 'Health Centers' && (
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="th-sm text-left">Name</th>
                      <th className="th-sm text-left">City</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.health_centers || []).length === 0 ? (
                      <tr><td className="td-sm text-gray-500" colSpan={2}>No health centers.</td></tr>
                    ) : (
                      (detail.health_centers || []).map((hc) => (
                        <tr key={hc.clinic_id} className="border-t border-gray-800/60">
                          <td className="td-sm text-white">{hc.name}</td>
                          <td className="td-sm text-gray-400">{hc.city || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {tab === 'Timeline' && (
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="th-sm text-left">Date</th>
                      <th className="th-sm text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.timeline || []).length === 0 ? (
                      <tr><td className="td-sm text-gray-500" colSpan={2}>No timeline entries.</td></tr>
                    ) : (
                      (detail.timeline || []).map((t) => (
                        <tr key={t.id} className="border-t border-gray-800/60">
                          <td className="td-sm text-gray-300">{fmtDate(t.date)}</td>
                          <td className="td-sm"><StatusBadge status={t.status} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {tab === 'Clinical' && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-3 gap-2">
                    <KpiChip icon={FileText} label="Appointments" value={detail.clinical?.total_appointments ?? 0} />
                    <KpiChip icon={FlaskConical} label="Lab Orders" value={detail.clinical?.total_lab_orders ?? 0} />
                    <KpiChip icon={Pill} label="Prescriptions" value={detail.clinical?.total_prescriptions ?? 0} />
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="th-sm text-left">Diagnosis</th>
                        <th className="th-sm text-left">ICD-10</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detail.clinical?.diagnoses || []).length === 0 ? (
                        <tr><td className="td-sm text-gray-500" colSpan={2}>No diagnoses recorded.</td></tr>
                      ) : (
                        (detail.clinical.diagnoses || []).map((dx, i) => (
                          <tr key={`${dx.tag_name}-${i}`} className="border-t border-gray-800/60">
                            <td className="td-sm text-white">{dx.tag_name}</td>
                            <td className="td-sm text-gray-400">{dx.icd10_code || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === 'Financial' && (
                <div className="grid grid-cols-3 gap-2">
                  <KpiChip icon={IndianRupee} label="Invoiced" value={money(detail.financial?.total_invoiced)} />
                  <KpiChip icon={IndianRupee} label="Collected" value={money(detail.financial?.total_collected)} />
                  <KpiChip
                    icon={IndianRupee}
                    label="Outstanding"
                    value={money(detail.financial?.outstanding)}
                    accent={Number(detail.financial?.outstanding || 0) > 0 ? 'text-[#F5821E]' : 'text-white'}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default function PatientLookup() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [page, setPage] = useState(1)
  const [results, setResults] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [clinics, setClinics] = useState([])
  const [states, setStates] = useState([])
  const [selectedId, setSelectedId] = useState(null)

  const debounceRef = useRef(null)

  useEffect(() => {
    adminApi.getClinics().then((d) => setClinics(Array.isArray(d) ? d : [])).catch(() => setClinics([]))
    adminApi.getPatientStates().then((d) => setStates(Array.isArray(d) ? d : [])).catch(() => setStates([]))
  }, [])

  const runSearch = useCallback(async (f, p) => {
    setLoading(true)
    setError(null)
    const params = { page: p, page_size: PAGE_SIZE }
    Object.entries(f).forEach(([k, v]) => {
      if (v !== '' && v != null) params[k] = v
    })
    try {
      const data = await adminApi.searchPatients(params)
      setResults(Array.isArray(data?.results) ? data.results : [])
      setTotal(Number(data?.total || 0))
    } catch {
      setError('Failed to load patients. Please try again.')
      setResults([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    runSearch(filters, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  function applyFilterChange(next) {
    setFilters(next)
    setPage(1)
    runSearch(next, 1)
  }

  function onSearchText(value) {
    const next = { ...filters, q: value }
    setFilters(next)
    setPage(1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(next, 1), 400)
  }

  function onSelectChange(key, value) {
    applyFilterChange({ ...filters, [key]: value })
  }

  function onSubmit(e) {
    e.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setPage(1)
    runSearch(filters, 1)
  }

  function clearAll() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setFilters(EMPTY_FILTERS)
    setPage(1)
    runSearch(EMPTY_FILTERS, 1)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const selectCls = 'filter-chip bg-[#0a0f1e] border border-gray-800/60 rounded-md text-sm text-gray-200 px-2 py-1.5 focus:outline-none focus:border-[#F5821E]'
  const numCls = 'bg-[#0a0f1e] border border-gray-800/60 rounded-md text-sm text-gray-200 px-2 py-1.5 w-16 focus:outline-none focus:border-[#F5821E]'

  return (
    <div className="w-full min-h-screen bg-[#0a0f1e] flex flex-col">
      <form onSubmit={onSubmit} className="toolbar sticky top-0 z-20 bg-[#0a0f1e] border-b border-gray-800/60 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={filters.q}
              onChange={(e) => onSearchText(e.target.value)}
              placeholder="Search name, mobile, BH-ID, UHID"
              className="w-full bg-[#0f172a] border border-gray-800/60 rounded-md text-sm text-white pl-8 pr-3 py-2 focus:outline-none focus:border-[#F5821E]"
            />
          </div>

          <select value={filters.clinic_id} onChange={(e) => onSelectChange('clinic_id', e.target.value)} className={selectCls}>
            <option value="">Health Center ▾</option>
            {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select value={filters.state} onChange={(e) => onSelectChange('state', e.target.value)} className={selectCls}>
            <option value="">State ▾</option>
            {states.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={filters.gender} onChange={(e) => onSelectChange('gender', e.target.value)} className={selectCls}>
            <option value="">Gender ▾</option>
            {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>

          <div className="flex items-center gap-1">
            <span className="text-[11px] text-gray-500 uppercase">Age</span>
            <input
              type="number" min="0" value={filters.age_from}
              onChange={(e) => onSelectChange('age_from', e.target.value)}
              className={numCls} placeholder="From"
            />
            <input
              type="number" min="0" value={filters.age_to}
              onChange={(e) => onSelectChange('age_to', e.target.value)}
              className={numCls} placeholder="To"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] text-gray-500 uppercase">Registered</span>
            <input
              type="date" value={filters.reg_date_from}
              onChange={(e) => onSelectChange('reg_date_from', e.target.value)}
              className={selectCls}
            />
            <input
              type="date" value={filters.reg_date_to}
              onChange={(e) => onSelectChange('reg_date_to', e.target.value)}
              className={selectCls}
            />
          </div>

          <select value={filters.has_portal_account} onChange={(e) => onSelectChange('has_portal_account', e.target.value)} className={selectCls}>
            <option value="">Portal ▾</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>

          <select value={filters.blood_group} onChange={(e) => onSelectChange('blood_group', e.target.value)} className={selectCls}>
            <option value="">Blood ▾</option>
            {BLOOD_GROUPS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>

          <button
            type="button" onClick={clearAll}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-sm text-gray-300 border border-gray-800/60 hover:text-white hover:border-gray-700"
          >
            <X size={14} /> Clear
          </button>
        </div>
      </form>

      <div className="flex-1 overflow-auto p-4">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={32} className="text-[#F5821E] animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="card-sm flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <User size={40} className="mb-3 opacity-50" />
            <p className="text-sm">No patients found</p>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="card-sm rounded-lg border border-gray-800/60 overflow-hidden bg-[#0f172a]">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th-sm text-left">Patient</th>
                  <th className="th-sm text-left">BH-ID</th>
                  <th className="th-sm text-left">Phone</th>
                  <th className="th-sm text-left">Gender/Age</th>
                  <th className="th-sm text-left">Health Center</th>
                  <th className="th-sm text-left">City/State</th>
                  <th className="th-sm text-left">Registered</th>
                  <th className="th-sm text-left">Portal</th>
                  <th className="th-sm text-left">Last Visit</th>
                </tr>
              </thead>
              <tbody>
                {results.map((p) => (
                  <tr
                    key={p.patient_id}
                    onClick={() => setSelectedId(p.patient_id)}
                    className="border-t border-gray-800/60 hover:bg-gray-800/30 cursor-pointer"
                  >
                    <td className="td-sm">
                      <div className="text-white">{p.full_name}</div>
                      <div className="text-[11px] text-gray-500">{p.bh_id || '—'}</div>
                    </td>
                    <td className="td-sm text-gray-300">{p.bh_id || '—'}</td>
                    <td className="td-sm text-gray-300">{p.mobile || '—'}</td>
                    <td className="td-sm text-gray-300">{(p.gender || '—')}{p.age != null ? ` / ${p.age}` : ''}</td>
                    <td className="td-sm text-gray-300">{p.clinic_name || '—'}</td>
                    <td className="td-sm text-gray-300">{[p.city, p.state].filter(Boolean).join(', ') || '—'}</td>
                    <td className="td-sm text-gray-400">{fmtDate(p.created_at)}</td>
                    <td className="td-sm"><PortalBadge value={p.has_portal_account} /></td>
                    <td className="td-sm text-gray-400">{fmtDate(p.last_visit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && !error && results.length > 0 && (
        <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-gray-800/60 bg-[#0a0f1e]">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-1.5 rounded border border-gray-800/60 text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-gray-400">{page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-1.5 rounded border border-gray-800/60 text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {selectedId && (
        <PatientDrawer patientId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}
