import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doctorApi } from '../../api'
import api from '../../api/client'
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Save, FlaskConical, Eye, CheckCircle, Video,
  FileText, Pill, Scan, Lock, Search, X, Plus,
  Trash2, AlertCircle, Clock, Stethoscope, LayoutDashboard
} from 'lucide-react'
import { PageLoader } from '../../components/ui/Spinner'

const BLUE = '#0F2557'
const BLUE_LIGHT = '#eff6ff'
const BLUE_BORDER = '#bfdbfe'

const NAV = [
  { key: 'dashboard',     label: 'Dashboard',     Icon: LayoutDashboard },
  { key: 'soap',          label: 'SOAP Notes',    Icon: FileText },
  { key: 'prescriptions', label: 'Prescriptions', Icon: Pill },
  { key: 'lab',           label: 'Lab Orders',    Icon: FlaskConical },
  { key: 'imaging',       label: 'Imaging',       Icon: Scan },
]

const STATUS_CFG = {
  pending:                { label: 'Waiting',                badge: 'badge-yellow' },
  confirmed:              { label: 'Confirmed',              badge: 'badge-blue' },
  in_progress:            { label: 'In Progress',            badge: 'badge-purple' },
  investigations_pending: { label: 'Investigations Pending', badge: 'badge-orange' },
  review_pending:         { label: 'Review Pending',         badge: 'badge-indigo' },
  completed:              { label: 'Completed',              badge: 'badge-green' },
  cancelled:              { label: 'Cancelled',              badge: 'badge-gray' },
}

