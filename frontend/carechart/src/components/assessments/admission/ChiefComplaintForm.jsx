import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Plus, X, Search } from 'lucide-react'
import api from '../../../api/client'
import MedicalTextArea from '../../MedicalTextArea'

const DURATION_UNITS = ['min', 'hr', 'day', 'wk', 'mo', 'yr']
const ONSET_OPTS    = ['Sudden', 'Gradual']
const COURSE_OPTS   = ['Progressive', 'Static', 'Intermittent', 'Improving', 'Worsening']
const SEVERITY_OPTS = ['Mild', 'Moderate', 'Severe']
const ARRIVAL_OPTS  = ['Walk-in', 'Wheelchair', 'Stretcher', 'Ambulance', 'Transferred']
const REFERRAL_OPTS = ['Self', 'GP', 'Specialist', 'ER', 'Other']

function newComplaint() {
  return { id: Date.now(), complaint: '', duration_value: '', duration_unit: 'day', onset: '', course: '', severity: '' }
}

function buildHPI(complaints, arrival, referral) {
  const filled = complaints.filter(c => c.complaint.trim())
  if (!filled.length) return ''
  const parts = filled.map(c => {
    let s = c.complaint
    if (c.duration_value) s += ` for ${c.duration_value} ${c.duration_unit}`
    if (c.severity) s += ` (${c.severity.toLowerCase()})`
    if (c.onset) s += `, ${c.onset.toLowerCase()} onset`
    if (c.course) s += `, ${c.course.toLowerCase()} course`
    return s
  })
  let hpi = `Patient presents with ${parts.join('; ')}.`
  if (arrival && arrival !== 'Walk-in') hpi += ` Arrived by ${arrival.toLowerCase()}.`
  if (referral && referral !== 'Self') hpi += ` Referred by ${referral}.`
  return hpi
}

// ── Complaint search ──────────────────────────────────────────────────────────

