export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy:    '#0F2557',
          saffron: '#F5821E',
          red:     '#CC1414',
          gold:    '#D4AF37',
        },
        // Navy scale — primary brand colour
        navy: {
          50:  '#EEF2FB',
          100: '#DCE4F5',
          200: '#BFCDEC',
          600: '#0F2557',
          700: '#0B1C44',
          900: '#081634',
        },
        saffron: {
          50:  '#FFF4E8',
          100: '#FCE6CE',
          500: '#F5821E',
          600: '#E06D0A',
        },
        // Text / neutral ink
        ink: {
          DEFAULT: '#0F172A',
          soft:    '#475569',
          muted:   '#94A3B8',
        },
        line:   '#E6EAF0',   // hairline borders
        canvas: '#F7F9FC',   // app background
        primary: { DEFAULT: '#0F2557', dark: '#0B1C44' },
        accent:  { DEFAULT: '#F5821E', dark: '#E06D0A' },
        danger:  { DEFAULT: '#DC2626', dark: '#b91c1c' },
        success: { DEFAULT: '#16A34A', dark: '#15803d' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg:   '0.625rem',
        xl:   '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        xs:          '0 1px 2px rgba(16,24,40,0.04)',
        card:        '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)',
        'card-hover':'0 6px 20px rgba(15,37,87,0.10)',
        pop:         '0 12px 32px rgba(15,37,87,0.14)',
        rail:        '1px 0 0 rgba(16,24,40,0.05)',
      },
    },
  },
  plugins: [],
}
