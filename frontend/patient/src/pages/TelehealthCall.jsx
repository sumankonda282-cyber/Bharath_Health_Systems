import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { Video, PhoneOff, Loader2, AlertTriangle, Clock, ArrowLeft, Wifi } from 'lucide-react'
import api from '../api/client'

export default function TelehealthCall() {
  const { appointmentId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()

  const [joinData, setJoinData] = useState(state?.joinData || null)
  const [appt, setAppt]         = useState(state?.appt || null)
  const [loading, setLoading]   = useState(!state?.joinData)
  const [error, setError]       = useState('')
  const [leaving, setLeaving]   = useState(false)

  useEffect(() => {
    if (joinData) return
    api.post(`/portal/appointments/${appointmentId}/join`)
      .then(data => setJoinData(data))
      .catch(e => setError(e.response?.data?.detail || e.message || 'Cannot join yet. Please wait for your appointment time.'))
      .finally(() => setLoading(false))
  }, [appointmentId])

  // Build Daily.co URL with token + UI params
  const callUrl = joinData
    ? (() => {
        if (joinData.provider === 'daily.co' && joinData.token) {
          const base = joinData.url.split('?')[0]
          const params = new URLSearchParams({
            t: joinData.token,
            showLeaveButton: 'true',
            showFullscreenButton: 'true',
          })
          return `${base}?${params}`
        }
        return joinData.url
      })()
    : null

  const windowEndsAt = joinData?.window_ends_at
    ? new Date(joinData.window_ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  const handleLeave = () => {
    setLeaving(true)
    navigate('/telehealth')
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center" style={{ background: '#0F2557' }}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
          <Loader2 size={28} className="animate-spin text-white" />
        </div>
        <p className="text-blue-200 text-sm font-medium">Connecting to your doctor…</p>
        <p className="text-blue-400 text-xs mt-1">Setting up secure session</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="h-screen flex items-center justify-center p-4" style={{ background: '#0F2557' }}>
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-yellow-900/40 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} className="text-yellow-400" />
        </div>
        <p className="text-white text-lg font-bold mb-2">Cannot Join Yet</p>
        <p className="text-blue-200 text-sm mb-6 leading-relaxed">{error}</p>
        <button
          onClick={() => navigate('/telehealth')}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-white rounded-xl font-semibold text-sm hover:bg-gray-100"
          style={{ color: '#0F2557' }}
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>
    </div>
  )

  return (
    <div className="h-screen flex flex-col" style={{ background: '#060e2b' }}>
      {/* Compact top bar */}
      <div className="flex items-center gap-3 px-4 py-2 flex-shrink-0 border-b border-white/10" style={{ background: '#0F2557' }}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-white text-xs font-semibold">Live Consultation</span>
        </div>

        {appt && (
          <>
            <div className="h-3.5 w-px bg-white/20" />
            <span className="text-blue-200 text-xs">{appt.doctor_name || 'Doctor'}</span>
          </>
        )}

        {windowEndsAt && (
          <div className="hidden sm:flex items-center gap-1 text-blue-300 text-xs ml-2">
            <Clock size={10} />
            Session until {windowEndsAt}
          </div>
        )}

        {joinData?.provider && (
          <div className="hidden sm:flex items-center gap-1 text-blue-400 text-xs">
            <Wifi size={10} />
            {joinData.provider === 'daily.co' ? 'Daily.co' : 'Jitsi'}
          </div>
        )}

        <button
          onClick={handleLeave}
          disabled={leaving}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors"
        >
          <PhoneOff size={12} />
          Leave
        </button>
      </div>

      {/* Video iframe */}
      <div className="flex-1 min-h-0">
        {callUrl ? (
          <iframe
            src={callUrl}
            allow="camera; microphone; fullscreen; speaker; display-capture; autoplay; clipboard-read; clipboard-write"
            allowFullScreen
            className="w-full h-full"
            style={{ border: 'none', display: 'block' }}
            title="Telehealth Video Consultation"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Video size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Loading video room…</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
