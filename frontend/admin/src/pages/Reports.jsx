import { useState, useEffect } from 'react'
import { adminApi } from '../api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  IndianRupee, TrendingUp, Building2, Users,
  ChevronRight, ChevronLeft, Download,
  DollarSign, Activity, UserCheck, Settings, Shield,
} from 'lucide-react'

const STATUS_COLORS = { active: '#10b981', pending: '#f59e0b', suspended: '#f97316', revoked: '#ef4444' }
const PLAN_COLORS   = { free: '#6b7280', basic: '#6366f1', pro: '#8b5cf6', enterprise: '#ec4899' }

const fmt = n => typeof n === 'number' ? `₹${n.toLocaleString('en-IN')}` : '—'

const REPORT_SECTIONS = [
  { key: 'financial',   label: 'Financial',   icon: DollarSign },
  { key: 'clinical',    label: 'Clinical',    icon: Activity },
  { key: 'patient',     label: 'Patient',     icon: UserCheck },
  { key: 'operations',  label: 'Operations',  icon: Settings },
  { key: 'compliance',  label: 'Compliance',  icon: Shield },
]

const PRESETS = [
  { label: 'Today',   days: 0 },
  { label: '7 Days',  days: 7 },
  { label: '30 Days', days: 30 },
  { label: 'Quarter', days: 90 },
  { label: 'Year',    days: 365 },
]

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function StatCard({ icon: Icon, label, value, sub, color = 'text-indigo-400' }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-start gap-2.5">
      <div className={`p-1.5 rounded-lg bg-gray-800 ${color}`}><Icon size={15} /></div>
      <div>
        <div className="text-xs text-gray-500 mb-0.5">{label}</div>
        <div className="text-lg font-bold text-white">{value}</div>
        {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

export default function Reports() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [preset, setPreset]   = useState('30 Days')
  const [dateFrom, setDateFrom] = useState(() => daysAgo(30))
  const [dateTo, setDateTo]     = useState(() => new Date().toISOString().split('T')[0])
  const [section, setSection]   = useState('financial')
  const [navOpen, setNavOpen]   = useState(true)

  const applyPreset = (p) => {
    setPreset(p.label)
    setDateFrom(p.days === 0 ? new Date().toISOString().split('T')[0] : daysAgo(p.days))
    setDateTo(new Date().toISOString().split('T')[0])
  }

  const load = () => {
    setLoading(true)
    adminApi.getReports({ date_from: dateFrom, date_to: dateTo })
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [dateFrom, dateTo])

  const statusDist = data ? Object.entries(data.clinic_status_distribution || {}).map(([name, value]) => ({ name, value })) : []
  const planDist   = data ? Object.entries(data.plan_distribution || {}).map(([name, value]) => ({ name, value })) : []

  return (
    <div className="flex gap-0 min-h-0" style={{ height: 'calc(100vh - 52px - 24px)' }}>
      {/* Collapsible left nav */}
      <div className={`flex-shrink-0 border-r border-gray-800 flex flex-col transition-all duration-200 ${navOpen ? 'w-40' : 'w-10'}`}>
        <button
          onClick={() => setNavOpen(v => !v)}
          className="flex items-center justify-center h-8 border-b border-gray-800 text-gray-500 hover:text-white transition-colors"
          title={navOpen ? 'Collapse' : 'Expand'}
        >
          {navOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
        <div className="flex-1 py-1">
          {REPORT_SECTIONS.map(s => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              title={!navOpen ? s.label : undefined}
              className={`w-full flex items-center gap-2 px-2 py-2 text-xs font-medium transition-colors ${
                section === s.key ? 'text-[#F5821E] bg-[#F5821E]/10' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <s.icon size={14} className="flex-shrink-0" />
              {navOpen && <span className="truncate">{s.label}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {/* One-row controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Preset dropdown */}
          <select
            value={preset}
            onChange={e => {
              const p = PRESETS.find(x => x.label === e.target.value)
              if (p) applyPreset(p)
            }}
            className="bg-gray-900 border border-gray-800 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-gray-600"
          >
            {PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
            <option value="Custom">Custom range</option>
          </select>

          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPreset('Custom') }}
            className="bg-gray-900 border border-gray-800 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-gray-600" />
          <span className="text-gray-600 text-xs">→</span>
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPreset('Custom') }}
            className="bg-gray-900 border border-gray-800 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-gray-600" />

          <button onClick={load}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
            style={{ background: '#F5821E' }}>
            Apply
          </button>

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-gray-300 hover:text-white border border-gray-700 transition-colors ml-auto">
            <Download size={12} /> Export
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-7 h-7 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#F5821E', borderTopColor: 'transparent' }} />
          </div>
        ) : !data ? (
          <div className="py-12 text-center text-gray-500 text-sm">No report data available</div>
        ) : (
          <div className="space-y-4">
            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              <StatCard icon={IndianRupee} label="MRR"                        value={fmt(data.mrr)}                                         color="text-emerald-400" />
              <StatCard icon={Building2}  label="Active Clinics"              value={data.clinic_status_distribution?.active ?? 0} />
              <StatCard icon={Users}      label="Total Doctors"               value={data.total_doctors ?? 0} />
              <StatCard icon={TrendingUp} label="New Registrations (Period)"  value={data.new_registrations ?? 0}                           color="text-purple-400" />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Monthly Clinic Registrations</h3>
                {(data.monthly_registrations || []).length === 0 ? (
                  <p className="text-gray-600 text-sm py-6 text-center">No data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={data.monthly_registrations} margin={{ top: 0, right: 8, bottom: 0, left: -20 }}>
                      <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                        labelStyle={{ color: '#e5e7eb' }} itemStyle={{ color: '#818cf8' }} />
                      <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Clinic Status</h3>
                {statusDist.length === 0 ? (
                  <p className="text-gray-600 text-sm py-6 text-center">No data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={statusDist} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                        {statusDist.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || '#6b7280'} />)}
                      </Pie>
                      <Legend iconType="circle" iconSize={7} formatter={(v) => <span style={{ color: '#9ca3af', fontSize: 10 }}>{v}</span>} />
                      <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} itemStyle={{ color: '#e5e7eb' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Plan distribution + Billing table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Plan Distribution</h3>
                {planDist.length === 0 ? (
                  <p className="text-gray-600 text-sm py-6 text-center">No data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={planDist} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                        {planDist.map((entry, i) => <Cell key={i} fill={PLAN_COLORS[entry.name] || '#6b7280'} />)}
                      </Pie>
                      <Legend iconType="circle" iconSize={7} formatter={(v) => <span style={{ color: '#9ca3af', fontSize: 10 }}>{v}</span>} />
                      <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} itemStyle={{ color: '#e5e7eb' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Billing by Plan</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wide">
                        <th className="px-4 py-2 text-left">Plan</th>
                        <th className="px-3 py-2 text-right">Clinics</th>
                        <th className="px-3 py-2 text-right">Doctors</th>
                        <th className="px-3 py-2 text-right">Rate/Dr</th>
                        <th className="px-3 py-2 text-right">Monthly Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {(data.billing_by_plan || []).map(row => (
                        <tr key={row.plan} className="hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-2 capitalize text-gray-300 text-xs font-medium">{row.plan}</td>
                          <td className="px-3 py-2 text-right text-white text-xs">{row.clinic_count}</td>
                          <td className="px-3 py-2 text-right text-white text-xs">{row.total_doctors}</td>
                          <td className="px-3 py-2 text-right text-gray-400 text-xs">
                            {row.price_per_doctor > 0 ? `₹${row.price_per_doctor}` : 'Free'}
                          </td>
                          <td className="px-3 py-2 text-right text-emerald-400 font-semibold text-xs">{fmt(row.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {(data.billing_by_plan || []).length > 0 && (
                      <tfoot>
                        <tr className="border-t border-gray-700">
                          <td className="px-4 py-2 font-bold text-white text-xs" colSpan={4}>Total MRR</td>
                          <td className="px-3 py-2 text-right text-emerald-400 font-bold text-sm">{fmt(data.mrr)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
