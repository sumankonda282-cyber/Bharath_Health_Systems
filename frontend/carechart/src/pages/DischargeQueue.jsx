import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  FileText, Truck, Home, Ambulance, Users,
  Lock, Loader2, ClipboardList, Stethoscope, X
} from 'lucide-react'
import api from '../api/client'
import { useWardSession } from '../contexts/WardSessionContext'

import { GREEN, NAVY, RED } from '../constants/colors'
const AMBER = '#b45309'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}
function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
}

function countPending(checklist) {
  let pending = 0
  for (const section of Object.values(checklist)) {
    for (const task of Object.values(section)) {
      if (!task.done) pending++
    }
  }
  return pending
}

// ─── Status chip ──────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  READY:      { bg: '#f0fdf4', color: '#065F46', border: '#a7f3d0', label: 'Ready' },
  PENDING:    { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'Pending' },
  DELAYED:    { bg: '#fff1f2', color: '#b91c1c', border: '#fecdd3', label: 'Delayed' },
  DISCHARGED: { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb', label: 'Discharged' },
}

function StatusChip({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.PENDING
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}>
      {s.label}
    </span>
  )
}

// ─── Checklist task row ───────────────────────────────────────────────────────
function TaskRow({ task, label, onMark, showTransportPicker, transportMode, onTransportMode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 flex-shrink-0">
        {task.done
          ? <CheckCircle2 size={15} style={{ color: GREEN }} />
          : <div className="w-3.5 h-3.5 rounded-full border-2 mt-0.5" style={{ borderColor: '#d1d5db' }} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{label}</p>
        {task.done && task.by && (
          <p className="text-[10px] text-gray-400 mt-0.5">{task.by} · {fmtDateTime(task.at)}</p>
        )}
        {!task.done && showTransportPicker && (
          <div className="flex gap-1.5 mt-1.5">
            {['Home', 'Ambulance', 'Family'].map(mode => (
              <button key={mode} onClick={() => onTransportMode(mode)}
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors"
                style={{
                  background: transportMode === mode ? NAVY : 'white',
                  color: transportMode === mode ? 'white' : '#374151',
                  borderColor: transportMode === mode ? NAVY : '#d1d5db',
                }}>
                {mode === 'Home' && <Home size={8} />}
                {mode === 'Ambulance' && <Ambulance size={8} />}
                {mode === 'Family' && <Users size={8} />}
                {mode}
              </button>
            ))}
          </div>
        )}
      </div>
      {!task.done && (
        <button onClick={onMark}
          className="flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors hover:opacity-80"
          style={{ borderColor: GREEN, color: GREEN, background: '#f0fdf4' }}>
          Mark Done
        </button>
      )}
    </div>
  )
}

// ─── Checklist panel ─────────────────────────────────────────────────────────
function ChecklistPanel({ patient, onClose, onUpdate }) {
  const navigate = useNavigate()
  const [checklist, setChecklist] = useState(patient.checklist)
  const [notes, setNotes] = useState(patient.notes || '')
  const [transportMode, setTransportMode] = useState(
    patient.checklist.logistics.transport_arranged.transport_mode || null
  )
  const [pinStep, setPinStep] = useState(false)
  const [pin, setPin] = useState('')
  const [pinErr, setPinErr] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const mark = async (section, key) => {
    const now = new Date().toISOString()
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
    const by = currentUser.name || 'Current User'
    const extra = (key === 'transport_arranged' && transportMode) ? { transport_mode: transportMode } : {}

    const newChecklist = {
      ...checklist,
      [section]: {
        ...checklist[section],
        [key]: { done: true, by, at: now, ...extra }
      }
    }
    setChecklist(newChecklist)
    try {
      await api.patch(`/inpatient/admissions/${patient.id}/discharge-checklist`, {
        section, key, done: true, by, at: now, ...extra
      })
    } catch { /* silent fallback */ }
    onUpdate(patient.id, newChecklist, notes)
  }

  const handleConfirm = async () => {
    if (pin.length < 4) { setPinErr('Enter your PIN'); return }
    setPinLoading(true); setPinErr('')
    try {
      await api.post('/auth/staff/pin-identify', { pin })
      await api.post(`/inpatient/admissions/${patient.id}/confirm-discharge`, { notes })
      onUpdate(patient.id, checklist, notes, 'DISCHARGED')
      setPinStep(false)
    } catch {
      setPinErr('Invalid PIN or server error')
    } finally { setPinLoading(false) }
  }

  const allDone = countPending(checklist) === 0

  return (
    <div className="bg-gray-50 border-t border-b px-4 py-4" style={{ borderColor: '#e5e7eb' }}
      onClick={e => e.stopPropagation()}>
      <div className="max-w-3xl mx-auto space-y-4">

        {/* Clinical */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: '#e5e7eb' }}>
            <Stethoscope size={13} style={{ color: NAVY }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: NAVY }}>Clinical</span>
          </div>
          <div className="divide-y" style={{ borderColor: '#f3f4f6' }}>
            <TaskRow task={checklist.clinical.summary_signed} label={
              checklist.clinical.summary_signed.done
                ? `Discharge summary signed — ${checklist.clinical.summary_signed.by}, ${fmtDateTime(checklist.clinical.summary_signed.at)}`
                : 'Discharge summary signed'
            } onMark={() => mark('clinical', 'summary_signed')} />
            <TaskRow task={checklist.clinical.final_vitals} label="Final vitals recorded" onMark={() => mark('clinical', 'final_vitals')} />
            <TaskRow task={checklist.clinical.medications_counselled} label="Discharge medications counselled" onMark={() => mark('clinical', 'medications_counselled')} />
            <TaskRow task={checklist.clinical.iv_removed} label="IV line removed" onMark={() => mark('clinical', 'iv_removed')} />
          </div>
        </div>

        {/* Documentation */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: '#e5e7eb' }}>
            <FileText size={13} style={{ color: NAVY }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: NAVY }}>Documentation</span>
          </div>
          <div className="divide-y" style={{ borderColor: '#f3f4f6' }}>
            <TaskRow task={checklist.documentation.letter_printed} label="Discharge letter printed" onMark={() => mark('documentation', 'letter_printed')} />
            <TaskRow task={checklist.documentation.opd_booked} label="OPD follow-up appointment booked" onMark={() => mark('documentation', 'opd_booked')} />
          </div>
        </div>

        {/* Logistics */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: '#e5e7eb' }}>
            <Truck size={13} style={{ color: NAVY }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: NAVY }}>Logistics</span>
          </div>
          <div className="divide-y" style={{ borderColor: '#f3f4f6' }}>
            <TaskRow task={checklist.logistics.family_informed} label="Patient / family informed of discharge" onMark={() => mark('logistics', 'family_informed')} />
            <TaskRow
              task={checklist.logistics.transport_arranged}
              label="Transport arranged"
              onMark={() => { if (transportMode) mark('logistics', 'transport_arranged') }}
              showTransportPicker={!checklist.logistics.transport_arranged.done}
              transportMode={transportMode}
              onTransportMode={setTransportMode}
            />
            <TaskRow task={checklist.logistics.belongings_returned} label="Belongings returned to patient / family" onMark={() => mark('logistics', 'belongings_returned')} />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Discharge Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="Any notes for this discharge…"
            className="w-full border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none resize-none"
            style={{ borderColor: '#d1d5db' }} />
        </div>

        {/* PIN step */}
        {pinStep && (
          <div className="rounded-lg border p-3 flex items-start gap-3" style={{ borderColor: '#fde68a', background: '#fffbeb' }}>
            <Lock size={13} style={{ color: AMBER }} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-700 mb-2">Enter PIN to confirm discharge</p>
              <div className="flex items-center gap-2">
                <input type="password" value={pin} onChange={e => setPin(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                  placeholder="PIN" maxLength={8} autoFocus
                  className="border rounded-lg px-2.5 py-1.5 text-xs w-24 tracking-widest focus:outline-none"
                  style={{ borderColor: '#d1d5db' }} />
                <button onClick={handleConfirm} disabled={pinLoading}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg text-white flex items-center gap-1"
                  style={{ background: GREEN }}>
                  {pinLoading ? <Loader2 size={11} className="animate-spin" /> : <><CheckCircle2 size={11} /> Confirm</>}
                </button>
                <button onClick={() => { setPinStep(false); setPin(''); setPinErr('') }}
                  className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
              </div>
              {pinErr && <p className="text-[10px] text-red-600 mt-1">{pinErr}</p>}
            </div>
          </div>
        )}

        {/* Footer buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => navigate(`/chart/${patient.id}`)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border hover:opacity-80 transition-opacity"
            style={{ borderColor: NAVY, color: NAVY }}>
            <ClipboardList size={13} /> View Discharge Summary
          </button>
          {patient.status !== 'DISCHARGED' && (
            <button
              onClick={() => { if (allDone) setPinStep(true) }}
              disabled={!allDone}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg text-white transition-opacity"
              style={{ background: allDone ? GREEN : '#9ca3af', cursor: allDone ? 'pointer' : 'not-allowed' }}>
              <CheckCircle2 size={13} /> Confirm Discharge ✓
            </button>
          )}
          {!allDone && (
            <span className="text-[10px] text-amber-600 font-medium">
              {countPending(checklist)} task{countPending(checklist) !== 1 ? 's' : ''} remaining
            </span>
          )}
        </div>

      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DischargeQueue() {
  const { session } = useWardSession()
  const wardId = session?.ward?.id

  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  // filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [doctorFilter, setDoctorFilter] = useState('ALL')
  const [destFilter, setDestFilter] = useState('ALL')
  const [activeTab, setActiveTab] = useState('ALL')
  const [error, setError] = useState(null)

  // load data — enriched discharge worklist (real patients, joined names + LOS)
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/inpatient/discharge-queue', {
        params: wardId ? { ward_id: wardId } : {},
      })
      setPatients(Array.isArray(res) ? res : (res?.data || []))
    } catch {
      setError('Could not load the discharge queue. Please try again.')
      setPatients([])
    } finally {
      setLoading(false)
    }
  }, [wardId])

  useEffect(() => { load() }, [load])

  // derived
  const doctors = [...new Set(patients.map(p => p.doctor))].filter(Boolean)
  const destinations = [...new Set(patients.map(p => p.destination))].filter(Boolean)

  const filtered = patients.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q
      || (p.name || '').toLowerCase().includes(q)
      || (p.bed || '').toLowerCase().includes(q)
      || (p.diagnosis || '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter
    const matchDoctor = doctorFilter === 'ALL' || p.doctor === doctorFilter
    const matchDest = destFilter === 'ALL' || p.destination === destFilter
    const matchTab = activeTab === 'ALL'
      || (activeTab === 'READY' && p.status === 'READY')
      || (activeTab === 'PENDING' && p.status === 'PENDING')
      || (activeTab === 'DELAYED' && p.status === 'DELAYED')
      || (activeTab === 'DONE' && p.status === 'DISCHARGED')
    return matchSearch && matchStatus && matchDoctor && matchDest && matchTab
  })

  const counts = {
    total: patients.length,
    ready: patients.filter(p => p.status === 'READY').length,
    pending: patients.filter(p => p.status === 'PENDING').length,
    discharged: patients.filter(p => p.status === 'DISCHARGED').length,
    delayed: patients.filter(p => p.status === 'DELAYED').length,
  }

  const tabCounts = {
    ALL: patients.length,
    READY: counts.ready,
    PENDING: counts.pending,
    DELAYED: counts.delayed,
    DONE: counts.discharged,
  }

  const updatePatient = (id, newChecklist, newNotes, forceStatus) => {
    setPatients(prev => prev.map(p => {
      if (p.id !== id) return p
      const pending = countPending(newChecklist)
      let status = forceStatus || (pending === 0 ? 'READY' : p.status === 'DELAYED' ? 'DELAYED' : 'PENDING')
      if (forceStatus === 'DISCHARGED') status = 'DISCHARGED'
      return { ...p, checklist: newChecklist, notes: newNotes, status }
    }))
  }

  const toggleRow = (id) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  const TABS = [
    { key: 'ALL', label: 'All' },
    { key: 'READY', label: 'Ready' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'DELAYED', label: 'Delayed' },
    { key: 'DONE', label: 'Done' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={22} className="animate-spin" style={{ color: GREEN }} />
      </div>
    )
  }

  return (
    <div className="p-3 space-y-3 max-w-screen-xl mx-auto">

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{ background: '#fff1f2', borderColor: '#fecdd3' }}>
          <AlertTriangle size={16} style={{ color: RED }} className="flex-shrink-0" />
          <p className="text-sm font-medium" style={{ color: RED }}>{error}</p>
          <button onClick={load}
            className="ml-auto text-xs font-bold px-3 py-1 rounded-lg"
            style={{ background: RED, color: 'white' }}>
            Retry
          </button>
        </div>
      )}

      {/* Delayed alert banner */}
      {counts.delayed > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{ background: '#fff1f2', borderColor: '#fecdd3' }}>
          <AlertTriangle size={16} style={{ color: RED }} className="flex-shrink-0" />
          <p className="text-sm font-bold" style={{ color: RED }}>
            {counts.delayed} patient{counts.delayed !== 1 ? 's are' : ' is'} DELAYED — discharge orders incomplete
          </p>
          <button onClick={() => setActiveTab('DELAYED')}
            className="ml-auto text-xs font-bold px-3 py-1 rounded-lg"
            style={{ background: RED, color: 'white' }}>
            View Delayed
          </button>
        </div>
      )}

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search patient, bed, diagnosis…"
            className="border rounded-lg pl-7 pr-3 py-2 text-xs bg-white focus:outline-none w-60"
            style={{ borderColor: '#d1d5db' }} />
        </div>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none"
          style={{ borderColor: '#d1d5db' }}>
          <option value="ALL">All Statuses</option>
          <option value="READY">Ready</option>
          <option value="PENDING">Pending</option>
          <option value="DELAYED">Delayed</option>
          <option value="DISCHARGED">Discharged</option>
        </select>

        <select value={doctorFilter} onChange={e => setDoctorFilter(e.target.value)}
          className="border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none"
          style={{ borderColor: '#d1d5db' }}>
          <option value="ALL">All Doctors</option>
          {doctors.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select value={destFilter} onChange={e => setDestFilter(e.target.value)}
          className="border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none"
          style={{ borderColor: '#d1d5db' }}>
          <option value="ALL">All Destinations</option>
          {destinations.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {(search || statusFilter !== 'ALL' || doctorFilter !== 'ALL' || destFilter !== 'ALL') && (
          <button onClick={() => { setSearch(''); setStatusFilter('ALL'); setDoctorFilter('ALL'); setDestFilter('ALL') }}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: '#e5e7eb' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5"
              style={{
                borderBottomColor: isActive ? NAVY : 'transparent',
                color: isActive ? NAVY : '#6b7280',
              }}>
              {tab.label}
              <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                style={{
                  background: isActive ? NAVY : '#f3f4f6',
                  color: isActive ? 'white' : '#6b7280',
                }}>
                {tabCounts[tab.key]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="table w-full">
          <thead>
            <tr>
              <th className="th">Bed</th>
              <th className="th">Patient</th>
              <th className="th">LOS</th>
              <th className="th">Doctor</th>
              <th className="th">Destination</th>
              <th className="th">Status</th>
              <th className="th" style={{ width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="td text-center text-gray-400 py-10 text-sm">
                  {patients.length === 0
                    ? 'No patients awaiting discharge in this ward.'
                    : 'No patients match the current filters.'}
                </td>
              </tr>
            )}
            {filtered.map(patient => {
              const isExpanded = expandedId === patient.id
              return (
                <>
                  <tr key={patient.id}
                    onClick={() => toggleRow(patient.id)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    style={{
                      background: isExpanded ? '#f0f9ff' : undefined,
                      borderLeft: isExpanded ? `3px solid ${NAVY}` : '3px solid transparent',
                    }}>
                    <td className="td">
                      <span className="font-bold text-xs" style={{ color: NAVY }}>{patient.bed}</span>
                    </td>
                    <td className="td">
                      <p className="text-xs font-bold text-gray-900">{patient.name}</p>
                      <p className="text-[10px] text-gray-400">
                        {patient.age}y / {patient.gender} · {patient.diagnosis}
                      </p>
                    </td>
                    <td className="td">
                      <span className="text-xs text-gray-700 font-medium">{patient.los}d</span>
                    </td>
                    <td className="td">
                      <span className="text-xs text-gray-600">{patient.doctor}</span>
                    </td>
                    <td className="td">
                      <span className="text-xs text-gray-600">{patient.destination}</span>
                    </td>
                    <td className="td">
                      <StatusChip status={patient.status} />
                      {patient.status === 'DISCHARGED' && patient.discharge_time && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{fmtTime(patient.discharge_time)}</p>
                      )}
                    </td>
                    <td className="td text-center">
                      {isExpanded
                        ? <ChevronUp size={14} className="text-gray-400 mx-auto" />
                        : <ChevronDown size={14} className="text-gray-400 mx-auto" />
                      }
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${patient.id}-panel`}>
                      <td colSpan={7} className="p-0">
                        <ChecklistPanel
                          patient={patient}
                          onClose={() => setExpandedId(null)}
                          onUpdate={updatePatient}
                        />
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      <p className="text-[10px] text-gray-400 text-right">
        Showing {filtered.length} of {patients.length} patients
      </p>

    </div>
  )
}
