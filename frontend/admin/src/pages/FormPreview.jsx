import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  Calculator,
  Eye,
  Camera,
  Paperclip,
  User,
  ChevronDown,
  Star,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import api from '../api/client'

// ─── Field Preview Components ─────────────────────────────────────────────────

function InputLike({ placeholder = 'Enter text…', className = '' }) {
  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-500 text-sm italic ${className}`}>
      {placeholder}
    </div>
  )
}

function OptionItem({ type, label }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      {type === 'radio' ? (
        <span className="inline-block w-4 h-4 rounded-full border-2 border-gray-600 flex-shrink-0" />
      ) : (
        <span className="inline-block w-4 h-4 rounded border-2 border-gray-600 flex-shrink-0" />
      )}
      <span className="text-gray-400 text-sm">{label}</span>
    </div>
  )
}

function ScalePreview({ field }) {
  const style = field.scale_style || field.style || 'nrs'

  if (style === 'stars') {
    return (
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={20} className="text-gray-600" />
        ))}
      </div>
    )
  }

  if (style === 'slider') {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">{field.min_value ?? 0}</span>
        <div className="flex-1 h-2 bg-gray-700 rounded-full" />
        <span className="text-xs text-gray-500">{field.max_value ?? 10}</span>
      </div>
    )
  }

  // NRS (default)
  const min = field.min_value ?? 0
  const max = field.max_value ?? 10
  const count = max - min + 1
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          disabled
          className="w-8 h-8 text-xs font-medium text-gray-600 border border-gray-700 rounded bg-gray-900"
        >
          {min + i}
        </button>
      ))}
    </div>
  )
}

function NumberRefBadge({ label, color }) {
  const colors = {
    red:    'bg-red-900/30 text-red-400 border-red-800/50',
    yellow: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50',
    green:  'bg-green-900/30 text-green-400 border-green-800/50',
  }
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${colors[color] || colors.green}`}>
      {label}
    </span>
  )
}

