import { useEffect, useState, useCallback } from 'react'
import {
  Loader2, LayoutTemplate, Trash2, Play, CheckCircle, AlertTriangle,
} from 'lucide-react'
import api from '../../api/client'

function mondayOf(d) {
  const x = new Date(d)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x.toISOString().slice(0, 10)
}

const RECURRENCE_LABELS = {
  manual: 'Manual',
  weekly: 'Weekly rotation',
  monthly: 'Monthly rotation',
  permanent: 'Permanent',
}

export default function Patterns() {
  const [patterns, setPatterns] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [applying, setApplying] = useState(null)   // pattern being applied (modal)
  const [toast, setToast]       = useState(null)

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 5000)
  }

  const fetchAll = useCallback(() => {
    api.get('/scheduler/patterns')
      .then(setPatterns)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const deletePattern = async (id) => {
    if (!confirm('Delete this pattern?')) return
    try {
      await api.delete(`/scheduler/patterns/${id}`)
      fetchAll()
    } catch (e) {
      setError(e.message)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-gray-300" /></div>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-gray-800">Saved Patterns</h1>
        <p className="text-sm text-gray-500">
          Reusable week templates — save one from the Schedule Board, then apply it to any week in one click
        </p>
      </div>

      {error && <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

      {patterns.length === 0 ? (
        <div className="card p-10 text-center">
          <LayoutTemplate size={36} className="mx-auto text-gray-300 mb-3" />
          <div className="font-bold text-gray-700">No patterns saved yet</div>
          <p className="text-sm text-gray-500 mt-1">
            Build a week on the Schedule Board, then click "Save as Pattern"
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {patterns.map(p => (
            <div key={p.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#0F255715' }}>
                  <LayoutTemplate size={18} style={{ color: '#0F2557' }} />
                </div>
                <button onClick={() => deletePattern(p.id)} className="text-gray-300 hover:text-red-500">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="font-bold text-gray-800 mt-3">{p.name}</div>
              <div className="text-xs text-gray-500 mt-1">
                {p.group_name} · {p.entry_count} shifts ·{' '}
                <span className="font-semibold" style={{ color: p.recurrence !== 'manual' ? '#F5821E' : undefined }}>
                  {RECURRENCE_LABELS[p.recurrence] || p.recurrence}
                </span>
              </div>
              <button onClick={() => setApplying(p)} className="btn-primary btn-sm w-full justify-center mt-4">
                <Play size={13} />Apply to a Week
              </button>
            </div>
          ))}
        </div>
      )}

      {applying && (
        <ApplyModal
          pattern={applying}
          onClose={() => setApplying(null)}
          onApplied={(r) => {
            setApplying(null)
            showToast(
              `Created ${r.created} shifts${r.skipped.length ? ` — ${r.skipped.length} skipped (conflicts)` : ''}`,
              r.created ? 'ok' : 'err',
            )
          }}
        />
      )}

      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${
          toast.type === 'err' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {toast.type === 'err' ? <AlertTriangle size={15} /> : <CheckCircle size={15} />}
          {toast.msg}
        </div>
      )}
    </div>
  )
}

function ApplyModal({ pattern, onClose, onApplied }) {
  const [weekStart, setWeekStart] = useState(() => {
    const next = new Date()
    next.setDate(next.getDate() + 7)
    return mondayOf(next)
  })
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')

  const apply = async () => {
    setApplying(true)
    setError('')
    try {
      const r = await api.post(`/scheduler/patterns/${pattern.id}/apply`, { week_start: weekStart })
      onApplied(r)
    } catch (e) {
      setError(e?.response?.data?.detail || e.message)
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm z-10 p-6">
        <h3 className="font-bold text-gray-800 mb-1">Apply "{pattern.name}"</h3>
        <p className="text-xs text-gray-500 mb-4">
          {pattern.entry_count} shifts will be created as drafts. Conflicts (leave, double shifts) are skipped automatically.
        </p>
        <label className="text-xs font-semibold text-gray-500 block mb-1">Week starting (Monday)</label>
        <input
          type="date"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-4 focus:outline-none"
          value={weekStart}
          onChange={e => setWeekStart(mondayOf(new Date(e.target.value)))}
        />
        {error && <p className="text-red-600 text-xs mb-3">{error}</p>}
        <div className="flex gap-2">
          <button onClick={apply} disabled={applying} className="btn-primary flex-1">
            {applying ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}Apply Pattern
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  )
}
