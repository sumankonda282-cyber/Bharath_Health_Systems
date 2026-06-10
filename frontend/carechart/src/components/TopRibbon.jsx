import { useState, useRef, useEffect } from 'react'
import { Sun, Sunset, Moon, ChevronDown, LogOut, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useWardSession } from '../contexts/WardSessionContext'
import logoImg from '../assets/logo.png'

function getShift() {
  const h = new Date().getHours()
  if (h >= 6 && h < 14) return { name: 'Morning', range: '06:00–14:00', Icon: Sun, color: '#FCD34D' }
  if (h >= 14 && h < 22) return { name: 'Afternoon', range: '14:00–22:00', Icon: Sunset, color: '#FB923C' }
  return { name: 'Night', range: '22:00–06:00', Icon: Moon, color: '#A78BFA' }
}

export default function TopRibbon({ onRefresh }) {
  const { user, logout } = useAuth()
  const { mode, switchMode, department, ward } = useWardSession()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const shift = getShift()
  const ShiftIcon = shift.Icon

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const wardLabel = ward?.name || department?.name || null

  return (
    <div className="flex items-center h-11 px-3 gap-2 flex-shrink-0 select-none z-40"
      style={{ background: '#065F46', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>

      {/* Brand + context */}
      <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
        <img src={logoImg} alt="BHarath" style={{ height: 24, width: 'auto', flexShrink: 0 }} />
        <span className="hidden md:block text-white font-bold text-sm tracking-tight leading-none">
          <span style={{ color: '#FCA5A5' }}>BH</span>arath Health
        </span>
        {wardLabel && (
          <span className="hidden sm:flex items-center gap-1 text-emerald-200 text-xs font-medium">
            <span className="text-white/20">·</span>
            {wardLabel}
          </span>
        )}
      </div>

      <div className="flex-1" />

      {/* Shift indicator */}
      <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full"
        style={{ background: 'rgba(255,255,255,0.1)', color: shift.color }}>
        <ShiftIcon size={12} />
        <span>{shift.name}</span>
        <span className="text-white/30 mx-0.5">·</span>
        <span className="font-mono text-white/60 text-[11px]">{shift.range}</span>
      </div>

      <div className="flex-1" />

      {/* Right: toggle + user menu */}
      <div className="flex items-center gap-1.5">
        {/* Nurse / Doctor toggle */}
        <div className="flex items-center bg-white/10 rounded-full p-0.5">
          <button
            onClick={() => switchMode('nurse')}
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all leading-5 ${
              mode === 'nurse' ? 'bg-white text-emerald-800 shadow-sm' : 'text-white/60 hover:text-white'
            }`}>
            Nurse
          </button>
          <button
            onClick={() => switchMode('provider')}
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all leading-5 ${
              mode === 'provider' ? 'bg-white text-emerald-800 shadow-sm' : 'text-white/60 hover:text-white'
            }`}>
            Doctor
          </button>
        </div>

        {/* Refresh */}
        {onRefresh && (
          <button onClick={onRefresh}
            className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <RefreshCw size={14} />
          </button>
        )}

        {/* User dropdown */}
        <div ref={menuRef} className="relative">
          <button onClick={() => setOpen(v => !v)}
            className="flex items-center gap-1.5 text-white/80 hover:text-white text-xs px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {(user?.full_name || 'U')[0].toUpperCase()}
            </span>
            <span className="hidden sm:block max-w-[90px] truncate font-medium">
              {user?.full_name?.split(' ')[0] || 'User'}
            </span>
            <ChevronDown size={11} />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
              <div className="px-3 py-2.5 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-800 truncate">{user?.full_name || 'Staff'}</p>
                <p className="text-xs text-gray-400 capitalize mt-0.5">{(user?.role || 'staff').replace(/_/g, ' ')}</p>
              </div>
              <button
                onClick={() => { setOpen(false); logout() }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors">
                <LogOut size={13} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
