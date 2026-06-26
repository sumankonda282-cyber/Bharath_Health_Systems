import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { cachedFetch, cacheInvalidate, TTL } from '../utils/cache'
import { Plus, Search, Package, Loader2, AlertTriangle, Pencil, X, Layers, ClipboardEdit } from 'lucide-react'

// ── Batch Panel ──────────────────────────────────────────────────────────────

function BatchPanel({ med, onClose }) {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/pharmacy/medicines/${med.id}/batches`)
      .then(r => setBatches(Array.isArray(r) ? r : []))
      .finally(() => setLoading(false))
  }, [med.id])

  function expiryDays(expiry) {
    if (!expiry) return null
    return Math.floor((new Date(expiry) - new Date()) / 86400000)
  }

  function batchColor(expiry) {
    const days = expiryDays(expiry)
    if (days === null) return ''
    if (days < 0)   return 'bg-red-50 border-red-300'
    if (days <= 30) return 'bg-orange-50 border-orange-300'
    if (days <= 60) return 'bg-yellow-50 border-yellow-300'
    return 'bg-green-50 border-green-200'
  }

  function batchBadge(expiry) {
    const days = expiryDays(expiry)
    if (days === null) return null
    if (days < 0)   return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Expired</span>
    if (days <= 30) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">⚠ {days}d left</span>
    if (days <= 60) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">{days}d left</span>
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">OK</span>
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-[#0F2557]">{med.name}</h3>
            <p className="text-xs text-gray-500">Batch-wise Stock</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-gray-400" /></div>
        ) : batches.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Layers size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No batch records found.</p>
            <p className="text-xs mt-1">Use Purchase Orders to receive stock with batch tracking.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {batches.map(b => (
              <div key={b.id} className={`border rounded-xl p-3 ${batchColor(b.expiry_date)}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-sm">{b.batch_number || <span className="text-gray-400">No batch #</span>}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Qty: <strong>{b.quantity}</strong>
                      {b.unit_cost && <span className="ml-2">Cost: ₹{Number(b.unit_cost).toFixed(2)}</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Expiry: {b.expiry_date ? new Date(b.expiry_date).toLocaleDateString('en-IN') : '—'}
                    </div>
                  </div>
                  {batchBadge(b.expiry_date)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const SCHEDULE_OPTS = ['', 'OTC', 'H', 'H1', 'X']
const GST_OPTS = ['', '0', '5', '12']

const EMPTY_FORM = {
  name: '', generic_name: '', category: '', form: 'tablet',
  strength: '', manufacturer: '',
  stock_quantity: 0, reorder_level: 10, unit_price: 0,
  hsn_code: '', schedule: '', gst_rate: '', mrp: '',
}

function scheduleBadge(schedule) {
  if (!schedule || schedule === 'OTC') return null
  return (
    <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
      {schedule}
    </span>
  )
}

export default function Inventory() {
  const [medicines, setMedicines] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [batchTarget, setBatchTarget] = useState(null)
  const branchId = localStorage.getItem('branch_id')

  const load = useCallback(() => {
    setLoading(true)
    if (!search) {
      const params = { limit: 200, ...(branchId ? { branch_id: branchId } : {}) }
      cachedFetch(
        'pharmacy_inventory',
        () => api.get('/pharmacy/medicines', { params }),
        r => { setMedicines(Array.isArray(r) ? r : []); setLoading(false) },
        TTL.MEDIUM
      ).catch(() => setLoading(false))
    } else {
      const params = { limit: 200, search, ...(branchId ? { branch_id: branchId } : {}) }
      api.get('/pharmacy/medicines', { params })
        .then(r => setMedicines(Array.isArray(r) ? r : []))
        .finally(() => setLoading(false))
    }
  }, [search, branchId])

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [load])

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditTarget(null)
    setErr('')
    setShowAdd(true)
  }

  function openEdit(med) {
    setForm({
      name: med.name || '',
      generic_name: med.generic_name || '',
      category: med.category || '',
      form: med.form || 'tablet',
      strength: med.strength || '',
      manufacturer: med.manufacturer || '',
      stock_quantity: med.stock_quantity || 0,
      reorder_level: med.reorder_level || 10,
      unit_price: med.unit_price || 0,
      hsn_code: med.hsn_code || '',
      schedule: med.schedule || '',
      gst_rate: med.gst_rate != null ? String(med.gst_rate) : '',
      mrp: med.mrp || '',
    })
    setEditTarget(med)
    setErr('')
    setShowAdd(true)
  }

  const saveMed = async e => {
    e.preventDefault()
    setSaving(true)
    setErr('')
    try {
      const payload = {
        ...form,
        stock_quantity: Number(form.stock_quantity),
        reorder_level: Number(form.reorder_level),
        unit_price: Number(form.unit_price),
        mrp: form.mrp !== '' ? Number(form.mrp) : null,
        gst_rate: form.gst_rate !== '' ? Number(form.gst_rate) : null,
        hsn_code: form.hsn_code || null,
        schedule: form.schedule || null,
      }
      if (editTarget) {
        await api.put(`/pharmacy/medicines/${editTarget.id}`, payload)
      } else {
        await api.post('/pharmacy/medicines', payload, { params: { branch_id: branchId || 1 } })
      }
      await cacheInvalidate('pharmacy_inventory')
      setShowAdd(false)
      load()
    } catch (ex) {
      setErr(ex.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async med => {
    try {
      await api.put(`/pharmacy/medicines/${med.id}`, { is_active: !med.is_active })
      load()
    } catch (ex) {
      alert(ex.message)
    }
  }

  const lowStock = medicines.filter(m => (m.stock_quantity || 0) <= (m.reorder_level || 10))

  return (
    <div>
      {batchTarget && <BatchPanel med={batchTarget} onClose={() => setBatchTarget(null)} />}
      <div className="page-header">
        <button onClick={openAdd} className="btn-primary"><Plus size={16} />Add Medicine</button>
      </div>

      {lowStock.length > 0 && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-2 text-amber-800 text-sm">
          <AlertTriangle size={16} />
          <span><strong>{lowStock.length}</strong> medicines are running low on stock</span>
        </div>
      )}

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Search medicines…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#0F2557]">{editTarget ? 'Edit Medicine' : 'Add Medicine'}</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={saveMed} className="space-y-3">
              <div>
                <label className="label">Name *</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Generic Name</label>
                <input className="input" value={form.generic_name} onChange={e => setForm(f => ({ ...f, generic_name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Form</label>
                  <select className="input" value={form.form} onChange={e => setForm(f => ({ ...f, form: e.target.value }))}>
                    <option value="tablet">Tablet</option>
                    <option value="capsule">Capsule</option>
                    <option value="syrup">Syrup (ml)</option>
                    <option value="injection">Injection</option>
                    <option value="cream">Cream (g)</option>
                    <option value="drops">Drops</option>
                  </select>
                </div>
                <div>
                  <label className="label">Category</label>
                  <input className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Antibiotic" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Strength</label>
                  <input className="input" value={form.strength} onChange={e => setForm(f => ({ ...f, strength: e.target.value }))} placeholder="e.g. 500mg" />
                </div>
                <div>
                  <label className="label">Manufacturer</label>
                  <input className="input" value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Stock Qty</label>
                  <input type="number" className="input" min="0" value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Reorder At</label>
                  <input type="number" className="input" min="0" value={form.reorder_level} onChange={e => setForm(f => ({ ...f, reorder_level: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Unit Price ₹</label>
                  <input type="number" className="input" min="0" step="0.01" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} />
                </div>
              </div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-1">Optional GST &amp; Regulatory Fields</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">MRP ₹ <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <input type="number" className="input" min="0" step="0.01" value={form.mrp} onChange={e => setForm(f => ({ ...f, mrp: e.target.value }))} placeholder="Max Retail Price" />
                </div>
                <div>
                  <label className="label">HSN Code <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <input className="input" maxLength={8} value={form.hsn_code} onChange={e => setForm(f => ({ ...f, hsn_code: e.target.value }))} placeholder="e.g. 30049099" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Schedule <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <select className="input" value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}>
                    {SCHEDULE_OPTS.map(o => <option key={o} value={o}>{o || '— None —'}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">GST Rate % <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <select className="input" value={form.gst_rate} onChange={e => setForm(f => ({ ...f, gst_rate: e.target.value }))}>
                    {GST_OPTS.map(o => <option key={o} value={o}>{o === '' ? '— None —' : `${o}%`}</option>)}
                  </select>
                </div>
              </div>
              {err && <p className="text-red-600 text-sm">{err}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading
          ? <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-gray-400" /></div>
          : medicines.length === 0
          ? <div className="p-10 text-center text-gray-400"><Package size={32} className="mx-auto mb-2 opacity-30" /><p>No medicines found</p></div>
          : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th className="th">Medicine</th>
                    <th className="th">Generic</th>
                    <th className="th">Form</th>
                    <th className="th">Stock</th>
                    <th className="th">Price</th>
                    <th className="th">MRP</th>
                    <th className="th">GST</th>
                    <th className="th">Status</th>
                    <th className="th">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {medicines.map(m => (
                    <tr key={m.id} className="tr-hover">
                      <td className="td font-medium">
                        {m.name}{scheduleBadge(m.schedule)}
                      </td>
                      <td className="td text-gray-500 text-xs">{m.generic_name || '—'}</td>
                      <td className="td capitalize text-gray-500">{m.form || '—'}</td>
                      <td className="td font-semibold">{m.stock_quantity ?? '—'}</td>
                      <td className="td">₹{m.unit_price || '—'}</td>
                      <td className="td text-gray-500">{m.mrp ? `₹${m.mrp}` : '—'}</td>
                      <td className="td text-gray-500">{m.gst_rate != null ? `${m.gst_rate}%` : '—'}</td>
                      <td className="td">
                        <span className={`badge ${(m.stock_quantity || 0) <= 0 ? 'badge-red' : (m.stock_quantity || 0) <= (m.reorder_level || 10) ? 'badge-yellow' : 'badge-green'}`}>
                          {(m.stock_quantity || 0) <= 0 ? 'Out of Stock' : (m.stock_quantity || 0) <= (m.reorder_level || 10) ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/stock-adjustment?medicine_id=${m.id}&medicine_name=${encodeURIComponent(m.name)}`}
                            className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-600 transition-colors"
                            title="Adjust Stock"
                          >
                            <ClipboardEdit size={14} />
                          </Link>
                          <button
                            onClick={() => openEdit(m)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setBatchTarget(m)}
                            className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600 transition-colors"
                            title="View Batches"
                          >
                            <Layers size={14} />
                          </button>
                          <button
                            onClick={() => toggleActive(m)}
                            className={`text-xs px-2 py-1 rounded-lg border transition-colors ${m.is_active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                          >
                            {m.is_active ? 'Deactivate' : 'Reactivate'}
                          </button>
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
