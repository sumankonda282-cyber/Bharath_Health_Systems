import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, IndianRupee, AlertTriangle, TrendingUp, Building2, Stethoscope,
  Clock, CalendarDays, FileText, UserPlus, ArrowUpRight, Activity, LineChart,
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { adminApi } from '../api'

const STATUS_COLORS = {
  active:    '#16A34A',
  pending:   '#F5821E',
  suspended: '#F59E0B',
  revoked:   '#DC2626',
}

function SectionCard({ title, icon: Icon, children, className = '', action }) {
  return (
    <div className={`card-p animate-fade-up ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-ink-muted" />}
          <span className="text-sm font-semibold text-ink">{title}</span>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function EmptyTrend({ label }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-slate-50/60 px-3 pt-3 pb-2">
      <div className="text-[11px] font-semibold text-ink-muted mb-2">{label}</div>
      <div className="relative h-14">
        <svg viewBox="0 0 200 56" preserveAspectRatio="none" className="h-full w-full">
          <line x1="0" y1="44" x2="200" y2="44" stroke="#E6EAF0" strokeWidth="1.5" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] text-ink-muted">No trend data yet</span>
        </div>
      </div>
    </div>
  )
}

function StatusDonut({ segments }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  const pieData = segments.filter((s) => s.value > 0)
  return (
    <div className="flex items-center gap-5">
      <div className="relative h-32 w-32 flex-shrink-0">
        {total > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="label" cx="50%" cy="50%"
                   innerRadius={42} outerRadius={60} paddingAngle={2} stroke="none">
                {pieData.map((s) => <Cell key={s.key} fill={s.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full rounded-full border-[10px] border-slate-100" />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-ink leading-none tracking-tight">{total}</span>
          <span className="text-[10px] text-ink-muted mt-0.5">Total</span>
        </div>
      </div>
      <div className="flex flex-col gap-2 flex-1">
        {segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-ink-soft">{seg.label}</span>
            <span className="ml-auto font-semibold text-ink tabular-nums">{seg.value}</span>
          </div>
        ))}
      </div>
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

const KPI_TONES = {
  navy:    { chip: 'bg-navy-50',    icon: '#0F2557' },
  emerald: { chip: 'bg-emerald-50', icon: '#16A34A' },
  saffron: { chip: 'bg-saffron-50', icon: '#E06D0A' },
  blue:    { chip: 'bg-blue-50',    icon: '#2563EB' },
  amber:   { chip: 'bg-amber-50',   icon: '#D97706' },
  slate:   { chip: 'bg-slate-100',  icon: '#64748B' },
}

function KpiCard({ k, i = 0 }) {
  const tone = KPI_TONES[k.tone] || KPI_TONES.navy
  const Icon = k.icon
  const delay = { animationDelay: `${i * 55}ms` }
  const inner = (
    <>
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tone.chip}`}>
          {Icon && <Icon size={18} style={{ color: tone.icon }} />}
        </div>
        {k.to && <ArrowUpRight size={15} className="text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-ink tracking-tight leading-none">{k.value}</div>
        <div className="text-[13px] font-medium text-ink-soft mt-1.5">{k.label}</div>
        <div className="text-[11px] text-ink-muted mt-0.5">{k.sub}</div>
      </div>
    </>
  )
  return k.to ? (
    <Link to={k.to} style={delay} className="kpi-card group animate-fade-up hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-150">
      {inner}
    </Link>
  ) : (
    <div style={delay} className="kpi-card group animate-fade-up">{inner}</div>
  )
}

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
      .then((d) => { if (active) setData(d) })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const reload = () => {
    setLoading(true)
    setError(false)
    adminApi.getDashboard()
      .then(d => setData(d)).catch(() => setError(true)).finally(() => setLoading(false))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-navy-600" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="card-p border-red-200 bg-red-50/60 text-sm text-red-700 flex items-center gap-3">
        <AlertTriangle size={18} />
        <span>Failed to load dashboard.</span>
        <button onClick={reload} className="ml-auto btn-danger py-1.5 px-3 text-xs">Retry</button>
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

  const statusSegments = [
    { key: 'active', label: 'Active', value: active_clinics, color: STATUS_COLORS.active },
    { key: 'pending', label: 'Pending', value: pending_clinics, color: STATUS_COLORS.pending },
    { key: 'suspended', label: 'Suspended', value: suspended_clinics, color: STATUS_COLORS.suspended },
    { key: 'revoked', label: 'Revoked', value: revoked_clinics, color: STATUS_COLORS.revoked },
  ]

  const alerts = []
  if (pending_clinics > 0) {
    alerts.push({ key: 'pending-hc', color: '#F5821E', to: '/pending',
      text: `${pending_clinics} Health Center${pending_clinics > 1 ? 's' : ''} awaiting approval` })
  }
  if (pending_staff > 0) {
    alerts.push({ key: 'pending-staff', color: '#D97706', to: '/staff',
      text: `${pending_staff} staff awaiting verification` })
  }
  const inactiveHc = suspended_clinics + revoked_clinics
  if (inactiveHc > 0) {
    alerts.push({ key: 'inactive-hc', color: '#DC2626', to: null,
      text: `${inactiveHc} Health Center${inactiveHc > 1 ? 's' : ''} suspended/revoked` })
  }

  const kpis = [
    { to: '/clinics', label: 'Health Centers', value: total_clinics, icon: Building2, tone: 'navy',
      sub: `${active_clinics} active · ${pending_clinics} pending` },
    { to: '/patients', label: 'Total Patients', value: total_patients.toLocaleString('en-IN'), icon: Users, tone: 'blue', sub: 'Platform-wide' },
    { to: '/clinics', label: 'Doctors', value: total_doctors.toLocaleString('en-IN'), icon: Stethoscope, tone: 'emerald', sub: 'Active' },
    { to: '/subscriptions', label: 'Platform MRR', value: `₹${mrr.toLocaleString('en-IN')}`, icon: IndianRupee, tone: 'navy', sub: 'Est. monthly' },
    { to: '/clinics', label: 'Expiring < 7d', value: expiring_soon ?? '—', icon: Clock, tone: 'saffron',
      sub: <span className={expiring_soon > 0 ? 'text-saffron-600 font-semibold' : ''}>At risk</span> },
    { to: '/pending', label: 'Pending', value: pending_clinics + pending_staff, icon: AlertTriangle, tone: 'amber',
      sub: `${pending_clinics} HC · ${pending_staff} staff` },
  ]

  const activity = [
    { label: 'Appointments Today', value: appointments_today, icon: CalendarDays },
    { label: 'Invoices Today', value: invoices_today, icon: FileText },
    { label: 'New Patients Today', value: new_patients_today, icon: UserPlus },
    { label: 'New HCs This Month', value: new_this_month, icon: Building2 },
  ]

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="page-header !mb-1">
        <div>
          <h1 className="page-title">Platform Analytics</h1>
          <p className="text-sm text-ink-soft mt-0.5">Network-wide overview across all health centers.</p>
        </div>
      </div>

      {/* Row 1 — KPI strip */}
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k, i) => <KpiCard key={k.label} k={k} i={i} />)}
      </div>

      {/* Row 2 — activity */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {activity.map((a, i) => {
          const Icon = a.icon
          return (
            <div key={a.label} className="kpi-card animate-fade-up" style={{ animationDelay: `${i * 55 + 120}ms` }}>
              <div className="flex items-center gap-2 text-ink-muted">
                {Icon && <Icon size={14} />}
                <span className="text-[11px] font-semibold uppercase tracking-wide">{a.label}</span>
              </div>
              <div className="text-2xl font-bold text-ink tracking-tight mt-1">{a.value}</div>
            </div>
          )
        })}
      </div>

      {/* Row 3 — trends + status donut */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard title="Platform Trends" icon={LineChart} className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <EmptyTrend label="MRR" />
            <EmptyTrend label="Health Centers" />
            <EmptyTrend label="Patients" />
          </div>
        </SectionCard>

        <SectionCard title="Health Center Status" icon={Activity}>
          <StatusDonut segments={statusSegments} />
        </SectionCard>
      </div>

      {/* Row 4 — module adoption / SLA / revenue at risk */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard title="Module Adoption" icon={Activity}>
          <div className="flex flex-col gap-3">
            {MODULES.map((m) => {
              const pct = module_adoption[m.key] ?? 0
              return (
                <div key={m.key} className="flex items-center gap-3 text-xs">
                  <span className="w-20 shrink-0 text-ink-soft font-medium">{m.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-navy-600 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-9 text-right font-semibold text-ink tabular-nums">{pct}%</span>
                </div>
              )
            })}
          </div>
        </SectionCard>

        <SectionCard title="Approval SLA" icon={Clock}>
          <div className="flex flex-col divide-y divide-line">
            <div className="flex items-center justify-between py-2 text-sm">
              <span className="text-ink-soft">Oldest pending</span>
              <span className="font-semibold text-ink">—</span>
            </div>
            <div className="flex items-center justify-between py-2 text-sm">
              <span className="text-ink-soft">Avg approval time</span>
              <span className="font-semibold text-ink">—</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Revenue at Risk" icon={IndianRupee}>
          <div className="flex flex-col divide-y divide-line">
            <div className="flex items-center justify-between py-2 text-sm">
              <span className="text-ink-soft">Health Centers at risk</span>
              <span className="font-semibold text-ink">{inactiveHc || '—'}</span>
            </div>
            <div className="flex items-center justify-between py-2 text-sm">
              <span className="text-ink-soft">Est. monthly exposure</span>
              <span className="font-bold text-saffron-600">₹{mrr.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Row 5 — ranking tables */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Top Health Centers by MRR" icon={TrendingUp}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="th-sm rounded-l-lg">Rank</th><th className="th-sm">Name</th>
                <th className="th-sm">Plan</th><th className="th-sm">Doctors</th><th className="th-sm rounded-r-lg">MRR</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="td-sm text-center text-ink-muted py-8" colSpan={5}>No ranking data available</td></tr>
            </tbody>
          </table>
        </SectionCard>

        <SectionCard title="Top by Patients" icon={Users}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="th-sm rounded-l-lg">Rank</th><th className="th-sm">Name</th>
                <th className="th-sm">City</th><th className="th-sm rounded-r-lg">Patients</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="td-sm text-center text-ink-muted py-8" colSpan={4}>No ranking data available</td></tr>
            </tbody>
          </table>
        </SectionCard>
      </div>

      {/* Row 6 — alerts */}
      <SectionCard title="Alerts" icon={AlertTriangle}>
        {alerts.length === 0 ? (
          <div className="py-6 text-center text-sm text-ink-muted">No active alerts — everything looks healthy.</div>
        ) : (
          <div className="divide-y divide-line">
            {alerts.map((a) => {
              const row = (
                <div className="flex items-center gap-3 py-3">
                  <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                  <span className="text-sm text-ink-soft">{a.text}</span>
                  {a.to && <ArrowUpRight size={15} className="ml-auto text-ink-muted" />}
                </div>
              )
              return a.to
                ? <Link key={a.key} to={a.to} className="block -mx-2 px-2 rounded-lg hover:bg-slate-50 transition-colors">{row}</Link>
                : <div key={a.key}>{row}</div>
            })}
          </div>
        )}
      </SectionCard>

      {/* Rate card */}
      <SectionCard title="Rate Card" icon={IndianRupee}>
        {Object.keys(rate_card).length === 0 ? (
          <div className="py-6 text-center text-sm text-ink-muted">No rate card configured</div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
            {Object.entries(rate_card).map(([plan, info]) => (
              <div key={plan} className="rounded-xl border border-line bg-slate-50/60 p-3.5">
                <div className="eyebrow">{info.label || plan}</div>
                <div className="text-lg font-bold text-ink mt-1">
                  ₹{Number(info.price_per_doctor || 0).toLocaleString('en-IN')}
                  <span className="text-xs font-medium text-ink-muted"> /doctor</span>
                </div>
                <div className="text-[11px] text-ink-muted mt-0.5">Max {info.max_doctors ?? '—'} doctors</div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
