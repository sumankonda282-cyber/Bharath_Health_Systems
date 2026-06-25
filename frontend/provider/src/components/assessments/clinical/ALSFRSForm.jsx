/**
 * @shared-pool — standalone clinical assessment, portal-agnostic
 * ALSFRS-R: ALS Functional Rating Scale — Revised
 * 12 items, each scored 0–4. Max 48 = normal function.
 * Tracks disease progression in ALS / Motor Neurone Disease.
 */
import { useState } from 'react'
import { Activity } from 'lucide-react'
import api from '../../../api/client'

// ── ALSFRS-R items with scoring descriptors ───────────────────────────────────

const ITEMS = [
  {
    key: 'speech', domain: 'Bulbar', label: 'Speech',
    options: [
      { score: 4, text: 'Normal speech processes' },
      { score: 3, text: 'Detectable speech disturbance' },
      { score: 2, text: 'Intelligible with repeating' },
      { score: 1, text: 'Speech combined with non-vocal communication' },
      { score: 0, text: 'Loss of useful speech' },
    ],
  },
  {
    key: 'salivation', domain: 'Bulbar', label: 'Salivation',
    options: [
      { score: 4, text: 'Normal' },
      { score: 3, text: 'Slight but definite excess; may have nighttime drooling' },
      { score: 2, text: 'Moderately excessive; minimal drooling' },
      { score: 1, text: 'Marked excess; some drooling' },
      { score: 0, text: 'Marked drooling; requires constant tissue / handkerchief' },
    ],
  },
  {
    key: 'swallowing', domain: 'Bulbar', label: 'Swallowing',
    options: [
      { score: 4, text: 'Normal eating habits' },
      { score: 3, text: 'Early eating problems; occasional choking' },
      { score: 2, text: 'Dietary consistency changes' },
      { score: 1, text: 'Needs supplemental tube feeding' },
      { score: 0, text: 'NPO / exclusively parenteral or enteral feeding' },
    ],
  },
  {
    key: 'handwriting', domain: 'Fine Motor', label: 'Handwriting',
    options: [
      { score: 4, text: 'Normal' },
      { score: 3, text: 'Slow or sloppy; all words legible' },
      { score: 2, text: 'Not all words legible' },
      { score: 1, text: 'Able to grip pen but unable to write' },
      { score: 0, text: 'Unable to grip pen' },
    ],
  },
  {
    key: 'cutting_food', domain: 'Fine Motor', label: 'Cutting Food & Handling Utensils',
    options: [
      { score: 4, text: 'Normal' },
      { score: 3, text: 'Somewhat slow and clumsy, no help needed' },
      { score: 2, text: 'Can cut most foods, some help needed' },
      { score: 1, text: 'Food must be cut by someone else; can still feed self slowly' },
      { score: 0, text: 'Needs to be fed' },
    ],
  },
  {
    key: 'dressing', domain: 'Fine Motor', label: 'Dressing & Hygiene',
    options: [
      { score: 4, text: 'Normal function' },
      { score: 3, text: 'Independent and complete self-care with effort / decreased efficiency' },
      { score: 2, text: 'Intermittent assistance or substitute methods' },
      { score: 1, text: 'Needs attendant for self-care' },
      { score: 0, text: 'Total dependence' },
    ],
  },
  {
    key: 'turning_bed', domain: 'Gross Motor', label: 'Turning in Bed & Adjusting Bedclothes',
    options: [
      { score: 4, text: 'Normal' },
      { score: 3, text: 'Somewhat slow and clumsy, no help needed' },
      { score: 2, text: 'Can turn alone or adjust sheets but with great difficulty' },
      { score: 1, text: 'Can initiate, cannot turn or adjust without help' },
      { score: 0, text: 'Helpless' },
    ],
  },
  {
    key: 'walking', domain: 'Gross Motor', label: 'Walking',
    options: [
      { score: 4, text: 'Normal' },
      { score: 3, text: 'Early ambulation difficulties' },
      { score: 2, text: 'Walks with assistance' },
      { score: 1, text: 'Non-ambulatory functional movement only' },
      { score: 0, text: 'No purposeful leg movement' },
    ],
  },
  {
    key: 'climbing_stairs', domain: 'Gross Motor', label: 'Climbing Stairs',
    options: [
      { score: 4, text: 'Normal' },
      { score: 3, text: 'Slow' },
      { score: 2, text: 'Mild unsteadiness or fatigue' },
      { score: 1, text: 'Needs assistance' },
      { score: 0, text: 'Cannot do' },
    ],
  },
  {
    key: 'dyspnoea', domain: 'Respiratory', label: 'Dyspnoea',
    options: [
      { score: 4, text: 'None' },
      { score: 3, text: 'Occurs when walking' },
      { score: 2, text: 'Occurs with one or more of: eating, bathing, dressing' },
      { score: 1, text: 'Occurs at rest; difficulty breathing when sitting or lying' },
      { score: 0, text: 'Significant difficulty; considering mechanical support' },
    ],
  },
  {
    key: 'orthopnoea', domain: 'Respiratory', label: 'Orthopnoea',
    options: [
      { score: 4, text: 'None' },
      { score: 3, text: 'Some difficulty sleeping at night; does not routinely use >2 pillows' },
      { score: 2, text: 'Needs extra pillows to sleep (>2)' },
      { score: 1, text: 'Can only sleep sitting up' },
      { score: 0, text: 'Unable to sleep' },
    ],
  },
  {
    key: 'respiratory_insufficiency', domain: 'Respiratory', label: 'Respiratory Insufficiency',
    options: [
      { score: 4, text: 'None' },
      { score: 3, text: 'Intermittent use of BiPAP' },
      { score: 2, text: 'Continuous use of BiPAP during night' },
      { score: 1, text: 'Continuous use of BiPAP day and night' },
      { score: 0, text: 'Invasive mechanical ventilation by intubation or tracheostomy' },
    ],
  },
]

