import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  ClipboardList, Clock, AlertTriangle, CheckCircle2,
  ChevronRight, Activity, User, BarChart2, Loader2, Star, BookOpen,
  Search, X, Users
} from 'lucide-react'
import api from '../../api/client'

const TABS = ['All', 'Pending', 'In Progress', 'Completed', 'Overdue']

const CATEGORY_COLORS = {
  vitals: 'bg-blue-100 text-blue-700',
  pain: 'bg-orange-100 text-orange-700',
  mental: 'bg-purple-100 text-purple-700',
  safety: 'bg-red-100 text-red-700',
  general: 'bg-gray-100 text-gray-700',
  nursing: 'bg-teal-100 text-teal-700',
  discharge: 'bg-green-100 text-green-700',
}

const PRIORITY_COLORS = {
  stat: 'bg-red-100 text-red-700',
  urgent: 'bg-orange-100 text-orange-700',
  routine: 'bg-gray-100 text-gray-600',
}

const LIBRARY_CATEGORIES = ['All', 'Vitals', 'Mental Health', 'Pain', 'Nursing', 'General']

function getDueCountdown(dueAt) {
  if (!dueAt) return null
  const now = new Date()
  const due = new Date(dueAt)
  const diffMs = due - now
  const diffMins = Math.round(diffMs / 60000)
  if (diffMins < 0) {
    const over = Math.abs(diffMins)
    const h = Math.floor(over / 60), m = over % 60
    return { label: h > 0 ? `OVERDUE ${h}h ${m}m` : `OVERDUE ${m}m`, color: 'text-red-600 font-semibold' }
  }
  if (diffMins <= 30) {
    return { label: `Due in ${diffMins}m`, color: 'text-orange-500 font-medium' }
  }
  const h = Math.floor(diffMins / 60), m = diffMins % 60
  return { label: h > 0 ? `Due in ${h}h ${m > 0 ? m + 'm' : ''}` : `Due in ${m}m`, color: 'text-green-600' }
}

function CategoryBadge({ category }) {
  const cls = CATEGORY_COLORS[category?.toLowerCase()] || CATEGORY_COLORS.general
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {category || 'General'}
    </span>
  )
}

