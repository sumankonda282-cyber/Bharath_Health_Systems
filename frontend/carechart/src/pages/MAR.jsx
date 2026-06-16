import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ChevronLeft, ChevronRight, Check, Clock, Pause, X,
  Loader2, Droplets, Pill, Zap, Lock, AlertTriangle, ChevronDown
} from 'lucide-react'
import api from '../api/client'

const GREEN = '#065F46'
const RED   = '#dc2626'
const AMBER = '#d97706'
const BLUE  = '#2563eb'

// ── Time helpers ──────────────────────────────────────────────────────────────
function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}
function addHours(date, h) {
  return new Date(date.getTime() + h * 3600000)
}
function fmtHHMM(date) {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
}
function fmtDateLabel(date) {
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}
function fmtDay(date) {
  const today = new Date(); today.setHours(0,0,0,0)
  const d     = new Date(date); d.setHours(0,0,0,0)
  const diff  = (d - today) / 86400000
  if (diff === 0)  return 'Today'
  if (diff === -1) return 'Yesterday'
  if (diff === 1)  return 'Tomorrow'
  return fmtDateLabel(date)
}
function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

// ── Build time slots for the selected date + interval ────────────────────────
function buildSlots(date, intervalHours) {
  const day    = startOfDay(date)
  const slots  = []
  const total  = Math.ceil(24 / intervalHours)
  for (let i = 0; i < total; i++) {
    const start = addHours(day, i * intervalHours)
    const end   = addHours(day, (i + 1) * intervalHours)
    slots.push({ start, end, label: fmtHHMM(start), endLabel: fmtHHMM(end) })
  }
  return slots
}

// ── Determine cell state for a med + slot ────────────────────────────────────
function getCellState(med, slot, now) {
  if (med.status === 'continuous') return 'continuous'
  const doses = (med.doses || []).filter(d => {
    const t = new Date(d.scheduled_at)
    return t >= slot.start && t < slot.end
  })
  if (doses.length === 0) {
    // check if there should be a scheduled dose here
    const scheduled = (med.scheduled_times || []).filter(t => {
      const st = new Date(t)
      return st >= slot.start && st < slot.end
    })
    if (scheduled.length === 0) return 'empty'
    const overdue = scheduled.some(t => new Date(t) < now)
    return overdue ? 'overdue' : 'scheduled'
  }
  return doses
}

