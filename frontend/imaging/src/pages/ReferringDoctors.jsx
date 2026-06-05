import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { Users, Plus, Edit2, Loader2, AlertCircle, X, Mail, Phone } from 'lucide-react'

const EMPTY = {
  name: '', registration_number: '', specialization: '',
  hospital: '', mobile: '', email: '', address: '', notes: '',
}

function DoctorModal({ doctor, onClose, onSaved }) {
  const [form, setForm] = useState(doctor ? { ...doctor } : { ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function save() {
    if (!form.name.trim()) { setError('Doctor name required'); return }
    setSaving(true); setError('')
    try {
      if (doctor?.id) {
        await api.put(`/imaging/referring-doctors/${doctor.id}`, form)
      } else {
        await api.post('/imaging/referring-doctors', form)
      }
      onSaved()
    } catch(e) {
      setError(e.response?.data?.detail || e.message)
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-box max-w-lg w-full">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">{doctor?.id ? 'Edit Doctor' : 'Add Referring Doctor'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={18}/></button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Doctor Name *</label>
            <input className="input" value={form.name} onChange={set('name')} placeholder="Dr. Full Name"/>
          </div>
          <div>
            <label className="label">Registration Number</label>
            <input className="input" value={form.registration_number||''} onChange={set('registration_number')} placeholder="MCI/State Reg No."/>
          </div>
          <div>
            <label className="label">Specialization</label>
            <input className="input" value={form.specialization||''} onChange={set('specialization')} placeholder="Cardiologist, Oncologist..."/>
          </div>
          <div>
            <label className="label">Hospital / Clinic</label>
            <input className="input" value={form.hospital||''} onChange={set('hospital')} placeholder="Apollo, Fortis..."/>
          </div>
          <div>
            <label className="label">Mobile</label>
            <input className="input" value={form.mobile||''} onChange={set('mobile')} placeholder="+91 XXXXX XXXXX"/>
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email||''} onChange={set('email')} placeholder="doctor@hospital.com"/>
          </div>
        </div>
        <div className="mt-4">
          <label className="label">Address</label>
          <textarea className="input resize-none h-16" value={form.address||''} onChange={set('address')} placeholder="Clinic / Hospital address"/>
        </div>
        <div className="mt-4">
          <label className="label">Notes</label>
          <textarea className="input resize-none h-16" value={form.notes||''} onChange={set('notes')} placeholder="Preferred communication, special instructions..."/>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary gap-2">
            {saving ? <Loader2 size={15} className="animate-spin"/> : <Users size={15}/>}
            {saving ? 'Saving...' : doctor?.id ? 'Update' : 'Add Doctor'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ReferringDoctors() {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [search, setSearch]   = useState('')
  const [modal, setModal]     = useState(null) // null | 'new' | doctor obj

  const load = useCallback(() => {
    setLoading(true); setError('')
    api.get('/imaging/referring-doctors').then(r => {
      setDoctors(Array.isArray(r) ? r : [])
      setLoading(false)
    }).catch(e => { setError(e.message); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = doctors.filter(d =>
    !search || d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.specialization?.toLowerCase().includes(search.toLowerCase()) ||
    d.hospital?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Referring Doctors</h1>
        <div className="flex gap-3 items-center">
          <input className="input-sm" placeholder="Search doctors..." value={search} onChange={e => setSearch(e.target.value)}/>
          <button onClick={() => setModal('new')} className="btn-primary gap-2">
            <Plus size={15}/>Add Doctor
          </button>
        </div>
      </div>

      {error && <div className="p-4 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex gap-2"><AlertCircle size={15}/>{error}</div>}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={32} className="animate-spin text-gray-400"/></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users size={48} className="mx-auto mb-3 opacity-30"/>
          <p>{search ? 'No doctors match your search.' : 'No referring doctors added yet.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(d => (
            <div key={d.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0" style={{ background: '#0F2557' }}>
                    {(d.name || 'D').split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{d.name}</p>
                    {d.specialization && <p className="text-xs text-blue-700">{d.specialization}</p>}
                  </div>
                </div>
                <button onClick={() => setModal(d)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-700 shrink-0">
                  <Edit2 size={15}/>
                </button>
              </div>
              <div className="mt-3 space-y-1.5 text-xs text-gray-600">
                {d.hospital && <p className="font-medium text-gray-700">{d.hospital}</p>}
                {d.registration_number && <p className="text-gray-500">Reg: {d.registration_number}</p>}
                {d.mobile && (
                  <p className="flex items-center gap-1.5">
                    <Phone size={12} className="text-gray-400"/>
                    <a href={`tel:${d.mobile}`} className="hover:underline">{d.mobile}</a>
                  </p>
                )}
                {d.email && (
                  <p className="flex items-center gap-1.5">
                    <Mail size={12} className="text-gray-400"/>
                    <a href={`mailto:${d.email}`} className="hover:underline truncate">{d.email}</a>
                  </p>
                )}
                {d.referral_count > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between">
                    <span className="text-gray-500">Total Referrals</span>
                    <span className="font-bold" style={{ color: '#0F2557' }}>{d.referral_count}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {(modal === 'new' || (modal && modal.id)) && (
        <DoctorModal
          doctor={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
