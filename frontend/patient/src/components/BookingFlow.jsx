/**
 * BookingFlow — unified 5-step appointment booking component
 * Used in: DoctorProfile (public), BookAppointmentPage (patient portal), BookAppointmentModal (reception)
 *
 * Props:
 *   doctor     — { id, name, specialty, fee, clinic, branch_id, ... }
 *   context    — 'public' | 'patient' | 'reception'
 *   apiClient  — { getDoctorSlots, bookAppointment, patientLookup, sendOtp, verifyOtp, getPatientProfile }
 *   prefill    — { mobile, first_name, last_name, ... } (patient portal auto-fills from account)
 *   onBooked   — callback(booking) after successful booking
 *   onClose    — callback() for modal context
 *   PATIENT_URL — link to patient portal (public context only)
 */

import { useState, useEffect, useRef } from 'react'
import {
  Check, Copy, ChevronRight, ArrowLeft, Clock,
  AlertCircle, CreditCard, Smartphone, Banknote,
  CheckCircle, User, Calendar, Phone
} from 'lucide-react'

const STEPS = ['Pick Slot', 'Patient Details', 'Review', 'Payment', 'Confirmation']

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan',
  'Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman & Nicobar Islands','Chandigarh','Dadra & Nagar Haveli','Daman & Diu',
  'Delhi','Jammu & Kashmir','Ladakh','Lakshadweep','Puducherry',
]

const PAYMENT_METHODS = [
  { value: 'upi',      label: 'UPI',              sub: 'GPay, PhonePe, Paytm, BHIM', icon: Smartphone },
  { value: 'card',     label: 'Card / Net Banking', sub: 'Visa, Mastercard, RuPay',   icon: CreditCard },
  { value: 'cash',     label: 'Cash at Health Center',    sub: 'Pay when you arrive',        icon: Banknote },
]

