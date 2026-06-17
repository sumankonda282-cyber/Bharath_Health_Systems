import { useState, useEffect, useMemo } from 'react'
import { adminApi } from '../api'
import {
  Download, FileText, FileSpreadsheet, Printer, Filter, X,
  ChevronDown, ChevronUp, Search, Save, Clock, RefreshCw,
  Building2, Users, IndianRupee, Activity, ShieldCheck, ClipboardList, Eye
} from 'lucide-react'

// ── Report library ────────────────────────────────────────────────────────────
const REPORT_LIBRARY = [
  {
    category: 'Financial',
    icon: IndianRupee,
    color: '#F5821E',
    reports: [
      { id: 'mrr_by_clinic',      label: 'MRR by Clinic',             desc: 'Monthly revenue per clinic with plan details' },
      { id: 'revenue_by_plan',    label: 'Revenue by Plan',           desc: 'Billing breakdown per subscription tier' },
      { id: 'billing_summary',    label: 'Billing Summary',           desc: 'Invoices, payments, outstanding' },
      { id: 'plan_changes',       label: 'Subscription Changes',      desc: 'Upgrades, downgrades, cancellations' },
    ]
  },
  {
    category: 'Clinical',
    icon: Activity,
    color: '#38bdf8',
    reports: [
      { id: 'appointments',       label: 'Appointments Summary',      desc: 'OPD volume per clinic per day' },
      { id: 'opd_by_doctor',      label: 'OPD by Doctor',             desc: 'Appointment count per doctor' },
      { id: 'ipd_admissions',     label: 'IPD Admissions',            desc: 'Admissions, discharges, LOS' },
      { id: 'diagnosis_freq',     label: 'Diagnosis Frequency',       desc: 'Top diagnoses across platform' },
    ]
  },
  {
    category: 'Patient',
    icon: Users,
    color: '#6366f1',
    reports: [
      { id: 'patient_registrations', label: 'Patient Registrations',  desc: 'New BH IDs by date and clinic' },
      { id: 'bhid_log',           label: 'BH ID Issuance Log',        desc: 'All issued BH IDs with state and clinic' },
      { id: 'demographics',       label: 'Demographics',              desc: 'Age, gender, state distribution' },
      { id: 'chronic_conditions', label: 'Chronic Conditions',        desc: 'Condition prevalence across patients' },
    ]
  },
  {
    category: 'Operations',
    icon: Building2,
    color: '#10b981',
    reports: [
      { id: 'clinic_onboarding',  label: 'Clinic Onboarding',         desc: 'Registration pipeline status' },
      { id: 'staff_directory',    label: 'Staff Directory',           desc: 'All staff with role and verification' },
      { id: 'shift_attendance',   label: 'Shift & Attendance',        desc: 'Staff shifts and attendance log' },
      { id: 'clinic_activity',    label: 'Clinic Activity',           desc: 'Last login, appointments today' },
    ]
  },
  {
    category: 'Compliance',
    icon: ShieldCheck,
    color: '#a78bfa',
    reports: [
      { id: 'audit_trail',        label: 'Audit Trail',               desc: 'All platform admin actions' },
      { id: 'login_activity',     label: 'Login Activity',            desc: 'Login events across portals' },
      { id: 'staff_verification', label: 'Staff Verification Queue',  desc: 'Pending and completed verifications' },
    ]
  },
]

