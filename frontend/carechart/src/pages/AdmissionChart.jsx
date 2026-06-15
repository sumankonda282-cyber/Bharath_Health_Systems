import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { usePin } from '../contexts/PinContext'
import { useAuth } from '../contexts/AuthContext'
import {
  ArrowLeft, Activity, FileText, Stethoscope, ClipboardList, Pill,
  Plus, Loader2, AlertCircle, Clock, User, BedDouble, Calendar,
  CheckCircle2, Clipboard, Heart, Thermometer, Droplets, Wind,
  FlaskConical, Utensils, Bell, ChevronRight, RefreshCw, AlertTriangle,
  BookOpen, X, Mic, MicOff, TrendingUp, TrendingDown, Minus,
  Home, Printer, UserCheck, Zap, Activity as ActivityIcon,
  Shield, ClipboardCheck
} from 'lucide-react'

function timeAgo(d) {
  if (!d) return null
  const m = (Date.now() - new Date(d).getTime()) / 60000
  if (m < 60) return `${Math.round(m)}m ago`
  if (m < 1440) return `${Math.round(m / 60)}h ago`
  return `${Math.round(m / 1440)}d ago`
}

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getShift() {
  const h = new Date().getHours()
  if (h >= 6 && h < 14) return 'Morning'
  if (h >= 14 && h < 22) return 'Afternoon'
  return 'Night'
}

function calcNEWS2(v) {
  if (!v) return null
  let s = 0
  const rr = v.rr || v.respiration_rate
  if (rr != null) { if (rr <= 8) s += 3; else if (rr <= 11) s += 1; else if (rr <= 20) s += 0; else if (rr <= 24) s += 2; else s += 3 }
  const spo2 = v.spo2
  if (spo2 != null) { if (spo2 <= 91) s += 3; else if (spo2 <= 93) s += 2; else if (spo2 <= 95) s += 1 }
  const sbp = v.bp_systolic || (v.bp ? parseInt(v.bp) : null)
  if (sbp != null) { if (sbp <= 90) s += 3; else if (sbp <= 100) s += 2; else if (sbp <= 110) s += 1; else if (sbp >= 220) s += 3 }
  const p = v.pulse
  if (p != null) { if (p <= 40) s += 3; else if (p <= 50) s += 1; else if (p >= 91 && p <= 110) s += 1; else if (p >= 111 && p <= 130) s += 2; else if (p > 130) s += 3 }
  const t = v.temp || v.temperature
  if (t != null) { if (t <= 35.0) s += 3; else if (t <= 36.0) s += 1; else if (t <= 38.0) s += 0; else if (t <= 39.0) s += 1; else s += 2 }
  return s
}

function news2Style(score) {
  if (score === null || score === undefined) return { cls: 'badge-gray', label: 'NEWS2: —' }
  if (score === 0) return { cls: 'news2-low', label: `NEWS2: ${score} · Low` }
  if (score <= 4) return { cls: 'news2-low-med', label: `NEWS2: ${score} · Low-Med` }
  if (score <= 6) return { cls: 'news2-med', label: `NEWS2: ${score} · Medium` }
  return { cls: 'news2-high', label: `NEWS2: ${score} · HIGH` }
}

const RANGES = {
  temperature: [36.1, 38.0], temp: [36.1, 38.0],
  pulse: [60, 100],
  bp_systolic: [90, 140], bp: [90, 140],
  spo2: [95, 100],
  rr: [12, 20], respiration_rate: [12, 20],
}

function isAbnormal(key, val) {
  const r = RANGES[key]; if (!r || val == null) return false
  return val < r[0] || val > r[1]
}

function trend(vals) {
  if (!vals || vals.length < 2) return null
  const diff = vals[0] - vals[1]
  if (diff > 2) return 'up'
  if (diff < -2) return 'down'
  return 'stable'
}

function TrendIcon({ dir }) {
  if (dir === 'up') return <TrendingUp size={12} className="text-red-500" />
  if (dir === 'down') return <TrendingDown size={12} className="text-blue-500" />
  return <Minus size={12} className="text-gray-400" />
}

const TABS = [
  { key: 'overview',    label: 'Overview',      icon: User },
  { key: 'vitals',      label: 'Vitals',        icon: Activity },
  { key: 'notes',       label: 'Nursing Notes', icon: FileText },
  { key: 'mar',         label: 'MAR',           icon: Pill },
  { key: 'orders',      label: 'Orders',        icon: ClipboardList },
  { key: 'assessments', label: 'Assessments',   icon: Clipboard },
  { key: 'rounds',      label: 'Ward Rounds',   icon: Stethoscope },
  { key: 'discharge',   label: 'Discharge',     icon: Home },
]

