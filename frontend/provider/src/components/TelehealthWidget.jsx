import { useState, useRef, useEffect, useCallback } from 'react'
import { PhoneOff, Maximize2, Minimize2, Move, X, Clock, Loader2, Monitor } from 'lucide-react'
import { useTelehealth } from '../contexts/TelehealthContext'

const SIZES = {
  mini:   { w: 280, h: 200, label: 'Mini' },
  small:  { w: 380, h: 260, label: 'S' },
  medium: { w: 520, h: 360, label: 'M' },
  large:  { w: 720, h: 500, label: 'L' },
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
  const { activeCall, endCall, dismissCall } = useTelehealth()

  const [size, setSize]           = useState('small')
  const [isFullscreen, setIsFull] = useState(false)
  const [showEnd, setShowEnd]     = useState(false)
  const [ending, setEnding]       = useState(false)
  const [minimized, setMinimized] = useState(false)

  // Drag state
  const [pos, setPos]       = useState({ x: window.innerWidth - 420, y: window.innerHeight - 320 })
  const dragging            = useRef(false)
  const dragOffset          = useRef({ x: 0, y: 0 })
  const widgetRef           = useRef(null)

  const duration = useCallTimer(!!activeCall)

  // Build call URL
  const callUrl = activeCall
    ? (() => {
        if (activeCall.provider === 'daily.co' && activeCall.token) {
          const base = activeCall.url.split('?')[0]
          return `${base}?t=${activeCall.token}&showLeaveButton=false&showFullscreenButton=false`
        }
        return activeCall.url
      })()
    : null

  const windowEndsAt = activeCall?.windowEndsAt
    ? new Date(activeCall.windowEndsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  // Drag handlers
  const onMouseDown = useCallback((e) => {
    if (isFullscreen) return
    dragging.current = true
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    e.preventDefault()
  }, [pos, isFullscreen])

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return
      const nx = Math.max(0, Math.min(window.innerWidth - (SIZES[size]?.w || 380), e.clientX - dragOffset.current.x))
      const ny = Math.max(0, Math.min(window.innerHeight - 48, e.clientY - dragOffset.current.y))
      setPos({ x: nx, y: ny })
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [size])

  const confirmEnd = async (rejoinMins) => {
    setEnding(true)
    try {
      await endCall(rejoinMins)
      setShowEnd(false)
    } finally {
      setEnding(false)
    }
  }

  if (!activeCall) return null

  const dim = SIZES[size] || SIZES.small

  // Fullscreen
  if (isFullscreen) {
    return (
      <>
        <div className="fixed inset-0 z-[900] flex flex-col bg-gray-950">
          {/* Bar */}
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-900 border-b border-white/10 flex-shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-white text-xs font-bold">LIVE</span>
            {activeCall.appt?.patient_name && (
              <span className="text-gray-300 text-xs">{activeCall.appt.patient_name}</span>
            )}
            <span className="font-mono text-xs text-gray-400">{duration}</span>
            {windowEndsAt && <span className="text-gray-500 text-xs hidden sm:block">Closes {windowEndsAt}</span>}
            <div className="ml-auto flex items-center gap-2">
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
            <iframe src={callUrl}
              allow="camera; microphone; fullscreen; speaker; display-capture; autoplay; clipboard-read; clipboard-write"
              allowFullScreen className="w-full h-full" style={{ border: 'none', display: 'block' }}
              title="Telehealth" />
          </div>
        </div>
        {showEnd && <EndModal onConfirm={confirmEnd} onCancel={() => setShowEnd(false)} ending={ending} />}
      </>
    )
  }

  return (
    <>
      <div
        ref={widgetRef}
        className="fixed z-[900] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-white/10"
        style={{
          left: pos.x,
          top: pos.y,
          width: minimized ? 220 : dim.w,
          height: minimized ? 40 : dim.h,
          background: '#111827',
          transition: 'width 0.2s ease, height 0.2s ease',
          userSelect: 'none',
        }}
      >
        {/* Title bar — drag handle */}
        <div
          onMouseDown={onMouseDown}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 border-b border-white/10 flex-shrink-0 cursor-grab active:cursor-grabbing"
          style={{ minHeight: 40 }}
        >
          <Move size={12} className="text-gray-500 flex-shrink-0" />

          {/* Live dot */}
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>

          <span className="text-white text-xs font-semibold truncate flex-1">
            {activeCall.appt?.patient_name || 'Live Call'}
          </span>

          <span className="font-mono text-xs text-gray-400 flex-shrink-0">{duration}</span>

          {/* Size buttons */}
          {!minimized && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {Object.entries(SIZES).map(([key, s]) => (
                <button key={key} onClick={() => setSize(key)}
                  title={s.label}
                  className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-colors ${size === key ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-700 hover:text-white'}`}>
                  {key === 'mini' ? '◻' : key === 'small' ? 'S' : key === 'medium' ? 'M' : 'L'}
                </button>
              ))}
              <button onClick={() => setIsFull(true)} title="Fullscreen"
                className="w-5 h-5 rounded flex items-center justify-center text-gray-500 hover:bg-gray-700 hover:text-white">
                <Maximize2 size={10} />
              </button>
            </div>
          )}

          <button onClick={() => setMinimized(v => !v)} title={minimized ? 'Expand' : 'Minimize'}
            className="w-5 h-5 rounded flex items-center justify-center text-gray-500 hover:bg-gray-700 hover:text-white flex-shrink-0">
            {minimized ? <Maximize2 size={10} /> : <Minimize2 size={10} />}
          </button>

          <button onClick={() => setShowEnd(true)} title="End Call"
            className="w-5 h-5 rounded flex items-center justify-center text-gray-500 hover:bg-red-600 hover:text-white flex-shrink-0">
            <PhoneOff size={10} />
          </button>
        </div>

        {/* Video area */}
        {!minimized && (
          <div className="flex-1 min-h-0">
            {callUrl ? (
              <iframe
                src={callUrl}
                allow="camera; microphone; fullscreen; speaker; display-capture; autoplay; clipboard-read; clipboard-write"
                allowFullScreen
                className="w-full h-full"
                style={{ border: 'none', display: 'block' }}
                title="Telehealth"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600">
                <Loader2 size={20} className="animate-spin" />
              </div>
            )}
          </div>
        )}

        {/* Bottom strip when minimized */}
        {minimized && windowEndsAt && (
          <div className="hidden" />
        )}
      </div>

      {showEnd && <EndModal onConfirm={confirmEnd} onCancel={() => setShowEnd(false)} ending={ending} />}
    </>
  )
}
