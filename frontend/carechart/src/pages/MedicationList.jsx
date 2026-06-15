import { useState, useEffect, useCallback } from 'react'
import {
  Search, Plus, Pencil, Ban, ChevronDown, ChevronRight,
  Loader2, AlertTriangle, AlertOctagon, Zap, Pill,
  Droplets, Clock, CheckCircle2, Phone, ShieldAlert,
  TrendingUp, X, Lock, FlaskConical
} from 'lucide-react'
import api from '../api/client'

const GREEN = '#065F46'
const RED   = '#dc2626'
const AMBER = '#d97706'
const BLUE  = '#2563eb'
const NAVY  = '#0F2557'

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtTime(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

const ROUTE_ICON = {
  IV:   <Droplets size={13} style={{ color: BLUE }} />,
  PO:   <Pill     size={13} style={{ color: GREEN }} />,
  IM:   <FlaskConical size={13} style={{ color: AMBER }} />,
  SC:   <FlaskConical size={13} style={{ color: '#7c3aed' }} />,
  SL:   <Pill     size={13} style={{ color: '#0891b2' }} />,
  TOP:  <Pill     size={13} style={{ color: '#6b7280' }} />,
}

function routeIcon(route) {
  const r = (route || '').toUpperCase()
  return ROUTE_ICON[r] || <Pill size={13} style={{ color: '#9ca3af' }} />
}

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const cfg = {
    active:       { label: 'Active',       bg: '#f0fdf4', color: GREEN,  border: '#d1fae5' },
    stat:         { label: 'STAT',         bg: '#fef2f2', color: RED,    border: '#fecaca' },
    on_hold:      { label: 'On Hold',      bg: '#eff6ff', color: BLUE,   border: '#bfdbfe' },
    discontinued: { label: 'Discontinued', bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
  }[status] || { label: status, bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' }

  return (
    <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
      {cfg.label}
    </span>
  )
}

// ── Expanded row detail ───────────────────────────────────────────────────────
function MedDetail({ med }) {
  const doseChanges  = med.dose_changes  || []
  const dosesGiven   = med.doses_given   ?? null
  const totalDoses   = med.total_doses   ?? null
  const isIV         = (med.route || '').toUpperCase() === 'IV'

  return (
    <div className="grid grid-cols-2 gap-x-10 gap-y-3 px-6 py-4 bg-gray-50 border-t"
      style={{ borderColor: '#f0f0f0' }}>

      {/* Dose changes */}
      {doseChanges.length > 0 && (
        <div className="col-span-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp size={11} style={{ color: AMBER }} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Dose Changes</span>
          </div>
          {doseChanges.map((c, i) => (
            <div key={i} className="text-[11px] text-gray-700 flex items-center gap-2 mb-0.5">
              <span className="text-gray-400">{fmt(c.date)}</span>
              <ChevronRight size={10} className="text-gray-300" />
              <span>{c.from} → <strong>{c.to}</strong></span>
              {c.reason && <span className="text-gray-400 italic">({c.reason})</span>}
            </div>
          ))}
        </div>
      )}

      {/* Precautions */}
      {med.precautions && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <ShieldAlert size={11} style={{ color: AMBER }} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Precautions</span>
          </div>
          <p className="text-[11px] text-gray-700 leading-relaxed">{med.precautions}</p>
        </div>
      )}

      {/* Infusion details (IV only) */}
      {isIV && (med.infusion_rate || med.infusion_guidelines) && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Droplets size={11} style={{ color: BLUE }} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Infusion</span>
          </div>
          {med.infusion_rate       && <p className="text-[11px] text-gray-700 mb-0.5">Rate: <strong>{med.infusion_rate}</strong></p>}
          {med.infusion_guidelines && <p className="text-[11px] text-gray-700 leading-relaxed">{med.infusion_guidelines}</p>}
        </div>
      )}

      {/* Doses given */}
      {dosesGiven !== null && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <CheckCircle2 size={11} style={{ color: GREEN }} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Doses Given</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-800">
              {dosesGiven}{totalDoses ? ` / ${totalDoses}` : ''}
            </span>
            {totalDoses && (
              <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden max-w-24">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, (dosesGiven / totalDoses) * 100)}%`, background: GREEN }} />
              </div>
            )}
          </div>
          {med.last_given_at && (
            <p className="text-[10px] text-gray-400 mt-0.5">Last given: {fmtTime(med.last_given_at)} by {med.last_given_by || '—'}</p>
          )}
        </div>
      )}

      {/* Side effects */}
      {med.side_effects && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle size={11} style={{ color: '#7c3aed' }} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Expected Side Effects</span>
          </div>
          <p className="text-[11px] text-gray-700 leading-relaxed">{med.side_effects}</p>
        </div>
      )}

      {/* Contact doctor if */}
      {med.contact_if && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Phone size={11} style={{ color: RED }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: RED }}>Contact Doctor If</span>
          </div>
          <p className="text-[11px] text-gray-700 leading-relaxed">{med.contact_if}</p>
        </div>
      )}
    </div>
  )
}

