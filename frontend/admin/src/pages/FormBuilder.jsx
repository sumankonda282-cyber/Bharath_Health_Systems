import { useReducer, useRef, useEffect, useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Eye, EyeOff, Send, Plus, Settings, X, Clock, PenLine } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import api from '../api/client'
import FieldPalette from '../components/formbuilder/FieldPalette'
import FormCanvas, { ROW_H, GAP } from '../components/formbuilder/FormCanvas'
import PropertiesPanel from '../components/formbuilder/PropertiesPanel'
import FormPreview from '../components/formbuilder/FormPreview'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
}

function labelToId(label) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 40)
    .replace(/^_|_$/, '')
}

// ─── CareForm grid layout (12-col free canvas) ──────────────────────────────────
// Every field carries layout {x,y,w,h} on a 12-column grid so the admin can place
// and size controls freely. Existing forms (no layout) are flowed onto the grid
// once on load; new fields drop into the next free row.
export const GRID_COLS = 12

const FULL_WIDTH_TYPES = new Set([
  'textarea', 'checkbox', 'matrix', 'table', 'body_map', 'signature',
  'rich_text', 'divider', 'stage_break', 'label', 'score_display', 'medication_search',
])
const TALL_TYPES = new Set(['textarea', 'table', 'body_map', 'matrix', 'rich_text', 'signature'])

function defaultW(field, oldSectionLayout) {
  if (FULL_WIDTH_TYPES.has(field.type)) return GRID_COLS
  // Map a legacy col_span (on an N-col section) onto the 12-col grid.
  if (field.col_span && oldSectionLayout > 1) {
    return Math.max(1, Math.min(GRID_COLS, Math.round((field.col_span / oldSectionLayout) * GRID_COLS)))
  }
  return 6
}
function defaultH(field) { return TALL_TYPES.has(field.type) ? 2 : 1 }

// Flow fields that lack a layout onto the grid, left→right, wrapping at 12 cols.
function flowLayouts(fields, oldSectionLayout) {
  let cx = 0, cy = 0, rowH = 1
  return fields.map(f => {
    if (f.layout && Number.isFinite(f.layout.w)) {
      const ly = f.layout.y ?? 0, lh = f.layout.h ?? 1
      cy = Math.max(cy, ly); rowH = Math.max(rowH, lh)
      return f
    }
    const w = Math.min(defaultW(f, oldSectionLayout), GRID_COLS)
    const h = defaultH(f)
    if (cx + w > GRID_COLS) { cx = 0; cy += rowH; rowH = 1 }
    const layout = { x: cx, y: cy, w, h }
    cx += w; rowH = Math.max(rowH, h)
    return { ...f, layout }
  })
}

// Ensure every field in every section has a grid layout (idempotent).
function withGridLayouts(schema) {
  if (!schema || !Array.isArray(schema.sections)) return schema
  return {
    ...schema,
    sections: schema.sections.map(s => ({
      ...s,
      fields: flowLayouts(s.fields || [], s.layout || 1),
    })),
  }
}

// Next free row for a new field dropped into a section.
function nextRow(fields) {
  return (fields || []).reduce((max, f) => Math.max(max, (f.layout?.y ?? 0) + (f.layout?.h ?? 1)), 0)
}

function makeSection(index) {
  return {
    id: genId('sec'),
    title: `Section ${index}`,
    description: '',
    layout: 1,
    header_color: '',
    collapsible: false,
    collapsed: false,
    repeatable: false,
    min_instances: 1,
    max_instances: 5,
    applicability_mode: 'required',
    fields: [],
  }
}

