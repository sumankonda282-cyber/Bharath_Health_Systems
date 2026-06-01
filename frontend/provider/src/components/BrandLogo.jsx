const SIZES = {
  sm: { map: 24, fontSize: 'text-base', gap: 'gap-2' },
  md: { map: 32, fontSize: 'text-xl', gap: 'gap-2.5' },
  lg: { map: 48, fontSize: 'text-3xl', gap: 'gap-3' },
}

export default function BrandLogo({ size = 'md', showText = true }) {
  const s = SIZES[size] || SIZES.md
  const h = s.map
  const w = Math.round(h * 0.85)

  return (
    <div className={`inline-flex items-center ${s.gap}`}>
      <svg
        width={w}
        height={h}
        viewBox="0 0 100 120"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="indiaGradP" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#FF9933" />
            <stop offset="33%"  stopColor="#FF9933" />
            <stop offset="33%"  stopColor="#ffffff" />
            <stop offset="66%"  stopColor="#ffffff" />
            <stop offset="66%"  stopColor="#138808" />
            <stop offset="100%" stopColor="#138808" />
          </linearGradient>
        </defs>
        <path
          d="M 35,2 L 45,1 L 55,3 L 65,8 L 72,5 L 78,10 L 80,18 L 85,22 L 88,30 L 85,35 L 90,42 L 88,50 L 83,55 L 80,62 L 75,68 L 70,72 L 65,80 L 60,88 L 55,95 L 50,105 L 47,100 L 42,92 L 38,85 L 32,78 L 28,70 L 22,65 L 18,58 L 15,50 L 12,42 L 15,35 L 12,28 L 18,20 L 22,14 L 28,8 Z"
          fill="url(#indiaGradP)"
          stroke="#ccc"
          strokeWidth="1"
        />
        <rect x="43" y="32" width="14" height="42" rx="3" fill="white" fillOpacity="0.85" />
        <rect x="29" y="46" width="42" height="14" rx="3" fill="white" fillOpacity="0.85" />
      </svg>

      {showText && (
        <span className={`font-extrabold leading-none ${s.fontSize}`} style={{ letterSpacing: '-0.02em' }}>
          <span style={{ color: '#CC1414' }}>BH</span>
          <span style={{ color: '#0F2557' }}>aratCliniq</span>
        </span>
      )}
    </div>
  )
}