function PriorityBadge({ priority }) {
  const key = priority?.toLowerCase()
  const cls = PRIORITY_COLORS[key] || PRIORITY_COLORS.routine
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${cls}`}>
      {priority || 'Routine'}
    </span>
  )
}

function StatusBadge({ status }) {
  const map = {
    pending: 'bg-yellow-100 text-yellow-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
    draft: 'bg-gray-100 text-gray-600',
  }
  const cls = map[status?.toLowerCase()] || map.pending
  const label = (status || 'Pending').replace('_', ' ')
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {label}
    </span>
  )
}

function AssignmentCard({ assignment, worklist, onFill }) {
  const navigate = useNavigate()
  const countdown = getDueCountdown(assignment.due_at)
  const isCompleted = assignment.status === 'completed'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-sm font-bold text-[#0F2557] truncate">{assignment.form_title || assignment.form?.title}</h3>
            <CategoryBadge category={assignment.form?.category || assignment.category} />
            <PriorityBadge priority={assignment.priority} />
            {assignment.iview_enabled && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-600 border border-indigo-200">
                <BarChart2 size={10} />
                iView
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
            {worklist && assignment.patient_name && (
              <span className="flex items-center gap-1">
                <User size={12} />
                {assignment.patient_name}
                {assignment.bhid && <span className="font-mono text-gray-400">#{assignment.bhid}</span>}
              </span>
            )}
            {assignment.assigned_to_role && (
              <span className="flex items-center gap-1 capitalize">
                <Activity size={12} />
                {assignment.assigned_to_role}
              </span>
            )}
            {countdown && (
              <span className={`flex items-center gap-1 ${countdown.color}`}>
                <Clock size={12} />
                {countdown.label}
              </span>
            )}
            <StatusBadge status={assignment.status} />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isCompleted && assignment.submission_id ? (
            <button
              onClick={() => navigate(`/forms/submission/${assignment.submission_id}`)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              View
            </button>
          ) : null}
          {!isCompleted && (
            <button
              onClick={() => navigate(`/forms/fill/${assignment.form_id}${assignment.patient_id ? `?patient_id=${assignment.patient_id}` : ''}`)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F5821E] text-white text-xs font-semibold hover:bg-orange-600 transition"
            >
              Fill Form
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ tab }) {
  const messages = {
    All: { icon: <ClipboardList size={40} className="text-gray-300" />, msg: 'No form assignments found.' },
    Pending: { icon: <Clock size={40} className="text-gray-300" />, msg: 'No pending forms.' },
    'In Progress': { icon: <Activity size={40} className="text-gray-300" />, msg: 'No forms in progress.' },
    Completed: { icon: <CheckCircle2 size={40} className="text-gray-300" />, msg: 'No completed forms yet.' },
    Overdue: { icon: <AlertTriangle size={40} className="text-gray-300" />, msg: 'No overdue forms. Great job!' },
  }
  const { icon, msg } = messages[tab] || messages.All
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      {icon}
      <p className="text-sm text-gray-400">{msg}</p>
    </div>
  )
}

function FormLibrary({ patientId }) {
  const navigate = useNavigate()
  const [pool, setPool] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [favPersonal, setFavPersonal] = useState([])
  const [favOrg, setFavOrg] = useState([])

  useEffect(() => {
    api.get('/assessment-forms/', { params: { status: 'published', limit: 1000 } })
      .then(r => setPool(r?.forms || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    api.get('/assessment-forms/favorites')
      .then(r => { setFavPersonal(r?.personal || []); setFavOrg(r?.organization || []) })
      .catch(() => {})
  }, [])

  const isPersonalFav = (id) => favPersonal.includes(id)
  const isOrgFav      = (id) => favOrg.includes(id)

  // Toggle a favorite with optimistic update; revert + warn on failure.
  const toggleFav = useCallback((id, scope) => {
    const isPersonal = scope === 'personal'
    const cur    = isPersonal ? favPersonal : favOrg
    const setter = isPersonal ? setFavPersonal : setFavOrg
    const has    = cur.includes(id)
    setter(has ? cur.filter(x => x !== id) : [...cur, id])  // optimistic
    const req = has
      ? api.delete(`/assessment-forms/favorites/${id}`, { params: { scope } })
      : api.post(`/assessment-forms/favorites/${id}`, null, { params: { scope } })
    req.catch(() => {
      setter(cur)  // revert on failure
      alert(`Could not update ${scope === 'organization' ? 'organization' : 'personal'} favorite. Please try again.`)
    })
  }, [favPersonal, favOrg])

  const categoryMatch = (form) => {
    if (categoryFilter === 'All') return true
    const cat = (form.category || '').toLowerCase()
    if (categoryFilter === 'Mental Health') return cat === 'mental' || cat === 'mental health'
    return cat === categoryFilter.toLowerCase()
  }

  const searchMatch = (form) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (form.title || form.name || '').toLowerCase().includes(q)
      || (form.description || '').toLowerCase().includes(q)
      || (form.category || '').toLowerCase().includes(q)
  }

  const favIds   = Array.from(new Set([...favPersonal, ...favOrg]))  // "My Forms" = personal ∪ org
  const favForms = pool.filter(f => favIds.includes(f.id))
  const filtered = pool.filter(f => categoryMatch(f) && searchMatch(f))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-[#0F2557]" />
      </div>
    )
  }

  return (
    <div>
      {/* My Forms — quick access */}
      {favForms.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Star size={14} fill="#f59e0b" className="text-yellow-500" />
            <span className="text-sm font-bold text-[#0F2557]">My Forms</span>
            <span className="text-xs text-gray-400">({favForms.length})</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
            {favForms.map(form => (
              <div key={form.id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-1">
                  <span className="text-xs font-bold text-[#0F2557] leading-tight line-clamp-2">{form.title || form.name}</span>
                  <div className="flex-shrink-0 flex items-center gap-1">
                    {isOrgFav(form.id) && (
                      <span title="Shared with your whole clinic" className="text-blue-500"><Users size={11} /></span>
                    )}
                    <button
                      onClick={() => toggleFav(form.id, 'personal')}
                      className={isPersonalFav(form.id) ? 'text-yellow-500 hover:text-yellow-700' : 'text-gray-300 hover:text-yellow-500'}
                      title={isPersonalFav(form.id) ? 'Remove my star' : 'Add my star'}>
                      <Star size={11} fill={isPersonalFav(form.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>
                <CategoryBadge category={form.category} />
                <button
                  onClick={() => {
                    const qs = patientId ? `?patient_id=${patientId}` : ''
                    navigate(`/forms/fill/${form.id}${qs}`)
                  }}
                  className="mt-auto flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#F5821E] text-white text-xs font-semibold hover:bg-orange-600 transition"
                >
                  Fill <ChevronRight size={11} />
                </button>
              </div>
            ))}
          </div>
          <div className="border-t mb-5" style={{ borderColor: '#f0f0f0' }}>
            <span className="block mt-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">All Forms</span>
          </div>
        </div>
      )}

      {/* Search + Category filter */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search forms by name, category…"
            className="pl-8 pr-8 py-2 w-full border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:border-[#0F2557]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={11} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {LIBRARY_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                categoryFilter === cat
                  ? 'bg-[#0F2557] text-white border-[#0F2557]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#0F2557] hover:text-[#0F2557]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} forms</span>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <BookOpen size={40} className="text-gray-300" />
          <p className="text-sm text-gray-400">{search ? `No forms match "${search}"` : 'No forms found in this category.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(form => {
            return (
              <div key={form.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-[#0F2557]">{form.title || form.name}</h3>
                      <CategoryBadge category={form.category} />
                    </div>
                    {form.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{form.description}</p>
                    )}
                    {form.estimated_minutes && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Clock size={11} />
                        ~{form.estimated_minutes} min
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-auto">
                  <button
                    onClick={() => toggleFav(form.id, 'personal')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
                      isPersonalFav(form.id)
                        ? 'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-yellow-50 hover:border-yellow-300 hover:text-yellow-700'
                    }`}
                    title={isPersonalFav(form.id) ? 'Remove my star' : 'Save to my forms'}
                  >
                    <Star size={13} fill={isPersonalFav(form.id) ? 'currentColor' : 'none'} />
                    {isPersonalFav(form.id) ? 'Saved' : 'Save'}
                  </button>
                  <button
                    onClick={() => toggleFav(form.id, 'organization')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
                      isOrgFav(form.id)
                        ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
                    }`}
                    title={isOrgFav(form.id) ? 'Shared with your clinic — click to remove' : 'Share with your whole clinic'}
                  >
                    <Users size={13} />
                    {isOrgFav(form.id) ? 'Shared' : 'Org'}
                  </button>
                  <button
                    onClick={() => {
                      const qs = patientId ? `?patient_id=${patientId}` : ''
                      navigate(`/forms/fill/${form.id}${qs}`)
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F5821E] text-white text-xs font-semibold hover:bg-orange-600 transition ml-auto"
                  >
                    Fill Form
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function FormTaskList() {
  const [searchParams] = useSearchParams()
  const patientId = searchParams.get('patient_id')
  const patientName = searchParams.get('patient_name')
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('All')
  const [lastRefresh, setLastRefresh] = useState(null)
  const [mainTab, setMainTab] = useState('queue') // 'queue' | 'library'

  const fetchAssignments = useCallback(async () => {
    try {
      setError(null)
      const url = patientId
        ? `/provider/forms/assignments?patient_id=${patientId}`
        : '/provider/forms/assignments'
      const res = await api.get(url)
      setAssignments(Array.isArray(res) ? res : (res?.assignments || []))
      setLastRefresh(new Date())
    } catch (err) {
      setError(err?.message || 'Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    fetchAssignments()
    const interval = setInterval(fetchAssignments, 60000)
    return () => clearInterval(interval)
  }, [fetchAssignments])

  const filtered = assignments.filter(a => {
    if (activeTab === 'All') return true
    if (activeTab === 'Pending') return a.status === 'pending'
    if (activeTab === 'In Progress') return a.status === 'in_progress'
    if (activeTab === 'Completed') return a.status === 'completed'
    if (activeTab === 'Overdue') {
      if (a.status === 'overdue') return true
      if (a.due_at && a.status !== 'completed') return new Date(a.due_at) < new Date()
      return false
    }
    return true
  })

  return (
    <div className="w-full">
      {patientId && (
        <p className="text-sm text-gray-500 mb-4">
          {patientName ? `Forms for ${patientName}` : `Forms for patient #${patientId}`}
        </p>
      )}

        {/* Main tab switcher: My Queue / Form Library */}
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 mb-6">
          <button
            onClick={() => setMainTab('queue')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
              mainTab === 'queue'
                ? 'bg-[#0F2557] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ClipboardList size={14} />
            My Queue
          </button>
          <button
            onClick={() => setMainTab('library')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
              mainTab === 'library'
                ? 'bg-[#0F2557] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <BookOpen size={14} />
            Form Library
          </button>
        </div>

        {mainTab === 'library' ? (
          <FormLibrary patientId={patientId} />
        ) : (
          <>
            {/* Status Tabs */}
            <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 mb-6 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                    activeTab === tab
                      ? 'bg-[#0F2557] text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab}
                  {tab !== 'All' && (
                    <span className={`ml-1.5 text-xs ${activeTab === tab ? 'text-white/70' : 'text-gray-400'}`}>
                      ({assignments.filter(a => {
                        if (tab === 'Pending') return a.status === 'pending'
                        if (tab === 'In Progress') return a.status === 'in_progress'
                        if (tab === 'Completed') return a.status === 'completed'
                        if (tab === 'Overdue') return a.status === 'overdue' || (a.due_at && a.status !== 'completed' && new Date(a.due_at) < new Date())
                        return false
                      }).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            {error && (
              <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-[#0F2557]" />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState tab={activeTab} />
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {filtered.map(a => (
                  <AssignmentCard
                    key={a.id}
                    assignment={a}
                    worklist={!patientId}
                  />
                ))}
              </div>
            )}

            {lastRefresh && (
              <p className="text-center text-xs text-gray-400 mt-6">
                Last updated {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </>
        )}
    </div>
  )
}
