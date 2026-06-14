import { useEffect, useState, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import {
  Video, PhoneOff, Loader2, AlertTriangle, Clock, RotateCcw,
  User, ChevronDown, CheckCircle, ArrowLeft, Wifi
} from 'lucide-react'
import api from '../../api/client'

function useTimer(active) {
  const [seconds, setSeconds] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    if (!active) { clearInterval(ref.current); return }
    ref.current = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(ref.current)
  }, [active])
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function EndCallModal({ onConfirm, onCancel, rejoinMins, setRejoinMins, ending }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <PhoneOff size={20} className="text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center mb-1">End Consultation?</h3>
        <p className="text-sm text-gray-500 text-center mb-5">The room will close and the patient's link will expire.</p>

        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
            Allow patient to rejoin?
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[0, 15, 30, 60].map(m => (
              <button
                key={m}
                onClick={() => setRejoinMins(m)}
                className={`py-2 rounded-xl text-sm font-semibold border transition-all ${
                  rejoinMins === m
                    ? 'bg-[#0F2557] text-white border-[#0F2557]'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {m === 0 ? 'No' : `${m}m`}
              </button>
            ))}
          </div>
          {rejoinMins > 0 && (
            <p className="text-xs text-blue-600 mt-2">
              Patient can rejoin for {rejoinMins} minutes after you leave.
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={ending}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {ending ? <Loader2 size={14} className="animate-spin" /> : <PhoneOff size={14} />}
            End Call
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TelehealthCall() {
  const { appointmentId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()

  const [joinData, setJoinData]   = useState(state?.joinData || null)
  const [appt, setAppt]           = useState(state?.appt || null)
  const [loading, setLoading]     = useState(!state?.joinData)
  const [error, setError]         = useState('')
  const [showEndModal, setShowEndModal] = useState(false)
  const [ending, setEnding]       = useState(false)
  const [ended, setEnded]         = useState(false)
  const [rejoinMins, setRejoinMins] = useState(0)
  const [callActive, setCallActive] = useState(false)

  const duration = useTimer(callActive)

  useEffect(() => {
    if (joinData) { setCallActive(true); return }
    api.post(`/telehealth/appointments/${appointmentId}/join`)
      .then(data => { setJoinData(data); setCallActive(true) })
      .catch(e => setError(e.response?.data?.detail || e.message || 'Could not join. The appointment window may not be open yet.'))
      .finally(() => setLoading(false))
  }, [appointmentId])

  // Build Daily.co URL with token + UI params
  const callUrl = joinData
    ? (() => {
        if (joinData.provider === 'daily.co' && joinData.token) {
          const base = joinData.url.split('?')[0]
          const params = new URLSearchParams({
            t: joinData.token,
            showLeaveButton: 'false',
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

  const confirmEnd = async () => {
    setEnding(true)
    try {
      await api.post(`/telehealth/appointments/${appointmentId}/complete`, {
        allow_rejoin_minutes: rejoinMins || undefined,
      })
      setCallActive(false)
      setEnded(true)
      setShowEndModal(false)
    } catch (e) {
      alert(e.response?.data?.detail || e.message || 'Could not end session.')
    } finally {
      setEnding(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
          <Loader2 size={28} className="animate-spin text-white" />
        </div>
        <p className="text-gray-300 text-sm font-medium">Connecting to video room…</p>
        <p className="text-gray-500 text-xs mt-1">Setting up your secure session</p>
      </div>
    </div>
  )

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) return (
    <div className="h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-red-900/30 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} className="text-red-400" />
        </div>
        <p className="text-white text-lg font-bold mb-2">Cannot Join Call</p>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">{error}</p>
        <button
          onClick={() => navigate('/telehealth')}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-100"
        >
          <ArrowLeft size={16} />
          Back to Telehealth
        </button>
      </div>
    </div>
  )

  // ── Call Ended ───────────────────────────────────────────────────────────────
  if (ended) return (
    <div className="h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-green-900/40 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={28} className="text-green-400" />
        </div>
        <p className="text-white text-xl font-bold mb-1">Consultation Ended</p>
        <p className="text-gray-400 text-sm mb-1">Duration: {duration}</p>
        {rejoinMins > 0 && (
          <p className="text-blue-400 text-sm mt-2">
            Patient may rejoin for {rejoinMins} more minutes.
          </p>
        )}
        <button
          onClick={() => navigate('/telehealth')}
          className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-white text-gray-900 rounded-xl font-semibold text-sm hover:bg-gray-100"
        >
          <ArrowLeft size={16} />
          Back to Telehealth
        </button>
      </div>
    </div>
  )

  // ── Active Call ──────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0 bg-gray-900 border-b border-white/10">
        {/* Live indicator */}
        <div className="flex items-center gap-2 mr-1">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          <span className="text-white text-xs font-bold tracking-wide">LIVE</span>
        </div>

        <div className="h-4 w-px bg-white/20" />

        {/* Patient info */}
        {appt && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-800 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {(appt.patient_name || 'P')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-white text-xs font-semibold leading-none">{appt.patient_name}</p>
              <p className="text-gray-400 text-xs mt-0.5">{appt.appointment_time}</p>
            </div>
          </div>
        )}

        {/* Duration */}
        <div className="flex items-center gap-1.5 text-gray-300 text-xs ml-2">
          <Clock size={11} />
          <span className="font-mono font-semibold">{duration}</span>
        </div>

        {/* Window end */}
        {windowEndsAt && (
          <div className="hidden sm:flex items-center gap-1.5 text-gray-500 text-xs">
            <span>Window closes {windowEndsAt}</span>
          </div>
        )}

        {/* Provider indicator */}
        {joinData && (
          <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500 ml-1">
            <Wifi size={11} />
            <span>{joinData.provider === 'daily.co' ? 'Daily.co' : 'Jitsi'}</span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* End call */}
          <button
            onClick={() => setShowEndModal(true)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            <PhoneOff size={13} />
            End Call
          </button>
        </div>
      </div>

      {/* Video iframe */}
      <div className="flex-1 min-h-0 bg-gray-950">
        {callUrl ? (
          <iframe
            src={callUrl}
            allow="camera; microphone; fullscreen; speaker; display-capture; autoplay; clipboard-read; clipboard-write"
            allowFullScreen
            className="w-full h-full"
            style={{ border: 'none', display: 'block' }}
            title="Telehealth Video Call"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            <div className="text-center">
              <Video size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Loading video room…</p>
            </div>
          </div>
        )}
      </div>

      {/* End call confirmation modal */}
      {showEndModal && (
        <EndCallModal
          onConfirm={confirmEnd}
          onCancel={() => setShowEndModal(false)}
          rejoinMins={rejoinMins}
          setRejoinMins={setRejoinMins}
          ending={ending}
        />
      )}
    </div>
  )
}
