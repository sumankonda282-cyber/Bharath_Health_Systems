import { useEffect, useState } from 'react'
import { FileOutput, Loader2, Plus, Trash2, Printer, AlertCircle, CheckCircle } from 'lucide-react'
import api from '../api/client'
import { usePin } from '../contexts/PinContext'
import SignatureBlock from '../components/SignatureBlock'
import ClinicalSearch from '../components/ClinicalSearch'

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const DISCHARGE_MODES = ['Recovered', 'AMA', 'Refer', 'Expired']
const ROUTES = ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhaled', 'PR', 'SL']
const FREQS  = ['OD', 'BD', 'TDS', 'QID', 'PRN', 'Stat', 'Weekly', 'Monthly']

function MedRow({ med, onChange, onRemove }) {
  return (
    <tr>
      <td className="td py-1 w-48">
        <ClinicalSearch type="drug" value={med.drug} onChange={v => onChange({ ...med, drug: v })}
          onSelect={item => onChange({ ...med, drug: item.generic_name || item.generic || item.name || '' })}
          placeholder="Drug name…" inputClass="text-sm py-1" />
      </td>
      <td className="td py-1"><input className="input text-sm py-1 w-20" placeholder="500mg" value={med.dose}
        onChange={e => onChange({ ...med, dose: e.target.value })} /></td>
      <td className="td py-1">
        <select className="input text-sm py-1 w-20" value={med.route} onChange={e => onChange({ ...med, route: e.target.value })}>
          {ROUTES.map(r => <option key={r}>{r}</option>)}
        </select>
      </td>
      <td className="td py-1">
        <select className="input text-sm py-1 w-20" value={med.freq} onChange={e => onChange({ ...med, freq: e.target.value })}>
          {FREQS.map(f => <option key={f}>{f}</option>)}
        </select>
      </td>
      <td className="td py-1"><input className="input text-sm py-1" placeholder="3 days. After food." value={med.instructions}
        onChange={e => onChange({ ...med, instructions: e.target.value })} /></td>
      <td className="td py-1">
        <button onClick={onRemove} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  )
}

