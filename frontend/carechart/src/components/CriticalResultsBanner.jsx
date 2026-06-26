import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Check, ChevronDown, ChevronUp } from 'lucide-react'
import api from '../api/client'

const FLAG_LABEL = { HH: 'Critical High', LL: 'Critical Low', C: 'Critical' }

// Ward-level safety banner: surfaces all unacknowledged panic lab values for the
// health center so ward staff are alerted. Hidden entirely when nothing to show.
export default function CriticalResultsBanner() {
  const [alerts, setAlerts] = useState([])
  const [open, setOpen] = useState(false)
  const [acking, setAcking] = useState(null)

  const load = useCallback(() => {
    api.get('/lab/critical-alerts')
      .then(d => setAlerts(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [load])

  const acknowledge = async (id) => {
    setAcking(id)
    try {
      await api.post(`/lab/critical-alerts/${id}/acknowledge`, {})
      setAlerts(a => a.filter(x => x.id !== id))
    } catch { /* keep it visible on failure */ } finally { setAcking(null) }
  }

  if (!alerts.length) return null

  return (
    <div className="border-b border-red-200 bg-red-50">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 px-4 py-2 text-left">
        <AlertTriangle size={16} className="text-red-600 flex-shrink-0" />
        <span className="text-sm font-semibold text-red-700">
          {alerts.length} critical lab result{alerts.length > 1 ? 's' : ''} on the ward
        </span>
        <span className="ml-auto text-red-500">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </button>
      {open && (
        <div className="px-4 pb-2 space-y-1.5">
          {alerts.map(a => (
            <div key={a.id} className="flex items-center gap-3 bg-white border border-red-200 rounded-lg px-3 py-2">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-600 text-white flex-shrink-0">
                {FLAG_LABEL[a.flag] || a.flag}
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-gray-900">{a.patient_name}</span>
                <span className="text-xs text-gray-500 ml-2">{a.test_name}: <b className="text-red-700">{a.value}</b></span>
                {a.order_ref && <span className="text-[10px] text-gray-400 ml-2">{a.order_ref}</span>}
              </div>
              <button
                onClick={() => acknowledge(a.id)}
                disabled={acking === a.id}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-700 border border-emerald-300 hover:bg-emerald-50 rounded px-2 py-1 flex-shrink-0 disabled:opacity-50"
              >
                <Check size={12} /> {acking === a.id ? '…' : 'Acknowledge'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
