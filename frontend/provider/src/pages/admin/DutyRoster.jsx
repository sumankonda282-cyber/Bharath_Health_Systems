import { useState, useEffect, useCallback } from 'react'
import { clinicApi } from '../../api'
import { PageLoader } from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import { CalendarDays, Plus, Edit2, RefreshCw, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
}
const SLOT_OPTIONS = [10, 15, 20, 30, 45, 60]

const EMPTY_FORM = {
  doctor_id: '',
  day_of_week: 'monday',
  start_time: '09:00',
  end_time: '17:00',
  slot_minutes: 30,
  max_patients: 20,
  is_active: true,
}

function fmt(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h, 10)
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}

export default function DutyRoster() {
  const [doctors, setDoctors] = useState([])
  // scheduleMap: { [profileId]: { [day]: scheduleObj } }
  const [scheduleMap, setScheduleMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const staff = await clinicApi.getStaff('doctor')
      const doctorList = Array.isArray(staff) ? staff.filter(s => s.role === 'doctor') : []
      setDoctors(doctorList)

      const newMap = {}
      await Promise.all(
        doctorList.map(async (doc) => {
          if (!doc.profile_id) return
          try {
            const scheds = await clinicApi.getSchedules(doc.profile_id)
            if (Array.isArray(scheds)) {
              newMap[doc.profile_id] = {}
              scheds.forEach(s => {
                newMap[doc.profile_id][s.day_of_week] = s
              })
            }
          } catch { /* no schedule yet */ }
        })
      )
      setScheduleMap(newMap)
    } catch {
      showToast('Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openModal = (doctor, day, existing) => {
    setEditingSchedule(existing || null)
    setForm(existing ? {
      doctor_id:    doctor.profile_id,
      day_of_week:  day,
      start_time:   existing.start_time || '09:00',
      end_time:     existing.end_time || '17:00',
      slot_minutes: existing.slot_minutes || 30,
      max_patients: existing.max_patients || 20,
      is_active:    existing.is_active !== false,
    } : {
      ...EMPTY_FORM,
      doctor_id:   doctor.profile_id,
      day_of_week: day,
    })
    setModalOpen(true)
  }

  const closeModal = () => { setModalOpen(false); setEditingSchedule(null) }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await clinicApi.setSchedule(form.doctor_id, {
        day_of_week:  form.day_of_week,
        start_time:   form.start_time,
        end_time:     form.end_time,
        slot_minutes: Number(form.slot_minutes),
        max_patients: Number(form.max_patients),
        is_active:    form.is_active,
      })
      showToast(editingSchedule ? 'Schedule updated' : 'Schedule added')
      closeModal()
      load()
    } catch {
      showToast('Failed to save schedule', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingSchedule) return
    setDeleting(true)
    try {
      await clinicApi.setSchedule(form.doctor_id, {
        day_of_week:  form.day_of_week,
        start_time:   form.start_time,
        end_time:     form.end_time,
        slot_minutes: Number(form.slot_minutes),
        max_patients: Number(form.max_patients),
        is_active:    false,
      })
      showToast('Schedule removed (marked inactive)')
      closeModal()
      load()
    } catch {
      showToast('Failed to remove schedule', 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <CalendarDays size={26} style={{ color: '#0F2557', flexShrink: 0 }} />
          <div>
            <p className="text-sm text-gray-500 mt-0.5">Weekly schedule grid — click any cell to add or edit</p>
          </div>
        </div>
        <button onClick={load} className="btn-secondary text-sm flex-shrink-0">
          <RefreshCw size={14} />Refresh
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mb-4 flex items-center gap-2 p-3 rounded-xl text-sm border ${
          toast.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-auto opacity-60 hover:opacity-100 text-xs">✕</button>
        </div>
      )}

      {doctors.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <CalendarDays size={40} className="mx-auto mb-3 opacity-25" />
          <p className="font-semibold text-gray-600">No doctors found</p>
          <p className="text-sm mt-1">Add doctors from Clinic Admin → Staff tab first.</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="th w-28 text-left sticky left-0 bg-gray-50 z-10 border-r border-gray-100">Day</th>
                    {doctors.map(doc => (
                      <th key={doc.id} className="th text-center min-w-[160px] py-3">
                        <div className="font-semibold text-gray-800 truncate">{doc.full_name}</div>
                        <div className="text-xs text-gray-400 font-normal mt-0.5">{doc.specialty || 'General'}</div>
                        {!doc.profile_id && (
                          <div className="text-xs text-orange-500 font-normal">No profile</div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {DAYS.map((day, dayIdx) => (
                    <tr key={day} className={dayIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                      <td className="td font-semibold text-gray-700 sticky left-0 bg-inherit z-10 border-r border-gray-100 py-3">
                        <div>{DAY_LABELS[day].slice(0, 3)}</div>
                        <div className="text-xs font-normal text-gray-400">{DAY_LABELS[day]}</div>
                      </td>
                      {doctors.map(doc => {
                        const sched = doc.profile_id ? scheduleMap[doc.profile_id]?.[day] : null
                        const isActive = sched && sched.is_active !== false
                        return (
                          <td key={doc.id} className="td text-center py-2 px-2">
                            {!doc.profile_id ? (
                              <span className="text-gray-300 text-xs">—</span>
                            ) : isActive ? (
                              <button
                                onClick={() => openModal(doc, day, sched)}
                                className="inline-flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg w-full transition-all hover:shadow-md group"
                                style={{ background: '#0F255710', border: '1px solid #0F255725' }}
                              >
                                <span className="text-xs font-semibold leading-tight" style={{ color: '#0F2557' }}>
                                  {fmt(sched.start_time)}
                                </span>
                                <span className="text-xs text-gray-400 leading-tight">–</span>
                                <span className="text-xs font-semibold leading-tight" style={{ color: '#0F2557' }}>
                                  {fmt(sched.end_time)}
                                </span>
                                <span className="text-xs text-gray-500 mt-0.5">{sched.slot_minutes}m</span>
                                <Edit2 size={9} className="text-gray-300 group-hover:text-gray-500 mt-0.5 transition-colors" />
                              </button>
                            ) : sched && !sched.is_active ? (
                              <button
                                onClick={() => openModal(doc, day, sched)}
                                className="inline-flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg w-full transition-all hover:bg-gray-100 border border-gray-200 text-gray-400"
                              >
                                <span className="text-xs">Inactive</span>
                                <Edit2 size={9} className="text-gray-300" />
                              </button>
                            ) : (
                              <button
                                onClick={() => openModal(doc, day, null)}
                                className="inline-flex items-center justify-center gap-1 px-2 py-2 rounded-lg w-full text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-all border border-dashed border-gray-200 text-xs"
                              >
                                <Plus size={11} />Off
                              </button>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 mt-3 text-xs text-gray-400 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ background: '#0F255710', border: '1px solid #0F255725' }} />
              Scheduled (click to edit)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-dashed border-gray-300" />
              Off (click to add)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-gray-200" />
              Inactive
            </span>
          </div>
        </>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingSchedule
          ? `Edit Schedule — ${DAY_LABELS[form.day_of_week]}`
          : `Add Schedule — ${DAY_LABELS[form.day_of_week]}`}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Doctor selector */}
          <div>
            <label className="label">Doctor</label>
            <select
              className="input"
              value={form.doctor_id}
              onChange={e => setForm(f => ({ ...f, doctor_id: e.target.value }))}
              required
            >
              <option value="">Select doctor…</option>
              {doctors.filter(d => d.profile_id).map(doc => (
                <option key={doc.profile_id} value={doc.profile_id}>{doc.full_name}</option>
              ))}
            </select>
          </div>

          {/* Day of week */}
          <div>
            <label className="label">Day of Week</label>
            <select
              className="input"
              value={form.day_of_week}
              onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value }))}
            >
              {DAYS.map(d => (
                <option key={d} value={d}>{DAY_LABELS[d]}</option>
              ))}
            </select>
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Time</label>
              <input
                type="time"
                className="input"
                value={form.start_time}
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">End Time</label>
              <input
                type="time"
                className="input"
                value={form.end_time}
                onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Slot duration */}
          <div>
            <label className="label">Slot Duration</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {SLOT_OPTIONS.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, slot_minutes: m }))}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all"
                  style={
                    form.slot_minutes === m
                      ? { background: '#0F2557', borderColor: '#0F2557', color: 'white' }
                      : { borderColor: '#E5E7EB', color: '#6B7280' }
                  }
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>

          {/* Max patients */}
          <div>
            <label className="label">Max Patients per Day</label>
            <input
              type="number"
              className="input"
              min={1}
              max={500}
              value={form.max_patients}
              onChange={e => setForm(f => ({ ...f, max_patients: e.target.value }))}
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="text-sm font-medium text-gray-700">Active (visible for booking)</span>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              className="flex items-center gap-1.5 text-sm font-semibold transition-all"
              style={{ color: form.is_active ? '#0F2557' : '#9CA3AF' }}
            >
              {form.is_active
                ? <ToggleRight size={22} style={{ color: '#0F2557' }} />
                : <ToggleLeft size={22} />}
              {form.is_active ? 'Active' : 'Inactive'}
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            {editingSchedule && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="btn-secondary text-sm"
                style={{ color: '#EF4444', borderColor: '#FCA5A5' }}
              >
                <Trash2 size={13} />
                {deleting ? 'Removing…' : 'Remove'}
              </button>
            )}
            <button type="button" onClick={closeModal} className="btn-secondary flex-1 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={saving || deleting} className="btn-primary flex-1 justify-center text-sm">
              {saving ? 'Saving…' : (editingSchedule ? 'Update Schedule' : 'Add Schedule')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
