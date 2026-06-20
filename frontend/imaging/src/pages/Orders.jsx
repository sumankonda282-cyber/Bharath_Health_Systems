import { useState, useEffect, useRef } from 'react'
import api from '../api/client'
import {
  ScanLine, Loader2, AlertCircle, X, ChevronDown, ChevronUp,
  Printer, Upload, CheckCircle, AlertTriangle, Camera,
} from 'lucide-react'

const STATUS_TABS = ['all', 'pending', 'scheduled', 'acquired', 'pending_review', 'signed']

const STATUS_BADGE = {
  pending:        { bg: '#fef9c3', color: '#854d0e', label: 'Pending' },
  scheduled:      { bg: '#ede9fe', color: '#6d28d9', label: 'Scheduled' },
  acquired:       { bg: '#dbeafe', color: '#1e40af', label: 'Acquired' },
  pending_review: { bg: '#fed7aa', color: '#9a3412', label: 'Pending Review' },
  signed:         { bg: '#dcfce7', color: '#166534', label: 'Signed' },
  cancelled:      { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
}

const MODALITY_COLOR = {
  CT: '#0F2557', MR: '#7c3aed', MRI: '#7c3aed',
  CR: '#0369a1', DX: '#0369a1', US: '#059669',
  NM: '#b45309', PT: '#dc2626', MG: '#be185d',
  RF: '#0891b2', XA: '#6d28d9', OT: '#6b7280',
}

const MODALITY_LABELS = {
  CR: 'X-Ray', DX: 'X-Ray (Digital)', CT: 'CT Scan',
  MR: 'MRI', MRI: 'MRI', US: 'Ultrasound', NM: 'Nuclear Medicine',
  PT: 'PET Scan', MG: 'Mammography', RF: 'Fluoroscopy',
  XA: 'Angiography', OT: 'Other',
}

function modalityLabel(m) {
  if (!m) return '—'
  return MODALITY_LABELS[m] || m
}

function statusBadge(s) {
  const b = STATUS_BADGE[s] || { bg: '#f3f4f6', color: '#374151', label: s || '—' }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: b.bg, color: b.color }}>
      {b.label}
    </span>
  )
}

// ── Collection Sheet Print ────────────────────────────────────────────────────

function printCollectionSheet(order) {
  const win = window.open('', '_blank', 'width=800,height=600')
  const date = order.created_at ? new Date(order.created_at).toLocaleString('en-IN') : '—'
  win.document.write(`<!DOCTYPE html><html><head><title>Collection Sheet — ${order.order_id}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #111; }
  .header { text-align: center; margin-bottom: 24px; }
  .order-id { font-size: 48px; font-weight: 900; letter-spacing: 4px; color: #0F2557; border: 4px solid #0F2557; display: inline-block; padding: 8px 24px; border-radius: 8px; }
  .section { margin-top: 20px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  td { padding: 6px 10px; border: 1px solid #ddd; font-size: 14px; }
  td:first-child { font-weight: bold; width: 180px; background: #f8f9fa; }
  .instruction { margin-top: 24px; padding: 12px; background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; font-size: 13px; }
  .modality-tag { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 14px; color: white; background: #0F2557; }
  @media print { button { display: none; } }
</style></head><body>
<div class="header">
  <div style="font-size:22px;font-weight:bold;color:#CC1414;">Bharath Health Systems</div>
  <div style="font-size:16px;color:#0F2557;">Imaging Collection Sheet</div>
  <div style="margin-top:12px;"><span class="order-id">${order.order_id}</span></div>
  <div style="margin-top:8px;font-size:12px;color:#6b7280;">Generated: ${date}</div>
</div>
<div class="section">
  <table>
    <tr><td>Patient Name</td><td>${order.patient_name || '—'}</td></tr>
    <tr><td>Modality</td><td><span class="modality-tag">${order.modality || '—'}</span> ${modalityLabel(order.modality)}</td></tr>
    <tr><td>Body Part</td><td>${order.body_part || '—'}</td></tr>
    <tr><td>Study Description</td><td>${order.study_description || '—'}</td></tr>
    <tr><td>Priority</td><td style="font-weight:bold;color:${order.priority === 'urgent' ? '#dc2626' : '#166534'}">${order.priority || 'routine'}</td></tr>
    <tr><td>Clinical Notes</td><td>${order.clinical_notes || '—'}</td></tr>
    <tr><td>Order Date</td><td>${date}</td></tr>
  </table>
</div>
<div class="instruction">
  <strong>⚠ IMPORTANT:</strong> Enter the ORDER ID <strong>${order.order_id}</strong> into the
  <strong>AccessionNumber</strong> field in the DICOM modality / RIS before scanning.
  This links the scan to the correct patient record automatically.
</div>
<div style="margin-top:24px;text-align:center;">
  <button onclick="window.print()" style="padding:10px 32px;background:#0F2557;color:white;border:none;border-radius:8px;font-size:15px;cursor:pointer;">Print</button>
</div>
</body></html>`)
  win.document.close()
}

