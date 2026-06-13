import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../../api/client'
import { Activity, AlertCircle, RefreshCw, ChevronRight, Clock } from 'lucide-react'

function timeAgo(iso) {
  if (!iso) return 'Never charted'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function IViewSelector() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const patientId = searchParams.get('patient_id')
  const admissionId = searchParams.get('admission_id')

  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchForms = async () => {
      setLoading(true); setError(null)
      try {
        const res = await api.get('/provider/forms/pool')
        const all = Array.isArray(res) ? res : (res?.items || res?.data || [])
        setForms(all.filter(f => f.is_iview_enabled === true))
      } catch (ex) {
        const detail = ex?.response?.data?.detail
        setError(typeof detail === 'string' ? detail : ex.message || 'Failed to load forms')
      } finally { setLoading(false) }
    }
    fetchForms()
  }, [])

  const openFlowsheet = (formId) => {
    const params = new URLSearchParams()
    if (patientId) params.set('patient_id', patientId)
    if (admissionId) params.set('admission_id', admissionId)
    navigate(`/forms/iview/${formId}?${params.toString()}`)
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Activity size={22} style={{ color: '#0F2557' }} />
          <h1 className="text-xl font-bold" style={{ color: '#0F2557' }}>iView Flowsheets</h1>
        </div>
        <p className="text-sm text-gray-500">Select a clinical form to view or chart time-series data</p>
        {patientId && (
          <div className="mt-2 text-xs text-gray-400">Patient ID: {patientId}{admissionId ? ` | Admission: ${admissionId}` : ''}</div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={15} className="shrink-0" />{error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
          <RefreshCw size={20} className="animate-spin opacity-60" />
          <span className="text-sm">Loading forms…</span>
        </div>
      )}

      {!loading && !error && forms.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <Activity size={44} className="mx-auto mb-4 opacity-25" />
          <p className="font-semibold text-gray-500 text-base">No forms available</p>
          <p className="text-sm mt-1">Ask your administrator to create form templates.</p>
        </div>
      )}

      {!loading && forms.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map(form => (
            <div
              key={form.id}
              className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold text-gray-800 leading-tight">{form.name || `Form ${form.id}`}</h2>
                  {form.category && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 whitespace-nowrap flex-shrink-0">
                      {form.category}
                    </span>
                  )}
                </div>
                {form.description && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{form.description}</p>
                )}
                {form.estimated_minutes && (
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                    <Clock size={11} />~{form.estimated_minutes} min
                  </div>
                )}
              </div>

              <button
                onClick={() => openFlowsheet(form.id)}
                className="mt-auto inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                style={{ background: '#0F2557' }}
              >
                Open Flowsheet
                <ChevronRight size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
