import { useState, useEffect } from 'react'
import api from '../api/client'
import { FlaskConical, ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from 'lucide-react'

const STATUS_BADGE = {
  ordered: 'badge-yellow', sample_collected: 'badge-blue',
  processing: 'badge-blue', completed: 'badge-green', cancelled: 'badge-gray',
}

export default function LabResults() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    api.get('/portal/lab-results')
      .then(r => setOrders(r.data?.lab_orders || r.data || []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-extrabold" style={{ color: '#0F2557' }}>Lab Results</h1>

      {loading ? (
        <div className="card p-10 text-center text-gray-400 text-sm">Loading…</div>
      ) : orders.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <FlaskConical size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No lab orders on record</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.id} className="card overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: '#EEF2FF' }}>
                    <FlaskConical size={18} style={{ color: '#0F2557' }} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-gray-900">Lab Order #{order.id}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {order.date} · {order.items?.length || 0} test{order.items?.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={STATUS_BADGE[order.status] || 'badge-gray'}>{order.status?.replace(/_/g,' ')}</span>
                  {expanded === order.id ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
                </div>
              </button>

              {expanded === order.id && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50">
                  {(order.items || []).length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-2">Results pending…</p>
                  ) : (
                    <div className="space-y-2">
                      {(order.items || []).map((item, i) => (
                        <div key={i}
                          className={`flex items-center justify-between p-3 rounded-xl border ${item.is_abnormal ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
                          <div>
                            <div className="font-semibold text-sm text-gray-900">{item.test_name || item.name}</div>
                            {item.result_value && (
                              <div className={`text-sm mt-0.5 font-mono font-bold ${item.is_abnormal ? 'text-red-700' : 'text-gray-700'}`}>
                                {item.result_value}
                              </div>
                            )}
                            {item.result_notes && <div className="text-xs text-gray-400 mt-0.5">{item.result_notes}</div>}
                          </div>
                          {item.is_abnormal ? (
                            <div className="flex items-center gap-1 text-red-600 text-xs font-semibold">
                              <AlertTriangle size={14} /> Abnormal
                            </div>
                          ) : item.result_value ? (
                            <CheckCircle size={16} className="text-green-500" />
                          ) : (
                            <span className="badge-yellow">Pending</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
