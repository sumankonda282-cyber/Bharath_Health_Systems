import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Save, Send, AlertTriangle, CheckCircle2,
  Clock, BarChart2, Loader2, X, ChevronDown, ChevronUp,
  Plus, Minus, RotateCcw, Pen, Type, Camera, Upload,
  Info, Activity, Mic
} from 'lucide-react'
import api from '../../api/client'

// ─── Language context ────────────────────────────────────────────────────────

const LangContext = React.createContext({ lang: 'en', translations: null })

function getLabel(field, lang, translations) {
  if (lang === 'en' || !translations) return field.label
  return translations[lang]?.[field.field_id] || field.label
}

// ─── Voice dictation hook ────────────────────────────────────────────────────

function useVoiceDictation(onResult) {
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { onResult(null, 'Voice input not supported in this browser'); return }
    const rec = new SR()
    rec.lang = 'en-IN'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = e => { onResult(e.results[0][0].transcript, null); setListening(false) }
    rec.onerror = () => { onResult(null, 'Voice error'); setListening(false) }
    rec.onend = () => setListening(false)
    recRef.current = rec
    rec.start()
    setListening(true)
  }, [onResult])

  const stop = useCallback(() => { recRef.current?.stop(); setListening(false) }, [])
  return { listening, start, stop }
}

function MicButton({ onAppend }) {
  const [toast, setToast] = useState(null)
  const { listening, start } = useVoiceDictation((text, err) => {
    if (err) { setToast(err); setTimeout(() => setToast(null), 2000); return }
    onAppend(text)
  })
  return (
    <div className="relative inline-flex">
      <button type="button" onClick={start}
        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${listening ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-[#0F2557] hover:bg-gray-100'}`}
        title="Voice input">
        <Mic size={14} className={listening ? 'animate-pulse' : ''} />
      </button>
      {toast && <div className="absolute right-0 top-full mt-1 text-xs bg-gray-800 text-white px-2 py-1 rounded z-10 whitespace-nowrap">{toast}</div>}
    </div>
  )
}

// ─── Utility helpers ────────────────────────────────────────────────────────

function evaluateCondition(condition, values) {
  const { field_id, operator, value } = condition
  const fieldVal = values[field_id]
  switch (operator) {
    case 'equals': return String(fieldVal) === String(value)
    case 'not_equals': return String(fieldVal) !== String(value)
    case 'contains': return String(fieldVal || '').includes(String(value))
    case 'greater_than': return Number(fieldVal) > Number(value)
    case 'less_than': return Number(fieldVal) < Number(value)
    case 'is_empty': return fieldVal === undefined || fieldVal === null || fieldVal === ''
    case 'is_not_empty': return fieldVal !== undefined && fieldVal !== null && fieldVal !== ''
    default: return true
  }
}

function isFieldVisible(field, values) {
  if (!field.conditions || field.conditions.length === 0) return true
  const logic = field.condition_logic || 'ALL'
  if (logic === 'ALL') return field.conditions.every(c => evaluateCondition(c, values))
  return field.conditions.some(c => evaluateCondition(c, values))
}

function evaluateFormula(formula, values) {
  if (!formula) return ''
  try {
    let expr = formula
    const matches = formula.match(/\{([^}]+)\}/g) || []
    for (const m of matches) {
      const id = m.slice(1, -1)
      expr = expr.replace(m, Number(values[id]) || 0)
    }
    // eslint-disable-next-line no-new-func
    return new Function(`return ${expr}`)()
  } catch {
    return ''
  }
}

function getReferenceStatus(value, field) {
  const range = field.reference_range
  if (!range || value === '' || value === undefined || value === null) return null
  const v = Number(value)
  if (isNaN(v)) return null
  if (range.critical_low !== undefined && v < range.critical_low) return { status: 'critical_low', message: range.critical_low_message || `Critical Low (< ${range.critical_low})` }
  if (range.critical_high !== undefined && v > range.critical_high) return { status: 'critical_high', message: range.critical_high_message || `Critical High (> ${range.critical_high})` }
  if (range.normal_low !== undefined && v < range.normal_low) return { status: 'low', message: `Below normal (< ${range.normal_low})` }
  if (range.normal_high !== undefined && v > range.normal_high) return { status: 'high', message: `Above normal (> ${range.normal_high})` }
  return { status: 'normal', message: 'Within normal range' }
}

function getCompletionPct(sections, values) {
  let total = 0, answered = 0
  for (const s of sections || []) {
    for (const f of s.fields || []) {
      if (f.required && f.type !== 'label' && f.type !== 'divider') {
        total++
        const v = values[f.id]
        if (v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)) answered++
      }
    }
  }
  return total === 0 ? 100 : Math.round((answered / total) * 100)
}

// ─── Field Components ────────────────────────────────────────────────────────

function FieldLabel({ field }) {
  const { lang, translations } = React.useContext(LangContext)
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {getLabel(field, lang, translations)}
      {field.required && <span className="text-red-500 ml-1">*</span>}
      {field.help_text && (
        <span className="ml-2 text-xs text-gray-400 font-normal">{field.help_text}</span>
      )}
    </label>
  )
}

function FieldError({ error }) {
  if (!error) return null
  return <p className="text-red-500 text-xs mt-1">{error}</p>
}

