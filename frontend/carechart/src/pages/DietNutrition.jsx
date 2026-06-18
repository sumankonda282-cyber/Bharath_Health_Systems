import { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, X, ChevronDown, ChevronUp,
  Loader2, AlertTriangle, Utensils, Droplets, FlaskConical,
  Scale, ClipboardCheck, User, Clock, CheckCircle2, AlertCircle,
  Edit2, Lock, TrendingDown, TrendingUp, Minus
} from 'lucide-react'
import api from '../api/client'

import { GREEN, NAVY, RED } from '../constants/colors'

// ─── helpers ────────────────────────────────────────────────────────────────
const fmt = d => new Date(d).toLocaleString('en-IN', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
})
const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function pctColor(p) {
  if (p >= 76) return { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' }
  if (p >= 26) return { bg: '#fef9c3', color: '#a16207', border: '#fde047' }
  return { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' }
}

function PctPill({ value }) {
  const c = pctColor(value)
  return (
    <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border"
      style={{ background: c.bg, color: c.color, borderColor: c.border }}>
      {value}%
    </span>
  )
}

function SectionHead({ icon: Icon, title, action, onAction }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon size={14} style={{ color: GREEN }} />
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">{title}</span>
      </div>
      {action && (
        <button onClick={onAction}
          className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-colors"
          style={{ color: GREEN, borderColor: '#a7f3d0', background: '#f0fdf4' }}>
          <Plus size={10} /> {action}
        </button>
      )}
    </div>
  )
}

// ─── PIN modal ───────────────────────────────────────────────────────────────
function PinModal({ title, onConfirm, onCancel }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (pin.length < 4) { setErr('Enter your PIN'); return }
    setLoading(true); setErr('')
    try {
      await api.post('/auth/staff/pin-identify', { pin })
      onConfirm()
    } catch { setErr('Invalid PIN') } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={16} style={{ color: GREEN }} />
          <span className="font-bold text-sm text-gray-800">{title}</span>
        </div>
        <input type="password" placeholder="Enter PIN" value={pin} onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          className="w-full border rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:ring-2"
          style={{ borderColor: '#d1d5db', '--tw-ring-color': GREEN }} autoFocus />
        {err && <p className="text-red-600 text-xs mb-3">{err}</p>}
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1"
            style={{ background: GREEN }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── mock data ───────────────────────────────────────────────────────────────
function buildMock() {
  const today = new Date()
  const iso = d => d.toISOString()

  return {
    diet_order: {
      id: 1,
      type: 'High-Protein Soft Diet',
      calorie_target: 1800,
      fluid_target: 1500,
      ordered_by: 'Dr. Ananya Sharma',
      ordered_at: iso(new Date(today.getTime() - 2 * 86400000)),
      valid_until: null,
      instructions: 'Avoid spicy foods. Soft consistency only. Small frequent meals preferred.',
      status: 'active',
    },
    restrictions: [
      { id: 1, type: 'allergy', label: 'Peanuts', severity: 'high' },
      { id: 2, type: 'allergy', label: 'Shellfish', severity: 'moderate' },
      { id: 3, type: 'religious', label: 'Vegetarian' },
      { id: 4, type: 'preference', label: 'No onion/garlic' },
    ],
    meals: [
      { id: 1, slot: 'Breakfast',      time: iso(new Date(today.setHours(8,0,0))),  served: 'Idli × 2, Sambar, Curd', pct: 80, kcal: 320, by: 'RK', notes: '' },
      { id: 2, slot: 'Mid-Morning',    time: iso(new Date(today.setHours(10,30,0))), served: 'Ensure 200 mL', pct: 100, kcal: 190, by: 'RK', notes: 'Supplement given' },
      { id: 3, slot: 'Lunch',          time: iso(new Date(today.setHours(13,0,0))), served: 'Soft rice, Dal, Veg curry', pct: 40, kcal: 480, by: 'SP', notes: 'Patient complained of nausea' },
      { id: 4, slot: 'Evening Snack',  time: null, served: '', pct: null, kcal: null, by: '', notes: '' },
      { id: 5, slot: 'Dinner',         time: null, served: '', pct: null, kcal: null, by: '', notes: '' },
    ],
    fluids: [
      { id: 1, time: iso(new Date(today.setHours(8,15,0))),  type: 'Water',  volume: 200, by: 'RK' },
      { id: 2, time: iso(new Date(today.setHours(10,0,0))),  type: 'Juice',  volume: 150, by: 'RK' },
      { id: 3, time: iso(new Date(today.setHours(13,30,0))), type: 'Water',  volume: 200, by: 'SP' },
      { id: 4, time: iso(new Date(today.setHours(15,0,0))),  type: 'Soup',   volume: 90,  by: 'SP' },
    ],
    supplements: [
      { id: 1, name: 'Ensure Powder', type: 'Oral', dose: '200 mL', frequency: 'BD', route: 'Oral', status: 'active', ordered_by: 'Dr. Sharma', ordered_at: iso(new Date(today.getTime() - 2*86400000)) },
      { id: 2, name: 'Zinc Sulphate', type: 'Oral', dose: '20 mg', frequency: 'OD', route: 'Oral', status: 'active', ordered_by: 'Dr. Sharma', ordered_at: iso(new Date(today.getTime() - 2*86400000)) },
    ],
    assessment: {
      must_score: 1,
      must_risk: 'Low Risk',
      weight_kg: 68.4,
      weight_admission: 70.1,
      height_cm: 168,
      bmi: 24.2,
      last_assessed: iso(new Date(today.getTime() - 1*86400000)),
      assessed_by: 'Nurse Priya',
    },
    dietitian: {
      status: 'not_referred',
      name: null,
      notes: null,
    },
  }
}

// ─── MUST score helper ────────────────────────────────────────────────────────
const MUST_RISK = [
  { max: 0, label: 'Low Risk',    bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  { max: 1, label: 'Medium Risk', bg: '#fef9c3', color: '#a16207', border: '#fde047' },
  { max: 99, label: 'High Risk',  bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
]
function mustRisk(score) {
  return MUST_RISK.find(r => score <= r.max) || MUST_RISK[2]
}

const DIET_TYPES = [
  'Regular/Normal', 'Soft Diet', 'High-Protein Soft Diet', 'Diabetic Diet',
  'Low-Sodium Diet', 'Renal Diet', 'High-Fibre Diet', 'Liquid Diet',
  'Clear Liquid Diet', 'Pureed Diet', 'Enteral (Tube Feed)', 'TPN/Parenteral',
  'NBM / Nil by Mouth',
]

const MEAL_SLOTS = ['Breakfast', 'Mid-Morning', 'Lunch', 'Evening Snack', 'Dinner', 'Night Snack']
const FLUID_TYPES = ['Water', 'Juice', 'Soup', 'Milk', 'Tea/Coffee', 'Supplement drink', 'Other']
const SUPP_TYPES  = ['Oral', 'Enteral', 'Parenteral']
const SUPP_FREQS  = ['OD', 'BD', 'TDS', 'QID', 'Weekly']

// ─── Diet order card ─────────────────────────────────────────────────────────
function DietOrderCard({ order, onEdit }) {
  if (!order) return null
  const isNBM = order.type?.toLowerCase().includes('nbm') || order.type?.toLowerCase().includes('nil')
  return (
    <div className="rounded-xl border p-4 mb-4" style={{ borderColor: isNBM ? '#fca5a5' : '#a7f3d0', background: isNBM ? '#fff1f2' : '#f0fdf4' }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {isNBM
            ? <AlertCircle size={16} style={{ color: RED }} />
            : <Utensils size={16} style={{ color: GREEN }} />}
          <span className="font-bold text-sm" style={{ color: isNBM ? RED : GREEN }}>{order.type}</span>
        </div>
        <button onClick={onEdit}
          className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border"
          style={{ color: GREEN, borderColor: '#a7f3d0', background: 'white' }}>
          <Edit2 size={9} /> Change
        </button>
      </div>
      <div className="flex flex-wrap gap-3 mb-2">
        {order.calorie_target && (
          <span className="text-xs text-gray-600">🔥 <b>{order.calorie_target}</b> kcal/day</span>
        )}
        {order.fluid_target && (
          <span className="text-xs text-gray-600">💧 <b>{order.fluid_target}</b> mL/day</span>
        )}
        <span className="text-xs text-gray-500">by {order.ordered_by} · {fmtDate(order.ordered_at)}</span>
      </div>
      {order.instructions && (
        <p className="text-[11px] text-gray-500 italic border-t pt-2 mt-2" style={{ borderColor: '#d1fae5' }}>
          {order.instructions}
        </p>
      )}
    </div>
  )
}

// ─── Restrictions ─────────────────────────────────────────────────────────────
function RestrictionsCard({ restrictions, onAdd }) {
  const color = (type, sev) => {
    if (type === 'allergy') return sev === 'high' ? { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' } : { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' }
    if (type === 'religious') return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' }
    return { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' }
  }
  return (
    <div className="rounded-xl border p-4 mb-4" style={{ borderColor: '#e9eaec', background: 'white' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Restrictions & Allergies</span>
        <button onClick={onAdd} className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ color: GREEN, background: '#f0fdf4' }}>+ Add</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {restrictions.map(r => {
          const c = color(r.type, r.severity)
          return (
            <span key={r.id} className="text-[10px] font-semibold px-2.5 py-1 rounded-full border"
              style={{ background: c.bg, color: c.color, borderColor: c.border }}>
              {r.type === 'allergy' ? '⚠ ' : r.type === 'religious' ? '✦ ' : ''}{r.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ─── MUST assessment card ─────────────────────────────────────────────────────
function MustCard({ assessment, onAssess }) {
  if (!assessment) return null
  const risk = mustRisk(assessment.must_score)
  const wtDiff = assessment.weight_admission - assessment.weight_kg
  const WtIcon = wtDiff > 0.5 ? TrendingDown : wtDiff < -0.5 ? TrendingUp : Minus
  const wtColor = wtDiff > 1 ? RED : wtDiff < -0.5 ? '#15803d' : '#6b7280'

  return (
    <div className="rounded-xl border p-4 mb-4" style={{ borderColor: '#e9eaec', background: 'white' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Nutritional Assessment</span>
        <button onClick={onAssess} className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ color: GREEN, background: '#f0fdf4' }}>Re-assess</button>
      </div>
      <div className="flex gap-3 mb-3">
        <div className="flex-1 rounded-lg border p-2.5 text-center" style={{ borderColor: risk.border, background: risk.bg }}>
          <div className="text-2xl font-extrabold" style={{ color: risk.color }}>{assessment.must_score}</div>
          <div className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: risk.color }}>MUST · {risk.label}</div>
        </div>
        <div className="flex-1 rounded-lg border p-2.5 text-center" style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
          <div className="flex items-center justify-center gap-1">
            <span className="text-xl font-extrabold text-gray-800">{assessment.weight_kg}</span>
            <WtIcon size={14} style={{ color: wtColor }} />
          </div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">
            kg · {wtDiff > 0 ? '-' : '+'}{Math.abs(wtDiff).toFixed(1)} from admit
          </div>
        </div>
        <div className="flex-1 rounded-lg border p-2.5 text-center" style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
          <div className="text-xl font-extrabold text-gray-800">{assessment.bmi}</div>
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mt-0.5">BMI</div>
        </div>
      </div>
      <p className="text-[10px] text-gray-400">Last assessed by {assessment.assessed_by} · {fmtDate(assessment.last_assessed)}</p>
    </div>
  )
}

// ─── Dietitian card ───────────────────────────────────────────────────────────
function DietitianCard({ dietitian, onRefer }) {
  const statusCfg = {
    not_referred: { label: 'Not Referred', bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
    referred:     { label: 'Referred',     bg: '#fef9c3', color: '#a16207', border: '#fde047' },
    reviewed:     { label: 'Reviewed',     bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  }
  const s = statusCfg[dietitian.status] || statusCfg.not_referred
  return (
    <div className="rounded-xl border p-4" style={{ borderColor: '#e9eaec', background: 'white' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Dietitian Referral</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
          style={{ background: s.bg, color: s.color, borderColor: s.border }}>{s.label}</span>
      </div>
      {dietitian.name && <p className="text-xs font-semibold text-gray-700 mb-1">{dietitian.name}</p>}
      {dietitian.notes && <p className="text-[11px] text-gray-500 mb-3">{dietitian.notes}</p>}
      {dietitian.status === 'not_referred' && (
        <button onClick={onRefer}
          className="w-full py-2 rounded-lg text-xs font-semibold border transition-colors"
          style={{ color: GREEN, borderColor: '#a7f3d0', background: '#f0fdf4' }}>
          Refer to Dietitian
        </button>
      )}
    </div>
  )
}

// ─── Supplements ──────────────────────────────────────────────────────────────
function SupplementsCard({ supplements, onAdd }) {
  const typeCfg = {
    Oral:       { bg: '#f0fdf4', color: '#15803d', border: '#a7f3d0' },
    Enteral:    { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    Parenteral: { bg: '#faf5ff', color: '#7c3aed', border: '#ddd6fe' },
  }
  return (
    <div className="rounded-xl border p-4 mb-4" style={{ borderColor: '#e9eaec', background: 'white' }}>
      <SectionHead icon={FlaskConical} title="Nutritional Supplements" action="Add" onAction={onAdd} />
      {supplements.length === 0
        ? <p className="text-xs text-gray-400 text-center py-4">No supplements ordered</p>
        : supplements.map(s => {
          const c = typeCfg[s.type] || typeCfg.Oral
          return (
            <div key={s.id} className="flex items-start justify-between gap-2 py-2 border-b last:border-0" style={{ borderColor: '#f3f4f6' }}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800">{s.name}</p>
                <p className="text-[10px] text-gray-500">{s.dose} · {s.frequency} · {s.route}</p>
                <p className="text-[10px] text-gray-400">{s.ordered_by}</p>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0"
                style={{ background: c.bg, color: c.color, borderColor: c.border }}>{s.type}</span>
            </div>
          )
        })
      }
    </div>
  )
}

// ─── Meal intake table ────────────────────────────────────────────────────────
function MealTable({ meals, onLog, totalKcal, targetKcal }) {
  const pct = targetKcal ? Math.round((totalKcal / targetKcal) * 100) : null

  return (
    <div className="rounded-xl border overflow-hidden mb-4" style={{ borderColor: '#e9eaec' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
        <div className="flex items-center gap-2">
          <Utensils size={13} style={{ color: GREEN }} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Meal Intake</span>
        </div>
        <div className="flex items-center gap-3">
          {pct !== null && (
            <span className="text-[10px] text-gray-500">
              <b className="text-gray-800">{totalKcal}</b> / {targetKcal} kcal
              {' '}<span className="font-bold" style={{ color: pct >= 75 ? '#15803d' : pct >= 40 ? '#a16207' : RED }}>({pct}%)</span>
            </span>
          )}
          <button onClick={onLog}
            className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg border"
            style={{ color: GREEN, borderColor: '#a7f3d0', background: '#f0fdf4' }}>
            <Plus size={10} /> Log Meal
          </button>
        </div>
      </div>
      <table className="w-full">
        <thead>
          <tr style={{ background: '#f9fafb' }}>
            {['Slot', 'Served', 'Consumed', 'Est. kcal', 'Time', 'By', 'Notes'].map(h => (
              <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-gray-400 border-b whitespace-nowrap" style={{ borderColor: '#e9eaec' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {meals.map(m => (
            <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors" style={{ borderColor: '#f3f4f6', opacity: m.pct === null ? 0.5 : 1 }}>
              <td className="px-3 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap">{m.slot}</td>
              <td className="px-3 py-2 text-xs text-gray-600 max-w-[160px]">
                {m.served || <span className="text-gray-300 italic">not served</span>}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {m.pct !== null ? <PctPill value={m.pct} /> : <span className="text-gray-300 text-xs">—</span>}
              </td>
              <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                {m.kcal !== null ? `${m.kcal} kcal` : '—'}
              </td>
              <td className="px-3 py-2 text-[10px] text-gray-400 whitespace-nowrap">
                {m.time ? new Date(m.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
              </td>
              <td className="px-3 py-2 text-xs text-gray-500">{m.by || '—'}</td>
              <td className="px-3 py-2 text-[10px] text-gray-400 max-w-[120px]">{m.notes || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Fluid intake ─────────────────────────────────────────────────────────────
function FluidTable({ fluids, onAdd, target }) {
  const total = fluids.reduce((s, f) => s + (f.volume || 0), 0)
  const pct   = target ? Math.round((total / target) * 100) : null

  return (
    <div className="rounded-xl border overflow-hidden mb-4" style={{ borderColor: '#e9eaec' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
        <div className="flex items-center gap-2">
          <Droplets size={13} style={{ color: '#0369a1' }} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Oral Fluid Intake</span>
        </div>
        <div className="flex items-center gap-3">
          {pct !== null && (
            <span className="text-[10px] text-gray-500">
              <b className="text-gray-800">{total} mL</b> / {target} mL
              {' '}<span className="font-bold" style={{ color: pct >= 75 ? '#15803d' : pct >= 40 ? '#a16207' : RED }}>({pct}%)</span>
            </span>
          )}
          <button onClick={onAdd}
            className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg border"
            style={{ color: '#0369a1', borderColor: '#bae6fd', background: '#f0f9ff' }}>
            <Plus size={10} /> Log Fluid
          </button>
        </div>
      </div>
      {/* progress bar */}
      {target && (
        <div className="px-4 py-2 border-b" style={{ borderColor: '#f0f9ff', background: '#f0f9ff' }}>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: '#e0f2fe' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 75 ? '#0369a1' : pct >= 40 ? '#0891b2' : '#f59e0b' }} />
          </div>
        </div>
      )}
      <table className="w-full">
        <thead>
          <tr style={{ background: '#f9fafb' }}>
            {['Time', 'Type', 'Volume', 'By'].map(h => (
              <th key={h} className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wider text-gray-400 border-b" style={{ borderColor: '#e9eaec' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fluids.length === 0
            ? <tr><td colSpan={4} className="text-center py-6 text-xs text-gray-400">No fluid intake logged</td></tr>
            : fluids.map(f => (
              <tr key={f.id} className="border-b last:border-0 hover:bg-gray-50" style={{ borderColor: '#f3f4f6' }}>
                <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(f.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                </td>
                <td className="px-3 py-2 text-xs text-gray-700">{f.type}</td>
                <td className="px-3 py-2 text-xs font-semibold text-gray-800">{f.volume} mL</td>
                <td className="px-3 py-2 text-xs text-gray-500">{f.by}</td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  )
}

// ─── Log Meal drawer ──────────────────────────────────────────────────────────
function LogMealDrawer({ onClose, onSave }) {
  const [form, setForm] = useState({ slot: '', served: '', pct: 75, kcal: '', notes: '', pin: '', pinStep: false })
  const [loading, setLoading] = useState(false)
  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.slot) return
    if (!form.pinStep) { setForm(f => ({ ...f, pinStep: true })); return }
    setLoading(true)
    setTimeout(() => { onSave({ ...form }); setLoading(false) }, 600)
  }

  return (
    <div className="fixed inset-0 z-40 flex" style={{ background: 'rgba(0,0,0,0.25)' }}>
      <div className="ml-auto h-full w-[320px] bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ background: GREEN }}>
          <span className="text-white font-bold text-sm">Log Meal</span>
          <button onClick={onClose}><X size={16} className="text-white" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Meal Slot *</label>
            <select value={form.slot} onChange={e => set('slot')(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#d1d5db' }}>
              <option value="">Select slot</option>
              {MEAL_SLOTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">What was served</label>
            <input value={form.served} onChange={e => set('served')(e.target.value)}
              placeholder="e.g. Idli × 2, Sambar, Curd"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#d1d5db' }} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">% Consumed: {form.pct}%</label>
            <input type="range" min={0} max={100} step={5} value={form.pct} onChange={e => set('pct')(Number(e.target.value))}
              className="w-full" />
            <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
              <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Estimated kcal</label>
            <input type="number" value={form.kcal} onChange={e => set('kcal')(e.target.value)}
              placeholder="e.g. 320" className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#d1d5db' }} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes')(e.target.value)} rows={2}
              placeholder="e.g. patient refused, nausea..."
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none resize-none" style={{ borderColor: '#d1d5db' }} />
          </div>
          {form.pinStep && (
            <div className="rounded-lg border p-3" style={{ borderColor: '#a7f3d0', background: '#f0fdf4' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Lock size={11} style={{ color: GREEN }} />
                <span className="text-[10px] font-bold text-gray-600">Enter PIN to confirm</span>
              </div>
              <input type="password" value={form.pin} onChange={e => set('pin')(e.target.value)}
                placeholder="PIN" className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#d1d5db' }} autoFocus />
            </div>
          )}
        </div>
        <div className="p-4 border-t flex gap-2 flex-shrink-0" style={{ borderColor: '#e9eaec' }}>
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1"
            style={{ background: GREEN }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : form.pinStep ? 'Confirm' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Log Fluid drawer ─────────────────────────────────────────────────────────
function LogFluidDrawer({ onClose, onSave }) {
  const [form, setForm] = useState({ type: 'Water', volume: '', pin: '', pinStep: false })
  const [loading, setLoading] = useState(false)
  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.volume) return
    if (!form.pinStep) { setForm(f => ({ ...f, pinStep: true })); return }
    setLoading(true)
    setTimeout(() => { onSave({ ...form }); setLoading(false) }, 400)
  }

  return (
    <div className="fixed inset-0 z-40 flex" style={{ background: 'rgba(0,0,0,0.25)' }}>
      <div className="ml-auto h-full w-[300px] bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ background: '#0369a1' }}>
          <span className="text-white font-bold text-sm">Log Fluid Intake</span>
          <button onClick={onClose}><X size={16} className="text-white" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Type</label>
            <select value={form.type} onChange={e => set('type')(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#d1d5db' }}>
              {FLUID_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Volume (mL) *</label>
            <input type="number" value={form.volume} onChange={e => set('volume')(e.target.value)}
              placeholder="e.g. 200" className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#d1d5db' }} autoFocus />
          </div>
          {form.pinStep && (
            <div className="rounded-lg border p-3" style={{ borderColor: '#bae6fd', background: '#f0f9ff' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Lock size={11} style={{ color: '#0369a1' }} />
                <span className="text-[10px] font-bold text-gray-600">Enter PIN to confirm</span>
              </div>
              <input type="password" value={form.pin} onChange={e => set('pin')(e.target.value)}
                placeholder="PIN" className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#d1d5db' }} autoFocus />
            </div>
          )}
        </div>
        <div className="p-4 border-t flex gap-2 flex-shrink-0" style={{ borderColor: '#e9eaec' }}>
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1"
            style={{ background: '#0369a1' }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : form.pinStep ? 'Confirm' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add Supplement drawer ─────────────────────────────────────────────────────
function AddSuppDrawer({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', type: 'Oral', dose: '', frequency: 'OD', route: 'Oral', pin: '', pinStep: false })
  const [loading, setLoading] = useState(false)
  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.name) return
    if (!form.pinStep) { setForm(f => ({ ...f, pinStep: true })); return }
    setLoading(true)
    setTimeout(() => { onSave({ ...form }); setLoading(false) }, 400)
  }

  return (
    <div className="fixed inset-0 z-40 flex" style={{ background: 'rgba(0,0,0,0.25)' }}>
      <div className="ml-auto h-full w-[320px] bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ background: '#7c3aed' }}>
          <span className="text-white font-bold text-sm">Add Supplement</span>
          <button onClick={onClose}><X size={16} className="text-white" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Supplement Name *</label>
            <input value={form.name} onChange={e => set('name')(e.target.value)}
              placeholder="e.g. Ensure, Zinc Sulphate"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#d1d5db' }} autoFocus />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Type</label>
            <div className="flex gap-2">
              {SUPP_TYPES.map(t => (
                <button key={t} onClick={() => set('type')(t)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                  style={{ background: form.type === t ? '#7c3aed' : 'white', color: form.type === t ? 'white' : '#374151', borderColor: form.type === t ? '#7c3aed' : '#d1d5db' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Dose</label>
              <input value={form.dose} onChange={e => set('dose')(e.target.value)}
                placeholder="e.g. 200 mL" className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#d1d5db' }} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Frequency</label>
              <select value={form.frequency} onChange={e => set('frequency')(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#d1d5db' }}>
                {SUPP_FREQS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
          {form.pinStep && (
            <div className="rounded-lg border p-3" style={{ borderColor: '#ddd6fe', background: '#faf5ff' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Lock size={11} style={{ color: '#7c3aed' }} />
                <span className="text-[10px] font-bold text-gray-600">Enter PIN to confirm</span>
              </div>
              <input type="password" value={form.pin} onChange={e => set('pin')(e.target.value)}
                placeholder="PIN" className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#d1d5db' }} autoFocus />
            </div>
          )}
        </div>
        <div className="p-4 border-t flex gap-2 flex-shrink-0" style={{ borderColor: '#e9eaec' }}>
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1"
            style={{ background: '#7c3aed' }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : form.pinStep ? 'Confirm' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Change Diet drawer ───────────────────────────────────────────────────────
function ChangeDietDrawer({ current, onClose, onSave }) {
  const [form, setForm] = useState({
    type: current?.type || '',
    calorie_target: current?.calorie_target || '',
    fluid_target: current?.fluid_target || '',
    instructions: current?.instructions || '',
    reason: '',
    pin: '', pinStep: false,
  })
  const [loading, setLoading] = useState(false)
  const set = k => v => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = () => {
    if (!form.type) return
    if (!form.pinStep) { setForm(f => ({ ...f, pinStep: true })); return }
    setLoading(true)
    setTimeout(() => { onSave({ ...form }); setLoading(false) }, 500)
  }

  return (
    <div className="fixed inset-0 z-40 flex" style={{ background: 'rgba(0,0,0,0.25)' }}>
      <div className="ml-auto h-full w-[340px] bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ background: GREEN }}>
          <span className="text-white font-bold text-sm">Change Diet Order</span>
          <button onClick={onClose}><X size={16} className="text-white" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Diet Type *</label>
            <select value={form.type} onChange={e => set('type')(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#d1d5db' }}>
              <option value="">Select diet</option>
              {DIET_TYPES.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Calorie target (kcal)</label>
              <input type="number" value={form.calorie_target} onChange={e => set('calorie_target')(e.target.value)}
                placeholder="1800" className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#d1d5db' }} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Fluid target (mL)</label>
              <input type="number" value={form.fluid_target} onChange={e => set('fluid_target')(e.target.value)}
                placeholder="1500" className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#d1d5db' }} />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Special Instructions</label>
            <textarea value={form.instructions} onChange={e => set('instructions')(e.target.value)} rows={2}
              placeholder="Texture, allergen avoidance, frequency..."
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none resize-none" style={{ borderColor: '#d1d5db' }} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Reason for change</label>
            <input value={form.reason} onChange={e => set('reason')(e.target.value)}
              placeholder="e.g. Pre-operative preparation"
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#d1d5db' }} />
          </div>
          {form.pinStep && (
            <div className="rounded-lg border p-3" style={{ borderColor: '#a7f3d0', background: '#f0fdf4' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Lock size={11} style={{ color: GREEN }} />
                <span className="text-[10px] font-bold text-gray-600">Enter PIN to confirm</span>
              </div>
              <input type="password" value={form.pin} onChange={e => set('pin')(e.target.value)}
                placeholder="PIN" className="w-full border rounded-lg px-3 py-2 text-sm outline-none" style={{ borderColor: '#d1d5db' }} autoFocus />
            </div>
          )}
        </div>
        <div className="p-4 border-t flex gap-2 flex-shrink-0" style={{ borderColor: '#e9eaec' }}>
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1"
            style={{ background: GREEN }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : form.pinStep ? 'Confirm' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Date nav helper ──────────────────────────────────────────────────────────
function dateLabel(offset) {
  if (offset === 0) return 'Today'
  if (offset === -1) return 'Yesterday'
  if (offset === 1) return 'Tomorrow'
  const d = new Date(); d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DietNutrition({ admission }) {
  const admissionId = admission?.id

  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [dayOffset, setDayOffset] = useState(0)

  // drawers
  const [showChangeDiet, setShowChangeDiet] = useState(false)
  const [showLogMeal,    setShowLogMeal]    = useState(false)
  const [showLogFluid,   setShowLogFluid]   = useState(false)
  const [showAddSupp,    setShowAddSupp]    = useState(false)
  const [pinModal,       setPinModal]       = useState(null) // { title, onConfirm }

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [dietRes, mealRes, fluidRes, suppRes, assessRes] = await Promise.allSettled([
        api.get(`/inpatient/admissions/${admissionId}/diet`),
        api.get(`/inpatient/admissions/${admissionId}/meals`),
        api.get(`/inpatient/admissions/${admissionId}/fluid-intake`),
        api.get(`/inpatient/admissions/${admissionId}/supplements`),
        api.get(`/inpatient/admissions/${admissionId}/nutrition-assessment`),
      ])
      const ok = r => r.status === 'fulfilled' && r.value?.data
      if (ok(dietRes) || ok(mealRes)) {
        setData({
          diet_order:  ok(dietRes)   ? dietRes.value.data   : null,
          restrictions: [],
          meals:       ok(mealRes)   ? mealRes.value.data   : [],
          fluids:      ok(fluidRes)  ? fluidRes.value.data  : [],
          supplements: ok(suppRes)   ? suppRes.value.data   : [],
          assessment:  ok(assessRes) ? assessRes.value.data : null,
          dietitian:   { status: 'not_referred' },
        })
      } else {
        setData(buildMock())
      }
    } catch { setData(buildMock()) } finally { setLoading(false) }
  }, [admissionId])

  useEffect(() => { if (admissionId) load() }, [load])
  useEffect(() => {
    const handler = () => load()
    window.addEventListener('carechart:refresh', handler)
    return () => window.removeEventListener('carechart:refresh', handler)
  }, [load])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={22} className="animate-spin" style={{ color: GREEN }} />
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-2 text-gray-400">
      <AlertTriangle size={22} />
      <p className="text-sm">{error}</p>
      <button onClick={load} className="text-xs underline" style={{ color: GREEN }}>Retry</button>
    </div>
  )

  const d = data || buildMock()
  const isNBM = d.diet_order?.type?.toLowerCase().includes('nbm') || d.diet_order?.type?.toLowerCase().includes('nil')
  const totalKcal = d.meals.filter(m => m.kcal).reduce((s, m) => s + (m.kcal || 0), 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Sticky top strip ────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 py-2.5 border-b flex items-center gap-4 flex-wrap"
        style={{ borderColor: '#e9eaec', background: isNBM ? '#fff1f2' : '#f0fdf4' }}>
        <div className="flex items-center gap-2">
          {isNBM
            ? <AlertCircle size={13} style={{ color: RED }} />
            : <Utensils size={13} style={{ color: GREEN }} />}
          <span className="text-xs font-bold" style={{ color: isNBM ? RED : GREEN }}>
            {d.diet_order?.type || 'No diet order'}
          </span>
        </div>
        {d.diet_order?.calorie_target && (
          <span className="text-[10px] text-gray-600">🔥 <b>{d.diet_order.calorie_target}</b> kcal/day</span>
        )}
        {d.diet_order?.fluid_target && (
          <span className="text-[10px] text-gray-600">💧 <b>{d.diet_order.fluid_target}</b> mL/day fluid</span>
        )}
        {d.diet_order?.ordered_by && (
          <span className="text-[10px] text-gray-400">by {d.diet_order.ordered_by} · {fmtDate(d.diet_order.ordered_at)}</span>
        )}
        {/* date nav */}
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setDayOffset(o => o - 1)}
            className="w-6 h-6 rounded-lg border flex items-center justify-center hover:bg-white transition-colors"
            style={{ borderColor: '#d1fae5' }}>
            <ChevronLeft size={12} style={{ color: GREEN }} />
          </button>
          <span className="text-xs font-semibold px-3 py-1 rounded-lg border"
            style={{ minWidth: 80, textAlign: 'center', borderColor: '#d1fae5', background: 'white', color: GREEN }}>
            {dateLabel(dayOffset)}
          </span>
          <button onClick={() => setDayOffset(o => o + 1)} disabled={dayOffset >= 0}
            className="w-6 h-6 rounded-lg border flex items-center justify-center hover:bg-white transition-colors disabled:opacity-30"
            style={{ borderColor: '#d1fae5' }}>
            <ChevronRight size={12} style={{ color: GREEN }} />
          </button>
        </div>
      </div>

      {/* ── Main two-column layout ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex gap-0">

        {/* Left column — 65% */}
        <div className="flex-1 overflow-y-auto p-5 min-w-0">
          <MealTable
            meals={d.meals}
            onLog={() => setShowLogMeal(true)}
            totalKcal={totalKcal}
            targetKcal={d.diet_order?.calorie_target}
          />
          <FluidTable
            fluids={d.fluids}
            onAdd={() => setShowLogFluid(true)}
            target={d.diet_order?.fluid_target}
          />
        </div>

        {/* Right column — 35% */}
        <div className="w-[320px] flex-shrink-0 overflow-y-auto p-4 border-l" style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
          <DietOrderCard order={d.diet_order} onEdit={() => setShowChangeDiet(true)} />
          <RestrictionsCard restrictions={d.restrictions} onAdd={() => {}} />
          <SupplementsCard supplements={d.supplements} onAdd={() => setShowAddSupp(true)} />
          <MustCard assessment={d.assessment} onAssess={() => {}} />
          <DietitianCard dietitian={d.dietitian} onRefer={() => {}} />
        </div>
      </div>

      {/* ── Drawers ──────────────────────────────────────────────────────────── */}
      {showChangeDiet && (
        <ChangeDietDrawer
          current={d.diet_order}
          onClose={() => setShowChangeDiet(false)}
          onSave={vals => { setData(prev => ({ ...prev, diet_order: { ...prev.diet_order, ...vals } })); setShowChangeDiet(false) }}
        />
      )}
      {showLogMeal && (
        <LogMealDrawer
          onClose={() => setShowLogMeal(false)}
          onSave={vals => {
            setData(prev => ({ ...prev, meals: [...prev.meals, { id: Date.now(), slot: vals.slot, time: new Date().toISOString(), served: vals.served, pct: vals.pct, kcal: Number(vals.kcal) || null, by: 'Me', notes: vals.notes }] }))
            setShowLogMeal(false)
          }}
        />
      )}
      {showLogFluid && (
        <LogFluidDrawer
          onClose={() => setShowLogFluid(false)}
          onSave={vals => {
            setData(prev => ({ ...prev, fluids: [...prev.fluids, { id: Date.now(), time: new Date().toISOString(), type: vals.type, volume: Number(vals.volume), by: 'Me' }] }))
            setShowLogFluid(false)
          }}
        />
      )}
      {showAddSupp && (
        <AddSuppDrawer
          onClose={() => setShowAddSupp(false)}
          onSave={vals => {
            setData(prev => ({ ...prev, supplements: [...prev.supplements, { id: Date.now(), name: vals.name, type: vals.type, dose: vals.dose, frequency: vals.frequency, route: vals.route, status: 'active', ordered_by: 'Me', ordered_at: new Date().toISOString() }] }))
            setShowAddSupp(false)
          }}
        />
      )}
      {pinModal && (
        <PinModal title={pinModal.title} onConfirm={() => { pinModal.onConfirm(); setPinModal(null) }} onCancel={() => setPinModal(null)} />
      )}
    </div>
  )
}
