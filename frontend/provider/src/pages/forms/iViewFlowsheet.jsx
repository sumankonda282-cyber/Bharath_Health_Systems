import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import api from '../../api/client'
import {
  ArrowLeft, RefreshCw, AlertCircle, TrendingUp, X as XIcon,
  Printer, Download, PanelRightOpen, PanelRightClose, ChevronDown,
  ChevronRight, Clock, Copy, CheckCircle2,
} from 'lucide-react'
import { PageLoader } from '../../components/ui/Spinner'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
}

function fmtDateInput(d) {
  return d.toISOString().split('T')[0]
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function getShift(iso) {
  if (!iso) return 'Unknown'
  const h = new Date(iso).getHours()
  if (h >= 6 && h < 14) return 'Morning (6–14)'
  if (h >= 14 && h < 22) return 'Evening (14–22)'
  return 'Night (22–6)'
}

// Evaluate cell vs ref_range
// Returns: 'critical' | 'abnormal' | 'normal'
function evalCell(val, refRange) {
  if (val === null || val === undefined || val === '') return 'empty'
  const n = parseFloat(val)
  if (isNaN(n) || !refRange) return 'normal'
  const { normal_low, normal_high, critical_low, critical_high } = refRange
  if (
    (critical_low !== undefined && critical_low !== null && n < critical_low) ||
    (critical_high !== undefined && critical_high !== null && n > critical_high)
  ) return 'critical'
  if (
    (normal_low !== undefined && normal_low !== null && n < normal_low) ||
    (normal_high !== undefined && normal_high !== null && n > normal_high)
  ) return 'abnormal'
  return 'normal'
}

function directionArrow(val, refRange) {
  if (!refRange) return ''
  const n = parseFloat(val)
  if (isNaN(n)) return ''
  if (refRange.normal_high !== undefined && refRange.normal_high !== null && n > refRange.normal_high) return '↑'
  if (refRange.normal_low !== undefined && refRange.normal_low !== null && n < refRange.normal_low) return '↓'
  return ''
}

function bandToMs(band) {
  const map = { '1h': 3600000, '2h': 7200000, '4h': 14400000, '8h': 28800000, '12h': 43200000, '24h': 86400000 }
  return map[band] || 14400000
}

// Build time column labels from entries sorted by charted_at
function buildColumns(entries, band) {
  const ms = bandToMs(band)
  const times = entries.map(e => new Date(e.charted_at).getTime())
  if (!times.length) return []
  const min = Math.min(...times)
  const max = Math.max(...times)
  const cols = []
  for (let t = min; t <= max + ms; t += ms) {
    cols.push(t)
  }
  return cols
}

// For a column bucket, find the most recent entry within that bucket
function entryForColumn(entries, colTs, band) {
  const ms = bandToMs(band)
  const inBucket = entries.filter(e => {
    const t = new Date(e.charted_at).getTime()
    return t >= colTs && t < colTs + ms
  })
  if (!inBucket.length) return null
  inBucket.sort((a, b) => new Date(b.charted_at) - new Date(a.charted_at))
  return inBucket[0]
}

function isToday(ts) {
  const d = new Date(ts)
  const today = new Date()
  return d.toDateString() === today.toDateString()
}

// ── Sparkline SVG ─────────────────────────────────────────────────────────────

function Sparkline({ values, refRange, width = 120, height = 40 }) {
  const [tooltip, setTooltip] = useState(null)
  const nonNull = values.filter(v => v !== null && v !== undefined)
  if (!nonNull.length) return <span className="text-gray-300 text-xs">no data</span>

  const allBounds = [...nonNull]
  if (refRange) {
    if (refRange.critical_low !== null && refRange.critical_low !== undefined) allBounds.push(refRange.critical_low)
    if (refRange.critical_high !== null && refRange.critical_high !== undefined) allBounds.push(refRange.critical_high)
    if (refRange.normal_low !== null && refRange.normal_low !== undefined) allBounds.push(refRange.normal_low)
    if (refRange.normal_high !== null && refRange.normal_high !== undefined) allBounds.push(refRange.normal_high)
  }

  const dataMin = Math.min(...allBounds)
  const dataMax = Math.max(...allBounds)
  const range = dataMax - dataMin || 1

  const pad = 4
  const innerW = width - pad * 2
  const innerH = height - pad * 2

  const toX = i => pad + (i / (values.length - 1 || 1)) * innerW
  const toY = v => pad + innerH - ((v - dataMin) / range) * innerH

  const scaleY = v => pad + innerH - ((v - dataMin) / range) * innerH

  // Build path
  const points = []
  for (let i = 0; i < values.length; i++) {
    if (values[i] !== null && values[i] !== undefined) {
      points.push({ i, v: values[i], x: toX(i), y: toY(values[i]) })
    }
  }

  let pathD = ''
  let first = true
  for (const p of points) {
    pathD += first ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`
    first = false
  }

  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible"
      onMouseLeave={() => setTooltip(null)}
    >
      {/* Critical zones */}
      {refRange && refRange.critical_low !== null && refRange.critical_low !== undefined && (
        <rect
          x={pad}
          y={scaleY(dataMin)}
          width={innerW}
          height={Math.max(0, scaleY(dataMin) - scaleY(refRange.critical_low))}
          fill="rgba(220,38,38,0.15)"
        />
      )}
      {refRange && refRange.critical_high !== null && refRange.critical_high !== undefined && (
        <rect
          x={pad}
          y={scaleY(refRange.critical_high)}
          width={innerW}
          height={Math.max(0, scaleY(refRange.critical_high) - scaleY(dataMax) + pad)}
          fill="rgba(220,38,38,0.15)"
        />
      )}
      {/* Normal zone */}
      {refRange && refRange.normal_low !== null && refRange.normal_low !== undefined &&
        refRange.normal_high !== null && refRange.normal_high !== undefined && (
        <rect
          x={pad}
          y={scaleY(refRange.normal_high)}
          width={innerW}
          height={Math.max(0, scaleY(refRange.normal_low) - scaleY(refRange.normal_high))}
          fill="rgba(34,197,94,0.12)"
        />
      )}
      {/* Line */}
      {pathD && (
        <path d={pathD} fill="none" stroke="#0F2557" strokeWidth={1.5} strokeLinejoin="round" />
      )}
      {/* Data points */}
      {points.map(p => (
        <circle
          key={p.i}
          cx={p.x}
          cy={p.y}
          r={3}
          fill="#0F2557"
          className="cursor-pointer"
          onMouseEnter={e => setTooltip({ x: p.x, y: p.y, v: p.v, i: p.i })}
        />
      ))}
      {/* Tooltip */}
      {tooltip && (
        <g>
          <rect
            x={Math.min(tooltip.x - 20, width - 44)}
            y={tooltip.y - 22}
            width={44}
            height={16}
            rx={3}
            fill="#0F2557"
          />
          <text
            x={Math.min(tooltip.x - 20, width - 44) + 22}
            y={tooltip.y - 11}
            textAnchor="middle"
            fill="white"
            fontSize={9}
          >
            {tooltip.v}
          </text>
        </g>
      )}
    </svg>
  )
}

// ── Trend Graph Popout ────────────────────────────────────────────────────────

function TrendGraph({ fieldId, config, entries, columns, timeBand, onClose }) {
  const rowCfg = config.row_config.find(r => r.field_id === fieldId)
  if (!rowCfg) return null

  const dataPoints = columns.map(colTs => {
    const entry = entryForColumn(entries, colTs, timeBand)
    const raw = entry?.data?.[fieldId]
    const v = raw !== undefined && raw !== null && raw !== '' ? parseFloat(raw) : null
    return { ts: colTs, v: isNaN(v) ? null : v }
  }).filter(d => d.v !== null)

  const values = columns.map(colTs => {
    const entry = entryForColumn(entries, colTs, timeBand)
    const raw = entry?.data?.[fieldId]
    return raw !== undefined && raw !== null && raw !== '' ? parseFloat(raw) : null
  })

  const refRange = rowCfg.ref_range || null
  const W = 560
  const H = 200
  const pad = { top: 20, right: 20, bottom: 40, left: 40 }
  const innerW = W - pad.left - pad.right
  const innerH = H - pad.top - pad.bottom

  const nonNull = values.filter(v => v !== null)
  if (!nonNull.length) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">{rowCfg.label} {rowCfg.unit ? `(${rowCfg.unit})` : ''}</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><XIcon size={16} /></button>
          </div>
          <p className="text-gray-400 text-sm text-center py-8">No data available for trend view.</p>
        </div>
      </div>
    )
  }

  const allBounds = [...nonNull]
  if (refRange) {
    if (refRange.critical_low != null) allBounds.push(refRange.critical_low)
    if (refRange.critical_high != null) allBounds.push(refRange.critical_high)
    if (refRange.normal_low != null) allBounds.push(refRange.normal_low)
    if (refRange.normal_high != null) allBounds.push(refRange.normal_high)
  }
  const vMin = Math.min(...allBounds)
  const vMax = Math.max(...allBounds)
  const vRange = vMax - vMin || 1

  const toX = i => pad.left + (i / (values.length - 1 || 1)) * innerW
  const toY = v => pad.top + innerH - ((v - vMin) / vRange) * innerH
  const scaleY = v => pad.top + innerH - ((v - vMin) / vRange) * innerH

  const pts = values.map((v, i) => ({ i, v, x: toX(i), y: v !== null ? toY(v) : null })).filter(p => p.v !== null)

  let pathD = ''
  let first = true
  for (const p of pts) {
    pathD += first ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`
    first = false
  }

  const [hovered, setHovered] = useState(null)

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-800 text-lg">{rowCfg.label}</h3>
            {rowCfg.unit && <span className="text-xs text-gray-400">{rowCfg.unit}</span>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><XIcon size={18} /></button>
        </div>

        {/* Ref range legend */}
        {refRange && (
          <div className="flex gap-4 text-xs mb-3 flex-wrap">
            {refRange.normal_low != null && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-green-200" />Normal: {refRange.normal_low}–{refRange.normal_high}</span>}
            {refRange.critical_low != null && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm inline-block bg-red-200" />Critical &lt;{refRange.critical_low} or &gt;{refRange.critical_high}</span>}
          </div>
        )}

        <svg width={W} height={H} className="w-full" viewBox={`0 0 ${W} ${H}`}>
          {/* Critical high zone */}
          {refRange?.critical_high != null && (
            <rect x={pad.left} y={scaleY(vMax)} width={innerW} height={Math.max(0, scaleY(refRange.critical_high) - scaleY(vMax) + 2)} fill="rgba(220,38,38,0.12)" />
          )}
          {/* Critical low zone */}
          {refRange?.critical_low != null && (
            <rect x={pad.left} y={scaleY(refRange.critical_low)} width={innerW} height={Math.max(0, scaleY(vMin) - scaleY(refRange.critical_low) + pad.bottom / 2)} fill="rgba(220,38,38,0.12)" />
          )}
          {/* Normal zone */}
          {refRange?.normal_low != null && refRange?.normal_high != null && (
            <rect x={pad.left} y={scaleY(refRange.normal_high)} width={innerW} height={Math.max(0, scaleY(refRange.normal_low) - scaleY(refRange.normal_high))} fill="rgba(34,197,94,0.12)" />
          )}
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(pct => (
            <line
              key={pct}
              x1={pad.left}
              y1={pad.top + innerH * pct}
              x2={pad.left + innerW}
              y2={pad.top + innerH * pct}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          ))}
          {/* Y axis */}
          <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + innerH} stroke="#d1d5db" strokeWidth={1} />
          {/* X axis */}
          <line x1={pad.left} y1={pad.top + innerH} x2={pad.left + innerW} y2={pad.top + innerH} stroke="#d1d5db" strokeWidth={1} />
          {/* Y axis labels */}
          {[0, 0.5, 1].map(pct => {
            const v = vMin + (vMax - vMin) * (1 - pct)
            return (
              <text key={pct} x={pad.left - 4} y={pad.top + innerH * pct + 4} textAnchor="end" fill="#9ca3af" fontSize={10}>
                {v.toFixed(1)}
              </text>
            )
          })}
          {/* Data line */}
          {pathD && <path d={pathD} fill="none" stroke="#0F2557" strokeWidth={2} strokeLinejoin="round" />}
          {/* Data points */}
          {pts.map(p => (
            <circle
              key={p.i}
              cx={p.x}
              cy={p.y}
              r={4}
              fill={hovered?.i === p.i ? '#F5821E' : '#0F2557'}
              stroke="white"
              strokeWidth={1.5}
              className="cursor-pointer"
              onMouseEnter={() => setHovered(p)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          {/* Tooltip on hover */}
          {hovered && (
            <g>
              <rect
                x={Math.min(hovered.x - 28, W - pad.right - 60)}
                y={hovered.y - 32}
                width={56}
                height={20}
                rx={4}
                fill="#0F2557"
              />
              <text
                x={Math.min(hovered.x - 28, W - pad.right - 60) + 28}
                y={hovered.y - 18}
                textAnchor="middle"
                fill="white"
                fontSize={10}
              >
                {hovered.v} {rowCfg.unit || ''}
              </text>
            </g>
          )}
          {/* X axis labels (sample every nth column) */}
          {columns.map((colTs, i) => {
            if (i % Math.ceil(columns.length / 6) !== 0) return null
            return (
              <text
                key={i}
                x={toX(i)}
                y={pad.top + innerH + 14}
                textAnchor="middle"
                fill="#9ca3af"
                fontSize={9}
              >
                {fmtTime(colTs)}
              </text>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// ── Shift Summary ─────────────────────────────────────────────────────────────

function ShiftSummary({ config, entries, columns, timeBand }) {
  const [copied, setCopied] = useState(false)

  const stats = config.row_config.map(row => {
    const vals = columns.map(colTs => {
      const entry = entryForColumn(entries, colTs, timeBand)
      const raw = entry?.data?.[row.field_id]
      return raw !== undefined && raw !== null && raw !== '' ? parseFloat(raw) : null
    }).filter(v => v !== null)

    if (!vals.length) return { ...row, min: null, max: null, avg: null }
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    return { ...row, min, max, avg: Math.round(avg * 10) / 10 }
  })

  const copyText = () => {
    const lines = ['=== Shift Handover Summary ===', '']
    for (const s of stats) {
      if (s.min !== null) {
        lines.push(`${s.label}${s.unit ? ` (${s.unit})` : ''}: Min ${s.min} | Max ${s.max} | Avg ${s.avg}`)
      }
    }
    lines.push('')
    lines.push(`Generated: ${new Date().toLocaleString('en-IN')}`)
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Shift Summary</h3>
        <button
          onClick={copyText}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-600 hover:bg-gray-50"
        >
          {copied ? <CheckCircle2 size={13} className="text-green-600" /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy Summary'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Parameter</th>
              <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Min</th>
              <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Max</th>
              <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Avg</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stats.map(s => (
              <tr key={s.field_id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-700">
                  {s.label}
                  {s.unit && <span className="text-gray-400 text-xs ml-1">({s.unit})</span>}
                </td>
                <td className="px-3 py-2 text-center text-gray-700 font-mono">{s.min !== null ? s.min : '—'}</td>
                <td className="px-3 py-2 text-center text-gray-700 font-mono">{s.max !== null ? s.max : '—'}</td>
                <td className="px-3 py-2 text-center text-gray-700 font-mono">{s.avg !== null ? s.avg : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Entry Sidebar ─────────────────────────────────────────────────────────────

function EntrySidebar({ entries, onHighlight, highlighted, onClose }) {
  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-white border-l border-gray-200 shadow-2xl z-40 flex flex-col print:hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <h3 className="font-bold text-gray-800" style={{ color: '#0F2557' }}>All Entries</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><XIcon size={18} /></button>
      </div>
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-2">
        {entries.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">No entries yet</p>
        )}
        {entries.map((entry, i) => {
          const colTs = new Date(entry.charted_at).getTime()
          const isHl = highlighted === colTs
          const fieldCount = Object.keys(entry.data || {}).length
          return (
            <button
              key={entry.id || i}
              onClick={() => onHighlight(isHl ? null : colTs)}
              className={`w-full text-left rounded-xl p-3 border transition-all ${isHl ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-800">{fmtDateTime(entry.charted_at)}</span>
                <span className="text-xs text-gray-400">{timeAgo(entry.charted_at)}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {entry.submitted_by_name || entry.submitted_by || 'Unknown'} • {fieldCount} field{fieldCount !== 1 ? 's' : ''}
              </div>
              <div className="text-xs mt-1" style={{ color: '#F5821E' }}>{getShift(entry.charted_at)}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Inline Cell Editor ────────────────────────────────────────────────────────

function CellEditor({ fieldId, columnTime, rowLabel, unit, onSave, onCancel, formId, patientId, admissionId }) {
  const [value, setValue] = useState('')
  const [chartAt, setChartAt] = useState(() => {
    const d = new Date()
    return d.toISOString().slice(0, 16)
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async e => {
    e.preventDefault()
    if (!value.trim()) return
    setSaving(true); setErr('')
    try {
      await api.post('/provider/forms/submit', {
        form_id: formId,
        patient_id: patientId,
        admission_id: admissionId,
        charted_at: new Date(chartAt).toISOString(),
        data: { [fieldId]: value },
      })
      onSave()
    } catch (ex) {
      setErr(ex?.response?.data?.detail || ex.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} onClick={e => e.stopPropagation()} className="absolute z-30 bg-white border border-blue-300 rounded-xl shadow-xl p-3 w-56 top-0 left-0" style={{ minWidth: 200 }}>
      <div className="text-xs font-semibold text-gray-700 mb-2">{rowLabel}{unit ? ` (${unit})` : ''}</div>
      <input
        autoFocus
        type="number"
        step="any"
        placeholder="New value"
        value={value}
        onChange={e => setValue(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2"
      />
      <label className="block text-xs text-gray-500 mb-1">Chart at</label>
      <input
        type="datetime-local"
        value={chartAt}
        onChange={e => setChartAt(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2"
      />
      {err && <p className="text-xs text-red-600 mb-2">{err}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 px-2 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={saving} className="flex-1 px-2 py-1.5 rounded-lg text-xs font-medium text-white hover:opacity-90" style={{ background: '#0F2557' }}>
          {saving ? '…' : 'Save'}
        </button>
      </div>
    </form>
  )
}

// ── Row Group ─────────────────────────────────────────────────────────────────

function RowGroup({ group, rows, columns, entries, timeBand, filterAbnormal, editCell, editValue,
  onCellClick, onCancelEdit, onSaveEdit, onGraphClick, highlighted, formId, patientId, admissionId }) {
  const [collapsed, setCollapsed] = useState(false)

  const visibleRows = filterAbnormal
    ? rows.filter(row =>
        columns.some(colTs => {
          const entry = entryForColumn(entries, colTs, timeBand)
          const v = entry?.data?.[row.field_id]
          return evalCell(v, row.ref_range) !== 'normal' && evalCell(v, row.ref_range) !== 'empty'
        })
      )
    : rows

  if (filterAbnormal && !visibleRows.length) return null

  return (
    <>
      {/* Group header */}
      <tr
        className="cursor-pointer select-none"
        onClick={() => setCollapsed(c => !c)}
      >
        <td
          colSpan={columns.length + 1}
          className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 bg-gray-50 border-b border-gray-200"
        >
          <div className="flex items-center gap-2">
            {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
            {group}
          </div>
        </td>
      </tr>

      {/* Rows */}
      {!collapsed && visibleRows.map(row => (
        <tr key={row.field_id} className="border-b border-gray-100 hover:bg-gray-50/50">
          {/* Sticky parameter name */}
          <td
            className="px-3 py-1.5 border-r border-gray-200 bg-white"
            style={{ position: 'sticky', left: 0, zIndex: 10, width: 200, minWidth: 200, maxWidth: 200 }}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <div className="text-xs font-medium text-gray-700 truncate">{row.label}</div>
                {row.unit && <div className="text-xs text-gray-400">{row.unit}</div>}
              </div>
              <button
                onClick={e => { e.stopPropagation(); onGraphClick(row.field_id) }}
                className="flex-shrink-0 p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-600"
                title="View trend"
              >
                <TrendingUp size={12} />
              </button>
            </div>
          </td>

          {/* Data cells */}
          {columns.map(colTs => {
            const entry = entryForColumn(entries, colTs, timeBand)
            const raw = entry?.data?.[row.field_id]
            const status = evalCell(raw, row.ref_range)
            const isEditing = editCell?.columnTime === colTs && editCell?.fieldId === row.field_id
            const isHl = highlighted === colTs

            let cellClass = 'text-gray-800'
            let bgClass = isHl ? 'bg-blue-50' : ''
            if (status === 'critical') { cellClass = 'text-red-700 font-bold'; bgClass = isHl ? 'bg-red-100' : 'bg-red-50' }
            else if (status === 'abnormal') { cellClass = 'text-yellow-700'; bgClass = isHl ? 'bg-yellow-100' : 'bg-yellow-50' }

            const displayVal = raw !== undefined && raw !== null && raw !== '' ? raw : null
            const arrow = displayVal !== null ? directionArrow(displayVal, row.ref_range) : ''

            return (
              <td
                key={colTs}
                className={`px-1 py-1.5 text-center text-xs cursor-pointer transition-colors hover:bg-blue-50/50 border-r border-gray-100 relative ${bgClass}`}
                style={{ width: 80, minWidth: 80 }}
                onClick={() => onCellClick(colTs, row.field_id)}
              >
                {isEditing && (
                  <CellEditor
                    fieldId={row.field_id}
                    columnTime={colTs}
                    rowLabel={row.label}
                    unit={row.unit}
                    onSave={onSaveEdit}
                    onCancel={onCancelEdit}
                    formId={formId}
                    patientId={patientId}
                    admissionId={admissionId}
                  />
                )}
                {displayVal !== null ? (
                  <span className={cellClass}>
                    {status === 'critical' && <span className="mr-0.5">🔴</span>}
                    {displayVal}
                    {arrow && <span className="ml-0.5">{arrow}</span>}
                  </span>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}

// ── Main iViewFlowsheet ───────────────────────────────────────────────────────

const TIME_BANDS = ['1h', '2h', '4h', '8h', '12h', '24h']

export default function IViewFlowsheet() {
  const { formId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const patientId = searchParams.get('patient_id')
  const admissionId = searchParams.get('admission_id')

  const today = new Date()
  const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(today.getDate() - 7)

  const [config, setConfig] = useState(null)
  const [entries, setEntries] = useState([])
  const [timeBand, setTimeBand] = useState('4h')
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editCell, setEditCell] = useState(null)
  const [showGraph, setShowGraph] = useState(null)
  const [filterAbnormal, setFilterAbnormal] = useState(false)
  const [dateRange, setDateRange] = useState({
    from: fmtDateInput(sevenDaysAgo),
    to: fmtDateInput(today),
  })
  const [showSidebar, setShowSidebar] = useState(false)
  const [highlighted, setHighlighted] = useState(null)
  const [showShiftSummary, setShowShiftSummary] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [autoRefreshIn, setAutoRefreshIn] = useState(300)
  const refreshTimerRef = useRef(null)
  const countdownRef = useRef(null)

  const fetchData = useCallback(async (band) => {
    setLoading(true); setError(null)
    try {
      const res = await api.get(`/provider/forms/iview/${formId}`, {
        params: {
          patient_id: patientId,
          admission_id: admissionId,
          band: band || timeBand,
        },
      })
      const cfg = res?.flowsheet_config || res?.config || res
      const ents = res?.entries || []
      setConfig(cfg)
      setEntries(ents)
      setColumns(buildColumns(ents, band || timeBand))
      setLastRefresh(new Date())
    } catch (ex) {
      const detail = ex?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : ex.message || 'Failed to load flowsheet')
    } finally { setLoading(false) }
  }, [formId, patientId, admissionId, timeBand])

  useEffect(() => { fetchData(timeBand) }, [formId, timeBand])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      fetchData(timeBand)
      setAutoRefreshIn(300)
    }, 300000)
    countdownRef.current = setInterval(() => {
      setAutoRefreshIn(v => Math.max(0, v - 1))
    }, 1000)
    return () => {
      clearInterval(refreshTimerRef.current)
      clearInterval(countdownRef.current)
    }
  }, [fetchData, timeBand])

  const handleBandChange = (band) => {
    setTimeBand(band)
    setAutoRefreshIn(300)
  }

  const handleCellClick = (colTs, fieldId) => {
    if (editCell?.columnTime === colTs && editCell?.fieldId === fieldId) {
      setEditCell(null)
    } else {
      setEditCell({ columnTime: colTs, fieldId })
    }
  }

  const handleSaveEdit = () => {
    setEditCell(null)
    fetchData(timeBand)
  }

  const exportCSV = () => {
    if (!config) return
    const headers = ['Parameter', 'Unit', ...columns.map(c => new Date(c).toLocaleString('en-IN'))]
    const rows = config.row_config.map(row => {
      const vals = columns.map(colTs => {
        const entry = entryForColumn(entries, colTs, timeBand)
        const raw = entry?.data?.[row.field_id]
        return raw !== undefined && raw !== null ? raw : ''
      })
      return [row.label, row.unit || '', ...vals]
    })
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `flowsheet-${formId}-${fmtDateInput(today)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Group rows by group field (fallback: 'General')
  const groupedRows = config ? (() => {
    const groups = {}
    for (const row of config.row_config) {
      const g = row.group || 'General'
      if (!groups[g]) groups[g] = []
      groups[g].push(row)
    }
    return groups
  })() : {}

  if (loading && !config) return <PageLoader />

  const patientName = config?.patient_name || searchParams.get('patient_name') || ''
  const title = config?.title || 'iView Flowsheet'

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @media print {
          .iview-controls { display: none !important; }
          .iview-sidebar { display: none !important; }
          .iview-table-wrap { overflow: visible !important; }
          body { font-size: 11px; }
        }
      `}</style>

      {/* Top bar */}
      <div className="iview-controls sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-900"
          >
            <ArrowLeft size={15} />Back
          </button>

          {/* Title + patient chip */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h1 className="text-base font-bold truncate" style={{ color: '#0F2557' }}>{title}</h1>
            {patientName && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 truncate">
                {patientName}
              </span>
            )}
          </div>

          {/* Time band selector */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            {TIME_BANDS.map(b => (
              <button
                key={b}
                onClick={() => handleBandChange(b)}
                className="px-2 py-1 rounded-md text-xs font-medium transition-all"
                style={timeBand === b ? { background: '#0F2557', color: 'white' } : { color: '#6b7280' }}
              >
                {b}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-1.5 text-xs">
            <input
              type="date"
              value={dateRange.from}
              onChange={e => setDateRange(r => ({ ...r, from: e.target.value }))}
              className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={e => setDateRange(r => ({ ...r, to: e.target.value }))}
              className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          {/* Abnormal toggle */}
          <button
            onClick={() => setFilterAbnormal(f => !f)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterAbnormal ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            Show Abnormal Only
          </button>

          {/* Auto-refresh indicator */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock size={12} />
            <span>{Math.floor(autoRefreshIn / 60)}:{String(autoRefreshIn % 60).padStart(2, '0')}</span>
          </div>

          {/* Refresh */}
          <button
            onClick={() => { fetchData(timeBand); setAutoRefreshIn(300) }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            title="Refresh now"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Entry sidebar */}
          <button
            onClick={() => setShowSidebar(s => !s)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            title="View entries"
          >
            {showSidebar ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
          </button>

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-600 hover:bg-gray-50"
          >
            <Download size={13} />CSV
          </button>

          {/* Print */}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-600 hover:bg-gray-50"
          >
            <Printer size={13} />Print
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 m-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={15} className="shrink-0" />{typeof error === 'string' ? error : JSON.stringify(error)}
        </div>
      )}

      {/* Flowsheet table */}
      <div className={`iview-table-wrap overflow-x-auto ${showSidebar ? 'mr-80' : ''}`}>
        {config && (
          <table className="text-sm" style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: 200 + columns.length * 80 }}>
            <thead>
              <tr className="border-b border-gray-200">
                {/* Sticky header for parameter column */}
                <th
                  className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200 bg-gray-50"
                  style={{ position: 'sticky', left: 0, zIndex: 11, width: 200, minWidth: 200 }}
                >
                  Parameter
                </th>
                {columns.map(colTs => (
                  <th
                    key={colTs}
                    className={`px-1 py-2.5 text-xs font-semibold text-gray-600 text-center border-r border-gray-200 ${isToday(colTs) ? 'bg-blue-50' : 'bg-gray-50'} ${highlighted === colTs ? 'ring-2 ring-inset ring-blue-400' : ''}`}
                    style={{ width: 80, minWidth: 80 }}
                  >
                    <div>{fmtTime(colTs)}</div>
                    {isToday(colTs) && <div className="text-xs text-blue-500 font-normal">today</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedRows).map(([group, rows]) => (
                <RowGroup
                  key={group}
                  group={group}
                  rows={rows}
                  columns={columns}
                  entries={entries}
                  timeBand={timeBand}
                  filterAbnormal={filterAbnormal}
                  editCell={editCell}
                  onCellClick={handleCellClick}
                  onCancelEdit={() => setEditCell(null)}
                  onSaveEdit={handleSaveEdit}
                  onGraphClick={fieldId => setShowGraph(fieldId)}
                  highlighted={highlighted}
                  formId={formId}
                  patientId={patientId}
                  admissionId={admissionId}
                />
              ))}
            </tbody>
          </table>
        )}

        {!loading && config && columns.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No charted data yet</p>
            <p className="text-sm mt-1">Click any cell to chart a value</p>
          </div>
        )}
      </div>

      {/* Shift Summary (collapsible) */}
      {config && entries.length > 0 && (
        <div className={`border-t border-gray-200 bg-white iview-controls ${showSidebar ? 'mr-80' : ''}`}>
          <button
            className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            onClick={() => setShowShiftSummary(s => !s)}
          >
            <span>Shift Summary</span>
            {showShiftSummary ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {showShiftSummary && (
            <div className="px-5 pb-5">
              <ShiftSummary config={config} entries={entries} columns={columns} timeBand={timeBand} />
            </div>
          )}
        </div>
      )}

      {/* Entry sidebar */}
      {showSidebar && (
        <EntrySidebar
          entries={entries}
          onHighlight={setHighlighted}
          highlighted={highlighted}
          onClose={() => setShowSidebar(false)}
        />
      )}

      {/* Trend graph popout */}
      {showGraph && config && (
        <TrendGraph
          fieldId={showGraph}
          config={config}
          entries={entries}
          columns={columns}
          timeBand={timeBand}
          onClose={() => setShowGraph(null)}
        />
      )}
    </div>
  )
}
