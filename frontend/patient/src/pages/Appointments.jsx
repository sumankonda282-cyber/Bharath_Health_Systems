import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/client'
import { cachedFetch, cacheSet } from '../utils/cache'
import { useAuth } from '../contexts/AuthContext'
import {
  Calendar, Stethoscope, Clock, Video, MapPin, Plus, Search,
  Building2, ChevronRight, ArrowLeft, CheckCircle, Copy, Check, X, Globe
} from 'lucide-react'

const STATUS_BADGE = {
  pending: 'badge-yellow', confirmed: 'badge-blue', completed: 'badge-green',
  cancelled: 'badge-gray', in_progress: 'badge-blue',
}

function TelehealthJoinModal({ appt, onClose }) {
  const [consented, setConsented] = useState(false)
  const handleJoin = () => {
    const url = `https://meet.jit.si/bharatcliniq-appt-${appt.id}`
    window.open(url, '_blank', 'noopener')
    onClose()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#EEF2FF' }}>
            <Video size={20} style={{ color: '#0F2557' }} />
          </div>
          <h2 className="text-lg font-bold" style={{ color: '#0F2557' }}>Join Virtual Consultation</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          You're about to join a secure video consultation with <strong>Dr. {appt.doctor_name}</strong> at <strong>{appt.clinic_name}</strong>.
        </p>
        <ul className="text-sm text-gray-600 space-y-1.5 mb-5 pl-4 list-disc">
          <li>Ensure you're in a private, quiet space</li>
          <li>Allow camera and microphone access when prompted</li>
          <li>The session is secure and not recorded</li>
        </ul>
        <label className="flex items-start gap-3 cursor-pointer mb-6">
          <input type="checkbox" checked={consented} onChange={e => setConsented(e.target.checked)} className="mt-0.5 w-4 h-4 flex-shrink-0" />
          <span className="text-sm text-gray-700">I consent to this telemedicine consultation</span>
        </label>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
          <button onClick={handleJoin} disabled={!consented}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: '#CC1414' }}>
            <Video size={14} /> Join Now
          </button>
        </div>
      </div>
    </div>
  )
}

function ApptCard({ a }) {
  const [showModal, setShowModal] = useState(false)
  const isTelehealth = a.mode === 'telehealth'
  const isOnlineBooking = a.source === 'online_booking'
  const canJoin = isTelehealth && ['confirmed', 'in_progress', 'pending'].includes(a.status)

  return (
    <div className="card p-4 flex items-start gap-4 hover:shadow-lg transition-shadow">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: isTelehealth ? '#0F255710' : '#EEF2FF' }}>
        {isTelehealth ? <Video size={22} style={{ color: '#0F2557' }} /> : <Stethoscope size={22} style={{ color: '#0F2557' }} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-gray-900 text-sm">{a.clinic_name || 'Health Center'}</div>
          <span className={`${STATUS_BADGE[a.status] || 'badge-gray'} flex-shrink-0`}>{a.status?.replace('_',' ')}</span>
        </div>
        <div className="text-sm text-gray-500 mt-0.5">Dr. {a.doctor_name || 'Doctor'}</div>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          {a.date && <span className="flex items-center gap-1 text-xs text-gray-400"><Calendar size={11} /> {a.date}</span>}
          {a.time && <span className="flex items-center gap-1 text-xs text-gray-400"><Clock size={11} /> {a.time}</span>}
          {a.token_number && (
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full" style={{ background: '#EEF2FF', color: '#0F2557' }}>
              Token #{a.token_number}
            </span>
          )}
          {a.confirmation_code && (
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full" style={{ background: '#FEF3E7', color: '#F5821E' }}>
              {a.confirmation_code}
            </span>
          )}
          {isOnlineBooking && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#0F255710', color: '#0F2557' }}>
              <Globe size={10} /> Booked Online
            </span>
          )}
          {isTelehealth ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: '#0F2557' }}>
              <Video size={10} /> Virtual
            </span>
          ) : !isOnlineBooking ? (
            <span className="text-xs text-gray-400 capitalize">{a.mode?.replace('_',' ') || 'Walk-in'}</span>
          ) : null}
        </div>
        {isOnlineBooking && a.status === 'pending' && (
          <div className="text-xs text-gray-400 mt-1.5">Awaiting confirmation from the health center — you'll see a token number once confirmed.</div>
        )}
        {a.reason && <div className="text-xs text-gray-400 mt-1 italic">"{a.reason}"</div>}
        {a.clinic_address && !isTelehealth && (
          <a
            href={`https://www.openstreetmap.org/search?query=${encodeURIComponent([a.clinic_address, a.clinic_city, 'India'].filter(Boolean).join(', '))}`}
            target="_blank" rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <MapPin size={11} /> Get Directions
          </a>
        )}
        {canJoin && (
          <button
            onClick={() => setShowModal(true)}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#CC1414' }}
          >
            <Video size={14} /> Join Consultation
          </button>
        )}
      </div>
      {showModal && <TelehealthJoinModal appt={a} onClose={() => setShowModal(false)} />}
    </div>
  )
}

