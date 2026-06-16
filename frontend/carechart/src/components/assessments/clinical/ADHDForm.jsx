/**
 * @shared-pool — standalone clinical assessment, portal-agnostic
 * ADHD Assessment — DSM-5 criteria, validated tools, functional impairment,
 * comorbidities, treatment plan, education & follow-up.
 */
import { useState, useMemo } from 'react'
import { Brain, Plus, X, AlertTriangle } from 'lucide-react'
import MedicalTextArea from '../../MedicalTextArea'
import api from '../../../api/client'

// ── DSM-5 criteria ────────────────────────────────────────────────────────────

const INATTENTION = [
  'Fails to give close attention to details / makes careless mistakes',
  'Difficulty sustaining attention in tasks or play',
  'Does not seem to listen when spoken to directly',
  'Does not follow through on instructions; fails to finish tasks',
  'Difficulty organising tasks and activities',
  'Avoids or is reluctant to engage in tasks requiring sustained mental effort',
  'Often loses things necessary for tasks',
  'Easily distracted by extraneous stimuli',
  'Forgetful in daily activities',
]

const HYPERACTIVITY = [
  'Fidgets with hands/feet or squirms in seat',
  'Leaves seat when remaining seated is expected',
  'Runs about or climbs inappropriately (adults: feeling restless)',
  'Unable to play or engage in leisure activities quietly',
  '"On the go" — acts as if driven by a motor',
  'Talks excessively',
  'Blurts out answers before question is completed',
  'Difficulty waiting their turn',
  'Interrupts or intrudes on others',
]

const SUBTYPES = ['Combined', 'Predominantly Inattentive', 'Predominantly Hyperactive-Impulsive']

const TOOLS = [
  { key: 'conners',    label: 'Conners Rating Scale' },
  { key: 'vanderbilt', label: 'Vanderbilt' },
  { key: 'adhd_rs5',   label: 'ADHD-RS-5' },
  { key: 'snap_iv',    label: 'SNAP-IV' },
  { key: 'diva',       label: 'DIVA (Adult)' },
  { key: 'caars',      label: 'CAARS (Adult)' },
  { key: 'ksads',      label: 'K-SADS (Child)' },
  { key: 'other',      label: 'Other' },
]

const DOMAINS = [
  'Academic / School', 'Work / Occupational', 'Family Relationships',
  'Peer / Social', 'Self-care', 'Driving', 'Safety',
]
const SEVERITY = ['Mild', 'Moderate', 'Severe']

const COMORBIDITIES = [
  'Anxiety Disorder', 'Depression', 'ODD (Oppositional Defiant)',
  'Conduct Disorder', 'Learning Disability', 'ASD', 'Sleep Disorder',
  'Tic Disorder', 'Substance Use', 'Bipolar Disorder', 'PTSD', 'Dyslexia',
]

const ACCOMMODATIONS = ['IEP (Individualised Education Plan)', '504 Plan', 'Workplace Adjustments', 'None']

const EDU_TOPICS = [
  'Nature of ADHD', 'Medication use & side effects', 'Behavioural strategies',
  'School / workplace rights', 'Family support', 'Lifestyle modifications',
  'Digital / screen management', 'Follow-up importance',
]

const STIMULANTS    = ['Methylphenidate', 'Amphetamine / Dexamphetamine', 'Lisdexamfetamine', 'Dexmethylphenidate']
const NONSTIMULANTS = ['Atomoxetine', 'Guanfacine', 'Clonidine', 'Bupropion', 'Modafinil']
const MED_RESPONSES = ['Excellent', 'Good', 'Partial', 'Poor', 'Unknown / New']
const MED_EFFECTS   = ['None noted', 'Insomnia', 'Appetite loss', 'Headache', 'Irritability', 'Cardiac', 'Other']

