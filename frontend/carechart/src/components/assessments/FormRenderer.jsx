/**
 * @shared-pool
 * FormRenderer — renders the correct assessment form for a given form_key.
 * Priority: 1) published DB schema (editable via admin form builder)
 *           2) hardcoded JSX component from registry.js
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { Suspense, Component, useState, useEffect } from 'react'
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import { FORM_REGISTRY } from './registry'
import api from '../../api/client'
import SchemaFormRenderer from './SchemaFormRenderer'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center gap-3 p-6 rounded-xl border border-red-200 bg-red-50 text-red-700">
          <AlertTriangle size={20} />
          <p className="text-sm font-semibold">Failed to load form</p>
          <p className="text-xs text-red-500">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-100 hover:bg-red-200 transition-colors"
          >
            <RefreshCw size={11} /> Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const Spinner = () => (
  <div className="flex items-center gap-2 p-6 text-gray-400">
    <Loader2 size={16} className="animate-spin" />
    <span className="text-xs">Loading form…</span>
  </div>
)

/**
 * Renders a clinical assessment form by its registry key.
 * Checks the DB first for a published schema-based form; falls back to JSX.
 *
 * @param {string}   formKey      - Subcategory key (e.g. 'ent-ear')
 * @param {number}   patientId    - Patient ID passed to the form
 * @param {number}   encounterId  - Encounter/admission ID
 * @param {Function} onSaved      - Called after successful submission
 * @param {object}   admission    - Admission object (CareChart context)
 * @param {Function} onClose      - Called on cancel / close
 */
export default function FormRenderer({ formKey, patientId, encounterId, onSaved, admission, onClose }) {
  // undefined = still checking; null = not in DB; number = DB form id found
  const [dbFormId, setDbFormId] = useState(undefined)

  useEffect(() => {
    if (!formKey) return
    let cancelled = false
    api.get('/assessment-forms/', { params: { subcategory: formKey, status: 'published', limit: 1 } })
      .then(res => {
        if (cancelled) return
        const forms = res?.forms || []
        setDbFormId(forms.length > 0 ? forms[0].id : null)
      })
      .catch(() => { if (!cancelled) setDbFormId(null) })
    return () => { cancelled = true }
  }, [formKey])

  if (!formKey) return null

  // Still querying the DB
  if (dbFormId === undefined) return <Spinner />

  // DB form found — render schema-driven form
  if (dbFormId !== null) {
    return (
      <ErrorBoundary>
        <SchemaFormRenderer
          formId={dbFormId}
          patientId={patientId}
          encounterId={encounterId}
          onSaved={onSaved}
          admission={admission}
          onClose={onClose || onSaved}
        />
      </ErrorBoundary>
    )
  }

  // Not in DB — fall back to JSX registry
  const Component = FORM_REGISTRY[formKey]

  if (!Component) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
        <AlertTriangle size={14} className="flex-shrink-0" />
        <span className="text-xs">
          No form registered for key <code className="font-mono bg-amber-100 px-1 rounded">{formKey}</code>.
          Add it to <code className="font-mono bg-amber-100 px-1 rounded">registry.js</code> or seed it in the admin form builder.
        </span>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<Spinner />}>
        <Component
          patientId={patientId}
          encounterId={encounterId}
          onSaved={onSaved}
          admission={admission}
          onClose={onClose || onSaved}
        />
      </Suspense>
    </ErrorBoundary>
  )
}
