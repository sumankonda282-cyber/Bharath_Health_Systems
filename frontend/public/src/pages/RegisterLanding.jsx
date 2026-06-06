import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2, Stethoscope, Heart, Pill, FlaskConical, Scan,
  CheckCircle, Copy, ExternalLink, Mail, Phone, Linkedin
} from 'lucide-react'
import BrandLogo from '../components/BrandLogo'

const DEMO_URL = import.meta.env.VITE_DEMO_URL || 'https://demo.bharathealthsystems.com'

function Navbar() {
  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/"><BrandLogo size="md" /></Link>
          <div className="flex items-center gap-6">
            <Link to="/clinics" className="text-gray-600 hover:text-gray-900 font-medium text-sm hidden md:block">Find Clinics</Link>
            <Link to="/" className="text-gray-600 hover:text-gray-900 font-medium text-sm hidden md:block">Home</Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

const ENTITY_CARDS = [
  {
    icon: '🏥',
    title: 'Clinic',
    subtitle: 'Single or multi-specialty. GP, dental, eye care, group practice.',
    features: ['Appointments & queue', 'EMR & billing', 'Lab/pharmacy integration', 'All portals included'],
    color: '#0F2557',
    route: '/register/clinic',
    btnLabel: 'Register Clinic',
  },
  {
    icon: '🏨',
    title: 'Hospital',
    subtitle: 'Multi-specialty inpatient care. Wards, ICU, OT, emergency.',
    features: ['Inpatient management', 'Ward & bed board', 'MAR & clinical orders', 'Full billing suite'],
    color: '#CC1414',
    route: '/register/hospital',
    btnLabel: 'Register Hospital',
  },
  {
    icon: '💊',
    title: 'Pharmacy',
    subtitle: 'Standalone retail or hospital dispensary.',
    features: ['Prescription upload & pickup', 'Inventory management', 'Patient history', 'Home delivery support'],
    color: '#138808',
    route: '/register/pharmacy',
    btnLabel: 'Register Pharmacy',
  },
  {
    icon: '🔬',
    title: 'Diagnostic Center',
    subtitle: 'Labs & imaging. Upload prescriptions, collect results.',
    features: ['Test booking', 'Digital reports', 'Doctor referrals', 'Home collection'],
    color: '#7C3AED',
    route: '/register/diagnostic',
    btnLabel: 'Register Center',
  },
]

const PORTALS = [
  { name: 'Receptionist Portal', Icon: Building2, color: '#0F2557', for: 'Receptionist & Admin', features: ['Patient queue', 'Appointments', 'Billing & invoicing'] },
  { name: 'Provider Portal', Icon: Stethoscope, color: '#CC1414', for: 'Doctors & Providers', features: ['EMR', 'SOAP notes', 'e-Prescriptions'] },
  { name: 'CareChart', Icon: Heart, color: '#F5821E', for: 'Ward Nurses', features: ['MAR', 'Vitals monitoring', 'Clinical orders'] },
  { name: 'Pharmacy', Icon: Pill, color: '#138808', for: 'Pharmacy Staff', features: ['Dispensing', 'Inventory alerts', 'Prescriptions'] },
  { name: 'Lab', Icon: FlaskConical, color: '#7C3AED', for: 'Laboratory', features: ['Test orders', 'Digital reports', 'Results delivery'] },
  { name: 'Imaging', Icon: Scan, color: '#0891B2', for: 'Imaging / Radiology', features: ['Scan orders', 'DICOM support', 'Reports'] },
]

const DEMO_ACCOUNTS = [
  { icon: '🏥', label: 'Clinic Demo', username: 'demo_clinic', password: 'Demo@1234', url: DEMO_URL },
  { icon: '🏨', label: 'Hospital Demo', username: 'demo_hospital', password: 'Demo@1234', url: DEMO_URL },
  { icon: '💊', label: 'Pharmacy Demo', username: 'demo_pharmacy', password: 'Demo@1234', url: DEMO_URL },
]

function DemoCard({ account }) {
  const [copied, setCopied] = useState(null)
  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{account.icon}</span>
        <span className="font-semibold text-gray-800">{account.label}</span>
      </div>
      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-500">URL</span>
          <span className="font-mono text-xs truncate max-w-[160px]">{account.url.replace('https://', '')}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Username</span>
          <span className="font-mono font-medium">{account.username}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Password</span>
          <span className="font-mono font-medium">{account.password}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => copy(`Username: ${account.username}\nPassword: ${account.password}`, 'creds')}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          {copied === 'creds' ? 'Copied!' : 'Copy'}
        </button>
        <a
          href={account.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-white transition-colors"
          style={{ background: '#0F2557' }}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open Demo
        </a>
      </div>
    </div>
  )
}

