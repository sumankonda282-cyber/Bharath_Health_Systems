import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MapPin, Stethoscope, Clock, Star, Shield,
  Video, Calendar, User, ChevronRight, CheckCircle,
  Copy, Check, Phone, Building2, CreditCard, Smartphone,
  AlertCircle, IndianRupee
} from 'lucide-react'
import { publicApi } from '../api/client'
import Navbar from '../components/Navbar'
import { PATIENT_URL } from '../constants/urls'
const fmt12 = (t) => {
  if (!t) return t
  const str = String(t).slice(0, 5)
  const [h, m] = str.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return t
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

const PLATFORM_FEE = 29

// ── Booking Steps ─────────────────────────────────────────────────────────────

const STEPS = ['Pick Slot', 'Your Details', 'Payment', 'Confirmed']

function StepBar({ current }) {
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i < current ? 'bg-green-500 text-white'
              : i === current ? 'text-white' : 'bg-gray-200 text-gray-500'
            }`} style={i === current ? { background: '#0F2557' } : {}}>
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs mt-1 font-medium hidden sm:block ${i <= current ? 'text-gray-700' : 'text-gray-400'}`}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 flex-1 mx-1 mb-4 ${i < current ? 'bg-green-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// Step 1: Pick date + slot
function SlotStep({ doctor, onNext }) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [slots, setSlots] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchSlots = (d) => {
    setLoading(true); setError(''); setSlots([]); setSelected(null)
    publicApi.getDoctorSlots(doctor.id, d, doctor.clinic?.default_branch_id)
      .then(r => setSlots(Array.isArray(r) ? r : r.slots || []))
      .catch(() => setError('No slots configured for this date. Try another date or call the clinic to book.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchSlots(today) }, []) // eslint-disable-line

  return (
    <div>
      <h3 className="font-bold text-lg mb-4" style={{ color: '#0F2557' }}>Select Date & Time</h3>
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-600 block mb-1">Date</label>
        <input type="date" value={date} min={today}
          onChange={e => { setDate(e.target.value); fetchSlots(e.target.value) }}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm w-full max-w-xs focus:outline-none focus:ring-2" />
      </div>

      {loading && <div className="flex items-center gap-2 text-sm text-gray-500 py-4"><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#0F2557', borderTopColor: 'transparent' }} />Loading slots...</div>}
      {error && <p className="text-amber-600 text-sm bg-amber-50 px-4 py-2 rounded-lg mb-3">{error}</p>}

      {slots.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-3">{slots.length} slots available</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {slots.map(slot => {
              const time = typeof slot === 'string' ? slot : slot.time
              const avail = typeof slot === 'object' ? slot.available !== false : true
              return (
                <button key={time} disabled={!avail} onClick={() => setSelected(time)}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                    !avail ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                    : selected === time ? 'text-white border-transparent' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                  }`} style={selected === time ? { background: '#0F2557' } : {}}>
                  {fmt12(time)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {slots.length > 0 && (
        <p className="text-xs text-gray-400 mt-3">Session duration per slot is set by the doctor</p>
      )}

      {!loading && slots.length === 0 && !error && (
        <div className="text-center py-8 bg-gray-50 rounded-xl">
          <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No slots available for this date</p>
        </div>
      )}

      <button onClick={() => onNext({ date, slot: selected })} disabled={!selected}
        className="mt-6 w-full py-3 rounded-xl font-semibold text-sm text-white transition-opacity"
        style={{ background: '#CC1414', opacity: selected ? 1 : 0.4 }}>
        Continue <ChevronRight className="w-4 h-4 inline" />
      </button>
    </div>
  )
}

// OTP Modal
function OtpModal({ mobile, onVerified, onCancel }) {
  const [otp, setOtp] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const inputRef = useRef(null)

  const sendOtp = async () => {
    setSending(true); setError('')
    try { await publicApi.sendOtp(mobile); setSent(true); setTimeout(() => inputRef.current?.focus(), 100) }
    catch { setError('Could not send OTP. Try again.') }
    finally { setSending(false) }
  }
  useEffect(() => { sendOtp() }, []) // eslint-disable-line

  const verify = async () => {
    if (otp.length < 4) return
    setVerifying(true); setError('')
    try {
      const data = await publicApi.verifyOtp(mobile, otp)
      onVerified(data.verified_token || data.access_token)
    } catch (err) { setError(err.message || 'Invalid OTP') }
    finally { setVerifying(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
        <h3 className="font-bold text-gray-900 text-lg text-center mb-1">Verify Mobile</h3>
        <p className="text-sm text-gray-500 text-center mb-1">{sent ? `OTP sent to ${mobile}` : 'Sending OTP...'}</p>
        <p className="text-xs text-amber-600 text-center mb-4">(Dev mode: use 1234)</p>
        <input ref={inputRef} type="text" inputMode="numeric" maxLength={6} value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && verify()}
          placeholder="Enter OTP"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] font-bold mb-3 focus:outline-none focus:ring-2" />
        {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}
        <button onClick={verify} disabled={otp.length < 4 || verifying}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white mb-3 disabled:opacity-50" style={{ background: '#0F2557' }}>
          {verifying ? 'Verifying…' : 'Verify OTP'}
        </button>
        <div className="flex gap-3">
          <button onClick={sendOtp} disabled={sending} className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-gray-600">Resend</button>
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-gray-500">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// Step 2: Patient details with phone auto-lookup
function DetailsStep({ onNext, onBack }) {
  const [form, setForm] = useState({ patient_name: '', mobile: '', email: '', age: '', gender: '', reason: '' })
  const [errors, setErrors] = useState({})
  const [suggestions, setSuggestions] = useState([])
  const [showDrop, setShowDrop] = useState(false)
  const [showOtp, setShowOtp] = useState(false)
  const [profileFilled, setProfileFilled] = useState(false)
  const lookupTimer = useRef(null)
  const dropRef = useRef(null)

  useEffect(() => {
    const h = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const doLookup = async (mobile) => {
    try {
      const d = await publicApi.patientLookup(mobile)
      if (d?.found) {
        const profiles = d.profiles || (d.masked_name ? [{ masked_name: d.masked_name, bh_id: d.bh_id }] : [])
        setSuggestions(profiles)
        setShowDrop(true)
      }
    } catch {}
  }

  const handleMobileChange = e => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10)
    setForm(p => ({ ...p, mobile: val }))
    setSuggestions([]); setShowDrop(false); setProfileFilled(false)
    clearTimeout(lookupTimer.current)
    if (/^[6-9]\d{9}$/.test(val)) lookupTimer.current = setTimeout(() => doLookup(val), 30)
  }

  const handleOtpVerified = async (token) => {
    setShowOtp(false)
    try {
      const resp = await publicApi.getPatientProfile(token)
      const p = resp?.profiles?.[0] || {}
      let ageStr = ''
      if (p.date_of_birth) {
        const dob = new Date(p.date_of_birth)
        ageStr = String(new Date().getFullYear() - dob.getFullYear())
      }
      setForm(prev => ({
        ...prev,
        patient_name: p.full_name || prev.patient_name,
        email: resp.email || p.email || prev.email,
        age: ageStr || prev.age,
        gender: p.gender || prev.gender,
      }))
      setProfileFilled(true)
    } catch {}
  }

  const validate = () => {
    const e = {}
    if (!form.patient_name.trim()) e.patient_name = 'Required'
    if (!/^[6-9]\d{9}$/.test(form.mobile)) e.mobile = 'Valid 10-digit mobile required'
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    setErrors(e)
    return !Object.keys(e).length
  }

  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

  return (
    <div>
      {showOtp && <OtpModal mobile={form.mobile} onVerified={handleOtpVerified} onCancel={() => setShowOtp(false)} />}
      <h3 className="font-bold text-lg mb-4" style={{ color: '#0F2557' }}>Patient Details</h3>
      <div className="space-y-3">
        {/* Mobile first with auto-lookup */}
        <div ref={dropRef}>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Mobile *</label>
          <input value={form.mobile} onChange={handleMobileChange} type="tel" maxLength={10} placeholder="10-digit mobile — auto-fills your details"
            className={`mt-1 w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none ${errors.mobile ? 'border-red-400' : 'border-gray-200'}`} />
          {errors.mobile && <p className="text-red-500 text-xs mt-0.5">{errors.mobile}</p>}
          {showDrop && suggestions.length > 0 && (
            <div className="border border-gray-200 rounded-xl mt-1 overflow-hidden shadow-lg bg-white z-10 relative">
              {suggestions.map((s, i) => (
                <button key={i} onMouseDown={() => { setShowDrop(false); setShowOtp(true) }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-sm flex-shrink-0">
                    {(s.masked_name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{s.masked_name}</div>
                    <div className="text-xs text-gray-400">Tap to verify & auto-fill</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {profileFilled && <p className="text-green-600 text-xs mt-1">✓ Profile auto-filled</p>}
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Full Name *</label>
          <input {...f('patient_name')} type="text" placeholder="Patient's full name"
            className={`mt-1 w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${errors.patient_name ? 'border-red-400' : 'border-gray-200'}`} />
          {errors.patient_name && <p className="text-red-500 text-xs mt-0.5">{errors.patient_name}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Age</label>
            <input {...f('age')} type="number" min="0" max="150" placeholder="Age"
              className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Gender</label>
            <select {...f('gender')} className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none bg-white">
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</label>
          <input {...f('email')} type="email" placeholder="Email (optional)"
            className={`mt-1 w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none ${errors.email ? 'border-red-400' : 'border-gray-200'}`} />
          {errors.email && <p className="text-red-500 text-xs mt-0.5">{errors.email}</p>}
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Reason for Visit</label>
          <textarea {...f('reason')} rows={2} placeholder="Brief symptoms or reason..."
            className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none resize-none" />
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onBack} className="flex-1 py-3 rounded-xl font-semibold text-sm border-2 transition-colors" style={{ borderColor: '#0F2557', color: '#0F2557' }}>Back</button>
        <button onClick={() => validate() && onNext(form)} className="flex-1 py-3 rounded-xl font-semibold text-sm text-white" style={{ background: '#CC1414' }}>Continue</button>
      </div>
    </div>
  )
}

// Step 3: Payment
function PaymentStep({ doctor, slotData, onNext, onBack, submitting }) {
  const [method, setMethod] = useState('upi')
  const fee = doctor.fee || 0
  const platformFee = PLATFORM_FEE
  const gatewayCharges = method === 'card' ? Math.round((fee + platformFee) * 0.02 * 1.18) : 0
  const total = fee + platformFee + gatewayCharges

  return (
    <div>
      <h3 className="font-bold text-lg mb-4" style={{ color: '#0F2557' }}>Payment</h3>

      {/* Fee breakdown */}
      <div className="bg-gray-50 rounded-2xl p-4 mb-5 space-y-2 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Consultation Fee</span>
          <span className="font-semibold">₹{fee.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Platform Fee</span>
          <span className="font-semibold">₹{platformFee}</span>
        </div>
        {gatewayCharges > 0 && (
          <div className="flex justify-between text-gray-400 text-xs">
            <span>Gateway Charges (2% + GST)</span>
            <span>₹{gatewayCharges}</span>
          </div>
        )}
        <div className="border-t border-gray-200 pt-2 flex justify-between font-bold" style={{ color: '#0F2557' }}>
          <span>Total</span>
          <span>₹{total.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Cancellation note */}
      <div className="rounded-xl p-3 mb-5 text-xs text-gray-600 flex gap-2" style={{ background: '#0F255708', border: '1px solid #0F255720' }}>
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#0F2557' }} />
        <div>
          <strong>Refund Policy:</strong> Platform fee is 100% refundable on cancellation. Doctor fee is fully refundable if cancelled <strong>6+ hours</strong> before appointment time.
        </div>
      </div>

      {/* Payment method */}
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Choose Payment Method</p>
      <div className="space-y-2 mb-5">
        <button onClick={() => setMethod('upi')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${method === 'upi' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
          <Smartphone className={`w-5 h-5 ${method === 'upi' ? 'text-green-600' : 'text-gray-400'}`} />
          <div className="flex-1">
            <div className="font-semibold text-sm text-gray-800">UPI</div>
            <div className="text-xs text-gray-500">GPay, PhonePe, Paytm, BHIM</div>
          </div>
          <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Zero charges</span>
        </button>
        <button onClick={() => setMethod('card')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${method === 'card' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
          <CreditCard className={`w-5 h-5 ${method === 'card' ? 'text-blue-600' : 'text-gray-400'}`} />
          <div className="flex-1">
            <div className="font-semibold text-sm text-gray-800">Card / Net Banking</div>
            <div className="text-xs text-gray-500">Visa, Mastercard, RuPay, Net Banking</div>
          </div>
          <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full font-medium">2% + GST</span>
        </button>
      </div>

      {/* Razorpay placeholder note */}
      <div className="rounded-xl px-4 py-3 mb-5 text-xs text-amber-700 flex gap-2 items-start" style={{ background: '#FFF8E1', border: '1px solid #FFE082' }}>
        <IndianRupee className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span><strong>Payment gateway coming soon.</strong> No charge will be applied during this pilot. Your appointment will be confirmed immediately.</span>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-3 rounded-xl font-semibold text-sm border-2" style={{ borderColor: '#0F2557', color: '#0F2557' }}>Back</button>
        <button onClick={() => onNext({ payment_method: method })} disabled={submitting}
          className="flex-1 py-3 rounded-xl font-semibold text-sm text-white transition-opacity"
          style={{ background: '#CC1414', opacity: submitting ? 0.6 : 1 }}>
          {submitting ? 'Confirming...' : `Confirm & Book ₹${total.toLocaleString('en-IN')}`}
        </button>
      </div>
    </div>
  )
}

// Step 4: Confirmed
function ConfirmedStep({ booking }) {
  const [copied, setCopied] = useState(false)
  const navigate = useNavigate()
  const copy = () => { navigator.clipboard.writeText(booking.confirmation_code); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-green-500" />
      </div>
      <h3 className="text-xl font-bold mb-1" style={{ color: '#0F2557' }}>Booking Confirmed!</h3>
      <p className="text-gray-500 text-sm mb-6">Your appointment is booked. Save your confirmation code.</p>

      <div className="rounded-2xl p-5 mb-5 mx-auto max-w-xs" style={{ background: '#EEF2FF', border: '2px solid #93c5fd' }}>
        <p className="text-xs text-gray-500 mb-1">Confirmation Code</p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl font-bold tracking-widest" style={{ color: '#0F2557' }}>{booking.confirmation_code}</span>
          <button onClick={copy} className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" style={{ color: '#0F2557' }} />}
          </button>
        </div>
      </div>

      {/* Under development banner */}
      <div className="rounded-xl px-4 py-3 mb-5 text-xs text-amber-700 text-left flex gap-2 items-start mx-auto max-w-xs" style={{ background: '#FFF8E1', border: '1px solid #FFE082' }}>
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span><strong>Pilot Mode:</strong> This booking flow is fully functional and under active development. Payment processing will be live before public launch.</span>
      </div>

      <div className="rounded-xl p-3 mb-5 text-xs text-left flex items-start gap-2 mx-auto max-w-xs" style={{ background: '#0F255708', border: '1px solid #0F255720' }}>
        <User className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#0F2557' }} />
        <span className="text-gray-600">Track in <a href={PATIENT_URL} target="_blank" rel="noopener noreferrer" className="font-semibold underline" style={{ color: '#CC1414' }}>My Health Portal</a> — log in with the same mobile number.</span>
      </div>

      <div className="flex gap-3 justify-center">
        <button onClick={() => navigate(`/booking/${booking.confirmation_code}`)} className="py-2.5 px-5 rounded-xl font-semibold text-sm border-2" style={{ borderColor: '#0F2557', color: '#0F2557' }}>Check Status</button>
        <button onClick={() => navigate('/clinics')} className="py-2.5 px-5 rounded-xl font-semibold text-sm text-white" style={{ background: '#CC1414' }}>Find More Doctors</button>
      </div>
    </div>
  )
}

// ── Doctor Card (right panel) ─────────────────────────────────────────────────

function DoctorPanel({ doctor, slotData }) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 sticky top-20">
      {/* Avatar + name */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-white text-2xl"
          style={{ background: 'linear-gradient(135deg, #0F2557 0%, #1a3a7a 100%)' }}>
          {doctor.photo_url
            ? <img src={doctor.photo_url} alt={doctor.name} className="w-16 h-16 rounded-2xl object-cover" />
            : (doctor.name || 'D').charAt(0)}
        </div>
        <div>
          <h3 className="font-bold text-base leading-tight" style={{ color: '#0F2557' }}>{/^dr\.?\s/i.test(doctor.name) ? doctor.name : `Dr. ${doctor.name}`}</h3>
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#CC141415', color: '#CC1414' }}>{doctor.specialty}</span>
          {doctor.mci_verified && (
            <div className="flex items-center gap-1 mt-1.5">
              <Shield className="w-3 h-3 text-green-600" />
              <span className="text-xs text-green-700 font-medium">MCI Verified</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1.5 text-xs text-gray-500 mb-4">
        {doctor.experience_years > 0 && <div className="flex gap-2"><Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{doctor.experience_years} years experience</div>}
        {doctor.clinic && <div className="flex gap-2"><Building2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#0F2557' }} />{doctor.clinic.name}</div>}
        {doctor.clinic?.city && <div className="flex gap-2"><MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#CC1414' }} />{doctor.clinic.city}{doctor.clinic.state ? `, ${doctor.clinic.state}` : ''}</div>}
      </div>

      <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-400">Consultation Fee</div>
          <div className="font-bold text-base" style={{ color: '#0F2557' }}>₹{(doctor.fee || 0).toLocaleString('en-IN')}</div>
        </div>
        {doctor.telehealth_enabled && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold" style={{ background: '#F5821E15', color: '#F5821E' }}>
            <Video className="w-3 h-3" />Telehealth
          </span>
        )}
      </div>

      {slotData?.date && slotData?.slot && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-400 mb-1">Selected Appointment</div>
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#0F2557' }}>
            <Calendar className="w-4 h-4" />
            {slotData.date} at {fmt12(slotData.slot)}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DoctorProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [doctor, setDoctor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [booking, setBooking] = useState(false)
  const [step, setStep] = useState(0)
  const [slotData, setSlotData] = useState(null)
  const [patientData, setPatientData] = useState(null)
  const [confirmed, setConfirmed] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    publicApi.getDoctor(id)
      .then(d => setDoctor(d))
      .catch(() => setError('Doctor not found.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSlot = (data) => { setSlotData(data); setStep(1) }
  const handleDetails = (data) => { setPatientData(data); setStep(2) }
  const handlePayment = async () => {
    setSubmitting(true); setSubmitError('')
    try {
      const result = await publicApi.bookAppointment({
        clinic_id: doctor.clinic?.id,
        branch_id: doctor.clinic?.default_branch_id || null,
        doctor_id: doctor.id,
        booking_date: slotData.date,
        booking_time: slotData.slot,
        patient_name: patientData.patient_name,
        patient_mobile: patientData.mobile,
        patient_email: patientData.email || undefined,
        reason: patientData.reason || undefined,
      })
      const b = result.booking || result
      setConfirmed({
        confirmation_code: b.confirmation_code || b.code || 'BH' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        doctor_name: doctor.name,
        clinic_name: doctor.clinic?.name,
        date: slotData.date,
        slot: slotData.slot,
        patient_name: patientData.patient_name,
      })
      setStep(3)
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
      <Navbar />
      <div className="flex justify-center py-32">
        <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: '#0F2557', borderTopColor: 'transparent' }} />
      </div>
    </div>
  )

  if (error || !doctor) return (
    <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-700 mb-2">Doctor not found</h2>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
        <Link to="/clinics" className="font-semibold text-sm px-5 py-2.5 rounded-xl text-white" style={{ background: '#CC1414' }}>Browse Doctors</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/clinics" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Find Doctors
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT: Doctor info (full profile when not booking, or condensed) */}
          <div className={booking ? 'lg:col-span-2' : 'lg:col-span-2'}>
            {!booking ? (
              /* ── Full Doctor Profile ── */
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 md:p-8">
                {/* Header */}
                <div className="flex items-start gap-5 mb-6">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-white text-3xl"
                    style={{ background: 'linear-gradient(135deg, #0F2557 0%, #1a3a7a 100%)' }}>
                    {doctor.photo_url
                      ? <img src={doctor.photo_url} alt={doctor.name} className="w-20 h-20 rounded-2xl object-cover" />
                      : (doctor.name || 'D').charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold mb-1" style={{ color: '#0F2557' }}>{/^dr\.?\s/i.test(doctor.name) ? doctor.name : `Dr. ${doctor.name}`}</h1>
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold mb-2" style={{ background: '#CC141415', color: '#CC1414' }}>{doctor.specialty}</span>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                      {doctor.qualification && <span>{doctor.qualification}</span>}
                      {doctor.experience_years > 0 && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{doctor.experience_years} years exp</span>}
                      {doctor.mci_verified && <span className="flex items-center gap-1 text-green-700"><Shield className="w-3.5 h-3.5" />MCI Verified</span>}
                    </div>
                  </div>
                </div>

                {/* Bio */}
                {doctor.bio && (
                  <div className="mb-6">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-2">About</h2>
                    <p className="text-gray-600 text-sm leading-relaxed">{doctor.bio}</p>
                  </div>
                )}

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {doctor.languages && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Languages</div>
                      <div className="text-sm font-medium text-gray-700">{typeof doctor.languages === 'string' ? doctor.languages : doctor.languages.join(', ')}</div>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Consultation Fee</div>
                    <div className="text-lg font-bold" style={{ color: '#0F2557' }}>₹{(doctor.fee || 0).toLocaleString('en-IN')}</div>
                  </div>
                  {doctor.telehealth_enabled && doctor.telehealth_fee && (
                    <div className="bg-orange-50 rounded-xl p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-orange-400 mb-1">Telehealth Fee</div>
                      <div className="text-lg font-bold text-orange-600">₹{doctor.telehealth_fee.toLocaleString('en-IN')}</div>
                    </div>
                  )}
                </div>

                {/* Practices at */}
                {doctor.clinic && (
                  <div className="border-t border-gray-100 pt-5">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-3">Practices At</h2>
                    <Link to={`/clinics/${doctor.clinic.slug}`}
                      className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all group">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#0F255715' }}>
                        <Building2 className="w-5 h-5" style={{ color: '#0F2557' }} />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm group-hover:underline" style={{ color: '#0F2557' }}>{doctor.clinic.name}</div>
                        {doctor.clinic.address && <div className="text-xs text-gray-500 mt-0.5">{doctor.clinic.address}</div>}
                        <div className="text-xs text-gray-400 mt-0.5">{doctor.clinic.city}{doctor.clinic.state ? `, ${doctor.clinic.state}` : ''}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 mt-1 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                )}

                <button onClick={() => setBooking(true)}
                  className="mt-6 w-full py-3.5 rounded-xl font-bold text-white text-sm transition-opacity hover:opacity-90"
                  style={{ background: '#CC1414' }}>
                  Book Appointment
                </button>
              </div>
            ) : (
              /* ── Booking Flow ── */
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => { if (step === 0) setBooking(false); else setStep(s => s - 1) }}
                    className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                    <ArrowLeft className="w-4 h-4 text-gray-500" />
                  </button>
                  <h2 className="font-bold text-lg" style={{ color: '#0F2557' }}>Book Appointment</h2>
                </div>

                <StepBar current={step} />

                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-red-600 text-sm">{submitError}</div>
                )}

                {step === 0 && <SlotStep doctor={doctor} onNext={handleSlot} />}
                {step === 1 && <DetailsStep onNext={handleDetails} onBack={() => setStep(0)} />}
                {step === 2 && <PaymentStep doctor={doctor} slotData={slotData} onNext={handlePayment} onBack={() => setStep(1)} submitting={submitting} />}
                {step === 3 && confirmed && <ConfirmedStep booking={confirmed} />}
              </div>
            )}
          </div>

          {/* RIGHT: shown only during booking flow */}
          {booking && (
            <div className="lg:col-span-1">
              <DoctorPanel doctor={doctor} slotData={slotData} />
            </div>
          )}

          {/* RIGHT: simple action card on profile view */}
          {!booking && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 sticky top-20">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Consultation Fee</div>
                <div className="text-2xl font-bold mb-4" style={{ color: '#0F2557' }}>₹{(doctor.fee || 0).toLocaleString('en-IN')}</div>
                {doctor.telehealth_enabled && doctor.telehealth_fee && (
                  <div className="mb-4 p-3 rounded-xl" style={{ background: '#F5821E10' }}>
                    <div className="text-xs font-semibold uppercase tracking-wide text-orange-400 mb-0.5">Telehealth Fee</div>
                    <div className="text-lg font-bold text-orange-500">₹{doctor.telehealth_fee.toLocaleString('en-IN')}</div>
                    <div className="text-xs text-orange-400 mt-0.5">Video consultation</div>
                  </div>
                )}
                <button onClick={() => setBooking(true)}
                  className="w-full py-3 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-opacity"
                  style={{ background: '#CC1414' }}>
                  Book Appointment
                </button>
                <p className="text-xs text-gray-400 text-center mt-3">No payment until confirmation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
