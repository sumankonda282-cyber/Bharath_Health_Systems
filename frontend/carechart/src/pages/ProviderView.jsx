import { useState, useEffect, useCallback } from 'react'
import { Loader2, AlertTriangle, PlusCircle, XCircle, AlertOctagon, Stethoscope, Pill, ClipboardCheck, FlaskConical, ArrowRight, ShieldAlert, Thermometer, Heart, Wind, Droplets, Activity } from 'lucide-react'
import api from '../api/client'
import { GREEN, NAVY, RED } from '../constants/colors'

const AMBER  = '#d97706'

// ── helpers ──────────────────────────────────────────────────────────────────
function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}
function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

// ── Acuity + Vitals Frequency banner ─────────────────────────────────────────
function AcuityBanner({ admission }) {
  const adm = admission || {}
  const acuity    = adm.acuity_level || adm.acuity || null
  const freqHours = adm.vitals_freq_hours || adm.vitals_frequency || null
  const note      = adm.monitoring_note  || adm.acuity_note || null

  // Mock defaults when not in API
  const mockAcuity    = acuity    || 'high'
  const mockFreq      = freqHours || 1
  const mockNote      = note      || 'Dr. Rao: Post-op monitoring. Alert immediately if SpO₂ < 95% or BP > 150/100 or Temp > 38.5°C.'

  const ACUITY_CFG = {
    high:    { label: 'HIGH ACUITY',    dot: '🔴', bg: '#b91c1c', text: 'white' },
    medium:  { label: 'MEDIUM ACUITY',  dot: '🟡', bg: '#d97706', text: 'white' },
    low:     { label: 'LOW ACUITY',     dot: '🟢', bg: '#065F46', text: 'white' },
    routine: { label: 'ROUTINE',        dot: '⚪', bg: '#6b7280', text: 'white' },
  }
  const ac = ACUITY_CFG[mockAcuity] || ACUITY_CFG.routine

  return (
    <div className="flex-shrink-0 px-5 py-2.5 flex items-center gap-4 flex-wrap"
      style={{ background: ac.bg, borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
      <span className="text-[10px] font-black uppercase tracking-widest text-white opacity-90">{ac.dot} {ac.label}</span>
      <div className="w-px h-3 bg-white opacity-30" />
      {mockFreq && (
        <>
          <span className="text-[10px] text-white opacity-80">Vitals</span>
          <span className="text-xs font-extrabold text-white">Every {mockFreq}h</span>
          <div className="w-px h-3 bg-white opacity-30" />
        </>
      )}
      {mockNote && (
        <span className="text-[11px] text-white opacity-85 italic truncate flex-1">{mockNote}</span>
      )}
    </div>
  )
}

// ── Latest vitals band ────────────────────────────────────────────────────────
function VitalsBand({ vitals }) {
  const v = vitals?.[0]
  if (!v) return null
  const items = [
    { icon: Heart,       label: 'BP',    value: v.blood_pressure, unit: 'mmHg' },
    { icon: Activity,    label: 'Pulse', value: v.pulse,          unit: 'bpm'  },
    { icon: Thermometer, label: 'Temp',  value: v.temperature,    unit: '°C'   },
    { icon: Droplets,    label: 'SpO₂',  value: v.spo2,           unit: '%'    },
    { icon: Wind,        label: 'RR',    value: v.rr,             unit: '/min' },
  ].filter(i => i.value != null)

  return (
    <div className="flex-shrink-0 flex items-center gap-4 px-5 py-2 text-white flex-wrap"
      style={{ background: GREEN, borderBottom: '1px solid #047857' }}>
      <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 whitespace-nowrap">Latest Vitals</span>
      {items.map(({ icon: Icon, label, value, unit }) => (
        <div key={label} className="flex items-center gap-1.5 whitespace-nowrap">
          <Icon size={11} className="opacity-60" />
          <span className="text-[10px] opacity-70">{label}</span>
          <span className="text-xs font-bold">{value}</span>
          <span className="text-[10px] opacity-60">{unit}</span>
        </div>
      ))}
      <span className="text-[10px] opacity-60 ml-auto whitespace-nowrap">
        by {v.recorded_by || '—'} · {fmtTime(v.recorded_at)}
      </span>
    </div>
  )
}

// ── Vitals block ─────────────────────────────────────────────────────────────
const VITAL_FIELDS = [
  { key: 'blood_pressure', label: 'Blood Pressure', unit: 'mmHg', icon: Heart,       col: 0 },
  { key: 'pulse',          label: 'Pulse',           unit: 'bpm',  icon: Activity,    col: 1 },
  { key: 'temperature',    label: 'Temperature',     unit: '°C',   icon: Thermometer, col: 0 },
  { key: 'spo2',           label: 'SpO₂',            unit: '%',    icon: Droplets,    col: 1 },
  { key: 'rr',             label: 'Resp. Rate',      unit: '/min', icon: Wind,        col: 0 },
  { key: 'weight',         label: 'Weight',          unit: 'kg',   icon: Activity,    col: 1 },
]

function VitalsBlock({ data }) {
  const present = VITAL_FIELDS.filter(f => data[f.key] != null)
  if (!present.length) return null

  // Two columns
  const col0 = present.filter(f => f.col === 0)
  const col1 = present.filter(f => f.col === 1)
  const maxRows = Math.max(col0.length, col1.length)

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Activity size={12} style={{ color: GREEN }} />
        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: GREEN }}>Vitals</span>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
        {Array.from({ length: maxRows }).map((_, i) => (
          <>
            {col0[i] ? (
              <VitalItem key={`c0-${i}`} field={col0[i]} value={data[col0[i].key]} />
            ) : <div key={`c0e-${i}`} />}
            {col1[i] ? (
              <VitalItem key={`c1-${i}`} field={col1[i]} value={data[col1[i].key]} />
            ) : <div key={`c1e-${i}`} />}
          </>
        ))}
      </div>
    </div>
  )
}

