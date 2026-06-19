import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import {
  Calendar, Clock, User, ChevronRight, CheckCircle,
  Phone, ArrowLeft, Search, Building2, IndianRupee,
  Copy, Check, AlertTriangle, RefreshCw, Smartphone
} from 'lucide-react'
import { publicApi } from '../api/client'
import Navbar from '../components/Navbar'
import { PATIENT_URL } from '../constants/urls'

const STEPS = ['Select Doctor', 'Choose Slot', 'Patient Details', 'Payment', 'Confirmation']

const fmt12 = (t) => {
  if (!t) return t
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman & Nicobar Islands','Chandigarh','Dadra & Nagar Haveli','Daman & Diu',
  'Delhi','Jammu & Kashmir','Ladakh','Lakshadweep','Puducherry',
]

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center mb-10">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
              i < current ? 'bg-green-500 text-white'
              : i === current ? 'bg-[#0F2557] text-white'
              : 'bg-gray-200 text-gray-500'
            }`}>
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs mt-1.5 font-medium hidden sm:block ${i <= current ? 'text-gray-700' : 'text-gray-400'}`}>
              {step}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 w-8 sm:w-14 mx-1 sm:mx-2 mb-4 transition-colors ${i < current ? 'bg-green-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// Step 1: Select Health Center + Doctor
function Step1({ onNext }) {
  const [searchText, setSearchText] = useState('')
  const [clinics, setClinics] = useState([])
  const [selectedClinic, setSelectedClinic] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadClinicDetail = async (slug) => {
    setLoading(true)
    try {
      const detail = await publicApi.getClinicBySlug(slug)
      const c = detail.clinic || detail
      setSelectedClinic(c)
      setDoctors(c.doctors || [])
    } catch {
      setError('Could not load health center details.')
    } finally {
      setLoading(false)
    }
  }

  const searchClinics = async () => {
    if (!searchText.trim()) return
    setLoading(true); setError('')
    try {
      const data = await publicApi.getClinics({ q: searchText })
      setClinics(Array.isArray(data) ? data : data.clinics || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const selectClinic = async (clinic) => {
    setClinics([]); setSearchText(''); setSelectedDoctor(null)
    await loadClinicDetail(clinic.slug)
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">Select a Health Center & Doctor</h2>

      {!selectedClinic ? (
        <div>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={searchText}
                onChange={e => setSearchText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchClinics()}
                placeholder="Search health center by name or city..."
                className="input pl-10" />
            </div>
            <button onClick={searchClinics} disabled={loading} className="btn-primary px-5">Search</button>
          </div>
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          {loading && <p className="text-gray-500 text-sm">Searching...</p>}
          {clinics.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {clinics.map(clinic => (
                <button key={clinic.id} onClick={() => selectClinic(clinic)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-[#EEF2FF] transition-colors border-b last:border-0 text-left">
                  <Building2 className="w-5 h-5 text-[#0F2557] flex-shrink-0" />
                  <div>
                    <div className="font-medium text-gray-900">{clinic.name}</div>
                    <div className="text-sm text-gray-500">{clinic.specialty} · {clinic.city}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                </button>
              ))}
            </div>
          )}
          {!loading && clinics.length === 0 && searchText && (
            <p className="text-gray-400 text-sm text-center py-8">No health centers found. Try a different search.</p>
          )}
          <p className="text-gray-400 text-sm text-center mt-8">
            or <Link to="/clinics" className="text-[#0F2557] underline">browse all doctors</Link>
          </p>
        </div>
      ) : (
        <div>
          <div className="bg-[#EEF2FF] rounded-xl p-4 flex items-center gap-3 mb-6">
            <Building2 className="w-6 h-6 text-[#0F2557]" />
            <div className="flex-1">
              <div className="font-semibold text-gray-900">{selectedClinic.name}</div>
              <div className="text-sm text-gray-500">{selectedClinic.specialty} · {selectedClinic.city}</div>
            </div>
            <button onClick={() => { setSelectedClinic(null); setSelectedDoctor(null) }}
              className="text-gray-400 hover:text-red-500 text-xs transition-colors">Change</button>
          </div>

          <h3 className="font-semibold text-gray-800 mb-3">Choose a Doctor</h3>
          {doctors.length === 0 ? (
            <p className="text-gray-400 text-sm">No doctors available for this health center.</p>
          ) : (
            <div className="space-y-3">
              {doctors.map(doctor => (
                <button key={doctor.id} onClick={() => setSelectedDoctor(doctor)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedDoctor?.id === doctor.id
                      ? 'border-[#0F2557] bg-[#EEF2FF]'
                      : 'border-gray-200 hover:border-primary-300 bg-white'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#DBEAFE] rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-[#0F2557]" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{doctor.name}</div>
                      <div className="text-sm text-gray-500">{doctor.specialty}</div>
                    </div>
                    <div className="text-right">
                      {doctor.fee && <div className="text-[#0F2557] font-semibold text-sm">₹{doctor.fee}</div>}
                      {doctor.experience_years && <div className="text-xs text-gray-400">{doctor.experience_years} yrs exp</div>}
                    </div>
                    {selectedDoctor?.id === doctor.id && (
                      <CheckCircle className="w-5 h-5 text-[#0F2557] ml-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          <button onClick={() => selectedDoctor && onNext({ clinic: selectedClinic, doctor: selectedDoctor })}
            disabled={!selectedDoctor}
            className={`mt-8 w-full py-3 rounded-xl font-semibold transition-colors ${
              selectedDoctor ? 'btn-primary' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}>
            Continue <ChevronRight className="w-4 h-4 inline" />
          </button>
        </div>
      )}
    </div>
  )
}

// Step 2: Select date + slot
function Step2({ data, onNext, onBack }) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchSlots = async (d) => {
    setLoading(true); setError(''); setSlots([]); setSelectedSlot(null)
    try {
      const result = await publicApi.getDoctorSlots(data.doctor.id, d, data.clinic?.default_branch_id)
      setSlots(Array.isArray(result) ? result : result.slots || [])
    } catch {
      setError('Could not load slots. Please try another date or contact the clinic.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSlots(date) }, []) // eslint-disable-line

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Choose Date & Time</h2>
      <div className="bg-[#EEF2FF] rounded-xl p-4 flex items-center gap-3 mb-6">
        <User className="w-5 h-5 text-[#0F2557]" />
        <div>
          <div className="font-medium text-gray-900">{data.doctor.name}</div>
          <div className="text-sm text-gray-500">{data.clinic.name}</div>
        </div>
        {data.doctor.fee && <div className="ml-auto text-[#0F2557] font-semibold">₹{data.doctor.fee}</div>}
      </div>

      <div className="mb-6">
        <label className="label">Select Date</label>
        <input type="date" value={date} min={today}
          onChange={e => { setDate(e.target.value); fetchSlots(e.target.value) }}
          className="input max-w-xs" />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-6">
          <div className="w-5 h-5 border-2 border-[#0F2557] border-t-transparent rounded-full animate-spin" />
          Loading available slots...
        </div>
      ) : error ? (
        <p className="text-amber-600 text-sm mb-4 bg-amber-50 p-3 rounded-lg">{error}</p>
      ) : null}

      {slots.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">{slots.length} slots available</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {slots.map(slot => {
              const time = typeof slot === 'string' ? slot : slot.time
              const available = typeof slot === 'object' ? slot.available !== false : true
              return (
                <button key={time} disabled={!available} onClick={() => setSelectedSlot(time)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border-2 transition-all ${
                    !available ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                    : selectedSlot === time ? 'bg-[#0F2557] text-white border-[#0F2557]'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-[#0F2557]/40'
                  }`}>
                  {fmt12(time)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {slots.length === 0 && !loading && (
        <div className="text-center py-10 bg-gray-50 rounded-xl">
          <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No slots available for this date</p>
          <p className="text-gray-400 text-xs mt-1">Try selecting a different date</p>
        </div>
      )}

      <div className="flex gap-3 mt-8">
        <button onClick={onBack} className="btn-outline flex-1">Back</button>
        <button onClick={() => selectedSlot && onNext({ date, slot: selectedSlot })} disabled={!selectedSlot}
          className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${
            selectedSlot ? 'btn-primary' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}>
          Continue
        </button>
      </div>
    </div>
  )
}

// OTP modal
function OtpModal({ mobile, onVerified, onCancel }) {
  const [otp, setOtp] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const inputRef = useRef(null)

  const sendOtp = async () => {
    setSending(true); setError('')
    try {
      await publicApi.sendOtp(mobile)
      setSent(true)
      setTimeout(() => inputRef.current?.focus(), 100)
    } catch {
      setError('Could not send OTP. Try again.')
    } finally {
      setSending(false)
    }
  }

  useEffect(() => { sendOtp() }, []) // eslint-disable-line

  const verify = async () => {
    if (otp.length < 4) return
    setVerifying(true); setError('')
    try {
      const data = await publicApi.verifyOtp(mobile, otp)
      onVerified(data.access_token || data.verified_token || data.token)
    } catch (err) {
      setError(err.message || 'Invalid OTP')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Smartphone className="w-7 h-7 text-[#0F2557]" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg">Verify Mobile</h3>
          <p className="text-sm text-gray-500 mt-1">
            {sent ? `OTP sent to ${mobile}` : 'Sending OTP...'}
          </p>
          <p className="text-xs text-amber-600 mt-1 font-medium">(Dev mode: use 1234)</p>
        </div>

        <div className="mb-4">
          <input ref={inputRef} type="text" inputMode="numeric" maxLength={6}
            value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && verify()}
            placeholder="Enter OTP"
            className="input text-center text-2xl tracking-[0.5em] font-bold" />
        </div>

        {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}

        <button onClick={verify} disabled={otp.length < 4 || verifying}
          className="btn-primary w-full mb-3 disabled:opacity-50">
          {verifying ? 'Verifying…' : 'Verify OTP'}
        </button>
        <div className="flex gap-3">
          <button onClick={sendOtp} disabled={sending} className="btn-outline flex-1 text-sm">
            {sending ? 'Sending…' : 'Resend'}
          </button>
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-gray-500">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// Step 3: Patient details with auto phone lookup + dropdown
function Step3({ data, onNext, onBack }) {
  const [form, setForm] = useState({
    patient_name: '',
    mobile: '',
    email: '',
    reason: '',
    age: '',
    gender: '',
    patient_state: '',
  })
  const [errors, setErrors] = useState({})
  const [lookupLoading, setLookupLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])   // [{ masked_name, name_hint, found }]
  const [showDropdown, setShowDropdown] = useState(false)
  const [showOtp, setShowOtp] = useState(false)
  const [verifiedToken, setVerifiedToken] = useState(null)
  const [profileFilled, setProfileFilled] = useState(false)
  const lookupRef = useRef(null)
  const lookupTimer = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e) => { if (lookupRef.current && !lookupRef.current.contains(e.target)) setShowDropdown(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const f = (k) => ({
    value: form[k],
    onChange: e => setForm(prev => ({ ...prev, [k]: e.target.value }))
  })

  // Auto-lookup as soon as 10 valid digits are entered
  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10)
    setForm(prev => ({ ...prev, mobile: val }))
    setSuggestions([]); setShowDropdown(false); setProfileFilled(false); setVerifiedToken(null)

    clearTimeout(lookupTimer.current)
    if (/^[6-9]\d{9}$/.test(val)) {
      lookupTimer.current = setTimeout(() => doLookup(val), 30)
    }
  }

  const doLookup = async (mobile) => {
    setLookupLoading(true)
    try {
      const d = await publicApi.patientLookup(mobile)
      if (d?.found) {
        // Build suggestions list — backend may return one or multiple names
        const names = d.names || (d.masked_name ? [d.masked_name] : [])
        setSuggestions(names.map(n => ({ masked_name: n, found: true })))
        setShowDropdown(true)
      } else {
        setSuggestions([{ found: false }])
        setShowDropdown(true)
      }
    } catch {
      setSuggestions([])
    } finally {
      setLookupLoading(false)
    }
  }

  const selectSuggestion = (s) => {
    setShowDropdown(false)
    if (s.found) setShowOtp(true)
  }

  const handleOtpVerified = async (token) => {
    setShowOtp(false)
    setVerifiedToken(token)
    try {
      const profile = await publicApi.getPatientProfile(token)
      if (profile) {
        setForm(prev => ({
          ...prev,
          patient_name: profile.full_name || prev.patient_name,
          email: profile.email || prev.email,
          age: profile.age ? String(profile.age) : prev.age,
          gender: profile.gender || prev.gender,
          patient_state: profile.state || profile.patient_state || prev.patient_state,
        }))
        setProfileFilled(true)
      }
    } catch {}
  }

  const validate = () => {
    const e = {}
    if (!form.patient_name.trim()) e.patient_name = 'Name is required'
    if (!form.mobile.trim() || !/^[6-9]\d{9}$/.test(form.mobile)) e.mobile = 'Valid 10-digit mobile number required'
    if (!form.patient_state) e.patient_state = 'State is required for health ID assignment'
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email address'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  return (
    <div>
      {showOtp && (
        <OtpModal
          mobile={form.mobile}
          onVerified={handleOtpVerified}
          onCancel={() => setShowOtp(false)}
        />
      )}

      <h2 className="text-xl font-bold text-gray-900 mb-2">Patient Details</h2>
      <div className="bg-[#EEF2FF] rounded-xl p-4 mb-6 text-sm">
        <div className="grid grid-cols-2 gap-2 text-gray-600">
          <div><span className="font-medium">Doctor:</span> {data.doctor.name}</div>
          <div><span className="font-medium">Health Center:</span> {data.clinic.name}</div>
          <div><span className="font-medium">Date:</span> {data.date}</div>
          <div><span className="font-medium">Time:</span> {fmt12(data.slot)}</div>
          {data.doctor.fee && <div><span className="font-medium">Fee:</span> ₹{data.doctor.fee}</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mobile — auto-lookup with dropdown */}
        <div className="md:col-span-2" ref={lookupRef}>
          <label className="label">Mobile Number <span className="text-red-500">*</span></label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="tel" maxLength={10} value={form.mobile}
              onChange={handleMobileChange}
              onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              placeholder="Enter 10-digit mobile — names auto-suggest"
              className={`input pl-9 ${errors.mobile ? 'border-red-400' : ''}`}
            />
            {lookupLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#0F2557] border-t-transparent rounded-full animate-spin" />
            )}

            {/* Auto-suggest dropdown */}
            {showDropdown && (
              <div className="absolute left-0 top-full mt-1 w-full bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                {suggestions.map((s, i) =>
                  s.found ? (
                    <button key={i} onMouseDown={() => selectSuggestion(s)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors text-left">
                      <div className="w-8 h-8 bg-[#EEF2FF] rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-[#0F2557]" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 text-sm">{s.masked_name}</div>
                        <div className="text-xs text-blue-600">Tap to verify & auto-fill all details</div>
                      </div>
                      <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    </button>
                  ) : (
                    <div key={i} className="px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      No account found — fill details below to register
                    </div>
                  )
                )}
              </div>
            )}
          </div>
          {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>}

          {profileFilled && (
            <div className="mt-2 flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
              <CheckCircle className="w-3.5 h-3.5" /> Profile auto-filled — review and edit if needed
            </div>
          )}
        </div>

        <div>
          <label className="label">Full Name <span className="text-red-500">*</span></label>
          <input {...f('patient_name')} type="text" placeholder="Patient's full name"
            className={`input ${errors.patient_name ? 'border-red-400' : ''}`} />
          {errors.patient_name && <p className="text-red-500 text-xs mt-1">{errors.patient_name}</p>}
        </div>

        <div>
          <label className="label">State <span className="text-red-500">*</span></label>
          <select {...f('patient_state')} className={`input ${errors.patient_state ? 'border-red-400' : ''}`}>
            <option value="">Select state…</option>
            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.patient_state && <p className="text-red-500 text-xs mt-1">{errors.patient_state}</p>}
        </div>

        <div>
          <label className="label">Email Address</label>
          <input {...f('email')} type="email" placeholder="Optional"
            className={`input ${errors.email ? 'border-red-400' : ''}`} />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="label">Age</label>
          <input {...f('age')} type="number" min="0" max="150" placeholder="Patient age" className="input" />
        </div>

        <div>
          <label className="label">Gender</label>
          <select {...f('gender')} className="input">
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="label">Reason for Visit</label>
          <textarea {...f('reason')} rows={3}
            placeholder="Briefly describe symptoms or reason for consultation..."
            className="input resize-none" />
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <button onClick={onBack} className="btn-outline flex-1">Back</button>
        <button onClick={() => { if (validate()) onNext({ ...form, verified_token: verifiedToken }) }}
          className="btn-primary flex-1">
          Continue to Payment
        </button>
      </div>
    </div>
  )
}

// Step 4: Payment (dev mode)
function Step4({ data, onNext, onBack }) {
  const [paymentMode, setPaymentMode] = useState('pay_at_clinic')

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Payment</h2>

      {/* Dev mode notice */}
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 mb-6">
        <span className="text-amber-600 text-xs font-bold uppercase tracking-wider bg-amber-200 px-2 py-0.5 rounded-md">Dev Mode</span>
        <span className="text-amber-700 text-sm">Payment gateway not live — no real charges will occur.</span>
      </div>

      {/* Appointment summary */}
      <div className="bg-[#EEF2FF] rounded-xl p-4 mb-6 text-sm space-y-2">
        <div className="flex justify-between text-gray-600">
          <span>Doctor</span><span className="font-medium text-gray-900">{data.doctor.name}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Date & Time</span><span className="font-medium text-gray-900">{data.date} · {data.slot}</span>
        </div>
        {data.doctor.fee && (
          <div className="flex justify-between font-semibold border-t border-[#93c5fd] pt-2 mt-2 text-gray-900">
            <span>Consultation Fee</span>
            <span className="flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" />{data.doctor.fee}</span>
          </div>
        )}
      </div>

      {/* Payment method */}
      <div className="mb-6">
        <label className="label">Payment Method</label>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setPaymentMode('pay_at_clinic')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              paymentMode === 'pay_at_clinic'
                ? 'border-[#0F2557] bg-[#EEF2FF]'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}>
            <div className="font-semibold text-sm text-gray-900 mb-0.5">Pay at Clinic</div>
            <div className="text-xs text-gray-500">Pay when you visit</div>
          </button>
          <button type="button" disabled
            className="p-4 rounded-xl border-2 border-gray-100 bg-gray-50 text-left opacity-50 cursor-not-allowed relative">
            <div className="font-semibold text-sm text-gray-400 mb-0.5">Pay Online</div>
            <div className="text-xs text-gray-400">Card / UPI / Net Banking</div>
            <span className="absolute top-2 right-2 text-[9px] font-bold bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded">COMING SOON</span>
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-outline flex-1">Back</button>
        <button onClick={() => onNext({ payment_mode: paymentMode, amount_due: data.doctor.fee || null })}
          className="btn-primary flex-1">
          Request Appointment
        </button>
      </div>
    </div>
  )
}

// Step 5: Confirmation with polling
function Step5({ booking }) {
  const [copied, setCopied] = useState(false)
  const [polledStatus, setPolledStatus] = useState(booking.status || 'pending')
  const navigate = useNavigate()
  const pollRef = useRef(null)

  const copyCode = () => {
    navigator.clipboard.writeText(booking.confirmation_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Poll for up to 60s to detect auto-confirmation
  useEffect(() => {
    if (!booking.confirmation_code) return
    let attempts = 0
    pollRef.current = setInterval(async () => {
      attempts++
      try {
        const res = await publicApi.getBookingStatus(booking.confirmation_code)
        const status = (res.booking || res).status
        setPolledStatus(status)
        if (status !== 'pending' || attempts >= 6) clearInterval(pollRef.current)
      } catch {
        if (attempts >= 6) clearInterval(pollRef.current)
      }
    }, 10000)
    return () => clearInterval(pollRef.current)
  }, [booking.confirmation_code])

  const isConfirmed = polledStatus === 'confirmed'

  return (
    <div className="text-center">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isConfirmed ? 'bg-green-100' : 'bg-blue-50'}`}>
        {isConfirmed
          ? <CheckCircle className="w-10 h-10 text-green-500" />
          : <Calendar className="w-10 h-10 text-[#0F2557]" />}
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {isConfirmed ? 'Appointment Confirmed!' : 'Appointment Requested!'}
      </h2>
      <p className="text-gray-500 mb-2">
        {isConfirmed
          ? 'Your appointment has been confirmed. Show the code at reception.'
          : 'Your request has been sent. The health center will confirm it shortly.'}
      </p>
      {!isConfirmed && (
        <div className="flex items-center justify-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-6 max-w-sm mx-auto">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          Checking for confirmation…
        </div>
      )}

      <div className="bg-[#EEF2FF] border-2 border-[#93c5fd] rounded-2xl p-6 mb-6 max-w-sm mx-auto">
        <p className="text-sm text-gray-500 mb-2">Confirmation Code</p>
        <div className="flex items-center justify-center gap-3">
          <span className="text-3xl font-bold text-[#0F2557] tracking-widest">{booking.confirmation_code}</span>
          <button onClick={copyCode} className="p-2 hover:bg-[#DBEAFE] rounded-lg transition-colors" title="Copy code">
            {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-[#0F2557]" />}
          </button>
        </div>
      </div>

      {/* Appointment summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 text-left max-w-sm mx-auto mb-6 space-y-2.5 text-sm">
        {booking.doctor_name && (
          <div className="flex justify-between">
            <span className="text-gray-500">Doctor</span>
            <span className="font-medium">{booking.doctor_name}</span>
          </div>
        )}
        {booking.clinic_name && (
          <div className="flex justify-between">
            <span className="text-gray-500">Health Center</span>
            <span className="font-medium">{booking.clinic_name}</span>
          </div>
        )}
        {booking.date && (
          <div className="flex justify-between">
            <span className="text-gray-500">Date</span>
            <span className="font-medium">{booking.date}</span>
          </div>
        )}
        {booking.slot && (
          <div className="flex justify-between">
            <span className="text-gray-500">Time</span>
            <span className="font-medium">{booking.slot}</span>
          </div>
        )}
        {booking.patient_name && (
          <div className="flex justify-between">
            <span className="text-gray-500">Patient</span>
            <span className="font-medium">{booking.patient_name}</span>
          </div>
        )}
        {booking.payment_mode && (
          <div className="flex justify-between border-t pt-2 mt-1">
            <span className="text-gray-500">Payment</span>
            <span className="font-medium">
              {booking.payment_mode === 'pay_at_clinic' ? 'Pay at Clinic' : booking.payment_mode}
            </span>
          </div>
        )}
        {booking.amount_due && (
          <div className="flex justify-between">
            <span className="text-gray-500">Amount Due</span>
            <span className="font-medium">₹{booking.amount_due}</span>
          </div>
        )}
      </div>

      {/* Refund policy */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 max-w-sm mx-auto mb-6 text-left text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-700">Cancellation & Refund Policy</p>
        <p>Cancel more than 6 hours before: full refund (if paid online).</p>
        <p>Cancel within 6 hours: no refund applies.</p>
        <p>No-show: no refund applies.</p>
      </div>

      {/* Patient portal CTA */}
      <div className="rounded-xl p-4 mb-6 max-w-sm mx-auto text-sm text-left flex items-start gap-3"
        style={{ background: '#0F255708', border: '1px solid #0F255720' }}>
        <User className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#0F2557' }} />
        <p className="text-gray-600">
          Track & manage this appointment in{' '}
          <a href={PATIENT_URL} className="font-semibold underline" style={{ color: '#CC1414' }}>My Health Portal</a>
          {' '}— log in with the same mobile number you used to book.
        </p>
      </div>

      <div className="flex gap-3 justify-center">
        <button onClick={() => navigate(`/booking/${booking.confirmation_code}`)} className="btn-outline">
          Check Status
        </button>
        <button onClick={() => navigate('/clinics')} className="btn-primary">Book Another</button>
      </div>
    </div>
  )
}

export default function BookAppointment() {
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(0)
  const [bookingData, setBookingData] = useState({})
  const [confirmedBooking, setConfirmedBooking] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [autoLoading, setAutoLoading] = useState(
    !!(searchParams.get('clinic') && searchParams.get('doctor'))
  )

  useEffect(() => {
    const clinicSlug = searchParams.get('clinic')
    const doctorId = searchParams.get('doctor')
    if (!clinicSlug || !doctorId) return
    publicApi.getClinicBySlug(clinicSlug)
      .then(detail => {
        const c = detail.clinic || detail
        const d = (c.doctors || []).find(x => String(x.id) === String(doctorId))
        if (d) { setBookingData({ clinic: c, doctor: d }); setStep(1) }
      })
      .catch(() => {})
      .finally(() => setAutoLoading(false))
  }, []) // eslint-disable-line

  const handleStep1 = (data) => { setBookingData(prev => ({ ...prev, ...data })); setStep(1) }
  const handleStep2 = (data) => { setBookingData(prev => ({ ...prev, ...data })); setStep(2) }
  const handleStep3 = (data) => { setBookingData(prev => ({ ...prev, patientData: data })); setStep(3) }
  const handleStep4 = async (payData) => {
    setSubmitting(true); setSubmitError('')
    const { patientData, clinic, doctor, date, slot } = bookingData
    const payload = {
      clinic_id: clinic?.id,
      branch_id: clinic?.default_branch_id || null,
      doctor_id: doctor?.id,
      booking_date: date,
      booking_time: slot,
      patient_name: patientData.patient_name,
      patient_mobile: patientData.mobile,
      patient_email: patientData.email || undefined,
      reason: patientData.reason || undefined,
      patient_state: patientData.patient_state || undefined,
      bh_id_ref: patientData.bh_id || undefined,
      mode: 'offline',
      payment_mode: payData.payment_mode,
      payment_status: 'pending',
      amount_due: payData.amount_due || undefined,
    }
    try {
      const result = await publicApi.bookAppointment(payload)
      const booking = result.booking || result
      setConfirmedBooking({
        confirmation_code: booking.confirmation_code || booking.code || 'BH' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        doctor_name: doctor?.name,
        clinic_name: clinic?.name,
        date,
        slot,
        patient_name: patientData.patient_name,
        payment_mode: payData.payment_mode,
        amount_due: payData.amount_due,
        status: booking.status || 'pending',
      })
      setStep(4)
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <Link to="/clinics" className="inline-flex items-center gap-1 text-gray-500 hover:text-[#0F2557] text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Find Doctors
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-3">Book Appointment</h1>
        </div>

        <StepIndicator current={step} />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          {autoLoading || submitting ? (
            <div className="flex flex-col items-center py-16">
              <div className="w-12 h-12 border-4 border-[#0F2557] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-600 font-medium">
                {autoLoading ? 'Loading doctor details...' : 'Submitting your request...'}
              </p>
            </div>
          ) : (
            <>
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-600 text-sm flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {submitError}
                </div>
              )}
              {step === 0 && <Step1 onNext={handleStep1} />}
              {step === 1 && <Step2 data={bookingData} onNext={handleStep2} onBack={() => setStep(0)} />}
              {step === 2 && <Step3 data={bookingData} onNext={handleStep3} onBack={() => setStep(1)} />}
              {step === 3 && <Step4 data={bookingData} onNext={handleStep4} onBack={() => setStep(2)} />}
              {step === 4 && confirmedBooking && <Step5 booking={confirmedBooking} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
