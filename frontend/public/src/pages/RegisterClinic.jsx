import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2, ChevronRight, Check, CheckCircle, ArrowLeft,
  Mail, Phone, Upload, X, MapPin, Search, Plus
} from 'lucide-react'
import { publicApi } from '../api/client'
import Navbar from '../components/Navbar'

const STEPS = ['Health Center Info', 'Primary Doctor / Contact', 'Review & Submit']

const HEALTH_CENTER_TYPES = [
  // Outpatient
  'Single Doctor Clinic',
  'Group Practice / Polyclinic',
  'Multispecialty Clinic',
  // Hospital
  'Nursing Home',
  'Small Hospital',
  'Large Hospital',
  'Maternity & Nursing Home',
  // Specialty
  'Dental Clinic',
  'Eye Care Centre',
  'Skin & Cosmetic Clinic',
  'Mother & Child Care Centre',
  'Orthopaedic & Spine Centre',
  'Heart & Vascular Centre',
  'Cancer Care Centre',
  'Mental Health Centre',
  // Allied
  'Physiotherapy & Rehabilitation Centre',
  'Ayurveda / Naturopathy Centre',
  'Homeopathy Clinic',
  'Unani Clinic',
  'Siddha Clinic',
  // Diagnostics
  'Diagnostic Centre / Lab',
  'Radiology & Imaging Centre',
  'Blood Bank',
  // Other
  'Other',
]

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Delhi', 'Jammu & Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
]

