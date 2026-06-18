import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Clock, Building2, ShieldCheck,
  ClipboardList, BarChart3, LogOut, Menu, X, Search, CreditCard, Hospital,
  FileText, Users, Bell, RefreshCw, PlusCircle, ChevronDown, ChevronLeft
} from 'lucide-react'
import api from '../api/client'
import BrandLogo from './BrandLogo'

const NAV = [
  { to: '/dashboard',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pending',           icon: Clock,           label: 'Pending Approvals' },
  { to: '/clinics',           icon: Building2,       label: 'All Health Centers' },
  { to: '/subscriptions',     icon: CreditCard,      label: 'Subscriptions' },
  { to: '/staff',             icon: ShieldCheck,     label: 'Staff Verification' },
  { to: '/forms',             icon: FileText,        label: 'Assessment Forms' },
  { to: '/population',        icon: Users,           label: 'Population' },
  { to: '/audit',             icon: ClipboardList,   label: 'Audit Log' },
  { to: '/reports',           icon: BarChart3,       label: 'Reports' },
  { to: '/bhid',              icon: Search,          label: 'BH ID Lookup' },
  { to: '/hospital-settings', icon: Hospital,        label: 'Hospital Setup' },
]

const PAGE_TITLES = {
  '/dashboard':         'Dashboard',
  '/pending':           'Pending Approvals',
  '/clinics':           'All Health Centers',
  '/subscriptions':     'Subscriptions',
  '/staff':             'Staff Verification',
  '/forms':             'Assessment Forms',
  '/population':        'Population',
  '/audit':             'Audit Log',
  '/reports':           'Reports',
  '/bhid':              'BH ID Lookup',
  '/hospital-settings': 'Hospital Setup',
}

function getInitials(email) {
  if (!email) return '?'
  return email.slice(0, 2).toUpperCase()
}

function Sidebar({ onClose, expanded = true, onToggle }) {
  return (
    <aside className={`flex flex-col h-full bg-gray-900 border-r border-gray-800 overflow-hidden transition-[width] duration-200 ease-in-out flex-shrink-0 ${expanded ? 'w-56' : 'w-11'}`}>
      <div className={`border-b border-gray-800 flex items-center overflow-hidden transition-all duration-200 ${expanded ? 'px-4 py-4 justify-between' : 'px-2 py-4 justify-center'}`}>
        {expanded ? (
          <div>
            <BrandLogo size="sm" />
            <div className="text-xs font-bold mt-1.5 tracking-widest uppercase" style={{ color: '#F5821E' }}>
              Super Admin
            </div>
          </div>
        ) : (
          <button
            onClick={onToggle}
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 hover:opacity-75 transition-opacity"
            style={{ background: 'rgba(245,130,30,0.15)' }}
            title="Expand sidebar"
          >
            <span className="text-[9px] font-black" style={{ color: '#F5821E' }}>BC</span>
          </button>
        )}
        {onClose && expanded && (
          <button onClick={onClose} className="md:hidden text-gray-500 hover:text-white">
            <X size={20} />
          </button>
        )}
        {!onClose && onToggle && expanded && (
          <button onClick={onToggle} className="text-gray-500 hover:text-white transition-colors" title="Collapse sidebar">
            <ChevronLeft size={18} />
          </button>
        )}
      </div>
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden space-y-0.5 px-1.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            onClick={onClose}
            title={!expanded ? label : undefined}
            className={({ isActive }) =>
              `flex items-center rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${expanded ? 'gap-2.5 px-2.5 py-2' : 'justify-center p-2.5'} ${isActive ? 'bg-[#F5821E]/15 text-[#F5821E]' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`
            }
          >
            <Icon size={16} className="flex-shrink-0" />
            {expanded && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const TYPE_COLORS = {
  suggestion: { bg: '#0F255715', color: '#0F2557', label: 'Suggestion' },
  bug:        { bg: '#CC141415', color: '#CC1414', label: 'Bug' },
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
    } catch {}
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-1.5 rounded-lg text-gray-400 hover:bg-gray-800 flex items-center justify-center"
        title="Feedback"
      >
        <Bell size={20} />
        {items.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
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
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: tc.bg, color: tc.color }}>
                        {tc.label}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed mb-2 line-clamp-2">
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

function ProfileDropdown() {
  const { user, logout } = useAuth()
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
        className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-gray-800 transition-colors"
        title={user?.email}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ background: 'rgba(245,130,30,0.2)', color: '#F5821E' }}
        >
          {getInitials(user?.email || user?.full_name)}
        </div>
        <ChevronDown size={14} className="text-gray-500" />
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

export default function Layout() {
  const [open, setOpen] = useState(false)
  const [sidebarPinned, setSidebarPinned] = useState(false)
  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] || ''

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
        </div>
      )}
      <div className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setOpen(false)} expanded={true} />
      </div>
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar expanded={sidebarPinned} onToggle={() => setSidebarPinned(v => !v)} />
      </div>
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900 sticky top-0 z-30">
          <button onClick={() => setOpen(true)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800">
            <Menu size={22} />
          </button>
          <div className="flex-1 min-w-0">
            {pageTitle
              ? <span className="text-white font-semibold text-sm truncate">{pageTitle}</span>
              : <BrandLogo size="sm" />
            }
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => window.location.reload()} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800" title="Refresh">
              <RefreshCw size={18} />
            </button>
            <FeedbackBell />
            <ProfileDropdown />
          </div>
        </div>
        {/* Desktop header */}
        <div className="hidden md:flex items-center gap-3 px-6 py-2 border-b border-gray-800 bg-gray-900 sticky top-0 z-30 min-h-[52px]">
          <span className="text-white font-bold text-base flex-1">{pageTitle}</span>
          <a
            href="https://bharathhealthsystems.com/register"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: 'rgba(245,130,30,0.15)', border: '1px solid rgba(245,130,30,0.3)', color: '#F5821E' }}
            title="Register Health Center"
          >
            <PlusCircle size={14} />
            <span className="hidden lg:inline">Register</span>
          </a>
          <button onClick={() => window.location.reload()} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-800" title="Refresh">
            <RefreshCw size={18} />
          </button>
          <FeedbackBell />
          <ProfileDropdown />
        </div>
        <div className="p-2">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
