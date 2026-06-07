import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, BedDouble, Activity, ClipboardList, Pill,
  Stethoscope, ArrowLeftRight, LogOut, Menu, X, Sun, Sunset, Moon,
  FileText, ClipboardCheck, ListOrdered, KeyRound, Settings
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useWardSession } from '../contexts/WardSessionContext'
import ChatWidget from './ChatWidget'

// ── Nav definitions ───────────────────────────────────────────────────────────

const NURSE_NAV = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard',     end: true  },
  { to: '/ward-board',    icon: BedDouble,       label: 'Ward Board'               },
  { to: '/vitals',        icon: Activity,        label: 'Vitals'                   },
  { to: '/notes',         icon: ClipboardList,   label: 'Nursing Notes'            },
  { to: '/mar',           icon: Pill,            label: 'MAR'                      },
  { to: '/assessments',   icon: ClipboardCheck,  label: 'Assessments'              },
  { to: '/handoff',       icon: ArrowLeftRight,  label: 'Shift Handoff'            },
]

const PROVIDER_NAV = [
  { to: '/',              icon: LayoutDashboard, label: 'Dashboard',     end: true  },
  { to: '/ward-board',    icon: BedDouble,       label: 'Ward Board'               },
  { to: '/rounds',        icon: Stethoscope,     label: 'Ward Rounds'              },
  { to: '/progress-notes', icon: FileText,       label: 'Progress Notes'           },
  { to: '/orders',        icon: ClipboardList,   label: 'Orders',   disabled: true  },
  { to: '/handoff',       icon: ArrowLeftRight,  label: 'Shift Handoff'            },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function getShift() {
  const h = new Date().getHours()
  if (h >= 6 && h < 14) return { label: 'Morning Shift', icon: Sun, color: '#F5821E', range: '6am–2pm' }
  if (h >= 14 && h < 22) return { label: 'Afternoon Shift', icon: Sunset, color: '#d97706', range: '2pm–10pm' }
  return { label: 'Night Shift', icon: Moon, color: '#6366f1', range: '10pm–6am' }
}

function formatDate(d) {
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

function formatRole(role) {
  if (!role) return ''
  return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({ onClose, compact }) {
  const { user, logout } = useAuth()
  const { mode, department, ward } = useWardSession()
  const navItems = mode === 'provider' ? PROVIDER_NAV : NURSE_NAV

  return (
    <aside className={`${compact ? 'w-[60px]' : 'w-60'} flex flex-col h-full flex-shrink-0 transition-all`} style={{ background: '#065F46' }}>
      <div className={`${compact ? 'px-2 py-4 justify-center' : 'px-5 py-5'} border-b border-white/10 flex items-center justify-between`}>
        {compact ? (
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-sm"
              style={{ background: 'rgba(110,231,183,0.25)', color: '#6ee7b7' }}>
              BC
            </div>
          </div>
        ) : (
          <div>
            <div className="text-white font-extrabold text-lg tracking-tight">BHarath Health Systems</div>
            <div className="text-xs font-semibold mt-0.5 tracking-wider uppercase" style={{ color: '#6ee7b7' }}>
              Ward Portal
            </div>
            {department && (
              <div className="text-xs mt-1" style={{ color: 'rgba(110,231,183,0.7)' }}>
                {department.name}{ward ? ` · ${ward.name}` : ''}
              </div>
            )}
          </div>
        )}
        {onClose && (
          <button onClick={onClose} className="md:hidden text-white/60 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className={`flex-1 ${compact ? 'px-1' : 'px-3'} py-4 overflow-y-auto`}>
        {navItems.map(({ to, icon: Icon, label, end, disabled }) =>
          disabled ? (
            <div
              key={to}
              className={`flex items-center ${compact ? 'justify-center px-2' : 'gap-3 px-3'} py-2 rounded-lg text-sm mb-0.5 cursor-not-allowed`}
              style={{ color: 'rgba(255,255,255,0.3)' }}
              title={compact ? label : undefined}
            >
              <Icon size={17} className="flex-shrink-0" />
              {!compact && label}
              {!compact && (
                <span className="ml-auto text-xs px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}>
                  Soon
                </span>
              )}
            </div>
          ) : (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              title={compact ? label : undefined}
              className={({ isActive }) => `${isActive ? 'sidebar-link-active' : 'sidebar-link'} ${compact ? '!px-2 justify-center' : ''}`}
            >
              <Icon size={17} className="flex-shrink-0" />{!compact && label}
            </NavLink>
          )
        )}
      </nav>

      <div className={`${compact ? 'px-1' : 'px-3'} py-4 border-t border-white/10`}>
        {!compact && (
        <div className="flex items-center gap-3 px-2 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'rgba(110,231,183,0.2)', color: '#6ee7b7' }}
          >
            {getInitials(user?.full_name || user?.email)}
          </div>
          <div className="min-w-0">
            <div className="text-white text-xs font-semibold truncate">{user?.full_name || user?.email}</div>
            <div className="text-emerald-300 text-xs truncate">{formatRole(user?.role)}</div>
          </div>
        </div>
        )}
        <button onClick={logout} className={`sidebar-link w-full ${compact ? '!px-2 justify-center' : ''}`} title={compact ? 'Sign Out' : undefined}>
          <LogOut size={15} />{!compact && 'Sign Out'}
        </button>
      </div>
    </aside>
  )
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function Layout() {
  const { mode, switchMode, department, ward } = useWardSession()
  const [open, setOpen] = useState(false)
  const shift = getShift()
  const ShiftIcon = shift.icon
  const location = useLocation()
  const isPatientChart = location.pathname.startsWith('/patient/')

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}
      <div className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setOpen(false)} />
      </div>
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar compact={isPatientChart} />
      </div>
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-emerald-800 text-white px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
        <div className="font-bold text-lg tracking-tight">CareChart</div>
        <div className="flex-1" />
        <span className="text-emerald-200 text-xs">{user?.full_name} · {user?.role}</span>
        <button onClick={() => navigate('/pin-setup')} className="p-1.5 hover:bg-emerald-700 rounded" title="PIN Setup">
          <KeyRound size={14} />
        </button>
        <button onClick={() => navigate('/account')} className="p-1.5 hover:bg-emerald-700 rounded" title="Account Settings">
          <Settings size={14} />
        </button>
        <button onClick={logout} className="p-1.5 hover:bg-emerald-700 rounded" title="Logout">
          <LogOut size={14} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-2.5 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setOpen(true)} className="md:hidden p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 flex-shrink-0">
              <Menu size={22} />
            </button>
            {department ? (
              <span className="hidden md:block text-xs text-gray-500 truncate">
                {department.name}{ward ? ` · ${ward.name}` : ' · All Wards'}
              </span>
            ) : (
              <span className="hidden md:block text-xs text-gray-400">{formatDate(new Date())}</span>
            )}
          </div>

          {/* Mode toggle pill */}
          <div className="flex items-center bg-gray-100 rounded-full p-0.5 gap-0.5 flex-shrink-0">
            <button
              onClick={() => switchMode('nurse')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                mode === 'nurse'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Nurse Mode
            </button>
            <button
              onClick={() => switchMode('provider')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                mode === 'provider'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Provider Mode
            </button>
          </div>

          {/* Shift indicator */}
          <div className="flex items-center gap-2 text-sm font-medium flex-shrink-0" style={{ color: shift.color }}>
            <ShiftIcon size={15} />
            <span className="hidden sm:inline">{shift.label}</span>
            <span className="text-gray-400 font-normal text-xs hidden sm:inline">({shift.range})</span>
          </div>
        </div>

        <div className={isPatientChart ? '' : 'p-4 md:p-6'}>
          <Outlet />
        </div>
      </main>

      {/* Floating chat widget — same style as provider portal, PIN-gated */}
      <ChatWidget />
    </div>
  )
}
