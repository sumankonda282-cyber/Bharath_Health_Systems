import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { Menu, MenuItem, MenuLabel } from './ui/Menu'
import { IconButton } from './ui/IconButton'

const KEY = 'admin_theme'          // 'light' | 'dark' | 'system'
const mq = () => window.matchMedia('(prefers-color-scheme: dark)')

export function applyTheme(mode) {
  const dark = mode === 'dark' || (mode === 'system' && mq().matches)
  document.documentElement.classList.toggle('dark', dark)
}

// Apply saved theme immediately on import (before first paint of the app tree).
try { applyTheme(localStorage.getItem(KEY) || 'system') } catch { /* SSR-safe */ }

export default function ThemeToggle() {
  const [mode, setMode] = useState(() => localStorage.getItem(KEY) || 'system')

  useEffect(() => {
    applyTheme(mode)
    try { localStorage.setItem(KEY, mode) } catch { /* ignore */ }
    // keep 'system' live if the OS theme changes
    if (mode !== 'system') return
    const m = mq()
    const onChange = () => applyTheme('system')
    m.addEventListener('change', onChange)
    return () => m.removeEventListener('change', onChange)
  }, [mode])

  const Icon = mode === 'dark' ? Moon : mode === 'light' ? Sun : Monitor
  const trigger = (
    <span><IconButton icon={Icon} label="Theme" size={16} /></span>
  )
  return (
    <Menu trigger={trigger} width={180}>
      <MenuLabel>Appearance</MenuLabel>
      <MenuItem icon={Sun} onSelect={() => setMode('light')}>Light{mode === 'light' ? ' ✓' : ''}</MenuItem>
      <MenuItem icon={Moon} onSelect={() => setMode('dark')}>Dark{mode === 'dark' ? ' ✓' : ''}</MenuItem>
      <MenuItem icon={Monitor} onSelect={() => setMode('system')}>System{mode === 'system' ? ' ✓' : ''}</MenuItem>
    </Menu>
  )
}
