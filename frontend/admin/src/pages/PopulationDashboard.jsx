import { Users } from 'lucide-react'

export default function PopulationDashboard() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
        <Users size={32} className="text-gray-600" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Population Analytics</h2>
      <p className="text-gray-500 text-sm max-w-sm leading-relaxed">
        Population health insights are coming soon. This module will provide aggregate patient population analysis across all health centers.
      </p>
      <div className="mt-5 px-4 py-2 rounded-full border text-xs font-semibold tracking-wider uppercase"
        style={{ background: 'rgba(245,130,30,0.1)', borderColor: 'rgba(245,130,30,0.3)', color: '#F5821E' }}>
        Coming Soon
      </div>
    </div>
  )
}
