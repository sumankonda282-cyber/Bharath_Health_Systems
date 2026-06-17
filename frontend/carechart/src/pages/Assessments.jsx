import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Search, Plus, X, ChevronDown, ChevronUp, GripVertical,
  Edit3, Copy, Trash2, CheckCircle, AlertTriangle, Loader2,
  FileText, Zap, List, ClipboardList, Settings, Eye,
  Lock, ArrowRight, ToggleLeft, ToggleRight, Save, BookOpen, ExternalLink
} from 'lucide-react'
import { useWardSession } from '../contexts/WardSessionContext'
import api from '../api/client'
import FormRenderer from '../components/assessments/FormRenderer'

const GREEN = '#065F46'
const NAVY  = '#0F2557'
const RED   = '#CC1414'

// ── Category config ───────────────────────────────────────────────────────────
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

// ── Fallback mock assessment library (used when API returns empty) ─────────────
const MOCK_FORMS = [
  { id: 'f1',  name: 'Vitals Assessment',            category: 'vitals',     status: 'published', is_template: true,  description: 'BP, HR, SpO₂, Temp, RR, Weight, Pain score', fields_count: 11, iview_enabled: true,  freq: '4-hourly' },
  { id: 'f2',  name: 'Patient Details',              category: 'admission',  status: 'published', is_template: false, description: 'Demographics, contact, NOK, insurance details', fields_count: 18, iview_enabled: false, freq: null },
  { id: 'f3',  name: 'Asthma Control Score (ACT)',   category: 'respiratory',status: 'published', is_template: false, description: 'Asthma Control Test — 5-item score (5–25)', fields_count: 5,  iview_enabled: false, freq: null },
  { id: 'f4',  name: 'Glasgow Coma Scale (GCS)',     category: 'safety',     status: 'published', is_template: true,  description: 'Eye, Verbal, Motor scoring (3–15)', fields_count: 4,  iview_enabled: true,  freq: '4-hourly' },
  { id: 'f5',  name: 'Morse Fall Risk Scale',        category: 'safety',     status: 'published', is_template: true,  description: '6-item fall risk — Low / Medium / High', fields_count: 7,  iview_enabled: false, freq: null },
  { id: 'f6',  name: 'Comprehensive Pain Assessment',category: 'pain',       status: 'published', is_template: true,  description: 'NRS 0–10, location, character, onset', fields_count: 9,  iview_enabled: false, freq: null },
  { id: 'f7',  name: 'PHQ-9 Depression Screening',  category: 'mental',     status: 'published', is_template: true,  description: '9-item depression screening with scoring', fields_count: 10, iview_enabled: false, freq: null },
  { id: 'f8',  name: 'GAD-7 Anxiety Screening',     category: 'mental',     status: 'published', is_template: true,  description: '7-item anxiety disorder screening', fields_count: 8,  iview_enabled: false, freq: null },
  { id: 'f9',  name: 'Nursing Admission Assessment', category: 'nursing',    status: 'published', is_template: true,  description: 'Full admission workup — history, systems, skin, orientation', fields_count: 24, iview_enabled: false, freq: null },
  { id: 'f10', name: 'SOAP Note Structured',         category: 'general',    status: 'published', is_template: true,  description: 'S-O-A-P clinical documentation', fields_count: 16, iview_enabled: false, freq: null },
  { id: 'f11', name: 'Discharge Checklist',          category: 'discharge',  status: 'published', is_template: true,  description: 'Discharge summary, meds, instructions, follow-up', fields_count: 20, iview_enabled: false, freq: null, requires_cosign: true },
  { id: 'f12', name: 'Pre-Operative Assessment',     category: 'surgery',    status: 'published', is_template: true,  description: 'ASA grade, anaesthesia plan, pre-op checklist', fields_count: 22, iview_enabled: false, freq: null, requires_cosign: true },
  { id: 'f13', name: 'Wound & Pressure Injury',      category: 'general',    status: 'published', is_template: true,  description: 'Wound stage, measurements, exudate, dressing', fields_count: 14, iview_enabled: true,  freq: '24-hourly' },
  { id: 'f14', name: 'Braden Scale',                 category: 'safety',     status: 'published', is_template: true,  description: 'Pressure injury risk — 6 subscales', fields_count: 7,  iview_enabled: false, freq: null },
  { id: 'f15', name: 'Fluid Balance / I-O Chart',    category: 'nursing',    status: 'published', is_template: true,  description: 'Intake (oral/IV) and output (urine/drain)', fields_count: 10, iview_enabled: true,  freq: 'shift' },
  { id: 'f16', name: 'APGAR Score',                  category: 'vitals',     status: 'published', is_template: true,  description: 'Neonatal assessment at 1 and 5 minutes', fields_count: 6,  iview_enabled: false, freq: null },
]

