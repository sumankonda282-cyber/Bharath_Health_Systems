import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { CalendarClock, Phone, RefreshCw, CheckCircle, XCircle, PhoneCall, Clock, AlertTriangle, Filter } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: '',          label: 'All' },
  { value: 'pending',   label: 'Pending' },
  { value: 'called',    label: 'Called' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'dismissed', label: 'Dismissed' },
]

const URGENCY_STYLES = {
  overdue:  { bg: 'bg-red-50',    border: 'border-red-200',   badge: 'bg-red-100 text-red-700',   icon: AlertTriangle, iconColor: 'text-red-500' },
  today:    { bg: 'bg-amber-50',  border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', icon: Clock,         iconColor: 'text-amber-500' },
  soon:     { bg: 'bg-blue-50',   border: 'border-blue-200',  badge: 'bg-blue-100 text-blue-700',  icon: CalendarClock, iconColor: 'text-blue-500' },
  upcoming: { bg: 'bg-white',     border: 'border-gray-200',  badge: 'bg-gray-100 text-gray-600',  icon: CalendarClock, iconColor: 'text-gray-400' },
}

const STATUS_BADGE = {
  pending:   'bg-yellow-100 text-yellow-700',
  called:    'bg-blue-100 text-blue-700',
  scheduled: 'bg-green-100 text-green-700',
  dismissed: 'bg-gray-100 text-gray-500',
}

function urgencyLabel(r) {
  if (r.urgency === 'overdue') return `${Math.abs(r.days_until)}d overdue`
  if (r.urgency === 'today')   return 'Due today'
  if (r.urgency === 'soon')    return `In ${r.days_until}d`
  return `In ${r.days_until}d`
}

export default function FollowUpReminders() {
  const [reminders, setReminders] = useState([])
  const [loading, setLoading]     = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [updating, setUpdating]   = useState(null)
  const [toast, setToast]         = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = statusFilter ? `?status=${statusFilter}` : ''
      const data = await api.get(`/clinic/follow-up-reminders${params}`)
      setReminders(Array.isArray(data) ? data : [])
    } catch (e) {
      showToast(e?.message || 'Failed to load reminders', 'error')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id, status) => {
    setUpdating(id)
    try {
      await api.patch(`/clinic/follow-up-reminders/${id}`, { status })
      showToast(status === 'called' ? 'Marked as called' : status === 'scheduled' ? 'Marked as scheduled' : 'Dismissed')
      load()
    } catch (e) {
      showToast(e?.message || 'Update failed', 'error')
    } finally {
      setUpdating(null)
    }
  }

  const overdueCount  = reminders.filter(r => r.urgency === 'overdue').length
  const todayCount    = reminders.filter(r => r.urgency === 'today').length

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <CalendarClock size={26} style={{ color: '#0F2557' }} />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Follow-up Reminders</h1>
            <p className="text-sm text-gray-500 mt-0.5">Call patients and schedule their follow-up appointments</p>
          </div>
        </div>
        <button onClick={load} className="btn-secondary text-sm flex-shrink-0">
          <RefreshCw size={14} />Refresh
        </button>
      </div>

      {/* Summary chips */}
      {(overdueCount > 0 || todayCount > 0) && (
        <div className="flex gap-3 mb-4 flex-wrap">
          {overdueCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-sm font-medium text-red-700">
              <AlertTriangle size={14} />
              {overdueCount} overdue
            </div>
          )}
          {todayCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-sm font-medium text-amber-700">
              <Clock size={14} />
              {todayCount} due today
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`mb-4 flex items-center gap-2 p-3 rounded-xl text-sm border ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter size={14} className="text-gray-400" />
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
            style={statusFilter === opt.value
              ? { background: '#0F2557', color: 'white', borderColor: '#0F2557' }
              : { borderColor: '#E5E7EB', color: '#6B7280' }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <RefreshCw size={20} className="animate-spin mr-2" />Loading…
        </div>
      ) : reminders.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <CalendarClock size={40} className="mx-auto mb-3 opacity-25" />
          <p className="font-semibold text-gray-600">No reminders found</p>
          <p className="text-sm mt-1">Follow-up reminders appear here when doctors complete encounters with a follow-up date set.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map(r => {
            const urg = URGENCY_STYLES[r.urgency] || URGENCY_STYLES.upcoming
            const UrgIcon = urg.icon
            return (
              <div key={r.id} className={`rounded-xl border p-4 ${urg.bg} ${urg.border}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0">
                    <UrgIcon size={18} className={`mt-0.5 flex-shrink-0 ${urg.iconColor}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{r.patient_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urg.badge}`}>
                          {urgencyLabel(r)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-500'}`}>
                          {r.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-0.5">
                        Dr. {r.doctor_name} · Due {new Date(r.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}{r.follow_up_days}d follow-up
                      </div>
                      {r.notes && (
                        <div className="text-xs text-gray-500 mt-1 italic">"{r.notes}"</div>
                      )}
                      {r.called_at && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          Last action: {new Date(r.called_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    {/* Mobile call link */}
                    {r.patient_mobile && (
                      <a
                        href={`tel:${r.patient_mobile}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-700 transition-all"
                      >
                        <Phone size={13} />
                        {r.patient_mobile}
                      </a>
                    )}

                    {r.status === 'pending' && (
                      <>
                        <button
                          disabled={updating === r.id}
                          onClick={() => updateStatus(r.id, 'called')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50"
                        >
                          <PhoneCall size={13} />
                          Called
                        </button>
                        <button
                          disabled={updating === r.id}
                          onClick={() => updateStatus(r.id, 'scheduled')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-all disabled:opacity-50"
                        >
                          <CheckCircle size={13} />
                          Scheduled
                        </button>
                        <button
                          disabled={updating === r.id}
                          onClick={() => updateStatus(r.id, 'dismissed')}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                        >
                          <XCircle size={13} />
                        </button>
                      </>
                    )}

                    {r.status === 'called' && (
                      <button
                        disabled={updating === r.id}
                        onClick={() => updateStatus(r.id, 'scheduled')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-all disabled:opacity-50"
                      >
                        <CheckCircle size={13} />
                        Mark Scheduled
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
