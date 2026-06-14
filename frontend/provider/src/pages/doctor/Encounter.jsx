import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doctorApi, patientsApi, labApi, encountersApi } from '../../api'
import api from '../../api/client'
import { PageLoader } from '../../components/ui/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import {
  ArrowLeft, FileText, Pill, FlaskConical, Save, CheckCircle, Plus, Trash2,
  Lock, PenLine, BedDouble, X, ChevronDown, ChevronRight, Search,
  AlertCircle, Stethoscope, ClipboardList, Edit2, Activity, Heart,
  BookOpen, Microscope, Image, MessageSquare, Calendar, ChevronUp,
  CheckSquare,
} from 'lucide-react'
import VitalsForm from '../../components/clinical/VitalsForm'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const calcAge = dob =>
  dob ? Math.floor((Date.now() - new Date(dob)) / (365.25 * 86400000)) : null

function nextDate(days) {
  return new Date(Date.now() + parseInt(days || 0) * 86400000)
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Section definitions (order determines display order when added) ───────────
const SECTION_DEFS = [
  { key: 'complaints',    label: 'History of Illness',    icon: FileText,      unique: true  },
  { key: 'past_history',  label: 'Past History',          icon: BookOpen,      unique: true  },
  { key: 'examination',   label: 'Examination Findings',  icon: Activity,      unique: true  },
  { key: 'assessment',    label: 'Assessment / Diagnosis',icon: Stethoscope,   unique: true  },
  { key: 'lab',           label: 'Lab Orders',            icon: Microscope,    unique: true  },
  { key: 'imaging',       label: 'Imaging Orders',        icon: Image,         unique: true  },
  { key: 'medications',   label: 'Medications',           icon: Pill,          unique: true  },
  { key: 'counselling',   label: 'Counselling',           icon: MessageSquare, unique: true  },
  { key: 'followup',      label: 'Follow-up',             icon: Calendar,      unique: true  },
]

const FOLLOWUP_DAYS = ['7', '10', '14', '15', '20', '30', '45', '60', '90']
const FREQ_OPTIONS  = ['OD', 'BD', 'TDS', 'QID', 'SOS', 'Weekly', 'Alternate days', 'Monthly']
const TIMING_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'Night', 'Bedtime']
const DURATION_OPTIONS = ['3 days', '5 days', '7 days', '10 days', '14 days', '30 days', '60 days', '90 days', 'Ongoing']
const FOOD_OPTIONS  = ['Before food', 'After food', 'With food', 'Empty stomach', 'Bedtime']

// ─── Demographics Bar ─────────────────────────────────────────────────────────
function DemographicsBar({ patient = {}, vitals = {}, complaint }) {
  const age = calcAge(patient.date_of_birth)
  const genderShort = patient.gender === 'male' ? 'M' : patient.gender === 'female' ? 'F' : patient.gender

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm px-4 md:px-6 py-2.5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-gray-900 truncate">{patient.full_name}</span>
          {patient.clinic_patient_id && (
            <span className="text-xs font-mono text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded shrink-0">
              MRN: {patient.clinic_patient_id}
            </span>
          )}
        </div>
        <div className="flex gap-3 text-gray-600 shrink-0">
          {age != null && <span><span className="text-gray-400">Age</span> <b>{age}y</b></span>}
          {genderShort && <b>{genderShort}</b>}
          {patient.blood_group && <span className="text-red-600 font-bold">{patient.blood_group}</span>}
        </div>
        {(vitals.blood_pressure_systolic || vitals.pulse_rate || vitals.oxygen_saturation) && (
          <div className="flex gap-3 text-xs font-mono text-gray-500 shrink-0 border-l pl-4">
            {vitals.blood_pressure_systolic && (
              <span>BP <b className="text-gray-700">{vitals.blood_pressure_systolic}/{vitals.blood_pressure_diastolic}</b></span>
            )}
            {vitals.pulse_rate && <span>P <b className="text-gray-700">{vitals.pulse_rate}</b></span>}
            {vitals.oxygen_saturation && <span>SpO₂ <b className="text-gray-700">{vitals.oxygen_saturation}%</b></span>}
            {vitals.temperature && <span>T <b className="text-gray-700">{vitals.temperature}°F</b></span>}
            {vitals.weight_kg && <span>Wt <b className="text-gray-700">{vitals.weight_kg}kg</b></span>}
          </div>
        )}
        {patient.allergies && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200 shrink-0">
            <AlertCircle size={11} />⚠ {patient.allergies}
          </span>
        )}
        {complaint && (
          <span className="text-sm text-gray-500 truncate">
            <span className="text-gray-400">CC: </span>{complaint}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Section Divider ──────────────────────────────────────────────────────────
function SectionDivider({ icon: Icon, title, onEdit, locked, editMode }) {
  return (
    <div className="flex items-center gap-2 pt-6 pb-3 border-t border-gray-100">
      <Icon size={14} className="text-gray-400 shrink-0" />
      <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex-1">{title}</span>
      {!locked && onEdit && (
        <button type="button" onClick={onEdit}
          className={`text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            editMode
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
          }`}>
          <Edit2 size={11} />{editMode ? 'Done' : 'Edit'}
        </button>
      )}
    </div>
  )
}

// ─── Chip group ───────────────────────────────────────────────────────────────
function Chips({ options, value, multi = false, onChange, size = 'sm' }) {
  const selected = multi ? (Array.isArray(value) ? value : []) : value
  const px = size === 'xs' ? 'px-2 py-0.5' : 'px-2.5 py-1'
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => {
        const active = multi ? selected.includes(opt) : selected === opt
        return (
          <button key={opt} type="button"
            onClick={() => multi
              ? onChange(active ? selected.filter(s => s !== opt) : [...selected, opt])
              : onChange(active ? '' : opt)
            }
            className={`${px} rounded-lg text-xs border transition-all ${
              active
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
            }`}>
            {opt}
          </button>
        )
      })}
    </div>
  )
}

// ─── ICD-10 Tag ───────────────────────────────────────────────────────────────
function DxChip({ code, display, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-xs font-medium">
      <span className="font-mono text-blue-400">{code}</span> {display}
      {onRemove && (
        <button type="button" onClick={onRemove} className="hover:text-red-500 ml-0.5">
          <X size={11} />
        </button>
      )}
    </span>
  )
}

