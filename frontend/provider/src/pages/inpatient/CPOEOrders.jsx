import { useState, useEffect, useCallback } from 'react'
import api from '../../api/client'
import {
  Plus, ChevronDown,
  Pill, FlaskConical, Activity, Utensils, PersonStanding, Bell, Stethoscope,
  CheckCircle2, Clock, Ban,
} from 'lucide-react'
import MedicationOrderForm from '../../components/MedicationOrderForm'

const ORDER_TYPES = [
  { value: 'lab',       label: 'Lab', icon: FlaskConical },
  { value: 'imaging',   label: 'Imaging', icon: Activity },
  { value: 'procedure', label: 'Procedure', icon: Stethoscope },
  { value: 'diet',      label: 'Diet', icon: Utensils },
  { value: 'activity',  label: 'Activity', icon: PersonStanding },
  { value: 'nursing',   label: 'Nursing', icon: Bell },
  { value: 'consult',   label: 'Consult', icon: Stethoscope },
]

export default function CPOEOrders({ admissionId, patientAllergies = [], patientData = {} }) {
  const [tab, setTab]                   = useState('medications')
  const [medOrders, setMedOrders]           = useState([])
  const [clinicalOrders, setClinicalOrders] = useState([])
  const [showMedForm, setShowMedForm]       = useState(false)
  const [showClinForm, setShowClinForm]     = useState(false)
  const [clinForm, setClinForm]             = useState({ order_type: 'lab', order_detail: '', priority: 'routine', instructions: '' })
  const [saving, setSaving]                 = useState(false)
  const [error, setError]                   = useState('')

  const loadOrders = useCallback(async () => {
    if (!admissionId) return
    try {
      const [meds, clin] = await Promise.all([
        api.get(`/inpatient/admissions/${admissionId}/orders`),
        api.get(`/inpatient/admissions/${admissionId}/clinical-orders`),
      ])
      setMedOrders(meds)
      setClinicalOrders(clin)
    } catch {}
  }, [admissionId])

  useEffect(() => { loadOrders() }, [loadOrders])

  const discontinue = async (orderId) => {
    const reason = window.prompt('Reason for discontinuation:')
    if (reason === null) return
    try {
      await api.post(`/inpatient/orders/${orderId}/discontinue`, { reason })
      loadOrders()
    } catch {}
  }

  const submitClin = async () => {
    if (!clinForm.order_detail) { setError('Order detail required.'); return }
    setSaving(true); setError('')
    try {
      await api.post(`/inpatient/admissions/${admissionId}/clinical-orders`, clinForm)
      setClinForm({ order_type: 'lab', order_detail: '', priority: 'routine', instructions: '' })
      setShowClinForm(false)
      loadOrders()
    } catch (e) { setError(e?.detail || 'Failed to save order') }
    finally { setSaving(false) }
  }

  const statusBadge = (s) => {
    const map = {
      active:        'bg-emerald-100 text-emerald-800',
      held:          'bg-amber-100 text-amber-800',
      discontinued:  'bg-red-100 text-red-700',
      completed:     'bg-gray-100 text-gray-600',
      pending:       'bg-blue-100 text-blue-800',
      acknowledged:  'bg-indigo-100 text-indigo-800',
      in_progress:   'bg-purple-100 text-purple-800',
    }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[s] || 'bg-gray-100 text-gray-600'}`}>{s}</span>
  }

  const priorityBadge = (p) => {
    const map = { stat: 'bg-red-100 text-red-800', urgent: 'bg-amber-100 text-amber-800', routine: 'bg-gray-100 text-gray-600' }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[p] || 'bg-gray-100'}`}>{p}</span>
  }

  return (
    <div className="space-y-4">
      {/* Tab row */}
      <div className="flex gap-2 border-b border-gray-200">
        {[['medications', 'Medications', Pill], ['clinical', 'Clinical Orders', FlaskConical]].map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={14} /> {label}
            <span className="ml-1 text-xs bg-gray-100 rounded-full px-1.5">
              {id === 'medications' ? medOrders.filter(o => o.status === 'active').length : clinicalOrders.filter(o => o.status !== 'completed').length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Medications tab ─────────────────────────────────────────────────── */}
      {tab === 'medications' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => { setShowMedForm(v => !v); setError('') }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              <Plus size={14} /> New Order
            </button>
          </div>

          {/* Medication order modal */}
          {showMedForm && (
            <MedicationOrderForm
              admissionId={admissionId}
              patientAllergies={patientAllergies}
              existingOrders={medOrders}
              patientData={patientData || {}}
              onSubmit={async (data) => {
                await api.post(`/inpatient/admissions/${admissionId}/orders`, data)
                loadOrders()
              }}
              onCancel={() => setShowMedForm(false)}
            />
          )}

          {/* Orders list */}
          <div className="space-y-2">
            {medOrders.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-6">No medication orders yet.</p>
            )}
            {medOrders.map(o => (
              <div key={o.id} className={`border rounded-xl p-3 ${o.status === 'active' ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{o.drug_name}</span>
                      {o.generic_name && <span className="text-gray-500 text-xs">({o.generic_name})</span>}
                      {o.is_stat && <span className="px-1.5 py-0.5 bg-red-600 text-white text-xs rounded font-bold">STAT</span>}
                      {o.is_prn && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-xs rounded font-semibold">PRN</span>}
                      {statusBadge(o.status)}
                    </div>
                    <div className="text-sm text-gray-600 mt-0.5">
                      {o.dose} · {o.route} · {o.frequency}
                      {o.duration_days && ` · ${o.duration_days}d`}
                      {o.instructions && <span className="text-gray-400"> — {o.instructions}</span>}
                    </div>
                    {o.is_continuous && o.iv_fluid && (
                      <div className="text-xs text-indigo-600 mt-0.5">
                        IV: {o.iv_fluid} {o.iv_volume_ml && `${o.iv_volume_ml}mL`} @ {o.iv_rate}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      Ordered by {o.orderer_name} · {o.ordered_at ? new Date(o.ordered_at).toLocaleString('en-IN') : ''}
                    </div>
                  </div>
                  {o.status === 'active' && (
                    <button onClick={() => discontinue(o.id)}
                      className="flex-shrink-0 p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Discontinue">
                      <Ban size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Clinical Orders tab ─────────────────────────────────────────────── */}
      {tab === 'clinical' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => { setShowClinForm(v => !v); setError('') }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              <Plus size={14} /> New Order
            </button>
          </div>

          {showClinForm && (
            <div className="border border-indigo-200 rounded-xl p-4 bg-indigo-50 space-y-3">
              <h4 className="font-semibold text-indigo-900 text-sm">New Clinical Order</h4>
              <div>
                <label className="label">Order Type</label>
                <div className="flex flex-wrap gap-2">
                  {ORDER_TYPES.map(({ value, label, icon: Icon }) => (
                    <button key={value}
                      onClick={() => setClinForm(f => ({ ...f, order_type: value }))}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        clinForm.order_type === value
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                      }`}>
                      <Icon size={11} /> {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Order Detail *</label>
                <input className="input" placeholder={`e.g. CBC with differential, Chest X-Ray PA view…`}
                  value={clinForm.order_detail}
                  onChange={e => setClinForm(f => ({ ...f, order_detail: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Priority</label>
                  <select className="input" value={clinForm.priority}
                    onChange={e => setClinForm(f => ({ ...f, priority: e.target.value }))}>
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="stat">STAT</option>
                  </select>
                </div>
                <div>
                  <label className="label">Instructions</label>
                  <input className="input" placeholder="Special instructions" value={clinForm.instructions}
                    onChange={e => setClinForm(f => ({ ...f, instructions: e.target.value }))} />
                </div>
              </div>
              {error && <p className="text-red-600 text-xs">{error}</p>}
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowClinForm(false)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={submitClin} disabled={saving}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Place Order'}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {clinicalOrders.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-6">No clinical orders yet.</p>
            )}
            {clinicalOrders.map(o => {
              const TypeIcon = ORDER_TYPES.find(t => t.value === o.order_type)?.icon || FlaskConical
              return (
                <div key={o.id} className={`border rounded-xl p-3 ${o.status === 'completed' ? 'bg-gray-50 opacity-60' : 'bg-white'}`}>
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 bg-gray-100 rounded-lg flex-shrink-0">
                      <TypeIcon size={14} className="text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{o.order_detail}</span>
                        {priorityBadge(o.priority)}
                        {statusBadge(o.status)}
                      </div>
                      {o.instructions && <div className="text-xs text-gray-500 mt-0.5">{o.instructions}</div>}
                      <div className="text-xs text-gray-400 mt-1">
                        {o.order_type} · {o.orderer_name} · {o.ordered_at ? new Date(o.ordered_at).toLocaleString('en-IN') : ''}
                      </div>
                      {o.result_notes && (
                        <div className="mt-1 p-1.5 bg-emerald-50 rounded text-xs text-emerald-800">
                          <CheckCircle2 size={10} className="inline mr-1" />{o.result_notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
