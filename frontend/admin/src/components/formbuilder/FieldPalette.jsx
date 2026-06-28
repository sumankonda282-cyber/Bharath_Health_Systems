import { useDraggable } from '@dnd-kit/core'
import {
  Type, AlignLeft, Hash, Calendar, Clock, CalendarClock,
  CircleDot, CheckSquare, ChevronDown, Star,
  Calculator, Stethoscope, FlaskConical, Table, User,
  Minus, FileText, RefreshCw, PenLine, Camera, Paperclip, Plus,
  Search, Users, Pill, BookOpen, AlertTriangle, Scissors,
  ToggleLeft, BarChart2, LayoutGrid, Sliders, Activity, Layers, MapPin, Scan,
} from 'lucide-react'

// ─── Field Groups ────────────────────────────────────────────────────────────

const FIELD_GROUPS = [
  {
    label: 'Inputs',
    fields: [
      { type: 'text',      icon: Type,         label: 'Single Line' },
      { type: 'textarea',  icon: AlignLeft,     label: 'Multi-line' },
      { type: 'number',    icon: Hash,          label: 'Numeric' },
      { type: 'date',      icon: Calendar,      label: 'Date' },
      { type: 'time',      icon: Clock,         label: 'Time' },
      { type: 'datetime',  icon: CalendarClock, label: 'Date & Time' },
    ],
  },
  {
    label: 'Choice',
    fields: [
      { type: 'radio',    icon: CircleDot,   label: 'Single Choice' },
      { type: 'checkbox', icon: CheckSquare, label: 'Multi Choice' },
      { type: 'dropdown', icon: ChevronDown, label: 'Dropdown' },
      { type: 'yes_no',   icon: ToggleLeft,  label: 'Yes / No' },
      { type: 'scale',    icon: Star,        label: 'Rating Scale' },
      { type: 'matrix',   icon: LayoutGrid,  label: 'Matrix' },
    ],
  },
  {
    label: 'Numeric / Score',
    fields: [
      { type: 'numeric_range', icon: Sliders,     label: 'Range' },
      { type: 'calculated',    icon: Calculator,  label: 'Calculated' },
      { type: 'score_display', icon: BarChart2,   label: 'Score' },
      { type: 'vital_auto',    icon: Activity,    label: 'Auto Vital' },
    ],
  },
  {
    label: 'Clinical Search',
    fields: [
      { type: 'patient_search',    icon: Search,        label: 'Patient' },
      { type: 'staff_search',      icon: Users,         label: 'Staff / MD' },
      { type: 'medication_search', icon: Pill,          label: 'Medication' },
      { type: 'diagnosis_search',  icon: BookOpen,      label: 'Diagnosis' },
      { type: 'allergy_search',    icon: AlertTriangle, label: 'Allergy' },
      { type: 'procedure_search',  icon: Scissors,      label: 'Procedure' },
      { type: 'lab_test_search',   icon: FlaskConical,  label: 'Lab Test' },
      { type: 'imaging_search',    icon: Scan,          label: 'Imaging Study' },
      { type: 'body_site_search',  icon: MapPin,        label: 'Body Site' },
    ],
  },
  {
    label: 'Clinical',
    fields: [
      { type: 'snomed',    icon: Stethoscope,  label: 'SNOMED' },
      { type: 'loinc',     icon: FlaskConical, label: 'LOINC' },
      { type: 'table',     icon: Table,        label: 'Data Table' },
      { type: 'body_map',  icon: User,         label: 'Body Map' },
    ],
  },
  {
    label: 'Layout',
    fields: [
      { type: 'label',       icon: Type,     label: 'Heading' },
      { type: 'divider',     icon: Minus,    label: 'Divider' },
      { type: 'rich_text',   icon: FileText, label: 'Rich Text' },
      { type: 'repeating',   icon: RefreshCw, label: 'Repeating' },
      { type: 'stage_break', icon: Layers,   label: 'Stage Break' },
    ],
  },
  {
    label: 'Advanced',
    fields: [
      { type: 'signature', icon: PenLine,   label: 'Signature' },
      { type: 'photo',     icon: Camera,    label: 'Photo' },
      { type: 'file',      icon: Paperclip, label: 'File' },
    ],
  },
]

// ─── DraggableChip ───────────────────────────────────────────────────────────

function DraggableChip({ type, label, icon: Icon, onAddField, activeSectionId }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: 'palette_' + type,
    data: { type, fromPalette: true },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onAddField(type, activeSectionId)}
      className={`flex flex-col items-center gap-1 p-2 rounded-lg cursor-pointer
        hover:bg-gray-800 text-gray-300 hover:text-white transition-colors text-center
        ${isDragging ? 'opacity-50' : ''}`}
    >
      <Icon size={16} />
      <span className="text-[10px] leading-tight">{label}</span>
    </div>
  )
}

// ─── FieldPalette ────────────────────────────────────────────────────────────

export default function FieldPalette({ onAddField, onAddSection, activeSectionId }) {
  return (
    <div className="flex flex-col h-full bg-gray-900 overflow-y-auto">
      <div className="flex-1 pb-4">
        {FIELD_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2 mt-2">
              {group.label}
            </p>
            <div className="grid grid-cols-2 gap-1 px-2">
              {group.fields.map(({ type, icon, label }) => (
                <DraggableChip
                  key={type}
                  type={type}
                  icon={icon}
                  label={label}
                  onAddField={onAddField}
                  activeSectionId={activeSectionId}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="sticky bottom-0 px-3 py-3 bg-gray-900 border-t border-gray-800">
        <button
          onClick={onAddSection}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
            bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 hover:text-orange-300
            border border-orange-500/30 text-xs font-semibold transition-colors"
        >
          <Plus size={13} />
          Add Section
        </button>
      </div>
    </div>
  )
}
