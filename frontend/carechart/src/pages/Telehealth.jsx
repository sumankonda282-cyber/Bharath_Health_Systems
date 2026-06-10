import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Video, Clock, Loader2, AlertTriangle, RefreshCw, CheckCircle2, XCircle } from 'lucide-react'
import api from '../api/client'

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

export default function Telehealth() {
  const navigate = useNavigate()
  const [appts, setAppts]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [joiningId, setJoiningId] = useState(null)

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
      const data = await api.post(`/telehealth/appointments/${appt.id}/join`)
      navigate(`/telehealth/call/${appt.id}`, { state: { joinData: data, appt } })
    } catch (e) {
      alert(e.message || 'Could not join. Check the appointment time window.')
    } finally {
      setJoiningId(null)
    }
  }

  const canJoin = (a) => ['pending', 'confirmed', 'in_progress'].includes(a.status)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
            <Video size={20} style={{ color: '#065F46' }} /> Virtual Ward Rounds
          </h1>
          <p className="text-sm text-gray-500 mt-1">Join teleconsult sessions for ward patients</p>
        </div>
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
          <Loader2 size={28} className="animate-spin" style={{ color: '#065F46' }} />
        </div>
      ) : appts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Video size={40} className="mb-3 opacity-25" />
          <p className="text-sm font-medium text-gray-500">No virtual ward rounds today</p>
          <p className="text-xs text-gray-400 mt-1">Telehealth appointments for ward patients will appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Time', 'Patient', 'Doctor', 'Bed', 'Status', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide border-b border-gray-100">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {appts.map(a => (
                <tr key={a.id} className="border-b border-gray-50 last:border-0 hover:bg-emerald-50/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                      <Clock size={13} className="text-gray-400" />
                      {a.appointment_time || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-sm font-semibold text-gray-900">{a.patient_name || '—'}</div>
                    {a.patient_mobile && <div className="text-xs text-gray-400">{a.patient_mobile}</div>}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-600">{a.doctor_name || '—'}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-500">{a.bed_number || '—'}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge state={a.telehealth_state || (a.status === 'in_progress' ? 'in_progress' : 'scheduled')} />
                  </td>
                  <td className="px-4 py-3.5">
                    {canJoin(a) ? (
                      <button
                        onClick={() => join(a)}
                        disabled={joiningId === a.id}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ background: '#065F46' }}
                      >
                        {joiningId === a.id
                          ? <><Loader2 size={14} className="animate-spin" /> Joining…</>
                          : <><Video size={14} /> Join Round</>}
                      </button>
                    ) : a.status === 'completed' ? (
                      <span className="flex items-center gap-1 text-xs text-gray-400"><CheckCircle2 size={14} /> Done</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-400"><XCircle size={14} /> Not started</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
