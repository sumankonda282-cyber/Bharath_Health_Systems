import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Pencil,
  Check,
  Archive,
  Copy,
  Share2,
  ClipboardList,
  X,
  Loader2,
  Eye,
  FileText,
  Brain,
  AlertTriangle,
  Building2,
  Stethoscope,
  Activity,
  Syringe,
  HeartPulse,
  BarChart2,
} from 'lucide-react'
import api from '../api/client'

const TABS = [
  { key: 'all',       label: 'All Forms' },
  { key: 'published', label: 'Published' },
  { key: 'drafts',    label: 'Drafts' },
  { key: 'templates', label: 'Templates' },
  { key: 'retired',   label: 'Retired' },
]

const CATEGORIES = [
  { value: 'all',          label: 'All Categories' },
  { value: 'general',      label: 'General' },
  { value: 'clinical',     label: 'Clinical' },
  { value: 'mental_health',label: 'Mental Health' },
  { value: 'vitals',       label: 'Vitals' },
  { value: 'pain',         label: 'Pain' },
  { value: 'surgical',     label: 'Surgical' },
  { value: 'icu',          label: 'ICU' },
  { value: 'intake',       label: 'Intake' },
  { value: 'admission',    label: 'Admission' },
  { value: 'assessment',   label: 'Assessment' },
  { value: 'nursing',      label: 'Nursing' },
  { value: 'consent',      label: 'Consent' },
  { value: 'discharge',    label: 'Discharge' },
  { value: 'followup',     label: 'Follow-up' },
  { value: 'survey',       label: 'Survey' },
  { value: 'history',      label: 'Patient History' },
  { value: 'systems',      label: 'Systems Review' },
  { value: 'pediatrics',   label: 'Pediatrics' },
  { value: 'cardiology',   label: 'Cardiology' },
  { value: 'ent',          label: 'ENT' },
  { value: 'gastro',       label: 'Gastroenterology' },
  { value: 'orthopedic',   label: 'Orthopedics' },
  { value: 'obg',          label: 'Obstetrics & Gynecology' },
  { value: 'respiratory',  label: 'Respiratory' },
  { value: 'specialty',    label: 'Specialty' },
]

const CATEGORY_META = {
  vitals:       { emoji: '🫀', color: 'bg-red-500/20 text-red-400' },
  mental_health:{ emoji: '🧠', color: 'bg-purple-500/20 text-purple-400' },
  safety:       { emoji: '⚠️', color: 'bg-yellow-500/20 text-yellow-400' },
  intake:       { emoji: '🏥', color: 'bg-blue-500/20 text-blue-400' },
  admission:    { emoji: '🏥', color: 'bg-blue-500/20 text-blue-400' },
  assessment:   { emoji: '📋', color: 'bg-indigo-500/20 text-indigo-400' },
  clinical:     { emoji: '🩺', color: 'bg-teal-500/20 text-teal-400' },
  surgical:     { emoji: '🔬', color: 'bg-cyan-500/20 text-cyan-400' },
  icu:          { emoji: '💊', color: 'bg-rose-500/20 text-rose-400' },
  consent:      { emoji: '✍️', color: 'bg-green-500/20 text-green-400' },
  discharge:    { emoji: '🚶', color: 'bg-orange-500/20 text-orange-400' },
  followup:     { emoji: '📅', color: 'bg-sky-500/20 text-sky-400' },
  survey:       { emoji: '📊', color: 'bg-pink-500/20 text-pink-400' },
  pediatrics:   { emoji: '👶', color: 'bg-lime-500/20 text-lime-400' },
  general:      { emoji: '📄', color: 'bg-gray-500/20 text-gray-400' },
  pain:         { emoji: '🩹', color: 'bg-red-600/20 text-red-300' },
  nursing:      { emoji: '💉', color: 'bg-emerald-500/20 text-emerald-400' },
  history:      { emoji: '📚', color: 'bg-amber-500/20 text-amber-400' },
  systems:      { emoji: '🔍', color: 'bg-violet-500/20 text-violet-400' },
  cardiology:   { emoji: '❤️', color: 'bg-red-500/20 text-red-400' },
  ent:          { emoji: '👂', color: 'bg-orange-500/20 text-orange-400' },
  gastro:       { emoji: '�ac1', color: 'bg-yellow-600/20 text-yellow-400' },
  orthopedic:   { emoji: '🦴', color: 'bg-stone-500/20 text-stone-400' },
  obg:          { emoji: '🌸', color: 'bg-pink-500/20 text-pink-400' },
  respiratory:  { emoji: '🪧', color: 'bg-blue-400/20 text-blue-400' },
  specialty:    { emoji: '⭐', color: 'bg-indigo-400/20 text-indigo-400' },
}

