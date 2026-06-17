import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  Clock, User, FileText, Truck, Home, Ambulance, Users,
  Lock, Loader2, ClipboardList, Stethoscope, Pill, Droplet,
  PrinterCheck, Calendar, Phone, Package, X
} from 'lucide-react'
import api from '../api/client'
import { useWardSession } from '../contexts/WardSessionContext'

const GREEN = '#065F46'
const NAVY = '#0F2557'
const AMBER = '#b45309'
const RED = '#b91c1c'

// ─── Mock data ────────────────────────────────────────────────────────────────
const NOW = new Date()
const daysAgo = d => new Date(NOW - d * 86400000).toISOString()
const hoursAgo = h => new Date(NOW - h * 3600000).toISOString()
const minsAgo = m => new Date(NOW - m * 60000).toISOString()

function buildMockChecklist(overrides = {}) {
  return {
    clinical: {
      summary_signed: { done: false, by: null, at: null, ...overrides.summary_signed },
      final_vitals: { done: false, by: null, at: null, ...overrides.final_vitals },
      medications_counselled: { done: false, by: null, at: null, ...overrides.medications_counselled },
      iv_removed: { done: false, by: null, at: null, ...overrides.iv_removed },
    },
    documentation: {
      letter_printed: { done: false, by: null, at: null, ...overrides.letter_printed },
      opd_booked: { done: false, by: null, at: null, ...overrides.opd_booked },
    },
    logistics: {
      family_informed: { done: false, by: null, at: null, ...overrides.family_informed },
      transport_arranged: { done: false, by: null, at: null, transport_mode: null, ...overrides.transport_arranged },
      belongings_returned: { done: false, by: null, at: null, ...overrides.belongings_returned },
    },
  }
}