const DOMAINS = ['Bulbar', 'Fine Motor', 'Gross Motor', 'Respiratory']

const DOMAIN_COLORS = {
  Bulbar:       'bg-blue-100 text-blue-700',
  'Fine Motor': 'bg-violet-100 text-violet-700',
  'Gross Motor':'bg-amber-100 text-amber-700',
  Respiratory:  'bg-sky-100 text-sky-700',
}

function scoreColor(total) {
  if (total >= 40) return 'text-green-600'
  if (total >= 30) return 'text-yellow-600'
  if (total >= 20) return 'text-orange-600'
  return 'text-red-600'
}

function scoreLabel(total) {
  if (total >= 40) return 'Mild impairment'
  if (total >= 30) return 'Moderate impairment'
  if (total >= 20) return 'Moderate–severe'
  if (total >= 10) return 'Severe impairment'
  return 'Very severe / End-stage'
}

// ── Main form ─────────────────────────────────────────────────────────────────

export default function ALSFRSForm({ admission, onClose, onSaved }) {
  const [scores,  setScores]  = useState({})
  const [notes,   setNotes]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const setScore = (key, val) => setScores(p => ({ ...p, [key]: val }))
  const answered = Object.keys(scores).length
  const total    = Object.values(scores).reduce((s, v) => s + v, 0)

  const domainScore = (domain) => {
    const items = ITEMS.filter(i => i.domain === domain)
    const vals  = items.map(i => scores[i.key]).filter(v => v !== undefined)
    return { sum: vals.reduce((s, v) => s + v, 0), max: items.length * 4, answered: vals.length }
  }

  const handleSave = async () => {
    if (answered < 12) { setError(`Please rate all 12 items (${12 - answered} remaining).`); return }
    setSaving(true); setError('')
    const payload = {
      type: 'alsfrs_r',
      scores,
      total_score: total,
      max_score: 48,
      domain_scores: Object.fromEntries(DOMAINS.map(d => [d, domainScore(d)])),
      interpretation: scoreLabel(total),
      notes,
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
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Badge + score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <Activity size={16} className="text-blue-600" />
            </div>
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">ALSFRS-R</span>
              <span className="text-xs text-gray-400 ml-2">ALS Functional Rating Scale — Revised</span>
            </div>
          </div>
          {answered > 0 && (
            <div className="text-right">
              <p className={`text-2xl font-bold ${scoreColor(total)}`}>
                {total}<span className="text-sm text-gray-400 font-normal">/48</span>
              </p>
              <p className={`text-[11px] font-semibold ${scoreColor(total)}`}>{scoreLabel(total)}</p>
            </div>
          )}
        </div>

        {/* Domain sub-scores */}
        {answered > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DOMAINS.map(d => {
              const ds = domainScore(d)
              return (
                <div key={d} className={`rounded-lg px-3 py-2 text-center ${DOMAIN_COLORS[d]}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{d}</p>
                  <p className="text-lg font-bold">{ds.sum}<span className="text-xs font-normal opacity-60">/{ds.max}</span></p>
                </div>
              )
            })}
          </div>
        )}

        {/* Items by domain */}
        {DOMAINS.map(domain => (
          <section key={domain}>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-3 ${DOMAIN_COLORS[domain]}`}>
              {domain}
            </div>
            <div className="space-y-4">
              {ITEMS.filter(item => item.domain === domain).map(item => (
                <div key={item.key} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className={`flex items-center justify-between px-4 py-2.5 border-b border-gray-100 ${
                    scores[item.key] !== undefined ? 'bg-gray-50' : 'bg-white'
                  }`}>
                    <span className="text-sm font-semibold text-gray-700">{item.label}</span>
                    {scores[item.key] !== undefined && (
                      <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                        scores[item.key] >= 3 ? 'bg-green-100 text-green-700'
                        : scores[item.key] >= 2 ? 'bg-yellow-100 text-yellow-700'
                        : scores[item.key] >= 1 ? 'bg-orange-100 text-orange-700'
                        : 'bg-red-100 text-red-700'
                      }`}>{scores[item.key]}/4</span>
                    )}
                  </div>
                  <div className="divide-y divide-gray-50">
                    {item.options.map(opt => (
                      <label key={opt.score}
                        className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                          scores[item.key] === opt.score
                            ? 'bg-blue-50'
                            : 'hover:bg-gray-50'
                        }`}>
                        <input type="radio"
                          name={item.key}
                          checked={scores[item.key] === opt.score}
                          onChange={() => setScore(item.key, opt.score)}
                          className="mt-0.5 accent-blue-600 shrink-0" />
                        <div className="flex items-start gap-2 flex-1">
                          <span className={`shrink-0 text-xs font-bold w-4 mt-0.5 ${
                            scores[item.key] === opt.score ? 'text-blue-700' : 'text-gray-400'
                          }`}>{opt.score}</span>
                          <span className={`text-xs leading-snug ${
                            scores[item.key] === opt.score ? 'text-blue-800 font-medium' : 'text-gray-600'
                          }`}>{opt.text}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Notes */}
        <div>
          <p className="text-sm font-bold text-gray-700 mb-1.5">Clinical Notes</p>
          <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Progression notes, compared to previous score, context…"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <span className="text-xs text-gray-400">{answered}/12 items rated · Max 48</span>
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save ALSFRS-R'}
          </button>
        </div>
      </div>
    </div>
  )
}
