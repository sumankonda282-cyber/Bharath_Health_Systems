import { Tooltip } from './Tooltip'

/**
 * Icon-only button with a mandatory tooltip (label) — the standard for every
 * icon action. Accessible (aria-label), press feedback, active + tone variants.
 */
const TONES = {
  default: 'text-gray-400 hover:text-white hover:bg-white/10',
  muted:   'text-gray-500 hover:text-gray-300 hover:bg-gray-100/5',
  danger:  'text-red-400 hover:text-red-300 hover:bg-red-500/10',
  brand:   'text-[#F5821E] hover:bg-[#F5821E]/10',
}

export function IconButton({
  icon: Icon, label, shortcut, onClick, active = false, tone = 'default',
  size = 16, side = 'bottom', className = '', ...rest
}) {
  const btn = (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`inline-flex items-center justify-center p-1.5 rounded-lg transition-all
                  active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30
                  ${active ? 'bg-white/15 text-white' : TONES[tone] || TONES.default} ${className}`}
      style={{ transitionDuration: '140ms' }}
      {...rest}
    >
      <Icon size={size} />
    </button>
  )
  return <Tooltip label={label} shortcut={shortcut} side={side}>{btn}</Tooltip>
}
