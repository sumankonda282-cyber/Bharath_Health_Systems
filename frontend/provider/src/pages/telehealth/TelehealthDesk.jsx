import { useEffect, useState } from 'react'
import { doctorApi } from '../../api'
import { Video, Clock, CheckCircle2, XCircle, Loader2, RefreshCw, AlertTriangle, X } from 'lucide-react'
import api from '../../api/client'

function todayIST() {
  const d = new Date(new Date().getTime() + 5.5 * 3600000)
  return d.toISOString().slice(0, 10)
}

const STATE_META = {
  scheduled:   { label: 'Scheduled',   color: '#64748b', bg: '#f1f5f9' },
  ready:       { label: 'Waiting',     color: '#d97706', bg: '#fffbeb' },
  in_progress: { label: 'In Progress', color: '#16a34a', bg: '#dcfce7' },
  completed:   { label: 'Completed',   color: '#64748b', bg: '#f1f5f9' },
  expired:     { label: 'Expired',     color: '#dc2626', bg: '#fee2e2' },
}

const SIZE_PRESETS = {
  small:      { label: 'S', cls: 'fixed bottom-4 right-4 w-72 h-48 z-50' },
  medium:     { label: 'M', cls: 'fixed bottom-4 right-4 w-96 h-64 z-50' },
  fullscreen: { label: '⛶', cls: 'fixed inset-0 w-full h-full z-50' },
}

function StatusBadge({ state }) {
  const m = STATE_META[state] || STATE_META.scheduled
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: m.bg, color: m.color }}>
      {state === 'in_progress' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
      {m.label}
    </span>
  )
}

function VideoWidget({ session, onClose }) {
  const [size, setSize] = useState('small')
  const preset = SIZE_PRESETS[size]

  return (
    <div className={`${preset.cls} bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-700`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-300 font-medium truncate max-w-40">
            {session.appt?.patient_name || 'Telehealth Call'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Size toggles */}
          {Object.entries(SIZE_PRESETS).map(([key, p]) => (
            <button
              key={key}
              onClick={() => setSize(key)}
              title={key}
              className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center transition-colors ${size === key ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
            >
              {p.label}
            </button>
          ))}
          <button onClick={onClose} className="w-6 h-6 rounded text-gray-400 hover:bg-red-600 hover:text-white flex items-center justify-center ml-1 transition-colors">
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Video content */}
      <div className="flex-1 min-h-0">
        {session.url ? (
          <iframe
            src={session.url}
            title="Telehealth Video Call"
            allow="camera; microphone; display-capture; fullscreen"
            className="w-full h-full border-0"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-2">
            <Video size={28} className="opacity-40" />
            <span className="text-xs">Video session starting…</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TelehealthDesk() {
  const [appts, setAppts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [joiningId, setJoiningId] = useState(null)
  const [activeSession, setActiveSession] = useState(null) // { url, appt }

  const load = () => {
    setLoading(true)
    api.get('/appointments', { params: { appointment_date: todayIST(), limit: 200 } })
      .then(data => {
        const list = Array.isArray(data) ? data : (data.items || data.results || [])
        setAppts(list.filter(a => a.mode === 'telehealth'))
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const join = async (appt) => {
    setJoiningId(appt.id)
    try {
      const data = await doctorApi.joinTelehealth(appt.id)
      setActiveSession({ url: data?.url || null, appt })
    } catch (e) {
      alert(e.message || 'Could not join. Check the appointment time window.')
    } finally {
      setJoiningId(null)
    }
  }

  const canJoin = (appt) =>
    ['pending', 'confirmed', 'in_progress'].includes(appt.status)

  return (
    <div>
      {/* Refresh bar — no page title, TopBar handles it */}
      <div className="flex items-center justify-end mb-6">
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-gray-400" />
        </div>
      ) : appts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Video size={40} className="mb-3 opacity-25" />
          <p className="text-sm font-medium text-gray-500">No telehealth appointments today</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Time', 'Patient', 'Doctor', 'Status', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide border-b border-gray-100">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {appts.map(a => (
                <tr key={a.id} className="border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                      <Clock size={13} className="text-gray-400" />
                      {a.appointment_time || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                        {(a.patient_name || 'P')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{a.patient_name || '—'}</div>
                        {a.patient_mobile && <div className="text-xs text-gray-400">{a.patient_mobile}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-600">
                    {a.doctor_name || a.doctor?.full_name || '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge state={a.telehealth_state || (a.status === 'in_progress' ? 'in_progress' : 'scheduled')} />
                  </td>
                  <td className="px-4 py-3.5">
                    {canJoin(a) ? (
                      <button
                        onClick={() => join(a)}
                        disabled={joiningId === a.id}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ background: '#0F2557' }}
                      >
                        {joiningId === a.id
                          ? <><Loader2 size={14} className="animate-spin" /> Joining…</>
                          : <><Video size={14} /> Join</>}
                      </button>
                    ) : a.status === 'completed' ? (
                      <span className="flex items-center gap-1 text-xs text-gray-400"><CheckCircle2 size={14} /> Done</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-400"><XCircle size={14} /> Unavailable</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating video widget */}
      {activeSession && (
        <VideoWidget session={activeSession} onClose={() => setActiveSession(null)} />
      )}
    </div>
  )
}
