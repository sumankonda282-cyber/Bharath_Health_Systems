import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, BedDouble, Activity, ClipboardList, Pill,
  Stethoscope, ArrowLeftRight, LogOut, Menu, X, Sun, Sunset, Moon,
  FileText, ClipboardCheck, ChevronRight, Users, BookOpen
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useWardSession } from '../contexts/WardSessionContext'

function IndiaMapLogo({ size = 40 }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 1.17)}
      viewBox="0 0 100 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="India map"
    >
      <polygon
        points="
          38,2  52,2  62,6  72,4  80,10  84,18  82,26  88,32  90,40
          86,48  90,56  88,64  82,70  78,78  74,82  68,90  62,98
          58,108 50,118 46,110 40,100 34,90 28,82 24,74
          20,66  16,58  14,50  18,42  14,34  16,26  20,18
          26,12  32,6
        "
        fill="#16a34a"
        stroke="#15803d"
        strokeWidth="1"
      />
      <rect x="45" y="54" width="10" height="2" fill="white" rx="1" />
      <rect x="49" y="50" width="2" height="10" fill="white" rx="1" />
    </svg>
  )
}

const CLINICAL_NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/ward-board', icon: BedDouble,       label: 'Ward Board'           },
]

const NURSE_NAV = [
  { to: '/vitals',      icon: Activity,       label: 'Vitals'       },
  { to: '/mar',         icon: Pill,           label: 'MAR'          },
  { to: '/notes',       icon: ClipboardList,  label: 'Nursing Notes' },
  { to: '/assessments', icon: ClipboardCheck, label: 'Assessments'  },
  { to: '/handoff',     icon: ArrowLeftRight, label: 'Shift Handoff' },
]

const PROVIDER_NAV = [
  { to: '/rounds',        icon: Stethoscope,   label: 'Ward Rounds'    },
  { to: '/orders',        icon: ClipboardList, label: 'Orders'         },
  { to: '/templates',     icon: FileText,      label: 'Documentation'  },
]

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function getShift() {
  const h = new Date().getHours()
  if (h >= 6 && h < 14)  return { label: 'Morning Shift',   icon: Sun,    color: '#F5821E', range: '6am–2pm'   }
  if (h >= 14 && h < 22) return { label: 'Afternoon Shift', icon: Sunset, color: '#d97706', range: '2pm–10pm'  }
  return                          { label: 'Night Shift',    icon: Moon,   color: '#6366f1', range: '10pm–6am'  }
}

function formatDate(d) {
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

function formatRole(role) {
  if (!role) return ''
  return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function NavSection({ title, items, onClose }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-widest text-white/30 px-3 mb-1 mt-4">
        {title}
      </div>
      {items.map(({ to, icon: Icon, label, end, disabled }) =>
        disabled ? (
          <div
            key={to}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm mb-0.5 cursor-not-allowed select-none"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            <Icon size={16} className="flex-shrink-0" />
            <span>{label}</span>
            <span
              className="ml-auto text-xs px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)' }}
            >
              Soon
            </span>
          </div>
        ) : (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) => isActive ? 'sidebar-link-active' : 'sidebar-link'}
          >
            <Icon size={16} className="flex-shrink-0" />
            {label}
          </NavLink>
        )
      )}
    </div>
  )
}

function Sidebar({ onClose }) {
  const { user, logout } = useAuth()
  const { mode, department, ward, shift: sessionShift } = useWardSession()

  const shiftLabel = sessionShift || getShift().label

  return (
    <aside
      className="w-60 flex flex-col h-full flex-shrink-0"
      style={{ background: '#0F2557' }}
    >
      <div className="px-4 pt-5 pb-4 border-b border-white/10">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <IndiaMapLogo size={38} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="font-extrabold text-base leading-tight" style={{ color: '#EF4444' }}>
                BHarath
              </span>
              <span className="font-extrabold text-base leading-tight text-white">
                Health
              </span>
            </div>
            <div className="text-xs font-normal leading-tight" style={{ color: '#9ca3af' }}>
              Systems
            </div>
            <div className="text-xs font-semibold mt-0.5 tracking-wide" style={{ color: '#6ee7b7' }}>
              CareChart
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden text-white/50 hover:text-white flex-shrink-0 mt-0.5"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {(department || ward || shiftLabel) && (
          <div
            className="mt-3 px-2 py-1.5 rounded-md text-xs flex items-center gap-1 flex-wrap"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}
          >
            {department && <span>{department.name}</span>}
            {department && ward && <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>}
            {ward && <span>{ward.name}</span>}
            {(department || ward) && shiftLabel && <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>}
            {shiftLabel && <span>{shiftLabel}</span>}
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <NavSection title="Clinical" items={CLINICAL_NAV} onClose={onClose} />
        {mode === 'nurse' && (
          <NavSection title="Nursing" items={NURSE_NAV} onClose={onClose} />
        )}
        {mode === 'provider' && (
          <NavSection title="Provider" items={PROVIDER_NAV} onClose={onClose} />
        )}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'rgba(245,130,30,0.2)', color: '#F5821E' }}
          >
            {getInitials(user?.full_name || user?.email)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white text-xs font-semibold truncate">
              {user?.full_name || user?.email}
            </div>
            <div className="text-xs truncate" style={{ color: '#6ee7b7' }}>
              {formatRole(user?.role)}
            </div>
          </div>
        </div>
        <button onClick={logout} className="sidebar-link w-full">
          <LogOut size={15} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}

export default function Layout() {
  const { mode, switchMode, department, ward } = useWardSession()
  const [open, setOpen] = useState(false)
  const shift = getShift()
  const ShiftIcon = shift.icon

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {open && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setOpen(false)} />
      </div>

      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      <main className="flex-1 overflow-y-auto">
        <div
          className="sticky top-0 z-30 bg-white border-b border-gray-200 flex items-center justify-between px-4 gap-3"
          style={{ height: '48px' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 flex-shrink-0"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <span className="hidden sm:block text-xs text-gray-400 font-medium">
              {formatDate(new Date())}
            </span>
          </div>

          <div className="flex items-center bg-gray-100 rounded-full p-0.5 gap-0.5 flex-shrink-0">
            <button
              onClick={() => switchMode('nurse')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                mode === 'nurse'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Nurse
            </button>
            <button
              onClick={() => switchMode('provider')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                mode === 'provider'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Provider
            </button>
          </div>

          <div
            className="flex items-center gap-1.5 text-xs font-medium flex-shrink-0"
            style={{ color: shift.color }}
          >
            <ShiftIcon size={14} />
            <span className="hidden sm:inline">{shift.label}</span>
            <span className="text-gray-400 font-normal hidden sm:inline">({shift.range})</span>
          </div>
        </div>

        <div className="p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
