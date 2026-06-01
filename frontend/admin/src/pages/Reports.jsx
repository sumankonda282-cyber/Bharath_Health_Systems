import { useState, useEffect } from 'react'
import { adminApi } from '../api'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { IndianRupee, TrendingUp, Building2, Users } from 'lucide-react'

const STATUS_COLORS = { active: '#10b981', pending: '#f59e0b', suspended: '#f97316', revoked: '#ef4444' }
const PLAN_COLORS   = { free: '#6b7280', basic: '#6366f1', pro: '#8b5cf6', enterprise: '#ec4899' }

const fmt = n => typeof n === 'number' ? `₹${n.toLocaleString('en-IN')}` : '—'

function StatCard({ icon: Icon, label, value, sub, color = 'text-indigo-400' }) {
  return (
    <div className="card-p flex items-start gap-3">
      <div className={`p-2 rounded-xl bg-gray-800 ${color}`}><Icon size={18} /></div>
      <div>
        <div className="text-xs text-gray-500 mb-0.5">{label}</div>
        <div className="text-xl font-bold text-white">{value}</div>
        {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

export default function Reports() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

  const load = () => {
    setLoading(true)
    adminApi.getReports({ date_from: dateFrom, date_to: dateTo })
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const statusDist = data ? Object.entries(data.clinic_status_distribution || {}).map(([name, value]) => ({ name, value })) : []
  const planDist   = data ? Object.entries(data.plan_distribution || {}).map(([name, value]) => ({ name, value })) : []

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Business metrics and platform health</p>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-xs text-gray-500 block mb-1">From</label>
            <input type="date" className="input w-36 py-1.5 text-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">To</label>
            <input type="date" className="input w-36 py-1.5 text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <button onClick={load} className="btn-primary py-1.5">Apply</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : !data ? (
        <div className="card-p text-center text-gray-500 py-16">No report data available</div>
      ) : (
        <div className="space-y-5">
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={IndianRupee} label="Monthly Recurring Revenue" value={fmt(data.mrr)} color="text-emerald-400" />
            <StatCard icon={Building2}  label="Active Clinics" value={data.clinic_status_distribution?.active ?? 0} />
            <StatCard icon={Users}      label="Total Doctors (Active Clinics)" value={data.total_doctors ?? 0} />
            <StatCard icon={TrendingUp} label="New Registrations (Period)" value={data.new_registrations ?? 0} color="text-purple-400" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Monthly registrations bar */}
            <div className="lg:col-span-2 card-p">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Monthly Clinic Registrations</h3>
              {(data.monthly_registrations || []).length === 0 ? (
                <p className="text-gray-600 text-sm py-8 text-center">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.monthly_registrations} margin={{ top: 0, right: 10, bottom: 0, left: -20 }}>
                    <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                      labelStyle={{ color: '#e5e7eb' }} itemStyle={{ color: '#818cf8' }} />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Status pie */}
            <div className="card-p">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Clinic Status Distribution</h3>
              {statusDist.length === 0 ? (
                <p className="text-gray-600 text-sm py-8 text-center">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusDist} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {statusDist.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || '#6b7280'} />)}
                    </Pie>
                    <Legend iconType="circle" iconSize={8}
                      formatter={(v) => <span style={{ color: '#9ca3af', fontSize: 11 }}>{v}</span>} />
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                      itemStyle={{ color: '#e5e7eb' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Plan distribution + Billing table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Plan pie */}
            <div className="card-p">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Plan Distribution</h3>
              {planDist.length === 0 ? (
                <p className="text-gray-600 text-sm py-8 text-center">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={planDist} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {planDist.map((entry, i) => <Cell key={i} fill={PLAN_COLORS[entry.name] || '#6b7280'} />)}
                    </Pie>
                    <Legend iconType="circle" iconSize={8}
                      formatter={(v) => <span style={{ color: '#9ca3af', fontSize: 11 }}>{v}</span>} />
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                      itemStyle={{ color: '#e5e7eb' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Billing breakdown table */}
            <div className="lg:col-span-2 card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Billing by Plan</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead><tr>
                    <th className="th">Plan</th>
                    <th className="th text-right">Clinics</th>
                    <th className="th text-right">Doctors</th>
                    <th className="th text-right">Rate/Doctor</th>
                    <th className="th text-right">Monthly Revenue</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-800">
                    {(data.billing_by_plan || []).map(row => (
                      <tr key={row.plan} className="tr-hover">
                        <td className="td"><span className={`badge badge-${row.plan}`}>{row.plan}</span></td>
                        <td className="td text-right text-white">{row.clinic_count}</td>
                        <td className="td text-right text-white">{row.total_doctors}</td>
                        <td className="td text-right text-gray-400">
                          {row.price_per_doctor > 0 ? `₹${row.price_per_doctor}/mo` : 'Free'}
                        </td>
                        <td className="td text-right text-emerald-400 font-semibold">{fmt(row.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {(data.billing_by_plan || []).length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-gray-700">
                        <td className="td font-bold text-white" colSpan={4}>Total MRR</td>
                        <td className="td text-right text-emerald-400 font-bold text-lg">{fmt(data.mrr)}</td>
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
  )
}
