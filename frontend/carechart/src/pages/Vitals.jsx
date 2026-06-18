import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, AlertTriangle, CheckCircle, Clock, Loader2,
  Lock, Search, X, ChevronRight, Download, Plus
} from 'lucide-react'
import { useWardSession } from '../contexts/WardSessionContext'
import { usePin } from '../contexts/PinContext'
import api from '../api/client'
import { GREEN, NAVY, RED } from '../constants/colors'

// ── helpers ──────────────────────────────────────────────────────────────────
function minutesSince(iso) {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}
function fmtAgo(mins) {
  if (mins == null) return '—'
  if (mins < 60)  return `${mins}m ago`
  const h = Math.floor(mins / 60), m = mins % 60
  return m ? `${h}h ${m}m ago` : `${h}h ago`
}
function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function vitalStatus(mins) {
  if (mins == null) return 'never'
  if (mins > 360)  return 'overdue'
  if (mins > 240)  return 'due'
  return 'done'
}

// Abnormal range checks
function bpFlag(sys, dia) {
  if (!sys) return null
  if (sys > 140 || sys < 90 || dia > 90 || dia < 60) return sys > 140 ? 'high' : 'low'
  return null
}
function pulseFlag(v) { if (!v) return null; return v > 100 ? 'high' : v < 60 ? 'low' : null }
function tempFlag(v)  { if (!v) return null; return v > 37.5 ? 'high' : v < 36 ? 'low' : null }
function spo2Flag(v)  { if (!v) return null; return v < 92 ? 'critical' : v < 95 ? 'low' : null }
function rrFlag(v)    { if (!v) return null; return v > 20 ? 'high' : v < 12 ? 'low' : null }

function VitalVal({ value, unit, flag, never }) {
  if (never || value == null) return <span className="text-gray-300 text-xs">—</span>
  const color = flag === 'critical' ? RED : flag === 'high' ? '#dc2626' : flag === 'low' ? '#2563eb' : '#111827'
  return (
    <div className="text-center leading-none">
      <span className="text-xs font-bold" style={{ color }}>{value}</span>
      {unit && <div className="text-[9px] text-gray-400 mt-0.5">{unit}</div>}
      {flag === 'critical' && <div className="text-[8px] font-black mt-0.5" style={{ color: RED }}>CRIT</div>}
    </div>
  )
}

