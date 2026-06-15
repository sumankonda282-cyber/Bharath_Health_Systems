import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { BedDouble, RefreshCw, Loader2, X, Activity, ClipboardList, AlertTriangle, Clock } from 'lucide-react'
import api from '../api/client'

// ─── NEWS2 ───────────────────────────────────────────────────────────────────
function calcNEWS2(v) {
  if (!v) return null
  let s = 0
  const rr = v.rr || v.respiration_rate
  if (rr) { if (rr <= 8) s += 3; else if (rr <= 11) s += 1; else if (rr >= 21 && rr <= 24) s += 2; else if (rr >= 25) s += 3 }
  const spo2 = v.spo2
  if (spo2) { if (spo2 <= 91) s += 3; else if (spo2 <= 93) s += 2; else if (spo2 <= 95) s += 1 }
  const sbp = v.bp_systolic || (v.bp ? parseInt(v.bp) : null)
  if (sbp) { if (sbp <= 90) s += 3; else if (sbp <= 100) s += 2; else if (sbp <= 110) s += 1; else if (sbp >= 220) s += 3 }
  const p = v.pulse; if (p) { if (p <= 40) s += 3; else if (p <= 50) s += 1; else if (p >= 91 && p <= 110) s += 1; else if (p >= 111 && p <= 130) s += 2; else if (p >= 131) s += 3 }
  const t = v.temp || v.temperature; if (t) { if (t <= 35) s += 3; else if (t <= 36) s += 1; else if (t >= 38.1 && t <= 39) s += 1; else if (t >= 39.1) s += 2 }
  return s
}

function news2Badge(score) {
  if (score === null || score === undefined) return null
  if (score === 0) return { label: 'NEWS2: 0', cls: 'badge-green' }
  if (score <= 4) return { label: `NEWS2: ${score}`, cls: 'badge-yellow' }
  if (score <= 6) return { label: `NEWS2: ${score}`, cls: 'badge-orange' }
  return { label: `NEWS2: ${score} ⚠`, cls: 'badge-red' }
}

