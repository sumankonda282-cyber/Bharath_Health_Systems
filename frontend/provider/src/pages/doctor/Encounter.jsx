import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doctorApi, appointmentsApi, pharmacyApi, labApi } from '../../api'
import { PageLoader } from '../../components/ui/Spinner'
import SearchDropdown from '../../components/SearchDropdown'
import {
  ArrowLeft, Activity, FileText, Pill, FlaskConical,
  Save, CheckCircle, Plus, Trash2, Scan,
  Star, BookOpen, Calendar as CalendarIcon, Clock
} from 'lucide-react'

const DOSAGE_PRESETS = ['1-0-0', '0-0-1', '1-0-1', '1-1-1', '1-1-0', 'SOS']

const FREQUENCY_OPTIONS = [
  'OD (Once Daily)',
  'BD (Twice Daily)',
  'TDS (Three times daily)',
  'QID (Four times daily)',
  'SOS (As needed)',
  'HS (Bedtime)',
  'Weekly',
  'Monthly',
]

const DURATION_PRESETS = [3, 5, 7, 10, 14, 30]

const INSTRUCTIONS_OPTIONS = [
  'After food',
  'Before food',
  'With food',
  'Empty stomach',
  'With water',
  'As directed',
]

const ROUTE_OPTIONS = [
  'Oral',
  'Topical',
  'Injection',
  'Inhalation',
  'Sublingual',
]

const EMPTY_RX_ITEM = () => ({
  medicine_id: null,
  medicine_name: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: '',
  route: '',
})

