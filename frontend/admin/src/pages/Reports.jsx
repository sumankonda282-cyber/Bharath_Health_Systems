import { useState, useEffect, useMemo } from 'react'
import { adminApi } from '../api'
import {
  IndianRupee, Building2, Users, ChevronDown, ChevronRight,
  Download, Search, X, ChevronUp, Calendar,
} from 'lucide-react'

const SECTIONS = [
  {
    key: 'financial',
    label: 'Financial',
    color: '#22c55e',
    reports: [
      { key: 'billing_by_plan',   label: 'Billing by Plan' },
      { key: 'mrr_overview',      label: 'MRR Overview' },
      { key: 'registrations',     label: 'Monthly Registrations' },
    ],
  },
  {
    key: 'clinical',
    label: 'Clinical',
    color: '#3b82f6',
    reports: [
      { key: 'clinic_status',     label: 'Clinic Status' },
      { key: 'plan_distribution', label: 'Plan Distribution' },
    ],
  },
  {
    key: 'patient',
    label: 'Patient',
    color: '#a855f7',
    reports: [
      { key: 'patient_summary',   label: 'Patient Summary' },
    ],
  },
  {
    key: 'operations',
    label: 'Operations',
    color: '#F5821E',
    reports: [
      { key: 'clinic_overview',   label: 'Clinic Overview' },
      { key: 'staff_metrics',     label: 'Staff Metrics' },
    ],
  },
  {
    key: 'compliance',
    label: 'Compliance',
    color: '#ef4444',
    reports: [
      { key: 'audit_overview',    label: 'Audit Overview' },
    ],
  },
]

