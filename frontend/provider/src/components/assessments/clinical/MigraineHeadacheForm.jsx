/**
 * @shared-pool — standalone clinical assessment, portal-agnostic
 * Migraine & Headache Neurology Assessment
 * ICHD-3 aligned · MIDAS disability · SNOOP4 red flags · Indian patient context
 */
import { useState, useMemo } from 'react'
import { Brain, AlertTriangle } from 'lucide-react'
import api from '../../../api/client'

// ── Utility: pill buttons ─────────────────────────────────────────────────────

function Pills({ options, value, onChange, multi = false, color = 'purple' }) {
  const active = multi ? (Array.isArray(value) ? value : []) : value
  const toggle = (o) => {
    if (multi) {
      onChange(active.includes(o) ? active.filter(x => x !== o) : [...active, o])
    } else {
      onChange(active === o ? '' : o)
    }
  }
  const activeClass = {
    purple: 'bg-purple-600 text-white border-purple-600',
    red:    'bg-red-500 text-white border-red-500',
    pink:   'bg-pink-500 text-white border-pink-500',
    amber:  'bg-amber-500 text-white border-amber-500',
    green:  'bg-green-600 text-white border-green-600',
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button key={o} type="button" onClick={() => toggle(o)}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            (multi ? active.includes(o) : active === o)
              ? (activeClass[color] || activeClass.purple)
              : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300'
          }`}>{o}</button>
      ))}
    </div>
  )
}

// ── Utility: yes/no gate ──────────────────────────────────────────────────────

function Gate({ label, value, onChange, children, yesLabel = 'Yes', noLabel = 'No', accentYes = 'bg-purple-500 text-white border-purple-500' }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-1.5">
        <p className="text-sm font-medium text-gray-700 flex-1">{label}</p>
        <div className="flex gap-1.5">
          {[yesLabel, noLabel].map(opt => (
            <button key={opt} type="button"
              onClick={() => onChange(v => v === opt ? '' : opt)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                value === opt
                  ? opt === yesLabel ? accentYes : 'bg-gray-400 text-white border-gray-400'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300'
              }`}>{opt}</button>
          ))}
        </div>
      </div>
      {value === yesLabel && children && (
        <div className="ml-4 pl-3 border-l-2 border-purple-200 space-y-3 mt-2">{children}</div>
      )}
    </div>
  )
}

// ── Utility: field label ──────────────────────────────────────────────────────

function FL({ label, sub, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
        {sub && <span className="ml-1 font-normal text-gray-400 normal-case tracking-normal">{sub}</span>}
      </p>
      {children}
    </div>
  )
}

// ── Stage config ──────────────────────────────────────────────────────────────

const STAGES = [
  { id: 1, label: 'History' },
  { id: 2, label: 'Attack' },
  { id: 3, label: 'Triggers' },
  { id: 4, label: 'Symptoms' },
  { id: 5, label: 'Medications' },
  { id: 6, label: 'Red Flags' },
  { id: 7, label: 'Plan' },
]

// ── MIDAS grading ─────────────────────────────────────────────────────────────

