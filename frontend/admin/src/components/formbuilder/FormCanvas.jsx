import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Type, AlignLeft, Hash, Calendar, Clock, CalendarClock, CircleDot,
  CheckSquare, ChevronDown, Star, Calculator, Stethoscope, FlaskConical,
  Table, User, Minus, FileText, RefreshCw, PenLine, Camera, Paperclip,
  GripVertical, X, Eye, EyeOff, Clipboard, Plus, ChevronUp, ChevronRight,
  Search, Users, Pill, BookOpen, AlertTriangle, Scissors, ToggleLeft,
  BarChart2, LayoutGrid, Sliders, Activity, Layers, Ban, MapPin,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFieldTypeIcon(type, size = 16) {
  const props = { size, className: 'text-gray-400 flex-shrink-0' }
  const map = {
    text:              <Type {...props} />,
    textarea:          <AlignLeft {...props} />,
    number:            <Hash {...props} />,
    date:              <Calendar {...props} />,
    time:              <Clock {...props} />,
    datetime:          <CalendarClock {...props} />,
    radio:             <CircleDot {...props} />,
    checkbox:          <CheckSquare {...props} />,
    dropdown:          <ChevronDown {...props} />,
    yes_no:            <ToggleLeft {...props} />,
    scale:             <Star {...props} />,
    matrix:            <LayoutGrid {...props} />,
    numeric_range:     <Sliders {...props} />,
    calculated:        <Calculator {...props} />,
    score_display:     <BarChart2 {...props} />,
    vital_auto:        <Activity {...props} />,
    patient_search:    <Search {...props} />,
    staff_search:      <Users {...props} />,
    medication_search: <Pill {...props} />,
    diagnosis_search:  <BookOpen {...props} />,
    allergy_search:    <AlertTriangle {...props} />,
    procedure_search:  <Scissors {...props} />,
    lab_test_search:   <FlaskConical {...props} />,
    body_site_search:  <MapPin {...props} />,
    snomed:            <Stethoscope {...props} />,
    loinc:             <FlaskConical {...props} />,
    table:             <Table {...props} />,
    body_map:          <User {...props} />,
    label:             <Type {...props} />,
    divider:           <Minus {...props} />,
    rich_text:         <FileText {...props} />,
    repeating:         <RefreshCw {...props} />,
    stage_break:       <Layers {...props} />,
    signature:         <PenLine {...props} />,
    photo:             <Camera {...props} />,
    file:              <Paperclip {...props} />,
  }
  return map[type] || <Type {...props} />
}

function getColSpanClass(field, sectionLayout) {
  if (!sectionLayout || sectionLayout <= 1) return ''
  const span = field.col_span || 1
  if (sectionLayout === 2) return span >= 2 ? 'col-span-2' : 'col-span-1'
  if (span >= 3) return 'col-span-3'
  if (span === 2) return 'col-span-2'
  return 'col-span-1'
}

const QUICK_ADD_TYPES = [
  { type: 'text',              label: 'Text' },
  { type: 'textarea',          label: 'Textarea' },
  { type: 'number',            label: 'Number' },
  { type: 'date',              label: 'Date' },
  { type: 'radio',             label: 'Radio' },
  { type: 'checkbox',          label: 'Checkbox' },
  { type: 'dropdown',          label: 'Dropdown' },
  { type: 'yes_no',            label: 'Yes / No' },
  { type: 'scale',             label: 'Scale' },
  { type: 'numeric_range',     label: 'Range' },
  { type: 'calculated',        label: 'Calculated' },
  { type: 'score_display',     label: 'Score' },
  { type: 'patient_search',    label: 'Patient' },
  { type: 'medication_search', label: 'Medication' },
  { type: 'diagnosis_search',  label: 'Diagnosis' },
  { type: 'signature',         label: 'Signature' },
  { type: 'stage_break',       label: 'Stage Break' },
]

// ─── FieldCard ─────────────────────────────────────────────────────────────────

