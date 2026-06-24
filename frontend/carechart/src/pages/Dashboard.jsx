import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { BedDouble, Activity, ShieldAlert, UserPlus, ChevronRight, Loader2, AlertTriangle, Pill, Clock, ArrowRightFromLine } from 'lucide-react'
import { useWardSession } from '../contexts/WardSessionContext'
import api from '../api/client'
import { GREEN } from '../constants/colors'
import CautionBadge from '../components/CautionBadge'

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
  vitals:     { title: 'Pending Vitals (>2h)' },
  critical:   { title: 'Critical Alerts' },
  admissions: { title: 'New Admissions Today' },
  highAcuity: { title: 'High Acuity Patients' },
  medsDue:    { title: 'Medications Due' },
  avgLos:     { title: 'Patients by LOS' },
  awaitingDischarge: { title: 'Awaiting Discharge' },
}

const ACUITY_BADGE = {
  high:    { label: '🔴 High',    bg: '#fef2f2', color: '#b91c1c' },
  medium:  { label: '🟡 Medium',  bg: '#fffbeb', color: '#92400e' },
  low:     { label: '🟢 Low',     bg: '#f0fdf4', color: '#065f46' },
  routine: { label: '⚪ Routine', bg: '#f9fafb', color: '#6b7280' },
}

const TABLE_COLS = ['Bed', 'Patient', 'MRN', 'Age/Sex', 'Dx', 'Acuity', 'Last Vitals', 'LOS', 'Status']

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
      <table className="table">
        <thead>
          <tr>
            {TABLE_COLS.map(c => (
              <th key={c} className="th whitespace-nowrap">{c}</th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => {
            const acuity = (p.acuity_level || p.acuity || 'routine').toLowerCase()
            const acuityBadge = ACUITY_BADGE[acuity] || ACUITY_BADGE.routine
            const los = p.admitted_at
              ? Math.floor((Date.now() - new Date(p.admitted_at).getTime()) / 86400000) + 1
              : null
            return (
              <tr key={p.id || i} onClick={() => onRowClick(p)}
                className="border-b border-gray-50 hover:bg-green-50 cursor-pointer transition-colors last:border-0"
                style={p.cautions?.includes('critical') ? { background: '#fef2f2' } : undefined}
              >
                <td className="px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">{p.bed_number || '—'}</td>
                <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap">{p.patient_name || p.full_name}</td>
                <td className="px-3 py-2.5 text-gray-400 text-xs whitespace-nowrap font-mono">{p.uhid || p.mrn || p.patient_mrn || '—'}</td>
                <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                  {p.age && p.gender ? `${p.age}${p.gender[0]?.toUpperCase()}` : p.age_sex || '—'}
                </td>
                <td className="px-3 py-2.5 text-gray-600 max-w-[140px] truncate">{p.diagnosis || p.primary_diagnosis || '—'}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: acuityBadge.bg, color: acuityBadge.color }}>
                    {acuityBadge.label}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap text-xs">
                  {p.last_vitals_at
                    ? new Date(p.last_vitals_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : p.last_recorded || '—'}
                </td>
                <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap text-xs">
                  {los ? `Day ${los}` : '—'}
                </td>
                <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap text-xs capitalize">{p.status || 'admitted'}</td>
                <td className="px-3 py-2.5"><ChevronRight size={14} className="text-gray-300" /></td>
              </tr>
            )
          })}
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

  // Derived extra metrics from metrics data or admissions list
  const admissionsList = metrics?._admissions || []
  const highAcuityCount = metrics?.high_acuity ?? admissionsList.filter(a => (a.acuity_level || a.acuity || '').toLowerCase() === 'high').length
  const avgLos = metrics?.avg_los ?? (() => {
    const withAdm = admissionsList.filter(a => a.admitted_at)
    if (!withAdm.length) return 0
    const total = withAdm.reduce((s, a) => s + Math.floor((Date.now() - new Date(a.admitted_at).getTime()) / 86400000) + 1, 0)
    return Math.round(total / withAdm.length)
  })()

  const CARDS = [
    { key: 'occupied',          icon: BedDouble,          label: 'Occupied Beds',      color: '#065F46' },
    { key: 'vitals',            icon: Activity,           label: 'Pending Vitals',     color: '#d97706' },
    { key: 'critical',          icon: ShieldAlert,        label: 'Critical Alerts',    color: '#dc2626' },
    { key: 'admissions',        icon: UserPlus,           label: 'New Admissions',     color: '#7c3aed' },
    { key: 'highAcuity',        icon: AlertTriangle,      label: 'High Acuity Pts',    color: '#e11d48', value: highAcuityCount },
    { key: 'medsDue',           icon: Pill,               label: 'Medications Due',    color: '#ea580c', value: metrics?.meds_due ?? 0 },
    { key: 'avgLos',            icon: Clock,              label: 'Avg. LOS (days)',    color: '#2563eb', value: avgLos },
    { key: 'awaitingDischarge', icon: ArrowRightFromLine, label: 'Awaiting Discharge', color: '#0d9488', value: metrics?.awaiting_discharge ?? 0 },
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {CARDS.map(c => (
          <StatCard key={c.key} icon={c.icon} label={c.label}
            value={c.value !== undefined ? c.value : metrics?.[c.key]}
            color={c.color} loading={metricsLoading} active={activeCard === c.key}
            onClick={() => handleCardClick(c.key)} />
        ))}
      </div>

      {activeCard && (
        <div className="card overflow-hidden">
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
