import { useEffect, useState, useCallback } from 'react'
import { Stethoscope, Plus, Loader2, AlertCircle, CheckCircle, Clock, User } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { usePin } from '../contexts/PinContext'
import SignatureBlock from '../components/SignatureBlock'
import ClinicalSearch from '../components/ClinicalSearch'

function timeAgo(dateStr) {
  if (!dateStr) return null
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000 / 60
  if (diff < 60) return `${Math.round(diff)}m ago`
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`
  return `${Math.round(diff / 1440)}d ago`
}

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const today = () => new Date().toISOString().slice(0, 10)
const EMPTY_FORM = { round_date: today(), subjective: '', objective: '', assessment: '', plan: '' }

export default function WardRounds() {
  const { user } = useAuth()
  const { requestPin } = usePin()
  const canWrite = ['doctor', 'clinic_admin'].includes(user?.role)

  const [admissions, setAdmissions] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [selected, setSelected] = useState(null)
  const [rounds, setRounds] = useState([])
  const [loadingRounds, setLoadingRounds] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [identity, setIdentity] = useState(null)
  const [signed, setSigned] = useState(false)
  const [signedAt, setSignedAt] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get('/inpatient/admissions?status=active')
      .then(d => setAdmissions(Array.isArray(d) ? d : (d.items || d.results || [])))
      .catch(() => {})
      .finally(() => setLoadingList(false))
  }, [])

  const fetchRounds = useCallback((admId) => {
    setLoadingRounds(true)
    api.get(`/inpatient/admissions/${admId}/rounds`)
      .then(d => setRounds(Array.isArray(d) ? d : (d.items || d.results || [])))
      .catch(() => setRounds([]))
      .finally(() => setLoadingRounds(false))
  }, [])

  const handleSelect = (adm) => {
    setSelected(adm); setShowForm(false); setIdentity(null); setSigned(false)
    setSaveError(''); setForm(EMPTY_FORM); fetchRounds(adm.id)
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true); setSaveError('')
    try {
      const id = await requestPin('Sign this ward round note')
      await api.post(`/inpatient/admissions/${selected.id}/rounds`, form)
      setIdentity(id)
      setSigned(false)
      fetchRounds(selected.id)
    } catch (e) {
      if (e?.message !== 'PIN entry cancelled') setSaveError(e?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const filtered = admissions.filter(a => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const name = (a.patient?.full_name || a.patient_name || '').toLowerCase()
    const bed = (a.bed?.bed_number || a.bed_number || '').toString()
    const diag = (a.diagnosis || a.primary_diagnosis || '').toLowerCase()
    return name.includes(q) || bed.includes(q) || diag.includes(q)
  })

  const lastRound = (adm) => {
    if (!adm._lastRound) return null
    return adm._lastRound
  }

  return (
    <div className="flex gap-0 h-[calc(100vh-112px)]">

      {/* LEFT: Patient Table */}
      <div className="flex-1 min-w-0 overflow-y-auto pr-4">
        <div className="page-header mb-4">
          <h1 className="page-title">Ward Rounds</h1>
          {canWrite && selected && (
            <button className="btn-primary" onClick={() => { setShowForm(true); setForm(EMPTY_FORM); setIdentity(null); setSigned(false) }}>
              <Plus size={15} /> New Round Note
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <input className="input pl-8" placeholder="Search patient, bed, diagnosis…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <Stethoscope size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>

        {loadingList ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state py-16">
            <Stethoscope size={36} className="empty-state-icon" />
            <span className="empty-state-text">No active admissions</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th className="th">Bed</th>
                  <th className="th">Patient</th>
                  <th className="th">Age</th>
                  <th className="th">Diagnosis</th>
                  <th className="th">Last Round</th>
                  <th className="th">Doctor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(adm => {
                  const name = adm.patient?.full_name || adm.patient_name || '—'
                  const age = adm.patient?.age || adm.patient_age || '—'
                  const bed = adm.bed?.bed_number || adm.bed_number || adm.bed_id || '—'
                  const diag = adm.diagnosis || adm.primary_diagnosis || '—'
                  const doctor = adm.doctor?.full_name || adm.doctor_name || '—'
                  const isSelected = selected?.id === adm.id

                  return (
                    <tr key={adm.id}
                      onClick={() => handleSelect(adm)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-emerald-50 border-l-4 border-l-emerald-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="td font-mono font-semibold text-emerald-700">{bed}</td>
                      <td className="td">
                        <div className="font-medium text-gray-800">{name}</div>
                        <div className="text-xs text-gray-400">{adm.admission_number}</div>
                      </td>
                      <td className="td text-gray-600">{age}</td>
                      <td className="td text-gray-700 max-w-[180px] truncate" title={diag}>{diag}</td>
                      <td className="td">
                        <span className="text-xs text-gray-500">
                          {adm.last_round_at
                            ? <span className="text-gray-600">{timeAgo(adm.last_round_at)}</span>
                            : <span className="text-red-500 font-medium">No round yet</span>
                          }
                        </span>
                      </td>
                      <td className="td text-gray-600 text-xs">{doctor}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RIGHT: Round detail panel */}
      {selected && (
        <div className="w-96 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto flex flex-col">
          {/* Patient header */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="font-bold text-gray-800">
              {selected.patient?.full_name || selected.patient_name}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {selected.admission_number} · {selected.diagnosis || selected.primary_diagnosis || '—'}
            </div>
            {canWrite && !showForm && (
              <button
                onClick={() => { setShowForm(true); setForm(EMPTY_FORM); setIdentity(null); setSigned(false) }}
                className="btn-primary mt-2 text-xs py-1"
              >
                <Plus size={13} /> New Round Note
              </button>
            )}
          </div>

          {/* New round form */}
          {showForm && (
            <div className="px-4 py-4 border-b border-gray-100 bg-emerald-50/40">
              <div className="font-semibold text-gray-800 text-sm mb-3">New SOAP Round Note</div>
              <div className="space-y-3">
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input text-sm" value={form.round_date}
                    onChange={e => setForm(f => ({ ...f, round_date: e.target.value }))} />
                </div>
                {[
                  ['subjective', 'S — Subjective', "Patient's complaints…"],
                  ['objective',  'O — Objective',  'Vitals, exam findings…'],
                  ['plan',       'P — Plan',        'Medications, investigations…'],
                ].map(([key, label, ph]) => (
                  <div key={key}>
                    <label className="label">{label}</label>
                    <textarea className="input text-sm" rows={2} placeholder={ph}
                      value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
                {/* Assessment with ClinicalSearch */}
                <div>
                  <label className="label">A — Assessment (Diagnosis)</label>
                  <ClinicalSearch type="condition"
                    value={form.assessment}
                    onChange={v => setForm(f => ({ ...f, assessment: v }))}
                    onSelect={item => setForm(f => ({ ...f, assessment: item.name || item.term || item.label || '' }))}
                    placeholder="Search or type diagnosis…"
                  />
                </div>

                {saveError && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                    <AlertCircle size={13} />{saveError}
                  </div>
                )}

                {!identity && (
                  <div className="flex gap-2">
                    <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 text-sm">
                      {saving ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : 'Save & Sign'}
                    </button>
                    <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
                  </div>
                )}

                {identity && (
                  <>
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs">
                      <CheckCircle size={13} /> Saved successfully
                    </div>
                    <SignatureBlock
                      verifiedIdentity={identity}
                      signed={signed}
                      signedAt={signedAt}
                      onSign={() => { setSigned(true); setSignedAt(new Date().toLocaleString('en-IN')) }}
                    />
                    {signed && (
                      <button onClick={() => { setShowForm(false); setIdentity(null); setSigned(false) }}
                        className="btn-secondary w-full text-sm">
                        Done
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Past rounds */}
          <div className="flex-1 px-4 py-3 space-y-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Round History</div>
            {loadingRounds ? (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="animate-spin text-gray-400" />
              </div>
            ) : rounds.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-8">No round notes yet</div>
            ) : (
              rounds.map((r, i) => (
                <div key={r.id || i} className="border border-gray-200 rounded-xl p-3 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-700">
                      {r.doctor_name || r.written_by || 'Doctor'}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={11} />{timeAgo(r.round_date || r.created_at) || fmtDate(r.round_date)}
                    </span>
                  </div>
                  {[['S', r.subjective], ['O', r.objective], ['A', r.assessment], ['P', r.plan]].map(([k, v]) =>
                    v ? (
                      <div key={k} className="mb-1">
                        <span className="text-xs font-bold text-gray-500">{k}: </span>
                        <span className="text-xs text-gray-700 whitespace-pre-wrap">{v}</span>
                      </div>
                    ) : null
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
