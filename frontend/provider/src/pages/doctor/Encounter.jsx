import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doctorApi, patientsApi, labApi, encountersApi } from '../../api'
import api from '../../api/client'
import { PageLoader } from '../../components/ui/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import {
  ArrowLeft, FileText, Pill, FlaskConical, Save, CheckCircle, Plus, Trash2,
  Lock, PenLine, BedDouble, X, ChevronDown, ChevronRight, Search,
  AlertCircle, Stethoscope, ClipboardList, Edit2, Activity, Heart,
  BookOpen, Microscope, Image, MessageSquare, Calendar, ChevronUp,
  CheckSquare, Printer, Star, Lightbulb, ClipboardCheck, Loader2,
} from 'lucide-react'
import VitalsForm from '../../components/clinical/VitalsForm'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const calcAge = dob =>
  dob ? Math.floor((Date.now() - new Date(dob)) / (365.25 * 86400000)) : null

function nextDate(days) {
  return new Date(Date.now() + parseInt(days || 0) * 86400000)
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Search cache (module-level, 5-min TTL, max 80 entries) ──────────────────
const _cache = new Map()
function cacheGet(key) {
  const e = _cache.get(key)
  if (!e) return null
  if (Date.now() - e.ts > 300000) { _cache.delete(key); return null }
  return e.data
}
function cachePut(key, data) {
  if (_cache.size > 80) _cache.delete(_cache.keys().next().value)
  _cache.set(key, { data, ts: Date.now() })
}

// ─── ICD-10 smart suggestions ─────────────────────────────────────────────────
const ICD10_DRUG_HINTS = {
  A: ['amoxicillin', 'azithromycin', 'metronidazole', 'cefuroxime'],
  B: ['antiviral', 'antimalarial', 'ivermectin', 'albendazole'],
  C: ['atorvastatin', 'amlodipine', 'metoprolol', 'aspirin', 'ramipril'],
  D: ['folic acid', 'iron supplement', 'vitamin B12', 'prednisolone'],
  E: ['metformin', 'insulin', 'levothyroxine', 'vitamin D', 'calcium'],
  F: ['sertraline', 'escitalopram', 'alprazolam', 'quetiapine'],
  G: ['gabapentin', 'carbamazepine', 'levodopa', 'sumatriptan'],
  H: ['timolol eye drops', 'ciprofloxacin ear drops', 'betahistine'],
  I: ['aspirin', 'clopidogrel', 'furosemide', 'enalapril', 'digoxin'],
  J: ['amoxicillin', 'salbutamol', 'budesonide', 'azithromycin', 'prednisolone'],
  K: ['omeprazole', 'pantoprazole', 'metoclopramide', 'ondansetron'],
  L: ['cetirizine', 'hydrocortisone cream', 'clotrimazole', 'permethrin'],
  M: ['ibuprofen', 'diclofenac', 'paracetamol', 'calcium', 'vitamin D'],
  N: ['paracetamol', 'ibuprofen', 'tramadol', 'pregabalin'],
  O: ['folic acid', 'iron', 'progesterone', 'dydrogesterone'],
  P: ['amoxicillin', 'paracetamol syrup', 'salbutamol syrup', 'vitamin D3'],
  Q: ['metronidazole', 'albendazole', 'mebendazole'],
  R: ['paracetamol', 'cetirizine', 'ibuprofen', 'loperamide'],
  S: ['diclofenac gel', 'ibuprofen', 'tetanus toxoid', 'antiseptic'],
  T: ['activated charcoal', 'naloxone', 'atropine'],
  U: ['trimethoprim', 'nitrofurantoin', 'ciprofloxacin'],
  V: ['counselling', 'referral', 'supportive care'],
  W: ['folic acid', 'iron', 'calcium', 'vitamin D'],
  X: ['trauma care', 'analgesia', 'referral'],
  Y: ['analgesia', 'referral', 'physiotherapy'],
  Z: ['multivitamin', 'vaccine', 'counselling'],
}

const ICD10_TEST_HINTS = {
  A: ['CBC', 'CRP', 'Blood Culture', 'Urine R/E', 'ESR'],
  B: ['CBC', 'Malaria Antigen', 'Dengue NS1', 'LFT', 'Widal'],
  C: ['ECG', 'Echo', 'Lipid Profile', 'CBC', 'BMP'],
  D: ['CBC', 'Peripheral Smear', 'Iron Studies', 'Vitamin B12', 'Folate'],
  E: ['HbA1c', 'Fasting Sugar', 'Thyroid Profile', 'Lipid Profile', 'Urine Microalbumin'],
  F: ['No specific labs', 'CBC', 'Thyroid Profile', 'Vitamin D', 'B12'],
  G: ['MRI Brain', 'EEG', 'CBC', 'Vitamin B12', 'Blood Sugar'],
  H: ['Audiometry', 'Visual Acuity', 'IOP', 'Tympanometry'],
  I: ['ECG', 'Troponin', 'Lipid Profile', 'Echo', 'Chest X-Ray', 'CBC'],
  J: ['Chest X-Ray', 'CBC', 'CRP', 'Sputum Culture', 'Spirometry'],
  K: ['USG Abdomen', 'LFT', 'Amylase', 'Lipase', 'H. pylori Test'],
  L: ['KOH Mount', 'Skin Biopsy', 'Patch Test', 'CBC', 'IgE'],
  M: ['X-Ray Joint', 'Uric Acid', 'ESR', 'CRP', 'Calcium', 'Vitamin D'],
  N: ['MRI Spine', 'CBC', 'Blood Sugar', 'Vitamin B12', 'EMG/NCS'],
  O: ['USG Pelvis', 'Beta hCG', 'CBC', 'Urine Culture', 'Pap Smear'],
  P: ['CBC', 'Blood Culture', 'Urine R/E', 'Chest X-Ray', 'Blood Sugar'],
  Q: ['Stool Exam', 'Urine R/E', 'CBC', 'Culture Sensitivity'],
  R: ['CBC', 'CRP', 'Blood Sugar', 'Urine R/E', 'Chest X-Ray'],
  S: ['X-Ray', 'CBC', 'Blood Group', 'Wound Swab C/S'],
  T: ['Toxicology Screen', 'Liver Function', 'Renal Function', 'CBC'],
  U: ['Urine R/E', 'Urine Culture', 'Renal Function', 'USG KUB'],
  V: ['Counselling', 'Social Work Referral'],
  W: ['CBC', 'Blood Group & Rh', 'Urine R/E', 'USG Obstetric'],
  X: ['X-Ray', 'CT Scan', 'CBC', 'Cross-match'],
  Y: ['X-Ray', 'CBC', 'Wound Swab C/S'],
  Z: ['CBC', 'Urine R/E', 'Blood Sugar', 'Immunisation Check'],
}

const ICD10_TIPS = {
  J: ['Advise steam inhalation', 'Avoid cold drinks and exposure', 'Complete antibiotic course', 'Follow up if no improvement in 5 days'],
  E: ['Monitor blood glucose daily', 'Low sugar diet counselling', 'Regular exercise 30 min/day', 'Avoid skipping meals'],
  I: ['Low salt diet (<5g/day)', 'No smoking', 'Regular BP monitoring', 'Avoid strenuous activity'],
  K: ['Avoid spicy and oily food', 'Small frequent meals', 'Avoid NSAIDs', 'Elevate head of bed'],
  M: ['Physiotherapy advised', 'Warm compresses', 'Weight reduction if overweight', 'Avoid prolonged standing'],
  N: ['Adequate rest', 'Ergonomic posture advice', 'Avoid lifting heavy weights'],
  L: ['Keep skin dry and clean', 'Avoid scratching', 'Wear cotton clothing', 'Avoid allergens'],
}

// ─── Section definitions ──────────────────────────────────────────────────────
const SECTION_DEFS = [
  { key: 'complaints',    label: 'History of Illness',    icon: FileText,      unique: true  },
  { key: 'past_history',  label: 'Past History',          icon: BookOpen,      unique: true  },
  { key: 'examination',   label: 'Examination Findings',  icon: Activity,      unique: true  },
  { key: 'assessment',    label: 'Assessment / Diagnosis',icon: Stethoscope,   unique: true  },
  { key: 'lab',           label: 'Lab Orders',            icon: Microscope,    unique: true  },
  { key: 'imaging',       label: 'Imaging Orders',        icon: Image,         unique: true  },
  { key: 'medications',   label: 'Medications',           icon: Pill,          unique: true  },
  { key: 'counselling',   label: 'Counselling',           icon: MessageSquare, unique: true  },
  { key: 'followup',      label: 'Follow-up',             icon: Calendar,      unique: true  },
]

const FOLLOWUP_DAYS   = ['7', '10', '14', '15', '20', '30', '45', '60', '90']
const FREQ_OPTIONS    = ['OD', 'BD', 'TDS', 'QID', 'SOS', 'Weekly', 'Alternate days', 'Monthly']
const TIMING_OPTIONS  = ['Morning', 'Afternoon', 'Evening', 'Night', 'Bedtime']
const DURATION_OPTIONS = ['3 days', '5 days', '7 days', '10 days', '14 days', '30 days', '60 days', '90 days', 'Ongoing']
const FOOD_OPTIONS    = ['Before food', 'After food', 'With food', 'Empty stomach', 'Bedtime']
const ROUTES          = ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhaled', 'Sublingual', 'Nasal', 'Ophthalmic', 'Rectal']

const ROUTE_MAP = { PO: 'Oral', IV: 'IV', IM: 'IM', SC: 'SC', PR: 'Rectal', Top: 'Topical', IN: 'Inhaled', SL: 'Sublingual', Op: 'Ophthalmic' }
const FORM_LABEL = { Tab: 'Tab', Cap: 'Cap', Syr: 'Syr', Inj: 'Inj', Supp: 'Supp', Cream: 'Cream', Drop: 'Drop', Gel: 'Gel', Oint: 'Oint', Patch: 'Patch', Sol: 'Sol' }

// ─── Demographics Bar ─────────────────────────────────────────────────────────
function DemographicsBar({ patient = {}, vitals = {}, complaint }) {
  const age = calcAge(patient.date_of_birth)
  const genderShort = patient.gender === 'male' ? 'M' : patient.gender === 'female' ? 'F' : patient.gender

  return (
    <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm px-4 md:px-6 py-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-blue-700">
              {patient.full_name?.[0] || '?'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
              {patient.full_name || '—'}
            </p>
            <p className="text-xs text-gray-500">
              {[genderShort, age != null && `${age}y`, patient.blood_group].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>

        {/* Vitals inline */}
        {vitals && Object.keys(vitals).some(k => vitals[k]) && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600 border-l border-gray-200 pl-4">
            {vitals.blood_pressure && <span>BP: <b>{vitals.blood_pressure}</b></span>}
            {vitals.pulse && <span>P: <b>{vitals.pulse}</b></span>}
            {vitals.temperature && <span>T: <b>{vitals.temperature}°</b></span>}
            {vitals.oxygen_saturation && <span>SpO2: <b>{vitals.oxygen_saturation}%</b></span>}
            {vitals.weight && <span>Wt: <b>{vitals.weight}kg</b></span>}
            {vitals.height && <span>Ht: <b>{vitals.height}cm</b></span>}
          </div>
        )}

        {complaint && (
          <div className="text-xs text-gray-500 border-l border-gray-200 pl-4 truncate max-w-xs">
            CC: <span className="text-gray-700">{complaint}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Inline search bar ────────────────────────────────────────────────────────
function InlineSearch({ placeholder = 'Search…', value, onChange, loading, onClear }) {
  return (
    <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-md px-2 py-0.5">
      {loading
        ? <Loader2 size={12} className="text-gray-400 animate-spin flex-shrink-0" />
        : <Search size={12} className="text-gray-400 flex-shrink-0" />
      }
      <input
        className="text-xs bg-transparent outline-none w-32 placeholder-gray-400"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {value && (
        <button onClick={onClear} className="text-gray-400 hover:text-gray-600">
          <X size={10} />
        </button>
      )}
    </div>
  )
}

// ─── Section Divider ──────────────────────────────────────────────────────────
function SectionDivider({ icon: Icon, label, onRemove, rightSlot }) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-gray-100 mb-3">
      {Icon && <Icon size={15} className="text-blue-500 flex-shrink-0" />}
      <span className="text-sm font-semibold text-gray-700 flex-1">{label}</span>
      {rightSlot}
      {onRemove && (
        <button onClick={onRemove} className="text-gray-300 hover:text-red-400 ml-1">
          <X size={13} />
        </button>
      )}
    </div>
  )
}

// ─── Right Smart Panel ────────────────────────────────────────────────────────
function RightSmartPanel({
  suggestedMeds, suggestedTests, loading, tips,
  favoriteMeds, onAddFav, onRemoveFav, onQuickMed, onQuickTest,
  rightTab, setRightTab,
}) {
  return (
    <div className="w-72 xl:w-80 flex-shrink-0 hidden lg:flex flex-col sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto border-l border-gray-100 bg-gray-50 pb-8">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10">
        {[
          { id: 'suggestions', icon: <Lightbulb size={13} />, label: 'Suggestions' },
          { id: 'mymeds',      icon: <Star size={13} />,      label: 'My Meds' },
          { id: 'tips',        icon: <ClipboardCheck size={13} />, label: 'Tips' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setRightTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium border-b-2 transition-colors
              ${rightTab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="p-3 space-y-3">
        {/* Suggestions tab */}
        {rightTab === 'suggestions' && (
          <>
            {loading && (
              <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                <Loader2 size={13} className="animate-spin" /> Loading suggestions…
              </div>
            )}
            {!loading && suggestedMeds.length === 0 && suggestedTests.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">
                Add a working diagnosis in Initial Assessment to see suggestions.
              </p>
            )}

            {suggestedMeds.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                  <Pill size={11} /> Suggested Medications
                </p>
                <div className="space-y-1">
                  {suggestedMeds.map((m, i) => (
                    <div key={i} className="flex items-center justify-between bg-white rounded border border-gray-100 px-2 py-1.5">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{m.generic_name || m.name}</p>
                        {m.generic_name && m.name !== m.generic_name && (
                          <p className="text-[10px] text-gray-400 truncate">{m.name}</p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0 ml-1">
                        <button
                          onClick={() => onAddFav(m)}
                          title="Add to My Meds"
                          className="text-gray-300 hover:text-yellow-500 p-0.5"
                        >
                          <Star size={11} />
                        </button>
                        <button
                          onClick={() => onQuickMed(m)}
                          className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded px-1.5 py-0.5"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {suggestedTests.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                  <Microscope size={11} /> Suggested Tests
                </p>
                <div className="space-y-1">
                  {suggestedTests.map((t, i) => (
                    <div key={i} className="flex items-center justify-between bg-white rounded border border-gray-100 px-2 py-1.5">
                      <p className="text-xs text-gray-800 truncate">{t}</p>
                      <button
                        onClick={() => onQuickTest(t)}
                        className="text-xs bg-green-50 text-green-600 hover:bg-green-100 rounded px-1.5 py-0.5 flex-shrink-0 ml-1"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* My Meds tab */}
        {rightTab === 'mymeds' && (
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
              <Star size={11} className="text-yellow-500" /> My Favorite Medications
            </p>
            {favoriteMeds.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">
                Star any suggestion to add it here for quick prescribing.
              </p>
            )}
            <div className="space-y-1">
              {favoriteMeds.map((m, i) => (
                <div key={i} className="flex items-center justify-between bg-white rounded border border-gray-100 px-2 py-1.5">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{m.generic_name || m.name}</p>
                    {m.generic_name && m.name !== m.generic_name && (
                      <p className="text-[10px] text-gray-400 truncate">{m.name}</p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-1">
                    <button
                      onClick={() => onQuickMed(m)}
                      className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded px-1.5 py-0.5"
                    >
                      + Add
                    </button>
                    <button
                      onClick={() => onRemoveFav(m)}
                      className="text-gray-300 hover:text-red-400 p-0.5"
                    >
                      <X size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips tab */}
        {rightTab === 'tips' && (
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
              <ClipboardCheck size={11} /> Counselling Tips
            </p>
            {tips.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">
                Add a working diagnosis to see relevant counselling tips.
              </p>
            )}
            <ul className="space-y-1.5">
              {tips.map((t, i) => (
                <li key={i} className="text-xs text-gray-700 bg-white border border-gray-100 rounded px-2 py-1.5 flex items-start gap-1.5">
                  <CheckSquare size={11} className="text-green-500 mt-0.5 flex-shrink-0" /> {t}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Add Section Menu ─────────────────────────────────────────────────────────
function AddSectionMenu({ sections, onAdd }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus size={13} /> Add Section
      </button>
      {open && (
        <div className="absolute bottom-full mb-1 right-0 bg-white border border-gray-200 rounded-xl shadow-xl w-52 z-50 overflow-hidden">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-3 pt-2 pb-1">
            Add to chart
          </p>
          {sections.length === 0 && (
            <p className="text-xs text-gray-400 px-3 pb-3">All sections added</p>
          )}
          {sections.map(s => {
            const Icon = s.icon
            return (
              <button
                key={s.key}
                onClick={() => { onAdd(s.key); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <Icon size={14} className="text-gray-400" />
                {s.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Chip selector ────────────────────────────────────────────────────────────
function ChipSelect({ options, selected, onToggle, multi = true }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => {
        const active = multi ? selected?.includes(opt) : selected === opt
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
              active
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
            }`}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

// ─── Drug search hook (expanded: one entry per formulation) ──────────────────
function expandDrugResults(drugs) {
  const entries = []
  for (const d of drugs) {
    const fmts = d.formulations || []
    if (fmts.length === 0) {
      entries.push({ ...d, formulation: null, label: d.generic })
    } else {
      for (const fmt of fmts) {
        const doses = (fmt.doses || []).map(n => `${n} ${fmt.unit || 'mg'}`)
        const brand = d.brands?.[0] || ''
        const label = `${d.generic}${doses.length ? ` ${doses[0]}` : ''} · ${FORM_LABEL[fmt.form] || fmt.form}${brand ? ` (${brand})` : ''}`
        entries.push({ ...d, formulation: fmt, label })
      }
    }
  }
  return entries
}

function useDrugSearch() {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const timerRef              = useRef(null)

  const search = useCallback(q => {
    setQuery(q)
    clearTimeout(timerRef.current)
    if (!q.trim()) { setResults([]); return }
    const cached = cacheGet(`drug:${q}`)
    if (cached) { setResults(cached); return }
    setLoading(true)
    timerRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/terminology/drugs/search', { params: { q, limit: 10 } })
        const raw = Array.isArray(res) ? res : (res?.data || res?.results || [])
        const expanded = expandDrugResults(raw)
        cachePut(`drug:${q}`, expanded)
        setResults(expanded)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 350)
  }, [])

  const clear = useCallback(() => { setQuery(''); setResults([]) }, [])
  return { query, results, loading, search, clear }
}

// ─── Drug intelligence hook (counselling + food interactions) ─────────────────
function useDrugIntelligence() {
  const [intel, setIntel] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async (generic) => {
    if (!generic) { setIntel(null); return }
    const cKey = `intel:${generic}`
    const cached = cacheGet(cKey)
    if (cached) { setIntel(cached); return }
    setLoading(true)
    try {
      const [counselRes, foodRes] = await Promise.all([
        api.get('/terminology/drugs/counselling', { params: { generic } }).catch(() => null),
        api.get('/terminology/drugs/food-interactions', { params: { generic } }).catch(() => null),
      ])
      const tips = counselRes?.tips || counselRes?.data?.tips || []
      const food = Array.isArray(foodRes) ? foodRes : (foodRes?.data || [])
      const result = { tips, food }
      cachePut(cKey, result)
      setIntel(result)
    } catch { setIntel(null) }
    finally { setLoading(false) }
  }, [])

  const clear = useCallback(() => setIntel(null), [])
  return { intel, loading, fetch, clear }
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Encounter() {
  const { id: encounterId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [finalising, setFinalising] = useState(false)
  const [error,      setError]      = useState(null)

  const [data,       setData]       = useState(null)
  const [patient,    setPatient]    = useState(null)
  const [vitals,     setVitals]     = useState(null)
  const [savedVitals, setSavedVitals] = useState({})

  // Active sections
  const [sections, setSections] = useState([])

  // Section data
  const [complaint,    setComplaint]    = useState('')
  const [symptoms,     setSymptoms]     = useState([])
  const [pastHistory,  setPastHistory]  = useState('')
  const [examination,  setExamination]  = useState('')
  const [assessment,   setAssessment]   = useState('')
  const [rxItems,      setRxItems]      = useState([])
  const [labOrders,    setLabOrders]    = useState([])
  const [imagingOrders, setImagingOrders] = useState([])
  const [counselling,  setCounselling]  = useState('')
  const [followupDays, setFollowupDays] = useState('')
  const [followupNote, setFollowupNote] = useState('')

  // Initial Assessment (working diagnosis)
  const [initDx,          setInitDx]          = useState([])
  const [initDxSearch,    setInitDxSearch]     = useState('')
  const [initDxResults,   setInitDxResults]    = useState([])
  const [loadingDxSearch, setLoadingDxSearch]  = useState(false)
  const dxTimerRef = useRef(null)

  // Smart suggestions
  const [suggestedMeds,       setSuggestedMeds]       = useState([])
  const [suggestedTests,       setSuggestedTests]      = useState([])
  const [smartTips,            setSmartTips]           = useState([])
  const [loadingSuggestions,   setLoadingSuggestions]  = useState(false)
  const [rightTab,             setRightTab]            = useState('suggestions')

  // Doctor favorites
  const favKey = `fav_meds_${user?.id || 'dr'}`
  const [favoriteMeds, setFavoriteMeds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(favKey) || '[]') } catch { return [] }
  })

  // Symptom search
  const [symSearch,   setSymSearch]   = useState('')
  const [symResults,  setSymResults]  = useState([])
  const [loadingSym,  setLoadingSym]  = useState(false)
  const symTimerRef = useRef(null)

  // Drug search (for medications section)
  const drugSearch = useDrugSearch()
  const drugIntel  = useDrugIntelligence()
  const [rxInteractions, setRxInteractions] = useState([])

  // Lab/Imaging search
  const [labSearch,     setLabSearch]     = useState('')
  const [labResults,    setLabResults]    = useState([])
  const [loadingLab,    setLoadingLab]    = useState(false)
  const labTimerRef = useRef(null)

  const [imgSearch,     setImgSearch]     = useState('')
  const [imgResults,    setImgResults]    = useState([])
  const [loadingImg,    setLoadingImg]    = useState(false)
  const imgTimerRef = useRef(null)

  // Dx search (for assessment section)
  const [dxSearch,   setDxSearch]   = useState('')
  const [dxResults,  setDxResults]  = useState([])
  const [loadingDx,  setLoadingDx]  = useState(false)
  const aDxTimerRef = useRef(null)

  // Drug mini-form
  const [rxDraft, setRxDraft] = useState({
    drug: null, formulation: null, dosage: '', route: 'Oral', brand: '',
    freq: [], timing: [], duration: '', food: '', notes: '',
  })

  // ─── Load encounter ─────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    doctorApi.getEncounter(encounterId)
      .then(enc => {
        setData(enc)
        setPatient(enc.patient || null)

        // Map vitals to shape used by DemographicsBar / VitalsForm
        if (enc.vitals) {
          const v = enc.vitals
          setSavedVitals({
            ...v,
            blood_pressure: v.blood_pressure_systolic
              ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}`
              : null,
            pulse:             v.pulse_rate,
            weight:            v.weight_kg,
            height:            v.height_cm,
          })
        }

        const sn = enc.soap_note || {}

        // Determine sections to show from what's already filled
        const populated = []
        if (enc.triage_complaint || sn.patient_complaints || sn.reason_for_visit) populated.push('complaints')
        if (sn.past_history) populated.push('past_history')
        if (sn.objective) populated.push('examination')
        if (sn.assessment || sn.discharge_assessment) populated.push('assessment')
        if (enc.lab_orders?.length) populated.push('lab')
        if (enc.prescriptions?.length) populated.push('medications')
        if (sn.cautions_followup) populated.push('counselling')
        if (sn.follow_up_days) populated.push('followup')
        setSections(populated.length ? populated : ['complaints', 'assessment', 'medications'])

        setComplaint(enc.triage_complaint || sn.reason_for_visit || sn.patient_complaints || '')
        setSymptoms([])
        setPastHistory(sn.past_history || '')
        setExamination(sn.objective || '')
        setAssessment(sn.assessment || sn.discharge_assessment || '')

        // Map structured prescriptions → rxItems
        const rxLoaded = enc.prescriptions?.flatMap(pr =>
          (pr.items || []).map(item => ({
            drug_id:   null,
            drug_name: item.medicine_name,
            dosage:    item.dosage || '',
            route:     'Oral',
            brand:     '',
            freq:      item.frequency ? [item.frequency] : [],
            timing:    [],
            duration:  item.duration || '',
            food:      item.instructions || '',
            notes:     '',
          }))
        ) || []
        setRxItems(rxLoaded)

        // Map lab order items → { id, name, notes }
        const labLoaded = enc.lab_orders?.flatMap(lo =>
          (lo.items || []).map(item => ({ id: item.id || Date.now(), name: item.test_name, notes: '' }))
        ) || []
        setLabOrders(labLoaded)

        setImagingOrders([])
        setCounselling(sn.cautions_followup || '')
        setFollowupDays(sn.follow_up_days || '')
        setFollowupNote('')
        setInitDx([])
      })
      .catch(() => setError('Failed to load encounter'))
      .finally(() => setLoading(false))
  }, [encounterId])

  // ─── Suggestions from working diagnosis ─────────────────────────────────────
  const triggerSuggestions = useCallback(async (dxList) => {
    if (!dxList?.length) {
      setSuggestedMeds([]); setSuggestedTests([]); setSmartTips([]); return
    }
    setLoadingSuggestions(true)
    try {
      const cats = [...new Set(dxList.map(d => (d.code || '').charAt(0).toUpperCase()).filter(Boolean))]
      const drugHints = [...new Set(cats.flatMap(c => ICD10_DRUG_HINTS[c] || []))]
      const testHints = [...new Set(cats.flatMap(c => ICD10_TEST_HINTS[c] || []))]
      const tips      = [...new Set(cats.flatMap(c => ICD10_TIPS[c] || []))]

      setSmartTips(tips)
      setSuggestedTests(testHints.slice(0, 8))

      const drugFetches = drugHints.slice(0, 6).map(async hint => {
        const cacheKey = `drug:${hint}`
        const cached = cacheGet(cacheKey)
        if (cached) return cached[0]
        try {
          const res = await api.get('/terminology/drugs/search', { params: { q: hint, limit: 1 } })
          const data = Array.isArray(res) ? res : (res?.data || res?.results || [])
          if (data.length) cachePut(cacheKey, data)
          return data[0]
        } catch { return null }
      })
      const drugs = (await Promise.allSettled(drugFetches))
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value)
      setSuggestedMeds(drugs)
    } catch { /* silent */ }
    finally { setLoadingSuggestions(false) }
  }, [])

  // ─── Dx search (Initial Assessment) ─────────────────────────────────────────
  const searchInitDx = useCallback(q => {
    setInitDxSearch(q)
    clearTimeout(dxTimerRef.current)
    if (!q.trim()) { setInitDxResults([]); return }
    const cached = cacheGet(`dx:${q}`)
    if (cached) { setInitDxResults(cached); return }
    setLoadingDxSearch(true)
    dxTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/terminology/search', { params: { category: 'diagnosis', q, limit: 8 } })
        const data = Array.isArray(res) ? res : (res?.data || res?.results || [])
        cachePut(`dx:${q}`, data)
        setInitDxResults(data)
      } catch { setInitDxResults([]) }
      finally { setLoadingDxSearch(false) }
    }, 350)
  }, [])

  const addInitDx = useCallback(dx => {
    setInitDx(prev => {
      if (prev.find(d => d.code === dx.code)) return prev
      const next = [...prev, dx]
      triggerSuggestions(next)
      return next
    })
    setInitDxSearch(''); setInitDxResults([])
    setRightTab('suggestions')
  }, [triggerSuggestions])

  const removeInitDx = useCallback(code => {
    setInitDx(prev => {
      const next = prev.filter(d => d.code !== code)
      triggerSuggestions(next)
      return next
    })
  }, [triggerSuggestions])

  // ─── Symptom search ──────────────────────────────────────────────────────────
  const searchSymptoms = useCallback(q => {
    setSymSearch(q)
    clearTimeout(symTimerRef.current)
    if (!q.trim()) { setSymResults([]); return }
    const cached = cacheGet(`sym:${q}`)
    if (cached) { setSymResults(cached); return }
    setLoadingSym(true)
    symTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/terminology/search', { params: { category: 'symptom', q, limit: 8 } })
        const data = Array.isArray(res) ? res : (res?.data || res?.results || [])
        cachePut(`sym:${q}`, data)
        setSymResults(data)
      } catch { setSymResults([]) }
      finally { setLoadingSym(false) }
    }, 350)
  }, [])

  // ─── Lab search ──────────────────────────────────────────────────────────────
  const searchLab = useCallback(q => {
    setLabSearch(q)
    clearTimeout(labTimerRef.current)
    if (!q.trim()) { setLabResults([]); return }
    const cached = cacheGet(`lab:${q}`)
    if (cached) { setLabResults(cached); return }
    setLoadingLab(true)
    labTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/lab/tests/search', { params: { q, limit: 8 } })
        const data = Array.isArray(res) ? res : (res?.data || res?.results || [])
        cachePut(`lab:${q}`, data)
        setLabResults(data)
      } catch { setLabResults([]) }
      finally { setLoadingLab(false) }
    }, 350)
  }, [])

  // ─── Imaging search ──────────────────────────────────────────────────────────
  const searchImg = useCallback(q => {
    setImgSearch(q)
    clearTimeout(imgTimerRef.current)
    if (!q.trim()) { setImgResults([]); return }
    const cached = cacheGet(`img:${q}`)
    if (cached) { setImgResults(cached); return }
    setLoadingImg(true)
    imgTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/lab/tests/search', { params: { q, type: 'imaging', limit: 8 } })
        const data = Array.isArray(res) ? res : (res?.data || res?.results || [])
        cachePut(`img:${q}`, data)
        setImgResults(data)
      } catch { setImgResults([]) }
      finally { setLoadingImg(false) }
    }, 350)
  }, [])

  // ─── Assessment Dx search ─────────────────────────────────────────────────────
  const searchDx = useCallback(q => {
    setDxSearch(q)
    clearTimeout(aDxTimerRef.current)
    if (!q.trim()) { setDxResults([]); return }
    const cached = cacheGet(`dx:${q}`)
    if (cached) { setDxResults(cached); return }
    setLoadingDx(true)
    aDxTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/terminology/search', { params: { category: 'diagnosis', q, limit: 8 } })
        const data = Array.isArray(res) ? res : (res?.data || res?.results || [])
        cachePut(`dx:${q}`, data)
        setDxResults(data)
      } catch { setDxResults([]) }
      finally { setLoadingDx(false) }
    }, 350)
  }, [])

  // ─── Favorites ───────────────────────────────────────────────────────────────
  const addToFavorites = useCallback(med => {
    setFavoriteMeds(prev => {
      if (prev.find(m => m.id === med.id)) return prev
      const next = [...prev, med]
      localStorage.setItem(favKey, JSON.stringify(next))
      return next
    })
  }, [favKey])

  const removeFromFavorites = useCallback(med => {
    setFavoriteMeds(prev => {
      const next = prev.filter(m => m.id !== med.id)
      localStorage.setItem(favKey, JSON.stringify(next))
      return next
    })
  }, [favKey])

  // ─── Quick add from panel ─────────────────────────────────────────────────────
  const quickAddMed = useCallback(drug => {
    if (!sections.includes('medications')) setSections(prev => [...prev, 'medications'])
    setRxItems(prev => {
      if (prev.find(r => r.drug_id === drug.id)) return prev
      return [...prev, {
        drug_id: drug.id,
        drug_name: drug.generic_name || drug.name,
        dosage: '', route: 'Oral', brand: '',
        freq: [], timing: [], duration: '', food: '', notes: '',
      }]
    })
  }, [sections])

  const quickAddTest = useCallback(testName => {
    if (!sections.includes('lab')) setSections(prev => [...prev, 'lab'])
    setLabOrders(prev => {
      if (prev.find(l => l.name === testName)) return prev
      return [...prev, { name: testName, id: Date.now(), notes: '' }]
    })
  }, [sections])

  // ─── Rx helpers ───────────────────────────────────────────────────────────────
  const addRxItem = async () => {
    if (!rxDraft.drug) return
    const item = {
      drug_id:   rxDraft.drug.id,
      drug_name: rxDraft.drug.generic_name || rxDraft.drug.name || rxDraft.drug.generic,
      dosage:    rxDraft.dosage,
      route:     rxDraft.route,
      brand:     rxDraft.brand,
      freq:      rxDraft.freq,
      timing:    rxDraft.timing,
      duration:  rxDraft.duration,
      food:      rxDraft.food,
      notes:     rxDraft.notes,
    }
    const newList = [...rxItems, item]
    setRxItems(newList)
    setRxDraft({ drug: null, formulation: null, dosage: '', route: 'Oral', brand: '', freq: [], timing: [], duration: '', food: '', notes: '' })
    drugSearch.clear()
    drugIntel.clear()
    // Check interactions across the updated full med list
    const generics = newList.map(rx => rx.drug_name).filter(Boolean)
    if (generics.length >= 2) {
      try {
        const res = await api.post('/terminology/drugs/check-interactions', { generics })
        setRxInteractions(Array.isArray(res) ? res : (res?.data || []))
      } catch { /* non-fatal */ }
    }
  }

  const removeRxItem = idx => {
    const newList = rxItems.filter((_, i) => i !== idx)
    setRxItems(newList)
    const generics = newList.map(rx => rx.drug_name).filter(Boolean)
    if (generics.length >= 2) {
      api.post('/terminology/drugs/check-interactions', { generics })
        .then(res => setRxInteractions(Array.isArray(res) ? res : (res?.data || [])))
        .catch(() => {})
    } else {
      setRxInteractions([])
    }
  }

  const toggleRxChip = (field, val) => {
    setRxDraft(d => {
      const arr = d[field] || []
      return { ...d, [field]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] }
    })
  }

  // ─── Save / Finalise ─────────────────────────────────────────────────────────
  const buildNotes = () => ({
    sections:       sections.map(k => ({ key: k })),
    complaint,
    symptoms,
    past_history:   pastHistory,
    examination,
    assessment,
    medications:    rxItems,
    lab_orders:     labOrders,
    imaging_orders: imagingOrders,
    counselling,
    followup_days:  followupDays,
    followup_note:  followupNote,
    init_dx:        initDx,
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      await encountersApi.save({
        appointment_id:          Number(encounterId),
        patient_complaints:      complaint,
        past_history:            pastHistory,
        investigations_findings: examination,
        discharge_assessment:    assessment,
        cautions_followup:       counselling,
        medications_prescribed:  rxItems.map(rx =>
          [rx.drug_name, rx.dosage, rx.freq.join('/'), rx.duration].filter(Boolean).join(' ')
        ).join('\n'),
        lock: false,
      })
    } catch (e) {
      setError('Save failed: ' + (e?.message || 'unknown'))
    } finally { setSaving(false) }
  }

  const handleFinalise = async () => {
    setFinalising(true)
    try {
      await doctorApi.completeEncounter(encounterId, {
        soap: {
          subjective:     [complaint, symptoms.length ? 'Symptoms: ' + symptoms.join(', ') : ''].filter(Boolean).join('\n\n'),
          objective:      examination,
          assessment:     assessment,
          plan:           counselling,
          follow_up_days: followupDays || null,
        },
        prescription: rxItems.length ? {
          items: rxItems.map(rx => ({
            medicine_name: rx.drug_name,
            dosage:        rx.dosage,
            frequency:     rx.freq.join(', '),
            duration:      rx.duration,
            instructions:  [rx.food, rx.notes].filter(Boolean).join(' '),
          }))
        } : null,
        lab_order: labOrders.length ? {
          tests: labOrders.map(l => ({ test_name: l.name }))
        } : null,
      })
      if (followupDays) {
        const due = nextDate(followupDays)
        setError('')
        // Brief confirmation before navigating back
        await new Promise(r => setTimeout(r, 100))
        navigate(-1, { state: { followUpCreated: true, followUpDays: followupDays, followUpDate: due } })
      } else {
        navigate(-1)
      }
    } catch (e) {
      setError('Finalise failed: ' + (e?.message || 'unknown'))
    } finally { setFinalising(false) }
  }

  // ─── Section helpers ──────────────────────────────────────────────────────────
  const addSection   = key => { if (!sections.includes(key)) setSections(p => [...p, key]) }
  const removeSection = key => setSections(p => p.filter(k => k !== key))

  const availableSections = SECTION_DEFS.filter(s => !sections.includes(s.key))

  // ─── Render ───────────────────────────────────────────────────────────────────
  if (loading) return <PageLoader />

  if (error && !data) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
        <p className="text-red-600 font-medium">{error}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-blue-600 hover:underline">
          Go back
        </button>
      </div>
    </div>
  )

  const isLocked = data?.status === 'completed'
  const apptDate = data?.appointment_date
    ? new Date(data.appointment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Demographics bar */}
      <DemographicsBar
        patient={patient || {}}
        vitals={savedVitals}
        complaint={complaint}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: scrollable chart ── */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">

          {/* Top bar: back + date + actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 p-1">
              <ArrowLeft size={18} />
            </button>
            <span className="text-sm text-gray-500">{apptDate}</span>
            {isLocked && (
              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                <Lock size={11} /> Finalised
              </span>
            )}
            <div className="flex-1" />
            {!isLocked && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-60"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  {saving ? 'Saving…' : 'Save Draft'}
                </button>
                <button
                  onClick={handleFinalise}
                  disabled={finalising}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60"
                >
                  {finalising ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                  {finalising ? 'Finalising…' : 'Finalise'}
                </button>
              </>
            )}
            <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2 py-1.5">
              <Printer size={13} /> Print
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Vitals section */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <SectionDivider icon={Heart} label="Vitals" />
            <VitalsForm
              patientId={patient?.id}
              appointmentId={data?.appointment_id}
              initialValues={savedVitals}
              compact
              onSaved={v => setSavedVitals(v)}
              readOnly={isLocked}
            />
          </div>

          {/* Initial Assessment (working diagnosis) */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <SectionDivider icon={Stethoscope} label="Initial Assessment (Working Diagnosis)" />
            <div className="relative">
              <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                {loadingDxSearch
                  ? <Loader2 size={14} className="text-gray-400 animate-spin" />
                  : <Search size={14} className="text-gray-400" />
                }
                <input
                  className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400"
                  placeholder="Search ICD-10 diagnosis…"
                  value={initDxSearch}
                  onChange={e => searchInitDx(e.target.value)}
                  disabled={isLocked}
                />
                {initDxSearch && (
                  <button onClick={() => { setInitDxSearch(''); setInitDxResults([]) }}>
                    <X size={13} className="text-gray-400" />
                  </button>
                )}
              </div>
              {initDxResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-40 max-h-56 overflow-y-auto mt-1">
                  {initDxResults.map((dx, i) => (
                    <button
                      key={i}
                      onClick={() => addInitDx(dx)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0"
                    >
                      <span className="font-mono text-xs text-blue-600 mr-2">{dx.code}</span>
                      {dx.description || dx.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {initDx.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2.5">
                {initDx.map(dx => (
                  <span key={dx.code} className="flex items-center gap-1 bg-blue-50 text-blue-700 text-xs rounded-full px-2.5 py-1 border border-blue-100">
                    <span className="font-mono font-semibold">{dx.code}</span>
                    <span className="max-w-[180px] truncate">{dx.description || dx.name}</span>
                    {!isLocked && (
                      <button onClick={() => removeInitDx(dx.code)} className="ml-0.5 text-blue-400 hover:text-red-400">
                        <X size={10} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
            {initDx.length > 0 && (
              <p className="text-[11px] text-gray-400 mt-2">
                Smart suggestions updated in the right panel based on this diagnosis.
              </p>
            )}
          </div>

          {/* Dynamic sections */}
          {sections.map(sectionKey => {
            const def = SECTION_DEFS.find(s => s.key === sectionKey)
            if (!def) return null
            const Icon = def.icon

            // ── History of Illness ──────────────────────────────────────────
            if (sectionKey === 'complaints') return (
              <div key={sectionKey} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <SectionDivider
                  icon={Icon}
                  label={def.label}
                  onRemove={!isLocked ? () => removeSection(sectionKey) : null}
                  rightSlot={!isLocked && (
                    <InlineSearch
                      placeholder="Search symptom…"
                      value={symSearch}
                      onChange={searchSymptoms}
                      loading={loadingSym}
                      onClear={() => { setSymSearch(''); setSymResults([]) }}
                    />
                  )}
                />
                {symResults.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg max-h-44 overflow-y-auto mb-2">
                    {symResults.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          const name = s.description || s.name
                          if (!symptoms.includes(name)) setSymptoms(p => [...p, name])
                          setSymSearch(''); setSymResults([])
                        }}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0"
                      >
                        {s.description || s.name}
                      </button>
                    ))}
                  </div>
                )}
                {symptoms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {symptoms.map(sym => (
                      <span key={sym} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs rounded-full px-2.5 py-1 border border-indigo-100">
                        {sym}
                        {!isLocked && (
                          <button onClick={() => setSymptoms(p => p.filter(s => s !== sym))}>
                            <X size={10} className="text-indigo-400 hover:text-red-400" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
                <textarea
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-300 resize-none placeholder-gray-400"
                  placeholder="Chief complaint and history of present illness…"
                  value={complaint}
                  onChange={e => setComplaint(e.target.value)}
                  disabled={isLocked}
                />
              </div>
            )

            // ── Past History ────────────────────────────────────────────────
            if (sectionKey === 'past_history') return (
              <div key={sectionKey} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <SectionDivider icon={Icon} label={def.label} onRemove={!isLocked ? () => removeSection(sectionKey) : null} />
                <textarea
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-300 resize-none placeholder-gray-400"
                  placeholder="Past medical, surgical, family, social history…"
                  value={pastHistory}
                  onChange={e => setPastHistory(e.target.value)}
                  disabled={isLocked}
                />
              </div>
            )

            // ── Examination Findings ────────────────────────────────────────
            if (sectionKey === 'examination') return (
              <div key={sectionKey} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <SectionDivider icon={Icon} label={def.label} onRemove={!isLocked ? () => removeSection(sectionKey) : null} />
                <textarea
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-300 resize-none placeholder-gray-400"
                  placeholder="General examination, systemic examination findings…"
                  value={examination}
                  onChange={e => setExamination(e.target.value)}
                  disabled={isLocked}
                />
              </div>
            )

            // ── Assessment / Diagnosis ──────────────────────────────────────
            if (sectionKey === 'assessment') return (
              <div key={sectionKey} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <SectionDivider
                  icon={Icon}
                  label={def.label}
                  onRemove={!isLocked ? () => removeSection(sectionKey) : null}
                  rightSlot={!isLocked && (
                    <InlineSearch
                      placeholder="Search ICD-10…"
                      value={dxSearch}
                      onChange={searchDx}
                      loading={loadingDx}
                      onClear={() => { setDxSearch(''); setDxResults([]) }}
                    />
                  )}
                />
                {dxResults.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg max-h-44 overflow-y-auto mb-2">
                    {dxResults.map((dx, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          const line = `${dx.code} – ${dx.description || dx.name}`
                          setAssessment(p => p ? p + '\n' + line : line)
                          setDxSearch(''); setDxResults([])
                        }}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0"
                      >
                        <span className="font-mono text-xs text-blue-600 mr-2">{dx.code}</span>
                        {dx.description || dx.name}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  rows={4}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-300 resize-none placeholder-gray-400"
                  placeholder="Diagnosis, differential diagnoses, clinical impression…"
                  value={assessment}
                  onChange={e => setAssessment(e.target.value)}
                  disabled={isLocked}
                />
              </div>
            )

            // ── Lab Orders ──────────────────────────────────────────────────
            if (sectionKey === 'lab') return (
              <div key={sectionKey} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <SectionDivider
                  icon={Icon}
                  label={def.label}
                  onRemove={!isLocked ? () => removeSection(sectionKey) : null}
                  rightSlot={!isLocked && (
                    <InlineSearch
                      placeholder="Search test…"
                      value={labSearch}
                      onChange={searchLab}
                      loading={loadingLab}
                      onClear={() => { setLabSearch(''); setLabResults([]) }}
                    />
                  )}
                />
                {labResults.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg max-h-44 overflow-y-auto mb-2">
                    {labResults.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setLabOrders(p => [...p, { id: t.id || Date.now(), name: t.name, notes: '' }])
                          setLabSearch(''); setLabResults([])
                        }}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
                {labOrders.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {labOrders.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                        <Microscope size={13} className="text-green-500 flex-shrink-0" />
                        <span className="text-sm flex-1">{t.name}</span>
                        <input
                          className="text-xs border border-gray-200 rounded px-2 py-0.5 w-36 outline-none"
                          placeholder="Notes…"
                          value={t.notes || ''}
                          onChange={e => setLabOrders(p => p.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))}
                          disabled={isLocked}
                        />
                        {!isLocked && (
                          <button onClick={() => setLabOrders(p => p.filter((_, j) => j !== i))}>
                            <Trash2 size={13} className="text-gray-300 hover:text-red-400" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {!isLocked && labOrders.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">
                    Search above or add from Suggestions panel.
                  </p>
                )}
              </div>
            )

            // ── Imaging Orders ──────────────────────────────────────────────
            if (sectionKey === 'imaging') return (
              <div key={sectionKey} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <SectionDivider
                  icon={Icon}
                  label={def.label}
                  onRemove={!isLocked ? () => removeSection(sectionKey) : null}
                  rightSlot={!isLocked && (
                    <InlineSearch
                      placeholder="Search imaging…"
                      value={imgSearch}
                      onChange={searchImg}
                      loading={loadingImg}
                      onClear={() => { setImgSearch(''); setImgResults([]) }}
                    />
                  )}
                />
                {imgResults.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg max-h-44 overflow-y-auto mb-2">
                    {imgResults.map((t, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setImagingOrders(p => [...p, { id: t.id || Date.now(), name: t.name, notes: '' }])
                          setImgSearch(''); setImgResults([])
                        }}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 border-b border-gray-100 last:border-0"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
                {imagingOrders.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {imagingOrders.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                        <Image size={13} className="text-purple-500 flex-shrink-0" />
                        <span className="text-sm flex-1">{t.name}</span>
                        <input
                          className="text-xs border border-gray-200 rounded px-2 py-0.5 w-36 outline-none"
                          placeholder="Notes…"
                          value={t.notes || ''}
                          onChange={e => setImagingOrders(p => p.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))}
                          disabled={isLocked}
                        />
                        {!isLocked && (
                          <button onClick={() => setImagingOrders(p => p.filter((_, j) => j !== i))}>
                            <Trash2 size={13} className="text-gray-300 hover:text-red-400" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {!isLocked && imagingOrders.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">
                    Search above or add from Suggestions panel.
                  </p>
                )}
              </div>
            )

            // ── Medications ─────────────────────────────────────────────────
            if (sectionKey === 'medications') return (
              <div key={sectionKey} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <SectionDivider
                  icon={Icon}
                  label={def.label}
                  onRemove={!isLocked ? () => removeSection(sectionKey) : null}
                />

                {rxItems.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {rxItems.map((rx, i) => (
                      <div key={i} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800">{rx.drug_name}</p>
                            <div className="flex flex-wrap gap-1 mt-1 text-xs text-gray-500">
                              {rx.dosage && <span className="bg-white border border-gray-200 rounded px-1.5 py-0.5">{rx.dosage}</span>}
                              {rx.route && <span className="bg-white border border-gray-200 rounded px-1.5 py-0.5">{rx.route}</span>}
                              {rx.freq?.length > 0 && <span className="bg-white border border-gray-200 rounded px-1.5 py-0.5">{rx.freq.join(', ')}</span>}
                              {rx.timing?.length > 0 && <span className="bg-white border border-gray-200 rounded px-1.5 py-0.5">{rx.timing.join(', ')}</span>}
                              {rx.duration && <span className="bg-white border border-gray-200 rounded px-1.5 py-0.5">{rx.duration}</span>}
                              {rx.food && <span className="bg-white border border-gray-200 rounded px-1.5 py-0.5">{rx.food}</span>}
                              {rx.brand && <span className="bg-blue-50 text-blue-600 border border-blue-100 rounded px-1.5 py-0.5">Brand: {rx.brand}</span>}
                            </div>
                            {rx.notes && <p className="text-xs text-gray-400 mt-1 italic">{rx.notes}</p>}
                          </div>
                          {!isLocked && (
                            <button onClick={() => removeRxItem(i)} className="text-gray-300 hover:text-red-400 flex-shrink-0">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Drug interactions banner across entire Rx list */}
                {rxInteractions.length > 0 && (
                  <div className="space-y-1.5">
                    {rxInteractions.filter(ix => ix.severity === 'contraindicated' || ix.severity === 'major').map((ix, i) => (
                      <div key={i} className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs">
                        <span className="text-red-600 font-bold mt-0.5">⊗</span>
                        <div>
                          <span className="font-semibold text-red-700 uppercase tracking-wide">{ix.severity}</span>
                          <span className="text-red-600 ml-1">{ix.drug_a} + {ix.drug_b}</span>
                          {ix.effect && <p className="text-red-500 mt-0.5">{ix.effect}</p>}
                          {ix.management && <p className="text-red-400 italic mt-0.5">{ix.management}</p>}
                        </div>
                      </div>
                    ))}
                    {rxInteractions.filter(ix => ix.severity === 'moderate').map((ix, i) => (
                      <div key={`mod-${i}`} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs">
                        <span className="text-amber-500 font-bold mt-0.5">⚠</span>
                        <div>
                          <span className="font-semibold text-amber-700">Moderate</span>
                          <span className="text-amber-600 ml-1">{ix.drug_a} + {ix.drug_b}</span>
                          {ix.effect && <p className="text-amber-500 mt-0.5">{ix.effect}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!isLocked && (
                  <div className="border border-dashed border-blue-200 rounded-xl p-3 space-y-3 bg-blue-50/30">
                    <p className="text-xs font-semibold text-gray-600">Add Medication</p>

                    <div className="relative">
                      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                        {drugSearch.loading
                          ? <Loader2 size={14} className="text-gray-400 animate-spin" />
                          : <Search size={14} className="text-gray-400" />
                        }
                        <input
                          className="flex-1 text-sm outline-none placeholder-gray-400"
                          placeholder="Search generic or brand name…"
                          value={rxDraft.drug ? rxDraft.drug.label : drugSearch.query}
                          onChange={e => {
                            if (rxDraft.drug) setRxDraft(d => ({ ...d, drug: null, formulation: null, dosage: '', route: 'Oral' }))
                            drugSearch.search(e.target.value)
                            drugIntel.clear()
                          }}
                        />
                        {(drugSearch.query || rxDraft.drug) && (
                          <button onClick={() => { drugSearch.clear(); drugIntel.clear(); setRxDraft(d => ({ ...d, drug: null, formulation: null, dosage: '', route: 'Oral' })) }}>
                            <X size={13} className="text-gray-400" />
                          </button>
                        )}
                      </div>
                      {drugSearch.results.length > 0 && !rxDraft.drug && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-40 max-h-56 overflow-y-auto mt-1">
                          {drugSearch.results.map((d, i) => {
                            const fmt = d.formulation
                            const formBadge = fmt ? (FORM_LABEL[fmt.form] || fmt.form) : null
                            return (
                              <button
                                key={i}
                                onClick={() => {
                                  const autoRoute = fmt ? (ROUTE_MAP[fmt.route] || 'Oral') : 'Oral'
                                  const doses = fmt?.doses || []
                                  const unit  = fmt?.unit || 'mg'
                                  const autoD = doses.length === 1 ? `${doses[0]} ${unit}` : ''
                                  setRxDraft(dr => ({
                                    ...dr,
                                    drug: d,
                                    formulation: fmt,
                                    route: autoRoute,
                                    dosage: autoD,
                                    brand: d.brands?.[0] || '',
                                  }))
                                  drugSearch.clear()
                                  drugIntel.fetch(d.generic || d.generic_name || d.name)
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0"
                              >
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {formBadge && (
                                    <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{formBadge}</span>
                                  )}
                                  <span className="font-medium text-gray-800">{d.generic || d.generic_name || d.name}</span>
                                  {fmt?.doses?.length > 0 && (
                                    <span className="text-xs text-blue-500">{fmt.doses.join('/')} {fmt.unit}</span>
                                  )}
                                  {d.brands?.[0] && (
                                    <span className="text-xs text-gray-400">({d.brands[0]})</span>
                                  )}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {rxDraft.drug && (
                      <>
                        {/* Drug intelligence: counselling + food */}
                        {(drugIntel.intel?.tips?.length > 0 || drugIntel.intel?.food?.length > 0) && (
                          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 space-y-1.5">
                            {drugIntel.intel.tips?.length > 0 && (
                              <div>
                                <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wide mb-1">Counselling Tips</p>
                                {drugIntel.intel.tips.map((tip, ti) => (
                                  <p key={ti} className="text-xs text-green-700 flex items-start gap-1">
                                    <span className="mt-0.5 flex-shrink-0">💡</span>{tip}
                                  </p>
                                ))}
                              </div>
                            )}
                            {drugIntel.intel.food?.length > 0 && (
                              <div>
                                <p className="text-[10px] font-semibold text-orange-700 uppercase tracking-wide mb-1">Food / Lifestyle</p>
                                {drugIntel.intel.food.map((fi, fi2) => (
                                  <p key={fi2} className="text-xs text-orange-600 flex items-start gap-1">
                                    <span className="mt-0.5 flex-shrink-0">⚠</span>
                                    <span><b>{fi.food}</b>{fi.effect ? ` — ${fi.effect}` : ''}</span>
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-wide">Dosage / Strength</label>
                            {rxDraft.formulation?.doses?.length > 1 ? (
                              <select
                                className="w-full mt-0.5 text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none bg-white focus:border-blue-300"
                                value={rxDraft.dosage}
                                onChange={e => setRxDraft(d => ({ ...d, dosage: e.target.value }))}
                              >
                                <option value="">Select dose</option>
                                {rxDraft.formulation.doses.map(dose => {
                                  const label = `${dose} ${rxDraft.formulation.unit || 'mg'}`
                                  return <option key={dose} value={label}>{label}</option>
                                })}
                              </select>
                            ) : (
                              <input
                                className="w-full mt-0.5 text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-300"
                                placeholder="e.g. 500mg, 5ml"
                                value={rxDraft.dosage}
                                onChange={e => setRxDraft(d => ({ ...d, dosage: e.target.value }))}
                              />
                            )}
                          </div>
                          {rxDraft.drug.brands?.length > 0 && (
                            <div>
                              <label className="text-[10px] text-gray-500 uppercase tracking-wide">Brand</label>
                              <select
                                className="w-full mt-0.5 text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none bg-white"
                                value={rxDraft.brand}
                                onChange={e => setRxDraft(d => ({ ...d, brand: e.target.value }))}
                              >
                                <option value="">Select brand</option>
                                {rxDraft.drug.brands.map(b => <option key={b} value={b}>{b}</option>)}
                              </select>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">
                            Route{rxDraft.formulation ? <span className="ml-1 text-blue-500 normal-case">(auto-filled)</span> : ''}
                          </label>
                          <ChipSelect
                            options={ROUTES}
                            selected={rxDraft.route}
                            multi={false}
                            onToggle={val => setRxDraft(d => ({ ...d, route: val }))}
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Frequency</label>
                          <ChipSelect
                            options={FREQ_OPTIONS}
                            selected={rxDraft.freq}
                            onToggle={val => toggleRxChip('freq', val)}
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Timing</label>
                          <ChipSelect
                            options={TIMING_OPTIONS}
                            selected={rxDraft.timing}
                            onToggle={val => toggleRxChip('timing', val)}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Duration</label>
                            <ChipSelect
                              options={DURATION_OPTIONS}
                              selected={rxDraft.duration}
                              multi={false}
                              onToggle={val => setRxDraft(d => ({ ...d, duration: d.duration === val ? '' : val }))}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Food</label>
                            <ChipSelect
                              options={FOOD_OPTIONS}
                              selected={rxDraft.food}
                              multi={false}
                              onToggle={val => setRxDraft(d => ({ ...d, food: d.food === val ? '' : val }))}
                            />
                          </div>
                        </div>

                        <input
                          className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-300"
                          placeholder="Additional instructions…"
                          value={rxDraft.notes}
                          onChange={e => setRxDraft(d => ({ ...d, notes: e.target.value }))}
                        />

                        <button
                          onClick={addRxItem}
                          className="w-full py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                        >
                          Add to Prescription
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )

            // ── Counselling ─────────────────────────────────────────────────
            if (sectionKey === 'counselling') return (
              <div key={sectionKey} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <SectionDivider icon={Icon} label={def.label} onRemove={!isLocked ? () => removeSection(sectionKey) : null} />
                <textarea
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-300 resize-none placeholder-gray-400"
                  placeholder="Patient counselling notes, lifestyle advice…"
                  value={counselling}
                  onChange={e => setCounselling(e.target.value)}
                  disabled={isLocked}
                />
              </div>
            )

            // ── Follow-up ───────────────────────────────────────────────────
            if (sectionKey === 'followup') return (
              <div key={sectionKey} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <SectionDivider icon={Icon} label={def.label} onRemove={!isLocked ? () => removeSection(sectionKey) : null} />
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Follow-up after</label>
                    <div className="flex flex-wrap gap-1.5">
                      {FOLLOWUP_DAYS.map(d => (
                        <button
                          key={d}
                          disabled={isLocked}
                          onClick={() => setFollowupDays(d)}
                          className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                            followupDays === d
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                          }`}
                        >
                          {d} days
                        </button>
                      ))}
                    </div>
                    {followupDays && (
                      <p className="text-xs text-gray-500 mt-1">
                        Approx. date: <b>{nextDate(followupDays)}</b>
                      </p>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-300 resize-none placeholder-gray-400"
                    placeholder="Follow-up instructions…"
                    value={followupNote}
                    onChange={e => setFollowupNote(e.target.value)}
                    disabled={isLocked}
                  />
                </div>
              </div>
            )

            return null
          })}

          {!isLocked && (
            <div className="flex justify-end pb-16">
              <AddSectionMenu sections={availableSections} onAdd={addSection} />
            </div>
          )}
        </div>

        {/* ── Right Smart Panel ── */}
        <RightSmartPanel
          suggestedMeds={suggestedMeds}
          suggestedTests={suggestedTests}
          loading={loadingSuggestions}
          tips={smartTips}
          favoriteMeds={favoriteMeds}
          onAddFav={addToFavorites}
          onRemoveFav={removeFromFavorites}
          onQuickMed={quickAddMed}
          onQuickTest={quickAddTest}
          rightTab={rightTab}
          setRightTab={setRightTab}
        />
      </div>
    </div>
  )
}
