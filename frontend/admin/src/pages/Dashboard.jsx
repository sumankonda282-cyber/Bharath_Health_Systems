import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  IndianRupee,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react'
import { adminApi } from '../api'

const STATUS_COLORS = {
  active: '#22c55e',
  pending: '#F5821E',
  suspended: '#eab308',
  revoked: '#ef4444',
}

function InlineTrend({ note = 'Trend data unavailable' }) {
  return (
    <div className="relative h-16 w-full">
      <svg viewBox="0 0 200 60" preserveAspectRatio="none" className="h-full w-full">
        <line x1="0" y1="48" x2="200" y2="48" stroke="#1f2937" strokeWidth="1" />
        <polyline
          points="0,46 40,44 80,45 120,43 160,44 200,42"
          fill="none"
          stroke="#374151"
          strokeWidth="2"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] text-faint">{note}</span>
      </div>
    </div>
  )
}

function StatusDonut({ segments }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  const radius = 30
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#1f2937" strokeWidth="10" />
        {total > 0 &&
          segments.map((seg) => {
            const frac = seg.value / total
            const dash = frac * circumference
            const el = (
              <circle
                key={seg.key}
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="10"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            )
            offset += dash
            return el
          })}
      </svg>
      <div className="flex flex-col gap-1">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-2 text-[11px]">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-dim">{seg.label}</span>
            <span className="ml-auto font-semibold text-app">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div className="card-sm p-3">
      <div className="mb-2 text-[11px] uppercase tracking-wide text-faint">{title}</div>
      {children}
    </div>
  )
}