function midasGrade(score) {
  if (score <= 5)  return { grade: 'I',   label: 'Minimal or infrequent disability', color: 'text-green-600',  bg: 'bg-green-50 border-green-200' }
  if (score <= 10) return { grade: 'II',  label: 'Mild disability',                  color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' }
  if (score <= 20) return { grade: 'III', label: 'Moderate disability',              color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' }
  return           { grade: 'IV',  label: 'Severe disability',               color: 'text-red-600',    bg: 'bg-red-50 border-red-200' }
}

// ── Main form ─────────────────────────────────────────────────────────────────

export default function MigraineHeadacheForm({ admission, onClose, onSaved }) {
  const [stage,  setStage]  = useState(1)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  // ── Stage 1: History ───────────────────────────────────────────────────────
  const [onsetAge,            setOnsetAge]            = useState('')
  const [problemDuration,     setProblemDuration]     = useState('')
  const [problemDurationUnit, setProblemDurationUnit] = useState('years')
  const [frequency,           setFrequency]           = useState('')
  const [frequencyUnit,       setFrequencyUnit]       = useState('per month')
  const [isChronicHA,         setIsChronicHA]         = useState('')
  const [patternChange,       setPatternChange]       = useState('')
  const [familyHxMigraine,    setFamilyHxMigraine]    = useState('')
  const [familyMembers,       setFamilyMembers]       = useState([])
  const [prevImaging,         setPrevImaging]         = useState('')
  const [imagingType,         setImagingType]         = useState([])
  const [imagingFindings,     setImagingFindings]     = useState('')
  const [prevNeuroCons,       setPrevNeuroCons]       = useState('')
  const [prevDiagnosis,       setPrevDiagnosis]       = useState('')

  // ── Stage 2: Attack Profile ────────────────────────────────────────────────
  const [haLocation,       setHaLocation]       = useState([])
  const [haSide,           setHaSide]           = useState('')
  const [haCharacter,      setHaCharacter]      = useState([])
  const [haSeverityVAS,    setHaSeverityVAS]    = useState('')
  const [haOnset,          setHaOnset]          = useState('')
  const [haDuration,       setHaDuration]       = useState('')
  const [haDurationUnit,   setHaDurationUnit]   = useState('hours')
  const [worseWith,        setWorseWith]        = useState([])
  const [aura,             setAura]             = useState('')
  const [auraTypes,        setAuraTypes]        = useState([])
  const [auraVisual,       setAuraVisual]       = useState([])
  const [auraSensory,      setAuraSensory]      = useState([])
  const [auraDuration,     setAuraDuration]     = useState('')
  const [auraBeforeHA,     setAuraBeforeHA]     = useState('')
  const [prodrome,         setProdrome]         = useState('')
  const [prodromeFeatures, setProdromeFeatures] = useState([])
  const [postdrome,        setPostdrome]        = useState('')
  const [postdromeFeatures,setPostdromeFeatures]= useState([])

  // ── Stage 3: Triggers ──────────────────────────────────────────────────────
  const [dietaryTriggers,     setDietaryTriggers]     = useState([])
  const [lifestyleTriggers,   setLifestyleTriggers]   = useState([])
  const [hormonal,            setHormonal]            = useState('')
  const [hormonalDetails,     setHormonalDetails]     = useState([])
  const [menstrualLink,       setMenstrualLink]       = useState('')
  const [menstrualPhase,      setMenstrualPhase]      = useState('')
  const [triggerNotes,        setTriggerNotes]        = useState('')

  // ── Stage 4: Symptoms + MIDAS ──────────────────────────────────────────────
  const [nausea,            setNausea]            = useState('')
  const [vomiting,          setVomiting]          = useState('')
  const [photophobia,       setPhotophobia]       = useState('')
  const [phonophobia,       setPhonophobia]       = useState('')
  const [osmophobia,        setOsmophobia]        = useState('')
  const [allodynia,         setAllodynia]         = useState('')
  const [neckStiffness,     setNeckStiffness]     = useState('')
  const [vertigo,           setVertigo]           = useState('')
  const [visualDisturbance, setVisualDisturbance] = useState('')
  const [fainting,          setFainting]          = useState('')
  const [cogFog,            setCogFog]            = useState('')
  const [midasQ1,           setMidasQ1]           = useState('')
  const [midasQ2,           setMidasQ2]           = useState('')
  const [midasQ3,           setMidasQ3]           = useState('')
  const [midasQ4,           setMidasQ4]           = useState('')
  const [midasQ5,           setMidasQ5]           = useState('')

  // ── Stage 5: Medications ───────────────────────────────────────────────────
  const [acuteMeds,          setAcuteMeds]          = useState([])
  const [acuteMedResponse,   setAcuteMedResponse]   = useState('')
  const [preventiveMeds,     setPreventiveMeds]     = useState([])
  const [preventiveResponse, setPreventiveResponse] = useState('')
  const [medOveruse,         setMedOveruse]         = useState('')
  const [medOveruseDays,     setMedOveruseDays]     = useState('')
  const [triedCGRP,          setTriedCGRP]          = useState('')
  const [cgerpResponse,      setCgerpResponse]      = useState('')
  const [prevMedNotes,       setPrevMedNotes]       = useState('')

  // ── Stage 6: Red Flags (SNOOP4) ────────────────────────────────────────────
  const [snoop, setSnoop] = useState({
    thunderclap:       false,
    progressiveWorse:  false,
    neurologicSigns:   false,
    fever:             false,
    immunocompromised: false,
    cancer:            false,
    newAfter50:        false,
    positional:        false,
    papilloedema:      false,
    postTrauma:        false,
    wakesFromSleep:    false,
    valsalvaTriggered: false,
    pregnancyRelated:  false,
  })
  const [redFlagDetails, setRedFlagDetails] = useState('')

  // ── Stage 7: Plan ──────────────────────────────────────────────────────────
  const [ichdType,           setIchdType]           = useState('')
  const [diagNotes,          setDiagNotes]          = useState('')
  const [imagingRecommended, setImagingRecommended] = useState('')
  const [acutePlan,          setAcutePlan]          = useState('')
  const [needsPreventive,    setNeedsPreventive]    = useState('')
  const [preventivePlan,     setPreventivePlan]     = useState('')
  const [referrals,          setReferrals]          = useState([])
  const [haDiary,            setHaDiary]            = useState('')
  const [lifestyleAdvice,    setLifestyleAdvice]    = useState([])
  const [planNotes,          setPlanNotes]          = useState('')
  const [reviewDate,         setReviewDate]         = useState('')

  // ── Computed ───────────────────────────────────────────────────────────────

  const midasScore = useMemo(() => {
    return [midasQ1, midasQ2, midasQ3, midasQ4, midasQ5]
      .map(v => parseInt(v) || 0).reduce((a, b) => a + b, 0)
  }, [midasQ1, midasQ2, midasQ3, midasQ4, midasQ5])

  const redFlagCount = Object.values(snoop).filter(Boolean).length

  const autoSuggestions = useMemo(() => {
    const s = []
    if (redFlagCount > 0)
      s.push(`⚠ ${redFlagCount} red flag(s) present — urgent neuroimaging / specialist review`)
    if (snoop.thunderclap)
      s.push('Thunderclap headache: rule out SAH — CT head stat, LP if CT negative')
    if (snoop.pregnancyRelated)
      s.push('Headache in pregnancy/postpartum: consider pre-eclampsia / CVT / RCVS')
    if (isChronicHA === 'Yes')
      s.push('Chronic headache (≥15 days/month) — preventive therapy indicated')
    if (medOveruse === 'Yes')
      s.push('Medication overuse headache (MOH) suspected — withdraw offending analgesic')
    if (midasScore >= 21)
      s.push(`MIDAS Grade IV (score ${midasScore}) — severe disability; preventive therapy strongly indicated`)
    else if (midasScore >= 11)
      s.push(`MIDAS Grade III (score ${midasScore}) — moderate disability; preventive therapy recommended`)
    const freqNum = parseInt(frequency)
    if (frequencyUnit === 'per month' && freqNum >= 4)
      s.push('≥4 attacks/month — meets threshold for preventive treatment')
    if (aura === 'Yes' && hormonalDetails.includes('Oral contraceptives (OCP)'))
      s.push('⚠ Migraine with aura + combined OCP — significantly increased stroke risk; review contraception')
    if (menstrualLink === 'Yes')
      s.push('Menstrually-related migraine — consider perimenstrual NSAID / triptan / hormonal strategy')
    if (aura === 'Yes' && !ichdType.includes('aura'))
      s.push('Confirm aura features meet ICHD-3 criteria (5–60 min, fully reversible)')
    if (!acuteMeds.length)
      s.push('Document acute treatment plan')
    return s
  }, [redFlagCount, snoop, isChronicHA, medOveruse, midasScore, frequency, frequencyUnit,
      aura, hormonalDetails, menstrualLink, ichdType, acuteMeds])

  const stageDone = useMemo(() => ({
    1: !!(onsetAge || problemDuration || frequency),
    2: !!(haLocation.length || haCharacter.length),
    3: !!(dietaryTriggers.length || lifestyleTriggers.length),
    4: !!(nausea || photophobia || midasQ1),
    5: !!(acuteMeds.length || preventiveMeds.length),
    6: redFlagCount > 0,
    7: !!(ichdType || planNotes),
  }), [onsetAge, problemDuration, frequency, haLocation, haCharacter,
       dietaryTriggers, lifestyleTriggers, nausea, photophobia, midasQ1,
       acuteMeds, preventiveMeds, redFlagCount, ichdType, planNotes])

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true); setError('')
    const g = midasGrade(midasScore)
    const payload = {
      type: 'migraine_headache_assessment',
      history: {
        onset_age: onsetAge,
        problem_duration: `${problemDuration} ${problemDurationUnit}`,
        frequency: `${frequency} ${frequencyUnit}`,
        chronic_headache: isChronicHA,
        pattern_change: patternChange,
        family_history: { present: familyHxMigraine, members: familyMembers },
        previous_imaging: { done: prevImaging, type: imagingType, findings: imagingFindings },
        previous_neurology_consult: prevNeuroCons,
        previous_diagnosis: prevDiagnosis,
      },
      attack_profile: {
        location: haLocation, side: haSide, character: haCharacter,
        severity_vas: haSeverityVAS,
        onset: haOnset,
        duration: `${haDuration} ${haDurationUnit}`,
        worse_with: worseWith,
        aura: {
          present: aura, types: auraTypes,
          visual_details: auraVisual, sensory_details: auraSensory,
          duration_minutes: auraDuration, precedes_headache: auraBeforeHA,
        },
        prodrome: { present: prodrome, features: prodromeFeatures },
        postdrome: { present: postdrome, features: postdromeFeatures },
      },
      triggers: {
        dietary: dietaryTriggers,
        lifestyle_environmental: lifestyleTriggers,
        hormonal: { present: hormonal, details: hormonalDetails },
        menstrual_link: menstrualLink, menstrual_phase: menstrualPhase,
        notes: triggerNotes,
      },
      associated_symptoms: {
        nausea, vomiting, photophobia, phonophobia, osmophobia,
        allodynia, neck_stiffness: neckStiffness, vertigo,
        visual_disturbance: visualDisturbance, fainting, cognitive_fog: cogFog,
      },
      midas: {
        q1_work_missed: midasQ1, q2_work_halved: midasQ2,
        q3_housework_missed: midasQ3, q4_housework_halved: midasQ4,
        q5_social_missed: midasQ5,
        total_score: midasScore, grade: g.grade, interpretation: g.label,
      },
      medications: {
        acute: acuteMeds, acute_response: acuteMedResponse,
        preventive: preventiveMeds, preventive_response: preventiveResponse,
        overuse: { present: medOveruse, days_per_month: medOveruseDays },
        cgrp_tried: triedCGRP, cgrp_response: cgerpResponse,
        notes: prevMedNotes,
      },
      red_flags: {
        snoop4: snoop, count: redFlagCount, details: redFlagDetails,
      },
      plan: {
        ichd3_type: ichdType, diagnosis_notes: diagNotes,
        imaging_recommended: imagingRecommended,
        acute_treatment_plan: acutePlan,
        preventive: { indicated: needsPreventive, plan: preventivePlan },
        referrals, headache_diary: haDiary,
        lifestyle_advice: lifestyleAdvice,
        review_date: reviewDate, notes: planNotes,
        auto_suggestions: autoSuggestions,
      },
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

  // ── Stage renders ──────────────────────────────────────────────────────────

  const renderStage1 = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <FL label="Age at headache onset" sub="(years)">
          <input type="number" value={onsetAge} onChange={e => setOnsetAge(e.target.value)}
            min={1} max={100} placeholder="e.g. 22"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
        </FL>
        <FL label="Problem duration">
          <div className="flex gap-2">
            <input type="number" value={problemDuration} onChange={e => setProblemDuration(e.target.value)}
              min={0} placeholder="e.g. 5"
              className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
            <Pills options={['months', 'years']} value={problemDurationUnit} onChange={setProblemDurationUnit} />
          </div>
        </FL>
      </div>

      <FL label="Attack frequency">
        <div className="flex gap-2 items-center flex-wrap">
          <input type="number" value={frequency} onChange={e => setFrequency(e.target.value)}
            min={0} placeholder="e.g. 4"
            className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          <Pills options={['per week', 'per month', 'per year']} value={frequencyUnit} onChange={setFrequencyUnit} />
        </div>
      </FL>

      <FL label="Chronic headache?" sub="≥15 headache days/month for >3 months">
        <Pills options={['Yes', 'No', 'Uncertain']} value={isChronicHA} onChange={setIsChronicHA} />
      </FL>

      <FL label="Headache pattern recently changed?">
        <Pills options={['No change', 'Increasing frequency', 'Increasing severity', 'New character', 'New location', 'Not responding to usual treatment']}
          value={patternChange} onChange={setPatternChange} />
      </FL>

      <Gate label="Family history of migraine?" value={familyHxMigraine} onChange={setFamilyHxMigraine}>
        <FL label="Affected family members">
          <Pills multi options={['Mother', 'Father', 'Sibling', 'Maternal grandmother', 'Maternal grandfather', 'Paternal grandmother', 'Paternal grandfather', 'Children', 'Other relatives']}
            value={familyMembers} onChange={setFamilyMembers} />
        </FL>
      </Gate>

      <Gate label="Previous neuroimaging done?" value={prevImaging} onChange={setPrevImaging}>
        <FL label="Imaging type">
          <Pills multi options={['CT head plain', 'CT head contrast', 'MRI brain', 'MRI brain + contrast', 'MRA (angiography)', 'MRV (venography)', 'X-ray skull']}
            value={imagingType} onChange={setImagingType} />
        </FL>
        <FL label="Findings">
          <Pills options={['Normal', 'Abnormal — see notes', 'Incidental findings only', 'Reports not available']}
            value={imagingFindings} onChange={setImagingFindings} />
        </FL>
      </Gate>

      <Gate label="Previously seen by neurologist?" value={prevNeuroCons} onChange={setPrevNeuroCons}>
        <FL label="Previous diagnosis given">
          <input type="text" value={prevDiagnosis} onChange={e => setPrevDiagnosis(e.target.value)}
            placeholder="e.g. Migraine without aura, Tension-type headache, Cluster headache…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
        </FL>
      </Gate>
    </div>
  )

  const renderStage2 = () => (
    <div className="space-y-5">
      <FL label="Headache location">
        <Pills multi options={['Frontal', 'Temporal (right)', 'Temporal (left)', 'Orbital / periorbital (right)', 'Orbital / periorbital (left)', 'Occipital', 'Vertex / crown', 'Hemicranial (right)', 'Hemicranial (left)', 'Holocranial (whole head)', 'Facial', 'Neck']}
          value={haLocation} onChange={setHaLocation} />
      </FL>

      <FL label="Laterality">
        <Pills options={['Unilateral', 'Bilateral', 'Alternating sides', 'Side-locked (always same side)']}
          value={haSide} onChange={setHaSide} />
      </FL>

      <FL label="Character / quality">
        <Pills multi options={['Throbbing / pulsating', 'Pressing / squeezing', 'Stabbing / ice-pick', 'Burning', 'Tight band-like', 'Heavy pressure', 'Splitting', 'Drilling']}
          value={haCharacter} onChange={setHaCharacter} />
      </FL>

      <FL label="Severity at peak" sub="VAS 1–10">
        <div className="flex items-center gap-3 mb-1">
          <input type="range" min={1} max={10} value={haSeverityVAS || 5}
            onChange={e => setHaSeverityVAS(e.target.value)}
            className="flex-1 accent-purple-600" />
          <span className={`text-xl font-bold w-8 text-center ${
            !haSeverityVAS ? 'text-gray-300'
            : haSeverityVAS >= 8 ? 'text-red-600'
            : haSeverityVAS >= 5 ? 'text-orange-500'
            : 'text-yellow-500'
          }`}>{haSeverityVAS || '–'}</span>
        </div>
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>1 Mild</span><span>5 Moderate</span><span>10 Severe</span>
        </div>
      </FL>

      <div className="grid grid-cols-2 gap-4">
        <FL label="Attack onset speed">
          <Pills options={['Gradual (>30 min build-up)', 'Rapid (<30 min)', 'Sudden (<5 min)', 'Thunderclap (<1 min)']}
            value={haOnset} onChange={setHaOnset} />
        </FL>
        <FL label="Duration per attack">
          <div className="flex gap-2">
            <input type="number" value={haDuration} onChange={e => setHaDuration(e.target.value)}
              min={0} placeholder="e.g. 8"
              className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
            <Pills options={['min', 'hours', 'days']} value={haDurationUnit} onChange={setHaDurationUnit} />
          </div>
        </FL>
      </div>

      <FL label="Aggravated by">
        <Pills multi options={['Routine physical activity', 'Head movement / bending', 'Coughing / sneezing', 'Valsalva / straining', 'Lying down', 'Standing up', 'Bright light', 'Loud sounds', 'Strong smells']}
          value={worseWith} onChange={setWorseWith} />
      </FL>

      {/* Aura section */}
      <div className="border border-purple-100 rounded-xl p-4 bg-purple-50/30 space-y-4">
        <FL label="Aura present?">
          <Pills options={['Yes', 'No', 'Uncertain']} value={aura} onChange={setAura} />
        </FL>

        {aura === 'Yes' && (<>
          <FL label="Aura type(s)">
            <Pills multi options={['Visual', 'Sensory (numbness / tingling)', 'Speech / dysphasia', 'Motor weakness', 'Brainstem symptoms', 'Retinal']}
              value={auraTypes} onChange={setAuraTypes} />
          </FL>

          {auraTypes.includes('Visual') && (
            <FL label="Visual aura features">
              <Pills multi options={['Scintillating scotoma (flickering zigzag arc)', 'Fortification spectrum', 'Positive scotoma (bright spot)', 'Negative scotoma (blind spot)', 'Flashing lights', 'Visual snow', 'Blurred vision', 'Tunnel vision', 'Hemianopia']}
                value={auraVisual} onChange={setAuraVisual} />
            </FL>
          )}

          {auraTypes.includes('Sensory (numbness / tingling)') && (
            <FL label="Sensory aura spread pattern">
              <Pills multi options={['Cheiro-oral march (hand → arm → face)', 'Unilateral face only', 'Unilateral arm only', 'Unilateral leg', 'Bilateral', 'Tongue / perioral tingling']}
                value={auraSensory} onChange={setAuraSensory} />
            </FL>
          )}

          {auraTypes.includes('Brainstem symptoms') && (
            <FL label="Brainstem aura features">
              <Pills multi options={['Diplopia', 'Dysarthria', 'Vertigo / dizziness', 'Tinnitus', 'Hearing reduction', 'Ataxia', 'Decreased level of consciousness']}
                value={[]} onChange={() => {}} />
            </FL>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FL label="Aura duration" sub="(minutes)">
              <input type="number" value={auraDuration} onChange={e => setAuraDuration(e.target.value)}
                min={1} placeholder="e.g. 20"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </FL>
            <FL label="Aura timing relative to headache">
              <Pills options={['Precedes headache', 'Concurrent', 'Follows headache', 'Aura without headache']}
                value={auraBeforeHA} onChange={setAuraBeforeHA} />
            </FL>
          </div>
        </>)}
      </div>

      <Gate label="Prodrome symptoms (hours before attack)?" value={prodrome} onChange={setProdrome}>
        <FL label="Prodrome features">
          <Pills multi options={['Yawning', 'Irritability / mood change', 'Fatigue / lethargy', 'Neck stiffness', 'Sweet food cravings', 'Fluid retention / bloating', 'Increased urination', 'Cognitive slowing / difficulty concentrating', 'Hypersensitivity to light', 'Nausea beginning']}
            value={prodromeFeatures} onChange={setProdromeFeatures} />
        </FL>
      </Gate>

      <Gate label="Postdrome symptoms (after attack resolves)?" value={postdrome} onChange={setPostdrome}>
        <FL label="Postdrome features">
          <Pills multi options={['Fatigue / exhaustion', 'Cognitive fog / brain fog', 'Scalp tenderness', 'Low mood', 'Neck pain', 'Nausea persisting', 'Euphoria / sense of relief', 'Difficulty concentrating']}
            value={postdromeFeatures} onChange={setPostdromeFeatures} />
        </FL>
      </Gate>
    </div>
  )

  const renderStage3 = () => (
    <div className="space-y-5">
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
        <p className="text-xs text-amber-700 font-medium">Select all known or suspected triggers. Indian-specific triggers are included.</p>
      </div>

      <FL label="Dietary triggers">
        <Pills multi options={[
          'Skipping meals / irregular meal times',
          'Religious fasting (Ekadashi / Navratri / Karva Chauth / Ramadan)',
          'Prolonged overnight fast',
          'Dehydration (inadequate fluid intake)',
          'Caffeine excess (>3 cups/day)',
          'Caffeine withdrawal',
          'Alcohol (any type)',
          'Alcohol — red wine specifically',
          'Chocolate',
          'Aged / processed cheese (paneer less likely)',
          'MSG / Ajinomoto (Chinese food)',
          'Pickles / achaars / very spicy food',
          'Fermented foods (idli / dosa batter)',
          'Citrus fruits',
          'Banana',
          'Asafoetida (hing)',
          'Cold drinks / ice-cream / very cold food',
          'High sodium / very salty food',
        ]}
          value={dietaryTriggers} onChange={setDietaryTriggers} />
      </FL>

      <FL label="Lifestyle & environmental triggers">
        <Pills multi options={[
          'Stress / exam pressure / work deadlines',
          'Stress let-down (migraine after stress passes — weekend / holiday)',
          'Sleep deprivation',
          'Oversleeping / change in sleep timing',
          'Bright sunlight / outdoor glare',
          'Fluorescent / tube lighting',
          'Prolonged screen use (mobile / laptop)',
          'Loud noise / crowds',
          'Strong perfume / incense smoke / agarbatti',
          'Vehicular smoke / air pollution',
          'Summer heat / exposure to afternoon sun',
          'Monsoon humidity',
          'Cold wind / sudden AC exposure',
          'Head bath with cold water',
          'Long-distance travel (train / bus / car)',
          'Flying / altitude change',
          'Physical exertion / exercise',
          'Bending or heavy lifting',
          'Passive smoking',
        ]}
          value={lifestyleTriggers} onChange={setLifestyleTriggers} />
      </FL>

      <Gate label="Hormonal triggers identified?" value={hormonal} onChange={setHormonal}>
        <FL label="Hormonal factors">
          <Pills multi options={[
            'Menstruation (premenstrual days −2 to −1)',
            'Menstruation Day 1–2 (catamenial)',
            'Mid-cycle / ovulation',
            'Oral contraceptives (OCP) — combined pill',
            'Oral contraceptives — progestogen-only pill',
            'Hormone replacement therapy (HRT)',
            'Pregnancy (first trimester)',
            'Postpartum period',
            'Peri-menopausal transition',
            'Post-menopause',
          ]}
            value={hormonalDetails} onChange={setHormonalDetails} />
        </FL>
      </Gate>

      <Gate label="Clear menstrual / catamenial link?" value={menstrualLink} onChange={setMenstrualLink}
        accentYes="bg-pink-500 text-white border-pink-500">
        <FL label="Phase of cycle when headache occurs">
          <Pills options={['Day −2 to +3 (pure menstrual migraine)', 'Any time but consistently worse with period', 'Mid-cycle (ovulation)', 'Premenstrual only', 'Unpredictable']}
            value={menstrualPhase} onChange={setMenstrualPhase} />
        </FL>
      </Gate>

      <FL label="Additional trigger notes">
        <input type="text" value={triggerNotes} onChange={e => setTriggerNotes(e.target.value)}
          placeholder="Any other identified triggers or patterns…"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
      </FL>
    </div>
  )

  const renderStage4 = () => {
    const g = midasGrade(midasScore)
    const allMidasFilled = [midasQ1, midasQ2, midasQ3, midasQ4, midasQ5].every(v => v !== '')

    const SxRow = ({ label, val, set }) => (
      <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
        <span className="text-sm text-gray-700 flex-1">{label}</span>
        <div className="shrink-0">
          <Pills options={['Yes', 'No']} value={val} onChange={set} />
        </div>
      </div>
    )

    return (
      <div className="space-y-5">
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Symptoms during attack</p>
          </div>
          <div className="px-4 py-1">
            <SxRow label="Nausea"                                  val={nausea}            set={setNausea} />
            <SxRow label="Vomiting"                                val={vomiting}          set={setVomiting} />
            <SxRow label="Photophobia — sensitivity to light"      val={photophobia}       set={setPhotophobia} />
            <SxRow label="Phonophobia — sensitivity to sound"      val={phonophobia}       set={setPhonophobia} />
            <SxRow label="Osmophobia — sensitivity to smell"       val={osmophobia}        set={setOsmophobia} />
            <SxRow label="Allodynia — scalp tenderness to touch"   val={allodynia}         set={setAllodynia} />
            <SxRow label="Neck stiffness / pain"                   val={neckStiffness}     set={setNeckStiffness} />
            <SxRow label="Vertigo / dizziness"                     val={vertigo}           set={setVertigo} />
            <SxRow label="Visual disturbance (outside aura)"       val={visualDisturbance} set={setVisualDisturbance} />
            <SxRow label="Fainting / syncope"                      val={fainting}          set={setFainting} />
            <SxRow label="Cognitive fog / confusion during attack"  val={cogFog}            set={setCogFog} />
          </div>
        </div>

        {/* MIDAS */}
        <div className="border border-purple-200 rounded-xl overflow-hidden">
          <div className="bg-purple-50 px-4 py-2.5 border-b border-purple-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">MIDAS — Migraine Disability Assessment Score</p>
              <p className="text-[10px] text-purple-500 mt-0.5">Number of days in the past 3 months (90 days)</p>
            </div>
            {allMidasFilled && (
              <div className="text-right shrink-0">
                <p className={`text-xl font-bold ${g.color}`}>{midasScore}</p>
                <p className={`text-[10px] font-semibold ${g.color}`}>Grade {g.grade}</p>
              </div>
            )}
          </div>
          <div className="px-4 py-3 space-y-4">
            {[
              { n: 1, label: 'Days you missed work or school because of headache', val: midasQ1, set: setMidasQ1 },
              { n: 2, label: 'Days productivity at work/school was reduced by ≥50%', val: midasQ2, set: setMidasQ2 },
              { n: 3, label: 'Days you were unable to do household work/chores',     val: midasQ3, set: setMidasQ3 },
              { n: 4, label: 'Days household productivity was reduced by ≥50%',      val: midasQ4, set: setMidasQ4 },
              { n: 5, label: 'Days you missed family, social, or leisure activities', val: midasQ5, set: setMidasQ5 },
            ].map(({ n, label, val, set }) => (
              <div key={n} className="flex items-center gap-3">
                <span className="shrink-0 w-6 h-6 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold flex items-center justify-center">{n}</span>
                <p className="flex-1 text-xs text-gray-700 leading-snug">{label}</p>
                <input type="number" value={val} onChange={e => set(e.target.value)}
                  min={0} max={92} placeholder="0"
                  className="shrink-0 w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-purple-400" />
              </div>
            ))}
          </div>

          {allMidasFilled && (
            <div className={`px-4 py-3 border-t ${g.bg}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-600">Total MIDAS Score: {midasScore} — Grade {g.grade}</p>
                  <p className={`text-sm font-semibold ${g.color}`}>{g.label}</p>
                </div>
                {midasScore >= 11 && (
                  <span className="text-[10px] font-semibold text-white bg-purple-600 px-2 py-1 rounded-full">
                    Preventive indicated
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderStage5 = () => (
    <div className="space-y-5">
      <FL label="Acute / rescue medications tried or currently using">
        <Pills multi options={[
          'Paracetamol / Crocin',
          'Ibuprofen / Brufen',
          'Naproxen sodium',
          'Aspirin',
          'Combiflame (Ibuprofen + Paracetamol)',
          'Saridon (Propyphenazone + Paracetamol + Caffeine)',
          'Meftal (Mefenamic acid)',
          'Diclofenac',
          'Ketorolac',
          'Sumatriptan 50mg (oral)',
          'Sumatriptan 100mg (oral)',
          'Sumatriptan nasal spray',
          'Sumatriptan SC injection',
          'Zolmitriptan 2.5mg',
          'Rizatriptan 10mg',
          'Naratriptan 2.5mg',
          'Almotriptan',
          'Ergotamine / Cafergot',
          'Dihydroergotamine (DHE)',
          'Domperidone (for nausea)',
          'Ondansetron (for nausea)',
          'Promethazine (Phenergan)',
          'Metoclopramide',
          'Tramadol',
          'Codeine / Codeine-containing (Corex, etc.)',
          'IV fluids (ED/hospital)',
          'IV Metoclopramide + IV fluids',
        ]}
          value={acuteMeds} onChange={setAcuteMeds} />
      </FL>

      <FL label="Response to acute treatment">
        <Pills options={[
          'Excellent — pain-free within 2 hours',
          'Good — significant relief but not pain-free',
          'Partial — some relief only',
          'Poor — no meaningful relief',
          'Variable — inconsistent',
          'Not tried / not assessed yet',
        ]}
          value={acuteMedResponse} onChange={setAcuteMedResponse} />
      </FL>

      <FL label="Preventive medications currently on or previously tried">
        <Pills multi options={[
          'Propranolol 40–80mg OD/BD',
          'Metoprolol 50–100mg',
          'Atenolol 50mg',
          'Amitriptyline 10–25mg nocte',
          'Nortriptyline 10–25mg nocte',
          'Sodium valproate (Valparin / Valproic acid)',
          'Topiramate (Topaz / Topamax)',
          'Flunarizine 5–10mg nocte (commonly used in India)',
          'Pizotifen 0.5–1.5mg',
          'Candesartan 16mg',
          'Venlafaxine 75mg',
          'Magnesium glycinate / oxide supplement',
          'Riboflavin (Vitamin B2) 400mg',
          'CoQ10 300mg',
          'Erenumab / Aimovig (CGRP mAb)',
          'Fremanezumab / Ajovy (CGRP mAb)',
          'Galcanezumab / Emgality (CGRP mAb)',
          'OnabotulinumtoxinA / Botox (chronic migraine)',
        ]}
          value={preventiveMeds} onChange={setPreventiveMeds} />
      </FL>

      <FL label="Response to preventive treatment">
        <Pills options={[
          'Effective — ≥50% attack reduction',
          'Partial — 25–49% reduction',
          'Ineffective — <25% reduction',
          'Not tolerated (side effects)',
          'Ongoing — too early to assess',
          'Not on preventive therapy',
        ]}
          value={preventiveResponse} onChange={setPreventiveResponse} />
      </FL>

      <Gate label="Medication overuse suspected?" value={medOveruse} onChange={setMedOveruse}
        accentYes="bg-red-500 text-white border-red-500">
        <p className="text-[10px] text-gray-500 -mt-2 mb-2">
          Criteria: simple analgesics/NSAIDs ≥15 days/month, OR triptans/ergots ≥10 days/month, for {'>'} 3 months
        </p>
        <FL label="Days per month of overused medication">
          <input type="number" value={medOveruseDays} onChange={e => setMedOveruseDays(e.target.value)}
            min={0} max={31} placeholder="e.g. 18"
            className="w-28 px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
        </FL>
      </Gate>

      <Gate label="CGRP monoclonal antibody tried?" value={triedCGRP} onChange={setTriedCGRP}>
        <FL label="Response to CGRP therapy">
          <Pills options={['Excellent (>75% reduction)', 'Good (50–75% reduction)', 'Partial', 'No response', 'Too early to assess']}
            value={cgerpResponse} onChange={setCgerpResponse} />
        </FL>
      </Gate>

      <FL label="Additional medication notes">
        <textarea rows={2} value={prevMedNotes} onChange={e => setPrevMedNotes(e.target.value)}
          placeholder="Allergies, side effects, dosing history, over-the-counter use, Ayurvedic/herbal remedies…"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
      </FL>
    </div>
  )

  const renderStage6 = () => {
    const flags = [
      { key: 'thunderclap',       label: 'Thunderclap onset',                                  sub: 'Worst headache of life, max intensity in <1 min — subarachnoid haemorrhage until proven otherwise', critical: true },
      { key: 'progressiveWorse',  label: 'Progressive worsening over days / weeks',            sub: 'No resolution between episodes; new-onset headache worsening steadily', critical: true },
      { key: 'neurologicSigns',   label: 'Focal neurological signs (outside typical aura)',    sub: 'Limb weakness, facial palsy, aphasia, diplopia, ataxia, GCS drop, papilloedema', critical: true },
      { key: 'fever',             label: 'Fever + headache + neck stiffness',                  sub: 'Bacterial meningitis / viral encephalitis / brain abscess', critical: true },
      { key: 'immunocompromised', label: 'Immunocompromised / HIV-positive / on steroids',     sub: 'CNS infection, cryptococcal meningitis, CNS lymphoma', critical: false },
      { key: 'cancer',            label: 'Known systemic malignancy',                          sub: 'Brain metastases, leptomeningeal carcinomatosis', critical: true },
      { key: 'newAfter50',        label: 'New-onset headache after age 50',                    sub: 'Giant cell arteritis (temporal arteritis), space-occupying lesion', critical: false },
      { key: 'positional',        label: 'Positional headache',                                sub: 'Worse lying down → raised ICP (tumour, hydrocephalus). Worse standing → intracranial hypotension', critical: false },
      { key: 'papilloedema',      label: 'Papilloedema on fundoscopy',                         sub: 'Raised intracranial pressure — IIH, space-occupying lesion, hydrocephalus', critical: true },
      { key: 'postTrauma',        label: 'Onset following head / neck trauma',                 sub: 'Subdural/epidural haematoma, post-traumatic headache, vertebral artery dissection', critical: false },
      { key: 'wakesFromSleep',    label: 'Consistently waking from sleep with headache',       sub: 'Cluster headache, raised ICP, sleep apnoea, hypnic headache', critical: false },
      { key: 'valsalvaTriggered', label: 'Triggered by cough, strain, or Valsalva',            sub: 'Chiari malformation, posterior fossa lesion, cerebral venous thrombosis', critical: false },
      { key: 'pregnancyRelated',  label: 'New / worsening headache in pregnancy or postpartum', sub: 'Pre-eclampsia / eclampsia, cerebral venous thrombosis (CVT), RCVS, pituitary apoplexy', critical: true },
    ]
    return (
      <div className="space-y-4">
        {redFlagCount > 0 ? (
          <div className="flex items-start gap-2 bg-red-50 border border-red-300 rounded-xl px-4 py-3">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-700">{redFlagCount} red flag{redFlagCount > 1 ? 's' : ''} identified</p>
              <p className="text-xs text-red-600 mt-0.5">Urgent evaluation and/or neuroimaging indicated. Do not diagnose primary headache until secondary causes excluded.</p>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
            <p className="text-xs text-green-700 font-medium">No red flags checked — tick any that apply below</p>
          </div>
        )}

        <div className="space-y-2">
          {flags.map(({ key, label, sub, critical }) => (
            <label key={key}
              className={`flex items-start gap-3 px-4 py-3 rounded-xl cursor-pointer border transition-all ${
                snoop[key]
                  ? critical ? 'bg-red-50 border-red-300' : 'bg-orange-50 border-orange-300'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}>
              <input type="checkbox" checked={snoop[key]}
                onChange={e => setSnoop(p => ({ ...p, [key]: e.target.checked }))}
                className={`mt-0.5 shrink-0 ${critical ? 'accent-red-500' : 'accent-orange-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-semibold ${snoop[key] ? (critical ? 'text-red-700' : 'text-orange-700') : 'text-gray-700'}`}>
                    {label}
                  </p>
                  {snoop[key] && critical && (
                    <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded">URGENT</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{sub}</p>
              </div>
            </label>
          ))}
        </div>

        <FL label="Red flag details / clinical notes">
          <textarea rows={2} value={redFlagDetails} onChange={e => setRedFlagDetails(e.target.value)}
            placeholder="Describe relevant clinical findings, timeline, or other concerns…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
        </FL>
      </div>
    )
  }

  const renderStage7 = () => {
    const g = midasGrade(midasScore)
    const allMidasFilled = [midasQ1, midasQ2, midasQ3, midasQ4, midasQ5].every(v => v !== '')
    return (
      <div className="space-y-5">
        {autoSuggestions.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-1.5">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1.5">Clinical Action Points</p>
            {autoSuggestions.map((s, i) => (
              <p key={i} className="text-xs text-amber-800 flex items-start gap-1.5 leading-snug">
                <span className="shrink-0 mt-0.5">→</span>{s}
              </p>
            ))}
          </div>
        )}

        <FL label="ICHD-3 Clinical diagnosis">
          <Pills options={[
            'Migraine without aura (1.1)',
            'Migraine with aura (1.2)',
            'Chronic migraine (1.3)',
            'Probable migraine (1.5)',
            'Episodic tension-type headache',
            'Chronic tension-type headache',
            'Cluster headache',
            'Medication overuse headache (MOH)',
            'New daily persistent headache (NDPH)',
            'Cervicogenic headache',
            'Post-traumatic headache',
            'Idiopathic intracranial hypertension (IIH)',
            'Secondary headache — under investigation',
            'Mixed headache disorder',
          ]}
            value={ichdType} onChange={setIchdType} />
        </FL>

        <FL label="Diagnostic notes / clinical reasoning">
          <textarea rows={2} value={diagNotes} onChange={e => setDiagNotes(e.target.value)}
            placeholder="Supporting features, differential considerations, ICHD-3 criteria met…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
        </FL>

        <FL label="Neuroimaging recommendation">
          <Pills options={[
            'Not indicated (primary headache, no red flags)',
            'CT head plain — urgent',
            'CT head + contrast — urgent',
            'MRI brain — routine',
            'MRI brain + contrast',
            'MRI brain + MRA (arterial)',
            'MRI brain + MRV (venous)',
            'MRI cervical spine',
            'Already done — reviewed, normal',
            'Already done — reviewed, abnormal',
          ]}
            value={imagingRecommended} onChange={setImagingRecommended} />
        </FL>

        <FL label="Acute treatment plan">
          <textarea rows={2} value={acutePlan} onChange={e => setAcutePlan(e.target.value)}
            placeholder="e.g. Sumatriptan 50mg at onset + Domperidone 10mg; take early; rest in dark quiet room; avoid opioids…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
        </FL>

        <Gate label="Preventive treatment indicated?" value={needsPreventive} onChange={setNeedsPreventive}>
          <FL label="Preventive treatment plan">
            <textarea rows={2} value={preventivePlan} onChange={e => setPreventivePlan(e.target.value)}
              placeholder="e.g. Start Propranolol 40mg OD; titrate to 80mg after 4 weeks; target ≥50% reduction in attacks; review in 8 weeks…"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
          </FL>
        </Gate>

        {allMidasFilled && (
          <div className={`px-4 py-3 rounded-xl border ${g.bg}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">MIDAS Score</p>
                <p className={`text-sm font-bold ${g.color}`}>{midasScore} — Grade {g.grade}: {g.label}</p>
              </div>
              {midasScore >= 11 && (
                <span className="text-xs font-semibold text-white bg-purple-600 px-2.5 py-1 rounded-full shrink-0">
                  Preventive indicated
                </span>
              )}
            </div>
          </div>
        )}

        <FL label="Referrals">
          <Pills multi options={[
            'Neurology OPD (routine)',
            'Neurology (urgent)',
            'Ophthalmology (fundoscopy / visual field)',
            'Gynaecology (hormonal / menstrual migraine)',
            'Psychiatry (comorbid anxiety / depression)',
            'Physiotherapy (cervicogenic / posture)',
            'Pain clinic (refractory cases)',
            'Dietitian (trigger identification)',
            'Social worker (disability / work impact)',
          ]}
            value={referrals} onChange={setReferrals} />
        </FL>

        <FL label="Headache diary">
          <Pills options={[
            'Recommend paper diary (date / duration / severity / triggers / meds)',
            'Recommend app — Migraine Buddy',
            'Recommend app — N1-Headache',
            'Already maintaining diary',
            'Not recommended at this time',
          ]}
            value={haDiary} onChange={setHaDiary} />
        </FL>

        <FL label="Lifestyle advice given">
          <Pills multi options={[
            'Regular meal times — avoid fasting',
            'Adequate hydration (2–3 L/day)',
            'Regular consistent sleep schedule',
            'Stress management / yoga / pranayama',
            'Avoid identified food triggers',
            'Screen time limits / blue-light glasses',
            'Regular aerobic exercise (30 min/day)',
            'Gradual caffeine reduction',
            'Sun protection (hat / sunglasses outdoors)',
            'Avoid head bath with cold water',
            'Smoking cessation',
            'Alcohol reduction',
          ]}
            value={lifestyleAdvice} onChange={setLifestyleAdvice} />
        </FL>

        <div className="grid grid-cols-2 gap-4">
          <FL label="Review / follow-up date">
            <input type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </FL>
        </div>

        <FL label="Plan / counselling notes">
          <textarea rows={3} value={planNotes} onChange={e => setPlanNotes(e.target.value)}
            placeholder="Overall clinical impression, goals, patient education, prognosis, concerns raised…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
        </FL>
      </div>
    )
  }

  const stageContent = [
    renderStage1, renderStage2, renderStage3,
    renderStage4, renderStage5, renderStage6, renderStage7,
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 rounded-lg">
              <Brain size={16} className="text-purple-600" />
            </div>
            <div>
              <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Migraine & Headache</span>
              <span className="text-xs text-gray-400 ml-2">Neurology Assessment · ICHD-3</span>
            </div>
          </div>
          {redFlagCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-full px-3 py-1 shrink-0">
              <AlertTriangle size={12} className="text-red-500" />
              <span className="text-xs font-bold text-red-600">{redFlagCount} Red Flag{redFlagCount > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Stage tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide">
          {STAGES.map(s => (
            <button key={s.id} type="button" onClick={() => setStage(s.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                stage === s.id
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-purple-300'
              }`}>
              {s.label}
              {stageDone[s.id] && stage !== s.id && s.id !== 6 && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
              )}
              {s.id === 6 && redFlagCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Stage content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {stageContent[stage - 1]()}
        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setStage(s => Math.max(1, s - 1))} disabled={stage === 1}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-all">
            ← Back
          </button>
          <span className="text-xs text-gray-400 tabular-nums">{stage} / {STAGES.length}</span>
          <button type="button" onClick={() => setStage(s => Math.min(STAGES.length, s + 1))} disabled={stage === STAGES.length}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-all">
            Next →
          </button>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Assessment'}
          </button>
        </div>
      </div>
    </div>
  )
}