function getCategoryMeta(category) {
  return CATEGORY_META[category] || CATEGORY_META.general
}

function fmtDate(val) {
  if (!val) return '—'
  try {
    return new Date(val).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch {
    return String(val)
  }
}

function capitalize(s) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function StatusBadge({ status }) {
  const styles = {
    draft:     'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50',
    published: 'bg-green-900/30 text-green-400 border border-green-800/50',
    retired:   'bg-gray-700/50 text-gray-400 border border-gray-600/50',
    template:  'bg-blue-900/30 text-blue-400 border border-blue-800/50',
  }
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${styles[status] || styles.draft}`}>
      {capitalize(status)}
    </span>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 animate-pulse">
      <div className="flex items-start gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-gray-800 flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-gray-800 rounded w-3/4" />
          <div className="h-2.5 bg-gray-800 rounded w-1/2" />
        </div>
      </div>
      <div className="flex gap-1.5 mb-3">
        <div className="h-4 w-14 bg-gray-800 rounded-full" />
        <div className="h-4 w-12 bg-gray-800 rounded-full" />
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-gray-800">
        <div className="h-2.5 w-16 bg-gray-800 rounded" />
        <div className="flex gap-0.5">
          {[1, 2, 3].map(i => <div key={i} className="w-6 h-6 bg-gray-800 rounded" />)}
        </div>
      </div>
    </div>
  )
}

function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 bg-gray-800 border text-white text-sm px-4 py-3 rounded-xl shadow-lg border-l-4 ${
            t.type === 'error' ? 'border-red-500 border-l-red-500 border-gray-700' : 'border-green-500 border-l-green-500 border-gray-700'
          }`}
        >
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="text-gray-500 hover:text-white transition-colors">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

function AssignModal({ assignModal, onClose, onAssigned, addToast }) {
  const [clinicsList, setClinicsList] = useState([])
  const [loadingClinics, setLoadingClinics] = useState(true)
  const [selectedClinic, setSelectedClinic] = useState('all')
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    setLoadingClinics(true)
    api.get('/clinics')
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.items ?? data?.results ?? [])
        setClinicsList(list)
      })
      .catch(() => setClinicsList([]))
      .finally(() => setLoadingClinics(false))
  }, [])

  async function handleAssign() {
    setAssigning(true)
    try {
      await api.post('/platform/pool/assign', {
        form_id: assignModal.formId,
        clinic_id: selectedClinic === 'all' ? null : selectedClinic,
      })
      addToast(`"${assignModal.formTitle}" assigned successfully.`, 'success')
      onAssigned()
      onClose()
    } catch (err) {
      addToast(err.message || 'Failed to assign form.', 'error')
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Add to Pool</h2>
            <p className="text-xs text-gray-500 mt-0.5">Make available for clinical use</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3 mb-5">
          <p className="text-xs text-gray-500 mb-0.5">Form</p>
          <p className="text-white font-medium text-sm">{assignModal.formTitle}</p>
        </div>
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Make available to
          </label>
          {loadingClinics ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-3">
              <Loader2 size={16} className="animate-spin" />Loading clinics…
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors bg-gray-800 hover:bg-gray-700 border border-gray-700 has-[:checked]:border-[#F5821E]/50 has-[:checked]:bg-[#F5821E]/5">
                <input type="radio" name="clinic" value="all" checked={selectedClinic === 'all'} onChange={() => setSelectedClinic('all')} className="accent-[#F5821E]" />
                <div>
                  <p className="text-sm text-white font-medium">All Clinics</p>
                  <p className="text-xs text-gray-500">Globally available to all clinics</p>
                </div>
              </label>
              {clinicsList.map((clinic) => (
                <label key={clinic.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors bg-gray-800 hover:bg-gray-700 border border-gray-700">
                  <input type="radio" name="clinic" value={clinic.id} checked={selectedClinic === clinic.id} onChange={() => setSelectedClinic(clinic.id)} className="accent-[#F5821E]" />
                  <span className="text-sm text-white">{clinic.name || clinic.clinic_name || `Clinic ${clinic.id}`}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-300 hover:text-white border border-gray-700 transition-colors">Cancel</button>
          <button onClick={handleAssign} disabled={assigning}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#F5821E] hover:bg-[#e07319] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
            {assigning && <Loader2 size={14} className="animate-spin" />}
            Assign to Pool
          </button>
        </div>
      </div>
    </div>
  )
}

function FormCard({ form, navigate, onPublish, onRetire, onClone, onAssign, actionLoading }) {
  const meta = getCategoryMeta(form.category)

  return (
    <div className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-3 flex flex-col gap-2 transition-all hover:shadow-lg hover:shadow-black/20">
      <div className="flex items-start gap-2">
        <div className={`w-7 h-7 rounded-lg ${meta.color} flex items-center justify-center text-sm flex-shrink-0`}>
          {meta.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-xs leading-tight truncate" title={form.title}>
            {form.title || 'Untitled Form'}
          </h3>
          <p className="text-[10px] text-gray-500 mt-0.5 capitalize">
            {form.category ? form.category.replace(/_/g, ' ') : 'General'}
            {form.subcategory && ` · ${form.subcategory}`}
          </p>
        </div>
        <span className="text-[10px] font-mono text-gray-500 bg-gray-800 px-1 py-0.5 rounded border border-gray-700 flex-shrink-0">
          v{form.version ?? 1}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        <StatusBadge status={form.status || 'draft'} />
        {form.is_iview_enabled && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-900/30 text-indigo-400 border border-indigo-800/50">iView</span>
        )}
        {(form.is_template || form.status === 'template') && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-900/30 text-blue-400 border border-blue-800/50">Template</span>
        )}
        {form.requires_cosign && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-orange-900/30 text-orange-400 border border-orange-800/50">Co-sign</span>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-800 mt-auto">
        <span className="text-[10px] text-gray-600">{fmtDate(form.created_at)}</span>
        <div className="flex items-center gap-0.5">
          <button onClick={() => navigate(`/forms/builder/${form.id}`)} title="Edit form"
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            <Pencil size={12} />
          </button>
          <button onClick={() => navigate(`/forms/preview/${form.id}`)} title="Preview form"
            className="p-1 rounded text-gray-400 hover:text-blue-400 hover:bg-gray-800 transition-colors">
            <Eye size={12} />
          </button>
          {form.status === 'draft' && (
            <button onClick={() => onPublish(form)} disabled={actionLoading[`${form.id}_publish`]} title="Publish"
              className="p-1 rounded text-green-400 hover:text-green-300 hover:bg-gray-800 disabled:opacity-40 transition-colors">
              {actionLoading[`${form.id}_publish`] ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            </button>
          )}
          {form.status === 'published' && (
            <button onClick={() => onRetire(form)} disabled={actionLoading[`${form.id}_retire`]} title="Retire form"
              className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-gray-800 disabled:opacity-40 transition-colors">
              {actionLoading[`${form.id}_retire`] ? <Loader2 size={12} className="animate-spin" /> : <Archive size={12} />}
            </button>
          )}
          {form.status === 'published' && (
            <button onClick={() => onAssign(form)} title="Add to Pool"
              className="p-1 rounded text-gray-400 hover:text-[#F5821E] hover:bg-gray-800 transition-colors">
              <Share2 size={12} />
            </button>
          )}
          <button onClick={() => onClone(form)} disabled={actionLoading[`${form.id}_clone`]} title="Clone form"
            className="p-1 rounded text-gray-400 hover:text-blue-400 hover:bg-gray-800 disabled:opacity-40 transition-colors">
            {actionLoading[`${form.id}_clone`] ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ activeTab, onNewForm }) {
  const messages = {
    all:       { title: 'No forms yet', sub: 'Create your first assessment form to get started.' },
    published: { title: 'No published forms', sub: 'Publish a draft form to make it available to clinics.' },
    drafts:    { title: 'No drafts', sub: 'Start building a new form and save it as a draft.' },
    templates: { title: 'No templates', sub: 'Convert a published form to a template.' },
    retired:   { title: 'No retired forms', sub: 'Retired forms will appear here.' },
  }
  const { title, sub } = messages[activeTab] || messages.all

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center mb-3">
        <ClipboardList size={24} className="text-gray-600" />
      </div>
      <h3 className="text-base font-semibold text-white mb-1.5">{title}</h3>
      <p className="text-gray-500 text-sm mb-5 max-w-xs">{sub}</p>
      {(activeTab === 'all' || activeTab === 'drafts') && (
        <button onClick={onNewForm}
          className="flex items-center gap-2 bg-[#F5821E] hover:bg-[#e07319] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus size={14} />New Form
        </button>
      )}
    </div>
  )
}

export default function FormPool() {
  const navigate = useNavigate()

  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const [assignModal, setAssignModal] = useState(null)
  const [toasts, setToasts] = useState([])
  const [actionLoading, setActionLoading] = useState({})

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    setLoading(true)
    api.get('/platform/forms')
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.items ?? data?.results ?? [])
        setForms(list)
        setError('')
      })
      .catch((err) => setError(err.message || 'Failed to load forms.'))
      .finally(() => setLoading(false))
  }, [])

  function setActionBusy(formId, action, busy) {
    setActionLoading(prev => ({ ...prev, [`${formId}_${action}`]: busy }))
  }

  async function handlePublish(form) {
    setActionBusy(form.id, 'publish', true)
    try {
      await api.post(`/platform/forms/${form.id}/publish`)
      setForms(prev => prev.map(f => f.id === form.id ? { ...f, status: 'published' } : f))
      addToast(`"${form.title}" published.`)
    } catch (err) {
      addToast(err.message || 'Publish failed.', 'error')
    } finally {
      setActionBusy(form.id, 'publish', false)
    }
  }

  async function handleRetire(form) {
    if (!window.confirm(`Retire "${form.title}"? It will no longer be assignable.`)) return
    setActionBusy(form.id, 'retire', true)
    try {
      await api.post(`/platform/forms/${form.id}/retire`)
      setForms(prev => prev.map(f => f.id === form.id ? { ...f, status: 'retired' } : f))
      addToast(`"${form.title}" retired.`)
    } catch (err) {
      addToast(err.message || 'Retire failed.', 'error')
    } finally {
      setActionBusy(form.id, 'retire', false)
    }
  }

  async function handleClone(form) {
    setActionBusy(form.id, 'clone', true)
    try {
      const cloned = await api.post(`/platform/forms/${form.id}/clone`)
      const newForm = cloned?.form ?? cloned?.data ?? cloned
      if (newForm?.id) {
        setForms(prev => [newForm, ...prev])
      } else {
        const data = await api.get('/platform/forms')
        const list = Array.isArray(data) ? data : (data?.items ?? data?.results ?? [])
        setForms(list)
      }
      addToast(`"${form.title}" cloned.`)
    } catch (err) {
      addToast(err.message || 'Clone failed.', 'error')
    } finally {
      setActionBusy(form.id, 'clone', false)
    }
  }

  const tabCounts = {
    all:       forms.length,
    published: forms.filter(f => f.status === 'published').length,
    drafts:    forms.filter(f => f.status === 'draft').length,
    templates: forms.filter(f => f.status === 'template' || f.is_template).length,
    retired:   forms.filter(f => f.status === 'retired').length,
  }

  const filteredForms = forms.filter((form) => {
    if (activeTab === 'published' && form.status !== 'published') return false
    if (activeTab === 'drafts'    && form.status !== 'draft')      return false
    if (activeTab === 'templates' && form.status !== 'template' && !form.is_template) return false
    if (activeTab === 'retired'   && form.status !== 'retired')    return false
    if (categoryFilter !== 'all' && form.category !== categoryFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      if (
        !form.title?.toLowerCase().includes(q) &&
        !form.category?.toLowerCase().includes(q) &&
        !form.description?.toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  return (
    <div className="space-y-2">
      {/* ── Single compact filter row ── */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex gap-0.5 bg-gray-900 border border-gray-800 p-0.5 rounded-lg">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                activeTab === tab.key ? 'bg-[#F5821E] text-white' : 'text-gray-400 hover:text-white'
              }`}>
              {tab.label}
              {!loading && (
                <span className={`text-[10px] ${activeTab === tab.key ? 'opacity-70' : 'text-gray-600'}`}>
                  {tabCounts[tab.key] ?? 0}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search forms…"
            className="bg-gray-900 border border-gray-800 text-white text-xs rounded-lg pl-8 pr-2 py-1.5 w-40 outline-none focus:border-gray-600 placeholder-gray-600"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>

        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="bg-gray-900 border border-gray-800 text-gray-300 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-gray-600">
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        {!loading && (
          <span className="text-xs text-gray-600">{filteredForms.length} forms</span>
        )}

        <div className="flex-1" />

        <button onClick={() => navigate('/forms/analytics')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700 hover:text-white transition-colors">
          <BarChart2 size={12} />Analytics
        </button>
        <button onClick={() => navigate('/forms/builder')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
          style={{ background: '#F5821E' }}>
          <Plus size={12} />New Form
        </button>
      </div>

      {/* ── Content ── */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList size={36} className="text-gray-600 mb-3" />
          <p className="text-gray-400 font-medium mb-1">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 text-sm text-[#F5821E] hover:underline">
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredForms.length === 0 ? (
        <EmptyState activeTab={activeTab} onNewForm={() => navigate('/forms/builder')} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {filteredForms.map((form) => (
            <FormCard
              key={form.id}
              form={form}
              navigate={navigate}
              onPublish={handlePublish}
              onRetire={handleRetire}
              onClone={handleClone}
              onAssign={f => setAssignModal({ formId: f.id, formTitle: f.title })}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}

      {assignModal && (
        <AssignModal
          assignModal={assignModal}
          onClose={() => setAssignModal(null)}
          onAssigned={() => {}}
          addToast={addToast}
        />
      )}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
