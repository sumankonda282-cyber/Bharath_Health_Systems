import { useState, useEffect, useCallback, useMemo } from 'react'
import api from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, AreaChart, Area, CartesianGrid, Legend,
} from 'recharts'
import {
  Users, UserPlus, CalendarDays, CheckCircle, IndianRupee, Wallet,
  Clock, BedDouble, Activity, TrendingUp, PieChart as PieIcon,
  BarChart3, Table2, AlertCircle, RefreshCw, X,
} from 'lucide-react'

const PALETTE = ['#0F2557', '#CC1414', '#F5821E', '#16A34A', '#7C3AED', '#0891B2', '#D97706', '#DB2777', '#0D9488', '#64748B']
const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: '7 days' },
  { key: 'month', label: '30 days' },
  { key: 'year', label: '1 year' },
]

const prettify = s => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
const inr = n => '₹' + Number(n || 0).toLocaleString('en-IN')
const toRows = obj => Object.entries(obj || {})
  .map(([k, v]) => ({ label: prettify(k), value: Number(v) || 0 }))
  .filter(r => r.value > 0)

function KpiCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '18' }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold text-gray-900 truncate">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  )
}

function ChartCard({ icon: Icon, title, rows, onDrill, children, accent = '#0F2557' }) {
  const hasData = rows && rows.length > 0
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Icon size={15} style={{ color: accent }} />{title}
        </div>
        {hasData && (
          <button onClick={() => onDrill({ title, rows })} title="View data table"
            className="text-gray-400 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100">
            <Table2 size={14} />
          </button>
        )}
      </div>
      {hasData ? children : <div className="h-[180px] flex items-center justify-center text-xs text-gray-300">No data in this period</div>}
    </div>
  )
}

