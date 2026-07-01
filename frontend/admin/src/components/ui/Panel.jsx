/** Console-style content primitives: Panel (card), PageHeader, SectionLabel,
 *  KeyValue, StatPill, EmptyState. Dark, dense, subtle borders. */
import { Tooltip } from './Tooltip'

export function Panel({ children, className = '', flush = false }) {
  return (
    <div className={`surface border border-app rounded-xl ${flush ? '' : 'p-4'} ${className}`}>
      {children}
    </div>
  )
}

export function PanelHeader({ title, sub, actions, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-app">
      {Icon && <Icon size={16} className="text-dim flex-shrink-0" />}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-app truncate">{title}</div>
        {sub && <div className="text-[11px] text-faint truncate">{sub}</div>}
      </div>
      {actions && <div className="flex items-center gap-1 flex-shrink-0">{actions}</div>}
    </div>
  )
}

export function PageHeader({ title, sub, actions }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-app leading-tight">{title}</h1>
        {sub && <p className="text-xs text-dim mt-0.5">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  )
}

export function SectionLabel({ children, className = '' }) {
  return <div className={`text-[10px] font-bold uppercase tracking-wider text-faint ${className}`}>{children}</div>
}

export function KeyValue({ label, value, mono = false }) {
  return (
    <div className="flex items-baseline gap-2 min-w-0">
      <span className="text-[11px] text-faint flex-shrink-0">{label}</span>
      <span className={`text-sm text-app truncate ${mono ? 'font-mono text-xs' : 'font-medium'}`}>{value ?? '—'}</span>
    </div>
  )
}

const STAT_TONES = {
  gray: '#9ca3af', green: '#34d399', amber: '#fbbf24', red: '#f87171', blue: '#60a5fa', purple: '#c084fc', brand: '#F5821E',
}

/** Compact click-through stat pill (icon · value · label). */
export function StatPill({ icon: Icon, value, label, tone = 'gray', onClick, hint }) {
  const c = STAT_TONES[tone] || STAT_TONES.gray
  const inner = (
    <div className={`flex items-center gap-2.5 surface border border-app rounded-xl px-3 py-2 ${onClick ? 'hover:border-app cursor-pointer transition-colors' : ''}`}>
      {Icon && <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: c + '1a' }}><Icon size={16} style={{ color: c }} /></div>}
      <div className="min-w-0">
        <div className="text-lg font-bold leading-none text-app">{value ?? '—'}</div>
        <div className="text-[11px] text-faint truncate mt-0.5">{label}</div>
      </div>
    </div>
  )
  const el = onClick ? <button onClick={onClick} className="text-left w-full">{inner}</button> : inner
  return hint ? <Tooltip label={hint}>{el}</Tooltip> : el
}

export function EmptyState({ icon: Icon, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      {Icon && <Icon size={38} className="text-faint mb-3 opacity-60" />}
      <p className="text-sm font-medium text-dim">{title}</p>
      {hint && <p className="text-xs text-faint mt-1 max-w-sm">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
