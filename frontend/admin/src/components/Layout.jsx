import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Clock, Building2, ShieldCheck,
  ClipboardList, BarChart3, LogOut, Menu as MenuIcon, X, Search, CreditCard, Hospital,
  FileText, Users, Bell, RefreshCw, ChevronDown, PanelLeft, KeyRound, FileClock,
} from 'lucide-react'
import api from '../api/client'
import BrandLogo from './BrandLogo'
import { Tooltip } from './ui/Tooltip'
import { IconButton } from './ui/IconButton'
import { Menu, MenuItem, MenuSeparator } from './ui/Menu'
import ThemeToggle from './ThemeToggle'

const NAV = [
  { to: '/dashboard',         icon: LayoutDashboard, label: 'Platform Analytics' },
  { to: '/pending',           icon: Clock,           label: 'Pending Approvals' },
  { to: '/clinics',           icon: Building2,       label: 'Health Centers' },
  { to: '/subscriptions',     icon: CreditCard,      label: 'Subscriptions' },
  { to: '/staff',             icon: ShieldCheck,     label: 'Staff Verification' },
  { to: '/forms',             icon: FileText,        label: 'Assessment Forms' },
  { to: '/forms/audit',       icon: FileClock,       label: 'Form Audit Log' },
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
  '/forms/audit':       'Form Audit Log',
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
        className="relative p-1.5 rounded-lg text-dim hover:bg-white/10 flex items-center justify-center transition-colors"
        title="Feedback"
      >
        <Bell size={18} />
        {items.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-app text-[10px] font-bold flex items-center justify-center">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 surface border border-app rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-app flex items-center justify-between">
            <span className="text-app font-semibold text-sm">Unread Feedback</span>
            <span className="text-faint text-xs">{items.length} unread</span>
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-faint text-sm">No unread feedback</div>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-[color:var(--border)]">
              {items.map(item => {
                const tc = TYPE_COLORS[item.type] || TYPE_COLORS.general
                return (
                  <li key={item.id} className="px-4 py-3 hover:surface-2 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-medium text-app text-sm truncate">{item.name}</span>
                      <span className="text-faint text-xs whitespace-nowrap flex-shrink-0">{timeAgo(item.created_at)}</span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: tc.bg, color: tc.color }}>
                      {tc.label}
                    </span>
                    <p className="text-dim text-xs leading-relaxed mt-1.5 mb-2 line-clamp-2">
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

function ProfileDropdown({ user, logout, onChangePassword }) {
  const trigger = (
    <button className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ background: 'rgba(245,130,30,0.25)', color: '#F5821E' }}
      >
        {getInitials(user?.email || user?.full_name)}
      </div>
      <div className="hidden md:block text-left">
        <div className="text-xs font-semibold text-app leading-tight max-w-[120px] truncate">
          {user?.email || user?.full_name}
        </div>
        <div className="text-[11px] leading-tight" style={{ color: 'rgba(255,255,255,0.5)' }}>Super Admin</div>
      </div>
      <ChevronDown size={13} className="text-dim" />
    </button>
  )
  return (
    <Menu trigger={trigger} width={224}>
      <div className="px-3 py-2 border-b border-app mb-1">
        <div className="text-app text-sm font-semibold truncate">{user?.email || user?.full_name}</div>
        <div className="text-faint text-xs">Super Admin</div>
      </div>
      <MenuItem icon={KeyRound} onSelect={() => onChangePassword && onChangePassword()}>Change Password</MenuItem>
      <MenuSeparator />
      <MenuItem icon={LogOut} tone="danger" onSelect={logout}>Sign Out</MenuItem>
    </Menu>
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
              <button onClick={onClose} className="md:hidden text-app/50 hover:text-app p-1">
                <X size={18} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Nav — scrolls independently; collapsed items show a Radix tooltip */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <Tooltip key={to} label={collapsed ? label : null} side="right">
            <NavLink to={to}
              onClick={onClose}
              className={({ isActive }) => `${isActive ? 'sidebar-link-active' : 'sidebar-link'} ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon size={17} className="flex-shrink-0" />
              {!collapsed && <span className="flex-1 truncate">{label}</span>}
            </NavLink>
          </Tooltip>
        ))}
      </nav>
    </div>
  )
}

function ChangePasswordModal({ open, onClose }) {
  const [cur, setCur] = useState('')
  const [nw, setNw] = useState('')
  const [conf, setConf] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState(false)
  if (!open) return null

  const close = () => { setCur(''); setNw(''); setConf(''); setErr(''); setOk(false); onClose() }
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    if (nw.length < 8) { setErr('New password must be at least 8 characters.'); return }
    if (nw !== conf) { setErr('New passwords do not match.'); return }
    setSaving(true)
    try {
      await api.post('/auth/platform/change-password', { current_password: cur, new_password: nw })
      setOk(true)
    } catch (ex) { setErr(ex.message || 'Could not change password.') }
    finally { setSaving(false) }
  }

  const inputCls = 'w-full px-3 py-2 surface-2 border border-app rounded-lg text-app text-sm focus:outline-none focus:border-indigo-500'
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
      <div className="surface border border-app rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-app">Change Password</h3>
          <button onClick={close} className="text-faint hover:text-app"><X size={18} /></button>
        </div>
        {ok ? (
          <>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-emerald-300 text-sm mb-4">Password changed successfully.</div>
            <button onClick={close} className="btn-primary w-full justify-center text-sm">Done</button>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input className={inputCls} type={show ? 'text' : 'password'} placeholder="Current password" value={cur} onChange={e => setCur(e.target.value)} required autoFocus />
            <input className={inputCls} type={show ? 'text' : 'password'} placeholder="New password (min 8 chars)" value={nw} onChange={e => setNw(e.target.value)} required />
            <input className={inputCls} type={show ? 'text' : 'password'} placeholder="Confirm new password" value={conf} onChange={e => setConf(e.target.value)} required />
            <label className="flex items-center gap-2 text-xs text-dim select-none"><input type="checkbox" checked={show} onChange={e => setShow(e.target.checked)} />Show passwords</label>
            {err && <p className="text-red-400 text-xs">{err}</p>}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={close} className="btn-secondary flex-1 justify-center text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center text-sm">{saving ? 'Saving…' : 'Change Password'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [pwModal, setPwModal] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('admin_sidebar_collapsed') === '1' } catch { return false }
  })
  const toggleCollapsed = () => setCollapsed(c => {
    const next = !c
    try { localStorage.setItem('admin_sidebar_collapsed', next ? '1' : '0') } catch {}
    return next
  })
  // Draggable sidebar width (persisted), active only when expanded.
  const [navWidth, setNavWidth] = useState(() => {
    const w = parseInt(localStorage.getItem('admin_sidebar_width') || '', 10)
    return Number.isFinite(w) ? Math.min(320, Math.max(180, w)) : 208
  })
  const dragRef = useRef(null)
  const startResize = (e) => {
    e.preventDefault()
    const move = (ev) => {
      const x = ev.touches ? ev.touches[0].clientX : ev.clientX
      const w = Math.min(320, Math.max(180, x))
      setNavWidth(w)
    }
    const up = () => {
      try { localStorage.setItem('admin_sidebar_width', String(dragRef.current || navWidth)) } catch {}
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', up)
    }
    const track = (ev) => { dragRef.current = ev.touches ? ev.touches[0].clientX : ev.clientX; move(ev) }
    window.addEventListener('mousemove', track)
    window.addEventListener('mouseup', up)
    window.addEventListener('touchmove', track)
    window.addEventListener('touchend', up)
  }
  const { user, logout } = useAuth()
  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] || ''
  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="flex h-screen overflow-hidden app-bg">
      {/* Desktop sidebar — collapsible + draggable width */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 relative"
        style={{ width: collapsed ? 64 : navWidth, transition: 'width 120ms ease-out' }}
      >
        <SidebarContent collapsed={collapsed} />
        {!collapsed && (
          <div
            onMouseDown={startResize}
            onTouchStart={startResize}
            title="Drag to resize"
            className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-[#F5821E]/40 active:bg-[#F5821E]/60 transition-colors"
          />
        )}
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
        <header className="h-12 flex items-center gap-3 px-4 flex-shrink-0 z-30 border-b border-app" style={{ background: '#0F2557' }}>
          <span className="md:hidden">
            <IconButton icon={MenuIcon} label="Menu" size={20} onClick={() => setMobileOpen(true)} />
          </span>
          <span className="hidden md:inline-flex">
            <IconButton icon={PanelLeft} label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} size={20} onClick={toggleCollapsed} />
          </span>
          <div className="md:hidden">
            <BrandLogo size="sm" />
          </div>

          {pageTitle && (
            <h1 className="hidden md:block text-sm font-bold text-app truncate">{pageTitle}</h1>
          )}

          <div className="flex-1" />

          <span className="hidden md:block text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {todayLabel}
          </span>

          <IconButton icon={RefreshCw} label="Refresh" size={16} onClick={() => window.location.reload()} />
          <ThemeToggle />

          <FeedbackBell />
          <ProfileDropdown user={user} logout={logout} onChangePassword={() => setPwModal(true)} />
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-1.5 md:p-2">
            <Outlet />
          </div>
        </main>
      </div>

      <ChangePasswordModal open={pwModal} onClose={() => setPwModal(false)} />
    </div>
  )
}
