import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Search, MapPin, Users, ChevronRight, Building2,
  Stethoscope, ArrowLeft, X, Star, Clock, Wifi, WifiOff, Calendar
} from 'lucide-react'
import { publicApi } from '../api/client'
import BrandLogo from '../components/BrandLogo'

const PROVIDER_URL = import.meta.env.VITE_PROVIDER_URL || 'https://provider.bharathhealthsystems.com'
const PATIENT_URL  = import.meta.env.VITE_PATIENT_URL  || 'https://patient.bharathhealthsystems.com'

function Navbar() {
  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/"><BrandLogo size="md" /></Link>
          <div className="hidden md:flex items-center gap-6">
            <Link to="/clinics" className="font-semibold text-sm" style={{ color: '#CC1414' }}>Find Doctors</Link>
            <Link to="/booking/check" className="text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors">My Booking</Link>
            <Link to="/register" className="text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors">Register Health Center</Link>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <a href={PROVIDER_URL} className="px-4 py-2 rounded-xl border-2 font-semibold text-sm transition-all" style={{ borderColor: '#0F2557', color: '#0F2557' }}>Provider Login</a>
            <a href={PATIENT_URL} className="px-4 py-2 rounded-xl font-semibold text-sm text-white transition-all" style={{ background: '#CC1414' }}>My Health Portal</a>
          </div>
        </div>
      </div>
    </nav>
  )
}

const SPECIALTIES = [
  'General Medicine', 'Cardiology', 'Dermatology', 'Pediatrics',
  'Orthopedics', 'Gynecology', 'Neurology', 'Ophthalmology',
  'ENT', 'Psychiatry', 'Dentistry', 'Ayurveda',
  'General Surgery', 'Internal Medicine', 'Physiotherapy',
  'Cosmetology', 'Oncology', 'Urology', 'Nephrology',
]

const CONDITIONS = [
  { term: 'dermatitis', specialty: 'Dermatology' },
  { term: 'eczema', specialty: 'Dermatology' },
  { term: 'acne', specialty: 'Dermatology' },
  { term: 'diabetes', specialty: 'General Medicine' },
  { term: 'hypertension', specialty: 'Cardiology' },
  { term: 'heart disease', specialty: 'Cardiology' },
  { term: 'asthma', specialty: 'General Medicine' },
  { term: 'arthritis', specialty: 'Orthopedics' },
  { term: 'back pain', specialty: 'Orthopedics' },
  { term: 'joint pain', specialty: 'Orthopedics' },
  { term: 'fever', specialty: 'General Medicine' },
  { term: 'cold', specialty: 'General Medicine' },
  { term: 'depression', specialty: 'Psychiatry' },
  { term: 'anxiety', specialty: 'Psychiatry' },
  { term: 'thyroid', specialty: 'Internal Medicine' },
  { term: 'kidney', specialty: 'Nephrology' },
  { term: 'eye', specialty: 'Ophthalmology' },
  { term: 'ear', specialty: 'ENT' },
  { term: 'skin', specialty: 'Dermatology' },
  { term: 'child', specialty: 'Pediatrics' },
]

