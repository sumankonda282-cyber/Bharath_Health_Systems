import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { BedDouble, Loader2, Clock, Wrench, History, X, AlertCircle, RefreshCw } from 'lucide-react'

const STATUS_CHIPS = [
  { key: '', label: 'All', color: '#0F2557' },
  { key: 'vacant', label: 'Vacant', color: '#16a34a' },
  { key: 'occupied', label: 'Occupied', color: '#dc2626' },
  { key: 'maintenance', label: 'Maintenance', color: '#6b7280' },
]

function BedChip({ bed, onClick }) {
  const isVacant = bed.status === 'vacant'
  const isMaint = bed.status === 'maintenance'
  const isOccupied = bed.status === 'occupied'
  return (
    <button onClick={() => onClick(bed)}
      className={`text-left rounded-xl px-3 py-2.5 min-w-[120px] max-w-[160px] transition-shadow hover:shadow-md
        ${isVacant ? 'bg-green-50 border border-green-200' : ''}
        ${isOccupied ? 'bg-red-50 border border-red-200' : ''}
        ${isMaint ? 'bg-gray-100 border border-gray-200' : ''}`}>
      <div className={`text-xs font-bold ${isVacant ? 'text-green-700' : isOccupied ? 'text-red-700' : 'text-gray-500'}`}>
        {bed.bed_number}
      </div>
      {isOccupied && (
        <>
          <div className="text-xs font-medium text-gray-700 truncate mt-0.5">{bed.patient_name || '—'}</div>
          <div className="text-xs text-gray-400 truncate">{bed.admission_number || ''}</div>
        </>
      )}
      {isVacant && <div className="text-xs text-green-600 mt-0.5">Vacant</div>}
      {isMaint && <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Wrench size={10} />Maintenance</div>}
    </button>
  )
}