function ReferenceIndicator({ refStatus }) {
  if (!refStatus) return null
  const map = {
    critical_low: 'bg-red-50 border-red-300 text-red-700',
    critical_high: 'bg-red-50 border-red-300 text-red-700',
    low: 'bg-yellow-50 border-yellow-300 text-yellow-700',
    high: 'bg-yellow-50 border-yellow-300 text-yellow-700',
    normal: 'bg-green-50 border-green-300 text-green-700',
  }
  const icon = { critical_low: '⚠', critical_high: '⚠', low: '↓', high: '↑', normal: '✓' }
  const isCritical = refStatus.status === 'critical_low' || refStatus.status === 'critical_high'
  return (
    <div className={`mt-1 px-2 py-1 rounded-lg border text-xs flex items-center gap-1 ${map[refStatus.status]} ${isCritical ? 'font-semibold' : ''}`}>
      <span>{icon[refStatus.status]}</span>
      {isCritical ? `Critical Value — ${refStatus.message}` : refStatus.message}
    </div>
  )
}

const INPUT_CLS = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0F2557]/20 focus:border-[#0F2557] outline-none transition'
const INPUT_ERROR_CLS = 'border-red-400 focus:ring-red-200 focus:border-red-500'

function TextField({ field, value, onChange, error }) {
  return (
    <div>
      <FieldLabel field={field} />
      <div className="relative">
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={`${INPUT_CLS} pr-10 ${error ? INPUT_ERROR_CLS : ''}`}
        />
        <MicButton
          fieldId={field.field_id}
          value={value}
          onAppend={val => onChange((value || '') + ' ' + val)}
        />
      </div>
      <FieldError error={error} />
    </div>
  )
}

function TextAreaField({ field, value, onChange, error }) {
  const max = field.max_length
  return (
    <div>
      <FieldLabel field={field} />
      <div className="relative">
        <textarea
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          rows={field.rows || 3}
          maxLength={max || undefined}
          placeholder={field.placeholder}
          className={`${INPUT_CLS} resize-y pr-10 ${error ? INPUT_ERROR_CLS : ''}`}
        />
        <MicButton
          fieldId={field.field_id}
          value={value}
          onAppend={val => onChange((value || '') + ' ' + val)}
        />
      </div>
      {max && (
        <p className="text-right text-xs text-gray-400 mt-0.5">{(value || '').length}/{max}</p>
      )}
      <FieldError error={error} />
    </div>
  )
}

function NumberField({ field, value, onChange, error }) {
  const refStatus = getReferenceStatus(value, field)
  return (
    <div>
      <FieldLabel field={field} />
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value ?? ''}
          onChange={e => onChange(e.target.value === '' ? '' : e.target.value)}
          min={field.min}
          max={field.max}
          step={field.step || 'any'}
          placeholder={field.placeholder}
          className={`${INPUT_CLS} ${error ? INPUT_ERROR_CLS : ''}`}
        />
        {field.unit && (
          <span className="shrink-0 text-sm text-gray-500 font-medium">{field.unit}</span>
        )}
      </div>
      <ReferenceIndicator refStatus={refStatus} />
      <FieldError error={error} />
    </div>
  )
}

function DateField({ field, value, onChange, error }) {
  return (
    <div>
      <FieldLabel field={field} />
      <input type="date" value={value || ''} onChange={e => onChange(e.target.value)} className={`${INPUT_CLS} ${error ? INPUT_ERROR_CLS : ''}`} />
      <FieldError error={error} />
    </div>
  )
}

function TimeField({ field, value, onChange, error }) {
  return (
    <div>
      <FieldLabel field={field} />
      <input type="time" value={value || ''} onChange={e => onChange(e.target.value)} className={`${INPUT_CLS} ${error ? INPUT_ERROR_CLS : ''}`} />
      <FieldError error={error} />
    </div>
  )
}

function DateTimeField({ field, value, onChange, error }) {
  return (
    <div>
      <FieldLabel field={field} />
      <input type="datetime-local" value={value || ''} onChange={e => onChange(e.target.value)} className={`${INPUT_CLS} ${error ? INPUT_ERROR_CLS : ''}`} />
      <FieldError error={error} />
    </div>
  )
}

function RadioField({ field, value, onChange, error }) {
  const style = field.display_style
  if (style === 'button_group') {
    return (
      <div>
        <FieldLabel field={field} />
        <div className="flex flex-wrap gap-2">
          {(field.options || []).map(opt => {
            const optVal = typeof opt === 'object' ? opt.value : opt
            const optLabel = typeof opt === 'object' ? opt.label : opt
            const sel = value === optVal
            return (
              <button
                key={optVal}
                type="button"
                onClick={() => onChange(sel ? '' : optVal)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${sel ? 'bg-[#0F2557] text-white border-[#0F2557]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#0F2557]'}`}
              >
                {optLabel}
              </button>
            )
          })}
        </div>
        <FieldError error={error} />
      </div>
    )
  }
  return (
    <div>
      <FieldLabel field={field} />
      <div className="flex flex-col gap-2">
        {(field.options || []).map(opt => {
          const optVal = typeof opt === 'object' ? opt.value : opt
          const optLabel = typeof opt === 'object' ? opt.label : opt
          return (
            <label key={optVal} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={field.id}
                value={optVal}
                checked={value === optVal}
                onChange={() => onChange(optVal)}
                className="text-[#0F2557]"
              />
              <span className="text-sm text-gray-700">{optLabel}</span>
            </label>
          )
        })}
      </div>
      <FieldError error={error} />
    </div>
  )
}

function CheckboxField({ field, value, onChange, error }) {
  const vals = Array.isArray(value) ? value : []
  const toggle = (v) => {
    const next = vals.includes(v) ? vals.filter(x => x !== v) : [...vals, v]
    onChange(next)
  }
  const style = field.display_style
  if (style === 'button_group') {
    return (
      <div>
        <FieldLabel field={field} />
        <div className="flex flex-wrap gap-2">
          {(field.options || []).map(opt => {
            const optVal = typeof opt === 'object' ? opt.value : opt
            const optLabel = typeof opt === 'object' ? opt.label : opt
            const sel = vals.includes(optVal)
            return (
              <button
                key={optVal}
                type="button"
                onClick={() => toggle(optVal)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${sel ? 'bg-[#0F2557] text-white border-[#0F2557]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#0F2557]'}`}
              >
                {optLabel}
              </button>
            )
          })}
        </div>
        <FieldError error={error} />
      </div>
    )
  }
  return (
    <div>
      <FieldLabel field={field} />
      <div className="flex flex-col gap-2">
        {(field.options || []).map(opt => {
          const optVal = typeof opt === 'object' ? opt.value : opt
          const optLabel = typeof opt === 'object' ? opt.label : opt
          return (
            <label key={optVal} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={vals.includes(optVal)}
                onChange={() => toggle(optVal)}
                className="text-[#0F2557] rounded"
              />
              <span className="text-sm text-gray-700">{optLabel}</span>
            </label>
          )
        })}
      </div>
      <FieldError error={error} />
    </div>
  )
}

