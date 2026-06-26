import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { FileText, Plus, Edit2, Trash2, Loader2, AlertCircle, X, Save } from 'lucide-react'

const MODALITIES = ['CR','DX','CT','MR','MRI','US','NM','PT','MG','RF','XA','OT']
const MODALITY_LABELS = {
  CR:'X-Ray', DX:'X-Ray (Digital)', CT:'CT Scan', MR:'MRI', MRI:'MRI',
  US:'Ultrasound', NM:'Nuclear Medicine', PT:'PET Scan', MG:'Mammography',
  RF:'Fluoroscopy', XA:'Angiography', OT:'Other',
}

const EMPTY = { modality:'CT', name:'', body_part:'', findings_template:'', impression_template:'', is_active:true }

function TemplateModal({ template, onClose, onSaved }) {
  const [form, setForm] = useState(template ? { ...template } : { ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function save() {
    if (!form.name.trim()) { setError('Template name required'); return }
    setSaving(true); setError('')
    try {
      if (template?.id) {
        await api.put(`/imaging/templates/${template.id}`, form)
      } else {
        await api.post('/imaging/templates', form)
      }
      onSaved()
    } catch(e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box max-w-2xl w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">{template?.id ? 'Edit Template' : 'New Template'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={18}/></button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex gap-2"><AlertCircle size={15}/>{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Modality</label>
            <select className="input" value={form.modality} onChange={set('modality')}>
              {MODALITIES.map(m => <option key={m} value={m}>{MODALITY_LABELS[m] || m} ({m})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Template Name *</label>
            <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Chest CT Normal"/>
          </div>
          <div>
            <label className="label">Body Part</label>
            <input className="input" value={form.body_part||''} onChange={set('body_part')} placeholder="e.g. Chest, Abdomen"/>
          </div>
          <div className="flex items-center gap-3 pt-5">
            <input type="checkbox" id="active" checked={!!form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-blue-700"/>
            <label htmlFor="active" className="text-sm font-medium text-gray-700">Active</label>
          </div>
        </div>
        <div className="mt-4">
          <label className="label">Findings Template</label>
          <textarea className="input h-32 resize-none font-mono text-sm"
            value={form.findings_template||''} onChange={set('findings_template')}
            placeholder="Normal findings template text..."/>
        </div>
        <div className="mt-4">
          <label className="label">Impression Template</label>
          <textarea className="input h-24 resize-none font-mono text-sm"
            value={form.impression_template||''} onChange={set('impression_template')}
            placeholder="Normal impression text..."/>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary gap-2">
            {saving ? <Loader2 size={15} className="animate-spin"/> : <Save size={15}/>}
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Templates() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null) // null | 'new' | template obj
  const [deleting, setDeleting] = useState(null)
  const [filterMod, setFilterMod] = useState('all')

  const load = useCallback(() => {
    setLoading(true); setError('')
    api.get('/imaging/templates').then(r => {
      setTemplates(Array.isArray(r) ? r : [])
      setLoading(false)
    }).catch(e => { setError(e.message); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  async function deleteTemplate(id) {
    if (!window.confirm('Delete this template?')) return
    setDeleting(id)
    try {
      await api.delete(`/imaging/templates/${id}`)
      load()
    } catch(e) {
      alert(e.response?.data?.detail || 'Delete failed')
    } finally {
      setDeleting(null)
    }
  }

  const grouped = {}
  for (const t of templates) {
    if (filterMod !== 'all' && t.modality !== filterMod) continue
    if (!grouped[t.modality]) grouped[t.modality] = []
    grouped[t.modality].push(t)
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex gap-3 items-center">
          <select className="input-sm" value={filterMod} onChange={e => setFilterMod(e.target.value)}>
            <option value="all">All Modalities</option>
            {MODALITIES.map(m => <option key={m} value={m}>{MODALITY_LABELS[m] || m}</option>)}
          </select>
          <button onClick={() => setModal('new')} className="btn-primary gap-2">
            <Plus size={15}/>New Template
          </button>
        </div>
      </div>

      {error && <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex gap-2"><AlertCircle size={15}/>{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-gray-400"/></div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText size={48} className="mx-auto mb-3 opacity-30"/>
          <p>No templates yet. Create your first template.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([mod, list]) => (
          <div key={mod} className="card mb-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: '#0F2557' }}>{mod}</span>
              <span className="font-semibold text-gray-700">{MODALITY_LABELS[mod] || mod}</span>
              <span className="text-xs text-gray-400">({list.length} template{list.length !== 1 ? 's' : ''})</span>
            </div>
            <div className="divide-y divide-gray-100">
              {list.map(t => (
                <div key={t.id} className="py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{t.name}</span>
                      {!t.is_active && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Inactive</span>}
                    </div>
                    {t.body_part && <p className="text-xs text-gray-500 mt-0.5">{t.body_part}</p>}
                    {t.findings_template && (
                      <p className="text-xs text-gray-400 mt-1 truncate max-w-xl">{t.findings_template.slice(0,120)}{t.findings_template.length>120?'…':''}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setModal(t)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-700">
                      <Edit2 size={15}/>
                    </button>
                    <button onClick={() => deleteTemplate(t.id)} disabled={deleting===t.id}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600">
                      {deleting===t.id ? <Loader2 size={15} className="animate-spin"/> : <Trash2 size={15}/>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {(modal === 'new' || (modal && modal.id)) && (
        <TemplateModal
          template={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
