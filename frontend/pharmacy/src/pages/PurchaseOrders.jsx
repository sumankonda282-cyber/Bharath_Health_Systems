import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { Plus, ShoppingCart, Loader2, X, Trash2, CheckCircle, Search } from 'lucide-react'

const STATUS_BADGE = {
  draft:     'badge badge-gray',
  sent:      'badge badge-blue',
  received:  'badge badge-green',
  cancelled: 'badge badge-red',
}

function statusLabel(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// ── Create PO Modal ──────────────────────────────────────────────────────────

function CreatePOModal({ suppliers, onClose, onCreated }) {
  const [supplierId, setSupplierId] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([])
  const [medSearch, setMedSearch] = useState('')
  const [medResults, setMedResults] = useState([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!medSearch.trim()) { setMedResults([]); return }
    const t = setTimeout(() => {
      api.get('/pharmacy/medicines/search', { params: { q: medSearch } })
        .then(r => setMedResults(Array.isArray(r) ? r : []))
        .catch(() => setMedResults([]))
    }, 300)
    return () => clearTimeout(t)
  }, [medSearch])

  function addMed(med) {
    if (items.find(i => i.medicine_id === med.id)) return
    setItems(prev => [...prev, {
      medicine_id: med.id,
      medicine_name: med.name,
      quantity_ordered: 1,
      unit_cost: med.unit_price || 0,
    }])
    setMedSearch('')
    setMedResults([])
  }

  function removeItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx, field, value) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const total = items.reduce((s, i) => s + Number(i.quantity_ordered) * Number(i.unit_cost || 0), 0)

  async function submit(e) {
    e.preventDefault()
    if (items.length === 0) { setErr('Add at least one medicine'); return }
    setSaving(true)
    setErr('')
    try {
      const payload = {
        supplier_id: supplierId ? Number(supplierId) : null,
        expected_date: expectedDate || null,
        notes: notes || null,
        items: items.map(i => ({
          medicine_id: i.medicine_id,
          medicine_name: i.medicine_name,
          quantity_ordered: Number(i.quantity_ordered),
          unit_cost: Number(i.unit_cost) || null,
        })),
      }
      await api.post('/pharmacy/purchase-orders', payload)
      onCreated()
    } catch (ex) {
      setErr(ex.message || 'Failed to create PO')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#0F2557]">Create Purchase Order</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Supplier</label>
              <select className="input" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                <option value="">— No supplier —</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Expected Delivery Date</label>
              <input type="date" className="input" value={expectedDate} min={todayStr()} onChange={e => setExpectedDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" placeholder="Optional PO notes" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div>
            <label className="label">Add Medicine</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-9"
                placeholder="Type medicine name…"
                value={medSearch}
                onChange={e => setMedSearch(e.target.value)}
              />
            </div>
            {medResults.length > 0 && (
              <div className="border border-gray-200 rounded-xl overflow-hidden mt-1 shadow-sm">
                {medResults.map(m => (
                  <button
                    key={m.id} type="button"
                    onClick={() => addMed(m)}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex justify-between items-center border-b last:border-0 border-gray-100 text-sm"
                  >
                    <span className="font-medium">{m.name}</span>
                    <span className="text-gray-400">₹{m.unit_price || '—'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b">
                Order Items
              </div>
              <div className="divide-y divide-gray-100">
                {items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center gap-3">
                    <div className="flex-1 text-sm font-medium">{item.medicine_name}</div>
                    <div className="flex items-center gap-2">
                      <div>
                        <label className="label text-xs">Qty</label>
                        <input
                          type="number" className="input py-1 w-20 text-sm" min="1"
                          value={item.quantity_ordered}
                          onChange={e => updateItem(idx, 'quantity_ordered', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="label text-xs">Unit Cost ₹</label>
                        <input
                          type="number" className="input py-1 w-28 text-sm" min="0" step="0.01"
                          value={item.unit_cost}
                          onChange={e => updateItem(idx, 'unit_cost', e.target.value)}
                        />
                      </div>
                      <div className="text-sm font-semibold text-gray-700 mt-5">
                        ₹{(Number(item.quantity_ordered) * Number(item.unit_cost || 0)).toFixed(2)}
                      </div>
                      <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 mt-5">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 bg-gray-50 border-t text-right text-sm font-bold text-[#0F2557]">
                Total: ₹{total.toFixed(2)}
              </div>
            </div>
          )}

          {err && <p className="text-red-600 text-sm">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Creating…' : 'Create PO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Receive GRN Modal ────────────────────────────────────────────────────────

function ReceiveModal({ po, onClose, onReceived }) {
  const [recvItems, setRecvItems] = useState(
    (po.items || []).map(i => ({
      item_id: i.id,
      medicine_name: i.medicine_name,
      quantity_ordered: i.quantity_ordered,
      quantity_received: i.quantity_ordered,
      batch_number: '',
      expiry_date: '',
    }))
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function update(idx, field, value) {
    setRecvItems(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setErr('')
    try {
      await api.post(`/pharmacy/purchase-orders/${po.id}/receive`, {
        items: recvItems.map(r => ({
          item_id: r.item_id,
          quantity_received: Number(r.quantity_received),
          batch_number: r.batch_number || null,
          expiry_date: r.expiry_date || null,
        })),
      })
      onReceived()
    } catch (ex) {
      setErr(ex.message || 'Failed to receive GRN')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-[#0F2557]">Receive GRN</h3>
            <p className="text-xs text-gray-500">{po.po_number} — {po.supplier_name || 'No supplier'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {recvItems.map((r, idx) => (
            <div key={idx} className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="font-medium text-sm text-gray-800">{r.medicine_name}</div>
              <div className="text-xs text-gray-500">Ordered: {r.quantity_ordered}</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Qty Received</label>
                  <input
                    type="number" className="input" min="0" max={r.quantity_ordered}
                    value={r.quantity_received}
                    onChange={e => update(idx, 'quantity_received', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label text-xs">Batch Number</label>
                  <input className="input" placeholder="e.g. BT2024001" value={r.batch_number}
                    onChange={e => update(idx, 'batch_number', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label text-xs">Expiry Date</label>
                <input type="date" className="input" value={r.expiry_date}
                  onChange={e => update(idx, 'expiry_date', e.target.value)} />
              </div>
            </div>
          ))}
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Processing…' : 'Confirm Receipt & Update Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function PurchaseOrders() {
  const [pos, setPos] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [receiveTarget, setReceiveTarget] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params = statusFilter ? { status: statusFilter } : {}
    Promise.all([
      api.get('/pharmacy/purchase-orders', { params }),
      api.get('/pharmacy/suppliers'),
    ])
      .then(([poData, supData]) => {
        setPos(Array.isArray(poData) ? poData : [])
        setSuppliers(Array.isArray(supData) ? supData : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  async function updateStatus(po, status) {
    try {
      await api.put(`/pharmacy/purchase-orders/${po.id}`, { status })
      load()
    } catch (ex) {
      alert(ex.message)
    }
  }

  const STATUSES = ['', 'draft', 'sent', 'received', 'cancelled']

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Purchase Orders</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={16} />New PO
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold border transition-all capitalize ${statusFilter === s ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
            style={statusFilter === s ? { background: '#0F2557' } : {}}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {showCreate && (
        <CreatePOModal
          suppliers={suppliers}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}

      {receiveTarget && (
        <ReceiveModal
          po={receiveTarget}
          onClose={() => setReceiveTarget(null)}
          onReceived={() => { setReceiveTarget(null); load() }}
        />
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-gray-400" />
          </div>
        ) : pos.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
            <p>No purchase orders found</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th className="th">PO Number</th>
                  <th className="th">Supplier</th>
                  <th className="th">Status</th>
                  <th className="th">Expected</th>
                  <th className="th">Total</th>
                  <th className="th">Items</th>
                  <th className="th">Date</th>
                  <th className="th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pos.map(po => (
                  <tr key={po.id} className="tr-hover">
                    <td className="td font-mono text-sm text-[#0F2557] font-semibold">{po.po_number}</td>
                    <td className="td">{po.supplier_name || <span className="text-gray-400">—</span>}</td>
                    <td className="td">
                      <span className={STATUS_BADGE[po.status] || 'badge badge-gray'}>
                        {statusLabel(po.status)}
                      </span>
                    </td>
                    <td className="td text-gray-500 text-xs">
                      {po.expected_date ? new Date(po.expected_date).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="td font-semibold">₹{Number(po.total_amount || 0).toFixed(2)}</td>
                    <td className="td text-gray-500">{(po.items || []).length} items</td>
                    <td className="td text-gray-400 text-xs whitespace-nowrap">
                      {po.created_at ? new Date(po.created_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        {po.status === 'draft' && (
                          <button
                            onClick={() => updateStatus(po, 'sent')}
                            className="text-xs px-2 py-1 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
                          >
                            Mark Sent
                          </button>
                        )}
                        {(po.status === 'draft' || po.status === 'sent') && (
                          <button
                            onClick={() => setReceiveTarget(po)}
                            className="text-xs px-2 py-1 rounded-lg border border-green-200 text-green-600 hover:bg-green-50 flex items-center gap-1"
                          >
                            <CheckCircle size={12} />Receive
                          </button>
                        )}
                        {po.status === 'draft' && (
                          <button
                            onClick={() => updateStatus(po, 'cancelled')}
                            className="text-xs px-2 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
