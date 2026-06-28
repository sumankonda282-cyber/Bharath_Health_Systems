import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, Printer, AlertTriangle, CheckCircle2,
  PenSquare, Loader2, User, Calendar, ShieldCheck,
  Edit3, Ban, History, MessageSquarePlus, X, Send, Clock
} from 'lucide-react'
import api from '../../api/client'
import { LangContext, FieldRenderer, isFieldVisible } from './formEngine'

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
  // Medication order (the medication_order smart field) → clean Rx summary.
  if (typeof value === 'object' && (value.drug || value.generic) && (field?.type === 'medication_order' || value.dose_label || value.frequency)) {
    const tail = [
      value.dose_label || (value.strength ? `${value.quantity ?? ''} ${value.form || ''} (${value.strength} mg)`.trim() : null),
      value.frequency,
      value.duration_days ? `${value.duration_days} days` : null,
      value.route,
    ].filter(Boolean)
    return (
      <div className="text-sm text-gray-700">
        <span className="font-medium">{value.drug || value.generic}</span>
        {tail.length > 0 && <span> — {tail.join(', ')}</span>}
        {value.instructions && <p className="text-xs text-gray-500 mt-0.5">{value.instructions}</p>}
      </div>
    )
  }
  // Search-field selections store { display, code, … }.
  if (typeof value === 'object' && (value.display || value.label || value.name)) {
    return <span className="text-sm text-gray-700">{value.display || value.label || value.name}</span>
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
  const [formSchema, setFormSchema] = useState(null)
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [ackLoading, setAckLoading] = useState({})
  const [cosignLoading, setCosignLoading] = useState(false)
  const [cosignDone, setCosignDone] = useState(false)

  // Amendment UI state
  const [showAmend, setShowAmend]       = useState(false)
  const [showInError, setShowInError]   = useState(false)
  const [commentText, setCommentText]   = useState('')
  const [commentFlag, setCommentFlag]   = useState('')
  const [commentBusy, setCommentBusy]   = useState(false)

  const loadSubmission = useCallback(async () => {
    const res = await api.get(`/submissions/${id}`)
    setSubmission(res)
    return res
  }, [id])

  const loadHistory = useCallback(async () => {
    try { setHistory(await api.get(`/submissions/${id}/history`)) } catch { /* non-critical */ }
  }, [id])

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const res = await api.get(`/submissions/${id}`)
        if (!alive) return
        setSubmission(res)
        if (res?.form_id) {
          try {
            const f = await api.get(`/assessment-forms/${res.form_id}`)
            if (alive) setFormSchema(f?.schema || null)
          } catch { /* schema is best-effort */ }
        }
        try {
          const h = await api.get(`/submissions/${id}/history`)
          if (alive) setHistory(h)
        } catch { /* non-critical */ }
      } catch (err) {
        if (alive) setError(err?.message || 'Failed to load submission')
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [id])

  const submitComment = async () => {
    const text = commentText.trim()
    if (!text) return
    setCommentBusy(true)
    try {
      await api.post(`/submissions/${id}/comment`, { comment: text, flag: commentFlag || undefined })
      setCommentText(''); setCommentFlag('')
      await loadSubmission(); await loadHistory()
    } catch (err) {
      alert(err?.response?.data?.detail || 'Failed to add comment')
    } finally {
      setCommentBusy(false)
    }
  }

  const handleInErrorDone = async () => {
    setShowInError(false)
    await loadSubmission(); await loadHistory()
  }

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
      await api.patch(`/submissions/${id}/cosign`)
      setCosignDone(true)
    } catch {}
    setCosignLoading(false)
  }

  const exportPDF = async () => {
    try {
      const res = await api.get(`/provider/forms/submissions/${id}/pdf-data`)
      const d = res
      const sections = d.sections || []
      const scores = d.scores || []
      const alerts = d.alerts || []

      const fmtPrint = (v) => {
        if (v === undefined || v === null || v === '') return '—'
        if (Array.isArray(v)) return v.join(', ')
        if (typeof v === 'object') {
          if (v.drug || v.generic) {
            const tail = [
              v.dose_label || (v.strength ? `${v.quantity ?? ''} ${v.form || ''} (${v.strength} mg)`.trim() : ''),
              v.frequency, v.duration_days ? `${v.duration_days} days` : '', v.route,
            ].filter(Boolean)
            return `${v.drug || v.generic}${tail.length ? ' — ' + tail.join(', ') : ''}${v.instructions ? ' | ' + v.instructions : ''}`
          }
          if (v.display || v.label || v.name) return v.display || v.label || v.name
          return JSON.stringify(v)
        }
        return String(v)
      }

      const sectionsHtml = sections.map(section => `
        <h3 style="font-size:14px;font-weight:bold;color:#0F2557;margin:16px 0 6px;">${section.title || ''}</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
          ${(section.fields || []).map(f => `
            <tr>
              <td style="padding:6px 8px;border:1px solid #e5e7eb;width:35%;font-size:12px;font-weight:600;color:#374151;background:#f9fafb;">${f.label}</td>
              <td style="padding:6px 8px;border:1px solid #e5e7eb;font-size:12px;color:#111827;">${fmtPrint(f.value)}</td>
            </tr>
          `).join('')}
        </table>
      `).join('')

      const scoresHtml = scores.length > 0 ? `
        <div style="margin-top:16px;padding:12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;">
          <h3 style="font-size:13px;font-weight:bold;color:#0369a1;margin:0 0 8px;">Assessment Scores</h3>
          ${scores.map(sc => `<p style="margin:4px 0;font-size:12px;color:#0c4a6e;"><strong>${sc.name}:</strong> ${sc.value}${sc.band?.label ? ` — ${sc.band.label}` : ''}</p>`).join('')}
        </div>
      ` : ''

      const alertsHtml = alerts.length > 0 ? `
        <div style="margin-top:16px;padding:12px;background:#fff1f2;border:1px solid #fecdd3;border-radius:6px;">
          <h3 style="font-size:13px;font-weight:bold;color:#be123c;margin:0 0 8px;">Critical Alerts</h3>
          ${alerts.map(a => `<p style="margin:4px 0;font-size:12px;color:#881337;"><strong>${a.field_label || a.field_id}:</strong> ${a.message}</p>`).join('')}
        </div>
      ` : ''

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${d.form_title || 'Clinical Report'}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #fff; color: #111; margin: 0; padding: 24px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div style="border-bottom:2px solid #0F2557;padding-bottom:12px;margin-bottom:16px;">
    <h1 style="font-size:20px;font-weight:bold;color:#0F2557;margin:0 0 4px;">${d.form_title || 'Clinical Report'}</h1>
    ${d.category ? `<p style="margin:2px 0;font-size:12px;color:#6b7280;">Category: ${d.category}</p>` : ''}
    ${d.patient_id ? `<p style="margin:2px 0;font-size:12px;color:#6b7280;">Patient ID: ${d.patient_id}</p>` : ''}
    ${d.submitted_at ? `<p style="margin:2px 0;font-size:12px;color:#6b7280;">Submitted: ${new Date(d.submitted_at).toLocaleString()}</p>` : ''}
    ${d.submitted_by ? `<p style="margin:2px 0;font-size:12px;color:#6b7280;">Submitted by: ${d.submitted_by}</p>` : ''}
  </div>
  ${sectionsHtml}
  ${scoresHtml}
  ${alertsHtml}
</body>
</html>`

      const win = window.open('', '_blank')
      win.document.write(html)
      win.document.close()
      win.focus()
      win.print()
      win.addEventListener('afterprint', () => win.close())
    } catch (err) {
      alert(err?.response?.data?.detail || 'PDF export failed. Please retry.')
    }
  }

  const downloadJson = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportFHIR = async () => {
    try {
      const res = await api.get(`/provider/forms/submissions/${id}/fhir`)
      downloadJson(res, `submission-${id}.fhir.json`)
    } catch (err) {
      alert(err?.response?.data?.detail || 'FHIR export failed. Please retry.')
    }
  }

  const exportABDM = async () => {
    try {
      const res = await api.get(`/provider/forms/submissions/${id}/abdm`)
      downloadJson(res, `submission-${id}.abdm.json`)
    } catch (err) {
      alert(err?.response?.data?.detail || 'ABDM export failed. Please retry.')
    }
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

  const sections = formSchema?.sections || submission.form?.sections || submission.sections || []
  const scores = submission.scores || []
  const alertsFired = submission.alerts_fired || []
  const cosign = submission.cosign_status
  const comments = submission.comments || []

  const recordStatus = submission.record_status || 'active'
  const isDraft   = submission.status === 'draft'
  const isActive  = recordStatus === 'active' && !isDraft
  const isInError = recordStatus === 'in_error'
  // The active (current) version in this chain, used to link from a superseded view.
  const currentVersion = (history?.versions || []).find(v => v.record_status === 'active')

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
          <div className="flex items-center gap-2 print:hidden">
            {isActive && (
              <>
                <button
                  onClick={() => setShowAmend(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 text-sm text-amber-700 hover:bg-amber-50 transition"
                >
                  <Edit3 size={14} />
                  Modify
                </button>
                <button
                  onClick={() => setShowInError(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-300 text-sm text-red-700 hover:bg-red-50 transition"
                >
                  <Ban size={14} />
                  Mark in error
                </button>
              </>
            )}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              <Printer size={14} />
              Print
            </button>
            <button
              onClick={exportPDF}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              Export PDF
            </button>
            <button
              onClick={exportFHIR}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 text-sm text-blue-600 hover:bg-blue-50 transition"
            >
              FHIR Export
            </button>
            <button
              onClick={exportABDM}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-green-200 text-sm text-green-600 hover:bg-green-50 transition"
            >
              ABDM Export
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Record-status banner (amendment lineage) */}
        {isInError && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4">
            <div className="flex items-start gap-2">
              <Ban size={18} className="text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-800">Charted in error</p>
                {submission.amend_reason && <p className="text-xs text-red-700 mt-0.5">Reason: {submission.amend_reason}</p>}
                {submission.amended_at && (
                  <p className="text-[11px] text-red-500 mt-0.5">
                    Uncharted by staff #{submission.amended_by} on {new Date(submission.amended_at).toLocaleString()}
                  </p>
                )}
                <p className="text-[11px] text-red-500 mt-0.5">This record is retained for audit but no longer counts clinically.</p>
              </div>
            </div>
          </div>
        )}
        {recordStatus === 'superseded' && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0">
              <History size={18} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-amber-800">Superseded version</p>
                <p className="text-xs text-amber-700 mt-0.5">This result was modified. You are viewing an earlier version.</p>
              </div>
            </div>
            {currentVersion && (
              <button
                onClick={() => navigate(`/forms/submission/${currentVersion.id}`)}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600"
              >
                View current version →
              </button>
            )}
          </div>
        )}
        {isActive && submission.amends_id && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 flex items-center gap-2">
            <Edit3 size={15} className="text-blue-600 shrink-0" />
            <p className="text-xs text-blue-700">
              Amended record{submission.amended_at ? ` · modified ${new Date(submission.amended_at).toLocaleString()}` : ''}
              {submission.amend_reason ? ` — ${submission.amend_reason}` : ''}
            </p>
          </div>
        )}

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

        {/* Comments / flags */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 print:hidden">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <MessageSquarePlus size={16} className="text-[#0F2557]" />
            Comments &amp; Flags
          </h2>
          {comments.length > 0 ? (
            <ul className="space-y-2 mb-4">
              {comments.map(c => (
                <li key={c.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.flag && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700">{c.flag}</span>
                    )}
                    <span className="text-sm text-gray-800">{c.comment}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {c.author_name || `Staff #${c.author_id}`}
                    {c.created_at ? ` · ${new Date(c.created_at).toLocaleString()}` : ''}
                    {c.field_id ? ` · on ${c.field_id}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 mb-4">No comments yet.</p>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={commentFlag}
              onChange={e => setCommentFlag(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 bg-white sm:w-40"
            >
              <option value="">No flag</option>
              <option value="abnormal">Abnormal</option>
              <option value="critical">Critical</option>
              <option value="follow-up">Follow-up</option>
              <option value="note">Note</option>
            </select>
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitComment() }}
              placeholder="Add a comment…"
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]/20"
            />
            <button
              onClick={submitComment}
              disabled={commentBusy || !commentText.trim()}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F2557] text-white text-sm font-medium hover:bg-[#0F2557]/90 transition disabled:opacity-50"
            >
              {commentBusy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Add
            </button>
          </div>
        </div>

        {/* Version history (audit lineage) */}
        {history?.versions?.length > 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 print:hidden">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <History size={16} className="text-[#0F2557]" />
              Version History
            </h2>
            <ol className="relative border-l border-gray-200 ml-2">
              {history.versions.map(v => {
                const badge = {
                  active:     'bg-green-100 text-green-700',
                  superseded: 'bg-amber-100 text-amber-700',
                  in_error:   'bg-red-100 text-red-700',
                }[v.record_status] || 'bg-gray-100 text-gray-600'
                const isThis = v.id === submission.id
                return (
                  <li key={v.id} className="ml-4 mb-4">
                    <span className="absolute -left-1.5 w-3 h-3 rounded-full" style={{ background: v.record_status === 'in_error' ? '#dc2626' : v.record_status === 'superseded' ? '#d97706' : '#16a34a' }} />
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${badge}`}>
                        {v.record_status === 'in_error' ? 'In error' : v.record_status}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock size={11} />
                        {v.submitted_at ? new Date(v.submitted_at).toLocaleString() : '—'}
                      </span>
                      <span className="text-[11px] text-gray-400">by staff #{v.signed_by || v.submitted_by}</span>
                      {isThis
                        ? <span className="text-[10px] font-semibold text-[#0F2557]">• viewing</span>
                        : <button onClick={() => navigate(`/forms/submission/${v.id}`)} className="text-[10px] font-semibold text-blue-600 hover:underline">view</button>}
                    </div>
                    {v.amend_reason && <p className="text-[11px] text-gray-500 mt-0.5">Reason: {v.amend_reason}</p>}
                    {(v.comments || []).map(c => (
                      <p key={c.id} className="text-[11px] text-gray-400 mt-0.5">💬 {c.flag ? `[${c.flag}] ` : ''}{c.comment}</p>
                    ))}
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </div>

      {showAmend && (
        <AmendModal
          submissionId={submission.id}
          sections={sections}
          initialData={submission.data || {}}
          formTitle={submission.form_title || submission.form?.title || 'Form'}
          onClose={() => setShowAmend(false)}
          onAmended={(newId) => { setShowAmend(false); navigate(`/forms/submission/${newId}`) }}
        />
      )}
      {showInError && (
        <InErrorModal
          submissionId={submission.id}
          onClose={() => setShowInError(false)}
          onDone={handleInErrorDone}
        />
      )}
    </div>
  )
}

