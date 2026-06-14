import { useState, useEffect } from 'react'
import { adminApi } from '../api'
import { CheckCircle, XCircle, FileText, ExternalLink } from 'lucide-react'

const ROLE_LABELS = { pharmacist: 'Pharmacist', lab_technician: 'Lab Technician', imaging_tech: 'Imaging Tech', nurse: 'Nurse' }

export default function StaffVerification() {
  const [staff, setStaff]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectComment, setRejectComment] = useState('')

  const load = () => {
    setLoading(true)
    adminApi.getPendingStaff().then(d => setStaff(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const handleVerify = async (id) => {
    setSaving(id)
    try { await adminApi.verifyStaff(id); load() } finally { setSaving(null) }
  }

  const handleReject = async () => {
    setSaving(rejectModal)
    try {
      await adminApi.rejectStaff(rejectModal, { comment: rejectComment })
      setRejectModal(null); setRejectComment(''); load()
    } finally { setSaving(null) }
  }

  return (
    <div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : staff.length === 0 ? (
        <div className="card-p text-center py-16">
          <CheckCircle size={40} className="mx-auto mb-3 text-emerald-500/30" />
          <p className="text-gray-400 font-medium">No pending staff verifications</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr>
                <th className="th">Name</th><th className="th">Role</th><th className="th">Clinic</th>
                <th className="th">License No.</th><th className="th">Contact</th><th className="th">Applied</th><th className="th">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-800">
                {staff.map(s => (
                  <tr key={s.id} className="tr-hover">
                    <td className="td font-medium text-white">{s.full_name}</td>
                    <td className="td">
                      <span className="badge badge-basic">{ROLE_LABELS[s.role] || s.role}</span>
                    </td>
                    <td className="td text-gray-400 text-sm">{s.clinic_name}</td>
                    <td className="td">
                      <div className="text-white text-sm">{s.license_number || <span className="text-gray-600">Not provided</span>}</div>
                      {s.license_document_url && (
                        <a href={s.license_document_url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 mt-0.5">
                          <FileText size={10} />View Doc <ExternalLink size={9} />
                        </a>
                      )}
                    </td>
                    <td className="td">
                      <div className="text-sm text-gray-300">{s.email}</div>
                      <div className="text-xs text-gray-500">{s.mobile}</div>
                    </td>
                    <td className="td text-xs text-gray-500">{new Date(s.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="td">
                      <div className="flex gap-2">
                        <button onClick={() => handleVerify(s.id)} disabled={saving === s.id} className="btn-success">
                          <CheckCircle size={12} />{saving === s.id ? '…' : 'Approve'}
                        </button>
                        <button onClick={() => setRejectModal(s.id)} className="btn-danger">
                          <XCircle size={12} />Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-white mb-3">Reject Staff</h3>
            <p className="text-gray-400 text-sm mb-3">Provide a reason for rejection (optional):</p>
            <textarea className="input resize-none mb-4" rows={3} value={rejectComment}
              onChange={e => setRejectComment(e.target.value)} placeholder="e.g. License number invalid, document unclear..." />
            <div className="flex gap-3">
              <button onClick={() => { setRejectModal(null); setRejectComment('') }} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleReject} disabled={!!saving} className="btn-danger flex-1 justify-center">
                {saving ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
