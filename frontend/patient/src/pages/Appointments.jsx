import { useState, useEffect } from 'react'
import api from '../api/client'
import { Calendar, Stethoscope, Clock } from 'lucide-react'

const STATUS_BADGE = {
  pending: 'badge-yellow', confirmed: 'badge-blue', completed: 'badge-green',
  cancelled: 'badge-gray', in_progress: 'badge-blue',
}

function ApptCard({ a }) {
  return (
    <div className="card p-4 flex items-start gap-4 hover:shadow-lg transition-shadow">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#EEF2FF' }}>
        <Stethoscope size={22} style={{ color: '#0F2557' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-gray-900 text-sm">{a.clinic_name || 'Clinic'}</div>
          <span className={`${STATUS_BADGE[a.status] || 'badge-gray'} flex-shrink-0`}>{a.status?.replace('_',' ')}</span>
        </div>
        <div className="text-sm text-gray-500 mt-0.5">Dr. {a.doctor_name || 'Doctor'}</div>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          {a.date && <span className="flex items-center gap-1 text-xs text-gray-400"><Calendar size={11} /> {a.date}</span>}
          {a.time && <span className="flex items-center gap-1 text-xs text-gray-400"><Clock size={11} /> {a.time}</span>}
          {a.token_number && (
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full" style={{ background: '#EEF2FF', color: '#0F2557' }}>
              Token #{a.token_number}
            </span>
          )}
          <span className="text-xs text-gray-400 capitalize">{a.mode?.replace('_',' ') || 'Walk-in'}</span>
        </div>
        {a.reason && <div className="text-xs text-gray-400 mt-1 italic">"{a.reason}"</div>}
      </div>
    </div>
  )
}

export default function Appointments() {
  const [appts, setAppts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/portal/appointments')
      .then(r => setAppts(r.data?.appointments || r.data || []))
      .finally(() => setLoading(false))
  }, [])

  const upcoming = appts.filter(a => ['pending','confirmed'].includes(a.status))
  const past = appts.filter(a => !['pending','confirmed'].includes(a.status))

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-extrabold" style={{ color: '#0F2557' }}>My Appointments</h1>

      {loading ? (
        <div className="card p-10 text-center text-gray-400 text-sm">Loading…</div>
      ) : appts.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <Calendar size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No appointments on record</p>
          <p className="text-sm mt-1">Your clinic will add appointments to your profile.</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#F5821E' }}>Upcoming</h2>
              <div className="space-y-3">{upcoming.map(a => <ApptCard key={a.id} a={a} />)}</div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-gray-400">Past Appointments</h2>
              <div className="space-y-3">{past.map(a => <ApptCard key={a.id} a={a} />)}</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
