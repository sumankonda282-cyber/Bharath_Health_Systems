import ChatWidget from './ChatWidget'
import BrandLogo from './BrandLogo'
import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList, ShoppingCart, History,
  Package, PackagePlus, Layers, BookOpen,
  CreditCard, BookMarked, Calculator,
  Truck, Building2, RotateCcw, Wallet,
  ReceiptText, BarChart3, Tag,
  LogOut, Menu, X, Bell, AlertTriangle, Clock, RefreshCw, ChevronDown, PanelLeft,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/client'

const NAV_GROUPS = [
  {
    label: 'Dispensing',
    items: [
      { to: '/cpoe',       icon: ClipboardList, label: 'CPOE Queue' },
      { to: '/cart',       icon: ShoppingCart,  label: 'Prepared Cart' },
      { to: '/rx-history', icon: History,        label: 'Rx History' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { to: '/inventory',         icon: Package,    label: 'Stock Overview' },
      { to: '/stock-in',          icon: PackagePlus, label: 'Receive Stock' },
      { to: '/stock-adjustments', icon: Layers,     label: 'Stock Adjustments' },
      { to: '/drug-register',     icon: BookOpen,   label: 'Drug Register' },
    ],
  },
  {
    label: 'Billing & Accounts',
    items: [
      { to: '/counter-sales',  icon: CreditCard,  label: 'Counter Sales' },
      { to: '/credit',         icon: BookMarked,  label: 'Credit Accounts' },
      { to: '/reconciliation', icon: Calculator,  label: 'Day-end Recon' },
    ],
  },
  {
    label: 'Procurement',
    items: [
      { to: '/purchase-orders',   icon: Truck,      label: 'Purchase Orders' },
      { to: '/suppliers',         icon: Building2,  label: 'Suppliers' },
      { to: '/supplier-returns',  icon: RotateCcw,  label: 'Supplier Returns' },
      { to: '/supplier-payments', icon: Wallet,     label: 'Supplier Payments' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { to: '/gst-report',      icon: ReceiptText, label: 'GST / GSTR-1' },
      { to: '/reports',         icon: BarChart3,   label: 'P&L & Reports' },
      { to: '/discount-schemes',icon: Tag,         label: 'Discount Schemes' },
    ],
  },
]

const PAGE_TITLES = {
  '/dashboard':         'Dashboard',
  '/cpoe':              'CPOE Queue',
  '/cart':              'Prepared Cart',
  '/rx-history':        'Rx History',
  '/inventory':         'Stock Overview',
  '/stock-in':          'Receive Stock',
  '/stock-adjustments': 'Stock Adjustments',
  '/drug-register':     'Drug Register',
  '/counter-sales':     'Counter Sales',
  '/credit':            'Credit Accounts',
  '/reconciliation':    'Day-end Reconciliation',
  '/purchase-orders':   'Purchase Orders',
  '/suppliers':         'Suppliers',
  '/supplier-returns':  'Supplier Returns',
  '/supplier-payments': 'Supplier Payments',
  '/gst-report':        'GST / GSTR-1',
  '/reports':           'P&L & Reports',
  '/discount-schemes':  'Discount Schemes',
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function AlertsBell() {
  const [alerts, setAlerts] = useState(null)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  const load = () => {
    api.get('/pharmacy/alerts').then(r => setAlerts(r)).catch(() => {})
  }
  useEffect(() => {
    load()
    const t = setInterval(load, 120000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const count = alerts?.total_count || 0

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-1.5 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
        title="Alerts"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-white font-semibold text-sm">Pharmacy Alerts</span>
            <span className="text-gray-500 text-xs">{count} active</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!alerts || count === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">All clear — no alerts</div>
            ) : (
              <>
                {(alerts.low_stock || []).slice(0, 5).map(m => (
                  <button key={m.id} onClick={() => { navigate('/inventory'); setOpen(false) }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-800/50 border-b border-gray-800 text-sm flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-white">{m.name}</div>
                      <div className="text-xs text-gray-400">Low stock: {m.stock_quantity} (reorder at {m.reorder_level})</div>
                    </div>
                  </button>
                ))}
                {(alerts.expiring_soon || []).slice(0, 5).map(b => (
                  <button key={b.id} onClick={() => { navigate('/reports'); setOpen(false) }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-800/50 border-b border-gray-800 text-sm flex items-center gap-2">
                    <Clock size={14} className="text-orange-400 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-white">{b.medicine_name}</div>
                      <div className="text-xs text-gray-400">Expires {b.expiry_date} · Qty {b.quantity}</div>
                    </div>
                  </button>
                ))}
                {(alerts.expired || []).slice(0, 3).map(b => (
                  <button key={b.id} onClick={() => { navigate('/reports'); setOpen(false) }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-800/50 border-b border-gray-800 text-sm flex items-center gap-2">
                    <X size={14} className="text-red-400 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-red-400">{b.medicine_name}</div>
                      <div className="text-xs text-gray-500">EXPIRED {b.expiry_date} · Qty {b.quantity}</div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ProfileDropdown({ user, logout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-white/10 transition-colors"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: 'rgba(245,130,30,0.25)', color: '#F5821E' }}
        >
          {getInitials(user?.full_name || user?.email)}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-xs font-semibold text-white leading-tight max-w-[120px] truncate">
            {user?.full_name || user?.email}
          </div>
          <div className="text-[11px] leading-tight capitalize" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {user?.role || 'Pharmacist'}
          </div>
        </div>
        <ChevronDown size={13} className="text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-52 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <div className="text-white text-sm font-semibold truncate">{user?.full_name || user?.email}</div>
            <div className="text-gray-500 text-xs capitalize">{user?.role || 'Pharmacist'}</div>
          </div>
          <div className="p-2">
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors"
            >
              <LogOut size={15} />Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SidebarContent({ onClose, collapsed = false }) {
  return (
    <div className="flex flex-col h-full" style={{ background: '#0F2557' }}>
      <div className={`flex items-center justify-between border-b ${collapsed ? 'px-2 py-4 justify-center' : 'px-4 py-4'}`} style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {collapsed ? (
          <BrandLogo size="sm" showText={false} />
        ) : (
          <>
            <div className="flex flex-col gap-0.5">
              <BrandLogo size="sm" />
              <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#F5821E' }}>
                Pharmacy Portal
              </span>
            </div>
            {onClose && (
              <button onClick={onClose} className="md:hidden text-white/50 hover:text-white p-1">
                <X size={18} />
              </button>
            )}
          </>
        )}
      </div>

      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        <NavLink
          to="/dashboard"
          onClick={onClose}
          title={collapsed ? 'Dashboard' : undefined}
          className={({ isActive }) => `${isActive ? 'sidebar-link-active font-semibold' : 'sidebar-link font-medium'} flex items-center gap-3 px-3 py-2 rounded-xl text-sm mb-1 ${collapsed ? 'justify-center' : ''}`}
        >
          <LayoutDashboard size={17} className="flex-shrink-0" />{!collapsed && 'Dashboard'}
        </NavLink>

        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            {collapsed
              ? <div className="my-2 mx-2 border-t border-white/10" />
              : <div className="nav-section-label">{group.label}</div>}
            {group.items.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to}
                onClick={onClose}
                title={collapsed ? label : undefined}
                className={({ isActive }) => `${isActive ? 'sidebar-link-active' : 'sidebar-link'} ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon size={16} className="flex-shrink-0" />
                {!collapsed && <span className="flex-1 truncate">{label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </div>
  )
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('pharmacy_sidebar_collapsed') === '1' } catch { return false }
  })
  const toggleCollapsed = () => setCollapsed(c => {
    const next = !c
    try { localStorage.setItem('pharmacy_sidebar_collapsed', next ? '1' : '0') } catch {}
    return next
  })
  const { user, logout } = useAuth()
  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] || 'Pharmacy'
  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="flex h-screen overflow-hidden bg-[#F0F4F8]">
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col ${collapsed ? 'w-16' : 'w-56'} flex-shrink-0 transition-all duration-200`}>
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-56 flex flex-col">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="h-12 flex items-center gap-3 px-4 flex-shrink-0 z-30 border-b border-gray-800/60" style={{ background: '#0F2557' }}>
          <button onClick={() => setMobileOpen(true)} className="md:hidden p-1.5 rounded-lg text-white/70 hover:bg-white/10">
            <Menu size={20} />
          </button>
          <button onClick={toggleCollapsed} className="hidden md:inline-flex p-1.5 rounded-lg text-white/70 hover:bg-white/10 transition-colors" title="Toggle sidebar">
            <PanelLeft size={20} />
          </button>
          <div className="md:hidden">
            <BrandLogo size="sm" />
          </div>

          {pageTitle && (
            <h1 className="hidden md:block text-sm font-bold text-white truncate">{pageTitle}</h1>
          )}

          <div className="flex-1" />

          <span className="hidden md:block text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {todayLabel}
          </span>

          <button
            onClick={() => window.location.reload()}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>

          <AlertsBell />
          <ProfileDropdown user={user} logout={logout} />
        </header>

        <main className="flex-1 overflow-y-auto bg-[#F0F4F8]">
          <div className="p-1.5 md:p-2">
            <Outlet />
          </div>
        </main>
      </div>

      <ChatWidget />
    </div>
  )
}