function VitalItem({ field, value }) {
  const Icon = field.icon
  return (
    <div className="flex items-baseline gap-2 min-w-0">
      <Icon size={10} style={{ color: '#9ca3af', flexShrink: 0, marginTop: 2 }} />
      <span className="text-[11px] text-gray-500 w-28 flex-shrink-0">{field.label}</span>
      <span className="text-sm font-bold text-gray-900">{value}</span>
      <span className="text-[10px] text-gray-400">{field.unit}</span>
    </div>
  )
}

// ── SOAP section ─────────────────────────────────────────────────────────────
function SoapSection({ icon: Icon, label, color, children }) {
  if (!children) return null
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={12} style={{ color }} />
        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>{label}</span>
      </div>
      <div className="pl-5 flex flex-col gap-1">{children}</div>
    </div>
  )
}

function SoapRow({ label, value, highlight }) {
  if (!value) return null
  return (
    <div className="grid gap-x-4" style={{ gridTemplateColumns: '140px 1fr' }}>
      <span className="text-[11px] text-gray-500 leading-relaxed">{label}</span>
      <span className="text-[11px] font-semibold leading-relaxed"
        style={{ color: highlight ? '#b91c1c' : '#111827' }}>
        {value}
      </span>
    </div>
  )
}

// ── Med change row ────────────────────────────────────────────────────────────
function MedChangeRow({ type, drug, dose, route, reason }) {
  const isAdd    = type === 'added'
  const isRemove = type === 'removed'
  const isModify = type === 'modified'

  return (
    <div className="flex items-start gap-2 py-1">
      {isAdd    && <PlusCircle  size={14} style={{ color: GREEN, flexShrink: 0, marginTop: 1 }} />}
      {isRemove && <XCircle     size={14} style={{ color: RED,   flexShrink: 0, marginTop: 1 }} />}
      {isModify && <ArrowRight  size={14} style={{ color: AMBER, flexShrink: 0, marginTop: 1 }} />}
      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-bold" style={{ color: isAdd ? GREEN : isRemove ? RED : AMBER }}>
          {isAdd ? 'Added' : isRemove ? 'Removed' : 'Modified'}&ensp;
        </span>
        <span className="text-[12px] font-bold text-gray-900">{drug}</span>
        {dose   && <span className="text-[11px] text-gray-600"> — {dose}</span>}
        {route  && <span className="text-[11px] text-gray-500"> {route}</span>}
        {reason && (
          <p className="text-[10px] text-gray-400 mt-0.5 italic">Reason: {reason}</p>
        )}
      </div>
    </div>
  )
}

