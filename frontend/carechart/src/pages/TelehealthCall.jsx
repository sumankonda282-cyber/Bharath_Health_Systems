import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Video, PhoneOff, Loader2, AlertTriangle, Clock, RotateCcw } from 'lucide-react'
import api from '../api/client'

export default function TelehealthCall() {
  const { appointmentId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()

  const [joinData, setJoinData] = useState(state?.joinData || null)
  const [appt, setAppt]         = useState(state?.appt || null)
  const [loading, setLoading]   = useState(!state?.joinData)
  const [error, setError]       = useState('')
  const [ending, setEnding]     = useState(false)
  const [ended, setEnded]       = useState(false)
  const [rejoinMins, setRejoinMins] = useState(0)

  useEffect(() => {
    if (joinData) return
    api.post(`/telehealth/appointments/${appointmentId}/join`)
      .then(data => setJoinData(data))
      .catch(e => setError(e.message || 'Could not join. The appointment window may not be open yet.'))
      .finally(() => setLoading(false))
  }, [appointmentId])

  const callUrl = joinData
    ? joinData.provider === 'daily.co' && joinData.token
      ? `${joinData.url}?t=${joinData.token}`
      : joinData.url
    : null

  const endCall = async () => {
    setEnding(true)
    try {
      await api.post(`/telehealth/appointments/${appointmentId}/complete`, {
        allow_rejoin_minutes: rejoinMins || undefined,
      })
      setEnded(true)
    } catch (e) {
      alert(e.message || 'Could not end session.')
    } finally {
      setEnding(false)
    }
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center" style={{ background: '#022C22' }}>
      <div className="text-center">
        <Loader2 size={36} className="animate-spin mx-auto mb-3" style={{ color: '#6ee7b7' }} />
        <p className="text-sm" style={{ color: '#a7f3d0' }}>Connecting to ward round…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="h-screen flex items-center justify-center" style={{ background: '#022C22' }}>
      <div className="text-center max-w-sm px-4">
        <AlertTriangle size={36} className="text-red-400 mx-auto mb-3" />
        <p className="text-white font-semibold mb-2">Cannot Join Ward Round</p>
        <p className="text-sm mb-6" style={{ color: '#a7f3d0' }}>{error}</p>
        <button onClick={() => navigate(-1)}
          className="px-6 py-2.5 bg-white text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-100">
          Go Back
        </button>
      </div>
    </div>
  )

  if (ended) return (
    <div className="h-screen flex items-center justify-center" style={{ background: '#022C22' }}>
      <div className="text-center max-w-sm px-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#065F46' }}>
          <Video size={28} className="text-white" />
        </div>
        <p className="text-white text-xl font-bold mb-2">Virtual Round Ended</p>
        {rejoinMins > 0 && (
          <p className="text-sm mb-2" style={{ color: '#a7f3d0' }}>Patient can rejoin for {rejoinMins} minutes.</p>
        )}
        <button onClick={() => navigate('/telehealth')}
          className="mt-4 px-6 py-2.5 bg-white text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-100">
          Back to Ward Rounds
        </button>
      </div>
    </div>
  )

  return (
    <div className="h-screen flex flex-col" style={{ background: '#022C22' }}>
      {/* Info bar */}
      <div className="flex items-center gap-4 px-5 py-3 flex-shrink-0" style={{ background: '#065F46' }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
          <span className="text-white font-semibold text-sm">Virtual Ward Round</span>
        </div>
        {appt && (
          <span className="text-emerald-200 text-sm">
            {appt.patient_name} · {appt.appointment_time}
            {appt.bed_number && ` · Bed ${appt.bed_number}`}
          </span>
        )}
        {joinData?.window_ends_at && (
          <span className="flex items-center gap-1 text-xs text-emerald-300 ml-2">
            <Clock size={12} />
            Window closes {new Date(joinData.window_ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2">
            <RotateCcw size={14} className="text-emerald-300" />
            <select
              value={rejoinMins}
              onChange={e => setRejoinMins(Number(e.target.value))}
              className="text-xs bg-white/10 text-white border border-white/20 rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value={0}>No rejoin</option>
              <option value={15}>Rejoin: 15 min</option>
              <option value={30}>Rejoin: 30 min</option>
              <option value={60}>Rejoin: 60 min</option>
            </select>
          </div>
          <button
            onClick={endCall}
            disabled={ending}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {ending ? <Loader2 size={14} className="animate-spin" /> : <PhoneOff size={14} />}
            End Round
          </button>
        </div>
      </div>

      {/* Video iframe */}
      <div className="flex-1 min-h-0">
        <iframe
          src={callUrl}
          allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
          className="w-full h-full"
          style={{ border: 'none' }}
          title="Virtual Ward Round"
        />
      </div>
    </div>
  )
}
