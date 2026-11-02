import { useId } from 'react'

import { RackPanelHelp } from '@/components/editor/editor-workspace'
import { RackSelect } from '@/components/editor/parameter-controls'
import { HelpPopover } from '@/components/ui/help-popover'

/** Applies a starting point once, then continues to show the placeholder. */
export function PresetSelect<Id extends string>({
  accessibleLabel,
  disabled = false,
  help,
  label,
  onApply,
  options,
  placeholder,
  variant = 'part',
}: {
  accessibleLabel: string
  disabled?: boolean
  help: string
  label: string
  onApply: (id: Id) => void
  options: readonly { id: Id; name: string }[]
  placeholder: string
  variant?: 'effect' | 'part'
}) {
  const fieldId = useId()
  const effect = variant === 'effect'
  return (
    <div
      className={
        effect
          ? 'mb-1 grid min-w-0 grid-cols-[6.25rem_minmax(0,1fr)] items-center gap-2 border-b border-[var(--crt-bevel)] pb-2 text-[11px] tracking-[0.08em] text-[var(--crt-ink-3)] uppercase'
          : 'grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 text-xs tracking-[0.1em] text-[var(--crt-ink-2)] uppercase'
      }
    >
      <span
        className={
          effect ? 'flex min-w-0 items-center gap-1 overflow-hidden' : 'flex items-center gap-1'
        }
      >
        <label
          className={effect ? 'min-w-0 truncate' : undefined}
          htmlFor={fieldId}
          title={effect ? label : undefined}
        >
          {label}
        </label>
        {effect ? (
          <HelpPopover label={accessibleLabel} text={help} />
        ) : (
          <RackPanelHelp label={accessibleLabel} text={help} />
        )}
      </span>
      <RackSelect
        aria-label={accessibleLabel}
        id={fieldId}
        disabled={disabled}
        className="crt-field h-7 min-w-0 bg-[var(--crt-bg-well)] text-xs text-[var(--crt-ink)] normal-case outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:opacity-50"
        onChange={(event) => onApply(event.target.value as Id)}
        value=""
      >
        <option disabled value="">
          {placeholder}
        </option>
        {options.map(({ id, name }) => (
          <option key={id} value={id}>
            {name}
          </option>
        ))}
      </RackSelect>
    </div>
  )
}
