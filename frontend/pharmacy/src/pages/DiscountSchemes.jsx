import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { Tag, CheckCircle, AlertCircle, RefreshCw, Pencil, X } from 'lucide-react'

const EMPTY = { name: '', scheme_type: 'percentage', discount_value: '', applies_to: 'all', is_active: true }

export default function DiscountSchemes() {
  const [schemes, setSchemes]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [err, setErr]             = useState('')
  const [form, setForm]           = useState(EMPTY)
  const [editing, setEditing]     = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formErr, setFormErr]     = useState('')
  const [success, setSuccess]     = useState('')

  const fetchSchemes = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const r = await api.get('/pharmacy/discount-schemes')
      setSchemes(r.schemes || [])
    } catch { setErr('Failed to load schemes') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchSchemes() }, [fetchSchemes])

  function startEdit(s) {
    setEditing(s.id)
    setForm({ name: s.name, scheme_type: s.scheme_type, discount_value: s.discount_value, applies_to: s.applies_to, is_active: s.is_active })
    setFormErr(''); setSuccess('')
  }

  function cancelEdit() { setEditing(null); setForm(EMPTY) }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormErr(''); setSuccess('')
    if (!form.name.trim()) { setFormErr('Name is required'); return }
    if (!form.discount_value || parseFloat(form.discount_value) <= 0) { setFormErr('Enter a valid discount value'); return }
    setSubmitting(true)
    try {
      const payload = { ...form, discount_value: parseFloat(form.discount_value) }
      if (editing) {
        await api.put(`/pharmacy/discount-schemes/${editing}`, payload)
        setSuccess('Scheme updated')
      } else {
        await api.post('/pharmacy/discount-schemes', payload)
        setSuccess('Scheme created')
      }
      setEditing(null); setForm(EMPTY)
      fetchSchemes()
    } catch (ex) {
      setFormErr(ex.message || 'Failed to save scheme')
    } finally { setSubmitting(false) }
  }

  async function toggleActive(s) {
    try {
      await api.put(`/pharmacy/discount-schemes/${s.id}`, { ...s, is_active: !s.is_active })
      fetchSchemes()
    } catch (e) { alert(e?.response?.data?.detail || 'Could not update the scheme.') }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="page-header mb-6">
        <h1 className="page-title flex items-center gap-2"><Tag className="w-5 h-5" /> Discount Schemes</h1>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="font-semibold text-gray-800 mb-4">{editing ? 'Edit Scheme' : 'New Scheme'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Scheme Name *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Senior Citizen 10%, ESI Scheme" />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.scheme_type} onChange={e => setForm(f => ({ ...f, scheme_type: e.target.value }))}>
                <option value="percentage">Percentage %</option>
                <option value="flat">Flat Amount ₹</option>
              </select>
            </div>
            <div>
              <label className="label">Value *</label>
              <input type="number" className="input" min="0.01" step="0.01"
                placeholder={form.scheme_type === 'percentage' ? '10' : '50'}
                value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Applies To</label>
              <select className="input" value={form.applies_to} onChange={e => setForm(f => ({ ...f, applies_to: e.target.value }))}>
                <option value="all">All Medicines</option>
                <option value="otc">OTC Only</option>
                <option value="schedule_h">Schedule H/X Only</option>
              </select>
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded"
                  checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>
          {formErr && <p className="text-red-500 text-sm flex items-center gap-1"><AlertCircle className="w-4 h-4" />{formErr}</p>}
          {success && <p className="text-green-600 text-sm flex items-center gap-1"><CheckCircle className="w-4 h-4" />{success}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2 disabled:opacity-50">
              {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
              {submitting ? 'Saving…' : editing ? 'Update Scheme' : 'Create Scheme'}
            </button>
            {editing && (
              <button type="button" onClick={cancelEdit} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                <X className="w-4 h-4" /> Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">All Schemes</h2>
        {loading ? (
          <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>
        ) : err ? (
          <div className="py-10 text-center text-red-500 text-sm">{err}</div>
        ) : schemes.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">No schemes yet — create one above</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Name', 'Type', 'Value', 'Applies To', 'Status', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schemes.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 font-medium text-gray-800">{s.name}</td>
                  <td className="px-3 py-2.5 text-gray-600 capitalize">{s.scheme_type}</td>
                  <td className="px-3 py-2.5 text-gray-800 font-semibold">
                    {s.scheme_type === 'percentage' ? `${s.discount_value}%` : `₹${s.discount_value}`}
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 capitalize">{s.applies_to.replace('_', ' ')}</td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => toggleActive(s)}
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => startEdit(s)} className="text-blue-600 hover:text-blue-800">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
