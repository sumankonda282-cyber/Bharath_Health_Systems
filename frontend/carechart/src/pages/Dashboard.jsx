import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BedDouble, Activity, ShieldAlert, UserPlus, ChevronRight, Loader2, AlertTriangle } from 'lucide-react'
import { useWardSession } from '../contexts/WardSessionContext'
import api from '../api/client'

const GREEN = '#065F46'

const CAUTION_STYLE = {
  nbm:        { label: 'NBM',         bg: '#fff7ed', color: '#c2410c' },
  post_op:    { label: 'Post-op',     bg: '#eff6ff', color: '#1d4ed8' },
  blood_thin: { label: 'Blood Thin.', bg: '#fef2f2', color: '#b91c1c' },
  intubated:  { label: 'Intubated',   bg: '#f5f3ff', color: '#7c3aed' },
  pre_surg:   { label: 'Pre-surgery', bg: '#fefce8', color: '#a16207' },
  critical:   { label: 'Critical',    bg: '#fef2f2', color: '#b91c1c' },
  isolation:  { label: 'Isolation',   bg: '#f0fdf4', color: '#15803d' },
}

function CautionBadge({ flag }) {
  const s = CAUTION_STYLE[flag] || { label: flag, bg: '#f3f4f6', color: '#374151' }
  return (
    <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function StatCard({ icon: Icon, label, value, color, loading, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 min-w-0 bg-white rounded-xl border p-4 text-left transition-all hover:shadow-md"
      style={{ borderColor: active ? color : '#e5e7eb', boxShadow: active ? `0 0 0 2px ${color}22` : undefined }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
          {loading
            ? <Loader2 size={20} className="mt-1 animate-spin text-gray-300" />
            : <p className="text-3xl font-extrabold mt-1" style={{ color }}>{value ?? '—'}</p>
          }
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      {active && <p className="text-[10px] font-semibold mt-2" style={{ color }}>▲ Showing below</p>}
    </button>
  )
}

const COL_CFG = {
  occupied:   { title: 'Occupied Beds' },
  vitals:     { title: 'Pending Vitals (>4h)' },
  critical:   { title: 'Critical Alerts' },
  admissions: { title: 'New Admissions Today' },
}

const TABLE_COLS = ['Bed', 'Patient', 'Age/Sex', 'Condition', 'Cautions', 'Last Recorded', 'Doctor', 'MRN']

function PatientTable({ rows, loading, onRowClick }) {
  if (loading) return (
    <div className="flex items-center justify-center py-10 text-gray-400">
      <Loader2 size={20} className="animate-spin mr-2" /> Loading…
    </div>
  )
  if (!rows || rows.length === 0) return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
      <AlertTriangle size={24} className="mb-2 opacity-40" />
      <p className="text-sm">No patients to show</p>
    </div>
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {TABLE_COLS.map(c => (
              <th key={c} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 whitespace-nowrap">{c}</th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={p.id || i} onClick={() => onRowClick(p)}
              className="border-b border-gray-50 hover:bg-green-50 cursor-pointer transition-colors last:border-0"
              style={p.cautions?.includes('critical') ? { background: '#fef2f2' } : undefined}
            >
              <td className="px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">{p.bed_number || '—'}</td>
              <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap">{p.patient_name || p.full_name}</td>
              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                {p.age && p.gender ? `${p.age}${p.gender[0]?.toUpperCase()}` : p.age_sex || '—'}
              </td>
              <td className="px-3 py-2.5 text-gray-600 max-w-[160px] truncate">{p.diagnosis || p.primary_diagnosis || '—'}</td>
              <td className="px-3 py-2.5">
                <div className="flex flex-wrap gap-1">
                  {(p.cautions || p.caution_flags || []).map(f => <CautionBadge key={f} flag={f} />)}
                </div>
              </td>
              <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap text-xs">
                {p.last_vitals_at
                  ? new Date(p.last_vitals_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : p.last_recorded || '—'}
              </td>
              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{p.doctor_name || '—'}</td>
              <td className="px-3 py-2.5 text-gray-400 text-xs whitespace-nowrap font-mono">{p.mrn || p.patient_mrn || '—'}</td>
              <td className="px-3 py-2.5"><ChevronRight size={14} className="text-gray-300" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Dashboard() {
  const { session } = useWardSession()
  const navigate    = useNavigate()

  const [metrics, setMetrics]           = useState(null)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [activeCard, setActiveCard]     = useState(null)
  const [tableRows, setTableRows]       = useState([])
  const [tableLoading, setTableLoading] = useState(false)

  const wardId = session?.ward?.id

  const fetchMetrics = useCallback(async () => {
    if (!wardId) return
    try {
      const data = await api.get(`/inpatient/wards/${wardId}/dashboard-metrics`)
      setMetrics(data)
    } catch {
      try {
        const admissions = await api.get('/inpatient/admissions', { params: { ward_id: wardId, status: 'admitted' } })
        const list = Array.isArray(admissions) ? admissions : (admissions.items || [])
        const now = Date.now()
        const pendingVitals = list.filter(a => !a.last_vitals_at || (now - new Date(a.last_vitals_at).getTime()) > 4 * 3600 * 1000)
        const critical = list.filter(a => (a.cautions || a.caution_flags || []).includes('critical'))
        const today = new Date().toDateString()
        const newAdm = list.filter(a => a.admitted_at && new Date(a.admitted_at).toDateString() === today)
        setMetrics({ occupied: list.length, vitals: pendingVitals.length, critical: critical.length, admissions: newAdm.length })
      } catch {}
    } finally {
      setMetricsLoading(false)
    }
  }, [wardId])

  useEffect(() => {
    fetchMetrics()
    const h = () => fetchMetrics()
    window.addEventListener('carechart:refresh', h)
    return () => window.removeEventListener('carechart:refresh', h)
  }, [fetchMetrics])

  const loadTable = useCallback(async (card) => {
    if (!wardId) return
    setTableLoading(true)
    try {
      const admissions = await api.get('/inpatient/admissions', { params: { ward_id: wardId, status: 'admitted' } })
      const list = Array.isArray(admissions) ? admissions : (admissions.items || [])
      const now = Date.now()
      let rows = list
      if (card === 'vitals')     rows = list.filter(a => !a.last_vitals_at || (now - new Date(a.last_vitals_at).getTime()) > 4 * 3600 * 1000)
      if (card === 'critical')   rows = list.filter(a => (a.cautions || a.caution_flags || []).includes('critical'))
      if (card === 'admissions') { const today = new Date().toDateString(); rows = list.filter(a => a.admitted_at && new Date(a.admitted_at).toDateString() === today) }
      setTableRows(rows)
    } catch { setTableRows([]) }
    finally { setTableLoading(false) }
  }, [wardId])

  const handleCardClick = (card) => {
    if (activeCard === card) { setActiveCard(null); setTableRows([]) }
    else { setActiveCard(card); loadTable(card) }
  }

  const handleRowClick = (p) => {
    const id = p.admission_id || p.id
    if (id) navigate(`/chart/${id}`)
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const shift = (() => {
    const h = new Date().getHours()
    if (h >= 6  && h < 14) return 'Morning'
    if (h >= 14 && h < 22) return 'Evening'
    return 'Night'
  })()

  const CARDS = [
    { key: 'occupied',   icon: BedDouble,   label: 'Occupied Beds',   color: '#065F46' },
    { key: 'vitals',     icon: Activity,    label: 'Pending Vitals',  color: '#d97706' },
    { key: 'critical',   icon: ShieldAlert, label: 'Critical Alerts', color: '#dc2626' },
    { key: 'admissions', icon: UserPlus,    label: 'New Admissions',  color: '#7c3aed' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-extrabold text-gray-800">
          {greeting()}{session?.ward?.name ? `, ${session.ward.name}` : ''}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          <span className="mx-2">·</span>
          <span className="font-medium" style={{ color: GREEN }}>{shift} Shift</span>
        </p>
      </div>

      <div className="flex gap-4 flex-wrap">
        {CARDS.map(c => (
          <StatCard key={c.key} icon={c.icon} label={c.label} value={metrics?.[c.key]}
            color={c.color} loading={metricsLoading} active={activeCard === c.key}
            onClick={() => handleCardClick(c.key)} />
        ))}
      </div>

      {activeCard && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800">
              {COL_CFG[activeCard]?.title}
              {!tableLoading && (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  {tableRows.length} patient{tableRows.length !== 1 ? 's' : ''}
                </span>
              )}
            </h2>
            <button onClick={() => { setActiveCard(null); setTableRows([]) }} className="text-xs text-gray-400 hover:text-gray-600">
              ✕ Close
            </button>
          </div>
          <PatientTable rows={tableRows} loading={tableLoading} onRowClick={handleRowClick} />
        </div>
      )}
    </div>
  )
}
