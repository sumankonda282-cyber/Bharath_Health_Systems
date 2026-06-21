import logoImg from '../assets/logo.png'

const SIZES = {
  sm: { img: 28, name: 'text-sm',  sub: 'text-[9px]',  gap: 'gap-1.5' },
  md: { img: 36, name: 'text-base', sub: 'text-[10px]', gap: 'gap-2' },
  lg: { img: 52, name: 'text-xl',   sub: 'text-xs',     gap: 'gap-2.5' },
}

export default function BrandLogo({ size = 'md', showText = true, light = false }) {
  const s = SIZES[size] || SIZES.md
  const navyColor = light ? '#ffffff' : '#0F2557'
  const subColor  = light ? 'rgba(255,255,255,0.6)' : '#6b7280'
  return (
    <div className={`inline-flex items-center ${s.gap}`}>
      <img src={logoImg} alt="BHarath Health Systems" style={{ height: s.img, width: 'auto', flexShrink: 0 }} />
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-extrabold ${s.name}`} style={{ letterSpacing: '-0.02em' }}>
            <span style={{ color: '#CC1414' }}>BHarath</span>
            <span style={{ color: navyColor }}> Health</span>
          </span>
          <span className={`font-semibold italic ${s.sub}`} style={{ color: subColor }}>Systems</span>
        </div>
      )}
    </div>
  )
}
