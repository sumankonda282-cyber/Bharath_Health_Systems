import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Loader2, AlertTriangle, Calendar, ChevronsUpDown } from 'lucide-react'
import { useWardSession } from '../contexts/WardSessionContext'
import api from '../api/client'

import { GREEN } from '../constants/colors'

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
  { label: 'Today',   days: 0 },
  { label: 'Yesterday', days: 1 },
  { label: 'Last 7d', days: 7 },
]

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

function duration(startIso, endIso) {
  if (!startIso || !endIso) return '—'
  const mins = Math.round((new Date(endIso) - new Date(startIso)) / 60000)
  if (mins < 1) return '<1 min'
  return `${mins} min`
}

function StatusPill({ status }) {
  const s = ROUND_STATUS[status] || ROUND_STATUS.pending
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {s.label}
    </span>
  )
}

function SortIcon({ col, sortKey, sortDir }) {
  if (sortKey !== col) return <ChevronsUpDown size={11} className="text-gray-300 ml-0.5" />
  return sortDir === 'asc'
    ? <ChevronUp size={11} className="ml-0.5" style={{ color: GREEN }} />
    : <ChevronDown size={11} className="ml-0.5" style={{ color: GREEN }} />
}

function DateDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const label = !value ? 'Today'
    : value === today ? 'Today'
    : fmtDate(value)

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs text-gray-600 bg-white hover:border-gray-400 transition-colors whitespace-nowrap"
        style={{ borderColor: open ? GREEN : '#d1d5db' }}>
        <Calendar size={12} style={{ color: value ? GREEN : '#9ca3af' }} />
        {label}
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-52">
          <div className="flex flex-col gap-1 mb-3">
            {DATE_PRESETS.map(p => {
              const d = new Date(Date.now() - p.days * 86400000).toISOString().slice(0, 10)
              return (
                <button key={p.label} onClick={() => { onChange(d); setOpen(false) }}
                  className="text-left text-xs px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  style={{ color: value === d ? GREEN : '#374151', fontWeight: value === d ? 700 : 400 }}>
                  {p.label}
                </button>
              )
            })}
          </div>
          <input type="date" value={value || today}
            onChange={e => { onChange(e.target.value); setOpen(false) }}
            className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none"
            style={{ borderColor: '#d1d5db' }} />
        </div>
      )}
    </div>
  )
}

const COLUMNS = [
  { key: 'bed_number',    label: 'Bed',        sortable: true  },
  { key: 'patient_name',  label: 'Patient',    sortable: true  },
  { key: 'age_sex',       label: 'Age/Sex',    sortable: false },
  { key: 'diagnosis',     label: 'Diagnosis',  sortable: true  },
  { key: 'doctor_name',   label: 'Doctor',     sortable: true  },
  { key: 'scheduled_at',  label: 'Scheduled',  sortable: true  },
  { key: 'started_at',    label: 'Last Round', sortable: true  },
  { key: 'duration',      label: 'Duration',   sortable: false },
  { key: 'notes_preview', label: 'Notes',      sortable: false },
  { key: 'status',        label: 'Status',     sortable: true  },
]

