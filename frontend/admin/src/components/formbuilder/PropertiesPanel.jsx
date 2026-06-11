import { useState } from 'react'
import {
  Type, AlignLeft, Hash, Calendar, Clock, CalendarClock, CircleDot,
  CheckSquare, ChevronDown, Star, Calculator, Stethoscope, FlaskConical,
  Table, User, Minus, FileText, RefreshCw, PenLine, Camera, Paperclip,
  Clipboard, Eye, Bell, X, ChevronUp, ChevronRight, Plus, Lock, EyeOff,
} from 'lucide-react'

// ─── Field type icon map ──────────────────────────────────────────────────────

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

// ─── UI Primitives ────────────────────────────────────────────────────────────

function Toggle({ value, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        role="switch"
        aria-checked={value}
        className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${value ? 'bg-[#F5821E]' : 'bg-gray-700'}`}
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
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#F5821E] transition-colors'

const selectCls =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#F5821E] transition-colors appearance-none'

const textareaCls =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#F5821E] transition-colors resize-none'

function BtnGroup({ options, value, onChange }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map(opt => {
        const v = opt.value !== undefined ? opt.value : opt
        const l = opt.label !== undefined ? opt.label : opt
        return (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={[
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
              v === value
                ? 'bg-[#F5821E] text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white',
            ].join(' ')}
          >
            {l}
          </button>
        )
      })}
    </div>
  )
}

function SectionHeader({ title }) {
  return (
    <div className="bg-gray-800/70 px-4 py-2 border-b border-gray-700 mb-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
    </div>
  )
}

function CollapsibleSection({ title, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-t border-gray-800 mt-4 pt-4">
      <button
        type="button"
        className="flex items-center gap-2 w-full text-left mb-2 group"
        onClick={() => setOpen(v => !v)}
      >
        {Icon && <Icon size={14} className="text-gray-400 flex-shrink-0" />}
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex-1">{title}</span>
        {open
          ? <ChevronUp size={14} className="text-gray-500 group-hover:text-gray-300 flex-shrink-0" />
          : <ChevronRight size={14} className="text-gray-500 group-hover:text-gray-300 flex-shrink-0" />}
      </button>
      {open && <div>{children}</div>}
    </div>
  )
}

// ─── Options Editor ───────────────────────────────────────────────────────────

function OptionsEditor({ options = [], onChange }) {
  function addOption() {
    onChange([...options, {
      label: 'Option ' + (options.length + 1),
      value: 'option_' + (options.length + 1),
    }])
  }
  function removeOption(i) {
    onChange(options.filter((_, idx) => idx !== i))
  }
  function updateOption(i, key, val) {
    onChange(options.map((opt, idx) => {
      if (idx !== i) return opt
      const updated = { ...opt, [key]: val }
      if (key === 'label') {
        updated.value = val.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/, '').slice(0, 30) || `option_${i}`
      }
      return updated
    }))
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
      <div className="space-y-1.5 mb-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {/* Up/down handles */}
            <div className="flex flex-col">
              <button type="button" onClick={() => moveUp(i)} className="text-gray-600 hover:text-gray-400 leading-none py-0.5">
                <ChevronUp size={10} />
              </button>
              <button type="button" onClick={() => moveDown(i)} className="text-gray-600 hover:text-gray-400 leading-none py-0.5">
                <ChevronDown size={10} />
              </button>
            </div>
            <input
              className={inputCls + ' flex-1 text-xs'}
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
            <button type="button" onClick={() => removeOption(i)} className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addOption}
        className="flex items-center gap-1 text-xs text-[#F5821E] hover:text-orange-300 transition-colors"
      >
        <Plus size={12} />
        Add Option
      </button>
    </div>
  )
}

// ─── Conditions Editor ────────────────────────────────────────────────────────

const CONDITION_OPERATORS = [
  { value: 'equals',       label: 'equals' },
  { value: 'not_equals',   label: 'not equals' },
  { value: 'greater_than', label: '> greater than' },
  { value: 'less_than',    label: '< less than' },
  { value: 'contains',     label: 'contains' },
  { value: 'is_empty',     label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
]

function ConditionsEditor({ conditions = [], conditionLogic = 'AND', allFields = [], onChangeConditions, onChangeLogic }) {
  function addCondition() {
    const first = allFields[0]
    onChangeConditions([
      ...conditions,
      { field_id: first?.field?.field_id || '', operator: 'equals', value: '', logic: 'AND' },
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
          <div key={i} className="bg-gray-800/60 rounded-lg p-2 space-y-1.5 border border-gray-700/50">
            {i > 0 && (
              <span className="inline-block text-xs font-semibold text-purple-400 bg-purple-900/30 px-1.5 py-0.5 rounded">
                {conditionLogic}
              </span>
            )}
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
              <button type="button" onClick={() => removeCondition(i)} className="text-gray-600 hover:text-red-400 flex-shrink-0">
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
                value={cond.value || ''}
                onChange={e => updateCondition(i, 'value', e.target.value)}
                placeholder="value…"
              />
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addCondition}
        className="flex items-center gap-1 text-xs text-[#F5821E] hover:text-orange-300 transition-colors"
      >
        <Plus size={12} />
        Add Condition
      </button>
    </div>
  )
}

// ─── Alert Rules Editor ───────────────────────────────────────────────────────

const SEVERITY_COLORS = {
  critical: 'text-red-400',
  high:     'text-orange-400',
  warning:  'text-yellow-400',
}
const SEVERITY_BG = {
  critical: 'bg-red-900/30 border-red-700/50',
  high:     'bg-orange-900/30 border-orange-700/50',
  warning:  'bg-yellow-900/30 border-yellow-700/50',
}

function AlertRulesEditor({ rules = [], onChange }) {
  function addRule() {
    onChange([...rules, { severity: 'warning', operator: 'above', threshold: 0, message: '' }])
  }
  function removeRule(i) {
    onChange(rules.filter((_, idx) => idx !== i))
  }
  function updateRule(i, key, val) {
    onChange(rules.map((r, idx) => idx === i ? { ...r, [key]: val } : r))
  }

  return (
    <div>
      <div className="space-y-2.5 mb-2">
        {rules.map((rule, i) => (
          <div key={i} className={`rounded-lg p-2 border space-y-1.5 ${SEVERITY_BG[rule.severity] || SEVERITY_BG.warning}`}>
            <div className="flex items-center gap-1.5">
              <select
                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#F5821E] flex-1"
                value={rule.severity}
                onChange={e => updateRule(i, 'severity', e.target.value)}
              >
                <option value="critical">🔴 Critical</option>
                <option value="high">🟠 High</option>
                <option value="warning">🟡 Warning</option>
              </select>
              <select
                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#F5821E] flex-1"
                value={rule.operator}
                onChange={e => updateRule(i, 'operator', e.target.value)}
              >
                <option value="above">Above</option>
                <option value="below">Below</option>
              </select>
              <input
                type="number"
                className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#F5821E]"
                value={rule.threshold ?? rule.value ?? 0}
                onChange={e => updateRule(i, 'threshold', Number(e.target.value))}
              />
              <button type="button" onClick={() => removeRule(i)} className="text-gray-600 hover:text-red-400 flex-shrink-0">
                <X size={12} />
              </button>
            </div>
            <input
              className={inputCls + ' text-xs'}
              value={rule.message || ''}
              onChange={e => updateRule(i, 'message', e.target.value)}
              placeholder="Alert message shown to clinician…"
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addRule}
        className="flex items-center gap-1 text-xs text-[#F5821E] hover:text-orange-300 transition-colors"
      >
        <Plus size={12} />
        Add Alert Rule
      </button>
      <p className="text-xs text-gray-600 mt-2 leading-relaxed">
        Alerts fire when this field's value crosses the threshold on form submission.
      </p>
    </div>
  )
}

// ─── Type-Specific Properties ─────────────────────────────────────────────────

function TypeSpecificProps({ field, sectionId, dispatch, allFields }) {
  function set(key, value) {
    dispatch({ type: 'UPDATE_FIELD_PROP', payload: { sectionId, fieldId: field.id, key, value } })
  }

  const type = field.type

  // ── text ──────────────────────────────────────────────────────────────────
  if (type === 'text') {
    return (
      <>
        <PropRow label="Placeholder">
          <input className={inputCls} value={field.placeholder || ''} onChange={e => set('placeholder', e.target.value)} placeholder="Enter placeholder text…" />
        </PropRow>
        <PropRow label="Max Characters (0 = unlimited)">
          <input type="number" min={0} className={inputCls} value={field.max_length || 0} onChange={e => set('max_length', Number(e.target.value))} />
        </PropRow>
        <PropRow label="Default Value">
          <input className={inputCls} value={field.default_value || ''} onChange={e => set('default_value', e.target.value)} />
        </PropRow>
        <PropRow label="Validation Preset">
          <div className="flex flex-wrap gap-1 mb-1.5">
            {[
              { label: 'Email',        pattern: '/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/' },
              { label: 'Phone',        pattern: '/^[0-9+\\-\\s()]{7,15}$/' },
              { label: 'Numbers',      pattern: '/^[0-9]+$/' },
              { label: 'Alphanumeric', pattern: '/^[a-zA-Z0-9]+$/' },
            ].map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => set('validation_pattern', p.pattern)}
                className={`text-xs px-2 py-0.5 rounded transition-colors ${
                  field.validation_pattern === p.pattern
                    ? 'bg-[#F5821E] text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input
            className={inputCls + ' font-mono text-xs'}
            value={field.validation_pattern || ''}
            onChange={e => set('validation_pattern', e.target.value)}
            placeholder="/regex pattern/"
          />
        </PropRow>
      </>
    )
  }

  // ── textarea ──────────────────────────────────────────────────────────────
  if (type === 'textarea') {
    return (
      <>
        <PropRow label="Placeholder">
          <input className={inputCls} value={field.placeholder || ''} onChange={e => set('placeholder', e.target.value)} />
        </PropRow>
        <PropRow label="Max Characters (0 = unlimited)">
          <input type="number" min={0} className={inputCls} value={field.max_length || 0} onChange={e => set('max_length', Number(e.target.value))} />
        </PropRow>
        <PropRow label="Default Value">
          <textarea className={textareaCls} rows={2} value={field.default_value || ''} onChange={e => set('default_value', e.target.value)} />
        </PropRow>
      </>
    )
  }

  // ── number ────────────────────────────────────────────────────────────────
  if (type === 'number') {
    return (
      <>
        <PropRow label="Unit Label (e.g. mmHg, kg, °C)">
          <input className={inputCls} value={field.unit || ''} onChange={e => set('unit', e.target.value)} placeholder="mmHg, kg, °C…" />
        </PropRow>
        <div className="grid grid-cols-2 gap-2">
          <PropRow label="Min Value">
            <input type="number" className={inputCls} value={field.min ?? ''} onChange={e => set('min', e.target.value === '' ? null : Number(e.target.value))} />
          </PropRow>
          <PropRow label="Max Value">
            <input type="number" className={inputCls} value={field.max ?? ''} onChange={e => set('max', e.target.value === '' ? null : Number(e.target.value))} />
          </PropRow>
        </div>
        <PropRow label="Decimal Places">
          <BtnGroup
            options={[0, 1, 2, 3, 4].map(n => ({ value: n, label: String(n) }))}
            value={field.decimal_places ?? 2}
            onChange={v => set('decimal_places', v)}
          />
        </PropRow>
        <CollapsibleSection title="Reference Ranges" defaultOpen>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'critical_low',  label: 'Critical Low',  cls: 'text-red-400' },
              { key: 'normal_low',    label: 'Normal Low',    cls: 'text-yellow-400' },
              { key: 'normal_high',   label: 'Normal High',   cls: 'text-yellow-400' },
              { key: 'critical_high', label: 'Critical High', cls: 'text-red-400' },
            ].map(r => (
              <div key={r.key}>
                <label className={`block text-xs font-medium mb-1 ${r.cls}`}>{r.label}</label>
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

  // ── date / time / datetime ────────────────────────────────────────────────
  if (type === 'date' || type === 'time' || type === 'datetime') {
    const inputType = type === 'date' ? 'date' : type === 'time' ? 'time' : 'datetime-local'
    const defaultOpts = type === 'datetime'
      ? [{ value: 'none', label: 'None' }, { value: 'now', label: 'Now' }, { value: 'custom', label: 'Custom' }]
      : type === 'time'
      ? [{ value: 'none', label: 'None' }, { value: 'now', label: 'Current' }, { value: 'custom', label: 'Custom' }]
      : [{ value: 'none', label: 'None' }, { value: 'today', label: 'Today' }, { value: 'custom', label: 'Custom' }]
    return (
      <>
        <PropRow label="Default">
          <BtnGroup
            options={defaultOpts}
            value={field.date_default || 'none'}
            onChange={v => set('date_default', v)}
          />
          {field.date_default === 'custom' && (
            <input type={inputType} className={inputCls + ' mt-2'} value={field.default_value || ''} onChange={e => set('default_value', e.target.value)} />
          )}
        </PropRow>
        <PropRow label="Restrict">
          <BtnGroup
            options={[{ value: 'any', label: 'Any' }, { value: 'past', label: 'Past only' }, { value: 'future', label: 'Future only' }]}
            value={field.date_restrict || 'any'}
            onChange={v => set('date_restrict', v)}
          />
        </PropRow>
      </>
    )
  }

  // ── radio / checkbox / dropdown ───────────────────────────────────────────
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
              options={[
                { value: 'vertical',     label: 'Vertical' },
                { value: 'horizontal',   label: 'Horizontal' },
                { value: 'button_group', label: 'Button Group' },
              ]}
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

  // ── scale ─────────────────────────────────────────────────────────────────
  if (type === 'scale') {
    return (
      <>
        <div className="grid grid-cols-2 gap-2">
          <PropRow label="Min Value">
            <input type="number" className={inputCls} value={field.scale_min ?? field.min ?? 0} onChange={e => set('scale_min', Number(e.target.value))} />
          </PropRow>
          <PropRow label="Max Value">
            <input type="number" className={inputCls} value={field.scale_max ?? field.max ?? 10} onChange={e => set('scale_max', Number(e.target.value))} />
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
            options={[
              { value: 'nrs',    label: 'NRS Buttons' },
              { value: 'slider', label: 'Slider' },
              { value: 'stars',  label: 'Stars' },
            ]}
            value={field.scale_style || 'nrs'}
            onChange={v => set('scale_style', v)}
          />
        </PropRow>
      </>
    )
  }

  // ── calculated ────────────────────────────────────────────────────────────
  if (type === 'calculated') {
    const numericFields = (allFields || []).filter(({ field: f }) => f.type === 'number')
    function insertFieldToken(fieldId) {
      set('formula', (field.formula || '') + `{${fieldId}}`)
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
        <PropRow label="Insert Field Token">
          <div className="flex gap-1.5">
            <select
              className={selectCls + ' text-xs flex-1'}
              value=""
              onChange={e => { if (e.target.value) insertFieldToken(e.target.value) }}
            >
              <option value="">— pick a number field —</option>
              {numericFields.map(({ field: f }) => (
                <option key={f.id} value={f.field_id}>
                  {f.label || f.field_id}
                </option>
              ))}
            </select>
          </div>
        </PropRow>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-2 mb-3">
          <p className="text-xs text-gray-500 font-mono leading-relaxed">
            sum()&nbsp; avg()&nbsp; min()&nbsp; max()&nbsp; if()&nbsp; round()&nbsp; abs()
          </p>
        </div>
        <PropRow label="Unit Label">
          <input className={inputCls} value={field.unit || ''} onChange={e => set('unit', e.target.value)} />
        </PropRow>
        <PropRow label="Decimal Places">
          <BtnGroup
            options={[0, 1, 2, 3, 4].map(n => ({ value: n, label: String(n) }))}
            value={field.decimal_places ?? 2}
            onChange={v => set('decimal_places', v)}
          />
        </PropRow>
      </>
    )
  }

  // ── label ─────────────────────────────────────────────────────────────────
  if (type === 'label') {
    return (
      <>
        <PropRow label="Text Content">
          <textarea
            className={textareaCls}
            rows={3}
            value={field.text_content || field.content || ''}
            onChange={e => set('text_content', e.target.value)}
            placeholder="Heading or label text…"
          />
        </PropRow>
        <PropRow label="Heading Style">
          <BtnGroup
            options={[
              { value: 'h1',      label: 'H1' },
              { value: 'h2',      label: 'H2' },
              { value: 'h3',      label: 'H3' },
              { value: 'body',    label: 'Body' },
              { value: 'caption', label: 'Caption' },
            ]}
            value={field.heading_style || 'h2'}
            onChange={v => set('heading_style', v)}
          />
        </PropRow>
        <PropRow label="Alignment">
          <BtnGroup
            options={[
              { value: 'left',   label: 'Left' },
              { value: 'center', label: 'Center' },
              { value: 'right',  label: 'Right' },
            ]}
            value={field.text_align || 'left'}
            onChange={v => set('text_align', v)}
          />
        </PropRow>
      </>
    )
  }

  // ── signature ─────────────────────────────────────────────────────────────
  if (type === 'signature') {
    return (
      <>
        <PropRow label="Required Role">
          <BtnGroup
            options={[
              { value: 'any',     label: 'Any' },
              { value: 'doctor',  label: 'Doctor' },
              { value: 'nurse',   label: 'Nurse' },
              { value: 'patient', label: 'Patient' },
            ]}
            value={field.role_required || 'any'}
            onChange={v => set('role_required', v)}
          />
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

  // ── photo / file ──────────────────────────────────────────────────────────
  if (type === 'photo' || type === 'file') {
    return (
      <>
        <PropRow label="Max Files (1–10)">
          <input
            type="number"
            min={1}
            max={10}
            className={inputCls}
            value={field.max_files || 1}
            onChange={e => set('max_files', Math.min(10, Math.max(1, Number(e.target.value))))}
          />
        </PropRow>
        <PropRow label="Max Size (MB)">
          <input
            type="number"
            min={1}
            className={inputCls}
            value={field.max_size_mb || 10}
            onChange={e => set('max_size_mb', Number(e.target.value))}
          />
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
                    type="button"
                    onClick={() => set('allowed_types', active ? allowed.filter(x => x !== val) : [...allowed, val])}
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
      </>
    )
  }

  // ── table ─────────────────────────────────────────────────────────────────
  if (type === 'table') {
    const columns = field.columns || []
    function setColumns(cols) { set('columns', cols) }
    function addCol() { setColumns([...columns, { header: `Column ${columns.length + 1}`, type: 'text', width: 120 }]) }
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
                  value={col.header || ''}
                  onChange={e => updateCol(i, 'header', e.target.value)}
                  placeholder="Column header"
                />
                <select
                  className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none w-24"
                  value={col.type || 'text'}
                  onChange={e => updateCol(i, 'type', e.target.value)}
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="dropdown">Dropdown</option>
                </select>
                <button type="button" onClick={() => removeCol(i)} className="text-gray-600 hover:text-red-400 flex-shrink-0">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addCol} className="flex items-center gap-1 text-xs text-[#F5821E] hover:text-orange-300 transition-colors">
            <Plus size={12} />
            Add Column
          </button>
        </PropRow>
        <PropRow label="Rows">
          <BtnGroup
            options={[{ value: 'dynamic', label: 'Dynamic' }, { value: 'fixed', label: 'Fixed' }]}
            value={field.rows_type || 'dynamic'}
            onChange={v => set('rows_type', v)}
          />
          {field.rows_type === 'fixed' && (
            <input type="number" min={1} className={inputCls + ' mt-2'} value={field.row_count || 3} onChange={e => set('row_count', Number(e.target.value))} />
          )}
        </PropRow>
      </>
    )
  }

  // ── body_map ──────────────────────────────────────────────────────────────
  if (type === 'body_map') {
    return (
      <>
        <PropRow label="Diagram View">
          <BtnGroup
            options={[
              { value: 'front', label: 'Front' },
              { value: 'back',  label: 'Back' },
              { value: 'both',  label: 'Both' },
            ]}
            value={field.body_map_type || 'front'}
            onChange={v => set('body_map_type', v)}
          />
        </PropRow>
        <PropRow label="Allow Multiple Points">
          <Toggle value={field.allow_multiple || false} onChange={v => set('allow_multiple', v)} />
        </PropRow>
      </>
    )
  }

  // ── snomed / loinc ────────────────────────────────────────────────────────
  if (type === 'snomed' || type === 'loinc') {
    const stdName = type === 'snomed' ? 'SNOMED CT' : 'LOINC'
    return (
      <>
        <PropRow label="Code">
          <input className={inputCls + ' font-mono'} value={field.code || ''} onChange={e => set('code', e.target.value)} placeholder={type === 'snomed' ? '73211009' : '38341003-4'} />
        </PropRow>
        <PropRow label="Term Display">
          <input className={inputCls} value={field.term_display || ''} onChange={e => set('term_display', e.target.value)} placeholder={`${stdName} concept name`} />
        </PropRow>
        <PropRow label="Unit">
          <input className={inputCls} value={field.unit || ''} onChange={e => set('unit', e.target.value)} />
        </PropRow>
        <div className="bg-blue-900/20 border border-blue-800/40 rounded-lg p-2">
          <p className="text-blue-400 text-xs">
            Use standard {stdName} codes for interoperability
          </p>
        </div>
      </>
    )
  }

  // ── rich_text ─────────────────────────────────────────────────────────────
  if (type === 'rich_text') {
    return (
      <>
        <PropRow label="Text Content">
          <textarea
            className={textareaCls + ' min-h-[120px]'}
            rows={5}
            value={field.text_content || field.content || ''}
            onChange={e => set('text_content', e.target.value)}
            placeholder="Enter rich text content… Markdown supported."
          />
        </PropRow>
        <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-2">
          <p className="text-xs text-gray-500">Supports basic markdown formatting: **bold**, *italic*, `code`, # Headings</p>
        </div>
      </>
    )
  }

  // ── divider ───────────────────────────────────────────────────────────────
  if (type === 'divider') {
    return (
      <p className="text-xs text-gray-500 italic">No additional settings for divider fields.</p>
    )
  }

  return null
}

// ─── Section Properties ───────────────────────────────────────────────────────

function SectionProperties({ section, dispatch }) {
  function set(key, value) {
    dispatch({ type: 'UPDATE_SECTION', payload: { sectionId: section.id, key, value } })
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 flex-1 overflow-y-auto">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#F5821E] flex-shrink-0" />
          Section Properties
        </h3>

        <PropRow label="Title">
          <input className={inputCls} value={section.title || ''} onChange={e => set('title', e.target.value)} placeholder="Section title…" />
        </PropRow>

        <PropRow label="Description">
          <textarea className={textareaCls} rows={2} value={section.description || ''} onChange={e => set('description', e.target.value)} placeholder="Optional description…" />
        </PropRow>

        <PropRow label="Layout">
          <BtnGroup
            options={[
              { value: 1, label: '1 Col' },
              { value: 2, label: '2 Col' },
              { value: 3, label: '3 Col' },
            ]}
            value={section.layout || 1}
            onChange={v => set('layout', Number(v))}
          />
        </PropRow>

        <div className="space-y-2.5 mb-4">
          <Toggle
            value={section.collapsible || false}
            onChange={v => set('collapsible', v)}
            label="Collapsible"
          />
          <Toggle
            value={section.repeatable || false}
            onChange={v => set('repeatable', v)}
            label="Repeatable"
          />
        </div>

        {section.repeatable && (
          <div className="grid grid-cols-2 gap-2 mb-4 bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
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
      </div>

      {/* Delete button pinned to bottom */}
      <div className="p-4 pt-0 border-t border-gray-800 flex-shrink-0">
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Delete this section and all its fields?')) {
              dispatch({ type: 'DELETE_SECTION', payload: section.id })
            }
          }}
          className="w-full py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-700/40 text-red-400 text-sm font-medium rounded-xl transition-colors"
        >
          Delete Section
        </button>
      </div>
    </div>
  )
}

// ─── Field Properties ─────────────────────────────────────────────────────────

function FieldProperties({ field, sectionId, dispatch, allFields }) {
  function set(key, value) {
    dispatch({ type: 'UPDATE_FIELD_PROP', payload: { sectionId, fieldId: field.id, key, value } })
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 flex-1 overflow-y-auto">

        {/* Header: type badge + icon */}
        <div className="flex items-center gap-2 mb-4">
          {getFieldTypeIcon(field.type, 18)}
          <span className="text-sm font-semibold text-white flex-1 capitalize">{field.type} Field</span>
          <span className="text-xs bg-[#F5821E]/20 text-[#F5821E] border border-[#F5821E]/30 px-2 py-0.5 rounded-full font-mono">
            {field.type}
          </span>
        </div>

        {/* ── Common Properties ── */}
        <PropRow label="Label">
          <input
            className={inputCls}
            value={field.label || ''}
            onChange={e => set('label', e.target.value)}
            placeholder="Field label shown to users"
          />
        </PropRow>

        <PropRow label="Field ID">
          <input
            className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-1.5 text-xs text-gray-500 font-mono focus:outline-none cursor-not-allowed"
            value={field.field_id || ''}
            readOnly
            title="Auto-generated from label"
          />
        </PropRow>

        <PropRow label="Help Text">
          <textarea
            className={textareaCls}
            rows={2}
            value={field.help_text || ''}
            onChange={e => set('help_text', e.target.value)}
            placeholder="Guidance shown below the field…"
          />
        </PropRow>

        {/* Toggles row */}
        <div className="grid grid-cols-1 gap-2 mb-4 bg-gray-800/40 border border-gray-700/50 rounded-lg p-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Toggle value={field.required || false} onChange={v => set('required', v)} />
            <span className="text-sm text-gray-300 flex items-center gap-1">
              <span className="text-red-400 font-bold">*</span> Required
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Toggle value={field.read_only || false} onChange={v => set('read_only', v)} />
            <span className="text-sm text-gray-300 flex items-center gap-1.5">
              <Lock size={12} className="text-gray-400" /> Read-only
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Toggle value={field.hidden || false} onChange={v => set('hidden', v)} />
            <span className="text-sm text-gray-300 flex items-center gap-1.5">
              <EyeOff size={12} className="text-gray-400" /> Hidden by default
            </span>
          </label>
        </div>

        {/* ── Type-specific Settings ── */}
        {field.type !== 'divider' && (
          <div className="border-t border-gray-800 pt-4 mt-2">
            <SectionHeader title="Field Settings" />
            <TypeSpecificProps field={field} sectionId={sectionId} dispatch={dispatch} allFields={allFields} />
          </div>
        )}

        {/* ── Visibility Conditions ── */}
        <CollapsibleSection title="Visibility Rules" icon={Eye}>
          <ConditionsEditor
            conditions={field.conditions || []}
            conditionLogic={field.condition_logic || 'AND'}
            allFields={allFields}
            onChangeConditions={conds => set('conditions', conds)}
            onChangeLogic={logic => set('condition_logic', logic)}
          />
        </CollapsibleSection>

        {/* ── Alert Rules (number only) ── */}
        {field.type === 'number' && (
          <CollapsibleSection title="Alert Rules" icon={Bell}>
            <AlertRulesEditor
              rules={field.alert_rules || []}
              onChange={rules => set('alert_rules', rules)}
            />
          </CollapsibleSection>
        )}
      </div>

      {/* Delete button pinned to bottom */}
      <div className="p-4 pt-0 border-t border-gray-800 flex-shrink-0">
        <button
          type="button"
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
      ? (form.schema.sections.find(s => s.id === selectedId) || null)
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
    <div className="w-80 h-full bg-gray-900 border-l border-gray-800 overflow-y-auto flex flex-col flex-shrink-0">
      {/* Nothing selected */}
      {!selectedId && (
        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mb-4">
            <Clipboard size={24} className="text-gray-600" />
          </div>
          <p className="text-sm font-semibold text-gray-400 mb-1">Select a field or section</p>
          <p className="text-xs text-gray-600 leading-relaxed">
            Click any field or section in the canvas to edit its properties here.
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
