import { useState } from 'react'
import { NavLink, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { LayoutDashboard, Calendar, Pill, FlaskConical, Receipt, LogOut, Menu, X, Clock } from 'lucide-react'
import BrandLogo from '../BrandLogo'
import InstallPrompt from '../InstallPrompt'

const NAV = [
  { to: '/',              label: 'Dashboard',    icon: LayoutDashboard, end: true },
  { to: '/appointments',  label: 'Appointments', icon: Calendar },
  { to: '/prescriptions', label: 'Prescriptions',icon: Pill },
  { to: '/lab-results',   label: 'Lab Results',  icon: FlaskConical },
  { to: '/bills',         label: 'Bills',        icon: Receipt },
  { to: '/timeline',      label: 'Timeline',     icon: Clock },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'P'

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: '#0F2557' }}>
      {/* Logo */}
      <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <BrandLogo size="sm" />
        <div className="text-xs font-semibold mt-1.5 tracking-widest uppercase" style={{ color: '#F5821E' }}>
          Patient Portal
        </div>
      </div>

      {/* User card */}
      {user && (
        <div className="mx-3 mt-4 mb-2 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
              style={{ background: '#CC1414' }}>
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-white text-sm font-semibold truncate">{user.full_name}</div>
              <div className="text-xs truncate" style={{ color: '#93c5fd' }}>{user.mobile || user.email}</div>
            </div>
          </div>
          {user.bh_id && (
            <div className="mt-2 text-xs font-mono" style={{ color: '#F5821E' }}>
              BHID: {user.bh_id.toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => isActive ? 'sidebar-link-active' : 'sidebar-link'}
          >
            <item.icon size={17} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <button onClick={handleLogout}
          className="flex items-center gap-2 text-xs font-medium transition-colors w-full px-3 py-2 rounded-xl hover:bg-white/10"
          style={{ color: '#93c5fd' }}
          onMouseEnter={e => e.currentTarget.style.color = '#fca5a5'}
          onMouseLeave={e => e.currentTarget.style.color = '#93c5fd'}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F0F4F8' }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-60 flex flex-col">
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100">
            <Menu size={20} />
          </button>
          <BrandLogo size="sm" />
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white"
            style={{ background: '#CC1414' }}>
            {initials}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
      <InstallPrompt appName="BH Health" />
    </div>
  )
}
