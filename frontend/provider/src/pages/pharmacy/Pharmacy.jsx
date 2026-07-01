import { useState, useEffect } from 'react'
import { pharmacyApi } from '../../api'
import { PageLoader } from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import { Pill, Plus, Package, AlertTriangle, CheckCircle, Search } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function Pharmacy() {
  const { user } = useAuth()
  const [tab, setTab] = useState('pending')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [medicines, setMedicines] = useState([])
  const [pending, setPending] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAddMed, setShowAddMed] = useState(false)
  const [newMed, setNewMed] = useState({ name: '', generic_name: '', category: '', form: '', strength: '', unit_price: '', stock_quantity: '', reorder_level: 10 })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      pharmacyApi.getMedicines({ search, limit: 100 }),
      pharmacyApi.getPending(),
    ]).then(([m, p]) => {
      setMedicines(Array.isArray(m) ? m : [])
      setPending(Array.isArray(p) ? p : [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [search])

  const handleDispense = async (id) => {
    await pharmacyApi.dispense(id)
    load()
  }

  const handleAddMed = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await pharmacyApi.addMedicine(user.branch_id, newMed)
      setShowAddMed(false)
      setNewMed({ name: '', generic_name: '', category: '', form: '', strength: '', unit_price: '', stock_quantity: '', reorder_level: 10 })
      load()
    } finally {
      setSaving(false)
    }
  }

  const lowStock = medicines.filter(m => m.stock_quantity <= m.reorder_level)

  return (
    <div>
      <div className="page-header">
        <button onClick={() => setShowAddMed(true)} className="btn-primary"><Plus size={16} />Add Medicine</button>
      </div>

      {/* Stat pills — compact, each is a clickable filter */}
      <div className="grid grid-cols-3 gap-2 mb-4 max-w-xl">
        <button
          onClick={() => { setTab('inventory'); setLowStockOnly(false) }}
          className={`bg-white rounded-xl border px-2.5 py-2 flex items-center gap-2 text-left transition-all hover:shadow-sm ${tab === 'inventory' && !lowStockOnly ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-100 hover:border-blue-200'}`}
        >
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0"><Pill size={16} className="text-blue-600" /></div>
          <div className="min-w-0"><div className="text-lg font-extrabold leading-none text-gray-900">{medicines.length}</div><div className="text-[11px] text-gray-500 truncate mt-0.5">Total Medicines</div></div>
        </button>
        <button
          onClick={() => { setTab('inventory'); setLowStockOnly(true) }}
          className={`bg-white rounded-xl border px-2.5 py-2 flex items-center gap-2 text-left transition-all hover:shadow-sm ${lowStockOnly ? 'border-yellow-500 ring-1 ring-yellow-500' : 'border-gray-100 hover:border-yellow-200'}`}
        >
          <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0"><AlertTriangle size={16} className="text-yellow-600" /></div>
          <div className="min-w-0"><div className="text-lg font-extrabold leading-none text-yellow-600">{lowStock.length}</div><div className="text-[11px] text-gray-500 truncate mt-0.5">Low Stock</div></div>
        </button>
        <button
          onClick={() => { setTab('pending'); setLowStockOnly(false) }}
          className={`bg-white rounded-xl border px-2.5 py-2 flex items-center gap-2 text-left transition-all hover:shadow-sm ${tab === 'pending' ? 'border-orange-500 ring-1 ring-orange-500' : 'border-gray-100 hover:border-orange-200'}`}
        >
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0"><Package size={16} className="text-orange-600" /></div>
          <div className="min-w-0"><div className="text-lg font-extrabold leading-none text-orange-600">{pending.length}</div><div className="text-[11px] text-gray-500 truncate mt-0.5">Pending</div></div>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-4 w-fit">
        {['pending', 'inventory'].map(t => (
          <button key={t} onClick={() => { setTab(t); setLowStockOnly(false) }} className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>{t}</button>
        ))}
      </div>
      {lowStockOnly && tab === 'inventory' && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700 w-fit">
          <AlertTriangle size={14} className="text-yellow-500" />
          Showing low stock items only
          <button onClick={() => setLowStockOnly(false)} className="ml-1 text-yellow-500 hover:text-yellow-700 font-medium">Clear ✕</button>
        </div>
      )}

      {/* Pending Prescriptions */}
      {tab === 'pending' && (
        <div className="card">
          {loading ? <PageLoader /> : pending.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <CheckCircle size={32} className="mx-auto mb-2 opacity-30" />
              <p className="font-medium text-gray-500">All caught up — no pending prescriptions</p>
              <p className="text-xs mt-1 text-gray-400">New prescriptions from doctors land here for dispensing.</p>
            </div>
          ) : (
            <div className="table-wrapper rounded-xl border-0">
              <table className="table">
                <thead><tr>
                  <th className="th">Rx #</th><th className="th">Patient</th><th className="th">Doctor</th>
                  <th className="th">Items</th><th className="th">Time</th><th className="th">Action</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {pending.map(rx => (
                    <tr key={rx.id} className="tr-hover">
                      <td className="td font-mono">RX-{rx.id}</td>
                      <td className="td font-medium">{rx.patient_name || rx.patient?.full_name}</td>
                      <td className="td text-gray-500">{rx.doctor_name || '—'}</td>
                      <td className="td">
                        <div className="text-xs space-y-0.5">
                          {(rx.items || []).map((item, i) => (
                            <div key={i} className="text-gray-600">{item.medicine_name || item.medicine?.name} · {item.dosage} · {item.duration}</div>
                          ))}
                        </div>
                      </td>
                      <td className="td text-xs text-gray-400">{new Date(rx.created_at).toLocaleTimeString('en-IN')}</td>
                      <td className="td">
                        <button onClick={() => handleDispense(rx.id)} className="btn-success text-xs py-1">
                          <CheckCircle size={13} />Dispense
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Inventory */}
      {tab === 'inventory' && (
        <div className="card">
          <div className="p-4 border-b border-gray-100">
            <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-9" placeholder="Search medicines…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          {loading ? <PageLoader /> : (
            <div className="table-wrapper rounded-xl border-0">
              <table className="table">
                <thead><tr>
                  <th className="th">Name</th><th className="th">Generic</th><th className="th">Form</th>
                  <th className="th">Strength</th><th className="th">Stock</th><th className="th">Price</th><th className="th">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {(lowStockOnly ? lowStock : medicines).map(m => (
                    <tr key={m.id} className="tr-hover">
                      <td className="td font-medium">{m.name}</td>
                      <td className="td text-gray-500 text-xs">{m.generic_name || '—'}</td>
                      <td className="td text-xs">{m.form || '—'}</td>
                      <td className="td text-xs">{m.strength || '—'}</td>
                      <td className="td font-mono">{m.stock_quantity}</td>
                      <td className="td">₹{m.unit_price || '—'}</td>
                      <td className="td">
                        {m.stock_quantity <= m.reorder_level
                          ? <span className="badge-yellow">Low Stock</span>
                          : <span className="badge-green">OK</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Medicine Modal */}
      <Modal open={showAddMed} onClose={() => setShowAddMed(false)} title="Add Medicine to Inventory">
        <form onSubmit={handleAddMed} className="space-y-3">
          {[
            ['name', 'Medicine Name *', 'text', true],
            ['generic_name', 'Generic Name', 'text', false],
            ['category', 'Category', 'text', false],
            ['form', 'Form (Tablet/Syrup/Injection)', 'text', false],
            ['strength', 'Strength (e.g. 500mg)', 'text', false],
            ['unit_price', 'Unit Price (₹)', 'number', false],
            ['stock_quantity', 'Stock Quantity', 'number', false],
            ['reorder_level', 'Reorder Level', 'number', false],
          ].map(([k, label, type, req]) => (
            <div key={k}>
              <label className="label">{label}</label>
              <input className="input" type={type} required={req} value={newMed[k]} onChange={e => setNewMed(m => ({ ...m, [k]: e.target.value }))} />
            </div>
          ))}
          <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
            {saving ? 'Adding…' : 'Add Medicine'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
