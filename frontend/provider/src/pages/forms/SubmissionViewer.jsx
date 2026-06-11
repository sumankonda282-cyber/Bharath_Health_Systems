import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Printer, AlertTriangle, CheckCircle2,
  PenSquare, Loader2, User, Calendar, ShieldCheck
} from 'lucide-react'
import api from '../../api/client'

function ScoreCard({ score }) {
  const band = score.band || {}
  const colorMap = {
    normal: 'bg-green-50 border-green-200 text-green-800',
    mild: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    moderate: 'bg-orange-50 border-orange-200 text-orange-800',
    severe: 'bg-red-50 border-red-200 text-red-800',
    critical: 'bg-red-100 border-red-400 text-red-900',
  }
  const cls = colorMap[band.severity?.toLowerCase()] || 'bg-gray-50 border-gray-200 text-gray-800'
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide opacity-70">{score.name}</p>
          <p className="text-3xl font-bold mt-1">{score.value}</p>
        </div>
        {band.label && (
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${cls}`}>{band.label}</span>
        )}
      </div>
      {band.interpretation && <p className="text-sm mt-2 opacity-80">{band.interpretation}</p>}
    </div>
  )
}

function FieldValueDisplay({ field, value }) {
  if (value === undefined || value === null || value === '') {
    return <span className="text-gray-400 italic text-sm">Not answered</span>
  }
  if (Array.isArray(value)) {
    return <span className="text-sm text-gray-700">{value.join(', ')}</span>
  }
  if (typeof value === 'object' && value.dataUrl) {
    return (
      <div>
        <img src={value.dataUrl} alt="signature" className="border border-gray-200 rounded-lg max-h-20" />
        {value.timestamp && <p className="text-xs text-gray-400 mt-1">Signed {new Date(value.timestamp).toLocaleString()}</p>}
      </div>
    )
  }
  if (typeof value === 'object' && value.typed) {
    return (
      <div>
        <p className="font-serif text-lg italic text-gray-700">{value.typed}</p>
        {value.timestamp && <p className="text-xs text-gray-400">Signed {new Date(value.timestamp).toLocaleString()}</p>}
      </div>
    )
  }
  if (typeof value === 'object') {
    return <span className="text-sm text-gray-700">{JSON.stringify(value)}</span>
  }
  return <span className="text-sm text-gray-700">{String(value)}</span>
}

export default function SubmissionViewer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [submission, setSubmission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [ackLoading, setAckLoading] = useState({})
  const [cosignLoading, setCosignLoading] = useState(false)
  const [cosignDone, setCosignDone] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/provider/forms/submissions/${id}`)
        setSubmission(res.data)
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load submission')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const acknowledgeAlert = async (alertId) => {
    setAckLoading(a => ({ ...a, [alertId]: true }))
    try {
      await api.post(`/provider/forms/alerts/${alertId}/acknowledge`)
      setSubmission(s => ({
        ...s,
        alerts_fired: s.alerts_fired.map(a => a.id === alertId ? { ...a, acknowledged: true } : a)
      }))
    } catch {}
    setAckLoading(a => ({ ...a, [alertId]: false }))
  }

  const requestCosign = async () => {
    setCosignLoading(true)
    try {
      await api.post(`/provider/forms/cosign/${id}`)
      setCosignDone(true)
    } catch {}
    setCosignLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 size={36} className="animate-spin text-[#0F2557]" />
      </div>
    )
  }

  if (error || !submission) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <AlertTriangle size={40} className="text-red-400 mx-auto mb-3" />
          <p className="text-gray-600">{error || 'Submission not found'}</p>
          <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-[#0F2557] text-white rounded-xl text-sm">Go Back</button>
        </div>
      </div>
    )
  }

  const sections = submission.form?.sections || submission.sections || []
  const scores = submission.scores || []
  const alertsFired = submission.alerts_fired || []
  const cosign = submission.cosign_status

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm print:static print:shadow-none">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 transition print:hidden">
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-[#0F2557]">{submission.form_title || submission.form?.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
              <span className="flex items-center gap-1">
                <User size={12} />
                {submission.patient_name}
                {submission.bhid && <span className="font-mono text-gray-400">#{submission.bhid}</span>}
              </span>
              <span className="flex items-center gap-1">
                <PenSquare size={12} />
                Submitted by {submission.submitted_by_name || 'Provider'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {new Date(submission.submitted_at || submission.created_at).toLocaleString()}
              </span>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition print:hidden"
          >
            <Printer size={14} />
            Print
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Scores */}
        {scores.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Assessment Scores</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {scores.map((sc, i) => <ScoreCard key={i} score={sc} />)}
            </div>
          </div>
        )}

        {/* Alerts */}
        {alertsFired.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-1">
              <AlertTriangle size={14} /> Critical Alerts
            </h2>
            <div className="space-y-2">
              {alertsFired.map((alert, i) => {
                const sevCls = {
                  critical: 'bg-red-50 border-red-400',
                  high: 'bg-orange-50 border-orange-300',
                  medium: 'bg-yellow-50 border-yellow-300',
                }[alert.severity?.toLowerCase()] || 'bg-yellow-50 border-yellow-300'
                return (
                  <div key={i} className={`rounded-xl border p-4 ${sevCls}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="text-red-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{alert.field_label || alert.field_id}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{alert.message}</p>
                          {alert.value !== undefined && <p className="text-xs text-gray-500 mt-0.5">Value: <strong>{String(alert.value)}</strong></p>}
                        </div>
                      </div>
                      {!alert.acknowledged ? (
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          disabled={ackLoading[alert.id]}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-white border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-60"
                        >
                          {ackLoading[alert.id] ? 'Acknowledging...' : 'Acknowledge'}
                        </button>
                      ) : (
                        <span className="shrink-0 flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 size={12} /> Acknowledged
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Form data */}
        {sections.map((section, si) => (
          <div key={si} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-[#0F2557] mb-5">
              {section.title || section.name || `Section ${si + 1}`}
            </h2>
            <div className="space-y-4">
              {(section.fields || []).map(field => {
                if (field.type === 'label') return <div key={field.id} className="text-sm font-semibold text-gray-700">{field.label}</div>
                if (field.type === 'divider') return <hr key={field.id} className="border-gray-200" />
                return (
                  <div key={field.id} className="grid grid-cols-3 gap-2 py-2 border-b border-gray-50 last:border-0">
                    <dt className="col-span-1 text-xs font-medium text-gray-500 self-start pt-0.5">{field.label}</dt>
                    <dd className="col-span-2">
                      <FieldValueDisplay field={field} value={submission.data?.[field.id]} />
                    </dd>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Co-sign section */}
        {submission.requires_cosign && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#0F2557]" />
              Co-sign Status
            </h2>
            {cosign?.signed ? (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-xl p-3">
                <CheckCircle2 size={16} />
                <span className="text-sm">Co-signed by {cosign.cosigned_by} on {new Date(cosign.cosigned_at).toLocaleString()}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Pending co-signature</p>
                {!cosignDone ? (
                  <button
                    onClick={requestCosign}
                    disabled={cosignLoading}
                    className="px-4 py-2 rounded-xl bg-[#0F2557] text-white text-sm font-medium hover:bg-[#0F2557]/90 transition disabled:opacity-60"
                  >
                    {cosignLoading ? 'Requesting...' : 'Request Co-sign'}
                  </button>
                ) : (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Request sent
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
