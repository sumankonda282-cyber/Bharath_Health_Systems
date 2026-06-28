import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/client'
import { Save, Lock, CheckCircle } from 'lucide-react'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const GENDERS = ['male', 'female', 'other']

export default function Settings() {
  const { user } = useAuth()
  const [form, setForm] = useState({
    email: '', date_of_birth: '', gender: '', blood_group: '',
    address: '', allergies: '', chronic_conditions: '',
    emergency_contact_name: '', emergency_contact_phone: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/portal/me').then(data => {
      const d = data?.data || data
      setForm({
        email: d?.email || '',
        date_of_birth: d?.date_of_birth || '',
        gender: d?.gender || '',
        blood_group: d?.blood_group || '',
        address: d?.address || '',
        allergies: d?.allergies || '',
        chronic_conditions: Array.isArray(d?.chronic_conditions) ? d.chronic_conditions.join(', ') : (d?.chronic_conditions || ''),
        emergency_contact_name: d?.emergency_contact_name || '',
        emergency_contact_phone: d?.emergency_contact_phone || '',
      })
    }).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await api.put('/portal/profile', form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e?.response?.data?.detail || e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Read-only identity */}
      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-sm uppercase tracking-wide text-gray-400">Account</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
            <div className="input bg-gray-50 text-gray-500 cursor-not-allowed">{user?.full_name || '—'}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Mobile</label>
            <div className="input bg-gray-50 text-gray-500 cursor-not-allowed">{user?.mobile || '—'}</div>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Health ID (BHID)</label>
            <div className="input bg-gray-50 font-mono font-bold cursor-not-allowed" style={{ color: '#F5821E' }}>
              {user?.bh_id?.toUpperCase() || '—'}
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400">Name and mobile can only be updated at your health center.</p>
      </div>

      {/* Editable profile */}
      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-sm uppercase tracking-wide text-gray-400">Profile</h2>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
          <input className="input w-full" type="email" value={form.email}
            onChange={e => set('email', e.target.value)} placeholder="your@email.com" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date of Birth</label>
            <input className="input w-full" type="date" value={form.date_of_birth}
              onChange={e => set('date_of_birth', e.target.value)} style={{ colorScheme: 'light' }} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Gender</label>
            <select className="input w-full" value={form.gender} onChange={e => set('gender', e.target.value)}>
              <option value="">Select</option>
              {GENDERS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Blood Group</label>
          <select className="input w-full" value={form.blood_group} onChange={e => set('blood_group', e.target.value)}>
            <option value="">Select</option>
            {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
          <textarea className="input w-full resize-none" rows={2} value={form.address}
            onChange={e => set('address', e.target.value)} placeholder="Your home address" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Allergies</label>
          <textarea className="input w-full resize-none" rows={2} value={form.allergies}
            onChange={e => set('allergies', e.target.value)} placeholder="e.g. Penicillin, Sulfa drugs (comma-separated)" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Chronic Conditions</label>
          <textarea className="input w-full resize-none" rows={2} value={form.chronic_conditions}
            onChange={e => set('chronic_conditions', e.target.value)} placeholder="e.g. Diabetes, Hypertension (comma-separated)" />
        </div>
      </div>

      {/* Emergency contact */}
      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-sm uppercase tracking-wide text-gray-400">Emergency Contact</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Contact Name</label>
            <input className="input w-full" value={form.emergency_contact_name}
              onChange={e => set('emergency_contact_name', e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Contact Phone</label>
            <input className="input w-full" type="tel" value={form.emergency_contact_phone}
              onChange={e => set('emergency_contact_phone', e.target.value)} placeholder="10-digit mobile" />
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</div>
      )}

      <button onClick={save} disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
        style={{ background: '#0F2557' }}>
        {saved
          ? <><CheckCircle size={15} /> Saved</>
          : saving
          ? 'Saving…'
          : <><Save size={15} /> Save Changes</>}
      </button>

      {/* Security note */}
      <div className="flex items-center gap-2 text-xs text-gray-400 justify-center pb-4">
        <Lock size={11} />
        Login uses OTP — no password required. Contact support to change your mobile number.
      </div>
    </div>
  )
}
