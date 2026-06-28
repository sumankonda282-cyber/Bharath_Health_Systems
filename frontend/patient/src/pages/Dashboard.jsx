import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/client'
import { cachedFetch } from '../utils/cache'
import { Calendar, Pill, Heart, CheckCircle, Users, ShieldCheck, RefreshCw, Copy, Check, Eye, EyeOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import logoImg from '../assets/logo.png'

function HistoryPinSection() {
  const [pin, setPin] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)

  // Backend sends naive UTC (datetime.utcnow). Mark it UTC so the countdown isn't
  // skewed by the browser timezone (was showing ~5h instead of the real 60m).
  const asUtc = (s) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(String(s)) ? s : s + 'Z')

  const startCountdown = (expiry) => {
    clearInterval(timerRef.current)
    const exp = asUtc(expiry)
    const tick = () => {
      const secs = Math.max(0, Math.round((exp - Date.now()) / 1000))
      setSecondsLeft(secs)
      if (secs === 0) { clearInterval(timerRef.current); setVisible(false) }
    }
    tick()
    timerRef.current = setInterval(tick, 1000)
  }

  const generate = async () => {
    setLoading(true)
    try {
      const res = await api.post('/portal/pin/generate')
      const data = res?.data || res
      setPin(data.pin)
      setVisible(false)
      startCountdown(data.expires_at)
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.get('/portal/pin').then(res => {
      const data = res?.data || res
      if (data?.pin && data?.expires_at && asUtc(data.expires_at) > new Date()) {
        setPin(data.pin)
        startCountdown(data.expires_at)
      }
    }).catch(() => {})
    return () => clearInterval(timerRef.current)
  }, [])

  const expired = secondsLeft === 0 && pin
  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const timerColor = secondsLeft < 300 ? '#f87171' : '#86efac'  // warn under 5 min

  // Compact single-row PIN strip — small footprint on the card.
  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      <div className="flex items-center gap-2 flex-wrap">
        <ShieldCheck size={13} style={{ color: '#fbbf24' }} />
        <span className="text-xs font-semibold" style={{ color: '#93c5fd' }}>History PIN</span>

        {pin && !expired ? (
          <>
            <span className="text-base font-bold tracking-[0.18em] font-mono" style={{ color: '#F5821E' }}>
              {visible ? pin : '••••••'}
            </span>
            <button onClick={() => setVisible(v => !v)} className="p-1 rounded-lg hover:bg-white/10 transition-colors" title={visible ? 'Hide PIN' : 'Show PIN'}>
              {visible ? <EyeOff size={13} style={{ color: '#93c5fd' }} /> : <Eye size={13} style={{ color: '#93c5fd' }} />}
            </button>
            {visible && (
              <button onClick={() => { navigator.clipboard.writeText(pin); setCopied(true); setTimeout(() => setCopied(false), 1500) }} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} style={{ color: '#93c5fd' }} />}
              </button>
            )}
            <span className="text-xs font-mono font-semibold" style={{ color: timerColor }}>{mins}:{String(secs).padStart(2, '0')} left</span>
          </>
        ) : (
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {expired ? 'PIN expired.' : 'Generate a 60-min PIN to share with a doctor + your BHID.'}
          </span>
        )}

        <button onClick={generate} disabled={loading}
          className="ml-auto flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity disabled:opacity-50"
          style={{ background: 'rgba(245,130,30,0.2)', color: '#fbbf24' }}>
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          {pin && !expired ? 'New PIN' : 'Generate PIN'}
        </button>
      </div>
    </div>
  )
}

const fmt12 = (t) => {
  if (!t) return t
  const str = String(t).slice(0, 5)
  const [h, m] = str.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return t
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
}

const STATUS_COLORS = {
  pending: 'badge-yellow', confirmed: 'badge-blue', completed: 'badge-green',
  cancelled: 'badge-gray', in_progress: 'badge-blue',
}

