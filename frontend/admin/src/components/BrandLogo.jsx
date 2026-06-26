import logoImg from '../assets/logo.png'

const SIZES = {
  sm: { img: 28, name: 'text-sm',  sub: 'text-[9px]' },
  md: { img: 38, name: 'text-lg',  sub: 'text-[10px]' },
  lg: { img: 56, name: 'text-2xl', sub: 'text-xs' },
}

// tone: 'light' for dark backgrounds (white text) · 'dark' for light backgrounds (ink text)
const TONES = {
  light: { name: '#ffffff', brand: '#FF5A5A', sub: 'rgba(255,255,255,0.6)' },
  dark:  { name: '#0F172A', brand: '#CC1414', sub: '#94A3B8' },
}

export default function BrandLogo({ size = 'md', showText = true, tone = 'light' }) {
  const s = SIZES[size] || SIZES.md
  const t = TONES[tone] || TONES.light
  return (
    <div className="inline-flex items-center" style={{ gap: 5 }}>
      <img src={logoImg} alt="BHarath Health Systems" style={{ height: s.img, width: 'auto', flexShrink: 0 }} />
      {showText && (
        <div className="flex flex-col leading-none" style={{ gap: 1 }}>
          <span className={`font-extrabold ${s.name}`} style={{ color: t.name, letterSpacing: '-0.02em' }}>
            <span style={{ color: t.brand }}>BHarath</span>{' '}Health
          </span>
          <span className={`italic ${s.sub} text-right`} style={{ color: t.sub, letterSpacing: '0.04em' }}>
            Systems
          </span>
        </div>
      )}
    </div>
  )
}
