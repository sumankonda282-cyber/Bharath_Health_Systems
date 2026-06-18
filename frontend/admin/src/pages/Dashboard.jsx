import { useState, useEffect } from 'react'
import { adminApi } from '../api'
import {
  Building2, Clock, CheckCircle, ShieldAlert, Users, IndianRupee,
  TrendingUp, ShieldCheck, Activity, Calendar, ChevronDown,
} from 'lucide-react'
import { Link } from 'react-router-dom'

// ─── Date Presets ─────────────────────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Today',  days: 0 },
  { label: '7D',     days: 7 },
  { label: '30D',    days: 30 },
  { label: '90D',    days: 90 },
]

function fmtDate(d) {
  return d.toISOString().slice(0, 10)
}

function DateControls({ preset, setPreset, from, setFrom, to, setTo }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-0.5 bg-gray-900 border border-gray-800 p-0.5 rounded-lg">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => {
              setPreset(p.label)
              const today = new Date()
              setTo(fmtDate(today))
              if (p.days === 0) {
                setFrom(fmtDate(today))
              } else {
                const from = new Date(today)
                from.setDate(from.getDate() - p.days)
                setFrom(fmtDate(from))
              }
            }}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              preset === p.label
                ? 'bg-[#F5821E] text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1">
        <Calendar size={12} className="text-gray-500" />
        <input
          type="date"
          value={from}
          onChange={e => { setFrom(e.target.value); setPreset('') }}
          className="bg-transparent text-xs text-white outline-none w-28"
        />
        <span className="text-gray-600 text-xs">–</span>
        <input
          type="date"
          value={to}
          onChange={e => { setTo(e.target.value); setPreset('') }}
          className="bg-transparent text-xs text-white outline-none w-28"
        />
      </div>
    </div>
  )
}

// ─── Inline SVG Charts ──────────────────────────────────────────────────────────────────────────

function DonutChart({ segments, size = 100, thickness = 24 }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0)
    return (
      <div
        className="rounded-full bg-gray-800 flex items-center justify-center text-gray-600 text-xs"
        style={{ width: size, height: size }}
      >
        0
      </div>
    )

  let angle = -90
  const cx = size / 2, cy = size / 2, r = (size - thickness) / 2

  const paths = segments.map((seg, i) => {
    const sweep = (seg.value / total) * 360
    const startAngle = angle
    const endAngle = angle + sweep
    angle += sweep
    const toRad = d => (d * Math.PI) / 180
    const x1 = cx + r * Math.cos(toRad(startAngle))
    const y1 = cy + r * Math.sin(toRad(startAngle))
    const x2 = cx + r * Math.cos(toRad(endAngle))
    const y2 = cy + r * Math.sin(toRad(endAngle))
    const large = sweep > 180 ? 1 : 0
    return (
      <path
        key={i}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
        fill={seg.color}
        opacity={0.9}
      />
    )
  })

  return (
    <svg width={size} height={size}>
      {paths}
      <circle cx={cx} cy={cy} r={r - thickness / 2} fill="#111827" />
      <text x={cx} y={cy} textAnchor="middle" dy="0.35em" fill="white" fontSize={13} fontWeight="bold">
        {total}
      </text>
    </svg>
  )
}

