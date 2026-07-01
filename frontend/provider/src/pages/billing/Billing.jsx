import { useState, useEffect } from 'react'
import { billingApi, patientsApi } from '../../api'
import { PageLoader } from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import { Receipt, Plus, IndianRupee, CheckCircle, Trash2, BadgePercent } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'NEFT', 'Cheque', 'Insurance']
const ITEM_TYPES = ['consultation', 'medicine', 'lab', 'imaging', 'procedure', 'other']
const STATUS_COLORS = { pending: 'badge-yellow', paid: 'badge-green', cancelled: 'badge-gray', partial: 'badge-blue' }
const WAIVER_REASONS = [
  { value: 'economic_hardship', label: 'Economic Hardship' },
  { value: 'bpl_card', label: 'BPL Card Holder' },
  { value: 'procedure_adjustment', label: 'Procedure Adjustment' },
  { value: 'staff_family', label: 'Staff / Family' },
  { value: 'other', label: 'Other' },
]

export default function Billing() {
  const [searchParams] = useSearchParams()
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [showNew, setShowNew] = useState(searchParams.get('new') === '1')
  const [showPay, setShowPay] = useState(null)
  const [showWaiver, setShowWaiver] = useState(null)
  const [waiverForm, setWaiverForm] = useState({ waiver_amount: '', reason: 'economic_hardship', notes: '' })
  const [patients, setPatients] = useState([])
  const [ptSearch, setPtSearch] = useState('')
  const [form, setForm] = useState({ patient_id: '', items: [{ description: '', item_type: 'consultation', quantity: 1, unit_price: '' }], discount: 0, tax: 0, notes: '' })
  const [payMethod, setPayMethod] = useState('Cash')
  const [saving, setSaving] = useState(false)

  const [counts, setCounts] = useState({ pending: null, paid: null, all: null })

  const loadCounts = () => {
    Promise.all([
      billingApi.getInvoices({ status: 'pending', limit: 200 }),
      billingApi.getInvoices({ status: 'paid', limit: 200 }),
      billingApi.getInvoices({ limit: 200 }),
    ]).then(([p, pd, all]) => {
      setCounts({
        pending: Array.isArray(p) ? p.length : 0,
        paid: Array.isArray(pd) ? pd.length : 0,
        all: Array.isArray(all) ? all.length : 0,
      })
    }).catch(() => {})
  }

  const load = () => {
    setLoading(true)
    billingApi.getInvoices({ status: filter, limit: 100 })
      .then(r => setInvoices(Array.isArray(r) ? r : []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadCounts() }, [])
  useEffect(() => { load() }, [filter])

  useEffect(() => {
    if (ptSearch.length < 2) return
    const t = setTimeout(() => patientsApi.list({ search: ptSearch, limit: 10 }).then(r => setPatients(Array.isArray(r) ? r : [])), 300)
    return () => clearTimeout(t)
  }, [ptSearch])

  const subtotal = form.items.reduce((s, i) => s + (parseFloat(i.unit_price) || 0) * (parseInt(i.quantity) || 1), 0)
  const total = subtotal - (parseFloat(form.discount) || 0) + (parseFloat(form.tax) || 0)

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { description: '', item_type: 'consultation', quantity: 1, unit_price: '' }] }))
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
  const setItem = (idx, k, v) => setForm(f => ({ ...f, items: f.items.map((item, i) => i === idx ? { ...item, [k]: v } : item) }))

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await billingApi.create({ ...form, subtotal, total })
      setShowNew(false)
      setForm({ patient_id: '', items: [{ description: '', item_type: 'consultation', quantity: 1, unit_price: '' }], discount: 0, tax: 0, notes: '' })
      load()
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to create invoice')
    } finally { setSaving(false) }
  }

  const handleWaiver = async () => {
    if (!waiverForm.waiver_amount || parseFloat(waiverForm.waiver_amount) <= 0) return
    setSaving(true)
    try {
      await billingApi.applyWaiver(showWaiver.id, {
        waiver_amount: parseFloat(waiverForm.waiver_amount),
        reason: waiverForm.reason,
        notes: waiverForm.notes,
      })
      setShowWaiver(null)
      setWaiverForm({ waiver_amount: '', reason: 'economic_hardship', notes: '' })
      load()
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to apply waiver')
    } finally { setSaving(false) }
  }

  const handlePay = async () => {
    setSaving(true)
    try {
      await billingApi.pay(showPay.id, { payment_method: payMethod })
      setShowPay(null)
      load()
    } catch (e) {
      alert(e.response?.data?.detail || 'Failed to record payment')
    } finally { setSaving(false) }
  }

  return (
    <div>
      <div className="page-header">
        <button onClick={() => setShowNew(true)} className="btn-primary"><Plus size={16} />New Invoice</button>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-4 w-fit">
        {['pending', 'paid', 'all'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${filter === s ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
          >
            {s}{counts[s] !== null ? ` (${counts[s]})` : ''}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? <PageLoader /> : invoices.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Receipt size={36} className="mx-auto mb-2 opacity-30" />
            <p className="font-medium text-gray-500">No {filter} invoices</p>
            <p className="text-xs mt-1 text-gray-400">Invoices appear here automatically when a consultation, pharmacy, or lab/imaging charge is billed.</p>
          </div>
        ) : (
          <div className="table-wrapper rounded-xl border-0">
            <table className="table">
              <thead><tr>
                <th className="th">Invoice #</th><th className="th">Patient</th><th className="th">Total</th>
                <th className="th">Method</th><th className="th">Status</th><th className="th">Date</th><th className="th">Action</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map(inv => (
                  <tr key={inv.id} className="tr-hover">
                    <td className="td font-mono text-sm">{inv.invoice_number || `INV-${inv.id}`}</td>
                    <td className="td font-medium">{inv.patient_name || inv.patient?.full_name}</td>
                    <td className="td font-bold text-green-700">₹{parseFloat(inv.total).toLocaleString('en-IN')}</td>
                    <td className="td text-gray-500">{inv.payment_method || '—'}</td>
                    <td className="td"><span className={STATUS_COLORS[inv.status] || 'badge-gray'}>{inv.status}</span></td>
                    <td className="td text-xs text-gray-400">{new Date(inv.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="td">
                      <div className="flex gap-2 items-center">
                        {inv.status === 'pending' && (
                          <button onClick={() => setShowPay(inv)} className="text-xs text-green-600 hover:underline">Collect Payment</button>
                        )}
                        {inv.status === 'pending' && (
                          <button onClick={() => setShowWaiver(inv)} title="Apply waiver" className="text-xs text-orange-600 hover:underline flex items-center gap-0.5">
                            <BadgePercent size={12} /> Waiver
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

      {/* New Invoice Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Create Invoice" size="xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Patient *</label>
            <input className="input" placeholder="Search patient…" value={ptSearch} onChange={e => setPtSearch(e.target.value)} />
            {patients.length > 0 && (
              <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden">
                {patients.map(p => (
                  <button key={p.id} type="button"
                    onClick={() => { setForm(f => ({ ...f, patient_id: p.id })); setPtSearch(p.full_name); setPatients([]) }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 border-b last:border-0"
                  >{p.full_name} · {p.mobile}</button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="label">Line Items</label>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-4">
                    <input className="input text-sm" placeholder="Description" value={item.description} onChange={e => setItem(idx, 'description', e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <select className="input text-sm" value={item.item_type} onChange={e => setItem(idx, 'item_type', e.target.value)}>
                      {ITEM_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input className="input text-sm" type="number" min="1" placeholder="Qty" value={item.quantity} onChange={e => setItem(idx, 'quantity', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <input className="input text-sm" type="number" placeholder="₹ Price" value={item.unit_price} onChange={e => setItem(idx, 'unit_price', e.target.value)} />
                  </div>
                  <div className="col-span-1">
                    <button type="button" onClick={() => removeItem(idx)} className="btn-secondary p-2 text-red-500"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem} className="btn-secondary text-xs mt-2"><Plus size={13} />Add Line</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className="label">Discount (₹)</label><input className="input" type="number" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} /></div>
            <div><label className="label">Tax (₹)</label><input className="input" type="number" value={form.tax} onChange={e => setForm(f => ({ ...f, tax: e.target.value }))} /></div>
            <div className="flex items-end pb-1">
              <div className="w-full p-3 bg-blue-50 rounded-lg text-center">
                <div className="text-xs text-gray-500">Total</div>
                <div className="text-xl font-bold text-blue-700">₹{total.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          <div><label className="label">Notes</label><input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>

          <button type="submit" disabled={saving || !form.patient_id} className="btn-primary w-full justify-center">
            {saving ? 'Creating…' : 'Create Invoice'}
          </button>
        </form>
      </Modal>

      {/* Collect Payment Modal */}
      <Modal open={!!showPay} onClose={() => setShowPay(null)} title="Collect Payment">
        {showPay && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg text-center">
              <div className="text-sm text-gray-500">{showPay.patient_name}</div>
              <div className="text-3xl font-bold text-blue-700 mt-1">₹{parseFloat(showPay.total).toLocaleString('en-IN')}</div>
            </div>
            <div>
              <label className="label">Payment Method</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPayMethod(m)}
                    className={`p-2.5 rounded-lg border text-sm font-medium transition-all ${payMethod === m ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handlePay} disabled={saving} className="btn-success w-full justify-center">
              <CheckCircle size={16} />{saving ? 'Processing…' : 'Confirm Payment'}
            </button>
          </div>
        )}
      </Modal>
      {/* Waiver Modal */}
      <Modal open={!!showWaiver} onClose={() => setShowWaiver(null)} title="Apply Fee Waiver">
        {showWaiver && (
          <div className="space-y-4">
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl text-sm">
              <p className="font-semibold text-orange-800">{showWaiver.patient_name}</p>
              <p className="text-orange-600">Invoice Total: ₹{parseFloat(showWaiver.total).toLocaleString('en-IN')}</p>
            </div>
            <div>
              <label className="label">Waiver Amount (₹) *</label>
              <input
                className="input" type="number" min="1" max={showWaiver.total}
                value={waiverForm.waiver_amount}
                onChange={e => setWaiverForm(f => ({ ...f, waiver_amount: e.target.value }))}
                placeholder="Amount to waive"
              />
            </div>
            <div>
              <label className="label">Reason *</label>
              <select className="input" value={waiverForm.reason} onChange={e => setWaiverForm(f => ({ ...f, reason: e.target.value }))}>
                {WAIVER_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" value={waiverForm.notes} onChange={e => setWaiverForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional details…" />
            </div>
            <div className="text-xs text-gray-500 bg-gray-50 border rounded-lg p-2">
              This waiver will be logged with your name, reason, and timestamp for manager review.
            </div>
            <button onClick={handleWaiver} disabled={saving || !waiverForm.waiver_amount} className="btn-primary w-full justify-center" style={{ background: '#d97706' }}>
              <BadgePercent size={15} />{saving ? 'Applying…' : 'Apply Waiver'}
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
