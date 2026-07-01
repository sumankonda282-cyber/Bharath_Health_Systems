import { useState, useRef, useMemo, useCallback } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { gridColsOf } from '@shared/forms/gridLayout'
import { CSS } from '@dnd-kit/utilities'
import {
  Type, AlignLeft, Hash, Calendar, Clock, CalendarClock, CircleDot,
  CheckSquare, ChevronDown, Star, Calculator, Stethoscope, FlaskConical,
  Table, User, Minus, FileText, RefreshCw, PenLine, Camera, Paperclip,
  GripVertical, X, Eye, EyeOff, Clipboard, Copy, Plus, ChevronUp, ChevronRight,
  Search, Users, Pill, BookOpen, AlertTriangle, Scissors, ToggleLeft,
  BarChart2, LayoutGrid, Sliders, Activity, Layers, Ban, MapPin, Zap,
} from 'lucide-react'

// ─── CareForm free-grid canvas ──────────────────────────────────────────────
// Every field carries layout {x,y,w,h} on a grid whose column count is per-form
// (schema.grid_cols — 12 for legacy forms, 24 for new ones, tunable up to 48).
// The admin drags a control anywhere (snap to grid) and resizes it freely — no
// fixed columns, no rigid boxes. The fill-time renderers honor the same grid so
// design = fill. A finer resolution = more placement freedom.

export const GRID_COLS = 12          // legacy default (flow conversion of old forms)
export const DEFAULT_NEW_COLS = 24   // resolution assigned to newly-created forms
export const ROW_H = 34   // px per grid row — fine vertical placement
export const GAP = 6      // px gap between cells

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFieldTypeIcon(type, size = 16) {
  const props = { size, className: 'text-dim flex-shrink-0' }
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
    patient_auto:      <User {...props} />,
    patient_search:    <Search {...props} />,
    staff_search:      <Users {...props} />,
    medication_search: <Pill {...props} />,
    medication_order:  <Pill {...props} />,
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

function lay(field) {
  const l = field.layout || {}
  return { x: l.x ?? 0, y: l.y ?? 0, w: l.w ?? 6, h: l.h ?? 1 }
}

// True for controls that carry algorithmic intelligence (formula / rules / context).
function hasLogic(field) {
  return (
    field.type === 'calculated' ||
    field.type === 'score_display' ||
    field.type === 'vital_auto' ||
    field.type === 'medication_search' ||
    field.type === 'medication_order' ||
    (field.alert_rules && field.alert_rules.length > 0)
  )
}

// ─── GridField — one placed control (drag to move, handle to resize) ─────────────

function GridField({ field, sectionId, isSelected, onSelect, dispatch, live, onStartResize, overlay = false }) {
  const draggable = useDraggable({
    id: overlay ? `ov_${field.id}` : field.id,
    data: { sectionId, fieldId: field.id, kind: 'move' },
    disabled: overlay,
  })
  const { attributes, listeners, setNodeRef, transform, isDragging } = draggable

  const l = lay(field)
  const w = live?.w ?? l.w
  const h = live?.h ?? l.h

  const style = overlay
    ? {}
    : {
        gridColumn: `${l.x + 1} / span ${w}`,
        gridRow: `${l.y + 1} / span ${h}`,
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        zIndex: isDragging ? 50 : undefined,
      }

  const isBreak = field.type === 'stage_break'

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      onClick={e => { if (!overlay) { e.stopPropagation(); onSelect(field.id, 'field') } }}
      className={[
        'relative group flex flex-col justify-center px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-all select-none overflow-hidden',
        isBreak ? 'surface-2 border-dashed' : 'surface-2',
        'border',
        isSelected ? 'border-[#F5821E] ring-1 ring-[#F5821E]/40' : 'border-app hover:border-app',
        isDragging ? 'opacity-60 shadow-2xl' : '',
        overlay ? 'shadow-2xl w-56' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <GripVertical size={12} className="text-faint flex-shrink-0" />
        {getFieldTypeIcon(field.type, 13)}
        <span className="text-sm font-medium text-app truncate">{field.label || 'Untitled'}</span>
        {field.required && <span className="text-[#F5821E] text-sm leading-none">*</span>}
        {field.conditions?.length > 0 && <Eye size={11} className="text-purple-400 flex-shrink-0" title="Conditional" />}
        {hasLogic(field) && <Zap size={11} className="text-amber-400 flex-shrink-0" title="Has logic / intelligence" />}
        {field.hidden && <EyeOff size={11} className="text-faint flex-shrink-0" />}
      </div>
      <div className="flex items-center gap-2 mt-0.5 min-w-0">
        <span className="text-[10px] surface-3 text-dim px-1.5 py-0.5 rounded flex-shrink-0">{field.type}</span>
        <span className="text-[10px] text-faint font-mono truncate">{field.field_id}</span>
        <span className="text-[10px] text-faint ml-auto flex-shrink-0">{w}×{h}</span>
      </div>

      {!overlay && (
        <>
          {/* Duplicate */}
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); dispatch({ type: 'DUPLICATE_FIELD', payload: { sectionId, fieldId: field.id } }) }}
            className="absolute top-1 right-6 text-faint hover:text-[#F5821E] opacity-0 group-hover:opacity-100 transition-opacity"
            title="Duplicate field (Ctrl+D)"
          >
            <Copy size={12} />
          </button>
          {/* Delete */}
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); dispatch({ type: 'DELETE_FIELD', payload: { sectionId, fieldId: field.id } }) }}
            className="absolute top-1 right-1 text-faint hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete field"
          >
            <X size={13} />
          </button>
          {/* Resize handle (SE corner) */}
          <div
            onPointerDown={e => onStartResize(e, field)}
            onClick={e => e.stopPropagation()}
            title="Drag to resize"
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 text-faint hover:text-[#F5821E]"
          >
            <svg width="8" height="8" viewBox="0 0 8 8"><path d="M8 0v8H0" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
          </div>
        </>
      )}
    </div>
  )
}

