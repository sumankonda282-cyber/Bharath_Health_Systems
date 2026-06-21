import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/client'
import { ClipboardEdit, CheckCircle, AlertCircle, Download, Search, RefreshCw } from 'lucide-react'

const ADJ_TYPES = [
  { value: 'increase',         label: 'Increase Stock',   color: 'bg-green-100 text-green-700' },
  { value: 'decrease',         label: 'Decrease Stock',   color: 'bg-red-100 text-red-700' },
  { value: 'damage_writeoff',  label: 'Damage Write-off', color: 'bg-red-100 text-red-700' },
  { value: 'expiry_writeoff',  label: 'Expiry Write-off', color: 'bg-orange-100 text-orange-700' },
  { value: 'count_correction', label: 'Count Correction', color: 'bg-yellow-100 text-yellow-700' },
]

function typeBadge(type) {
  const t = ADJ_TYPES.find(x => x.value === type)
  return t
    ? <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${t.color}`}>{t.label}</span>
    : <span className="text-xs text-gray-400">{type}</span>
}

function todayStr() { return new Date().toISOString().split('T')[0] }
function monthStart() { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0] }

function downloadCSV(rows) {
  const headers = ['Date', 'Medicine', 'Type', 'Before', 'Change', 'After', 'Reason', 'Notes']
  const lines = [
    headers.join(','),
    ...rows.map(r => [
      new Date(r.created_at).toLocaleString('en-IN'),
      `"${(r.medicine_name || '').replace(/"/g, '""')}"`,
      r.adjustment_type,
      r.quantity_before, r.quantity_change, r.quantity_after,
      `"${(r.reason || '').replace(/"/g, '""')}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ].join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `stock-adjustments-${todayStr()}.csv`
  a.click()
}

export default function StockAdjustment() {
  const [searchParams] = useSearchParams()
  const prefillId   = searchParams.get('medicine_id')
  const prefillName = searchParams.get('medicine_name')

  // ── Form state ──
  const [medQuery, setMedQuery]       = useState(prefillName || '')
  const [medResults, setMedResults]   = useState([])
  const [selectedMed, setSelectedMed] = useState(null)
  const [adjType, setAdjType]         = useState('increase')
  const [qty, setQty]                 = useState('')
  const [reason, setReason]           = useState('')
  const [notes, setNotes]             = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [success, setSuccess]         = useState('')
  const [formErr, setFormErr]         = useState('')

  // ── Log state ──
  const [log, setLog]               = useState([])
  const [logLoading, setLogLoading] = useState(true)
  const [logErr, setLogErr]         = useState('')
  const [fromDate, setFromDate]     = useState(monthStart())
  const [toDate, setToDate]         = useState(todayStr())
  const [filterType, setFilterType] = useState('')

  // pre-fill from URL params
  useEffect(() => {
    if (prefillId) {
      api.get(`/pharmacy/medicines/${prefillId}`)
        .then(m => { setSelectedMed(m); setMedQuery(m.name || prefillName || '') })
        .catch(() => {
          if (prefillName) setMedQuery(prefillName)
        })
    }
  }, []) // eslint-disable-line

  // medicine autocomplete
  const searchMeds = useCallback(async (q) => {
    if (q.length < 2) { setMedResults([]); return }
    try {
      const res = await api.get('/pharmacy/medicines', { params: { search: q, limit: 10 } })
      setMedResults(Array.isArray(res) ? res : res.medicines || [])
    } catch { setMedResults([]) }
  }, [])

  useEffect(() => {
    if (selectedMed) return
    const t = setTimeout(() => searchMeds(medQuery), 300)
    return () => clearTimeout(t)
  }, [medQuery, selectedMed, searchMeds])

  // log fetch
  const fetchLog = useCallback(async () => {
    setLogLoading(true); setLogErr('')
    try {
      const res = await api.get('/pharmacy/stock-adjustments', {
        params: { from_date: fromDate, to_date: toDate, adjustment_type: filterType || undefined },
      })
      setLog(res.adjustments || [])
    } catch { setLogErr('Failed to load adjustment log') }
    finally { setLogLoading(false) }
  }, [fromDate, toDate, filterType])

  useEffect(() => { fetchLog() }, [fetchLog])

  async function handleSubmit(e) {
    e.preventDefault()
    setFormErr(''); setSuccess('')
    if (!selectedMed) { setFormErr('Select a medicine'); return }
    if (!qty || parseInt(qty) <= 0) { setFormErr('Enter a valid quantity'); return }
    if (!reason.trim()) { setFormErr('Reason is required'); return }
    setSubmitting(true)
    try {
      await api.post('/pharmacy/stock-adjustments', {
        medicine_id:     selectedMed.id,
        adjustment_type: adjType,
        quantity_change: parseInt(qty),
        reason:          reason.trim(),
        notes:           notes.trim() || undefined,
      })
      setSuccess('Stock adjusted successfully')
      setSelectedMed(null); setMedQuery(''); setQty(''); setReason(''); setNotes('')
      fetchLog()
    } catch (err) {
      setFormErr(err.message || 'Adjustment failed')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="page-header mb-6">
        <h1 className="page-title flex items-center gap-2">
          <ClipboardEdit className="w-5 h-5" /> Stock Adjustment
        </h1>
      </div>

      {/* ── New Adjustment Form ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="font-semibold text-gray-800 mb-4">New Adjustment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Medicine search */}
          <div className="relative">
            <label className="label">Medicine *</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input pl-9"
                placeholder="Search medicine name..."
                value={medQuery}
                onChange={e => { setSelectedMed(null); setMedQuery(e.target.value) }}
              />
            </div>
            {medResults.length > 0 && !selectedMed && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {medResults.map(m => (
                  <button key={m.id} type="button"
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0"
                    onClick={() => { setSelectedMed(m); setMedQuery(m.name); setMedResults([]) }}>
                    <span className="font-medium">{m.name}</span>
                    <span className="ml-2 text-gray-400">Stock: {m.stock_quantity ?? '—'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedMed && (
            <p className="text-sm text-gray-500">
              Current stock: <strong className="text-gray-800">{selectedMed.stock_quantity ?? '—'}</strong> units
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Adjustment Type *</label>
              <select className="input" value={adjType} onChange={e => setAdjType(e.target.value)}>
                {ADJ_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Quantity *</label>
              <input className="input" type="number" min="1" value={qty}
                onChange={e => setQty(e.target.value)} placeholder="Units to adjust" />
            </div>
          </div>

          <div>
            <label className="label">Reason *</label>
            <input className="input" value={reason} onChange={e => setReason(e.target.value)}
              placeholder="e.g. Physical count mismatch, damaged in storage..." />
          </div>

          <div>
            <label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Additional details..." />
          </div>

          {formErr && (
            <p className="text-red-500 text-sm flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />{formErr}
            </p>
          )}
          {success && (
            <p className="text-green-600 text-sm flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />{success}
            </p>
          )}

          <button type="submit" disabled={submitting}
            className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {submitting
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <ClipboardEdit className="w-4 h-4" />}
            {submitting ? 'Saving...' : 'Save Adjustment'}
          </button>
        </form>
      </div>

      {/* ── Adjustment Log ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Adjustment Log</h2>
          <button onClick={() => downloadCSV(log)} disabled={!log.length}
            className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-40">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <input type="date" className="input w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <input type="date" className="input w-36" value={toDate} onChange={e => setToDate(e.target.value)} />
          <select className="input w-44" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {ADJ_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {logLoading ? (
          <div className="py-10 text-center text-gray-400 text-sm">Loading...</div>
        ) : logErr ? (
          <div className="py-10 text-center text-red-500 text-sm">{logErr}</div>
        ) : log.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">No adjustments found for this period</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Date', 'Medicine', 'Type', 'Before', 'Change', 'After', 'Reason'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {log.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap text-xs">
                      {new Date(r.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-gray-800">{r.medicine_name}</td>
                    <td className="px-3 py-2.5">{typeBadge(r.adjustment_type)}</td>
                    <td className="px-3 py-2.5 text-center text-gray-600">{r.quantity_before}</td>
                    <td className="px-3 py-2.5 text-center font-mono font-semibold">
                      <span className={r.adjustment_type === 'increase' ? 'text-green-600' : 'text-red-600'}>
                        {r.adjustment_type === 'increase' ? '+' : '-'}{r.quantity_change}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-semibold text-gray-800">{r.quantity_after}</td>
                    <td className="px-3 py-2.5 text-gray-500 max-w-xs truncate">{r.reason}</td>
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