// ── Allergy entry ─────────────────────────────────────────────────────────────
function AllergyEntry({ allergy, reaction, severity }) {
  return (
    <div className="flex items-start gap-2 py-1">
      <AlertOctagon size={14} style={{ color: RED, flexShrink: 0, marginTop: 1 }} />
      <div>
        <span className="text-[11px] font-bold" style={{ color: RED }}>Allergy recorded&ensp;</span>
        <span className="text-[12px] font-bold text-gray-900">{allergy}</span>
        {reaction  && <span className="text-[11px] text-gray-600"> — {reaction}</span>}
        {severity === 'severe' && (
          <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: '#fef2f2', color: RED, border: '1px solid #fecaca' }}>
            SEVERE
          </span>
        )}
      </div>
    </div>
  )
}

// ── Assessment form entry ─────────────────────────────────────────────────────
function FormEntry({ formName, score, interpretation, fields }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border rounded-xl overflow-hidden" style={{ borderColor: '#e9eaec' }}>
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={13} style={{ color: '#6366f1' }} />
          <span className="text-[12px] font-bold text-gray-800">{formName}</span>
          {score != null && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}>
              Score: {score}
            </span>
          )}
          {interpretation && (
            <span className="text-[10px] text-gray-500 italic">{interpretation}</span>
          )}
        </div>
        <span className="text-[10px] text-gray-400">{expanded ? '▲ hide' : '▼ show'}</span>
      </button>
      {expanded && fields?.length > 0 && (
        <div className="px-4 pb-3 border-t grid grid-cols-2 gap-x-6 gap-y-1.5 pt-3"
          style={{ borderColor: '#f3f4f6' }}>
          {fields.map(({ label, value }) => (
            <div key={label} className="grid gap-x-3" style={{ gridTemplateColumns: '130px 1fr' }}>
              <span className="text-[10px] text-gray-400">{label}</span>
              <span className="text-[11px] font-semibold text-gray-800">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Signature strip ───────────────────────────────────────────────────────────
function Signature({ name, role, time }) {
  return (
    <div className="flex items-center gap-2 mt-3 pt-2.5 border-t" style={{ borderColor: '#e9eaec' }}>
      <ShieldAlert size={11} style={{ color: GREEN }} />
      <span className="text-[10px] italic" style={{ color: GREEN }}>
        Signed by <strong>{name}</strong>
        {role && <span className="not-italic opacity-80"> · {role}</span>}
        {' '} · PIN verified · {fmtTime(time)}
      </span>
    </div>
  )
}

// ── Visit block ───────────────────────────────────────────────────────────────
function VisitBlock({ visit, isFirst }) {
  const { author, role, start, end, entries } = visit

  // Partition entries by SOAP order
  const vitalsEntry  = entries.find(e => e.type === 'vitals')
  const subjEntry    = entries.find(e => e.type === 'subjective')
  const objEntry     = entries.find(e => e.type === 'objective')
  const assEntry     = entries.find(e => e.type === 'assessment')
  const planEntry    = entries.find(e => e.type === 'plan')
  const medEntries   = entries.filter(e => e.type === 'medication_change')
  const allergyEntries = entries.filter(e => e.type === 'allergy')
  const formEntries  = entries.filter(e => e.type === 'assessment_form')

  const timeRange = start === end || !end
    ? fmtTime(start)
    : `${fmtTime(start)} – ${fmtTime(end)}`

  return (
    <div className="relative">
      {/* Visit divider */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px" style={{ background: '#e5e7eb' }} />
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
            style={{ background: role === 'Doctor' ? NAVY : role === 'Nurse' ? GREEN : AMBER }}>
            {author.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-800">{author}</span>
            {role && <span className="text-[10px] text-gray-400"> · {role}</span>}
            <span className="text-[10px] text-gray-400"> · {timeRange}</span>
          </div>
        </div>
        <div className="flex-1 h-px" style={{ background: '#e5e7eb' }} />
      </div>

      {/* Content */}
      <div className="pb-2 px-1">
        {vitalsEntry && <VitalsBlock data={vitalsEntry.data} />}

        {subjEntry && (
          <SoapSection icon={Stethoscope} label="Subjective" color="#0891b2">
            {Object.entries(subjEntry.data || {}).map(([k, v]) => (
              <SoapRow key={k} label={k} value={v} />
            ))}
          </SoapSection>
        )}

        {objEntry && (
          <SoapSection icon={FlaskConical} label="Objective" color="#7c3aed">
            {Object.entries(objEntry.data || {}).map(([k, v]) => (
              <SoapRow key={k} label={k} value={v} />
            ))}
          </SoapSection>
        )}

        {assEntry && (
          <SoapSection icon={AlertTriangle} label="Assessment" color={AMBER}>
            {Object.entries(assEntry.data || {}).map(([k, v]) => (
              <SoapRow key={k} label={k} value={v} highlight={k.toLowerCase().includes('critical')} />
            ))}
          </SoapSection>
        )}

        {planEntry && (
          <SoapSection icon={ClipboardCheck} label="Plan" color={NAVY}>
            {Object.entries(planEntry.data || {}).map(([k, v]) => (
              <SoapRow key={k} label={k} value={v} />
            ))}
          </SoapSection>
        )}

        {medEntries.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Pill size={12} style={{ color: '#7c3aed' }} />
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#7c3aed' }}>Medication Changes</span>
            </div>
            <div className="pl-5 flex flex-col gap-0.5">
              {medEntries.map((e, i) => (
                <MedChangeRow key={i} type={e.change_type} drug={e.drug} dose={e.dose} route={e.route} reason={e.reason} />
              ))}
            </div>
          </div>
        )}

        {allergyEntries.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertOctagon size={12} style={{ color: RED }} />
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: RED }}>Allergies</span>
            </div>
            <div className="pl-5 flex flex-col gap-0.5">
              {allergyEntries.map((e, i) => (
                <AllergyEntry key={i} allergy={e.allergy} reaction={e.reaction} severity={e.severity} />
              ))}
            </div>
          </div>
        )}

        {formEntries.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardCheck size={12} style={{ color: '#6366f1' }} />
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#6366f1' }}>Assessment Forms</span>
            </div>
            <div className="pl-5 flex flex-col gap-2">
              {formEntries.map((e, i) => (
                <FormEntry key={i} formName={e.form_name} score={e.score} interpretation={e.interpretation} fields={e.fields} />
              ))}
            </div>
          </div>
        )}

        <Signature name={author} role={role} time={end || start} />
      </div>
    </div>
  )
}

// ── Mock data builder (used when API returns empty / 404) ─────────────────────
function buildMockVisits(admission) {
  const name   = admission?.patient_name || 'Patient'
  const now    = Date.now()
  return [
    {
      author: 'Dr. Ramesh Reddy', role: 'Consultant',
      start: new Date(now - 30 * 60000).toISOString(),
      end:   new Date(now - 10 * 60000).toISOString(),
      entries: [
        { type: 'vitals', data: { blood_pressure: '124/82', pulse: 88, temperature: 37.2, spo2: 97, rr: 18 } },
        { type: 'subjective', data: { 'Chief Complaint': 'Reduced breathlessness since yesterday. Tolerating oral fluids. No chest pain.', 'History': 'Day 3 of septic shock management. Improving.' } },
        { type: 'objective', data: { 'General': 'Alert and oriented, comfortable at rest', 'Respiratory': 'Clear air entry bilaterally, no crackles', 'CVS': 'Regular rate and rhythm' } },
        { type: 'assessment', data: { 'Primary Dx': 'Septic Shock — improving', 'Secondary': 'Hyponatraemia — resolving' } },
        { type: 'plan', data: { 'Medications': 'Meropenem 1g IV Q8H — continue', 'IV Fluids': 'Reduced to 75 mL/hr', 'Investigations': 'Repeat CBC, CRP tomorrow morning', 'Follow-up': 'Review in evening round' } },
        { type: 'medication_change', change_type: 'added',   drug: 'Metoprolol', dose: '25mg PO BD', route: 'Oral', reason: 'HR control' },
        { type: 'medication_change', change_type: 'removed', drug: 'Amlodipine', dose: '5mg',         route: 'Oral', reason: 'Discontinued — BP stable' },
      ],
    },
    {
      author: 'Sr. Priya Nair', role: 'Nurse',
      start: new Date(now - 75 * 60000).toISOString(),
      end:   new Date(now - 72 * 60000).toISOString(),
      entries: [
        { type: 'vitals', data: { blood_pressure: '118/76', pulse: 92, temperature: 37.4, spo2: 96, rr: 20 } },
        { type: 'assessment_form', form_name: 'Pain Score', score: 4, interpretation: 'Moderate pain', fields: [{ label: 'Pain Location', value: 'Chest' }, { label: 'Character', value: 'Dull, intermittent' }, { label: 'Scale (0–10)', value: '4' }, { label: 'Relieved by', value: 'Rest' }] },
      ],
    },
    {
      author: 'Dr. Ramesh Reddy', role: 'Consultant',
      start: new Date(now - 4 * 3600000).toISOString(),
      end:   new Date(now - 3.5 * 3600000).toISOString(),
      entries: [
        { type: 'vitals', data: { blood_pressure: '110/70', pulse: 104, temperature: 38.1, spo2: 94 } },
        { type: 'subjective', data: { 'Complaint': 'Fever and chills persisting. Poor oral intake.' } },
        { type: 'objective', data: { 'General': 'Ill-looking, febrile', 'Respiratory': 'Mild tachypnoea' } },
        { type: 'assessment', data: { 'Primary Dx': 'Septic Shock — active', 'Note': 'Escalating antibiotics' } },
        { type: 'plan', data: { 'Antibiotics': 'Escalate to Meropenem + Vancomycin', 'Monitoring': 'Hourly BP, 4-hourly vitals', 'Consult': 'ICU consult if no improvement in 4h' } },
        { type: 'allergy', allergy: 'Penicillin', reaction: 'Anaphylaxis', severity: 'severe' },
        { type: 'assessment_form', form_name: 'Sepsis Screening', score: 3, interpretation: 'High risk — SOFA score elevated', fields: [{ label: 'Fever > 38.3°C', value: 'Yes' }, { label: 'HR > 90 bpm', value: 'Yes' }, { label: 'RR > 20', value: 'Yes' }, { label: 'WBC > 12k', value: 'Pending' }] },
      ],
    },
  ]
}

// ── Main Provider View ────────────────────────────────────────────────────────
export default function ProviderView({ admission, vitals }) {
  const [visits, setVisits]   = useState([])
  const [loading, setLoading] = useState(true)

  const admissionId = admission?.id

  const load = useCallback(async () => {
    if (!admissionId) return
    setLoading(true)
    try {
      const data = await api.get(`/inpatient/admissions/${admissionId}/provider-notes`)
      const list = Array.isArray(data) ? data : (data.items || data.visits || [])
      if (list.length > 0) {
        setVisits(groupIntoVisits(list))
      } else {
        setVisits(buildMockVisits(admission))
      }
    } catch {
      setVisits(buildMockVisits(admission))
    } finally {
      setLoading(false)
    }
  }, [admissionId])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <AcuityBanner admission={admission} />
      <VitalsBand vitals={vitals} />

      {loading ? (
        <div className="flex items-center justify-center flex-1 text-gray-400">
          <Loader2 size={20} className="animate-spin mr-2" /> Loading documentation…
        </div>
      ) : visits.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
          <AlertTriangle size={24} className="mb-2 opacity-40" />
          <p className="text-sm">No documentation yet</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2">
          {visits.map((visit, i) => (
            <VisitBlock key={i} visit={visit} isFirst={i === 0} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Group raw entries into 30-min visit blocks ────────────────────────────────
function groupIntoVisits(entries) {
  const sorted = [...entries].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const visits = []
  for (const entry of sorted) {
    const last = visits[visits.length - 1]
    const sameAuthor = last && last.author === (entry.author_name || entry.created_by)
    const within30   = last && (new Date(last.end) - new Date(entry.created_at)) < 30 * 60 * 1000
    if (sameAuthor && within30) {
      last.entries.push(entry)
      last.start = entry.created_at
    } else {
      visits.push({
        author:  entry.author_name || entry.created_by || 'Unknown',
        role:    entry.author_role || entry.role || '',
        start:   entry.created_at,
        end:     entry.created_at,
        entries: [entry],
      })
    }
  }
  return visits
}
