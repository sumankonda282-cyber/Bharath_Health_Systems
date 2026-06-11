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
  { value: 'all',            label: 'All Categories' },
  { value: 'general',        label: 'General' },
  { value: 'clinical',       label: 'Clinical' },
  { value: 'mental_health',  label: 'Mental Health' },
  { value: 'pediatrics',     label: 'Pediatrics' },
  { value: 'vitals',         label: 'Vitals' },
  { value: 'surgical',       label: 'Surgical' },
  { value: 'icu',            label: 'ICU' },
]

const STATUS_OPTIONS = [
  { value: 'all',       label: 'All Statuses' },
  { value: 'draft',     label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'retired',   label: 'Retired' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(val) {
  if (!val) return '—'
  try {
    return new Date(val).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch {
    return val
  }
}

function capitalize(s) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const styles = {
    draft:     'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50',
    published: 'bg-green-900/30 text-green-400 border border-green-800/50',
    retired:   'bg-gray-700 text-gray-400 border border-gray-600/50',
    template:  'bg-blue-900/30 text-blue-400 border border-blue-800/50',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
      {capitalize(status)}
    </span>
  )
}

// ─── Skeleton Rows ────────────────────────────────────────────────────────────

function SkeletonRows() {
  return Array.from({ length: 3 }).map((_, i) => (
    <tr key={i} className="border-b border-gray-800">
      {Array.from({ length: 6 }).map((__, j) => (
        <td key={j} className="px-4 py-3">
          <div className="h-4 rounded bg-gray-800 animate-pulse" style={{ width: j === 0 ? '60%' : j === 5 ? '80px' : '40%' }} />
        </td>
      ))}
    </tr>
  ))
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 bg-gray-800 border border-gray-700 text-white text-sm px-4 py-3 rounded-xl shadow-lg border-l-4 ${
            t.type === 'error' ? 'border-l-red-500' : 'border-l-green-500'
          } animate-fade-in`}
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

// ─── Assign Modal ─────────────────────────────────────────────────────────────

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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div
        className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Assign to Pool</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form name */}
        <p className="text-sm text-gray-400 mb-5">
          Form:{' '}
          <span className="text-white font-medium">{assignModal.formTitle}</span>
        </p>

        {/* Clinic selector */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Select Clinic
          </label>

          {loadingClinics ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-3">
              <Loader2 size={16} className="animate-spin" />
              Loading clinics…
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {/* All Clinics option */}
              <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors bg-gray-800 hover:bg-gray-700 border border-gray-700">
                <input
                  type="radio"
                  name="clinic"
                  value="all"
                  checked={selectedClinic === 'all'}
                  onChange={() => setSelectedClinic('all')}
                  className="accent-[#F5821E]"
                />
                <span className="text-sm text-white">All Clinics (Global)</span>
              </label>

              {clinicsList.map((clinic) => (
                <label
                  key={clinic.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors bg-gray-800 hover:bg-gray-700 border border-gray-700"
                >
                  <input
                    type="radio"
                    name="clinic"
                    value={clinic.id}
                    checked={selectedClinic === clinic.id}
                    onChange={() => setSelectedClinic(clinic.id)}
                    className="accent-[#F5821E]"
                  />
                  <span className="text-sm text-white">{clinic.name || clinic.clinic_name || `Clinic ${clinic.id}`}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-300 hover:text-white border border-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={assigning}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-[#F5821E] hover:bg-[#e07319] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {assigning && <Loader2 size={14} className="animate-spin" />}
            Assign
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FormPool() {
  const navigate = useNavigate()

  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [activeTab, setActiveTab] = useState('all')
  const [filter, setFilter] = useState({ status: 'all', category: 'all', search: '' })

  const [assignModal, setAssignModal] = useState(null)
  const [toasts, setToasts] = useState([])
  const [actionLoading, setActionLoading] = useState({}) // { [formId_action]: bool }

  // ── Toast helpers ───────────────────────────────────────────────────────

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // ── Load forms ──────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true)
    api.get('/platform/forms')
      .then((data) => {
        const list = Array.isArray(data) ? data : (data?.items ?? data?.results ?? [])
        setForms(list)
        setError('')
      })
      .catch((err) => {
        setError(err.message || 'Failed to load forms.')
      })
      .finally(() => setLoading(false))
  }, [])

  // ── Action helpers ──────────────────────────────────────────────────────

  function setActionBusy(formId, action, busy) {
    setActionLoading((prev) => ({ ...prev, [`${formId}_${action}`]: busy }))
  }

  async function handlePublish(form) {
    setActionBusy(form.id, 'publish', true)
    try {
      await api.post(`/platform/forms/${form.id}/publish`)
      setForms((prev) => prev.map((f) => f.id === form.id ? { ...f, status: 'published' } : f))
      addToast(`"${form.title}" published.`)
    } catch (err) {
      addToast(err.message || 'Publish failed.', 'error')
    } finally {
      setActionBusy(form.id, 'publish', false)
    }
  }

  async function handleRetire(form) {
    setActionBusy(form.id, 'retire', true)
    try {
      await api.post(`/platform/forms/${form.id}/retire`)
      setForms((prev) => prev.map((f) => f.id === form.id ? { ...f, status: 'retired' } : f))
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
        setForms((prev) => [newForm, ...prev])
      } else {
        // Reload if we didn't get the cloned form back
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

  // ── Filtering ───────────────────────────────────────────────────────────

  const filteredForms = forms.filter((form) => {
    // Tab filter
    if (activeTab === 'published' && form.status !== 'published') return false
    if (activeTab === 'drafts' && form.status !== 'draft') return false
    if (activeTab === 'templates' && form.status !== 'template') return false
    if (activeTab === 'retired' && form.status !== 'retired') return false

    // Status filter
    if (filter.status !== 'all' && form.status !== filter.status) return false

    // Category filter
    if (filter.category !== 'all' && form.category !== filter.category) return false

    // Search filter
    if (filter.search.trim()) {
      const q = filter.search.trim().toLowerCase()
      if (
        !form.title?.toLowerCase().includes(q) &&
        !form.category?.toLowerCase().includes(q)
      ) return false
    }

    return true
  })

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">PowerForm Pool</h1>
        <button
          onClick={() => navigate('/forms/builder')}
          className="flex items-center gap-2 bg-[#F5821E] hover:bg-[#e07319] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          New Form
        </button>
      </header>

      {/* ── Tabs ── */}
      <div className="flex border-b border-gray-800 px-6 bg-gray-900">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-[#F5821E] text-[#F5821E]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div className="px-6 py-3 flex flex-wrap items-center gap-3 bg-gray-900 border-b border-gray-800">
        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={filter.search}
            onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
            placeholder="Search forms…"
            className="w-64 bg-gray-800 border border-gray-700 text-white text-sm rounded-lg pl-9 pr-3 py-2 outline-none focus:border-[#F5821E] transition-colors placeholder-gray-500"
          />
        </div>

        {/* Category */}
        <select
          value={filter.category}
          onChange={(e) => setFilter((prev) => ({ ...prev, category: e.target.value }))}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-[#F5821E] transition-colors"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        {/* Status */}
        <select
          value={filter.status}
          onChange={(e) => setFilter((prev) => ({ ...prev, status: e.target.value }))}
          className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-[#F5821E] transition-colors"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 px-6 py-4 overflow-x-auto">
        {error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ClipboardList size={40} className="text-gray-600 mb-3" />
            <p className="text-gray-400 font-medium">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 text-sm text-[#F5821E] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <table className="table-auto w-full border-collapse">
            <thead>
              <tr className="bg-gray-800">
                {['Title', 'Category', 'Version', 'Status', 'Created', 'Actions'].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : filteredForms.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <ClipboardList size={40} className="text-gray-600 mb-3" />
                      <p className="text-white font-medium">No forms found</p>
                      <p className="text-gray-500 text-sm mt-1">
                        Try adjusting your filters or create a new form.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredForms.map((form) => (
                  <tr
                    key={form.id}
                    className="bg-gray-900 hover:bg-gray-800/50 border-b border-gray-800 text-sm text-white transition-colors"
                  >
                    {/* Title */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-white truncate max-w-xs">{form.title || 'Untitled'}</p>
                      {form.description && (
                        <p className="text-xs text-gray-500 truncate max-w-xs mt-0.5">{form.description}</p>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 text-gray-300 capitalize whitespace-nowrap">
                      {form.category ? form.category.replace(/_/g, ' ') : '—'}
                    </td>

                    {/* Version */}
                    <td className="px-4 py-3 text-gray-400 font-mono whitespace-nowrap">
                      v{form.version ?? 1}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={form.status || 'draft'} />
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                      {fmtDate(form.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {/* Edit */}
                        <button
                          onClick={() => navigate(`/forms/builder/${form.id}`)}
                          title="Edit"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>

                        {/* Publish (draft only) */}
                        {form.status === 'draft' && (
                          <button
                            onClick={() => handlePublish(form)}
                            disabled={actionLoading[`${form.id}_publish`]}
                            title="Publish"
                            className="p-1.5 rounded-lg text-green-400 hover:text-green-300 hover:bg-gray-700 disabled:opacity-40 transition-colors"
                          >
                            {actionLoading[`${form.id}_publish`]
                              ? <Loader2 size={14} className="animate-spin" />
                              : <Check size={14} />
                            }
                          </button>
                        )}

                        {/* Retire (published only) */}
                        {form.status === 'published' && (
                          <button
                            onClick={() => handleRetire(form)}
                            disabled={actionLoading[`${form.id}_retire`]}
                            title="Retire"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-700 disabled:opacity-40 transition-colors"
                          >
                            {actionLoading[`${form.id}_retire`]
                              ? <Loader2 size={14} className="animate-spin" />
                              : <Archive size={14} />
                            }
                          </button>
                        )}

                        {/* Clone */}
                        <button
                          onClick={() => handleClone(form)}
                          disabled={actionLoading[`${form.id}_clone`]}
                          title="Clone"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-gray-700 disabled:opacity-40 transition-colors"
                        >
                          {actionLoading[`${form.id}_clone`]
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Copy size={14} />
                          }
                        </button>

                        {/* Assign */}
                        <button
                          onClick={() => setAssignModal({ formId: form.id, formTitle: form.title })}
                          title="Assign to Pool"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-orange-400 hover:bg-gray-700 transition-colors"
                        >
                          <Share2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Assign Modal ── */}
      {assignModal && (
        <AssignModal
          assignModal={assignModal}
          onClose={() => setAssignModal(null)}
          onAssigned={() => {}}
          addToast={addToast}
        />
      )}

      {/* ── Toasts ── */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  )
}
