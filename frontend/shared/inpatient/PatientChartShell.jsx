import { useState, useEffect } from 'react'
import {
  ArrowLeft, Search, Pin, ChevronDown, ChevronUp, Menu, X,
  Loader2, AlertCircle, Activity, Heart, TrendingUp, Droplets,
  Bed, ClipboardList, Pill, ShieldAlert, Star,
} from 'lucide-react'

const GREEN = '#059669'
const NAVY = '#0F2557'

// ── Assessment form pool ─────────────────────────────────────────────────────
const FORM_POOL = [
  // Bedside / nursing (simple placeholder)
  { name: 'Vital Signs' },
  { name: 'MAR Quick Entry' },
  { name: 'Pain Score' },
  { name: 'Fluid Balance' },
  { name: 'Braden Scale' },
  { name: 'GCS Assessment' },
  { name: 'Fall Risk — Morse' },
  { name: 'I/O Chart' },
  { name: 'Blood Sugar Log' },
  { name: 'Wound Care Log' },
  { name: 'Nutrition Assessment' },
  { name: 'Neurological Obs' },
  { name: 'Pressure Injury' },
  { name: 'Sepsis Screening' },
  { name: 'DVT Prophylaxis' },
  { name: 'Medication Reconciliation' },
  { name: 'Discharge Checklist' },
  { name: 'Post-Op Monitoring' },
  { name: 'Fluid Resuscitation' },
  { name: 'Restraint Assessment' },
  // Patient history (JSX forms)
  { name: 'Patient Profile',   key: 'patient-profile' },
  { name: 'Chief Complaint',   key: 'chief-complaint' },
  { name: 'Medical History',   key: 'medical-history' },
  { name: 'Family History',    key: 'family-history' },
  { name: 'Social History',    key: 'social-history' },
  { name: 'Allergies',         key: 'allergies' },
  { name: 'Systems Review',    key: 'systems-review' },
  // General
  { name: 'Pain Assessment',   key: 'pain-assessment' },
  { name: 'Asthma Control',    key: 'asthma-basic' },
  // Clinical examination
  { name: 'Clinical Exam',        key: 'systems-clinical-exam' },
  { name: 'Clinical Impression',  key: 'systems-clinical-impression' },
  // Cardiology
  { name: 'Chest Pain',           key: 'cardiology-chest-pain' },
  { name: 'Hypertension',         key: 'cardiology-hypertension' },
  { name: 'Heart Failure',        key: 'cardiology-heart-failure' },
  { name: 'ACS Assessment',       key: 'cardiology-acs' },
  { name: 'Atrial Fibrillation',  key: 'cardiology-af' },
  { name: 'Dyslipidemia',         key: 'cardiology-dyslipidemia' },
  { name: 'Cardiomyopathy',       key: 'cardiology-cardiomyopathy' },
  { name: 'Valvular Heart Disease',key: 'cardiology-valvular' },
  { name: 'Rheumatic Heart Disease',key:'cardiology-rhd' },
  { name: 'Pericardial Disease',  key: 'cardiology-pericardial' },
  // ENT
  { name: 'Ear Assessment',       key: 'ent-ear' },
  { name: 'Nose & Sinus',         key: 'ent-nose-sinus' },
  { name: 'Throat & Larynx',      key: 'ent-throat-larynx' },
  { name: 'Head & Neck',          key: 'ent-head-neck' },
  { name: 'Audiology & Hearing',  key: 'ent-audiology' },
  { name: 'Facial Nerve',         key: 'ent-facial-nerve' },
  { name: 'Paediatric ENT',       key: 'ent-paediatric' },
  { name: 'Tracheostomy',         key: 'ent-tracheostomy' },
  // Gastroenterology
  { name: 'Acute Abdomen',           key: 'gastro-acute-abdomen' },
  { name: 'Acute Pancreatitis',      key: 'gastro-acute-pancreatitis' },
  { name: 'Anorectal Disorders',     key: 'gastro-anorectal' },
  { name: 'Biliary & Gallstone',     key: 'gastro-biliary' },
  { name: 'Chronic Pancreatitis',    key: 'gastro-chronic-pancreatitis' },
  { name: 'Dysphagia & Esophageal', key: 'gastro-dysphagia' },
  { name: 'Functional GI',          key: 'gastro-functional' },
  { name: 'GI Bleed',               key: 'gastro-gi-bleed' },
  { name: 'GI Cancer',              key: 'gastro-gi-cancer' },
  { name: 'Gastroparesis',          key: 'gastro-gastroparesis' },
  { name: 'IBD',                    key: 'gastro-ibd' },
  { name: 'Liver Disease',          key: 'gastro-liver' },
  { name: 'Peptic Ulcer / GERD',    key: 'gastro-peptic-ulcer' },
  // OBG
  { name: 'ANC Follow-up',          key: 'obg-anc-followup' },
  { name: 'Antenatal Booking',      key: 'obg-antenatal' },
  { name: 'Cervical Screening',     key: 'obg-cervical' },
  { name: 'Female Infertility',     key: 'obg-infertility' },
  { name: 'GDM Assessment',         key: 'obg-gdm' },
  { name: 'High Risk Pregnancy',    key: 'obg-high-risk' },
  { name: 'Labour Assessment',      key: 'obg-labour' },
  { name: 'Menopause',              key: 'obg-menopause' },
  { name: 'Menstrual Disorder',     key: 'obg-menstrual' },
  { name: 'PCOS',                   key: 'obg-pcos' },
  { name: 'PID Assessment',         key: 'obg-pid' },
  { name: 'Postpartum',             key: 'obg-postpartum' },
  { name: 'Preeclampsia',           key: 'obg-preeclampsia' },
  // Orthopedics
  { name: 'Compartment Syndrome',   key: 'ortho-compartment-syndrome' },
  { name: 'Fracture / Trauma',      key: 'ortho-fracture' },
  { name: 'Musculoskeletal Pain',   key: 'ortho-msk-pain' },
  { name: 'Elbow Assessment',       key: 'ortho-elbow' },
  { name: 'Foot & Ankle',           key: 'ortho-foot-ankle' },
  { name: 'Hand & Wrist',           key: 'ortho-hand-wrist' },
  { name: 'Hip Assessment',         key: 'ortho-hip' },
  { name: 'Knee Assessment',        key: 'ortho-knee' },
  { name: 'Septic Arthritis / Osteomyelitis', key: 'ortho-septic-arthritis' },
  { name: 'Shoulder Assessment',    key: 'ortho-shoulder' },
  { name: 'Orthopedic Tumor',       key: 'ortho-tumor' },
  { name: 'Orthotic & Prosthetic',  key: 'ortho-prosthetic' },
  { name: 'Osteoporosis',           key: 'ortho-osteoporosis' },
  { name: 'Pediatric Orthopedic',   key: 'ortho-pediatric' },
  { name: 'Peripheral Nerve',       key: 'ortho-peripheral-nerve' },
  { name: 'Post-Op Rehab',          key: 'ortho-postop-rehab' },
  { name: 'Spine Assessment',       key: 'ortho-spine' },
  // Pediatrics
  { name: 'Adolescent Health',       key: 'peds-adolescent' },
  { name: 'NICU Assessment',         key: 'peds-nicu' },
  { name: 'Neonatal Assessment',     key: 'peds-neonatal' },
  { name: 'Peds Cardiology',         key: 'peds-cardiology' },
  { name: 'Developmental Disorders', key: 'peds-developmental' },
  { name: 'Pediatric Emergency',     key: 'peds-emergency' },
  { name: 'Peds Endocrinology',      key: 'peds-endocrinology' },
  { name: 'Peds Fever & Infections', key: 'peds-fever' },
  { name: 'Peds Gastro & Nutrition', key: 'peds-gastro' },
  { name: 'Growth & Development',    key: 'peds-growth' },
  { name: 'Haematology & Oncology',  key: 'peds-haematology' },
  { name: 'Peds Nephrology',         key: 'peds-nephrology' },
  { name: 'Peds Neurology',          key: 'peds-neurology' },
  { name: 'Peds Respiratory',        key: 'peds-respiratory' },
  { name: 'Peds Rheumatology',       key: 'peds-rheumatology' },
  { name: 'Vaccination Chart',       key: 'peds-vaccination' },
  // Specialty / Clinical scales
  { name: 'Aerosol Therapy',         key: 'specialty-aerosol' },
  { name: 'Asthma (Specialty)',      key: 'specialty-asthma' },
  { name: 'Diabetes Assessment',     key: 'specialty-diabetes' },
  { name: 'ACT Score',               key: 'clinical-act' },
  { name: 'ADHD Scale',              key: 'clinical-adhd' },
  { name: 'ALSFRS-R',               key: 'clinical-alsfrs' },
  { name: 'ASRS Screen',            key: 'clinical-asrs' },
  { name: 'Migraine Assessment',    key: 'clinical-migraine' },
]

