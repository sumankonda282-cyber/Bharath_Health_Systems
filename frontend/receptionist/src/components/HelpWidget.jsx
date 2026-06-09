import { useState } from 'react'
import { HelpCircle, X, Wrench, Phone, ChevronRight, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../contexts/AuthContext'

const PORTAL_SOURCE = 'Reception'
const IT_PHONE = '+91 90000 00000'   // update with your support number

const CATEGORIES = [
  { value: 'facility',    label: 'Facility / Infrastructure', hint: 'Beds, AC, plumbing, electrical, elevator' },
  { value: 'equipment',   label: 'Medical Equipment',          hint: 'ECG, IV pump, monitor, defective device' },
  { value: 'it_software', label: 'IT / Computers',            hint: 'Printer, network, computer, hardware' },
  { value: 'other',       label: 'Other',                     hint: 'Anything else' },
]
const PRIORITIES = [
  { value: 'urgent', label: '🔴 Urgent',  hint: 'Blocks patient care' },
  { value: 'high',   label: '🟠 High',    hint: 'Impacts workflow today' },
  { value: 'medium', label: '🟡 Medium',  hint: 'Resolve within 24 h' },
  { value: 'low',    label: '🟢 Low',     hint: 'Cosmetic / minor' },
]

const EMPTY = { title: '', category: 'facility', priority: 'medium', location: '', description: '' }

export default function HelpWidget({ open, onClose }) {
  const { user } = useAuth()
  const [path, setPath]       = useState(null)   // null | 'internal' | 'it'
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState('')

  const reset = () => { setPath(null); setForm(EMPTY); setDone(false); setError('') }
  const close = () => { onClose(); setTimeout(reset, 300) }

  const submit = async e => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true); setError('')
    try {
      await api.post('/maintenance/requests', {
        ...form,
        portal_source: PORTAL_SOURCE,
      })
      setDone(true)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to submit. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
              {/* IT Contact card */}
              {path === 'it' && (
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#dbeafe' }}>
                    <Phone size={24} className="text-blue-600" />
                  </div>
                  <div className="text-sm font-semibold text-gray-800 mb-1">BharatCliniq IT Support</div>
                  <div className="text-xs text-gray-500 mb-4">Available Mon–Sat, 9 AM – 7 PM</div>
                  <a
                    href={`tel:${IT_PHONE.replace(/\s/g, '')}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
                    style={{ background: '#1d4ed8' }}
                  >
                    <Phone size={15} />{IT_PHONE}
                  </a>
                  <button onClick={reset} className="block mx-auto mt-4 text-xs text-gray-400 hover:text-gray-600">← Back</button>
                </div>
              )}

              {/* Internal request form */}
              {path === 'internal' && !done && (
                <form onSubmit={submit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Issue Title *</label>
                    <input
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Brief description of the issue"
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                      <select
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={form.category}
                        onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      >
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Priority</label>
                      <select
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={form.priority}
                        onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                      >
                        {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Location (optional)</label>
                    <input
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="e.g. Ward A, Bed 5, Lab Room 2"
                      value={form.location}
                      onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Details (optional)</label>
                    <textarea
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                      rows={3}
                      placeholder="Describe the problem in more detail..."
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>

                  <div className="text-xs text-gray-400">
                    Submitting as <span className="font-medium text-gray-600">{user?.full_name || user?.email}</span> from {PORTAL_SOURCE}
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                      <AlertTriangle size={13} />{error}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={reset} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={saving || !form.title.trim()}
                      className="flex-1 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ background: '#065F46' }}
                    >
                      {saving ? <><Loader2 size={14} className="animate-spin" />Submitting…</> : 'Submit Request'}
                    </button>
                  </div>
                </form>
              )}

              {/* Success state */}
              {path === 'internal' && done && (
                <div className="text-center py-6">
                  <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-500" />
                  <div className="font-semibold text-gray-800 mb-1">Request Submitted</div>
                  <div className="text-xs text-gray-500 mb-5">The maintenance team has been notified and will respond shortly.</div>
                  <button
                    onClick={close}
                    className="px-6 py-2 rounded-xl text-white text-sm font-semibold"
                    style={{ background: '#065F46' }}
                  >
                    Done
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  )
}
