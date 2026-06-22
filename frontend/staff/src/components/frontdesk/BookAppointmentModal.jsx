import { useState, useEffect, useRef } from 'react'
import { X, CalendarPlus, Search, Loader2, CheckCircle2, Phone, Footprints, Globe } from 'lucide-react'
import api from '../../api/client'

const fmt12 = (t) => {
  if (!t) return t
  const str = String(t).slice(0, 5)
  const [h, m] = str.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return t
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

const istToday = () => new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10)

const SOURCES = [
  { value: 'offline', label: 'Walk-in', icon: Footprints },
  { value: 'phone',   label: 'Phone',   icon: Phone },
  { value: 'online',  label: 'Online',  icon: Globe },
]

/**
 * Books an appointment for an EXISTING patient: search → confirm identity
 * → doctor/date/time + how they came (walk-in / phone / online).
 * New patients are registered first via Register Patient.
 */
export default function BookAppointmentModal({ open, onClose, doctors = [], onBooked, preselectedPatient = null }) {
  const [patient, setPatient] = useState(null)
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const timer = useRef(null)

  const [form, setForm] = useState({
    doctor_id: '', appointment_date: istToday(), appointment_time: '',
    visit_type: 'fresh', mode: 'offline', fee: '', reason: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (open) {
      setPatient(preselectedPatient || null)
      setQ(''); setResults([]); setDone(null); setError('')
      setForm({ doctor_id: '', appointment_date: istToday(), appointment_time: '', visit_type: 'fresh', mode: 'offline', fee: '', reason: '' })
    }
  }, [open, preselectedPatient])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (q.trim().length < 2) { setResults([]); return }
    timer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const r = await api.get('/patients', { params: { search: q.trim(), limit: 8 } })
        setResults(Array.isArray(r) ? r : [])
      } catch { setResults([]) }
      setSearching(false)
    }, 300)
    return () => timer.current && clearTimeout(timer.current)
  }, [q])

  const pickDoctor = (id) => {
    set('doctor_id', id)
    const d = doctors.find(x => String(x.id) === String(id))
    if (d && !form.fee) set('fee', d.consultation_fee || '')
  }

  const submit = async () => {
    if (!patient) { setError('Select a patient first'); return }
    if (!form.doctor_id) { setError('Select a doctor'); return }
    if (!form.appointment_date || !form.appointment_time) { setError('Pick date and time'); return }
    setSaving(true); setError('')
    try {
      const r = await api.post('/appointments', {
        patient_id: patient.id,
        doctor_id: parseInt(form.doctor_id),
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        visit_type: form.visit_type,
        mode: form.mode,
        fee: form.fee === '' ? null : parseFloat(form.fee),
        reason: form.reason || null,
      })
      setDone(r)
      onBooked?.(r)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Booking failed')
    }
    setSaving(false)
  }

  if (!open) return null

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300'
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1'

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CalendarPlus size={18} className="text-emerald-600" />
            <h2 className="font-semibold text-gray-800">Book Appointment</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        {done ? (
          <div className="p-8 text-center">
            <CheckCircle2 size={44} className="mx-auto text-emerald-500 mb-3" />
            <p className="text-gray-800 font-semibold text-lg">Appointment booked</p>
            <p className="text-sm text-gray-500 mt-1">
              {patient?.full_name} · {done.appointment_date} {fmt12(done.appointment_time)}
            </p>
            {done.token_number != null && (
              <p className="mt-3 text-sm text-gray-600">Token <span className="font-bold text-lg text-blue-700">#{done.token_number}</span></p>
            )}
            <button onClick={onClose} className="mt-6 px-5 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">Done</button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {!patient ? (
              <div>
                <label className={labelCls}>Find Patient (name / BHID / mobile)</label>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  {searching && <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
                  <input autoFocus className={inputCls + ' pl-9'} value={q} onChange={e => setQ(e.target.value)} placeholder="Start typing…" />
                </div>
                <div className="mt-2 divide-y divide-gray-50 max-h-64 overflow-auto rounded-lg border border-gray-100">
                  {results.map(p => (
                    <button key={p.id} onClick={() => setPatient(p)} className="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{p.full_name}</p>
                        <p className="text-xs text-gray-400">{p.bh_id || p.clinic_patient_id} · {p.mobile || 'no mobile'}</p>
                      </div>
                      <span className="text-xs text-gray-400">{p.age != null ? `${p.age}y` : ''} {p.gender || ''}</span>
                    </button>
                  ))}
                  {q.trim().length >= 2 && !searching && results.length === 0 && (
                    <p className="px-3 py-3 text-sm text-gray-400">No patient found — register them first via <b>Register Patient</b>.</p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{patient.full_name}</p>
                    <p className="text-xs text-gray-500">
                      {patient.bh_id || patient.clinic_patient_id} · confirm mobile: <span className="font-mono font-medium text-gray-700">{patient.mobile || '—'}</span>
                    </p>
                  </div>
                  <button onClick={() => setPatient(null)} className="text-xs text-blue-600 hover:underline">Change</button>
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
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'}`}>
                          <Icon size={14} /> {s.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className={labelCls}>Doctor</label>
                    <select className={inputCls} value={form.doctor_id} onChange={e => pickDoctor(e.target.value)}>
                      <option value="">Select doctor…</option>
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
                    <label className={labelCls}>Reason / Complaint (optional)</label>
                    <input className={inputCls} value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="e.g. fever since 2 days" />
                  </div>
                </div>
              </>
            )}

            {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex justify-end gap-3 pt-1">
              <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">Cancel</button>
              <button onClick={submit} disabled={saving || !patient}
                className="px-5 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />} Book Appointment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
