import { useState } from 'react'
import { X, AlertTriangle, Loader2 } from 'lucide-react'
import api from '../../api/client'

const fmt12 = (t) => {
  if (!t) return t
  const str = String(t).slice(0, 5)
  const [h, m] = str.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return t
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function CancelAppointmentModal({ appointment, open, onClose, onCancelled }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const confirm = async () => {
    setSaving(true); setError('')
    try {
      await api.put(`/appointments/${appointment.id}`, {
        status: 'cancelled',
        reason: reason || null,
      })
      onCancelled?.(appointment.id)
      onClose()
    } catch (e) {
      setError(e?.response?.data?.detail || 'Cancellation failed')
    }
    setSaving(false)
  }

  if (!open || !appointment) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertTriangle size={16} />
            <h2 className="font-semibold text-gray-800">Cancel Appointment</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-gray-800">{appointment.patient_name}</p>
            <p className="text-xs text-gray-500">
              {appointment.appointment_date} {fmt12(appointment.appointment_time)} · {appointment.doctor_name || 'Unknown doctor'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Reason for cancellation (optional)</label>
            <textarea
              rows={2}
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-300 resize-none"
              placeholder="e.g. patient requested, doctor unavailable…"
            />
          </div>

          {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">
              Keep Appointment
            </button>
            <button onClick={confirm} disabled={saving}
              className="flex-1 px-4 py-2 text-sm rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader2 size={14} className="animate-spin" />} Cancel Appointment
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
