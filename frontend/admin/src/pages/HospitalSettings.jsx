import { useState, useEffect, useCallback, useRef } from 'react'
import { adminApi } from '../api'
import axios from 'axios'
import {
  Building2, Layers, BedDouble, LayoutGrid,
  Plus, Edit2, Trash2, Loader2, X, Check, ChevronDown, Copy, CheckCheck, Search,
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'https://bharatcliniq-api.onrender.com'

const ORG_TYPE_CONFIG = {
  clinic:     { label: 'Clinic',              icon: '🏥', desc: 'Outpatient only' },
  hospital:   { label: 'Hospital',            icon: '🏨', desc: 'Inpatient + Outpatient' },
  pharmacy:   { label: 'Standalone Pharmacy', icon: '💊', desc: 'Drug dispensary' },
  diagnostic: { label: 'Diagnostic Centre',   icon: '🔬', desc: 'Lab / Radiology' },
}

const SPECIALTIES = [
  'General Medicine', 'Multi-Specialty', 'Cardiology', 'Orthopaedics',
  'Gynaecology & Obstetrics', 'Paediatrics', 'Neurology', 'Oncology',
  'Ophthalmology', 'ENT', 'Dermatology', 'Psychiatry', 'Dental',
  'Urology', 'Nephrology', 'Gastroenterology', 'Endocrinology',
  'Pulmonology', 'Rheumatology', 'Diagnostic Centre', 'Pharmacy', 'Other',
]

// ── Parent clinic autocomplete (used inside CreateModal) ─────────────────────
function ParentClinicSearch({ value, onChange }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const timer = useRef(null)

  const search = (term) => {
    clearTimeout(timer.current)
    if (!term.trim()) { setResults([]); setOpen(false); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await axios.get(`${API_BASE}/api/v1/public/clinics/search`, { params: { q: term } })
        setResults(res.data || [])
        setOpen(true)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 300)
  }

  const pick = (clinic) => {
    onChange(clinic)
    setQ(clinic.name)
    setOpen(false)
  }

  const clear = () => { onChange(null); setQ(''); setResults([]); setOpen(false) }

  return (
    <div className="relative">
      <label className="label">Associated Hospital / Clinic (optional)</label>
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          className="input pl-8 pr-8"
          placeholder="Search by name…"
          value={q}
          onChange={e => { setQ(e.target.value); search(e.target.value); onChange(null) }}
          onFocus={() => q && setOpen(true)}
        />
        {loading && <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
        {value && !loading && (
          <button type="button" onClick={clear} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={12} />
          </button>
        )}
      </div>
      {value && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-green-700 font-medium">
          <Check size={12} className="text-green-600" />{value.name}{value.city ? ` · ${value.city}` : ''}
        </div>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {results.map(c => (
            <li key={c.id}>
              <button
                type="button"
                onMouseDown={() => pick(c)}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 text-sm"
              >
                <span className="font-medium">{c.name}</span>
                {c.city && <span className="text-gray-400 text-xs ml-1">· {c.city}</span>}
                <span className="ml-2 text-xs text-gray-400 capitalize">{c.org_type || 'clinic'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Create New Organisation Modal ─────────────────────────────────────────────
function CreateHospitalModal({ onClose, onCreated }) {
  const EMPTY = {
    org_type: 'hospital', name: '', phone: '', email: '',
    city: '', state: '', specialty: '', plan: 'free',
    drug_license_number: '', nabl_accredited: false, nabl_number: '',
    parent_clinic_id: null,
  }
  const [form, setForm] = useState(EMPTY)
  const [parentClinic, setParentClinic] = useState(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState({})

  const f = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))

  const copyText = (key, val) => {
    navigator.clipboard.writeText(val).then(() => {
      setCopied(p => ({ ...p, [key]: true }))
      setTimeout(() => setCopied(p => ({ ...p, [key]: false })), 2000)
    })
  }

  const orgCfg = ORG_TYPE_CONFIG[form.org_type] || ORG_TYPE_CONFIG.hospital
  const isPharmacy   = form.org_type === 'pharmacy'
  const isDiagnostic = form.org_type === 'diagnostic'

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setErr('')
    try {
      const payload = {
        ...form,
        parent_clinic_id: parentClinic?.id || null,
      }
      const data = await adminApi.createClinicDirect(payload)
      setResult(data)
    } catch (ex) { setErr(ex.message || 'Failed to create organisation') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-bold" style={{ color: '#0F2557' }}>
            {result
              ? `${orgCfg.label} Registered`
              : `Register New ${orgCfg.label}`}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        {result ? (
          /* ── Success state ── */
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 text-green-700 text-sm font-medium">
              <Check size={16} />{result.clinic.name} has been registered and activated.
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                Admin Login Credentials — share securely
              </p>
              {[
                { label: 'Portal Login URL', key: 'url', val: 'https://staff.bharathhealthsystems.com' },
                { label: 'Username',        key: 'uname', val: result.credentials.username },
                { label: 'Email',           key: 'email', val: result.credentials.email },
                { label: 'Temp Password',   key: 'pw',    val: result.credentials.temp_password },
              ].map(({ label, key, val }) => (
                <div key={key} className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-amber-600">{label}</div>
                    <div className="text-sm font-mono font-semibold text-gray-800">{val}</div>
                  </div>
                  <button
                    onClick={() => copyText(key, val)}
                    className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-600 shrink-0"
                    title="Copy"
                  >
                    {copied[key] ? <CheckCheck size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              ))}
              <p className="text-xs text-amber-600 mt-1">{result.credentials.note}</p>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="btn-secondary flex-1">Close</button>
              <button
                onClick={() => { onCreated(result.clinic); onClose() }}
                className="btn-primary flex-1 justify-center"
              >
                Configure Settings
              </button>
            </div>
          </div>
        ) : (
          /* ── Form state ── */
          <form onSubmit={submit} className="p-6 space-y-4">
            {/* Org type selector */}
            <div>
              <label className="label">Organisation Type *</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {Object.entries(ORG_TYPE_CONFIG).map(([type, cfg]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, org_type: type }))}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${form.org_type === type ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span>{cfg.icon}</span>
                    <div>
                      <div className="font-semibold text-xs">{cfg.label}</div>
                      <div className="text-xs opacity-60">{cfg.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">{orgCfg.label} Name *</label>
                <input className="input" value={form.name} onChange={f('name')} required placeholder={`e.g. ${form.org_type === 'pharmacy' ? 'MedPlus Pharmacy' : form.org_type === 'diagnostic' ? 'Apollo Diagnostics' : 'City Heart Hospital'}`} />
              </div>
              <div>
                <label className="label">Phone *</label>
                <input className="input" value={form.phone} onChange={f('phone')} required placeholder="+91 98765 43210" />
              </div>
              <div>
                <label className="label">Email *</label>
                <input className="input" type="email" value={form.email} onChange={f('email')} required placeholder="admin@org.com" />
              </div>
              <div>
                <label className="label">City</label>
                <input className="input" value={form.city} onChange={f('city')} placeholder="Hyderabad" />
              </div>
              <div>
                <label className="label">State</label>
                <input className="input" value={form.state} onChange={f('state')} placeholder="Telangana" />
              </div>

              {/* Pharmacy-specific */}
              {isPharmacy && (
                <div className="col-span-2">
                  <label className="label">Drug License Number</label>
                  <input className="input" value={form.drug_license_number} onChange={f('drug_license_number')} placeholder="e.g. DL-TS-2024-001234" />
                </div>
              )}

              {/* Diagnostic-specific */}
              {isDiagnostic && (
                <>
                  <div className="col-span-2">
                    <label className="label">NABL Number (if accredited)</label>
                    <input className="input" value={form.nabl_number} onChange={f('nabl_number')} placeholder="e.g. TC-4567" />
                  </div>
                  <div className="col-span-2 flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="nabl_acc"
                      checked={form.nabl_accredited}
                      onChange={e => setForm(p => ({ ...p, nabl_accredited: e.target.checked }))}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <label htmlFor="nabl_acc" className="text-sm text-gray-700 cursor-pointer">NABL Accredited</label>
                  </div>
                </>
              )}

              {/* Specialty (not needed for pharmacy/diagnostic standalone) */}
              {!isPharmacy && !isDiagnostic && (
                <div className="col-span-2">
                  <label className="label">Specialty</label>
                  <select className="input" value={form.specialty} onChange={f('specialty')}>
                    <option value="">— Select specialty —</option>
                    {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              <div className="col-span-2">
                <label className="label">Subscription Plan</label>
                <select className="input" value={form.plan} onChange={f('plan')}>
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>

            {/* Parent association for pharmacy/diagnostic */}
            {(isPharmacy || isDiagnostic) && (
              <ParentClinicSearch
                value={parentClinic}
                onChange={setParentClinic}
              />
            )}

            {err && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                {saving
                  ? <><Loader2 size={14} className="animate-spin" />Creating…</>
                  : <><Plus size={14} />Create {orgCfg.label}</>
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

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
  vacant: 'bg-green-100 text-green-700 border-green-200',
  occupied: 'bg-red-100 text-red-700 border-red-200',
  pending_cleaning: 'bg-orange-100 text-orange-700 border-orange-200',
  maintenance: 'bg-gray-100 text-gray-600 border-gray-200',
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
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
      aria-label={label}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ clinicId }) {
  const [config, setConfig] = useState({ org_type: 'clinic', clinic_prefix: '', wards_enabled: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    setLoading(true)
    adminApi.getOrgConfig(clinicId)
      .then(r => setConfig(r || { org_type: 'clinic', clinic_prefix: '', wards_enabled: false }))
      .catch(() => setErr('Could not load config'))
      .finally(() => setLoading(false))
  }, [clinicId])

  const save = async () => {
    setSaving(true); setMsg(''); setErr('')
    try {
      await adminApi.updateOrgConfig(clinicId, config)
      setMsg('Saved successfully')
      setTimeout(() => setMsg(''), 3000)
    } catch (e) { setErr(e.message || 'Save failed') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-gray-400" /></div>

  return (
    <div className="max-w-lg space-y-5">
      {err && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{err}</div>}
      {msg && <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">{msg}</div>}

      <div className="card p-5 space-y-5">
        <div>
          <label className="label">Organisation Type</label>
          <div className="flex gap-2 mt-1">
            {['clinic', 'hospital'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setConfig(c => ({ ...c, org_type: type }))}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all capitalize ${config.org_type === type ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {type === 'clinic' ? 'Clinic (Outpatient)' : 'Hospital (Inpatient + Outpatient)'}
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
          <p className="text-xs text-gray-400 mt-1">Used as prefix for patient IDs (e.g. BHC-0001)</p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-gray-700">Wards & Bed Management</div>
            <div className="text-xs text-gray-400 mt-0.5">Enable ward/bed tracking for inpatient admissions</div>
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

// ── Departments Tab ───────────────────────────────────────────────────────────
function DeptModal({ dept, clinicId, onClose, onSaved }) {
  const [form, setForm] = useState(dept || { name: '', code: '', dept_type: 'clinical', color_hex: '#0F2557', is_active: true })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async e => {
    e.preventDefault(); setSaving(true); setErr('')
    try {
      if (dept?.id) {
        await adminApi.updateDepartment(clinicId, dept.id, form)
      } else {
        await adminApi.createDepartment(clinicId, form)
      }
      onSaved()
    } catch (ex) { setErr(ex.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: '#0F2557' }}>{dept?.id ? 'Edit Department' : 'Add Department'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={16} /></button>
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
              <span className="text-sm text-gray-600">Active</span>
            </div>
          </div>
          {err && <p className="text-red-600 text-sm">{err}</p>}
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
    adminApi.listDepartments(clinicId)
      .then(r => setDepts(Array.isArray(r) ? r : []))
      .catch(() => setErr('Could not load departments'))
      .finally(() => setLoading(false))
  }, [clinicId])

  useEffect(() => { load() }, [load])

  const remove = async id => {
    if (!window.confirm('Delete this department?')) return
    try { await adminApi.deleteDepartment(clinicId, id); load() }
    catch (e) { alert(e.message || 'Delete failed') }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-700">Departments</h2>
        <button onClick={() => setModal('new')} className="btn-primary"><Plus size={14} />Add Department</button>
      </div>
      {err && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">{err}</div>}
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
            <tbody className="divide-y divide-gray-100">
              {depts.length === 0 ? (
                <tr><td colSpan={5} className="td text-center text-gray-400 py-8">No departments yet</td></tr>
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
                      <button onClick={() => setModal(d)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Edit2 size={14} /></button>
                      <button onClick={() => remove(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
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

// ── Wards Tab ─────────────────────────────────────────────────────────────────
function WardModal({ ward, departments, clinicId, onClose, onSaved }) {
  const [form, setForm] = useState(ward || { name: '', floor: '', wing: '', ward_type: 'general', total_beds: '', department_id: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async e => {
    e.preventDefault(); setSaving(true); setErr('')
    try {
      const payload = { ...form, total_beds: parseInt(form.total_beds) || 0, department_id: form.department_id ? parseInt(form.department_id) : null }
      if (ward?.id) {
        await adminApi.updateWard(clinicId, ward.id, payload)
      } else {
        await adminApi.createWard(clinicId, payload)
      }
      onSaved()
    } catch (ex) { setErr(ex.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: '#0F2557' }}>{ward?.id ? 'Edit Ward' : 'Add Ward'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={16} /></button>
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
          {err && <p className="text-red-600 text-sm">{err}</p>}
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
      adminApi.listWards(clinicId).then(r => setWards(Array.isArray(r) ? r : [])),
      adminApi.listDepartments(clinicId).then(r => setDepartments(Array.isArray(r) ? r : [])),
    ]).catch(() => setErr('Could not load data'))
      .finally(() => setLoading(false))
  }, [clinicId])

  useEffect(() => { load() }, [load])

  const remove = async id => {
    if (!window.confirm('Delete this ward?')) return
    try { await adminApi.deleteWard(clinicId, id); load() }
    catch (e) { alert(e.message || 'Delete failed') }
  }

  const filtered = filterDept ? wards.filter(w => String(w.department_id) === filterDept) : wards

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-700">Wards</h2>
          <select className="input text-sm py-1.5 w-48" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary"><Plus size={14} />Add Ward</button>
      </div>
      {err && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">{err}</div>}
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
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="td text-center text-gray-400 py-8">No wards found</td></tr>
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
                        <button onClick={() => setModal(w)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500"><Edit2 size={14} /></button>
                        <button onClick={() => remove(w.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
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

// ── Beds Tab ──────────────────────────────────────────────────────────────────
function BedModal({ wards, clinicId, onClose, onSaved }) {
  const [form, setForm] = useState({ bed_number: '', bed_type: 'general', ward_id: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const submit = async e => {
    e.preventDefault(); setSaving(true); setErr('')
    try {
      await adminApi.createBed(clinicId, { ...form, ward_id: parseInt(form.ward_id) })
      onSaved()
    } catch (ex) { setErr(ex.message || 'Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: '#0F2557' }}>Add Bed</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={16} /></button>
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
          {err && <p className="text-red-600 text-sm">{err}</p>}
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
      adminApi.listBeds(clinicId).then(r => setBeds(Array.isArray(r) ? r : [])),
      adminApi.listWards(clinicId).then(r => setWards(Array.isArray(r) ? r : [])),
    ]).catch(() => setErr('Could not load data'))
      .finally(() => setLoading(false))
  }, [clinicId])

  useEffect(() => { load() }, [load])

  const updateStatus = async (id, status) => {
    try { await adminApi.updateBed(clinicId, id, { status }); load() }
    catch (e) { alert(e.message || 'Update failed') }
  }

  const filtered = filterWard ? beds.filter(b => String(b.ward_id) === filterWard) : beds

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-700">Beds</h2>
          <select className="input text-sm py-1.5 w-40" value={filterWard} onChange={e => setFilterWard(e.target.value)}>
            <option value="">All Wards</option>
            {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={14} />Add Bed</button>
      </div>
      {err && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">{err}</div>}
      {loading ? <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-gray-400" /></div> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.length === 0 ? (
            <div className="col-span-full py-16 text-center text-gray-400"><BedDouble size={32} className="mx-auto mb-2 opacity-30" /><p>No beds found</p></div>
          ) : filtered.map(b => {
            const ward = wards.find(w => w.id === b.ward_id)
            return (
              <div key={b.id} className={`rounded-xl border p-3 ${BED_STATUS_STYLE[b.status] || 'bg-gray-50 border-gray-200'}`}>
                <div className="font-bold text-base mb-0.5">{b.bed_number}</div>
                <div className="text-xs uppercase font-medium mb-1 opacity-70">{b.bed_type}</div>
                <div className="text-xs opacity-60 mb-2 truncate">{ward?.name || '—'}</div>
                <div className="text-xs font-medium">{BED_STATUS_LABELS[b.status] || b.status}</div>
                {(b.status === 'maintenance' || b.status === 'pending_cleaning') && (
                  <button
                    onClick={() => updateStatus(b.id, 'vacant')}
                    className="mt-2 w-full text-xs py-1 px-2 rounded-lg bg-white/60 hover:bg-white border border-current font-medium transition-colors"
                  >
                    Mark Vacant
                  </button>
                )}
                {b.status === 'vacant' && (
                  <button
                    onClick={() => updateStatus(b.id, 'maintenance')}
                    className="mt-2 w-full text-xs py-1 px-2 rounded-lg bg-white/60 hover:bg-white border border-current font-medium transition-colors"
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

// ── Main Page ─────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'overview',    label: 'Overview',     icon: Building2 },
  { key: 'departments', label: 'Departments',  icon: Layers },
  { key: 'wards',       label: 'Wards',        icon: LayoutGrid },
  { key: 'beds',        label: 'Beds',         icon: BedDouble },
]

export default function HospitalSettings() {
  const [tab, setTab] = useState('overview')
  const [clinics, setClinics] = useState([])
  const [clinicId, setClinicId] = useState(null)
  const [loadingClinics, setLoadingClinics] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    adminApi.getClinics({ limit: 200, status: 'active' })
      .then(r => {
        const list = Array.isArray(r) ? r : []
        setClinics(list)
        if (list.length === 1) setClinicId(list[0].id)
      })
      .catch(() => {})
      .finally(() => setLoadingClinics(false))
  }, [])

  const handleCreated = (clinic) => {
    setClinics(prev => [clinic, ...prev])
    setClinicId(clinic.id)
    setTab('overview')
  }

  const selectedClinic = clinics.find(c => c.id === clinicId)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Organisation Setup</h1>
      </div>

      {/* Clinic selector */}
      <div className="card p-4 mb-6 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-600 shrink-0">Configure:</label>
        {loadingClinics ? (
          <Loader2 size={16} className="animate-spin text-gray-400" />
        ) : (
          <div className="relative">
            <select
              className="input pr-8 max-w-xs appearance-none cursor-pointer"
              value={clinicId || ''}
              onChange={e => { setClinicId(Number(e.target.value) || null); setTab('overview') }}
            >
              <option value="">— Select organisation —</option>
              {clinics.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.city ? ` · ${c.city}` : ''}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}
        {selectedClinic && (
          <span className="text-xs text-gray-400 truncate">{selectedClinic.specialty || ''}</span>
        )}
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary ml-auto"
        >
          <Plus size={14} />Register New
        </button>
      </div>

      {!clinicId ? (
        <div className="text-center py-20 text-gray-400">
          <Building2 size={36} className="mx-auto mb-3 opacity-25" />
          <p className="text-sm">Select an organisation above to configure its settings, or register a new one.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${tab === t.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <t.icon size={14} />{t.label}
              </button>
            ))}
          </div>

          {tab === 'overview'    && <OverviewTab    clinicId={clinicId} />}
          {tab === 'departments' && <DepartmentsTab clinicId={clinicId} />}
          {tab === 'wards'       && <WardsTab       clinicId={clinicId} />}
          {tab === 'beds'        && <BedsTab        clinicId={clinicId} />}
        </>
      )}

      {showCreate && (
        <CreateHospitalModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
