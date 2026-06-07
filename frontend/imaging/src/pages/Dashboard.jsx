import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import {
  ScanLine, Clock, CheckCircle, Loader2, FileEdit, BarChart2,
  AlertTriangle, Activity, Zap,
} from 'lucide-react'

// TAT targets in minutes (imaging-specific)
const TAT_TARGETS = { STAT: 30, Urgent: 60, Routine: 120 }

function isToday(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr).toDateString() === new Date().toDateString()
}

function minutesSince(dateStr) {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
}

function ageLabel(mins) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function tatTarget(order) {
  return TAT_TARGETS[order.priority] || 120
}

function ageColor(mins, target) {
  const pct = mins / target
  if (pct >= 1)    return 'bg-red-500'
  if (pct >= 0.75) return 'bg-orange-400'
  if (pct >= 0.50) return 'bg-yellow-400'
  return 'bg-green-500'
}

function getShift() {
  const h = new Date().getHours()
  if (h >= 6  && h < 14) return 'Morning Shift'
  if (h >= 14 && h < 22) return 'Afternoon Shift'
  return 'Night Shift'
}

function avgTAT(orders) {
  const done = orders.filter(o => o.signed_at && o.acquired_at)
  if (!done.length) return null
  const total = done.reduce((s, o) => s + (new Date(o.signed_at) - new Date(o.acquired_at)), 0)
  const avgMins = Math.round(total / done.length / 60000)
  if (avgMins < 60) return `${avgMins}m`
  return `${Math.floor(avgMins / 60)}h ${avgMins % 60}m`
}