function FieldPreview({ field }) {
  const { type } = field

  // Conditional badge
  const hasConditions = Array.isArray(field.conditions) && field.conditions.length > 0

  return (
    <div className="mb-0">
      {/* Label row */}
      {type !== 'divider' && type !== 'label' && (
        <div className="flex items-center flex-wrap gap-2 mb-1">
          <span className="text-sm font-medium text-white">
            {field.label || 'Unlabelled Field'}
            {field.required && <span className="text-red-400 ml-0.5">*</span>}
          </span>
          {hasConditions && (
            <span className="inline-flex items-center gap-1 text-xs text-purple-400 bg-purple-900/20 border border-purple-800/40 px-1.5 py-0.5 rounded-full">
              <Eye size={10} />
              Conditional
            </span>
          )}
          {field.hidden && (
            <span className="text-xs text-gray-500 italic">(Hidden by default)</span>
          )}
        </div>
      )}

      {/* Help text */}
      {field.help_text && (
        <p className="text-xs text-gray-500 mb-1.5">{field.help_text}</p>
      )}

      {/* Input preview by type */}
      {type === 'text' && (
        <InputLike placeholder={field.placeholder || 'Enter text…'} />
      )}

      {type === 'textarea' && (
        <InputLike placeholder={field.placeholder || 'Enter text…'} className="h-20 flex items-start pt-2" />
      )}

      {type === 'number' && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <InputLike placeholder={field.placeholder || '0'} className="flex-1" />
            {field.unit && (
              <span className="text-xs text-gray-400 bg-gray-800 border border-gray-700 px-2 py-2 rounded-lg">
                {field.unit}
              </span>
            )}
          </div>
          {/* Reference ranges */}
          {(field.critical_low != null || field.critical_high != null ||
            field.normal_low != null || field.normal_high != null) && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {field.critical_low != null && (
                <NumberRefBadge label={`Crit. Low < ${field.critical_low}`} color="red" />
              )}
              {field.normal_low != null && (
                <NumberRefBadge label={`Normal ≥ ${field.normal_low}`} color="green" />
              )}
              {field.normal_high != null && (
                <NumberRefBadge label={`Normal ≤ ${field.normal_high}`} color="green" />
              )}
              {field.critical_high != null && (
                <NumberRefBadge label={`Crit. High > ${field.critical_high}`} color="red" />
              )}
            </div>
          )}
        </div>
      )}

      {type === 'date' && (
        <InputLike placeholder="DD / MM / YYYY" />
      )}

      {type === 'time' && (
        <InputLike placeholder="HH : MM" />
      )}

      {type === 'datetime' && (
        <InputLike placeholder="DD / MM / YYYY  HH : MM" />
      )}

      {type === 'radio' && (
        <div className="space-y-0.5 pl-1">
          {(field.options || []).length > 0
            ? field.options.map((opt, i) => (
                <OptionItem key={i} type="radio" label={typeof opt === 'string' ? opt : opt.label} />
              ))
            : <OptionItem type="radio" label="Option 1" />
          }
        </div>
      )}

      {type === 'checkbox' && (
        <div className="space-y-0.5 pl-1">
          {(field.options || []).length > 0
            ? field.options.map((opt, i) => (
                <OptionItem key={i} type="checkbox" label={typeof opt === 'string' ? opt : opt.label} />
              ))
            : <OptionItem type="checkbox" label="Option 1" />
          }
        </div>
      )}

      {type === 'dropdown' && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 flex items-center justify-between text-gray-500 text-sm">
          <span className="italic">{field.placeholder || 'Select an option…'}</span>
          <ChevronDown size={14} />
        </div>
      )}

      {type === 'scale' && (
        <ScalePreview field={field} />
      )}

      {type === 'calculated' && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-500 mb-1">Formula</p>
          <code className="text-xs font-mono text-gray-400 break-all">
            {field.formula || '= …'}
          </code>
        </div>
      )}

      {type === 'label' && (
        <LabelFieldPreview field={field} />
      )}

      {type === 'divider' && (
        <hr className="border-t border-gray-600 my-1" />
      )}

      {type === 'signature' && (
        <div className="border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center h-20 text-gray-500 text-sm italic">
          [ Signature Area ]
        </div>
      )}

      {type === 'photo' && (
        <div className="border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center h-20 gap-2 text-gray-500">
          <Camera size={20} />
          <span className="text-xs italic">Photo Upload Area</span>
        </div>
      )}

      {type === 'file' && (
        <div className="border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center h-20 gap-2 text-gray-500">
          <Paperclip size={20} />
          <span className="text-xs italic">File Upload Area</span>
        </div>
      )}

      {type === 'body_map' && (
        <div className="border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center h-28 gap-2 text-gray-500">
          <User size={24} />
          <span className="text-xs italic">Body Diagram</span>
        </div>
      )}

      {type === 'table' && (
        <TableFieldPreview field={field} />
      )}

      {type === 'rich_text' && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-3 text-gray-500 text-sm italic min-h-[80px]">
          Rich text content…
        </div>
      )}

      {type === 'snomed' && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 flex items-center justify-between">
          <span className="text-gray-500 text-sm italic">{field.placeholder || 'Search SNOMED CT…'}</span>
          {field.code && (
            <span className="text-xs font-mono text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
              {field.code}
            </span>
          )}
        </div>
      )}

      {type === 'loinc' && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 flex items-center justify-between">
          <span className="text-gray-500 text-sm italic">{field.placeholder || 'Search LOINC…'}</span>
          {field.code && (
            <span className="text-xs font-mono text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
              {field.code}
            </span>
          )}
        </div>
      )}

      {type === 'repeating' && (
        <div className="border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center h-16 text-gray-500 text-sm italic">
          <RefreshCw size={14} className="mr-2" />
          Repeating Section
        </div>
      )}
    </div>
  )
}

function LabelFieldPreview({ field }) {
  const style = field.label_style || field.style || 'h2'
  const text = field.content || field.label || 'Label'
  const classes = {
    h1: 'text-2xl font-bold text-white',
    h2: 'text-xl font-semibold text-white',
    h3: 'text-base font-semibold text-white',
    p:  'text-sm text-gray-300',
    small: 'text-xs text-gray-400',
  }
  const Tag = style === 'small' ? 'p' : style
  return <Tag className={classes[style] || classes.p}>{text}</Tag>
}