const MOCK_PATIENTS = [
  // READY (4)
  {
    id: 'adm-001', bed: 'B-201', name: 'Rajesh Kumar Sharma', age: 54, gender: 'M',
    diagnosis: 'Type 2 DM with Foot Ulcer', los: 7, doctor: 'Dr. Ananya Sharma',
    destination: 'Home', status: 'READY', admission_date: daysAgo(7),
    notes: 'Patient educated on wound care. Follow-up with vascular surgery in 1 week.',
    checklist: buildMockChecklist({
      summary_signed: { done: true, by: 'Dr. Ananya Sharma', at: hoursAgo(3) },
      final_vitals: { done: true, by: 'Nurse Priya', at: hoursAgo(2) },
      medications_counselled: { done: true, by: 'Nurse Priya', at: hoursAgo(1.5) },
      iv_removed: { done: true, by: 'Nurse Divya', at: hoursAgo(1) },
      letter_printed: { done: true, by: 'Nurse Priya', at: hoursAgo(1) },
      opd_booked: { done: true, by: 'Receptionist', at: hoursAgo(0.5) },
      family_informed: { done: true, by: 'Nurse Priya', at: hoursAgo(1) },
      transport_arranged: { done: true, by: 'Nurse Divya', at: hoursAgo(0.5), transport_mode: 'Family' },
      belongings_returned: { done: true, by: 'Nurse Divya', at: minsAgo(20) },
    }),
  },
  {
    id: 'adm-002', bed: 'B-205', name: 'Sunita Devi Nair', age: 38, gender: 'F',
    diagnosis: 'Laparoscopic Cholecystectomy', los: 3, doctor: 'Dr. Pradeep Iyer',
    destination: 'Home', status: 'READY', admission_date: daysAgo(3),
    notes: 'Post-op recovery uneventful. Low fat diet advised.',
    checklist: buildMockChecklist({
      summary_signed: { done: true, by: 'Dr. Pradeep Iyer', at: hoursAgo(5) },
      final_vitals: { done: true, by: 'Nurse Kavya', at: hoursAgo(4) },
      medications_counselled: { done: true, by: 'Nurse Kavya', at: hoursAgo(3) },
      iv_removed: { done: true, by: 'Nurse Kavya', at: hoursAgo(3) },
      letter_printed: { done: true, by: 'Nurse Kavya', at: hoursAgo(2) },
      opd_booked: { done: true, by: 'Receptionist', at: hoursAgo(2) },
      family_informed: { done: true, by: 'Nurse Kavya', at: hoursAgo(1) },
      transport_arranged: { done: true, by: 'Nurse Kavya', at: hoursAgo(0.5), transport_mode: 'Family' },
      belongings_returned: { done: true, by: 'Nurse Kavya', at: minsAgo(10) },
    }),
  },
  {
    id: 'adm-003', bed: 'C-112', name: 'Mohammed Iqbal', age: 62, gender: 'M',
    diagnosis: 'COPD Exacerbation', los: 5, doctor: 'Dr. Ravi Menon',
    destination: 'Home', status: 'READY', admission_date: daysAgo(5),
    notes: 'Inhaler technique demonstrated. Pulmonology OPD in 2 weeks.',
    checklist: buildMockChecklist({
      summary_signed: { done: true, by: 'Dr. Ravi Menon', at: hoursAgo(4) },
      final_vitals: { done: true, by: 'Nurse Asha', at: hoursAgo(3) },
      medications_counselled: { done: true, by: 'Nurse Asha', at: hoursAgo(2) },
      iv_removed: { done: true, by: 'Nurse Asha', at: hoursAgo(2) },
      letter_printed: { done: true, by: 'Nurse Asha', at: hoursAgo(1.5) },
      opd_booked: { done: true, by: 'Receptionist', at: hoursAgo(1) },
      family_informed: { done: true, by: 'Nurse Asha', at: hoursAgo(1) },
      transport_arranged: { done: true, by: 'Nurse Asha', at: minsAgo(30), transport_mode: 'Ambulance' },
      belongings_returned: { done: true, by: 'Nurse Asha', at: minsAgo(15) },
    }),
  },
  {
    id: 'adm-004', bed: 'A-308', name: 'Lakshmi Venkataraman', age: 45, gender: 'F',
    diagnosis: 'Acute Pyelonephritis', los: 4, doctor: 'Dr. Suresh Pillai',
    destination: 'Home', status: 'READY', admission_date: daysAgo(4),
    notes: 'Urine C&S sensitivity noted. Course of oral antibiotics given.',
    checklist: buildMockChecklist({
      summary_signed: { done: true, by: 'Dr. Suresh Pillai', at: hoursAgo(6) },
      final_vitals: { done: true, by: 'Nurse Rekha', at: hoursAgo(5) },
      medications_counselled: { done: true, by: 'Nurse Rekha', at: hoursAgo(4) },
      iv_removed: { done: true, by: 'Nurse Rekha', at: hoursAgo(4) },
      letter_printed: { done: true, by: 'Nurse Rekha', at: hoursAgo(3) },
      opd_booked: { done: true, by: 'Receptionist', at: hoursAgo(3) },
      family_informed: { done: true, by: 'Nurse Rekha', at: hoursAgo(2) },
      transport_arranged: { done: true, by: 'Nurse Rekha', at: hoursAgo(1), transport_mode: 'Family' },
      belongings_returned: { done: true, by: 'Nurse Rekha', at: minsAgo(25) },
    }),
  },
  // PENDING (4)
  {
    id: 'adm-005', bed: 'B-210', name: 'Arjun Singh Rawat', age: 29, gender: 'M',
    diagnosis: 'Appendectomy (Laparoscopic)', los: 2, doctor: 'Dr. Ananya Sharma',
    destination: 'Home', status: 'PENDING', admission_date: daysAgo(2),
    notes: '',
    checklist: buildMockChecklist({
      summary_signed: { done: true, by: 'Dr. Ananya Sharma', at: hoursAgo(2) },
      final_vitals: { done: true, by: 'Nurse Priya', at: hoursAgo(1) },
      medications_counselled: { done: false },
      iv_removed: { done: false },
      letter_printed: { done: false },
      opd_booked: { done: false },
      family_informed: { done: true, by: 'Nurse Priya', at: hoursAgo(1) },
      transport_arranged: { done: false },
      belongings_returned: { done: false },
    }),
  },
  {
    id: 'adm-006', bed: 'C-108', name: 'Geeta Krishnamurthy', age: 71, gender: 'F',
    diagnosis: 'Hip Fracture — ORIF', los: 8, doctor: 'Dr. Ravi Menon',
    destination: 'Rehabilitation Centre', status: 'PENDING', admission_date: daysAgo(8),
    notes: 'Transfer to Medanta Rehab arranged. Physio notes handed over.',
    checklist: buildMockChecklist({
      summary_signed: { done: true, by: 'Dr. Ravi Menon', at: hoursAgo(5) },
      final_vitals: { done: true, by: 'Nurse Kavya', at: hoursAgo(4) },
      medications_counselled: { done: true, by: 'Nurse Kavya', at: hoursAgo(3) },
      iv_removed: { done: true, by: 'Nurse Kavya', at: hoursAgo(3) },
      letter_printed: { done: false },
      opd_booked: { done: false },
      family_informed: { done: true, by: 'Nurse Kavya', at: hoursAgo(2) },
      transport_arranged: { done: false },
      belongings_returned: { done: false },
    }),
  },
  {
    id: 'adm-007', bed: 'A-302', name: 'Deepak Chandrasekhar', age: 48, gender: 'M',
    diagnosis: 'Ischemic Stroke — Stable', los: 10, doctor: 'Dr. Pradeep Iyer',
    destination: 'Home', status: 'PENDING', admission_date: daysAgo(10),
    notes: 'Caregiver counselled on physiotherapy and diet.',
    checklist: buildMockChecklist({
      summary_signed: { done: false },
      final_vitals: { done: true, by: 'Nurse Asha', at: hoursAgo(6) },
      medications_counselled: { done: false },
      iv_removed: { done: true, by: 'Nurse Asha', at: hoursAgo(5) },
      letter_printed: { done: false },
      opd_booked: { done: false },
      family_informed: { done: true, by: 'Nurse Asha', at: hoursAgo(3) },
      transport_arranged: { done: false },
      belongings_returned: { done: false },
    }),
  },
  {
    id: 'adm-008', bed: 'B-216', name: 'Anita Bhatt', age: 33, gender: 'F',
    diagnosis: 'Preterm Labour — 34 weeks', los: 6, doctor: 'Dr. Suresh Pillai',
    destination: 'Home', status: 'PENDING', admission_date: daysAgo(6),
    notes: 'Baby discharged separately. Lactation counselling done.',
    checklist: buildMockChecklist({
      summary_signed: { done: true, by: 'Dr. Suresh Pillai', at: hoursAgo(4) },
      final_vitals: { done: true, by: 'Nurse Rekha', at: hoursAgo(3) },
      medications_counselled: { done: true, by: 'Nurse Rekha', at: hoursAgo(2) },
      iv_removed: { done: false },
      letter_printed: { done: true, by: 'Nurse Rekha', at: hoursAgo(1) },
      opd_booked: { done: false },
      family_informed: { done: false },
      transport_arranged: { done: false },
      belongings_returned: { done: false },
    }),
  },
  // DELAYED (2)
  {
    id: 'adm-009', bed: 'C-105', name: 'Venkatesh Raghavan', age: 67, gender: 'M',
    diagnosis: 'CABG — Post-op Day 8', los: 12, doctor: 'Dr. Ananya Sharma',
    destination: 'Home', status: 'DELAYED', admission_date: daysAgo(12),
    notes: 'Discharge planned since yesterday. Awaiting cardiology clearance letter.',
    checklist: buildMockChecklist({
      summary_signed: { done: false },
      final_vitals: { done: true, by: 'Nurse Divya', at: hoursAgo(10) },
      medications_counselled: { done: false },
      iv_removed: { done: false },
      letter_printed: { done: false },
      opd_booked: { done: false },
      family_informed: { done: false },
      transport_arranged: { done: false },
      belongings_returned: { done: false },
    }),
  },
  {
    id: 'adm-010', bed: 'A-315', name: 'Meenakshi Sundaram', age: 55, gender: 'F',
    diagnosis: 'Diabetic Ketoacidosis', los: 9, doctor: 'Dr. Ravi Menon',
    destination: 'Home', status: 'DELAYED', admission_date: daysAgo(9),
    notes: 'Family not reachable for transport. Social worker involved.',
    checklist: buildMockChecklist({
      summary_signed: { done: true, by: 'Dr. Ravi Menon', at: hoursAgo(24) },
      final_vitals: { done: true, by: 'Nurse Priya', at: hoursAgo(20) },
      medications_counselled: { done: false },
      iv_removed: { done: false },
      letter_printed: { done: false },
      opd_booked: { done: false },
      family_informed: { done: false },
      transport_arranged: { done: false },
      belongings_returned: { done: false },
    }),
  },
  // DISCHARGED (2)
  {
    id: 'adm-011', bed: '—', name: 'Prakash Gupta', age: 41, gender: 'M',
    diagnosis: 'Acute Appendicitis', los: 3, doctor: 'Dr. Pradeep Iyer',
    destination: 'Home', status: 'DISCHARGED', admission_date: daysAgo(3),
    discharge_time: hoursAgo(2),
    notes: 'Uneventful recovery. Discharged in stable condition.',
    checklist: buildMockChecklist({
      summary_signed: { done: true, by: 'Dr. Pradeep Iyer', at: hoursAgo(5) },
      final_vitals: { done: true, by: 'Nurse Asha', at: hoursAgo(4) },
      medications_counselled: { done: true, by: 'Nurse Asha', at: hoursAgo(3) },
      iv_removed: { done: true, by: 'Nurse Asha', at: hoursAgo(3) },
      letter_printed: { done: true, by: 'Nurse Asha', at: hoursAgo(3) },
      opd_booked: { done: true, by: 'Receptionist', at: hoursAgo(2.5) },
      family_informed: { done: true, by: 'Nurse Asha', at: hoursAgo(2.5) },
      transport_arranged: { done: true, by: 'Nurse Asha', at: hoursAgo(2), transport_mode: 'Family' },
      belongings_returned: { done: true, by: 'Nurse Asha', at: hoursAgo(2) },
    }),
  },
  {
    id: 'adm-012', bed: '—', name: 'Savitri Raghunath', age: 59, gender: 'F',
    diagnosis: 'Hypertensive Urgency', los: 4, doctor: 'Dr. Suresh Pillai',
    destination: 'Home', status: 'DISCHARGED', admission_date: daysAgo(4),
    discharge_time: hoursAgo(4),
    notes: 'BP stabilised on oral antihypertensives. Cardiology follow-up arranged.',
    checklist: buildMockChecklist({
      summary_signed: { done: true, by: 'Dr. Suresh Pillai', at: hoursAgo(8) },
      final_vitals: { done: true, by: 'Nurse Kavya', at: hoursAgo(7) },
      medications_counselled: { done: true, by: 'Nurse Kavya', at: hoursAgo(6) },
      iv_removed: { done: true, by: 'Nurse Kavya', at: hoursAgo(6) },
      letter_printed: { done: true, by: 'Nurse Kavya', at: hoursAgo(5) },
      opd_booked: { done: true, by: 'Receptionist', at: hoursAgo(5) },
      family_informed: { done: true, by: 'Nurse Kavya', at: hoursAgo(4.5) },
      transport_arranged: { done: true, by: 'Nurse Kavya', at: hoursAgo(4), transport_mode: 'Home' },
      belongings_returned: { done: true, by: 'Nurse Kavya', at: hoursAgo(4) },
    }),
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}
function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
}

