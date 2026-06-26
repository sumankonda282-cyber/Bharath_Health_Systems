import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ChevronDown, ChevronUp, Lock, Loader2, X, Plus, Check,
  AlertTriangle, AlertCircle, CheckCircle2, Clock, Activity,
  Scissors, Heart, Wind, Droplets, TrendingUp, FileText,
  ClipboardList, User, ArrowRight, Printer
} from 'lucide-react'
import api from '../api/client'

import { GREEN, NAVY, RED } from '../constants/colors'
const AMBER = '#a16207'

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmtDt = d => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

function dur(start, end) {
  const m = Math.round((new Date(end) - new Date(start)) / 60000)
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function fastingHours(since) {
  const h = (Date.now() - new Date(since)) / 3600000
  return h
}

function PctBar({ value, max, color }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-100">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] font-bold" style={{ color }}>{value}/{max}</span>
    </div>
  )
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

// ─── Right drawer wrapper ─────────────────────────────────────────────────────
function Drawer({ title, color = GREEN, onClose, children }) {
  return (
    <div className="fixed inset-0 z-40 flex" style={{ background: 'rgba(0,0,0,0.25)' }}>
      <div className="ml-auto h-full w-[360px] bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ background: color }}>
          <span className="text-white font-bold text-sm">{title}</span>
          <button onClick={onClose}><X size={16} className="text-white" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SH({ title, action, onAction, actionColor = GREEN }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{title}</span>
      {action && (
        <button onClick={onAction} className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg border"
          style={{ color: actionColor, borderColor: `${actionColor}50`, background: `${actionColor}0d` }}>
          <Plus size={10} />{action}
        </button>
      )}
    </div>
  )
}

function Card({ children, className = '' }) {
  return <div className={`rounded-xl border bg-white p-4 mb-4 ${className}`} style={{ borderColor: '#e9eaec' }}>{children}</div>
}

function Row({ label, value, flag }) {
  return (
    <div className="flex gap-2 text-xs mb-1.5">
      <span className="font-bold text-gray-400 w-40 flex-shrink-0">{label}</span>
      <span className={flag === 'high' ? 'text-red-600 font-semibold' : flag === 'low' ? 'text-amber-700 font-semibold' : 'text-gray-800'}>{value || '—'}</span>
    </div>
  )
}

// ─── mock data ────────────────────────────────────────────────────────────────
function buildMock() {
  return {
    procedure: {
      name: 'Laparoscopic Appendectomy', planned_name: 'Laparoscopic Appendectomy',
      surgeon: 'Dr. Ananya Sharma', assistant: 'Dr. Rahul Nair',
      anaesthetist: 'Dr. Pradeep Iyer', anaesthesia_type: 'General Anaesthesia',
      ot_number: 'OT-3', scheduled_at: '2026-06-15T10:00:00',
      expected_duration_min: 90, urgency: 'urgent',
      ot_start: '2026-06-15T10:12:00', ot_end: '2026-06-15T11:07:00',
      return_ward: '2026-06-15T12:30:00',
    },
    preop: {
      vitals: { bp: '124/82', pulse: 88, temp: 37.1, spo2: 99, rr: 16, weight: 68, height: 168, bmi: 24.1 },
      asa: 2,
      comorbidities: ['Hypertension', 'Type 2 Diabetes'],
      hold_meds: [
        { drug: 'Metformin 500mg', action: 'Hold', instruction: 'Hold 24h pre-op' },
        { drug: 'Aspirin 75mg', action: 'Hold', instruction: 'Held 7 days pre-op' },
        { drug: 'Metoprolol 25mg', action: 'Continue', instruction: 'Morning dose with sip of water' },
      ],
      nbm_since: '2026-06-14T22:00:00',
      last_solid: '2026-06-14T21:30:00',
      last_clear: '2026-06-14T22:00:00',
      fasting_confirmed: true,
      skin_prep: { site_marked: true, laterality: 'Right iliac fossa', shaved: true, antiseptic_wash: true, bowel_prep_required: false, nail_polish: true, jewellery: true, prosthetics: false },
      checklist: {
        'Wristband confirmed':            { done: true,  time: '2026-06-15T08:30:00', by: 'RK' },
        'Allergy band applied':           { done: true,  time: '2026-06-15T08:30:00', by: 'RK' },
        'Name/DOB verbal check':          { done: true,  time: '2026-06-15T08:31:00', by: 'RK' },
        'Consent signed':                 { done: true,  time: '2026-06-15T09:00:00', by: 'RK' },
        'Anaesthesia consent':            { done: true,  time: '2026-06-15T09:05:00', by: 'RK' },
        'Blood consent (if applicable)':  { done: false, time: null, by: null },
        'Advance directive reviewed':     { done: true,  time: '2026-06-15T09:10:00', by: 'RK' },
        'Blood results available':        { done: true,  time: '2026-06-15T09:00:00', by: 'RK' },
        'Imaging available':              { done: true,  time: '2026-06-15T09:00:00', by: 'RK' },
        'Blood group confirmed':          { done: true,  time: '2026-06-15T09:00:00', by: 'RK' },
        'Cross-match done':               { done: false, time: null, by: null },
        'IV access secured (18G, R AC)':  { done: true,  time: '2026-06-15T08:45:00', by: 'SP' },
        'Pre-op meds given':              { done: true,  time: '2026-06-15T09:15:00', by: 'SP' },
        'Conditions noted in notes':      { done: true,  time: '2026-06-15T09:00:00', by: 'RK' },
        'Anaesthesia review done':        { done: true,  time: '2026-06-15T09:30:00', by: 'RK' },
        'Cardiologist clearance (if req)':{ done: true,  time: '2026-06-15T08:00:00', by: 'RK' },
        'Compression stockings applied':  { done: true,  time: '2026-06-15T09:00:00', by: 'SP' },
        'Patient voided':                 { done: true,  time: '2026-06-15T09:20:00', by: 'RK' },
        'Dentures removed':               { done: false, time: null, by: null },
        'Hearing aids removed':           { done: false, time: null, by: null },
        'Contact lenses removed':         { done: true,  time: '2026-06-15T09:00:00', by: 'RK' },
        'Valuables secured':              { done: true,  time: '2026-06-15T08:35:00', by: 'RK' },
        'ID re-confirmed at transfer':    { done: true,  time: '2026-06-15T09:45:00', by: 'SP' },
        'Notes/imaging sent with patient':{ done: true,  time: '2026-06-15T09:45:00', by: 'SP' },
        'Handover to OT nurse done':      { done: true,  time: '2026-06-15T09:47:00', by: 'SP' },
      },
      investigations: [
        { test: 'Haemoglobin',  result: '11.2 g/dL',    status: 'available', flag: 'low' },
        { test: 'WBC',          result: '14.8 ×10³/µL', status: 'available', flag: 'high' },
        { test: 'Platelets',    result: '224 ×10³/µL',  status: 'available', flag: null },
        { test: 'PT/INR',       result: '1.1',          status: 'available', flag: null },
        { test: 'APTT',         result: '32 sec',       status: 'available', flag: null },
        { test: 'Sodium',       result: '138 mEq/L',    status: 'available', flag: null },
        { test: 'Potassium',    result: '4.1 mEq/L',    status: 'available', flag: null },
        { test: 'Creatinine',   result: '0.9 mg/dL',    status: 'available', flag: null },
        { test: 'Blood Glucose',result: '142 mg/dL',    status: 'available', flag: 'high' },
        { test: 'Blood Group',  result: 'B +ve',        status: 'available', flag: null },
        { test: 'ECG',          result: 'Normal sinus rhythm', status: 'available', flag: null },
        { test: 'Chest X-Ray',  result: 'Clear lung fields',   status: 'available', flag: null },
        { test: 'USG Abdomen',  result: 'Acute appendicitis',  status: 'available', flag: null },
      ],
      premeds: [
        { drug: 'Ondansetron',  dose: '4 mg', route: 'IV', scheduled: '09:15', given: '09:17', by: 'SP', status: 'given' },
        { drug: 'Pantoprazole', dose: '40 mg', route: 'IV', scheduled: '09:15', given: '09:18', by: 'SP', status: 'given' },
        { drug: 'Metoprolol',   dose: '25 mg', route: 'PO', scheduled: '09:00', given: '09:05', by: 'SP', status: 'given' },
        { drug: 'Cefazolin',    dose: '2g',    route: 'IV', scheduled: '09:30', given: null,    by: null,  status: 'pending' },
      ],
      ot_transfer: { done: true, time_left: '2026-06-15T09:47:00', escorted_by: 'Nurse Suresh Pillai', handover_to: 'OT Nurse Meena', mode: 'Trolley', iv_running: true, o2_required: false, family_informed: true, remarks: 'Patient calm and cooperative' },
    },
    intraop: {
      procedure_performed: 'Laparoscopic Appendectomy',
      start: '2026-06-15T10:12:00', end: '2026-06-15T11:07:00',
      position: 'Supine with left lateral tilt', complications: 'None', blood_loss_ml: 80,
      surgeon_summary: 'Inflamed appendix removed laparoscopically. No perforation. JP drain placed in RIF. Fascia closed. Skin stapled.',
      anaesthesia_type: 'General Anaesthesia — TIVA',
      agents: 'Propofol, Fentanyl, Rocuronium, Sevoflurane',
      intubated: true, reversal: 'Neostigmine + Glycopyrrolate',
      fluids: [{ type: 'Normal Saline 0.9%', volume_ml: 1000 }, { type: 'Ringer Lactate', volume_ml: 500 }],
      blood_products: [], urine_output_ml: 220, count_correct: true,
      drains: [{ name: 'JP Drain 1', type: 'Jackson-Pratt', site: 'Right Iliac Fossa', insertion_time: '2026-06-15T10:58:00', initial_output_ml: 10, secured: true }],
      implants: [],
    },
    postop: {
      return_ward: '2026-06-15T12:30:00', recovery_duration_min: 83, consciousness: 'Alert', pod: 1,
      aldrete: { recorded_at: '2026-06-15T11:50:00', activity: 2, respiration: 2, circulation: 2, consciousness: 2, spo2: 2, by: 'Recovery Nurse Divya', nausea: false },
      vitals: [
        { time: '2026-06-15T12:35:00', bp: '118/76', pulse: 88, temp: 37.2, spo2: 98, rr: 16, avpu: 'A', pain_rest: 6, pain_move: 8, by: 'RK' },
        { time: '2026-06-15T13:05:00', bp: '120/78', pulse: 84, temp: 37.3, spo2: 98, rr: 16, avpu: 'A', pain_rest: 5, pain_move: 7, by: 'RK' },
        { time: '2026-06-15T14:00:00', bp: '122/80', pulse: 80, temp: 37.4, spo2: 99, rr: 15, avpu: 'A', pain_rest: 4, pain_move: 6, by: 'SP' },
        { time: '2026-06-15T18:00:00', bp: '124/82', pulse: 78, temp: 37.5, spo2: 98, rr: 15, avpu: 'A', pain_rest: 3, pain_move: 4, by: 'SP' },
        { time: '2026-06-15T22:00:00', bp: '122/80', pulse: 76, temp: 37.3, spo2: 99, rr: 14, avpu: 'A', pain_rest: 2, pain_move: 3, by: 'NK' },
        { time: '2026-06-16T06:00:00', bp: '120/78', pulse: 74, temp: 37.2, spo2: 99, rr: 14, avpu: 'A', pain_rest: 2, pain_move: 2, by: 'NK' },
      ],
      pain_log: [
        { time: '2026-06-15T12:40:00', site: 'Abdomen RIF', character: 'Sharp', rest: 6, move: 8, intervention: 'Morphine 2mg IV', response: 4, by: 'RK' },
        { time: '2026-06-15T14:00:00', site: 'Abdomen RIF', character: 'Dull aching', rest: 4, move: 6, intervention: 'Paracetamol 1g IV', response: 3, by: 'SP' },
        { time: '2026-06-15T22:00:00', site: 'Abdomen RIF', character: 'Mild aching', rest: 2, move: 3, intervention: 'Repositioned', response: 2, by: 'NK' },
      ],
      wounds: [
        { id: 1, label: 'Wound 1 — Umbilical', site: 'Umbilicus', closure: 'Sutures', appearance: 'Dry', edges: 'Well-approximated', surrounding: 'Normal', dressing: 'Gauze + Tegaderm', last_changed: '2026-06-16T06:30:00', changed_by: 'NK', culture_sent: false, history: [{ time: '2026-06-15T13:00:00', appearance: 'Slightly moist', edges: 'Well-approximated', by: 'RK' }, { time: '2026-06-16T06:30:00', appearance: 'Dry', edges: 'Well-approximated', by: 'NK' }] },
        { id: 2, label: 'Wound 2 — RIF port', site: 'Right Iliac Fossa', closure: 'Staples', appearance: 'Seeping', edges: 'Well-approximated', surrounding: 'Mild erythema', dressing: 'Absorbent pad', last_changed: '2026-06-16T06:35:00', changed_by: 'NK', culture_sent: false, history: [{ time: '2026-06-15T13:00:00', appearance: 'Seeping', edges: 'Well-approximated', by: 'RK' }] },
      ],
      drains: [
        { id: 1, name: 'JP Drain 1', type: 'Jackson-Pratt', site: 'Right Iliac Fossa', suction: false, patency: 'Patent', color: 'Serosanguineous', shift_output: 45, total_output: 180, last_emptied: '2026-06-16T06:00:00', emptied_by: 'NK', removed: false, log: [{ time: '2026-06-15T12:30:00', amount: 10, color: 'Sanguineous', by: 'RK' }, { time: '2026-06-15T18:00:00', amount: 80, color: 'Serosanguineous', by: 'SP' }, { time: '2026-06-15T22:00:00', amount: 45, color: 'Serosanguineous', by: 'NK' }, { time: '2026-06-16T06:00:00', amount: 45, color: 'Serous', by: 'NK' }] },
      ],
      respiratory: {
        o2: { type: 'Nasal Prongs', flow: 2, target_spo2: '≥95%', status: 'Weaning' },
        spirometry: [{ time: '2026-06-15T14:00:00', target: 1000, achieved: 600, by: 'SP' }, { time: '2026-06-15T18:00:00', target: 1000, achieved: 800, by: 'SP' }, { time: '2026-06-16T06:00:00', target: 1000, achieved: 950, by: 'NK' }],
        breath_sounds: [{ time: '2026-06-15T13:00:00', right: 'Vesicular', left: 'Vesicular', by: 'RK' }, { time: '2026-06-16T06:00:00', right: 'Vesicular', left: 'Reduced bases', by: 'NK' }],
        deep_breathing: [{ shift: 'Afternoon 15 Jun', done: true, time: '2026-06-15T15:00:00', by: 'SP' }, { shift: 'Night 15 Jun', done: true, time: '2026-06-15T22:00:00', by: 'NK' }, { shift: 'Morning 16 Jun', done: true, time: '2026-06-16T07:00:00', by: 'NK' }],
      },
      fluid_balance: {
        in: [{ type: 'NS 0.9% IV', volume: 1000, time: '2026-06-15T12:30:00' }, { type: 'RL IV', volume: 500, time: '2026-06-15T16:00:00' }, { type: 'Oral intake', volume: 300, time: '2026-06-15T19:00:00' }],
        out: [{ type: 'Urine (catheter)', volume: 1100, time: '2026-06-15T12:30:00' }, { type: 'JP Drain', volume: 180, time: '2026-06-15T12:30:00' }],
      },
      mobility: [
        { time: '2026-06-15T16:00:00', level: 'Sitting up', assisted_by: 'Nurse SP', tolerance: 'Good', pain: false, distance: null, by: 'SP' },
        { time: '2026-06-15T20:00:00', level: 'Dangling', assisted_by: 'Nurse SP', tolerance: 'Good', pain: true, distance: null, by: 'SP' },
        { time: '2026-06-16T07:30:00', level: 'Walking in room', assisted_by: 'Nurse NK', tolerance: 'Good', pain: false, distance: 10, by: 'NK' },
      ],
      dvt: { stockings_am: true, stockings_pm: true, scd: false, lmwh: 'Enoxaparin 40mg SC — Last: 15 Jun 22:00' },
      milestones: {
        'Return of bowel sounds':       { done: true,  time: '2026-06-15T18:00:00', by: 'SP',         notes: 'Heard all 4 quadrants' },
        'First flatus':                 { done: true,  time: '2026-06-15T20:30:00', by: 'SP',         notes: '' },
        'First oral intake':            { done: true,  time: '2026-06-15T19:00:00', by: 'SP',         notes: 'Sips of water tolerated' },
        'Diet upgraded to soft':        { done: false, time: null, by: null, notes: '' },
        'Diet upgraded to normal':      { done: false, time: null, by: null, notes: '' },
        'Urinary catheter removed':     { done: false, time: null, by: null, notes: '' },
        'First void post-catheter':     { done: false, time: null, by: null, notes: '' },
        'All drains removed':           { done: false, time: null, by: null, notes: '' },
        'IV to oral medications':       { done: false, time: null, by: null, notes: '' },
        'First independent ambulation': { done: false, time: null, by: null, notes: '' },
        'Wound reviewed by surgeon':    { done: true,  time: '2026-06-15T16:00:00', by: 'Dr. Sharma', notes: 'Satisfactory' },
        'Patient education completed':  { done: false, time: null, by: null, notes: '' },
        'Family education completed':   { done: false, time: null, by: null, notes: '' },
        'Discharge criteria met':       { done: false, time: null, by: null, notes: '' },
      },
      surgeon_instructions: 'Sips of water when fully awake. Clear liquids in 4h if tolerating. Remove JP drain when output <30 mL/day × 2 days. Mobilise early — day 1 post-op. DVT prophylaxis Enoxaparin 40mg SC OD × 5 days. Wound review OPD at 1 week. Staples removal at 10 days.',
      surgeon_instructions_reviewed: false,
      discharge_criteria: {
        'Vitals stable ≥24h': false, 'Afebrile ≥24h': false, 'Pain controlled on oral analgesics': false,
        'Tolerating oral diet': false, 'Wound satisfactory — no active infection': false,
        'Drain criteria met or drains removed': false, 'Urine output adequate': false,
        'DVT prophylaxis completed': false, 'Patient/family education done': false,
        'Follow-up appointment booked': false,
      },
    },
  }
}

// ─── PREOP sections ───────────────────────────────────────────────────────────
function PreopSchedule({ p, proc }) {
  const urgencyColor = { elective: { bg: '#dcfce7', color: '#15803d', border: '#a7f3d0' }, urgent: { bg: '#fef9c3', color: AMBER, border: '#fde047' }, emergency: { bg: '#fee2e2', color: RED, border: '#fca5a5' } }
  const u = urgencyColor[proc.urgency] || urgencyColor.elective
  return (
    <Card>
      <SH title="Surgical Schedule" />
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        <Row label="Procedure" value={proc.planned_name} />
        <Row label="OT Number" value={proc.ot_number} />
        <Row label="Surgeon" value={proc.surgeon} />
        <Row label="Assistant" value={proc.assistant} />
        <Row label="Anaesthetist" value={proc.anaesthetist} />
        <Row label="Anaesthesia" value={proc.anaesthesia_type} />
        <Row label="Scheduled" value={fmtDt(proc.scheduled_at)} />
        <Row label="Expected Duration" value={`${proc.expected_duration_min} min`} />
      </div>
      <div className="mt-2">
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border" style={{ background: u.bg, color: u.color, borderColor: u.border }}>
          {(proc.urgency || 'elective').charAt(0).toUpperCase() + (proc.urgency || 'elective').slice(1)}
        </span>
      </div>
    </Card>
  )
}

function PreopAssessment({ p }) {
  const asaDesc = ['', 'Healthy patient', 'Mild systemic disease', 'Severe systemic disease', 'Life-threatening disease', 'Moribund', 'Brain-dead donor']
  const v = p.vitals || {}
  return (
    <Card>
      <SH title="Pre-op Assessment" />
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[['BP', v.bp], ['Pulse', `${v.pulse} bpm`], ['Temp', `${v.temp}°C`], ['SpO₂', `${v.spo2}%`], ['RR', `${v.rr} /min`], ['Weight', `${v.weight} kg`], ['Height', `${v.height} cm`], ['BMI', v.bmi]].map(([l, val]) => (
          <div key={l} className="rounded-lg border p-2 text-center" style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{l}</div>
            <div className="text-sm font-bold text-gray-800 mt-0.5">{val}</div>
          </div>
        ))}
      </div>
      <div className="mb-3">
        <span className="text-[10px] font-bold text-gray-400 block mb-1">ASA Classification</span>
        <span className="text-xs font-bold text-white px-2.5 py-1 rounded-full mr-2" style={{ background: NAVY }}>ASA {p.asa}</span>
        <span className="text-xs text-gray-600">{asaDesc[p.asa] || '—'}</span>
      </div>
      {p.comorbidities?.length > 0 && (
        <div className="mb-3">
          <span className="text-[10px] font-bold text-gray-400 block mb-1">Comorbidities</span>
          <div className="flex flex-wrap gap-1.5">
            {p.comorbidities.map(c => <span key={c} className="text-[10px] font-semibold px-2 py-0.5 rounded-full border" style={{ background: '#fef9c3', color: AMBER, borderColor: '#fde047' }}>{c}</span>)}
          </div>
        </div>
      )}
      {p.hold_meds?.length > 0 && (
        <>
          <span className="text-[10px] font-bold text-gray-400 block mb-2">Medications — Hold / Continue</span>
          {p.hold_meds.map((m, i) => (
            <div key={i} className="flex items-start gap-2 py-1.5 border-b last:border-0 text-xs" style={{ borderColor: '#f3f4f6' }}>
              <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] flex-shrink-0 ${m.action === 'Hold' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{m.action}</span>
              <span className="font-semibold text-gray-800 w-36 flex-shrink-0">{m.drug}</span>
              <span className="text-gray-500">{m.instruction}</span>
            </div>
          ))}
        </>
      )}
    </Card>
  )
}

function FastingPrep({ p, onPin }) {
  const hrs = fastingHours(p.nbm_since)
  const fastColor = hrs >= 6 ? { bg: '#dcfce7', color: '#15803d', border: '#a7f3d0' } : hrs >= 4 ? { bg: '#fef9c3', color: AMBER, border: '#fde047' } : { bg: '#fee2e2', color: RED, border: '#fca5a5' }
  const sp = p.skin_prep || {}
  return (
    <Card>
      <SH title="Fasting & Skin Preparation" />
      <div className="rounded-xl border p-4 mb-4 flex items-center gap-6" style={{ background: fastColor.bg, borderColor: fastColor.border }}>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: fastColor.color }}>Fasting Duration</div>
          <div className="text-3xl font-extrabold" style={{ color: fastColor.color }}>{Math.floor(hrs)}h {Math.round((hrs % 1) * 60)}m</div>
          <div className="text-[10px] mt-0.5" style={{ color: fastColor.color }}>NBM since {fmtDt(p.nbm_since)}</div>
        </div>
        <div className="flex-1 space-y-1 text-xs">
          <div className="flex gap-2"><span className="text-gray-500 w-24">Last solid</span><span className="font-medium text-gray-800">{fmtDt(p.last_solid)}</span></div>
          <div className="flex gap-2"><span className="text-gray-500 w-24">Last clear fluid</span><span className="font-medium text-gray-800">{fmtDt(p.last_clear)}</span></div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-gray-500">Fasting confirmed by patient</span>
            {p.fasting_confirmed
              ? <span className="text-[10px] font-bold text-green-700">✦ Confirmed</span>
              : <button onClick={() => onPin('Confirm fasting')} className="text-[10px] font-bold px-2 py-0.5 rounded-lg text-white" style={{ background: GREEN }}>Confirm</button>}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {[
          ['Site Marked', sp.site_marked, sp.laterality ? `(${sp.laterality})` : ''],
          ['Site Shaved', sp.shaved],
          ['Antiseptic Wash', sp.antiseptic_wash],
          ['Bowel Prep Required', sp.bowel_prep_required],
          ['Nail Polish Removed', sp.nail_polish],
          ['Jewellery Removed', sp.jewellery],
          ['Prosthetics/Aids Out', sp.prosthetics],
        ].map(([label, val, sub]) => (
          <div key={label} className="flex items-center gap-2 text-xs">
            <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${val ? 'bg-green-100' : 'bg-gray-100'}`}>
              {val ? <Check size={10} className="text-green-700" /> : <span className="text-gray-400 text-[9px]">—</span>}
            </span>
            <span className="text-gray-700">{label} {sub && <span className="text-gray-400 text-[10px]">{sub}</span>}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function Checklist({ checklist, onTick }) {
  const items = Object.entries(checklist)
  const done = items.filter(([, v]) => v.done).length
  const pct  = Math.round((done / items.length) * 100)
  const GROUPS = {
    'Patient Identity':    ['Wristband confirmed', 'Allergy band applied', 'Name/DOB verbal check'],
    'Documentation':       ['Consent signed', 'Anaesthesia consent', 'Blood consent (if applicable)', 'Advance directive reviewed'],
    'Investigations':      ['Blood results available', 'Imaging available', 'Blood group confirmed', 'Cross-match done'],
    'Clinical':            ['IV access secured (18G, R AC)', 'Pre-op meds given', 'Conditions noted in notes', 'Anaesthesia review done', 'Cardiologist clearance (if req)'],
    'Patient Preparation': ['Compression stockings applied', 'Patient voided', 'Dentures removed', 'Hearing aids removed', 'Contact lenses removed', 'Valuables secured'],
    'Transfer':            ['ID re-confirmed at transfer', 'Notes/imaging sent with patient', 'Handover to OT nurse done'],
  }
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pre-op Checklist</span>
        <span className="text-xs font-bold" style={{ color: pct === 100 ? '#15803d' : pct > 80 ? AMBER : RED }}>{done}/{items.length} complete</span>
      </div>
      <div className="mb-3">
        <div className="h-2 rounded-full overflow-hidden bg-gray-100">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? '#15803d' : pct > 80 ? '#ca8a04' : RED }} />
        </div>
      </div>
      {Object.entries(GROUPS).map(([group, keys]) => (
        <div key={group} className="mb-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">{group}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {keys.map(key => {
              const item = checklist[key]
              if (!item) return null
              return (
                <button key={key} onClick={() => !item.done && onTick(key)}
                  className="flex items-start gap-2 text-left py-1 px-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className={`w-4 h-4 rounded flex-shrink-0 mt-0.5 flex items-center justify-center border ${item.done ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-white'}`}>
                    {item.done && <Check size={9} className="text-green-600" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-gray-700 leading-tight">{key}</p>
                    {item.done && <p className="text-[9px] text-gray-400">{fmtDt(item.time)} · {item.by}</p>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </Card>
  )
}

function Investigations({ items }) {
  const statusColor = { available: '#15803d', pending: AMBER, critical: RED }
  return (
    <Card>
      <SH title="Investigation Results" />
      <table className="w-full">
        <thead>
          <tr style={{ background: '#f9fafb' }}>
            {['Test', 'Result', 'Status'].map(h => (
              <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-gray-400 border-b" style={{ borderColor: '#e9eaec' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((inv, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-gray-50" style={{ borderColor: '#f3f4f6' }}>
              <td className="px-3 py-1.5 text-xs font-medium text-gray-700">{inv.test}</td>
              <td className="px-3 py-1.5 text-xs" style={{ color: inv.flag === 'high' ? RED : inv.flag === 'low' ? AMBER : '#374151', fontWeight: inv.flag ? 600 : 400 }}>
                {inv.result} {inv.flag && <span className="text-[9px] ml-1 font-bold uppercase">{inv.flag}</span>}
              </td>
              <td className="px-3 py-1.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${statusColor[inv.status]}18`, color: statusColor[inv.status] }}>{inv.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function PreMeds({ premeds }) {
  return (
    <Card>
      <SH title="Pre-op Medications" action="Add Pre-med" onAction={() => {}} />
      <table className="w-full">
        <thead>
          <tr style={{ background: '#f9fafb' }}>
            {['Drug', 'Dose', 'Route', 'Scheduled', 'Given', 'By', 'Status'].map(h => (
              <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-gray-400 border-b" style={{ borderColor: '#e9eaec' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {premeds.map((m, i) => (
            <tr key={i} className="border-b last:border-0" style={{ borderColor: '#f3f4f6' }}>
              <td className="px-3 py-2 text-xs font-semibold text-gray-800">{m.drug}</td>
              <td className="px-3 py-2 text-xs text-gray-600">{m.dose}</td>
              <td className="px-3 py-2 text-xs text-gray-500">{m.route}</td>
              <td className="px-3 py-2 text-xs text-gray-500">{m.scheduled}</td>
              <td className="px-3 py-2 text-xs text-gray-700">{m.given || '—'}</td>
              <td className="px-3 py-2 text-xs text-gray-500">{m.by || '—'}</td>
              <td className="px-3 py-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: m.status === 'given' ? '#dcfce7' : m.status === 'held' ? '#fee2e2' : '#fef9c3', color: m.status === 'given' ? '#15803d' : m.status === 'held' ? RED : AMBER }}>
                  {m.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function OTTransfer({ transfer, onLog }) {
  if (!transfer?.done) {
    return (
      <Card>
        <SH title="OT Transfer" />
        <div className="flex flex-col items-center py-6 gap-2 text-gray-400">
          <Clock size={24} className="opacity-30" />
          <p className="text-xs">Transfer not yet logged</p>
          <button onClick={onLog} className="text-xs font-semibold px-4 py-2 rounded-lg text-white mt-1" style={{ background: GREEN }}>Log Transfer</button>
        </div>
      </Card>
    )
  }
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">OT Transfer Log</span>
        <span className="text-[10px] font-bold text-green-700">✦ Logged</span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        <Row label="Time Left Ward" value={fmtDt(transfer.time_left)} />
        <Row label="Escorted By" value={transfer.escorted_by} />
        <Row label="Handover To" value={transfer.handover_to} />
        <Row label="Mode" value={transfer.mode} />
        <Row label="IV Running" value={transfer.iv_running ? 'Yes' : 'No'} />
        <Row label="O₂ Required" value={transfer.o2_required ? 'Yes' : 'No'} />
        <Row label="Family Informed" value={transfer.family_informed ? 'Yes' : 'No'} />
        <Row label="Remarks" value={transfer.remarks} />
      </div>
    </Card>
  )
}

// ─── INTRAOP ──────────────────────────────────────────────────────────────────
function IntraopView({ intraop }) {
  const io = intraop || {}
  const totalIn = (io.fluids || []).reduce((s, f) => s + f.volume_ml, 0)
  return (
    <div className="p-5">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <SH title="Procedure Details" />
          <Row label="Procedure Performed" value={io.procedure_performed} />
          <Row label="OT Start" value={fmtDt(io.start)} />
          <Row label="OT End" value={fmtDt(io.end)} />
          <Row label="Duration" value={io.start && io.end ? dur(io.start, io.end) : '—'} />
          <Row label="Patient Position" value={io.position} />
          <Row label="Estimated Blood Loss" value={io.blood_loss_ml ? `${io.blood_loss_ml} mL` : '—'} />
          <Row label="Intra-op Complications" value={io.complications} />
          <Row label="Count Correct" value={io.count_correct ? '✓ Correct' : '✗ Discrepancy noted'} />
          {io.surgeon_summary && (
            <>
              <p className="text-[10px] font-bold text-gray-400 mt-3 mb-1">Surgeon Summary</p>
              <p className="text-xs text-gray-700 leading-relaxed">{io.surgeon_summary}</p>
            </>
          )}
        </Card>
        <Card>
          <SH title="Anaesthesia Record" />
          <Row label="Type" value={io.anaesthesia_type} />
          <Row label="Agents" value={io.agents} />
          <Row label="Intubated" value={io.intubated ? 'Yes' : 'No'} />
          <Row label="Reversal" value={io.reversal} />
          <Row label="Total Urine Output" value={io.urine_output_ml ? `${io.urine_output_ml} mL` : '—'} />
          <p className="text-[10px] font-bold text-gray-400 mt-3 mb-2">Fluids Administered</p>
          {(io.fluids || []).map((f, i) => (
            <div key={i} className="flex justify-between text-xs py-1 border-b last:border-0" style={{ borderColor: '#f3f4f6' }}>
              <span className="text-gray-700">{f.type}</span>
              <span className="font-semibold text-gray-800">{f.volume_ml} mL</span>
            </div>
          ))}
          <div className="flex justify-between text-xs py-1 font-bold mt-1" style={{ color: NAVY }}>
            <span>Total IN</span><span>{totalIn} mL</span>
          </div>
          {(io.blood_products || []).length > 0 && (
            <>
              <p className="text-[10px] font-bold text-gray-400 mt-3 mb-1">Blood Products</p>
              {io.blood_products.map((b, i) => <div key={i} className="text-xs text-gray-700">{b.product} × {b.units}</div>)}
            </>
          )}
        </Card>
      </div>
      <Card>
        <SH title="Drains Placed in OT" />
        {!(io.drains?.length) ? <p className="text-xs text-gray-400">No drains placed</p> : (
          <table className="w-full">
            <thead><tr style={{ background: '#f9fafb' }}>{['Drain', 'Type', 'Site', 'Insertion Time', 'Initial Output', 'Secured'].map(h => <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-gray-400 border-b" style={{ borderColor: '#e9eaec' }}>{h}</th>)}</tr></thead>
            <tbody>{io.drains.map((d, i) => <tr key={i} className="border-b last:border-0" style={{ borderColor: '#f3f4f6' }}><td className="px-3 py-2 text-xs font-semibold text-gray-800">{d.name}</td><td className="px-3 py-2 text-xs text-gray-600">{d.type}</td><td className="px-3 py-2 text-xs text-gray-600">{d.site}</td><td className="px-3 py-2 text-xs text-gray-500">{fmtDt(d.insertion_time)}</td><td className="px-3 py-2 text-xs text-gray-700">{d.initial_output_ml} mL</td><td className="px-3 py-2 text-xs text-green-700">{d.secured ? '✓' : '—'}</td></tr>)}</tbody>
          </table>
        )}
      </Card>
      {(io.implants?.length > 0) && (
        <Card>
          <SH title="Implants / Prosthetics" />
          <table className="w-full"><thead><tr style={{ background: '#f9fafb' }}>{['Type', 'Size', 'Serial / Lot Number'].map(h => <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase text-gray-400 border-b" style={{ borderColor: '#e9eaec' }}>{h}</th>)}</tr></thead><tbody>{io.implants.map((imp, i) => <tr key={i} className="border-b last:border-0" style={{ borderColor: '#f3f4f6' }}><td className="px-3 py-2 text-xs text-gray-800">{imp.type}</td><td className="px-3 py-2 text-xs text-gray-600">{imp.size}</td><td className="px-3 py-2 text-xs text-gray-500">{imp.lot}</td></tr>)}</tbody></table>
        </Card>
      )}
    </div>
  )
}

// ─── POSTOP sections ──────────────────────────────────────────────────────────
function AldreteCard({ aldrete, onRecord }) {
  const criteria = ['activity', 'respiration', 'circulation', 'consciousness', 'spo2']
  const total = criteria.reduce((s, k) => s + (aldrete?.[k] || 0), 0)
  const labels = { activity: 'Activity', respiration: 'Respiration', circulation: 'Circulation', consciousness: 'Consciousness', spo2: 'O₂ Saturation' }
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Aldrete Score — Recovery Room</span>
        <button onClick={onRecord} className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border" style={{ color: GREEN, borderColor: '#a7f3d0', background: '#f0fdf4' }}>Record Score</button>
      </div>
      {aldrete ? (
        <>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {criteria.map(k => (
              <div key={k} className="rounded-lg border p-2 text-center" style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
                <div className="text-[8px] font-bold uppercase tracking-wider text-gray-400 mb-1">{labels[k]}</div>
                <div className="text-xl font-extrabold" style={{ color: aldrete[k] >= 2 ? '#15803d' : aldrete[k] >= 1 ? AMBER : RED }}>{aldrete[k]}</div>
                <div className="text-[8px] text-gray-400">/ 2</div>
              </div>
            ))}
          </div>
          <div className={`rounded-lg border p-3 text-center ${total >= 9 ? 'border-green-400 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
            <span className="text-sm font-extrabold" style={{ color: total >= 9 ? '#15803d' : AMBER }}>Total: {total}/10</span>
            <span className="text-xs ml-2" style={{ color: total >= 9 ? '#15803d' : AMBER }}>{total >= 9 ? '✦ Discharge criteria met' : 'Below discharge threshold (9)'}</span>
          </div>
          <div className="mt-2 text-[10px] text-gray-400">Assessed by {aldrete.by} · {fmtDt(aldrete.recorded_at)} · Nausea: {aldrete.nausea ? 'Yes' : 'No'}</div>
        </>
      ) : <p className="text-xs text-gray-400 text-center py-4">No Aldrete score recorded yet</p>}
    </Card>
  )
}

function VitalsMonitor({ vitals, onRecord }) {
  const alertCell = (val, type) => {
    if (type === 'spo2' && Number(val) < 94) return { background: '#fee2e2', color: RED }
    if (type === 'temp' && Number(val) > 38.5) return { background: '#fef9c3', color: AMBER }
    if ((type === 'pain_rest' || type === 'pain_move') && Number(val) > 6) return { background: '#fee2e2', color: RED }
    return {}
  }
  return (
    <Card>
      <SH title="Post-op Vitals Monitoring" action="Record Vitals" onAction={onRecord} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead><tr style={{ background: '#f9fafb' }}>{['Time','BP','Pulse','Temp','SpO₂','RR','AVPU','Pain (R)','Pain (M)','By'].map(h => <th key={h} className="px-2.5 py-2 text-left text-[9px] font-bold uppercase text-gray-400 border-b whitespace-nowrap" style={{ borderColor: '#e9eaec' }}>{h}</th>)}</tr></thead>
          <tbody>
            {vitals.map((v, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-gray-50" style={{ borderColor: '#f3f4f6' }}>
                <td className="px-2.5 py-1.5 text-[10px] text-gray-400 whitespace-nowrap">{fmtDt(v.time)}</td>
                <td className="px-2.5 py-1.5 text-xs font-medium text-gray-800">{v.bp}</td>
                <td className="px-2.5 py-1.5 text-xs text-gray-700">{v.pulse}</td>
                <td className="px-2.5 py-1.5 text-xs rounded" style={alertCell(v.temp, 'temp')}>{v.temp}°C</td>
                <td className="px-2.5 py-1.5 text-xs rounded" style={alertCell(v.spo2, 'spo2')}>{v.spo2}%</td>
                <td className="px-2.5 py-1.5 text-xs text-gray-700">{v.rr}</td>
                <td className="px-2.5 py-1.5 text-xs text-gray-700">{v.avpu}</td>
                <td className="px-2.5 py-1.5 text-xs rounded text-center" style={alertCell(v.pain_rest, 'pain_rest')}>{v.pain_rest}</td>
                <td className="px-2.5 py-1.5 text-xs rounded text-center" style={alertCell(v.pain_move, 'pain_move')}>{v.pain_move}</td>
                <td className="px-2.5 py-1.5 text-xs text-gray-500">{v.by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function PainManagement({ log, onAdd }) {
  const scoreColor = s => s >= 7 ? RED : s >= 4 ? AMBER : '#15803d'
  return (
    <Card>
      <SH title="Pain Management" action="Log Assessment" onAction={onAdd} />
      <div className="mb-4 rounded-lg border p-3 flex gap-4" style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
        {['Paracetamol/NSAIDs', 'Weak Opioid + Non-opioid', 'Strong Opioid'].map((step, i) => (
          <div key={i} className={`flex-1 rounded-lg border p-2 text-center text-[10px] font-bold ${i === 0 ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-gray-400'}`}>
            Step {i + 1}<br /><span className="font-normal">{step}</span>
          </div>
        ))}
      </div>
      <table className="w-full">
        <thead><tr style={{ background: '#f9fafb' }}>{['Time','Site','Character','Rest','Move','Intervention','Response','By'].map(h => <th key={h} className="px-2.5 py-2 text-left text-[9px] font-bold uppercase text-gray-400 border-b whitespace-nowrap" style={{ borderColor: '#e9eaec' }}>{h}</th>)}</tr></thead>
        <tbody>
          {log.map((p, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-gray-50" style={{ borderColor: '#f3f4f6' }}>
              <td className="px-2.5 py-1.5 text-[10px] text-gray-400 whitespace-nowrap">{fmtDt(p.time)}</td>
              <td className="px-2.5 py-1.5 text-xs text-gray-700">{p.site}</td>
              <td className="px-2.5 py-1.5 text-xs text-gray-600">{p.character}</td>
              <td className="px-2.5 py-1.5 text-sm font-bold text-center" style={{ color: scoreColor(p.rest) }}>{p.rest}</td>
              <td className="px-2.5 py-1.5 text-sm font-bold text-center" style={{ color: scoreColor(p.move) }}>{p.move}</td>
              <td className="px-2.5 py-1.5 text-xs text-gray-700">{p.intervention}</td>
              <td className="px-2.5 py-1.5 text-sm font-bold text-center" style={{ color: scoreColor(p.response) }}>{p.response}</td>
              <td className="px-2.5 py-1.5 text-xs text-gray-500">{p.by}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function WoundCare({ wounds, onAssess }) {
  const [expanded, setExpanded] = useState({})
  const appColor = { 'Dry': '#dcfce7', 'Slightly moist': '#fef9c3', 'Seeping': '#fff7ed', 'Soaked': '#fee2e2', 'Saturated': '#fee2e2' }
  return (
    <div>
      {wounds.map(w => (
        <Card key={w.id}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-gray-800">{w.label}</p>
              <p className="text-xs text-gray-500">{w.site} · {w.closure} · Dressing: {w.dressing}</p>
            </div>
            <button onClick={() => onAssess(w)} className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border" style={{ color: GREEN, borderColor: '#a7f3d0', background: '#f0fdf4' }}>Assess</button>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: appColor[w.appearance] || '#f3f4f6', color: '#374151' }}>Appearance: {w.appearance}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#f3f4f6', color: '#374151' }}>Edges: {w.edges}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#f3f4f6', color: '#374151' }}>Surrounding: {w.surrounding}</span>
          </div>
          <p className="text-[10px] text-gray-400">Last changed {fmtDt(w.last_changed)} by {w.changed_by}</p>
          <button onClick={() => setExpanded(p => ({ ...p, [w.id]: !p[w.id] }))} className="flex items-center gap-1 text-[10px] text-gray-400 mt-2">
            {expanded[w.id] ? <ChevronUp size={11} /> : <ChevronDown size={11} />} History ({w.history?.length} entries)
          </button>
          {expanded[w.id] && (
            <div className="mt-2 border-t pt-2 space-y-1" style={{ borderColor: '#f3f4f6' }}>
              {(w.history || []).map((h, i) => (
                <div key={i} className="text-[10px] text-gray-500 flex gap-3">
                  <span className="w-28 flex-shrink-0">{fmtDt(h.time)}</span>
                  <span>Appearance: <b>{h.appearance}</b> · Edges: {h.edges} · by {h.by}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}

function DrainManagement({ drains, onLog, onRemove }) {
  const [expanded, setExpanded] = useState({})
  const colorCfg = { Sanguineous: { bg: '#fee2e2', color: RED }, Serosanguineous: { bg: '#fff1f2', color: '#be185d' }, Serous: { bg: '#fef9c3', color: AMBER }, Bile: { bg: '#dcfce7', color: '#15803d' }, Chyle: { bg: '#f0f9ff', color: '#0369a1' }, Purulent: { bg: '#f5f3ff', color: '#7c3aed' } }
  return (
    <div>
      {drains.map(d => {
        const cc = colorCfg[d.color] || { bg: '#f3f4f6', color: '#374151' }
        const approachingRemoval = d.total_output < 60 && !d.removed
        return (
          <Card key={d.id}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-800">{d.name}</p>
                  {d.removed && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Removed</span>}
                  {approachingRemoval && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">Removal approaching</span>}
                </div>
                <p className="text-xs text-gray-500">{d.type} · {d.site} · {d.suction ? `Suction on` : 'No suction'}</p>
              </div>
              <div className="flex gap-2">
                {!d.removed && <button onClick={() => onLog(d)} className="text-[10px] font-semibold px-2 py-1 rounded-lg border" style={{ color: '#0369a1', borderColor: '#bae6fd', background: '#f0f9ff' }}>Log Output</button>}
                {!d.removed && <button onClick={() => onRemove(d)} className="text-[10px] font-semibold px-2 py-1 rounded-lg border" style={{ color: RED, borderColor: '#fca5a5', background: '#fff1f2' }}>Remove</button>}
              </div>
            </div>
            <div className="flex gap-3 mb-3">
              <div className="rounded-lg border p-2.5 flex-1 text-center" style={{ borderColor: cc.bg, background: cc.bg }}>
                <div className="text-[9px] font-bold uppercase tracking-wider mb-0.5" style={{ color: cc.color }}>Color</div>
                <div className="text-xs font-bold" style={{ color: cc.color }}>{d.color}</div>
              </div>
              <div className="rounded-lg border p-2.5 flex-1 text-center" style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
                <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Shift Output</div>
                <div className="text-lg font-extrabold text-gray-800">{d.shift_output} mL</div>
              </div>
              <div className="rounded-lg border p-2.5 flex-1 text-center" style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
                <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Total Output</div>
                <div className="text-lg font-extrabold text-gray-800">{d.total_output} mL</div>
              </div>
              <div className="rounded-lg border p-2.5 flex-1 text-center" style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
                <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Patency</div>
                <div className="text-xs font-bold text-gray-800">{d.patency}</div>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mb-2">Last emptied {fmtDt(d.last_emptied)} by {d.emptied_by}</p>
            <button onClick={() => setExpanded(p => ({ ...p, [d.id]: !p[d.id] }))} className="flex items-center gap-1 text-[10px] text-gray-400">
              {expanded[d.id] ? <ChevronUp size={11} /> : <ChevronDown size={11} />} Output log ({d.log?.length} entries)
            </button>
            {expanded[d.id] && (
              <table className="w-full mt-2 border-t" style={{ borderColor: '#f3f4f6' }}>
                <thead><tr><th className="px-2 py-1 text-left text-[9px] font-bold text-gray-400">Time</th><th className="px-2 py-1 text-left text-[9px] font-bold text-gray-400">Amount</th><th className="px-2 py-1 text-left text-[9px] font-bold text-gray-400">Color</th><th className="px-2 py-1 text-left text-[9px] font-bold text-gray-400">By</th></tr></thead>
                <tbody>{(d.log || []).map((l, i) => <tr key={i} className="border-t" style={{ borderColor: '#f3f4f6' }}><td className="px-2 py-1 text-[10px] text-gray-400">{fmtDt(l.time)}</td><td className="px-2 py-1 text-xs font-semibold text-gray-800">{l.amount} mL</td><td className="px-2 py-1 text-xs text-gray-600">{l.color}</td><td className="px-2 py-1 text-xs text-gray-500">{l.by}</td></tr>)}</tbody>
              </table>
            )}
          </Card>
        )
      })}
    </div>
  )
}

function RespiratoryCard({ resp }) {
  const r = resp || {}
  return (
    <>
      <Card>
        <SH title="O₂ Therapy" action="Log Change" onAction={() => {}} />
        <div className="grid grid-cols-4 gap-3">
          {[['Type', r.o2?.type], ['Flow Rate', `${r.o2?.flow} L/min`], ['Target SpO₂', r.o2?.target_spo2], ['Status', r.o2?.status]].map(([l, v]) => (
            <div key={l} className="rounded-lg border p-2.5 text-center" style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{l}</div>
              <div className="text-xs font-bold text-gray-800">{v || '—'}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <SH title="Incentive Spirometry" action="Log" onAction={() => {}} />
        <table className="w-full">
          <thead><tr style={{ background: '#f9fafb' }}>{['Time','Target (mL)','Achieved (mL)','%','By'].map(h => <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase text-gray-400 border-b" style={{ borderColor: '#e9eaec' }}>{h}</th>)}</tr></thead>
          <tbody>{(r.spirometry || []).map((s, i) => {
            const pct = Math.round((s.achieved / s.target) * 100)
            return <tr key={i} className="border-b last:border-0 hover:bg-gray-50" style={{ borderColor: '#f3f4f6' }}><td className="px-3 py-1.5 text-[10px] text-gray-400 whitespace-nowrap">{fmtDt(s.time)}</td><td className="px-3 py-1.5 text-xs text-gray-700">{s.target}</td><td className="px-3 py-1.5 text-xs font-semibold text-gray-800">{s.achieved}</td><td className="px-3 py-1.5 text-xs font-bold" style={{ color: pct >= 80 ? '#15803d' : pct >= 50 ? AMBER : RED }}>{pct}%</td><td className="px-3 py-1.5 text-xs text-gray-500">{s.by}</td></tr>
          })}</tbody>
        </table>
      </Card>
      <Card>
        <SH title="Breath Sounds Assessment" action="Assess" onAction={() => {}} />
        {(r.breath_sounds || []).map((b, i) => (
          <div key={i} className="flex items-center gap-4 py-2 border-b last:border-0 text-xs" style={{ borderColor: '#f3f4f6' }}>
            <span className="text-[10px] text-gray-400 w-32 flex-shrink-0">{fmtDt(b.time)}</span>
            <span className="w-20 flex-shrink-0"><b>R:</b> {b.right}</span>
            <span className="w-28 flex-shrink-0"><b>L:</b> {b.left}</span>
            <span className="text-gray-400">{b.by}</span>
          </div>
        ))}
      </Card>
      <Card>
        <SH title="Deep Breathing Exercises" action="Log" onAction={() => {}} />
        {(r.deep_breathing || []).map((db, i) => (
          <div key={i} className="flex items-center gap-3 py-1.5 border-b last:border-0 text-xs" style={{ borderColor: '#f3f4f6' }}>
            <Check size={12} className="text-green-600 flex-shrink-0" />
            <span className="text-gray-700 flex-1">{db.shift}</span>
            <span className="text-gray-400">{fmtDt(db.time)} · {db.by}</span>
          </div>
        ))}
      </Card>
    </>
  )
}

function FluidBalance({ fb }) {
  const totalIn  = (fb?.in  || []).reduce((s, i) => s + i.volume, 0)
  const totalOut = (fb?.out || []).reduce((s, i) => s + i.volume, 0)
  const net = totalIn - totalOut
  return (
    <Card>
      <SH title="Post-op Fluid Balance" action="Log Entry" onAction={() => {}} />
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#0369a1' }}>IN</p>
          {(fb?.in || []).map((e, i) => (
            <div key={i} className="flex justify-between text-xs py-1.5 border-b last:border-0" style={{ borderColor: '#f3f4f6' }}>
              <span className="text-gray-700">{e.type}</span>
              <span className="font-semibold text-gray-800">{e.volume} mL</span>
            </div>
          ))}
          <div className="flex justify-between text-xs font-bold py-1.5 mt-1" style={{ color: '#0369a1' }}>
            <span>Total IN</span><span>{totalIn} mL</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: RED }}>OUT</p>
          {(fb?.out || []).map((e, i) => (
            <div key={i} className="flex justify-between text-xs py-1.5 border-b last:border-0" style={{ borderColor: '#f3f4f6' }}>
              <span className="text-gray-700">{e.type}</span>
              <span className="font-semibold text-gray-800">{e.volume} mL</span>
            </div>
          ))}
          <div className="flex justify-between text-xs font-bold py-1.5 mt-1" style={{ color: RED }}>
            <span>Total OUT</span><span>{totalOut} mL</span>
          </div>
        </div>
      </div>
      <div className={`rounded-xl p-3 text-center font-bold text-sm border ${net >= 0 ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-red-300 bg-red-50 text-red-700'}`}>
        Net Balance: {net >= 0 ? '+' : ''}{net} mL
      </div>
    </Card>
  )
}

function MobilityCard({ mobility, dvt, onLog }) {
  const levelColor = { 'Bed rest': '#f3f4f6', 'Sitting up': '#fef9c3', 'Dangling': '#fff7ed', 'Standing': '#eff6ff', 'Walking in room': '#f0fdf4', 'Walking corridor': '#dcfce7' }
  return (
    <>
      <Card>
        <SH title="Ambulation Log" action="Log Ambulation" onAction={onLog} />
        {mobility.map((m, i) => (
          <div key={i} className="flex items-start gap-3 py-2.5 border-b last:border-0" style={{ borderColor: '#f3f4f6' }}>
            <span className="text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 mt-0.5" style={{ background: levelColor[m.level] || '#f3f4f6', color: '#374151' }}>{m.level}</span>
            <div className="flex-1 text-xs">
              <p className="text-gray-700">Assisted by: {m.assisted_by} · Tolerance: <b className={m.tolerance === 'Good' ? 'text-green-700' : 'text-red-600'}>{m.tolerance}</b></p>
              {m.distance && <p className="text-gray-500">Distance: {m.distance} m</p>}
              {m.pain && <p className="text-amber-700">⚠ Pain during activity</p>}
            </div>
            <span className="text-[10px] text-gray-400 flex-shrink-0">{fmtDt(m.time)} · {m.by}</span>
          </div>
        ))}
      </Card>
      <Card>
        <SH title="DVT Prophylaxis" />
        <div className="grid grid-cols-2 gap-3">
          {[['Stockings AM', dvt?.stockings_am], ['Stockings PM', dvt?.stockings_pm], ['SCD Device', dvt?.scd]].map(([l, v]) => (
            <div key={l} className="flex items-center gap-2 text-xs">
              <span className={`w-5 h-5 rounded flex items-center justify-center ${v ? 'bg-green-100' : 'bg-gray-100'}`}>{v ? <Check size={11} className="text-green-700" /> : <X size={10} className="text-gray-400" />}</span>
              <span className="text-gray-700">{l}</span>
            </div>
          ))}
        </div>
        {dvt?.lmwh && <p className="text-xs text-gray-600 mt-3 border-t pt-2" style={{ borderColor: '#f3f4f6' }}>💉 {dvt.lmwh}</p>}
      </Card>
    </>
  )
}

function MilestonesCard({ milestones, onMark }) {
  const entries = Object.entries(milestones)
  const done = entries.filter(([, v]) => v.done).length
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Post-op Milestones</span>
        <span className="text-xs font-bold" style={{ color: done === entries.length ? '#15803d' : NAVY }}>{done}/{entries.length}</span>
      </div>
      <PctBar value={done} max={entries.length} color={done === entries.length ? '#15803d' : NAVY} />
      <div className="mt-4 space-y-1">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-start gap-2.5 py-2 border-b last:border-0" style={{ borderColor: '#f3f4f6', opacity: val.done ? 1 : 0.7 }}>
            <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 border ${val.done ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-white'}`}>
              {val.done ? <Check size={11} className="text-green-600" /> : <Clock size={9} className="text-gray-300" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800">{key}</p>
              {val.done && (
                <p className="text-[10px] text-gray-400">{fmtDt(val.time)} · {val.by}{val.notes && ` · ${val.notes}`}</p>
              )}
            </div>
            {!val.done && (
              <button onClick={() => onMark(key)} className="text-[10px] font-semibold px-2 py-0.5 rounded-lg flex-shrink-0" style={{ color: GREEN, background: '#f0fdf4', border: `1px solid #a7f3d0` }}>Mark Done</button>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

function DischargeCriteriaCard({ instructions, instructionsReviewed, criteria, onReview, onTick }) {
  const entries = Object.entries(criteria)
  const done = entries.filter(([, v]) => v).length
  const allDone = done === entries.length
  return (
    <>
      <Card>
        <SH title="Surgeon Post-op Instructions" />
        <div className="rounded-lg border p-3 mb-3 text-xs text-gray-700 leading-relaxed" style={{ borderColor: '#fde047', background: '#fefce8' }}>
          {instructions}
        </div>
        {instructionsReviewed
          ? <p className="text-[10px] font-bold text-green-700">✦ Reviewed by nurse</p>
          : <button onClick={onReview} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border" style={{ color: GREEN, borderColor: '#a7f3d0', background: '#f0fdf4' }}>
              <Lock size={11} /> Mark Reviewed
            </button>}
      </Card>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Discharge Criteria</span>
          <span className="text-xs font-bold" style={{ color: allDone ? '#15803d' : AMBER }}>{done}/{entries.length}</span>
        </div>
        <PctBar value={done} max={entries.length} color={allDone ? '#15803d' : '#ca8a04'} />
        <div className="mt-4 space-y-1">
          {entries.map(([key, val]) => (
            <button key={key} onClick={() => !val && onTick(key)} className="w-full flex items-center gap-2.5 py-2 border-b last:border-0 text-left hover:bg-gray-50 transition-colors" style={{ borderColor: '#f3f4f6' }}>
              <span className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border ${val ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-white'}`}>{val && <Check size={11} className="text-green-600" />}</span>
              <span className="text-xs text-gray-700">{key}</span>
            </button>
          ))}
        </div>
        {allDone && (
          <div className="mt-4 rounded-xl p-3 text-center font-bold text-sm border border-green-400 bg-green-50 text-green-700">
            ✦ Patient meets all discharge criteria — notify attending physician
          </div>
        )}
      </Card>
    </>
  )
}

// ─── Mini nav ─────────────────────────────────────────────────────────────────
function MiniNav({ items, active, onSelect }) {
  return (
    <div className="w-40 flex-shrink-0 border-r overflow-y-auto" style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
      {items.map(item => {
        const Icon = item.icon
        const isActive = active === item.key
        return (
          <button key={item.key} onClick={() => onSelect(item.key)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold border-b transition-colors"
            style={{ borderColor: '#f0f0f0', borderLeft: isActive ? `3px solid ${GREEN}` : '3px solid transparent', color: isActive ? GREEN : '#374151', background: isActive ? '#f0fdf4' : 'transparent' }}>
            <Icon size={12} style={{ color: isActive ? GREEN : '#9ca3af', flexShrink: 0 }} />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
const PREOP_NAV = [
  { key: 'schedule',    icon: ClipboardList, label: 'Schedule' },
  { key: 'assessment',  icon: Activity,      label: 'Assessment' },
  { key: 'fasting',     icon: Clock,         label: 'Fasting & Prep' },
  { key: 'checklist',   icon: CheckCircle2,  label: 'Checklist' },
  { key: 'investigations', icon: FileText,   label: 'Investigations' },
  { key: 'premeds',     icon: Heart,         label: 'Medications' },
  { key: 'transfer',    icon: ArrowRight,    label: 'OT Transfer' },
]

const POSTOP_NAV = [
  { key: 'aldrete',   icon: Activity,      label: 'Recovery Room' },
  { key: 'vitals',    icon: TrendingUp,    label: 'Vitals' },
  { key: 'pain',      icon: AlertCircle,   label: 'Pain' },
  { key: 'wound',     icon: Scissors,      label: 'Wound & Dressing' },
  { key: 'drains',    icon: Droplets,      label: 'Drains' },
  { key: 'resp',      icon: Wind,          label: 'Respiratory' },
  { key: 'fluid',     icon: Droplets,      label: 'Fluid Balance' },
  { key: 'mobility',  icon: User,          label: 'Mobility & DVT' },
  { key: 'milestones',icon: CheckCircle2,  label: 'Milestones' },
  { key: 'discharge', icon: FileText,      label: 'Discharge Criteria' },
]

export default function PrePostOp({ admission }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [phase,   setPhase]   = useState('postop')
  const [preNav,  setPreNav]  = useState('schedule')
  const [postNav, setPostNav] = useState('aldrete')
  const [pin,     setPin]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/inpatient/admissions/${admission?.id}/periop`)
      if (res?.procedure) setData(res)
      else throw new Error('empty')
    } catch { setData(buildMock()) } finally { setLoading(false) }
  }, [admission?.id])

  useEffect(() => { if (admission?.id) load() }, [load])

  const askPin = (title, onConfirm) => setPin({ title, onConfirm })

  const tickChecklist = key => askPin(`Confirm: ${key}`, () => {
    setData(prev => ({
      ...prev,
      preop: { ...prev.preop, checklist: { ...prev.preop.checklist, [key]: { done: true, time: new Date().toISOString(), by: 'Me' } } }
    }))
  })

  const tickDischarge = key => askPin(`Confirm: ${key}`, () => {
    setData(prev => ({
      ...prev,
      postop: { ...prev.postop, discharge_criteria: { ...prev.postop.discharge_criteria, [key]: true } }
    }))
  })

  const markMilestone = key => askPin(`Mark: ${key}`, () => {
    setData(prev => ({
      ...prev,
      postop: { ...prev.postop, milestones: { ...prev.postop.milestones, [key]: { done: true, time: new Date().toISOString(), by: 'Me', notes: '' } } }
    }))
  })

  const reviewInstructions = () => askPin('Mark surgeon instructions reviewed', () => {
    setData(prev => ({ ...prev, postop: { ...prev.postop, surgeon_instructions_reviewed: true } }))
  })

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={22} className="animate-spin" style={{ color: GREEN }} /></div>

  const d = data || buildMock()
  const proc = d.procedure || {}
  const po   = d.postop    || {}
  const pr   = d.preop     || {}
  const io   = d.intraop   || {}

  const pod = proc.return_ward ? Math.floor((Date.now() - new Date(proc.return_ward)) / 86400000) : null
  const urgencyColor = { elective: '#15803d', urgent: AMBER, emergency: RED }
  const statusLabel = pod !== null ? `POD ${pod}` : proc.ot_start ? 'In OT' : 'Scheduled'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* procedure banner */}
      <div className="flex-shrink-0 px-4 py-2 border-b flex items-center gap-4 flex-wrap" style={{ background: NAVY, borderColor: '#1e3a6e' }}>
        <div className="flex items-center gap-2">
          <Scissors size={13} className="text-white opacity-70" />
          <span className="text-white font-bold text-xs">{proc.name || 'Procedure'}</span>
        </div>
        <span className="text-white opacity-60 text-xs">·</span>
        <span className="text-white opacity-80 text-xs">{proc.surgeon}</span>
        <span className="text-white opacity-60 text-xs">·</span>
        <span className="text-white opacity-80 text-xs">{proc.anaesthesia_type}</span>
        <span className="text-white opacity-60 text-xs">·</span>
        <span className="text-white opacity-80 text-xs">{fmtDt(proc.scheduled_at)}</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: urgencyColor[proc.urgency] || '#6b7280', color: 'white' }}>{(proc.urgency || 'elective').toUpperCase()}</span>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white" style={{ color: NAVY }}>{statusLabel}</span>
        </div>
      </div>

      {/* phase tabs */}
      <div className="flex-shrink-0 flex items-center gap-1 px-4 py-2 border-b" style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
        {[['preop', 'PRE-OP'], ['intraop', 'INTRA-OP'], ['postop', 'POST-OP']].map(([key, label]) => (
          <button key={key} onClick={() => setPhase(key)}
            className="px-4 py-1.5 rounded-full text-xs font-bold border transition-colors"
            style={{ background: phase === key ? GREEN : 'white', color: phase === key ? 'white' : '#374151', borderColor: phase === key ? GREEN : '#e9eaec' }}>
            {label}
          </button>
        ))}
        {pod !== null && (
          <span className="ml-2 text-[10px] font-bold text-white px-2.5 py-1 rounded-full" style={{ background: '#0369a1' }}>
            Post-op Day {pod} · Return: {fmtDt(proc.return_ward)} · Recovery: {po.recovery_duration_min} min · {po.consciousness}
          </span>
        )}
      </div>

      {/* content area */}
      <div className="flex-1 overflow-hidden flex">
        {/* PRE-OP */}
        {phase === 'preop' && (
          <>
            <MiniNav items={PREOP_NAV} active={preNav} onSelect={setPreNav} />
            <div className="flex-1 overflow-y-auto p-5">
              {preNav === 'schedule'       && <PreopSchedule p={pr} proc={proc} />}
              {preNav === 'assessment'     && <PreopAssessment p={pr} />}
              {preNav === 'fasting'        && <FastingPrep p={pr} onPin={label => askPin(label, () => setData(prev => ({ ...prev, preop: { ...prev.preop, fasting_confirmed: true } })))} />}
              {preNav === 'checklist'      && <Checklist checklist={pr.checklist || {}} onTick={tickChecklist} />}
              {preNav === 'investigations' && <Investigations items={pr.investigations || []} />}
              {preNav === 'premeds'        && <PreMeds premeds={pr.premeds || []} />}
              {preNav === 'transfer'       && <OTTransfer transfer={pr.ot_transfer} onLog={() => askPin('Log OT Transfer', () => {})} />}
            </div>
          </>
        )}

        {/* INTRA-OP */}
        {phase === 'intraop' && (
          <div className="flex-1 overflow-y-auto">
            <IntraopView intraop={io} />
          </div>
        )}

        {/* POST-OP */}
        {phase === 'postop' && (
          <>
            <MiniNav items={POSTOP_NAV} active={postNav} onSelect={setPostNav} />
            <div className="flex-1 overflow-y-auto p-5">
              {postNav === 'aldrete'   && <AldreteCard aldrete={po.aldrete} onRecord={() => askPin('Record Aldrete Score', () => {})} />}
              {postNav === 'vitals'    && <VitalsMonitor vitals={po.vitals || []} onRecord={() => askPin('Record Post-op Vitals', () => {})} />}
              {postNav === 'pain'      && <PainManagement log={po.pain_log || []} onAdd={() => askPin('Log Pain Assessment', () => {})} />}
              {postNav === 'wound'     && <WoundCare wounds={po.wounds || []} onAssess={w => askPin(`Assess ${w.label}`, () => {})} />}
              {postNav === 'drains'    && <DrainManagement drains={po.drains || []} onLog={d => askPin(`Log Output: ${d.name}`, () => {})} onRemove={d => askPin(`Remove: ${d.name}`, () => setData(prev => ({ ...prev, postop: { ...prev.postop, drains: prev.postop.drains.map(dr => dr.id === d.id ? { ...dr, removed: true } : dr) } })))} />}
              {postNav === 'resp'      && <RespiratoryCard resp={po.respiratory} />}
              {postNav === 'fluid'     && <FluidBalance fb={po.fluid_balance} />}
              {postNav === 'mobility'  && <MobilityCard mobility={po.mobility || []} dvt={po.dvt} onLog={() => askPin('Log Ambulation', () => {})} />}
              {postNav === 'milestones'&& <MilestonesCard milestones={po.milestones || {}} onMark={markMilestone} />}
              {postNav === 'discharge' && <DischargeCriteriaCard instructions={po.surgeon_instructions} instructionsReviewed={po.surgeon_instructions_reviewed} criteria={po.discharge_criteria || {}} onReview={reviewInstructions} onTick={tickDischarge} />}
            </div>
          </>
        )}
      </div>

      {pin && <PinModal title={pin.title} onConfirm={() => { pin.onConfirm(); setPin(null) }} onCancel={() => setPin(null)} />}
    </div>
  )
}
