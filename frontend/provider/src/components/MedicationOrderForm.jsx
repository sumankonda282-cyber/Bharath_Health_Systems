import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../api/client'
import { checkInteractions, checkAllergyConflict } from '../data/drugInteractions'
import { useAuth } from '../contexts/AuthContext'
import {
  Search, X, Loader2, AlertTriangle, XCircle, Info, CheckCircle2,
  Pill, Droplets, ShieldAlert, Phone, History, Package,
} from 'lucide-react'

// ── constants ──────────────────────────────────────────────────────────────────
const ROUTES = ['PO', 'IV', 'IM', 'SC', 'SL', 'TOP', 'INH', 'PR', 'NG', 'NGT']
const FREQS  = ['OD', 'BD', 'TDS', 'QID', 'Q4H', 'Q6H', 'Q8H', 'Q12H', 'HS', 'AC', 'PC', 'PRN', 'STAT', 'CONT', 'Nocte']
const UNITS  = ['mg', 'g', 'mcg', 'mL', 'units', 'IU', 'mmol', '%', 'mg/kg']
const FREQ_COUNT = { OD: 1, BD: 2, TDS: 3, QID: 4, Q4H: 6, Q6H: 4, Q8H: 3, Q12H: 2, HS: 1, Nocte: 1 }

const EMPTY = {
  drug_name: '', generic_name: '', brand_name: '',
  dose: '', unit: 'mg', route: 'PO', frequency: 'OD',
  duration_days: '', instructions: '', precautions: '',
  side_effects: '', contact_if: '',
  is_stat: false, is_prn: false, prn_reason: '', is_continuous: false,
  iv_fluid: '', iv_volume_ml: '', iv_rate: '', notes: '',
}

