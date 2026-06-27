import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Stethoscope, Clock, Shield, ChevronRight, Building2, MapPin, Award, Star } from 'lucide-react'
import { publicApi } from '../api/client'
import Navbar from '../components/Navbar'
import { PATIENT_URL } from '../constants/urls'
import BookingFlow from '../components/BookingFlow'

function StarRating({ rating, count }) {
  const full = Math.round(rating || 0)
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <svg key={i} className={i <= full ? 'text-yellow-400' : 'text-gray-200'} fill="currentColor" viewBox="0 0 20 20" width="16" height="16">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-sm font-semibold text-gray-700">{(rating || 0).toFixed(1)}</span>
      {count > 0 && <span className="text-xs text-gray-400">({count} review{count !== 1 ? 's' : ''})</span>}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DoctorProfilePage() {
  const { id } = useParams()
  const [doctor, setDoctor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [booking, setBooking] = useState(false)

  useEffect(() => {
    publicApi.getDoctor(id)
      .then(d => setDoctor(d))
      .catch(() => setError('Doctor not found.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
      <Navbar />
      <div className="flex justify-center py-32">
        <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: '#0F2557', borderTopColor: 'transparent' }} />
      </div>
    </div>
  )

  if (error || !doctor) return (
    <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-700 mb-2">Doctor not found</h2>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
        <Link to="/clinics" className="font-semibold text-sm px-5 py-2.5 rounded-xl text-white" style={{ background: '#CC1414' }}>Browse Doctors</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#F0F4F8' }}>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/clinics" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Find Doctors
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT: Doctor info (full profile when not booking, or condensed) */}
          <div className={booking ? 'lg:col-span-2' : 'lg:col-span-2'}>
            {!booking ? (
              /* ── Full Doctor Profile ── */
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 md:p-8">
                {/* Header */}
                <div className="flex items-start gap-5 mb-6">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-white text-3xl"
                    style={{ background: 'linear-gradient(135deg, #0F2557 0%, #1a3a7a 100%)' }}>
                    {doctor.photo_url
                      ? <img src={doctor.photo_url} alt={doctor.name} className="w-20 h-20 rounded-2xl object-cover" />
                      : (doctor.name || 'D').charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold mb-1" style={{ color: '#0F2557' }}>{/^dr\.?\s/i.test(doctor.name) ? doctor.name : `Dr. ${doctor.name}`}</h1>
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold mb-2" style={{ background: '#CC141415', color: '#CC1414' }}>{doctor.specialty}</span>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-2">
                      {doctor.qualification && <span className="font-medium text-gray-700">{doctor.qualification}</span>}
                      {doctor.experience_years > 0 && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{doctor.experience_years} yrs exp</span>}
                      {doctor.mci_verified && <span className="flex items-center gap-1 text-green-700"><Shield className="w-3.5 h-3.5" />MCI Verified</span>}
                    </div>
                    {(doctor.rating > 0 || doctor.average_rating > 0) && (
                      <StarRating rating={doctor.rating || doctor.average_rating} count={doctor.rating_count || doctor.review_count || 0} />
                    )}
                  </div>
                </div>

                {/* Bio */}
                {doctor.bio && (
                  <div className="mb-6">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-2">About</h2>
                    <p className="text-gray-600 text-sm leading-relaxed">{doctor.bio}</p>
                  </div>
                )}

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {doctor.languages && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Languages</div>
                      <div className="text-sm font-medium text-gray-700">{typeof doctor.languages === 'string' ? doctor.languages : doctor.languages.join(', ')}</div>
                    </div>
                  )}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Consultation Fee</div>
                    <div className="text-lg font-bold" style={{ color: '#0F2557' }}>₹{(doctor.fee || 0).toLocaleString('en-IN')}</div>
                  </div>
                  {doctor.telehealth_enabled && doctor.telehealth_fee && (
                    <div className="bg-orange-50 rounded-xl p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-orange-400 mb-1">Telehealth Fee</div>
                      <div className="text-lg font-bold text-orange-600">₹{doctor.telehealth_fee.toLocaleString('en-IN')}</div>
                    </div>
                  )}
                </div>

                {/* Achievements / Awards */}
                {(doctor.achievements || doctor.awards) && (
                  <div className="mb-6">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-yellow-500" />Achievements & Awards
                    </h2>
                    <div className="space-y-2">
                      {(Array.isArray(doctor.achievements) ? doctor.achievements : (doctor.achievements ? [doctor.achievements] : [])).map((ach, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                          <Star className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                          <span>{ach}</span>
                        </div>
                      ))}
                      {(Array.isArray(doctor.awards) ? doctor.awards : (doctor.awards ? [doctor.awards] : [])).map((aw, i) => (
                        <div key={`aw-${i}`} className="flex items-start gap-2.5 text-sm text-gray-600">
                          <Award className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <span>{aw}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Practices at */}
                {doctor.clinic && (
                  <div className="border-t border-gray-100 pt-5">
                    <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-3">Practices At</h2>
                    <Link to={`/clinics/${doctor.clinic.slug}`}
                      className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all group">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#0F255715' }}>
                        <Building2 className="w-5 h-5" style={{ color: '#0F2557' }} />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-sm group-hover:underline" style={{ color: '#0F2557' }}>{doctor.clinic.name}</div>
                        {doctor.clinic.address && <div className="text-xs text-gray-500 mt-0.5">{doctor.clinic.address}</div>}
                        <div className="text-xs text-gray-400 mt-0.5">{doctor.clinic.city}{doctor.clinic.state ? `, ${doctor.clinic.state}` : ''}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 mt-1 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    {(doctor.clinic.latitude || doctor.clinic.address) && (
                      <a
                        href={
                          doctor.clinic.latitude && doctor.clinic.longitude
                            ? `https://www.google.com/maps/search/?api=1&query=${doctor.clinic.latitude},${doctor.clinic.longitude}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(doctor.clinic.address + ', ' + (doctor.clinic.city || '') + ', ' + (doctor.clinic.state || ''))}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <MapPin className="w-4 h-4" />
                        Get Directions
                      </a>
                    )}
                  </div>
                )}

                <button onClick={() => setBooking(true)}
                  className="mt-6 w-full py-3.5 rounded-xl font-bold text-white text-sm transition-opacity hover:opacity-90"
                  style={{ background: '#CC1414' }}>
                  Book Appointment
                </button>
              </div>
            ) : (
              /* ── Booking Flow ── */
              <BookingFlow
                doctor={doctor}
                context="public"
                apiClient={publicApi}
                patientPortalUrl={PATIENT_URL}
                onBooked={() => {}}
                onClose={() => setBooking(false)}
              />
            )}
          </div>

          {/* RIGHT: action card (only on profile view, BookingFlow is self-contained) */}
          {!booking && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 sticky top-20">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Consultation Fee</div>
                <div className="text-2xl font-bold mb-4" style={{ color: '#0F2557' }}>₹{(doctor.fee || 0).toLocaleString('en-IN')}</div>
                {doctor.telehealth_enabled && doctor.telehealth_fee && (
                  <div className="mb-4 p-3 rounded-xl" style={{ background: '#F5821E10' }}>
                    <div className="text-xs font-semibold uppercase tracking-wide text-orange-400 mb-0.5">Telehealth Fee</div>
                    <div className="text-lg font-bold text-orange-500">₹{doctor.telehealth_fee.toLocaleString('en-IN')}</div>
                    <div className="text-xs text-orange-400 mt-0.5">Video consultation</div>
                  </div>
                )}
                <button onClick={() => setBooking(true)}
                  className="w-full py-3 rounded-xl font-bold text-white text-sm hover:opacity-90 transition-opacity"
                  style={{ background: '#CC1414' }}>
                  Book Appointment
                </button>
                <p className="text-xs text-gray-400 text-center mt-3">No payment until confirmation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
