import { useEffect, useState } from 'react'
import { Users, MapPin, Activity, Building2, Stethoscope, BarChart3, Loader2, AlertCircle, TrendingUp } from 'lucide-react'
import { adminApi } from '../api'

const ACCENT = '#F5821E'

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN')
}

function Label({ children }) {
  return <div className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">{children}</div>
}

function CardTitle({ icon: Icon, title, note }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon size={15} style={{ color: ACCENT }} />
        <span className="text-sm font-bold text-white">{title}</span>
      </div>
      {note && <span className="text-[11px] text-gray-500">{note}</span>}
    </div>
  )
}

// Vertical bar chart (age buckets / blood groups)
function VBarChart({ data, height = 130 }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d) => {
        const h = Math.round((d.value / max) * (height - 26))
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
            <span className="text-[10px] text-gray-400 mb-0.5">{d.value}</span>
            <div
              className="w-full rounded-t"
              style={{ height: Math.max(2, h), background: ACCENT, opacity: 0.85 }}
              title={`${d.label}: ${d.value}`}
            />
            <span className="text-[9px] text-gray-500 mt-1 truncate w-full text-center">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// Horizontal bar list
function HBarList({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400 w-10 shrink-0">{d.label}</span>
          <div className="flex-1 h-3 rounded bg-gray-800 overflow-hidden">
            <div className="h-full rounded" style={{ width: `${(d.value / max) * 100}%`, background: ACCENT, opacity: 0.85 }} />
          </div>
          <span className="text-[11px] text-gray-300 w-10 text-right shrink-0">{fmt(d.value)}</span>
        </div>
      ))}
    </div>
  )
}

// Donut chart
function Donut({ segments, size = 110, stroke = 18 }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f2937" strokeWidth={stroke} />
        {segments.map((s) => {
          const len = (s.value / total) * c
          const el = (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            />
          )
          offset += len
          return el
        })}
      </g>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-white" style={{ fontSize: 16, fontWeight: 700 }}>
        {fmt(total)}
      </text>
    </svg>
  )
}

const AGE_KEYS = ['0-10', '11-20', '21-30', '31-40', '41-50', '51-60', '61-70', '71-80', '81+']
const GENDER_COLORS = { Male: ACCENT, Female: '#3b82f6', Other: '#94a3b8' }

