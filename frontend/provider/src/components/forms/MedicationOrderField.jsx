import { useState, useEffect, useContext, useRef } from 'react'
import {
  Pill, AlertTriangle, ShieldAlert, Info, Loader2, X, Search, ChevronDown, ChevronUp, Check,
} from 'lucide-react'
import api from '../../api/client'
import { PatientDataContext, loadClinicalContext } from './patientContext'

// ─────────────────────────────────────────────────────────────────────────────
// medication_order — the CareForm "smart" prescribing field.
//
// Search a drug → it reads the live patient context (age/weight/allergies/active
// meds), computes a dose, offers the nearest real formulations (½-tab / mL), and
// flags allergy + interaction + counselling. Decision support — the clinician
// confirms; the field value is the composed order.
// ─────────────────────────────────────────────────────────────────────────────

const FREQS = ['OD', 'BD', 'TID', 'QID', 'HS', 'SOS', 'STAT', 'Q4H', 'Q6H', 'Q8H']
const SEV_STYLE = {
  high: 'bg-red-50 border-red-200 text-red-700',
  contraindicated: 'bg-red-50 border-red-200 text-red-700',
  serious: 'bg-red-50 border-red-200 text-red-700',
  moderate: 'bg-amber-50 border-amber-200 text-amber-700',
  minor: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  low: 'bg-yellow-50 border-yellow-200 text-yellow-700',
}

