import { useState } from 'react'
import { Loader2, CheckCircle, AlertCircle, Activity } from 'lucide-react'
import { usePin } from '../../contexts/PinContext'
import SignatureBlock from '../SignatureBlock'
import api from '../../api/client'

// ── Normal ranges ─────────────────────────────────────────────────────────────

const RANGES = {
  temperature:      { min: 36,  max: 38.5, unit: '°C'  },
  pulse:            { min: 60,  max: 100,  unit: ' bpm' },
  bp_systolic:      { min: 90,  max: 140,  unit: ' mmHg'},
  spo2:             { min: 95,  max: 100,  unit: '%'    },
  respiration_rate: { min: 12,  max: 20,   unit: ' /min'},
}

function isAbnormal(key, val) {
  const r = RANGES[key]
  if (!r || val === '' || val == null) return false
  const n = parseFloat(val)
  return !isNaN(n) && (n < r.min || n > r.max)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function VitalInput({ label, field, value, onChange, placeholder, step, min, max, hint }) {
  const bad = isAbnormal(field, value)
  const r   = RANGES[field]
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className={`input ${bad ? 'border-red-400 bg-red-50 focus:ring-red-300' : ''}`}
        type="number"
        step={step || 1}
        min={min}
        max={max}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {bad ? (
        <p className="text-xs text-red-500 mt-0.5 font-medium">
          Abnormal — normal {r.min}–{r.max}{r.unit}
        </p>
      ) : r ? (
        <p className="text-xs text-gray-400 mt-0.5">Normal: {r.min}–{r.max}{r.unit}</p>
      ) : hint ? (
        <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
      ) : null}
    </div>
  )
}

function SectionHead({ title }) {
  return (
    <div className="col-span-2 pt-2 pb-1 border-b border-gray-200 mb-1">
      <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">{title}</p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const EMPTY = {
  temperature: '', pulse: '', bp_systolic: '', bp_diastolic: '',
  spo2: '', respiration_rate: '', weight: '', height: '',
  pain_score: 0, notes: '',
}

export default function VitalSignsForm({ admission, onClose, onSaved }) {
  const { requestPin } = usePin()
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)
  const [signedIdentity, setSI] = useState(null)
  const [signedAt, setSA]       = useState('')

  const set = key => val => setForm(prev => ({ ...prev, [key]: val }))
  const ev  = key => e  => set(key)(e.target.value)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')

    let identity
    try { identity = await requestPin('Record Vital Signs') } catch { return }

    setSaving(true)
    try {
      const payload = { recorded_by: identity.staff_id, notes: form.notes }
      const numFields = ['temperature','pulse','bp_systolic','bp_diastolic','spo2','respiration_rate','weight','height','pain_score']
      numFields.forEach(k => {
        if (form[k] !== '' && form[k] != null) payload[k] = Number(form[k])
      })
      await api.post(`/inpatient/admissions/${admission.id}/vitals`, payload)
      const now = new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
      setSuccess(true); setSI(identity); setSA(now)
      onSaved?.()
    } catch (err) {
      setError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const anyAbnormal = ['temperature','pulse','bp_systolic','spo2','respiration_rate'].some(k => isAbnormal(k, form[k]))

  // ── Success state ─────────────────────────────────────────────────────────

  if (success) return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 gap-4">
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
        <CheckCircle size={15} /> Vital signs recorded successfully.
      </div>
      {signedIdentity && <SignatureBlock verifiedIdentity={signedIdentity} signed signedAt={signedAt} />}
      <div className="shrink-0 border-t border-gray-200 pt-4 flex justify-end">
        <button onClick={onClose} className="btn-secondary">Close</button>
      </div>
    </div>
  )

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-4">

        {/* Form name badge */}
        <div className="flex items-center gap-2 mb-4 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg w-fit">
          <Activity size={13} className="text-emerald-600" />
          <span className="text-xs font-bold text-emerald-700 tracking-wide">[A] Vital Signs</span>
        </div>

        {anyAbnormal && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <AlertCircle size={14} /> One or more values are outside normal range — review before saving.
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-3">

          <SectionHead title="Cardiovascular & Respiratory" />

          <VitalInput label="Pulse (bpm)" field="pulse" value={form.pulse}
            onChange={set('pulse')} placeholder="72" min={20} max={300} />
          <div>
            <label className="label">Blood Pressure (mmHg)</label>
            <div className="flex gap-2">
              <input
                className={`input ${isAbnormal('bp_systolic', form.bp_systolic) ? 'border-red-400 bg-red-50' : ''}`}
                type="number" placeholder="Sys" min={50} max={300}
                value={form.bp_systolic} onChange={ev('bp_systolic')}
              />
              <span className="self-center text-gray-400 font-bold">/</span>
              <input
                className="input" type="number" placeholder="Dia" min={30} max={200}
                value={form.bp_diastolic} onChange={ev('bp_diastolic')}
              />
            </div>
            {isAbnormal('bp_systolic', form.bp_systolic) && (
              <p className="text-xs text-red-500 mt-0.5 font-medium">Systolic abnormal — normal 90–140 mmHg</p>
            )}
          </div>

          <VitalInput label="SpO2 (%)" field="spo2" value={form.spo2}
            onChange={set('spo2')} placeholder="98" min={50} max={100} />
          <VitalInput label="Respiration Rate (/min)" field="respiration_rate" value={form.respiration_rate}
            onChange={set('respiration_rate')} placeholder="16" min={5} max={60} />

          <SectionHead title="Temperature & Anthropometry" />

          <VitalInput label="Temperature (°C)" field="temperature" value={form.temperature}
            onChange={set('temperature')} placeholder="37.0" step={0.1} min={30} max={45} />
          <VitalInput label="Weight (kg)" field="weight" value={form.weight}
            onChange={set('weight')} placeholder="70" step={0.1} min={1} max={300} hint="kg" />
          <VitalInput label="Height (cm)" field="height" value={form.height}
            onChange={set('height')} placeholder="165" min={30} max={250} hint="cm" />
          <div />

          <SectionHead title="Pain" />

          <div className="col-span-2">
            <label className="label">Pain Score — {form.pain_score} / 10</label>
            <input
              className="w-full accent-emerald-600 mt-1"
              type="range" min={0} max={10} step={1}
              value={form.pain_score}
              onChange={ev('pain_score')}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>0 — No pain</span>
              <span className={form.pain_score >= 7 ? 'text-red-500 font-semibold' : ''}>
                {form.pain_score >= 7 ? `${form.pain_score} — Severe` : form.pain_score >= 4 ? `${form.pain_score} — Moderate` : '10 — Worst'}
              </span>
            </div>
          </div>

          <SectionHead title="Notes" />

          <div className="col-span-2">
            <textarea className="input" rows={2} placeholder="Any clinical observations…"
              value={form.notes} onChange={ev('notes')} />
          </div>

        </div>

        {error && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-between gap-3">
        <p className="text-xs text-gray-400">PIN required — recorded vitals are permanent.</p>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : 'Record Vitals'}
          </button>
        </div>
      </div>
    </form>
  )
}
