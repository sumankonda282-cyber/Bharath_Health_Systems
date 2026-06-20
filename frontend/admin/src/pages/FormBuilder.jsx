import { useReducer, useRef, useEffect, useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Eye, EyeOff, Send, Plus } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import api from '../api/client'
import FieldPalette from '../components/formbuilder/FieldPalette'
import FormCanvas from '../components/formbuilder/FormCanvas'
import PropertiesPanel from '../components/formbuilder/PropertiesPanel'

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function makeSection(index) {
  return {
    id: genId('sec'),
    title: `Section ${index}`,
    description: '',
    layout: 1,
    collapsible: false,
    collapsed: false,
    repeatable: false,
    min_instances: 1,
    max_instances: 5,
    fields: [],
  }
}

function makeField(type) {
  return {
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
    options: [],
    conditions: [],
    alert_rules: [],
  }
}

// ─── Initial State ───────────────────────────────────────────────────────────

const initialState = {
  form: {
    id: null,
    title: 'Untitled Form',
    description: '',
    category: 'general',
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

// ─── Reducer ─────────────────────────────────────────────────────────────────

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
        form: {
          ...form,
          schema: {
            ...form.schema,
            sections: [...form.schema.sections, newSection],
          },
        },
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
            sections: form.schema.sections.map((s) =>
              s.id === sectionId ? { ...s, [key]: value } : s
            ),
          },
        },
      }
    }

    case 'DELETE_SECTION': {
      const remaining = form.schema.sections.filter((s) => s.id !== action.payload)
      return {
        ...state,
        isDirty: true,
        selectedId: null,
        selectedType: null,
        form: {
          ...form,
          schema: { ...form.schema, sections: remaining },
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
            sections: form.schema.sections.map((s) => {
              if (s.id !== sectionId) return s
              const fields = [...s.fields]
              const insertAt = afterIndex != null ? afterIndex + 1 : fields.length
              fields.splice(insertAt, 0, field)
              return { ...s, fields }
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
            sections: form.schema.sections.map((s) => {
              if (s.id !== sectionId) return s
              return {
                ...s,
                fields: s.fields.map((f) => {
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
            sections: form.schema.sections.map((s) => {
              if (s.id !== sectionId) return s
              return { ...s, fields: s.fields.filter((f) => f.id !== fieldId) }
            }),
          },
        },
      }
    }

    case 'MOVE_FIELD': {
      const { fromSectionId, toSectionId, fromIndex, toIndex } = action.payload
      let movingField = null
      const sections = form.schema.sections.map((s) => {
        if (s.id === fromSectionId) {
          const fields = [...s.fields]
          ;[movingField] = fields.splice(fromIndex, 1)
          return { ...s, fields }
        }
        return s
      })
      const finalSections = sections.map((s) => {
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
            sections: form.schema.sections.map((s) => {
              if (s.id !== sectionId) return s
              return {
                ...s,
                fields: s.fields.map((f) => {
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
            sections: form.schema.sections.map((s) => {
              if (s.id !== sectionId) return s
              return {
                ...s,
                fields: s.fields.map((f) => {
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
      return {
        ...state,
        selectedId: action.payload.id,
        selectedType: action.payload.type,
      }

    case 'SET_SAVED':
      return {
        ...state,
        isDirty: false,
        saving: false,
        form: { ...form, id: action.payload.id },
      }

    case 'SET_SAVING':
      return { ...state, saving: action.payload }

    case 'SET_SCHEMA':
      return {
        ...state,
        isDirty: true,
        form: { ...form, schema: action.payload },
      }

    case 'LOAD_FORM':
      return {
        ...state,
        isDirty: false,
        saving: false,
        form: { ...initialState.form, ...action.payload },
      }

    default:
      return state
  }
}

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    draft: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    published: 'bg-green-500/20 text-green-400 border border-green-500/30',
    retired: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  }
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${map[status] || map.draft}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ─── Category Options ────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'intake', label: 'Intake' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'consent', label: 'Consent' },
  { value: 'discharge', label: 'Discharge' },
  { value: 'followup', label: 'Follow-up' },
  { value: 'survey', label: 'Survey' },
  { value: 'clinical', label: 'Clinical' },
]

// ─── Main Component ──────────────────────────────────────────────────────────

export default function FormBuilder() {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const [state, dispatch] = useReducer(reducer, initialState)
  const { form, selectedId, selectedType, isDirty, saving } = state

  const historyRef = useRef({ past: [], future: [] })
  const copiedFieldRef = useRef(null)
  const autoSaveTimerRef = useRef(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  // ── Load existing form ──────────────────────────────────────────────────

  useEffect(() => {
    if (!routeId) return
    api.get(`/assessment-forms/${routeId}`)
      .then((data) => {
        dispatch({ type: 'LOAD_FORM', payload: data })
      })
      .catch((err) => {
        console.error('Failed to load form:', err)
      })
  }, [routeId])

  // ── History wrapper ─────────────────────────────────────────────────────

  const dispatchWithHistory = useCallback(
    (action) => {
      const schemaChangingActions = [
        'ADD_SECTION', 'DELETE_SECTION', 'UPDATE_SECTION',
        'ADD_FIELD', 'DELETE_FIELD', 'MOVE_FIELD',
        'UPDATE_FIELD_PROP', 'SET_FIELD',
        'ADD_ALERT_RULE', 'REMOVE_ALERT_RULE',
      ]
      if (schemaChangingActions.includes(action.type)) {
        const snapshot = JSON.stringify(form.schema)
        historyRef.current.past = [
          ...historyRef.current.past.slice(-19),
          snapshot,
        ]
        historyRef.current.future = []
      }
      dispatch(action)
    },
    [form.schema]
  )

  // ── Undo / Redo ─────────────────────────────────────────────────────────

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
          const field = allFields.find((f) => f.field.id === selectedId)
          if (field) copiedFieldRef.current = { ...field.field, sectionId: field.sectionId }
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (copiedFieldRef.current) {
          const { sectionId, ...fieldData } = copiedFieldRef.current
          const newField = { ...fieldData, id: genId('fld'), field_id: labelToId(fieldData.label + '_copy') }
          const section = form.schema.sections.find((s) => s.id === sectionId)
          if (section) {
            dispatchWithHistory({
              type: 'ADD_FIELD',
              payload: {
                sectionId,
                fieldType: newField.type,
                afterIndex: section.fields.length - 1,
              },
            })
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [form.schema, selectedId, selectedType, dispatchWithHistory])

  // ── Beforeunload warning ────────────────────────────────────────────────

  useEffect(() => {
    function handleBeforeUnload(e) {
      if (!isDirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // ── Auto-save ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setInterval(() => {
      if (isDirty) saveDraft()
    }, 30000)
    return () => clearInterval(autoSaveTimerRef.current)
  }, [isDirty, form])

  // ── API: Save Draft ─────────────────────────────────────────────────────

  async function saveDraft() {
    dispatch({ type: 'SET_SAVING', payload: true })
    try {
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        status: form.status,
        is_iview_enabled: form.is_iview_enabled,
        requires_cosign: form.requires_cosign,
        time_limit_minutes: form.time_limit_minutes,
        scoring_config: form.scoring_config,
        alert_rules: form.alert_rules,
        schema: form.schema,
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

  // ── API: Publish ────────────────────────────────────────────────────────

  async function handlePublish() {
    if (!form.id) {
      await saveDraft()
    }
    try {
      await api.post(`/assessment-forms/${form.id}/publish`)
      dispatch({ type: 'SET_FORM_PROP', payload: { key: 'status', value: 'published' } })
    } catch (err) {
      console.error('Publish failed:', err)
      alert(err.message || 'Publish failed. Please try again.')
    }
  }

  // ── Derived: allFields flat list ────────────────────────────────────────

  const allFields = form.schema.sections.flatMap((s) =>
    s.fields.map((f) => ({ field: f, sectionId: s.id }))
  )

  // ── Active section (for palette) ────────────────────────────────────────

  const activeSectionId = (() => {
    if (selectedType === 'section') return selectedId
    if (selectedType === 'field') {
      const found = form.schema.sections.find((s) => s.fields.some((f) => f.id === selectedId))
      return found?.id ?? form.schema.sections[form.schema.sections.length - 1]?.id ?? null
    }
    return form.schema.sections[form.schema.sections.length - 1]?.id ?? null
  })()

  // ── Handlers ────────────────────────────────────────────────────────────

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

  function handleAddSection() {
    dispatchWithHistory({ type: 'ADD_SECTION' })
  }

  function handleSelect(id, type) {
    dispatch({ type: 'SELECT', payload: { id, type } })
  }

  // ── DnD sensors ─────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const fromPalette = active.data.current?.fromPalette
    if (fromPalette) {
      const fieldType = active.data.current?.type
      const toSectionId = over.data.current?.sectionId ?? activeSectionId
      if (fieldType && toSectionId) {
        handleAddField(fieldType, toSectionId)
      }
      return
    }

    const fromSectionId = active.data.current?.sectionId
    const toSectionId = over.data.current?.sectionId
    const fromIndex = active.data.current?.index
    const toIndex = over.data.current?.index

    if (fromSectionId && toSectionId && fromIndex != null && toIndex != null) {
      dispatchWithHistory({
        type: 'MOVE_FIELD',
        payload: { fromSectionId, toSectionId, fromIndex, toIndex },
      })
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

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

          <input
            type="text"
            value={form.title}
            onChange={(e) => dispatch({ type: 'SET_TITLE', payload: e.target.value })}
            className="flex-1 min-w-0 bg-transparent text-lg font-semibold text-white placeholder-gray-600 outline-none border-b border-transparent focus:border-orange-500 transition-colors py-0.5 max-w-xs"
            placeholder="Untitled Form"
          />

          <select
            value={form.category}
            onChange={(e) => dispatch({ type: 'SET_CATEGORY', payload: e.target.value })}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-2 py-1.5 outline-none focus:border-orange-500 transition-colors"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <div className="flex-1" />

          <StatusBadge status={form.status} />

          <button
            onClick={() => setPreviewMode((v) => !v)}
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

        {/* ── Three-column body ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Field Palette */}
          <aside className={`hidden md:flex flex-col w-48 flex-shrink-0 border-r border-gray-800 overflow-y-auto bg-gray-900`}>
            <FieldPalette
              onAddField={handleAddField}
              onAddSection={handleAddSection}
              activeSectionId={activeSectionId}
            />
          </aside>

          {/* Center: Canvas */}
          <main className="flex-1 overflow-y-auto">
            <FormCanvas
              schema={form.schema}
              selectedId={selectedId}
              selectedType={selectedType}
              dispatch={dispatchWithHistory}
              onSelect={handleSelect}
              previewMode={previewMode}
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
        </div>

        {/* Mobile FAB */}
        <button
          onClick={() => setPaletteOpen((v) => !v)}
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
                activeSectionId={activeSectionId}
              />
            </div>
          </div>
        )}
      </div>
    </DndContext>
  )
}

