import { useState, useEffect, useContext } from 'react'
import { UserCog, Loader2 } from 'lucide-react'
import api from '../../api/client'
import { PatientDataContext, loadClinicalContext } from './patientContext'

// ─────────────────────────────────────────────────────────────────────────────
// patient_auto — a read-only field that auto-fills a value from the live patient
// chart (age / weight / sex / BMI / allergies …). Crucially it also writes that
// value into the form data under its field_id, so any *editable* calculated
// formula or condition the admin builds can reference it — e.g. {age} < 12 to
// reveal a paediatric block, or ({weight} * 15) for a mg/kg dose.
// ─────────────────────────────────────────────────────────────────────────────

export const PATIENT_SOURCES = {
  age:         { label: 'Age',         unit: 'yrs', get: c => c.age },
  age_months:  { label: 'Age (months)', unit: 'mo', get: c => c.age_months },
  weight:      { label: 'Weight',      unit: 'kg',  get: c => c.weight_kg },
  height:      { label: 'Height',      unit: 'cm',  get: c => c.height_cm },
  bmi:         { label: 'BMI',         unit: '',    get: c => c.bmi },
  sex:         { label: 'Sex',         unit: '',    get: c => c.sex },
  blood_group: { label: 'Blood group', unit: '',    get: c => c.blood_group },
  allergies:   { label: 'Allergies',   unit: '',    get: c => (c.allergies || []).length ? c.allergies.join(', ') : 'NKDA' },
}

export default function PatientAutoField({ field, value, onChange }) {
  const { patientId } = useContext(PatientDataContext)
  const [ctx, setCtx] = useState(null)
  const src = PATIENT_SOURCES[field.auto_source] || PATIENT_SOURCES.age

  useEffect(() => { loadClinicalContext(api, patientId).then(setCtx) }, [patientId])

  // Populate form data so formulas/conditions can read {field_id}.
  useEffect(() => {
    if (!ctx) return
    const v = src.get(ctx)
    if (v != null && v !== '' && String(v) !== String(value ?? '')) onChange(v)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, field.auto_source])

  const display = value != null && value !== '' ? value : (ctx ? src.get(ctx) : null)

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label || src.label}
      </label>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700">
        <UserCog size={14} className="text-gray-400 flex-shrink-0" />
        {!ctx && !value ? (
          <span className="flex items-center gap-1 text-gray-400"><Loader2 size={12} className="animate-spin" /> loading…</span>
        ) : (
          <span className="font-medium">
            {display == null || display === '' ? '—' : `${display}${src.unit ? ' ' + src.unit : ''}`}
          </span>
        )}
        <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-400">auto · {src.label}</span>
      </div>
    </div>
  )
}
