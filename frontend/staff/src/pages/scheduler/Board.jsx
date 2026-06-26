import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Loader2, Send, X, AlertTriangle,
  CalendarDays, Save, Copy, CheckCircle, Plane,
} from 'lucide-react'
import api from '../../api/client'

const iso = d => d.toISOString().slice(0, 10)

function mondayOf(d) {
  const x = new Date(d)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function ShiftChip({ shift, draggable, onDragStart }) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-white select-none ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
      style={{ background: shift.color_hex || '#0F2557' }}
      title={`${shift.name} ${shift.start_time}–${shift.end_time}`}
    >
      {shift.name}
      <span className="opacity-75 font-normal">{shift.start_time}</span>
    </div>
  )
}

export default function Board() {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()))
  const [groups, setGroups]       = useState([])
  const [groupId, setGroupId]     = useState('')
  const [shiftTypes, setShiftTypes] = useState([])
  const [entries, setEntries]     = useState([])
  const [leaves, setLeaves]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [dragShift, setDragShift] = useState(null)
  const [toast, setToast]         = useState(null)
  const [publishing, setPublishing] = useState(false)
  const [savePatternOpen, setSavePatternOpen] = useState(false)

  const weekEnd = addDays(weekStart, 6)
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const staffRows = useMemo(() => {
    const pool = groupId
      ? groups.filter(g => g.id === Number(groupId))
      : groups
    const seen = new Map()
    pool.forEach(g => g.members.forEach(m => {
      if (!seen.has(m.staff_id)) seen.set(m.staff_id, { ...m, group_id: g.id, group_name: g.name })
    }))
    return [...seen.values()]
  }, [groups, groupId])

  const fetchAll = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get('/scheduler/groups'),
      api.get('/scheduler/shift-types'),
      api.get('/scheduler/schedule', { params: { start: iso(weekStart), end: iso(weekEnd), group_id: groupId || undefined } }),
    ])
      .then(([g, st, sch]) => {
        setGroups(g)
        setShiftTypes(st)
        setEntries(sch.entries)
        setLeaves(sch.leaves)
      })
      .catch(e => showToast(e.message, 'err'))
      .finally(() => setLoading(false))
  }, [weekStart, groupId]) // eslint-disable-line

  useEffect(() => { fetchAll() }, [fetchAll])

  const entryAt = (staffId, dateStr) =>
    entries.find(e => e.staff_id === staffId && e.work_date === dateStr)

  const leaveAt = (staffId, dateStr) =>
    leaves.find(l => l.staff_id === staffId && l.from_date <= dateStr && l.to_date >= dateStr)

  const assign = async (staffId, groupIdForCell, dateStr, shiftTypeId) => {
    try {
      const r = await api.post('/scheduler/schedule/entries', {
        entries: [{ staff_id: staffId, group_id: groupIdForCell, shift_type_id: shiftTypeId, work_date: dateStr }],
      })
      const res = r.results[0]
      if (!res.ok) { showToast(res.error, 'err'); return }
      fetchAll()
    } catch (e) {
      showToast(e.message, 'err')
    }
  }

  const removeEntry = async (entryId) => {
    try {
      await api.delete(`/scheduler/schedule/entries/${entryId}`)
      setEntries(es => es.filter(e => e.id !== entryId))
    } catch (e) {
      showToast(e.message, 'err')
    }
  }

  const handleDrop = (staffId, cellGroupId, dateStr) => (e) => {
    e.preventDefault()
    if (dragShift) assign(staffId, cellGroupId, dateStr, dragShift.id)
    setDragShift(null)
  }

  const draftCount = entries.filter(e => e.status === 'draft').length

  const publish = async () => {
    setPublishing(true)
    try {
      const r = await api.post('/scheduler/schedule/publish', {
        start: iso(weekStart), end: iso(weekEnd), group_id: groupId ? Number(groupId) : undefined,
      })
      showToast(`Published ${r.published} shifts — ${r.notified} staff notified by email`)
      fetchAll()
    } catch (e) {
      showToast(e?.response?.data?.detail || e.message, 'err')
    } finally {
      setPublishing(false)
    }
  }

  const copyToNextWeek = async () => {
    const toCreate = entries.map(e => ({
      staff_id: e.staff_id,
      group_id: e.group_id,
      shift_type_id: e.shift_type_id,
      work_date: iso(addDays(new Date(e.work_date), 7)),
    }))
    if (!toCreate.length) { showToast('Nothing to copy', 'err'); return }
    try {
      const r = await api.post('/scheduler/schedule/entries', { entries: toCreate })
      const ok = r.results.filter(x => x.ok).length
      const skipped = r.results.length - ok
      showToast(`Copied ${ok} shifts to next week${skipped ? ` (${skipped} skipped due to conflicts)` : ''}`)
    } catch (e) {
      showToast(e.message, 'err')
    }
  }

  if (loading && !groups.length) {
    return <div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-gray-300" /></div>
  }

  const needsSetup = !shiftTypes.length || !groups.length

  return (
    <div>
      <div className="flex items-center justify-end flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={copyToNextWeek} className="btn-secondary btn-sm" title="Copy this week's shifts to next week">
            <Copy size={13} />Copy → Next Week
          </button>
          <button onClick={() => setSavePatternOpen(true)} className="btn-secondary btn-sm">
            <Save size={13} />Save as Pattern
          </button>
          <button
            onClick={publish}
            disabled={publishing || !draftCount}
            className="btn-primary btn-sm"
            title={draftCount ? `${draftCount} draft shifts will be published` : 'No draft shifts'}
          >
            {publishing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Publish Week {draftCount > 0 && `(${draftCount})`}
          </button>
        </div>
      </div>

      <div className="card p-3 mb-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(w => addDays(w, -7))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <CalendarDays size={15} style={{ color: '#0F2557' }} />
            {weekStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – {weekEnd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
          <button onClick={() => setWeekStart(w => addDays(w, 7))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronRight size={18} />
          </button>
          <button onClick={() => setWeekStart(mondayOf(new Date()))} className="btn-ghost btn-sm">Today</button>
        </div>

        <select
          value={groupId}
          onChange={e => setGroupId(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
        >
          <option value="">All groups</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {needsSetup ? (
        <div className="card p-10 text-center">
          <CalendarDays size={36} className="mx-auto text-gray-300 mb-3" />
          <div className="font-bold text-gray-700">Scheduler not set up yet</div>
          <p className="text-sm text-gray-500 mt-1 mb-4">Define shift types and create staff groups first</p>
          <Link to="/scheduler/setup" className="btn-primary inline-flex">Open Setup</Link>
        </div>
      ) : (
        <>
          <div className="card p-3 mb-4 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Drag to assign:</span>
            {shiftTypes.map(st => (
              <ShiftChip
                key={st.id}
                shift={st}
                draggable
                onDragStart={() => setDragShift(st)}
              />
            ))}
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm border-collapse" style={{ minWidth: 900 }}>
              <thead>
                <tr style={{ background: '#0F2557' }}>
                  <th className="text-left px-4 py-2.5 text-white text-xs font-bold sticky left-0" style={{ background: '#0F2557', minWidth: 180 }}>
                    Staff
                  </th>
                  {days.map((d, i) => {
                    const isToday = iso(d) === iso(new Date())
                    return (
                      <th key={i} className="px-2 py-2.5 text-center text-xs font-bold" style={{ color: isToday ? '#F5821E' : '#fff', minWidth: 110 }}>
                        {DAY_LABELS[i]}<br />
                        <span className="font-normal opacity-75">{d.getDate()}/{d.getMonth() + 1}</span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {staffRows.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                    No staff in {groupId ? 'this group' : 'any group'} — add members in Groups & People
                  </td></tr>
                ) : staffRows.map(staff => (
                  <tr key={staff.staff_id} className="border-t border-gray-100">
                    <td className="px-4 py-2 sticky left-0 bg-white">
                      <div className="font-semibold text-gray-800 text-xs">{staff.full_name}</div>
                      <div className="text-xs text-gray-400">{staff.group_name}</div>
                    </td>
                    {days.map((d, i) => {
                      const dateStr = iso(d)
                      const entry = entryAt(staff.staff_id, dateStr)
                      const leave = leaveAt(staff.staff_id, dateStr)
                      return (
                        <td
                          key={i}
                          className={`px-1.5 py-1.5 text-center align-middle border-l border-gray-50 ${!entry && !leave ? 'hover:bg-blue-50' : ''}`}
                          onDragOver={e => { if (!entry && !leave) e.preventDefault() }}
                          onDrop={!entry && !leave ? handleDrop(staff.staff_id, staff.group_id, dateStr) : undefined}
                        >
                          {leave ? (
                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-400" title={`${leave.leave_type} leave`}>
                              <Plane size={11} />Leave
                            </div>
                          ) : entry ? (
                            <div className="relative inline-block group">
                              <div
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-white"
                                style={{ background: entry.shift_color || '#0F2557', opacity: entry.status === 'draft' ? 0.65 : 1 }}
                                title={`${entry.shift_name} ${entry.shift_start}–${entry.shift_end} (${entry.status})`}
                              >
                                {entry.shift_name}
                                {entry.status === 'published' && <CheckCircle size={10} />}
                              </div>
                              <button
                                onClick={() => removeEntry(entry.id)}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white items-center justify-center hidden group-hover:flex"
                                title="Remove shift"
                              >
                                <X size={9} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-200 text-xs">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 mt-3 flex items-center gap-4 flex-wrap">
            <span><span className="inline-block w-2.5 h-2.5 rounded-full align-middle mr-1" style={{ background: '#0F2557', opacity: 0.65 }} /> Draft (not yet visible to staff)</span>
            <span><span className="inline-block w-2.5 h-2.5 rounded-full align-middle mr-1" style={{ background: '#0F2557' }} /> Published</span>
            <span className="flex items-center gap-1"><Plane size={11} /> Approved leave (blocked)</span>
          </p>
        </>
      )}

      {savePatternOpen && (
        <SavePatternModal
          weekStart={iso(weekStart)}
          groupId={groupId ? Number(groupId) : undefined}
          onClose={() => setSavePatternOpen(false)}
          onSaved={(n) => { setSavePatternOpen(false); showToast(`Pattern "${n}" saved`) }}
        />
      )}

      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${
          toast.type === 'err' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.type === 'err' ? <AlertTriangle size={15} /> : <CheckCircle size={15} />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

function SavePatternModal({ weekStart, groupId, onClose, onSaved }) {
  const [name, setName] = useState('')
  const [recurrence, setRecurrence] = useState('manual')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!name.trim()) { setError('Give the pattern a name'); return }
    setSaving(true)
    setError('')
    try {
      await api.post('/scheduler/patterns', { name: name.trim(), recurrence, week_start: weekStart, group_id: groupId })
      onSaved(name.trim())
    } catch (e) {
      setError(e?.response?.data?.detail || e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm z-10 p-6">
        <h3 className="font-bold text-gray-800 mb-1">Save Week as Pattern</h3>
        <p className="text-xs text-gray-500 mb-4">This week's assignments become a reusable template</p>
        <label className="text-xs font-semibold text-gray-500 block mb-1">Pattern name</label>
        <input
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-900"
          placeholder="e.g. Standard Week"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
        <label className="text-xs font-semibold text-gray-500 block mb-1">Recurrence</label>
        <select
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-4 focus:outline-none"
          value={recurrence}
          onChange={e => setRecurrence(e.target.value)}
        >
          <option value="manual">Manual — apply when I choose</option>
          <option value="weekly">Weekly rotation</option>
          <option value="monthly">Monthly rotation</option>
          <option value="permanent">Permanent — until changed</option>
        </select>
        {error && <p className="text-red-600 text-xs mb-3">{error}</p>}
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Save Pattern
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  )
}
