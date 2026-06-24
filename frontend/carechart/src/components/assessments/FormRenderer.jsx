/**
 * @shared-pool
 * FormRenderer — renders the correct JSX assessment form component by form_key.
 * Looks up FORM_REGISTRY[formKey] and lazy-loads the component.
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { Suspense, Component } from 'react'
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import { FORM_REGISTRY } from './registry'

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

/**
 * Renders a clinical assessment form by its registry key.
 * @param {string}   formKey      - Subcategory key from the backend (e.g. 'ent-ear')
 * @param {number}   patientId    - Patient ID passed to the form
 * @param {number}   encounterId  - Encounter/admission ID passed to the form
 * @param {Function} onSaved      - Called after form is submitted successfully
 */
export default function FormRenderer({ formKey, patientId, encounterId, onSaved, admission, onClose }) {
  if (!formKey) return null

  const Component = FORM_REGISTRY[formKey]

  if (!Component) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
        <AlertTriangle size={14} className="flex-shrink-0" />
        <span className="text-xs">
          No form component registered for key <code className="font-mono bg-amber-100 px-1 rounded">{formKey}</code>.
          Add it to <code className="font-mono bg-amber-100 px-1 rounded">registry.js</code>.
        </span>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="flex items-center gap-2 p-6 text-gray-400">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs">Loading form…</span>
          </div>
        }
      >
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
