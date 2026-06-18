// Shared caution badge — single definition used across all pages.
// Standard: text-[10px], border, no emoji prefixes.
const CAUTION_STYLE = {
  nbm:        { label: 'NBM',         bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  post_op:    { label: 'Post-op',     bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  blood_thin: { label: 'Blood Thin.', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  intubated:  { label: 'Intubated',   bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
  pre_surg:   { label: 'Pre-surgery', bg: '#fefce8', color: '#a16207', border: '#fde68a' },
  critical:   { label: 'Critical',    bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  isolation:  { label: 'Isolation',   bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  fall_risk:  { label: 'Fall Risk',   bg: '#fffbeb', color: '#92400e', border: '#fcd34d' },
}

export default function CautionBadge({ flag }) {
  const s = CAUTION_STYLE[flag] || { label: flag, bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' }
  return (
    <span
      className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap border"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
    >
      {s.label}
    </span>
  )
}
