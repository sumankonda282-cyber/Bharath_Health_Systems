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
  Trash2,
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

// ─── Constants ────────────────────────────────────────────────────────────────

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
  { value: 'neurology',    label: 'Neurology' },
  { value: 'oncology',     label: 'Oncology' },
  { value: 'dermatology',  label: 'Dermatology' },
  { value: 'pharmacy',     label: 'Pharmacy' },
  { value: 'lab',          label: 'Laboratory' },
  { value: 'radiology',    label: 'Radiology' },
  { value: 'emergency',    label: 'Emergency' },
  { value: 'palliative',   label: 'Palliative Care' },
  { value: 'rehab',        label: 'Rehabilitation' },
  { value: 'other',        label: 'Other' },
]

const STATUS_BADGE = {
  published: 'bg-green-100 text-green-700',
  draft:     'bg-yellow-100 text-yellow-700',
  template:  'bg-blue-100 text-blue-700',
  retired:   'bg-gray-100 text-gray-600',
}

const CATEGORY_ICONS = {
  vitals:       <HeartPulse className="w-4 h-4" />,
  mental_health:<Brain className="w-4 h-4" />,
  clinical:     <Stethoscope className="w-4 h-4" />,
  surgical:     <Syringe className="w-4 h-4" />,
  icu:          <Activity className="w-4 h-4" />,
  admission:    <Building2 className="w-4 h-4" />,
  general:      <FileText className="w-4 h-4" />,
  assessment:   <ClipboardList className="w-4 h-4" />,
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function useToast () {
  const [toasts, setToasts] = useState([])
  const add = useCallback((msg, type = 'info') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }, [])
  const remove = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), [])
  return { toasts, add, remove }
}

