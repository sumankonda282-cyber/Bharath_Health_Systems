import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { Plus, Search, Building2, Loader2, Pencil, X, Trash2 } from 'lucide-react'

const EMPTY_FORM = {
  name: '', contact_person: '', mobile: '', email: '',
  address: '', gstin: '', drug_license_number: '', payment_terms: 30, notes: '',
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params = search ? { search } : {}
    api.get('/pharmacy/suppliers', { params })
      .then(r => setSuppliers(Array.isArray(r) ? r : []))
      .catch(() => setSuppliers([]))
      .finally(() => setLoading(false))
  }, [search])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditTarget(null)
    setErr('')
    setShowModal(true)
  }

  function openEdit(sup) {
    setForm({
      name: sup.name || '',
      contact_person: sup.contact_person || '',
      mobile: sup.mobile || '',
      email: sup.email || '',
      address: sup.address || '',
      gstin: sup.gstin || '',
      drug_license_number: sup.drug_license_number || '',
      payment_terms: sup.payment_terms || 30,
      notes: sup.notes || '',
    })
    setEditTarget(sup)
    setErr('')
    setShowModal(true)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setErr('')
    try {
      const payload = { ...form, payment_terms: Number(form.payment_terms) }
      if (editTarget) {
        await api.put(`/pharmacy/suppliers/${editTarget.id}`, payload)
      } else {
        await api.post('/pharmacy/suppliers', payload)
      }
      setShowModal(false)
      load()
    } catch (ex) {
      setErr(ex.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function deactivate(sup) {
    if (!confirm(`Deactivate supplier "${sup.name}"?`)) return
    try {
      await api.delete(`/pharmacy/suppliers/${sup.id}`)
      load()
    } catch (ex) {
      alert(ex.message)
    }
  }

  const F = (key) => ({
    value: form[key],
    onChange: e => setForm(f => ({ ...f, [key]: e.target.value })),
  })

  return (
    <div>
      <div className="page-header">
        <button onClick={openAdd} className="btn-primary"><Plus size={16} />Add Supplier</button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Search by supplier name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#0F2557]">
                {editTarget ? 'Edit Supplier' : 'Add Supplier'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={save} className="space-y-3">
              <div>
                <label className="label">Supplier Name *</label>
                <input className="input" required placeholder="Company / Distributor name" {...F('name')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Contact Person</label>
                  <input className="input" placeholder="Sales rep name" {...F('contact_person')} />
                </div>
                <div>
                  <label className="label">Mobile</label>
                  <input className="input" placeholder="10-digit mobile" {...F('mobile')} />
                </div>
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" placeholder="supplier@example.com" {...F('email')} />
              </div>
              <div>
                <label className="label">Address</label>
                <textarea className="input" rows={2} placeholder="Full address" {...F('address')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">GSTIN</label>
                  <input className="input" placeholder="15-digit GSTIN" {...F('gstin')} />
                </div>
                <div>
                  <label className="label">Drug License No.</label>
                  <input className="input" placeholder="DL number" {...F('drug_license_number')} />
                </div>
              </div>
              <div>
                <label className="label">Payment Terms (days)</label>
                <input
                  type="number" className="input" min="0"
                  value={form.payment_terms}
                  onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={2} placeholder="Any additional notes" {...F('notes')} />
              </div>
              {err && <p className="text-red-600 text-sm">{err}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-gray-400" />
          </div>
        ) : suppliers.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Building2 size={32} className="mx-auto mb-2 opacity-30" />
            <p>{search ? 'No suppliers match your search' : 'No suppliers added yet'}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th className="th">Supplier</th>
                  <th className="th">Contact</th>
                  <th className="th">Mobile</th>
                  <th className="th">GSTIN</th>
                  <th className="th">Drug License</th>
                  <th className="th">Net Days</th>
                  <th className="th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {suppliers.map(sup => (
                  <tr key={sup.id} className="tr-hover">
                    <td className="td font-medium">
                      {sup.name}
                      {sup.email && <div className="text-xs text-gray-400">{sup.email}</div>}
                    </td>
                    <td className="td text-gray-600">{sup.contact_person || '—'}</td>
                    <td className="td">{sup.mobile || '—'}</td>
                    <td className="td font-mono text-xs text-gray-600">{sup.gstin || '—'}</td>
                    <td className="td text-xs text-gray-600">{sup.drug_license_number || '—'}</td>
                    <td className="td text-center">
                      <span className="badge badge-gray">Net {sup.payment_terms || 30}d</span>
                    </td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(sup)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deactivate(sup)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          title="Deactivate"
                        >
                          <Trash2 size={14} />
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