function addDays(baseDate, days) {
  const d = new Date(baseDate)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function Encounter() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('soap')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')

  // SOAP
  const [soap, setSoap] = useState({ subjective: '', objective: '', assessment: '', plan: '', follow_up_days: '' })

  // Vitals
  const [vitals, setVitals] = useState({
    blood_pressure_systolic: '', blood_pressure_diastolic: '', pulse_rate: '',
    temperature: '', weight_kg: '', height_cm: '', oxygen_saturation: '', blood_sugar: ''
  })

  // Prescription
  const [rxItems, setRxItems] = useState([EMPTY_RX_ITEM()])
  const [rxNotes, setRxNotes] = useState('')

  // Favourites
  const [showFavPicker, setShowFavPicker] = useState(false)
  const [favourites, setFavourites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('doctor_rx_favourites') || '[]') }
    catch { return [] }
  })

  // Lab
  const [labTests, setLabTests] = useState([{ test_id: null, test_name: '' }])
  const [labNotes, setLabNotes] = useState('')

  // Imaging
  const [imagingTests, setImagingTests] = useState([{ test_id: null, test_name: '' }])
  const [imagingNotes, setImagingNotes] = useState('')

  // Follow-up modal
  const [showFollowUp, setShowFollowUp] = useState(false)
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpTime, setFollowUpTime] = useState('10:00')
  const [followUpSaving, setFollowUpSaving] = useState(false)

  useEffect(() => {
    doctorApi.getEncounter(id)
      .then(r => {
        setData(r)
        if (r.soap_note) setSoap(s => ({ ...s, ...r.soap_note }))
        if (r.vitals) setVitals(v => ({ ...v, ...r.vitals }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const saveVitals = async () => {
    setSaving(true)
    try {
      await appointmentsApi.addVitals({ appointment_id: parseInt(id), patient_id: data.patient.id, ...vitals })
      setSuccess('Vitals saved')
    } catch (err) {
      setSuccess('Error: ' + (err.message || 'Failed'))
    } finally {
      setSaving(false)
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  // Opens follow-up modal instead of completing directly
  const handleCompleteClick = () => {
    const days = parseInt(soap.follow_up_days) || 7
    setFollowUpDate(addDays(new Date(), days))
    setShowFollowUp(true)
  }

  const doComplete = async () => {
    setSaving(true)
    try {
      const payload = {
        soap: { ...soap, appointment_id: parseInt(id) },
        prescription: rxItems.some(i => i.medicine_name) ? { notes: rxNotes, items: rxItems.filter(i => i.medicine_name) } : null,
        lab_order: labTests.some(t => t.test_name) ? { notes: labNotes, tests: labTests.filter(t => t.test_name) } : null,
        imaging_order: imagingTests.some(t => t.test_name) ? { notes: imagingNotes, tests: imagingTests.filter(t => t.test_name) } : null,
      }
      await doctorApi.completeEncounter(id, payload)
      setSuccess('Encounter completed!')
      setTimeout(() => navigate('/doctor-desk'), 1500)
    } catch (err) {
      setSuccess('Error: ' + (err.message || 'Failed'))
      setSaving(false)
    }
  }

  const scheduleAndComplete = async () => {
    setFollowUpSaving(true)
    try {
      await appointmentsApi.createAppointment({
        patient_id: data.patient.id,
        doctor_profile_id: data.doctor_profile_id || data.doctor_id,
        appointment_date: followUpDate,
        appointment_time: followUpTime,
        reason: 'Follow-up - ' + (soap.assessment || ''),
      })
    } catch (_) {
      // best-effort — proceed to complete even if scheduling fails
    } finally {
      setFollowUpSaving(false)
      setShowFollowUp(false)
      doComplete()
    }
  }

  const skipFollowUp = () => {
    setShowFollowUp(false)
    doComplete()
  }

  // Rx helpers
  const addRxItem = () => setRxItems(i => [...i, EMPTY_RX_ITEM()])
  const removeRxItem = (idx) => setRxItems(i => i.filter((_, j) => j !== idx))
  const setRx = (idx, k, v) => setRxItems(i => i.map((item, j) => j === idx ? { ...item, [k]: v } : item))

  // Favourites helpers
  const saveFavourite = () => {
    const set = {
      savedAt: new Date().toLocaleString(),
      items: rxItems.filter(i => i.medicine_name),
      notes: rxNotes,
    }
    const updated = [set, ...favourites].slice(0, 10)
    setFavourites(updated)
    localStorage.setItem('doctor_rx_favourites', JSON.stringify(updated))
    setSuccess('Saved as favourite!')
    setTimeout(() => setSuccess(''), 2000)
  }

  const loadFavourite = (fav) => {
    setRxItems(fav.items.length ? fav.items : [EMPTY_RX_ITEM()])
    setRxNotes(fav.notes || '')
    setShowFavPicker(false)
  }

  const deleteFavourite = (fi) => {
    const updated = favourites.filter((_, i) => i !== fi)
    setFavourites(updated)
    localStorage.setItem('doctor_rx_favourites', JSON.stringify(updated))
  }

  // Lab helpers
  const addLabTest = () => setLabTests(t => [...t, { test_id: null, test_name: '' }])
  const setLab = (idx, k, v) => setLabTests(t => t.map((item, j) => j === idx ? { ...item, [k]: v } : item))

  // Imaging helpers
  const addImagingTest = () => setImagingTests(t => [...t, { test_id: null, test_name: '' }])
  const removeImagingTest = (idx) => setImagingTests(t => t.filter((_, j) => j !== idx))
  const setImaging = (idx, k, v) => setImagingTests(t => t.map((item, j) => j === idx ? { ...item, [k]: v } : item))

  if (loading) return <PageLoader />
  if (!data) return <div className="text-gray-500">Encounter not found</div>

  const patient = data.patient || {}

  return (
    <div className="max-w-4xl">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary p-2"><ArrowLeft size={16} /></button>
          <div>
            <h1 className="page-title">{patient.full_name}</h1>
            <p className="text-sm text-gray-500">{patient.uhid || `Patient #${patient.id}`} · {data.appointment_date} {data.appointment_time}</p>
          </div>
        </div>
        <button onClick={handleCompleteClick} disabled={saving} className="btn-success">
          <CheckCircle size={16} />
          {saving ? 'Saving…' : 'Complete Encounter'}
        </button>
      </div>

      {success && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${success.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {success}
        </div>
      )}

      {/* Patient summary */}
      <div className="card p-4 mb-5 flex items-center gap-6 text-sm">
        <div><span className="text-gray-400">Age:</span> <span className="font-medium">{patient.date_of_birth ? `${new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()} yrs` : '—'}</span></div>
        <div><span className="text-gray-400">Gender:</span> <span className="font-medium">{patient.gender || '—'}</span></div>
        <div><span className="text-gray-400">Blood:</span> <span className="font-medium text-red-600">{patient.blood_group || '—'}</span></div>
        <div><span className="text-gray-400">Allergies:</span> <span className="font-medium text-orange-600">{patient.allergies || 'None'}</span></div>
        <div><span className="text-gray-400">Reason:</span> <span className="font-medium">{data.reason || '—'}</span></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-5 w-fit">
        {[
          { key: 'soap', label: 'SOAP Notes', icon: FileText },
          { key: 'vitals', label: 'Vitals', icon: Activity },
          { key: 'rx', label: 'Prescription', icon: Pill },
          { key: 'lab', label: 'Lab Orders', icon: FlaskConical },
          { key: 'imaging', label: 'Imaging', icon: Scan },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === t.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* SOAP */}
      {tab === 'soap' && (
        <div className="card p-6 space-y-4">
          {[
            ['subjective', 'S — Subjective (Chief complaint, history)', 5],
            ['objective', 'O — Objective (Examination findings)', 4],
            ['assessment', 'A — Assessment / Diagnosis', 4],
            ['plan', 'P — Plan (Treatment, advice)', 4],
          ].map(([key, label, rows]) => (
            <div key={key}>
              <label className="label">{label}</label>
              <textarea
                className="input resize-none"
                rows={rows}
                value={soap[key]}
                onChange={e => setSoap(s => ({ ...s, [key]: e.target.value }))}
                placeholder={`Enter ${key} notes…`}
              />
            </div>
          ))}
          <div className="w-32">
            <label className="label">Follow-up (days)</label>
            <input className="input" type="number" value={soap.follow_up_days} onChange={e => setSoap(s => ({ ...s, follow_up_days: e.target.value }))} placeholder="7" />
          </div>
        </div>
      )}

      {/* Vitals */}
      {tab === 'vitals' && (
        <div className="card p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              ['BP Systolic',  'blood_pressure_systolic',  'number', 'mmHg'],
              ['BP Diastolic', 'blood_pressure_diastolic', 'number', 'mmHg'],
              ['Pulse Rate',   'pulse_rate',               'number', 'bpm'],
              ['Temperature',  'temperature',              'number', '°F'],
              ['Weight',       'weight_kg',                'number', 'kg'],
              ['Height',       'height_cm',                'number', 'cm'],
              ['SpO2',         'oxygen_saturation',        'number', '%'],
              ['Blood Sugar',  'blood_sugar',              'number', 'mg/dL'],
            ].map(([label, key, type, unit]) => (
              <div key={key}>
                <label className="label">{label} <span className="text-gray-400 font-normal">{unit}</span></label>
                <input
                  className="input"
                  type={type}
                  value={vitals[key]}
                  onChange={e => setVitals(v => ({ ...v, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <button onClick={saveVitals} disabled={saving} className="btn-primary">
            <Save size={15} />Save Vitals
          </button>
        </div>
      )}

      {/* Prescription */}
      {tab === 'rx' && (
        <div className="card p-6">

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700 text-sm">Medicines</h3>
            <div className="flex gap-2">
              {/* Load Favourite */}
              <div className="relative">
                <button
                  onClick={() => setShowFavPicker(v => !v)}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                >
                  <BookOpen size={13} />Load Favourite
                </button>
                {showFavPicker && (
                  <div className="absolute right-0 top-9 z-30 bg-white border border-gray-200 rounded-xl shadow-xl w-80 max-h-72 overflow-y-auto">
                    {favourites.length === 0 ? (
                      <p className="text-gray-400 text-sm p-4 text-center">No saved favourites yet.</p>
                    ) : (
                      favourites.map((fav, fi) => (
                        <div key={fi} className="flex items-start gap-2 px-3 py-2.5 hover:bg-gray-50 border-b last:border-0">
                          <button
                            onClick={() => loadFavourite(fav)}
                            className="flex-1 text-left min-w-0"
                          >
                            <p className="text-xs font-medium text-gray-800 truncate">
                              {fav.items.map(i => i.medicine_name).join(', ') || 'Empty set'}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">{fav.savedAt}</p>
                          </button>
                          <button
                            onClick={() => deleteFavourite(fi)}
                            className="text-red-400 hover:text-red-600 mt-0.5 shrink-0"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              {/* Save as Favourite */}
              <button
                onClick={saveFavourite}
                className="btn-secondary text-xs flex items-center gap-1.5 text-yellow-600 hover:text-yellow-700"
              >
                <Star size={13} />Save as Favourite
              </button>
            </div>
          </div>

          {/* Medicine rows */}
          <div className="space-y-4 mb-4">
            {rxItems.map((item, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">

                {/* Medicine name + Route + Delete */}
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-7">
                    <label className="label text-xs">Medicine Name</label>
                    <SearchDropdown
                      value={item.medicine_name}
                      onChange={v => setRx(idx, 'medicine_name', v)}
                      onSelect={s => {
                        setRx(idx, 'medicine_name', s.name + (s.strength ? ' ' + s.strength : '') + (s.form ? ' ' + s.form : ''))
                        setRx(idx, 'medicine_id', s.id)
                      }}
                      fetchSuggestions={q => pharmacyApi.searchMedicines(q)}
                      placeholder="Search medicine…"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="label text-xs">Route</label>
                    <select
                      className="input text-sm"
                      value={item.route}
                      onChange={e => setRx(idx, 'route', e.target.value)}
                    >
                      <option value="">Select…</option>
                      {ROUTE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="col-span-1 flex justify-end pb-0.5">
                    <button
                      onClick={() => removeRxItem(idx)}
                      className="btn-secondary p-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Dosage smart picker */}
                <div>
                  <label className="label text-xs">Dosage</label>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {DOSAGE_PRESETS.map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setRx(idx, 'dosage', preset)}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-all ${
                          item.dosage === preset
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <input
                    className="input text-sm"
                    placeholder="Or type custom dosage…"
                    value={item.dosage}
                    onChange={e => setRx(idx, 'dosage', e.target.value)}
                  />
                </div>

                {/* Frequency + Duration */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Frequency</label>
                    <select
                      className="input text-sm"
                      value={item.frequency}
                      onChange={e => setRx(idx, 'frequency', e.target.value)}
                    >
                      <option value="">Select…</option>
                      {FREQUENCY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs">Duration</label>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {DURATION_PRESETS.map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setRx(idx, 'duration', `${d} days`)}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
                            item.duration === `${d} days`
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-green-400 hover:text-green-600'
                          }`}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>
                    <input
                      className="input text-sm"
                      placeholder="Or type duration…"
                      value={item.duration}
                      onChange={e => setRx(idx, 'duration', e.target.value)}
                    />
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <label className="label text-xs">Instructions</label>
                  <select
                    className="input text-sm"
                    value={item.instructions}
                    onChange={e => setRx(idx, 'instructions', e.target.value)}
                  >
                    <option value="">Select…</option>
                    {INSTRUCTIONS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

              </div>
            ))}
          </div>

          <button onClick={addRxItem} className="btn-secondary text-sm mb-4"><Plus size={14} />Add Medicine</button>
          <div>
            <label className="label">Prescription Notes</label>
            <textarea className="input resize-none" rows={2} value={rxNotes} onChange={e => setRxNotes(e.target.value)} placeholder="General notes…" />
          </div>
        </div>
      )}

      {/* Lab Orders */}
      {tab === 'lab' && (
        <div className="card p-6">
          <div className="space-y-2 mb-4">
            {labTests.map((t, idx) => (
              <div key={idx} className="flex gap-2">
                <SearchDropdown
                  value={t.test_name}
                  onChange={v => setLab(idx, 'test_name', v)}
                  onSelect={s => { setLab(idx, 'test_name', s.name); setLab(idx, 'test_id', s.id) }}
                  fetchSuggestions={q => labApi.searchTests(q, 'lab')}
                  placeholder="Search lab test…"
                  className="flex-1"
                />
                <button onClick={() => setLabTests(t => t.filter((_, j) => j !== idx))} className="btn-secondary p-2 text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
          <button onClick={addLabTest} className="btn-secondary text-sm mb-4"><Plus size={14} />Add Test</button>
          <div>
            <label className="label">Clinical Notes</label>
            <textarea className="input resize-none" rows={2} value={labNotes} onChange={e => setLabNotes(e.target.value)} placeholder="Reason for tests…" />
          </div>
        </div>
      )}

      {/* Imaging */}
      {tab === 'imaging' && (
        <div className="card p-6">
          <div className="space-y-2 mb-4">
            {imagingTests.map((t, idx) => (
              <div key={idx} className="flex gap-2">
                <SearchDropdown
                  value={t.test_name}
                  onChange={v => setImaging(idx, 'test_name', v)}
                  onSelect={s => { setImaging(idx, 'test_name', s.name); setImaging(idx, 'test_id', s.id) }}
                  fetchSuggestions={q => labApi.searchTests(q, 'imaging')}
                  placeholder="Search imaging study…"
                  className="flex-1"
                />
                <button onClick={() => removeImagingTest(idx)} className="btn-secondary p-2 text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
          <button onClick={() => setImagingTests(t => [...t, { test_id: null, test_name: '' }])} className="btn-secondary text-sm mb-4"><Plus size={14}/>Add Imaging</button>
          <div>
            <label className="label">Clinical Notes</label>
            <textarea className="input resize-none" rows={2} value={imagingNotes} onChange={e => setImagingNotes(e.target.value)} placeholder="Reason for imaging…"/>
          </div>
        </div>
      )}

      {/* Follow-up scheduling modal */}
      {showFollowUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">

            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-2.5 rounded-xl">
                <CalendarIcon size={20} className="text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Schedule Follow-up?</h2>
            </div>

            {soap.follow_up_days && parseInt(soap.follow_up_days) > 0 && (
              <div className="mb-4 px-3 py-2 bg-blue-50 rounded-lg text-sm text-blue-700 flex items-center gap-2">
                <Clock size={14} className="shrink-0" />
                Doctor recommended {soap.follow_up_days}-day follow-up
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="label">Follow-up Date</label>
                <input
                  type="date"
                  className="input"
                  value={followUpDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setFollowUpDate(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Preferred Time</label>
                <input
                  type="time"
                  className="input"
                  value={followUpTime}
                  onChange={e => setFollowUpTime(e.target.value)}
                />
              </div>
              {soap.assessment && (
                <div>
                  <label className="label text-xs">Reason (auto-filled)</label>
                  <input
                    className="input text-sm text-gray-500 bg-gray-50"
                    value={`Follow-up - ${soap.assessment}`}
                    readOnly
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={scheduleAndComplete}
                disabled={followUpSaving || !followUpDate}
                className="btn-primary flex-1"
              >
                <CalendarIcon size={15} />
                {followUpSaving ? 'Scheduling…' : 'Schedule & Complete'}
              </button>
              <button
                onClick={skipFollowUp}
                disabled={followUpSaving}
                className="btn-secondary flex-1"
              >
                Skip
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
