import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  BarChart2,
  Layers,
  CheckCircle2,
  Archive,
  BookTemplate,
  Eye,
  Pencil,
  AlertCircle,
  Info,
  Loader2,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react'
import api from '../api/client'

// ─── SVG Chart Helpers ───────────────────────────────────────────────────────────────────

function DonutChart({ segments, size = 120, thickness = 28 }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0)
    return (
      <div
        className="rounded-full bg-gray-800 flex items-center justify-center text-gray-500 text-xs"
        style={{ width: size, height: size }}
      >
        No data
      </div>
    )

  let angle = -90
  const cx = size / 2
  const cy = size / 2
  const r = (size - thickness) / 2

  const paths = segments.map((seg, i) => {
    const sweep = (seg.value / total) * 360
    const startAngle = angle
    const endAngle = angle + sweep
    angle += sweep

    const toRad = (d) => (d * Math.PI) / 180
    const x1 = cx + r * Math.cos(toRad(startAngle))
    const y1 = cy + r * Math.sin(toRad(startAngle))
    const x2 = cx + r * Math.cos(toRad(endAngle))
    const y2 = cy + r * Math.sin(toRad(endAngle))
    const large = sweep > 180 ? 1 : 0

    return (
      <path
        key={i}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
        fill={seg.color}
        opacity={0.85}
      />
    )
  })

  return (
    <svg width={size} height={size}>
      {paths}
      <circle cx={cx} cy={cy} r={r - thickness / 2} fill="#111827" />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dy="0.3em"
        fill="white"
        fontSize={14}
        fontWeight="bold"
      >
        {total}
      </text>
    </svg>
  )
}

