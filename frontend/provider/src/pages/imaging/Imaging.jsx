import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { imagingApi } from '../../api'
import { PageLoader } from '../../components/ui/Spinner'
import { Scan, ChevronDown, ChevronRight, Search, X, CheckCircle, Printer, Code, FileText, AlertTriangle, ImageIcon } from 'lucide-react'
import { format } from 'date-fns'

const STATUS_META = {
  ordered:        { label: 'Ordered',        cls: 'badge-yellow' },
  pending:        { label: 'Ordered',        cls: 'badge-yellow' },
  scheduled:      { label: 'Scheduled',      cls: 'badge-blue'   },
  acquired:       { label: 'Acquired',       cls: 'badge-blue'   },
  processing:     { label: 'Processing',     cls: 'badge-purple' },
  in_progress:    { label: 'Reporting',      cls: 'badge-purple' },
  pending_review: { label: 'Pending Review', cls: 'badge-purple' },
  completed:      { label: 'Completed',      cls: 'badge-green'  },
  signed:         { label: 'Signed',         cls: 'badge-green'  },
  cancelled:      { label: 'Cancelled',      cls: 'badge-gray'   },
}

const ageSex = (age, gender) => {
  const g = gender ? gender[0].toUpperCase() : ''
  if (age == null && !g) return '—'
  return `${age ?? '—'}${g ? ` / ${g}` : ''}`
}

const studyLabel = (o) => [o.modality, o.body_part].filter(Boolean).join(' · ') || o.study_description || 'Imaging study'
const isViewableImage = (s) => typeof s === 'string' && /^(https?:|data:image|\/)/i.test(s.trim())
const parseImages = (text) => (text || '').split(/[\n,]+/).map(s => s.trim()).filter(Boolean)

function buildReport(group) {
  return {
    patient: {
      name: group.name, mrn: group.mrn || null, uhid: group.uhid || null,
      age: group.age ?? null, gender: group.gender || null, mobile: group.mobile || null,
    },
    health_center_id: group.hc_id || null,
    generated_at: new Date().toISOString(),
    study_count: group.orders.length,
    studies: group.orders.map(o => ({
      order_no:   o.order_no || `IMG-${o.id}`,
      modality:   o.modality || null,
      body_part:  o.body_part || null,
      status:     o.status,
      priority:   o.priority || 'routine',
      condition:  o.clinical_notes || o.condition || null,
      ordered_by: o.ordered_by || o.doctor_name || null,
      ordered_at: o.created_at || null,
      findings:   o.findings || null,
      impression: o.impression || null,
      images:     Array.isArray(o.images) ? o.images : [],
      signed_at:  o.signed_at || null,
    })),
  }
}

