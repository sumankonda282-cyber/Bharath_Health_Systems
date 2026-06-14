import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PhoneOff, Maximize2, Minimize2, Move, X, Clock, Loader2,
  Video, FileText
} from 'lucide-react'
import { useTelehealth } from '../contexts/TelehealthContext'

// Size presets: [width, height]
const SIZES = {
  small:  [288, 200],
  medium: [400, 280],
  large:  [560, 400],
}

function EndModal({ onConfirm, onCancel, ending }) {
  const [rejoin, setRejoin] = useState(0)
  return (
    <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
          <PhoneOff size={18} className="text-red-600" />
        </div>
        <h3 className="text-base font-bold text-gray-900 text-center mb-1">End Consultation?</h3>
        <p className="text-xs text-gray-500 text-center mb-4">The room will close immediately for both parties.</p>
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">Allow patient to rejoin?</p>
          <div className="grid grid-cols-4 gap-1.5">
            {[0, 15, 30, 60].map(m => (
              <button key={m} onClick={() => setRejoin(m)}
                className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${rejoin === m ? 'bg-[#0F2557] text-white border-[#0F2557]' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                {m === 0 ? 'No' : `${m}m`}
              </button>
            ))}
          </div>
          {rejoin > 0 && <p className="text-xs text-blue-600 mt-2">Patient can rejoin for {rejoin} minutes.</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => onConfirm(rejoin)} disabled={ending}
            className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5">
            {ending ? <Loader2 size={13} className="animate-spin" /> : <PhoneOff size={13} />}
            End Call
          </button>
        </div>
      </div>
    </div>
  )
}

function useCallTimer(active) {
  const [seconds, setSeconds] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    if (!active) { clearInterval(ref.current); return }
    ref.current = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(ref.current)
  }, [active])
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function TelehealthWidget() {
  const navigate = useNavigate()
  const { activeCall, endCall } = useTelehealth()

  const [size, setSize]           = useState('small')
  const [isFullscreen, setIsFull] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [activeTab, setActiveTab] = useState('video')
  const [showEnd, setShowEnd]     = useState(false)
  const [ending, setEnding]       = useState(false)
  const [favForms, setFavForms]   = useState([])

  // Drag
  const [pos, setPos] = useState({ x: window.innerWidth - 420, y: window.innerHeight - 320 })
  const dragging    = useRef(false)
  const dragOffset  = useRef({ x: 0, y: 0 })

  const duration = useCallTimer(!!activeCall)

  // Load favourite forms from localStorage
  useEffect(() => {
    try { setFavForms(JSON.parse(localStorage.getItem('favorited_forms') || '[]')) }
    catch { setFavForms([]) }
  }, [activeCall])

  // Build Daily.co URL with token
  const callUrl = activeCall
    ? activeCall.provider === 'daily.co' && activeCall.token
      ? `${activeCall.url.split('?')[0]}?t=${activeCall.token}&showLeaveButton=false&showFullscreenButton=false`
      : activeCall.url
    : null

  const windowEndsAt = activeCall?.windowEndsAt
    ? new Date(activeCall.windowEndsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  // Drag handlers
  const onMouseDown = useCallback((e) => {
    if (isFullscreen || e.target.closest('button')) return
    dragging.current = true
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    document.body.style.userSelect = 'none'
    e.preventDefault()
  }, [pos, isFullscreen])

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return
      const [w] = SIZES[size] || SIZES.small
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - w, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 48, e.clientY - dragOffset.current.y)),
      })
    }
    const onUp = () => { dragging.current = false; document.body.style.userSelect = '' }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [size])

  const confirmEnd = async (rejoinMins) => {
    setEnding(true)
    try { await endCall(rejoinMins); setShowEnd(false) }
    finally { setEnding(false) }
  }

  if (!activeCall) return null

  const [w, h] = SIZES[size] || SIZES.small
  const showTabs = size === 'medium' || size === 'large' || isFullscreen

  // ── Fullscreen ───────────────────────────────────────────────────────────────
  if (isFullscreen) {
    return (
      <>
        <div className="fixed inset-0 z-[900] flex flex-col bg-gray-950">
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-900 border-b border-white/10 flex-shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-white text-xs font-bold">LIVE</span>
            {activeCall.appt?.patient_name && <span className="text-gray-300 text-xs">{activeCall.appt.patient_name}</span>}
            <span className="font-mono text-xs text-gray-400">{duration}</span>
            {windowEndsAt && <span className="text-gray-500 text-xs hidden sm:block">Closes {windowEndsAt}</span>}

            {/* Tabs in fullscreen */}
            <div className="flex gap-1 ml-4">
              {[{ id: 'video', label: '🎥 Video' }, { id: 'forms', label: '📝 Forms' }].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${activeTab === t.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => navigate(`/encounter/${activeCall.appointmentId}`)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-600">
                <FileText size={12} /> Open Chart
              </button>
              <button onClick={() => setIsFull(false)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 text-xs">
                <Minimize2 size={12} /> Exit Fullscreen
              </button>
              <button onClick={() => setShowEnd(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold">
                <PhoneOff size={12} /> End Call
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            {activeTab === 'video' ? (
              <iframe src={callUrl}
                allow="camera; microphone; fullscreen; speaker; display-capture; autoplay; clipboard-read; clipboard-write"
                allowFullScreen className="w-full h-full" style={{ border: 'none', display: 'block' }}
                title="Telehealth" />
            ) : (
              <div className="h-full overflow-y-auto bg-gray-900 p-4">
                <p className="text-xs text-gray-400 mb-3">Quick access to assessment forms</p>
                {favForms.length === 0 && (
                  <p className="text-xs text-gray-500 mb-3">No favourited forms yet. Star forms from the Forms Library to pin them here.</p>
                )}
                {favForms.map(form => (
                  <button key={form.id}
                    onClick={() => navigate(`/forms/fill/${form.id}${activeCall.appointmentId ? `?appointment_id=${activeCall.appointmentId}` : ''}`)}
                    className="w-full flex items-center gap-2 px-3 py-2 mb-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors">
                    <FileText size={13} className="text-blue-400 flex-shrink-0" />
                    <span className="text-xs text-gray-200 truncate">{form.name}</span>
                  </button>
                ))}
                <button onClick={() => navigate('/forms')}
                  className="text-xs text-blue-400 hover:text-blue-300 mt-2">
                  Browse All Forms →
                </button>
              </div>
            )}
          </div>
        </div>
        {showEnd && <EndModal onConfirm={confirmEnd} onCancel={() => setShowEnd(false)} ending={ending} />}
      </>
    )
  }

  // ── Floating widget ──────────────────────────────────────────────────────────
  return (
    <>
      <div
        className="fixed z-[900] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-gray-700"
        style={{
          left: pos.x,
          top: pos.y,
          width: minimized ? 240 : w,
          height: minimized ? 40 : h,
          background: '#111827',
          transition: 'width 0.15s ease, height 0.15s ease',
        }}
      >
        {/* Title bar / drag handle */}
        <div
          onMouseDown={onMouseDown}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 border-b border-white/10 flex-shrink-0 cursor-grab active:cursor-grabbing"
          style={{ minHeight: 40 }}
        >
          <Move size={11} className="text-gray-600 flex-shrink-0" />
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-white text-xs font-semibold truncate flex-1">
            {activeCall.appt?.patient_name || 'Live Call'}
          </span>
          <span className="font-mono text-xs text-gray-400 flex-shrink-0">{duration}</span>

          {/* Controls */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Size */}
            {!minimized && Object.keys(SIZES).map(k => (
              <button key={k} onClick={() => setSize(k)}
                className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-colors ${size === k ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-700 hover:text-white'}`}>
                {k === 'small' ? 'S' : k === 'medium' ? 'M' : 'L'}
              </button>
            ))}
            {/* Fullscreen */}
            {!minimized && (
              <button onClick={() => setIsFull(true)}
                className="w-5 h-5 rounded flex items-center justify-center text-gray-500 hover:bg-gray-700 hover:text-white">
                <Maximize2 size={10} />
              </button>
            )}
            {/* Open chart */}
            {!minimized && (
              <button onClick={() => navigate(`/encounter/${activeCall.appointmentId}`)} title="Open Patient Chart"
                className="w-5 h-5 rounded text-gray-500 hover:bg-blue-700 hover:text-white flex items-center justify-center text-[10px]">
                📋
              </button>
            )}
            {/* Minimize */}
            <button onClick={() => setMinimized(v => !v)}
              className="w-5 h-5 rounded flex items-center justify-center text-gray-500 hover:bg-gray-700 hover:text-white">
              {minimized ? <Maximize2 size={10} /> : <Minimize2 size={10} />}
            </button>
            {/* End call */}
            <button onClick={() => setShowEnd(true)}
              className="w-5 h-5 rounded flex items-center justify-center text-gray-500 hover:bg-red-600 hover:text-white">
              <PhoneOff size={10} />
            </button>
          </div>
        </div>

        {/* Tab bar — medium/large only */}
        {!minimized && showTabs && (
          <div className="flex border-b border-white/10 flex-shrink-0" style={{ background: '#1a2035' }}>
            {[{ id: 'video', label: '🎥 Video' }, { id: 'forms', label: '📝 Forms' }].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-4 py-1.5 text-xs font-semibold transition-colors ${activeTab === t.id ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-200'}`}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {!minimized && (
          <div className="flex-1 min-h-0 overflow-hidden">
            {/* Video */}
            {(!showTabs || activeTab === 'video') && (
              callUrl ? (
                <iframe src={callUrl}
                  allow="camera; microphone; fullscreen; speaker; display-capture; autoplay; clipboard-read; clipboard-write"
                  allowFullScreen className="w-full h-full" style={{ border: 'none', display: 'block' }}
                  title="Telehealth" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                  <Video size={22} className="opacity-40" />
                  <span className="text-xs">Connecting…</span>
                </div>
              )
            )}

            {/* Forms tab */}
            {showTabs && activeTab === 'forms' && (
              <div className="h-full overflow-y-auto p-3 space-y-1.5" style={{ background: '#0f172a' }}>
                {favForms.length === 0 && (
                  <p className="text-xs text-gray-500 mb-2">No favourited forms yet.</p>
                )}
                {favForms.map(form => (
                  <button key={form.id}
                    onClick={() => navigate(`/forms/fill/${form.id}${activeCall.appointmentId ? `?appointment_id=${activeCall.appointmentId}` : ''}`)}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors">
                    <FileText size={13} className="text-blue-400 flex-shrink-0" />
                    <span className="text-xs text-gray-200 truncate">{form.name}</span>
                  </button>
                ))}
                <button onClick={() => navigate('/forms')}
                  className="w-full text-xs text-blue-400 hover:text-blue-300 mt-1 text-left px-1">
                  Browse All Forms →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showEnd && <EndModal onConfirm={confirmEnd} onCancel={() => setShowEnd(false)} ending={ending} />}
    </>
  )
}
