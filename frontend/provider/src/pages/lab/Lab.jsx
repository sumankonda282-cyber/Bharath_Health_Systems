import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { labApi } from '../../api'
import { PageLoader } from '../../components/ui/Spinner'
import { FlaskConical, CheckCircle, ChevronDown, ChevronRight, Search, X, Printer, Code, FileText, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'

const STATUS_META = {
  ordered:          { label: 'Ordered',          cls: 'badge-yellow',  next: 'sample_collected', action: 'Collect Sample' },
  pending:          { label: 'Ordered',          cls: 'badge-yellow',  next: 'sample_collected', action: 'Collect Sample' },
  sample_collected: { label: 'Sample Collected',  cls: 'badge-blue',    next: 'processing',       action: 'Start Processing' },
  collected:        { label: 'Sample Collected',  cls: 'badge-blue',    next: 'processing',       action: 'Start Processing' },
  processing:       { label: 'Processing',         cls: 'badge-purple',  next: null,               action: 'Enter Results' },
  completed:        { label: 'Completed',          cls: 'badge-green',   next: null,               action: 'View Results' },
  cancelled:        { label: 'Cancelled',          cls: 'badge-gray',    next: null,               action: null },
}

const ALL_STATUSES = ['ordered', 'sample_collected', 'processing', 'completed']

const resultOf = (it) => it.result_value || it.result || ''
const ageSex = (age, gender) => {
  const g = gender ? gender[0].toUpperCase() : ''
  if (age == null && !g) return '—'
  return `${age ?? '—'}${g ? ` / ${g}` : ''}`
}

// ── Build the extended JSON report for a patient group ─────────────────────────
function buildReport(group) {
  return {
    patient: {
      name:   group.name,
      mrn:    group.mrn || null,
      uhid:   group.uhid || null,
      age:    group.age ?? null,
      gender: group.gender || null,
      mobile: group.mobile || null,
    },
    health_center_id: group.hc_id || null,
    generated_at: new Date().toISOString(),
    order_count: group.orders.length,
    orders: group.orders.map(o => ({
      order_no:   o.order_no || `LAB-${o.id}`,
      status:     o.status,
      priority:   o.priority || 'routine',
      condition:  o.condition || null,
      ordered_by: o.ordered_by || o.doctor_name || null,
      ordered_at: o.created_at || null,
      results: (o.items || []).map(it => ({
        test:            it.test_name || it.test?.name || 'Test',
        result:          resultOf(it) || null,
        unit:            it.unit || null,
        reference_range: it.reference_range || null,
        abnormal:        !!it.is_abnormal,
        notes:           it.result_notes || null,
      })),
    })),
  }
}

// ── Detail modal: complete results + extended JSON + print ─────────────────────
function LabDetailModal({ group, onClose }) {
  const [showJson, setShowJson] = useState(false)
  const report = buildReport(group)

  const printReport = () => {
    const esc = (s) => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
    const rows = report.orders.map(o => `
      <h3 style="margin:18px 0 4px">${esc(o.order_no)} · <span style="text-transform:capitalize">${esc(o.status)}</span></h3>
      <div style="color:#555;font-size:12px;margin-bottom:6px">
        Ordered by ${esc(o.ordered_by || '—')} ${o.ordered_at ? '· ' + esc(new Date(o.ordered_at).toLocaleString('en-IN')) : ''}
        ${o.condition ? '<br/>Clinical note: ' + esc(o.condition) : ''}
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="background:#f0f4f8">
          <th style="text-align:left;padding:6px;border:1px solid #e2e8f0">Test</th>
          <th style="text-align:left;padding:6px;border:1px solid #e2e8f0">Result</th>
          <th style="text-align:left;padding:6px;border:1px solid #e2e8f0">Unit</th>
          <th style="text-align:left;padding:6px;border:1px solid #e2e8f0">Reference</th>
          <th style="text-align:left;padding:6px;border:1px solid #e2e8f0">Flag</th>
        </tr></thead>
        <tbody>
          ${(o.results.length ? o.results : [{ test: '—' }]).map(r => `
            <tr>
              <td style="padding:6px;border:1px solid #e2e8f0">${esc(r.test)}</td>
              <td style="padding:6px;border:1px solid #e2e8f0;font-weight:700;color:${r.abnormal ? '#c00' : '#111'}">${esc(r.result || '—')}</td>
              <td style="padding:6px;border:1px solid #e2e8f0">${esc(r.unit || '—')}</td>
              <td style="padding:6px;border:1px solid #e2e8f0">${esc(r.reference_range || '—')}</td>
              <td style="padding:6px;border:1px solid #e2e8f0">${r.abnormal ? '<b style="color:#c00">Abnormal</b>' : 'Normal'}</td>
            </tr>${r.notes ? `<tr><td colspan="5" style="padding:4px 6px;border:1px solid #e2e8f0;color:#555;font-style:italic">Note: ${esc(r.notes)}</td></tr>` : ''}`).join('')}
        </tbody>
      </table>`).join('')

    const html = `<!doctype html><html><head><title>Lab Report — ${esc(report.patient.name)}</title>
      <meta charset="utf-8"/>
      <style>body{font-family:system-ui,Arial,sans-serif;margin:32px;color:#111}h1{margin:0;color:#0F2557}.muted{color:#555;font-size:12px}</style>
      </head><body>
      <h1>Laboratory Report</h1>
      <div class="muted">${report.health_center_id ? 'HC ID: ' + esc(report.health_center_id) + ' · ' : ''}Generated ${esc(new Date(report.generated_at).toLocaleString('en-IN'))}</div>
      <hr/>
      <div style="font-size:14px;margin:8px 0">
        <b>${esc(report.patient.name)}</b>
        ${report.patient.mrn ? ' · ' + esc(report.patient.mrn) : ''}
        ${report.patient.age != null || report.patient.gender ? ' · ' + esc(ageSex(report.patient.age, report.patient.gender)) : ''}
        ${report.patient.mobile ? ' · ' + esc(report.patient.mobile) : ''}
      </div>
      ${rows}
      <hr style="margin-top:24px"/>
      <div class="muted">This report was generated electronically by Bharath Health Systems.</div>
      <script>window.onload=function(){window.print()}</script>
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
        {/* Header */}
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

        {/* Body */}
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
            report.orders.map((o, oi) => (
              <div key={oi} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-500">{o.order_no}</span>
                    <span className={`${(STATUS_META[o.status] || {}).cls || 'badge-gray'} text-xs`}>
                      {(STATUS_META[o.status] || {}).label || o.status}
                    </span>
                    {o.priority && o.priority !== 'routine' && (
                      <span className="badge-red text-xs capitalize">{o.priority}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {o.ordered_by ? `Dr. ${o.ordered_by}` : ''} {o.ordered_at ? `· ${new Date(o.ordered_at).toLocaleDateString('en-IN')}` : ''}
                  </span>
                </div>
                {o.condition && (
                  <div className="px-4 py-2 text-xs text-gray-600 border-b border-gray-100 bg-amber-50/40">
                    <span className="font-semibold text-gray-500">Clinical note: </span>{o.condition}
                  </div>
                )}
                {o.results.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-gray-400">No results entered yet.</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-white">
                      <tr>
                        {['Test', 'Result', 'Unit', 'Reference', 'Flag'].map(h => (
                          <th key={h} className="text-left px-3 py-2 text-gray-400 font-semibold uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {o.results.map((r, i) => (
                        <tr key={i} className={r.abnormal ? 'bg-red-50' : ''}>
                          <td className="px-3 py-2 font-medium text-gray-700">{r.test}</td>
                          <td className={`px-3 py-2 font-bold ${r.abnormal ? 'text-red-600' : 'text-gray-900'}`}>{r.result || '—'}</td>
                          <td className="px-3 py-2 text-gray-400">{r.unit || '—'}</td>
                          <td className="px-3 py-2 text-gray-400">{r.reference_range || '—'}</td>
                          <td className="px-3 py-2">{r.abnormal
                            ? <span className="text-red-600 font-bold inline-flex items-center gap-1"><AlertTriangle size={11} /> Abnormal</span>
                            : <span className="text-green-600">Normal</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Expanded patient row (result-entry / processing workflow) ──────────────────
function PatientOrdersRow({ orders, onRefresh }) {
  const [saving, setSaving]   = useState(false)
  const [results, setResults] = useState({}) // orderId → { items: [...] }
  const [editing, setEditing] = useState(null) // orderId
  const [flash, setFlash]     = useState('')

  const openEdit = (order) => {
    setEditing(order.id)
    setResults(prev => ({
      ...prev,
      [order.id]: {
        items: (order.items || []).map(it => ({
          id: it.id,
          test_name: it.test_name || it.test?.name || '',
          result_value: resultOf(it),
          result_notes: it.result_notes || '',
          is_abnormal: it.is_abnormal || false,
          unit: it.unit || '',
          reference_range: it.reference_range || '',
        })),
      },
    }))
  }

  const setItem = (orderId, idx, key, val) =>
    setResults(prev => ({
      ...prev,
      [orderId]: {
        items: prev[orderId].items.map((it, i) => i === idx ? { ...it, [key]: val } : it),
      },
    }))

  const saveResults = async (orderId) => {
    setSaving(true)
    try {
      await labApi.addResults(orderId, results[orderId].items)
      setFlash('Results saved')
      setEditing(null)
      setTimeout(() => setFlash(''), 2000)
      onRefresh()
    } catch (e) {
      setFlash('Error: ' + (e.message || 'Could not save results'))
    } finally { setSaving(false) }
  }

  const advanceStatus = async (order) => {
    const meta = STATUS_META[order.status]
    if (!meta?.next) { openEdit(order); return }
    setSaving(true)
    try {
      await labApi.updateStatus(order.id, meta.next)
      onRefresh()
    } catch (e) {
      setFlash('Error: ' + (e.message || 'Could not update status'))
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
        const res = results[order.id]

        return (
          <div key={order.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Order header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-gray-400">{order.order_no || `LAB-${order.id}`}</span>
                <span className="text-sm font-medium text-gray-700">
                  {(order.items || []).map(it => it.test_name || it.test?.name).join(', ') || 'Lab order'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`${meta.cls}`}>{meta.label}</span>
                {meta.action && (
                  <button
                    onClick={() => meta.next ? advanceStatus(order) : openEdit(order)}
                    disabled={saving}
                    className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    {meta.action}
                  </button>
                )}
              </div>
            </div>

            {/* Test results table */}
            {!isEditing && order.status === 'completed' && (order.items || []).length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Test', 'Result', 'Unit', 'Reference', 'Flag'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-gray-500 font-semibold uppercase text-xs tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(order.items || []).map((it, i) => (
                      <tr key={i} className={it.is_abnormal ? 'bg-red-50' : ''}>
                        <td className="px-3 py-2 font-medium text-gray-700">{it.test_name || it.test?.name}</td>
                        <td className={`px-3 py-2 font-bold ${it.is_abnormal ? 'text-red-600' : 'text-gray-900'}`}>{resultOf(it) || '—'}</td>
                        <td className="px-3 py-2 text-gray-400">{it.unit || '—'}</td>
                        <td className="px-3 py-2 text-gray-400">{it.reference_range || '—'}</td>
                        <td className="px-3 py-2">{it.is_abnormal ? <span className="text-red-600 font-bold">↑ Abnormal</span> : <span className="text-green-600">Normal</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Result entry form */}
            {isEditing && res && (
              <div className="p-4 space-y-3">
                {res.items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-2 md:grid-cols-4 gap-2 pb-3 border-b border-gray-100 last:border-0">
                    <div className="md:col-span-4 text-xs font-semibold text-gray-600 mb-1">{it.test_name}</div>
                    <div>
                      <label className="label text-xs">Result *</label>
                      <input className="input py-1 text-sm" placeholder="Value"
                        value={it.result_value}
                        onChange={e => setItem(order.id, idx, 'result_value', e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-xs">Unit</label>
                      <input className="input py-1 text-sm" placeholder="e.g. g/dL"
                        value={it.unit}
                        onChange={e => setItem(order.id, idx, 'unit', e.target.value)} />
                    </div>
                    <div>
                      <label className="label text-xs">Reference range</label>
                      <input className="input py-1 text-sm" placeholder="e.g. 12–16"
                        value={it.reference_range}
                        onChange={e => setItem(order.id, idx, 'reference_range', e.target.value)} />
                    </div>
                    <div className="flex items-end gap-2 pb-1">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-red-600 font-medium">
                        <input type="checkbox" checked={it.is_abnormal}
                          onChange={e => setItem(order.id, idx, 'is_abnormal', e.target.checked)} />
                        Abnormal
                      </label>
                    </div>
                    <div className="md:col-span-4">
                      <input className="input py-1 text-xs" placeholder="Notes (optional)"
                        value={it.result_notes}
                        onChange={e => setItem(order.id, idx, 'result_notes', e.target.value)} />
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 justify-end pt-1">
                  <button onClick={() => setEditing(null)} className="btn-secondary text-sm py-1.5">Cancel</button>
                  <button onClick={() => saveResults(order.id)} disabled={saving}
                    className="btn-primary text-sm py-1.5 flex items-center gap-1.5">
                    <CheckCircle size={13} />{saving ? 'Saving…' : 'Save & Complete'}
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
export default function Lab() {
  const navigate = useNavigate()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('')
  const [dateFilter, setDate]     = useState(today)
  const [expanded, setExpanded]   = useState(new Set())
  const [detail, setDetail]       = useState(null) // patient group for modal

  const load = () => {
    setLoading(true)
    setError('')
    labApi.getOrders({ limit: 200, status: statusFilter || undefined })
      .then(r => setOrders(Array.isArray(r) ? r : []))
      .catch(e => setError(e.message || 'Could not load lab orders'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [statusFilter])

  // Group orders by patient
  const grouped = (() => {
    const q = orders.filter(o => {
      const name = (o.patient_name || o.patient?.full_name || '').toLowerCase()
      const matchSearch = !search || name.includes(search.toLowerCase())
      const orderDate = o.created_at?.slice(0, 10)
      const matchDate = !dateFilter || orderDate === dateFilter
      return matchSearch && matchDate
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
          condition: o.condition || '',
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
          {ALL_STATUSES.map(s => (
            <button key={s} onClick={() => setStatus(statusFilter === s ? '' : s)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors capitalize ${statusFilter === s ? 'text-white border-transparent' : 'border-gray-200 text-gray-500'}`}
              style={statusFilter === s ? { background: '#CC1414' } : {}}>
              {s.replace('_', ' ')}
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
            <FlaskConical size={40} className="mx-auto mb-3 opacity-25" />
            <p className="font-medium text-gray-500">No lab orders found</p>
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
                const hasPending = ptOrders.some(o => o.status !== 'completed' && o.status !== 'cancelled')
                const testCount = ptOrders.reduce((n, o) => n + (o.items?.length || 1), 0)
                const latest = ptOrders[0]

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
                      <span className="text-sm text-gray-700">{testCount} test{testCount !== 1 ? 's' : ''}</span>
                      <div className="text-xs text-gray-400 truncate max-w-[160px]">
                        {ptOrders.flatMap(o => o.items || []).slice(0, 2).map(it => it.test_name || it.test?.name).join(', ')}
                        {testCount > 2 ? ` +${testCount - 2} more` : ''}
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
                            Process
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
                        <PatientOrdersRow orders={ptOrders} onRefresh={load} />
                      </td>
                    </tr>
                  ),
                ]
              })}
            </tbody>
          </table>
        )}
      </div>

      {detail && <LabDetailModal group={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