// ─── GridBody — the 12-col droppable canvas for one section ──────────────────────

function GridBody({ section, selectedId, selectedType, dispatch, onSelect, registerGrid, cols }) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: section.id, data: { sectionId: section.id } })
  const gridRef = useRef(null)
  const [live, setLive] = useState(null) // { fieldId, w, h } resize preview
  // Vertical snap-guide column indices shown while resizing (edges aligning with
  // other fields' left/right edges) — the "pro" alignment feel.
  const [guides, setGuides] = useState([])

  const totalRows = useMemo(
    () => Math.max(4, ...section.fields.map(f => lay(f).y + lay(f).h)),
    [section.fields]
  )

  const setRefs = useCallback(node => {
    gridRef.current = node
    setDropRef(node)
    registerGrid(section.id, node)
  }, [setDropRef, registerGrid, section.id])

  function startResize(e, field) {
    e.stopPropagation()
    e.preventDefault()
    const grid = gridRef.current
    if (!grid) return
    const stepX = (grid.clientWidth - (cols - 1) * GAP) / cols + GAP
    const stepY = ROW_H + GAP
    const sx = e.clientX, sy = e.clientY
    const l = lay(field)
    // Edges of every OTHER field — used to snap this field's right edge.
    const otherEdges = [...new Set(
      section.fields.filter(f => f.id !== field.id).flatMap(f => { const o = lay(f); return [o.x, o.x + o.w] })
    )]
    function onMove(ev) {
      let w = Math.min(Math.max(l.w + Math.round((ev.clientX - sx) / stepX), 1), cols - l.x)
      const rightEdge = l.x + w
      // Snap the right edge to a nearby neighbour edge (within 1 cell).
      const near = otherEdges.find(edge => Math.abs(edge - rightEdge) <= 1 && edge > l.x)
      const shown = []
      if (near != null) { w = near - l.x; shown.push(near) }
      const h = Math.max(l.h + Math.round((ev.clientY - sy) / stepY), 1)
      setGuides(shown)
      setLive({ fieldId: field.id, w, h })
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setGuides([])
      setLive(cur => {
        if (cur && cur.fieldId === field.id) {
          dispatch({ type: 'SET_FIELD_LAYOUT', payload: { sectionId: section.id, fieldId: field.id, layout: { w: cur.w, h: cur.h } } })
        }
        return null
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div
      ref={setRefs}
      onClick={() => onSelect(section.id, 'section')}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridAutoRows: `${ROW_H}px`,
        gap: `${GAP}px`,
        minHeight: ROW_H * 2,
        gridTemplateRows: `repeat(${totalRows}, ${ROW_H}px)`,
        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px)`,
        backgroundSize: `calc((100% + ${GAP}px) / ${cols}) 100%`,
      }}
      className={`relative rounded-lg p-1 transition-colors ${isOver ? 'bg-[#F5821E]/5 ring-1 ring-[#F5821E]/30' : ''}`}
    >
      {section.fields.map(f => (
        <GridField
          key={f.id}
          field={f}
          sectionId={section.id}
          isSelected={selectedId === f.id && selectedType === 'field'}
          onSelect={onSelect}
          dispatch={dispatch}
          live={live?.fieldId === f.id ? live : null}
          onStartResize={startResize}
        />
      ))}
      {/* Alignment snap-guides (vertical lines at snapping column edges) */}
      {guides.map(edge => (
        <div
          key={edge}
          className="pointer-events-none absolute top-0 bottom-0 w-px bg-[#F5821E] z-40"
          style={{ left: `calc((100% + ${GAP}px) / ${cols} * ${edge} - ${GAP / 2}px)` }}
        />
      ))}
      {section.fields.length === 0 && (
        <div
          style={{ gridColumn: `1 / span ${cols}`, gridRow: '1 / span 3' }}
          className="flex items-center justify-center border-2 border-dashed border-app rounded-lg text-faint text-xs"
        >
          Drag a control here, or click one in the palette
        </div>
      )}
    </div>
  )
}

// ─── SectionBlock — header chrome + grid body ────────────────────────────────────

function SectionBlock({ section, selectedId, selectedType, dispatch, onSelect, registerGrid, cols }) {
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const isSelected  = selectedId === section.id && selectedType === 'section'
  const isNaAllowed = section.applicability_mode === 'na_allowed'

  function handleAddField(type) {
    dispatch({ type: 'ADD_FIELD', payload: { sectionId: section.id, fieldType: type } })
    setShowQuickAdd(false)
  }

  return (
    <div className={['surface-2 border rounded-xl mb-4 overflow-hidden transition-all', isSelected ? 'border-[#F5821E]' : 'border-app'].join(' ')}>
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b border-app cursor-pointer select-none"
        style={{ background: section.header_color ? section.header_color + '1f' : undefined }}
        onClick={() => onSelect(section.id, 'section')}
      >
        <GripVertical size={16} className="text-faint flex-shrink-0" />
        <div className="flex flex-col flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button type="button" title="Move section up"
            onClick={() => dispatch({ type: 'MOVE_SECTION', payload: { sectionId: section.id, dir: -1 } })}
            className="text-faint hover:text-dim leading-none transition-colors"><ChevronUp size={12} /></button>
          <button type="button" title="Move section down"
            onClick={() => dispatch({ type: 'MOVE_SECTION', payload: { sectionId: section.id, dir: 1 } })}
            className="text-faint hover:text-dim leading-none transition-colors"><ChevronDown size={12} /></button>
        </div>
        <input
          className="flex-1 bg-transparent text-app font-semibold text-sm focus:outline-none min-w-0"
          style={{ color: section.header_color || undefined }}
          value={section.title}
          onClick={e => e.stopPropagation()}
          onChange={e => dispatch({ type: 'UPDATE_SECTION', payload: { sectionId: section.id, key: 'title', value: e.target.value } })}
          placeholder="Section title…"
        />
        {isNaAllowed && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium flex-shrink-0">
            <Ban size={10} /> N/A
          </span>
        )}
        {section.collapsible && (
          <button
            onClick={e => { e.stopPropagation(); dispatch({ type: 'UPDATE_SECTION', payload: { sectionId: section.id, key: 'collapsed', value: !section.collapsed } }) }}
            className="text-faint hover:text-dim transition-colors"
            title={section.collapsed ? 'Expand' : 'Collapse'}
          >
            {section.collapsed ? <ChevronRight size={16} /> : <ChevronUp size={16} />}
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); dispatch({ type: 'DELETE_SECTION', payload: section.id }) }}
          className="text-faint hover:text-red-400 transition-colors" title="Delete section"
        ><X size={16} /></button>
      </div>

      {/* Body */}
      {!section.collapsed && (
        <div className="p-4">
          <GridBody
            section={section}
            selectedId={selectedId}
            selectedType={selectedType}
            dispatch={dispatch}
            onSelect={onSelect}
            registerGrid={registerGrid}
            cols={cols}
          />
          <div className="mt-3 relative">
            <button onClick={() => setShowQuickAdd(v => !v)} className="flex items-center gap-1 text-xs text-faint hover:text-dim transition-colors">
              <Plus size={12} /> Add Field
            </button>
            {showQuickAdd && (
              <div className="absolute left-0 top-6 z-20 surface-2 border border-app rounded-xl shadow-xl p-2 grid grid-cols-2 gap-1 w-56">
                {QUICK_ADD_TYPES.map(ft => (
                  <button key={ft.type} onClick={() => handleAddField(ft.type)}
                    className="flex items-center gap-1.5 text-xs text-dim hover:surface-3 px-2 py-1.5 rounded-lg transition-colors text-left">
                    {getFieldTypeIcon(ft.type, 12)} {ft.label}
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

export default function FormCanvas({ schema, selectedId, selectedType, dispatch, onSelect, registerGrid }) {
  // NOTE: the DndContext is owned by FormBuilder (so the field palette and the
  // canvas share one context). This component only renders the grid; drag-move
  // and palette-drop are handled in FormBuilder.handleDragEnd.
  const cols = gridColsOf(schema)
  return (
    <div className="min-h-full p-6">
      {schema.sections.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
          <div className="w-20 h-20 rounded-full surface-2 flex items-center justify-center mb-4">
            <Clipboard size={36} className="text-faint" />
          </div>
          <h3 className="text-lg font-semibold text-app mb-2">Start building your CareForm</h3>
          <p className="text-faint text-sm mb-6">Add a section, then drag controls onto the grid and place them freely.</p>
          <button onClick={() => dispatch({ type: 'ADD_SECTION' })} className="flex items-center gap-2 px-5 py-2.5 bg-[#F5821E] hover:bg-[#e07010] text-app font-medium rounded-xl transition-colors">
            <Plus size={16} /> Add First Section
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
              registerGrid={registerGrid}
              cols={cols}
            />
          ))}
          <button onClick={() => dispatch({ type: 'ADD_SECTION' })} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-app hover:border-[#F5821E] hover:text-[#F5821E] text-faint rounded-xl transition-colors text-sm font-medium">
            <Plus size={16} /> Add Section
          </button>
        </>
      )}
    </div>
  )
}
