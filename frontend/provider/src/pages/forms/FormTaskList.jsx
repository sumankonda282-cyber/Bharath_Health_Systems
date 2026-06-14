import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  ClipboardList, Clock, AlertTriangle, CheckCircle2,
  ChevronRight, Activity, User, BarChart2, Loader2, Star, BookOpen
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
              onClick={() => navigate(`/forms/fill/${assignment.id}`)}
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
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [favIds, setFavIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('favorited_forms') || '[]') } catch { return [] }
  })

  useEffect(() => {
    // Use form_templates endpoint which has the 12 forms created by clinic admin
    api.get('/forms/templates', { params: { limit: 100 } })
      .then(r => setPool(Array.isArray(r) ? r : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggleFav = (id) => {
    setFavIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      localStorage.setItem('favorited_forms', JSON.stringify(next))
      return next
    })
  }

  const categoryMatch = (form) => {
    if (categoryFilter === 'All') return true
    const cat = (form.category || '').toLowerCase()
    if (categoryFilter === 'Mental Health') return cat === 'mental' || cat === 'mental health'
    return cat === categoryFilter.toLowerCase()
  }

  const filtered = pool
    .filter(categoryMatch)
    .sort((a, b) => {
      const aFav = favIds.includes(a.id) ? 0 : 1
      const bFav = favIds.includes(b.id) ? 0 : 1
      return aFav - bFav
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-[#0F2557]" />
      </div>
    )
  }

  return (
    <div>
      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {LIBRARY_CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
              categoryFilter === cat
                ? 'bg-[#0F2557] text-white border-[#0F2557]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#0F2557] hover:text-[#0F2557]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <BookOpen size={40} className="text-gray-300" />
          <p className="text-sm text-gray-400">No forms found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(form => {
            const isFav = favIds.includes(form.id)
            return (
              <div key={form.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-[#0F2557]">{form.name || form.title}</h3>
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
                    onClick={() => toggleFav(form.id)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition ${
                      isFav
                        ? 'bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-yellow-50 hover:border-yellow-300 hover:text-yellow-700'
                    }`}
                    title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Star size={13} fill={isFav ? 'currentColor' : 'none'} />
                    {isFav ? 'Favorited' : 'Favorite'}
                  </button>
                  <button
                    onClick={() => {
                      const qs = patientId ? `?patient_id=${patientId}` : ''
                      navigate(`/forms/fill/${form.id}${qs}`)
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F5821E] text-white text-xs font-semibold hover:bg-orange-600 transition ml-auto"
                  >
                    Assign to Patient
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
      setAssignments(res.data?.assignments || res.data || [])
      setLastRefresh(new Date())
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load assignments')
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
    <div className="max-w-4xl mx-auto">
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
              <div className="flex flex-col gap-3">
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
