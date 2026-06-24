import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { doctorApi, appointmentsApi } from '../../api'
import { PageLoader } from '../../components/ui/Spinner'
import {
  Stethoscope, CheckCircle, Calendar, Video,
  Play, ThumbsUp, ThumbsDown, Search, X, FlaskConical,
  Eye, ArrowRight, LogOut
} from 'lucide-react'
import { format } from 'date-fns'

const fmt12 = (t) => {
  if (!t) return '—'
  const str = String(t).slice(0, 5)
  const [h, m] = str.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return t
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

const STATUS_CFG = {
  pending:                { label: 'Waiting',                badge: 'badge-yellow' },
  confirmed:              { label: 'Confirmed',              badge: 'badge-blue' },
  in_progress:            { label: 'In Progress',            badge: 'badge-purple' },
  investigations_pending: { label: 'Investigations Pending', badge: 'badge-orange' },
  review_pending:         { label: 'Review Pending',         badge: 'badge-indigo' },
  completed:              { label: 'Completed',              badge: 'badge-green' },
  cancelled:              { label: 'Cancelled',              badge: 'badge-gray' },
}

const LIVE_STATUSES = ['pending', 'confirmed', 'in_progress', 'investigations_pending', 'review_pending']

function buildChips(queue) {
  const count = (fn) => queue.filter(fn).length
  return [
    { key: 'live',                   label: 'Live',                   n: count(a => LIVE_STATUSES.includes(a.status)), live: true },
    { key: 'pending',                label: 'Waiting',                n: count(a => a.status === 'pending') },
    { key: 'confirmed',              label: 'Confirmed',              n: count(a => a.status === 'confirmed') },
    { key: 'in_progress',            label: 'In Progress',            n: count(a => a.status === 'in_progress') },
    { key: 'investigations_pending', label: 'Investigations Pending', n: count(a => a.status === 'investigations_pending') },
    { key: 'review_pending',         label: 'Review Pending',         n: count(a => a.status === 'review_pending') },
    { key: 'completed',              label: 'Completed',              n: count(a => a.status === 'completed') },
    { key: 'cancelled',              label: 'Cancelled',              n: count(a => a.status === 'cancelled') },
    { key: 'all',                    label: 'All',                    n: queue.length },
  ]
}

function filterQueue(queue, filter, search) {
  let result = queue
  if (filter === 'live')     result = queue.filter(a => LIVE_STATUSES.includes(a.status))
  else if (filter !== 'all') result = queue.filter(a => a.status === filter)
  if (search.trim()) {
    const q = search.toLowerCase()
    result = result.filter(a =>
      (a.patient_name || '').toLowerCase().includes(q) ||
      (a.reason || '').toLowerCase().includes(q) ||
      (a.patient_uhid || a.patient?.uhid || '').toLowerCase().includes(q)
    )
  }
  return result
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

const SS_KEY_PREFIX = 'opd_desk_closed_'

export default function DoctorDesk() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const navigate = useNavigate()
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(today)
  const [filter, setFilter] = useState('live')
  const [search, setSearch] = useState('')
  const [telehealthAppt, setTelehealthAppt] = useState(null)
  const [actionId, setActionId] = useState(null)
  const [startingId, setStartingId] = useState(null)
  const [sessionClosed, setSessionClosed] = useState(
    () => sessionStorage.getItem(SS_KEY_PREFIX + today) === '1'
  )
  const intervalRef = useRef(null)

  const fetchQueue = useCallback(() => {
    doctorApi.getQueue({ date })
      .then(r => { setQueue(Array.isArray(r) ? r : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [date])

  useEffect(() => {
    setLoading(true)
    fetchQueue()
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (date === today && !sessionClosed) {
      intervalRef.current = setInterval(fetchQueue, 30_000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [date, fetchQueue, today, sessionClosed])

  const handleCloseSession = () => {
    if (!window.confirm("Close today's OPD session? Live updates will stop until you reopen.")) return
    sessionStorage.setItem(SS_KEY_PREFIX + today, '1')
    setSessionClosed(true)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const handleReopenSession = () => {
    sessionStorage.removeItem(SS_KEY_PREFIX + today)
    setSessionClosed(false)
  }

  const handleStart = async (e, appt) => {
    e.stopPropagation()
    setStartingId(appt.id)
    try {
      await appointmentsApi.update(appt.id, { status: 'in_progress' })
      navigate(`/opd/${appt.id}`)
    } catch { navigate(`/opd/${appt.id}`) }
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

  const handleMarkReviewReady = async (e, appt) => {
    e.stopPropagation()
    setActionId(appt.id)
    try {
      await doctorApi.markReviewReady(appt.id)
      fetchQueue()
    } catch { alert('Could not update appointment') }
    finally { setActionId(null) }
  }

  const chips = buildChips(queue)
  const filtered = filterQueue(queue, filter, search)

  return (
    <div>
      {/* Date row + session control */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <input
          type="date"
          className="input w-40 py-1.5 text-sm flex-shrink-0"
          value={date}
          onChange={e => { setDate(e.target.value); setLoading(true) }}
        />
        {date === today && (
          sessionClosed ? (
            <button
              onClick={handleReopenSession}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700 border border-green-200"
            >
              <CheckCircle size={12} /> Reopen Session
            </button>
          ) : (
            <button
              onClick={handleCloseSession}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-200"
            >
              <LogOut size={12} /> Close Session
            </button>
          )
        )}
        {date === today && sessionClosed && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
            Session closed — live updates paused
          </span>
        )}
      </div>

      <div className="card overflow-hidden">
        {/* Search + filter chips */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 flex-wrap">
          <div className="relative flex-shrink-0">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search patient…"
              className="pl-7 pr-7 py-1 text-xs border border-gray-200 rounded-full focus:outline-none focus:border-blue-400 w-36"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={11} />
              </button>
            )}
          </div>

          {chips.map(chip => (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                filter === chip.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {chip.label}
              {chip.live && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-green-400 align-middle" />}
              {' '}({chip.n})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-8"><PageLoader /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Calendar size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No patients match this filter on {date}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full text-sm">
              <thead>
                <tr>
                  <th className="th w-10 text-center">#</th>
                  <th className="th">Patient</th>
                  <th className="th">Chief Complaint</th>
                  <th className="th w-14 text-center">Age/Sex</th>
                  <th className="th w-20 text-center">Time</th>
                  <th className="th w-24 text-center">Visit Type</th>
                  <th className="th w-14 text-center">Mode</th>
                  <th className="th w-32">Vitals</th>
                  <th className="th w-40 text-center">Status</th>
                  <th className="th w-44 text-right pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(appt => (
                  <tr
                    key={appt.id}
                    className="tr-hover cursor-pointer"
                    onClick={() => navigate(`/opd/${appt.id}`)}
                  >
                    <td className="td text-center font-semibold text-gray-500">
                      {appt.token_number || appt.id}
                    </td>
                    <td className="td">
                      <div className="font-semibold text-gray-900 leading-snug">{appt.patient_name}</div>
                    </td>
                    <td className="td">
                      <div className="text-xs text-gray-500 max-w-[180px] truncate">
                        {appt.reason || <span className="text-gray-300">—</span>}
                      </div>
                    </td>
                    <td className="td text-center text-gray-600 text-xs">
                      {appt.patient?.age != null && appt.patient?.gender
                        ? `${appt.patient.age}${appt.patient.gender.charAt(0).toUpperCase()}`
                        : appt.patient?.age != null ? String(appt.patient.age) : '—'}
                    </td>
                    <td className="td text-center text-gray-600 text-xs whitespace-nowrap">
                      {fmt12(appt.appointment_time)}
                    </td>
                    <td className="td text-center">
                      <span className="text-xs text-gray-500 capitalize">
                        {appt.appointment_type || appt.visit_type || '—'}
                      </span>
                    </td>
                    <td className="td text-center">
                      {appt.mode === 'telehealth'
                        ? <Video size={13} className="text-green-500 inline-block" title="Telehealth" />
                        : <Stethoscope size={13} className="text-gray-400 inline-block" title="In-person" />}
                    </td>
                    <td className="td">
                      <VitalsBadge vitals={appt.vitals} />
                    </td>
                    <td className="td text-center">
                      <span className={(STATUS_CFG[appt.status] || {}).badge || 'badge-gray'}>
                        {(STATUS_CFG[appt.status] || {}).label || appt.status.replace(/_/g, ' ')}
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

                        {appt.status === 'confirmed' && (
                          <button
                            onClick={e => handleStart(e, appt)}
                            disabled={startingId === appt.id}
                            className="btn-primary flex items-center gap-1 px-2 py-1 text-xs rounded disabled:opacity-50"
                          >
                            {startingId === appt.id
                              ? <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                              : <Play size={11} />}
                            Start
                          </button>
                        )}

                        {appt.status === 'in_progress' && (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); navigate(`/opd/${appt.id}`) }}
                              className="btn-primary flex items-center gap-1 px-2 py-1 text-xs rounded"
                            >
                              <ArrowRight size={11} /> Continue
                            </button>
                            {appt.mode === 'telehealth' && (
                              <button
                                title="Join Telehealth"
                                onClick={e => { e.stopPropagation(); setTelehealthAppt(appt) }}
                                className="p-1.5 rounded text-green-600 hover:bg-green-50"
                              >
                                <Video size={13} />
                              </button>
                            )}
                          </>
                        )}

                        {appt.status === 'investigations_pending' && (
                          <button
                            onClick={e => handleMarkReviewReady(e, appt)}
                            disabled={actionId === appt.id}
                            className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold disabled:opacity-50"
                          >
                            {actionId === appt.id
                              ? <span className="w-3 h-3 border border-indigo-400/40 border-t-indigo-600 rounded-full animate-spin" />
                              : <FlaskConical size={11} />}
                            Mark Ready
                          </button>
                        )}

                        {appt.status === 'review_pending' && (
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/opd/${appt.id}`) }}
                            className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold border border-amber-200"
                          >
                            <Eye size={11} /> Review
                          </button>
                        )}

                        {appt.status === 'completed' && (
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/opd/${appt.id}`) }}
                            className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                          >
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
    </div>
  )
}