function countPending(checklist) {
  let pending = 0
  for (const section of Object.values(checklist)) {
    for (const task of Object.values(section)) {
      if (!task.done) pending++
    }
  }
  return pending
}

// ─── Status chip ──────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  READY:      { bg: '#f0fdf4', color: '#065F46', border: '#a7f3d0', label: 'Ready' },
  PENDING:    { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'Pending' },
  DELAYED:    { bg: '#fff1f2', color: '#b91c1c', border: '#fecdd3', label: 'Delayed' },
  DISCHARGED: { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb', label: 'Discharged' },
}

function StatusChip({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.PENDING
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}>
      {s.label}
    </span>
  )
}

// ─── Checklist task row ───────────────────────────────────────────────────────
function TaskRow({ task, label, onMark, showTransportPicker, transportMode, onTransportMode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5 flex-shrink-0">
        {task.done
          ? <CheckCircle2 size={15} style={{ color: GREEN }} />
          : <div className="w-3.5 h-3.5 rounded-full border-2 mt-0.5" style={{ borderColor: '#d1d5db' }} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs ${task.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{label}</p>
        {task.done && task.by && (
          <p className="text-[10px] text-gray-400 mt-0.5">{task.by} · {fmtDateTime(task.at)}</p>
        )}
        {!task.done && showTransportPicker && (
          <div className="flex gap-1.5 mt-1.5">
            {['Home', 'Ambulance', 'Family'].map(mode => (
              <button key={mode} onClick={() => onTransportMode(mode)}
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors"
                style={{
                  background: transportMode === mode ? NAVY : 'white',
                  color: transportMode === mode ? 'white' : '#374151',
                  borderColor: transportMode === mode ? NAVY : '#d1d5db',
                }}>
                {mode === 'Home' && <Home size={8} />}
                {mode === 'Ambulance' && <Ambulance size={8} />}
                {mode === 'Family' && <Users size={8} />}
                {mode}
              </button>
            ))}
          </div>
        )}
      </div>
      {!task.done && (
        <button onClick={onMark}
          className="flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors hover:opacity-80"
          style={{ borderColor: GREEN, color: GREEN, background: '#f0fdf4' }}>
          Mark Done
        </button>
      )}
    </div>
  )
}

// ─── Checklist panel ─────────────────────────────────────────────────────────
function ChecklistPanel({ patient, onClose, onUpdate }) {
  const navigate = useNavigate()
  const [checklist, setChecklist] = useState(patient.checklist)
  const [notes, setNotes] = useState(patient.notes || '')
  const [transportMode, setTransportMode] = useState(
    patient.checklist.logistics.transport_arranged.transport_mode || null
  )
  const [pinStep, setPinStep] = useState(false)
  const [pin, setPin] = useState('')
  const [pinErr, setPinErr] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const mark = async (section, key) => {
    const now = new Date().toISOString()
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
    const by = currentUser.name || 'Current User'
    const extra = (key === 'transport_arranged' && transportMode) ? { transport_mode: transportMode } : {}

    const newChecklist = {
      ...checklist,
      [section]: {
        ...checklist[section],
        [key]: { done: true, by, at: now, ...extra }
      }
    }
    setChecklist(newChecklist)
    try {
      await api.patch(`/inpatient/admissions/${patient.id}/discharge-checklist`, {
        section, key, done: true, by, at: now, ...extra
      })
    } catch { /* silent fallback */ }
    onUpdate(patient.id, newChecklist, notes)
  }

  const handleConfirm = async () => {
    if (pin.length < 4) { setPinErr('Enter your PIN'); return }
    setPinLoading(true); setPinErr('')
    try {
      await api.post('/auth/staff/pin-identify', { pin })
      await api.post(`/inpatient/admissions/${patient.id}/confirm-discharge`, { notes })
      onUpdate(patient.id, checklist, notes, 'DISCHARGED')
      setPinStep(false)
    } catch {
      setPinErr('Invalid PIN or server error')
    } finally { setPinLoading(false) }
  }

  const allDone = countPending(checklist) === 0

  return (
    <div className="bg-gray-50 border-t border-b px-4 py-4" style={{ borderColor: '#e5e7eb' }}
      onClick={e => e.stopPropagation()}>
      <div className="max-w-3xl mx-auto space-y-4">

        {/* Clinical */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: '#e5e7eb' }}>
            <Stethoscope size={13} style={{ color: NAVY }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: NAVY }}>Clinical</span>
          </div>
          <div className="divide-y" style={{ borderColor: '#f3f4f6' }}>
            <TaskRow task={checklist.clinical.summary_signed} label={
              checklist.clinical.summary_signed.done
                ? `Discharge summary signed — ${checklist.clinical.summary_signed.by}, ${fmtDateTime(checklist.clinical.summary_signed.at)}`
                : 'Discharge summary signed'
            } onMark={() => mark('clinical', 'summary_signed')} />
            <TaskRow task={checklist.clinical.final_vitals} label="Final vitals recorded" onMark={() => mark('clinical', 'final_vitals')} />
            <TaskRow task={checklist.clinical.medications_counselled} label="Discharge medications counselled" onMark={() => mark('clinical', 'medications_counselled')} />
            <TaskRow task={checklist.clinical.iv_removed} label="IV line removed" onMark={() => mark('clinical', 'iv_removed')} />
          </div>
        </div>

        {/* Documentation */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: '#e5e7eb' }}>
            <FileText size={13} style={{ color: NAVY }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: NAVY }}>Documentation</span>
          </div>
          <div className="divide-y" style={{ borderColor: '#f3f4f6' }}>
            <TaskRow task={checklist.documentation.letter_printed} label="Discharge letter printed" onMark={() => mark('documentation', 'letter_printed')} />
            <TaskRow task={checklist.documentation.opd_booked} label="OPD follow-up appointment booked" onMark={() => mark('documentation', 'opd_booked')} />
          </div>
        </div>

        {/* Logistics */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: '#e5e7eb' }}>
            <Truck size={13} style={{ color: NAVY }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: NAVY }}>Logistics</span>
          </div>
          <div className="divide-y" style={{ borderColor: '#f3f4f6' }}>
            <TaskRow task={checklist.logistics.family_informed} label="Patient / family informed of discharge" onMark={() => mark('logistics', 'family_informed')} />
            <TaskRow
              task={checklist.logistics.transport_arranged}
              label="Transport arranged"
              onMark={() => { if (transportMode) mark('logistics', 'transport_arranged') }}
              showTransportPicker={!checklist.logistics.transport_arranged.done}
              transportMode={transportMode}
              onTransportMode={setTransportMode}
            />
            <TaskRow task={checklist.logistics.belongings_returned} label="Belongings returned to patient / family" onMark={() => mark('logistics', 'belongings_returned')} />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Discharge Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="Any notes for this discharge…"
            className="w-full border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none resize-none"
            style={{ borderColor: '#d1d5db' }} />
        </div>

        {/* PIN step */}
        {pinStep && (
          <div className="rounded-lg border p-3 flex items-start gap-3" style={{ borderColor: '#fde68a', background: '#fffbeb' }}>
            <Lock size={13} style={{ color: AMBER }} className="mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-700 mb-2">Enter PIN to confirm discharge</p>
              <div className="flex items-center gap-2">
                <input type="password" value={pin} onChange={e => setPin(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                  placeholder="PIN" maxLength={8} autoFocus
                  className="border rounded-lg px-2.5 py-1.5 text-xs w-24 tracking-widest focus:outline-none"
                  style={{ borderColor: '#d1d5db' }} />
                <button onClick={handleConfirm} disabled={pinLoading}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg text-white flex items-center gap-1"
                  style={{ background: GREEN }}>
                  {pinLoading ? <Loader2 size={11} className="animate-spin" /> : <><CheckCircle2 size={11} /> Confirm</>}
                </button>
                <button onClick={() => { setPinStep(false); setPin(''); setPinErr('') }}
                  className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
              </div>
              {pinErr && <p className="text-[10px] text-red-600 mt-1">{pinErr}</p>}
            </div>
          </div>
        )}

        {/* Footer buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => navigate(`/chart/${patient.id}`)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border hover:opacity-80 transition-opacity"
            style={{ borderColor: NAVY, color: NAVY }}>
            <ClipboardList size={13} /> View Discharge Summary
          </button>
          {patient.status !== 'DISCHARGED' && (
            <button
              onClick={() => { if (allDone) setPinStep(true) }}
              disabled={!allDone}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg text-white transition-opacity"
              style={{ background: allDone ? GREEN : '#9ca3af', cursor: allDone ? 'pointer' : 'not-allowed' }}>
              <CheckCircle2 size={13} /> Confirm Discharge ✓
            </button>
          )}
          {!allDone && (
            <span className="text-[10px] text-amber-600 font-medium">
              {countPending(checklist)} task{countPending(checklist) !== 1 ? 's' : ''} remaining
            </span>
          )}
        </div>

      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DischargeQueue() {
  const { session } = useWardSession()
  const wardId = session?.ward?.id

  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  // filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [doctorFilter, setDoctorFilter] = useState('ALL')
  const [destFilter, setDestFilter] = useState('ALL')
  const [activeTab, setActiveTab] = useState('ALL')
  const [activeStatCard, setActiveStatCard] = useState(null)

  // load data
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/inpatient/admissions', {
        params: { ward: wardId, discharge_status: 'pending' }
      })
      const data = Array.isArray(res) ? res : (res?.data || [])
      if (data.length > 0) setPatients(data)
      else throw new Error('empty')
    } catch {
      setPatients(MOCK_PATIENTS)
    } finally {
      setLoading(false)
    }
  }, [wardId])

  useEffect(() => { load() }, [load])

  // derived
  const doctors = [...new Set(patients.map(p => p.doctor))].filter(Boolean)
  const destinations = [...new Set(patients.map(p => p.destination))].filter(Boolean)

  const filtered = patients.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.bed.toLowerCase().includes(q) || p.diagnosis.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter
    const matchDoctor = doctorFilter === 'ALL' || p.doctor === doctorFilter
    const matchDest = destFilter === 'ALL' || p.destination === destFilter
    const matchTab = activeTab === 'ALL'
      || (activeTab === 'READY' && p.status === 'READY')
      || (activeTab === 'PENDING' && p.status === 'PENDING')
      || (activeTab === 'DELAYED' && p.status === 'DELAYED')
      || (activeTab === 'DONE' && p.status === 'DISCHARGED')
    const matchCard = !activeStatCard
      || (activeStatCard === 'ready' && p.status === 'READY')
      || (activeStatCard === 'pending' && p.status === 'PENDING')
      || (activeStatCard === 'discharged' && p.status === 'DISCHARGED')
    return matchSearch && matchStatus && matchDoctor && matchDest && matchTab && matchCard
  })

  const counts = {
    total: patients.length,
    ready: patients.filter(p => p.status === 'READY').length,
    pending: patients.filter(p => p.status === 'PENDING').length,
    discharged: patients.filter(p => p.status === 'DISCHARGED').length,
    delayed: patients.filter(p => p.status === 'DELAYED').length,
  }

  const tabCounts = {
    ALL: patients.length,
    READY: counts.ready,
    PENDING: counts.pending,
    DELAYED: counts.delayed,
    DONE: counts.discharged,
  }

  const updatePatient = (id, newChecklist, newNotes, forceStatus) => {
    setPatients(prev => prev.map(p => {
      if (p.id !== id) return p
      const pending = countPending(newChecklist)
      let status = forceStatus || (pending === 0 ? 'READY' : p.status === 'DELAYED' ? 'DELAYED' : 'PENDING')
      if (forceStatus === 'DISCHARGED') status = 'DISCHARGED'
      return { ...p, checklist: newChecklist, notes: newNotes, status }
    }))
  }

  const toggleRow = (id) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  const statCards = [
    {
      key: 'total', label: 'Total Patients', value: counts.total,
      icon: User, color: NAVY, bg: '#eff6ff', border: '#bfdbfe', shadow: '#0F255733',
    },
    {
      key: 'ready', label: 'Ready to Discharge', value: counts.ready,
      icon: CheckCircle2, color: GREEN, bg: '#f0fdf4', border: '#a7f3d0', shadow: '#065F4633',
    },
    {
      key: 'pending', label: 'Pending Checklist', value: counts.pending,
      icon: Clock, color: AMBER, bg: '#fffbeb', border: '#fde68a', shadow: '#b4590933',
    },
    {
      key: 'discharged', label: 'Discharged Today', value: counts.discharged,
      icon: CheckCircle2, color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb', shadow: '#6b728033',
    },
  ]

  const TABS = [
    { key: 'ALL', label: 'All' },
    { key: 'READY', label: 'Ready' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'DELAYED', label: 'Delayed' },
    { key: 'DONE', label: 'Done' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={22} className="animate-spin" style={{ color: GREEN }} />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Discharge Queue</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {session?.ward?.name || 'Ward'} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={load}
          className="text-xs font-semibold px-3 py-2 rounded-lg border hover:opacity-80"
          style={{ borderColor: NAVY, color: NAVY }}>
          Refresh
        </button>
      </div>

      {/* Delayed alert banner */}
      {counts.delayed > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{ background: '#fff1f2', borderColor: '#fecdd3' }}>
          <AlertTriangle size={16} style={{ color: RED }} className="flex-shrink-0" />
          <p className="text-sm font-bold" style={{ color: RED }}>
            {counts.delayed} patient{counts.delayed !== 1 ? 's are' : ' is'} DELAYED — discharge orders incomplete
          </p>
          <button onClick={() => setActiveTab('DELAYED')}
            className="ml-auto text-xs font-bold px-3 py-1 rounded-lg"
            style={{ background: RED, color: 'white' }}>
            View Delayed
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statCards.map(card => {
          const Icon = card.icon
          const isActive = activeStatCard === card.key
          return (
            <div key={card.key}
              onClick={() => setActiveStatCard(prev => prev === card.key ? null : card.key)}
              className="card cursor-pointer transition-all select-none"
              style={{
                borderColor: isActive ? card.color : '#e5e7eb',
                borderWidth: isActive ? 2 : 1,
                borderStyle: 'solid',
                boxShadow: isActive ? `0 0 0 3px ${card.shadow}, 0 4px 16px ${card.shadow}` : '0 1px 4px rgba(0,0,0,0.05)',
                background: isActive ? card.bg : 'white',
              }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: card.bg, border: `1.5px solid ${card.border}` }}>
                  <Icon size={16} style={{ color: card.color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</p>
                  <p className="text-[10px] text-gray-400 font-medium leading-tight">{card.label}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search patient, bed, diagnosis…"
            className="border rounded-lg pl-7 pr-3 py-2 text-xs bg-white focus:outline-none w-60"
            style={{ borderColor: '#d1d5db' }} />
        </div>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none"
          style={{ borderColor: '#d1d5db' }}>
          <option value="ALL">All Statuses</option>
          <option value="READY">Ready</option>
          <option value="PENDING">Pending</option>
          <option value="DELAYED">Delayed</option>
          <option value="DISCHARGED">Discharged</option>
        </select>

        <select value={doctorFilter} onChange={e => setDoctorFilter(e.target.value)}
          className="border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none"
          style={{ borderColor: '#d1d5db' }}>
          <option value="ALL">All Doctors</option>
          {doctors.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select value={destFilter} onChange={e => setDestFilter(e.target.value)}
          className="border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none"
          style={{ borderColor: '#d1d5db' }}>
          <option value="ALL">All Destinations</option>
          {destinations.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {(search || statusFilter !== 'ALL' || doctorFilter !== 'ALL' || destFilter !== 'ALL' || activeStatCard) && (
          <button onClick={() => { setSearch(''); setStatusFilter('ALL'); setDoctorFilter('ALL'); setDestFilter('ALL'); setActiveStatCard(null) }}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: '#e5e7eb' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="px-3 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5"
              style={{
                borderBottomColor: isActive ? NAVY : 'transparent',
                color: isActive ? NAVY : '#6b7280',
              }}>
              {tab.label}
              <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                style={{
                  background: isActive ? NAVY : '#f3f4f6',
                  color: isActive ? 'white' : '#6b7280',
                }}>
                {tabCounts[tab.key]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="table w-full">
          <thead>
            <tr>
              <th className="th">Bed</th>
              <th className="th">Patient</th>
              <th className="th">LOS</th>
              <th className="th">Doctor</th>
              <th className="th">Destination</th>
              <th className="th">Status</th>
              <th className="th" style={{ width: 32 }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="td text-center text-gray-400 py-10 text-sm">
                  No patients match the current filters.
                </td>
              </tr>
            )}
            {filtered.map(patient => {
              const isExpanded = expandedId === patient.id
              return (
                <>
                  <tr key={patient.id}
                    onClick={() => toggleRow(patient.id)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    style={{
                      background: isExpanded ? '#f0f9ff' : undefined,
                      borderLeft: isExpanded ? `3px solid ${NAVY}` : '3px solid transparent',
                    }}>
                    <td className="td">
                      <span className="font-bold text-xs" style={{ color: NAVY }}>{patient.bed}</span>
                    </td>
                    <td className="td">
                      <p className="text-xs font-bold text-gray-900">{patient.name}</p>
                      <p className="text-[10px] text-gray-400">
                        {patient.age}y / {patient.gender} · {patient.diagnosis}
                      </p>
                    </td>
                    <td className="td">
                      <span className="text-xs text-gray-700 font-medium">{patient.los}d</span>
                    </td>
                    <td className="td">
                      <span className="text-xs text-gray-600">{patient.doctor}</span>
                    </td>
                    <td className="td">
                      <span className="text-xs text-gray-600">{patient.destination}</span>
                    </td>
                    <td className="td">
                      <StatusChip status={patient.status} />
                      {patient.status === 'DISCHARGED' && patient.discharge_time && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{fmtTime(patient.discharge_time)}</p>
                      )}
                    </td>
                    <td className="td text-center">
                      {isExpanded
                        ? <ChevronUp size={14} className="text-gray-400 mx-auto" />
                        : <ChevronDown size={14} className="text-gray-400 mx-auto" />
                      }
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${patient.id}-panel`}>
                      <td colSpan={7} className="p-0">
                        <ChecklistPanel
                          patient={patient}
                          onClose={() => setExpandedId(null)}
                          onUpdate={updatePatient}
                        />
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      <p className="text-[10px] text-gray-400 text-right">
        Showing {filtered.length} of {patients.length} patients
      </p>

    </div>
  )
}
