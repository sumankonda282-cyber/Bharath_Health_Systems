import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, CheckCircle, Clock, Loader2, Lock, Search,
  X, ChevronDown, ChevronUp, Activity, Pill, FlaskConical,
  Stethoscope, Utensils, Scissors, FileText, Plus, ChevronRight
} from 'lucide-react'
import { useWardSession } from '../contexts/WardSessionContext'
import api from '../api/client'

const GREEN = '#065F46'
const NAVY  = '#0F2557'
const RED   = '#CC1414'

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtAgo(iso) {
  if (!iso) return '—'
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60), m = mins % 60
  return m ? `${h}h ${m}m ago` : `${h}h ago`
}
function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// Next vitals due status
function nextVitalsStatus(lastRecordedAt, freqHours) {
  if (!freqHours) return null
  if (!lastRecordedAt) return { label: 'Never recorded', color: RED, urgent: true }
  const nextDue = new Date(lastRecordedAt).getTime() + freqHours * 3600000
  const diffMins = Math.round((nextDue - Date.now()) / 60000)
  if (diffMins < 0) return { label: `OVERDUE ${Math.abs(diffMins)}m`, color: RED, urgent: true }
  if (diffMins <= 30) return { label: `Due in ${diffMins}m`, color: '#d97706', urgent: true }
  const h = Math.floor(diffMins / 60), m = diffMins % 60
  return { label: `✓ ${h ? `${h}h ` : ''}${m}m left`, color: GREEN, urgent: false }
}

