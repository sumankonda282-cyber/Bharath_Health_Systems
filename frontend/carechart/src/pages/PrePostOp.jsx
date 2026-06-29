import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ChevronDown, ChevronUp, Lock, Loader2, X, Plus, Check,
  AlertTriangle, AlertCircle, CheckCircle2, Clock, Activity,
  Scissors, Heart, Wind, Droplets, TrendingUp, FileText,
  ClipboardList, User, ArrowRight, Printer, Save
} from 'lucide-react'
import api from '../api/client'

import { GREEN, NAVY, RED } from '../constants/colors'
const AMBER = '#a16207'

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmtDt = d => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const nowIso = () => new Date().toISOString()

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

// ─── Field helpers for drawers ─────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-400'
const selectCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-400 bg-white'

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
      ot_transfer: null,
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
      aldrete: null,
      vitals: [],
      pain_log: [],
      wounds: [
        { id: 1, label: 'Wound 1 — Umbilical', site: 'Umbilicus', closure: 'Sutures', appearance: 'Dry', edges: 'Well-approximated', surrounding: 'Normal', dressing: 'Gauze + Tegaderm', last_changed: '2026-06-16T06:30:00', changed_by: 'NK', culture_sent: false, history: [] },
        { id: 2, label: 'Wound 2 — RIF port', site: 'Right Iliac Fossa', closure: 'Staples', appearance: 'Seeping', edges: 'Well-approximated', surrounding: 'Mild erythema', dressing: 'Absorbent pad', last_changed: '2026-06-16T06:35:00', changed_by: 'NK', culture_sent: false, history: [] },
      ],
      drains: [
        { id: 1, name: 'JP Drain 1', type: 'Jackson-Pratt', site: 'Right Iliac Fossa', suction: false, patency: 'Patent', color: 'Serosanguineous', shift_output: 45, total_output: 180, last_emptied: '2026-06-16T06:00:00', emptied_by: 'NK', removed: false, log: [] },
      ],
      respiratory: {
        o2: { type: 'Nasal Prongs', flow: 2, target_spo2: '≥95%', status: 'Weaning' },
        spirometry: [],
        breath_sounds: [],
        deep_breathing: [],
      },
      fluid_balance: { in: [], out: [] },
      mobility: [],
      dvt: { stockings_am: true, stockings_pm: true, scd: false, lmwh: 'Enoxaparin 40mg SC — Last: 15 Jun 22:00' },
      milestones: {
        'Return of bowel sounds':       { done: false, time: null, by: null, notes: '' },
        'First flatus':                 { done: false, time: null, by: null, notes: '' },
        'First oral intake':            { done: false, time: null, by: null, notes: '' },
        'Diet upgraded to soft':        { done: false, time: null, by: null, notes: '' },
        'Diet upgraded to normal':      { done: false, time: null, by: null, notes: '' },
        'Urinary catheter removed':     { done: false, time: null, by: null, notes: '' },
        'First void post-catheter':     { done: false, time: null, by: null, notes: '' },
        'All drains removed':           { done: false, time: null, by: null, notes: '' },
        'IV to oral medications':       { done: false, time: null, by: null, notes: '' },
        'First independent ambulation': { done: false, time: null, by: null, notes: '' },
        'Wound reviewed by surgeon':    { done: false, time: null, by: null, notes: '' },
        'Patient education completed':  { done: false, time: null, by: null, notes: '' },
        'Family education completed':   { done: false, time: null, by: null, notes: '' },
        'Discharge criteria met':       { done: false, time: null, by: null, notes: '' },
      },
      surgeon_instructions: '',
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
      <SH title="Pre-op Medications" />
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
          <div className="space-y-1.5">
            <Row label="Procedure Performed" value={io.procedure_performed} />
            <Row label="Start Time" value={fmtDt(io.start)} />
            <Row label="End Time" value={fmtDt(io.end)} />
            <Row label="Duration" value={io.start && io.end ? dur(io.start, io.end) : '—'} />
            <Row label="Position" value={io.position} />
            <Row label="Blood Loss" value={io.blood_loss_ml != null ? `${io.blood_loss_ml} mL` : '—'} />
            <Row label="Complications" value={io.complications} />
          </div>
        </Card>
        <Card>
          <SH title="Anaesthesia" />
          <div className="space-y-1.5">
            <Row label="Type" value={io.anaesthesia_type} />
            <Row label="Agents" value={io.agents} />
            <Row label="Intubated" value={io.intubated ? 'Yes' : 'No'} />
            <Row label="Reversal" value={io.reversal} />
            <Row label="Urine Output" value={io.urine_output_ml != null ? `${io.urine_output_ml} mL` : '—'} />
            <Row label="Count Correct" value={io.count_correct ? 'Yes' : 'No'} />
          </div>
        </Card>
      </div>
      <Card>
        <SH title="Intra-op Fluids" />
        <div className="space-y-1.5">
          {(io.fluids || []).map((f, i) => (
            <div key={i} className="flex justify-between text-xs py-1.5 border-b last:border-0" style={{ borderColor: '#f3f4f6' }}>
              <span className="text-gray-700">{f.type}</span>
              <span className="font-semibold text-gray-800">{f.volume_ml} mL</span>
            </div>
          ))}
          <div className="flex justify-between text-xs font-bold py-1.5 mt-1" style={{ color: NAVY }}>
            <span>Total</span><span>{totalIn} mL</span>
          </div>
        </div>
      </Card>
      {io.surgeon_summary && (
        <Card>
          <SH title="Surgeon's Summary" />
          <p className="text-sm text-gray-700 whitespace-pre-line">{io.surgeon_summary}</p>
        </Card>
      )}
    </div>
  )
}

