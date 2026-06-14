import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { usePin } from '../contexts/PinContext'
import { useAuth } from '../contexts/AuthContext'
import { useWardSession } from '../contexts/WardSessionContext'
import {
  ArrowLeft, Activity, FileText, Stethoscope, ClipboardList, Pill,
  Plus, Loader2, AlertCircle, Clock, User, BedDouble, Calendar,
  CheckCircle2, Ban, Clipboard, Heart, Thermometer, Droplets,
  Wind, FlaskConical, Utensils, Bell, PersonStanding, ChevronDown,
  ChevronUp, RefreshCw, AlertTriangle, BookOpen,
} from 'lucide-react'

function timeAgo(dateStr) {
  if (!dateStr) return null
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000 / 60
  if (diff < 60) return `${Math.round(diff)}m ago`
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`
  return `${Math.round(diff / 1440)}d ago`
}

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const TABS = [
  { key: 'overview',   label: 'Overview',       icon: User },
  { key: 'vitals',     label: 'Vitals',          icon: Activity },
  { key: 'notes',      label: 'Nursing Notes',   icon: FileText },
  { key: 'mar',        label: 'MAR',             icon: Pill },
  { key: 'orders',     label: 'Orders',          icon: ClipboardList },
  { key: 'assessments',label: 'Assessments',     icon: Clipboard },
  { key: 'rounds',     label: 'Ward Rounds',     icon: Stethoscope },
]

function OverviewTab({ admission }) {
  if (!admission) return null
  const pt = admission.patient || {}
  const ward = admission.ward?.name || admission.ward_name || '—'
  const bed = admission.bed?.bed_number || admission.bed_number || '—'

  const info = [
    { label: 'Patient Name',      value: pt.full_name || admission.patient_name || '—' },
    { label: 'Gender / Age',      value: [pt.gender, pt.age ? `${pt.age} yrs` : null].filter(Boolean).join(' · ') || '—' },
    { label: 'MRN',               value: pt.patient_id || pt.mrn || '—' },
    { label: 'Phone',             value: pt.phone || '—' },
    { label: 'Admission #',       value: admission.admission_number || `#${admission.id}` },
    { label: 'Admitted On',       value: fmtDate(admission.admission_date || admission.created_at) },
    { label: 'Ward / Bed',        value: `${ward} / ${bed}` },
    { label: 'Admission Type',    value: admission.admission_type || '—' },
    { label: 'Primary Diagnosis', value: admission.diagnosis || admission.primary_diagnosis || '—' },
    { label: 'Attending Doctor',  value: admission.doctor?.full_name || admission.doctor_name || '—' },
    { label: 'Status',            value: admission.status || '—' },
  ]

  const allergies = admission.allergies || pt.allergies || []

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <User size={16} className="text-emerald-600" /> Patient & Admission Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {info.map(({ label, value }) => (
            <div key={label}>
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</div>
              <div className="text-sm font-medium text-gray-800">{value}</div>
            </div>
          ))}
        </div>
      </div>
      {allergies.length > 0 && (
        <div className="card p-5 border-red-100">
          <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
            <AlertCircle size={16} /> Allergies
          </h3>
          <div className="flex flex-wrap gap-2">
            {allergies.map((a, i) => (
              <span key={i} className="px-3 py-1 bg-red-50 border border-red-200 text-red-800 text-xs rounded-full font-medium">
                {typeof a === 'string' ? a : a.allergen || a.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function VitalsTab({ admissionId }) {
  const [vitals, setVitals] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ bp: '', pulse: '', temp: '', spo2: '', rr: '', weight: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const { requestPin } = usePin()

  useEffect(() => {
    api.get(`/inpatient/admissions/${admissionId}/vitals`)
      .then(d => setVitals(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [admissionId])

  const save = async () => {
    await requestPin('Record Vitals')
    setSaving(true)
    try {
      const r = await api.post(`/inpatient/admissions/${admissionId}/vitals`, form)
      setVitals(prev => [r, ...prev])
      setForm({ bp: '', pulse: '', temp: '', spo2: '', rr: '', weight: '', note: '' })
      setShowForm(false)
    } catch (e) {
      alert(e.message || 'Failed to save vitals')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(v => !v)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> Add Vitals
        </button>
      </div>
      {showForm && (
        <div className="card p-5">
          <h4 className="font-semibold text-gray-800 mb-4">New Vitals Entry</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            {[
              { key: 'bp', label: 'Blood Pressure', placeholder: '120/80' },
              { key: 'pulse', label: 'Pulse (bpm)', placeholder: '72' },
              { key: 'temp', label: 'Temperature (°C)', placeholder: '37.0' },
              { key: 'spo2', label: 'SpO₂ (%)', placeholder: '98' },
              { key: 'rr', label: 'Resp Rate', placeholder: '18' },
              { key: 'weight', label: 'Weight (kg)', placeholder: '70' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-1">{label}</label>
                <input className="input" placeholder={placeholder} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">Notes</label>
            <textarea className="input h-16 resize-none" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary text-sm flex items-center gap-1">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Save
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
      ) : vitals.length === 0 ? (
        <div className="empty-state"><Activity size={28} className="empty-state-icon" /><span className="empty-state-text">No vitals recorded yet</span></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="table-wrapper rounded-none">
            <table className="table">
              <thead><tr>
                <th className="th">Time</th><th className="th">BP</th><th className="th">Pulse</th>
                <th className="th">Temp</th><th className="th">SpO₂</th><th className="th">RR</th><th className="th">By</th>
              </tr></thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {vitals.map(v => (
                  <tr key={v.id} className="tr-hover">
                    <td className="td text-xs text-gray-500">{fmt(v.recorded_at || v.created_at)}</td>
                    <td className="td font-medium">{v.bp || v.blood_pressure || '—'}</td>
                    <td className="td">{v.pulse || '—'}</td>
                    <td className="td">{v.temp || v.temperature || '—'}</td>
                    <td className="td">{v.spo2 || '—'}</td>
                    <td className="td">{v.rr || v.respiratory_rate || '—'}</td>
                    <td className="td text-xs text-gray-500">{v.nurse?.full_name || v.recorded_by_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function NotesTab({ admissionId }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [type, setType] = useState('general')
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const { requestPin } = usePin()

  useEffect(() => {
    api.get(`/inpatient/admissions/${admissionId}/notes`)
      .then(d => setNotes(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [admissionId])

  const save = async () => {
    if (!text.trim()) return
    await requestPin('Add Nursing Note')
    setSaving(true)
    try {
      const r = await api.post(`/inpatient/admissions/${admissionId}/notes`, { note_text: text, note_type: type })
      setNotes(prev => [r, ...prev])
      setText('')
      setShowForm(false)
    } catch (e) {
      alert(e.message || 'Failed to save note')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(v => !v)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> Add Note
        </button>
      </div>
      {showForm && (
        <div className="card p-5">
          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-1">Note Type</label>
            <select className="input" value={type} onChange={e => setType(e.target.value)}>
              {['general','assessment','medication','procedure','observation','handoff'].map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <textarea className="input h-28 resize-none mb-3" placeholder="Enter nursing note…" value={text} onChange={e => setText(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary text-sm flex items-center gap-1">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Save
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
      ) : notes.length === 0 ? (
        <div className="empty-state"><FileText size={28} className="empty-state-icon" /><span className="empty-state-text">No notes yet</span></div>
      ) : (
        <div className="space-y-3">
          {notes.map(n => (
            <div key={n.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="badge-blue text-xs capitalize">{n.note_type || n.type || 'general'}</span>
                <span className="text-xs text-gray-400">{fmt(n.created_at)} · {n.nurse?.full_name || n.created_by_name || '—'}</span>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.note_text || n.content || n.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MARTab({ admissionId }) {
  const [meds, setMeds] = useState([])
  const [loading, setLoading] = useState(true)
  const { requestPin } = usePin()

  useEffect(() => {
    api.get(`/inpatient/admissions/${admissionId}/orders`)
      .then(d => setMeds(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [admissionId])

  const administer = async (med) => {
    await requestPin(`Administer ${med.drug_name}`)
    try {
      await api.post(`/inpatient/admissions/${admissionId}/mar`, { medication_order_id: med.id })
      alert(`${med.drug_name} marked as administered.`)
    } catch (e) {
      alert(e.message || 'Failed')
    }
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
  if (meds.length === 0) return <div className="empty-state"><Pill size={28} className="empty-state-icon" /><span className="empty-state-text">No active medication orders</span></div>

  return (
    <div className="space-y-3">
      {meds.filter(m => !m.is_discontinued).map(m => (
        <div key={m.id} className="card p-4 flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-800">{m.drug_name}</span>
              {m.is_stat && <span className="badge-red text-xs">STAT</span>}
              {m.is_prn && <span className="badge text-xs">PRN</span>}
            </div>
            <div className="text-xs text-gray-500">
              {[m.dose, m.route, m.frequency].filter(Boolean).join(' · ')}
              {m.duration_days ? ` · ${m.duration_days} days` : ''}
            </div>
            {m.special_instructions && <p className="text-xs text-amber-700 mt-1 bg-amber-50 px-2 py-1 rounded">{m.special_instructions}</p>}
          </div>
          <button onClick={() => administer(m)} className="btn-primary text-xs whitespace-nowrap flex items-center gap-1">
            <CheckCircle2 size={13} /> Administer
          </button>
        </div>
      ))}
    </div>
  )
}

const TYPE_META = {
  lab:       { icon: FlaskConical,   label: 'Lab',       color: 'text-blue-600' },
  imaging:   { icon: Activity,       label: 'Imaging',   color: 'text-purple-600' },
  procedure: { icon: Stethoscope,    label: 'Procedure', color: 'text-orange-600' },
  diet:      { icon: Utensils,       label: 'Diet',      color: 'text-green-600' },
  activity:  { icon: PersonStanding, label: 'Activity',  color: 'text-teal-600' },
  nursing:   { icon: Bell,           label: 'Nursing',   color: 'text-pink-600' },
  consult:   { icon: Stethoscope,    label: 'Consult',   color: 'text-indigo-600' },
}

function OrdersTab({ admissionId }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get(`/inpatient/admissions/${admissionId}/clinical-orders`)
      .then(d => setOrders(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [admissionId])

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-gray-400" /></div>

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => navigate('/orders')} className="btn-secondary text-sm flex items-center gap-2">
          <ClipboardList size={14} /> Manage Orders
        </button>
      </div>
      {orders.length === 0 ? (
        <div className="empty-state"><ClipboardList size={28} className="empty-state-icon" /><span className="empty-state-text">No clinical orders</span></div>
      ) : orders.map(o => {
        const meta = TYPE_META[o.order_type] || TYPE_META.nursing
        const Icon = meta.icon
        return (
          <div key={o.id} className="card p-4">
            <div className="flex items-start gap-3">
              <Icon size={18} className={meta.color} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-gray-800 text-sm">{o.order_detail}</span>
                  {o.priority === 'stat' && <span className="badge-red text-xs">STAT</span>}
                </div>
                <div className="text-xs text-gray-500 capitalize">{meta.label} · {o.status}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const ASSESSMENT_LINKS = [
  { label: 'Braden Scale (Pressure Ulcer Risk)', href: '/assessments?form=braden' },
  { label: 'GCS (Glasgow Coma Scale)', href: '/assessments?form=gcs' },
  { label: 'Pain Assessment', href: '/assessments?form=pain' },
  { label: 'Morse Fall Scale', href: '/assessments?form=morse' },
  { label: 'I/O Chart', href: '/assessments?form=io' },
  { label: 'Wound Care', href: '/assessments?form=wound' },
  { label: 'Restraint Assessment', href: '/assessments?form=restraint' },
]

function AssessmentsTab() {
  const navigate = useNavigate()
  return (
    <div className="space-y-2">
      {ASSESSMENT_LINKS.map(a => (
        <button
          key={a.href}
          onClick={() => navigate(a.href)}
          className="w-full card p-4 text-left flex items-center justify-between hover:border-emerald-200 hover:bg-emerald-50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <Clipboard size={16} className="text-emerald-600" />
            <span className="text-sm font-medium text-gray-800 group-hover:text-emerald-700">{a.label}</span>
          </div>
          <ChevronDown size={14} className="text-gray-400 -rotate-90" />
        </button>
      ))}
    </div>
  )
}

function RoundsTab({ admissionId }) {
  const [rounds, setRounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ findings: '', plan: '', next_round: '' })
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const { requestPin } = usePin()

  useEffect(() => {
    api.get(`/inpatient/admissions/${admissionId}/ward-rounds`)
      .then(d => setRounds(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [admissionId])

  const save = async () => {
    if (!form.findings.trim()) return
    await requestPin('Record Ward Round')
    setSaving(true)
    try {
      const r = await api.post(`/inpatient/admissions/${admissionId}/ward-rounds`, form)
      setRounds(prev => [r, ...prev])
      setForm({ findings: '', plan: '', next_round: '' })
      setShowForm(false)
    } catch (e) {
      alert(e.message || 'Failed')
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(v => !v)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> Add Round Note
        </button>
      </div>
      {showForm && (
        <div className="card p-5">
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Findings</label>
              <textarea className="input h-20 resize-none" placeholder="Clinical findings…" value={form.findings} onChange={e => setForm(f => ({ ...f, findings: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Plan</label>
              <textarea className="input h-20 resize-none" placeholder="Management plan…" value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Next Round (optional)</label>
              <input type="datetime-local" className="input" value={form.next_round} onChange={e => setForm(f => ({ ...f, next_round: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary text-sm flex items-center gap-1">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Save
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
      ) : rounds.length === 0 ? (
        <div className="empty-state"><Stethoscope size={28} className="empty-state-icon" /><span className="empty-state-text">No ward rounds recorded</span></div>
      ) : (
        <div className="space-y-3">
          {rounds.map(r => (
            <div key={r.id} className="card p-4">
              <div className="text-xs text-gray-400 mb-2">{fmt(r.round_time || r.created_at)} · {r.doctor?.full_name || r.nurse?.full_name || r.recorded_by_name || '—'}</div>
              {r.findings && <p className="text-sm text-gray-800 mb-1"><span className="font-medium text-gray-600">Findings: </span>{r.findings}</p>}
              {r.plan && <p className="text-sm text-gray-800"><span className="font-medium text-gray-600">Plan: </span>{r.plan}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AdmissionChart() {
  const { admissionId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [admission, setAdmission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    api.get(`/inpatient/admissions/${admissionId}`)
      .then(d => setAdmission(d))
      .catch(e => setError(e.message || 'Failed to load admission'))
      .finally(() => setLoading(false))
  }, [admissionId])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={32} className="animate-spin text-gray-400" />
    </div>
  )

  if (error) return (
    <div className="p-6 text-center">
      <AlertCircle size={32} className="text-red-400 mx-auto mb-2" />
      <p className="text-red-600 text-sm">{error}</p>
    </div>
  )

  const pt = admission?.patient || {}
  const name = pt.full_name || admission?.patient_name || 'Patient'
  const admNo = admission?.admission_number || `#${admissionId}`
  const ward = admission?.ward?.name || admission?.ward_name || '—'
  const bed = admission?.bed?.bed_number || admission?.bed_number || '—'

  return (
    <div>
      <div className="page-header items-start">
        <div className="flex items-start gap-4 w-full">
          <button onClick={() => navigate(-1)} className="mt-1 p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="page-title">{name}</h1>
              <span className="badge text-xs">{admNo}</span>
              {admission?.status === 'active' && <span className="badge-green text-xs">Active</span>}
            </div>
            <div className="text-sm text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1"><BedDouble size={13} /> {ward} / Bed {bed}</span>
              {pt.gender && <span className="capitalize">{pt.gender}</span>}
              {pt.age && <span>{pt.age} yrs</span>}
              {admission?.diagnosis && <span className="truncate max-w-xs">{admission.diagnosis}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        {activeTab === 'overview'    && <OverviewTab admission={admission} />}
        {activeTab === 'vitals'      && <VitalsTab admissionId={admissionId} />}
        {activeTab === 'notes'       && <NotesTab admissionId={admissionId} />}
        {activeTab === 'mar'         && <MARTab admissionId={admissionId} />}
        {activeTab === 'orders'      && <OrdersTab admissionId={admissionId} />}
        {activeTab === 'assessments' && <AssessmentsTab />}
        {activeTab === 'rounds'      && <RoundsTab admissionId={admissionId} />}
      </div>
    </div>
  )
}