// ─── Auto-grow textarea ───────────────────────────────────────────────────────
function AutoTextarea({ value, onChange, onBlur, placeholder, disabled, minRows = 2 }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = ref.current.scrollHeight + 'px'
    }
  }, [value])
  return (
    <textarea
      ref={ref}
      className="w-full text-sm text-gray-800 bg-transparent outline-none resize-none placeholder-gray-300 leading-relaxed"
      style={{ minHeight: `${minRows * 1.6}em` }}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={disabled ? '—' : placeholder}
      disabled={disabled}
    />
  )
}

// ─── Lab result status ────────────────────────────────────────────────────────
function LabResultStatus({ order }) {
  const items = order.items || []
  const abnormal = items.filter(i => i.is_abnormal)
  if (items.length === 0 || items.every(i => !i.result_value)) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400 italic">
        <div className="w-2 h-2 rounded-full bg-yellow-300 animate-pulse" />
        Results awaited…
      </div>
    )
  }
  if (abnormal.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-green-600">
        <CheckSquare size={12} />
        All results within normal range
      </div>
    )
  }
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold text-red-600 mb-1">Abnormal results:</div>
      {abnormal.map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="font-medium text-gray-700">{item.test_name}</span>
          <span className="text-red-600 font-bold">{item.result_value} {item.unit}</span>
          {item.reference_range && <span className="text-gray-400">(ref: {item.reference_range})</span>}
        </div>
      ))}
    </div>
  )
}