// ─── POSTOP sections ──────────────────────────────────────────────────────────
function AldreteCard({ aldrete, onRecord }) {
  if (!aldrete) {
    return (
      <Card>
        <SH title="Recovery Room — Aldrete Score" />
        <div className="flex flex-col items-center py-6 gap-2 text-gray-400">
          <Activity size={24} className="opacity-30" />
          <p className="text-xs">Aldrete score not yet recorded</p>
          <button onClick={onRecord} className="text-xs font-semibold px-4 py-2 rounded-lg text-white mt-1" style={{ background: GREEN }}>Record Aldrete Score</button>
        </div>
      </Card>
    )
  }
  const total = aldrete.activity + aldrete.respiration + aldrete.circulation + aldrete.consciousness + aldrete.spo2
  const readyColor = total >= 9 ? '#15803d' : total >= 7 ? AMBER : RED
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Aldrete Score</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold" style={{ color: readyColor }}>Score: {total}/10 {total >= 9 ? '— Discharge Ready' : '— Not yet ready'}</span>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2 mb-4">
        {[['Activity', aldrete.activity], ['Respiration', aldrete.respiration], ['Circulation', aldrete.circulation], ['Consciousness', aldrete.consciousness], ['SpO₂', aldrete.spo2]].map(([l, v]) => (
          <div key={l} className="rounded-lg border p-2 text-center" style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{l}</div>
            <div className="text-xl font-extrabold text-gray-800 mt-0.5">{v}</div>
          </div>
        ))}
      </div>
      <div className="text-xs text-gray-500">Recorded {fmtDt(aldrete.recorded_at)} by {aldrete.by} {aldrete.nausea && <span className="ml-2 text-amber-600 font-semibold">· Nausea present</span>}</div>
    </Card>
  )
}

