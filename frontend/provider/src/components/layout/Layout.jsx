import { useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { Outlet } from 'react-router-dom'
import ChatWidget from '../ChatWidget'
import { cacheClear } from '../../utils/cache'

export default function Layout() {
  const [open, setOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = () => {
    cacheClear()
    setRefreshKey(k => k + 1)
  }

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
        <Sidebar />
      </div>

      <main className="flex-1 min-w-0 overflow-y-auto flex flex-col">
        <TopBar onMenuClick={() => setOpen(true)} onRefresh={handleRefresh} />
        <div key={refreshKey} className="p-3 md:p-5 flex-1">
          <Outlet />
        </div>
      </main>

      <ChatWidget />
    </div>
  )
}
