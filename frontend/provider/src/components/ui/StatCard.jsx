import { Link } from 'react-router-dom'

export default function StatCard({ label, value, icon: Icon, color = 'navy', sub, to, compact = false }) {
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

  // Compact pill: single-line icon · value · label. Secondary text → tooltip.
  // Used on data-dense dashboards where a full card per digit wastes space.
  if (compact) {
    const pill = (
      <>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
          <Icon size={16} style={{ color: fg }} />
        </div>
        <div className="min-w-0">
          <div className="text-lg font-extrabold leading-none" style={{ color: '#0F2557' }}>{value ?? '—'}</div>
          <div className="text-[11px] text-gray-500 truncate leading-tight mt-0.5">{label}</div>
        </div>
      </>
    )
    const cls = 'bg-white rounded-xl border border-gray-100 px-2.5 py-2 flex items-center gap-2 hover:border-blue-200 hover:shadow-sm transition-all'
    if (to) return <Link to={to} title={sub || undefined} className={cls}>{pill}</Link>
    return <div title={sub || undefined} className={cls}>{pill}</div>
  }

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
