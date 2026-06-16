import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Layers, DoorOpen, ChevronRight, Search, Check, LogOut, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useWardSession } from '../contexts/WardSessionContext'
import BrandLogo from '../components/BrandLogo'
import api from '../api/client'

const GREEN = '#065F46'

// Searchable list with keyboard nav
function SearchableList({ placeholder, items, selected, onSelect, disabled, loading }) {
  const [query, setQuery]     = useState('')
  const [open, setOpen]       = useState(false)
  const [cursor, setCursor]   = useState(-1)
  const inputRef              = useRef(null)
  const listRef               = useRef(null)

  const filtered = query.trim()
    ? items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()))
    : items

  const choose = (item) => {
    onSelect(item)
    setQuery(item.name)
    setOpen(false)
    setCursor(-1)
  }

  const handleKey = (e) => {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    else if (e.key === 'Enter' && cursor >= 0) { e.preventDefault(); choose(filtered[cursor]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  // Sync display when selection cleared externally
  useEffect(() => {
    if (!selected) { setQuery(''); setOpen(false) }
  }, [selected])

  const displayValue = selected ? selected.name : query

  return (
    <div className="relative">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          value={displayValue}
          onChange={e => { setQuery(e.target.value); onSelect(null); setOpen(true); setCursor(-1) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-9 pr-10 py-3 border rounded-xl text-sm focus:outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400"
          style={{ borderColor: open && !disabled ? GREEN : '#d1d5db' }}
        />
        {selected && (
          <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: GREEN }} />
        )}
        {loading && (
          <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
        )}
      </div>

      {open && !disabled && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto"
        >
          {filtered.map((item, idx) => (
            <li
              key={item.id}
              onMouseDown={() => choose(item)}
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm transition-colors"
              style={{
                background: cursor === idx ? '#f0fdf4' : selected?.id === item.id ? '#f0fdf4' : 'white',
                color: '#1f2937',
              }}
            >
              <span className="flex-1">{item.name}</span>
              {item.subtitle && <span className="text-xs text-gray-400">{item.subtitle}</span>}
              {selected?.id === item.id && <Check size={14} style={{ color: GREEN }} />}
            </li>
          ))}
        </ul>
      )}

      {open && !disabled && !loading && filtered.length === 0 && query && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-400">
          No results for "{query}"
        </div>
      )}
    </div>
  )
}

// Step indicator at the top
function StepDot({ n, label, done, active }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
        style={{
          background: done ? GREEN : active ? '#d1fae5' : '#f3f4f6',
          color: done ? 'white' : active ? GREEN : '#9ca3af',
          border: active ? `2px solid ${GREEN}` : '2px solid transparent',
        }}
      >
        {done ? <Check size={14} /> : n}
      </div>
      <span className="text-xs font-medium" style={{ color: active || done ? GREEN : '#9ca3af' }}>{label}</span>
    </div>
  )
}

