import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { Outlet } from 'react-router-dom'
import ChatWidget from '../ChatWidget'
import TelehealthWidget from '../TelehealthWidget'
import CriticalResultsBanner from '../CriticalResultsBanner'
import { cacheClear } from '../../utils/cache'

const FULL_PAGE_PREFIXES = ['/inpatient/admission/', '/opd/']

export default function Layout() {
  const [open, setOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('provider_sidebar_collapsed') === '1' } catch { return false }
  })
  const location = useLocation()

  const handleRefresh = () => {
    cacheClear()
    setRefreshKey(k => k + 1)
  }

  const toggleCollapsed = () => setCollapsed(c => {
    const next = !c
    try { localStorage.setItem('provider_sidebar_collapsed', next ? '1' : '0') } catch {}
    return next
  })

  const isFullPage = FULL_PAGE_PREFIXES.some(p => location.pathname.startsWith(p))

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F0F4F8' }}>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}

      {/* Mobile sidebar (drawer) */}
      <div className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setOpen(false)} />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:block flex-shrink-0">
        <Sidebar collapsed={collapsed} />
      </div>

      <main className={`flex-1 min-w-0 flex flex-col ${isFullPage ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <TopBar onMenuClick={() => setOpen(true)} onToggleSidebar={toggleCollapsed} onRefresh={handleRefresh} />
        <CriticalResultsBanner />
        {/* Tight shell gutters per the page standard: ≤2px between shell and content
            on top/sides, ~5px at the bottom. Pages keep their own inner padding. */}
        <div key={refreshKey} className={`flex-1 ${isFullPage ? 'overflow-hidden' : 'pt-0.5 px-0.5 pb-[5px]'}`}>
          <Outlet />
        </div>
      </main>

      <ChatWidget />
      <TelehealthWidget />
    </div>
  )
}
