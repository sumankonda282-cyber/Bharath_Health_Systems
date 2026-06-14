import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  ClipboardList, Clock, AlertTriangle, CheckCircle2,
  ChevronRight, Activity, User, BarChart2, Loader2, BookOpen, Plus
} from 'lucide-react'
import api from '../../api/client'

const STATUS_TABS = ['All', 'Pending', 'In Progress', 'Completed', 'Overdue']

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

function AssignmentCard({ assignment, worklist }) {
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

function LibraryCard({ template, onAdd, adding }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-sm font-bold text-[#0F2557] truncate">{template.title}</h3>
            <CategoryBadge category={template.category} />
          </div>
          {template.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{template.description}</p>
          )}
        </div>
        <button
          onClick={() => onAdd(template)}
          disabled={adding === template.id}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#0F2557] text-[#0F2557] text-xs font-semibold hover:bg-[#0F2557] hover:text-white transition shrink-0"
        >
          {adding === template.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Add to Queue
        </button>
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

export default function FormTaskList() {
  const [searchParams] = useSearchParams()
  const patientId = searchParams.get('patient_id')
  const patientName = searchParams.get('patient_name')
  const [mainTab, setMainTab] = useState('queue') // 'queue' | 'library'
  const [assignments, setAssignments] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [libLoading, setLibLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('All')
  const [adding, setAdding] = useState(null)
  const [addMsg, setAddMsg] = useState('')

  const fetchAssignments = useCallback(async () => {
    try {
      setError(null)
      const url = patientId
        ? `/provider/forms/assignments?patient_id=${patientId}`
        : '/provider/forms/assignments'
      const res = await api.get(url)
      setAssignments(res.data?.assignments || res.data || [])
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }, [patientId])

  const fetchTemplates = useCallback(async () => {
    setLibLoading(true)
    try {
      const res = await api.get('/provider/forms/templates?global=true')
      setTemplates(res.data?.templates || res.data || [])
    } catch {
      // silently fail — library may not be configured yet
    } finally {
      setLibLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssignments()
    const interval = setInterval(fetchAssignments, 60000)
    return () => clearInterval(interval)
  }, [fetchAssignments])

  useEffect(() => {
    if (mainTab === 'library') fetchTemplates()
  }, [mainTab, fetchTemplates])

  const addToQueue = async (template) => {
    setAdding(template.id)
    try {
      await api.post('/provider/forms/quick-assign', { form_id: template.id })
      setAddMsg(`"${template.title}" added to your queue`)
      setTimeout(() => setAddMsg(''), 3000)
      fetchAssignments()
    } catch (e) {
      setAddMsg(e.response?.data?.detail || 'Failed to add to queue')
      setTimeout(() => setAddMsg(''), 3000)
    } finally {
      setAdding(null)
    }
  }

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
    <div className="max-w-4xl mx-auto px-4 py-6">
      {patientId && (
        <p className="text-sm text-gray-500 mb-4">
          {patientName ? `Forms for ${patientName}` : `Forms for patient #${patientId}`}
        </p>
      )}

      {/* Main tabs: My Queue / Form Library */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1">
          <button
            onClick={() => setMainTab('queue')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
              mainTab === 'queue' ? 'bg-[#0F2557] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ClipboardList size={14} />
            My Queue
            <span className={`ml-1 text-xs ${mainTab === 'queue' ? 'text-white/70' : 'text-gray-400'}`}>
              ({assignments.length})
            </span>
          </button>
          <button
            onClick={() => setMainTab('library')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
              mainTab === 'library' ? 'bg-[#0F2557] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <BookOpen size={14} />
            Form Library
          </button>
        </div>
      </div>

      {addMsg && (
        <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700">
          {addMsg}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {mainTab === 'queue' && (
        <>
          {/* Status filter tabs */}
          <div className="flex gap-1 bg-white rounded-xl border border-gray-100 p-1 mb-5 overflow-x-auto">
            {STATUS_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  activeTab === tab
                    ? 'bg-[#F5821E] text-white shadow-sm'
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
        </>
      )}

      {mainTab === 'library' && (
        <>
          <p className="text-sm text-gray-500 mb-4">Browse all available assessment forms. Add any to your worklist queue.</p>
          {libLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={32} className="animate-spin text-[#0F2557]" />
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <BookOpen size={40} className="text-gray-300" />
              <p className="text-sm text-gray-400">No form templates available in the library yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {templates.map(t => (
                <LibraryCard key={t.id} template={t} onAdd={addToQueue} adding={adding} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
