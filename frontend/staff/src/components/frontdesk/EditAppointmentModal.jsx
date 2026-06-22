import { useState, useEffect } from 'react'
import { X, Pencil, Loader2, Footprints, Phone, Globe } from 'lucide-react'
import api from '../../api/client'

const SOURCES = [
  { value: 'offline', label: 'Walk-in', icon: Footprints },
  { value: 'phone',   label: 'Phone',   icon: Phone },
  { value: 'online',  label: 'Online',  icon: Globe },
]

export default function EditAppointmentModal({ appointment, doctors = [], open, onClose, onSaved }) {
  const [form, setForm] = useState({
    doctor_id: '', appointment_date: '', appointment_time: '',
    visit_type: 'fresh', mode: 'offline', fee: '', reason: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (open && appointment) {
      const doc = doctors.find(d =>
        d.full_name === appointment.doctor_name || String(d.id) === String(appointment.doctor_id)
      )
      setForm({
        doctor_id: doc ? String(doc.id) : '',
        appointment_date: appointment.appointment_date || '',
        appointment_time: appointment.appointment_time || '',
        visit_type: appointment.visit_type || 'fresh',
        mode: appointment.mode || 'offline',
        fee: appointment.fee != null ? String(appointment.fee) : '',
        reason: appointment.reason || '',
      })
      setError('')
    }
  }, [open, appointment, doctors])

  const submit = async () => {
    if (!form.appointment_date || !form.appointment_time) { setError('Date and time required'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        visit_type: form.visit_type,
        mode: form.mode,
        fee: form.fee === '' ? null : parseFloat(form.fee),
        reason: form.reason || null,
      }
      if (form.doctor_id) payload.doctor_id = parseInt(form.doctor_id)
      const r = await api.put(`/appointments/${appointment.id}`, payload)
      onSaved?.(r)
      onClose()
    } catch (e) {
      setError(e?.response?.data?.detail || 'Save failed')
    }
    setSaving(false)
  }

  if (!open || !appointment) return null

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300'
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1'

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Pencil size={16} className="text-blue-600" />
            <h2 className="font-semibold text-gray-800">Edit Appointment</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-gray-800">{appointment.patient_name}</p>
            <p className="text-xs text-gray-500">{appointment.bh_id || appointment.patient_id}</p>
          </div>

          <div>
            <label className={labelCls}>How did they come?</label>
            <div className="grid grid-cols-3 gap-2">
              {SOURCES.map(s => {
                const Icon = s.icon
                const on = form.mode === s.value
                return (
                  <button key={s.value} type="button" onClick={() => set('mode', s.value)}
                    className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-sm border transition ${on
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                    <Icon size={14} /> {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Doctor</label>
              <select className={inputCls} value={form.doctor_id} onChange={e => set('doctor_id', e.target.value)}>
                <option value="">— keep current —</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.full_name}{d.specialty ? ` — ${d.specialty}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" className={inputCls} value={form.appointment_date} onChange={e => set('appointment_date', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Time</label>
              <input type="time" className={inputCls} value={form.appointment_time} onChange={e => set('appointment_time', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Visit Type</label>
              <select className={inputCls} value={form.visit_type} onChange={e => set('visit_type', e.target.value)}>
                <option value="fresh">Fresh</option>
                <option value="followup">Follow-up</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Consultation Fee (₹)</label>
              <input type="number" className={inputCls} value={form.fee} onChange={e => set('fee', e.target.value)} placeholder="0" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Reason / Complaint</label>
              <input className={inputCls} value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="Optional" />
            </div>
          </div>

          {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">Cancel</button>
            <button onClick={submit} disabled={saving}
              className="px-5 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />} Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