function VitalsMonitor({ vitals, onRecord }) {
  return (
    <Card>
      <SH title="Post-op Vitals" action="Record Vitals" onAction={onRecord} />
      {vitals.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-2">No vitals recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr style={{ background: '#f9fafb' }}>{['Time','BP','Pulse','Temp','SpO₂','RR','AVPU','Pain (R/M)','By'].map(h => <th key={h} className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider text-gray-400 border-b whitespace-nowrap" style={{ borderColor: '#e9eaec' }}>{h}</th>)}</tr></thead>
            <tbody>
              {vitals.map((v, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-gray-50" style={{ borderColor: '#f3f4f6' }}>
                  <td className="px-3 py-2 text-[10px] text-gray-400 whitespace-nowrap">{fmtDt(v.time)}</td>
                  <td className="px-3 py-2 text-xs font-semibold text-gray-800">{v.bp}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{v.pulse}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{v.temp}°C</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{v.spo2}%</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{v.rr}</td>
                  <td className="px-3 py-2 text-xs font-bold" style={{ color: v.avpu === 'A' ? '#15803d' : RED }}>{v.avpu}</td>
                  <td className="px-3 py-2 text-xs text-gray-700">{v.pain_rest}/{v.pain_move}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{v.by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function PainManagement({ log, onAdd }) {
  return (
    <Card>
      <SH title="Pain Management" action="Log Pain" onAction={onAdd} />
      {log.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-2">No pain assessments recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {log.map((e, i) => (
            <div key={i} className="border rounded-xl p-3" style={{ borderColor: '#e9eaec' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gray-400">{fmtDt(e.time)} · {e.by}</span>
                <div className="flex gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#fee2e2', color: RED }}>Rest: {e.rest}/10</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#fff7ed', color: '#c2410c' }}>Move: {e.move}/10</span>
                </div>
              </div>
              <p className="text-xs text-gray-700"><span className="font-semibold">{e.site}</span> — {e.character}</p>
              {e.intervention && <p className="text-xs text-gray-500 mt-1">Intervention: {e.intervention} → Response: {e.response}/10</p>}
            </div>
          ))}
        </div>
      )}
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
        <SH title="O₂ Therapy" />
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
        <SH title="Incentive Spirometry" />
        {(r.spirometry || []).length === 0 ? (
          <p className="text-xs text-gray-400 italic py-2">No spirometry records yet.</p>
        ) : (
          <table className="w-full">
            <thead><tr style={{ background: '#f9fafb' }}>{['Time','Target (mL)','Achieved (mL)','%','By'].map(h => <th key={h} className="px-3 py-2 text-left text-[9px] font-bold text-gray-400 border-b" style={{ borderColor: '#e9eaec' }}>{h}</th>)}</tr></thead>
            <tbody>{(r.spirometry || []).map((s, i) => {
              const pct = Math.round((s.achieved / s.target) * 100)
              return <tr key={i} className="border-b last:border-0 hover:bg-gray-50" style={{ borderColor: '#f3f4f6' }}><td className="px-3 py-1.5 text-[10px] text-gray-400 whitespace-nowrap">{fmtDt(s.time)}</td><td className="px-3 py-1.5 text-xs text-gray-700">{s.target}</td><td className="px-3 py-1.5 text-xs font-semibold text-gray-800">{s.achieved}</td><td className="px-3 py-1.5 text-xs font-bold" style={{ color: pct >= 80 ? '#15803d' : pct >= 50 ? AMBER : RED }}>{pct}%</td><td className="px-3 py-1.5 text-xs text-gray-500">{s.by}</td></tr>
            })}</tbody>
          </table>
        )}
      </Card>
      <Card>
        <SH title="Breath Sounds Assessment" />
        {(r.breath_sounds || []).length === 0 ? (
          <p className="text-xs text-gray-400 italic py-2">No breath sound assessments yet.</p>
        ) : (
          (r.breath_sounds || []).map((b, i) => (
            <div key={i} className="flex items-center gap-4 py-2 border-b last:border-0 text-xs" style={{ borderColor: '#f3f4f6' }}>
              <span className="text-[10px] text-gray-400 w-32 flex-shrink-0">{fmtDt(b.time)}</span>
              <span className="w-20 flex-shrink-0"><b>R:</b> {b.right}</span>
              <span className="w-28 flex-shrink-0"><b>L:</b> {b.left}</span>
              <span className="text-gray-400">{b.by}</span>
            </div>
          ))
        )}
      </Card>
      <Card>
        <SH title="Deep Breathing Exercises" />
        {(r.deep_breathing || []).length === 0 ? (
          <p className="text-xs text-gray-400 italic py-2">No deep breathing records yet.</p>
        ) : (
          (r.deep_breathing || []).map((db, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5 border-b last:border-0 text-xs" style={{ borderColor: '#f3f4f6' }}>
              <Check size={12} className="text-green-600 flex-shrink-0" />
              <span className="text-gray-700 flex-1">{db.shift}</span>
              <span className="text-gray-400">{fmtDt(db.time)} · {db.by}</span>
            </div>
          ))
        )}
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
      <SH title="Post-op Fluid Balance" />
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: '#0369a1' }}>IN</p>
          {(fb?.in || []).length === 0 && <p className="text-xs text-gray-400 italic">No intake recorded.</p>}
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
          {(fb?.out || []).length === 0 && <p className="text-xs text-gray-400 italic">No output recorded.</p>}
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
        {mobility.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-2">No ambulation records yet.</p>
        ) : (
          mobility.map((m, i) => (
            <div key={i} className="flex items-start gap-3 py-2.5 border-b last:border-0" style={{ borderColor: '#f3f4f6' }}>
              <span className="text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 mt-0.5" style={{ background: levelColor[m.level] || '#f3f4f6', color: '#374151' }}>{m.level}</span>
              <div className="flex-1 text-xs">
                <p className="text-gray-700">Assisted by: {m.assisted_by} · Tolerance: <b className={m.tolerance === 'Good' ? 'text-green-700' : 'text-red-600'}>{m.tolerance}</b></p>
                {m.distance && <p className="text-gray-500">Distance: {m.distance} m</p>}
                {m.pain && <p className="text-amber-600 font-semibold">Pain on mobilisation</p>}
              </div>
              <span className="text-[10px] text-gray-400 flex-shrink-0">{fmtDt(m.time)} · {m.by}</span>
            </div>
          ))
        )}
      </Card>
      {dvt && (
        <Card>
          <SH title="DVT Prophylaxis" />
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            <Row label="Compression Stockings AM" value={dvt.stockings_am ? '✓ Applied' : '—'} />
            <Row label="Compression Stockings PM" value={dvt.stockings_pm ? '✓ Applied' : '—'} />
            <Row label="Sequential Compression" value={dvt.scd ? '✓ Applied' : 'Not used'} />
            <Row label="LMWH" value={dvt.lmwh} />
          </div>
        </Card>
      )}
    </>
  )
}