const SEV_CFG = {
  major:    { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', Icon: XCircle,       label: 'Major Interaction' },
  moderate: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', Icon: AlertTriangle,  label: 'Moderate Interaction' },
  minor:    { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', Icon: Info,           label: 'Minor Interaction' },
}

// ── localStorage helpers ───────────────────────────────────────────────────────
const draftKey  = id  => `med_draft_${id}`
const recentKey = uid => `med_recent_${uid}`

function loadRecent(uid) {
  try { return JSON.parse(localStorage.getItem(recentKey(uid)) || '[]') } catch { return [] }
}

function saveRecent(uid, entry) {
  const list = loadRecent(uid).filter(r => r.drug_name !== entry.drug_name)
  localStorage.setItem(recentKey(uid), JSON.stringify([entry, ...list].slice(0, 20)))
}

// ── Suggestion Card ────────────────────────────────────────────────────────────
function SuggestionCard({ s, onFill, isSearchResult }) {
  const brand   = s.primary_brand || s.brand_name || ''
  const brands  = isSearchResult && s.brands ? s.brands.split('|').slice(0, 3).join(', ') : ''
  const doseStr = s.form
    ? `${s.form.dose}${s.form.unit} · ${s.form.route} · ${s.form.frequency}${s.form.duration_days ? ` · ${s.form.duration_days} days` : ''}`
    : (s.routes ? s.routes.replace(/\|/g, ' / ') : '')
  const sideEffects   = s.form?.side_effects || ''
  const instructions  = s.form?.instructions  || ''
  const drugClass     = s.drug_class || ''

  return (
    <div
      onClick={() => onFill(s)}
      className="group border rounded-xl p-3 cursor-pointer transition-all"
      style={{ borderColor: '#e5e7eb', background: 'white' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#f5f3ff' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white' }}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-gray-900 truncate">
            {isSearchResult ? s.generic : s.drug_name}
          </p>
          {brand && <p className="text-[11px] text-gray-400">{brand}{brands && brands !== brand ? ` · ${brands}` : ''}</p>}
        </div>
        {isSearchResult && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 border ${
            s.inStock
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-gray-100 text-gray-400 border-gray-200'
          }`}>
            {s.inStock ? '✓ In Stock' : 'Out of Stock'}
          </span>
        )}
      </div>

      {doseStr && (
        <p className="text-[11px] text-indigo-700 font-semibold mb-1">{doseStr}</p>
      )}

      {drugClass && (
        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 mb-1">
          {drugClass}
        </span>
      )}
      {s.rx_only && (
        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 mb-1 ml-1">
          Rx Only
        </span>
      )}

      {sideEffects && (
        <p className="text-[10px] text-purple-600 mt-1">
          SE: {sideEffects.slice(0, 70)}{sideEffects.length > 70 ? '…' : ''}
        </p>
      )}
      {instructions && (
        <p className="text-[10px] text-blue-600">
          {instructions.slice(0, 70)}{instructions.length > 70 ? '…' : ''}
        </p>
      )}

      <p className="mt-2 text-[10px] font-bold text-indigo-400 group-hover:text-indigo-600">
        → Fill entire form
      </p>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function MedicationOrderForm({
  admissionId,
  patientAllergies = [],
  existingOrders   = [],
  patientData      = {},
  onSubmit,
  onCancel,
  initialValues    = null,
}) {
  const { user } = useAuth()
  const userId   = user?.id || 'guest'

  // form state — load draft on mount
  const [form, setForm] = useState(() => {
    if (initialValues) return { ...EMPTY, ...initialValues }
    try {
      const saved = localStorage.getItem(draftKey(admissionId))
      if (saved) return { ...EMPTY, ...JSON.parse(saved) }
    } catch {}
    return EMPTY
  })

  const [query,       setQuery]       = useState(initialValues?.drug_name || '')
  const [searchRes,   setSearchRes]   = useState([])
  const [searching,   setSearching]   = useState(false)
  const [selected,    setSelected]    = useState(null)
  const [availRoutes, setAvailRoutes] = useState(ROUTES)

  const [interAlerts,    setInterAlerts]    = useState([])
  const [allergyAlerts,  setAllergyAlerts]  = useState([])
  const [overrideReason, setOverrideReason] = useState('')

  const [recent,  setRecent]  = useState(() => loadRecent(userId))
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(false)

  const searchTimer = useRef(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // auto-save draft (skip for edit mode)
  useEffect(() => {
    if (!admissionId || initialValues) return
    localStorage.setItem(draftKey(admissionId), JSON.stringify(form))
  }, [form, admissionId, initialValues])

  // drug search with debounce
  useEffect(() => {
    clearTimeout(searchTimer.current)
    if (!query || query.length < 2) { setSearchRes([]); return }
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const [termRes, pharmRes] = await Promise.allSettled([
          api.get('/terminology/drugs/search', { params: { q: query, limit: 12 } }),
          api.get('/pharmacy/drugs/search',    { params: { q: query, limit: 20 } }),
        ])
        const termList  = termRes.status  === 'fulfilled' ? (Array.isArray(termRes.value)  ? termRes.value  : []) : []
        const pharmList = pharmRes.status === 'fulfilled' ? (Array.isArray(pharmRes.value) ? pharmRes.value : (pharmRes.value?.items || [])) : []

        const stockNames = new Set(pharmList.map(p => (p.name || p.generic_name || '').toLowerCase()))
        const merged = termList.map(d => ({
          ...d,
          inStock: stockNames.has(d.generic.toLowerCase()) ||
            pharmList.some(p => (p.name || p.generic_name || '').toLowerCase().includes(d.generic.toLowerCase().slice(0, 6))),
        }))
        setSearchRes(merged)
      } catch {}
      finally { setSearching(false) }
    }, 300)
  }, [query])

  // on drug select from library
  const selectDrug = useCallback(async (drug) => {
    const routes = drug.routes ? drug.routes.split('|').map(r => r.trim()).filter(Boolean) : ROUTES
    const avail  = routes.length ? routes : ROUTES
    setAvailRoutes(avail)
    const defaultRoute = avail[0] || 'PO'

    setSelected(drug)
    setQuery(drug.generic)
    setSearchRes([])
    setForm(f => ({
      ...f,
      drug_name:    drug.generic,
      generic_name: drug.generic,
      brand_name:   drug.primary_brand || (drug.brands ? drug.brands.split('|')[0].trim() : ''),
      route:        defaultRoute,
    }))

    const drugStr = drug.generic
    setInterAlerts(checkInteractions(drugStr, existingOrders))
    setAllergyAlerts(checkAllergyConflict(drugStr, patientAllergies))

    // fetch counselling tips
    try {
      const res = await api.get('/terminology/drugs/counselling', { params: { generic: drug.generic } })
      if (res?.tips?.length) {
        const tips = res.tips.join('. ')
        setForm(f => ({ ...f, instructions: tips }))
      }
    } catch {}

    // fetch backend interactions and merge
    try {
      const rows = await api.get('/terminology/drugs/interactions', { params: { generic: drug.generic } })
      if (Array.isArray(rows)) {
        const backendAlerts = []
        for (const row of rows) {
          const other = row.drug_a.toLowerCase() === drug.generic.toLowerCase() ? row.drug_b : row.drug_a
          const conflict = existingOrders.find(o =>
            o.status !== 'discontinued' &&
            `${o.drug_name} ${o.generic_name || ''}`.toLowerCase().includes(other.toLowerCase())
          )
          if (conflict) {
            backendAlerts.push({
              severity:    row.severity === 'contraindicated' ? 'major' : (row.severity || 'moderate'),
              message:     row.effect || `${drug.generic} + ${other}: ${row.severity} interaction`,
              conflictWith: conflict.drug_name,
              management:  row.management,
            })
          }
        }
        setInterAlerts(prev => {
          const merged = [...backendAlerts]
          for (const a of prev) {
            if (!merged.some(b => b.conflictWith === a.conflictWith)) merged.push(a)
          }
          return merged
        })
      }
    } catch {}
  }, [existingOrders, patientAllergies])

  // fill from suggestion card
  const fillSuggestion = useCallback((s) => {
    if (s.form) {
      setForm(f => ({ ...f, ...s.form }))
      setQuery(s.drug_name)
      setAvailRoutes([s.form.route, ...ROUTES.filter(r => r !== s.form.route)])
      setSelected({ generic: s.drug_name, primary_brand: s.brand_name, drug_class: s.drug_class, routes: s.form.route })
      setInterAlerts(checkInteractions(s.drug_name, existingOrders))
      setAllergyAlerts(checkAllergyConflict(s.drug_name, patientAllergies))
    } else {
      selectDrug(s)
    }
    setSearchRes([])
  }, [existingOrders, patientAllergies, selectDrug])

  // computed
  const isIV      = form.route === 'IV'
  const hasMajor  = interAlerts.some(a => a.severity === 'major')
  const totalDoses = form.duration_days && FREQ_COUNT[form.frequency]
    ? parseInt(form.duration_days) * FREQ_COUNT[form.frequency]
    : null
  const infusionHours = isIV && form.iv_volume_ml && form.iv_rate
    ? (parseFloat(form.iv_volume_ml) / parseFloat(form.iv_rate)).toFixed(1)
    : null

  const handleSubmit = async () => {
    if (!form.drug_name)  { setError('Drug name is required'); return }
    if (!form.dose)       { setError('Dose is required'); return }
    if (!form.frequency)  { setError('Frequency is required'); return }
    if (hasMajor && !overrideReason) { setError('Enter a clinical override reason for the major interaction'); return }

    setSaving(true); setError('')
    try {
      await onSubmit({
        ...form,
        duration_days: form.duration_days ? parseInt(form.duration_days) : null,
        iv_volume_ml:  form.iv_volume_ml  ? parseInt(form.iv_volume_ml)  : null,
        override_reason: overrideReason || undefined,
      })
      saveRecent(userId, { drug_name: form.drug_name, brand_name: form.brand_name, drug_class: selected?.drug_class, form: { ...form }, ts: Date.now() })
      setRecent(loadRecent(userId))
      localStorage.removeItem(draftKey(admissionId))
      setDone(true)
    } catch (e) {
      setError(e?.response?.data?.detail || e?.detail || 'Failed to save medication order')
    } finally { setSaving(false) }
  }

  if (done) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl p-10 flex flex-col items-center gap-3 shadow-2xl">
        <CheckCircle2 size={44} className="text-green-600" />
        <p className="text-base font-semibold text-gray-800">Medication order added</p>
        <button onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600 mt-1">Close</button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ width: '88vw', maxWidth: 1200, height: '88vh' }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ background: '#0F2557' }}>
          <div className="flex items-center gap-3 min-w-0">
            <Pill size={18} className="text-white flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white">
                {initialValues ? 'Edit Medication Order' : 'New Medication Order'}
              </h2>
              {patientData.name && (
                <p className="text-[11px] text-white/55 mt-0.5 truncate">
                  {patientData.name}
                  {patientData.age  ? `, ${patientData.age}`     : ''}
                  {patientData.weight_kg ? ` · ${patientData.weight_kg} kg` : ''}
                  {patientData.diagnoses?.length ? ` · ${patientData.diagnoses.slice(0, 2).join(', ')}` : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {patientAllergies.slice(0, 4).map((a, i) => (
              <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline-block"
                style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5' }}>
                ⚠ {a.allergen_name || a.allergen}
              </span>
            ))}
            <button onClick={onCancel}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.12)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}>
              <X size={15} className="text-white" />
            </button>
          </div>
        </div>

        {/* ── Body: two-panel layout ── */}
        <div className="flex flex-1 min-h-0">

          {/* LEFT — form fields */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

            {/* Drug search */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Drug Name *</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  className="w-full border rounded-xl pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ borderColor: '#e5e7eb' }}
                  placeholder="Search by generic or brand name…"
                  value={query}
                  onChange={e => { setQuery(e.target.value); set('drug_name', e.target.value); setSelected(null) }}
                  autoFocus
                />
                {searching && (
                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                )}
              </div>
              {selected && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {selected.primary_brand && (
                    <span className="text-[11px] text-gray-500">Brand: <strong className="text-gray-700">{selected.primary_brand}</strong></span>
                  )}
                  {selected.drug_class && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}>
                      {selected.drug_class}
                    </span>
                  )}
                  {selected.rx_only && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ background: '#fffbeb', color: '#92400e', borderColor: '#fde68a' }}>
                      Rx Only
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Allergy alert */}
            {allergyAlerts.length > 0 && (
              <div className="rounded-xl border-2 px-4 py-3 space-y-1" style={{ background: '#fef2f2', borderColor: '#f87171' }}>
                <div className="flex items-center gap-2">
                  <ShieldAlert size={15} className="text-red-600" />
                  <span className="text-sm font-bold text-red-700">Allergy Conflict Detected</span>
                </div>
                {allergyAlerts.map((a, i) => (
                  <p key={i} className="text-xs text-red-700 pl-5">
                    Documented allergy: <strong>{a.allergen_name || a.allergen}</strong>
                    {a.reaction_type ? ` (${a.reaction_type})` : ''}
                  </p>
                ))}
              </div>
            )}

            {/* Interaction alerts */}
            {interAlerts.map((alert, i) => {
              const cfg = SEV_CFG[alert.severity] || SEV_CFG.moderate
              const Ic  = cfg.Icon
              return (
                <div key={i} className="rounded-xl border px-4 py-3"
                  style={{ background: cfg.bg, borderColor: cfg.border }}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Ic size={13} style={{ color: cfg.text }} />
                    <span className="text-xs font-bold" style={{ color: cfg.text }}>
                      {cfg.label} — with {alert.conflictWith}
                    </span>
                  </div>
                  <p className="text-xs pl-5" style={{ color: cfg.text }}>{alert.message}</p>
                  {alert.management && (
                    <p className="text-xs pl-5 mt-0.5 font-medium" style={{ color: cfg.text }}>
                      Management: {alert.management}
                    </p>
                  )}
                </div>
              )
            })}

            {/* Override reason for major interactions */}
            {hasMajor && (
              <div>
                <label className="block text-[11px] font-bold text-red-600 mb-1.5 uppercase tracking-wider">
                  Clinical Override Reason (required) *
                </label>
                <input
                  className="w-full border-2 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  style={{ borderColor: '#fca5a5' }}
                  placeholder="Enter clinical justification to proceed despite major interaction…"
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                />
              </div>
            )}

            {/* Dose · Unit · Route */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Dose *</label>
                <input
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ borderColor: '#e5e7eb' }}
                  placeholder="e.g. 500"
                  value={form.dose}
                  onChange={e => set('dose', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Unit</label>
                <select
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ borderColor: '#e5e7eb' }}
                  value={form.unit} onChange={e => set('unit', e.target.value)}>
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Route</label>
                <select
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ borderColor: '#e5e7eb' }}
                  value={form.route} onChange={e => set('route', e.target.value)}>
                  {availRoutes.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>

            {/* Frequency · Duration · Total doses */}
            <div className="grid grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Frequency *</label>
                <select
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ borderColor: '#e5e7eb' }}
                  value={form.frequency} onChange={e => set('frequency', e.target.value)}>
                  {FREQS.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Duration (days)</label>
                <input
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  style={{ borderColor: '#e5e7eb' }}
                  type="number" min="1" placeholder="e.g. 5"
                  value={form.duration_days} onChange={e => set('duration_days', e.target.value)}
                />
              </div>
              <div className="pb-1">
                {totalDoses !== null ? (
                  <div className="text-center py-2 rounded-xl border font-semibold text-sm"
                    style={{ background: '#f0fdf4', borderColor: '#d1fae5', color: '#065f46' }}>
                    {totalDoses} doses total
                  </div>
                ) : (
                  <div className="text-center py-2 rounded-xl border text-xs text-gray-400"
                    style={{ borderColor: '#e5e7eb' }}>
                    Enter freq + days
                  </div>
                )}
              </div>
            </div>

            {/* IV infusion details */}
            {isIV && (
              <div className="rounded-xl border p-4 space-y-3" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
                <div className="flex items-center gap-2">
                  <Droplets size={14} className="text-blue-600" />
                  <span className="text-xs font-bold text-blue-700">IV Infusion Details</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-blue-700 mb-1">Fluid</label>
                    <select
                      className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
                      value={form.iv_fluid} onChange={e => set('iv_fluid', e.target.value)}>
                      <option value="">Select…</option>
                      {['NS (0.9%)', 'D5W', 'RL', 'DNS', 'D10W', 'Sterile Water', 'D5NS', 'D5RL'].map(x => <option key={x}>{x}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-blue-700 mb-1">Volume (mL)</label>
                    <input
                      className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
                      type="number" placeholder="e.g. 100"
                      value={form.iv_volume_ml} onChange={e => set('iv_volume_ml', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-blue-700 mb-1">Rate (mL/hr)</label>
                    <input
                      className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
                      placeholder="e.g. 50"
                      value={form.iv_rate} onChange={e => set('iv_rate', e.target.value)}
                    />
                  </div>
                </div>
                {infusionHours && (
                  <p className="text-[11px] font-semibold text-blue-700">
                    ≈ Infusion time: {infusionHours} hours
                  </p>
                )}
              </div>
            )}

            {/* Instructions */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Instructions</label>
              <textarea
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                style={{ borderColor: '#e5e7eb' }}
                rows={2} placeholder="Patient / nurse instructions…"
                value={form.instructions} onChange={e => set('instructions', e.target.value)}
              />
            </div>

            {/* Side Effects + Precautions */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold mb-1.5 uppercase tracking-wider" style={{ color: '#7c3aed' }}>
                  Expected Side Effects
                </label>
                <textarea
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none"
                  style={{ borderColor: '#e9d5ff', '--tw-ring-color': '#7c3aed' }}
                  rows={2} placeholder="e.g. Nausea, dizziness…"
                  value={form.side_effects} onChange={e => set('side_effects', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Precautions</label>
                <textarea
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  style={{ borderColor: '#e5e7eb' }}
                  rows={2} placeholder="Monitor for, avoid in…"
                  value={form.precautions} onChange={e => set('precautions', e.target.value)}
                />
              </div>
            </div>

            {/* Contact doctor if */}
            <div>
              <label className="block text-[11px] font-bold mb-1.5 uppercase tracking-wider flex items-center gap-1" style={{ color: '#dc2626' }}>
                <Phone size={11} /> Contact Doctor If
              </label>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                style={{ borderColor: '#fecaca' }}
                placeholder="e.g. Rash, dyspnoea, glucose <3.5 mmol/L, fever >39°C"
                value={form.contact_if} onChange={e => set('contact_if', e.target.value)}
              />
            </div>

            {/* Flags: STAT / PRN / Continuous */}
            <div className="flex flex-wrap items-center gap-6">
              {[
                { key: 'is_stat',       label: '⚡ STAT',       color: '#dc2626' },
                { key: 'is_prn',        label: '◷ PRN',         color: '#7c3aed' },
                { key: 'is_continuous', label: '∞ Continuous',  color: '#0284c7' },
              ].map(({ key, label, color }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                  <button
                    type="button"
                    onClick={() => set(key, !form[key])}
                    className="w-10 h-5 rounded-full relative transition-colors flex-shrink-0"
                    style={{ background: form[key] ? color : '#d1d5db' }}>
                    <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all block"
                      style={{ left: form[key] ? '22px' : '2px' }} />
                  </button>
                  <span className="text-[12px] font-semibold" style={{ color: form[key] ? color : '#6b7280' }}>
                    {label}
                  </span>
                </label>
              ))}
            </div>

            {form.is_prn && (
              <div>
                <label className="block text-[11px] font-bold mb-1.5" style={{ color: '#7c3aed' }}>PRN Reason / Trigger</label>
                <input
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: '#e9d5ff' }}
                  placeholder="e.g. For pain ≥5/10 NRS · For fever >38.5°C · For BP >160/100"
                  value={form.prn_reason} onChange={e => set('prn_reason', e.target.value)}
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Additional Notes</label>
              <input
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ borderColor: '#e5e7eb' }}
                placeholder="Optional — for pharmacy or nursing team"
                value={form.notes} onChange={e => set('notes', e.target.value)}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <AlertTriangle size={13} className="flex-shrink-0" /> {error}
              </div>
            )}
          </div>

          {/* RIGHT — suggestions */}
          <div className="w-80 flex-shrink-0 overflow-y-auto border-l"
            style={{ background: '#f8f9ff', borderColor: '#ede9fe' }}>
            <div className="px-4 py-4 space-y-4">

              {searchRes.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Search size={10} /> Search Results
                  </p>
                  <div className="space-y-2">
                    {searchRes.map((d, i) => (
                      <SuggestionCard key={i} s={d} onFill={fillSuggestion} isSearchResult />
                    ))}
                  </div>
                </div>
              )}

              {recent.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <History size={10} /> Your Recent
                  </p>
                  <div className="space-y-2">
                    {recent.slice(0, 10).map((r, i) => (
                      <SuggestionCard key={i} s={r} onFill={fillSuggestion} isSearchResult={false} />
                    ))}
                  </div>
                </div>
              )}

              {!searchRes.length && !recent.length && (
                <div className="flex flex-col items-center py-12 text-center">
                  <Package size={28} className="text-gray-300 mb-3" />
                  <p className="text-xs text-gray-400 font-medium">Start typing to search</p>
                  <p className="text-[11px] text-gray-300 mt-1">Your recent prescriptions will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t flex-shrink-0 bg-white">
          <div className="text-[11px] text-gray-500 truncate pr-4">
            {form.drug_name && form.dose && (
              <span className="font-semibold text-gray-700">
                {form.drug_name} {form.dose}{form.unit} · {form.route} · {form.frequency}
                {form.duration_days ? ` · ${form.duration_days} days` : ''}
                {totalDoses ? ` (${totalDoses} doses)` : ''}
                {form.is_stat ? ' · STAT' : ''}
                {form.is_prn  ? ' · PRN'  : ''}
              </span>
            )}
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <button onClick={onCancel}
              className="px-5 py-2 rounded-xl border text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              style={{ borderColor: '#e5e7eb' }}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !form.drug_name || !form.dose}
              className="px-6 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-50 flex items-center gap-2 transition-colors"
              style={{ background: hasMajor && !overrideReason ? '#9ca3af' : '#4f46e5' }}>
              {saving ? <><Loader2 size={13} className="animate-spin" />Saving…</> : initialValues ? 'Update Order' : 'Add Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
