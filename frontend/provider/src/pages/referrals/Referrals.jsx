import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../../api/client'
import { patientsApi, appointmentsApi } from '../../api'
import { cachedFetch, cacheInvalidate, TTL } from '../../utils/cache'
import { PageLoader } from '../../components/ui/Spinner'
import {
  Send, Inbox, Plus, ChevronDown, ChevronUp, CheckCircle, XCircle,
  CalendarPlus, X, Printer, Search, Copy, Building2
} from 'lucide-react'

// ── Badge helpers ─────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  draft: 'badge-gray',
  sent: 'badge-blue',
  accepted: 'badge-green',
  completed: 'badge-teal',
  cancelled: 'badge-red',
  pending: 'badge-yellow',
  rejected: 'badge-red',
}
const URGENCY_STYLE = { routine: 'badge-gray', urgent: 'badge-yellow', emergency: 'badge-red' }

// ── Print referral letter ─────────────────────────────────────────────────────
function printReferral(r, form) {
  const data = r || form
  const win = window.open('', '_blank', 'width=800,height=900')
  if (!win) return
  win.document.write(`<!DOCTYPE html><html><head><title>Referral Letter</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #111; font-size: 14px; }
    h1 { color: #0F2557; font-size: 20px; margin-bottom: 4px; }
    .header { border-bottom: 2px solid #0F2557; padding-bottom: 12px; margin-bottom: 20px; }
    .section { margin-bottom: 16px; }
    .label { font-size: 11px; text-transform: uppercase; color: #888; font-weight: 600; letter-spacing: 0.05em; }
    .value { font-size: 14px; margin-top: 2px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .urgency-routine { color: #374151; }
    .urgency-urgent { color: #b45309; font-weight: 600; }
    .urgency-emergency { color: #dc2626; font-weight: 700; }
    .sig { margin-top: 48px; border-top: 1px solid #ddd; padding-top: 12px; color: #555; font-size: 12px; }
    @media print { body { padding: 20px; } }
  </style></head><body>
  <div class="header">
    <h1>Medical Referral Letter</h1>
    <div style="font-size:12px;color:#555;">Ref: ${data.referral_code || `REF-${data.id || 'DRAFT'}`} &nbsp;|&nbsp; Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
  </div>
  <div class="grid2">
    <div class="section"><div class="label">Patient</div><div class="value">${data.patient_name || '—'}</div></div>
    <div class="section"><div class="label">Urgency</div><div class="value urgency-${data.urgency}">${(data.urgency || 'Routine').toUpperCase()}</div></div>
    <div class="section"><div class="label">Referred To</div><div class="value">${data.to_clinic_name || '—'}</div></div>
    <div class="section"><div class="label">Specialty</div><div class="value">${data.specialty || '—'}</div></div>
    ${data.referred_doctor ? `<div class="section"><div class="label">Attention: Doctor</div><div class="value">${data.referred_doctor}</div></div>` : ''}
  </div>
  <div class="section"><div class="label">Reason for Referral</div><div class="value">${data.reason || '—'}</div></div>
  ${data.clinical_notes ? `<div class="section"><div class="label">Clinical Summary</div><div class="value" style="white-space:pre-wrap">${data.clinical_notes}</div></div>` : ''}
  ${data.current_medications ? `<div class="section"><div class="label">Current Medications</div><div class="value" style="white-space:pre-wrap">${data.current_medications}</div></div>` : ''}
  ${data.relevant_investigations ? `<div class="section"><div class="label">Relevant Investigations</div><div class="value" style="white-space:pre-wrap">${data.relevant_investigations}</div></div>` : ''}
  <div class="sig">Referred by BharatCliniq Provider Portal · Printed ${new Date().toLocaleString('en-IN')}</div>
  <script>window.onload=()=>{ window.print(); }<\/script>
  </body></html>`)
  win.document.close()
}

