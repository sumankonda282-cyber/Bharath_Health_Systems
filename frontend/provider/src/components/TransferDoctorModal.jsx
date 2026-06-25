import { useState, useEffect } from 'react'
import { Loader2, UserCheck, Search, X } from 'lucide-react'
import api from '../api/client'

const NAVY = '#0F2557'

// Reassign a telehealth visit to another doctor in the same clinic. Multi-tenant
// safe: the doctor list comes from /staff (clinic-scoped server-side) and the
// transfer endpoint re-checks the target belongs to the caller's clinic.
export default function TransferDoctorModal({ appointmentId, currentDoctorId, patientName, onTransferred, onCancel }) {
  const [doctors, setDoctors]   = useState([])
  const [query, setQuery]       = useState('')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')

  useEffect(() => {
    api.get('/clinic/doctors')
      .then(r => setDoctors(Array.isArray(r) ? r : (r?.items || r?.data || [])))
      .catch(() => setErr('Could not load doctors'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = doctors
    .filter(d => d.id !== currentDoctorId)
    .filter(d => !query || (d.full_name || d.email || '').toLowerCase().includes(query.toLowerCase()))

  const submit = async () => {
    if (!selected) return
    setSaving(true); setErr('')
    try {
      const res = await api.post(`/telehealth/appointments/${appointmentId}/transfer`, { to_doctor_id: selected.id })
      onTransferred(res?.to_doctor_name || selected.full_name || selected.email)
    } catch (e) {
      setErr(e?.message || 'Transfer failed')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[1100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold" style={{ color: NAVY }}>Transfer Consultation</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {patientName ? `Hand ${patientName} to another doctor in your clinic.` : 'Hand this patient to another doctor in your clinic.'}
            </p>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search doctor…"
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-gray-400" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">No other doctors found</p>
            ) : filtered.map(d => (
              <button key={d.id} type="button" onClick={() => setSelected(d)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selected?.id === d.id ? 'bg-blue-50 text-blue-800 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}>
                {d.full_name || d.email}
                {d.specialization && <span className="text-xs text-gray-400 ml-2">{d.specialization}</span>}
              </button>
            ))}
          </div>
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onCancel} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button onClick={submit} disabled={!selected || saving}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: NAVY }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
              {saving ? 'Transferring…' : 'Transfer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
