import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PhoneOff, Maximize2, Minimize2, Move, Loader2,
  Video, FileText, UserCheck, GripVertical,
} from 'lucide-react'
import { useTelehealth } from '../contexts/TelehealthContext'
import TransferDoctorModal from './TransferDoctorModal'

const NAVY = '#0F2557'
const STORE_KEY = 'telehealth_widget_box'

// Size presets (content area, excluding the title bar): [width, height]
const PRESETS = { S: [300, 210], M: [440, 300], L: [620, 430] }
const MIN_W = 260, MIN_H = 180
const BAR_H = 40   // title bar height when minimized / chrome height

function loadBox() {
  try {
    const b = JSON.parse(localStorage.getItem(STORE_KEY) || 'null')
    if (b && typeof b.w === 'number' && typeof b.h === 'number') return b
  } catch { /* ignore */ }
  const [w, h] = PRESETS.M
  return { x: window.innerWidth - w - 24, y: window.innerHeight - h - 88, w, h }
}

function clampBox(b) {
  const w = Math.min(Math.max(b.w, MIN_W), window.innerWidth)
  const h = Math.min(Math.max(b.h, MIN_H), window.innerHeight)
  const x = Math.min(Math.max(b.x, 0), Math.max(0, window.innerWidth - w))
  const y = Math.min(Math.max(b.y, 0), Math.max(0, window.innerHeight - BAR_H))
  return { x, y, w, h }
}

function useCallTimer(active) {
  const [seconds, setSeconds] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    if (!active) { clearInterval(ref.current); setSeconds(0); return }
    ref.current = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(ref.current)
  }, [active])
  const m = Math.floor(seconds / 60), s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── End-call confirmation (with optional rejoin window) ───────────────────────
