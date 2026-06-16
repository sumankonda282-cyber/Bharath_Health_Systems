import { useState, useMemo } from 'react'
import { Loader2, CheckCircle, AlertCircle, ClipboardList, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import api from '../../../api/client'

// ── helpers ───────────────────────────────────────────────────────────────────

function calcAge(dob) {
  if (!dob) return null
  const d = new Date(dob), t = new Date()
  let a = t.getFullYear() - d.getFullYear()
  if (t.getMonth() - d.getMonth() < 0 || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) a--
  return a >= 0 ? a : null
}

const THIS_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 80 }, (_, i) => THIS_YEAR - i)
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── condition definitions ─────────────────────────────────────────────────────

const CONDITIONS = [
  { key: 'hypertension',   label: 'Hypertension',           extra: ['bp_control'] },
  { key: 'dm1',            label: 'Diabetes Mellitus Type 1', extra: ['hba1c','dm_complications'] },
  { key: 'dm2',            label: 'Diabetes Mellitus Type 2', extra: ['hba1c','dm_complications'] },
  { key: 'cad',            label: 'Coronary Artery Disease', extra: ['cad_events'] },
  { key: 'heart_failure',  label: 'Heart Failure',           extra: ['ef'] },
  { key: 'asthma',         label: 'Asthma',                  extra: ['asthma_severity'] },
  { key: 'copd',           label: 'COPD',                    extra: [] },
  { key: 'ckd',            label: 'Chronic Kidney Disease',  extra: ['ckd_stage','on_dialysis'] },
  { key: 'thyroid_hypo',   label: 'Hypothyroidism',          extra: [] },
  { key: 'thyroid_hyper',  label: 'Hyperthyroidism',         extra: [] },
  { key: 'epilepsy',       label: 'Epilepsy / Seizures',     extra: ['seizure_type'] },
  { key: 'stroke',         label: 'Stroke / TIA',            extra: [] },
  { key: 'cancer',         label: 'Cancer',                  extra: ['cancer_type','cancer_treatment'] },
  { key: 'hiv',            label: 'HIV',                     extra: ['on_art'] },
  { key: 'hep_b',          label: 'Hepatitis B',             extra: ['hep_treated'] },
  { key: 'hep_c',          label: 'Hepatitis C',             extra: ['hep_treated'] },
  { key: 'tb',             label: 'Tuberculosis',            extra: ['tb_completed'] },
  { key: 'rheumatoid',     label: 'Rheumatoid Arthritis',    extra: [] },
  { key: 'sle',            label: 'SLE / Lupus',             extra: [] },
  { key: 'psych',          label: 'Psychiatric Disorder',    extra: ['psych_type'] },
  { key: 'sickle_cell',    label: 'Sickle Cell Disease',     extra: [] },
  { key: 'other_cond',     label: 'Other',                   extra: ['other_cond_text'] },
]

const SURGERY_PRESETS = [
  'Appendectomy','Cholecystectomy','CABG','Angioplasty / Stenting',
  'Hysterectomy','Caesarean Section','Hernia Repair','Joint Replacement',
  'Cataract Surgery','Thyroidectomy','Tonsillectomy','Splenectomy',
  'Nephrectomy','Colostomy','Laparoscopy','Other',
]

const CANCER_TYPES     = ['Breast','Lung','Colorectal','Prostate','Cervical','Ovarian','Liver','Blood / Lymphoma','Thyroid','Skin','Other']
const CANCER_TREATMENT = ['Surgery','Chemotherapy','Radiation','Hormonal therapy','Immunotherapy','Combination']
const PSYCH_TYPES      = ['Depression','Anxiety / GAD','Bipolar Disorder','Schizophrenia','OCD','PTSD','Other']
const CKD_STAGES       = ['Stage 1','Stage 2','Stage 3a','Stage 3b','Stage 4','Stage 5 (ESRD)']
const SEIZURE_TYPES    = ['Focal','Generalised','Focal to bilateral','Unknown']
const DM_COMPLICATIONS = ['Nephropathy','Neuropathy','Retinopathy','Foot ulcer','None known']
const CONTRACEPTION    = ['None','OCP / Hormonal pills','IUCD / Copper T','Hormonal implant','Male condom','Female condom','Sterilisation (tubectomy)','Partner sterilised (vasectomy)','Other']
const GYN_CONDITIONS   = ['PCOD / PCOS','Uterine fibroids','Endometriosis','Ovarian cyst','Cervical erosion','Uterine prolapse','Other']