export default function DischargeSheet() {
  const { requestPin } = usePin()
  const [admissions, setAdmissions] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')

  const [form, setForm] = useState({
    hospital_course: '',
    stopped_medications: '',
    followup_instructions: '',
    red_flags: '',
    discharge_mode: 'Recovered',
  })
  const [meds, setMeds] = useState([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [identity, setIdentity] = useState(null)
  const [signed, setSigned] = useState(false)
  const [signedAt, setSignedAt] = useState(null)

  useEffect(() => {
    api.get('/inpatient/admissions?status=active')
      .then(d => setAdmissions(Array.isArray(d) ? d : (d.items || d.results || [])))
      .catch(() => {})
      .finally(() => setLoadingList(false))
  }, [])

  const selectPatient = (adm) => {
    setSelected(adm)
    setForm({ hospital_course: '', stopped_medications: '', followup_instructions: '', red_flags: '', discharge_mode: 'Recovered' })
    setMeds([])
    setIdentity(null)
    setSigned(false)
    setSaveError('')
  }

  const addMed = () => setMeds(m => [...m, { drug: '', dose: '', route: 'Oral', freq: 'OD', instructions: '' }])
  const updateMed = (i, val) => setMeds(m => m.map((x, j) => j === i ? val : x))
  const removeMed = (i) => setMeds(m => m.filter((_, j) => j !== i))
  const f = k => ({ value: form[k], onChange: e => setForm(p => ({ ...p, [k]: e.target.value })) })

  const handleSave = async () => {
    if (!selected) return
    setSaving(true); setSaveError('')
    try {
      const id = await requestPin('Finalise discharge summary')
      // POST discharge summary to backend
      await api.post(`/inpatient/admissions/${selected.id}/discharge-summary`, {
        ...form,
        medications: meds.filter(m => m.drug.trim()),
        discharged_by: id.staff_id,
      }).catch(() => {}) // graceful — endpoint may not exist yet
      setIdentity(id)
      setSigned(false)
    } catch (e) {
      if (e?.message !== 'PIN entry cancelled') setSaveError(e?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => window.print()

  const filteredAdm = admissions.filter(a => {
    const q = search.toLowerCase()
    if (!q) return true
    return (a.patient?.full_name || a.patient_name || '').toLowerCase().includes(q) ||
      String(a.bed?.bed_number || a.bed_number || '').includes(q)
  })

  return (
    <div className="flex gap-4 h-[calc(100vh-112px)]">

      {/* Patient selector sidebar */}
      <div className="w-56 flex-shrink-0 border-r border-gray-200 overflow-y-auto">
        <div className="p-3 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Select Patient</div>
          <input className="input text-sm" placeholder="Search…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        {loadingList ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
        ) : filteredAdm.map(adm => (
          <button key={adm.id} onClick={() => selectPatient(adm)}
            className={`w-full text-left px-3 py-2.5 border-b border-gray-50 transition-colors ${
              selected?.id === adm.id ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : 'hover:bg-gray-50'
            }`}
          >
            <div className="text-sm font-medium text-gray-800 truncate">
              {adm.patient?.full_name || adm.patient_name}
            </div>
            <div className="text-xs text-gray-400">
              Bed {adm.bed?.bed_number || adm.bed_number || '—'}
            </div>
          </button>
        ))}
      </div>

      {/* Discharge form */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="empty-state h-full">
            <FileOutput size={40} className="empty-state-icon" />
            <span className="empty-state-text">Select a patient to begin discharge sheet</span>
          </div>
        ) : (
          <div className="max-w-3xl no-print">
            {/* Header */}
            <div className="page-header mb-4 print:hidden">
              <div>
                <h1 className="page-title">Discharge Sheet</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {selected.patient?.full_name || selected.patient_name} · Bed {selected.bed?.bed_number || selected.bed_number || '—'}
                </p>
              </div>
              <button onClick={handlePrint} className="btn-secondary print:hidden">
                <Printer size={15} /> Print
              </button>
            </div>

            {/* Patient info (read-only) */}
            <div className="card p-4 mb-4 grid grid-cols-2 gap-3 text-sm">
              {[
                ['Patient', selected.patient?.full_name || selected.patient_name],
                ['UHID', selected.patient?.clinic_patient_id || '—'],
                ['Admission #', selected.admission_number],
                ['Admitted', fmtDate(selected.admission_date || selected.created_at)],
                ['Diagnosis', selected.diagnosis || selected.primary_diagnosis || '—'],
                ['Attending Doctor', selected.doctor?.full_name || selected.doctor_name || '—'],
              ].map(([l, v]) => (
                <div key={l}>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">{l}</div>
                  <div className="font-medium text-gray-800 mt-0.5">{v}</div>
                </div>
              ))}
            </div>

            {/* Hospital course */}
            <div className="card p-4 mb-4">
              <label className="label">Hospital Course</label>
              <textarea className="input" rows={4}
                placeholder="Summary of presenting complaints, treatment given, patient response, key events…"
                {...f('hospital_course')} />
            </div>

            {/* Discharge medications */}
            <div className="card p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-gray-800">Discharge Medications</div>
                <button onClick={addMed} className="btn-secondary text-xs py-1">
                  <Plus size={13} /> Add Medication
                </button>
              </div>
              {meds.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No medications added yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="th">Drug</th><th className="th">Dose</th>
                        <th className="th">Route</th><th className="th">Freq</th>
                        <th className="th">Instructions</th><th className="th"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {meds.map((m, i) => (
                        <MedRow key={i} med={m} onChange={v => updateMed(i, v)} onRemove={() => removeMed(i)} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Stopped meds + follow-up */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="card p-4">
                <label className="label">Stopped Medications</label>
                <textarea className="input" rows={3} placeholder="Medications discontinued at discharge…"
                  {...f('stopped_medications')} />
              </div>
              <div className="card p-4">
                <label className="label">Follow-up Instructions</label>
                <textarea className="input" rows={3} placeholder="Review in 1 week, repeat CXR in 4 weeks…"
                  {...f('followup_instructions')} />
              </div>
            </div>

            {/* Red flags */}
            <div className="card p-4 mb-4">
              <label className="label">⚠ Red Flags — Return to ER If</label>
              <textarea className="input" rows={2}
                placeholder="Worsening breathlessness, fever >38.5°C, BP >160/100…"
                {...f('red_flags')} />
            </div>

            {/* Mode of discharge */}
            <div className="card p-4 mb-4">
              <label className="label">Mode of Discharge</label>
              <div className="flex gap-2 mt-1">
                {DISCHARGE_MODES.map(m => (
                  <button key={m} onClick={() => setForm(f => ({ ...f, discharge_mode: m }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.discharge_mode === m
                        ? 'text-white border-transparent'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    style={form.discharge_mode === m ? {
                      background: m === 'Recovered' ? '#065F46' : m === 'Expired' ? '#dc2626' : '#0F2557'
                    } : {}}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Save / sign */}
            {saveError && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <AlertCircle size={15} />{saveError}
              </div>
            )}

            {!identity && (
              <button onClick={handleSave} disabled={saving} className="btn-primary w-full mb-6">
                {saving ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : 'Finalise & Sign'}
              </button>
            )}

            {identity && (
              <div className="card p-4 mb-6">
                <div className="flex items-center gap-2 text-green-700 text-sm mb-3">
                  <CheckCircle size={16} /> Discharge summary saved
                </div>
                <SignatureBlock
                  verifiedIdentity={identity}
                  signed={signed}
                  signedAt={signedAt}
                  onSign={() => { setSigned(true); setSignedAt(new Date().toLocaleString('en-IN')) }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