const fmt12 = (t) => {
  if (!t) return t
  const str = String(t).slice(0, 5)
  const [h, m] = str.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return t
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

const calcAge = (dob) => {
  if (!dob) return null
  const today = new Date(), birth = new Date(dob)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age < 0 || age > 130 ? null : age
}

const today = () => new Date().toISOString().split('T')[0]

// ── Step Indicator ────────────────────────────────────────────────────────────
function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i < current ? 'bg-green-500 text-white'
              : i === current ? 'text-white' : 'bg-gray-200 text-gray-500'
            }`} style={i === current ? { background: '#0F2557' } : {}}>
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-[10px] mt-1 font-medium hidden sm:block text-center ${i <= current ? 'text-gray-700' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 flex-1 mx-1 mb-4 ${i < current ? 'bg-green-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── OTP Modal ─────────────────────────────────────────────────────────────────
function OtpModal({ mobile, apiClient, onVerified, onCancel }) {
  const [otp, setOtp] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const inputRef = useRef(null)

  const sendOtp = async () => {
    setSending(true); setError('')
    try { await apiClient.sendOtp(mobile); setSent(true); setTimeout(() => inputRef.current?.focus(), 100) }
    catch { setError('Could not send OTP. Try again.') }
    finally { setSending(false) }
  }
  useEffect(() => { sendOtp() }, []) // eslint-disable-line

  const verify = async () => {
    if (otp.length < 4) return
    setVerifying(true); setError('')
    try {
      const data = await apiClient.verifyOtp(mobile, otp)
      onVerified(data.verified_token || data.access_token)
    } catch (err) { setError(err.message || 'Invalid OTP') }
    finally { setVerifying(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Phone className="w-7 h-7" style={{ color: '#0F2557' }} />
          </div>
          <h3 className="font-bold text-gray-900 text-lg">Verify Mobile</h3>
          <p className="text-sm text-gray-500 mt-1">{sent ? `OTP sent to ${mobile}` : 'Sending OTP...'}</p>
          <p className="text-xs text-amber-600 mt-1 font-medium">(Dev mode: use 1234)</p>
        </div>
        <input ref={inputRef} type="text" inputMode="numeric" maxLength={6} value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && verify()}
          placeholder="Enter OTP"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-bold mb-3 focus:outline-none focus:ring-2 focus:ring-blue-300" />
        {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}
        <button onClick={verify} disabled={otp.length < 4 || verifying}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white mb-3 disabled:opacity-50"
          style={{ background: '#0F2557' }}>
          {verifying ? 'Verifying…' : 'Verify OTP'}
        </button>
        <div className="flex gap-3">
          <button onClick={sendOtp} disabled={sending}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-600">
            {sending ? 'Sending…' : 'Resend'}
          </button>
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Step 1: Pick Slot ─────────────────────────────────────────────────────────
function SlotStep({ doctor, apiClient, onNext }) {
  const [date, setDate] = useState(today())
  const [slots, setSlots] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchSlots = (d) => {
    setLoading(true); setError(''); setSlots([]); setSelected(null)
    apiClient.getDoctorSlots(doctor.id, d, doctor.branch_id || doctor.clinic?.default_branch_id)
      .then(r => setSlots(Array.isArray(r) ? r : r.slots || []))
      .catch(() => setError('No slots available for this date. Try another date or call the clinic.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchSlots(today()) }, []) // eslint-disable-line

  return (
    <div>
      <h3 className="font-bold text-lg mb-4" style={{ color: '#0F2557' }}>Select Date & Time</h3>
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-600 block mb-1">Date</label>
        <input type="date" value={date} min={today()}
          onChange={e => { setDate(e.target.value); fetchSlots(e.target.value) }}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 w-full max-w-xs" />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#0F2557', borderTopColor: 'transparent' }} />
          Loading slots…
        </div>
      )}
      {error && <p className="text-amber-600 text-sm bg-amber-50 px-4 py-3 rounded-xl mb-3">{error}</p>}

      {slots.length > 0 && (
        <>
          <p className="text-xs text-gray-500 mb-3">{slots.filter(s => (typeof s === 'object' ? s.available !== false : true)).length} slots available</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {slots.map(slot => {
              const time = typeof slot === 'string' ? slot : slot.time
              const avail = typeof slot === 'object' ? slot.available !== false : true
              return (
                <button key={time} disabled={!avail} onClick={() => setSelected(time)}
                  className={`py-2.5 px-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                    !avail ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                    : selected === time ? 'text-white border-transparent shadow-md' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                  }`}
                  style={selected === time ? { background: '#0F2557' } : {}}>
                  {fmt12(time)}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3">Session duration is set by the doctor</p>
        </>
      )}

      {!loading && slots.length === 0 && !error && (
        <div className="text-center py-10 bg-gray-50 rounded-xl">
          <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No slots available for this date</p>
        </div>
      )}

      <button onClick={() => selected && onNext({ date, slot: selected })} disabled={!selected}
        className="mt-6 w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-opacity"
        style={{ background: '#CC1414', opacity: selected ? 1 : 0.4 }}>
        Continue <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── Step 2: Patient Details ───────────────────────────────────────────────────
function PatientStep({ context, apiClient, prefill, onNext, onBack }) {
  const [form, setForm] = useState({
    mobile: prefill?.mobile || '',
    first_name: prefill?.first_name || '',
    last_name: prefill?.last_name || '',
    state: prefill?.state || '',
    dob: prefill?.dob || '',
    gender: prefill?.gender || '',
    email: prefill?.email || '',
    blood_group: prefill?.blood_group || '',
    allergies: prefill?.allergies || '',
    emergency_contact_name: prefill?.emergency_contact_name || '',
    emergency_contact_phone: prefill?.emergency_contact_phone || '',
    reason: '',
  })
  const [errors, setErrors] = useState({})
  const [profiles, setProfiles] = useState([])      // family member list
  const [showFamilyPicker, setShowFamilyPicker] = useState(false)
  const [showOtp, setShowOtp] = useState(false)
  const [profileFilled, setProfileFilled] = useState(!!prefill?.first_name)
  const [bhId, setBhId] = useState(prefill?.bh_id || '')
  const lookupTimer = useRef(null)
  const dropRef = useRef(null)

  const age = calcAge(form.dob)

  useEffect(() => {
    const h = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowFamilyPicker(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Patient portal: mobile is pre-filled — auto-trigger lookup on mount
  useEffect(() => {
    if (prefill?.mobile && /^[6-9]\d{9}$/.test(prefill.mobile)) {
      doLookup(prefill.mobile)
    }
  }, []) // eslint-disable-line

  const doLookup = async (mobile) => {
    try {
      const d = await apiClient.patientLookup(mobile)
      if (d?.found) {
        const list = d.profiles || (d.masked_name ? [{ masked_name: d.masked_name, bh_id: d.bh_id }] : [])
        if (list.length === 1) {
          // Single profile — go straight to OTP
          setBhId(list[0].bh_id || '')
          setShowOtp(true)
        } else if (list.length > 1) {
          // Multiple family members — show picker
          setProfiles(list)
          setShowFamilyPicker(true)
        }
      }
    } catch {}
  }

  const handleMobileChange = e => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10)
    setForm(p => ({ ...p, mobile: val }))
    setProfiles([]); setShowFamilyPicker(false); setProfileFilled(false); setBhId('')
    clearTimeout(lookupTimer.current)
    if (/^[6-9]\d{9}$/.test(val)) lookupTimer.current = setTimeout(() => doLookup(val), 30)
  }

  const selectFamilyMember = (profile) => {
    setShowFamilyPicker(false)
    setBhId(profile.bh_id || '')
    setShowOtp(true)
  }

  const handleOtpVerified = async (token) => {
    setShowOtp(false)
    try {
      const resp = await apiClient.getPatientProfile(token)
      const p = resp?.profiles?.find(x => !bhId || x.bh_id === bhId) || resp?.profiles?.[0] || {}
      setForm(prev => ({
        ...prev,
        first_name: p.first_name || prev.first_name,
        last_name: p.last_name || prev.last_name,
        dob: p.date_of_birth || prev.dob,
        gender: p.gender || prev.gender,
        email: resp.email || p.email || prev.email,
        state: p.state || prev.state,
        blood_group: p.blood_group || prev.blood_group,
        allergies: p.allergies || prev.allergies,
        emergency_contact_name: p.emergency_contact_name || prev.emergency_contact_name,
        emergency_contact_phone: p.emergency_contact_phone || prev.emergency_contact_phone,
      }))
      setBhId(p.bh_id || bhId)
      setProfileFilled(true)
    } catch {}
  }

  const validate = () => {
    const e = {}
    if (!/^[6-9]\d{9}$/.test(form.mobile)) e.mobile = 'Valid 10-digit mobile required'
    if (!form.first_name.trim()) e.first_name = 'First name is required'
    if (!form.last_name.trim()) e.last_name = 'Last name is required'
    if (!form.state) e.state = 'State is required'
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    if (form.dob && new Date(form.dob) > new Date()) e.dob = 'Date of birth cannot be in the future'
    if (form.dob && age === null) e.dob = 'Invalid date of birth'
    setErrors(e)
    if (Object.keys(e).length) {
      // scroll first error into view
      const first = document.querySelector('[data-field-error]')
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    return Object.keys(e).length === 0
  }

  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

  const inputCls = (key) =>
    `w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 ${errors[key] ? 'border-red-400' : 'border-gray-200'}`

  const label = context === 'patient' ? 'Your Details' : 'Patient Details'

  return (
    <div>
      {showOtp && (
        <OtpModal mobile={form.mobile} apiClient={apiClient}
          onVerified={handleOtpVerified} onCancel={() => setShowOtp(false)} />
      )}

      <h3 className="font-bold text-lg mb-4" style={{ color: '#0F2557' }}>{label}</h3>

      {/* Mobile — first field, auto-lookup */}
      <div className="mb-3" ref={dropRef}>
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Mobile Number <span className="text-red-500">*</span>
        </label>
        <input
          value={form.mobile}
          onChange={handleMobileChange}
          type="tel" maxLength={10}
          placeholder="10-digit mobile — auto-fills your details"
          readOnly={context === 'patient' && !!prefill?.mobile}
          className={`mt-1 ${inputCls('mobile')} ${context === 'patient' && prefill?.mobile ? 'bg-gray-50 text-gray-500' : ''}`}
        />
        {errors.mobile && <p className="text-red-500 text-xs mt-1" data-field-error>{errors.mobile}</p>}

        {/* Family member picker dropdown */}
        {showFamilyPicker && profiles.length > 0 && (
          <div className="border border-gray-200 rounded-xl mt-1 shadow-lg bg-white z-20 relative overflow-hidden">
            <p className="px-4 py-2 text-xs text-gray-500 font-medium bg-gray-50 border-b border-gray-100">
              Select patient
            </p>
            {profiles.map((p, i) => (
              <button key={i} onMouseDown={() => selectFamilyMember(p)}
                className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 flex items-center gap-3 border-b last:border-0 border-gray-100 transition-colors">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm flex-shrink-0">
                  {(p.masked_name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{p.masked_name}</div>
                  <div className="text-xs text-gray-400">Tap to verify &amp; auto-fill</div>
                </div>
              </button>
            ))}
          </div>
        )}
        {profileFilled && (
          <p className="text-green-600 text-xs mt-1 font-medium">✓ Profile loaded — review and confirm details below</p>
        )}
      </div>

      {/* First Name + Last Name */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            First Name <span className="text-red-500">*</span>
          </label>
          <input {...f('first_name')} type="text" placeholder="First name"
            className={`mt-1 ${inputCls('first_name')}`} />
          {errors.first_name && <p className="text-red-500 text-xs mt-1" data-field-error>{errors.first_name}</p>}
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input {...f('last_name')} type="text" placeholder="Last name"
            className={`mt-1 ${inputCls('last_name')}`} />
          {errors.last_name && <p className="text-red-500 text-xs mt-1" data-field-error>{errors.last_name}</p>}
        </div>
      </div>

      {/* State — mandatory */}
      <div className="mb-3">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          State <span className="text-red-500">*</span>
        </label>
        <select {...f('state')} className={`mt-1 ${inputCls('state')} bg-white`}>
          <option value="">Select state</option>
          {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {errors.state && <p className="text-red-500 text-xs mt-1" data-field-error>{errors.state}</p>}
      </div>

      {/* DOB + Age (calculated) */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Date of Birth</label>
          <input {...f('dob')} type="date" max={today()}
            className={`mt-1 ${inputCls('dob')}`} />
          {errors.dob && <p className="text-red-500 text-xs mt-1" data-field-error>{errors.dob}</p>}
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Age</label>
          <div className="mt-1 w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm bg-gray-50 text-gray-500 min-h-[42px]">
            {age !== null ? `${age} yrs` : <span className="text-gray-300">Auto-calculated</span>}
          </div>
        </div>
      </div>

      {/* Gender */}
      <div className="mb-3">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Gender</label>
        <select {...f('gender')} className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white">
          <option value="">Prefer not to say</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Email */}
      <div className="mb-3">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</label>
        <input {...f('email')} type="email" placeholder="email@example.com"
          className={`mt-1 ${inputCls('email')}`} />
        {errors.email && <p className="text-red-500 text-xs mt-1" data-field-error>{errors.email}</p>}
      </div>

      {/* Blood Group */}
      <div className="mb-3">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Blood Group</label>
        <select {...f('blood_group')} className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white">
          <option value="">Unknown</option>
          {['A+','A−','B+','B−','O+','O−','AB+','AB−'].map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {/* Reason for Visit */}
      <div className="mb-3">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Reason for Visit</label>
        <textarea {...f('reason')} rows={2} placeholder="Brief symptoms or reason (optional)"
          className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none resize-none" />
      </div>

      {/* Allergies */}
      <div className="mb-3">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Known Allergies</label>
        <input {...f('allergies')} type="text" placeholder="e.g. Penicillin, Peanuts (optional)"
          className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
      </div>

      {/* Emergency Contact */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Emergency Contact</label>
          <input {...f('emergency_contact_name')} type="text" placeholder="Name"
            className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Emergency Phone</label>
          <input {...f('emergency_contact_phone')} type="tel" maxLength={10} placeholder="Mobile"
            className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack}
          className="flex-1 py-3 rounded-xl font-semibold text-sm border-2 flex items-center justify-center gap-2"
          style={{ borderColor: '#0F2557', color: '#0F2557' }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={() => validate() && onNext({ ...form, bh_id: bhId })}
          className="flex-1 py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2"
          style={{ background: '#CC1414' }}>
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ── Step 3: Review ────────────────────────────────────────────────────────────
function ReviewStep({ doctor, slotData, patientData, onNext, onBack, onEditSlot, onEditPatient }) {
  const age = calcAge(patientData.dob)
  return (
    <div>
      <h3 className="font-bold text-lg mb-4" style={{ color: '#0F2557' }}>Review Booking</h3>

      {/* Doctor + slot */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: '#EEF2FF', border: '1px solid #93c5fd' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Appointment</p>
          <button onClick={onEditSlot} className="text-xs font-semibold underline" style={{ color: '#CC1414' }}>Edit Slot</button>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
            style={{ background: '#0F2557' }}>
            {(doctor.name || 'D')[0].toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-sm text-gray-900">
              {/^dr\.?\s/i.test(doctor.name || '') ? doctor.name : `Dr. ${doctor.name}`}
            </div>
            <div className="text-xs text-gray-500">{doctor.specialty}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm mt-3">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: '#0F2557' }} />
            <span>{slotData.date}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4 flex-shrink-0" style={{ color: '#0F2557' }} />
            <span>{fmt12(slotData.slot)}</span>
          </div>
        </div>
        {doctor.clinic?.name && (
          <div className="text-xs text-gray-500 mt-2">{doctor.clinic.name}</div>
        )}
        {doctor.fee > 0 && (
          <div className="text-xs font-semibold mt-2" style={{ color: '#0F2557' }}>
            Consultation Fee: ₹{doctor.fee}
          </div>
        )}
      </div>

      {/* Patient */}
      <div className="rounded-2xl p-4 mb-5" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Patient</p>
          <button onClick={onEditPatient} className="text-xs font-semibold underline" style={{ color: '#CC1414' }}>Edit Details</button>
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex gap-2">
            <span className="text-gray-500 w-28 flex-shrink-0">Name</span>
            <span className="font-semibold text-gray-800">{patientData.first_name} {patientData.last_name}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 w-28 flex-shrink-0">Mobile</span>
            <span className="font-semibold text-gray-800">{patientData.mobile}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-500 w-28 flex-shrink-0">State</span>
            <span className="font-semibold text-gray-800">{patientData.state}</span>
          </div>
          {patientData.dob && (
            <div className="flex gap-2">
              <span className="text-gray-500 w-28 flex-shrink-0">DOB / Age</span>
              <span className="font-semibold text-gray-800">{patientData.dob}{age !== null ? ` · ${age} yrs` : ''}</span>
            </div>
          )}
          {patientData.gender && patientData.gender !== 'Prefer not to say' && (
            <div className="flex gap-2">
              <span className="text-gray-500 w-28 flex-shrink-0">Gender</span>
              <span className="font-semibold text-gray-800 capitalize">{patientData.gender}</span>
            </div>
          )}
          {patientData.email && (
            <div className="flex gap-2">
              <span className="text-gray-500 w-28 flex-shrink-0">Email</span>
              <span className="font-semibold text-gray-800">{patientData.email}</span>
            </div>
          )}
          {patientData.reason && (
            <div className="flex gap-2">
              <span className="text-gray-500 w-28 flex-shrink-0">Reason</span>
              <span className="font-semibold text-gray-800">{patientData.reason}</span>
            </div>
          )}
          {patientData.bh_id && (
            <div className="flex gap-2">
              <span className="text-gray-500 w-28 flex-shrink-0">BH ID</span>
              <span className="font-mono font-bold text-sm" style={{ color: '#0F2557' }}>{patientData.bh_id}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack}
          className="flex-1 py-3 rounded-xl font-semibold text-sm border-2 flex items-center justify-center gap-2"
          style={{ borderColor: '#0F2557', color: '#0F2557' }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={onNext}
          className="flex-1 py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2"
          style={{ background: '#CC1414' }}>
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ── Step 4: Payment ───────────────────────────────────────────────────────────
function PaymentStep({ doctor, submitting, submitError, context, onNext, onBack }) {
  const [method, setMethod] = useState('')
  const fee = doctor.fee || 0
  const platformFee = 29
  const total = fee + platformFee

  return (
    <div>
      <h3 className="font-bold text-lg mb-2" style={{ color: '#0F2557' }}>Payment</h3>

      {/* Dev mode banner */}
      <div className="rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-sm font-semibold text-amber-800"
        style={{ background: '#FFF8E1', border: '2px solid #FFE082' }}>
        <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-500" />
        <span>Dev Mode — No real payment will be processed. Select a method to continue.</span>
      </div>

      {/* Fee breakdown */}
      <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Consultation Fee</span>
          <span className="font-semibold">₹{fee.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Platform Fee</span>
          <span className="font-semibold">₹{platformFee}</span>
        </div>
        <div className="border-t border-gray-200 pt-2 flex justify-between font-bold" style={{ color: '#0F2557' }}>
          <span>Total</span>
          <span>₹{total.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Refund policy */}
      <div className="rounded-xl p-3 mb-4 text-xs text-gray-600 flex gap-2"
        style={{ background: '#0F255708', border: '1px solid #0F255720' }}>
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#0F2557' }} />
        <div>
          <strong>Refund Policy:</strong> Platform fee 100% refundable. Doctor fee fully refundable if cancelled <strong>6+ hours</strong> before appointment.
        </div>
      </div>

      {/* Payment method picker */}
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
        Select Payment Method <span className="text-red-500">*</span>
      </p>
      <div className="space-y-2 mb-4">
        {PAYMENT_METHODS.map(pm => {
          const Icon = pm.icon
          const sel = method === pm.value
          return (
            <button key={pm.value} onClick={() => setMethod(pm.value)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                sel ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
              <Icon className={`w-5 h-5 flex-shrink-0 ${sel ? 'text-green-600' : 'text-gray-400'}`} />
              <div className="flex-1">
                <div className="font-semibold text-sm text-gray-800">{pm.label}</div>
                <div className="text-xs text-gray-500">{pm.sub}</div>
              </div>
              {sel && <Check className="w-4 h-4 text-green-600" />}
            </button>
          )
        })}
      </div>

      {submitError && (
        <p className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl mb-3">{submitError}</p>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} disabled={submitting}
          className="flex-1 py-3 rounded-xl font-semibold text-sm border-2 flex items-center justify-center gap-2"
          style={{ borderColor: '#0F2557', color: '#0F2557' }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={() => method && onNext({ payment_method: method, amount_due: total })}
          disabled={!method || submitting}
          className="flex-1 py-3 rounded-xl font-semibold text-sm text-white transition-opacity flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ background: '#CC1414' }}>
          {submitting ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Booking…</>
          ) : (
            <>Confirm Booking <ChevronRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Step 5: Confirmation ──────────────────────────────────────────────────────
function ConfirmationStep({ booking, context, patientPortalUrl, onClose }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(booking.confirmation_code)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-9 h-9 text-green-500" />
      </div>
      <h3 className="text-xl font-bold mb-1" style={{ color: '#0F2557' }}>Appointment Requested!</h3>
      <p className="text-gray-500 text-sm mb-6">
        {booking.status === 'confirmed'
          ? 'Your appointment is confirmed. See you soon!'
          : 'Your request has been received. You will get an SMS once confirmed.'}
      </p>

      {/* Confirmation code */}
      <div className="rounded-2xl p-5 mb-4 mx-auto max-w-xs" style={{ background: '#EEF2FF', border: '2px solid #93c5fd' }}>
        <p className="text-xs text-gray-500 mb-1">Confirmation Code</p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl font-bold tracking-widest" style={{ color: '#0F2557' }}>
            {booking.confirmation_code}
          </span>
          <button onClick={copy} className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" style={{ color: '#0F2557' }} />}
          </button>
        </div>
      </div>

      {/* BHID — shown prominently for new patients */}
      {booking.bh_id && (
        <div className="rounded-2xl p-4 mb-4 mx-auto max-w-xs text-left"
          style={{ background: booking.is_new_patient ? '#F0FDF4' : '#F9FAFB', border: `2px solid ${booking.is_new_patient ? '#86efac' : '#E5E7EB'}` }}>
          {booking.is_new_patient && (
            <p className="text-xs font-bold text-green-700 mb-1 uppercase tracking-wide">✓ Your Health ID Created</p>
          )}
          <p className="text-xs text-gray-500 mb-0.5">BHarath Health ID</p>
          <p className="font-mono font-bold text-lg" style={{ color: '#0F2557' }}>{booking.bh_id}</p>
          {booking.is_new_patient && (
            <p className="text-xs text-gray-500 mt-1">Use this ID at any BHarath Health clinic across India</p>
          )}
        </div>
      )}

      {/* Booking summary */}
      <div className="rounded-xl p-4 mb-4 mx-auto max-w-xs text-left text-sm"
        style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
        <div className="space-y-1 text-gray-600">
          <div className="flex gap-2"><span className="w-16 flex-shrink-0">Doctor</span><span className="font-semibold text-gray-800">{booking.doctor_name}</span></div>
          <div className="flex gap-2"><span className="w-16 flex-shrink-0">Date</span><span className="font-semibold text-gray-800">{booking.date}</span></div>
          <div className="flex gap-2"><span className="w-16 flex-shrink-0">Time</span><span className="font-semibold text-gray-800">{fmt12(booking.slot)}</span></div>
          {booking.clinic_name && <div className="flex gap-2"><span className="w-16 flex-shrink-0">Health Center</span><span className="font-semibold text-gray-800">{booking.clinic_name}</span></div>}
        </div>
      </div>

      {/* CTAs */}
      <div className="flex gap-3 justify-center flex-wrap">
        {context === 'reception' && onClose && (
          <button onClick={onClose}
            className="py-2.5 px-5 rounded-xl font-semibold text-sm text-white"
            style={{ background: '#0F2557' }}>
            Done
          </button>
        )}
        {context !== 'reception' && patientPortalUrl && (
          <a href={patientPortalUrl} target="_blank" rel="noopener noreferrer"
            className="py-2.5 px-5 rounded-xl font-semibold text-sm text-white inline-block"
            style={{ background: '#CC1414' }}>
            My Health Portal
          </a>
        )}
        {context === 'patient' && (
          <a href="/appointments"
            className="py-2.5 px-5 rounded-xl font-semibold text-sm border-2 inline-block"
            style={{ borderColor: '#0F2557', color: '#0F2557' }}>
            My Appointments
          </a>
        )}
      </div>
    </div>
  )
}

// ── Main BookingFlow ──────────────────────────────────────────────────────────
export default function BookingFlow({ doctor, context = 'public', apiClient, prefill, onBooked, onClose, patientPortalUrl }) {
  const [step, setStep] = useState(0)
  const [slotData, setSlotData] = useState(null)
  const [patientData, setPatientData] = useState(null)
  const [confirmedBooking, setConfirmedBooking] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const handleSlot = (data) => { setSlotData(data); setStep(1) }
  const handlePatient = (data) => { setPatientData(data); setStep(2) }
  const handleReview = () => setStep(3)
  const handlePayment = async (payData) => {
    setSubmitting(true); setSubmitError('')
    try {
      const payload = {
        clinic_id: doctor.clinic?.id ?? doctor.clinic_id,
        branch_id: doctor.branch_id || doctor.clinic?.default_branch_id || null,
        doctor_id: doctor.id,
        first_name: patientData.first_name.trim(),
        last_name: patientData.last_name.trim(),
        patient_mobile: patientData.mobile,
        patient_email: patientData.email || undefined,
        booking_date: slotData.date,
        booking_time: slotData.slot,
        reason: patientData.reason || undefined,
        patient_state: patientData.state,
        bh_id_ref: patientData.bh_id || undefined,
        mode: context === 'reception' ? 'offline' : 'online',
        payment_mode: payData.payment_method,
        payment_status: 'pending',
        amount_due: payData.amount_due,
      }
      const result = await apiClient.bookAppointment(payload)
      const b = result.booking || result
      const confirmed = {
        confirmation_code: b.confirmation_code || 'BH' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        doctor_name: doctor.name,
        clinic_name: doctor.clinic?.name,
        date: slotData.date,
        slot: slotData.slot,
        status: b.status || 'pending',
        bh_id: b.bh_id || patientData.bh_id || null,
        is_new_patient: b.is_new_patient || false,
      }
      setConfirmedBooking(confirmed)
      setStep(4)
      onBooked?.(confirmed)
    } catch (err) {
      setSubmitError(err.message || 'Booking failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <StepIndicator current={step} />

      {step === 0 && (
        <SlotStep doctor={doctor} apiClient={apiClient} onNext={handleSlot} />
      )}
      {step === 1 && (
        <PatientStep
          context={context} apiClient={apiClient} prefill={prefill}
          onNext={handlePatient} onBack={() => setStep(0)}
        />
      )}
      {step === 2 && (
        <ReviewStep
          doctor={doctor} slotData={slotData} patientData={patientData}
          onNext={handleReview}
          onBack={() => setStep(1)}
          onEditSlot={() => setStep(0)}
          onEditPatient={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <PaymentStep
          doctor={doctor} submitting={submitting} submitError={submitError}
          context={context}
          onNext={handlePayment} onBack={() => setStep(2)}
        />
      )}
      {step === 4 && confirmedBooking && (
        <ConfirmationStep
          booking={confirmedBooking} context={context}
          patientPortalUrl={patientPortalUrl} onClose={onClose}
        />
      )}
    </div>
  )
}