// ── small reusable UI ─────────────────────────────────────────────────────────

function Gate({ value, onChange, yesLabel = 'Yes', noLabel = 'No' }) {
  return (
    <div className="flex gap-2">
      {[yesLabel, noLabel].map(opt => (
        <button key={opt} type="button"
          onClick={() => onChange(value === opt ? null : opt)}
          className={`px-4 py-1.5 text-sm rounded-lg border font-semibold transition-colors
            ${value === opt
              ? opt === yesLabel ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-700 text-white border-gray-700'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
          {opt}
        </button>
      ))}
    </div>
  )
}

function YearSelect({ value, onChange, placeholder = 'Year' }) {
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value || '')}
      className="border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
      <option value="">{placeholder}</option>
      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
    </select>
  )
}

function Pill({ label, active, onClick, activeClass = 'bg-blue-600 text-white border-blue-600' }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-2.5 py-0.5 text-xs rounded-full border font-medium transition-colors
        ${active ? activeClass : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
      {label}
    </button>
  )
}

function Select({ value, onChange, options, placeholder = 'Select', className = '' }) {
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value || '')}
      className={`border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 ${className}`}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function MultiPill({ options, selected, onChange, activeClass }) {
  const toggle = (opt) => {
    const s = new Set(selected)
    s.has(opt) ? s.delete(opt) : s.add(opt)
    onChange([...s])
  }
  return (
    <div className="flex flex-wrap gap-1">
      {options.map(o => (
        <Pill key={o} label={o} active={selected.includes(o)} onClick={() => toggle(o)} activeClass={activeClass} />
      ))}
    </div>
  )
}

function SectionCard({ title, gate, setGate, children }) {
  return (
    <div className={`rounded-xl border transition-colors ${gate === 'Yes' ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        <Gate value={gate} onChange={setGate} />
      </div>
      {gate === 'Yes' && (
        <div className="border-t border-gray-200 px-4 py-3">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Condition detail sub-panel ────────────────────────────────────────────────

function ConditionDetail({ ckey, detail, onUpdate }) {
  const cond = CONDITIONS.find(c => c.key === ckey)
  const set = (field, val) => onUpdate({ ...detail, [field]: val })
  return (
    <div className="mt-2 pl-2 border-l-2 border-blue-300 space-y-1.5">
      <div className="flex flex-wrap gap-2 items-center">
        <YearSelect value={detail.year} onChange={v => set('year', v)} placeholder="Dx year" />
        <Select value={detail.status} onChange={v => set('status', v)}
          options={['Active','Resolved','In remission']} placeholder="Status" />
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span>On medication:</span>
          {['Yes','No'].map(o => (
            <Pill key={o} label={o} active={detail.on_medication === o} onClick={() => set('on_medication', o)}
              activeClass={o === 'Yes' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-gray-600 text-white border-gray-600'} />
          ))}
        </div>
      </div>

      {/* Condition-specific extras */}
      {cond?.extra?.includes('bp_control') && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>BP control:</span>
          <MultiPill options={['Good','Fair','Poor']} selected={detail.bp_control ? [detail.bp_control] : []}
            onChange={v => set('bp_control', v[v.length - 1] || '')} />
        </div>
      )}
      {cond?.extra?.includes('hba1c') && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Last HbA1c:</span>
          <input type="number" step="0.1" min={4} max={20} value={detail.hba1c || ''}
            onChange={e => set('hba1c', e.target.value)} placeholder="e.g. 7.2"
            className="w-20 border border-gray-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
          <span>%</span>
        </div>
      )}
      {cond?.extra?.includes('dm_complications') && (
        <div className="text-xs text-gray-500">
          <span className="mr-1">DM complications:</span>
          <MultiPill options={DM_COMPLICATIONS} selected={detail.dm_complications || []}
            onChange={v => set('dm_complications', v)} />
        </div>
      )}
      {cond?.extra?.includes('cad_events') && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Prior MI:</span>
          <MultiPill options={['Yes','No']} selected={detail.prior_mi ? [detail.prior_mi] : []}
            onChange={v => set('prior_mi', v[v.length - 1] || '')} />
          <span>Stent / CABG:</span>
          <MultiPill options={['Stent','CABG','Both','None']} selected={detail.cad_procedure ? [detail.cad_procedure] : []}
            onChange={v => set('cad_procedure', v[v.length - 1] || '')} />
        </div>
      )}
      {cond?.extra?.includes('ef') && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>EF %:</span>
          <input type="number" min={5} max={80} value={detail.ef || ''}
            onChange={e => set('ef', e.target.value)} placeholder="e.g. 40"
            className="w-16 border border-gray-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
        </div>
      )}
      {cond?.extra?.includes('asthma_severity') && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Severity:</span>
          <MultiPill options={['Mild','Moderate','Severe']} selected={detail.asthma_severity ? [detail.asthma_severity] : []}
            onChange={v => set('asthma_severity', v[v.length - 1] || '')} />
        </div>
      )}
      {cond?.extra?.includes('ckd_stage') && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Stage:</span>
          <Select value={detail.ckd_stage} onChange={v => set('ckd_stage', v)} options={CKD_STAGES} placeholder="Stage" />
        </div>
      )}
      {cond?.extra?.includes('on_dialysis') && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>On dialysis:</span>
          <MultiPill options={['Yes','No']} selected={detail.on_dialysis ? [detail.on_dialysis] : []}
            onChange={v => set('on_dialysis', v[v.length - 1] || '')} />
        </div>
      )}
      {cond?.extra?.includes('seizure_type') && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Type:</span>
          <Select value={detail.seizure_type} onChange={v => set('seizure_type', v)} options={SEIZURE_TYPES} placeholder="Type" />
        </div>
      )}
      {cond?.extra?.includes('cancer_type') && (
        <div className="flex flex-wrap gap-2 items-center text-xs text-gray-500">
          <span>Type:</span>
          <Select value={detail.cancer_type} onChange={v => set('cancer_type', v)} options={CANCER_TYPES} placeholder="Type" />
          <span>Treatment:</span>
          <MultiPill options={CANCER_TREATMENT} selected={detail.cancer_treatment || []}
            onChange={v => set('cancer_treatment', v)} />
        </div>
      )}
      {cond?.extra?.includes('on_art') && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>On ART:</span>
          <MultiPill options={['Yes','No']} selected={detail.on_art ? [detail.on_art] : []}
            onChange={v => set('on_art', v[v.length - 1] || '')} />
        </div>
      )}
      {cond?.extra?.includes('hep_treated') && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Treated / cured:</span>
          <MultiPill options={['Yes','No','Ongoing']} selected={detail.hep_treated ? [detail.hep_treated] : []}
            onChange={v => set('hep_treated', v[v.length - 1] || '')} />
        </div>
      )}
      {cond?.extra?.includes('tb_completed') && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Treatment completed:</span>
          <MultiPill options={['Yes','No','Ongoing']} selected={detail.tb_completed ? [detail.tb_completed] : []}
            onChange={v => set('tb_completed', v[v.length - 1] || '')} />
        </div>
      )}
      {cond?.extra?.includes('psych_type') && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Type:</span>
          <Select value={detail.psych_type} onChange={v => set('psych_type', v)} options={PSYCH_TYPES} placeholder="Type" />
        </div>
      )}
      {cond?.extra?.includes('other_cond_text') && (
        <input type="text" value={detail.other_cond_text || ''}
          onChange={e => set('other_cond_text', e.target.value)} placeholder="Specify condition..."
          className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400" />
      )}
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────────────────────

