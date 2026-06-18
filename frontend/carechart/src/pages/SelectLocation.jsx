import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Layers, DoorOpen, ChevronRight, Search, Check, LogOut, Loader2, MapPin } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useWardSession } from '../contexts/WardSessionContext'
import BrandLogo from '../components/BrandLogo'
import api from '../api/client'
import { GREEN } from '../constants/colors'

const MOCK_HOSPITALS    = [{ id: 1, name: 'BHarath Health Systems — Main Campus' }]
const MOCK_DEPARTMENTS  = [
  { id: 1, name: 'General Medicine', subtitle: 'Medicine' },
  { id: 2, name: 'Surgery',          subtitle: 'Surgical' },
  { id: 3, name: 'Orthopaedics',     subtitle: 'Surgical' },
  { id: 4, name: 'Paediatrics',      subtitle: 'Medicine' },
  { id: 5, name: 'Obstetrics & Gynaecology', subtitle: 'OBG' },
  { id: 6, name: 'ICU / Critical Care', subtitle: 'Critical' },
]
const MOCK_WARDS = [
  { id: 1, name: 'Ward 3B — General',  subtitle: 'Floor 3' },
  { id: 2, name: 'Ward 4A — Surgical', subtitle: 'Floor 4' },
  { id: 3, name: 'Ward 2C — Paeds',    subtitle: 'Floor 2' },
  { id: 4, name: 'ICU — East Wing',    subtitle: 'Floor 1' },
]

function SearchableList({ placeholder, items, selected, onSelect, disabled, loading }) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const [cursor, setCursor] = useState(-1)
  const inputRef            = useRef(null)

  const filtered = query.trim()
    ? items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()))
    : items

  const choose = (item) => { onSelect(item); setQuery(item.name); setOpen(false); setCursor(-1) }

  const handleKey = (e) => {
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter') setOpen(true); return }
    if (e.key === 'ArrowDown')  { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    else if (e.key === 'Enter' && cursor >= 0) { e.preventDefault(); choose(filtered[cursor]) }
    else if (e.key === 'Escape') setOpen(false)
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
          style={{ borderColor: open && !disabled ? GREEN : '#d1d5db', background: disabled ? '#f9fafb' : 'white' }}
        />
        {selected && <Check size={15} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: GREEN }} />}
        {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
      </div>
      {open && !disabled && filtered.length > 0 && (
        <ul className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
          {filtered.map((item, idx) => (
            <li key={item.id} onMouseDown={() => choose(item)}
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm transition-colors hover:bg-green-50"
              style={{ background: cursor === idx ? '#f0fdf4' : selected?.id === item.id ? '#f0fdf4' : 'white' }}>
              <span className="flex-1 font-medium text-gray-800">{item.name}</span>
              {item.subtitle && <span className="text-xs text-gray-400">{item.subtitle}</span>}
              {selected?.id === item.id && <Check size={13} style={{ color: GREEN }} />}
            </li>
          ))}
        </ul>
      )}
      {open && !disabled && !loading && filtered.length === 0 && query && (
        <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-400">
          No results for "{query}"
        </div>
      )}
    </div>
  )
}

function StepDot({ n, label, done, active }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all shadow-sm"
        style={{
          background: done ? GREEN : active ? '#d1fae5' : '#f3f4f6',
          color: done ? 'white' : active ? GREEN : '#9ca3af',
          border: active ? `2px solid ${GREEN}` : done ? `2px solid ${GREEN}` : '2px solid #e5e7eb',
        }}>
        {done ? <Check size={15} /> : n}
      </div>
      <span className="text-xs font-semibold" style={{ color: active || done ? GREEN : '#9ca3af' }}>{label}</span>
    </div>
  )
}

