import { useState, useEffect } from 'react'
import { appointmentsApi, patientsApi, clinicApi } from '../../api'
import api from '../../api/client'
import { cachedFetch, TTL } from '../../utils/cache'
import { PageLoader } from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import { Calendar, UserPlus, Globe, CheckCircle, X, Save, PlusCircle, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { useSearchParams } from 'react-router-dom'
import { Link } from 'react-router-dom'

const fmt12 = (t) => {
  if (!t) return t
  const str = String(t).slice(0, 5)
  const [h, m] = str.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return t
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

const STATUS_COLORS = {
  pending: 'badge-yellow', confirmed: 'badge-blue',
  in_progress: 'badge-purple', completed: 'badge-green', cancelled: 'badge-gray',
}

const ALL_STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const SLOT_DURATIONS = [5, 10, 15, 20, 30, 45, 60]
const MAX_PATIENTS_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50]

function defaultDaySchedule() {
  return {
    start_time: '09:00',
    end_time: '17:00',
    slot_duration: 15,
    max_patients: 20,
    blocked: false,
    online_booking: false,
    online_window_start: '09:00',
    online_window_end: '17:00',
    online_slots: 0,
    online_auto_confirm: 0,
    telehealth_slots: 0,
    telehealth_auto_confirm: 0,
    location_id: '',
    breaks: [],
  }
}

// Walk-in capacity = whatever's left after online + telehealth reservations.
function walkInSlots(d) {
  return Math.max(0, (Number(d.max_patients) || 0) - (Number(d.online_slots) || 0) - (Number(d.telehealth_slots) || 0))
}

function calcSlots(d) {
  if (!d.start_time || !d.end_time || !d.slot_duration) return null
  const [sh, sm] = d.start_time.split(':').map(Number)
  const [eh, em] = d.end_time.split(':').map(Number)
  const totalMins = (eh * 60 + em) - (sh * 60 + sm)
  const breakMins = (d.breaks || []).reduce((acc, b) => {
    if (!b.start || !b.end) return acc
    const [bsh, bsm] = b.start.split(':').map(Number)
    const [beh, bem] = b.end.split(':').map(Number)
    return acc + ((beh * 60 + bem) - (bsh * 60 + bsm))
  }, 0)
  const available = totalMins - breakMins
  return available > 0 ? Math.floor(available / d.slot_duration) : 0
}

function ScheduleTab({ doctors }) {
  const [schedule, setSchedule] = useState(() =>
    Object.fromEntries(DAYS.map(d => [d, defaultDaySchedule()]))
  )
  const [blockedSlots, setBlockedSlots] = useState([])
  const [newBlock, setNewBlock] = useState({ date: '', start: '', end: '', reason: '' })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Load saved availability on mount
  useEffect(() => {
    api.get('/scheduler/availability').then(r => {
      if (r.schedule && Object.keys(r.schedule).length > 0) {
        setSchedule(prev => {
          const merged = { ...prev }
          Object.entries(r.schedule).forEach(([day, data]) => {
            merged[day] = { ...defaultDaySchedule(), ...data }
          })
          return merged
        })
      }
      if (Array.isArray(r.blocked_slots)) setBlockedSlots(r.blocked_slots)
    }).catch(() => {})
  }, [])
  const clinics = []
  const seen = new Set()
  doctors.forEach(d => {
    const clinics_list = d.clinics || []
    clinics_list.forEach(c => {
      if (c.id && !seen.has(c.id)) { seen.add(c.id); clinics.push(c) }
    })
    if (d.clinic_id && !seen.has(d.clinic_id)) {
      seen.add(d.clinic_id)
      clinics.push({ id: d.clinic_id, name: d.clinic_name || `Clinic ${d.clinic_id}` })
    }
  })

  const updateDay = (day, field, val) =>
    setSchedule(s => ({ ...s, [day]: { ...s[day], [field]: val } }))

  const addBreak = (day) =>
    setSchedule(s => ({
      ...s,
      [day]: { ...s[day], breaks: [...s[day].breaks, { start: '13:00', end: '14:00' }] }
    }))

  const updateBreak = (day, idx, field, val) =>
    setSchedule(s => {
      const breaks = s[day].breaks.map((b, i) => i === idx ? { ...b, [field]: val } : b)
      return { ...s, [day]: { ...s[day], breaks } }
    })

  const removeBreak = (day, idx) =>
    setSchedule(s => {
      const breaks = s[day].breaks.filter((_, i) => i !== idx)
      return { ...s, [day]: { ...s[day], breaks } }
    })

  const addBlockedSlot = () => {
    if (!newBlock.date || !newBlock.start || !newBlock.end) return
    setBlockedSlots(b => [...b, { ...newBlock, id: Date.now() }])
    setNewBlock({ date: '', start: '', end: '', reason: '' })
  }

  const removeBlockedSlot = (id) => setBlockedSlots(b => b.filter(s => s.id !== id))

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg('')
    try {
      // Persist the derived walk-in capacity alongside each day so the public
      // booking flow and reports can read it directly.
      const scheduleOut = Object.fromEntries(
        Object.entries(schedule).map(([day, d]) => [day, { ...d, walk_in_slots: walkInSlots(d) }])
      )
      await api.put('/scheduler/availability', { schedule: scheduleOut, blocked_slots: blockedSlots })
      setSaveMsg('Schedule saved successfully.')
    } catch (e) {
      setSaveMsg('Failed to save: ' + (e.message || 'Unknown error'))
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(''), 4000)
    }
  }

  const quickSetup = (days, start, end, slots, maxP) => {
    setSchedule(s => {
      const updated = { ...s }
      DAYS.forEach(day => {
        const isWeekend = day === 'Saturday' || day === 'Sunday'
        if (days === 'all' || (days === 'weekdays' && !isWeekend) || (days === 'all7' )) {
          updated[day] = { ...updated[day], start_time: start, end_time: end, slot_duration: slots, max_patients: maxP, blocked: isWeekend && days === 'weekdays' }
        }
      })
      return updated
    })
  }

  const copyMonToAll = () => {
    const mon = schedule['Monday']
    setSchedule(s => Object.fromEntries(DAYS.map(d => [d, { ...mon }])))
  }

  return (
    <div className="space-y-6">
      {/* Quick setup strip */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Setup</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => quickSetup('weekdays', '09:00', '17:00', 15, 20)}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors">
            Mon–Fri · 9am–5pm · 15 min slots
          </button>
          <button onClick={() => quickSetup('weekdays', '08:00', '20:00', 10, 30)}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors">
            Mon–Fri · 8am–8pm · 10 min slots
          </button>
          <button onClick={() => quickSetup('all7', '09:00', '18:00', 15, 25)}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors">
            All 7 days · 9am–6pm · 15 min slots
          </button>
          <button onClick={copyMonToAll}
            className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">
            Copy Monday → All days
          </button>
        </div>
      </div>

      {/* Weekly grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {DAYS.map(day => {
          const d = schedule[day]
          return (
            <div key={day} className={`card p-4 space-y-3 ${d.blocked ? 'opacity-50 bg-gray-50' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">{day}</span>
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                  <input type="checkbox" checked={d.blocked} onChange={e => updateDay(day, 'blocked', e.target.checked)} className="w-3.5 h-3.5" />
                  Block day
                </label>
              </div>

              {d.blocked ? (
                <div className="text-xs text-gray-400 italic text-center py-2">Day blocked — no appointments</div>
              ) : (
                <>
                  {/* Hours */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="label text-xs">Start time</label>
                      <input type="time" className="input py-1 text-sm" value={d.start_time}
                        onChange={e => updateDay(day, 'start_time', e.target.value)} />
                    </div>
                    <div className="flex-1">
                      <label className="label text-xs">End time</label>
                      <input type="time" className="input py-1 text-sm" value={d.end_time}
                        onChange={e => updateDay(day, 'end_time', e.target.value)} />
                    </div>
                  </div>

                  {/* Slot duration + max patients */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="label text-xs">Slot duration</label>
                      <select className="input py-1 text-sm" value={d.slot_duration}
                        onChange={e => updateDay(day, 'slot_duration', Number(e.target.value))}>
                        {SLOT_DURATIONS.map(m => <option key={m} value={m}>{m} min</option>)}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="label text-xs">Max patients</label>
                      <select className="input py-1 text-sm" value={d.max_patients || 20}
                        onChange={e => updateDay(day, 'max_patients', Number(e.target.value))}>
                        {MAX_PATIENTS_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Slot count preview */}
                  {(() => {
                    const slots = calcSlots(d)
                    if (slots === null) return null
                    const capped = Math.min(slots, d.max_patients || 20)
                    return (
                      <div className="text-xs bg-blue-50 text-blue-700 rounded-lg px-3 py-1.5 font-medium">
                        {capped} slots/day · {slots} possible from schedule{slots > (d.max_patients || 20) ? ` (capped at ${d.max_patients || 20})` : ''}
                      </div>
                    )
                  })()}

                  {/* Slot allocation: online / telehealth / walk-in */}
                  <div className="border-t border-gray-100 pt-2.5 space-y-2">
                    <p className="text-xs font-semibold text-gray-500">Slot allocation</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="label text-xs">🌐 Online slots</label>
                        <input type="number" min="0" className="input py-1 text-sm" value={d.online_slots}
                          onChange={e => updateDay(day, 'online_slots', Math.max(0, Number(e.target.value)))} />
                      </div>
                      <div>
                        <label className="label text-xs">…auto-confirm first</label>
                        <input type="number" min="0" className="input py-1 text-sm" value={d.online_auto_confirm}
                          onChange={e => updateDay(day, 'online_auto_confirm', Math.max(0, Number(e.target.value)))} />
                      </div>
                      <div>
                        <label className="label text-xs">📹 Telehealth slots</label>
                        <input type="number" min="0" className="input py-1 text-sm" value={d.telehealth_slots}
                          onChange={e => updateDay(day, 'telehealth_slots', Math.max(0, Number(e.target.value)))} />
                      </div>
                      <div>
                        <label className="label text-xs">…auto-confirm first</label>
                        <input type="number" min="0" className="input py-1 text-sm" value={d.telehealth_auto_confirm}
                          onChange={e => updateDay(day, 'telehealth_auto_confirm', Math.max(0, Number(e.target.value)))} />
                      </div>
                    </div>
                    <div className="text-xs rounded-lg px-3 py-1.5 bg-gray-50 text-gray-600 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>🌐 {Number(d.online_slots) || 0} online</span>
                      <span>📹 {Number(d.telehealth_slots) || 0} telehealth</span>
                      <span>🚶 {walkInSlots(d)} walk-in</span>
                      <span className="text-gray-400">of {d.max_patients || 0} total</span>
                    </div>
                    {(Number(d.online_slots) + Number(d.telehealth_slots)) > (Number(d.max_patients) || 0) && (
                      <p className="text-xs text-red-500">Online + telehealth exceed max patients — increase max patients.</p>
                    )}
                  </div>

                  {/* Breaks */}
                  {d.breaks.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-gray-500">Breaks</p>
                      {d.breaks.map((b, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <input type="time" className="input py-1 text-xs flex-1" value={b.start}
                            onChange={e => updateBreak(day, i, 'start', e.target.value)} />
                          <span className="text-xs text-gray-400">–</span>
                          <input type="time" className="input py-1 text-xs flex-1" value={b.end}
                            onChange={e => updateBreak(day, i, 'end', e.target.value)} />
                          <button onClick={() => removeBreak(day, i)} className="text-red-400 hover:text-red-600">
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => addBreak(day)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    <PlusCircle size={12} /> Add lunch / break
                  </button>

                  {/* Location */}
                  {clinics.length > 1 && (
                    <div>
                      <label className="label text-xs">Location</label>
                      <select className="input py-1 text-sm" value={d.location_id}
                        onChange={e => updateDay(day, 'location_id', e.target.value)}>
                        <option value="">All locations</option>
                        {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Online booking */}
                  <div className="border-t border-gray-100 pt-2.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={d.online_booking}
                        onChange={e => updateDay(day, 'online_booking', e.target.checked)} className="w-3.5 h-3.5 accent-blue-600" />
                      <span className="text-xs text-gray-600 font-medium">🌐 Enable online booking</span>
                    </label>
                    {d.online_booking && (
                      <div className="mt-1.5">
                        <p className="text-xs text-gray-400 mb-1">Online booking window</p>
                        <div className="flex items-center gap-2">
                          <input type="time" className="input py-1 text-xs flex-1" value={d.online_window_start}
                            onChange={e => updateDay(day, 'online_window_start', e.target.value)} />
                          <span className="text-xs text-gray-400">–</span>
                          <input type="time" className="input py-1 text-xs flex-1" value={d.online_window_end}
                            onChange={e => updateDay(day, 'online_window_end', e.target.value)} />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Blocked Slots */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Blocked Slots</h3>
        <div className="space-y-2 mb-4">
          {blockedSlots.length === 0 && (
            <p className="text-xs text-gray-400">No blocked slots added yet.</p>
          )}
          {blockedSlots.map(b => (
            <div key={b.id} className="flex items-center gap-3 py-2 px-3 bg-red-50 rounded-lg border border-red-100 text-sm">
              <span className="font-medium text-gray-700">{b.date}</span>
              <span className="text-gray-500">{b.start} – {b.end}</span>
              {b.reason && <span className="text-gray-400 italic flex-1">{b.reason}</span>}
              <button onClick={() => removeBlockedSlot(b.id)} className="text-red-400 hover:text-red-600 ml-auto">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-4">
          <div>
            <label className="label text-xs">Date</label>
            <input type="date" className="input py-1 text-sm" value={newBlock.date}
              onChange={e => setNewBlock(b => ({ ...b, date: e.target.value }))} />
          </div>
          <div>
            <label className="label text-xs">From</label>
            <input type="time" className="input py-1 text-sm" value={newBlock.start}
              onChange={e => setNewBlock(b => ({ ...b, start: e.target.value }))} />
          </div>
          <div>
            <label className="label text-xs">To</label>
            <input type="time" className="input py-1 text-sm" value={newBlock.end}
              onChange={e => setNewBlock(b => ({ ...b, end: e.target.value }))} />
          </div>
          <div className="flex-1 min-w-32">
            <label className="label text-xs">Reason (optional)</label>
            <input className="input py-1 text-sm" placeholder="e.g. Leave, Procedure…"
              value={newBlock.reason} onChange={e => setNewBlock(b => ({ ...b, reason: e.target.value }))} />
          </div>
          <button onClick={addBlockedSlot}
            className="flex items-center gap-1 btn-primary py-1.5 text-sm flex-shrink-0">
            <PlusCircle size={14} /> Add Block
          </button>
        </div>
      </div>

      {/* Save bar */}
      <div className="flex items-center gap-4">
        <button onClick={handleSave} disabled={saving}
          className="btn-primary flex items-center gap-2 py-2 disabled:opacity-60">
          <Save size={15} /> {saving ? 'Saving…' : 'Save Schedule'}
        </button>
        {saveMsg && <span className="text-sm text-gray-600">{saveMsg}</span>}
      </div>
    </div>
  )
}

export default function Appointments() {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState('queue') // 'queue' | 'schedule'
  const [date, setDate] = useState(searchParams.get('date') || format(new Date(), 'yyyy-MM-dd'))
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [appointments, setAppointments] = useState([])
  const [onlineBookings, setOnlineBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showWalkin, setShowWalkin] = useState(searchParams.get('walkin') === '1')
  const [doctors, setDoctors] = useState([])
  const [patients, setPatients] = useState([])
  const [patientSearch, setPatientSearch] = useState('')
  const [walkin, setWalkin] = useState({
    patient_id: '', doctor_id: '', appointment_time: '', reason: '', mode: 'offline'
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [actioningId, setActioningId] = useState(null)
  const [confirmError, setConfirmError] = useState('')
  const [confirmMsg, setConfirmMsg] = useState('')

  const loadAppts = () => {
    setLoading(true)
    Promise.allSettled([
      appointmentsApi.list({ appointment_date: date, limit: 100 }),
      appointmentsApi.listOnlineBookings({ status: 'pending' }),
    ]).then(([apptResult, bookingResult]) => {
      if (apptResult.status === 'fulfilled') {
        setAppointments(Array.isArray(apptResult.value) ? apptResult.value : [])
      }
      if (bookingResult.status === 'fulfilled') {
        setOnlineBookings(Array.isArray(bookingResult.value) ? bookingResult.value : [])
      }
    }).finally(() => setLoading(false))
  }

  useEffect(() => { loadAppts() }, [date])

  useEffect(() => {
    cachedFetch('doctors_list', () => clinicApi.getDoctors(), r => setDoctors(Array.isArray(r) ? r : []), TTL.MEDIUM)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!patientSearch || patientSearch.length < 2) return
    const t = setTimeout(() => {
      patientsApi.list({ search: patientSearch, limit: 10 })
        .then(r => setPatients(Array.isArray(r) ? r : []))
    }, 300)
    return () => clearTimeout(t)
  }, [patientSearch])

  const handleStatusChange = async (id, status) => {
    await appointmentsApi.update(id, { status })
    loadAppts()
  }

  const handleWalkin = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await appointmentsApi.create({ ...walkin, appointment_date: date })
      setShowWalkin(false)
      setWalkin({ patient_id: '', doctor_id: '', appointment_time: '', reason: '', mode: 'offline' })
      loadAppts()
    } catch (err) {
      setError(err.message || 'Failed to create appointment')
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmBooking = async (booking) => {
    setActioningId(booking.id)
    setConfirmError('')
    setConfirmMsg('')
    try {
      const res = await appointmentsApi.confirmBooking(booking.id)
      const tok = res?.token != null ? `token #${res.token}` : 'appointment created'
      setConfirmMsg(`Booking confirmed — ${tok}${booking.booking_date ? ` for ${booking.booking_date}` : ''}.`)
      // Jump the queue to the booking's date so the new appointment is visible.
      if (booking.booking_date && booking.booking_date !== date) {
        setDate(booking.booking_date)  // triggers reload via the date effect
      } else {
        loadAppts()
      }
      setTimeout(() => setConfirmMsg(''), 6000)
    } catch (err) {
      setConfirmError(err.message || 'Failed to confirm booking')
    } finally { setActioningId(null) }
  }

  const handleCancelBooking = async (id) => {
    setActioningId(id)
    try {
      await appointmentsApi.cancelBooking(id)
      loadAppts()
    } catch { /* silent */ } finally { setActioningId(null) }
  }

  // Action label logic
  const getActionLabel = (a) => {
    if (a.status === 'pending') return { confirm: true, decline: true }
    if (a.status === 'confirmed') return { start: true }
    return null
  }

  return (
    <div>
      {/* Tab + filter bar */}
      <div className="card p-3 mb-4">
        {/* Tab row */}
        <div className="flex items-center gap-1 mb-3 pb-3 border-b border-gray-100">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'queue' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            style={activeTab === 'queue' ? { background: '#0F2557' } : {}}
          >
            📋 Queue
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'schedule' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            style={activeTab === 'schedule' ? { background: '#0F2557' } : {}}
          >
            🗓 Schedule
          </button>
        </div>

        {activeTab === 'queue' && (
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setShowWalkin(true)} className="btn-primary py-1.5 text-sm flex-shrink-0">
              <UserPlus size={15} />Walk-in
            </button>
            <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-gray-400 flex-shrink-0" />
              <input type="date" className="input w-40 py-1.5 text-sm" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="flex gap-1 flex-wrap">
              <button onClick={() => setStatusFilter('')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${!statusFilter ? 'text-white border-transparent' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                style={!statusFilter ? { background: '#0F2557' } : {}}>All</button>
              {ALL_STATUSES.map(s => (
                <button key={s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors capitalize ${statusFilter === s ? 'text-white border-transparent' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  style={statusFilter === s ? { background: '#CC1414' } : {}}
                >{s.replace('_', ' ')}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-auto text-xs text-gray-400">
              {appointments.length} total
              {onlineBookings.length > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                  <Globe size={11} /> {onlineBookings.length} pending online
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {activeTab === 'schedule' ? (
        <ScheduleTab doctors={doctors} />
      ) : (
        <>
          {confirmError && (
            <div className="mb-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between">
              <span>⚠ Confirm failed: {confirmError}</span>
              <button onClick={() => setConfirmError('')} className="text-red-400 hover:text-red-600 ml-3">✕</button>
            </div>
          )}
          {confirmMsg && (
            <div className="mb-3 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><CheckCircle size={14} /> {confirmMsg}</span>
              <button onClick={() => setConfirmMsg('')} className="text-green-500 hover:text-green-700 ml-3">✕</button>
            </div>
          )}

          {/* Online Bookings — pending confirmation */}
          {!loading && onlineBookings.length > 0 && (
            <div className="card mb-4 overflow-hidden">
              <div className="px-5 py-3 border-b border-amber-100 flex items-center gap-2"
                style={{ background: '#fffbeb' }}>
                <Globe size={15} className="text-amber-600" />
                <span className="text-sm font-semibold text-amber-700">
                  Online Bookings — Awaiting Confirmation ({onlineBookings.length})
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {onlineBookings.map(b => (
                  <div key={b.id} className="flex items-center justify-between px-5 py-3 hover:bg-amber-50/40">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 font-bold text-amber-700 text-sm">
                        {(b.patient_name || 'P').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm text-gray-900">{b.patient_name || '—'}</div>
                        <div className="text-xs text-gray-400">
                          {b.booking_date && <span className="font-medium text-gray-600 mr-1">{b.booking_date}</span>}
                          {fmt12(b.booking_time)} · {b.doctor_name || 'Doctor not assigned'}
                          {b.patient_mobile && ` · ${b.patient_mobile}`}
                        </div>
                        {b.reason && <div className="text-xs text-gray-400 italic">{b.reason}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400 font-mono">{b.confirmation_code}</span>
                      <button
                        onClick={() => handleConfirmBooking(b)}
                        disabled={actioningId === b.id}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 font-semibold hover:bg-green-200 disabled:opacity-50 transition-colors"
                      >
                        <CheckCircle size={12} /> Confirm
                      </button>
                      <button
                        onClick={() => handleCancelBooking(b.id)}
                        disabled={actioningId === b.id}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 font-semibold hover:bg-red-100 disabled:opacity-50 transition-colors"
                      >
                        <X size={12} /> Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Queue table */}
          <div className="card">
            {loading ? <PageLoader /> : (() => {
              const visible = statusFilter ? appointments.filter(a => a.status === statusFilter) : appointments
              if (visible.length === 0) return (
                <div className="p-10 text-center text-gray-400">
                  <Calendar size={36} className="mx-auto mb-2 opacity-30" />
                  <p>{statusFilter ? `No ${statusFilter.replace('_',' ')} appointments` : 'No appointments for this date'}</p>
                </div>
              )
              return (
                <div className="table-wrapper rounded-xl border-0">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="th">#</th>
                        <th className="th">Patient</th>
                        <th className="th">Date &amp; Time</th>
                        <th className="th">Location</th>
                        <th className="th">Visit Type</th>
                        <th className="th">Status</th>
                        <th className="th">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {visible.map(a => {
                        const actions = getActionLabel(a)
                        const ageGender = [
                          a.age ? `${a.age}${a.gender ? a.gender.charAt(0).toUpperCase() : ''}` : null
                        ].filter(Boolean).join('')
                        return (
                          <tr key={a.id} className="tr-hover">
                            <td className="td font-bold text-blue-600">#{a.token_number || a.id}</td>
                            <td className="td">
                              <div className="font-medium text-gray-900">{a.patient_name || '—'}</div>
                              {ageGender && <div className="text-xs text-gray-400">{ageGender}</div>}
                            </td>
                            <td className="td font-mono text-sm text-gray-700">
                              <div>{date}</div>
                              <div className="text-xs text-gray-400">{fmt12(a.appointment_time)}</div>
                            </td>
                            <td className="td text-sm text-gray-600">
                              {a.clinic_name || '—'}
                            </td>
                            <td className="td">
                              <span className={`badge ${a.mode === 'telehealth' ? 'badge-purple' : a.mode === 'online' ? 'badge-blue' : 'badge-gray'} capitalize`}>
                                {a.mode || 'offline'}
                              </span>
                            </td>
                            <td className="td">
                              <span className={`badge ${STATUS_COLORS[a.status] || 'badge-gray'} capitalize`}>
                                {(a.status || '').replace('_', ' ')}
                              </span>
                            </td>
                            <td className="td">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {actions?.confirm && (
                                  <button
                                    onClick={() => handleStatusChange(a.id, 'confirmed')}
                                    className="text-xs px-2.5 py-1 rounded-lg bg-green-100 text-green-700 font-semibold hover:bg-green-200 transition-colors"
                                  >Confirm</button>
                                )}
                                {actions?.decline && (
                                  <button
                                    onClick={() => handleStatusChange(a.id, 'cancelled')}
                                    className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-600 font-semibold hover:bg-red-100 transition-colors"
                                  >Decline</button>
                                )}
                                {actions?.start && (
                                  <Link to={`/encounter/${a.id}`}
                                    className="text-xs px-2.5 py-1 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
                                    style={{ background: '#0F2557' }}>
                                    Start
                                  </Link>
                                )}
                                <Link to={`/encounter/${a.id}`} className="text-xs text-purple-600 hover:underline">
                                  Desk →
                                </Link>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </div>
        </>
      )}

      {/* Walk-in Modal */}
      <Modal open={showWalkin} onClose={() => setShowWalkin(false)} title="Add Walk-in Appointment">
        <form onSubmit={handleWalkin} className="space-y-4">
          <div>
            <label className="label">Search Patient</label>
            <input
              className="input"
              placeholder="Type name or mobile…"
              value={patientSearch}
              onChange={e => setPatientSearch(e.target.value)}
            />
            {patients.length > 0 && (
              <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden">
                {patients.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setWalkin(w => ({ ...w, patient_id: p.id }))
                      setPatientSearch(`${p.full_name} (${p.mobile || p.id})`)
                      setPatients([])
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0"
                  >
                    <div className="font-medium">{p.full_name}</div>
                    <div className="text-xs text-gray-400">{p.mobile} · {p.uhid || `#${p.id}`}</div>
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Patient not found?{' '}
              <Link to="/patients/new" className="text-blue-600 hover:underline">Register new patient</Link>
            </p>
          </div>

          <div>
            <label className="label">Doctor *</label>
            <select className="input" value={walkin.doctor_id} onChange={e => setWalkin(w => ({ ...w, doctor_id: e.target.value }))} required>
              <option value="">Select doctor</option>
              {doctors.map(d => (
                <option key={d.profile_id || d.id} value={d.profile_id || d.id}>{d.full_name} — {d.specialty}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Time *</label>
              <input type="time" className="input" value={walkin.appointment_time} onChange={e => setWalkin(w => ({ ...w, appointment_time: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Mode</label>
              <select className="input" value={walkin.mode} onChange={e => setWalkin(w => ({ ...w, mode: e.target.value }))}>
                <option value="offline">Walk-in (Offline)</option>
                <option value="online">Online</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Reason / Chief Complaint</label>
            <input className="input" placeholder="Fever, follow-up, checkup…" value={walkin.reason} onChange={e => setWalkin(w => ({ ...w, reason: e.target.value }))} />
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          <button type="submit" disabled={saving || !walkin.patient_id || !walkin.doctor_id} className="btn-primary w-full justify-center">
            {saving ? 'Creating…' : 'Add to Queue'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
