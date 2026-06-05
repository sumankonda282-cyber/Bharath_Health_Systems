import { useState, useEffect, useMemo } from 'react'
import api from '../api/client'
import { BarChart2, ChevronDown, ChevronUp, Loader2, AlertTriangle, Package, Printer, Download, TrendingUp, Building2, ListOrdered, FileText } from 'lucide-react'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] || 'Uncategorized'
    acc[k] = acc[k] || []
    acc[k].push(item)
    return acc
  }, {})
}

function downloadCSV(rows, headers, filename) {
  const lines = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function printTable(title, tableHTML) {
  const win = window.open('', '_blank')
  win.document.write(`<html><head><title>${title}</title><style>body{font-family:sans-serif;padding:20px;font-size:13px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ccc;padding:6px 10px;}th{background:#f3f4f6;}h2{margin-bottom:12px;}</style></head><body><h2>${title}</h2>${tableHTML}</body></html>`)
  win.document.close()
  win.print()
}

function ReportCard({ title, icon: Icon, iconColor, iconBg, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card overflow-hidden">
      <button
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
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

/* ── Daily Dispensing ── */
function DailyDispensing() {
  const [date, setDate] = useState(todayStr())
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get('/pharmacy/all')
      .then(r => setPrescriptions(Array.isArray(r) ? r : []))
      .catch(ex => setError(ex.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const dayRx = useMemo(() =>
    prescriptions.filter(rx => rx.status === 'dispensed' && rx.created_at && rx.created_at.slice(0, 10) === date),
    [prescriptions, date]
  )

  const allItems = dayRx.flatMap(rx => rx.items || [])
  const totalItems = allItems.length

  const medUsage = useMemo(() => {
    const counts = {}
    allItems.forEach(item => {
      const name = item.medicine_name || item.drug_name || 'Unknown'
      counts[name] = (counts[name] || 0) + (item.quantity || 1)
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [allItems])

  function doPrint() {
    const rows = medUsage.map(([name, qty], i) => `<tr><td>${i + 1}</td><td>${name}</td><td>${qty}</td></tr>`).join('')
    printTable(`Daily Dispensing — ${date}`, `<table><thead><tr><th>#</th><th>Medicine</th><th>Qty Used</th></tr></thead><tbody>${rows}</tbody></table>`)
  }

  function doCSV() {
    downloadCSV(
      medUsage.map(([name, qty]) => ({ medicine: name, qty_used: qty })),
      ['medicine', 'qty_used'],
      `dispensing-${date}.csv`
    )
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
  if (error) return <p className="text-red-500 text-sm">{error}</p>

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div>
          <label className="label">Select Date</label>
          <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={doPrint} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"><Printer size={14} />Print</button>
          <button onClick={doCSV} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"><Download size={14} />CSV</button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: '#0F2557' }}>{dayRx.length}</div>
          <div className="text-xs text-gray-500 mt-1">Rx Dispensed</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{totalItems}</div>
          <div className="text-xs text-gray-500 mt-1">Total Items</div>
        </div>
      </div>
      {medUsage.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-4">No dispensing data for this date.</p>
      ) : (
        <div className="table-wrapper">
          <table className="table text-sm">
            <thead><tr><th className="th">#</th><th className="th">Medicine</th><th className="th">Qty Used</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {medUsage.map(([name, qty], i) => (
                <tr key={name} className="tr-hover">
                  <td className="td text-gray-400">{i + 1}</td>
                  <td className="td font-medium">{name}</td>
                  <td className="td font-semibold">{qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Low Stock ── */
function LowStockReport() {
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get('/pharmacy/medicines', { params: { limit: 500 } })
      .then(r => setMedicines(Array.isArray(r) ? r : []))
      .catch(ex => setError(ex.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const lowStock = useMemo(() =>
    medicines.filter(m => (m.stock_quantity || 0) <= (m.reorder_level || 10)),
    [medicines]
  )

  function doPrint() {
    const rows = lowStock.map(m => `<tr><td>${m.name}</td><td>${m.stock_quantity || 0}</td><td>${m.reorder_level || 10}</td><td>${m.form || '—'}</td><td>${(m.stock_quantity || 0) === 0 ? 'Critical' : 'Low Stock'}</td></tr>`).join('')
    printTable('Low Stock Report', `<table><thead><tr><th>Medicine</th><th>Current Stock</th><th>Reorder Level</th><th>Unit</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`)
  }

  function doCSV() {
    downloadCSV(
      lowStock.map(m => ({ medicine: m.name, stock: m.stock_quantity, reorder: m.reorder_level, unit: m.form })),
      ['medicine', 'stock', 'reorder', 'unit'],
      'low-stock-report.csv'
    )
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
  if (error) return <p className="text-red-500 text-sm">{error}</p>
  if (lowStock.length === 0) return <p className="text-green-600 text-sm text-center py-4 font-medium">All medicines are adequately stocked.</p>

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={doPrint} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"><Printer size={14} />Print</button>
        <button onClick={doCSV} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"><Download size={14} />CSV</button>
      </div>
      <div className="table-wrapper">
        <table className="table text-sm">
          <thead>
            <tr>
              <th className="th">Medicine</th>
              <th className="th">Current Stock</th>
              <th className="th">Reorder Level</th>
              <th className="th">Unit</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lowStock.map(m => {
              const stock = m.stock_quantity || 0
              const reorder = m.reorder_level || 10
              const isCritical = stock === 0
              return (
                <tr key={m.id} className="tr-hover" style={isCritical ? { background: '#fee2e2' } : { background: '#fff7ed' }}>
                  <td className="td font-medium">{m.name}</td>
                  <td className="td font-bold" style={isCritical ? { color: '#CC1414' } : { color: '#F5821E' }}>{stock}</td>
                  <td className="td text-gray-500">{reorder}</td>
                  <td className="td capitalize text-gray-500">{m.form || '—'}</td>
                  <td className="td"><span className={`badge ${isCritical ? 'badge-red' : 'badge-yellow'}`}>{isCritical ? 'Critical' : 'Low Stock'}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Inventory Summary ── */
function InventorySummary() {
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get('/pharmacy/medicines', { params: { limit: 500 } })
      .then(r => setMedicines(Array.isArray(r) ? r : []))
      .catch(ex => setError(ex.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const byCategory = groupBy(medicines, 'category')
    const totalValue = medicines.reduce((s, m) => s + (m.stock_quantity || 0) * (m.unit_price || 0), 0)
    const outOfStock = medicines.filter(m => (m.stock_quantity || 0) === 0).length
    const maxInCat = Math.max(...Object.values(byCategory).map(arr => arr.length), 1)
    return { byCategory, totalValue, outOfStock, maxInCat }
  }, [medicines])

  function doCSV() {
    const rows = Object.entries(stats.byCategory).map(([cat, meds]) => ({ category: cat, count: meds.length }))
    downloadCSV(rows, ['category', 'count'], 'inventory-summary.csv')
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
  if (error) return <p className="text-red-500 text-sm">{error}</p>

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={doCSV} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"><Download size={14} />CSV</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: '#0F2557' }}>{medicines.length}</div>
          <div className="text-xs text-gray-500 mt-1">Total Medicines</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <div className="text-xl font-bold text-green-700">₹{stats.totalValue.toFixed(0)}</div>
          <div className="text-xs text-gray-500 mt-1">Total Stock Value</div>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: '#CC1414' }}>{stats.outOfStock}</div>
          <div className="text-xs text-gray-500 mt-1">Out of Stock</div>
        </div>
      </div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">By Category</p>
      <div className="space-y-2">
        {Object.entries(stats.byCategory).sort((a, b) => b[1].length - a[1].length).map(([cat, meds]) => (
          <div key={cat} className="flex items-center gap-3 text-sm">
            <span className="w-32 text-gray-600 truncate">{cat}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
              <div className="h-4 rounded-full" style={{ width: `${(meds.length / stats.maxInCat) * 100}%`, background: '#0F2557' }} />
            </div>
            <span className="w-6 text-right font-semibold text-gray-700">{meds.length}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Stock Expiry ── */
function StockExpiry() {
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get('/pharmacy/medicines', { params: { limit: 500 } })
      .then(r => setMedicines(Array.isArray(r) ? r : []))
      .catch(ex => setError(ex.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
  if (error) return <p className="text-red-500 text-sm">{error}</p>

  const hasExpiry = medicines.some(m => m.expiry_date)
  if (!hasExpiry) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 flex items-center gap-3 text-yellow-800 text-sm">
        <AlertTriangle size={18} />
        <span>Expiry tracking not yet configured. No expiry date data found in the medicine records.</span>
      </div>
    )
  }

  const withExpiry = medicines.filter(m => m.expiry_date).sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))

  function doPrint() {
    const rows = withExpiry.map(m => {
      const daysLeft = Math.floor((new Date(m.expiry_date) - new Date()) / 86400000)
      return `<tr><td>${m.name}</td><td>${m.stock_quantity ?? '—'}</td><td>${m.form || '—'}</td><td>${new Date(m.expiry_date).toLocaleDateString('en-IN')}</td><td>${daysLeft < 0 ? 'Expired' : daysLeft <= 30 ? `Expires in ${daysLeft}d` : 'OK'}</td></tr>`
    }).join('')
    printTable('Stock Expiry Report', `<table><thead><tr><th>Medicine</th><th>Stock</th><th>Unit</th><th>Expiry Date</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`)
  }

  function doCSV() {
    downloadCSV(
      withExpiry.map(m => ({ medicine: m.name, stock: m.stock_quantity, expiry: m.expiry_date })),
      ['medicine', 'stock', 'expiry'],
      'stock-expiry.csv'
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
          <thead>
            <tr>
              <th className="th">Medicine</th>
              <th className="th">Stock</th>
              <th className="th">Unit</th>
              <th className="th">Expiry Date</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {withExpiry.map(m => {
              const expDate = new Date(m.expiry_date)
              const now = new Date()
              const daysLeft = Math.floor((expDate - now) / 86400000)
              const isExpired = daysLeft < 0
              const isSoon = daysLeft >= 0 && daysLeft <= 30
              return (
                <tr key={m.id} className="tr-hover" style={isExpired ? { background: '#fee2e2' } : isSoon ? { background: '#fff7ed' } : {}}>
                  <td className="td font-medium">{m.name}</td>
                  <td className="td">{m.stock_quantity ?? '—'}</td>
                  <td className="td capitalize text-gray-500">{m.form || '—'}</td>
                  <td className="td text-gray-600">{new Date(m.expiry_date).toLocaleDateString('en-IN')}</td>
                  <td className="td">
                    <span className={`badge ${isExpired ? 'badge-red' : isSoon ? 'badge-yellow' : 'badge-green'}`}>
                      {isExpired ? 'Expired' : isSoon ? `Expires in ${daysLeft}d` : 'OK'}
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

/* ── GST Report ── */
function GSTReport() {
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10))
  const [toDate, setToDate] = useState(todayStr())
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    setError('')
    api.get('/billing/invoices', { params: { limit: 500 } })
      .then(r => setInvoices(Array.isArray(r) ? r : []))
      .catch(ex => setError(ex.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const gstSummary = useMemo(() => {
    const filtered = invoices.filter(inv => {
      const d = inv.created_at ? inv.created_at.slice(0, 10) : ''
      return d >= fromDate && d <= toDate && inv.status !== 'cancelled'
    })
    const slabs = {}
    filtered.forEach(inv => {
      const gst = Number(inv.gst_amount) || 0
      const total = Number(inv.total_amount || inv.total) || 0
      const taxable = total - gst
      const rate = gst > 0 ? 'Mixed' : '0'
      if (!slabs[rate]) slabs[rate] = { taxable: 0, gst: 0, invoices: 0 }
      slabs[rate].taxable += taxable
      slabs[rate].gst += gst
      slabs[rate].invoices += 1
    })
    return { slabs, total: filtered.reduce((s, i) => s + (Number(i.gst_amount) || 0), 0) }
  }, [invoices, fromDate, toDate])

  function doPrint() {
    const rows = Object.entries(gstSummary.slabs).map(([slab, data]) =>
      `<tr><td>${slab}</td><td>₹${data.taxable.toFixed(2)}</td><td>₹${data.gst.toFixed(2)}</td><td>${data.invoices}</td></tr>`
    ).join('')
    printTable(`GST Report (${fromDate} to ${toDate})`, `<table><thead><tr><th>Slab</th><th>Taxable Amount</th><th>GST Amount</th><th>Invoices</th></tr></thead><tbody>${rows}</tbody></table>`)
  }

  function doCSV() {
    const rows = Object.entries(gstSummary.slabs).map(([slab, data]) => ({
      slab, taxable_amount: data.taxable.toFixed(2), gst_amount: data.gst.toFixed(2), invoices: data.invoices
    }))
    downloadCSV(rows, ['slab', 'taxable_amount', 'gst_amount', 'invoices'], `gst-report-${fromDate}-${toDate}.csv`)
  }

  return (
    <div>
      <div className="flex items-end gap-3 mb-4 flex-wrap">
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button onClick={doPrint} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"><Printer size={14} />Print</button>
          <button onClick={doCSV} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"><Download size={14} />CSV</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <>
          <div className="bg-blue-50 rounded-xl p-4 mb-4 text-sm">
            <span className="text-gray-500">Total GST Collected: </span>
            <span className="font-bold text-base" style={{ color: '#0F2557' }}>₹{gstSummary.total.toFixed(2)}</span>
          </div>
          <div className="table-wrapper">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th className="th">GST Slab</th>
                  <th className="th">Taxable Amount</th>
                  <th className="th">GST Amount</th>
                  <th className="th">No. of Invoices</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(gstSummary.slabs).map(([slab, data]) => (
                  <tr key={slab} className="tr-hover">
                    <td className="td font-medium">{slab}</td>
                    <td className="td">₹{data.taxable.toFixed(2)}</td>
                    <td className="td font-semibold">₹{data.gst.toFixed(2)}</td>
                    <td className="td text-gray-500">{data.invoices}</td>
                  </tr>
                ))}
                {Object.keys(gstSummary.slabs).length === 0 && (
                  <tr><td colSpan={4} className="td text-center text-gray-400 py-6">No invoice data for this period</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Drug Register Report ── */
function DrugRegisterReport() {
  const [schedule, setSchedule] = useState('')
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10))
  const [toDate, setToDate] = useState(todayStr())
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  function load() {
    setLoading(true); setErr('')
    const params = { from_date: fromDate, to_date: toDate }
    if (schedule) params.schedule = schedule
    api.get('/pharmacy/drug-register', { params })
      .then(r => setEntries(Array.isArray(r) ? r : []))
      .catch(ex => setErr(ex.message || 'Failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  function doPrint() {
    const rows = entries.map(e => `<tr><td>${e.sold_at ? new Date(e.sold_at).toLocaleDateString('en-IN') : '—'}</td><td>${e.medicine_name}</td><td>${e.schedule}</td><td>${e.patient_name || '—'}</td><td>${e.doctor_name || '—'}</td><td>${e.quantity}</td><td>${e.batch_number || '—'}</td></tr>`).join('')
    printTable(`Drug Register (${schedule || 'All'}) ${fromDate} to ${toDate}`, `<table><thead><tr><th>Date</th><th>Medicine</th><th>Schedule</th><th>Patient</th><th>Doctor</th><th>Qty</th><th>Batch</th></tr></thead><tbody>${rows}</tbody></table>`)
  }

  return (
    <div>
      <div className="flex items-end gap-3 mb-4 flex-wrap">
        <div>
          <label className="label">Schedule</label>
          <select className="input" value={schedule} onChange={e => setSchedule(e.target.value)}>
            <option value="">All (H/H1/X)</option>
            <option value="H">Schedule H</option>
            <option value="H1">Schedule H1</option>
            <option value="X">Schedule X</option>
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input type="date" className="input" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-primary text-sm py-1.5 px-4">Fetch</button>
          <button onClick={doPrint} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"><Printer size={14} />Print</button>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-gray-400" /></div>
      ) : err ? (
        <p className="text-red-500 text-sm">{err}</p>
      ) : entries.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-4">No drug register entries for this period.</p>
      ) : (
        <div className="table-wrapper">
          <table className="table text-sm">
            <thead>
              <tr>
                <th className="th">Date &amp; Time</th>
                <th className="th">Medicine</th>
                <th className="th">Schedule</th>
                <th className="th">Patient</th>
                <th className="th">Doctor</th>
                <th className="th">Qty</th>
                <th className="th">Batch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map(e => (
                <tr key={e.id} className="tr-hover">
                  <td className="td text-xs text-gray-500 whitespace-nowrap">
                    {e.sold_at ? new Date(e.sold_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </td>
                  <td className="td font-medium">{e.medicine_name}</td>
                  <td className="td">
                    <span className="badge badge-yellow text-xs">{e.schedule}</span>
                  </td>
                  <td className="td text-gray-600">{e.patient_name || '—'}</td>
                  <td className="td text-gray-600">{e.doctor_name || '—'}</td>
                  <td className="td font-semibold">{e.quantity}</td>
                  <td className="td text-gray-400 text-xs">{e.batch_number || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Profit & Loss Report ── */
function ProfitLossReport() {
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10))
  const [toDate, setToDate] = useState(todayStr())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  function load() {
    setLoading(true); setErr('')
    api.get('/pharmacy/reports/profit-loss', { params: { from_date: fromDate, to_date: toDate } })
      .then(r => setData(r))
      .catch(ex => setErr(ex.message || 'Failed'))
      .finally(() => setLoading(false))
  }

  function doCSV() {
    if (!data) return
    downloadCSV(
      data.items.map(i => ({
        medicine: i.medicine_name, qty_sold: i.qty_sold,
        revenue: i.revenue.toFixed(2), cogs: i.cogs.toFixed(2),
        gross_profit: i.gross_profit.toFixed(2), margin_pct: i.margin_pct,
      })),
      ['medicine', 'qty_sold', 'revenue', 'cogs', 'gross_profit', 'margin_pct'],
      `profit-loss-${fromDate}-${toDate}.csv`
    )
  }

  return (
    <div>
      <div className="flex items-end gap-3 mb-4 flex-wrap">
        <div><label className="label">From</label><input type="date" className="input" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
        <div><label className="label">To</label><input type="date" className="input" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-primary text-sm py-1.5 px-4">Generate</button>
          {data && <button onClick={doCSV} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"><Download size={14} />CSV</button>}
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-gray-400" /></div>
      ) : err ? (
        <p className="text-red-500 text-sm">{err}</p>
      ) : data ? (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Total Revenue', val: `₹${data.summary.total_revenue.toFixed(2)}`, color: '#0F2557' },
              { label: 'Total COGS', val: `₹${data.summary.total_cogs.toFixed(2)}`, color: '#CC1414' },
              { label: 'Gross Profit', val: `₹${data.summary.gross_profit.toFixed(2)}`, color: '#16a34a' },
            ].map(s => (
              <div key={s.label} className="card p-4 text-center">
                <div className="text-xl font-bold" style={{ color: s.color }}>{s.val}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="table-wrapper">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th className="th">Medicine</th>
                  <th className="th">Qty Sold</th>
                  <th className="th">Revenue</th>
                  <th className="th">COGS</th>
                  <th className="th">Gross Profit</th>
                  <th className="th">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data.items || []).map((item, i) => (
                  <tr key={i} className="tr-hover">
                    <td className="td font-medium">{item.medicine_name}</td>
                    <td className="td">{item.qty_sold}</td>
                    <td className="td">₹{item.revenue.toFixed(2)}</td>
                    <td className="td text-gray-500">₹{item.cogs.toFixed(2)}</td>
                    <td className="td font-semibold" style={{ color: item.gross_profit >= 0 ? '#16a34a' : '#CC1414' }}>
                      ₹{item.gross_profit.toFixed(2)}
                    </td>
                    <td className="td">
                      <span className={`badge ${item.margin_pct >= 20 ? 'badge-green' : item.margin_pct >= 0 ? 'badge-yellow' : 'badge-red'}`}>
                        {item.margin_pct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-gray-400 text-sm text-center py-4">Select a date range and click Generate.</p>
      )}
    </div>
  )
}

/* ── Supplier Purchase Report ── */
function SupplierPurchaseReport() {
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10))
  const [toDate, setToDate] = useState(todayStr())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  function load() {
    setLoading(true); setErr('')
    api.get('/pharmacy/reports/supplier-purchases', { params: { from_date: fromDate, to_date: toDate } })
      .then(r => setData(Array.isArray(r) ? r : []))
      .catch(ex => setErr(ex.message || 'Failed'))
      .finally(() => setLoading(false))
  }

  function doCSV() {
    if (!data) return
    downloadCSV(
      data.map(d => ({
        supplier: d.supplier_name, total_pos: d.total_pos,
        total_value: d.total_value.toFixed(2), medicines_count: d.medicines_count,
      })),
      ['supplier', 'total_pos', 'total_value', 'medicines_count'],
      `supplier-purchases-${fromDate}-${toDate}.csv`
    )
  }

  return (
    <div>
      <div className="flex items-end gap-3 mb-4 flex-wrap">
        <div><label className="label">From</label><input type="date" className="input" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
        <div><label className="label">To</label><input type="date" className="input" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-primary text-sm py-1.5 px-4">Generate</button>
          {data && <button onClick={doCSV} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"><Download size={14} />CSV</button>}
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-gray-400" /></div>
      ) : err ? (
        <p className="text-red-500 text-sm">{err}</p>
      ) : data && data.length > 0 ? (
        <div className="table-wrapper">
          <table className="table text-sm">
            <thead>
              <tr>
                <th className="th">Supplier</th>
                <th className="th">Total POs</th>
                <th className="th">Total Value</th>
                <th className="th">Medicines Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((d, i) => (
                <tr key={i} className="tr-hover">
                  <td className="td font-medium">{d.supplier_name}</td>
                  <td className="td text-center">{d.total_pos}</td>
                  <td className="td font-semibold">₹{Number(d.total_value || 0).toFixed(2)}</td>
                  <td className="td text-gray-500">{d.medicines_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : data ? (
        <p className="text-gray-400 text-sm text-center py-4">No purchase orders for this period.</p>
      ) : (
        <p className="text-gray-400 text-sm text-center py-4">Select date range and click Generate.</p>
      )}
    </div>
  )
}

/* ── ABC Analysis ── */
const ABC_COLORS = { A: 'badge-green', B: 'badge-yellow', C: 'badge-gray' }
const ABC_BG     = { A: 'bg-green-50', B: 'bg-amber-50', C: 'bg-gray-50' }

function ABCAnalysis() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState('')

  function load() {
    setLoading(true); setErr('')
    api.get('/pharmacy/reports/abc-analysis')
      .then(r => setData(Array.isArray(r) ? r : []))
      .catch(ex => setErr(ex.message || 'Failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  const filtered = useMemo(() => {
    if (!data) return []
    if (!filter) return data
    return data.filter(d => d.category === filter)
  }, [data, filter])

  function doCSV() {
    if (!data) return
    downloadCSV(
      data.map(d => ({ medicine: d.medicine_name, sales_value: d.sales_value.toFixed(2), qty_sold: d.qty_sold, category: d.category })),
      ['medicine', 'sales_value', 'qty_sold', 'category'],
      'abc-analysis.csv'
    )
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {['', 'A', 'B', 'C'].map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold border transition-all ${filter === c ? 'text-white border-transparent' : 'border-gray-200 text-gray-600'}`}
            style={filter === c ? { background: '#0F2557' } : {}}
          >
            {c ? `Category ${c}` : 'All'}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button onClick={load} className="btn-secondary text-sm py-1.5 px-3">Refresh</button>
          {data && <button onClick={doCSV} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"><Download size={14} />CSV</button>}
        </div>
      </div>
      {!data || loading ? (
        <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-gray-400" /></div>
      ) : err ? (
        <p className="text-red-500 text-sm">{err}</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-4">No sales data found.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {['A', 'B', 'C'].map(cat => {
              const catItems = (data || []).filter(d => d.category === cat)
              return (
                <div key={cat} className={`rounded-xl p-3 text-center ${ABC_BG[cat]}`}>
                  <div className="text-lg font-bold">{catItems.length}</div>
                  <div className="text-xs text-gray-500">Category {cat} medicines</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {cat === 'A' ? 'Top 80% by value' : cat === 'B' ? 'Next 15%' : 'Bottom 5%'}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="table-wrapper">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th className="th">#</th>
                  <th className="th">Medicine</th>
                  <th className="th">Sales Value</th>
                  <th className="th">Qty Sold</th>
                  <th className="th">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item, i) => (
                  <tr key={i} className="tr-hover">
                    <td className="td text-gray-400">{i + 1}</td>
                    <td className="td font-medium">{item.medicine_name}</td>
                    <td className="td font-semibold">₹{Number(item.sales_value || 0).toFixed(2)}</td>
                    <td className="td">{item.qty_sold}</td>
                    <td className="td">
                      <span className={`badge ${ABC_COLORS[item.category]}`}>Cat {item.category}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

/* ── HSN-wise GST Report (GSTR-1) ── */
function HSNGSTReport() {
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10))
  const [toDate, setToDate] = useState(todayStr())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  function load() {
    setLoading(true); setErr('')
    api.get('/pharmacy/reports/hsn-gst', { params: { from_date: fromDate, to_date: toDate } })
      .then(r => setData(Array.isArray(r) ? r : []))
      .catch(ex => setErr(ex.message || 'Failed'))
      .finally(() => setLoading(false))
  }

  function doPrint() {
    if (!data) return
    const rows = data.map(r => `<tr><td>${r.hsn_code}</td><td>${r.gst_rate}%</td><td>₹${r.taxable_value.toFixed(2)}</td><td>₹${r.cgst.toFixed(2)}</td><td>₹${r.sgst.toFixed(2)}</td><td>₹${r.igst.toFixed(2)}</td><td>₹${r.total_gst.toFixed(2)}</td><td>${r.invoice_count}</td></tr>`).join('')
    printTable(`HSN-wise GST Report (GSTR-1) ${fromDate} to ${toDate}`, `<table><thead><tr><th>HSN</th><th>GST Rate</th><th>Taxable Value</th><th>CGST</th><th>SGST</th><th>IGST</th><th>Total GST</th><th>Invoices</th></tr></thead><tbody>${rows}</tbody></table>`)
  }

  function doCSV() {
    if (!data) return
    downloadCSV(
      data.map(r => ({
        hsn_code: r.hsn_code, gst_rate: r.gst_rate,
        taxable_value: r.taxable_value.toFixed(2),
        cgst: r.cgst.toFixed(2), sgst: r.sgst.toFixed(2), igst: r.igst.toFixed(2),
        total_gst: r.total_gst.toFixed(2), invoice_count: r.invoice_count,
      })),
      ['hsn_code', 'gst_rate', 'taxable_value', 'cgst', 'sgst', 'igst', 'total_gst', 'invoice_count'],
      `gstr1-hsn-${fromDate}-${toDate}.csv`
    )
  }

  return (
    <div>
      <div className="flex items-end gap-3 mb-4 flex-wrap">
        <div><label className="label">From</label><input type="date" className="input" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
        <div><label className="label">To</label><input type="date" className="input" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-primary text-sm py-1.5 px-4">Generate</button>
          {data && <>
            <button onClick={doPrint} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"><Printer size={14} />Print</button>
            <button onClick={doCSV} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"><Download size={14} />CSV</button>
          </>}
        </div>
      </div>
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 text-xs text-blue-700">
        This report groups all invoices by HSN code in GSTR-1 format. CGST and SGST are each 50% of total GST (intrastate). For interstate supply, total flows into IGST.
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-gray-400" /></div>
      ) : err ? (
        <p className="text-red-500 text-sm">{err}</p>
      ) : data && data.length > 0 ? (
        <div className="table-wrapper">
          <table className="table text-sm">
            <thead>
              <tr>
                <th className="th">HSN Code</th>
                <th className="th">GST Rate</th>
                <th className="th">Taxable Value</th>
                <th className="th">CGST</th>
                <th className="th">SGST</th>
                <th className="th">IGST</th>
                <th className="th">Total GST</th>
                <th className="th">Invoices</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((r, i) => (
                <tr key={i} className="tr-hover">
                  <td className="td font-mono font-medium">{r.hsn_code}</td>
                  <td className="td text-gray-600">{r.gst_rate}%</td>
                  <td className="td">₹{Number(r.taxable_value || 0).toFixed(2)}</td>
                  <td className="td">₹{Number(r.cgst || 0).toFixed(2)}</td>
                  <td className="td">₹{Number(r.sgst || 0).toFixed(2)}</td>
                  <td className="td text-gray-400">₹{Number(r.igst || 0).toFixed(2)}</td>
                  <td className="td font-semibold">₹{Number(r.total_gst || 0).toFixed(2)}</td>
                  <td className="td text-gray-500">{r.invoice_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : data ? (
        <p className="text-gray-400 text-sm text-center py-4">No invoice data for this period.</p>
      ) : (
        <p className="text-gray-400 text-sm text-center py-4">Select date range and click Generate.</p>
      )}
    </div>
  )
}

export default function Reports() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Pharmacy Reports</h1>
      </div>
      <div className="space-y-4">
        <ReportCard title="Daily Dispensing Report" icon={BarChart2} iconColor="#0F2557" iconBg="#0F255718">
          <DailyDispensing />
        </ReportCard>
        <ReportCard title="Low Stock Report" icon={AlertTriangle} iconColor="#F5821E" iconBg="#F5821E18">
          <LowStockReport />
        </ReportCard>
        <ReportCard title="Inventory Summary" icon={Package} iconColor="#16a34a" iconBg="#16a34a18">
          <InventorySummary />
        </ReportCard>
        <ReportCard title="Stock Expiry Report" icon={Package} iconColor="#CC1414" iconBg="#CC141418">
          <StockExpiry />
        </ReportCard>
        <ReportCard title="GST Report" icon={BarChart2} iconColor="#7c3aed" iconBg="#7c3aed18">
          <GSTReport />
        </ReportCard>
        <ReportCard title="Drug Register (Schedule H/H1/X)" icon={FileText} iconColor="#0F2557" iconBg="#0F255718">
          <DrugRegisterReport />
        </ReportCard>
        <ReportCard title="Profit &amp; Loss Report" icon={TrendingUp} iconColor="#16a34a" iconBg="#16a34a18">
          <ProfitLossReport />
        </ReportCard>
        <ReportCard title="Supplier-wise Purchase Report" icon={Building2} iconColor="#F5821E" iconBg="#F5821E18">
          <SupplierPurchaseReport />
        </ReportCard>
        <ReportCard title="ABC Analysis (Fast / Slow Movers)" icon={ListOrdered} iconColor="#7c3aed" iconBg="#7c3aed18">
          <ABCAnalysis />
        </ReportCard>
        <ReportCard title="HSN-wise GST Report (GSTR-1)" icon={FileText} iconColor="#CC1414" iconBg="#CC141418">
          <HSNGSTReport />
        </ReportCard>
      </div>
    </div>
  )
}
