/**
 * @shared-pool — standalone clinical assessment, portal-agnostic
 * WHO ASRS-v1.1 Adult ADHD Self-Report Scale.
 * Can be filled by the patient (kiosk / patient portal) or
 * by the doctor as a proxy rating during consultation.
 */
import { useState } from 'react'
import { ClipboardList } from 'lucide-react'
import api from '../../../api/client'

// ── ASRS-v1.1 questions ───────────────────────────────────────────────────────

const PART_A = [
  'How often do you have trouble wrapping up the final details of a project once the challenging parts have been done?',
  'How often do you have difficulty getting things in order when you have to do a task that requires organisation?',
  'How often do you have problems remembering appointments or obligations?',
  'When you have a task that requires a lot of thought, how often do you avoid or delay getting started?',
  'How often do you fidget or squirm with your hands or feet when you have to sit down for a long time?',
  'How often do you feel overly active and compelled to do things, like you were driven by a motor?',
]

const PART_B = [
  'How often do you make careless mistakes when you have to work on a boring or difficult project?',
  'How often do you have difficulty keeping your attention when you are doing boring or repetitive work?',
  'How often do you have difficulty concentrating on what people say to you, even when they are speaking to you directly?',
  'How often do you misplace or have difficulty finding things at home or at work?',
  'How often are you distracted by activity or noise around you?',
  'How often do you leave your seat in meetings or other situations in which you are expected to remain seated?',
  'How often do you feel restless or fidgety?',
  'How often do you have difficulty unwinding and relaxing when you have time to yourself?',
  'How often do you find yourself talking too much when you are in social situations?',
  'When in a conversation, how often do you find yourself finishing the sentences of the people you are talking to before they can finish them?',
  'How often do you have difficulty waiting your turn in situations when turn-taking is required?',
  'How often do you interrupt others when they are busy?',
]

// Frequency options: value = score 0–4
const FREQ = [
  { label: 'Never',      value: 0, bg: 'bg-gray-100',   text: 'text-gray-700',   active: 'bg-gray-400 text-white'   },
  { label: 'Rarely',     value: 1, bg: 'bg-blue-50',    text: 'text-blue-700',   active: 'bg-blue-400 text-white'   },
  { label: 'Sometimes',  value: 2, bg: 'bg-yellow-50',  text: 'text-yellow-700', active: 'bg-yellow-400 text-white' },
  { label: 'Often',      value: 3, bg: 'bg-orange-50',  text: 'text-orange-700', active: 'bg-orange-500 text-white' },
  { label: 'Very Often', value: 4, bg: 'bg-red-50',     text: 'text-red-700',    active: 'bg-red-500 text-white'    },
]

// Part A screener: shaded (positive) zones per question index
// Q1–3 (idx 0–2): ≥ Sometimes (value ≥ 2)   → positive
// Q4–6 (idx 3–5): ≥ Often     (value ≥ 3)   → positive
function isPositiveA(qIdx, val) {
  if (val === null) return false
  return qIdx <= 2 ? val >= 2 : val >= 3
}

function getScreenerResult(answersA) {
  const filled = answersA.filter(v => v !== null)
  if (filled.length < 6) return null
  const positives = answersA.filter((v, i) => isPositiveA(i, v)).length
  if (positives >= 4) return { label: 'Positive Screener — Consistent with ADHD', color: 'bg-red-100 text-red-800 border-red-300' }
  return { label: 'Negative Screener — Symptoms below threshold', color: 'bg-green-100 text-green-800 border-green-300' }
}

function totalScore(all) {
  return all.filter(v => v !== null).reduce((s, v) => s + v, 0)
}

// ── Single question row ───────────────────────────────────────────────────────