function DropdownField({ field, value, onChange, error }) {
  return (
    <div>
      <FieldLabel field={field} />
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className={`${INPUT_CLS} bg-white ${error ? INPUT_ERROR_CLS : ''}`}
      >
        <option value="">Select...</option>
        {(field.options || []).map(opt => {
          const optVal = typeof opt === 'object' ? opt.value : opt
          const optLabel = typeof opt === 'object' ? opt.label : opt
          return <option key={optVal} value={optVal}>{optLabel}</option>
        })}
      </select>
      <FieldError error={error} />
    </div>
  )
}

function ScaleField({ field, value, onChange, error }) {
  const min = field.min ?? 0
  const max = field.max ?? 10
  const style = field.scale_style || 'nrs'

  if (style === 'slider') {
    return (
      <div>
        <FieldLabel field={field} />
        <div className="flex items-center gap-3">
          {field.left_label && <span className="text-xs text-gray-500">{field.left_label}</span>}
          <input
            type="range"
            min={min}
            max={max}
            value={value ?? min}
            onChange={e => onChange(Number(e.target.value))}
            className="flex-1 accent-[#0F2557]"
          />
          {field.right_label && <span className="text-xs text-gray-500">{field.right_label}</span>}
          <span className="text-sm font-bold text-[#0F2557] w-8 text-center">{value ?? min}</span>
        </div>
        <FieldError error={error} />
      </div>
    )
  }

  // NRS button row
  const nums = []
  for (let i = min; i <= max; i++) nums.push(i)
  return (
    <div>
      <FieldLabel field={field} />
      {(field.left_label || field.right_label) && (
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{field.left_label || ''}</span>
          <span>{field.right_label || ''}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {nums.map(n => {
          const sel = Number(value) === n
          let bg = 'bg-gray-100 text-gray-700 border-gray-200'
          if (sel) {
            if (n <= 3) bg = 'bg-green-500 text-white border-green-500'
            else if (n <= 6) bg = 'bg-yellow-500 text-white border-yellow-500'
            else bg = 'bg-red-500 text-white border-red-500'
          }
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`w-10 h-10 rounded-xl border text-sm font-bold transition ${bg} hover:opacity-90`}
            >
              {n}
            </button>
          )
        })}
      </div>
      <FieldError error={error} />
    </div>
  )
}

function CalculatedField({ field, allValues }) {
  const result = evaluateFormula(field.formula, allValues)
  return (
    <div>
      <FieldLabel field={field} />
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={result === '' || result === null ? '' : String(result)}
          readOnly
          className={`${INPUT_CLS} bg-gray-50 text-gray-600 cursor-not-allowed`}
        />
        {field.unit && <span className="text-sm text-gray-500">{field.unit}</span>}
      </div>
    </div>
  )
}

function LabelField({ field }) {
  const style = field.heading_style || 'h2'
  const cls = {
    h1: 'text-2xl font-bold text-[#0F2557] mt-4 mb-2',
    h2: 'text-xl font-semibold text-[#0F2557] mt-3 mb-1',
    h3: 'text-lg font-semibold text-gray-800 mt-2 mb-1',
    caption: 'text-xs text-gray-500 uppercase tracking-wide mt-2',
    body: 'text-sm text-gray-700',
  }[style] || 'text-base font-medium text-gray-800'
  return <div className={cls}>{field.label}</div>
}

function DividerField() {
  return <hr className="border-gray-200 my-4" />
}

