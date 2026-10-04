import { ChevronDown } from 'lucide-react'
import type { ComponentProps } from 'react'

/**
 * A dialog's dropdown: the sunken settings field with the app's own chevron in place of the
 * native arrow. `className` sizes and places it, as `block min-w-0` does by default; the field
 * fills it. A placeholder option, such as "Select a patch bank…", is disabled so it cannot be
 * chosen again.
 */
export function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <span className={`relative ${className ?? 'block min-w-0'}`}>
      <select
        {...props}
        className="settings-option-select h-9 w-full min-w-0 appearance-none truncate rounded-md border py-0 pr-8 pl-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </span>
  )
}
