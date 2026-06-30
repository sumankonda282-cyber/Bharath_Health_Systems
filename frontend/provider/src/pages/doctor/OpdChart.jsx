import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doctorApi } from '../../api'
import api from '../../api/client'
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Save, FlaskConical, Eye, CheckCircle, Video,
  Pill, Scan, Lock, Search, X, Plus, Trash2,
  AlertCircle, Clock, ClipboardList, MessageSquare, Star,
  FileText, AlertTriangle, ExternalLink,
  Maximize2, User
} from 'lucide-react'
import { PageLoader } from '../../components/ui/Spinner'
import DbAssessmentFormModal from '../inpatient/DbAssessmentFormModal'
import MedicationOrderForm from '@shared/forms/MedicationOrderForm'
import { useAuth } from '../../contexts/AuthContext'
import { extractOrdersFromForm, mergeOrders } from './formOrders'

const BLUE = '#0F2557'

const NAV = [
  { key: 'chart',         label: 'Patient Chart',       Icon: ClipboardList },
  { key: 'prescriptions', label: 'Prescriptions',       Icon: Pill },
  { key: 'lab',           label: 'Lab Orders',          Icon: FlaskConical },
  { key: 'imaging',       label: 'Imaging',             Icon: Scan },
  { key: 'counselling',   label: 'Patient Counselling', Icon: MessageSquare },
]

const STATUS_CFG = {
  pending:                { label: 'Waiting',                badge: 'badge-yellow' },
  confirmed:              { label: 'Confirmed',              badge: 'badge-blue' },
  in_progress:            { label: 'In Progress',            badge: 'badge-purple' },
  investigations_pending: { label: 'Investigations Pending', badge: 'badge-orange' },
  review_pending:         { label: 'Review Pending',         badge: 'badge-indigo' },
  completed:              { label: 'Completed',              badge: 'badge-green' },
  cancelled:              { label: 'Cancelled',              badge: 'badge-gray' },
}

const fmt12 = (t) => {
  if (!t) return '—'
  const str = String(t).slice(0, 5)
  const [h, m] = str.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return t
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

const fmtDate = (d) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return String(d) }
}

const formatKey = (key) => {
  if (!key) return ''
  return String(key)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, c => c.toUpperCase())
}

const categorizeSoap = (s) => {
  const combined = ((s.form_category || s.category || '') + ' ' + (s.form_title || '')).toLowerCase()
  if (/subjective|history|complaint|symptom|review.?of.?system|hpi|chief/.test(combined)) return 'S'
  if (/objective|examination|exam|physical|finding|vital|anthropo|sign/.test(combined)) return 'O'
  // Assessment must be checked before Plan — both can match "management" in some titles
  if (/assessment|diagnosis|impression|differential|icd/.test(combined)) return 'A'
  if (/plan|treatment|management|follow.?up|referral|procedure|counsel/.test(combined)) return 'P'
  return 'A'
}

