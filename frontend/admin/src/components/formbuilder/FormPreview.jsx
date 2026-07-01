import { useState } from 'react'
import { Pill, UserCog, Search, PenLine, Camera, Paperclip, Table, User, RefreshCw, Calculator } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// FormPreview — a live WYSIWYG preview of a CareForm in the builder. Renders the
// schema exactly as a clinician would see it: free 12-col grid placement, real
// controls, and working show/hide conditions (click an answer → dependent fields
// reveal). Smart/portal-bound fields (Rx order, patient info, searches) show a
// labelled placeholder since they need a live patient/portal.
// ─────────────────────────────────────────────────────────────────────────────

const GRID_COLS = 12, ROW_H = 60, GAP = 8

// ── conditions (mirror the fill renderers) ──────────────────────────────────
function evalCond(c, data) {
  const v = data[c.field_id]
  switch (c.operator) {
    case 'equals':       return String(v) === String(c.value)
    case 'not_equals':   return String(v) !== String(c.value)
    case 'contains':     return String(v || '').includes(String(c.value))
    case 'greater_than': return Number(v) > Number(c.value)
    case 'less_than':    return Number(v) < Number(c.value)
    case 'is_empty':     return v === undefined || v === null || v === ''
    case 'is_not_empty': return v !== undefined && v !== null && v !== ''
    default: return true
  }
}
function isVisible(field, data) {
  if (!field.conditions || !field.conditions.length) return true
  const logic = field.condition_logic || 'ALL'
  return logic === 'ALL' ? field.conditions.every(c => evalCond(c, data)) : field.conditions.some(c => evalCond(c, data))
}

// ── grid placement (collapse hidden rows) ───────────────────────────────────
function sectionHasLayout(fields) { return fields.some(f => f.layout && Number.isFinite(f.layout.w)) }
function buildRowMap(visible) {
  const ys = [...new Set(visible.map(f => (f.layout && Number.isFinite(f.layout.y)) ? f.layout.y : 0))].sort((a, b) => a - b)
  return new Map(ys.map((y, i) => [y, i]))
}
function cellStyle(field, rowMap) {
  const l = field.layout || {}
  const x = Number.isFinite(l.x) ? l.x : 0, w = Number.isFinite(l.w) ? l.w : GRID_COLS, h = Number.isFinite(l.h) ? l.h : 1
  return { gridColumn: `${x + 1} / span ${Math.min(w, GRID_COLS)}`, gridRow: `${(rowMap.get(l.y || 0) || 0) + 1} / span ${h}` }
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5821E]'

function Placeholder({ icon: Icon, label, note }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
      <Icon size={14} className="text-gray-400" /> <span className="font-medium text-gray-600">{label}</span>
      {note && <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-400">{note}</span>}
    </div>
  )
}