function makeField(type) {
  const base = {
    id: genId('fld'),
    type,
    label: 'New Field',
    field_id: 'new_field',
    help_text: '',
    required: false,
    read_only: false,
    hidden: false,
    placeholder: '',
    default_value: '',
    col_span: 1,
    options: [],
    conditions: [],
    alert_rules: [],
  }

  const typeDefaults = {
    text:     { enable_dictation: true },
    textarea: { enable_dictation: true },
    radio: {
      options: [
        { label: 'Option 1', value: 'option_1', score_weight: 0 },
        { label: 'Option 2', value: 'option_2', score_weight: 0 },
      ],
      display_style: 'vertical',
    },
    checkbox: {
      options: [
        { label: 'Option 1', value: 'option_1', score_weight: 0 },
        { label: 'Option 2', value: 'option_2', score_weight: 0 },
      ],
      display_style: 'vertical',
    },
    dropdown: {
      options: [
        { label: 'Option 1', value: 'option_1', score_weight: 0 },
        { label: 'Option 2', value: 'option_2', score_weight: 0 },
      ],
    },
    yes_no:            { yes_label: 'Yes', no_label: 'No', yes_no_style: 'toggle' },
    scale:             { min: 0, max: 10, min_label: 'None', max_label: 'Worst' },
    numeric_range:     { min: 0, max: 100, range_min_label: 'Min', range_max_label: 'Max', unit: '' },
    calculated:        { formula: '', variables: [] },
    score_display:     { score_source: '', display_bands: true },
    vital_auto:        { vital_type: 'heart_rate', unit: 'bpm' },
    patient_auto:      { auto_source: 'age', label: 'Age' },
    patient_search:    { placeholder: 'Search patient…', multi_select: false },
    staff_search:      { placeholder: 'Search staff / MD…', role_filter: 'any', multi_select: false },
    medication_search: { placeholder: 'Search medication / Rx…', multi_select: true },
    medication_order:  { placeholder: 'Search medication to order…' },
    diagnosis_search:  { placeholder: 'Search diagnosis / ICD-10…', multi_select: true },
    allergy_search:    { placeholder: 'Search allergy…', multi_select: true, include_severity: false, include_reaction: false },
    procedure_search:  { placeholder: 'Search procedure / CPT…', multi_select: true, procedure_standard: 'any' },
    lab_test_search:   { placeholder: 'Search lab test…', multi_select: true, include_result: false },
    body_site_search:  { placeholder: 'Search body site…', multi_select: false, search_category: 'anatomy' },
    matrix: {
      matrix_rows: [{ label: 'Row 1', value: 'row_1' }],
      matrix_cols: [{ label: 'Col 1', value: 'col_1' }, { label: 'Col 2', value: 'col_2' }],
      matrix_cell_type: 'radio',
    },
    stage_break: { label: 'Stage 1', stage_title: 'Stage 1', stage_number: 1, stage_description: '' },
    table:     { columns: [{ label: 'Column 1', type: 'text' }], allow_add_rows: true },
    signature: { role_required: 'any', include_timestamp: true },
    body_map:  { body_region: 'full_body', multi_select: true },
  }

  return {
    ...base,
    ...(typeDefaults[type] || {}),
    layout: { x: 0, y: 0, w: defaultW({ type, col_span: 1 }, 1), h: defaultH({ type }) },
  }
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState = {
  form: {
    id: null,
    title: 'Untitled Form',
    description: '',
    category: 'general',
    subcategory: '',
    icon: '📋',
    status: 'draft',
    is_iview_enabled: false,
    requires_cosign: false,
    time_limit_minutes: null,
    scoring_config: null,
    alert_rules: [],
    schema: { sections: [] },
  },
  selectedId: null,
  selectedType: null,
  isDirty: false,
  saving: false,
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state, action) {
  const { form } = state

  switch (action.type) {
    case 'SET_TITLE':
      return { ...state, isDirty: true, form: { ...form, title: action.payload } }

    case 'SET_CATEGORY':
      return { ...state, isDirty: true, form: { ...form, category: action.payload } }

    case 'SET_FORM_PROP':
      return {
        ...state,
        isDirty: true,
        form: { ...form, [action.payload.key]: action.payload.value },
      }

    case 'ADD_SECTION': {
      const newSection = makeSection(form.schema.sections.length + 1)
      return {
        ...state,
        isDirty: true,
        selectedId: newSection.id,
        selectedType: 'section',
        form: { ...form, schema: { ...form.schema, sections: [...form.schema.sections, newSection] } },
      }
    }

    case 'UPDATE_SECTION': {
      const { sectionId, key, value } = action.payload
      return {
        ...state,
        isDirty: true,
        form: {
          ...form,
          schema: {
            ...form.schema,
            sections: form.schema.sections.map(s => s.id === sectionId ? { ...s, [key]: value } : s),
          },
        },
      }
    }

    case 'MOVE_SECTION': {
      const { sectionId, dir } = action.payload
      const secs = [...form.schema.sections]
      const i = secs.findIndex(s => s.id === sectionId)
      const j = i + dir
      if (i < 0 || j < 0 || j >= secs.length) return state
      ;[secs[i], secs[j]] = [secs[j], secs[i]]
      return {
        ...state,
        isDirty: true,
        form: { ...form, schema: { ...form.schema, sections: secs } },
      }
    }

    case 'DELETE_SECTION': {
      return {
        ...state,
        isDirty: true,
        selectedId: null,
        selectedType: null,
        form: {
          ...form,
          schema: { ...form.schema, sections: form.schema.sections.filter(s => s.id !== action.payload) },
        },
      }
    }

    case 'ADD_FIELD': {
      const { sectionId, fieldType, afterIndex } = action.payload
      const field = makeField(fieldType)
      return {
        ...state,
        isDirty: true,
        selectedId: field.id,
        selectedType: 'field',
        form: {
          ...form,
          schema: {
            ...form.schema,
            sections: form.schema.sections.map(s => {
              if (s.id !== sectionId) return s
              const fields = [...s.fields]
              // Drop the new control into the next free grid row (full-width spans stay full).
              field.layout = { ...field.layout, x: 0, y: nextRow(fields) }
              const insertAt = afterIndex != null ? afterIndex + 1 : fields.length
              fields.splice(insertAt, 0, field)
              return { ...s, fields }
            }),
          },
        },
      }
    }

    case 'ADD_FIELD_PRESET': {
      // Insert a pre-populated field from the Master Field Registry.
      // The registry entry already has field_id, label, type, unit, reference_range, etc.
      const { sectionId, preset } = action.payload
      const field = {
        ...makeField(preset.type),
        ...preset,
        id: genId('fld'), // always fresh internal id
      }
      return {
        ...state,
        isDirty: true,
        selectedId: field.id,
        selectedType: 'field',
        form: {
          ...form,
          schema: {
            ...form.schema,
            sections: form.schema.sections.map(s => {
              if (s.id !== sectionId) return s
              const fields = [...s.fields]
              field.layout = { x: 0, y: nextRow(fields), w: Math.min((preset.col_span || 1) * 3, GRID_COLS), h: 1 }
              fields.push(field)
              return { ...s, fields }
            }),
          },
        },
      }
    }

    case 'SET_FIELD_LAYOUT': {
      const { sectionId, fieldId, layout } = action.payload
      return {
        ...state,
        isDirty: true,
        form: {
          ...form,
          schema: {
            ...form.schema,
            sections: form.schema.sections.map(s => {
              if (s.id !== sectionId) return s
              return {
                ...s,
                fields: s.fields.map(f =>
                  f.id === fieldId ? { ...f, layout: { ...(f.layout || {}), ...layout } } : f
                ),
              }
            }),
          },
        },
      }
    }

    case 'UPDATE_FIELD_PROP':
    case 'SET_FIELD': {
      const { sectionId, fieldId, key, value } = action.payload
      return {
        ...state,
        isDirty: true,
        form: {
          ...form,
          schema: {
            ...form.schema,
            sections: form.schema.sections.map(s => {
              if (s.id !== sectionId) return s
              return {
                ...s,
                fields: s.fields.map(f => {
                  if (f.id !== fieldId) return f
                  const updated = { ...f, [key]: value }
                  if (key === 'label') updated.field_id = labelToId(value)
                  return updated
                }),
              }
            }),
          },
        },
      }
    }

    case 'DELETE_FIELD': {
      const { sectionId, fieldId } = action.payload
      return {
        ...state,
        isDirty: true,
        selectedId: state.selectedId === fieldId ? null : state.selectedId,
        selectedType: state.selectedId === fieldId ? null : state.selectedType,
        form: {
          ...form,
          schema: {
            ...form.schema,
            sections: form.schema.sections.map(s => {
              if (s.id !== sectionId) return s
              return { ...s, fields: s.fields.filter(f => f.id !== fieldId) }
            }),
          },
        },
      }
    }

    case 'MOVE_FIELD': {
      const { fromSectionId, toSectionId, fromIndex, toIndex } = action.payload
      let movingField = null
      const sections = form.schema.sections.map(s => {
        if (s.id === fromSectionId) {
          const fields = [...s.fields]
          ;[movingField] = fields.splice(fromIndex, 1)
          return { ...s, fields }
        }
        return s
      })
      const finalSections = sections.map(s => {
        if (s.id === toSectionId && movingField) {
          const fields = [...s.fields]
          fields.splice(toIndex, 0, movingField)
          return { ...s, fields }
        }
        return s
      })
      return {
        ...state,
        isDirty: true,
        form: { ...form, schema: { ...form.schema, sections: finalSections } },
      }
    }

    case 'ADD_ALERT_RULE': {
      const { sectionId, fieldId, rule } = action.payload
      return {
        ...state,
        isDirty: true,
        form: {
          ...form,
          schema: {
            ...form.schema,
            sections: form.schema.sections.map(s => {
              if (s.id !== sectionId) return s
              return {
                ...s,
                fields: s.fields.map(f => {
                  if (f.id !== fieldId) return f
                  return { ...f, alert_rules: [...(f.alert_rules || []), rule] }
                }),
              }
            }),
          },
        },
      }
    }

    case 'REMOVE_ALERT_RULE': {
      const { sectionId, fieldId, ruleIndex } = action.payload
      return {
        ...state,
        isDirty: true,
        form: {
          ...form,
          schema: {
            ...form.schema,
            sections: form.schema.sections.map(s => {
              if (s.id !== sectionId) return s
              return {
                ...s,
                fields: s.fields.map(f => {
                  if (f.id !== fieldId) return f
                  const rules = [...(f.alert_rules || [])]
                  rules.splice(ruleIndex, 1)
                  return { ...f, alert_rules: rules }
                }),
              }
            }),
          },
        },
      }
    }

    case 'SELECT':
      return { ...state, selectedId: action.payload.id, selectedType: action.payload.type }

    case 'SET_SAVED':
      return { ...state, isDirty: false, saving: false, form: { ...form, id: action.payload.id } }

    case 'SET_SAVING':
      return { ...state, saving: action.payload }

    case 'SET_SCHEMA':
      return { ...state, isDirty: true, form: { ...form, schema: withGridLayouts(action.payload) } }

    case 'LOAD_FORM':
      return {
        ...state,
        isDirty: false,
        saving: false,
        form: {
          ...initialState.form,
          ...action.payload,
          schema: withGridLayouts(action.payload.schema || { sections: [] }),
        },
      }

    default:
      return state
  }
}

// ─── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'general',      label: 'General' },
  { value: 'clinical',     label: 'Clinical' },
  { value: 'mental_health', label: 'Mental Health' },
  { value: 'vitals',       label: 'Vitals' },
  { value: 'pain',         label: 'Pain' },
  { value: 'surgical',     label: 'Surgical' },
  { value: 'icu',          label: 'ICU' },
  { value: 'intake',       label: 'Intake' },
  { value: 'admission',    label: 'Admission' },
  { value: 'assessment',   label: 'Assessment' },
  { value: 'nursing',      label: 'Nursing' },
  { value: 'consent',      label: 'Consent' },
  { value: 'discharge',    label: 'Discharge' },
  { value: 'followup',     label: 'Follow-up' },
  { value: 'survey',       label: 'Survey' },
  { value: 'history',      label: 'History' },
  { value: 'systems',      label: 'Systems Review' },
  { value: 'pediatrics',   label: 'Pediatrics' },
  { value: 'cardiology',   label: 'Cardiology' },
  { value: 'ent',          label: 'ENT' },
  { value: 'gastro',       label: 'Gastroenterology' },
  { value: 'orthopedic',   label: 'Orthopedic' },
  { value: 'obg',          label: 'OB/GYN' },
  { value: 'respiratory',  label: 'Respiratory' },
  { value: 'neurology',    label: 'Neurology' },
  { value: 'oncology',     label: 'Oncology' },
  { value: 'dermatology',  label: 'Dermatology' },
  { value: 'pharmacy',     label: 'Pharmacy' },
  { value: 'lab',          label: 'Lab' },
  { value: 'radiology',    label: 'Radiology' },
  { value: 'emergency',    label: 'Emergency' },
  { value: 'palliative',   label: 'Palliative' },
  { value: 'rehab',        label: 'Rehabilitation' },
  { value: 'other',        label: 'Other' },
]

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    draft:     'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    published: 'bg-green-500/20 text-green-400 border border-green-500/30',
    retired:   'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  }
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${map[status] || map.draft}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ─── Form Settings Modal ──────────────────────────────────────────────────────

