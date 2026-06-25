import { useEffect, useState, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Loader2, AlertTriangle,
  Clock, ArrowLeft, Wifi, ShieldCheck, Camera,
} from 'lucide-react'
import api from '../api/client'

const NAVY = '#0F2557'

export default function TelehealthCall() {
  const { appointmentId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()

  // lobby → joining → call → error
  const [phase, setPhase]       = useState(state?.joinData ? 'call' : 'lobby')
  const [joinData, setJoinData] = useState(state?.joinData || null)
  const [appt]                  = useState(state?.appt || null)
  const [error, setError]       = useState('')

  // Lobby device preview
  const videoRef   = useRef(null)
  const streamRef  = useRef(null)
  const [permission, setPermission] = useState('idle')   // idle|requesting|granted|denied
  const [camOn, setCamOn] = useState(true)
  const [micOn, setMicOn] = useState(true)

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  // Acquire camera/mic for the lobby preview
  useEffect(() => {
    if (phase !== 'lobby') return
    let cancelled = false
    setPermission('requesting')
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setPermission('granted')
      })
      .catch(() => { if (!cancelled) setPermission('denied') })
    return () => { cancelled = true; stopStream() }
  }, [phase])

  // Always release the camera if the component unmounts
  useEffect(() => () => stopStream(), [])

  const toggleCam = () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (track) { track.enabled = !track.enabled; setCamOn(track.enabled) }
  }
  const toggleMic = () => {
    const track = streamRef.current?.getAudioTracks()[0]
    if (track) { track.enabled = !track.enabled; setMicOn(track.enabled) }
  }

  const handleJoin = async () => {
    stopStream()
    setPhase('joining')
    try {
      const data = await api.post(`/portal/appointments/${appointmentId}/join`)
      setJoinData(data)
      setPhase('call')
    } catch (e) {
      setError(e.response?.data?.detail || e.message || 'Cannot join yet. Please wait for your appointment time.')
      setPhase('error')
    }
  }

  // Build the room URL (with token if Daily.co)
  const callUrl = joinData
    ? (joinData.provider === 'daily.co' && joinData.token
        ? `${joinData.url.split('?')[0]}?${new URLSearchParams({ t: joinData.token, showLeaveButton: 'true', showFullscreenButton: 'true' })}`
        : joinData.url)
    : null

  const windowEndsAt = joinData?.window_ends_at
    ? new Date(joinData.window_ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  // ── Lobby ──────────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: NAVY }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-3">
              <Video size={22} className="text-white" />
            </div>
            <h1 className="text-white text-xl font-bold">Get ready to join</h1>
            <p className="text-blue-200 text-sm mt-1">
              {appt?.doctor_name ? `Consultation with ${appt.doctor_name}` : 'Your video consultation'}
            </p>
          </div>

          {/* Camera preview */}
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video shadow-2xl border border-white/10">
            <video ref={videoRef} autoPlay muted playsInline
              className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)', display: camOn && permission === 'granted' ? 'block' : 'none' }} />
            {(!camOn || permission !== 'granted') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/60">
                {permission === 'requesting' ? (
                  <><Loader2 size={26} className="animate-spin" /><span className="text-xs">Requesting camera & mic…</span></>
                ) : permission === 'denied' ? (
                  <><VideoOff size={26} /><span className="text-xs px-6 text-center">Camera/mic blocked. You can still join audio-only, or allow access in your browser.</span></>
                ) : (
                  <><VideoOff size={26} /><span className="text-xs">Camera off</span></>
                )}
              </div>
            )}
            {/* Device toggles */}
            {permission === 'granted' && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
                <button onClick={toggleMic}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${micOn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-red-600 text-white'}`}>
                  {micOn ? <Mic size={16} /> : <MicOff size={16} />}
                </button>
                <button onClick={toggleCam}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${camOn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-red-600 text-white'}`}>
                  {camOn ? <Video size={16} /> : <VideoOff size={16} />}
                </button>
              </div>
            )}
          </div>

          {/* Reassurance */}
          <div className="flex items-center justify-center gap-1.5 mt-4 text-blue-300 text-xs">
            <ShieldCheck size={13} />
            <span>Private & encrypted. Your doctor will admit you when ready.</span>
          </div>

          {/* Actions */}
          <div className="mt-5 flex gap-3">
            <button onClick={() => navigate('/telehealth')}
              className="px-4 py-3 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 flex items-center gap-1.5">
              <ArrowLeft size={15} /> Back
            </button>
            <button onClick={handleJoin} disabled={permission === 'requesting'}
              className="flex-1 px-4 py-3 rounded-xl bg-white text-sm font-bold hover:bg-gray-100 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ color: NAVY }}>
              <Camera size={16} /> Join Consultation
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Joining ────────────────────────────────────────────────────────────────
  if (phase === 'joining') {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: NAVY }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 size={28} className="animate-spin text-white" />
          </div>
          <p className="text-blue-200 text-sm font-medium">Connecting to your doctor…</p>
          <p className="text-blue-400 text-xs mt-1">Setting up your secure session</p>
        </div>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <div className="h-screen flex items-center justify-center p-4" style={{ background: NAVY }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-yellow-900/40 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-yellow-400" />
          </div>
          <p className="text-white text-lg font-bold mb-2">Cannot Join Yet</p>
          <p className="text-blue-200 text-sm mb-6 leading-relaxed">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setError(''); setPhase('lobby') }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white rounded-xl font-semibold text-sm hover:bg-white/20">
              Try Again
            </button>
            <button onClick={() => navigate('/telehealth')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white rounded-xl font-semibold text-sm hover:bg-gray-100" style={{ color: NAVY }}>
              <ArrowLeft size={16} /> Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── In call ────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col" style={{ background: '#060e2b' }}>
      <div className="flex items-center gap-3 px-4 py-2 flex-shrink-0 border-b border-white/10" style={{ background: NAVY }}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
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
            <Clock size={10} /> Session until {windowEndsAt}
          </div>
        )}
        {joinData?.provider && (
          <div className="hidden sm:flex items-center gap-1 text-blue-400 text-xs">
            <Wifi size={10} /> {joinData.provider === 'daily.co' ? 'Daily.co' : 'Jitsi'}
          </div>
        )}
        <button onClick={() => navigate('/telehealth')}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors">
          <PhoneOff size={12} /> Leave
        </button>
      </div>
      <div className="flex-1 min-h-0">
        {callUrl ? (
          <iframe src={callUrl}
            allow="camera; microphone; fullscreen; speaker; display-capture; autoplay; clipboard-read; clipboard-write"
            allowFullScreen className="w-full h-full" style={{ border: 'none', display: 'block' }}
            title="Telehealth Video Consultation" />
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
