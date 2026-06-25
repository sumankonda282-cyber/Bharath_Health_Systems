import { useState } from 'react'
import { Loader2, CheckCircle, AlertCircle, Users } from 'lucide-react'
import api from '../../../api/client'

const OCCUPATIONS = [
  'Farmer', 'Agricultural Labourer', 'Construction Worker', 'Factory Worker',
  'Office Worker', 'Healthcare Worker', 'Teacher', 'Driver', 'Trader / Shopkeeper',
  'Homemaker', 'Student', 'Retired', 'Unemployed', 'Other',
]

const EXPOSURES = [
  'Dust / Grain', 'Chemical Fumes', 'Asbestos', 'Silica / Stone dust',
  'Radiation', 'Loud Noise', 'Biological / Infectious agents', 'Pesticides / Fertilizers',
]

const NARCOTICS = ['Cannabis', 'Opioids', 'Cocaine', 'Inhalants / Solvents', 'Other']

const DIET_TYPES   = ['Vegetarian', 'Non-Vegetarian', 'Eggetarian', 'Vegan', 'Jain']
const ACTIVITY     = ['Sedentary', 'Light (walking/housework)', 'Moderate (30 min exercise/day)', 'Active (regular intense exercise)']
const SLEEP_Q      = ['Good', 'Fair', 'Poor']
const COOKING_FUEL = ['LPG / PNG', 'Biomass (wood/dung/crop)', 'Electric / Induction', 'Kerosene']
const ALCOHOL_TYPE = ['Beer', 'Wine', 'Spirits / Whiskey', 'Desi liquor', 'Mixed']
const MEALS_PER_DAY = ['1', '2', '3', '4+']
const OUTSIDE_FOOD  = ['Never', 'Occasionally (1-2x/week)', 'Frequently (3-5x/week)', 'Daily']

