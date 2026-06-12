import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard, Calendar, Pill, FlaskConical, Receipt, LogOut,
  Menu, FileText, Smartphone, Video, Settings2, HelpCircle,
  RefreshCw, Copy, Check, ChevronDown, X
} from 'lucide-react'
import BrandLogo from '../BrandLogo'
import InstallPrompt, { useInstallState, InstallModal } from '../InstallPrompt'

const NAV = [
  { to: '/',              label: 'Dashboard',        icon: LayoutDashboard, end: true },
  { to: '/appointments',  label: 'Appointments',     icon: Calendar },
  { to: '/telehealth',    label: 'Telehealth',       icon: Video },
  { to: '/history',       label: 'Clinical History', icon: FileText },
  { to: '/prescriptions', label: 'Prescriptions',    icon: Pill },
  { to: '/lab-results',   label: 'Lab Results',      icon: FlaskConical },
  { to: '/bills',         label: 'Bills',            icon: Receipt },
]

function BHIDChip({ bhId }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(bhId?.toUpperCase() || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  if (!bhId) return null
  return (
    <button onClick={copy} title="Copy BH ID"
      className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors hover:bg-orange-100"
      style={{ background: '#FFF4E8', color: '#F5821E' }}>
      {bhId.toUpperCase()}
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  )
}

function AvatarMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'P'

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-gray-100 transition-colors">
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0"
          style={{ background: '#CC1414' }}>{initials}</div>
        <div className="hidden sm:block text-left">
          <div className="text-xs font-semibold text-gray-800 leading-tight max-w-[100px] truncate">{user?.full_name}</div>
          <div className="text-[10px] text-gray-400">{user?.mobile}</div>
        </div>
        <ChevronDown size={13} className={`text-gray-400 transition-transform hidden sm:block ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50">
          <div className="px-4 py-2.5 border-b border-gray-100">
            <div className="font-semibold text-gray-900 text-sm truncate">{user?.full_name}</div>
            <div className="text-xs text-gray-500 mt-0.5">{user?.mobile || user?.email}</div>
          </div>
          <button onClick={onLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors rounded-b-2xl">
            <LogOut size={14} />Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [installing, setInstalling] = useState(false)
  const { canInstall, isIos, installed, install } = useInstallState('BHarath Health')

  const currentLabel = NAV.find(n => {
    if (n.end) return location.pathname === n.to
    return location.pathname === n.to || location.pathname.startsWith(n.to + '/')
  })?.label || (location.pathname === '/settings' ? 'Settings' : 'Portal')

  const handleInstall = async () => {
    setInstalling(true)
    await install()
    setInstalling(false)
    setShowInstallModal(false)
  }

  const handleLogout = () => { logout(); navigate('/login') }

  const SidebarContent = ({ mobile = false }) => (
    <div className="flex flex-col h-full" style={{ background: '#0F2557' }}>
      <div className="px-4 py-4 flex items-center justify-between border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <BrandLogo size="sm" light />
        {mobile && (
          <button onClick={() => setMobileOpen(false)} className="p-1.5 text-white/50 hover:text-white">
            <X size={18} />
          </button>
        )}
      </div>
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => isActive ? 'sidebar-link-active' : 'sidebar-link'}>
            <item.icon size={17} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      {canInstall && !installed && (
        <div className="px-3 pb-3">
          <button onClick={() => setShowInstallModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold"
            style={{ background: 'rgba(245,130,30,0.15)', color: '#F5821E', border: '1px solid rgba(245,130,30,0.3)' }}>
            <Smartphone size={14} />
            {isIos ? 'Add to Home Screen' : 'Install App'}
          </button>
        </div>
      )}
      <div className="h-3" />
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F0F4F8' }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-52 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-56 flex flex-col"><SidebarContent mobile /></div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Right panel: header + content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Persistent top header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 lg:px-5 gap-3 flex-shrink-0 z-30">
          <button onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 flex-shrink-0">
            <Menu size={20} />
          </button>

          {/* Section title */}
          <span className="font-bold text-[15px] flex-1 min-w-0 truncate" style={{ color: '#0F2557' }}>
            {currentLabel}
          </span>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => window.location.reload()} title="Refresh page"
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
              <RefreshCw size={15} />
            </button>

            <BHIDChip bhId={user?.bh_id} />

            <a href="mailto:support@bharathhealthsystems.com?subject=Patient Portal Help"
              title="Help & Support"
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors">
              <HelpCircle size={15} />
            </a>

            <button onClick={() => navigate('/settings')} title="Settings"
              className="p-2 rounded-xl transition-colors"
              style={location.pathname === '/settings'
                ? { background: '#0F2557', color: 'white' }
                : { color: '#6b7280' }}
              onMouseEnter={e => { if (location.pathname !== '/settings') e.currentTarget.style.background = '#f3f4f6' }}
              onMouseLeave={e => { if (location.pathname !== '/settings') e.currentTarget.style.background = 'transparent' }}>
              <Settings2 size={15} />
            </button>

            <AvatarMenu user={user} onLogout={handleLogout} />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 lg:px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      <InstallPrompt appName="BHarath Health" />
      {showInstallModal && (
        <InstallModal appName="BHarath Health" isIos={isIos} installing={installing}
          onInstall={handleInstall} onClose={() => setShowInstallModal(false)} />
      )}
    </div>
  )
}