function BarChart({ data, height = 80 }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[9px] text-gray-500">{d.value}</span>
          <div className="w-full rounded-t-sm transition-all duration-500" style={{
            height: `${(d.value / max) * height}px`,
            background: d.color,
            minHeight: d.value > 0 ? 4 : 0,
          }} />
          <span className="text-[9px] text-gray-500 text-center leading-tight">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Compact KPI Chip ─────────────────────────────────────────────────────────────────────────────

function KpiChip({ label, value, icon: Icon, color, to, sub }) {
  const inner = (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-3 hover:border-gray-700 transition-colors">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}>
        <Icon size={15} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 truncate">{label}</p>
        <p className="text-lg font-bold text-white leading-tight">{value ?? '—'}</p>
        {sub && <p className="text-[10px] text-gray-600 truncate">{sub}</p>}
      </div>
    </div>
  )
  return to ? <Link to={to}>{inner}</Link> : inner
}

// ─── Rate Card ─────────────────────────────────────────────────────────────────────────────────

function RateCard({ data }) {
  if (!data?.rate_card) return null
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Rate Card</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Object.entries(data.rate_card).map(([plan, info]) => (
          <div key={plan} className="bg-gray-800 rounded-lg p-2.5">
            <div className="text-[10px] font-semibold text-gray-400 uppercase mb-0.5">{plan}</div>
            <div className="text-base font-extrabold text-white">
              {info.price_per_doctor === 0 ? 'Free' : `₹${info.price_per_doctor}`}
            </div>
            {info.price_per_doctor > 0 && <div className="text-[10px] text-gray-500">/ doctor / month</div>}
            <div className="text-[10px] text-gray-500 mt-0.5">
              Max {info.max_doctors >= 999 ? '∞' : info.max_doctors} doctors
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const today = fmtDate(new Date())
  const d30 = fmtDate(new Date(Date.now() - 30 * 86400000))

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState('30D')
  const [from, setFrom] = useState(d30)
  const [to, setTo] = useState(today)

  useEffect(() => {
    adminApi.getDashboard()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-7 h-7 border-[3px] border-t-transparent rounded-full animate-spin" style={{ borderColor: '#F5821E', borderTopColor: 'transparent' }} />
    </div>
  )

  if (!data) return <p className="text-gray-500 text-sm">Failed to load dashboard.</p>

  const activeCount     = data.active_clinics ?? 0
  const pendingCount    = data.pending_clinics ?? 0
  const suspendedCount  = (data.suspended_clinics || 0) + (data.revoked_clinics || 0)
  const totalClinics    = data.total_clinics ?? (activeCount + pendingCount + suspendedCount)

  const clinicSegments = [
    { label: 'Active',    value: activeCount,    color: '#22c55e' },
    { label: 'Pending',   value: pendingCount,   color: '#F5821E' },
    { label: 'Suspended', value: suspendedCount, color: '#ef4444' },
  ].filter(s => s.value > 0)

  const kpiBarData = [
    { label: 'Clinics',  value: totalClinics,           color: '#3b82f6' },
    { label: 'Doctors',  value: data.total_doctors ?? 0, color: '#22c55e' },
    { label: 'Patients', value: data.total_patients ?? 0, color: '#a855f7' },
    { label: 'Pending',  value: data.pending_staff ?? 0, color: '#F5821E' },
  ]

  return (
    <div className="space-y-3">
      {/* Date controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-base font-bold text-white">Dashboard</h1>
        <DateControls
          preset={preset} setPreset={setPreset}
          from={from} setFrom={setFrom}
          to={to} setTo={setTo}
        />
      </div>

      {/* KPI Chips */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <KpiChip label="OPD Today"    value={data.opd_today ?? data.appointments_today} icon={Activity}     color="#22c55e" sub="Appointments today" />
        <KpiChip label="Active Clinics" value={activeCount}                              icon={Building2}    color="#3b82f6" to="/clinics?status=active" sub="Live subscriptions" />
        <KpiChip label="Total Patients" value={data.total_patients}                      icon={Users}        color="#a855f7" sub="Platform registrations" />
        <KpiChip label="Platform MRR"  value={data.mrr ? `₹${data.mrr.toLocaleString('en-IN')}` : '—'} icon={IndianRupee} color="#F5821E" sub="Est. monthly revenue" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        {/* Clinic Status Donut */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Clinic Status Distribution</h2>
          <div className="flex items-center gap-6">
            <DonutChart segments={clinicSegments} size={100} thickness={24} />
            <div className="flex-1 space-y-2">
              {[
                { label: 'Active',    value: activeCount,    color: '#22c55e', to: '/clinics?status=active' },
                { label: 'Pending',   value: pendingCount,   color: '#F5821E', to: '/pending' },
                { label: 'Suspended', value: suspendedCount, color: '#ef4444', to: '/clinics?status=suspended' },
              ].map(s => (
                <Link key={s.label} to={s.to} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-xs text-gray-400 flex-1">{s.label}</span>
                  <span className="text-sm font-bold text-white">{s.value}</span>
                  <span className="text-[10px] text-gray-600 w-8 text-right">
                    {totalClinics > 0 ? `${Math.round((s.value / totalClinics) * 100)}%` : '0%'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Platform KPIs Bar */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Platform Snapshot</h2>
          <BarChart data={kpiBarData} />
        </div>
      </div>

      {/* Clinic + Staff metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <KpiChip label="Total Clinics"     value={totalClinics}           icon={Building2}   color="#3b82f6" to="/clinics" />
        <KpiChip label="Pending Approval"  value={pendingCount}           icon={Clock}       color="#F5821E" to="/pending" />
        <KpiChip label="Active Doctors"    value={data.total_doctors}     icon={Users}       color="#22c55e" />
        <KpiChip label="Staff Pending"     value={data.pending_staff}     icon={ShieldCheck} color="#F5821E" to="/staff" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <KpiChip label="New This Month"    value={data.new_this_month}    icon={TrendingUp}  color="#22c55e" />
        <KpiChip label="Suspended/Revoked" value={suspendedCount}         icon={ShieldAlert} color="#ef4444" to="/clinics?status=suspended" />
        <KpiChip label="Total Patients"    value={data.total_patients}    icon={Users}       color="#a855f7" />
        <KpiChip label="Est. Revenue"      value={data.mrr ? `₹${data.mrr.toLocaleString('en-IN')}` : '—'} icon={IndianRupee} color="#F5821E" />
      </div>

      {/* Rate Card */}
      <RateCard data={data} />
    </div>
  )
}
