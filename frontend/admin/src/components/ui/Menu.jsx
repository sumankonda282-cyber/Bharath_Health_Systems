import * as DM from '@radix-ui/react-dropdown-menu'

/**
 * Accessible dropdown menu (click-to-open popover) built on Radix — keyboard
 * navigable, focus-managed, closes on Esc/outside-click. Use for profile menus,
 * row "⋯" actions, sort/export menus.
 *
 *   <Menu trigger={<IconButton .../>}>
 *     <MenuItem icon={LogOut} onSelect={logout} tone="danger">Sign out</MenuItem>
 *   </Menu>
 */
export function Menu({ trigger, children, align = 'end', side = 'bottom', width = 224 }) {
  return (
    <DM.Root>
      <DM.Trigger asChild>{trigger}</DM.Trigger>
      <DM.Portal>
        <DM.Content
          align={align}
          side={side}
          sideOffset={6}
          style={{ width }}
          className="z-[100] rounded-xl surface border border-app shadow-2xl p-1.5
                     data-[state=open]:animate-[uiPop_140ms_ease-out] focus:outline-none"
        >
          {children}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  )
}

const ITEM_TONES = {
  default: 'text-dim hover:bg-[color:var(--hover)] hover:text-app data-[highlighted]:bg-[color:var(--hover)] data-[highlighted]:text-app',
  danger:  'text-red-400 hover:bg-red-500/10 hover:text-red-300 data-[highlighted]:bg-red-500/10 data-[highlighted]:text-red-300',
}

export function MenuItem({ icon: Icon, children, onSelect, tone = 'default', disabled }) {
  return (
    <DM.Item
      disabled={disabled}
      onSelect={onSelect}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer
                  outline-none transition-colors disabled:opacity-40 ${ITEM_TONES[tone] || ITEM_TONES.default}`}
    >
      {Icon && <Icon size={15} className="flex-shrink-0" />}
      <span className="flex-1 truncate">{children}</span>
    </DM.Item>
  )
}

export function MenuLabel({ children }) {
  return <DM.Label className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-faint">{children}</DM.Label>
}
export function MenuSeparator() {
  return <DM.Separator className="my-1 h-px surface-2" />
}