function SearchSuggestions({ query, doctors, onSelect }) {
  if (!query || query.length < 2) return null
  const q = query.toLowerCase()

  const matchedSpecialties = SPECIALTIES.filter(s => s.toLowerCase().includes(q)).slice(0, 3)
  const matchedConditions = CONDITIONS.filter(c => c.term.includes(q)).slice(0, 3)
  const matchedDoctors = doctors.filter(d =>
    (d.name || '').toLowerCase().includes(q) ||
    (d.specialty || '').toLowerCase().includes(q)
  ).slice(0, 4)

  if (!matchedSpecialties.length && !matchedConditions.length && !matchedDoctors.length) return null

  return (
    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
      {matchedSpecialties.length > 0 && (
        <div>
          <div className="px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Specialties</div>
          {matchedSpecialties.map(s => (
            <button key={s} onMouseDown={() => onSelect(s, 'specialty')}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-left transition-colors">
              <Stethoscope className="w-4 h-4 flex-shrink-0" style={{ color: '#CC1414' }} />
              <span className="text-sm font-medium text-gray-800">{s}</span>
            </button>
          ))}
        </div>
      )}
      {matchedConditions.length > 0 && (
        <div className={matchedSpecialties.length ? 'border-t border-gray-100' : ''}>
          <div className="px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Conditions</div>
          {matchedConditions.map(c => (
            <button key={c.term} onMouseDown={() => onSelect(c.term, 'q')}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-left transition-colors">
              <Search className="w-4 h-4 flex-shrink-0 text-gray-400" />
              <span className="text-sm text-gray-700">{c.term}</span>
              <span className="ml-auto text-xs text-gray-400">{c.specialty}</span>
            </button>
          ))}
        </div>
      )}
      {matchedDoctors.length > 0 && (
        <div className={(matchedSpecialties.length || matchedConditions.length) ? 'border-t border-gray-100' : ''}>
          <div className="px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-wide text-gray-400">Doctors</div>
          {matchedDoctors.map(d => (
            <button key={d.id} onMouseDown={() => onSelect(d.name, 'q')}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-left transition-colors">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: '#0F2557' }}>
                {(d.name || 'D').charAt(0)}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-800">{d.name}</div>
                <div className="text-xs text-gray-400">{d.specialty} · {d.city}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function StarRating({ rating = 0, max = 5 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className="w-3.5 h-3.5"
          style={{ fill: i < rating ? '#F5821E' : '#E5E7EB', color: i < rating ? '#F5821E' : '#E5E7EB' }}
        />
      ))}
    </div>
  )
}

function DoctorCard({ doctor }) {
  const isOnline = doctor.is_online || doctor.telehealth_available || doctor.telehealth_enabled

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 hover:shadow-lg transition-all">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-bold text-lg"
          style={{ background: '#0F2557' }}>
          {doctor.photo_url
            ? <img src={doctor.photo_url} alt={doctor.name} className="w-14 h-14 rounded-2xl object-cover" />
            : (doctor.name || 'D').charAt(0).toUpperCase()
          }
        </div>

        <div className="flex-1 min-w-0">
          {/* Name */}
          <h3 className="font-bold text-lg leading-tight" style={{ color: '#0F2557' }}>
            {doctor.name}
          </h3>

          {/* Specialty badge */}
          {doctor.specialty && (
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: '#CC141415', color: '#CC1414' }}>
              {doctor.specialty}
            </span>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {/* Experience */}
            {(doctor.experience_years !== undefined && doctor.experience_years !== null) && (
              <div className="flex items-center gap-1 text-gray-500 text-xs">
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span>{doctor.experience_years} yrs exp</span>
              </div>
            )}

            {/* City */}
            {(doctor.city || doctor.location) && (
              <div className="flex items-center gap-1 text-gray-500 text-xs">
                <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: '#CC1414' }} />
                <span className="truncate">{doctor.city || doctor.location}</span>
              </div>
            )}

            {/* Health center */}
            {(doctor.clinic_name || doctor.health_center_name) && (
              <div className="flex items-center gap-1 text-gray-500 text-xs">
                <Building2 className="w-3 h-3 flex-shrink-0" style={{ color: '#0F2557' }} />
                <span className="truncate">{doctor.clinic_name || doctor.health_center_name}</span>
              </div>
            )}

            {/* Working hours */}
            {doctor.working_hours && (
              <div className="flex items-center gap-1 text-gray-500 text-xs">
                <Clock className="w-3 h-3 flex-shrink-0 text-gray-400" />
                <span>{doctor.working_hours}</span>
              </div>
            )}
          </div>

          {/* Online/Offline badge */}
          <div className="mt-2">
            {isOnline ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Available Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span> In-Person Only
              </span>
            )}
          </div>

          {doctor.rating > 0 && (
            <div className="mt-1.5">
              <StarRating rating={Math.round(doctor.rating)} />
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
        <Link
          to={`/doctor/${doctor.id}`}
          className="flex-1 text-center text-sm font-semibold py-2 rounded-xl border-2 transition-all"
          style={{ borderColor: '#0F2557', color: '#0F2557' }}
        >
          View Profile
        </Link>
        <Link
          to={`/doctor/${doctor.id}`}
          className="flex-1 text-center text-sm font-semibold py-2 rounded-xl text-white transition-all"
          style={{ background: '#CC1414' }}
          onMouseEnter={e => e.currentTarget.style.background = '#b01010'}
          onMouseLeave={e => e.currentTarget.style.background = '#CC1414'}
        >
          Book Appointment
        </Link>
      </div>
    </div>
  )
}

function ClinicCard({ clinic }) {
  return (
    <Link to={`/clinics/${clinic.slug}`} className="block bg-white rounded-2xl shadow-md border border-gray-100 p-5 hover:shadow-lg transition-all group cursor-pointer">
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all"
          style={{ background: '#0F255710' }}
        >
          {clinic.logo_url ? (
            <img src={clinic.logo_url} alt={clinic.name} className="w-14 h-14 rounded-2xl object-cover" />
          ) : (
            <Building2 className="w-7 h-7" style={{ color: '#0F2557' }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate transition-colors group-hover:text-[#CC1414]" style={{ color: '#0F2557' }}>
            {clinic.name}
          </h3>
          <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
            <Stethoscope className="w-3 h-3 flex-shrink-0" style={{ color: '#F5821E' }} />
            <span className="truncate" title={clinic.specialty || 'Multi-Specialty'}>{clinic.specialty || 'Multi-Specialty'}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
            <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: '#CC1414' }} />
            <span className="truncate">{clinic.city}{clinic.state ? `, ${clinic.state}` : ''}</span>
          </div>
          {clinic.rating > 0 && (
            <div className="mt-1.5">
              <StarRating rating={Math.round(clinic.rating)} />
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
            style={{ background: '#0F255710', color: '#0F2557' }}>
            <Users className="w-3 h-3" />
            {clinic.doctor_count || clinic.doctors?.length || 0} Doctors
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#CC1414] transition-colors" />
        </div>
      </div>
    </Link>
  )
}

function CitySearch({ value, onChange, cities }) {
  const [input, setInput] = useState(value || '')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const filtered = input.trim()
    ? cities.filter(c => c.toLowerCase().startsWith(input.toLowerCase())).sort()
    : [...cities].sort()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (c) => { setInput(c); onChange(c); setOpen(false) }
  const clear = () => { setInput(''); onChange(''); setOpen(false) }

  return (
    <div ref={ref} className="relative md:w-44">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
      <input
        type="text"
        value={input}
        onChange={e => { setInput(e.target.value); onChange(''); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="Search city..."
        className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-white"
        style={{ '--tw-ring-color': '#0F2557' }}
      />
      {input && (
        <button type="button" onClick={clear} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto text-sm">
          <li className="px-3 py-2 cursor-pointer hover:bg-gray-50 text-gray-400 italic" onMouseDown={() => select('')}>All Cities</li>
          {filtered.map(c => (
            <li key={c} className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-gray-700" onMouseDown={() => select(c)}>{c}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function FindClinics() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [allResults, setAllResults] = useState([])
  const [cities, setCities] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchFailed, setFetchFailed] = useState(false)
  const [view, setView] = useState(searchParams.get('view') === 'centers' ? 'centers' : 'doctors')

  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    city: searchParams.get('city') || '',
    specialty: searchParams.get('specialty') || '',
  })
  const [availableDate, setAvailableDate] = useState('')

  // Live search query — updated on every keystroke, not just on form submit
  const [liveQ, setLiveQ] = useState(filters.q)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchRef = useRef(null)

  useEffect(() => {
    publicApi.getCities().then(data => {
      setCities(Array.isArray(data) ? data : data.cities || [])
    }).catch(() => {
      setCities(['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad'])
    })
  }, [])

  const fetchResults = useCallback(async (params) => {
    setLoading(true)
    setFetchFailed(false)
    try {
      const cleanParams = Object.fromEntries(Object.entries(params).filter(([, v]) => v))
      const data = await publicApi.getClinics(cleanParams)
      setAllResults(Array.isArray(data) ? data : data.clinics || data.results || [])
    } catch {
      setFetchFailed(true)
      setAllResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchResults({}) }, []) // eslint-disable-line

  // Flatten doctors out of clinic results, carrying their health center info
  const allDoctors = useMemo(() => allResults.flatMap(c =>
    (c.doctors || []).map(d => ({
      ...d,
      clinic_id: c.id,
      clinic_slug: c.slug,
      clinic_name: c.name,
      city: c.city,
      state: c.state,
    }))
  ), [allResults])

  // Client-side filter applied on every keystroke
  const matchItem = useCallback((item, q, city, specialty) => {
    const name = (item.name || '').toLowerCase()
    const itemSpecialty = (item.specialty || '').toLowerCase()
    const itemCity = (item.city || item.location || '').toLowerCase()
    const clinicName = (item.clinic_name || item.health_center_name || '').toLowerCase()

    const matchesQ = !q || name.includes(q) || itemSpecialty.includes(q) || itemCity.includes(q) || clinicName.includes(q)
    const matchesCity = !city || itemCity.includes(city)
    const matchesSpecialty = !specialty || itemSpecialty.includes(specialty)

    return matchesQ && matchesCity && matchesSpecialty
  }, [])

  const displayed = useMemo(() => {
    const q = liveQ.trim().toLowerCase()
    const city = filters.city.trim().toLowerCase()
    const specialty = filters.specialty.trim().toLowerCase()
    const source = view === 'doctors' ? allDoctors : allResults
    return source.filter(item => matchItem(item, q, city, specialty))
  }, [allResults, allDoctors, view, liveQ, filters.city, filters.specialty, matchItem])

  const handleSearch = (e) => {
    e.preventDefault()
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    if (availableDate) params.available_date = availableDate
    setSearchParams(params)
    setLiveQ(filters.q)
    fetchResults({ ...params })
  }

  const handleDateChange = (d) => {
    setAvailableDate(d)
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    if (d) params.available_date = d
    fetchResults(params)
  }

  const handleSuggestionSelect = (value, field) => {
    setShowSuggestions(false)
    if (field === 'specialty') {
      setFilters(f => ({ ...f, specialty: value, q: '' }))
      setLiveQ('')
    } else {
      setLiveQ(value)
      setFilters(f => ({ ...f, q: value }))
    }
  }

  const clearFilter = (key) => {
    const newFilters = { ...filters, [key]: '' }
    setFilters(newFilters)
    if (key === 'q') setLiveQ('')
    const params = Object.fromEntries(Object.entries(newFilters).filter(([, v]) => v))
    setSearchParams(params)
  }

  const activeFilters = Object.entries(filters).filter(([, v]) => v)

  const comingSoonState = (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">🏥</div>
      <h3 className="text-xl font-bold text-gray-700 mb-2">Doctors Coming Soon</h3>
      <p className="text-gray-500">We're onboarding verified doctors across India. Check back soon!</p>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
      <Navbar />

      {/* Header */}
      <div className="text-white py-10 px-4" style={{ background: '#0F2557' }}>
        <div className="max-w-7xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-1 text-blue-200 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <h1 className="text-3xl font-extrabold mb-1">Find Doctors Near You</h1>
          <p className="text-blue-200">Discover verified doctors and health centers across India — book in minutes</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* View toggle: Doctors | Health Centers */}
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 mb-5 shadow-sm">
          {[
            { key: 'doctors', label: 'Doctors' },
            { key: 'centers', label: 'Health Centers' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
              style={view === tab.key
                ? { background: '#0F2557', color: '#ffffff' }
                : { background: 'transparent', color: '#6b7280' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Filter Bar */}
        <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 z-10" />
              <input
                type="text"
                value={liveQ}
                onChange={e => {
                  setLiveQ(e.target.value)
                  setFilters(f => ({ ...f, q: e.target.value }))
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Doctor name, specialty, condition..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
                style={{ '--tw-ring-color': '#0F2557' }}
              />
              {showSuggestions && (
                <SearchSuggestions query={liveQ} doctors={allDoctors} onSelect={handleSuggestionSelect} />
              )}
            </div>
            {/* Date availability picker */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
              <input
                type="date"
                value={availableDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => handleDateChange(e.target.value)}
                className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-white w-full md:w-44 transition-all"
                style={{ '--tw-ring-color': '#0F2557', colorScheme: 'light' }}
                title="Filter by available date"
              />
              {availableDate && (
                <button type="button" onClick={() => handleDateChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <CitySearch
              value={filters.city}
              onChange={val => setFilters(f => ({ ...f, city: val }))}
              cities={cities}
            />
            <select
              value={filters.specialty}
              onChange={e => setFilters(f => ({ ...f, specialty: e.target.value }))}
              className="md:w-52 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all bg-white"
              style={{ '--tw-ring-color': '#0F2557' }}
            >
              <option value="">All Specialties</option>
              {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white whitespace-nowrap transition-colors"
              style={{ background: '#CC1414' }}
              onMouseEnter={e => e.currentTarget.style.background = '#b01010'}
              onMouseLeave={e => e.currentTarget.style.background = '#CC1414'}
            >
              <Search className="w-4 h-4" /> Search
            </button>
          </div>
        </form>

        {/* Active Filters */}
        {(activeFilters.length > 0 || availableDate) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {activeFilters.map(([key, val]) => (
              <span key={key}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full font-medium"
                style={{ background: '#0F255715', color: '#0F2557' }}>
                {val}
                <button onClick={() => clearFilter(key)} className="hover:opacity-70">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            {availableDate && (
              <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full font-medium"
                style={{ background: '#CC141415', color: '#CC1414' }}>
                <Calendar className="w-3.5 h-3.5" />
                Available {new Date(availableDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                <button onClick={() => handleDateChange('')} className="hover:opacity-70">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mb-4" style={{ borderColor: '#0F2557', borderTopColor: 'transparent' }} />
            <p className="text-gray-500">Searching...</p>
          </div>
        ) : fetchFailed || allResults.length === 0 ? (
          comingSoonState
        ) : displayed.length === 0 ? (
          comingSoonState
        ) : (
          <>
            <p className="text-gray-500 text-sm mb-4 font-medium">
              <span style={{ color: '#0F2557', fontWeight: 700 }}>{displayed.length}</span>{' '}
              {view === 'doctors'
                ? `doctor${displayed.length !== 1 ? 's' : ''}`
                : `health center${displayed.length !== 1 ? 's' : ''}`} found
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {view === 'doctors'
                ? displayed.map(item => <DoctorCard key={`${item.clinic_id}-${item.id}`} doctor={item} />)
                : displayed.map(item => <ClinicCard key={item.id || item.slug} clinic={item} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
