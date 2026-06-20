import { useState, useEffect, useMemo } from 'react'
import { adminApi } from '../api'
import {
  Table, BarChart3, LineChart, PieChart, Download, Save,
  FileSpreadsheet, FileText, ChevronUp, ChevronDown, Search, X,
  PanelRightClose, PanelRightOpen, AlertTriangle, Database,
} from 'lucide-react'

/* ------------------------------------------------------------------ *
 * Export helpers (preserved from original implementation)            *
 * ------------------------------------------------------------------ */

function exportCsv(rows, columns, filename = 'report.csv') {
  const header = columns.map(c => c.label).join(',')
  const lines  = rows.map(row =>
    columns.map(c => {
      const v = String(row[c.key] ?? '').replace(/"/g, '""')
      return `"${v}"`
    }).join(',')
  )
  const csv  = [header, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function exportExcel(rows, columns, filename) {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const cell = v => `<Cell><Data ss:Type="String">${esc(v)}</Data></Cell>`
  const header = `<Row>${columns.map(c => cell(c.label)).join('')}</Row>`
  const dataRows = rows.map(row =>
    `<Row>${columns.map(c => cell(String(row[c.key] ?? ''))).join('')}</Row>`
  ).join('')
  const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Report"><Table>${header}${dataRows}</Table></Worksheet></Workbook>`
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename + '.xls'; a.click()
  URL.revokeObjectURL(url)
}

function exportPdf(rows, columns, title, dateRange) {
  const thStyle = 'border:1px solid #ccc;padding:6px 10px;background:#f0f0f0;text-align:left;font-size:12px'
  const tdStyle = 'border:1px solid #ccc;padding:6px 10px;font-size:12px'
  const ths = columns.map(c => `<th style="${thStyle}">${c.label}</th>`).join('')
  const trs = rows.map(row =>
    `<tr>${columns.map(c => `<td style="${tdStyle}">${String(row[c.key] ?? '')}</td>`).join('')}</tr>`
  ).join('')
  const html = `<html><head><title>${title}</title><style>@media print{body{margin:20px}}</style></head><body>
    <h2 style="margin-bottom:4px;font-size:16px">${title}</h2>
    <p style="color:#666;font-size:12px;margin-bottom:14px">${dateRange}</p>
    <table style="width:100%;border-collapse:collapse"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
    <script>window.onload=function(){window.print();}<\/script>
  </body></html>`
  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

/* ------------------------------------------------------------------ *
 * Dataset configuration                                              *
 * ------------------------------------------------------------------ */

const DATASETS = [
  { key: 'health_centers', label: 'Health Centers' },
  { key: 'patients',       label: 'Patients' },
  { key: 'appointments',   label: 'Appointments' },
  { key: 'revenue',        label: 'Revenue' },
]

const PRESETS = [
  { key: 'today', label: 'Today',  days: 0 },
  { key: '7d',    label: '7D',     days: 6 },
  { key: '30d',   label: '30D',    days: 29 },
  { key: '90d',   label: '90D',    days: 89 },
]

const HC_STATUS = ['active', 'pending', 'suspended', 'revoked']
const HC_PLAN   = ['free', 'basic', 'pro', 'enterprise']
const GENDERS   = ['Male', 'Female', 'Other']
const APPT_STATUS = ['scheduled', 'completed', 'cancelled']

function isoDay(d) { return d.toISOString().split('T')[0] }

function rangeFromDays(days) {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - days)
  return { from: isoDay(from), to: isoDay(to) }
}

const DEFAULT_RANGE = rangeFromDays(29)

const VIEWS = [
  { key: 'table', label: 'Table', icon: Table },
  { key: 'bar',   label: 'Bar',   icon: BarChart3 },
  { key: 'line',  label: 'Line',  icon: LineChart },
  { key: 'pie',   label: 'Pie',   icon: PieChart },
]

/* ------------------------------------------------------------------ *
 * Small UI primitives                                                *
 * ------------------------------------------------------------------ */

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`filter-chip badge-xs rounded-md px-2 py-1 text-[11px] border transition-colors ${
        active
          ? 'bg-[#F5821E]/15 border-[#F5821E] text-[#F5821E]'
          : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
      }`}
    >
      {children}
    </button>
  )
}

function SortIcon({ active, dir }) {
  if (!active) return <ChevronDown size={10} className="text-gray-600" />
  return dir === 'asc'
    ? <ChevronUp size={10} className="text-[#F5821E]" />
    : <ChevronDown size={10} className="text-[#F5821E]" />
}

/* ------------------------------------------------------------------ *
 * Results table (dense)                                              *
 * ------------------------------------------------------------------ */

