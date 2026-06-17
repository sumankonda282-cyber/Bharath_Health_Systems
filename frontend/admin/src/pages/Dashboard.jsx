import { useState, useEffect, useCallback } from 'react'
import { adminApi } from '../api'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  Building2, Users, IndianRupee, TrendingUp, Clock, ShieldCheck,
  Activity, Plus, X, Settings2, ChevronDown, RefreshCw, ArrowUpRight,
  ArrowDownRight, Minus, Filter, GripVertical, Edit2, Check
} from 'lucide-react'
import { Link } from 'react-router-dom'

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Spark({ data = [], color = '#F5821E' }) {
  if (!data.length) return null
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
          fill={`url(#sg-${color.replace('#', '')})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Trend badge ───────────────────────────────────────────────────────────────
function Trend({ pct }) {
  if (pct == null) return null
  const up = pct > 0
  const zero = pct === 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${zero ? 'text-gray-500' : up ? 'text-emerald-400' : 'text-red-400'}`}>
      {zero ? <Minus size={11} /> : up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {Math.abs(pct)}%
    </span>
  )
}

// ── Filter dropdown for cards ─────────────────────────────────────────────────
function CardFilter({ options, value, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="p-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors">
        <Filter size={12} />
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-50 bg-gray-800 border border-gray-700 rounded-xl shadow-xl py-1 min-w-[110px]">
          {options.map(o => (
            <button key={o.value} onClick={() => { onChange(o.value); setOpen(false) }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${value === o.value ? 'text-orange-400 font-semibold' : 'text-gray-300 hover:bg-white/5'}`}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Default card definitions ──────────────────────────────────────────────────
const CARD_DEFS = {
  mrr:          { label: 'Platform MRR',         icon: IndianRupee, color: '#F5821E', format: v => `₹${(v||0).toLocaleString('en-IN')}`, key: 'mrr',            to: '/reports' },
  active_clinics:{ label: 'Active Clinics',      icon: Building2,   color: '#10b981', format: v => v ?? 0,                              key: 'active_clinics',  to: '/clinics?status=active' },
  total_patients:{ label: 'Total Patients',      icon: Users,       color: '#6366f1', format: v => v ?? 0,                              key: 'total_patients',  to: null },
  opd_today:    { label: 'OPD Today',            icon: Activity,    color: '#38bdf8', format: v => v ?? 0,                              key: 'opd_today',       to: null },
  pending:      { label: 'Pending Actions',      icon: Clock,       color: '#f59e0b', format: v => v ?? 0,                              key: 'pending_clinics', to: '/pending' },
  total_doctors:{ label: 'Doctors on Platform',  icon: ShieldCheck, color: '#a78bfa', format: v => v ?? 0,                              key: 'total_doctors',   to: null },
  new_this_month:{ label: 'New Clinics (Month)', icon: TrendingUp,  color: '#34d399', format: v => v ?? 0,                              key: 'new_this_month',  to: '/clinics' },
  total_clinics:{ label: 'Total Clinics',        icon: Building2,   color: '#0F2557', format: v => v ?? 0,                              key: 'total_clinics',   to: '/clinics' },
}

const FILTER_OPTS = [
  { value: 'today',   label: 'Today' },
  { value: '7d',      label: 'Last 7 days' },
  { value: '30d',     label: 'Last 30 days' },
  { value: '90d',     label: 'Last 90 days' },
]

const DEFAULT_CARDS = ['mrr','active_clinics','total_patients','opd_today','pending','total_doctors']
const STORAGE_KEY   = 'bh_dashboard_cards_v1'

function loadCards() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_CARDS }
  catch { return DEFAULT_CARDS }
}

// ── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({ cardKey, data, editMode, onRemove, onEdit, sparkData }) {
  const [filter, setFilter] = useState('30d')
  const def = CARD_DEFS[cardKey]
  if (!def) return null
  const { label, icon: Icon, color, format, key, to } = def
  const value = format(data?.[key])
  const trend = data?.[`${key}_trend`] ?? null

  const inner = (
    <div className="card relative flex flex-col gap-2 p-4 hover:border-gray-700 transition-colors group">
      {editMode && (
        <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center z-10 gap-3">
          <button onClick={() => onEdit(cardKey)}
            className="p-2 bg-gray-800 rounded-xl border border-gray-600 text-gray-300 hover:text-white">
            <Edit2 size={14} />
          </button>
          <button onClick={() => onRemove(cardKey)}
            className="p-2 bg-red-900/60 rounded-xl border border-red-700 text-red-400 hover:text-red-300">
            <X size={14} />
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}22` }}>
            <Icon size={16} style={{ color }} />
          </div>
          <span className="text-xs text-gray-400 font-medium leading-tight">{label}</span>
        </div>
        <CardFilter options={FILTER_OPTS} value={filter} onChange={setFilter} />
      </div>
      {/* Value */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-extrabold text-white leading-none">{value}</div>
          {trend != null && (
            <div className="mt-1 flex items-center gap-1">
              <Trend pct={trend} />
              <span className="text-xs text-gray-500">vs prev period</span>
            </div>
          )}
        </div>
      </div>
      {/* Sparkline */}
      <div className="mt-1 opacity-70">
        <Spark data={sparkData || []} color={color} />
      </div>
    </div>
  )

  return to && !editMode ? <Link to={to}>{inner}</Link> : inner
}

// ── Add Card Modal ────────────────────────────────────────────────────────────
function AddCardModal({ current, onAdd, onClose }) {
  const available = Object.keys(CARD_DEFS).filter(k => !current.includes(k))
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Add Metric Card</h3>
          <button onClick={onClose}><X size={16} className="text-gray-500" /></button>
        </div>
        {available.length === 0
          ? <p className="text-gray-500 text-sm text-center py-4">All cards are already on dashboard.</p>
          : (
            <div className="space-y-2">
              {available.map(k => {
                const { label, icon: Icon, color } = CARD_DEFS[k]
                return (
                  <button key={k} onClick={() => { onAdd(k); onClose() }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors text-left">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}22` }}>
                      <Icon size={15} style={{ color }} />
                    </div>
                    <span className="text-sm text-gray-200">{label}</span>
                    <Plus size={14} className="ml-auto text-gray-500" />
                  </button>
                )
              })}
            </div>
          )
        }
      </div>
    </div>
  )
}

// ── Chart colors ──────────────────────────────────────────────────────────────
const PLAN_COLORS   = { free:'#6b7280', basic:'#6366f1', pro:'#8b5cf6', enterprise:'#ec4899' }
const STATUS_COLORS = { active:'#10b981', pending:'#f59e0b', suspended:'#f97316', revoked:'#ef4444' }

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [cards, setCards]       = useState(loadCards)
  const [editMode, setEditMode] = useState(false)
  const [addOpen, setAddOpen]   = useState(false)
  const [range, setRange]       = useState('30d')
  const [chartTab, setChartTab] = useState('mrr')

  const load = useCallback(() => {
    setLoading(true)
    adminApi.getDashboard()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(cards)) }, [cards])

  const removeCard = k => setCards(c => c.filter(x => x !== k))
  const addCard    = k => setCards(c => [...c, k])

  const statusDist = data ? Object.entries(data.clinic_status_distribution || {}).map(([name, value]) => ({ name, value })) : []
  const planDist   = data ? Object.entries(data.plan_distribution || {}).map(([name, value]) => ({ name, value })) : []

  // Mock sparklines (replace with real per-card API later)
  const spark = Array.from({ length: 7 }, (_, i) => ({ v: Math.floor(Math.random() * 40 + 10) }))

  return (
    <div className="space-y-6">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {['today','7d','30d','90d'].map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${range === r ? 'text-white' : 'text-gray-500 hover:text-gray-300 bg-transparent'}`}
              style={range === r ? { background: '#0F2557' } : {}}>
              {r === 'today' ? 'Today' : r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-xl bg-gray-800 text-gray-400 hover:text-white transition-colors" title="Refresh">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setEditMode(e => !e)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${editMode ? 'border-orange-500 text-orange-400 bg-orange-500/10' : 'border-gray-700 text-gray-400 hover:text-white bg-gray-800'}`}>
            {editMode ? <><Check size={13} /> Done</> : <><Settings2 size={13} /> Customize</>}
          </button>
          {editMode && (
            <button onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-800 border border-gray-700 text-gray-300 hover:text-white transition-colors">
              <Plus size={13} /> Add Card
            </button>
          )}
        </div>
      </div>

      {/* ── Metric cards grid ── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-3 w-24 bg-gray-800 rounded mb-3" />
              <div className="h-7 w-16 bg-gray-800 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(k => (
            <MetricCard key={k} cardKey={k} data={data} editMode={editMode}
              onRemove={removeCard} onEdit={() => {}} sparkData={spark} />
          ))}
          {editMode && (
            <button onClick={() => setAddOpen(true)}
              className="card p-4 border-dashed border-2 border-gray-700 hover:border-orange-500/50 flex flex-col items-center justify-center gap-2 text-gray-600 hover:text-orange-400 transition-colors min-h-[120px]">
              <Plus size={22} />
              <span className="text-xs font-semibold">Add Card</span>
            </button>
          )}
        </div>
      )}

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main area chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1">
              {[['mrr','Revenue'],['clinics','Clinics'],['patients','Patients']].map(([t,l]) => (
                <button key={t} onClick={() => setChartTab(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${chartTab === t ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  style={chartTab === t ? { background: '#0F2557' } : {}}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data?.monthly_registrations || []} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#F5821E" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#F5821E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill:'#6b7280', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:'#6b7280', fontSize:11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background:'#111827', border:'1px solid #374151', borderRadius:8 }}
                labelStyle={{ color:'#e5e7eb' }} itemStyle={{ color:'#F5821E' }} />
              <Area type="monotone" dataKey="count" stroke="#F5821E" strokeWidth={2} fill="url(#cg)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status donut */}
        <div className="card p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Clinic Status</div>
          {statusDist.length === 0
            ? <div className="flex items-center justify-center h-[200px] text-gray-600 text-sm">No data</div>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusDist} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    {statusDist.map((e, i) => <Cell key={i} fill={STATUS_COLORS[e.name] || '#6b7280'} />)}
                  </Pie>
                  <Legend iconType="circle" iconSize={8}
                    formatter={v => <span style={{ color:'#9ca3af', fontSize:11 }}>{v}</span>} />
                  <Tooltip contentStyle={{ background:'#111827', border:'1px solid #374151', borderRadius:8 }}
                    itemStyle={{ color:'#e5e7eb' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
        </div>
      </div>

      {/* ── Plan dist + Clinic table ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Plan donut */}
        <div className="card p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Subscription Plans</div>
          {planDist.length === 0
            ? <div className="flex items-center justify-center h-[200px] text-gray-600 text-sm">No data</div>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={planDist} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    {planDist.map((e, i) => <Cell key={i} fill={PLAN_COLORS[e.name] || '#6b7280'} />)}
                  </Pie>
                  <Legend iconType="circle" iconSize={8}
                    formatter={v => <span style={{ color:'#9ca3af', fontSize:11 }}>{v}</span>} />
                  <Tooltip contentStyle={{ background:'#111827', border:'1px solid #374151', borderRadius:8 }}
                    itemStyle={{ color:'#e5e7eb' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
        </div>

        {/* Rate card */}
        <div className="lg:col-span-2 card p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Rate Card</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(data?.rate_card || {}).map(([plan, info]) => (
              <div key={plan} className="bg-gray-800 rounded-xl p-3">
                <div className="text-xs font-semibold text-gray-400 uppercase mb-1">{plan}</div>
                <div className="text-lg font-extrabold text-white">
                  {info.price_per_doctor === 0 ? 'Free' : `₹${info.price_per_doctor}`}
                </div>
                {info.price_per_doctor > 0 && <div className="text-xs text-gray-500">per doctor/mo</div>}
                <div className="text-xs text-gray-500 mt-1">
                  Max {info.max_doctors >= 999 ? '∞' : info.max_doctors} doctors
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pending approvals */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pending Actions</span>
            <Link to="/pending" className="text-xs text-orange-400 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-800">
            {(data?.pending_approvals || []).length === 0
              ? <div className="px-5 py-8 text-center text-gray-600 text-sm">No pending actions</div>
              : (data.pending_approvals || []).slice(0, 5).map(c => (
                <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-white font-medium">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.city} · {c.specialty}</div>
                  </div>
                  <Link to={`/clinics/${c.id}`}
                    className="text-xs px-3 py-1 rounded-lg font-semibold text-white flex-shrink-0"
                    style={{ background: '#0F2557' }}>
                    Review
                  </Link>
                </div>
              ))}
          </div>
        </div>

        {/* Recent audit log */}
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Activity</span>
            <Link to="/audit" className="text-xs text-orange-400 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-800">
            {(data?.recent_audit || []).length === 0
              ? <div className="px-5 py-8 text-center text-gray-600 text-sm">No recent activity</div>
              : (data.recent_audit || []).slice(0, 5).map((e, i) => (
                <div key={i} className="px-5 py-3 flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-orange-400" />
                  <div>
                    <div className="text-sm text-gray-300">{e.action}</div>
                    <div className="text-xs text-gray-500">{e.details} · {e.created_at ? new Date(e.created_at).toLocaleString('en-IN', { dateStyle:'short', timeStyle:'short' }) : ''}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {addOpen && <AddCardModal current={cards} onAdd={addCard} onClose={() => setAddOpen(false)} />}
    </div>
  )
}
