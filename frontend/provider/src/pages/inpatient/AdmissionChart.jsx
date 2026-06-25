import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../api/client'
import {
  Activity, ClipboardList,
  AlertCircle, RefreshCw, Plus, Trash2,
  CheckCircle2,
  Printer, Mic, MicOff, UserCheck, X as XIcon,
  Search, ShieldAlert,
  Heart, Pill, ShoppingBag, Edit3, Utensils, Bed, Navigation, MessageSquare,
} from 'lucide-react'
import { PageLoader } from '../../components/ui/Spinner'
import PatientChartShell from '@shared/inpatient/PatientChartShell'
import DbAssessmentFormModal from './DbAssessmentFormModal'
import RichAssessmentFormModal from './RichAssessmentFormModal'
// CareChart inpatient sections copied in for full chart parity (CareChart is left
// untouched). Provider gains Provider View / MAR / Orders / Documentation /
// Diet / Pre-Post-Op / Patient Movement / Nursing Notes.
import CcProviderView from './cc/ProviderView'
import CcMedicationList from './cc/MedicationList'
import CcMAR from './cc/MAR'
import CcOrders from './cc/Orders'
import CcDocumentation from './cc/Documentation'
import CcDietNutrition from './cc/DietNutrition'
import CcPrePostOp from './cc/PrePostOp'
import CcPatientMovement from './cc/PatientMovement'
import CcNursingNotes from './cc/NursingNotes'

const NAVY  = '#0F2557'

// ── Smart Phrases ─────────────────────────────────────────────────────────────
const SMART_PHRASES = [
  { trigger: '.ros',    text: 'Review of Systems: Cardiovascular: No chest pain, palpitations, or edema. Respiratory: No shortness of breath or cough. GI: No nausea, vomiting, or abdominal pain. Neuro: No headache, dizziness, or focal weakness.' },
  { trigger: '.pe',     text: 'Physical Examination:\nGeneral: Alert and oriented x3, no acute distress.\nCVS: Regular rate and rhythm, no murmurs.\nResp: Clear to auscultation bilaterally.\nAbdomen: Soft, non-tender, non-distended.\nExtremities: No edema.' },
  { trigger: '.normal', text: 'Within normal limits.' },
  { trigger: '.stable', text: 'Patient is clinically stable. Vitals within acceptable range. No acute distress noted.' },
  { trigger: '.dc',     text: 'Discussed with patient and family. Risks, benefits, and alternatives explained. Patient agreeable to plan.' },
  { trigger: '.fu',     text: 'Follow-up in clinic in 1-2 weeks. Return to ER if symptoms worsen.' },
  { trigger: '.diet',   text: 'Diet: As tolerated. Encourage adequate hydration and balanced nutrition.' },
  { trigger: '.bp',     text: 'Blood pressure controlled on current regimen. Continue antihypertensive therapy.' },
  { trigger: '.dm',     text: 'Diabetes managed. Blood glucose monitoring advised. Continue current antidiabetic regimen.' },
  { trigger: '.ecg',    text: 'ECG reviewed. Normal sinus rhythm. No acute ST changes or arrhythmia noted.' },
]