const MODULES = [
  { key: 'pharmacy',   label: 'Pharmacy' },
  { key: 'lab',        label: 'Lab' },
  { key: 'imaging',    label: 'Imaging' },
  { key: 'telehealth', label: 'Telehealth' },
  { key: 'inpatient',  label: 'Inpatient' },
]

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    adminApi
      .getDashboard()
      .then((d) => {
        if (active) setData(d)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-app border-t-[#F5821E]" />
      </div>
    )
  }

  const reload = () => {
    let active = true
    setLoading(true)
    setError(false)
    adminApi.getDashboard().then(d => { if (active) setData(d) }).catch(() => { if (active) setError(true) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }

  if (error || !data) {
    return (
      <div className="card-sm border border-red-500/40 p-4 text-sm text-red-400 flex items-center gap-3">
        <span>Failed to load dashboard.</span>
        <button onClick={reload} className="ml-auto px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-medium transition-colors">Retry</button>
      </div>
    )
  }

  const total_clinics = data.total_clinics || 0
  const active_clinics = data.active_clinics || 0
  const pending_clinics = data.pending_clinics || 0
  const suspended_clinics = data.suspended_clinics || 0
  const revoked_clinics = data.revoked_clinics || 0
  const total_doctors = data.total_doctors || 0
  const total_patients = data.total_patients || 0
  const pending_staff = data.pending_staff || 0
  const new_this_month = data.new_this_month || 0
  const mrr = data.mrr || 0
  const rate_card = data.rate_card || {}
  const appointments_today = data.appointments_today ?? '—'
  const invoices_today = data.invoices_today ?? '—'
  const new_patients_today = data.new_patients_today ?? '—'
  const module_adoption = data.module_adoption || {}
  const expiring_soon = data.expiring_soon ?? null
  const oldest_pending_days = data.oldest_pending_days ?? null

  const statusSegments = [
    { key: 'active', label: 'Active', value: active_clinics, color: STATUS_COLORS.active },
    { key: 'pending', label: 'Pending', value: pending_clinics, color: STATUS_COLORS.pending },
    { key: 'suspended', label: 'Suspended', value: suspended_clinics, color: STATUS_COLORS.suspended },
    { key: 'revoked', label: 'Revoked', value: revoked_clinics, color: STATUS_COLORS.revoked },
  ]

  const alerts = []
  if (pending_clinics > 0) {
    alerts.push({
      key: 'pending-hc',
      color: '#F5821E',
      to: '/pending',
      text: `${pending_clinics} Health Center${pending_clinics > 1 ? 's' : ''} awaiting approval`,
    })
  }
  if (pending_staff > 0) {
    alerts.push({
      key: 'pending-staff',
      color: '#eab308',
      to: '/staff',
      text: `${pending_staff} staff awaiting verification`,
    })
  }
  const inactiveHc = suspended_clinics + revoked_clinics
  if (inactiveHc > 0) {
    alerts.push({
      key: 'inactive-hc',
      color: '#ef4444',
      to: null,
      text: `${inactiveHc} Health Center${inactiveHc > 1 ? 's' : ''} suspended/revoked`,
    })
  }

  const kpis = [
    {
      to: '/health-centers',
      label: 'Health Centers',
      value: total_clinics,
      sub: <span>{active_clinics} active · {pending_clinics} pending</span>,
    },
    { to: '/patients', label: 'Total Patients', value: total_patients, sub: 'Platform-wide' },
    { to: '/health-centers', label: 'Doctors', value: total_doctors, sub: 'Active' },
    {
      to: '/payments',
      label: 'Platform MRR',
      value: `₹${mrr.toLocaleString('en-IN')}`,
      sub: 'Est. monthly',
    },
    {
      to: '/health-centers',
      label: 'Expiring <7d',
      value: expiring_soon ?? '—',
      sub: <span className={expiring_soon > 0 ? 'text-[#F5821E]' : 'text-faint'}>At risk</span>,
    },
    {
      to: '/pending',
      label: 'Pending',
      value: pending_clinics + pending_staff,
      sub: <span>{pending_clinics} HC · {pending_staff} staff</span>,
    },
  ]

  const activity = [
    { label: 'Appointments Today', value: appointments_today, sub: 'Today' },
    { label: 'Invoices Today', value: invoices_today, sub: 'Today' },
    { label: 'New Patients Today', value: new_patients_today, sub: 'Today' },
    { label: 'New HCs This Month', value: new_this_month, sub: 'This month' },
  ]

  return (
    <div className="space-y-3">
      {/* Row 1 — KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => {
          const inner = (
            <>
              <div className="text-[10px] uppercase tracking-wide text-faint">{k.label}</div>
              <div className="text-2xl font-bold text-app">{k.value}</div>
              <div className="text-[11px] text-faint">{k.sub}</div>
            </>
          )
          return k.to ? (
            <Link key={k.label} to={k.to} className="kpi-card transition-colors hover:border-[#F5821E]/50">
              {inner}
            </Link>
          ) : (
            <div key={k.label} className="kpi-card">
              {inner}
            </div>
          )
        })}
      </div>

      {/* Row 2 — activity cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {activity.map((a) => (
          <div key={a.label} className="kpi-card">
            <div className="text-[10px] uppercase tracking-wide text-faint">{a.label}</div>
            <div className="text-2xl font-bold text-app">{a.value}</div>
            <div className="text-[11px] text-faint">{a.sub}</div>
          </div>
        ))}
      </div>

      {/* Row 3 — charts + operational panel */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ChartCard title="MRR Trend">
              <InlineTrend />
            </ChartCard>
            <ChartCard title="HC Growth">
              <InlineTrend />
            </ChartCard>
            <ChartCard title="Patient Growth">
              <InlineTrend />
            </ChartCard>
            <ChartCard title="Health Center Status">
              <StatusDonut segments={statusSegments} />
            </ChartCard>
          </div>
        </div>

        <div className="space-y-3">
          <div className="card-sm p-3">
            <div className="mb-2 text-[11px] uppercase tracking-wide text-faint">Module Adoption</div>
            <div className="flex flex-col gap-2">
              {MODULES.map((m) => {
                const pct = module_adoption[m.key] ?? 0
                return (
                  <div key={m.key} className="flex items-center gap-2 text-[11px]">
                    <span className="w-20 shrink-0 text-dim">{m.label}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full surface-2">
                      <div className="h-full bg-[#F5821E]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-8 text-right text-dim">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card-sm p-3">
            <div className="mb-2 text-[11px] uppercase tracking-wide text-faint">Approval SLA</div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-dim">Oldest pending</span>
                <span className="font-semibold text-app">—</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-dim">Avg approval</span>
                <span className="font-semibold text-app">—</span>
              </div>
            </div>
          </div>

          <div className="card-sm p-3">
            <div className="mb-2 text-[11px] uppercase tracking-wide text-faint">Revenue at Risk</div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-dim">HCs at risk</span>
              <span className="font-semibold text-app">—</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-dim">Exposure</span>
              <span className="font-semibold text-[#F5821E]">₹{mrr.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4 — ranking tables */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="card-sm p-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wide text-faint">
            <TrendingUp className="h-3.5 w-3.5" /> Top Health Centers by MRR
          </div>
          <table className="w-full">
            <thead>
              <tr>
                <th className="th-sm">Rank</th>
                <th className="th-sm">Name</th>
                <th className="th-sm">Plan</th>
                <th className="th-sm">Doctors</th>
                <th className="th-sm">MRR</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="td-sm text-center text-faint" colSpan={5}>
                  No ranking data available
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card-sm p-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wide text-faint">
            <Users className="h-3.5 w-3.5" /> Top by Patients
          </div>
          <table className="w-full">
            <thead>
              <tr>
                <th className="th-sm">Rank</th>
                <th className="th-sm">Name</th>
                <th className="th-sm">City</th>
                <th className="th-sm">Patients</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="td-sm text-center text-faint" colSpan={4}>
                  No ranking data available
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 5 — alerts feed */}
      <div className="card-sm p-3">
        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wide text-faint">
          <AlertTriangle className="h-3.5 w-3.5" /> Alerts
        </div>
        <div className="max-h-48 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="py-4 text-center text-[11px] text-faint">No active alerts</div>
          ) : (
            alerts.map((a) => {
              const row = (
                <div className="flex items-center gap-3 border-b border-app py-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.color }} />
                  <span className="text-[12px] text-dim">{a.text}</span>
                </div>
              )
              return a.to ? (
                <Link key={a.key} to={a.to} className="block hover-app">
                  {row}
                </Link>
              ) : (
                <div key={a.key}>{row}</div>
              )
            })
          )}
        </div>
      </div>

      {/* Rate Card — real data from endpoint */}
      <div className="card-sm p-3">
        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wide text-faint">
          <IndianRupee className="h-3.5 w-3.5" /> Rate Card
        </div>
        {Object.keys(rate_card).length === 0 ? (
          <div className="py-4 text-center text-[11px] text-faint">No rate card configured</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(rate_card).map(([plan, info]) => (
              <div key={plan} className="kpi-card">
                <div className="text-[10px] uppercase tracking-wide text-faint">
                  {info.label || plan}
                </div>
                <div className="text-sm font-bold text-app">
                  ₹{Number(info.price_per_doctor || 0).toLocaleString('en-IN')}
                  <span className="text-[11px] font-normal text-faint"> /doctor</span>
                </div>
                <div className="text-[11px] text-faint">
                  Max {info.max_doctors ?? '—'} doctors
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
