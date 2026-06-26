import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { CheckCircle, AlertCircle, RefreshCw, Plus, ChevronRight, ArrowLeft } from 'lucide-react'

function fmt(n) { return Number(n || 0).toFixed(2) }

function AccountList({ accounts, onSelect, onNew }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">Credit Accounts</h2>
        <button onClick={onNew} className="btn-primary text-sm flex items-center gap-1.5 py-1.5 px-3">
          <Plus className="w-4 h-4" /> New Account
        </button>
      </div>
      {accounts.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">No credit accounts yet</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {accounts.map(a => (
            <button key={a.id} onClick={() => onSelect(a)}
              className="w-full flex items-center justify-between px-1 py-3 hover:bg-gray-50 rounded-xl transition-colors text-left">
              <div>
                <div className="font-medium text-gray-800">{a.customer_name}</div>
                <div className="text-xs text-gray-400">{a.customer_mobile || '—'}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className={`font-semibold ${a.outstanding_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{fmt(a.outstanding_balance)}
                  </div>
                  <div className="text-xs text-gray-400">of ₹{fmt(a.credit_limit)} limit</div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function NewAccountForm({ onSave, onCancel }) {
  const [name, setName]   = useState('')
  const [mobile, setMobile] = useState('')
  const [limit, setLimit] = useState('5000')
  const [saving, setSaving] = useState(false)
  const [err, setErr]     = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) { setErr('Customer name required'); return }
    setSaving(true); setErr('')
    try {
      await api.post('/pharmacy/credit-accounts', {
        customer_name: name.trim(), customer_mobile: mobile.trim() || undefined,
        credit_limit: parseFloat(limit) || 5000,
      })
      onSave()
    } catch (ex) { setErr(ex.message || 'Failed to create') }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="font-semibold text-gray-800">New Credit Account</h2>
      <div><label className="label">Customer Name *</label>
        <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" /></div>
      <div><label className="label">Mobile</label>
        <input className="input" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="10-digit mobile" maxLength={10} /></div>
      <div><label className="label">Credit Limit ₹</label>
        <input type="number" className="input" min="0" value={limit} onChange={e => setLimit(e.target.value)} /></div>
      {err && <p className="text-red-500 text-sm flex items-center gap-1"><AlertCircle className="w-4 h-4" />{err}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 disabled:opacity-50">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Create
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  )
}

function AccountDetail({ account, onBack, onRefresh }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [pmtAmt, setPmtAmt]   = useState('')
  const [pmtNotes, setPmtNotes] = useState('')
  const [paying, setPaying]   = useState(false)
  const [payErr, setPayErr]   = useState('')
  const [payOk, setPayOk]     = useState('')

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get(`/pharmacy/credit-accounts/${account.id}/transactions`); setData(r) }
    catch {}
    finally { setLoading(false) }
  }, [account.id])

  useEffect(() => { fetchDetail() }, [fetchDetail])

  async function handlePayment(e) {
    e.preventDefault()
    if (!pmtAmt || parseFloat(pmtAmt) <= 0) { setPayErr('Enter a valid amount'); return }
    setPaying(true); setPayErr(''); setPayOk('')
    try {
      await api.post(`/pharmacy/credit-accounts/${account.id}/payment`, {
        amount: parseFloat(pmtAmt), notes: pmtNotes.trim() || undefined,
      })
      setPayOk('Payment recorded'); setPmtAmt(''); setPmtNotes('')
      fetchDetail(); onRefresh()
    } catch (ex) { setPayErr(ex.message || 'Failed') }
    finally { setPaying(false) }
  }

  const acc = data?.account || account
  const txs = data?.transactions || []

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> All Accounts
      </button>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="font-bold text-lg text-gray-800">{acc.customer_name}</h2>
          {acc.customer_mobile && <div className="text-sm text-gray-500">{acc.customer_mobile}</div>}
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${acc.outstanding_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ₹{fmt(acc.outstanding_balance)}
          </div>
          <div className="text-xs text-gray-400">outstanding of ₹{fmt(acc.credit_limit)} limit</div>
        </div>
      </div>

      {/* Payment form */}
      {acc.outstanding_balance > 0 && (
        <form onSubmit={handlePayment} className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">Record Payment</h3>
          <div className="flex gap-3">
            <input type="number" className="input flex-1" min="0.01" step="0.01"
              placeholder="Amount ₹" value={pmtAmt} onChange={e => setPmtAmt(e.target.value)} />
            <input className="input flex-1" placeholder="Notes (optional)"
              value={pmtNotes} onChange={e => setPmtNotes(e.target.value)} />
            <button type="submit" disabled={paying} className="btn-primary flex items-center gap-1 disabled:opacity-50">
              {paying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Pay
            </button>
          </div>
          {payErr && <p className="text-red-500 text-xs mt-2">{payErr}</p>}
          {payOk && <p className="text-green-600 text-xs mt-2">{payOk}</p>}
        </form>
      )}

      {/* Transaction ledger */}
      <h3 className="font-semibold text-gray-700 text-sm mb-3">Ledger</h3>
      {loading ? (
        <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>
      ) : txs.length === 0 ? (
        <div className="py-8 text-center text-gray-400 text-sm">No transactions yet</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Date', 'Type', 'Amount', 'Balance', 'Notes'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {txs.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                  {t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : '—'}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    t.transaction_type === 'payment' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>{t.transaction_type}</span>
                </td>
                <td className={`px-3 py-2.5 font-semibold ${t.transaction_type === 'payment' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.transaction_type === 'payment' ? '-' : '+'}₹{fmt(t.amount)}
                </td>
                <td className="px-3 py-2.5 text-gray-800 font-medium">₹{fmt(t.balance_after)}</td>
                <td className="px-3 py-2.5 text-gray-500 text-xs max-w-xs truncate">{t.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function CreditLedger() {
  const [accounts, setAccounts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [err, setErr]             = useState('')
  const [view, setView]           = useState('list') // 'list' | 'new' | 'detail'
  const [selected, setSelected]   = useState(null)

  const fetchAccounts = useCallback(async () => {
    setLoading(true); setErr('')
    try { const r = await api.get('/pharmacy/credit-accounts'); setAccounts(r.accounts || []) }
    catch { setErr('Failed to load accounts') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
        ) : err ? (
          <div className="py-16 text-center text-red-500 text-sm">{err}</div>
        ) : view === 'new' ? (
          <NewAccountForm onSave={() => { fetchAccounts(); setView('list') }} onCancel={() => setView('list')} />
        ) : view === 'detail' && selected ? (
          <AccountDetail account={selected} onBack={() => setView('list')} onRefresh={fetchAccounts} />
        ) : (
          <AccountList accounts={accounts} onSelect={a => { setSelected(a); setView('detail') }} onNew={() => setView('new')} />
        )}
      </div>
    </div>
  )
}
