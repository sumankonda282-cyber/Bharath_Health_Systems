import { useState, useEffect, useCallback } from 'react'
import { Plus, Lock, Search, ChevronDown, ChevronUp,
  FileText, Clock, User, AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react'
import api from '../../../api/client'

import { GREEN } from '@shared/constants/colors'

const NOTE_TYPES = [
  { value: 'general',     label: 'General Note',      color: '#6b7280' },
  { value: 'assessment',  label: 'Assessment',         color: '#2563eb' },
  { value: 'intervention',label: 'Intervention',       color: GREEN },
  { value: 'handoff',     label: 'Handoff Note',       color: '#d97706' },
  { value: 'incident',    label: 'Incident Report',    color: '#dc2626' },
  { value: 'education',   label: 'Patient Education',  color: '#7c3aed' },
]

function timeSince(iso) {
  if (!iso) return ''
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

export default function NursingNotes({ admission }) {
  const admissionId = admission?.id

  const [notes, setNotes]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterType, setFilterType] = useState('all')
  const [expanded, setExpanded]   = useState(null)
  const [addOpen, setAddOpen]     = useState(false)

  // Add note form
  const [form, setForm]     = useState({ note_type: 'general', note: '' })
  const [pin, setPin]       = useState('')
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')

  const load = useCallback(async () => {
    if (!admissionId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await api.get(`/inpatient/admissions/${admissionId}/notes`)
      setNotes(Array.isArray(res) ? res : [])
    } catch {
      setNotes([])
    } finally { setLoading(false) }
  }, [admissionId])

  useEffect(() => { load() }, [load])

  const filtered = notes.filter(n => {
    const matchSearch = !search || n.note_text?.toLowerCase().includes(search.toLowerCase())
    const matchType   = filterType === 'all' || n.note_type === filterType
    return matchSearch && matchType
  })

  const handleSave = async () => {
    if (!form.note.trim()) { setSaveErr('Enter a note.'); return }
    if (!pin) { setSaveErr('Enter your PIN to sign the note.'); return }
    setSaveErr('')
    setSaving(true)
    try {
      // PIN re-verifies the signing clinician (sensitive clinical action)
      try {
        await api.post('/auth/staff/pin-identify', { pin })
      } catch {
        setSaveErr('Invalid PIN')
        setSaving(false)
        return
      }
      await api.post(`/inpatient/admissions/${admissionId}/notes`, {
        note_text: form.note,
        note_type: form.note_type,
        is_handoff: form.note_type === 'handoff',
      })
      setForm({ note_type: 'general', note: '' })
      setPin('')
      setAddOpen(false)
      await load()
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
        <button onClick={() => setAddOpen(true)} disabled={!admissionId}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
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
      </div>

      {/* Notes list */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          {notes.length === 0 ? 'No nursing notes recorded yet' : 'No notes match your filters'}
        </div>
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
                        <NoteTypeBadge type={note.note_type} />
                        {note.is_handoff && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                            <AlertTriangle size={11} /> Handoff
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                          <CheckCircle2 size={11} /> Signed
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 truncate max-w-md">{note.note_text}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-gray-500 flex items-center gap-1"><User size={11} />{note.written_by_name || 'Staff'}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Clock size={11} />{timeSince(note.written_at || note.created_at)}</div>
                    </div>
                    {expanded === note.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>
              </button>

              {expanded === note.id && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{note.note_text}</p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><User size={11} />{note.written_by_name || 'Staff'}</span>
                    <span className="flex items-center gap-1"><Clock size={11} />
                      {note.written_at || note.created_at
                        ? new Date(note.written_at || note.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                        : '—'}
                    </span>
                    {note.shift && <span className="capitalize">{note.shift} shift</span>}
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