function calcAge(dob) {
  if (!dob) return null
  const today = new Date()
  const birth = new Date(dob)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

// Plain label/value text field for the Health-ID card (no boxes, no chips).
function InfoField({ label, value, tone }) {
  const v = (value === null || value === undefined || value === '') ? null : value
  const colors = { danger: '#fca5a5', warn: '#fbbf24' }
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'rgba(147,197,253,0.6)' }}>{label}</div>
      <div className="text-sm font-semibold leading-snug break-words"
        style={{ color: v ? (colors[tone] || '#ffffff') : 'rgba(255,255,255,0.35)' }}>
        {v || 'Not provided'}
      </div>
    </div>
  )
}

// Coerce allergies (free text) / chronic_conditions (array or text) to a clean comma string.
const toText = (val) => {
  if (Array.isArray(val)) return val.filter(Boolean).join(', ')
  if (!val) return ''
  return String(val).replace(/\n/g, ',').split(',').map(s => s.trim()).filter(Boolean).join(', ')
}

export default function Dashboard() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [guardianOf, setGuardianOf] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cachedFetch(
      'dashboard',
      () => Promise.all([
        api.get('/portal/appointments'),
        api.get('/portal/prescriptions'),
        api.get('/portal/me'),
      ]),
      ([a, p, me]) => {
        setAppointments(a?.data?.appointments || a?.appointments || a?.data || [])
        setPrescriptions((p?.data?.prescriptions || p?.prescriptions || p?.data || []).slice(0, 3))
        const meData = me?.data || me
        setGuardianOf(Array.isArray(meData?.guardian_of) ? meData.guardian_of : [])
        setProfile(meData || {})
        setLoading(false)
      }
    ).catch(() => setLoading(false))
  }, [])

  const pendingRx = prescriptions.filter(p => p.status === 'pending').length
  const upcoming = appointments.filter(a => ['pending', 'confirmed'].includes(a.status)).length
  const completedVisits = appointments.filter(a => a.status === 'completed').length

  return (
    <div className="space-y-5">
      {/* BHID Digital Health ID Card */}
      <div className="rounded-2xl text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0F2557 0%, #1a3a7a 60%, #0a1a3e 100%)' }}>
        {/* Decorative circles */}
        <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full pointer-events-none" style={{ background:'rgba(245,130,30,0.08)' }} />
        <div className="absolute -bottom-8 left-1/4 w-36 h-36 rounded-full pointer-events-none" style={{ background:'rgba(204,20,20,0.08)' }} />
        <div className="absolute top-1/2 right-10 w-20 h-20 rounded-full pointer-events-none" style={{ background:'rgba(255,255,255,0.03)' }} />

        {/* Card Header */}
        <div className="relative flex items-center justify-between px-5 pt-4 pb-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="BHarath Health" style={{ height: 22, width: 'auto' }} />
            <span className="font-extrabold text-[11px] tracking-wider text-white/70 uppercase">BHarath Health Systems</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{ background: 'rgba(245,130,30,0.18)', color: '#fbbf24', border: '1px solid rgba(245,130,30,0.25)' }}>
            <Heart size={9} />
            Digital Health ID
          </div>
        </div>

        {/* Card Body */}
        <div className="relative px-5 py-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center font-extrabold text-2xl border-2"
              style={{ background: 'rgba(245,130,30,0.15)', borderColor: 'rgba(245,130,30,0.3)', color: '#F5821E' }}>
              {(profile?.full_name || user?.full_name || 'P').charAt(0).toUpperCase()}
            </div>

            {/* Name + BHID + demographics */}
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-medium mb-0.5" style={{ color: '#93c5fd' }}>Patient Name</div>
              <div className="text-lg font-bold tracking-wide leading-tight">{profile?.full_name || user?.full_name || 'Patient'}</div>
              <div className="font-mono text-sm font-bold tracking-widest mt-1" style={{ color: '#F5821E' }}>
                {(profile?.bh_id || user?.bh_id || 'BH-XXXXXXXX').toUpperCase()}
              </div>
            </div>

            {/* Clinics count */}
            <div className="flex-shrink-0 text-right">
              <div className="text-[10px] font-medium mb-0.5" style={{ color: '#93c5fd' }}>Linked Clinics</div>
              <div className="text-xl font-bold">{profile?.linked_clinics ?? user?.linked_clinics ?? 0}</div>
            </div>
          </div>

          {/* Patient details — plain text, always shown */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
            <InfoField label="Age / DOB" value={profile?.date_of_birth && calcAge(profile.date_of_birth) !== null
              ? `${calcAge(profile.date_of_birth)} yrs · ${new Date(profile.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
              : ''} />
            <InfoField label="Gender" value={profile?.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : ''} />
            <InfoField label="Blood Group" value={profile?.blood_group} tone="danger" />
            <InfoField label="Mobile" value={profile?.phone || profile?.mobile} />
          </div>
          <div className="mt-3 space-y-3">
            <InfoField label="Address" value={[profile?.address, profile?.city, profile?.state, profile?.pincode].filter(Boolean).join(', ')} />
            <InfoField label="Allergies" value={toText(profile?.allergies)} tone="danger" />
            <InfoField label="Chronic Conditions" value={toText(profile?.chronic_conditions)} tone="warn" />
          </div>
        </div>

        {/* PIN section */}
        <div className="relative px-5 pb-4">
          <HistoryPinSection />
        </div>
      </div>

      {/* Stats row — linked clinics already shown on the health card above */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Upcoming Appointments', value: upcoming, icon: Calendar, accent: '#0F2557', lightBg: '#EEF2FF' },
          { label: 'Pending Prescriptions', value: pendingRx, icon: Pill, accent: '#CC1414', lightBg: '#FEF2F2' },
          { label: 'Completed Visits', value: completedVisits, icon: CheckCircle, accent: '#16a34a', lightBg: '#F0FDF4' },
        ].map(stat => (
          <div key={stat.label} className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: stat.lightBg }}>
              <stat.icon size={18} style={{ color: stat.accent }} />
            </div>
            <div>
              <div className="text-xl font-bold" style={{ color: '#0F2557' }}>{loading ? '—' : stat.value}</div>
              <div className="text-xs text-gray-500 leading-tight">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Family Members — guardian_of */}
      {!loading && guardianOf.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Users size={18} style={{ color: '#0F2557' }} />
              <h2 className="font-bold text-base" style={{ color: '#0F2557' }}>Family Members</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">You are registered as guardian for these patients</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
            {guardianOf.map(p => (
              <div key={p.id} className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                <div className="font-semibold text-sm" style={{ color: '#0F2557' }}>{p.full_name}</div>
                {p.bh_id && (
                  <div className="text-xs font-mono text-gray-400 mt-0.5">{p.bh_id.toUpperCase()}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {p.age !== null && p.age !== undefined ? `${p.age} yrs` : ''}
                  {p.age !== null && p.age !== undefined && p.gender ? ' · ' : ''}
                  {p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent appointments */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-base" style={{ color: '#0F2557' }}>Recent Appointments</h2>
          <Link to="/appointments" className="text-sm font-medium hover:underline" style={{ color: '#CC1414' }}>
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : appointments.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Calendar size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No appointments on record yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {appointments.slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-blue-50/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: '#EEF2FF' }}>
                    <Calendar size={15} style={{ color: '#0F2557' }} />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-900">{a.clinic_name}</div>
                    <div className="text-xs text-gray-400">
                      {/^dr\.?\s/i.test(a.doctor_name || '') ? a.doctor_name : `Dr. ${a.doctor_name || ''}`} · {a.date} {a.time && <>at {fmt12(a.time)}</>}
                    </div>
                  </div>
                </div>
                <span className={STATUS_COLORS[a.status] || 'badge-gray'}>{a.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
