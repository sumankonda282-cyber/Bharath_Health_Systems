import { useEffect, useState } from 'react'
import {
  Loader2, Send, ChevronDown, ChevronUp, Mail, CheckCircle, XCircle, MessageCircle,
} from 'lucide-react'
import api from '../../api/client'

function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export default function PublishLog() {
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    api.get('/scheduler/publish-log')
      .then(setLogs)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-gray-300" /></div>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-gray-800">Publish Log</h1>
        <p className="text-sm text-gray-500">
          History of published schedules and who was notified
          <span className="ml-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
            <MessageCircle size={11} />WhatsApp delivery — coming soon
          </span>
        </p>
      </div>

      {error && <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

      {logs.length === 0 ? (
        <div className="card p-10 text-center">
          <Send size={36} className="mx-auto text-gray-300 mb-3" />
          <div className="font-bold text-gray-700">Nothing published yet</div>
          <p className="text-sm text-gray-500 mt-1">When you publish a week from the Schedule Board, it appears here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log.id} className="card overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#0F255715' }}>
                    <Send size={15} style={{ color: '#0F2557' }} />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-800 text-sm">
                      Week {fmtDate(log.week_start)} – {fmtDate(log.week_end)} · {log.group_name}
                    </div>
                    <div className="text-xs text-gray-400">
                      Published by {log.published_by || '—'} · {fmtDateTime(log.published_at)} · {log.recipients.length} staff notified
                    </div>
                  </div>
                </div>
                {expanded === log.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>

              {expanded === log.id && (
                <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                  <div className="space-y-1.5">
                    {log.recipients.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {r.sent
                          ? <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                          : <XCircle size={14} className="text-gray-300 flex-shrink-0" />}
                        <span className="font-medium text-gray-700">{r.name}</span>
                        {r.email
                          ? <span className="text-xs text-gray-400 flex items-center gap-1"><Mail size={11} />{r.email}</span>
                          : <span className="text-xs text-amber-600">No email registered</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
