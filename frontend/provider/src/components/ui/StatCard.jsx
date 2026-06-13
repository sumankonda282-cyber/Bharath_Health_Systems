import { Link } from 'react-router-dom'

export default function StatCard({ label, value, icon: Icon, color = 'navy', sub, to }) {
  const palette = {
    navy:   { bg: '#EEF2FF', fg: '#0F2557' },
    red:    { bg: '#FEF2F2', fg: '#CC1414' },
    green:  { bg: '#F0FDF4', fg: '#16a34a' },
    orange: { bg: '#FFF7ED', fg: '#F5821E' },
    purple: { bg: '#FAF5FF', fg: '#7c3aed' },
    blue:   { bg: '#EFF6FF', fg: '#2563eb' },
    teal:   { bg: '#F0FDFA', fg: '#0d9488' },
  }
  const { bg, fg } = palette[color] || palette.navy

  const inner = (
    <>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
        <Icon size={22} style={{ color: fg }} />
      </div>
      <div>
        <div className="text-2xl font-extrabold" style={{ color: '#0F2557' }}>{value ?? '—'}</div>
        <div className="text-sm text-gray-500">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </>
  )

  if (to) {
    return (
      <Link to={to} className="card p-5 flex items-center gap-4 hover:shadow-md hover:border-blue-100 border-2 border-transparent transition-all">
        {inner}
      </Link>
    )
  }

  return (
    <div className="card p-5 flex items-center gap-4">
      {inner}
    </div>
  )
}
