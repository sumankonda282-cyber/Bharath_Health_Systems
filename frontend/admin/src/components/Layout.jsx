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
  suggestion: { bg: '#EEF2FB', color: '#0F2557', label: 'Suggestion' },
  bug:        { bg: '#FEF2F2', color: '#DC2626', label: 'Bug' },
  general:    { bg: '#FFF4E8', color: '#E06D0A', label: 'General' },
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
        className="relative w-9 h-9 rounded-lg text-ink-soft hover:bg-slate-100 flex items-center justify-center transition-colors"
        title="Feedback"
      >
        <Bell size={18} />
        {items.length > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white border border-line rounded-2xl shadow-pop z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex items-center justify-between">
            <span className="text-ink font-semibold text-sm">Unread Feedback</span>
            <span className="text-ink-muted text-xs">{items.length} unread</span>
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-ink-muted text-sm">No unread feedback</div>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-line">
              {items.map(item => {
                const tc = TYPE_COLORS[item.type] || TYPE_COLORS.general
                return (
                  <li key={item.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="font-semibold text-ink text-sm truncate">{item.name}</span>
                      <span className="text-ink-muted text-xs whitespace-nowrap flex-shrink-0">{timeAgo(item.created_at)}</span>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: tc.bg, color: tc.color }}>
                      {tc.label}
                    </span>
                    <p className="text-ink-soft text-xs leading-relaxed mt-1.5 mb-2 line-clamp-2">
                      {item.message.length > 80 ? item.message.slice(0, 80) + '…' : item.message}
                    </p>
                    <button
                      onClick={() => markRead(item.id)}
                      className="text-xs text-navy-600 hover:text-navy-700 font-semibold"
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
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-100 transition-colors"
        title={user?.email}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: '#0F2557' }}
        >
          {getInitials(user?.email || user?.full_name)}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-xs font-semibold text-ink leading-tight max-w-[140px] truncate">
            {user?.email || user?.full_name}
          </div>
          <div className="text-[11px] leading-tight text-ink-muted">Super Admin</div>
        </div>
        <ChevronDown size={14} className="text-ink-muted" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-56 bg-white border border-line rounded-2xl shadow-pop z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-line">
            <div className="text-ink text-sm font-semibold truncate">{user?.email || user?.full_name}</div>
            <div className="text-ink-muted text-xs">Super Admin</div>
          </div>
          <div className="p-2">
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"
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
    <div className="flex flex-col h-full bg-white">
      {/* Brand header */}
      <div className={`flex items-center justify-between border-b border-line ${collapsed ? 'px-2 py-4 justify-center' : 'px-4 py-3.5'}`}>
        {collapsed ? (
          <BrandLogo size="sm" showText={false} tone="dark" />
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <BrandLogo size="sm" tone="dark" />
              <span className="text-[10px] font-bold tracking-widest uppercase pl-0.5" style={{ color: '#E06D0A' }}>
                Admin Console
              </span>
            </div>
            {onClose && (
              <button onClick={onClose} className="md:hidden text-ink-muted hover:text-ink p-1">
                <X size={18} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 overflow-y-auto">
        {!collapsed && <div className="eyebrow px-3 mb-1.5 mt-1">Platform</div>}
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            onClick={onClose}
            title={collapsed ? label : undefined}
            className={({ isActive }) => `${isActive ? 'sidebar-link-active' : 'sidebar-link'} ${collapsed ? 'justify-center !border-l-0' : ''}`}
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="flex-1 truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer note */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-line">
          <div className="text-[11px] text-ink-muted leading-relaxed">
            BHarath Health · Platform Control
          </div>
        </div>
      )}
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
    <div className="flex h-screen overflow-hidden bg-canvas">
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col ${collapsed ? 'w-[68px]' : 'w-60'} flex-shrink-0 border-r border-line shadow-rail transition-all duration-200`}>
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 flex flex-col border-r border-line shadow-pop">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </div>
          <div className="flex-1 bg-slate-900/40 backdrop-blur-[1px]" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="h-14 flex items-center gap-3 px-4 flex-shrink-0 z-30 bg-white border-b border-line shadow-xs">
          <button onClick={() => setMobileOpen(true)} className="md:hidden w-9 h-9 rounded-lg text-ink-soft hover:bg-slate-100 flex items-center justify-center">
            <Menu size={20} />
          </button>
          <button onClick={toggleCollapsed} className="hidden md:inline-flex w-9 h-9 rounded-lg text-ink-soft hover:bg-slate-100 items-center justify-center transition-colors" title="Toggle sidebar">
            <PanelLeft size={19} />
          </button>
          <div className="md:hidden">
            <BrandLogo size="sm" tone="dark" />
          </div>

          {pageTitle && (
            <h1 className="hidden md:block text-base font-bold text-ink tracking-tight truncate">{pageTitle}</h1>
          )}

          <div className="flex-1" />

          <span className="hidden md:block text-xs font-medium text-ink-muted mr-1">
            {todayLabel}
          </span>

          <button
            onClick={() => window.location.reload()}
            className="w-9 h-9 rounded-lg hover:bg-slate-100 transition-colors text-ink-soft flex items-center justify-center"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>

          <FeedbackBell />
          <div className="w-px h-6 bg-line mx-0.5" />
          <ProfileDropdown user={user} logout={logout} />
        </header>

        <main className="flex-1 overflow-y-auto">
          <div key={location.pathname} className="p-4 md:p-6 max-w-[1600px] mx-auto animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
