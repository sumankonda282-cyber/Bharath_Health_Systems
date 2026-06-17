import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  ChevronDown,
  Tag,
  AlertTriangle,
  CheckCircle,
  X,
  Flag,
  Pill,
  Droplets,
  Thermometer,
  Activity,
  Wind,
  Heart,
  User,
  Phone,
  Wrench,
  FileText,
  Lock,
} from 'lucide-react'
import api from '../api/client'
import { useWardSession } from '../contexts/WardSessionContext'

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_PATIENTS = [
  {
    id: 'adm-001',
    bed: 'A1',
    name: 'Rajesh Kumar',
    age: 58,
    gender: 'M',
    doctor: 'Dr. Sharma',
    diagnosis: 'Acute MI (STEMI)',
    acuity: 'HIGH',
    signed: false,
    vitals: { bp: '140/90', pulse: 102, temp: 37.8, spo2: 94, rr: 22, time: '05:30' },
    iv: { site: 'Right ACF', gauge: '18G', day: 3, rate: '80 ml/hr NS' },
    diet: 'Cardiac diet, fluid restriction 1.2L/day',
    medsDue: [
      { time: '07:00', drug: 'Tab Aspirin 75mg', route: 'PO' },
      { time: '07:00', drug: 'Inj Enoxaparin 60mg', route: 'SC' },
      { time: '08:00', drug: 'Tab Atorvastatin 80mg', route: 'PO' },
    ],
    tasks: [
      { label: 'Repeat ECG at 07:00', done: false },
      { label: 'Troponin I — 08:00 draw', done: false },
      { label: 'Cardiology review — pending', done: false },
    ],
    alerts: ['STEMI — monitoring for re-infarction', 'Hold if HR < 50 or SBP < 90'],
    tags: [
      { id: 't-001', priority: 'urgent', nurse: 'Sr. Meena', ts: '04:45', note: 'Patient anxious, diaphoretic at 04:30 — watch closely.' },
      { id: 't-002', priority: 'watch', nurse: 'Sr. Priya', ts: '03:10', note: 'Family requested update before 08:00. Contact Mr. Vijay Kumar: 98XXXXXXXX.' },
    ],
    nurseNote: 'High-risk STEMI on continuous tele monitoring. Cardio SOS if chest pain recurs or ST changes.',
  },
  {
    id: 'adm-002',
    bed: 'A2',
    name: 'Sunita Devi',
    age: 62,
    gender: 'F',
    doctor: 'Dr. Mehta',
    diagnosis: 'Septic Shock (UTI source)',
    acuity: 'HIGH',
    signed: false,
    vitals: { bp: '85/50', pulse: 118, temp: 39.2, spo2: 92, rr: 26, time: '05:15' },
    iv: { site: 'Left EJ (CVC)', gauge: '7Fr', day: 1, rate: 'Nor 0.1 mcg/kg/min' },
    diet: 'NPO (ICU transfer pending)',
    medsDue: [
      { time: '06:00', drug: 'Inj Piperacillin-Tazobactam 4.5g', route: 'IV' },
      { time: '07:00', drug: 'Inj Noradrenaline titrate', route: 'IV infusion' },
    ],
    tasks: [
      { label: 'Urine C&S result — check lab', done: false },
      { label: 'ICU transfer bed confirmation', done: false },
    ],
    alerts: ['MAP < 65 — on vasopressor', 'Urgent ICU transfer initiated'],
    tags: [
      { id: 't-003', priority: 'urgent', nurse: 'Sr. Meena', ts: '05:00', note: 'MAP dropped to 58 at 05:00 — Nor rate increased. ICU resident informed.' },
    ],
    nurseNote: 'Septic shock — vasopressor dependent. ICU transfer awaited. Keep resus trolley ready.',
  },
  {
    id: 'adm-003',
    bed: 'A3',
    name: 'Mohammed Aslam',
    age: 44,
    gender: 'M',
    doctor: 'Dr. Krishnan',
    diagnosis: 'DKA (Type 1 DM)',
    acuity: 'HIGH',
    signed: false,
    vitals: { bp: '110/70', pulse: 98, temp: 37.2, spo2: 97, rr: 20, time: '05:00' },
    iv: { site: 'Left ACF', gauge: '20G', day: 2, rate: 'Insulin 6U/hr + NS 100ml/hr' },
    diet: 'NPO until acidosis resolves',
    medsDue: [
      { time: '06:00', drug: 'Inj Regular Insulin infusion adjust per protocol', route: 'IV' },
      { time: '07:00', drug: 'Inj KCl 20mEq in 200ml', route: 'IV (K+ 3.1)' },
    ],
    tasks: [
      { label: 'ABG at 06:00', done: false },
      { label: 'RBS q1h until < 250', done: false },
    ],
    alerts: ['K+ 3.1 — potassium replacement ongoing', 'pH 7.22 at midnight — recheck ABG 06:00'],
    tags: [
      { id: 't-004', priority: 'urgent', nurse: 'Sr. Lakshmi', ts: '04:00', note: 'RBS 195 at 04:00. Insulin reduced to 4U/hr per protocol. ABG pending.' },
      { id: 't-005', priority: 'watch', nurse: 'Sr. Rekha', ts: '02:30', note: 'Patient vomited × 1 at 02:30 — antiemetic given. Monitor.' },
    ],
    nurseNote: 'DKA resolving. Hourly RBS, 2-hourly ABG. Alert if RBS < 150 or pH < 7.2.',
  },
  {
    id: 'adm-004',
    bed: 'B1',
    name: 'Geeta Bai',
    age: 70,
    gender: 'F',
    doctor: 'Dr. Nair',
    diagnosis: 'COPD Exacerbation',
    acuity: 'MED',
    signed: false,
    vitals: { bp: '130/80', pulse: 88, temp: 37.0, spo2: 90, rr: 18, time: '04:30' },
    iv: { site: 'Right ACF', gauge: '22G', day: 4, rate: 'IV Aminophylline 250mg' },
    diet: 'Soft diet, high protein',
    medsDue: [
      { time: '07:00', drug: 'Neb Ipratropium + Salbutamol', route: 'NEB' },
      { time: '08:00', drug: 'Tab Prednisolone 40mg', route: 'PO' },
    ],
    tasks: [{ label: 'Chest X-ray review with Dr. Nair at 09:00', done: false }],
    alerts: ['SpO2 target 88–92% (hypoxic drive)'],
    tags: [
      { id: 't-006', priority: 'watch', nurse: 'Sr. Priya', ts: '03:45', note: 'SpO2 dipped to 87% briefly — O2 increased to 2L. Recovered to 90%.' },
    ],
    nurseNote: 'Stable but SpO2 borderline. Continue controlled O2. Neb q6h as charted.',
  },
  {
    id: 'adm-005',
    bed: 'B2',
    name: 'Harpreet Singh',
    age: 52,
    gender: 'M',
    doctor: 'Dr. Gupta',
    diagnosis: 'Hypertensive Crisis',
    acuity: 'MED',
    signed: false,
    vitals: { bp: '185/110', pulse: 82, temp: 36.9, spo2: 98, rr: 16, time: '05:00' },
    iv: { site: 'Left ACF', gauge: '20G', day: 1, rate: 'Labetalol infusion 2mg/min' },
    diet: 'Low sodium diet',
    medsDue: [
      { time: '07:00', drug: 'Tab Amlodipine 10mg', route: 'PO' },
      { time: '07:00', drug: 'Tab Telmisartan 80mg', route: 'PO' },
    ],
    tasks: [{ label: 'BP q30min — target < 160/100 by 08:00', done: false }],
    alerts: ['End-organ damage workup pending — ECG, creatinine, fundus'],
    tags: [],
    nurseNote: 'BP trending down. Continue Labetalol titration. Alert if SBP < 130.',
  },
  {
    id: 'adm-006',
    bed: 'B3',
    name: 'Anjali Pawar',
    age: 35,
    gender: 'F',
    doctor: 'Dr. Iyer',
    diagnosis: 'Dengue Fever (Warning Signs)',
    acuity: 'MED',
    signed: false,
    vitals: { bp: '100/70', pulse: 94, temp: 38.6, spo2: 98, rr: 16, time: '04:00' },
    iv: { site: 'Right ACF', gauge: '20G', day: 3, rate: 'RL 100ml/hr' },
    diet: 'Oral fluids encouraged, soft diet',
    medsDue: [
      { time: '06:00', drug: 'Tab Paracetamol 500mg', route: 'PO' },
    ],
    tasks: [{ label: 'Platelet count at 06:00 (trend 78k→62k)', done: false }],
    alerts: ['Platelet falling — bleeding precautions', 'Monitor for abdominal pain, restlessness'],
    tags: [
      { id: 't-007', priority: 'info', nurse: 'Sr. Rekha', ts: '01:00', note: 'Platelet 62k — informed Dr. Iyer. Repeat at 06:00.' },
    ],
    nurseNote: 'Dengue warning signs. Strict IO chart, watch for bleeding gums or petechiae.',
  },
  {
    id: 'adm-007',
    bed: 'C1',
    name: 'Venkatesh Rao',
    age: 48,
    gender: 'M',
    doctor: 'Dr. Sharma',
    diagnosis: 'Community Acquired Pneumonia',
    acuity: 'MED',
    signed: false,
    vitals: { bp: '118/76', pulse: 86, temp: 38.1, spo2: 96, rr: 19, time: '04:15' },
    iv: { site: 'Right Hand', gauge: '20G', day: 2, rate: 'Ceftriaxone 2g in NS 100ml' },
    diet: 'Normal diet, high fluids',
    medsDue: [
      { time: '08:00', drug: 'Inj Ceftriaxone 2g', route: 'IV' },
      { time: '07:00', drug: 'Tab Azithromycin 500mg', route: 'PO' },
    ],
    tasks: [{ label: 'Sputum C&S pending — remind lab', done: false }],
    alerts: [],
    tags: [],
    nurseNote: 'Improving. SpO2 stable on room air. Continue antibiotics per chart.',
  },
  {
    id: 'adm-008',
    bed: 'C2',
    name: 'Padma Krishnaswamy',
    age: 67,
    gender: 'F',
    doctor: 'Dr. Mehta',
    diagnosis: 'Acute Pyelonephritis',
    acuity: 'MED',
    signed: false,
    vitals: { bp: '124/78', pulse: 90, temp: 38.4, spo2: 99, rr: 15, time: '04:00' },
    iv: { site: 'Left ACF', gauge: '22G', day: 2, rate: 'NS 75ml/hr + Gentamicin' },
    diet: 'High fluid intake, normal diet',
    medsDue: [
      { time: '06:00', drug: 'Inj Gentamicin 180mg', route: 'IV OD' },
      { time: '07:00', drug: 'Tab Co-amoxiclav 625mg', route: 'PO' },
    ],
    tasks: [{ label: 'Urine output hourly — log in chart', done: false }],
    alerts: [],
    tags: [],
    nurseNote: 'Fever settling. Ensure adequate hydration. Monitor renal function.',
  },
  {
    id: 'adm-009',
    bed: 'D1',
    name: 'Suresh Pillai',
    age: 45,
    gender: 'M',
    doctor: 'Dr. Krishnan',
    diagnosis: 'Stable Angina — Angiogram done',
    acuity: 'ROU',
    signed: true,
    vitals: { bp: '122/80', pulse: 68, temp: 36.8, spo2: 99, rr: 14, time: '04:00' },
    iv: { site: 'Right ACF (saline lock)', gauge: '20G', day: 2, rate: 'Saline lock' },
    diet: 'Normal cardiac diet',
    medsDue: [
      { time: '07:00', drug: 'Tab Aspirin 75mg', route: 'PO' },
      { time: '07:00', drug: 'Tab Metoprolol 25mg', route: 'PO' },
    ],
    tasks: [],
    alerts: [],
    tags: [],
    nurseNote: 'Post-angiogram. Stable, discharge expected tomorrow.',
  },
  {
    id: 'adm-010',
    bed: 'D2',
    name: 'Kavitha Nambiar',
    age: 38,
    gender: 'F',
    doctor: 'Dr. Nair',
    diagnosis: 'Bronchial Asthma (mild attack)',
    acuity: 'ROU',
    signed: true,
    vitals: { bp: '116/74', pulse: 72, temp: 36.7, spo2: 98, rr: 14, time: '04:00' },
    iv: { site: 'None', gauge: '—', day: 0, rate: 'Oral medications only' },
    diet: 'Normal diet',
    medsDue: [
      { time: '06:00', drug: 'MDI Salbutamol 2 puffs', route: 'INH' },
    ],
    tasks: [],
    alerts: [],
    tags: [],
    nurseNote: 'Asthma settling well. Discharge likely if SpO2 > 97% by morning round.',
  },
  {
    id: 'adm-011',
    bed: 'D3',
    name: 'Rajan Menon',
    age: 55,
    gender: 'M',
    doctor: 'Dr. Gupta',
    diagnosis: 'T2DM — Glycaemic Optimization',
    acuity: 'ROU',
    signed: true,
    vitals: { bp: '128/82', pulse: 74, temp: 36.9, spo2: 98, rr: 14, time: '04:00' },
    iv: { site: 'None', gauge: '—', day: 0, rate: 'No IV' },
    diet: 'Diabetic diet 1800kcal',
    medsDue: [
      { time: '07:00', drug: 'Inj Glargine 20U', route: 'SC' },
      { time: 'PRE-MEAL', drug: 'Inj Aspart per sliding scale', route: 'SC' },
    ],
    tasks: [],
    alerts: [],
    tags: [],
    nurseNote: 'Sugars trending to target. Diabetes educator visit at 10:00.',
  },
  {
    id: 'adm-012',
    bed: 'E1',
    name: 'Shobha Reddy',
    age: 29,
    gender: 'F',
    doctor: 'Dr. Iyer',
    diagnosis: 'Enteric Fever (Typhoid)',
    acuity: 'ROU',
    signed: true,
    vitals: { bp: '112/70', pulse: 70, temp: 37.5, spo2: 99, rr: 14, time: '04:00' },
    iv: { site: 'Right Hand (saline lock)', gauge: '22G', day: 4, rate: 'Saline lock' },
    diet: 'Soft bland diet',
    medsDue: [
      { time: '08:00', drug: 'Tab Cefixime 400mg', route: 'PO' },
    ],
    tasks: [],
    alerts: [],
    tags: [],
    nurseNote: 'Day 4 antibiotics, fever controlled. Planned discharge day 7.',
  },
]

