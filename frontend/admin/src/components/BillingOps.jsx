import { useState, useEffect, useCallback } from 'react'
import { X, Loader2, CheckCircle2, Landmark, Gift, Search } from 'lucide-react'
import { adminApi } from '../api'

const inp = 'w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40'
const lbl = 'block text-xs font-medium text-gray-400 mb-1'
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')

// ── Confirm pending bank-transfer invoices ────────────────────────────────────
export function ConfirmTransfersModal({ onClose, addToast }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminApi.getInvoices({ status: 'pending_verification', limit: 200 })
      setRows(Array.isArray(data) ? data : (data?.items || []))
    } catch (e) {
      addToast?.(e?.message || 'Failed to load invoices', 'error')
    } finally { setLoading(false) }
  }, [addToast])

  useEffect(() => { load() }, [load])

  const confirm = async (inv) => {
    setBusy(inv.id)
    try {
      await adminApi.confirmInvoice(inv.id, {})
      addToast?.(`Confirmed ${inr(inv.amount)} for ${inv.clinic_name || 'clinic'}`)
      setRows(r => r.filter(x => x.id !== inv.id))
    } catch (e) {
      addToast?.(e?.response?.data?.detail || e?.message || 'Confirm failed', 'error')
    } finally { setBusy(null) }
  }

  return (
    <Shell title="Confirm Bank Transfers" icon={Landmark} onClose={onClose}>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-500" /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-10">No bank transfers awaiting confirmation.</p>
      ) : (
        <div className="space-y-2">
          {rows.map(inv => (
            <div key={inv.id} className="flex items-center justify-between bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm text-white font-medium truncate">{inv.clinic_name || `Health Center #${inv.clinic_id}`}</p>
                <p className="text-[11px] text-gray-400 truncate">{inv.plan_key} · {inv.billing_cycle} · ref {inv.reference || '—'}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm font-bold text-white">{inr(inv.amount)}</span>
                <button onClick={() => confirm(inv)} disabled={busy === inv.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50">
                  {busy === inv.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Confirm
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  )
}

// ── Comp a clinic (manual free access / fee waiver) ───────────────────────────
export function CompClinicModal({ clinics = [], onClose, addToast }) {
  const [plans, setPlans] = useState([])
  const [clinicId, setClinicId] = useState('')
  const [planKey, setPlanKey] = useState('')
  const [days, setDays] = useState(14)
  const [reason, setReason] = useState('')
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    adminApi.getPlans().then(d => setPlans(d?.plans || [])).catch(() => {})
  }, [])

  const filtered = clinics.filter(c => !query || (c.name || '').toLowerCase().includes(query.toLowerCase()))

  const submit = async () => {
    if (!clinicId) { setErr('Select a health center'); return }
    if (!planKey) { setErr('Select a plan to grant'); return }
    setSaving(true); setErr('')
    try {
      await adminApi.compClinic(clinicId, { plan_key: planKey, days: Number(days) || null, reason })
      addToast?.('Free access granted')
      onClose()
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || 'Failed to grant access')
    } finally { setSaving(false) }
  }

  return (
    <Shell title="Grant Free Access (Comp)" icon={Gift} onClose={onClose} maxW="max-w-md">
      <div className="space-y-3">
        <div>
          <label className={lbl}>Health center</label>
          <div className="relative mb-1.5">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…" className={inp + ' pl-8'} />
          </div>
          <select value={clinicId} onChange={e => setClinicId(e.target.value)} className={inp}>
            <option value="">— select —</option>
            {filtered.slice(0, 100).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Plan to grant</label>
            <select value={planKey} onChange={e => setPlanKey(e.target.value)} className={inp}>
              <option value="">— select —</option>
              {plans.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Free for (days)</label>
            <input type="number" value={days} onChange={e => setDays(e.target.value)} className={inp} placeholder="14 (blank = no expiry)" />
          </div>
        </div>
        <div>
          <label className={lbl}>Reason</label>
          <input value={reason} onChange={e => setReason(e.target.value)} className={inp} placeholder="e.g. pilot, partner health center" />
        </div>
        {err && <p className="text-sm text-rose-400">{err}</p>}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-300 hover:bg-gray-800">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />} Grant free access
          </button>
        </div>
        <p className="text-[11px] text-gray-600">Fully audited and reversible — assign a paid plan or let it expire to end the comp.</p>
      </div>
    </Shell>
  )
}

function Shell({ title, icon: Icon, onClose, children, maxW = 'max-w-lg' }) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4">
      <div className={`bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full ${maxW} max-h-[85vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2"><Icon size={17} className="text-blue-400" /><h2 className="text-sm font-bold text-white">{title}</h2></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
