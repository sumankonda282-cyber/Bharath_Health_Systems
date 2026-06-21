import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import {
  ClipboardList, RefreshCw, Loader2, ChevronDown, ChevronRight,
  AlertTriangle, ShoppingCart, CheckCircle, User, Plus,
} from 'lucide-react'

function EncounterBadge({ type }) {
  return type === 'IP'
    ? <span className="badge badge-purple">IP</span>
    : <span className="badge badge-blue">OP</span>
}

function StatBadge() {
  return <span className="badge-stat text-[10px] px-2 py-0.5 rounded-full font-bold">STAT</span>
}

function MedRow({ order, onAddToCart, adding }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
      order.in_cart ? 'bg-green-50 border-green-200'
      : order.is_stat ? 'bg-red-50 border-red-200'
      : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-800">{order.medicine_name}</span>
          {order.is_stat && <StatBadge />}
          {order.in_cart && <span className="text-xs text-green-700 font-medium flex items-center gap-1"><CheckCircle size={11} />In cart</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-gray-500">
          {order.dose && <span>{order.dose}</span>}
          {order.frequency && <span>· {order.frequency}</span>}
          {order.duration && <span>· {order.duration}</span>}
          {order.route && <span>· {order.route}</span>}
          <span>Qty: {order.quantity}</span>
          {order.doctor_name && <span>· Dr. {order.doctor_name}</span>}
        </div>
        {order.instructions && <div className="text-xs text-gray-400 mt-0.5 italic">{order.instructions}</div>}
      </div>
      <button
        disabled={order.in_cart || adding}
        onClick={() => onAddToCart(order)}
        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          order.in_cart
            ? 'bg-green-100 text-green-700 cursor-not-allowed'
            : 'bg-navy text-white hover:opacity-90'
        }`}
        style={!order.in_cart ? { background: '#0F2557' } : {}}
      >
        {adding
          ? <Loader2 size={12} className="animate-spin" />
          : order.in_cart ? <CheckCircle size={12} /> : <Plus size={12} />}
        {order.in_cart ? 'Added' : 'Add to Cart'}
      </button>
    </div>
  )
}

function PatientRow({ patient, onAddAll, onAddOne }) {
  const [expanded, setExpanded] = useState(true)
  const [addingAll, setAddingAll] = useState(false)
  const [addingOne, setAddingOne] = useState({})

  const notInCart = patient.orders.filter(o => !o.in_cart)
  const allInCart = notInCart.length === 0
  const statCount = patient.orders.filter(o => o.is_stat).length

  const handleAddAll = async () => {
    setAddingAll(true)
    await onAddAll(patient)
    setAddingAll(false)
  }

  const handleAddOne = async (order) => {
    setAddingOne(p => ({ ...p, [order.source_id]: true }))
    await onAddOne(patient, order)
    setAddingOne(p => ({ ...p, [order.source_id]: false }))
  }

  return (
    <div className={`card overflow-hidden ${statCount > 0 ? 'border-l-4 border-red-500' : ''}`}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
          style={{ background: '#0F2557' }}>
          {(patient.patient_name || '?').charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800 text-sm">{patient.patient_name || 'Unknown'}</span>
            <EncounterBadge type={patient.encounter_type} />
            {statCount > 0 && <StatBadge />}
            {patient.has_interactions && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-50 border border-red-200">
                <AlertTriangle size={11} className="text-red-500" />
                <span className="text-xs text-red-600 font-semibold">{patient.interactions?.length || ''} interaction{(patient.interactions?.length || 0) > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
            {patient.bhid && <span>BHID: {patient.bhid}</span>}
            {patient.mrn && <span>MRN: {patient.mrn}</span>}
            {patient.mobile && <span>{patient.mobile}</span>}
            <span>{patient.orders.length} med{patient.orders.length > 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {!allInCart ? (
            <button
              onClick={handleAddAll}
              disabled={addingAll}
              className="btn-primary text-xs py-1.5 px-3"
            >
              {addingAll ? <Loader2 size={12} className="animate-spin" /> : <ShoppingCart size={12} />}
              Add All
            </button>
          ) : (
            <span className="flex items-center gap-1 text-xs text-green-700 font-semibold">
              <CheckCircle size={14} />All in cart
            </span>
          )}
          {expanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
          {patient.interactions?.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-red-600" />
                <span className="text-sm font-bold text-red-700">Drug Interactions</span>
              </div>
              {patient.interactions.map((ix, i) => (
                <div key={i} className="text-xs text-red-700 mb-1">
                  <span className={`inline-block px-1.5 py-0.5 rounded mr-2 font-bold ${
                    ix.severity === 'contraindicated' || ix.severity === 'serious'
                      ? 'bg-red-200 text-red-800' : 'bg-amber-100 text-amber-800'
                  }`}>{ix.severity}</span>
                  {ix.drug_a} + {ix.drug_b}
                  {ix.effect && <span className="text-gray-500 ml-2">— {ix.effect}</span>}
                </div>
              ))}
            </div>
          )}
          {[...patient.orders].sort((a, b) => (b.is_stat ? 1 : 0) - (a.is_stat ? 1 : 0)).map(order => (
            <MedRow
              key={`${order.source_type}-${order.source_id}`}
              order={order}
              onAddToCart={o => handleAddOne(o)}
              adding={addingOne[order.source_id]}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CpoeQueue() {
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError('') }
    else setRefreshing(true)
    try {
      const r = await api.get('/pharmacy/cpoe-queue')
      setQueue(Array.isArray(r) ? r : [])
    } catch (ex) {
      if (!silent) setError(ex.message || 'Failed to load CPOE queue')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(() => load(true), 60_000)
    return () => clearInterval(t)
  }, [load])

  const addAllForPatient = async (patient) => {
    const items = patient.orders.filter(o => !o.in_cart).map(o => ({
      source_type: o.source_type, source_id: o.source_id,
      patient_id: patient.patient_id, admission_id: patient.admission_id,
      encounter_type: patient.encounter_type, medicine_name: o.medicine_name,
      generic_name: o.generic_name, dose: o.dose, route: o.route,
      frequency: o.frequency, duration: o.duration, quantity: o.quantity,
      instructions: o.instructions, is_stat: o.is_stat, medicine_id: o.medicine_id,
    }))
    if (items.length === 0) return
    try {
      await api.post('/pharmacy/cart/add', { items })
      showToast(`${items.length} item${items.length > 1 ? 's' : ''} added to cart`)
      load(true)
    } catch (ex) {
      showToast('Failed: ' + (ex.message || 'error'))
    }
  }

  const addOneForPatient = async (patient, order) => {
    try {
      await api.post('/pharmacy/cart/add', {
        items: [{
          source_type: order.source_type, source_id: order.source_id,
          patient_id: patient.patient_id, admission_id: patient.admission_id,
          encounter_type: patient.encounter_type, medicine_name: order.medicine_name,
          generic_name: order.generic_name, dose: order.dose, route: order.route,
          frequency: order.frequency, duration: order.duration, quantity: order.quantity,
          instructions: order.instructions, is_stat: order.is_stat, medicine_id: order.medicine_id,
        }],
      })
      showToast(`${order.medicine_name} added to cart`)
      load(true)
    } catch (ex) {
      showToast('Failed: ' + (ex.message || 'error'))
    }
  }

  const statCount = queue.filter(p => p.orders.some(o => o.is_stat)).length
  const filtered = queue.filter(p => {
    if (filterType === 'stat') return p.orders.some(o => o.is_stat)
    if (filterType === 'ip') return p.encounter_type === 'IP'
    if (filterType === 'op') return p.encounter_type === 'OP'
    return true
  }).sort((a, b) => (b.orders.some(o => o.is_stat) ? 1 : 0) - (a.orders.some(o => o.is_stat) ? 1 : 0))

  return (
    <div>
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-800 text-sm shadow-xl">
          {toast}
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">CPOE Queue</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Pending OPD prescriptions + active IPD medication orders
            {statCount > 0 && <span className="ml-2 badge-stat px-2 py-0.5 rounded-full text-[11px]">{statCount} STAT</span>}
          </p>
        </div>
        <button onClick={() => load()} className="btn-secondary" disabled={refreshing}>
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />Refresh
        </button>
      </div>

      <div className="toolbar mb-4">
        {[
          { key: 'all',  label: `All (${queue.length})` },
          { key: 'stat', label: `STAT (${statCount})` },
          { key: 'ip',   label: 'Inpatient' },
          { key: 'op',   label: 'Outpatient' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilterType(f.key)}
            className={`filter-chip ${filterType === f.key ? 'border-blue-400 text-blue-700 bg-blue-50' : ''}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 size={32} className="animate-spin text-gray-400" /></div>
      ) : error ? (
        <div className="card p-10 text-center">
          <AlertTriangle size={32} className="mx-auto mb-2 text-red-500" />
          <p className="text-red-600">{error}</p>
          <button onClick={() => load()} className="btn-secondary mt-3">Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-14 text-center">
          <ClipboardList size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-500">No pending orders</p>
          <p className="text-sm text-gray-400 mt-1">{filterType !== 'all' ? 'Try changing the filter' : 'All caught up!'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(patient => (
            <PatientRow key={patient.patient_id} patient={patient} onAddAll={addAllForPatient} onAddOne={addOneForPatient} />
          ))}
        </div>
      )}
    </div>
  )
}
