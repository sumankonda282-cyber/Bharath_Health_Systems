import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { cachedFetch, TTL } from '../utils/cache'
import {
  Pill, Package, CheckCircle, Loader2, TrendingUp, IndianRupee,
  PackagePlus, BarChart2, AlertTriangle, AlertCircle, ClipboardList,
  ShoppingCart
} from 'lucide-react'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function StatCard({ icon: Icon, label, value, color, to }) {
  const inner = (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(15,37,87,0.05)', cursor: to ? 'pointer' : 'default' }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-extrabold leading-none" style={{ color: '#0F2557' }}>
          {value ?? <span className="text-gray-300 text-xl">—</span>}
        </div>
        <div className="text-xs text-gray-500 font-medium mt-1">{label}</div>
      </div>
    </div>
  )
  return to ? <Link to={to} className="block">{inner}</Link> : inner
}

function QuickAction({ label, to, color, icon: Icon }) {
  return (
    <Link to={to}
      className="flex items-center gap-3 p-4 rounded-2xl border border-gray-100 bg-white hover:shadow-md transition-all duration-150 group"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">{label}</span>
    </Link>
  )
}

export default function Dashboard() {
  const [pending, setPending] = useState([])
  const [medicines, setMedicines] = useState([])
  const [allRx, setAllRx] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  const h = new Date().getHours()
  const greeting = h >= 5 && h < 12 ? 'Good morning' : h >= 12 && h < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => {
    const fetchAll = () =>
      Promise.all([
        api.get('/pharmacy/pending'),
        api.get('/pharmacy/medicines', { params: { limit: 200 } }),
        api.get('/pharmacy/all'),
        api.get('/billing/invoices', { params: { limit: 200 } }),
      ]).then(([p, m, all, inv]) => {
        setPending(Array.isArray(p) ? p : [])
        setMedicines(Array.isArray(m) ? m : [])
        setAllRx(Array.isArray(all) ? all : [])
        setInvoices(Array.isArray(inv) ? inv : (Array.isArray(inv?.invoices) ? inv.invoices : []))
      })

    cachedFetch(
      'pharmacy_dashboard',
      () => fetchAll().then(() => ({ _loaded: true })),
      () => {},
      TTL.MEDIUM
    ).catch(() => {})

    fetchAll().finally(() => setLoading(false))
    const interval = setInterval(() => {
      api.get('/pharmacy/pending').then(p => setPending(Array.isArray(p) ? p : [])).catch(() => {})
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  const today = todayStr()

  const lowStock = medicines.filter(m => (m.stock_quantity || 0) < 10)

  const todayMs = new Date().setHours(0, 0, 0, 0)
  const day30 = todayMs + 30 * 24 * 60 * 60 * 1000
  const day60 = todayMs + 60 * 24 * 60 * 60 * 1000

  const expiringIn30 = medicines.filter(m => {
    if (!m.expiry_date) return false
    const exp = new Date(m.expiry_date).getTime()
    return exp >= todayMs && exp <= day30
  })
  const expiringIn60 = medicines.filter(m => {
    if (!m.expiry_date) return false
    const exp = new Date(m.expiry_date).getTime()
    return exp > day30 && exp <= day60
  })
  const lowStockAlerts = medicines.filter(m =>
    m.reorder_level != null && (m.stock_quantity || 0) <= m.reorder_level
  )
  const dispensedToday = useMemo(() =>
    allRx.filter(rx => rx.status === 'dispensed' && rx.created_at && rx.created_at.slice(0, 10) === today).length,
    [allRx, today]
  )
  const revenueToday = useMemo(() =>
    invoices
      .filter(inv => inv.status === 'paid' && inv.created_at && inv.created_at.slice(0, 10) === today)
      .reduce((s, inv) => s + (Number(inv.total_amount) || 0), 0),
    [invoices, today]
  )

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <Loader2 size={32} className="animate-spin text-gray-400" />
      <span className="text-sm text-gray-400">Loading…</span>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#0F2557' }}>
          {greeting} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard icon={Pill}        label="Pending Rx"      value={pending.length}               color="#CC1414" to="/orders" />
        <StatCard icon={Package}     label="Total Medicines"  value={medicines.length}              color="#F5821E" to="/inventory" />
        <StatCard icon={AlertCircle} label="Low Stock"        value={lowStock.length}               color="#DC2626" to="/inventory" />
        <StatCard icon={CheckCircle} label="Dispensed Today"  value={dispensedToday}                color="#16A34A" to="/history" />
        <StatCard icon={IndianRupee} label="Revenue Today"    value={`₹${revenueToday.toFixed(0)}`} color="#0F2557" to="/billing" />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction label="View Pending Rx"  to="/orders"          color="#CC1414" icon={Pill} />
          <QuickAction label="Receive Stock"    to="/stock-in"        color="#0F2557" icon={PackagePlus} />
          <QuickAction label="Purchase Orders"  to="/purchase-orders" color="#7c3aed" icon={ShoppingCart} />
          <QuickAction label="Reports"          to="/reports"         color="#F5821E" icon={BarChart2} />
        </div>
      </div>

      {/* Alerts */}
      {(expiringIn30.length > 0 || expiringIn60.length > 0 || lowStockAlerts.length > 0) && (
        <div className="mb-8 space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Alerts</h2>

          {expiringIn30.length > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-red-600 flex-shrink-0" />
                <span className="font-semibold text-red-700 text-sm">Expiring Within 30 Days ({expiringIn30.length})</span>
              </div>
              <div className="space-y-1.5">
                {expiringIn30.slice(0, 5).map(m => (
                  <div key={m.id} className="flex items-center justify-between text-xs text-red-700 bg-red-100/80 rounded-xl px-3 py-2">
                    <div>
                      <span className="font-semibold">{m.name}</span>
                      {m.batch_number && <span className="ml-2 text-red-500 font-medium">Batch: {m.batch_number}</span>}
                    </div>
                    <div className="text-right">
                      <div>Exp: {new Date(m.expiry_date).toLocaleDateString('en-IN')}</div>
                      <div>Stock: {m.stock_quantity ?? '—'}</div>
                    </div>
                  </div>
                ))}
                {expiringIn30.length > 5 && (
                  <Link to="/inventory" className="block text-center text-xs text-red-600 font-medium pt-1 hover:underline">
                    +{expiringIn30.length - 5} more — view all in Inventory
                  </Link>
                )}
              </div>
            </div>
          )}

          {expiringIn60.length > 0 && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={16} className="text-orange-600 flex-shrink-0" />
                <span className="font-semibold text-orange-700 text-sm">Expiring in 31–60 Days ({expiringIn60.length})</span>
              </div>
              <div className="space-y-1.5">
                {expiringIn60.slice(0, 3).map(m => (
                  <div key={m.id} className="flex items-center justify-between text-xs text-orange-700 bg-orange-100/80 rounded-xl px-3 py-2">
                    <span className="font-semibold">{m.name}</span>
                    <span>Exp: {new Date(m.expiry_date).toLocaleDateString('en-IN')}</span>
                  </div>
                ))}
                {expiringIn60.length > 3 && (
                  <Link to="/inventory" className="block text-center text-xs text-orange-600 font-medium pt-1 hover:underline">
                    +{expiringIn60.length - 3} more
                  </Link>
                )}
              </div>
            </div>
          )}

          {lowStockAlerts.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
                <span className="font-semibold text-amber-700 text-sm">Reorder Required ({lowStockAlerts.length})</span>
              </div>
              <div className="space-y-1.5">
                {lowStockAlerts.slice(0, 5).map(m => (
                  <div key={m.id} className="flex items-center justify-between text-xs text-amber-800 bg-amber-100/80 rounded-xl px-3 py-2">
                    <span className="font-semibold">{m.name}</span>
                    <span>Stock: {m.stock_quantity ?? 0} / Reorder at: {m.reorder_level}</span>
                  </div>
                ))}
                {lowStockAlerts.length > 5 && (
                  <Link to="/inventory" className="block text-center text-xs text-amber-700 font-medium pt-1 hover:underline">
                    +{lowStockAlerts.length - 5} more
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pending Prescriptions */}
      {pending.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(15,37,87,0.05)' }}>
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-800">Pending Prescriptions</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: '#CC141418', color: '#CC1414' }}>
                {pending.length}
              </span>
            </div>
            <Link to="/orders" className="text-xs font-medium hover:underline" style={{ color: '#0F2557' }}>
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">Rx #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">Patient</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">Doctor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pending.slice(0, 10).map(rx => (
                  <tr key={rx.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-bold font-mono" style={{ color: '#CC1414' }}>RX-{rx.id}</td>
                    <td className="px-4 py-3.5 text-sm font-medium text-gray-800">{rx.patient?.full_name || '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">{rx.doctor?.full_name || '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">
                      {rx.created_at ? new Date(rx.created_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pending.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-16 px-6"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <ClipboardList size={36} className="mb-3 opacity-20 text-gray-400" />
          <p className="text-sm font-medium text-gray-500">No pending prescriptions</p>
          <p className="text-xs text-gray-400 mt-1">All prescriptions have been dispensed</p>
        </div>
      )}
    </div>
  )
}