function QuestionRow({ number, text, value, onChange, isPartA, qIdx }) {
  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-white hover:border-indigo-100 transition-colors">
      <div className="flex gap-3 mb-3">
        <span className="shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
          {number}
        </span>
        <p className="text-sm text-gray-700 leading-snug">{text}</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {FREQ.map(f => {
          const selected = value === f.value
          const isShaded = isPartA && isPositiveA(qIdx, f.value)
          return (
            <button key={f.value} type="button" onClick={() => onChange(f.value)}
              className={`flex-1 min-w-[70px] py-1.5 rounded-lg text-xs font-semibold border transition-all relative ${
                selected
                  ? f.active + ' shadow-sm'
                  : isShaded
                    ? f.bg + ' ' + f.text + ' border-orange-200 ring-1 ring-orange-200'
                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300'
              }`}>
              {f.label}
              {isShaded && !selected && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full" title="Clinically significant zone" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────────────────────

export default function ASRSForm({ admission, onClose, onSaved }) {
  const [filledBy,  setFilledBy]  = useState('') // 'patient' | 'doctor'
  const [answersA,  setAnswersA]  = useState(Array(6).fill(null))
  const [answersB,  setAnswersB]  = useState(Array(12).fill(null))
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  const setA = (i, v) => setAnswersA(p => { const a = [...p]; a[i] = v; return a })
  const setB = (i, v) => setAnswersB(p => { const a = [...p]; a[i] = v; return a })

  const allAnswers    = [...answersA, ...answersB]
  const answeredCount = allAnswers.filter(v => v !== null).length
  const total         = totalScore(allAnswers)
  const screener      = getScreenerResult(answersA)
  const partADone     = answersA.every(v => v !== null)

  const handleSave = async () => {
    if (answeredCount < 6) { setError('Please answer at least Part A (questions 1–6).'); return }
    setSaving(true); setError('')
    const positives = answersA.filter((v, i) => isPositiveA(i, v)).length
    const payload = {
      type: 'asrs',
      filled_by: filledBy,
      part_a: answersA,
      part_b: answersB,
      part_a_positives: positives,
      screener_result: screener?.label,
      total_score: total,
      max_possible: 72,
      answered_count: answeredCount,
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
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* Badge */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-100 rounded-lg">
            <ClipboardList size={16} className="text-indigo-600" />
          </div>
          <div>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">ASRS-v1.1</span>
            <span className="text-xs text-gray-400 ml-2">Adult ADHD Self-Report Scale — WHO</span>
          </div>
          <div className="ml-auto text-xs text-gray-400">
            {answeredCount}/18 answered
          </div>
        </div>

        {/* Who is filling */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
          <p className="text-xs font-semibold text-indigo-700 mb-2">This questionnaire is being filled by:</p>
          <div className="flex gap-2">
            {[
              { key: 'patient', label: 'Patient (self-report)' },
              { key: 'doctor',  label: 'Doctor (proxy / observed)' },
            ].map(o => (
              <button key={o.key} type="button" onClick={() => setFilledBy(v => v === o.key ? '' : o.key)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  filledBy === o.key
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                }`}>{o.label}</button>
            ))}
          </div>
          <p className="text-[10px] text-indigo-500 mt-2">
            Frequency answers describe behaviour over the <strong>past 6 months</strong>.
            Dots (•) on options indicate clinically significant zones for the screener.
          </p>
        </div>

        {/* Part A */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="font-bold text-sm text-gray-800">Part A — Screener</span>
            <span className="text-xs text-gray-400">(Questions 1–6 · highly predictive)</span>
          </div>
          <div className="space-y-3">
            {PART_A.map((q, i) => (
              <QuestionRow key={i} number={i + 1} text={q}
                value={answersA[i]} onChange={v => setA(i, v)}
                isPartA qIdx={i} />
            ))}
          </div>

          {/* Part A screener result */}
          {partADone && screener && (
            <div className={`mt-4 px-4 py-3 rounded-xl border font-semibold text-sm ${screener.color}`}>
              {screener.label}
              <p className="text-xs font-normal mt-0.5">
                {answersA.filter((v, i) => isPositiveA(i, v)).length} of 6 Part A questions in clinically significant range.
              </p>
            </div>
          )}
        </section>

        {/* Part B */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="font-bold text-sm text-gray-800">Part B</span>
            <span className="text-xs text-gray-400">(Questions 7–18 · additional symptom detail)</span>
          </div>
          <div className="space-y-3">
            {PART_B.map((q, i) => (
              <QuestionRow key={i} number={i + 7} text={q}
                value={answersB[i]} onChange={v => setB(i, v)}
                isPartA={false} qIdx={i} />
            ))}
          </div>
        </section>

        {/* Total score */}
        {answeredCount === 18 && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium">Total ASRS Score</p>
              <p className="text-2xl font-bold text-indigo-700">{total} <span className="text-sm text-gray-400 font-normal">/ 72</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Interpretation</p>
              <p className={`text-sm font-bold ${
                total >= 24 ? 'text-red-600' : total >= 17 ? 'text-orange-600' : 'text-green-600'
              }`}>
                {total >= 24 ? 'Highly Suggestive of ADHD'
                  : total >= 17 ? 'Moderate — Review with clinician'
                  : 'Low symptom burden'}
              </p>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <p className="text-xs text-gray-400">WHO ASRS-v1.1 · Kessler et al. 2005</p>
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save ASRS'}
          </button>
        </div>
      </div>
    </div>
  )
}