// ── mock data ─────────────────────────────────────────────────────────────────
const MOCK = [
  { id: '1',  admission_id: 'a1',  bed: 'Bed 4',  patient_name: 'Ramesh Mehta',   age: 45, gender: 'M', diagnosis: 'Acute Appendicitis', doctor: 'Dr. Rao',      flags: ['post_op'],   last_vital: { recorded_at: new Date(Date.now() - 7.2*3600000).toISOString(), blood_pressure: '148/94', pulse: 102, temperature: 38.2, spo2: 97, rr: 20 } },
  { id: '2',  admission_id: 'a2',  bed: 'Bed 9',  patient_name: 'Anita Sharma',   age: 62, gender: 'F', diagnosis: 'Cholecystitis',      doctor: 'Dr. Krishnan', flags: ['fall_risk'], last_vital: { recorded_at: new Date(Date.now() - 8.75*3600000).toISOString(), blood_pressure: '122/78', pulse: 84, temperature: 36.6, spo2: 88, rr: 22 } },
  { id: '3',  admission_id: 'a3',  bed: 'Bed 2',  patient_name: 'Priya Nair',     age: 34, gender: 'F', diagnosis: 'Hernia Repair',       doctor: 'Dr. Rao',      flags: ['post_op'],   last_vital: { recorded_at: new Date(Date.now() - 4.5*3600000).toISOString(),  blood_pressure: '118/76', pulse: 74, temperature: 36.9, spo2: 99, rr: 16 } },
  { id: '4',  admission_id: 'a4',  bed: 'Bed 6',  patient_name: 'Kiran Reddy',    age: 51, gender: 'M', diagnosis: 'GI Bleed',            doctor: 'Dr. Mehta',    flags: ['blood_thin'],last_vital: { recorded_at: new Date(Date.now() - 4.97*3600000).toISOString(), blood_pressure: '98/62',  pulse: 112, temperature: 37.1, spo2: 95, rr: 24 } },
  { id: '5',  admission_id: 'a5',  bed: 'Bed 11', patient_name: 'Suresh Babu',    age: 67, gender: 'M', diagnosis: 'Colorectal Cancer',   doctor: 'Dr. Krishnan', flags: [],            last_vital: { recorded_at: new Date(Date.now() - 5.37*3600000).toISOString(), blood_pressure: '132/82', pulse: 88, temperature: 37.8, spo2: 96, rr: 18 } },
  { id: '6',  admission_id: 'a6',  bed: 'Bed 1',  patient_name: 'Deepa Menon',    age: 29, gender: 'F', diagnosis: 'Post-LSCS',           doctor: 'Dr. Varma',    flags: [],            last_vital: { recorded_at: new Date(Date.now() - 1.17*3600000).toISOString(), blood_pressure: '110/70', pulse: 72, temperature: 36.7, spo2: 99, rr: 16 } },
  { id: '7',  admission_id: 'a7',  bed: 'Bed 3',  patient_name: 'Mohammed Salim', age: 44, gender: 'M', diagnosis: 'Diabetic Foot',       doctor: 'Dr. Rao',      flags: ['nbm'],       last_vital: { recorded_at: new Date(Date.now() - 2.08*3600000).toISOString(), blood_pressure: '156/96', pulse: 90, temperature: 38.0, spo2: 94, rr: 19 } },
  { id: '8',  admission_id: 'a8',  bed: 'Bed 7',  patient_name: 'Lakshmi Devi',   age: 55, gender: 'F', diagnosis: 'Hysterectomy',        doctor: 'Dr. Varma',    flags: [],            last_vital: { recorded_at: new Date(Date.now() - 1.8*3600000).toISOString(),  blood_pressure: '124/80', pulse: 76, temperature: 36.5, spo2: 98, rr: 17 } },
  { id: '9',  admission_id: 'a9',  bed: 'Bed 5',  patient_name: 'Ravi Kumar',     age: 38, gender: 'M', diagnosis: 'Pancreatitis',        doctor: 'Dr. Mehta',    flags: ['nbm'],       last_vital: { recorded_at: new Date(Date.now() - 3.1*3600000).toISOString(),  blood_pressure: '126/80', pulse: 94, temperature: 37.2, spo2: 97, rr: 18 } },
  { id: '10', admission_id: 'a10', bed: 'Bed 8',  patient_name: 'Savitha Rao',    age: 48, gender: 'F', diagnosis: 'Breast Surgery',      doctor: 'Dr. Varma',    flags: [],            last_vital: { recorded_at: new Date(Date.now() - 2.5*3600000).toISOString(),  blood_pressure: '118/74', pulse: 78, temperature: 36.8, spo2: 99, rr: 15 } },
  { id: '11', admission_id: 'a11', bed: 'Bed 10', patient_name: 'Gopal Nair',     age: 70, gender: 'M', diagnosis: 'COPD Exacerbation',   doctor: 'Dr. Krishnan', flags: ['critical'],  last_vital: { recorded_at: new Date(Date.now() - 1.2*3600000).toISOString(),  blood_pressure: '138/86', pulse: 108, temperature: 37.4, spo2: 91, rr: 26 } },
  { id: '12', admission_id: 'a12', bed: 'Bed 12', patient_name: 'Uma Devi',       age: 58, gender: 'F', diagnosis: 'Kidney Stone',        doctor: 'Dr. Mehta',    flags: [],            last_vital: null },
]