export default function SelectLocation() {
  const { user, logout } = useAuth()
  const { enterWard }    = useWardSession()
  const navigate         = useNavigate()

  const [hospitals,   setHospitals]   = useState([])
  const [departments, setDepartments] = useState([])
  const [wards,       setWards]       = useState([])
  const [hospital,    setHospital]    = useState(null)
  const [department,  setDepartment]  = useState(null)
  const [ward,        setWard]        = useState(null)
  const [loadingHosp, setLoadingHosp] = useState(true)
  const [loadingDept, setLoadingDept] = useState(false)
  const [loadingWard, setLoadingWard] = useState(false)
  const [entering,    setEntering]    = useState(false)

  const step = hospital ? (department ? 3 : 2) : 1

  useEffect(() => {
    api.get('/inpatient/branches').then(data => {
      const list = Array.isArray(data) ? data : (data.branches || data.items || [])
      const mapped = list.map(b => ({ id: b.id, name: b.name || b.branch_name }))
      const final = mapped.length > 0 ? mapped : MOCK_HOSPITALS
      setHospitals(final)
      if (final.length === 1) setHospital(final[0])
    }).catch(() => {
      // Always fall back to mock — never leave the user stuck
      const fallback = user?.clinic_name
        ? [{ id: user.clinic_id || 1, name: user.clinic_name }]
        : MOCK_HOSPITALS
      setHospitals(fallback)
      if (fallback.length === 1) setHospital(fallback[0])
    }).finally(() => setLoadingHosp(false))
  }, [user])

  useEffect(() => {
    if (!hospital) return
    setDepartment(null); setWard(null); setDepartments([]); setWards([])
    setLoadingDept(true)
    api.get('/inpatient/departments').then(data => {
      const list = Array.isArray(data) ? data : []
      const mapped = list.map(d => ({ id: d.id, name: d.name, subtitle: d.dept_type || '' }))
      setDepartments(mapped.length > 0 ? mapped : MOCK_DEPARTMENTS)
    }).catch(() => setDepartments(MOCK_DEPARTMENTS))
      .finally(() => setLoadingDept(false))
  }, [hospital])

  useEffect(() => {
    if (!department) return
    setWard(null); setWards([])
    setLoadingWard(true)
    api.get(`/inpatient/wards?department_id=${department.id}`).then(data => {
      const list = Array.isArray(data) ? data : []
      const mapped = list.map(w => ({
        id: w.id, name: w.name,
        subtitle: [w.floor && `Floor ${w.floor}`, w.wing && `Wing ${w.wing}`].filter(Boolean).join(' · ') || '',
      }))
      const final = mapped.length > 0 ? mapped : MOCK_WARDS
      setWards(final)
      if (final.length === 1) setWard(final[0])
    }).catch(() => { setWards(MOCK_WARDS) })
      .finally(() => setLoadingWard(false))
  }, [department])

  const handleEnter = () => {
    if (!hospital || !department || !ward || entering) return
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

  const role = user?.role ? user.role.replace(/_/g, ' ') : 'Staff'
  const firstName = user?.full_name?.split(' ')[0] || user?.name?.split(' ')[0] || ''

  return (
    <div className="min-h-screen flex flex-col" style={{
      fontFamily: 'Inter, system-ui, sans-serif',
      background: 'linear-gradient(135deg, #064e3b 0%, #065F46 40%, #0f766e 100%)',
    }}>

      {/* Top bar */}
      <header className="px-6 py-4 flex items-center justify-between">
        <BrandLogo size="sm" light />
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-white">{user?.full_name || user?.name}</div>
            <div className="text-xs text-green-200 capitalize">{role}</div>
          </div>
          <button onClick={logout}
            className="flex items-center gap-1.5 text-xs text-green-100 hover:text-white border border-green-400/40 hover:border-white/40 px-3 py-1.5 rounded-lg transition-colors backdrop-blur-sm">
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          {/* Greeting */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4 border border-white/20">
              <MapPin size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-white mb-1">
              {greeting()}{firstName ? `, ${firstName}` : ''} 👋
            </h1>
            <p className="text-green-100 text-sm">Select your ward to begin your shift</p>
          </div>

          {/* Steps */}
          <div className="flex items-center justify-center mb-6">
            <StepDot n={1} label="Hospital"   done={!!hospital}   active={step === 1} />
            <div className="w-14 h-px mx-1 mb-5 transition-all" style={{ background: hospital ? 'white' : 'rgba(255,255,255,0.3)' }} />
            <StepDot n={2} label="Department" done={!!department} active={step === 2} />
            <div className="w-14 h-px mx-1 mb-5 transition-all" style={{ background: department ? 'white' : 'rgba(255,255,255,0.3)' }} />
            <StepDot n={3} label="Ward"       done={!!ward}       active={step === 3} />
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-2xl border border-white/20 p-6 space-y-5">

            {/* Hospital */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building2 size={14} style={{ color: GREEN }} />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Hospital / Branch</span>
              </div>
              {loadingHosp ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-2 px-3">
                  <Loader2 size={14} className="animate-spin" /> Loading…
                </div>
              ) : hospitals.length <= 4 ? (
                <div className="space-y-2">
                  {hospitals.map(h => (
                    <button key={h.id} onClick={() => setHospital(h)}
                      className="w-full text-left px-4 py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center justify-between"
                      style={{
                        borderColor: hospital?.id === h.id ? GREEN : '#e5e7eb',
                        background:  hospital?.id === h.id ? '#f0fdf4' : 'white',
                        color:       hospital?.id === h.id ? GREEN : '#374151',
                      }}>
                      {h.name}
                      {hospital?.id === h.id && <Check size={14} style={{ color: GREEN }} />}
                    </button>
                  ))}
                </div>
              ) : (
                <SearchableList placeholder="Search hospital…" items={hospitals} selected={hospital} onSelect={setHospital} />
              )}
            </div>

            <div className="border-t border-gray-100" />

            {/* Department */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Layers size={14} style={{ color: hospital ? GREEN : '#9ca3af' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: hospital ? '#6b7280' : '#9ca3af' }}>Department</span>
              </div>
              <SearchableList
                placeholder={hospital ? 'Search department…' : 'Select a hospital first'}
                items={departments} selected={department} onSelect={setDepartment}
                disabled={!hospital} loading={loadingDept}
              />
            </div>

            {/* Ward */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <DoorOpen size={14} style={{ color: department ? GREEN : '#9ca3af' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: department ? '#6b7280' : '#9ca3af' }}>Ward</span>
              </div>
              <SearchableList
                placeholder={department ? 'Search ward…' : 'Select a department first'}
                items={wards} selected={ward} onSelect={setWard}
                disabled={!department} loading={loadingWard}
              />
            </div>

            {/* Enter button */}
            <button
              onClick={handleEnter}
              disabled={!hospital || !department || !ward || entering}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: GREEN }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#047857' }}
              onMouseLeave={e => e.currentTarget.style.background = GREEN}
            >
              {entering ? <Loader2 size={16} className="animate-spin" /> : <><span>Enter Ward</span><ChevronRight size={16} /></>}
            </button>
          </div>

          <p className="text-center text-xs text-green-200/70 mt-4">
            Session locked to this ward. Sign out to change location.
          </p>
        </div>
      </main>
    </div>
  )
}
