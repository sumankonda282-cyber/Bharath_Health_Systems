import { useState, useEffect } from 'react'
import { adminApi } from '../api'
import { Building2, Clock, CheckCircle, ShieldAlert, Users, IndianRupee, TrendingUp, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

const PRESETS = [
  { label: 'Today',   days: 0 },
  { label: '7 Days',  days: 7 },
  { label: '30 Days', days: 30 },
  { label: 'Quarter', days: 90 },
  { label: 'Year',    days: 365 },
]

function StatCard({ label, value, icon: Icon, color, to }) {
  const colors = {
    navy:    'bg-[#0F2557]/10 text-[#0F2557]',
    emerald: 'bg-green-500/10 text-green-500',
    amber:   'bg-[#F5821E]/10 text-[#F5821E]',
    red:     'bg-[#CC1414]/10 text-[#CC1414]',
  }
  const card = (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-3 hover:border-gray-700 transition-colors">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colors[color] || colors.navy}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-extrabold text-white leading-none">{value ?? '—'}</div>
        <div className="text-xs text-gray-500 mt-0.5 truncate">{label}</div>
      </div>
    </div>
  )
  return to ? <Link to={to}>{card}</Link> : card
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState('30 Days')

  const load = () => {
    setLoading(true)
    adminApi.getDashboard()
      .then(setData)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [preset])

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-7 h-7 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#0F2557', borderTopColor: 'transparent' }} />
    </div>
  )

  if (!data) return <p className="text-gray-500 text-sm">Failed to load dashboard.</p>

  return (
    <div className="space-y-4">
      {/* Date filter row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => setPreset(p.label)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              preset === p.label
                ? 'text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
            style={preset === p.label ? { background: '#F5821E' } : {}}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Platform Pulse */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Platform Pulse</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-0.5">OPD Today</div>
            <div className="text-2xl font-extrabold text-white">{data.opd_today ?? data.appointments_today ?? '—'}</div>
            <div className="text-xs text-gray-500 mt-0.5">Across all clinics</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-0.5">Active Clinics</div>
            <div className="text-2xl font-extrabold text-white">{data.active_clinics ?? '—'}</div>
            <div className="text-xs text-gray-500 mt-0.5">With active subscription</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <div className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#93c5fd' }}>Total Patients</div>
            <div className="text-2xl font-extrabold text-white">{data.total_patients ?? '—'}</div>
            <div className="text-xs text-gray-500 mt-0.5">Registered on platform</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3" style={{ borderColor: 'rgba(245,130,30,0.3)', background: 'rgba(245,130,30,0.05)' }}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#F5821E' }}>MRR</div>
            <div className="text-2xl font-extrabold text-white">₹{data.mrr?.toLocaleString('en-IN') ?? '—'}</div>
            <div className="text-xs text-gray-500 mt-0.5">Platform revenue</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <StatCard label="Total Clinics"         value={data.total_clinics}   icon={Building2}   color="navy"    to="/clinics" />
        <StatCard label="Active"                 value={data.active_clinics}  icon={CheckCircle} color="emerald" to="/clinics?status=active" />
        <StatCard label="Pending Approval"       value={data.pending_clinics} icon={Clock}       color="amber"   to="/pending" />
        <StatCard label="Suspended / Revoked"    value={(data.suspended_clinics||0)+(data.revoked_clinics||0)} icon={ShieldAlert} color="red" to="/clinics?status=suspended" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <StatCard label="Active Doctors"         value={data.total_doctors}   icon={Users}       color="navy" />
        <StatCard label="Total Patients"         value={data.total_patients}  icon={Users}       color="navy" />
        <StatCard label="Staff Pending Verify"   value={data.pending_staff}   icon={ShieldCheck} color="amber"   to="/staff" />
        <StatCard label="New This Month"         value={data.new_this_month}  icon={TrendingUp}  color="emerald" />
      </div>

      {/* Rate Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Rate Card</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(data.rate_card || {}).map(([plan, info]) => (
            <div key={plan} className="bg-gray-800 rounded-lg p-2.5">
              <div className="text-xs font-semibold text-gray-400 uppercase mb-0.5">{plan}</div>
              <div className="text-base font-extrabold text-white">
                {info.price_per_doctor === 0 ? 'Free' : `₹${info.price_per_doctor}`}
              </div>
              {info.price_per_doctor > 0 && <div className="text-xs text-gray-500">per doctor / mo</div>}
              <div className="text-xs text-gray-500 mt-0.5">
                Max {info.max_doctors >= 999 ? 'Unlimited' : info.max_doctors} doctors
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