// ─── Modify (amend) modal — edits a copy and signs it as a new version ─────────
function AmendModal({ submissionId, sections, initialData, formTitle, onClose, onAmended }) {
  const [values, setValues] = useState({ ...initialData })
  const [reason, setReason] = useState('')
  const [busy, setBusy]     = useState(false)
  const [err, setErr]       = useState(null)

  const setField = (fid, val) => setValues(v => ({ ...v, [fid]: val }))

  const submit = async () => {
    if (!reason.trim()) { setErr('An amendment reason is required.'); return }
    setBusy(true); setErr(null)
    try {
      const res = await api.post(`/submissions/${submissionId}/amend`, {
        form_data: values,
        reason:    reason.trim(),
      })
      onAmended(res?.submission_id)
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || 'Amendment failed')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,37,87,0.6)' }}>
      <div className="flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: '70vw', maxWidth: 900, height: '85vh' }}>
        <div className="flex items-center justify-between px-6 py-3.5 border-b" style={{ background: '#0F2557' }}>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300">Modify result</span>
            <span className="text-base font-extrabold text-white leading-tight">{formTitle}</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-300 hover:text-white hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        <LangContext.Provider value={{ lang: 'en', translations: null }}>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="max-w-4xl mx-auto space-y-6">
              {sections.map((section, si) => (
                <div key={section.id || si}>
                  <h3 className="text-base font-bold text-[#0F2557] mb-4">{section.title || section.name || `Section ${si + 1}`}</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {(section.fields || []).map(field => {
                      if (!isFieldVisible(field, values)) return null
                      return (
                        <FieldRenderer
                          key={field.id}
                          field={field}
                          value={values[field.id]}
                          onChange={v => setField(field.id, v)}
                          allValues={values}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </LangContext.Provider>

        <div className="border-t px-6 py-3.5 space-y-2" style={{ background: '#f9fafb' }}>
          <div>
            <label className="text-xs font-semibold text-gray-600">Reason for amendment <span className="text-red-500">*</span></label>
            <input
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. transcription error — corrected BP"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2557]/20"
            />
          </div>
          {err && <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle size={13} />{err}</p>}
          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={submit} disabled={busy}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60" style={{ background: '#059669' }}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {busy ? 'Saving…' : 'Sign amended version'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Chart-in-error (unchart) modal — reason required ─────────────────────────
function InErrorModal({ submissionId, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy]     = useState(false)
  const [err, setErr]       = useState(null)

  const submit = async () => {
    if (!reason.trim()) { setErr('A reason is required.'); return }
    setBusy(true); setErr(null)
    try {
      await api.post(`/submissions/${submissionId}/in-error`, { reason: reason.trim() })
      onDone()
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || 'Action failed')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,37,87,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3.5 border-b bg-red-600">
          <span className="text-base font-extrabold text-white flex items-center gap-2"><Ban size={18} /> Chart in error</span>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-red-100 hover:text-white hover:bg-white/10">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm text-gray-600">
            This marks the result as charted in error. It is kept for audit but will no longer
            count clinically, trend on the flowsheet, or raise alerts. This cannot be undone.
          </p>
          <div>
            <label className="text-xs font-semibold text-gray-600">Reason <span className="text-red-500">*</span></label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. recorded on the wrong patient"
              className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
            />
          </div>
          {err && <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle size={13} />{err}</p>}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={submit} disabled={busy}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
              {busy ? 'Marking…' : 'Confirm in error'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