// ── New Referral Modal ────────────────────────────────────────────────────────
function NewReferralModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    patient_id: '', reason: '', urgency: 'routine',
    clinical_notes: '', to_clinic_name: '',
    specialty: '', referred_doctor: '',
    current_medications: '', relevant_investigations: '',
  })
  const [ptSearch, setPtSearch] = useState('')
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [orgSearch, setOrgSearch] = useState('')
  const [orgResults, setOrgResults] = useState([])
  const [saving, setSaving] = useState(false)
  const [copying, setCopying] = useState(false)
  const [err, setErr] = useState('')
  const ptRef = useRef(null)
  const orgRef = useRef(null)

  // Patient suggestions
  useEffect(() => {
    if (ptSearch.length < 2) { setPatients([]); return }
    const t = setTimeout(() =>
      patientsApi.list({ search: ptSearch, limit: 10 })
        .then(r => setPatients(Array.isArray(r) ? r : []))
        .catch(() => {}),
      300
    )
    return () => clearTimeout(t)
  }, [ptSearch])

  // Org search from registered clinics
  useEffect(() => {
    if (orgSearch.length < 2) { setOrgResults([]); return }
    const t = setTimeout(() =>
      api.get(`/public/clinics/search?q=${encodeURIComponent(orgSearch)}&limit=8`)
        .then(r => setOrgResults(r.data?.clinics || r.data || []))
        .catch(() => setOrgResults([])),
      300
    )
    return () => clearTimeout(t)
  }, [orgSearch])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ptRef.current && !ptRef.current.contains(e.target)) setPatients([])
      if (orgRef.current && !orgRef.current.contains(e.target)) setOrgResults([])
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const copyFromChart = async () => {
    if (!form.patient_id) return
    setCopying(true)
    try {
      const res = await api.get(`/patients/${form.patient_id}/chart-summary`)
      const data = res.data || {}
      setForm(f => ({
        ...f,
        clinical_notes: data.clinical_summary || data.soap_summary || f.clinical_notes,
        current_medications: data.medications || f.current_medications,
        relevant_investigations: data.investigations || f.relevant_investigations,
      }))
    } catch {
      // If endpoint doesn't exist, try fetching latest encounter
      try {
        const enc = await api.get(`/patients/${form.patient_id}/encounters?limit=1`)
        const latest = (enc.data?.encounters || enc.data || [])[0]
        if (latest) {
          setForm(f => ({
            ...f,
            clinical_notes: [latest.subjective, latest.assessment].filter(Boolean).join('\n\n') || f.clinical_notes,
            current_medications: latest.prescriptions?.map(p => `${p.drug_name} ${p.dosage || ''}`.trim()).join('\n') || f.current_medications,
          }))
        }
      } catch { /* ignore */ }
    } finally {
      setCopying(false)
    }
  }

  const submit = async e => {
    e.preventDefault(); setSaving(true); setErr('')
    try {
      await api.post('/inpatient/referrals', form)
      onCreated()
    } catch (ex) { setErr(ex.response?.data?.detail || ex.message || 'Failed to create referral') }
    finally { setSaving(false) }
  }

  const handlePrint = () => printReferral(null, { ...form, patient_name: selectedPatient?.full_name })

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-bold" style={{ color: '#0F2557' }}>New Referral</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition"
            >
              <Printer size={14} /> Print
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={16} /></button>
          </div>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {/* Patient search */}
          <div ref={ptRef} className="relative">
            <label className="label">Patient *</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-9"
                placeholder="Search patient by name or mobile…"
                value={ptSearch}
                onChange={e => { setPtSearch(e.target.value); if (!e.target.value) { setForm(f => ({ ...f, patient_id: '' })); setSelectedPatient(null) } }}
              />
            </div>
            {patients.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-lg bg-white">
                {patients.map(p => (
                  <button key={p.id} type="button"
                    onClick={() => {
                      setForm(f => ({ ...f, patient_id: p.id }))
                      setPtSearch(p.full_name)
                      setSelectedPatient(p)
                      setPatients([])
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 border-b last:border-0 flex justify-between"
                  >
                    <span className="font-medium">{p.full_name}</span>
                    <span className="text-gray-400 text-xs">{p.mobile || p.phone || ''}</span>
                  </button>
                ))}
              </div>
            )}
            {form.patient_id && (
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs text-green-600">Patient selected</p>
                <button
                  type="button"
                  onClick={copyFromChart}
                  disabled={copying}
                  className="flex items-center gap-1 text-xs text-[#0F2557] hover:underline font-medium"
                >
                  <Copy size={11} />
                  {copying ? 'Copying…' : 'Copy from patient chart'}
                </button>
              </div>
            )}
          </div>

          {/* Organisation / Hospital */}
          <div ref={orgRef} className="relative">
            <label className="label">Organisation / Hospital</label>
            <div className="relative">
              <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="input pl-9"
                placeholder="Search registered clinics or type hospital name…"
                value={orgSearch || form.to_clinic_name}
                onChange={e => {
                  setOrgSearch(e.target.value)
                  setForm(f => ({ ...f, to_clinic_name: e.target.value }))
                }}
              />
            </div>
            {orgResults.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-lg bg-white">
                {orgResults.map(c => (
                  <button key={c.id || c.name} type="button"
                    onClick={() => {
                      setForm(f => ({ ...f, to_clinic_name: c.name }))
                      setOrgSearch(c.name)
                      setOrgResults([])
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 border-b last:border-0 flex justify-between"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-gray-400 text-xs">{c.city || c.state || ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Referred to */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Specialty</label>
              <input className="input" placeholder="e.g. Cardiology" value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} />
            </div>
            <div>
              <label className="label">Doctor Name</label>
              <input className="input" placeholder="Dr. Name (optional)" value={form.referred_doctor} onChange={e => setForm(f => ({ ...f, referred_doctor: e.target.value }))} />
            </div>
          </div>

          {/* Reason + Urgency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Reason *</label>
              <input className="input" placeholder="Specialist consultation" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Urgency</label>
              <select className="input" value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}>
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>

          {/* Clinical */}
          <div>
            <label className="label">Clinical Summary</label>
            <textarea className="input resize-none" rows={4} value={form.clinical_notes} onChange={e => setForm(f => ({ ...f, clinical_notes: e.target.value }))} placeholder="History, examination findings, diagnosis…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Current Medications</label>
              <textarea className="input resize-none" rows={3} value={form.current_medications} onChange={e => setForm(f => ({ ...f, current_medications: e.target.value }))} placeholder="List current medications…" />
            </div>
            <div>
              <label className="label">Relevant Investigations</label>
              <textarea className="input resize-none" rows={3} value={form.relevant_investigations} onChange={e => setForm(f => ({ ...f, relevant_investigations: e.target.value }))} placeholder="Lab reports, imaging, other…" />
            </div>
          </div>

          {err && <p className="text-red-600 text-sm">{err}</p>}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="button" onClick={handlePrint} className="btn-secondary flex items-center gap-1.5">
              <Printer size={14} /> Print
            </button>
            <button type="submit" disabled={saving || !form.patient_id || !form.reason} className="btn-primary flex-1 justify-center">
              {saving ? 'Sending…' : 'Send Referral'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Create Appointment Modal ──────────────────────────────────────────────────
function CreateApptModal({ referral, onClose, onCreated }) {
  const [form, setForm] = useState({ appointment_date: '', appointment_time: '', doctor_id: '', notes: '' })
  const [doctors, setDoctors] = useState([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    api.get('/clinic/doctors').then(r => setDoctors(Array.isArray(r) ? r : [])).catch(() => {})
  }, [])

  const submit = async e => {
    e.preventDefault(); setSaving(true); setErr('')
    try {
      await appointmentsApi.create({
        patient_id: referral.patient_id,
        doctor_id: form.doctor_id ? parseInt(form.doctor_id) : undefined,
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        notes: `Referral: ${referral.reason}. ${form.notes}`.trim(),
        referral_id: referral.id,
      })
      onCreated()
    } catch (ex) { setErr(ex.message || 'Failed to book') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: '#0F2557' }}>Book Appointment</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><X size={16} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">{referral.patient_name} · {referral.reason}</p>
        <form onSubmit={submit} className="space-y-3">
          <div><label className="label">Date *</label><input type="date" className="input" value={form.appointment_date} onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))} required /></div>
          <div><label className="label">Time *</label><input type="time" className="input" value={form.appointment_time} onChange={e => setForm(f => ({ ...f, appointment_time: e.target.value }))} required /></div>
          <div>
            <label className="label">Doctor</label>
            <select className="input" value={form.doctor_id} onChange={e => setForm(f => ({ ...f, doctor_id: e.target.value }))}>
              <option value="">Any available</option>
              {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
          </div>
          <div><label className="label">Notes</label><input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes…" /></div>
          {err && <p className="text-red-600 text-sm">{err}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Booking…' : 'Book'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Referral Row (expandable) ─────────────────────────────────────────────────
function ReferralRow({ r, isIncoming, onAction }) {
  const [expanded, setExpanded] = useState(false)
  const [outcomeNotes, setOutcomeNotes] = useState(r.outcome_notes || '')
  const [savingOutcome, setSavingOutcome] = useState(false)
  const [apptModal, setApptModal] = useState(false)

  const saveOutcome = async () => {
    setSavingOutcome(true)
    try {
      await api.put(`/inpatient/referrals/${r.id}`, { outcome_notes: outcomeNotes })
    } catch (e) { alert(e.message || 'Save failed') }
    finally { setSavingOutcome(false) }
  }

  return (
    <>
      <tr className="tr-hover cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <td className="td font-mono text-xs">{r.referral_code || `REF-${r.id}`}</td>
        <td className="td font-medium">{r.patient_name || '—'}</td>
        <td className="td text-sm text-gray-500">{isIncoming ? (r.from_clinic_name || 'External') : (r.to_clinic_name || r.specialty || 'External')}</td>
        <td className="td text-xs text-gray-600 max-w-xs truncate">{r.reason}</td>
        <td className="td"><span className={`badge ${URGENCY_STYLE[r.urgency] || 'badge-gray'}`}>{r.urgency}</span></td>
        <td className="td"><span className={`badge ${STATUS_STYLE[r.status] || 'badge-gray'}`}>{r.status}</span></td>
        <td className="td text-xs text-gray-400">{r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—'}</td>
        <td className="td">
          <div className="flex items-center gap-1">
            <button
              onClick={e => { e.stopPropagation(); printReferral(r) }}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              title="Print referral letter"
            >
              <Printer size={14} />
            </button>
            {isIncoming && r.status === 'pending' && (
              <>
                <button onClick={e => { e.stopPropagation(); onAction(r.id, 'accept') }} className="p-1 rounded-lg hover:bg-green-50 text-green-600" title="Accept"><CheckCircle size={16} /></button>
                <button onClick={e => { e.stopPropagation(); onAction(r.id, 'reject') }} className="p-1 rounded-lg hover:bg-red-50 text-red-500" title="Reject"><XCircle size={16} /></button>
              </>
            )}
            {isIncoming && r.status === 'accepted' && (
              <button onClick={e => { e.stopPropagation(); setApptModal(true) }} className="flex items-center gap-1 text-xs text-blue-600 hover:underline px-1">
                <CalendarPlus size={14} />Book
              </button>
            )}
            {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="px-4 pb-4 pt-0 bg-gray-50/60">
            <div className="py-3 space-y-3 text-sm">
              {r.specialty && <p><span className="text-gray-400">Specialty:</span> <span className="font-medium">{r.specialty}</span></p>}
              {r.referred_doctor && <p><span className="text-gray-400">Referred to Doctor:</span> <span className="font-medium">{r.referred_doctor}</span></p>}
              {r.clinical_notes && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Clinical Summary</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{r.clinical_notes}</p>
                </div>
              )}
              {r.current_medications && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Current Medications</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{r.current_medications}</p>
                </div>
              )}
              {r.relevant_investigations && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Relevant Investigations</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{r.relevant_investigations}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Outcome Notes</p>
                {r.status === 'completed' ? (
                  <div className="flex gap-2 items-start">
                    <textarea
                      className="input resize-none flex-1 text-sm"
                      rows={2}
                      value={outcomeNotes}
                      onChange={e => setOutcomeNotes(e.target.value)}
                      placeholder="Record outcome of this referral…"
                    />
                    <button onClick={saveOutcome} disabled={savingOutcome} className="btn-secondary text-xs py-1.5">
                      {savingOutcome ? '…' : 'Save'}
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">{r.outcome_notes || 'No outcome notes yet'}</p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
      {apptModal && (
        <tr><td colSpan={8} className="p-0">
          <CreateApptModal
            referral={r}
            onClose={() => setApptModal(false)}
            onCreated={() => { setApptModal(false); onAction(r.id, 'refresh') }}
          />
        </td></tr>
      )}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Referrals() {
  const [tab, setTab] = useState('outgoing')
  const [outgoing, setOutgoing] = useState([])
  const [incoming, setIncoming] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [err, setErr] = useState('')

  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [hcSearch, setHcSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const load = useCallback(async (invalidate = false) => {
    setLoading(true)
    try {
      if (invalidate) {
        await cacheInvalidate('referrals_outgoing')
        await cacheInvalidate('referrals_incoming')
      }
      await Promise.all([
        cachedFetch('referrals_outgoing', () => api.get('/inpatient/referrals?direction=outgoing'), r => setOutgoing(Array.isArray(r) ? r : (r?.items || [])), TTL.SHORT),
        cachedFetch('referrals_incoming', () => api.get('/inpatient/referrals?direction=incoming'), r => setIncoming(Array.isArray(r) ? r : (r?.items || [])), TTL.SHORT),
      ])
    } catch {
      try {
        const [s, recv] = await Promise.all([
          api.get('/referrals/sent'),
          api.get('/referrals/received'),
        ])
        setOutgoing(Array.isArray(s) ? s : [])
        setIncoming(Array.isArray(recv) ? recv : [])
      } catch (e) {
        setErr(e.message || 'Could not load referrals')
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAction = async (id, action) => {
    if (action === 'refresh') { load(true); return }
    try {
      if (action === 'accept') await api.put(`/inpatient/referrals/${id}`, { status: 'accepted' })
      else if (action === 'reject') await api.put(`/inpatient/referrals/${id}`, { status: 'rejected' })
      load(true)
    } catch (e) { alert(e.message || 'Action failed') }
  }

  const rawList = tab === 'outgoing' ? outgoing : incoming

  const list = rawList.filter(r => {
    if (statusFilter && r.status !== statusFilter) return false
    if (dateFrom && new Date(r.created_at) < new Date(dateFrom)) return false
    if (dateTo && new Date(r.created_at) > new Date(dateTo + 'T23:59:59')) return false
    if (hcSearch) {
      const target = tab === 'outgoing' ? (r.to_clinic_name || '') : (r.from_clinic_name || '')
      if (!target.toLowerCase().includes(hcSearch.toLowerCase())) return false
    }
    return true
  })

  const TableHead = () => (
    <thead><tr>
      <th className="th">Code</th>
      <th className="th">Patient</th>
      <th className="th">{tab === 'outgoing' ? 'Referred To' : 'From'}</th>
      <th className="th">Reason</th>
      <th className="th">Urgency</th>
      <th className="th">Status</th>
      <th className="th">Date</th>
      <th className="th"></th>
    </tr></thead>
  )

  const hasFilters = dateFrom || dateTo || hcSearch || statusFilter

  return (
    <div>
      {err && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">{err}</div>}

      {/* Tabs + New Referral button inline */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setTab('outgoing')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === 'outgoing' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Send size={13} />Outgoing ({outgoing.length})
          </button>
          <button
            onClick={() => setTab('incoming')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === 'incoming' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Inbox size={13} />Incoming ({incoming.length})
          </button>
        </div>

        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-1.5 ml-auto">
          <Plus size={16} />New Referral
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-8 w-48 text-sm"
            placeholder={tab === 'outgoing' ? 'Search hospital…' : 'Search from clinic…'}
            value={hcSearch}
            onChange={e => setHcSearch(e.target.value)}
          />
        </div>
        <input type="date" className="input w-36 text-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From date" />
        <span className="self-center text-gray-400 text-sm">to</span>
        <input type="date" className="input w-36 text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} title="To date" />
        <select className="input w-36 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); setHcSearch(''); setStatusFilter('') }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-600 px-2"
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {loading ? <PageLoader /> : (
          <div className="table-wrapper">
            <table className="table">
              <TableHead />
              <tbody className="divide-y divide-gray-100">
                {list.length === 0 ? (
                  <tr><td colSpan={8} className="td text-center text-gray-400 py-10">No referrals</td></tr>
                ) : list.map(r => (
                  <ReferralRow
                    key={r.id}
                    r={r}
                    isIncoming={tab === 'incoming'}
                    onAction={handleAction}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNew && (
        <NewReferralModal
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load(true) }}
        />
      )}
    </div>
  )
}
