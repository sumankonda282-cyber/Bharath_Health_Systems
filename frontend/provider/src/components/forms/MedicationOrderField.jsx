import { useState, useEffect, useContext, useRef } from 'react'
import {
  Pill, AlertTriangle, ShieldAlert, Info, Loader2, X, Check, Plus, Pencil, RefreshCw, Trash2,
} from 'lucide-react'
import api from '../../api/client'
import { PatientDataContext, loadClinicalContext } from './patientContext'

// ─────────────────────────────────────────────────────────────────────────────
// medication_order — the CareForm "smart" prescribing field, cart style.
//
// The doctor searches a drug (dropdown), the composer auto-fills dose from
// age/weight and flags allergy/interaction/counselling, then ADDS it to a growing
// list (like a cart). The entry resets for the next drug; at the end every med is
// ordered together. A drug already in the cart OR active in the chart shows a
// small red "Duplicate" with a refill option. Each added row stays click-to-edit
// until the pharmacist acknowledges & fills.
//
// value = Array<order>. Legacy single-object values are wrapped transparently.
// ─────────────────────────────────────────────────────────────────────────────

const FREQS = ['OD', 'BD', 'TID', 'QID', 'HS', 'SOS', 'STAT', 'Q4H', 'Q6H', 'Q8H']
const SEV_STYLE = {
  high: 'text-red-600', contraindicated: 'text-red-600', serious: 'text-red-600', major: 'text-red-600',
  moderate: 'text-amber-600', minor: 'text-yellow-600', low: 'text-yellow-600',
}
const EMPTY = {}

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim()
// Concept key for duplicate detection: strip trailing strength so "Dolo 650" and
// "Paracetamol 500mg" collapse to the ingredient where possible.
const conceptKey = (o) => norm((o?.generic || o?.drug || '').replace(/\d+\s*(mg|ml|mcg|g|iu|%)\b.*/i, ''))

// A CDS warning → a 1–3 word inline flag.
const shortFlag = (w) => {
  if (w.type === 'interaction')      return w.severity === 'contraindicated' ? 'Severe interaction' : `${w.severity} interaction`
  if (w.type === 'duplication')      return 'Duplicate class'
  if (w.type === 'dose')             return 'Over max dose'
  if (w.type === 'contraindication') return 'Contraindicated'
  if (w.type === 'schedule')         return `Schedule ${w.schedule || ''}`.trim()
  return w.type
}

const orderLine = (o) => {
  const bits = [o.form ? `${o.form}.` : null, o.drug, o.dose_label || (o.dose_mg ? `${o.dose_mg} mg` : null),
    o.frequency, o.duration_days ? `${o.duration_days}d` : null].filter(Boolean)
  return bits.join(' · ')
}

