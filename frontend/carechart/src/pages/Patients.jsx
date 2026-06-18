import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronLeft, ChevronRight, Loader2, AlertTriangle, Calendar } from 'lucide-react'
import { useWardSession } from '../contexts/WardSessionContext'
import api from '../api/client'

import { GREEN } from '../constants/colors'

const CAUTION_STYLE = {
  nbm:        { label: 'NBM',         bg: '#fff7ed', color: '#c2410c' },
  post_op:    { label: 'Post-op',     bg: '#eff6ff', color: '#1d4ed8' },
  blood_thin: { label: 'Blood Thin.', bg: '#fef2f2', color: '#b91c1c' },
  intubated:  { label: 'Intubated',   bg: '#f5f3ff', color: '#7c3aed' },
  pre_surg:   { label: 'Pre-surgery', bg: '#fefce8', color: '#a16207' },
  critical:   { label: 'Critical',    bg: '#fef2f2', color: '#b91c1c' },
  isolation:  { label: 'Isolation',   bg: '#f0fdf4', color: '#15803d' },
}

const URGENCY = {
  red:    { label: 'HIGH PROFILE', bg: '#fef2f2', color: '#b91c1c' },
  orange: { label: 'EXTRA CARE',   bg: '#fff7ed', color: '#c2410c' },
  yellow: { label: 'MID',          bg: '#fffbeb', color: '#a16207' },
  green:  { label: 'REGULAR',      bg: '#f0fdf4', color: '#15803d' },
}

const PAGE_SIZE = 20

const DATE_PRESETS = [
  { label: 'Today',      days: 0 },
  { label: 'Last 7d',    days: 7 },
  { label: 'Last 30d',   days: 30 },
  { label: 'This month', days: -1 },
]

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function timeAgo(iso) {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  const m = Math.floor(diff / 60000)
  if (h >= 24) return `${Math.floor(h / 24)}d ago`
  if (h > 0)   return `${h}h ago`
  if (m > 0)   return `${m}m ago`
  return 'just now'
}

function dayCount(iso) {
  if (!iso) return null
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return days === 0 ? 'Day 1' : `Day ${days + 1}`
}

