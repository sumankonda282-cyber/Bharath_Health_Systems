import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, BedDouble,
  Activity, Pill, FileText, ClipboardList, LogOut as LogOutIcon, ArrowRightFromLine,
  Stethoscope, ShoppingBag, FileEdit, GitBranch,
  Bell, RefreshCw, HelpCircle, ChevronDown, Menu, X,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useWardSession } from '../contexts/WardSessionContext'
import EmergencyAlertBanner from './EmergencyAlertBanner'
import ChatWidget from './ChatWidget'
import BrandLogo from './BrandLogo'
import HelpWidget from './HelpWidget'
import api from '../api/client'
import { GREEN } from '../constants/colors'

const NAV = [
  {
    section: 'CLINICAL',
    items: [
      { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/patients',   icon: Users,            label: 'Patients' },
      { to: '/ward-board', icon: BedDouble,         label: 'Ward Board' },
    ],
  },
  {
    section: 'PROVIDER',
    items: [
      { to: '/rounds', icon: Stethoscope, label: 'Ward Rounds' },
      { to: '/orders', icon: ShoppingBag, label: 'Orders' },
      { to: '/docs',   icon: FileEdit,    label: 'Documentation' },
    ],
  },
  {
    section: 'NURSING',
    items: [
      { to: '/vitals',      icon: Activity,           label: 'Vitals' },
      { to: '/mar',         icon: Pill,                label: 'MAR' },
      { to: '/notes',       icon: FileText,            label: 'Nursing Notes' },
      { to: '/assessments', icon: ClipboardList,       label: 'Assessments' },
      { to: '/discharge',   icon: ArrowRightFromLine,  label: 'Discharge' },
      { to: '/handoff',     icon: GitBranch,           label: 'Shift Handoff' },
    ],
  },
]

function SidebarLink({ to, icon: Icon, label, collapsed }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all
         ${isActive ? 'text-white' : 'text-emerald-100/80 hover:text-white hover:bg-white/10'}`
      }
      style={({ isActive }) => isActive ? { background: GREEN } : {}}
      title={collapsed ? label : undefined}
    >
      <Icon size={17} className="flex-shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )
}

export default function Layout({ children }) {
  const { user, logout }          = useAuth()
  const { session, clearSession } = useWardSession()
  const navigate                  = useNavigate()
  const location                  = useLocation()

  const [profileOpen, setProfileOpen]       = useState(false)
  const [notifOpen, setNotifOpen]           = useState(false)
  const [supportOpen, setSupportOpen]       = useState(false)
  const [notifications, setNotifications]   = useState([])
  const [unread, setUnread]                 = useState(0)
  const [refreshing, setRefreshing]         = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const profileRef = useRef(null)
  const notifRef   = useRef(null)

  const collapsed = location.pathname.startsWith('/chart/')

  useEffect(() => {
    const h = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const data = await api.get('/inpatient/emergency', { params: { status: 'scheduled' } })
        const list = Array.isArray(data) ? data : []
        setNotifications(list)
        setUnread(list.filter(n => !n.alert_ack_at).length)
      } catch {}
    }
    fetchNotifs()
    const t = setInterval(fetchNotifs, 30000)
    window.addEventListener('carechart:refresh', fetchNotifs)
    return () => { clearInterval(t); window.removeEventListener('carechart:refresh', fetchNotifs) }
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    window.dispatchEvent(new CustomEvent('carechart:refresh'))
    setTimeout(() => setRefreshing(false), 800)
  }

  const handleSignOut = () => { clearSession(); logout() }

  const shift = (() => {
    const h = new Date().getHours()
    if (h >= 6  && h < 14) return 'Morning'
    if (h >= 14 && h < 22) return 'Evening'
    return 'Night'
  })()

  const Sidebar = ({ mobile = false }) => (
    <aside
      className={`flex flex-col h-full ${mobile ? 'w-64' : collapsed ? 'w-14' : 'w-56'} flex-shrink-0 transition-all duration-200`}
      style={{ background: 'linear-gradient(180deg, #064e3b 0%, #065f46 100%)', borderRight: '1px solid #047857' }}
    >
      <div className={`flex items-center ${collapsed && !mobile ? 'justify-center' : 'px-4'} py-4 border-b flex-shrink-0`} style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
        {collapsed && !mobile ? <BrandLogo size="sm" showText={false} /> : <BrandLogo size="sm" />}
      </div>

      {(!collapsed || mobile) && session && (
        <div className="px-4 py-2 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
          <p className="text-xs uppercase tracking-wider" style={{ color: 'rgba(167,243,208,0.6)' }}>Current Ward</p>
          <p className="text-xs font-semibold text-emerald-100 truncate mt-0.5">{session.ward?.name}</p>
          <p className="text-xs truncate" style={{ color: 'rgba(167,243,208,0.6)' }}>{session.department?.name}</p>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            {(!collapsed || mobile) && (
              <p className="text-[10px] font-bold tracking-widest uppercase px-2 mb-1" style={{ color: 'rgba(167,243,208,0.6)' }}>{section}</p>
            )}
            <div className="space-y-0.5">
              {items.map(item => (
                <SidebarLink key={item.to} {...item} collapsed={collapsed && !mobile} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {(!collapsed || mobile) && (
        <div className="px-4 py-3 border-t flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
            {shift} Shift
          </span>
        </div>
      )}
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="hidden md:flex flex-col h-full">
        <Sidebar />
      </div>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative flex flex-col h-full">
            <button className="absolute top-3 right-3 text-gray-400" onClick={() => setMobileSidebarOpen(false)}>
              <X size={20} />
            </button>
            <Sidebar mobile />
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <EmergencyAlertBanner />

        <header className="flex items-center gap-3 px-4 py-2.5 border-b flex-shrink-0" style={{ background: '#f0fdf8', borderColor: '#d1fae5' }}>
          <button className="md:hidden text-gray-500 hover:text-gray-800 mr-1" onClick={() => setMobileSidebarOpen(true)}>
            <Menu size={20} />
          </button>

          {session && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0">
              <span className="font-medium text-gray-700">{session.hospital?.name}</span>
              <span>·</span>
              <span>{session.department?.name}</span>
              <span>·</span>
              <span className="font-semibold" style={{ color: GREEN }}>{session.ward?.name}</span>
            </div>
          )}

          <div className="flex-1" />

          <button onClick={handleRefresh} title="Refresh" className="p-2 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors">
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>

          <button onClick={() => setSupportOpen(true)} title="Help & Support"
            className="p-2 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors">
            <HelpCircle size={16} />
          </button>

          <div className="relative" ref={notifRef}>
            <button onClick={() => setNotifOpen(o => !o)} title="Alerts"
              className="relative p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <Bell size={16} />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{ background: 'var(--green)' }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-30 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">Alerts & Notifications</span>
                  <span className="text-xs text-gray-400">{notifications.length} scheduled</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No alerts</p>
                  ) : notifications.map(n => (
                    <div key={n.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{n.patient_name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{n.chief_complaint || 'Scheduled admission'}</p>
                          {n.eta_minutes && <p className="text-xs font-medium mt-0.5" style={{ color: GREEN }}>ETA {n.eta_minutes} min</p>}
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0"
                          style={{ background: '#fef3c7', color: '#92400e' }}>
                          {n.triage_level || 'SCHED'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={profileRef}>
            <button onClick={() => setProfileOpen(o => !o)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: GREEN }}>
                {user?.full_name?.[0] || user?.name?.[0] || '?'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-gray-800 leading-none">{user?.full_name || user?.name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{user?.role || 'Staff'}</p>
              </div>
              <ChevronDown size={13} className="text-gray-400" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 z-30 py-1">
                <div className="px-4 py-2.5 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800">{user?.full_name || user?.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
                </div>
                <button onClick={handleSignOut}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2">
                  <LogOutIcon size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <HelpWidget open={supportOpen} onClose={() => setSupportOpen(false)} />
      <ChatWidget />
      <HelpWidget open={supportOpen} onClose={() => setSupportOpen(false)} />
    </div>
  )
}
