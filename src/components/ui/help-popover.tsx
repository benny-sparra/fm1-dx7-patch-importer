import { CircleHelp } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { positionHelpPopover, type HelpPopoverPosition } from '@/lib/help-popover'
import { cn } from '@/lib/utils'

const openHelpEvent = 'fm1-help-popover-open'

type HelpPopoverProps = {
  className?: string
  label: string
  text: string
}

export function HelpPopover({ className, label, text }: HelpPopoverProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<HelpPopoverPosition>({ left: 12, top: 12 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const instanceId = useId()
  const popoverId = `${instanceId}-help`

  const cancelScheduledClose = () => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  const openPopover = () => {
    cancelScheduledClose()
    if (!open) window.dispatchEvent(new CustomEvent(openHelpEvent, { detail: instanceId }))
    setOpen(true)
  }

  const scheduleClose = () => {
    cancelScheduledClose()
    closeTimerRef.current = setTimeout(() => {
      setOpen(false)
      closeTimerRef.current = null
    }, 120)
  }

  useLayoutEffect(() => {
    if (!open) return

    const updatePosition = () => {
      const trigger = buttonRef.current?.getBoundingClientRect()
      const popover = popoverRef.current
      if (!trigger || !popover) return
      setPosition(
        positionHelpPopover(
          trigger,
          popover.offsetWidth,
          popover.offsetHeight,
          window.innerWidth,
          window.innerHeight,
        ),
      )
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const closeForAnotherPopover = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== instanceId) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node
      if (!buttonRef.current?.contains(target) && !popoverRef.current?.contains(target))
        setOpen(false)
    }

    window.addEventListener(openHelpEvent, closeForAnotherPopover)
    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => {
      window.removeEventListener(openHelpEvent, closeForAnotherPopover)
      document.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
    }
  }, [instanceId, open])

  useEffect(() => () => cancelScheduledClose(), [])

  const toggle = () => {
    const nextOpen = !open
    if (nextOpen) window.dispatchEvent(new CustomEvent(openHelpEvent, { detail: instanceId }))
    setOpen(nextOpen)
  }

  return (
    <>
      <button
        aria-controls={popoverId}
        aria-expanded={open}
        aria-label={`Help: ${label}`}
        className={cn(
          'inline-grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground/75 transition-colors hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          className,
        )}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          cancelScheduledClose()
          toggle()
        }}
        onMouseEnter={openPopover}
        onMouseLeave={scheduleClose}
        onPointerDown={(event) => event.stopPropagation()}
        ref={buttonRef}
        type="button"
      >
        <CircleHelp aria-hidden="true" className="size-3.5" />
      </button>
      {open &&
        createPortal(
          // Hover handlers keep the explanatory popup open; the note itself is intentionally not interactive.
          // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
          <div
            className="font-vt323 fixed z-[100] w-[min(18.5rem,calc(100vw-1.5rem))] rounded-lg border border-primary/30 bg-popover p-3 text-left text-popover-foreground shadow-2xl"
            id={popoverId}
            onMouseEnter={cancelScheduledClose}
            onMouseLeave={scheduleClose}
            ref={popoverRef}
            role="note"
            style={position}
          >
            <p className="text-xs font-black tracking-[0.12em] text-primary uppercase">{label}</p>
            <p className="mt-1 text-sm leading-5 font-normal tracking-normal text-popover-foreground/85 normal-case">
              {text}
            </p>
          </div>,
          document.body,
        )}
    </>
  )
}