// ── Stat card ────────────────────────────────────────────────────────────────
function PatientStatCard({ icon: Icon, label, value, sub, color, loading }) {
  return (
    <div className="bg-white rounded-xl border p-3.5 flex flex-col gap-2"
      style={{ borderColor: '#e9eaec' }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}15` }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      {loading
        ? <Loader2 size={16} className="animate-spin text-gray-300" />
        : <span className="text-2xl font-extrabold leading-none" style={{ color }}>{value ?? '—'}</span>
      }
      {sub && <span className="text-[10px] text-gray-400 leading-none">{sub}</span>}
    </div>
  )
}

// ── Vitals mini row — handles field names from both portals ──────────────────
// BP:    vital.blood_pressure_systolic/diastolic  OR  vital.blood_pressure
// Pulse: vital.pulse_rate  OR  vital.pulse
// SpO2:  vital.oxygen_saturation  OR  vital.spo2
// RR:    vital.respiratory_rate  OR  vital.rr
// By:    vital.recorded_by_name  OR  vital.recorded_by
function VitalMiniRow({ vital, onEdit }) {
  const bp = (vital.blood_pressure_systolic && vital.blood_pressure_diastolic)
    ? `${vital.blood_pressure_systolic}/${vital.blood_pressure_diastolic}`
    : (vital.blood_pressure || '—')
  const pulse = vital.pulse_rate ?? vital.pulse ?? '—'
  const spo2  = vital.oxygen_saturation ?? vital.spo2
  const rr    = vital.respiratory_rate ?? vital.rr ?? '—'
  const by    = vital.recorded_by_name || vital.recorded_by || '—'

  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="px-3 py-1.5 text-[10px] text-gray-400 whitespace-nowrap">
        {vital.recorded_at
          ? new Date(vital.recorded_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })
          : '—'}
      </td>
      <td className="px-3 py-1.5 text-xs text-gray-700 whitespace-nowrap font-medium">{bp}</td>
      <td className="px-3 py-1.5 text-xs text-gray-700 whitespace-nowrap">{pulse}</td>
      <td className="px-3 py-1.5 text-xs text-gray-700 whitespace-nowrap">{vital.temperature ?? '—'}</td>
      <td className="px-3 py-1.5 text-xs text-gray-700 whitespace-nowrap">{spo2 != null ? `${spo2}%` : '—'}</td>
      <td className="px-3 py-1.5 text-xs text-gray-700 whitespace-nowrap">{rr}</td>
      <td className="px-3 py-1.5 text-xs text-gray-500 whitespace-nowrap">{by}</td>
      <td className="px-3 py-1.5">
        {onEdit && (
          <button onClick={() => onEdit(vital)}
            className="p-1 rounded-md text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
      </td>
    </tr>
  )
}

// ── Dashboard content ────────────────────────────────────────────────────────
function DashboardContent({ adm, patient, vitals, loading, dashboardActions, onEditVital }) {
  const latestVital = vitals?.[0] || {}
  const admittedAt = adm.admitted_at || adm.admission_date || adm.created_at
  const los = admittedAt
    ? Math.floor((Date.now() - new Date(admittedAt).getTime()) / 86400000) + 1
    : null

  // BP normalised for stat card display
  const bpDisplay = (latestVital.blood_pressure_systolic && latestVital.blood_pressure_diastolic)
    ? `${latestVital.blood_pressure_systolic}/${latestVital.blood_pressure_diastolic}`
    : (latestVital.blood_pressure || '—')
  const pulseDisplay = latestVital.pulse_rate ?? latestVital.pulse
  const spo2Display  = latestVital.oxygen_saturation ?? latestVital.spo2
  const pat = patient || {}

  const STATS = [
    { icon: Heart,         label: 'Last BP',          value: bpDisplay,                                                    sub: 'mmHg',             color: '#dc2626' },
    { icon: Activity,      label: 'Pulse',             value: pulseDisplay != null ? `${pulseDisplay}` : '—',               sub: 'bpm',              color: '#2563eb' },
    { icon: TrendingUp,    label: 'SpO₂',              value: spo2Display  != null ? `${spo2Display}%` : '—',               sub: 'oxygen sat',       color: GREEN },
    { icon: Droplets,      label: 'Temperature',       value: latestVital.temperature != null ? `${latestVital.temperature}°` : '—', sub: 'celsius', color: '#d97706' },
    { icon: Bed,           label: 'Length of Stay',    value: los != null ? `Day ${los}` : '—',                             sub: 'since admission',  color: NAVY },
    { icon: ClipboardList, label: 'Active Orders',     value: adm.active_orders_count ?? '—',                               sub: 'pending orders',   color: '#7c3aed' },
    { icon: Pill,          label: 'Medications',       value: adm.medication_count ?? '—',                                  sub: 'prescribed',       color: '#0891b2' },
    { icon: ShieldAlert,   label: 'Pending Vitals',    value: adm.pending_vitals_count ?? '—',                              sub: '>4h overdue',      color: '#ea580c' },
  ]

  const bloodGroup = pat.blood_group || adm.blood_group
  const hasPatientInfo = Object.keys(pat).length > 0

  return (
    <div className="p-5 flex flex-col gap-5 overflow-y-auto h-full">

      {/* Stat cards grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Patient Metrics</h2>
          {dashboardActions}
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {STATS.map(s => (
            <PatientStatCard key={s.label} loading={loading && !latestVital.blood_pressure && !latestVital.blood_pressure_systolic}
              icon={s.icon} label={s.label} value={s.value} sub={s.sub} color={s.color} />
          ))}
        </div>
      </div>

      {/* Recent vitals table */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#e9eaec' }}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: '#f0f0f0' }}>
          <span className="text-sm font-bold text-gray-800">Recent Vitals</span>
          <span className="text-[10px] text-gray-400">{vitals?.length ?? 0} records</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 size={18} className="animate-spin mr-2" /> Loading…
          </div>
        ) : !vitals?.length ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <AlertCircle size={20} className="mb-1.5 opacity-40" />
            <p className="text-xs">No vitals recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['Time', 'BP (mmHg)', 'Pulse', 'Temp °C', 'SpO₂', 'RR', 'By', ''].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vitals.slice(0, 10).map((v, i) => (
                  <VitalMiniRow key={v.id || i} vital={v} onEdit={onEditVital} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admission info + Care Team */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#e9eaec' }}>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Admission Details</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            {[
              ['Ward',          adm.ward_name || '—'],
              ['Bed',           adm.bed_number || '—'],
              ['Department',    adm.department_name || '—'],
              ['Admitted',      (adm.admitted_at || adm.admission_date)
                ? new Date(adm.admitted_at || adm.admission_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'],
              ['Est. Discharge', adm.expected_discharge
                ? new Date(adm.expected_discharge).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'],
              ['Admission Type', (adm.admission_type || '—').toString().replace(/_/g, ' ')],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{k}</dt>
                <dd className="text-xs font-semibold text-gray-700 mt-0.5">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#e9eaec' }}>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Care Team</h3>
          <dl className="grid grid-cols-1 gap-y-2">
            {[
              ['Primary Doctor',   adm.primary_doctor_name || adm.doctor_name || pat.full_name || '—'],
              ['Nurse Assigned',   adm.nurse_name || '—'],
              ['Consultant',       adm.consultant_name || '—'],
              ['Referring Doctor', adm.referring_doctor || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <dt className="text-[10px] text-gray-400">{k}</dt>
                <dd className="text-xs font-semibold text-gray-700">{v}</dd>
              </div>
            ))}
          </dl>
          {hasPatientInfo && (bloodGroup || pat.allergies || pat.phone) && (
            <div className="mt-3 pt-3 border-t" style={{ borderColor: '#f0f0f0' }}>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Patient Info</h4>
              {[
                ['Blood Group', bloodGroup],
                ['Allergies',   pat.allergies],
                ['Phone',       pat.phone || pat.contact_number],
                ['DOB',         pat.date_of_birth ? new Date(pat.date_of_birth).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : null],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-0.5">
                  <dt className="text-[10px] text-gray-400">{k}</dt>
                  <dd className={`text-xs font-semibold ${k === 'Allergies' ? 'text-orange-600' : k === 'Blood Group' ? 'text-red-600' : 'text-gray-700'}`}>{v}</dd>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Assessment panel (search + browse — forms open full-page) ────────────────
function AssessmentPanel({ onOpenForm, api }) {
  // DB forms (admin-built) + personal/org favorites from the live API.
  // Falls back to the static FORM_POOL (rich clinical forms) when no api is
  // injected, so the panel never breaks.
  const [dbForms, setDbForms]         = useState([])
  const [favPersonal, setFavPersonal] = useState([])
  const [favOrg, setFavOrg]           = useState([])
  const [poolSearch, setPoolSearch]   = useState('')

  useEffect(() => {
    if (!api) return
    let alive = true
    Promise.all([
      api.get('/assessment-forms/', { params: { status: 'published', limit: 1000 } }).catch(() => null),
      api.get('/assessment-forms/favorites').catch(() => null),
    ]).then(([pool, favs]) => {
      if (!alive) return
      if (pool) setDbForms(pool.forms || [])
      if (favs) { setFavPersonal(favs.personal || []); setFavOrg(favs.organization || []) }
    })
    return () => { alive = false }
  }, [api])

  const ftitle = (f) => f.title || f.name || 'Untitled form'
  const byId   = (id) => dbForms.find(f => f.id === id)

  const toggleFav = (id, scope) => {
    if (!api) return
    const isPersonal = scope === 'personal'
    const cur = isPersonal ? favPersonal : favOrg
    const set = isPersonal ? setFavPersonal : setFavOrg
    const has = cur.includes(id)
    set(has ? cur.filter(x => x !== id) : [...cur, id])   // optimistic
    const req = has
      ? api.delete(`/assessment-forms/favorites/${id}`, { params: { scope } })
      : api.post(`/assessment-forms/favorites/${id}`, null, { params: { scope } })
    if (req && req.catch) req.catch(() => set(cur))        // revert on failure
  }

  const orgForms      = favOrg.map(byId).filter(Boolean)        // pinned (clinic-wide) — top
  const personalForms = favPersonal.map(byId).filter(Boolean)  // my favourites — below search
  const q = poolSearch.trim().toLowerCase()
  // "pool of all" = DB forms + the static rich clinical forms.
  const pool = [...dbForms.map(f => ({ ...f, __db: true })), ...FORM_POOL]
  const results = q ? pool.filter(f => ftitle(f).toLowerCase().includes(q)) : pool

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#fafaf9' }}>

      {/* Pinned (organization) — top */}
      <div className="flex-shrink-0 border-b" style={{ borderColor: '#e9eaec' }}>
        <div className="flex items-center gap-1.5 px-3 py-2.5">
          <Pin size={11} style={{ color: NAVY }} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Pinned (Clinic)</span>
        </div>
        <div className="px-3 pb-2.5 flex flex-wrap gap-1.5">
          {orgForms.map(f => (
            <div key={`org-${f.id}`}
              className="group flex items-center gap-1 px-2 py-1 rounded-lg border cursor-pointer transition-all text-[10px] font-semibold hover:border-blue-400 hover:bg-blue-50"
              style={{ borderColor: '#bfdbfe', background: 'white', color: '#374151' }}
              onClick={() => onOpenForm({ ...f, __db: true })}>
              {ftitle(f)}
              <button onClick={e => { e.stopPropagation(); toggleFav(f.id, 'organization') }}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 text-gray-400 hover:text-red-400"
                title="Unpin for clinic">
                <X size={9} />
              </button>
            </div>
          ))}
          {orgForms.length === 0 && (
            <span className="text-[10px] text-gray-400 italic">No clinic-pinned forms</span>
          )}
        </div>
      </div>

      {/* Search the full pool */}
      <div className="px-3 py-2 flex-shrink-0 border-b" style={{ borderColor: '#f0f0f0' }}>
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={poolSearch} onChange={e => setPoolSearch(e.target.value)}
            placeholder="Search all forms…"
            className="w-full pl-7 pr-2 py-1.5 border rounded-lg text-[11px] focus:outline-none bg-white"
            style={{ borderColor: poolSearch ? GREEN : '#e5e7eb' }} />
        </div>
      </div>

      {/* My favourites (personal) — below the search bar (hidden while searching) */}
      {personalForms.length > 0 && !q && (
        <div className="flex-shrink-0 border-b" style={{ borderColor: '#f0f0f0' }}>
          <div className="px-3 pt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">My Favourites</span>
          </div>
          <div className="px-3 py-2 flex flex-col gap-1">
            {personalForms.map(f => (
              <div key={`fav-${f.id}`}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border bg-white hover:border-green-300 hover:bg-green-50 cursor-pointer transition-colors group"
                style={{ borderColor: '#f0f0f0' }}
                onClick={() => onOpenForm({ ...f, __db: true })}>
                <span className="text-[11px] text-gray-700 truncate">{ftitle(f)}</span>
                <button onClick={e => { e.stopPropagation(); toggleFav(f.id, 'personal') }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-yellow-500 hover:text-yellow-700"
                  title="Remove favourite">
                  <X size={9} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All forms / search results */}
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{q ? 'Results' : 'All Forms'}</span>
        {results.map((f, i) => {
          const isDb = !!f.__db
          const isFav = isDb && favPersonal.includes(f.id)
          const isOrg = isDb && favOrg.includes(f.id)
          return (
            <div key={isDb ? `db-${f.id}` : `rich-${f.name}-${i}`}
              className="flex items-center justify-between px-2.5 py-2 rounded-lg border bg-white hover:border-green-300 hover:bg-green-50 cursor-pointer transition-colors group"
              style={{ borderColor: '#f0f0f0' }}
              onClick={() => onOpenForm(f)}>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px] text-gray-700 group-hover:text-gray-900 truncate">{ftitle(f)}</span>
                {!isDb && f.key && <span className="text-[8px] text-green-500 flex-shrink-0" title="Rich clinical form">●</span>}
              </div>
              {isDb && (
                <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => { e.stopPropagation(); toggleFav(f.id, 'personal') }}
                    className={isFav ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-500'} title="Favourite (you)">
                    <Star size={11} fill={isFav ? 'currentColor' : 'none'} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); toggleFav(f.id, 'organization') }}
                    className={isOrg ? 'text-blue-500' : 'text-gray-300 hover:text-blue-500'} title="Pin for clinic">
                    <Pin size={11} fill={isOrg ? 'currentColor' : 'none'} />
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {results.length === 0 && (
          <p className="text-[10px] text-gray-400 text-center mt-4">No forms{q ? ` match “${poolSearch}”` : ''}.</p>
        )}
      </div>
    </div>
  )
}

// ── Main shell export ────────────────────────────────────────────────────────
export default function PatientChartShell({
  admission,
  vitals = [],
  patient = {},
  loading = false,
  patientAllergies,
  patientAllergiesCoded = [],
  navItems,
  activeNav,
  onNavChange,
  renderContent,
  onOpenForm,
  openFormModal,
  formsStorageKey,
  onBack,
  primaryDoctorName,
  onChangePrimaryDoctor,
  dashboardActions,
  renderHeaderRight,
  onEditVital,
  api,
}) {
  const [headerExpanded, setHeaderExpanded] = useState(false)
  const [formsOpen, setFormsOpen] = useState(() => {
    try { return localStorage.getItem(formsStorageKey || 'shared_forms_panel') !== 'false' } catch { return true }
  })

  const adm = admission || {}
  const pat = patient || {}

  const admittedAt = adm.admitted_at || adm.admission_date || adm.created_at
  const los = admittedAt
    ? Math.floor((Date.now() - new Date(admittedAt).getTime()) / 86400000) + 1
    : null

  const toggleForms = () => {
    const v = !formsOpen
    setFormsOpen(v)
    try { localStorage.setItem(formsStorageKey || 'shared_forms_panel', String(v)) } catch {}
  }

  // Patient name: Provider stores on patient object; CareChart on admission
  const patientName = pat.full_name || adm.patient_name || '—'
  const age         = pat.age  || adm.age
  const gender      = pat.gender || adm.gender
  const mrn         = pat.clinic_patient_id || adm.mrn || adm.patient_mrn || adm.uhid || '—'
  const bloodGroup  = pat.blood_group || adm.blood_group

  // Allergy display: prefer patientAllergies prop (CareChart fetches coded), fallback to pat/adm
  const allergyStr  = patientAllergies || pat.allergies || adm.allergies || null

  // Row 3 demographics — fallback pat || adm
  const demoFields = [
    ['Address',        pat.address         || adm.address         || '—'],
    ['Phone',          pat.phone           || pat.contact_number  || adm.contact_number || '—'],
    ['Emergency',      pat.emergency_contact || adm.emergency_contact || '—'],
    ['Height',         adm.height ? adm.height + ' cm' : (pat.height ? pat.height + ' cm' : '—')],
    ['Weight',         adm.weight ? adm.weight + ' kg' : (pat.weight ? pat.weight + ' kg' : '—')],
    ['Insurance',      adm.insurance_name  || adm.insurance_provider || 'Self-pay'],
    ['Admission Type', (adm.admission_type || '—').toString().replace(/_/g, ' ')],
    ['Blood Group',    bloodGroup          || '—'],
  ]

  return (
    <div className="flex flex-col h-full" style={{ background: '#f4f5f7' }}>
      {openFormModal}

      {/* ── Sticky patient header ── */}
      <div className="bg-white border-b flex-shrink-0 shadow-sm" style={{ borderColor: '#e9eaec' }}>
        <div className="px-5 py-2.5">

          {/* Row 1 */}
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={onBack}
              className="flex items-center gap-1 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
              <ArrowLeft size={14} />
              <span className="text-xs">Back</span>
            </button>
            <div className="w-px h-4 bg-gray-200 flex-shrink-0" />

            {loading ? (
              <Loader2 size={16} className="animate-spin text-gray-300" />
            ) : (
              <>
                <span className="text-base font-extrabold text-gray-900">{patientName}</span>
                {age && gender && (
                  <span className="text-sm text-gray-500">{age} yrs, {gender}</span>
                )}
                <span className="text-[11px] font-mono text-gray-400">MRN: {mrn}</span>
                {adm.bed_number && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                    style={{ background: '#f0fdf4', color: GREEN, border: '1px solid #d1fae5' }}>
                    {adm.bed_number}
                  </span>
                )}
                <span className="text-xs text-gray-500">{adm.department_name || '—'}</span>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs text-gray-600 font-medium">
                  {primaryDoctorName || adm.primary_doctor_name || adm.doctor_name || '—'}
                </span>

                <div className="flex-1" />

                {renderHeaderRight}

                <button onClick={() => setHeaderExpanded(e => !e)}
                  className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 ml-1 flex-shrink-0">
                  {headerExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </>
            )}
          </div>

          {/* Row 2 */}
          {!loading && (
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-[10px] text-gray-500">
                <span className="font-semibold text-gray-700">Dx:</span> {adm.primary_diagnosis || '—'}
              </span>
              <span className="text-gray-300 text-xs">·</span>
              <span className="text-[10px] text-gray-500">
                Admitted {admittedAt
                  ? new Date(admittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}
              </span>
              {los && (
                <>
                  <span className="text-gray-300 text-xs">·</span>
                  <span className="text-[10px] font-semibold" style={{ color: NAVY }}>Day {los}</span>
                </>
              )}
              {adm.expected_discharge && (
                <>
                  <span className="text-gray-300 text-xs">·</span>
                  <span className="text-[10px] text-gray-500">
                    Est. discharge {new Date(adm.expected_discharge).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </>
              )}
              <div className="ml-auto flex items-center gap-2 flex-shrink-0 flex-wrap">
                {adm.acuity_level && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full border"
                    style={{
                      background:  adm.acuity_level === 'high' ? '#fef2f2' : adm.acuity_level === 'medium' ? '#fffbeb' : '#f0fdf4',
                      color:       adm.acuity_level === 'high' ? '#b91c1c' : adm.acuity_level === 'medium' ? '#d97706' : '#065f46',
                      borderColor: adm.acuity_level === 'high' ? '#fecaca' : adm.acuity_level === 'medium' ? '#fde68a' : '#d1fae5',
                    }}>
                    {adm.acuity_level === 'high' ? '🔴 HIGH' : adm.acuity_level === 'medium' ? '🟡 MED' : '🟢 LOW'}
                  </span>
                )}
                {bloodGroup && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                    style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe' }}>
                    🩸 {bloodGroup}
                  </span>
                )}
                {allergyStr ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-default"
                    style={{ background: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' }}
                    title={allergyStr}>
                    ⚠ {patientAllergiesCoded.length > 0
                      ? (patientAllergiesCoded[0]?.name || patientAllergiesCoded[0]?.allergen || allergyStr)
                      : allergyStr}
                    {patientAllergiesCoded.length > 1 && ` +${patientAllergiesCoded.length - 1} more`}
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
                    style={{ background: '#f0fdf4', color: '#065f46', borderColor: '#d1fae5' }}>
                    ✓ No Allergies
                  </span>
                )}
                {onChangePrimaryDoctor && (
                  <button onClick={onChangePrimaryDoctor}
                    className="text-[10px] text-blue-500 hover:text-blue-700 underline flex-shrink-0">
                    {(primaryDoctorName || adm?.primary_doctor_name) ? 'Change Dr' : 'Assign Dr'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Row 3 — collapsible demographics */}
          {headerExpanded && !loading && (
            <div className="mt-2 pt-2 border-t grid grid-cols-4 gap-4" style={{ borderColor: '#f0f0f0' }}>
              {demoFields.map(([k, v]) => (
                <div key={k}>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{k}</span>
                  <p className="text-[11px] font-semibold text-gray-700 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Body: sidebar + content + toggle strip + assessment panel ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar (172px) */}
        <div className="flex-shrink-0 overflow-y-auto border-r"
          style={{ width: 172, background: '#ffffff', borderColor: '#e9eaec' }}>
          <div className="px-3 pt-3 pb-1">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Patient View</span>
          </div>
          <nav className="px-2 pb-4 flex flex-col gap-0.5">
            {navItems.map(item => {
              const active = activeNav === item.key
              return (
                <button key={item.key} onClick={() => onNavChange(item.key)}
                  className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition-all"
                  style={active
                    ? { background: '#f0fdf4', color: GREEN, borderLeft: `2px solid ${GREEN}` }
                    : { color: '#6b7280', borderLeft: '2px solid transparent' }
                  }>
                  <item.icon size={13} style={{ color: active ? GREEN : '#9ca3af', flexShrink: 0 }} />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeNav === 'dashboard' ? (
            <DashboardContent
              adm={adm}
              patient={pat}
              vitals={vitals}
              loading={loading}
              dashboardActions={dashboardActions}
              onEditVital={onEditVital}
            />
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="p-5">{renderContent(activeNav)}</div>
            </div>
          )}
        </div>

        {/* Toggle strip (28px) */}
        <button
          onClick={toggleForms}
          className="flex-shrink-0 flex flex-col items-center justify-center border-l gap-1"
          style={{ width: 28, background: '#f9fafb', borderColor: '#e9eaec' }}
          title={formsOpen ? 'Hide forms' : 'Show forms'}
        >
          <span style={{ fontSize: 10, color: '#9ca3af', writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: 1 }}>
            {formsOpen ? 'HIDE' : 'FORMS'}
          </span>
          <Menu size={13} className="text-gray-400" />
        </button>

        {/* Assessment panel (272px) */}
        {formsOpen && (
          <div className="flex-shrink-0 border-l overflow-hidden flex flex-col"
            style={{ width: 272, borderColor: '#e9eaec' }}>
            <AssessmentPanel onOpenForm={onOpenForm} api={api} />
          </div>
        )}
      </div>
    </div>
  )
}
