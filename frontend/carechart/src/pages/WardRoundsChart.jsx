import { useState, useEffect, useRef } from 'react'
import {
  Stethoscope, FileText, FlaskConical, ImageIcon, Pill,
  ClipboardList, ArrowRightLeft, ChevronDown, ChevronUp,
  CheckCircle, Clock, AlertTriangle, PlusCircle, X,
  Activity,
} from 'lucide-react'
import api from '../api/client'

// ── Formatting helpers ──────────────────────────────────────────────────────

function fmt(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function fmtDate(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtTime(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function dayKey(ts) {
  if (!ts) return 'unknown'
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function priorityColor(p) {
  if (p === 'stat') return '#dc2626'
  if (p === 'urgent') return '#d97706'
  return '#6b7280'
}

// ── Filter types ─────────────────────────────────────────────────────────────

const FILTER_TYPES = [
  { key: 'ward_round',     label: 'Doctor Notes' },
  { key: 'progress_note',  label: 'Progress Notes' },
  { key: 'nursing_note',   label: 'Nurse Notes' },
  { key: 'lab_order',      label: 'Lab Results' },
  { key: 'imaging_order',  label: 'Imaging Results' },
  { key: 'medication_order', label: 'Medications' },
  { key: 'clinical_order', label: 'Orders' },
  { key: 'transfer',       label: 'Transfers' },
]

// ── Entry renderers ───────────────────────────────────────────────────────────

function WardRoundEntry({ entry }) {
  const [open, setOpen] = useState(true)
  const noteText = [entry.subjective, entry.objective, entry.assessment, entry.plan].filter(Boolean).join('\n\n')
  return (
    <div className="border border-blue-100 rounded-lg bg-blue-50/40 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-blue-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Stethoscope size={13} className="text-blue-600 shrink-0" />
          <span className="text-[12px] font-semibold text-blue-900">{entry.doctor_name}</span>
          <span className="text-[11px] text-gray-500">Ward Round · {fmtTime(entry.timestamp)}</span>
        </div>
        {open ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-3 pb-3 pt-2 border-t border-blue-100">
          {noteText
            ? <p className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap">{noteText}</p>
            : <span className="text-[11px] text-gray-400 italic">No notes recorded</span>
          }
        </div>
      )}
    </div>
  )
}

function NursingNoteEntry({ entry }) {
  return (
    <div className="border border-gray-100 rounded-lg bg-gray-50/50 px-3 py-2">
      <div className="flex items-center gap-2 mb-1">
        <FileText size={12} className="text-gray-400 shrink-0" />
        <span className="text-[11px] font-semibold text-gray-600">{entry.written_by_name}</span>
        {entry.note_type && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 font-medium uppercase">
            {entry.note_type}
          </span>
        )}
        {entry.is_handoff && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">Handoff</span>
        )}
        <span className="text-[10px] text-gray-400 ml-auto">{fmtTime(entry.timestamp)}</span>
      </div>
      <p className="text-[11px] text-gray-600 leading-relaxed whitespace-pre-wrap">{entry.note_text}</p>
    </div>
  )
}

function ProgressNoteEntry({ entry }) {
  const [open, setOpen] = useState(true)
  const noteText = [entry.subjective, entry.objective, entry.assessment, entry.plan].filter(Boolean).join('\n\n')
  return (
    <div className="border border-purple-100 rounded-lg bg-purple-50/30 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-purple-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText size={13} className="text-purple-500 shrink-0" />
          <span className="text-[12px] font-semibold text-purple-900">{entry.written_by_name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium uppercase">
            {entry.note_type || 'Progress'}
          </span>
          <span className="text-[11px] text-gray-500">· {fmtTime(entry.timestamp)}</span>
        </div>
        {open ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-3 pb-3 pt-2 border-t border-purple-100">
          {noteText
            ? <p className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap">{noteText}</p>
            : <span className="text-[11px] text-gray-400 italic">No content</span>
          }
        </div>
      )}
    </div>
  )
}

function LabOrderEntry({ entry, admissionId, onAcknowledge }) {
  const r = entry.result
  const hasResult = !!r
  const isAbnormal = hasResult && (r.observations || []).some(o => o.flag && o.flag !== 'N' && o.flag !== '')
  const isPending = hasResult && r.status === 'pending_review'
  const isAcknowledged = hasResult && !!r.acknowledged_at

  return (
    <div className={`border rounded-lg overflow-hidden ${isAbnormal ? 'border-red-200 bg-red-50/30' : 'border-emerald-100 bg-emerald-50/30'}`}>
      <div className="px-3 py-2 flex items-start gap-2">
        <FlaskConical size={13} className={`mt-0.5 shrink-0 ${isAbnormal ? 'text-red-500' : 'text-emerald-600'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-[12px] font-semibold text-gray-800">{(entry.test_names || []).join(', ') || entry.order_id}</span>
            <span className="text-[10px] text-gray-400">{entry.order_id}</span>
            {entry.priority !== 'routine' && (
              <span className="text-[10px] font-bold" style={{ color: priorityColor(entry.priority) }}>
                {entry.priority.toUpperCase()}
              </span>
            )}
            <span className="text-[10px] text-gray-400 ml-auto">{fmtTime(entry.timestamp)}</span>
          </div>
          <div className="text-[10px] text-gray-500">Ordered by {entry.ordered_by_name}</div>

          {!hasResult && (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-400">
              <Clock size={11} /> Awaiting result
            </div>
          )}

          {hasResult && (
            <div className="mt-2 space-y-1">
              {(r.observations || []).length > 0 && (
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-200">
                      <th className="text-left py-0.5 font-medium">Test</th>
                      <th className="text-right py-0.5 font-medium">Value</th>
                      <th className="text-right py-0.5 font-medium">Ref</th>
                      <th className="text-center py-0.5 font-medium">Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.observations.map((obs, i) => {
                      const flagColor = obs.flag === 'HH' || obs.flag === 'LL' ? '#dc2626'
                        : obs.flag === 'H' || obs.flag === 'L' ? '#d97706' : '#374151'
                      return (
                        <tr key={i} className={`border-b border-gray-100 ${obs.flag && obs.flag !== 'N' ? 'bg-red-50' : ''}`}>
                          <td className="py-0.5 text-gray-700">{obs.test_name}</td>
                          <td className="py-0.5 text-right font-medium" style={{ color: obs.flag && obs.flag !== 'N' ? '#dc2626' : '#111827' }}>
                            {obs.value} {obs.unit}
                          </td>
                          <td className="py-0.5 text-right text-gray-400">{obs.ref_range}</td>
                          <td className="py-0.5 text-center font-bold text-[10px]" style={{ color: flagColor }}>{obs.flag}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
              {r.interpretation && (
                <div className="text-[11px] text-gray-600 italic mt-1">{r.interpretation}</div>
              )}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {isPending && !isAcknowledged && (
                  <button
                    onClick={() => onAcknowledge('lab', r.id)}
                    className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors"
                  >
                    <Clock size={10} /> Pending Review — Acknowledge
                  </button>
                )}
                {isAcknowledged && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                    <CheckCircle size={11} /> Acknowledged by {r.acknowledged_by_name} at {fmtTime(r.acknowledged_at)}
                  </span>
                )}
                {r.has_pdf && (
                  <button
                    onClick={() => {
                      const w = window.open('', '_blank')
                      w.document.write(`<iframe src="data:application/pdf;base64,${r.pdf_b64}" style="width:100%;height:100vh;border:none;"/>`)
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-800 underline"
                  >
                    View PDF
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ImagingOrderEntry({ entry, admissionId, onAcknowledge }) {
  const r = entry.result
  const hasResult = !!r
  const isPending = hasResult && r.status === 'pending_review'
  const isAcknowledged = hasResult && !!r.acknowledged_at

  return (
    <div className="border border-indigo-100 rounded-lg bg-indigo-50/30 overflow-hidden">
      <div className="px-3 py-2 flex items-start gap-2">
        <ImageIcon size={13} className="mt-0.5 shrink-0 text-indigo-500" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-[12px] font-semibold text-gray-800">
              {[entry.modality, entry.body_part, entry.study_description].filter(Boolean).join(' — ') || entry.order_id}
            </span>
            <span className="text-[10px] text-gray-400">{entry.order_id}</span>
            {entry.priority !== 'routine' && (
              <span className="text-[10px] font-bold" style={{ color: priorityColor(entry.priority) }}>
                {entry.priority.toUpperCase()}
              </span>
            )}
            <span className="text-[10px] text-gray-400 ml-auto">{fmtTime(entry.timestamp)}</span>
          </div>
          <div className="text-[10px] text-gray-500">Ordered by {entry.ordered_by_name}</div>

          {!hasResult && (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-gray-400">
              <Clock size={11} /> Awaiting report
            </div>
          )}

          {hasResult && (
            <div className="mt-2 space-y-1">
              {r.findings && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mr-1">Findings</span>
                  <span className="text-[11px] text-gray-700 whitespace-pre-wrap">{r.findings}</span>
                </div>
              )}
              {r.impression && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-400 mr-1">Impression</span>
                  <span className="text-[11px] text-indigo-900 font-medium whitespace-pre-wrap">{r.impression}</span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {isPending && !isAcknowledged && (
                  <button
                    onClick={() => onAcknowledge('imaging', r.id)}
                    className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors"
                  >
                    <Clock size={10} /> Pending Review — Acknowledge
                  </button>
                )}
                {isAcknowledged && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-600">
                    <CheckCircle size={11} /> Acknowledged by {r.acknowledged_by_name} at {fmtTime(r.acknowledged_at)}
                  </span>
                )}
                {r.has_pdf && (
                  <button
                    onClick={() => {
                      const w = window.open('', '_blank')
                      w.document.write(`<iframe src="data:application/pdf;base64,${r.pdf_b64}" style="width:100%;height:100vh;border:none;"/>`)
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-800 underline"
                  >
                    View PDF
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MedicationOrderEntry({ entry }) {
  return (
    <div className="border border-orange-100 rounded-lg bg-orange-50/30 px-3 py-2">
      <div className="flex items-start gap-2">
        <Pill size={12} className="mt-0.5 shrink-0 text-orange-500" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-[12px] font-semibold text-gray-800">{entry.drug_name}</span>
            {entry.generic_name && entry.generic_name !== entry.drug_name && (
              <span className="text-[10px] text-gray-400">({entry.generic_name})</span>
            )}
            {entry.status === 'discontinued' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">Discontinued</span>
            )}
            {entry.is_stat && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">STAT</span>
            )}
            {entry.is_prn && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 font-medium">PRN</span>
            )}
            <span className="text-[10px] text-gray-400 ml-auto">{fmtTime(entry.timestamp)}</span>
          </div>
          <div className="text-[11px] text-gray-600">
            {[entry.dose, entry.route, entry.frequency, entry.duration_days ? `${entry.duration_days}d` : null]
              .filter(Boolean).join(' · ')}
          </div>
          {entry.instructions && (
            <div className="text-[11px] text-gray-500 mt-0.5 italic">{entry.instructions}</div>
          )}
          {entry.discontinued_at && (
            <div className="text-[11px] text-red-500 mt-0.5">
              Stopped {fmt(entry.discontinued_at)}{entry.discontinue_reason ? ` — ${entry.discontinue_reason}` : ''}
            </div>
          )}
          <div className="text-[10px] text-gray-400 mt-0.5">Ordered by {entry.ordered_by_name}</div>
        </div>
      </div>
    </div>
  )
}

function ClinicalOrderEntry({ entry }) {
  const statusColor = entry.status === 'completed' ? '#059669'
    : entry.status === 'cancelled' ? '#dc2626'
    : entry.status === 'in_progress' ? '#2563eb'
    : '#6b7280'
  return (
    <div className="border border-gray-200 rounded-lg bg-white px-3 py-2">
      <div className="flex items-start gap-2">
        <ClipboardList size={12} className="mt-0.5 shrink-0 text-gray-400" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{entry.order_type}</span>
            <span className="text-[12px] text-gray-800">{entry.order_detail}</span>
            <span className="text-[10px] font-medium ml-auto" style={{ color: statusColor }}>
              {entry.status}
            </span>
            <span className="text-[10px] text-gray-400">{fmtTime(entry.timestamp)}</span>
          </div>
          {entry.instructions && (
            <div className="text-[11px] text-gray-500 italic">{entry.instructions}</div>
          )}
          <div className="text-[10px] text-gray-400 mt-0.5">Ordered by {entry.ordered_by_name}</div>
        </div>
      </div>
    </div>
  )
}

function TransferEntry({ entry }) {
  return (
    <div className="border border-gray-200 rounded-lg bg-gray-50 px-3 py-2">
      <div className="flex items-center gap-2">
        <ArrowRightLeft size={12} className="text-gray-400 shrink-0" />
        <span className="text-[12px] text-gray-700">Patient transferred</span>
        {entry.reason && <span className="text-[11px] text-gray-500">— {entry.reason}</span>}
        <span className="text-[10px] text-gray-400 ml-auto">by {entry.transferred_by_name} · {fmtTime(entry.timestamp)}</span>
      </div>
    </div>
  )
}

// ── New Ward Round note modal ─────────────────────────────────────────────────

function NewRoundModal({ admission, onClose, onSaved }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!note.trim()) { setError('Note cannot be empty.'); return }
    setSaving(true)
    setError(null)
    try {
      await api.post(`/inpatient/admissions/${admission.id}/rounds`, {
        round_date: new Date().toISOString(),
        assessment: note.trim(),
      })
      onSaved()
      onClose()
    } catch {
      setError('Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-[14px] font-bold text-gray-900 flex items-center gap-2">
            <Stethoscope size={16} className="text-blue-600" /> New Ward Round Note
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="p-5">
          <textarea
            rows={7}
            autoFocus
            className="w-full text-[13px] border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-blue-400"
            placeholder="Enter ward round note…"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          {error && <div className="text-[11px] text-red-600 mt-1">{error}</div>}
        </form>
        <div className="flex gap-2 px-5 py-3 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 text-[12px] py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 text-[12px] py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Vitals inline modal ───────────────────────────────────────────────────

function AddVitalsModal({ admission, onClose, onSaved }) {
  const [form, setForm] = useState({
    bp_systolic: '', bp_diastolic: '', pulse: '', temperature: '',
    respiration_rate: '', spo2: '', weight: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    const payload = Object.fromEntries(
      Object.entries(form).filter(([, v]) => v !== '').map(([k, v]) => [k, isNaN(Number(v)) ? v : Number(v)])
    )
    if (Object.keys(payload).length === 0) { setError('Enter at least one value.'); return }
    setSaving(true)
    setError(null)
    try {
      await api.post(`/inpatient/admissions/${admission.id}/vitals`, {
        ...payload,
        recorded_at: new Date().toISOString(),
      })
      onSaved()
      onClose()
    } catch {
      setError('Failed to save vitals.')
    } finally {
      setSaving(false)
    }
  }

  const num = (label, key, unit) => (
    <div>
      <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">{label} {unit && <span className="text-gray-400">({unit})</span>}</label>
      <input
        type="number"
        className="w-full text-[12px] border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-[14px] font-bold text-gray-900 flex items-center gap-2">
            <Activity size={15} className="text-emerald-600" /> Record Vitals
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="p-4 grid grid-cols-2 gap-3">
          {num('BP Systolic', 'bp_systolic', 'mmHg')}
          {num('BP Diastolic', 'bp_diastolic', 'mmHg')}
          {num('Heart Rate', 'pulse', 'bpm')}
          {num('Temperature', 'temperature', '°C')}
          {num('RR', 'respiration_rate', '/min')}
          {num('SpO2', 'spo2', '%')}
          {num('Weight', 'weight', 'kg')}
          <div className="col-span-2">
            <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">Notes</label>
            <input
              type="text"
              className="w-full text-[12px] border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-blue-400"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
          {error && <div className="col-span-2 text-[11px] text-red-600">{error}</div>}
          <button type="button" onClick={onClose}
            className="col-span-1 text-[12px] py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="col-span-1 text-[12px] py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Vitals strip ──────────────────────────────────────────────────────────────

function VitalsStrip({ vitals, onAddVitals }) {
  const latest = vitals && vitals[0]
  const filterRef = useRef(null)

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-gray-100 overflow-x-auto">
      {!latest ? (
        <span className="text-[11px] text-gray-400 italic">No vitals recorded</span>
      ) : (
        <>
          {latest.bp_systolic != null && (
            <VitalChip label="BP" value={`${latest.bp_systolic}/${latest.bp_diastolic}`} unit="mmHg" />
          )}
          {latest.pulse != null && <VitalChip label="HR" value={latest.pulse} unit="bpm" />}
          {latest.temperature != null && <VitalChip label="Temp" value={latest.temperature} unit="°C" />}
          {latest.spo2 != null && <VitalChip label="SpO2" value={`${latest.spo2}%`} />}
          {latest.respiration_rate != null && <VitalChip label="RR" value={latest.respiration_rate} unit="/min" />}
          {latest.weight != null && <VitalChip label="Wt" value={latest.weight} unit="kg" />}
          <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
            {fmt(latest.recorded_at)}
          </span>
        </>
      )}
      <div className="ml-auto shrink-0">
        <button
          onClick={onAddVitals}
          className="text-[11px] text-emerald-600 hover:text-emerald-800 font-medium whitespace-nowrap"
        >
          + Add Vitals
        </button>
      </div>
    </div>
  )
}

function VitalChip({ label, value, unit }) {
  return (
    <div className="flex items-baseline gap-0.5 shrink-0">
      <span className="text-[10px] font-semibold text-gray-400 uppercase">{label}</span>
      <span className="text-[13px] font-bold text-gray-800 ml-1">{value}</span>
      {unit && <span className="text-[9px] text-gray-400">{unit}</span>}
    </div>
  )
}

// ── Patient header strip ──────────────────────────────────────────────────────

function PatientHeader({ admission, patient, vitals, onAddVitals, onShowAdmForm }) {
  const acuityColor = { critical: '#dc2626', high: '#d97706', medium: '#2563eb', low: '#059669' }
  const acuity = admission?.acuity_level

  return (
    <div className="border-b border-gray-200 bg-white">
      {/* Identity row */}
      <div className="flex items-center gap-3 px-4 py-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-bold text-gray-900 truncate">
              {patient?.full_name || admission?.patient_name || 'Patient'}
            </span>
            {patient?.gender && (
              <span className="text-[11px] text-gray-500">{patient.gender}</span>
            )}
            {patient?.age_years != null && (
              <span className="text-[11px] text-gray-500">{patient.age_years}y</span>
            )}
            {acuity && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                style={{ background: acuityColor[acuity] + '20', color: acuityColor[acuity] }}>
                {acuity}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-0.5 flex-wrap">
            {admission?.ip_number && <span>IP# {admission.ip_number}</span>}
            {admission?.encounter_no && <span>Enc# {admission.encounter_no}</span>}
            {(admission?.ward_name || admission?.bed_number) && (
              <span>{admission.ward_name}{admission.bed_number ? ` · Bed ${admission.bed_number}` : ''}</span>
            )}
            {admission?.primary_doctor_name && <span>Dr. {admission.primary_doctor_name}</span>}
          </div>
        </div>
        <button
          onClick={onShowAdmForm}
          title="Admission Form"
          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ClipboardList size={15} />
        </button>
      </div>
      {/* Vitals strip */}
      <VitalsStrip vitals={vitals} onAddVitals={onAddVitals} />
    </div>
  )
}

// ── Filter dropdown ───────────────────────────────────────────────────────────

function FilterDropdown({ activeFilters, onChange, onClose, anchorRef }) {
  const all = activeFilters.length === 0 || activeFilters.length === FILTER_TYPES.length

  function toggle(key) {
    if (all) {
      onChange(FILTER_TYPES.map(f => f.key).filter(k => k !== key))
    } else if (activeFilters.includes(key)) {
      const next = activeFilters.filter(k => k !== key)
      onChange(next.length === 0 ? [] : next)
    } else {
      onChange([...activeFilters, key])
    }
  }

  return (
    <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-xl p-2 w-44">
      <div className="flex items-center justify-between px-2 py-1 mb-1">
        <span className="text-[11px] font-bold text-gray-700">Filter entries</span>
        <button
          onClick={() => onChange([])}
          className="text-[10px] text-blue-600 hover:text-blue-800 font-medium"
        >
          Show all
        </button>
      </div>
      {FILTER_TYPES.map(ft => {
        const checked = all || activeFilters.includes(ft.key)
        return (
          <label key={ft.key} className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(ft.key)}
              className="accent-blue-600 w-3.5 h-3.5"
            />
            <span className="text-[12px] text-gray-700">{ft.label}</span>
          </label>
        )
      })}
    </div>
  )
}

// ── Main WardRoundsChart ──────────────────────────────────────────────────────

export default function WardRoundsChart({ admission, patient, vitals, onVitalsAdded, onShowAdmForm }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeFilters, setActiveFilters] = useState([])  // empty = show all
  const [showFilter, setShowFilter] = useState(false)
  const [showNewRound, setShowNewRound] = useState(false)
  const [showAddVitals, setShowAddVitals] = useState(false)
  const filterBtnRef = useRef(null)
  const filterDropRef = useRef(null)

  async function load() {
    if (!admission?.id) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get(`/inpatient/admissions/${admission.id}/chart-timeline`)
      setEntries(data)
    } catch {
      setError('Failed to load timeline.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [admission?.id])

  // Close filter dropdown on outside click
  useEffect(() => {
    if (!showFilter) return
    function handler(e) {
      if (filterBtnRef.current?.contains(e.target) || filterDropRef.current?.contains(e.target)) return
      setShowFilter(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showFilter])

  async function acknowledge(kind, resultId) {
    try {
      if (kind === 'lab') {
        await api.post(`/inpatient/admissions/${admission.id}/lab-results/${resultId}/acknowledge`)
      } else {
        await api.post(`/inpatient/admissions/${admission.id}/imaging-results/${resultId}/acknowledge`)
      }
      load()
    } catch {
      // acknowledge silently fails — reload still shows state
    }
  }

  // Group by day
  const filtered = activeFilters.length === 0
    ? entries
    : entries.filter(e => activeFilters.includes(e.type))

  const days = []
  const seen = new Set()
  for (const e of filtered) {
    const k = dayKey(e.timestamp)
    if (!seen.has(k)) { seen.add(k); days.push({ key: k, ts: e.timestamp, entries: [] }) }
    days[days.length - 1].entries.push(e)
  }

  const pendingCount = entries.filter(e =>
    (e.type === 'lab_order' || e.type === 'imaging_order') &&
    e.result?.status === 'pending_review' && !e.result?.acknowledged_at
  ).length

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <PatientHeader
        admission={admission}
        patient={patient}
        vitals={vitals}
        onAddVitals={() => setShowAddVitals(true)}
        onShowAdmForm={onShowAdmForm}
      />

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-100 shrink-0">
        <button
          onClick={() => setShowNewRound(true)}
          className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
        >
          <PlusCircle size={13} /> New Note
        </button>
        {pendingCount > 0 && (
          <span className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
            <AlertTriangle size={11} /> {pendingCount} pending review
          </span>
        )}
        <div className="ml-auto relative" ref={filterBtnRef}>
          <button
            onClick={() => setShowFilter(v => !v)}
            title="Filter entries"
            className={`flex items-center justify-center w-7 h-7 rounded-lg border transition-colors ${
              activeFilters.length > 0
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span className="text-[14px] leading-none">⚙</span>
          </button>
          {showFilter && (
            <div ref={filterDropRef}>
              <FilterDropdown
                activeFilters={activeFilters}
                onChange={setActiveFilters}
                onClose={() => setShowFilter(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="px-4 py-3 space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-12 text-[12px] text-gray-400">
            Loading timeline…
          </div>
        )}
        {!loading && error && (
          <div className="flex items-center justify-center py-12 text-[12px] text-red-500">{error}</div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList size={28} className="text-gray-300 mb-2" />
            <span className="text-[12px] text-gray-400">
              {entries.length === 0 ? 'No clinical events recorded yet.' : 'No entries match the current filter.'}
            </span>
          </div>
        )}
        {!loading && !error && days.map(day => (
          <div key={day.key}>
            {/* Day separator */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-[10px] font-semibold text-gray-400 whitespace-nowrap px-1">
                {fmtDate(day.ts)}
              </span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            <div className="space-y-2">
              {day.entries.map((entry, i) => (
                <div key={`${entry.type}-${entry.id}-${i}`}>
                  {entry.type === 'ward_round' && <WardRoundEntry entry={entry} />}
                  {entry.type === 'nursing_note' && <NursingNoteEntry entry={entry} />}
                  {entry.type === 'progress_note' && <ProgressNoteEntry entry={entry} />}
                  {entry.type === 'lab_order' && (
                    <LabOrderEntry entry={entry} admissionId={admission?.id} onAcknowledge={acknowledge} />
                  )}
                  {entry.type === 'imaging_order' && (
                    <ImagingOrderEntry entry={entry} admissionId={admission?.id} onAcknowledge={acknowledge} />
                  )}
                  {entry.type === 'medication_order' && <MedicationOrderEntry entry={entry} />}
                  {entry.type === 'clinical_order' && <ClinicalOrderEntry entry={entry} />}
                  {entry.type === 'transfer' && <TransferEntry entry={entry} />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {showNewRound && (
        <NewRoundModal
          admission={admission}
          onClose={() => setShowNewRound(false)}
          onSaved={load}
        />
      )}
      {showAddVitals && (
        <AddVitalsModal
          admission={admission}
          onClose={() => setShowAddVitals(false)}
          onSaved={() => { onVitalsAdded?.(); load() }}
        />
      )}
    </div>
  )
}
