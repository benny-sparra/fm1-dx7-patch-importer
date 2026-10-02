import type { ReactNode } from 'react'

/**
 * The CRT slide switch, as MIDI online/offline uses: a bevelled key whose handle slides along a
 * dark track and lights when on. The label names what it switches.
 */
export function Switch({
  checked,
  children,
  className,
  disabled = false,
  onChange,
}: {
  checked: boolean
  children: ReactNode
  /** Sizes and places the switch; its colours come from `.midi-switch`. */
  className?: string
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label
      className={`midi-switch ${className ?? 'inline-flex min-h-8 items-center gap-2 px-2.5 text-xs tracking-[0.1em] uppercase transition-colors'}`}
    >
      <input
        aria-checked={checked}
        checked={checked}
        className="peer sr-only"
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        role="switch"
        type="checkbox"
      />
      <span aria-hidden="true" className="midi-switch-track" />
      {children}
    </label>
  )
}