function FieldCard({ field, sectionId, sectionLayout, isSelected, onSelect, dispatch, overlay = false }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
    data: { sectionId, fieldId: field.id },
  })

  const style = overlay
    ? {}
    : { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  const isStageBreak = field.type === 'stage_break'
  const colClass = isStageBreak ? 'col-span-full' : getColSpanClass(field, sectionLayout)

  // Stage break: full-width horizontal rule with stage title
  if (isStageBreak) {
    return (
      <div
        ref={overlay ? undefined : setNodeRef}
        style={style}
        onClick={() => !overlay && onSelect(field.id, 'field')}
        className={`${colClass} flex items-center gap-3 py-2 cursor-pointer group`}
      >
        <div
          className={`flex-1 border-t-2 transition-colors ${
            isSelected ? 'border-[#F5821E]' : 'border-dashed border-gray-600 group-hover:border-gray-500'
          }`}
        />
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all ${
            isSelected
              ? 'bg-[#F5821E]/10 border-[#F5821E]/40 text-[#F5821E]'
              : 'bg-gray-800 border-gray-700 text-gray-400 group-hover:border-gray-500 group-hover:text-gray-200'
          }`}
        >
          <div
            {...(overlay ? {} : { ...attributes, ...listeners })}
            className="cursor-grab"
            onClick={e => e.stopPropagation()}
          >
            <GripVertical size={11} />
          </div>
          <Layers size={11} />
          {field.stage_title || field.label || `Stage ${field.stage_number || 1}`}
          {!overlay && (
            <button
              onClick={e => {
                e.stopPropagation()
                dispatch({ type: 'DELETE_FIELD', payload: { sectionId, fieldId: field.id } })
              }}
              className="ml-0.5 text-gray-600 hover:text-red-400 transition-colors"
            >
              <X size={11} />
            </button>
          )}
        </div>
        <div
          className={`flex-1 border-t-2 transition-colors ${
            isSelected ? 'border-[#F5821E]' : 'border-dashed border-gray-600 group-hover:border-gray-500'
          }`}
        />
      </div>
    )
  }

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      onClick={() => !overlay && onSelect(field.id, 'field')}
      className={[
        colClass,
        'bg-gray-800 border rounded-xl p-3 cursor-pointer transition-all flex items-start gap-2',
        isSelected ? 'border-[#F5821E] ring-1 ring-[#F5821E]/30' : 'border-gray-700 hover:border-gray-600',
        overlay ? 'opacity-70 shadow-xl' : '',
      ].join(' ')}
    >
      {/* Drag handle */}
      <div
        {...(overlay ? {} : { ...attributes, ...listeners })}
        className="mt-0.5 cursor-grab active:cursor-grabbing text-gray-600 flex-shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical size={14} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          {getFieldTypeIcon(field.type, 14)}
          <span className="text-sm font-medium text-white truncate">{field.label || 'Untitled'}</span>
          {field.required && <span className="text-[#F5821E] text-sm leading-none">*</span>}
          {field.conditions?.length > 0 && (
            <Eye size={12} className="text-purple-400 flex-shrink-0" />
          )}
          {field.hidden && (
            <EyeOff size={12} className="text-gray-500 flex-shrink-0" />
          )}
          {field.type === 'calculated' && (
            <span className="text-xs bg-blue-900/50 text-blue-300 px-1 rounded font-mono">&#402;</span>
          )}
          {field.col_span > 1 && sectionLayout > 1 && (
            <span className="text-xs bg-indigo-900/50 text-indigo-300 px-1 rounded">×{field.col_span}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">
            {field.type}
          </span>
          <span className="text-xs text-gray-500 font-mono truncate">{field.field_id}</span>
        </div>
      </div>

      {/* Delete */}
      {!overlay && (
        <button
          onClick={e => {
            e.stopPropagation()
            dispatch({ type: 'DELETE_FIELD', payload: { sectionId, fieldId: field.id } })
          }}
          className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

// ─── SectionBlock ──────────────────────────────────────────────────────────────

function SectionBlock({ section, selectedId, selectedType, dispatch, onSelect }) {
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  const isSelected  = selectedId === section.id && selectedType === 'section'
  const isNaAllowed = section.applicability_mode === 'na_allowed'

  const gridClass = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' }[section.layout] || 'grid-cols-1'

  function handleAddField(type) {
    dispatch({ type: 'ADD_FIELD', payload: { sectionId: section.id, fieldType: type } })
    setShowQuickAdd(false)
  }

  return (
    <div
      className={[
        'bg-gray-800/50 border rounded-xl mb-4 overflow-hidden transition-all',
        isSelected ? 'border-[#F5821E]' : 'border-gray-700',
      ].join(' ')}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b border-gray-700/60 cursor-pointer select-none"
        onClick={() => onSelect(section.id, 'section')}
      >
        <GripVertical size={16} className="text-gray-600 flex-shrink-0 cursor-grab" />

        <input
          className="flex-1 bg-transparent text-white font-semibold text-sm focus:outline-none min-w-0"
          value={section.title}
          onClick={e => e.stopPropagation()}
          onChange={e =>
            dispatch({ type: 'UPDATE_SECTION', payload: { sectionId: section.id, key: 'title', value: e.target.value } })
          }
          placeholder="Section title…"
        />

        {/* N/A badge */}
        {isNaAllowed && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium flex-shrink-0">
            <Ban size={10} />
            N/A
          </span>
        )}

        {/* Layout buttons */}
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {[1, 2, 3].map(col => (
            <button
              key={col}
              title={`${col} column${col > 1 ? 's' : ''}`}
              onClick={() =>
                dispatch({ type: 'UPDATE_SECTION', payload: { sectionId: section.id, key: 'layout', value: col } })
              }
              className={[
                'w-6 h-6 rounded text-xs font-bold transition-colors',
                section.layout === col ? 'bg-[#F5821E] text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600',
              ].join(' ')}
            >
              {col}
            </button>
          ))}
        </div>

        {/* Collapse toggle (only when collapsible) */}
        {section.collapsible && (
          <button
            onClick={e => {
              e.stopPropagation()
              dispatch({ type: 'UPDATE_SECTION', payload: { sectionId: section.id, key: 'collapsed', value: !section.collapsed } })
            }}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            title={section.collapsed ? 'Expand' : 'Collapse'}
          >
            {section.collapsed ? <ChevronRight size={16} /> : <ChevronUp size={16} />}
          </button>
        )}

        {/* Delete section */}
        <button
          onClick={e => {
            e.stopPropagation()
            dispatch({ type: 'DELETE_SECTION', payload: section.id })
          }}
          className="text-gray-600 hover:text-red-400 transition-colors"
          title="Delete section"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      {!section.collapsed && (
        <div className="p-4">
          <SortableContext items={section.fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
            {section.fields.length > 0 ? (
              <div className={`grid ${gridClass} gap-3`}>
                {section.fields.map(field => (
                  <FieldCard
                    key={field.id}
                    field={field}
                    sectionId={section.id}
                    sectionLayout={section.layout || 1}
                    isSelected={selectedId === field.id && selectedType === 'field'}
                    onSelect={onSelect}
                    dispatch={dispatch}
                  />
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center text-gray-500 text-sm">
                Drop a field here or click a type in the palette
              </div>
            )}
          </SortableContext>

          {/* Quick-add field */}
          <div className="mt-3 relative">
            <button
              onClick={() => setShowQuickAdd(v => !v)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <Plus size={12} />
              Add Field
            </button>
            {showQuickAdd && (
              <div className="absolute left-0 top-6 z-20 bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-2 grid grid-cols-2 gap-1 w-56">
                {QUICK_ADD_TYPES.map(ft => (
                  <button
                    key={ft.type}
                    onClick={() => handleAddField(ft.type)}
                    className="flex items-center gap-1.5 text-xs text-gray-300 hover:bg-gray-700 px-2 py-1.5 rounded-lg transition-colors text-left"
                  >
                    {getFieldTypeIcon(ft.type, 12)}
                    {ft.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── FormCanvas ────────────────────────────────────────────────────────────────

export default function FormCanvas({ schema, selectedId, selectedType, dispatch, onSelect }) {
  const [activeItem, setActiveItem] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  function handleDragStart(event) {
    const { active } = event
    if (String(active.id).startsWith('fld_')) {
      for (const sec of schema.sections) {
        const field = sec.fields.find(f => f.id === active.id)
        if (field) {
          setActiveItem({ field, sectionLayout: sec.layout || 1 })
          break
        }
      }
    }
  }

  function handleDragEnd(event) {
    const { active, over } = event
    setActiveItem(null)
    if (!over) return

    const activeId = active.id
    const overId   = over.id

    // Drop from palette → add new field
    if (active.data.current?.fromPalette) {
      const targetSectionId =
        over.data.current?.sectionId ||
        (String(overId).startsWith('sec_') ? overId : null)
      if (!targetSectionId) return
      dispatch({ type: 'ADD_FIELD', payload: { sectionId: targetSectionId, fieldType: active.data.current.type } })
      return
    }

    // Reorder / move field between sections
    if (String(activeId).startsWith('fld_') && activeId !== overId) {
      const fromSectionId = active.data.current?.sectionId
      const toSectionId   = over.data.current?.sectionId || fromSectionId

      const fromSection = schema.sections.find(s => s.id === fromSectionId)
      const toSection   = schema.sections.find(s => s.id === toSectionId)
      if (!fromSection || !toSection) return

      const fromIndex = fromSection.fields.findIndex(f => f.id === activeId)
      const toIndex   = toSection.fields.findIndex(f => f.id === overId)

      dispatch({
        type: 'MOVE_FIELD',
        payload: {
          fromSectionId,
          toSectionId,
          fromIndex,
          toIndex: toIndex < 0 ? toSection.fields.length : toIndex,
        },
      })
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 overflow-y-auto p-6">
        {schema.sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
            <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-4">
              <Clipboard size={36} className="text-gray-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Start building your form</h3>
            <p className="text-gray-500 text-sm mb-6">Add a section to get started, or drag a field from the palette</p>
            <button
              onClick={() => dispatch({ type: 'ADD_SECTION' })}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#F5821E] hover:bg-[#e07010] text-white font-medium rounded-xl transition-colors"
            >
              <Plus size={16} />
              Add First Section
            </button>
          </div>
        ) : (
          <>
            {schema.sections.map(section => (
              <SectionBlock
                key={section.id}
                section={section}
                selectedId={selectedId}
                selectedType={selectedType}
                dispatch={dispatch}
                onSelect={onSelect}
              />
            ))}

            <button
              onClick={() => dispatch({ type: 'ADD_SECTION' })}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-700 hover:border-[#F5821E] hover:text-[#F5821E] text-gray-500 rounded-xl transition-colors text-sm font-medium"
            >
              <Plus size={16} />
              Add Section
            </button>
          </>
        )}
      </div>

      <DragOverlay>
        {activeItem ? (
          <FieldCard
            field={activeItem.field}
            sectionId={null}
            sectionLayout={activeItem.sectionLayout}
            isSelected={false}
            onSelect={() => {}}
            dispatch={() => {}}
            overlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
