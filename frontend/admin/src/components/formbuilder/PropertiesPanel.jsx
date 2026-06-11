import { useState } from 'react'
import {
  Type, AlignLeft, Hash, Calendar, Clock, CalendarClock, CircleDot,
  CheckSquare, ChevronDown, Star, Calculator, Stethoscope, FlaskConical,
  Table, User, Minus, FileText, RefreshCw, PenLine, Camera, Paperclip,
  Clipboard, Eye, Bell, GripVertical, X, ChevronUp, ChevronRight, Plus,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFieldTypeIcon(type, size = 16) {
  const props = { size, className: 'text-gray-400 flex-shrink-0' }
  const map = {
    text:       <Type {...props} />,
    textarea:   <AlignLeft {...props} />,
    number:     <Hash {...props} />,
    date:       <Calendar {...props} />,
    time:       <Clock {...props} />,
    datetime:   <CalendarClock {...props} />,
    radio:      <CircleDot {...props} />,
    checkbox:   <CheckSquare {...props} />,
    dropdown:   <ChevronDown {...props} />,
    scale:      <Star {...props} />,
    calculated: <Calculator {...props} />,
    snomed:     <Stethoscope {...props} />,
    loinc:      <FlaskConical {...props} />,
    table:      <Table {...props} />,
    body_map:   <User {...props} />,
    label:      <Type {...props} />,
    divider:    <Minus {...props} />,
    rich_text:  <FileText {...props} />,
    repeating:  <RefreshCw {...props} />,
    signature:  <PenLine {...props} />,
    photo:      <Camera {...props} />,
    file:       <Paperclip {...props} />,
  }
  return map[type] || <Type {...props} />
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function Toggle({ value, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        className={`relative w-9 h-5 rounded-full transition-colors ${value ? 'bg-[#F5821E]' : 'bg-gray-700'}`}
        onClick={() => onChange(!value)}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`}
        />
      </div>
      {label && <span className="text-sm text-gray-300">{label}</span>}
    </label>
  )
}

function PropRow({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#F5821E]'
const selectCls =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#F5821E] appearance-none'
const textareaCls =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#F5821E] resize-none'

function BtnGroup({ options, value, onChange }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map(opt => (
        <button
          key={opt.value ?? opt}
          onClick={() => onChange(opt.value ?? opt)}
          className={[
            'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
            (opt.value ?? opt) === value
              ? 'bg-[#F5821E] text-white'
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600',
          ].join(' ')}
        >
          {opt.label ?? opt}
        </button>
      ))}
    </div>
  )
}

function CollapsibleSection({ title, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-t border-gray-800 mt-4 pt-4">
      <button
        className="flex items-center gap-2 w-full text-left mb-2 group"
        onClick={() => setOpen(v => !v)}
      >
        {Icon && <Icon size={14} className="text-gray-400" />}
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex-1">
          {title}
        </span>
        {open ? (
          <ChevronUp size={14} className="text-gray-500 group-hover:text-gray-300" />
        ) : (
          <ChevronRight size={14} className="text-gray-500 group-hover:text-gray-300" />
        )}
      </button>
      {open && <div>{children}</div>}
    </div>
  )
}

// ─── OptionsEditor ────────────────────────────────────────────────────────────

function OptionsEditor({ options = [], onChange }) {
  function addOption() {
    onChange([...options, { label: 'Option ' + (options.length + 1), value: 'option_' + (options.length + 1) }])
  }
  function removeOption(i) {
    onChange(options.filter((_, idx) => idx !== i))
  }
  function updateOption(i, key, val) {
    const next = options.map((opt, idx) => {
      if (idx !== i) return opt
      const updated = { ...opt, [key]: val }
      if (key === 'label') updated.value = val.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30)
      return updated
    })
    onChange(next)
  }
  function moveUp(i) {
    if (i === 0) return
    const next = [...options]
    ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
    onChange(next)
  }
  function moveDown(i) {
    if (i === options.length - 1) return
    const next = [...options]
    ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
    onChange(next)
  }

  return (
    <div>
      <div className="space-y-2 mb-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveUp(i)} className="text-gray-600 hover:text-gray-400 leading-none">
                <ChevronUp size={10} />
              </button>
              <button onClick={() => moveDown(i)} className="text-gray-600 hover:text-gray-400 leading-none">
                <ChevronRight size={10} style={{ transform: 'rotate(90deg)' }} />
              </button>
            </div>
            <input
              className={inputCls + ' flex-1'}
              value={opt.label}
              onChange={e => updateOption(i, 'label', e.target.value)}
              placeholder="Option label"
            />
            <input
              className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-400 font-mono focus:outline-none focus:border-[#F5821E]"
              value={opt.value}
              onChange={e => updateOption(i, 'value', e.target.value)}
              placeholder="value"
            />
            <button
              onClick={() => removeOption(i)}
              className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addOption}
        className="flex items-center gap-1 text-xs text-[#F5821E] hover:text-orange-300 transition-colors"
      >
        <Plus size={12} />
        Add Option
      </button>
    </div>
  )
}

// ─── ConditionsEditor ─────────────────────────────────────────────────────────

const CONDITION_OPERATORS = [
  { value: 'equals',       label: 'equals' },
  { value: 'not_equals',   label: 'not equals' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'less_than',    label: 'less than' },
  { value: 'contains',     label: 'contains' },
  { value: 'is_empty',     label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
]

function ConditionsEditor({ conditions = [], conditionLogic = 'AND', allFields, onChangeConditions, onChangeLogic }) {
  function addCondition() {
    const first = allFields[0]
    onChangeConditions([
      ...conditions,
      { field_id: first?.field?.field_id || '', operator: 'equals', value: '' },
    ])
  }
  function removeCondition(i) {
    onChangeConditions(conditions.filter((_, idx) => idx !== i))
  }
  function updateCondition(i, key, val) {
    onChangeConditions(conditions.map((c, idx) => idx === i ? { ...c, [key]: val } : c))
  }

  return (
    <div>
      {conditions.length > 1 && (
        <div className="mb-3">
          <span className="text-xs text-gray-400 mr-2">Match</span>
          <BtnGroup
            options={[{ value: 'AND', label: 'ALL (AND)' }, { value: 'OR', label: 'ANY (OR)' }]}
            value={conditionLogic}
            onChange={onChangeLogic}
          />
        </div>
      )}
      <div className="space-y-2 mb-2">
        {conditions.map((cond, i) => (
          <div key={i} className="bg-gray-800/60 rounded-lg p-2 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <select
                className={selectCls + ' flex-1 text-xs'}
                value={cond.field_id}
                onChange={e => updateCondition(i, 'field_id', e.target.value)}
              >
                <option value="">— select field —</option>
                {allFields.map(({ field }) => (
                  <option key={field.id} value={field.field_id}>
                    {field.label || field.field_id}
                  </option>
                ))}
              </select>
              <button onClick={() => removeCondition(i)} className="text-gray-600 hover:text-red-400">
                <X size={12} />
              </button>
            </div>
            <select
              className={selectCls + ' text-xs'}
              value={cond.operator}
              onChange={e => updateCondition(i, 'operator', e.target.value)}
            >
              {CONDITION_OPERATORS.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
            {!['is_empty', 'is_not_empty'].includes(cond.operator) && (
              <input
                className={inputCls + ' text-xs'}
                value={cond.value}
                onChange={e => updateCondition(i, 'value', e.target.value)}
                placeholder="value…"
              />
            )}
          </div>
        ))}
      </div>
      <button
        onClick={addCondition}
        className="flex items-center gap-1 text-xs text-[#F5821E] hover:text-orange-300 transition-colors"
      >
        <Plus size={12} />
        Add Condition
      </button>
    </div>
  )
}

// ─── AlertRulesEditor ─────────────────────────────────────────────────────────

const SEVERITY_COLORS = {
  critical: 'text-red-400',
  high:     'text-orange-400',
  warning:  'text-yellow-400',
}

function AlertRulesEditor({ rules = [], onChange }) {
  function addRule() {
    onChange([...rules, { severity: 'warning', operator: 'above', value: 0, message: '' }])
  }
  function removeRule(i) {
    onChange(rules.filter((_, idx) => idx !== i))
  }
  function updateRule(i, key, val) {
    onChange(rules.map((r, idx) => idx === i ? { ...r, [key]: val } : r))
  }

  return (
    <div>
      <div className="space-y-3 mb-2">
        {rules.map((rule, i) => (
          <div key={i} className="bg-gray-800/60 rounded-lg p-2 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <select
                className={selectCls + ' flex-1 text-xs'}
                value={rule.severity}
                onChange={e => updateRule(i, 'severity', e.target.value)}
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="warning">Warning</option>
              </select>
              <select
                className={selectCls + ' flex-1 text-xs'}
                value={rule.operator}
                onChange={e => updateRule(i, 'operator', e.target.value)}
              >
                <option value="above">Above</option>
                <option value="below">Below</option>
              </select>
              <input
                type="number"
                className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#F5821E]"
                value={rule.value}
                onChange={e => updateRule(i, 'value', Number(e.target.value))}
              />
              <button onClick={() => removeRule(i)} className="text-gray-600 hover:text-red-400">
                <X size={12} />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-semibold w-14 ${SEVERITY_COLORS[rule.severity]}`}>
                {rule.severity.charAt(0).toUpperCase() + rule.severity.slice(1)}
              </span>
              <input
                className={inputCls + ' text-xs flex-1'}
                value={rule.message}
                onChange={e => updateRule(i, 'message', e.target.value)}
                placeholder="Alert message…"
              />
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={addRule}
        className="flex items-center gap-1 text-xs text-[#F5821E] hover:text-orange-300 transition-colors"
      >
        <Plus size={12} />
        Add Alert Rule
      </button>
    </div>
  )
}

// ─── TypeSpecificProps ────────────────────────────────────────────────────────

function TypeSpecificProps({ field, sectionId, dispatch, allFields }) {
  function set(key, value) {
    dispatch({ type: 'UPDATE_FIELD_PROP', payload: { sectionId, fieldId: field.id, key, value } })
  }

  const type = field.type

  // text / textarea
  if (type === 'text' || type === 'textarea') {
    return (
      <>
        <PropRow label="Placeholder">
          <input className={inputCls} value={field.placeholder || ''} onChange={e => set('placeholder', e.target.value)} />
        </PropRow>
        <PropRow label="Max Characters (0 = unlimited)">
          <input type="number" min={0} className={inputCls} value={field.max_length || 0} onChange={e => set('max_length', Number(e.target.value))} />
        </PropRow>
        <PropRow label="Validation Pattern">
          <input className={inputCls + ' mb-1.5 font-mono text-xs'} value={field.validation_pattern || ''} onChange={e => set('validation_pattern', e.target.value)} placeholder="/regex/" />
          <div className="flex flex-wrap gap-1">
            {[
              { label: 'Email',       pattern: '/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/' },
              { label: 'Phone',       pattern: '/^[0-9+\\-\\s()]{7,15}$/' },
              { label: 'Numbers',     pattern: '/^[0-9]+$/' },
              { label: 'Alphanumeric', pattern: '/^[a-zA-Z0-9]+$/' },
            ].map(p => (
              <button
                key={p.label}
                onClick={() => set('validation_pattern', p.pattern)}
                className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </PropRow>
        <PropRow label="Default Value">
          <input className={inputCls} value={field.default_value || ''} onChange={e => set('default_value', e.target.value)} />
        </PropRow>
      </>
    )
  }

  // number
  if (type === 'number') {
    return (
      <>
        <PropRow label="Unit Label (e.g. mmHg)">
          <input className={inputCls} value={field.unit || ''} onChange={e => set('unit', e.target.value)} />
        </PropRow>
        <div className="grid grid-cols-2 gap-2">
          <PropRow label="Min">
            <input type="number" className={inputCls} value={field.min ?? ''} onChange={e => set('min', e.target.value === '' ? null : Number(e.target.value))} />
          </PropRow>
          <PropRow label="Max">
            <input type="number" className={inputCls} value={field.max ?? ''} onChange={e => set('max', e.target.value === '' ? null : Number(e.target.value))} />
          </PropRow>
        </div>
        <PropRow label="Decimal Places">
          <input type="number" min={0} max={4} className={inputCls} value={field.decimal_places ?? 2} onChange={e => set('decimal_places', Number(e.target.value))} />
        </PropRow>
        <CollapsibleSection title="Reference Ranges">
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'critical_low',  label: 'Critical Low',  color: 'text-red-400' },
              { key: 'normal_low',    label: 'Normal Low',    color: 'text-green-400' },
              { key: 'normal_high',   label: 'Normal High',   color: 'text-green-400' },
              { key: 'critical_high', label: 'Critical High', color: 'text-red-400' },
            ].map(r => (
              <div key={r.key}>
                <label className={`block text-xs font-medium mb-1 ${r.color}`}>{r.label}</label>
                <input
                  type="number"
                  className={inputCls}
                  value={field[r.key] ?? ''}
                  onChange={e => set(r.key, e.target.value === '' ? null : Number(e.target.value))}
                />
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </>
    )
  }

  // date / time / datetime
  if (type === 'date' || type === 'time' || type === 'datetime') {
    const inputType = type === 'date' ? 'date' : type === 'time' ? 'time' : 'datetime-local'
    return (
      <>
        <PropRow label="Default Value">
          <BtnGroup
            options={['none', 'now', 'custom'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))}
            value={field.default_type || 'none'}
            onChange={v => set('default_type', v)}
          />
          {field.default_type === 'custom' && (
            <input type={inputType} className={inputCls + ' mt-2'} value={field.default_value || ''} onChange={e => set('default_value', e.target.value)} />
          )}
        </PropRow>
        <PropRow label="Restrict to">
          <BtnGroup
            options={[{ value: 'any', label: 'Any' }, { value: 'past', label: 'Past only' }, { value: 'future', label: 'Future only' }]}
            value={field.date_restriction || 'any'}
            onChange={v => set('date_restriction', v)}
          />
        </PropRow>
      </>
    )
  }

  // radio / checkbox / dropdown
  if (type === 'radio' || type === 'checkbox' || type === 'dropdown') {
    return (
      <>
        <PropRow label="Options">
          <OptionsEditor
            options={field.options || []}
            onChange={opts => set('options', opts)}
          />
        </PropRow>
        {(type === 'radio' || type === 'checkbox') && (
          <PropRow label="Display Style">
            <BtnGroup
              options={['Vertical', 'Horizontal', 'Button Group'].map(v => ({ value: v.toLowerCase().replace(' ', '_'), label: v }))}
              value={field.display_style || 'vertical'}
              onChange={v => set('display_style', v)}
            />
          </PropRow>
        )}
        {type === 'checkbox' && (
          <div className="grid grid-cols-2 gap-2">
            <PropRow label="Min Selections">
              <input type="number" min={0} className={inputCls} value={field.min_selections ?? ''} onChange={e => set('min_selections', e.target.value === '' ? null : Number(e.target.value))} />
            </PropRow>
            <PropRow label="Max Selections">
              <input type="number" min={0} className={inputCls} value={field.max_selections ?? ''} onChange={e => set('max_selections', e.target.value === '' ? null : Number(e.target.value))} />
            </PropRow>
          </div>
        )}
      </>
    )
  }

  // scale
  if (type === 'scale') {
    return (
      <>
        <div className="grid grid-cols-3 gap-2">
          <PropRow label="Min">
            <input type="number" className={inputCls} value={field.min ?? 0} onChange={e => set('min', Number(e.target.value))} />
          </PropRow>
          <PropRow label="Max">
            <input type="number" className={inputCls} value={field.max ?? 10} onChange={e => set('max', Number(e.target.value))} />
          </PropRow>
          <PropRow label="Step">
            <input type="number" min={1} className={inputCls} value={field.step ?? 1} onChange={e => set('step', Number(e.target.value))} />
          </PropRow>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <PropRow label="Left Label">
            <input className={inputCls} value={field.left_label || ''} onChange={e => set('left_label', e.target.value)} placeholder="No Pain" />
          </PropRow>
          <PropRow label="Right Label">
            <input className={inputCls} value={field.right_label || ''} onChange={e => set('right_label', e.target.value)} placeholder="Worst Pain" />
          </PropRow>
        </div>
        <PropRow label="Style">
          <BtnGroup
            options={[{ value: 'slider', label: 'Slider' }, { value: 'nrs', label: 'NRS Buttons' }, { value: 'stars', label: 'Stars' }]}
            value={field.scale_style || 'slider'}
            onChange={v => set('scale_style', v)}
          />
        </PropRow>
      </>
    )
  }

  // calculated
  if (type === 'calculated') {
    const numberFields = (allFields || []).filter(({ field: f }) => f.type === 'number')
    function insertField(fieldId) {
      const token = `{${fieldId}}`
      set('formula', (field.formula || '') + token)
    }
    return (
      <>
        <PropRow label="Formula">
          <textarea
            className={textareaCls + ' font-mono text-xs'}
            rows={4}
            value={field.formula || ''}
            onChange={e => set('formula', e.target.value)}
            placeholder="{weight_kg} / ({height_m} * {height_m})"
          />
        </PropRow>
        <PropRow label="Insert Number Field">
          <select
            className={selectCls}
            value=""
            onChange={e => { if (e.target.value) insertField(e.target.value) }}
          >
            <option value="">— pick a number field —</option>
            {numberFields.map(({ field: f }) => (
              <option key={f.id} value={f.field_id}>
                {f.label || f.field_id}
              </option>
            ))}
          </select>
        </PropRow>
        <div className="text-xs text-gray-500 bg-gray-800/60 rounded-lg p-2 mb-3 font-mono">
          sum() &nbsp; avg() &nbsp; min() &nbsp; max() &nbsp; if() &nbsp; round() &nbsp; abs()
        </div>
        <PropRow label="Unit Label">
          <input className={inputCls} value={field.unit || ''} onChange={e => set('unit', e.target.value)} />
        </PropRow>
        <PropRow label="Decimal Places">
          <input type="number" min={0} max={4} className={inputCls} value={field.decimal_places ?? 2} onChange={e => set('decimal_places', Number(e.target.value))} />
        </PropRow>
      </>
    )
  }

  // snomed / loinc
  if (type === 'snomed' || type === 'loinc') {
    return (
      <>
        <PropRow label="Code">
          <input className={inputCls + ' font-mono'} value={field.code || ''} onChange={e => set('code', e.target.value)} />
        </PropRow>
        <PropRow label="Term Display">
          <input className={inputCls} value={field.term_display || ''} onChange={e => set('term_display', e.target.value)} />
        </PropRow>
        <PropRow label="Unit">
          <input className={inputCls} value={field.unit || ''} onChange={e => set('unit', e.target.value)} />
        </PropRow>
        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-lg p-2 mb-3">
          <p className="text-yellow-400 text-xs">Code search requires backend connection</p>
        </div>
      </>
    )
  }

  // table
  if (type === 'table') {
    const columns = field.columns || []
    function setColumns(cols) { set('columns', cols) }
    function addCol() { setColumns([...columns, { header: 'Column ' + (columns.length + 1), type: 'text', width: 120 }]) }
    function removeCol(i) { setColumns(columns.filter((_, idx) => idx !== i)) }
    function updateCol(i, key, val) { setColumns(columns.map((c, idx) => idx === i ? { ...c, [key]: val } : c)) }

    return (
      <>
        <PropRow label="Columns">
          <div className="space-y-1.5 mb-2">
            {columns.map((col, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  className={inputCls + ' flex-1 text-xs'}
                  value={col.header}
                  onChange={e => updateCol(i, 'header', e.target.value)}
                  placeholder="Header"
                />
                <select
                  className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none w-24 appearance-none"
                  value={col.type}
                  onChange={e => updateCol(i, 'type', e.target.value)}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="dropdown">Dropdown</option>
                </select>
                <input
                  type="number"
                  className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                  value={col.width || 120}
                  onChange={e => updateCol(i, 'width', Number(e.target.value))}
                />
                <button onClick={() => removeCol(i)} className="text-gray-600 hover:text-red-400">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={addCol} className="flex items-center gap-1 text-xs text-[#F5821E] hover:text-orange-300">
            <Plus size={12} /> Add Column
          </button>
        </PropRow>
        <PropRow label="Row Count">
          <BtnGroup
            options={[{ value: 'dynamic', label: 'Dynamic' }, { value: 'fixed', label: 'Fixed' }]}
            value={field.row_count_type || 'dynamic'}
            onChange={v => set('row_count_type', v)}
          />
          {field.row_count_type === 'fixed' && (
            <input type="number" min={1} className={inputCls + ' mt-2'} value={field.row_count || 5} onChange={e => set('row_count', Number(e.target.value))} />
          )}
        </PropRow>
      </>
    )
  }

  // body_map
  if (type === 'body_map') {
    return (
      <>
        <PropRow label="Diagrams">
          <div className="flex gap-3">
            {['front', 'back'].map(side => (
              <label key={side} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(field.diagrams || ['front']).includes(side)}
                  onChange={e => {
                    const current = field.diagrams || ['front']
                    set('diagrams', e.target.checked ? [...current, side] : current.filter(s => s !== side))
                  }}
                  className="accent-[#F5821E]"
                />
                <span className="text-sm text-gray-300 capitalize">{side}</span>
              </label>
            ))}
          </div>
        </PropRow>
        <PropRow label="Allow Multiple Points">
          <Toggle value={field.allow_multiple || false} onChange={v => set('allow_multiple', v)} />
        </PropRow>
        <PropRow label="Point Label Template">
          <input className={inputCls} value={field.point_label_template || ''} onChange={e => set('point_label_template', e.target.value)} placeholder="e.g. Pain point {n}" />
        </PropRow>
      </>
    )
  }

  // label
  if (type === 'label') {
    return (
      <>
        <PropRow label="Text Content">
          <textarea className={textareaCls} rows={3} value={field.content || ''} onChange={e => set('content', e.target.value)} />
        </PropRow>
        <PropRow label="Style">
          <BtnGroup
            options={[
              { value: 'h1', label: 'H1' },
              { value: 'h2', label: 'H2' },
              { value: 'h3', label: 'H3' },
              { value: 'body', label: 'Body' },
              { value: 'caption', label: 'Caption' },
            ]}
            value={field.heading_style || 'h2'}
            onChange={v => set('heading_style', v)}
          />
        </PropRow>
        <PropRow label="Alignment">
          <BtnGroup
            options={[
              { value: 'left', label: 'Left' },
              { value: 'center', label: 'Center' },
              { value: 'right', label: 'Right' },
            ]}
            value={field.alignment || 'left'}
            onChange={v => set('alignment', v)}
          />
        </PropRow>
      </>
    )
  }

  // signature
  if (type === 'signature') {
    return (
      <>
        <PropRow label="Required Role">
          <select className={selectCls} value={field.required_role || 'any'} onChange={e => set('required_role', e.target.value)}>
            <option value="any">Any</option>
            <option value="doctor">Doctor</option>
            <option value="nurse">Nurse</option>
            <option value="patient">Patient</option>
          </select>
        </PropRow>
        <PropRow label="Include Timestamp">
          <Toggle value={field.include_timestamp !== false} onChange={v => set('include_timestamp', v)} />
        </PropRow>
        <PropRow label="Include IP Address">
          <Toggle value={field.include_ip || false} onChange={v => set('include_ip', v)} />
        </PropRow>
      </>
    )
  }

  // photo / file
  if (type === 'photo' || type === 'file') {
    return (
      <>
        <PropRow label="Max Files">
          <input type="number" min={1} className={inputCls} value={field.max_files || 1} onChange={e => set('max_files', Number(e.target.value))} />
        </PropRow>
        {type === 'file' && (
          <PropRow label="Allowed Types">
            <div className="flex flex-wrap gap-1.5">
              {['PDF', 'DOC', 'Image', 'Other'].map(t => {
                const val = t.toLowerCase()
                const allowed = field.allowed_types || []
                const active = allowed.includes(val)
                return (
                  <button
                    key={t}
                    onClick={() => {
                      set('allowed_types', active ? allowed.filter(x => x !== val) : [...allowed, val])
                    }}
                    className={[
                      'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                      active ? 'bg-[#F5821E] text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600',
                    ].join(' ')}
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          </PropRow>
        )}
        <PropRow label="Max Size (MB)">
          <input type="number" min={1} className={inputCls} value={field.max_size_mb || 10} onChange={e => set('max_size_mb', Number(e.target.value))} />
        </PropRow>
      </>
    )
  }

  return null
}

// ─── SectionProperties ────────────────────────────────────────────────────────

function SectionProperties({ section, dispatch }) {
  function set(key, value) {
    dispatch({ type: 'UPDATE_SECTION', payload: { sectionId: section.id, key, value } })
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-white mb-4">Section Properties</h3>
      <PropRow label="Title">
        <input className={inputCls} value={section.title} onChange={e => set('title', e.target.value)} />
      </PropRow>
      <PropRow label="Description">
        <textarea className={textareaCls} rows={2} value={section.description || ''} onChange={e => set('description', e.target.value)} />
      </PropRow>
      <PropRow label="Columns">
        <BtnGroup
          options={[{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }]}
          value={section.layout || 1}
          onChange={v => set('layout', Number(v))}
        />
      </PropRow>
      <PropRow label="Collapsible">
        <Toggle value={section.collapsible || false} onChange={v => set('collapsible', v)} />
      </PropRow>
      <PropRow label="Repeatable">
        <Toggle value={section.repeatable || false} onChange={v => set('repeatable', v)} />
      </PropRow>
      {section.repeatable && (
        <div className="grid grid-cols-2 gap-2 pl-0">
          <PropRow label="Min Instances">
            <input
              type="number"
              min={1}
              className={inputCls}
              value={section.min_instances || 1}
              onChange={e => set('min_instances', Number(e.target.value))}
            />
          </PropRow>
          <PropRow label="Max Instances">
            <input
              type="number"
              min={1}
              className={inputCls}
              value={section.max_instances || 5}
              onChange={e => set('max_instances', Number(e.target.value))}
            />
          </PropRow>
        </div>
      )}

      {/* Delete */}
      <div className="mt-6 pt-4 border-t border-gray-800">
        <button
          onClick={() => dispatch({ type: 'DELETE_SECTION', payload: section.id })}
          className="w-full py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-700/40 text-red-400 text-sm font-medium rounded-xl transition-colors"
        >
          Delete Section
        </button>
      </div>
    </div>
  )
}

// ─── FieldProperties ──────────────────────────────────────────────────────────

function FieldProperties({ field, sectionId, dispatch, allFields }) {
  function set(key, value) {
    dispatch({ type: 'UPDATE_FIELD_PROP', payload: { sectionId, fieldId: field.id, key, value } })
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        {getFieldTypeIcon(field.type, 18)}
        <span className="text-sm font-semibold text-white capitalize flex-1">{field.type} Field</span>
        <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded font-mono">
          {field.type}
        </span>
      </div>

      {/* A. Common Properties */}
      <PropRow label="Label">
        <input
          className={inputCls}
          value={field.label}
          onChange={e => set('label', e.target.value)}
        />
      </PropRow>
      <PropRow label="Field ID">
        <input
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-400 font-mono focus:outline-none"
          value={field.field_id}
          readOnly
        />
      </PropRow>
      <PropRow label="Help Text">
        <textarea
          className={textareaCls}
          rows={2}
          value={field.help_text || ''}
          onChange={e => set('help_text', e.target.value)}
        />
      </PropRow>
      <div className="space-y-2.5 mb-4">
        <Toggle value={field.required || false}  onChange={v => set('required', v)}  label="Required" />
        <Toggle value={field.read_only || false} onChange={v => set('read_only', v)} label="Read-only" />
        <Toggle value={field.hidden || false}    onChange={v => set('hidden', v)}    label="Hidden by default" />
      </div>

      {/* B. Type-specific */}
      <div className="border-t border-gray-800 pt-4 mt-2">
        <TypeSpecificProps field={field} sectionId={sectionId} dispatch={dispatch} allFields={allFields} />
      </div>

      {/* C. Visibility Conditions */}
      <CollapsibleSection title="Visibility Rules" icon={Eye}>
        <ConditionsEditor
          conditions={field.conditions || []}
          conditionLogic={field.condition_logic || 'AND'}
          allFields={allFields}
          onChangeConditions={conds => set('conditions', conds)}
          onChangeLogic={logic => set('condition_logic', logic)}
        />
      </CollapsibleSection>

      {/* D. Alert Rules (number only) */}
      {field.type === 'number' && (
        <CollapsibleSection title="Alert Rules" icon={Bell}>
          <AlertRulesEditor
            rules={field.alert_rules || []}
            onChange={rules => set('alert_rules', rules)}
          />
        </CollapsibleSection>
      )}

      {/* Delete */}
      <div className="mt-6 pt-4 border-t border-gray-800">
        <button
          onClick={() => dispatch({ type: 'DELETE_FIELD', payload: { sectionId, fieldId: field.id } })}
          className="w-full py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-700/40 text-red-400 text-sm font-medium rounded-xl transition-colors"
        >
          Delete Field
        </button>
      </div>
    </div>
  )
}

// ─── PropertiesPanel (main export) ───────────────────────────────────────────

export default function PropertiesPanel({ form, selectedId, selectedType, dispatch, allFields }) {
  // Find selected section
  const selectedSection =
    selectedType === 'section'
      ? form.schema.sections.find(s => s.id === selectedId) || null
      : null

  // Find selected field + its sectionId
  let selectedField = null
  let selectedFieldSectionId = null
  if (selectedType === 'field') {
    for (const section of form.schema.sections) {
      const f = section.fields.find(f => f.id === selectedId)
      if (f) {
        selectedField = f
        selectedFieldSectionId = section.id
        break
      }
    }
  }

  return (
    <div className="w-80 h-full bg-gray-900 border-l border-gray-800 overflow-y-auto flex-shrink-0">
      {/* Nothing selected */}
      {!selectedId && (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mb-3">
            <Clipboard size={24} className="text-gray-600" />
          </div>
          <p className="text-sm font-semibold text-gray-400 mb-1">No Selection</p>
          <p className="text-xs text-gray-600 leading-relaxed">
            Click a field or section in the canvas to edit its properties
          </p>
        </div>
      )}

      {/* Section selected */}
      {selectedType === 'section' && selectedSection && (
        <SectionProperties section={selectedSection} dispatch={dispatch} />
      )}

      {/* Field selected */}
      {selectedType === 'field' && selectedField && (
        <FieldProperties
          field={selectedField}
          sectionId={selectedFieldSectionId}
          dispatch={dispatch}
          allFields={allFields}
        />
      )}
    </div>
  )
}
