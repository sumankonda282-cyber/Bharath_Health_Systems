import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { usePin } from '../contexts/PinContext'
import { useAuth } from '../contexts/AuthContext'
import { useWardSession } from '../contexts/WardSessionContext'
import {
  FlaskConical, Activity, Utensils, PersonStanding, Bell, Stethoscope,
  CheckCircle2, Search, RefreshCw, Plus, X, AlertTriangle, Clock,
  ChevronDown, ChevronUp, FileText, Ban, Pill, ArrowLeft,
} from 'lucide-react'

const TYPE_META = {
  lab:       { icon: FlaskConical,    label: 'Lab',       color: 'text-blue-600',   bg: 'bg-blue-50'   },
  imaging:   { icon: Activity,        label: 'Imaging',   color: 'text-purple-600', bg: 'bg-purple-50' },
  procedure: { icon: Stethoscope,     label: 'Procedure', color: 'text-orange-600', bg: 'bg-orange-50' },
  diet:      { icon: Utensils,        label: 'Diet',      color: 'text-green-600',  bg: 'bg-green-50'  },
  activity:  { icon: PersonStanding,  label: 'Activity',  color: 'text-teal-600',   bg: 'bg-teal-50'   },
  nursing:   { icon: Bell,            label: 'Nursing',   color: 'text-pink-600',   bg: 'bg-pink-50'   },
  consult:   { icon: Stethoscope,     label: 'Consult',   color: 'text-indigo-600', bg: 'bg-indigo-50' },
  medication:{ icon: Pill,            label: 'Medication',color: 'text-emerald-600',bg: 'bg-emerald-50'},
}

const PRIORITY_STYLE = {
  stat:    { cls: 'bg-red-600 text-white',          label: 'STAT'    },
  urgent:  { cls: 'bg-amber-100 text-amber-800',    label: 'URGENT'  },
  routine: { cls: 'bg-gray-100 text-gray-600',      label: 'Routine' },
}

const STATUS_STYLE = {
  pending:      { cls: 'bg-blue-100 text-blue-800',    label: 'Pending'      },
  acknowledged: { cls: 'bg-indigo-100 text-indigo-800',label: 'Acknowledged' },
  in_progress:  { cls: 'bg-purple-100 text-purple-800',label: 'In Progress'  },
  completed:    { cls: 'bg-emerald-100 text-emerald-800',label: 'Completed'  },
  cancelled:    { cls: 'bg-red-100 text-red-700',      label: 'Cancelled'    },
  active:       { cls: 'bg-blue-100 text-blue-800',    label: 'Active'       },
  discontinued: { cls: 'bg-gray-100 text-gray-500',    label: 'D/C\'d'       },
}

const ORDER_TYPES = [
  'lab','imaging','procedure','diet','activity','nursing','consult'
]

const ROUTES = ['PO','IV','IM','SC','SL','TOP','INH','PR','NG']
const FREQS  = ['OD','BD','TDS','QID','Q4H','Q6H','Q8H','Q12H','HS','AC','PC','PRN','STAT','CONT']