// ── Location Picker (Nominatim / OpenStreetMap) ──────────────────────────────
function LocationPicker({ lat, lng, address, city, state, onChange }) {
  const [query, setQuery]       = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading]   = useState(false)
  const [showMap, setShowMap]   = useState(!!(lat && lng))
  const debounceRef = useRef(null)

  const search = useCallback((q) => {
    if (!q || q.length < 3) { setSuggestions([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const countryHint = 'India'
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ', ' + countryHint)}&format=json&limit=5&addressdetails=1`
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' } })
        const data = await res.json()
        setSuggestions(data)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 500)
  }, [])

  const pick = (item) => {
    const pickedLat = parseFloat(item.lat)
    const pickedLng = parseFloat(item.lon)
    const addr = item.address || {}
    onChange({
      latitude:  pickedLat,
      longitude: pickedLng,
      address:   item.display_name,
      city:      addr.city || addr.town || addr.village || addr.county || '',
      state:     addr.state || '',
      pincode:   addr.postcode || '',
    })
    setQuery(item.display_name)
    setSuggestions([])
    setShowMap(true)
  }

  const mapSrc = lat && lng
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}&layer=mapnik&marker=${lat},${lng}`
    : null

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Location on Map <span className="text-gray-400 font-normal">(optional — helps patients find you)</span>
      </label>

      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); search(e.target.value) }}
          placeholder="Search your clinic address on map…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-transparent"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="border border-gray-200 rounded-xl shadow-lg bg-white mb-2 overflow-hidden z-10 relative">
          {suggestions.map((s, i) => (
            <button key={i} type="button" onMouseDown={() => pick(s)}
              className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 flex items-start gap-2 border-b border-gray-50 last:border-0">
              <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700 line-clamp-2">{s.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {showMap && mapSrc && (
        <div className="relative rounded-xl overflow-hidden border border-gray-200 mb-2" style={{ height: 220 }}>
          <iframe
            title="clinic-location"
            src={mapSrc}
            width="100%"
            height="220"
            style={{ border: 0, display: 'block' }}
            loading="lazy"
          />
          <button
            type="button"
            onClick={() => { onChange({ latitude: null, longitude: null }); setShowMap(false); setQuery('') }}
            className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow text-gray-500 hover:text-red-500"
            title="Clear location">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {lat && lng && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          Pinned: {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      )}
      {!lat && !lng && (
        <p className="text-xs text-gray-400">
          Pinning your location helps patients navigate to your health center.
        </p>
      )}
    </div>
  )
}

// ── Multi-select Specialty Search ─────────────────────────────────────────────
function SpecialtyMultiSelect({ selected, onChange, error }) {
  const [query, setQuery]       = useState('')
  const [allSpecialties, setAll] = useState([])
  const [open, setOpen]         = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    publicApi.getSpecialties().then(data => setAll(data)).catch(() => setAll([]))
  }, [])

  const filtered = query.length >= 1
    ? allSpecialties.filter(s =>
        s.name.toLowerCase().includes(query.toLowerCase()) &&
        !selected.includes(s.name)
      ).slice(0, 10)
    : allSpecialties.filter(s => !selected.includes(s.name)).slice(0, 12)

  const add = (name) => {
    onChange([...selected, name])
    setQuery('')
    inputRef.current?.focus()
  }

  const remove = (name) => onChange(selected.filter(s => s !== name))

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Specialty / Department(s) <span className="text-red-600 ml-0.5">*</span>
        <span className="text-gray-400 font-normal ml-1">(select all that apply)</span>
      </label>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selected.map((s, i) => (
            <span key={s} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: i === 0 ? '#0F255515' : '#f3f4f6', color: i === 0 ? '#0F2557' : '#374151' }}>
              {i === 0 && <span className="text-xs opacity-60 mr-0.5">Primary</span>}
              {s}
              <button type="button" onClick={() => remove(s)} className="ml-0.5 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={selected.length ? 'Add another specialty…' : 'Search specialty (e.g. Cardiology, Orthopaedics)…'}
          className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all ${error ? 'border-red-400 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-100'}`}
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="border border-gray-200 rounded-xl shadow-lg bg-white mt-1 overflow-auto max-h-52 z-20 relative">
          {filtered.map(s => (
            <button key={s.id} type="button" onMouseDown={() => add(s.name)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 flex items-center justify-between border-b border-gray-50 last:border-0">
              <span className="text-gray-800">{s.name}</span>
              <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{s.category}</span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      {selected.length === 0 && (
        <p className="text-xs text-gray-400 mt-1">The first specialty you select becomes the primary one.</p>
      )}
    </div>
  )
}

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-between mb-10 overflow-x-auto pb-2">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center flex-shrink-0">
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
              i < current ? 'bg-green-500 text-white' : i === current ? 'text-white' : 'bg-gray-200 text-gray-500'
            }`} style={i === current ? { background: '#0F2557' } : {}}>
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-xs mt-1.5 font-medium whitespace-nowrap ${i <= current ? 'text-gray-700' : 'text-gray-400'}`}>
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

function Field({ label, required, optional, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-600 ml-0.5">*</span>}
        {optional && <span className="text-gray-400 font-normal ml-1">(optional)</span>}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

const inputCls = (err) =>
  `w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all ${err ? 'border-red-400 focus:ring-red-200' : 'border-gray-300 focus:ring-blue-100'}`

const btnPrimary = { background: '#CC1414' }

// ── Step 1: Health Center Details ────────────────────────────────────────────
function Step1({ data, onChange, onNext }) {
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!data.clinic_name?.trim()) e.clinic_name = 'Health center name is required'
    if (!data.specialty) e.specialty = 'Health center type is required'
    if (!data.city?.trim()) e.city = 'City is required'
    if (!data.state) e.state = 'State is required'
    if (!data.phone?.trim() || !/^[6-9]\d{9}$/.test(data.phone)) e.phone = 'Valid 10-digit phone required'
    if (!data.email?.trim() || !/\S+@\S+\.\S+/.test(data.email)) e.email = 'Valid email required'
    if (!data.address?.trim()) e.address = 'Address is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const inp = (k, extra = {}) => ({
    value: data[k] || '',
    onChange: e => onChange(k, e.target.value),
    className: inputCls(errors[k]),
    ...extra,
  })

  const handleLocationChange = (loc) => {
    Object.entries(loc).forEach(([k, v]) => onChange(k, v))
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: '#0F2557' }}>Health Center Details</h2>
      <p className="text-gray-500 text-sm mb-6">Basic information about your health center or hospital</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Field label="Health Center / Hospital Name" required error={errors.clinic_name}>
            <input type="text" {...inp('clinic_name')} placeholder="e.g. Sunrise Multi-Speciality Hospital" />
          </Field>
        </div>

        <Field label="Type of Health Center" required error={errors.specialty}>
          <select {...inp('specialty')}>
            <option value="">Select type…</option>
            {HEALTH_CENTER_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>

        <Field label="Capacity / Size Description" optional>
          <input
            type="text"
            value={data.capacity_description || ''}
            onChange={e => onChange('capacity_description', e.target.value)}
            className={inputCls(false)}
            placeholder="e.g. 80 beds, 4 OTs, 12-bed ICU"
          />
          <p className="text-xs text-gray-400 mt-1">Describe your capacity in your own words — beds, OTs, ICU, doctors, etc.</p>
        </Field>

        <Field label="State" required error={errors.state}>
          <select {...inp('state')}>
            <option value="">Select state…</option>
            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="City / Town" required error={errors.city}>
          <input type="text" {...inp('city')} placeholder="e.g. Hyderabad" />
        </Field>
        <Field label="Pincode" optional>
          <input type="text" {...inp('pincode')} maxLength={6} placeholder="6-digit pincode" />
        </Field>
        <Field label="Contact Phone" required error={errors.phone}>
          <input type="tel" {...inp('phone')} maxLength={10} placeholder="10-digit number" />
        </Field>
        <Field label="Official Email" required error={errors.email}>
          <input type="email" {...inp('email')} placeholder="info@yourhospital.com" />
        </Field>
        <div className="md:col-span-2">
          <Field label="Full Address" required error={errors.address}>
            <textarea value={data.address || ''} onChange={e => onChange('address', e.target.value)}
              rows={2} placeholder="Street address, area, landmark…"
              className={`${inputCls(errors.address)} resize-none`} />
          </Field>
        </div>

        <div className="md:col-span-2">
          <LocationPicker
            lat={data.latitude}
            lng={data.longitude}
            address={data.address}
            city={data.city}
            state={data.state}
            onChange={handleLocationChange}
          />
        </div>
      </div>
      <button onClick={() => { if (validate()) onNext() }}
        className="mt-8 w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white"
        style={btnPrimary}>
        Continue <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── Step 2: Primary Doctor / Contact ─────────────────────────────────────────
function Step2({ data, onChange, onNext, onBack }) {
  const [errors, setErrors] = useState({})
  const fileRef = useRef(null)

  const validate = () => {
    const e = {}
    if (!data.doctor_name?.trim()) e.doctor_name = 'Full name is required'
    if (!data.doctor_email?.trim() || !/\S+@\S+\.\S+/.test(data.doctor_email)) e.doctor_email = 'Valid email required — login credentials will be sent here'
    if (!data.doctor_phone?.trim() || !/^[6-9]\d{9}$/.test(data.doctor_phone)) e.doctor_phone = 'Valid 10-digit phone required — credentials also sent via SMS'
    if (!data.doctor_specialties?.length) e.doctor_specialties = 'At least one specialty is required'
    if (!data.qualification?.trim()) e.qualification = 'Qualification is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const inp = (k) => ({
    value: data[k] || '',
    onChange: e => onChange(k, e.target.value),
    className: inputCls(errors[k]),
  })

  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: '#0F2557' }}>Primary Doctor / Contact Details</h2>
      <p className="text-gray-500 text-sm mb-2">Details of the primary doctor, owner, or admin contact</p>

      <div className="mb-5 rounded-xl p-3 text-xs flex gap-3 items-start" style={{ background: '#0F255510', border: '1px solid #0F255530' }}>
        <span className="text-lg mt-0.5">🔐</span>
        <p style={{ color: '#0F2557' }}>
          No password needed now. Once your health center is approved, your <strong>username and temporary password</strong> will be sent to the email and phone you provide below.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Full Name" required error={errors.doctor_name}>
          <input type="text" {...inp('doctor_name')} placeholder="Dr. / Mr. / Ms. Full Name" />
        </Field>
        <Field label="Designation / Role" optional>
          <input type="text" {...inp('designation')} placeholder="e.g. Chief Medical Officer, Director" />
        </Field>
        <Field label="Login Email" required error={errors.doctor_email}>
          <input type="email" {...inp('doctor_email')} placeholder="doctor@example.com" />
        </Field>
        <Field label="Mobile Number" required error={errors.doctor_phone}>
          <input type="tel" {...inp('doctor_phone')} maxLength={10} placeholder="10-digit mobile" />
        </Field>

        <div className="md:col-span-2">
          <SpecialtyMultiSelect
            selected={data.doctor_specialties || []}
            onChange={val => onChange('doctor_specialties', val)}
            error={errors.doctor_specialties}
          />
        </div>

        <Field label="Qualification" required error={errors.qualification}>
          <input type="text" {...inp('qualification')} placeholder="e.g. MBBS, MD, MS, BDS, BPT" />
        </Field>
        <Field label="Medical Council Reg. Number" optional>
          <input type="text" {...inp('mci_number')} placeholder="e.g. MH/12345/2010 (if applicable)" />
        </Field>
        <Field label="Experience (years)" optional>
          <input type="number" {...inp('experience_years')} min="0" max="60" placeholder="e.g. 10" />
        </Field>
        <Field label="Consultation Fee (₹)" optional>
          <input type="number" {...inp('fee')} min="0" placeholder="e.g. 500" />
        </Field>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Degree / License / Registration Document <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        {data.license_file ? (
          <div className="flex items-center gap-3 px-4 py-3 border border-green-300 rounded-xl bg-green-50 text-sm">
            <Upload size={16} className="text-green-600 flex-shrink-0" />
            <span className="text-green-700 font-medium truncate flex-1">{data.license_file.name}</span>
            <button type="button" onClick={() => onChange('license_file', null)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
              <X size={16} />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl py-4 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2">
            <Upload size={16} /> Upload PDF, JPG or PNG (max 5 MB)
          </button>
        )}
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f && f.size <= 5 * 1024 * 1024) onChange('license_file', f)
            else if (f) alert('File size must be under 5 MB')
            e.target.value = ''
          }} />
        <p className="text-xs text-gray-400 mt-1">Medical degree, council registration certificate, hospital licence, or any valid practitioner document.</p>
      </div>

      <div className="flex gap-3 mt-8">
        <button onClick={onBack}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 border-2 rounded-xl font-semibold text-sm"
          style={{ borderColor: '#0F2557', color: '#0F2557' }}>Back</button>
        <button onClick={() => { if (validate()) onNext() }}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white"
          style={btnPrimary}>
          Review &amp; Submit <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ── Step 3: Review & Submit ───────────────────────────────────────────────────
function Step3({ data, onBack, onSubmit, submitting, error }) {
  const rows = [
    { label: 'Health Center Name',   value: data.clinic_name },
    { label: 'Type',                 value: data.specialty },
    { label: 'Capacity',             value: data.capacity_description },
    { label: 'City',                 value: data.city },
    { label: 'State',                value: data.state },
    { label: 'Pincode',              value: data.pincode },
    { label: 'Phone',                value: data.phone },
    { label: 'Email',                value: data.email },
    { label: 'Address',              value: data.address },
    { label: 'Map Location',         value: data.latitude ? `${Number(data.latitude).toFixed(5)}, ${Number(data.longitude).toFixed(5)}` : null },
    null,
    { label: 'Contact Name',         value: data.doctor_name },
    { label: 'Designation',          value: data.designation },
    { label: 'Login Email',          value: data.doctor_email },
    { label: 'Mobile',               value: data.doctor_phone },
    { label: 'Specialties',          value: data.doctor_specialties?.join(', ') },
    { label: 'Qualification',        value: data.qualification },
    { label: 'Reg. Number',          value: data.mci_number },
    { label: 'Experience',           value: data.experience_years ? `${data.experience_years} years` : null },
    { label: 'Consultation Fee',     value: data.fee ? `₹${data.fee}` : null },
    { label: 'License Document',     value: data.license_file ? data.license_file.name : null },
  ].filter(r => r === null || r.value)

  let idx = 0
  return (
    <div>
      <h2 className="text-xl font-bold mb-1" style={{ color: '#0F2557' }}>Review Your Details</h2>
      <p className="text-gray-500 text-sm mb-6">Please verify all information before submitting.</p>

      <div className="border border-gray-200 rounded-xl overflow-hidden mb-5">
        {rows.map((row, i) => {
          if (row === null) return <div key={`div-${i}`} className="h-px bg-blue-100" />
          const bg = idx++ % 2 === 0 ? 'bg-white' : 'bg-gray-50'
          return (
            <div key={row.label} className={`flex justify-between items-start px-4 py-3 text-sm ${bg}`}>
              <span className="text-gray-500 font-medium flex-shrink-0 mr-4">{row.label}</span>
              <span className="font-semibold text-right" style={{ color: '#0F2557' }}>{row.value}</span>
            </div>
          )
        })}
      </div>

      <div className="mb-5 rounded-xl p-4 text-sm" style={{ background: '#0F255510', border: '1px solid #0F255530' }}>
        <p className="font-semibold mb-2" style={{ color: '#0F2557' }}>After approval, credentials will be sent to:</p>
        <div className="flex items-center gap-2 text-gray-600 mb-1"><Mail size={14} /> {data.doctor_email}</div>
        <div className="flex items-center gap-2 text-gray-600"><Phone size={14} /> {data.doctor_phone}</div>
        <p className="text-gray-400 text-xs mt-2">Your username and a one-time password will be sent to both. You will be asked to set a permanent password on first login.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm mb-5">{error}</div>
      )}
      <p className="text-xs text-gray-400 mb-6 leading-relaxed">
        By submitting, you agree to Bharath Health Systems' Terms of Service and Privacy Policy. Registration will be reviewed within 24 hours.
      </p>
      <div className="flex gap-3">
        <button onClick={onBack} disabled={submitting}
          className="flex-1 inline-flex items-center justify-center px-6 py-3 border-2 rounded-xl font-semibold text-sm"
          style={{ borderColor: '#0F2557', color: '#0F2557' }}>Back</button>
        <button onClick={onSubmit} disabled={submitting}
          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
          style={btnPrimary}>
          {submitting
            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting…</>
            : 'Submit Registration'}
        </button>
      </div>
    </div>
  )
}

function SuccessScreen({ email }) {
  return (
    <div className="text-center py-8">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-12 h-12 text-green-500" />
      </div>
      <h2 className="text-2xl font-bold mb-3" style={{ color: '#0F2557' }}>Registration Submitted!</h2>
      <p className="text-gray-500 mb-2 max-w-sm mx-auto">
        Thank you for registering with Bharath Health Systems. Your health center is <strong className="text-yellow-600">pending approval</strong>.
      </p>
      <p className="text-gray-400 text-sm mb-8 max-w-sm mx-auto">
        Our team reviews registrations within 24 hours. Once approved, your login credentials will be sent to <strong className="text-gray-600">{email}</strong>.
      </p>
      <div className="rounded-2xl p-6 max-w-sm mx-auto mb-8 text-sm text-left space-y-4"
        style={{ background: '#0F255508', border: '1px solid #0F255520' }}>
        <h3 className="font-semibold" style={{ color: '#0F2557' }}>What happens next?</h3>
        {[
          'Our team verifies your health center and doctor credentials',
          'You receive a username + one-time password via email and SMS',
          'Log in at provider.bharathhealthsystems.com and set your permanent password',
          'Your profile goes live and patients can start booking',
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-5 h-5 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
              style={{ background: '#0F2557' }}>{i + 1}</div>
            <p className="text-gray-600">{step}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/" className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 rounded-xl font-semibold text-sm"
          style={{ borderColor: '#0F2557', color: '#0F2557' }}>Go to Homepage</Link>
        <Link to="/clinics" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white"
          style={{ background: '#CC1414' }}>Find Doctors</Link>
      </div>
    </div>
  )
}

export default function RegisterClinic() {
  const [step, setStep]             = useState(0)
  const [submitted, setSubmitted]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [formData, setFormData]     = useState({})

  const updateField = (key, value) => setFormData(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError('')
    try {
      const specialties = formData.doctor_specialties || []
      await publicApi.registerClinic({
        clinic: {
          name:                 formData.clinic_name,
          specialty:            specialties[0] || formData.specialty || 'General Medicine',
          capacity_description: formData.capacity_description,
          city:                 formData.city,
          state:                formData.state,
          phone:                formData.phone,
          email:                formData.email,
          address:              formData.address,
          pincode:              formData.pincode,
          latitude:             formData.latitude,
          longitude:            formData.longitude,
        },
        doctor: {
          full_name:           formData.doctor_name,
          email:               formData.doctor_email,
          mobile:              formData.doctor_phone,
          qualification:       formData.qualification,
          registration_number: formData.mci_number,
          experience_years:    formData.experience_years ? Number(formData.experience_years) : null,
          consultation_fee:    formData.fee ? Number(formData.fee) : 500,
          specialty:           specialties[0] || '',
          specialties:         specialties,
          designation:         formData.designation,
        },
        admin_email: formData.doctor_email,
      })
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err.message || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
      <Navbar />
      {!submitted && (
        <div className="text-white py-10 px-4" style={{ background: '#0F2557' }}>
          <div className="max-w-3xl mx-auto">
            <Link to="/" className="inline-flex items-center gap-1 text-blue-200 hover:text-white text-sm mb-3">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
            <h1 className="text-2xl font-extrabold">Register Your Health Center</h1>
            <p className="text-blue-200 text-sm mt-1">Clinic, hospital, nursing home or diagnostic centre — free to register.</p>
          </div>
        </div>
      )}
      <div className="max-w-3xl mx-auto px-4 py-10">
        {submitted ? (
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-8">
            <SuccessScreen email={formData.doctor_email} />
          </div>
        ) : (
          <>
            <StepIndicator current={step} />
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 md:p-8">
              {step === 0 && <Step1 data={formData} onChange={updateField} onNext={() => setStep(1)} />}
              {step === 1 && <Step2 data={formData} onChange={updateField} onNext={() => setStep(2)} onBack={() => setStep(0)} />}
              {step === 2 && (
                <Step3 data={formData} onBack={() => setStep(1)} onSubmit={handleSubmit}
                  submitting={submitting} error={submitError} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