function BedStatusModal({ bed, onClose, onSaved }) {
  const occupied = bed.status === 'occupied'
  const [status, setStatus] = useState(bed.status === 'maintenance' ? 'vacant' : 'maintenance')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const save = async () => {
    setSaving(true); setErr('')
    try {
      await api.post(`/inpatient/beds/${bed.id}/status`, { status, reason })
      onSaved()
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Could not update the bed')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-[400px] max-w-[94vw] p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-bold text-gray-900">Bed {bed.bed_number}</div>
            <div className="text-xs text-gray-500">{bed.ward_name}{bed.floor ? ` · Floor ${bed.floor}` : ''}</div>
          </div>
          <button onClick={onClose} className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"><X size={12} /></button>
        </div>

        {occupied ? (
          <div className="text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            This bed has an active admission ({bed.patient_name}). Discharge or transfer the patient before changing its status.
          </div>
        ) : (
          <>
            <div>
              <label className="label">Set status</label>
              <select className="input" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="vacant">Vacant — available</option>
                <option value="maintenance">Under Maintenance — out of service</option>
              </select>
            </div>
            <div>
              <label className="label">Reason / note</label>
              <textarea className="input" rows={3} value={reason} onChange={e => setReason(e.target.value)}
                placeholder={status === 'maintenance' ? 'e.g. broken bed rail, awaiting repair' : 'e.g. repair completed, back in service'} />
            </div>
            {err && <p className="text-xs text-red-600">{err}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary text-sm">
                {saving ? 'Saving…' : 'Update bed'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function BedLogsModal({ onClose }) {
  const [logs, setLogs] = useState(null)
  useEffect(() => {
    api.get('/inpatient/beds/status-logs', { params: { limit: 100 } })
      .then(d => setLogs(Array.isArray(d) ? d : []))
      .catch(() => setLogs([]))
  }, [])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-[640px] max-w-[96vw] max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 sticky top-0 bg-white">
          <div className="text-sm font-bold text-gray-800 flex items-center gap-2"><History size={15} />Bed status history</div>
          <button onClick={onClose} className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"><X size={12} /></button>
        </div>
        {logs === null ? (
          <div className="p-10 flex justify-center"><Loader2 size={22} className="animate-spin text-gray-300" /></div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No bed status changes recorded yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wider text-left border-b border-gray-100">
                <th className="px-4 py-2">When</th><th className="px-4 py-2">Bed / Ward</th>
                <th className="px-4 py-2">Change</th><th className="px-4 py-2">Reason</th><th className="px-4 py-2">By</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} className="border-b border-gray-50">
                  <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
                  <td className="px-4 py-2 text-xs"><span className="font-medium text-gray-700">{l.bed_number || `#${l.bed_id}`}</span><span className="text-gray-400"> · {l.ward_name || '—'}</span></td>
                  <td className="px-4 py-2 text-xs"><span className="text-gray-400">{l.old_status || '—'}</span> → <span className="font-medium text-gray-700">{l.new_status}</span></td>
                  <td className="px-4 py-2 text-xs text-gray-600">{l.reason || '—'}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{l.changed_by_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default function BedBoard() {
  const { user } = useAuth()
  const [board, setBoard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefreshed, setLastRefreshed] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [wardFilter, setWardFilter] = useState('')
  const [floorFilter, setFloorFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [statusTarget, setStatusTarget] = useState(null)
  const [showLogs, setShowLogs] = useState(false)

  const load = useCallback(() => {
    setLoading(true); setError('')
    api.get('/inpatient/bed-board')
      .then(r => {
        setBoard(Array.isArray(r) ? r : [])
        setLastRefreshed(new Date())
      })
      .catch(e => setError(e?.response?.data?.detail || e.message || 'Failed to load the bed board'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [load])

  if (user?.org_type !== 'hospital') {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <BedDouble size={40} className="mx-auto mb-3 opacity-30" />
          <p>IPD features are only available for hospital accounts.</p>
        </div>
      </div>
    )
  }

  // Flatten the nested department → ward → bed response into one enriched bed list.
  const beds = []
  board.forEach(dept => (dept.wards || []).forEach(ward => (ward.beds || []).forEach(bed => beds.push(bed))))

  // Filter option lists, derived from the data.
  const departments = board.map(d => ({ id: d.id, name: d.name })).filter(d => d.id)
  const wardOpts = Object.values(beds.reduce((m, b) => { if (b.ward_id) m[b.ward_id] = { id: b.ward_id, name: b.ward_name }; return m }, {}))
  const floorOpts = [...new Set(beds.map(b => b.floor).filter(Boolean))]

  // Apply ward/floor/department scope; status counts reflect that scope; then apply status.
  const scoped = beds.filter(b =>
    (!wardFilter || String(b.ward_id) === String(wardFilter)) &&
    (!floorFilter || String(b.floor) === String(floorFilter)) &&
    (!deptFilter || String(b.department_id) === String(deptFilter))
  )
  const counts = {
    '': scoped.length,
    vacant: scoped.filter(b => b.status === 'vacant').length,
    occupied: scoped.filter(b => b.status === 'occupied').length,
    maintenance: scoped.filter(b => b.status === 'maintenance').length,
  }
  const filteredBeds = scoped.filter(b => !statusFilter || b.status === statusFilter)

  // Group the filtered beds by ward for display.
  const wardMap = {}
  filteredBeds.forEach(bed => {
    const key = bed.ward_id || 'unknown'
    if (!wardMap[key]) wardMap[key] = { id: key, name: bed.ward_name || 'Unassigned', floor: bed.floor || '', department_name: bed.department_name, beds: [] }
    wardMap[key].beds.push(bed)
  })
  const wards = Object.values(wardMap)

  return (
    <div>
      {/* Toolbar — no duplicate title (the page title is in the top bar) and no manual refresh */}
      <div className="card p-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_CHIPS.map(c => {
            const active = statusFilter === c.key
            return (
              <button key={c.key} onClick={() => setStatusFilter(c.key)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5"
                style={{
                  color: active ? '#fff' : c.color,
                  background: active ? c.color : '#fff',
                  borderColor: active ? c.color : '#e5e7eb',
                }}>
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: active ? '#fff' : c.color }} />
                {c.label}<span className="opacity-80">({counts[c.key] ?? 0})</span>
              </button>
            )
          })}

          <div className="w-px h-5 bg-gray-200 mx-1 hidden sm:block" />

          <select className="input w-auto text-sm py-1.5" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="input w-auto text-sm py-1.5" value={wardFilter} onChange={e => setWardFilter(e.target.value)}>
            <option value="">All Wards</option>
            {wardOpts.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select className="input w-auto text-sm py-1.5" value={floorFilter} onChange={e => setFloorFilter(e.target.value)}>
            <option value="">All Floors</option>
            {floorOpts.map(f => <option key={f} value={f}>Floor {f}</option>)}
          </select>

          <button onClick={() => setShowLogs(true)} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 ml-auto">
            <History size={13} />History
          </button>
        </div>
        {lastRefreshed && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2">
            <Clock size={11} />Last updated {lastRefreshed.toLocaleTimeString()} · auto-refreshes every 30s
            {loading && <RefreshCw size={11} className="animate-spin ml-1" />}
          </div>
        )}
      </div>

      {error ? (
        <div className="card p-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm" style={{ color: '#CC1414' }}><AlertCircle size={16} />{error}</div>
          <button onClick={load} className="btn-secondary text-xs py-1 px-3 flex items-center gap-1"><RefreshCw size={12} />Retry</button>
        </div>
      ) : loading && beds.length === 0 ? (
        <div className="flex items-center justify-center py-32"><Loader2 size={32} className="animate-spin text-gray-400" /></div>
      ) : wards.length === 0 ? (
        <div className="text-center py-32 text-gray-400">
          <BedDouble size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">{beds.length === 0 ? 'No wards configured' : 'No beds match these filters'}</p>
          <p className="text-sm mt-1">{beds.length === 0 ? 'Configure wards and beds in Hospital Settings' : 'Try clearing the status / ward / floor filters'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {wards.map(ward => (
            <div key={ward.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2" style={{ background: '#F8FAFF' }}>
                <div className="flex items-center gap-2">
                  <BedDouble size={16} style={{ color: '#0F2557' }} />
                  <span className="font-bold text-sm" style={{ color: '#0F2557' }}>{ward.name}</span>
                  {ward.floor && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">Floor {ward.floor}</span>}
                  {ward.department_name && <span className="text-xs text-gray-400">{ward.department_name}</span>}
                </div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />{ward.beds.filter(b => b.status === 'vacant').length} vacant</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />{ward.beds.filter(b => b.status === 'occupied').length} occupied</span>
                  <span className="font-medium text-gray-700">{ward.beds.length} beds</span>
                </div>
              </div>
              <div className="p-5 flex flex-wrap gap-3">
                {ward.beds.map(bed => <BedChip key={bed.id} bed={bed} onClick={setStatusTarget} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {statusTarget && <BedStatusModal bed={statusTarget} onClose={() => setStatusTarget(null)} onSaved={() => { setStatusTarget(null); load() }} />}
      {showLogs && <BedLogsModal onClose={() => setShowLogs(false)} />}
    </div>
  )
}
