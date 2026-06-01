import { useState } from 'react'
import { X } from 'lucide-react'

const SUSPENSION_REASONS = [
  { value: 'license_cancelled', label: 'License Cancelled' },
  { value: 'payment_failed',    label: 'Payment Failed' },
  { value: 'compliance_issue',  label: 'Compliance Issue' },
  { value: 'other',             label: 'Other' },
]

export default function ActionModal({ open, onClose, onConfirm, action, clinicName, loading }) {
  const [reason, setReason]   = useState('')
  const [comment, setComment] = useState('')

  if (!open) return null

  const needsReason  = ['suspend', 'revoke', 'reject'].includes(action)
  const isOther      = reason === 'other'
  const actionLabels = {
    approve:    { label: 'Approve',    color: 'bg-emerald-600 hover:bg-emerald-500' },
    reject:     { label: 'Reject',     color: 'bg-red-600 hover:bg-red-500' },
    suspend:    { label: 'Suspend',    color: 'bg-amber-600 hover:bg-amber-500' },
    revoke:     { label: 'Revoke',     color: 'bg-red-700 hover:bg-red-600' },
    reactivate: { label: 'Reactivate', color: 'bg-emerald-600 hover:bg-emerald-500' },
  }
  const { label, color } = actionLabels[action] || { label: action, color: 'bg-indigo-600' }

  const handleSubmit = () => {
    if (needsReason && !reason) return
    onConfirm({ reason, comment })
    setReason(''); setComment('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">{label} — {clinicName}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>

        {needsReason && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 mb-1.5 block">Reason *</label>
              {action === 'reject' ? (
                <textarea
                  className="input resize-none"
                  rows={3}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Explain reason for rejection..."
                />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {SUSPENSION_REASONS.map(r => (
                      <button key={r.value} type="button"
                        onClick={() => setReason(r.value)}
                        className={`p-2.5 rounded-xl border text-sm font-medium text-left transition-all ${reason === r.value ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : 'border-gray-700 text-gray-400 hover:border-gray-600'}`}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                  {isOther && (
                    <textarea
                      className="input resize-none mt-3"
                      rows={3}
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Describe the reason..."
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {action === 'approve' && (
          <p className="text-gray-400 text-sm">This clinic will go live and clinic admin will be able to login.</p>
        )}
        {action === 'reactivate' && (
          <p className="text-gray-400 text-sm">This will restore access for the clinic and their staff.</p>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading || (needsReason && action !== 'reject' && !reason)}
            className={`flex-1 justify-center inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-xl transition-colors ${color} disabled:opacity-50`}>
            {loading ? 'Processing…' : label}
          </button>
        </div>
      </div>
    </div>
  )
}