const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F5821E] transition-colors'
const textareaCls = inputCls + ' resize-none'

const FORM_ACCENT_PALETTE = ['#0F2557', '#CC1414', '#F5821E', '#16A34A', '#7C3AED', '#0891B2', '#D97706', '#DB2777', '#0D9488', '#475569']

function Toggle({ value, onChange, label }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <div
        role="switch"
        aria-checked={value}
        className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-[#F5821E]' : 'bg-gray-700'}`}
        onClick={() => onChange(!value)}
      >
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
      {label && <span className="text-sm text-gray-300">{label}</span>}
    </label>
  )
}

function FormSettingsModal({ form, dispatch, onClose }) {
  const set = (key, value) => dispatch({ type: 'SET_FORM_PROP', payload: { key, value } })

  const [clinics, setClinics] = useState([])
  useEffect(() => {
    api.get('/platform/clinics').then(d => setClinics(Array.isArray(d) ? d : (d?.clinics || []))).catch(() => setClinics([]))
  }, [])
  const scoped = form.clinic_id != null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-96 h-full bg-gray-900 border-l border-gray-800 shadow-2xl overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Settings size={15} className="text-gray-400" />
            Form Settings
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-4 overflow-y-auto">
          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
            <textarea
              className={textareaCls}
              rows={3}
              value={form.description || ''}
              onChange={e => set('description', e.target.value)}
              placeholder="What is this form used for?"
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Icon (emoji)</label>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-2xl">
                {form.icon || '📋'}
              </div>
              <input
                className={inputCls + ' flex-1'}
                value={form.icon || ''}
                onChange={e => set('icon', e.target.value)}
                placeholder="📋"
                maxLength={4}
              />
            </div>
          </div>

          {/* Subcategory */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Subcategory</label>
            <input
              className={inputCls}
              value={form.subcategory || ''}
              onChange={e => set('subcategory', e.target.value)}
              placeholder="e.g. PHQ-9, Admission Triage…"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
            <select
              className={inputCls}
              value={form.status || 'draft'}
              onChange={e => set('status', e.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="retired">Retired</option>
            </select>
          </div>

          {/* Availability / scope: global vs a single health center */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Availability</label>
            <select
              className={inputCls}
              value={scoped ? 'clinic' : 'global'}
              onChange={e => {
                if (e.target.value === 'global') { set('clinic_id', null); return }
                // Only switch to scoped if clinics have loaded; otherwise warn instead of silently saving as global
                if (!clinics.length) { alert('Health center list is still loading. Please wait and try again.'); return }
                set('clinic_id', clinics[0]?.id ?? null)
              }}
            >
              <option value="global">Global — every health center</option>
              <option value="clinic">Specific health center only</option>
            </select>
            {scoped && (
              <select
                className={inputCls + ' mt-2'}
                value={form.clinic_id || ''}
                onChange={e => set('clinic_id', e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Select a health center…</option>
                {clinics.map(c => (
                  <option key={c.id} value={c.id}>{c.name || c.clinic_name || `Clinic #${c.id}`}</option>
                ))}
              </select>
            )}
            <p className="mt-1 text-xs text-gray-600">
              Global forms appear in every health center. Scoped forms appear only in the selected center’s portals.
            </p>
          </div>

          {/* Form accent colour */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Form accent colour</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {FORM_ACCENT_PALETTE.map(c => {
                const current = form.schema?.theme?.accent || ''
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => dispatch({ type: 'SET_FORM_PROP', payload: { key: 'schema', value: { ...form.schema, theme: { ...(form.schema.theme || {}), accent: c } } } })}
                    className={`w-5 h-5 rounded-full border ${current === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                    style={{ background: c, borderColor: '#e5e7eb' }}
                    title={c}
                  />
                )
              })}
              <input
                type="color"
                value={form.schema?.theme?.accent || '#0F2557'}
                onChange={e => dispatch({ type: 'SET_FORM_PROP', payload: { key: 'schema', value: { ...form.schema, theme: { ...(form.schema.theme || {}), accent: e.target.value } } } })}
                className="w-6 h-6 rounded cursor-pointer border border-gray-700 p-0 bg-gray-800"
              />
              {form.schema?.theme?.accent && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'SET_FORM_PROP', payload: { key: 'schema', value: { ...form.schema, theme: { ...(form.schema.theme || {}), accent: '' } } } })}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  clear
                </button>
              )}
            </div>
          </div>

          <div className="border-t border-gray-800 pt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Workflow</p>

            {/* Co-sign */}
            <Toggle
              value={form.requires_cosign || false}
              onChange={v => set('requires_cosign', v)}
              label={
                <span className="flex items-center gap-1.5 text-sm text-gray-300">
                  <PenLine size={13} className="text-gray-400" />
                  Requires co-sign
                </span>
              }
            />

            {/* Time limit */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 flex items-center gap-1">
                <Clock size={11} />
                Time limit (minutes)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  className={inputCls}
                  value={form.time_limit_minutes || ''}
                  onChange={e => set('time_limit_minutes', e.target.value === '' ? null : Number(e.target.value))}
                  placeholder="No limit"
                />
                {form.time_limit_minutes && (
                  <button
                    onClick={() => set('time_limit_minutes', null)}
                    className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Integration</p>

            <Toggle
              value={form.is_iview_enabled || false}
              onChange={v => set('is_iview_enabled', v)}
              label="Enable iView flowsheet integration"
            />

            <Toggle
              value={form.is_template || false}
              onChange={v => set('is_template', v)}
              label="Mark as template (shareable base form)"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function FormBuilder() {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const [state, dispatch] = useReducer(reducer, initialState)
  const { form, selectedId, selectedType, isDirty, saving } = state

  const historyRef      = useRef({ past: [], future: [] })
  const copiedFieldRef  = useRef(null)
  const autoSaveTimerRef = useRef(null)
  // Live DOM refs to each section's grid (for cell-size math on drag-move).
  const gridRefs = useRef({})
  const registerGrid = useCallback((id, node) => { if (node) gridRefs.current[id] = node }, [])

  const [previewMode,   setPreviewMode]   = useState(false)
  const [paletteOpen,   setPaletteOpen]   = useState(false)
  const [showSettings,  setShowSettings]  = useState(false)

  // ── Load existing form ────────────────────────────────────────────────────

  useEffect(() => {
    if (!routeId) return
    api.get(`/assessment-forms/${routeId}`)
      .then(data => dispatch({ type: 'LOAD_FORM', payload: data }))
      .catch(err => console.error('Failed to load form:', err))
  }, [routeId])

  // ── History wrapper ───────────────────────────────────────────────────────

  const dispatchWithHistory = useCallback(
    (action) => {
      const schemaChangingActions = [
        'ADD_SECTION', 'DELETE_SECTION', 'UPDATE_SECTION', 'MOVE_SECTION',
        'ADD_FIELD', 'DELETE_FIELD', 'MOVE_FIELD', 'SET_FIELD_LAYOUT',
        'UPDATE_FIELD_PROP', 'SET_FIELD',
        'ADD_ALERT_RULE', 'REMOVE_ALERT_RULE',
      ]
      if (schemaChangingActions.includes(action.type)) {
        const snapshot = JSON.stringify(form.schema)
        historyRef.current.past = [...historyRef.current.past.slice(-19), snapshot]
        historyRef.current.future = []
      }
      dispatch(action)
    },
    [form.schema]
  )

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e) {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        const { past, future } = historyRef.current
        if (past.length === 0) return
        const snapshot = past.pop()
        future.push(JSON.stringify(form.schema))
        dispatch({ type: 'SET_SCHEMA', payload: JSON.parse(snapshot) })
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault()
        const { past, future } = historyRef.current
        if (future.length === 0) return
        const snapshot = future.pop()
        past.push(JSON.stringify(form.schema))
        dispatch({ type: 'SET_SCHEMA', payload: JSON.parse(snapshot) })
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedId && selectedType === 'field') {
          const entry = allFields.find(f => f.field.id === selectedId)
          if (entry) copiedFieldRef.current = { ...entry.field, _sectionId: entry.sectionId }
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (copiedFieldRef.current) {
          const { _sectionId, ...fieldData } = copiedFieldRef.current
          const targetSectionId = _sectionId || form.schema.sections[form.schema.sections.length - 1]?.id
          if (targetSectionId) {
            const newField = { ...fieldData, id: genId('fld'), field_id: labelToId(fieldData.label + '_copy') }
            const section = form.schema.sections.find(s => s.id === targetSectionId)
            if (section) {
              dispatchWithHistory({
                type: 'ADD_FIELD',
                payload: { sectionId: targetSectionId, fieldType: newField.type },
              })
            }
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [form.schema, selectedId, selectedType, dispatchWithHistory])

  // ── Beforeunload warning ──────────────────────────────────────────────────

  useEffect(() => {
    function handleBeforeUnload(e) {
      if (!isDirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // ── Auto-save every 30s ───────────────────────────────────────────────────

  useEffect(() => {
    if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setInterval(() => {
      if (isDirty) saveDraft()
    }, 30000)
    return () => clearInterval(autoSaveTimerRef.current)
  }, [isDirty, form])

  // ── Save Draft ────────────────────────────────────────────────────────────

  async function saveDraft() {
    dispatch({ type: 'SET_SAVING', payload: true })
    try {
      const payload = {
        title:               form.title,
        description:         form.description,
        category:            form.category,
        subcategory:         form.subcategory,
        icon:                form.icon,
        status:              form.status,
        is_iview_enabled:    form.is_iview_enabled,
        is_template:         form.is_template,
        requires_cosign:     form.requires_cosign,
        time_limit_minutes:  form.time_limit_minutes,
        clinic_id:           form.clinic_id ?? null,
        scoring_config:      form.scoring_config,
        alert_rules:         form.alert_rules,
        schema:              form.schema,
      }
      let result
      if (form.id) {
        result = await api.patch(`/assessment-forms/${form.id}`, payload)
      } else {
        result = await api.post('/assessment-forms', payload)
      }
      dispatch({ type: 'SET_SAVED', payload: { id: result.id || result.data?.id || form.id } })
    } catch (err) {
      console.error('Save failed:', err)
      dispatch({ type: 'SET_SAVING', payload: false })
    }
  }

  // ── Publish ───────────────────────────────────────────────────────────────

  async function handlePublish() {
    if (!form.id) await saveDraft()
    try {
      await api.post(`/assessment-forms/${form.id}/publish`)
      dispatch({ type: 'SET_FORM_PROP', payload: { key: 'status', value: 'published' } })
    } catch (err) {
      console.error('Publish failed:', err)
      alert(err.message || 'Publish failed. Please try again.')
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const allFields = form.schema.sections.flatMap(s => s.fields.map(f => ({ field: f, sectionId: s.id })))

  const activeSectionId = (() => {
    if (selectedType === 'section') return selectedId
    if (selectedType === 'field') {
      const found = form.schema.sections.find(s => s.fields.some(f => f.id === selectedId))
      return found?.id ?? form.schema.sections[form.schema.sections.length - 1]?.id ?? null
    }
    return form.schema.sections[form.schema.sections.length - 1]?.id ?? null
  })()

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleAddField(type, sectionId) {
    let targetSection = sectionId
    if (!targetSection) {
      if (form.schema.sections.length === 0) {
        dispatchWithHistory({ type: 'ADD_SECTION' })
        return
      }
      targetSection = form.schema.sections[form.schema.sections.length - 1].id
    }
    dispatchWithHistory({ type: 'ADD_FIELD', payload: { sectionId: targetSection, fieldType: type } })
  }

  function handleAddPreset(preset, sectionId) {
    let targetSection = sectionId
    if (!targetSection) {
      if (form.schema.sections.length === 0) {
        dispatchWithHistory({ type: 'ADD_SECTION' })
        return
      }
      targetSection = form.schema.sections[form.schema.sections.length - 1].id
    }
    dispatchWithHistory({ type: 'ADD_FIELD_PRESET', payload: { sectionId: targetSection, preset } })
  }

  function handleAddSection() {
    dispatchWithHistory({ type: 'ADD_SECTION' })
  }

  function handleSelect(id, type) {
    dispatch({ type: 'SELECT', payload: { id, type } })
  }

  // ── DnD ───────────────────────────────────────────────────────────────────

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragEnd(event) {
    const { active, over, delta } = event

    // Palette → add a control to the section under the pointer (or the active one).
    if (active.data.current?.fromPalette) {
      const fieldType = active.data.current?.type
      const toSectionId = over?.data?.current?.sectionId ?? activeSectionId
      if (fieldType && toSectionId) handleAddField(fieldType, toSectionId)
      return
    }

    // Move a placed control on the free grid: snap the drag delta to grid cells.
    if (active.data.current?.kind === 'move') {
      const sectionId = active.data.current.sectionId
      const sec  = form.schema.sections.find(s => s.id === sectionId)
      const grid = gridRefs.current[sectionId]
      if (!sec || !grid) return
      const field = sec.fields.find(f => f.id === active.id)
      if (!field) return
      const stepX = (grid.clientWidth - (GRID_COLS - 1) * GAP) / GRID_COLS + GAP
      const stepY = ROW_H + GAP
      const x = field.layout?.x ?? 0, y = field.layout?.y ?? 0, w = field.layout?.w ?? 6
      const nx = Math.min(Math.max(x + Math.round((delta?.x || 0) / stepX), 0), GRID_COLS - w)
      const ny = Math.max(y + Math.round((delta?.y || 0) / stepY), 0)
      if (nx !== x || ny !== y) {
        dispatchWithHistory({ type: 'SET_FIELD_LAYOUT', payload: { sectionId, fieldId: field.id, layout: { x: nx, y: ny } } })
      }
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">

        {/* ── Toolbar ── */}
        <header className="sticky top-0 z-40 flex items-center gap-3 px-4 py-2.5 bg-gray-900 border-b border-gray-800 flex-shrink-0">
          <button
            onClick={() => navigate('/forms')}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            title="Back to Forms"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Form icon */}
          <span className="text-lg leading-none">{form.icon || '📋'}</span>

          <input
            type="text"
            value={form.title}
            onChange={e => dispatch({ type: 'SET_TITLE', payload: e.target.value })}
            className="flex-1 min-w-0 bg-transparent text-lg font-semibold text-white placeholder-gray-600 outline-none border-b border-transparent focus:border-orange-500 transition-colors py-0.5 max-w-xs"
            placeholder="Untitled Form"
          />

          <select
            value={form.category}
            onChange={e => dispatch({ type: 'SET_CATEGORY', payload: e.target.value })}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-2 py-1.5 outline-none focus:border-orange-500 transition-colors"
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <div className="flex-1" />

          <StatusBadge status={form.status} />

          {/* Settings */}
          <button
            onClick={() => setShowSettings(v => !v)}
            title="Form Settings"
            className={`p-1.5 rounded-lg transition-colors ${
              showSettings
                ? 'bg-[#F5821E]/20 text-[#F5821E] border border-[#F5821E]/30'
                : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            <Settings size={16} />
          </button>

          <button
            onClick={() => setPreviewMode(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              previewMode
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-gray-800 text-gray-300 hover:text-white border border-gray-700'
            }`}
          >
            {previewMode ? <EyeOff size={15} /> : <Eye size={15} />}
            {previewMode ? 'Edit' : 'Preview'}
          </button>

          <button
            onClick={saveDraft}
            disabled={saving || !isDirty}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-800 text-gray-300 hover:text-white border border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={15} />
            {saving ? 'Saving…' : 'Save Draft'}
          </button>

          <button
            onClick={handlePublish}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-500 hover:bg-orange-400 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={15} />
            Publish
          </button>
        </header>

        {/* ── Body: editor (3-col) or live preview ── */}
        <div className="flex flex-1 overflow-hidden">
          {previewMode ? (
          <main className="flex-1 overflow-auto min-h-0 bg-white">
            <FormPreview schema={form.schema} />
          </main>
          ) : (
          <>
          {/* Left: Field Palette */}
          <aside className="hidden md:flex flex-col w-48 flex-shrink-0 border-r border-gray-800 overflow-y-auto bg-gray-900">
            <FieldPalette
              onAddField={handleAddField}
              onAddSection={handleAddSection}
              onAddPreset={handleAddPreset}
              activeSectionId={activeSectionId}
            />
          </aside>

          {/* Center: Canvas (scrollable free grid) */}
          <main className="flex-1 overflow-auto min-h-0">
            <FormCanvas
              schema={form.schema}
              selectedId={selectedId}
              selectedType={selectedType}
              dispatch={dispatchWithHistory}
              onSelect={handleSelect}
              previewMode={previewMode}
              registerGrid={registerGrid}
            />
          </main>

          {/* Right: Properties */}
          <aside className="hidden md:flex flex-col w-80 flex-shrink-0 border-l border-gray-800 overflow-y-auto bg-gray-900">
            <PropertiesPanel
              form={form}
              selectedId={selectedId}
              selectedType={selectedType}
              dispatch={dispatchWithHistory}
              allFields={allFields}
            />
          </aside>
          </>
          )}
        </div>

        {/* Mobile FAB */}
        <button
          onClick={() => setPaletteOpen(v => !v)}
          className="md:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-400 text-white shadow-lg flex items-center justify-center transition-colors"
          aria-label="Add field"
        >
          <Plus size={24} />
        </button>

        {/* Mobile Palette drawer */}
        {paletteOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div className="absolute inset-0 bg-black/60" onClick={() => setPaletteOpen(false)} />
            <div className="relative w-56 bg-gray-900 h-full overflow-y-auto border-r border-gray-800 shadow-2xl">
              <FieldPalette
                onAddField={(type, sid) => { handleAddField(type, sid); setPaletteOpen(false) }}
                onAddSection={() => { handleAddSection(); setPaletteOpen(false) }}
                onAddPreset={(preset, sid) => { handleAddPreset(preset, sid); setPaletteOpen(false) }}
                activeSectionId={activeSectionId}
              />
            </div>
          </div>
        )}

        {/* Form Settings Modal */}
        {showSettings && (
          <FormSettingsModal
            form={form}
            dispatch={dispatch}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    </DndContext>
  )
}
