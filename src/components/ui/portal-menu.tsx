import { EllipsisVertical, type LucideIcon } from 'lucide-react'
import { type KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { positionHelpPopover, type HelpPopoverPosition } from '@/lib/help-popover'
import { cn } from '@/lib/utils'

type PortalMenuItem = {
  disabled?: boolean
  Icon: LucideIcon
  label: string
  onSelect?: () => void
}

type PortalMenuProps = {
  items: readonly PortalMenuItem[]
  /** The accessible name of the open menu. */
  menuLabel: string
  triggerClassName?: string
  /** The accessible name of the ⋮ trigger. */
  triggerLabel: string
}

const enabledItems = (menu: HTMLElement | null) =>
  Array.from(menu?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])

/**
 * A ⋮ menu for a container that clips its overflow, such as the patch grid or the operator rack.
 * The menu opens in a portal, claims Escape so the view's shortcuts do not also act on it, and
 * closes on scroll rather than following its trigger.
 */
export function PortalMenu({ items, menuLabel, triggerClassName, triggerLabel }: PortalMenuProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<HelpPopoverPosition>({ left: 12, top: 12 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const close = (restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }

  useLayoutEffect(() => {
    const trigger = triggerRef.current?.getBoundingClientRect()
    const menu = menuRef.current
    if (!open || !trigger || !menu) return
    // Right-aligned under the trigger, which sits at its container's right edge.
    const { offsetHeight, offsetWidth } = menu
    const anchor = {
      bottom: trigger.bottom,
      left: trigger.right - offsetWidth + 8,
      top: trigger.top,
    }
    setPosition(positionHelpPopover(anchor, offsetWidth, offsetHeight, innerWidth, innerHeight))
    ;(enabledItems(menu)[0] ?? menu).focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) close(false)
    }
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      close(true)
    }
    const closeOnMove = () => close(false)
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    window.addEventListener('scroll', closeOnMove, true)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('scroll', closeOnMove, true)
    }
  }, [open])

  // The arrow keys move between the items that can be chosen, wrapping at either end.
  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const choices = enabledItems(menuRef.current)
    if (choices.length === 0) return
    const current = choices.indexOf(document.activeElement as HTMLButtonElement)
    const step = event.key === 'ArrowDown' ? 1 : -1
    choices[(current + step + choices.length) % choices.length].focus()
  }

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={triggerLabel}
        className={cn(
          'grid size-6 shrink-0 cursor-pointer place-items-center text-[var(--crt-ink-4)] transition-colors hover:text-[var(--crt-acc-lt)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--crt-led)] aria-expanded:text-[var(--crt-acc-lt)]',
          triggerClassName,
        )}
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <EllipsisVertical aria-hidden="true" className="size-3.5" />
      </button>
      {open
        ? createPortal(
            <div
              aria-label={menuLabel}
              className="menu-surface fixed z-[100] min-w-40 border-t-2 border-r-2 border-b-2 border-l-2 border-t-[var(--crt-bevel)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel)] bg-[var(--crt-bg-panel2)] p-1 text-[var(--crt-ink)]"
              onBlur={(event) => {
                const next = event.relatedTarget as Node | null
                if (next && !menuRef.current?.contains(next) && next !== triggerRef.current) {
                  close(false)
                }
              }}
              onKeyDown={moveFocus}
              ref={menuRef}
              role="menu"
              style={position}
              tabIndex={-1}
            >
              {items.map(({ disabled, Icon, label, onSelect }) => (
                <button
                  className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                  disabled={disabled}
                  key={label}
                  onClick={() => {
                    // Focus returns to the trigger first, so a dialog the action opens restores it there.
                    close(true)
                    onSelect?.()
                  }}
                  role="menuitem"
                  tabIndex={-1}
                  type="button"
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
