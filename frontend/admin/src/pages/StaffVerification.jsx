import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { adminApi } from '../api'
import {
  Search, X, Download, Stethoscope, HeartPulse, Pill, FlaskConical, ScanLine,
  ShieldCheck, Pencil, Check, History, ExternalLink, AlertTriangle, Building2,
  Calendar, FileText, FileSpreadsheet, RefreshCw, Clock,
} from 'lucide-react'

// ── Static config ────────────────────────────────────────────────────────────
const ROLE_CARDS = [
  { key: 'doctor',       label: 'Doctor',       Icon: Stethoscope },
  { key: 'nurse',        label: 'Nurse',        Icon: HeartPulse },
  { key: 'pharmacist',   label: 'Pharmacist',   Icon: Pill },
  { key: 'lab_tech',     label: 'Lab Tech',     Icon: FlaskConical },
  { key: 'imaging_tech', label: 'Imaging Tech', Icon: ScanLine },
]

const STATUS = {
  verified:    { label: 'Verified',    cls: 'bg-green-500/15 text-green-300 border-green-500/30' },
  pending:     { label: 'Pending',     cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  expired:     { label: 'Expired',     cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  not_working: { label: 'Not working', cls: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
}

const EVENT_META = {
  registered:  { label: 'Registered',          dot: 'bg-blue-400',   Icon: FileText },
  verified:    { label: 'Verified',            dot: 'bg-green-400',  Icon: ShieldCheck },
  renewed:     { label: 'License renewed',     dot: 'bg-violet-400', Icon: RefreshCw },
  edited:      { label: 'License edited',      dot: 'bg-sky-400',    Icon: Pencil },
  expired:     { label: 'Expired',             dot: 'bg-red-400',    Icon: AlertTriangle },
  deactivated: { label: 'Deactivated',         dot: 'bg-slate-400',  Icon: X },
  reactivated: { label: 'Reactivated',         dot: 'bg-green-400',  Icon: Check },
}

const roleBucket = (role) => {
  const r = String(role || '').toLowerCase()
  if (r === 'doctor' || r === 'pathologist' || r === 'radiologist') return 'doctor'
  if (r === 'nurse') return 'nurse'
  if (r === 'pharmacist') return 'pharmacist'
  if (r === 'lab_tech' || r === 'lab_technician') return 'lab_tech'
  if (r === 'imaging_tech' || r === 'imaging_technician') return 'imaging_tech'
  return r
}

const isDoctor = (role) => {
  const r = String(role || '').toLowerCase()
  return r === 'doctor' || r === 'pathologist' || r === 'radiologist' || r === 'physician'
}

const fmtDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(String(iso).length <= 10 ? iso + 'T00:00:00' : iso)
  if (isNaN(d)) return '—'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
const fmtDateTime = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return fmtDate(iso)
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
const initials = (name) => (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

// ── Main page ────────────────────────────────────────────────────────────────
export default function StaffVerification() {
  const [data, setData] = useState({ staff: [], summary: null, as_of: '', filters: { centers: [], states: [], cities: [] } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // toolbar filters (server-side)
  const [hc, setHc] = useState('')
  const [stateF, setStateF] = useState('')
  const [cityF, setCityF] = useState('')
  const [statusF, setStatusF] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  // stat-card role filter (client-side narrowing — keeps the card totals intact)
  const [roleF, setRoleF] = useState('')

  const [exportOpen, setExportOpen] = useState(false)
  const [drawer, setDrawer] = useState(null)   // selected staff row
  const exportRef = useRef(null)

  const serverParams = useCallback(() => {
    const p = {}
    if (hc) p.clinic_id = hc
    if (stateF) p.state = stateF
    if (cityF) p.city = cityF
    if (statusF) p.status = statusF
    if (dateFrom) p.date_from = dateFrom
    if (dateTo) p.date_to = dateTo
    if (search.trim()) p.search = search.trim()
    return p
  }, [hc, stateF, cityF, statusF, dateFrom, dateTo, search])

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    adminApi.getStaffRegistry(serverParams())
      .then(d => setData({
        staff: Array.isArray(d?.staff) ? d.staff : [],
        summary: d?.summary || null,
        as_of: d?.as_of || '',
        filters: d?.filters || { centers: [], states: [], cities: [] },
      }))
      .catch(e => setError(e.message || 'Failed to load the license registry.'))
      .finally(() => setLoading(false))
  }, [serverParams])

  // debounce so typing in search / nudging dates doesn't hammer the API
  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  // close export popover on outside click
  useEffect(() => {
    const h = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const rows = useMemo(
    () => (roleF ? data.staff.filter(s => roleBucket(s.role) === roleF) : data.staff),
    [data.staff, roleF]
  )

  const byRole = data.summary?.by_role || {}
  const hasFilters = hc || stateF || cityF || statusF || dateFrom || dateTo || search.trim() || roleF

  const clearAll = () => {
    setHc(''); setStateF(''); setCityF(''); setStatusF('')
    setDateFrom(''); setDateTo(''); setSearch(''); setRoleF('')
  }

  const selectedCenter = data.filters.centers.find(c => String(c.id) === String(hc))

  return (
    <div className="bg-[#0a0f1e] min-h-full text-app">
      {/* STAT CARDS = role filters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {ROLE_CARDS.map(({ key, label, Icon }) => {
          const on = roleF === key
          return (
            <button
              key={key}
              onClick={() => setRoleF(on ? '' : key)}
              className={`kpi-card text-left transition-all relative ${on ? 'ring-1 ring-[#F5821E] border-[#F5821E]/60' : 'hover:border-gray-700'}`}
            >
              {on && <span className="absolute right-2.5 top-2.5 text-[10px] font-bold text-[#F5821E] inline-flex items-center gap-0.5"><X size={10} />clear</span>}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#F5821E]/10">
                  <Icon size={18} className="text-[#F5821E]" />
                </div>
                <div>
                  <div className="text-xl font-bold text-app leading-none">{byRole[key] ?? 0}</div>
                  <div className="text-xs text-dim mt-1">{label}{on ? ' · filtering' : ''}</div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* TOOLBAR — one line */}
      <div className="card-sm flex flex-wrap items-center gap-2 p-2.5 mb-4">
        <select value={hc} onChange={e => setHc(e.target.value)}
          className="filter-chip bg-[#10182e] border-app text-app max-w-[200px]">
          <option value="">All Health Centers</option>
          {data.filters.centers.map(c => <option key={c.id} value={c.id}>{c.hc_id ? `${c.hc_id} · ` : ''}{c.name}</option>)}
        </select>

        <select value={stateF} onChange={e => setStateF(e.target.value)}
          className="filter-chip bg-[#10182e] border-app text-app">
          <option value="">All States</option>
          {data.filters.states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={cityF} onChange={e => setCityF(e.target.value)}
          className="filter-chip bg-[#10182e] border-app text-app">
          <option value="">All Cities</option>
          {data.filters.cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={statusF} onChange={e => setStatusF(e.target.value)}
          className="filter-chip bg-[#10182e] border-app text-app">
          <option value="">All Status</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="expired">Expired</option>
          <option value="not_working">Not working</option>
        </select>

        <div className="filter-chip bg-[#10182e] border-app text-dim gap-1.5">
          <Calendar size={13} className="text-faint" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="Registered from"
            className="bg-transparent outline-none text-xs text-app w-[112px]" />
          <span className="text-faint">→</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="Registered to"
            className="bg-transparent outline-none text-xs text-app w-[112px]" />
        </div>

        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, employee ID, license no…"
            className="w-full bg-[#10182e] border border-app rounded-lg pl-8 pr-3 py-1.5 text-sm text-app outline-none focus:border-[#F5821E]/40" />
        </div>

        {hasFilters && (
          <button onClick={clearAll} className="btn-secondary text-xs">Clear</button>
        )}

        <div className="relative" ref={exportRef}>
          <button onClick={() => setExportOpen(o => !o)} title="Export"
            className="w-9 h-9 rounded-lg bg-[#F5821E] hover:bg-[#e0741a] text-white flex items-center justify-center transition-colors">
            <Download size={17} />
          </button>
          {exportOpen && (
            <ExportPopup
              filteredCount={rows.length}
              roleLabel={roleF ? ROLE_CARDS.find(r => r.key === roleF)?.label : null}
              center={selectedCenter}
              currentParams={{ ...serverParams(), ...(roleF ? { role: roleF } : {}) }}
              asOf={data.as_of}
              onClose={() => setExportOpen(false)}
            />
          )}
        </div>
      </div>

      {error && (
        <div className="card-sm border-red-900 bg-red-950/30 text-red-300 text-sm p-3 mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="btn-secondary text-xs">Retry</button>
        </div>
      )}

      {/* TABLE */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#F5821E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="card-sm text-center py-16">
          <ShieldCheck size={40} className="mx-auto mb-3 text-[#F5821E]/40" />
          <p className="text-dim font-medium">No licensed clinical staff match these filters</p>
          {hasFilters && <button onClick={clearAll} className="btn-secondary text-xs mt-3">Clear filters</button>}
        </div>
      ) : (
        <div className="card-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="th-sm">Employee ID</th>
                  <th className="th-sm">Name</th>
                  <th className="th-sm">Role</th>
                  <th className="th-sm">Health Center</th>
                  <th className="th-sm">License No.</th>
                  <th className="th-sm">Registered</th>
                  <th className="th-sm">Renewed</th>
                  <th className="th-sm">Expiry</th>
                  <th className="th-sm">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border)]">
                {rows.map(s => {
                  const st = STATUS[s.status] || STATUS.pending
                  const expCls = s.status === 'expired' ? 'text-red-400 font-medium'
                    : s.expiring_soon ? 'text-amber-400 font-medium' : 'text-dim'
                  return (
                    <tr key={s.id} onClick={() => setDrawer(s)}
                      className="hover-app cursor-pointer transition-colors">
                      <td className="td-sm font-mono text-[12px] text-sky-300 font-semibold whitespace-nowrap">{s.employee_code}</td>
                      <td className="td-sm">
                        <div className="text-app font-medium">{s.full_name}</div>
                        {s.mobile && <div className="text-[11px] text-faint">{s.mobile}</div>}
                      </td>
                      <td className="td-sm">
                        <span className="text-[11px] text-dim bg-[#13294f] rounded px-2 py-0.5">{s.role_label}</span>
                      </td>
                      <td className="td-sm text-dim">
                        {s.clinic_name}
                        {s.city && <span className="text-faint"> · {s.city}</span>}
                      </td>
                      <td className="td-sm font-mono text-[12px] text-dim">{s.license_number || '—'}</td>
                      <td className="td-sm text-dim whitespace-nowrap">{fmtDate(s.registered_date)}</td>
                      <td className="td-sm text-dim whitespace-nowrap">{fmtDate(s.renewal_date)}</td>
                      <td className={`td-sm whitespace-nowrap ${expCls}`}>
                        {fmtDate(s.expiry_date)}
                        {s.expiring_soon && <span className="ml-1 text-[10px]">({s.days_to_expiry}d)</span>}
                      </td>
                      <td className="td-sm">
                        <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-app text-xs text-faint flex items-center justify-between">
            <span>{rows.length} {roleF ? ROLE_CARDS.find(r => r.key === roleF)?.label.toLowerCase() : 'clinical staff'}{rows.length === 1 ? '' : (roleF ? 's' : '')} shown</span>
            {data.summary?.expiring_soon > 0 && (
              <span className="text-amber-400 inline-flex items-center gap-1">
                <Clock size={12} />{data.summary.expiring_soon} expiring within 60 days
              </span>
            )}
          </div>
        </div>
      )}

      {drawer && (
        <DetailDrawer
          staff={drawer}
          onClose={() => setDrawer(null)}
          onChanged={() => { setDrawer(null); load() }}
        />
      )}
    </div>
  )
}

// ── Export popup ─────────────────────────────────────────────────────────────
function ExportPopup({ filteredCount, roleLabel, center, currentParams, asOf, onClose }) {
  const [scope, setScope] = useState('current')   // 'current' | 'center'
  const [busy, setBusy] = useState(null)

  const centerScopeLabel = center
    ? `Entire health center — ${center.name}`
    : 'Entire platform — all licensed staff'

  const doExport = async (fmt) => {
    setBusy(fmt)
    try {
      const params = scope === 'center'
        ? (center ? { clinic_id: center.id, format: fmt } : { format: fmt })
        : { ...currentParams, format: fmt }
      const blob = await adminApi.exportStaffRegistry(params)
      const ext = fmt === 'excel' ? 'xlsx' : fmt
      const scopeTag = scope === 'center' ? (center?.hc_id || 'platform') : 'filtered'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `license-${scopeTag}-${asOf || 'export'}.${ext}`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
      onClose()
    } catch (e) {
      alert(e.message || 'Export failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-[#0e1f3d] border border-app rounded-xl shadow-2xl z-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-app flex items-center gap-2 text-app font-semibold text-sm">
        <Download size={15} className="text-[#F5821E]" /> Export staff list
      </div>
      <div className="p-4 space-y-3">
        <button onClick={() => setScope('current')}
          className={`w-full flex items-center gap-2.5 text-left text-[13px] rounded-lg px-3 py-2.5 border transition-colors ${scope === 'current' ? 'border-[#F5821E] bg-[#F5821E]/10 text-white' : 'border-app bg-[#0b1c38] text-dim'}`}>
          <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${scope === 'current' ? 'border-[#F5821E] bg-[#F5821E]' : 'border-gray-500'}`} />
          Current filtered list ({filteredCount}{roleLabel ? ` ${roleLabel.toLowerCase()}s` : ' staff'})
        </button>
        <button onClick={() => setScope('center')}
          className={`w-full flex items-center gap-2.5 text-left text-[13px] rounded-lg px-3 py-2.5 border transition-colors ${scope === 'center' ? 'border-[#F5821E] bg-[#F5821E]/10 text-white' : 'border-app bg-[#0b1c38] text-dim'}`}>
          <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${scope === 'center' ? 'border-[#F5821E] bg-[#F5821E]' : 'border-gray-500'}`} />
          {centerScopeLabel}
        </button>

        <div className="flex gap-2 pt-1">
          {[
            { fmt: 'pdf',   label: 'PDF',   cls: 'bg-red-700 hover:bg-red-600',   Icon: FileText },
            { fmt: 'excel', label: 'Excel', cls: 'bg-green-700 hover:bg-green-600', Icon: FileSpreadsheet },
            { fmt: 'csv',   label: 'CSV',   cls: 'bg-blue-700 hover:bg-blue-600',  Icon: Download },
          ].map(({ fmt, label, cls, Icon }) => (
            <button key={fmt} onClick={() => doExport(fmt)} disabled={!!busy}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-white py-2 rounded-lg transition-colors disabled:opacity-50 ${cls}`}>
              <Icon size={13} />{busy === fmt ? '…' : label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-faint leading-snug">
          Downloads the registry columns (employee ID, license no, registered / renewed / expiry, status) for the chosen scope.
        </p>
      </div>
    </div>
  )
}

// ── Detail drawer (audit history + edit + verify) ────────────────────────────
function DetailDrawer({ staff, onClose, onChanged }) {
  const [hist, setHist] = useState(null)
  const [loadingHist, setLoadingHist] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [form, setForm] = useState({
    license_number: staff.license_number || '',
    registered_date: staff.registered_date || '',
    renewal_date: staff.renewal_date || '',
    expiry_date: staff.expiry_date || '',
    note: '',
  })

  const loadHist = useCallback(() => {
    setLoadingHist(true)
    adminApi.getStaffLicenseHistory(staff.id)
      .then(d => setHist(d))
      .catch(() => setHist({ history: [] }))
      .finally(() => setLoadingHist(false))
  }, [staff.id])
  useEffect(() => { loadHist() }, [loadHist])

  const st = STATUS[staff.status] || STATUS.pending

  const save = async () => {
    setSaving(true); setErr(null)
    try {
      await adminApi.updateStaffLicense(staff.id, {
        license_number: form.license_number,
        registered_date: form.registered_date || null,
        renewal_date: form.renewal_date || null,
        expiry_date: form.expiry_date || null,
        note: form.note || undefined,
      })
      setEditing(false)
      onChanged()
    } catch (e) {
      setErr(e.message || 'Failed to save license details')
    } finally {
      setSaving(false)
    }
  }

  const approve = async () => {
    if (isDoctor(staff.role) && !window.confirm('Confirm the medical license has been checked, then approve this doctor?')) return
    setSaving(true); setErr(null)
    try {
      await adminApi.verifyStaff(staff.id)
      onChanged()
    } catch (e) {
      setErr(e.message || 'Failed to approve')
    } finally {
      setSaving(false)
    }
  }

  const reject = async () => {
    const comment = window.prompt('Reason for rejection (optional):', '')
    if (comment === null) return
    setSaving(true); setErr(null)
    try {
      await adminApi.rejectStaff(staff.id, { comment })
      onChanged()
    } catch (e) {
      setErr(e.message || 'Failed to reject')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-md z-50 bg-[#0a0f1e] border-l border-app shadow-2xl flex flex-col">
        {/* header */}
        <div className="px-5 py-4 border-b border-app flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F5821E] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
            {initials(staff.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-app font-semibold">{staff.full_name}</div>
            <div className="font-mono text-[11px] text-sky-300 truncate">{staff.employee_code}</div>
            <div className="text-[11px] text-faint">{staff.role_label} · {staff.clinic_name}</div>
          </div>
          <button onClick={onClose} className="text-faint hover:text-white"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* status + actions */}
          <div className="px-5 py-4 border-b border-app space-y-3">
            <div className="flex items-center justify-between">
              <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full border ${st.cls}`}>{st.label}</span>
              <div className="flex items-center gap-2">
                {staff.license_document_url && (
                  <a href={staff.license_document_url} target="_blank" rel="noreferrer"
                    className="btn-secondary text-xs inline-flex items-center gap-1"><ExternalLink size={12} />Document</a>
                )}
                {!editing && (
                  <button onClick={() => setEditing(true)} className="btn-secondary text-xs inline-flex items-center gap-1">
                    <Pencil size={12} />Edit license
                  </button>
                )}
              </div>
            </div>
            {staff.status === 'pending' && !editing && (
              <div className="flex gap-2">
                <button onClick={approve} disabled={saving} className="btn-success flex-1 justify-center text-xs inline-flex items-center gap-1 disabled:opacity-50">
                  <Check size={13} />{saving ? '…' : 'Approve & issue login'}
                </button>
                <button onClick={reject} disabled={saving} className="btn-danger flex-1 justify-center text-xs inline-flex items-center gap-1 disabled:opacity-50">
                  <X size={13} />Reject
                </button>
              </div>
            )}
            {err && <div className="text-xs text-red-400">{err}</div>}
          </div>

          {/* license detail / edit form */}
          <div className="px-5 py-4 border-b border-app">
            <div className="text-[11px] font-semibold text-faint uppercase tracking-wider mb-3">License details</div>
            {editing ? (
              <div className="space-y-3">
                <Field label="License number">
                  <input value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))}
                    className="reg-input" placeholder="e.g. TSMC-99213" />
                </Field>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Registered">
                    <input type="date" value={form.registered_date || ''} onChange={e => setForm(f => ({ ...f, registered_date: e.target.value }))} className="reg-input" />
                  </Field>
                  <Field label="Renewed">
                    <input type="date" value={form.renewal_date || ''} onChange={e => setForm(f => ({ ...f, renewal_date: e.target.value }))} className="reg-input" />
                  </Field>
                  <Field label="Expiry">
                    <input type="date" value={form.expiry_date || ''} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} className="reg-input" />
                  </Field>
                </div>
                <Field label="Note (optional)">
                  <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                    className="reg-input" placeholder="e.g. Renewed for 2026, document re-uploaded" />
                </Field>
                <p className="text-[11px] text-faint">Dates are entered manually (no licensing-authority sync). Saving records an audit entry and re-checks expiry automatically.</p>
                <div className="flex gap-2 pt-1">
                  <button onClick={save} disabled={saving} className="btn-success flex-1 justify-center text-xs disabled:opacity-50">{saving ? 'Saving…' : 'Save license'}</button>
                  <button onClick={() => { setEditing(false); setErr(null) }} className="btn-secondary flex-1 justify-center text-xs">Cancel</button>
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-sm">
                <Detail label="License no" value={staff.license_number || '—'} mono />
                <Detail label="Registered" value={fmtDate(staff.registered_date)} />
                <Detail label="Renewed" value={fmtDate(staff.renewal_date)} />
                <Detail label="Expiry" value={fmtDate(staff.expiry_date)}
                  valueCls={staff.status === 'expired' ? 'text-red-400' : staff.expiring_soon ? 'text-amber-400' : ''} />
              </dl>
            )}
          </div>

          {/* audit timeline */}
          <div className="px-5 py-4">
            <div className="text-[11px] font-semibold text-faint uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <History size={12} /> Audit history
            </div>
            {loadingHist ? (
              <div className="text-faint text-sm py-4">Loading…</div>
            ) : !hist?.history?.length ? (
              <div className="text-faint text-sm py-4">No recorded events.</div>
            ) : (
              <div className="relative pl-5 before:content-[''] before:absolute before:left-[5px] before:top-1 before:bottom-1 before:w-0.5 before:bg-gray-800">
                {hist.history.map((ev, i) => {
                  const meta = EVENT_META[ev.event_type] || { label: ev.event_type, dot: 'bg-gray-400', Icon: FileText }
                  return (
                    <div key={ev.id || i} className="relative pb-4 last:pb-0">
                      <span className={`absolute -left-5 top-1 w-3 h-3 rounded-full border-2 border-[#0a0f1e] ${meta.dot}`} />
                      <div className="text-[11px] text-faint">{fmtDateTime(ev.created_at)}</div>
                      <div className="text-[13px] text-app font-medium">{meta.label}{ev.changed_by_name ? <span className="text-faint font-normal"> · {ev.changed_by_name}</span> : null}</div>
                      {ev.note && <div className="text-[11.5px] text-dim mt-0.5">{ev.note}</div>}
                      {(ev.expiry_date || ev.license_number) && (
                        <div className="text-[11px] text-faint mt-0.5 font-mono">
                          {ev.license_number ? `${ev.license_number}` : ''}{ev.expiry_date ? ` · exp ${fmtDate(ev.expiry_date)}` : ''}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`.reg-input{width:100%;background:#10182e;border:1px solid #2a3a5e;border-radius:8px;padding:6px 10px;font-size:13px;color:#e7ecf5;outline:none}.reg-input:focus{border-color:rgba(245,130,30,.5)}`}</style>
    </>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[11px] text-faint mb-1">{label}</span>
      {children}
    </label>
  )
}

function Detail({ label, value, mono, valueCls = '' }) {
  return (
    <div>
      <dt className="text-[11px] text-faint">{label}</dt>
      <dd className={`text-app ${mono ? 'font-mono text-[12px]' : ''} ${valueCls}`}>{value}</dd>
    </div>
  )
}