export default function MedicationOrderField({ field, value, onChange }) {
  const { patientId } = useContext(PatientDataContext)
  const [ctx, setCtx] = useState(null)
  const order = value && typeof value === 'object' ? value : {}

  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [dose, setDose] = useState(null)
  const [allergy, setAllergy] = useState(null)
  const [interactions, setInteractions] = useState([])
  const [tips, setTips] = useState([])
  const [loadingIntel, setLoadingIntel] = useState(false)
  const [showTips, setShowTips] = useState(false)
  const timer = useRef(null)

  useEffect(() => { loadClinicalContext(api, patientId).then(setCtx) }, [patientId])

  const update = patch => onChange({ ...order, ...patch })

  // ── drug search ────────────────────────────────────────────────────────────
  function search(term) {
    setQ(term)
    if (timer.current) clearTimeout(timer.current)
    if (term.trim().length < 2) { setResults([]); setOpen(false); return }
    timer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await api.get('/terminology/drugs/search', { params: { q: term.trim(), limit: 10 } })
        const list = Array.isArray(res) ? res : (res?.items || [])
        setResults(list); setOpen(list.length > 0)
      } catch { setResults([]); setOpen(false) }
      finally { setSearching(false) }
    }, 300)
  }

  // ── on drug select → fire the intelligence calls ─────────────────────────────
  async function selectDrug(d) {
    const generic = d.generic || d.name
    const route = order.route || 'PO'
    setResults([]); setOpen(false); setQ('')
    setDose(null); setAllergy(null); setInteractions([]); setTips([])
    update({ drug: generic, generic, drug_class: d.drug_class || null })
    setLoadingIntel(true)
    const doseParams = { generic, route }
    if (ctx?.weight_kg) doseParams.weight_kg = ctx.weight_kg
    if (ctx?.age != null) doseParams.age_years = ctx.age
    const meds = [...new Set([...(ctx?.active_medications || []).map(m => m.name).filter(Boolean), generic])]
    const [doseR, algR, intR, cnsR] = await Promise.allSettled([
      api.get('/terminology/drugs/dose-suggest', { params: doseParams }),
      ctx?.allergies?.length
        ? api.post('/terminology/drugs/check-allergy', { drug: generic, allergies: ctx.allergies })
        : Promise.resolve(null),
      meds.length > 1
        ? api.post('/terminology/drugs/check-interactions', { generics: meds })
        : Promise.resolve([]),
      api.get('/terminology/drugs/counselling', { params: { generic } }),
    ])
    if (doseR.status === 'fulfilled') setDose(doseR.value)
    if (algR.status === 'fulfilled' && algR.value) setAllergy(algR.value)
    if (intR.status === 'fulfilled') setInteractions(Array.isArray(intR.value) ? intR.value : [])
    if (cnsR.status === 'fulfilled') setTips(cnsR.value?.tips || [])
    setLoadingIntel(false)
  }

  function clearDrug() {
    onChange({})
    setDose(null); setAllergy(null); setInteractions([]); setTips([]); setQ('')
  }

  function chooseFormulation(opt) {
    update({
      form: opt.form, strength: opt.strength, route: opt.route || order.route,
      dose_label: opt.label, dose_mg: opt.deliver_mg,
      quantity: opt.quantity, quantity_unit: opt.quantity_unit,
    })
  }

  // ── render ───────────────────────────────────────────────────────────────────
  if (!order.drug) {
    return (
      <div className="relative">
        <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-[#0F2557]">
          <Pill size={15} className="text-gray-400 flex-shrink-0" />
          <input
            type="text" value={q} onChange={e => search(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            placeholder={field?.placeholder || 'Search medication to order…'}
            className="flex-1 text-sm outline-none bg-transparent"
          />
          {searching && <Loader2 size={14} className="animate-spin text-gray-400" />}
        </div>
        {open && (
          <ul className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto text-sm">
            {results.map((r, i) => (
              <li key={i} onMouseDown={() => selectDrug(r)}
                className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-gray-50 last:border-0">
                <span className="font-medium">{r.generic || r.name}</span>
                {(r.primary_brand || r.drug_class) && (
                  <span className="text-gray-400 ml-2 text-xs">{r.primary_brand || r.drug_class}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  const ctxChip = ctx
    ? [ctx.age != null ? `${ctx.age}y` : null, ctx.weight_kg ? `${ctx.weight_kg}kg` : null, ctx.sex].filter(Boolean).join(' · ')
    : ''

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/60 border-b border-gray-200">
        <Pill size={15} className="text-[#0F2557]" />
        <span className="font-semibold text-sm text-gray-800">{order.drug}</span>
        {ctxChip && <span className="text-xs text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">{ctxChip}</span>}
        {loadingIntel && <Loader2 size={13} className="animate-spin text-gray-400" />}
        <button type="button" onClick={clearDrug} className="ml-auto text-gray-400 hover:text-red-500" title="Change drug">
          <X size={15} />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* allergy banner */}
        {allergy?.has_match && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg border bg-red-50 border-red-200 text-red-700">
            <ShieldAlert size={15} className="mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Allergy alert.</span>{' '}
              {allergy.matches.map((m, i) => (
                <span key={i}>{m.allergy} — {m.basis}{i < allergy.matches.length - 1 ? '; ' : ''}</span>
              ))}
            </div>
          </div>
        )}

        {/* dose suggestion */}
        {dose && (
          <div>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mb-1.5">
              <span className="text-xs font-semibold text-gray-600">
                Suggested dose{dose.population === 'pediatric' ? ' (paediatric)' : ''}
              </span>
              {dose.target_mg && <span className="text-xs text-[#0F2557] font-semibold">target ≈ {dose.target_mg} mg</span>}
              {dose.max_daily_mg && <span className="text-xs text-gray-400">max {dose.max_daily_mg} mg/day</span>}
              {dose.rule?.renal_adjustment && <span className="text-xs text-amber-600">renal-adjust</span>}
              {dose.rule?.hepatic_adjustment && <span className="text-xs text-amber-600">hepatic-adjust</span>}
              {dose.rule?.pregnancy_category && <span className="text-xs text-amber-600">Preg {dose.rule.pregnancy_category}</span>}
            </div>
            {dose.message && <p className="text-xs text-amber-600 mb-1.5">{dose.message}</p>}
            <div className="flex flex-wrap gap-1.5">
              {(dose.options || []).map((opt, i) => {
                const chosen = order.dose_label === opt.label
                return (
                  <button key={i} type="button" onClick={() => chooseFormulation(opt)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      chosen ? 'bg-[#0F2557] text-white border-[#0F2557]'
                      : opt.exceeds_max ? 'bg-red-50 text-red-600 border-red-200 hover:border-red-300'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-[#0F2557]'}`}>
                    {chosen && <Check size={11} />}
                    {opt.label}{opt.exceeds_max ? ' ⚠' : ''}
                  </button>
                )
              })}
              {(!dose.options || dose.options.length === 0) && !dose.message && (
                <span className="text-xs text-gray-400">No formulation match.</span>
              )}
            </div>
          </div>
        )}

        {/* frequency + duration + route */}
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-gray-500">
            <span className="block mb-0.5">Frequency</span>
            <select value={order.frequency || ''} onChange={e => update({ frequency: e.target.value })}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
              <option value="">—</option>
              {FREQS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-500">
            <span className="block mb-0.5">Duration (days)</span>
            <input type="number" min="0" value={order.duration_days || ''} onChange={e => update({ duration_days: e.target.value })}
              className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" placeholder="e.g. 5" />
          </label>
          <label className="text-xs text-gray-500">
            <span className="block mb-0.5">Route</span>
            <input type="text" value={order.route || ''} onChange={e => update({ route: e.target.value })}
              className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" placeholder="PO" />
          </label>
        </div>

        {/* interaction banner */}
        {interactions.length > 0 && (
          <div className="space-y-1">
            {interactions.map((it, i) => (
              <div key={i} className={`flex items-start gap-2 p-2 rounded-lg border text-xs ${SEV_STYLE[it.severity] || SEV_STYLE.moderate}`}>
                <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
                <span>
                  <span className="font-semibold capitalize">{it.severity}</span> interaction · {it.drug_a} + {it.drug_b}
                  {it.effect ? ` — ${it.effect}` : ''}{it.management ? ` (${it.management})` : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* counselling */}
        {tips.length > 0 && (
          <div className="border-t border-gray-100 pt-2">
            <button type="button" onClick={() => setShowTips(s => !s)}
              className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700">
              <Info size={12} /> Counselling ({tips.length}) {showTips ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showTips && (
              <ul className="mt-1 space-y-0.5 list-disc list-inside text-xs text-gray-600">
                {tips.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            )}
          </div>
        )}

        {/* free-text instructions */}
        <input type="text" value={order.instructions || ''} onChange={e => update({ instructions: e.target.value })}
          placeholder="Additional instructions (e.g. after food)…"
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
      </div>
    </div>
  )
}
