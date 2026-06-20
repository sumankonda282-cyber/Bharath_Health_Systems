import { useState, useEffect } from 'react'
import { adminApi } from '../api'
import { Link } from 'react-router-dom'
import {
  CheckCircle,
  XCircle,
  FileText,
  ExternalLink,
  Search,
  ChevronDown,
} from 'lucide-react'
import ActionModal from '../components/ActionModal'

const STATE_OPTIONS = [
  { value: 'all',       label: 'All States' },
  { value: 'pending',   label: 'Pending' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'review',    label: 'Under Review' },
]

export default function PendingClinics() {
  const [clinics,  setClinics]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)   // { action, clinic }
  const [saving,   setSaving]   = useState(false)
  const [search,   setSearch]   = useState('')
  const [stateFilter, setStateFilter] = useState('all')

  const load = () => {
    setLoading(true)
    adminApi.getPending()
      .then(d => setClinics(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleAction = async ({ comment }) => {
    setSaving(true)
    try {
      if (modal.action === 'approve') await adminApi.approve(modal.clinic.id)
      if (modal.action === 'reject')  await adminApi.reject(modal.clinic.id, { reason: comment, comment })
      setModal(null)
      load()
    } finally { setSaving(false) }
  }

  const filtered = clinics.filter(c => {
    const q = search.toLowerCase()
    if (q && !c.name?.toLowerCase().includes(q) &&
             !c.admin_email?.toLowerCase().includes(q) &&
             !c.city?.toLowerCase().includes(q)) return false
    return true
  })

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search health centers…"
            className="input pl-9 py-2 text-sm w-full"
          />
        </div>

        <div className="relative">
          <select
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
            className="input appearance-none pr-8 py-2 text-sm"
          >
            {STATE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>

        <span className="ml-auto text-xs text-gray-500 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 font-medium">
          {filtered.length} pending
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-2 border-[#F5821E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-p text-center py-16">
          <CheckCircle size={36} className="mx-auto mb-3 text-emerald-500/30" />
          <p className="text-gray-400 font-medium text-sm">
            {search ? 'No results match your search' : 'All caught up — no pending approvals'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th className="th">Health Center</th>
                <th className="th">Specialty · Location</th>
                <th className="th">Admin Contact</th>
                <th className="th">Submitted</th>
                <th className="th">License</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map(c => (
                <tr key={c.id} className="tr-hover">
                  {/* Health Center */}
                  <td className="td">
                    <div className="font-semibold text-white text-[13px]">{c.name}</div>
                    {c.email && (
                      <div className="text-xs text-gray-500 mt-0.5">{c.email}</div>
                    )}
                  </td>

                  {/* Specialty · Location */}
                  <td className="td">
                    <div className="text-gray-300 text-[13px]">{c.specialty || '—'}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {[c.city, c.state].filter(Boolean).join(', ') || '—'}
                    </div>
                  </td>

                  {/* Admin Contact */}
                  <td className="td">
                    <div className="text-gray-200 text-[13px]">{c.admin_name || '—'}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{c.admin_email}</div>
                    {c.admin_mobile && (
                      <div className="text-xs text-gray-600">{c.admin_mobile}</div>
                    )}
                  </td>

                  {/* Submitted */}
                  <td className="td whitespace-nowrap">
                    <span className="text-gray-400 text-[13px]">
                      {c.created_at
                        ? new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </span>
                  </td>

                  {/* License */}
                  <td className="td">
                    {c.license_document_url ? (
                      <a
                        href={c.license_document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#F5821E] hover:text-orange-300 transition-colors"
                      >
                        <FileText size={11} />
                        View
                        <ExternalLink size={10} />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-600">—</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="td">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setModal({ action: 'approve', clinic: c })}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-900/40 text-emerald-400 hover:bg-emerald-800/50 border border-emerald-800/50 transition-colors"
                      >
                        <CheckCircle size={12} />
                        Approve
                      </button>
                      <button
                        onClick={() => setModal({ action: 'reject', clinic: c })}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-900/30 text-red-400 hover:bg-red-800/40 border border-red-800/40 transition-colors"
                      >
                        <XCircle size={12} />
                        Reject
                      </button>
                      <Link
                        to={`/clinics/${c.id}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800 border border-gray-700 transition-colors"
                      >
                        <ExternalLink size={11} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ActionModal
        open={!!modal}
        onClose={() => setModal(null)}
        onConfirm={handleAction}
        action={modal?.action}
        clinicName={modal?.clinic?.name}
        loading={saving}
      />
    </div>
  )
}
