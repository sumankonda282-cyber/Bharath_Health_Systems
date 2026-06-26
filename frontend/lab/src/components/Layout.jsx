import ChatWidget from './ChatWidget'
import BrandLogo from './BrandLogo'
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, FlaskConical, ClipboardList, Beaker, ClipboardPen, CreditCard, BarChart2, Users, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/client'
import PortalTopBar from '@shared/components/PortalTopBar'

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

  const renderSidebar = (isCollapsed = false) => (
    <aside className={`${isCollapsed ? 'w-16' : 'w-56'} flex flex-col h-full flex-shrink-0 transition-all duration-200`} style={{ background: '#0F2557' }}>
      <div className={`border-b border-white/10 flex items-center ${isCollapsed ? 'px-2 py-4 justify-center' : 'px-4 py-3.5 justify-between'}`}>
        {isCollapsed ? (
          <BrandLogo size="sm" light showText={false} />
        ) : (
          <>
            <div className="flex flex-col gap-1 min-w-0">
              <BrandLogo size="sm" light />
              <span className="text-[10px] font-bold tracking-widest uppercase pl-0.5" style={{ color: '#F5821E' }}>Laboratory</span>
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
            <Icon size={16} className="flex-shrink-0" />{!isCollapsed && label}
          </NavLink>
        ))}
      </nav>
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
        <PortalTopBar
          user={user} onLogout={logout} api={api}
          pageTitle={pageTitle} portalSource="Laboratory"
          onToggleSidebar={toggleCollapsed} onMenuClick={() => setOpen(true)}
        />
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