function CautionBadge({ flag }) {
  const s = CAUTION_STYLE[flag] || { label: flag, bg: '#f3f4f6', color: '#374151' }
  return (
    <span className="inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function UrgencyPill({ level }) {
  const u = URGENCY[level] || URGENCY.green
  return (
    <span className="inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
      style={{ background: u.bg, color: u.color }}>
      {u.label}
    </span>
  )
}

function DateRangeDropdown({ from, to, onChange }) {
  const [open, setOpen] = useState(false)
  const [localFrom, setLocalFrom] = useState(from || '')
  const [localTo, setLocalTo]     = useState(to || '')
  const ref = useRef(null)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const applyPreset = (days) => {
    const toDate = new Date()
    let fromDate
    if (days === -1) {
      fromDate = new Date(toDate.getFullYear(), toDate.getMonth(), 1)
    } else if (days === 0) {
      fromDate = new Date(toDate)
    } else {
      fromDate = new Date(Date.now() - days * 86400000)
    }
    const f = fromDate.toISOString().slice(0, 10)
    const t = toDate.toISOString().slice(0, 10)
    setLocalFrom(f); setLocalTo(t)
    onChange(f, t)
    setOpen(false)
  }

  const applyCustom = () => {
    onChange(localFrom, localTo)
    setOpen(false)
  }

  const label = from && to ? `${fmt(from)} — ${fmt(to)}` : 'Date range'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs text-gray-600 hover:border-gray-400 transition-colors bg-white whitespace-nowrap"
        style={{ borderColor: open ? GREEN : '#d1d5db' }}
      >
        <Calendar size={12} style={{ color: from ? GREEN : '#9ca3af' }} />
        {label}
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-30 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-64">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {DATE_PRESETS.map(p => (
              <button key={p.label} onClick={() => applyPreset(p.days)}
                className="text-xs px-2.5 py-1 rounded-lg border hover:border-green-500 hover:text-green-700 transition-colors"
                style={{ borderColor: '#e5e7eb' }}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center mb-2">
            <input type="date" value={localFrom} onChange={e => setLocalFrom(e.target.value)}
              className="flex-1 border rounded-lg px-2 py-1 text-xs focus:outline-none"
              style={{ borderColor: '#d1d5db' }} />
            <span className="text-xs text-gray-400">—</span>
            <input type="date" value={localTo} onChange={e => setLocalTo(e.target.value)}
              className="flex-1 border rounded-lg px-2 py-1 text-xs focus:outline-none"
              style={{ borderColor: '#d1d5db' }} />
          </div>
          <div className="flex gap-2">
            <button onClick={applyCustom}
              className="flex-1 py-1 rounded-lg text-xs font-semibold text-white"
              style={{ background: GREEN }}>
              Apply
            </button>
            <button onClick={() => { setLocalFrom(''); setLocalTo(''); onChange('', ''); setOpen(false) }}
              className="px-3 py-1 rounded-lg text-xs text-gray-500 border border-gray-200 hover:bg-gray-50">
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Patients() {
  const { session }  = useWardSession()
  const navigate     = useNavigate()

  const [admissions, setAdmissions] = useState([])
  const [loading, setLoading]       = useState(true)
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)

  // Filters
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('active')
  const [urgency, setUrgency]   = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [live, setLive]         = useState(true)

  const wardId = session?.ward?.id
  const liveRef = useRef(live)
  liveRef.current = live

  const fetch = useCallback(async () => {
    if (!wardId) return
    setLoading(true)
    try {
      const params = { ward_id: wardId }
      if (status)   params.status    = status
      if (urgency)  params.triage_level = urgency
      if (dateFrom) params.from_date = dateFrom
      if (dateTo)   params.to_date   = dateTo
      if (search)   params.search    = search

      const data = await api.get('/inpatient/admissions', { params })
      const list = Array.isArray(data) ? data : (data.items || [])

      // Client-side search filter (in case API doesn't support it)
      const filtered = search
        ? list.filter(a =>
            (a.patient_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (a.admission_number || '').toLowerCase().includes(search.toLowerCase()) ||
            (a.bed_number || '').toLowerCase().includes(search.toLowerCase()) ||
            (a.mrn || '').toLowerCase().includes(search.toLowerCase())
          )
        : list

      setTotal(filtered.length)
      setAdmissions(filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE))
    } catch {
      setAdmissions([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [wardId, status, urgency, dateFrom, dateTo, search, page])

  useEffect(() => { setPage(1) }, [status, urgency, dateFrom, dateTo, search])

  useEffect(() => {
    fetch()
    const h = () => fetch()
    window.addEventListener('carechart:refresh', h)
    return () => window.removeEventListener('carechart:refresh', h)
  }, [fetch])

  // Live auto-refresh every 30s
  useEffect(() => {
    if (!live) return
    const t = setInterval(() => { if (liveRef.current) fetch() }, 30000)
    return () => clearInterval(t)
  }, [live, fetch])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const start = (page - 1) * PAGE_SIZE + 1
  const end   = Math.min(page * PAGE_SIZE, total)

  const isCritical = (a) => (a.caution_flags || a.cautions || []).some(f => f === 'critical')
  const isDischarged = (a) => a.status === 'discharged'

  return (
    <div className="flex flex-col h-full">

      {/* Filters */}
      <div className="bg-white border-b border-gray-100 px-5 py-2.5 flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search MRN, name, bed…"
            className="w-full pl-8 pr-3 py-1.5 border rounded-lg text-xs focus:outline-none transition-colors"
            style={{ borderColor: search ? GREEN : '#d1d5db' }}
          />
        </div>

        {/* Status */}
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="border rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none bg-white"
          style={{ borderColor: '#d1d5db' }}>
          <option value="">All Status</option>
          <option value="active">Admitted</option>
          <option value="discharged">Discharged</option>
          <option value="transferred">Transferred</option>
        </select>

        {/* Urgency */}
        <select value={urgency} onChange={e => setUrgency(e.target.value)}
          className="border rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none bg-white"
          style={{ borderColor: '#d1d5db' }}>
          <option value="">All Urgency</option>
          <option value="red">High Profile</option>
          <option value="orange">Extra Care</option>
          <option value="yellow">Mid</option>
          <option value="green">Regular</option>
        </select>

        {/* Date range */}
        <DateRangeDropdown from={dateFrom} to={dateTo}
          onChange={(f, t) => { setDateFrom(f); setDateTo(t) }} />

        {/* Live toggle */}
        <button
          onClick={() => setLive(l => !l)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs font-medium transition-colors"
          style={{
            borderColor: live ? GREEN : '#d1d5db',
            background: live ? '#f0fdf4' : 'white',
            color: live ? GREEN : '#6b7280',
          }}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
          Live
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading patients…
          </div>
        ) : admissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <AlertTriangle size={24} className="mb-2 opacity-40" />
            <p className="text-sm">No patients found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-white z-10 border-b border-gray-100">
              <tr>
                {['MRN', 'Bed', 'Patient', 'Age/Sex', 'Diagnosis', 'Doctor', 'Admitted', 'Stay', 'Est. Disch.', 'Last Review', 'Cautions / Urgency'].map(h => (
                  <th key={h} className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {admissions.map((a, i) => {
                const critical    = isCritical(a)
                const discharged  = isDischarged(a)
                const lastReview  = timeAgo(a.last_vitals_at || a.last_review_at)
                const overdue     = a.last_vitals_at && (Date.now() - new Date(a.last_vitals_at).getTime()) > 4 * 3600 * 1000
                const cautions    = a.caution_flags || a.cautions || []

                return (
                  <tr
                    key={a.id || i}
                    onClick={() => navigate(`/chart/${a.id}`)}
                    className="cursor-pointer hover:bg-green-50 transition-colors border-b border-gray-50"
                    style={{
                      borderLeft: critical ? '2px solid #dc2626' : '2px solid transparent',
                      opacity: discharged ? 0.65 : 1,
                    }}
                  >
                    <td className="px-3 py-1.5 text-[11px] font-mono text-gray-500 whitespace-nowrap">
                      {a.admission_number || a.mrn || '—'}
                    </td>
                    <td className="px-3 py-1.5 text-xs font-semibold text-gray-700 whitespace-nowrap">
                      {a.bed_number || '—'}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <span className="text-xs font-semibold text-gray-800">{a.patient_name || '—'}</span>
                    </td>
                    <td className="px-3 py-1.5 text-xs text-gray-600 whitespace-nowrap">
                      {a.age && a.gender ? `${a.age}${a.gender[0]?.toUpperCase()}` : a.age_sex || '—'}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-gray-700 max-w-[140px] truncate">
                      {a.primary_diagnosis || '—'}
                    </td>
                    <td className="px-3 py-1.5 text-xs text-gray-600 whitespace-nowrap">
                      {a.doctor_name || '—'}
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-gray-500 whitespace-nowrap">
                      {fmt(a.admitted_at)}
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-gray-500 whitespace-nowrap">
                      {discharged
                        ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">DISCHARGED</span>
                        : dayCount(a.admitted_at) || '—'
                      }
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-gray-500 whitespace-nowrap">
                      {a.expected_discharge ? fmt(a.expected_discharge) : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-[11px] whitespace-nowrap"
                      style={{ color: overdue ? '#d97706' : '#6b7280' }}>
                      {lastReview || '—'}
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex flex-wrap gap-1">
                        {cautions.map(f => <CautionBadge key={f} flag={f} />)}
                        {a.triage_level && <UrgencyPill level={a.triage_level} />}
                      </div>
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
        <div className="bg-white border-t border-gray-100 px-5 py-2 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-gray-400">
            {start}–{end} of {total} patients
          </span>
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
                p === '…'
                  ? <span key={`e${idx}`} className="text-xs text-gray-400 px-1">…</span>
                  : <button key={p} onClick={() => setPage(p)}
                      className="w-6 h-6 rounded-md text-xs font-medium transition-colors"
                      style={p === page
                        ? { background: GREEN, color: 'white' }
                        : { color: '#374151' }}>
                      {p}
                    </button>
              )
            }
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