const fmt12 = (t) => {
  if (!t) return '—'
  const str = String(t).slice(0, 5)
  const [h, m] = str.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return t
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

const FORM_POOL = [
  { category: 'History', forms: ['Chief Complaint', 'History of Present Illness', 'Past Medical History', 'Family History', 'Social History', 'Review of Systems'] },
  { category: 'Physical Exam', forms: ['General Examination', 'Cardiovascular', 'Respiratory', 'Abdominal Examination', 'Neurological', 'Musculoskeletal', 'Skin & Integument'] },
  { category: 'Clinical Findings', forms: ['Vital Signs Assessment', 'Pain Assessment', 'Functional Assessment', 'Nutritional Assessment'] },
  { category: 'Specialty', forms: ['Ophthalmology Screen', 'ENT Assessment', 'Dermatology Assessment', 'Psychiatry Screen (PHQ-9)', 'Diabetes Foot Check', 'Antenatal Visit'] },
]

// ── Past Visits ───────────────────────────────────────────────────
function PastVisits({ patientId }) {
  const [visits, setVisits] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [expandedVisit, setExpandedVisit] = useState(null)
  const [pinTarget, setPinTarget] = useState(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [unlocked, setUnlocked] = useState(new Set())
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    if (!patientId || loaded) return
    doctorApi.getPatientVisits(patientId, 10)
      .then(r => setVisits(Array.isArray(r) ? r : []))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [patientId, loaded])

  const handleVerifyPin = async () => {
    if (!pin || pin.length < 4) { setPinError('Enter your 4–6 digit PIN'); return }
    setVerifying(true)
    setPinError('')
    try {
      await api.post('/auth/staff/pin-verify', { pin })
      setUnlocked(prev => new Set([...prev, pinTarget]))
      setExpandedVisit(pinTarget)
      setPinTarget(null)
      setPin('')
    } catch {
      setPinError('Incorrect PIN. Please try again.')
    } finally { setVerifying(false) }
  }

  const handleVisitClick = (v) => {
    if (pinTarget === v.id) { setPinTarget(null); return }
    if (v.is_mine || unlocked.has(v.id)) {
      setExpandedVisit(expandedVisit === v.id ? null : v.id)
    } else {
      setPinTarget(v.id)
      setPinError('')
      setPin('')
    }
  }

  return (
    <div className="border-t border-gray-100 mt-6">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-1 py-3 hover:bg-gray-50 transition-colors text-sm font-semibold text-gray-600 rounded-lg"
      >
        <span className="flex items-center gap-2">
          <Clock size={14} />
          Past Visits
          {visits.length > 0 && <span className="text-xs text-gray-400 font-normal">({visits.length})</span>}
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="divide-y divide-gray-50">
          {!loaded && <div className="p-3 text-center text-gray-400 text-xs">Loading…</div>}
          {loaded && visits.length === 0 && (
            <div className="p-3 text-center text-gray-400 text-xs">No previous visits found</div>
          )}
          {visits.map(v => (
            <div key={v.id}>
              <button
                onClick={() => handleVisitClick(v)}
                className="w-full flex items-center justify-between py-2.5 px-1 text-left hover:bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {!v.is_mine && !unlocked.has(v.id) && (
                    <Lock size={12} className="text-gray-400 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-700 truncate">
                      {v.date || '—'} · {v.doctor_name || 'Dr.'}
                    </div>
                    <div className="text-xs text-gray-400 truncate">{v.reason || 'No chief complaint'}</div>
                  </div>
                </div>
                {(v.is_mine || unlocked.has(v.id))
                  ? (expandedVisit === v.id ? <ChevronUp size={12} className="flex-shrink-0" /> : <ChevronDown size={12} className="flex-shrink-0" />)
                  : <span className="text-xs text-blue-500 font-semibold flex-shrink-0">Unlock</span>}
              </button>

              {pinTarget === v.id && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-2 font-semibold">Enter your PIN to view this visit</p>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleVerifyPin() }}
                    placeholder="PIN"
                    autoFocus
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 mb-2 text-center tracking-widest"
                  />
                  {pinError && <p className="text-xs text-red-500 mb-2">{pinError}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => setPinTarget(null)} className="flex-1 py-1 text-xs rounded border border-gray-200 text-gray-600">Cancel</button>
                    <button onClick={handleVerifyPin} disabled={verifying}
                      className="flex-1 py-1 text-xs rounded text-white font-semibold disabled:opacity-50"
                      style={{ background: BLUE }}>
                      {verifying ? '…' : 'Verify'}
                    </button>
                  </div>
                </div>
              )}

              {expandedVisit === v.id && (
                <div className="pb-3 px-1 text-xs text-gray-600 space-y-2">
                  {v.soap && (
                    <>
                      {v.soap.subjective && <div><strong>S:</strong> {v.soap.subjective}</div>}
                      {v.soap.objective  && <div><strong>O:</strong> {v.soap.objective}</div>}
                      {v.soap.assessment && <div><strong>A:</strong> {v.soap.assessment}</div>}
                      {v.soap.plan       && <div><strong>P:</strong> {v.soap.plan}</div>}
                    </>
                  )}
                  {v.prescriptions?.length > 0 && (
                    <div><strong>Rx:</strong> {v.prescriptions.map(p => p.drug_name).join(', ')}</div>
                  )}
                  {v.lab_orders?.length > 0 && (
                    <div><strong>Lab:</strong> {v.lab_orders.map(l => l.test_name).join(', ')}</div>
                  )}
                  {!v.soap && !v.prescriptions?.length && !v.lab_orders?.length && (
                    <div className="text-gray-400">No clinical details recorded</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Assessment Panel ──────────────────────────────────────────────
function AssessmentPanel({ patientId, appointmentId }) {
  const [search, setSearch] = useState('')
  const [activeForm, setActiveForm] = useState(null)
  const [formText, setFormText] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const filtered = search.trim()
    ? FORM_POOL.map(cat => ({
        ...cat,
        forms: cat.forms.filter(f => f.toLowerCase().includes(search.toLowerCase())),
      })).filter(cat => cat.forms.length > 0)
    : FORM_POOL

  const handleSave = async () => {
    if (!formText.trim()) return
    setSaving(true)
    try {
      // Persist the form note as a clinical assessment (real, durable store).
      await api.post('/assessments', {
        type: activeForm || 'assessment_note',
        encounterId: appointmentId,
        data: { title: activeForm, note: formText },
      })
      setSaved(true)
      setTimeout(() => { setSaved(false); setActiveForm(null); setFormText('') }, 800)
    } catch (e) {
      // Keep the entered note so it isn't lost; let the doctor retry.
      alert(e?.response?.data?.detail || 'Could not save the note. Your text is kept — please retry.')
    } finally { setSaving(false) }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-100 flex-shrink-0">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Assessment Forms</div>
        <div className="relative">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search forms…"
            className="w-full pl-6 pr-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-blue-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.map(cat => (
          <div key={cat.category}>
            <div className="px-3 pt-3 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wide">{cat.category}</div>
            {cat.forms.map(f => (
              <button
                key={f}
                onClick={() => { setActiveForm(f); setFormText('') }}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                {f}
              </button>
            ))}
          </div>
        ))}
      </div>

      {activeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800">{activeForm}</h3>
              <button onClick={() => setActiveForm(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <textarea
              value={formText}
              onChange={e => setFormText(e.target.value)}
              placeholder={`Enter findings for ${activeForm}…`}
              rows={8}
              autoFocus
              className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-400 resize-none"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={() => setActiveForm(null)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formText.trim()}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: saved ? '#16a34a' : BLUE }}
              >
                {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Dashboard Section ─────────────────────────────────────────────
function DashboardSection({ encounter, patientId }) {
  const p = encounter.patient || {}
  const v = encounter.vitals || {}
  const stats = [
    { label: 'Age',        value: p.age != null ? `${p.age} yrs` : '—' },
    { label: 'Gender',     value: p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : '—' },
    { label: 'Blood Group',value: p.blood_group || '—' },
    { label: 'Phone',      value: p.phone || '—' },
  ]
  const vitalItems = [
    { label: 'BP',     value: v.bp },
    { label: 'Temp',   value: v.temp  ? `${v.temp}°`     : null },
    { label: 'SpO₂',  value: v.spo2  ? `${v.spo2}%`     : null },
    { label: 'Pulse',  value: v.pulse ? `${v.pulse} bpm` : null },
    { label: 'Weight', value: v.weight? `${v.weight} kg` : null },
    { label: 'Height', value: v.height? `${v.height} cm` : null },
  ].filter(i => i.value)

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl p-3" style={{ background: BLUE_LIGHT, border: `1px solid ${BLUE_BORDER}` }}>
            <div className="text-xs text-gray-500 mb-0.5">{s.label}</div>
            <div className="font-semibold text-gray-800 text-sm">{s.value}</div>
          </div>
        ))}
      </div>

      {vitalItems.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Vitals</div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {vitalItems.map(i => (
              <div key={i.label} className="rounded-xl p-2.5 bg-white border border-gray-100 text-center shadow-sm">
                <div className="text-xs text-gray-400">{i.label}</div>
                <div className="font-bold text-gray-800 text-sm">{i.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(encounter.appointment?.reason || encounter.reason) && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <div className="text-xs font-bold text-amber-700 mb-1">Chief Complaint</div>
          <div className="text-sm text-amber-900">{encounter.appointment?.reason || encounter.reason}</div>
        </div>
      )}

      <PastVisits patientId={patientId} />
    </div>
  )
}

// ── SOAP Section ──────────────────────────────────────────────────
function SoapSection({ soap, onChange, readonly, patientId }) {
  const fields = [
    { key: 'subjective', label: 'S — Subjective', placeholder: 'Chief complaint, history of present illness…' },
    { key: 'objective',  label: 'O — Objective',  placeholder: 'Examination findings, investigations reviewed…' },
    { key: 'assessment', label: 'A — Assessment', placeholder: 'Diagnosis / differential diagnosis…' },
    { key: 'plan',       label: 'P — Plan',       placeholder: 'Management, follow-up, patient instructions…' },
  ]
  return (
    <div>
      <div className="space-y-4 mb-2">
        {fields.map(f => (
          <div key={f.key}>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{f.label}</label>
            <textarea
              value={soap[f.key] || ''}
              onChange={e => onChange(f.key, e.target.value)}
              placeholder={f.placeholder}
              rows={4}
              disabled={readonly}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-400 resize-none disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
        ))}
      </div>
      <PastVisits patientId={patientId} />
    </div>
  )
}

// ── Prescriptions Section ─────────────────────────────────────────
const EMPTY_RX = { drug_name: '', dosage: '', frequency: '', duration: '', route: '', instructions: '' }

function PrescriptionsSection({ items, onChange, readonly, patientId }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef(null)

  const handleSearch = (q) => {
    setSearch(q)
    clearTimeout(debounceRef.current)
    if (!q.trim() || q.length < 2) { setResults([]); return }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/pharmacy/medicines/search', { params: { q } })
        setResults(Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []))
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 300)
  }

  const addFromSearch = (drug) => {
    onChange([...items, { ...EMPTY_RX, drug_name: drug.name || drug.brand_name || drug.drug_name || '' }])
    setSearch('')
    setResults([])
  }

  const updateItem = (i, field, val) => {
    const updated = [...items]
    updated[i] = { ...updated[i], [field]: val }
    onChange(updated)
  }

  const removeItem = (i) => onChange(items.filter((_, idx) => idx !== i))

  return (
    <div>
      {!readonly && (
        <div className="mb-4 relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search medicine to add…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
              />
              {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border border-blue-400/30 border-t-blue-500 rounded-full animate-spin" />}
            </div>
            <button
              onClick={() => onChange([...items, { ...EMPTY_RX }])}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 whitespace-nowrap"
            >
              <Plus size={12} /> Add Blank
            </button>
          </div>
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {results.map((r, i) => (
                <button key={i} onClick={() => addFromSearch(r)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-800 truncate">{r.name || r.brand_name || r.drug_name}</span>
                  {r.generic_name && <span className="text-xs text-gray-400 truncate">{r.generic_name}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-8">No medications added</div>
      )}

      <div className="space-y-3 mb-2">
        {items.map((rx, i) => (
          <div key={i} className="border border-gray-200 rounded-xl p-3">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="col-span-2">
                <input
                  value={rx.drug_name}
                  onChange={e => updateItem(i, 'drug_name', e.target.value)}
                  disabled={readonly}
                  placeholder="Medicine name"
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 font-semibold disabled:bg-gray-50"
                />
              </div>
              <input value={rx.dosage}    onChange={e => updateItem(i, 'dosage',    e.target.value)} disabled={readonly} placeholder="Dosage (e.g. 500 mg)"  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 disabled:bg-gray-50" />
              <input value={rx.frequency} onChange={e => updateItem(i, 'frequency', e.target.value)} disabled={readonly} placeholder="Frequency (e.g. TDS)"   className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 disabled:bg-gray-50" />
              <input value={rx.duration}  onChange={e => updateItem(i, 'duration',  e.target.value)} disabled={readonly} placeholder="Duration (e.g. 5 days)" className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 disabled:bg-gray-50" />
              <input value={rx.route}     onChange={e => updateItem(i, 'route',     e.target.value)} disabled={readonly} placeholder="Route (e.g. Oral)"      className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 disabled:bg-gray-50" />
            </div>
            <input value={rx.instructions} onChange={e => updateItem(i, 'instructions', e.target.value)} disabled={readonly}
              placeholder="Special instructions (e.g. after food)"
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 disabled:bg-gray-50 mb-2" />
            {!readonly && (
              <button onClick={() => removeItem(i)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                <Trash2 size={11} /> Remove
              </button>
            )}
          </div>
        ))}
      </div>
      <PastVisits patientId={patientId} />
    </div>
  )
}

// ── Lab Section ───────────────────────────────────────────────────
function LabSection({ items, onChange, readonly, patientId }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef(null)

  const handleSearch = (q) => {
    setSearch(q)
    clearTimeout(debounceRef.current)
    if (!q.trim() || q.length < 2) { setResults([]); return }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/lab/tests/search', { params: { q } })
        setResults(Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []))
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 300)
  }

  const addItem = (test) => {
    const testName = test.test_name || test.name || test
    if (items.some(i => i.test_name === testName)) return
    onChange([...items, { test_name: testName, test_type: test.test_type || 'pathology', notes: '' }])
    setSearch('')
    setResults([])
  }

  const removeItem = (i) => onChange(items.filter((_, idx) => idx !== i))

  const updateNote = (i, val) => {
    const updated = [...items]
    updated[i] = { ...updated[i], notes: val }
    onChange(updated)
  }

  return (
    <div>
      {!readonly && (
        <div className="mb-4 relative">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search lab test to add…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
            />
            {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border border-blue-400/30 border-t-blue-500 rounded-full animate-spin" />}
          </div>
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {results.map((r, i) => (
                <button key={i} onClick={() => addItem(r)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-800 truncate">{r.test_name || r.name}</span>
                  {r.test_type && <span className="text-xs text-gray-400 capitalize">{r.test_type}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-8">No lab tests ordered</div>
      )}

      <div className="space-y-2 mb-2">
        {items.map((t, i) => (
          <div key={i} className="border border-gray-200 rounded-xl p-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <FlaskConical size={14} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800 text-sm">{t.test_name}</div>
              {t.test_type && <div className="text-xs text-gray-400 capitalize">{t.test_type}</div>}
              {!readonly && (
                <input
                  value={t.notes || ''}
                  onChange={e => updateNote(i, e.target.value)}
                  placeholder="Clinical notes (optional)"
                  className="mt-1.5 w-full px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400"
                />
              )}
            </div>
            {!readonly && (
              <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-400 flex-shrink-0 mt-1">
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      <PastVisits patientId={patientId} />
    </div>
  )
}

// ── Imaging Section ───────────────────────────────────────────────
function ImagingSection({ items, onChange, readonly, patientId }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef(null)

  const handleSearch = (q) => {
    setSearch(q)
    clearTimeout(debounceRef.current)
    if (!q.trim() || q.length < 2) { setResults([]); return }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/terminology/search', { params: { q, type: 'procedure' } })
        setResults(Array.isArray(res) ? res : (Array.isArray(res?.results) ? res.results : []))
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 300)
  }

  const addItem = (img) => {
    const name = img.name || img.procedure_name || (typeof img === 'string' ? img : '')
    if (!name || items.some(i => i.procedure_name === name)) return
    onChange([...items, { procedure_name: name, modality: img.modality || '', notes: '' }])
    setSearch('')
    setResults([])
  }

  const removeItem = (i) => onChange(items.filter((_, idx) => idx !== i))

  return (
    <div>
      {!readonly && (
        <div className="mb-4 relative">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search imaging study to order…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400"
            />
            {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border border-blue-400/30 border-t-blue-500 rounded-full animate-spin" />}
          </div>
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {results.map((r, i) => (
                <button key={i} onClick={() => addItem(r)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-800 truncate">{r.name || r.procedure_name}</span>
                  {r.modality && <span className="text-xs text-gray-400">{r.modality}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-8">No imaging studies ordered</div>
      )}

      <div className="space-y-2 mb-2">
        {items.map((img, i) => (
          <div key={i} className="border border-gray-200 rounded-xl p-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Scan size={14} className="text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800 text-sm">{img.procedure_name}</div>
              {img.modality && <div className="text-xs text-gray-400">{img.modality}</div>}
            </div>
            {!readonly && (
              <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-400 flex-shrink-0 mt-1">
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      <PastVisits patientId={patientId} />
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────
export default function OpdChart() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [encounter, setEncounter]     = useState(null)
  const [loading, setLoading]         = useState(true)
  const [section, setSection]         = useState('dashboard')
  const [panelOpen, setPanelOpen]     = useState(true)

  const [soap, setSoap]               = useState({ subjective: '', objective: '', assessment: '', plan: '' })
  const [prescriptions, setPrescriptions] = useState([])
  const [labItems, setLabItems]       = useState([])
  const [imagingItems, setImagingItems] = useState([])

  const [saving, setSaving]           = useState(false)
  const [actionLoading, setActionLoading] = useState('')

  const load = useCallback(async () => {
    try {
      const data = await doctorApi.getEncounter(id)
      setEncounter(data)

      const note = data.soap_note || {}
      setSoap({
        subjective: note.subjective || '',
        objective:  note.objective  || '',
        assessment: note.assessment || '',
        plan:       note.plan       || '',
      })

      setPrescriptions(
        (data.prescription?.items || data.prescriptions || []).map(p => ({
          drug_name:    p.drug_name    || p.name || '',
          dosage:       p.dosage       || '',
          frequency:    p.frequency    || '',
          duration:     p.duration     || '',
          route:        p.route        || '',
          instructions: p.instructions || '',
        }))
      )

      setLabItems(
        (data.lab_order?.tests || data.lab_items || data.lab_tests || []).map(t => ({
          test_name: t.test_name || t.name || '',
          test_type: t.test_type || '',
          notes:     t.notes     || '',
        }))
      )

      setImagingItems(
        (data.imaging_items || data.imaging_orders || []).map(img => ({
          procedure_name: img.procedure_name || img.name || '',
          modality:       img.modality || '',
          notes:          img.notes    || '',
        }))
      )
    } catch { /* encounter not found */ }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  // Backend reads prescription.items[].medicine_name and lab_order.tests[].test_name.
  const buildPayload = () => ({
    soap,
    prescription: {
      items: (prescriptions || []).map(p => ({
        medicine_name: p.drug_name || p.medicine_name || p.name || '',
        dosage:        p.dosage || '',
        frequency:     p.frequency || '',
        duration:      p.duration || '',
        instructions:  p.instructions || '',
      })),
    },
    lab_order: { tests: labItems },
    imaging: imagingItems,
  })

  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      await doctorApi.saveDraft(id, buildPayload())
      await load()
    } catch { alert('Failed to save draft') }
    finally { setSaving(false) }
  }

  const handleSendInvestigations = async () => {
    if (!window.confirm('Save draft and send patient for investigations?')) return
    setActionLoading('investigations')
    try {
      await doctorApi.saveDraft(id, buildPayload())
      await doctorApi.sendForInvestigations(id)
      await load()
    } catch { alert('Failed to send for investigations') }
    finally { setActionLoading('') }
  }

  const handleMarkReviewReady = async () => {
    if (!window.confirm('Mark this patient as ready for review?')) return
    setActionLoading('review')
    try {
      await doctorApi.markReviewReady(id)
      await load()
    } catch { alert('Failed to mark ready for review') }
    finally { setActionLoading('') }
  }

  const handleComplete = async () => {
    if (!window.confirm('Save all notes and complete this encounter?')) return
    setActionLoading('complete')
    try {
      await doctorApi.completeEncounter(id, buildPayload())
      navigate('/doctor-desk')
    } catch { alert('Failed to complete encounter') }
    finally { setActionLoading('') }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <PageLoader />
      </div>
    )
  }

  if (!encounter) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <AlertCircle size={32} className="opacity-30" />
        <p className="text-sm">Encounter not found</p>
        <button onClick={() => navigate('/doctor-desk')} className="text-sm text-blue-600 hover:underline">
          ← Back to Desk
        </button>
      </div>
    )
  }

  const appt      = encounter.appointment || encounter
  const patient   = encounter.patient || {}
  const status    = appt.status || encounter.status || ''
  const readonly  = status === 'completed' || status === 'cancelled'
  const patientId = patient.id || appt.patient_id

  const canSendInvestigations = status === 'in_progress'
  const canMarkReviewReady    = status === 'investigations_pending'
  const canComplete           = status === 'in_progress' || status === 'review_pending'

  const patientName = patient.full_name || patient.name || appt.patient_name || '—'
  const ageSex = [
    patient.age != null ? `${patient.age} yrs` : null,
    patient.gender || null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="flex flex-col bg-gray-50" style={{ height: 'calc(100vh - 64px)' }}>

      {/* ── Sticky Header ── */}
      <div
        className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3 flex-wrap"
        style={{ minHeight: '56px' }}
      >
        <button
          onClick={() => navigate('/doctor-desk')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 flex-shrink-0"
        >
          <ChevronLeft size={16} /> Desk
        </button>

        <div className="w-px h-4 bg-gray-200 flex-shrink-0" />

        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          <div className="min-w-0">
            <div className="font-bold text-gray-900 text-sm leading-tight truncate">{patientName}</div>
            {ageSex && <div className="text-xs text-gray-400">{ageSex}</div>}
          </div>
          <span className={(STATUS_CFG[status] || {}).badge || 'badge-gray'}>
            {(STATUS_CFG[status] || {}).label || status.replace(/_/g, ' ')}
          </span>
          {appt.appointment_time && (
            <span className="text-xs text-gray-400 flex-shrink-0">{fmt12(appt.appointment_time)}</span>
          )}
          {appt.mode === 'telehealth' && (
            <Video size={13} className="text-green-500 flex-shrink-0" title="Telehealth" />
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {!readonly && (
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {saving
                ? <span className="w-3 h-3 border border-gray-400/30 border-t-gray-600 rounded-full animate-spin" />
                : <Save size={12} />}
              Save Draft
            </button>
          )}

          {canSendInvestigations && (
            <button
              onClick={handleSendInvestigations}
              disabled={actionLoading === 'investigations'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50"
            >
              {actionLoading === 'investigations'
                ? <span className="w-3 h-3 border border-indigo-400/30 border-t-indigo-600 rounded-full animate-spin" />
                : <FlaskConical size={12} />}
              Send for Investigations
            </button>
          )}

          {canMarkReviewReady && (
            <button
              onClick={handleMarkReviewReady}
              disabled={actionLoading === 'review'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-50"
            >
              {actionLoading === 'review'
                ? <span className="w-3 h-3 border border-amber-400/30 border-t-amber-600 rounded-full animate-spin" />
                : <Eye size={12} />}
              Mark Review Ready
            </button>
          )}

          {canComplete && (
            <button
              onClick={handleComplete}
              disabled={actionLoading === 'complete'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
              style={{ background: BLUE }}
            >
              {actionLoading === 'complete'
                ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                : <CheckCircle size={12} />}
              Conclude &amp; Complete
            </button>
          )}
        </div>
      </div>

      {/* ── Three-column body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left sub-sidebar */}
        <div className="w-[172px] flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
          <nav className="py-2">
            {NAV.map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setSection(key)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold transition-colors text-left"
                style={section === key
                  ? { background: BLUE, color: '#fff' }
                  : { color: '#4b5563' }}
                onMouseEnter={e => { if (section !== key) e.currentTarget.style.background = '#f9fafb' }}
                onMouseLeave={e => { if (section !== key) e.currentTarget.style.background = '' }}
              >
                <Icon size={15} className="flex-shrink-0" />
                <span className="leading-tight">{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 max-w-3xl">
              {section === 'dashboard' && (
                <DashboardSection encounter={encounter} patientId={patientId} />
              )}
              {section === 'soap' && (
                <SoapSection
                  soap={soap}
                  onChange={(k, v) => setSoap(s => ({ ...s, [k]: v }))}
                  readonly={readonly}
                  patientId={patientId}
                />
              )}
              {section === 'prescriptions' && (
                <PrescriptionsSection
                  items={prescriptions}
                  onChange={setPrescriptions}
                  readonly={readonly}
                  patientId={patientId}
                />
              )}
              {section === 'lab' && (
                <LabSection
                  items={labItems}
                  onChange={setLabItems}
                  readonly={readonly}
                  patientId={patientId}
                />
              )}
              {section === 'imaging' && (
                <ImagingSection
                  items={imagingItems}
                  onChange={setImagingItems}
                  readonly={readonly}
                  patientId={patientId}
                />
              )}
            </div>
          </div>
        </div>

        {/* Toggle strip */}
        <button
          onClick={() => setPanelOpen(o => !o)}
          className="w-7 flex-shrink-0 bg-gray-50 border-l border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title={panelOpen ? 'Collapse panel' : 'Expand panel'}
        >
          {panelOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Right assessment panel */}
        {panelOpen && (
          <div className="w-[272px] flex-shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
            <AssessmentPanel patientId={patientId} appointmentId={parseInt(id, 10)} />
          </div>
        )}
      </div>
    </div>
  )
}
