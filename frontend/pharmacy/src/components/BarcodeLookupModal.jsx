import { useState, useEffect, useRef } from 'react'
import { CheckCircle, Search, X, Save, AlertCircle } from 'lucide-react'
import api from '../api/client'

const FORMS = ['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Ointment', 'Cream', 'Drops', 'Inhaler', 'Patch', 'Powder', 'Gel', 'Spray', 'Suppository', 'Other']
const GST_RATES = [0, 5, 12, 18]

/**
 * BarcodeLookupModal
 * Shows after a barcode is scanned.
 * - If barcode found in master: shows pre-filled details (all editable)
 * - If not found: searches medicine library, pharmacist picks + edits, then saves mapping
 *
 * Props:
 *   barcode: string
 *   data: object | null  (null = not found in master)
 *   mode: 'receive' | 'dispense'
 *   onConfirm(details) — called with final drug details + qty + price
 *   onClose()
 */
export default function BarcodeLookupModal({ barcode, data, mode, onConfirm, onClose }) {
  const isNew = !data

  const [form, setForm] = useState({
    drug_name:    data?.drug_name    || '',
    generic_name: data?.generic_name || '',
    manufacturer: data?.manufacturer || '',
    form:         data?.form         || '',
    strength:     data?.strength     || '',
    pack_size:    data?.pack_size    || '',
    mrp:          data?.mrp          || '',
    hsn_code:     data?.hsn_code     || '',
    gst_rate:     data?.gst_rate     ?? 12,
    medicine_id:  data?.medicine_id  || null,
    // Receive-specific
    quantity:     '',
    unit_cost:    '',
    batch_number: '',
    expiry_date:  '',
    // Dispense-specific
    selling_price: data?.mrp || '',
  })

  const [search, setSearch]         = useState('')
  const [searchResults, setResults] = useState([])
  const [searching, setSearching]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const searchTimer = useRef(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Search medicine library as pharmacist types
  useEffect(() => {
    if (!isNew || search.length < 2) { setResults([]); return }
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await api.get('/pharmacy/medicines/search', { params: { q: search, limit: 8 } })
        setResults(Array.isArray(data) ? data : (data.items || []))
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [search, isNew])

  const pickMedicine = (med) => {
    setForm(f => ({
      ...f,
      drug_name:    med.name || med.drug_name || '',
      generic_name: med.generic_name || '',
      manufacturer: med.manufacturer || '',
      form:         med.form || '',
      strength:     med.strength || '',
      mrp:          med.mrp || med.unit_price || '',
      hsn_code:     med.hsn_code || '',
      gst_rate:     med.gst_rate ?? 12,
      medicine_id:  med.id,
      selling_price: med.mrp || med.unit_price || '',
    }))
    setSearch('')
    setResults([])
  }

  const handleConfirm = async () => {
    if (!form.drug_name) return
    setSaving(true)
    try {
      // Save/update barcode mapping for future scans
      await api.post('/pharmacy/barcode', {
        barcode,
        drug_name:    form.drug_name,
        generic_name: form.generic_name,
        manufacturer: form.manufacturer,
        form:         form.form,
        strength:     form.strength,
        pack_size:    form.pack_size,
        mrp:          form.mrp ? parseFloat(form.mrp) : null,
        hsn_code:     form.hsn_code,
        gst_rate:     form.gst_rate ? parseFloat(form.gst_rate) : null,
        medicine_id:  form.medicine_id,
      })
      onConfirm({ ...form, barcode })
    } catch {
      // Even if save fails, proceed with the details
      onConfirm({ ...form, barcode })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <div className="flex items-center gap-2">
              {isNew
                ? <AlertCircle size={16} className="text-amber-500" />
                : <CheckCircle size={16} className="text-green-500" />}
              <span className="font-semibold text-gray-800">
                {isNew ? 'New Barcode — Fill Details' : 'Barcode Found'}
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5 font-mono">{barcode}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-0.5">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Medicine library search — only for new barcodes */}
          {isNew && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Search your medicine library</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full border border-gray-200 rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type drug name to search…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {searchResults.length > 0 && (
                <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  {searchResults.map(m => (
                    <button
                      key={m.id}
                      onClick={() => pickMedicine(m)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-800">{m.name}</div>
                      <div className="text-xs text-gray-400">{m.generic_name} · {m.form} · {m.strength}</div>
                    </button>
                  ))}
                </div>
              )}
              {searching && <p className="text-xs text-gray-400 mt-1">Searching…</p>}
            </div>
          )}

          {/* Drug details — all editable */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Drug Name *</label>
              <input className="input text-sm" value={form.drug_name} onChange={e => set('drug_name', e.target.value)} placeholder="e.g. Paracetamol 500mg" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Generic Name</label>
              <input className="input text-sm" value={form.generic_name} onChange={e => set('generic_name', e.target.value)} placeholder="e.g. Paracetamol" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Manufacturer</label>
              <input className="input text-sm" value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} placeholder="e.g. Cipla" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Form</label>
              <select className="input text-sm" value={form.form} onChange={e => set('form', e.target.value)}>
                <option value="">Select…</option>
                {FORMS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Strength</label>
              <input className="input text-sm" value={form.strength} onChange={e => set('strength', e.target.value)} placeholder="e.g. 500mg" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pack Size</label>
              <input className="input text-sm" value={form.pack_size} onChange={e => set('pack_size', e.target.value)} placeholder="e.g. 10 tablets" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">MRP (₹)</label>
              <input className="input text-sm" type="number" step="0.01" value={form.mrp} onChange={e => { set('mrp', e.target.value); set('selling_price', e.target.value) }} placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">HSN Code</label>
              <input className="input text-sm" value={form.hsn_code} onChange={e => set('hsn_code', e.target.value)} placeholder="e.g. 3004" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">GST %</label>
              <select className="input text-sm" value={form.gst_rate} onChange={e => set('gst_rate', e.target.value)}>
                {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
          </div>

          {/* Receive-specific fields */}
          {mode === 'receive' && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Stock Receipt Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantity Received *</label>
                  <input className="input text-sm" type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="0" autoFocus={!isNew} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Purchase Price (₹)</label>
                  <input className="input text-sm" type="number" step="0.01" value={form.unit_cost} onChange={e => set('unit_cost', e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Batch Number</label>
                  <input className="input text-sm" value={form.batch_number} onChange={e => set('batch_number', e.target.value)} placeholder="e.g. BT2024001" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Expiry Date</label>
                  <input className="input text-sm" type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Dispense-specific fields */}
          {mode === 'dispense' && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dispense Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
                  <input className="input text-sm" type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="1" autoFocus={!isNew} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Selling Price (₹)</label>
                  <input className="input text-sm" type="number" step="0.01" value={form.selling_price} onChange={e => set('selling_price', e.target.value)} placeholder="0.00" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!form.drug_name || saving}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <Save size={14} />
            {saving ? 'Saving…' : mode === 'receive' ? 'Add to Stock' : 'Add to Bill'}
          </button>
        </div>
      </div>
    </div>
  )
}