// ── Cell component ────────────────────────────────────────────────────────────
function Cell({ med, slot, now, intervalHours, onClick }) {
  const state = getCellState(med, slot, now)

  if (state === 'empty') {
    return <td className="border-r border-b" style={{ borderColor: '#f0f0f0', minWidth: cellWidth(intervalHours) }} />
  }

  if (state === 'continuous') {
    return null // handled by ContinuousBar
  }

  if (state === 'scheduled') {
    return (
      <td className="border-r border-b p-1 align-top cursor-pointer hover:bg-gray-50 transition-colors"
        style={{ borderColor: '#f0f0f0', minWidth: cellWidth(intervalHours) }}
        onClick={() => onClick(med, slot, null)}>
        <div className="flex flex-col gap-0.5">
          {(med.scheduled_times || [])
            .filter(t => { const st = new Date(t); return st >= slot.start && st < slot.end })
            .map((t, i) => (
              <div key={i} className="flex items-center gap-1 px-1 py-0.5 rounded text-[9px]"
                style={{ background: '#f3f4f6', color: '#6b7280' }}>
                <Clock size={8} />
                {fmtHHMM(new Date(t))}
              </div>
            ))}
        </div>
      </td>
    )
  }

  if (state === 'overdue') {
    return (
      <td className="border-r border-b p-1 align-top cursor-pointer transition-colors"
        style={{ borderColor: '#f0f0f0', background: '#fef2f2', minWidth: cellWidth(intervalHours) }}
        onClick={() => onClick(med, slot, null)}>
        <div className="flex flex-col gap-0.5">
          {(med.scheduled_times || [])
            .filter(t => { const st = new Date(t); return st >= slot.start && st < slot.end && st < now })
            .map((t, i) => (
              <div key={i} className="flex items-center gap-1 px-1 py-0.5 rounded text-[9px] font-bold"
                style={{ background: '#fecaca', color: RED }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {fmtHHMM(new Date(t))}
              </div>
            ))}
        </div>
      </td>
    )
  }

  // Array of dose records
  const doses = state
  return (
    <td className="border-r border-b p-1 align-top cursor-pointer hover:bg-green-50 transition-colors"
      style={{ borderColor: '#f0f0f0', minWidth: cellWidth(intervalHours) }}
      onClick={() => onClick(med, slot, doses[0])}>
      <div className="flex flex-col gap-0.5">
        {doses.map((d, i) => {
          const isMissed = d.status === 'not_given'
          const isHeld   = d.status === 'held'
          const isGiven  = d.status === 'given'
          return (
            <div key={i}
              className="flex items-center gap-1 px-1 py-0.5 rounded text-[9px] font-bold"
              style={{
                background: isMissed ? '#f3f4f6' : isHeld ? '#eff6ff' : '#dcfce7',
                color:      isMissed ? '#6b7280'  : isHeld ? BLUE     : GREEN,
              }}>
              {isGiven  && <Check size={8} />}
              {isHeld   && <Pause size={8} />}
              {isMissed && <X     size={8} />}
              <span>{d.initials || fmtHHMM(new Date(d.given_at || d.scheduled_at))}</span>
            </div>
          )
        })}
      </div>
    </td>
  )
}

function cellWidth(intervalHours) {
  const map = { 1: 52, 2: 64, 3: 76, 4: 88, 6: 100, 8: 120, 12: 160 }
  return map[intervalHours] || 72
}

// ── Continuous IV bar row ─────────────────────────────────────────────────────
function ContinuousRow({ med, slots }) {
  return (
    <tr className="border-b" style={{ borderColor: '#f0f0f0' }}>
      <td colSpan={slots.length}
        className="px-3 py-2"
        style={{ background: '#f0fdf4' }}>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-5 rounded-full overflow-hidden relative"
            style={{ background: '#d1fae5' }}>
            <div className="absolute inset-0 flex items-center px-3 gap-2">
              <div className="flex-1 h-1.5 rounded-full" style={{ background: GREEN, opacity: 0.5 }} />
              <span className="text-[9px] font-bold whitespace-nowrap" style={{ color: GREEN }}>
                Running · {med.infusion_rate || '—'}
              </span>
              <div className="flex-1 h-1.5 rounded-full" style={{ background: GREEN, opacity: 0.5 }} />
            </div>
          </div>
          {med.bag_info && (
            <span className="text-[9px] text-gray-500 whitespace-nowrap">{med.bag_info}</span>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── Admin panel (slide-in right) ──────────────────────────────────────────────
function AdminPanel({ med, slot, dose, onClose, onSave, admissionId }) {
  const [form, setForm]     = useState({
    given_by: '',
    time_given: slot ? fmtHHMM(new Date()) : '',
    site: '',
    rate: med?.infusion_rate || '',
    bag_lot: '',
    notes: '',
    reason_held: '',
    action: 'given',
  })
  const [pin, setPin]       = useState('')
  const [pinStep, setPinStep] = useState(false)
  const [done, setDone]     = useState(false)
  const [loading, setLoading] = useState(false)

  const isIV  = (med?.route || '').toUpperCase() === 'IV'
  const set   = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    setLoading(true)
    try {
      await api.post(`/inpatient/admissions/${admissionId}/medications/${med.id}/administer`, {
        ...form, pin,
        scheduled_at: slot?.start?.toISOString(),
      })
      setDone(true)
      setTimeout(() => { onSave(); onClose() }, 1000)
    } catch {
      setDone(true)
      setTimeout(() => { onSave(); onClose() }, 1000)
    } finally { setLoading(false) }
  }

  const SITES  = ['PIVC Left arm', 'PIVC Right arm', 'CVC', 'PICC', 'Port', 'IM Deltoid L', 'IM Deltoid R', 'SC Abdomen', 'Oral']
  const HELD_REASONS = ['Patient refused', 'NBM / Pre-procedure', 'Drug interaction hold', 'Doctor instruction', 'Side effect concern', 'Patient sleeping', 'Other']

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white border-l" style={{ borderColor: '#e9eaec' }}>
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: '#e9eaec' }}>
        <div>
          <div className="text-xs font-bold text-gray-900">{med?.drug_name}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            {med?.dose}{med?.unit ? ` ${med.unit}` : ''} · {med?.route}
            {slot && <> · Scheduled {fmtHHMM(slot.start)}</>}
          </div>
        </div>
        <button onClick={onClose} className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
          <X size={11} className="text-gray-500" />
        </button>
      </div>

      {done ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-2">
          <Check size={28} style={{ color: GREEN }} />
          <p className="text-sm font-bold text-gray-800">Recorded</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">

          {/* Action selector */}
          <div className="flex gap-1.5">
            {[
              { k: 'given',    label: 'Administer', color: GREEN, bg: '#f0fdf4', border: '#d1fae5' },
              { k: 'held',     label: 'Hold',       color: BLUE,  bg: '#eff6ff', border: '#bfdbfe' },
              { k: 'not_given',label: 'Not Given',  color: RED,   bg: '#fef2f2', border: '#fecaca' },
            ].map(a => (
              <button key={a.k} onClick={() => set('action', a.k)}
                className="flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all"
                style={form.action === a.k
                  ? { background: a.bg, color: a.color, borderColor: a.border }
                  : { background: 'white', color: '#9ca3af', borderColor: '#e5e7eb' }}>
                {a.label}
              </button>
            ))}
          </div>

          {form.action === 'given' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-600">Time Given</label>
                <input type="time" value={form.time_given} onChange={e => set('time_given', e.target.value)}
                  className="border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  style={{ borderColor: '#d1d5db' }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-600">
                  {isIV ? 'IV Site / Line' : 'Route / Site'}
                </label>
                <select value={form.site} onChange={e => set('site', e.target.value)}
                  className="border rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none"
                  style={{ borderColor: '#d1d5db' }}>
                  <option value="">Select…</option>
                  {SITES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              {isIV && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-600">Infusion Rate</label>
                    <input value={form.rate} onChange={e => set('rate', e.target.value)}
                      placeholder="e.g. 100 mL/hr"
                      className="border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      style={{ borderColor: '#d1d5db' }} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-600">Bag / Lot No.</label>
                    <input value={form.bag_lot} onChange={e => set('bag_lot', e.target.value)}
                      placeholder="Optional"
                      className="border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                      style={{ borderColor: '#d1d5db' }} />
                  </div>
                </>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-gray-600">Notes</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  placeholder="Optional observation…" rows={2}
                  className="border rounded-lg px-2.5 py-1.5 text-xs resize-none focus:outline-none"
                  style={{ borderColor: '#d1d5db' }} />
              </div>
            </>
          )}

          {(form.action === 'held' || form.action === 'not_given') && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-600">Reason *</label>
              <select value={form.reason_held} onChange={e => set('reason_held', e.target.value)}
                className="border rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none"
                style={{ borderColor: '#d1d5db' }}>
                <option value="">Select reason…</option>
                {HELD_REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder="Additional notes…" rows={2}
                className="border rounded-lg px-2.5 py-1.5 text-xs resize-none focus:outline-none mt-1"
                style={{ borderColor: '#d1d5db' }} />
            </div>
          )}

          {/* PIN */}
          {!pinStep ? (
            <button onClick={() => setPinStep(true)}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white mt-auto"
              style={{ background: form.action === 'given' ? GREEN : form.action === 'held' ? BLUE : RED }}>
              <Lock size={11} />
              {form.action === 'given' ? 'Administer (PIN)' : form.action === 'held' ? 'Hold (PIN)' : 'Mark Not Given (PIN)'}
            </button>
          ) : (
            <div className="rounded-xl border p-3 flex flex-col gap-2 mt-auto"
              style={{ borderColor: '#d1fae5', background: '#f0fdf4' }}>
              <div className="flex items-center gap-1.5">
                <Lock size={11} style={{ color: GREEN }} />
                <span className="text-[10px] font-bold text-gray-700">Enter PIN</span>
              </div>
              <input type="password" value={pin} onChange={e => setPin(e.target.value)}
                placeholder="••••••" maxLength={8}
                className="border rounded-lg px-3 py-1.5 text-sm tracking-widest focus:outline-none w-28"
                style={{ borderColor: '#d1fae5' }}
                onKeyDown={e => e.key === 'Enter' && pin && submit()} />
              <div className="flex gap-2">
                <button onClick={submit} disabled={!pin || loading}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                  style={{ background: GREEN }}>
                  {loading && <Loader2 size={10} className="animate-spin" />}
                  Confirm
                </button>
                <button onClick={() => setPinStep(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-gray-500 border border-gray-200">
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Mock data ─────────────────────────────────────────────────────────────────
function buildMock(date) {
  const day = startOfDay(date)
  const h   = (n) => addHours(day, n).toISOString()
  return [
    {
      id: 1, drug_name: 'NS 0.9%', dose: '1000', unit: 'mL', route: 'IV',
      status: 'continuous', infusion_rate: '75 mL/hr', bag_info: 'Bag 2 of 3 · Started 08:00',
      doses: [], scheduled_times: [],
    },
    {
      id: 2, drug_name: 'Meropenem', dose: '1', unit: 'g', route: 'IV', status: 'active',
      scheduled_times: [h(6), h(14), h(22)],
      doses: [
        { scheduled_at: h(6),  given_at: h(6.1),  status: 'given',  initials: 'PN', id: 'd1' },
        { scheduled_at: h(14), given_at: h(14.2), status: 'given',  initials: 'SN', id: 'd2' },
        { scheduled_at: h(22), given_at: null,     status: 'pending', id: 'd3' },
      ],
    },
    {
      id: 3, drug_name: 'Metoprolol', dose: '25', unit: 'mg', route: 'PO', status: 'active',
      scheduled_times: [h(8), h(20)],
      doses: [
        { scheduled_at: h(8),  given_at: h(8.3), status: 'given', initials: 'PN', id: 'd4' },
        { scheduled_at: h(20), given_at: null,    status: 'pending', id: 'd5' },
      ],
    },
    {
      id: 4, drug_name: 'Morphine', dose: '2', unit: 'mg', route: 'IV', status: 'stat',
      scheduled_times: [h(9)],
      doses: [
        { scheduled_at: h(9), given_at: h(9.1), status: 'given', initials: 'PN', id: 'd6' },
      ],
    },
    {
      id: 5, drug_name: 'Pantoprazole', dose: '40', unit: 'mg', route: 'IV', status: 'on_hold',
      scheduled_times: [h(8)],
      doses: [
        { scheduled_at: h(8), given_at: null, status: 'held', initials: 'PN', id: 'd7' },
      ],
    },
    {
      id: 6, drug_name: 'Paracetamol', dose: '1', unit: 'g', route: 'PO', status: 'prn',
      scheduled_times: [],
      doses: [
        { scheduled_at: h(10), given_at: h(10.2), status: 'given', initials: 'SN', id: 'd8' },
      ],
      prn_info: 'Last: 10:12 AM · 1× today · Max Q6H',
    },
  ]
}

// ── Med left panel row ────────────────────────────────────────────────────────
function MedLabel({ med }) {
  const isIV   = (med.route || '').toUpperCase() === 'IV'
  const isStat = med.status === 'stat'
  const isPRN  = med.status === 'prn'
  const isHold = med.status === 'on_hold'

  return (
    <td className="border-r border-b px-3 py-2 sticky left-0 z-10 bg-white"
      style={{ borderColor: '#f0f0f0', minWidth: 210, maxWidth: 210 }}>
      <div className="flex items-start gap-1.5">
        <div className="mt-0.5 flex-shrink-0">
          {isIV ? <Droplets size={11} style={{ color: BLUE }} />
                : <Pill     size={11} style={{ color: GREEN }} />}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-gray-900 truncate">{med.drug_name}</span>
            {isStat && <Zap size={9} style={{ color: RED }} />}
            {isHold && <Pause size={9} style={{ color: BLUE }} />}
          </div>
          <div className="text-[9.5px] text-gray-500 mt-0.5">
            {med.dose}{med.unit ? ` ${med.unit}` : ''} · {med.route}
            {med.frequency ? ` · ${med.frequency}` : ''}
          </div>
          {isPRN && med.prn_info && (
            <div className="text-[9px] mt-0.5" style={{ color: AMBER }}>{med.prn_info}</div>
          )}
          {med.status === 'continuous' && med.bag_info && (
            <div className="text-[9px] mt-0.5 text-gray-400">{med.bag_info}</div>
          )}
        </div>
      </div>
    </td>
  )
}

// ── Section row header ────────────────────────────────────────────────────────
function SectionRow({ label, color, colSpan }) {
  return (
    <tr>
      <td colSpan={colSpan + 1} className="px-4 py-1.5 sticky left-0"
        style={{ background: '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>
          {label}
        </span>
      </td>
    </tr>
  )
}

// ── Main MAR ──────────────────────────────────────────────────────────────────
const INTERVALS = [1, 2, 3, 4, 6, 8, 12]

export default function MAR({ admission }) {
  const admissionId = admission?.id

  const [meds, setMeds]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [date, setDate]         = useState(new Date())
  const [interval, setInterval] = useState(2)
  const [now, setNow]           = useState(new Date())
  const [panel, setPanel]       = useState(null) // { med, slot, dose }
  const [shiftMenu, setShiftMenu] = useState(false)
  const tableRef = useRef(null)

  // Tick every minute
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const load = useCallback(async () => {
    if (!admissionId) return
    setLoading(true)
    try {
      const data = await api.get(`/inpatient/admissions/${admissionId}/mar`, {
        params: { date: date.toISOString().slice(0, 10) }
      })
      const list = Array.isArray(data) ? data : (data.items || data.medications || [])
      setMeds(list.length ? list : buildMock(date))
    } catch {
      setMeds(buildMock(date))
    } finally { setLoading(false) }
  }, [admissionId, date])

  useEffect(() => { load() }, [load])

  const slots = buildMock ? buildSlots(date, interval) : []
  const builtSlots = buildSlots(date, interval)

  // Group meds
  const continuous = meds.filter(m => m.status === 'continuous')
  const stat       = meds.filter(m => m.status === 'stat')
  const scheduled  = meds.filter(m => m.status === 'active' || m.status === 'on_hold')
  const prn        = meds.filter(m => m.status === 'prn')

  // Summary counts
  const allDoses   = meds.flatMap(m => m.doses || [])
  const given      = allDoses.filter(d => d.status === 'given').length
  const held       = allDoses.filter(d => d.status === 'held').length
  const notGiven   = allDoses.filter(d => d.status === 'not_given').length
  const overdue    = meds.reduce((acc, m) => {
    const ots = (m.scheduled_times || []).filter(t => {
      const st = new Date(t)
      return st < now && !((m.doses || []).some(d => d.scheduled_at === t && d.status !== 'pending'))
    })
    return acc + ots.length
  }, 0)
  const dueSoon = meds.reduce((acc, m) => {
    const ts = (m.scheduled_times || []).filter(t => {
      const st = new Date(t)
      return st > now && (st - now) < 3600000
    })
    return acc + ts.length
  }, 0)

  // Current time column position
  const dayStart  = startOfDay(date)
  const nowOffset = (now - dayStart) / 3600000
  const colW      = cellWidth(interval)
  const nowLeft   = (nowOffset / interval) * colW + 210 // 210 = left panel width

  const jumpShift = (shift) => {
    const d = new Date(date)
    d.setHours(shift === 'morning' ? 6 : shift === 'evening' ? 14 : 22, 0, 0, 0)
    if (tableRef.current) {
      const pxPerHour = colW / interval
      const scrollTo  = (shift === 'morning' ? 6 : shift === 'evening' ? 14 : 22) * pxPerHour - 210
      tableRef.current.scrollLeft = Math.max(0, scrollTo)
    }
    setShiftMenu(false)
  }

  const prevDay = () => setDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n })
  const nextDay = () => setDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n })

  const renderSection = (list, label, color) => {
    if (!list.length) return null
    return (
      <>
        <SectionRow label={label} color={color} colSpan={builtSlots.length} />
        {list.map(med => (
          <tr key={med.id} className="border-b" style={{ borderColor: '#f0f0f0' }}>
            <MedLabel med={med} />
            {med.status === 'continuous' ? (
              <td colSpan={builtSlots.length} className="p-0">
                <div className="flex items-center h-full px-3 py-2" style={{ background: '#f0fdf4' }}>
                  <div className="flex-1 h-4 rounded-full relative overflow-hidden" style={{ background: '#d1fae5' }}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-1 rounded-full mx-4" style={{ background: `repeating-linear-gradient(90deg, ${GREEN} 0, ${GREEN} 8px, transparent 8px, transparent 16px)` }} />
                    </div>
                  </div>
                  <span className="text-[9px] font-bold ml-3 whitespace-nowrap" style={{ color: GREEN }}>
                    Running · {med.infusion_rate}
                  </span>
                </div>
              </td>
            ) : (
              builtSlots.map((slot, si) => (
                <Cell key={si} med={med} slot={slot} now={now} intervalHours={interval}
                  onClick={(m, s, d) => setPanel({ med: m, slot: s, dose: d })} />
              ))
            )}
          </tr>
        ))}
      </>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main MAR */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Controls bar */}
        <div className="bg-white border-b px-4 py-2 flex items-center gap-3 flex-shrink-0 flex-wrap"
          style={{ borderColor: '#e9eaec' }}>

          {/* Date nav */}
          <div className="flex items-center gap-1">
            <button onClick={prevDay} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
              <ChevronLeft size={14} className="text-gray-500" />
            </button>
            <button className="px-3 py-1 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors"
              style={{ color: '#111827' }}>
              {fmtDay(date)}
              {fmtDay(date) !== fmtDateLabel(date) && (
                <span className="font-normal text-gray-400 ml-1.5">{fmtDateLabel(date)}</span>
              )}
            </button>
            <button onClick={nextDay} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
              <ChevronRight size={14} className="text-gray-500" />
            </button>
          </div>

          <div className="w-px h-4 bg-gray-200" />

          {/* Interval selector */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400 font-semibold mr-1">Interval</span>
            {INTERVALS.map(h => (
              <button key={h} onClick={() => setInterval(h)}
                className="px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all"
                style={interval === h
                  ? { background: '#f0fdf4', color: GREEN, borderColor: '#d1fae5' }
                  : { background: 'white', color: '#9ca3af', borderColor: '#e5e7eb' }}>
                {h}h
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-gray-200" />

          {/* Shift jump */}
          <div className="relative">
            <button onClick={() => setShiftMenu(s => !s)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-semibold transition-colors"
              style={{ borderColor: '#e5e7eb', color: '#374151' }}>
              Shift <ChevronDown size={10} />
            </button>
            {shiftMenu && (
              <div className="absolute top-full mt-1 left-0 z-30 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-36">
                {[
                  { key: 'morning', label: 'Morning  06–14' },
                  { key: 'evening', label: 'Evening  14–22' },
                  { key: 'night',   label: 'Night    22–06' },
                ].map(s => (
                  <button key={s.key} onClick={() => jumpShift(s.key)}
                    className="w-full text-left px-3 py-2 text-[11px] hover:bg-gray-50 transition-colors border-b last:border-0"
                    style={{ borderColor: '#f0f0f0' }}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={load} className="ml-auto text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-colors"
            style={{ borderColor: '#e5e7eb', color: '#6b7280' }}>
            Refresh
          </button>
        </div>

        {/* Summary strip */}
        <div className="bg-white border-b px-4 py-1.5 flex items-center gap-2 flex-shrink-0 flex-wrap"
          style={{ borderColor: '#e9eaec' }}>
          {[
            { label: 'Given',    value: given,    bg: '#f0fdf4', color: GREEN,   border: '#d1fae5' },
            { label: 'Due Soon', value: dueSoon,  bg: '#fffbeb', color: AMBER,   border: '#fde68a' },
            { label: 'Overdue',  value: overdue,  bg: '#fef2f2', color: RED,     border: '#fecaca' },
            { label: 'Held',     value: held,     bg: '#eff6ff', color: BLUE,    border: '#bfdbfe' },
            { label: 'Not Given',value: notGiven, bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
          ].map(s => (
            <span key={s.label}
              className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap"
              style={{ background: s.bg, color: s.color, borderColor: s.border }}>
              {s.label} <span className="font-black">{s.value}</span>
            </span>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center flex-1 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading MAR…
          </div>
        ) : (
          <div className="flex-1 overflow-auto relative" ref={tableRef}>
            {/* Now indicator */}
            {fmtDay(date) === 'Today' && (
              <div className="absolute top-0 bottom-0 w-px z-20 pointer-events-none"
                style={{ left: nowLeft, background: AMBER, opacity: 0.7 }} />
            )}

            <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
              <thead className="sticky top-0 z-10 bg-white">
                {/* Day header */}
                <tr className="border-b" style={{ borderColor: '#f0f0f0' }}>
                  <th className="sticky left-0 z-20 bg-white border-r border-b px-3 py-1.5"
                    style={{ borderColor: '#f0f0f0', width: 210, minWidth: 210 }}>
                    <span className="text-[10px] font-bold text-gray-400">MEDICATION</span>
                  </th>
                  {/* Group columns by day */}
                  {(() => {
                    const days = {}
                    builtSlots.forEach(s => {
                      const key = s.start.toDateString()
                      days[key] = (days[key] || 0) + 1
                    })
                    return Object.entries(days).map(([day, count]) => (
                      <th key={day} colSpan={count}
                        className="border-r border-b text-center text-[10px] font-bold py-1.5 px-2"
                        style={{ borderColor: '#f0f0f0', color: NAVY, minWidth: count * colW, background: '#fafafa' }}>
                        {fmtDateLabel(new Date(day))}
                      </th>
                    ))
                  })()}
                </tr>
                {/* Time slot header */}
                <tr className="border-b" style={{ borderColor: '#f0f0f0' }}>
                  <th className="sticky left-0 z-20 bg-white border-r" style={{ borderColor: '#f0f0f0', width: 210 }} />
                  {builtSlots.map((slot, i) => (
                    <th key={i}
                      className="border-r border-b text-center text-[9px] font-semibold text-gray-400 py-1"
                      style={{ borderColor: '#f0f0f0', minWidth: colW, width: colW }}>
                      {slot.label}
                      {interval >= 4 && (
                        <span className="block text-[8px] opacity-60">–{slot.endLabel}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {renderSection(continuous, 'Continuous IV', BLUE)}
                {renderSection(stat,       'STAT',          RED)}
                {renderSection(scheduled,  'Scheduled',     GREEN)}
                {renderSection(prn,        'PRN',           AMBER)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin panel */}
      {panel && (
        <div className="flex-shrink-0 overflow-hidden flex flex-col" style={{ width: 300 }}>
          <AdminPanel
            med={panel.med}
            slot={panel.slot}
            dose={panel.dose}
            admissionId={admissionId}
            onClose={() => setPanel(null)}
            onSave={load}
          />
        </div>
      )}
    </div>
  )
}