// ── Sign Modal ────────────────────────────────────────────────────────────────

function SignModal({ order, onClose, onSigned }) {
  const [findings, setFindings]     = useState('')
  const [impression, setImpression] = useState('')
  const [attested, setAttested]     = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const submit = async () => {
    if (!findings.trim() || !impression.trim()) { setError('Findings and impression are required.'); return }
    if (!attested) { setError('You must check the attestation box to sign.'); return }
    setSaving(true)
    setError('')
    try {
      await api.post(`/imaging-orders/${order.order_id}/sign`, { findings, impression })
      onSigned()
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,37,87,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-gray-100 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="font-bold text-base" style={{ color: '#0F2557' }}>Sign Imaging Report</h3>
            <p className="text-xs text-gray-500">{order.order_id} · {order.patient_name}</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <div className="overflow-y-auto px-6 py-4 flex-1 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Modality / Study</label>
            <div className="flex gap-2 items-center">
              <span className="px-2 py-0.5 rounded text-white text-xs font-bold" style={{ background: MODALITY_COLOR[order.modality] || '#6b7280' }}>
                {order.modality || '—'}
              </span>
              <span className="text-sm text-gray-600">{modalityLabel(order.modality)} · {order.body_part || '—'}</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Findings <span className="text-red-500">*</span></label>
            <textarea
              rows={5}
              value={findings}
              onChange={e => setFindings(e.target.value)}
              placeholder="Describe radiological findings in detail…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': '#0F2557' }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Impression / Conclusion <span className="text-red-500">*</span></label>
            <textarea
              rows={3}
              value={impression}
              onChange={e => setImpression(e.target.value)}
              placeholder="Summary impression and clinical correlation…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': '#0F2557' }}
            />
          </div>
          <label className="flex items-start gap-3 p-3 rounded-xl border border-blue-200 bg-blue-50 cursor-pointer">
            <input type="checkbox" checked={attested} onChange={e => setAttested(e.target.checked)} className="mt-0.5 accent-blue-700" />
            <span className="text-xs text-blue-800">
              I attest that I have personally reviewed these images and this report accurately reflects my professional interpretation.
              This digital attestation is equivalent to my physical signature under the Information Technology Act, 2000.
            </span>
          </label>
          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            onClick={submit}
            disabled={saving || !attested}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: '#0F2557' }}
          >
            {saving ? <Loader2 size={15} className="animate-spin inline mr-1" /> : null}
            Sign & Attest Report
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PDF / Image Upload Modal ──────────────────────────────────────────────────

function UploadModal({ order, onClose, onUploaded }) {
  const [file, setFile]     = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const inputRef            = useRef()

  const handleFile = e => {
    const f = e.target.files[0]
    if (!f) return
    const allowed = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowed.includes(f.type)) { setError('Only PDF, JPG, or PNG files are allowed.'); return }
    if (f.size > 20 * 1024 * 1024) { setError('File must be under 20 MB.'); return }
    setFile(f)
    setError('')
  }

  const submit = async () => {
    if (!file) { setError('Please select a file.'); return }
    setSaving(true)
    setError('')
    try {
      const reader = new FileReader()
      reader.onload = async ev => {
        const b64 = ev.target.result.split(',')[1]
        await api.post(`/imaging-orders/${order.order_id}/upload-pdf`, { pdf_b64: b64 })
        onUploaded()
      }
      reader.readAsDataURL(file)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,37,87,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="font-bold text-base" style={{ color: '#0F2557' }}>Upload Report</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <p className="text-sm text-gray-600">Upload a PDF or image of the radiology report for <strong>{order.order_id}</strong>.</p>
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-300 transition-colors"
          >
            <Upload size={28} className="mx-auto text-gray-300 mb-2" />
            {file
              ? <p className="text-sm font-medium text-gray-700">{file.name}</p>
              : <p className="text-sm text-gray-500">Click to select PDF, JPG, or PNG (max 20 MB)</p>}
          </div>
          <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFile} />
          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={saving || !file} className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: '#0F2557' }}>
            {saving ? <Loader2 size={14} className="animate-spin inline mr-1" /> : null}Upload
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Acquire Modal (Technician) ────────────────────────────────────────────────

