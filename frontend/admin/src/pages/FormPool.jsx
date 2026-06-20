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
  RefreshCw,
  ChevronDown,
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
  published: 'bg-emerald-900/40 text-emerald-400 border-emerald-800/50',
  draft:     'bg-yellow-900/40 text-yellow-400 border-yellow-800/50',
  template:  'bg-blue-900/40 text-blue-400 border-blue-800/50',
  retired:   'bg-gray-800/60 text-gray-500 border-gray-700/50',
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

// ─── Toast hook ───────────────────────────────────────────────────────────────

function useToast() {
  const [toasts, setToasts] = useState([])
  const add = useCallback((msg, type = 'info') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }, [])
  const remove = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), [])
  return { toasts, add, remove }
}

function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-sm font-medium
            ${t.type === 'success' ? 'bg-emerald-700 text-white'
            : t.type === 'error'   ? 'bg-red-700 text-white'
            : 'bg-gray-700 text-white'}`}
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

// ─── Confirm modal (dark) ─────────────────────────────────────────────────────

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-6 w-80 flex flex-col gap-4">
        <div className="flex items-center gap-3 text-red-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm text-gray-200">{message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 rounded-lg text-sm border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 rounded-lg text-sm bg-red-700 text-white hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FormPool() {
  const navigate = useNavigate()
  const { toasts, add: toast, remove: removeToast } = useToast()

  const [forms,         setForms]         = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [search,        setSearch]        = useState('')
  const [activeTab,     setActiveTab]     = useState('all')
  const [category,      setCategory]      = useState('all')
  const [actionLoading, setActionLoading] = useState({})
  const [deleteTarget,  setDeleteTarget]  = useState(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchForms = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await api.get('/assessment-forms/')
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

  const handleDeleteClick   = (form) => setDeleteTarget(form)
  const handleDeleteCancel  = ()     => setDeleteTarget(null)
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
    <div className="space-y-4">

      {/* Toolbar — tabs + search + category + refresh + new */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Tabs */}
        <div className="flex items-center gap-0.5 bg-gray-900 border border-gray-800 rounded-xl p-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap
                ${activeTab === t.key
                  ? 'bg-[#F5821E] text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search forms…"
            className="input pl-9 py-1.5 text-sm w-full"
          />
        </div>

        {/* Category */}
        <div className="relative">
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="input appearance-none pr-7 py-1.5 text-sm"
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>

        {/* Refresh */}
        <button
          onClick={fetchForms}
          title="Refresh"
          className="p-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
        >
          <RefreshCw size={14} />
        </button>

        {/* Count */}
        <span className="text-xs text-gray-500 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 font-medium">
          {filtered.length} form{filtered.length !== 1 ? 's' : ''}
        </span>

        {/* New */}
        <button
          onClick={() => navigate('/forms/builder')}
          className="btn-primary ml-auto"
        >
          <Plus size={14} /> New Form
        </button>
      </div>

      {/* Body */}
      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-[#F5821E]" />
        </div>
      )}

      {error && !loading && (
        <div className="card-p text-center py-16 text-red-400 text-sm">{error}</div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="card-p text-center py-16">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-700" />
          <p className="text-sm text-gray-500">No forms found</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(form => (
            <FormCard
              key={form.id}
              form={form}
              loading={!!actionLoading[form.id]}
              onEdit      ={() => navigate(`/forms/builder/${form.id}`)}
              onPreview   ={() => navigate(`/forms/preview/${form.id}`)}
              onPublish   ={() => handlePublish(form)}
              onArchive   ={() => handleArchive(form)}
              onDuplicate ={() => handleDuplicate(form)}
              onShare     ={() => handleShare(form)}
              onDelete    ={() => handleDeleteClick(form)}
            />
          ))}
        </div>
      )}

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

function FormCard({ form, loading, onEdit, onPreview, onPublish, onArchive, onDuplicate, onShare, onDelete }) {
  const status      = form.status ?? 'draft'
  const catIcon     = CATEGORY_ICONS[form.category] ?? <FileText className="w-4 h-4" />
  const badgeCls    = STATUS_BADGE[status] ?? STATUS_BADGE.draft
  const isPublished = status === 'published'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors flex flex-col">

      {/* Card header */}
      <div className="p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-lg shrink-0 select-none">
          {form.icon ?? '📋'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-semibold text-gray-100 text-sm truncate">{form.title}</h3>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${badgeCls}`}>
              {status}
            </span>
            {form.is_template && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-purple-900/40 text-purple-400 border border-purple-800/50">
                template
              </span>
            )}
          </div>
          {form.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{form.description}</p>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="px-4 pb-3 flex items-center gap-2.5 text-xs text-gray-600">
        <span className="flex items-center gap-1 text-gray-500">{catIcon} {form.category ?? '—'}</span>
        {form.version_number && (
          <span className="bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded text-gray-400">
            v{form.version_number}
          </span>
        )}
        {form.question_count != null && (
          <span className="text-gray-500">{form.question_count} Qs</span>
        )}
        {form.is_iview_enabled && (
          <span className="bg-cyan-900/40 text-cyan-400 border border-cyan-800/50 px-1.5 py-0.5 rounded text-[10px]">
            iView
          </span>
        )}
      </div>

      <div className="border-t border-gray-800 mx-4" />

      {/* Actions */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-0.5">
          <IconBtn title="Edit"      onClick={onEdit}      disabled={loading}><Pencil  className="w-3.5 h-3.5" /></IconBtn>
          <IconBtn title="Preview"   onClick={onPreview}   disabled={loading}><Eye     className="w-3.5 h-3.5" /></IconBtn>
          <IconBtn title="Duplicate" onClick={onDuplicate} disabled={loading}><Copy    className="w-3.5 h-3.5" /></IconBtn>
          <IconBtn title="Share"     onClick={onShare}     disabled={loading}><Share2  className="w-3.5 h-3.5" /></IconBtn>
          <IconBtn
            title="Delete"
            onClick={onDelete}
            disabled={loading}
            className="text-red-500 hover:bg-red-900/30 hover:text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </IconBtn>
        </div>

        {loading
          ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F5821E]" />
          : isPublished
            ? (
              <button
                onClick={onArchive}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
              >
                <Archive className="w-3 h-3" /> Archive
              </button>
            ) : (
              <button
                onClick={onPublish}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-emerald-700 text-white hover:bg-emerald-600 transition-colors"
              >
                <Check className="w-3 h-3" /> Publish
              </button>
            )
        }
      </div>
    </div>
  )
}

function IconBtn({ children, title, onClick, disabled, className = '' }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}
