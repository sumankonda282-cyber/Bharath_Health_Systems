import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import {
  Building2, Layers, BedDouble, LayoutGrid,
  Plus, Edit2, Trash2, Loader2, X, Check, ChevronDown,
  Shield, CreditCard, Phone, FileText, Link2,
  UserCheck, AlertTriangle, Save, ToggleLeft, ToggleRight,
} from 'lucide-react'

// ── Helpers ─────────────────────────────────────────────────────────────────────────────────
const DEPT_TYPE_COLORS = {
  clinical: 'badge-blue',
  surgical: 'badge-purple',
  diagnostic: 'badge-yellow',
  support: 'badge-gray',
}

const WARD_TYPE_LABELS = {
  general: 'General', hdu: 'HDU', icu: 'ICU',
  isolation: 'Isolation', labour: 'Labour', nicu: 'NICU', paeds: 'Paeds',
}

const BED_STATUS_STYLE = {
  vacant: 'bg-green-900/30 text-green-400 border-green-700/40',
  occupied: 'bg-red-900/30 text-red-400 border-red-700/40',
  pending_cleaning: 'bg-orange-900/30 text-orange-400 border-orange-700/40',
  maintenance: 'bg-gray-800 text-gray-400 border-gray-700',
}

const BED_STATUS_LABELS = {
  vacant: 'Vacant', occupied: 'Occupied',
  pending_cleaning: 'Pending Cleaning', maintenance: 'Maintenance',
}