function TableFieldPreview({ field }) {
  const columns = field.columns || []
  if (columns.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-500 text-xs italic">
        Table (no columns defined)
      </div>
    )
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700">
      <table className="w-full text-xs">
        <thead className="bg-gray-800">
          <tr>
            {columns.map((col, i) => (
              <th key={i} className="px-3 py-2 text-left text-gray-400 font-medium whitespace-nowrap">
                {typeof col === 'string' ? col : col.label || `Col ${i + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-gray-700">
            {columns.map((_, i) => (
              <td key={i} className="px-3 py-2 text-gray-600 italic">—</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ─── Section Preview ──────────────────────────────────────────────────────────

function SectionPreview({ section }) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl mb-6 overflow-hidden">
      {/* Section header */}
      <div className="bg-gray-800/50 px-6 py-4 border-b border-gray-700">
        <div className="flex items-center flex-wrap gap-2">
          <h2 className="text-white font-semibold text-base">{section.title || 'Untitled Section'}</h2>
          {section.repeatable && (
            <span className="text-xs bg-blue-900/30 text-blue-400 border border-blue-800/40 px-2 py-0.5 rounded-full">
              Repeatable
            </span>
          )}
        </div>
        {section.description && (
          <p className="text-gray-400 text-sm mt-0.5">{section.description}</p>
        )}
      </div>

      {/* Section body */}
      <div className={`px-6 py-5 grid ${gridCols[section.layout ?? 1] || 'grid-cols-1'} gap-5`}>
        {(section.fields || []).length === 0 ? (
          <p className="text-gray-600 text-sm italic col-span-full">No fields in this section.</p>
        ) : (
          section.fields.map((field) => (
            <FieldPreview key={field.id} field={field} />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Score Preview Card ────────────────────────────────────────────────────────

const BAND_COLOR_STYLES = {
  green:  'bg-green-900/30 text-green-400 border-green-800/50',
  yellow: 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50',
  orange: 'bg-orange-900/30 text-orange-400 border-orange-800/50',
  red:    'bg-red-900/30 text-red-400 border-red-800/50',
}

function ScorePreviewCard({ scoringConfig }) {
  if (!scoringConfig || scoringConfig.type !== 'custom') return null
  const bands = [...(scoringConfig.bands || [])].sort((a, b) => a.min - b.min)

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-700 flex items-center gap-2">
        <Calculator size={16} className="text-[#F5821E]" />
        <h2 className="text-white font-semibold text-base">Score Preview</h2>
        <span className="ml-auto text-xs text-gray-500 capitalize">{scoringConfig.type}</span>
      </div>

      {bands.length === 0 ? (
        <p className="px-6 py-4 text-gray-500 text-sm italic">No score bands defined.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Range</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Label</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {bands.map((band, i) => (
                <tr key={i} className="border-b border-gray-700/50 last:border-0">
                  <td className="px-4 py-2.5 font-mono text-gray-300">
                    {band.min}–{band.max}
                  </td>
                  <td className="px-4 py-2.5">
                    {band.label && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${BAND_COLOR_STYLES[band.color] || BAND_COLOR_STYLES.green}`}>
                        {band.label}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{band.action || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FormPreview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState(null)
  const [schema, setSchema] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Use schema passed via location.state if available
    if (location.state?.schema) {
      setSchema(location.state.schema)
      if (location.state?.form) setForm(location.state.form)
      setLoading(false)
      return
    }

    if (!id) {
      setError('No form ID provided.')
      setLoading(false)
      return
    }

    api.get(`/platform/forms/${id}`)
      .then((data) => {
        setForm(data)
        setSchema(data.schema || { sections: [] })
        setError('')
      })
      .catch((err) => {
        setError(err.message || 'Form not found.')
      })
      .finally(() => setLoading(false))
  }, [id, location.state])

  const sections = schema?.sections ?? []
  const scoringConfig = form?.scoring_config ?? null

  // ── Loading ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 size={32} className="text-[#F5821E] animate-spin" />
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-xl font-semibold text-white">Form not found</p>
        <p className="text-gray-400 text-sm">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:text-white border border-gray-700 text-sm transition-colors"
        >
          <ArrowLeft size={14} />
          Go back
        </button>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-30 bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-4">
        {/* Back */}
        <button
          onClick={() => form?.id ? navigate(`/forms/builder/${form.id}`) : navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Builder</span>
        </button>

        {/* Title */}
        <div className="flex-1 text-center">
          <span className="text-white font-semibold text-lg truncate">
            {form?.title || 'Form Preview'}
          </span>
        </div>

        {/* Badge */}
        <span className="bg-blue-900/30 text-blue-400 border border-blue-800 text-xs px-3 py-1 rounded-full flex-shrink-0">
          Preview Mode
        </span>
      </header>

      {/* ── Scoring Banner ── */}
      {scoringConfig && (
        <div className="bg-indigo-900/20 border-b border-indigo-800/30 px-6 py-3 text-sm text-indigo-300">
          <span className="font-medium">Scored Form</span>
          {' — '}
          Type: <span className="font-mono uppercase">{scoringConfig.type}</span>
          {scoringConfig.bands?.length > 0 && (
            <> | Bands: {scoringConfig.bands.length}</>
          )}
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">

        {sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-gray-500 text-sm italic">This form has no sections yet.</p>
          </div>
        ) : (
          sections.map((section) => (
            <SectionPreview key={section.id} section={section} />
          ))
        )}

        {/* Score preview card (custom only) */}
        {scoringConfig?.type === 'custom' && (
          <ScorePreviewCard scoringConfig={scoringConfig} />
        )}
      </main>
    </div>
  )
}