// ─── Past Visit Card ──────────────────────────────────────────────────────────
function PastVisitCard({ visit }) {
  const [open, setOpen] = useState(false)
  const sn = visit.soap_note || {}
  const vt = visit.vitals   || {}
  const fields = [
    ['Chief Complaint',  sn.reason_for_visit   || sn.subjective],
    ['History',          sn.patient_complaints],
    ['Past History',     sn.past_history],
    ['Findings',         sn.investigations_findings || sn.objective],
    ['Assessment',       sn.discharge_assessment   || sn.assessment],
    ['Plan',             sn.cautions_followup      || sn.plan],
  ].filter(([, v]) => v)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button type="button"
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
        onClick={() => setOpen(o => !o)}>
        {open ? <ChevronDown size={14} className="text-gray-400 shrink-0" /> : <ChevronRight size={14} className="text-gray-400 shrink-0" />}
        <div className="flex-1 flex flex-wrap items-center gap-3 text-sm min-w-0">
          <span className="font-medium text-gray-800 shrink-0">{visit.appointment_date || visit.visit_date || visit.date}</span>
          <span className="text-gray-400 shrink-0">·</span>
          <span className="text-gray-500 shrink-0">{visit.visit_type || 'OPD'}</span>
          {vt.blood_pressure_systolic && (
            <span className="text-xs font-mono text-gray-400 bg-white border px-1.5 py-0.5 rounded shrink-0">
              BP {vt.blood_pressure_systolic}/{vt.blood_pressure_diastolic}
            </span>
          )}
          {(sn.discharge_assessment || sn.assessment) && (
            <span className="text-xs text-gray-400 truncate">
              {(sn.discharge_assessment || sn.assessment).substring(0, 60)}
            </span>
          )}
        </div>
        {(visit.is_locked || sn.is_locked) && <Lock size={12} className="text-gray-300 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-3 bg-white space-y-3">
          {(vt.blood_pressure_systolic || vt.pulse_rate) && (
            <div className="flex flex-wrap gap-3 text-xs font-mono text-gray-500 bg-gray-50 rounded-lg p-2">
              {vt.blood_pressure_systolic && <span>BP {vt.blood_pressure_systolic}/{vt.blood_pressure_diastolic}</span>}
              {vt.pulse_rate && <span>P {vt.pulse_rate} bpm</span>}
              {vt.oxygen_saturation && <span>SpO₂ {vt.oxygen_saturation}%</span>}
              {vt.temperature && <span>T {vt.temperature}°F</span>}
              {vt.weight_kg && <span>Wt {vt.weight_kg}kg</span>}
            </div>
          )}
          {fields.map(([label, value]) => (
            <div key={label}>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{value}</div>
            </div>
          ))}
          {(visit.prescriptions || []).length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Medications</div>
              <div className="flex flex-wrap gap-1.5">
                {visit.prescriptions.map((rx, i) => (
                  <span key={i} className="text-xs bg-blue-50 border border-blue-200 text-blue-800 rounded px-2 py-0.5">
                    <b>{rx.medicine_name || rx.medicine}</b>
                    {rx.dosage && ` · ${rx.dosage}`}
                    {rx.frequency && ` · ${rx.frequency}`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Admission Modal ───────────────────────────────────────────────────────────
function AdmissionModal({ appointmentId, patientId, patientName, prefillDiagnosis, onClose, onCreated }) {
  const { user } = useAuth()
  const [departments, setDepartments] = useState([])
  const [form, setForm] = useState({
    department_id: '', primary_diagnosis: prefillDiagnosis || '',
    expected_discharge: '', urgency: 'routine', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    api.get('/inpatient/departments').then(r => setDepartments(Array.isArray(r) ? r : [])).catch(() => {})
  }, [])

  const submit = async e => {
    e.preventDefault(); setSaving(true); setErr('')
    try {
      const res = await api.post('/inpatient/admissions', {
        patient_id: patientId,
        admitting_doctor_id: user?.id,
        source_appointment_id: parseInt(appointmentId),
        department_id: form.department_id ? parseInt(form.department_id) : undefined,
        admission_type: 'opd_referred',
        primary_diagnosis: form.primary_diagnosis,
        expected_discharge: form.expected_discharge || undefined,
        urgency: form.urgency,
        notes: form.notes,
      })
      onCreated(res?.admission_number || res?.id || 'created')
    } catch (ex) {
      setErr(ex?.response?.data?.detail || ex.message || 'Failed')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold" style={{ color: '#0F2557' }}>Advise Admission</h3>
            <p className="text-sm text-gray-500">{patientName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Department</label>
            <select className="input" value={form.department_id}
              onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
              <option value="">Select department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Primary Diagnosis</label>
            <textarea className="input resize-none" rows={2} value={form.primary_diagnosis}
              onChange={e => setForm(f => ({ ...f, primary_diagnosis: e.target.value }))} />
          </div>
          <div>
            <label className="label">Urgency</label>
            <select className="input" value={form.urgency}
              onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}>
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
              {saving ? 'Creating…' : 'Advise Admission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Section Add Menu ─────────────────────────────────────────────────────────
function AddSectionMenu({ addedKeys, onAdd, onClose }) {
  const available = SECTION_DEFS.filter(s => !addedKeys.includes(s.key))
  if (available.length === 0) return null
  return (
    <div className="absolute z-20 left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-1" onClick={e => e.stopPropagation()}>
      {available.map(s => {
        const Icon = s.icon
        return (
          <button key={s.key} type="button"
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-left text-sm text-gray-700"
            onClick={() => { onAdd(s.key); onClose() }}>
            <Icon size={14} className="text-gray-400 shrink-0" />
            {s.label}
          </button>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Main Component ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function PatientChart() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const autoSaveRef = useRef(null)
  const menuRef = useRef(null)

  // ── Data
  const [data, setData]             = useState(null)
  const [loadError, setLoadError]   = useState('')
  const [pastVisits, setPastVisits] = useState([])
  const [loading, setLoading]       = useState(true)
  const [isLocked, setIsLocked]     = useState(false)
  const [saving, setSaving]         = useState(false)
  const [msg, setMsg]               = useState('')
  const [addendumMode, setAddendumMode] = useState(false)
  const [addendumText, setAddendumText] = useState('')
  const [showAdmission, setShowAdmission] = useState(false)
  const [showPastVisits, setShowPastVisits] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)

  // ── Chart sections (ordered list of section keys that have been added)
  const [sections, setSections] = useState([])

  // ── Notes (one field per narrative section)
  const [notes, setNotes] = useState({
    reason_for_visit: '',
    patient_complaints: '',
    past_history: '',
    investigations_findings: '',
    discharge_assessment: '',
    cautions_followup: '',
  })

  // ── Edit mode per section (set means editing)
  const [editMode, setEditMode] = useState({})

  // ── Diagnoses (ICD-10 tags)
  const [diagnoses, setDiagnoses] = useState([])
  const [dxSearch, setDxSearch]   = useState('')
  const [dxResults, setDxResults] = useState([])

  // ── Lab orders
  const [labOrders, setLabOrders]         = useState([])   // pending orders
  const [labResults, setLabResults]       = useState([])   // placed orders with results
  const [imagingOrders, setImagingOrders] = useState([])
  const [orderNote, setOrderNote]         = useState('')
  const [ordersSaved, setOrdersSaved]     = useState(false)
  const [orderTab, setOrderTab]           = useState('lab')
  const [orderSearch, setOrderSearch]     = useState('')
  const [orderResults, setOrderResults]   = useState([])
  const [orderSearching, setOrderSearching] = useState(false)

  // ── Medications
  const [rxItems, setRxItems]   = useState([])
  const [rxNotes, setRxNotes]   = useState('')
  const [drugSearch, setDrugSearch]   = useState('')
  const [drugResults, setDrugResults] = useState([])
  const [drugSearching, setDrugSearching] = useState(false)
  const [configDrug, setConfigDrug]   = useState(null)
  const [drugConfig, setDrugConfig]   = useState({
    timing: ['Morning'], frequency: 'OD', duration: '7 days', food: 'After food', counselling: [],
  })
  const [counsellingTips, setCounsellingTips] = useState([])
  const [interactions, setInteractions] = useState([])

  // ── Follow-up
  const [followupDays, setFollowupDays] = useState('')

  // ── Counselling text + disease-level suggestion chips
  const [counsellingText, setCounsellingText] = useState('')
  const [diseaseTips, setDiseaseTips] = useState([])   // [{condition, tips:[]}]

  // ── Load encounter
  useEffect(() => {
    doctorApi.getEncounter(id)
      .then(r => {
        setData(r)
        const sn = r.soap_note
        if (sn) {
          const n = {
            reason_for_visit:        sn.reason_for_visit        || sn.subjective || r.triage_complaint || '',
            patient_complaints:      sn.patient_complaints      || '',
            past_history:            sn.past_history            || '',
            investigations_findings: sn.investigations_findings || sn.objective  || '',
            discharge_assessment:    sn.discharge_assessment    || sn.assessment || '',
            cautions_followup:       sn.cautions_followup       || sn.plan       || '',
          }
          setNotes(n)
          setIsLocked(!!sn.is_locked)

          // Auto-populate sections from saved data
          const auto = []
          if (n.patient_complaints)      auto.push('complaints')
          if (n.past_history)            auto.push('past_history')
          if (n.investigations_findings) auto.push('examination')
          if (n.discharge_assessment || sn.assessment) auto.push('assessment')
          setSections(auto)
        } else if (r.triage_complaint) {
          setNotes(n => ({ ...n, reason_for_visit: r.triage_complaint }))
        }

        // Load lab orders with results
        if (r.lab_orders?.length > 0) setLabResults(r.lab_orders)
        if (r.lab_orders?.length > 0) setSections(s =>
          s.includes('lab') ? s : [...s, 'lab'])

        // Load past visits
        if (r.patient?.id) {
          patientsApi.getClinical(r.patient.id)
            .then(cr => {
              const raw = cr?.visits || cr?.encounters || []
              setPastVisits(raw.filter(v =>
                String(v.appointment_id) !== String(id) && String(v.id) !== String(id)
              ))
            })
            .catch(() => {})
        }
      })
      .catch(err => {
        const detail = err?.response?.data?.detail || err?.message || 'Failed to load encounter'
        setLoadError(detail)
      })
      .finally(() => setLoading(false))
  }, [id])

  // Auto-save every 45s
  useEffect(() => {
    if (isLocked) return
    autoSaveRef.current = setInterval(() => saveDraft(false), 45000)
    return () => clearInterval(autoSaveRef.current)
  }, [notes, isLocked])

  // Close add menu on outside click
  useEffect(() => {
    if (!showAddMenu) return
    const handler = e => { if (!menuRef.current?.contains(e.target)) setShowAddMenu(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showAddMenu])

  // ICD-10 search
  useEffect(() => {
    if (dxSearch.length < 2) { setDxResults([]); return }
    const t = setTimeout(async () => {
      try {
        const r = await api.get('/terminology/search', { params: { q: dxSearch, category: 'condition', limit: 8 } })
        setDxResults(Array.isArray(r) ? r : (r?.items || r?.results || []))
      } catch { setDxResults([]) }
    }, 300)
    return () => clearTimeout(t)
  }, [dxSearch])

  // Drug search
  useEffect(() => {
    if (drugSearch.length < 2) { setDrugResults([]); return }
    const t = setTimeout(async () => {
      setDrugSearching(true)
      try {
        const r = await api.get('/terminology/drugs/search', { params: { q: drugSearch, limit: 10 } })
        setDrugResults(Array.isArray(r) ? r : [])
      } catch { setDrugResults([]) }
      finally { setDrugSearching(false) }
    }, 250)
    return () => clearTimeout(t)
  }, [drugSearch])

  // Order search (lab + imaging both use lab_tests table, tab filters)
  useEffect(() => {
    if (orderSearch.length < 2) { setOrderResults([]); return }
    const t = setTimeout(async () => {
      setOrderSearching(true)
      try {
        const r = await labApi.searchTests(orderSearch, orderTab)
        setOrderResults(Array.isArray(r) ? r : [])
      } catch { setOrderResults([]) }
      finally { setOrderSearching(false) }
    }, 250)
    return () => clearTimeout(t)
  }, [orderSearch, orderTab])

  // Auto-fetch disease counselling tips when diagnoses change
  useEffect(() => {
    if (!diagnoses.length) { setDiseaseTips([]); return }
    const codes = [...new Set(diagnoses.map(d => d.code.slice(0, 3).toUpperCase()))]
    Promise.all(
      codes.map(code =>
        api.get('/terminology/counselling/suggest', { params: { icd10: code } })
          .then(r => r.data)
          .catch(() => null)
      )
    ).then(results => {
      setDiseaseTips(results.filter(r => r && r.tips && r.tips.length > 0))
    })
  }, [diagnoses])

  // ── Actions ──────────────────────────────────────────────────────────────────
  const flash = text => { setMsg(text); setTimeout(() => setMsg(''), 3500) }

  const saveDraft = async (showMsg = true) => {
    if (isLocked || !data) return
    try {
      await encountersApi.save({ appointment_id: parseInt(id), ...notes, lock: false })
      if (showMsg) flash('Draft saved')
    } catch (e) {
      if (showMsg) flash('Error saving: ' + e.message)
    }
  }

  const saveSection = async (key) => {
    if (isLocked || !data) return
    setEditMode(m => ({ ...m, [key]: false }))
    saveDraft(false)
  }

  const endConsultation = async () => {
    if (!window.confirm('End consultation and lock the record? This cannot be undone.')) return
    setSaving(true)
    try {
      await encountersApi.save({ appointment_id: parseInt(id), ...notes, lock: true })

      if (rxItems.length > 0) {
        await doctorApi.completeEncounter(id, {
          soap: { appointment_id: parseInt(id) },
          prescription: {
            notes: rxNotes,
            items: rxItems.map(rx => ({
              medicine_name: rx.generic,
              dosage: rx.config.timing.join('+'),
              frequency: rx.config.frequency,
              duration: rx.config.duration,
              instructions: [rx.config.food, ...(rx.config.counselling || [])].filter(Boolean).join('; '),
            })),
          },
        })
      }

      if (labOrders.length > 0 || imagingOrders.length > 0) {
        await doctorApi.completeEncounter(id, {
          soap: { appointment_id: parseInt(id) },
          lab_order:     labOrders.length     ? { notes: orderNote, tests: labOrders }     : null,
          imaging_order: imagingOrders.length ? { notes: orderNote, tests: imagingOrders } : null,
        })
      }

      setIsLocked(true)
      flash('Consultation locked')
      setTimeout(() => navigate('/doctor-desk'), 1500)
    } catch (e) {
      flash('Error: ' + e.message)
    } finally { setSaving(false) }
  }

  const submitAddendum = async () => {
    if (!addendumText.trim()) return
    setSaving(true)
    try {
      await encountersApi.addendum({ appointment_id: parseInt(id), addendum: addendumText })
      setAddendumText('')
      setAddendumMode(false)
      flash('Addendum added')
    } catch (e) {
      flash('Error: ' + e.message)
    } finally { setSaving(false) }
  }

  const saveOrders = async () => {
    setSaving(true)
    try {
      await doctorApi.completeEncounter(id, {
        soap: { appointment_id: parseInt(id) },
        lab_order:     labOrders.length     ? { notes: orderNote, tests: labOrders }     : null,
        imaging_order: imagingOrders.length ? { notes: orderNote, tests: imagingOrders } : null,
      })
      setOrdersSaved(true)
      // Move pending to "placed" list
      setLabResults(prev => [...prev, ...labOrders.map(o => ({ ...o, items: [] }))])
      setLabOrders([])
      setImagingOrders([])
      flash('Orders placed successfully')
    } catch (e) {
      flash('Error placing orders: ' + e.message)
    } finally { setSaving(false) }
  }

  const selectDrug = async drug => {
    setConfigDrug(drug)
    setDrugSearch('')
    setDrugResults([])
    setDrugConfig({ timing: ['Morning'], frequency: 'OD', duration: '7 days', food: 'After food', counselling: [] })
    setCounsellingTips([])
    setInteractions([])

    try {
      const [tips, ixns] = await Promise.all([
        api.get('/terminology/drugs/counselling', { params: { generic: drug.generic } }).catch(() => ({})),
        api.get('/terminology/drugs/interactions', { params: { generic: drug.generic } }).catch(() => []),
      ])
      setCounsellingTips(tips?.tips || [])
      setInteractions(Array.isArray(ixns) ? ixns : [])
    } catch { /* non-fatal */ }
  }

  const addMedication = () => {
    if (!configDrug) return
    setRxItems(prev => [...prev, { id: Date.now(), ...configDrug, config: { ...drugConfig } }])
    setConfigDrug(null)
    setCounsellingTips([])
    setInteractions([])
    setDrugConfig({ timing: ['Morning'], frequency: 'OD', duration: '7 days', food: 'After food', counselling: [] })
  }

  const addOrder = item => {
    const order = { test_id: item.id, test_name: item.name }
    if (orderTab === 'lab') {
      if (!labOrders.find(o => o.test_name === item.name))
        setLabOrders(p => [...p, order])
    } else {
      if (!imagingOrders.find(o => o.test_name === item.name))
        setImagingOrders(p => [...p, order])
    }
    setOrderSearch('')
    setOrderResults([])
    setOrdersSaved(false)
  }

  const addSection = key => {
    setSections(s => s.includes(key) ? s : [...s, key])
    setEditMode(m => ({ ...m, [key]: true }))
  }

  const note = (key, val) => setNotes(n => ({ ...n, [key]: val }))
  const toggleEdit = key => setEditMode(m => ({ ...m, [key]: !m[key] }))

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return <PageLoader />
  if (!data)   return (
    <div className="p-8 text-center">
      <div className="text-red-500 font-semibold mb-2">Could not load encounter</div>
      <div className="text-sm text-gray-500 mb-4">{loadError || 'Appointment not found or access denied.'}</div>
      <button onClick={() => navigate(-1)} className="btn-secondary text-sm">← Go Back</button>
    </div>
  )

  const patient    = data.patient || {}
  const vitals     = data.vitals  || {}
  const isHospital = user?.org_type === 'hospital'
  const assessmentDisplay = diagnoses.map(d => `${d.code} ${d.display}`).join(', ')
    || notes.discharge_assessment

  return (
    <div className="-mx-4 md:-mx-6 flex flex-col">

      {/* Sticky Demographics Bar */}
      <DemographicsBar patient={patient} vitals={vitals} complaint={data.triage_complaint} />

      {/* Flash message */}
      {msg && (
        <div className={`mx-4 md:mx-6 mt-3 px-4 py-2.5 rounded-lg text-sm ${
          msg.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {msg}
        </div>
      )}

      <div className="px-4 md:px-6 py-5 max-w-3xl">

        {/* Header row */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(-1)} className="btn-secondary p-2 shrink-0">
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-gray-900 truncate">{patient.full_name}</h1>
              <p className="text-xs text-gray-400 font-mono">
                {data.appointment_date} {data.appointment_time}
                {isLocked && <span className="ml-2 text-amber-500">· Locked</span>}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {isHospital && (
              <button onClick={() => setShowAdmission(true)} className="btn-secondary text-sm">
                <BedDouble size={14} />Admit
              </button>
            )}
            {isLocked ? (
              <button onClick={() => setAddendumMode(v => !v)} className="btn-secondary text-sm">
                <PenLine size={14} />Addendum
              </button>
            ) : (
              <>
                <button onClick={() => saveDraft(true)} disabled={saving} className="btn-secondary text-sm">
                  <Save size={14} />{saving ? '…' : 'Save Draft'}
                </button>
                <button onClick={endConsultation} disabled={saving} className="btn-success text-sm">
                  <CheckCircle size={14} />{saving ? '…' : 'End & Lock'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Locked banner */}
        {isLocked && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 mb-4">
            <Lock size={14} className="shrink-0" />
            This record is locked. Use Addendum to add notes.
          </div>
        )}

        {/* Addendum box */}
        {addendumMode && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3 mb-4">
            <p className="text-sm font-semibold text-amber-800">Add Addendum</p>
            <textarea className="input resize-none w-full" rows={3} value={addendumText}
              onChange={e => setAddendumText(e.target.value)} placeholder="Enter addendum note…" autoFocus />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setAddendumMode(false); setAddendumText('') }}
                className="btn-secondary text-sm">Cancel</button>
              <button type="button" onClick={submitAddendum} disabled={!addendumText.trim() || saving}
                className="btn-primary text-sm">Submit Addendum</button>
            </div>
          </div>
        )}

        {/* ── Visit date badge ─────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-1 text-xs text-gray-400 font-mono">
          <div className={`w-2 h-2 rounded-full shrink-0 ${isLocked ? 'bg-gray-300' : 'bg-green-400 animate-pulse'}`} />
          {data.appointment_date}
          <span className="mx-1">·</span>
          {isLocked ? 'Locked Record' : 'Active Visit'}
        </div>

        {/* ════════════════════════════════════════════════════════
            VITALS — always visible, compact
        ════════════════════════════════════════════════════════ */}
        <div>
          <SectionDivider icon={Heart} title="Vitals" locked={isLocked} />
          <VitalsForm
            patientId={data.patient?.id}
            appointmentId={data.id}
            initialValues={vitals}
            compact={true}
            readOnly={isLocked}
            onSaved={saved => setData(d => d ? { ...d, vitals: { ...d.vitals, ...saved } } : d)}
          />
        </div>

        {/* ════════════════════════════════════════════════════════
            CHIEF COMPLAINT — always visible
        ════════════════════════════════════════════════════════ */}
        <div>
          <SectionDivider icon={FileText} title="Chief Complaint"
            locked={isLocked}
            onEdit={notes.reason_for_visit ? () => toggleEdit('chief') : undefined}
            editMode={editMode.chief} />

          {editMode.chief || !notes.reason_for_visit ? (
            <div>
              <AutoTextarea
                value={notes.reason_for_visit}
                onChange={v => note('reason_for_visit', v)}
                onBlur={() => saveSection('chief')}
                placeholder="Enter chief complaint…"
                disabled={isLocked}
              />
              {/* ICD-10 search beneath chief complaint */}
              {!isLocked && (
                <div className="relative mt-3">
                  <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                    <Search size={13} className="text-gray-400 shrink-0" />
                    <input
                      className="flex-1 outline-none text-sm bg-transparent text-gray-700"
                      placeholder="Search and add diagnosis (ICD-10)…"
                      value={dxSearch}
                      onChange={e => setDxSearch(e.target.value)}
                    />
                    {dxSearch && <button type="button" onClick={() => { setDxSearch(''); setDxResults([]) }}><X size={13} className="text-gray-400" /></button>}
                  </div>
                  {dxResults.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                      {dxResults.map((r, i) => (
                        <button key={i} type="button"
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b last:border-0"
                          onClick={() => {
                            if (!diagnoses.find(d => d.code === r.code))
                              setDiagnoses(p => [...p, { code: r.code, display: r.display }])
                            setDxSearch(''); setDxResults([])
                          }}>
                          <span className="font-mono text-xs text-gray-400 mr-2">{r.code}</span>
                          {r.display}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-800 leading-relaxed">{notes.reason_for_visit}</p>
          )}

          {/* ICD-10 diagnosis chips (always visible once added) */}
          {diagnoses.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {diagnoses.map((d, i) => (
                <DxChip key={i} code={d.code} display={d.display}
                  onRemove={!isLocked ? () => setDiagnoses(p => p.filter((_, j) => j !== i)) : undefined} />
              ))}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════
            DYNAMIC SECTIONS
        ════════════════════════════════════════════════════════ */}
        {sections.map(key => {
          const def = SECTION_DEFS.find(s => s.key === key)
          if (!def) return null

          // ── History of Illness ───────────────────────────────
          if (key === 'complaints') return (
            <div key={key}>
              <SectionDivider icon={def.icon} title={def.label}
                locked={isLocked}
                onEdit={notes.patient_complaints ? () => toggleEdit(key) : undefined}
                editMode={editMode[key]} />
              {editMode[key] || !notes.patient_complaints ? (
                <AutoTextarea value={notes.patient_complaints}
                  onChange={v => note('patient_complaints', v)}
                  onBlur={() => saveSection(key)}
                  placeholder="History of present illness, symptom duration, severity…"
                  disabled={isLocked} />
              ) : (
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{notes.patient_complaints}</p>
              )}
            </div>
          )

          // ── Past History ─────────────────────────────────────
          if (key === 'past_history') return (
            <div key={key}>
              <SectionDivider icon={def.icon} title={def.label}
                locked={isLocked}
                onEdit={notes.past_history ? () => toggleEdit(key) : undefined}
                editMode={editMode[key]} />
              {editMode[key] || !notes.past_history ? (
                <AutoTextarea value={notes.past_history}
                  onChange={v => note('past_history', v)}
                  onBlur={() => saveSection(key)}
                  placeholder="Past medical, surgical, family, social history…"
                  disabled={isLocked} />
              ) : (
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{notes.past_history}</p>
              )}
            </div>
          )

          // ── Examination Findings ─────────────────────────────
          if (key === 'examination') return (
            <div key={key}>
              <SectionDivider icon={def.icon} title={def.label}
                locked={isLocked}
                onEdit={notes.investigations_findings ? () => toggleEdit(key) : undefined}
                editMode={editMode[key]} />
              {editMode[key] || !notes.investigations_findings ? (
                <AutoTextarea value={notes.investigations_findings}
                  onChange={v => note('investigations_findings', v)}
                  onBlur={() => saveSection(key)}
                  placeholder="General examination, systemic examination findings…"
                  disabled={isLocked} />
              ) : (
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{notes.investigations_findings}</p>
              )}
            </div>
          )

          // ── Assessment / Diagnosis ───────────────────────────
          if (key === 'assessment') return (
            <div key={key}>
              <SectionDivider icon={def.icon} title={def.label}
                locked={isLocked}
                onEdit={() => toggleEdit(key)}
                editMode={editMode[key]} />

              {/* Diagnosis search only in edit mode */}
              {(editMode[key] || !assessmentDisplay) && !isLocked && (
                <div className="relative mb-3">
                  <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50">
                    <Search size={13} className="text-gray-400 shrink-0" />
                    <input
                      className="flex-1 outline-none text-sm bg-transparent"
                      placeholder="Search diagnosis (ICD-10)…"
                      value={dxSearch}
                      onChange={e => setDxSearch(e.target.value)}
                    />
                    {dxSearch && <button type="button" onClick={() => { setDxSearch(''); setDxResults([]) }}><X size={13} className="text-gray-400" /></button>}
                  </div>
                  {dxResults.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                      {dxResults.map((r, i) => (
                        <button key={i} type="button"
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b last:border-0"
                          onClick={() => {
                            if (!diagnoses.find(d => d.code === r.code))
                              setDiagnoses(p => [...p, { code: r.code, display: r.display }])
                            setDxSearch(''); setDxResults([])
                          }}>
                          <span className="font-mono text-xs text-gray-400 mr-2">{r.code}</span>
                          {r.display}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {diagnoses.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {diagnoses.map((d, i) => (
                    <DxChip key={i} code={d.code} display={d.display}
                      onRemove={!isLocked ? () => setDiagnoses(p => p.filter((_, j) => j !== i)) : undefined} />
                  ))}
                </div>
              )}

              {(editMode[key] || !notes.discharge_assessment) ? (
                <AutoTextarea value={notes.discharge_assessment}
                  onChange={v => note('discharge_assessment', v)}
                  onBlur={() => saveSection(key)}
                  placeholder="Clinical assessment, differential diagnosis, management plan…"
                  disabled={isLocked} />
              ) : (
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{notes.discharge_assessment}</p>
              )}
            </div>
          )

          // ── Lab / Imaging Orders ─────────────────────────────
          if (key === 'lab') return (
            <div key={key}>
              <SectionDivider icon={def.icon} title="Investigations (Lab & Imaging)"
                locked={isLocked}
                onEdit={!ordersSaved ? () => toggleEdit(key) : undefined}
                editMode={editMode[key]} />

              {/* Tabs */}
              {!isLocked && (editMode[key] || (labOrders.length === 0 && imagingOrders.length === 0 && labResults.length === 0)) && (
                <div>
                  <div className="flex border border-gray-200 rounded-lg overflow-hidden w-fit mb-3">
                    {['lab', 'imaging'].map(t => (
                      <button key={t} type="button"
                        onClick={() => { setOrderTab(t); setOrderSearch(''); setOrderResults([]) }}
                        className={`px-4 py-1.5 text-xs font-medium capitalize transition-colors ${
                          orderTab === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                        }`}>
                        {t === 'lab' ? 'Lab' : 'Imaging'}
                      </button>
                    ))}
                  </div>

                  {/* Order search */}
                  <div className="relative mb-3">
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                      <Search size={13} className="text-gray-400 shrink-0" />
                      <input className="flex-1 outline-none text-sm"
                        placeholder={orderTab === 'lab' ? 'Search lab tests (CBC, LFT, TSH…)' : 'Search imaging (X-Ray Chest, USG Abdomen…)'}
                        value={orderSearch}
                        onChange={e => setOrderSearch(e.target.value)} />
                      {orderSearching && <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />}
                    </div>
                    {orderResults.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                        {orderResults.map((r, i) => (
                          <button key={i} type="button"
                            className="w-full text-left px-3 py-2.5 hover:bg-blue-50 text-sm border-b last:border-0 flex items-center gap-3"
                            onClick={() => addOrder(r)}>
                            <span className="font-medium text-gray-800 flex-1">{r.name}</span>
                            {r.category && <span className="text-xs text-gray-400 shrink-0">{r.category}</span>}
                            {r.turnaround_hours && <span className="text-xs text-gray-300 shrink-0">{r.turnaround_hours}h</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pending lab orders */}
              {labOrders.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs font-semibold text-blue-600 mb-1.5">Lab — pending submit:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {labOrders.map((o, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-2 py-0.5">
                        {o.test_name}
                        <button type="button" onClick={() => setLabOrders(p => p.filter((_, j) => j !== i))}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending imaging orders */}
              {imagingOrders.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs font-semibold text-purple-600 mb-1.5">Imaging — pending submit:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {imagingOrders.map((o, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs bg-purple-50 border border-purple-200 text-purple-800 rounded-lg px-2 py-0.5">
                        {o.test_name}
                        <button type="button" onClick={() => setImagingOrders(p => p.filter((_, j) => j !== i))}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit orders button */}
              {(labOrders.length > 0 || imagingOrders.length > 0) && !ordersSaved && (
                <button type="button" onClick={saveOrders} disabled={saving}
                  className="btn-primary text-xs mt-2">
                  <Save size={12} />{saving ? '…' : 'Submit Orders'}
                </button>
              )}
              {ordersSaved && <span className="text-xs text-green-600 font-medium mt-2 block">✓ Orders submitted</span>}

              {/* Placed orders with result status */}
              {labResults.length > 0 && (
                <div className="mt-3 space-y-3">
                  {labResults.map((order, i) => (
                    <div key={i} className="border border-gray-100 rounded-lg p-3">
                      <div className="text-xs font-semibold text-gray-600 mb-1.5">
                        {order.test_name || order.order_id || `Order ${i + 1}`}
                      </div>
                      <LabResultStatus order={order} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )

          // ── Medications ──────────────────────────────────────
          if (key === 'medications') return (
            <div key={key}>
              <SectionDivider icon={def.icon} title={def.label}
                locked={isLocked}
                onEdit={() => toggleEdit(key)}
                editMode={editMode[key]} />

              {/* Drug search */}
              {!isLocked && (editMode[key] || rxItems.length === 0) && (
                <div className="space-y-4">
                  <div className="relative">
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                      <Search size={13} className="text-gray-400 shrink-0" />
                      <input className="flex-1 outline-none text-sm"
                        placeholder="Search drug (generic name)…"
                        value={drugSearch}
                        onChange={e => setDrugSearch(e.target.value)} />
                      {drugSearching && <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />}
                    </div>
                    {drugResults.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {drugResults.map((r, i) => (
                          <button key={i} type="button"
                            className="w-full text-left px-3 py-2.5 hover:bg-blue-50 text-sm border-b last:border-0"
                            onClick={() => selectDrug(r)}>
                            <div className="font-medium text-gray-800">{r.generic}</div>
                            {r.brands && <div className="text-xs text-gray-400 mt-0.5">{r.brands.split('|').slice(0, 3).join(', ')}</div>}
                            {r.drug_class && <div className="text-xs text-blue-400">{r.drug_class}</div>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Drug config panel */}
                  {configDrug && (
                    <div className="border border-blue-100 bg-blue-50/40 rounded-xl p-4 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-gray-900">{configDrug.generic}</div>
                          {configDrug.drug_class && <div className="text-xs text-gray-500">{configDrug.drug_class}</div>}
                        </div>
                        <button type="button" onClick={() => setConfigDrug(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                      </div>

                      {/* Interactions warning */}
                      {interactions.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                          <div className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
                            <AlertCircle size={12} />Interactions / Cautions
                          </div>
                          {interactions.slice(0, 3).map((ix, i) => (
                            <div key={i} className="text-xs text-amber-800">
                              <span className={`font-medium ${ix.severity === 'contraindicated' ? 'text-red-600' : 'text-amber-700'}`}>
                                {ix.severity}:
                              </span>{' '}
                              {ix.drug_b} — {ix.effect?.substring(0, 80)}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Timing chips */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1.5">Timing (select all that apply)</div>
                        <Chips options={TIMING_OPTIONS} value={drugConfig.timing} multi
                          onChange={v => setDrugConfig(c => ({ ...c, timing: v }))} />
                      </div>

                      {/* Frequency chips */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1.5">Frequency</div>
                        <Chips options={FREQ_OPTIONS} value={drugConfig.frequency}
                          onChange={v => setDrugConfig(c => ({ ...c, frequency: v }))} />
                      </div>

                      {/* Duration chips */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1.5">Duration</div>
                        <Chips options={DURATION_OPTIONS} value={drugConfig.duration}
                          onChange={v => setDrugConfig(c => ({ ...c, duration: v }))} />
                      </div>

                      {/* Food chips */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1.5">With food</div>
                        <Chips options={FOOD_OPTIONS} value={drugConfig.food}
                          onChange={v => setDrugConfig(c => ({ ...c, food: v }))} />
                      </div>

                      {/* Counselling tips */}
                      {counsellingTips.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1.5">Counselling tips (select to add)</div>
                          <div className="flex flex-wrap gap-1.5">
                            {counsellingTips.map((tip, i) => {
                              const selected = drugConfig.counselling.includes(tip)
                              return (
                                <button key={i} type="button"
                                  onClick={() => setDrugConfig(c => ({
                                    ...c,
                                    counselling: selected
                                      ? c.counselling.filter(t => t !== tip)
                                      : [...c.counselling, tip],
                                  }))}
                                  className={`px-2 py-1 rounded-lg text-xs border transition-all ${
                                    selected
                                      ? 'bg-green-600 text-white border-green-600'
                                      : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
                                  }`}>
                                  {tip}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      <button type="button" onClick={addMedication}
                        className="btn-primary text-sm w-full justify-center">
                        <Plus size={14} />Add Medication
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Medications list */}
              {rxItems.length > 0 && (
                <div className="mt-3 space-y-2">
                  {rxItems.map((rx, i) => (
                    <div key={rx.id} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                      <Pill size={14} className="text-blue-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-gray-800 text-sm">{rx.generic}</span>
                        <span className="text-gray-500 text-xs ml-2">
                          {rx.config.timing.join('+')} · {rx.config.frequency} · {rx.config.duration} · {rx.config.food}
                        </span>
                        {rx.config.counselling?.length > 0 && (
                          <div className="text-xs text-gray-400 mt-0.5">{rx.config.counselling.join(' · ')}</div>
                        )}
                      </div>
                      {!isLocked && (
                        <button type="button" onClick={() => setRxItems(p => p.filter((_, j) => j !== i))}
                          className="text-gray-300 hover:text-red-400 shrink-0"><X size={13} /></button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {rxItems.length === 0 && !editMode[key] && !configDrug && (
                <p className="text-sm text-gray-400 italic">No medications added yet.</p>
              )}
            </div>
          )

          // ── Counselling ──────────────────────────────────────
          if (key === 'counselling') return (
            <div key={key}>
              <SectionDivider icon={def.icon} title={def.label}
                locked={isLocked}
                onEdit={counsellingText ? () => toggleEdit(key) : undefined}
                editMode={editMode[key]} />

              {/* Disease-specific tip chips */}
              {diseaseTips.length > 0 && !isLocked && (
                <div className="mb-3 space-y-2">
                  {diseaseTips.map((entry, ei) => (
                    <div key={ei}>
                      {entry.condition && (
                        <div className="text-xs font-medium text-indigo-700 mb-1">{entry.condition}</div>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {entry.tips.map((tip, ti) => {
                          const alreadyAdded = counsellingText.includes(tip)
                          return (
                            <button
                              key={ti}
                              onClick={() => {
                                if (!alreadyAdded) {
                                  setCounsellingText(prev =>
                                    prev ? prev + '\n• ' + tip : '• ' + tip
                                  )
                                }
                              }}
                              className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                                alreadyAdded
                                  ? 'bg-indigo-100 border-indigo-300 text-indigo-500 cursor-default'
                                  : 'bg-white border-gray-300 text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer'
                              }`}
                            >
                              {alreadyAdded ? '✓ ' : '+ '}{tip}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {editMode[key] || !counsellingText ? (
                <AutoTextarea value={counsellingText}
                  onChange={setCounsellingText}
                  onBlur={() => setEditMode(m => ({ ...m, [key]: false }))}
                  placeholder="Patient education, lifestyle advice, red flag symptoms to watch for…"
                  disabled={isLocked} />
              ) : (
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{counsellingText}</p>
              )}
            </div>
          )

          // ── Follow-up ────────────────────────────────────────
          if (key === 'followup') return (
            <div key={key}>
              <SectionDivider icon={def.icon} title="Follow-up"
                locked={isLocked}
                onEdit={followupDays ? () => toggleEdit(key) : undefined}
                editMode={editMode[key]} />

              {(editMode[key] || !followupDays) && !isLocked ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Review after:</div>
                    <Chips options={FOLLOWUP_DAYS.map(d => `${d} days`)} value={followupDays}
                      onChange={setFollowupDays} />
                  </div>
                  {followupDays && (
                    <div className="text-sm text-gray-600">
                      Follow-up on: <b className="text-gray-900">{nextDate(followupDays)}</b>
                    </div>
                  )}
                  <textarea className="input resize-none w-full" rows={2}
                    value={notes.cautions_followup}
                    onChange={e => note('cautions_followup', e.target.value)}
                    onBlur={() => saveDraft(false)}
                    placeholder="Additional follow-up instructions, red flags…" />
                </div>
              ) : (
                <div className="space-y-1">
                  {followupDays && (
                    <div className="text-sm text-gray-800">
                      Review in <b>{followupDays}</b> — <span className="text-gray-500">{nextDate(followupDays)}</span>
                    </div>
                  )}
                  {notes.cautions_followup && (
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{notes.cautions_followup}</p>
                  )}
                </div>
              )}
            </div>
          )

          return null
        })}

        {/* ════════════════════════════════════════════════════════
            ADD SECTION BUTTON
        ════════════════════════════════════════════════════════ */}
        {!isLocked && sections.length < SECTION_DEFS.length && (
          <div className="relative mt-8 pt-6 border-t border-gray-100" ref={menuRef}>
            <button type="button"
              onClick={() => setShowAddMenu(v => !v)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
              <div className="w-6 h-6 rounded-full border-2 border-blue-400 flex items-center justify-center">
                <Plus size={14} />
              </div>
              Add section
            </button>
            {showAddMenu && (
              <AddSectionMenu
                addedKeys={sections}
                onAdd={addSection}
                onClose={() => setShowAddMenu(false)} />
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            PAST VISITS
        ════════════════════════════════════════════════════════ */}
        {pastVisits.length > 0 && (
          <div className="mt-10 pt-6 border-t border-gray-100">
            <button type="button"
              className="flex items-center gap-2 w-full text-left mb-4"
              onClick={() => setShowPastVisits(v => !v)}>
              <ClipboardList size={14} className="text-gray-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex-1">
                Past Visits ({pastVisits.length})
              </span>
              {showPastVisits ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </button>
            {showPastVisits && (
              <div className="space-y-2">
                {pastVisits.map((v, i) => <PastVisitCard key={i} visit={v} />)}
              </div>
            )}
          </div>
        )}

        {/* Bottom spacer */}
        <div className="h-20" />
      </div>

      {/* Admission modal */}
      {showAdmission && (
        <AdmissionModal
          appointmentId={id}
          patientId={patient.id}
          patientName={patient.full_name}
          prefillDiagnosis={assessmentDisplay}
          onClose={() => setShowAdmission(false)}
          onCreated={num => { flash(`Admission ${num} created`); setShowAdmission(false) }}
        />
      )}
    </div>
  )
}
