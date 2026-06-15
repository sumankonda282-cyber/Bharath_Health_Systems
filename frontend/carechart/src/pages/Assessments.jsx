import { useState, useEffect, useCallback } from 'react'
import {
  Shield, AlertTriangle, Activity, Brain, Thermometer, Smile,
  Droplets, Utensils, FileText, Users, ClipboardCheck, Eye,
  Heart, Zap, Home, Loader2, ChevronRight, Clock, Search,
  X, Lightbulb, CheckCircle2, Lock, Plus
} from 'lucide-react'
import PatientList from '../components/PatientList'
import GCSForm from '../components/assessments/GCSForm'
import BradenForm from '../components/assessments/BradenForm'
import MorseForm from '../components/assessments/MorseForm'
import PainForm from '../components/assessments/PainForm'
import IOChartForm from '../components/assessments/IOChartForm'
import WoundCareForm from '../components/assessments/WoundCareForm'
import RestraintForm from '../components/assessments/RestraintForm'
import api from '../api/client'

const ASSESSMENT_CATALOG = [
  { id: 'braden',          name: 'Braden Scale',           category: 'Nursing Safety',         description: 'Pressure ulcer risk (6–23, lower=higher risk)',         color: '#d97706', Icon: Shield },
  { id: 'morse',           name: 'Morse Fall Scale',        category: 'Nursing Safety',         description: 'Fall risk (≥45 = high risk)',                           color: '#dc2626', Icon: AlertTriangle },
  { id: 'restraint',       name: 'Restraint Assessment',    category: 'Nursing Safety',         description: 'Need & safety of physical restraints',                   color: '#7c3aed', Icon: Lock },
  { id: 'shift_assessment',name: 'Shift Assessment',        category: 'Nursing Safety',         description: 'Head-to-toe system check at shift start/end',            color: '#0891b2', Icon: ClipboardCheck },
  { id: 'falls_reassess',  name: 'Falls Reassessment',      category: 'Nursing Safety',         description: 'Post-fall or high-risk re-evaluation',                   color: '#dc2626', Icon: AlertTriangle },
  { id: 'gcs',             name: 'Glasgow Coma Scale',      category: 'Neurological',           description: 'Consciousness: Eyes+Verbal+Motor (3–15)',               color: '#7c3aed', Icon: Brain },
  { id: 'rass',            name: 'RASS Sedation',           category: 'Neurological',           description: 'Richmond Agitation-Sedation Scale (+4 to -5)',           color: '#6d28d9', Icon: Activity },
  { id: 'cam',             name: 'CAM Delirium Screen',     category: 'Neurological',           description: 'Confusion Assessment Method — 4 features',               color: '#4338ca', Icon: Brain },
  { id: 'nih_stroke',      name: 'NIH Stroke Scale',        category: 'Neurological',           description: 'Stroke severity 0–42',                                   color: '#b91c1c', Icon: Zap },
  { id: 'pain',            name: 'Pain Assessment (NRS)',   category: 'Pain & Comfort',         description: 'Numeric Rating Scale 0–10',                             color: '#dc2626', Icon: Thermometer },
  { id: 'wong_baker',      name: 'Wong-Baker FACES',        category: 'Pain & Comfort',         description: 'Visual faces scale — pediatric / non-verbal',            color: '#ec4899', Icon: Smile },
  { id: 'cpot',            name: 'CPOT (Critical Care)',    category: 'Pain & Comfort',         description: 'Critical-Care Pain Observation Tool (0–8)',              color: '#dc2626', Icon: Activity },
  { id: 'wound',           name: 'Wound Care Assessment',   category: 'Skin & Wound',           description: 'Stage, size, exudate, periwound, treatment',            color: '#16a34a', Icon: Eye },
  { id: 'pressure_injury', name: 'Pressure Injury Staging', category: 'Skin & Wound',           description: 'Stage I–IV + Unstageable + DTI',                        color: '#ea580c', Icon: AlertTriangle },
  { id: 'skin_bundle',     name: 'Skin Bundle Check',       category: 'Skin & Wound',           description: 'Head-to-toe skin integrity',                            color: '#0284c7', Icon: Eye },
  { id: 'io',              name: 'I/O Chart',               category: 'Fluid & Nutrition',      description: 'Intake & Output fluid balance tracking',                 color: '#0284c7', Icon: Droplets },
  { id: 'nutritional',     name: 'MUST Nutritional Screen', category: 'Fluid & Nutrition',      description: 'Malnutrition Universal Screening Tool',                  color: '#d97706', Icon: Utensils },
  { id: 'daily_weight',    name: 'Daily Weight',            category: 'Fluid & Nutrition',      description: 'Weight trend monitoring (kg)',                           color: '#16a34a', Icon: Activity },
  { id: 'hp',              name: 'H&P (History & Physical)', category: 'Provider Documentation', description: 'Comprehensive admission H&P',                          color: '#0f2557', Icon: FileText },
  { id: 'proc',            name: 'Procedure Note',           category: 'Provider Documentation', description: 'Bedside or OR procedure documentation',                color: '#7c3aed', Icon: FileText },
  { id: 'consult',         name: 'Consult Request',          category: 'Provider Documentation', description: 'Specialist consultation request',                      color: '#1d4ed8', Icon: Users },
  { id: 'event',           name: 'Critical Event Note',      category: 'Provider Documentation', description: 'Rapid response / code / deterioration event',          color: '#dc2626', Icon: Zap },
  { id: 'discharge',       name: 'Discharge Summary',        category: 'Provider Documentation', description: 'Complete discharge planning & documentation',           color: '#6b7280', Icon: Home },
]