function KpiCard({ icon: Icon, label, value, accent, sub, urgent, to }) {
  const inner = (
    <div className={`card p-5 flex items-start gap-4 ${urgent ? 'ring-2 ring-red-400' : ''} ${to ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: accent + '1a' }}>
        <Icon size={22} style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold tabular-nums leading-tight" style={{ color: '#0F2557' }}>
          {value ?? '—'}
        </div>
        <div className="text-xs text-gray-500 font-medium mt-0.5">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
  return to ? <Link to={to} className="block">{inner}</Link> : inner
}

function QueueRow({ order }) {
  const mins   = minutesSince(order.created_at)
  const target = tatTarget(order)
  const dot    = ageColor(mins, target)
  return (
    <div className="flex items-center justify-between py-2.5 px-4 border-b border-red-100 last:border-0 hover:bg-red-50/40 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-800 truncate">
            {order.patient?.full_name || '—'}
          </div>
          <div className="text-xs text-gray-500 truncate">
            {order.modality || order.body_part || '—'} · IMG-{order.id}
          </div>
        </div>
      </div>
      <span className="ml-3 text-xs font-bold tabular-nums text-red-700 bg-red-100 px-2 py-0.5 rounded-full flex-shrink-0">
        {ageLabel(mins)}
      </span>
    </div>
  )
}

function PriorityBadge({ priority }) {
  if (priority === 'STAT')   return <span className="badge badge-red">STAT</span>
  if (priority === 'Urgent') return <span className="badge badge-orange">Urgent</span>
  return <span className="badge badge-gray">Routine</span>
}

function StatusBadge({ status }) {
  const map = {
    pending:     'badge-yellow',
    scheduled:   'badge-blue',
    in_progress: 'badge-purple',
    acquired:    'badge-blue',
    completed:   'badge-green',
    signed:      'badge-green',
  }
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status?.replace('_', ' ')}</span>
}

const PRIORITY_ORDER = { STAT: 0, Urgent: 1, Routine: 2 }

export default function Dashboard() {
  const { user } = useAuth()
  const isRadiologist = user?.role === 'radiologist'

  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(() => {
    api.get('/imaging/orders', { params: { limit: 300 } })
      .then(r => {
        setOrders(Array.isArray(r) ? r : (r?.items || r?.data || []))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchOrders()
    const iv = setInterval(fetchOrders, 30_000)
    return () => clearInterval(iv)
  }, [fetchOrders])

  const DONE = ['completed', 'signed']

  const todayOrders  = orders.filter(o => isToday(o.created_at))
  const statUrgent   = orders.filter(o => ['STAT', 'Urgent'].includes(o.priority) && !DONE.includes(o.status))
  const pendingAll   = orders.filter(o => !DONE.includes(o.status))
  const tatBreaches  = pendingAll.filter(o => minutesSince(o.created_at) > tatTarget(o))

  // Radiologist KPIs
  const pendingReview = orders.filter(o => o.status === 'acquired' && !o.signed_at && !o.report_signed_at)
  const signedToday   = orders.filter(o => {
    const ts = o.signed_at || o.report_signed_at
    return ts && isToday(ts)
  })
  const avgTA = avgTAT(orders)

  // Technician KPIs
  const acquiredCount = orders.filter(o => o.status === 'acquired' || (o.acquired_at && isToday(o.acquired_at))).length
  const pendingAcq    = orders.filter(o => ['pending', 'scheduled', 'in_progress'].includes(o.status))

  // Worklist: pending, sorted priority → age desc, capped at 30
  const worklist = [...pendingAll]
    .sort((a, b) => {
      const pd = (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2)
      if (pd !== 0) return pd
      return minutesSince(b.created_at) - minutesSince(a.created_at)
    })
    .slice(0, 30)

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 size={32} className="animate-spin text-gray-400" />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Imaging Dashboard</h1>
          <div className="text-sm text-gray-400 mt-0.5">{getShift()}</div>
        </div>
        <span className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      {/* TAT breach alert */}
      {tatBreaches.length > 0 && (
        <div className="flex items-center gap-3 p-3 mb-5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle size={16} className="flex-shrink-0 text-red-500" />
          <span>
            <strong>{tatBreaches.length} {tatBreaches.length === 1 ? 'study has' : 'studies have'}</strong>{' '}
            breached TAT — {tatBreaches.filter(o => o.priority === 'STAT').length} STAT,{' '}
            {tatBreaches.filter(o => o.priority === 'Urgent').length} Urgent,{' '}
            {tatBreaches.filter(o => !['STAT', 'Urgent'].includes(o.priority)).length} Routine
          </span>
        </div>
      )}

      {/* KPI Cards */}
      {isRadiologist ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <KpiCard icon={ScanLine}      label="Pending Review" value={pendingReview.length}  accent="#F5821E" urgent={pendingReview.length > 10} to="/pending-review" />
          <KpiCard icon={Zap}           label="STAT / Urgent"  value={statUrgent.length}     accent="#EF4444" urgent={statUrgent.length > 0} to="/orders" />
          <KpiCard icon={AlertTriangle} label="TAT Breaches"   value={tatBreaches.length}    accent="#EF4444" urgent={tatBreaches.length > 0} to="/orders" />
          <KpiCard icon={CheckCircle}   label="Signed Today"   value={signedToday.length}    accent="#16A34A" to="/reports" />
          <KpiCard icon={BarChart2}     label="Avg TAT"        value={avgTA ?? '—'}          accent="#0F2557" sub="acquisition → sign" to="/reports" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard icon={Activity}  label="Today's Studies" value={todayOrders.length}  accent="#F5821E" to="/orders" />
          <KpiCard icon={Zap}       label="STAT / Urgent"   value={statUrgent.length}   accent="#EF4444" urgent={statUrgent.length > 0} to="/orders" />
          <KpiCard icon={ScanLine}  label="Acquired"        value={acquiredCount}        accent="#0F2557" to="/orders" />
          <KpiCard icon={FileEdit}  label="Pending"         value={pendingAcq.length}   accent="#6366F1" urgent={tatBreaches.length > 0} sub={tatBreaches.length > 0 ? `${tatBreaches.length} TAT breached` : undefined} to="/pending" />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* STAT / Urgent queue */}
        {statUrgent.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between bg-red-900">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Zap size={15} />
                STAT / Urgent Queue
              </div>
              <span className="text-xs text-red-200">{statUrgent.length} pending</span>
            </div>
            <div>
              {statUrgent.slice(0, 10).map(o => <QueueRow key={o.id} order={o} />)}
            </div>
          </div>
        )}

        {/* Pending worklist */}
        <div className={`card overflow-hidden ${statUrgent.length > 0 ? 'xl:col-span-2' : 'xl:col-span-3'}`}>
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="font-semibold text-gray-700 flex items-center gap-2">
              <Clock size={15} style={{ color: '#0F2557' }} />
              Pending Worklist
            </div>
            <span className="text-xs text-gray-400">{worklist.length} studies</span>
          </div>
          {worklist.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <CheckCircle size={32} className="mx-auto mb-3 text-green-400 opacity-60" />
              <div className="text-sm font-medium">All studies up to date</div>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th className="th">Order</th>
                    <th className="th">Patient</th>
                    <th className="th">Modality</th>
                    <th className="th">Priority</th>
                    <th className="th">Status</th>
                    <th className="th">Age</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {worklist.map(o => {
                    const mins = minutesSince(o.created_at)
                    const dot  = ageColor(mins, tatTarget(o))
                    return (
                      <tr key={o.id} className="tr-hover">
                        <td className="td font-mono text-xs">IMG-{o.id}</td>
                        <td className="td font-medium">{o.patient?.full_name || '—'}</td>
                        <td className="td text-gray-500">{o.modality || o.body_part || '—'}</td>
                        <td className="td"><PriorityBadge priority={o.priority} /></td>
                        <td className="td"><StatusBadge status={o.status} /></td>
                        <td className="td">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                            <span className="text-xs tabular-nums">{ageLabel(mins)}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Shift summary bar */}
      <div className="mt-5 card p-5 flex flex-wrap gap-8 items-center">
        <div>
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Total Today</div>
          <div className="text-2xl font-bold" style={{ color: '#0F2557' }}>{todayOrders.length}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Completed</div>
          <div className="text-2xl font-bold text-green-600">
            {orders.filter(o => DONE.includes(o.status) && isToday(o.created_at)).length}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">
            {pendingAll.filter(o => isToday(o.created_at)).length}
          </div>
        </div>
        {avgTA && (
          <div>
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Avg TAT</div>
            <div className="text-2xl font-bold" style={{ color: '#0F2557' }}>{avgTA}</div>
          </div>
        )}
        <div className="ml-auto text-right">
          <div className="text-xs text-gray-400">Auto-refreshes every 30s</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {getShift()} · {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  )
}