const newSurgery = () => ({ id: Date.now() + Math.random(), procedure: '', procedure_other: '', month: '', year: '', hospital: '', complications: '' })
const newHosp    = () => ({ id: Date.now() + Math.random(), reason: '', year: '', duration: '', icu: '', hospital: '' })

export default function MedicalHistoryForm({ admission, onClose, onSaved }) {
  const gender = admission?.patient?.gender || admission?.patient?.sex || ''
  const age    = calcAge(admission?.patient?.date_of_birth)
  const showOb = gender.toLowerCase().startsWith('f') && (age === null || age >= 10)

  const [hasHistory,         setHasHistory]         = useState(null)
  const [hasConditions,      setHasConditions]      = useState(null)
  const [hasSurgeries,       setHasSurgeries]       = useState(null)
  const [hasHospitalizations,setHasHospitalizations]= useState(null)
  const [hasObGyn,           setHasObGyn]           = useState(null)

  // Conditions
  const [selectedConds, setSelectedConds]   = useState([])  // array of keys
  const [condDetails,   setCondDetails]     = useState({})  // key → detail obj

  // Surgeries
  const [surgeries, setSurgeries] = useState([newSurgery()])

  // Hospitalizations
  const [hosps, setHosps] = useState([newHosp()])

  // OB/GYN
  const [ob, setOb] = useState({
    menarche_age: '', cycle: null, cycle_length: '', flow_days: '',
    dysmenorrhea: null, lmp: '', menopause: null, menopause_age: '',
    last_pap: '', gravida: '', para: '', live: '', abortus: '',
    delivery_mode: null, ob_complications: null, ob_complications_text: '',
    currently_pregnant: null, gestational_age: '',
    contraception: '', gyn_conditions: [],
  })

  const [notes, setNotes]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)
  const [done, setDone]     = useState(false)
  const setOb_ = (field, val) => setOb(p => ({ ...p, [field]: val }))

  const toggleCond = (key) => {
    setSelectedConds(prev => {
      if (prev.includes(key)) {
        const next = prev.filter(k => k !== key)
        setCondDetails(d => { const n = { ...d }; delete n[key]; return n })
        return next
      }
      setCondDetails(d => ({ ...d, [key]: { year: '', status: '', on_medication: '' } }))
      return [...prev, key]
    })
  }

  const updateCondDetail = (key, detail) => setCondDetails(d => ({ ...d, [key]: detail }))

  const addSurgery  = () => setSurgeries(p => [...p, newSurgery()])
  const rmSurgery   = (id) => setSurgeries(p => p.filter(s => s.id !== id))
  const updSurgery  = (id, f, v) => setSurgeries(p => p.map(s => s.id === id ? { ...s, [f]: v } : s))

  const addHosp  = () => setHosps(p => [...p, newHosp()])
  const rmHosp   = (id) => setHosps(p => p.filter(h => h.id !== id))
  const updHosp  = (id, f, v) => setHosps(p => p.map(h => h.id === id ? { ...h, [f]: v } : h))

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      const payload = {
        type: 'medical_history',
        no_history: hasHistory === 'No',
        conditions: selectedConds.map(k => ({ key: k, ...condDetails[k] })),
        surgeries: hasSurgeries === 'Yes' ? surgeries.map(({ id, ...r }) => r) : [],
        hospitalizations: hasHospitalizations === 'Yes' ? hosps.map(({ id, ...r }) => r) : [],
        ob_gyn: showOb && hasObGyn === 'Yes' ? ob : null,
        notes,
      }
      await api.post(
        `/inpatient/admissions/${admission.id}/notes`,
        { note_type: 'assessment', note_text: JSON.stringify(payload) }
      )
      setDone(true)
      setTimeout(() => { onSaved?.() }, 1200)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Save failed')
    } finally { setSaving(false) }
  }

  if (done) return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 py-12">
      <CheckCircle size={40} className="text-emerald-500" />
      <p className="font-semibold text-gray-700">Medical History saved</p>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Badge */}
      <div className="shrink-0 px-6 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100">
        <span className="inline-flex items-center gap-1.5 bg-teal-100 text-teal-700 text-xs font-bold px-2.5 py-1 rounded-full">
          <ClipboardList size={12} /> [A] Medical History
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

        {/* ── GATE ── */}
        <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
          <span className="text-sm font-semibold text-gray-700">Any significant past medical / surgical history?</span>
          <Gate value={hasHistory} onChange={setHasHistory} />
        </div>

        {hasHistory === 'No' && (
          <div className="text-center py-4 text-sm text-gray-400 italic">No significant history — ready to save.</div>
        )}

        {hasHistory === 'Yes' && (
          <div className="space-y-3">

            {/* ── CHRONIC CONDITIONS ── */}
            <SectionCard title="Chronic / Past Medical Conditions" gate={hasConditions} setGate={setHasConditions}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 mb-3">
                {CONDITIONS.map(({ key, label }) => (
                  <button key={key} type="button" onClick={() => toggleCond(key)}
                    className={`text-left px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors
                      ${selectedConds.includes(key)
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {selectedConds.map(key => (
                <div key={key} className="mb-3">
                  <p className="text-xs font-semibold text-teal-700 mb-1">
                    {CONDITIONS.find(c => c.key === key)?.label}
                  </p>
                  <ConditionDetail ckey={key} detail={condDetails[key] || {}} onUpdate={d => updateCondDetail(key, d)} />
                </div>
              ))}
            </SectionCard>

            {/* ── SURGERIES ── */}
            <SectionCard title="Past Surgeries / Procedures" gate={hasSurgeries} setGate={setHasSurgeries}>
              <div className="space-y-3">
                {surgeries.map((s, i) => (
                  <div key={s.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <select value={s.procedure} onChange={e => updSurgery(s.id, 'procedure', e.target.value)}
                        className="flex-1 min-w-[140px] border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-400">
                        <option value="">— Select procedure —</option>
                        {SURGERY_PRESETS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <select value={s.month} onChange={e => updSurgery(s.id, 'month', e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-teal-400">
                        <option value="">Month</option>
                        {MONTHS.map((m, mi) => <option key={m} value={mi + 1}>{m}</option>)}
                      </select>
                      <YearSelect value={s.year} onChange={v => updSurgery(s.id, 'year', v)} />
                      {surgeries.length > 1 && (
                        <button type="button" onClick={() => rmSurgery(s.id)} className="text-gray-300 hover:text-red-500"><X size={14} /></button>
                      )}
                    </div>
                    {s.procedure === 'Other' && (
                      <input type="text" value={s.procedure_other}
                        onChange={e => updSurgery(s.id, 'procedure_other', e.target.value)}
                        placeholder="Specify procedure..."
                        className="w-full border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400" />
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      <span>Hospital (optional):</span>
                      <input type="text" value={s.hospital}
                        onChange={e => updSurgery(s.id, 'hospital', e.target.value)}
                        placeholder="Hospital name"
                        className="flex-1 min-w-[120px] border border-gray-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400" />
                      <span>Complications:</span>
                      {['Yes','No'].map(o => (
                        <Pill key={o} label={o} active={s.complications === o}
                          onClick={() => updSurgery(s.id, 'complications', o)}
                          activeClass={o === 'Yes' ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-600 text-white border-gray-600'} />
                      ))}
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addSurgery}
                  className="inline-flex items-center gap-1 text-xs text-teal-600 border border-teal-200 rounded-lg px-3 py-1 hover:bg-teal-50">
                  <Plus size={11} /> Add Surgery
                </button>
              </div>
            </SectionCard>

            {/* ── HOSPITALIZATIONS ── */}
            <SectionCard title="Past Hospitalizations" gate={hasHospitalizations} setGate={setHasHospitalizations}>
              <div className="space-y-3">
                {hosps.map((h) => (
                  <div key={h.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input type="text" value={h.reason}
                        onChange={e => updHosp(h.id, 'reason', e.target.value)}
                        placeholder="Reason / Diagnosis"
                        className="flex-1 min-w-[140px] border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400" />
                      <YearSelect value={h.year} onChange={v => updHosp(h.id, 'year', v)} />
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <input type="number" min={1} max={365} value={h.duration}
                          onChange={e => updHosp(h.id, 'duration', e.target.value)}
                          placeholder="Days"
                          className="w-14 border border-gray-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400" />
                        <span>days</span>
                      </div>
                      {hosps.length > 1 && (
                        <button type="button" onClick={() => rmHosp(h.id)} className="text-gray-300 hover:text-red-500"><X size={14} /></button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      <span>ICU admission:</span>
                      {['Yes','No'].map(o => (
                        <Pill key={o} label={o} active={h.icu === o}
                          onClick={() => updHosp(h.id, 'icu', o)}
                          activeClass={o === 'Yes' ? 'bg-red-500 text-white border-red-500' : 'bg-gray-600 text-white border-gray-600'} />
                      ))}
                      <span>Hospital (optional):</span>
                      <input type="text" value={h.hospital}
                        onChange={e => updHosp(h.id, 'hospital', e.target.value)}
                        placeholder="Hospital name"
                        className="flex-1 min-w-[100px] border border-gray-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400" />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addHosp}
                  className="inline-flex items-center gap-1 text-xs text-teal-600 border border-teal-200 rounded-lg px-3 py-1 hover:bg-teal-50">
                  <Plus size={11} /> Add Hospitalization
                </button>
              </div>
            </SectionCard>

            {/* ── OB/GYN ── */}
            {showOb && (
              <SectionCard title="Obstetric & Gynaecological History" gate={hasObGyn} setGate={setHasObGyn}>
                <div className="space-y-3">

                  {/* Menstrual */}
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Menstrual History</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <span className="w-28 shrink-0">Menarche age</span>
                      <input type="number" min={8} max={20} value={ob.menarche_age}
                        onChange={e => setOb_('menarche_age', e.target.value)}
                        placeholder="yrs"
                        className="w-14 border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-400" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-28 shrink-0">Cycle</span>
                      <div className="flex gap-1">
                        {['Regular','Irregular'].map(o => (
                          <Pill key={o} label={o} active={ob.cycle === o} onClick={() => setOb_('cycle', o)} />
                        ))}
                      </div>
                    </div>
                    {ob.cycle === 'Regular' && (
                      <div className="flex items-center gap-2">
                        <span className="w-28 shrink-0">Cycle length</span>
                        <input type="number" min={21} max={45} value={ob.cycle_length}
                          onChange={e => setOb_('cycle_length', e.target.value)}
                          placeholder="days"
                          className="w-14 border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-400" />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="w-28 shrink-0">Flow duration</span>
                      <input type="number" min={1} max={14} value={ob.flow_days}
                        onChange={e => setOb_('flow_days', e.target.value)}
                        placeholder="days"
                        className="w-14 border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-400" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-28 shrink-0">Dysmenorrhea</span>
                      <div className="flex gap-1">
                        {['None','Mild','Severe'].map(o => (
                          <Pill key={o} label={o} active={ob.dysmenorrhea === o} onClick={() => setOb_('dysmenorrhea', o)} />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-28 shrink-0">LMP</span>
                      <input type="date" value={ob.lmp} onChange={e => setOb_('lmp', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-28 shrink-0">Menopause</span>
                      <div className="flex gap-1">
                        {['Yes','No'].map(o => (
                          <Pill key={o} label={o} active={ob.menopause === o} onClick={() => setOb_('menopause', o)} />
                        ))}
                      </div>
                      {ob.menopause === 'Yes' && (
                        <input type="number" min={30} max={65} value={ob.menopause_age}
                          onChange={e => setOb_('menopause_age', e.target.value)}
                          placeholder="age"
                          className="w-12 border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-28 shrink-0">Last Pap smear</span>
                      <input type="date" value={ob.last_pap} onChange={e => setOb_('last_pap', e.target.value)}
                        className="border border-gray-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-teal-400" />
                    </div>
                  </div>

                  {/* Obstetric */}
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider pt-2">Obstetric History (G/P/L/A)</p>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                    {[['gravida','G'],['para','P'],['live','L'],['abortus','A']].map(([field, lbl]) => (
                      <div key={field} className="flex items-center gap-1">
                        <span className="font-semibold">{lbl}</span>
                        <input type="number" min={0} max={20} value={ob[field]}
                          onChange={e => setOb_(field, e.target.value)}
                          className="w-12 border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-400" />
                      </div>
                    ))}
                  </div>

                  {parseInt(ob.para) > 0 && (
                    <div className="space-y-2 text-xs text-gray-600">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>Mode of delivery:</span>
                        {['Normal / SVD','C-Section','Forceps / Vacuum','Mixed'].map(o => (
                          <Pill key={o} label={o} active={ob.delivery_mode === o} onClick={() => setOb_('delivery_mode', o)} />
                        ))}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>Obstetric complications:</span>
                        {['Yes','No'].map(o => (
                          <Pill key={o} label={o} active={ob.ob_complications === o} onClick={() => setOb_('ob_complications', o)}
                            activeClass={o === 'Yes' ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-600 text-white border-gray-600'} />
                        ))}
                        {ob.ob_complications === 'Yes' && (
                          <input type="text" value={ob.ob_complications_text}
                            onChange={e => setOb_('ob_complications_text', e.target.value)}
                            placeholder="Specify..."
                            className="flex-1 min-w-[120px] border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-400" />
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                    <span>Currently pregnant:</span>
                    {['Yes','No'].map(o => (
                      <Pill key={o} label={o} active={ob.currently_pregnant === o} onClick={() => setOb_('currently_pregnant', o)}
                        activeClass={o === 'Yes' ? 'bg-pink-500 text-white border-pink-500' : 'bg-gray-600 text-white border-gray-600'} />
                    ))}
                    {ob.currently_pregnant === 'Yes' && (
                      <div className="flex items-center gap-1">
                        <input type="number" min={1} max={42} value={ob.gestational_age}
                          onChange={e => setOb_('gestational_age', e.target.value)}
                          placeholder="wks"
                          className="w-14 border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-400" />
                        <span>weeks</span>
                      </div>
                    )}
                  </div>

                  {/* Gynaecological */}
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider pt-2">Gynaecological</p>
                  <div className="space-y-2 text-xs text-gray-600">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-28 shrink-0">Contraception</span>
                      <Select value={ob.contraception} onChange={v => setOb_('contraception', v)}
                        options={CONTRACEPTION} placeholder="Select" className="flex-1" />
                    </div>
                    <div>
                      <span className="mr-2">Gynaecological conditions:</span>
                      <MultiPill options={GYN_CONDITIONS} selected={ob.gyn_conditions}
                        onChange={v => setOb_('gyn_conditions', v)} />
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}
          </div>
        )}

        {/* Notes */}
        <div>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Additional notes..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" />
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-between gap-3">
        {error ? (
          <div className="flex items-center gap-1.5 text-red-600 text-sm">
            <AlertCircle size={14} /> {error}
          </div>
        ) : <div />}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || hasHistory === null}
            className="px-5 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
