import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Menu, PanelLeft, HelpCircle, User, LogOut, Settings, Globe, ChevronDown, RefreshCw, Clock } from 'lucide-react'
import ProfileDrawer from './ProfileDrawer'
import NotificationBell from '../ui/NotificationBell'
import HelpWidget from './HelpWidget'

const ROUTE_TITLES = [
  { pattern: /^\/dashboard$/,         title: 'Dashboard' },
  { pattern: /^\/patients\/new/,       title: 'Register New Patient' },
  { pattern: /^\/patients\/\d+/,       title: 'Patient Detail' },
  { pattern: /^\/patients/,            title: 'Patients' },
  { pattern: /^\/appointments/,        title: 'Appointments' },
  { pattern: /^\/triage/,             title: 'Triage' },
  { pattern: /^\/doctor-desk/,         title: 'Doctor Desk' },
  { pattern: /^\/encounter/,           title: 'Patient Chart' },
  { pattern: /^\/telehealth\/call/,    title: 'Telehealth Call' },
  { pattern: /^\/telehealth/,          title: 'Telehealth' },
  { pattern: /^\/forms\/iview/,        title: 'iView Flowsheets' },
  { pattern: /^\/forms/,               title: 'Assessments' },
  { pattern: /^\/inpatient-admin/,     title: 'Inpatient Admin' },
  { pattern: /^\/inpatient/,           title: 'Inpatient Desk' },
  { pattern: /^\/pharmacy/,            title: 'Pharmacy' },
  { pattern: /^\/lab/,                 title: 'Laboratory' },
  { pattern: /^\/imaging/,             title: 'Imaging' },
  { pattern: /^\/billing/,             title: 'Billing' },
  { pattern: /^\/analytics/,           title: 'Analytics' },
  { pattern: /^\/referrals/,           title: 'Referrals' },
  { pattern: /^\/admin/,               title: 'Health Center Admin' },
  { pattern: /^\/branch-overview/,     title: 'Branch Overview' },
  { pattern: /^\/platform/,            title: 'Platform Admin' },
]

function getTitle(pathname) {
  for (const { pattern, title } of ROUTE_TITLES) {
    if (pattern.test(pathname)) return title
  }
  return 'Bharath Health Systems'
}

export default function TopBar({ onMenuClick, onToggleSidebar, onRefresh }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [dropOpen, setDropOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const dropRef = useRef(null)

  const title = getTitle(location.pathname)

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 h-14 border-b shadow-sm" style={{ background: '#0F2557', borderColor: 'rgba(255,255,255,0.08)' }}>
        {/* Left: hamburger (mobile) + page title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="hidden md:inline-flex p-1.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            title="Toggle sidebar"
          >
            <PanelLeft size={20} />
          </button>
          <button
            onClick={onMenuClick}
            className="md:hidden p-1.5 rounded-lg text-white/70 hover:bg-white/10"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-base md:text-lg font-bold text-white">{title}</h1>
        </div>

        {/* Right: refresh + help + profile */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            title="Refresh page data"
          >
            <RefreshCw size={17} />
          </button>
          <NotificationBell />
          <button
            onClick={() => setHelpOpen(true)}
            className="p-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            title="Help & Support"
          >
            <HelpCircle size={18} />
          </button>
          <HelpWidget open={helpOpen} onClose={() => setHelpOpen(false)} />

          {/* Profile dropdown */}
          <div className="relative" ref={dropRef}>
            <button
              onClick={() => setDropOpen(o => !o)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: '#F5821E' }}
              >
                {initials}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-white leading-tight">{user?.full_name}</div>
                <div className="text-xs text-white/50 capitalize leading-tight">{user?.role?.replace(/_/g, ' ')}</div>
              </div>
              <ChevronDown size={14} className="text-white/50 hidden sm:block" />
            </button>

            {dropOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 z-50">
                <div className="px-4 py-2.5 border-b border-gray-100">
                  <div className="text-sm font-semibold text-gray-900">{user?.full_name}</div>
                  <div className="text-xs text-gray-400 capitalize">{user?.role?.replace(/_/g, ' ')}</div>
                </div>
                <button
                  onClick={() => { setDropOpen(false); setProfileOpen(true) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <User size={15} className="text-gray-400" /> My Profile
                </button>
                <button
                  onClick={() => { setDropOpen(false); setProfileOpen(true) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Clock size={15} className="text-gray-400" /> My Shift
                </button>
                <button
                  onClick={() => { setDropOpen(false); setProfileOpen(true) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Globe size={15} className="text-gray-400" /> Languages Known
                </button>
                <button
                  onClick={() => { setDropOpen(false); navigate('/admin') }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings size={15} className="text-gray-400" /> Settings
                </button>
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  )
}