function ToastContainer ({ toasts, onRemove }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-sm font-medium
            ${ t.type === 'success' ? 'bg-green-600 text-white'
             : t.type === 'error'   ? 'bg-red-600 text-white'
             : 'bg-gray-800 text-white' }`}
        >
          {t.msg}
          <button onClick={() => onRemove(t.id)} className="ml-1 opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}

function ConfirmModal ({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 flex flex-col gap-4">
        <div className="flex items-center gap-3 text-red-600">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <p className="text-sm font-medium text-gray-800">{message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FormPool () {
  const navigate = useNavigate()
  const { toasts, add: toast, remove: removeToast } = useToast()

  const [forms,        setForms]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [search,       setSearch]       = useState('')
  const [activeTab,    setActiveTab]    = useState('all')
  const [category,     setCategory]     = useState('all')
  const [actionLoading,setActionLoading]= useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)   // form to confirm-delete

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchForms = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data } = await api.get('/assessment-forms/')
      setForms(Array.isArray(data) ? data : (data.forms ?? data.items ?? []))
    } catch (e) {
      setError(e?.response?.data?.detail ?? 'Failed to load forms')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchForms() }, [fetchForms])

  // ── Derived list ──────────────────────────────────────────────────────────
  const filtered = forms.filter(f => {
    const q = search.toLowerCase()
    if (q && !f.title?.toLowerCase().includes(q) &&
             !f.description?.toLowerCase().includes(q) &&
             !f.category?.toLowerCase().includes(q)) return false
    if (activeTab !== 'all') {
      if (activeTab === 'published' && f.status !== 'published') return false
      if (activeTab === 'drafts'    && f.status !== 'draft')     return false
      if (activeTab === 'templates' && !f.is_template)           return false
      if (activeTab === 'retired'   && f.status !== 'retired')   return false
    }
    if (category !== 'all' && f.category !== category) return false
    return true
  })

  // ── Actions ───────────────────────────────────────────────────────────────
  const withAction = (id, fn) => async () => {
    setActionLoading(p => ({ ...p, [id]: true }))
    try { await fn() }
    finally { setActionLoading(p => ({ ...p, [id]: false })) }
  }

  const handlePublish = (form) => withAction(form.id, async () => {
    await api.patch(`/assessment-forms/${form.id}`, { status: 'published' })
    toast('Form published', 'success')
    fetchForms()
  })()

  const handleArchive = (form) => withAction(form.id, async () => {
    await api.patch(`/assessment-forms/${form.id}`, { status: 'retired' })
    toast('Form archived', 'success')
    fetchForms()
  })()

  const handleDuplicate = (form) => withAction(form.id, async () => {
    await api.post(`/assessment-forms/${form.id}/duplicate`)
    toast('Form duplicated', 'success')
    fetchForms()
  })()

  const handleShare = (form) => {
    const url = `${window.location.origin}/forms/${form.slug ?? form.id}`
    navigator.clipboard.writeText(url).then(
      ()  => toast('Link copied!', 'success'),
      ()  => toast('Could not copy link', 'error'),
    )
  }

  // Delete flow: open confirm → confirmed → call API
  const handleDeleteClick  = (form) => setDeleteTarget(form)
  const handleDeleteCancel = ()     => setDeleteTarget(null)
  const handleDeleteConfirm = async () => {
    const form = deleteTarget
    setDeleteTarget(null)
    setActionLoading(p => ({ ...p, [form.id]: true }))
    try {
      await api.delete(`/assessment-forms/${form.id}`)
      toast('Form deleted', 'success')
      fetchForms()
    } catch (e) {
      toast(e?.response?.data?.detail ?? 'Delete failed', 'error')
    } finally {
      setActionLoading(p => ({ ...p, [form.id]: false }))
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Form Pool</h1>
              <p className="text-xs text-gray-500">Manage assessment forms & templates</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/forms/builder')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" /> New Form
          </button>
        </div>
      </div>

      {/* Tabs + Filters */}
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-3">

        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1 w-fit">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition
                ${activeTab === t.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search forms…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <button
            onClick={fetchForms}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            title="Refresh"
          >
            <BarChart2 className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 pb-10">

        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-20 text-red-500 text-sm">{error}</div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No forms found</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(form => (
              <FormCard
                key={form.id}
                form={form}
                loading={!!actionLoading[form.id]}
                onEdit     ={() => navigate(`/forms/builder/${form.id}`)}
                onPreview  ={() => navigate(`/forms/preview/${form.id}`)}
                onPublish  ={() => handlePublish(form)}
                onArchive  ={() => handleArchive(form)}
                onDuplicate={() => handleDuplicate(form)}
                onShare    ={() => handleShare(form)}
                onDelete   ={() => handleDeleteClick(form)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteTarget && (
        <ConfirmModal
          message={`Delete "${deleteTarget.title}"? This cannot be undone.`}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}

// ─── Form Card ────────────────────────────────────────────────────────────────

function FormCard ({ form, loading, onEdit, onPreview, onPublish, onArchive, onDuplicate, onShare, onDelete }) {
  const status    = form.status ?? 'draft'
  const catIcon   = CATEGORY_ICONS[form.category] ?? <FileText className="w-4 h-4" />
  const badgeCls  = STATUS_BADGE[status] ?? STATUS_BADGE.draft
  const isPublished = status === 'published'

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col">

      {/* Card header */}
      <div className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl shrink-0">
          {form.icon ?? '📋'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-sm truncate">{form.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeCls}`}>
              {status}
            </span>
            {form.is_template && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
                template
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{form.description}</p>
        </div>
      </div>

      {/* Meta */}
      <div className="px-4 pb-3 flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">{catIcon} {form.category ?? '—'}</span>
        {form.version_number && (
          <span className="bg-gray-100 px-1.5 py-0.5 rounded">v{form.version_number}</span>
        )}
        {form.question_count != null && (
          <span>{form.question_count} Qs</span>
        )}
        {form.is_iview_enabled && (
          <span className="bg-cyan-50 text-cyan-600 px-1.5 py-0.5 rounded">iView</span>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 mx-4" />

      {/* Actions */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <IconBtn title="Edit"      onClick={onEdit}      disabled={loading}><Pencil  className="w-4 h-4" /></IconBtn>
          <IconBtn title="Preview"   onClick={onPreview}   disabled={loading}><Eye     className="w-4 h-4" /></IconBtn>
          <IconBtn title="Duplicate" onClick={onDuplicate} disabled={loading}><Copy    className="w-4 h-4" /></IconBtn>
          <IconBtn title="Share"     onClick={onShare}     disabled={loading}><Share2  className="w-4 h-4" /></IconBtn>
          <IconBtn
            title="Delete"
            onClick={onDelete}
            disabled={loading}
            className="text-red-500 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </IconBtn>
        </div>

        {loading
          ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          : isPublished
            ? (
              <button
                onClick={onArchive}
                title="Archive"
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
              >
                <Archive className="w-3.5 h-3.5" /> Archive
              </button>
            ) : (
              <button
                onClick={onPublish}
                title="Publish"
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
              >
                <Check className="w-3.5 h-3.5" /> Publish
              </button>
            )
        }
      </div>
    </div>
  )
}

function IconBtn ({ children, title, onClick, disabled, className = '' }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}
