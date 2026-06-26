import { useState } from 'react'
import api from '../api/client'
import { ChevronDown, ChevronRight, Download, Search, Loader2, AlertCircle } from 'lucide-react'

function todayStr() { return new Date().toISOString().split('T')[0] }

function downloadCSV(invoices, mobile) {
  const rows = []
  rows.push(['Invoice', 'Date', 'Medicine', 'Qty', 'Unit Price', 'Total', 'Type'])
  invoices.forEach(inv => {
    inv.items.forEach(item => {
      rows.push([
        inv.invoice_number,
        inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-IN') : '',
        `"${item.description}"`,
        item.quantity,
        item.unit_price.toFixed(2),
        item.total.toFixed(2),
        inv.sale_type,
      ])
    })
  })
  const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `medication-history-${mobile}-${todayStr()}.csv`
  a.click()
}

export default function PatientMedicationHistory() {
  const [mobile, setMobile]         = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [invoices, setInvoices]     = useState(null)
  const [expanded, setExpanded]     = useState({})

  async function handleSearch(e) {
    e.preventDefault()
    const m = mobile.replace(/\D/g, '')
    if (m.length !== 10) { setError('Enter a valid 10-digit mobile number'); return }
    setError(''); setLoading(true); setInvoices(null); setExpanded({})
    try {
      const res = await api.get('/pharmacy/patient-medication-history', { params: { mobile: m } })
      setInvoices(res.invoices || [])
    } catch (err) {
      setError(err.message || 'Failed to load history')
    } finally { setLoading(false) }
  }

  const totalSpend = invoices ? invoices.reduce((s, inv) => s + inv.total, 0) : 0
  const patientName = invoices?.[0]?.customer_name

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <form onSubmit={handleSearch} className="bg-white rounded-xl border border-gray-200 p-5 mb-6 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Enter 10-digit mobile number..."
            value={mobile}
            maxLength={10}
            onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm mb-4">
          <AlertCircle className="w-4 h-4" />{error}
        </div>
      )}

      {invoices !== null && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              {patientName && patientName !== 'Walk-in' && (
                <div className="font-semibold text-gray-800">{patientName}</div>
              )}
              <div className="text-sm text-gray-500">
                {mobile} · {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} · Total spend: <strong className="text-gray-800">₹{totalSpend.toFixed(2)}</strong>
              </div>
            </div>
            {invoices.length > 0 && (
              <button onClick={() => downloadCSV(invoices, mobile)}
                className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                <Download className="w-4 h-4" /> Export CSV
              </button>
            )}
          </div>

          {invoices.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">No purchase history found for this mobile number</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {invoices.map(inv => (
                <div key={inv.id}>
                  <button
                    className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    onClick={() => setExpanded(e => ({ ...e, [inv.id]: !e[inv.id] }))}
                  >
                    <div className="flex items-center gap-3">
                      {expanded[inv.id]
                        ? <ChevronDown className="w-4 h-4 text-gray-400" />
                        : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      <div className="text-left">
                        <div className="font-medium text-gray-800 text-sm">{inv.invoice_number}</div>
                        <div className="text-xs text-gray-400">
                          {inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          {' · '}{inv.items.length} item{inv.items.length !== 1 ? 's' : ''}
                          {' · '}<span className="uppercase">{inv.payment_method || '—'}</span>
                        </div>
                      </div>
                    </div>
                    <span className="font-semibold text-gray-800">₹{inv.total.toFixed(2)}</span>
                  </button>
                  {expanded[inv.id] && (
                    <div className="px-5 pb-3">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-500 uppercase">
                            <th className="text-left py-1.5 pr-4">Medicine</th>
                            <th className="text-right py-1.5 pr-4">Qty</th>
                            <th className="text-right py-1.5 pr-4">Unit ₹</th>
                            <th className="text-right py-1.5">Total ₹</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {inv.items.map((item, i) => (
                            <tr key={i} className="text-gray-700">
                              <td className="py-1.5 pr-4">{item.description}</td>
                              <td className="py-1.5 pr-4 text-right">{item.quantity}</td>
                              <td className="py-1.5 pr-4 text-right">{item.unit_price.toFixed(2)}</td>
                              <td className="py-1.5 text-right font-medium">{item.total.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