const ACUITY_CONFIG = {
  HIGH: { label: 'HIGH', dot: '🔴', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  MED: { label: 'MED', dot: '🟡', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  ROU: { label: 'ROU', dot: '🟢', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
}

const PRIORITY_CONFIG = {
  urgent: { dot: '🔴', label: 'Urgent', color: 'text-red-600' },
  watch: { dot: '🟡', label: 'Watch', color: 'text-yellow-600' },
  info: { dot: '🔵', label: 'Info', color: 'text-blue-600' },
}

const SHIFTS = [
  { id: 'morning', label: 'Morning', time: '07–15' },
  { id: 'evening', label: 'Evening', time: '15–23' },
  { id: 'night', label: 'Night', time: '23–07' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function VitalsRow({ vitals }) {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      <span className="flex items-center gap-1 text-gray-600">
        <Activity className="w-3.5 h-3.5 text-rose-500" />
        <span className="font-medium">BP</span> {vitals.bp}
      </span>
      <span className="flex items-center gap-1 text-gray-600">
        <Heart className="w-3.5 h-3.5 text-rose-400" />
        <span className="font-medium">P</span> {vitals.pulse}
      </span>
      <span className="flex items-center gap-1 text-gray-600">
        <Thermometer className="w-3.5 h-3.5 text-orange-400" />
        <span className="font-medium">T</span> {vitals.temp}°C
      </span>
      <span className="flex items-center gap-1 text-gray-600">
        <Droplets className="w-3.5 h-3.5 text-blue-400" />
        <span className="font-medium">SpO₂</span> {vitals.spo2}%
      </span>
      <span className="flex items-center gap-1 text-gray-600">
        <Wind className="w-3.5 h-3.5 text-teal-400" />
        <span className="font-medium">RR</span> {vitals.rr}/min
      </span>
      <span className="text-gray-400 ml-auto">at {vitals.time}</span>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-1">{children}</p>
  )
}

function TagChip({ count }) {
  if (!count) return null
  return (
    <span className="inline-flex items-center gap-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2 py-0.5 text-[10px] font-semibold">
      🏷 {count}
    </span>
  )
}

// ─── Patient Accordion Row ────────────────────────────────────────────────────

function PatientRow({ patient, isOpen, onToggle, onSign, onTagAdd, onTagDelete }) {
  const [showTagForm, setShowTagForm] = useState(false)
  const [tagPriority, setTagPriority] = useState('info')
  const [tagNote, setTagNote] = useState('')
  const [tagSaving, setTagSaving] = useState(false)
  const [noteText, setNoteText] = useState(patient.nurseNote)

  const acuity = ACUITY_CONFIG[patient.acuity]
  const pendingTasks = patient.tasks.filter(t => !t.done).length

  const handleSign = async (e) => {
    e.stopPropagation()
    onSign(patient.id)
  }

  const handleSaveTag = async () => {
    if (!tagNote.trim()) return
    setTagSaving(true)
    const tag = {
      id: `t-${Date.now()}`,
      priority: tagPriority,
      nurse: 'Sr. Current User',
      ts: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      note: tagNote.trim(),
    }
    try {
      await api.post('/inpatient/handoff/tags', {
        admissionId: patient.id,
        ...tag,
      })
    } catch {
      // fallback to mock
    }
    onTagAdd(patient.id, tag)
    setTagNote('')
    setTagPriority('info')
    setShowTagForm(false)
    setTagSaving(false)
  }

  const handleDeleteTag = async (tagId) => {
    try {
      await api.delete(`/inpatient/handoff/tags/${tagId}`)
    } catch {
      // fallback
    }
    onTagDelete(patient.id, tagId)
  }

  return (
    <div className={`border-b border-gray-100 transition-colors ${isOpen ? 'bg-slate-50' : 'hover:bg-gray-50'}`}>
      {/* ── Table Row ── */}
      <div
        className="grid gap-2 px-4 py-2.5 cursor-pointer select-none"
        style={{ gridTemplateColumns: '52px 1fr 1fr 80px 56px 64px 80px 28px' }}
        onClick={onToggle}
      >
        {/* BED */}
        <div className="flex items-center">
          <span className="font-bold text-gray-800 text-sm">{patient.bed}</span>
        </div>

        {/* PATIENT */}
        <div className="flex flex-col justify-center min-w-0">
          <span className="font-semibold text-gray-900 text-sm truncate">{patient.name}</span>
          <span className="text-[10px] text-gray-500">{patient.age}y / {patient.gender} · {patient.doctor}</span>
        </div>

        {/* DIAGNOSIS */}
        <div className="flex items-center min-w-0">
          <span className="text-xs text-gray-700 truncate">{patient.diagnosis}</span>
        </div>

        {/* ACUITY */}
        <div className="flex items-center">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${acuity.bg} ${acuity.text} ${acuity.border}`}>
            {acuity.dot} {acuity.label}
          </span>
        </div>

        {/* TASKS */}
        <div className="flex items-center">
          {pendingTasks > 0 ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
              <AlertTriangle className="w-2.5 h-2.5" /> {pendingTasks}
            </span>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </div>

        {/* TAGS */}
        <div className="flex items-center">
          <TagChip count={patient.tags.length} />
        </div>

        {/* SIGN */}
        <div className="flex items-center" onClick={e => e.stopPropagation()}>
          {patient.signed ? (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
              <CheckCircle className="w-3.5 h-3.5" /> Done
            </span>
          ) : (
            <button
              onClick={handleSign}
              className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded px-2 py-1 transition-colors"
            >
              Sign ✓
            </button>
          )}
        </div>

        {/* CHEVRON */}
        <div className="flex items-center justify-center text-gray-400">
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </div>

      {/* ── Accordion Dropdown ── */}
      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left column */}
            <div className="space-y-3">
              {/* VITALS */}
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <SectionLabel>Vitals</SectionLabel>
                <VitalsRow vitals={patient.vitals} />
              </div>

              {/* IV/LINES */}
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <SectionLabel>IV / Lines</SectionLabel>
                {patient.iv.site === 'None' ? (
                  <p className="text-xs text-gray-500">No IV access</p>
                ) : (
                  <div className="text-xs text-gray-700 space-y-0.5">
                    <p><span className="font-medium">Site:</span> {patient.iv.site} · {patient.iv.gauge}</p>
                    <p><span className="font-medium">Day:</span> {patient.iv.day}</p>
                    <p><span className="font-medium">Rate:</span> {patient.iv.rate}</p>
                  </div>
                )}
              </div>

              {/* DIET/FLUID */}
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <SectionLabel>Diet / Fluid</SectionLabel>
                <p className="text-xs text-gray-700">{patient.diet}</p>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-3">
              {/* MEDS DUE */}
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <SectionLabel>Meds Due</SectionLabel>
                {patient.medsDue.length === 0 ? (
                  <p className="text-xs text-gray-400">None pending</p>
                ) : (
                  <ul className="space-y-1">
                    {patient.medsDue.map((m, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs">
                        <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span className="font-medium text-gray-600 w-14 flex-shrink-0">{m.time}</span>
                        <span className="text-gray-800">{m.drug}</span>
                        <span className="text-gray-400 ml-auto">{m.route}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* TASKS */}
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <SectionLabel>Tasks</SectionLabel>
                {patient.tasks.length === 0 ? (
                  <p className="text-xs text-gray-400">No pending tasks</p>
                ) : (
                  <ul className="space-y-1">
                    {patient.tasks.map((t, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs">
                        <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span className={t.done ? 'line-through text-gray-400' : 'text-gray-800'}>{t.label}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* ALERTS */}
              {patient.alerts.length > 0 && (
                <div className="bg-red-50 rounded-lg border border-red-200 p-3">
                  <SectionLabel>Alerts</SectionLabel>
                  <ul className="space-y-1">
                    {patient.alerts.map((a, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-red-700">
                        <Flag className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* ── NURSE TAGS ── */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <SectionLabel>Nurse Tags</SectionLabel>
              {!showTagForm && (
                <button
                  onClick={() => setShowTagForm(true)}
                  className="text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
                >
                  <Tag className="w-3 h-3" /> + Add Tag
                </button>
              )}
            </div>

            {patient.tags.length === 0 && !showTagForm && (
              <p className="text-xs text-gray-400">No tags yet.</p>
            )}

            {patient.tags.map(tag => {
              const pc = PRIORITY_CONFIG[tag.priority]
              return (
                <div key={tag.id} className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
                  <span className="mt-0.5 text-sm leading-none">{pc.dot}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-bold ${pc.color}`}>{pc.label}</span>
                      <span className="text-[10px] text-gray-500">{tag.nurse}</span>
                      <span className="text-[10px] text-gray-400">{tag.ts}</span>
                    </div>
                    <p className="text-xs text-gray-700">{tag.note}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors mt-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}

            {showTagForm && (
              <div className="mt-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                {/* Priority selector */}
                <div className="flex items-center gap-2">
                  {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                    <label key={key} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name={`tag-priority-${patient.id}`}
                        value={key}
                        checked={tagPriority === key}
                        onChange={() => setTagPriority(key)}
                        className="sr-only"
                      />
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${tagPriority === key ? 'bg-indigo-100 border-indigo-400 text-indigo-800' : 'bg-white border-gray-200 text-gray-500'}`}>
                        {cfg.dot} {cfg.label}
                      </span>
                    </label>
                  ))}
                </div>
                <textarea
                  value={tagNote}
                  onChange={e => setTagNote(e.target.value)}
                  placeholder="Tag note…"
                  rows={2}
                  className="w-full border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowTagForm(false); setTagNote('') }}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTag}
                    disabled={tagSaving || !tagNote.trim()}
                    className="text-xs font-semibold bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {tagSaving ? 'Saving…' : 'Save Tag'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── NURSE NOTE ── */}
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <SectionLabel>Nurse Note — Shift Summary</SectionLabel>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              rows={3}
              className="w-full border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none resize-none mt-1"
              placeholder="Shift handoff summary for incoming nurse…"
            />
          </div>

          {/* ── Footer actions ── */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={onToggle}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg"
            >
              Cancel
            </button>
            {!patient.signed ? (
              <button
                onClick={handleSign}
                className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" /> Sign ✓
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <CheckCircle className="w-3.5 h-3.5" /> Signed
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ShiftHandoff() {
  const navigate = useNavigate()
  const { session } = useWardSession()

  const [shift, setShift] = useState('morning')
  const [fromNurse, setFromNurse] = useState('')
  const [toNurse, setToNurse] = useState('')
  const [patients, setPatients] = useState(MOCK_PATIENTS)
  const [openRow, setOpenRow] = useState(null)

  // Ward notes
  const [erAdmissions, setErAdmissions] = useState('')
  const [oncallDoctor, setOncallDoctor] = useState('Dr. Sharma')
  const [oncallPhone, setOncallPhone] = useState('98XXXXXXXX')
  const [equipmentIssues, setEquipmentIssues] = useState('')
  const [staffNote, setStaffNote] = useState('')

  // PIN gate
  const [pinValue, setPinValue] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [saving, setSaving] = useState(false)

  const totalPatients = patients.length
  const signedCount = patients.filter(p => p.signed).length
  const progressPct = Math.round((signedCount / totalPatients) * 100)
  const allSigned = signedCount === totalPatients

  const criticalCount = patients.filter(p => p.acuity === 'HIGH').length
  const pendingTasksCount = patients.reduce((acc, p) => acc + p.tasks.filter(t => !t.done).length, 0)
  const dischargesDue = 2 // mock

  const toggleRow = useCallback((id) => {
    setOpenRow(prev => (prev === id ? null : id))
  }, [])

  const handleSign = useCallback(async (patientId) => {
    try {
      await api.post(`/inpatient/handoff/sign/${patientId}`, {})
    } catch {
      // fallback to local
    }
    setPatients(prev => prev.map(p => p.id === patientId ? { ...p, signed: true } : p))
  }, [])

  const handleTagAdd = useCallback((patientId, tag) => {
    setPatients(prev => prev.map(p =>
      p.id === patientId ? { ...p, tags: [...p.tags, tag] } : p
    ))
  }, [])

  const handleTagDelete = useCallback((patientId, tagId) => {
    setPatients(prev => prev.map(p =>
      p.id === patientId ? { ...p, tags: p.tags.filter(t => t.id !== tagId) } : p
    ))
  }, [])

  const handleSaveDraft = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 800)) // simulate
    setSaving(false)
  }

  const handleCompleteHandoff = async () => {
    if (pinValue.length < 4) return
    setCompleting(true)
    try {
      await api.post('/inpatient/handoff/complete', {
        shift,
        fromNurse,
        toNurse,
        pin: pinValue,
        wardId: session?.ward?.id,
      })
    } catch {
      // fallback
    }
    setCompleted(true)
    setCompleting(false)
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Handoff Complete</h2>
          <p className="text-sm text-gray-500">Shift handoff has been signed and submitted.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 text-sm font-semibold text-indigo-700 border border-indigo-300 px-4 py-2 rounded-lg hover:bg-indigo-50"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top Header ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Title + shift selector */}
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-base font-bold text-gray-900">Shift Handoff</h1>
                <p className="text-[10px] text-gray-500">
                  {session?.ward?.name || 'Ward 4A'} · {session?.hospital?.name || 'BharatCliniQ'} · {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>

              {/* Shift pills */}
              <div className="flex gap-1">
                {SHIFTS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setShift(s.id)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${shift === s.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}
                  >
                    {s.label} <span className="font-normal opacity-70">{s.time}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* From / To nurses */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <input
                  value={fromNurse}
                  onChange={e => setFromNurse(e.target.value)}
                  placeholder="From nurse"
                  className="border rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none w-36"
                />
              </div>
              <span className="text-gray-400 text-xs">→</span>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <input
                  value={toNurse}
                  onChange={e => setToNurse(e.target.value)}
                  placeholder="To nurse"
                  className="border rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none w-36"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Beds Occupied', value: 18, icon: <Activity className="w-4 h-4 text-indigo-500" />, color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
            { label: 'Critical Patients', value: criticalCount, icon: <AlertTriangle className="w-4 h-4 text-red-500" />, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
            { label: 'Pending Tasks', value: pendingTasksCount, icon: <FileText className="w-4 h-4 text-amber-500" />, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
            { label: 'Discharges Due', value: dischargesDue, icon: <CheckCircle className="w-4 h-4 text-emerald-500" />, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          ].map((card, i) => (
            <div key={i} className={`rounded-xl border p-3 ${card.bg}`}>
              <div className="flex items-center justify-between mb-1">
                {card.icon}
                <span className={`text-2xl font-bold ${card.color}`}>{card.value}</span>
              </div>
              <p className="text-[11px] font-medium text-gray-600">{card.label}</p>
            </div>
          ))}
        </div>

        {/* ── Patient Table ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Progress bar */}
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
            <span className="text-xs font-medium text-gray-700">
              {signedCount}/{totalPatients} signed
            </span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{progressPct}%</span>
          </div>

          {/* Table header */}
          <div
            className="grid gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200"
            style={{ gridTemplateColumns: '52px 1fr 1fr 80px 56px 64px 80px 28px' }}
          >
            {['BED', 'PATIENT', 'DIAGNOSIS', 'ACUITY', 'TASKS', 'TAGS', 'STATUS', ''].map((h, i) => (
              <span key={i} className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">{h}</span>
            ))}
          </div>

          {/* Rows */}
          <div>
            {patients.map(p => (
              <PatientRow
                key={p.id}
                patient={p}
                isOpen={openRow === p.id}
                onToggle={() => toggleRow(p.id)}
                onSign={handleSign}
                onTagAdd={handleTagAdd}
                onTagDelete={handleTagDelete}
              />
            ))}
          </div>
        </div>

        {/* ── Ward Notes ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
          <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" /> Ward Notes
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left */}
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                  Pending ER Admissions
                </label>
                <input
                  value={erAdmissions}
                  onChange={e => setErAdmissions(e.target.value)}
                  placeholder="e.g. 2 admissions expected from ER — chest pain, trauma"
                  className="w-full border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1">
                  Equipment Issues
                </label>
                <input
                  value={equipmentIssues}
                  onChange={e => setEquipmentIssues(e.target.value)}
                  placeholder="e.g. Ventilator B3 — low battery alert"
                  className="w-full border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Right */}
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> On-Call Doctor
                  </label>
                  <input
                    value={oncallDoctor}
                    onChange={e => setOncallDoctor(e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Phone
                  </label>
                  <input
                    value={oncallPhone}
                    onChange={e => setOncallPhone(e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold tracking-widest text-gray-400 uppercase block mb-1 flex items-center gap-1">
                  <Wrench className="w-3 h-3" /> Staff Note
                </label>
                <textarea
                  value={staffNote}
                  onChange={e => setStaffNote(e.target.value)}
                  rows={3}
                  placeholder="Staff-level handoff notes, overtime, short-staffing, etc."
                  className="w-full border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-gray-500">
              {!allSigned && (
                <span className="text-amber-600 font-medium">
                  {totalPatients - signedCount} patient(s) not yet signed — complete all to enable handoff.
                </span>
              )}
              {allSigned && !showPin && (
                <span className="text-emerald-600 font-medium">All patients signed. Ready to complete handoff.</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="text-xs font-semibold text-gray-700 border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Draft'}
              </button>

              {!showPin ? (
                <button
                  onClick={() => { if (allSigned) setShowPin(true) }}
                  disabled={!allSigned}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${allSigned ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                >
                  {!allSigned && <Lock className="w-3.5 h-3.5" />}
                  Complete Handoff
                  {allSigned && <span>▸</span>}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    maxLength={6}
                    value={pinValue}
                    onChange={e => setPinValue(e.target.value.replace(/\D/g, ''))}
                    placeholder="PIN"
                    className="border rounded-lg px-2.5 py-1.5 text-xs w-24 tracking-widest focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleCompleteHandoff}
                    disabled={pinValue.length < 4 || completing}
                    className="text-xs font-semibold bg-emerald-600 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {completing ? 'Submitting…' : 'Confirm ✓'}
                  </button>
                  <button
                    onClick={() => { setShowPin(false); setPinValue('') }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
