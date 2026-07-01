import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search, X, ChevronRight, Building2, Loader2, AlertCircle, Download, Check,
} from 'lucide-react'
import { adminApi } from '../api'
import api from '../api/client'

const STATUS_TABS = ['all', 'active', 'pending', 'suspended', 'revoked']
const PLAN_OPTIONS = ['free', 'basic', 'pro', 'enterprise']

const STATUS_BADGE = {
  active:    'badge-active',
  pending:   'badge-pending',
  suspended: 'badge-suspended',
  revoked:   'badge-revoked',
}

const PLAN_BADGE = {
  free:       'badge-free',
  basic:      'badge-basic',
  pro:        'badge-pro',
  enterprise: 'badge-enterprise',
}

const MODULES = [
  { key: 'has_pharmacy',   emoji: '💊', label: 'Pharmacy' },
  { key: 'has_lab',        emoji: '🧪', label: 'Lab' },
  { key: 'has_imaging',    emoji: '📷', label: 'Imaging' },
  { key: 'has_telehealth', emoji: '📹', label: 'Telehealth' },
  { key: 'has_inpatient',  emoji: '🛏', label: 'Inpatient' },
]

function fmtDate(dt) {
  if (!dt) return '—'
  try {
    return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

function fmtMRR(v) {
  return v > 0 ? `₹${Number(v).toLocaleString('en-IN')}` : '—'
}

function downloadCSV(rows, filename) {
  const cols = [
    ['name', 'Name'],
    ['specialty', 'Specialty'],
    ['status', 'Status'],
    ['plan', 'Plan'],
    ['city', 'City'],
    ['state', 'State'],
    ['phone', 'Phone'],
    ['email', 'Email'],
    ['doctor_count', 'Doctors'],
    ['monthly_bill', 'MRR'],
    ['admin_name', 'Admin'],
    ['admin_mobile', 'Admin Mobile'],
    ['created_at', 'Joined'],
  ]
  const esc = (val) => {
    const s = val === null || val === undefined ? '' : String(val)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = cols.map(([, label]) => esc(label)).join(',')
  const lines = rows.map((r) => cols.map(([key]) => esc(r[key])).join(','))
  const csv = [header, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function HealthCenters() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [centers, setCenters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const initialStatus = searchParams.get('status')
  const [tab, setTab] = useState(STATUS_TABS.includes(initialStatus) ? initialStatus : 'all')
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState('')
  const [filterState, setFilterState] = useState('')
  const [activeModules, setActiveModules] = useState([])

  const [selected, setSelected] = useState(() => new Set())
  const [planMenuOpen, setPlanMenuOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState(null)
  const flashTimer = useRef(null)

  function showFlash(type, msg) {
    setFlash({ type, msg })
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), 4000)
  }

  function load() {
    setLoading(true)
    setError('')
    adminApi
      .getClinics({ limit: 500 })
      .then((d) => setCenters(Array.isArray(d) ? d : []))
      .catch((e) => setError(e?.message || 'Failed to load Health Centers'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    return () => { if (flashTimer.current) clearTimeout(flashTimer.current) }
  }, [])

  const counts = useMemo(() => {
    const map = { all: centers.length }
    STATUS_TABS.slice(1).forEach((s) => {
      map[s] = centers.filter((c) => c.status === s).length
    })
    return map
  }, [centers])

  const uniqueStates = useMemo(
    () => [...new Set(centers.map((c) => c.state).filter(Boolean))].sort(),
    [centers],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return centers.filter((c) => {
      if (tab !== 'all' && c.status !== tab) return false
      if (q && !c.name?.toLowerCase().includes(q) && !c.city?.toLowerCase().includes(q)) return false
      if (filterPlan && (c.plan || 'free') !== filterPlan) return false
      if (filterState && c.state !== filterState) return false
      for (const m of activeModules) {
        if (!c[m]) return false
      }
      return true
    })
  }, [centers, tab, search, filterPlan, filterState, activeModules])

  const filteredIds = useMemo(() => filtered.map((c) => c.id), [filtered])
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id))

  function toggleModule(key) {
    setActiveModules((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  function toggleRow(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) filteredIds.forEach((id) => next.delete(id))
      else filteredIds.forEach((id) => next.add(id))
      return next
    })
  }

  function clearSelection() {
    setSelected(new Set())
    setPlanMenuOpen(false)
  }

  const selectedRows = useMemo(
    () => filtered.filter((c) => selected.has(c.id)),
    [filtered, selected],
  )

  async function bulkExtend() {
    if (busy || selected.size === 0) return
    setBusy(true)
    setPlanMenuOpen(false)
    const ids = [...selected]
    let ok = 0
    let fail = 0
    for (const id of ids) {
      try {
        await api.put(`/platform/clinics/${id}/extend`, { days: 30 })
        ok += 1
      } catch {
        fail += 1
      }
    }
    setBusy(false)
    showFlash(fail ? 'error' : 'success', `Extended ${ok} Health Center${ok === 1 ? '' : 's'} by 30 days${fail ? ` · ${fail} failed` : ''}`)
    clearSelection()
    load()
  }

  async function bulkChangePlan(plan) {
    if (busy || selected.size === 0) return
    setBusy(true)
    setPlanMenuOpen(false)
    const ids = [...selected]
    let ok = 0
    let fail = 0
    for (const id of ids) {
      try {
        await adminApi.changePlan(id, plan)
        ok += 1
      } catch {
        fail += 1
      }
    }
    setBusy(false)
    showFlash(fail ? 'error' : 'success', `Changed plan to ${plan} for ${ok} Health Center${ok === 1 ? '' : 's'}${fail ? ` · ${fail} failed` : ''}`)
    clearSelection()
    load()
  }

  const hasModuleFilters = activeModules.length > 0
  const hasFilters = search || filterPlan || filterState || hasModuleFilters || tab !== 'all'

  return (
    <div className="space-y-3 pb-24">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-base font-bold text-app">Health Centers</h1>
        <span className="text-xs text-faint">{filtered.length} of {centers.length}</span>
      </div>

      {flash && (
        <div className={`text-xs rounded-lg px-3 py-2 border ${
          flash.type === 'success'
            ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-300'
            : 'bg-red-900/30 border-red-700/50 text-red-300'
        }`}>
          {flash.msg}
        </div>
      )}

      {/* Consolidated toolbar */}
      <div className="toolbar flex flex-wrap items-center gap-2">
        <div className="flex gap-0.5 surface border border-app p-0.5 rounded-lg">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium capitalize whitespace-nowrap transition-all ${
                tab === s ? 'bg-[#F5821E] text-app' : 'filter-chip text-dim hover:text-white'
              }`}
            >
              {s}
              <span className="badge-xs">{counts[s] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name / city…"
            className="filter-chip surface border border-app text-app text-xs rounded-lg pl-7 pr-7 py-1.5 outline-none focus:border-[#F5821E] w-48 placeholder-gray-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-white">
              <X size={10} />
            </button>
          )}
        </div>

        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="filter-chip surface border border-app text-app text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-[#F5821E] capitalize"
        >
          <option value="">All Plans</option>
          {PLAN_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <select
          value={filterState}
          onChange={(e) => setFilterState(e.target.value)}
          className="filter-chip surface border border-app text-app text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-[#F5821E]"
        >
          <option value="">All States</option>
          {uniqueStates.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="flex items-center gap-1">
          {MODULES.map((m) => {
            const active = activeModules.includes(m.key)
            return (
              <button
                key={m.key}
                onClick={() => toggleModule(m.key)}
                title={m.label}
                className={`text-sm leading-none rounded-md px-1.5 py-1 border transition-all ${
                  active
                    ? 'border-[#F5821E] ring-1 ring-[#F5821E] bg-[#F5821E]/10'
                    : 'border-app surface opacity-50 hover:opacity-100'
                }`}
              >
                {m.emoji}
              </button>
            )
          })}
        </div>

        <button
          onClick={() => downloadCSV(filtered, `health-centers-${tab}.csv`)}
          disabled={filtered.length === 0}
          className="flex items-center gap-1.5 text-xs font-medium text-dim surface border border-app rounded-lg px-2.5 py-1.5 hover:border-[#F5821E] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={12} /> Export
        </button>

        {hasFilters && (
          <button
            onClick={() => { setTab('all'); setSearch(''); setFilterPlan(''); setFilterState(''); setActiveModules([]) }}
            className="text-xs text-dim hover:text-white underline"
          >
            Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card-sm surface border border-app rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-[#F5821E]" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center gap-3 py-16 text-red-400">
            <AlertCircle size={18} /><span className="text-sm">{error}</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-faint">
            <Building2 size={32} className="mb-3 opacity-30" />
            <p className="text-sm">No Health Centers match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-app text-faint">
                  <th className="th-sm w-8 px-3 py-2.5 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="accent-[#F5821E] cursor-pointer"
                    />
                  </th>
                  <th className="th-sm px-3 py-2.5 text-left">Name</th>
                  <th className="th-sm px-3 py-2.5 text-left">Status</th>
                  <th className="th-sm px-3 py-2.5 text-left">Plan</th>
                  <th className="th-sm px-3 py-2.5 text-center">Doctors</th>
                  <th className="th-sm px-3 py-2.5 text-center">Patients</th>
                  <th className="th-sm px-3 py-2.5 text-right">MRR</th>
                  <th className="th-sm px-3 py-2.5 text-left">Modules</th>
                  <th className="th-sm px-3 py-2.5 text-left">Joined</th>
                  <th className="th-sm w-6 px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {filtered.map((c) => {
                  const isSel = selected.has(c.id)
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/clinics/${c.id}`)}
                      className={`cursor-pointer transition-colors ${isSel ? 'bg-[#F5821E]/5' : 'hover-app'}`}
                    >
                      <td className="td-sm px-3 py-2.5" onClick={(e) => { e.stopPropagation(); toggleRow(c.id) }}>
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleRow(c.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="accent-[#F5821E] cursor-pointer"
                        />
                      </td>
                      <td className="td-sm px-3 py-2.5">
                        <div className="font-semibold text-app text-sm">{c.name}</div>
                        <div className="text-[11px] text-faint">{c.specialty || 'Health Center'}</div>
                      </td>
                      <td className="td-sm px-3 py-2.5">
                        <span className={`badge-xs capitalize ${STATUS_BADGE[c.status] || 'bg-gray-700 text-dim'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="td-sm px-3 py-2.5">
                        <span className={`badge-xs capitalize ${PLAN_BADGE[c.plan || 'free'] || PLAN_BADGE.free}`}>
                          {c.plan || 'free'}
                        </span>
                      </td>
                      <td className="td-sm px-3 py-2.5 text-center text-app font-semibold">{c.doctor_count ?? '—'}</td>
                      <td className="td-sm px-3 py-2.5 text-center text-dim">{c.patient_count ?? '—'}</td>
                      <td className="td-sm px-3 py-2.5 text-right text-emerald-400 font-semibold">{fmtMRR(c.monthly_bill)}</td>
                      <td className="td-sm px-3 py-2.5">
                        <div className="flex items-center gap-0.5 text-sm leading-none">
                          {MODULES.map((m) => (
                            <span key={m.key} title={m.label} className={c[m.key] ? 'opacity-100' : 'opacity-20'}>
                              {m.emoji}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="td-sm px-3 py-2.5 text-faint text-xs">{fmtDate(c.created_at)}</td>
                      <td className="td-sm px-3 py-2.5 text-right">
                        <ChevronRight size={14} className="text-faint" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 surface border border-app rounded-2xl shadow-2xl px-3 py-2 text-xs">
            <span className="text-app font-semibold flex items-center gap-1.5">
              <Check size={13} className="text-[#F5821E]" />
              {selected.size} selected
            </span>
            <span className="text-gray-700">·</span>

            <button
              onClick={bulkExtend}
              disabled={busy}
              className="px-2.5 py-1 rounded-lg surface-2 text-app hover:bg-gray-700 font-medium transition-colors disabled:opacity-40"
            >
              Extend 30d
            </button>

            <div className="relative">
              <button
                onClick={() => setPlanMenuOpen((v) => !v)}
                disabled={busy}
                className="px-2.5 py-1 rounded-lg surface-2 text-app hover:bg-gray-700 font-medium transition-colors disabled:opacity-40"
              >
                Change Plan ▾
              </button>
              {planMenuOpen && (
                <div className="absolute bottom-full mb-1.5 left-0 surface border border-app rounded-lg shadow-xl overflow-hidden min-w-[120px]">
                  {PLAN_OPTIONS.map((p) => (
                    <button
                      key={p}
                      onClick={() => bulkChangePlan(p)}
                      className="block w-full text-left px-3 py-1.5 text-dim hover:bg-[#F5821E] hover:text-white capitalize transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => downloadCSV(selectedRows, 'health-centers-selected.csv')}
              className="px-2.5 py-1 rounded-lg surface-2 text-app hover:bg-gray-700 font-medium transition-colors flex items-center gap-1"
            >
              <Download size={12} /> Export CSV
            </button>

            <button
              onClick={clearSelection}
              className="px-2 py-1 rounded-lg text-dim hover:text-white hover-app font-medium transition-colors flex items-center gap-1"
            >
              <X size={12} /> Clear
            </button>

            {busy && <Loader2 size={13} className="animate-spin text-[#F5821E]" />}
          </div>
        </div>
      )}
    </div>
  )
}
