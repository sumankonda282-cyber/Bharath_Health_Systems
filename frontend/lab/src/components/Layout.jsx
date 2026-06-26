import ChatWidget from './ChatWidget'
import BrandLogo from './BrandLogo'
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, FlaskConical, ClipboardList, LogOut, Beaker, ClipboardPen, CreditCard, BarChart2, Users, Menu, X, PanelLeft, RefreshCw } from 'lucide-react'
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
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('lab_sidebar_collapsed') === '1' } catch { return false }
  })
  const toggleCollapsed = () => setCollapsed(c => {
    const next = !c
    try { localStorage.setItem('lab_sidebar_collapsed', next ? '1' : '0') } catch {}
    return next
  })

  const pageTitle = NAV.find(n => n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to))?.label || 'Laboratory'
  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  const renderSidebar = (isCollapsed = false) => (
    <aside className={`${isCollapsed ? 'w-16' : 'w-60'} flex flex-col h-full flex-shrink-0 transition-all duration-200`} style={{ background: '#0F2557' }}>
      <div className={`border-b border-white/10 flex items-center ${isCollapsed ? 'px-2 py-5 justify-center' : 'px-5 py-5 justify-between'}`}>
        {isCollapsed ? (
          <BrandLogo size="sm" light showText={false} />
        ) : (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <BrandLogo size="sm" light />
              <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#F5821E' }}>Laboratory</span>
            </div>
            <button onClick={() => setOpen(false)} className="md:hidden text-white/60 hover:text-white flex-shrink-0">
              <X size={20} />
            </button>
          </>
        )}
      </div>
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            onClick={() => setOpen(false)}
            title={isCollapsed ? label : undefined}
            className={({ isActive }) => `${isActive ? 'sidebar-link-active' : 'sidebar-link'} ${isCollapsed ? 'justify-center' : ''}`}>
            <Icon size={17} className="flex-shrink-0" />{!isCollapsed && label}
          </NavLink>
        ))}
      </nav>
      <div className={`border-t border-white/10 ${isCollapsed ? 'px-2 py-4' : 'px-3 py-4'}`}>
        {!isCollapsed && (
          <div className="flex items-center gap-3 px-2 mb-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: 'rgba(245,130,30,0.25)', color: '#F5821E' }}
            >
              {getInitials(user?.full_name || user?.email)}
            </div>
            <div className="min-w-0">
              <div className="text-white text-xs font-semibold truncate">{user?.full_name || user?.email}</div>
              <div className="text-blue-300 text-xs">Lab Technician</div>
            </div>
          </div>
        )}
        <button onClick={logout} title={isCollapsed ? 'Sign Out' : undefined}
          className={`sidebar-link w-full ${isCollapsed ? 'justify-center' : ''}`}>
          <LogOut size={15} className="flex-shrink-0" />{!isCollapsed && 'Sign Out'}
        </button>
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
        {renderSidebar(false)}
      </div>
      <div className="hidden md:flex flex-shrink-0">
        {renderSidebar(collapsed)}
      </div>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 flex items-center gap-3 px-4 flex-shrink-0 z-30 sticky top-0" style={{ background: '#0F2557' }}>
          <button onClick={() => setOpen(true)} className="md:hidden p-1.5 rounded-lg text-white/70 hover:bg-white/10">
            <Menu size={20} />
          </button>
          <button onClick={toggleCollapsed} className="hidden md:inline-flex p-1.5 rounded-lg text-white/70 hover:bg-white/10 transition-colors" title="Toggle sidebar">
            <PanelLeft size={20} />
          </button>
          <div className="md:hidden"><BrandLogo size="sm" light /></div>
          {pageTitle && <h1 className="hidden md:block text-sm font-bold text-white truncate">{pageTitle}</h1>}
          <div className="flex-1" />
          <span className="hidden md:block text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{todayLabel}</span>
          <button onClick={() => window.location.reload()} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60" title="Refresh">
            <RefreshCw size={16} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">
          <div className="p-1.5 md:p-2">
            <Outlet />
          </div>
        </div>
      </main>
      <ChatWidget />
    </div>
  )
}
