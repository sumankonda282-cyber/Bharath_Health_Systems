import { useState, useEffect, useMemo, useCallback } from 'react'
import { clinicApi, billingApi } from '../../api'
import { PageLoader } from '../../components/ui/Spinner'
import {
  BarChart3, TrendingUp, IndianRupee, Users, Award,
  Download, Search, Filter, Calendar, RefreshCw,
  ChevronDown, FileText, Clock,
} from 'lucide-react'
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns'

// ── helpers ────────────────────────────────────────────────────────────────

function fmt(n) {
  return (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtCurrency(n) {
  return '₹' + fmt(n)
}

function parseDateSafe(str) {
  if (!str) return null
  try { return parseISO(str.slice(0, 10)) } catch { return null }
}

function exportCSV(rows, month) {
  if (!rows || rows.length === 0) return
  const headers = ['Invoice', 'Patient', 'Doctor', 'Branch', 'Payment Mode', 'Amount', 'Date']
  const lines = [
    headers.join(','),
    ...rows.map(r => [
      `"${r.invoice_number || ''}"`,
      `"${r.patient_name || ''}"`,
      `"${r.doctor_name || ''}"`,
      `"${r.branch_name || ''}"`,
      `"${r.payment_mode || ''}"`,
      r.amount || 0,
      `"${r.billed_at || ''}"`,
    ].join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `billing-ledger-${month}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// ── sub-components ─────────────────────────────────────────────────────────

function StatCard({ icon: Icon, iconBg, iconColor, label, value, sub, accent }) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon size={18} className={iconColor} />
        </div>
        <span className="text-sm text-gray-500 font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${accent}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  )
}

function SelectDropdown({ label, value, onChange, options, icon: Icon }) {
  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 cursor-pointer hover:border-blue-400 transition-colors min-w-[140px]">
        {Icon && <Icon size={14} className="text-gray-400 flex-shrink-0" />}
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="appearance-none bg-transparent outline-none flex-1 cursor-pointer pr-4"
        >
          <option value="">{label}</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown size={12} className="text-gray-400 flex-shrink-0 pointer-events-none absolute right-2" />
      </div>
    </div>
  )
}

function DoctorBar({ doc, maxTotal, filteredTotal }) {
  const pct = maxTotal ? Math.round((doc.total / maxTotal) * 100) : 0
  const sharePct = filteredTotal ? Math.round((doc.total / filteredTotal) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-medium text-gray-800 truncate max-w-[55%]">{doc.doctor_name}</span>
        <span className="text-green-700 font-semibold text-xs">
          {fmtCurrency(doc.total)}
          <span className="text-gray-400 font-normal ml-1">({doc.count} invoice{doc.count !== 1 ? 's' : ''})</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 w-8 text-right">{sharePct}%</span>
      </div>
    </div>
  )
}

function DailyTrendBar({ daily }) {
  if (!daily || daily.length === 0) return null
  const max = Math.max(...daily.map(d => d.total || 0), 1)
  return (
    <div className="card mb-6">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <TrendingUp size={16} className="text-indigo-500" />
        <h2 className="font-semibold text-gray-800">Daily Revenue Trend</h2>
      </div>
      <div className="p-5">
        <div className="flex items-end gap-1 h-32 overflow-x-auto pb-1">
          {daily.map((d, i) => {
            const heightPct = max ? Math.round((d.total / max) * 100) : 0
            const dayLabel = d.date ? format(parseISO(d.date), 'd') : i + 1
            return (
              <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-[18px] group relative">
                <div
                  className="w-full bg-gradient-to-t from-blue-500 to-indigo-400 rounded-t-sm transition-all duration-300 group-hover:from-blue-600 group-hover:to-indigo-500 cursor-default"
                  style={{ height: `${Math.max(heightPct, 2)}%` }}
                  title={`${d.date}: ${fmtCurrency(d.total)}`}
                />
                <span className="text-[10px] text-gray-400">{dayLabel}</span>
                <div className="absolute bottom-full mb-1 bg-gray-800 text-white text-xs px-2 py-1 rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {d.date}: {fmtCurrency(d.total)}
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Day 1</span>
          <span>Day {daily.length}</span>
        </div>
      </div>
    </div>
  )
}

function ErrorCard({ message, onRetry }) {
  return (
    <div className="card p-10 text-center">
      <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <BarChart3 size={24} className="text-red-400" />
      </div>
      <h3 className="font-semibold text-gray-800 mb-1">Failed to load analytics</h3>
      <p className="text-sm text-gray-500 mb-5">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        <RefreshCw size={14} />
        Retry
      </button>
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────

const TODAY = format(new Date(), 'yyyy-MM-dd')
const MONTH_START = format(new Date(), 'yyyy-MM') + '-01'

export default function Analytics() {
  // ── filter state ────────────────────────────────────────────────────────
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [fromDate, setFromDate] = useState(MONTH_START)
  const [toDate, setToDate] = useState(TODAY)
  const [filterMode, setFilterMode] = useState('month') // 'month' | 'range'
  const [doctorFilter, setDoctorFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [searchQ, setSearchQ] = useState('')

  // ── data state ──────────────────────────────────────────────────────────
  const [data, setData] = useState(null)
  const [pendingInvoices, setPendingInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── load ────────────────────────────────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true)
    setError('')

    // Always pass the month param as required by clinicApi.getRevenue
    const monthParam = filterMode === 'month' ? month : fromDate.slice(0, 7)

    Promise.all([
      clinicApi.getRevenue(monthParam),
      billingApi.getInvoices({ status: 'pending', limit: 200 }).catch(() => ({ invoices: [] })),
    ])
      .then(([revenueData, pendingData]) => {
        setData(revenueData)
        const invoices = pendingData?.invoices ?? pendingData?.data ?? []
        setPendingInvoices(Array.isArray(invoices) ? invoices : [])
      })
      .catch(err => setError(err?.response?.data?.detail || err.message || 'Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [month, fromDate, filterMode])

  useEffect(() => { load() }, [load])

  // ── sync month → fromDate/toDate ────────────────────────────────────────
  useEffect(() => {
    if (filterMode === 'month' && month) {
      setFromDate(month + '-01')
      // last day of the selected month
      const [y, m] = month.split('-').map(Number)
      const lastDay = new Date(y, m, 0).getDate()
      setToDate(`${month}-${String(lastDay).padStart(2, '0')}`)
    }
  }, [month, filterMode])

  // ── derived filter options ──────────────────────────────────────────────
  const doctorOptions = useMemo(() => {
    const names = new Set()
    ;(data?.by_doctor || []).forEach(d => d.doctor_name && names.add(d.doctor_name))
    ;(data?.billing || []).forEach(r => r.doctor_name && names.add(r.doctor_name))
    return Array.from(names).sort().map(n => ({ value: n, label: n }))
  }, [data])

  const branchOptions = useMemo(() => {
    const names = new Set()
    ;(data?.billing || []).forEach(r => r.branch_name && names.add(r.branch_name))
    return Array.from(names).sort().map(n => ({ value: n, label: n }))
  }, [data])

  // ── filtered billing rows ───────────────────────────────────────────────
  const filteredBilling = useMemo(() => {
    if (!data?.billing) return []
    let rows = data.billing

    // date range filter (applied when in range mode, or always to clip month data)
    if (fromDate && toDate) {
      const from = startOfDay(parseISO(fromDate))
      const to = endOfDay(parseISO(toDate))
      rows = rows.filter(r => {
        const d = parseDateSafe(r.billed_at)
        return d ? isWithinInterval(d, { start: from, end: to }) : true
      })
    }

    if (doctorFilter) {
      rows = rows.filter(r => r.doctor_name === doctorFilter)
    }
    if (branchFilter) {
      rows = rows.filter(r => r.branch_name === branchFilter)
    }
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase()
      rows = rows.filter(r =>
        (r.patient_name || '').toLowerCase().includes(q) ||
        (r.invoice_number || '').toLowerCase().includes(q)
      )
    }
    return rows
  }, [data, fromDate, toDate, doctorFilter, branchFilter, searchQ])

  // ── filtered by_doctor (respect doctor filter) ─────────────────────────
  const filteredByDoctor = useMemo(() => {
    if (!data?.by_doctor) return []
    if (!doctorFilter) return data.by_doctor
    return data.by_doctor.filter(d => d.doctor_name === doctorFilter)
  }, [data, doctorFilter])

  // ── computed summary stats ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = filteredBilling.reduce((s, r) => s + (r.amount || 0), 0)
    const count = filteredBilling.length
    const avg = count > 0 ? Math.round(total / count) : 0
    const pending = pendingInvoices.reduce((s, inv) => s + (inv.balance_due ?? inv.amount ?? 0), 0)
    return { total, count, avg, pending, pendingCount: pendingInvoices.length }
  }, [filteredBilling, pendingInvoices])

  const maxDoctorTotal = useMemo(
    () => Math.max(...filteredByDoctor.map(d => d.total || 0), 1),
    [filteredByDoctor]
  )
  const filteredDoctorTotal = useMemo(
    () => filteredByDoctor.reduce((s, d) => s + (d.total || 0), 0),
    [filteredByDoctor]
  )

  const activeFilters = [doctorFilter, branchFilter, searchQ.trim()].filter(Boolean).length

  // ── render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── One-line toolbar: date · filters · search · export ── */}
      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Month / Date Range toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm flex-shrink-0">
            <button
              onClick={() => setFilterMode('month')}
              className={`px-3 py-1.5 font-medium transition-colors ${filterMode === 'month' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Month
            </button>
            <button
              onClick={() => setFilterMode('range')}
              className={`px-3 py-1.5 font-medium transition-colors ${filterMode === 'range' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Date Range
            </button>
          </div>

          {filterMode === 'month' ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-400 transition-colors flex-shrink-0">
              <Calendar size={14} className="text-gray-400" />
              <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="outline-none bg-transparent" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-400 transition-colors flex-shrink-0">
                <Calendar size={14} className="text-gray-400" />
                <span className="text-gray-400 text-xs">From</span>
                <input type="date" value={fromDate} max={toDate} onChange={e => setFromDate(e.target.value)} className="outline-none bg-transparent" />
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-400 transition-colors flex-shrink-0">
                <Calendar size={14} className="text-gray-400" />
                <span className="text-gray-400 text-xs">To</span>
                <input type="date" value={toDate} min={fromDate} onChange={e => setToDate(e.target.value)} className="outline-none bg-transparent" />
              </div>
            </>
          )}

          <SelectDropdown label="All Doctors" value={doctorFilter} onChange={setDoctorFilter} options={doctorOptions} icon={Users} />
          <SelectDropdown label="All Branches" value={branchFilter} onChange={setBranchFilter} options={branchOptions} icon={Filter} />

          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-blue-400 transition-colors flex-1 min-w-[180px] max-w-xs">
            <Search size={14} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search patient or invoice…"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              className="outline-none bg-transparent w-full text-sm"
            />
            {searchQ && (
              <button onClick={() => setSearchQ('')} className="text-gray-400 hover:text-gray-600 text-xs ml-1">✕</button>
            )}
          </div>

          {activeFilters > 0 && (
            <button
              onClick={() => { setDoctorFilter(''); setBranchFilter(''); setSearchQ('') }}
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors flex-shrink-0"
            >
              Clear
            </button>
          )}

          {/* Export — same line, pushed right */}
          <button
            onClick={() => exportCSV(filteredBilling, filterMode === 'month' ? month : `${fromDate}_${toDate}`)}
            disabled={filteredBilling.length === 0}
            className="ml-auto flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && <PageLoader />}

      {/* ── Error ── */}
      {!loading && error && <ErrorCard message={error} onRetry={load} />}

      {/* ── Content ── */}
      {!loading && !error && data && (
        <>
          {/* ── Summary Stat Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={IndianRupee}
              iconBg="bg-green-100"
              iconColor="text-green-600"
              label="Total Revenue"
              value={fmtCurrency(stats.total)}
              sub={`${filterMode === 'month' ? month : `${fromDate} → ${toDate}`}`}
              accent="text-green-700"
            />
            <StatCard
              icon={FileText}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              label="Paid Invoices"
              value={stats.count.toLocaleString()}
              sub="In filtered period"
              accent="text-blue-700"
            />
            <StatCard
              icon={Clock}
              iconBg="bg-orange-100"
              iconColor="text-orange-500"
              label="Pending Amount"
              value={fmtCurrency(stats.pending)}
              sub={`${stats.pendingCount} unpaid invoice${stats.pendingCount !== 1 ? 's' : ''}`}
              accent="text-orange-600"
            />
            <StatCard
              icon={TrendingUp}
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
              label="Avg per Invoice"
              value={fmtCurrency(stats.avg)}
              sub="Based on filtered rows"
              accent="text-purple-700"
            />
          </div>

          {/* ── Daily Trend ── */}
          {data.daily?.length > 0 && <DailyTrendBar daily={data.daily} />}

          {/* ── Revenue by Doctor ── */}
          {filteredByDoctor.length > 0 && (
            <div className="card">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award size={16} className="text-yellow-500" />
                  <h2 className="font-semibold text-gray-800">Revenue by Doctor</h2>
                </div>
                <span className="text-xs text-gray-400">{filteredByDoctor.length} doctor{filteredByDoctor.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="p-5 space-y-4">
                {filteredByDoctor
                  .slice()
                  .sort((a, b) => (b.total || 0) - (a.total || 0))
                  .map((doc, i) => (
                    <DoctorBar
                      key={i}
                      doc={doc}
                      maxTotal={maxDoctorTotal}
                      filteredTotal={filteredDoctorTotal}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* ── Billing Ledger ── */}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-500" />
                <h2 className="font-semibold text-gray-800">Billing Ledger</h2>
              </div>
              <div className="flex items-center gap-2">
                {activeFilters > 0 && (
                  <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">
                    {filteredBilling.length} of {data.billing.length} rows
                  </span>
                )}
                <span className="text-xs text-gray-400">{filteredBilling.length} invoice{filteredBilling.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {filteredBilling.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <BarChart3 size={36} className="mx-auto mb-3 opacity-20" />
                <p className="font-medium text-gray-500">No matching invoices</p>
                <p className="text-sm mt-1">
                  {activeFilters > 0
                    ? 'Try adjusting filters or clearing the search query.'
                    : `No paid invoices found for ${filterMode === 'month' ? month : `${fromDate} → ${toDate}`}.`}
                </p>
              </div>
            ) : (
              <div className="table-wrapper rounded-xl border-0 overflow-x-auto">
                <table className="table min-w-full">
                  <thead>
                    <tr>
                      <th className="th">Invoice</th>
                      <th className="th">Patient</th>
                      <th className="th">Doctor</th>
                      {branchOptions.length > 1 && <th className="th">Branch</th>}
                      <th className="th">Method</th>
                      <th className="th text-right">Amount</th>
                      <th className="th">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredBilling.map((row, i) => (
                      <tr key={i} className="tr-hover">
                        <td className="td font-mono text-xs text-gray-500">{row.invoice_number || '—'}</td>
                        <td className="td font-medium text-gray-800">{row.patient_name || '—'}</td>
                        <td className="td text-gray-500 text-sm">{row.doctor_name || '—'}</td>
                        {branchOptions.length > 1 && (
                          <td className="td text-gray-400 text-xs">{row.branch_name || '—'}</td>
                        )}
                        <td className="td">
                          {row.payment_mode ? (
                            <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full capitalize">
                              {row.payment_mode}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="td text-right font-semibold text-green-700">{fmtCurrency(row.amount)}</td>
                        <td className="td text-xs text-gray-400 whitespace-nowrap">
                          {row.billed_at
                            ? (() => { try { return format(parseISO(row.billed_at.slice(0, 10)), 'd MMM yyyy') } catch { return row.billed_at } })()
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50">
                      <td colSpan={branchOptions.length > 1 ? 5 : 4} className="td text-sm font-semibold text-gray-700 text-right">
                        Total ({filteredBilling.length} invoices)
                      </td>
                      <td className="td text-right font-bold text-green-700">{fmtCurrency(stats.total)}</td>
                      <td className="td" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Empty state (no error, no data) ── */}
      {!loading && !error && !data && (
        <div className="card p-10 text-center text-gray-400">
          <BarChart3 size={36} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium text-gray-500">No data loaded</p>
          <p className="text-sm mt-1">Select a period above and click Refresh.</p>
        </div>
      )}
    </div>
  )
}
