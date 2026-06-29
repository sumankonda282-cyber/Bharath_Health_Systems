import { useState, useRef, useEffect } from 'react'
import { Menu, PanelLeft, RefreshCw, HelpCircle, ChevronDown, LogOut, User, CreditCard } from 'lucide-react'
import NotificationBell from './NotificationBell'
import HelpWidget from './HelpWidget'
import ProfilePanel from './ProfilePanel'

/**
 * Shared portal top bar — uniform across all staff/service portals.
 * Left:  sidebar-collapse toggle + page title (beside the collapser).
 * Right: refresh · notifications · help & support · profile dropdown (sign out inside).
 * Fully prop-driven (no portal-specific imports) so every portal renders the same chrome.
 *
 * Props: user, onLogout, api, pageTitle, roleLabel?, portalSource?,
 *        onToggleSidebar, onMenuClick, onRefresh?, notifications?
 */
const NAVY = '#0F2557'

function initialsOf(user) {
  const s = user?.full_name || user?.email || ''
  if (!s) return 'U'
  const parts = s.split(' ').filter(Boolean)
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : s.slice(0, 2)).toUpperCase()
}

export default function PortalTopBar({
  user, onLogout, api, pageTitle = '', roleLabel, portalSource = 'Portal',
  onToggleSidebar, onMenuClick, onRefresh, notifications = [],
  rightExtra = null, showBell = true,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileTab, setProfileTab] = useState('personal')
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const role = roleLabel || (user?.role ? String(user.role).replace(/_/g, ' ') : 'Staff')
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const handleRefresh = onRefresh || (() => window.location.reload())

  return (
    <header className="h-14 flex items-center gap-3 px-4 flex-shrink-0 z-30 sticky top-0 border-b"
      style={{ background: NAVY, borderColor: 'rgba(255,255,255,0.08)' }}>
      {/* Left: collapse / menu + page title */}
      <button onClick={onMenuClick}
        className="md:hidden p-1.5 rounded-lg text-white/70 hover:bg-white/10">
        <Menu size={20} />
      </button>
      <button onClick={onToggleSidebar}
        className="hidden md:inline-flex p-1.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        title="Toggle sidebar">
        <PanelLeft size={20} />
      </button>
      {pageTitle && <h1 className="text-base md:text-lg font-bold text-white truncate">{pageTitle}</h1>}

      <div className="flex-1" />

      {/* Right: date · refresh · bell · help · profile */}
      <span className="hidden lg:block text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{today}</span>

      <button onClick={handleRefresh}
        className="p-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        title="Refresh page data">
        <RefreshCw size={17} />
      </button>

      {rightExtra}
      {showBell && <NotificationBell items={notifications} />}

      <button onClick={() => setHelpOpen(true)}
        className="p-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        title="Help & Support">
        <HelpCircle size={18} />
      </button>
      <HelpWidget open={helpOpen} onClose={() => setHelpOpen(false)} api={api} user={user} portalSource={portalSource} />

      {/* Profile dropdown — sign out lives inside */}
      <div className="relative" ref={ref}>
        <button onClick={() => setMenuOpen(o => !o)}
          className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl hover:bg-white/10 transition-colors">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: '#F5821E' }}>
            {initialsOf(user)}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-white leading-tight max-w-[140px] truncate">{user?.full_name || user?.email}</div>
            <div className="text-xs text-white/50 capitalize leading-tight">{role}</div>
          </div>
          <ChevronDown size={14} className="text-white/50 hidden sm:block" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 z-50">
            <div className="px-4 py-2.5 border-b border-gray-100">
              <div className="text-sm font-semibold text-gray-900 truncate">{user?.full_name || user?.email}</div>
              <div className="text-xs text-gray-400 capitalize">{role}</div>
            </div>
            <div className="p-1">
              <button onClick={() => { setMenuOpen(false); setProfileTab('personal'); setProfileOpen(true) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <User size={15} className="text-gray-400" /> My Profile
              </button>
              {user?.can_manage_billing && (
                <button onClick={() => { setMenuOpen(false); setProfileTab('billing'); setProfileOpen(true) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <CreditCard size={15} className="text-gray-400" /> Plan &amp; Subscription
                </button>
              )}
              <button onClick={() => { setMenuOpen(false); onLogout?.() }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 font-medium transition-colors">
                <LogOut size={15} /> Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      <ProfilePanel open={profileOpen} initialTab={profileTab} api={api}
        onClose={() => setProfileOpen(false)} onLogout={onLogout} />
    </header>
  )
}
