import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import BrandLogo from './BrandLogo'

const PROVIDER_URL = import.meta.env.VITE_PROVIDER_URL || 'https://provider.bharathhealthsystems.com'
const PATIENT_URL  = import.meta.env.VITE_PATIENT_URL  || 'https://patient.bharathhealthsystems.com'

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* Brand */}
          <div>
            <BrandLogo size="md" />
            <p className="text-sm text-gray-500 mt-3 leading-relaxed max-w-xs">
              India's digital health platform connecting patients with verified doctors and empowering health centers with modern clinical software.
            </p>
          </div>

          {/* For Patients */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#CC1414' }}>For Patients</h3>
            <div className="space-y-2">
              {[
                { label: 'Find Doctors', to: '/clinics' },
                { label: 'My Booking', to: '/booking/check' },
                { label: 'Telehealth Consultation', to: '/telehealth' },
                { label: 'My Health Portal', href: PATIENT_URL },
              ].map(item => (
                <div key={item.label}>
                  {item.href ? (
                    <a href={item.href} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#CC1414] transition-colors py-0.5 group">
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#CC1414]" />
                      {item.label}
                    </a>
                  ) : (
                    <Link to={item.to}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#CC1414] transition-colors py-0.5 group">
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#CC1414]" />
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* For Health Centers */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#0F2557' }}>For Health Centers</h3>
            <div className="space-y-2">
              {[
                { label: 'Provider Login (CareChart EMR)', href: PROVIDER_URL },
                { label: 'Staff Management', href: PROVIDER_URL + '/staff' },
                { label: 'Pharmacy Module', href: PROVIDER_URL + '/pharmacy' },
                { label: 'Diagnostics Lab', href: PROVIDER_URL + '/lab' },
                { label: 'Imaging Center', href: PROVIDER_URL + '/imaging' },
                { label: 'Register Health Center', to: '/register' },
              ].map(item => (
                <div key={item.label}>
                  {item.href ? (
                    <a href={item.href} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0F2557] transition-colors py-0.5 group">
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#0F2557]" />
                      {item.label}
                    </a>
                  ) : (
                    <Link to={item.to}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0F2557] transition-colors py-0.5 group">
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#0F2557]" />
                      {item.label}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} BHarath Health Systems. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <Link to="/register" className="hover:text-gray-600 transition-colors">Register Health Center</Link>
            <a href="mailto:support@bharathhealthsystems.com" className="hover:text-gray-600 transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
