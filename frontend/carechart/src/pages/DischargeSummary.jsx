import { useState, useCallback } from 'react'
import { FileText, Plus, Loader2, X, AlertCircle, CheckCircle, Printer } from 'lucide-react'
import api from '../api/client'
import PatientList from '../components/PatientList'
import { usePin } from '../contexts/PinContext'
import { useAuth } from '../contexts/AuthContext'
import SignatureBlock from '../components/SignatureBlock'

const DISCHARGE_TYPES = ['Home', 'Transfer', 'AMA (Against Medical Advice)', 'Deceased', 'LAMA (Left Against Medical Advice)']
const CONDITION_OPTIONS = ['Improved', 'Stable', 'Same', 'Deteriorated', 'Critical']

const EMPTY_FORM = {
  discharge_date: new Date().toISOString().slice(0, 10),
  discharge_time: `${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`,
  discharge_type: 'Home',
  condition_at_discharge: 'Improved',
  discharge_diagnosis: '',
  hospital_course: '',
  procedures_done: '',
  medications_at_discharge: '',
  follow_up_instructions: '',
  dietary_instructions: '',
  activity_instructions: '',
  warning_signs: '',
  follow_up_date: '',
  follow_up_with: '',
  notes: '',
}

function PrintHeader({ patient, admission }) {
  return (
    <div className="hidden print:block mb-6">
      <div className="flex items-start justify-between border-b-2 border-gray-800 pb-3 mb-3">
        <div>
          <div className="text-xl font-extrabold" style={{ color: '#CC1414' }}>BHarath Health Systems</div>
          <div className="text-sm text-gray-600">Discharge Summary</div>
        </div>
        <div className="text-right text-xs text-gray-600">
          <div className="font-semibold">{patient?.full_name}</div>
          <div>MRN: {patient?.mrn || '—'}</div>
          <div>{admission?.admission_number}</div>
        </div>
      </div>
    </div>
  )
}

function SummaryView({ summary, patient, admission }) {
  const rows = [
    ['Discharge Date', `${summary.discharge_date || '—'} ${summary.discharge_time || ''}`],
    ['Discharge Type', summary.discharge_type],
    ['Condition at Discharge', summary.condition_at_discharge],
    ['Discharge Diagnosis', summary.discharge_diagnosis],
    ['Hospital Course / Summary', summary.hospital_course],
    ['Procedures Done', summary.procedures_done],
    ['Medications at Discharge', summary.medications_at_discharge],
    ['Dietary Instructions', summary.dietary_instructions],
    ['Activity Instructions', summary.activity_instructions],
    ['Follow-up Date', summary.follow_up_date],
    ['Follow-up With', summary.follow_up_with],
    ['Follow-up Instructions', summary.follow_up_instructions],
    ['Warning Signs', summary.warning_signs],
    ['Notes', summary.notes],
  ]

  return (
    <div className="print:p-0">
      <PrintHeader patient={patient} admission={admission} />
      <div className="space-y-3">
        {rows.map(([label, val]) => val ? (
          <div key={label} className="grid grid-cols-3 gap-2 text-sm border-b border-gray-50 pb-2">
            <div className="font-semibold text-gray-600">{label}</div>
            <div className="col-span-2 text-gray-800 whitespace-pre-wrap">{val}</div>
          </div>
        ) : null)}
      </div>
      {summary.signed_by && (
        <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-600">
          <span className="font-semibold">Signed by: </span>{summary.signed_by}
          {summary.signed_at && <span> · {new Date(summary.signed_at).toLocaleString('en-IN')}</span>}
        </div>
      )}
    </div>
  )
}

