/**
 * @shared-pool
 * Care-Form composer — lets a clinician (provider or nurse) assemble existing
 * assessment forms into a named "care form" (care plan), scoped to their health
 * center. Field-level editing stays admin-only; this only references/sequences
 * existing forms. Backed by the durable /carechart/care-forms endpoints.
 *
 * Self-contained: pass the portal's axios-style `api` client (its interceptor
 * returns response.data). Used by the Provider portal; mirrors the CareChart
 * builder and is the canonical cross-portal version.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  X, Plus, GripVertical, Search, Loader2, Save, Edit3, Copy, Trash2,
  ChevronDown, ChevronUp, Zap, ClipboardList,
} from 'lucide-react'

const GREEN = '#059669'
const NAVY  = '#0F2557'

const CAT_CFG = {
  vitals:       { label: 'Vitals',           color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  pain:         { label: 'Pain',             color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  mental:       { label: 'Mental',           color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  mental_health:{ label: 'Mental Health',    color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  safety:       { label: 'Safety',           color: '#d97706', bg: '#fef9c3', border: '#fde047' },
  nursing:      { label: 'Nursing',          color: GREEN,     bg: '#f0fdf4', border: '#a7f3d0' },
  discharge:    { label: 'Discharge',        color: NAVY,      bg: '#eff6ff', border: '#bfdbfe' },
  surgery:      { label: 'Surgery',          color: '#db2777', bg: '#fdf2f8', border: '#f9a8d4' },
  surgical:     { label: 'Surgical',         color: '#db2777', bg: '#fdf2f8', border: '#f9a8d4' },
  general:      { label: 'General',          color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
  admission:    { label: 'Admission',        color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4' },
  intake:       { label: 'Intake',           color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4' },
  respiratory:  { label: 'Respiratory',      color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  cardiology:   { label: 'Cardiology',       color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  ent:          { label: 'ENT',              color: '#ea580c', bg: '#fff7ed', border: '#fdba74' },
  gastro:       { label: 'Gastroenterology', color: '#ca8a04', bg: '#fefce8', border: '#fde047' },
  orthopedic:   { label: 'Orthopedics',      color: '#78716c', bg: '#fafaf9', border: '#d6d3d1' },
  obg:          { label: 'OBG',              color: '#db2777', bg: '#fdf2f8', border: '#f9a8d4' },
  pediatrics:   { label: 'Pediatrics',       color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  clinical:     { label: 'Clinical',         color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4' },
  history:      { label: 'History',          color: '#b45309', bg: '#fffbeb', border: '#fcd34d' },
  systems:      { label: 'Systems',          color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  specialty:    { label: 'Specialty',        color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe' },
  custom:       { label: 'Custom',           color: '#065F46', bg: '#f0fdf4', border: '#a7f3d0' },
}

function CatChip({ cat, small }) {
  const c = CAT_CFG[cat] || CAT_CFG.general
  return (
    <span className={`inline-flex items-center font-bold rounded-full border ${small ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'}`}
      style={{ background: c.bg, color: c.color, borderColor: c.border }}>
      {c.label}
    </span>
  )
}

const OPERATORS = ['equals', 'not equals', 'greater than', 'less than', 'contains', 'is filled', 'is empty']
const ACTIONS   = ['Show next form', 'Skip next form', 'Trigger alert', 'Notify doctor', 'Mark STAT']
const FREQ_OPTS = ['Once', 'Every 1h', 'Every 2h', 'Every 4h', 'Every 6h', 'Every 8h', 'Every 12h', 'Daily', 'Each shift', 'Per dressing', 'As needed']

// Normalize an /assessment-forms list row → the shape the library uses.
function normLib(f) {
  return {
    id:           f.id,
    name:         f.title || f.name || 'Untitled form',
    category:     f.category || 'general',
    fields_count: f.question_count ?? f.fields_count ?? 0,
  }
}

function ConditionRow({ condition, onUpdate, onRemove, forms }) {
  const [c, setC] = useState(condition || { form_id: '', field: '', operator: 'greater than', value: '', action: 'Trigger alert' })
  const update = (k, v) => { const n = { ...c, [k]: v }; setC(n); onUpdate(n) }
  const inputCls = "border rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none flex-1 min-w-0"
  return (
    <div className="flex items-center gap-2 flex-wrap bg-gray-50 rounded-xl p-2.5 border" style={{ borderColor: '#e9eaec' }}>
      <span className="text-[10px] font-bold text-gray-400 uppercase">IF</span>
      <select value={c.form_id} onChange={e => update('form_id', e.target.value)}
        className={inputCls} style={{ borderColor: '#e5e7eb', minWidth: 120 }}>
        <option value="">Select form…</option>
        {forms.map(f => <option key={f.form_id} value={f.form_id}>{f.name}</option>)}
      </select>
      <input value={c.field || ''} onChange={e => update('field', e.target.value)}
        placeholder="field ID…" className={inputCls} style={{ borderColor: '#e5e7eb', maxWidth: 100 }}
        title="Field ID within the selected form (e.g. score, bmi)" />
      <select value={c.operator} onChange={e => update('operator', e.target.value)}
        className={inputCls} style={{ borderColor: '#e5e7eb', minWidth: 100 }}>
        {OPERATORS.map(o => <option key={o}>{o}</option>)}
      </select>
      <input value={c.value} onChange={e => update('value', e.target.value)}
        placeholder="value…" className={inputCls} style={{ borderColor: '#e5e7eb', maxWidth: 80 }} />
      <span className="text-[10px] font-bold text-gray-400 uppercase">→</span>
      <select value={c.action} onChange={e => update('action', e.target.value)}
        className={inputCls} style={{ borderColor: '#e5e7eb', minWidth: 120 }}>
        {ACTIONS.map(a => <option key={a}>{a}</option>)}
      </select>
      <button onClick={onRemove} className="text-gray-300 hover:text-red-400 flex-shrink-0"><X size={13} /></button>
    </div>
  )
}

function CareFormBuilder({ api, careForm, allForms, onSaved, onClose }) {
  const isNew = !careForm.id || careForm.id === '__new__'
  const [name, setName]           = useState(careForm.name || '')
  const [desc, setDesc]           = useState(careForm.description || '')
  const [color, setColor]         = useState(careForm.color || GREEN)
  const [forms, setForms]         = useState(careForm.forms || [])
  const [conditions, setConditions] = useState(() => {
    // Backend always returns structured objects in `conditions` (and mirrors to `alerts`).
    // Never wrap in {raw:} — that corrupts round-trip editing.
    const src = careForm.conditions || careForm.alerts || []
    return Array.isArray(src) ? src : []
  })
  const [search, setSearch]       = useState('')
  const [saving, setSaving]       = useState(false)
  const dragItem = useRef(null)
  const dragOver = useRef(null)

  const filteredLib = allForms.filter(f =>
    !forms.find(cf => cf.form_id === f.id) &&
    ((f.name || '').toLowerCase().includes(search.toLowerCase()) ||
     (f.category || '').toLowerCase().includes(search.toLowerCase()))
  )

  const addForm = (f) => setForms(prev => [...prev, { form_id: f.id, name: f.name, freq: 'Once', condition: null, _cat: f.category }])
  const removeForm = (idx) => setForms(prev => prev.filter((_, i) => i !== idx))
  const updateFreq = (idx, freq) => setForms(prev => prev.map((f, i) => i === idx ? { ...f, freq } : f))
  const updateCond = (idx, cond) => setForms(prev => prev.map((f, i) => i === idx ? { ...f, condition: cond } : f))

  const onDragStart = (idx) => { dragItem.current = idx }
  const onDragEnter = (idx) => { dragOver.current = idx }
  const onDragEnd   = () => {
    if (dragItem.current == null || dragOver.current == null) return
    const list = [...forms]
    const dragged = list.splice(dragItem.current, 1)[0]
    list.splice(dragOver.current, 0, dragged)
    setForms(list)
    dragItem.current = null; dragOver.current = null
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { name, description: desc, color, forms, conditions }
      const saved = isNew
        ? await api.post('/carechart/care-forms', payload)
        : await api.put(`/carechart/care-forms/${careForm.id}`, payload)
      onSaved(saved)
    } catch (e) {
      // Surface failure rather than silently faking success.
      alert(e?.message || 'Failed to save care form. Please try again.')
    } finally { setSaving(false) }
  }

  const COLORS = [GREEN, NAVY, '#7c3aed', '#db2777', '#0891b2', '#d97706', '#dc2626', '#0f766e']

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(15,37,87,0.45)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-[640px] max-w-full h-full bg-white flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Head */}
        <div className="flex-shrink-0 px-5 py-4 flex items-start justify-between border-b" style={{ borderColor: '#f3f4f6', background: color }}>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {isNew ? 'New Care Form' : 'Edit Care Form'}
            </div>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Care form name…"
              className="text-lg font-extrabold bg-transparent border-none outline-none text-white placeholder-white/40 w-full" />
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white mt-1"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left — form sequence */}
          <div className="flex-1 flex flex-col overflow-hidden border-r" style={{ borderColor: '#f0f0f0' }}>
            <div className="flex-shrink-0 px-4 py-3 border-b" style={{ borderColor: '#f3f4f6' }}>
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">Form Sequence</div>
              <p className="text-[10px] text-gray-400">Drag to reorder. Each form runs in sequence.</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {forms.length === 0 && (
                <div className="flex flex-col items-center justify-center h-32 text-gray-300 gap-2 border-2 border-dashed rounded-xl" style={{ borderColor: '#e5e7eb' }}>
                  <Plus size={20} />
                  <span className="text-xs">Add forms from library →</span>
                </div>
              )}
              {forms.map((f, idx) => (
                <div key={`${f.form_id}-${idx}`}
                  draggable
                  onDragStart={() => onDragStart(idx)}
                  onDragEnter={() => onDragEnter(idx)}
                  onDragEnd={onDragEnd}
                  onDragOver={e => e.preventDefault()}
                  className="rounded-xl border bg-white overflow-hidden cursor-grab active:cursor-grabbing"
                  style={{ borderColor: '#e9eaec' }}>
                  <div className="flex items-center gap-2 px-3 py-2.5">
                    <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
                    <span className="text-[10px] font-black text-gray-400 w-5 flex-shrink-0">{idx + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-gray-900 truncate">{f.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <CatChip cat={f._cat} small />
                        <select value={f.freq} onChange={e => updateFreq(idx, e.target.value)}
                          onClick={e => e.stopPropagation()}
                          className="text-[9px] font-bold border rounded-lg px-1.5 py-0.5 bg-white focus:outline-none text-gray-600"
                          style={{ borderColor: '#e5e7eb' }}>
                          {FREQ_OPTS.map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
                    <button onClick={() => removeForm(idx)} className="text-gray-300 hover:text-red-400 flex-shrink-0"><X size={13} /></button>
                  </div>
                  <div className="px-3 pb-2.5">
                    <input
                      value={f.condition || ''}
                      onChange={e => updateCond(idx, e.target.value)}
                      placeholder="Condition to show (e.g. IF Post-Op = Yes)…"
                      className="w-full border rounded-lg px-2.5 py-1.5 text-[10px] bg-gray-50 focus:outline-none"
                      style={{ borderColor: '#f0f0f0' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Alert conditions */}
            <div className="flex-shrink-0 border-t p-4" style={{ borderColor: '#f3f4f6' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Alert Conditions</span>
                <button onClick={() => setConditions(prev => [...prev, {}])}
                  className="text-[10px] font-bold flex items-center gap-1 px-2 py-1 rounded-lg"
                  style={{ color: GREEN, background: '#f0fdf4' }}>
                  <Plus size={10} /> Add Condition
                </button>
              </div>
              <div className="flex flex-col gap-2 max-h-36 overflow-y-auto">
                {conditions.map((c, i) => (
                  <ConditionRow key={i} condition={c} forms={forms}
                    onUpdate={v => setConditions(prev => prev.map((x, j) => j === i ? v : x))}
                    onRemove={() => setConditions(prev => prev.filter((_, j) => j !== i))} />
                ))}
                {conditions.length === 0 && (
                  <p className="text-[10px] text-gray-300 text-center py-2">No alert conditions — add one above</p>
                )}
              </div>
            </div>
          </div>

          {/* Right — form library */}
          <div className="w-56 flex-shrink-0 flex flex-col overflow-hidden" style={{ background: '#fafaf9' }}>
            <div className="flex-shrink-0 px-3 py-3 border-b" style={{ borderColor: '#f3f4f6' }}>
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-2">Assessment Library</div>
              <div className="relative">
                <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search forms…"
                  className="w-full pl-6 pr-2 py-1.5 border rounded-lg text-[11px] bg-white focus:outline-none"
                  style={{ borderColor: '#e5e7eb' }} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
              {filteredLib.map(f => (
                <button key={f.id} onClick={() => addForm(f)}
                  className="text-left px-2.5 py-2 rounded-lg border bg-white hover:border-green-300 transition-colors group"
                  style={{ borderColor: '#f0f0f0' }}>
                  <div className="text-[11px] font-semibold text-gray-800 group-hover:text-gray-900 leading-tight">{f.name}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <CatChip cat={f.category} small />
                    <span className="text-[9px] text-gray-400">{f.fields_count}f</span>
                  </div>
                </button>
              ))}
              {filteredLib.length === 0 && (
                <p className="text-[10px] text-gray-300 text-center py-4">{allForms.length ? 'All forms added' : 'No forms available'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Desc + colour + footer */}
        <div className="flex-shrink-0 border-t p-4 flex flex-col gap-3" style={{ borderColor: '#f3f4f6' }}>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Description</label>
              <input value={desc} onChange={e => setDesc(e.target.value)}
                placeholder="Brief description of this care form…"
                className="w-full border rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none mt-1"
                style={{ borderColor: '#e5e7eb' }} />
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Colour</label>
              <div className="flex gap-1 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)}
                    className="w-5 h-5 rounded-full border-2 transition-all"
                    style={{ background: c, borderColor: color === c ? 'white' : 'transparent', outline: color === c ? `2px solid ${c}` : 'none' }} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 py-2 rounded-lg text-xs font-semibold border text-gray-600"
              style={{ borderColor: '#e5e7eb' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={!name.trim() || saving}
              className="flex-[2] flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold text-white"
              style={{ background: name.trim() ? color : '#d1d5db' }}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {isNew ? 'Create Care Form' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CareFormCard({ cf, onEdit, onClone, onDelete, onTogglePublish }) {
  const [expanded, setExpanded] = useState(false)
  const alerts = cf.alerts || cf.conditions || []
  return (
    <div className="bg-white rounded-2xl border overflow-hidden transition-all" style={{ borderColor: '#e9eaec' }}>
      <div className="h-1 w-full" style={{ background: cf.color || GREEN }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-extrabold text-gray-900 truncate">{cf.name}</span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                style={cf.published
                  ? { background: '#dcfce7', color: '#15803d', borderColor: '#a7f3d0' }
                  : { background: '#f3f4f6', color: '#6b7280', borderColor: '#e5e7eb' }}>
                {cf.published ? '● Published' : '○ Draft'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{cf.description}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => onEdit(cf)} className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-gray-50" style={{ borderColor: '#e5e7eb' }}>
              <Edit3 size={12} className="text-gray-500" />
            </button>
            <button onClick={() => onClone(cf)} className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-gray-50" style={{ borderColor: '#e5e7eb' }}>
              <Copy size={12} className="text-gray-500" />
            </button>
            <button onClick={() => onDelete(cf.id)} className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-red-50" style={{ borderColor: '#e5e7eb' }}>
              <Trash2 size={12} className="text-gray-400 hover:text-red-500" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-3">
          <span className="text-[10px] text-gray-400"><span className="font-bold text-gray-700">{cf.forms?.length || 0}</span> forms</span>
          {alerts.length > 0 && (
            <span className="text-[10px] font-bold" style={{ color: '#d97706' }}>
              {alerts.length} alert rule{alerts.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {(cf.forms || []).map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border bg-gray-50" style={{ borderColor: '#e9eaec', color: '#374151' }}>
              <span className="text-gray-400 font-normal">{i + 1}.</span> {f.name}
              {f.condition && f.condition !== 'Always' && (
                <span className="text-[8px] font-bold px-1 rounded" style={{ background: '#fef9c3', color: '#a16207' }}>cond</span>
              )}
            </span>
          ))}
        </div>

        {alerts.length > 0 && (
          <>
            <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-gray-600 transition-colors">
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {expanded ? 'Hide' : 'Show'} alert conditions
            </button>
            {expanded && (
              <div className="mt-2 flex flex-col gap-1.5">
                {alerts.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px]" style={{ background: '#fef9c3', color: '#a16207' }}>
                    <Zap size={9} /> {typeof a === 'string' ? a : (a.raw || `${a.form_id || ''} ${a.operator || ''} ${a.value || ''} → ${a.action || ''}`)}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <button onClick={() => onTogglePublish(cf)}
          className="mt-3 w-full py-1.5 rounded-lg text-[11px] font-bold border transition-colors"
          style={cf.published
            ? { borderColor: '#e5e7eb', color: '#6b7280' }
            : { borderColor: '#a7f3d0', color: '#15803d', background: '#f0fdf4' }}>
          {cf.published ? 'Unpublish' : 'Publish to portals'}
        </button>
      </div>
    </div>
  )
}

/**
 * CareFormsManager — full management surface: lists this center's care forms,
 * opens the builder to create/edit/clone, and publishes/deletes. Drop into any
 * staff portal. Pass the portal's `api` client.
 */
export default function CareFormsManager({ api }) {
  const [careForms, setCareForms] = useState([])
  const [allForms, setAllForms]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [builder, setBuilder]     = useState(null)   // careForm being edited, or {id:'__new__'}

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let clinicId = null
      try { const me = await api.get('/auth/staff/me'); clinicId = me?.clinic_id ?? null } catch { /* unscoped */ }
      const params = { status: 'published', limit: 1000 }
      if (clinicId != null) params.clinic_id = clinicId
      const [pool, cf] = await Promise.all([
        api.get('/assessment-forms/', { params }).catch(() => null),
        api.get('/carechart/care-forms').catch(() => null),
      ])
      setAllForms((pool?.forms || []).map(normLib))
      setCareForms(Array.isArray(cf) ? cf : (cf?.items || []))
    } catch {
      setAllForms([]); setCareForms([])
    } finally { setLoading(false) }
  }, [api])

  useEffect(() => { load() }, [load])

  const onSaved = (saved) => {
    setBuilder(null)
    if (!saved || !saved.id) { load(); return }
    setCareForms(prev => {
      const exists = prev.some(c => c.id === saved.id)
      return exists ? prev.map(c => c.id === saved.id ? saved : c) : [saved, ...prev]
    })
  }
  const handleDelete = async (id) => {
    setCareForms(prev => prev.filter(c => c.id !== id))
    try {
      await api.delete(`/carechart/care-forms/${id}`)
    } catch {
      await load()   // restore on failure
      alert('Failed to delete care form. Please try again.')
    }
  }
  const handleClone = (cf) => {
    setBuilder({ ...cf, id: '__new__', name: `${cf.name} (copy)`, published: false })
  }
  const handleTogglePublish = async (cf) => {
    const updated = { ...cf, published: !cf.published }
    setCareForms(prev => prev.map(c => c.id === cf.id ? updated : c))
    try {
      await api.post(`/carechart/care-forms/${cf.id}/${cf.published ? 'unpublish' : 'publish'}`)
    } catch {
      await load()   // restore on failure
      alert(`Failed to ${cf.published ? 'unpublish' : 'publish'} care form. Please try again.`)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 flex items-center justify-between px-1 pb-3">
        <div>
          <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
            <ClipboardList size={17} style={{ color: GREEN }} /> Care Forms
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Bundle existing assessment forms into a care plan for your health center.</p>
        </div>
        <button onClick={() => setBuilder({ id: '__new__' })}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white"
          style={{ background: GREEN }}>
          <Plus size={14} /> New Care Form
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-1">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin" style={{ color: GREEN }} /></div>
        ) : careForms.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-2xl" style={{ borderColor: '#e5e7eb' }}>
            <ClipboardList size={28} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold text-gray-500">No care forms yet</p>
            <p className="text-xs text-gray-400 mt-1">Create one to combine multiple assessment forms into a care plan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pb-6">
            {careForms.map(cf => (
              <CareFormCard key={cf.id} cf={cf}
                onEdit={setBuilder}
                onClone={handleClone}
                onDelete={handleDelete}
                onTogglePublish={handleTogglePublish} />
            ))}
          </div>
        )}
      </div>

      {builder && (
        <CareFormBuilder api={api} careForm={builder} allForms={allForms} onSaved={onSaved} onClose={() => setBuilder(null)} />
      )}
    </div>
  )
}