const CATEGORIES = [...new Set(ASSESSMENT_CATALOG.map(a => a.category))]

const SUGGESTION_RULES = [
  { match: d => /pneumonia|respiratory|COPD|asthma|J1[0-9]|J2[0-9]/i.test(d), suggest: ['gcs','pain','braden'], reason: 'Respiratory condition protocol' },
  { match: d => /stroke|CVA|I6[0-9]|TIA/i.test(d), suggest: ['nih_stroke','gcs','rass','braden'], reason: 'Stroke care bundle' },
  { match: d => /sepsis|infection/i.test(d), suggest: ['cam','rass','pain','io'], reason: 'Sepsis bundle — delirium & fluid monitoring' },
  { match: d => /fracture|ortho|post.?op|surgery/i.test(d), suggest: ['pain','morse','wound','io'], reason: 'Post-surgical protocol' },
  { match: d => /diabet|E1[0-1]/i.test(d), suggest: ['wound','nutritional','daily_weight'], reason: 'Diabetes care bundle' },
  { match: d => /cardiac|heart failure|MI|I2[0-5]/i.test(d), suggest: ['pain','io','daily_weight'], reason: 'Cardiac monitoring protocol' },
  { match: d => /renal|kidney|N1[0-9]|CKD|AKI/i.test(d), suggest: ['io','daily_weight','nutritional'], reason: 'Renal care bundle' },
  { match: d => /icu|critical|ventilat|sedation/i.test(d), suggest: ['rass','cam','braden','cpot','io'], reason: 'ICU critical care bundle' },
]

function timeAgo(s) {
  if (!s) return null
  const m = (Date.now() - new Date(s).getTime()) / 60000
  if (m < 60) return `${Math.round(m)}m ago`
  if (m < 1440) return `${Math.round(m/60)}h ago`
  return `${Math.round(m/1440)}d ago`
}

