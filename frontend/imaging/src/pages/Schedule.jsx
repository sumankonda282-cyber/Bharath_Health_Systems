import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { Calendar, Plus, Loader2, AlertCircle, X, Clock } from 'lucide-react'

const MODALITIES = ['CR','DX','CT','MR','MRI','US','NM','PT','MG','RF','XA','OT']
const MODALITY_LABELS = {
  CR:'X-Ray', DX:'X-Ray (Digital)', CT:'CT Scan', MR:'MRI', MRI:'MRI',
  US:'Ultrasound', NM:'Nuclear Medicine', PT:'PET Scan', MG:'Mammography',
  RF:'Fluoroscopy', XA:'Angiography', OT:'Other',
}

function todayStr() { return new Date().toISOString().slice(0,10) }

function timeSlots() {
  const slots = []
  for (let h = 8; h <= 18; h++) {
    slots.push(`${String(h).padStart(2,'0')}:00`)
    if (h < 18) slots.push(`${String(h).padStart(2,'0')}:30`)
  }
  return slots
}

function BookModal({ slot, onClose, onBooked }) {
  const [form, setForm] = useState({
    patient_name: '', patient_mobile: '', modality: slot?.modality || 'CT',
    study_description: '', referring_doctor: '', priority: 'routine', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function book() {
    if (!form.patient_name.trim()) { setError('Patient name required'); return }
    setSaving(true); setError('')
    try {
      await api.post('/imaging/schedule/book', {
        slot_id: slot.id,
        ...form,
      })
      onBooked()
    } catch(e) {
      setError(e.response?.data?.detail || e.message)
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box max-w-lg w-full">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Book Appointment</h2>
            <p className="text-xs text-gray-500 mt-0.5">{slot?.date} at {slot?.time} — {MODALITY_LABELS[slot?.modality] || slot?.modality}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={18}/></button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Patient Name *</label>
              <input className="input" value={form.patient_name} onChange={set('patient_name')} placeholder="Full name"/>
            </div>
            <div>
              <label className="label">Mobile</label>
              <input className="input" value={form.patient_mobile} onChange={set('patient_mobile')} placeholder="+91"/>
            </div>
          </div>
          <div>
            <label className="label">Study Description</label>
            <input className="input" value={form.study_description} onChange={set('study_description')} placeholder="e.g. Chest CT with contrast"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Referring Doctor</label>
              <input className="input" value={form.referring_doctor} onChange={set('referring_doctor')} placeholder="Dr. Name"/>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={set('priority')}>
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="stat">STAT</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none h-16" value={form.notes} onChange={set('notes')} placeholder="Preparation instructions, allergies..."/>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={book} disabled={saving} className="btn-primary gap-2">
            {saving ? <Loader2 size={15} className="animate-spin"/> : <Calendar size={15}/>}
            {saving ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddSlotModal({ date, onClose, onAdded }) {
  const [form, setForm] = useState({ time: '09:00', modality: 'CT', capacity: 1 })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function save() {
    setSaving(true); setError('')
    try {
      await api.post('/imaging/schedule/slots', { date, ...form, capacity: parseInt(form.capacity) })
      onAdded()
    } catch(e) {
      setError(e.response?.data?.detail || e.message)
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box max-w-sm w-full">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Add Time Slot</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={18}/></button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="label">Time</label>
            <select className="input" value={form.time} onChange={set('time')}>
              {timeSlots().map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Modality</label>
            <select className="input" value={form.modality} onChange={set('modality')}>
              {MODALITIES.map(m => <option key={m} value={m}>{MODALITY_LABELS[m] || m} ({m})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Capacity (bookings)</label>
            <input className="input" type="number" min="1" max="20" value={form.capacity} onChange={set('capacity')}/>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary gap-2">
            {saving ? <Loader2 size={15} className="animate-spin"/> : <Plus size={15}/>}
            Add Slot
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Schedule() {
  const [date, setDate] = useState(todayStr())
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')
  const [modal, setModal]   = useState(null) // 'add-slot' | { slot obj for booking }

  const load = useCallback(() => {
    setLoading(true); setError('')
    api.get('/imaging/schedule/slots', { params: { date } }).then(r => {
      setSlots(Array.isArray(r) ? r : [])
      setLoading(false)
    }).catch(e => { setError(e.message); setLoading(false) })
  }, [date])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Imaging Schedule</h1>
        <div className="flex gap-3 items-center">
          <input type="date" className="input-sm" value={date} onChange={e => setDate(e.target.value)}/>
          <button onClick={() => setModal('add-slot')} className="btn-primary gap-2">
            <Plus size={15}/>Add Slot
          </button>
        </div>
      </div>

      {error && <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex gap-2"><AlertCircle size={15}/>{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-gray-400"/></div>
      ) : slots.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Calendar size={48} className="mx-auto mb-3 opacity-30"/>
          <p>No slots for {date}. Add slots to begin scheduling.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {slots.map(slot => {
            const booked = slot.bookings?.length || 0
            const available = (slot.capacity || 1) - booked
            const full = available <= 0
            return (
              <div key={slot.id} className="card flex items-center gap-4">
                <div className="w-16 text-center">
                  <div className="text-lg font-bold" style={{ color: '#0F2557' }}>{slot.time}</div>
                  <div className="text-xs text-gray-500">{slot.date}</div>
                </div>
                <div className="w-px h-10 bg-gray-200"/>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-white text-xs font-bold" style={{ background: '#0F2557' }}>{slot.modality}</span>
                    <span className="text-sm font-medium text-gray-700">{MODALITY_LABELS[slot.modality] || slot.modality}</span>
                  </div>
                  {slot.bookings?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {slot.bookings.map((b, i) => (
                        <div key={i} className="text-xs text-gray-600 flex gap-3">
                          <span className="font-medium">{b.patient_name}</span>
                          {b.patient_mobile && <span className="text-gray-400">{b.patient_mobile}</span>}
                          {b.referring_doctor && <span className="text-gray-400">Ref: {b.referring_doctor}</span>}
                          <span className={`font-semibold ${b.priority === 'urgent' || b.priority === 'stat' ? 'text-red-600' : 'text-gray-400'}`}>{b.priority}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm">
                    <span className={full ? 'text-red-600 font-bold' : 'text-green-700 font-bold'}>{available}</span>
                    <span className="text-gray-400"> / {slot.capacity} slots</span>
                  </div>
                  {!full && (
                    <button onClick={() => setModal(slot)} className="mt-1 btn-secondary text-xs py-1 px-2 gap-1">
                      <Clock size={12}/>Book
                    </button>
                  )}
                  {full && <span className="mt-1 text-xs text-red-500 font-semibold">Full</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal === 'add-slot' && (
        <AddSlotModal date={date} onClose={() => setModal(null)} onAdded={() => { setModal(null); load() }}/>
      )}
      {modal && modal.id && (
        <BookModal slot={modal} onClose={() => setModal(null)} onBooked={() => { setModal(null); load() }}/>
      )}
    </div>
  )
}
