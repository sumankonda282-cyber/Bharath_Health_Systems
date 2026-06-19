import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Video, Clock, Loader2, AlertTriangle, Calendar, CheckCircle2, Wifi, Info } from 'lucide-react'
import api from '../api/client'

const fmt12 = (t) => {
  if (!t) return t
  const str = String(t).slice(0, 5)
  const [h, m] = str.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return t
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

const STATE_META = {
  scheduled:   { label: 'Scheduled',    color: 'text-slate-600',  bg: 'bg-slate-100' },
  ready:       { label: 'Doctor Ready', color: 'text-green-700',  bg: 'bg-green-100' },
  in_progress: { label: 'In Progress',  color: 'text-orange-700', bg: 'bg-orange-100' },
  completed:   { label: 'Completed',    color: 'text-slate-500',  bg: 'bg-slate-100' },
  expired:     { label: 'Expired',      color: 'text-red-700',    bg: 'bg-red-100' },
}

function StatusBadge({ state }) {
  const m = STATE_META[state] || STATE_META.scheduled
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${m.color} ${m.bg}`}>
      {(state === 'ready' || state === 'in_progress') && (
        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${state === 'ready' ? 'bg-green-500' : 'bg-orange-500'}`} />
      )}
      {m.label}
    </span>
  )
}

const STEPS = [
  { num: 1, title: 'Book Appointment', desc: 'Schedule a telehealth consultation with your doctor' },
  { num: 2, title: 'Wait for Your Slot', desc: 'Doctor opens the room 15 min before your appointment' },
  { num: 3, title: 'Click Join Call', desc: 'Allow camera & microphone access when prompted' },
  { num: 4, title: 'Consult From Home', desc: 'Secure, private video consultation — no app needed' },
]

export default function Telehealth() {
  const navigate = useNavigate()
  const [appts, setAppts]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [joiningId, setJoiningId] = useState(null)

  useEffect(() => {
    api.get('/portal/appointments', { params: { limit: 100 } })
      .then(data => {
        const list = Array.isArray(data) ? data : (data.appointments || data.items || data.results || [])
        setAppts(list.filter(a => a.mode === 'telehealth' && ['pending', 'confirmed', 'in_progress', 'completed'].includes(a.status)))
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const join = async (appt) => {
    setJoiningId(appt.id)
    try {
      const data = await api.post(`/portal/appointments/${appt.id}/join`)
      navigate(`/telehealth/call/${appt.id}`, { state: { joinData: data, appt } })
    } catch (e) {
      alert(e.response?.data?.detail || e.message || 'Cannot join yet. Please wait for your appointment time.')
    } finally {
      setJoiningId(null)
    }
  }

  const canJoin = (a) => ['pending', 'confirmed', 'in_progress'].includes(a.status)
  const active  = appts.filter(a => canJoin(a))
  const past    = appts.filter(a => a.status === 'completed')

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Hero */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F2557 0%, #1a3a7a 100%)' }}>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Video size={18} className="text-white" />
            </div>
            <span className="text-white font-bold text-base">Video Consultations</span>
          </div>
          <p className="text-blue-200 text-sm leading-relaxed">
            See your doctor from anywhere — no travel, no waiting rooms. Secure, private video calls directly with your healthcare provider.
          </p>
        </div>
        {/* Steps */}
        <div className="px-5 pb-5 grid grid-cols-2 gap-3">
          {STEPS.map(s => (
            <div key={s.num} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {s.num}
              </span>
              <div>
                <p className="text-white text-xs font-semibold">{s.title}</p>
                <p className="text-blue-300 text-xs mt-0.5 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={26} className="animate-spin text-gray-300" />
        </div>
      ) : appts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-14 flex flex-col items-center text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
            <Video size={22} className="text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-600 mb-1">No telehealth appointments</p>
          <p className="text-xs text-gray-400">Book a video consultation with your doctor to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Upcoming / Active */}
          {active.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Upcoming</p>
              <div className="space-y-3">
                {active.map(a => {
                  const state = a.telehealth_state || (a.status === 'in_progress' ? 'in_progress' : 'scheduled')
                  const isReady = state === 'ready' || state === 'in_progress'
                  return (
                    <div key={a.id} className={`bg-white rounded-2xl border p-4 ${isReady ? 'border-green-200 shadow-sm shadow-green-50' : 'border-gray-200'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${isReady ? 'bg-green-100' : 'bg-blue-50'}`}>
                          <Video size={18} className={isReady ? 'text-green-600' : 'text-blue-600'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold text-gray-900 text-sm">{a.doctor_name || 'Your Doctor'}</span>
                            <StatusBadge state={state} />
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Calendar size={11} />{a.appointment_date || a.date}</span>
                            <span className="flex items-center gap-1"><Clock size={11} />{fmt12(a.appointment_time || a.time) || '—'}</span>
                          </div>
                          {isReady && (
                            <p className="text-xs text-green-600 font-medium mt-1.5 flex items-center gap-1">
                              <Wifi size={11} /> Your doctor is ready — join now!
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => join(a)}
                        disabled={joiningId === a.id}
                        className={`mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 ${
                          isReady
                            ? 'bg-green-600 hover:bg-green-700 shadow-sm shadow-green-200'
                            : 'bg-[#0F2557] hover:bg-blue-900'
                        }`}
                      >
                        {joiningId === a.id
                          ? <><Loader2 size={15} className="animate-spin" /> Joining…</>
                          : <><Video size={15} /> Join Video Call</>
                        }
                      </button>
                      <p className="text-center text-xs text-gray-400 mt-2 flex items-center justify-center gap-1">
                        <Info size={10} /> Join opens 15 min before appointment time
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Past consultations */}
          {past.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Past Consultations</p>
              <div className="space-y-2">
                {past.map(a => (
                  <div key={a.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={14} className="text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{a.doctor_name || 'Doctor'}</p>
                      <p className="text-xs text-gray-400">{a.appointment_date || a.date} · {fmt12(a.appointment_time || a.time)}</p>
                    </div>
                    <span className="text-xs text-gray-400">Completed</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
