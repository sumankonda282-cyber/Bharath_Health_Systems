import { useState, useEffect, useMemo } from 'react'
import { adminApi } from '../api'
import { Search, Check, X, Eye, ShieldCheck, Pill, HeartPulse, FlaskConical, ScanLine, AlertTriangle, Stethoscope, ExternalLink } from 'lucide-react'

const ROLE_LABELS = { pharmacist: 'Pharmacist', lab_technician: 'Lab Technician', imaging_tech: 'Imaging Tech', nurse: 'Nurse' }

const daysSince = (iso) => {
  if (!iso) return 0
  const ms = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(ms / 86400000))
}

const isReapplicant = (s) =>
  !!(s.is_reapplicant || s.reapplicant || s.re_applicant || s.previously_rejected || s.reapplication)

const isImage = (url) => /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(url || '')

const isDoctor = (role) => {
  const r = String(role || '').toLowerCase()
  return r.includes('doctor') || r === 'physician'
}

export default function StaffVerification() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(null)
  const [checked, setChecked] = useState(() => new Set())

  const [roleFilter, setRoleFilter] = useState('all')
  const [hcFilter, setHcFilter] = useState('all')
  const [daysFilter, setDaysFilter] = useState('all')
  const [search, setSearch] = useState('')

  const [rejectModal, setRejectModal] = useState(null)
  const [rejectComment, setRejectComment] = useState('')
  const [docModal, setDocModal] = useState(null)

  const load = () => {
    setLoading(true)
    setError(null)
    adminApi.getPendingStaff()
      .then(d => { setStaff(Array.isArray(d) ? d : []); setChecked(new Set()) })
      .catch(e => setError(e.message || 'Failed to load staff awaiting verification.'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const kpis = useMemo(() => {
    const count = (frag) => staff.filter(s => String(s.role || '').toLowerCase().includes(frag)).length
    const doctorCount = staff.filter(s => isDoctor(s.role)).length
    return {
      pharm: count('pharm'),
      nurse: count('nurse'),
      lab: count('lab'),
      imag: count('imag'),
      doctor: doctorCount,
    }
  }, [staff])

  const roles = useMemo(
    () => Array.from(new Set(staff.map(s => s.role).filter(Boolean))),
    [staff]
  )
  const centers = useMemo(
    () => Array.from(new Set(staff.map(s => s.clinic_name).filter(Boolean))),
    [staff]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return staff.filter(s => {
      if (roleFilter !== 'all' && s.role !== roleFilter) return false
      if (hcFilter !== 'all' && s.clinic_name !== hcFilter) return false
      if (q && !String(s.full_name || '').toLowerCase().includes(q)) return false
      const d = daysSince(s.created_at)
      if (daysFilter === 'gt7' && !(d > 7)) return false
      if (daysFilter === '3to7' && !(d >= 3 && d <= 7)) return false
      if (daysFilter === 'lt3' && !(d < 3)) return false
      return true
    })
  }, [staff, roleFilter, hcFilter, daysFilter, search])

  const allVisibleChecked = filtered.length > 0 && filtered.every(s => checked.has(s.id))

  const toggleRow = (id) => {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const toggleAll = () => {
    setChecked(prev => {
      if (filtered.every(s => prev.has(s.id)) && filtered.length > 0) {
        const next = new Set(prev)
        filtered.forEach(s => next.delete(s.id))
        return next
      }
      const next = new Set(prev)
      filtered.forEach(s => next.add(s.id))
      return next
    })
  }
  const clearChecked = () => setChecked(new Set())

  const handleVerify = async (id) => {
    const member = staff.find(s => s.id === id)
    if (member && isDoctor(member.role)) {
      const confirmed = window.confirm(
        'Please verify the medical license before approving.\n\nProceed with approving this doctor?'
      )
      if (!confirmed) return
    }
    setSaving(id)
    try { await adminApi.verifyStaff(id); load() }
    catch (e) { setError(e.message || 'Failed to approve staff.') }
    finally { setSaving(null) }
  }

  const handleReject = async () => {
    setSaving(rejectModal)
    try {
      await adminApi.rejectStaff(rejectModal, { comment: rejectComment })
      setRejectModal(null); setRejectComment(''); load()
    } catch (e) { setError(e.message || 'Failed to reject staff.') }
    finally { setSaving(null) }
  }

  const approveAll = async () => {
    const ids = Array.from(checked)
    if (ids.length === 0) return
    setSaving('batch')
    try { for (const id of ids) await adminApi.verifyStaff(id); load() }
    catch (e) { setError(e.message || 'One or more approvals failed.') }
    finally { setSaving(null) }
  }

  const rejectAll = async () => {
    const ids = Array.from(checked)
    if (ids.length === 0) return
    const comment = window.prompt('Rejection comment applied to all selected staff:', '')
    if (comment === null) return
    setSaving('batch')
    try { for (const id of ids) await adminApi.rejectStaff(id, { comment }); load() }
    catch (e) { setError(e.message || 'One or more rejections failed.') }
    finally { setSaving(null) }
  }

  const dayCellClass = (d) => {
    if (d > 7) return 'bg-red-950/20 text-red-400'
    if (d >= 3) return 'text-orange-400'
    return 'text-gray-400'
  }

  const kpiItems = [
    { key: 'pharm', label: 'Pharmacist', value: kpis.pharm, Icon: Pill },
    { key: 'nurse', label: 'Nurse', value: kpis.nurse, Icon: HeartPulse },
    { key: 'lab', label: 'Lab Tech', value: kpis.lab, Icon: FlaskConical },
    { key: 'imag', label: 'Imaging Tech', value: kpis.imag, Icon: ScanLine },
    { key: 'doctor', label: 'Doctor', value: kpis.doctor, Icon: Stethoscope },
  ]

  const selectedCount = checked.size

  return (
    <div className="bg-[#0a0f1e] min-h-full text-gray-200 pb-20">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {kpiItems.map(({ key, label, value, Icon }) => (
          <div key={key} className="kpi-card flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#F5821E]/10">
              <Icon size={18} className="text-[#F5821E]" />
            </div>
            <div>
              <div className="text-xl font-bold text-white leading-none">{value}</div>
              <div className="text-xs text-gray-400 mt-1">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="toolbar flex flex-wrap items-center gap-2 mb-4">
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="filter-chip bg-[#10182e] border border-gray-800 rounded-md px-2 py-1.5 text-sm text-gray-200">
          <option value="all">All Roles</option>
          {roles.map(r => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
        </select>

        <select value={hcFilter} onChange={e => setHcFilter(e.target.value)}
          className="filter-chip bg-[#10182e] border border-gray-800 rounded-md px-2 py-1.5 text-sm text-gray-200">
          <option value="all">All Health Centers</option>
          {centers.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={daysFilter} onChange={e => setDaysFilter(e.target.value)}
          className="filter-chip bg-[#10182e] border border-gray-800 rounded-md px-2 py-1.5 text-sm text-gray-200">
          <option value="all">All Days</option>
          <option value="gt7">&gt; 7 days</option>
          <option value="3to7">3–7 days</option>
          <option value="lt3">&lt; 3 days</option>
        </select>

        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name…"
            className="bg-[#10182e] border border-gray-800 rounded-md pl-7 pr-2 py-1.5 text-sm text-gray-200 w-48" />
        </div>

        <div className="flex-1" />

        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
          <input type="checkbox" checked={allVisibleChecked} onChange={toggleAll} className="accent-[#F5821E]" />
          Select All
        </label>
        <button onClick={approveAll} disabled={selectedCount === 0 || saving === 'batch'}
          className="btn-success inline-flex items-center gap-1 disabled:opacity-40">
          <Check size={14} />Approve All
        </button>
        <button onClick={rejectAll} disabled={selectedCount === 0 || saving === 'batch'}
          className="btn-danger inline-flex items-center gap-1 disabled:opacity-40">
          <X size={14} />Reject All
        </button>
      </div>

      {error && (
        <div className="card-sm border border-red-900 bg-red-950/30 text-red-300 text-sm p-3 mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="btn-secondary text-xs">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#F5821E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-sm text-center py-16">
          <ShieldCheck size={40} className="mx-auto mb-3 text-[#F5821E]/40" />
          <p className="text-gray-400 font-medium">No staff awaiting verification</p>
        </div>
      ) : (
        <div className="card-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="th-sm w-8"></th>
                  <th className="th-sm text-left">Name</th>
                  <th className="th-sm text-left">Role</th>
                  <th className="th-sm text-left">Health Center</th>
                  <th className="th-sm text-left">License</th>
                  <th className="th-sm text-left">Applied</th>
                  <th className="th-sm text-left">Days</th>
                  <th className="th-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map(s => {
                  const d = daysSince(s.created_at)
                  const docUrl = s.document_url || s.license_document_url
                  return (
                    <tr key={s.id} className="hover:bg-white/5">
                      <td className="td-sm">
                        <input type="checkbox" checked={checked.has(s.id)} onChange={() => toggleRow(s.id)} className="accent-[#F5821E]" />
                      </td>
                      <td className="td-sm font-medium text-white">
                        <span>{s.full_name}</span>
                        {isReapplicant(s) && (
                          <span className="badge-xs ml-2 inline-flex items-center gap-0.5 bg-amber-950/40 text-amber-400 border border-amber-800/50">
                            <AlertTriangle size={9} />Re-applicant
                          </span>
                        )}
                      </td>
                      <td className="td-sm">
                        <span className="badge-xs bg-[#10182e] border border-gray-700 text-gray-300">{ROLE_LABELS[s.role] || s.role}</span>
                      </td>
                      <td className="td-sm text-gray-400">{s.clinic_name}</td>
                      <td className="td-sm">
                        {isDoctor(s.role) && s.license_number ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            {s.license_number}
                          </span>
                        ) : null}
                        {docUrl ? (
                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 mt-0.5"
                            onClick={e => e.stopPropagation()}
                          >
                            <ExternalLink size={11} />View Doc
                          </a>
                        ) : !isDoctor(s.role) || !s.license_number ? (
                          <span className="text-gray-600">—</span>
                        ) : null}
                      </td>
                      <td className="td-sm text-gray-500">{s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN') : '—'}</td>
                      <td className={`td-sm font-medium ${dayCellClass(d)}`}>{d}d</td>
                      <td className="td-sm">
                        <div className="flex gap-1.5 justify-end">
                          <button onClick={() => handleVerify(s.id)} disabled={saving === s.id}
                            className="btn-success inline-flex items-center gap-1 text-xs disabled:opacity-40" title="Approve">
                            <Check size={12} />{saving === s.id ? '…' : 'Approve'}
                          </button>
                          <button onClick={() => { setRejectModal(s.id); setRejectComment('') }}
                            className="btn-danger inline-flex items-center gap-1 text-xs" title="Reject">
                            <X size={12} />Reject
                          </button>
                          <button onClick={() => setDocModal(s.license_document_url)} disabled={!s.license_document_url}
                            className="btn-secondary inline-flex items-center gap-1 text-xs disabled:opacity-30" title="View document">
                            <Eye size={12} />Doc
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#10182e] border-t border-gray-800 px-4 py-3 flex items-center gap-3">
          <span className="text-sm text-gray-200 font-medium">{selectedCount} selected</span>
          <div className="flex-1" />
          <button onClick={approveAll} disabled={saving === 'batch'}
            className="btn-success inline-flex items-center gap-1 disabled:opacity-40">
            <Check size={14} />Approve All
          </button>
          <button onClick={rejectAll} disabled={saving === 'batch'}
            className="btn-danger inline-flex items-center gap-1 disabled:opacity-40">
            <X size={14} />Reject All (with comment)
          </button>
          <button onClick={clearChecked} className="btn-secondary text-sm">Clear</button>
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[#10182e] border border-gray-800 rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-white mb-3">Reject Staff</h3>
            <p className="text-gray-400 text-sm mb-3">Provide a reason for rejection (optional):</p>
            <textarea className="w-full bg-[#0a0f1e] border border-gray-800 rounded-md px-3 py-2 text-sm text-gray-200 resize-none mb-4"
              rows={3} value={rejectComment} onChange={e => setRejectComment(e.target.value)}
              placeholder="e.g. License number invalid, document unclear…" />
            <div className="flex gap-3">
              <button onClick={() => { setRejectModal(null); setRejectComment('') }} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleReject} disabled={!!saving} className="btn-danger flex-1 justify-center">
                {saving ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {docModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#10182e] border border-gray-800 rounded-2xl w-full max-w-4xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white">License Document</h3>
              <button onClick={() => setDocModal(null)} className="btn-secondary inline-flex items-center gap-1 text-sm">
                <X size={14} />Close
              </button>
            </div>
            {isImage(docModal) ? (
              <img src={docModal} alt="License document" className="w-full max-h-[70vh] object-contain rounded-md bg-black/30" />
            ) : (
              <embed src={docModal} type="application/pdf" className="w-full h-[70vh] rounded-md" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
