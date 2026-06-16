import { useState, useEffect, useCallback } from 'react'
import {
  Plus, X, Lock, Loader2, MapPin, Clock, ArrowRight,
  LogIn, LogOut, Scissors, Scan, FlaskConical, Building2,
  Heart, Activity, Stethoscope, Bed, User, AlertCircle,
  ChevronDown, ChevronUp, Navigation
} from 'lucide-react'
import api from '../api/client'

const GREEN = '#065F46'
const NAVY  = '#0F2557'
const RED   = '#b91c1c'

// ─── stop type config ─────────────────────────────────────────────────────────
const STOP_TYPES = {
  admission:     { label: 'Admission',        color: '#065F46', bg: '#f0fdf4', border: '#a7f3d0', icon: LogIn },
  ward:          { label: 'Ward',             color: '#0F2557', bg: '#eff6ff', border: '#bfdbfe', icon: Bed },
  bed_change:    { label: 'Bed Change',       color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', icon: ArrowRight },
  ot:            { label: 'Operating Theatre',color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe', icon: Scissors },
  recovery:      { label: 'Recovery Room',    color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd', icon: Heart },
  radiology:     { label: 'Radiology',        color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', icon: Scan },
  lab:           { label: 'Laboratory',       color: '#a16207', bg: '#fefce8', border: '#fde68a', icon: FlaskConical },
  icu:           { label: 'ICU / HDU',        color: '#b91c1c', bg: '#fff1f2', border: '#fecdd3', icon: Activity },
  procedure:     { label: 'Procedure Room',   color: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', icon: Stethoscope },
  consult:       { label: 'Consultation',     color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: User },
  transfer:      { label: 'Ward Transfer',    color: '#9333ea', bg: '#fdf4ff', border: '#e9d5ff', icon: Building2 },
  physio:        { label: 'Physiotherapy',    color: '#0d9488', bg: '#f0fdfa', border: '#99f6e4', icon: Activity },
  discharge:     { label: 'Discharge',        color: '#065F46', bg: '#f0fdf4', border: '#a7f3d0', icon: LogOut },
}

const TYPE_OPTIONS = Object.entries(STOP_TYPES).map(([key, cfg]) => ({ key, ...cfg }))

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmtDt = d => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : null
const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : null
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null

function duration(from, to) {
  if (!from || !to) return null
  const m = Math.round((new Date(to) - new Date(from)) / 60000)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

// ─── mock ─────────────────────────────────────────────────────────────────────
function buildMock() {
  return [
    {
      id: 1, type: 'admission', current: false,
      location: 'Accident & Emergency', sub: 'Bay 4',
      arrived_at: '2026-06-14T10:20:00', departed_at: '2026-06-14T10:55:00',
      treatment: 'Presented with severe right iliac fossa pain, nausea, and low-grade fever for 18 hours. IV access established. Blood drawn for CBC, CRP, LFT. IV fluids commenced. Ondansetron given for nausea. USG abdomen requested. Surgical consult called.',
      plan: 'Urgent surgical review. NBM ordered pending surgical decision.',
      team: 'Dr. Ravi Menon (Emergency)',
    },
    {
      id: 2, type: 'radiology', current: false,
      location: 'Radiology — USG Suite', sub: 'Room 2',
      arrived_at: '2026-06-14T11:10:00', departed_at: '2026-06-14T11:45:00',
      treatment: 'Ultrasound abdomen performed. Findings: Thickened, non-compressible appendix measuring 9mm in diameter with periappendiceal fat stranding. Mild free fluid in right iliac fossa. No perforation identified.',
      plan: 'Confirmed acute appendicitis. Report sent to surgical team.',
      team: 'Dr. Suresh Pillai (Radiology)',
    },
    {
      id: 3, type: 'ward', current: false,
      location: 'Ward 3B', sub: 'Bed 8',
      arrived_at: '2026-06-14T12:00:00', departed_at: '2026-06-15T09:47:00',
      treatment: 'Admitted under surgical care. NBM maintained. IV fluids running at 125 mL/hr. IV Cefazolin and Metronidazole commenced as prophylaxis. Metformin and Aspirin held. Pre-op investigations completed: all results reviewed and cleared. Anaesthesia pre-assessment done. Surgical and anaesthesia consent obtained. Patient and family counselled regarding diagnosis and laparoscopic appendectomy.',
      plan: 'Scheduled for laparoscopic appendectomy on 15 Jun. Pre-op checklist completed. OT booked for 10:00.',
      team: 'Dr. Ananya Sharma (Surgery), Dr. Pradeep Iyer (Anaesthesia)',
    },
    {
      id: 4, type: 'ot', current: false,
      location: 'Operating Theatre 3', sub: 'OT Complex',
      arrived_at: '2026-06-15T10:12:00', departed_at: '2026-06-15T11:07:00',
      treatment: 'Laparoscopic appendectomy performed under general anaesthesia (TIVA — Propofol, Fentanyl, Sevoflurane). Three-port technique. Acutely inflamed appendix successfully removed. No perforation, no spillage. Jackson-Pratt drain placed in right iliac fossa. Fascia closed. Skin stapled. EBL: 80 mL. Swab/instrument count correct.',
      plan: 'Transfer to recovery. Post-op analgesia: Morphine PCA + Paracetamol ATC. JP drain care. DVT prophylaxis. Early mobilisation Day 1.',
      team: 'Dr. Ananya Sharma (Surgeon), Dr. Rahul Nair (Assistant), Dr. Pradeep Iyer (Anaesthetist)',
    },
    {
      id: 5, type: 'recovery', current: false,
      location: 'Post-Anaesthesia Recovery', sub: 'PACU Bay 2',
      arrived_at: '2026-06-15T11:07:00', departed_at: '2026-06-15T12:30:00',
      treatment: 'Patient extubated in OT and transferred awake. Aldrete score 10/10 on arrival. Vitals stable. Pain managed with Morphine 2mg IV (×2 doses). No nausea or vomiting. SpO₂ maintained ≥98% on 2L nasal prongs. Wound dressings intact. JP drain draining serosanguineous fluid.',
      plan: 'Transfer to ward when Aldrete ≥9 sustained for 30 minutes. Continue monitoring.',
      team: 'Recovery Nurse Divya, Dr. Pradeep Iyer (Anaesthesia)',
    },
    {
      id: 6, type: 'ward', current: true,
      location: 'Ward 3B', sub: 'Bed 12',
      arrived_at: '2026-06-15T12:30:00', departed_at: null,
      treatment: 'Post-operative Day 1. Patient alert and oriented. Pain well-controlled (score 2/10 at rest). Diet progressed: sips of water tolerated, clear fluids commenced. Bowel sounds present in all quadrants. First flatus passed. JP drain output: 180 mL total, serous. Wound sites clean and dry. Physiotherapy commenced — patient ambulating in room independently. IV antibiotics continued. DVT prophylaxis with Enoxaparin SC OD.',
      plan: 'Progress to soft diet if tolerated. Remove JP drain when output <30 mL/day × 2 days. Switch IV to oral antibiotics. Target discharge Day 2–3 post-op pending drain and diet.',
      team: 'Dr. Ananya Sharma (Surgery), Nurse Priya (Primary)',
    },
  ]
}

// ─── PIN modal ────────────────────────────────────────────────────────────────
function PinModal({ title, onConfirm, onCancel }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async () => {
    if (pin.length < 4) { setErr('Enter PIN'); return }
    setLoading(true); setErr('')
    try { await api.post('/auth/staff/pin-identify', { pin }); onConfirm() }
    catch { setErr('Invalid PIN') } finally { setLoading(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80">
        <div className="flex items-center gap-2 mb-4"><Lock size={15} style={{ color: GREEN }} /><span className="font-bold text-sm">{title}</span></div>
        <input type="password" value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Enter PIN" className="w-full border rounded-lg px-3 py-2 text-sm mb-2 outline-none" autoFocus />
        {err && <p className="text-red-600 text-xs mb-2">{err}</p>}
        <div className="flex gap-2 mt-2">
          <button onClick={onCancel} className="flex-1 py-2 rounded-lg border text-sm text-gray-600">Cancel</button>
          <button onClick={submit} disabled={loading} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center" style={{ background: GREEN }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add stop drawer ──────────────────────────────────────────────────────────
function AddStopDrawer({ onClose, onSave }) {
  const [form, setForm] = useState({
    type: 'ward', location: '', sub: '', arrived_at: '', treatment: '', plan: '', team: '', pinStep: false, pin: ''
  })
  const [loading, setLoading] = useState(false)
  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  const submit = () => {
    if (!form.location || !form.arrived_at) return
    if (!form.pinStep) { setForm(f => ({ ...f, pinStep: true })); return }
    setLoading(true)
    setTimeout(() => { onSave({ ...form, id: Date.now(), current: true, departed_at: null }); setLoading(false) }, 400)
  }

  const cfg = STOP_TYPES[form.type] || STOP_TYPES.ward

  return (
    <div className="fixed inset-0 z-40 flex" style={{ background: 'rgba(0,0,0,0.25)' }}>
      <div className="ml-auto h-full w-[380px] bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ background: NAVY }}>
          <span className="text-white font-bold text-sm">Log Movement</span>
          <button onClick={onClose}><X size={16} className="text-white" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* type selector */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">Movement Type</label>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_OPTIONS.map(t => (
                <button key={t.key} onClick={() => set('type')(t.key)}
                  className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border transition-colors"
                  style={{ background: form.type === t.key ? t.color : t.bg, color: form.type === t.key ? 'white' : t.color, borderColor: t.border }}>
                  <t.icon size={9} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Location / Destination *</label>
            <input value={form.location} onChange={e => set('location')(e.target.value)}
              placeholder={`e.g. ${cfg.label}`}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#d1d5db' }} />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Room / Bay / Bed</label>
            <input value={form.sub} onChange={e => set('sub')(e.target.value)}
              placeholder="e.g. Room 2, Bay 4, Bed 12"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#d1d5db' }} />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Time Arrived *</label>
            <input type="datetime-local" value={form.arrived_at} onChange={e => set('arrived_at')(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#d1d5db' }} />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Treatment / What was done</label>
            <textarea value={form.treatment} onChange={e => set('treatment')(e.target.value)} rows={4}
              placeholder="Describe investigations, procedures, or treatment carried out here…"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none resize-none" style={{ borderColor: '#d1d5db' }} />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Plan / Next steps</label>
            <textarea value={form.plan} onChange={e => set('plan')(e.target.value)} rows={2}
              placeholder="e.g. Transfer to ward, commence post-op care…"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none resize-none" style={{ borderColor: '#d1d5db' }} />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Team / Doctor</label>
            <input value={form.team} onChange={e => set('team')(e.target.value)}
              placeholder="e.g. Dr. Sharma (Surgery)"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#d1d5db' }} />
          </div>

          {form.pinStep && (
            <div className="rounded-lg border p-3" style={{ borderColor: '#a7f3d0', background: '#f0fdf4' }}>
              <div className="flex items-center gap-1.5 mb-2"><Lock size={11} style={{ color: GREEN }} /><span className="text-[10px] font-bold text-gray-600">Enter PIN to confirm</span></div>
              <input type="password" value={form.pin} onChange={e => set('pin')(e.target.value)}
                placeholder="PIN" className="w-full border rounded-lg px-3 py-2 text-sm outline-none" autoFocus />
            </div>
          )}
        </div>
        <div className="p-4 border-t flex gap-2 flex-shrink-0" style={{ borderColor: '#e9eaec' }}>
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1"
            style={{ background: NAVY }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : form.pinStep ? 'Log Movement' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Snake stop card ──────────────────────────────────────────────────────────
function StopCard({ stop, index, total, isEven }) {
  const [expanded, setExpanded] = useState(stop.current)
  const cfg = STOP_TYPES[stop.type] || STOP_TYPES.ward
  const Icon = cfg.icon
  const dur = duration(stop.arrived_at, stop.departed_at)
  const isCurrent = stop.current

  return (
    <div className="flex flex-col items-center" style={{ width: 220 }}>
      {/* connector line top (except first in row) — handled by row layout */}

      {/* card */}
      <div
        className="w-full rounded-2xl border-2 overflow-hidden transition-all cursor-pointer"
        style={{
          borderColor: isCurrent ? cfg.color : cfg.border,
          background: isCurrent ? cfg.bg : 'white',
          boxShadow: isCurrent ? `0 0 0 3px ${cfg.color}22, 0 4px 20px ${cfg.color}18` : '0 1px 4px rgba(0,0,0,0.06)',
        }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* card header */}
        <div className="px-4 pt-4 pb-3" style={{ background: isCurrent ? cfg.color : cfg.bg }}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: isCurrent ? 'rgba(255,255,255,0.25)' : `${cfg.color}18` }}>
                <Icon size={15} style={{ color: isCurrent ? 'white' : cfg.color }} />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: isCurrent ? 'rgba(255,255,255,0.7)' : cfg.color }}>{cfg.label}</p>
                <p className="text-xs font-bold leading-tight" style={{ color: isCurrent ? 'white' : '#111827' }}>{stop.location}</p>
              </div>
            </div>
            {isCurrent && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-white bg-white/20 px-2 py-0.5 rounded-full flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
                NOW
              </span>
            )}
          </div>
          {stop.sub && <p className="text-[10px] mt-1 ml-10" style={{ color: isCurrent ? 'rgba(255,255,255,0.7)' : cfg.color }}>{stop.sub}</p>}
        </div>

        {/* time strip */}
        <div className="px-4 py-2 border-b flex items-center justify-between" style={{ borderColor: cfg.border, background: isCurrent ? `${cfg.color}0a` : '#fafaf9' }}>
          <div className="flex items-center gap-1 text-[10px]" style={{ color: cfg.color }}>
            <Clock size={9} />
            <span className="font-semibold">{fmtDt(stop.arrived_at)}</span>
          </div>
          {dur && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{dur}</span>}
          {stop.departed_at && <div className="text-[10px] text-gray-400">{fmtTime(stop.departed_at)}</div>}
        </div>

        {/* treatment preview / expanded */}
        <div className="px-4 py-3">
          {!expanded ? (
            <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{stop.treatment}</p>
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: cfg.color }}>Treatment</p>
              <p className="text-[11px] text-gray-700 leading-relaxed mb-3">{stop.treatment}</p>
              {stop.plan && (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-gray-400">Plan</p>
                  <p className="text-[11px] text-gray-600 leading-relaxed mb-3">{stop.plan}</p>
                </>
              )}
              {stop.team && (
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t" style={{ borderColor: cfg.border }}>
                  <User size={10} style={{ color: cfg.color }} />
                  <p className="text-[10px] text-gray-500">{stop.team}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* expand toggle */}
        <button onClick={e => { e.stopPropagation(); setExpanded(p => !p) }}
          className="w-full flex items-center justify-center gap-1 py-2 border-t text-[9px] font-bold transition-colors hover:opacity-80"
          style={{ borderColor: cfg.border, color: cfg.color, background: `${cfg.color}08` }}>
          {expanded ? <><ChevronUp size={10} /> Show less</> : <><ChevronDown size={10} /> Show more</>}
        </button>
      </div>
    </div>
  )
}

// ─── Arrow connector ──────────────────────────────────────────────────────────
function Arrow({ direction = 'right', color = '#d1d5db' }) {
  if (direction === 'right') {
    return (
      <div className="flex items-center flex-shrink-0" style={{ width: 40 }}>
        <div className="flex-1 h-0.5" style={{ background: color }} />
        <div className="w-0 h-0" style={{ borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: `7px solid ${color}` }} />
      </div>
    )
  }
  if (direction === 'left') {
    return (
      <div className="flex items-center flex-shrink-0" style={{ width: 40 }}>
        <div className="w-0 h-0" style={{ borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderRight: `7px solid ${color}` }} />
        <div className="flex-1 h-0.5" style={{ background: color }} />
      </div>
    )
  }
  // down
  return (
    <div className="flex flex-col items-center flex-shrink-0" style={{ height: 36 }}>
      <div className="flex-1 w-0.5" style={{ background: color }} />
      <div className="w-0 h-0" style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `7px solid ${color}` }} />
    </div>
  )
}

// ─── "Add" node ───────────────────────────────────────────────────────────────
function AddNode({ onClick }) {
  return (
    <div className="flex flex-col items-center" style={{ width: 220 }}>
      <button onClick={onClick}
        className="w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-8 gap-2 transition-all hover:border-solid group"
        style={{ borderColor: '#d1d5db', background: '#f9fafb' }}>
        <div className="w-10 h-10 rounded-xl border-2 border-dashed flex items-center justify-center transition-colors group-hover:border-green-400 group-hover:bg-green-50" style={{ borderColor: '#d1d5db' }}>
          <Plus size={18} className="text-gray-300 group-hover:text-green-600 transition-colors" />
        </div>
        <span className="text-xs font-semibold text-gray-400 group-hover:text-green-700 transition-colors">Log next movement</span>
      </button>
    </div>
  )
}

// ─── Snake layout ─────────────────────────────────────────────────────────────
const COLS = 4 // cards per row

function SnakeLayout({ stops, onAdd }) {
  const rows = []
  let i = 0
  while (i < stops.length) {
    rows.push(stops.slice(i, i + COLS))
    i += COLS
  }

  // add the "+ node" to last row or new row
  const allWithAdd = [...stops, { __add: true }]
  const rowsWithAdd = []
  let j = 0
  while (j < allWithAdd.length) {
    rowsWithAdd.push(allWithAdd.slice(j, j + COLS))
    j += COLS
  }

  return (
    <div className="p-6 space-y-0">
      {rowsWithAdd.map((row, rowIdx) => {
        const isEven = rowIdx % 2 === 0
        const displayRow = isEven ? row : [...row].reverse()

        return (
          <div key={rowIdx}>
            {/* row of cards */}
            <div className="flex items-stretch gap-0">
              {displayRow.map((stop, colIdx) => {
                const isLast = colIdx === displayRow.length - 1
                const arrowDir = isEven ? 'right' : 'left'
                const cfg = stop.__add ? null : (STOP_TYPES[stop.type] || STOP_TYPES.ward)
                const arrowColor = cfg?.color || '#d1d5db'

                return (
                  <div key={stop.__add ? 'add' : stop.id} className="flex items-center">
                    {stop.__add
                      ? <AddNode onClick={onAdd} />
                      : <StopCard stop={stop} index={rowIdx * COLS + colIdx} isEven={isEven} />
                    }
                    {/* arrow between cards (not after last) */}
                    {!isLast && <Arrow direction={arrowDir} color={arrowColor} />}
                  </div>
                )
              })}
            </div>

            {/* down arrow connecting rows — only if there's a next row */}
            {rowIdx < rowsWithAdd.length - 1 && (
              <div className="flex" style={{ paddingLeft: isEven ? 'calc(100% - 220px - 24px)' : '0px' }}>
                <div style={{ width: 220 }}>
                  <div className="flex justify-center py-1">
                    <Arrow direction="down" color={STOP_TYPES[rowsWithAdd[rowIdx + 1][isEven ? 0 : rowsWithAdd[rowIdx + 1].length - 1]?.type]?.color || '#d1d5db'} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PatientMovement({ admission }) {
  const [stops,   setStops]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [pin,     setPin]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/inpatient/admissions/${admission?.id}/movements`)
      if (res.data?.length) setStops(res.data)
      else throw new Error('empty')
    } catch { setStops(buildMock()) } finally { setLoading(false) }
  }, [admission?.id])

  useEffect(() => { if (admission?.id) load() }, [load])

  const current = stops.find(s => s.current)
  const cfg = current ? (STOP_TYPES[current.type] || STOP_TYPES.ward) : null
  const CfgIcon = cfg?.icon

  const handleAdd = newStop => {
    setStops(prev => prev.map(s => ({ ...s, current: false, departed_at: s.departed_at || newStop.arrived_at })).concat(newStop))
    setShowAdd(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={22} className="animate-spin" style={{ color: GREEN }} />
    </div>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* current location banner */}
      {current && cfg && (
        <div className="flex-shrink-0 px-5 py-3 border-b flex items-center gap-4" style={{ background: cfg.color, borderColor: '#00000020' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <CfgIcon size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/60">Current Location</p>
              <p className="text-sm font-bold text-white">{current.location}{current.sub ? ` — ${current.sub}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-white/70 text-xs">
            <Clock size={11} />
            <span>Since {fmtDt(current.arrived_at)}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-white bg-white/20 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Patient here now
            </span>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-white"
              style={{ color: cfg.color }}>
              <Plus size={12} /> Log Movement
            </button>
          </div>
        </div>
      )}

      {/* stats strip */}
      <div className="flex-shrink-0 px-5 py-2 border-b flex items-center gap-6" style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
        <div className="flex items-center gap-1.5">
          <Navigation size={12} style={{ color: NAVY }} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Patient Journey</span>
        </div>
        <span className="text-xs text-gray-500"><b className="text-gray-800 font-bold">{stops.length}</b> stops</span>
        <span className="text-xs text-gray-500">
          Admitted <b className="text-gray-800">{fmtDate(stops[0]?.arrived_at)}</b>
        </span>
        {stops[0] && (
          <span className="text-xs text-gray-500">
            Day <b className="text-gray-800">{Math.floor((Date.now() - new Date(stops[0].arrived_at)) / 86400000) + 1}</b> of admission
          </span>
        )}
        {!current && (
          <button onClick={() => setShowAdd(true)}
            className="ml-auto flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl text-white"
            style={{ background: NAVY }}>
            <Plus size={12} /> Log Movement
          </button>
        )}
      </div>

      {/* snake */}
      <div className="flex-1 overflow-auto">
        <SnakeLayout stops={stops} onAdd={() => setShowAdd(true)} />
      </div>

      {showAdd && <AddStopDrawer onClose={() => setShowAdd(false)} onSave={handleAdd} />}
      {pin && <PinModal title={pin.title} onConfirm={() => { pin.onConfirm(); setPin(null) }} onCancel={() => setPin(null)} />}
    </div>
  )
}