function OverviewTab({ admission, navigate }) {
  const pt = admission?.patient || {}
  const ward = admission?.ward?.name || admission?.ward_name || '—'
  const bed = admission?.bed?.bed_number || admission?.bed_number || '—'
  const doctor = admission?.doctor?.full_name || admission?.doctor_name || '—'
  const allergies = admission?.allergies || pt?.allergies || []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3 space-y-4">
        <div className="card p-4">
          <div className="section-header mt-0">Patient Demographics</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {[
              ['Full Name', pt.full_name || admission?.patient_name || '—'],
              ['Date of Birth', fmtDate(pt.dob || pt.date_of_birth)],
              ['Gender', pt.gender ? pt.gender.charAt(0).toUpperCase() + pt.gender.slice(1) : '—'],
              ['Age', pt.age ? `${pt.age} years` : '—'],
              ['Blood Group', pt.blood_group || pt.blood_type || '—'],
              ['Phone', pt.phone || pt.mobile || '—'],
              ['MRN', pt.patient_id || pt.mrn || '—'],
              ['Address', pt.address || '—'],
              ['Emergency Contact', pt.emergency_contact || '—'],
              ['Emergency Phone', pt.emergency_phone || '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="label">{label}</div>
                <div className="text-sm font-medium text-gray-800">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <div className="section-header mt-0">Admission Information</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {[
              ['Admission #', admission?.admission_number || `#${admission?.id}`],
              ['Admitted On', fmtDate(admission?.admission_date || admission?.created_at)],
              ['Ward / Bed', `${ward} · Bed ${bed}`],
              ['Admission Type', admission?.admission_type || '—'],
              ['Attending Doctor', doctor],
              ['Expected Discharge', fmtDate(admission?.expected_discharge)],
              ['Primary Diagnosis', admission?.diagnosis || admission?.primary_diagnosis || '—'],
              ['ICD-10', admission?.icd10 || '—'],
              ['Status', admission?.status?.toUpperCase() || '—'],
              ['Admitting Notes', admission?.admission_notes || '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="label">{label}</div>
                <div className="text-sm font-medium text-gray-800">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {allergies.length > 0 && (
          <div className="card p-4 border-red-100">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={15} className="text-red-600" />
              <span className="font-semibold text-red-700 text-sm">Known Allergies</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {allergies.map((a, i) => {
                const name = typeof a === 'string' ? a : a.allergen || a.name || String(a)
                const severity = typeof a === 'object' ? a.severity : null
                return (
                  <span key={i} className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                    severity === 'life-threatening' ? 'bg-red-100 border-red-400 text-red-800' :
                    severity === 'severe' ? 'bg-red-50 border-red-300 text-red-700' :
                    'bg-orange-50 border-orange-200 text-orange-700'
                  }`}>
                    ⚠ {name}{severity ? ` (${severity})` : ''}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-2 space-y-3">
        <div className="card p-4">
          <div className="section-header mt-0">Quick Actions</div>
          <div className="space-y-2">
            <button onClick={() => navigate('', { state: { tab: 'vitals' } })} className="w-full btn-secondary text-xs justify-start gap-2"><Activity size={13} />Record Vitals</button>
            <button onClick={() => navigate('', { state: { tab: 'notes' } })} className="w-full btn-secondary text-xs justify-start gap-2"><FileText size={13} />Add Nursing Note</button>
            <button onClick={() => navigate('', { state: { tab: 'mar' } })} className="w-full btn-secondary text-xs justify-start gap-2"><Pill size={13} />Open MAR</button>
            <button onClick={() => navigate('', { state: { tab: 'assessments' } })} className="w-full btn-secondary text-xs justify-start gap-2"><ClipboardCheck size={13} />Run Assessment</button>
          </div>
        </div>

        <div className="card p-4">
          <div className="section-header mt-0 flex items-center justify-between">
            <span>Active Problems</span>
          </div>
          {(admission?.diagnoses || []).length > 0
            ? (admission.diagnoses.map((d, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                  <span className="text-sm text-gray-800">{d.name || d}</span>
                  {d.code && <span className="badge-gray ml-auto text-xs">{d.code}</span>}
                </div>
              )))
            : <p className="text-xs text-gray-400">No diagnoses listed</p>
          }
        </div>
      </div>
    </div>
  )
}

function VitalsTab({ admissionId }) {
  const [vitals, setVitals] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ bp: '', pulse: '', temp: '', spo2: '', rr: '', weight: '', pain_score: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const { requestPin } = usePin()

  useEffect(() => {
    api.get(`/inpatient/admissions/${admissionId}/vitals`)
      .then(d => setVitals(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [admissionId])

  const latest = vitals[0]
  const news2 = calcNEWS2(latest)
  const news2Style_ = news2Style(news2)

  const save = async () => {
    await requestPin('Record Vitals')
    setSaving(true)
    try {
      const r = await api.post(`/inpatient/admissions/${admissionId}/vitals`, form)
      setVitals(prev => [r, ...prev])
      setForm({ bp: '', pulse: '', temp: '', spo2: '', rr: '', weight: '', pain_score: '', notes: '' })
    } catch (e) { alert(e.message || 'Failed') }
    finally { setSaving(false) }
  }

  const FIELDS = [
    { key: 'bp', label: 'BP (mmHg)', placeholder: '120/80' },
    { key: 'pulse', label: 'Pulse (bpm)', placeholder: '72' },
    { key: 'temp', label: 'Temp (°C)', placeholder: '37.0' },
    { key: 'spo2', label: 'SpO₂ (%)', placeholder: '98' },
    { key: 'rr', label: 'Resp Rate /min', placeholder: '18' },
    { key: 'weight', label: 'Weight (kg)', placeholder: '70' },
    { key: 'pain_score', label: 'Pain (0–10)', placeholder: '0' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        {news2 !== null && news2 >= 5 && (
          <div className={`flex items-center gap-3 p-3 rounded-xl border ${news2 >= 7 ? 'bg-red-50 border-red-300' : 'bg-orange-50 border-orange-300'}`}>
            <AlertTriangle size={18} className={news2 >= 7 ? 'text-red-600' : 'text-orange-600'} />
            <div>
              <div className={`font-semibold text-sm ${news2 >= 7 ? 'text-red-700' : 'text-orange-700'}`}>NEWS2 Score: {news2} — {news2 >= 7 ? 'HIGH RISK — Notify Attending' : 'Medium Risk — Increase Monitoring'}</div>
              <div className="text-xs text-gray-600">Based on most recent vitals</div>
            </div>
          </div>
        )}

        {latest && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-800">Latest Vitals</span>
              <div className="flex items-center gap-2">
                <span className={news2Style_.cls}>{news2Style_.label}</span>
                <span className="text-xs text-gray-400">{timeAgo(latest.recorded_at || latest.created_at)}</span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'BP', val: latest.bp || latest.blood_pressure, key: 'bp_systolic', unit: '' },
                { label: 'Pulse', val: latest.pulse, key: 'pulse', unit: 'bpm' },
                { label: 'Temp', val: latest.temp || latest.temperature, key: 'temp', unit: '°C' },
                { label: 'SpO₂', val: latest.spo2, key: 'spo2', unit: '%' },
                { label: 'RR', val: latest.rr || latest.respiration_rate, key: 'rr', unit: '/min' },
                { label: 'Weight', val: latest.weight, key: 'weight', unit: 'kg' },
                { label: 'Pain', val: latest.pain_score, key: 'pain', unit: '/10' },
              ].filter(x => x.val != null).map(({ label, val, key, unit }) => {
                const abnorm = isAbnormal(key, parseFloat(val))
                return (
                  <div key={label} className={`p-2 rounded-lg text-center ${abnorm ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                    <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                    <div className={`text-sm font-bold ${abnorm ? 'text-red-600' : 'text-gray-800'}`}>{val}{unit}</div>
                    {abnorm && <div className="text-xs text-red-500">Abnormal</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
        ) : vitals.length === 0 ? (
          <div className="empty-state"><Activity size={28} className="empty-state-icon" /><span className="empty-state-text">No vitals recorded yet</span></div>
        ) : (
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">Vitals History</span>
              <span className="badge-gray">{vitals.length} entries</span>
            </div>
            <div className="table-wrapper rounded-none border-0">
              <table className="table">
                <thead>
                  <tr>
                    <th className="th">Time</th>
                    <th className="th">BP</th>
                    <th className="th">Pulse</th>
                    <th className="th">Temp</th>
                    <th className="th">SpO₂</th>
                    <th className="th">RR</th>
                    <th className="th">Pain</th>
                    <th className="th">NEWS2</th>
                    <th className="th">By</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {vitals.map((v, i) => {
                    const n2 = calcNEWS2(v)
                    const n2s = news2Style(n2)
                    return (
                      <tr key={v.id} className="tr-hover">
                        <td className="td text-xs text-gray-500 whitespace-nowrap">{fmt(v.recorded_at || v.created_at)}</td>
                        <td className={isAbnormal('bp_systolic', v.bp_systolic) ? 'td-abnormal' : 'td font-medium'}>{v.bp || v.blood_pressure || '—'}</td>
                        <td className={isAbnormal('pulse', v.pulse) ? 'td-abnormal' : 'td'}>{v.pulse ? `${v.pulse}` : '—'}</td>
                        <td className={isAbnormal('temp', v.temp || v.temperature) ? 'td-abnormal' : 'td'}>{v.temp || v.temperature ? `${v.temp || v.temperature}°` : '—'}</td>
                        <td className={isAbnormal('spo2', v.spo2) ? 'td-abnormal' : 'td'}>{v.spo2 ? `${v.spo2}%` : '—'}</td>
                        <td className={isAbnormal('rr', v.rr) ? 'td-abnormal' : 'td'}>{v.rr || v.respiration_rate || '—'}</td>
                        <td className="td">{v.pain_score != null ? `${v.pain_score}/10` : '—'}</td>
                        <td className="td"><span className={n2s.cls}>{n2 ?? '—'}</span></td>
                        <td className="td text-xs text-gray-500">{v.nurse?.full_name || v.recorded_by_name || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="card p-4 sticky top-20">
          <div className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Plus size={15} className="text-emerald-600" />New Vitals Entry
          </div>
          <div className="space-y-3">
            {FIELDS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input className="input" placeholder={placeholder} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label className="label">Notes</label>
              <textarea className="input h-16 resize-none" placeholder="Clinical notes…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <button onClick={save} disabled={saving} className="w-full btn-primary">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Save & Sign Vitals
            </button>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Normal Ranges</div>
            <div className="space-y-1 text-xs text-gray-500">
              <div>BP: 90–140 / 60–90 mmHg</div>
              <div>Pulse: 60–100 bpm</div>
              <div>Temp: 36.1–38.0 °C</div>
              <div>SpO₂: ≥95%</div>
              <div>RR: 12–20 /min</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function NotesTab({ admissionId }) {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [text, setText] = useState('')
  const [type, setType] = useState('general')
  const [saving, setSaving] = useState(false)
  const [listening, setListening] = useState(false)
  const srRef = useRef(null)
  const { requestPin } = usePin()

  useEffect(() => {
    api.get(`/inpatient/admissions/${admissionId}/notes`)
      .then(d => setNotes(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [admissionId])

  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice dictation requires Chrome or Edge.'); return }
    if (listening) { srRef.current?.stop(); setListening(false); return }
    const sr = new SR()
    sr.continuous = true; sr.interimResults = false; sr.lang = 'en-IN'
    sr.onresult = e => {
      const t = Array.from(e.results).map(r => r[0].transcript).join(' ')
      setText(prev => prev + (prev ? ' ' : '') + t)
    }
    sr.onend = () => setListening(false)
    sr.start(); srRef.current = sr; setListening(true)
  }

  const save = async () => {
    if (!text.trim()) return
    await requestPin('Add Nursing Note')
    setSaving(true)
    try {
      const r = await api.post(`/inpatient/admissions/${admissionId}/notes`, { note_text: text, note_type: type, shift: getShift() })
      setNotes(prev => [r, ...prev])
      setText('')
    } catch (e) { alert(e.message || 'Failed') }
    finally { setSaving(false) }
  }

  const NOTE_TYPES = ['general', 'assessment', 'medication', 'procedure', 'observation', 'incident', 'handoff']
  const FILTERS = ['all', ...NOTE_TYPES]
  const filtered = filter === 'all' ? notes : notes.filter(n => (n.note_type || n.type) === filter)
  const h = new Date().getHours()
  const shiftChanging = h === 6 || h === 14 || h === 22

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3 space-y-3">
        {shiftChanging && (
          <div className="alert-amber"><Bell size={14} />Shift change time — consider writing a Shift Handoff note.</div>
        )}
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filter === f ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><FileText size={28} className="empty-state-icon" /><span className="empty-state-text">No notes in this category</span></div>
        ) : (
          <div className="space-y-2">
            {filtered.map(n => (
              <div key={n.id} className="card p-3.5">
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="badge-blue capitalize">{n.note_type || n.type || 'general'}</span>
                    {n.shift && <span className="badge-gray">{n.shift} Shift</span>}
                    {!n.signed_at && <span className="badge-yellow">UNSIGNED DRAFT</span>}
                  </div>
                  <span className="text-xs text-gray-400">{fmt(n.created_at)} · {n.nurse?.full_name || n.created_by_name || '—'}</span>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{n.note_text || n.content || n.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="lg:col-span-2">
        <div className="card p-4 sticky top-20">
          <div className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <FileText size={14} className="text-emerald-600" />New Nursing Note
          </div>
          <div className="mb-3">
            <label className="label">Note Type</label>
            <select className="input" value={type} onChange={e => setType(e.target.value)}>
              {NOTE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Note Content</label>
              <button onClick={toggleMic} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${listening ? 'bg-red-50 border-red-300 text-red-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                {listening ? <><MicOff size={11} />Stop</> : <><Mic size={11} />Dictate</>}
              </button>
            </div>
            <textarea
              className={`input h-36 resize-none ${listening ? 'border-red-300 ring-2 ring-red-200' : ''}`}
              placeholder="Enter nursing note or use voice dictation…"
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <div className="text-xs text-gray-400 text-right mt-0.5">{text.length} chars</div>
          </div>
          <div className="text-xs text-gray-500 mb-3">{getShift()} Shift · {new Date().toLocaleDateString('en-IN')}</div>
          <button onClick={save} disabled={saving || !text.trim()} className="w-full btn-primary">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}Save & Sign Note
          </button>
        </div>
      </div>
    </div>
  )
}

function MARTab({ admissionId, admission }) {
  const [meds, setMeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [holdModal, setHoldModal] = useState(null)
  const [holdReason, setHoldReason] = useState('')
  const { requestPin } = usePin()
  const allergies = (admission?.allergies || admission?.patient?.allergies || []).map(a => (typeof a === 'string' ? a : a.allergen || a.name || '').toLowerCase())

  useEffect(() => {
    api.get(`/inpatient/admissions/${admissionId}/mar`)
      .then(d => setMeds(Array.isArray(d) ? d : (d.items || [])))
      .catch(() => api.get(`/inpatient/admissions/${admissionId}/orders`).then(d => setMeds(Array.isArray(d) ? d : [])).catch(() => {}))
      .finally(() => setLoading(false))
  }, [admissionId])

  const hasAllergyRisk = (med) => {
    const name = (med.drug_name || med.medication_name || '').toLowerCase()
    return allergies.some(a => a && name.includes(a.split(' ')[0]))
  }

  const administer = async (med) => {
    await requestPin(`Administer ${med.drug_name || med.medication_name}`)
    try {
      await api.post(`/inpatient/admissions/${admissionId}/mar`, { medication_order_id: med.id, status: 'given' })
      setMeds(prev => prev.map(m => m.id === med.id ? { ...m, status: 'given', last_given: new Date().toISOString() } : m))
    } catch (e) { alert(e.message || 'Failed') }
  }

  const holdMed = async () => {
    await requestPin(`Hold ${holdModal?.drug_name}`)
    try {
      await api.patch(`/inpatient/mar/${holdModal.id}`, { status: 'held', hold_reason: holdReason })
      setMeds(prev => prev.map(m => m.id === holdModal.id ? { ...m, status: 'held' } : m))
      setHoldModal(null); setHoldReason('')
    } catch (e) { alert(e.message || 'Failed') }
  }

  const STATUS_COLOR = { scheduled: 'badge-blue', given: 'badge-green', missed: 'badge-red', held: 'badge-orange', refused: 'badge-gray', discontinued: 'badge-gray' }

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
  if (meds.length === 0) return <div className="empty-state"><Pill size={28} className="empty-state-icon" /><span className="empty-state-text">No active medication orders</span></div>

  const groups = {
    'STAT Orders': meds.filter(m => m.is_stat && !m.is_discontinued),
    'Due Now / Overdue': meds.filter(m => !m.is_stat && !m.is_discontinued && m.status !== 'given' && m.status !== 'held'),
    'Given Today': meds.filter(m => m.status === 'given'),
    'Held / Discontinued': meds.filter(m => m.status === 'held' || m.is_discontinued),
    'PRN (As Needed)': meds.filter(m => m.is_prn && !m.is_discontinued),
  }

  return (
    <div className="space-y-5">
      {Object.entries(groups).map(([group, items]) => {
        if (!items.length) return null
        return (
          <div key={group}>
            <div className="section-header">{group}</div>
            <div className="space-y-2">
              {items.map(m => {
                const allergyRisk = hasAllergyRisk(m)
                return (
                  <div key={m.id} className={`card p-3.5 ${allergyRisk ? 'border-red-300' : ''}`}>
                    {allergyRisk && (
                      <div className="alert-red mb-2 py-1.5"><AlertTriangle size={13} />⚠ ALLERGY RISK — Cross-check before administering</div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-gray-900 text-sm">{m.drug_name || m.medication_name}</span>
                          {m.is_stat && <span className="badge-red">STAT</span>}
                          {m.is_prn && <span className="badge-gray">PRN</span>}
                          <span className={STATUS_COLOR[m.status] || 'badge-gray'}>{m.status || 'scheduled'}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {[m.dose, m.route, m.frequency].filter(Boolean).join(' · ')}
                          {m.duration_days ? ` · ${m.duration_days} days` : ''}
                        </div>
                        {m.special_instructions && <p className="text-xs text-amber-700 mt-1 bg-amber-50 px-2 py-1 rounded">{m.special_instructions}</p>}
                        {m.last_given && <div className="text-xs text-gray-400 mt-1">Last given: {timeAgo(m.last_given)}</div>}
                      </div>
                      {!m.is_discontinued && m.status !== 'given' && m.status !== 'held' && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => administer(m)} className="btn-success btn-sm">✓ Give</button>
                          <button onClick={() => setHoldModal(m)} className="btn-warn btn-sm">Hold</button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {holdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full mx-4">
            <div className="font-semibold text-gray-900 mb-1">Hold: {holdModal.drug_name}</div>
            <p className="text-xs text-gray-500 mb-3">Provide reason for holding this medication.</p>
            <textarea className="input h-20 resize-none mb-3" placeholder="Hold reason (e.g., patient NPO, hold for BP <100)…" value={holdReason} onChange={e => setHoldReason(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={holdMed} disabled={!holdReason.trim()} className="btn-warn btn-sm">Confirm Hold</button>
              <button onClick={() => { setHoldModal(null); setHoldReason('') }} className="btn-secondary btn-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const ORDER_ICONS = {
  lab: FlaskConical, imaging: ActivityIcon, procedure: Stethoscope,
  diet: Utensils, activity: BookOpen, nursing: Bell, consult: UserCheck,
}

function OrdersTab({ admissionId }) {
  const [subTab, setSubTab] = useState('clinical')
  const [clinical, setClinical] = useState([])
  const [medication, setMedication] = useState([])
  const [loading, setLoading] = useState(true)
  const { requestPin } = usePin()
  const { user } = useAuth()

  useEffect(() => {
    Promise.all([
      api.get(`/inpatient/admissions/${admissionId}/clinical-orders`).catch(() => []),
      api.get(`/inpatient/admissions/${admissionId}/orders`).catch(() => []),
    ]).then(([c, m]) => {
      setClinical(Array.isArray(c) ? c : [])
      setMedication(Array.isArray(m) ? m : [])
    }).finally(() => setLoading(false))
  }, [admissionId])

  const updateOrder = async (id, action) => {
    await requestPin(`${action} order`)
    try {
      await api.post(`/inpatient/clinical-orders/${id}/${action}`)
      setClinical(prev => prev.map(o => o.id === id ? { ...o, status: action === 'acknowledge' ? 'acknowledged' : action === 'start' ? 'in_progress' : action } : o))
    } catch (e) { alert(e.message) }
  }

  const PRIORITY = { stat: 'badge-red', urgent: 'badge-yellow', routine: 'badge-gray' }
  const STATUS = { pending: 'badge-yellow', acknowledged: 'badge-blue', in_progress: 'badge-blue', completed: 'badge-green', cancelled: 'badge-gray' }

  if (loading) return <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-gray-400" /></div>

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['clinical', 'medication'].map(t => (
          <button key={t} onClick={() => setSubTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${subTab === t ? 'bg-navy text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            style={subTab === t ? { backgroundColor: '#0F2557' } : {}}>
            {t === 'clinical' ? `Clinical Orders (${clinical.length})` : `Medication Orders (${medication.length})`}
          </button>
        ))}
      </div>

      {subTab === 'clinical' && (
        <div className="space-y-2">
          {clinical.filter(o => o.priority === 'stat').map(o => {
            const Icon = ORDER_ICONS[o.order_type] || Bell
            return (
              <div key={o.id} className="card p-3.5 border-red-200 bg-red-50/50">
                <div className="flex items-start gap-3">
                  <Icon size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-sm text-gray-900">{o.order_detail}</span>
                      <span className="badge-red">STAT</span>
                      <span className={STATUS[o.status] || 'badge-gray'}>{o.status}</span>
                    </div>
                    <div className="text-xs text-gray-500">{o.order_type} · {fmt(o.created_at)} · {o.doctor?.full_name || o.ordered_by_name || '—'}</div>
                  </div>
                  <div className="flex gap-1">
                    {o.status === 'pending' && <button onClick={() => updateOrder(o.id, 'acknowledge')} className="btn-primary btn-sm">Acknowledge</button>}
                    {o.status === 'acknowledged' && <button onClick={() => updateOrder(o.id, 'start')} className="btn-navy btn-sm">Start</button>}
                    {o.status === 'in_progress' && <button onClick={() => updateOrder(o.id, 'complete')} className="btn-success btn-sm">Complete</button>}
                  </div>
                </div>
              </div>
            )
          })}
          {clinical.filter(o => o.priority !== 'stat').map(o => {
            const Icon = ORDER_ICONS[o.order_type] || Bell
            return (
              <div key={o.id} className="card p-3.5">
                <div className="flex items-start gap-3">
                  <Icon size={15} className="text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-medium text-sm text-gray-900">{o.order_detail}</span>
                      <span className={PRIORITY[o.priority] || 'badge-gray'}>{o.priority}</span>
                      <span className={STATUS[o.status] || 'badge-gray'}>{o.status}</span>
                    </div>
                    <div className="text-xs text-gray-500">{o.order_type} · {fmt(o.created_at)} · {o.doctor?.full_name || '—'}</div>
                  </div>
                  <div className="flex gap-1">
                    {o.status === 'pending' && <button onClick={() => updateOrder(o.id, 'acknowledge')} className="btn-secondary btn-sm">Acknowledge</button>}
                    {o.status === 'acknowledged' && <button onClick={() => updateOrder(o.id, 'start')} className="btn-secondary btn-sm">Start</button>}
                    {o.status === 'in_progress' && <button onClick={() => updateOrder(o.id, 'complete')} className="btn-success btn-sm">Complete</button>}
                  </div>
                </div>
              </div>
            )
          })}
          {clinical.length === 0 && <div className="empty-state"><ClipboardList size={28} className="empty-state-icon" /><span className="empty-state-text">No clinical orders</span></div>}
        </div>
      )}

      {subTab === 'medication' && (
        <div className="space-y-2">
          {medication.filter(m => !m.is_discontinued).map(m => (
            <div key={m.id} className="card p-3.5">
              <div className="flex items-start gap-3">
                <Pill size={15} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-medium text-sm text-gray-900">{m.drug_name || m.medication_name}</span>
                    {m.is_stat && <span className="badge-red">STAT</span>}
                    {m.is_prn && <span className="badge-gray">PRN</span>}
                  </div>
                  <div className="text-xs text-gray-500">{[m.dose, m.route, m.frequency].filter(Boolean).join(' · ')}</div>
                  {m.special_instructions && <p className="text-xs text-amber-700 mt-1">{m.special_instructions}</p>}
                </div>
              </div>
            </div>
          ))}
          {medication.length === 0 && <div className="empty-state"><Pill size={28} className="empty-state-icon" /><span className="empty-state-text">No medication orders</span></div>}
        </div>
      )}
    </div>
  )
}

const QUICK_ASSESSMENTS = [
  { id: 'braden', name: 'Braden Scale', icon: Shield, color: '#d97706', desc: 'Pressure ulcer risk' },
  { id: 'morse', name: 'Morse Fall Scale', icon: AlertTriangle, color: '#dc2626', desc: 'Fall risk' },
  { id: 'gcs', name: 'Glasgow Coma Scale', icon: Zap, color: '#7c3aed', desc: 'Consciousness' },
  { id: 'pain', name: 'Pain Assessment', icon: Thermometer, color: '#dc2626', desc: 'NRS 0–10' },
  { id: 'io', name: 'I/O Chart', icon: Droplets, color: '#0284c7', desc: 'Fluid balance' },
  { id: 'wound', name: 'Wound Care', icon: ClipboardCheck, color: '#16a34a', desc: 'Wound staging' },
  { id: 'rass', name: 'RASS Sedation', icon: ActivityIcon, color: '#6d28d9', desc: 'Sedation scale' },
  { id: 'cam', name: 'CAM Delirium', icon: Bell, color: '#4338ca', desc: 'Delirium screen' },
  { id: 'nutritional', name: 'MUST Nutrition', icon: Utensils, color: '#d97706', desc: 'Nutritional screening' },
  { id: 'restraint', name: 'Restraint Check', icon: Shield, color: '#7c3aed', desc: 'Restraint assessment' },
  { id: 'shift_assessment', name: 'Shift Assessment', icon: ClipboardCheck, color: '#0891b2', desc: 'Head-to-toe' },
  { id: 'skin_bundle', name: 'Skin Bundle', icon: ClipboardCheck, color: '#0284c7', desc: 'Skin integrity' },
]

const SUGGESTION_RULES = [
  { match: d => /pneumonia|respiratory|COPD|asthma/i.test(d), suggest: ['gcs','pain','braden'], reason: 'Respiratory protocol' },
  { match: d => /stroke|CVA|TIA/i.test(d), suggest: ['gcs','braden'], reason: 'Stroke bundle' },
  { match: d => /sepsis|infection/i.test(d), suggest: ['cam','rass','io'], reason: 'Sepsis bundle' },
  { match: d => /fracture|surgery|post.?op/i.test(d), suggest: ['pain','morse','wound'], reason: 'Post-surgical protocol' },
]

function AssessmentsTab({ admissionId, admission }) {
  const navigate = useNavigate()
  const [history, setHistory] = useState({})
  const diag = admission?.diagnosis || admission?.primary_diagnosis || ''
  const suggestions = SUGGESTION_RULES.filter(r => r.match(diag)).flatMap(r => r.suggest.map(id => ({ id, reason: r.reason }))).filter((s, i, a) => a.findIndex(x => x.id === s.id) === i)

  useEffect(() => {
    api.get(`/inpatient/admissions/${admissionId}/notes?note_type=assessment`)
      .then(d => {
        const arr = Array.isArray(d) ? d : []
        const map = {}
        arr.forEach(n => { try { const p = JSON.parse(n.note_text); const k = (p.type || '').toLowerCase(); if (!map[k]) map[k] = n } catch {} })
        setHistory(map)
      }).catch(() => {})
  }, [admissionId])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <div className="section-header mt-0">All Assessments</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {QUICK_ASSESSMENTS.map(a => {
            const Icon = a.icon
            const last = history[a.id]
            const h = last ? (Date.now() - new Date(last.created_at).getTime()) / 3600000 : null
            const overdue = h !== null && h > 8
            return (
              <button key={a.id} onClick={() => navigate(`/assessments?form=${a.id}&admission=${admissionId}`)}
                className={`text-left p-3 rounded-xl border transition-all hover:shadow-md ${overdue ? 'border-red-200 bg-red-50/50' : 'bg-white border-gray-200 hover:border-emerald-200'}`}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: `${a.color}18` }}>
                  <Icon size={15} style={{ color: a.color }} />
                </div>
                <div className="font-semibold text-xs text-gray-800 leading-tight">{a.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{a.desc}</div>
                {last
                  ? <div className={`text-xs mt-1.5 font-medium ${overdue ? 'text-red-600' : 'text-green-600'}`}>{timeAgo(last.created_at)}{overdue ? ' · Overdue' : ''}</div>
                  : <div className="text-xs text-gray-400 mt-1.5">Never done</div>
                }
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className="card overflow-hidden sticky top-20">
          <div className="px-3 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
            <Zap size={14} className="text-amber-500" />
            <span className="text-sm font-semibold text-amber-800">Suggestions</span>
          </div>
          <div className="p-3">
            {suggestions.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No specific protocol suggestions</p>
            ) : suggestions.map((s, i) => {
              const a = QUICK_ASSESSMENTS.find(x => x.id === s.id)
              if (!a) return null
              const Icon = a.icon
              return (
                <div key={i} className="suggestion-card">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon size={12} style={{ color: a.color }} />
                    <span className="text-xs font-semibold text-gray-800">{a.name}</span>
                  </div>
                  <div className="text-xs text-amber-700 mb-2">{s.reason}</div>
                  <button onClick={() => navigate(`/assessments?form=${s.id}&admission=${admissionId}`)} className="w-full btn-accent btn-xs">Start Now</button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function RoundsTab({ admissionId }) {
  const [rounds, setRounds] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ subjective: '', objective: '', assessment: '', plan: '', next_round: '' })
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const { requestPin } = usePin()
  const { user } = useAuth()
  const canWrite = ['doctor', 'clinic_admin'].includes(user?.role)

  useEffect(() => {
    api.get(`/inpatient/admissions/${admissionId}/ward-rounds`)
      .then(d => setRounds(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [admissionId])

  const save = async () => {
    if (!form.assessment.trim() && !form.plan.trim()) return
    await requestPin('Record Ward Round')
    setSaving(true)
    try {
      const r = await api.post(`/inpatient/admissions/${admissionId}/ward-rounds`, form)
      setRounds(prev => [r, ...prev])
      setForm({ subjective: '', objective: '', assessment: '', plan: '', next_round: '' })
      setShowForm(false)
    } catch (e) { alert(e.message || 'Failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      {canWrite && (
        <div className="flex justify-end">
          <button onClick={() => setShowForm(v => !v)} className="btn-primary">
            <Plus size={14} />{showForm ? 'Cancel' : 'New Round Note'}
          </button>
        </div>
      )}

      {showForm && canWrite && (
        <div className="card p-4">
          <div className="text-sm font-semibold text-gray-800 mb-4">SOAP Round Note</div>
          <div className="space-y-3">
            {[
              { key: 'subjective', label: 'S — Subjective (Patient symptoms, complaints)', placeholder: 'Patient reports…' },
              { key: 'objective', label: 'O — Objective (Vitals, exam findings)', placeholder: 'BP 120/80, afebrile, lungs clear…' },
              { key: 'assessment', label: 'A — Assessment (Clinical impression)', placeholder: 'Improving / stable / deteriorating…' },
              { key: 'plan', label: 'P — Plan (Management plan)', placeholder: 'Continue antibiotics, repeat CXR tomorrow…' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="label font-semibold">{label}</label>
                <textarea className="input h-20 resize-none" placeholder={placeholder} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label className="label">Next Round (optional)</label>
              <input type="datetime-local" className="input" value={form.next_round} onChange={e => setForm(f => ({ ...f, next_round: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}Save & Sign Round
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => window.print()} className="btn-secondary ml-auto no-print"><Printer size={14} />Print</button>
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
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Stethoscope size={14} className="text-emerald-600" />
                  <span className="font-semibold text-sm text-gray-800">{r.doctor?.full_name || r.nurse?.full_name || r.recorded_by_name || 'Unknown'}</span>
                </div>
                <span className="text-xs text-gray-400">{fmt(r.round_time || r.created_at)}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[['S', r.subjective || r.soap_s], ['O', r.objective || r.soap_o || r.findings], ['A', r.assessment || r.soap_a], ['P', r.plan || r.soap_p]].map(([label, val]) => val ? (
                  <div key={label} className="bg-gray-50 rounded-lg p-2.5">
                    <div className="text-xs font-bold text-gray-400 mb-1">{label}</div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{val}</p>
                  </div>
                ) : null)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DischargeTab({ admissionId, admission }) {
  const [form, setForm] = useState({
    discharge_date: '', discharge_time: '', condition: '',
    discharge_diagnosis: admission?.diagnosis || '',
    follow_up: '', dietary: '', activity: '', return_precautions: '',
    medications_on_discharge: '', instructions: ''
  })
  const [saving, setSaving] = useState(false)
  const { requestPin } = usePin()
  const { user } = useAuth()
  const canWrite = ['doctor', 'clinic_admin', 'clinic_manager'].includes(user?.role)

  const save = async () => {
    await requestPin('Complete Discharge Summary')
    setSaving(true)
    try {
      await api.post(`/inpatient/admissions/${admissionId}/notes`, {
        note_type: 'discharge_summary',
        note_text: JSON.stringify({ type: 'DISCHARGE_SUMMARY', ...form }),
      })
      alert('Discharge summary saved.')
    } catch (e) { alert(e.message || 'Failed') }
    finally { setSaving(false) }
  }

  if (admission?.status === 'discharged') {
    return (
      <div className="card p-5">
        <div className="alert-green mb-4"><CheckCircle2 size={15} />Patient has been discharged on {fmtDate(admission?.discharge_date)}</div>
        <div className="text-sm text-gray-600">Discharge summary has been completed and signed.</div>
      </div>
    )
  }

  return (
    <div className="card p-5 max-w-2xl">
      <div className="text-sm font-semibold text-gray-800 mb-4">Discharge Summary</div>
      {!canWrite && <div className="alert-amber mb-4"><AlertTriangle size={14} />Only doctors and administrators can complete discharge summaries.</div>}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Discharge Date</label><input type="date" className="input" value={form.discharge_date} onChange={e => setForm(f => ({ ...f, discharge_date: e.target.value }))} disabled={!canWrite} /></div>
          <div><label className="label">Discharge Time</label><input type="time" className="input" value={form.discharge_time} onChange={e => setForm(f => ({ ...f, discharge_time: e.target.value }))} disabled={!canWrite} /></div>
        </div>
        <div>
          <label className="label">Patient Condition at Discharge</label>
          <select className="input" value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} disabled={!canWrite}>
            <option value="">Select condition…</option>
            {['Good', 'Fair', 'Poor', 'Against Medical Advice (AMA)', 'Transferred', 'Deceased'].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Discharge Diagnosis</label>
          <input className="input" value={form.discharge_diagnosis} onChange={e => setForm(f => ({ ...f, discharge_diagnosis: e.target.value }))} disabled={!canWrite} />
        </div>
        <div>
          <label className="label">Medications on Discharge</label>
          <textarea className="input h-20 resize-none" placeholder="List medications…" value={form.medications_on_discharge} onChange={e => setForm(f => ({ ...f, medications_on_discharge: e.target.value }))} disabled={!canWrite} />
        </div>
        <div>
          <label className="label">Follow-up Instructions</label>
          <textarea className="input h-20 resize-none" placeholder="Follow up with cardiologist in 1 week…" value={form.follow_up} onChange={e => setForm(f => ({ ...f, follow_up: e.target.value }))} disabled={!canWrite} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Dietary Instructions</label><textarea className="input h-16 resize-none" placeholder="Low sodium diet…" value={form.dietary} onChange={e => setForm(f => ({ ...f, dietary: e.target.value }))} disabled={!canWrite} /></div>
          <div><label className="label">Activity Restrictions</label><textarea className="input h-16 resize-none" placeholder="No heavy lifting for 6 weeks…" value={form.activity} onChange={e => setForm(f => ({ ...f, activity: e.target.value }))} disabled={!canWrite} /></div>
        </div>
        <div>
          <label className="label">Return Precautions (When to Return to ED)</label>
          <textarea className="input h-20 resize-none" placeholder="Return if fever >38.5°C, chest pain, shortness of breath…" value={form.return_precautions} onChange={e => setForm(f => ({ ...f, return_precautions: e.target.value }))} disabled={!canWrite} />
        </div>
        {canWrite && (
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}Save & Sign Discharge Summary
          </button>
        )}
      </div>
    </div>
  )
}

export default function AdmissionChart() {
  const { admissionId } = useParams()
  const navigate = useNavigate()
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
      <Loader2 size={28} className="animate-spin text-gray-400" />
    </div>
  )

  if (error) return (
    <div className="p-6 text-center">
      <AlertCircle size={32} className="text-red-400 mx-auto mb-2" />
      <p className="text-red-600 text-sm">{error}</p>
      <button onClick={() => navigate(-1)} className="btn-secondary mt-3">Go Back</button>
    </div>
  )

  const pt = admission?.patient || {}
  const name = pt.full_name || admission?.patient_name || 'Patient'
  const ward = admission?.ward?.name || admission?.ward_name || '—'
  const bed = admission?.bed?.bed_number || admission?.bed_number || '—'
  const doctor = admission?.doctor?.full_name || admission?.doctor_name || '—'
  const admNo = admission?.admission_number || `#${admissionId}`
  const allergies = admission?.allergies || pt?.allergies || []
  const diagText = admission?.diagnosis || admission?.primary_diagnosis || ''
  const icd10 = admission?.icd10 ? ` (${admission.icd10})` : ''
  const age = pt.age ? `${pt.age}y` : ''
  const gender = pt.gender ? pt.gender.charAt(0).toUpperCase() : ''

  return (
    <div>
      <div className="pt-header mb-0">
        <div className="px-4 py-2.5">
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 flex-shrink-0">
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              <h1 className="font-bold text-base" style={{ color: '#0F2557' }}>{name}</h1>
              {(gender || age) && <span className="text-xs text-gray-500">{[gender, age].filter(Boolean).join(' · ')}</span>}
              <span className="badge-gray text-xs">{admNo}</span>
              {admission?.status === 'active' && <span className="badge-green">Active</span>}
              {admission?.status === 'discharged' && <span className="badge-gray">Discharged</span>}
              {allergies.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
                  ⚠ {allergies.length} Allerg{allergies.length > 1 ? 'ies' : 'y'}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 flex-shrink-0">Dr. {doctor}</div>
          </div>
          <div className="flex items-center gap-4 mt-1 ml-9 flex-wrap text-xs text-gray-500">
            <span className="flex items-center gap-1"><BedDouble size={11} />{ward} · Bed {bed}</span>
            {diagText && <span className="truncate max-w-xs">{diagText}{icd10}</span>}
            <span className="flex items-center gap-1"><Calendar size={11} />Admitted {fmtDate(admission?.admission_date || admission?.created_at)}</span>
          </div>
        </div>

        <div className="tab-bar px-4">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={activeTab === tab.key ? 'tab-active' : 'tab-item'}>
                <Icon size={13} />{tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="p-4 md:p-5">
        {activeTab === 'overview'    && <OverviewTab admission={admission} navigate={navigate} />}
        {activeTab === 'vitals'      && <VitalsTab admissionId={admissionId} />}
        {activeTab === 'notes'       && <NotesTab admissionId={admissionId} />}
        {activeTab === 'mar'         && <MARTab admissionId={admissionId} admission={admission} />}
        {activeTab === 'orders'      && <OrdersTab admissionId={admissionId} />}
        {activeTab === 'assessments' && <AssessmentsTab admissionId={admissionId} admission={admission} />}
        {activeTab === 'rounds'      && <RoundsTab admissionId={admissionId} />}
        {activeTab === 'discharge'   && <DischargeTab admissionId={admissionId} admission={admission} />}
      </div>
    </div>
  )
}
