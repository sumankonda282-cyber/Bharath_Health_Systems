import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/client'
import { CalendarDays, Clock, CheckCircle, XCircle, Loader2, Video, CreditCard, ChevronRight } from 'lucide-react'

function todayIST() {
  return new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10)
}

function StatCard({ icon: Icon, label, value, color, onClick, loading }) {
  return (
    <button
      onClick={onClick}
      className="card p-5 flex items-center gap-4 w-full text-left transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '18' }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-2xl font-bold" style={{ color: '#0F2557' }}>
          {loading ? <span className="text-gray-300 text-lg">—</span> : (value ?? 0)}
        </div>
        <div className="text-xs text-gray-500 font-medium">{label}</div>
      </div>
      <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
    </button>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isManager = ['clinic_manager', 'clinic_admin'].includes(user?.role)
  const [appts, setAppts] = useState([])
  const [billing, setBilling] = useState({ collected: 0, pending: 0 })
  const [loading, setLoading] = useState(true)
  const timerRef = useRef(null)

  const load = () => {
    const today = todayIST()
    api.get('/appointments', { params: { appointment_date: today, limit: 200 } })
      .then(r => setAppts(Array.isArray(r) ? r : []))
      .catch(() => {})
      .finally(() => setLoading(false))
    api.get('/billing/invoices', { params: { limit: 200 } })
      .then(r => {
        const list = Array.isArray(r) ? r : []
        const todayStr = today
        const todayInvs = list.filter(i => (i.created_at || '').slice(0, 10) === todayStr)
        setBilling({
          collected: todayInvs.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount || 0), 0),
          pending: todayInvs.filter(i => i.status !== 'paid').reduce((s, i) => s + Number(i.total_amount || 0), 0),
        })
      })
      .catch(() => {})
  }

  useEffect(() => {
    load()
    timerRef.current = setInterval(load, 30000)
    return () => clearInterval(timerRef.current)
  }, [])

  const waiting    = appts.filter(a => ['scheduled', 'waiting'].includes(a.status)).length
  const inProgress = appts.filter(a => a.status === 'in_progress').length
  const completed  = appts.filter(a => a.status === 'completed').length
  const cancelled  = appts.filter(a => a.status === 'cancelled').length
  const telehealth = appts.filter(a => a.mode === 'telehealth' || a.visit_type === 'telehealth').length

  const goFrontDesk = (filter) => navigate(`/front-desk${filter ? `?status=${filter}` : ''}`)
  const goBilling = () => navigate('/billing')
  const goOperations = () => navigate('/operations')

  return (
    <div>
      <div className="page-header flex items-center justify-between mb-6">
        <h1 className="page-title">
          {isManager ? 'Manager Dashboard' : 'Staff Dashboard'}
        </h1>
        <span className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <StatCard icon={CalendarDays} label="Total Today"    value={appts.length} color="#0F2557" loading={loading}
          onClick={() => isManager ? goOperations() : goFrontDesk()} />
        <StatCard icon={Clock}        label="Waiting"        value={waiting}      color="#F5821E" loading={loading}
          onClick={() => isManager ? goOperations() : goFrontDesk('waiting')} />
        <StatCard icon={CalendarDays} label="In Consultation" value={inProgress}  color="#7C3AED" loading={loading}
          onClick={() => isManager ? goOperations() : goFrontDesk('in_progress')} />
        <StatCard icon={CheckCircle}  label="Completed"      value={completed}    color="#16A34A" loading={loading}
          onClick={() => isManager ? goOperations() : goFrontDesk('completed')} />
        <StatCard icon={Video}        label="Telehealth"     value={telehealth}   color="#0891B2" loading={loading}
          onClick={() => isManager ? goOperations() : goFrontDesk('telehealth')} />
      </div>

      {/* Billing snapshot */}
      <button onClick={goBilling}
        className="card p-4 mb-6 w-full flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-0.5 text-left">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#16a34a18' }}>
          <CreditCard size={20} style={{ color: '#16a34a' }} />
        </div>
        <div className="flex-1 flex flex-wrap gap-x-8 gap-y-1">
          <div>
            <div className="text-xs text-gray-500">Collected Today</div>
            <div className="font-bold text-green-700">₹{billing.collected.toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Pending</div>
            <div className="font-bold text-red-600">₹{billing.pending.toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div className="text-xs text-gray-400 flex items-center gap-1">
          View Billing <ChevronRight size={14} />
        </div>
      </button>

      {/* Today's schedule */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-gray-700">Today's Schedule</span>
          <button onClick={() => isManager ? goOperations() : goFrontDesk()}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
            View all <ChevronRight size={13} />
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
        ) : appts.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <CalendarDays size={32} className="mx-auto mb-2 opacity-30" />
            <p>No appointments today</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th className="th">#</th>
                  <th className="th">Patient</th>
                  <th className="th">Doctor</th>
                  <th className="th">Time</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appts.slice(0, 8).map(a => (
                  <tr key={a.id} className="tr-hover cursor-pointer"
                    onClick={() => isManager ? navigate(`/operations/${a.id}`) : goFrontDesk()}>
                    <td className="td font-bold text-center" style={{ color: '#0F2557' }}>
                      #{a.token_number || a.id}
                    </td>
                    <td className="td font-medium">{a.patient_name || '—'}</td>
                    <td className="td text-gray-500 text-sm">{a.doctor_name || '—'}</td>
                    <td className="td text-sm">{a.appointment_time || '—'}</td>
                    <td className="td">
                      <span className={`badge ${
                        a.status === 'completed' ? 'badge-green' :
                        a.status === 'cancelled' ? 'badge-red' :
                        a.status === 'in_progress' ? 'badge-purple' : 'badge-yellow'
                      }`}>
                        {(a.status || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {appts.length > 8 && (
              <div className="px-5 py-3 text-center border-t border-gray-100">
                <button onClick={() => isManager ? goOperations() : goFrontDesk()}
                  className="text-sm text-blue-600 hover:text-blue-800">
                  +{appts.length - 8} more — View all
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
