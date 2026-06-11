import { useEffect, useState, useCallback } from 'react'
import {
  Loader2, Plane, Check, X, Plus, CalendarRange,
} from 'lucide-react'
import api from '../../api/client'

const LEAVE_TYPES = [
  { value: 'casual', label: 'Casual',  color: '#0F2557' },
  { value: 'sick',   label: 'Sick',    color: '#CC1414' },
  { value: 'pto',    label: 'PTO',     color: '#F5821E' },
  { value: 'earned', label: 'Earned',  color: '#065F46' },
]

const typeColor = t => LEAVE_TYPES.find(x => x.value === t)?.color || '#6b7280'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function days(from, to) {
  return Math.round((new Date(to) - new Date(from)) / 86400000) + 1
}

export default function Leaves() {
  const [tab, setTab]         = useState('pending')   // pending | all | balances
  const [leaves, setLeaves]   = useState([])
  const [balances, setBalances] = useState([])
  const [staff, setStaff]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [fileOpen, setFileOpen] = useState(false)

  const fetchAll = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get('/scheduler/leaves'),
      api.get('/scheduler/leaves/balances'),
      api.get('/scheduler/staff'),
    ])
      .then(([l, b, s]) => { setLeaves(l); setBalances(b); setStaff(s) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const decide = async (id, status) => {
    try {
      await api.patch(`/scheduler/leaves/${id}`, { status })
      fetchAll()
    } catch (e) {
      setError(e?.response?.data?.detail || e.message)
    }
  }

  const pending = leaves.filter(l => l.status === 'pending')
  const shown = tab === 'pending' ? pending : leaves

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-gray-300" /></div>
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-gray-800">Leaves & PTO</h1>
          <p className="text-sm text-gray-500">Approve requests, track balances — approved leave automatically blocks the schedule board</p>
        </div>
        <button onClick={() => setFileOpen(true)} className="btn-primary btn-sm">
          <Plus size={13} />File Leave for Staff
        </button>
      </div>

      {error && <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {[
          ['pending', `Pending${pending.length ? ` (${pending.length})` : ''}`],
          ['all', 'All Requests'],
          ['balances', 'Balances'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === key ? 'text-white' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
            }`}
            style={tab === key ? { background: '#0F2557' } : {}}
          >
            {label}
          </button>
        ))}
      </div>

      {tab !== 'balances' ? (
        shown.length === 0 ? (
          <div className="card p-10 text-center">
            <Plane size={36} className="mx-auto text-gray-300 mb-3" />
            <div className="font-bold text-gray-700">
              {tab === 'pending' ? 'No pending requests' : 'No leave requests yet'}
            </div>
          </div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Days</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(l => (
                  <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{l.staff_name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ background: typeColor(l.leave_type) }}>
                        {l.leave_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="flex items-center gap-1">
                        <CalendarRange size={13} className="text-gray-300" />
                        {fmtDate(l.from_date)} → {fmtDate(l.to_date)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{days(l.from_date, l.to_date)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[180px] truncate" title={l.reason}>{l.reason || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        l.status === 'approved' ? 'bg-emerald-100 text-emerald-700'
                          : l.status === 'rejected' ? 'bg-red-100 text-red-600'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {l.status === 'pending' && (
                        <div className="flex gap-1.5 justify-end">
                          <button onClick={() => decide(l.id, 'approved')} className="btn-success btn-sm" title="Approve">
                            <Check size={13} />
                          </button>
                          <button onClick={() => decide(l.id, 'rejected')} className="btn-danger btn-sm" title="Reject">
                            <X size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* Balances tab */
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3">Staff</th>
                {LEAVE_TYPES.map(t => (
                  <th key={t.value} className="px-4 py-3 text-center">{t.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {balances.map(b => (
                <tr key={b.staff_id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800">{b.full_name}</div>
                    <div className="text-xs text-gray-400">{(b.role || '').replace(/_/g, ' ')}</div>
                  </td>
                  {LEAVE_TYPES.map(t => {
                    const quota = b.quotas?.[t.value] ?? 0
                    const used = b.used?.[t.value] ?? 0
                    const left = quota - used
                    return (
                      <td key={t.value} className="px-4 py-3 text-center">
                        <span className={`font-bold ${left <= 0 ? 'text-red-600' : left <= 3 ? 'text-amber-600' : 'text-gray-700'}`}>
                          {left}
                        </span>
                        <span className="text-xs text-gray-400"> / {quota}</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {fileOpen && (
        <FileLeaveModal
          staff={staff}
          onClose={() => setFileOpen(false)}
          onSaved={() => { setFileOpen(false); fetchAll() }}
        />
      )}
    </div>
  )
}

function FileLeaveModal({ staff, onClose, onSaved }) {
  const [form, setForm] = useState({
    staff_id: '', leave_type: 'casual',
    from_date: new Date().toISOString().slice(0, 10),
    to_date: new Date().toISOString().slice(0, 10),
    reason: '', auto_approve: true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    if (!form.staff_id) { setError('Select a staff member'); return }
    setSaving(true)
    setError('')
    try {
      await api.post('/scheduler/leaves', { ...form, staff_id: Number(form.staff_id) })
      onSaved()
    } catch (e) {
      setError(e?.response?.data?.detail || e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm z-10 p-6">
        <h3 className="font-bold text-gray-800 mb-1">File Leave for Staff</h3>
        <p className="text-xs text-gray-500 mb-4">For phone or in-person requests — auto-approved by default</p>

        <label className="text-xs font-semibold text-gray-500 block mb-1">Staff member</label>
        <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none"
          value={form.staff_id} onChange={e => setForm(f => ({ ...f, staff_id: e.target.value }))}>
          <option value="">Select staff…</option>
          {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>

        <label className="text-xs font-semibold text-gray-500 block mb-1">Leave type</label>
        <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none"
          value={form.leave_type} onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))}>
          {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">From</label>
            <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
              value={form.from_date} onChange={e => setForm(f => ({ ...f, from_date: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">To</label>
            <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
              value={form.to_date} min={form.from_date} onChange={e => setForm(f => ({ ...f, to_date: e.target.value }))} />
          </div>
        </div>

        <label className="text-xs font-semibold text-gray-500 block mb-1">Reason (optional)</label>
        <input className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none"
          placeholder="e.g. family function" value={form.reason}
          onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />

        <label className="flex items-center gap-2 text-sm text-gray-600 mb-4 cursor-pointer">
          <input type="checkbox" checked={form.auto_approve}
            onChange={e => setForm(f => ({ ...f, auto_approve: e.target.checked }))} className="rounded" />
          Approve immediately
        </label>

        {error && <p className="text-red-600 text-xs mb-3">{error}</p>}

        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plane size={14} />}File Leave
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  )
}
