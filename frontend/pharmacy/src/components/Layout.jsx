import ChatWidget from './ChatWidget'
import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Pill, Package, Settings, LogOut, History, PackagePlus, CreditCard, BarChart2, Menu, X, Building2, ShoppingCart, Bell, AlertTriangle, Clock, RotateCcw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/client'

const NAV = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pending',       icon: Pill,            label: 'Pending Rx' },
  { to: '/history',       icon: History,         label: 'Rx History' },
  { to: '/inventory',     icon: Package,         label: 'Inventory' },
  { to: '/stock-in',      icon: PackagePlus,     label: 'Receive Stock' },
  { to: '/suppliers',     icon: Building2,       label: 'Suppliers' },
  { to: '/purchase-orders', icon: ShoppingCart,  label: 'Purchase Orders' },
  { to: '/billing',       icon: CreditCard,      label: 'Billing' },
  { to: '/reports',       icon: BarChart2,       label: 'Reports' },
]

// ── Alerts Bell ───────────────────────────────────────────────────────────────

function AlertsBell() {
  const [alerts, setAlerts] = useState(null)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/pharmacy/alerts').then(r => setAlerts(r)).catch(() => {})
    const t = setInterval(() => {
      api.get('/pharmacy/alerts').then(r => setAlerts(r)).catch(() => {})
    }, 120000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const count = alerts ? alerts.total_count || 0 : 0

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors"
        title="Alerts"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
            style={{ background: '#CC1414', color: 'white' }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-sm text-gray-800">Pharmacy Alerts</span>
            <span className="text-xs text-gray-400">{count} active</span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {!alerts || count === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">All clear — no alerts</div>
            ) : (
              <div>
                {(alerts.low_stock || []).slice(0, 5).map(m => (
                  <button key={m.id} onClick={() => { navigate('/inventory'); setOpen(false) }}
                    className="w-full text-left px-4 py-2.5 hover:bg-amber-50 border-b border-gray-50 text-sm flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-800">{m.name}</div>
                      <div className="text-xs text-gray-400">Low stock: {m.stock_quantity} (reorder at {m.reorder_level})</div>
                    </div>
                  </button>
                ))}
                {(alerts.expiring_soon || []).slice(0, 5).map(b => (
                  <button key={b.id} onClick={() => { navigate('/reports'); setOpen(false) }}
                    className="w-full text-left px-4 py-2.5 hover:bg-orange-50 border-b border-gray-50 text-sm flex items-center gap-2">
                    <Clock size={14} className="text-orange-500 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-800">{b.medicine_name}</div>
                      <div className="text-xs text-gray-400">Expires {b.expiry_date} · Batch {b.batch_number || '—'} · Qty {b.quantity}</div>
                    </div>
                  </button>
                ))}
                {(alerts.expired || []).slice(0, 3).map(b => (
                  <button key={b.id} onClick={() => { navigate('/reports'); setOpen(false) }}
                    className="w-full text-left px-4 py-2.5 hover:bg-red-50 border-b border-gray-50 text-sm flex items-center gap-2">
                    <X size={14} className="text-red-500 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-red-700">{b.medicine_name}</div>
                      <div className="text-xs text-red-400">EXPIRED {b.expiry_date} · Qty {b.quantity}</div>
                    </div>
                  </button>
                ))}
                {(alerts.pending_pos || []).slice(0, 3).map(po => (
                  <button key={po.id} onClick={() => { navigate('/purchase-orders'); setOpen(false) }}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-gray-50 text-sm flex items-center gap-2">
                    <ShoppingCart size={14} className="text-blue-500 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-gray-800">{po.po_number}</div>
                      <div className="text-xs text-gray-400">Draft PO older than 3 days</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function Layout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  const sidebar = (
    <aside className="w-60 flex flex-col h-full flex-shrink-0" style={{ background: '#0F2557' }}>
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
        <div>
          <div className="text-white font-extrabold text-lg tracking-tight">BHaratCliniq</div>
          <div className="text-xs font-semibold mt-0.5 tracking-wider uppercase" style={{ color: '#F5821E' }}>
            Pharmacy Portal
          </div>
        </div>
        <div className="flex items-center gap-1">
          <AlertsBell />
          <button onClick={() => setOpen(false)} className="md:hidden text-white/60 hover:text-white">
            <X size={20} />
          </button>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            onClick={() => setOpen(false)}
            className={({ isActive }) => isActive ? 'sidebar-link-active' : 'sidebar-link'}>
            <Icon size={17} />{label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'rgba(245,130,30,0.25)', color: '#F5821E' }}
          >
            {getInitials(user?.full_name || user?.email)}
          </div>
          <div className="min-w-0">
            <div className="text-white text-xs font-semibold truncate">{user?.full_name || user?.email}</div>
            <div className="text-blue-300 text-xs">Pharmacist</div>
          </div>
        </div>
        <NavLink to="/account" end
          onClick={() => setOpen && setOpen(false)}
          className={({ isActive }) => isActive ? 'sidebar-link-active' : 'sidebar-link'}>
          <Settings size={17} />Account Settings
        </NavLink>
        <button onClick={logout} className="sidebar-link w-full"><LogOut size={15} />Sign Out</button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}
      <div className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebar}
      </div>
      <div className="hidden md:flex flex-shrink-0">
        {sidebar}
      </div>
      <main className="flex-1 overflow-y-auto">
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-30">
          <button onClick={() => setOpen(true)} className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100">
            <Menu size={22} />
          </button>
          <span className="font-bold text-sm" style={{ color: '#0F2557' }}>BHaratCliniq Pharmacy</span>
        </div>
        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
      <ChatWidget />
    </div>
  )
}