function MilestonesCard({ milestones, onMark }) {
  const entries = Object.entries(milestones)
  const done = entries.filter(([, v]) => v.done).length
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Recovery Milestones</span>
        <span className="text-xs font-bold text-gray-500">{done}/{entries.length} reached</span>
      </div>
      <div className="space-y-2">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-center gap-3 py-1">
            <button onClick={() => !val.done && onMark(key)}
              className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-2 ${val.done ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-green-300'}`}>
              {val.done && <Check size={10} className="text-green-600" />}
            </button>
            <div className="flex-1 text-xs">
              <span className={val.done ? 'text-gray-700 font-medium' : 'text-gray-500'}>{key}</span>
              {val.done && <span className="ml-2 text-[10px] text-gray-400">{fmtDt(val.time)} · {val.by}</span>}
              {val.notes && <span className="ml-2 text-[10px] text-gray-500 italic">{val.notes}</span>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function DischargeCriteriaCard({ instructions, instructionsReviewed, criteria, onReview, onTick }) {
  const entries = Object.entries(criteria)
  const metCount = entries.filter(([, v]) => v).length
  return (
    <>
      {instructions && (
        <Card>
          <div className="flex items-start justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Surgeon's Instructions</span>
            {!instructionsReviewed
              ? <button onClick={onReview} className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border" style={{ color: GREEN, borderColor: '#a7f3d0', background: '#f0fdf4' }}>Mark Reviewed</button>
              : <span className="text-[10px] font-bold text-green-700">✦ Reviewed</span>}
          </div>
          <p className="text-xs text-gray-700 whitespace-pre-line">{instructions}</p>
        </Card>
      )}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Discharge Criteria</span>
          <span className="text-xs font-bold" style={{ color: metCount === entries.length ? '#15803d' : AMBER }}>{metCount}/{entries.length} met</span>
        </div>
        <div className="space-y-1.5">
          {entries.map(([key, met]) => (
            <button key={key} onClick={() => !met && onTick(key)} className="w-full flex items-center gap-2.5 text-left py-1 px-1.5 rounded-lg hover:bg-gray-50">
              <span className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border ${met ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-white'}`}>
                {met && <Check size={9} className="text-green-600" />}
              </span>
              <span className="text-xs" style={{ color: met ? '#15803d' : '#374151' }}>{key}</span>
            </button>
          ))}
        </div>
      </Card>
    </>
  )
}

// ─── Sidebar nav ──────────────────────────────────────────────────────────────
function MiniNav({ items, active, onSelect }) {
  return (
    <div className="flex-shrink-0 w-36 border-r overflow-y-auto" style={{ borderColor: '#e9eaec' }}>
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

// ─── Action Drawers ────────────────────────────────────────────────────────────

function OTTransferDrawer({ onSave, onClose }) {
  const now = new Date().toISOString().slice(0, 16)
  const [form, setForm] = useState({ time_left: now, escorted_by: '', handover_to: '', mode: 'Trolley', iv_running: false, o2_required: false, family_informed: false, remarks: '' })
  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })
  const valid = form.escorted_by.trim() && form.handover_to.trim()
  return (
    <Drawer title="Log OT Transfer" onClose={onClose}>
      <div className="flex-1 overflow-y-auto p-4">
        <Field label="Time Left Ward">
          <input type="datetime-local" {...f('time_left')} className={inputCls} />
        </Field>
        <Field label="Escorted By">
          <input type="text" {...f('escorted_by')} placeholder="Nurse name" className={inputCls} />
        </Field>
        <Field label="Handover To">
          <input type="text" {...f('handover_to')} placeholder="OT nurse/team name" className={inputCls} />
        </Field>
        <Field label="Transfer Mode">
          <select {...f('mode')} className={selectCls}>
            {['Trolley','Wheelchair','Walking','Stretcher'].map(m => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[['iv_running','IV Running'],['o2_required','O₂ Required'],['family_informed','Family Informed']].map(([k, label]) => (
            <label key={k} className="flex flex-col items-center gap-1 border rounded-xl p-2.5 cursor-pointer" style={{ borderColor: form[k] ? GREEN : '#e9eaec', background: form[k] ? '#f0fdf4' : '#f9fafb' }}>
              <input type="checkbox" checked={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.checked }))} className="sr-only" />
              <span className={`w-5 h-5 rounded flex items-center justify-center border-2 ${form[k] ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
                {form[k] && <Check size={11} className="text-green-600" />}
              </span>
              <span className="text-[10px] font-semibold text-gray-600 text-center">{label}</span>
            </label>
          ))}
        </div>
        <Field label="Remarks">
          <textarea {...f('remarks')} rows={3} placeholder="Any notes…" className={inputCls} />
        </Field>
      </div>
      <div className="p-4 border-t flex gap-2">
        <button onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm text-gray-600">Cancel</button>
        <button onClick={() => valid && onSave({ ...form, done: true, time_left: new Date(form.time_left).toISOString() })} disabled={!valid}
          className="flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1"
          style={{ background: valid ? GREEN : '#d1d5db' }}>
          <Save size={13} /> Save Transfer
        </button>
      </div>
    </Drawer>
  )
}

function AldreteDrawer({ onSave, onClose }) {
  const [form, setForm] = useState({ activity: 2, respiration: 2, circulation: 2, consciousness: 2, spo2: 2, nausea: false, by: '' })
  const total = form.activity + form.respiration + form.circulation + form.consciousness + form.spo2
  const CRITERIA = {
    activity:      { label: 'Activity',      desc: { 0: 'No movement', 1: 'Moves 2 extremities', 2: 'Moves all extremities' } },
    respiration:   { label: 'Respiration',   desc: { 0: 'Apnoea', 1: 'Limited breathing/dyspnoea', 2: 'Breathes deeply & coughs' } },
    circulation:   { label: 'Circulation',   desc: { 0: '±50% of pre-op BP', 1: '±20-50%', 2: '±20% of pre-op BP' } },
    consciousness: { label: 'Consciousness', desc: { 0: 'No response', 1: 'Arousable on calling', 2: 'Fully awake' } },
    spo2:          { label: 'SpO₂',          desc: { 0: '<90% with O₂', 1: 'Needs O₂ to maintain ≥90%', 2: '≥92% on room air' } },
  }
  const readyColor = total >= 9 ? '#15803d' : total >= 7 ? AMBER : RED
  return (
    <Drawer title="Record Aldrete Score" onClose={onClose}>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-xl border p-3 mb-4 text-center" style={{ borderColor: readyColor, background: `${readyColor}10` }}>
          <div className="text-2xl font-extrabold" style={{ color: readyColor }}>{total}/10</div>
          <div className="text-xs font-semibold mt-0.5" style={{ color: readyColor }}>{total >= 9 ? 'Ready for discharge from recovery' : 'Not yet ready'}</div>
        </div>
        {Object.entries(CRITERIA).map(([key, { label, desc }]) => (
          <div key={key} className="mb-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">{label}</div>
            <div className="flex gap-2">
              {[0, 1, 2].map(v => (
                <button key={v} onClick={() => setForm(p => ({ ...p, [key]: v }))}
                  className="flex-1 rounded-lg border p-2 text-left transition-colors"
                  style={{ borderColor: form[key] === v ? GREEN : '#e9eaec', background: form[key] === v ? '#f0fdf4' : '#f9fafb' }}>
                  <div className="text-sm font-extrabold mb-0.5" style={{ color: form[key] === v ? GREEN : '#374151' }}>{v}</div>
                  <div className="text-[9px] text-gray-400 leading-tight">{desc[v]}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
        <label className="flex items-center gap-2 mt-2 mb-3 cursor-pointer">
          <input type="checkbox" checked={form.nausea} onChange={e => setForm(p => ({ ...p, nausea: e.target.checked }))} />
          <span className="text-sm text-gray-700">Nausea / Vomiting present</span>
        </label>
        <Field label="Recorded By">
          <input type="text" value={form.by} onChange={e => setForm(p => ({ ...p, by: e.target.value }))} placeholder="Nurse name" className={inputCls} />
        </Field>
      </div>
      <div className="p-4 border-t flex gap-2">
        <button onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm text-gray-600">Cancel</button>
        <button onClick={() => onSave({ ...form, recorded_at: nowIso(), total })}
          className="flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1"
          style={{ background: GREEN }}>
          <Save size={13} /> Save Score
        </button>
      </div>
    </Drawer>
  )
}

function VitalsDrawer({ onSave, onClose }) {
  const [form, setForm] = useState({ bp: '', pulse: '', temp: '', spo2: '', rr: '', avpu: 'A', pain_rest: 0, pain_move: 0, by: '' })
  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })
  const valid = form.bp && form.pulse && form.by
  return (
    <Drawer title="Record Post-op Vitals" onClose={onClose}>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="BP (mmHg)"><input type="text" {...f('bp')} placeholder="120/80" className={inputCls} /></Field>
          <Field label="Pulse (bpm)"><input type="number" {...f('pulse')} placeholder="80" className={inputCls} /></Field>
          <Field label="Temp (°C)"><input type="number" step="0.1" {...f('temp')} placeholder="37.0" className={inputCls} /></Field>
          <Field label="SpO₂ (%)"><input type="number" {...f('spo2')} placeholder="98" className={inputCls} /></Field>
          <Field label="RR (/min)"><input type="number" {...f('rr')} placeholder="16" className={inputCls} /></Field>
          <Field label="AVPU">
            <select {...f('avpu')} className={selectCls}>
              {['A — Alert','V — Voice','P — Pain','U — Unresponsive'].map(o => <option key={o} value={o[0]}>{o}</option>)}
            </select>
          </Field>
        </div>
        <Field label={`Pain at Rest: ${form.pain_rest}/10`}>
          <input type="range" min="0" max="10" value={form.pain_rest} onChange={e => setForm(p => ({ ...p, pain_rest: +e.target.value }))} className="w-full" />
        </Field>
        <Field label={`Pain on Movement: ${form.pain_move}/10`}>
          <input type="range" min="0" max="10" value={form.pain_move} onChange={e => setForm(p => ({ ...p, pain_move: +e.target.value }))} className="w-full" />
        </Field>
        <Field label="Recorded By"><input type="text" {...f('by')} placeholder="Nurse name" className={inputCls} /></Field>
      </div>
      <div className="p-4 border-t flex gap-2">
        <button onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm text-gray-600">Cancel</button>
        <button onClick={() => valid && onSave({ ...form, pulse: +form.pulse, temp: +form.temp, spo2: +form.spo2, rr: +form.rr, time: nowIso() })} disabled={!valid}
          className="flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1"
          style={{ background: valid ? GREEN : '#d1d5db' }}>
          <Save size={13} /> Save Vitals
        </button>
      </div>
    </Drawer>
  )
}

function PainDrawer({ onSave, onClose }) {
  const [form, setForm] = useState({ site: '', character: 'Sharp', rest: 0, move: 0, intervention: '', response: 0, by: '' })
  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })
  const valid = form.site.trim() && form.by.trim()
  return (
    <Drawer title="Log Pain Assessment" onClose={onClose}>
      <div className="flex-1 overflow-y-auto p-4">
        <Field label="Pain Site"><input type="text" {...f('site')} placeholder="e.g. Abdomen RIF" className={inputCls} /></Field>
        <Field label="Character">
          <select {...f('character')} className={selectCls}>
            {['Sharp','Dull aching','Burning','Cramping','Stabbing','Throbbing','Pressure','Colicky'].map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label={`Pain at Rest: ${form.rest}/10`}>
          <input type="range" min="0" max="10" value={form.rest} onChange={e => setForm(p => ({ ...p, rest: +e.target.value }))} className="w-full" />
        </Field>
        <Field label={`Pain on Movement: ${form.move}/10`}>
          <input type="range" min="0" max="10" value={form.move} onChange={e => setForm(p => ({ ...p, move: +e.target.value }))} className="w-full" />
        </Field>
        <Field label="Intervention Given"><input type="text" {...f('intervention')} placeholder="e.g. Morphine 2mg IV" className={inputCls} /></Field>
        <Field label={`Pain Response (after intervention): ${form.response}/10`}>
          <input type="range" min="0" max="10" value={form.response} onChange={e => setForm(p => ({ ...p, response: +e.target.value }))} className="w-full" />
        </Field>
        <Field label="Assessed By"><input type="text" {...f('by')} placeholder="Nurse name" className={inputCls} /></Field>
      </div>
      <div className="p-4 border-t flex gap-2">
        <button onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm text-gray-600">Cancel</button>
        <button onClick={() => valid && onSave({ ...form, time: nowIso() })} disabled={!valid}
          className="flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1"
          style={{ background: valid ? GREEN : '#d1d5db' }}>
          <Save size={13} /> Save Assessment
        </button>
      </div>
    </Drawer>
  )
}

function WoundDrawer({ wound, onSave, onClose }) {
  const [form, setForm] = useState({ appearance: wound?.appearance || 'Dry', edges: wound?.edges || 'Well-approximated', surrounding: wound?.surrounding || 'Normal', changed_by: '' })
  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })
  const valid = form.changed_by.trim()
  return (
    <Drawer title={`Assess: ${wound?.label}`} onClose={onClose}>
      <div className="flex-1 overflow-y-auto p-4">
        <Field label="Appearance">
          <select {...f('appearance')} className={selectCls}>
            {['Dry','Slightly moist','Seeping','Soaked','Saturated'].map(a => <option key={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Wound Edges">
          <select {...f('edges')} className={selectCls}>
            {['Well-approximated','Slightly open','Gaping','Dehiscence','Evisceration'].map(e => <option key={e}>{e}</option>)}
          </select>
        </Field>
        <Field label="Surrounding Tissue">
          <select {...f('surrounding')} className={selectCls}>
            {['Normal','Mild erythema','Erythema','Oedema','Induration','Maceration','Necrosis'].map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Assessed By"><input type="text" {...f('changed_by')} placeholder="Nurse name" className={inputCls} /></Field>
      </div>
      <div className="p-4 border-t flex gap-2">
        <button onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm text-gray-600">Cancel</button>
        <button onClick={() => valid && onSave(wound, { ...form, time: nowIso() })} disabled={!valid}
          className="flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1"
          style={{ background: valid ? GREEN : '#d1d5db' }}>
          <Save size={13} /> Save Assessment
        </button>
      </div>
    </Drawer>
  )
}

function DrainOutputDrawer({ drain, onSave, onClose }) {
  const [form, setForm] = useState({ amount: '', color: drain?.color || 'Serosanguineous', by: '' })
  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })
  const valid = form.amount && form.by.trim()
  return (
    <Drawer title={`Log Output: ${drain?.name}`} onClose={onClose}>
      <div className="flex-1 overflow-y-auto p-4">
        <Field label="Amount (mL)"><input type="number" {...f('amount')} placeholder="0" className={inputCls} min="0" /></Field>
        <Field label="Color / Character">
          <select {...f('color')} className={selectCls}>
            {['Sanguineous','Serosanguineous','Serous','Bile','Chyle','Purulent','Clear'].map(c => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Logged By"><input type="text" {...f('by')} placeholder="Nurse name" className={inputCls} /></Field>
      </div>
      <div className="p-4 border-t flex gap-2">
        <button onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm text-gray-600">Cancel</button>
        <button onClick={() => valid && onSave(drain, { amount: +form.amount, color: form.color, by: form.by, time: nowIso() })} disabled={!valid}
          className="flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1"
          style={{ background: valid ? GREEN : '#d1d5db' }}>
          <Save size={13} /> Log Output
        </button>
      </div>
    </Drawer>
  )
}

function AmbulationDrawer({ onSave, onClose }) {
  const [form, setForm] = useState({ level: 'Sitting up', assisted_by: '', tolerance: 'Good', pain: false, distance: '', by: '' })
  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })
  const valid = form.assisted_by.trim() && form.by.trim()
  return (
    <Drawer title="Log Ambulation" onClose={onClose}>
      <div className="flex-1 overflow-y-auto p-4">
        <Field label="Mobility Level">
          <select {...f('level')} className={selectCls}>
            {['Bed rest','Sitting up','Dangling','Standing','Walking in room','Walking corridor'].map(l => <option key={l}>{l}</option>)}
          </select>
        </Field>
        <Field label="Assisted By"><input type="text" {...f('assisted_by')} placeholder="Nurse / physio name" className={inputCls} /></Field>
        <Field label="Tolerance">
          <select {...f('tolerance')} className={selectCls}>
            {['Good','Fair','Poor'].map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Distance (m, if applicable)"><input type="number" {...f('distance')} placeholder="e.g. 10" className={inputCls} min="0" /></Field>
        <label className="flex items-center gap-2 mb-3 cursor-pointer">
          <input type="checkbox" checked={form.pain} onChange={e => setForm(p => ({ ...p, pain: e.target.checked }))} />
          <span className="text-sm text-gray-700">Pain on mobilisation</span>
        </label>
        <Field label="Logged By"><input type="text" {...f('by')} placeholder="Nurse name" className={inputCls} /></Field>
      </div>
      <div className="p-4 border-t flex gap-2">
        <button onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm text-gray-600">Cancel</button>
        <button onClick={() => valid && onSave({ ...form, distance: form.distance ? +form.distance : null, time: nowIso() })} disabled={!valid}
          className="flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1"
          style={{ background: valid ? GREEN : '#d1d5db' }}>
          <Save size={13} /> Log Ambulation
        </button>
      </div>
    </Drawer>
  )
}

// ─── Nav config ───────────────────────────────────────────────────────────────
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function PrePostOp({ admission }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [phase,   setPhase]   = useState('postop')
  const [preNav,  setPreNav]  = useState('schedule')
  const [postNav, setPostNav] = useState('aldrete')
  const [pin,     setPin]     = useState(null)
  const [drawer,  setDrawer]  = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/inpatient/admissions/${admission?.id}/periop`)
      if (res?.procedure) setData(res)
      else throw new Error('empty')
    } catch { setData(buildMock()) } finally { setLoading(false) }
  }, [admission?.id])

  useEffect(() => { if (admission?.id) load() }, [load])

  const saveData = useCallback(async (next) => {
    try { await api.post(`/inpatient/admissions/${admission?.id}/periop`, next) } catch { /* non-blocking */ }
  }, [admission?.id])

  const updateData = useCallback((updater) => {
    setData(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveData(next)
      return next
    })
  }, [saveData])

  const askPin = (title, onConfirm) => setPin({ title, onConfirm })

  const tickChecklist = key => askPin(`Confirm: ${key}`, () => {
    updateData(prev => ({
      ...prev,
      preop: { ...prev.preop, checklist: { ...prev.preop.checklist, [key]: { done: true, time: nowIso(), by: 'Me' } } }
    }))
  })

  const tickDischarge = key => askPin(`Confirm: ${key}`, () => {
    updateData(prev => ({
      ...prev,
      postop: { ...prev.postop, discharge_criteria: { ...prev.postop.discharge_criteria, [key]: true } }
    }))
  })

  const markMilestone = key => askPin(`Mark: ${key}`, () => {
    updateData(prev => ({
      ...prev,
      postop: { ...prev.postop, milestones: { ...prev.postop.milestones, [key]: { done: true, time: nowIso(), by: 'Me', notes: '' } } }
    }))
  })

  const reviewInstructions = () => askPin('Mark surgeon instructions reviewed', () => {
    updateData(prev => ({ ...prev, postop: { ...prev.postop, surgeon_instructions_reviewed: true } }))
  })

  // Drawer handlers — all open after PIN confirm
  const openOTTransfer = () => askPin('Log OT Transfer', () => setDrawer({ type: 'ot_transfer' }))

  const saveOTTransfer = (transfer) => {
    updateData(prev => ({ ...prev, preop: { ...prev.preop, ot_transfer: transfer } }))
    setDrawer(null)
  }

  const openAldrete = () => askPin('Record Aldrete Score', () => setDrawer({ type: 'aldrete' }))

  const saveAldrete = (aldrete) => {
    updateData(prev => ({ ...prev, postop: { ...prev.postop, aldrete } }))
    setDrawer(null)
  }

  const openVitals = () => askPin('Record Post-op Vitals', () => setDrawer({ type: 'vitals' }))

  const saveVitals = (entry) => {
    updateData(prev => ({ ...prev, postop: { ...prev.postop, vitals: [...(prev.postop.vitals || []), entry] } }))
    setDrawer(null)
  }

  const openPain = () => askPin('Log Pain Assessment', () => setDrawer({ type: 'pain' }))

  const savePain = (entry) => {
    updateData(prev => ({ ...prev, postop: { ...prev.postop, pain_log: [...(prev.postop.pain_log || []), entry] } }))
    setDrawer(null)
  }

  const openWoundAssess = (wound) => askPin(`Assess ${wound.label}`, () => setDrawer({ type: 'wound', wound }))

  const saveWoundAssess = (wound, assessment) => {
    updateData(prev => ({
      ...prev,
      postop: {
        ...prev.postop,
        wounds: prev.postop.wounds.map(w => w.id === wound.id
          ? { ...w, appearance: assessment.appearance, edges: assessment.edges, surrounding: assessment.surrounding, last_changed: assessment.time, changed_by: assessment.changed_by, history: [...(w.history || []), { time: assessment.time, appearance: assessment.appearance, edges: assessment.edges, by: assessment.changed_by }] }
          : w)
      }
    }))
    setDrawer(null)
  }

  const openDrainLog = (drain) => askPin(`Log Output: ${drain.name}`, () => setDrawer({ type: 'drain_output', drain }))

  const saveDrainOutput = (drain, entry) => {
    updateData(prev => ({
      ...prev,
      postop: {
        ...prev.postop,
        drains: prev.postop.drains.map(d => d.id === drain.id
          ? { ...d, color: entry.color, shift_output: d.shift_output + entry.amount, total_output: d.total_output + entry.amount, last_emptied: entry.time, emptied_by: entry.by, log: [...(d.log || []), entry] }
          : d)
      }
    }))
    setDrawer(null)
  }

  const removeDrain = (drain) => askPin(`Remove drain: ${drain.name}`, () => {
    updateData(prev => ({
      ...prev,
      postop: { ...prev.postop, drains: prev.postop.drains.map(d => d.id === drain.id ? { ...d, removed: true } : d) }
    }))
  })

  const openAmbulation = () => askPin('Log Ambulation', () => setDrawer({ type: 'ambulation' }))

  const saveAmbulation = (entry) => {
    updateData(prev => ({ ...prev, postop: { ...prev.postop, mobility: [...(prev.postop.mobility || []), entry] } }))
    setDrawer(null)
  }

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
              {preNav === 'fasting'        && <FastingPrep p={pr} onPin={label => askPin(label, () => updateData(prev => ({ ...prev, preop: { ...prev.preop, fasting_confirmed: true } })))} />}
              {preNav === 'checklist'      && <Checklist checklist={pr.checklist || {}} onTick={tickChecklist} />}
              {preNav === 'investigations' && <Investigations items={pr.investigations || []} />}
              {preNav === 'premeds'        && <PreMeds premeds={pr.premeds || []} />}
              {preNav === 'transfer'       && <OTTransfer transfer={pr.ot_transfer} onLog={openOTTransfer} />}
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
              {postNav === 'aldrete'   && <AldreteCard aldrete={po.aldrete} onRecord={openAldrete} />}
              {postNav === 'vitals'    && <VitalsMonitor vitals={po.vitals || []} onRecord={openVitals} />}
              {postNav === 'pain'      && <PainManagement log={po.pain_log || []} onAdd={openPain} />}
              {postNav === 'wound'     && <WoundCare wounds={po.wounds || []} onAssess={openWoundAssess} />}
              {postNav === 'drains'    && <DrainManagement drains={po.drains || []} onLog={openDrainLog} onRemove={removeDrain} />}
              {postNav === 'resp'      && <RespiratoryCard resp={po.respiratory} />}
              {postNav === 'fluid'     && <FluidBalance fb={po.fluid_balance} />}
              {postNav === 'mobility'  && <MobilityCard mobility={po.mobility || []} dvt={po.dvt} onLog={openAmbulation} />}
              {postNav === 'milestones'&& <MilestonesCard milestones={po.milestones || {}} onMark={markMilestone} />}
              {postNav === 'discharge' && <DischargeCriteriaCard instructions={po.surgeon_instructions} instructionsReviewed={po.surgeon_instructions_reviewed} criteria={po.discharge_criteria || {}} onReview={reviewInstructions} onTick={tickDischarge} />}
            </div>
          </>
        )}
      </div>

      {/* Drawers */}
      {drawer?.type === 'ot_transfer'  && <OTTransferDrawer  onSave={saveOTTransfer}  onClose={() => setDrawer(null)} />}
      {drawer?.type === 'aldrete'      && <AldreteDrawer      onSave={saveAldrete}     onClose={() => setDrawer(null)} />}
      {drawer?.type === 'vitals'       && <VitalsDrawer       onSave={saveVitals}      onClose={() => setDrawer(null)} />}
      {drawer?.type === 'pain'         && <PainDrawer         onSave={savePain}        onClose={() => setDrawer(null)} />}
      {drawer?.type === 'wound'        && <WoundDrawer        wound={drawer.wound}     onSave={saveWoundAssess}  onClose={() => setDrawer(null)} />}
      {drawer?.type === 'drain_output' && <DrainOutputDrawer  drain={drawer.drain}     onSave={saveDrainOutput}  onClose={() => setDrawer(null)} />}
      {drawer?.type === 'ambulation'   && <AmbulationDrawer   onSave={saveAmbulation}  onClose={() => setDrawer(null)} />}

      {pin && <PinModal title={pin.title} onConfirm={() => { pin.onConfirm(); setPin(null) }} onCancel={() => setPin(null)} />}
    </div>
  )
}