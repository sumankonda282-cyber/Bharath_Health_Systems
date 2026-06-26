import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../api/client'
import {
  Search, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Loader2, AlertTriangle, Calendar, ChevronsUpDown,
  BedDouble, Layers, DoorOpen, Check, MapPin, RefreshCw,
  Users, User,
} from 'lucide-react'

// ── Theme ─────────────────────────────────────────────────────────────────────
const BLUE        = '#0F2557'
const BLUE_LIGHT  = '#eff6ff'
const BLUE_BORDER = '#bfdbfe'

// ── Session storage ───────────────────────────────────────────────────────────
const SS_KEY = 'provider_ipd_session'

function loadSession() {
  try { return JSON.parse(sessionStorage.getItem(SS_KEY)) || null } catch { return null }
}

function saveSession(data) {
  try { sessionStorage.setItem(SS_KEY, JSON.stringify(data)) } catch {}
}

function dropSession() {
  try { sessionStorage.removeItem(SS_KEY) } catch {}
}

// ── Round status map ──────────────────────────────────────────────────────────
const ROUND_STATUS = {
  pending:     { label: 'Pending',     dot: '#9ca3af', bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
  in_progress: { label: 'In Progress', dot: '#d97706', bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
  completed:   { label: 'Completed',   dot: '#059669', bg: '#f0fdf4', color: '#15803d', border: '#d1fae5' },
  skipped:     { label: 'Skipped',     dot: '#9ca3af', bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
}

const STAT_CHIPS = [
  { key: '',            label: 'All' },
  { key: 'pending',     label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed',   label: 'Completed' },
  { key: 'skipped',     label: 'Skipped' },
]

const PAGE_SIZE = 20

const DATE_PRESETS = [
  { label: 'Today',     days: 0 },
  { label: 'Yesterday', days: 1 },
  { label: 'Last 7d',   days: 7 },
]

const COLUMNS = [
  { key: 'bed_number',    label: 'Bed',        sortable: true  },
  { key: 'patient_name',  label: 'Patient',    sortable: true  },
  { key: 'age_sex',       label: 'Age/Sex',    sortable: false },
  { key: 'acuity',        label: 'Acuity',     sortable: true  },
  { key: 'diagnosis',     label: 'Diagnosis',  sortable: true  },
  { key: 'doctor_name',   label: 'Doctor',     sortable: true  },
  { key: 'scheduled_at',  label: 'Scheduled',  sortable: true  },
  { key: 'started_at',    label: 'Last Round', sortable: true  },
  { key: 'duration',      label: 'Duration',   sortable: false },
  { key: 'notes_preview', label: 'Notes',      sortable: false },
  { key: 'status',        label: 'Status',     sortable: true  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function dayCount(iso) {
  if (!iso) return ''
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return `D${d + 1}`
}

function roundDuration(startIso, endIso) {
  if (!startIso || !endIso) return '—'
  const mins = Math.round((new Date(endIso) - new Date(startIso)) / 60000)
  if (mins < 1) return '<1 min'
  return `${mins} min`
}

// ── StatusPill ────────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const s = ROUND_STATUS[status] || ROUND_STATUS.pending
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {s.label}
    </span>
  )
}

// ── SortIcon ──────────────────────────────────────────────────────────────────
function SortIcon({ col, sortKey, sortDir }) {
  if (sortKey !== col) return <ChevronsUpDown size={11} className="text-gray-300 ml-0.5" />
  return sortDir === 'asc'
    ? <ChevronUp   size={11} className="ml-0.5" style={{ color: BLUE }} />
    : <ChevronDown size={11} className="ml-0.5" style={{ color: BLUE }} />
}

// ── DateDropdown ──────────────────────────────────────────────────────────────
function DateDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const label = !value || value === today ? 'Today' : fmtDate(value)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs text-gray-600 bg-white hover:border-gray-400 transition-colors whitespace-nowrap"
        style={{ borderColor: open ? BLUE : '#d1d5db' }}
      >
        <Calendar size={12} style={{ color: value ? BLUE : '#9ca3af' }} />
        {label}
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-52">
          <div className="flex flex-col gap-1 mb-3">
            {DATE_PRESETS.map(p => {
              const d = new Date(Date.now() - p.days * 86400000).toISOString().slice(0, 10)
              return (
                <button
                  key={p.label}
                  onClick={() => { onChange(d); setOpen(false) }}
                  className="text-left text-xs px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  style={{ color: value === d ? BLUE : '#374151', fontWeight: value === d ? 700 : 400 }}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
          <input
            type="date"
            value={value || today}
            onChange={e => { onChange(e.target.value); setOpen(false) }}
            className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none"
            style={{ borderColor: '#d1d5db' }}
          />
        </div>
      )}
    </div>
  )
}

// ── SearchableList ────────────────────────────────────────────────────────────
function SearchableList({ placeholder, items, selected, onSelect, disabled, loading }) {
  const [query,  setQuery]  = useState('')
  const [open,   setOpen]   = useState(false)
  const [cursor, setCursor] = useState(-1)
  const inputRef = useRef(null)

  const filtered = query.trim()
    ? items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()))
    : items

  const choose = item => {
    onSelect(item)
    setQuery(item.name)
    setOpen(false)
    setCursor(-1)
  }

  const handleKey = e => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true)
      return
    }
    if      (e.key === 'ArrowDown')            { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp')              { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    else if (e.key === 'Enter' && cursor >= 0) { e.preventDefault(); choose(filtered[cursor]) }
    else if (e.key === 'Escape')               { setOpen(false) }
  }

  useEffect(() => { if (!selected) { setQuery(''); setOpen(false) } }, [selected])

  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          value={selected ? selected.name : query}
          onChange={e => { setQuery(e.target.value); onSelect(null); setOpen(true); setCursor(-1) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm focus:outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
          style={{ borderColor: open && !disabled ? BLUE : '#d1d5db', background: disabled ? '#f9fafb' : 'white' }}
        />
        {selected && <Check size={15} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: BLUE }} />}
        {loading  && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
      </div>
      {open && !disabled && filtered.length > 0 && (
        <ul className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
          {filtered.map((item, idx) => (
            <li
              key={item.id}
              onMouseDown={() => choose(item)}
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm transition-colors"
              style={{ background: cursor === idx || selected?.id === item.id ? BLUE_LIGHT : 'white' }}
            >
              <span className="flex-1 font-medium text-gray-800">{item.name}</span>
              {item.subtitle && <span className="text-xs text-gray-400">{item.subtitle}</span>}
              {selected?.id === item.id && <Check size={13} style={{ color: BLUE }} />}
            </li>
          ))}
        </ul>
      )}
      {open && !disabled && !loading && filtered.length === 0 && query && (
        <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-400">
          No results for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  )
}

// ── SelectLocationView ────────────────────────────────────────────────────────
function SelectLocationView({ onEnter }) {
  const { user } = useAuth()

  const [departments, setDepartments] = useState([])
  const [wards,       setWards]       = useState([])
  const [department,  setDepartment]  = useState(null)
  const [ward,        setWard]        = useState(null)
  const [loadingDept, setLoadingDept] = useState(true)
  const [loadingWard, setLoadingWard] = useState(false)
  const [entering,    setEntering]    = useState(false)

  useEffect(() => {
    setLoadingDept(true)
    api.get('/inpatient/departments')
      .then(data => {
        const list = Array.isArray(data) ? data : []
        const mapped = list.map(d => ({ id: d.id, name: d.name, subtitle: d.dept_type || '' }))
        setDepartments(mapped)
        if (mapped.length === 1) setDepartment(mapped[0])
      })
      .catch(() => setDepartments([]))
      .finally(() => setLoadingDept(false))
  }, [])

  useEffect(() => {
    if (!department) return
    setWard(null)
    setWards([])
    setLoadingWard(true)
    api.get(`/inpatient/wards?department_id=${department.id}`)
      .then(data => {
        const list = Array.isArray(data) ? data : []
        const mapped = list.map(w => ({
          id: w.id,
          name: w.name,
          subtitle: [w.floor && `Floor ${w.floor}`, w.wing && `Wing ${w.wing}`].filter(Boolean).join(' · ') || '',
        }))
        setWards(mapped)
        if (mapped.length === 1) setWard(mapped[0])
      })
      .catch(() => setWards([]))
      .finally(() => setLoadingWard(false))
  }, [department])

  const handleEnter = () => {
    if (!department || !ward || entering) return
    setEntering(true)
    const s = { department, ward, enteredAt: Date.now() }
    saveSession(s)
    onEnter(s)
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const firstName = user?.full_name?.replace(/^(Dr|Mr|Mrs|Ms|Prof)\.?\s+/i, '').split(' ')[0] || ''
  const step      = ward ? 3 : department ? 2 : 1

  const stepStyle = (n, done, active) => ({
    background: done ? BLUE : active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
    color:      done || active ? 'white' : 'rgba(255,255,255,0.4)',
    border:     done   ? '2px solid rgba(255,255,255,0.9)'
               : active ? '2px solid rgba(255,255,255,0.6)'
               : '2px solid rgba(255,255,255,0.2)',
  })

  return (
    <div
      className="min-h-full flex items-center justify-center py-16 px-6"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0F2557 45%, #1e3a8a 100%)' }}
    >
      <div className="w-full max-w-md">

        {/* Greeting */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4 border border-white/20">
            <BedDouble size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-1">
            {greeting()}{firstName ? `, Dr. ${firstName}` : ''} 👋
          </h1>
          <p className="text-sm" style={{ color: 'rgba(191,219,254,0.85)' }}>
            Select your ward to begin rounding
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all shadow-sm"
              style={stepStyle(1, !!department, step === 1)}>
              {department ? <Check size={15} /> : '1'}
            </div>
            <span className="text-xs font-semibold"
              style={{ color: department || step === 1 ? 'white' : 'rgba(255,255,255,0.4)' }}>
              Department
            </span>
          </div>
          <div className="w-16 h-px mx-2 mb-5 transition-all"
            style={{ background: department ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)' }} />
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all shadow-sm"
              style={stepStyle(2, !!ward, step === 2)}>
              {ward ? <Check size={15} /> : '2'}
            </div>
            <span className="text-xs font-semibold"
              style={{ color: ward || step === 2 ? 'white' : 'rgba(255,255,255,0.4)' }}>
              Ward
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-white/20 p-6 space-y-5">

          {/* Department */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Layers size={14} style={{ color: BLUE }} />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Department</span>
            </div>
            {loadingDept ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 py-2 px-3">
                <Loader2 size={14} className="animate-spin" /> Loading departments…
              </div>
            ) : departments.length === 0 ? (
              <p className="text-sm text-gray-400 py-2 px-3">No departments found</p>
            ) : (
              <SearchableList
                placeholder="Search department…"
                items={departments}
                selected={department}
                onSelect={setDepartment}
              />
            )}
          </div>

          <div className="border-t border-gray-100" />

          {/* Ward */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <DoorOpen size={14} style={{ color: department ? BLUE : '#9ca3af' }} />
              <span className="text-xs font-bold uppercase tracking-wider"
                style={{ color: department ? '#6b7280' : '#9ca3af' }}>
                Ward
              </span>
            </div>
            <SearchableList
              placeholder={department ? 'Search ward…' : 'Select a department first'}
              items={wards}
              selected={ward}
              onSelect={setWard}
              disabled={!department}
              loading={loadingWard}
            />
          </div>

          {/* Enter button */}
          <button
            onClick={handleEnter}
            disabled={!department || !ward || entering}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: BLUE }}
          >
            {entering ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <BedDouble size={16} />
                <span>Enter Ward</span>
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'rgba(191,219,254,0.55)' }}>
          Session locked to selected ward · Click &ldquo;Change Ward&rdquo; to switch
        </p>
      </div>
    </div>
  )
}

// ── WardRoundsView ────────────────────────────────────────────────────────────
function WardRoundsView({ session, onChangeWard }) {
  const { user }   = useAuth()
  const navigate   = useNavigate()

  const [rounds,  setRounds]  = useState([])
  const [loading, setLoading] = useState(true)
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)

  const [statusFilter, setStatusFilter] = useState('')
  const [search,       setSearch]       = useState('')
  const [doctor,       setDoctor]       = useState('')
  const [date,         setDate]         = useState(new Date().toISOString().slice(0, 10))
  const [roundType,    setRoundType]    = useState('')
  const [live,         setLive]         = useState(true)
  const [myPatients,   setMyPatients]   = useState(true)
  const [sortKey,      setSortKey]      = useState('scheduled_at')
  const [sortDir,      setSortDir]      = useState('asc')
  const [doctors,      setDoctors]      = useState([])

  const wardId  = session?.ward?.id
  const liveRef = useRef(live)
  liveRef.current = live

  // doctor id: prefer id (from /auth/staff/me), fallback user_id (from token)
  const doctorId = user?.id || user?.user_id

  const load = useCallback(async () => {
    if (!wardId) return
    setLoading(true)
    try {
      const params = { ward_id: wardId }
      if (statusFilter)             params.status     = statusFilter
      if (myPatients && doctorId)   params.doctor_id  = doctorId
      else if (!myPatients && doctor) params.doctor_id = doctor
      if (date)                     params.date       = date
      if (roundType)                params.round_type = roundType
      if (search)                   params.search     = search

      const data = await api.get('/inpatient/ward-rounds', { params })
      const list = Array.isArray(data) ? data : (data.items || data.rounds || [])

      // Build doctor dropdown options from results
      const docMap = {}
      list.forEach(r => { if (r.doctor_id && r.doctor_name) docMap[r.doctor_id] = r.doctor_name })
      setDoctors(Object.entries(docMap).map(([id, name]) => ({ id, name })))

      // Client-side search (server search may not be available on all deployments)
      const filtered = search
        ? list.filter(r =>
            (r.patient_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (r.bed_number   || '').toLowerCase().includes(search.toLowerCase()) ||
            (r.mrn          || '').toLowerCase().includes(search.toLowerCase())
          )
        : list

      // Sort
      const sorted = [...filtered].sort((a, b) => {
        let av = a[sortKey] ?? ''
        let bv = b[sortKey] ?? ''
        if (sortKey === 'status') {
          const order = { in_progress: 0, pending: 1, completed: 2, skipped: 3 }
          av = order[av] ?? 9
          bv = order[bv] ?? 9
        }
        if (av < bv) return sortDir === 'asc' ? -1 : 1
        if (av > bv) return sortDir === 'asc' ?  1 : -1
        return 0
      })

      setTotal(sorted.length)
      setRounds(sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE))
    } catch {
      setRounds([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [wardId, statusFilter, myPatients, doctorId, doctor, date, roundType, search, page, sortKey, sortDir])

  useEffect(() => { setPage(1) }, [statusFilter, doctor, date, roundType, search, sortKey, sortDir, myPatients])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!live) return
    const t = setInterval(() => { if (liveRef.current) load() }, 30000)
    return () => clearInterval(t)
  }, [live, load])

  const toggleSort = col => {
    if (!col.sortable) return
    if (sortKey === col.key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col.key); setSortDir('asc') }
  }

  // Counts per status chip
  const counts     = rounds.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {})
  const chipCounts = { '': total, ...counts }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const rangeStart = (page - 1) * PAGE_SIZE + 1
  const rangeEnd   = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="flex flex-col h-full">

      {/* Top bar — ward identity + actions */}
      <div className="bg-white border-b px-5 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderColor: '#f0f0f0' }}>
        <div className="flex items-center gap-3">
          <BedDouble size={18} style={{ color: BLUE }} />
          <div>
            <p className="text-sm font-bold leading-none" style={{ color: BLUE }}>
              {session?.ward?.name || 'Ward Rounds'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{session?.department?.name}</p>
          </div>
          {total > 0 && (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white"
              style={{ background: BLUE }}>
              {total > 99 ? '99+' : total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* My Patients toggle */}
          <button
            onClick={() => setMyPatients(m => !m)}
            className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-colors"
            style={{
              borderColor: myPatients ? BLUE : '#d1d5db',
              background:  myPatients ? BLUE_LIGHT : 'white',
              color:       myPatients ? BLUE : '#6b7280',
            }}
          >
            {myPatients ? <User size={12} /> : <Users size={12} />}
            {myPatients ? 'My Patients' : 'All Patients'}
          </button>
          {/* Manual refresh */}
          <button
            onClick={load}
            className="p-1.5 border rounded-lg text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
            style={{ borderColor: '#d1d5db' }}
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>
          {/* Change ward */}
          <button
            onClick={onChangeWard}
            className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
            style={{ borderColor: '#d1d5db' }}
          >
            <MapPin size={12} /> Change Ward
          </button>
        </div>
      </div>

      {/* Status chips */}
      <div className="bg-white border-b px-5 py-2 flex items-center gap-2 flex-shrink-0 flex-wrap"
        style={{ borderColor: '#f0f0f0' }}>
        {STAT_CHIPS.map(chip => {
          const active = statusFilter === chip.key
          const s      = chip.key ? ROUND_STATUS[chip.key] : null
          return (
            <button
              key={chip.key}
              onClick={() => setStatusFilter(chip.key)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all whitespace-nowrap"
              style={active
                ? { background: s?.bg || BLUE_LIGHT, color: s?.color || BLUE, borderColor: s?.border || BLUE_BORDER }
                : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }
              }
            >
              {chip.key && (
                <span className="w-1.5 h-1.5 rounded-full"
                  style={{ background: active ? ROUND_STATUS[chip.key]?.dot : '#d1d5db' }} />
              )}
              {chip.label}
              <span className="ml-0.5 text-[10px]" style={{ color: active ? s?.color || BLUE : '#9ca3af' }}>
                {chipCounts[chip.key] ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      {/* Filters bar */}
      <div className="bg-white border-b px-5 py-2 flex flex-wrap items-center gap-2 flex-shrink-0"
        style={{ borderColor: '#f0f0f0' }}>

        {/* Search */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search bed, patient, MRN…"
            className="pl-7 pr-3 py-1.5 border rounded-lg text-xs focus:outline-none w-48"
            style={{ borderColor: search ? BLUE : '#d1d5db' }}
          />
        </div>

        {/* Doctor dropdown — only shown when "All Patients" mode */}
        {!myPatients && (
          <select
            value={doctor}
            onChange={e => setDoctor(e.target.value)}
            className="border rounded-lg px-2.5 py-1.5 text-xs text-gray-700 bg-white focus:outline-none"
            style={{ borderColor: '#d1d5db' }}
          >
            <option value="">All Doctors</option>
            {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}

        {/* Round type */}
        <select
          value={roundType}
          onChange={e => setRoundType(e.target.value)}
          className="border rounded-lg px-2.5 py-1.5 text-xs text-gray-700 bg-white focus:outline-none"
          style={{ borderColor: '#d1d5db' }}
        >
          <option value="">All Types</option>
          <option value="morning">Morning Round</option>
          <option value="evening">Evening Round</option>
          <option value="night">Night Round</option>
          <option value="emergency">Emergency</option>
          <option value="post_op">Post-Op</option>
          <option value="consultant">Consultant</option>
        </select>

        {/* Date */}
        <DateDropdown value={date} onChange={setDate} />

        {/* Live toggle */}
        <button
          onClick={() => setLive(l => !l)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs font-medium transition-colors"
          style={{
            borderColor: live ? BLUE : '#d1d5db',
            background:  live ? BLUE_LIGHT : 'white',
            color:       live ? BLUE : '#6b7280',
          }}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${live ? 'animate-pulse' : ''}`}
            style={{ background: live ? BLUE : '#d1d5db' }}
          />
          Live
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" />
            Loading rounds…
          </div>
        ) : rounds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <AlertTriangle size={24} className="mb-2 opacity-40" />
            <p className="text-sm">No ward rounds found</p>
            {myPatients && (
              <button
                onClick={() => setMyPatients(false)}
                className="mt-2 text-xs underline hover:no-underline"
                style={{ color: BLUE }}
              >
                Show all patients
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-white z-10 border-b" style={{ borderColor: '#f0f0f0' }}>
              <tr>
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col)}
                    className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 whitespace-nowrap select-none"
                    style={{ cursor: col.sortable ? 'pointer' : 'default' }}
                  >
                    <span className="inline-flex items-center">
                      {col.label}
                      {col.sortable && <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rounds.map((r, i) => {
                const cautions  = r.caution_flags || r.cautions || []
                const critical  = cautions.includes('critical') || r.triage_level === 'red'
                const completed = r.status === 'completed'

                return (
                  <tr
                    key={r.id || i}
                    onClick={() => r.admission_id && navigate(`/inpatient/admission/${r.admission_id}`)}
                    className="cursor-pointer hover:bg-blue-50 transition-colors border-b border-gray-50"
                    style={{
                      borderLeft: critical ? '3px solid #dc2626' : '3px solid transparent',
                      opacity: completed ? 0.65 : 1,
                    }}
                  >
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <span className="text-sm font-extrabold text-gray-900">{r.bed_number || '—'}</span>
                    </td>

                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <span className="text-xs font-semibold text-gray-800">{r.patient_name || '—'}</span>
                    </td>

                    <td className="px-3 py-1.5 text-xs text-gray-500 whitespace-nowrap">
                      {r.age && r.gender
                        ? `${r.age}${r.gender[0]?.toUpperCase()} · ${dayCount(r.admitted_at)}`
                        : r.age_sex || '—'}
                    </td>

                    <td className="px-3 py-1.5 whitespace-nowrap">
                      {r.acuity ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
                          style={
                            r.acuity === 'high'
                              ? { background: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' }
                              : r.acuity === 'medium'
                              ? { background: '#fffbeb', color: '#92400e', borderColor: '#fde68a' }
                              : { background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' }
                          }
                        >
                          {r.acuity === 'high' ? '🔴' : r.acuity === 'medium' ? '🟡' : '🟢'}
                          {r.acuity.charAt(0).toUpperCase() + r.acuity.slice(1)}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>

                    <td className="px-3 py-1.5 text-xs text-gray-700 max-w-[130px] truncate">
                      {r.primary_diagnosis || r.diagnosis || '—'}
                    </td>

                    <td className="px-3 py-1.5 text-xs text-gray-600 whitespace-nowrap">
                      {r.doctor_name || '—'}
                    </td>

                    <td className="px-3 py-1.5 text-[11px] text-gray-500 whitespace-nowrap">
                      {fmtTime(r.scheduled_at)}
                    </td>

                    <td className="px-3 py-1.5 text-[11px] text-gray-500 whitespace-nowrap">
                      {r.started_at ? fmtTime(r.started_at) : '—'}
                    </td>

                    <td className="px-3 py-1.5 text-[11px] text-gray-500 whitespace-nowrap">
                      {roundDuration(r.started_at, r.ended_at)}
                    </td>

                    <td className="px-3 py-1.5 text-[11px] text-gray-400 max-w-[160px] truncate">
                      {r.notes_preview || r.notes || '—'}
                    </td>

                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <StatusPill status={r.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="bg-white border-t px-5 py-2 flex items-center justify-between flex-shrink-0"
          style={{ borderColor: '#f0f0f0' }}>
          <span className="text-xs text-gray-400">{rangeStart}–{rangeEnd} of {total} rounds</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={15} className="text-gray-600" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…')
                acc.push(p)
                return acc
              }, [])
              .map((p, idx) =>
                p === '…' ? (
                  <span key={`e${idx}`} className="text-xs text-gray-400 px-1">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className="w-6 h-6 rounded-md text-xs font-medium transition-colors"
                    style={p === page ? { background: BLUE, color: 'white' } : { color: '#374151' }}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={15} className="text-gray-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── InpatientDesk (main export) ───────────────────────────────────────────────
export default function InpatientDesk() {
  const [wardSession, setWardSession] = useState(loadSession)

  const handleEnter      = s  => setWardSession(s)
  const handleChangeWard = () => { dropSession(); setWardSession(null) }

  if (!wardSession) {
    return <SelectLocationView onEnter={handleEnter} />
  }

  return <WardRoundsView session={wardSession} onChangeWard={handleChangeWard} />
}
