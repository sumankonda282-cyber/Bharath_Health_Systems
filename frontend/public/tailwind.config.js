/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          red:     '#CC1414',
          navy:    '#0F2557',
          saffron: '#F5821E',
          gold:    '#D4AF37',
          green:   '#138808',
        },
        primary:  { DEFAULT: '#0F2557', dark: '#0a1a3e' },
        accent:   { DEFAULT: '#F5821E', dark: '#d96c0a' },
        danger:   { DEFAULT: '#CC1414', dark: '#b01010' },
        success:  { DEFAULT: '#16A34A', dark: '#15803d' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: {
        xl:    '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card:    '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(15,37,87,0.05)',
        'card-lg': '0 4px 24px rgba(15,37,87,0.10)',
        'card-xl': '0 8px 40px rgba(15,37,87,0.15)',
      },
    },
  },
  plugins: [],
}