function PreviewField({ field, value, onChange }) {
  const t = field.type
  const opts = field.options || []
  const label = (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {field.label}{field.required && <span className="text-[#F5821E]"> *</span>}
    </label>
  )

  if (t === 'label' || t === 'heading') return <h4 className="text-sm font-bold text-gray-700">{field.label}</h4>
  if (t === 'divider')   return <hr className="border-gray-200" />
  if (t === 'paragraph' || t === 'rich_text')
    return <div className="text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: field.content || field.label || '' }} />
  if (t === 'stage_break')
    return <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide"><span className="flex-1 border-t border-dashed border-gray-300" />{field.stage_title || field.label}<span className="flex-1 border-t border-dashed border-gray-300" /></div>

  if (t === 'medication_order') return <Placeholder icon={Pill} label={field.label || 'Rx Order'} note="live in portal" />
  if (t === 'patient_auto')     return <Placeholder icon={UserCog} label={`${field.label || 'Patient info'} (${field.auto_source || 'age'})`} note="auto" />
  if (/_search$/.test(t) || t === 'snomed' || t === 'loinc') return <div>{label}<Placeholder icon={Search} label={field.placeholder || 'Search…'} note={t.replace('_search', '')} /></div>
  if (t === 'signature') return <div>{label}<Placeholder icon={PenLine} label="Signature" /></div>
  if (t === 'photo')     return <div>{label}<Placeholder icon={Camera} label="Photo capture" /></div>
  if (t === 'file')      return <div>{label}<Placeholder icon={Paperclip} label="File upload" /></div>
  if (t === 'table' || t === 'matrix') return <div>{label}<Placeholder icon={Table} label={`${t} grid`} /></div>
  if (t === 'body_map')  return <div>{label}<Placeholder icon={User} label="Body map" /></div>
  if (t === 'repeating') return <div>{label}<Placeholder icon={RefreshCw} label="Repeating group" /></div>
  if (t === 'calculated' || t === 'score_display' || t === 'vital_auto')
    return <div>{label}<Placeholder icon={Calculator} label={field.formula ? `= ${field.formula}` : (field.label || 'computed')} note="auto" /></div>

  if (t === 'textarea') return <div>{label}<textarea rows={field.rows || 3} className={inputCls} placeholder={field.placeholder} value={value || ''} onChange={e => onChange(e.target.value)} /></div>
  if (t === 'number' || t === 'numeric_range')
    return <div>{label}<div className="flex items-center gap-2"><input type="number" className={inputCls} placeholder={field.placeholder} value={value || ''} onChange={e => onChange(e.target.value)} />{field.unit && <span className="text-sm text-gray-500">{field.unit}</span>}</div></div>
  if (t === 'date' || t === 'time' || t === 'datetime')
    return <div>{label}<input type={t === 'datetime' ? 'datetime-local' : t} className={inputCls} value={value || ''} onChange={e => onChange(e.target.value)} /></div>
  if (t === 'dropdown') {
    // Multi-select preview renders as a checkbox chip list; single stays a select.
    // Searchable is indicated with a magnifier hint since preview is static.
    if (field.multi_select) {
      const arr = Array.isArray(value) ? value : (value ? [value] : [])
      const toggle = v => onChange(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])
      return <div>{label}<div className="flex flex-wrap gap-1.5">{opts.map((o, i) => (
        <button key={i} type="button" onClick={() => toggle(o.value)}
          className={`px-2.5 py-1 rounded-lg text-sm border transition-all ${arr.includes(o.value) ? 'bg-[#F5821E] text-white border-[#F5821E]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#F5821E]'}`}>{o.label}</button>
      ))}</div>{field.searchable !== false && <p className="text-[10px] text-gray-400 mt-1">🔍 searchable · multi-select</p>}</div>
    }
    return <div>{label}<select className={inputCls} value={value || ''} onChange={e => onChange(e.target.value)}><option value="">Select…</option>{opts.map((o, i) => <option key={i} value={o.value}>{o.label}</option>)}</select>{field.searchable !== false && <p className="text-[10px] text-gray-400 mt-1">🔍 searchable</p>}</div>
  }
  if (t === 'radio' || t === 'single_choice' || t === 'yes_no') {
    const list = (t === 'yes_no' && !opts.length) ? [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }] : opts
    return <div>{label}<div className="flex flex-wrap gap-1.5">{list.map((o, i) => (
      <button key={i} type="button" onClick={() => onChange(value === o.value ? '' : o.value)}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${value === o.value ? 'bg-[#F5821E] text-white border-[#F5821E]' : 'bg-white text-gray-600 border-gray-300 hover:border-[#F5821E]'}`}>{o.label}</button>
    ))}</div></div>
  }
  if (t === 'checkbox' || t === 'multi_choice') {
    const arr = Array.isArray(value) ? value : []
    const toggle = v => onChange(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])
    return <div>{label}<div className="grid grid-cols-2 gap-1.5">{opts.map((o, i) => (
      <label key={i} className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={arr.includes(o.value)} onChange={() => toggle(o.value)} className="accent-[#F5821E]" />{o.label}</label>
    ))}</div></div>
  }
  if (t === 'scale') {
    const mn = field.min ?? 0, mx = field.max ?? 10
    return <div>{label}<div className="flex flex-wrap gap-1">{Array.from({ length: mx - mn + 1 }, (_, i) => mn + i).map(n => (
      <button key={n} type="button" onClick={() => onChange(value === String(n) ? '' : String(n))}
        className={`w-9 h-9 rounded-lg border text-sm font-bold ${value === String(n) ? 'bg-[#F5821E] text-white border-[#F5821E]' : 'bg-gray-50 text-gray-700 border-gray-300'}`}>{n}</button>
    ))}</div></div>
  }
  // text + fallback
  return <div>{label}<input type="text" className={inputCls} placeholder={field.placeholder} value={value || ''} onChange={e => onChange(e.target.value)} /></div>
}

export default function FormPreview({ schema }) {
  const [data, setData] = useState({})
  const set = (fid, v) => setData(d => ({ ...d, [fid]: v }))
  const sections = schema?.sections || []

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      <div className="text-xs text-gray-400 text-center">Preview — interactive (try the answers; conditional fields reveal). Smart fields run live in the clinical portals.</div>
      {sections.map(section => {
        const fields = section.fields || []
        const visible = fields.filter(f => isVisible(f, data))
        const useGrid = sectionHasLayout(fields)
        const rowMap = useGrid ? buildRowMap(visible) : null
        const accent = section.header_color
        return (
          <div key={section.id} className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200" style={accent ? { backgroundColor: accent + '1f' } : { background: '#f9fafb' }}>
              <h3 className="font-semibold text-sm" style={accent ? { color: accent } : { color: '#374151' }}>{section.title}</h3>
              {section.description && <p className="text-xs text-gray-500 mt-0.5">{section.description}</p>}
            </div>
            <div className={useGrid ? 'p-4' : 'p-4 grid grid-cols-1 sm:grid-cols-2 gap-4'}
                 style={useGrid ? { display: 'grid', gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0,1fr))`, gap: '1rem', alignItems: 'start' } : undefined}>
              {visible.map(field => (
                <div key={field.id} style={useGrid ? cellStyle(field, rowMap) : undefined}>
                  <PreviewField field={field} value={data[field.field_id]} onChange={v => set(field.field_id, v)} />
                </div>
              ))}
            </div>
          </div>
        )
      })}
      {sections.length === 0 && <p className="text-center text-sm text-gray-400 py-12">Add sections and fields to preview the form.</p>}
    </div>
  )
}