export default function PopulationDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(false)
        const res = await adminApi.getPopulation()
        if (alive) setData(res)
      } catch {
        if (alive) setError(true)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={36} className="animate-spin" style={{ color: ACCENT }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card-sm border border-red-900/50 bg-red-950/20 flex items-center gap-3 text-red-300">
        <AlertCircle size={18} />
        <span className="text-sm font-medium">Failed to load population analytics.</span>
      </div>
    )
  }

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center text-gray-500">
        <Users size={32} className="mb-3 text-gray-600" />
        <p className="text-sm">No population data available.</p>
      </div>
    )
  }

  const genderSplit = data.gender_split || []
  const bloodGroups = data.blood_groups || []
  const ageDist = data.age_distribution || {}
  const topStates = data.top_states || []
  const diseaseBurden = data.disease_burden || []
  const hcPerformance = data.hc_performance || []
  const adoption = data.portal_adoption || {}

  const ageData = AGE_KEYS.map((k) => ({ label: k, value: ageDist[k] || 0 }))
  const bloodData = bloodGroups.map((b) => ({ label: b.group, value: b.count }))

  const genderTotal = genderSplit.reduce((s, g) => s + (g.count || 0), 0) || 1
  const genderSegments = genderSplit.map((g) => ({
    label: g.gender,
    value: g.count,
    color: GENDER_COLORS[g.gender] || '#64748b',
  }))

  const maxDisease = Math.max(1, ...diseaseBurden.map((d) => d.count))

  return (
    <div className="space-y-3">
      {/* Row 1 — Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="card-sm">
          <CardTitle icon={BarChart3} title="Age Distribution" note="years" />
          <VBarChart data={ageData} />
        </div>

        <div className="card-sm">
          <CardTitle icon={Users} title="Gender Split" />
          <div className="flex items-center gap-4">
            <Donut segments={genderSegments} />
            <div className="flex-1 space-y-2">
              {genderSegments.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
                  <span className="text-[12px] text-gray-300 flex-1">{s.label}</span>
                  <span className="text-[12px] text-white font-medium">{fmt(s.value)}</span>
                  <span className="text-[11px] text-gray-500 w-10 text-right">
                    {Math.round((s.value / genderTotal) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card-sm">
          <CardTitle icon={Activity} title="Blood Group" />
          {bloodData.length ? (
            <VBarChart data={bloodData} />
          ) : (
            <div className="text-[12px] text-gray-500 py-8 text-center">No blood group data</div>
          )}
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card-sm">
          <CardTitle icon={MapPin} title="Top 10 States" />
          <table className="w-full">
            <thead>
              <tr>
                <th className="th-sm text-left">State</th>
                <th className="th-sm text-right">Count</th>
                <th className="th-sm text-left w-1/3">%</th>
              </tr>
            </thead>
            <tbody>
              {topStates.length ? (
                topStates.map((s) => (
                  <tr key={s.state}>
                    <td className="td-sm">{s.state}</td>
                    <td className="td-sm text-right">{fmt(s.count)}</td>
                    <td className="td-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded bg-gray-800 overflow-hidden">
                          <div className="h-full rounded" style={{ width: `${s.pct}%`, background: ACCENT }} />
                        </div>
                        <span className="text-[10px] text-gray-400 w-8 text-right">{Math.round(s.pct)}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="td-sm text-gray-500" colSpan={3}>No state data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card-sm">
          <CardTitle icon={Activity} title="Top Diagnoses" note="by patient count" />
          <table className="w-full">
            <thead>
              <tr>
                <th className="th-sm text-left w-10">Rank</th>
                <th className="th-sm text-left">Diagnosis</th>
                <th className="th-sm text-right">Patients</th>
                <th className="th-sm text-left w-1/4"></th>
              </tr>
            </thead>
            <tbody>
              {diseaseBurden.length ? (
                diseaseBurden.map((d, i) => (
                  <tr key={`${d.tag_name}-${i}`}>
                    <td className="td-sm text-gray-500">{i + 1}</td>
                    <td className="td-sm">{d.tag_name}</td>
                    <td className="td-sm text-right">{fmt(d.count)}</td>
                    <td className="td-sm">
                      <div className="h-1.5 rounded bg-gray-800 overflow-hidden">
                        <div className="h-full rounded" style={{ width: `${(d.count / maxDisease) * 100}%`, background: ACCENT }} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="td-sm text-gray-500" colSpan={4}>No diagnosis data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card-sm">
          <CardTitle icon={TrendingUp} title="Appointments Trend" />
          <div className="flex flex-col items-center justify-center py-12 text-gray-600">
            <BarChart3 size={28} className="mb-2" />
            <span className="text-[12px] text-gray-500">Trend data unavailable</span>
          </div>
        </div>

        <div className="card-sm">
          <CardTitle icon={Building2} title="Top Health Centers by Patients" />
          <table className="w-full">
            <thead>
              <tr>
                <th className="th-sm text-left w-10">Rank</th>
                <th className="th-sm text-left">Name</th>
                <th className="th-sm text-left">City</th>
                <th className="th-sm text-right">Patients</th>
                <th className="th-sm text-right">Doctors</th>
              </tr>
            </thead>
            <tbody>
              {hcPerformance.length ? (
                hcPerformance.map((c, i) => (
                  <tr key={c.clinic_id ?? i}>
                    <td className="td-sm text-gray-500">{i + 1}</td>
                    <td className="td-sm text-white">{c.name}</td>
                    <td className="td-sm">{c.city || '—'}</td>
                    <td className="td-sm text-right">{fmt(c.patient_count)}</td>
                    <td className="td-sm text-right">
                      <span className="inline-flex items-center gap-1">
                        <Stethoscope size={11} className="text-gray-500" />
                        {fmt(c.doctor_count)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="td-sm text-gray-500" colSpan={5}>No Health Center data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 4 — Portal Adoption */}
      <div className="card-sm">
        <CardTitle icon={Users} title="Portal Adoption" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="kpi-card">
            <Label>Total Patients</Label>
            <div className="text-xl font-bold text-white mt-1">{fmt(adoption.total)}</div>
          </div>
          <div className="kpi-card">
            <Label>Portal Users</Label>
            <div className="text-xl font-bold text-white mt-1">{fmt(adoption.portal_users)}</div>
          </div>
          <div className="kpi-card">
            <Label>Portal %</Label>
            <div className="text-xl font-bold mt-1" style={{ color: ACCENT }}>
              {adoption.pct != null ? `${Math.round(adoption.pct)}%` : '—'}
            </div>
          </div>
          <div className="kpi-card">
            <Label>Verified Users</Label>
            <div className="text-xl font-bold text-gray-500 mt-1">—</div>
          </div>
        </div>
      </div>
    </div>
  )
}