function AcquireModal({ order, onClose, onAcquired }) {
  const [form, setForm] = useState({
    technician_notes: '',
    contrast_used: false,
    contrast_agent: '',
    contrast_volume_ml: '',
    radiation_dose_mgy: '',
    film_count: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit() {
    setSaving(true); setError('')
    try {
      const payload = {
        ...form,
        contrast_volume_ml: form.contrast_volume_ml ? parseFloat(form.contrast_volume_ml) : null,
        radiation_dose_mgy: form.radiation_dose_mgy ? parseFloat(form.radiation_dose_mgy) : null,
        film_count: form.film_count ? parseInt(form.film_count) : 0,
      }
      await api.post(`/imaging/orders/${order.id}/acquire`, payload)
      onAcquired()
    } catch(e) {
      setError(e.response?.data?.detail || e.message)
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box max-w-lg w-full">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Mark as Acquired</h2>
            <p className="text-xs text-gray-500 mt-0.5">Order {order.order_id} — {order.modality} {order.body_part || ''}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={18}/></button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="label">Technician Notes</label>
            <textarea className="input resize-none h-20" value={form.technician_notes} onChange={set('technician_notes')} placeholder="Patient positioning, cooperation, image quality..."/>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="contrast" checked={form.contrast_used}
              onChange={e => setForm(f => ({ ...f, contrast_used: e.target.checked }))} className="w-4 h-4 accent-blue-700"/>
            <label htmlFor="contrast" className="text-sm font-medium text-gray-700">Contrast Used</label>
          </div>
          {form.contrast_used && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Contrast Agent</label>
                <input className="input" value={form.contrast_agent} onChange={set('contrast_agent')} placeholder="e.g. Omnipaque 300"/>
              </div>
              <div>
                <label className="label">Volume (ml)</label>
                <input className="input" type="number" value={form.contrast_volume_ml} onChange={set('contrast_volume_ml')} placeholder="100"/>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Radiation Dose (mGy)</label>
              <input className="input" type="number" step="0.001" value={form.radiation_dose_mgy} onChange={set('radiation_dose_mgy')} placeholder="CT only"/>
            </div>
            <div>
              <label className="label">Film Count</label>
              <input className="input" type="number" value={form.film_count} onChange={set('film_count')} placeholder="0"/>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary gap-2">
            {saving ? <Loader2 size={15} className="animate-spin"/> : <Camera size={15}/>}
            {saving ? 'Saving...' : 'Mark Acquired'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Unmatched Queue ───────────────────────────────────────────────────────────

function UnmatchedQueue({ onResolved }) {
  const [rows, setRows]   = useState([])
  const [open, setOpen]   = useState(false)
  const [inputs, setInputs] = useState({})
  const [saving, setSaving] = useState(null)

  useEffect(() => {
    api.get('/imaging-orders/unmatched').then(r => setRows(Array.isArray(r) ? r : [])).catch(() => {})
  }, [])

  if (!rows.length) return null

  const resolve = async (id) => {
    const orderId = inputs[id]?.trim()
    if (!orderId) return
    setSaving(id)
    try {
      await api.post('/imaging-orders/unmatched/resolve', { unmatched_id: id, imaging_order_id: orderId })
      setRows(r => r.filter(x => x.id !== id))
      onResolved()
    } catch (e) {
      alert(e.response?.data?.detail || 'Could not resolve')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-yellow-300 bg-yellow-50 overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 px-4 py-3 text-left">
        <AlertTriangle size={16} className="text-yellow-600" />
        <span className="text-sm font-semibold text-yellow-800">{rows.length} unmatched imaging result{rows.length > 1 ? 's' : ''} — manual linking required</span>
        {open ? <ChevronUp size={14} className="ml-auto text-yellow-600" /> : <ChevronDown size={14} className="ml-auto text-yellow-600" />}
      </button>
      {open && (
        <div className="border-t border-yellow-200 divide-y divide-yellow-100">
          {rows.map(r => (
            <div key={r.id} className="px-4 py-3 flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-700">{r.source} · {r.raw_format}</p>
                <p className="text-xs text-gray-500">{r.patient_hint || 'No patient hint'} · {r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : ''}</p>
              </div>
              <input
                value={inputs[r.id] || ''}
                onChange={e => setInputs(p => ({ ...p, [r.id]: e.target.value }))}
                placeholder="IMG-XXXXX"
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm w-32"
              />
              <button
                onClick={() => resolve(r.id)}
                disabled={saving === r.id}
                className="px-3 py-1 rounded-lg text-xs font-bold text-white"
                style={{ background: '#0F2557' }}
              >
                {saving === r.id ? <Loader2 size={12} className="animate-spin inline" /> : 'Link'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Order Row ─────────────────────────────────────────────────────────────────

function OrderRow({ order, onAction }) {
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [modal, setModal]       = useState(null) // 'sign' | 'upload'

  const toggleExpand = async () => {
    if (!expanded && !detail) {
      setLoading(true)
      try {
        const r = await api.get(`/imaging-orders/${order.order_id}`)
        setDetail(r)
      } catch {}
      setLoading(false)
    }
    setExpanded(e => !e)
  }

  const modColor = MODALITY_COLOR[order.modality] || '#6b7280'

  return (
    <>
      {modal === 'sign' && <SignModal order={order} onClose={() => setModal(null)} onSigned={() => { setModal(null); setDetail(null); onAction() }} />}
      {modal === 'upload' && <UploadModal order={order} onClose={() => setModal(null)} onUploaded={() => { setModal(null); setDetail(null); onAction() }} />}
      {modal === 'acquire' && <AcquireModal order={order} onClose={() => setModal(null)} onAcquired={() => { setModal(null); setDetail(null); onAction() }} />}

      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3">
          <button onClick={toggleExpand} className="flex items-center gap-1 text-xs font-mono font-bold hover:underline" style={{ color: '#0F2557' }}>
            {order.order_id}
            {loading ? <Loader2 size={12} className="animate-spin" /> : expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </td>
        <td className="px-4 py-3 text-sm font-medium text-gray-700">{order.patient_name || '—'}</td>
        <td className="px-4 py-3">
          <span className="px-2 py-0.5 rounded text-white text-xs font-bold" style={{ background: modColor }}>
            {order.modality || '—'}
          </span>
          <span className="ml-1 text-xs text-gray-500">{order.body_part || ''}</span>
        </td>
        <td className="px-4 py-3 text-xs text-gray-600">{order.study_description || '—'}</td>
        <td className="px-4 py-3">
          <span className={`text-xs font-bold ${order.priority === 'urgent' ? 'text-red-600' : 'text-gray-500'}`}>
            {order.priority || 'routine'}
          </span>
        </td>
        <td className="px-4 py-3">{statusBadge(order.status)}</td>
        <td className="px-4 py-3">
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => printCollectionSheet(order)} title="Print collection sheet" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <Printer size={14} />
            </button>
            {(order.status === 'pending' || order.status === 'scheduled') && (
              <button onClick={() => setModal('acquire')} title="Mark acquired" className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-600">
                <Camera size={14} />
              </button>
            )}
            {order.status !== 'signed' && (
              <button onClick={() => setModal('upload')} title="Upload report" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600">
                <Upload size={14} />
              </button>
            )}
            {order.result_status === 'pending_review' && (
              <button onClick={() => setModal('sign')} title="Sign report" className="p-1.5 rounded-lg hover:bg-green-50 text-green-700">
                <CheckCircle size={14} />
              </button>
            )}
            {order.status === 'signed' && (
              <span className="flex items-center gap-0.5 text-green-700 text-xs font-semibold">
                <CheckCircle size={12} /> Signed
              </span>
            )}
          </div>
        </td>
      </tr>

      {expanded && detail && (
        <tr className="bg-gray-50">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Order Details</p>
                <table className="text-xs w-full">
                  <tbody>
                    {[
                      ['Order ID', detail.order_id],
                      ['Patient', detail.patient_name],
                      ['Modality', `${detail.modality || '—'} — ${modalityLabel(detail.modality)}`],
                      ['Body Part', detail.body_part || '—'],
                      ['Study Description', detail.study_description || '—'],
                      ['Priority', detail.priority],
                      ['Status', detail.status],
                      ['Created', detail.created_at ? new Date(detail.created_at).toLocaleString('en-IN') : '—'],
                    ].map(([k, v]) => (
                      <tr key={k}><td className="py-0.5 text-gray-500 w-36">{k}</td><td className="py-0.5 font-medium text-gray-700">{v}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {detail.result && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Report</p>
                  <table className="text-xs w-full">
                    <tbody>
                      {[
                        ['Result Status', detail.result.status],
                        ['Source', detail.result.source],
                        ['Findings', detail.result.findings || '—'],
                        ['Impression', detail.result.impression || '—'],
                        ['Signed At', detail.result.signed_at ? new Date(detail.result.signed_at).toLocaleString('en-IN') : '—'],
                        ['Report Hash', detail.result.report_hash ? detail.result.report_hash.substring(0, 16) + '…' : '—'],
                        ['Has PDF', detail.result.has_pdf ? 'Yes' : 'No'],
                      ].map(([k, v]) => (
                        <tr key={k}><td className="py-0.5 text-gray-500 w-32">{k}</td><td className="py-0.5 font-medium text-gray-700 break-all">{v}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Orders() {
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [tab, setTab]         = useState('all')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const params = tab !== 'all' ? { params: { status: tab } } : {}
      const r = await api.get('/imaging-orders', params)
      setOrders(Array.isArray(r) ? r : [])
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [tab])

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <ScanLine size={22} style={{ color: '#0F2557' }} />
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: '#0F2557' }}>Imaging Orders</h1>
          <p className="text-xs text-gray-500">Review, upload reports, sign and release to patients</p>
        </div>
      </div>

      <UnmatchedQueue onResolved={load} />

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {STATUS_TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={tab === t ? { background: '#0F2557', color: '#fff' } : { color: '#6b7280' }}
          >
            {t === 'all' ? 'All' : t === 'pending_review' ? 'Pending Review' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
          <Loader2 size={20} className="animate-spin" /> Loading orders…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-3 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <ScanLine size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No imaging orders found.</p>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-semibold">Order ID</th>
                <th className="px-4 py-3 text-left font-semibold">Patient</th>
                <th className="px-4 py-3 text-left font-semibold">Modality</th>
                <th className="px-4 py-3 text-left font-semibold">Study</th>
                <th className="px-4 py-3 text-left font-semibold">Priority</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => <OrderRow key={o.id} order={o} onAction={load} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