// ORDER TYPE config
const TYPE_CFG = {
  medication: { label: 'Medication', icon: Pill,         color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  lab:        { label: 'Lab',        icon: FlaskConical, color: '#d97706', bg: '#fef9c3', border: '#fde047' },
  clinical:   { label: 'Clinical',   icon: Stethoscope,  color: GREEN,     bg: '#f0fdf4', border: '#a7f3d0' },
  diet:       { label: 'Diet',       icon: Utensils,     color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
  procedure:  { label: 'Procedure',  icon: Scissors,     color: '#db2777', bg: '#fdf2f8', border: '#f9a8d4' },
  vitals:     { label: 'Vitals',     icon: Activity,     color: NAVY,      bg: '#eff6ff', border: '#bfdbfe' },
}

const ACUITY_CFG = {
  high:    { label: 'HIGH',    dot: '🔴', color: RED,      bg: '#fef2f2', border: '#fca5a5' },
  medium:  { label: 'MEDIUM',  dot: '🟡', color: '#d97706', bg: '#fef9c3', border: '#fde047' },
  low:     { label: 'LOW',     dot: '🟢', color: GREEN,    bg: '#f0fdf4', border: '#a7f3d0' },
  routine: { label: 'ROUTINE', dot: '⚪', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
}

const STATUS_FLOW = ['pending', 'acknowledged', 'in_progress', 'completed']

// ── mock data ─────────────────────────────────────────────────────────────────
const MOCK_PATIENTS = [
  {
    id: 'p1', admission_id: 'a1', bed: 'Bed 4', patient_name: 'Ramesh Mehta',
    age: 45, gender: 'M', diagnosis: 'Acute Appendicitis · POD 1',
    doctor: 'Dr. Srinivasa Rao', acuity: 'high', vitals_freq_hours: 1,
    last_vital_at: new Date(Date.now() - 72 * 60000).toISOString(),
    flags: ['post_op'],
    orders: [
      { id: 'o1', type: 'medication', priority: 'stat', status: 'pending',
        text: 'Inj. Ceftriaxone 1g IV in 100mL NS over 30 min — BD',
        note: 'Monitor for allergic reaction. Pre-medicate with Avil if history of allergy.',
        ordered_by: 'Dr. Srinivasa Rao', ordered_at: new Date(Date.now() - 2*3600000).toISOString() },
      { id: 'o2', type: 'lab', priority: 'routine', status: 'acknowledged',
        text: 'CBC + CRP + LFT — Fasting sample',
        note: 'Send to lab before 10 AM. Mark as fasting. Requisition slip in file.',
        ordered_by: 'Dr. Srinivasa Rao', ordered_at: new Date(Date.now() - 2*3600000).toISOString(),
        ack_by: 'Sr. Lakshmi', ack_at: new Date(Date.now() - 90*60000).toISOString() },
      { id: 'o3', type: 'clinical', priority: 'routine', status: 'completed',
        text: 'Wound dressing change — Betadine + dry gauze',
        note: 'Document wound appearance. Measure and note any discharge.',
        ordered_by: 'Dr. Srinivasa Rao', ordered_at: new Date(Date.now() - 5*3600000).toISOString(),
        completed_by: 'Sr. Lakshmi', completed_at: new Date(Date.now() - 3*3600000).toISOString() },
      { id: 'o4', type: 'vitals', priority: 'routine', status: 'pending',
        text: 'Record vitals — Every 1 hour (post-op monitoring)',
        note: 'Dr. Rao: Alert if SpO₂ < 95% or BP > 150/100 or temp > 38.5°C. Document in chart immediately.',
        ordered_by: 'Dr. Srinivasa Rao', ordered_at: new Date(Date.now() - 24*3600000).toISOString() },
    ]
  },
  {
    id: 'p2', admission_id: 'a2', bed: 'Bed 6', patient_name: 'Kiran Reddy',
    age: 51, gender: 'M', diagnosis: 'GI Bleed — Active',
    doctor: 'Dr. Mehta', acuity: 'high', vitals_freq_hours: 2,
    last_vital_at: new Date(Date.now() - 45*60000).toISOString(),
    flags: ['blood_thin'],
    orders: [
      { id: 'o5', type: 'lab', priority: 'stat', status: 'pending',
        text: 'Repeat Hb + PCV + PT/INR — Urgent',
        note: 'Active GI bleed suspected. Send immediately. Call lab to expedite. Alert Dr. Mehta with result directly.',
        ordered_by: 'Dr. Mehta', ordered_at: new Date(Date.now() - 30*60000).toISOString() },
      { id: 'o6', type: 'medication', priority: 'stat', status: 'in_progress',
        text: 'IV PPI — Pantoprazole 80mg bolus then 8mg/hr infusion',
        note: 'Prepare infusion in 100mL NS. Keep line dedicated. Do not piggyback other drugs.',
        ordered_by: 'Dr. Mehta', ordered_at: new Date(Date.now() - 1*3600000).toISOString(),
        ack_by: 'Sr. Priya', ack_at: new Date(Date.now() - 50*60000).toISOString() },
      { id: 'o7', type: 'diet', priority: 'routine', status: 'acknowledged',
        text: 'NBM — Nil by mouth until further orders',
        note: 'Strict NBM. Mouth care every 4 hours. IV fluids as charted. Explain to patient and family.',
        ordered_by: 'Dr. Mehta', ordered_at: new Date(Date.now() - 2*3600000).toISOString(),
        ack_by: 'Sr. Priya', ack_at: new Date(Date.now() - 110*60000).toISOString() },
    ]
  },
  {
    id: 'p3', admission_id: 'a3', bed: 'Bed 9', patient_name: 'Anita Sharma',
    age: 62, gender: 'F', diagnosis: 'Cholecystitis · Day 2',
    doctor: 'Dr. Krishnan', acuity: 'medium', vitals_freq_hours: 4,
    last_vital_at: new Date(Date.now() - 2.5*3600000).toISOString(),
    flags: ['fall_risk'],
    orders: [
      { id: 'o8', type: 'medication', priority: 'stat', status: 'pending',
        text: 'Inj. Ondansetron 4mg IV STAT — for nausea',
        note: 'Patient complaining of severe nausea. Give stat. If vomiting, keep head elevated 30°.',
        ordered_by: 'Dr. Krishnan', ordered_at: new Date(Date.now() - 20*60000).toISOString() },
      { id: 'o9', type: 'clinical', priority: 'routine', status: 'completed',
        text: 'Abdominal girth measurement — every shift',
        note: 'Measure at umbilicus. Record in chart. Alert if increase > 2cm from baseline.',
        ordered_by: 'Dr. Krishnan', ordered_at: new Date(Date.now() - 8*3600000).toISOString(),
        completed_by: 'Sr. Deepa', completed_at: new Date(Date.now() - 4*3600000).toISOString() },
    ]
  },
  {
    id: 'p4', admission_id: 'a4', bed: 'Bed 2', patient_name: 'Priya Nair',
    age: 34, gender: 'F', diagnosis: 'Hernia Repair · POD 2',
    doctor: 'Dr. Rao', acuity: 'low', vitals_freq_hours: 6,
    last_vital_at: new Date(Date.now() - 1.5*3600000).toISOString(),
    flags: [],
    orders: [
      { id: 'o10', type: 'diet', priority: 'routine', status: 'acknowledged',
        text: 'Progress to soft diet — as tolerated',
        note: 'Start with clear liquids. If tolerated for 2 hours, upgrade to soft diet. Document intake.',
        ordered_by: 'Dr. Rao', ordered_at: new Date(Date.now() - 3*3600000).toISOString(),
        ack_by: 'Sr. Lakshmi', ack_at: new Date(Date.now() - 2.5*3600000).toISOString() },
      { id: 'o11', type: 'clinical', priority: 'routine', status: 'completed',
        text: 'Ambulation — assist patient to walk twice daily',
        note: 'Start from POD 2. Physiotherapy to assist. Document distance walked.',
        ordered_by: 'Dr. Rao', ordered_at: new Date(Date.now() - 10*3600000).toISOString(),
        completed_by: 'Sr. Lakshmi', completed_at: new Date(Date.now() - 2*3600000).toISOString() },
    ]
  },
  {
    id: 'p5', admission_id: 'a5', bed: 'Bed 11', patient_name: 'Gopal Nair',
    age: 70, gender: 'M', diagnosis: 'COPD Exacerbation',
    doctor: 'Dr. Krishnan', acuity: 'high', vitals_freq_hours: 1,
    last_vital_at: new Date(Date.now() - 55*60000).toISOString(),
    flags: ['critical'],
    orders: [
      { id: 'o12', type: 'medication', priority: 'stat', status: 'pending',
        text: 'Nebulisation — Salbutamol 2.5mg + Ipratropium 0.5mg in 3mL NS Q4H',
        note: 'STAT first dose now. Patient in respiratory distress. Keep O₂ sat probe on. Alert if SpO₂ < 88%.',
        ordered_by: 'Dr. Krishnan', ordered_at: new Date(Date.now() - 10*60000).toISOString() },
      { id: 'o13', type: 'vitals', priority: 'routine', status: 'pending',
        text: 'Record vitals + SpO₂ — Every 1 hour',
        note: 'Dr. Krishnan: COPD on O₂ therapy. Target SpO₂ 88–92%. Alert immediately if < 88% or RR > 28.',
        ordered_by: 'Dr. Krishnan', ordered_at: new Date(Date.now() - 4*3600000).toISOString() },
    ]
  },
]

const FLAG_CFG = {
  post_op:    { label: 'Post-op',    bg: '#eff6ff', color: '#1d4ed8' },
  fall_risk:  { label: 'Fall Risk',  bg: '#fffbeb', color: '#92400e' },
  blood_thin: { label: 'Blood Thin.',bg: '#fef2f2', color: '#b91c1c' },
  nbm:        { label: 'NBM',        bg: '#fff7ed', color: '#c2410c' },
  critical:   { label: 'Critical',   bg: '#fef2f2', color: '#b91c1c' },
}

// ── PIN inline ────────────────────────────────────────────────────────────────
function PinInline({ onConfirm, onCancel, loading, error }) {
  const [pin, setPin] = useState('')
  return (
    <div className="flex items-center gap-2 mt-2">
      <Lock size={11} style={{ color: GREEN }} />
      <input type="password" value={pin} onChange={e => setPin(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && pin.length >= 4 && onConfirm(pin)}
        placeholder="PIN" maxLength={6} autoFocus
        className="border rounded-lg px-2.5 py-1.5 text-xs w-24 tracking-widest focus:outline-none bg-white"
        style={{ borderColor: error ? RED : '#e5e7eb' }} />
      <button onClick={() => onConfirm(pin)} disabled={pin.length < 4 || loading}
        className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white disabled:opacity-40"
        style={{ background: GREEN }}>
        {loading ? <Loader2 size={10} className="animate-spin inline" /> : 'Confirm'}
      </button>
      <button onClick={onCancel} className="px-2 py-1.5 rounded-lg text-[11px] text-gray-500 border" style={{ borderColor: '#e5e7eb' }}>
        Cancel
      </button>
      {error && <span className="text-[10px] text-red-500">{error}</span>}
    </div>
  )
}

// ── Single order card ─────────────────────────────────────────────────────────
function OrderCard({ order, admissionId, onUpdate }) {
  const [pinAction, setPinAction] = useState(null) // 'acknowledge' | 'complete'
  const [pinError, setPinError]   = useState('')
  const [loading, setLoading]     = useState(false)

  const tc  = TYPE_CFG[order.type] || TYPE_CFG.clinical
  const Icon = tc.icon
  const isDone = order.status === 'completed'

  const doAction = async (action, pin) => {
    setLoading(true); setPinError('')
    try {
      await api.post('/auth/staff/pin-identify', { pin })
      await api.post(`/inpatient/admissions/${admissionId}/orders/${order.id}/${action}`, { pin })
      onUpdate(order.id, action === 'acknowledge' ? 'acknowledged' : action === 'progress' ? 'in_progress' : 'completed')
      setPinAction(null)
    } catch (e) {
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        setPinError('Invalid PIN')
      } else {
        // demo fallback
        onUpdate(order.id, action === 'acknowledge' ? 'acknowledged' : action === 'progress' ? 'in_progress' : 'completed')
        setPinAction(null)
      }
    } finally { setLoading(false) }
  }

  const doProgress = async () => {
    try {
      await api.post(`/inpatient/admissions/${admissionId}/orders/${order.id}/progress`, {})
    } catch {}
    onUpdate(order.id, 'in_progress')
  }

  return (
    <div className="rounded-xl border overflow-hidden transition-all"
      style={{
        borderColor: isDone ? '#e9eaec' : order.priority === 'stat' ? '#fca5a5' : tc.border,
        opacity: isDone ? 0.7 : 1,
        background: isDone ? '#fafaf9' : 'white',
      }}>
      <div className="px-4 py-3">
        {/* Header row */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {order.priority === 'stat' && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full border"
              style={{ background: '#fee2e2', color: RED, borderColor: '#fca5a5' }}>
              ⚡ STAT
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border"
            style={{ background: tc.bg, color: tc.color, borderColor: tc.border }}>
            <Icon size={9} /> {tc.label}
          </span>
          <span className="text-[10px] text-gray-400 ml-auto">
            {order.ordered_by} · {fmtDate(order.ordered_at)} {fmtTime(order.ordered_at)}
          </span>
        </div>

        {/* Order text */}
        <p className="text-xs font-bold text-gray-900 mb-1.5">{order.text}</p>

        {/* Note */}
        {order.note && (
          <div className="flex items-start gap-1.5 mb-2 px-3 py-2 rounded-lg"
            style={{ background: '#fafaf9', borderLeft: `3px solid ${tc.color}` }}>
            <FileText size={10} className="flex-shrink-0 mt-0.5" style={{ color: tc.color }} />
            <p className="text-[11px] text-gray-600 leading-relaxed">{order.note}</p>
          </div>
        )}

        {/* Status trail */}
        <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-2 flex-wrap">
          {order.ack_by && (
            <span>✓ Acknowledged by <span className="font-semibold text-gray-600">{order.ack_by}</span> · {fmtTime(order.ack_at)}</span>
          )}
          {order.completed_by && (
            <span>✓ Completed by <span className="font-semibold text-gray-600">{order.completed_by}</span> · {fmtTime(order.completed_at)}</span>
          )}
        </div>

        {/* Vitals order — special action */}
        {order.type === 'vitals' && !isDone && (
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors"
            style={{ background: NAVY, color: 'white' }}>
            <Activity size={11} /> Record Vitals Now →
          </button>
        )}

        {/* Standard order actions */}
        {order.type !== 'vitals' && !isDone && (
          <div className="flex items-center gap-2 flex-wrap">
            {order.status === 'pending' && !pinAction && (
              <button onClick={() => setPinAction('acknowledge')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors"
                style={{ borderColor: GREEN, color: GREEN, background: '#f0fdf4' }}>
                <Lock size={10} /> Acknowledge
              </button>
            )}
            {(order.status === 'acknowledged') && !pinAction && (
              <button onClick={doProgress}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors"
                style={{ borderColor: '#d97706', color: '#d97706', background: '#fef9c3' }}>
                <Clock size={10} /> Mark In Progress
              </button>
            )}
            {(order.status === 'acknowledged' || order.status === 'in_progress') && !pinAction && (
              <button onClick={() => setPinAction('complete')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition-colors"
                style={{ background: GREEN }}>
                <Lock size={10} /> Complete
              </button>
            )}
            {pinAction && (
              <PinInline
                onConfirm={pin => doAction(pinAction, pin)}
                onCancel={() => { setPinAction(null); setPinError('') }}
                loading={loading}
                error={pinError}
              />
            )}
            {order.status === 'in_progress' && !pinAction && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                style={{ background: '#fef9c3', color: '#a16207' }}>⏳ In Progress</span>
            )}
          </div>
        )}

        {isDone && (
          <div className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: GREEN }}>
            <CheckCircle size={11} /> Order completed
          </div>
        )}
      </div>
    </div>
  )
}

// ── Patient row ───────────────────────────────────────────────────────────────
function PatientRow({ patient, filter, typeFilter, onOrderUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()

  const ac  = ACUITY_CFG[patient.acuity] || ACUITY_CFG.routine
  const vns = nextVitalsStatus(patient.last_vital_at, patient.vitals_freq_hours)

  const visibleOrders = useMemo(() => {
    let list = patient.orders || []
    if (filter === 'pending')     list = list.filter(o => o.status === 'pending')
    if (filter === 'in_progress') list = list.filter(o => o.status === 'in_progress')
    if (filter === 'done')        list = list.filter(o => o.status === 'completed')
    if (filter === 'stat')        list = list.filter(o => o.priority === 'stat')
    if (typeFilter)               list = list.filter(o => o.type === typeFilter)
    return list
  }, [patient.orders, filter, typeFilter])

  const pendingCount  = (patient.orders || []).filter(o => o.status === 'pending').length
  const statCount     = (patient.orders || []).filter(o => o.priority === 'stat' && o.status !== 'completed').length
  const totalCount    = (patient.orders || []).length
  const orderSummary  = [...new Set((patient.orders || []).filter(o => o.status !== 'completed').map(o => TYPE_CFG[o.type]?.label || o.type))].join(' · ')

  // Row bg based on acuity / stat
  const rowBg = statCount > 0 ? '#fff8f8' : patient.acuity === 'high' ? '#fffdf8' : 'white'

  return (
    <>
      {/* ── Patient summary row — click anywhere to expand ── */}
      <tr className="border-b cursor-pointer transition-colors hover:brightness-95"
        style={{ borderColor: '#f3f4f6', background: rowBg }}
        onClick={() => setExpanded(e => !e)}>

        {/* Bed */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="inline-flex items-center justify-center min-w-[52px] px-2 py-1 rounded-lg text-[10px] font-extrabold border"
            style={statCount > 0
              ? { background: '#fee2e2', color: RED,    borderColor: '#fca5a5' }
              : patient.acuity === 'high'
              ? { background: '#fef9c3', color: '#a16207', borderColor: '#fde047' }
              : { background: '#f0fdf4', color: GREEN, borderColor: '#a7f3d0' }}>
            {patient.bed}
          </span>
        </td>

        {/* Patient */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-gray-900">{patient.patient_name}</span>
            <ChevronRight size={10} className="text-gray-300" />
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">{patient.age}{patient.gender} · {patient.diagnosis}</div>
          <div className="flex gap-1 mt-1 flex-wrap">
            {(patient.flags || []).map(f => {
              const fc = FLAG_CFG[f]; if (!fc) return null
              return <span key={f} className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: fc.bg, color: fc.color }}>{fc.label}</span>
            })}
          </div>
        </td>

        {/* Acuity */}
        <td className="px-4 py-3 whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg border"
            style={{ background: ac.bg, color: ac.color, borderColor: ac.border }}>
            {ac.dot} {ac.label}
          </span>
        </td>

        {/* Doctor */}
        <td className="px-4 py-3">
          <span className="text-[11px] font-semibold text-gray-700">{patient.doctor}</span>
        </td>

        {/* Vitals frequency */}
        <td className="px-4 py-3 whitespace-nowrap">
          {patient.vitals_freq_hours ? (
            <span className="text-[11px] font-bold text-gray-700">
              Every {patient.vitals_freq_hours}h
            </span>
          ) : <span className="text-gray-300 text-xs">—</span>}
        </td>

        {/* Next vitals due */}
        <td className="px-4 py-3 whitespace-nowrap">
          {vns ? (
            <span className="text-[11px] font-bold" style={{ color: vns.color }}>
              {vns.label}
            </span>
          ) : <span className="text-gray-300 text-xs">—</span>}
        </td>

        {/* Orders summary */}
        <td className="px-4 py-3">
          <div className="text-[11px] font-semibold text-gray-700">
            {pendingCount > 0
              ? <span style={{ color: RED }}>{pendingCount} Pending</span>
              : <span className="text-gray-400">All actioned</span>}
            {statCount > 0 && (
              <span className="ml-2 text-[9px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: '#fee2e2', color: RED }}>
                {statCount} STAT
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">{orderSummary || '—'}</div>
        </td>

        {/* Total / expand indicator */}
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold px-2 py-1 rounded-lg border"
              style={{ background: '#f3f4f6', color: '#374151', borderColor: '#e5e7eb' }}>
              {totalCount} orders
            </span>
            {expanded
              ? <ChevronUp size={14} className="text-gray-400" />
              : <ChevronDown size={14} className="text-gray-400" />}
          </div>
        </td>
      </tr>

      {/* ── Expanded order list ── */}
      {expanded && (
        <tr style={{ background: '#f9fafb' }}>
          <td colSpan={8} className="px-6 py-4">
            {visibleOrders.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No orders match this filter for this patient.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {/* navigate to chart link */}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Orders — {patient.patient_name}
                  </span>
                  <button onClick={e => { e.stopPropagation(); navigate(`/chart/${patient.admission_id}`) }}
                    className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border"
                    style={{ color: NAVY, borderColor: '#bfdbfe', background: '#eff6ff' }}>
                    Open Patient Chart <ChevronRight size={10} />
                  </button>
                </div>
                {visibleOrders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    admissionId={patient.admission_id}
                    onUpdate={(orderId, newStatus) => onOrderUpdate(patient.id, orderId, newStatus)}
                  />
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function WardOrders() {
  const { session }     = useWardSession()
  const [patients, setPatients]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch]       = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get('/inpatient/admissions', { params: { ward_id: session?.ward?.id, include_orders: true } })
      const list = Array.isArray(data) ? data : (data?.items || [])
      if (list.length) setPatients(list)
      else setPatients(MOCK_PATIENTS)
    } catch { setPatients(MOCK_PATIENTS) }
    finally { setLoading(false) }
  }, [session?.ward?.id])

  useEffect(() => { load() }, [load])

  const handleOrderUpdate = useCallback((patientId, orderId, newStatus) => {
    setPatients(prev => prev.map(p => {
      if (p.id !== patientId) return p
      return { ...p, orders: p.orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o) }
    }))
  }, [])

  // Counts
  const allOrders    = useMemo(() => patients.flatMap(p => p.orders || []), [patients])
  const counts = useMemo(() => ({
    all:         allOrders.length,
    pending:     allOrders.filter(o => o.status === 'pending').length,
    in_progress: allOrders.filter(o => o.status === 'in_progress').length,
    done:        allOrders.filter(o => o.status === 'completed').length,
    stat:        allOrders.filter(o => o.priority === 'stat' && o.status !== 'completed').length,
  }), [allOrders])

  const statPatients = patients.filter(p =>
    (p.orders || []).some(o => o.priority === 'stat' && o.status !== 'completed')
  )

  // Filter + search patients
  const visiblePatients = useMemo(() => {
    let list = [...patients]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.patient_name?.toLowerCase().includes(q) ||
        p.bed?.toLowerCase().includes(q) ||
        p.diagnosis?.toLowerCase().includes(q) ||
        p.doctor?.toLowerCase().includes(q)
      )
    }
    // Sort: STAT + high acuity first
    list.sort((a, b) => {
      const aStatPending = (a.orders || []).filter(o => o.priority === 'stat' && o.status !== 'completed').length
      const bStatPending = (b.orders || []).filter(o => o.priority === 'stat' && o.status !== 'completed').length
      if (bStatPending !== aStatPending) return bStatPending - aStatPending
      const acuityOrder = { high: 0, medium: 1, low: 2, routine: 3 }
      return (acuityOrder[a.acuity] ?? 4) - (acuityOrder[b.acuity] ?? 4)
    })
    return list
  }, [patients, search])

  const STAT_CARDS = [
    { key: 'all',         label: 'Total Orders',    value: counts.all,         color: NAVY,      bg: '#eff6ff',  icon: FileText },
    { key: 'pending',     label: 'Pending',         value: counts.pending,     color: RED,       bg: '#fef2f2',  icon: Clock },
    { key: 'in_progress', label: 'In Progress',     value: counts.in_progress, color: '#d97706', bg: '#fef9c3',  icon: Activity },
    { key: 'done',        label: 'Completed Today', value: counts.done,        color: GREEN,     bg: '#f0fdf4',  icon: CheckCircle },
    { key: 'stat',        label: 'STAT / Urgent',   value: counts.stat,        color: RED,       bg: '#fef2f2',  icon: AlertTriangle },
  ]

  const TYPE_FILTERS = [
    { key: '',           label: 'All Types' },
    { key: 'medication', label: 'Medication' },
    { key: 'lab',        label: 'Lab' },
    { key: 'clinical',   label: 'Clinical' },
    { key: 'diet',       label: 'Diet' },
    { key: 'procedure',  label: 'Procedure' },
    { key: 'vitals',     label: 'Vitals' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-full text-gray-400">
      <Loader2 size={22} className="animate-spin mr-2" /> Loading ward orders…
    </div>
  )

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: '#f4f5f7' }}>

      {/* ── Header ── */}
      <div className="bg-white border-b flex-shrink-0 px-5 py-3 flex items-center gap-3" style={{ borderColor: '#e9eaec' }}>
        <span className="text-base font-extrabold text-gray-900">Orders</span>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
          style={{ background: '#f0fdf4', color: GREEN, borderColor: '#a7f3d0' }}>
          {session?.ward?.name || 'Ward 3B — General Surgery'}
        </span>
        <span className="text-[10px] text-gray-400">{session?.shift_label || 'Morning Shift'}</span>
        <div className="ml-auto flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ background: GREEN }}>
            <Plus size={12} /> New Order
          </button>
        </div>
      </div>

      {/* ── Stat cards — actionable filters ── */}
      <div className="grid grid-cols-5 gap-3 px-5 py-4 flex-shrink-0">
        {STAT_CARDS.map(s => {
          const active = filter === s.key
          const Icon   = s.icon
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
                <Icon size={13} style={{ color: s.color }} />
              </div>
              <span className="text-2xl font-extrabold leading-none" style={{ color: s.color }}>{s.value}</span>
              <span className="text-[9px] text-gray-400">{active ? 'Filtered ↑' : 'Click to filter'}</span>
            </button>
          )
        })}
      </div>

      {/* ── STAT banner ── */}
      {counts.stat > 0 && (
        <div className="mx-5 mb-3 px-4 py-2.5 rounded-xl border flex items-center gap-3 flex-shrink-0"
          style={{ background: '#fef2f2', borderColor: '#fca5a5' }}>
          <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-red-700">
            {counts.stat} STAT order{counts.stat > 1 ? 's' : ''} require immediate attention —&nbsp;
            <span className="font-bold">{statPatients.map(p => p.bed).join(' · ')}</span>
          </span>
          <button onClick={() => setFilter('stat')}
            className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-lg"
            style={{ background: '#fee2e2', color: RED }}>
            View STAT
          </button>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="px-5 pb-3 flex flex-col gap-2 flex-shrink-0">
        {/* Status + type filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {[
              { key: 'all',         label: `All (${counts.all})` },
              { key: 'pending',     label: `Pending (${counts.pending})`,         color: RED,       bg: '#fef2f2', border: '#fca5a5' },
              { key: 'in_progress', label: `In Progress (${counts.in_progress})`, color: '#d97706', bg: '#fef9c3', border: '#fde047' },
              { key: 'done',        label: `Done (${counts.done})`,               color: GREEN,     bg: '#f0fdf4', border: '#a7f3d0' },
              { key: 'stat',        label: `STAT (${counts.stat})`,               color: RED,       bg: '#fef2f2', border: '#fca5a5' },
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

          {/* Type filters */}
          <div className="flex gap-1.5 flex-wrap ml-2 pl-2 border-l" style={{ borderColor: '#e5e7eb' }}>
            {TYPE_FILTERS.map(t => {
              const tc = t.key ? TYPE_CFG[t.key] : null
              return (
                <button key={t.key} onClick={() => setTypeFilter(t.key)}
                  className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all"
                  style={typeFilter === t.key
                    ? { background: tc?.bg || '#f0fdf4', color: tc?.color || GREEN, borderColor: tc?.border || '#a7f3d0' }
                    : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}>
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
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
          <span className="text-[10px] text-gray-400">
            {visiblePatients.length} patients · Click any row to see orders
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="px-5 pb-6 flex-1">
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#e9eaec' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: '#fafaf9' }}>
                <tr className="border-b" style={{ borderColor: '#e9eaec' }}>
                  {['Bed', 'Patient', 'Acuity', 'Doctor', 'Vitals Freq', 'Next Vitals Due', 'Open Orders', 'Total'].map(h => (
                    <th key={h} className="text-left text-[9px] font-bold uppercase tracking-wider text-gray-400 px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visiblePatients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400 text-sm">No patients match this filter</td>
                  </tr>
                ) : visiblePatients.map(pt => (
                  <PatientRow
                    key={pt.id}
                    patient={pt}
                    filter={filter}
                    typeFilter={typeFilter}
                    onOrderUpdate={handleOrderUpdate}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
