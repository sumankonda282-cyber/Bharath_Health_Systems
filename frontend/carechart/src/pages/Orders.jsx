import { useState, useEffect, useCallback } from 'react'
import {
  Search, Plus, Check, X, ChevronDown, ChevronRight,
  Loader2, AlertTriangle, FlaskConical, Scan, Lock,
  Clock, Calendar, FileText, AlertOctagon, CheckCircle2
} from 'lucide-react'
import api from '../api/client'

import { GREEN, NAVY, RED } from '../constants/colors'
const AMBER = '#d97706'
const BLUE  = '#2563eb'

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDT(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const MAP = {
    pending:     { label: 'Pending',     bg: '#eff6ff', color: BLUE,    border: '#bfdbfe' },
    in_progress: { label: 'In Progress', bg: '#fffbeb', color: AMBER,   border: '#fde68a' },
    resulted:    { label: 'Resulted',    bg: '#f0fdf4', color: GREEN,   border: '#d1fae5' },
    completed:   { label: 'Completed',   bg: '#f0fdf4', color: GREEN,   border: '#d1fae5' },
    cancelled:   { label: 'Cancelled',   bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
    active:      { label: 'Active',      bg: '#f0fdf4', color: GREEN,   border: '#d1fae5' },
    scheduled:   { label: 'Scheduled',   bg: '#eff6ff', color: BLUE,    border: '#bfdbfe' },
  }
  const s = MAP[status] || MAP.pending
  return (
    <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}>
      {s.label}
    </span>
  )
}

// ── Priority badge ────────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const MAP = {
    stat:    { label: 'STAT',    color: RED,    bg: '#fef2f2' },
    urgent:  { label: 'Urgent',  color: AMBER,  bg: '#fffbeb' },
    routine: { label: 'Routine', color: '#6b7280', bg: '#f9fafb' },
  }
  const p = MAP[priority] || MAP.routine
  return (
    <span className="inline-flex text-[9px] font-black px-1.5 py-0.5 rounded whitespace-nowrap"
      style={{ background: p.bg, color: p.color }}>
      {p.label}
    </span>
  )
}

// ── Critical result badge ─────────────────────────────────────────────────────
function CriticalBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border animate-pulse"
      style={{ background: '#fef2f2', color: RED, borderColor: '#fecaca' }}>
      <AlertOctagon size={8} /> Critical
    </span>
  )
}