function exportCsv(rows, columns, filename = 'report.csv') {
  const header = columns.map(c => c.label).join(',')
  const lines  = rows.map(row =>
    columns.map(c => {
      const v = String(c.render ? c.render(row) : (row[c.key] ?? '')).replace(/"/g, '""')
      return `"${v}"`
    }).join(',')
  )
  const csv  = [header, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function SortIcon({ active, dir }) {
  if (!active) return <ChevronDown size={11} className="text-gray-600" />
  return dir === 'asc'
    ? <ChevronUp size={11} className="text-[#F5821E]" />
    : <ChevronDown size={11} className="text-[#F5821E]" />
}

function ReportTable({ columns, rows, emptyMsg = 'No data available.' }) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('')
  const [sortDir, setSortDir] = useState('asc')

  const filtered = useMemo(() => {
    let r = rows
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(row =>
        columns.some(col => {
          const v = col.render ? col.render(row) : row[col.key]
          return String(v ?? '').toLowerCase().includes(q)
        })
      )
    }
    if (sortKey) {
      r = [...r].sort((a, b) => {
        const av = String(a[sortKey] ?? '').toLowerCase()
        const bv = String(b[sortKey] ?? '').toLowerCase()
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      })
    }
    return r
  }, [rows, search, sortKey, sortDir, columns])

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-800 flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter rows…"
            className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded-lg pl-7 pr-7 py-1.5 outline-none focus:border-[#F5821E] transition-colors placeholder-gray-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X size={11} />
            </button>
          )}
        </div>
        <span className="text-xs text-gray-600">{filtered.length} rows</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-[10px] text-gray-500 uppercase tracking-wider">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 text-left select-none ${col.sortable !== false ? 'cursor-pointer hover:text-white' : ''} ${col.align === 'right' ? 'text-right' : ''}`}
                  onClick={() => col.sortable !== false && toggleSort(col.key)}
                >
                  <span className="flex items-center gap-1 justify-start">
                    {col.label}
                    {col.sortable !== false && <SortIcon active={sortKey === col.key} dir={sortDir} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-500 text-xs">
                  {emptyMsg}
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                  {columns.map(col => (
                    <td key={col.key} className={`px-4 py-2.5 text-sm ${col.align === 'right' ? 'text-right' : ''}`}>
                      {col.render ? col.render(row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const fmt = n => typeof n === 'number' ? `₹${n.toLocaleString('en-IN')}` : '—'

const REPORT_DEFS = {
  billing_by_plan: {
    title: 'Billing by Plan',
    columns: [
      { key: 'plan',          label: 'Plan',           render: r => <span className="capitalize font-medium text-white">{r.plan}</span> },
      { key: 'clinic_count',  label: 'Clinics',        align: 'right', render: r => <span className="text-white">{r.clinic_count}</span> },
      { key: 'total_doctors', label: 'Doctors',        align: 'right', render: r => <span className="text-white">{r.total_doctors}</span> },
      { key: 'price_per_doctor', label: 'Rate/Doctor', align: 'right', render: r => <span className="text-gray-400">{r.price_per_doctor > 0 ? `₹${r.price_per_doctor}/mo` : 'Free'}</span> },
      { key: 'revenue',       label: 'Monthly Revenue', align: 'right', render: r => <span className="text-emerald-400 font-semibold">{fmt(r.revenue)}</span> },
    ],
    extract: data => data.billing_by_plan || [],
  },
  mrr_overview: {
    title: 'MRR Overview',
    columns: [
      { key: 'metric', label: 'Metric',  render: r => <span className="font-medium text-white">{r.metric}</span> },
      { key: 'value',  label: 'Value',   align: 'right', render: r => <span className="text-white font-semibold">{r.value}</span> },
    ],
    extract: data => [
      { metric: 'Monthly Recurring Revenue', value: fmt(data.mrr) },
      { metric: 'Total Active Clinics',       value: data.clinic_status_distribution?.active ?? '—' },
      { metric: 'Total Active Doctors',       value: data.total_doctors ?? '—' },
      { metric: 'New Registrations (Period)', value: data.new_registrations ?? '—' },
    ],
  },
  registrations: {
    title: 'Monthly Registrations',
    columns: [
      { key: 'month', label: 'Month', render: r => <span className="font-medium text-white">{r.month}</span> },
      { key: 'count', label: 'Clinics Registered', align: 'right', render: r => <span className="text-white font-semibold">{r.count}</span> },
    ],
    extract: data => data.monthly_registrations || [],
  },
  clinic_status: {
    title: 'Clinic Status Breakdown',
    columns: [
      { key: 'status', label: 'Status', render: r => <span className="capitalize font-medium text-white">{r.status}</span> },
      { key: 'count',  label: 'Count',  align: 'right', render: r => <span className="text-white font-semibold">{r.count}</span> },
      { key: 'pct',    label: '% Share', align: 'right', sortable: false, render: r => <span className="text-gray-400">{r.pct}%</span> },
    ],
    extract: data => {
      const dist  = data.clinic_status_distribution || {}
      const total = Object.values(dist).reduce((s, v) => s + v, 0) || 1
      return Object.entries(dist).map(([status, count]) => ({
        status,
        count,
        pct: Math.round((count / total) * 100),
      }))
    },
  },
  plan_distribution: {
    title: 'Plan Distribution',
    columns: [
      { key: 'plan',  label: 'Plan',  render: r => <span className="capitalize font-medium text-white">{r.plan}</span> },
      { key: 'count', label: 'Count', align: 'right', render: r => <span className="text-white font-semibold">{r.count}</span> },
      { key: 'pct',   label: '% Share', align: 'right', sortable: false, render: r => <span className="text-gray-400">{r.pct}%</span> },
    ],
    extract: data => {
      const dist  = data.plan_distribution || {}
      const total = Object.values(dist).reduce((s, v) => s + v, 0) || 1
      return Object.entries(dist).map(([plan, count]) => ({
        plan,
        count,
        pct: Math.round((count / total) * 100),
      }))
    },
  },
  patient_summary: {
    title: 'Patient Summary',
    columns: [
      { key: 'metric', label: 'Metric', render: r => <span className="font-medium text-white">{r.metric}</span> },
      { key: 'value',  label: 'Value',  align: 'right', render: r => <span className="text-white font-semibold">{r.value}</span> },
    ],
    extract: data => [
      { metric: 'Total Patients (Platform)',      value: data.total_patients ?? '—' },
      { metric: 'New Registrations (Period)',     value: data.new_registrations ?? '—' },
      { metric: 'Active Clinics Serving Patients', value: data.clinic_status_distribution?.active ?? '—' },
    ],
  },
  clinic_overview: {
    title: 'Clinic Overview',
    columns: [
      { key: 'metric', label: 'Metric', render: r => <span className="font-medium text-white">{r.metric}</span> },
      { key: 'value',  label: 'Value',  align: 'right', render: r => <span className="text-white font-semibold">{r.value}</span> },
    ],
    extract: data => {
      const dist = data.clinic_status_distribution || {}
      return [
        { metric: 'Total Clinics',     value: Object.values(dist).reduce((s, v) => s + v, 0) },
        { metric: 'Active',            value: dist.active ?? 0 },
        { metric: 'Pending',           value: dist.pending ?? 0 },
        { metric: 'Suspended',         value: dist.suspended ?? 0 },
        { metric: 'Revoked',           value: dist.revoked ?? 0 },
      ]
    },
  },
  staff_metrics: {
    title: 'Staff Metrics',
    columns: [
      { key: 'metric', label: 'Metric', render: r => <span className="font-medium text-white">{r.metric}</span> },
      { key: 'value',  label: 'Value',  align: 'right', render: r => <span className="text-white font-semibold">{r.value}</span> },
    ],
    extract: data => [
      { metric: 'Total Active Doctors', value: data.total_doctors ?? '—' },
      { metric: 'MRR per Doctor',       value: data.mrr && data.total_doctors ? fmt(Math.round(data.mrr / data.total_doctors)) : '—' },
    ],
  },
  audit_overview: {
    title: 'Audit Overview',
    columns: [
      { key: 'metric', label: 'Metric', render: r => <span className="font-medium text-white">{r.metric}</span> },
      { key: 'value',  label: 'Value',  align: 'right', render: r => <span className="text-white font-semibold">{r.value}</span> },
    ],
    extract: data => [
      { metric: 'New Registrations in Period', value: data.new_registrations ?? '—' },
      { metric: 'Active Clinics',              value: data.clinic_status_distribution?.active ?? '—' },
      { metric: 'Estimated MRR',              value: fmt(data.mrr) },
    ],
  },
}

export default function Reports() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

  const [openSections, setOpenSections] = useState({ financial: true, clinical: false, patient: false, operations: false, compliance: false })
  const [activeReport, setActiveReport] = useState('billing_by_plan')

  const load = () => {
    setLoading(true)
    adminApi.getReports({ date_from: dateFrom, date_to: dateTo })
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  function toggleSection(key) {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const def   = REPORT_DEFS[activeReport]
  const rows  = data && def ? def.extract(data) : []

  return (
    <div className="space-y-2.5">
      {/* Single control line */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-base font-bold text-white flex-1">Reports</h1>
        <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5">
          <Calendar size={12} className="text-gray-500" />
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-transparent text-xs text-white outline-none w-28"
          />
          <span className="text-gray-600 text-xs">–</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-transparent text-xs text-white outline-none w-28"
          />
        </div>
        <button
          onClick={load}
          className="px-3 py-1.5 bg-[#F5821E] hover:bg-[#e07319] text-white text-xs font-medium rounded-lg transition-colors"
        >
          Apply
        </button>
        {data && def && rows.length > 0 && (
          <button
            onClick={() => exportCsv(rows, def.columns, `${activeReport}.csv`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 border border-gray-800 hover:bg-gray-800 text-gray-300 hover:text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Download size={12} />
            Export CSV
          </button>
        )}
      </div>

      <div className="flex gap-2.5">
        {/* Left sidebar */}
        <div className="w-44 flex-shrink-0 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden self-start">
          {SECTIONS.map(section => (
            <div key={section.key}>
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-800 transition-colors"
              >
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: section.color }}>
                  {section.label}
                </span>
                {openSections[section.key]
                  ? <ChevronDown size={12} className="text-gray-500" />
                  : <ChevronRight size={12} className="text-gray-500" />
                }
              </button>
              {openSections[section.key] && (
                <div className="pb-1">
                  {section.reports.map(report => (
                    <button
                      key={report.key}
                      onClick={() => setActiveReport(report.key)}
                      className={`w-full text-left px-4 py-1.5 text-xs transition-colors ${
                        activeReport === report.key
                          ? 'text-[#F5821E] bg-[#F5821E]/10 font-medium'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}
                    >
                      {report.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="border-b border-gray-800" />
            </div>
          ))}
        </div>

        {/* Main content: table only */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center py-24 bg-gray-900 border border-gray-800 rounded-xl">
              <div className="w-6 h-6 border-[3px] border-t-transparent rounded-full animate-spin" style={{ borderColor: '#F5821E', borderTopColor: 'transparent' }} />
            </div>
          ) : !data ? (
            <div className="flex items-center justify-center py-16 bg-gray-900 border border-gray-800 rounded-xl">
              <p className="text-gray-500 text-sm">No report data available</p>
            </div>
          ) : def ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">{def.title}</h2>
                <span className="text-xs text-gray-600">{dateFrom} → {dateTo}</span>
              </div>
              <ReportTable columns={def.columns} rows={rows} emptyMsg={`No data for "${def.title}".`} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
