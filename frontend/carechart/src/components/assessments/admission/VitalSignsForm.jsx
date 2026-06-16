import { useState, useEffect } from 'react'
import { Loader2, CheckCircle, AlertCircle, Activity } from 'lucide-react'
import api from '../../../api/client'

// ── Temperature normal ranges by location (IAP / API Indian standards) ────────
const TEMP_RANGES = {
  oral:     { min: 36.5, max: 37.5, label: 'Oral'     },
  axillary: { min: 36.0, max: 37.0, label: 'Axillary' },
  rectal:   { min: 37.0, max: 38.0, label: 'Rectal'   },
  tympanic: { min: 36.5, max: 37.5, label: 'Tympanic' },
}

// ── Other ranges (Indian API / ISH 2020 standards) ────────────────────────────
const RANGES = {
  pulse:            { min: 60,   max: 100,  unit: 'bpm',  fieldMin: 30,  fieldMax: 200 },
  bp_systolic:      { min: 90,   max: 120,  unit: 'mmHg', fieldMin: 60,  fieldMax: 250,
                      alertMin: 90, alertMax: 140 },
  bp_diastolic:     { min: 60,   max: 80,   unit: 'mmHg', fieldMin: 40,  fieldMax: 150,
                      alertMin: 60, alertMax: 90  },
  spo2:             { min: 95,   max: 100,  unit: '%',    fieldMin: 50,  fieldMax: 100 },
  respiration_rate: { min: 12,   max: 20,   unit: '/min', fieldMin: 4,   fieldMax: 60  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcAge(dob) {
  if (!dob) return null
  const d = new Date(dob)
  const t = new Date()
  let age = t.getFullYear() - d.getFullYear()
  if (t.getMonth() - d.getMonth() < 0 ||
      (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) age--
  return age >= 0 ? age : null
}

function dobFromAge(age) {
  if (age === '' || age == null) return ''
  const year = new Date().getFullYear() - parseInt(age, 10)
  return `${year}-01-01`
}

function weightStep(age) {
  if (age === null || age === undefined) return 1
  if (age < 5)  return 0.1
  if (age <= 18) return 0.5
  return 1
}

function isTempAbnormal(val, location) {
  if (val === '' || val == null) return false
  const r = TEMP_RANGES[location] || TEMP_RANGES.oral
  const n = parseFloat(val)
  return !isNaN(n) && (n < r.min || n > r.max)
}

function isAbnormal(key, val) {
  if (val === '' || val == null) return false
  const r = RANGES[key]
  if (!r) return false
  const n = parseFloat(val)
  const lo = r.alertMin ?? r.min
  const hi = r.alertMax ?? r.max
  return !isNaN(n) && (n < lo || n > hi)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHead({ title }) {
  return (
    <div className="col-span-2 pt-3 pb-1 border-b border-gray-200 mb-1">
      <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">{title}</p>
    </div>
  )
}

function Lbl({ children, required }) {
  return (
    <label className="label">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function RangeHint({ bad, badMsg, normalText }) {
  if (bad)        return <p className="text-xs text-red-500 mt-0.5 font-medium">{badMsg}</p>
  if (normalText) return <p className="text-xs text-gray-400 mt-0.5">Normal: {normalText}</p>
  return null
}

// ── Main component ────────────────────────────────────────────────────────────

export default function VitalSignsForm({ admission, onClose, onSaved }) {
  const patientDob = admission?.patient?.date_of_birth || null
  const initAge    = calcAge(patientDob)

  const [dob,      setDob]      = useState(patientDob || '')
  const [ageInput, setAgeInput] = useState(initAge != null ? String(initAge) : '')
  const [form,     setForm]     = useState({
    temp_location: 'oral',
    temperature: '', pulse: '',
    bp_systolic: '', bp_diastolic: '',
    spo2: '', respiration_rate: '',
    weight: '', height: '',
    pain_present: null,   // null = not answered yet, true/false after selection
    notes: '',
  })

  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState(false)

  // Age derived from DOB or manual entry
  const age = dob ? calcAge(dob) : (ageInput !== '' ? parseInt(ageInput, 10) : null)
  const wStep = weightStep(age)

  // When DOB changes → auto-fill age
  const handleDobChange = val => {
    setDob(val)
    const a = calcAge(val)
    if (a !== null) setAgeInput(String(a))
  }

  // When age changes manually → approximate DOB (year only)
  const handleAgeChange = val => {
    setAgeInput(val)
    if (!dob) setDob(dobFromAge(val))  // only set dob if not already set
  }

  const set = key => val => setForm(prev => ({ ...prev, [key]: val }))
  const ev  = key => e  => set(key)(e.target.value)

  const tempRange    = TEMP_RANGES[form.temp_location] || TEMP_RANGES.oral
  const tempBad      = isTempAbnormal(form.temperature, form.temp_location)
  const anyAbnormal  = tempBad ||
    ['pulse','bp_systolic','bp_diastolic','spo2','respiration_rate'].some(k => isAbnormal(k, form[k]))

  const handleSubmit = async e => {
    e.preventDefault()
    if (form.pain_present === null) { setError('Please answer the Pain Present question'); return }
    setError('')

    setSaving(true)
    try {
      const meta = JSON.stringify({ temp_location: form.temp_location, pain_present: form.pain_present })
      const notesText = `[vitals_meta]${meta}${form.notes ? '\n' + form.notes : ''}`

      const payload = { notes: notesText }
      const numFields = ['temperature','pulse','bp_systolic','bp_diastolic','spo2','respiration_rate','weight','height']
      numFields.forEach(k => {
        if (form[k] !== '' && form[k] != null) payload[k] = Number(form[k])
      })
      // pain_score: store 0 if pain absent so the column has a value; Pain Assessment handles actual score
      payload.pain_score = form.pain_present ? null : 0

      await api.post(`/inpatient/admissions/${admission.id}/vitals`, payload)
      setSuccess(true)
      onSaved?.({ pain_present: form.pain_present })
    } catch (err) {
      setError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // ── Success ───────────────────────────────────────────────────────────────

  if (success) return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 gap-4">
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
        <CheckCircle size={15} /> Vital signs recorded.
        {form.pain_present && (
          <span className="ml-1 font-medium">Pain reported — complete Pain Assessment next.</span>
        )}
      </div>
      <div className="shrink-0 pt-4 border-t border-gray-200 flex justify-end">
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
            <AlertCircle size={14} /> One or more values outside normal range — review before saving.
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-4 gap-y-3">

          {/* ── Patient Age ── */}
          <SectionHead title="Patient Age" />

          <div>
            <Lbl>Date of Birth</Lbl>
            <input className="input" type="date"
              max={new Date().toISOString().slice(0,10)}
              value={dob} onChange={e => handleDobChange(e.target.value)} />
            <p className="text-xs text-gray-400 mt-0.5">DD / MM / YYYY</p>
          </div>
          <div>
            <Lbl>Age (years)</Lbl>
            <input className="input" type="number" min={0} max={120} step={1}
              placeholder="Enter if DOB unknown"
              value={ageInput} onChange={e => handleAgeChange(e.target.value)} />
            {age !== null && (
              <p className="text-xs text-emerald-600 mt-0.5 font-medium">
                {age < 5 ? 'Under 5 — weight step 0.1 kg' : age <= 18 ? '5–18 yrs — weight step 0.5 kg' : 'Adult — weight step 1 kg'}
              </p>
            )}
          </div>

          {/* ── Temperature ── */}
          <SectionHead title="Temperature" />

          <div>
            <Lbl>Measurement Location</Lbl>
            <select className="input" value={form.temp_location} onChange={ev('temp_location')}>
              <option value="oral">Oral</option>
              <option value="axillary">Axillary</option>
              <option value="rectal">Rectal</option>
              <option value="tympanic">Tympanic</option>
            </select>
          </div>
          <div>
            <Lbl>Temperature (°C)</Lbl>
            <input className={`input ${tempBad ? 'border-red-400 bg-red-50' : ''}`}
              type="number" min={30} max={43} step={0.1} placeholder="37.0"
              value={form.temperature} onChange={ev('temperature')} />
            <RangeHint
              bad={tempBad}
              badMsg={`Abnormal for ${tempRange.label} — normal ${tempRange.min}–${tempRange.max}°C`}
              normalText={`${tempRange.min}–${tempRange.max}°C (${tempRange.label})`}
            />
          </div>

          {/* ── Cardiovascular ── */}
          <SectionHead title="Cardiovascular" />

          <div>
            <Lbl>Pulse (bpm)</Lbl>
            <input className={`input ${isAbnormal('pulse', form.pulse) ? 'border-red-400 bg-red-50' : ''}`}
              type="number" min={30} max={200} step={1} placeholder="72"
              value={form.pulse} onChange={ev('pulse')} />
            <RangeHint bad={isAbnormal('pulse', form.pulse)}
              badMsg="Abnormal — normal 60–100 bpm"
              normalText="60–100 bpm" />
          </div>

          <div>
            <Lbl>Blood Pressure (mmHg)</Lbl>
            <div className="flex items-center gap-2">
              <input className={`input ${isAbnormal('bp_systolic', form.bp_systolic) ? 'border-red-400 bg-red-50' : ''}`}
                type="number" min={60} max={250} step={1} placeholder="Sys"
                value={form.bp_systolic} onChange={ev('bp_systolic')} />
              <span className="text-gray-400 font-bold flex-shrink-0">/</span>
              <input className={`input ${isAbnormal('bp_diastolic', form.bp_diastolic) ? 'border-red-400 bg-red-50' : ''}`}
                type="number" min={40} max={150} step={1} placeholder="Dia"
                value={form.bp_diastolic} onChange={ev('bp_diastolic')} />
            </div>
            {(isAbnormal('bp_systolic', form.bp_systolic) || isAbnormal('bp_diastolic', form.bp_diastolic)) ? (
              <p className="text-xs text-red-500 mt-0.5 font-medium">Abnormal — normal 90–120 / 60–80 mmHg</p>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">Normal: 90–120 / 60–80 mmHg</p>
            )}
          </div>

          {/* ── Respiratory & SpO2 ── */}
          <SectionHead title="Respiratory" />

          <div>
            <Lbl>SpO2 (%)</Lbl>
            <input className={`input ${isAbnormal('spo2', form.spo2) ? 'border-red-400 bg-red-50' : ''}`}
              type="number" min={50} max={100} step={1} placeholder="98"
              value={form.spo2} onChange={ev('spo2')} />
            <RangeHint bad={isAbnormal('spo2', form.spo2)}
              badMsg="Abnormal — normal 95–100%"
              normalText="95–100%" />
          </div>

          <div>
            <Lbl>Respiration Rate (/min)</Lbl>
            <input className={`input ${isAbnormal('respiration_rate', form.respiration_rate) ? 'border-red-400 bg-red-50' : ''}`}
              type="number" min={4} max={60} step={1} placeholder="16"
              value={form.respiration_rate} onChange={ev('respiration_rate')} />
            <RangeHint bad={isAbnormal('respiration_rate', form.respiration_rate)}
              badMsg="Abnormal — normal 12–20 /min"
              normalText="12–20 /min" />
          </div>

          {/* ── Anthropometry ── */}
          <SectionHead title="Anthropometry" />

          <div>
            <Lbl>Weight (kg)</Lbl>
            <input className="input" type="number" min={1} max={300} step={wStep}
              placeholder={`e.g. 70 (step ${wStep} kg)`}
              value={form.weight} onChange={ev('weight')} />
            {age !== null && (
              <p className="text-xs text-gray-400 mt-0.5">Step: {wStep} kg (age {age} yrs)</p>
            )}
          </div>

          <div>
            <Lbl>Height (cm)</Lbl>
            <input className="input" type="number" min={30} max={250} step={1} placeholder="165"
              value={form.height} onChange={ev('height')} />
          </div>

          {/* ── Pain ── */}
          <SectionHead title="Pain" />

          <div className="col-span-2">
            <Lbl required>Pain Present?</Lbl>
            <div className="flex gap-3 mt-1">
              {[{ val: true, label: 'Yes — Pain Present', color: 'border-red-400 bg-red-50 text-red-700' },
                { val: false, label: 'No — Pain Free',    color: 'border-emerald-400 bg-emerald-50 text-emerald-700' }
              ].map(({ val, label, color }) => (
                <button key={String(val)} type="button"
                  onClick={() => set('pain_present')(val)}
                  className={`flex-1 py-2.5 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                    form.pain_present === val ? color : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            {form.pain_present === true && (
              <p className="text-xs text-red-600 mt-1.5 font-medium">
                Complete [A] Pain Assessment after saving vitals.
              </p>
            )}
          </div>

          {/* ── Notes ── */}
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
      <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-end gap-3">
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
