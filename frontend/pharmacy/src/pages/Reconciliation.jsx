import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { Calculator, CheckCircle, AlertCircle, Download, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'

function todayStr() { return new Date().toISOString().split('T')[0] }
function monthStart() { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0] }

function diffBadge(diff) {
  if (diff === 0) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Balanced</span>
  if (diff > 0)   return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">+₹{diff.toFixed(2)} Over</span>
  return                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">₹{Math.abs(diff).toFixed(2)} Short</span>
}

function downloadCSV(rows) {
  const headers = ['Date', 'Shift', 'Opening', 'Cash Sales', 'Card Sales', 'UPI Sales', 'Credit Sales', 'Returns', 'Expected Cash', 'Actual Cash', 'Difference', 'Status']
  const lines = [
    headers.join(','),
    ...rows.map(r => [
      r.shift_date, r.shift,
      r.opening_cash, r.cash_sales, r.card_sales, r.upi_sales, r.credit_sales,
      r.total_returns, r.expected_cash, r.actual_cash, r.difference, r.status,
    ].join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `reconciliation-${todayStr()}.csv`
  a.click()
}

export default function Reconciliation() {
  // Form
  const [shiftDate, setShiftDate]       = useState(todayStr())
  const [shift, setShift]               = useState('day')
  const [openingCash, setOpeningCash]   = useState('')
  const [actualCash, setActualCash]     = useState('')
  const [notes, setNotes]               = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [formErr, setFormErr]           = useState('')
  const [lastResult, setLastResult]     = useState(null)

  // Log
  const [log, setLog]             = useState([])
  const [logLoading, setLogLoading] = useState(true)
  const [logErr, setLogErr]       = useState('')
  const [fromDate, setFromDate]   = useState(monthStart())
  const [toDate, setToDate]       = useState(todayStr())

  const fetchLog = useCallback(async () => {
    setLogLoading(true); setLogErr('')
    try {
      const r = await api.get('/pharmacy/reconciliations', { params: { from_date: fromDate, to_date: toDate, limit: 60 } })
      setLog(r.reconciliations || [])
    } catch { setLogErr('Failed to load reconciliation history') }
    finally { setLogLoading(false) }
  }, [fromDate, toDate])

  useEffect(() => { fetchLog() }, [fetchLog])

  async function handleSubmit(e) {
    e.preventDefault()
    setFormErr(''); setLastResult(null)
    if (!actualCash && actualCash !== 0) { setFormErr('Enter actual cash in drawer'); return }
    setSubmitting(true)
    try {
      const res = await api.post('/pharmacy/reconciliations', {
        shift_date:   shiftDate,
        shift,
        opening_cash: parseFloat(openingCash) || 0,
        actual_cash:  parseFloat(actualCash),
        notes:        notes.trim() || undefined,
      })
      setLastResult(res)
      setActualCash(''); setOpeningCash(''); setNotes('')
      fetchLog()
    } catch (err) {
      setFormErr(err.message || 'Failed to save reconciliation')
    } finally { setSubmitting(false) }
  }

  const totals = log.reduce((acc, r) => ({
    cash:   acc.cash   + r.cash_sales,
    card:   acc.card   + r.card_sales,
    upi:    acc.upi    + r.upi_sales,
    credit: acc.credit + r.credit_sales,
  }), { cash: 0, card: 0, upi: 0, credit: 0 })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* ── Form ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="font-semibold text-gray-800 mb-4">Close Shift</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input" value={shiftDate} onChange={e => setShiftDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Shift</label>
              <select className="input" value={shift} onChange={e => setShift(e.target.value)}>
                <option value="day">Day</option>
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
                <option value="night">Night</option>
              </select>
            </div>
            <div>
              <label className="label">Opening Cash ₹</label>
              <input type="number" className="input" min="0" step="0.01" placeholder="0.00"
                value={openingCash} onChange={e => setOpeningCash(e.target.value)} />
            </div>
            <div>
              <label className="label">Actual Cash in Drawer ₹ *</label>
              <input type="number" className="input" min="0" step="0.01" placeholder="Count & enter"
                value={actualCash} onChange={e => setActualCash(e.target.value)} required />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className="input" value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Any discrepancy note..." />
            </div>
          </div>

          {formErr && (
            <p className="text-red-500 text-sm flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />{formErr}
            </p>
          )}

          {lastResult && (
            <div className={`rounded-xl border p-4 text-sm ${lastResult.difference === 0 ? 'bg-green-50 border-green-200' : Math.abs(lastResult.difference) < 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2 font-semibold mb-3">
                <CheckCircle className="w-4 h-4 text-green-600" /> Shift Closed — {lastResult.shift_date}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {[
                  ['Cash Sales', lastResult.cash_sales],
                  ['Card Sales', lastResult.card_sales],
                  ['UPI Sales', lastResult.upi_sales],
                  ['Credit Sales', lastResult.credit_sales],
                  ['Returns', lastResult.total_returns],
                  ['Expected Cash', lastResult.expected_cash],
                  ['Actual Cash', lastResult.actual_cash],
                ].map(([label, val]) => (
                  <div key={label} className="bg-white rounded-lg p-2 border border-gray-100">
                    <div className="text-gray-500">{label}</div>
                    <div className="font-bold text-gray-800">₹{Number(val).toFixed(2)}</div>
                  </div>
                ))}
                <div className={`rounded-lg p-2 border ${lastResult.difference === 0 ? 'bg-green-100 border-green-200' : 'bg-red-100 border-red-200'}`}>
                  <div className="text-gray-600">Difference</div>
                  <div className={`font-bold text-lg ${lastResult.difference >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {lastResult.difference >= 0 ? '+' : ''}₹{Number(lastResult.difference).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          <button type="submit" disabled={submitting}
            className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            {submitting ? 'Saving…' : 'Close Shift & Reconcile'}
          </button>
        </form>
      </div>

      {/* ── Summary cards ── */}
      {log.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Cash', value: totals.cash, icon: TrendingUp, color: 'text-green-600' },
            { label: 'Card', value: totals.card, icon: TrendingUp, color: 'text-blue-600' },
            { label: 'UPI',  value: totals.upi,  icon: TrendingUp, color: 'text-purple-600' },
            { label: 'Credit', value: totals.credit, icon: TrendingDown, color: 'text-amber-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1"><Icon size={13} className={color} />{label}</div>
              <div className="text-lg font-bold text-gray-800">₹{value.toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── History ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Reconciliation History</h2>
          <button onClick={() => downloadCSV(log)} disabled={!log.length}
            className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-40">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
        <div className="flex gap-3 mb-4">
          <input type="date" className="input w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <input type="date" className="input w-36" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        {logLoading ? (
          <div className="py-10 text-center text-gray-400 text-sm">Loading…</div>
        ) : logErr ? (
          <div className="py-10 text-center text-red-500 text-sm">{logErr}</div>
        ) : log.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">No reconciliations in this period</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Date', 'Shift', 'Cash Sales', 'Card', 'UPI', 'Returns', 'Expected', 'Actual', 'Diff'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {log.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap text-xs">{r.shift_date}</td>
                    <td className="px-3 py-2.5 capitalize text-gray-600 text-xs">{r.shift}</td>
                    <td className="px-3 py-2.5 text-gray-800">₹{r.cash_sales.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-gray-600">₹{r.card_sales.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-gray-600">₹{r.upi_sales.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-red-600">₹{r.total_returns.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-gray-700">₹{r.expected_cash.toFixed(2)}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-800">₹{r.actual_cash.toFixed(2)}</td>
                    <td className="px-3 py-2.5">{diffBadge(r.difference)}</td>
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