// ── Mock care form bundles ────────────────────────────────────────────────────
const MOCK_CARE_FORMS = [
  {
    id: 'cf1', name: 'Post-Op Monitoring Bundle', color: '#7c3aed',
    description: 'Standard post-operative patient monitoring across vitals, pain and wound.',
    used_count: 6, published: true,
    forms: [
      { form_id: 'f1', name: 'Vitals Assessment',             freq: 'Every 1h',  condition: null },
      { form_id: 'f6', name: 'Comprehensive Pain Assessment', freq: 'Every 4h',  condition: 'Always' },
      { form_id: 'f13',name: 'Wound & Pressure Injury',       freq: 'Each shift',condition: 'IF Post-Op = Yes' },
      { form_id: 'f4', name: 'Glasgow Coma Scale (GCS)',      freq: 'Every 4h',  condition: 'IF Anaesthesia = General' },
    ],
    alerts: ['IF Pain Score > 6 → Notify doctor', 'IF GCS < 13 → STAT alert'],
  },
  {
    id: 'cf2', name: 'Admission Assessment Bundle', color: GREEN,
    description: 'Complete new admission workup — demographics through risk scoring.',
    used_count: 14, published: true,
    forms: [
      { form_id: 'f2', name: 'Patient Details',              freq: 'Once',       condition: null },
      { form_id: 'f9', name: 'Nursing Admission Assessment', freq: 'Once',       condition: null },
      { form_id: 'f4', name: 'Glasgow Coma Scale (GCS)',     freq: 'Once',       condition: 'IF Neuro complaint' },
      { form_id: 'f5', name: 'Morse Fall Risk Scale',        freq: 'Once',       condition: null },
      { form_id: 'f14',name: 'Braden Scale',                 freq: 'Once',       condition: null },
      { form_id: 'f6', name: 'Comprehensive Pain Assessment',freq: 'Once',       condition: null },
    ],
    alerts: ['IF Morse > 45 → Fall prevention protocol', 'IF Braden < 12 → Pressure care'],
  },
  {
    id: 'cf3', name: 'Respiratory Assessment Bundle', color: '#2563eb',
    description: 'For asthma and COPD patients — control score, peak flow, O₂ monitoring.',
    used_count: 3, published: false,
    forms: [
      { form_id: 'f3', name: 'Asthma Control Score (ACT)', freq: 'Daily',      condition: 'IF Diagnosis = Asthma' },
      { form_id: 'f1', name: 'Vitals Assessment',           freq: 'Every 2h',  condition: null },
      { form_id: 'f15',name: 'Fluid Balance / I-O Chart',   freq: 'Each shift',condition: null },
    ],
    alerts: ['IF ACT < 15 → Escalate treatment', 'IF SpO₂ < 92% → Immediate review'],
  },
]

// ── OPERATOR labels ────────────────────────────────────────────────────────────
const OPERATORS = ['equals', 'not equals', 'greater than', 'less than', 'contains', 'is filled', 'is empty']
const ACTIONS   = ['Show next form', 'Skip next form', 'Trigger alert', 'Notify doctor', 'Mark STAT']
const FREQ_OPTS = ['Once', 'Every 1h', 'Every 2h', 'Every 4h', 'Every 6h', 'Every 8h', 'Every 12h', 'Daily', 'Each shift', 'Per dressing', 'As needed']

// ── Condition builder row ─────────────────────────────────────────────────────
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

