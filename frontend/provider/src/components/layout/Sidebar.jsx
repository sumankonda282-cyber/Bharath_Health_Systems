import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { authApi } from '../../api/index'
import {
  LayoutDashboard, Users, Calendar, Stethoscope, Pill,
  FlaskConical, Scan, Receipt, BarChart3, Send, Settings,
  ShieldCheck, LogOut, Building2, LayoutGrid, BedDouble,
  Hospital, ChevronRight
} from 'lucide-react'
import BrandLogo from '../BrandLogo'

// Grouped navigation sections
const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard, roles: ['clinic_admin','doctor','receptionist','pharmacist','lab_tech','imaging_tech'] },
    ],
  },
  {
    label: 'Clinical',
    items: [
      { to: '/patients',     label: 'Patients',     icon: Users,       roles: ['clinic_admin','doctor','receptionist'] },
      { to: '/appointments', label: 'Appointments', icon: Calendar,    roles: ['clinic_admin','doctor','receptionist'] },
      { to: '/doctor-desk',  label: 'Doctor Desk',  icon: Stethoscope, roles: ['doctor','clinic_admin'] },
    ],
  },
  {
    label: 'Departments',
    items: [
      { to: '/pharmacy',     label: 'Pharmacy',     icon: Pill,        roles: ['pharmacist','clinic_admin'] },
      { to: '/lab',          label: 'Laboratory',   icon: FlaskConical,roles: ['lab_tech','clinic_admin','doctor'] },
      { to: '/imaging',      label: 'Imaging',      icon: Scan,        roles: ['imaging_tech','clinic_admin','doctor'] },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/billing',      label: 'Billing',      icon: Receipt,     roles: ['clinic_admin','receptionist'] },
      { to: '/analytics',    label: 'Analytics',    icon: BarChart3,   roles: ['clinic_admin'] },
      { to: '/referrals',    label: 'Referrals',    icon: Send,        roles: ['clinic_admin','doctor'] },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/admin',            label: 'Clinic Admin',    icon: Settings,   roles: ['clinic_admin'] },
      { to: '/inpatient-admin',  label: 'Inpatient Mgmt',  icon: BedDouble,  roles: ['clinic_admin'], hospitalOnly: true },
      { to: '/branch-overview',  label: 'Branch Overview', icon: LayoutGrid, roles: ['clinic_admin'] },
      { to: '/platform',         label: 'Platform',        icon: ShieldCheck, userType: 'platform_admin' },
    ],
  },
]

const CARECHART_URL = import.meta.env.VITE_CARECHART_URL || 'https://carechart.bharatcliniq.com'
const API_BASE      = import.meta.env.VITE_API_URL        || 'https://bharatcliniq-api.onrender.com'

export default function Sidebar({ onClose }) {
  const { user, branding, logout, isPlatformAdmin } = useAuth()
  const navigate = useNavigate()

  const canShow = (item) => {
    if (item.userType === 'platform_admin') return isPlatformAdmin
    if (!item.roles) return true
    if (!item.roles.includes(user?.role)) return false
    if (item.hospitalOnly && user?.org_type !== 'hospital') return false
    return true
  }

  const handleLogout = () => { logout(); navigate('/login') }

  const handleCareChart = async () => {
    try {
      const res = await authApi.crossPortalToken('carechart')
      const sso = res?.sso_token
      if (sso) {
        window.open(`${CARECHART_URL}/?sso=${encodeURIComponent(sso)}`, '_blank', 'noopener')
      }
    } catch {
      // fallback — open login page
      window.open(`${CARECHART_URL}/login`, '_blank', 'noopener')
    }
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  const showCareChart =
    user?.has_inpatient_access &&
    user?.org_type === 'hospital' &&
    user?.wards_enabled

  return (
    <aside
      className="relative left-0 top-0 h-screen w-60 flex flex-col z-40 shadow-xl"
      style={{ background: '#0F2557' }}
    >
      {/* Logo / Brand */}
      <div className="px-5 py-4 border-b border-white/10">
        {branding?.logo_url ? (
          <div className="flex items-center gap-2">
            <img
              src={branding.logo_url.startsWith('/') ? `${API_BASE}${branding.logo_url}` : branding.logo_url}
              alt={branding.brand_name}
              style={{ height: 32, width: 'auto', objectFit: 'contain', borderRadius: 4 }}
            />
            <span className="font-extrabold text-white text-sm leading-tight">{branding.brand_name}</span>
          </div>
        ) : (
          <BrandLogo size="sm" light />
        )}
        <div className="text-xs font-semibold mt-1.5 tracking-wider uppercase" style={{ color: '#F5821E' }}>
          Doctor Portal
        </div>
      </div>

      {/* Clinic info */}
      {user?.clinic_name && (
        <div className="px-4 py-2.5 border-b border-white/10">
          <div className="flex items-center gap-2 text-xs text-blue-300">
            <Building2 size={12} />
            <span className="truncate">{user.clinic_name}</span>
          </div>
          {!user.clinic_verified && (
            <div className="mt-1 text-xs" style={{ color: '#F5821E' }}>⚠ Pending verification</div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {NAV_SECTIONS.map(section => {
          const visibleItems = section.items.filter(canShow)
          if (!visibleItems.length) return null
          return (
            <div key={section.label} className="mb-3">
              <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-blue-400/60">
                {section.label}
              </div>
              {visibleItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-all group ${
                      isActive
                        ? 'text-white'
                        : 'text-blue-200 hover:text-white hover:bg-white/10'
                    }`
                  }
                  style={({ isActive }) => isActive ? { background: '#CC1414' } : {}}
                >
                  <item.icon size={16} />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight size={12} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                </NavLink>
              ))}
            </div>
          )
        })}

        {/* Account Settings — always visible */}
        <div className="mb-3">
          <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-blue-400/60">
            Account
          </div>
          <NavLink
            to="/account"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-all group ${
                isActive ? 'text-white' : 'text-blue-200 hover:text-white hover:bg-white/10'
              }`
            }
            style={({ isActive }) => isActive ? { background: '#CC1414' } : {}}
          >
            <Settings size={16} />
            <span className="flex-1">Account Settings</span>
            <ChevronRight size={12} className="opacity-0 group-hover:opacity-40 transition-opacity" />
          </NavLink>
        </div>

        {/* CareChart action button — shown only when inpatient access granted */}
        {showCareChart && (
          <div className="mx-2 mt-1 mb-3">
            <button
              onClick={handleCareChart}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
              style={{ background: '#059669', color: '#fff' }}
            >
              <Hospital size={16} />
              <span className="flex-1 text-left">Open CareChart</span>
              <span className="text-[10px] font-normal opacity-80">Inpatient</span>
            </button>
          </div>
        )}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: '#F5821E' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">{user?.full_name}</div>
            <div className="text-xs text-blue-300 capitalize">{user?.role?.replace(/_/g, ' ')}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs text-blue-300 hover:text-red-400 transition-colors w-full"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