// ── Detail modal: images + interpretation + extended JSON + print ──────────────
function ImagingDetailModal({ group, onClose }) {
  const [showJson, setShowJson] = useState(false)
  const report = buildReport(group)

  const printReport = () => {
    const esc = (s) => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
    const studies = report.studies.map(s => `
      <h3 style="margin:18px 0 4px">${esc(s.order_no)} · ${esc([s.modality, s.body_part].filter(Boolean).join(' · ') || 'Study')}
        <span style="font-weight:400;text-transform:capitalize;color:#555">— ${esc(s.status)}</span></h3>
      <div style="color:#555;font-size:12px;margin-bottom:6px">
        Ordered by ${esc(s.ordered_by || '—')} ${s.ordered_at ? '· ' + esc(new Date(s.ordered_at).toLocaleString('en-IN')) : ''}
        ${s.condition ? '<br/>Clinical indication: ' + esc(s.condition) : ''}
      </div>
      ${s.images.filter(isViewableImage).length ? `<div style="margin:8px 0">${s.images.filter(isViewableImage).map(u => `<img src="${esc(u)}" style="max-width:240px;max-height:200px;margin:4px;border:1px solid #ccc;border-radius:6px"/>`).join('')}</div>` : ''}
      <div style="font-size:13px;margin:6px 0"><b>Findings</b><div style="white-space:pre-wrap;margin-top:2px">${esc(s.findings || '—')}</div></div>
      <div style="font-size:13px;margin:6px 0"><b>Impression</b><div style="white-space:pre-wrap;margin-top:2px">${esc(s.impression || '—')}</div></div>`).join('<hr style="border:none;border-top:1px solid #eee;margin:14px 0"/>')

    const html = `<!doctype html><html><head><title>Imaging Report — ${esc(report.patient.name)}</title>
      <meta charset="utf-8"/>
      <style>body{font-family:system-ui,Arial,sans-serif;margin:32px;color:#111}h1{margin:0;color:#0F2557}.muted{color:#555;font-size:12px}</style>
      </head><body>
      <h1>Radiology / Imaging Report</h1>
      <div class="muted">${report.health_center_id ? 'HC ID: ' + esc(report.health_center_id) + ' · ' : ''}Generated ${esc(new Date(report.generated_at).toLocaleString('en-IN'))}</div>
      <hr/>
      <div style="font-size:14px;margin:8px 0">
        <b>${esc(report.patient.name)}</b>
        ${report.patient.mrn ? ' · ' + esc(report.patient.mrn) : ''}
        ${report.patient.age != null || report.patient.gender ? ' · ' + esc(ageSex(report.patient.age, report.patient.gender)) : ''}
        ${report.patient.mobile ? ' · ' + esc(report.patient.mobile) : ''}
      </div>
      ${studies}
      <hr style="margin-top:24px"/>
      <div class="muted">This report was generated electronically by Bharath Health Systems.</div>
      <script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
      </body></html>`
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) { alert('Please allow pop-ups to print the report.'); return }
    w.document.write(html); w.document.close()
  }

  const copyJson = async () => {
    try { await navigator.clipboard.writeText(JSON.stringify(report, null, 2)) } catch { /* clipboard unavailable */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,37,87,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-lg" style={{ color: '#0F2557' }}>{group.name}</h3>
            <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
              {group.mrn && <span className="font-mono">{group.mrn}</span>}
              <span>{ageSex(group.age, group.gender)}</span>
              {group.mobile && <span>{group.mobile}</span>}
              {group.hc_id && <span className="text-gray-400">HC: {group.hc_id}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowJson(s => !s)}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 border ${showJson ? 'bg-blue-50 text-blue-700 border-blue-200' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <Code size={13} /> JSON
            </button>
            <button onClick={printReport}
              className="text-xs px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100">
              <Printer size={13} /> Print
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {showJson ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Extended JSON</span>
                <button onClick={copyJson} className="text-xs text-blue-600 hover:underline">Copy</button>
              </div>
              <pre className="text-xs bg-gray-900 text-green-200 rounded-xl p-4 overflow-x-auto leading-relaxed">
{JSON.stringify(report, null, 2)}
              </pre>
            </div>
          ) : (
            report.studies.map((s, si) => {
              const viewable = s.images.filter(isViewableImage)
              const nonViewable = s.images.filter(p => !isViewableImage(p))
              return (
                <div key={si} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-500">{s.order_no}</span>
                      <span className="text-sm font-semibold text-gray-700">{[s.modality, s.body_part].filter(Boolean).join(' · ') || 'Study'}</span>
                      <span className={`${(STATUS_META[s.status] || {}).cls || 'badge-gray'} text-xs`}>
                        {(STATUS_META[s.status] || {}).label || s.status}
                      </span>
                      {s.priority && s.priority !== 'routine' && <span className="badge-red text-xs capitalize">{s.priority}</span>}
                    </div>
                    <span className="text-xs text-gray-400">
                      {s.ordered_by ? `Dr. ${s.ordered_by}` : ''} {s.ordered_at ? `· ${new Date(s.ordered_at).toLocaleDateString('en-IN')}` : ''}
                    </span>
                  </div>
                  {s.condition && (
                    <div className="px-4 py-2 text-xs text-gray-600 border-b border-gray-100 bg-amber-50/40">
                      <span className="font-semibold text-gray-500">Clinical indication: </span>{s.condition}
                    </div>
                  )}
                  {/* Images */}
                  {(viewable.length > 0 || nonViewable.length > 0) && (
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><ImageIcon size={12} /> Images</p>
                      {viewable.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {viewable.map((u, i) => (
                            <a key={i} href={u} target="_blank" rel="noreferrer" className="block">
                              <img src={u} alt={`study ${i + 1}`} className="h-28 w-28 object-cover rounded-lg border border-gray-200 hover:ring-2 hover:ring-blue-300"
                                onError={(e) => { e.currentTarget.style.display = 'none' }} />
                            </a>
                          ))}
                        </div>
                      )}
                      {nonViewable.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {nonViewable.map((p, i) => (
                            <span key={i} className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-500 font-mono" title={p}>{p.split(/[\\/]/).pop()}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Interpretation */}
                  <div className="px-4 py-3 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Findings</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{s.findings || <span className="text-gray-400">Not reported yet.</span>}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Impression</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{s.impression || <span className="text-gray-400">—</span>}</p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ── Expanded patient row: report-entry (findings + impression + images) ────────
function PatientImagingRow({ orders, onRefresh }) {
  const [editing, setEditing] = useState(null) // orderId
  const [form, setForm]       = useState({ findings: '', impression: '', images: '' })
  const [saving, setSaving]   = useState(false)
  const [flash, setFlash]     = useState('')

  const openEdit = (order) => {
    setEditing(order.id)
    setForm({
      findings:   order.findings || order.report || '',
      impression: order.impression || '',
      images:     (Array.isArray(order.images) ? order.images : []).join('\n'),
    })
  }

  const saveReport = async (orderId, finalise) => {
    setSaving(true)
    try {
      await imagingApi.update(orderId, {
        findings:   form.findings,
        impression: form.impression,
        images:     parseImages(form.images),
        status:     finalise ? 'completed' : 'in_progress',
      })
      setFlash(finalise ? 'Report finalised' : 'Draft saved')
      setEditing(null)
      setTimeout(() => setFlash(''), 2000)
      onRefresh()
    } catch (e) {
      setFlash('Error: ' + (e.message || 'Could not save report'))
    } finally { setSaving(false) }
  }

  return (
    <div className="bg-gray-50 border-t border-gray-100 px-4 py-3 space-y-3">
      {flash && (
        <div className={`text-xs px-3 py-1.5 rounded-lg border ${flash.startsWith('Error') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>{flash}</div>
      )}
      {orders.map(order => {
        const meta = STATUS_META[order.status] || STATUS_META.ordered
        const isEditing = editing === order.id
        const viewable = (Array.isArray(order.images) ? order.images : []).filter(isViewableImage)

        return (
          <div key={order.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-gray-400">{order.order_no || `IMG-${order.id}`}</span>
                <span className="text-sm font-semibold text-gray-700">{studyLabel(order)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={meta.cls}>{meta.label}</span>
                <button
                  onClick={() => openEdit(order)}
                  className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors"
                >
                  {order.findings || order.impression ? 'Edit Report' : 'Add Report'}
                </button>
              </div>
            </div>

            {order.clinical_notes && !isEditing && (
              <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                <span className="font-medium text-gray-600">Clinical indication: </span>{order.clinical_notes}
              </div>
            )}

            {!isEditing && (order.findings || order.impression || viewable.length > 0) && (
              <div className="px-4 py-3 space-y-2">
                {viewable.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {viewable.slice(0, 6).map((u, i) => (
                      <a key={i} href={u} target="_blank" rel="noreferrer">
                        <img src={u} alt="" className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                          onError={(e) => { e.currentTarget.style.display = 'none' }} />
                      </a>
                    ))}
                  </div>
                )}
                {order.findings && (
                  <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Findings</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.findings}</p></div>
                )}
                {order.impression && (
                  <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Impression</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.impression}</p></div>
                )}
              </div>
            )}

            {isEditing && (
              <div className="p-4 space-y-3">
                {order.clinical_notes && (
                  <div className="px-3 py-2 bg-blue-50 rounded-lg text-xs text-blue-700">
                    <span className="font-medium">Clinical indication: </span>{order.clinical_notes}
                  </div>
                )}
                <div>
                  <label className="label text-xs">Findings *</label>
                  <textarea className="input resize-none" rows={5} value={form.findings}
                    onChange={e => setForm(f => ({ ...f, findings: e.target.value }))}
                    placeholder="Detailed radiological findings, observations, measurements…" autoFocus />
                </div>
                <div>
                  <label className="label text-xs">Impression *</label>
                  <textarea className="input resize-none" rows={3} value={form.impression}
                    onChange={e => setForm(f => ({ ...f, impression: e.target.value }))}
                    placeholder="Diagnostic impression / conclusion…" />
                </div>
                <div>
                  <label className="label text-xs">Image links (optional, one per line)</label>
                  <textarea className="input resize-none text-xs font-mono" rows={2} value={form.images}
                    onChange={e => setForm(f => ({ ...f, images: e.target.value }))}
                    placeholder="https://… image or DICOM-preview URLs" />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditing(null)} className="btn-secondary text-sm py-1.5">Cancel</button>
                  <button onClick={() => saveReport(order.id, false)} disabled={saving}
                    className="text-sm py-1.5 px-3 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                    {saving ? 'Saving…' : 'Save Draft'}
                  </button>
                  <button onClick={() => saveReport(order.id, true)} disabled={saving || !form.findings.trim() || !form.impression.trim()}
                    className="btn-primary text-sm py-1.5 flex items-center gap-1.5">
                    <CheckCircle size={13} />{saving ? 'Saving…' : 'Finalise & Complete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Imaging() {
  const navigate = useNavigate()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('')
  const [dateFilter, setDate]     = useState(today)
  const [expanded, setExpanded]   = useState(new Set())
  const [detail, setDetail]       = useState(null)

  const load = () => {
    setLoading(true)
    setError('')
    imagingApi.getOrders({ limit: 200 })
      .then(r => setOrders(Array.isArray(r) ? r : []))
      .catch(e => setError(e.message || 'Could not load imaging orders'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const grouped = (() => {
    const q = orders.filter(o => {
      const name = (o.patient_name || o.patient?.full_name || '').toLowerCase()
      const matchSearch = !search || name.includes(search.toLowerCase())
      const orderDate = o.created_at?.slice(0, 10)
      const matchDate = !dateFilter || orderDate === dateFilter
      const matchStatus = !statusFilter || o.status === statusFilter
      return matchSearch && matchDate && matchStatus
    })

    const map = {}
    q.forEach(o => {
      const pid = o.patient_id || o.patient?.id || o.id
      if (!map[pid]) {
        map[pid] = {
          pid,
          name:   o.patient_name || o.patient?.full_name || 'Unknown',
          mrn:    o.patient_mrn || o.patient_uhid || o.patient?.clinic_patient_id || o.patient?.bh_id || '',
          uhid:   o.patient_uhid || '',
          age:    o.patient_age ?? null,
          gender: o.patient_gender || '',
          mobile: o.patient_mobile || o.patient?.mobile || '',
          hc_id:  o.hc_id || '',
          condition: o.clinical_notes || o.condition || '',
          orderedBy: o.ordered_by || o.doctor_name || '',
          orders: [],
        }
      }
      map[pid].orders.push(o)
    })
    return Object.values(map)
  })()

  const toggle = (pid) => setExpanded(prev => {
    const s = new Set(prev)
    s.has(pid) ? s.delete(pid) : s.add(pid)
    return s
  })

  return (
    <div>
      {/* Filters */}
      <div className="card p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-40">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-8 py-1.5 text-sm" placeholder="Search patient…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <input type="date" className="input py-1.5 text-sm w-40" value={dateFilter}
          onChange={e => setDate(e.target.value)} />
        {dateFilter && (
          <button onClick={() => setDate('')} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
        )}
        <div className="flex gap-1">
          <button onClick={() => setStatus('')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${!statusFilter ? 'text-white border-transparent' : 'border-gray-200 text-gray-500'}`}
            style={!statusFilter ? { background: '#0F2557' } : {}}>All</button>
          {['ordered', 'in_progress', 'completed'].map(s => (
            <button key={s} onClick={() => setStatus(statusFilter === s ? '' : s)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${statusFilter === s ? 'text-white border-transparent' : 'border-gray-200 text-gray-500'}`}
              style={statusFilter === s ? { background: '#CC1414' } : {}}>
              {(STATUS_META[s] || {}).label || s}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-auto">{grouped.length} patient{grouped.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Error banner */}
      {error && !loading && (
        <div className="card p-3 mb-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={load} className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-red-200 hover:bg-red-100">Retry</button>
        </div>
      )}

      {/* Patient table */}
      <div className="card overflow-hidden">
        {loading ? <PageLoader /> : grouped.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Scan size={40} className="mx-auto mb-3 opacity-25" />
            <p className="font-medium text-gray-500">No imaging orders found</p>
            <p className="text-sm mt-1">Try changing the date or status filter</p>
          </div>
        ) : (
          <table className="table w-full">
            <thead>
              <tr>
                <th className="th w-8"></th>
                <th className="th">Patient</th>
                <th className="th">Age / Sex</th>
                <th className="th">Condition</th>
                <th className="th">Order</th>
                <th className="th">Result Status</th>
                <th className="th">Ordered By</th>
                <th className="th">Action</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((group) => {
                const { pid, name, mrn, age, gender, mobile, condition, orderedBy, orders: ptOrders } = group
                const open = expanded.has(pid)
                const statuses = [...new Set(ptOrders.map(o => o.status))]
                const hasPending = ptOrders.some(o => o.status !== 'completed' && o.status !== 'cancelled' && o.status !== 'signed')

                return [
                  <tr key={pid} className="tr-hover cursor-pointer" onClick={() => setDetail(group)}>
                    <td className="td text-gray-400" onClick={e => { e.stopPropagation(); toggle(pid) }}>
                      {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </td>
                    <td className="td">
                      <div className="font-semibold text-gray-900">{name}</div>
                      <div className="text-xs text-gray-400 font-mono">{mrn || mobile || '—'}</div>
                    </td>
                    <td className="td text-sm text-gray-600">{ageSex(age, gender)}</td>
                    <td className="td max-w-[180px]">
                      <span className="text-xs text-gray-600 line-clamp-2">{condition || '—'}</span>
                    </td>
                    <td className="td">
                      <div className="text-sm text-gray-700">{ptOrders.length} stud{ptOrders.length !== 1 ? 'ies' : 'y'}</div>
                      <div className="text-xs text-gray-400 truncate max-w-[160px]">
                        {[...new Set(ptOrders.map(o => o.modality).filter(Boolean))].join(', ') || '—'}
                      </div>
                    </td>
                    <td className="td">
                      <div className="flex flex-wrap gap-1">
                        {statuses.map(s => (
                          <span key={s} className={`${(STATUS_META[s] || {}).cls || 'badge-gray'} text-xs`}>
                            {(STATUS_META[s] || {}).label || s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="td text-xs text-gray-500">{orderedBy ? `Dr. ${orderedBy}` : '—'}</td>
                    <td className="td" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {hasPending && (
                          <button
                            onClick={() => setExpanded(prev => new Set([...prev, pid]))}
                            className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100"
                          >
                            Report
                          </button>
                        )}
                        <button
                          onClick={() => setDetail(group)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 inline-flex items-center gap-1"
                        >
                          <FileText size={12} /> View
                        </button>
                        <button
                          onClick={() => navigate(`/patients/${pid}`)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                        >
                          Chart →
                        </button>
                      </div>
                    </td>
                  </tr>,
                  open && (
                    <tr key={`${pid}-expand`}>
                      <td colSpan={8} className="p-0">
                        <PatientImagingRow orders={ptOrders} onRefresh={load} />
                      </td>
                    </tr>
                  ),
                ]
              })}
            </tbody>
          </table>
        )}
      </div>

      {detail && <ImagingDetailModal group={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
