import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Video, PhoneOff, Loader2, AlertTriangle, Clock } from 'lucide-react'
import api from '../api/client'

export default function TelehealthCall() {
  const { appointmentId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()

  const [joinData, setJoinData] = useState(state?.joinData || null)
  const [appt, setAppt]         = useState(state?.appt || null)
  const [loading, setLoading]   = useState(!state?.joinData)
  const [error, setError]       = useState('')

  useEffect(() => {
    if (joinData) return
    api.post(`/portal/appointments/${appointmentId}/join`)
      .then(data => setJoinData(data))
      .catch(e => setError(e.message || 'Cannot join yet. Please wait for your appointment time.'))
      .finally(() => setLoading(false))
  }, [appointmentId])

  const callUrl = joinData
    ? joinData.provider === 'daily.co' && joinData.token
      ? `${joinData.url}?t=${joinData.token}`
      : joinData.url
    : null

  if (loading) return (
    <div className="h-screen flex items-center justify-center" style={{ background: '#0F2557' }}>
      <div className="text-center">
        <Loader2 size={36} className="animate-spin text-white mx-auto mb-3" />
        <p className="text-blue-200 text-sm">Connecting to your doctor…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="h-screen flex items-center justify-center" style={{ background: '#0F2557' }}>
      <div className="text-center max-w-sm px-4">
        <AlertTriangle size={36} className="text-yellow-400 mx-auto mb-3" />
        <p className="text-white font-semibold mb-2">Cannot Join Yet</p>
        <p className="text-blue-200 text-sm mb-6">{error}</p>
        <button onClick={() => navigate('/telehealth')}
          className="px-6 py-2.5 bg-white rounded-xl font-semibold text-sm hover:bg-gray-100" style={{ color: '#0F2557' }}>
          Go Back
        </button>
      </div>
    </div>
  )

  return (
    <div className="h-screen flex flex-col" style={{ background: '#0F2557' }}>
      {/* Info bar */}
      <div className="flex items-center gap-4 px-5 py-3 flex-shrink-0" style={{ background: '#0a1a45' }}>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white font-semibold text-sm">Live Consultation</span>
        </span>
        {appt && (
          <span className="text-blue-200 text-sm">
            {appt.doctor_name || 'Doctor'} · {appt.appointment_time}
          </span>
        )}
        {joinData?.window_ends_at && (
          <span className="flex items-center gap-1 text-xs text-blue-300 ml-auto">
            <Clock size={12} />
            Session until {new Date(joinData.window_ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <button
          onClick={() => navigate('/telehealth')}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold"
        >
          <PhoneOff size={13} /> Leave
        </button>
      </div>

      {/* Video iframe */}
      <div className="flex-1 min-h-0">
        <iframe
          src={callUrl}
          allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
          className="w-full h-full"
          style={{ border: 'none' }}
          title="Telehealth Video Consultation"
        />
      </div>
    </div>
  )
}
