import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  ChevronDown,
  Tag,
  AlertTriangle,
  CheckCircle,
  X,
  Flag,
  Pill,
  Droplets,
  Thermometer,
  Activity,
  Wind,
  Heart,
  User,
  Phone,
  Wrench,
  FileText,
  Lock,
  Search,
} from 'lucide-react'
import api from '../api/client'
import { useWardSession } from '../contexts/WardSessionContext'

const ACUITY_CONFIG = {
  HIGH: { label: 'HIGH', dot: '🔴', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  MED: { label: 'MED', dot: '🟡', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  ROU: { label: 'ROU', dot: '🟢', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
}

const PRIORITY_CONFIG = {
  urgent: { dot: '🔴', label: 'Urgent', color: 'text-red-600' },
  watch: { dot: '🟡', label: 'Watch', color: 'text-yellow-600' },
  info: { dot: '🔵', label: 'Info', color: 'text-blue-600' },
}

const SHIFTS = [
  { id: 'morning', label: 'Morning', time: '07–15' },
  { id: 'evening', label: 'Evening', time: '15–23' },
  { id: 'night', label: 'Night', time: '23–07' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function VitalsRow({ vitals }) {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      <span className="flex items-center gap-1 text-gray-600">
        <Activity className="w-3.5 h-3.5 text-rose-500" />
        <span className="font-medium">BP</span> {vitals.bp}
      </span>
      <span className="flex items-center gap-1 text-gray-600">
        <Heart className="w-3.5 h-3.5 text-rose-400" />
        <span className="font-medium">P</span> {vitals.pulse}
      </span>
      <span className="flex items-center gap-1 text-gray-600">
        <Thermometer className="w-3.5 h-3.5 text-orange-400" />
        <span className="font-medium">T</span> {vitals.temp}°C
      </span>
      <span className="flex items-center gap-1 text-gray-600">
        <Droplets className="w-3.5 h-3.5 text-blue-400" />
        <span className="font-medium">SpO₂</span> {vitals.spo2}%
      </span>
      <span className="flex items-center gap-1 text-gray-600">
        <Wind className="w-3.5 h-3.5 text-teal-400" />
        <span className="font-medium">RR</span> {vitals.rr}/min
      </span>
      <span className="text-gray-400 ml-auto">at {vitals.time}</span>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1">{children}</p>
  )
}

function TagChip({ count }) {
  if (!count) return null
  return (
    <span className="inline-flex items-center gap-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 py-0.5 text-[10px] font-semibold">
      🏷 {count}
    </span>
  )
}

// Filter chip with an inline count — replaces the stat cards (the numbers double as filters)
function FilterChip({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors"
      style={{
        background: active ? '#4f46e5' : 'white',
        color: active ? 'white' : '#374151',
        borderColor: active ? '#4f46e5' : '#d1d5db',
      }}
    >
      {label}
      <span
        className="rounded-full px-1.5 text-[10px] font-bold leading-none py-0.5"
        style={{
          background: active ? 'rgba(255,255,255,0.25)' : '#f3f4f6',
          color: active ? 'white' : '#6b7280',
        }}
      >
        {count}
      </span>
    </button>
  )
}

// ─── Patient Accordion Row ────────────────────────────────────────────────────

function PatientRow({ patient, isOpen, onToggle, onSign, onTagAdd, onTagDelete }) {
  const [showTagForm, setShowTagForm] = useState(false)
  const [tagPriority, setTagPriority] = useState('info')
  const [tagNote, setTagNote] = useState('')
  const [tagSaving, setTagSaving] = useState(false)
  const [noteText, setNoteText] = useState(patient.nurseNote)

  const acuity = ACUITY_CONFIG[patient.acuity]
  const pendingTasks = patient.tasks.filter(t => !t.done).length

  const handleSign = async (e) => {
    e.stopPropagation()
    onSign(patient.id)
  }

  const handleSaveTag = async () => {
    if (!tagNote.trim()) return
    setTagSaving(true)
    const tag = {
      id: `t-${Date.now()}`,
      priority: tagPriority,
      nurse: 'Sr. Current User',
      ts: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      note: tagNote.trim(),
    }
    try {
      await api.post('/inpatient/handoff/tags', {
        admissionId: patient.id,
        ...tag,
      })
    } catch {
      // fallback to mock
    }
    onTagAdd(patient.id, tag)
    setTagNote('')
    setTagPriority('info')
    setShowTagForm(false)
    setTagSaving(false)
  }

  const handleDeleteTag = async (tagId) => {
    try {
      await api.delete(`/inpatient/handoff/tags/${tagId}`)
    } catch {
      // fallback
    }
    onTagDelete(patient.id, tagId)
  }

  return (
    <div className={`border-b border-gray-100 transition-colors ${isOpen ? 'bg-slate-50' : 'hover:bg-gray-50'}`}>
      {/* ── Table Row ── */}
      <div
        className="grid gap-2 px-4 py-2.5 cursor-pointer select-none"
        style={{ gridTemplateColumns: '52px 1fr 1fr 80px 56px 64px 80px 28px' }}
        onClick={onToggle}
      >
        {/* BED */}
        <div className="flex items-center">
          <span className="font-bold text-gray-800 text-sm">{patient.bed}</span>
        </div>

        {/* PATIENT */}
        <div className="flex flex-col justify-center min-w-0">
          <span className="font-semibold text-gray-900 text-sm truncate">{patient.name}</span>
          <span className="text-[10px] text-gray-500">{patient.age}y / {patient.gender} · {patient.doctor}</span>
        </div>

        {/* DIAGNOSIS */}
        <div className="flex items-center min-w-0">
          <span className="text-xs text-gray-700 truncate">{patient.diagnosis}</span>
        </div>

        {/* ACUITY */}
        <div className="flex items-center">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${acuity.bg} ${acuity.text} ${acuity.border}`}>
            {acuity.dot} {acuity.label}
          </span>
        </div>

        {/* TASKS */}
        <div className="flex items-center">
          {pendingTasks > 0 ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              <AlertTriangle className="w-2.5 h-2.5" /> {pendingTasks}
            </span>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </div>

        {/* TAGS */}
        <div className="flex items-center">
          <TagChip count={patient.tags.length} />
        </div>

        {/* SIGN */}
        <div className="flex items-center" onClick={e => e.stopPropagation()}>
          {patient.signed ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
              <CheckCircle className="w-3.5 h-3.5" /> Done
            </span>
          ) : (
            <button
              onClick={handleSign}
              className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded px-2 py-1 transition-colors"
            >
              Sign ✓
            </button>
          )}
        </div>

        {/* CHEVRON */}
        <div className="flex items-center justify-center text-gray-400">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </div>

      {/* ── Accordion Dropdown ── */}
      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left column */}
            <div className="space-y-3">
              {/* VITALS */}
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <SectionLabel>Vitals</SectionLabel>
                <VitalsRow vitals={patient.vitals} />
              </div>

              {/* IV/LINES */}
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <SectionLabel>IV / Lines</SectionLabel>
                {patient.iv.site === 'None' ? (
                  <p className="text-xs text-gray-500">No IV access</p>
                ) : (
                  <div className="text-xs text-gray-700 space-y-0.5">
                    <p><span className="font-medium">Site:</span> {patient.iv.site} · {patient.iv.gauge}</p>
                    <p><span className="font-medium">Day:</span> {patient.iv.day}</p>
                    <p><span className="font-medium">Rate:</span> {patient.iv.rate}</p>
                  </div>
                )}
              </div>

              {/* DIET/FLUID */}
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <SectionLabel>Diet / Fluid</SectionLabel>
                <p className="text-xs text-gray-700">{patient.diet}</p>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-3">
              {/* MEDS DUE */}
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <SectionLabel>Meds Due</SectionLabel>
                {patient.medsDue.length === 0 ? (
                  <p className="text-xs text-gray-400">None pending</p>
                ) : (
                  <ul className="space-y-1">
                    {patient.medsDue.map((m, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs">
                        <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span className="font-medium text-gray-600 w-14 flex-shrink-0">{m.time}</span>
                        <span className="text-gray-800">{m.drug}</span>
                        <span className="text-gray-400 ml-auto">{m.route}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* TASKS */}
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <SectionLabel>Tasks</SectionLabel>
                {patient.tasks.length === 0 ? (
                  <p className="text-xs text-gray-400">No pending tasks</p>
                ) : (
                  <ul className="space-y-1">
                    {patient.tasks.map((t, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs">
                        <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span className={t.done ? 'line-through text-gray-400' : 'text-gray-800'}>{t.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* ALERTS */}
              {patient.alerts.length > 0 && (
                <div className="bg-red-50 rounded-lg border border-red-200 p-3">
                  <SectionLabel>Alerts</SectionLabel>
                  <ul className="space-y-1">
                    {patient.alerts.map((a, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-red-700">
                        <Flag className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* ── NURSE TAGS ── */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <SectionLabel>Nurse Tags</SectionLabel>
              {!showTagForm && (
                <button
                  onClick={() => setShowTagForm(true)}
                  className="text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
                >
                  <Tag className="w-3 h-3" /> + Add Tag
                </button>
              )}
            </div>

            {patient.tags.length === 0 && !showTagForm && (
              <p className="text-xs text-gray-400">No tags yet.</p>
            )}

            {patient.tags.map(tag => {
              const pc = PRIORITY_CONFIG[tag.priority]
              return (
                <div key={tag.id} className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
                  <span className="mt-0.5 text-sm leading-none">{pc.dot}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-bold ${pc.color}`}>{pc.label}</span>
                      <span className="text-[10px] text-gray-500">{tag.nurse}</span>
                      <span className="text-[10px] text-gray-400">{tag.ts}</span>
                    </div>
                    <p className="text-xs text-gray-700">{tag.note}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors mt-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}

            {showTagForm && (
              <div className="mt-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                {/* Priority selector */}
                <div className="flex items-center gap-2">
                  {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                    <label key={key} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name={`tag-priority-${patient.id}`}
                        value={key}
                        checked={tagPriority === key}
                        onChange={() => setTagPriority(key)}
                        className="sr-only"
                      />
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${tagPriority === key ? 'bg-indigo-100 border-indigo-400 text-indigo-800' : 'bg-white border-gray-200 text-gray-500'}`}>
                        {cfg.dot} {cfg.label}
                      </span>
                    </label>
                  ))}
                </div>
                <textarea
                  value={tagNote}
                  onChange={e => setTagNote(e.target.value)}
                  placeholder="Tag note…"
                  rows={2}
                  className="w-full border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowTagForm(false); setTagNote('') }}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTag}
                    disabled={tagSaving || !tagNote.trim()}
                    className="text-xs font-semibold bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {tagSaving ? 'Saving…' : 'Save Tag'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── NURSE NOTE ── */}
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <SectionLabel>Nurse Note — Shift Summary</SectionLabel>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              rows={3}
              className="w-full border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none resize-none mt-1"
              placeholder="Shift handoff summary for incoming nurse…"
            />
          </div>

          {/* ── Footer actions ── */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={onToggle}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg"
            >
              Cancel
            </button>
            {!patient.signed ? (
              <button
                onClick={handleSign}
                className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Sign ✓
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle className="w-3.5 h-3.5" /> Signed
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ShiftHandoff() {
  const navigate = useNavigate()
  const { session } = useWardSession()

  const [shift, setShift] = useState('morning')
  const [fromNurse, setFromNurse] = useState('')
  const [toNurse, setToNurse] = useState('')
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [openRow, setOpenRow] = useState(null)

  const wardId = session?.ward?.id

  useEffect(() => {
    if (!wardId) return
    setLoading(true)
    setError(null)
    api.get(`/inpatient/wards/${wardId}/handoff-roster`)
      .then(data => setPatients(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load handoff roster. Please retry.'))
      .finally(() => setLoading(false))
  }, [wardId])

  // filters (the old stat-card numbers now live in the filter chips)
  const [acuityFilter, setAcuityFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  // Ward notes
  const [erAdmissions, setErAdmissions] = useState('')
  const [oncallDoctor, setOncallDoctor] = useState('Dr. Sharma')
  const [oncallPhone, setOncallPhone] = useState('98XXXXXXXX')
  const [equipmentIssues, setEquipmentIssues] = useState('')
  const [staffNote, setStaffNote] = useState('')

  // PIN gate
  const [pinValue, setPinValue] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [saving, setSaving] = useState(false)

  const totalPatients = patients.length
  const signedCount = patients.filter(p => p.signed).length
  const unsignedCount = totalPatients - signedCount
  const progressPct = totalPatients ? Math.round((signedCount / totalPatients) * 100) : 0
  const allSigned = totalPatients > 0 && signedCount === totalPatients

  const acuityCounts = { HIGH: 0, MED: 0, ROU: 0 }
  patients.forEach(p => { if (acuityCounts[p.acuity] !== undefined) acuityCounts[p.acuity] += 1 })

  const visible = patients.filter(p => {
    const q = search.trim().toLowerCase()
    const matchSearch = !q || [p.name, p.bed, p.diagnosis, p.doctor].some(v => (v || '').toLowerCase().includes(q))
    const matchAcuity = acuityFilter === 'ALL' || p.acuity === acuityFilter
    const matchStatus = statusFilter === 'ALL' || (statusFilter === 'signed' ? p.signed : !p.signed)
    return matchSearch && matchAcuity && matchStatus
  })

  const toggleRow = useCallback((id) => {
    setOpenRow(prev => (prev === id ? null : id))
  }, [])

  const handleSign = useCallback(async (patientId) => {
    try {
      await api.post(`/inpatient/handoff/sign/${patientId}`, {})
    } catch {
      // fallback to local
    }
    setPatients(prev => prev.map(p => p.id === patientId ? { ...p, signed: true } : p))
  }, [])

  const handleTagAdd = useCallback((patientId, tag) => {
    setPatients(prev => prev.map(p =>
      p.id === patientId ? { ...p, tags: [...p.tags, tag] } : p
    ))
  }, [])

  const handleTagDelete = useCallback((patientId, tagId) => {
    setPatients(prev => prev.map(p =>
      p.id === patientId ? { ...p, tags: p.tags.filter(t => t.id !== tagId) } : p
    ))
  }, [])

  const handleSaveDraft = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800)) // simulate
    setSaving(false)
  }

  const handleCompleteHandoff = async () => {
    if (pinValue.length < 4) return
    setCompleting(true)
    try {
      await api.post('/inpatient/handoff/complete', {
        shift,
        fromNurse,
        toNurse,
        pin: pinValue,
        wardId: session?.ward?.id,
      })
      setCompleted(true)
    } catch (e) {
      alert(e?.response?.data?.detail || 'Could not complete the handoff. Please retry.')
    } finally {
      setCompleting(false)
    }
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Handoff Complete</h2>
          <p className="text-sm text-gray-500">Shift handoff has been signed and submitted.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 text-sm font-semibold text-indigo-700 border border-indigo-300 px-4 py-2 rounded-lg hover:bg-indigo-50"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-3 space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-3 space-y-3">
      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          <span className="text-sm text-red-700">{error}</span>
          <button
            onClick={() => {
              if (!wardId) return
              setLoading(true); setError(null)
              api.get(`/inpatient/wards/${wardId}/handoff-roster`)
                .then(data => setPatients(Array.isArray(data) ? data : []))
                .catch(() => setError('Failed to load handoff roster. Please retry.'))
                .finally(() => setLoading(false))
            }}
            className="text-xs font-semibold text-red-700 border border-red-300 rounded px-2.5 py-1 hover:bg-red-100 ml-4"
          >
            Retry
          </button>
        </div>
      )}
      {/* ── No ward selected ── */}
      {!wardId && !error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
          No ward selected. Please select a ward from the session to load the handoff roster.
        </div>
      )}
      {/* ── Compact toolbar: title + shift selector (folded the duplicate header) ── */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-base font-bold text-gray-900">Shift Handoff</h1>
        <div className="flex gap-1">
          {SHIFTS.map(s => (
            <button
              key={s.id}
              onClick={() => setShift(s.id)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${shift === s.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}
            >
              {s.label} <span className="font-normal opacity-70">{s.time}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Filter / count bar (the stat-card numbers now live here as filters) ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search patient, bed, diagnosis…"
            className="border rounded-lg pl-7 pr-3 py-1.5 text-xs bg-white focus:outline-none w-56"
            style={{ borderColor: '#d1d5db' }} />
        </div>
        <FilterChip label="All" count={totalPatients} active={acuityFilter === 'ALL'} onClick={() => setAcuityFilter('ALL')} />
        <FilterChip label="🔴 High" count={acuityCounts.HIGH} active={acuityFilter === 'HIGH'} onClick={() => setAcuityFilter(f => f === 'HIGH' ? 'ALL' : 'HIGH')} />
        <FilterChip label="🟡 Med" count={acuityCounts.MED} active={acuityFilter === 'MED'} onClick={() => setAcuityFilter(f => f === 'MED' ? 'ALL' : 'MED')} />
        <FilterChip label="🟢 Rou" count={acuityCounts.ROU} active={acuityFilter === 'ROU'} onClick={() => setAcuityFilter(f => f === 'ROU' ? 'ALL' : 'ROU')} />
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <FilterChip label="Unsigned" count={unsignedCount} active={statusFilter === 'unsigned'} onClick={() => setStatusFilter(s => s === 'unsigned' ? 'ALL' : 'unsigned')} />
        <FilterChip label="Signed" count={signedCount} active={statusFilter === 'signed'} onClick={() => setStatusFilter(s => s === 'signed' ? 'ALL' : 'signed')} />
        {(search || acuityFilter !== 'ALL' || statusFilter !== 'ALL') && (
          <button onClick={() => { setSearch(''); setAcuityFilter('ALL'); setStatusFilter('ALL') }}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
            <X size={12} /> Clear
          </button>
        )}
      </div>

      <div className="space-y-3">

        {/* ── Patient Table ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Progress bar */}
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
            <span className="text-xs font-medium text-gray-700">
              {signedCount}/{totalPatients} signed
            </span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{progressPct}%</span>
          </div>

          {/* Table header */}
          <div
            className="grid gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200"
            style={{ gridTemplateColumns: '52px 1fr 1fr 80px 56px 64px 80px 28px' }}
          >
            {['BED', 'PATIENT', 'DIAGNOSIS', 'ACUITY', 'TASKS', 'TAGS', 'STATUS', ''].map((h, i) => (
              <span key={i} className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">{h}</span>
            ))}
          </div>

          {/* Rows */}
          <div>
            {visible.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-400">
                {patients.length === 0 ? 'No patients in this handoff.' : 'No patients match the current filters.'}
              </div>
            ) : visible.map(p => (
              <PatientRow
                key={p.id}
                patient={p}
                isOpen={openRow === p.id}
                onToggle={() => toggleRow(p.id)}
                onSign={handleSign}
                onTagAdd={handleTagAdd}
                onTagDelete={handleTagDelete}
              />
            ))}
          </div>
        </div>

        {/* ── Ward Notes ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" /> Ward Notes
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left */}
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                  Pending ER Admissions
                </label>
                <input
                  value={erAdmissions}
                  onChange={e => setErAdmissions(e.target.value)}
                  placeholder="e.g. 2 admissions expected from ER — chest pain, trauma"
                  className="w-full border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                  Equipment Issues
                </label>
                <input
                  value={equipmentIssues}
                  onChange={e => setEquipmentIssues(e.target.value)}
                  placeholder="e.g. Ventilator B3 — low battery alert"
                  className="w-full border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Right */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> On-Call Doctor
                  </label>
                  <input
                    value={oncallDoctor}
                    onChange={e => setOncallDoctor(e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Phone
                  </label>
                  <input
                    value={oncallPhone}
                    onChange={e => setOncallPhone(e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1 flex items-center gap-1">
                  <Wrench className="w-3 h-3" /> Staff Note
                </label>
                <textarea
                  value={staffNote}
                  onChange={e => setStaffNote(e.target.value)}
                  rows={3}
                  placeholder="Staff-level handoff notes, overtime, short-staffing, etc."
                  className="w-full border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
          {/* Handoff from → to (moved here from the header) */}
          <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-gray-100">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mr-1">Handoff</span>
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <input
                value={fromNurse}
                onChange={e => setFromNurse(e.target.value)}
                placeholder="From nurse"
                className="border rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none w-40"
              />
            </div>
            <span className="text-gray-400 text-xs">→</span>
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <input
                value={toNurse}
                onChange={e => setToNurse(e.target.value)}
                placeholder="To nurse"
                className="border rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none w-40"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-gray-500">
              {!allSigned && (
                <span className="text-amber-600 font-medium">
                  {totalPatients - signedCount} patient(s) not yet signed — complete all to enable handoff.
                </span>
              )}
              {allSigned && !showPin && (
                <span className="text-emerald-600 font-medium">All patients signed. Ready to complete handoff.</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="text-xs font-semibold text-gray-700 border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Draft'}
              </button>

              {!showPin ? (
                <button
                  onClick={() => { if (allSigned) setShowPin(true) }}
                  disabled={!allSigned}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${allSigned ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                >
                  {!allSigned && <Lock className="w-3.5 h-3.5" />}
                  Complete Handoff
                  {allSigned && <span>▸</span>}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    maxLength={6}
                    value={pinValue}
                    onChange={e => setPinValue(e.target.value.replace(/\D/g, ''))}
                    placeholder="PIN"
                    className="border rounded-lg px-2.5 py-1.5 text-xs w-24 tracking-widest focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleCompleteHandoff}
                    disabled={pinValue.length < 4 || completing}
                    className="text-xs font-semibold bg-emerald-600 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {completing ? 'Submitting…' : 'Confirm ✓'}
                  </button>
                  <button
                    onClick={() => { setShowPin(false); setPinValue('') }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
