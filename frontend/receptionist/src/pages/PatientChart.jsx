import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import api from '../api/client'
import {
  ArrowLeft, Check, Loader2, AlertTriangle, Search, Pin, PinOff,
  Heart, Thermometer, Activity, Droplets, ChevronDown, ChevronUp,
  Clock, Calendar, User, BookOpen, X, RefreshCw,
} from 'lucide-react'

// ─── Utilities ────────────────────────────────────────────────────────────────

function calcBMI(w, h) {
  const wk = parseFloat(w), hm = parseFloat(h) / 100
  return (!wk || !hm) ? null : (wk / (hm * hm)).toFixed(1)
}
function formatAge(dob) {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000) + 'y'
}
function nowLabel() {
  return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-700', waiting: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-purple-100 text-purple-700', completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500', no_show: 'bg-red-100 text-red-600',
}
const STATUS_LABELS = {
  scheduled: 'Scheduled', waiting: 'Waiting', in_progress: 'In Consultation',
  completed: 'Completed', cancelled: 'Cancelled', no_show: 'No Show',
}
const VISIT_LABELS = {
  walk_in: 'Walk-in', scheduled: 'Scheduled', follow_up: 'Follow-up',
  emergency: 'Emergency', telehealth: 'Telehealth',
}

const FORM_PINS_KEY = 'recep_form_pins'
function loadFormPins() {
  try { return JSON.parse(localStorage.getItem(FORM_PINS_KEY) || '[]') } catch { return [] }
}
function saveFormPins(pins) { localStorage.setItem(FORM_PINS_KEY, JSON.stringify(pins)) }

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-5 right-5 z-[90] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
      ${type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
      {type === 'success' ? <Check size={15} className="text-green-600" /> : <AlertTriangle size={15} className="text-red-600" />}
      {msg}
    </div>
  )
}