function RASSForm({ admissionId, onSave, onClose }) {
  const LEVELS = [
    { score: 4,  label: '+4 Combative',       desc: 'Overtly combative, violent, immediate danger' },
    { score: 3,  label: '+3 Very Agitated',   desc: 'Pulls/removes tubes, aggressive' },
    { score: 2,  label: '+2 Agitated',        desc: 'Frequent non-purposeful movement, fights ventilator' },
    { score: 1,  label: '+1 Restless',        desc: 'Anxious but not aggressive' },
    { score: 0,  label: '0 Alert & Calm',     desc: 'Spontaneously awake, alert, calm' },
    { score: -1, label: '-1 Drowsy',          desc: 'Sustained awakening >10s to voice' },
    { score: -2, label: '-2 Light Sedation',  desc: 'Briefly awakens <10s to voice, eye contact' },
    { score: -3, label: '-3 Moderate Sedation', desc: 'Movement to voice, no eye contact' },
    { score: -4, label: '-4 Deep Sedation',   desc: 'No response to voice, moves to physical' },
    { score: -5, label: '-5 Unarousable',     desc: 'No response to voice or physical stimulation' },
  ]
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (selected === null) return
    setSaving(true)
    try {
      await api.post(`/inpatient/admissions/${admissionId}/notes`, {
        note_type: 'assessment',
        note_text: JSON.stringify({ type: 'RASS', score: selected, label: LEVELS.find(l => l.score === selected)?.label }),
      })
      onSave?.(); onClose()
    } catch { setSaving(false) }
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 mb-3">Select the patient's current level:</p>
      {LEVELS.map(l => (
        <label key={l.score} className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${selected === l.score ? 'bg-emerald-50 border-emerald-400' : 'border-gray-200 hover:bg-gray-50'}`}>
          <input type="radio" name="rass" className="mt-0.5" checked={selected === l.score} onChange={() => setSelected(l.score)} />
          <div>
            <div className={`text-sm font-semibold ${l.score > 1 ? 'text-red-600' : l.score < -2 ? 'text-purple-700' : 'text-gray-800'}`}>{l.label}</div>
            <div className="text-xs text-gray-500">{l.desc}</div>
          </div>
        </label>
      ))}
      <div className="flex gap-2 pt-3">
        <button onClick={save} disabled={selected === null || saving} className="btn-primary btn-sm">{saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Save RASS</button>
        <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
      </div>
    </div>
  )
}

function CAMForm({ admissionId, onSave, onClose }) {
  const [f, setF] = useState({ f1: false, f2: false, f3: false, f4: false })
  const [saving, setSaving] = useState(false)
  const positive = f.f1 && f.f2 && (f.f3 || f.f4)
  const FEATS = [
    { k: 'f1', label: 'Feature 1: Acute Onset & Fluctuating Course', desc: 'Acute change from baseline that fluctuates during the day' },
    { k: 'f2', label: 'Feature 2: Inattention', desc: 'Difficulty focusing attention, easily distracted' },
    { k: 'f3', label: 'Feature 3: Disorganized Thinking', desc: 'Disorganized/incoherent speech, illogical ideas' },
    { k: 'f4', label: 'Feature 4: Altered Level of Consciousness', desc: 'Any state other than alert (vigilant/lethargic/stupor/coma)' },
  ]
  const save = async () => {
    setSaving(true)
    try {
      await api.post(`/inpatient/admissions/${admissionId}/notes`, {
        note_type: 'assessment',
        note_text: JSON.stringify({ type: 'CAM', features: f, result: positive ? 'POSITIVE (Delirium)' : 'NEGATIVE' }),
      })
      onSave?.(); onClose()
    } catch { setSaving(false) }
  }
  return (
    <div className="space-y-3">
      {FEATS.map(ft => (
        <label key={ft.k} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${f[ft.k] ? 'bg-amber-50 border-amber-300' : 'border-gray-200 hover:bg-gray-50'}`}>
          <input type="checkbox" className="mt-0.5" checked={f[ft.k]} onChange={e => setF(p => ({ ...p, [ft.k]: e.target.checked }))} />
          <div><div className="text-sm font-semibold text-gray-800">{ft.label}</div><div className="text-xs text-gray-500">{ft.desc}</div></div>
        </label>
      ))}
      <div className={`p-3 rounded-lg border text-sm font-semibold ${positive ? 'bg-red-50 border-red-300 text-red-700' : 'bg-green-50 border-green-300 text-green-700'}`}>
        Result: {positive ? '⚠️ POSITIVE — Delirium present (F1+F2 AND F3/F4)' : '✅ NEGATIVE — Delirium criteria not met'}
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="btn-primary btn-sm">{saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Save CAM</button>
        <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
      </div>
    </div>
  )
}

function PlaceholderForm({ assessment, admissionId, onClose }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (!text.trim()) return
    setSaving(true)
    try {
      await api.post(`/inpatient/admissions/${admissionId}/notes`, {
        note_type: 'assessment',
        note_text: JSON.stringify({ type: assessment.id.toUpperCase(), notes: text }),
      })
      onClose()
    } catch { setSaving(false) }
  }
  return (
    <div className="space-y-3">
      <div className="alert-blue"><Activity size={14} />Structured scoring form coming soon. Use free text for now.</div>
      <div><label className="label">{assessment.name} — Notes</label>
        <textarea className="input h-32 resize-none" placeholder={`Enter ${assessment.name} findings...`} value={text} onChange={e => setText(e.target.value)} /></div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving || !text.trim()} className="btn-primary btn-sm">{saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Save</button>
        <button onClick={onClose} className="btn-secondary btn-sm">Cancel</button>
      </div>
    </div>
  )
}