export default function SelectLocation() {
  const { user, logout }      = useAuth()
  const { enterWard }         = useWardSession()
  const navigate              = useNavigate()

  // Data
  const [hospitals, setHospitals]   = useState([])
  const [departments, setDepartments] = useState([])
  const [wards, setWards]           = useState([])

  // Selections
  const [hospital, setHospital]     = useState(null)
  const [department, setDepartment] = useState(null)
  const [ward, setWard]             = useState(null)

  // Loading states
  const [loadingHosp, setLoadingHosp]   = useState(true)
  const [loadingDept, setLoadingDept]   = useState(false)
  const [loadingWard, setLoadingWard]   = useState(false)
  const [entering, setEntering]         = useState(false)

  // Step: 1=hospital, 2=dept, 3=ward
  const step = hospital ? (department ? 3 : 2) : 1

  // Load hospitals (branches) on mount
  useEffect(() => {
    api.get('/inpatient/branches').then(data => {
      // Normalise — API might return array directly or { branches: [] }
      const list = Array.isArray(data) ? data : (data.branches || data.items || [])
      const mapped = list.map(b => ({ id: b.id, name: b.name || b.branch_name }))
      setHospitals(mapped)
      // Auto-select if only one
      if (mapped.length === 1) setHospital(mapped[0])
    }).catch(() => {
      // Fallback: treat clinic itself as single hospital using /auth/staff/me data
      if (user?.clinic_name) {
        const single = { id: user.clinic_id || 1, name: user.clinic_name }
        setHospitals([single])
        setHospital(single)
      }
    }).finally(() => setLoadingHosp(false))
  }, [user])

  // Load departments when hospital selected
  useEffect(() => {
    if (!hospital) return
    setDepartment(null)
    setWard(null)
    setDepartments([])
    setWards([])
    setLoadingDept(true)
    api.get('/inpatient/departments').then(data => {
      const list = Array.isArray(data) ? data : []
      setDepartments(list.map(d => ({
        id: d.id,
        name: d.name,
        subtitle: d.dept_type || '',
        color: d.color_hex,
      })))
    }).catch(() => {}).finally(() => setLoadingDept(false))
  }, [hospital])

  // Load wards when department selected
  useEffect(() => {
    if (!department) return
    setWard(null)
    setWards([])
    setLoadingWard(true)
    api.get(`/inpatient/wards?department_id=${department.id}`).then(data => {
      const list = Array.isArray(data) ? data : []
      setWards(list.map(w => ({
        id: w.id,
        name: w.name,
        subtitle: [w.floor && `Floor ${w.floor}`, w.wing && `Wing ${w.wing}`].filter(Boolean).join(' · ') || '',
      })))
      // Auto-select if only one ward
      if (list.length === 1) {
        setWard({ id: list[0].id, name: list[0].name })
      }
    }).catch(() => {}).finally(() => setLoadingWard(false))
  }, [department])

  const handleEnter = () => {
    if (!hospital || !department || !ward) return
    setEntering(true)
    enterWard(hospital, department, ward)
    navigate('/dashboard')
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const firstName = user?.full_name?.split(' ')[0] || user?.name?.split(' ')[0] || 'there'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
        <BrandLogo size="sm" />
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-gray-800">{user?.full_name || user?.name}</div>
            <div className="text-xs text-gray-400 capitalize">{user?.role || 'Staff'}</div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">

          {/* Greeting */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold text-gray-800 mb-1">
              {greeting()}, {firstName} 👋
            </h1>
            <p className="text-sm text-gray-500">Select your work location to begin your shift</p>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-0 mb-8">
            <StepDot n={1} label="Hospital"   done={!!hospital}    active={step === 1} />
            <div className="w-12 h-px mb-5" style={{ background: hospital ? GREEN : '#e5e7eb' }} />
            <StepDot n={2} label="Department" done={!!department}  active={step === 2} />
            <div className="w-12 h-px mb-5" style={{ background: department ? GREEN : '#e5e7eb' }} />
            <StepDot n={3} label="Ward"       done={!!ward}        active={step === 3} />
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">

            {/* Hospital */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building2 size={15} style={{ color: GREEN }} />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Hospital / Branch</span>
              </div>

              {loadingHosp ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                  <Loader2 size={14} className="animate-spin" /> Loading…
                </div>
              ) : hospitals.length <= 4 ? (
                // Card grid for ≤4
                <div className="grid grid-cols-1 gap-2">
                  {hospitals.map(h => (
                    <button
                      key={h.id}
                      onClick={() => setHospital(h)}
                      className="text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-between"
                      style={{
                        borderColor: hospital?.id === h.id ? GREEN : '#e5e7eb',
                        background: hospital?.id === h.id ? '#f0fdf4' : 'white',
                        color: hospital?.id === h.id ? GREEN : '#374151',
                      }}
                    >
                      {h.name}
                      {hospital?.id === h.id && <Check size={15} style={{ color: GREEN }} />}
                    </button>
                  ))}
                </div>
              ) : (
                // Searchable for 5+
                <SearchableList
                  placeholder="Search hospital or branch…"
                  items={hospitals}
                  selected={hospital}
                  onSelect={setHospital}
                />
              )}
            </div>

            {/* Department */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Layers size={15} style={{ color: hospital ? GREEN : '#9ca3af' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: hospital ? '#6b7280' : '#9ca3af' }}>
                  Department
                </span>
              </div>
              <SearchableList
                placeholder={hospital ? 'Search department…' : 'Select a hospital first'}
                items={departments}
                selected={department}
                onSelect={setDepartment}
                disabled={!hospital}
                loading={loadingDept}
              />
            </div>

            {/* Ward */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <DoorOpen size={15} style={{ color: department ? GREEN : '#9ca3af' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: department ? '#6b7280' : '#9ca3af' }}>
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
              disabled={!hospital || !department || !ward || entering}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: GREEN }}
              onMouseEnter={e => e.currentTarget.style.background = '#047857'}
              onMouseLeave={e => e.currentTarget.style.background = GREEN}
            >
              {entering ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>Enter Ward <ChevronRight size={16} /></>
              )}
            </button>
          </div>

          {/* Location lock note */}
          <p className="text-center text-xs text-gray-400 mt-4">
            Location is locked for this session. To change, sign out and log back in.
          </p>

        </div>
      </main>
    </div>
  )
}
