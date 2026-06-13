import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doctorApi } from '../../api'
import { Video, Clock, CheckCircle2, XCircle, Loader2, RefreshCw, AlertTriangle, X, FileText } from 'lucide-react'
import api from '../../api/client'

function todayIST() {
  const d = new Date(new Date().getTime() + 5.5 * 3600000)
  return d.toISOString().slice(0, 10)
}

const STATE_META = {
  scheduled:   { label: 'Scheduled',   color: '#64748b', bg: '#f1f5f9' },
  ready:       { label: 'Waiting',     color: '#d97706', bg: '#fffbeb' },
  in_progress: { label: 'In Progress', color: '#16a34a', bg: '#dcfce7' },
  completed:   { label: 'Completed',   color: '#64748b', bg: '#f1f5f9' },
  expired:     { label: 'Expired',     color: '#dc2626', bg: '#fee2e2' },
}

function StatusBadge({ state }) {
  const m = STATE_META[state] || STATE_META.scheduled
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: m.bg, color: m.color }}
    >
      {state === 'in_progress' && (
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      )}
      {m.label}
    </span>
  )
}

function VideoWidget({ session, onClose }) {
  const navigate = useNavigate()
  const [size, setSize] = useState('small')
  const [activeTab, setActiveTab] = useState('video')

  // Drag state
  const [pos, setPos] = useState({
    x: window.innerWidth - 320,
    y: window.innerHeight - 250,
  })
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  // Favorited forms from localStorage
  const [favForms, setFavForms] = useState([])
  useEffect(() => {
    try {
      setFavForms(JSON.parse(localStorage.getItem('favorited_forms') || '[]'))
    } catch {
      setFavForms([])
    }
  }, [])

  // Document-level mouse move / up for drag
  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return
      setPos({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      })
    }
    const onUp = () => {
      dragging.current = false
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  const handleToolbarMouseDown = (e) => {
    if (size === 'fullscreen') return
    // Ignore clicks on buttons inside toolbar
    if (e.target.closest('button')) return
    dragging.current = true
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    document.body.style.userSelect = 'none'
  }

  const isFullscreen = size === 'fullscreen'

  const containerStyle = isFullscreen
    ? { position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 50 }
    : {
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: size === 'small' ? 288 : 384,
        height: size === 'small' ? 192 : 256,
        zIndex: 50,
      }

  const showTabs = size === 'medium' || size === 'fullscreen'

  const openChart = () => {
    if (session.appt?.id) navigate(`/encounter/${session.appt.id}`)
  }

  return (
    <div
      style={containerStyle}
      className="bg-gray-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-700"
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-gray-800 flex-shrink-0"
        style={{ cursor: isFullscreen ? 'default' : 'grab' }}
        onMouseDown={handleToolbarMouseDown}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-gray-300 font-medium truncate max-w-40">
            {session.appt?.patient_name || 'Telehealth Call'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Size toggles */}
          {[
            { key: 'small', label: 'S' },
            { key: 'medium', label: 'M' },
            { key: 'fullscreen', label: '⛶' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSize(key)}
              title={key}
              className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center transition-colors ${
                size === key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}

          {/* Chart button */}
          <button
            onClick={openChart}
            title="Open Patient Chart"
            className="w-6 h-6 rounded text-gray-400 hover:bg-blue-700 hover:text-white flex items-center justify-center transition-colors text-xs"
          >
            📋
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-6 h-6 rounded text-gray-400 hover:bg-red-600 hover:text-white flex items-center justify-center ml-1 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Tab row — only for medium / fullscreen */}
      {showTabs && (
        <div className="flex bg-gray-850 border-b border-gray-700 flex-shrink-0" style={{ background: '#1a2035' }}>
          {[
            { id: 'video', label: '🎥 Video' },
            { id: 'forms', label: '📝 Forms' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* Video tab (or always-visible when small) */}
        {(!showTabs || activeTab === 'video') && (
          <>
            {session.url ? (
              <iframe
                src={session.url}
                title="Telehealth Video Call"
                allow="camera; microphone; display-capture; fullscreen"
                className="w-full h-full border-0"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                <Video size={28} className="opacity-40" />
                <span className="text-xs">Video session starting…</span>
              </div>
            )}
          </>
        )}

        {/* Forms tab */}
        {showTabs && activeTab === 'forms' && (
          <div className="h-full overflow-y-auto p-3 space-y-1.5">
            {favForms.length === 0 && (
              <p className="text-xs text-gray-500 mb-2">No favourited forms yet.</p>
            )}
            {favForms.map((form) => (
              <button
                key={form.id}
                onClick={() =>
                  navigate(
                    `/forms/fill/${form.id}${
                      session.appt?.id ? `?appointment_id=${session.appt.id}` : ''
                    }`
                  )
                }
                className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors"
              >
                <FileText size={13} className="text-blue-400 flex-shrink-0" />
                <span className="text-xs text-gray-200 truncate">{form.name}</span>
              </button>
            ))}
            <button
              onClick={() => navigate('/forms')}
              className="w-full text-xs text-blue-400 hover:text-blue-300 mt-2 text-left px-1"
            >
              Browse All →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function TelehealthDesk() {
  const navigate = useNavigate()
  const [appts, setAppts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [joiningId, setJoiningId] = useState(null)
  const [activeSession, setActiveSession] = useState(null) // { url, appt }

  const load = () => {
    setLoading(true)
    api
      .get('/appointments', { params: { appointment_date: todayIST(), limit: 200 } })
      .then((data) => {
        const list = Array.isArray(data) ? data : data.items || data.results || []
        setAppts(list.filter((a) => a.mode === 'telehealth'))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const join = async (appt) => {
    setJoiningId(appt.id)
    try {
      const data = await doctorApi.joinTelehealth(appt.id)
      setActiveSession({ url: data?.url || null, appt })
    } catch (e) {
      alert(e.message || 'Could not join. Check the appointment time window.')
    } finally {
      setJoiningId(null)
    }
  }

  const canJoin = (appt) =>
    ['pending', 'confirmed', 'in_progress'].includes(appt.status)

  return (
    <div>
      {/* Refresh bar */}
      <div className="flex items-center justify-end mb-6">
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-gray-400" />
        </div>
      ) : appts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Video size={40} className="mb-3 opacity-25" />
          <p className="text-sm font-medium text-gray-500">No telehealth appointments today</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Time', 'Patient', 'Doctor', 'Status', 'Join', 'Open Chart'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide border-b border-gray-100"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {appts.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-blue-50/30 transition-colors"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                      <Clock size={13} className="text-gray-400" />
                      {a.appointment_time || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                        {(a.patient_name || 'P')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {a.patient_name || '—'}
                        </div>
                        {a.patient_mobile && (
                          <div className="text-xs text-gray-400">{a.patient_mobile}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-600">
                    {a.doctor_name || a.doctor?.full_name || '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge
                      state={
                        a.telehealth_state ||
                        (a.status === 'in_progress' ? 'in_progress' : 'scheduled')
                      }
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    {canJoin(a) ? (
                      <button
                        onClick={() => join(a)}
                        disabled={joiningId === a.id}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ background: '#0F2557' }}
                      >
                        {joiningId === a.id ? (
                          <>
                            <Loader2 size={14} className="animate-spin" /> Joining…
                          </>
                        ) : (
                          <>
                            <Video size={14} /> Join
                          </>
                        )}
                      </button>
                    ) : a.status === 'completed' ? (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <CheckCircle2 size={14} /> Done
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <XCircle size={14} /> Unavailable
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => navigate(`/encounter/${a.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      <FileText size={13} /> Open Chart
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating draggable video widget */}
      {activeSession && (
        <VideoWidget session={activeSession} onClose={() => setActiveSession(null)} />
      )}
    </div>
  )
}