export default function RegisterLanding() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── Section 1: Hero ─────────────────────────────────────────────── */}
      <section className="py-20 px-4 text-center text-white" style={{ background: '#0F2557' }}>
        <div className="max-w-3xl mx-auto">
          <div className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-6 border border-blue-400 text-blue-200">
            Trusted by 500+ healthcare providers
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            Join India's Digital Health Network
          </h1>
          <p className="text-lg text-blue-200 max-w-2xl mx-auto">
            BharatHealthSystems powers clinics, hospitals, pharmacies, and diagnostic centers with one integrated platform — patient management, EMR, billing, pharmacy, labs, and more.
          </p>
        </div>
      </section>

      {/* ── Section 2: Entity Type Chooser ──────────────────────────────── */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-2" style={{ color: '#0F2557' }}>
            What are you registering?
          </h2>
          <p className="text-center text-gray-500 mb-10 text-sm">Choose the option that best describes your organization.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ENTITY_CARDS.map(card => (
              <div key={card.title} className="border-2 rounded-2xl p-6 flex flex-col hover:shadow-lg transition-shadow"
                style={{ borderColor: card.color + '33' }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{card.icon}</span>
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: card.color }}>{card.title}</h3>
                    <p className="text-gray-500 text-sm">{card.subtitle}</p>
                  </div>
                </div>
                <ul className="space-y-1.5 mb-5 flex-1">
                  {card.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: card.color }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to={card.route}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
                  style={{ background: card.color }}>
                  {card.btnLabel} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3: Portal Showcase ───────────────────────────────────── */}
      <section className="py-16 px-4" style={{ background: '#F8FAFC' }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-2" style={{ color: '#0F2557' }}>
            One Platform, Every Department
          </h2>
          <p className="text-center text-gray-500 mb-10 text-sm">Specialized portals for every role in your organization.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {PORTALS.map(({ name, Icon, color, for: forRole, features }) => (
              <div key={name} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '18' }}>
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">{name}</h3>
                    <p className="text-xs text-gray-500">{forRole}</p>
                  </div>
                </div>
                <ul className="space-y-1">
                  {features.map(f => (
                    <li key={f} className="text-xs text-gray-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: Demo Access ───────────────────────────────────────── */}
      <section className="py-16 px-4" style={{ background: '#F0F4F8' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-2" style={{ color: '#0F2557' }}>
            Try Before You Register
          </h2>
          <p className="text-center text-gray-500 mb-10 text-sm">
            Demo data resets every 24 hours. All features enabled.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            <div>
              <h3 className="text-xl font-bold mb-3" style={{ color: '#0F2557' }}>Explore with no commitment</h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Our demo environment gives you full access to every portal — CareChart, Provider Portal, Receptionist Portal, Pharmacy, Lab, and Imaging. Walk through real workflows before you decide to register.
              </p>
              <ul className="space-y-2">
                {['No credit card or commitment needed', 'All modules fully functional', 'Sample patient and appointment data included', 'Resets to clean state every 24 hours'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              {DEMO_ACCOUNTS.map(acc => <DemoCard key={acc.label} account={acc} />)}
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Founder & Contact ─────────────────────────────────── */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10" style={{ color: '#0F2557' }}>
            Meet the Team
          </h2>

          {/* Founder Card */}
          <div className="flex flex-col items-center mb-14">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold text-white mb-4"
              style={{ background: '#0F2557' }}>BHS</div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Founder &amp; CEO</p>
            <h3 className="text-xl font-bold mb-3" style={{ color: '#0F2557' }}>BharatHealthSystems</h3>
            <blockquote className="text-center text-gray-500 italic max-w-md mb-4 leading-relaxed">
              "Building India's healthcare infrastructure, one clinic at a time."
            </blockquote>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <a href="mailto:founder@bharathealthsystems.com" className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                <Mail className="w-4 h-4" /> founder@bharathealthsystems.com
              </a>
              <a href="#" className="flex items-center gap-1.5 hover:text-blue-600 transition-colors">
                <Linkedin className="w-4 h-4" /> LinkedIn
              </a>
            </div>
          </div>

          {/* Business Contacts */}
          <h3 className="text-lg font-bold text-center mb-6 text-gray-700">Business Inquiries &amp; Marketing</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            {[
              {
                title: 'Business Partnerships',
                lines: ['+91 98765 43210', 'partnerships@bharathealthsystems.com'],
                icons: [Phone, Mail],
              },
              {
                title: 'Sales & Onboarding',
                lines: ['+91 98765 43211', 'Talk to our team about getting your clinic onboard'],
                icons: [Phone, null],
              },
              {
                title: 'Support',
                lines: ['1800-XXX-XXXX (Toll Free)', 'support@bharathealthsystems.com'],
                icons: [Phone, Mail],
              },
            ].map(({ title, lines, icons }) => (
              <div key={title} className="border border-gray-200 rounded-2xl p-5">
                <h4 className="font-semibold text-gray-800 mb-3">{title}</h4>
                <div className="space-y-2">
                  {lines.map((line, idx) => {
                    const Icon = icons[idx]
                    return (
                      <div key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                        {Icon && <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />}
                        <span>{line}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-center text-gray-400">
            These are business inquiry contacts. For patient support, use your clinic's helpline.
          </p>
        </div>
      </section>

      {/* ── Section 6: Bottom CTA ─────────────────────────────────────────── */}
      <section className="py-16 px-4 text-white text-center" style={{ background: '#0F2557' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Start your free registration today.</h2>
          <p className="text-blue-200 mb-10">No setup fees. No commitment. Be live in 24 hours.</p>
          <div className="flex flex-wrap justify-center gap-4">
            {ENTITY_CARDS.map(card => (
              <Link key={card.title} to={card.route}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm border-2 text-white hover:opacity-90 transition-opacity"
                style={{ borderColor: card.color === '#0F2557' ? '#4A6FBF' : card.color, background: card.color === '#0F2557' ? '#1a3a7a' : card.color }}>
                <span>{card.icon}</span> {card.btnLabel}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
