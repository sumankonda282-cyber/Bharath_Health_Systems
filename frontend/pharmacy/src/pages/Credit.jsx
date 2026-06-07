import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { toast } from '../utils/toast'
import {
  IndianRupee, Search, RefreshCw, Loader2, CheckCircle,
  AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react'

function toNum(v) { return isNaN(parseFloat(v)) ? 0 : parseFloat(v) }

function CollectModal({ session, onClose, onDone }) {
  const [amount, setAmount] = useState(session.balance_due.toFixed(2))
  const [method, setMethod] = useState('cash')
  const [saving, setSaving] = useState(false)

  const collect = async () => {
    const amt = toNum(amount)
    if (amt <= 0) { toast.error('Enter a valid amount'); return }
    if (amt > session.balance_due + 0.01) { toast.error('Amount exceeds balance'); return }
    setSaving(true)
    try {
      await api.post(`/pharmacy/credit/${session.id}/collect`, { amount: amt, payment_method: method })
      toast.success(`₹${amt.toFixed(2)} collected`)
      onDone()
    } catch (e) {
      toast.error(e.message)
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold mb-1" style={{ color: '#0F2557' }}>Collect Payment</h3>
        <p className="text-sm text-gray-500 mb-4">
          {session.patient_name} · Dispense #{session.dispense_number} ·
          Balance: <strong>₹{session.balance_due.toFixed(2)}</strong>
        </p>
        <div className="space-y-3">
          <div>
            <label className="label">Amount (₹)</label>
            <input type="number" min={1} step={0.01} max={session.balance_due}
              value={amount} onChange={e => setAmount(e.target.value)}
              className="input" />
          </div>
          <div>
            <label className="label">Payment Mode</label>
            <select value={method} onChange={e => setMethod(e.target.value)} className="input">
              {['cash', 'card', 'upi'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={collect} disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? 'Saving…' : 'Collect'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Credit() {
  const [sessions, setSessions]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [expanded, setExpanded]   = useState(null)
  const [collecting, setCollecting] = useState(null)

  const load = useCallback(() => {
    api.get('/pharmacy/credit')
      .then(r => setSessions(Array.isArray(r) ? r : []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const totalOutstanding = sessions.reduce((s, ses) => s + toNum(ses.balance_due), 0)
  const totalPatients    = new Set(sessions.map(s => s.patient_id || s.patient_name)).size

  const filtered = sessions.filter(s => {
    const q = search.toLowerCase()
    return !q || s.patient_name?.toLowerCase().includes(q) || s.patient_mobile?.includes(q)
  })

  // group by patient
  const grouped = filtered.reduce((acc, s) => {
    const key = s.patient_id || s.patient_name || 'Walk-in'
    if (!acc[key]) acc[key] = { patient_name: s.patient_name, patient_mobile: s.patient_mobile, sessions: [] }
    acc[key].sessions.push(s)
    return acc
  }, {})

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Credit Ledger</h1>
          <p className="text-sm text-gray-500 mt-0.5">Collect outstanding payments from patients</p>
        </div>
        <button onClick={load} className="btn-secondary"><RefreshCw size={15} /></button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
        <div className="card p-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#CC141418' }}>
            <IndianRupee size={20} style={{ color: '#CC1414' }} />
          </div>
          <div>
            <div className="text-xl font-bold" style={{ color: '#CC1414' }}>₹{totalOutstanding.toFixed(0)}</div>
            <div className="text-xs text-gray-500">Total Outstanding</div>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#F5821E18' }}>
            <AlertTriangle size={20} style={{ color: '#F5821E' }} />
          </div>
          <div>
            <div className="text-xl font-bold" style={{ color: '#0F2557' }}>{sessions.length}</div>
            <div className="text-xs text-gray-500">Unpaid Dispenses</div>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: '#0F255718' }}>
            <CheckCircle size={20} style={{ color: '#0F2557' }} />
          </div>
          <div>
            <div className="text-xl font-bold" style={{ color: '#0F2557' }}>{totalPatients}</div>
            <div className="text-xs text-gray-500">Patients with Credit</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 card px-4 py-2.5 mb-4">
        <Search size={15} className="text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search patient name or mobile…"
          className="flex-1 text-sm outline-none" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-gray-400" /></div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card p-14 text-center text-gray-400">
          <CheckCircle size={36} className="mx-auto mb-3 opacity-30 text-green-400" />
          <p className="font-medium text-green-600">No outstanding credit balances</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([key, { patient_name, patient_mobile, sessions: pSessions }]) => {
            const balance = pSessions.reduce((s, ses) => s + toNum(ses.balance_due), 0)
            const isOpen  = expanded === key
            return (
              <div key={key} className="card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 cursor-pointer"
                  onClick={() => setExpanded(isOpen ? null : key)}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ background: '#CC141415', color: '#CC1414' }}>
                      {(patient_name || 'W').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">{patient_name}</div>
                      {patient_mobile && <div className="text-xs text-gray-500">{patient_mobile}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold text-lg" style={{ color: '#CC1414' }}>₹{balance.toFixed(2)}</div>
                      <div className="text-xs text-gray-400">{pSessions.length} dispense{pSessions.length > 1 ? 's' : ''}</div>
                    </div>
                    {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-100">
                    {pSessions.map(ses => (
                      <div key={ses.id} className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <div>
                          <div className="text-sm font-medium">
                            Dispense #{ses.dispense_number}
                            <span className="ml-2 text-xs text-gray-400">
                              {ses.created_at ? new Date(ses.created_at).toLocaleDateString('en-IN') : ''}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Total: ₹{toNum(ses.total_amount).toFixed(2)} ·
                            Paid: ₹{toNum(ses.amount_paid).toFixed(2)} ·
                            Balance: <strong className="text-red-600">₹{toNum(ses.balance_due).toFixed(2)}</strong>
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {(ses.items || []).map(i => i.medicine_name).join(', ')}
                          </div>
                        </div>
                        <button onClick={() => setCollecting(ses)}
                          className="text-sm px-3 py-1.5 rounded-xl font-medium text-white"
                          style={{ background: '#0F2557' }}>
                          Collect
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {collecting && (
        <CollectModal
          session={collecting}
          onClose={() => setCollecting(null)}
          onDone={() => { setCollecting(null); load() }}
        />
      )}
    </div>
  )
}
