import { CheckCircle2, User, Clock } from 'lucide-react'

export default function SignatureBlock({ verifiedIdentity, signed, signedAt }) {
  if (!signed || !verifiedIdentity) return null
  return (
    <div className="mt-4 flex items-center gap-3 p-3 rounded-xl border"
      style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
      <CheckCircle2 size={16} style={{ color: '#065F46' }} className="flex-shrink-0" />
      <div className="text-xs text-green-800">
        <span className="font-semibold flex items-center gap-1">
          <User size={11} />
          {verifiedIdentity.full_name || verifiedIdentity}
        </span>
        {signedAt && (
          <span className="flex items-center gap-1 text-green-700 mt-0.5">
            <Clock size={11} />
            {new Date(signedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        )}
      </div>
    </div>
  )
}