export default function WardRounds() {
  const { session } = useWardSession()
  const navigate    = useNavigate()

  const [rounds, setRounds]   = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)

  const [statusFilter, setStatus] = useState('')
  const [search, setSearch]       = useState('')
  const [doctor, setDoctor]       = useState('')
  const [date, setDate]           = useState(new Date().toISOString().slice(0, 10))
  const [roundType, setRoundType] = useState('')
  const [live, setLive]           = useState(true)
  const [sortKey, setSortKey]     = useState('scheduled_at')
  const [sortDir, setSortDir]     = useState('asc')

  const [doctors, setDoctors] = useState([])

  const wardId  = session?.ward?.id
  const liveRef = useRef(live)
  liveRef.current = live

  const load = useCallback(async () => {
    if (!wardId) return
    setLoading(true)
    try {
      const params = { ward_id: wardId }
      if (statusFilter) params.status     = statusFilter
      if (doctor)       params.doctor_id  = doctor
      if (date)         params.date       = date
      if (roundType)    params.round_type = roundType
      if (search)       params.search     = search

      const data = await api.get('/inpatient/ward-rounds', { params })
      const list = Array.isArray(data) ? data : (data.items || data.rounds || [])

      // Extract unique doctors for filter
      const docSet = {}
      list.forEach(r => { if (r.doctor_id && r.doctor_name) docSet[r.doctor_id] = r.doctor_name })
      setDoctors(Object.entries(docSet).map(([id, name]) => ({ id, name })))

      // Client-side search
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
          av = order[av] ?? 9; bv = order[bv] ?? 9
        }
        if (av < bv) return sortDir === 'asc' ? -1 : 1
        if (av > bv) return sortDir === 'asc' ?  1 : -1
        return 0
      })

      setTotal(sorted.length)
      setRounds(sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE))
    } catch {
      setRounds([]); setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [wardId, statusFilter, doctor, date, roundType, search, page, sortKey, sortDir])

  useEffect(() => { setPage(1) }, [statusFilter, doctor, date, roundType, search, sortKey, sortDir])

  useEffect(() => {
    load()
    const h = () => load()
    window.addEventListener('carechart:refresh', h)
    return () => window.removeEventListener('carechart:refresh', h)
  }, [load])

  useEffect(() => {
    if (!live) return
    const t = setInterval(() => { if (liveRef.current) load() }, 30000)
    return () => clearInterval(t)
  }, [live, load])

  const toggleSort = (col) => {
    if (!col.sortable) return
    if (sortKey === col.key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col.key); setSortDir('asc') }
  }

  // Counts per status for chips
  const counts = rounds.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})
  // When showing all, total is from API total
  const chipCounts = { '': total, ...counts }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const start = (page - 1) * PAGE_SIZE + 1
  const end   = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="flex flex-col h-full">

      {/* Stat chips strip */}
      <div className="bg-white border-b px-5 py-2 flex items-center gap-2 flex-shrink-0 flex-wrap"
        style={{ borderColor: '#f0f0f0' }}>
        {STAT_CHIPS.map(chip => {
          const active = statusFilter === chip.key
          const s = chip.key ? ROUND_STATUS[chip.key] : null
          return (
            <button key={chip.key}
              onClick={() => setStatus(chip.key)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all whitespace-nowrap"
              style={active
                ? { background: s?.bg || '#f0fdf4', color: s?.color || GREEN, borderColor: s?.border || '#bbf7d0' }
                : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }
              }>
              {chip.key && <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? ROUND_STATUS[chip.key]?.dot : '#d1d5db' }} />}
              {chip.label}
              <span className="ml-0.5 text-[10px]" style={{ color: active ? s?.color || GREEN : '#9ca3af' }}>
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
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search bed, patient, MRN…"
            className="pl-7 pr-3 py-1.5 border rounded-lg text-xs focus:outline-none w-48"
            style={{ borderColor: search ? GREEN : '#d1d5db' }} />
        </div>

        {/* Doctor */}
        <select value={doctor} onChange={e => setDoctor(e.target.value)}
          className="border rounded-lg px-2.5 py-1.5 text-xs text-gray-700 bg-white focus:outline-none"
          style={{ borderColor: '#d1d5db' }}>
          <option value="">All Doctors</option>
          {doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        {/* Round type */}
        <select value={roundType} onChange={e => setRoundType(e.target.value)}
          className="border rounded-lg px-2.5 py-1.5 text-xs text-gray-700 bg-white focus:outline-none"
          style={{ borderColor: '#d1d5db' }}>
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
        <button onClick={() => setLive(l => !l)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs font-medium transition-colors"
          style={{
            borderColor: live ? GREEN : '#d1d5db',
            background: live ? '#f0fdf4' : 'white',
            color: live ? GREEN : '#6b7280',
          }}>
          <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
          Live
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading rounds…
          </div>
        ) : rounds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <AlertTriangle size={24} className="mb-2 opacity-40" />
            <p className="text-sm">No ward rounds found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-white z-10 border-b" style={{ borderColor: '#f0f0f0' }}>
              <tr>
                {COLUMNS.map(col => (
                  <th key={col.key}
                    onClick={() => toggleSort(col)}
                    className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 whitespace-nowrap select-none"
                    style={{ cursor: col.sortable ? 'pointer' : 'default' }}>
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
                const adm       = r.admitted_at

                return (
                  <tr key={r.id || i}
                    onClick={() => r.admission_id && navigate(`/chart/${r.admission_id}`)}
                    className="cursor-pointer hover:bg-green-50 transition-colors border-b border-gray-50"
                    style={{
                      borderLeft: critical ? '2px solid #dc2626' : '2px solid transparent',
                      opacity: completed ? 0.65 : 1,
                    }}>

                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <span className="text-sm font-extrabold text-gray-900">{r.bed_number || '—'}</span>
                    </td>

                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <span className="text-xs font-semibold text-gray-800">{r.patient_name || '—'}</span>
                    </td>

                    <td className="px-3 py-1.5 text-xs text-gray-500 whitespace-nowrap">
                      {r.age && r.gender
                        ? `${r.age}${r.gender[0]?.toUpperCase()} · ${dayCount(adm)}`
                        : r.age_sex || '—'}
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
                      {duration(r.started_at, r.ended_at)}
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
          <span className="text-xs text-gray-400">{start}–{end} of {total} rounds</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
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
                p === '…'
                  ? <span key={`e${idx}`} className="text-xs text-gray-400 px-1">…</span>
                  : <button key={p} onClick={() => setPage(p)}
                      className="w-6 h-6 rounded-md text-xs font-medium transition-colors"
                      style={p === page ? { background: GREEN, color: 'white' } : { color: '#374151' }}>
                      {p}
                    </button>
              )}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
              <ChevronRight size={15} className="text-gray-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
