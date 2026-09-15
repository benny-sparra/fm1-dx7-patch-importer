import { Copy, EllipsisVertical, Pencil } from 'lucide-react'
import { type KeyboardEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import { positionHelpPopover, type HelpPopoverPosition } from '@/lib/help-popover'

type PatchSlotMenuProps = {
  name: string
  onCopy?: () => void
  onEdit?: () => void
}

/**
 * A slot's own actions. The menu opens in a portal because the patch grid clips its overflow, and
 * it claims Escape so the view's shortcuts do not also act on it. It closes on scroll rather than
 * following its slot.
 */
export function PatchSlotMenu({ name, onCopy, onEdit }: PatchSlotMenuProps) {
  const { t } = useTranslation()
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
    // Right-aligned under the trigger, which sits at the slot's right edge.
    const { offsetHeight, offsetWidth } = menu
    const anchor = {
      bottom: trigger.bottom,
      left: trigger.right - offsetWidth + 8,
      top: trigger.top,
    }
    setPosition(positionHelpPopover(anchor, offsetWidth, offsetHeight, innerWidth, innerHeight))
    menu.querySelector('button')?.focus()
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

  // With two items, either arrow moves to the other one.
  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    Array.from(menuRef.current?.querySelectorAll('button') ?? [])
      .find((item) => item !== document.activeElement)
      ?.focus()
  }

  const items = [
    { action: onEdit, Icon: Pencil, label: t('banks.editSelected') },
    { action: onCopy, Icon: Copy, label: t('banks.copySelected') },
  ]

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('banks.bankMenu', { bank: name })}
        className="z-[1] -my-1 -mr-1 grid size-6 shrink-0 cursor-pointer place-items-center text-[var(--crt-ink-4)] transition-colors hover:text-[var(--crt-acc-lt)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--crt-led)] aria-expanded:text-[var(--crt-acc-lt)]"
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <EllipsisVertical aria-hidden="true" className="size-3.5" />
      </button>
      {open
        ? createPortal(
            <div
              aria-label={name}
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
              {items.map(({ action, Icon, label }) => (
                <button
                  className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-left text-sm transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
                  key={label}
                  onClick={() => {
                    // Focus returns to the trigger first, so a dialog the action opens restores it there.
                    close(true)
                    action?.()
                  }}
                  role="menuitem"
                  tabIndex={-1}
                  type="button"
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {label}
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
