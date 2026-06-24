import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Plus, X, ChevronDown, ChevronUp, Lock, Loader2,
  AlertTriangle, FileText, FileCheck, FileClock, FileX,
  Printer, Download, CheckCircle2, AlertCircle, Shield,
  ClipboardList, Heart, Stethoscope, CreditCard, Send,
  Scissors, User, ChevronRight, Filter
} from 'lucide-react'
import api from '../api/client'

import { GREEN, NAVY, RED } from '../constants/colors'

// ─── document categories & templates ─────────────────────────────────────────
const CATEGORIES = [
  {
    key: 'consent',
    label: 'Consents',
    icon: FileCheck,
    color: GREEN,
    templates: [
      'General Treatment Consent',
      'Surgical / Procedure Consent',
      'Anaesthesia Consent',
      'Blood Transfusion Consent',
      'HIV Testing Consent',
      'Photography / Video Consent',
      'Research / Clinical Trial Consent',
    ],
  },
  {
    key: 'mlc',
    label: 'Medico-Legal (MLC)',
    icon: Shield,
    color: RED,
    templates: [
      'MLC Registration',
      'Police Intimation Form',
      'Wound Certificate',
      'Assault / Accident Report',
      'Death Intimation (MLC)',
    ],
  },
  {
    key: 'directive',
    label: 'Advance Directives',
    icon: Heart,
    color: '#7c3aed',
    templates: [
      'DNR / DNAR Order',
      'Code Status Change',
      'Living Will',
      'Durable Power of Attorney',
    ],
  },
  {
    key: 'plan',
    label: 'Treatment Plans',
    icon: ClipboardList,
    color: '#0369a1',
    templates: [
      'Nursing Care Plan',
      'Multidisciplinary Care Plan',
      'Palliative Care Plan',
    ],
  },
  {
    key: 'certificate',
    label: 'Certificates & Letters',
    icon: FileText,
    color: '#a16207',
    templates: [
      'Fitness Certificate',
      'Sick Leave Certificate',
      'Disability Certificate',
      'Birth Intimation',
      'External Referral Letter',
    ],
  },
  {
    key: 'insurance',
    label: 'Insurance / TPA',
    icon: CreditCard,
    color: '#0891b2',
    templates: [
      'Pre-Authorisation Request',
      'Cashless Approval Form',
      'Insurance Claim Form',
      'Day-care Request',
    ],
  },
  {
    key: 'referral',
    label: 'Referrals',
    icon: Send,
    color: '#059669',
    templates: [
      'Internal Referral — Physiotherapy',
      'Internal Referral — Dietitian',
      'Internal Referral — Social Work',
      'Internal Referral — Wound Care',
    ],
  },
  {
    key: 'operative',
    label: 'Operative Documents',
    icon: Scissors,
    color: '#dc2626',
    templates: [
      'Pre-op Checklist',
      'WHO Surgical Safety Checklist',
      'Anaesthesia Pre-assessment',
      'Post-op Nursing Handover',
    ],
  },
]

