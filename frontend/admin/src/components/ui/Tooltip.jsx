import * as T from '@radix-ui/react-tooltip'

/**
 * Hover tooltip built on Radix — accessible, delayed on first hover then instant
 * for the next icon in the same group (skipDelay), with an optional shortcut hint.
 * Wrap the whole app once in <TooltipProvider> (see App.jsx). Renders children
 * unchanged when there's no label.
 */
export function Tooltip({ label, shortcut, side = 'bottom', children }) {
  if (!label) return children
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          className="z-[100] select-none rounded-md bg-gray-900 border border-white/10 px-2 py-1 text-[11px] font-medium text-gray-100 shadow-lg
                     data-[state=delayed-open]:animate-[uiPop_120ms_ease-out]"
        >
          <span className="flex items-center gap-1.5">
            {label}
            {shortcut && (
              <kbd className="rounded bg-white/10 px-1 text-[10px] text-gray-300">{shortcut}</kbd>
            )}
          </span>
          <T.Arrow className="fill-gray-900" />
        </T.Content>
      </T.Portal>
    </T.Root>
  )
}

export const TooltipProvider = ({ children }) => (
  <T.Provider delayDuration={300} skipDelayDuration={250}>{children}</T.Provider>
)
