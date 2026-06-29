import { useState, useEffect, useRef } from 'react'
import { X, User, Briefcase, Lock, Loader2, CheckCircle2, CreditCard, Camera, Trash2, LogOut } from 'lucide-react'
import SubscriptionBilling from './SubscriptionBilling'

/**
 * Unified staff profile panel — shared across the clinic portals (staff, carechart,
 * pharmacy, lab, imaging). Inject the portal's axios `api` (it must return res.data).
 *
 * Tabs: Profile (photo + personal) · Work · Plan & Subscription (only when the user has
 * billing access) · Security. Pass `onLogout` to surface a Sign Out at the bottom.
 */

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function formatRole(r) {
  if (!r) return 'Staff'
  return r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// Center-crop a picked file to a square and downscale — keeps the upload tiny.
function fileToSquareDataURL(file, size = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.onload = e => {
      const img = new Image()
      img.onerror = () => reject(new Error('Unsupported image'))
      img.onload = () => {
        const side = Math.min(img.width, img.height)
        const sx = (img.width - side) / 2
        const sy = (img.height - side) / 2
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = size
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

const TABS = [
  { id: 'personal', label: 'Profile',  icon: User },
  { id: 'work',     label: 'Work',     icon: Briefcase },
  { id: 'security', label: 'Security', icon: Lock },
]

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white'
const labelCls = 'block text-xs font-medium text-gray-500 mb-1'
const roInputCls = 'w-full px-3 py-2 text-sm border border-gray-100 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed'

export default function ProfilePanel({ open, onClose, api, initialTab = 'personal', onLogout }) {
  const [tab, setTab] = useState(initialTab)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarErr, setAvatarErr] = useState('')
  const fileRef = useRef(null)

  const [form, setForm] = useState({
    full_name: '', mobile: '', phone: '', gender: '',
    date_of_birth: '', address: '',
    emergency_contact_name: '', emergency_contact_mobile: '',
  })

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwErr, setPwErr] = useState('')
  const [pwOk, setPwOk] = useState(false)

  useEffect(() => {
    if (!open) return
    setTab(initialTab); setErr(''); setSaved(false); setAvatarErr('')
    setLoading(true)
    api.get('/auth/staff/me').then(d => {
      setProfile(d)
      if (initialTab === 'billing' && !d.can_manage_billing) setTab('personal')
      setForm({
        full_name: d.full_name || '',
        mobile: d.mobile || '',
        phone: d.phone || '',
        gender: d.gender || '',
        date_of_birth: d.date_of_birth || '',
        address: d.address || '',
        emergency_contact_name: d.emergency_contact_name || '',
        emergency_contact_mobile: d.emergency_contact_mobile || '',
      })
    }).catch(() => setErr('Failed to load profile')).finally(() => setLoading(false))
  }, [open, initialTab, api])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const saveProfile = async () => {
    setSaving(true); setErr(''); setSaved(false)
    try {
      await api.patch('/auth/staff/me', form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Save failed')
    }
    setSaving(false)
  }

  const onPickAvatar = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''   // allow re-picking the same file
    if (!file) return
    if (!file.type.startsWith('image/')) { setAvatarErr('Please choose an image file'); return }
    setAvatarBusy(true); setAvatarErr('')
    try {
      const image = await fileToSquareDataURL(file, 256)
      const res = await api.post('/auth/staff/me/avatar', { image })
      setProfile(p => ({ ...p, avatar_url: res.avatar_url }))
    } catch (e2) {
      setAvatarErr(e2?.response?.data?.detail || e2?.message || 'Upload failed')
    }
    setAvatarBusy(false)
  }

  const removeAvatar = async () => {
    setAvatarBusy(true); setAvatarErr('')
    try {
      await api.delete('/auth/staff/me/avatar')
      setProfile(p => ({ ...p, avatar_url: null }))
    } catch (e2) {
      setAvatarErr(e2?.response?.data?.detail || 'Could not remove photo')
    }
    setAvatarBusy(false)
  }

  const savePassword = async () => {
    if (pw.next !== pw.confirm) { setPwErr('Passwords do not match'); return }
    if (pw.next.length < 6) { setPwErr('Password must be at least 6 characters'); return }
    setPwSaving(true); setPwErr('')
    try {
      await api.post('/auth/staff/change-password', { current_password: pw.current, new_password: pw.next })
      setPwOk(true); setPw({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwOk(false), 4000)
    } catch (e) {
      setPwErr(e?.response?.data?.detail || 'Failed to update password')
    }
    setPwSaving(false)
  }

  if (!open) return null

  const canBill = !!profile?.can_manage_billing
  const avatarUrl = profile?.avatar_url

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30" onClick={onClose} />
      <div className={`fixed inset-y-0 right-0 z-50 w-full ${tab === 'billing' ? 'lg:w-[72vw]' : 'max-w-lg'} bg-white shadow-2xl flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0" style={{ background: '#0F2557' }}>
          <div className="flex items-center gap-3">
            {profile && (
              <div className="relative flex-shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white/20" />
                ) : (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold"
                    style={{ background: 'rgba(245,130,30,0.3)', color: '#F5821E' }}>
                    {getInitials(profile.full_name || profile.email)}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={avatarBusy}
                  title="Change photo"
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white text-[#0F2557] flex items-center justify-center shadow hover:bg-orange-50 disabled:opacity-60">
                  {avatarBusy ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
              </div>
            )}
            <div>
              <div className="text-white font-semibold text-sm">{profile?.full_name || '—'}</div>
              <div className="text-blue-300 text-xs">{formatRole(profile?.role)}</div>
              {avatarUrl && (
                <button onClick={removeAvatar} disabled={avatarBusy}
                  className="mt-1 inline-flex items-center gap-1 text-[11px] text-blue-200 hover:text-white disabled:opacity-50">
                  <Trash2 size={10} /> Remove photo
                </button>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10">
            <X size={18} />
          </button>
        </div>

        {avatarErr && <div className="px-6 py-2 text-xs text-rose-600 bg-rose-50 border-b border-rose-100">{avatarErr}</div>}

        {/* Tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0 bg-white">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
                  tab === t.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}>
                <Icon size={14} /> {t.label}
              </button>
            )
          })}
          {canBill && (
            <button onClick={() => setTab('billing')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
                tab === 'billing' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <CreditCard size={14} /> Plan &amp; Subscription
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* ── Profile ─────────────────────── */}
            {tab === 'personal' && (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className={labelCls}>Full Name</label>
                    <input className={inputCls} value={form.full_name} onChange={e => set('full_name', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Mobile</label>
                    <input className={inputCls} value={form.mobile} onChange={e => set('mobile', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Alternate Phone</label>
                    <input className={inputCls} value={form.phone} onChange={e => set('phone', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Date of Birth</label>
                    <input type="date" className={inputCls} value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Gender</label>
                    <select className={inputCls} value={form.gender} onChange={e => set('gender', e.target.value)}>
                      <option value="">— select —</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Email</label>
                    <input className={roInputCls} value={profile?.email || '—'} readOnly />
                    <p className="text-xs text-gray-400 mt-1">Contact admin to change email</p>
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Address</label>
                    <textarea rows={2} className={inputCls + ' resize-none'} value={form.address} onChange={e => set('address', e.target.value)} />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Emergency Contact</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Name</label>
                      <input className={inputCls} value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Mobile</label>
                      <input className={inputCls} value={form.emergency_contact_mobile} onChange={e => set('emergency_contact_mobile', e.target.value)} />
                    </div>
                  </div>
                </div>

                {err && <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{err}</p>}
                {saved && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                    <CheckCircle2 size={14} /> Profile saved successfully
                  </div>
                )}
              </div>
            )}

            {/* ── Work ─────────────────────────── */}
            {tab === 'work' && (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Role</label>
                    <input className={roInputCls} value={formatRole(profile?.role)} readOnly />
                  </div>
                  <div>
                    <label className={labelCls}>Employee ID</label>
                    <input className={roInputCls} value={profile?.employee_id || '—'} readOnly />
                  </div>
                  <div>
                    <label className={labelCls}>Designation</label>
                    <input className={roInputCls} value={profile?.designation || '—'} readOnly />
                  </div>
                  <div>
                    <label className={labelCls}>Department</label>
                    <input className={roInputCls} value={profile?.department || '—'} readOnly />
                  </div>
                  <div>
                    <label className={labelCls}>Employment Type</label>
                    <input className={roInputCls} value={profile?.employment_type || '—'} readOnly />
                  </div>
                  <div>
                    <label className={labelCls}>Date of Joining</label>
                    <input className={roInputCls} value={profile?.join_date || '—'} readOnly />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Reports To</label>
                    <input className={roInputCls} value={profile?.reporting_manager_name || '—'} readOnly />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Qualification</label>
                    <input className={roInputCls} value={profile?.qualification || '—'} readOnly />
                  </div>
                  <div>
                    <label className={labelCls}>Health Center</label>
                    <input className={roInputCls} value={profile?.clinic_name || '—'} readOnly />
                  </div>
                </div>
                <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                  Work details are managed by health center administration. Contact your manager to update these fields.
                </p>
              </div>
            )}

            {/* ── Security ─────────────────────── */}
            {tab === 'security' && (
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Current Password</label>
                    <input type="password" className={inputCls} placeholder="Enter current password"
                      value={pw.current} onChange={e => setPw(p => ({ ...p, current: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>New Password</label>
                    <input type="password" className={inputCls} placeholder="Minimum 6 characters"
                      value={pw.next} onChange={e => setPw(p => ({ ...p, next: e.target.value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>Confirm New Password</label>
                    <input type="password" className={inputCls} placeholder="Re-enter new password"
                      value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} />
                  </div>
                  {pwErr && <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{pwErr}</p>}
                  {pwOk && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                      <CheckCircle2 size={14} /> Password updated successfully
                    </div>
                  )}
                  <button
                    onClick={savePassword}
                    disabled={pwSaving || !pw.current || pw.next.length < 6}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition">
                    {pwSaving && <Loader2 size={14} className="animate-spin" />}
                    {pwSaving ? 'Updating…' : 'Update Password'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Plan & Subscription ──────────── */}
            {tab === 'billing' && canBill && <SubscriptionBilling api={api} />}
          </div>
        )}

        {/* Footer */}
        {!loading && (
          <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-white space-y-2">
            {tab === 'personal' && (
              <button onClick={saveProfile} disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            )}
            {onLogout && (
              <button onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition">
                <LogOut size={14} /> Sign Out
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