// ── In-portal booking modal ──────────────────────────────────────────────────

function DoctorRow({ doctor, onSelect }) {
  return (
    <button
      onClick={() => onSelect(doctor)}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-[#0F2557] hover:bg-[#EEF2FF] transition-all text-left"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-white text-sm"
        style={{ background: '#0F2557' }}>
        {(doctor.name || 'D').charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-gray-900 truncate">Dr. {doctor.name}</div>
        <div className="text-xs text-gray-500 truncate">{doctor.specialty}</div>
        <div className="flex items-center gap-1 text-xs text-gray-400 truncate">
          <Building2 size={10} className="flex-shrink-0" /> {doctor.clinic_name}{doctor.city ? ` · ${doctor.city}` : ''}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        {doctor.fee > 0 && <div className="text-sm font-bold" style={{ color: '#0F2557' }}>₹{doctor.fee}</div>}
        <ChevronRight size={14} className="text-gray-400 ml-auto" />
      </div>
    </button>
  )
}

function BookingModal({ onClose, onBooked, initialSearch = '' }) {
  const { user } = useAuth()
  const [step, setStep] = useState('doctor')   // doctor | slot | confirm | done
  const [search, setSearch] = useState(initialSearch)
  const [doctors, setDoctors] = useState([])
  const [loadingDoctors, setLoadingDoctors] = useState(true)
  const [doctor, setDoctor] = useState(null)

  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slot, setSlot] = useState(null)

  const [patientName, setPatientName] = useState(user?.full_name || '')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [booking, setBooking] = useState(null)
  const [copied, setCopied] = useState(false)

  // Load doctors from the public directory, flattened with health center info
  const loadDoctors = (q = '') => {
    setLoadingDoctors(true)
    api.get('/public/clinics', { params: q ? { q } : {} })
      .then(data => {
        const clinics = Array.isArray(data) ? data : data.clinics || []
        const flat = clinics.flatMap(c =>
          (c.doctors || []).map(d => ({
            ...d,
            clinic_id: c.id,
            clinic_name: c.name,
            city: c.city,
          }))
        )
        setDoctors(flat)
      })
      .catch(() => setDoctors([]))
      .finally(() => setLoadingDoctors(false))
  }

  useEffect(() => { loadDoctors(initialSearch) }, []) // eslint-disable-line

  const filteredDoctors = search.trim()
    ? doctors.filter(d =>
        d.name?.toLowerCase().includes(search.toLowerCase()) ||
        d.specialty?.toLowerCase().includes(search.toLowerCase()) ||
        d.clinic_name?.toLowerCase().includes(search.toLowerCase()) ||
        d.city?.toLowerCase().includes(search.toLowerCase())
      )
    : doctors

  const fetchSlots = (doctorId, d) => {
    setLoadingSlots(true)
    setSlots([])
    setSlot(null)
    api.get(`/public/doctors/${doctorId}/slots`, { params: { booking_date: d } })
      .then(data => setSlots(Array.isArray(data) ? data : data.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }

  const selectDoctor = (d) => {
    setDoctor(d)
    setStep('slot')
    fetchSlots(d.id, date)
  }

  const submit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const result = await api.post('/portal/book', {
        clinic_id: doctor.clinic_id,
        doctor_id: doctor.id,
        booking_date: date,
        booking_time: slot,
        patient_name: patientName.trim() || undefined,
        reason: reason.trim() || undefined,
      })
      setBooking(result)
      setStep('done')
    } catch (err) {
      setError(err.message || 'Could not complete the booking. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(booking?.confirmation_code || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const finish = () => {
    onBooked()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {step !== 'doctor' && step !== 'done' && (
              <button
                onClick={() => setStep(step === 'confirm' ? 'slot' : 'doctor')}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <h2 className="text-lg font-bold" style={{ color: '#0F2557' }}>
              {step === 'doctor' && 'Choose a Doctor'}
              {step === 'slot' && 'Pick Date & Time'}
              {step === 'confirm' && 'Confirm Booking'}
              {step === 'done' && 'Booking Confirmed!'}
            </h2>
          </div>
          {step !== 'done' && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Step: choose doctor */}
        {step === 'doctor' && (
          <div>
            <div className="relative mb-4">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search doctor, specialty, health center..."
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#0F2557' }}
              />
            </div>
            {loadingDoctors ? (
              <div className="py-12 text-center text-gray-400 text-sm">Loading doctors…</div>
            ) : filteredDoctors.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Stethoscope size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No doctors found</p>
                <p className="text-xs mt-1">Try a different name or specialty</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {filteredDoctors.map(d => (
                  <DoctorRow key={`${d.clinic_id}-${d.id}`} doctor={d} onSelect={selectDoctor} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: pick slot */}
        {step === 'slot' && doctor && (
          <div>
            <div className="rounded-xl p-3 mb-4 flex items-center gap-3 text-sm" style={{ background: '#EEF2FF' }}>
              <Stethoscope size={16} style={{ color: '#0F2557' }} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 truncate">Dr. {doctor.name}</div>
                <div className="text-xs text-gray-500 truncate">{doctor.clinic_name}</div>
              </div>
              {doctor.fee > 0 && <div className="font-bold flex-shrink-0" style={{ color: '#0F2557' }}>₹{doctor.fee}</div>}
            </div>

            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Select Date</label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={e => { setDate(e.target.value); fetchSlots(doctor.id, e.target.value) }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm mb-4 focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': '#0F2557' }}
            />

            {loadingSlots ? (
              <div className="py-8 text-center text-gray-400 text-sm">Loading available slots…</div>
            ) : slots.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                <Clock size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No slots available on this date</p>
                <p className="text-xs mt-1">Try a different date</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
                {slots.map(s => {
                  const time = typeof s === 'string' ? s : s.time
                  const available = typeof s === 'object' ? s.available !== false : true
                  return (
                    <button
                      key={time}
                      disabled={!available}
                      onClick={() => setSlot(time)}
                      className={`py-2 px-2 rounded-lg text-xs font-medium border-2 transition-all ${
                        !available ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                        : slot === time ? 'text-white border-transparent'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                      }`}
                      style={slot === time ? { background: '#0F2557' } : {}}
                    >
                      {time}
                    </button>
                  )
                })}
              </div>
            )}

            <button
              onClick={() => setStep('confirm')}
              disabled={!slot}
              className="w-full mt-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: '#CC1414' }}
            >
              Continue
            </button>
          </div>
        )}

        {/* Step: confirm */}
        {step === 'confirm' && doctor && (
          <div>
            <div className="rounded-xl p-4 mb-4 text-sm space-y-1.5" style={{ background: '#EEF2FF' }}>
              <div className="flex justify-between"><span className="text-gray-500">Doctor</span><span className="font-semibold text-gray-900">Dr. {doctor.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Health Center</span><span className="font-semibold text-gray-900">{doctor.clinic_name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="font-semibold text-gray-900">{date}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Time</span><span className="font-semibold text-gray-900">{slot}</span></div>
              {doctor.fee > 0 && <div className="flex justify-between"><span className="text-gray-500">Fee</span><span className="font-semibold text-gray-900">₹{doctor.fee}</span></div>}
            </div>

            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Patient Name</label>
            <input
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              placeholder="Who is this appointment for?"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm mb-3 focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': '#0F2557' }}
            />

            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Reason for Visit (optional)</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              placeholder="Briefly describe symptoms or reason..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm mb-3 resize-none focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': '#0F2557' }}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-xs mb-3">{error}</div>
            )}

            <p className="text-xs text-gray-400 mb-4">
              Booked with your registered mobile {user?.mobile ? `(${user.mobile})` : ''} — this appointment stays linked to your account.
            </p>

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: '#CC1414' }}
            >
              {submitting
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Booking…</>
                : <><Calendar size={14} /> Confirm Booking</>}
            </button>
          </div>
        )}

        {/* Step: done */}
        {step === 'done' && booking && (
          <div className="text-center py-2">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-gray-500 text-sm mb-5">
              Your appointment request has been sent. The health center will confirm it shortly.
            </p>
            <div className="rounded-2xl p-4 mb-5 mx-auto max-w-xs" style={{ background: '#EEF2FF', border: '2px solid #93c5fd' }}>
              <p className="text-xs text-gray-500 mb-1">Confirmation Code</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl font-bold tracking-widest" style={{ color: '#0F2557' }}>{booking.confirmation_code}</span>
                <button onClick={copyCode} className="p-1.5 rounded-lg hover:bg-white/60" title="Copy code">
                  {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} style={{ color: '#0F2557' }} />}
                </button>
              </div>
            </div>
            <button
              onClick={finish}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#0F2557' }}
            >
              View My Appointments
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Appointments() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [appts, setAppts] = useState([])
  const [loading, setLoading] = useState(true)
  // Auto-open booking when arriving via a "Book" deeplink from the public site
  const [showBooking, setShowBooking] = useState(
    !!(searchParams.get('doctor_id') || searchParams.get('book'))
  )
  const initialSearch = searchParams.get('doctor_name') || ''

  useEffect(() => {
    cachedFetch(
      'appointments',
      () => api.get('/portal/appointments'),
      r => { setAppts(r?.appointments || (Array.isArray(r) ? r : [])); setLoading(false) }
    ).catch(() => setLoading(false))
  }, [])

  const refresh = () => {
    setLoading(true)
    api.get('/portal/appointments')
      .then(r => {
        const list = r?.appointments || (Array.isArray(r) ? r : [])
        setAppts(list)
        cacheSet('appointments', r)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const closeBooking = () => {
    setShowBooking(false)
    // Clean deeplink params so refreshing doesn't reopen the modal
    if (searchParams.get('doctor_id') || searchParams.get('book')) {
      setSearchParams({}, { replace: true })
    }
  }

  const upcoming = appts.filter(a => ['pending','confirmed'].includes(a.status))
  const past = appts.filter(a => !['pending','confirmed'].includes(a.status))

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold" style={{ color: '#0F2557' }}>My Appointments</h1>
        <button
          onClick={() => setShowBooking(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white flex-shrink-0"
          style={{ background: '#CC1414' }}
        >
          <Plus size={15} /> Book Appointment
        </button>
      </div>

      {loading ? (
        <div className="card p-10 text-center text-gray-400 text-sm">Loading…</div>
      ) : appts.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Calendar size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No appointments yet</p>
          <p className="text-sm mt-1 mb-5">Book your first appointment with a verified doctor.</p>
          <button
            onClick={() => setShowBooking(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#CC1414' }}
          >
            <Plus size={15} /> Book Appointment
          </button>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#F5821E' }}>Upcoming</h2>
              <div className="space-y-3">{upcoming.map(a => <ApptCard key={a.id} a={a} />)}</div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#0F2557' }}>Past Appointments</h2>
              <div className="space-y-3">{past.map(a => <ApptCard key={a.id} a={a} />)}</div>
            </div>
          )}
        </>
      )}

      {showBooking && (
        <BookingModal
          onClose={closeBooking}
          onBooked={refresh}
          initialSearch={initialSearch}
        />
      )}
    </div>
  )
}
