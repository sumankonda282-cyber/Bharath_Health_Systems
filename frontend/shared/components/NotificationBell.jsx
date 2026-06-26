import { useState, useRef, useEffect } from 'react'
import { Bell, X } from 'lucide-react'

/**
 * Shared notification bell — portal-agnostic, prop-driven (no API import).
 * Pass `items` (array of { id, title, body, icon?, color?, onClick? }) when a
 * portal has a real notification source; otherwise it shows a clean empty
 * state so it never fires a failing request.
 */
export default function NotificationBell({ items = [], onDismiss, onClear }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const count = items.length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        title="Notifications"
      >
        <Bell size={18} />
        {count > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
            style={{ background: '#CC1414' }}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-900 text-sm">Notifications</span>
            {count > 0 && onClear && (
              <button onClick={onClear} className="text-xs text-gray-400 hover:text-gray-600">Clear all</button>
            )}
          </div>
          {count === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <Bell size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No new notifications</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {items.map(item => {
                const Icon = item.icon || Bell
                const color = item.color || '#0F2557'
                return (
                  <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <button className="flex items-start gap-3 flex-1 text-left"
                      onClick={() => { item.onClick?.(); setOpen(false) }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: color + '15' }}>
                        <Icon size={14} style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800">{item.title}</div>
                        {item.body && <div className="text-xs text-gray-500 mt-0.5 truncate">{item.body}</div>}
                      </div>
                    </button>
                    {onDismiss && (
                      <button onClick={() => onDismiss(item.id)} className="p-0.5 text-gray-300 hover:text-gray-500 flex-shrink-0 mt-0.5">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