function ComplaintSearch({ value, onChange }) {
  const [query, setQuery]   = useState(value || '')
  const [results, setResults] = useState([])
  const [open, setOpen]     = useState(false)
  const timer   = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => { setQuery(value || '') }, [value])

  useEffect(() => {
    const close = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const search = (q) => {
    clearTimeout(timer.current)
    setQuery(q)
    onChange(q)
    if (!q.trim()) { setResults([]); setOpen(false); return }
    timer.current = setTimeout(async () => {
      try {
        const data = await api.get(`/terminology/search?q=${encodeURIComponent(q)}&category=symptom&limit=10`)
        const list = Array.isArray(data) ? data : (data.items || [])
        setResults(list)
        setOpen(list.length > 0)
      } catch {
        setResults([])
        setOpen(false)
      }
    }, 300)
  }

  const select = (term) => {
    onChange(term.display)
    setQuery(term.display)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text" value={query}
          onChange={e => search(e.target.value)}
          onFocus={() => query && results.length && setOpen(true)}
          placeholder="Search symptom or condition…"
          className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>
      {open && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto text-sm">
          {results.map((r, i) => (
            <li key={i} onMouseDown={() => select(r)}
              className="px-3 py-2 cursor-pointer hover:bg-amber-50 border-b border-gray-50 last:border-0">
              <span className="font-medium">{r.display}</span>
              {r.synonyms && (
                <span className="text-gray-400 ml-2 text-xs">{r.synonyms.split('|')[0]}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Pill row helper ───────────────────────────────────────────────────────────

function Pills({ opts, value, onToggle }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opts.map(o => (
        <button key={o} type="button" onClick={() => onToggle(o)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            value === o
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
          }`}>{o}</button>
      ))}
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────────────────────

export default function ChiefComplaintForm({ admission, onClose, onSaved }) {
  const [complaints, setComplaints] = useState([newComplaint()])
  const [arrival,  setArrival]  = useState('')
  const [referral, setReferral] = useState('')
  const [hpi,      setHpi]      = useState('')
  const [hpiEdited, setHpiEdited] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => {
    if (!hpiEdited) setHpi(buildHPI(complaints, arrival, referral))
  }, [complaints, arrival, referral, hpiEdited])

  const setField = (id, field, val) =>
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c))

  const toggle = (id, field, val) =>
    setField(id, field, (complaints.find(c => c.id === id)?.[field] === val ? '' : val))

  const handleSave = async () => {
    const filled = complaints.filter(c => c.complaint.trim())
    if (!filled.length) { setError('Add at least one complaint.'); return }
    setSaving(true); setError('')
    const payload = {
      type: 'chief_complaint',
      complaints: filled.map(({ id, ...rest }) => rest),
      mode_of_arrival: arrival,
      referred_by: referral,
      hpi,
    }
    try {
      await api.post(`/inpatient/admissions/${admission.id}/notes`, {
        note_type: 'assessment',
        note_text: JSON.stringify(payload),
      })
      onSaved?.()
    } catch (e) {
      setError(e?.message || 'Save failed')
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Badge */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-100 rounded-lg">
            <MessageSquare size={16} className="text-amber-600" />
          </div>
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">[A] Chief Complaint</span>
        </div>

        {/* Complaints */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-700">Presenting Complaints</h3>
            <button type="button" onClick={() => setComplaints(p => [...p, newComplaint()])}
              className="flex items-center gap-1 text-xs font-medium text-amber-600 border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-50">
              <Plus size={12} /> Add Complaint
            </button>
          </div>

          <div className="space-y-4">
            {complaints.map((c, idx) => (
              <div key={c.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50 relative">
                {complaints.length > 1 && (
                  <button type="button"
                    onClick={() => setComplaints(p => p.filter(x => x.id !== c.id))}
                    className="absolute top-3 right-3 text-gray-300 hover:text-red-400">
                    <X size={14} />
                  </button>
                )}
                <p className="text-xs font-semibold text-gray-400 mb-3">Complaint {idx + 1}</p>

                <ComplaintSearch value={c.complaint} onChange={v => setField(c.id, 'complaint', v)} />

                {/* Duration */}
                <div className="mt-3">
                  <p className="text-xs text-gray-500 font-medium mb-1.5">Duration</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="number" min="1" value={c.duration_value}
                      onChange={e => setField(c.id, 'duration_value', e.target.value)}
                      placeholder="e.g. 3"
                      className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    {DURATION_UNITS.map(u => (
                      <button key={u} type="button"
                        onClick={() => setField(c.id, 'duration_unit', u)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                          c.duration_unit === u
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
                        }`}>{u}</button>
                    ))}
                  </div>
                </div>

                {/* Onset + Severity */}
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1.5">Onset</p>
                    <Pills opts={ONSET_OPTS} value={c.onset} onToggle={v => toggle(c.id, 'onset', v)} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1.5">Severity</p>
                    <Pills opts={SEVERITY_OPTS} value={c.severity} onToggle={v => toggle(c.id, 'severity', v)} />
                  </div>
                </div>

                {/* Course */}
                <div className="mt-3">
                  <p className="text-xs text-gray-500 font-medium mb-1.5">Course</p>
                  <Pills opts={COURSE_OPTS} value={c.course} onToggle={v => toggle(c.id, 'course', v)} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Mode of Arrival */}
        <section>
          <h3 className="text-sm font-bold text-gray-700 mb-2">Mode of Arrival</h3>
          <div className="flex flex-wrap gap-2">
            {ARRIVAL_OPTS.map(o => (
              <button key={o} type="button"
                onClick={() => setArrival(v => v === o ? '' : o)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  arrival === o
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
                }`}>{o}</button>
            ))}
          </div>
        </section>

        {/* Referred By */}
        <section>
          <h3 className="text-sm font-bold text-gray-700 mb-2">Referred By</h3>
          <div className="flex flex-wrap gap-2">
            {REFERRAL_OPTS.map(o => (
              <button key={o} type="button"
                onClick={() => setReferral(v => v === o ? '' : o)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  referral === o
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
                }`}>{o}</button>
            ))}
          </div>
        </section>

        {/* HPI */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-gray-700">History of Presenting Illness (HPI)</h3>
            {hpiEdited && (
              <button type="button"
                onClick={() => { setHpiEdited(false); setHpi(buildHPI(complaints, arrival, referral)) }}
                className="text-xs text-amber-500 hover:text-amber-700">
                Auto-generate
              </button>
            )}
          </div>
          <MedicalTextArea
            rows={4} value={hpi}
            onChange={e => { setHpi(e.target.value); setHpiEdited(true) }}
            placeholder="Auto-generates from complaints above. Edit to customise."
            categories="symptom,condition,anatomy,exam_finding"
          />
        </section>

        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4 flex justify-end gap-3">
        <button type="button" onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="px-5 py-2 text-sm font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
