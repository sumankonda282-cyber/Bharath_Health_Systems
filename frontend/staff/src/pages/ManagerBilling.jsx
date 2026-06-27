import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import {
  Search, BedDouble, FileText, Percent, X, Loader2,
  AlertCircle, RefreshCw, ExternalLink, Receipt,
} from 'lucide-react'

const WAIVER_REASONS = [
  'Financial hardship', 'BPL / government scheme', 'Goodwill / service issue',
  'Staff / family', 'Billing correction', 'Other',
]
const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN')
const num = v => Number(v || 0)
const invTotal = i => num(i.total ?? i.total_amount)
const invPaid = i => num(i.amount_paid)

function badge(status) {
  const map = {
    paid: 'badge-green', pending: 'badge-yellow', partial: 'badge-yellow',
    cancelled: 'badge-red', active: 'badge-green', discharged: 'bg-gray-100 text-gray-600',
    draft: 'bg-gray-100 text-gray-600', finalized: 'badge-green',
  }
  return map[status] || 'bg-gray-100 text-gray-600'
}

// ── Waiver modal (works for both OPD invoice and IPD bill) ──
function WaiverModal({ title, subtitle, summary, onSubmit, onClose }) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState(WAIVER_REASONS[0])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async () => {
    const amt = Number(amount)
    if (!amt || amt <= 0) { setErr('Enter a waiver/discount amount greater than zero.'); return }
    setSaving(true); setErr('')
    try {
      await onSubmit({ waiver_amount: amt, reason, notes })
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Could not apply the waiver.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-[440px] max-w-[94vw] p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-bold text-gray-900 flex items-center gap-2"><Percent size={15} style={{ color: '#0F2557' }} />{title}</div>
            {subtitle && <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"><X size={12} /></button>
        </div>

        {summary && (
          <div className="grid grid-cols-3 gap-2 text-center">
            {summary.map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl py-2">
                <div className="text-sm font-bold text-gray-800">{s.value}</div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="label">Waiver / Discount amount (₹)</label>
          <input className="input" type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="label">Reason</label>
          <select className="input" value={reason} onChange={e => setReason(e.target.value)}>
            {WAIVER_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Notes (optional)</label>
          <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any context for the audit log…" />
        </div>
        {err && <p className="text-xs text-red-600">{err}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary text-sm">{saving ? 'Applying…' : 'Apply waiver'}</button>
        </div>
      </div>
    </div>
  )
}

// ── IPD bill modal: loads the admission's bill and offers waive/discount ──
function IpdBillModal({ admission, canWaive, onClose, onChanged }) {
  const [bill, setBill] = useState(undefined) // undefined=loading, null=none
  const [waive, setWaive] = useState(false)
  const [err, setErr] = useState('')

  const loadBill = useCallback(() => {
    setErr('')
    api.get(`/inpatient/admissions/${admission.id}/bill`)
      .then(setBill)
      .catch(e => { if (e?.response?.status === 404) setBill(null); else setErr(e?.response?.data?.detail || 'Could not load the bill') })
  }, [admission.id])
  useEffect(() => { loadBill() }, [loadBill])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-[480px] max-w-[95vw] max-h-[88vh] overflow-y-auto p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-bold text-gray-900">{admission.patient_name || admission.patient?.full_name || 'Patient'}</div>
            <div className="text-xs text-gray-500">{admission.admission_number}{admission.ward_name ? ` · ${admission.ward_name}` : ''}{admission.bed_number ? ` · Bed ${admission.bed_number}` : ''}</div>
          </div>
          <button onClick={onClose} className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"><X size={12} /></button>
        </div>

        {err && <div className="text-xs text-red-600 flex items-center gap-1.5"><AlertCircle size={13} />{err}</div>}

        {bill === undefined ? (
          <div className="py-8 flex justify-center"><Loader2 size={22} className="animate-spin text-gray-300" /></div>
        ) : bill === null ? (
          <div className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">No bill has been generated for this admission yet.</div>
        ) : (
          <>
            <div className="rounded-xl border border-gray-100 divide-y divide-gray-50 text-sm">
              {[
                ['Subtotal', inr(bill.subtotal)],
                ['GST', inr(bill.gst_amount)],
                ['Discount / waivers', '− ' + inr(bill.discount)],
                ['Total', inr(bill.total)],
                ['Paid', inr(bill.amount_paid)],
                ['Patient payable', inr(bill.patient_payable)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between px-4 py-2">
                  <span className="text-gray-500">{k}</span><span className="font-semibold text-gray-800">{v}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge(bill.status)}`}>{bill.status}</span>
              {canWaive && (
                <button onClick={() => setWaive(true)} className="btn-primary text-sm"><Percent size={14} />Waive / Discount</button>
              )}
            </div>
          </>
        )}
      </div>

      {waive && bill && (
        <WaiverModal
          title="Waive / Discount IPD bill"
          subtitle={`${admission.patient_name || ''} · ${admission.admission_number}`}
          summary={[
            { label: 'Total', value: inr(bill.total) },
            { label: 'Paid', value: inr(bill.amount_paid) },
            { label: 'Payable', value: inr(bill.patient_payable) },
          ]}
          onSubmit={async (payload) => {
            await api.post(`/inpatient/admissions/${admission.id}/bill/waiver`, payload)
            setWaive(false); loadBill(); onChanged && onChanged()
          }}
          onClose={() => setWaive(false)}
        />
      )}
    </div>
  )
}

export default function ManagerBilling() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isHospital = user?.org_type === 'hospital'
  const role = user?.role
  const canWaiveOpd = ['clinic_admin', 'clinic_manager', 'receptionist'].includes(role)
  const canWaiveIpd = ['clinic_admin', 'clinic_manager', 'doctor'].includes(role)

  const [tab, setTab] = useState('opd')

  return (
    <div>
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5 w-fit">
        <button onClick={() => setTab('opd')} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'opd' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Outpatient</button>
        {isHospital && (
          <button onClick={() => setTab('ipd')} className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'ipd' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Inpatient</button>
        )}
      </div>

      {tab === 'opd'
        ? <OpdBilling navigate={navigate} canWaive={canWaiveOpd} />
        : <IpdBilling canWaive={canWaiveIpd} />}
    </div>
  )
}

// ── Outpatient invoices ──
function OpdBilling({ navigate, canWaive }) {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [waiveTarget, setWaiveTarget] = useState(null)

  const load = useCallback(() => {
    setLoading(true); setError('')
    api.get('/billing/invoices', { params: { limit: 200 } })
      .then(r => setInvoices(Array.isArray(r) ? r : []))
      .catch(e => setError(e?.response?.data?.detail || e.message || 'Failed to load invoices'))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const STATUS_CHIPS = [
    { key: '', label: 'All' }, { key: 'pending', label: 'Pending' },
    { key: 'partial', label: 'Partial' }, { key: 'paid', label: 'Paid' },
  ]

  const filtered = useMemo(() => invoices.filter(i => {
    if (status && i.status !== status) return false
    const day = (i.created_at || '').slice(0, 10)
    if (from && day && day < from) return false
    if (to && day && day > to) return false
    if (search) {
      const q = search.toLowerCase()
      const hay = `${i.invoice_number || ''} ${i.patient_name || i.customer_name || ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  }), [invoices, status, from, to, search])

  const totals = useMemo(() => filtered.reduce((a, i) => {
    a.billed += invTotal(i); a.paid += invPaid(i); return a
  }, { billed: 0, paid: 0 }), [filtered])

  return (
    <div>
      {/* One-line toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-8" placeholder="Search invoice or patient…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {STATUS_CHIPS.map(c => (
          <button key={c.key} onClick={() => setStatus(c.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${status === c.key ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 bg-white'}`}
            style={status === c.key ? { background: '#0F2557' } : {}}>{c.label}</button>
        ))}
        <input type="date" className="input w-auto text-sm py-1.5" value={from} onChange={e => setFrom(e.target.value)} />
        <span className="text-gray-400 text-sm">to</span>
        <input type="date" className="input w-auto text-sm py-1.5" value={to} onChange={e => setTo(e.target.value)} />
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} invoices</span>
      </div>

      {error ? (
        <div className="card p-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm" style={{ color: '#CC1414' }}><AlertCircle size={16} />{error}</div>
          <button onClick={load} className="btn-secondary text-xs py-1 px-3 flex items-center gap-1"><RefreshCw size={12} />Retry</button>
        </div>
      ) : loading ? (
        <div className="py-20 flex justify-center"><Loader2 size={26} className="animate-spin text-gray-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400"><Receipt size={32} className="mx-auto mb-2 opacity-30" /><p>No invoices match these filters.</p></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="table-wrapper rounded-xl border-0">
            <table className="table">
              <thead><tr>
                <th className="th">Invoice</th><th className="th">Patient</th><th className="th">Date</th>
                <th className="th text-right">Total</th><th className="th text-right">Paid</th><th className="th text-right">Balance</th>
                <th className="th">Status</th><th className="th">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(i => {
                  const bal = invTotal(i) - invPaid(i)
                  return (
                    <tr key={i.id} className="tr-hover">
                      <td className="td font-mono text-xs">{i.invoice_number || `#${i.id}`}</td>
                      <td className="td font-medium">{i.patient_name || i.customer_name || '—'}</td>
                      <td className="td text-xs text-gray-400">{(i.created_at || '').slice(0, 10)}</td>
                      <td className="td text-right">{inr(invTotal(i))}</td>
                      <td className="td text-right text-green-600">{inr(invPaid(i))}</td>
                      <td className="td text-right font-semibold" style={{ color: bal > 0 ? '#CC1414' : '#16a34a' }}>{inr(bal)}</td>
                      <td className="td"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge(i.status)}`}>{i.status}</span></td>
                      <td className="td">
                        <div className="flex items-center gap-1">
                          {canWaive && bal > 0 && (
                            <button onClick={() => setWaiveTarget(i)} className="btn-secondary text-xs py-1 px-2" title="Waive / discount"><Percent size={12} /></button>
                          )}
                          <button onClick={() => navigate(`/billing/${i.id}`)} className="btn-secondary text-xs py-1 px-2" title="Open full bill"><ExternalLink size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="font-bold text-gray-800 bg-gray-50">
                  <td className="td" colSpan={3}>Totals ({filtered.length})</td>
                  <td className="td text-right">{inr(totals.billed)}</td>
                  <td className="td text-right text-green-600">{inr(totals.paid)}</td>
                  <td className="td text-right" style={{ color: '#CC1414' }}>{inr(totals.billed - totals.paid)}</td>
                  <td className="td" colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {waiveTarget && (
        <WaiverModal
          title="Waive / Discount invoice"
          subtitle={`${waiveTarget.invoice_number || ''} · ${waiveTarget.patient_name || waiveTarget.customer_name || ''}`}
          summary={[
            { label: 'Total', value: inr(invTotal(waiveTarget)) },
            { label: 'Paid', value: inr(invPaid(waiveTarget)) },
            { label: 'Balance', value: inr(invTotal(waiveTarget) - invPaid(waiveTarget)) },
          ]}
          onSubmit={async (payload) => {
            await api.post(`/clinic/billing/invoice/${waiveTarget.id}/waiver`, payload)
            setWaiveTarget(null); load()
          }}
          onClose={() => setWaiveTarget(null)}
        />
      )}
    </div>
  )
}

// ── Inpatient admissions + bills ──
function IpdBilling({ canWaive }) {
  const [admissions, setAdmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('active')
  const [billTarget, setBillTarget] = useState(null)

  const load = useCallback(() => {
    setLoading(true); setError('')
    api.get('/inpatient/admissions', { params: { status: 'active,discharged' } })
      .then(r => setAdmissions(Array.isArray(r) ? r : (r?.items || [])))
      .catch(e => setError(e?.response?.data?.detail || e.message || 'Failed to load admissions'))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const STATUS_CHIPS = [
    { key: '', label: 'All' }, { key: 'active', label: 'Active' },
    { key: 'discharge_pending', label: 'Discharge pending' }, { key: 'discharged', label: 'Discharged' },
  ]

  const filtered = useMemo(() => admissions.filter(a => {
    if (status && a.status !== status) return false
    if (search) {
      const q = search.toLowerCase()
      const hay = `${a.admission_number || ''} ${a.patient_name || a.patient?.full_name || ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  }), [admissions, status, search])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-8" placeholder="Search patient or admission #…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {STATUS_CHIPS.map(c => (
          <button key={c.key} onClick={() => setStatus(c.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${status === c.key ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 bg-white'}`}
            style={status === c.key ? { background: '#0F2557' } : {}}>{c.label}</button>
        ))}
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} admissions</span>
      </div>

      {error ? (
        <div className="card p-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm" style={{ color: '#CC1414' }}><AlertCircle size={16} />{error}</div>
          <button onClick={load} className="btn-secondary text-xs py-1 px-3 flex items-center gap-1"><RefreshCw size={12} />Retry</button>
        </div>
      ) : loading ? (
        <div className="py-20 flex justify-center"><Loader2 size={26} className="animate-spin text-gray-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400"><BedDouble size={32} className="mx-auto mb-2 opacity-30" /><p>No admissions match these filters.</p></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="table-wrapper rounded-xl border-0">
            <table className="table">
              <thead><tr>
                <th className="th">Admission</th><th className="th">Patient</th><th className="th">Ward / Bed</th>
                <th className="th">Admitted</th><th className="th">Status</th><th className="th">Bill</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(a => (
                  <tr key={a.id} className="tr-hover">
                    <td className="td font-mono text-xs">{a.admission_number || `#${a.id}`}</td>
                    <td className="td font-medium">{a.patient_name || a.patient?.full_name || '—'}</td>
                    <td className="td text-xs text-gray-500">{a.ward_name || '—'}{a.bed_number ? ` · ${a.bed_number}` : ''}</td>
                    <td className="td text-xs text-gray-400">{(a.admitted_at || '').slice(0, 10)}</td>
                    <td className="td"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge(a.status)}`}>{a.status}</span></td>
                    <td className="td">
                      <button onClick={() => setBillTarget(a)} className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"><FileText size={12} />Manage bill</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {billTarget && (
        <IpdBillModal admission={billTarget} canWaive={canWaive} onClose={() => setBillTarget(null)} onChanged={load} />
      )}
    </div>
  )
}