// ── New Clinical Order Form ────────────────────────────────────────────────────
function NewClinicalOrderForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ order_type: 'nursing', order_detail: '', priority: 'routine', instructions: '' })
  const [saving, setSaving] = useState(false)
  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

  const submit = async () => {
    if (!form.order_detail.trim()) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <div className="bg-white border border-emerald-200 rounded-2xl p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-emerald-900 text-sm">New Clinical Order</h3>
        <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded"><X size={14} /></button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</label>
          <select className="input mt-1 text-sm" {...f('order_type')}>
            {ORDER_TYPES.map(t => <option key={t} value={t}>{TYPE_META[t]?.label || t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Priority</label>
          <select className="input mt-1 text-sm" {...f('priority')}>
            <option value="routine">Routine</option>
            <option value="urgent">Urgent</option>
            <option value="stat">STAT</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Order Detail *</label>
        <input className="input mt-1 text-sm" placeholder="e.g. CBC with differential, Chest X-ray PA view…" {...f('order_detail')} />
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Instructions</label>
        <textarea className="input mt-1 text-sm resize-none" rows={2} placeholder="Special instructions or clinical context…" {...f('instructions')} />
      </div>

      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
        <button onClick={submit} disabled={saving || !form.order_detail.trim()}
          className="px-4 py-1.5 bg-emerald-700 text-white rounded-lg text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50">
          {saving ? 'Saving…' : 'Place Order'}
        </button>
      </div>
    </div>
  )
}

// ── New Medication Order Form ──────────────────────────────────────────────────
function NewMedOrderForm({ onSave, onCancel }) {
  const [form, setForm] = useState({
    drug_name: '', dose: '', route: 'PO', frequency: 'OD',
    duration_days: '', instructions: '', is_prn: false, is_stat: false,
    is_continuous: false, iv_fluid: '', iv_rate: '', iv_volume_ml: '', notes: ''
  })
  const [saving, setSaving] = useState(false)
  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })
  const isIV = form.route === 'IV'

  const submit = async () => {
    if (!form.drug_name.trim()) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <div className="bg-white border border-emerald-200 rounded-2xl p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-emerald-900 text-sm">New Medication Order</h3>
        <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded"><X size={14} /></button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Drug Name *</label>
          <input className="input mt-1 text-sm" placeholder="e.g. Amoxicillin, Metformin…" {...f('drug_name')} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dose</label>
          <input className="input mt-1 text-sm" placeholder="e.g. 500mg" {...f('dose')} />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Route</label>
          <select className="input mt-1 text-sm" {...f('route')}>
            {ROUTES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Frequency</label>
          <select className="input mt-1 text-sm" {...f('frequency')}>
            {FREQS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Duration (days)</label>
          <input className="input mt-1 text-sm" type="number" min="1" placeholder="e.g. 5" {...f('duration_days')} />
        </div>
      </div>

      {isIV && (
        <div className="grid grid-cols-3 gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
          <div>
            <label className="text-xs font-semibold text-blue-700 uppercase">IV Fluid</label>
            <input className="input mt-1 text-sm" placeholder="NS, D5W…" {...f('iv_fluid')} />
          </div>
          <div>
            <label className="text-xs font-semibold text-blue-700 uppercase">Rate (mL/hr)</label>
            <input className="input mt-1 text-sm" placeholder="80" {...f('iv_rate')} />
          </div>
          <div>
            <label className="text-xs font-semibold text-blue-700 uppercase">Volume (mL)</label>
            <input className="input mt-1 text-sm" placeholder="500" {...f('iv_volume_ml')} />
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Instructions</label>
        <input className="input mt-1 text-sm" placeholder="e.g. Take with food, after meals…" {...f('instructions')} />
      </div>

      <div className="flex flex-wrap gap-3">
        {[['is_stat','STAT'], ['is_prn','PRN (as needed)'], ['is_continuous','Continuous']].map(([k,l]) => (
          <label key={k} className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.checked }))} className="rounded" />
            <span className="font-medium text-gray-700">{l}</span>
          </label>
        ))}
      </div>

      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
        <button onClick={submit} disabled={saving || !form.drug_name.trim()}
          className="px-4 py-1.5 bg-emerald-700 text-white rounded-lg text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50">
          {saving ? 'Saving…' : 'Order Medication'}
        </button>
      </div>
    </div>
  )
}

