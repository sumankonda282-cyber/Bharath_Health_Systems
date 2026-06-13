import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { appointmentsApi } from '../../api'
import api from '../../api/client'
import { format } from 'date-fns'
import { Activity, User, Clock, ChevronLeft, Save, CheckCircle } from 'lucide-react'

const VITALS_FIELDS = [
  { key: 'blood_pressure_systolic',   label: 'BP Systolic',     unit: 'mmHg', type: 'number', min: 50,  max: 250 },
  { key: 'blood_pressure_diastolic',  label: 'BP Diastolic',    unit: 'mmHg', type: 'number', min: 30,  max: 150 },
  { key: 'pulse_rate',                label: 'Pulse Rate',      unit: 'bpm',  type: 'number', min: 20,  max: 300 },
  { key: 'temperature',               label: 'Temperature',     unit: '°F',   type: 'number', min: 90,  max: 110, step: '0.1' },
  { key: 'weight_kg',                 label: 'Weight',          unit: 'kg',   type: 'number', min: 1,   max: 300, step: '0.1' },
  { key: 'height_cm',                 label: 'Height',          unit: 'cm',   type: 'number', min: 30,  max: 250, step: '0.1' },
  { key: 'oxygen_saturation',         label: 'SpO₂',            unit: '%',    type: 'number', min: 50,  max: 100 },
  { key: 'blood_sugar',               label: 'Blood Sugar',     unit: 'mg/dL',type: 'number', min: 20,  max: 600, step: '0.1' },
]

function bpCategory(sys, dia) {
  if (!sys || !dia) return null
  if (sys < 120 && dia < 80) return { label: 'Normal', color: '#16a34a' }
  if (sys < 130 && dia < 80) return { label: 'Elevated', color: '#ca8a04' }
  if (sys < 140 || dia < 90) return { label: 'High Stage 1', color: '#ea580c' }
  return { label: 'High Stage 2', color: '#CC1414' }
}

function spo2Status(val) {
  if (!val) return null
  if (val >= 95) return { label: 'Normal', color: '#16a34a' }
  if (val >= 90) return { label: 'Low', color: '#ca8a04' }
  return { label: 'Critical', color: '#CC1414' }
}

export default function Triage() {
  const navigate = useNavigate()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [date, setDate] = useState(today)
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [vitals, setVitals] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setLoading(true)
    appointmentsApi.list({ appointment_date: date, limit: 100 })
      .then(r => {
        const list = (Array.isArray(r) ? r : []).filter(a => a.status !== 'cancelled')
        setQueue(list)
        if (list.length > 0 && !selected) setSelected(list[0])
      })
      .finally(() => setLoading(false))
  }, [date])

  const handleSelectAppt = (appt) => {
    setSelected(appt)
    setVitals({})
    setSaved(false)
  }

  const handleChange = (key, val) => setVitals(v => ({ ...v, [key]: val === '' ? undefined : parseFloat(val) || val }))

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await api.post('/appointments/vitals', {
        patient_id: selected.patient_id,
        appointment_id: selected.id,
        ...vitals,
      })
      // Advance status to in_progress if still pending/confirmed
      if (['pending', 'confirmed'].includes(selected.status)) {
        await appointmentsApi.update(selected.id, { status: 'in_progress' })
        setQueue(q => q.map(a => a.id === selected.id ? { ...a, status: 'in_progress' } : a))
        setSelected(s => ({ ...s, status: 'in_progress' }))
      }
      setSaved(true)
    } catch (err) {
      alert(err.message || 'Failed to save vitals')
    } finally {
      setSaving(false)
    }
  }

  const bp = bpCategory(vitals.blood_pressure_systolic, vitals.blood_pressure_diastolic)
  const spo2 = spo2Status(vitals.oxygen_saturation)

  const STATUS_COLORS = {
    pending: 'badge-yellow', confirmed: 'badge-blue',
    in_progress: 'badge-purple', completed: 'badge-green',
  }

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* Left: patient queue */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3">
        <div className="card p-3">
          <input type="date" className="input text-sm" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="card overflow-hidden flex-1 flex flex-col">
          <div className="px-4 py-2.5 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Today's Queue
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>
            ) : queue.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">No patients for this date</div>
            ) : queue.map(a => (
              <button key={a.id}
                onClick={() => handleSelectAppt(a)}
                className={`w-full text-left px-4 py-3 transition-colors hover:bg-blue-50 ${selected?.id === a.id ? 'bg-blue-50 border-l-2 border-blue-600' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-gray-900 truncate">{a.patient_name || '—'}</span>
                  <span className={`${STATUS_COLORS[a.status] || 'badge-gray'} flex-shrink-0 text-xs`}>{a.status?.replace('_',' ')}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400 font-mono">{a.appointment_time}</span>
                  <span className="text-xs text-gray-400">· {a.doctor_name || 'Unassigned'}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: vitals form */}
      <div className="flex-1 min-w-0">
        {!selected ? (
          <div className="card p-12 text-center text-gray-400">
            <Activity size={36} className="mx-auto mb-2 opacity-30" />
            <p>Select a patient from the queue to record vitals</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Patient header */}
            <div className="card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User size={22} className="text-blue-700" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg text-gray-900">{selected.patient_name}</div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mt-0.5">
                  <span className="flex items-center gap-1"><Clock size={13} /> {selected.appointment_time}</span>
                  {selected.doctor_name && <span>Dr. {selected.doctor_name}</span>}
                  {selected.reason && <span className="italic">"{selected.reason}"</span>}
                </div>
              </div>
              <span className={STATUS_COLORS[selected.status] || 'badge-gray'}>{selected.status?.replace('_',' ')}</span>
            </div>

            {/* Vitals grid */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={17} style={{ color: '#CC1414' }} />
                <h2 className="font-bold text-gray-900">Vitals</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {VITALS_FIELDS.map(f => (
                  <div key={f.key}>
                    <label className="label text-xs">{f.label}</label>
                    <div className="relative">
                      <input
                        type={f.type}
                        min={f.min}
                        max={f.max}
                        step={f.step || '1'}
                        placeholder="—"
                        value={vitals[f.key] ?? ''}
                        onChange={e => handleChange(f.key, e.target.value)}
                        className="input pr-12 text-sm"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">{f.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Live indicators */}
              {(bp || spo2) && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {bp && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ background: bp.color }}>
                      BP: {bp.label}
                    </span>
                  )}
                  {spo2 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ background: spo2.color }}>
                      SpO₂: {spo2.label}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {saved ? (
                <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                  <CheckCircle size={18} /> Vitals saved — patient marked In Progress
                </div>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving || Object.keys(vitals).length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: '#CC1414' }}
                >
                  <Save size={15} /> {saving ? 'Saving…' : 'Save Vitals'}
                </button>
              )}
              <button onClick={() => navigate('/appointments')} className="text-sm text-gray-500 hover:underline flex items-center gap-1">
                <ChevronLeft size={14} /> Back to Appointments
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
