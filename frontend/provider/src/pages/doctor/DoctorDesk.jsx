import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { doctorApi, appointmentsApi } from '../../api'
import { PageLoader } from '../../components/ui/Spinner'
import {
  Stethoscope, Clock, CheckCircle, Calendar, Video,
  ClipboardList, Play, ThumbsUp, ThumbsDown
} from 'lucide-react'
import { format } from 'date-fns'
import QuickAssign from '../forms/QuickAssign'

const fmt12 = (t) => {
  if (!t) return '—'
  const str = String(t).slice(0, 5)
  const [h, m] = str.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return t
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

const STATUS_COLORS = {
  pending:     'badge-yellow',
  confirmed:   'badge-blue',
  in_progress: 'badge-purple',
  completed:   'badge-green',
  cancelled:   'badge-gray',
}

const LIVE_STATUSES = ['pending', 'confirmed', 'in_progress']

const FILTER_PILLS = [
  { key: 'live',        label: 'Live' },
  { key: 'all',         label: 'All' },
  { key: 'pending',     label: 'Pending' },
  { key: 'confirmed',   label: 'Confirmed' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed',   label: 'Completed' },
]

function filterQueue(queue, filter) {
  if (filter === 'live') return queue.filter(a => LIVE_STATUSES.includes(a.status))
  if (filter === 'all')  return queue
  return queue.filter(a => a.status === filter)
}

function VitalsBadge({ vitals }) {
  if (!vitals) return <span className="text-gray-300 text-xs">—</span>
  const parts = []
  if (vitals.bp)   parts.push(`BP ${vitals.bp}`)
  if (vitals.temp) parts.push(`${vitals.temp}°`)
  if (vitals.spo2) parts.push(`SpO₂ ${vitals.spo2}%`)
  if (!parts.length) return <span className="text-gray-300 text-xs">—</span>
  return (
    <div className="text-xs text-gray-600 space-y-0.5">
      {parts.map((p, i) => <div key={i}>{p}</div>)}
    </div>
  )
}

function TelehealthConsentModal({ appt, onClose }) {
  const [consented, setConsented] = useState(false)
  const [joining, setJoining] = useState(false)
  const handleJoin = async () => {
    setJoining(true)
    try {
      const data = await doctorApi.joinTelehealth(appt.id)
      window.open(data.url, '_blank', 'noopener')
      onClose()
    } catch { alert('Could not start telehealth session. Please try again.') }
    finally { setJoining(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#0F255715' }}>
            <Video size={20} style={{ color: '#0F2557' }} />
          </div>
          <h2 className="text-lg font-bold" style={{ color: '#0F2557' }}>Telehealth Consent</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          As per <strong>Telemedicine Practice Guidelines 2020</strong> (MoHFW, India), by joining this session you confirm:
        </p>
        <ul className="text-sm text-gray-600 space-y-2 mb-5 pl-4 list-disc">
          <li>You have verified the patient's identity</li>
          <li>This consultation is appropriate for telehealth</li>
          <li>The session will be logged for compliance</li>
          <li>Patient consent for telemedicine has been obtained</li>
        </ul>
        <label className="flex items-start gap-3 cursor-pointer mb-6">
          <input type="checkbox" checked={consented} onChange={e => setConsented(e.target.checked)} className="mt-0.5 w-4 h-4 flex-shrink-0" />
          <span className="text-sm text-gray-700">I confirm compliance with Telemedicine Practice Guidelines 2020</span>
        </label>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
          <button onClick={handleJoin} disabled={!consented || joining}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: '#0F2557' }}>
            {joining ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Video size={14} />}
            Join Session
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DoctorDesk() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const navigate = useNavigate()
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(today)
  const [telehealthAppt, setTelehealthAppt] = useState(null)
  const [assignTarget, setAssignTarget] = useState(null)
  const [filter, setFilter] = useState('live')
  const [startingId, setStartingId] = useState(null)
  const [actionId, setActionId] = useState(null)

  const fetchQueue = useCallback(() => {
    doctorApi.getQueue({ date })
      .then(r => { setQueue(Array.isArray(r) ? r : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [date])

  useEffect(() => {
    setLoading(true)
    fetchQueue()
    if (date === today) {
      const interval = setInterval(fetchQueue, 30_000)
      return () => clearInterval(interval)
    }
  }, [date, fetchQueue, today])

  const waiting = queue.filter(a => ['pending', 'confirmed'].includes(a.status))
  const inProg  = queue.filter(a => a.status === 'in_progress')
  const done    = queue.filter(a => a.status === 'completed')

  const handleStart = async (e, appt) => {
    e.stopPropagation()
    setStartingId(appt.id)
    try {
      await appointmentsApi.update(appt.id, { status: 'in_progress' })
      navigate(`/encounter/${appt.id}`)
    } catch { navigate(`/encounter/${appt.id}`) }
    finally { setStartingId(null) }
  }

  const handleApprove = async (e, appt) => {
    e.stopPropagation()
    setActionId(appt.id)
    try {
      await doctorApi.approveAppointment(appt.id)
      fetchQueue()
    } catch { alert('Could not approve appointment') }
    finally { setActionId(null) }
  }

  const handleDecline = async (e, appt) => {
    e.stopPropagation()
    if (!window.confirm('Decline this appointment request?')) return
    setActionId(appt.id)
    try {
      await doctorApi.declineAppointment(appt.id)
      fetchQueue()
    } catch { alert('Could not decline appointment') }
    finally { setActionId(null) }
  }

  const filtered = filterQueue(queue, filter)

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input type="date" className="input w-40 py-1.5 text-sm flex-shrink-0" value={date} onChange={e => setDate(e.target.value)} />
        {[
          { label: 'Waiting',     count: waiting.length, bg: 'bg-yellow-100', fg: 'text-yellow-600', Icon: Clock },
          { label: 'In Progress', count: inProg.length,  bg: 'bg-purple-100', fg: 'text-purple-600', Icon: Stethoscope },
          { label: 'Completed',   count: done.length,    bg: 'bg-green-100',  fg: 'text-green-600',  Icon: CheckCircle },
        ].map(({ label, count, bg, fg, Icon }) => (
          <div key={label} className="card p-3 flex items-center gap-2 flex-1 min-w-[100px]">
            <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <Icon size={15} className={fg} />
            </div>
            <div>
              <div className="text-lg font-bold leading-none">{count}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100 flex-wrap">
          {FILTER_PILLS.map(p => (
            <button key={p.key} onClick={() => setFilter(p.key)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                filter === p.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {p.label}
              {p.key === 'live' && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-green-400 align-middle" />}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-8"><PageLoader /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Calendar size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No patients for this filter on {date}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full text-sm">
              <thead>
                <tr>
                  <th className="th w-10 text-center">#</th>
                  <th className="th w-24">MRN</th>
                  <th className="th">Patient</th>
                  <th className="th w-16 text-center">Age/Sex</th>
                  <th className="th w-20 text-center">Time</th>
                  <th className="th w-36">Vitals</th>
                  <th className="th w-24 text-center">Status</th>
                  <th className="th w-40 text-right pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(appt => (
                  <tr key={appt.id} className="tr-hover cursor-pointer"
                    onClick={() => navigate(`/encounter/${appt.id}`)}>
                    <td className="td text-center font-semibold text-gray-500">
                      {appt.token_number || appt.id}
                    </td>
                    <td className="td">
                      <span className="text-xs font-mono text-gray-500">
                        {appt.patient_uhid || appt.patient?.uhid || '—'}
                      </span>
                    </td>
                    <td className="td">
                      <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                        {appt.patient_name}
                        {appt.mode === 'telehealth' && (
                          <Video size={13} className="text-green-500 flex-shrink-0" title="Telehealth" />
                        )}
                      </div>
                      {appt.reason && (
                        <div className="text-xs text-gray-400 truncate max-w-[200px]">{appt.reason}</div>
                      )}
                    </td>
                    <td className="td text-center text-gray-600">
                      {appt.patient?.age != null && appt.patient?.gender
                        ? `${appt.patient.age}${appt.patient.gender.charAt(0).toUpperCase()}`
                        : appt.patient?.age != null ? `${appt.patient.age}` : '—'}
                    </td>
                    <td className="td text-center text-gray-600 whitespace-nowrap">
                      {fmt12(appt.appointment_time)}
                    </td>
                    <td className="td">
                      <VitalsBadge vitals={appt.vitals} />
                    </td>
                    <td className="td text-center">
                      <span className={STATUS_COLORS[appt.status] || 'badge-gray'}>
                        {appt.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="td text-right pr-3">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>

                        {appt.status === 'pending' && (
                          <>
                            <button
                              title="Approve"
                              onClick={e => handleApprove(e, appt)}
                              disabled={actionId === appt.id}
                              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-50"
                            >
                              {actionId === appt.id
                                ? <span className="w-3 h-3 border border-green-600/40 border-t-green-600 rounded-full animate-spin block" />
                                : <ThumbsUp size={13} />}
                            </button>
                            <button
                              title="Decline"
                              onClick={e => handleDecline(e, appt)}
                              disabled={actionId === appt.id}
                              className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-50"
                            >
                              <ThumbsDown size={13} />
                            </button>
                          </>
                        )}

                        <button
                          title="Assign Form"
                          onClick={e => { e.stopPropagation(); setAssignTarget({ patientId: appt.patient_id || appt.patient?.id, appointmentId: appt.id }) }}
                          className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                        >
                          <ClipboardList size={13} />
                        </button>

                        {appt.mode === 'telehealth' && LIVE_STATUSES.includes(appt.status) && (
                          <button title="Join Telehealth"
                            onClick={e => { e.stopPropagation(); setTelehealthAppt(appt) }}
                            className="p-1.5 rounded text-green-600 hover:bg-green-50">
                            <Video size={13} />
                          </button>
                        )}

                        {appt.status === 'confirmed' && (
                          <button onClick={e => handleStart(e, appt)} disabled={startingId === appt.id}
                            className="btn-primary flex items-center gap-1 px-2 py-1 text-xs rounded disabled:opacity-50">
                            {startingId === appt.id
                              ? <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                              : <Play size={11} />}
                            Start
                          </button>
                        )}
                        {appt.status === 'in_progress' && (
                          <button onClick={e => { e.stopPropagation(); navigate(`/encounter/${appt.id}`) }}
                            className="btn-primary flex items-center gap-1 px-2 py-1 text-xs rounded">
                            <ClipboardList size={11} /> Chart
                          </button>
                        )}
                        {appt.status === 'completed' && (
                          <button onClick={e => { e.stopPropagation(); navigate(`/encounter/${appt.id}`) }}
                            className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50">
                            View
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {telehealthAppt && (
        <TelehealthConsentModal appt={telehealthAppt} onClose={() => setTelehealthAppt(null)} />
      )}
      {assignTarget && (
        <QuickAssign
          patientId={assignTarget.patientId}
          appointmentId={assignTarget.appointmentId}
          admissionId={null}
          onClose={() => setAssignTarget(null)}
          onAssigned={() => setAssignTarget(null)}
        />
      )}
    </div>
  )
}
