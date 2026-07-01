import { useState, useEffect, useCallback } from 'react'
import { X, Plus, Save, Loader2, Check, Package, Eye, EyeOff } from 'lucide-react'
import { adminApi } from '../api'

const BLANK = {
  key: '', name: '', description: '', color: '#3B82F6',
  is_public: true, is_active: true, sort_order: 0,
  monthly_price: 0, annual_price: 0, monthly_price_per_seat: 0, annual_price_per_seat: 0,
  modules: {}, limits: { max_doctors: 0, max_staff: 0, max_branches: 0 },
}

const LIMIT_FIELDS = [
  { key: 'max_doctors', label: 'Max doctors' },
  { key: 'max_staff', label: 'Max staff' },
  { key: 'max_branches', label: 'Max branches' },
]

const inp = 'w-full px-3 py-2 text-sm surface-2 border border-app rounded-lg text-app focus:outline-none focus:ring-2 focus:ring-blue-500/40'
const lbl = 'block text-xs font-medium text-dim mb-1'

export default function PlanBuilder({ onClose, addToast }) {
  const [plans, setPlans] = useState([])
  const [moduleCatalog, setModuleCatalog] = useState({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)   // plan object or {__new:true}
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminApi.getPlans()
      setPlans(data?.plans || [])
      setModuleCatalog(data?.modules || {})
    } catch (e) {
      addToast?.(e?.message || 'Failed to load plans', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { load() }, [load])

  const moduleKeys = Object.keys(moduleCatalog)

  const openNew = () => {
    const mods = {}
    moduleKeys.forEach(k => { mods[k] = false })
    setForm({ ...BLANK, modules: mods, sort_order: (plans.length + 1) })
    setEditing({ __new: true })
    setErr('')
  }

  const openEdit = (p) => {
    const mods = {}
    moduleKeys.forEach(k => { mods[k] = !!(p.modules || {})[k] })
    setForm({
      ...BLANK, ...p,
      modules: mods,
      limits: { max_doctors: 0, max_staff: 0, max_branches: 0, ...(p.limits || {}) },
      features: (p.features || []).join(', '),
    })
    setEditing(p)
    setErr('')
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setLimit = (k, v) => setForm(f => ({ ...f, limits: { ...f.limits, [k]: Number(v) || 0 } }))
  const toggleModule = (k) => setForm(f => ({ ...f, modules: { ...f.modules, [k]: !f.modules[k] } }))

  const save = async () => {
    if (!editing?.__new && !editing?.id) return
    if (editing.__new && !form.key.trim()) { setErr('A short key is required (e.g. provider, clinic, hospital)'); return }
    if (!form.name.trim()) { setErr('Plan name is required'); return }
    setSaving(true); setErr('')
    const body = {
      key: form.key.trim().toLowerCase(),
      name: form.name.trim(),
      description: form.description,
      color: form.color,
      is_public: form.is_public,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
      monthly_price: Number(form.monthly_price) || 0,
      annual_price: Number(form.annual_price) || 0,
      monthly_price_per_seat: Number(form.monthly_price_per_seat) || 0,
      annual_price_per_seat: Number(form.annual_price_per_seat) || 0,
      modules: form.modules,
      limits: form.limits,
      features: typeof form.features === 'string'
        ? form.features.split(',').map(s => s.trim()).filter(Boolean)
        : (form.features || []),
    }
    try {
      if (editing.__new) await adminApi.createPlan(body)
      else await adminApi.updatePlan(editing.id, body)
      addToast?.(`Plan "${body.name}" saved`)
      setEditing(null)
      load()
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4">
      <div className="surface border border-app rounded-2xl shadow-2xl w-full max-w-4xl h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-app flex-shrink-0">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-blue-400" />
            <h2 className="text-sm font-bold text-app">Plan Builder</h2>
            <span className="text-xs text-faint">— compose à-la-carte plans</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:surface-2 text-dim"><X size={18} /></button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* List */}
          <div className="w-60 border-r border-app flex flex-col flex-shrink-0">
            <button onClick={openNew} className="m-3 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-app text-sm font-semibold">
              <Plus size={14} /> New plan
            </button>
            <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-faint" /></div>
              ) : plans.length === 0 ? (
                <p className="text-xs text-faint text-center py-8">No plans yet</p>
              ) : plans.map(p => (
                <button key={p.id} onClick={() => openEdit(p)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${editing?.id === p.id ? 'surface-2' : 'hover:surface-2'}`}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color || '#64748b' }} />
                    <span className="text-sm text-app font-medium truncate">{p.name}</span>
                    {!p.is_active && <span className="text-[10px] text-faint">off</span>}
                  </div>
                  <div className="text-[11px] text-faint ml-4">{p.key}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-y-auto p-5">
            {!editing ? (
              <div className="h-full flex flex-col items-center justify-center text-faint text-sm gap-2">
                <Package size={28} className="opacity-30" />
                Select a plan to edit, or create a new one.
              </div>
            ) : (
              <div className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={lbl}>Key</label>
                    <input className={inp + (editing.__new ? '' : ' opacity-60')} value={form.key}
                      onChange={e => set('key', e.target.value)} disabled={!editing.__new} placeholder="provider" />
                  </div>
                  <div className="col-span-2">
                    <label className={lbl}>Name</label>
                    <input className={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Provider Solo" />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Description</label>
                  <input className={inp} value={form.description || ''} onChange={e => set('description', e.target.value)} />
                </div>

                {/* Modules */}
                <div>
                  <label className={lbl}>Apps unlocked by this plan</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {moduleKeys.map(k => {
                      const on = !!form.modules[k]
                      return (
                        <button key={k} type="button" onClick={() => toggleModule(k)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${on ? 'bg-emerald-900/30 border-emerald-700 text-emerald-200' : 'surface-2 border-app text-dim'}`}>
                          <span className={`w-4 h-4 rounded flex items-center justify-center ${on ? 'bg-emerald-500' : 'surface-3'}`}>{on && <Check size={11} className="text-app" />}</span>
                          {moduleCatalog[k]?.label || k}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Limits */}
                <div>
                  <label className={lbl}>Limits <span className="text-faint">(0 or 999 = unlimited)</span></label>
                  <div className="grid grid-cols-3 gap-3">
                    {LIMIT_FIELDS.map(f => (
                      <div key={f.key}>
                        <span className="text-[11px] text-faint">{f.label}</span>
                        <input type="number" className={inp} value={form.limits[f.key] ?? 0} onChange={e => setLimit(f.key, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing */}
                <div>
                  <label className={lbl}>Pricing (₹)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div><span className="text-[11px] text-faint">Monthly (flat)</span><input type="number" className={inp} value={form.monthly_price} onChange={e => set('monthly_price', e.target.value)} /></div>
                    <div><span className="text-[11px] text-faint">Annual (flat)</span><input type="number" className={inp} value={form.annual_price} onChange={e => set('annual_price', e.target.value)} /></div>
                    <div><span className="text-[11px] text-faint">Monthly / seat</span><input type="number" className={inp} value={form.monthly_price_per_seat} onChange={e => set('monthly_price_per_seat', e.target.value)} /></div>
                    <div><span className="text-[11px] text-faint">Annual / seat</span><input type="number" className={inp} value={form.annual_price_per_seat} onChange={e => set('annual_price_per_seat', e.target.value)} /></div>
                  </div>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-3 gap-3 items-end">
                  <div>
                    <label className={lbl}>Color</label>
                    <input type="color" className="w-full h-9 surface-2 border border-app rounded-lg" value={form.color || '#3B82F6'} onChange={e => set('color', e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>Sort order</label>
                    <input type="number" className={inp} value={form.sort_order} onChange={e => set('sort_order', e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => set('is_public', !form.is_public)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium border ${form.is_public ? 'bg-blue-900/30 border-blue-700 text-blue-300' : 'surface-2 border-app text-dim'}`}>
                      {form.is_public ? <Eye size={13} /> : <EyeOff size={13} />} {form.is_public ? 'Public' : 'Private'}
                    </button>
                    <button type="button" onClick={() => set('is_active', !form.is_active)}
                      className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium border ${form.is_active ? 'bg-emerald-900/30 border-emerald-700 text-emerald-300' : 'surface-2 border-app text-dim'}`}>
                      {form.is_active ? 'Active' : 'Archived'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={lbl}>Highlights (comma separated)</label>
                  <input className={inp} value={typeof form.features === 'string' ? form.features : (form.features || []).join(', ')} onChange={e => set('features', e.target.value)} placeholder="OPD, Reports, Telehealth" />
                </div>

                {err && <p className="text-sm text-rose-400">{err}</p>}

                <div className="flex gap-3 pt-1">
                  <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border border-app text-sm text-dim hover:surface-2">Cancel</button>
                  <button onClick={save} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-app text-sm font-semibold disabled:opacity-50">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {editing.__new ? 'Create plan' : 'Save changes'}
                  </button>
                </div>
                <p className="text-[11px] text-faint">Editing a plan never re-prices existing subscribers — they keep their agreed terms until renewal (grandfathered).</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