function SignatureField({ field, value, onChange, error }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [mode, setMode] = useState('draw') // draw | type
  const [typedSig, setTypedSig] = useState('')

  useEffect(() => {
    if (value?.dataUrl && canvasRef.current) {
      const img = new Image()
      img.onload = () => {
        const ctx = canvasRef.current.getContext('2d')
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        ctx.drawImage(img, 0, 0)
      }
      img.src = value.dataUrl
    }
  }, [])

  const startDraw = (e) => {
    drawing.current = true
    const { offsetX, offsetY } = e.nativeEvent || { offsetX: 0, offsetY: 0 }
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(offsetX, offsetY)
  }
  const draw = (e) => {
    if (!drawing.current) return
    const { offsetX, offsetY } = e.nativeEvent
    const ctx = canvasRef.current.getContext('2d')
    ctx.lineTo(offsetX, offsetY)
    ctx.stroke()
  }
  const endDraw = () => {
    drawing.current = false
    const dataUrl = canvasRef.current.toDataURL()
    onChange({ dataUrl, timestamp: new Date().toISOString(), mode: 'drawn' })
  }
  const clearSig = () => {
    const ctx = canvasRef.current.getContext('2d')
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    onChange(null)
  }

  return (
    <div>
      <FieldLabel field={field} />
      <div className="flex gap-2 mb-2">
        <button type="button" onClick={() => setMode('draw')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${mode === 'draw' ? 'bg-[#0F2557] text-white border-[#0F2557]' : 'border-gray-200 text-gray-600'}`}>
          <Pen size={12} /> Draw
        </button>
        <button type="button" onClick={() => setMode('type')} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${mode === 'type' ? 'bg-[#0F2557] text-white border-[#0F2557]' : 'border-gray-200 text-gray-600'}`}>
          <Type size={12} /> Type
        </button>
        <button type="button" onClick={clearSig} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
          <RotateCcw size={12} /> Clear
        </button>
      </div>
      {mode === 'draw' ? (
        <canvas
          ref={canvasRef}
          width={400}
          height={120}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          className="border border-gray-200 rounded-xl bg-white cursor-crosshair w-full"
          style={{ touchAction: 'none' }}
        />
      ) : (
        <input
          type="text"
          placeholder="Type your full name as signature"
          value={typedSig}
          onChange={e => {
            setTypedSig(e.target.value)
            onChange({ typed: e.target.value, timestamp: new Date().toISOString(), mode: 'typed' })
          }}
          className={`${INPUT_CLS} italic font-serif text-lg`}
        />
      )}
      {value?.timestamp && (
        <p className="text-xs text-gray-400 mt-1">Signed at {new Date(value.timestamp).toLocaleString()}</p>
      )}
      <FieldError error={error} />
    </div>
  )
}

function PhotoField({ field, value, onChange, error }) {
  const [previews, setPreviews] = useState(value || [])
  const handleFiles = (e) => {
    const files = Array.from(e.target.files)
    const readers = files.map(f => new Promise(res => {
      const r = new FileReader()
      r.onload = ev => res(ev.target.result)
      r.readAsDataURL(f)
    }))
    Promise.all(readers).then(urls => {
      const next = [...previews, ...urls]
      setPreviews(next)
      onChange(next)
    })
  }
  return (
    <div>
      <FieldLabel field={field} />
      <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition">
        <Camera size={24} className="text-gray-300 mb-1" />
        <span className="text-xs text-gray-400">Click to upload photos</span>
        <input type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
      </label>
      {previews.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {previews.map((src, i) => (
            <div key={i} className="relative">
              <img src={src} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
              <button
                type="button"
                onClick={() => { const n = previews.filter((_, j) => j !== i); setPreviews(n); onChange(n) }}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
              >×</button>
            </div>
          ))}
        </div>
      )}
      <FieldError error={error} />
    </div>
  )
}

function FileField({ field, value, onChange, error }) {
  const [files, setFiles] = useState(value || [])
  const handleFiles = (e) => {
    const newFiles = Array.from(e.target.files).map(f => ({ name: f.name, size: f.size, type: f.type }))
    const next = [...files, ...newFiles]
    setFiles(next)
    onChange(next)
  }
  return (
    <div>
      <FieldLabel field={field} />
      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition">
        <Upload size={20} className="text-gray-300 mb-1" />
        <span className="text-xs text-gray-400">Drag & drop or click to upload</span>
        <input type="file" multiple onChange={handleFiles} className="hidden" />
      </label>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((f, i) => (
            <li key={i} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">
              <span>{f.name}</span>
              <button type="button" onClick={() => { const n = files.filter((_,j)=>j!==i); setFiles(n); onChange(n) }} className="text-red-400 hover:text-red-600">×</button>
            </li>
          ))}
        </ul>
      )}
      <FieldError error={error} />
    </div>
  )
}

