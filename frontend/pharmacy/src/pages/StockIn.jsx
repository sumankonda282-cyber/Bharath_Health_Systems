import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { cachedFetch, cacheInvalidate, TTL } from '../utils/cache'
import { PackagePlus, Loader2, CheckCircle, AlertCircle, RefreshCw, ScanLine } from 'lucide-react'
import BarcodeScanner from '../components/BarcodeScanner'
import BarcodeLookupModal from '../components/BarcodeLookupModal'

const TYPES = [
  { value: 'add',      label: 'Receive Stock', desc: 'Adds to current stock' },
  { value: 'set',      label: 'Adjustment',    desc: 'Overrides to new total' },
  { value: 'subtract', label: 'Return/Remove', desc: 'Removes from stock' },
]

const EMPTY_FORM = {
  medicine_id: '',
  operation: 'add',
  quantity: '',
  batch_number: '',
  expiry_date: '',
  notes: '',
  unit_cost: '',
  supplier_name: '',
}

function txnTypeBadge(type) {
  if (type === 'add') return 'badge badge-green'
  if (type === 'set') return 'badge badge-blue'
  if (type === 'subtract' || type === 'dispense') return 'badge badge-yellow'
  return 'badge badge-gray'
}

function txnTypeLabel(type) {
  if (type === 'add') return 'Receive'
  if (type === 'set') return 'Adjustment'
  if (type === 'subtract') return 'Return/Remove'
  if (type === 'dispense') return 'Dispensed'
  return type
}

