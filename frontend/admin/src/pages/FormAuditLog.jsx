import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/client'
import {
  Search, ChevronLeft, ChevronRight, ChevronDown, X, RefreshCw,
  Plus, Pencil, Send, Archive, Trash2, RotateCcw, Copy, FileClock,
} from 'lucide-react'

// ── Action presentation ──────────────────────────────────────────────────────
const ACTION_META = {
  created:    { label: 'Created',    icon: Plus,     badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  edited:     { label: 'Edited',     icon: Pencil,   badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  published:  { label: 'Published',  icon: Send,     badge: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  retired:    { label: 'Retired',    icon: Archive,  badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
  deleted:    { label: 'Deleted',    icon: Trash2,   badge: 'bg-red-500/20 text-red-400 border border-red-500/30' },
  restored:   { label: 'Restored',   icon: RotateCcw,badge: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' },
  duplicated: { label: 'Duplicated', icon: Copy,     badge: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
}

const CHANGE_META = {
  added:           { label: 'Added',          cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  removed:         { label: 'Removed',        cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  relabeled:       { label: 'Relabeled',      cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  type_changed:    { label: 'Type changed',   cls: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  options_changed: { label: 'Options changed',cls: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  moved:           { label: 'Moved section',  cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
}

const PAGE_SIZE = 50

function defaultDateRange() {
  const end = new Date(), start = new Date()
  start.setDate(start.getDate() - 30)
  const fmt = d => d.toISOString().slice(0, 10)
  return { from: fmt(start), to: fmt(end) }
}

function fmtWhen(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function ActionBadge({ action }) {
  const m = ACTION_META[action] || { label: action, icon: FileClock, badge: 'bg-gray-700 text-gray-400 border border-gray-600' }
  const Icon = m.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${m.badge}`}>
      <Icon size={12} /> {m.label}
    </span>
  )
}

// One field-level change chip: "Blood Pressure (bp) · Relabeled · BP → Blood Pressure"
function ChangeChip({ c }) {
  const m = CHANGE_META[c.change] || { label: c.change, cls: 'bg-gray-700 text-gray-300 border-gray-600' }
  const from = Array.isArray(c.from) ? c.from.join(', ') : c.from
  const to   = Array.isArray(c.to)   ? c.to.join(', ')   : c.to
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs py-1">
      <span className={`px-1.5 py-0.5 rounded border ${m.cls}`}>{m.label}</span>
      <span className="text-gray-200 font-medium">{c.label}</span>
      <code className="text-[10px] text-gray-500 bg-gray-800 px-1 rounded">{c.field_id}</code>
      {(from != null || to != null) && (
        <span className="text-gray-400">
          {from != null && <span className="line-through text-gray-500">{String(from) || '∅'}</span>}
          {from != null && to != null && <span className="mx-1">→</span>}
          {to != null && <span className="text-gray-200">{String(to) || '∅'}</span>}
        </span>
      )}
    </div>
  )
}

function Row({ entry }) {
  const [open, setOpen] = useState(false)
  const changes = entry.changes || []
  const hasDetail = changes.length > 0
  return (
    <div className="border-b border-gray-800">
      <button
        onClick={() => hasDetail && setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left ${hasDetail ? 'hover:bg-gray-800/50 cursor-pointer' : 'cursor-default'}`}
      >
        <div className="w-32 shrink-0"><ActionBadge action={entry.action} /></div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-100 truncate">
            {entry.form_title || 'Untitled'}
            <span className="text-gray-500 ml-1.5 text-xs">#{entry.form_id}</span>
          </div>
          {entry.detail && <div className="text-xs text-gray-500 truncate">{entry.detail}</div>}
        </div>
        <div className="w-40 shrink-0 text-sm text-gray-300 truncate">
          {entry.actor_name || 'Unknown'}
          {entry.actor_type && <span className="block text-[10px] text-gray-500">{entry.actor_type.replace('_', ' ')}</span>}
        </div>
        <div className="w-40 shrink-0 text-xs text-gray-400">{fmtWhen(entry.created_at)}</div>
        <div className="w-6 shrink-0 text-gray-500">
          {hasDetail && <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />}
        </div>
      </button>
      {open && hasDetail && (
        <div className="px-4 pb-3 pl-36">
          <div className="bg-gray-900/60 rounded-lg border border-gray-800 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">
              {changes.length} field change{changes.length !== 1 ? 's' : ''}
            </div>
            {changes.map((c, i) => <ChangeChip key={i} c={c} />)}
          </div>
        </div>
      )}
    </div>
  )
}

export default function FormAuditLog() {
  const [params] = useSearchParams()
  const initialRange = defaultDateRange()
  const [q, setQ]           = useState('')
  const [action, setAction] = useState('')
  const [actor, setActor]   = useState('')
  const [from, setFrom]     = useState(initialRange.from)
  const [to, setTo]         = useState(initialRange.to)
  const formIdFilter        = params.get('form_id') || ''

  const [data, setData]     = useState({ entries: [], total: 0, facets: { actions: [], actors: [] } })
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)
  const [page, setPage]     = useState(0)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const query = { limit: PAGE_SIZE, offset: page * PAGE_SIZE }
      if (q) query.q = q
      if (action) query.action = action
      if (actor) query.actor = actor
      if (from) query.date_from = from
      if (to) query.date_to = to
      if (formIdFilter) query.form_id = formIdFilter
      const res = await api.get('/assessment-form-audit', { params: query })
      setData(res)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to load audit log')
    } finally {
      setLoading(false)
    }
  }, [q, action, actor, from, to, formIdFilter, page])

  useEffect(() => { load() }, [load])
  // Reset to first page whenever a filter changes.
  useEffect(() => { setPage(0) }, [q, action, actor, from, to])

  const totalPages = Math.max(1, Math.ceil((data.total || 0) / PAGE_SIZE))

  const clearFilters = () => { setQ(''); setAction(''); setActor(''); setFrom(initialRange.from); setTo(initialRange.to) }
  const hasFilters = q || action || actor

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <FileClock className="text-blue-400" size={22} />
          <h1 className="text-xl font-semibold text-gray-100">Form Audit Log</h1>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-800">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Every change to assessment forms — who changed which form, when, and (for edits) exactly which field.
        {formIdFilter && <span className="ml-1 text-blue-400">Filtered to form #{formIdFilter}.</span>}
      </p>

      {/* Filters */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="relative md:col-span-2">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search form title…"
            className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 outline-none"
          />
        </div>
        <select value={action} onChange={e => setAction(e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:border-blue-500 outline-none">
          <option value="">All actions</option>
          {(data.facets?.actions || []).map(a => (
            <option key={a} value={a}>{ACTION_META[a]?.label || a}</option>
          ))}
        </select>
        <input
          value={actor} onChange={e => setActor(e.target.value)}
          placeholder="Actor name…"
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 outline-none"
        />
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="w-full px-2 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-100 focus:border-blue-500 outline-none" />
          <span className="text-gray-600 text-xs">→</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="w-full px-2 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-100 focus:border-blue-500 outline-none" />
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="md:col-span-5 justify-self-start flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200">
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* List */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-800 bg-gray-900/60">
          <div className="w-32 shrink-0">Action</div>
          <div className="flex-1">Form</div>
          <div className="w-40 shrink-0">Who</div>
          <div className="w-40 shrink-0">When</div>
          <div className="w-6 shrink-0" />
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-500 text-sm">Loading…</div>
        ) : error ? (
          <div className="py-16 text-center text-red-400 text-sm">{error}</div>
        ) : data.entries.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">No audit entries match these filters.</div>
        ) : (
          data.entries.map(e => <Row key={e.id} entry={e} />)
        )}
      </div>

      {/* Pagination */}
      {!loading && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
          <span>{data.total} total entries</span>
          <div className="flex items-center gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}
              className="p-1.5 rounded hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent">
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs">Page {page + 1} of {totalPages}</span>
            <button disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}
              className="p-1.5 rounded hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
