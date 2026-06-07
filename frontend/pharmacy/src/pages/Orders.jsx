import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import {
  Globe, Users, Zap, RefreshCw, Loader2, CheckCircle,
  Clock, Search, Plus, ClipboardList,
} from 'lucide-react'

const SOURCE_BADGE = {
  online:  { label: 'Online',   cls: 'badge-blue'   },
  walkin:  { label: 'Walk-in',  cls: 'badge-gray'   },
  cpoe:    { label: 'CPOE',     cls: 'badge-purple' },
}

const STATUS_BADGE = {
  pending_fill: { label: 'Pending Fill', cls: 'badge-yellow' },
  filling:      { label: 'Filling',      cls: 'badge-purple' },
  ready:        { label: 'Ready',        cls: 'badge-green'  },
  dispensed:    { label: 'Dispensed',    cls: 'badge-gray'   },
  cancelled:    { label: 'Cancelled',    cls: 'badge-red'    },
}

function timeAgo(str) {
  if (!str) return ''
  const mins = Math.floor((Date.now() - new Date(str)) / 60000)
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  return `${h}h ago`
}

export default function Orders() {
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('active')   // active | all | online
  const [search, setSearch]       = useState('')
  const [showAdd, setShowAdd]     = useState(false)
  const [walkinForm, setWalkin]   = useState({ patient_name: '', patient_mobile: '', notes: '' })
  const [saving, setSaving]       = useState(false)

  const load = useCallback(() => {
    const params = {}
    if (filter === 'active') params.status = 'pending_fill'
    else if (filter === 'online') params.status = 'pending_fill'
    api.get('/pharmacy/orders', { params })
      .then(r => setOrders(Array.isArray(r) ? r : []))
      .finally(() => setLoading(false))
  }, [filter])

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t) }, [load])

  const updateStatus = async (id, status) => {
    await api.put(`/pharmacy/orders/${id}/status`, { status })
    load()
  }

  const createWalkin = async () => {
    if (!walkinForm.patient_name.trim()) return
    setSaving(true)
    try {
      await api.post('/pharmacy/orders', { source: 'walkin', ...walkinForm })
      setShowAdd(false)
      setWalkin({ patient_name: '', patient_mobile: '', notes: '' })
      load()
    } finally { setSaving(false) }
  }

  const filtered = orders.filter(o => {
    if (filter === 'online' && o.source !== 'online') return false
    const q = search.toLowerCase()
    if (q && !o.patient_name?.toLowerCase().includes(q) && !o.patient_mobile?.includes(q)) return false
    return true
  })

  const stats = {
    pending: orders.filter(o => o.status === 'pending_fill').length,
    filling: orders.filter(o => o.status === 'filling').length,
    ready:   orders.filter(o => o.status === 'ready').length,
    online:  orders.filter(o => o.source === 'online').length,
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Order Queue</h1>
          <p className="text-sm text-gray-500 mt-0.5">All pending orders — online · walk-in · CPOE</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary"><RefreshCw size={15} /></button>
          <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={16} /> Walk-in Order</button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Pending Fill', value: stats.pending, color: '#F5821E', icon: Clock },
          { label: 'Filling Now',  value: stats.filling, color: '#7c3aed', icon: ClipboardList },
          { label: 'Ready',        value: stats.ready,   color: '#16a34a', icon: CheckCircle },
          { label: 'Online Rx',    value: stats.online,  color: '#2563eb', icon: Globe },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '18' }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <div className="text-xl font-bold" style={{ color: '#0F2557' }}>{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter + search */}
      <div className="flex flex-wrap gap-3 mb-4">
        {['active', 'online', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            style={filter === f ? { background: '#0F2557' } : {}}>
            {f === 'active' ? 'Active' : f === 'online' ? 'Online Orders' : 'All'}
          </button>
        ))}
        <div className="flex items-center gap-2 ml-auto bg-gray-100 rounded-xl px-3 py-1.5">
          <Search size={14} className="text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search patient name or mobile…"
            className="bg-transparent text-sm outline-none w-48" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-gray-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-14 text-center text-gray-400">
          <CheckCircle size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No orders in queue</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th className="th">Order</th>
                  <th className="th">Patient</th>
                  <th className="th">Source</th>
                  <th className="th">Status</th>
                  <th className="th">Age</th>
                  <th className="th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(o => {
                  const src = SOURCE_BADGE[o.source] || {}
                  const st  = STATUS_BADGE[o.status] || {}
                  return (
                    <tr key={o.id} className="tr-hover">
                      <td className="td font-mono text-xs font-bold" style={{ color: '#0F2557' }}>
                        ORX-{String(o.id).padStart(4, '0')}
                      </td>
                      <td className="td">
                        <div className="font-medium text-gray-800">{o.patient_name || 'Walk-in'}</div>
                        {o.patient_mobile && <div className="text-xs text-gray-400">{o.patient_mobile}</div>}
                        {o.prescription_image_url && (
                          <a href={o.prescription_image_url} target="_blank" rel="noreferrer"
                            className="text-xs text-blue-600 hover:underline">View Rx image</a>
                        )}
                      </td>
                      <td className="td"><span className={`badge ${src.cls}`}>{src.label}</span></td>
                      <td className="td"><span className={`badge ${st.cls}`}>{st.label}</span></td>
                      <td className="td text-xs text-gray-400">{timeAgo(o.created_at)}</td>
                      <td className="td">
                        <div className="flex gap-2 flex-wrap">
                          {o.status === 'pending_fill' && (
                            <button onClick={() => updateStatus(o.id, 'filling')}
                              className="text-xs px-2 py-1 rounded-lg font-medium text-purple-700 bg-purple-100 hover:bg-purple-200">
                              Start Fill
                            </button>
                          )}
                          {o.status === 'filling' && (
                            <button onClick={() => updateStatus(o.id, 'ready')}
                              className="text-xs px-2 py-1 rounded-lg font-medium text-green-700 bg-green-100 hover:bg-green-200">
                              Mark Ready
                            </button>
                          )}
                          {(o.status === 'ready' || o.status === 'filling') && (
                            <Link to={`/pos/${o.id}`}
                              className="text-xs px-2 py-1 rounded-lg font-medium text-white"
                              style={{ background: '#0F2557' }}>
                              Checkout →
                            </Link>
                          )}
                          {o.status === 'pending_fill' && (
                            <button onClick={() => updateStatus(o.id, 'cancelled')}
                              className="text-xs px-2 py-1 rounded-lg font-medium text-red-700 bg-red-50 hover:bg-red-100">
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Walk-in order modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4" style={{ color: '#0F2557' }}>New Walk-in Order</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Patient Name *</label>
                <input className="input" value={walkinForm.patient_name}
                  onChange={e => setWalkin(f => ({ ...f, patient_name: e.target.value }))}
                  placeholder="Full name" />
              </div>
              <div>
                <label className="label">Mobile</label>
                <input className="input" value={walkinForm.patient_mobile}
                  onChange={e => setWalkin(f => ({ ...f, patient_mobile: e.target.value }))}
                  placeholder="10-digit mobile" maxLength={10} />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input resize-none" rows={2} value={walkinForm.notes}
                  onChange={e => setWalkin(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes or prescription details…" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={createWalkin} disabled={saving || !walkinForm.patient_name.trim()}
                className="btn-primary flex-1 justify-center">
                {saving ? 'Creating…' : 'Create Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