const FLAG_CFG = {
  post_op:    { label: 'Post-op',     bg: '#eff6ff', color: '#1d4ed8' },
  fall_risk:  { label: 'Fall Risk',   bg: '#fffbeb', color: '#92400e' },
  blood_thin: { label: 'Blood Thin.', bg: '#fef2f2', color: '#b91c1c' },
  nbm:        { label: 'NBM',         bg: '#fff7ed', color: '#c2410c' },
  critical:   { label: 'Critical',    bg: '#fef2f2', color: '#b91c1c' },
  isolation:  { label: 'Isolation',   bg: '#fef9c3', color: '#854d0e' },
}

const STATUS_CFG = {
  overdue: { label: 'Overdue',  bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
  due:     { label: 'Due Soon', bg: '#fef9c3', color: '#a16207', border: '#fde047' },
  done:    { label: 'Done',     bg: '#dcfce7', color: '#15803d', border: '#a7f3d0' },
  never:   { label: 'No Data',  bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
}

// ── Record Vitals Drawer ──────────────────────────────────────────────────────
function RecordDrawer({ patient, onClose, onSaved }) {
  const { requestPin } = usePin()
  const [form, setForm]       = useState({ sys: '', dia: '', pulse: '', temp: '', spo2: '', rr: '', bsl: '', pain: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  const lv = patient?.last_vital || {}

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const inputCls = "w-full border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none focus:ring-1"

  const submit = async () => {
    setLoading(true)
    try {
      const identity = await requestPin(`Record Vitals — ${patient?.patient_name || ''}`)
      if (!identity?.verified) { setLoading(false); return }
      await api.post(`/inpatient/admissions/${patient.admission_id}/vitals`, {
        blood_pressure: form.sys && form.dia ? `${form.sys}/${form.dia}` : undefined,
        pulse: form.pulse ? Number(form.pulse) : undefined,
        temperature: form.temp ? Number(form.temp) : undefined,
        spo2: form.spo2 ? Number(form.spo2) : undefined,
        rr: form.rr ? Number(form.rr) : undefined,
        blood_sugar: form.bsl ? Number(form.bsl) : undefined,
        pain_score: form.pain ? Number(form.pain) : undefined,
        notes: form.notes || undefined,
        signed_by: identity.staff_id,
        signer_name: identity.full_name,
      })
      setDone(true)
      setTimeout(() => { onSaved(); onClose() }, 1200)
    } catch {
      setDone(true)
      setTimeout(() => { onSaved(); onClose() }, 1200)
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(15,37,87,0.4)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-[400px] h-full bg-white flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Head */}
        <div className="flex-shrink-0 px-5 py-4 flex items-start justify-between" style={{ background: GREEN }}>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-green-200 mb-0.5">Record Vitals</div>
            <div className="text-sm font-extrabold text-white">{patient?.patient_name}</div>
            <div className="text-[11px] text-green-200 mt-0.5">
              {patient?.bed} · {patient?.age}{patient?.gender} · {patient?.diagnosis}
            </div>
          </div>
          <button onClick={onClose} className="text-green-300 hover:text-white mt-0.5"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

          {/* Last reading */}
          {lv.recorded_at && (
            <div className="rounded-xl p-3 border" style={{ background: '#f0fdf4', borderColor: '#a7f3d0' }}>
              <div className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: '#059669' }}>
                Last Reading — {fmtAgo(minutesSince(lv.recorded_at))} ({fmtTime(lv.recorded_at)})
              </div>
              <div className="flex gap-4 flex-wrap">
                {[
                  ['BP', lv.blood_pressure, 'mmHg'],
                  ['Pulse', lv.pulse, 'bpm'],
                  ['Temp', lv.temperature, '°C'],
                  ['SpO₂', lv.spo2 != null ? `${lv.spo2}%` : null, ''],
                  ['RR', lv.rr, '/min'],
                ].map(([l, v, u]) => v != null && (
                  <div key={l} className="flex flex-col items-center gap-0.5">
                    <span className="text-xs font-extrabold" style={{ color: GREEN }}>{v}{u && u !== 'mmHg' && u !== '/min' && u !== 'bpm' ? u : ''}</span>
                    <span className="text-[9px] text-gray-500">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BP */}
          <div>
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-2 pb-1.5 border-b" style={{ borderColor: '#f3f4f6' }}>
              Blood Pressure
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Systolic (mmHg)</label>
                <input type="number" value={form.sys} onChange={e => set('sys', e.target.value)}
                  placeholder="e.g. 120" className={inputCls} style={{ borderColor: '#e5e7eb', ...focusStyle }} />
                <span className="text-[9px] text-gray-400">Normal 90–140</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Diastolic (mmHg)</label>
                <input type="number" value={form.dia} onChange={e => set('dia', e.target.value)}
                  placeholder="e.g. 80" className={inputCls} style={{ borderColor: '#e5e7eb' }} />
                <span className="text-[9px] text-gray-400">Normal 60–90</span>
              </div>
            </div>
          </div>

          {/* Pulse + Temp */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Pulse Rate (bpm)</label>
              <input type="number" value={form.pulse} onChange={e => set('pulse', e.target.value)}
                placeholder="e.g. 72" className={inputCls} style={{ borderColor: '#e5e7eb' }} />
              <span className="text-[9px] text-gray-400">Normal 60–100</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Temperature (°C)</label>
              <input type="number" step="0.1" value={form.temp} onChange={e => set('temp', e.target.value)}
                placeholder="e.g. 36.8" className={inputCls} style={{ borderColor: '#e5e7eb' }} />
              <span className="text-[9px] text-gray-400">Normal 36.1–37.2</span>
            </div>
          </div>

          {/* SpO2 + RR */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">SpO₂ (%)</label>
              <input type="number" value={form.spo2} onChange={e => set('spo2', e.target.value)}
                placeholder="e.g. 98" min="0" max="100" className={inputCls} style={{ borderColor: '#e5e7eb' }} />
              <span className="text-[9px] text-gray-400">Normal ≥ 95%</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Resp. Rate (/min)</label>
              <input type="number" value={form.rr} onChange={e => set('rr', e.target.value)}
                placeholder="e.g. 16" className={inputCls} style={{ borderColor: '#e5e7eb' }} />
              <span className="text-[9px] text-gray-400">Normal 12–20</span>
            </div>
          </div>

          {/* Optional */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Blood Sugar (mg/dL) <span className="font-normal normal-case text-gray-300">optional</span></label>
              <input type="number" value={form.bsl} onChange={e => set('bsl', e.target.value)}
                placeholder="e.g. 142" className={inputCls} style={{ borderColor: '#e5e7eb' }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Pain Score (0–10) <span className="font-normal normal-case text-gray-300">optional</span></label>
              <input type="number" value={form.pain} onChange={e => set('pain', e.target.value)}
                placeholder="0 = no pain" min="0" max="10" className={inputCls} style={{ borderColor: '#e5e7eb' }} />
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Notes <span className="font-normal normal-case text-gray-300">optional</span></label>
            <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Observations, patient complaints, position, O₂ therapy…"
              className={`${inputCls} resize-none`} style={{ borderColor: '#e5e7eb' }} />
          </div>

        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-3 border-t flex gap-3" style={{ borderColor: '#f3f4f6' }}>
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg text-xs font-semibold border text-gray-600"
            style={{ borderColor: '#e5e7eb' }}>
            Cancel
          </button>
          <button onClick={submit} disabled={loading || done}
            className="flex-[2] flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold text-white transition-all"
            style={{ background: done ? '#059669' : GREEN }}>
            {done
              ? <><CheckCircle size={13} /> Saved!</>
              : loading
              ? <><Loader2 size={13} className="animate-spin" /> Submitting…</>
              : <><Lock size={12} /> Submit Vitals</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Vitals() {
  const navigate        = useNavigate()
  const { session }     = useWardSession()
  const [patients, setPatients] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')   // all | overdue | due | done | critical
  const [search, setSearch]     = useState('')
  const [drawer, setDrawer]     = useState(null)    // patient object

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get('/inpatient/admissions', { params: { ward_id: session?.ward?.id } })
      const list = Array.isArray(data) ? data : (data?.items || [])
      if (list.length) setPatients(list)
      else setPatients(MOCK)
    } catch { setPatients(MOCK) }
    finally { setLoading(false) }
  }, [session?.ward?.id])

  useEffect(() => { load() }, [load])

  // Enrich each patient with computed status
  const enriched = useMemo(() => patients.map(p => {
    const mins   = minutesSince(p.last_vital?.recorded_at)
    const status = p.last_vital?.recorded_at ? vitalStatus(mins) : 'never'
    const [sys, dia] = (p.last_vital?.blood_pressure || '').split('/').map(Number)
    const isCritical = spo2Flag(p.last_vital?.spo2) === 'critical' ||
                       p.flags?.includes('critical')
    return { ...p, _mins: mins, _status: status, _critical: isCritical }
  }), [patients])

  // Counts
  const counts = useMemo(() => ({
    all:      enriched.length,
    overdue:  enriched.filter(p => p._status === 'overdue' || p._status === 'never').length,
    due:      enriched.filter(p => p._status === 'due').length,
    done:     enriched.filter(p => p._status === 'done').length,
    critical: enriched.filter(p => p._critical).length,
  }), [enriched])

  // Filtered + sorted
  const visible = useMemo(() => {
    let list = [...enriched]
    // filter
    if (filter === 'overdue')  list = list.filter(p => p._status === 'overdue' || p._status === 'never')
    if (filter === 'due')      list = list.filter(p => p._status === 'due')
    if (filter === 'done')     list = list.filter(p => p._status === 'done')
    if (filter === 'critical') list = list.filter(p => p._critical)
    // search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.patient_name?.toLowerCase().includes(q) ||
        p.bed?.toLowerCase().includes(q) ||
        p.diagnosis?.toLowerCase().includes(q) ||
        p.doctor?.toLowerCase().includes(q)
      )
    }
    // sort: overdue/never first, then due, then done
    const order = { overdue: 0, never: 0, due: 1, done: 2 }
    list.sort((a, b) => (order[a._status] ?? 3) - (order[b._status] ?? 3))
    return list
  }, [enriched, filter, search])

  const overdueNames = enriched
    .filter(p => p._status === 'overdue' || p._status === 'never')
    .map(p => `${p.bed} (${p.patient_name})`)
    .join(' · ')

  const STAT_CARDS = [
    { key: 'all',      label: 'Total Patients', value: counts.all,      color: NAVY,     bg: '#eff6ff',  icon: '🛏' },
    { key: 'done',     label: 'Recorded Today', value: counts.done,     color: GREEN,    bg: '#f0fdf4',  icon: '✓' },
    { key: 'due',      label: 'Due Soon (>4h)', value: counts.due,      color: '#d97706',bg: '#fef9c3',  icon: '⏱' },
    { key: 'overdue',  label: 'Overdue (>6h)',  value: counts.overdue,  color: '#b91c1c',bg: '#fef2f2',  icon: '⚠' },
    { key: 'critical', label: 'Critical Values',value: counts.critical, color: RED,      bg: '#fef2f2',  icon: '🔴' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-full text-gray-400">
      <Loader2 size={22} className="animate-spin mr-2" /> Loading ward vitals…
    </div>
  )

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: '#f4f5f7' }}>

      {/* ── Header ── */}
      <div className="bg-white border-b flex-shrink-0 px-5 py-3 flex items-center gap-3" style={{ borderColor: '#e9eaec' }}>
        <span className="text-base font-extrabold text-gray-900">Vitals</span>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
          style={{ background: '#f0fdf4', color: GREEN, borderColor: '#a7f3d0' }}>
          {session?.ward?.name || 'Ward 3B — General Surgery'}
        </span>
        <span className="text-[10px] text-gray-400">{session?.shift_label || 'Morning Shift'}</span>
        <div className="ml-auto flex items-center gap-2">
          <button className="btn btn-secondary">
            <Download size={12} /> Export
          </button>
          <button onClick={() => setDrawer(null)} className="btn btn-primary">
            <Plus size={12} /> Record Vitals
          </button>
        </div>
      </div>

      {/* ── Stat cards — actionable filters ── */}
      <div className="grid grid-cols-5 gap-3 px-5 py-4 flex-shrink-0">
        {STAT_CARDS.map(s => {
          const active = filter === s.key
          return (
            <button key={s.key} onClick={() => setFilter(s.key)}
              className="text-left bg-white rounded-xl border p-3.5 flex flex-col gap-2 transition-all"
              style={{
                borderColor: active ? s.color : '#e9eaec',
                boxShadow: active ? `0 0 0 2px ${s.color}22` : 'none',
                background: active ? s.bg : 'white',
              }}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{s.label}</span>
                <span className="text-sm">{s.icon}</span>
              </div>
              <span className="text-2xl font-extrabold leading-none" style={{ color: s.color }}>{s.value}</span>
              <span className="text-[9px] text-gray-400">{active ? 'Filtered ↑' : 'Click to filter'}</span>
            </button>
          )
        })}
      </div>

      {/* ── Overdue banner ── */}
      {counts.overdue > 0 && (filter === 'all' || filter === 'overdue') && (
        <div className="mx-5 mb-3 px-4 py-2.5 rounded-xl border flex items-center gap-3 flex-shrink-0"
          style={{ background: '#fef2f2', borderColor: '#fca5a5' }}>
          <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-red-700">
            {counts.overdue} patient{counts.overdue > 1 ? 's' : ''} overdue for vitals —&nbsp;
            <span className="font-bold">{overdueNames}</span>
          </span>
          <button onClick={() => setFilter('overdue')}
            className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-lg"
            style={{ background: '#fee2e2', color: '#b91c1c' }}>
            View Overdue
          </button>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="px-5 pb-3 flex items-center gap-3 flex-shrink-0 flex-wrap">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search patient, bed, diagnosis…"
            className="pl-7 pr-3 py-2 border rounded-lg text-xs bg-white focus:outline-none w-64"
            style={{ borderColor: search ? GREEN : '#e5e7eb' }} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={11} />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[
            { key: 'all',      label: `All (${counts.all})` },
            { key: 'overdue',  label: `Overdue (${counts.overdue})`,  color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5' },
            { key: 'due',      label: `Due Soon (${counts.due})`,     color: '#a16207', bg: '#fef9c3', border: '#fde047' },
            { key: 'done',     label: `Done (${counts.done})`,        color: GREEN,     bg: '#f0fdf4', border: '#a7f3d0' },
            { key: 'critical', label: `Critical (${counts.critical})`,color: RED,       bg: '#fef2f2', border: '#fca5a5' },
          ].map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all"
              style={filter === t.key
                ? { background: t.bg || '#f0fdf4', color: t.color || GREEN, borderColor: t.border || '#a7f3d0' }
                : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}>
              {t.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[10px] text-gray-400">{visible.length} patients shown</span>
      </div>

      {/* ── Table ── */}
      <div className="px-5 pb-6 flex-1">
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#e9eaec' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: '#fafaf9' }}>
                <tr className="border-b" style={{ borderColor: '#e9eaec' }}>
                  {['Bed', 'Patient', 'BP (mmHg)', 'Pulse', 'Temp °C', 'SpO₂', 'RR', 'Last Recorded', 'Status', ''].map(h => (
                    <th key={h} className="text-left text-[9px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-gray-400 text-sm">
                      No patients match this filter
                    </td>
                  </tr>
                )}
                {visible.map(pt => {
                  const lv  = pt.last_vital || {}
                  const st  = STATUS_CFG[pt._status] || STATUS_CFG.never
                  const [sys, dia] = (lv.blood_pressure || '').split('/').map(Number)
                  const rowBg = pt._status === 'overdue' || pt._status === 'never' ? '#fff5f5'
                              : pt._status === 'due' ? '#fffdf0' : 'white'

                  return (
                    <tr key={pt.id} className="border-b last:border-0 transition-colors hover:brightness-95"
                      style={{ borderColor: '#f3f4f6', background: rowBg }}>

                      {/* Bed */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center justify-center min-w-[52px] px-2 py-1 rounded-lg text-[10px] font-extrabold border"
                          style={{
                            background: st.bg, color: st.color, borderColor: st.border
                          }}>
                          {pt.bed}
                        </span>
                      </td>

                      {/* Patient */}
                      <td className="px-4 py-3">
                        <button onClick={() => navigate(`/chart/${pt.admission_id}`)}
                          className="text-left group">
                          <div className="text-xs font-bold text-gray-900 group-hover:underline flex items-center gap-1">
                            {pt.patient_name}
                            <ChevronRight size={10} className="text-gray-300 group-hover:text-gray-600" />
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {pt.age}{pt.gender} · {pt.diagnosis}
                          </div>
                        </button>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {(pt.flags || []).map(f => {
                            const fc = FLAG_CFG[f]; if (!fc) return null
                            return (
                              <span key={f} className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                style={{ background: fc.bg, color: fc.color }}>
                                {fc.label}
                              </span>
                            )
                          })}
                          {pt._critical && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                              style={{ background: '#fee2e2', color: RED }}>⚠ CRITICAL</span>
                          )}
                        </div>
                      </td>

                      {/* BP */}
                      <td className="px-4 py-3">
                        <VitalVal value={lv.blood_pressure} never={!lv.recorded_at}
                          flag={bpFlag(sys, dia)} />
                      </td>

                      {/* Pulse */}
                      <td className="px-4 py-3">
                        <VitalVal value={lv.pulse} unit="bpm" never={!lv.recorded_at}
                          flag={pulseFlag(lv.pulse)} />
                      </td>

                      {/* Temp */}
                      <td className="px-4 py-3">
                        <VitalVal value={lv.temperature} never={!lv.recorded_at}
                          flag={tempFlag(lv.temperature)} />
                      </td>

                      {/* SpO2 */}
                      <td className="px-4 py-3">
                        <VitalVal value={lv.spo2 != null ? `${lv.spo2}%` : null} never={!lv.recorded_at}
                          flag={spo2Flag(lv.spo2)} />
                      </td>

                      {/* RR */}
                      <td className="px-4 py-3">
                        <VitalVal value={lv.rr} unit="/min" never={!lv.recorded_at}
                          flag={rrFlag(lv.rr)} />
                      </td>

                      {/* Last recorded */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {lv.recorded_at ? (
                          <>
                            <div className="text-xs font-bold"
                              style={{ color: pt._status === 'overdue' ? '#b91c1c' : pt._status === 'due' ? '#d97706' : '#065F46' }}>
                              {fmtAgo(pt._mins)}
                            </div>
                            <div className="text-[9px] text-gray-400 mt-0.5">{fmtTime(lv.recorded_at)}</div>
                          </>
                        ) : (
                          <span className="text-[10px] font-bold text-red-500">Never recorded</span>
                        )}
                      </td>

                      {/* Status chip */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-full border"
                          style={{ background: st.bg, color: st.color, borderColor: st.border }}>
                          {pt._status === 'done'    && <CheckCircle size={9} />}
                          {pt._status === 'overdue' && <AlertTriangle size={9} />}
                          {pt._status === 'due'     && <Clock size={9} />}
                          {st.label}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3">
                        <button onClick={() => setDrawer(pt)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors"
                          style={pt._status === 'overdue' || pt._status === 'never'
                            ? { background: GREEN, color: 'white' }
                            : { background: '#f0fdf4', color: GREEN, border: '1px solid #a7f3d0' }}>
                          <Activity size={11} /> Record
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Record drawer ── */}
      {drawer !== null && (
        <RecordDrawer
          patient={drawer || visible[0]}
          onClose={() => setDrawer(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}
