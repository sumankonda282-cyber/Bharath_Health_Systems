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
  { key: 'trash',     label: 'Trash' },
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
  retired:   'surface-2 text-faint border-app',
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
            ${t.type === 'success' ? 'bg-emerald-700 text-app'
            : t.type === 'error'   ? 'bg-red-700 text-app'
            : 'surface-3 text-app'}`}
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
      <div className="surface border border-app rounded-2xl shadow-2xl p-6 w-80 flex flex-col gap-4">
        <div className="flex items-center gap-3 text-red-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm text-app">{message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 rounded-lg text-sm border border-app text-dim hover-app transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 rounded-lg text-sm bg-red-700 text-app hover:bg-red-600 transition-colors"
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
      // Admin library management — show ALL forms incl. empty ones so they can be
      // reviewed / rebuilt / deleted here (the portal documentation pickers hide empties).
      const data = await api.get('/assessment-forms', { params: { limit: 1000, include_empty: true } })
      setForms(Array.isArray(data) ? data : (data.forms ?? data.items ?? []))
    } catch (e) {
      setError(e.message || 'Failed to load forms')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchForms() }, [fetchForms])

  // ── Trash (soft-deleted forms, recoverable 30 days) ─────────────────────────
  const [trashItems, setTrashItems]     = useState([])
  const [trashLoading, setTrashLoading] = useState(false)
  const fetchTrash = useCallback(async () => {
    setTrashLoading(true)
    try {
      const data = await api.get('/assessment-forms/trash')
      setTrashItems(data?.trash ?? [])
    } catch { setTrashItems([]) }
    finally { setTrashLoading(false) }
  }, [])
  useEffect(() => { if (activeTab === 'trash') fetchTrash() }, [activeTab, fetchTrash])

  const handleRestore = async (item) => {
    setActionLoading(p => ({ ...p, [item.id]: true }))
    try {
      await api.post(`/assessment-forms/${item.id}/restore`)
      toast('Form restored', 'success')
      fetchTrash(); fetchForms()
    } catch (e) { toast(e.message ?? 'Restore failed', 'error') }
    finally { setActionLoading(p => ({ ...p, [item.id]: false })) }
  }

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
    catch (e) { toast(e.message || 'Action failed', 'error') }
    finally { setActionLoading(p => ({ ...p, [id]: false })) }
  }

  const handlePublish = (form) => withAction(form.id, async () => {
    await api.post(`/assessment-forms/${form.id}/publish`)
    toast('Form published', 'success')
    fetchForms()
  })()

  const handleArchive = (form) => withAction(form.id, async () => {
    await api.post(`/assessment-forms/${form.id}/retire`)
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
      toast('Moved to Trash', 'success')
      fetchForms()
    } catch (e) {
      toast(e.message ?? 'Delete failed', 'error')
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
        <div className="flex items-center gap-0.5 surface border border-app rounded-xl p-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap
                ${activeTab === t.key
                  ? 'bg-[#F5821E] text-app shadow-sm'
                  : 'text-dim hover:text-app hover-app'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
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
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
        </div>

        {/* Count */}
        <span className="text-xs text-faint surface-2 border border-app rounded-lg px-2.5 py-1.5 font-medium">
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
      {activeTab === 'trash' ? (
        <TrashView items={trashItems} loading={trashLoading} actionLoading={actionLoading} onRestore={handleRestore} />
      ) : (
      <>
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
          <ClipboardList className="w-10 h-10 mx-auto mb-3 text-dim" />
          <p className="text-sm text-faint">No forms found</p>
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
      </>
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Move "${deleteTarget.title}" to Trash? It stays recoverable for 30 days (submissions are preserved), and you can restore it from the Trash tab.`}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}

// ─── Trash view (soft-deleted forms) ───────────────────────────────────────────

function TrashView({ items, loading, actionLoading, onRestore }) {
  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-[#F5821E]" /></div>
  )
  if (!items.length) return (
    <div className="card-p text-center py-16">
      <Trash2 className="w-10 h-10 mx-auto mb-3 text-dim" />
      <p className="text-sm text-faint">Trash is empty</p>
    </div>
  )
  return (
    <div className="space-y-2">
      <p className="text-xs text-faint">
        Deleted forms are kept for 30 days, then auto-removed (forms with submissions are never auto-purged). Restore any time.
      </p>
      {items.map(it => (
        <div key={it.id} className="surface border border-app rounded-xl p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-app truncate">{it.title}</div>
            <div className="text-[11px] text-faint">
              {it.category || '—'}
              {it.deleted_by_name ? ` · deleted by ${it.deleted_by_name}` : ''}
              {it.deleted_at ? ` · ${new Date(it.deleted_at).toLocaleDateString('en-IN')}` : ''}
              {it.has_submissions ? ' · has submissions' : ''}
            </div>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${it.days_left <= 7 ? 'bg-red-950/40 text-red-400 border-red-800/50' : 'surface-2 text-dim border-app'}`}>
            {it.days_left}d left
          </span>
          <button onClick={() => onRestore(it)} disabled={!!actionLoading[it.id]}
            className="btn-secondary text-xs inline-flex items-center gap-1 disabled:opacity-50">
            <RefreshCw size={12} /> Restore
          </button>
        </div>
      ))}
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
    <div className="surface border border-app rounded-xl hover:border-app transition-colors flex flex-col">

      {/* Card header */}
      <div className="p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg surface-2 border border-app flex items-center justify-center text-lg shrink-0 select-none">
          {form.icon ?? '📋'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-semibold text-app text-sm truncate">{form.title}</h3>
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
            <p className="text-xs text-faint mt-0.5 line-clamp-2">{form.description}</p>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="px-4 pb-3 flex items-center gap-2.5 text-xs text-faint">
        <span className="flex items-center gap-1 text-faint">{catIcon} {form.category ?? '—'}</span>
        {form.version_number && (
          <span className="surface-2 border border-app px-1.5 py-0.5 rounded text-dim">
            v{form.version_number}
          </span>
        )}
        {form.question_count != null && (
          <span className="text-faint">{form.question_count} Qs</span>
        )}
        {form.is_iview_enabled && (
          <span className="bg-cyan-900/40 text-cyan-400 border border-cyan-800/50 px-1.5 py-0.5 rounded text-[10px]">
            iView
          </span>
        )}
      </div>

      <div className="border-t border-app mx-4" />

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
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border border-app text-dim hover-app hover:text-app transition-colors"
              >
                <Archive className="w-3 h-3" /> Archive
              </button>
            ) : (
              <button
                onClick={onPublish}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-emerald-700 text-app hover:bg-emerald-600 transition-colors"
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
      className={`p-1.5 rounded-lg text-faint hover:text-app hover-app transition-colors disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  )
}