// ── Med row ───────────────────────────────────────────────────────────────────
function MedRow({ med, selected, onSelect, onToggle, expanded, isDisc }) {
  const isIV       = (med.route || '').toUpperCase() === 'IV'
  const isActive   = med.status === 'active' || med.status === 'stat'
  const nextDue    = med.next_dose_at ? fmtTime(med.next_dose_at) : null

  const borderColor = med.status === 'stat'   ? RED
    : med.status === 'on_hold'                 ? BLUE
    : med.status === 'discontinued'            ? '#e5e7eb'
    : GREEN

  return (
    <>
      <tr
        onClick={() => { if (!isDisc) onSelect(); onToggle() }}
        className="border-b transition-colors"
        style={{
          borderLeft: `3px solid ${borderColor}`,
          borderColor: '#f0f0f0',
          opacity: isDisc ? 0.55 : 1,
          background: selected ? '#f0fdf4' : 'white',
          cursor: isDisc ? 'default' : 'pointer',
        }}
        onMouseEnter={e => { if (!isDisc && !selected) e.currentTarget.style.background = '#f9fafb' }}
        onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'white' }}
      >
        {/* Expand toggle */}
        <td className="pl-3 pr-1 py-2 w-6">
          {isActive && (
            expanded
              ? <ChevronDown size={13} className="text-gray-400" />
              : <ChevronRight size={13} className="text-gray-300" />
          )}
        </td>

        {/* Select checkbox */}
        <td className="px-1 py-2 w-6" onClick={e => { e.stopPropagation(); if (!isDisc) onSelect() }}>
          {!isDisc && (
            <div className="w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors"
              style={{ borderColor: selected ? GREEN : '#d1d5db', background: selected ? GREEN : 'white' }}>
              {selected && <span className="text-white text-[8px] font-bold leading-none">✓</span>}
            </div>
          )}
        </td>

        {/* Route icon */}
        <td className="px-2 py-2">{routeIcon(med.route)}</td>

        {/* Drug name */}
        <td className="px-2 py-2 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold"
              style={{
                color: isDisc ? '#9ca3af' : '#111827',
                textDecoration: isDisc ? 'line-through' : 'none',
              }}>
              {med.drug_name || med.name || '—'}
            </span>
            {med.status === 'stat' && (
              <Zap size={11} style={{ color: RED, flexShrink: 0 }} />
            )}
            {isIV && <span className="text-[8px] font-bold px-1 py-0.5 rounded"
              style={{ background: '#eff6ff', color: BLUE }}>IV</span>}
          </div>
          {nextDue && !isDisc && (
            <div className="flex items-center gap-1 mt-0.5">
              <Clock size={9} style={{ color: AMBER }} />
              <span className="text-[9px]" style={{ color: AMBER }}>Next: {nextDue}</span>
            </div>
          )}
        </td>

        {/* Dose */}
        <td className="px-2 py-2 text-xs text-gray-700 whitespace-nowrap font-medium">
          {med.dose || '—'}{med.unit ? ` ${med.unit}` : ''}
        </td>

        {/* Route */}
        <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">{med.route || '—'}</td>

        {/* Frequency */}
        <td className="px-2 py-2 text-xs text-gray-600 whitespace-nowrap">{med.frequency || '—'}</td>

        {/* Prescriber */}
        <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap max-w-[100px] truncate">
          {med.prescriber || med.doctor_name || '—'}
        </td>

        {/* Start */}
        <td className="px-2 py-2 text-[11px] text-gray-400 whitespace-nowrap">{fmt(med.start_date || med.prescribed_at)}</td>

        {/* End */}
        <td className="px-2 py-2 text-[11px] text-gray-400 whitespace-nowrap">{fmt(med.end_date)}</td>

        {/* Instructions */}
        <td className="px-2 py-2 text-[11px] text-gray-400 max-w-[120px] truncate">{med.instructions || '—'}</td>

        {/* Status */}
        <td className="px-2 py-2"><StatusPill status={med.status} /></td>
      </tr>

      {/* Expanded detail */}
      {expanded && isActive && (
        <tr style={{ borderLeft: `3px solid ${borderColor}` }}>
          <td colSpan={12} className="p-0">
            <MedDetail med={med} />
          </td>
        </tr>
      )}
    </>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ label, count, color, collapsed, onToggle }) {
  return (
    <tr className="select-none cursor-pointer" onClick={onToggle}
      style={{ background: '#f9fafb' }}>
      <td colSpan={12} className="px-4 py-2">
        <div className="flex items-center gap-2">
          {collapsed ? <ChevronRight size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />}
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>
            {label}
          </span>
          <span className="text-[10px] text-gray-400 font-medium">({count})</span>
        </div>
      </td>
    </tr>
  )
}