export default function MedicationOrderField({ field, value, onChange }) {
  const { patientId } = useContext(PatientDataContext)
  const [ctx, setCtx] = useState(null)

  // Cart = the field value (array). Wrap a legacy single order for back-compat.
  const cart = Array.isArray(value) ? value : (value && value.drug ? [value] : [])
  const setCart = (next) => onChange(next)

  // Composer state (the drug being built before it's added to the cart).
  const [draft, setDraft] = useState(EMPTY)
  const [editIdx, setEditIdx] = useState(null)      // index being re-edited, else null
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [dose, setDose] = useState(null)
  const [allergy, setAllergy] = useState(null)
  const [cdsWarnings, setCdsWarnings] = useState([])   // interaction/duplication/dose/contra/schedule
  const [tips, setTips] = useState([])
  const [loadingIntel, setLoadingIntel] = useState(false)
  const [ackDup, setAckDup] = useState(false)       // duplicate acknowledged as refill
  const timer = useRef(null)
  const cdsTimer = useRef(null)

  useEffect(() => { loadClinicalContext(api, patientId).then(setCtx) }, [patientId])

  const upd = (patch) => setDraft(d => ({ ...d, ...patch }))

  // Comprehensive CDS across the WHOLE order (cart + the drug being composed):
  // drug-drug interactions between any two, therapeutic duplication, max-dose,
  // drug-diagnosis contraindication, and CDSCO schedule flags. Debounced.
  useEffect(() => {
    clearTimeout(cdsTimer.current)
    const drugs = [...cart, ...(draft.drug ? [draft] : [])]
      .map(o => ({ name: o.generic || o.drug, dose_mg: parseFloat(o.dose_mg) || null, route: o.route || null }))
      .filter(x => x.name)
    if (drugs.length === 0) { setCdsWarnings([]); return }
    cdsTimer.current = setTimeout(async () => {
      try {
        const res = await api.post('/terminology/cds/check', {
          drugs,
          diagnoses: ctx?.diagnoses || [],
          patient_age: ctx?.age ?? null,
          patient_weight_kg: ctx?.weight_kg ?? null,
        })
        setCdsWarnings(res?.warnings || [])
      } catch { /* non-fatal */ }
    }, 500)
    return () => clearTimeout(cdsTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.length, draft.drug, draft.dose_mg, ctx?.age, ctx?.weight_kg])

  // Active chart meds (from live context) + current cart = the duplicate universe.
  const activeChart = (ctx?.active_medications || []).map(m => conceptKey(m))
  const dupInfo = (() => {
    if (!draft.drug) return null
    const k = conceptKey(draft)
    const inChart = activeChart.includes(k)
    const inCart  = cart.some((o, i) => i !== editIdx && conceptKey(o) === k)
    if (!inChart && !inCart) return null
    return { where: inChart ? 'chart' : 'cart' }
  })()

  // ── search ───────────────────────────────────────────────────────────────────
  function search(term) {
    setQ(term)
    clearTimeout(timer.current)
    if (term.trim().length < 2) { setResults([]); setOpen(false); return }
    timer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const params = { q: term.trim(), limit: 10, scope: 'all' }   // usage-ranked, in-stock flagged
        if (ctx?.weight_kg) params.weight_kg = ctx.weight_kg          // → inline best-fit dose
        if (ctx?.age != null) params.age_years = ctx.age
        const res = await api.get('/terminology/drugs/search', { params })
        const list = Array.isArray(res) ? res : (res?.items || [])
        setResults(list); setOpen(list.length > 0)
      } catch { setResults([]); setOpen(false) }
      finally { setSearching(false) }
    }, 300)
  }

  async function selectDrug(d) {
    const generic = d.generic || d.name
    const route = draft.route || 'PO'
    setResults([]); setOpen(false); setQ('')
    setDose(null); setAllergy(null); setCdsWarnings([]); setTips([]); setAckDup(false)
    setDraft({ drug: generic, generic, drug_class: d.drug_class || null, brand: d.primary_brand || null,
               route, in_stock: !!d.in_stock, drug_id: d.drug_id || d.id || null })
    setLoadingIntel(true)
    const doseParams = { generic, route }
    if (ctx?.weight_kg) doseParams.weight_kg = ctx.weight_kg
    if (ctx?.age != null) doseParams.age_years = ctx.age
    // Interactions/duplication/max-dose/contraindication/schedule now come from the
    // consolidated cds/check (below), run against the WHOLE cart — not just this drug.
    const [doseR, algR, cnsR] = await Promise.allSettled([
      api.get('/terminology/drugs/dose-suggest', { params: doseParams }),
      ctx?.allergies?.length
        ? api.post('/terminology/drugs/check-allergy', { drug: generic, allergies: ctx.allergies })
        : Promise.resolve(null),
      api.get('/terminology/drugs/counselling', { params: { generic } }),
    ])
    if (doseR.status === 'fulfilled') {
      setDose(doseR.value)
      // Auto-fill the best-fit market formulation (the closest option); editable.
      const best = doseR.value?.options?.[0]
      if (best) chooseFormulation(best)
    }
    if (algR.status === 'fulfilled' && algR.value) setAllergy(algR.value)
    if (cnsR.status === 'fulfilled') {
      const t = cnsR.value?.tips || []
      setTips(t)
      if (t.length && !draft.instructions) upd({ instructions: t.join('. ') })   // auto-fill counselling, editable
    }
    setLoadingIntel(false)
  }

  function chooseFormulation(opt) {
    upd({ form: opt.form, strength: opt.strength, route: opt.route || draft.route,
          dose_label: opt.label, dose_mg: opt.deliver_mg, quantity: opt.quantity, quantity_unit: opt.quantity_unit })
  }

  function resetComposer() {
    setDraft(EMPTY); setEditIdx(null); setDose(null); setAllergy(null)
    setCdsWarnings([]); setTips([]); setAckDup(false); setQ('')
  }

  function addToCart() {
    if (!draft.drug) return
    if (dupInfo && !ackDup) return                     // must acknowledge refill first
    const item = { ...draft, is_refill: dupInfo ? true : !!draft.is_refill }
    if (editIdx != null) {
      const next = cart.slice(); next[editIdx] = item; setCart(next)
    } else {
      setCart([...cart, item])
    }
    resetComposer()
  }

  function editItem(i) {
    setDraft(cart[i]); setEditIdx(i); setDose(null); setAllergy(null); setCdsWarnings([]); setTips([]); setAckDup(false)
  }
  function removeItem(i) {
    const next = cart.slice(); next.splice(i, 1); setCart(next)
    if (editIdx === i) resetComposer()
  }

  const ctxChip = ctx
    ? [ctx.age != null ? `${ctx.age}y` : null, ctx.weight_kg ? `${ctx.weight_kg}kg` : null, ctx.sex].filter(Boolean).join(' · ')
    : ''
  const composing = !!draft.drug

  return (
    <div className="space-y-2">
      {/* ── Cart list (grows as drugs are added; click a row to re-edit) ── */}
      {cart.length > 0 && (
        <ul className="space-y-1">
          {cart.map((o, i) => (
            <li key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${editIdx === i ? 'border-[#0F2557] bg-blue-50/40' : 'border-gray-200 bg-white'}`}>
              <Pill size={13} className="text-[#0F2557] flex-shrink-0" />
              <span className="flex-1 min-w-0 truncate">
                {orderLine(o)}
                {o.is_refill && <span className="ml-2 text-[10px] font-semibold text-amber-600">REFILL</span>}
              </span>
              <button type="button" onClick={() => editItem(i)} className="text-gray-400 hover:text-[#0F2557]" title="Edit"><Pencil size={13} /></button>
              <button type="button" onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500" title="Remove"><Trash2 size={13} /></button>
            </li>
          ))}
        </ul>
      )}

      {/* ── Composer: search (dropdown) or the selected-drug entry ── */}
      {!composing ? (
        <div className="relative">
          <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-[#0F2557]">
            <Plus size={15} className="text-gray-400 flex-shrink-0" />
            <input type="text" value={q} onChange={e => search(e.target.value)}
              onFocus={() => results.length && setOpen(true)}
              placeholder={cart.length ? 'Add another medication…' : (field?.placeholder || 'Search medication to order…')}
              className="flex-1 text-sm outline-none bg-transparent" />
            {searching && <Loader2 size={14} className="animate-spin text-gray-400" />}
          </div>
          {open && (
            <ul className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto text-sm">
              {results.map((r, i) => (
                <li key={i} onMouseDown={() => selectDrug(r)}
                  className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-gray-50 last:border-0 flex items-center gap-2">
                  {r.in_stock ? <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="In stock" /> : <span className="w-2 h-2 flex-shrink-0" />}
                  <span className="font-medium">{r.primary_brand || r.name || r.generic}</span>
                  <span className="text-gray-400 text-xs truncate flex-1">{r.generic}</span>
                  {r.suggested_dose && <span className="text-[#0F2557] text-xs font-semibold flex-shrink-0">{r.suggested_dose}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/60 border-b border-gray-200">
            <Pill size={15} className="text-[#0F2557]" />
            <span className="font-semibold text-sm text-gray-800">{draft.brand || draft.drug}</span>
            {draft.in_stock && <span className="w-2 h-2 rounded-full bg-green-500" title="In stock" />}
            {ctxChip && <span className="text-xs text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">{ctxChip}</span>}
            {loadingIntel && <Loader2 size={13} className="animate-spin text-gray-400" />}
            <button type="button" onClick={resetComposer} className="ml-auto text-gray-400 hover:text-red-500" title="Cancel"><X size={15} /></button>
          </div>

          <div className="p-3 space-y-2.5">
            {/* Inline red-flag alerts (1–3 words) */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {allergy?.has_match && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600"><ShieldAlert size={12} /> Allergic</span>
              )}
              {cdsWarnings.slice(0, 4).map((w, i) => (
                <span key={i} className={`inline-flex items-center gap-1 text-xs font-semibold ${SEV_STYLE[w.severity] || SEV_STYLE.moderate}`}
                  title={`${w.message || ''}${w.management ? ' — ' + w.management : ''}`}>
                  <AlertTriangle size={12} /> {shortFlag(w)}
                </span>
              ))}
              {dupInfo && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                  <AlertTriangle size={12} /> Duplicate ({dupInfo.where})
                  <button type="button" onClick={() => setAckDup(a => !a)}
                    className={`ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded ${ackDup ? 'bg-amber-500 text-white' : 'border border-amber-400 text-amber-600'}`}
                    title="Mark as refill">
                    <RefreshCw size={10} /> {ackDup ? 'Refill ✓' : 'Refill'}
                  </button>
                </span>
              )}
            </div>

            {/* Dose — 5 nearest market formulations (dropdown) OR type manually */}
            {dose && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 flex-shrink-0">
                  Dose{dose.target_mg ? ` (target ≈ ${dose.target_mg} mg)` : ''}
                </span>
                {(dose.options || []).length > 0 && (
                  <select value={draft.dose_manual ? '' : (draft.dose_label || '')}
                    onChange={e => { const opt = (dose.options || []).find(o => o.label === e.target.value); if (opt) { chooseFormulation(opt); upd({ dose_manual: '' }) } }}
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm max-w-[240px]">
                    <option value="">Select…</option>
                    {(dose.options || []).map((o, i) => (
                      <option key={i} value={o.label}>{o.label}{o.exceeds_max ? ' ⚠ over max' : ''}</option>
                    ))}
                  </select>
                )}
                <input type="text" value={draft.dose_manual || ''}
                  onChange={e => upd({ dose_manual: e.target.value, dose_label: e.target.value })}
                  placeholder="or type…" className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
              </div>
            )}
            {dose?.message && <p className="text-xs text-amber-600">{dose.message}</p>}

            {/* frequency + duration + route */}
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs text-gray-500"><span className="block mb-0.5">Frequency</span>
                <select value={draft.frequency || ''} onChange={e => upd({ frequency: e.target.value })}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                  <option value="">—</option>{FREQS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </label>
              <label className="text-xs text-gray-500"><span className="block mb-0.5">Days</span>
                <input type="number" min="0" value={draft.duration_days || ''} onChange={e => upd({ duration_days: e.target.value })}
                  className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" placeholder="5" />
              </label>
              <label className="text-xs text-gray-500"><span className="block mb-0.5">Route</span>
                <input type="text" value={draft.route || ''} onChange={e => upd({ route: e.target.value })}
                  className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" placeholder="PO" />
              </label>
            </div>

            {/* instructions (counselling auto-filled, editable) */}
            <input type="text" value={draft.instructions || ''} onChange={e => upd({ instructions: e.target.value })}
              placeholder="Instructions / counselling (auto-filled, editable)…"
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />

            <div className="flex items-center gap-2">
              <button type="button" onClick={addToCart} disabled={dupInfo && !ackDup}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#0F2557] text-white hover:bg-[#0F2557]/90 disabled:opacity-40">
                <Plus size={14} /> {editIdx != null ? 'Update' : 'Add to prescription'}
              </button>
              {dupInfo && !ackDup && <span className="text-xs text-red-600">Already {dupInfo.where === 'chart' ? 'in chart' : 'added'} — mark refill to add.</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
