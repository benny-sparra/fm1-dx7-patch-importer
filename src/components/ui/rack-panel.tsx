import { ChevronDown, ChevronUp } from 'lucide-react'
import type { ComponentProps, ComponentType, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Switch } from '@/components/ui/switch'

/**
 * The bevelled title strip, minimise control, and folding body that the editor's rack panels and
 * the import dialogs' bank sections share.
 */

/**
 * The title strip every rack panel wears: a hatched bar carrying the panel's
 * name in the dot-matrix face, with room on the right for a panel action.
 */
export function RackPanelTitle({
  action,
  headingLevel = 2,
  help,
  icon: Icon,
  id,
  title,
  titleSwitch,
}: {
  action?: ReactNode
  /** The title's heading level: 2 on the editor's rack, deeper inside a dialog's own sections. */
  headingLevel?: 2 | 3 | 4
  /**
   * A help button beside the title, such as the editor's `RackPanelHelp`. It is passed in rather
   * than built here, so the import dialogs that share this strip do not load the help popover.
   */
  help?: ReactNode
  /** A Lucide icon, or a drawing of its size and stroke where Lucide has none to fit. */
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: 'true' }>
  id?: string
  title: string
  /**
   * Makes the title the label of an on/off switch at its left, such as "Import FM1 bank A" in the
   * FM-1+VA dialogs. The switch sits above the minimise control's overlay, so clicking the title
   * switches it and the rest of the strip folds the panel. The title lights while it is on, and
   * is set smaller on a phone so the bank letter at its end still fits.
   */
  titleSwitch?: Omit<ComponentProps<typeof Switch>, 'children' | 'className'>
}) {
  const Heading = `h${headingLevel}` as const
  return (
    <div className="crt-hatch relative flex min-h-8 items-center justify-between gap-3 border-b border-[var(--crt-shadow)] px-[9px] py-1.5">
      <Heading
        className="font-dot-matrix flex min-w-0 items-center gap-2 text-[13px] font-bold tracking-[0.14em] text-[var(--crt-acc-lt)] uppercase"
        id={id}
      >
        {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0" /> : null}
        {titleSwitch ? (
          <Switch
            {...titleSwitch}
            className="relative z-10 -ml-[5px] inline-flex min-h-6 min-w-0 items-center gap-2 px-1 text-[11px] tracking-[0.06em] transition-colors sm:text-[13px] sm:tracking-[0.14em]"
          >
            <span className="truncate">{title}</span>
          </Switch>
        ) : (
          <span className="truncate">{title}</span>
        )}
        {help}
      </Heading>
      {action}
    </div>
  )
}

/**
 * The minimise control a rack panel wears at the right of its title strip.
 * Its hit area stretches over the whole strip, so clicking anywhere on the
 * title folds the panel; the help button sits above that overlay.
 * Collapsing keeps the title visible so the rack still reads as a stack.
 */
export function RackPanelCollapseToggle({
  collapsed,
  controls,
  onToggle,
  panel,
}: {
  collapsed: boolean
  controls: string
  onToggle: () => void
  panel: string
}) {
  const { t } = useTranslation()
  const label = collapsed
    ? t('editor.expandPanel', { panel })
    : t('editor.minimisePanel', { panel })
  const Icon = collapsed ? ChevronDown : ChevronUp

  return (
    <button
      aria-controls={controls}
      aria-expanded={!collapsed}
      className="flex size-6 shrink-0 cursor-pointer items-center justify-center text-[var(--crt-ink-3)] transition-colors outline-none after:absolute after:inset-0 after:content-[''] hover:text-[var(--crt-acc-lt)] focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-[var(--crt-acc-lt)]"
      onClick={onToggle}
      title={label}
      type="button"
    >
      <span className="sr-only">{label}</span>
      <Icon aria-hidden="true" className="size-4" />
    </button>
  )
}

/**
 * A rack panel's body, folded away by its title strip's minimise control.
 * Visibility is set inline so the collapsed controls leave the accessibility
 * tree; the stylesheet delays that flip until the fold animation has run.
 */
export function RackPanelCollapsibleBody({
  children,
  collapsed,
  id,
  overflowWhenOpen = false,
}: {
  children: ReactNode
  collapsed: boolean
  id: string
  /** Lets a dropdown inside hang out below the panel while it is open, as the Knobs panel's do. */
  overflowWhenOpen?: boolean
}) {
  return (
    <div
      className="rack-collapsible"
      data-collapsed={collapsed}
      data-overflow={overflowWhenOpen ? 'open' : undefined}
      id={id}
    >
      <div style={{ visibility: collapsed ? 'hidden' : undefined }}>{children}</div>
    </div>
  )
}
