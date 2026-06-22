import { useState, useEffect, useMemo, useCallback } from 'react'
import api from '../api/client'
import { ReceiptText, Loader2, AlertTriangle, Download, Printer, RefreshCw, FileText, ChevronDown, ChevronUp } from 'lucide-react'

function todayStr() { return new Date().toISOString().slice(0, 10) }
function monthStart() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function downloadCSV(rows, headers, filename) {
  const lines = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function printSection(title, tableHTML) {
  const win = window.open('', '_blank')
  win.document.write(`<html><head><title>${title}</title><style>
    body{font-family:sans-serif;padding:20px;font-size:13px}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #ccc;padding:6px 10px}
    th{background:#f3f4f6}h2{margin-bottom:12px}
  </style></head><body><h2>${title}</h2>${tableHTML}</body></html>`)
  win.document.close(); win.print()
}

const QUICK_RANGES = [
  { label: 'This Month', from: monthStart(), to: todayStr() },
  { label: 'Last Month', from: (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10) })(), to: (() => { const d = new Date(); d.setDate(0); return d.toISOString().slice(0, 10) })() },
  { label: 'This Quarter', from: (() => { const d = new Date(); const q = Math.floor(d.getMonth() / 3); return new Date(d.getFullYear(), q * 3, 1).toISOString().slice(0, 10) })(), to: todayStr() },
  { label: 'This FY', from: (() => { const y = new Date().getFullYear(); const m = new Date().getMonth(); return `${m >= 3 ? y : y - 1}-04-01` })(), to: todayStr() },
]

function SummaryTile({ label, value, sub, color }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function CollapsibleSection({ title, icon: Icon, iconColor, iconBg, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card overflow-hidden">
      <button className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: iconBg }}>
            <Icon size={17} style={{ color: iconColor }} />
          </div>
          <span className="font-semibold text-gray-800">{title}</span>
        </div>
        {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>
      {open && <div className="border-t border-gray-100 px-5 py-5">{children}</div>}
    </div>
  )
}

