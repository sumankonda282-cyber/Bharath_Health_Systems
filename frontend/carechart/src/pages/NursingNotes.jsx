import { useState, useEffect, useCallback } from 'react'
import { Plus, Lock, Search, Filter, ChevronDown, ChevronUp,
  FileText, Clock, User, AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react'
import api from '../api/client'
import { useWardSession } from '../contexts/WardSessionContext'

import { GREEN, NAVY } from '../constants/colors'

const NOTE_TYPES = [
  { value: 'general',     label: 'General Note',      color: '#6b7280' },
  { value: 'assessment',  label: 'Assessment',         color: '#2563eb' },
  { value: 'intervention',label: 'Intervention',       color: GREEN },
  { value: 'handoff',     label: 'Handoff Note',       color: '#d97706' },
  { value: 'incident',    label: 'Incident Report',    color: '#dc2626' },
  { value: 'education',   label: 'Patient Education',  color: '#7c3aed' },
]

const MOCK_PATIENTS = [
  { id: 1, name: 'Ravi Kumar',    bed: 'A-101', diagnosis: 'Post-op Hip Replacement' },
  { id: 2, name: 'Sunita Devi',   bed: 'A-102', diagnosis: 'Gestational Diabetes' },
  { id: 3, name: 'Mohan Sharma',  bed: 'B-201', diagnosis: 'COPD Exacerbation' },
  { id: 4, name: 'Priya Nair',    bed: 'B-202', diagnosis: 'Hypertensive Crisis' },
]

const MOCK_NOTES = [
  { id: 1, patient_id: 1, patient_name: 'Ravi Kumar', bed: 'A-101', note_type: 'assessment', note: 'Patient alert and oriented x3. Pain score 4/10. Wound site clean, no signs of infection. Ambulated 10m with physio support.', nurse_name: 'Nurse Kavitha', created_at: new Date(Date.now() - 3600000).toISOString(), signed: true },
  { id: 2, patient_id: 2, patient_name: 'Sunita Devi', bed: 'A-102', note_type: 'intervention', note: 'Blood glucose 210mg/dL at 08:00. Insulin administered as per sliding scale — 6 units regular insulin SC. Repeat check scheduled at 10:00. Dietary counselling given.', nurse_name: 'Nurse Kavitha', created_at: new Date(Date.now() - 7200000).toISOString(), signed: true },
  { id: 3, patient_id: 3, patient_name: 'Mohan Sharma', bed: 'B-201', note_type: 'general', note: 'SpO2 dropped to 88% at 14:30. O2 via face mask increased to 6L/min. Dr. Patel notified. Patient repositioned. SpO2 recovered to 94% within 10 minutes.', nurse_name: 'Nurse Rekha', created_at: new Date(Date.now() - 10800000).toISOString(), signed: true },
  { id: 4, patient_id: 4, patient_name: 'Priya Nair', bed: 'B-202', note_type: 'handoff', note: 'BP 168/102 at shift end. Antihypertensive given. Patient anxious, family counselled. No chest pain or visual disturbances. Continue BP monitoring every 2 hours.', nurse_name: 'Nurse Rekha', created_at: new Date(Date.now() - 14400000).toISOString(), signed: false },
]

function timeSince(iso) {
  const diff = (Date.now() - new Date(iso)) / 60000
  if (diff < 60) return `${Math.floor(diff)}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return `${Math.floor(diff / 1440)}d ago`
}

function NoteTypeBadge({ type }) {
  const def = NOTE_TYPES.find(t => t.value === type) || NOTE_TYPES[0]
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: `${def.color}20`, color: def.color }}>
      {def.label}
    </span>
  )
}

export default function NursingNotes() {
  const { session } = useWardSession()

  const [notes, setNotes]         = useState(MOCK_NOTES)
  const [patients, setPatients]   = useState(MOCK_PATIENTS)
  const [loading, setLoading]     = useState(false)
  const [search, setSearch]       = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterPatient, setFilterPatient] = useState('all')
  const [expanded, setExpanded]   = useState(null)
  const [addOpen, setAddOpen]     = useState(false)

  // Add note form state
  const [form, setForm]     = useState({ patient_id: '', note_type: 'general', note: '', priority: 'routine' })
  const [pin, setPin]       = useState('')
  const [pinStep, setPinStep] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')

  useEffect(() => {
    if (!session) return
    setLoading(true)
    Promise.all([
      api.get(`/inpatient/admissions/${session.ward_id || ''}/notes`).catch(() => null),
      api.get(`/inpatient/admissions`).catch(() => null),
    ]).then(([notesRes, patientsRes]) => {
      if (notesRes?.length) setNotes(notesRes)
      if (patientsRes?.length) setPatients(patientsRes)
    }).finally(() => setLoading(false))
  }, [session])

  const filtered = notes.filter(n => {
    const matchSearch = !search || n.patient_name?.toLowerCase().includes(search.toLowerCase()) || n.note?.toLowerCase().includes(search.toLowerCase())
    const matchType   = filterType === 'all' || n.note_type === filterType
    const matchPat    = filterPatient === 'all' || String(n.patient_id) === filterPatient
    return matchSearch && matchType && matchPat
  })

  const handleSave = async () => {
    if (!form.patient_id || !form.note.trim()) { setSaveErr('Select a patient and enter a note.'); return }
    if (!pin) { setPinStep(true); setSaveErr('Enter your PIN to sign the note.'); return }
    setSaveErr('')
    setSaving(true)
    try {
      const patient = patients.find(p => String(p.id) === String(form.patient_id))
      const newNote = {
        id: Date.now(),
        patient_id:   form.patient_id,
        patient_name: patient?.name || '',
        bed:          patient?.bed || '',
        note_type:    form.note_type,
        note:         form.note,
        nurse_name:   session?.nurse_name || 'Nurse',
        created_at:   new Date().toISOString(),
        signed:       true,
      }
      await api.post('/inpatient/notes', { admission_id: form.patient_id, ...form }).catch(() => {})
      setNotes(prev => [newNote, ...prev])
      setForm({ patient_id: '', note_type: 'general', note: '', priority: 'routine' })
      setAddOpen(false)
    } catch {
      setSaveErr('Failed to save note.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Nursing Notes</h1>
          <p className="text-xs text-gray-500 mt-0.5">{filtered.length} notes</p>
        </div>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: GREEN }}>
          <Plus size={16} /> Add Note
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-green-700" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm focus:outline-none">
          <option value="all">All Types</option>
          {NOTE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filterPatient} onChange={e => setFilterPatient(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm focus:outline-none">
          <option value="all">All Patients</option>
          {patients.map(p => <option key={p.id} value={String(p.id)}>{p.name} — {p.bed}</option>)}
        </select>
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No notes found</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(note => (
            <div key={note.id} className="card bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <button className="w-full text-left px-5 py-4" onClick={() => setExpanded(expanded === note.id ? null : note.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100">
                      <FileText size={16} className="text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">{note.patient_name}</span>
                        <span className="text-xs text-gray-400">Bed {note.bed}</span>
                        <NoteTypeBadge type={note.note_type} />
                        {note.signed
                          ? <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium"><CheckCircle2 size={11} /> Signed</span>
                          : <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium"><AlertTriangle size={11} /> Unsigned</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">{note.note}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-gray-500 flex items-center gap-1"><User size={11} />{note.nurse_name}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Clock size={11} />{timeSince(note.created_at)}</div>
                    </div>
                    {expanded === note.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>
              </button>

              {expanded === note.id && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{note.note}</p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><User size={11} />{note.nurse_name}</span>
                    <span className="flex items-center gap-1"><Clock size={11} />{new Date(note.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Note Drawer */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          onClick={() => setAddOpen(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-gray-900">Add Nursing Note</h2>
              <button onClick={() => setAddOpen(false)}><X size={18} className="text-gray-400" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Patient *</label>
                <select value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700">
                  <option value="">Select patient…</option>
                  {patients.map(p => <option key={p.id} value={String(p.id)}>{p.name} — Bed {p.bed}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Note Type</label>
                <div className="flex flex-wrap gap-2">
                  {NOTE_TYPES.map(t => (
                    <button key={t.value} onClick={() => setForm(f => ({ ...f, note_type: t.value }))}
                      className="px-3 py-1 rounded-lg text-xs font-semibold border transition-colors"
                      style={form.note_type === t.value
                        ? { background: t.color, color: '#fff', borderColor: t.color }
                        : { background: 'transparent', color: t.color, borderColor: `${t.color}50` }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Note *</label>
                <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  rows={5} placeholder="Document your clinical observation, intervention, or assessment…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 resize-none" />
              </div>

              {saveErr && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
                  <AlertTriangle size={14} />{saveErr}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input type="password" value={pin} onChange={e => setPin(e.target.value)}
                  placeholder="PIN" maxLength={6}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-24 tracking-widest focus:outline-none focus:ring-2 focus:ring-green-700" />
                <button onClick={handleSave} disabled={saving || !pin}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: GREEN }}>
                  {saving ? <><Loader2 size={15} className="animate-spin" />Saving…</> : <><Lock size={15} />Sign & Save Note</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
