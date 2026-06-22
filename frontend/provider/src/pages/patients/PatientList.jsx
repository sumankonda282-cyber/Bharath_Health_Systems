import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { patientsApi, tagsApi, appointmentsApi, doctorApi } from '../../api'
import { useAuth } from '../../contexts/AuthContext'
import { cachedFetch, TTL } from '../../utils/cache'
import { PageLoader } from '../../components/ui/Spinner'
import { Search, Plus, User, X, Tag, Calendar } from 'lucide-react'

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  scheduled:   { label: 'Scheduled',      color: 'bg-blue-50 text-blue-700 border-blue-200' },
  waiting:     { label: 'Waiting',         color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  triaged:     { label: 'Triaged',         color: 'bg-orange-50 text-orange-700 border-orange-200' },
  in_progress: { label: 'With Doctor',     color: 'bg-purple-50 text-purple-700 border-purple-200' },
  completed:   { label: 'Completed',       color: 'bg-green-50 text-green-700 border-green-200' },
  cancelled:   { label: 'Cancelled',       color: 'bg-red-50 text-red-600 border-red-200' },
}

function StatusBadge({ status }) {
  if (!status) return <span className="text-gray-200 text-xs">—</span>
  const s = STATUS[status] || { label: status, color: 'bg-gray-100 text-gray-600 border-gray-200' }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${s.color}`}>
      {s.label}
    </span>
  )
}

// ── Tag display (capped) ──────────────────────────────────────────────────────
function TagsDisplay({ tags }) {
  if (!tags || tags.length === 0) return <span className="text-gray-300 text-xs">—</span>
  const visible = tags.slice(0, 2)
  const extra = tags.length - 2
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map(t => (
        <span key={t.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
          {t.tag_name}
        </span>
      ))}
      {extra > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
          +{extra} more
        </span>
      )}
    </div>
  )
}

// ── 3-Tier Tag Input ──────────────────────────────────────────────────────────
function TagInput({ patientId, currentTags, onTagsChange }) {
  const [open, setOpen]           = useState(false)
  const [saved, setSaved]         = useState([])
  const [suggestions, setSugs]    = useState([])
  const [freeMode, setFreeMode]   = useState(false)
  const [freeText, setFreeText]   = useState('')
  const [saveToClinic, setSaveToClinic] = useState(false)
  const [loading, setLoading]     = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    cachedFetch(
      'tag_suggestions',
      () => tagsApi.getSuggestions(),
      r => { setSaved(r.saved || []); setSugs(r.suggestions || []) },
      TTL.MEDIUM
    ).catch(() => {})
  }, [open])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isAssigned = (tagName) => currentTags.some(t => t.tag_name === tagName)

  const assign = async (tagName, icd10 = null, save = false) => {
    if (isAssigned(tagName)) return
    setLoading(true)
    try {
      const tag = await patientsApi.assignTag(patientId, { tag_name: tagName, icd10_code: icd10, save_to_clinic: save })
      onTagsChange([...currentTags, tag])
    } finally {
      setLoading(false)
    }
  }

  const remove = async (tagId) => {
    await patientsApi.removeTag(patientId, tagId)
    onTagsChange(currentTags.filter(t => t.id !== tagId))
  }

  const submitFree = async () => {
    if (!freeText.trim()) return
    await assign(freeText.trim(), null, saveToClinic)
    setFreeText('')
    setSaveToClinic(false)
    setFreeMode(false)
  }

  return (
    <div className="relative" ref={ref}>
      <div className="flex flex-wrap items-center gap-1">
        {currentTags.slice(0, 2).map(t => (
          <span key={t.id} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
            {t.tag_name}
            <button onClick={(e) => { e.stopPropagation(); remove(t.id) }} className="hover:text-red-500 ml-0.5">
              <X size={10} />
            </button>
          </span>
        ))}
        {currentTags.length > 2 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
            +{currentTags.length - 2} more
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(v => !v); setFreeMode(false) }}
          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs text-gray-400 border border-dashed border-gray-300 hover:border-blue-400 hover:text-blue-500 transition-colors"
        >
          <Tag size={10} /><span>Add</span>
        </button>
      </div>

      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {saved.length > 0 && (
            <div className="px-3 pt-3 pb-2">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Saved Tags</div>
              <div className="flex flex-wrap gap-1">
                {saved.map(t => (
                  <button
                    key={t.id}
                    disabled={isAssigned(t.tag_name) || loading}
                    onClick={() => assign(t.tag_name, t.icd10_code)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors
                      ${isAssigned(t.tag_name)
                        ? 'bg-blue-100 text-blue-700 border-blue-200 opacity-50 cursor-default'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700'}`}
                  >
                    {isAssigned(t.tag_name) ? '✓ ' : ''}{t.tag_name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className={`px-3 py-2 ${saved.length > 0 ? 'border-t border-gray-100' : 'pt-3'}`}>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Suggested</div>
              <div className="flex flex-wrap gap-1">
                {suggestions.map(s => (
                  <button
                    key={s.tag}
                    disabled={isAssigned(s.tag) || loading}
                    onClick={() => assign(s.tag, s.icd10)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-colors
                      ${isAssigned(s.tag)
                        ? 'bg-blue-100 text-blue-700 border-blue-200 opacity-50 cursor-default'
                        : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600'}`}
                  >
                    {isAssigned(s.tag) ? '✓ ' : ''}{s.tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 px-3 py-2">
            {!freeMode ? (
              <button
                onClick={() => setFreeMode(true)}
                className="w-full text-left text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1 py-1"
              >
                <Plus size={12} /> Free Tag
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  autoFocus
                  className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  placeholder="Type condition..."
                  value={freeText}
                  onChange={e => setFreeText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitFree()}
                />
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input type="checkbox" className="rounded" checked={saveToClinic}
                    onChange={e => setSaveToClinic(e.target.checked)} />
                  Save to clinic tag library
                </label>
                <div className="flex gap-2">
                  <button onClick={() => { setFreeMode(false); setFreeText('') }}
                    className="flex-1 text-xs py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
                    Cancel
                  </button>
                  <button onClick={submitFree} disabled={!freeText.trim() || loading}
                    className="flex-1 text-xs py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PatientList() {
  const { user } = useAuth()
  const isDoctor = user?.role === 'doctor'
  const [patients, setPatients]     = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [todayAppts, setTodayAppts] = useState({})
  const [search, setSearch]         = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [ageFilter, setAgeFilter]       = useState('')
  const [apptFilter, setApptFilter]     = useState('')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [loading, setLoading]       = useState(true)
  const navigate = useNavigate()
  const searchRef = useRef(null)

  const loadPatients = (q = search) => {
    setLoading(true)
    if (isDoctor) {
      doctorApi.getMyPatients(q ? { search: q, limit: 50 } : { limit: 50 })
        .then(r => { setPatients(Array.isArray(r) ? r : []); setLoading(false) })
        .catch(() => setLoading(false))
      return
    }
    if (!q) {
      cachedFetch(
        'patient_list',
        () => patientsApi.list({ limit: 50 }),
        r => { setPatients(Array.isArray(r) ? r : []); setLoading(false) }
      ).catch(() => setLoading(false))
    } else {
      patientsApi.list({ search: q, limit: 50 })
        .then(r => setPatients(Array.isArray(r) ? r : []))
        .finally(() => setLoading(false))
    }
  }

  // Search suggestions
  useEffect(() => {
    if (search.length < 2) { setSuggestions([]); setShowSuggestions(false); return }
    const t = setTimeout(() => {
      const listFn = isDoctor
        ? doctorApi.getMyPatients({ search, limit: 8 })
        : patientsApi.list({ search, limit: 8 })
      listFn
        .then(r => {
          setSuggestions(Array.isArray(r) ? r : [])
          setShowSuggestions(true)
        })
        .catch(() => {})
    }, 200)
    return () => clearTimeout(t)
  }, [search, isDoctor])

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Load today's appointment statuses
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    appointmentsApi.list({ date: today, limit: 200 })
      .then(r => {
        const map = {}
        if (Array.isArray(r)) r.forEach(a => { map[a.patient_id] = a.status })
        setTodayAppts(map)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(() => loadPatients(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const updateTags = (patientId, tags) => {
    setPatients(ps => ps.map(p => p.id === patientId ? { ...p, tags } : p))
  }

  // Derive MRN: prefer clinic_patient_id, fallback uhid, fallback #id
  const getMRN = (p) => {
    if (p.clinic_patient_id && /^[A-Z]/.test(p.clinic_patient_id)) return p.clinic_patient_id
    if (p.uhid) return p.uhid
    if (p.clinic_patient_id) return p.clinic_patient_id
    return `#${p.id}`
  }

  const ageInRange = (age) => {
    if (!ageFilter) return true
    if (ageFilter === '0-12')  return age >= 0 && age <= 12
    if (ageFilter === '13-17') return age >= 13 && age <= 17
    if (ageFilter === '18-40') return age >= 18 && age <= 40
    if (ageFilter === '41-60') return age >= 41 && age <= 60
    if (ageFilter === '60+')   return age > 60
    return true
  }

  const filtered = patients.filter(p => {
    if (genderFilter && p.gender?.toLowerCase() !== genderFilter) return false
    if (ageFilter) {
      const age = p.date_of_birth
        ? Math.floor((Date.now() - new Date(p.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
        : null
      if (age === null || !ageInRange(age)) return false
    }
    if (apptFilter) {
      const s = todayAppts[p.id]
      if (apptFilter === 'none' && s) return false
      if (apptFilter !== 'none' && s !== apptFilter) return false
    }
    if (dateFrom && p.created_at && new Date(p.created_at) < new Date(dateFrom)) return false
    if (dateTo && p.created_at && new Date(p.created_at) > new Date(dateTo + 'T23:59:59')) return false
    return true
  })

  const activeFilters = [genderFilter, ageFilter, apptFilter, dateFrom, dateTo].filter(Boolean).length

  return (
    <div>
      <div className="card">
        {/* Search + Filters */}
        <div className="p-3 border-b border-gray-100 space-y-3">
          <div className="flex gap-2 flex-wrap items-center">
            <Link to="/patients/new" className="btn-primary py-1.5 text-sm flex-shrink-0">
              <Plus size={15} />Register Patient
            </Link>
            <div className="w-px h-6 bg-gray-200 hidden sm:block" />
            <div className="relative flex-1 min-w-48" ref={searchRef}>
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-9"
                placeholder="Search by name, MRN or mobile…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {suggestions.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        navigate(`/patients/${p.id}`)
                        setShowSuggestions(false)
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 border-b last:border-0 flex justify-between items-center"
                    >
                      <span className="font-medium text-gray-900">{p.full_name}</span>
                      <span className="text-xs text-gray-400 font-mono">{getMRN(p)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <select className="input w-36" value={genderFilter} onChange={e => setGenderFilter(e.target.value)}>
              <option value="">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <select className="input w-36" value={ageFilter} onChange={e => setAgeFilter(e.target.value)}>
              <option value="">All Ages</option>
              <option value="0-12">Child (0–12)</option>
              <option value="13-17">Teen (13–17)</option>
              <option value="18-40">Adult (18–40)</option>
              <option value="41-60">Middle-aged (41–60)</option>
              <option value="60+">Senior (60+)</option>
            </select>
            <select className="input w-44" value={apptFilter} onChange={e => setApptFilter(e.target.value)}>
              <option value="">All — Today's Status</option>
              <option value="pending">Today: Pending</option>
              <option value="confirmed">Today: Confirmed</option>
              <option value="in_progress">Today: In Progress</option>
              <option value="completed">Today: Completed</option>
              <option value="none">No appointment today</option>
            </select>
            {activeFilters > 0 && (
              <button
                onClick={() => { setGenderFilter(''); setAgeFilter(''); setApptFilter(''); setDateFrom(''); setDateTo('') }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 px-2 py-1.5"
              >
                <X size={13} /> Clear ({activeFilters})
              </button>
            )}
          </div>

          {/* Date range row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar size={14} className="text-gray-400" />
            <span className="text-xs text-gray-500">Registered:</span>
            <input type="date" className="input w-36 text-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From date" />
            <span className="text-xs text-gray-400">to</span>
            <input type="date" className="input w-36 text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} title="To date" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-xs text-gray-400 hover:text-red-500">
                <X size={12} />
              </button>
            )}
          </div>

          {activeFilters > 0 && (
            <p className="text-xs text-gray-400">{filtered.length} of {patients.length} patients shown</p>
          )}
        </div>

        {loading ? <PageLoader /> : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <User size={36} className="mx-auto mb-2 opacity-30" />
            <p>No patients found</p>
            <Link to="/patients/new" className="btn-primary mt-4 inline-flex">Register first patient</Link>
          </div>
        ) : (
          <div className="table-wrapper rounded-none border-0">
            <table className="table">
              <thead>
                <tr>
                  <th className="th">MRN</th>
                  <th className="th">Name</th>
                  <th className="th">Age / Gender</th>
                  <th className="th">Blood Group</th>
                  <th className="th">Conditions</th>
                  <th className="th">Today's Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(p => {
                  const age = p.date_of_birth
                    ? Math.floor((Date.now() - new Date(p.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
                    : null
                  return (
                    <tr key={p.id} className="tr-hover cursor-pointer"
                      onClick={() => navigate(`/patients/${p.id}`)}>
                      <td className="td font-mono text-xs text-gray-500 whitespace-nowrap align-middle">
                        {getMRN(p)}
                      </td>
                      <td className="td align-middle">
                        <div className="font-medium text-gray-900">{p.full_name}</div>
                      </td>
                      <td className="td whitespace-nowrap text-sm text-gray-600 align-middle">
                        {age !== null ? (age > 0 ? `${age} yrs` : '< 1 yr') : '—'}
                        {p.gender ? ` / ${p.gender}` : ''}
                      </td>
                      <td className="td align-middle">
                        {p.blood_group
                          ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">{p.blood_group}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="td align-middle" onClick={e => e.stopPropagation()}>
                        <TagInput
                          patientId={p.id}
                          currentTags={p.tags || []}
                          onTagsChange={(tags) => updateTags(p.id, tags)}
                        />
                      </td>
                      <td className="td align-middle">
                        <StatusBadge status={todayAppts[p.id]} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
