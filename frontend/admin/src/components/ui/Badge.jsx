/** Status badge — tinted bg + colored text + border. One tone per meaning. */
const TONES = {
  gray:   'bg-gray-500/10 text-gray-300 border-gray-500/30',
  green:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  amber:  'bg-amber-500/10 text-amber-400 border-amber-500/30',
  red:    'bg-red-500/10 text-red-400 border-red-500/30',
  blue:   'bg-blue-500/10 text-blue-400 border-blue-500/30',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  brand:  'bg-[#F5821E]/10 text-[#F5821E] border-[#F5821E]/30',
}

export function Badge({ tone = 'gray', dot = false, icon: Icon, children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${TONES[tone] || TONES.gray} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {Icon && <Icon size={11} />}
      {children}
    </span>
  )
}