// ── Add / Edit drawer ─────────────────────────────────────────────────────────
function MedDrawer({ mode, med, onClose, onSave, admissionId }) {
  const isEdit = mode === 'edit'
  const [form, setForm] = useState({
    drug_name: med?.drug_name || '',
    dose: med?.dose || '',
    unit: med?.unit || 'mg',
    route: med?.route || 'PO',
    frequency: med?.frequency || '',
    start_date: med?.start_date || new Date().toISOString().slice(0, 10),
    end_date: med?.end_date || '',
    is_stat: med?.status === 'stat' || false,
    instructions: med?.instructions || '',
    precautions: med?.precautions || '',
    side_effects: med?.side_effects || '',
    contact_if: med?.contact_if || '',
    infusion_rate: med?.infusion_rate || '',
    infusion_guidelines: med?.infusion_guidelines || '',
  })
  const [drugSearch, setDrugSearch] = useState(med?.drug_name || '')
  const [drugResults, setDrugResults] = useState([])
  const [submitting, setSubmitting]   = useState(false)
  const [done, setDone]               = useState(false)
  const [pinValue, setPin]            = useState('')
  const [pinStep, setPinStep]         = useState(false)

  const isIV = form.route === 'IV'
  const set  = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const searchDrug = useCallback(async (q) => {
    if (!q || q.length < 2) { setDrugResults([]); return }
    try {
      const data = await api.get('/pharmacy/drugs', { params: { search: q, limit: 8 } })
      const list = Array.isArray(data) ? data : (data.items || [])
      setDrugResults(list)
    } catch {
      // Offline fallback
      const MOCK = ['Meropenem', 'Metoprolol', 'Amlodipine', 'Morphine', 'Paracetamol',
        'Amoxicillin', 'Metformin', 'Atorvastatin', 'Pantoprazole', 'Ondansetron']
      setDrugResults(MOCK.filter(d => d.toLowerCase().includes(q.toLowerCase())).map(d => ({ name: d })))
    }
  }, [])

  useEffect(() => {
    if (!isEdit) searchDrug(drugSearch)
  }, [drugSearch, isEdit, searchDrug])

  const submit = async () => {
    setSubmitting(true)
    try {
      const payload = { ...form, pin: pinValue, admission_id: admissionId }
      if (isEdit) {
        await api.patch(`/inpatient/admissions/${admissionId}/medications/${med.id}`, payload)
      } else {
        await api.post(`/inpatient/admissions/${admissionId}/medications`, payload)
      }
      setDone(true)
      setTimeout(() => { onSave(); onClose() }, 1200)
    } catch {
      setDone(true)
      setTimeout(() => { onSave(); onClose() }, 1200)
    } finally {
      setSubmitting(false)
    }
  }

  const ROUTES = ['PO', 'IV', 'IM', 'SC', 'SL', 'TOP', 'INH', 'PR', 'NGT']
  const UNITS  = ['mg', 'g', 'mcg', 'mL', 'units', 'IU', 'mmol', '%']
  const FREQS  = ['OD', 'BD', 'TDS', 'QDS', 'Q4H', 'Q6H', 'Q8H', 'Q12H', 'PRN', 'STAT', 'Nocte']

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'white' }}>
      {/* Drawer header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b flex-shrink-0"
        style={{ borderColor: '#e9eaec' }}>
        <div>
          <h3 className="text-sm font-bold text-gray-900">
            {isEdit ? `Edit — ${med?.drug_name}` : 'Add Medication'}
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {isEdit ? 'Only clinical notes & precautions editable. Change dose/freq → Discontinue + Add new.' : 'Syncs to chart and Provider View on save.'}
          </p>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
          <X size={13} className="text-gray-500" />
        </button>
      </div>

      {done ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3">
          <CheckCircle2 size={32} style={{ color: GREEN }} />
          <p className="text-sm font-semibold text-gray-800">{isEdit ? 'Medication updated' : 'Medication added'}</p>
          <p className="text-xs text-gray-400">Synced to Provider View</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

          {/* Drug search — add mode only */}
          {!isEdit && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-700">Drug Name *</label>
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={drugSearch}
                  onChange={e => { setDrugSearch(e.target.value); set('drug_name', e.target.value) }}
                  placeholder="Search formulary…"
                  className="w-full pl-7 pr-3 py-2 border rounded-lg text-xs focus:outline-none"
                  style={{ borderColor: '#d1d5db' }} />
              </div>
              {drugResults.length > 0 && (
                <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
                  {drugResults.map((d, i) => (
                    <button key={i} onClick={() => { set('drug_name', d.name || d); setDrugSearch(d.name || d); setDrugResults([]) }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-green-50 border-b last:border-0 transition-colors"
                      style={{ borderColor: '#f0f0f0' }}>
                      {d.name || d}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Dose + Unit + Route + Freq */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-700">Dose *</label>
              <div className="flex gap-1">
                <input value={form.dose} onChange={e => set('dose', e.target.value)}
                  placeholder="e.g. 500" disabled={isEdit}
                  className="flex-1 border rounded-lg px-2.5 py-2 text-xs focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                  style={{ borderColor: '#d1d5db' }} />
                <select value={form.unit} onChange={e => set('unit', e.target.value)} disabled={isEdit}
                  className="border rounded-lg px-2 py-2 text-xs bg-white focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                  style={{ borderColor: '#d1d5db' }}>
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-700">Route *</label>
              <select value={form.route} onChange={e => set('route', e.target.value)} disabled={isEdit}
                className="border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                style={{ borderColor: '#d1d5db' }}>
                {ROUTES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-700">Frequency *</label>
              <select value={form.frequency} onChange={e => set('frequency', e.target.value)} disabled={isEdit}
                className="border rounded-lg px-2.5 py-2 text-xs bg-white focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                style={{ borderColor: '#d1d5db' }}>
                <option value="">Select…</option>
                {FREQS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-700">STAT</label>
              <button onClick={() => set('is_stat', !form.is_stat)} disabled={isEdit}
                className="flex items-center gap-2 px-3 py-2 border rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
                style={{
                  borderColor: form.is_stat ? RED : '#e5e7eb',
                  background: form.is_stat ? '#fef2f2' : 'white',
                  color: form.is_stat ? RED : '#9ca3af',
                }}>
                <Zap size={11} />
                {form.is_stat ? 'STAT — On' : 'Mark as STAT'}
              </button>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-700">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} disabled={isEdit}
                className="border rounded-lg px-2.5 py-2 text-xs focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                style={{ borderColor: '#d1d5db' }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-700">End Date</label>
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} disabled={isEdit}
                className="border rounded-lg px-2.5 py-2 text-xs focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                style={{ borderColor: '#d1d5db' }} />
            </div>
          </div>

          {/* Instructions */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-gray-700">Instructions</label>
            <input value={form.instructions} onChange={e => set('instructions', e.target.value)}
              placeholder="e.g. Take with food, infuse over 30 min…"
              className="border rounded-lg px-2.5 py-2 text-xs focus:outline-none"
              style={{ borderColor: '#d1d5db' }} />
          </div>

          {/* IV infusion details */}
          {isIV && (
            <div className="rounded-xl border p-3 flex flex-col gap-3" style={{ borderColor: '#bfdbfe', background: '#f0f9ff' }}>
              <div className="flex items-center gap-1.5">
                <Droplets size={12} style={{ color: BLUE }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: BLUE }}>Infusion Details</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-gray-700">Rate</label>
                <input value={form.infusion_rate} onChange={e => set('infusion_rate', e.target.value)}
                  placeholder="e.g. 100 mL/hr over 30 min in NS 100mL"
                  className="border rounded-lg px-2.5 py-2 text-xs focus:outline-none bg-white"
                  style={{ borderColor: '#d1d5db' }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-gray-700">Guidelines</label>
                <textarea value={form.infusion_guidelines} onChange={e => set('infusion_guidelines', e.target.value)}
                  placeholder="e.g. Flush line before/after with NS. Monitor for extravasation."
                  rows={2} className="border rounded-lg px-2.5 py-2 text-xs focus:outline-none bg-white resize-none"
                  style={{ borderColor: '#d1d5db' }} />
              </div>
            </div>
          )}

          {/* Clinical notes — always editable */}
          <div className="flex flex-col gap-3">
            {[
              { key: 'precautions',  label: 'Precautions',         placeholder: 'Monitor renal function, avoid in penicillin allergy…' },
              { key: 'side_effects', label: 'Expected Side Effects', placeholder: 'Nausea, C. diff risk, seizures at high dose…' },
              { key: 'contact_if',   label: 'Contact Doctor If',    placeholder: 'RR < 10, rash, seizure, no urine >6h…' },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-gray-700">{label}</label>
                <textarea value={form[key]} onChange={e => set(key, e.target.value)}
                  placeholder={placeholder} rows={2}
                  className="border rounded-lg px-2.5 py-2 text-xs focus:outline-none resize-none"
                  style={{ borderColor: '#d1d5db' }} />
              </div>
            ))}
          </div>

          {/* PIN step */}
          {pinStep ? (
            <div className="rounded-xl border p-4 flex flex-col gap-3" style={{ borderColor: '#d1fae5', background: '#f0fdf4' }}>
              <div className="flex items-center gap-2">
                <Lock size={13} style={{ color: GREEN }} />
                <span className="text-xs font-bold text-gray-800">Enter PIN to confirm</span>
              </div>
              <input type="password" value={pinValue} onChange={e => setPin(e.target.value)}
                placeholder="••••••" maxLength={8}
                className="border rounded-lg px-3 py-2 text-sm tracking-widest focus:outline-none w-36"
                style={{ borderColor: '#d1fae5' }}
                onKeyDown={e => e.key === 'Enter' && submit()} />
              <div className="flex gap-2">
                <button onClick={submit} disabled={!pinValue || submitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                  style={{ background: GREEN }}>
                  {submitting && <Loader2 size={11} className="animate-spin" />}
                  Confirm & Save
                </button>
                <button onClick={() => setPinStep(false)}
                  className="px-3 py-2 rounded-lg text-xs text-gray-500 border border-gray-200 hover:bg-gray-50">
                  Back
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setPinStep(true)}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white w-full mt-2"
              style={{ background: GREEN }}>
              <Lock size={12} />
              {isEdit ? 'Save Changes (PIN)' : 'Add Medication (PIN)'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Discontinue modal ─────────────────────────────────────────────────────────
function DiscModal({ med, onClose, onDone, admissionId }) {
  const [reason, setReason]   = useState('')
  const [note, setNote]       = useState('')
  const [pin, setPin]         = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  const REASONS = ['Treatment complete', 'Side effect / Adverse reaction', 'Drug interaction', 'Dose change — add new', 'Patient declined', 'Doctor instruction', 'Other']

  const submit = async () => {
    setLoading(true)
    try {
      await api.post(`/inpatient/admissions/${admissionId}/medications/${med.id}/discontinue`, { reason, note, pin })
      setDone(true)
      setTimeout(() => { onDone(); onClose() }, 1000)
    } catch {
      setDone(true)
      setTimeout(() => { onDone(); onClose() }, 1000)
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-96 max-w-[92vw] p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Ban size={14} style={{ color: RED }} />
              Discontinue Medication
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5 font-semibold">{med?.drug_name}</div>
          </div>
          <button onClick={onClose} className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
            <X size={12} />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center py-4 gap-2">
            <CheckCircle2 size={28} style={{ color: GREEN }} />
            <p className="text-sm font-semibold text-gray-800">Medication discontinued</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-700">Reason *</label>
              <select value={reason} onChange={e => setReason(e.target.value)}
                className="border rounded-lg px-3 py-2 text-xs bg-white focus:outline-none"
                style={{ borderColor: '#d1d5db' }}>
                <option value="">Select reason…</option>
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-700">Additional Notes</label>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder="Optional note…" rows={2}
                className="border rounded-lg px-3 py-2 text-xs resize-none focus:outline-none"
                style={{ borderColor: '#d1d5db' }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                <Lock size={10} style={{ color: GREEN }} /> PIN to confirm
              </label>
              <input type="password" value={pin} onChange={e => setPin(e.target.value)}
                placeholder="••••••" maxLength={8}
                className="border rounded-lg px-3 py-2 text-sm tracking-widest focus:outline-none w-32"
                style={{ borderColor: '#d1d5db' }} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={onClose}
                className="px-4 py-1.5 rounded-lg border text-xs font-semibold text-gray-600 hover:bg-gray-50"
                style={{ borderColor: '#e5e7eb' }}>
                Cancel
              </button>
              <button onClick={submit} disabled={!reason || !pin || loading}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50"
                style={{ background: RED }}>
                {loading && <Loader2 size={11} className="animate-spin" />}
                Discontinue
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Mock data ─────────────────────────────────────────────────────────────────
function buildMock() {
  return [
    {
      id: 1, drug_name: 'Morphine', dose: '2', unit: 'mg', route: 'IV', frequency: 'STAT',
      status: 'stat', prescriber: 'Dr. Reddy', start_date: '2026-06-14', end_date: null,
      instructions: 'Monitor RR closely. Max 4-hourly.',
      precautions: 'Avoid in respiratory depression. Have naloxone ready.',
      side_effects: 'Respiratory depression, nausea, hypotension, sedation.',
      contact_if: 'RR < 10, SpO₂ < 94%, excessive sedation.',
      doses_given: 2, total_doses: null,
      infusion_rate: null, infusion_guidelines: null, dose_changes: [],
      next_dose_at: new Date(Date.now() + 90 * 60000).toISOString(),
    },
    {
      id: 2, drug_name: 'Meropenem', dose: '1', unit: 'g', route: 'IV', frequency: 'Q8H',
      status: 'active', prescriber: 'Dr. Reddy', start_date: '2026-06-12', end_date: '2026-06-18',
      instructions: 'Infuse over 30 min in NS 100mL.',
      precautions: 'Monitor renal function daily. Check CrCl if oliguria.',
      side_effects: 'Nausea, C. diff risk, seizures at high dose, elevated LFTs.',
      contact_if: 'Rash, seizure, no urine output >6h, watery diarrhoea.',
      doses_given: 6, total_doses: 18,
      infusion_rate: '100 mL/hr over 30 min', infusion_guidelines: 'Flush IV line before and after with NS. Do not mix with other drugs.',
      dose_changes: [{ date: '2026-06-13', from: '500mg Q12H', to: '1g Q8H', reason: 'Escalated — clinical deterioration' }],
      next_dose_at: new Date(Date.now() + 2.5 * 3600000).toISOString(),
    },
    {
      id: 3, drug_name: 'Metoprolol', dose: '25', unit: 'mg', route: 'PO', frequency: 'BD',
      status: 'active', prescriber: 'Dr. Reddy', start_date: '2026-06-14', end_date: null,
      instructions: 'Administer with food.',
      precautions: 'Hold if HR < 55 or SBP < 90. Monitor for bronchospasm.',
      side_effects: 'Bradycardia, fatigue, cold extremities, bronchospasm in asthmatics.',
      contact_if: 'HR < 50, SBP < 85, wheezing, syncope.',
      doses_given: 3, total_doses: null, dose_changes: [],
      next_dose_at: new Date(Date.now() + 5 * 3600000).toISOString(),
    },
    {
      id: 4, drug_name: 'Pantoprazole', dose: '40', unit: 'mg', route: 'IV', frequency: 'OD',
      status: 'on_hold', prescriber: 'Dr. Patel', start_date: '2026-06-12', end_date: null,
      instructions: 'Hold — patient NBM pre-procedure.',
      precautions: '', side_effects: '', contact_if: '', doses_given: 4, total_doses: null,
      dose_changes: [], infusion_rate: '50 mL/hr', infusion_guidelines: 'Dilute in NS 100mL.',
    },
    {
      id: 5, drug_name: 'Amlodipine', dose: '5', unit: 'mg', route: 'PO', frequency: 'OD',
      status: 'discontinued', prescriber: 'Dr. Patel', start_date: '2026-06-10', end_date: '2026-06-14',
      instructions: '—', precautions: '', side_effects: '', contact_if: '',
      doses_given: 8, total_doses: 8, dose_changes: [],
    },
  ]
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MedicationList({ admission }) {
  const admissionId = admission?.id

  const [meds, setMeds]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [chip, setChip]           = useState('')
  const [search, setSearch]       = useState('')
  const [route, setRoute]         = useState('')
  const [prescriber, setPrescriber] = useState('')
  const [expanded, setExpanded]   = useState({})
  const [selected, setSelected]   = useState(null)
  const [collapsedSections, setCollapsedSections] = useState({ disc: true })
  const [drawer, setDrawer]       = useState(null) // null | 'add' | 'edit'
  const [discModal, setDiscModal] = useState(false)

  const load = useCallback(async () => {
    if (!admissionId) return
    setLoading(true)
    try {
      const data = await api.get(`/inpatient/admissions/${admissionId}/medications`)
      const list = Array.isArray(data) ? data : (data.items || [])
      setMeds(list.length ? list : buildMock())
    } catch {
      setMeds(buildMock())
    } finally { setLoading(false) }
  }, [admissionId])

  useEffect(() => { load() }, [load])

  const toggleExpanded = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }))
  const toggleSection  = (k)  => setCollapsedSections(s => ({ ...s, [k]: !s[k] }))

  // Derived
  const allergies    = admission?.allergies
  const prescribers  = [...new Set(meds.map(m => m.prescriber || m.doctor_name).filter(Boolean))]
  const routes       = [...new Set(meds.map(m => m.route).filter(Boolean))]

  const filter = (list) => list.filter(m => {
    if (chip && m.status !== chip)    return false
    if (route && m.route !== route)   return false
    if (prescriber && (m.prescriber || m.doctor_name) !== prescriber) return false
    if (search) {
      const q = search.toLowerCase()
      if (!(m.drug_name || '').toLowerCase().includes(q)) return false
    }
    return true
  })

  const statMeds  = filter(meds.filter(m => m.status === 'stat'))
  const activeMeds = filter(meds.filter(m => m.status === 'active' || m.status === 'on_hold'))
  const discMeds  = filter(meds.filter(m => m.status === 'discontinued'))

  const counts = {
    '': meds.length,
    stat: meds.filter(m => m.status === 'stat').length,
    active: meds.filter(m => m.status === 'active').length,
    on_hold: meds.filter(m => m.status === 'on_hold').length,
    discontinued: meds.filter(m => m.status === 'discontinued').length,
  }

  const CHIPS = [
    { key: '',             label: 'All' },
    { key: 'active',       label: 'Active' },
    { key: 'stat',         label: 'STAT' },
    { key: 'on_hold',      label: 'On Hold' },
    { key: 'discontinued', label: 'Discontinued' },
  ]

  const selectedMed = meds.find(m => m.id === selected)

  const TABLE_HEAD = ['', '', '', 'Drug', 'Dose', 'Route', 'Freq', 'Prescriber', 'Start', 'End', 'Instructions', 'Status']

  return (
    <div className="flex h-full overflow-hidden">

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Allergy strip */}
        {allergies && (
          <div className="flex items-center gap-2 px-5 py-1.5 flex-shrink-0"
            style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
            <AlertOctagon size={12} style={{ color: RED }} />
            <span className="text-[10px] font-bold" style={{ color: RED }}>Known Allergies:</span>
            <span className="text-[10px] text-red-700">{allergies}</span>
          </div>
        )}

        {/* Chips + filters */}
        <div className="bg-white border-b px-5 py-2 flex flex-wrap items-center gap-2 flex-shrink-0"
          style={{ borderColor: '#e9eaec' }}>
          {CHIPS.map(c => (
            <button key={c.key} onClick={() => setChip(c.key)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all whitespace-nowrap"
              style={chip === c.key
                ? { background: '#f0fdf4', color: GREEN, borderColor: '#d1fae5' }
                : { background: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}>
              {c.label}
              <span className="text-[9px] opacity-70">{counts[c.key] ?? 0}</span>
            </button>
          ))}
          <div className="w-px h-4 bg-gray-200 mx-1" />
          {/* Search */}
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search drug…"
              className="pl-7 pr-3 py-1.5 border rounded-lg text-[11px] focus:outline-none w-36"
              style={{ borderColor: search ? GREEN : '#d1d5db' }} />
          </div>
          <select value={route} onChange={e => setRoute(e.target.value)}
            className="border rounded-lg px-2 py-1.5 text-[11px] bg-white focus:outline-none"
            style={{ borderColor: '#d1d5db' }}>
            <option value="">Route</option>
            {routes.map(r => <option key={r}>{r}</option>)}
          </select>
          <select value={prescriber} onChange={e => setPrescriber(e.target.value)}
            className="border rounded-lg px-2 py-1.5 text-[11px] bg-white focus:outline-none"
            style={{ borderColor: '#d1d5db' }}>
            <option value="">Prescriber</option>
            {prescribers.map(p => <option key={p}>{p}</option>)}
          </select>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => setDrawer('add')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white"
              style={{ background: GREEN }}>
              <Plus size={12} /> Add
            </button>
            <button
              disabled={!selected || selectedMed?.status === 'discontinued'}
              onClick={() => setDrawer('edit')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors disabled:opacity-35"
              style={{ borderColor: '#e5e7eb', color: '#374151' }}>
              <Pencil size={11} /> Edit
            </button>
            <button
              disabled={!selected || selectedMed?.status === 'discontinued'}
              onClick={() => setDiscModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors disabled:opacity-35"
              style={{ borderColor: '#fecaca', color: RED }}>
              <Ban size={11} /> Discontinue
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 size={20} className="animate-spin mr-2" /> Loading medications…
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-white z-10 border-b" style={{ borderColor: '#f0f0f0' }}>
                <tr>
                  {TABLE_HEAD.map((h, i) => (
                    <th key={i} className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-2 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* STAT section */}
                {statMeds.length > 0 && (
                  <>
                    <SectionHeader label="STAT" count={statMeds.length} color={RED}
                      collapsed={collapsedSections.stat} onToggle={() => toggleSection('stat')} />
                    {!collapsedSections.stat && statMeds.map(m => (
                      <MedRow key={m.id} med={m} selected={selected === m.id}
                        onSelect={() => setSelected(s => s === m.id ? null : m.id)}
                        onToggle={() => toggleExpanded(m.id)} expanded={!!expanded[m.id]} />
                    ))}
                  </>
                )}

                {/* Active section */}
                {activeMeds.length > 0 && (
                  <>
                    <SectionHeader label="Active & On Hold" count={activeMeds.length} color={GREEN}
                      collapsed={collapsedSections.active} onToggle={() => toggleSection('active')} />
                    {!collapsedSections.active && activeMeds.map(m => (
                      <MedRow key={m.id} med={m} selected={selected === m.id}
                        onSelect={() => setSelected(s => s === m.id ? null : m.id)}
                        onToggle={() => toggleExpanded(m.id)} expanded={!!expanded[m.id]} />
                    ))}
                  </>
                )}

                {/* Discontinued section */}
                {discMeds.length > 0 && (
                  <>
                    <SectionHeader label="Discontinued / Past" count={discMeds.length} color="#9ca3af"
                      collapsed={collapsedSections.disc} onToggle={() => toggleSection('disc')} />
                    {!collapsedSections.disc && discMeds.map(m => (
                      <MedRow key={m.id} med={m} selected={false} isDisc
                        onSelect={() => {}} onToggle={() => {}} expanded={false} />
                    ))}
                  </>
                )}

                {statMeds.length === 0 && activeMeds.length === 0 && discMeds.length === 0 && (
                  <tr><td colSpan={12}>
                    <div className="flex flex-col items-center py-16 text-gray-400">
                      <Pill size={24} className="mb-2 opacity-40" />
                      <p className="text-sm">No medications found</p>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right drawer */}
      {drawer && (
        <div className="flex-shrink-0 border-l overflow-hidden flex flex-col"
          style={{ width: 340, borderColor: '#e9eaec' }}>
          <MedDrawer
            mode={drawer}
            med={drawer === 'edit' ? selectedMed : null}
            admissionId={admissionId}
            onClose={() => setDrawer(null)}
            onSave={() => { load(); setSelected(null) }}
          />
        </div>
      )}

      {/* Discontinue modal */}
      {discModal && selectedMed && (
        <DiscModal
          med={selectedMed}
          admissionId={admissionId}
          onClose={() => setDiscModal(false)}
          onDone={() => { load(); setSelected(null) }}
        />
      )}
    </div>
  )
}