function AssessmentModal({ assessment, admissionId, onClose, onSave }) {
  const formMap = {
    gcs: <GCSForm admissionId={admissionId} onSave={onSave} onClose={onClose} />,
    braden: <BradenForm admissionId={admissionId} onSave={onSave} onClose={onClose} />,
    morse: <MorseForm admissionId={admissionId} onSave={onSave} onClose={onClose} />,
    pain: <PainForm admissionId={admissionId} onSave={onSave} onClose={onClose} />,
    io: <IOChartForm admissionId={admissionId} onSave={onSave} onClose={onClose} />,
    wound: <WoundCareForm admissionId={admissionId} onSave={onSave} onClose={onClose} />,
    restraint: <RestraintForm admissionId={admissionId} onSave={onSave} onClose={onClose} />,
    rass: <RASSForm admissionId={admissionId} onSave={onSave} onClose={onClose} />,
    cam: <CAMForm admissionId={admissionId} onSave={onSave} onClose={onClose} />,
  }
  const Icon = assessment.Icon
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/50 px-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${assessment.color}18` }}>
              <Icon size={18} style={{ color: assessment.color }} />
            </div>
            <div>
              <div className="font-semibold text-gray-900">{assessment.name}</div>
              <div className="text-xs text-gray-500">{assessment.description}</div>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost btn-sm"><X size={16} /></button>
        </div>
        <div className="p-5">
          {formMap[assessment.id] || <PlaceholderForm assessment={assessment} admissionId={admissionId} onClose={onClose} />}
        </div>
      </div>
    </div>
  )
}

function AssessmentCard({ assessment, lastEntry, onStart }) {
  const Icon = assessment.Icon
  const hoursAgo = lastEntry ? (Date.now() - new Date(lastEntry.created_at).getTime()) / 3600000 : null
  const overdue = hoursAgo !== null && hoursAgo > 8
  const recentlyDone = hoursAgo !== null && hoursAgo < 4
  let score = null
  if (lastEntry?.note_text) { try { const p = JSON.parse(lastEntry.note_text); score = p.score ?? p.total ?? null } catch {} }
  return (
    <div className={`assess-card ${overdue ? 'assess-card-overdue' : ''}`} onClick={() => onStart(assessment)}>
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${assessment.color}18` }}>
          <Icon size={15} style={{ color: assessment.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-800 text-sm leading-tight">{assessment.name}</div>
          <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{assessment.description}</div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {lastEntry ? (
              <>
                <span className={`badge ${recentlyDone ? 'badge-green' : overdue ? 'badge-red' : 'badge-yellow'}`}>
                  <Clock size={9} className="mr-0.5" />{timeAgo(lastEntry.created_at)}
                </span>
                {score !== null && <span className="badge-blue">Score: {score}</span>}
                {overdue && <span className="badge-red">Overdue</span>}
              </>
            ) : <span className="badge-gray">Never done</span>}
          </div>
        </div>
        <ChevronRight size={14} className="text-gray-300 flex-shrink-0 mt-1" />
      </div>
    </div>
  )
}

