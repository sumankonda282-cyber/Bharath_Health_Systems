import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { doctorApi } from '../../api'
import {
  Video, Clock, CheckCircle2, XCircle, Loader2, RefreshCw,
  AlertTriangle, Users, Activity, Calendar, PhoneCall, ChevronRight,
  Wifi, WifiOff, User
} from 'lucide-react'
import api from '../../api/client'

function todayIST() {
  const d = new Date(new Date().getTime() + 5.5 * 3600000)
  return d.toISOString().slice(0, 10)
}

const STATE_META = {
  scheduled:   { label: 'Scheduled',   color: 'text-slate-600',  bg: 'bg-slate-100',  dot: '' },
  ready:       { label: 'Waiting',     color: 'text-amber-700',  bg: 'bg-amber-100',  dot: 'bg-amber-500' },
  in_progress: { label: 'Live',        color: 'text-green-700',  bg: 'bg-green-100',  dot: 'bg-green-500' },
  completed:   { label: 'Completed',   color: 'text-slate-500',  bg: 'bg-slate-100',  dot: '' },
  expired:     { label: 'Expired',     color: 'text-red-700',    bg: 'bg-red-100',    dot: '' },
}

function StatCard({ icon, label, value, accent, pulse }) {
  return (
    <div className={`bg-white rounded-2xl border p-4 flex items-center gap-4 ${accent ? 'border-green-200' : 'border-gray-100'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent ? 'bg-green-100' : 'bg-slate-100'}`}>
        {pulse
          ? <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
          : icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

function StatusBadge({ state }) {
  const m = STATE_META[state] || STATE_META.scheduled
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${m.color} ${m.bg}`}>
      {m.dot && <span className={`w-1.5 h-1.5 rounded-full ${m.dot} ${state === 'in_progress' || state === 'ready' ? 'animate-pulse' : ''}`} />}
      {m.label}
    </span>
  )
}

function AppointmentCard({ appt, onJoin, joining }) {
  const navigate = useNavigate()
  const state = appt.telehealth_state || (appt.status === 'in_progress' ? 'in_progress' : 'scheduled')
  const canJoin = ['pending', 'confirmed', 'in_progress'].includes(appt.status)
  const isCompleted = appt.status === 'completed'
  const isLive = state === 'in_progress'

  const initials = (appt.patient_name || 'P').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className={`bg-white rounded-2xl border transition-all ${isLive ? 'border-green-200 shadow-md shadow-green-50' : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'}`}>
      <div className="p-4 flex items-center gap-4">
        {/* Patient avatar */}
        <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${isLive ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{appt.patient_name || 'Patient'}</span>
            <StatusBadge state={state} />
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {appt.appointment_time || '—'}
            </span>
            {appt.doctor_name && (
              <span className="flex items-center gap-1">
                <User size={11} />
                {appt.doctor_name}
              </span>
            )}
            {appt.patient_mobile && (
              <span className="text-gray-400">{appt.patient_mobile}</span>
            )}
          </div>
        </div>

        {/* Action */}
        <div className="flex-shrink-0">
          {canJoin ? (
            <button
              onClick={() => onJoin(appt)}
              disabled={joining === appt.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 ${
                isLive
                  ? 'bg-green-600 hover:bg-green-700 shadow-sm shadow-green-200'
                  : 'bg-[#0F2557] hover:bg-blue-900'
              }`}
            >
              {joining === appt.id
                ? <Loader2 size={14} className="animate-spin" />
                : isLive ? <Wifi size={14} /> : <Video size={14} />
              }
              {joining === appt.id ? 'Joining…' : isLive ? 'Rejoin' : 'Join'}
              {joining !== appt.id && <ChevronRight size={14} />}
            </button>
          ) : isCompleted ? (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <CheckCircle2 size={14} className="text-green-500" />
              Done
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <XCircle size={14} />
              Unavailable
            </div>
          )}
        </div>
      </div>

      {/* Live indicator strip */}
      {isLive && (
        <div className="px-4 pb-3 -mt-1">
          <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Consultation in progress
          </div>
        </div>
      )}
    </div>
  )
}

export default function TelehealthDesk() {
  const navigate = useNavigate()
  const [appts, setAppts]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [joining, setJoining] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true)
    api.get('/appointments', { params: { appointment_date: todayIST(), limit: 200 } })
      .then(data => {
        const list = Array.isArray(data) ? data : (data.items || data.results || [])
        setAppts(list.filter(a => a.mode === 'telehealth'))
        setLastUpdate(new Date())
        setError('')
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(() => load(true), 30000)
    return () => clearInterval(interval)
  }, [load])

  const join = async (appt) => {
    setJoining(appt.id)
    try {
      const data = await doctorApi.joinTelehealth(appt.id)
      navigate(`/telehealth/call/${appt.id}`, { state: { joinData: data, appt } })
    } catch (e) {
      alert(e.message || 'Could not join. Check the appointment time window.')
    } finally {
      setJoining(null)
    }
  }

  const live      = appts.filter(a => a.status === 'in_progress' || a.telehealth_state === 'in_progress')
  const waiting   = appts.filter(a => a.telehealth_state === 'ready')
  const completed = appts.filter(a => a.status === 'completed')
  const upcoming  = appts.filter(a => !['in_progress', 'completed'].includes(a.status) && a.telehealth_state !== 'in_progress')

  return (
    <div className="max-w-4xl mx-auto">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Calendar size={18} className="text-slate-500" />} label="Total Today" value={appts.length} />
        <StatCard icon={null} label="Live Now" value={live.length} accent pulse={live.length > 0} />
        <StatCard icon={<Clock size={18} className="text-amber-500" />} label="Waiting" value={waiting.length} />
        <StatCard icon={<CheckCircle2 size={18} className="text-green-500" />} label="Completed" value={completed.length} />
      </div>

      {/* Header actions */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">Today's Telehealth Sessions</h2>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-xs text-gray-400">
              Updated {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => load()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {loading && appts.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-gray-300" />
        </div>
      ) : appts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-20 flex flex-col items-center justify-center text-gray-400">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <Video size={24} className="opacity-30" />
          </div>
          <p className="text-sm font-medium text-gray-500">No telehealth appointments today</p>
          <p className="text-xs text-gray-400 mt-1">Appointments set to "Telehealth" mode will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Live first */}
          {live.map(a => (
            <AppointmentCard key={a.id} appt={a} onJoin={join} joining={joining} />
          ))}
          {/* Waiting */}
          {waiting.filter(a => a.status !== 'in_progress').map(a => (
            <AppointmentCard key={a.id} appt={a} onJoin={join} joining={joining} />
          ))}
          {/* Upcoming */}
          {upcoming.map(a => (
            <AppointmentCard key={a.id} appt={a} onJoin={join} joining={joining} />
          ))}
          {/* Completed (collapsed) */}
          {completed.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wide">Completed ({completed.length})</p>
              {completed.map(a => (
                <AppointmentCard key={a.id} appt={a} onJoin={join} joining={joining} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
