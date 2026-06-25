import { useState, useEffect } from 'react'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import api from '../../../api/client'

// ── Constants ─────────────────────────────────────────────────────────────────

const INDIAN_STATES = [
  'Andaman & Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam',
  'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra & Nagar Haveli and Daman & Diu',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Other (Rare)']
const LANGUAGES    = ['Tamil', 'Hindi', 'English', 'Telugu', 'Kannada', 'Malayalam', 'Bengali', 'Gujarati', 'Marathi', 'Punjabi', 'Other']
const EC_RELATIONS = ['Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Other']
const GD_RELATIONS = ['Father', 'Mother', 'Sibling', 'Legal Guardian', 'Other']

const EMPTY = {
  first_name: '', last_name: '', date_of_birth: '', gender: '',
  blood_group: '', abha_id: '',
  mobile: '', whatsapp: '', email: '',
  address: '', city: '', state: '', pincode: '',
  marital_status: '', occupation: '', nationality: 'Indian',
  religion: '', preferred_language: '',
  insurance_type: '', insurance_provider: '', insurance_policy_number: '',
  govt_scheme_name: '', govt_beneficiary_id: '',
  emergency_contact_name: '', emergency_contact_relationship: '', emergency_contact_phone: '',
  guardian_name: '', guardian_relationship: '', guardian_mobile: '',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcAge(dob) {
  if (!dob) return null
  const d = new Date(dob)
  const t = new Date()
  let age = t.getFullYear() - d.getFullYear()
  if (t.getMonth() - d.getMonth() < 0 || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) age--
  return age
}

function validatePhone(val) {
  if (!val) return true
  return /^[6-9]\d{9}$/.test(val.replace(/\s/g, ''))
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHead({ title }) {
  return (
    <div className="col-span-2 pt-2 pb-1 border-b border-gray-200 mb-1">
      <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">{title}</p>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function PhoneField({ label, value, onChange, required }) {
  const bad = value && !validatePhone(value)
  return (
    <Field label={label} required={required}>
      <input
        className={`input ${bad ? 'border-red-400 focus:ring-red-300' : ''}`}
        type="tel"
        maxLength={10}
        placeholder="10-digit number"
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
      />
      {bad && (
        <p className="text-xs text-red-500 mt-0.5">
          {value.length < 10 ? 'Must be 10 digits' : 'Must start with 6, 7, 8 or 9'}
        </p>
      )}
    </Field>
  )
}

function ReadonlyField({ label, value }) {
  return (
    <Field label={label}>
      <div className="input bg-gray-50 text-gray-500 cursor-default select-all">{value || '—'}</div>
    </Field>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PatientProfileForm({ admission, onClose, onSaved }) {
  const [form, setForm]         = useState(null)
  const [patientMeta, setMeta]  = useState({ mrn: '', bh_id: '' })
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)

  const patientId = admission?.patient?.id || admission?.patient_id

  useEffect(() => {
    if (!patientId) { setLoading(false); return }
    api.get(`/patients/${patientId}`)
      .then(p => {
        setMeta({ mrn: p.clinic_patient_id || '', bh_id: p.bh_id || '' })
        setForm({
          first_name:    p.first_name || (p.full_name || '').split(' ')[0] || '',
          last_name:     p.last_name  || (p.full_name || '').split(' ').slice(1).join(' ') || '',
          date_of_birth: p.date_of_birth || '',
          gender:        p.gender || '',
          blood_group:   p.blood_group || '',
          abha_id:       p.abha_id || '',
          mobile:        p.mobile || '',
          whatsapp:      p.whatsapp || '',
          email:         p.email || '',
          address:       p.address || '',
          city:          p.city || '',
          state:         p.state || '',
          pincode:       p.pincode || '',
          marital_status:   p.marital_status || '',
          occupation:       p.occupation || '',
          nationality:      p.nationality || 'Indian',
          religion:         p.religion || '',
          preferred_language: p.preferred_language || '',
          insurance_type:          p.insurance_type || '',
          insurance_provider:      p.insurance_provider || '',
          insurance_policy_number: p.insurance_policy_number || '',
          govt_scheme_name:        p.govt_scheme_name || '',
          govt_beneficiary_id:     p.govt_beneficiary_id || '',
          emergency_contact_name:           p.emergency_contact_name || '',
          emergency_contact_relationship:   p.emergency_contact_relationship || '',
          emergency_contact_phone:          p.emergency_contact_phone || '',
          guardian_name:         p.guardian_name || '',
          guardian_relationship: p.guardian_relationship || '',
          guardian_mobile:       p.guardian_mobile || '',
        })
      })
      .catch(() => setError('Failed to load patient data'))
      .finally(() => setLoading(false))
  }, [patientId])

  const age     = calcAge(form?.date_of_birth)
  const isMinor = age !== null && age < 18
  const isInsurance = form?.insurance_type === 'Insurance'
  const isGovt      = form?.insurance_type === 'Govt Scheme (Ayushman / CGHS / ESI)'

  const set = key => val => setForm(prev => ({ ...prev, [key]: val }))
  const ev  = key => e  => set(key)(e.target.value)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')

    const phones = [
      [form.mobile,                   'Mobile number'],
      [form.whatsapp,                 'WhatsApp number'],
      [form.emergency_contact_phone,  'Emergency contact phone'],
      ...(isMinor ? [[form.guardian_mobile, 'Guardian mobile']] : []),
    ]
    for (const [val, label] of phones) {
      if (val && !validatePhone(val)) {
        setError(`${label} is invalid — must be 10 digits starting with 6–9`)
        return
      }
    }

    setSaving(true)
    try {
      await api.put(`/patients/${patientId}`, {
        ...form,
        full_name: [form.first_name, form.last_name].filter(Boolean).join(' '),
      })
      setSuccess(true)
      onSaved?.()
    } catch (err) {
      setError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex-1 flex items-center justify-center py-16">
      <Loader2 size={24} className="animate-spin text-gray-400" />
    </div>
  )

  if (error && !form) return (
    <div className="flex-1 flex items-center justify-center p-6 text-red-600 text-sm">{error}</div>
  )

  if (success) return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 gap-4">
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
        <CheckCircle size={15} /> Patient profile updated successfully.
      </div>
      <div className="shrink-0 border-t border-gray-200 pt-4 flex justify-end">
        <button onClick={onClose} className="btn-secondary">Close</button>
      </div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">

          {/* ── Identity ── */}
          <SectionHead title="Identity" />

          <Field label="First Name" required>
            <input className="input" value={form.first_name} onChange={ev('first_name')} required />
          </Field>
          <Field label="Last Name" required>
            <input className="input" value={form.last_name} onChange={ev('last_name')} required />
          </Field>

          <Field label="Date of Birth">
            <input
              className="input"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={form.date_of_birth}
              onChange={ev('date_of_birth')}
            />
            <p className="text-xs text-gray-400 mt-0.5">Format: DD / MM / YYYY</p>
          </Field>
          <Field label="Age">
            <div className="input bg-gray-50 text-gray-600 cursor-default">
              {age !== null ? `${age} years` : '—'}
            </div>
          </Field>

          <Field label="Gender">
            <select className="input" value={form.gender} onChange={ev('gender')}>
              <option value="">Select</option>
              {['Male', 'Female', 'Transgender', 'Other'].map(g => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </Field>
          <Field label="Blood Group">
            <select className="input" value={form.blood_group} onChange={ev('blood_group')}>
              <option value="">Select</option>
              {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
            </select>
          </Field>

          <Field label="ABHA ID">
            <input className="input" value={form.abha_id} onChange={ev('abha_id')} placeholder="Optional" />
          </Field>
          <ReadonlyField label="MRN" value={patientMeta.mrn} />
          <div className="col-span-2">
            <ReadonlyField label="BH ID" value={patientMeta.bh_id} />
          </div>

          {/* ── Contact ── */}
          <SectionHead title="Contact" />

          <PhoneField label="Mobile Number" required value={form.mobile} onChange={set('mobile')} />
          <PhoneField label="WhatsApp Number" value={form.whatsapp} onChange={set('whatsapp')} />

          <Field label="Email">
            <input className="input" type="email" value={form.email} onChange={ev('email')} placeholder="Optional" />
          </Field>
          <div />

          <div className="col-span-2">
            <Field label="Address">
              <textarea className="input" rows={2} value={form.address} onChange={ev('address')} />
            </Field>
          </div>

          <Field label="City">
            <input className="input" value={form.city} onChange={ev('city')} />
          </Field>
          <Field label="State">
            <select className="input" value={form.state} onChange={ev('state')}>
              <option value="">Select state</option>
              {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>

          <Field label="Pincode">
            <input
              className="input"
              maxLength={6}
              placeholder="6 digits"
              value={form.pincode}
              onChange={e => set('pincode')(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </Field>
          <div />

          {/* ── Additional ── */}
          <SectionHead title="Additional Details" />

          <Field label="Marital Status">
            <select className="input" value={form.marital_status} onChange={ev('marital_status')}>
              <option value="">Select</option>
              {['Single', 'Married', 'Widowed', 'Divorced', 'Separated'].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Occupation">
            <input className="input" value={form.occupation} onChange={ev('occupation')} />
          </Field>

          <Field label="Nationality">
            <input className="input" value={form.nationality} onChange={ev('nationality')} />
          </Field>
          <Field label="Religion">
            <input className="input" value={form.religion} onChange={ev('religion')} placeholder="Optional" />
          </Field>

          <Field label="Preferred Language">
            <select className="input" value={form.preferred_language} onChange={ev('preferred_language')}>
              <option value="">Select</option>
              {LANGUAGES.map(l => <option key={l}>{l}</option>)}
            </select>
          </Field>
          <div />

          {/* ── Insurance / Payment ── */}
          <SectionHead title="Payment & Insurance" />

          <div className="col-span-2">
            <Field label="Payment Type">
              <select className="input" value={form.insurance_type} onChange={ev('insurance_type')}>
                <option value="">Select</option>
                {['Cash', 'Insurance', 'Govt Scheme (Ayushman / CGHS / ESI)', 'Other'].map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
          </div>

          {isInsurance && <>
            <Field label="Insurance Provider">
              <input className="input" value={form.insurance_provider} onChange={ev('insurance_provider')} />
            </Field>
            <Field label="Policy Number">
              <input className="input" value={form.insurance_policy_number} onChange={ev('insurance_policy_number')} />
            </Field>
          </>}

          {isGovt && <>
            <Field label="Scheme Name">
              <input className="input" value={form.govt_scheme_name} onChange={ev('govt_scheme_name')} placeholder="Ayushman / CGHS / ESI / etc." />
            </Field>
            <Field label="Beneficiary ID">
              <input className="input" value={form.govt_beneficiary_id} onChange={ev('govt_beneficiary_id')} />
            </Field>
          </>}

          {/* ── Emergency Contact ── */}
          <SectionHead title="Emergency Contact" />

          <Field label="Name">
            <input className="input" value={form.emergency_contact_name} onChange={ev('emergency_contact_name')} />
          </Field>
          <Field label="Relationship">
            <select className="input" value={form.emergency_contact_relationship} onChange={ev('emergency_contact_relationship')}>
              <option value="">Select</option>
              {EC_RELATIONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <PhoneField label="Phone" value={form.emergency_contact_phone} onChange={set('emergency_contact_phone')} />
          <div />

          {/* ── Guardian (minor only) ── */}
          {isMinor && <>
            <SectionHead title="Guardian (Minor Patient)" />
            <Field label="Guardian Name">
              <input className="input" value={form.guardian_name} onChange={ev('guardian_name')} />
            </Field>
            <Field label="Relationship">
              <select className="input" value={form.guardian_relationship} onChange={ev('guardian_relationship')}>
                <option value="">Select</option>
                {GD_RELATIONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <PhoneField label="Guardian Mobile" value={form.guardian_mobile} onChange={set('guardian_mobile')} />
            <div />
          </>}

        </div>

        {error && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4 flex items-center justify-end gap-3">
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : 'Save Profile'}
          </button>
        </div>
      </div>
    </form>
  )
}