export default function Assessments() {
  const [selectedAdmission, setSelectedAdmission] = useState(null)
  const [openAssessment, setOpenAssessment] = useState(null)
  const [lastNotes, setLastNotes] = useState({})
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [search, setSearch] = useState('')

  const loadLastNotes = useCallback(async (admId) => {
    setLoadingNotes(true)
    try {
      const data = await api.get(`/inpatient/admissions/${admId}/notes?note_type=assessment`)
      const arr = Array.isArray(data) ? data : (data.items || [])
      const map = {}
      arr.forEach(n => { try { const p = JSON.parse(n.note_text); const k = (p.type || '').toLowerCase(); if (!map[k]) map[k] = n } catch {} })
      setLastNotes(map)
    } catch {}
    setLoadingNotes(false)
  }, [])

  const handleSelectPatient = (adm) => { setSelectedAdmission(adm); loadLastNotes(adm.id) }
  const handleSaved = () => { if (selectedAdmission) loadLastNotes(selectedAdmission.id) }

  const diag = selectedAdmission?.diagnosis || selectedAdmission?.primary_diagnosis || ''
  const suggestions = SUGGESTION_RULES
    .filter(r => r.match(diag))
    .flatMap(r => r.suggest.map(id => ({ id, reason: r.reason })))
    .filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i)
    .slice(0, 8)

  const filteredCatalog = search.trim()
    ? ASSESSMENT_CATALOG.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.description.toLowerCase().includes(search.toLowerCase()))
    : ASSESSMENT_CATALOG

  return (
    <div className="flex gap-4 min-h-0">
      <div className="w-52 flex-shrink-0">
        <div className="card overflow-hidden">
          <div className="px-3 py-2.5 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Patients</div>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            <PatientList selectedId={selectedAdmission?.id} onSelect={handleSelectPatient} />
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 flex gap-4">
        <div className="flex-1 min-w-0 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 130px)' }}>
          <div className="page-header mb-4">
            <h1 className="page-title">Assessments</h1>
            {loadingNotes && <Loader2 size={16} className="animate-spin text-gray-400" />}
          </div>
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Search assessments…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {!selectedAdmission && (
            <div className="alert-blue mb-4"><Activity size={14} />Select a patient to see assessment history and suggestions.</div>
          )}
          {(search.trim() ? [null] : CATEGORIES).map(cat => {
            const items = search.trim() ? filteredCatalog : filteredCatalog.filter(a => a.category === cat)
            if (!items.length) return null
            return (
              <div key={cat || 'search'} className="mb-5">
                <div className="section-header">{search.trim() ? `Results (${items.length})` : cat}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map(a => (
                    <AssessmentCard key={a.id} assessment={a} lastEntry={lastNotes[a.id] || lastNotes[a.id.toUpperCase()]} onStart={setOpenAssessment} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="w-68 flex-shrink-0">
          <div className="card overflow-hidden sticky top-0" style={{ width: '272px' }}>
            <div className="px-4 py-3 border-b border-amber-100 bg-amber-50 flex items-center gap-2">
              <Lightbulb size={15} className="text-amber-500" />
              <span className="font-semibold text-amber-800 text-sm">Clinical Suggestions</span>
            </div>
            <div className="p-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
              {!selectedAdmission ? (
                <div className="text-xs text-gray-400 text-center py-8">Select a patient to see intelligent suggestions</div>
              ) : suggestions.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-8">No specific protocol suggestions for this diagnosis</div>
              ) : (
                <>
                  <div className="text-xs text-gray-500 mb-3">Based on: <span className="font-medium text-gray-700">{diag || 'admission diagnosis'}</span></div>
                  {suggestions.map((s, i) => {
                    const a = ASSESSMENT_CATALOG.find(x => x.id === s.id)
                    if (!a) return null
                    const Icon = a.Icon
                    const lastEntry = lastNotes[s.id]
                    const hoursAgo = lastEntry ? (Date.now() - new Date(lastEntry.created_at).getTime()) / 3600000 : null
                    return (
                      <div key={i} className="suggestion-card">
                        <div className="flex items-start gap-2 mb-2">
                          <Icon size={13} style={{ color: a.color }} className="mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-gray-800 leading-tight">{a.name}</div>
                            <div className="text-xs text-amber-700 mt-0.5">{s.reason}</div>
                            {lastEntry && <div className="text-xs text-gray-500 mt-0.5">Last: {timeAgo(lastEntry.created_at)}{hoursAgo > 8 && <span className="ml-1 badge-red">Overdue</span>}</div>}
                          </div>
                        </div>
                        <button onClick={() => setOpenAssessment(a)} className="w-full btn-accent btn-xs flex items-center justify-center gap-1"><Plus size={10} /> Start Now</button>
                      </div>
                    )
                  })}
                  <div className="divider mt-3" />
                  <div className="section-header mb-2">Recent Activity</div>
                  {Object.keys(lastNotes).length === 0
                    ? <div className="text-xs text-gray-400">No assessments recorded yet</div>
                    : Object.entries(lastNotes).slice(0, 5).map(([key, note]) => {
                        const a = ASSESSMENT_CATALOG.find(x => x.id === key || x.id.toUpperCase() === key)
                        return (
                          <div key={key} className="flex items-center gap-2 text-xs text-gray-600 mb-1.5">
                            <CheckCircle2 size={11} className="text-green-500 flex-shrink-0" />
                            <span className="truncate">{a?.name || key}</span>
                            <span className="text-gray-400 whitespace-nowrap ml-auto">{timeAgo(note.created_at)}</span>
                          </div>
                        )
                      })
                  }
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {openAssessment && selectedAdmission && (
        <AssessmentModal assessment={openAssessment} admissionId={selectedAdmission.id} onClose={() => setOpenAssessment(null)} onSave={handleSaved} />
      )}
      {openAssessment && !selectedAdmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-sm text-center shadow-2xl">
            <AlertTriangle size={32} className="text-amber-500 mx-auto mb-3" />
            <div className="font-semibold text-gray-800 mb-1">No patient selected</div>
            <p className="text-sm text-gray-500 mb-4">Select a patient from the sidebar first.</p>
            <button onClick={() => setOpenAssessment(null)} className="btn-primary">OK</button>
          </div>
        </div>
      )}
    </div>
  )
}
