import React, { useState, useEffect } from 'react'
import {
  X, Search, ClipboardList, BarChart2, Loader2,
  CheckCircle2, AlertTriangle, ChevronDown
} from 'lucide-react'
import api from '../../api/client'

const PRIORITIES = ['routine', 'urgent', 'stat']
const ROLES = ['nurse', 'doctor', 'any']

const CATEGORY_COLORS = {
  vitals: 'bg-blue-100 text-blue-700',
  pain: 'bg-orange-100 text-orange-700',
  mental: 'bg-purple-100 text-purple-700',
  safety: 'bg-red-100 text-red-700',
  general: 'bg-gray-100 text-gray-700',
  nursing: 'bg-teal-100 text-teal-700',
  discharge: 'bg-green-100 text-green-700',
}

export default function QuickAssign({ patientId, appointmentId, admissionId, onClose, onAssigned }) {
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [priority, setPriority] = useState('routine')
  const [assignToRole, setAssignToRole] = useState('nurse')
  const [dueAt, setDueAt] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/provider/forms/pool')
        setForms(res.data?.forms || res.data || [])
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load forms')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const categories = ['all', ...Array.from(new Set(forms.map(f => f.category).filter(Boolean)))]

  const filtered = forms.filter(f => {
    const matchSearch = !search || f.title?.toLowerCase().includes(search.toLowerCase())
    const matchCat = categoryFilter === 'all' || f.category === categoryFilter
    return matchSearch && matchCat
  })

  const handleAssign = async () => {
    if (!selected) return
    setAssigning(true)
    setAssignError(null)
    try {
      await api.post('/provider/forms/assign', {
        form_id: selected.id,
        patient_id: patientId,
        appointment_id: appointmentId,
        admission_id: admissionId,
        priority,
        assigned_to_role: assignToRole,
        due_at: dueAt || undefined,
      })
      setSuccess(true)
      setTimeout(() => {
        onAssigned?.()
        onClose?.()
      }, 1200)
    } catch (err) {
      setAssignError(err.response?.data?.detail || 'Assignment failed')
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#0F2557]">Assign Assessment Form</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {success ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <CheckCircle2 size={48} className="text-green-500" />
              <p className="text-sm font-medium text-gray-700">Form assigned successfully!</p>
            </div>
          ) : selected ? (
            /* Assignment config step */
            <div>
              <button
                onClick={() => setSelected(null)}
                className="text-xs text-gray-500 hover:text-[#0F2557] flex items-center gap-1 mb-4"
              >
                ← Back to form list
              </button>

              <div className="bg-gray-50 rounded-xl p-4 mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardList size={16} className="text-[#0F2557]" />
                  <span className="text-sm font-semibold text-[#0F2557]">{selected.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[selected.category?.toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>
                    {selected.category || 'General'}
                  </span>
                  {selected.iview_enabled && (
                    <span className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      <BarChart2 size={10} /> iView
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Priority</label>
                  <div className="flex gap-2">
                    {PRIORITIES.map(p => (
                      <button
                        key={p}
                        onClick={() => setPriority(p)}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold uppercase border transition ${
                          priority === p
                            ? p === 'stat' ? 'bg-red-500 text-white border-red-500'
                              : p === 'urgent' ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-[#0F2557] text-white border-[#0F2557]'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Assign to Role</label>
                  <div className="flex gap-2">
                    {ROLES.map(r => (
                      <button
                        key={r}
                        onClick={() => setAssignToRole(r)}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize border transition ${
                          assignToRole === r ? 'bg-[#0F2557] text-white border-[#0F2557]' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Due By (optional)</label>
                  <input
                    type="datetime-local"
                    value={dueAt}
                    onChange={e => setDueAt(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0F2557]/20 focus:border-[#0F2557] outline-none"
                  />
                </div>

                {assignError && (
                  <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-xl p-3">
                    <AlertTriangle size={14} />
                    {assignError}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Form selection step */
            <div>
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search forms..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0F2557]/20 focus:border-[#0F2557] outline-none"
                />
              </div>

              {categories.length > 2 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3">
                  {categories.map(c => (
                    <button
                      key={c}
                      onClick={() => setCategoryFilter(c)}
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition ${
                        categoryFilter === c ? 'bg-[#0F2557] text-white border-[#0F2557]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {c === 'all' ? 'All' : c}
                    </button>
                  ))}
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={28} className="animate-spin text-[#0F2557]" />
                </div>
              ) : error ? (
                <div className="text-center py-8 text-sm text-red-500">{error}</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-10 text-sm text-gray-400">No forms found</div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(form => (
                    <button
                      key={form.id}
                      onClick={() => setSelected(form)}
                      className="w-full text-left bg-gray-50 hover:bg-white border border-gray-100 hover:border-[#0F2557]/30 rounded-xl p-4 transition group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#0F2557] truncate group-hover:text-[#0F2557]">{form.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[form.category?.toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>
                              {form.category || 'General'}
                            </span>
                            {form.iview_enabled && (
                              <span className="flex items-center gap-0.5 text-xs text-indigo-500">
                                <BarChart2 size={10} /> iView
                              </span>
                            )}
                            {form.estimated_minutes && (
                              <span className="text-xs text-gray-400">~{form.estimated_minutes} min</span>
                            )}
                          </div>
                        </div>
                        <ChevronDown size={16} className="text-gray-300 group-hover:text-[#0F2557] -rotate-90 transition shrink-0 mt-1" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {selected && !success && (
          <div className="px-5 py-4 border-t border-gray-100">
            <button
              onClick={handleAssign}
              disabled={assigning}
              className="w-full py-3 rounded-xl bg-[#F5821E] text-white text-sm font-bold hover:bg-orange-600 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {assigning ? <><Loader2 size={16} className="animate-spin" /> Assigning...</> : 'Assign Form'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