// ── Care form builder drawer ──────────────────────────────────────────────────
function CareFormBuilder({ careForm, allForms, onSave, onClose }) {
  const isNew = !careForm.id || careForm.id === '__new__'
  const [name, setName]           = useState(careForm.name || '')
  const [desc, setDesc]           = useState(careForm.description || '')
  const [color, setColor]         = useState(careForm.color || GREEN)
  const [forms, setForms]         = useState(careForm.forms || [])
  const [conditions, setConditions] = useState(careForm.alerts?.map(a => ({ raw: a })) || [])
  const [search, setSearch]       = useState('')
  const [saving, setSaving]       = useState(false)
  const dragItem = useRef(null)
  const dragOver = useRef(null)

  const filteredLib = allForms.filter(f =>
    !forms.find(cf => cf.form_id === f.id) &&
    (f.name.toLowerCase().includes(search.toLowerCase()) || f.category.toLowerCase().includes(search.toLowerCase()))
  )

  const addForm = (f) => setForms(prev => [...prev, { form_id: f.id, name: f.name, freq: 'Once', condition: null, _cat: f.category }])
  const removeForm = (idx) => setForms(prev => prev.filter((_, i) => i !== idx))
  const updateFreq = (idx, freq) => setForms(prev => prev.map((f, i) => i === idx ? { ...f, freq } : f))
  const updateCond = (idx, cond) => setForms(prev => prev.map((f, i) => i === idx ? { ...f, condition: cond } : f))

  const onDragStart = (idx) => { dragItem.current = idx }
  const onDragEnter = (idx) => { dragOver.current = idx }
  const onDragEnd   = () => {
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
      if (isNew) await api.post('/carechart/care-forms', payload)
      else       await api.put(`/carechart/care-forms/${careForm.id}`, payload)
      onSave({ ...careForm, name, description: desc, color, forms, id: careForm.id || `cf_${Date.now()}` })
    } catch {
      onSave({ ...careForm, name, description: desc, color, forms, id: careForm.id || `cf_${Date.now()}` })
    } finally { setSaving(false) }
  }

  const COLORS = [GREEN, NAVY, '#7c3aed', '#db2777', '#0891b2', '#d97706', '#dc2626', '#0f766e']

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(15,37,87,0.45)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-[640px] h-full bg-white flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>

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
              {forms.map((f, idx) => {
                const cat = CAT_CFG[f._cat] || CAT_CFG.general
                return (
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
                    {/* Condition on this form */}
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
                )
              })}
            </div>

            {/* Conditions/alerts section */}
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
                <p className="text-[10px] text-gray-300 text-center py-4">All forms added</p>
              )}
            </div>
          </div>
        </div>

        {/* Desc + color + footer */}
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