/* ── GST Summary by Slab ── */
function GstSlabSummary({ invoices, fromDate, toDate }) {
  const slabData = useMemo(() => {
    const filtered = invoices.filter(inv => {
      const d = (inv.created_at || '').slice(0, 10)
      return d >= fromDate && d <= toDate && inv.status !== 'cancelled'
    })
    const slabs = {}
    filtered.forEach(inv => {
      const gst = Number(inv.gst_amount) || 0
      const total = Number(inv.total_amount || inv.total) || 0
      const taxable = total - gst
      const key = gst > 0 ? 'Taxable' : 'Exempt/0%'
      if (!slabs[key]) slabs[key] = { taxable: 0, gst: 0, cgst: 0, sgst: 0, invoices: 0 }
      slabs[key].taxable += taxable
      slabs[key].gst += gst
      slabs[key].cgst += gst / 2
      slabs[key].sgst += gst / 2
      slabs[key].invoices += 1
    })
    const totals = Object.values(slabs).reduce((s, v) => ({
      taxable: s.taxable + v.taxable, gst: s.gst + v.gst,
      cgst: s.cgst + v.cgst, sgst: s.sgst + v.sgst, invoices: s.invoices + v.invoices,
    }), { taxable: 0, gst: 0, cgst: 0, sgst: 0, invoices: 0 })
    return { slabs, totals }
  }, [invoices, fromDate, toDate])

  function doPrint() {
    const rows = Object.entries(slabData.slabs).map(([slab, d]) =>
      `<tr><td>${slab}</td><td>₹${d.taxable.toFixed(2)}</td><td>₹${d.cgst.toFixed(2)}</td><td>₹${d.sgst.toFixed(2)}</td><td>₹${d.gst.toFixed(2)}</td><td>${d.invoices}</td></tr>`
    ).join('')
    printSection(`GST Summary (${fromDate} to ${toDate})`,
      `<table><thead><tr><th>Slab</th><th>Taxable Amount</th><th>CGST</th><th>SGST</th><th>Total GST</th><th>Invoices</th></tr></thead><tbody>${rows}</tbody></table>`)
  }

  function doCSV() {
    downloadCSV(
      Object.entries(slabData.slabs).map(([slab, d]) => ({
        slab, taxable_amount: d.taxable.toFixed(2),
        cgst: d.cgst.toFixed(2), sgst: d.sgst.toFixed(2),
        total_gst: d.gst.toFixed(2), invoices: d.invoices,
      })),
      ['slab', 'taxable_amount', 'cgst', 'sgst', 'total_gst', 'invoices'],
      `gst-summary-${fromDate}-${toDate}.csv`
    )
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={doPrint} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"><Printer size={14} />Print</button>
        <button onClick={doCSV} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"><Download size={14} />CSV</button>
      </div>
      <div className="table-wrapper">
        <table className="table text-sm">
          <thead><tr>
            <th className="th">Slab</th>
            <th className="th">Taxable Amount</th>
            <th className="th">CGST (50%)</th>
            <th className="th">SGST (50%)</th>
            <th className="th">Total GST</th>
            <th className="th">No. of Invoices</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {Object.entries(slabData.slabs).map(([slab, d]) => (
              <tr key={slab} className="tr-hover">
                <td className="td font-medium">{slab}</td>
                <td className="td">₹{d.taxable.toFixed(2)}</td>
                <td className="td">₹{d.cgst.toFixed(2)}</td>
                <td className="td">₹{d.sgst.toFixed(2)}</td>
                <td className="td font-semibold">₹{d.gst.toFixed(2)}</td>
                <td className="td text-gray-500">{d.invoices}</td>
              </tr>
            ))}
            {Object.keys(slabData.slabs).length === 0 && (
              <tr><td colSpan={6} className="td text-center text-gray-400 py-6">No invoices for this period</td></tr>
            )}
            {Object.keys(slabData.slabs).length > 1 && (
              <tr className="bg-blue-50 font-semibold">
                <td className="td" style={{ color: '#0F2557' }}>Total</td>
                <td className="td">₹{slabData.totals.taxable.toFixed(2)}</td>
                <td className="td">₹{slabData.totals.cgst.toFixed(2)}</td>
                <td className="td">₹{slabData.totals.sgst.toFixed(2)}</td>
                <td className="td" style={{ color: '#0F2557' }}>₹{slabData.totals.gst.toFixed(2)}</td>
                <td className="td">{slabData.totals.invoices}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Invoice-level GST detail ── */
function InvoiceGstDetail({ invoices, fromDate, toDate }) {
  const filtered = useMemo(() =>
    invoices
      .filter(inv => {
        const d = (inv.created_at || '').slice(0, 10)
        return d >= fromDate && d <= toDate && inv.status !== 'cancelled'
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [invoices, fromDate, toDate]
  )

  function doCSV() {
    downloadCSV(
      filtered.map(inv => ({
        invoice_number: inv.invoice_number || `INV-${inv.id}`,
        date: (inv.created_at || '').slice(0, 10),
        customer: inv.customer_name || inv.patient_name || 'Walk-in',
        total_amount: Number(inv.total_amount || inv.total || 0).toFixed(2),
        gst_amount: Number(inv.gst_amount || 0).toFixed(2),
        taxable_value: (Number(inv.total_amount || inv.total || 0) - Number(inv.gst_amount || 0)).toFixed(2),
        status: inv.status || '',
      })),
      ['invoice_number', 'date', 'customer', 'total_amount', 'gst_amount', 'taxable_value', 'status'],
      `invoice-gst-detail-${fromDate}-${toDate}.csv`
    )
  }

  if (filtered.length === 0) return <p className="text-gray-400 text-sm text-center py-6">No invoices for this period.</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{filtered.length} invoices</p>
        <button onClick={doCSV} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"><Download size={14} />CSV</button>
      </div>
      <div className="table-wrapper">
        <table className="table text-sm">
          <thead><tr>
            <th className="th">Invoice #</th>
            <th className="th">Date</th>
            <th className="th">Customer</th>
            <th className="th">Taxable Value</th>
            <th className="th">GST Amount</th>
            <th className="th">Total</th>
            <th className="th">Status</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(inv => {
              const total = Number(inv.total_amount || inv.total || 0)
              const gst = Number(inv.gst_amount || 0)
              return (
                <tr key={inv.id} className="tr-hover">
                  <td className="td font-mono text-xs text-gray-500">{inv.invoice_number || `INV-${inv.id}`}</td>
                  <td className="td text-gray-500 text-xs whitespace-nowrap">{(inv.created_at || '').slice(0, 10)}</td>
                  <td className="td">{inv.customer_name || inv.patient_name || 'Walk-in'}</td>
                  <td className="td">₹{(total - gst).toFixed(2)}</td>
                  <td className="td font-medium">₹{gst.toFixed(2)}</td>
                  <td className="td font-semibold">₹{total.toFixed(2)}</td>
                  <td className="td">
                    <span className={`badge ${inv.status === 'paid' ? 'badge-green' : inv.status === 'pending' ? 'badge-yellow' : 'badge-gray'}`}>
                      {inv.status || '—'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── HSN-wise GSTR-1 ── */
function HsnGstrReport({ fromDate, toDate }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    setLoading(true); setErr('')
    api.get('/pharmacy/reports/hsn-gst', { params: { from_date: fromDate, to_date: toDate } })
      .then(r => setData(Array.isArray(r) ? r : []))
      .catch(ex => setErr(ex.message || 'Failed'))
      .finally(() => setLoading(false))
  }, [fromDate, toDate])

  function doPrint() {
    if (!data) return
    const rows = data.map(r => `<tr><td>${r.hsn_code}</td><td>${r.gst_rate}%</td><td>₹${Number(r.taxable_value||0).toFixed(2)}</td><td>₹${Number(r.cgst||0).toFixed(2)}</td><td>₹${Number(r.sgst||0).toFixed(2)}</td><td>₹${Number(r.igst||0).toFixed(2)}</td><td>₹${Number(r.total_gst||0).toFixed(2)}</td><td>${r.invoice_count}</td></tr>`).join('')
    printSection(`GSTR-1 HSN-wise (${fromDate} to ${toDate})`,
      `<table><thead><tr><th>HSN</th><th>GST Rate</th><th>Taxable Value</th><th>CGST</th><th>SGST</th><th>IGST</th><th>Total GST</th><th>Invoices</th></tr></thead><tbody>${rows}</tbody></table>`)
  }

  function doCSV() {
    if (!data) return
    downloadCSV(
      data.map(r => ({
        hsn_code: r.hsn_code, gst_rate: r.gst_rate,
        taxable_value: Number(r.taxable_value||0).toFixed(2),
        cgst: Number(r.cgst||0).toFixed(2), sgst: Number(r.sgst||0).toFixed(2),
        igst: Number(r.igst||0).toFixed(2), total_gst: Number(r.total_gst||0).toFixed(2),
        invoice_count: r.invoice_count,
      })),
      ['hsn_code', 'gst_rate', 'taxable_value', 'cgst', 'sgst', 'igst', 'total_gst', 'invoice_count'],
      `gstr1-hsn-${fromDate}-${toDate}.csv`
    )
  }

  return (
    <div>
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 text-xs text-blue-700">
        GSTR-1 HSN-wise summary — CGST and SGST are each 50% of total GST (intrastate). Interstate supply flows into IGST.
      </div>
      <div className="flex gap-2 mb-4">
        <button onClick={load} className="btn-primary text-sm py-1.5 px-4">Generate</button>
        {data && <>
          <button onClick={doPrint} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"><Printer size={14} />Print</button>
          <button onClick={doCSV} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"><Download size={14} />CSV</button>
        </>}
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-gray-400" /></div>
      ) : err ? (
        <p className="text-red-500 text-sm">{err}</p>
      ) : data && data.length > 0 ? (
        <div className="table-wrapper">
          <table className="table text-sm">
            <thead><tr>
              <th className="th">HSN Code</th>
              <th className="th">GST Rate</th>
              <th className="th">Taxable Value</th>
              <th className="th">CGST</th>
              <th className="th">SGST</th>
              <th className="th">IGST</th>
              <th className="th">Total GST</th>
              <th className="th">Invoices</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((r, i) => (
                <tr key={i} className="tr-hover">
                  <td className="td font-mono font-medium">{r.hsn_code || '—'}</td>
                  <td className="td text-gray-600">{r.gst_rate}%</td>
                  <td className="td">₹{Number(r.taxable_value||0).toFixed(2)}</td>
                  <td className="td">₹{Number(r.cgst||0).toFixed(2)}</td>
                  <td className="td">₹{Number(r.sgst||0).toFixed(2)}</td>
                  <td className="td text-gray-400">₹{Number(r.igst||0).toFixed(2)}</td>
                  <td className="td font-semibold">₹{Number(r.total_gst||0).toFixed(2)}</td>
                  <td className="td text-gray-500">{r.invoice_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : data ? (
        <p className="text-gray-400 text-sm text-center py-4">No HSN data for this period.</p>
      ) : (
        <p className="text-gray-400 text-sm text-center py-4">Click Generate to load HSN-wise GSTR-1 data.</p>
      )}
    </div>
  )
}

export default function GstReport() {
  const [fromDate, setFromDate] = useState(monthStart())
  const [toDate, setToDate] = useState(todayStr())
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const load = useCallback((invalidate = false) => {
    setLoading(true); setErr('')
    api.get('/billing/invoices', { params: { limit: 1000 } })
      .then(r => setInvoices(Array.isArray(r) ? r : []))
      .catch(ex => setErr(ex.message || 'Failed to load invoices'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  function applyRange(r) { setFromDate(r.from); setToDate(r.to) }

  const summary = useMemo(() => {
    const filtered = invoices.filter(inv => {
      const d = (inv.created_at || '').slice(0, 10)
      return d >= fromDate && d <= toDate && inv.status !== 'cancelled'
    })
    const totalSales = filtered.reduce((s, i) => s + Number(i.total_amount || i.total || 0), 0)
    const totalGst   = filtered.reduce((s, i) => s + Number(i.gst_amount || 0), 0)
    const taxable    = totalSales - totalGst
    return { totalSales, totalGst, taxable, cgst: totalGst / 2, sgst: totalGst / 2, count: filtered.length }
  }, [invoices, fromDate, toDate])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">GST / GSTR-1 Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tax collection summary for filing GST returns</p>
        </div>
        <button onClick={() => load()} className="btn-secondary" disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Refresh
        </button>
      </div>

      {/* Date controls */}
      <div className="card p-4 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1.5 mb-0.5">
            {QUICK_RANGES.map(r => (
              <button
                key={r.label}
                onClick={() => applyRange(r)}
                className={`filter-chip text-xs ${fromDate === r.from && toDate === r.to ? 'border-blue-400 text-blue-700 bg-blue-50' : ''}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-gray-400" /></div>
      ) : err ? (
        <div className="card p-10 text-center">
          <AlertTriangle size={28} className="mx-auto mb-2 text-red-500" />
          <p className="text-red-600">{err}</p>
          <button onClick={() => load()} className="btn-secondary mt-3">Retry</button>
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
            <SummaryTile label="Total Sales" value={`₹${summary.totalSales.toFixed(0)}`} sub={`${summary.count} invoices`} color="#0F2557" />
            <SummaryTile label="Taxable Value" value={`₹${summary.taxable.toFixed(0)}`} color="#1e40af" />
            <SummaryTile label="Total GST" value={`₹${summary.totalGst.toFixed(2)}`} color="#7c3aed" />
            <SummaryTile label="CGST" value={`₹${summary.cgst.toFixed(2)}`} sub="50% of GST" color="#0369a1" />
            <SummaryTile label="SGST" value={`₹${summary.sgst.toFixed(2)}`} sub="50% of GST" color="#0369a1" />
          </div>

          <div className="space-y-4">
            <CollapsibleSection title="GST Summary by Slab" icon={ReceiptText} iconColor="#7c3aed" iconBg="#7c3aed18" defaultOpen>
              <GstSlabSummary invoices={invoices} fromDate={fromDate} toDate={toDate} />
            </CollapsibleSection>

            <CollapsibleSection title="HSN-wise GSTR-1" icon={FileText} iconColor="#0F2557" iconBg="#0F255718">
              <HsnGstrReport fromDate={fromDate} toDate={toDate} />
            </CollapsibleSection>

            <CollapsibleSection title="Invoice-level GST Detail" icon={ReceiptText} iconColor="#F5821E" iconBg="#F5821E18">
              <InvoiceGstDetail invoices={invoices} fromDate={fromDate} toDate={toDate} />
            </CollapsibleSection>
          </div>
        </>
      )}
    </div>
  )
}
