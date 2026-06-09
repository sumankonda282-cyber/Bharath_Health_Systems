import ChatWidget from './ChatWidget'
import HelpWidget from './HelpWidget'
import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, ScanLine, Settings, LogOut, AlertCircle, FileEdit,
  CreditCard, BarChart2, Users, Menu, X, Bell, FileText, CheckCircle,
  Calendar, UserCheck, ClipboardList, RefreshCw,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/client'

const TECHNICIAN_NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/orders',    icon: ClipboardList,   label: 'Orders (Worklist)' },
  { to: '/schedule',  icon: Calendar,        label: 'Schedule' },
  { to: '/referring', icon: UserCheck,       label: 'Referring Doctors' },
  { to: '/billing',   icon: CreditCard,      label: 'Billing' },
]

const RADIOLOGIST_NAV = [
  { to: '/',               icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/pending-review', icon: ScanLine,        label: 'Pending Review' },
  { to: '/report-writer',  icon: FileEdit,        label: 'Report Writer' },
  { to: '/reports',        icon: BarChart2,       label: 'Reports' },
  { to: '/patients',       icon: Users,           label: 'Patient History' },
  { to: '/templates',      icon: FileText,        label: 'Templates' },
  { to: '/referring',      icon: UserCheck,       label: 'Referring Doctors' },
]

const ROLE_LABELS = {
  imaging_technician: 'Imaging Technician',
  radiologist: 'Radiologist',
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

// ── Critical Alerts Bell ───────────────────────────────────────────────────────
function CriticalAlertsBell() {
  const [count, setCount]   = useState(0)
  const [alerts, setAlerts] = useState([])
  const [open, setOpen]     = useState(false)
  const [acking, setAcking] = useState(null)
  const dropRef             = useRef(null)

  const fetchCount = () => {
    api.get('/imaging/critical-alerts/count')
      .then(r => {
        const val = r?.count ?? r?.data?.count ?? 0
        setCount(val)
      })
      .catch(() => {})
  }

  const fetchAlerts = () => {
    api.get('/imaging/critical-alerts')
      .then(r => setAlerts(Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : [])))
      .catch(() => {})
  }

  useEffect(() => {
    fetchCount()
    const id = setInterval(fetchCount, 60_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (open) fetchAlerts()
  }, [open])

  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const acknowledge = async (id) => {
    setAcking(id)
    try {
      await api.post(`/imaging/critical-alerts/${id}/acknowledge`)
      setAlerts(prev => prev.filter(a => a.id !== id))
      setCount(c => Math.max(0, c - 1))
    } catch {}
    setAcking(null)
  }

  const ALERT_LABELS = {
    mass_lesion: 'Mass Lesion', pneumothorax: 'Pneumothorax',
    hemorrhage: 'Hemorrhage', fracture: 'Fracture',
    foreign_body: 'Foreign Body', other: 'Other',
  }

  return (
    <div className="relative" ref={dropRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
        title="Critical Alerts"
      >
        <Bell size={18} className="text-white" />
        {count > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
            style={{ background: '#CC1414' }}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <Bell size={15} style={{ color: '#CC1414' }} />
            <span className="font-bold text-sm text-gray-800">Critical Alerts</span>
            {count > 0 && (
              <span className="ml-auto text-xs font-bold text-white px-1.5 py-0.5 rounded-full" style={{ background: '#CC1414' }}>
                {count} unacknowledged
              </span>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
            {alerts.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-400 text-sm">
                <CheckCircle size={24} className="mx-auto mb-2 text-green-400" />
                No unacknowledged alerts
              </div>
            ) : (
              alerts.map(a => (
                <div key={a.id} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className="text-xs font-bold px-1.5 py-0.5 rounded"
                          style={{ background: '#fee2e2', color: '#CC1414' }}
                        >
                          {ALERT_LABELS[a.alert_type] || a.alert_type}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">{a.order_ref}</span>
                      </div>
                      <div className="text-xs font-semibold text-gray-800">{a.patient_name}</div>
                      {a.modality && <div className="text-xs text-gray-500">{a.modality}</div>}
                      {a.description && (
                        <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">{a.description}</div>
                      )}
                      <div className="text-xs text-gray-400 mt-0.5">
                        by {a.alerted_by_name} · {new Date(a.alerted_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>
                    <button
                      onClick={() => acknowledge(a.id)}
                      disabled={acking === a.id}
                      className="flex-shrink-0 px-2 py-1 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
                      style={{ background: '#16a34a' }}
                    >
                      {acking === a.id ? '…' : 'ACK'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const role = user?.role
  const navItems = role === 'radiologist' ? RADIOLOGIST_NAV : TECHNICIAN_NAV
  const roleLabel = ROLE_LABELS[role] || (role ? role.replace(/_/g, ' ') : 'Staff')

  const sidebar = (
    <aside className="w-60 flex flex-col h-full flex-shrink-0" style={{ background: '#0F2557' }}>
      <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
        <div>
          <div className="font-extrabold text-base leading-tight" style={{ letterSpacing: '-0.01em' }}>
            <span style={{ color: '#CC1414' }}>BH</span>
            <span className="text-white">arath Health</span>
          </div>
          <div className="text-xs font-semibold mt-0.5 tracking-wider uppercase" style={{ color: '#F5821E' }}>
            Imaging Portal
          </div>
        </div>
        <div className="flex items-center gap-1">
          <CriticalAlertsBell />
          <button onClick={() => setOpen(false)} className="md:hidden text-white/60 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
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
            <span
              className="inline-block text-xs font-semibold px-1.5 py-0.5 rounded-full mt-0.5"
              style={{ background: 'rgba(245,130,30,0.2)', color: '#F5821E' }}
            >
              {roleLabel}
            </span>
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
          <span className="md:hidden text-xs font-semibold ml-1" style={{ color: '#F5821E' }}>Imaging</span>
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
      <HelpWidget />
    </div>
  )
}
