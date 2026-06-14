import { useState, useEffect } from 'react'
import { adminApi } from '../api'
import { Link } from 'react-router-dom'
import { CheckCircle, XCircle, Clock, FileText, ExternalLink } from 'lucide-react'
import ActionModal from '../components/ActionModal'

export default function PendingClinics() {
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null) // { action, clinic }
  const [saving, setSaving]   = useState(false)

  const load = () => {
    setLoading(true)
    adminApi.getPending().then(d => setClinics(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleAction = async ({ reason, comment }) => {
    setSaving(true)
    try {
      if (modal.action === 'approve') await adminApi.approve(modal.clinic.id)
      if (modal.action === 'reject')  await adminApi.reject(modal.clinic.id, { reason: comment, comment })
      setModal(null)
      load()
    } finally { setSaving(false) }
  }

  return (
    <div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : clinics.length === 0 ? (
        <div className="card-p text-center py-16">
          <CheckCircle size={40} className="mx-auto mb-3 text-emerald-500/30" />
          <p className="text-gray-400 font-medium">All caught up — no pending approvals</p>
        </div>
      ) : (
        <div className="space-y-4">
          {clinics.map(c => (
            <div key={c.id} className="card-p">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-white text-lg">{c.name}</h3>
                    <span className="badge badge-pending"><Clock size={10} className="mr-1" />Pending</span>
                  </div>
                  <div className="text-sm text-gray-400 mb-3">{c.specialty} · {c.city}, {c.state}</div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Clinic Admin</div>
                      <div className="text-white">{c.admin_name}</div>
                      <div className="text-gray-400">{c.admin_email}</div>
                      <div className="text-gray-400">{c.admin_mobile}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Contact</div>
                      <div className="text-gray-400">{c.phone}</div>
                      <div className="text-gray-400">{c.email}</div>
                      <div className="text-gray-500 text-xs mt-1">Registered {new Date(c.created_at).toLocaleDateString('en-IN')}</div>
                    </div>
                  </div>

                  {c.license_document_url && (
                    <a href={c.license_document_url} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 mt-3">
                      <FileText size={12} />View License Document <ExternalLink size={10} />
                    </a>
                  )}
                </div>

                <div className="flex md:flex-col gap-2">
                  <button onClick={() => setModal({ action: 'approve', clinic: c })} className="btn-success">
                    <CheckCircle size={14} />Approve
                  </button>
                  <button onClick={() => setModal({ action: 'reject', clinic: c })} className="btn-danger">
                    <XCircle size={14} />Reject
                  </button>
                  <Link to={`/clinics/${c.id}`} className="btn-secondary text-xs py-1.5">
                    <ExternalLink size={12} />Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
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
