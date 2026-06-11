import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, Plus, Trash2, CheckCircle, Clock, ShieldCheck, ArrowRight, ArrowLeft,
} from 'lucide-react'
import api from '../../api/client'

const SUGGESTED_SHIFTS = [
  { name: 'Morning',  start_time: '06:00', end_time: '14:00', color_hex: '#F5821E' },
  { name: 'Evening',  start_time: '14:00', end_time: '22:00', color_hex: '#0F2557' },
  { name: 'Night',    start_time: '22:00', end_time: '06:00', color_hex: '#6366f1' },
  { name: 'OPD',      start_time: '09:00', end_time: '17:00', color_hex: '#065F46' },
  { name: 'On-Call',  start_time: '00:00', end_time: '23:59', color_hex: '#CC1414' },
]

const COLORS = ['#0F2557', '#F5821E', '#065F46', '#CC1414', '#6366f1', '#0891b2', '#a21caf']

export default function Setup() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Step 1: shifts
  const [shiftTypes, setShiftTypes] = useState([])
  const [newShift, setNewShift] = useState({ name: '', start_time: '09:00', end_time: '17:00', color_hex: '#0F2557' })

  // Step 2: rules
  const [rules, setRules] = useState({
    min_rest_hours: 8,
    max_shifts_per_week: 6,
    weekly_off_day: 'sunday',
    leave_quotas: { casual: 12, sick: 10, pto: 15, earned: 15 },
  })

  useEffect(() => {
    Promise.all([api.get('/scheduler/shift-types'), api.get('/scheduler/settings')])
      .then(([st, s]) => {
        setShiftTypes(st)
        setRules({
          min_rest_hours: s.min_rest_hours ?? 8,
          max_shifts_per_week: s.max_shifts_per_week ?? 6,
          weekly_off_day: s.weekly_off_day ?? 'sunday',
          leave_quotas: s.leave_quotas ?? { casual: 12, sick: 10, pto: 15, earned: 15 },
        })
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const addShift = async (shift) => {
    setError('')
    try {
      const r = await api.post('/scheduler/shift-types', shift)
      setShiftTypes(ts => [...ts, { ...shift, id: r.id }])
    } catch (e) {
      setError(e?.response?.data?.detail || e.message)
    }
  }

  const removeShift = async (id) => {
    try {
      await api.delete(`/scheduler/shift-types/${id}`)
      setShiftTypes(ts => ts.filter(t => t.id !== id))
    } catch (e) {
      setError(e.message)
    }
  }

  const finish = async () => {
    setSaving(true)
    setError('')
    try {
      await api.put('/scheduler/settings', { ...rules, setup_complete: true })
      navigate('/scheduler/groups')
    } catch (e) {
      setError(e?.response?.data?.detail || e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 size={32} className="animate-spin text-gray-300" /></div>
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-gray-800">Scheduler Setup</h1>
        <p className="text-sm text-gray-500">Configure shifts and rules for your clinic — once set, you can schedule every week in minutes</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { n: 1, label: 'Shift Types', icon: Clock },
          { n: 2, label: 'Rules & Quotas', icon: ShieldCheck },
        ].map(({ n, label, icon: Icon }) => (
          <button
            key={n}
            onClick={() => setStep(n)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              step === n ? 'text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            style={step === n ? { background: '#0F2557' } : {}}
          >
            <Icon size={14} />{n}. {label}
          </button>
        ))}
      </div>

      {error && <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

      {step === 1 && (
        <div className="card p-6">
          <h2 className="font-bold text-gray-800 mb-1">Define your clinic's shifts</h2>
          <p className="text-sm text-gray-500 mb-5">Start from the suggestions or create your own — these become the chips you drag onto the schedule board</p>

          {/* Existing shifts */}
          {shiftTypes.length > 0 && (
            <div className="mb-5">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Your shifts</div>
              <div className="space-y-2">
                {shiftTypes.map(st => (
                  <div key={st.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: st.color_hex }} />
                    <span className="font-semibold text-sm text-gray-800">{st.name}</span>
                    <span className="text-xs text-gray-500">{st.start_time} – {st.end_time}</span>
                    <button onClick={() => removeShift(st.id)} className="ml-auto text-gray-300 hover:text-red-500">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          <div className="mb-5">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Quick add</div>
            <div className="flex gap-2 flex-wrap">
              {SUGGESTED_SHIFTS.filter(s => !shiftTypes.some(t => t.name === s.name)).map(s => (
                <button
                  key={s.name}
                  onClick={() => addShift(s)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white hover:opacity-90"
                  style={{ background: s.color_hex }}
                >
                  <Plus size={12} />{s.name} {s.start_time}–{s.end_time}
                </button>
              ))}
            </div>
          </div>

          {/* Custom shift */}
          <div className="border-t border-gray-100 pt-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Custom shift</div>
            <div className="flex gap-2 flex-wrap items-end">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Name</label>
                <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none"
                  placeholder="e.g. Half Day" value={newShift.name}
                  onChange={e => setNewShift(s => ({ ...s, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Start</label>
                <input type="time" className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none"
                  value={newShift.start_time}
                  onChange={e => setNewShift(s => ({ ...s, start_time: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">End</label>
                <input type="time" className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none"
                  value={newShift.end_time}
                  onChange={e => setNewShift(s => ({ ...s, end_time: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Color</label>
                <div className="flex gap-1">
                  {COLORS.map(c => (
                    <button key={c}
                      onClick={() => setNewShift(s => ({ ...s, color_hex: c }))}
                      className={`w-7 h-7 rounded-lg ${newShift.color_hex === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
              <button
                onClick={() => { if (newShift.name.trim()) { addShift({ ...newShift, name: newShift.name.trim() }); setNewShift(s => ({ ...s, name: '' })) } }}
                className="btn-primary btn-sm"
              >
                <Plus size={13} />Add
              </button>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button onClick={() => setStep(2)} disabled={!shiftTypes.length} className="btn-primary">
              Next: Rules <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card p-6">
          <h2 className="font-bold text-gray-800 mb-1">Scheduling rules & leave quotas</h2>
          <p className="text-sm text-gray-500 mb-5">The board enforces these automatically — no accidental double shifts or overworked staff</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Min rest between shifts (hrs)</label>
              <input type="number" min="0" max="24"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                value={rules.min_rest_hours}
                onChange={e => setRules(r => ({ ...r, min_rest_hours: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Max shifts per week</label>
              <input type="number" min="1" max="7"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                value={rules.max_shifts_per_week}
                onChange={e => setRules(r => ({ ...r, max_shifts_per_week: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Default weekly off</label>
              <select className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                value={rules.weekly_off_day}
                onChange={e => setRules(r => ({ ...r, weekly_off_day: e.target.value }))}>
                {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(d => (
                  <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Annual leave quotas (days per staff)</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              ['casual', 'Casual'],
              ['sick', 'Sick'],
              ['pto', 'PTO'],
              ['earned', 'Earned'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="text-xs font-semibold text-gray-500 block mb-1">{label}</label>
                <input type="number" min="0" max="60"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  value={rules.leave_quotas[key] ?? 0}
                  onChange={e => setRules(r => ({ ...r, leave_quotas: { ...r.leave_quotas, [key]: Number(e.target.value) } }))} />
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(1)} className="btn-secondary">
              <ArrowLeft size={14} />Back
            </button>
            <button onClick={finish} disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Finish Setup → Create Groups
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