export default function StockIn() {
  const [medicines, setMedicines] = useState([])
  const [loadingMeds, setLoadingMeds] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [transactions, setTransactions] = useState([])
  const [loadingTxns, setLoadingTxns] = useState(true)
  const [showScanner, setShowScanner]   = useState(false)
  const [scannedBarcode, setScannedBarcode] = useState(null)
  const [barcodeData, setBarcodeData]   = useState(null)

  const loadMedicines = useCallback((invalidate = false) => {
    setLoadingMeds(true)
    const run = async () => {
      if (invalidate) await cacheInvalidate('pharmacy_inventory')
      await cachedFetch(
        'pharmacy_inventory',
        () => api.get('/pharmacy/medicines', { params: { limit: 500 } }),
        r => { setMedicines(Array.isArray(r) ? r : []); setLoadingMeds(false) },
        TTL.MEDIUM
      )
    }
    run().catch(() => setLoadingMeds(false))
  }, [])

  const loadTransactions = useCallback((invalidate = false) => {
    setLoadingTxns(true)
    const run = async () => {
      if (invalidate) await cacheInvalidate('pharmacy_stock_txns')
      await cachedFetch(
        'pharmacy_stock_txns',
        () => api.get('/pharmacy/stock-transactions', { params: { limit: 50 } }),
        r => { setTransactions(Array.isArray(r) ? r : []); setLoadingTxns(false) },
        TTL.SHORT
      )
    }
    run().catch(() => { setTransactions([]); setLoadingTxns(false) })
  }, [])

  useEffect(() => { loadMedicines(); loadTransactions() }, [loadMedicines, loadTransactions])

  const handleBarcodeScan = async (barcode) => {
    setShowScanner(false)
    setScannedBarcode(barcode)
    try {
      const data = await api.get(`/pharmacy/barcode/${encodeURIComponent(barcode)}`)
      setBarcodeData(data)
    } catch {
      setBarcodeData(null) // not found — show empty form
    }
  }

  const handleBarcodeConfirm = async (details) => {
    setScannedBarcode(null)
    setBarcodeData(null)
    // If medicine_id known, pre-select it; otherwise create new medicine entry
    if (details.medicine_id) {
      setForm({
        ...EMPTY_FORM,
        medicine_id:  details.medicine_id,
        operation:    'add',
        quantity:     details.quantity || '',
        batch_number: details.batch_number || '',
        expiry_date:  details.expiry_date || '',
        unit_cost:    details.unit_cost || '',
      })
    } else {
      // Create a new medicine record from the scanned details, then stock it
      try {
        const med = await api.post('/pharmacy/medicines', {
          name:         details.drug_name,
          generic_name: details.generic_name,
          manufacturer: details.manufacturer,
          form:         details.form,
          strength:     details.strength,
          mrp:          details.mrp ? parseFloat(details.mrp) : null,
          unit_price:   details.unit_cost ? parseFloat(details.unit_cost) : null,
          hsn_code:     details.hsn_code,
          gst_rate:     details.gst_rate ? parseFloat(details.gst_rate) : null,
          stock_quantity: 0,
        })
        // Update barcode mapping with the new medicine_id
        await api.put(`/pharmacy/barcode/${encodeURIComponent(details.barcode)}`, { medicine_id: med.id })
        await loadMedicines(true)
        setForm({
          ...EMPTY_FORM,
          medicine_id:  med.id,
          operation:    'add',
          quantity:     details.quantity || '',
          batch_number: details.batch_number || '',
          expiry_date:  details.expiry_date || '',
          unit_cost:    details.unit_cost || '',
        })
        setSuccess(`New medicine "${details.drug_name}" added to your library and linked to barcode.`)
      } catch {
        setError('Could not create medicine record. Please select manually.')
      }
    }
  }

  const selectedMed = medicines.find(m => String(m.id) === String(form.medicine_id))

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!form.medicine_id) { setError('Please select a medicine.'); return }
    const qty = Number(form.quantity)
    if (!qty || qty <= 0) { setError('Please enter a valid quantity.'); return }

    setSaving(true)
    try {
      const payload = { quantity: qty, operation: form.operation }
      if (form.batch_number) payload.batch_number = form.batch_number
      if (form.expiry_date) payload.expiry_date = form.expiry_date
      if (form.notes) payload.notes = form.notes
      if (form.unit_cost) payload.unit_cost = Number(form.unit_cost)
      if (form.supplier_name) payload.supplier_name = form.supplier_name

      const result = await api.put(`/pharmacy/medicines/${form.medicine_id}/stock`, payload)
      setSuccess(`Stock updated. ${selectedMed?.name} now has ${result.quantity_after} units.`)
      setForm(EMPTY_FORM)
      loadMedicines(true)
      loadTransactions(true)
    } catch (ex) {
      setError(ex.message || 'Failed to update stock')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Barcode Lookup / Detail Modal */}
      {scannedBarcode && (
        <BarcodeLookupModal
          barcode={scannedBarcode}
          data={barcodeData}
          mode="receive"
          onConfirm={handleBarcodeConfirm}
          onClose={() => { setScannedBarcode(null); setBarcodeData(null) }}
        />
      )}

      <div className="page-header">
        <h1 className="page-title">Receive / Adjust Stock</h1>
        <button
          onClick={() => setShowScanner(true)}
          className="btn-primary flex items-center gap-2"
        >
          <ScanLine size={16} /> Scan Barcode
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="col-span-3">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-5">
              <PackagePlus size={18} style={{ color: '#0F2557' }} />
              <span className="font-semibold text-gray-800">Stock Transaction</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Medicine *</label>
                {loadingMeds ? (
                  <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                    <Loader2 size={14} className="animate-spin" />Loading medicines…
                  </div>
                ) : (
                  <select className="input" value={form.medicine_id} onChange={set('medicine_id')} required>
                    <option value="">— Select Medicine —</option>
                    {medicines.map(m => (
                      <option key={m.id} value={m.id}>{m.name}{m.generic_name ? ` (${m.generic_name})` : ''}</option>
                    ))}
                  </select>
                )}
                {selectedMed && (
                  <div className="mt-2 px-3 py-2 bg-blue-50 rounded-xl text-sm flex items-center gap-3">
                    <span className="text-gray-500">Current Stock:</span>
                    <span className="font-bold" style={{ color: '#0F2557' }}>{selectedMed.stock_quantity ?? 0} {selectedMed.form || 'units'}</span>
                    <span className={`badge ml-auto ${(selectedMed.stock_quantity || 0) === 0 ? 'badge-red' : (selectedMed.stock_quantity || 0) <= (selectedMed.reorder_level || 10) ? 'badge-yellow' : 'badge-green'}`}>
                      {(selectedMed.stock_quantity || 0) === 0 ? 'Out of Stock' : (selectedMed.stock_quantity || 0) <= (selectedMed.reorder_level || 10) ? 'Low Stock' : 'In Stock'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="label">Transaction Type *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
                  {TYPES.map(t => (
                    <label
                      key={t.value}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 cursor-pointer transition-all text-center"
                      style={form.operation === t.value
                        ? { borderColor: '#0F2557', background: '#0F255708' }
                        : { borderColor: '#e5e7eb' }
                      }
                    >
                      <input
                        type="radio"
                        name="operation"
                        value={t.value}
                        checked={form.operation === t.value}
                        onChange={set('operation')}
                        className="sr-only"
                      />
                      <span className="text-sm font-semibold text-gray-700">{t.label}</span>
                      <span className="text-xs text-gray-400">{t.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">
                  Quantity *
                  {form.operation === 'add' && selectedMed && form.quantity && (
                    <span className="ml-2 text-green-600 font-normal">
                      → New total: {(selectedMed.stock_quantity || 0) + Number(form.quantity || 0)}
                    </span>
                  )}
                  {form.operation === 'set' && form.quantity && (
                    <span className="ml-2 text-blue-600 font-normal">→ Will set to: {form.quantity}</span>
                  )}
                </label>
                <input
                  type="number"
                  className="input"
                  min="1"
                  placeholder={form.operation === 'set' ? 'Enter new total stock' : 'Enter quantity'}
                  value={form.quantity}
                  onChange={set('quantity')}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Batch Number</label>
                  <input className="input" placeholder="e.g. BT-2024-001" value={form.batch_number} onChange={set('batch_number')} />
                </div>
                <div>
                  <label className="label">Expiry Date</label>
                  <input type="date" className="input" value={form.expiry_date} onChange={set('expiry_date')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Supplier Name <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <input className="input" placeholder="Supplier or distributor name" value={form.supplier_name} onChange={set('supplier_name')} />
                </div>
                <div>
                  <label className="label">Unit Cost ₹ <span className="text-gray-400 font-normal">(Optional)</span></label>
                  <input type="number" className="input" min="0" step="0.01" placeholder="Purchase price per unit" value={form.unit_cost} onChange={set('unit_cost')} />
                </div>
              </div>

              <div>
                <label className="label">Notes</label>
                <input className="input" placeholder="Reason or notes for this transaction" value={form.notes} onChange={set('notes')} />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle size={15} />{error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                  <CheckCircle size={15} />{success}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => { setForm(EMPTY_FORM); setError(''); setSuccess('') }}
                >
                  Reset
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? <><Loader2 size={15} className="animate-spin" />Saving…</> : <><PackagePlus size={15} />Update Stock</>}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="col-span-2">
          <div className="card overflow-hidden h-fit">
            <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-700 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={15} style={{ color: '#16a34a' }} />
                Transaction History
              </div>
              <button onClick={loadTransactions} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                <RefreshCw size={13} className={loadingTxns ? 'animate-spin' : ''} />
              </button>
            </div>
            {loadingTxns ? (
              <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                <PackagePlus size={28} className="mx-auto mb-2 opacity-30" />
                <p>No transactions yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {transactions.map(txn => (
                  <div key={txn.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-gray-800 truncate">{txn.medicine_name}</span>
                      <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                        {txn.created_at ? new Date(txn.created_at).toLocaleDateString('en-IN', { dateStyle: 'short' }) : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={txnTypeBadge(txn.transaction_type)}>{txnTypeLabel(txn.transaction_type)}</span>
                      <span className="text-xs text-gray-500">qty: <strong>{txn.quantity}</strong></span>
                      <span className="text-xs text-gray-500">→ stock: <strong>{txn.quantity_after}</strong></span>
                    </div>
                    {txn.supplier_name && <p className="text-xs text-gray-400 mt-1">Supplier: {txn.supplier_name}</p>}
                    {txn.batch_number && <p className="text-xs text-gray-400">Batch: {txn.batch_number}</p>}
                    {txn.performed_by_name && <p className="text-xs text-gray-400">By: {txn.performed_by_name}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