const STATUS_CFG = {
  draft:     { label: 'Draft',            bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb', icon: FileClock },
  pending:   { label: 'Pending Sig.',     bg: '#fef9c3', color: '#a16207', border: '#fde047', icon: FileClock },
  signed:    { label: 'Signed',           bg: '#dcfce7', color: '#15803d', border: '#bbf7d0', icon: FileCheck },
  expired:   { label: 'Expired',          bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5', icon: FileX },
}

// ─── mock data ────────────────────────────────────────────────────────────────
function buildMock(admission) {
  const now = new Date()
  const iso = d => d.toISOString()
  const ago = h => iso(new Date(now.getTime() - h * 3600000))

  const name = admission?.patient_name || 'Rajesh Kumar'
  const doctor = admission?.attending_doctor || 'Dr. Ananya Sharma'

  return [
    {
      id: 1, category: 'consent', template: 'General Treatment Consent', status: 'signed',
      created_by: doctor, created_at: ago(52), signed_at: ago(50),
      mlc: false,
      fields: {
        patient_name: name, age: 45, diagnosis: 'Acute Appendicitis', hospital: 'BHarath Health Systems',
        procedure: 'General medical treatment and nursing care',
        risks: ['Medication reactions', 'Infection risk', 'Procedure-related complications'],
        understood: true,
      },
      signatures: {
        doctor: { name: doctor, role: 'Consultant', time: ago(50), pin_verified: true },
        patient: { name: name, relationship: 'Self', time: ago(50) },
        witness: { name: 'Nurse Priya Nair', role: 'Staff Nurse', time: ago(50), pin_verified: true },
      },
    },
    {
      id: 2, category: 'consent', template: 'Surgical / Procedure Consent', status: 'pending',
      created_by: doctor, created_at: ago(3), signed_at: null,
      mlc: false,
      fields: {
        patient_name: name, age: 45, diagnosis: 'Acute Appendicitis',
        procedure: 'Laparoscopic Appendectomy',
        anaesthesia: 'General Anaesthesia',
        risks: ['Bleeding', 'Infection', 'Injury to surrounding structures', 'Conversion to open surgery', 'Anaesthesia complications'],
        alternatives: 'Open appendectomy',
        surgeon: doctor,
      },
      signatures: {
        doctor: null,
        patient: null,
        witness: null,
      },
    },
    {
      id: 3, category: 'mlc', template: 'MLC Registration', status: 'signed',
      created_by: 'Dr. Ravi Menon', created_at: ago(48), signed_at: ago(47),
      mlc: true,
      fields: {
        patient_name: name, mlc_no: 'MLC/2026/0142',
        incident_type: 'Road Traffic Accident',
        brought_by: 'Police — PS Koramangala',
        police_station: 'Koramangala PS',
        fi_no: 'FI 245/2026',
        injuries: 'Abrasions on forehead, right arm. Contusion right knee.',
        time_of_intimation: ago(48),
        police_officer: 'HC Ramesh, No. 1847',
      },
      signatures: {
        doctor: { name: 'Dr. Ravi Menon', role: 'Medical Officer', time: ago(47), pin_verified: true },
        witness: { name: 'Nurse Kavitha', role: 'Staff Nurse', time: ago(47), pin_verified: true },
      },
    },
    {
      id: 4, category: 'operative', template: 'Pre-op Checklist', status: 'draft',
      created_by: 'Nurse Priya Nair', created_at: ago(1), signed_at: null,
      mlc: false,
      fields: {
        patient_name: name, procedure: 'Laparoscopic Appendectomy',
        checklist: {
          'Identity confirmed (wristband)': true,
          'Consent form signed': false,
          'Fasting confirmed (>6h)': true,
          'Allergies documented': true,
          'Pre-op investigations done': true,
          'Blood group confirmed': true,
          'Jewellery / valuables removed': false,
          'Nail polish / makeup removed': true,
          'IV access secured': true,
          'Pre-op medications given': false,
          'Bowel prep done (if required)': false,
        },
      },
      signatures: { nurse: null, doctor: null },
    },
    {
      id: 5, category: 'insurance', template: 'Pre-Authorisation Request', status: 'pending',
      created_by: doctor, created_at: ago(5), signed_at: null,
      mlc: false,
      fields: {
        patient_name: name, uhid: 'BHS/2026/0445',
        insurance_provider: 'Star Health Insurance',
        policy_no: 'SHI/2024/774821',
        tpa: 'Medi Assist TPA',
        diagnosis: 'Acute Appendicitis (K37)',
        proposed_procedure: 'Laparoscopic Appendectomy',
        estimated_cost: 85000,
        admission_date: ago(52),
        expected_discharge: iso(new Date(now.getTime() + 2 * 86400000)),
        urgency: 'Semi-urgent',
      },
      signatures: { doctor: null },
    },
  ]
}

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmtDt = d => new Date(d).toLocaleString('en-IN', {
  day: 'numeric', month: 'short', year: 'numeric',
  hour: '2-digit', minute: '2-digit', hour12: true,
})
const fmtDate = d => new Date(d).toLocaleDateString('en-IN', {
  day: 'numeric', month: 'short', year: 'numeric',
})

function catCfg(key) { return CATEGORIES.find(c => c.key === key) || CATEGORIES[0] }

function StatusPill({ status }) {
  const s = STATUS_CFG[status] || STATUS_CFG.draft
  const Icon = s.icon
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}>
      <Icon size={9} />{s.label}
    </span>
  )
}