function SmartTextarea({ value, onChange, placeholder, rows = 4, disabled = false }) {
  const [showDrop, setShowDrop] = useState(false)
  const [matches, setMatches]   = useState([])
  const [listening, setListening] = useState(false)
  const ref = useRef(null)
  const recogRef = useRef(null)

  const onKeyUp = e => {
    const before = e.target.value.slice(0, e.target.selectionStart)
    const word = (before.match(/(\S+)$/) || [])[1] || ''
    if (word.startsWith('.') && word.length > 1) {
      const hits = SMART_PHRASES.filter(p => p.trigger.startsWith(word))
      setMatches(hits); setShowDrop(hits.length > 0)
    } else { setShowDrop(false) }
  }

  const insert = phrase => {
    const ta = ref.current
    const pos = ta.selectionStart
    const newBefore = ta.value.slice(0, pos).replace(/(\S+)$/, phrase.text)
    const newVal = newBefore + ta.value.slice(pos)
    onChange({ target: { value: newVal } })
    setShowDrop(false)
    setTimeout(() => { ta.focus(); ta.selectionStart = ta.selectionEnd = newBefore.length }, 0)
  }

  const startDictation = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice dictation not supported in this browser. Use Chrome.'); return }
    const recog = new SR()
    recog.continuous = true
    recog.interimResults = true
    recog.lang = 'en-IN'
    recogRef.current = recog
    recog.onresult = (e) => {
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript
      }
      if (final) {
        onChange({ target: { value: value + (value && !value.endsWith(' ') ? ' ' : '') + final } })
      }
    }
    recog.onerror = () => setListening(false)
    recog.onend = () => setListening(false)
    recog.start()
    setListening(true)
  }

  const stopDictation = () => {
    recogRef.current?.stop()
    setListening(false)
  }

  return (
    <div className="relative">
      <textarea ref={ref} value={value} onChange={onChange} onKeyUp={onKeyUp}
        onBlur={() => setTimeout(() => setShowDrop(false), 150)}
        placeholder={placeholder} rows={rows} disabled={disabled}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none disabled:bg-gray-50 pr-10 ${listening ? 'border-red-400 bg-red-50 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-500'}`} />
      {showDrop && (
        <div className="absolute z-50 left-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {matches.map(p => (
            <button key={p.trigger} type="button" onMouseDown={() => insert(p)}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0">
              <span className="font-mono font-bold text-blue-600 text-xs">{p.trigger}</span>
              <span className="text-gray-500 text-xs ml-2">{p.text.slice(0, 55)}…</span>
            </button>
          ))}
        </div>
      )}
      {!disabled && (
        <button
          type="button"
          onMouseDown={listening ? stopDictation : startDictation}
          title={listening ? 'Stop dictation' : 'Start voice dictation'}
          className={`absolute right-2 bottom-2 p-1 rounded-full transition-all ${
            listening
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
          }`}
        >
          {listening ? <MicOff size={14} /> : <Mic size={14} />}
        </button>
      )}
      {listening && (
        <p className="text-xs text-red-500 animate-pulse mt-1">🎤 Listening… speak now. Click mic to stop.</p>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDateTime(str) {
  if (!str) return '—'
  const d = new Date(str)
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

// ── Discharge Summary Tab ─────────────────────────────────────────────────────
const EMPTY_MED = () => ({ name: '', dose: '', route: 'oral', frequency: '', duration: '' })

function DischargeSummaryTab({ admissionId }) {
  const [summaryId, setSummaryId] = useState(null)
  const [finalized, setFinalized] = useState(false)
  const [finalizedAt, setFinalizedAt] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [saveStatus, setSaveStatus] = useState('clean')
  const [lastSavedTime, setLastSavedTime] = useState(null)
  const [err, setErr]             = useState('')
  const [saving, setSaving]       = useState(false)
  const saveTimerRef = useRef(null)

  const [form, setForm] = useState({
    admission_diagnosis: '',
    final_diagnosis: '',
    procedures_done: '',
    hospital_course: '',
    condition_at_discharge: 'stable',
    discharge_instructions: '',
    diet_advice: '',
    activity_restrictions: '',
    followup_date: '',
    followup_with: '',
  })
  const [meds, setMeds] = useState([EMPTY_MED()])

  const setF = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    markDirty()
  }

  const markDirty = () => {
    setSaveStatus('dirty')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => autoSave(), 30000)
  }

  useEffect(() => {
    api.get(`/inpatient/admissions/${admissionId}/discharge-summary`)
      .then(r => {
        if (r && (r.id || r.admission_diagnosis != null)) {
          setSummaryId(r.id || null)
          setFinalized(!!r.is_finalized)
          setFinalizedAt(r.finalized_at || null)
          setForm({
            admission_diagnosis:    r.admission_diagnosis || '',
            final_diagnosis:        r.final_diagnosis || '',
            procedures_done:        r.procedures_done || '',
            hospital_course:        r.hospital_course || '',
            condition_at_discharge: r.condition_at_discharge || 'stable',
            discharge_instructions: r.discharge_instructions || '',
            diet_advice:            r.diet_advice || '',
            activity_restrictions:  r.activity_restrictions || '',
            followup_date:          r.followup_date || '',
            followup_with:          r.followup_with || '',
          })
          if (r.discharge_medications) {
            try {
              const parsed = typeof r.discharge_medications === 'string' ? JSON.parse(r.discharge_medications) : r.discharge_medications
              if (Array.isArray(parsed) && parsed.length) setMeds(parsed)
            } catch (_) {}
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [admissionId])

  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }, [])

  const buildPayload = () => ({ ...form, discharge_medications: JSON.stringify(meds) })

  const autoSave = async () => {
    setSaveStatus('saving')
    try {
      const payload = buildPayload()
      if (summaryId) {
        await api.patch(`/inpatient/admissions/${admissionId}/discharge-summary`, payload)
      } else {
        const r = await api.post(`/inpatient/admissions/${admissionId}/discharge-summary`, payload)
        setSummaryId(r?.id || null)
      }
      setLastSavedTime(new Date())
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('clean'), 5000)
    } catch (_) {
      setSaveStatus('dirty')
    }
  }

  const saveDraft = async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    await autoSave()
  }

  const finalize = async () => {
    if (!window.confirm('Finalize and send to Discharge Queue? This will lock the summary.')) return
    setSaving(true)
    try {
      await saveDraft()
      await api.post(`/inpatient/admissions/${admissionId}/discharge-summary/finalize`, {})
      setFinalized(true)
      setFinalizedAt(new Date().toISOString())
    } catch (ex) {
      setErr(ex?.response?.data?.detail || ex.message || 'Failed to finalize')
    } finally { setSaving(false) }
  }

  const addMed = () => setMeds(m => [...m, EMPTY_MED()])
  const rmMed  = i => setMeds(m => m.filter((_, j) => j !== i))
  const setMed = (i, k, v) => { setMeds(m => m.map((item, j) => j === i ? { ...item, [k]: v } : item)); markDirty() }

  const SaveIndicator = () => {
    if (saveStatus === 'dirty')  return <span className="inline-flex items-center gap-1.5 text-xs text-gray-500"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />Unsaved changes</span>
    if (saveStatus === 'saving') return <span className="inline-flex items-center gap-1.5 text-xs text-blue-600"><RefreshCw size={12} className="animate-spin" />Saving…</span>
    if (saveStatus === 'saved')  return <span className="inline-flex items-center gap-1.5 text-xs text-green-600"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Saved {lastSavedTime ? lastSavedTime.toLocaleTimeString() : ''}</span>
    return null
  }

  if (loading) return <div className="flex justify-center py-10"><RefreshCw size={22} className="animate-spin text-gray-400" /></div>

  return (
    <div>
      <style>{`@media print { .print-hidden { display: none !important; } }`}</style>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-800">Discharge Summary</h3>
          {finalized && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
              <CheckCircle2 size={12} />Finalized {finalizedAt ? fmtDateTime(finalizedAt) : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <SaveIndicator />
          {finalized ? (
            <button onClick={() => window.print()} className="print-hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
              <Printer size={14} />Print Summary
            </button>
          ) : (
            <>
              <button onClick={saveDraft} disabled={saving} className="print-hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                Save Draft
              </button>
              <button onClick={finalize} disabled={saving} className="print-hidden inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                Finalize &amp; Send to Discharge Queue
              </button>
            </>
          )}
        </div>
      </div>

      {err && <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 print-hidden"><AlertCircle size={15} />{err}</div>}

      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">Diagnoses</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Admission Diagnosis</label>
              <SmartTextarea value={form.admission_diagnosis} onChange={e => setF('admission_diagnosis', e.target.value)} placeholder="Primary diagnosis at admission…" rows={2} disabled={finalized} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Final Diagnosis</label>
              <SmartTextarea value={form.final_diagnosis} onChange={e => setF('final_diagnosis', e.target.value)} placeholder="Final confirmed diagnosis…" rows={2} disabled={finalized} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">Hospital Course</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Procedures Done</label>
              <SmartTextarea value={form.procedures_done} onChange={e => setF('procedures_done', e.target.value)} placeholder="List procedures performed…" rows={2} disabled={finalized} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hospital Course Summary</label>
              <SmartTextarea value={form.hospital_course} onChange={e => setF('hospital_course', e.target.value)} placeholder="Summary of clinical course during admission…" rows={6} disabled={finalized} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">Condition at Discharge</h4>
          <div className="flex flex-wrap gap-4">
            {['stable', 'improved', 'deteriorated', 'deceased'].map(c => (
              <label key={c} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="condition_at_discharge" value={c} checked={form.condition_at_discharge === c}
                  onChange={e => setF('condition_at_discharge', e.target.value)} disabled={finalized}
                  className="text-blue-600 focus:ring-blue-500" />
                <span className="text-sm capitalize text-gray-700">{c}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">Discharge Plan</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Discharge Instructions</label>
              <SmartTextarea value={form.discharge_instructions} onChange={e => setF('discharge_instructions', e.target.value)} placeholder="Instructions for patient/family…" rows={3} disabled={finalized} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Diet Advice</label>
              <SmartTextarea value={form.diet_advice} onChange={e => setF('diet_advice', e.target.value)} placeholder="Dietary recommendations…" rows={2} disabled={finalized} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Activity Restrictions</label>
              <SmartTextarea value={form.activity_restrictions} onChange={e => setF('activity_restrictions', e.target.value)} placeholder="Activity restrictions…" rows={2} disabled={finalized} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">Follow-up</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Follow-up Date</label>
              <input type="date" disabled={finalized}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                value={form.followup_date} onChange={e => setF('followup_date', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Follow-up With</label>
              <input type="text" disabled={finalized}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                value={form.followup_with} onChange={e => setF('followup_with', e.target.value)}
                placeholder="Dr. name / specialty…" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">Discharge Medications</h4>
          <div className="space-y-2 mb-3">
            {meds.map((med, i) => (
              <div key={i} className="grid grid-cols-6 gap-2 items-center bg-gray-50 rounded-lg p-2">
                <div className="col-span-2">
                  <input type="text" disabled={finalized} placeholder="Medicine name"
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                    value={med.name} onChange={e => setMed(i, 'name', e.target.value)} />
                </div>
                <div>
                  <input type="text" disabled={finalized} placeholder="Dose"
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                    value={med.dose} onChange={e => setMed(i, 'dose', e.target.value)} />
                </div>
                <div>
                  <select disabled={finalized} value={med.route} onChange={e => setMed(i, 'route', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100">
                    <option value="oral">Oral</option>
                    <option value="iv">IV</option>
                    <option value="im">IM</option>
                    <option value="sc">SC</option>
                  </select>
                </div>
                <div>
                  <input type="text" disabled={finalized} placeholder="Frequency"
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                    value={med.frequency} onChange={e => setMed(i, 'frequency', e.target.value)} />
                </div>
                <div className="flex gap-1">
                  <input type="text" disabled={finalized} placeholder="Duration"
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                    value={med.duration} onChange={e => setMed(i, 'duration', e.target.value)} />
                  {!finalized && (
                    <button type="button" onClick={() => rmMed(i)} className="p-1.5 text-red-500 hover:text-red-700 flex-shrink-0">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {!finalized && (
            <button type="button" onClick={addMed} className="print-hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-sm text-gray-600 hover:bg-gray-50">
              <Plus size={14} />Add Medication
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── PrimaryDrModal ────────────────────────────────────────────────────────────
function PrimaryDrModal({ admissionId, currentDoctorName, onClose, onAssigned }) {
  const [doctors, setDoctors]   = useState([])
  const [query, setQuery]       = useState('')
  const [selected, setSelected] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')

  useEffect(() => {
    api.get('/staff/?role=doctor')
      .then(r => setDoctors(Array.isArray(r) ? r : (r?.items || r?.data || [])))
      .catch(() => {})
  }, [])

  const filtered = query.length > 0
    ? doctors.filter(d => (d.full_name || d.email || '').toLowerCase().includes(query.toLowerCase()))
    : doctors

  const assign = async () => {
    if (!selected) return
    setSaving(true); setErr('')
    try {
      await api.patch(`/inpatient/admissions/${admissionId}/primary-doctor`, { primary_doctor_id: selected.id })
      onAssigned(selected)
    } catch {
      try {
        await api.patch(`/inpatient/admissions/${admissionId}`, { primary_doctor_id: selected.id })
        onAssigned(selected)
      } catch (ex2) {
        setErr(ex2?.response?.data?.detail || ex2.message || 'Failed to assign doctor')
      }
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold" style={{ color: NAVY }}>Assign Primary Doctor</h2>
            {currentDoctorName && <p className="text-xs text-gray-400 mt-0.5">Current: {currentDoctorName}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><XIcon size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search doctor…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">No doctors found</p>
            ) : filtered.map(d => (
              <button key={d.id} type="button"
                onClick={() => setSelected(d)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selected?.id === d.id ? 'bg-blue-50 text-blue-800 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}>
                {d.full_name || d.email}
                {d.specialization && <span className="text-xs text-gray-400 ml-2">{d.specialization}</span>}
              </button>
            ))}
          </div>
          {err && <p className="text-red-600 text-sm flex items-center gap-1"><AlertCircle size={14} />{err}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button type="button" disabled={!selected || saving} onClick={assign}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: NAVY }}>
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <UserCheck size={14} />}
              {saving ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Patient Nav ───────────────────────────────────────────────────────────────
const PATIENT_NAV = [
  // Full CareChart parity — same sections, same order as the CareChart chart.
  { key: 'dashboard',      icon: Activity,      label: 'Dashboard' },
  { key: 'cc_provider',    icon: Heart,         label: 'Provider View' },
  { key: 'cc_medications', icon: ClipboardList, label: 'Medications' },
  { key: 'cc_mar',         icon: Pill,          label: 'MAR' },
  { key: 'cc_orders',      icon: ShoppingBag,   label: 'Orders' },
  { key: 'cc_docs',        icon: Edit3,         label: 'Documentation' },
  { key: 'cc_diet',        icon: Utensils,      label: 'Diet & Nutrition' },
  { key: 'cc_preop',       icon: Bed,           label: 'Pre / Post-Op' },
  { key: 'cc_nursing',     icon: MessageSquare, label: 'Nursing Notes' },
  { key: 'cc_movement',    icon: Navigation,    label: 'Patient Movement' },
  { key: 'discharge',      icon: ShieldAlert,   label: 'Discharge Summary' },
]

// ── Main AdmissionChart ───────────────────────────────────────────────────────
export default function AdmissionChart() {
  const { admissionId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [admission, setAdmission]   = useState(null)
  const [patient, setPatient]       = useState(null)
  const [vitals, setVitals]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [err, setErr]               = useState('')
  const [activeNav, setActiveNav]   = useState('dashboard')
  const [openForm, setOpenForm]     = useState(null)
  const [showPrimaryDrModal, setShowPrimaryDrModal] = useState(false)
  const [primaryDoctorName, setPrimaryDoctorName]   = useState(null)

  const canWrite = user?.role === 'doctor' || user?.role === 'clinic_admin'

  useEffect(() => {
    const load = async () => {
      setLoading(true); setErr('')
      try {
        const r = await api.get(`/inpatient/admissions/${admissionId}`)
        setAdmission(r)
        setPrimaryDoctorName(r?.primary_doctor_name || null)
        const pat = r?.patient || null
        setPatient(pat)
        if (!pat && r?.patient_id) {
          try { const pr = await api.get(`/patients/${r.patient_id}`); setPatient(pr) } catch (_) {}
        }
        const vr = await api.get(`/inpatient/admissions/${admissionId}/vitals`).catch(() => null)
        if (vr) setVitals(Array.isArray(vr) ? vr : (vr?.items || vr?.data || []))
      } catch (ex) {
        setErr(ex?.response?.data?.detail || ex.message || 'Failed to load admission')
      } finally { setLoading(false) }
    }
    load()
  }, [admissionId])

  if (loading) return <PageLoader />
  if (err) return (
    <div className="flex flex-col h-full items-center justify-center">
      <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
        <AlertCircle size={16} className="shrink-0" />{err}
      </div>
    </div>
  )
  if (!admission) return (
    <div className="flex flex-col h-full items-center justify-center text-gray-500 text-sm">
      Admission not found
    </div>
  )

  const adm = admission
  const pat = patient || adm.patient || {}

  const renderContent = (nav) => {
    switch (nav) {
      case 'discharge': return <DischargeSummaryTab admissionId={admissionId} />
      case 'cc_provider': return <CcProviderView admission={adm} vitals={vitals} />
      case 'cc_medications': return <CcMedicationList admission={adm} />
      case 'cc_mar':      return <CcMAR admission={adm} />
      case 'cc_orders':   return <CcOrders admission={adm} />
      case 'cc_docs':     return <CcDocumentation admission={adm} />
      case 'cc_diet':     return <CcDietNutrition admission={adm} />
      case 'cc_preop':    return <CcPrePostOp admission={adm} />
      case 'cc_movement': return <CcPatientMovement admission={adm} />
      case 'cc_nursing':  return <CcNursingNotes admission={adm} />
      default:         return null
    }
  }

  return (
    <>
      {showPrimaryDrModal && (
        <PrimaryDrModal
          admissionId={admissionId}
          currentDoctorName={primaryDoctorName || adm?.primary_doctor_name}
          onClose={() => setShowPrimaryDrModal(false)}
          onAssigned={doc => {
            setPrimaryDoctorName(doc.full_name || doc.email)
            setShowPrimaryDrModal(false)
          }}
        />
      )}
      <PatientChartShell
        admission={adm}
        vitals={vitals}
        patient={pat}
        patientAllergies={pat.allergies || null}
        navItems={PATIENT_NAV}
        activeNav={activeNav}
        onNavChange={setActiveNav}
        renderContent={renderContent}
        onOpenForm={setOpenForm}
        api={api}
        openFormModal={openForm && (
          openForm.__db
            ? <DbAssessmentFormModal
                form={openForm}
                patientId={pat?.id || adm.patient_id}
                admissionId={admissionId}
                patientName={pat?.full_name || pat?.name || adm.patient_name}
                onClose={() => setOpenForm(null)}
              />
            : <RichAssessmentFormModal
                form={openForm}
                patientId={pat?.id || adm.patient_id}
                admissionId={admissionId}
                patientName={pat?.full_name || pat?.name || adm.patient_name}
                onClose={() => setOpenForm(null)}
              />
        )}
        formsStorageKey="provider_forms_panel"
        onBack={() => navigate('/inpatient')}
        primaryDoctorName={primaryDoctorName || adm.primary_doctor_name}
        onChangePrimaryDoctor={canWrite ? () => setShowPrimaryDrModal(true) : null}
      />
    </>
  )
}