function TableField({ field, value, onChange, error }) {
  const cols = field.columns || []
  const initRows = value || (field.initial_rows ? Array(field.initial_rows).fill(null).map(() => ({})) : [{}])
  const [rows, setRows] = useState(initRows)
  const update = (ri, col, val) => {
    const next = rows.map((r, i) => i === ri ? { ...r, [col]: val } : r)
    setRows(next)
    onChange(next)
  }
  const addRow = () => { const next = [...rows, {}]; setRows(next); onChange(next) }
  const removeRow = (ri) => { const next = rows.filter((_,i)=>i!==ri); setRows(next); onChange(next) }
  return (
    <div>
      <FieldLabel field={field} />
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {cols.map(c => <th key={c.id || c} className="px-3 py-2 text-left text-xs font-medium text-gray-500">{c.label || c}</th>)}
              {field.dynamic_rows && <th className="w-8" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, ri) => (
              <tr key={ri}>
                {cols.map(c => {
                  const colId = c.id || c
                  return (
                    <td key={colId} className="px-2 py-1">
                      <input
                        type={c.type === 'number' ? 'number' : 'text'}
                        value={row[colId] || ''}
                        onChange={e => update(ri, colId, e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#0F2557]/20 focus:border-[#0F2557] outline-none"
                      />
                    </td>
                  )
                })}
                {field.dynamic_rows && (
                  <td className="px-2">
                    <button type="button" onClick={() => removeRow(ri)} className="text-red-400 hover:text-red-600">
                      <Minus size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {field.dynamic_rows && (
        <button type="button" onClick={addRow} className="mt-2 flex items-center gap-1 text-xs text-[#0F2557] hover:underline">
          <Plus size={12} /> Add Row
        </button>
      )}
      <FieldError error={error} />
    </div>
  )
}

function BodyMapField({ field, value, onChange, error }) {
  const [points, setPoints] = useState(value || [])
  const svgRef = useRef(null)

  const handleClick = (e) => {
    const svg = svgRef.current
    const rect = svg.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    const newPoints = [...points, { x, y, label: '' }]
    setPoints(newPoints)
    onChange(newPoints)
  }

  const updateLabel = (i, label) => {
    const next = points.map((p, j) => j === i ? { ...p, label } : p)
    setPoints(next)
    onChange(next)
  }

  return (
    <div>
      <FieldLabel field={field} />
      <div className="flex gap-4">
        <div
          className="relative border border-gray-200 rounded-xl overflow-hidden cursor-crosshair bg-gray-50"
          style={{ width: 200, height: 300 }}
        >
          <svg ref={svgRef} viewBox="0 0 200 300" onClick={handleClick} className="w-full h-full">
            {/* Simple body outline */}
            <ellipse cx="100" cy="30" rx="22" ry="25" fill="none" stroke="#94a3b8" strokeWidth="2" />
            <rect x="78" y="55" width="44" height="80" rx="8" fill="none" stroke="#94a3b8" strokeWidth="2" />
            <rect x="50" y="60" width="28" height="65" rx="8" fill="none" stroke="#94a3b8" strokeWidth="2" />
            <rect x="122" y="60" width="28" height="65" rx="8" fill="none" stroke="#94a3b8" strokeWidth="2" />
            <rect x="78" y="135" width="20" height="90" rx="8" fill="none" stroke="#94a3b8" strokeWidth="2" />
            <rect x="102" y="135" width="20" height="90" rx="8" fill="none" stroke="#94a3b8" strokeWidth="2" />
            {points.map((p, i) => (
              <circle key={i} cx={p.x * 2} cy={p.y * 3} r="5" fill="#CC1414" opacity="0.8" />
            ))}
          </svg>
        </div>
        <div className="flex-1">
          {points.length === 0 && <p className="text-xs text-gray-400">Click body to mark pain/issue points</p>}
          {points.map((p, i) => (
            <div key={i} className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-500">#{i+1}</span>
              <input
                type="text"
                value={p.label}
                placeholder="Describe..."
                onChange={e => updateLabel(i, e.target.value)}
                className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#0F2557]"
              />
              <button type="button" onClick={() => {
                const next = points.filter((_,j)=>j!==i)
                setPoints(next)
                onChange(next)
              }} className="text-red-400 hover:text-red-600 text-xs">×</button>
            </div>
          ))}
        </div>
      </div>
      <FieldError error={error} />
    </div>
  )
}

function RepeatingSection({ field, value, onChange, error, allValues }) {
  const instances = Array.isArray(value) ? value : [{}]
  const updateInstance = (i, subFieldId, v) => {
    const next = instances.map((inst, j) => j === i ? { ...inst, [subFieldId]: v } : inst)
    onChange(next)
  }
  const addInstance = () => onChange([...instances, {}])
  const removeInstance = (i) => onChange(instances.filter((_,j)=>j!==i))

  return (
    <div>
      <FieldLabel field={field} />
      {instances.map((inst, i) => (
        <div key={i} className="mb-3 border border-gray-200 rounded-xl p-4 bg-gray-50 relative">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-medium text-gray-500">Entry {i+1}</span>
            {instances.length > 1 && (
              <button type="button" onClick={() => removeInstance(i)} className="text-red-400 hover:text-red-600">
                <Minus size={14} />
              </button>
            )}
          </div>
          {(field.sub_fields || []).map(sf => (
            <div key={sf.id} className="mb-3">
              <FieldRenderer
                field={sf}
                value={inst[sf.id]}
                onChange={v => updateInstance(i, sf.id, v)}
                error={null}
                allValues={allValues}
              />
            </div>
          ))}
        </div>
      ))}
      <button type="button" onClick={addInstance} className="flex items-center gap-1 text-xs text-[#0F2557] hover:underline mt-1">
        <Plus size={12} /> Add Entry
      </button>
      <FieldError error={error} />
    </div>
  )
}

function FieldRenderer({ field, value, onChange, error, allValues }) {
  const type = field.type
  if (type === 'text') return <TextField field={field} value={value} onChange={onChange} error={error} />
  if (type === 'textarea') return <TextAreaField field={field} value={value} onChange={onChange} error={error} />
  if (type === 'number') return <NumberField field={field} value={value} onChange={onChange} error={error} />
  if (type === 'date') return <DateField field={field} value={value} onChange={onChange} error={error} />
  if (type === 'time') return <TimeField field={field} value={value} onChange={onChange} error={error} />
  if (type === 'datetime') return <DateTimeField field={field} value={value} onChange={onChange} error={error} />
  if (type === 'single_choice' || type === 'radio') return <RadioField field={field} value={value} onChange={onChange} error={error} />
  if (type === 'multi_choice' || type === 'checkbox') return <CheckboxField field={field} value={value} onChange={onChange} error={error} />
  if (type === 'dropdown') return <DropdownField field={field} value={value} onChange={onChange} error={error} />
  if (type === 'scale') return <ScaleField field={field} value={value} onChange={onChange} error={error} />
  if (type === 'calculated') return <CalculatedField field={field} allValues={allValues} />
  if (type === 'label') return <LabelField field={field} />
  if (type === 'divider') return <DividerField />
  if (type === 'signature') return <SignatureField field={field} value={value} onChange={onChange} error={error} />
  if (type === 'photo') return <PhotoField field={field} value={value} onChange={onChange} error={error} />
  if (type === 'file') return <FileField field={field} value={value} onChange={onChange} error={error} />
  if (type === 'table') return <TableField field={field} value={value} onChange={onChange} error={error} />
  if (type === 'body_map') return <BodyMapField field={field} value={value} onChange={onChange} error={error} />
  if (type === 'repeating_section') return <RepeatingSection field={field} value={value} onChange={onChange} error={error} allValues={allValues} />
  // rich_text, snomed, loinc — display only
  if (type === 'rich_text') return <div className="text-sm text-gray-700 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: field.content || field.label || '' }} />
  return <div className="text-xs text-gray-400 italic">Field type "{type}" not supported</div>
}

// ─── Score & Alert display ────────────────────────────────────────────────────

function ScoreCard({ score }) {
  const band = score.band || {}
  const colorMap = {
    normal: 'bg-green-50 border-green-200 text-green-800',
    mild: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    moderate: 'bg-orange-50 border-orange-200 text-orange-800',
    severe: 'bg-red-50 border-red-200 text-red-800',
    critical: 'bg-red-100 border-red-400 text-red-900',
  }
  const cls = colorMap[band.severity?.toLowerCase()] || 'bg-gray-50 border-gray-200 text-gray-800'
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">{score.name}</p>
          <p className="text-3xl font-bold mt-1">{score.value}</p>
        </div>
        {band.label && (
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${cls}`}>{band.label}</span>
        )}
      </div>
      {band.interpretation && <p className="text-sm mt-2 opacity-80">{band.interpretation}</p>}
      {band.action && <p className="text-xs mt-1 font-medium opacity-70">→ {band.action}</p>}
    </div>
  )
}

function AlertCard({ alert }) {
  const sevCls = {
    critical: 'bg-red-50 border-red-400',
    high: 'bg-orange-50 border-orange-300',
    medium: 'bg-yellow-50 border-yellow-300',
    low: 'bg-blue-50 border-blue-300',
  }[alert.severity?.toLowerCase()] || 'bg-yellow-50 border-yellow-300'
  return (
    <div className={`rounded-xl border p-4 ${sevCls}`}>
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="text-red-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-gray-800">{alert.field_label || alert.field_id}</p>
          <p className="text-xs text-gray-600 mt-0.5">{alert.message}</p>
          {alert.value !== undefined && (
            <p className="text-xs text-gray-500 mt-0.5">Value: <strong>{String(alert.value)}</strong></p>
          )}
        </div>
        <span className="ml-auto text-xs font-bold uppercase text-red-600">{alert.severity}</span>
      </div>
    </div>
  )
}

// ─── Main FormFiller ──────────────────────────────────────────────────────────

export default function FormFiller() {
  const { assignmentId } = useParams()
  const navigate = useNavigate()
  const draftKey = `form_draft_${assignmentId}`

  const [state, setState] = useState({
    schema: null,
    formMeta: null,
    assignment: null,
    values: {},
    errors: {},
    touched: {},
    submitting: false,
    submitted: false,
    submissionId: null,
    scores: null,
    alerts: [],
    draftSaved: false,
    activeSection: 0,
    showNormalMacro: false,
  })

  const [lang, setLang] = useState('en')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [hasDraft, setHasDraft] = useState(false)
  const [draftValues, setDraftValues] = useState(null)
  const [prevSubmission, setPrevSubmission] = useState(null)
  const [showPrevBanner, setShowPrevBanner] = useState(false)
  const [timeLimitSecs, setTimeLimitSecs] = useState(null)
  const lastSaveRef = useRef({})
  const autoSaveRef = useRef(null)

  const update = (patch) => setState(s => ({ ...s, ...patch }))

  // Load assignment + form schema
  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/provider/forms/assignments/${assignmentId}`)
        const assignment = res.data
        const form = assignment.form || {}
        const schema = form.schema || form.sections ? form : assignment.form_schema
        const sections = schema?.sections || []

        // Check localStorage draft
        const saved = localStorage.getItem(draftKey)
        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            setDraftValues(parsed)
            setHasDraft(true)
          } catch {}
        }

        // Time limit
        if (form.time_limit_minutes) {
          setTimeLimitSecs(form.time_limit_minutes * 60)
        }

        update({
          assignment,
          formMeta: {
            title: form.title || assignment.form_title,
            category: form.category || assignment.category,
            scoring_config: form.scoring_config,
            alert_rules: form.alert_rules,
          },
          schema: { sections },
        })

        // Fetch prev submission for carry-forward
        if (assignment.patient_id && form.id) {
          try {
            const prevRes = await api.get(`/provider/forms/submissions?patient_id=${assignment.patient_id}&form_id=${form.id}&limit=1`)
            const submissions = prevRes.data?.submissions || prevRes.data || []
            if (submissions.length > 0) {
              setPrevSubmission(submissions[0])
              setShowPrevBanner(true)
            }
          } catch {}
        }
      } catch (err) {
        setLoadError(err.response?.data?.detail || 'Failed to load form')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [assignmentId])

  // Countdown timer
  useEffect(() => {
    if (!timeLimitSecs) return
    const interval = setInterval(() => {
      setTimeLimitSecs(s => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [!!timeLimitSecs])

  // Auto-save draft every 30s
  useEffect(() => {
    autoSaveRef.current = setInterval(() => {
      const current = state.values
      if (JSON.stringify(current) !== JSON.stringify(lastSaveRef.current)) {
        localStorage.setItem(draftKey, JSON.stringify(current))
        lastSaveRef.current = current
      }
    }, 30000)
    return () => clearInterval(autoSaveRef.current)
  }, [state.values])

  const setFieldValue = useCallback((fieldId, val) => {
    setState(s => ({ ...s, values: { ...s.values, [fieldId]: val }, touched: { ...s.touched, [fieldId]: true } }))
  }, [])

  const saveDraft = async () => {
    localStorage.setItem(draftKey, JSON.stringify(state.values))
    try {
      await api.post(`/provider/forms/submissions/${assignmentId}/draft`, { data: state.values })
    } catch {}
    update({ draftSaved: true })
    setTimeout(() => update({ draftSaved: false }), 2000)
  }

  const fillNormal = (sectionIdx) => {
    const section = state.schema?.sections?.[sectionIdx]
    if (!section) return
    const newVals = { ...state.values }
    for (const f of section.fields || []) {
      if (!isFieldVisible(f, newVals)) continue
      if (f.type === 'number' && f.reference_range) {
        const { normal_low, normal_high } = f.reference_range
        if (normal_low !== undefined && normal_high !== undefined) {
          newVals[f.id] = ((Number(normal_low) + Number(normal_high)) / 2).toFixed(1)
        }
      } else if ((f.type === 'text' || f.type === 'textarea') && f.required) {
        newVals[f.id] = newVals[f.id] || 'Normal'
      }
    }
    setState(s => ({ ...s, values: newVals }))
  }

  const validateAll = () => {
    const errors = {}
    for (const section of state.schema?.sections || []) {
      for (const field of section.fields || []) {
        if (!isFieldVisible(field, state.values)) continue
        if (field.type === 'label' || field.type === 'divider' || field.type === 'calculated') continue
        if (field.required) {
          const v = state.values[field.id]
          if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
            errors[field.id] = `${field.label} is required`
          }
        }
        if (field.type === 'number' && state.values[field.id] !== '' && state.values[field.id] !== undefined) {
          const v = Number(state.values[field.id])
          if (field.min !== undefined && v < field.min) errors[field.id] = `Minimum value is ${field.min}`
          if (field.max !== undefined && v > field.max) errors[field.id] = `Maximum value is ${field.max}`
        }
      }
    }
    return errors
  }

  const handleSubmit = async () => {
    const errors = validateAll()
    if (Object.keys(errors).length > 0) {
      setState(s => ({ ...s, errors, touched: Object.fromEntries(Object.keys(errors).map(k => [k, true])) }))
      // Scroll to first error
      const firstErrId = Object.keys(errors)[0]
      document.getElementById(`field-${firstErrId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    update({ submitting: true })
    try {
      const a = state.assignment
      const payload = {
        form_id: a.form_id || a.form?.id,
        assignment_id: assignmentId,
        patient_id: a.patient_id,
        appointment_id: a.appointment_id,
        admission_id: a.admission_id,
        data: state.values,
        charted_at: new Date().toISOString(),
      }
      const res = await api.post('/provider/forms/submit', payload)
      localStorage.removeItem(draftKey)
      update({
        submitting: false,
        submitted: true,
        submissionId: res.data?.submission_id || res.data?.id,
        scores: res.data?.scores || [],
        alerts: res.data?.alerts || [],
      })
    } catch (err) {
      update({ submitting: false, errors: { _submit: err.response?.data?.detail || 'Submission failed' } })
    }
  }

  const loadPrevValues = () => {
    if (prevSubmission?.data) {
      setState(s => ({ ...s, values: { ...prevSubmission.data } }))
    }
    setShowPrevBanner(false)
  }

  // ── Render ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 size={36} className="animate-spin text-[#0F2557]" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <AlertTriangle size={40} className="text-red-400 mx-auto mb-3" />
          <p className="text-gray-600">{loadError}</p>
          <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-[#0F2557] text-white rounded-xl text-sm">Go Back</button>
        </div>
      </div>
    )
  }

  const { assignment, formMeta, schema, values, errors, activeSection, submitted, submitting, scores, alerts, draftSaved } = state
  const sections = schema?.sections || []
  const completionPct = getCompletionPct(sections, values)

  // ── Submitted result view ──
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-6 mb-4 text-center">
            <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-[#0F2557]">Form Submitted Successfully</h2>
            <p className="text-sm text-gray-500 mt-1">{formMeta?.title} has been charted.</p>
          </div>

          {scores && scores.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Assessment Scores</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {scores.map((sc, i) => <ScoreCard key={i} score={sc} />)}
              </div>
            </div>
          )}

          {alerts && alerts.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1">
                <AlertTriangle size={14} /> Critical Alerts
              </h3>
              <div className="space-y-2">
                {alerts.map((a, i) => <AlertCard key={i} alert={a} />)}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {state.submissionId && (
              <button
                onClick={() => navigate(`/forms/submission/${state.submissionId}`)}
                className="flex-1 py-3 rounded-xl border border-[#0F2557] text-[#0F2557] text-sm font-semibold hover:bg-[#0F2557]/5 transition"
              >
                View Submission
              </button>
            )}
            <button
              onClick={() => navigate(assignment?.patient_id ? `/patients/${assignment.patient_id}` : '/forms')}
              className="flex-1 py-3 rounded-xl bg-[#0F2557] text-white text-sm font-semibold hover:bg-[#0F2557]/90 transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60), s = secs % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <LangContext.Provider value={{ lang, translations: formMeta?.translations || null }}>
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 transition">
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-bold text-[#0F2557] truncate">{formMeta?.title}</h1>
              {formMeta?.category && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 capitalize">{formMeta.category}</span>
              )}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                {['en', 'hi', 'te'].map(l => (
                  <button key={l} onClick={() => setLang(l)}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${lang === l ? 'bg-white text-[#0F2557] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {l === 'en' ? 'EN' : l === 'hi' ? 'हि' : 'తె'}
                  </button>
                ))}
              </div>
              {assignment?.priority && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold uppercase ${
                  assignment.priority === 'stat' ? 'bg-red-100 text-red-700' : assignment.priority === 'urgent' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                }`}>{assignment.priority}</span>
              )}
            </div>
            {assignment?.patient_name && (
              <p className="text-xs text-gray-500 mt-0.5">
                {assignment.patient_name}
                {assignment.bhid && <span className="font-mono ml-1 text-gray-400">#{assignment.bhid}</span>}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {timeLimitSecs !== null && (
              <span className={`flex items-center gap-1 text-xs font-mono font-semibold px-2 py-1 rounded-lg ${timeLimitSecs < 300 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                <Clock size={12} />
                {formatTime(timeLimitSecs)}
              </span>
            )}
            <button
              onClick={saveDraft}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              <Save size={14} />
              {draftSaved ? 'Saved!' : 'Save Draft'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F5821E] text-white text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-60"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Submit
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-1 bg-[#0F2557] transition-all duration-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <div className="max-w-4xl mx-auto px-4 py-1 flex justify-end">
          <span className="text-xs text-gray-400">{completionPct}% complete</span>
        </div>
      </div>

      {/* Banners */}
      <div className="max-w-4xl mx-auto w-full px-4 mt-4 space-y-2">
        {hasDraft && draftValues && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
            <span className="text-amber-800">You have a saved draft for this form.</span>
            <div className="flex gap-2">
              <button
                onClick={() => { setState(s => ({ ...s, values: draftValues })); setHasDraft(false) }}
                className="px-3 py-1 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition"
              >
                Resume Draft
              </button>
              <button onClick={() => setHasDraft(false)} className="text-amber-500 hover:text-amber-700">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {showPrevBanner && prevSubmission && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm">
            <span className="text-blue-800">
              Previous answers from {new Date(prevSubmission.submitted_at || prevSubmission.created_at).toLocaleDateString()} available
            </span>
            <div className="flex gap-2">
              <button onClick={loadPrevValues} className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition">Load</button>
              <button onClick={() => setShowPrevBanner(false)} className="text-blue-400 hover:text-blue-600"><X size={16} /></button>
            </div>
          </div>
        )}

        {errors._submit && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <AlertTriangle size={16} />
            {errors._submit}
          </div>
        )}
      </div>

      {/* Section tabs */}
      {sections.length > 1 && (
        <div className="max-w-4xl mx-auto w-full px-4 mt-4">
          <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 overflow-x-auto">
            {sections.map((s, i) => (
              <button
                key={i}
                onClick={() => update({ activeSection: i })}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  activeSection === i ? 'bg-[#0F2557] text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {i + 1}. {s.title || s.name || `Section ${i + 1}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form sections */}
      <div className="max-w-4xl mx-auto w-full px-4 py-6 flex-1">
        {sections.map((section, si) => {
          if (sections.length > 1 && si !== activeSection) return null
          return (
            <div key={si} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-[#0F2557]">
                  {section.title || section.name || `Section ${si + 1}`}
                </h2>
                <button
                  type="button"
                  onClick={() => fillNormal(si)}
                  className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition"
                >
                  Fill Normal
                </button>
              </div>

              <div className="space-y-5">
                {(section.fields || []).map(field => {
                  const visible = isFieldVisible(field, values)
                  if (!visible) return null
                  return (
                    <div key={field.id} id={`field-${field.id}`}>
                      <FieldRenderer
                        field={field}
                        value={values[field.id]}
                        onChange={v => setFieldValue(field.id, v)}
                        error={state.touched[field.id] ? errors[field.id] : undefined}
                        allValues={values}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Section navigation */}
        {sections.length > 1 && (
          <div className="flex justify-between">
            <button
              onClick={() => update({ activeSection: Math.max(0, activeSection - 1) })}
              disabled={activeSection === 0}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-white transition disabled:opacity-40"
            >
              ← Previous
            </button>
            {activeSection < sections.length - 1 ? (
              <button
                onClick={() => update({ activeSection: activeSection + 1 })}
                className="px-4 py-2 rounded-xl bg-[#0F2557] text-white text-sm font-semibold hover:bg-[#0F2557]/90 transition"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2 rounded-xl bg-[#F5821E] text-white text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Submit Form'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
    </LangContext.Provider>
  )
}
