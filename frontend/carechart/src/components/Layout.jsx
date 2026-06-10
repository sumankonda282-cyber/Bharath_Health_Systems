import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, BedDouble, ArrowLeftRight,
  PackageOpen, LayoutTemplate, RefreshCw, Menu, X
} from 'lucide-react'
import TopRibbon from './TopRibbon'
import ChatWidget from './ChatWidget'
import HelpWidget from './HelpWidget'

const NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard',    end: true },
  { to: '/patients',   icon: Users,           label: 'Patients'              },
  { to: '/ward-board', icon: BedDouble,       label: 'Ward Board'            },
  { to: '/handoff',    icon: ArrowLeftRight,  label: 'Shift Handoff'         },
  { to: '/discharge',  icon: PackageOpen,     label: 'Discharge'             },
  { to: '/templates',  icon: LayoutTemplate,  label: 'Asmt Forms'            },
]

export default function Layout() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Collapse sidebar to icon-only when inside a patient chart
  const inChart = location.pathname.startsWith('/patient/')

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      <TopRibbon onRefresh={() => setRefreshKey(k => k + 1)} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Mobile overlay */}
        {mobileOpen && !inChart && (
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
            <div className="absolute inset-0 bg-black/50" />
          </div>
        )}

        {/* Desktop sidebar */}
        <aside
          className={`hidden md:flex flex-col flex-shrink-0 transition-all duration-200 overflow-hidden`}
          style={{ width: inChart ? 48 : 220, background: '#065F46' }}>
          <nav className="flex flex-col flex-1 py-2 gap-0.5">
            {NAV.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={inChart ? label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 mx-1.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-white/15 text-white'
                    : 'text-emerald-100/60 hover:bg-white/10 hover:text-white'}
                  ${inChart ? 'justify-center' : ''}`
                }>
                <Icon size={18} className="flex-shrink-0" />
                {!inChart && <span className="truncate">{label}</span>}
              </NavLink>
            ))}
          </nav>

          {!inChart && (
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              className="flex items-center gap-3 mx-1.5 mb-2 px-2 py-2 rounded-lg text-emerald-100/40 hover:text-white hover:bg-white/10 transition-colors text-sm">
              <RefreshCw size={16} className="flex-shrink-0" />
              <span>Refresh</span>
            </button>
          )}
        </aside>

        {/* Mobile sidebar (drawer) */}
        {!inChart && (
          <div className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <aside className="h-full w-56 flex flex-col py-2 gap-0.5" style={{ background: '#065F46' }}>
              <button onClick={() => setMobileOpen(false)}
                className="flex items-center justify-end px-3 py-2 text-white/50 hover:text-white">
                <X size={18} />
              </button>
              {NAV.map(({ to, icon: Icon, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 mx-1.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isActive ? 'bg-white/15 text-white' : 'text-emerald-100/60 hover:bg-white/10 hover:text-white'}`
                  }>
                  <Icon size={18} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {/* Mobile topbar (when not in chart) */}
          {!inChart && (
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 bg-white sticky top-0 z-30 md:hidden">
              <button onClick={() => setMobileOpen(v => !v)} className="text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg">
                <Menu size={20} />
              </button>
              <div className="flex-1" />
              <button onClick={() => setRefreshKey(k => k + 1)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
                <RefreshCw size={16} />
              </button>
            </div>
          )}

          <div key={refreshKey} className={inChart ? 'h-full flex flex-col' : 'p-4 md:p-6 max-w-screen-xl'}>
            <Outlet />
          </div>
        </main>
      </div>

      <ChatWidget />
      <HelpWidget />
    </div>
  )
}