// ─── PIN modal ────────────────────────────────────────────────────────────────
function PinModal({ title, onConfirm, onCancel }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (pin.length < 4) { setErr('Enter your PIN'); return }
    setLoading(true); setErr('')
    try {
      await api.post('/auth/staff/pin-identify', { pin })
      onConfirm()
    } catch { setErr('Invalid PIN') } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={16} style={{ color: GREEN }} />
          <span className="font-bold text-sm text-gray-800">{title}</span>
        </div>
        <input type="password" placeholder="Enter PIN" value={pin} onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          className="w-full border rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:ring-2"
          autoFocus />
        {err && <p className="text-red-600 text-xs mb-3">{err}</p>}
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={submit} disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1"
            style={{ background: GREEN }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Sign & Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── New document modal ───────────────────────────────────────────────────────
function NewDocModal({ onClose, onCreate }) {
  const [selCat, setSelCat] = useState(null)
  const [selTpl, setSelTpl] = useState(null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-[520px] max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ background: NAVY }}>
          <span className="text-white font-bold">New Document</span>
          <button onClick={onClose}><X size={16} className="text-white" /></button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          {/* categories */}
          <div className="w-48 flex-shrink-0 border-r overflow-y-auto" style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
            {CATEGORIES.map(cat => {
              const Icon = cat.icon
              return (
                <button key={cat.key} onClick={() => { setSelCat(cat.key); setSelTpl(null) }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold border-b transition-colors"
                  style={{
                    borderColor: '#f0f0f0',
                    background: selCat === cat.key ? `${cat.color}12` : 'transparent',
                    color: selCat === cat.key ? cat.color : '#374151',
                  }}>
                  <Icon size={12} style={{ color: cat.color, flexShrink: 0 }} />
                  {cat.label}
                </button>
              )
            })}
          </div>
          {/* templates */}
          <div className="flex-1 overflow-y-auto p-4">
            {!selCat
              ? <p className="text-xs text-gray-400 text-center mt-8">Select a category</p>
              : catCfg(selCat).templates.map(tpl => (
                <button key={tpl} onClick={() => setSelTpl(tpl)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg mb-1.5 text-left text-xs font-medium border transition-colors"
                  style={{
                    borderColor: selTpl === tpl ? catCfg(selCat).color : '#e9eaec',
                    background: selTpl === tpl ? `${catCfg(selCat).color}0e` : 'white',
                    color: selTpl === tpl ? catCfg(selCat).color : '#374151',
                  }}>
                  {tpl}
                  {selTpl === tpl && <CheckCircle2 size={13} style={{ color: catCfg(selCat).color, flexShrink: 0 }} />}
                </button>
              ))
            }
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t flex-shrink-0" style={{ borderColor: '#e9eaec' }}>
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => selCat && selTpl && onCreate(selCat, selTpl)} disabled={!selCat || !selTpl}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: NAVY }}>
            Create Document
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Print view ───────────────────────────────────────────────────────────────
function PrintableDoc({ doc, admission, onClose }) {
  const cat = catCfg(doc.category)
  const s   = STATUS_CFG[doc.status]
  const printRef = useRef()

  const handlePrint = () => {
    const content = printRef.current.innerHTML
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>${doc.template}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 32px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        h2 { font-size: 13px; color: #444; margin: 16px 0 6px; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
        .field { display: flex; gap: 8px; margin: 4px 0; }
        .label { font-weight: bold; min-width: 160px; }
        .sig-block { border: 1px solid #ccc; padding: 12px; margin: 8px 0; border-radius: 4px; }
        .watermark { color: #15803d; font-weight: bold; font-size: 10px; }
        .mlc-badge { background: #fee2e2; color: #b91c1c; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin: 8px 0; }
        td, th { border: 1px solid #ddd; padding: 6px 8px; font-size: 11px; }
        th { background: #f3f4f6; font-weight: bold; }
        @media print { body { padding: 16px; } }
      </style></head><body>${content}</body></html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 400)
  }

  const f = doc.fields || {}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-[680px] max-h-[90vh] flex flex-col overflow-hidden">
        {/* toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0"
          style={{ background: '#f9fafb', borderColor: '#e9eaec' }}>
          <span className="font-bold text-sm text-gray-800">{doc.template}</span>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ background: NAVY }}>
              <Printer size={12} /> Print
            </button>
            <button onClick={onClose}><X size={16} className="text-gray-500" /></button>
          </div>
        </div>

        {/* printable content */}
        <div className="flex-1 overflow-y-auto p-6" ref={printRef}>
          {/* header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold text-gray-900">{doc.template}</span>
                {doc.mlc && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: '#fee2e2', color: RED }}>⚠ MLC</span>
                )}
              </div>
              <p className="text-xs text-gray-500">BHarath Health Systems · {fmtDt(doc.created_at)}</p>
              <p className="text-xs text-gray-500">Created by {doc.created_by}</p>
            </div>
            <StatusPill status={doc.status} />
          </div>

          {/* patient info */}
          <div className="rounded-lg border p-3 mb-4 grid grid-cols-2 gap-x-6 gap-y-1.5"
            style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
            <div className="flex gap-2 text-xs"><span className="font-bold text-gray-500 w-28">Patient Name</span><span>{f.patient_name || admission?.patient_name || '—'}</span></div>
            <div className="flex gap-2 text-xs"><span className="font-bold text-gray-500 w-28">Age / Sex</span><span>{f.age || admission?.age || '—'} yrs</span></div>
            <div className="flex gap-2 text-xs"><span className="font-bold text-gray-500 w-28">UHID</span><span>{f.uhid || admission?.uhid || 'BHS/2026/0445'}</span></div>
            <div className="flex gap-2 text-xs"><span className="font-bold text-gray-500 w-28">Diagnosis</span><span>{f.diagnosis || admission?.primary_diagnosis || '—'}</span></div>
          </div>

          {/* dynamic fields by category */}
          {doc.category === 'consent' && <ConsentFields f={f} doc={doc} />}
          {doc.category === 'mlc'     && <MlcFields f={f} />}
          {doc.category === 'operative' && <OperativeFields f={f} />}
          {doc.category === 'insurance' && <InsuranceFields f={f} />}
          {doc.category === 'directive' && <DirectiveFields f={f} doc={doc} />}
          {doc.category === 'plan'     && <PlanFields f={f} />}
          {doc.category === 'certificate' && <CertificateFields f={f} />}
          {doc.category === 'referral' && <ReferralFields f={f} />}

          {/* signature block */}
          <SignatureBlock doc={doc} />
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  const str = String(value || '')
  const isLong = str.length >= 80
  if (isLong) {
    return (
      <div className="text-xs mb-2">
        <span className="block font-bold text-gray-500 mb-0.5">{label}</span>
        <span className="text-gray-800 leading-relaxed">{str || '—'}</span>
      </div>
    )
  }
  return (
    <div className="flex gap-2 text-xs mb-1.5">
      <span className="font-bold text-gray-500 w-40 flex-shrink-0">{label}</span>
      <span className="text-gray-800">{str || '—'}</span>
    </div>
  )
}

function SectionH({ title }) {
  return <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-4 mb-2 border-b pb-1" style={{ borderColor: '#e9eaec' }}>{title}</p>
}

function ConsentFields({ f, doc }) {
  return (
    <>
      <SectionH title="Procedure Details" />
      <Row label="Procedure / Treatment" value={f.procedure} />
      {f.anaesthesia && <Row label="Anaesthesia Type" value={f.anaesthesia} />}
      {f.surgeon && <Row label="Performing Surgeon" value={f.surgeon} />}
      {f.alternatives && <Row label="Alternatives Discussed" value={f.alternatives} />}
      {f.risks?.length > 0 && (
        <>
          <SectionH title="Risks Explained" />
          <ul className="list-disc ml-4">
            {f.risks.map(r => <li key={r} className="text-xs text-gray-700 mb-0.5">{r}</li>)}
          </ul>
        </>
      )}
      <SectionH title="Declaration" />
      <p className="text-xs text-gray-700 leading-relaxed">
        I, <b>{f.patient_name}</b>, hereby give my informed consent for the above procedure/treatment.
        I confirm that the nature of the procedure, risks, benefits, and alternatives have been explained
        to me in a language I understand, and I voluntarily agree to proceed.
      </p>
    </>
  )
}

function MlcFields({ f }) {
  return (
    <>
      <SectionH title="MLC Details" />
      <Row label="MLC Number" value={f.mlc_no} />
      <Row label="Incident Type" value={f.incident_type} />
      <Row label="Brought By" value={f.brought_by} />
      <Row label="Police Station" value={f.police_station} />
      <Row label="FIR / FI Number" value={f.fi_no} />
      <Row label="Police Officer" value={f.police_officer} />
      <Row label="Time of Intimation" value={f.time_of_intimation ? fmtDt(f.time_of_intimation) : '—'} />
      <SectionH title="Injury Description" />
      <p className="text-xs text-gray-800 leading-relaxed">{f.injuries || '—'}</p>
    </>
  )
}

function OperativeFields({ f }) {
  const cl = f.checklist || {}
  const keys = Object.keys(cl)
  const done = keys.filter(k => cl[k]).length
  return (
    <>
      <SectionH title={`Pre-op Checklist — ${done}/${keys.length} complete`} />
      <table className="w-full text-xs border" style={{ borderColor: '#e9eaec' }}>
        <tbody>
          {keys.map(k => (
            <tr key={k} className="border-b" style={{ borderColor: '#f3f4f6' }}>
              <td className="px-3 py-2 text-gray-700">{k}</td>
              <td className="px-3 py-2 w-20 text-center">
                {cl[k]
                  ? <span className="text-green-700 font-bold">✓ Yes</span>
                  : <span className="text-red-600 font-bold">✗ No</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function InsuranceFields({ f }) {
  return (
    <>
      <SectionH title="Insurance Details" />
      <Row label="Insurance Provider" value={f.insurance_provider} />
      <Row label="Policy Number" value={f.policy_no} />
      <Row label="TPA" value={f.tpa} />
      <Row label="Urgency" value={f.urgency} />
      <SectionH title="Procedure & Cost" />
      <Row label="Proposed Procedure" value={f.proposed_procedure} />
      <Row label="ICD-10 Diagnosis" value={f.diagnosis} />
      <Row label="Estimated Cost (₹)" value={f.estimated_cost ? `₹ ${Number(f.estimated_cost).toLocaleString('en-IN')}` : '—'} />
      <Row label="Expected Discharge" value={f.expected_discharge ? fmtDate(f.expected_discharge) : '—'} />
    </>
  )
}

function DirectiveFields({ f, doc }) {
  return (
    <>
      <SectionH title="Directive Details" />
      {doc.template === 'DNR / DNAR Order' && (
        <>
          <div className="rounded-lg border p-3 mb-3" style={{ borderColor: '#fca5a5', background: '#fff1f2' }}>
            <p className="text-xs font-bold text-red-700 mb-1">Do Not Resuscitate / Do Not Attempt Resuscitation</p>
            <p className="text-xs text-red-600">This order directs medical staff NOT to perform CPR or advanced cardiac life support in the event of cardiac or respiratory arrest.</p>
          </div>
          <Row label="Reason" value={f.reason} />
          <Row label="Ordered By" value={f.ordered_by} />
          <Row label="Family Informed" value={f.family_informed ? 'Yes' : 'No'} />
        </>
      )}
      {doc.template !== 'DNR / DNAR Order' && (
        <p className="text-xs text-gray-500 italic">Complete the directive form fields before signing.</p>
      )}
    </>
  )
}

function PlanFields({ f }) {
  return (
    <>
      <SectionH title="Care Plan" />
      <p className="text-xs text-gray-500 italic">Fill in care plan goals, interventions, and evaluation criteria.</p>
    </>
  )
}

function CertificateFields({ f }) {
  return (
    <>
      <SectionH title="Certificate Details" />
      <Row label="Purpose" value={f.purpose} />
      <Row label="Valid From" value={f.valid_from ? fmtDate(f.valid_from) : '—'} />
      <Row label="Valid Until" value={f.valid_until ? fmtDate(f.valid_until) : '—'} />
    </>
  )
}

function ReferralFields({ f }) {
  return (
    <>
      <SectionH title="Referral Details" />
      <Row label="Referred To" value={f.referred_to} />
      <Row label="Reason for Referral" value={f.reason} />
      <Row label="Urgency" value={f.urgency} />
      <Row label="Clinical Summary" value={f.summary} />
    </>
  )
}

function SignatureBlock({ doc }) {
  const sigs = doc.signatures || {}
  return (
    <>
      <SectionH title="Signatures" />
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(sigs).map(([role, sig]) => (
          <div key={role} className="rounded-lg border p-3"
            style={{ borderColor: sig ? '#a7f3d0' : '#e9eaec', background: sig ? '#f0fdf4' : '#f9fafb' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 capitalize">
              {role.replace('_', ' ')} Signature
            </p>
            {sig ? (
              <>
                <p className="text-xs font-semibold text-gray-800">{sig.name}</p>
                {sig.role && <p className="text-[10px] text-gray-500">{sig.role}</p>}
                {sig.relationship && <p className="text-[10px] text-gray-500">{sig.relationship}</p>}
                <p className="text-[10px] text-gray-400 mt-1">{fmtDt(sig.time)}</p>
                {sig.pin_verified && (
                  <p className="text-[9px] font-bold mt-1" style={{ color: GREEN }}>✦ PIN Verified</p>
                )}
              </>
            ) : (
              <p className="text-[10px] text-gray-400 italic">Awaiting signature</p>
            )}
          </div>
        ))}
      </div>
      {doc.status === 'signed' && (
        <div className="mt-4 text-center py-2 rounded-lg border text-[10px] font-bold"
          style={{ color: '#15803d', borderColor: '#a7f3d0', background: '#f0fdf4' }}>
          ✦ DOCUMENT SIGNED AND VERIFIED — BHarath Health Systems
        </div>
      )}
    </>
  )
}

// ─── Document viewer (right panel) ───────────────────────────────────────────
function DocViewer({ doc, onSign, onPrint }) {
  const cat = catCfg(doc.category)
  const CatIcon = cat.icon
  const f = doc.fields || {}
  const sigs = doc.signatures || {}
  const pendingSigs = Object.entries(sigs).filter(([, v]) => !v)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* doc header */}
      <div className="flex-shrink-0 px-5 py-3 border-b flex items-start justify-between gap-4"
        style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <CatIcon size={14} style={{ color: cat.color, flexShrink: 0 }} />
            <span className="font-bold text-sm text-gray-800">{doc.template}</span>
            {doc.mlc && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: '#fee2e2', color: RED }}>⚠ MLC</span>
            )}
            <StatusPill status={doc.status} />
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {doc.created_by} · {fmtDt(doc.created_at)}
            {doc.signed_at && ` · Signed ${fmtDt(doc.signed_at)}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={onPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors hover:bg-white"
            style={{ color: NAVY, borderColor: '#cbd5e1' }}>
            <Printer size={12} /> Print
          </button>
          {doc.status !== 'signed' && (
            <button onClick={onSign}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ background: GREEN }}>
              <Lock size={12} /> Sign
            </button>
          )}
        </div>
      </div>

      {/* pending sigs banner */}
      {doc.status === 'pending' && pendingSigs.length > 0 && (
        <div className="flex-shrink-0 px-5 py-2 border-b flex items-center gap-2 text-xs"
          style={{ borderColor: '#fde047', background: '#fefce8', color: '#a16207' }}>
          <AlertCircle size={12} />
          Awaiting: {pendingSigs.map(([r]) => r.replace('_', ' ')).join(', ')} signature{pendingSigs.length > 1 ? 's' : ''}
        </div>
      )}

      {/* body */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* patient strip */}
        <div className="rounded-lg border p-3 mb-4 grid grid-cols-2 gap-x-6 gap-y-1.5"
          style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
          <Row label="Patient" value={f.patient_name} />
          <Row label="Diagnosis" value={f.diagnosis} />
          {f.uhid && <Row label="UHID" value={f.uhid} />}
        </div>

        {/* category-specific content — 2-column adaptive layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {doc.category === 'consent'     && <ConsentFields f={f} doc={doc} />}
            {doc.category === 'mlc'         && <MlcFields f={f} />}
            {doc.category === 'operative'   && <OperativeFields f={f} />}
            {doc.category === 'insurance'   && <InsuranceFields f={f} />}
            {doc.category === 'directive'   && <DirectiveFields f={f} doc={doc} />}
            {doc.category === 'plan'        && <PlanFields f={f} />}
            {doc.category === 'certificate' && <CertificateFields f={f} />}
            {doc.category === 'referral'    && <ReferralFields f={f} />}
          </div>
          <div>
            {/* Right column: additional document metadata and notes */}
            <SectionH title="Document Info" />
            <Row label="Template" value={doc.template} />
            <Row label="Created by" value={doc.created_by} />
            <Row label="Created at" value={doc.created_at ? new Date(doc.created_at).toLocaleString('en-IN') : '—'} />
            {doc.signed_at && <Row label="Signed at" value={new Date(doc.signed_at).toLocaleString('en-IN')} />}
            {doc.notes && (
              <>
                <SectionH title="Notes" />
                <p className="text-xs text-gray-700 leading-relaxed">{doc.notes}</p>
              </>
            )}
          </div>
        </div>

        {/* signature block */}
        <SignatureBlock doc={doc} />
      </div>
    </div>
  )
}

// ─── Left panel document list ─────────────────────────────────────────────────
function DocList({ docs, selected, onSelect, onNew }) {
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [collapsed, setCollapsed]     = useState({})

  const statuses = ['all', 'draft', 'pending', 'signed', 'expired']

  const filtered = docs.filter(d => {
    const matchSearch = d.template.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || d.status === statusFilter
    return matchSearch && matchStatus
  })

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = filtered.filter(d => d.category === cat.key)
    if (items.length) acc[cat.key] = items
    return acc
  }, {})

  const toggle = key => setCollapsed(p => ({ ...p, [key]: !p[key] }))

  return (
    <div className="flex flex-col h-full overflow-hidden border-r" style={{ borderColor: '#e9eaec' }}>
      {/* search + new */}
      <div className="flex-shrink-0 p-3 border-b space-y-2" style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents…"
              className="w-full pl-7 pr-3 py-1.5 text-xs border rounded-lg outline-none"
              style={{ borderColor: '#d1d5db' }} />
          </div>
          <button onClick={onNew}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white flex-shrink-0"
            style={{ background: NAVY }}>
            <Plus size={11} /> New
          </button>
        </div>
        {/* status chips */}
        <div className="flex gap-1 flex-wrap">
          {statuses.map(s => {
            const cfg = s === 'all' ? { label: 'All', bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' } : STATUS_CFG[s]
            const active = statusFilter === s
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="text-[9px] font-bold px-2 py-0.5 rounded-full border transition-colors"
                style={{
                  background: active ? cfg.color : cfg.bg,
                  color: active ? 'white' : cfg.color,
                  borderColor: cfg.border,
                }}>
                {cfg.label || 'All'}
              </button>
            )
          })}
        </div>
      </div>

      {/* grouped list */}
      <div className="flex-1 overflow-y-auto">
        {Object.keys(grouped).length === 0 && (
          <p className="text-xs text-gray-400 text-center py-8">No documents found</p>
        )}
        {CATEGORIES.map(cat => {
          const items = grouped[cat.key]
          if (!items) return null
          const CatIcon = cat.icon
          const open = !collapsed[cat.key]
          return (
            <div key={cat.key}>
              <button onClick={() => toggle(cat.key)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 border-b text-left hover:bg-gray-50"
                style={{ borderColor: '#f0f0f0' }}>
                <div className="flex items-center gap-2">
                  <CatIcon size={11} style={{ color: cat.color }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cat.color }}>{cat.label}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${cat.color}18`, color: cat.color }}>{items.length}</span>
                </div>
                {open ? <ChevronUp size={11} className="text-gray-400" /> : <ChevronDown size={11} className="text-gray-400" />}
              </button>
              {open && items.map(doc => (
                <button key={doc.id} onClick={() => onSelect(doc)}
                  className="w-full flex items-start gap-2 px-3 py-2.5 border-b text-left transition-colors"
                  style={{
                    borderColor: '#f3f4f6',
                    background: selected?.id === doc.id ? `${cat.color}0d` : 'white',
                    borderLeft: selected?.id === doc.id ? `3px solid ${cat.color}` : '3px solid transparent',
                  }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{doc.template}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{doc.created_by} · {fmtDate(doc.created_at)}</p>
                  </div>
                  <div className="flex-shrink-0 mt-0.5">
                    <StatusPill status={doc.status} />
                    {doc.mlc && <span className="block text-[9px] font-bold text-center mt-0.5" style={{ color: RED }}>MLC</span>}
                  </div>
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function Documentation({ admission }) {
  const admissionId = admission?.id

  const [docs,    setDocs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showNew,  setShowNew]  = useState(false)
  const [pinModal, setPinModal] = useState(null)
  const [printDoc, setPrintDoc] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/inpatient/admissions/${admissionId}/documents`)
      if (res.data?.length) {
        setDocs(res.data)
        setSelected(res.data[0])
      } else { throw new Error('empty') }
    } catch {
      const mock = buildMock(admission)
      setDocs(mock)
      setSelected(mock[0])
    } finally { setLoading(false) }
  }, [admissionId])

  useEffect(() => { if (admissionId) load() }, [load])

  const handleCreate = (category, template) => {
    const newDoc = {
      id: Date.now(), category, template, status: 'draft',
      created_by: 'Current User', created_at: new Date().toISOString(),
      signed_at: null, mlc: category === 'mlc', fields: {
        patient_name: admission?.patient_name || '',
        diagnosis: admission?.primary_diagnosis || '',
      },
      signatures: category === 'consent'
        ? { doctor: null, patient: null, witness: null }
        : category === 'mlc'
        ? { doctor: null, witness: null }
        : { doctor: null },
    }
    setDocs(p => [newDoc, ...p])
    setSelected(newDoc)
    setShowNew(false)
  }

  const handleSign = () => {
    if (!selected) return
    setPinModal({
      title: `Sign: ${selected.template}`,
      onConfirm: () => {
        const now = new Date().toISOString()
        setDocs(prev => prev.map(d => {
          if (d.id !== selected.id) return d
          const sigs = { ...d.signatures }
          const firstNull = Object.keys(sigs).find(k => !sigs[k])
          if (firstNull) {
            sigs[firstNull] = { name: 'Current User', role: 'Staff Nurse', time: now, pin_verified: true }
          }
          const allSigned = Object.values(sigs).every(Boolean)
          return { ...d, signatures: sigs, status: allSigned ? 'signed' : 'pending', signed_at: allSigned ? now : null }
        }))
        setSelected(prev => {
          const updated = docs.find(d => d.id === prev.id)
          return updated || prev
        })
        setPinModal(null)
      },
    })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={22} className="animate-spin" style={{ color: GREEN }} />
    </div>
  )

  const counts = { total: docs.length, signed: docs.filter(d => d.status === 'signed').length, pending: docs.filter(d => d.status === 'pending').length, draft: docs.filter(d => d.status === 'draft').length }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* top stats strip */}
      <div className="flex-shrink-0 px-5 py-2 border-b flex items-center gap-6"
        style={{ borderColor: '#e9eaec', background: '#f9fafb' }}>
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Documents</span>
        {[
          { label: 'Total', value: counts.total, color: NAVY },
          { label: 'Signed', value: counts.signed, color: '#15803d' },
          { label: 'Pending', value: counts.pending, color: '#a16207' },
          { label: 'Draft', value: counts.draft, color: '#6b7280' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="text-sm font-extrabold" style={{ color: s.color }}>{s.value}</span>
            <span className="text-[10px] text-gray-400">{s.label}</span>
          </div>
        ))}
      </div>

      {/* two-panel layout */}
      <div className="flex-1 overflow-hidden flex">
        {/* left */}
        <div className="w-[300px] flex-shrink-0">
          <DocList
            docs={docs}
            selected={selected}
            onSelect={setSelected}
            onNew={() => setShowNew(true)}
          />
        </div>

        {/* right */}
        <div className="flex-1 overflow-hidden">
          {selected
            ? <DocViewer
                doc={selected}
                onSign={handleSign}
                onPrint={() => setPrintDoc(selected)}
              />
            : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                <FileText size={28} className="opacity-30" />
                <p className="text-sm">Select a document to view</p>
                <button onClick={() => setShowNew(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white mt-2"
                  style={{ background: NAVY }}>
                  <Plus size={12} /> New Document
                </button>
              </div>
            )
          }
        </div>
      </div>

      {/* modals */}
      {showNew && <NewDocModal onClose={() => setShowNew(false)} onCreate={handleCreate} />}
      {pinModal && <PinModal title={pinModal.title} onConfirm={pinModal.onConfirm} onCancel={() => setPinModal(null)} />}
      {printDoc && <PrintableDoc doc={printDoc} admission={admission} onClose={() => setPrintDoc(null)} />}
    </div>
  )
}