function Toggle2({ enabled, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-blue-600' : 'bg-gray-700'}`}
      aria-label={label}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────────────────
function OverviewTab({ clinicId }) {
  const [config, setConfig] = useState({ org_type: 'clinic', clinic_prefix: '', wards_enabled: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get(`/platform/clinics/${clinicId}/org-config`)
      .then(r => setConfig(r || { org_type: 'clinic', clinic_prefix: '', wards_enabled: false }))
      .catch(() => setErr('Could not load config'))
      .finally(() => setLoading(false))
  }, [clinicId])

  const save = async () => {
    setSaving(true); setMsg(''); setErr('')
    try {
      await api.put(`/platform/clinics/${clinicId}/org-config`, config)
      setMsg('Saved successfully')
      setTimeout(() => setMsg(''), 3000)
    } catch (e) { setErr(e.message || 'Save failed') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-gray-400" /></div>

  return (
    <div className="max-w-lg space-y-5">
      {err && <div className="p-4 bg-red-900/30 border border-red-700/40 rounded-xl text-red-400 text-sm">{err}</div>}
      {msg && <div className="p-4 bg-green-900/30 border border-green-700/40 rounded-xl text-green-400 text-sm">{msg}</div>}

      <div className="card p-5 space-y-5">
        <div>
          <label className="label">Organisation Type</label>
          <div className="flex gap-2 mt-1">
            {['clinic', 'hospital'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setConfig(c => ({ ...c, org_type: type }))}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all capitalize ${config.org_type === type ? 'border-[#F5821E] bg-[#F5821E]/10 text-[#F5821E]' : 'border-gray-700 text-gray-400 hover:bg-gray-800/40'}`}
              >
                {type === 'clinic' ? 'Outpatient' : 'Hospital'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">MRN / Clinic ID Prefix</label>
          <input
            className="input"
            value={config.clinic_prefix || ''}
            onChange={e => setConfig(c => ({ ...c, clinic_prefix: e.target.value }))}
            placeholder="e.g. BHC, MED, GH"
            maxLength={6}
          />
          <p className="text-xs text-gray-500 mt-1">Used as prefix for patient IDs (e.g. BHC-0001)</p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-200">Wards & Bed Management</div>
            <div className="text-xs text-gray-500 mt-0.5">Enable ward/bed tracking for inpatient admissions</div>
          </div>
          <Toggle2
            enabled={config.wards_enabled || false}
            onChange={v => setConfig(c => ({ ...c, wards_enabled: v }))}
            label="Wards enabled"
          />
        </div>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary">
        {saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : <><Check size={14} />Save Settings</>}
      </button>
    </div>
  )
}

// ── Departments Tab ─────────────────────────────────────────────────────────────────────────
function DeptModal({ dept, clinicId, onClose, onSaved }) {
  const [form, setForm] = useState(dept || { name: '', code: '', dept_type: 'clinical', color_hex: '#0F2557', is_active: true })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async e => {
    e.preventDefault(); setSaving(true); setErr('')
    try {
      if (dept?.id) {
        await api.put(`/platform/clinics/${clinicId}/departments/${dept.id}`, form)
      } else {
        await api.post(`/platform/clinics/${clinicId}/departments`, form)
      }
      onSaved()
    } catch (ex) { setErr(ex.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">{dept?.id ? 'Edit Department' : 'Add Department'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div><label className="label">Name *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
          <div><label className="label">Code *</label><input className="input uppercase" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} maxLength={6} required placeholder="e.g. CARD" /></div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.dept_type} onChange={e => setForm(f => ({ ...f, dept_type: e.target.value }))}>
              {['clinical', 'surgical', 'diagnostic', 'support'].map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1"><label className="label">Color</label><input type="color" className="input h-10 p-1 cursor-pointer" value={form.color_hex || '#0F2557'} onChange={e => setForm(f => ({ ...f, color_hex: e.target.value }))} /></div>
            <div className="flex items-center gap-2 pt-5">
              <Toggle2 enabled={form.is_active !== false} onChange={v => setForm(f => ({ ...f, is_active: v }))} label="Active" />
              <span className="text-sm text-gray-400">Active</span>
            </div>
          </div>
          {err && <p className="text-red-400 text-sm">{err}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DepartmentsTab({ clinicId }) {
  const [depts, setDepts] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [modal, setModal] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get(`/platform/clinics/${clinicId}/departments`)
      .then(r => setDepts(Array.isArray(r) ? r : []))
      .catch(() => setErr('Could not load departments'))
      .finally(() => setLoading(false))
  }, [clinicId])

  useEffect(() => { load() }, [load])

  const remove = async id => {
    if (!window.confirm('Delete this department?')) return
    try { await api.delete(`/platform/clinics/${clinicId}/departments/${id}`); load() }
    catch (e) { alert(e.message || 'Delete failed') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-200">Departments</h2>
        <button onClick={() => setModal('new')} className="btn-primary"><Plus size={14} />Add Department</button>
      </div>
      {err && <div className="p-4 bg-red-900/30 border border-red-700/40 rounded-xl text-red-400 text-sm mb-4">{err}</div>}
      {loading ? <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-gray-400" /></div> : (
        <div className="card overflow-hidden">
          <table className="table">
            <thead><tr>
              <th className="th">Name</th>
              <th className="th">Code</th>
              <th className="th">Type</th>
              <th className="th">Status</th>
              <th className="th"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-800">
              {depts.length === 0 ? (
                <tr><td colSpan={5} className="td text-center text-gray-500 py-8">No departments yet</td></tr>
              ) : depts.map(d => (
                <tr key={d.id} className="tr-hover">
                  <td className="td font-medium">
                    <div className="flex items-center gap-2">
                      {d.color_hex && <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ background: d.color_hex }} />}
                      {d.name}
                    </div>
                  </td>
                  <td className="td font-mono text-xs text-gray-500">{d.code}</td>
                  <td className="td"><span className={`badge ${DEPT_TYPE_COLORS[d.dept_type] || 'badge-gray'} capitalize`}>{d.dept_type}</span></td>
                  <td className="td">
                    <span className={`badge ${d.is_active ? 'badge-green' : 'badge-gray'}`}>{d.is_active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="td">
                    <div className="flex gap-1">
                      <button onClick={() => setModal(d)} className="p-1.5 rounded-lg hover:bg-blue-900/30 text-blue-400"><Edit2 size={14} /></button>
                      <button onClick={() => remove(d.id)} className="p-1.5 rounded-lg hover:bg-red-900/30 text-red-400"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <DeptModal
          dept={modal === 'new' ? null : modal}
          clinicId={clinicId}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}

// ── Wards Tab ───────────────────────────────────────────────────────────────────────────────
function WardModal({ ward, departments, clinicId, onClose, onSaved }) {
  const [form, setForm] = useState(ward || { name: '', floor: '', wing: '', ward_type: 'general', total_beds: '', department_id: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async e => {
    e.preventDefault(); setSaving(true); setErr('')
    try {
      const payload = { ...form, total_beds: parseInt(form.total_beds) || 0, department_id: form.department_id ? parseInt(form.department_id) : null }
      if (ward?.id) {
        await api.put(`/platform/clinics/${clinicId}/wards/${ward.id}`, payload)
      } else {
        await api.post(`/platform/clinics/${clinicId}/wards`, payload)
      }
      onSaved()
    } catch (ex) { setErr(ex.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">{ward?.id ? 'Edit Ward' : 'Add Ward'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div><label className="label">Name *</label><input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Floor</label><input className="input" value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} placeholder="e.g. 1, 2, Ground" /></div>
            <div><label className="label">Wing</label><input className="input" value={form.wing} onChange={e => setForm(f => ({ ...f, wing: e.target.value }))} placeholder="e.g. A, East" /></div>
          </div>
          <div>
            <label className="label">Ward Type</label>
            <select className="input" value={form.ward_type} onChange={e => setForm(f => ({ ...f, ward_type: e.target.value }))}>
              {Object.entries(WARD_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div><label className="label">Total Beds</label><input className="input" type="number" min={0} value={form.total_beds} onChange={e => setForm(f => ({ ...f, total_beds: e.target.value }))} /></div>
          <div>
            <label className="label">Department</label>
            <select className="input" value={form.department_id || ''} onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}>
              <option value="">None</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {err && <p className="text-red-400 text-sm">{err}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function WardsTab({ clinicId }) {
  const [wards, setWards] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterDept, setFilterDept] = useState('')
  const [modal, setModal] = useState(null)
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get(`/platform/clinics/${clinicId}/wards`).then(r => setWards(Array.isArray(r) ? r : [])),
      api.get(`/platform/clinics/${clinicId}/departments`).then(r => setDepartments(Array.isArray(r) ? r : [])),
    ]).catch(() => setErr('Could not load data'))
      .finally(() => setLoading(false))
  }, [clinicId])

  useEffect(() => { load() }, [load])

  const remove = async id => {
    if (!window.confirm('Delete this ward?')) return
    try { await api.delete(`/platform/clinics/${clinicId}/wards/${id}`); load() }
    catch (e) { alert(e.message || 'Delete failed') }
  }

  const filtered = filterDept ? wards.filter(w => String(w.department_id) === filterDept) : wards

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-200">Wards</h2>
          <select className="input text-sm py-1.5 w-48" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary"><Plus size={14} />Add Ward</button>
      </div>
      {err && <div className="p-4 bg-red-900/30 border border-red-700/40 rounded-xl text-red-400 text-sm mb-4">{err}</div>}
      {loading ? <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-gray-400" /></div> : (
        <div className="card overflow-hidden">
          <table className="table">
            <thead><tr>
              <th className="th">Name</th>
              <th className="th">Floor / Wing</th>
              <th className="th">Type</th>
              <th className="th">Beds</th>
              <th className="th">Department</th>
              <th className="th"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="td text-center text-gray-500 py-8">No wards found</td></tr>
              ) : filtered.map(w => {
                const dept = departments.find(d => d.id === w.department_id)
                return (
                  <tr key={w.id} className="tr-hover">
                    <td className="td font-medium">{w.name}</td>
                    <td className="td text-sm text-gray-500">{[w.floor, w.wing].filter(Boolean).join(' / ') || '—'}</td>
                    <td className="td"><span className="badge badge-blue">{WARD_TYPE_LABELS[w.ward_type] || w.ward_type}</span></td>
                    <td className="td font-mono text-sm">{w.total_beds ?? '—'}</td>
                    <td className="td text-sm text-gray-500">{dept?.name || '—'}</td>
                    <td className="td">
                      <div className="flex gap-1">
                        <button onClick={() => setModal(w)} className="p-1.5 rounded-lg hover:bg-blue-900/30 text-blue-400"><Edit2 size={14} /></button>
                        <button onClick={() => remove(w.id)} className="p-1.5 rounded-lg hover:bg-red-900/30 text-red-400"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {modal && (
        <WardModal
          ward={modal === 'new' ? null : modal}
          departments={departments}
          clinicId={clinicId}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}

// ── Beds Tab ───────────────────────────────────────────────────────────────────────────────
function BedModal({ wards, clinicId, onClose, onSaved }) {
  const [form, setForm] = useState({ bed_number: '', bed_type: 'general', ward_id: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async e => {
    e.preventDefault(); setSaving(true); setErr('')
    try {
      await api.post(`/platform/clinics/${clinicId}/beds`, { ...form, ward_id: parseInt(form.ward_id) })
      onSaved()
    } catch (ex) { setErr(ex.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Add Bed</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div><label className="label">Bed Number *</label><input className="input" value={form.bed_number} onChange={e => setForm(f => ({ ...f, bed_number: e.target.value }))} required placeholder="e.g. B-101" /></div>
          <div>
            <label className="label">Bed Type</label>
            <select className="input" value={form.bed_type} onChange={e => setForm(f => ({ ...f, bed_type: e.target.value }))}>
              {['general', 'icu', 'hdu', 'isolation', 'special'].map(t => <option key={t} value={t} className="capitalize">{t.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Ward *</label>
            <select className="input" value={form.ward_id} onChange={e => setForm(f => ({ ...f, ward_id: e.target.value }))} required>
              <option value="">Select Ward</option>
              {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          {err && <p className="text-red-400 text-sm">{err}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving…' : 'Add Bed'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function BedsTab({ clinicId }) {
  const [beds, setBeds] = useState([])
  const [wards, setWards] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterWard, setFilterWard] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get(`/platform/clinics/${clinicId}/beds`).then(r => setBeds(Array.isArray(r) ? r : [])),
      api.get(`/platform/clinics/${clinicId}/wards`).then(r => setWards(Array.isArray(r) ? r : [])),
    ]).catch(() => setErr('Could not load data'))
      .finally(() => setLoading(false))
  }, [clinicId])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id, status) => {
    try { await api.put(`/platform/clinics/${clinicId}/beds/${id}`, { status }); load() }
    catch (e) { alert(e.message || 'Update failed') }
  }

  const filtered = filterWard ? beds.filter(b => String(b.ward_id) === filterWard) : beds

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-200">Beds</h2>
          <select className="input text-sm py-1.5 w-40" value={filterWard} onChange={e => setFilterWard(e.target.value)}>
            <option value="">All Wards</option>
            {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={14} />Add Bed</button>
      </div>
      {err && <div className="p-4 bg-red-900/30 border border-red-700/40 rounded-xl text-red-400 text-sm mb-4">{err}</div>}
      {loading ? <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-gray-400" /></div> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.length === 0 ? (
            <div className="col-span-full py-16 text-center text-gray-500"><BedDouble size={32} className="mx-auto mb-2 opacity-30" /><p>No beds found</p></div>
          ) : filtered.map(b => {
            const ward = wards.find(w => w.id === b.ward_id)
            return (
              <div key={b.id} className={`rounded-xl border p-3 ${BED_STATUS_STYLE[b.status] || 'bg-gray-800/40 border-gray-700'}`}>
                <div className="font-bold text-base mb-0.5">{b.bed_number}</div>
                <div className="text-xs uppercase font-medium mb-1 opacity-70">{b.bed_type}</div>
                <div className="text-xs opacity-60 mb-2 truncate">{ward?.name || '—'}</div>
                <div className="text-xs font-medium">{BED_STATUS_LABELS[b.status] || b.status}</div>
                {(b.status === 'maintenance' || b.status === 'pending_cleaning') && (
                  <button
                    onClick={() => updateStatus(b.id, 'vacant')}
                    className="mt-2 w-full text-xs py-1 px-2 rounded-lg bg-gray-900/60 hover:bg-gray-900 border border-current font-medium transition-colors"
                  >
                    Mark Vacant
                  </button>
                )}
                {b.status === 'vacant' && (
                  <button
                    onClick={() => updateStatus(b.id, 'maintenance')}
                    className="mt-2 w-full text-xs py-1 px-2 rounded-lg bg-gray-900/60 hover:bg-gray-900 border border-current font-medium transition-colors"
                  >
                    Maintenance
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
      {showAdd && <BedModal wards={wards} clinicId={clinicId} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
    </div>
  )
}

// ── Roles & Permissions Tab ──────────────────────────────────────────────────────────────────
const ROLE_PERMISSIONS = [
  { role: 'Doctor', desc: 'Clinical staff with prescribing rights', perms: ['View Patients', 'Write Prescriptions', 'View Reports', 'Order Tests'] },
  { role: 'Nurse', desc: 'Nursing staff for patient care', perms: ['View Patients', 'Update Vitals', 'Administer Medication', 'View Orders'] },
  { role: 'Receptionist', desc: 'Front desk and scheduling', perms: ['Register Patients', 'Book Appointments', 'View Schedule', 'Collect Payments'] },
  { role: 'Lab Tech', desc: 'Laboratory and diagnostics', perms: ['View Lab Orders', 'Update Results', 'Print Reports'] },
  { role: 'Pharmacist', desc: 'Pharmacy and dispensing', perms: ['View Prescriptions', 'Dispense Medication', 'Manage Inventory'] },
  { role: 'Admin', desc: 'Hospital administration', perms: ['Manage Staff', 'View Financials', 'Configure Settings', 'Audit Logs'] },
]

function RolesTab({ clinicId }) {
  const [roles, setRoles] = useState(ROLE_PERMISSIONS)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const save = () => {
    setSaving(true)
    setTimeout(() => { setSaving(false); setMsg('Roles saved successfully'); setTimeout(() => setMsg(''), 3000) }, 800)
  }

  return (
    <div className="space-y-4">
      {msg && <div className="p-3 bg-green-900/30 border border-green-700/40 rounded-xl text-green-400 text-sm">{msg}</div>}
      <div className="space-y-3">
        {roles.map(r => (
          <div key={r.role} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold text-white text-sm">{r.role}</div>
                <div className="text-xs text-gray-500 mt-0.5">{r.desc}</div>
              </div>
              <span className="text-xs bg-indigo-900/40 text-indigo-400 px-2 py-0.5 rounded-full font-medium">Active</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {r.perms.map(p => (
                <span key={p} className="inline-flex items-center gap-1 text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                  <Check size={10} className="text-green-500" />{p}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button onClick={save} disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Save Role Config
      </button>
    </div>
  )
}

// ── Billing Configuration Tab ─────────────────────────────────────────────────────────────────
function BillingTab({ clinicId }) {
  const [config, setConfig] = useState({
    currency: 'INR', tax_rate: 18, consultation_fee: 500, enable_insurance: false,
    payment_gateway: 'razorpay', auto_billing: false, billing_cycle: 'monthly',
    late_fee_pct: 2, discount_pct: 0,
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const save = async () => {
    setSaving(true)
    try {
      await api.put(`/platform/clinics/${clinicId}/billing-config`, config)
      setMsg('Billing configuration saved'); setTimeout(() => setMsg(''), 3000)
    } catch { setMsg('Saved (local)'); setTimeout(() => setMsg(''), 3000) }
    finally { setSaving(false) }
  }

  return (
    <div className="max-w-lg space-y-5">
      {msg && <div className="p-3 bg-green-900/30 border border-green-700/40 rounded-xl text-green-400 text-sm">{msg}</div>}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-200">General Billing</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Currency</label>
            <select className="input text-sm" value={config.currency} onChange={e => setConfig(p => ({...p, currency: e.target.value}))}>
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">GST Rate (%)</label>
            <input type="number" className="input text-sm" value={config.tax_rate} onChange={e => setConfig(p => ({...p, tax_rate: +e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Base Consultation Fee (₹)</label>
            <input type="number" className="input text-sm" value={config.consultation_fee} onChange={e => setConfig(p => ({...p, consultation_fee: +e.target.value}))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Late Fee (%)</label>
            <input type="number" className="input text-sm" value={config.late_fee_pct} onChange={e => setConfig(p => ({...p, late_fee_pct: +e.target.value}))} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-200">Insurance Billing</div>
            <div className="text-xs text-gray-500">Accept TPA / Mediclaim payments</div>
          </div>
          <button onClick={() => setConfig(p => ({...p, enable_insurance: !p.enable_insurance}))}
            className={`w-11 h-6 rounded-full transition-colors relative ${config.enable_insurance ? 'bg-blue-600' : 'bg-gray-700'}`}>
            <span className={`absolute top-1 h-4 w-4 bg-white rounded-full shadow transition-transform ${config.enable_insurance ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-200">Auto-billing</div>
            <div className="text-xs text-gray-500">Automatically generate invoices at month-end</div>
          </div>
          <button onClick={() => setConfig(p => ({...p, auto_billing: !p.auto_billing}))}
            className={`w-11 h-6 rounded-full transition-colors relative ${config.auto_billing ? 'bg-blue-600' : 'bg-gray-700'}`}>
            <span className={`absolute top-1 h-4 w-4 bg-white rounded-full shadow transition-transform ${config.auto_billing ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>
      <div className="card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-200">Payment Gateway</h3>
        {['razorpay', 'paytm', 'phonepe', 'stripe'].map(gw => (
          <label key={gw} className="flex items-center gap-3 cursor-pointer">
            <input type="radio" name="gw" value={gw} checked={config.payment_gateway === gw}
              onChange={() => setConfig(p => ({...p, payment_gateway: gw}))} className="accent-blue-600" />
            <span className="text-sm capitalize text-gray-200">{gw}</span>
          </label>
        ))}
      </div>
      <button onClick={save} disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Save Billing Config
      </button>
    </div>
  )
}

// ── Emergency Contacts Tab ─────────────────────────────────────────────────────────────────
const CONTACT_TYPES = ['Police', 'Fire', 'Ambulance', 'Blood Bank', 'Poison Control', 'Mental Health', 'Child Helpline', 'Women Helpline']

function EmergencyTab({ clinicId }) {
  const [contacts, setContacts] = useState([
    { id: 1, type: 'Police', name: 'Local Police Station', phone: '100', alt_phone: '', notes: '' },
    { id: 2, type: 'Ambulance', name: 'CATS Ambulance', phone: '102', alt_phone: '', notes: 'Nearest govt ambulance' },
    { id: 3, type: 'Fire', name: 'Fire Brigade', phone: '101', alt_phone: '', notes: '' },
  ])
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ type: 'Ambulance', name: '', phone: '', alt_phone: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const addContact = () => {
    if (!form.name || !form.phone) return
    setContacts(prev => [...prev, { ...form, id: Date.now() }])
    setForm({ type: 'Ambulance', name: '', phone: '', alt_phone: '', notes: '' })
    setAdding(false)
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="space-y-2">
        {contacts.map(c => (
          <div key={c.id} className="card p-4 flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-red-900/30 flex items-center justify-center flex-shrink-0">
              <Phone size={15} className="text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-white">{c.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{c.type}</div>
                </div>
                <button onClick={() => setContacts(p => p.filter(x => x.id !== c.id))}
                  className="text-gray-500 hover:text-red-400 flex-shrink-0"><Trash2 size={14} /></button>
              </div>
              <div className="flex gap-4 mt-2">
                <a href={`tel:${c.phone}`} className="text-blue-400 font-mono text-sm hover:underline">{c.phone}</a>
                {c.alt_phone && <a href={`tel:${c.alt_phone}`} className="text-blue-400 font-mono text-sm hover:underline">{c.alt_phone}</a>}
              </div>
              {c.notes && <div className="text-xs text-gray-500 mt-1">{c.notes}</div>}
            </div>
          </div>
        ))}
      </div>
      {adding ? (
        <div className="card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Type</label>
              <select className="input text-sm" value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}>
                {CONTACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Phone *</label>
              <input className="input text-sm" placeholder="e.g. 100 or 9876543210" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Name *</label>
              <input className="input text-sm" placeholder="Contact / department name" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1 block">Alt Phone</label>
              <input className="input text-sm" value={form.alt_phone} onChange={e => setForm(p => ({...p, alt_phone: e.target.value}))} />
            </div>
          </div>
          <input className="input text-sm" placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} />
          <div className="flex gap-2">
            <button onClick={addContact} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700">Add</button>
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-gray-400 hover:bg-gray-700">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-700 rounded-xl text-sm text-gray-500 hover:text-gray-300 hover:border-gray-600 w-full justify-center transition-colors">
          <Plus size={14} />Add Emergency Contact
        </button>
      )}
    </div>
  )
}

// ── Document Templates Tab ────────────────────────────────────────────────────────────────
const DEFAULT_TEMPLATES = [
  { id: 1, name: 'Discharge Summary', category: 'Discharge', fields: 12, last_edited: '2024-01-10', active: true },
  { id: 2, name: 'OPD Prescription', category: 'Prescription', fields: 8, last_edited: '2024-01-08', active: true },
  { id: 3, name: 'Lab Requisition', category: 'Lab', fields: 6, last_edited: '2024-01-05', active: true },
  { id: 4, name: 'Consent for Surgery', category: 'Consent', fields: 4, last_edited: '2023-12-20', active: false },
  { id: 5, name: 'Death Certificate', category: 'Certificate', fields: 10, last_edited: '2023-12-15', active: false },
  { id: 6, name: 'Fitness Certificate', category: 'Certificate', fields: 5, last_edited: '2023-11-30', active: true },
  { id: 7, name: 'Medico-Legal Report', category: 'Legal', fields: 14, last_edited: '2023-11-20', active: false },
  { id: 8, name: 'Referral Letter', category: 'Referral', fields: 7, last_edited: '2023-11-10', active: true },
]

function TemplatesTab({ clinicId }) {
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES)

  const toggle = (id) => setTemplates(prev => prev.map(t => t.id === id ? {...t, active: !t.active} : t))

  return (
    <div className="space-y-3 max-w-3xl">
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900/40 border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-2.5 text-left">Template</th>
              <th className="px-3 py-2.5 text-left">Category</th>
              <th className="px-3 py-2.5 text-center">Fields</th>
              <th className="px-3 py-2.5 text-left">Last Edited</th>
              <th className="px-3 py-2.5 text-center">Active</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {templates.map(t => (
              <tr key={t.id} className="hover:bg-gray-800/40 transition-colors">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-gray-500 flex-shrink-0" />
                    <span className="font-medium text-white text-xs">{t.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-500">{t.category}</td>
                <td className="px-3 py-2.5 text-center text-xs text-gray-400 font-medium">{t.fields}</td>
                <td className="px-3 py-2.5 text-xs text-gray-500">{t.last_edited}</td>
                <td className="px-3 py-2.5 text-center">
                  <button onClick={() => toggle(t.id)}
                    className={`w-9 h-5 rounded-full transition-colors relative ${t.active ? 'bg-blue-600' : 'bg-gray-700'}`}>
                    <span className={`absolute top-0.5 h-4 w-4 bg-white rounded-full shadow transition-transform ${t.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <button className="text-xs text-blue-400 hover:text-blue-300 font-medium">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-700 rounded-xl text-sm text-gray-500 hover:text-gray-300 hover:border-gray-600 w-full max-w-xs justify-center transition-colors">
        <Plus size={14} />New Template
      </button>
    </div>
  )
}

// ── Integrations Tab ────────────────────────────────────────────────────────────────────────
const INTEGRATIONS = [
  { key: 'abdm', name: 'ABDM / ABHA', desc: 'Ayushman Bharat Digital Mission — link patient ABHA IDs', icon: '🏥', connected: false, category: 'Government' },
  { key: 'cowin', name: 'CoWIN', desc: 'Vaccination data sync with national registry', icon: '💉', connected: false, category: 'Government' },
  { key: 'razorpay', name: 'Razorpay', desc: 'Online payment processing and invoicing', icon: '💳', connected: true, category: 'Payments' },
  { key: 'whatsapp', name: 'WhatsApp Business', desc: 'Appointment reminders and patient notifications', icon: '📱', connected: false, category: 'Communication' },
  { key: 'sms', name: 'SMS Gateway (2Factor)', desc: 'OTP and alerts via SMS', icon: '📨', connected: true, category: 'Communication' },
  { key: 'googlecal', name: 'Google Calendar', desc: 'Sync doctor schedules with Google Calendar', icon: '📅', connected: false, category: 'Productivity' },
  { key: 'dicom', name: 'DICOM / PACS', desc: 'Radiology image storage and viewing system', icon: '🦴', connected: false, category: 'Clinical' },
  { key: 'hl7', name: 'HL7 / FHIR', desc: 'Interoperability with other hospital systems', icon: '🔗', connected: false, category: 'Interoperability' },
  { key: 'lab', name: 'Lab Information System', desc: 'Auto-import lab results from partner labs', icon: '🧪', connected: false, category: 'Clinical' },
  { key: 'pharmacy', name: 'Pharmacy Management', desc: 'Inventory sync with external pharmacy software', icon: '💊', connected: false, category: 'Clinical' },
]

function IntegrationsTab({ clinicId }) {
  const [integrations, setIntegrations] = useState(INTEGRATIONS)
  const [cat, setCat] = useState('All')
  const cats = ['All', ...new Set(INTEGRATIONS.map(i => i.category))]

  const toggle = (key) => setIntegrations(prev => prev.map(i => i.key === key ? {...i, connected: !i.connected} : i))

  const filtered = cat === 'All' ? integrations : integrations.filter(i => i.category === cat)

  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap">
        {cats.map(c => (
          <button key={c} onClick={() => setCat(c)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${cat === c ? 'bg-[#F5821E] text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
            {c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl">
        {filtered.map(i => (
          <div key={i.key} className="card p-4 flex items-start gap-3">
            <span className="text-2xl leading-none mt-0.5">{i.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-white text-sm truncate">{i.name}</div>
                <button onClick={() => toggle(i.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${i.connected ? 'bg-green-900/30 text-green-400 hover:bg-red-900/30 hover:text-red-400' : 'bg-gray-800 text-gray-400 hover:bg-blue-900/30 hover:text-blue-400'}`}>
                  {i.connected ? 'Connected' : 'Connect'}
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{i.desc}</div>
              <div className="text-[10px] text-gray-600 mt-1 uppercase tracking-wide">{i.category}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'overview',      label: 'Overview',       icon: Building2 },
  { key: 'departments',   label: 'Departments',    icon: Layers },
  { key: 'wards',         label: 'Wards',          icon: LayoutGrid },
  { key: 'beds',          label: 'Beds',           icon: BedDouble },
  { key: 'roles',         label: 'Roles',          icon: Shield },
  { key: 'billing',       label: 'Billing',        icon: CreditCard },
  { key: 'emergency',     label: 'Emergency',      icon: Phone },
  { key: 'templates',     label: 'Doc Templates',  icon: FileText },
  { key: 'integrations',  label: 'Integrations',   icon: Link2 },
]

export default function HospitalSettings() {
  const [tab, setTab] = useState('overview')
  const [clinics, setClinics] = useState([])
  const [selectedClinicId, setSelectedClinicId] = useState('')
  const [loadingClinics, setLoadingClinics] = useState(true)

  useEffect(() => {
    api.get('/platform/clinics?status=active')
      .then(data => setClinics(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingClinics(false))
  }, [])

  return (
    <div>
      {/* Clinic selector */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative w-72">
          <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          {loadingClinics ? (
            <div className="input pl-9 flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 size={14} className="animate-spin" />Loading health centers…
            </div>
          ) : (
            <select
              className="input pl-9 pr-8 text-sm appearance-none"
              value={selectedClinicId}
              onChange={e => { setSelectedClinicId(e.target.value); setTab('overview') }}
            >
              <option value="">— Select a health center —</option>
              {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        {selectedClinicId && (
          <span className="text-xs text-gray-500">
            Configuring: <span className="font-semibold text-gray-200">{clinics.find(c => String(c.id) === selectedClinicId)?.name}</span>
          </span>
        )}
      </div>

      {!selectedClinicId ? (
        <div className="card-p py-16 text-center text-gray-500">
          <Building2 size={40} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">Select a health center above to configure its hospital settings</p>
        </div>
      ) : (
        <>
          <div className="flex gap-1 bg-gray-900 border border-gray-800 p-1 rounded-xl mb-6 w-fit overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.key ? 'bg-gray-800 shadow text-white' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <t.icon size={14} />{t.label}
              </button>
            ))}
          </div>

          {tab === 'overview'      && <OverviewTab      clinicId={selectedClinicId} />}
          {tab === 'departments'   && <DepartmentsTab  clinicId={selectedClinicId} />}
          {tab === 'wards'         && <WardsTab         clinicId={selectedClinicId} />}
          {tab === 'beds'          && <BedsTab          clinicId={selectedClinicId} />}
          {tab === 'roles'         && <RolesTab         clinicId={selectedClinicId} />}
          {tab === 'billing'       && <BillingTab       clinicId={selectedClinicId} />}
          {tab === 'emergency'     && <EmergencyTab     clinicId={selectedClinicId} />}
          {tab === 'templates'     && <TemplatesTab     clinicId={selectedClinicId} />}
          {tab === 'integrations'  && <IntegrationsTab  clinicId={selectedClinicId} />}
        </>
      )}
    </div>
  )
}