// ── Column definitions per report ─────────────────────────────────────────────
const COLUMNS = {
  mrr_by_clinic:        ['Clinic', 'City', 'Plan', 'Doctors', 'Rate/Doctor', 'MRR (₹)', 'Status'],
  revenue_by_plan:      ['Plan', 'Clinics', 'Doctors', 'Rate/Doctor', 'Monthly Revenue (₹)'],
  billing_summary:      ['Clinic', 'Invoice #', 'Date', 'Amount (₹)', 'Status'],
  plan_changes:         ['Clinic', 'Previous Plan', 'New Plan', 'Change Date', 'Changed By'],
  appointments:         ['Date', 'Clinic', 'City', 'Doctor', 'OPD Count', 'Cancelled'],
  opd_by_doctor:        ['Doctor', 'Clinic', 'Specialty', 'Appointments', 'Avg/Day'],
  ipd_admissions:       ['Patient', 'Clinic', 'Admitted', 'Discharged', 'LOS (Days)', 'Diagnosis'],
  diagnosis_freq:       ['Diagnosis', 'ICD Code', 'Count', 'Clinics', 'Trend'],
  patient_registrations:['BH ID', 'Name', 'Gender', 'Date Registered', 'Clinic', 'State'],
  bhid_log:             ['BH ID', 'State Digit', 'Clinic', 'Issued On', 'Linked Mobile'],
  demographics:         ['Age Group', 'Male', 'Female', 'Other', 'Total', '% Share'],
  chronic_conditions:   ['Condition', 'Patient Count', 'Avg Age', 'Gender Split', 'Top Clinic'],
  clinic_onboarding:    ['Clinic', 'City', 'Registered', 'Status', 'Approved By', 'Days to Approve'],
  staff_directory:      ['Name', 'Role', 'Clinic', 'Email', 'Mobile', 'Status', 'Verified'],
  shift_attendance:     ['Staff', 'Role', 'Clinic', 'Date', 'Shift', 'Check In', 'Check Out'],
  clinic_activity:      ['Clinic', 'City', 'Plan', 'Last Login', 'OPD Today', 'Patients Total'],
  audit_trail:          ['Timestamp', 'Admin', 'Action', 'Target', 'Details', 'IP'],
  login_activity:       ['Timestamp', 'User', 'Role', 'Portal', 'IP', 'Status'],
  staff_verification:   ['Staff Name', 'Role', 'Clinic', 'Submitted', 'Status', 'Reviewed By'],
}

const DATE_PRESETS = [
  { label: 'Today',        days: 0 },
  { label: 'Last 7 days',  days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'This Quarter', days: 90 },
  { label: 'This Year',    days: 365 },
]