// ── Clinical Order Card ────────────────────────────────────────────────────────
function ClinicalOrderCard({ order, onAck, onStart, onComplete, onCancel, canWrite }) {
  const [expanded, setExpanded] = useState(false)
  const meta = TYPE_META[order.order_type] || TYPE_META.nursing
  const Icon = meta.icon
  const pri  = PRIORITY_STYLE[order.priority] || PRIORITY_STYLE.routine
  const sts  = STATUS_STYLE[order.status]     || STATUS_STYLE.pending
  const isStat = order.priority === 'stat'
  const isDone = ['completed','cancelled'].includes(order.status)

  return (
    <div className={`border rounded-xl overflow-hidden ${isStat && !isDone ? 'border-red-300' : 'border-gray-200'}`}>
      <div className={`flex items-start gap-2.5 px-3 py-2.5 ${isStat && !isDone ? 'bg-red-50' : 'bg-white'}`}>
        <div className={`p-1.5 rounded-lg flex-shrink-0 ${meta.bg}`}>
          <Icon size={14} className={meta.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{order.order_detail}</span>
            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${pri.cls}`}>{pri.label}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${sts.cls}`}>{sts.label}</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {meta.label} · {order.orderer_name} · {order.ordered_at ? new Date(order.ordered_at).toLocaleString('en-IN', { dateStyle:'short', timeStyle:'short' }) : ''}
          </div>
          {order.instructions && (
            <div className="text-xs text-gray-500 mt-1 italic">"{order.instructions}"</div>
          )}
        </div>
        <button onClick={() => setExpanded(e => !e)} className="p-1 hover:bg-gray-100 rounded flex-shrink-0">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 bg-gray-50 space-y-2">
          {order.result_notes && (
            <div className="text-xs text-emerald-700 bg-emerald-50 rounded-lg p-2">
              <span className="font-semibold">Result: </span>{order.result_notes}
            </div>
          )}
          {order.acknowledged_at && (
            <div className="text-xs text-gray-400">
              Acknowledged by {order.acknowledger_name} at {new Date(order.acknowledged_at).toLocaleString('en-IN', { dateStyle:'short', timeStyle:'short' })}
            </div>
          )}
          {order.completed_at && (
            <div className="text-xs text-gray-400">
              Completed by {order.completer_name} at {new Date(order.completed_at).toLocaleString('en-IN', { dateStyle:'short', timeStyle:'short' })}
            </div>
          )}

          {canWrite && !isDone && (
            <div className="flex gap-2 flex-wrap pt-1">
              {order.status === 'pending' && (
                <button onClick={() => onAck(order)}
                  className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-lg text-xs font-semibold hover:bg-indigo-200">
                  Acknowledge
                </button>
              )}
              {['pending','acknowledged'].includes(order.status) && (
                <button onClick={() => onStart(order)}
                  className="px-3 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-semibold hover:bg-purple-200">
                  Start
                </button>
              )}
              {order.status !== 'completed' && (
                <button onClick={() => onComplete(order)}
                  className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700">
                  Complete
                </button>
              )}
              <button onClick={() => onCancel(order)}
                className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200 ml-auto">
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Medication Order Card ──────────────────────────────────────────────────────
function MedOrderCard({ order, onDiscontinue, canWrite }) {
  const [expanded, setExpanded] = useState(false)
  const isDone = ['discontinued','completed'].includes(order.status)
  const sts = STATUS_STYLE[order.status] || STATUS_STYLE.active

  return (
    <div className={`border rounded-xl overflow-hidden ${order.is_stat && !isDone ? 'border-red-300' : 'border-gray-200'}`}>
      <div className={`flex items-start gap-2.5 px-3 py-2.5 ${order.is_stat && !isDone ? 'bg-red-50' : 'bg-white'}`}>
        <div className="p-1.5 rounded-lg bg-emerald-50 flex-shrink-0">
          <Pill size={14} className="text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{order.drug_name}</span>
            {order.is_stat && <span className="px-1.5 py-0.5 bg-red-600 text-white rounded text-xs font-bold">STAT</span>}
            {order.is_prn  && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-semibold">PRN</span>}
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${sts.cls}`}>{sts.label}</span>
          </div>
          <div className="text-xs text-gray-600 mt-0.5">
            {[order.dose, order.route, order.frequency].filter(Boolean).join(' · ')}
            {order.duration_days ? ` × ${order.duration_days}d` : ''}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {order.orderer_name} · {order.ordered_at ? new Date(order.ordered_at).toLocaleString('en-IN', { dateStyle:'short', timeStyle:'short' }) : ''}
          </div>
        </div>
        <button onClick={() => setExpanded(e => !e)} className="p-1 hover:bg-gray-100 rounded flex-shrink-0">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 bg-gray-50 space-y-2">
          {order.route === 'IV' && (order.iv_fluid || order.iv_rate) && (
            <div className="text-xs text-blue-700 bg-blue-50 rounded-lg p-2">
              IV: {order.iv_fluid} {order.iv_rate ? `@ ${order.iv_rate} mL/hr` : ''} {order.iv_volume_ml ? `· ${order.iv_volume_ml} mL` : ''}
            </div>
          )}
          {order.instructions && <div className="text-xs text-gray-500 italic">"{order.instructions}"</div>}
          {order.discontinue_reason && (
            <div className="text-xs text-red-600">D/C Reason: {order.discontinue_reason}</div>
          )}
          {canWrite && !isDone && (
            <button onClick={() => onDiscontinue(order)}
              className="flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100">
              <Ban size={11} /> Discontinue
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Orders() {
  const { requestPin } = usePin()
  const { user } = useAuth()
  const { mode } = useWardSession()

  const [admissions, setAdmissions] = useState([])
  const [selected, setSelected]     = useState(null)
  const [clinOrders, setClinOrders] = useState([])
  const [medOrders,  setMedOrders]  = useState([])
  const [search, setSearch]         = useState('')
  const [loading, setLoading]       = useState(false)
  const [tab, setTab]               = useState('clinical')   // clinical | medications
  const [showNewClin, setShowNewClin] = useState(false)
  const [showNewMed,  setShowNewMed]  = useState(false)
  const [filterStatus, setFilterStatus] = useState('active') // active | all

  const canWrite = ['doctor','clinic_admin','clinic_manager'].includes(user?.role)
  const canOrder = canWrite  // only doctors/admins place orders; nurses acknowledge/complete

  useEffect(() => {
    setLoading(true)
    api.get('/inpatient/admissions', { params: { status: 'active' } })
      .then(d => setAdmissions(Array.isArray(d) ? d : d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const loadOrders = useCallback(async (adm) => {
    setSelected(adm)
    setShowNewClin(false); setShowNewMed(false)
    try {
      const [clin, meds] = await Promise.all([
        api.get(`/inpatient/admissions/${adm.id}/clinical-orders`).catch(() => []),
        api.get(`/inpatient/admissions/${adm.id}/orders`).catch(() => []),
      ])
      setClinOrders(Array.isArray(clin) ? clin : [])
      setMedOrders(Array.isArray(meds) ? meds : [])
    } catch { setClinOrders([]); setMedOrders([]) }
  }, [])

  const refresh = () => selected && loadOrders(selected)

  // ── Clinical order actions ──
  const ackOrder = async (order) => {
    try { await requestPin(); await api.post(`/inpatient/clinical-orders/${order.id}/acknowledge`); refresh() }
    catch (e) { if (e?.message !== 'PIN entry cancelled') alert(e?.message) }
  }
  const startOrder = async (order) => {
    try { await requestPin(); await api.post(`/inpatient/clinical-orders/${order.id}/start`); refresh() }
    catch (e) { if (e?.message !== 'PIN entry cancelled') alert(e?.message) }
  }
  const completeOrder = async (order) => {
    const notes = window.prompt('Result / completion notes (optional):')
    if (notes === null) return
    try { await requestPin(); await api.post(`/inpatient/clinical-orders/${order.id}/complete`, { result_notes: notes }); refresh() }
    catch (e) { if (e?.message !== 'PIN entry cancelled') alert(e?.message) }
  }
  const cancelOrder = async (order) => {
    const reason = window.prompt('Reason for cancellation:')
    if (reason === null) return
    try { await requestPin(); await api.post(`/inpatient/clinical-orders/${order.id}/cancel`, { reason }); refresh() }
    catch (e) { if (e?.message !== 'PIN entry cancelled') alert(e?.message) }
  }

  // ── Medication order actions ──
  const discontinueMed = async (order) => {
    const reason = window.prompt('Reason for discontinuing:')
    if (reason === null) return
    try { await requestPin(); await api.post(`/inpatient/orders/${order.id}/discontinue`, { reason }); refresh() }
    catch (e) { if (e?.message !== 'PIN entry cancelled') alert(e?.message) }
  }

  const saveClinOrder = async (form) => {
    await api.post(`/inpatient/admissions/${selected.id}/clinical-orders`, form)
    setShowNewClin(false); refresh()
  }
  const saveMedOrder = async (form) => {
    await api.post(`/inpatient/admissions/${selected.id}/orders`, form)
    setShowNewMed(false); refresh()
  }

  const filtered = admissions.filter(a => {
    const q = search.toLowerCase()
    return a.patient?.full_name?.toLowerCase().includes(q) || a.ward?.name?.toLowerCase().includes(q)
  })

  // ── Patient list ──
  if (!selected) {
    return (
      <div className="p-4 space-y-3">
        <h1 className="font-bold text-lg text-emerald-900">Clinical Orders</h1>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-8" placeholder="Search patient or ward…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        {loading ? (
          <p className="text-gray-400 text-sm text-center py-10">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-10">No active admissions.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map(a => {
              const p = a.patient || {}
              return (
                <button key={a.id} onClick={() => loadOrders(a)}
                  className="w-full text-left bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3 hover:border-emerald-400 hover:shadow-sm transition-all">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center flex-shrink-0">
                    {p.full_name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900">{p.full_name}</div>
                    <div className="text-xs text-gray-500">{a.ward?.name} · Bed {a.bed?.bed_number}</div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {a.diagnosis ? <span className="italic truncate max-w-24 block">{a.diagnosis}</span> : null}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const p = selected.patient || {}

  const activeClin = clinOrders.filter(o => !['completed','cancelled'].includes(o.status))
  const doneClin   = clinOrders.filter(o =>  ['completed','cancelled'].includes(o.status))
  const activeMeds = medOrders.filter(o => o.status === 'active')
  const doneMeds   = medOrders.filter(o => o.status !== 'active')

  const statCount = activeClin.filter(o => o.priority === 'stat').length

  return (
    <div className="flex flex-col h-full">
      {/* Patient header */}
      <div className="bg-emerald-800 text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => setSelected(null)} className="p-1 hover:bg-emerald-700 rounded">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">{p.full_name}</div>
          <div className="text-xs text-emerald-200">{selected.ward?.name} · Bed {selected.bed?.bed_number}</div>
        </div>
        {statCount > 0 && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-red-600 rounded-full text-xs font-bold animate-pulse">
            <AlertTriangle size={10} /> {statCount} STAT
          </span>
        )}
        <button onClick={refresh} className="p-1.5 hover:bg-emerald-700 rounded">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white flex-shrink-0">
        {[
          { key: 'clinical',     label: 'Clinical Orders', count: activeClin.length },
          { key: 'medications',  label: 'Medications',     count: activeMeds.length },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              tab === t.key ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500'
            }`}>
            {t.label}
            {t.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === t.key ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* ── Clinical Orders tab ── */}
        {tab === 'clinical' && (
          <>
            {canOrder && !showNewClin && (
              <button onClick={() => setShowNewClin(true)}
                className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-emerald-300 rounded-xl text-emerald-700 text-sm font-semibold hover:bg-emerald-50 transition-colors">
                <Plus size={15} /> New Clinical Order
              </button>
            )}
            {showNewClin && <NewClinicalOrderForm onSave={saveClinOrder} onCancel={() => setShowNewClin(false)} />}

            {activeClin.length === 0 && !showNewClin && (
              <div className="text-center py-10 text-gray-400">
                <FileText size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No active clinical orders</p>
              </div>
            )}

            <div className="space-y-2">
              {activeClin.sort((a,b) => {
                const pri = { stat: 0, urgent: 1, routine: 2 }
                return (pri[a.priority] ?? 2) - (pri[b.priority] ?? 2)
              }).map(o => (
                <ClinicalOrderCard key={o.id} order={o}
                  onAck={ackOrder} onStart={startOrder} onComplete={completeOrder} onCancel={cancelOrder}
                  canWrite={true} />
              ))}
            </div>

            {doneClin.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-gray-400 cursor-pointer select-none py-1">
                  Completed / Cancelled ({doneClin.length})
                </summary>
                <div className="space-y-1 mt-2">
                  {doneClin.map(o => (
                    <ClinicalOrderCard key={o.id} order={o}
                      onAck={ackOrder} onStart={startOrder} onComplete={completeOrder} onCancel={cancelOrder}
                      canWrite={false} />
                  ))}
                </div>
              </details>
            )}
          </>
        )}

        {/* ── Medications tab ── */}
        {tab === 'medications' && (
          <>
            {canOrder && !showNewMed && (
              <button onClick={() => setShowNewMed(true)}
                className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-emerald-300 rounded-xl text-emerald-700 text-sm font-semibold hover:bg-emerald-50 transition-colors">
                <Plus size={15} /> New Medication Order
              </button>
            )}
            {showNewMed && <NewMedOrderForm onSave={saveMedOrder} onCancel={() => setShowNewMed(false)} />}

            {activeMeds.length === 0 && !showNewMed && (
              <div className="text-center py-10 text-gray-400">
                <Pill size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No active medication orders</p>
              </div>
            )}

            <div className="space-y-2">
              {activeMeds.map(o => (
                <MedOrderCard key={o.id} order={o} onDiscontinue={discontinueMed} canWrite={canOrder} />
              ))}
            </div>

            {doneMeds.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-gray-400 cursor-pointer select-none py-1">
                  Discontinued / Completed ({doneMeds.length})
                </summary>
                <div className="space-y-1 mt-2 opacity-60">
                  {doneMeds.map(o => (
                    <MedOrderCard key={o.id} order={o} onDiscontinue={discontinueMed} canWrite={false} />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  )
}
