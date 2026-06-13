import { useState, useEffect } from 'react'
import { X, Link, Copy, Check, MessageCircle, Send } from 'lucide-react'
import api from '../../api/client'

const EXPIRES_OPTIONS = [
  { label: '24h', value: 24 },
  { label: '48h', value: 48 },
  { label: '72h', value: 72 },
]

export default function SendPreVisitModal({ patientId, appointmentId, clinicId, onClose }) {
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [expiresHours, setExpiresHours] = useState(48)
  const [sending, setSending] = useState(false)
  const [link, setLink] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.get('/provider/forms/pool').then(data => {
      setForms(Array.isArray(data) ? data : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = forms.filter(f =>
    f.title?.toLowerCase().includes(search.toLowerCase())
  )

  const handleGenerate = async () => {
    if (!selected) return
    setSending(true)
    try {
      const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_URL || 'https://www.bharathhealthsystems.com'
      const res = await api.post('/provider/forms/previsit/send', {
        form_id: selected.id,
        patient_id: patientId,
        appointment_id: appointmentId,
        clinic_id: clinicId,
        expires_hours: expiresHours,
        public_base_url: PUBLIC_BASE,
      })
      setLink(res.link)
    } catch (e) {
      alert(e.message)
    } finally {
      setSending(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const CATEGORY_COLORS = {
    vitals: 'bg-blue-100 text-blue-700',
    mental: 'bg-purple-100 text-purple-700',
    pain: 'bg-orange-100 text-orange-700',
    safety: 'bg-red-100 text-red-700',
    admission: 'bg-green-100 text-green-700',
    discharge: 'bg-teal-100 text-teal-700',
    general: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-[#0F2557] text-base">Send Pre-Visit Form</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {!link ? (
            <>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search forms…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#0F2557]/20"
              />

              <div className="max-h-52 overflow-y-auto space-y-2 mb-4">
                {loading ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Loading forms…</div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">No forms available</div>
                ) : filtered.map(f => (
                  <button key={f.id} type="button" onClick={() => setSelected(f)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border-2 transition-all ${selected?.id === f.id ? 'border-[#0F2557] bg-[#0F2557]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 flex-1 truncate">{f.title}</span>
                      {f.is_iview_enabled && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">iView</span>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${CATEGORY_COLORS[f.category] || CATEGORY_COLORS.general}`}>
                      {f.category}
                    </span>
                  </button>
                ))}
              </div>

              {selected && (
                <div className="border-t border-gray-100 pt-4 mb-4">
                  <p className="text-xs text-gray-500 font-medium mb-2">Expires in</p>
                  <div className="flex gap-2">
                    {EXPIRES_OPTIONS.map(o => (
                      <button key={o.value} type="button" onClick={() => setExpiresHours(o.value)}
                        className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${expiresHours === o.value ? 'border-[#0F2557] bg-[#0F2557] text-white' : 'border-gray-200 text-gray-600'}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={handleGenerate} disabled={!selected || sending}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                style={{ background: '#F5821E' }}>
                <Link size={15} />
                {sending ? 'Generating…' : 'Generate Link'}
              </button>
            </>
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-bold text-gray-800 mb-1">Link Generated!</h3>
              <p className="text-gray-500 text-sm mb-4">Share this link with the patient via WhatsApp or SMS</p>

              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 mb-4">
                <span className="flex-1 text-xs text-gray-600 truncate font-mono">{link}</span>
                <button onClick={handleCopy} className="flex-shrink-0 text-[#0F2557] hover:text-[#F5821E] transition-colors">
                  {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>

              <div className="flex gap-2">
                <a href={`https://wa.me/?text=${encodeURIComponent('Please fill out this form before your appointment: ' + link)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white bg-green-500 hover:bg-green-600 transition-colors">
                  <MessageCircle size={15} /> WhatsApp
                </a>
                <a href={`sms:?body=${encodeURIComponent('Please fill out this form before your appointment: ' + link)}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                  <Send size={15} /> SMS
                </a>
              </div>

              <button onClick={onClose} className="mt-3 w-full py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