function dateOffset(days) {
  const d = new Date()
  if (days > 0) d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCSV(columns, rows, filename) {
  const header = columns.join(',')
  const body   = (rows || []).map(r => columns.map(c => `"${r[c] ?? ''}"`).join(',')).join('\n')
  const blob   = new Blob([header + '\n' + body], { type: 'text/csv' })
  const url    = URL.createObjectURL(blob)
  const a      = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Print / PDF ───────────────────────────────────────────────────────────────
function exportPDF(title, columns, rows) {
  const win = window.open('', '_blank')
  win.document.write(`<html><head><title>${title}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:12px;padding:20px}
    h2{color:#0F2557;margin-bottom:4px}
    p{color:#666;font-size:11px;margin:0 0 16px}
    table{border-collapse:collapse;width:100%}
    th{background:#0F2557;color:#fff;padding:6px 10px;text-align:left;font-size:11px}
    td{padding:5px 10px;border-bottom:1px solid #e5e7eb;font-size:11px}
    tr:nth-child(even){background:#f9fafb}
  </style></head><body>
  <h2>BHarath Health — ${title}</h2>
  <p>Generated: ${new Date().toLocaleString('en-IN')}</p>
  <table><thead><tr>${columns.map(c=>`<th>${c}</th>`).join('')}</tr></thead>
  <tbody>${(rows||[]).map(r=>`<tr>${columns.map(c=>`<td>${r[c]??''}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></body></html>`)
  win.document.close()
  win.print()
}

// ── Sortable table header ─────────────────────────────────────────────────────
function SortTh({ col, sortKey, sortDir, onSort }) {
  const active = sortKey === col
  return (
    <th className="th cursor-pointer select-none hover:text-white transition-colors"
      onClick={() => onSort(col)}>
      <div className="flex items-center gap-1">
        {col}
        {active
          ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
          : <ChevronDown size={12} className="opacity-30" />}
      </div>
    </th>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Reports() {
  const [activeReport, setActiveReport] = useState(null)
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(false)
  const [search,  setSearch]  = useState('')
  const [page,    setPage]    = useState(1)
  const [perPage, setPerPage] = useState(50)
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [visibleCols, setVisibleCols] = useState([])
  const [colPickerOpen, setColPickerOpen] = useState(false)
  const [exportOpen,    setExportOpen]    = useState(false)
  const [savedReports, setSavedReports]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('bh_saved_reports') || '[]') } catch { return [] }
  })

  // Filters
  const [dateFrom, setDateFrom] = useState(dateOffset(30))
  const [dateTo,   setDateTo]   = useState(dateOffset(0))
  const [filterChips, setFilterChips] = useState([])
  const [activePreset, setActivePreset] = useState('Last 30 days')

  const columns = activeReport ? (COLUMNS[activeReport.id] || []) : []

  useEffect(() => { if (columns.length) setVisibleCols(columns) }, [activeReport])

  const runReport = () => {
    if (!activeReport) return
    setLoading(true)
    setPage(1)
    adminApi.getReports({ report: activeReport.id, date_from: dateFrom, date_to: dateTo })
      .then(d => setRows(Array.isArray(d) ? d : d?.rows || d?.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (activeReport) runReport() }, [activeReport])

  const handleSort = col => {
    if (sortKey === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(col); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let r = rows
    if (search) r = r.filter(row => Object.values(row).some(v => String(v).toLowerCase().includes(search.toLowerCase())))
    if (sortKey) r = [...r].sort((a, b) => {
      const av = a[sortKey] ?? '', bv = b[sortKey] ?? ''
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
    return r
  }, [rows, search, sortKey, sortDir])

  const paginated  = filtered.slice((page - 1) * perPage, page * perPage)
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))

  const saveReport = () => {
    if (!activeReport) return
    const saved = { id: Date.now(), label: activeReport.label, reportId: activeReport.id, dateFrom, dateTo }
    const next  = [saved, ...savedReports].slice(0, 10)
    setSavedReports(next)
    localStorage.setItem('bh_saved_reports', JSON.stringify(next))
  }

  const applyPreset = (preset) => {
    setActivePreset(preset.label)
    setDateFrom(dateOffset(preset.days))
    setDateTo(dateOffset(0))
  }

  return (
    <div className="flex gap-5 h-full min-h-[calc(100vh-120px)]">

      {/* ── LEFT SIDEBAR — Report Library ── */}
      <div className="w-56 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
        {savedReports.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">Saved</div>
            <div className="space-y-1">
              {savedReports.map(s => (
                <button key={s.id}
                  onClick={() => setActiveReport({ id: s.reportId, label: s.label })}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center gap-2 ${activeReport?.id === s.reportId ? 'text-white font-semibold' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                  style={activeReport?.id === s.reportId ? { background: '#0F2557' } : {}}>
                  <ClipboardList size={12} className="flex-shrink-0" />{s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {REPORT_LIBRARY.map(cat => (
          <div key={cat.category}>
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <cat.icon size={12} style={{ color: cat.color }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: cat.color }}>
                {cat.category}
              </span>
            </div>
            <div className="space-y-0.5">
              {cat.reports.map(r => (
                <button key={r.id}
                  onClick={() => setActiveReport(r)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors ${activeReport?.id === r.id ? 'text-white font-semibold' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                  style={activeReport?.id === r.id ? { background: '#0F2557' } : {}}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">

        {!activeReport ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <FileText size={48} className="text-gray-700 mb-4" />
            <div className="text-gray-400 font-semibold">Select a report from the library</div>
            <div className="text-gray-600 text-sm mt-1">Choose a category and report on the left to get started</div>
          </div>
        ) : (
          <>
            {/* Report header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-base font-bold text-white">{activeReport.label}</h2>
                {activeReport.desc && <p className="text-xs text-gray-500 mt-0.5">{activeReport.desc}</p>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={saveReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-800 border border-gray-700 text-gray-300 hover:text-white transition-colors">
                  <Save size={13} /> Save
                </button>
                <button onClick={runReport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-800 border border-gray-700 text-gray-300 hover:text-white transition-colors">
                  <RefreshCw size={13} /> Refresh
                </button>
                {/* Column picker */}
                <div className="relative">
                  <button onClick={() => setColPickerOpen(o => !o)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-800 border border-gray-700 text-gray-300 hover:text-white transition-colors">
                    <Eye size={13} /> Columns
                  </button>
                  {colPickerOpen && (
                    <div className="absolute right-0 top-8 z-50 bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-3 min-w-[160px]">
                      <div className="text-xs font-semibold text-gray-400 mb-2">Show/Hide Columns</div>
                      {columns.map(c => (
                        <label key={c} className="flex items-center gap-2 py-1 cursor-pointer">
                          <input type="checkbox" checked={visibleCols.includes(c)}
                            onChange={e => setVisibleCols(prev =>
                              e.target.checked ? [...prev, c] : prev.filter(x => x !== c))}
                            className="accent-orange-400" />
                          <span className="text-xs text-gray-300">{c}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {/* Export */}
                <div className="relative">
                  <button onClick={() => setExportOpen(o => !o)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-colors"
                    style={{ background: '#065F46' }}>
                    <Download size={13} /> Export <ChevronDown size={12} />
                  </button>
                  {exportOpen && (
                    <div className="absolute right-0 top-8 z-50 bg-gray-800 border border-gray-700 rounded-xl shadow-xl py-1 min-w-[150px]">
                      <button onClick={() => { exportCSV(visibleCols, filtered, `${activeReport.id}.csv`); setExportOpen(false) }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                        <FileText size={13} className="text-gray-500" /> Download CSV
                      </button>
                      <button onClick={() => { exportCSV(visibleCols, filtered, `${activeReport.id}.xlsx`); setExportOpen(false) }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                        <FileSpreadsheet size={13} className="text-gray-500" /> Download Excel
                      </button>
                      <button onClick={() => { exportPDF(activeReport.label, visibleCols, filtered); setExportOpen(false) }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                        <Printer size={13} className="text-gray-500" /> Print / PDF
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Filter bar */}
            <div className="card p-4 space-y-3">
              {/* Date presets */}
              <div className="flex items-center gap-2 flex-wrap">
                {DATE_PRESETS.map(p => (
                  <button key={p.label} onClick={() => applyPreset(p)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${activePreset === p.label ? 'text-white' : 'text-gray-500 hover:text-gray-300 bg-transparent'}`}
                    style={activePreset === p.label ? { background: '#0F2557' } : {}}>
                    {p.label}
                  </button>
                ))}
                <span className="text-gray-700 text-xs">|</span>
                <div className="flex items-center gap-2">
                  <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setActivePreset('') }}
                    className="input py-1 text-xs w-32" />
                  <span className="text-gray-500 text-xs">to</span>
                  <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setActivePreset('') }}
                    className="input py-1 text-xs w-32" />
                  <button onClick={runReport}
                    className="px-4 py-1 rounded-lg text-xs font-semibold text-white transition-colors"
                    style={{ background: '#0F2557' }}>
                    Apply
                  </button>
                </div>
              </div>
            </div>

            {/* Search + record count */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                  placeholder="Search within results…"
                  className="input pl-8 py-1.5 text-xs w-64" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  {loading ? 'Loading…' : `${filtered.length.toLocaleString()} records`}
                </span>
                <select value={perPage} onChange={e => { setPerPage(+e.target.value); setPage(1) }}
                  className="input py-1 text-xs w-24">
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                  <option value={250}>250 / page</option>
                </select>
              </div>
            </div>

            {/* Data table */}
            <div className="card overflow-hidden flex-1">
              <div className="overflow-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      {visibleCols.map(c => (
                        <SortTh key={c} col={c} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {loading ? (
                      Array(8).fill(0).map((_, i) => (
                        <tr key={i}>
                          {visibleCols.map(c => (
                            <td key={c} className="td">
                              <div className="h-3 bg-gray-800 rounded animate-pulse w-20" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : paginated.length === 0 ? (
                      <tr>
                        <td colSpan={visibleCols.length} className="td text-center text-gray-500 py-16">
                          No data for selected filters
                        </td>
                      </tr>
                    ) : (
                      paginated.map((row, i) => (
                        <tr key={i} className="tr-hover">
                          {visibleCols.map(c => (
                            <td key={c} className="td text-gray-300 whitespace-nowrap">{row[c] ?? '—'}</td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-3 border-t border-gray-800 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Page {page} of {totalPages} · showing {Math.min(perPage, filtered.length - (page-1)*perPage)} of {filtered.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(1)} disabled={page === 1}
                      className="px-2 py-1 rounded text-xs text-gray-400 hover:text-white disabled:opacity-30 transition-colors">«</button>
                    <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                      className="px-2 py-1 rounded text-xs text-gray-400 hover:text-white disabled:opacity-30 transition-colors">‹</button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
                      return (
                        <button key={p} onClick={() => setPage(p)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${page === p ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                          style={page === p ? { background: '#0F2557' } : {}}>
                          {p}
                        </button>
                      )
                    })}
                    <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                      className="px-2 py-1 rounded text-xs text-gray-400 hover:text-white disabled:opacity-30 transition-colors">›</button>
                    <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                      className="px-2 py-1 rounded text-xs text-gray-400 hover:text-white disabled:opacity-30 transition-colors">»</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
