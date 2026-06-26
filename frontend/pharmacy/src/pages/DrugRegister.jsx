import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { BookOpen, Loader2, Printer, Download, AlertTriangle } from 'lucide-react'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoStr(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function formatDateTime(val) {
  if (!val) return '—'
  return new Date(val).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
}

function downloadCSV(rows, headers, filename) {
  const lines = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

const SCHEDULE_LABELS = { '': 'All Schedules', H: 'Schedule H', X: 'Schedule X' }

export default function DrugRegister() {
  const [schedule, setSchedule] = useState('')
  const [fromDate, setFromDate] = useState(daysAgoStr(30))
  const [toDate, setToDate] = useState(todayStr())
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const PAGE_SIZE = 50

  const load = useCallback((pg = 1) => {
    setLoading(true)
    setError('')
    const params = { from_date: fromDate, to_date: toDate, page: pg, page_size: PAGE_SIZE }
    if (schedule) params.schedule = schedule
    api.get('/pharmacy/drug-register', { params })
      .then(r => {
        const data = Array.isArray(r) ? r : (r.items || r.data || [])
        if (pg === 1) {
          setEntries(data)
        } else {
          setEntries(prev => [...prev, ...data])
        }
        setHasMore(data.length === PAGE_SIZE)
        setPage(pg)
      })
      .catch(ex => setError(ex.response?.data?.detail || ex.message || 'Failed to load drug register'))
      .finally(() => setLoading(false))
  }, [schedule, fromDate, toDate])

  useEffect(() => { load(1) }, []) // eslint-disable-line

  function handleSearch() {
    load(1)
  }

  function handleLoadMore() {
    load(page + 1)
  }

  function doPrint() {
    const scheduleLabel = SCHEDULE_LABELS[schedule] || 'All Schedules'
    const rows = entries.map((e, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${formatDateTime(e.dispensed_at)}</td>
        <td>${e.drug_name || '—'}</td>
        <td>${e.schedule || '—'}</td>
        <td>${e.patient_name || '—'}</td>
        <td>${e.patient_age ?? '—'}</td>
        <td>${e.patient_address || '—'}</td>
        <td>${e.prescriber_name || '—'}</td>
        <td>${e.prescriber_reg || '—'}</td>
        <td>${e.quantity ?? '—'}</td>
        <td>${e.batch_number || '—'}</td>
        <td>${e.invoice_number || '—'}</td>
      </tr>`).join('')

    const win = window.open('', '_blank')
    win.document.write(`
      <html>
        <head>
          <title>Drug Register</title>
          <style>
            body { font-family: sans-serif; padding: 20px; font-size: 11px; }
            h2 { text-align: center; margin-bottom: 4px; font-size: 15px; }
            .subtitle { text-align: center; color: #555; margin-bottom: 16px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #aaa; padding: 4px 6px; }
            th { background: #f0f0f0; font-weight: 600; text-align: left; }
            tr:nth-child(even) { background: #fafafa; }
          </style>
        </head>
        <body>
          <h2>DRUG REGISTER — ${scheduleLabel.toUpperCase()}</h2>
          <div class="subtitle">Period: ${fromDate} to ${toDate} &nbsp;|&nbsp; Bharath Health Systems</div>
          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Date &amp; Time</th>
                <th>Drug Name</th>
                <th>Schedule</th>
                <th>Patient Name</th>
                <th>Age</th>
                <th>Address</th>
                <th>Prescriber</th>
                <th>Reg. No.</th>
                <th>Qty</th>
                <th>Batch</th>
                <th>Invoice #</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>`)
    win.document.close()
    win.print()
  }

  function doCSV() {
    const filename = `drug-register-${schedule || 'all'}-${fromDate}-${toDate}.csv`
    downloadCSV(
      entries.map((e, i) => ({
        sno: i + 1,
        date_time: formatDateTime(e.dispensed_at),
        drug_name: e.drug_name || '',
        schedule: e.schedule || '',
        patient_name: e.patient_name || '',
        patient_age: e.patient_age ?? '',
        patient_address: e.patient_address || '',
        prescriber_name: e.prescriber_name || '',
        prescriber_reg: e.prescriber_reg || '',
        quantity: e.quantity ?? '',
        batch_number: e.batch_number || '',
        invoice_number: e.invoice_number || '',
      })),
      ['sno', 'date_time', 'drug_name', 'schedule', 'patient_name', 'patient_age', 'patient_address', 'prescriber_name', 'prescriber_reg', 'quantity', 'batch_number', 'invoice_number'],
      filename
    )
  }

  const scheduleLabel = SCHEDULE_LABELS[schedule] || 'All Schedules'

  return (
    <div>
      <div className="page-header">
        <div className="flex gap-2">
          <button
            onClick={doPrint}
            disabled={entries.length === 0}
            className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer size={14} />
            Print Register
          </button>
          <button
            onClick={doCSV}
            disabled={entries.length === 0}
            className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card px-5 py-4 mb-5">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="label">Schedule</label>
            <select
              className="input"
              value={schedule}
              onChange={e => setSchedule(e.target.value)}
            >
              <option value="">All Schedules</option>
              <option value="H">Schedule H</option>
              <option value="X">Schedule X</option>
            </select>
          </div>
          <div>
            <label className="label">From Date</label>
            <input
              type="date"
              className="input"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">To Date</label>
            <input
              type="date"
              className="input"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="btn-primary text-sm py-2 px-5 disabled:opacity-60"
          >
            {loading && page === 1 ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}
            Search
          </button>
        </div>
      </div>

      {/* Result count banner */}
      {entries.length > 0 && !loading && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-700">{entries.length}</span> entries
            for <span className="font-semibold text-gray-700">{scheduleLabel}</span>
            &nbsp;({fromDate} to {toDate})
          </p>
        </div>
      )}

      {/* Content */}
      {loading && page === 1 ? (
        <div className="card flex justify-center items-center py-16">
          <Loader2 size={28} className="animate-spin text-gray-300" />
        </div>
      ) : error ? (
        <div className="card px-5 py-8 flex flex-col items-center gap-3 text-center">
          <AlertTriangle size={28} className="text-red-400" />
          <p className="text-red-500 text-sm font-medium">{error}</p>
          <button onClick={handleSearch} className="btn-secondary text-sm py-1.5 px-4">Retry</button>
        </div>
      ) : entries.length === 0 ? (
        <div className="card px-5 py-14 flex flex-col items-center gap-3 text-center">
          <BookOpen size={32} className="text-gray-200" />
          <p className="text-gray-400 text-sm">No drug register entries found for the selected period.</p>
          <p className="text-gray-300 text-xs">Adjust the schedule filter or date range and try again.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="table-wrapper">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th className="th">S.No</th>
                  <th className="th whitespace-nowrap">Date &amp; Time</th>
                  <th className="th">Drug Name</th>
                  <th className="th">Schedule</th>
                  <th className="th">Patient Name</th>
                  <th className="th">Age</th>
                  <th className="th">Address</th>
                  <th className="th">Prescriber</th>
                  <th className="th whitespace-nowrap">Reg. No.</th>
                  <th className="th">Qty</th>
                  <th className="th">Batch</th>
                  <th className="th whitespace-nowrap">Invoice #</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((e, i) => (
                  <tr key={e.id ?? i} className="tr-hover">
                    <td className="td text-gray-400 text-xs">{i + 1}</td>
                    <td className="td text-xs text-gray-500 whitespace-nowrap">
                      {formatDateTime(e.dispensed_at)}
                    </td>
                    <td className="td font-medium">{e.drug_name || '—'}</td>
                    <td className="td">
                      {e.schedule ? (
                        <span className="badge badge-yellow text-xs">{e.schedule}</span>
                      ) : '—'}
                    </td>
                    <td className="td text-gray-700">{e.patient_name || '—'}</td>
                    <td className="td text-gray-500 text-center">{e.patient_age ?? '—'}</td>
                    <td className="td text-gray-500 text-xs max-w-[140px] truncate" title={e.patient_address || ''}>
                      {e.patient_address || '—'}
                    </td>
                    <td className="td text-gray-700">{e.prescriber_name || '—'}</td>
                    <td className="td text-gray-500 text-xs font-mono">{e.prescriber_reg || '—'}</td>
                    <td className="td font-semibold text-center">{e.quantity ?? '—'}</td>
                    <td className="td text-gray-400 text-xs font-mono">{e.batch_number || '—'}</td>
                    <td className="td text-gray-500 text-xs font-mono">{e.invoice_number || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Load more pagination */}
          {hasMore && (
            <div className="px-5 py-3 border-t border-gray-100 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="btn-secondary text-sm py-1.5 px-5 flex items-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                Load More
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