function Toggle({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {['Yes', 'No'].map(opt => (
        <button key={opt} type="button"
          onClick={() => onChange(value === opt ? null : opt)}
          className={`px-3 py-1 text-sm rounded-lg border font-medium transition-colors
            ${value === opt
              ? opt === 'Yes' ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-700 text-white border-gray-700'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
          {opt}
        </button>
      ))}
    </div>
  )
}

function Select({ value, onChange, options, placeholder = 'Select' }) {
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value || null)}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function Pills({ options, selected, onChange }) {
  const toggle = (opt) => {
    const s = new Set(selected)
    s.has(opt) ? s.delete(opt) : s.add(opt)
    onChange([...s])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => toggle(opt)}
          className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors
            ${selected.includes(opt)
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
          {opt}
        </button>
      ))}
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1.5 sm:gap-4 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 sm:w-40 shrink-0 pt-1">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function SectionHeader({ title }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2 mb-1 mt-3 first:mt-0">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</span>
    </div>
  )
}

const INIT = {
  tobacco:        null,   // None / Cigarette / Beedi / Both
  tobacco_smokeless: null,
  cigs_per_day:   '',
  smoking_years:  '',
  alcohol:        null,   // None / Occasional / Regular
  alcohol_types:  [],
  alcohol_units_week: '',
  e_cigarette:    null,
  narcotics:      null,
  narcotics_types: [],
  occupation:     null,
  occupation_other: '',
  occupational_exposures: [],
  diet:           null,
  meals_per_day:  null,
  outside_food:   null,
  physical_activity: null,
  sleep_quality:  null,
  cooking_fuel:   null,
  pets:           null,
  travel_history: null,
  notes:          '',
}

export default function SocialHistoryForm({ admission, onClose, onSaved }) {
  const [form, setForm]     = useState(INIT)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)
  const [done, setDone]     = useState(false)
  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const packYears = () => {
    const cpd = parseFloat(form.cigs_per_day)
    const yrs = parseFloat(form.smoking_years)
    if (cpd > 0 && yrs > 0) return ((cpd / 20) * yrs).toFixed(1)
    return null
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        pack_years: packYears(),
        type: 'social_history',
      }
      await api.post(
        `/inpatient/admissions/${admission.id}/notes`,
        { note_type: 'assessment', note_text: JSON.stringify(payload) }
      )
      setDone(true)
      setTimeout(() => { onSaved?.() }, 1200)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 py-12">
        <CheckCircle size={40} className="text-emerald-500" />
        <p className="font-semibold text-gray-700">Social History saved</p>
      </div>
    )
  }

  const showSmokingDetail = form.tobacco && form.tobacco !== 'None'
  const showAlcoholDetail = form.alcohol && form.alcohol !== 'None'
  const showNarcoticsDetail = form.narcotics === 'Yes'

  return (
    <div className="flex flex-col h-full">
      {/* Badge */}
      <div className="shrink-0 px-6 pt-4 pb-2 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 bg-violet-100 text-violet-700 text-xs font-bold px-2.5 py-1 rounded-full">
          <Users size={12} /> [A] Social History
        </span>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 pb-4">

        {/* Substance Use */}
        <SectionHeader title="Substance Use" />
        <Row label="Tobacco use">
          <Select value={form.tobacco} onChange={v => set('tobacco', v)}
            options={['None', 'Cigarette', 'Beedi', 'Cigarette + Beedi']} />
        </Row>
        {showSmokingDetail && (
          <>
            <Row label="Smokeless tobacco">
              <Select value={form.tobacco_smokeless} onChange={v => set('tobacco_smokeless', v)}
                options={['None', 'Gutka', 'Khaini', 'Zarda', 'Pan masala', 'Other']} />
            </Row>
            <Row label="Cigarettes / day">
              <input type="number" min={0} max={100} value={form.cigs_per_day}
                onChange={e => set('cigs_per_day', e.target.value)}
                placeholder="e.g. 10"
                className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </Row>
            <Row label="Smoking years">
              <input type="number" min={0} max={80} value={form.smoking_years}
                onChange={e => set('smoking_years', e.target.value)}
                placeholder="e.g. 5"
                className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {packYears() && (
                <span className="ml-3 text-xs text-orange-600 font-semibold">Pack-years: {packYears()}</span>
              )}
            </Row>
          </>
        )}

        <Row label="Alcohol">
          <Select value={form.alcohol} onChange={v => set('alcohol', v)}
            options={['None', 'Occasional', 'Regular']} />
        </Row>
        {showAlcoholDetail && (
          <>
            <Row label="Type">
              <Pills options={ALCOHOL_TYPE} selected={form.alcohol_types}
                onChange={v => set('alcohol_types', v)} />
            </Row>
            <Row label="Units / week">
              <input type="number" min={0} max={100} value={form.alcohol_units_week}
                onChange={e => set('alcohol_units_week', e.target.value)}
                placeholder="e.g. 7"
                className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </Row>
          </>
        )}

        <Row label="E-cigarette / vaping"><Toggle value={form.e_cigarette} onChange={v => set('e_cigarette', v)} /></Row>
        <Row label="Recreational drugs"><Toggle value={form.narcotics} onChange={v => set('narcotics', v)} /></Row>
        {showNarcoticsDetail && (
          <Row label="Type">
            <Pills options={NARCOTICS} selected={form.narcotics_types}
              onChange={v => set('narcotics_types', v)} />
          </Row>
        )}

        {/* Occupation */}
        <SectionHeader title="Occupation" />
        <Row label="Occupation">
          <Select value={form.occupation} onChange={v => set('occupation', v)} options={OCCUPATIONS} />
        </Row>
        {form.occupation === 'Other' && (
          <Row label="Specify">
            <input type="text" value={form.occupation_other}
              onChange={e => set('occupation_other', e.target.value)}
              placeholder="Describe occupation"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </Row>
        )}
        <Row label="Occupational exposure">
          <Pills options={EXPOSURES} selected={form.occupational_exposures}
            onChange={v => set('occupational_exposures', v)} />
        </Row>

        {/* Diet & Lifestyle */}
        <SectionHeader title="Diet & Lifestyle" />
        <Row label="Diet type">
          <Select value={form.diet} onChange={v => set('diet', v)} options={DIET_TYPES} />
        </Row>
        <Row label="Meals / day">
          <Select value={form.meals_per_day} onChange={v => set('meals_per_day', v)} options={MEALS_PER_DAY} />
        </Row>
        <Row label="Outside food">
          <Select value={form.outside_food} onChange={v => set('outside_food', v)} options={OUTSIDE_FOOD} />
        </Row>
        <Row label="Physical activity">
          <Select value={form.physical_activity} onChange={v => set('physical_activity', v)} options={ACTIVITY} />
        </Row>
        <Row label="Sleep quality">
          <Select value={form.sleep_quality} onChange={v => set('sleep_quality', v)} options={SLEEP_Q} />
        </Row>

        {/* Living Conditions */}
        <SectionHeader title="Living Conditions" />
        <Row label="Cooking fuel">
          <Select value={form.cooking_fuel} onChange={v => set('cooking_fuel', v)} options={COOKING_FUEL} />
        </Row>
        <Row label="Pets at home"><Toggle value={form.pets} onChange={v => set('pets', v)} /></Row>
        <Row label="Recent travel"><Toggle value={form.travel_history} onChange={v => set('travel_history', v)} /></Row>

        {/* Notes */}
        <SectionHeader title="Additional Notes" />
        <Row label="Notes">
          <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
            placeholder="Any relevant social context..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </Row>

      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-between gap-3">
        {error && (
          <div className="flex items-center gap-1.5 text-red-600 text-sm">
            <AlertCircle size={14} /> {error}
          </div>
        )}
        {!error && <div />}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 size={14} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
