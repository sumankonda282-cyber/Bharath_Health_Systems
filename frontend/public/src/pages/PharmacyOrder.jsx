import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { publicApi } from '../api/client'
import BrandLogo from '../components/BrandLogo'
import {
  Upload, X, CheckCircle, Search, Loader2,
  MapPin, Phone, Clock, ChevronRight, ArrowLeft,
} from 'lucide-react'

function Navbar() {
  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link to="/"><BrandLogo size="md" /></Link>
        <Link to="/clinics" className="text-gray-600 hover:text-gray-900 font-medium text-sm hidden md:block">
          Find Clinics
        </Link>
      </div>
    </nav>
  )
}

const inp = 'w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all'

export default function PharmacyOrder() {
  const fileRef = useRef(null)
  const [step, setStep]           = useState('find')   // find | form | success
  const [pharmacies, setPharmacies] = useState([])
  const [searching, setSearching] = useState(false)
  const [city, setCity]           = useState('')
  const [selected, setSelected]   = useState(null)
  const [file, setFile]           = useState(null)
  const [filePreview, setPreview] = useState(null)
  const [form, setForm]           = useState({ patient_name: '', patient_mobile: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult]       = useState(null)
  const [trackId, setTrackId]     = useState('')
  const [trackMobile, setTrackMobile] = useState('')
  const [tracking, setTracking]   = useState(null)
  const [trackErr, setTrackErr]   = useState('')
  const [mode, setMode]           = useState('order')  // order | track

  const searchPharmacies = () => {
    setSearching(true)
    publicApi.getPharmacies({ city }).then(r => {
      setPharmacies(Array.isArray(r) ? r : [])
    }).catch(() => {}).finally(() => setSearching(false))
  }

  useEffect(() => { searchPharmacies() }, [])

  const pickFile = e => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 10 * 1024 * 1024) { alert('File must be under 10MB'); return }
    setFile(f)
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target.result)
    reader.readAsDataURL(f)
    e.target.value = ''
  }

  const submit = async () => {
    if (!form.patient_name.trim()) { alert('Please enter your name'); return }
    if (!form.patient_mobile.trim() || !/^[6-9]\d{9}$/.test(form.patient_mobile)) {
      alert('Enter a valid 10-digit mobile number'); return
    }
    setSubmitting(true)
    try {
      const payload = {
        clinic_id: selected.id,
        patient_name: form.patient_name.trim(),
        patient_mobile: form.patient_mobile.trim(),
        notes: form.notes.trim(),
        prescription_image_url: filePreview,  // base64 in demo; production → upload to storage first
      }
      const res = await publicApi.createPharmacyOrder(payload)
      setResult(res)
      setStep('success')
    } catch (e) {
      alert(e.message || 'Failed to submit order')
    } finally { setSubmitting(false) }
  }

  const trackOrder = async () => {
    if (!trackId || !trackMobile) { setTrackErr('Enter order ID and mobile'); return }
    setTrackErr('')
    try {
      const r = await publicApi.trackPharmacyOrder(trackId, trackMobile)
      setTracking(r)
    } catch {
      setTrackErr('Order not found. Check your order ID and mobile number.')
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
      <Navbar />

      {/* Hero */}
      <div className="text-white py-10 px-4" style={{ background: '#0F2557' }}>
        <div className="max-w-3xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-1 text-blue-200 hover:text-white text-sm mb-3">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <h1 className="text-2xl font-extrabold">Order Medicine Online</h1>
          <p className="text-blue-200 text-sm mt-1">Upload your prescription — pick up at your clinic pharmacy.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Mode toggle */}
        <div className="flex gap-2 mb-6">
          {['order', 'track'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${mode === m ? 'text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
              style={mode === m ? { background: '#0F2557' } : {}}>
              {m === 'order' ? 'New Order' : 'Track Order'}
            </button>
          ))}
        </div>

        {/* ── TRACK ORDER ── */}
        {mode === 'track' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#0F2557' }}>Track Your Order</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
                <input className={inp} value={trackId} onChange={e => setTrackId(e.target.value)}
                  placeholder="e.g. 42" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                <input className={inp} value={trackMobile} onChange={e => setTrackMobile(e.target.value)}
                  placeholder="10-digit mobile" maxLength={10} />
              </div>
              {trackErr && <p className="text-red-600 text-sm">{trackErr}</p>}
              <button onClick={trackOrder} className="w-full py-2.5 rounded-xl font-semibold text-sm text-white"
                style={{ background: '#CC1414' }}>Track Order</button>
            </div>
            {tracking && (
              <div className="mt-5 p-4 rounded-xl border" style={{ background: '#0F255508', borderColor: '#0F255520' }}>
                <div className="text-xs text-gray-500 mb-1">Order #{tracking.order_ref}</div>
                <div className="font-semibold text-lg" style={{ color: '#0F2557' }}>
                  {tracking.status_label}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Submitted: {tracking.created_at ? new Date(tracking.created_at).toLocaleDateString('en-IN') : ''}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PLACE ORDER ── */}
        {mode === 'order' && step === 'find' && (
          <div>
            <h2 className="text-base font-bold mb-3" style={{ color: '#0F2557' }}>1. Select a Pharmacy</h2>
            <div className="flex gap-2 mb-4">
              <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-200 flex-1">
                <Search size={15} className="text-gray-400" />
                <input value={city} onChange={e => setCity(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchPharmacies()}
                  placeholder="Filter by city…" className="flex-1 text-sm outline-none" />
              </div>
              <button onClick={searchPharmacies} className="px-4 py-2 rounded-xl text-sm font-medium text-white"
                style={{ background: '#0F2557' }}>
                {searching ? <Loader2 size={15} className="animate-spin" /> : 'Search'}
              </button>
            </div>
            {pharmacies.length === 0 && !searching && (
              <p className="text-sm text-gray-400 text-center py-4">No pharmacies found.</p>
            )}
            <div className="space-y-2">
              {pharmacies.map(p => (
                <button key={p.id} onClick={() => { setSelected(p); setStep('form') }}
                  className="w-full text-left bg-white rounded-2xl p-4 border border-gray-100 hover:border-blue-300 hover:shadow-sm transition-all flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-800">{p.name}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin size={11} />{p.city}, {p.state}
                    </div>
                    {p.phone && <div className="text-xs text-gray-400 flex items-center gap-1"><Phone size={11} />{p.phone}</div>}
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'order' && step === 'form' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <button onClick={() => setStep('find')} className="flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4">
              <ArrowLeft size={14} /> Change pharmacy
            </button>
            <div className="p-3 rounded-xl mb-5 text-sm" style={{ background: '#0F255510', borderLeft: '3px solid #0F2557' }}>
              <div className="font-semibold" style={{ color: '#0F2557' }}>{selected?.name}</div>
              <div className="text-gray-500 text-xs mt-0.5">{selected?.city}, {selected?.state}</div>
            </div>
            <h2 className="text-base font-bold mb-4" style={{ color: '#0F2557' }}>2. Your Details + Prescription</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name *</label>
                <input className={inp} value={form.patient_name}
                  onChange={e => setForm(f => ({ ...f, patient_name: e.target.value }))}
                  placeholder="Full name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                <input className={inp} value={form.patient_mobile}
                  onChange={e => setForm(f => ({ ...f, patient_mobile: e.target.value }))}
                  placeholder="10-digit mobile" maxLength={10} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea className={`${inp} resize-none`} rows={2} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Mention any specific brands or requests…" />
              </div>

              {/* Prescription upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prescription Image <span className="text-gray-400 font-normal">(optional but recommended)</span>
                </label>
                {file ? (
                  <div className="flex items-center gap-3 px-4 py-3 border border-green-300 rounded-xl bg-green-50">
                    <Upload size={15} className="text-green-600 flex-shrink-0" />
                    <span className="text-sm text-green-700 font-medium truncate flex-1">{file.name}</span>
                    <button onClick={() => { setFile(null); setPreview(null) }} className="text-gray-400 hover:text-red-500">
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl py-5 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-2 transition-colors">
                    <Upload size={16} /> Upload JPG, PNG or PDF (max 10MB)
                  </button>
                )}
                <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={pickFile} />
              </div>
            </div>

            <div className="mt-5 rounded-xl p-3 text-xs text-gray-500"
              style={{ background: '#F0F4F8', border: '1px solid #E2E8F0' }}>
              <Clock size={12} className="inline mr-1" />
              Your order will be prepared. Please visit the pharmacy for pickup — bring your original prescription if available.
            </div>

            <button onClick={submit} disabled={submitting}
              className="mt-5 w-full py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50"
              style={{ background: '#CC1414' }}>
              {submitting
                ? <><Loader2 size={15} className="inline animate-spin mr-2" />Submitting…</>
                : 'Submit Prescription Order'}
            </button>
          </div>
        )}

        {mode === 'order' && step === 'success' && result && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#0F2557' }}>Order Received!</h2>
            <p className="text-gray-500 mb-4">{result.clinic_name} has received your prescription.</p>

            <div className="bg-gray-50 rounded-xl p-4 mb-5 text-left space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Order Ref</span><strong>{result.order_ref}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="badge badge-yellow">Received</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Pharmacy</span><span>{result.clinic_name}</span></div>
            </div>

            <p className="text-xs text-gray-400 mb-6">
              Save your Order Ref: <strong>{result.order_ref}</strong> to track your order status.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => { setStep('find'); setResult(null); setFile(null); setPreview(null); setForm({ patient_name:'', patient_mobile:'', notes:'' }) }}
                className="px-6 py-2.5 border-2 rounded-xl font-semibold text-sm"
                style={{ borderColor: '#0F2557', color: '#0F2557' }}>
                New Order
              </button>
              <button onClick={() => { setMode('track'); setTrackId(String(result.id)); setTrackMobile(form.patient_mobile) }}
                className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white"
                style={{ background: '#CC1414' }}>
                Track This Order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
