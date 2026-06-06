import { useState, useEffect } from 'react'
import api from '../api/client'
import { cachedFetch } from '../utils/cache'
import { Pill, ChevronDown, ChevronUp } from 'lucide-react'

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    cachedFetch(
      'prescriptions',
      () => api.get('/portal/prescriptions'),
      r => { setPrescriptions(r.data?.prescriptions || r.data || r?.prescriptions || []); setLoading(false) }
    ).catch(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-extrabold" style={{ color: '#0F2557' }}>My Prescriptions</h1>

      {loading ? (
        <div className="card p-10 text-center text-gray-400 text-sm">Loading…</div>
      ) : prescriptions.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Pill size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No prescriptions on record</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map(rx => (
            <div key={rx.id} className="card overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(expanded === rx.id ? null : rx.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: '#FFF7ED' }}>
                    <Pill size={18} style={{ color: '#F5821E' }} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-gray-900">Prescription #{rx.id}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {rx.date} · {rx.items?.length || 0} medicine{rx.items?.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={rx.status === 'dispensed' ? 'badge-green' : 'badge-yellow'}>
                    {rx.status === 'dispensed' ? 'Dispensed' : 'Pending'}
                  </span>
                  {expanded === rx.id ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                </div>
              </button>

              {expanded === rx.id && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50">
                  {(rx.items || []).length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-2">No items recorded.</p>
                  ) : (
                    <div className="space-y-2">
                      {(rx.items || []).map((item, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-orange-100">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: '#FFF7ED' }}>
                            <Pill size={14} style={{ color: '#F5821E' }} />
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-gray-900">{item.medicine_name || item.medicine}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {[item.dosage, item.frequency, item.duration].filter(Boolean).join(' · ')}
                            </div>
                            {item.instructions && <div className="text-xs text-gray-400 mt-0.5 italic">{item.instructions}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {rx.notes && <div className="text-xs text-gray-500 italic mt-3 px-1">Note: {rx.notes}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
