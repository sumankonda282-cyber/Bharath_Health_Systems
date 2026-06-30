import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import {
  Type, AlignLeft, Hash, Calendar, Clock, CalendarClock,
  CircleDot, CheckSquare, ChevronDown, Star,
  Calculator, Stethoscope, FlaskConical, Table, User,
  Minus, FileText, RefreshCw, PenLine, Camera, Paperclip, Plus,
  Search, Users, Pill, BookOpen, AlertTriangle, Scissors,
  ToggleLeft, BarChart2, LayoutGrid, Sliders, Activity, Layers, MapPin, Scan, UserCog,
  Database,
} from 'lucide-react'
import { searchRegistry } from '../../data/fieldRegistry'

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
      { type: 'patient_auto',  icon: UserCog,     label: 'Patient Info' },
    ],
  },
  {
    label: 'Clinical Search',
    fields: [
      { type: 'patient_search',    icon: Search,        label: 'Patient' },
      { type: 'staff_search',      icon: Users,         label: 'Staff / MD' },
      { type: 'medication_search', icon: Pill,          label: 'Medication' },
      { type: 'medication_order',  icon: Pill,          label: 'Rx Order ⚡' },
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

// ─── Registry Search Tab ─────────────────────────────────────────────────────

const TAG_COLORS = {
  vitals:         'bg-blue-900/50 text-blue-300',
  calculated:     'bg-purple-900/50 text-purple-300',
  subjective:     'bg-amber-900/50 text-amber-300',
  objective:      'bg-green-900/50 text-green-300',
  assessment:     'bg-red-900/50 text-red-300',
  plan:           'bg-teal-900/50 text-teal-300',
  history:        'bg-orange-900/50 text-orange-300',
  examination:    'bg-green-900/50 text-green-300',
}
function tagColor(tag) { return TAG_COLORS[tag] || 'bg-gray-800 text-gray-400' }

const TYPE_BADGE = {
  number:    'N',
  dropdown:  '▾',
  textarea:  '¶',
  text:      'T',
  yes_no:    '±',
  scale:     '★',
  calculated:'∑',
  date:      '📅',
}

function RegistryTab({ onAddPreset, activeSectionId }) {
  const [query, setQuery] = useState('')
  const results = searchRegistry(query)

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="px-2 py-2 sticky top-0 bg-gray-900 z-10">
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search label or field ID…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            autoFocus
          />
        </div>
        <p className="text-[10px] text-gray-600 mt-1 px-0.5">
          {results.length} field{results.length !== 1 ? 's' : ''} · click to insert with canonical ID
        </p>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto pb-4 px-2 space-y-1">
        {results.map(field => (
          <button
            key={field.field_id}
            onClick={() => onAddPreset(field, activeSectionId)}
            className="w-full text-left px-2.5 py-2 rounded-lg bg-gray-800/60 hover:bg-gray-700 border border-gray-700/50 hover:border-blue-500/50 transition-colors group"
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-900/30 px-1 rounded">
                {TYPE_BADGE[field.type] || field.type.slice(0, 3)}
              </span>
              <span className="text-xs font-medium text-gray-100 group-hover:text-white truncate flex-1">
                {field.label}
              </span>
              {field.unit && (
                <span className="text-[10px] text-gray-500 flex-shrink-0">{field.unit}</span>
              )}
            </div>
            <div className="text-[10px] font-mono text-gray-500 mb-1">{field.field_id}</div>
            <div className="flex flex-wrap gap-1">
              {(field.tags || []).slice(0, 3).map(t => (
                <span key={t} className={`text-[9px] px-1 rounded ${tagColor(t)}`}>{t}</span>
              ))}
            </div>
          </button>
        ))}

        {results.length === 0 && (
          <div className="text-center py-8 text-gray-600 text-xs">
            No fields match "{query}"
          </div>
        )}
      </div>
    </div>
  )
}

// ─── FieldPalette ────────────────────────────────────────────────────────────

export default function FieldPalette({ onAddField, onAddSection, onAddPreset, activeSectionId }) {
  const [tab, setTab] = useState('types') // 'types' | 'registry'

  return (
    <div className="flex flex-col h-full bg-gray-900 overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-800 flex-shrink-0">
        <button
          onClick={() => setTab('types')}
          className={`flex-1 py-2 text-[11px] font-semibold transition-colors ${
            tab === 'types'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Field Types
        </button>
        <button
          onClick={() => setTab('registry')}
          className={`flex-1 py-2 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
            tab === 'registry'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-gray-500 hover:text-gray-300'
          }`}
          title="Search the Master Field Registry — insert canonical fields with pre-set IDs, units, and normal ranges"
        >
          <Database size={11} />
          Registry
        </button>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'types' ? (
          <div className="pb-4">
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
        ) : (
          <RegistryTab onAddPreset={onAddPreset} activeSectionId={activeSectionId} />
        )}
      </div>

      <div className="sticky bottom-0 px-3 py-3 bg-gray-900 border-t border-gray-800 flex-shrink-0">
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
