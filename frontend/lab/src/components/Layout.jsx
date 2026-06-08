import ChatWidget from './ChatWidget'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, FlaskConical, ClipboardList, Settings, LogOut, Beaker, ClipboardPen, CreditCard, BarChart2, Users, Menu, X, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const NAV = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sample',   icon: Beaker,          label: 'Sample Collection' },
  { to: '/results',  icon: ClipboardPen,    label: 'Enter Results' },
  { to: '/orders',   icon: FlaskConical,    label: 'All Orders' },
  { to: '/tests',    icon: ClipboardList,   label: 'Test Catalog' },
  { to: '/billing',  icon: CreditCard,      label: 'Billing' },
  { to: '/reports',  icon: BarChart2,       label: 'Reports' },
  { to: '/patients', icon: Users,           label: 'Patient History' },
]

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function Layout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const sidebar = (
    <aside className="w-60 flex flex-col h-full flex-shrink-0" style={{ background: '#0F2557' }}>
      <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <div className="font-extrabold text-base leading-tight" style={{ letterSpacing: '-0.01em' }}>
            <span style={{ color: '#CC1414' }}>BH</span>
            <span className="text-white">arath Health</span>
          </div>
          <div className="text-xs font-semibold mt-0.5 tracking-wider uppercase" style={{ color: '#F5821E' }}>
            Laboratory Portal
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="md:hidden text-white/60 hover:text-white p-1">
          <X size={18} />
        </button>
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
            <div className="text-blue-300 text-xs">{user?.role?.replace(/_/g, ' ') || 'Lab Staff'}</div>
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
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-30">
          <button onClick={() => setOpen(true)} className="md:hidden p-1.5 rounded-lg text-gray-600 hover:bg-gray-100">
            <Menu size={22} />
          </button>
          <span className="md:hidden font-extrabold text-sm"><span style={{ color: '#CC1414' }}>BH</span><span style={{ color: '#0F2557' }}>arath Health</span></span>
          <span className="md:hidden text-xs font-semibold ml-1" style={{ color: '#F5821E' }}>Lab</span>
          <div className="flex-1" />
          <button onClick={() => setRefreshKey(k => k + 1)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Refresh data">
            <RefreshCw size={16} />
          </button>
        </div>
        <div key={refreshKey} className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
      <ChatWidget />
    </div>
  )
}