// ─── Dynamic Form Renderer ────────────────────────────────────────────────────
function FormRenderer({ template, initial = {}, onSave, onCancel, saving }) {
  const [data, setData] = useState(initial)

  const set = (id, val) => setData(d => ({ ...d, [id]: val }))

  const renderField = (field, idx) => {
    if (field.type === 'section_header') return (
      <div key={idx} className="pt-3 pb-1 border-b border-gray-100">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">{field.label}</h4>
      </div>
    )
    const id = field.id || `f_${idx}`
    const val = data[id] ?? ''

    switch (field.type) {
      case 'scale': {
        const min = field.min ?? 0, max = field.max ?? 10
        return (
          <div key={id}>
            <label className="label text-xs">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</label>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(n => (
                <button key={n} type="button" onClick={() => set(id, n)}
                  className={`w-9 h-9 rounded-lg text-sm font-bold border transition-all ${
                    data[id] === n ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                  style={data[id] === n ? { background: '#0F2557' } : {}}>
                  {n}
                </button>
              ))}
              {data[id] !== undefined && data[id] !== '' && (
                <span className="self-center ml-2 text-sm font-bold" style={{ color: '#0F2557' }}>
                  {data[id] === 0 ? 'None' : data[id] <= 3 ? 'Mild' : data[id] <= 6 ? 'Moderate' : 'Severe'}
                </span>
              )}
            </div>
          </div>
        )
      }
      case 'radio': return (
        <div key={id}>
          <label className="label text-xs">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</label>
          <div className="flex flex-wrap gap-2">
            {(field.options || []).map(opt => {
              const optVal = typeof opt === 'object' ? opt.value : opt
              const optLabel = typeof opt === 'object' ? opt.label : opt
              return (
                <label key={optVal} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-sm transition-all ${
                  val === optVal ? 'border-transparent text-white' : 'border-gray-200 text-gray-700 hover:border-gray-300 bg-white'
                }`} style={val === optVal ? { background: '#0F2557' } : {}}>
                  <input type="radio" className="hidden" checked={val === optVal} onChange={() => set(id, optVal)} />
                  {optLabel}
                </label>
              )
            })}
          </div>
        </div>
      )
      case 'select': return (
        <div key={id}>
          <label className="label text-xs">{field.label}</label>
          <select className="input text-sm" value={val} onChange={e => set(id, e.target.value)}>
            <option value="">— Select —</option>
            {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      )
      case 'textarea': return (
        <div key={id}>
          <label className="label text-xs">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</label>
          <textarea className="input text-sm resize-none" rows={field.rows || 2}
            placeholder={field.placeholder || ''} value={val} onChange={e => set(id, e.target.value)} />
        </div>
      )
      case 'checkbox': return (
        <div key={id}>
          <label className="label text-xs">{field.label}</label>
          <div className="flex flex-wrap gap-2">
            {(field.options || []).map(opt => (
              <label key={opt} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300" checked={(val || []).includes(opt)}
                  onChange={e => set(id, e.target.checked ? [...(val || []), opt] : (val || []).filter(v => v !== opt))} />
                {opt}
              </label>
            ))}
          </div>
        </div>
      )
      default: return (
        <div key={id}>
          <label className="label text-xs">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</label>
          <input type={field.type === 'number' ? 'number' : 'text'} className="input text-sm"
            placeholder={field.placeholder || ''} value={val} onChange={e => set(id, e.target.value)} />
        </div>
      )
    }
  }

  return (
    <div className="space-y-4">
      {(template.schema || []).map((field, i) => renderField(field, i))}
      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 justify-center text-sm">Cancel</button>
        <button type="button" onClick={() => onSave(data)} disabled={saving} className="btn-primary flex-1 justify-center text-sm">
          {saving ? <><Loader2 size={13} className="animate-spin" />Saving…</> : <><Check size={13} />Save Form</>}
        </button>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PatientChart() {
  const { appointmentId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const passedAppt = location.state?.appt
  const isDemo = passedAppt?._demo === true

  // ── State ──────────────────────────────────────────────────────────────────
  const [appt, setAppt] = useState(passedAppt || null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Vitals
  const [vitals, setVitals] = useState({ blood_pressure_systolic: '', blood_pressure_diastolic: '', pulse_rate: '', temperature: '', oxygen_saturation: '', weight_kg: '', height_cm: '', blood_sugar: '' })
  const [complaint, setComplaint] = useState('')
  const [triage, setTriage] = useState('normal')
  const [vitalsSaving, setVitalsSaving] = useState(false)
  const [vitalsMsg, setVitalsMsg] = useState(null) // {text, ok}

  // Forms
  const [formSearch, setFormSearch] = useState('')
  const [formResults, setFormResults] = useState([])
  const [formLoading, setFormLoading] = useState(false)
  const [pinnedIds, setPinnedIds] = useState(() => loadFormPins())
  const [filledForms, setFilledForms] = useState([])
  const [activeFormId, setActiveFormId] = useState(null)  // form being filled
  const [expandedFilledId, setExpandedFilledId] = useState(null) // viewing a filled form
  const [formSaving, setFormSaving] = useState(false)

  const [toast, setToast] = useState(null)
  const searchTimer = useRef(null)
  const showToast = (msg, type = 'success') => setToast({ msg, type })

  // ── Load appointment if not passed via state ───────────────────────────────
  useEffect(() => {
    if (appt) return
    // Try to load from today's appointments
    api.get('/appointments', { params: { limit: 200 } })
      .then(r => {
        const list = Array.isArray(r) ? r : []
        const found = list.find(a => String(a.id) === String(appointmentId))
        if (found) setAppt(found)
      })
      .catch(() => {})
  }, [appointmentId, appt])

  // ── Load visit history ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!appt?.patient_id || isDemo) return
    setHistoryLoading(true)
    api.get('/appointments', { params: { patient_id: appt.patient_id, limit: 6 } })
      .then(r => setHistory(Array.isArray(r) ? r.filter(a => String(a.id) !== String(appointmentId)).slice(0, 5) : []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
  }, [appt?.patient_id, appointmentId, isDemo])

  // ── Load filled forms ──────────────────────────────────────────────────────
  const loadFilledForms = useCallback(() => {
    if (isDemo || !appointmentId || appointmentId > 9000) return
    api.get('/forms/responses', { params: { appointment_id: appointmentId } })
      .then(r => setFilledForms(Array.isArray(r) ? r : []))
      .catch(() => {})
  }, [appointmentId, isDemo])

  useEffect(() => { loadFilledForms() }, [loadFilledForms])

  // ── Form search ────────────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(searchTimer.current)
    setFormLoading(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const r = await api.get('/forms/templates', { params: { search: formSearch || undefined, limit: 20 } })
        setFormResults(Array.isArray(r) ? r : [])
      } catch { setFormResults([]) }
      finally { setFormLoading(false) }
    }, formSearch ? 300 : 0)
    return () => clearTimeout(searchTimer.current)
  }, [formSearch])

  // ── Pin a form ─────────────────────────────────────────────────────────────
  const togglePin = (templateId) => {
    setPinnedIds(prev => {
      const next = prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
      saveFormPins(next)
      return next
    })
  }

  // ── Save vitals ────────────────────────────────────────────────────────────
  const saveVitals = async () => {
    if (isDemo) { showToast('Demo patient — vitals are not saved', 'error'); return }
    setVitalsSaving(true); setVitalsMsg(null)
    try {
      const payload = { patient_id: appt.patient_id, appointment_id: appt.id }
      Object.entries(vitals).forEach(([k, v]) => { if (v !== '') payload[k] = parseFloat(v) || v })
      await api.post('/appointments/vitals', payload)
      if (complaint || triage !== 'normal') {
        await api.put(`/appointments/${appt.id}`, { triage_complaint: complaint, triage_level: triage })
      }
      setVitalsMsg({ text: `Saved at ${nowLabel()}`, ok: true })
    } catch (ex) {
      setVitalsMsg({ text: ex.message || 'Save failed', ok: false })
    } finally { setVitalsSaving(false) }
  }

  // ── Save form response ─────────────────────────────────────────────────────
  const saveFormResponse = async (template, data) => {
    if (isDemo) {
      showToast('Demo patient — form saved locally (not to server)', 'error')
      setActiveFormId(null)
      return
    }
    setFormSaving(true)
    try {
      await api.post('/forms/responses', {
        template_id: template.id,
        appointment_id: parseInt(appointmentId),
        patient_id: appt?.patient_id,
        data,
      })
      setActiveFormId(null)
      showToast(`${template.name} saved`)
      loadFilledForms()
    } catch (ex) { showToast(ex.message || 'Save failed', 'error') }
    finally { setFormSaving(false) }
  }

  // ── Status update ──────────────────────────────────────────────────────────
  const updateStatus = async (newStatus) => {
    if (isDemo) { showToast('Demo patient — status not saved', 'error'); return }
    try {
      await api.put(`/appointments/${appt.id}`, { status: newStatus })
      setAppt(prev => ({ ...prev, status: newStatus }))
      showToast(`Status → ${STATUS_LABELS[newStatus]}`)
    } catch (ex) { showToast(ex.message || 'Update failed', 'error') }
  }

  const bmi = calcBMI(vitals.weight_kg, vitals.height_cm)
  const age = appt ? (appt.age || formatAge(appt.date_of_birth)) : null
  const pinnedTemplates = formResults.filter(t => pinnedIds.includes(t.id))
  const activeTemplate = formResults.find(t => t.id === activeFormId)
  const filledTemplateIds = new Set(filledForms.map(f => f.template_id))

  if (!appt && !passedAppt) return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
      <Loader2 size={28} className="animate-spin mb-3" />
      <p className="text-sm">Loading patient chart…</p>
    </div>
  )

  return (
    <div className="space-y-5 pb-8">
      {/* ── Header ── */}
      <div>
        <button onClick={() => navigate('/front-desk')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3 transition-colors">
          <ArrowLeft size={16} />Back to Front Desk
        </button>

        <div className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {/* Patient info */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
                style={{ background: '#EEF2FF', color: '#0F2557' }}>
                {(appt?.patient_name || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold" style={{ color: '#0F2557' }}>{appt?.patient_name || '—'}</h1>
                  {isDemo && <span className="badge badge-blue text-xs">Demo</span>}
                  {appt?.bh_id && <span className="text-sm font-mono text-blue-500 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">{appt.bh_id}</span>}
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                  {age && <span>{age}</span>}
                  {appt?.gender && <span className="capitalize">{appt.gender}</span>}
                  {appt?.blood_group && <span className="font-semibold text-red-600">{appt.blood_group}</span>}
                  <span className="text-gray-300">|</span>
                  <span>{VISIT_LABELS[appt?.visit_type] || appt?.visit_type}</span>
                  <span>·</span>
                  <span>{appt?.doctor_name || '—'}</span>
                  <span>·</span>
                  <Clock size={13} className="text-gray-400" />
                  <span>{appt?.appointment_time || '—'}</span>
                  {appt?.token_number && <span className="font-bold" style={{ color: '#0F2557' }}>T-{String(appt.token_number).padStart(2, '0')}</span>}
                </div>
              </div>
            </div>

            {/* Status + actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`badge text-sm font-semibold px-3 py-1.5 rounded-full ${STATUS_COLORS[appt?.status] || 'bg-gray-100 text-gray-500'}`}>
                {STATUS_LABELS[appt?.status] || appt?.status}
              </span>
              {appt?.status === 'scheduled' && <button onClick={() => updateStatus('waiting')} className="btn-secondary text-sm"><Check size={14} />Check In</button>}
              {appt?.status === 'waiting' && <button onClick={() => updateStatus('in_progress')} className="btn-primary text-sm">Start Consultation</button>}
              {appt?.status === 'in_progress' && <button onClick={() => updateStatus('completed')} className="btn-success text-sm"><Check size={14} />Complete</button>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* LEFT — Vitals + History (2/5) */}
        <div className="lg:col-span-2 space-y-4">

          {/* Vitals card */}
          <div className="card p-5">
            <h2 className="font-bold text-base mb-4 flex items-center gap-2" style={{ color: '#0F2557' }}>
              <Heart size={16} style={{ color: '#EF4444' }} />Vitals & Screening
            </h2>
            <div className="space-y-3">
              {/* BP */}
              <div>
                <label className="label text-xs flex items-center gap-1"><Heart size={11} className="text-red-400" />Blood Pressure (mmHg)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" className="input text-sm" placeholder="Systolic" value={vitals.blood_pressure_systolic} onChange={e => setVitals(v => ({ ...v, blood_pressure_systolic: e.target.value }))} />
                  <input type="number" className="input text-sm" placeholder="Diastolic" value={vitals.blood_pressure_diastolic} onChange={e => setVitals(v => ({ ...v, blood_pressure_diastolic: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div><label className="label text-xs flex items-center gap-1"><Activity size={11} className="text-purple-400" />Pulse</label>
                  <input type="number" className="input text-sm" placeholder="bpm" value={vitals.pulse_rate} onChange={e => setVitals(v => ({ ...v, pulse_rate: e.target.value }))} /></div>
                <div><label className="label text-xs flex items-center gap-1"><Thermometer size={11} className="text-orange-400" />Temp °F</label>
                  <input type="number" step="0.1" className="input text-sm" placeholder="98.6" value={vitals.temperature} onChange={e => setVitals(v => ({ ...v, temperature: e.target.value }))} /></div>
                <div><label className="label text-xs flex items-center gap-1"><Droplets size={11} className="text-blue-400" />SpO2 %</label>
                  <input type="number" className="input text-sm" placeholder="99" value={vitals.oxygen_saturation} onChange={e => setVitals(v => ({ ...v, oxygen_saturation: e.target.value }))} /></div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div><label className="label text-xs">Weight (kg)</label>
                  <input type="number" step="0.1" className="input text-sm" placeholder="70.0" value={vitals.weight_kg} onChange={e => setVitals(v => ({ ...v, weight_kg: e.target.value }))} /></div>
                <div><label className="label text-xs">Height (cm)</label>
                  <input type="number" step="0.1" className="input text-sm" placeholder="170" value={vitals.height_cm} onChange={e => setVitals(v => ({ ...v, height_cm: e.target.value }))} /></div>
              </div>

              {bmi && (
                <div className="text-xs bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  BMI: <strong className="text-blue-700">{bmi}</strong>
                  <span className="ml-2 text-gray-500">{bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'}</span>
                </div>
              )}

              <div><label className="label text-xs">Blood Glucose (mg/dL)</label>
                <input type="number" step="0.1" className="input text-sm" placeholder="Optional" value={vitals.blood_sugar} onChange={e => setVitals(v => ({ ...v, blood_sugar: e.target.value }))} /></div>

              <div><label className="label text-xs">Chief Complaint</label>
                <textarea className="input resize-none text-sm" rows={2} placeholder="Describe chief complaint…" value={complaint} onChange={e => setComplaint(e.target.value)} /></div>

              <div>
                <label className="label text-xs">Triage</label>
                <div className="flex gap-2">
                  {[{ v: 'normal', l: '🟢 Normal', c: '#16A34A' }, { v: 'moderate', l: '🟡 Moderate', c: '#F59E0B' }, { v: 'urgent', l: '🔴 Urgent', c: '#EF4444' }].map(t => (
                    <button key={t.v} type="button" onClick={() => setTriage(t.v)}
                      className={`flex-1 text-xs py-1.5 rounded-xl border font-medium transition-all ${triage === t.v ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                      style={triage === t.v ? { background: t.c } : {}}>
                      {t.l}
                    </button>
                  ))}
                </div>
              </div>

              {vitalsMsg && (
                <p className={`text-xs flex items-center gap-1 ${vitalsMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {vitalsMsg.ok ? <Check size={12} /> : <AlertTriangle size={12} />}{vitalsMsg.text}
                </p>
              )}

              <button onClick={saveVitals} disabled={vitalsSaving} className="btn-primary w-full justify-center text-sm">
                {vitalsSaving ? <><Loader2 size={13} className="animate-spin" />Saving…</> : 'Save Vitals'}
              </button>
            </div>
          </div>

          {/* Visit history */}
          <div className="card p-5">
            <h2 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#0F2557' }}>
              <Calendar size={15} />Visit History
            </h2>
            {isDemo ? (
              <div className="space-y-2">
                {[
                  { date: '2026-05-12', doctor: 'Dr. Priya Sharma', type: 'Follow-up', status: 'completed' },
                  { date: '2026-04-03', doctor: 'Dr. Arun Reddy',   type: 'Walk-in',   status: 'completed' },
                  { date: '2026-02-18', doctor: 'Dr. Priya Sharma', type: 'Scheduled',  status: 'completed' },
                ].map((h, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{h.date}</div>
                      <div className="text-xs text-gray-400">{h.doctor} · {h.type}</div>
                    </div>
                    <span className="badge badge-green text-xs">Done</span>
                  </div>
                ))}
              </div>
            ) : historyLoading ? (
              <div className="flex justify-center py-4"><Loader2 size={18} className="animate-spin text-gray-300" /></div>
            ) : history.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">No previous visits</p>
            ) : (
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{h.appointment_date || h.date}</div>
                      <div className="text-xs text-gray-400">{h.doctor_name} · {VISIT_LABELS[h.visit_type] || h.visit_type}</div>
                    </div>
                    <span className={`badge text-xs ${STATUS_COLORS[h.status] || 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[h.status] || h.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Assessment Forms (3/5) */}
        <div className="lg:col-span-3">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-base flex items-center gap-2" style={{ color: '#0F2557' }}>
                <BookOpen size={16} />Assessment Forms
              </h2>
              {formResults.length > 0 && (
                <span className="text-xs text-gray-400">{formResults.length} in pool</span>
              )}
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-9 text-sm"
                placeholder="Search form pool (e.g. pain, falls, nursing)…"
                value={formSearch}
                onChange={e => setFormSearch(e.target.value)}
              />
              {formSearch && (
                <button onClick={() => setFormSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Pinned chips */}
            {pinnedTemplates.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
                  <Pin size={11} />Pinned Forms
                </p>
                <div className="flex flex-wrap gap-2">
                  {pinnedTemplates.map(t => (
                    <button key={t.id} onClick={() => setActiveFormId(activeFormId === t.id ? null : t.id)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                        activeFormId === t.id ? 'text-white border-transparent' : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                      }`}
                      style={activeFormId === t.id ? { background: '#0F2557' } : {}}>
                      {t.name}
                      {filledTemplateIds.has(t.id) && <Check size={10} className={activeFormId === t.id ? 'text-green-300' : 'text-green-500'} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Active form inline */}
            {activeFormId && activeTemplate && (
              <div className="mb-4 border border-blue-100 rounded-2xl p-4 bg-blue-50/30">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-sm" style={{ color: '#0F2557' }}>{activeTemplate.name}</h3>
                    <p className="text-xs text-gray-400">{activeTemplate.category} · ~{activeTemplate.estimated_minutes} min</p>
                  </div>
                  <button onClick={() => setActiveFormId(null)} className="p-1.5 rounded-lg hover:bg-blue-100 text-gray-400"><X size={15} /></button>
                </div>
                <FormRenderer
                  template={activeTemplate}
                  initial={filledForms.find(f => f.template_id === activeFormId)?.data || {}}
                  onSave={(data) => saveFormResponse(activeTemplate, data)}
                  onCancel={() => setActiveFormId(null)}
                  saving={formSaving}
                />
              </div>
            )}

            {/* Form list */}
            {formLoading ? (
              <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
            ) : formResults.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <BookOpen size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">{formSearch ? `No forms matching "${formSearch}"` : 'No assessment forms in pool yet'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {formResults.map(t => {
                  const isFilled = filledTemplateIds.has(t.id)
                  const isPinned = pinnedIds.includes(t.id)
                  const isActive = activeFormId === t.id
                  const filledRecord = filledForms.find(f => f.template_id === t.id)

                  return (
                    <div key={t.id} className={`rounded-xl border transition-all ${isActive ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
                      <div className="flex items-center gap-3 px-4 py-3">
                        {/* Status dot */}
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isFilled ? 'bg-green-400' : 'bg-gray-200'}`} />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-800">{t.name}</span>
                            {t.category && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{t.category}</span>}
                            {isFilled && <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><Check size={11} />Filled</span>}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                            <Clock size={10} />~{t.estimated_minutes} min
                            {t.description && <span className="truncate max-w-[200px]">{t.description}</span>}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => setActiveFormId(isActive ? null : t.id)}
                            className={`text-xs py-1 px-2.5 rounded-lg font-medium transition-all ${isActive ? 'bg-gray-100 text-gray-600' : isFilled ? 'btn-secondary' : 'btn-primary'}`}
                          >
                            {isActive ? 'Close' : isFilled ? 'Edit' : 'Fill'}
                          </button>
                          <button
                            onClick={() => togglePin(t.id)}
                            className={`p-1.5 rounded-lg transition-colors ${isPinned ? 'text-orange-500 bg-orange-50 hover:bg-orange-100' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'}`}
                            title={isPinned ? 'Unpin form' : 'Pin form'}
                          >
                            {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* View filled data */}
                      {isFilled && !isActive && filledRecord && (
                        <div className="border-t border-gray-100">
                          <button
                            onClick={() => setExpandedFilledId(expandedFilledId === t.id ? null : t.id)}
                            className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                          >
                            <span className="flex items-center gap-1">
                              <Clock size={10} />Filled at {filledRecord.filled_at ? new Date(filledRecord.filled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                            </span>
                            {expandedFilledId === t.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                          {expandedFilledId === t.id && (
                            <div className="px-4 pb-3 space-y-2">
                              {(t.schema || []).filter(f => f.id && filledRecord.data?.[f.id] !== undefined).map(f => (
                                <div key={f.id} className="flex items-start gap-2">
                                  <span className="text-xs text-gray-400 w-32 flex-shrink-0">{f.label}:</span>
                                  <span className="text-xs text-gray-700 font-medium">
                                    {Array.isArray(filledRecord.data[f.id]) ? filledRecord.data[f.id].join(', ') : String(filledRecord.data[f.id])}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Filled forms summary (for filled forms not in current search) */}
            {filledForms.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
                  <Check size={11} className="text-green-500" />Filled This Visit ({filledForms.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {filledForms.map(f => (
                    <span key={f.id} className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">
                      <Check size={10} />{f.template_name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