function EndModal({ onConfirm, onCancel, ending }) {
  const [rejoin, setRejoin] = useState(0)
  return (
    <div className="fixed inset-0 bg-black/60 z-[1100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
          <PhoneOff size={18} className="text-red-600" />
        </div>
        <h3 className="text-base font-bold text-gray-900 text-center mb-1">End Consultation?</h3>
        <p className="text-xs text-gray-500 text-center mb-4">The room closes immediately for both parties.</p>
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

// ── Floating video widget ─────────────────────────────────────────────────────
export default function TelehealthWidget() {
  const navigate = useNavigate()
  const { activeCall, endCall, dismissCall } = useTelehealth()

  const [box, setBox]             = useState(loadBox)
  const [minimized, setMinimized] = useState(false)
  const [isFullscreen, setFull]   = useState(false)
  const [activeTab, setActiveTab] = useState('video')
  const [showEnd, setShowEnd]     = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [ending, setEnding]       = useState(false)
  const [interacting, setInteracting] = useState(false)  // drag/resize → iframe pointer-events off
  const [favForms, setFavForms]   = useState([])

  const drag   = useRef(null)   // { dx, dy }
  const resize = useRef(null)   // { startX, startY, startW, startH }

  const duration = useCallTimer(!!activeCall)

  // Persist box
  useEffect(() => { localStorage.setItem(STORE_KEY, JSON.stringify(box)) }, [box])

  // Keep inside viewport on window resize
  useEffect(() => {
    const onResize = () => setBox(b => clampBox(b))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Favourite forms (quick links)
  useEffect(() => {
    try { setFavForms(JSON.parse(localStorage.getItem('favorited_forms') || '[]')) }
    catch { setFavForms([]) }
  }, [activeCall])

  // Drag + resize global listeners
  useEffect(() => {
    const onMove = (e) => {
      if (drag.current) {
        setBox(b => clampBox({ ...b, x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy }))
      } else if (resize.current) {
        const r = resize.current
        setBox(b => clampBox({
          ...b,
          w: r.startW + (e.clientX - r.startX),
          h: r.startH + (e.clientY - r.startY),
        }))
      }
    }
    const onUp = () => {
      drag.current = null; resize.current = null
      document.body.style.userSelect = ''
      setInteracting(false)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  const startDrag = useCallback((e) => {
    if (isFullscreen || e.target.closest('button')) return
    drag.current = { dx: e.clientX - box.x, dy: e.clientY - box.y }
    document.body.style.userSelect = 'none'
    setInteracting(true)
    e.preventDefault()
  }, [box.x, box.y, isFullscreen])

  const startResize = useCallback((e) => {
    resize.current = { startX: e.clientX, startY: e.clientY, startW: box.w, startH: box.h }
    document.body.style.userSelect = 'none'
    setInteracting(true)
    e.preventDefault(); e.stopPropagation()
  }, [box.w, box.h])

  const setPreset = (k) => setBox(b => clampBox({ ...b, w: PRESETS[k][0], h: PRESETS[k][1] }))

  const confirmEnd = async (rejoinMins) => {
    setEnding(true)
    try { await endCall(rejoinMins); setShowEnd(false) }
    finally { setEnding(false) }
  }

  const onTransferred = (name) => {
    setShowTransfer(false)
    // Hand-off complete — leave the call WITHOUT ending the session (the new
    // doctor takes over the same room).
    dismissCall()
    alert(`Patient transferred to ${name}. They can now join from their telehealth desk.`)
  }

  if (!activeCall) return null

  const callUrl = activeCall.provider === 'daily.co' && activeCall.token
    ? `${activeCall.url.split('?')[0]}?t=${activeCall.token}&showLeaveButton=false&showFullscreenButton=false`
    : activeCall.url

  const windowEndsAt = activeCall.windowEndsAt
    ? new Date(activeCall.windowEndsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null
  const patientName = activeCall.appt?.patient_name || 'Live Consultation'

  const VideoFrame = ({ className }) => (
    callUrl ? (
      <iframe src={callUrl}
        allow="camera; microphone; fullscreen; speaker; display-capture; autoplay; clipboard-read; clipboard-write"
        allowFullScreen
        className={className}
        style={{ border: 'none', display: 'block', pointerEvents: interacting ? 'none' : 'auto' }}
        title="Telehealth consultation" />
    ) : (
      <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-2">
        <Video size={22} className="opacity-40" />
        <span className="text-xs">Connecting…</span>
      </div>
    )
  )

  const FormsPanel = ({ dark }) => (
    <div className={`h-full overflow-y-auto p-3 space-y-1.5 ${dark ? '' : ''}`} style={{ background: dark ? '#0f172a' : '#0f172a' }}>
      <p className="text-[11px] text-gray-400 mb-2">Quick forms — opens in the chart for this patient.</p>
      {favForms.length === 0 && <p className="text-xs text-gray-500 mb-2">No favourited forms yet. Star forms in the Forms Library to pin them here.</p>}
      {favForms.map(form => (
        <button key={form.id}
          onClick={() => navigate(`/forms/fill/${form.id}${activeCall.appointmentId ? `?appointment_id=${activeCall.appointmentId}` : ''}`)}
          className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors">
          <FileText size={13} className="text-blue-400 flex-shrink-0" />
          <span className="text-xs text-gray-200 truncate">{form.name}</span>
        </button>
      ))}
      <button onClick={() => navigate('/forms')} className="w-full text-xs text-blue-400 hover:text-blue-300 mt-1 text-left px-1">Browse all forms →</button>
    </div>
  )

  // ── Fullscreen ───────────────────────────────────────────────────────────────
  if (isFullscreen) {
    return (
      <>
        <div className="fixed inset-0 z-[1000] flex flex-col bg-gray-950">
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-900 border-b border-white/10 flex-shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-white text-xs font-bold">LIVE</span>
            <span className="text-gray-300 text-xs">{patientName}</span>
            <span className="font-mono text-xs text-gray-400">{duration}</span>
            {windowEndsAt && <span className="text-gray-500 text-xs hidden sm:block">Closes {windowEndsAt}</span>}
            <div className="flex gap-1 ml-4">
              {[{ id: 'video', label: '🎥 Video' }, { id: 'forms', label: '📝 Forms' }].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${activeTab === t.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>{t.label}</button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => { setFull(false); navigate(`/encounter/${activeCall.appointmentId}`) }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-600"><FileText size={12} /> Document</button>
              <button onClick={() => setShowTransfer(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-gray-200 hover:bg-white/20 text-xs"><UserCheck size={12} /> Transfer</button>
              <button onClick={() => setFull(false)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20 text-xs"><Minimize2 size={12} /> Exit</button>
              <button onClick={() => setShowEnd(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold"><PhoneOff size={12} /> End</button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {activeTab === 'video' ? <VideoFrame className="w-full h-full" /> : <FormsPanel dark />}
          </div>
        </div>
        {showEnd && <EndModal onConfirm={confirmEnd} onCancel={() => setShowEnd(false)} ending={ending} />}
        {showTransfer && <TransferDoctorModal appointmentId={activeCall.appointmentId} currentDoctorId={null} patientName={patientName} onTransferred={onTransferred} onCancel={() => setShowTransfer(false)} />}
      </>
    )
  }

  // ── Floating window ───────────────────────────────────────────────────────────
  const showTabs = !minimized && box.w >= 380
  return (
    <>
      <div className="fixed z-[1000] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-gray-700"
        style={{
          left: box.x, top: box.y,
          width: minimized ? 250 : box.w,
          height: minimized ? BAR_H : box.h,
          background: '#111827',
        }}>
        {/* Title bar / drag handle */}
        <div onMouseDown={startDrag}
          className="flex items-center gap-2 px-3 bg-gray-800 border-b border-white/10 flex-shrink-0 cursor-grab active:cursor-grabbing"
          style={{ height: BAR_H }}>
          <Move size={11} className="text-gray-600 flex-shrink-0" />
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-white text-xs font-semibold truncate flex-1">{patientName}</span>
          <span className="font-mono text-[11px] text-gray-400 flex-shrink-0">{duration}</span>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {!minimized && Object.keys(PRESETS).map(k => (
              <button key={k} onClick={() => setPreset(k)}
                title={`${k === 'S' ? 'Small' : k === 'M' ? 'Medium' : 'Large'}`}
                className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center text-gray-400 hover:bg-gray-700 hover:text-white">{k}</button>
            ))}
            {!minimized && (
              <button onClick={() => setFull(true)} title="Fullscreen"
                className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:bg-gray-700 hover:text-white"><Maximize2 size={10} /></button>
            )}
            {!minimized && (
              <button onClick={() => setShowTransfer(true)} title="Transfer to another doctor"
                className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:bg-amber-600 hover:text-white"><UserCheck size={11} /></button>
            )}
            {!minimized && (
              <button onClick={() => navigate(`/encounter/${activeCall.appointmentId}`)} title="Open chart to document / order / prescribe"
                className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:bg-blue-700 hover:text-white"><FileText size={11} /></button>
            )}
            <button onClick={() => setMinimized(v => !v)} title={minimized ? 'Expand' : 'Minimize'}
              className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:bg-gray-700 hover:text-white">
              {minimized ? <Maximize2 size={10} /> : <Minimize2 size={10} />}
            </button>
            <button onClick={() => setShowEnd(true)} title="End call"
              className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:bg-red-600 hover:text-white"><PhoneOff size={10} /></button>
          </div>
        </div>

        {/* Tabs (only when wide enough) */}
        {showTabs && (
          <div className="flex border-b border-white/10 flex-shrink-0" style={{ background: '#1a2035' }}>
            {[{ id: 'video', label: '🎥 Video' }, { id: 'forms', label: '📝 Forms' }].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-4 py-1.5 text-xs font-semibold transition-colors ${activeTab === t.id ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-200'}`}>{t.label}</button>
            ))}
          </div>
        )}

        {/* Content */}
        {!minimized && (
          <div className="flex-1 min-h-0 overflow-hidden relative">
            {(!showTabs || activeTab === 'video') ? <VideoFrame className="w-full h-full" /> : <FormsPanel dark />}

            {/* Resize grip (bottom-right) */}
            <div onMouseDown={startResize} title="Drag to resize"
              className="absolute bottom-0 right-0 w-5 h-5 flex items-end justify-end cursor-nwse-resize text-gray-500 hover:text-white z-10"
              style={{ touchAction: 'none' }}>
              <GripVertical size={13} className="rotate-45 -mb-0.5 -mr-0.5" />
            </div>
          </div>
        )}
      </div>

      {showEnd && <EndModal onConfirm={confirmEnd} onCancel={() => setShowEnd(false)} ending={ending} />}
      {showTransfer && <TransferDoctorModal appointmentId={activeCall.appointmentId} currentDoctorId={null} patientName={patientName} onTransferred={onTransferred} onCancel={() => setShowTransfer(false)} />}
    </>
  )
}
