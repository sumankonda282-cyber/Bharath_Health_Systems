import { X } from 'lucide-react'
import FormRenderer from '../../components/assessments/FormRenderer'

const NAVY = '#0F2557'

// ─────────────────────────────────────────────────────────────────────────────
// In-chart modal for the rich JSX assessment forms (FORM_POOL) — the hundreds of
// specialty forms keyed by form.key (cardiology, ortho, peds, ENT, OBG, …). Same
// CareChart-style shell as the DB-form modal; the actual form is rendered by the
// shared FormRenderer registry, which lazy-loads the component for form.key and
// wraps it in its own error boundary + suspense.
// ─────────────────────────────────────────────────────────────────────────────

export default function RichAssessmentFormModal({ form, patientId, admissionId, patientName, onClose }) {
  const title = form?.name || form?.title || 'Assessment Form'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,37,87,0.6)' }}>
      <div className="flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: '70vw', height: '80vh', maxWidth: 1100 }}>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-3.5 border-b shadow-sm"
          style={{ background: NAVY, borderColor: '#1e3a6e' }}>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Assessment Form</span>
            <span className="text-lg font-extrabold text-white leading-tight truncate">{title}</span>
            {patientName && <span className="text-[11px] text-blue-200 truncate">Patient: {patientName}</span>}
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-blue-300 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Body — the lazy-loaded rich form */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-4xl mx-auto px-6 py-6">
            <FormRenderer
              formKey={form?.key}
              patientId={patientId || null}
              encounterId={admissionId || null}
              admission={admissionId ? { id: admissionId } : null}
              onSaved={onClose}
              onClose={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
