import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/client'
import { Calendar, Pill, FlaskConical, Receipt, Heart, User, ArrowRight, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

const STATUS_COLORS = {
  pending: 'badge-yellow', confirmed: 'badge-blue', completed: 'badge-green',
  cancelled: 'badge-gray', in_progress: 'badge-blue',
}

const QUICK_LINKS = [
  { label: 'Appointments', to: '/appointments', icon: Calendar, bg: '#0F2557' },
  { label: 'Prescriptions', to: '/prescriptions', icon: Pill, bg: '#CC1414' },
  { label: 'Lab Results', to: '/lab-results', icon: FlaskConical, bg: '#F5821E' },
  { label: 'My Bills', to: '/bills', icon: Receipt, bg: '#16a34a' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/portal/appointments'),
      api.get('/portal/prescriptions'),
    ]).then(([a, p]) => {
      setAppointments((a.data?.appointments || a.data || []).slice(0, 5))
      setPrescriptions((p.data?.prescriptions || p.data || []).slice(0, 3))
    }).finally(() => setLoading(false))
  }, [])

  const pendingRx = prescriptions.filter(p => p.status === 'pending').length

  return (
    <div className="max-w-4xl space-y-5">
      {/* BHID Health Card */}
      <div className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0F2557 0%, #1a3a7a 60%, #0a1a3e 100%)' }}>
        {/* Decorative */}
        <div style={{ position:'absolute', top:'-40px', right:'-40px', width:'220px', height:'220px', borderRadius:'50%', background:'rgba(245,130,30,0.12)' }} />
        <div style={{ position:'absolute', bottom:'-30px', left:'30%', width:'160px', height:'160px', borderRadius:'50%', background:'rgba(204,20,20,0.10)' }} />

        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,130,30,0.3)' }}>
                <Heart size={16} style={{ color: '#F5821E' }} />
              </div>
              <div>
                <span className="font-extrabold text-sm tracking-wider" style={{ color: '#CC1414' }}>BH</span>
                <span className="font-extrabold text-sm tracking-wider text-white">aratCliniq</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgba(245,130,30,0.2)', color: '#fbbf24' }}>
              <Heart size={11} />
              Digital Health Card
            </div>
          </div>

          <div className="mb-5">
            <div className="text-xs mb-1 font-medium" style={{ color: '#93c5fd' }}>Patient Name</div>
            <div className="text-2xl font-bold tracking-wide">{user?.full_name || 'Patient'}</div>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs mb-1 font-medium" style={{ color: '#93c5fd' }}>BHID / Health ID</div>
              <div className="font-mono text-lg font-bold tracking-widest" style={{ color: '#F5821E' }}>
                {user?.bh_id ? user.bh_id.toUpperCase() : 'BH-XXXXXXXX'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs mb-1 font-medium" style={{ color: '#93c5fd' }}>Linked Clinics</div>
              <div className="text-xl font-bold">{user?.linked_clinics || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Appointments', value: appointments.length, icon: Calendar, accent: '#0F2557', lightBg: '#EEF2FF' },
          { label: 'Pending Prescriptions', value: pendingRx, icon: Pill, accent: '#CC1414', lightBg: '#FEF2F2' },
          { label: 'Linked Clinics', value: user?.linked_clinics || 0, icon: MapPin, accent: '#F5821E', lightBg: '#FFF7ED' },
          { label: 'Profile', value: 'Active', icon: User, accent: '#16a34a', lightBg: '#F0FDF4' },
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

      {/* Quick nav */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUICK_LINKS.map(q => (
          <Link key={q.to} to={q.to}
            className="rounded-2xl p-4 flex items-center justify-between text-white transition-opacity hover:opacity-90 group"
            style={{ background: q.bg }}>
            <div className="flex items-center gap-2">
              <q.icon size={18} />
              <span className="font-semibold text-sm">{q.label}</span>
            </div>
            <ArrowRight size={14} className="opacity-60 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>

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
            {appointments.map(a => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-blue-50/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: '#EEF2FF' }}>
                    <Calendar size={15} style={{ color: '#0F2557' }} />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-900">{a.clinic_name}</div>
                    <div className="text-xs text-gray-400">Dr. {a.doctor_name} · {a.date} {a.time && `at ${a.time}`}</div>
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