// ─── Vitals abnormal ranges ───────────────────────────────────────────────────
const RANGES = {
  temp: [36.1, 38.0],
  pulse: [60, 100],
  bp_systolic: [90, 140],
  spo2: [95, 100],
  rr: [12, 20],
}
function isAbnormal(key, val) {
  if (!RANGES[key] || val == null) return false
  return val < RANGES[key][0] || val > RANGES[key][1]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000 / 60
  if (diff < 60) return `${Math.round(diff)}m ago`
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`
  return `${Math.round(diff / 1440)}d ago`
}

function hoursAgo(dateStr) {
  if (!dateStr) return Infinity
  return (Date.now() - new Date(dateStr).getTime()) / 1000 / 3600
}

function fmtTime(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function calcAge(dob) {
  if (!dob) return null
  const diff = (Date.now() - new Date(dob).getTime()) / 1000 / 60 / 60 / 24 / 365.25
  return Math.floor(diff)
}

// ─── BedChip ──────────────────────────────────────────────────────────────────
function BedChip({ bed, onClick }) {
  const status = bed.status || (bed.current_admission ? 'occupied' : 'vacant')
  const adm = bed.current_admission || {}
  const patient = adm.patient || {}

  const lastVital = adm.last_vital || adm.latest_vital || null
  const news2Score = calcNEWS2(lastVital)
  const badge = news2Badge(news2Score)

  const lastVitalTime = lastVital?.recorded_at || lastVital?.created_at || adm.last_vital_at
  const vitalsOverdue = hoursAgo(lastVitalTime) > 4

  const name = patient.full_name || adm.patient_name || 'Patient'
  const gender = patient.gender ? patient.gender.charAt(0).toUpperCase() : ''
  const age = calcAge(patient.date_of_birth) ?? adm.patient_age ?? ''
  const mrn = patient.mrn || patient.patient_id || adm.mrn || ''

  const borderColor =
    status === 'occupied' ? 'border-l-red-500' :
    status === 'maintenance' ? 'border-l-gray-400' :
    'border-l-green-600'

  const bgColor =
    status === 'occupied' ? 'bg-white hover:bg-red-50' :
    status === 'maintenance' ? 'bg-gray-100 opacity-70 cursor-default' :
    'bg-white hover:bg-green-50'

  const baseStyle = { width: '160px', minHeight: '120px', flexShrink: 0 }

  if (status === 'maintenance') {
    return (
      <div className={`card border-l-4 ${borderColor} ${bgColor} p-3 rounded-xl cursor-default select-none`} style={baseStyle}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-sm text-gray-500">Bed {bed.bed_number || bed.number}</span>
          <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
        </div>
        <div className="text-xs text-gray-400 mt-2">Maintenance</div>
      </div>
    )
  }

  if (status === 'vacant') {
    return (
      <div className={`card border-l-4 ${borderColor} ${bgColor} p-3 rounded-xl cursor-pointer select-none transition-all`} style={baseStyle} onClick={() => onClick && onClick(bed)}>
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-sm text-gray-700">Bed {bed.bed_number || bed.number}</span>
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
        </div>
        <div className="text-xs font-semibold text-green-700 mt-1">VACANT</div>
        <div className="text-xs text-gray-400 mt-1 italic">[Admit]</div>
      </div>
    )
  }

  return (
    <div className={`card border-l-4 ${borderColor} ${bgColor} p-3 rounded-xl cursor-pointer select-none transition-all`} style={baseStyle} onClick={() => onClick && onClick(bed)}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-sm text-gray-800">Bed {bed.bed_number || bed.number}</span>
        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
      </div>
      <div className="text-xs font-semibold text-gray-800 truncate" title={name}>{name}</div>
      <div className="text-xs text-gray-500 mt-0.5 truncate">
        {[gender && age ? `${gender} · ${age}y` : gender || (age ? `${age}y` : ''), mrn].filter(Boolean).join(' · ')}
      </div>
      {badge && (
        <div className="mt-1">
          <span className={`badge ${badge.cls} text-xs`}>{badge.label}</span>
        </div>
      )}
      {vitalsOverdue && lastVitalTime && (
        <div className="flex items-center gap-1 mt-1">
          <span className="text-red-500 text-xs">⏰</span>
          <span className="text-red-500 text-xs">Vitals {timeAgo(lastVitalTime)}</span>
        </div>
      )}
    </div>
  )
}

// ─── SlideOver ────────────────────────────────────────────────────────────────
function SlideOver({ bed, onClose }) {
  const navigate = useNavigate()
  const adm = bed?.current_admission || {}
  const admId = adm.id
  const patient = adm.patient || {}

  const [vitals, setVitals] = useState(null)
  const [note, setNote] = useState(null)
  const [medCount, setMedCount] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!admId) { setLoading(false); return }
    setLoading(true)
    Promise.allSettled([
      api.get(`/inpatient/admissions/${admId}/vitals`),
      api.get(`/inpatient/admissions/${admId}/notes`),
      api.get(`/inpatient/admissions/${admId}/orders`),
    ]).then(([vRes, nRes, oRes]) => {
      if (vRes.status === 'fulfilled') {
        const arr = Array.isArray(vRes.value) ? vRes.value : (vRes.value?.results || [])
        setVitals(arr.length > 0 ? arr[0] : null)
      }
      if (nRes.status === 'fulfilled') {
        const arr = Array.isArray(nRes.value) ? nRes.value : (nRes.value?.results || [])
        setNote(arr.length > 0 ? arr[0] : null)
      }
      if (oRes.status === 'fulfilled') {
        const arr = Array.isArray(oRes.value) ? oRes.value : (oRes.value?.results || [])
        const active = arr.filter(o => o.status === 'active' || o.status === 'pending' || !o.status)
        setMedCount(active.length)
      }
      setLoading(false)
    })
  }, [admId])

  const name = patient.full_name || adm.patient_name || 'Patient'
  const mrn = patient.mrn || patient.patient_id || adm.mrn || '—'
  const dept = adm.ward || adm.department || bed.ward || bed.department || '—'
  const bedNum = bed.bed_number || bed.number

  const news2Score = calcNEWS2(vitals)
  const badge = news2Badge(news2Score)

  const vitalRows = vitals ? [
    { key: 'temp', label: 'Temp', val: vitals.temp ?? vitals.temperature, unit: '°C' },
    { key: 'pulse', label: 'Pulse', val: vitals.pulse, unit: 'bpm' },
    { key: 'bp_systolic', label: 'BP Sys', val: vitals.bp_systolic ?? (vitals.bp ? parseInt(vitals.bp) : null), unit: 'mmHg' },
    { key: 'spo2', label: 'SpO₂', val: vitals.spo2, unit: '%' },
    { key: 'rr', label: 'RR', val: vitals.rr ?? vitals.respiration_rate, unit: '/min' },
    { key: 'avpu', label: 'AVPU', val: vitals.avpu, unit: '' },
  ] : []

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative bg-white w-full max-w-sm h-full shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b flex items-start justify-between" style={{ background: 'var(--navy, #0F2557)', color: 'white' }}>
          <div>
            <div className="font-bold text-base">Bed {bedNum}</div>
            <div className="text-sm opacity-90 mt-0.5">{name}</div>
            <div className="text-xs opacity-70 mt-0.5">MRN: {mrn} · {dept}</div>
          </div>
          <button onClick={onClose} className="ml-4 mt-0.5 text-white/80 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : !admId ? (
            <div className="empty-state">
              <div className="empty-state-icon"><BedDouble size={32} /></div>
              <div className="empty-state-text">No active admission for this bed.</div>
            </div>
          ) : (
            <>
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-1.5">
                    <Activity size={14} /> Quick Vitals
                  </h3>
                  {vitals && (
                    <span className="text-xs text-gray-400">{timeAgo(vitals.recorded_at || vitals.created_at)}</span>
                  )}
                </div>
                {vitals ? (
                  <>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {vitalRows.map(({ key, label, val, unit }) => (
                        <div key={key} className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
                          <div className="text-xs text-gray-500">{label}</div>
                          <div className={`font-semibold text-sm mt-0.5 ${isAbnormal(key, val) ? 'text-red-600' : 'text-gray-800'}`}>
                            {val != null ? `${val}${unit}` : '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                    {badge && (
                      <div className="flex items-center gap-2">
                        <span className={`badge ${badge.cls}`}>{badge.label}</span>
                        {news2Score >= 5 && (
                          <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                            <AlertTriangle size={12} /> Escalate
                          </span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-gray-400 italic">No vitals recorded yet.</div>
                )}
              </section>

              <section>
                <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-1.5 mb-2">
                  <ClipboardList size={14} /> Latest Note
                </h3>
                {note ? (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">{note.note_type || note.type || 'Note'}</span>
                      <span className="text-xs text-gray-400">{timeAgo(note.created_at)}</span>
                    </div>
                    <p className="text-xs text-gray-700 line-clamp-4 whitespace-pre-wrap">
                      {note.content || note.text || note.note || '—'}
                    </p>
                    {(note.author || note.created_by) && (
                      <div className="text-xs text-gray-400 mt-1">— {note.author || note.created_by}</div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 italic">No notes recorded.</div>
                )}
              </section>

              <section>
                <h3 className="font-semibold text-sm text-gray-700 mb-2">Active Medications</h3>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 text-center">
                  {medCount !== null ? (
                    <div>
                      <span className="text-2xl font-bold text-gray-800">{medCount}</span>
                      <span className="text-xs text-gray-500 ml-1">active order{medCount !== 1 ? 's' : ''}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 italic">Unable to load orders.</div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>

        {admId && (
          <div className="p-4 border-t bg-gray-50 flex gap-2">
            <button className="btn-primary flex-1 text-sm" onClick={() => navigate(`/chart/${admId}`)}>Full Chart →</button>
            <button className="btn-secondary flex-1 text-sm" onClick={() => navigate('/vitals')}>Add Vitals</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── WardBoard ────────────────────────────────────────────────────────────────
export default function WardBoard() {
  const [beds, setBeds] = useState([])
  const [departments, setDepartments] = useState([])
  const [activeDept, setActiveDept] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedBed, setSelectedBed] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const intervalRef = useRef(null)

  const fetchBeds = useCallback(async () => {
    try {
      const data = await api.get('/inpatient/beds/')
      const arr = Array.isArray(data) ? data : (data?.results || [])
      setBeds(arr)
      const depts = [...new Set(arr.map(b => b.ward || b.department).filter(Boolean))]
      setDepartments(depts)
      setLastUpdated(new Date())
      setError(null)
    } catch (e) {
      setError('Failed to load ward data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBeds()
    intervalRef.current = setInterval(fetchBeds, 60000)
    return () => clearInterval(intervalRef.current)
  }, [fetchBeds])

  const filteredBeds = activeDept === 'all'
    ? beds
    : beds.filter(b => (b.ward || b.department) === activeDept)

  const occupied = filteredBeds.filter(b => (b.status || (b.current_admission ? 'occupied' : 'vacant')) === 'occupied').length
  const vacant = filteredBeds.filter(b => (b.status || (b.current_admission ? 'occupied' : 'vacant')) === 'vacant').length
  const total = filteredBeds.length

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <BedDouble size={22} style={{ color: 'var(--navy, #0F2557)' }} />
            Ward Board
          </h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            <span><span className="font-semibold text-gray-700">{total}</span> beds</span>
            <span className="text-red-600"><span className="font-semibold">{occupied}</span> occupied</span>
            <span className="text-green-700"><span className="font-semibold">{vacant}</span> vacant</span>
            {lastUpdated && (
              <span className="text-gray-400 text-xs flex items-center gap-1">
                <Clock size={11} /> Updated {fmtTime(lastUpdated)}
              </span>
            )}
          </div>
        </div>
        <button className="btn-secondary flex items-center gap-2 text-sm" onClick={() => { setLoading(true); fetchBeds() }} disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh
        </button>
      </div>

      {departments.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-thin">
          <button onClick={() => setActiveDept('all')} className={`badge whitespace-nowrap cursor-pointer transition-all ${activeDept === 'all' ? 'badge-blue' : 'badge-gray'}`}>All Wards</button>
          {departments.map(d => (
            <button key={d} onClick={() => setActiveDept(d)} className={`badge whitespace-nowrap cursor-pointer transition-all ${activeDept === d ? 'badge-blue' : 'badge-gray'}`}>{d}</button>
          ))}
        </div>
      )}

      {error && (
        <div className="card p-4 border border-red-200 bg-red-50 text-red-700 text-sm mb-4 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading && beds.length === 0 ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 size={32} className="animate-spin text-gray-300" />
        </div>
      ) : filteredBeds.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><BedDouble size={36} /></div>
          <div className="empty-state-text">No beds found{activeDept !== 'all' ? ` in ${activeDept}` : ''}.</div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {filteredBeds.map(bed => (
            <BedChip key={bed.id || bed.bed_number} bed={bed} onClick={b => {
              const status = b.status || (b.current_admission ? 'occupied' : 'vacant')
              if (status !== 'maintenance') setSelectedBed(b)
            }} />
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Occupied</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> Vacant</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-400 inline-block" /> Maintenance</span>
      </div>

      {selectedBed && <SlideOver bed={selectedBed} onClose={() => setSelectedBed(null)} />}
    </div>
  )
}