// ── Care form card ────────────────────────────────────────────────────────────
function CareFormCard({ cf, onEdit, onClone, onDelete, onTogglePublish }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-white rounded-2xl border overflow-hidden transition-all" style={{ borderColor: '#e9eaec' }}>
      {/* Color bar */}
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
            <button onClick={() => onEdit(cf)}
              className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-gray-50"
              style={{ borderColor: '#e5e7eb' }}>
              <Edit3 size={12} className="text-gray-500" />
            </button>
            <button onClick={() => onClone(cf)}
              className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-gray-50"
              style={{ borderColor: '#e5e7eb' }}>
              <Copy size={12} className="text-gray-500" />
            </button>
            <button onClick={() => onDelete(cf.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-red-50"
              style={{ borderColor: '#e5e7eb' }}>
              <Trash2 size={12} className="text-gray-400 hover:text-red-500" />
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-3">
          <span className="text-[10px] text-gray-400">
            <span className="font-bold text-gray-700">{cf.forms?.length || 0}</span> forms
          </span>
          <span className="text-[10px] text-gray-400">
            Used on <span className="font-bold text-gray-700">{cf.used_count || 0}</span> patients
          </span>
          {cf.alerts?.length > 0 && (
            <span className="text-[10px] font-bold" style={{ color: '#d97706' }}>
              {cf.alerts.length} alert rule{cf.alerts.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Form chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(cf.forms || []).map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border bg-gray-50"
              style={{ borderColor: '#e9eaec', color: '#374151' }}>
              <span className="text-gray-400 font-normal">{i + 1}.</span> {f.name}
              {f.condition && f.condition !== 'Always' && (
                <span className="text-[8px] font-bold px-1 rounded" style={{ background: '#fef9c3', color: '#a16207' }}>cond</span>
              )}
            </span>
          ))}
        </div>

        {/* Expand — conditions/alerts */}
        {cf.alerts?.length > 0 && (
          <>
            <button onClick={() => setExpanded(e => !e)}
              className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-gray-600 transition-colors">
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {expanded ? 'Hide' : 'Show'} alert conditions
            </button>
            {expanded && (
              <div className="mt-2 flex flex-col gap-1.5">
                {cf.alerts.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px]"
                    style={{ background: '#fef9c3', color: '#a16207' }}>
                    <Zap size={9} /> {a}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer actions */}
      <div className="px-4 py-2.5 border-t flex items-center gap-2" style={{ borderColor: '#f3f4f6', background: '#fafaf9' }}>
        <button onClick={() => onTogglePublish(cf)}
          className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors"
          style={cf.published
            ? { color: '#6b7280', borderColor: '#e5e7eb', background: 'white' }
            : { color: GREEN,     borderColor: '#a7f3d0', background: '#f0fdf4' }}>
          {cf.published ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
          {cf.published ? 'Unpublish' : 'Publish'}
        </button>
        <button onClick={() => onEdit(cf)}
          className="ml-auto flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg text-white"
          style={{ background: cf.color || GREEN }}>
          <Edit3 size={11} /> Edit Bundle
        </button>
      </div>
    </div>
  )
}

// ── Assessment library card ───────────────────────────────────────────────────
function AssessmentCard({ form, onEdit, onOpen }) {
  const title = form.title || form.name || '—'
  const hasJsx = !!(form.subcategory)
  return (
    <div className="bg-white rounded-xl border p-3.5 hover:shadow-sm transition-all" style={{ borderColor: '#e9eaec' }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {form.icon && <span className="text-sm">{form.icon}</span>}
            <span className="text-xs font-bold text-gray-900 leading-tight">{title}</span>
            {form.is_iview_enabled && (
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full" style={{ background: '#eff6ff', color: NAVY }}>iView</span>
            )}
            {form.requires_cosign && (
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full" style={{ background: '#fef2f2', color: RED }}>CoSign</span>
            )}
            {hasJsx && (
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full" style={{ background: '#f0fdf4', color: GREEN }}>Rich Form</span>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{form.description}</p>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {hasJsx && (
            <button onClick={() => onOpen(form)}
              className="w-7 h-7 rounded-lg border flex items-center justify-center transition-colors hover:bg-green-50"
              style={{ borderColor: '#a7f3d0' }}
              title="Open form">
              <ExternalLink size={11} style={{ color: GREEN }} />
            </button>
          )}
          <button onClick={() => onEdit(form)}
            className="w-7 h-7 rounded-lg border flex items-center justify-center transition-colors hover:bg-gray-50"
            style={{ borderColor: '#e5e7eb' }}>
            <Edit3 size={11} className="text-gray-400" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <CatChip cat={form.category} small />
        {form.subcategory && <span className="text-[9px] text-gray-400 font-mono">{form.subcategory}</span>}
        {form.fields_count ? <span className="text-[9px] text-gray-400">{form.fields_count} fields</span> : null}
        {form.freq && <span className="text-[9px] text-gray-400">· {form.freq}</span>}
        <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: form.is_template ? '#f0fdf4' : '#eff6ff', color: form.is_template ? GREEN : NAVY }}>
          {form.is_template ? 'System' : 'Custom'}
        </span>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Assessments() {
  const { session } = useWardSession()
  const [tab, setTab]           = useState('care-forms')  // care-forms | library | submissions
  const [forms, setForms]       = useState([])
  const [careForms, setCareForms] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [builder, setBuilder]   = useState(null)   // null | care form object (new or existing)
  const [openForm, setOpenForm] = useState(null)   // null | { title, subcategory, ... }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [fPool, cForms, subs] = await Promise.allSettled([
        api.get('/provider/forms/pool'),
        api.get('/carechart/care-forms'),
        api.get('/provider/forms/submissions', { params: { ward_id: session?.ward?.id, limit: 50 } }),
      ])
      const poolData  = fPool.status  === 'fulfilled' ? (Array.isArray(fPool.value)  ? fPool.value  : fPool.value?.items  || []) : []
      const cfData    = cForms.status === 'fulfilled' ? (Array.isArray(cForms.value) ? cForms.value : cForms.value?.items || []) : []
      const subData   = subs.status   === 'fulfilled' ? (Array.isArray(subs.value)   ? subs.value   : subs.value?.items   || []) : []
      setForms(poolData.length   ? poolData  : MOCK_FORMS)
      setCareForms(cfData.length ? cfData    : MOCK_CARE_FORMS)
      setSubmissions(subData)
    } catch {
      setForms(MOCK_FORMS)
      setCareForms(MOCK_CARE_FORMS)
    } finally { setLoading(false) }
  }, [session?.ward?.id])

  useEffect(() => { load() }, [load])

  const handleSaveCareForms = useCallback((saved) => {
    setCareForms(prev => {
      const idx = prev.findIndex(cf => cf.id === saved.id)
      if (idx >= 0) return prev.map((cf, i) => i === idx ? saved : cf)
      return [...prev, saved]
    })
    setBuilder(null)
  }, [])

  const handleClone = (cf) => {
    setBuilder({ ...cf, id: '__new__', name: `${cf.name} (Copy)`, published: false })
  }

  const handleDelete = (id) => {
    setCareForms(prev => prev.filter(cf => cf.id !== id))
    api.delete(`/carechart/care-forms/${id}`).catch(() => {})
  }

  const handleTogglePublish = (cf) => {
    const updated = { ...cf, published: !cf.published }
    setCareForms(prev => prev.map(c => c.id === cf.id ? updated : c))
    api.post(`/carechart/care-forms/${cf.id}/${cf.published ? 'unpublish' : 'publish'}`).catch(() => {})
  }

  // Library filter
  const categories = [...new Set(forms.map(f => f.category))].sort()
  const filteredForms = useMemo(() => forms.filter(f =>
    (!catFilter || f.category === catFilter) &&
    (!search || f.name.toLowerCase().includes(search.toLowerCase()) || f.description?.toLowerCase().includes(search.toLowerCase()))
  ), [forms, catFilter, search])

  const TABS = [
    { key: 'care-forms',  label: 'Care Forms',        icon: ClipboardList, count: careForms.length },
    { key: 'library',     label: 'Assessment Library', icon: BookOpen,      count: forms.length },
    { key: 'submissions', label: 'Submissions',        icon: List,          count: submissions.length },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-full text-gray-400">
      <Loader2 size={22} className="animate-spin mr-2" /> Loading assessments…
    </div>
  )

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: '#f4f5f7' }}>

      {/* ── Header ── */}
      <div className="bg-white border-b flex-shrink-0 px-5 py-3 flex items-center gap-3" style={{ borderColor: '#e9eaec' }}>
        <span className="text-base font-extrabold text-gray-900">Assessments & Care Forms</span>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
          style={{ background: '#f0fdf4', color: GREEN, borderColor: '#a7f3d0' }}>
          {session?.ward?.name || 'Ward 3B'}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setBuilder({ id: '__new__', name: '', forms: [], alerts: [], published: false, color: GREEN })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ background: GREEN }}>
            <Plus size={12} /> New Care Form
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex-shrink-0 bg-white border-b px-5" style={{ borderColor: '#e9eaec' }}>
        <div className="flex gap-0">
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.key
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all"
                style={active
                  ? { color: GREEN, borderBottomColor: GREEN }
                  : { color: '#6b7280', borderBottomColor: 'transparent' }}>
                <Icon size={13} />
                {t.label}
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: active ? '#f0fdf4' : '#f3f4f6', color: active ? GREEN : '#9ca3af' }}>
                  {t.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Care Forms tab ── */}
      {tab === 'care-forms' && (
        <div className="flex-1 p-5">
          {careForms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
              <ClipboardList size={28} className="opacity-30" />
              <p className="text-sm">No care forms yet</p>
              <button onClick={() => setBuilder({ id: '__new__', name: '', forms: [], alerts: [], published: false, color: GREEN })}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white"
                style={{ background: GREEN }}>
                <Plus size={12} /> Create First Care Form
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {careForms.map(cf => (
                <CareFormCard key={cf.id} cf={cf}
                  onEdit={setBuilder}
                  onClone={handleClone}
                  onDelete={handleDelete}
                  onTogglePublish={handleTogglePublish}
                />
              ))}
              {/* Add new card */}
              <button onClick={() => setBuilder({ id: '__new__', name: '', forms: [], alerts: [], published: false, color: GREEN })}
                className="border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 py-10 text-gray-400 hover:border-green-300 hover:text-green-600 transition-colors"
                style={{ borderColor: '#e5e7eb' }}>
                <Plus size={20} />
                <span className="text-xs font-semibold">New Care Form</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Assessment Library tab ── */}
      {tab === 'library' && (
        <div className="flex-1 p-5">
          {/* Search + category filter */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search assessments…"
                className="pl-7 pr-3 py-2 border rounded-lg text-xs bg-white focus:outline-none w-56"
                style={{ borderColor: search ? GREEN : '#e5e7eb' }} />
              {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={11} /></button>}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => setCatFilter('')}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all"
                style={!catFilter ? { background: '#f0fdf4', color: GREEN, borderColor: '#a7f3d0' } : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}>
                All ({forms.length})
              </button>
              {categories.map(cat => {
                const cc = CAT_CFG[cat] || CAT_CFG.general
                const cnt = forms.filter(f => f.category === cat).length
                return (
                  <button key={cat} onClick={() => setCatFilter(catFilter === cat ? '' : cat)}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all"
                    style={catFilter === cat
                      ? { background: cc.bg, color: cc.color, borderColor: cc.border }
                      : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}>
                    {cc.label} ({cnt})
                  </button>
                )
              })}
            </div>
            <span className="ml-auto text-[10px] text-gray-400">{filteredForms.length} assessments</span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-3">
            {filteredForms.map(f => (
              <AssessmentCard key={f.id} form={f} onEdit={() => {}} onOpen={setOpenForm} />
            ))}
          </div>
        </div>
      )}

      {/* ── Submissions tab ── */}
      {tab === 'submissions' && (
        <div className="flex-1 p-5">
          {submissions.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400" style={{ borderColor: '#e9eaec' }}>
              <List size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No submissions yet for this ward</p>
              <p className="text-xs mt-1">Submissions appear here when nurses and doctors complete assessment forms in the patient chart.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#e9eaec' }}>
              <table className="w-full">
                <thead style={{ background: '#fafaf9' }}>
                  <tr className="border-b" style={{ borderColor: '#e9eaec' }}>
                    {['Patient', 'Form', 'Submitted By', 'Score', 'Alert', 'Status', 'Time'].map(h => (
                      <th key={h} className="text-left text-[9px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-gray-50" style={{ borderColor: '#f3f4f6' }}>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-800">{s.patient_name || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-700">{s.form_name || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{s.submitted_by || '—'}</td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-800">{s.score ?? '—'}</td>
                      <td className="px-4 py-3">
                        {s.has_alert
                          ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#fee2e2', color: RED }}>⚠ Alert</span>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                          style={s.status === 'finalized'
                            ? { background: '#dcfce7', color: '#15803d', borderColor: '#a7f3d0' }
                            : { background: '#fef9c3', color: '#a16207', borderColor: '#fde047' }}>
                          {s.status || 'draft'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[10px] text-gray-400 whitespace-nowrap">{s.submitted_at ? new Date(s.submitted_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Care Form Builder Drawer ── */}
      {builder && (
        <CareFormBuilder
          careForm={builder}
          allForms={forms}
          onSave={handleSaveCareForms}
          onClose={() => setBuilder(null)}
        />
      )}

      {/* ── Form Open Modal ── */}
      {openForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={e => { if (e.target === e.currentTarget) setOpenForm(null) }}>
          <div className="relative w-full max-w-3xl mx-4 my-8 bg-white rounded-2xl shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: '#e9eaec' }}>
              <div className="flex items-center gap-2">
                {openForm.icon && <span className="text-lg">{openForm.icon}</span>}
                <span className="font-bold text-gray-900 text-sm">{openForm.title || openForm.name}</span>
                <CatChip cat={openForm.category} small />
              </div>
              <button onClick={() => setOpenForm(null)}
                className="w-7 h-7 rounded-lg border flex items-center justify-center hover:bg-gray-50 transition-colors"
                style={{ borderColor: '#e5e7eb' }}>
                <X size={13} className="text-gray-400" />
              </button>
            </div>
            {/* Body */}
            <div className="overflow-y-auto p-5 max-h-[80vh]">
              <FormRenderer
                formKey={openForm.subcategory}
                patientId={null}
                encounterId={null}
                onSaved={() => setOpenForm(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
