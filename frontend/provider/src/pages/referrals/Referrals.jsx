import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../../api/client'
import { patientsApi, appointmentsApi, doctorApi } from '../../api'
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
    <div class="section"><div class="label">Referred To</div><div class="value">${data.to_clinic_name || '—'}${data.to_hc_id ? ` (HC ${data.to_hc_id})` : ''}</div></div>
    <div class="section"><div class="label">Specialty</div><div class="value">${data.specialty || '—'}</div></div>
    ${data.referred_doctor ? `<div class="section"><div class="label">Attention: Doctor</div><div class="value">${data.referred_doctor}</div></div>` : ''}
  </div>
  <div class="section"><div class="label">Reason for Referral</div><div class="value">${data.reason || '—'}</div></div>
  ${data.clinical_notes ? `<div class="section"><div class="label">Clinical Summary</div><div class="value" style="white-space:pre-wrap">${data.clinical_notes}</div></div>` : ''}
  ${data.current_medications ? `<div class="section"><div class="label">Current Medications</div><div class="value" style="white-space:pre-wrap">${data.current_medications}</div></div>` : ''}
  ${data.relevant_investigations ? `<div class="section"><div class="label">Relevant Investigations</div><div class="value" style="white-space:pre-wrap">${data.relevant_investigations}</div></div>` : ''}
  <div class="sig">Referred by Bharath Health Systems Provider Portal · Printed ${new Date().toLocaleString('en-IN')}</div>
  <script>window.onload=()=>{ window.print(); }<\/script>
  </body></html>`)
  win.document.close()
}

// Build clinical-summary / medications / investigations text from chart visits.
function buildChartSummaries(visits) {
  const list = Array.isArray(visits) ? visits : []
  const latest = list[0]

  const soapParts = []
  if (latest?.soap) {
    const s = latest.soap
    if (s.subjective) soapParts.push(`S: ${s.subjective}`)
    if (s.objective)  soapParts.push(`O: ${s.objective}`)
    if (s.assessment) soapParts.push(`A: ${s.assessment}`)
    if (s.plan)       soapParts.push(`P: ${s.plan}`)
  }
  if (!soapParts.length && latest?.reason) soapParts.push(latest.reason)
  const clinical = soapParts.join('\n')

  // Medications: most-recent visit = currently active; older = past/stopped
  const medLines = []
  list.forEach((v, vi) => {
    (v.prescriptions || []).flatMap(p => p.items || []).forEach(m => {
      const line = [m.medicine_name, m.dosage, m.frequency, m.duration].filter(Boolean).join(' ')
      if (line) medLines.push(vi === 0 ? `• [Active] ${line}` : `• [Past] ${line} (${v.date})`)
    })
  })
  const medications = [...new Set(medLines)].join('\n')

  // Investigations: recent labs + the latest interpretation (assessment)
  const invLines = []
  list.forEach(v => {
    (v.lab_orders || []).flatMap(lo => lo.items || []).forEach(it => {
      invLines.push(`• ${it.test_name}${it.result_value ? `: ${it.result_value}` : ''}${it.is_abnormal ? ' (abnormal)' : ''} — ${v.date}`)
    })
  })
  let investigations = [...new Set(invLines)].join('\n')
  if (latest?.soap?.assessment) investigations += `${investigations ? '\n\n' : ''}Interpretation: ${latest.soap.assessment}`
  return { clinical, medications, investigations }
}

// ── New Referral Modal ────────────────────────────────────────────────────────
function NewReferralModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    patient_id: '', reason: '', urgency: 'routine',
    clinical_notes: '', to_clinic_name: '', to_clinic_id: '', to_hc_id: '', registered: false,
    specialty: '', referred_doctor: '',
    current_medications: '', relevant_investigations: '',
  })
  const [ptSearch, setPtSearch] = useState('')
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [orgSearch, setOrgSearch] = useState('')
  const [orgResults, setOrgResults] = useState([])
  const [chart, setChart] = useState(null)       // cached chart summaries
  const [saving, setSaving] = useState(false)
  const [copying, setCopying] = useState(false)
  const [err, setErr] = useState('')
  const ptRef = useRef(null)
  const orgRef = useRef(null)

  // Patient suggestions — scoped to THIS clinic via /patients
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

  // Org search — registered Bharath Health network clinics (returns id + hc_id)
  useEffect(() => {
    if (orgSearch.length < 2) { setOrgResults([]); return }
    const t = setTimeout(() =>
      api.get(`/referrals/network/clinics?q=${encodeURIComponent(orgSearch)}`)
        .then(r => setOrgResults(Array.isArray(r) ? r : (r?.clinics || [])))
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

  // Fetch + cache chart summaries for the selected patient
  const ensureChart = async () => {
    if (chart) return chart
    const visits = await doctorApi.getPatientVisits(form.patient_id, 20)
    const built = buildChartSummaries(visits)
    setChart(built)
    return built
  }

  const copyFromChart = async () => {
    if (!form.patient_id) return
    setCopying(true)
    try {
      const c = await ensureChart()
      setForm(f => ({
        ...f,
        clinical_notes: c.clinical || f.clinical_notes,
        current_medications: c.medications || f.current_medications,
        relevant_investigations: c.investigations || f.relevant_investigations,
      }))
    } catch { setErr('Could not read the patient chart.') }
    finally { setCopying(false) }
  }

  const copyField = async (key) => {
    if (!form.patient_id) return
    try {
      const c = await ensureChart()
      if (key === 'medications') setForm(f => ({ ...f, current_medications: c.medications || f.current_medications }))
      if (key === 'investigations') setForm(f => ({ ...f, relevant_investigations: c.investigations || f.relevant_investigations }))
      if (key === 'clinical') setForm(f => ({ ...f, clinical_notes: c.clinical || f.clinical_notes }))
    } catch { setErr('Could not read the patient chart.') }
  }

  const selectOrg = (c) => {
    setForm(f => ({
      ...f,
      to_clinic_name: c.name, to_clinic_id: c.id || '', to_hc_id: c.hc_id || '',
      registered: true,
      specialty: f.specialty || c.specialty || '',
    }))
    setOrgSearch(c.name)
    setOrgResults([])
  }

  const submit = async e => {
    e.preventDefault(); setSaving(true); setErr('')
    try {
      await api.post('/referrals/', {
        patient_id: form.patient_id,
        reason: form.reason,
        urgency: form.urgency,
        clinical_notes: form.clinical_notes,
        current_medications: form.current_medications,
        relevant_investigations: form.relevant_investigations,
        to_clinic_id: form.to_clinic_id || undefined,
        to_hc_id: form.to_hc_id || undefined,
        to_clinic_name: form.to_clinic_name || undefined,
        to_specialty: form.specialty || undefined,
        to_doctor_name: form.referred_doctor || undefined,
      })
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
                onChange={e => { setPtSearch(e.target.value); if (!e.target.value) { setForm(f => ({ ...f, patient_id: '' })); setSelectedPatient(null); setChart(null) } }}
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
                      setChart(null)
                      setPatients([])
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 border-b last:border-0 flex justify-between"
                  >
                    <span className="font-medium">{p.full_name}</span>
                    <span className="text-gray-400 text-xs">{p.mobile || p.phone || ''}{p.bh_id ? ` · BH ${p.bh_id}` : ''}</span>
                  </button>
                ))}
              </div>
            )}
            {form.patient_id && (
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs text-green-600">Patient selected{selectedPatient?.bh_id ? ` · BH ${selectedPatient.bh_id}` : ''}</p>
                <button
                  type="button"
                  onClick={copyFromChart}
                  disabled={copying}
                  className="flex items-center gap-1 text-xs text-[#0F2557] hover:underline font-medium"
                >
                  <Copy size={11} />
                  {copying ? 'Copying…' : 'Copy all from chart'}
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
                placeholder="Search registered health centres or type a hospital name…"
                value={orgSearch || form.to_clinic_name}
                onChange={e => {
                  setOrgSearch(e.target.value)
                  setForm(f => ({ ...f, to_clinic_name: e.target.value, to_clinic_id: '', to_hc_id: '', registered: false }))
                }}
              />
            </div>
            {form.to_clinic_name && (
              form.registered ? (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle size={11} /> On Bharath Health network{form.to_hc_id ? ` · HC ${form.to_hc_id}` : ''} — status will sync to both portals.
                </p>
              ) : (
                <p className="text-xs text-amber-600 mt-1">Not on network — referral letter can be printed and handed over manually.</p>
              )
            )}
            {orgResults.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-lg bg-white">
                {orgResults.map(c => (
                  <button key={c.id || c.name} type="button"
                    onClick={() => selectOrg(c)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 border-b last:border-0 flex justify-between"
                  >
                    <span className="font-medium">{c.name}{c.hc_id ? <span className="text-gray-400 font-mono text-xs ml-1.5">{c.hc_id}</span> : null}</span>
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
            <div className="flex items-center justify-between">
              <label className="label">Clinical Summary</label>
              {form.patient_id && (
                <button type="button" onClick={() => copyField('clinical')} className="flex items-center gap-1 text-xs text-[#0F2557] hover:underline">
                  <Copy size={10} /> Copy from chart
                </button>
              )}
            </div>
            <textarea className="input resize-none" rows={4} value={form.clinical_notes} onChange={e => setForm(f => ({ ...f, clinical_notes: e.target.value }))} placeholder="History, examination findings, diagnosis…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="label">Current Medications</label>
                {form.patient_id && (
                  <button type="button" onClick={() => copyField('medications')} className="flex items-center gap-1 text-xs text-[#0F2557] hover:underline">
                    <Copy size={10} /> Copy
                  </button>
                )}
              </div>
              <textarea className="input resize-none" rows={3} value={form.current_medications} onChange={e => setForm(f => ({ ...f, current_medications: e.target.value }))} placeholder="Active & stopped medications from this clinic…" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="label">Relevant Investigations</label>
                {form.patient_id && (
                  <button type="button" onClick={() => copyField('investigations')} className="flex items-center gap-1 text-xs text-[#0F2557] hover:underline">
                    <Copy size={10} /> Copy
                  </button>
                )}
              </div>
              <textarea className="input resize-none" rows={3} value={form.relevant_investigations} onChange={e => setForm(f => ({ ...f, relevant_investigations: e.target.value }))} placeholder="Recent investigations & interpretation…" />
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
  const [outcomeNotes, setOutcomeNotes] = useState(r.response_notes || '')
  const [savingOutcome, setSavingOutcome] = useState(false)
  const [apptModal, setApptModal] = useState(false)

  const saveOutcome = async () => {
    setSavingOutcome(true)
    try {
      await api.put(`/referrals/${r.id}/status`, { status: 'completed', response_notes: outcomeNotes })
    } catch (e) { alert(e.message || 'Save failed') }
    finally { setSavingOutcome(false) }
  }

  return (
    <>
      <tr className="tr-hover cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <td className="td font-mono text-xs">{r.referral_code || `REF-${r.id}`}</td>
        <td className="td font-medium">{r.patient_name || '—'}</td>
        <td className="td text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <span>{isIncoming ? (r.from_clinic_name || 'External') : (r.to_clinic_name || r.specialty || 'External')}</span>
            {!isIncoming && r.registered && <span className="badge badge-green text-[10px]">Network</span>}
          </div>
          {(isIncoming ? r.from_hc_id : r.to_hc_id) && (
            <div className="text-[10px] text-gray-400 font-mono">HC {isIncoming ? r.from_hc_id : r.to_hc_id}</div>
          )}
          {!isIncoming && r.registered && r.patient_arrived && (
            <div className="text-[10px] text-green-600">✓ Patient arrived — synced</div>
          )}
        </td>
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
                  <p className="text-gray-500 italic">{r.response_notes || 'No outcome notes yet'}</p>
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
    setErr('')
    try {
      if (invalidate) {
        await cacheInvalidate('referrals_sent')
        await cacheInvalidate('referrals_received')
      }
      await Promise.all([
        cachedFetch('referrals_sent', () => api.get('/referrals/sent'), r => setOutgoing(Array.isArray(r) ? r : []), TTL.SHORT),
        cachedFetch('referrals_received', () => api.get('/referrals/received'), r => setIncoming(Array.isArray(r) ? r : []), TTL.SHORT),
      ])
    } catch (e) {
      setErr(e.message || 'Could not load referrals')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAction = async (id, action) => {
    if (action === 'refresh') { load(true); return }
    try {
      if (action === 'accept') await api.put(`/referrals/${id}/status`, { status: 'accepted' })
      else if (action === 'reject') await api.put(`/referrals/${id}/status`, { status: 'rejected' })
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