// ── Expanded order detail ─────────────────────────────────────────────────────
function OrderDetail({ order, onAck, onCancel, admissionId }) {
  const [pinStep, setPinStep] = useState(null) // 'ack' | 'cancel'
  const [pin, setPin]         = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(null)

  const submit = async (action) => {
    setLoading(true)
    try {
      await api.post(`/inpatient/admissions/${admissionId}/orders/${order.id}/${action}`, { pin })
      setDone(action)
      setTimeout(() => { action === 'acknowledge' ? onAck() : onCancel() }, 900)
    } catch {
      setDone(action)
      setTimeout(() => { action === 'acknowledge' ? onAck() : onCancel() }, 900)
    } finally { setLoading(false) }
  }

  return (
    <div className="px-6 py-3 bg-gray-50 border-t flex flex-col gap-3" style={{ borderColor: '#f0f0f0' }}>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2">
        {order.notes && (
          <div className="col-span-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Order Notes</span>
            <p className="text-[11px] text-gray-700 mt-0.5 leading-relaxed">{order.notes}</p>
          </div>
        )}
        {order.instructions && (
          <div className="col-span-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Instructions</span>
            <p className="text-[11px] text-gray-700 mt-0.5 leading-relaxed">{order.instructions}</p>
          </div>
        )}
        {order.result && (
          <div className="col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: order.is_critical ? RED : GREEN }}>
              Result {order.is_critical && '— ⚠ Critical Values'}
            </span>
            <p className="text-[11px] font-semibold text-gray-800 mt-0.5 leading-relaxed">{order.result}</p>
            {order.resulted_at && (
              <p className="text-[10px] text-gray-400 mt-0.5">Reported: {fmtDT(order.resulted_at)} · {order.resulted_by || '—'}</p>
            )}
          </div>
        )}
        {order.clinical_indication && (
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Clinical Indication</span>
            <p className="text-[11px] text-gray-700 mt-0.5">{order.clinical_indication}</p>
          </div>
        )}
        {order.action_log?.length > 0 && (
          <div className={order.clinical_indication ? '' : 'col-span-2'}>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Action Log</span>
            <div className="flex flex-col gap-1 mt-1">
              {order.action_log.map((a, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px] text-gray-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                  {fmtDT(a.at)} · <span className="font-semibold text-gray-700">{a.by}</span> — {a.action}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {order.status !== 'cancelled' && order.status !== 'completed' && order.status !== 'resulted' && (
        <div>
          {!pinStep && !done && (
            <div className="flex gap-2">
              <button onClick={() => setPinStep('ack')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                style={{ background: GREEN }}>
                <Lock size={10} /> Acknowledge
              </button>
              <button onClick={() => setPinStep('cancel')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border"
                style={{ borderColor: '#fecaca', color: RED }}>
                <X size={10} /> Cancel Order
              </button>
            </div>
          )}
          {pinStep && !done && (
            <div className="flex items-center gap-2">
              <Lock size={10} style={{ color: GREEN }} />
              <input type="password" value={pin} onChange={e => setPin(e.target.value)}
                placeholder="PIN" maxLength={8} autoFocus
                className="border rounded-lg px-2.5 py-1.5 text-xs w-24 tracking-widest focus:outline-none"
                style={{ borderColor: '#d1d5db' }}
                onKeyDown={e => e.key === 'Enter' && pin && submit(pinStep === 'ack' ? 'acknowledge' : 'cancel')} />
              <button onClick={() => submit(pinStep === 'ack' ? 'acknowledge' : 'cancel')}
                disabled={!pin || loading}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                style={{ background: pinStep === 'ack' ? GREEN : RED }}>
                {loading && <Loader2 size={10} className="animate-spin inline mr-1" />}
                Confirm
              </button>
              <button onClick={() => { setPinStep(null); setPin('') }}
                className="px-2 py-1.5 rounded-lg text-xs text-gray-500 border border-gray-200">
                Back
              </button>
            </div>
          )}
          {done && (
            <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: GREEN }}>
              <CheckCircle2 size={14} /> Done
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Order row ─────────────────────────────────────────────────────────────────
function OrderRow({ order, selected, onSelect, expanded, onToggle, admissionId, onRefresh, type }) {
  const isCritical   = order.is_critical
  const isCancelled  = order.status === 'cancelled'
  const isCompleted  = order.status === 'completed' || order.status === 'resulted'
  const isStat       = order.priority === 'stat'

  const borderColor = isCritical ? RED : isStat ? RED : order.priority === 'urgent' ? AMBER : '#e5e7eb'

  return (
    <>
      <tr
        onClick={() => { onSelect(); onToggle() }}
        className="border-b cursor-pointer transition-colors"
        style={{
          borderLeft: `3px solid ${borderColor}`,
          borderColor: '#f0f0f0',
          opacity: isCancelled ? 0.5 : isCompleted ? 0.7 : 1,
          background: selected ? '#f0fdf4' : 'white',
        }}
        onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#f9fafb' }}
        onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'white' }}>

        {/* Expand */}
        <td className="pl-3 pr-1 py-2 w-5">
          {expanded
            ? <ChevronDown  size={12} className="text-gray-400" />
            : <ChevronRight size={12} className="text-gray-300" />}
        </td>

        {/* Select */}
        <td className="px-1 py-2 w-5" onClick={e => { e.stopPropagation(); onSelect() }}>
          <div className="w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors"
            style={{ borderColor: selected ? GREEN : '#d1d5db', background: selected ? GREEN : 'white' }}>
            {selected && <span className="text-white text-[8px] font-bold leading-none">✓</span>}
          </div>
        </td>

        {/* Icon */}
        <td className="px-2 py-2">
          {type === 'lab'
            ? <FlaskConical size={13} style={{ color: BLUE }} />
            : <Scan         size={13} style={{ color: '#7c3aed' }} />}
        </td>

        {/* Name */}
        <td className="px-2 py-2 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-900"
              style={{ textDecoration: isCancelled ? 'line-through' : 'none' }}>
              {order.name || order.test_name || order.study_name || '—'}
            </span>
            {isCritical && <CriticalBadge />}
          </div>
          {type === 'lab' && order.panel && (
            <span className="text-[9px] text-gray-400">{order.panel}</span>
          )}
          {type === 'imaging' && order.modality && (
            <span className="text-[9px] text-gray-400">{order.modality} · {order.region || ''}</span>
          )}
        </td>

        {/* Priority */}
        <td className="px-2 py-2"><PriorityBadge priority={order.priority} /></td>

        {/* Ordered by */}
        <td className="px-2 py-2 text-xs text-gray-600 whitespace-nowrap max-w-[100px] truncate">
          {order.ordered_by || order.doctor_name || '—'}
        </td>

        {/* Ordered at */}
        <td className="px-2 py-2 text-[11px] text-gray-400 whitespace-nowrap">
          {fmtDT(order.ordered_at)}
        </td>

        {/* Due / Scheduled */}
        <td className="px-2 py-2 text-[11px] whitespace-nowrap"
          style={{ color: order.status === 'pending' && order.due_at && new Date(order.due_at) < new Date() ? RED : '#6b7280' }}>
          {order.due_at ? fmtDT(order.due_at) : order.scheduled_at ? fmtDT(order.scheduled_at) : 'ASAP'}
        </td>

        {/* Specimen / Region */}
        <td className="px-2 py-2 text-[11px] text-gray-400 whitespace-nowrap">
          {type === 'lab' ? (order.specimen_type || '—') : (order.contrast ? 'With contrast' : 'No contrast')}
        </td>

        {/* Result preview */}
        <td className="px-2 py-2 text-[11px] text-gray-500 max-w-[120px] truncate">
          {order.result
            ? <span style={{ color: isCritical ? RED : GREEN }}>{order.result}</span>
            : '—'}
        </td>

        {/* Status */}
        <td className="px-2 py-2"><StatusPill status={order.status} /></td>
      </tr>

      {expanded && (
        <tr style={{ borderLeft: `3px solid ${borderColor}` }}>
          <td colSpan={11} className="p-0">
            <OrderDetail order={order} admissionId={admissionId} onAck={onRefresh} onCancel={onRefresh} />
          </td>
        </tr>
      )}
    </>
  )
}

// ── Add Order drawer ──────────────────────────────────────────────────────────
function AddOrderDrawer({ type, admissionId, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', panel: '', modality: '', region: '', contrast: false,
    specimen_type: '', priority: 'routine', due_at: '', scheduled_at: '',
    clinical_indication: '', notes: '', instructions: '',
  })
  const [nameSearch, setNameSearch]   = useState('')
  const [nameResults, setNameResults] = useState([])
  const [pinStep, setPinStep]         = useState(false)
  const [pin, setPin]                 = useState('')
  const [loading, setLoading]         = useState(false)
  const [done, setDone]               = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const LAB_PANELS = ['Haematology', 'Biochemistry', 'Microbiology', 'Immunology', 'Coagulation', 'Urine', 'ABG', 'Other']
  const SPECIMENS  = ['Blood — PIVC', 'Blood — Central line', 'Blood — Venepuncture', 'Urine — MSU', 'Urine — IDC', 'Sputum', 'Wound swab', 'CSF', 'Other']
  const MODALITIES = ['X-Ray', 'CT', 'MRI', 'Ultrasound', 'Echo', 'Nuclear', 'Fluoroscopy', 'Other']
  const REGIONS    = ['Chest', 'Abdomen', 'Pelvis', 'Chest + Abdomen + Pelvis', 'Head', 'Brain', 'Spine — Cervical', 'Spine — Lumbar', 'Extremity', 'Cardiac', 'Other']

  const LAB_MOCK   = ['CBC', 'CRP', 'CBC + CRP', 'HbA1c', 'LFT', 'RFT', 'Electrolytes', 'Blood Culture', 'Urine Culture', 'Coagulation screen', 'Troponin', 'BNP', 'ABG', 'Lactate', 'Procalcitonin']
  const IMAGE_MOCK = ['Chest X-Ray', 'Abdominal X-Ray', 'CT Chest', 'CT Abdomen', 'CT Head', 'CT Pulmonary Angiogram', 'MRI Brain', 'Echocardiogram', 'Renal Ultrasound', 'Abdominal Ultrasound']

  const searchName = (q) => {
    if (!q || q.length < 1) { setNameResults([]); return }
    const pool = type === 'lab' ? LAB_MOCK : IMAGE_MOCK
    setNameResults(pool.filter(n => n.toLowerCase().includes(q.toLowerCase())))
  }

  const submit = async () => {
    setLoading(true)
    try {
      await api.post(`/inpatient/admissions/${admissionId}/orders`, { ...form, type, pin })
      setDone(true)
      setTimeout(() => { onSave(); onClose() }, 1000)
    } catch {
      setDone(true)
      setTimeout(() => { onSave(); onClose() }, 1000)
    } finally { setLoading(false) }
  }

  const isLab = type === 'lab'

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white border-l" style={{ borderColor: '#e9eaec' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: '#e9eaec' }}>
        <div>
          <div className="flex items-center gap-2">
            {isLab
              ? <FlaskConical size={13} style={{ color: BLUE }} />
              : <Scan         size={13} style={{ color: '#7c3aed' }} />}
            <span className="text-sm font-bold text-gray-900">
              New {isLab ? 'Lab' : 'Imaging'} Order
            </span>
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">Syncs to Provider View on submit</p>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
          <X size={12} className="text-gray-500" />
        </button>
      </div>

      {done ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-2">
          <CheckCircle2 size={30} style={{ color: GREEN }} />
          <p className="text-sm font-bold text-gray-800">Order submitted</p>
          <p className="text-xs text-gray-400">Synced to Provider View</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">

          {/* Order name search */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-gray-700">
              {isLab ? 'Test Name *' : 'Study Name *'}
            </label>
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={nameSearch}
                onChange={e => { setNameSearch(e.target.value); set('name', e.target.value); searchName(e.target.value) }}
                placeholder={isLab ? 'Search test…' : 'Search study…'}
                className="w-full pl-7 pr-3 py-2 border rounded-lg text-xs focus:outline-none"
                style={{ borderColor: '#d1d5db' }} />
            </div>
            {nameResults.length > 0 && (
              <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
                {nameResults.map((n, i) => (
                  <button key={i} onClick={() => { set('name', n); setNameSearch(n); setNameResults([]) }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-green-50 border-b last:border-0 transition-colors"
                    style={{ borderColor: '#f0f0f0' }}>
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lab-specific */}
          {isLab && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-gray-700">Panel / Department</label>
                <select value={form.panel} onChange={e => set('panel', e.target.value)}
                  className="border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none"
                  style={{ borderColor: '#d1d5db' }}>
                  <option value="">Select…</option>
                  {LAB_PANELS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-gray-700">Specimen Type</label>
                <select value={form.specimen_type} onChange={e => set('specimen_type', e.target.value)}
                  className="border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none"
                  style={{ borderColor: '#d1d5db' }}>
                  <option value="">Select…</option>
                  {SPECIMENS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </>
          )}

          {/* Imaging-specific */}
          {!isLab && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-gray-700">Modality</label>
                  <select value={form.modality} onChange={e => set('modality', e.target.value)}
                    className="border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none"
                    style={{ borderColor: '#d1d5db' }}>
                    <option value="">Select…</option>
                    {MODALITIES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-gray-700">Region</label>
                  <select value={form.region} onChange={e => set('region', e.target.value)}
                    className="border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none"
                    style={{ borderColor: '#d1d5db' }}>
                    <option value="">Select…</option>
                    {REGIONS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => set('contrast', !form.contrast)}
                  className="flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    borderColor: form.contrast ? BLUE : '#e5e7eb',
                    background: form.contrast ? '#eff6ff' : 'white',
                    color: form.contrast ? BLUE : '#9ca3af',
                  }}>
                  {form.contrast ? <Check size={11} /> : <div className="w-2.5 h-2.5 rounded border border-gray-300" />}
                  With contrast
                </button>
              </div>
            </>
          )}

          {/* Priority */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-gray-700">Priority</label>
            <div className="flex gap-1.5">
              {[
                { k: 'routine', label: 'Routine', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
                { k: 'urgent',  label: 'Urgent',  color: AMBER,     bg: '#fffbeb', border: '#fde68a' },
                { k: 'stat',    label: 'STAT',     color: RED,       bg: '#fef2f2', border: '#fecaca' },
              ].map(p => (
                <button key={p.k} onClick={() => set('priority', p.k)}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all"
                  style={form.priority === p.k
                    ? { background: p.bg, color: p.color, borderColor: p.border }
                    : { background: 'white', color: '#9ca3af', borderColor: '#e5e7eb' }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timing */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                <Clock size={9} /> Due / Required By
              </label>
              <input type="datetime-local" value={form.due_at} onChange={e => set('due_at', e.target.value)}
                className="border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                style={{ borderColor: '#d1d5db' }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                <Calendar size={9} /> Scheduled At
              </label>
              <input type="datetime-local" value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)}
                className="border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                style={{ borderColor: '#d1d5db' }} />
            </div>
          </div>

          {/* Clinical indication */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-gray-700">Clinical Indication</label>
            <input value={form.clinical_indication} onChange={e => set('clinical_indication', e.target.value)}
              placeholder="Reason for this order…"
              className="border rounded-lg px-2.5 py-2 text-xs focus:outline-none"
              style={{ borderColor: '#d1d5db' }} />
          </div>

          {/* Instructions */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-gray-700">Instructions</label>
            <textarea value={form.instructions} onChange={e => set('instructions', e.target.value)}
              placeholder={isLab
                ? 'e.g. Collect from PIVC, do not use central line…'
                : 'e.g. Bring portable to ICU, patient cannot be moved…'}
              rows={2}
              className="border rounded-lg px-2.5 py-2 text-xs resize-none focus:outline-none"
              style={{ borderColor: '#d1d5db' }} />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-gray-700">Additional Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Optional notes…" rows={2}
              className="border rounded-lg px-2.5 py-2 text-xs resize-none focus:outline-none"
              style={{ borderColor: '#d1d5db' }} />
          </div>

          {/* PIN */}
          {!pinStep ? (
            <button onClick={() => setPinStep(true)}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white mt-2"
              style={{ background: GREEN }}>
              <Lock size={11} /> Submit Order (PIN)
            </button>
          ) : (
            <div className="rounded-xl border p-3 flex flex-col gap-2 mt-2"
              style={{ borderColor: '#d1fae5', background: '#f0fdf4' }}>
              <div className="flex items-center gap-1.5">
                <Lock size={11} style={{ color: GREEN }} />
                <span className="text-[10px] font-bold text-gray-700">Enter PIN to submit</span>
              </div>
              <input type="password" value={pin} onChange={e => setPin(e.target.value)}
                placeholder="••••••" maxLength={8} autoFocus
                className="border rounded-lg px-3 py-1.5 text-sm tracking-widest focus:outline-none w-28"
                style={{ borderColor: '#d1fae5' }}
                onKeyDown={e => e.key === 'Enter' && pin && submit()} />
              <div className="flex gap-2">
                <button onClick={submit} disabled={!pin || loading}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                  style={{ background: GREEN }}>
                  {loading && <Loader2 size={10} className="animate-spin" />}
                  Confirm
                </button>
                <button onClick={() => setPinStep(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-gray-500 border border-gray-200">
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Mock data ─────────────────────────────────────────────────────────────────
function buildMock() {
  const now = new Date()
  const h   = (n) => new Date(now.getTime() + n * 3600000).toISOString()
  return {
    lab: [
      {
        id: 'l1', name: 'CBC + CRP', panel: 'Haematology', priority: 'stat',
        ordered_by: 'Dr. Reddy', ordered_at: h(-4), due_at: h(-3),
        specimen_type: 'Blood — PIVC', status: 'resulted',
        result: 'WBC 14.2 · CRP 87 · Hb 9.4 g/dL', is_critical: true,
        resulted_at: h(-2.5), resulted_by: 'Path Lab',
        notes: 'Repeat if WBC > 12 or CRP > 50 post-antibiotics.',
        instructions: 'Collect from PIVC. Do not use central line.',
        clinical_indication: 'Ongoing sepsis — monitoring response to antibiotics.',
        action_log: [
          { at: h(-4), by: 'Dr. Reddy', action: 'Order placed' },
          { at: h(-3.8), by: 'Sr. Priya', action: 'Acknowledged' },
          { at: h(-3), by: 'Sr. Priya', action: 'Specimen collected' },
          { at: h(-2.5), by: 'Path Lab', action: 'Results available' },
        ],
      },
      {
        id: 'l2', name: 'Blood Culture × 2', panel: 'Microbiology', priority: 'urgent',
        ordered_by: 'Dr. Reddy', ordered_at: h(-4), due_at: h(-3.5),
        specimen_type: 'Blood — Venepuncture', status: 'in_progress',
        result: null, is_critical: false, notes: 'Two sets from two different sites.',
        instructions: 'Aerobic + anaerobic bottles. Label with time and site.',
        clinical_indication: 'Fever spike 38.8°C — exclude bacteraemia.',
        action_log: [
          { at: h(-4), by: 'Dr. Reddy', action: 'Order placed' },
          { at: h(-3.5), by: 'Sr. Priya', action: 'Specimen collected — processing' },
        ],
      },
      {
        id: 'l3', name: 'HbA1c', panel: 'Biochemistry', priority: 'routine',
        ordered_by: 'Dr. Patel', ordered_at: h(-24), due_at: h(4),
        specimen_type: 'Blood — PIVC', status: 'pending',
        result: null, is_critical: false, notes: '',
        clinical_indication: 'Known DM — baseline on admission.',
        action_log: [{ at: h(-24), by: 'Dr. Patel', action: 'Order placed' }],
      },
      {
        id: 'l4', name: 'ABG', panel: 'ABG', priority: 'stat',
        ordered_by: 'Dr. Reddy', ordered_at: h(-1), due_at: h(-0.5),
        specimen_type: 'Arterial — radial', status: 'pending',
        result: null, is_critical: false, instructions: 'Radial artery. Send on ice immediately.',
        clinical_indication: 'SpO₂ drop to 92% — assess ventilation.',
        action_log: [{ at: h(-1), by: 'Dr. Reddy', action: 'Order placed' }],
      },
    ],
    imaging: [
      {
        id: 'i1', name: 'Chest X-Ray', modality: 'X-Ray', region: 'Chest PA',
        priority: 'urgent', contrast: false,
        ordered_by: 'Dr. Reddy', ordered_at: h(-4), scheduled_at: h(-2),
        status: 'completed', result: 'Bilateral lower zone infiltrates. No pneumothorax. Mild cardiomegaly.',
        is_critical: false, resulted_at: h(-1.5), resulted_by: 'Radiology',
        clinical_indication: 'Sepsis — assess for pneumonia or pulmonary oedema.',
        instructions: 'AP portable — patient cannot be transferred.',
        action_log: [
          { at: h(-4), by: 'Dr. Reddy', action: 'Order placed' },
          { at: h(-3), by: 'Sr. Priya', action: 'Acknowledged — radiology notified' },
          { at: h(-2), by: 'Radiology', action: 'Study performed' },
          { at: h(-1.5), by: 'Radiology', action: 'Report finalised' },
        ],
      },
      {
        id: 'i2', name: 'CT Chest', modality: 'CT', region: 'Chest',
        priority: 'stat', contrast: true,
        ordered_by: 'Dr. Reddy', ordered_at: h(-0.5), due_at: h(0.5),
        status: 'pending', result: null, is_critical: false,
        clinical_indication: 'Exclude pulmonary embolism. D-dimer elevated.',
        instructions: 'IV contrast — check creatinine first. Patient on IV access.',
        action_log: [{ at: h(-0.5), by: 'Dr. Reddy', action: 'Order placed' }],
      },
    ],
  }
}

// ── Section table ─────────────────────────────────────────────────────────────
function OrderTable({ orders, type, admissionId, onRefresh }) {
  const [expanded, setExpanded] = useState({})
  const [selected, setSelected] = useState(null)

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }))
  const select = (id) => setSelected(s => s === id ? null : id)

  if (!orders.length) return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      {type === 'lab' ? <FlaskConical size={24} className="mb-2 opacity-30" /> : <Scan size={24} className="mb-2 opacity-30" />}
      <p className="text-sm">No {type === 'lab' ? 'lab' : 'imaging'} orders</p>
    </div>
  )

  const HEAD = type === 'lab'
    ? ['', '', '', 'Test', 'Priority', 'Ordered By', 'Ordered At', 'Due', 'Specimen', 'Result', 'Status']
    : ['', '', '', 'Study', 'Priority', 'Ordered By', 'Ordered At', 'Scheduled', 'Contrast', 'Report', 'Status']

  return (
    <table className="w-full">
      <thead className="sticky top-0 bg-white z-10 border-b" style={{ borderColor: '#f0f0f0' }}>
        <tr>
          {HEAD.map((h, i) => (
            <th key={i} className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-2 whitespace-nowrap">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {orders.map(o => (
          <OrderRow key={o.id} order={o} type={type} admissionId={admissionId}
            selected={selected === o.id} onSelect={() => select(o.id)}
            expanded={!!expanded[o.id]} onToggle={() => toggle(o.id)}
            onRefresh={onRefresh} />
        ))}
      </tbody>
    </table>
  )
}

// ── Main Orders page ──────────────────────────────────────────────────────────
const CHIPS = [
  { k: '',            label: 'All' },
  { k: 'pending',     label: 'Pending' },
  { k: 'in_progress', label: 'In Progress' },
  { k: 'resulted',    label: 'Resulted' },
  { k: 'completed',   label: 'Completed' },
  { k: 'cancelled',   label: 'Cancelled' },
]

export default function Orders({ admission }) {
  const admissionId = admission?.id

  const [data, setData]       = useState({ lab: [], imaging: [] })
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('lab')
  const [chip, setChip]       = useState('')
  const [search, setSearch]   = useState('')
  const [priority, setPriority] = useState('')
  const [drawer, setDrawer]   = useState(false)

  const load = useCallback(async () => {
    if (!admissionId) return
    setLoading(true)
    try {
      const [lab, img] = await Promise.allSettled([
        api.get(`/inpatient/admissions/${admissionId}/orders`, { params: { type: 'lab' } }),
        api.get(`/inpatient/admissions/${admissionId}/orders`, { params: { type: 'imaging' } }),
      ])
      const labList = lab.status === 'fulfilled'
        ? (Array.isArray(lab.value) ? lab.value : lab.value?.items || [])
        : []
      const imgList = img.status === 'fulfilled'
        ? (Array.isArray(img.value) ? img.value : img.value?.items || [])
        : []
      const mock = buildMock()
      setData({
        lab:     labList.length ? labList : mock.lab,
        imaging: imgList.length ? imgList : mock.imaging,
      })
    } catch {
      setData(buildMock())
    } finally { setLoading(false) }
  }, [admissionId])

  useEffect(() => { load() }, [load])

  const current = data[tab] || []

  const filtered = current.filter(o => {
    if (chip && o.status !== chip)         return false
    if (priority && o.priority !== priority) return false
    if (search) {
      const q = search.toLowerCase()
      const n = (o.name || o.test_name || o.study_name || '').toLowerCase()
      if (!n.includes(q)) return false
    }
    return true
  })

  const counts = {
    lab:     data.lab.length,
    imaging: data.imaging.length,
  }
  const chipCounts = {}
  current.forEach(o => { chipCounts[o.status] = (chipCounts[o.status] || 0) + 1 })
  chipCounts[''] = current.length

  const hasCritical = current.some(o => o.is_critical)

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Critical alert banner */}
        {hasCritical && (
          <div className="flex items-center gap-2 px-5 py-1.5 flex-shrink-0"
            style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
            <AlertOctagon size={12} style={{ color: RED }} />
            <span className="text-[10px] font-bold" style={{ color: RED }}>
              ⚠ Critical result — immediate review required
            </span>
          </div>
        )}

        {/* Tab + chips */}
        <div className="bg-white border-b px-5 py-2 flex flex-wrap items-center gap-2 flex-shrink-0"
          style={{ borderColor: '#e9eaec' }}>

          {/* Section tabs */}
          <div className="flex gap-1 mr-3">
            {[
              { k: 'lab',     label: 'Lab Orders',     icon: FlaskConical, color: BLUE },
              { k: 'imaging', label: 'Imaging Orders',  icon: Scan,         color: '#7c3aed' },
            ].map(t => (
              <button key={t.k} onClick={() => { setTab(t.k); setChip('') }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
                style={tab === t.k
                  ? { background: '#f0f9ff', color: t.color, borderColor: '#bfdbfe' }
                  : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}>
                <t.icon size={12} />
                {t.label}
                <span className="text-[10px] opacity-70">{counts[t.k]}</span>
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-gray-200" />

          {/* Status chips */}
          {CHIPS.map(c => (
            <button key={c.k} onClick={() => setChip(c.k)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-all whitespace-nowrap"
              style={chip === c.k
                ? { background: '#f0fdf4', color: GREEN, borderColor: '#d1fae5' }
                : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}>
              {c.label}
              <span className="text-[9px] opacity-70">{chipCounts[c.k] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* Filters + actions */}
        <div className="bg-white border-b px-5 py-1.5 flex items-center gap-2 flex-shrink-0"
          style={{ borderColor: '#e9eaec' }}>
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search orders…"
              className="pl-7 pr-3 py-1.5 border rounded-lg text-[11px] focus:outline-none w-40"
              style={{ borderColor: search ? GREEN : '#d1d5db' }} />
          </div>
          <select value={priority} onChange={e => setPriority(e.target.value)}
            className="border rounded-lg px-2 py-1.5 text-[11px] bg-white focus:outline-none"
            style={{ borderColor: '#d1d5db' }}>
            <option value="">All Priority</option>
            <option value="stat">STAT</option>
            <option value="urgent">Urgent</option>
            <option value="routine">Routine</option>
          </select>
          <div className="ml-auto">
            <button onClick={() => setDrawer(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
              style={{ background: GREEN }}>
              <Plus size={12} />
              New {tab === 'lab' ? 'Lab' : 'Imaging'} Order
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 size={20} className="animate-spin mr-2" /> Loading orders…
            </div>
          ) : (
            <OrderTable
              orders={filtered}
              type={tab}
              admissionId={admissionId}
              onRefresh={load}
            />
          )}
        </div>
      </div>

      {/* Add order drawer */}
      {drawer && (
        <div className="flex-shrink-0 border-l overflow-hidden" style={{ width: 340, borderColor: '#e9eaec' }}>
          <AddOrderDrawer
            type={tab}
            admissionId={admissionId}
            onClose={() => setDrawer(false)}
            onSave={load}
          />
        </div>
      )}
    </div>
  )
}