function HBarChart({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-28 truncate text-right capitalize">
            {d.label.replace(/_/g, ' ')}
          </span>
          <div className="flex-1 bg-gray-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(d.value / max) * 100}%`, background: d.color }}
            />
          </div>
          <span className="text-xs text-gray-300 w-6 text-right">{d.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Constants ──────────────────────────────────────────────────────────────────────────────

const CATEGORY_COLORS = {
  vitals: '#3b82f6',
  mental_health: '#a855f7',
  pain: '#f97316',
  safety: '#ef4444',
  admission: '#22c55e',
  discharge: '#14b8a6',
  intake: '#22c55e',
  clinical: '#14b8a6',
  assessment: '#6366f1',
  consent: '#10b981',
  surgical: '#06b6d4',
  icu: '#f43f5e',
  followup: '#0ea5e9',
  survey: '#ec4899',
  pediatrics: '#84cc16',
  general: '#6b7280',
}

function getCategoryColor(cat) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS.general
}

const STATUS_COLORS = {
  draft: '#eab308',
  published: '#22c55e',
  retired: '#6b7280',
  template: '#3b82f6',
}

// ─── Helpers ───────────────────────────────────────────────────────────────────────────────

function capitalize(s) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function fmtDate(val) {
  if (!val) return '—'
  try {
    return new Date(val).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return String(val)
  }
}

function countSchemaFields(schema) {
  if (!schema) return { sections: 0, fields: 0, required: 0, fieldTypes: {} }
  const sections = Array.isArray(schema.sections) ? schema.sections : []
  let fields = 0
  let required = 0
  const fieldTypes = {}

  sections.forEach((sec) => {
    const flds = Array.isArray(sec.fields) ? sec.fields : []
    flds.forEach((f) => {
      fields++
      if (f.required) required++
      const t = f.type || f.field_type || 'unknown'
      fieldTypes[t] = (fieldTypes[t] || 0) + 1
    })
  })

  return { sections: sections.length, fields, required, fieldTypes }
}

// ─── Status Badge ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const styles = {
    draft: 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50',
    published: 'bg-green-900/30 text-green-400 border border-green-800/50',
    retired: 'bg-gray-700/50 text-gray-400 border border-gray-600/50',
    template: 'bg-blue-900/30 text-blue-400 border border-blue-800/50',
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        styles[status] || styles.draft
      }`}
    >
      {capitalize(status)}
    </span>
  )
}

// ─── Form Detail Drawer ────────────────────────────────────────────────────────────────────

function FormDetailDrawer({ form, onClose, navigate }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!form) return
    setLoading(true)
    setError('')
    api
      .get(`/platform/forms/${form.id}`)
      .then((data) => {
        setDetail(data?.form ?? data?.data ?? data)
      })
      .catch((err) => setError(err.message || 'Failed to load form details.'))
      .finally(() => setLoading(false))
  }, [form?.id])

  if (!form) return null

  const schema = detail?.schema ?? form?.schema
  const stats = countSchemaFields(schema)
  const scoring = detail?.scoring_config ?? form?.scoring_config
  const alerts = detail?.alert_rules ?? form?.alert_rules ?? []
  const iview = detail?.iview_config ?? form?.iview_config

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-40 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-gray-900 border-l border-gray-800 z-50 overflow-y-auto shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-start justify-between gap-4 z-10">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white truncate">
              {form.title || 'Untitled Form'}
            </h2>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <StatusBadge status={form.status || 'draft'} />
              {(form.is_template || form.status === 'template') && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-800/50">
                  Template
                </span>
              )}
              {form.is_iview_enabled && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-900/30 text-indigo-400 border border-indigo-800/50">
                  iView
                </span>
              )}
              {form.requires_cosign && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-900/30 text-orange-400 border border-orange-800/50">
                  Co-sign
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 px-6 py-5 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-gray-500" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 bg-red-900/20 border border-red-800/50 rounded-xl px-4 py-3 text-red-400 text-sm">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Category</p>
                  <p className="text-sm font-medium text-white capitalize">
                    {(detail?.category || form.category || 'general').replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Version</p>
                  <p className="text-sm font-medium text-white">v{detail?.version ?? form.version ?? 1}</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Created</p>
                  <p className="text-sm font-medium text-white">
                    {fmtDate(detail?.created_at || form.created_at)}
                  </p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Updated</p>
                  <p className="text-sm font-medium text-white">
                    {fmtDate(detail?.updated_at || form.updated_at)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                  Schema Statistics
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Sections', value: stats.sections },
                    { label: 'Fields', value: stats.fields },
                    { label: 'Required', value: stats.required },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="bg-gray-800 border border-gray-700/50 rounded-xl p-3 text-center"
                    >
                      <p className="text-2xl font-bold text-white">{s.value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {Object.keys(stats.fieldTypes).length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                    Field Types
                  </h3>
                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl divide-y divide-gray-700/50">
                    {Object.entries(stats.fieldTypes).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between px-4 py-2.5">
                        <span className="text-sm text-gray-300 capitalize">
                          {type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm font-semibold text-white">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {scoring && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                    Scoring Configuration
                  </h3>
                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 space-y-2">
                    {scoring.type && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Type</span>
                        <span className="text-white capitalize">{scoring.type}</span>
                      </div>
                    )}
                    {scoring.max_score !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Max Score</span>
                        <span className="text-white">{scoring.max_score}</span>
                      </div>
                    )}
                    {scoring.interpretation && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Interpretation</span>
                        <span className="text-white capitalize">{scoring.interpretation}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                  Alert Rules
                </h3>
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-gray-400">Total alert rules</span>
                  <span className="text-lg font-bold text-white">
                    {Array.isArray(alerts) ? alerts.length : 0}
                  </span>
                </div>
              </div>

              {iview && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                    iView Configuration
                  </h3>
                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl px-4 py-3 space-y-2">
                    {iview.enabled !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Enabled</span>
                        <span className={iview.enabled ? 'text-green-400' : 'text-gray-400'}>
                          {iview.enabled ? 'Yes' : 'No'}
                        </span>
                      </div>
                    )}
                    {iview.mode && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Mode</span>
                        <span className="text-white capitalize">{iview.mode}</span>
                      </div>
                    )}
                    {iview.layout && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Layout</span>
                        <span className="text-white capitalize">{iview.layout}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 px-6 py-4">
          <button
            onClick={() => {
              onClose()
              navigate(`/forms/builder/${form.id}`)
            }}
            className="w-full flex items-center justify-center gap-2 bg-[#F5821E] hover:bg-[#e07319] text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Pencil size={15} />
            Edit Form
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Forms Table ─────────────────────────────────────────────────────────────────────────────

function FormsTable({ forms, onViewDetails }) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('title')
  const [sortDir, setSortDir] = useState('asc')

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = forms
    .filter((f) => {
      if (!search.trim()) return true
      const q = search.trim().toLowerCase()
      return (
        f.title?.toLowerCase().includes(q) ||
        f.category?.toLowerCase().includes(q) ||
        f.status?.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      const av = (a[sortKey] ?? '').toString().toLowerCase()
      const bv = (b[sortKey] ?? '').toString().toLowerCase()
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })

  function SortIcon({ col }) {
    if (sortKey !== col) return <ChevronDown size={12} className="text-gray-600" />
    return sortDir === 'asc' ? (
      <ChevronUp size={12} className="text-[#F5821E]" />
    ) : (
      <ChevronDown size={12} className="text-[#F5821E]" />
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex-1">All Forms</span>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter forms…"
            className="w-48 bg-gray-800 border border-gray-700 text-white text-xs rounded-lg pl-8 pr-3 py-1.5 outline-none focus:border-gray-600 placeholder-gray-500" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>
        <span className="text-xs text-gray-600">{filtered.length} forms</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-2.5 text-left cursor-pointer hover:text-white select-none" onClick={() => toggleSort('title')}>
                <span className="flex items-center gap-1">Form Title <SortIcon col="title" /></span>
              </th>
              <th className="px-3 py-2.5 text-left cursor-pointer hover:text-white select-none" onClick={() => toggleSort('category')}>
                <span className="flex items-center gap-1">Category <SortIcon col="category" /></span>
              </th>
              <th className="px-3 py-2.5 text-left">Ver</th>
              <th className="px-3 py-2.5 text-left cursor-pointer hover:text-white select-none" onClick={() => toggleSort('status')}>
                <span className="flex items-center gap-1">Status <SortIcon col="status" /></span>
              </th>
              <th className="px-3 py-2.5 text-center">iView</th>
              <th className="px-3 py-2.5 text-center">Co-sign</th>
              <th className="px-3 py-2.5 text-center">Template</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-gray-500 text-xs">
                  No forms match your filter.
                </td>
              </tr>
            ) : (
              filtered.map((form) => (
                <tr
                  key={form.id}
                  className="hover:bg-gray-800/30 transition-colors cursor-pointer"
                  onClick={() => onViewDetails(form)}
                >
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-white text-xs">{form.title || 'Untitled'}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: `${getCategoryColor(form.category)}22`, color: getCategoryColor(form.category) }}>
                      {(form.category || 'general').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-400 font-mono text-xs">v{form.version ?? 1}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={form.status || 'draft'} /></td>
                  <td className="px-3 py-2.5 text-center">
                    {form.is_iview_enabled ? <span className="text-indigo-400 text-xs font-medium">Yes</span> : <span className="text-gray-600 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {form.requires_cosign ? <span className="text-orange-400 text-xs font-medium">Yes</span> : <span className="text-gray-600 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {form.is_template || form.status === 'template' ? <span className="text-blue-400 text-xs font-medium">Yes</span> : <span className="text-gray-600 text-xs">—</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────────────────────

export default function FormAnalytics() {
  const navigate = useNavigate()

  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [drawerForm, setDrawerForm] = useState(null)

  useEffect(() => {
    setLoading(true)
    api
      .get('/platform/forms')
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.items ?? data?.results ?? [])
        setForms(list)
        setError('')
      })
      .catch((err) => setError(err.message || 'Failed to load forms.'))
      .finally(() => setLoading(false))
  }, [])

  const totalForms = forms.length
  const publishedCount = forms.filter((f) => f.status === 'published').length
  const draftCount = forms.filter((f) => f.status === 'draft').length
  const retiredCount = forms.filter((f) => f.status === 'retired').length
  const templateCount = forms.filter((f) => f.is_template || f.status === 'template').length

  const donutSegments = [
    { label: 'Published', value: publishedCount, color: STATUS_COLORS.published },
    { label: 'Draft', value: draftCount, color: STATUS_COLORS.draft },
    { label: 'Retired', value: retiredCount, color: STATUS_COLORS.retired },
    { label: 'Template', value: templateCount, color: STATUS_COLORS.template },
  ].filter((s) => s.value > 0)

  const categoryMap = {}
  forms.forEach((f) => {
    const cat = f.category || 'general'
    categoryMap[cat] = (categoryMap[cat] || 0) + 1
  })
  const categoryData = Object.entries(categoryMap)
    .map(([label, value]) => ({ label, value, color: getCategoryColor(label) }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="space-y-3">
      {/* Compact top bar */}
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/forms')}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <ArrowLeft size={15} />
        </button>
        <span className="text-sm font-semibold text-white">Form Analytics</span>
        <div className="flex items-center gap-1.5 ml-2 text-blue-300 bg-blue-950/40 border border-blue-800/50 rounded-lg px-2.5 py-1 text-xs">
          <Info size={11} className="text-blue-400 flex-shrink-0" />
          Illustrative data — live submissions update after first form responses
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle size={40} className="text-gray-600 mb-3" />
          <p className="text-gray-400 font-medium mb-1">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 text-sm text-[#F5821E] hover:underline">Try again</button>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-7 h-7 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#F5821E', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <>
          {/* Stat chips */}
          <div className="flex flex-wrap gap-2">
            {[
              { icon: FileText, label: 'Total', value: totalForms, color: '#F5821E' },
              { icon: CheckCircle2, label: 'Published', value: publishedCount, color: '#22c55e' },
              { icon: Layers, label: 'Templates', value: templateCount, color: '#3b82f6' },
              { icon: Archive, label: 'Retired', value: retiredCount, color: '#6b7280' },
              { icon: BarChart2, label: 'Draft', value: draftCount, color: '#eab308' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2">
                <Icon size={13} style={{ color }} />
                <span className="text-xs text-gray-500">{label}</span>
                <span className="text-lg font-bold text-white leading-none">{value}</span>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-white mb-5">
                Form Status Distribution
              </h2>
              <div className="flex items-center gap-8">
                <DonutChart segments={donutSegments} size={140} thickness={32} />
                <div className="flex-1 space-y-3">
                  {[
                    { label: 'Published', value: publishedCount, color: STATUS_COLORS.published },
                    { label: 'Draft', value: draftCount, color: STATUS_COLORS.draft },
                    { label: 'Retired', value: retiredCount, color: STATUS_COLORS.retired },
                    { label: 'Template', value: templateCount, color: STATUS_COLORS.template },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-2.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: s.color }}
                      />
                      <span className="text-sm text-gray-300 flex-1">{s.label}</span>
                      <span className="text-sm font-semibold text-white">{s.value}</span>
                      <span className="text-xs text-gray-500 w-10 text-right">
                        {totalForms > 0
                          ? `${Math.round((s.value / totalForms) * 100)}%`
                          : '0%'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-white mb-5">Forms by Category</h2>
              {categoryData.length === 0 ? (
                <p className="text-gray-500 text-sm">No category data available.</p>
              ) : (
                <HBarChart data={categoryData} />
              )}
            </div>
          </div>

          {/* Forms Table */}
          <FormsTable forms={forms} onViewDetails={setDrawerForm} />
        </>
      )}

      {drawerForm && (
        <FormDetailDrawer
          form={drawerForm}
          onClose={() => setDrawerForm(null)}
          navigate={navigate}
        />
      )}
    </div>
  )
}
