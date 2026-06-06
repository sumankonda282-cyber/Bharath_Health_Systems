import { useEffect, useState, useCallback } from 'react'
import api from '../api/client'
import {
  Plus, Pencil, Trash2, Share2, X, CheckCircle,
  ChevronDown, ChevronUp, GripVertical, Loader2
} from 'lucide-react'

const FIELD_TYPES = [
  { value: 'text',     label: 'Text input' },
  { value: 'number',   label: 'Number' },
  { value: 'textarea', label: 'Text area' },
  { value: 'select',   label: 'Dropdown' },
  { value: 'radio',    label: 'Radio buttons' },
  { value: 'checkbox', label: 'Checkbox' },
]

const SPECIALTIES = [
  'General', 'Cardiology', 'Dermatology', 'Endocrinology', 'Gastroenterology',
  'Gynaecology', 'Haematology', 'Nephrology', 'Neurology', 'Oncology',
  'Ophthalmology', 'Orthopaedics', 'Paediatrics', 'Psychiatry', 'Pulmonology',
  'Rheumatology', 'Urology', 'ICU', 'Emergency', 'Dental', 'ENT',
]

function emptyField() {
  return { key: '', label: '', type: 'text', required: false, unit: '', options: '' }
}

// ── Field Builder Row ─────────────────────────────────────────────────────────
function FieldRow({ field, idx, onChange, onRemove }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <GripVertical size={14} className="text-gray-300 flex-shrink-0" />
        <span className="text-xs font-semibold text-gray-500 w-5">{idx + 1}</span>
        <input
          value={field.label}
          onChange={e => onChange(idx, 'label', e.target.value)}
          placeholder="Field label (e.g. Lesion Type)"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        <select
          value={field.type}
          onChange={e => onChange(idx, 'type', e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
          <input type="checkbox" checked={field.required} onChange={e => onChange(idx, 'required', e.target.checked)} />
          Req
        </label>
        <button onClick={() => onRemove(idx)} className="text-red-400 hover:text-red-600">
          <X size={15} />
        </button>
      </div>
      <div className="flex gap-2 pl-6">
        <input
          value={field.unit}
          onChange={e => onChange(idx, 'unit', e.target.value)}
          placeholder="Unit (optional, e.g. cm, kg)"
          className="w-40 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
        />
        {(field.type === 'select' || field.type === 'radio') && (
          <input
            value={field.options}
            onChange={e => onChange(idx, 'options', e.target.value)}
            placeholder="Options, comma-separated (e.g. Macule, Papule, Plaque)"
            className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
          />
        )}
      </div>
    </div>
  )
}

// ── Template Form Modal ───────────────────────────────────────────────────────
function TemplateModal({ template, onClose, onSaved }) {
  const isEdit = !!template?.id
  const [name, setName] = useState(template?.name || '')
  const [specialty, setSpecialty] = useState(template?.specialty || 'General')
  const [description, setDescription] = useState(template?.description || '')
  const [fields, setFields] = useState(
    template?.fields?.length
      ? template.fields.map(f => ({ ...f, options: Array.isArray(f.options) ? f.options.join(', ') : (f.options || '') }))
      : [emptyField()]
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const addField = () => setFields(f => [...f, emptyField()])
  const removeField = idx => setFields(f => f.filter((_, i) => i !== idx))
  const updateField = (idx, key, val) => setFields(f => f.map((fi, i) => i === idx ? { ...fi, [key]: val } : fi))

  const handleSave = async () => {
    if (!name.trim()) { setErr('Template name is required'); return }
    setErr('')
    setSaving(true)
    const payload = {
      name: name.trim(),
      specialty,
      description: description.trim(),
      fields: fields
        .filter(f => f.label.trim())
        .map(f => ({
          key: f.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
          label: f.label,
          type: f.type,
          required: f.required,
          unit: f.unit || null,
          options: (f.type === 'select' || f.type === 'radio')
            ? f.options.split(',').map(o => o.trim()).filter(Boolean)
            : [],
        })),
    }
    try {
      if (isEdit) {
        await api.put(`/platform/assessment-templates/${template.id}`, payload)
      } else {
        await api.post('/platform/assessment-templates', payload)
      }
      onSaved()
    } catch (e) {
      setErr(e.response?.data?.detail || e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-900">{isEdit ? 'Edit Template' : 'New Assessment Template'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Template Name *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Dermatology Skin Assessment"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Specialty *</label>
              <select value={specialty} onChange={e => setSpecialty(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {SPECIALTIES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              placeholder="Brief description of when to use this form"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600">Form Fields</label>
              <button onClick={addField}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                <Plus size={13} /> Add Field
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {fields.map((f, i) => (
                <FieldRow key={i} field={f} idx={i} onChange={updateField} onRemove={removeField} />
              ))}
            </div>
          </div>

          {err && <p className="text-red-600 text-xs">{err}</p>}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-50 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            {saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create Template')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Assign Modal ─────────────────────────────────────────────────────────────
function AssignModal({ template, clinics, onClose, onSaved }) {
  const [scope, setScope] = useState('all')         // all | selected
  const [selectedClinics, setSelectedClinics] = useState(
    template.assignments
      ?.filter(a => a.scope === 'clinic' || a.scope === 'department')
      .map(a => a.clinic_id)
      .filter(Boolean) || []
  )
  // department_id selection per clinic: {clinic_id: dept_id | null}
  const [deptMap, setDeptMap] = useState({})
  const [departments, setDepartments] = useState({}) // {clinic_id: [dept, ...]}
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  // Pre-fill scope
  useEffect(() => {
    const hasAll = template.assignments?.some(a => a.scope === 'all')
    setScope(hasAll ? 'all' : 'selected')
  }, [template])

  const toggleClinic = async (clinicId) => {
    setSelectedClinics(prev => {
      if (prev.includes(clinicId)) return prev.filter(id => id !== clinicId)
      return [...prev, clinicId]
    })
    // Load departments for this clinic if not yet loaded
    if (!departments[clinicId]) {
      try {
        const data = await api.get(`/platform/clinics/${clinicId}/departments`)
        setDepartments(prev => ({ ...prev, [clinicId]: Array.isArray(data) ? data : [] }))
      } catch {
        setDepartments(prev => ({ ...prev, [clinicId]: [] }))
      }
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setErr('')
    try {
      let assignments = []
      if (scope === 'all') {
        assignments = [{ scope: 'all' }]
      } else {
        assignments = selectedClinics.map(cid => {
          const deptId = deptMap[cid]
          if (deptId) return { scope: 'department', clinic_id: cid, department_id: deptId }
          return { scope: 'clinic', clinic_id: cid }
        })
      }
      await api.post(`/platform/assessment-templates/${template.id}/assign`, { assignments })
      onSaved()
    } catch (e) {
      setErr(e.response?.data?.detail || e.message || 'Failed to assign')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-bold text-gray-900">Assign Template</h2>
            <p className="text-xs text-gray-500 mt-0.5">{template.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Scope toggle */}
          <div className="flex gap-3">
            {[
              { value: 'all', label: 'All Clinics', desc: 'Visible to every registered clinic' },
              { value: 'selected', label: 'Select Clinics', desc: 'Choose specific clinics or departments' },
            ].map(opt => (
              <button key={opt.value} onClick={() => setScope(opt.value)}
                className={`flex-1 border-2 rounded-xl p-3 text-left transition-all ${
                  scope === opt.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}>
                <div className={`text-sm font-semibold ${scope === opt.value ? 'text-indigo-700' : 'text-gray-700'}`}>{opt.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>

          {/* Clinic multi-select */}
          {scope === 'selected' && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">
                Select Clinics ({selectedClinics.length} selected)
              </p>
              <div className="border border-gray-200 rounded-xl divide-y max-h-64 overflow-y-auto">
                {clinics.length === 0 && (
                  <div className="p-4 text-sm text-gray-400 text-center">No clinics found</div>
                )}
                {clinics.map(clinic => {
                  const checked = selectedClinics.includes(clinic.id)
                  const depts = departments[clinic.id] || []
                  return (
                    <div key={clinic.id}>
                      <label className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50">
                        <input type="checkbox" checked={checked}
                          onChange={() => toggleClinic(clinic.id)}
                          className="w-4 h-4 accent-indigo-600" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">{clinic.name}</div>
                          <div className="text-xs text-gray-400">{clinic.city}{clinic.state ? `, ${clinic.state}` : ''}</div>
                        </div>
                      </label>
                      {/* Department sub-select */}
                      {checked && (
                        <div className="px-10 pb-3">
                          <select
                            value={deptMap[clinic.id] || ''}
                            onChange={e => setDeptMap(prev => ({ ...prev, [clinic.id]: e.target.value ? parseInt(e.target.value) : null }))}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-300"
                          >
                            <option value="">All departments</option>
                            {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {err && <p className="text-red-600 text-xs">{err}</p>}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-50 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
            {saving ? 'Saving…' : 'Save Assignments'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Assignment Summary Badge ──────────────────────────────────────────────────
function AssignmentBadge({ assignments }) {
  if (!assignments?.length) return <span className="text-xs text-gray-400">Unassigned</span>
  const hasAll = assignments.some(a => a.scope === 'all')
  if (hasAll) return (
    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">All clinics</span>
  )
  const clinicNames = [...new Set(assignments.map(a => a.clinic_name).filter(Boolean))]
  return (
    <div className="flex flex-wrap gap-1">
      {clinicNames.slice(0, 3).map(n => (
        <span key={n} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{n}</span>
      ))}
      {clinicNames.length > 3 && (
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">+{clinicNames.length - 3} more</span>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AssessmentTemplates() {
  const [templates, setTemplates] = useState([])
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterSpecialty, setFilterSpecialty] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [assignTarget, setAssignTarget] = useState(null)
  const [err, setErr] = useState('')

  const fetchTemplates = useCallback(() => {
    setLoading(true)
    api.get('/platform/assessment-templates')
      .then(data => setTemplates(Array.isArray(data) ? data : []))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchTemplates()
    api.get('/platform/clinics')
      .then(data => setClinics(Array.isArray(data) ? data : (data.clinics || [])))
      .catch(() => {})
  }, [fetchTemplates])

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this template? It will be hidden from all clinics.')) return
    await api.delete(`/platform/assessment-templates/${id}`)
    fetchTemplates()
  }

  const specialties = ['all', ...new Set(templates.map(t => t.specialty))]
  const filtered = filterSpecialty === 'all' ? templates : templates.filter(t => t.specialty === filterSpecialty)
  const active = filtered.filter(t => t.is_active)
  const inactive = filtered.filter(t => !t.is_active)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assessment Templates</h1>
          <p className="text-gray-500 text-sm mt-1">Build clinical assessment forms and assign them to clinics or departments</p>
        </div>
        <button onClick={() => { setEditTarget(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm">
          <Plus size={16} /> New Template
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Templates', value: templates.length },
          { label: 'Active', value: templates.filter(t => t.is_active).length },
          { label: 'Assigned to All', value: templates.filter(t => t.assignments?.some(a => a.scope === 'all')).length },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Specialty filter */}
      <div className="flex gap-2 flex-wrap mb-4">
        {specialties.map(s => (
          <button key={s} onClick={() => setFilterSpecialty(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              filterSpecialty === s ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>
            {s === 'all' ? 'All Specialties' : s}
          </button>
        ))}
      </div>

      {err && <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{err}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* Active templates */}
          <div className="space-y-3">
            {active.length === 0 && (
              <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl text-gray-400">
                <div className="text-4xl mb-3">📋</div>
                <p className="font-medium">No templates yet</p>
                <p className="text-sm mt-1">Click "New Template" to create the first one</p>
              </div>
            )}
            {active.map(t => (
              <div key={t.id} className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{t.name}</h3>
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                        {t.specialty}
                      </span>
                      <span className="text-xs text-gray-400">{t.fields?.length || 0} fields</span>
                    </div>
                    {t.description && <p className="text-sm text-gray-500 mb-2">{t.description}</p>}
                    <AssignmentBadge assignments={t.assignments} />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setAssignTarget(t)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                      <Share2 size={13} /> Assign
                    </button>
                    <button onClick={() => { setEditTarget(t); setShowForm(true) }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => handleDeactivate(t.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Inactive */}
          {inactive.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Deactivated</p>
              <div className="space-y-2 opacity-60">
                {inactive.map(t => (
                  <div key={t.id} className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-600 font-medium">{t.name}</span>
                      <span className="ml-2 text-xs text-gray-400">{t.specialty}</span>
                    </div>
                    <button onClick={async () => {
                      await api.put(`/platform/assessment-templates/${t.id}`, { is_active: true })
                      fetchTemplates()
                    }} className="text-xs text-indigo-600 hover:underline">Restore</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showForm && (
        <TemplateModal
          template={editTarget}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
          onSaved={() => { setShowForm(false); setEditTarget(null); fetchTemplates() }}
        />
      )}
      {assignTarget && (
        <AssignModal
          template={assignTarget}
          clinics={clinics}
          onClose={() => setAssignTarget(null)}
          onSaved={() => { setAssignTarget(null); fetchTemplates() }}
        />
      )}
    </div>
  )
}