export default function DischargeSummary() {
  const { requestPin } = usePin()
  const { user } = useAuth()
  const isDoctor = ['doctor', 'clinic_admin', 'provider'].includes(user?.role)

  const [selected, setSelected] = useState(null)
  const [existing, setExisting] = useState(null)
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [signedIdentity, setSignedIdentity] = useState(null)
  const [signedAt, setSignedAt] = useState('')

  const loadSummary = useCallback((adm) => {
    setLoadingExisting(true)
    setExisting(null)
    api.get(`/inpatient/admissions/${adm.id}/discharge-summary`)
      .then(data => setExisting(data || null))
      .catch(() => setExisting(null))
      .finally(() => setLoadingExisting(false))
  }, [])

  const handleSelect = (adm) => {
    setSelected(adm)
    setShowForm(false)
    setSubmitSuccess(false)
    setSignedIdentity(null)
    loadSummary(adm)
  }

  const openForm = () => {
    if (existing) {
      setForm({
        discharge_date:         existing.discharge_date         || EMPTY_FORM.discharge_date,
        discharge_time:         existing.discharge_time         || EMPTY_FORM.discharge_time,
        discharge_type:         existing.discharge_type         || 'Home',
        condition_at_discharge: existing.condition_at_discharge || 'Improved',
        discharge_diagnosis:    existing.discharge_diagnosis    || '',
        hospital_course:        existing.hospital_course        || '',
        procedures_done:        existing.procedures_done        || '',
        medications_at_discharge: existing.medications_at_discharge || '',
        follow_up_instructions: existing.follow_up_instructions || '',
        dietary_instructions:   existing.dietary_instructions   || '',
        activity_instructions:  existing.activity_instructions  || '',
        warning_signs:          existing.warning_signs          || '',
        follow_up_date:         existing.follow_up_date         || '',
        follow_up_with:         existing.follow_up_with         || '',
        notes:                  existing.notes                  || '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setSubmitError('')
    setShowForm(true)
  }

  const handleSubmit = async (signed = false) => {
    if (!form.discharge_diagnosis.trim()) {
      setSubmitError('Discharge diagnosis is required')
      return
    }
    setSubmitError('')
    let identity
    try {
      identity = await requestPin('Save Discharge Summary')
    } catch { return }

    setSubmitting(true)
    const now = new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
    try {
      await api.post(`/inpatient/admissions/${selected.id}/discharge-summary`, {
        ...form,
        created_by: identity.staff_id,
        signed,
        signed_by: signed ? identity.full_name : null,
        signed_at: signed ? now : null,
      })
      setSubmitSuccess(true)
      if (signed) { setSignedIdentity(identity); setSignedAt(now) }
      setShowForm(false)
      loadSummary(selected)
    } catch (err) {
      setSubmitError(err.message || 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  const f = (key) => ({
    value: form[key],
    onChange: e => setForm(p => ({ ...p, [key]: e.target.value })),
  })

  return (
    <div className="flex flex-col h-full">
      <div className="page-header flex-shrink-0 print:hidden">
        <h1 className="page-title">Discharge Summary</h1>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="w-52 flex-shrink-0 card overflow-y-auto print:hidden">
          <PatientList selectedId={selected?.id} onSelect={handleSelect} />
        </div>

        <div className="flex-1 overflow-y-auto min-w-0">
          {!selected ? (
            <div className="card h-full flex items-center justify-center">
              <div className="empty-state">
                <FileText size={40} className="empty-state-icon" />
                <span className="empty-state-text">Select a patient to view discharge summary</span>
              </div>
            </div>
          ) : (
            <div className="card p-5 space-y-4">
              {/* Patient header */}
              <div className="flex items-center justify-between print:hidden">
                <div>
                  <h2 className="font-bold text-gray-800">
                    {selected.patient?.full_name || selected.patient_name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {selected.admission_number} · Admitted{' '}
                    {selected.admission_date
                      ? new Date(selected.admission_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {existing && (
                    <button onClick={() => window.print()} className="btn-secondary">
                      <Printer size={14} />Print
                    </button>
                  )}
                  <button
                    onClick={openForm}
                    className="btn-primary"
                  >
                    <Plus size={15} />
                    {existing ? 'Edit Summary' : 'Create Summary'}
                  </button>
                </div>
              </div>

              {/* Success banner */}
              {submitSuccess && !showForm && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                  <CheckCircle size={15} /> Discharge summary saved.
                </div>
              )}

              {signedIdentity && (
                <SignatureBlock verifiedIdentity={signedIdentity} signed signedAt={signedAt} />
              )}

              {/* Loading existing */}
              {loadingExisting && (
                <div className="flex items-center justify-center py-10">
                  <Loader2 size={24} className="animate-spin text-gray-400" />
                </div>
              )}

              {/* Existing summary view */}
              {!loadingExisting && existing && !showForm && (
                <SummaryView summary={existing} patient={selected.patient} admission={selected} />
              )}

              {/* No summary yet */}
              {!loadingExisting && !existing && !showForm && (
                <div className="empty-state py-10">
                  <FileText size={32} className="empty-state-icon" />
                  <span className="empty-state-text">No discharge summary yet</span>
                  {isDoctor && (
                    <button onClick={openForm} className="btn-primary mt-3">
                      <Plus size={15} />Create Discharge Summary
                    </button>
                  )}
                </div>
              )}

              {/* Edit form */}
              {showForm && (
                <form
                  onSubmit={e => { e.preventDefault(); handleSubmit(false) }}
                  className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">
                      {existing ? 'Edit' : 'New'} Discharge Summary
                    </h3>
                    <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="label">Discharge Date</label>
                      <input className="input" type="date" {...f('discharge_date')} />
                    </div>
                    <div>
                      <label className="label">Discharge Time</label>
                      <input className="input" type="time" {...f('discharge_time')} />
                    </div>
                    <div>
                      <label className="label">Discharge Type</label>
                      <select className="input" {...f('discharge_type')}>
                        {DISCHARGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Condition at Discharge</label>
                      <select className="input" {...f('condition_at_discharge')}>
                        {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Follow-up Date</label>
                      <input className="input" type="date" {...f('follow_up_date')} />
                    </div>
                    <div>
                      <label className="label">Follow-up With</label>
                      <input className="input" type="text" placeholder="Dr. name / OPD / Clinic" {...f('follow_up_with')} />
                    </div>
                  </div>

                  <div>
                    <label className="label">Discharge Diagnosis <span className="text-red-500">*</span></label>
                    <input className="input" type="text" placeholder="Primary and secondary diagnoses" {...f('discharge_diagnosis')} required />
                  </div>

                  <div>
                    <label className="label">Hospital Course / Summary</label>
                    <textarea className="input" rows={4}
                      placeholder="Reason for admission, investigations, treatment given, response to treatment..."
                      {...f('hospital_course')} />
                  </div>

                  <div>
                    <label className="label">Procedures Done</label>
                    <textarea className="input" rows={2}
                      placeholder="Surgeries, procedures, interventions..."
                      {...f('procedures_done')} />
                  </div>

                  <div>
                    <label className="label">Medications at Discharge</label>
                    <textarea className="input" rows={4}
                      placeholder="List of medications with dose, frequency, duration..."
                      {...f('medications_at_discharge')} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Dietary Instructions</label>
                      <textarea className="input" rows={2}
                        placeholder="Low salt, high protein, diabetic diet..."
                        {...f('dietary_instructions')} />
                    </div>
                    <div>
                      <label className="label">Activity Instructions</label>
                      <textarea className="input" rows={2}
                        placeholder="Rest at home, light activity, no lifting..."
                        {...f('activity_instructions')} />
                    </div>
                  </div>

                  <div>
                    <label className="label">Follow-up Instructions</label>
                    <textarea className="input" rows={2}
                      placeholder="Return to OPD in 1 week, wound check in 3 days..."
                      {...f('follow_up_instructions')} />
                  </div>

                  <div>
                    <label className="label">Warning Signs (when to seek emergency care)</label>
                    <textarea className="input" rows={2}
                      placeholder="Return immediately if fever >38.5°C, chest pain, breathlessness..."
                      {...f('warning_signs')} />
                  </div>

                  <div>
                    <label className="label">Additional Notes</label>
                    <textarea className="input" rows={2}
                      placeholder="Any other instructions or remarks..."
                      {...f('notes')} />
                  </div>

                  {submitError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                      <AlertCircle size={15} />{submitError}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSubmit(true)}
                      disabled={submitting}
                      className="btn-primary"
                    >
                      {submitting ? <><Loader2 size={14} className="animate-spin" />Saving…</> : 'Save & Sign'}
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-secondary"
                    >
                      Save Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