// ── Form Content Renderer ─────────────────────────────────────────
function FormContentRenderer({ submission }) {
  if (!submission) return null

  const raw = submission.form_data || submission.data || submission.answers || null

  if (!raw || typeof raw !== 'object') {
    return (
      <p className="text-sm text-gray-500 italic">
        Form submitted —{' '}
        <a href={`/forms/submission/${submission.id}`} target="_blank" rel="noreferrer"
          className="text-blue-500 hover:underline inline-flex items-center gap-0.5">
          View <ExternalLink size={10} />
        </a>
      </p>
    )
  }

  const parseValue = (v) => {
    if (Array.isArray(v)) return v.filter(x => x !== null && x !== false && x !== '').join(', ')
    if (v === true) return 'Yes'
    if (v === false || v === null || v === undefined || v === '') return null
    if (typeof v === 'object') return Object.values(v).filter(Boolean).join(', ')
    return String(v)
  }

  const entries = Object.entries(raw)
    .map(([k, v]) => ({ key: k, label: formatKey(k), value: parseValue(v) }))
    .filter(e => e.value && e.value !== 'No')

  if (!entries.length) return (
    <p className="text-sm text-gray-500 italic">
      Form submitted —{' '}
      <a href={`/forms/submission/${submission.id}`} target="_blank" rel="noreferrer"
        className="text-blue-500 hover:underline inline-flex items-center gap-0.5">
        View <ExternalLink size={10} />
      </a>
    </p>
  )

  const short  = entries.filter(e => e.value.length < 25)
  const medium = entries.filter(e => e.value.length >= 25 && e.value.length < 65)
  const wide   = entries.filter(e => e.value.length >= 65 && e.value.length < 180)
  const full   = entries.filter(e => e.value.length >= 180)

  return (
    <div className="space-y-1.5 text-sm text-gray-800">
      {short.length > 0 && (
        <div className="grid grid-cols-4 gap-x-6 gap-y-1">
          {short.map(e => (
            <span key={e.key} className="min-w-0 truncate">
              <span className="text-gray-400 text-xs">{e.label}: </span>
              <span className="font-medium">{e.value}</span>
            </span>
          ))}
        </div>
      )}
      {medium.length > 0 && (
        <div className="grid grid-cols-3 gap-x-6 gap-y-1">
          {medium.map(e => (
            <span key={e.key} className="min-w-0">
              <span className="text-gray-400 text-xs">{e.label}: </span>
              <span className="font-medium">{e.value}</span>
            </span>
          ))}
        </div>
      )}
      {wide.length > 0 && (
        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
          {wide.map(e => (
            <span key={e.key} className="min-w-0">
              <span className="text-gray-400 text-xs">{e.label}: </span>
              <span className="font-medium">{e.value}</span>
            </span>
          ))}
        </div>
      )}
      {full.map(e => (
        <div key={e.key}>
          <span className="text-gray-400 text-xs">{e.label}: </span>
          <span className="font-medium whitespace-pre-wrap">{e.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Lab Results Modal ─────────────────────────────────────────────
function LabResultsModal({ order, onClose }) {
  const items = order?.items || order?.results || []

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ width: '70vw', maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <div className="font-bold text-gray-900 text-base">{order?.test_name || order?.name || 'Lab Results'}</div>
            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-3">
              {order?.ordered_at && <span>Ordered {fmtDate(order.ordered_at)}</span>}
              {order?.resulted_at && <span>Resulted {fmtDate(order.resulted_at)}</span>}
              {order?.status && <span className="capitalize">{String(order.status).replace(/_/g, ' ')}</span>}
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <FlaskConical size={40} className="opacity-20 mb-3" />
              <p className="text-sm">No results available yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">Test</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">Value</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">Unit</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wide">Reference Range</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-2.5 font-medium text-gray-800">
                      {item.test_name || item.name || '—'}
                    </td>
                    <td className={`px-5 py-2.5 font-bold ${item.is_abnormal ? 'text-red-600' : 'text-gray-800'}`}>
                      {item.result_value || item.value || '—'}
                      {item.is_abnormal && <AlertTriangle size={11} className="inline ml-1.5 text-red-500" />}
                    </td>
                    <td className="px-5 py-2.5 text-gray-500">{item.result_unit || item.unit || '—'}</td>
                    <td className="px-5 py-2.5 text-gray-400 font-mono text-xs">{item.reference_range || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Lab Investigations Renderer ───────────────────────────────────
function LabInvestigationsRenderer({ labOrders, allPatientLabOrders, apptId }) {
  const [openModal, setOpenModal] = useState(null)

  const orderedIds = new Set((labOrders || []).map(o => o.id))
  const unordered = (allPatientLabOrders || []).filter(
    o => !orderedIds.has(o.id) && o.has_result
  )

  const renderOrder = (order, tag) => {
    const isReported = order.has_result && ['completed', 'reported', 'signed', 'pending_review'].includes(order.result_status)
    const abnormals = (order.items || []).filter(it => it.is_abnormal && it.result_value)
    const tests = order.test_names?.length ? order.test_names : (order.items || []).map(i => i.test_name).filter(Boolean)

    return (
      <div key={order.id}>
        <div className="flex items-center gap-2.5 text-sm flex-wrap">
          <FlaskConical size={13} className={`flex-shrink-0 ${isReported ? 'text-teal-500' : 'text-gray-400'}`} />
          <span className="font-medium text-gray-800">{tests.join(', ') || order.order_id}</span>
          {order.priority === 'stat' && (
            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full uppercase">STAT</span>
          )}
          {tag === 'not-ordered' && (
            <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
              Not Ordered
            </span>
          )}
          {!isReported ? (
            <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
              Pending
            </span>
          ) : (
            <button onClick={() => setOpenModal(order)}
              className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 font-medium ml-1">
              <Maximize2 size={11} /> Results
            </button>
          )}
        </div>

        {abnormals.length > 0 && (
          <div className="ml-5 mt-1.5 pl-3 border-l-2 border-red-100">
            <table className="text-xs">
              <tbody>
                {abnormals.map((it, j) => (
                  <tr key={j}>
                    <td className="pr-4 text-gray-600 font-medium py-0.5">{it.test_name || it.name}</td>
                    <td className="pr-3 text-red-600 font-bold">
                      {it.result_value}
                      <AlertTriangle size={10} className="inline ml-1" />
                    </td>
                    <td className="pr-3 text-red-400">{it.result_unit || it.unit || ''}</td>
                    <td className="text-gray-400 font-mono">ref: {it.reference_range || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {(labOrders || []).map(o => renderOrder(o, 'ordered'))}

      {unordered.length > 0 && (
        <>
          <div className="mt-2 pt-2 border-t border-dashed border-orange-100 text-[10px] font-bold text-orange-500 uppercase tracking-wide">
            External / Not Ordered
          </div>
          {unordered.map(o => renderOrder(o, 'not-ordered'))}
        </>
      )}

      {openModal && <LabResultsModal order={openModal} onClose={() => setOpenModal(null)} />}
    </div>
  )
}

// ── Imaging Investigations Renderer ───────────────────────────────
function ImagingInvestigationsRenderer({ imagingOrders, allPatientImagingOrders }) {
  const orderedIds = new Set((imagingOrders || []).map(o => o.id))
  const unordered = (allPatientImagingOrders || []).filter(
    o => !orderedIds.has(o.id) && o.has_result
  )

  const renderOrder = (order, tag) => {
    const isReported = order.has_result && ['completed', 'reported', 'signed', 'pending_review'].includes(order.result_status)
    const label = order.study_description || order.body_part
      ? `${order.modality_label || order.modality || ''}${order.body_part ? ' — ' + order.body_part : ''}${order.study_description ? ' · ' + order.study_description : ''}`
      : order.modality_label || order.modality || order.order_id

    return (
      <div key={order.id} className="flex items-center gap-2.5 text-sm flex-wrap">
        <Scan size={13} className={`flex-shrink-0 ${isReported ? 'text-teal-500' : 'text-gray-400'}`} />
        <span className="font-medium text-gray-800">{label}</span>
        {tag === 'not-ordered' && (
          <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
            Not Ordered
          </span>
        )}
        {isReported ? (
          <span className="text-[10px] font-bold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
            Reported
          </span>
        ) : (
          <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
            Pending
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {(imagingOrders || []).map(o => renderOrder(o, 'ordered'))}
      {unordered.length > 0 && (
        <>
          <div className="mt-2 pt-2 border-t border-dashed border-orange-100 text-[10px] font-bold text-orange-500 uppercase tracking-wide">
            External / Not Ordered
          </div>
          {unordered.map(o => renderOrder(o, 'not-ordered'))}
        </>
      )}
    </div>
  )
}

// ── SOAP Section Label ────────────────────────────────────────────
function SoapLabel({ letter, label, color, bg }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
        style={{ color, background: bg }}>{letter}</span>
      <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
    </div>
  )
}

function FormBlock({ submission, index }) {
  const isDraft = submission.status === 'draft' || submission.is_draft
  // null = not fetched yet, false = fetch done but no data, object = has data
  const [fullData, setFullData] = useState(
    submission.form_data || submission.data || submission.answers || null
  )
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    if (fullData !== null) return
    setFetching(true)
    api.get(`/submissions/${submission.id}`)
      .then(r => {
        const d = r?.form_data || r?.data || r?.answers || null
        // store false if empty/missing so we don't retry and show fallback link
        setFullData(d && Object.keys(d).length > 0 ? d : false)
      })
      .catch(() => setFullData(false))
      .finally(() => setFetching(false))
  }, [submission.id])

  const enriched = { ...submission, form_data: fullData || null }

  return (
    <div className={index > 0 ? 'mt-3 pt-3' : ''}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-bold text-gray-600">{submission.form_title}</span>
        {isDraft && (
          <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
            Draft
          </span>
        )}
        {fetching && (
          <span className="w-3 h-3 border border-gray-300 border-t-blue-400 rounded-full animate-spin inline-block" />
        )}
      </div>
      <FormContentRenderer submission={enriched} />
    </div>
  )
}

// ── Patient Chart Document ─────────────────────────────────────────
function PatientChartDocument({ encounter, patientId, soap, prescriptions, labItems, imagingItems, counselling, formSubmissions, labOrders, imagingOrders, allPatientLabOrders, allPatientImagingOrders }) {
  const appt = encounter.appointment || encounter
  const vRaw = encounter.vitals || {}
  // Normalise vitals field names — encounter detail returns full names; desk list pre-formats them
  const v = {
    bp:     vRaw.bp || (vRaw.blood_pressure_systolic && vRaw.blood_pressure_diastolic
              ? `${vRaw.blood_pressure_systolic}/${vRaw.blood_pressure_diastolic}` : null),
    pulse:  vRaw.pulse  || (vRaw.pulse_rate  ? String(vRaw.pulse_rate)  : null),
    temp:   vRaw.temp   || (vRaw.temperature ? String(vRaw.temperature) : null),
    spo2:   vRaw.spo2   || (vRaw.oxygen_saturation ? String(vRaw.oxygen_saturation) : null),
    weight: vRaw.weight || (vRaw.weight_kg   ? String(vRaw.weight_kg)   : null),
    height: vRaw.height || (vRaw.height_cm   ? String(vRaw.height_cm)   : null),
    sugar:  vRaw.sugar  || (vRaw.blood_sugar ? String(vRaw.blood_sugar)  : null),
  }
  const reason = appt.reason || encounter.reason

  // undefined = still loading; show spinner rather than "No documentation"
  if (formSubmissions === undefined) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-300">
        <span className="w-6 h-6 border-2 border-gray-200 border-t-blue-400 rounded-full animate-spin" />
      </div>
    )
  }

  const categorized = { S: [], O: [], A: [], P: [] }
  formSubmissions.forEach(s => {
    const cat = categorizeSoap(s)
    if (categorized[cat]) categorized[cat].push(s)
    else categorized.A.push(s)
  })

  const hasS   = !!(soap.subjective || reason || categorized.S.length)
  const hasO   = !!(soap.objective || Object.values(v).some(Boolean) || categorized.O.length)
  const hasInv = labItems.length > 0 || imagingItems.length > 0 || labOrders.length > 0 || imagingOrders.length > 0
  const hasA   = !!(soap.assessment || categorized.A.length)
  const hasP   = !!(soap.plan || prescriptions.length || counselling || categorized.P.length)
  const hasAny = hasS || hasO || hasInv || hasA || hasP

  if (!hasAny) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <FileText size={44} className="opacity-20 mb-3" />
        <p className="text-sm font-medium">No clinical documentation yet</p>
        <p className="text-xs mt-1 opacity-70">
          Use assessment forms from the right panel to document this encounter
        </p>
      </div>
    )
  }

  const divider = <hr className="my-5 border-gray-200" />

  return (
    <div>
      {/* Chief Complaint — always first if present */}
      {reason && (
        <div className="mb-5">
          <div className="text-[11px] font-bold uppercase tracking-widest text-amber-600 mb-1.5">Chief Complaint</div>
          <div className="text-base font-semibold text-gray-900">{reason}</div>
        </div>
      )}

      {/* ─── S: SUBJECTIVE ─── */}
      {hasS && (
        <div>
          <SoapLabel letter="S" label="Subjective" color="#2563eb" bg="#eff6ff" />
          {soap.subjective && (
            <p className="text-sm text-gray-800 whitespace-pre-wrap mb-3">{soap.subjective}</p>
          )}
          {categorized.S.map((s, i) => <FormBlock key={s.id || i} submission={s} index={i} />)}
          {(hasO || hasInv || hasA || hasP) && divider}
        </div>
      )}

      {/* ─── O: OBJECTIVE ─── */}
      {hasO && (
        <div>
          <SoapLabel letter="O" label="Objective" color="#0d9488" bg="#f0fdfa" />

          {Object.values(v).some(Boolean) && (
            <div className="mb-3">
              <div className="text-xs font-bold text-gray-600 mb-1.5">Vitals</div>
              <div className="grid grid-cols-4 gap-x-6 gap-y-1 text-sm">
                {v.bp     && <span><span className="text-gray-400 text-xs">BP: </span><span className="font-medium">{v.bp}</span></span>}
                {v.pulse  && <span><span className="text-gray-400 text-xs">HR: </span><span className="font-medium">{v.pulse} bpm</span></span>}
                {v.temp   && <span><span className="text-gray-400 text-xs">Temp: </span><span className="font-medium">{v.temp}°C</span></span>}
                {v.spo2   && <span><span className="text-gray-400 text-xs">SpO₂: </span><span className="font-medium">{v.spo2}%</span></span>}
                {v.weight && <span><span className="text-gray-400 text-xs">Wt: </span><span className="font-medium">{v.weight} kg</span></span>}
                {v.height && <span><span className="text-gray-400 text-xs">Ht: </span><span className="font-medium">{v.height} cm</span></span>}
                {v.sugar && <span><span className="text-gray-400 text-xs">Sugar: </span><span className="font-medium">{v.sugar}</span></span>}
              </div>
            </div>
          )}

          {soap.objective && (
            <p className="text-sm text-gray-800 whitespace-pre-wrap mb-3">{soap.objective}</p>
          )}
          {categorized.O.map((s, i) => <FormBlock key={s.id || i} submission={s} index={i} />)}
          {(hasInv || hasA || hasP) && divider}
        </div>
      )}

      {/* ─── INVESTIGATIONS ─── */}
      {hasInv && (
        <div>
          <SoapLabel letter="I" label="Investigations" color="#7c3aed" bg="#f5f3ff" />

          {(labOrders.length > 0 || allPatientLabOrders.some(o => o.has_result)) && (
            <div className="mb-4">
              <div className="text-xs font-bold text-gray-600 mb-2">Lab Orders</div>
              <LabInvestigationsRenderer labOrders={labOrders} allPatientLabOrders={allPatientLabOrders} />
            </div>
          )}

          {(imagingOrders.length > 0 || allPatientImagingOrders.some(o => o.has_result)) && (
            <div>
              <div className="text-xs font-bold text-gray-600 mb-2">Imaging Orders</div>
              <ImagingInvestigationsRenderer imagingOrders={imagingOrders} allPatientImagingOrders={allPatientImagingOrders} />
            </div>
          )}

          {(hasA || hasP) && divider}
        </div>
      )}

      {/* ─── A: ASSESSMENT ─── */}
      {hasA && (
        <div>
          <SoapLabel letter="A" label="Assessment" color="#d97706" bg="#fffbeb" />
          {soap.assessment && (
            <p className="text-sm text-gray-800 whitespace-pre-wrap mb-3">{soap.assessment}</p>
          )}
          {categorized.A.map((s, i) => <FormBlock key={s.id || i} submission={s} index={i} />)}
          {hasP && divider}
        </div>
      )}

      {/* ─── P: PLAN ─── */}
      {hasP && (
        <div>
          <SoapLabel letter="P" label="Plan" color="#16a34a" bg="#f0fdf4" />

          {soap.plan && (
            <p className="text-sm text-gray-800 whitespace-pre-wrap mb-3">{soap.plan}</p>
          )}

          {prescriptions.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-bold text-gray-600 mb-2">Medications</div>
              <div className="space-y-1.5">
                {prescriptions.map((rx, i) => (
                  <div key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                    <span className="font-semibold text-gray-900">
                      {rx.drug_name || rx.medicine_name}
                    </span>
                    {(rx.dosage || rx.frequency || rx.duration) && (
                      <span className="text-gray-500 text-xs">
                        {[rx.dosage, rx.frequency, rx.duration].filter(Boolean).join(' · ')}
                      </span>
                    )}
                    {rx.route && <span className="text-gray-400 text-xs">({rx.route})</span>}
                    {rx.instructions && (
                      <span className="text-gray-400 text-xs">— {rx.instructions}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {counselling && counselling.trim() && (
            <div className="mb-4">
              <div className="text-xs font-bold text-gray-600 mb-1.5">Patient Counselling</div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{counselling}</p>
            </div>
          )}

          {categorized.P.map((s, i) => <FormBlock key={s.id || i} submission={s} index={i} />)}
        </div>
      )}

      {/* Previous History */}
      <PastVisits patientId={patientId} />
    </div>
  )
}

// ── Past Visits / Previous History ────────────────────────────────
function PastVisits({ patientId }) {
  const [visits, setVisits]         = useState([])
  const [admissions, setAdmissions] = useState([])
  const [loaded, setLoaded]         = useState(false)
  const [expanded, setExpanded]     = useState(false)
  const [openKey, setOpenKey]       = useState(null)
  const [pinTarget, setPinTarget]   = useState(null)
  const [pin, setPin]               = useState('')
  const [pinError, setPinError]     = useState('')
  const [unlocked, setUnlocked]     = useState(new Set())
  const [verifying, setVerifying]   = useState(false)
  const [discharge, setDischarge]   = useState({})

  useEffect(() => {
    if (!patientId || loaded) return
    Promise.allSettled([
      doctorApi.getPatientVisits(patientId, 20),
      api.get('/inpatient/admissions', {
        params: { patient_id: patientId, status: 'active,discharge_pending,discharged,transferred' }
      }),
    ]).then(([vRes, aRes]) => {
      setVisits(vRes.status === 'fulfilled' && Array.isArray(vRes.value) ? vRes.value : [])
      setAdmissions(aRes.status === 'fulfilled' && Array.isArray(aRes.value) ? aRes.value : [])
    }).finally(() => setLoaded(true))
  }, [patientId, loaded])

  const clinicName = visits.find(v => v.clinic_name)?.clinic_name || ''
  const rows = [
    ...visits.map(v => ({
      kind: 'opd', id: v.id, date: v.date || '',
      patient_name: v.patient_name, doctor_name: v.doctor_name,
      clinic_name: v.clinic_name || clinicName, reason: v.reason,
      is_mine: v.is_mine, raw: v,
    })),
    ...admissions.map(a => ({
      kind: 'ipd', id: a.id,
      date: a.admission_date || (a.admitted_at ? String(a.admitted_at).slice(0, 10) : ''),
      patient_name: a.patient_name, doctor_name: a.doctor, clinic_name: clinicName,
      reason: a.diagnosis || a.primary_diagnosis || 'Inpatient admission',
      is_mine: true, raw: a,
    })),
  ].sort((x, y) => String(y.date).localeCompare(String(x.date)))

  const keyOf    = (r) => `${r.kind}:${r.id}`
  const isLocked = (r) => r.kind === 'opd' && !r.is_mine && !unlocked.has(keyOf(r))

  const loadDischarge = (admissionId) => {
    setDischarge(d => ({ ...d, [admissionId]: 'loading' }))
    api.get(`/inpatient/admissions/${admissionId}/discharge-summary`)
      .then(r => setDischarge(d => ({ ...d, [admissionId]: (r && (r.id || r.admission_id)) ? r : 'none' })))
      .catch(() => setDischarge(d => ({ ...d, [admissionId]: 'none' })))
  }

  const handleRowClick = (r) => {
    const k = keyOf(r)
    if (isLocked(r)) { setPinTarget(pinTarget === k ? null : k); setPinError(''); setPin(''); return }
    const opening = openKey !== k
    setOpenKey(opening ? k : null)
    if (opening && r.kind === 'ipd' && discharge[r.id] === undefined) loadDischarge(r.id)
  }

  const handleVerifyPin = async () => {
    if (!pin || pin.length < 4) { setPinError('Enter your 4–6 digit PIN'); return }
    setVerifying(true); setPinError('')
    try {
      await api.post('/auth/staff/pin-verify', { pin })
      setUnlocked(prev => new Set([...prev, pinTarget]))
      setOpenKey(pinTarget); setPinTarget(null); setPin('')
    } catch {
      setPinError('Incorrect PIN. Please try again.')
    } finally { setVerifying(false) }
  }

  const renderOpd = (v) => (
    <div className="p-3 bg-gray-50 text-xs text-gray-600 space-y-2">
      {v.vitals && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {v.vitals.bp        && <span><strong>BP:</strong> {v.vitals.bp}</span>}
          {v.vitals.pulse     && <span><strong>Pulse:</strong> {v.vitals.pulse}</span>}
          {v.vitals.temperature && <span><strong>Temp:</strong> {v.vitals.temperature}°</span>}
          {v.vitals.spo2      && <span><strong>SpO₂:</strong> {v.vitals.spo2}%</span>}
          {v.vitals.weight_kg && <span><strong>Wt:</strong> {v.vitals.weight_kg} kg</span>}
          {v.vitals.blood_sugar && <span><strong>Sugar:</strong> {v.vitals.blood_sugar}</span>}
        </div>
      )}
      {v.soap?.subjective && <div><strong>S:</strong> {v.soap.subjective}</div>}
      {v.soap?.objective  && <div><strong>O:</strong> {v.soap.objective}</div>}
      {v.soap?.assessment && <div><strong>A:</strong> {v.soap.assessment}</div>}
      {v.soap?.plan       && <div><strong>P:</strong> {v.soap.plan}</div>}
      {v.prescriptions?.length > 0 && (
        <div><strong>Rx:</strong> {v.prescriptions.flatMap(p => (p.items || []).map(i => i.medicine_name)).filter(Boolean).join(', ') || '—'}</div>
      )}
      {v.lab_orders?.length > 0 && (
        <div><strong>Labs:</strong> {v.lab_orders.flatMap(l => (l.items || []).map(i => i.test_name)).filter(Boolean).join(', ') || '—'}</div>
      )}
      {!v.vitals && !v.soap && !v.prescriptions?.length && !v.lab_orders?.length && (
        <div className="text-gray-400 italic">No clinical details recorded</div>
      )}
    </div>
  )

  const renderIpd = (admissionId, raw) => {
    const d = discharge[admissionId]
    if (d === 'loading' || d === undefined)
      return <div className="p-3 text-xs text-gray-400">Loading discharge summary…</div>
    if (d === 'none') return (
      <div className="p-3 bg-gray-50 text-xs text-gray-600 space-y-1">
        <div><strong>Admission:</strong> {raw.admission_number || '—'}{raw.department_name ? ` · ${raw.department_name}` : ''}{raw.ward_name ? ` · ${raw.ward_name}` : ''}</div>
        <div><strong>Status:</strong> {(raw.status || '').replace('_', ' ')}</div>
        {raw.diagnosis && <div><strong>Diagnosis:</strong> {raw.diagnosis}</div>}
        <div className="text-gray-400 italic">No discharge summary recorded yet.</div>
      </div>
    )
    let meds = []
    try { meds = d.discharge_medications ? (typeof d.discharge_medications === 'string' ? JSON.parse(d.discharge_medications) : d.discharge_medications) : [] } catch { meds = [] }
    return (
      <div className="p-3 bg-gray-50 text-xs text-gray-600 space-y-1.5">
        <div className="font-bold text-gray-700 uppercase tracking-wide text-[11px]">
          Discharge Summary · {d.status === 'finalized' ? 'Finalized' : 'Draft'}
        </div>
        {d.final_diagnosis      && <div><strong>Final Diagnosis:</strong> {d.final_diagnosis}</div>}
        {d.admission_diagnosis  && <div><strong>Admission Diagnosis:</strong> {d.admission_diagnosis}</div>}
        {d.procedures_done      && <div><strong>Procedures:</strong> {d.procedures_done}</div>}
        {d.hospital_course      && <div><strong>Hospital Course:</strong> {d.hospital_course}</div>}
        {d.condition_at_discharge && <div><strong>Condition at Discharge:</strong> {d.condition_at_discharge}</div>}
        {meds.length > 0 && (
          <div><strong>Discharge Meds:</strong> {meds.map(m => [m.name, m.dose, m.frequency, m.duration].filter(Boolean).join(' ')).join('; ')}</div>
        )}
        {d.discharge_instructions && <div><strong>Instructions:</strong> {d.discharge_instructions}</div>}
        {d.diet_advice            && <div><strong>Diet:</strong> {d.diet_advice}</div>}
        {d.activity_restrictions  && <div><strong>Activity:</strong> {d.activity_restrictions}</div>}
        {(d.follow_up_date || d.follow_up_with) && (
          <div><strong>Follow-up:</strong> {[d.follow_up_date, d.follow_up_with].filter(Boolean).join(' · ')}</div>
        )}
        {d.written_by_name && <div className="text-gray-400">By {d.written_by_name}</div>}
      </div>
    )
  }

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <button
        onClick={() => { setExpanded(e => !e); if (!loaded && !expanded) { /* trigger load on first expand */ } }}
        className="w-full flex items-center justify-between py-2 hover:bg-gray-50/80 transition-colors rounded-lg text-sm font-bold text-gray-500"
      >
        <span className="flex items-center gap-2">
          <Clock size={14} />
          Previous History
          {rows.length > 0 && <span className="text-xs text-gray-400 font-normal">({rows.length})</span>}
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="border border-gray-100 rounded-xl overflow-x-auto mt-2">
          {!loaded && <div className="p-4 text-center text-gray-400 text-xs">Loading…</div>}
          {loaded && rows.length === 0 && (
            <div className="p-4 text-center text-gray-400 text-xs">No previous visits found</div>
          )}
          {loaded && rows.length > 0 && (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-left">
                  <th className="px-3 py-2.5 font-semibold">Patient</th>
                  <th className="px-3 py-2.5 font-semibold">Doctor</th>
                  <th className="px-3 py-2.5 font-semibold">Health Centre</th>
                  <th className="px-3 py-2.5 font-semibold">Reason</th>
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Date</th>
                  <th className="px-3 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.flatMap(r => {
                  const k = keyOf(r)
                  const locked = isLocked(r)
                  const open = openKey === k
                  const out = [
                    <tr key={k} onClick={() => handleRowClick(r)}
                      className="border-t border-gray-100 hover:bg-blue-50/40 cursor-pointer transition-colors">
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-1">
                          {locked && <Lock size={11} className="text-gray-400 flex-shrink-0" />}
                          {r.patient_name || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{r.doctor_name || '—'}</td>
                      <td className="px-3 py-2 text-gray-600">{r.clinic_name || '—'}</td>
                      <td className="px-3 py-2 text-gray-600">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate max-w-[200px]">{r.reason || '—'}</span>
                          {r.kind === 'ipd' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 flex-shrink-0">IPD</span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap font-mono">{r.date || '—'}</td>
                      <td className="px-3 py-2 text-right">
                        {locked
                          ? <span className="text-[11px] text-blue-500 font-semibold">Unlock</span>
                          : open
                            ? <ChevronUp size={13} className="inline text-gray-400" />
                            : <ChevronDown size={13} className="inline text-gray-400" />}
                      </td>
                    </tr>,
                  ]
                  if (pinTarget === k) {
                    out.push(
                      <tr key={k + '-pin'} className="border-t border-gray-100 bg-amber-50/50">
                        <td colSpan={6} className="px-4 py-3">
                          <p className="text-xs font-semibold text-gray-700 mb-2">
                            Enter your staff PIN to access this visit
                          </p>
                          <div className="flex items-center gap-2 max-w-sm">
                            <input
                              type="password" inputMode="numeric" maxLength={6} value={pin} autoFocus
                              onChange={e => setPin(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleVerifyPin() }}
                              placeholder="PIN"
                              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 text-center tracking-widest"
                            />
                            <button onClick={handleVerifyPin} disabled={verifying}
                              className="px-3 py-1.5 text-xs rounded-lg text-white font-semibold disabled:opacity-50 transition-opacity"
                              style={{ background: BLUE }}>
                              {verifying ? '…' : 'Verify'}
                            </button>
                            <button onClick={() => setPinTarget(null)}
                              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                              Cancel
                            </button>
                          </div>
                          {pinError && <p className="text-xs text-red-500 mt-1.5">{pinError}</p>}
                        </td>
                      </tr>
                    )
                  }
                  if (open && !locked) {
                    out.push(
                      <tr key={k + '-detail'} className="border-t border-gray-100">
                        <td colSpan={6} className="p-0">
                          {r.kind === 'ipd' ? renderIpd(r.id, r.raw) : renderOpd(r.raw)}
                        </td>
                      </tr>
                    )
                  }
                  return out
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// ── Assessment Panel ──────────────────────────────────────────────
function FormRow({ form, pinned, onPin, onOpen }) {
  return (
    <div className="group w-full flex items-center gap-1 px-3 py-1.5 hover:bg-blue-50 transition-colors">
      <button onClick={onOpen}
        className="flex-1 text-left text-xs text-gray-700 group-hover:text-blue-700 truncate">
        {form.title}
      </button>
      <button onClick={e => onPin(form, e)}
        title={pinned ? 'Unpin from favourites' : 'Pin to favourites'}
        className={pinned ? 'text-amber-400 flex-shrink-0' : 'text-gray-300 hover:text-amber-400 flex-shrink-0'}>
        <Star size={12} className={pinned ? 'fill-amber-400' : ''} />
      </button>
    </div>
  )
}

function AssessmentPanel({ onOpenForm, onCollapse, clinicId }) {
  const [forms, setForms]     = useState([])
  const [favIds, setFavIds]   = useState(new Set())
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)

  const loadFavs = useCallback(() => {
    api.get('/assessment-forms/favorites')
      .then(r => setFavIds(new Set([...(r?.personal || []), ...(r?.organization || [])])))
      .catch(() => {})
  }, [])

  useEffect(() => {
    let alive = true
    const params = { status: 'published', limit: 300 }
    if (clinicId != null) params.clinic_id = clinicId
    api.get('/assessment-forms', { params })
      .then(r => { if (alive) setForms(r?.forms || []) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    loadFavs()
    return () => { alive = false }
  }, [loadFavs, clinicId])

  const togglePin = async (form, e) => {
    e.stopPropagation()
    const pinned = favIds.has(form.id)
    setFavIds(prev => { const n = new Set(prev); pinned ? n.delete(form.id) : n.add(form.id); return n })
    try {
      if (pinned) await api.delete(`/assessment-forms/favorites/${form.id}`)
      else        await api.post(`/assessment-forms/favorites/${form.id}`, { scope: 'personal' })
    } catch { loadFavs() }
  }

  const favForms = forms.filter(f => favIds.has(f.id))
  const q = search.trim().toLowerCase()
  const searchForms = forms.filter(f => !q || (f.title || '').toLowerCase().includes(q) || (f.category || '').toLowerCase().includes(q))
  const groups = {}
  for (const f of searchForms) { const c = f.category || 'Other'; (groups[c] = groups[c] || []).push(f) }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-3 py-2.5 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Assessment Forms</div>
          {onCollapse && (
            <button onClick={onCollapse} className="text-gray-400 hover:text-gray-600 transition-colors" title="Collapse panel">
              <ChevronRight size={14} />
            </button>
          )}
        </div>
        <div className="relative">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search forms…"
            className="w-full pl-6 pr-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-blue-400" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <div className="px-3 py-4 text-xs text-gray-400">Loading forms…</div>}

        {favForms.length > 0 && (
          <div>
            <div className="px-3 pt-3 pb-1 text-xs font-bold uppercase tracking-wide flex items-center gap-1 text-amber-500">
              <Star size={11} className="fill-amber-400 text-amber-400" /> Favourites
            </div>
            {favForms.map(f => (
              <FormRow key={'fav' + f.id} form={f} pinned onPin={togglePin} onOpen={() => onOpenForm(f)} />
            ))}
            <div className="mx-3 my-1.5 border-t border-dashed border-gray-200" />
          </div>
        )}

        {Object.keys(groups).sort().map(cat => (
          <div key={cat}>
            <div className="px-3 pt-3 pb-1 text-xs font-bold text-gray-400 uppercase tracking-wide">{cat}</div>
            {groups[cat].map(f => (
              <FormRow key={f.id} form={f} pinned={favIds.has(f.id)} onPin={togglePin} onOpen={() => onOpenForm(f)} />
            ))}
          </div>
        ))}

        {!loading && searchForms.length === 0 && (
          <div className="px-3 py-4 text-xs text-gray-400">
            No published forms{q ? ' match your search' : ' yet'}.
          </div>
        )}
      </div>
    </div>
  )
}

// ── Patient Counselling Section ───────────────────────────────────
const COUNSEL_CHIPS = [
  'Diet & lifestyle advised', 'Medication adherence explained', 'Red-flag symptoms explained',
  'Follow-up advised', 'Smoking / alcohol cessation advised', 'Warning signs explained',
]

function CounsellingSection({ value, onChange, readonly, patientId }) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Patient Counselling</div>
      {!readonly && (
        <div className="flex flex-wrap gap-1.5">
          {COUNSEL_CHIPS.map(c => (
            <button key={c} type="button"
              onClick={() => onChange(((value || '').trim() ? value.trim() + '\n' : '') + '• ' + c)}
              className="px-2.5 py-1 rounded-full border border-green-200 text-[11px] text-green-700 hover:bg-green-50 transition-colors">
              + {c}
            </button>
          ))}
        </div>
      )}
      <textarea
        value={value || ''} onChange={e => onChange(e.target.value)} disabled={readonly} rows={10}
        placeholder="Counselling provided to the patient — diet, lifestyle, medication adherence, warning signs, follow-up…"
        className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-green-400 resize-y disabled:bg-gray-50 disabled:text-gray-500"
      />
      <PastVisits patientId={patientId} />
    </div>
  )
}

// ── Prescriptions Section ─────────────────────────────────────────
const EMPTY_RX = { drug_name: '', dosage: '', frequency: '', duration: '', route: '', instructions: '' }

function PrescriptionsSection({ items, onChange, readonly, patientId, onOrderMedication }) {
  const [search, setSearch]     = useState('')
  const [results, setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef(null)

  const handleSearch = (q) => {
    setSearch(q)
    clearTimeout(debounceRef.current)
    if (!q.trim() || q.length < 2) { setResults([]); return }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/pharmacy/medicines/search', { params: { q } })
        setResults(Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []))
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 300)
  }

  const addFromSearch = (drug) => {
    onChange([...items, { ...EMPTY_RX, drug_name: drug.name || drug.brand_name || drug.drug_name || '' }])
    setSearch(''); setResults([])
  }

  const updateItem = (i, field, val) => {
    const updated = [...items]
    updated[i] = { ...updated[i], [field]: val }
    onChange(updated)
  }

  const removeItem = (i) => onChange(items.filter((_, idx) => idx !== i))

  return (
    <div>
      {!readonly && (
        <div className="mb-4 relative">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
                placeholder="Search medicine to add…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400" />
              {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border border-blue-400/30 border-t-blue-500 rounded-full animate-spin" />}
            </div>
            <button onClick={() => onChange([...items, { ...EMPTY_RX }])}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 whitespace-nowrap transition-colors">
              <Plus size={12} /> Add Blank
            </button>
            {onOrderMedication && (
              <button onClick={onOrderMedication}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-white hover:opacity-90 whitespace-nowrap transition-opacity"
                style={{ background: BLUE }} title="Order with drug-interaction & dose checks">
                <Pill size={12} /> Order Medication
              </button>
            )}
          </div>
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {results.map((r, i) => (
                <button key={i} onClick={() => addFromSearch(r)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between gap-2 transition-colors">
                  <span className="font-semibold text-gray-800 truncate">{r.name || r.brand_name || r.drug_name}</span>
                  {r.generic_name && <span className="text-xs text-gray-400 truncate">{r.generic_name}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-12">No medications added</div>
      )}

      <div className="space-y-3 mb-2">
        {items.map((rx, i) => (
          <div key={i} className="border border-gray-200 rounded-xl p-3">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="col-span-2">
                <input value={rx.drug_name} onChange={e => updateItem(i, 'drug_name', e.target.value)}
                  disabled={readonly} placeholder="Medicine name"
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 font-semibold disabled:bg-gray-50" />
              </div>
              <input value={rx.dosage}    onChange={e => updateItem(i, 'dosage',    e.target.value)} disabled={readonly} placeholder="Dosage (e.g. 500 mg)"  className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 disabled:bg-gray-50" />
              <input value={rx.frequency} onChange={e => updateItem(i, 'frequency', e.target.value)} disabled={readonly} placeholder="Frequency (e.g. TDS)"   className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 disabled:bg-gray-50" />
              <input value={rx.duration}  onChange={e => updateItem(i, 'duration',  e.target.value)} disabled={readonly} placeholder="Duration (e.g. 5 days)" className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 disabled:bg-gray-50" />
              <input value={rx.route}     onChange={e => updateItem(i, 'route',     e.target.value)} disabled={readonly} placeholder="Route (e.g. Oral)"      className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 disabled:bg-gray-50" />
            </div>
            <input value={rx.instructions} onChange={e => updateItem(i, 'instructions', e.target.value)} disabled={readonly}
              placeholder="Special instructions (e.g. after food)"
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 disabled:bg-gray-50 mb-2" />
            {!readonly && (
              <button onClick={() => removeItem(i)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors">
                <Trash2 size={11} /> Remove
              </button>
            )}
          </div>
        ))}
      </div>
      <PastVisits patientId={patientId} />
    </div>
  )
}

// ── Lab Section ───────────────────────────────────────────────────
function LabSection({ items, onChange, readonly, patientId }) {
  const [search, setSearch]     = useState('')
  const [results, setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef(null)

  const handleSearch = (q) => {
    setSearch(q)
    clearTimeout(debounceRef.current)
    if (!q.trim() || q.length < 2) { setResults([]); return }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/lab/tests/search', { params: { q } })
        setResults(Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []))
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 300)
  }

  const addItem = (test) => {
    const testName = test.test_name || test.name || test
    if (items.some(i => i.test_name === testName)) return
    onChange([...items, { test_name: testName, test_type: test.test_type || 'pathology', notes: '' }])
    setSearch(''); setResults([])
  }

  const removeItem = (i) => onChange(items.filter((_, idx) => idx !== i))

  const updateNote = (i, val) => {
    const updated = [...items]
    updated[i] = { ...updated[i], notes: val }
    onChange(updated)
  }

  return (
    <div>
      {!readonly && (
        <div className="mb-4 relative">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
              placeholder="Search lab test to add…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400" />
            {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border border-blue-400/30 border-t-blue-500 rounded-full animate-spin" />}
          </div>
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {results.map((r, i) => (
                <button key={i} onClick={() => addItem(r)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between gap-2 transition-colors">
                  <span className="font-semibold text-gray-800 truncate">{r.test_name || r.name}</span>
                  {r.test_type && <span className="text-xs text-gray-400 capitalize">{r.test_type}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-12">No lab tests ordered</div>
      )}

      <div className="space-y-2 mb-2">
        {items.map((t, i) => (
          <div key={i} className="border border-gray-200 rounded-xl p-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <FlaskConical size={14} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800 text-sm">{t.test_name}</div>
              {t.test_type && <div className="text-xs text-gray-400 capitalize">{t.test_type}</div>}
              {!readonly && (
                <input value={t.notes || ''} onChange={e => updateNote(i, e.target.value)}
                  placeholder="Clinical notes (optional)"
                  className="mt-1.5 w-full px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400" />
              )}
            </div>
            {!readonly && (
              <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-400 flex-shrink-0 mt-1 transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      <PastVisits patientId={patientId} />
    </div>
  )
}

// ── Imaging Section ───────────────────────────────────────────────
function ImagingSection({ items, onChange, readonly, patientId }) {
  const [search, setSearch]     = useState('')
  const [results, setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef(null)

  const handleSearch = (q) => {
    setSearch(q)
    clearTimeout(debounceRef.current)
    if (!q.trim() || q.length < 2) { setResults([]); return }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/terminology/search', { params: { q, type: 'procedure' } })
        setResults(Array.isArray(res) ? res : (Array.isArray(res?.results) ? res.results : []))
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 300)
  }

  const addItem = (img) => {
    const name = img.name || img.procedure_name || (typeof img === 'string' ? img : '')
    if (!name || items.some(i => i.procedure_name === name)) return
    onChange([...items, { procedure_name: name, modality: img.modality || '', notes: '' }])
    setSearch(''); setResults([])
  }

  const removeItem = (i) => onChange(items.filter((_, idx) => idx !== i))

  return (
    <div>
      {!readonly && (
        <div className="mb-4 relative">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
              placeholder="Search imaging study to order…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400" />
            {searching && <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border border-blue-400/30 border-t-blue-500 rounded-full animate-spin" />}
          </div>
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {results.map((r, i) => (
                <button key={i} onClick={() => addItem(r)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between gap-2 transition-colors">
                  <span className="font-semibold text-gray-800 truncate">{r.name || r.procedure_name}</span>
                  {r.modality && <span className="text-xs text-gray-400">{r.modality}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-12">No imaging studies ordered</div>
      )}

      <div className="space-y-2 mb-2">
        {items.map((img, i) => (
          <div key={i} className="border border-gray-200 rounded-xl p-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Scan size={14} className="text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800 text-sm">{img.procedure_name}</div>
              {img.modality && <div className="text-xs text-gray-400">{img.modality}</div>}
            </div>
            {!readonly && (
              <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-400 flex-shrink-0 mt-1 transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      <PastVisits patientId={patientId} />
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────
export default function OpdChart() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [encounter, setEncounter]         = useState(null)
  const [loading, setLoading]             = useState(true)
  const [section, setSection]             = useState('chart')
  const [panelOpen, setPanelOpen]         = useState(true)
  const [activeForm, setActiveForm]       = useState(null)
  const [medFormOpen, setMedFormOpen]     = useState(false)
  const [demoOpen, setDemoOpen]           = useState(false)

  const [soap, setSoap]                   = useState({ subjective: '', objective: '', assessment: '', plan: '' })
  const [counselling, setCounselling]     = useState('')
  const [prescriptions, setPrescriptions] = useState([])
  const [labItems, setLabItems]           = useState([])
  const [imagingItems, setImagingItems]   = useState([])

  const [saving, setSaving]               = useState(false)
  const [actionLoading, setActionLoading] = useState('')
  const [orderToast, setOrderToast]       = useState('')
  const [formSubmissions, setFormSubmissions] = useState(undefined)   // undefined=loading, []=empty, [...]=loaded
  const [labOrders, setLabOrders]               = useState([])
  const [imagingOrders, setImagingOrders]       = useState([])
  const [allPatientLabOrders, setAllPatientLabOrders]         = useState([])
  const [allPatientImagingOrders, setAllPatientImagingOrders] = useState([])

  const load = useCallback(async () => {
    try {
      const data = await doctorApi.getEncounter(id)
      setEncounter(data)

      const note = data.soap_note || {}
      setSoap({
        subjective: note.subjective || '',
        objective:  note.objective  || '',
        assessment: note.assessment || '',
        plan:       note.plan       || '',
      })
      setCounselling(note.counselling || '')

      setPrescriptions(
        (data.prescription?.items || data.prescriptions || []).map(p => ({
          drug_name:    p.drug_name    || p.name || '',
          dosage:       p.dosage       || '',
          frequency:    p.frequency    || '',
          duration:     p.duration     || '',
          route:        p.route        || '',
          instructions: p.instructions || '',
        }))
      )

      setLabItems(
        (data.lab_order?.tests || data.lab_items || data.lab_tests || []).map(t => ({
          test_name: t.test_name || t.name || '',
          test_type: t.test_type || '',
          notes:     t.notes     || '',
        }))
      )

      setImagingItems(
        (data.imaging_items || data.imaging_orders || []).map(img => ({
          procedure_name: img.procedure_name || img.name || '',
          modality:       img.modality || '',
          notes:          img.notes    || '',
        }))
      )
    } catch { /* encounter not found */ }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  // Fetch form submissions scoped to this encounter — `id` (URL param) is the encounter ID,
  // a stable primitive that never changes during this session.
  useEffect(() => {
    if (!id) return
    api.get('/submissions', { params: { encounter_id: id, limit: 100 } })
      .then(res => setFormSubmissions(res?.items || []))
      .catch(() => setFormSubmissions([]))
  }, [id])

  // Fetch lab + imaging orders scoped to this encounter's appointment, then all patient orders
  // to surface results that arrived without a corresponding doctor order ("Not Ordered").
  useEffect(() => {
    if (!encounter) return
    const apptId = encounter.appointment?.id || encounter.appointment_id
    const pid = encounter.patient?.id || encounter.appointment?.patient_id || encounter.patient_id
    if (!pid) return

    const toArray = (res) => Array.isArray(res) ? res : (res?.orders || res?.items || [])

    if (apptId) {
      api.get('/lab-orders', { params: { appointment_id: apptId } })
        .then(res => setLabOrders(toArray(res)))
        .catch(() => setLabOrders([]))
      api.get('/imaging-orders', { params: { appointment_id: apptId } })
        .then(res => setImagingOrders(toArray(res)))
        .catch(() => setImagingOrders([]))
    }

    // All patient orders — used to detect unordered (externally arrived) results
    api.get('/lab-orders', { params: { patient_id: pid, limit: 100 } })
      .then(res => setAllPatientLabOrders(toArray(res)))
      .catch(() => setAllPatientLabOrders([]))
    api.get('/imaging-orders', { params: { patient_id: pid, limit: 100 } })
      .then(res => setAllPatientImagingOrders(toArray(res)))
      .catch(() => setAllPatientImagingOrders([]))
  }, [encounter?.id])

  useEffect(() => {
    if (!orderToast) return
    const t = setTimeout(() => setOrderToast(''), 5000)
    return () => clearTimeout(t)
  }, [orderToast])

  // Backend reads prescription.items[].medicine_name and lab_order.tests[].test_name.
  const buildPayload = () => ({
    soap: { ...soap, counselling },
    prescription: {
      items: (prescriptions || []).map(p => ({
        medicine_name: p.drug_name || p.medicine_name || p.name || '',
        dosage:        p.dosage || '',
        frequency:     p.frequency || '',
        duration:      p.duration || '',
        instructions:  p.instructions || '',
      })),
    },
    lab_order: { tests: labItems },
    imaging:   imagingItems,
  })

  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      await doctorApi.saveDraft(id, buildPayload())
      await load()
    } catch { alert('Failed to save draft') }
    finally { setSaving(false) }
  }

  const handleSendInvestigations = async () => {
    if (!window.confirm('Save draft and send patient for investigations?')) return
    setActionLoading('investigations')
    try {
      await doctorApi.saveDraft(id, buildPayload())
      await doctorApi.sendForInvestigations(id)
      await load()
    } catch { alert('Failed to send for investigations') }
    finally { setActionLoading('') }
  }

  const handleMarkReviewReady = async () => {
    if (!window.confirm('Mark this patient as ready for review?')) return
    setActionLoading('review')
    try {
      await doctorApi.markReviewReady(id)
      await load()
    } catch { alert('Failed to mark ready for review') }
    finally { setActionLoading('') }
  }

  const handleComplete = async () => {
    if (!window.confirm('Save all notes and complete this encounter?')) return
    setActionLoading('complete')
    try {
      await doctorApi.completeEncounter(id, buildPayload())
      navigate('/doctor-desk')
    } catch { alert('Failed to complete encounter') }
    finally { setActionLoading('') }
  }

  const handleFormOrders = (orders) => {
    if (!orders) return
    const parts = []
    if (orders.prescriptions?.length) {
      const { merged, added } = mergeOrders(prescriptions, orders.prescriptions.map(p => ({ ...EMPTY_RX, drug_name: p.drug_name })), 'drug_name')
      if (added) { setPrescriptions(merged); parts.push(`${added} Rx`) }
    }
    if (orders.labs?.length) {
      const { merged, added } = mergeOrders(labItems, orders.labs.map(l => ({ test_name: l.test_name, test_type: '', notes: '' })), 'test_name')
      if (added) { setLabItems(merged); parts.push(`${added} lab`) }
    }
    if (orders.imaging?.length) {
      const { merged, added } = mergeOrders(imagingItems, orders.imaging.map(i => ({ procedure_name: i.procedure_name, modality: '', notes: '' })), 'procedure_name')
      if (added) { setImagingItems(merged); parts.push(`${added} imaging`) }
    }
    if (orders.diagnoses?.length) {
      setSoap(s => ({ ...s, assessment: [s.assessment, ...orders.diagnoses].filter(Boolean).join('\n') }))
      parts.push(`${orders.diagnoses.length} Dx`)
    }
    if (parts.length) {
      setSection('chart')
      setOrderToast(`Added to chart: ${parts.join(' · ')}. "Save Draft" sends Rx / Lab / Imaging to the desks.`)
    }
  }

  const handleAddMedicationOrder = (data) => {
    const dosage   = [data.dose, data.unit].filter(Boolean).join(' ')
    const duration = data.duration_days ? `${data.duration_days} day${Number(data.duration_days) > 1 ? 's' : ''}` : ''
    setPrescriptions(prev => [...prev, {
      drug_name:    data.drug_name || data.generic_name || '',
      dosage,
      frequency:    data.frequency || '',
      duration,
      route:        data.route || '',
      instructions: data.instructions || '',
    }])
  }

  const refreshSubmissions = () => {
    // Always scope to this encounter — `id` is the encounter ID from the URL, never changes
    api.get('/submissions', { params: { encounter_id: id, limit: 100 } })
      .then(res => setFormSubmissions(res?.items || []))
      .catch(() => setFormSubmissions(prev => prev ?? []))   // keep existing data on failure; never silently blank
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <PageLoader />
      </div>
    )
  }

  if (!encounter) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <AlertCircle size={32} className="opacity-30" />
        <p className="text-sm">Encounter not found</p>
        <button onClick={() => navigate('/doctor-desk')} className="text-sm text-blue-600 hover:underline">
          ← Back to Desk
        </button>
      </div>
    )
  }

  const appt      = encounter.appointment || encounter
  const patient   = encounter.patient || {}
  const status    = appt.status || encounter.status || ''
  const readonly  = status === 'completed' || status === 'cancelled'
  const patientId = patient.id || appt.patient_id

  const canSendInvestigations = status === 'in_progress'
  const canMarkReviewReady    = status === 'investigations_pending'
  const canComplete           = status === 'in_progress' || status === 'review_pending'

  const patientName = patient.full_name || patient.name || appt.patient_name || '—'
  const ageSex = [
    patient.age != null ? `${patient.age} yrs` : null,
    patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : null,
  ].filter(Boolean).join(' · ')
  const mrn = patient.patient_id || patient.mrn || patient.bh_id || ''

  const vRawHeader = encounter.vitals || {}
  const v = {
    bp:     vRawHeader.bp || (vRawHeader.blood_pressure_systolic && vRawHeader.blood_pressure_diastolic
              ? `${vRawHeader.blood_pressure_systolic}/${vRawHeader.blood_pressure_diastolic}` : null),
    pulse:  vRawHeader.pulse  || (vRawHeader.pulse_rate  ? String(vRawHeader.pulse_rate)  : null),
    temp:   vRawHeader.temp   || (vRawHeader.temperature ? String(vRawHeader.temperature) : null),
    spo2:   vRawHeader.spo2   || (vRawHeader.oxygen_saturation ? String(vRawHeader.oxygen_saturation) : null),
    weight: vRawHeader.weight || (vRawHeader.weight_kg   ? String(vRawHeader.weight_kg)   : null),
    height: vRawHeader.height || (vRawHeader.height_cm   ? String(vRawHeader.height_cm)   : null),
    sugar:  vRawHeader.sugar  || (vRawHeader.blood_sugar ? String(vRawHeader.blood_sugar)  : null),
  }
  const hasVitals = Object.values(v).some(Boolean)

  // Demographics fields for the collapsible row
  const demoFields = [
    patient.blood_group    && { label: 'Blood', value: patient.blood_group },
    patient.date_of_birth  && { label: 'DOB', value: fmtDate(patient.date_of_birth) },
    patient.phone          && { label: 'Phone', value: patient.phone },
    patient.address        && { label: 'Address', value: patient.address },
    patient.insurance_type && { label: 'Insurance', value: patient.insurance_type },
    patient.payment_mode   && { label: 'Payment', value: patient.payment_mode },
  ].filter(Boolean)

  return (
    <div className="flex flex-col bg-gray-50" style={{ height: 'calc(100vh - 64px)' }}>

      {/* ── Elastic Sticky Header ── */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm">

        {/* Row 1: Navigation + Patient Identity + Actions */}
        <div className="px-4 py-2.5 flex items-center gap-3 flex-wrap min-h-[52px]">
          <button onClick={() => navigate('/doctor-desk')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 flex-shrink-0 transition-colors">
            <ChevronLeft size={16} /> Desk
          </button>

          <div className="w-px h-4 bg-gray-200 flex-shrink-0" />

          {/* Patient identity block */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0 flex-wrap">
            <div className="min-w-0">
              <span className="font-bold text-gray-900 text-sm">{patientName}</span>
              {ageSex && <span className="text-xs text-gray-500 ml-2">{ageSex}</span>}
            </div>
            {mrn && (
              <span className="text-[11px] font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md flex-shrink-0">
                {mrn}
              </span>
            )}
            <span className={(STATUS_CFG[status] || {}).badge || 'badge-gray'} style={{ flexShrink: 0 }}>
              {(STATUS_CFG[status] || {}).label || status.replace(/_/g, ' ')}
            </span>
            {appt.appointment_time && (
              <span className="text-xs text-gray-400 flex-shrink-0">{fmt12(appt.appointment_time)}</span>
            )}
            {appt.mode === 'telehealth' && (
              <Video size={13} className="text-green-500 flex-shrink-0" title="Telehealth" />
            )}

            {/* Demographics toggle */}
            {demoFields.length > 0 && (
              <button onClick={() => setDemoOpen(o => !o)}
                className="flex items-center gap-0.5 text-[11px] text-blue-500 hover:text-blue-700 transition-colors flex-shrink-0">
                <User size={11} />
                {demoOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {!readonly && (
              <button onClick={handleSaveDraft} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
                {saving
                  ? <span className="w-3 h-3 border border-gray-400/30 border-t-gray-600 rounded-full animate-spin" />
                  : <Save size={12} />}
                Save Draft
              </button>
            )}

            {canSendInvestigations && (
              <button onClick={handleSendInvestigations} disabled={actionLoading === 'investigations'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50 transition-colors">
                {actionLoading === 'investigations'
                  ? <span className="w-3 h-3 border border-indigo-400/30 border-t-indigo-600 rounded-full animate-spin" />
                  : <FlaskConical size={12} />}
                Send for Investigations
              </button>
            )}

            {canMarkReviewReady && (
              <button onClick={handleMarkReviewReady} disabled={actionLoading === 'review'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 transition-colors">
                {actionLoading === 'review'
                  ? <span className="w-3 h-3 border border-amber-400/30 border-t-amber-600 rounded-full animate-spin" />
                  : <Eye size={12} />}
                Mark Review Ready
              </button>
            )}

            {canComplete && (
              <button onClick={handleComplete} disabled={actionLoading === 'complete'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                style={{ background: BLUE }}>
                {actionLoading === 'complete'
                  ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                  : <CheckCircle size={12} />}
                Conclude &amp; Complete
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Demographics (collapsible) */}
        {demoOpen && demoFields.length > 0 && (
          <div className="px-4 py-2 bg-gray-50/80 border-t border-gray-100 flex flex-wrap gap-x-8 gap-y-1">
            {demoFields.map((f, i) => (
              <span key={i} className="text-xs">
                <span className="text-gray-400">{f.label}: </span>
                <span className="font-medium text-gray-700">{f.value}</span>
              </span>
            ))}
          </div>
        )}

        {/* Row 3: Vitals strip (appears only when vitals filled) */}
        {hasVitals && (
          <div className="px-4 py-2 bg-blue-50/40 border-t border-blue-100/60 flex flex-wrap gap-x-8 gap-y-1">
            {v.bp        && <span className="text-xs"><span className="text-blue-500/70 font-medium">BP </span><span className="font-bold text-gray-800">{v.bp}</span></span>}
            {v.pulse     && <span className="text-xs"><span className="text-blue-500/70 font-medium">HR </span><span className="font-bold text-gray-800">{v.pulse} bpm</span></span>}
            {v.temp      && <span className="text-xs"><span className="text-blue-500/70 font-medium">Temp </span><span className="font-bold text-gray-800">{v.temp}°C</span></span>}
            {v.spo2      && <span className="text-xs"><span className="text-blue-500/70 font-medium">SpO₂ </span><span className="font-bold text-gray-800">{v.spo2}%</span></span>}
            {v.weight    && <span className="text-xs"><span className="text-blue-500/70 font-medium">Wt </span><span className="font-bold text-gray-800">{v.weight} kg</span></span>}
            {v.height    && <span className="text-xs"><span className="text-blue-500/70 font-medium">Ht </span><span className="font-bold text-gray-800">{v.height} cm</span></span>}
            {v.sugar && <span className="text-xs"><span className="text-blue-500/70 font-medium">Sugar </span><span className="font-bold text-gray-800">{v.sugar}</span></span>}
          </div>
        )}
      </div>

      {/* ── Three-column body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left sub-sidebar */}
        <div className="w-[172px] flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
          <nav className="py-2">
            {NAV.map(({ key, label, Icon }) => (
              <button key={key} onClick={() => setSection(key)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold transition-colors text-left"
                style={section === key
                  ? { background: BLUE, color: '#fff' }
                  : { color: '#4b5563' }}
                onMouseEnter={e => { if (section !== key) e.currentTarget.style.background = '#f9fafb' }}
                onMouseLeave={e => { if (section !== key) e.currentTarget.style.background = '' }}>
                <Icon size={15} className="flex-shrink-0" />
                <span className="leading-tight">{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Main content area */}
        <div className={`flex-1 min-w-0 ${activeForm ? 'overflow-hidden' : 'overflow-y-auto bg-white'}`}>
          {activeForm ? (
            <DbAssessmentFormModal
              variant="inline"
              form={activeForm}
              patientId={patientId}
              encounterId={id}
              patientName={patientName}
              onClose={() => setActiveForm(null)}
              onSubmitted={({ schema, formData }) => {
                setActiveForm(null)
                handleFormOrders(extractOrdersFromForm(schema, formData))
                refreshSubmissions()
              }}
            />
          ) : (
            <div className="p-5 max-w-3xl">
              {section === 'chart' && (
                <PatientChartDocument
                  encounter={encounter}
                  patientId={patientId}
                  soap={soap}
                  prescriptions={prescriptions}
                  labItems={labItems}
                  imagingItems={imagingItems}
                  counselling={counselling}
                  formSubmissions={formSubmissions}
                  labOrders={labOrders}
                  imagingOrders={imagingOrders}
                  allPatientLabOrders={allPatientLabOrders}
                  allPatientImagingOrders={allPatientImagingOrders}
                />
              )}
              {section === 'counselling' && (
                <CounsellingSection
                  value={counselling}
                  onChange={setCounselling}
                  readonly={readonly}
                  patientId={patientId}
                />
              )}
              {section === 'prescriptions' && (
                <PrescriptionsSection
                  items={prescriptions}
                  onChange={setPrescriptions}
                  readonly={readonly}
                  patientId={patientId}
                  onOrderMedication={readonly ? undefined : () => setMedFormOpen(true)}
                />
              )}
              {section === 'lab' && (
                <LabSection
                  items={labItems}
                  onChange={setLabItems}
                  readonly={readonly}
                  patientId={patientId}
                />
              )}
              {section === 'imaging' && (
                <ImagingSection
                  items={imagingItems}
                  onChange={setImagingItems}
                  readonly={readonly}
                  patientId={patientId}
                />
              )}
            </div>
          )}
        </div>

        {/* Right assessment panel */}
        {panelOpen ? (
          <div className="w-[272px] flex-shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
            <AssessmentPanel onOpenForm={setActiveForm} onCollapse={() => setPanelOpen(false)} clinicId={user?.clinic_id ?? null} />
          </div>
        ) : (
          <button onClick={() => setPanelOpen(true)}
            className="w-6 flex-shrink-0 bg-gray-50 border-l border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Show assessment forms">
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      {/* Medication order form modal */}
      {medFormOpen && (
        <MedicationOrderForm
          api={api}
          currentUser={user}
          admissionId={`opd-${id}`}
          patientData={{ name: patientName, age: patient.age, weight_kg: encounter.vitals?.weight }}
          patientAllergies={[]}
          existingOrders={prescriptions.map(p => ({ drug_name: p.drug_name }))}
          onSubmit={handleAddMedicationOrder}
          onCancel={() => setMedFormOpen(false)}
        />
      )}

      {/* Order toast notification */}
      {orderToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-md px-2">
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm" style={{ background: BLUE }}>
            <CheckCircle size={16} className="mt-0.5 shrink-0 text-green-300" />
            <span>{orderToast}</span>
            <button onClick={() => setOrderToast('')} className="ml-1 text-white/70 hover:text-white shrink-0">
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
