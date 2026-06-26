import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Clock, Building2, ShieldCheck,
  ClipboardList, BarChart3, LogOut, Menu, X, Search, CreditCard, Hospital,
  FileText, Users, Bell, RefreshCw, ChevronDown, PanelLeft,
} from 'lucide-react'
import api from '../api/client'
import BrandLogo from './BrandLogo'

const NAV = [
  { to: '/dashboard',         icon: LayoutDashboard, label: 'Platform Analytics' },
  { to: '/pending',           icon: Clock,           label: 'Pending Approvals' },
  { to: '/clinics',           icon: Building2,       label: 'Health Centers' },
  { to: '/subscriptions',     icon: CreditCard,      label: 'Subscriptions' },
  { to: '/staff',             icon: ShieldCheck,     label: 'Staff Verification' },
  { to: '/forms',             icon: FileText,        label: 'Assessment Forms' },
  { to: '/population',        icon: Users,           label: 'Population' },
  { to: '/audit',             icon: ClipboardList,   label: 'Activity Log' },
  { to: '/reports',           icon: BarChart3,       label: 'Analytics & Reports' },
  { to: '/patients',          icon: Search,          label: 'Patient Lookup' },
  { to: '/hospital-settings', icon: Hospital,        label: 'Hospital Setup' },
]

const PAGE_TITLES = {
  '/dashboard':         'Platform Analytics',
  '/pending':           'Pending Approvals',
  '/clinics':           'Health Centers',
  '/subscriptions':     'Subscriptions',
  '/staff':             'Staff Verification',
  '/forms':             'Assessment Forms',
  '/population':        'Population',
  '/audit':             'Activity Log',
  '/reports':           'Analytics & Reports',
  '/patients':          'Patient Lookup',
  '/hospital-settings': 'Hospital Setup',
}

function getInitials(email) {
  if (!email) return '?'
  return email.slice(0, 2).toUpperCase()
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const TYPE_COLORS = {
  suggestion: { bg: '#0F255715', color: '#93c5fd', label: 'Suggestion' },
  bug:        { bg: '#CC141415', color: '#f87171', label: 'Bug' },
  general:    { bg: '#F5821E15', color: '#F5821E', label: 'General' },
}

function FeedbackBell() {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const load = () => {
    api.get('/platform/feedback')
      .then(data => setItems(Array.isArray(data) ? data.slice(0, 10) : []))
      .catch(() => {})
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markRead = async (id) => {
    try {
      await api.post(`/platform/feedback/${id}/read`)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch { alert('Could not mark as read. Please retry.') }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-1.5 rounded-lg text-gray-400 hover:bg-white/10 flex items-center justify-center transition-colors"
        title="Feedback"
      >
        <Bell size={18} />
        {items.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-white font-semibold text-sm">Unread Feedback</span>
            <span className="text-gray-500 text-xs">{items.length} unread</span>
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">No unread feedback</div>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-gray-800">
              {items.map(item => {
                const tc = TYPE_COLORS[item.type] || TYPE_COLORS.general
                return (
                  <li key={item.id} className="px-4 py-3 hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-medium text-white text-sm truncate">{item.name}</span>
                      <span className="text-gray-500 text-xs whitespace-nowrap flex-shrink-0">{timeAgo(item.created_at)}</span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: tc.bg, color: tc.color }}>
                      {tc.label}
                    </span>
                    <p className="text-gray-400 text-xs leading-relaxed mt-1.5 mb-2 line-clamp-2">
                      {item.message.length > 80 ? item.message.slice(0, 80) + '…' : item.message}
                    </p>
                    <button
                      onClick={() => markRead(item.id)}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                    >
                      Mark Read
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function ProfileDropdown({ user, logout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-white/10 transition-colors"
        title={user?.email}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: 'rgba(245,130,30,0.25)', color: '#F5821E' }}
        >
          {getInitials(user?.email || user?.full_name)}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-xs font-semibold text-white leading-tight max-w-[120px] truncate">
            {user?.email || user?.full_name}
          </div>
          <div className="text-[11px] leading-tight" style={{ color: 'rgba(255,255,255,0.5)' }}>Super Admin</div>
        </div>
        <ChevronDown size={13} className="text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-56 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <div className="text-white text-sm font-semibold truncate">{user?.email || user?.full_name}</div>
            <div className="text-gray-500 text-xs">Super Admin</div>
          </div>
          <div className="p-2">
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 text-sm font-medium transition-colors"
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
      {/* Brand header */}
      <div className={`flex items-center justify-between border-b ${collapsed ? 'px-2 py-4 justify-center' : 'px-4 py-4'}`} style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {collapsed ? (
          <BrandLogo size="sm" showText={false} />
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <BrandLogo size="sm" />
              <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#F5821E' }}>
                Admin Portal
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

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            onClick={onClose}
            title={collapsed ? label : undefined}
            className={({ isActive }) => `${isActive ? 'sidebar-link-active' : 'sidebar-link'} ${collapsed ? 'justify-center' : ''}`}
          >
            <Icon size={17} className="flex-shrink-0" />
            {!collapsed && <span className="flex-1 truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('admin_sidebar_collapsed') === '1' } catch { return false }
  })
  const toggleCollapsed = () => setCollapsed(c => {
    const next = !c
    try { localStorage.setItem('admin_sidebar_collapsed', next ? '1' : '0') } catch {}
    return next
  })
  const { user, logout } = useAuth()
  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] || ''
  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0f1e]">
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col ${collapsed ? 'w-16' : 'w-52'} flex-shrink-0 transition-all duration-200`}>
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-52 flex flex-col">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
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

          <FeedbackBell />
          <ProfileDropdown user={user} logout={logout} />
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-1.5 md:p-2">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
