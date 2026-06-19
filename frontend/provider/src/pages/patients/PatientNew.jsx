import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'
import { patientsApi } from '../../api'
import {
  ArrowLeft, Save, User, Phone, Plus, Trash2,
  CheckCircle, Lock, Unlock, Smartphone, Search, MapPin
} from 'lucide-react'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman & Nicobar Islands','Chandigarh','Delhi','Jammu & Kashmir',
  'Ladakh','Lakshadweep','Puducherry',
]

const ADDRESS_LABELS = ['Home', 'Work', 'Permanent', 'Other']

function OtpModal({ mobile, onVerified, onCancel }) {
  const [otp, setOtp] = useState('')
  const [sending, setSending] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const sendOtp = async () => {
    setSending(true); setError('')
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'https://bharatcliniq-api.onrender.com'}/api/v1/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      })
      setTimeout(() => inputRef.current?.focus(), 100)
    } catch {
      setError('Could not send OTP. Try again.')
    } finally {
      setSending(false)
    }
  }

  useState(() => { sendOtp() }, []) // eslint-disable-line

  const verify = async () => {
    if (otp.length < 4) return
    setVerifying(true); setError('')
    try {
      const base = import.meta.env.VITE_API_URL || 'https://bharatcliniq-api.onrender.com'
      const res = await fetch(`${base}/api/v1/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Invalid OTP')
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
            <Smartphone size={28} className="text-blue-700" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg">Verify Mobile</h3>
          <p className="text-sm text-gray-500 mt-1">OTP sent to {mobile}</p>
          <p className="text-xs text-amber-600 mt-1 font-medium">(Dev mode: use 1234)</p>
        </div>

        <input ref={inputRef} type="text" inputMode="numeric" maxLength={6}
          value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && verify()}
          placeholder="Enter OTP"
          className="input text-center text-2xl tracking-[0.5em] font-bold mb-4" />

        {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}

        <button onClick={verify} disabled={otp.length < 4 || verifying}
          className="btn-primary w-full mb-3 disabled:opacity-50">
          {verifying ? 'Verifying…' : 'Verify OTP'}
        </button>
        <div className="flex gap-3">
          <button onClick={sendOtp} disabled={sending} className="btn-secondary flex-1 text-sm">
            {sending ? 'Sending…' : 'Resend'}
          </button>
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl border text-sm font-medium text-gray-500">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// Phone-first lookup bar
function PhoneLookupBar({ onAutoFill }) {
  const [mobile, setMobile] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupResult, setLookupResult] = useState(null)
  const [showOtp, setShowOtp] = useState(false)
  const [filled, setFilled] = useState(false)

  const lookup = async () => {
    if (!/^[6-9]\d{9}$/.test(mobile)) return
    setLookupLoading(true); setLookupResult(null)
    try {
      const data = await api.get('/patients/lookup', { params: { mobile } })
      setLookupResult(data?.found ? data : { found: false })
    } catch {
      setLookupResult({ found: false })
    } finally {
      setLookupLoading(false)
    }
  }

  const handleOtpVerified = async (token) => {
    setShowOtp(false)
    try {
      const profile = await api.get('/public/patient-profile', { params: { verified_token: token } })
      if (profile) {
        onAutoFill({ ...profile, mobile })
        setFilled(true)
      }
    } catch {
      // Use whatever the lookup returned
      if (lookupResult) {
        onAutoFill({ full_name: lookupResult.full_name, mobile })
        setFilled(true)
      }
    }
  }

  if (filled) {
    return (
      <div className="card p-4 border-green-200 bg-green-50 flex items-center gap-3">
        <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-green-800">Profile auto-filled from verified account</p>
          <p className="text-xs text-green-600">Review and edit any field below before saving</p>
        </div>
        <button onClick={() => { setFilled(false); setLookupResult(null); setMobile('') }}
          className="text-xs text-green-700 underline">Reset</button>
      </div>
    )
  }

  return (
    <>
      {showOtp && <OtpModal mobile={mobile} onVerified={handleOtpVerified} onCancel={() => setShowOtp(false)} />}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Phone size={15} className="text-blue-700" />
          <span className="text-sm font-semibold text-gray-800">Lookup existing patient by mobile</span>
          <span className="text-xs text-gray-400 ml-auto">Auto-fill from BharatClinicQ Health ID</span>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="tel" maxLength={10} value={mobile}
              onChange={e => { setMobile(e.target.value); setLookupResult(null) }}
              onKeyDown={e => e.key === 'Enter' && lookup()}
              placeholder="10-digit mobile number"
              className="input pl-9" />
          </div>
          <button onClick={lookup} disabled={!/^[6-9]\d{9}$/.test(mobile) || lookupLoading}
            className="btn-primary px-4 disabled:opacity-40">
            {lookupLoading ? 'Looking…' : 'Look up'}
          </button>
        </div>

        {lookupResult && lookupResult.found && (
          <div className="mt-3 flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-2">
              <CheckCircle size={15} className="text-blue-600" />
              <span className="text-sm text-blue-800">
                Found: <strong>{lookupResult.masked_name || lookupResult.full_name}</strong>
                {lookupResult.bh_id && <span className="ml-2 text-xs text-blue-500">BHID: {lookupResult.bh_id}</span>}
              </span>
            </div>
            <button onClick={() => setShowOtp(true)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-700 text-white">
              Verify OTP to auto-fill
            </button>
          </div>
        )}
        {lookupResult && !lookupResult.found && (
          <p className="mt-2 text-xs text-gray-400">No existing profile found — fill in details below to register.</p>
        )}
      </div>
    </>
  )
}

// Multiple address manager
function AddressManager({ addresses, onChange }) {
  const add = () => onChange([...addresses, { label: 'Home', address: '', city: '', state: '', pincode: '' }])
  const remove = (i) => onChange(addresses.filter((_, idx) => idx !== i))
  const update = (i, field, val) => onChange(addresses.map((a, idx) => idx === i ? { ...a, [field]: val } : a))

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2"><MapPin size={16} />Addresses</h2>
        <button type="button" onClick={add}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors">
          <Plus size={13} /> Add Address
        </button>
      </div>

      {addresses.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No addresses added — click Add Address</p>
      ) : (
        <div className="space-y-4">
          {addresses.map((addr, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4 relative">
              <div className="flex items-center justify-between mb-3">
                <select value={addr.label} onChange={e => update(i, 'label', e.target.value)}
                  className="input w-32 text-sm py-1.5">
                  {ADDRESS_LABELS.map(l => <option key={l}>{l}</option>)}
                </select>
                {addresses.length > 1 && (
                  <button type="button" onClick={() => remove(i)}
                    className="text-red-400 hover:text-red-600 transition-colors p-1">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="label">Street Address</label>
                  <input className="input" placeholder="Flat, Building, Street…"
                    value={addr.address} onChange={e => update(i, 'address', e.target.value)} />
                </div>
                <div>
                  <label className="label">City</label>
                  <input className="input" placeholder="City" value={addr.city}
                    onChange={e => update(i, 'city', e.target.value)} />
                </div>
                <div>
                  <label className="label">State</label>
                  <select className="input" value={addr.state} onChange={e => update(i, 'state', e.target.value)}>
                    <option value="">Select state…</option>
                    {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Pincode</label>
                  <input className="input" placeholder="6-digit pincode" maxLength={6}
                    value={addr.pincode} onChange={e => update(i, 'pincode', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// DOB field with lock-after-entry UX
function DobField({ value, onChange }) {
  const [locked, setLocked] = useState(false)
  const [unlocking, setUnlocking] = useState(false)

  const handleChange = (e) => {
    onChange(e.target.value)
    if (e.target.value && !locked) setLocked(false) // stays unlocked on create
  }

  const requestUnlock = () => {
    if (window.confirm('Date of birth should be entered carefully. Are you sure you want to edit it?')) {
      setLocked(false); setUnlocking(false)
    }
  }

  return (
    <div>
      <label className="label flex items-center gap-1.5">
        Date of Birth
        {value && (
          <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
            Verify carefully — hard to change later
          </span>
        )}
      </label>
      {locked ? (
        <div className="flex items-center gap-2">
          <div className="input flex-1 bg-gray-50 text-gray-700 flex items-center gap-2">
            <Lock size={13} className="text-gray-400" />
            {new Date(value + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <button type="button" onClick={requestUnlock}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-gray-300 text-gray-600 hover:border-blue-300 hover:text-blue-700 transition-colors">
            <Unlock size={12} /> Edit
          </button>
        </div>
      ) : (
        <input className="input" type="date"
          value={value} onChange={handleChange}
          onBlur={() => { if (value) setLocked(true) }} />
      )}
    </div>
  )
}

export default function PatientNew() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: '', mobile: '', email: '', date_of_birth: '', gender: '',
    blood_group: '', allergies: '',
    emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
    bh_id: '', occupation: '', nationality: 'Indian',
  })
  const [addresses, setAddresses] = useState([{ label: 'Home', address: '', city: '', state: '', pincode: '' }])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const setVal = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleAutoFill = (profile) => {
    setForm(f => ({
      ...f,
      full_name: profile.full_name || f.full_name,
      mobile: profile.mobile || f.mobile,
      email: profile.email || f.email,
      date_of_birth: profile.date_of_birth || profile.dob || f.date_of_birth,
      gender: profile.gender || f.gender,
      blood_group: profile.blood_group || f.blood_group,
      allergies: profile.allergies || f.allergies,
      bh_id: profile.bh_id || f.bh_id,
      occupation: profile.occupation || f.occupation,
      nationality: profile.nationality || f.nationality,
    }))
    if (profile.addresses?.length) {
      setAddresses(profile.addresses)
    } else if (profile.address || profile.city) {
      setAddresses([{
        label: 'Home',
        address: profile.address || '',
        city: profile.city || '',
        state: profile.state || '',
        pincode: profile.pincode || '',
      }])
    }
    if (profile.emergency_contact_name) {
      setForm(f => ({
        ...f,
        emergency_contact_name: profile.emergency_contact_name,
        emergency_contact_phone: profile.emergency_contact_phone || '',
        emergency_contact_relation: profile.emergency_contact_relation || '',
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.full_name) { setError('Patient name is required'); return }
    setSaving(true); setError('')
    // Flatten addresses for API (primary + additional)
    const primary = addresses[0] || {}
    const payload = {
      ...form,
      address: primary.address,
      city: primary.city,
      state: primary.state,
      pincode: primary.pincode,
      addresses: addresses.length > 1 ? addresses : undefined,
    }
    try {
      const res = await patientsApi.create(payload)
      navigate(`/patients/${res.id}`)
    } catch (err) {
      setError(err.message || 'Failed to register patient')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="page-header mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/patients')} className="btn-secondary p-2">
            <ArrowLeft size={16} />
          </button>
          <h1 className="page-title">Register New Patient</h1>
        </div>
      </div>

      {/* Phone lookup */}
      <div className="mb-5">
        <PhoneLookupBar onAutoFill={handleAutoFill} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Personal Info */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><User size={16} />Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Full Name <span className="text-red-500">*</span></label>
              <input className="input" placeholder="Patient's full name" value={form.full_name} onChange={set('full_name')} required />
            </div>
            <div>
              <label className="label">Mobile</label>
              <input className="input" type="tel" maxLength={10} placeholder="10-digit mobile" value={form.mobile} onChange={set('mobile')} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="patient@email.com" value={form.email} onChange={set('email')} />
            </div>
            <div>
              <DobField value={form.date_of_birth} onChange={v => setVal('date_of_birth', v)} />
            </div>
            <div>
              <label className="label">Gender</label>
              <select className="input" value={form.gender} onChange={set('gender')}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="label">Blood Group</label>
              <select className="input" value={form.blood_group} onChange={set('blood_group')}>
                <option value="">Unknown</option>
                {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Known Allergies</label>
              <input className="input" placeholder="Penicillin, Dust…" value={form.allergies} onChange={set('allergies')} />
            </div>
            <div>
              <label className="label">Occupation</label>
              <input className="input" placeholder="Occupation" value={form.occupation} onChange={set('occupation')} />
            </div>
            <div>
              <label className="label">Nationality</label>
              <input className="input" placeholder="Indian" value={form.nationality} onChange={set('nationality')} />
            </div>
            {form.bh_id && (
              <div>
                <label className="label">BharatCliniq Health ID</label>
                <input className="input bg-green-50 text-green-800 font-mono" value={form.bh_id} readOnly />
              </div>
            )}
          </div>
        </div>

        {/* Addresses */}
        <AddressManager addresses={addresses} onChange={setAddresses} />

        {/* Emergency Contact */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Emergency Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Name</label>
              <input className="input" placeholder="Contact name" value={form.emergency_contact_name} onChange={set('emergency_contact_name')} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" type="tel" maxLength={10} placeholder="Contact phone" value={form.emergency_contact_phone} onChange={set('emergency_contact_phone')} />
            </div>
            <div>
              <label className="label">Relationship</label>
              <select className="input" value={form.emergency_contact_relation} onChange={set('emergency_contact_relation')}>
                <option value="">Select…</option>
                <option>Spouse</option>
                <option>Parent</option>
                <option>Child</option>
                <option>Sibling</option>
                <option>Friend</option>
                <option>Guardian</option>
                <option>Other</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <div className="flex gap-3 pb-8">
          <button type="submit" disabled={saving} className="btn-primary">
            <Save size={16} />
            {saving ? 'Registering…' : 'Register Patient'}
          </button>
          <button type="button" onClick={() => navigate('/patients')} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  )
}