function ReportTable({ columns, rows }) {
  const [search, setSearch]   = useState('')
  const [sortKey, setSortKey] = useState('')
  const [sortDir, setSortDir] = useState('asc')

  const filtered = useMemo(() => {
    let r = rows
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(row =>
        columns.some(col => String(row[col.key] ?? '').toLowerCase().includes(q))
      )
    }
    if (sortKey) {
      r = [...r].sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey]
        const an = Number(av), bn = Number(bv)
        if (!Number.isNaN(an) && !Number.isNaN(bn) && av !== '' && bv !== '') {
          return sortDir === 'asc' ? an - bn : bn - an
        }
        const as = String(av ?? '').toLowerCase()
        const bs = String(bv ?? '').toLowerCase()
        return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as)
      })
    }
    return r
  }, [rows, search, sortKey, sortDir, columns])

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  return (
    <div className="card-sm bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-800 flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter rows…"
            className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded-lg pl-7 pr-7 py-1.5 outline-none focus:border-[#F5821E] transition-colors placeholder-gray-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X size={11} />
            </button>
          )}
        </div>
        <span className="text-xs text-gray-600">{filtered.length} rows</span>
      </div>
      <div className="overflow-auto max-h-[calc(100vh-220px)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-900 z-10">
            <tr className="border-b border-gray-800 text-[10px] text-gray-500 uppercase tracking-wider">
              {columns.map(col => (
                <th
                  key={col.key}
                  className="th-sm px-3 py-2 text-left select-none cursor-pointer hover:text-white"
                  onClick={() => toggleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    <SortIcon active={sortKey === col.key} dir={sortDir} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-gray-500 text-xs">
                  No matching rows.
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className="td-sm px-3 py-2 text-xs text-gray-200">
                      {row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Inline SVG charts                                                  *
 * ------------------------------------------------------------------ */

const ACCENT = '#F5821E'
const PIE_COLORS = ['#F5821E', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#eab308', '#14b8a6', '#ec4899']

function pickSeries(columns, rows) {
  const numericCol = columns.find(c =>
    rows.length > 0 && rows.every(r => r[c.key] === null || r[c.key] === '' || !Number.isNaN(Number(r[c.key])))
      && rows.some(r => !Number.isNaN(Number(r[c.key])) && r[c.key] !== '' && r[c.key] !== null)
  )
  const labelCol = columns.find(c => c.key !== numericCol?.key) || columns[0]
  if (!numericCol) return null
  const points = rows.slice(0, 40).map(r => ({
    label: String(r[labelCol?.key] ?? ''),
    value: Number(r[numericCol.key]) || 0,
  }))
  return { valueLabel: numericCol.label, labelKey: labelCol?.label, points }
}

function ChartShell({ children }) {
  return (
    <div className="card-sm bg-gray-900 border border-gray-800 rounded-xl p-4">
      {children}
    </div>
  )
}

function NoNumeric() {
  return (
    <ChartShell>
      <div className="text-center text-gray-500 text-xs py-10">
        No numeric column available to chart. Switch to Table view.
      </div>
    </ChartShell>
  )
}

function BarChartSvg({ series }) {
  if (!series) return <NoNumeric />
  const { points, valueLabel } = series
  const w = 720, h = 280, pad = 32
  const max = Math.max(1, ...points.map(p => p.value))
  const bw = (w - pad * 2) / points.length
  return (
    <ChartShell>
      <p className="text-xs text-gray-400 mb-2">{valueLabel}</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#374151" />
        {points.map((p, i) => {
          const bh = ((h - pad * 2) * p.value) / max
          const x = pad + i * bw + bw * 0.15
          const y = h - pad - bh
          return (
            <g key={i}>
              <rect x={x} y={y} width={bw * 0.7} height={bh} fill={ACCENT} rx="2" />
              <text x={x + bw * 0.35} y={h - pad + 12} textAnchor="middle" fontSize="9" fill="#9ca3af">
                {p.label.length > 8 ? p.label.slice(0, 7) + '…' : p.label}
              </text>
            </g>
          )
        })}
      </svg>
    </ChartShell>
  )
}

function LineChartSvg({ series }) {
  if (!series) return <NoNumeric />
  const { points, valueLabel } = series
  const w = 720, h = 280, pad = 32
  const max = Math.max(1, ...points.map(p => p.value))
  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0
  const coords = points.map((p, i) => ({
    x: pad + i * step,
    y: h - pad - ((h - pad * 2) * p.value) / max,
    p,
  }))
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ')
  return (
    <ChartShell>
      <p className="text-xs text-gray-400 mb-2">{valueLabel}</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#374151" />
        <path d={path} fill="none" stroke={ACCENT} strokeWidth="2" />
        {coords.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r="3" fill={ACCENT} />
            <text x={c.x} y={h - pad + 12} textAnchor="middle" fontSize="9" fill="#9ca3af">
              {c.p.label.length > 8 ? c.p.label.slice(0, 7) + '…' : c.p.label}
            </text>
          </g>
        ))}
      </svg>
    </ChartShell>
  )
}

function PieChartSvg({ series }) {
  if (!series) return <NoNumeric />
  const { points, valueLabel } = series
  const total = points.reduce((s, p) => s + p.value, 0) || 1
  const cx = 130, cy = 130, r = 110
  let angle = -Math.PI / 2
  const slices = points.map((p, i) => {
    const frac = p.value / total
    const start = angle
    const end = angle + frac * Math.PI * 2
    angle = end
    const large = end - start > Math.PI ? 1 : 0
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(end),   y2 = cy + r * Math.sin(end)
    const d = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`
    return { d, color: PIE_COLORS[i % PIE_COLORS.length], p, frac }
  })
  return (
    <ChartShell>
      <p className="text-xs text-gray-400 mb-2">{valueLabel}</p>
      <div className="flex flex-wrap items-center gap-6">
        <svg viewBox="0 0 260 260" className="w-56 h-56 flex-shrink-0">
          {slices.map((s, i) => <path key={i} d={s.d} fill={s.color} stroke="#0a0f1e" strokeWidth="1" />)}
        </svg>
        <div className="space-y-1">
          {slices.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
              <span className="flex-1">{s.p.label || '—'}</span>
              <span className="text-gray-500">{Math.round(s.frac * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </ChartShell>
  )
}

/* ------------------------------------------------------------------ *
 * Main component                                                     *
 * ------------------------------------------------------------------ */

export default function Reports() {
  const [dataset, setDataset]   = useState('health_centers')
  const [dateFrom, setDateFrom] = useState(DEFAULT_RANGE.from)
  const [dateTo, setDateTo]     = useState(DEFAULT_RANGE.to)
  const [preset, setPreset]     = useState('30d')

  const [filters, setFilters]   = useState({})
  const [clinics, setClinics]   = useState([])

  const [view, setView]         = useState('table')
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const [saved, setSaved]       = useState([])
  const [rightOpen, setRightOpen] = useState(true)

  useEffect(() => {
    let alive = true
    adminApi.getClinics()
      .then(list => { if (alive) setClinics(Array.isArray(list) ? list : []) })
      .catch(() => { if (alive) setClinics([]) })
    return () => { alive = false }
  }, [])

  // Reset dataset-specific filters when dataset changes
  useEffect(() => { setFilters({}) }, [dataset])

  function applyPreset(p) {
    setPreset(p.key)
    const r = rangeFromDays(p.days)
    setDateFrom(r.from)
    setDateTo(r.to)
  }

  function toggleMulti(key, value) {
    setFilters(prev => {
      const arr = Array.isArray(prev[key]) ? prev[key] : []
      const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]
      return { ...prev, [key]: next }
    })
  }

  function isOn(key, value) {
    return Array.isArray(filters[key]) && filters[key].includes(value)
  }

  function buildBody() {
    return {
      dataset,
      date_from: dateFrom,
      date_to: dateTo,
      filters: { ...filters },
      group_by: [],
    }
  }

  async function runReport() {
    setLoading(true)
    setError('')
    try {
      const res = await adminApi.runQuery(buildBody())
      setResult(res || { columns: [], rows: [], total_rows: 0 })
    } catch (e) {
      setError(e?.message || 'Failed to run report. Please try again.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  function saveReport() {
    if (!result) return
    const ds = DATASETS.find(d => d.key === dataset)
    setSaved(prev => [
      {
        id: Date.now(),
        name: `${ds?.label || dataset} · ${dateFrom}→${dateTo}`,
        dataset,
        dateFrom,
        dateTo,
        preset,
        filters: { ...filters },
      },
      ...prev,
    ])
  }

  function applySaved(s) {
    setDataset(s.dataset)
    setDateFrom(s.dateFrom)
    setDateTo(s.dateTo)
    setPreset(s.preset || '')
    // setFilters after dataset reset effect — schedule on next tick
    setTimeout(() => setFilters({ ...s.filters }), 0)
  }

  function removeSaved(id) {
    setSaved(prev => prev.filter(s => s.id !== id))
  }

  const columns = result?.columns || []
  const rows    = result?.rows || []
  const series  = useMemo(() => pickSeries(columns, rows), [columns, rows])
  const datasetLabel = DATASETS.find(d => d.key === dataset)?.label || dataset

  // KPI chips: portal_pct and single-row aggregates
  const kpis = useMemo(() => {
    const out = []
    if (result?.portal_pct != null) {
      out.push({ label: 'Portal Share', value: `${result.portal_pct}%` })
    }
    if (result?.total_rows != null) {
      out.push({ label: 'Total Rows', value: result.total_rows })
    }
    if (rows.length === 1 && columns.length) {
      columns.forEach(c => out.push({ label: c.label, value: rows[0][c.key] ?? '—' }))
    }
    return out
  }, [result, rows, columns])

  const dateRangeStr = `${dateFrom} → ${dateTo}`
  const fileBase = `${dataset}_${dateFrom}_${dateTo}`

  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#0a0f1e] text-gray-200">
      {/* ---------------- LEFT PANEL ---------------- */}
      <div className="w-[200px] flex-shrink-0 bg-gray-900/40 border-r border-gray-800/60 p-3 space-y-3 overflow-y-auto">
        {/* Dataset */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Dataset</p>
          <div className="space-y-1">
            {DATASETS.map(d => (
              <label
                key={d.key}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-xs transition-colors ${
                  dataset === d.key ? 'bg-[#F5821E]/10 text-[#F5821E]' : 'text-gray-400 hover:bg-gray-800/60 hover:text-white'
                }`}
              >
                <input
                  type="radio"
                  name="dataset"
                  className="accent-[#F5821E]"
                  checked={dataset === d.key}
                  onChange={() => setDataset(d.key)}
                />
                {d.label}
              </label>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Date Range</p>
          <div className="flex flex-wrap gap-1 mb-2">
            {PRESETS.map(p => (
              <Chip key={p.key} active={preset === p.key} onClick={() => applyPreset(p)}>{p.label}</Chip>
            ))}
          </div>
          <div className="space-y-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPreset('') }}
              className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded-md px-2 py-1.5 outline-none focus:border-[#F5821E]"
            />
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPreset('') }}
              className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded-md px-2 py-1.5 outline-none focus:border-[#F5821E]"
            />
          </div>
        </div>

        {/* Dynamic filters */}
        {dataset === 'health_centers' && (
          <>
            <FilterGroup label="Status">
              {HC_STATUS.map(s => (
                <Chip key={s} active={isOn('status', s)} onClick={() => toggleMulti('status', s)}>
                  <span className="capitalize">{s}</span>
                </Chip>
              ))}
            </FilterGroup>
            <FilterGroup label="Plan">
              {HC_PLAN.map(p => (
                <Chip key={p} active={isOn('plan', p)} onClick={() => toggleMulti('plan', p)}>
                  <span className="capitalize">{p}</span>
                </Chip>
              ))}
            </FilterGroup>
          </>
        )}

        {dataset === 'patients' && (
          <>
            <HealthCenterFilter clinics={clinics} isOn={isOn} toggle={toggleMulti} />
            <FilterGroup label="Gender">
              {GENDERS.map(g => (
                <Chip key={g} active={isOn('gender', g)} onClick={() => toggleMulti('gender', g)}>{g}</Chip>
              ))}
            </FilterGroup>
          </>
        )}

        {dataset === 'appointments' && (
          <>
            <HealthCenterFilter clinics={clinics} isOn={isOn} toggle={toggleMulti} />
            <FilterGroup label="Status">
              {APPT_STATUS.map(s => (
                <Chip key={s} active={isOn('status', s)} onClick={() => toggleMulti('status', s)}>
                  <span className="capitalize">{s}</span>
                </Chip>
              ))}
            </FilterGroup>
          </>
        )}

        {dataset === 'revenue' && (
          <HealthCenterFilter clinics={clinics} isOn={isOn} toggle={toggleMulti} />
        )}

        <button
          onClick={runReport}
          disabled={loading}
          className="w-full bg-[#F5821E] hover:bg-[#e07319] disabled:opacity-60 text-white text-xs font-semibold rounded-md py-2 transition-colors"
        >
          {loading ? 'Running…' : 'Run'}
        </button>
      </div>

      {/* ---------------- MAIN PANEL ---------------- */}
      <div className="flex-1 min-w-0 p-3 flex flex-col">
        {/* Toolbar */}
        <div className="toolbar flex items-center gap-2 mb-3 flex-wrap">
          <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg p-0.5">
            {VIEWS.map(v => {
              const Icon = v.icon
              return (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  title={v.label}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${
                    view === v.key ? 'bg-[#F5821E] text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon size={13} />
                </button>
              )
            })}
          </div>

          <div className="flex-1" />

          <ToolbarBtn icon={Download}        label="CSV"   disabled={!result || !rows.length} onClick={() => exportCsv(rows, columns, `${fileBase}.csv`)} />
          <ToolbarBtn icon={FileSpreadsheet} label="Excel" disabled={!result || !rows.length} onClick={() => exportExcel(rows, columns, fileBase)} />
          <ToolbarBtn icon={FileText}        label="PDF"   disabled={!result || !rows.length} onClick={() => exportPdf(rows, columns, datasetLabel, dateRangeStr)} />
          <ToolbarBtn icon={Save}            label="Save"  disabled={!result}                 onClick={saveReport} />

          <button
            onClick={() => setRightOpen(o => !o)}
            title={rightOpen ? 'Hide saved reports' : 'Show saved reports'}
            className="flex items-center px-2 py-1.5 bg-gray-900 border border-gray-800 hover:bg-gray-800 text-gray-300 rounded-lg transition-colors"
          >
            {rightOpen ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
          </button>
        </div>

        {/* KPI strip */}
        {result && kpis.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {kpis.map((k, i) => (
              <div key={i} className="kpi-card bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5">
                <p className="text-[10px] uppercase tracking-wide text-gray-500">{k.label}</p>
                <p className="text-sm font-semibold text-white">{k.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Results area */}
        <div className="flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-6 h-6 border-[3px] rounded-full animate-spin" style={{ borderColor: ACCENT, borderTopColor: 'transparent' }} />
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-5 flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-300">Report failed</p>
                <p className="text-xs text-red-400/80 mt-0.5">{error}</p>
                <button onClick={runReport} className="mt-3 text-xs px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-md">
                  Retry
                </button>
              </div>
            </div>
          ) : !result ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Database size={34} className="text-gray-700 mb-3" />
              <p className="text-sm text-gray-400">Select a dataset and click Run</p>
              <p className="text-xs text-gray-600 mt-1">Results appear here as a table or chart.</p>
            </div>
          ) : view === 'table' ? (
            <ReportTable columns={columns} rows={rows} />
          ) : view === 'bar' ? (
            <BarChartSvg series={series} />
          ) : view === 'line' ? (
            <LineChartSvg series={series} />
          ) : (
            <PieChartSvg series={series} />
          )}
        </div>
      </div>

      {/* ---------------- RIGHT PANEL ---------------- */}
      {rightOpen && (
        <div className="w-[160px] flex-shrink-0 bg-gray-900/40 border-l border-gray-800/60 p-3 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Saved Reports</p>
            <button onClick={() => setRightOpen(false)} className="text-gray-500 hover:text-white">
              <PanelRightClose size={13} />
            </button>
          </div>
          {saved.length === 0 ? (
            <p className="text-[11px] text-gray-600">No saved reports yet. Run a report and click Save.</p>
          ) : (
            <div className="space-y-1.5">
              {saved.map(s => (
                <div key={s.id} className="card-sm group bg-gray-800/60 border border-gray-700 rounded-md px-2 py-1.5 hover:border-gray-600">
                  <button onClick={() => applySaved(s)} className="w-full text-left">
                    <p className="text-[11px] text-white truncate">{s.name}</p>
                  </button>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[9px] text-gray-500">{s.dateFrom}</span>
                    <button onClick={() => removeSaved(s.id)} className="text-gray-600 hover:text-red-400">
                      <X size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Sub-components                                                     *
 * ------------------------------------------------------------------ */

function FilterGroup({ label, children }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  )
}

function HealthCenterFilter({ clinics, isOn, toggle }) {
  return (
    <FilterGroup label="Health Center">
      {clinics.length === 0 ? (
        <span className="text-[11px] text-gray-600">No Health Centers</span>
      ) : (
        <div className="max-h-40 overflow-y-auto flex flex-wrap gap-1 w-full">
          {clinics.map(c => (
            <Chip key={c.id} active={isOn('clinic_ids', c.id)} onClick={() => toggle('clinic_ids', c.id)}>
              <span className="truncate max-w-[120px] inline-block align-bottom">{c.name}</span>
            </Chip>
          ))}
        </div>
      )}
    </FilterGroup>
  )
}

function ToolbarBtn({ icon: Icon, label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="btn-sm flex items-center gap-1 px-2 py-1.5 bg-gray-900 border border-gray-800 hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-gray-900 text-gray-300 hover:text-white text-xs font-medium rounded-lg transition-colors"
    >
      <Icon size={12} />
      {label}
    </button>
  )
}