function newMed() {
  return { id: Date.now(), drug: '', dose: '', frequency: '', duration: '', response: '', side_effects: [] }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Pills({ opts, value, onToggle, activeClass = 'bg-indigo-600 text-white border-indigo-600' }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opts.map(o => (
        <button key={o} type="button" onClick={() => onToggle(o)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            value === o ? activeClass : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
          }`}>{o}</button>
      ))}
    </div>
  )
}

function MultiPills({ opts, values, onToggle, activeClass = 'bg-indigo-600 text-white border-indigo-600' }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opts.map(o => {
        const label = typeof o === 'object' ? o.label : o
        const key   = typeof o === 'object' ? o.key   : o
        const active = values.includes(key)
        return (
          <button key={key} type="button" onClick={() => onToggle(key)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              active ? activeClass : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
            }`}>{label}</button>
        )
      })}
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-indigo-50 border-b border-gray-200">
        <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="px-4 py-4 space-y-4">{children}</div>
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────────────────────

export default function ADHDForm({ admission, onClose, onSaved }) {
  // Derive patient age
  const patientAge = useMemo(() => {
    const dob = admission?.patient?.date_of_birth
    if (!dob) return null
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))
  }, [admission])

  // DSM-5 threshold: <17 needs 6+, ≥17 needs 5+
  const dsm5Threshold = patientAge !== null && patientAge >= 17 ? 5 : 6

  // ── State ──
  const [diagType,    setDiagType]    = useState('')        // 'new' | 'existing'
  const [inatt,       setInatt]       = useState([])        // checked inattention indices
  const [hyper,       setHyper]       = useState([])        // checked hyperactivity indices
  const [subtype,     setSubtype]     = useState('')
  const [onsetAge,    setOnsetAge]    = useState('')
  const [before12,    setBefore12]    = useState('')
  const [multiSet,    setMultiSet]    = useState('')

  const [tools,       setTools]       = useState([])
  const [toolScores,  setToolScores]  = useState({})

  const [impaired,    setImpaired]    = useState('')
  const [domains,     setDomains]     = useState({})        // { domain: severity }

  const [comorbids,   setComorbids]   = useState([])

  const [behavTx,     setBehavTx]     = useState('')
  const [meds,        setMeds]        = useState([newMed()])
  const [onMeds,      setOnMeds]      = useState('')        // 'yes' | 'no'
  const [accommod,    setAccommod]    = useState([])

  const [eduTopics,   setEduTopics]   = useState([])
  const [targetSx,    setTargetSx]    = useState('')
  const [sideEffAss,  setSideEffAss]  = useState('')
  const [followUp,    setFollowUp]    = useState('')

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  // ── Derived ──
  const inattMet  = inatt.length  >= dsm5Threshold
  const hyperMet  = hyper.length  >= dsm5Threshold
  const criteriaMet = inattMet || hyperMet

  const toggleArr  = (set, val) => set(p => p.includes(val) ? p.filter(x => x !== val) : [...p, val])
  const toggleIdx  = (set, i)   => set(p => p.includes(i)  ? p.filter(x => x !== i)  : [...p, i])
  const setDomain  = (d, sev)   => setDomains(p => ({ ...p, [d]: p[d] === sev ? '' : sev }))
  const setMedFld  = (id, f, v) => setMeds(p => p.map(m => m.id === id ? { ...m, [f]: v } : m))
  const toggleMedEff = (id, e)  => setMedFld(id, 'side_effects',
    meds.find(m => m.id === id)?.side_effects.includes(e)
      ? meds.find(m => m.id === id).side_effects.filter(x => x !== e)
      : [...(meds.find(m => m.id === id)?.side_effects || []), e])

  const handleSave = async () => {
    setSaving(true); setError('')
    const payload = {
      type: 'adhd',
      diagnosis_type: diagType,
      dsm5: {
        inattention_checked: inatt,
        inattention_count: inatt.length,
        hyperactivity_checked: hyper,
        hyperactivity_count: hyper.length,
        threshold: dsm5Threshold,
        criteria_met: criteriaMet,
        subtype,
        onset_age: onsetAge,
        before_age_12: before12,
        multiple_settings: multiSet,
      },
      validated_tools: tools.map(t => ({ tool: t, score: toolScores[t] || '' })),
      functional_impairment: { impaired, domains },
      comorbidities: comorbids,
      treatment: {
        behavioural_therapy: behavTx,
        on_medications: onMeds,
        medications: onMeds === 'yes' ? meds.map(({ id, ...r }) => r) : [],
        accommodations: accommod,
        side_effects_assessed: sideEffAss,
      },
      education: { topics: eduTopics },
      follow_up: { target_symptoms: targetSx, date: followUp },
    }
    try {
      await api.post(`/inpatient/admissions/${admission.id}/notes`, {
        note_type: 'assessment',
        note_text: JSON.stringify(payload),
      })
      onSaved?.()
    } catch (e) {
      setError(e?.message || 'Save failed')
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

        {/* Badge */}
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-indigo-100 rounded-lg">
            <Brain size={16} className="text-indigo-600" />
          </div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">[A] ADHD Assessment</span>
          {patientAge !== null && (
            <span className="ml-auto text-xs text-gray-400">Age: {patientAge} yrs · DSM-5 threshold: ≥{dsm5Threshold} criteria</span>
          )}
        </div>

        {/* ── Section 1: Diagnosis ── */}
        <SectionCard title="1 · Diagnosis">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Encounter type</p>
            <div className="flex gap-2">
              {['new', 'existing'].map(t => (
                <button key={t} type="button" onClick={() => setDiagType(v => v === t ? '' : t)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    diagType === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}>{t === 'new' ? 'New Diagnosis' : 'Existing / Follow-up'}</button>
              ))}
            </div>
          </div>

          {/* DSM-5 Inattention */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-600">
                A1 · Inattention <span className="text-gray-400">({inatt.length}/{dsm5Threshold} needed)</span>
              </p>
              {inatt.length >= dsm5Threshold
                ? <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Met ✓</span>
                : <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Not met</span>
              }
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {INATTENTION.map((c, i) => (
                <label key={i} className="flex items-start gap-2 cursor-pointer group">
                  <input type="checkbox" checked={inatt.includes(i)} onChange={() => toggleIdx(setInatt, i)}
                    className="mt-0.5 accent-indigo-600 shrink-0" />
                  <span className={`text-xs leading-snug ${inatt.includes(i) ? 'text-indigo-700 font-medium' : 'text-gray-600'}`}>{c}</span>
                </label>
              ))}
            </div>
          </div>

          {/* DSM-5 Hyperactivity */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-600">
                A2 · Hyperactivity / Impulsivity <span className="text-gray-400">({hyper.length}/{dsm5Threshold} needed)</span>
              </p>
              {hyper.length >= dsm5Threshold
                ? <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Met ✓</span>
                : <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Not met</span>
              }
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {HYPERACTIVITY.map((c, i) => (
                <label key={i} className="flex items-start gap-2 cursor-pointer group">
                  <input type="checkbox" checked={hyper.includes(i)} onChange={() => toggleIdx(setHyper, i)}
                    className="mt-0.5 accent-indigo-600 shrink-0" />
                  <span className={`text-xs leading-snug ${hyper.includes(i) ? 'text-indigo-700 font-medium' : 'text-gray-600'}`}>{c}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Overall criteria badge */}
          {(inatt.length > 0 || hyper.length > 0) && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border ${
              criteriaMet ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
            }`}>
              {criteriaMet ? '✓ DSM-5 symptom criteria met' : '⚠ DSM-5 symptom criteria not yet met'}
            </div>
          )}

          {/* Subtype + modifiers */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1.5">ADHD Subtype</p>
              <Pills opts={SUBTYPES} value={subtype} onToggle={v => setSubtype(p => p === v ? '' : v)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">Age of symptom onset</p>
                <input type="number" min="1" max="18" value={onsetAge} onChange={e => setOnsetAge(e.target.value)}
                  placeholder="yrs" className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">Before age 12?</p>
                <div className="flex gap-1">
                  {['Yes', 'No'].map(o => (
                    <button key={o} type="button" onClick={() => setBefore12(v => v === o ? '' : o)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        before12 === o ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'
                      }`}>{o}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">Multiple settings?</p>
                <div className="flex gap-1">
                  {['Yes', 'No'].map(o => (
                    <button key={o} type="button" onClick={() => setMultiSet(v => v === o ? '' : o)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        multiSet === o ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'
                      }`}>{o}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── Section 2: Validated Tools ── */}
        <SectionCard title="2 · Validated Diagnostic Tools">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Tools used</p>
            <MultiPills opts={TOOLS} values={tools} onToggle={k => toggleArr(setTools, k)} />
          </div>
          {tools.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {tools.map(k => {
                const tool = TOOLS.find(t => t.key === k)
                return (
                  <div key={k}>
                    <p className="text-xs text-gray-500 font-medium mb-1">{tool?.label} — Score</p>
                    <input type="text" value={toolScores[k] || ''}
                      onChange={e => setToolScores(p => ({ ...p, [k]: e.target.value }))}
                      placeholder="e.g. 68 / Positive"
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>

        {/* ── Section 3: Functional Impairment ── */}
        <SectionCard title="3 · Functional Impairment">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">More than 1 area impaired?</p>
            <div className="flex gap-2">
              {['Yes', 'No'].map(o => (
                <button key={o} type="button" onClick={() => setImpaired(v => v === o ? '' : o)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    impaired === o ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'
                  }`}>{o}</button>
              ))}
            </div>
          </div>
          {impaired === 'Yes' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600">Severity per domain</p>
              {DOMAINS.map(d => (
                <div key={d} className="flex items-center gap-3">
                  <span className="text-xs text-gray-700 w-40 shrink-0">{d}</span>
                  <div className="flex gap-1.5">
                    {SEVERITY.map(s => (
                      <button key={s} type="button" onClick={() => setDomain(d, s)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all ${
                          domains[d] === s
                            ? s === 'Mild' ? 'bg-yellow-400 text-white border-yellow-400'
                              : s === 'Moderate' ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-red-600 text-white border-red-600'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
                        }`}>{s}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── Section 4: Comorbidities ── */}
        <SectionCard title="4 · Comorbidities">
          <MultiPills opts={COMORBIDITIES} values={comorbids} onToggle={v => toggleArr(setComorbids, v)} />
        </SectionCard>

        {/* ── Section 5: Treatment ── */}
        <SectionCard title="5 · Treatment Plan">
          {/* Behavioral therapy alert for young children */}
          {patientAge !== null && patientAge < 6 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 font-medium">
                Patient age &lt;6 yrs — behavioural therapy should be first-line before medication per guidelines.
              </p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Behavioural therapy prescribed?</p>
            <div className="flex gap-2">
              {['Yes', 'No', 'Referred'].map(o => (
                <button key={o} type="button" onClick={() => setBehavTx(v => v === o ? '' : o)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    behavTx === o ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'
                  }`}>{o}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Patient on medications?</p>
            <div className="flex gap-2">
              {['Yes', 'No'].map(o => (
                <button key={o} type="button" onClick={() => setOnMeds(v => v === o ? '' : o)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    onMeds === o ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'
                  }`}>{o}</button>
              ))}
            </div>
          </div>

          {/* Medication entries */}
          {onMeds === 'Yes' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-600">Medications</p>
                <button type="button" onClick={() => setMeds(p => [...p, newMed()])}
                  className="flex items-center gap-1 text-xs font-medium text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-lg hover:bg-indigo-50">
                  <Plus size={11} /> Add
                </button>
              </div>
              {meds.map((m, idx) => (
                <div key={m.id} className="border border-gray-200 rounded-xl p-3 bg-gray-50 relative space-y-3">
                  {meds.length > 1 && (
                    <button type="button" onClick={() => setMeds(p => p.filter(x => x.id !== m.id))}
                      className="absolute top-2 right-2 text-gray-300 hover:text-red-400"><X size={13} /></button>
                  )}
                  <p className="text-xs font-bold text-gray-400">Medication {idx + 1}</p>

                  {/* Drug name — stimulant / non-stimulant presets */}
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Drug</p>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      <span className="text-[10px] text-gray-400 font-semibold w-full">Stimulants</span>
                      {STIMULANTS.map(s => (
                        <button key={s} type="button" onClick={() => setMedFld(m.id, 'drug', s)}
                          className={`px-2 py-0.5 rounded-full text-xs border transition-all ${
                            m.drug === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
                          }`}>{s}</button>
                      ))}
                      <span className="text-[10px] text-gray-400 font-semibold w-full mt-1">Non-stimulants</span>
                      {NONSTIMULANTS.map(s => (
                        <button key={s} type="button" onClick={() => setMedFld(m.id, 'drug', s)}
                          className={`px-2 py-0.5 rounded-full text-xs border transition-all ${
                            m.drug === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
                          }`}>{s}</button>
                      ))}
                    </div>
                    <input type="text" value={m.drug} onChange={e => setMedFld(m.id, 'drug', e.target.value)}
                      placeholder="Or type drug name"
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">Dose</p>
                      <input type="text" value={m.dose} onChange={e => setMedFld(m.id, 'dose', e.target.value)}
                        placeholder="e.g. 10 mg"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">Frequency</p>
                      <input type="text" value={m.frequency} onChange={e => setMedFld(m.id, 'frequency', e.target.value)}
                        placeholder="e.g. OD, BD"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">Duration</p>
                      <input type="text" value={m.duration} onChange={e => setMedFld(m.id, 'duration', e.target.value)}
                        placeholder="e.g. 3 months"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Treatment response</p>
                    <div className="flex flex-wrap gap-1.5">
                      {MED_RESPONSES.map(r => (
                        <button key={r} type="button" onClick={() => setMedFld(m.id, 'response', m.response === r ? '' : r)}
                          className={`px-2.5 py-0.5 rounded-full text-xs border transition-all ${
                            m.response === r ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200'
                          }`}>{r}</button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-1">Side effects noted</p>
                    <div className="flex flex-wrap gap-1.5">
                      {MED_EFFECTS.map(e => (
                        <button key={e} type="button" onClick={() => toggleMedEff(m.id, e)}
                          className={`px-2.5 py-0.5 rounded-full text-xs border transition-all ${
                            m.side_effects.includes(e) ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-500 border-gray-200'
                          }`}>{e}</button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {onMeds === 'Yes' && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">Side effects formally assessed?</p>
                  <div className="flex gap-2">
                    {['Yes', 'No'].map(o => (
                      <button key={o} type="button" onClick={() => setSideEffAss(v => v === o ? '' : o)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          sideEffAss === o ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'
                        }`}>{o}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* School / workplace accommodations */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">School / Workplace Accommodations</p>
            <MultiPills opts={ACCOMMODATIONS} values={accommod} onToggle={v => toggleArr(setAccommod, v)} />
          </div>
        </SectionCard>

        {/* ── Section 6: Education & Follow-up ── */}
        <SectionCard title="6 · Education & Follow-up">
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Patient / family education topics covered</p>
            <MultiPills opts={EDU_TOPICS} values={eduTopics} onToggle={v => toggleArr(setEduTopics, v)} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5">Target symptoms for improvement</p>
            <MedicalTextArea
              rows={2} value={targetSx}
              onChange={e => setTargetSx(e.target.value)}
              placeholder="e.g. Reduce inattention in class, improve homework completion…"
              categories="symptom,condition"
            />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5">Follow-up date</p>
            <input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        </SectionCard>

        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4 flex justify-end gap-3">
        <button type="button" onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button type="button" onClick={handleSave} disabled={saving}
          className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Assessment'}
        </button>
      </div>
    </div>
  )
}