function DonutChart({ rows, money }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {rows.map((r, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip formatter={v => money ? inr(v) : v} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function BarMini({ rows, money }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={36} allowDecimals={false} />
        <Tooltip formatter={v => money ? inr(v) : v} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {rows.map((r, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function DrillModal({ title, rows, onClose }) {
  const total = rows.reduce((s, r) => s + (Number(r.value) || 0), 0)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-[440px] max-w-[94vw] max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 sticky top-0 bg-white">
          <div className="text-sm font-bold text-gray-800">{title}</div>
          <button onClick={onClose} className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"><X size={12} /></button>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="px-5 py-2.5 text-gray-700">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: PALETTE[i % PALETTE.length] }} />
                    {r.label}
                  </span>
                </td>
                <td className="px-5 py-2.5 text-right font-semibold text-gray-900">{Number(r.value).toLocaleString('en-IN')}</td>
                <td className="px-5 py-2.5 text-right text-xs text-gray-400 w-16">{total ? Math.round((r.value / total) * 100) : 0}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold text-gray-900">
              <td className="px-5 py-3">Total</td>
              <td className="px-5 py-3 text-right">{total.toLocaleString('en-IN')}</td>
              <td className="px-5 py-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export default function ManagerDashboard() {
  const { user } = useAuth()
  const isHospital = user?.org_type === 'hospital'
  const [period, setPeriod] = useState('month')
  const [range, setRange] = useState({ from: '', to: '' })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [drill, setDrill] = useState(null)

  const customActive = !!(range.from && range.to)

  const load = useCallback(() => {
    setLoading(true); setError('')
    const params = customActive ? { date_from: range.from, date_to: range.to } : { period }
    api.get('/clinic/analytics/overview', { params })
      .then(d => setData(d))
      .catch(e => setError(e?.response?.data?.detail || e.message || 'Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [period, range, customActive])

  useEffect(() => { load() }, [load])

  const k = data?.kpis || {}
  const revenueTrend = data?.revenue_trend || []
  const statusRows = useMemo(() => toRows(data?.appointments_by_status), [data])
  const typeRows = useMemo(() => toRows(data?.appointments_by_type), [data])
  const payRows = useMemo(() => toRows(data?.payment_modes), [data])
  const billRows = useMemo(() => toRows(data?.billing_status), [data])
  const patientRows = useMemo(() => toRows(data?.patients), [data])
  const occRows = useMemo(() => toRows(data?.occupancy), [data])
  const deptRows = useMemo(() => toRows(data?.admissions_by_department), [data])

  return (
    <div>
      {/* Period filter */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex rounded-xl overflow-hidden border border-gray-200">
          {PERIODS.map(p => {
            const active = period === p.key && !customActive
            return (
              <button key={p.key} onClick={() => { setRange({ from: '', to: '' }); setPeriod(p.key) }}
                className={`px-3 py-1.5 text-sm font-medium ${active ? 'text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                style={active ? { background: '#0F2557' } : {}}>
                {p.label}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-1.5">
          <input type="date" value={range.from} onChange={e => setRange(r => ({ ...r, from: e.target.value }))} className="input w-auto text-sm py-1.5" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={range.to} onChange={e => setRange(r => ({ ...r, to: e.target.value }))} className="input w-auto text-sm py-1.5" />
        </div>
        {data && <span className="text-xs text-gray-400 ml-auto">{data.date_from} → {data.date_to}</span>}
      </div>

      {error ? (
        <div className="card p-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm" style={{ color: '#CC1414' }}><AlertCircle size={16} />{error}</div>
          <button onClick={load} className="btn-secondary text-xs py-1 px-3 flex items-center gap-1"><RefreshCw size={12} />Retry</button>
        </div>
      ) : loading && !data ? (
        <div className="py-20 flex justify-center"><RefreshCw size={24} className="animate-spin text-gray-300" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard icon={Users} label="Active Patients" value={k.total_patients ?? 0} color="#0F2557" />
            <KpiCard icon={UserPlus} label="New Patients" value={k.new_patients ?? 0} color="#16A34A" />
            <KpiCard icon={CalendarDays} label="Appointments" value={k.appointments ?? 0} color="#7C3AED" />
            <KpiCard icon={CheckCircle} label="Completed" value={k.completed ?? 0} color="#0891B2" />
            <KpiCard icon={IndianRupee} label="Billed" value={inr(k.billed)} color="#0F2557" />
            <KpiCard icon={Wallet} label="Collected" value={inr(k.collected)} color="#16A34A" />
            <KpiCard icon={Clock} label="Pending" value={inr(k.pending)} color="#CC1414" />
            {isHospital && <KpiCard icon={BedDouble} label="Beds Occupied" value={`${k.beds_occupied ?? 0}/${k.beds_total ?? 0}`} color="#F5821E" />}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard icon={TrendingUp} title="Revenue Trend" rows={revenueTrend.map(d => ({ label: d.label, value: d.revenue }))} onDrill={setDrill}>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={revenueTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F2557" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0F2557" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={48} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip formatter={v => inr(v)} />
                  <Area type="monotone" dataKey="revenue" stroke="#0F2557" strokeWidth={2} fill="url(#revG)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard icon={PieIcon} title="Appointments by Status" rows={statusRows} onDrill={setDrill} accent="#7C3AED">
              <DonutChart rows={statusRows} />
            </ChartCard>

            <ChartCard icon={PieIcon} title="Appointments by Type" rows={typeRows} onDrill={setDrill} accent="#0891B2">
              <DonutChart rows={typeRows} />
            </ChartCard>

            <ChartCard icon={Wallet} title="Collections by Payment Mode" rows={payRows} onDrill={setDrill} accent="#16A34A">
              <DonutChart rows={payRows} money />
            </ChartCard>

            <ChartCard icon={BarChart3} title="Invoices by Status" rows={billRows} onDrill={setDrill} accent="#CC1414">
              <BarMini rows={billRows} />
            </ChartCard>

            <ChartCard icon={Users} title="New vs Returning Patients" rows={patientRows} onDrill={setDrill} accent="#0F2557">
              <DonutChart rows={patientRows} />
            </ChartCard>

            {isHospital && (
              <ChartCard icon={BedDouble} title="Bed Occupancy" rows={occRows} onDrill={setDrill} accent="#F5821E">
                <DonutChart rows={occRows} />
              </ChartCard>
            )}
            {isHospital && (
              <ChartCard icon={Activity} title="Active Admissions by Department" rows={deptRows} onDrill={setDrill} accent="#7C3AED">
                <BarMini rows={deptRows} />
              </ChartCard>
            )}
          </div>
        </>
      )}

      {drill && <DrillModal title={drill.title} rows={drill.rows} onClose={() => setDrill(null)} />}
    </div>
  )
}
