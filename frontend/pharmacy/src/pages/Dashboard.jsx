import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import {
  Pill, Package, ClipboardList, ShoppingCart, IndianRupee,
  TrendingUp, AlertTriangle, Clock, Loader2, PackagePlus, BarChart3,
  CheckCircle, AlertCircle, RefreshCw,
} from 'lucide-react'

function todayStr() { return new Date().toISOString().slice(0, 10) }
function fmtCur(n) { return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }) }

function KpiCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: color + '18' }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold truncate" style={{ color: '#0F2557' }}>{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
        {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

function RevenueChart({ invoices }) {
  const days = useMemo(() => {
    const map = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const label = i === 0 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' })
      map[key] = { label, total: 0 }
    }
    invoices.forEach(inv => {
      const d = (inv.created_at || '').slice(0, 10)
      if (map[d]) map[d].total += Number(inv.total_amount || inv.total || 0)
    })
    return Object.values(map)
  }, [invoices])

  const maxVal = Math.max(...days.map(d => d.total), 1)

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold" style={{ color: '#0F2557' }}>Revenue — Last 7 Days</span>
        <BarChart3 size={16} className="text-gray-400" />
      </div>
      <div className="flex items-end gap-2 h-28">
        {days.map((d, i) => {
          const pct = (d.total / maxVal) * 100
          const isToday = i === 6
          return (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-gray-400 font-medium">
                {d.total > 0 ? '₹' + Math.round(d.total / 1000) + 'k' : ''}
              </span>
              <div className="w-full rounded-t-lg transition-all duration-500" style={{
                height: `${Math.max(pct, 4)}%`,
                background: isToday ? '#F5821E' : '#0F2557',
                opacity: pct < 4 ? 0.2 : 1,
              }} />
              <span className={`text-[10px] font-medium ${isToday ? 'text-orange-500' : 'text-gray-500'}`}>
                {d.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PaymentSplit({ invoices }) {
  const today = todayStr()
  const todayPaid = useMemo(() =>
    invoices.filter(i => i.status === 'paid' && (i.created_at || '').slice(0, 10) === today),
  [invoices, today])

  const byMethod = useMemo(() => {
    const m = {}
    todayPaid.forEach(inv => {
      const key = inv.payment_method || 'other'
      m[key] = (m[key] || 0) + Number(inv.total_amount || inv.total || 0)
    })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [todayPaid])

  const total = byMethod.reduce((s, [, v]) => s + v, 0)
  const COLORS = { cash: '#16a34a', upi: '#2563eb', card: '#7c3aed', credit: '#d97706', other: '#6b7280' }

  return (
    <div className="card p-5">
      <div className="text-sm font-bold mb-4" style={{ color: '#0F2557' }}>Payment Split (Today)</div>
      {byMethod.length === 0 ? (
        <div className="text-gray-400 text-sm text-center py-4">No payments today</div>
      ) : (
        <div className="space-y-2.5">
          {byMethod.map(([method, amt]) => {
            const pct = total > 0 ? (amt / total) * 100 : 0
            const color = COLORS[method] || COLORS.other
            return (
              <div key={method}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-700 capitalize font-medium">{method}</span>
                  <span className="text-gray-500">{fmtCur(amt)} ({pct.toFixed(0)}%)</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const [cpoeQueue, setCpoeQueue] = useState([])
  const [cart, setCart] = useState([])
  const [medicines, setMedicines] = useState([])
  const [invoices, setInvoices] = useState([])
  const [alerts, setAlerts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    try {
      const [cpoe, cartData, meds, invs, alrt] = await Promise.allSettled([
        api.get('/pharmacy/cpoe-queue'),
        api.get('/pharmacy/cart'),
        api.get('/pharmacy/medicines', { params: { limit: 500 } }),
        api.get('/billing/invoices', { params: { limit: 500 } }),
        api.get('/pharmacy/alerts'),
      ])
      if (cpoe.status === 'fulfilled') setCpoeQueue(Array.isArray(cpoe.value) ? cpoe.value : [])
      if (cartData.status === 'fulfilled') {
        const c = cartData.value
        setCart(Array.isArray(c) ? c : (c?.groups || []))
      }
      if (meds.status === 'fulfilled') setMedicines(Array.isArray(meds.value) ? meds.value : [])
      if (invs.status === 'fulfilled') {
        const v = invs.value
        setInvoices(Array.isArray(v) ? v : (Array.isArray(v?.invoices) ? v.invoices : []))
      }
      if (alrt.status === 'fulfilled') setAlerts(alrt.value)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(() => {
      api.get('/pharmacy/cpoe-queue').then(r => setCpoeQueue(Array.isArray(r) ? r : [])).catch(() => {})
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  const today = todayStr()
  const cartCount = cart.reduce((s, g) => s + (g.items?.length || 0), 0)
  const pendingOrders = cpoeQueue.length
  const lowStock = (alerts?.low_stock?.length) || medicines.filter(m => (m.stock_quantity || 0) < (m.reorder_level || 10)).length
  const expiringCount = (alerts?.expiring_soon || []).length
  const todayInvoices = useMemo(() => invoices.filter(i => (i.created_at || '').slice(0, 10) === today), [invoices, today])
  const revenueToday = useMemo(() => todayInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount || i.total || 0), 0), [todayInvoices])
  const dispensedToday = todayInvoices.filter(i => i.status === 'paid').length

  if (loading) return (
    <div className="flex justify-center py-24">
      <Loader2 size={32} className="animate-spin text-gray-400" />
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Pharmacy Dashboard</h1>
        <button onClick={() => load(true)} className="btn-secondary" disabled={refreshing}>
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Revenue Today"    value={fmtCur(revenueToday)} icon={IndianRupee}  color="#0F2557" />
        <KpiCard label="CPOE Pending"     value={pendingOrders}        icon={ClipboardList} color="#2563eb"
          sub={pendingOrders > 0 ? `${cpoeQueue.filter(p => p.orders?.some(o => o.is_stat)).length} STAT` : 'All clear'} />
        <KpiCard label="In Cart"          value={cartCount}            icon={ShoppingCart}  color="#16a34a" />
        <KpiCard label="Scripts Today"    value={dispensedToday}       icon={CheckCircle}   color="#7c3aed" />
        <KpiCard label="Total Medicines"  value={medicines.length}     icon={Package}       color="#F5821E" />
        <KpiCard label="Low Stock"        value={lowStock}             icon={AlertTriangle} color="#CC1414"
          sub={lowStock > 0 ? 'Action needed' : 'All OK'} />
        <KpiCard label="Near Expiry 30d"  value={expiringCount}        icon={Clock}         color="#d97706" />
        <KpiCard label="Billing Pending"  value={todayInvoices.filter(i => i.status === 'pending').length} icon={AlertCircle} color="#6b7280" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2"><RevenueChart invoices={invoices} /></div>
        <PaymentSplit invoices={invoices} />
      </div>

      {/* Quick Actions */}
      <div className="card p-5 mb-6">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Quick Actions</div>
        <div className="flex flex-wrap gap-3">
          <Link to="/cpoe" className="btn-primary">
            <ClipboardList size={15} />CPOE Queue
            {pendingOrders > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-xs">{pendingOrders}</span>}
          </Link>
          <Link to="/cart" className="btn-secondary">
            <ShoppingCart size={15} />Prepared Cart
            {cartCount > 0 && <span className="ml-1 text-xs text-gray-500">({cartCount})</span>}
          </Link>
          <Link to="/counter-sales" className="btn-secondary"><Pill size={15} />Counter Sales</Link>
          <Link to="/stock-in" className="btn-secondary"><PackagePlus size={15} />Receive Stock</Link>
          <Link to="/reports" className="btn-secondary"><BarChart3 size={15} />Reports</Link>
        </div>
      </div>

      {/* Alerts */}
      {((alerts?.low_stock?.length || 0) > 0 || (alerts?.expiring_soon?.length || 0) > 0 || (alerts?.expired?.length || 0) > 0) && (
        <div className="space-y-3">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Active Alerts</div>

          {(alerts?.expired || []).length > 0 && (
            <div className="card border-red-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-red-600" />
                <span className="text-sm font-bold text-red-700">Expired Medicines ({alerts.expired.length})</span>
              </div>
              <div className="space-y-1.5">
                {alerts.expired.slice(0, 5).map((b, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-red-50 rounded-lg px-3 py-2">
                    <span className="text-red-700 font-medium">{b.medicine_name}</span>
                    <span className="text-red-500">Expired {b.expiry_date} · Qty {b.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(alerts?.expiring_soon || []).length > 0 && (
            <div className="card border-amber-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-amber-600" />
                <span className="text-sm font-bold text-amber-700">Near Expiry — next 30 days ({alerts.expiring_soon.length})</span>
              </div>
              <div className="space-y-1.5">
                {alerts.expiring_soon.slice(0, 5).map((b, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-amber-50 rounded-lg px-3 py-2">
                    <span className="text-amber-700 font-medium">{b.medicine_name}</span>
                    <span className="text-amber-600">Exp {b.expiry_date} · Qty {b.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(alerts?.low_stock || []).length > 0 && (
            <div className="card border-orange-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-orange-600" />
                <span className="text-sm font-bold text-orange-700">Low Stock ({alerts.low_stock.length} medicines)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {alerts.low_stock.slice(0, 8).map((m, i) => (
                  <div key={i} className="bg-orange-50 rounded-lg px-3 py-2 text-xs">
                    <div className="text-orange-800 font-medium truncate">{m.name}</div>
                    <div className="text-orange-600">Stock: {m.stock_quantity} / Reorder: {m.reorder_level}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
