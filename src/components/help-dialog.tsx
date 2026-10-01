import {
  Check,
  ExternalLink,
  Keyboard,
  Library,
  PlugZap,
  Route,
  Send,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { Fragment, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { browserSupport, currentBrowserInTable } from '@/lib/browser-support'
import { rememberHelpWasSeen } from '@/lib/help-seen'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  editorShortcuts,
  formatShortcut,
  isApplePlatform,
  librarianShortcuts,
  type KeyboardShortcut,
} from '@/lib/keyboard-shortcuts'
import { cn } from '@/lib/utils'

// Baud Girl's page for FM-1+VA, the replacement firmware the editor recognises.
const fm1VaUrl = 'https://baudgirl.com/work/FM-1+VA'

const steps = [
  {
    description: 'help.steps.libraryBody',
    icon: Library,
    title: 'help.steps.libraryTitle',
  },
  {
    description: 'help.steps.editBody',
    icon: SlidersHorizontal,
    title: 'help.steps.editTitle',
  },
  {
    description: 'help.steps.connectBody',
    icon: PlugZap,
    title: 'help.steps.connectTitle',
  },
  {
    description: 'help.steps.transferBody',
    icon: Send,
    title: 'help.steps.transferTitle',
  },
]

// The editor rows reuse the labels on the buttons they mirror, so the guide
// cannot drift from the header it is describing.
const shortcutGroups = [
  {
    id: 'banks',
    label: 'help.shortcuts.banks',
    rows: [
      {
        action: 'help.shortcuts.search',
        shortcuts: [librarianShortcuts.search, librarianShortcuts.find],
      },
      { action: 'help.shortcuts.clearSearch', shortcuts: [librarianShortcuts.clearSearch] },
      { action: 'help.shortcuts.openSlot', shortcuts: [librarianShortcuts.openSlot] },
      { action: 'editor.undo', shortcuts: [librarianShortcuts.undo] },
      { action: 'editor.redo', shortcuts: [librarianShortcuts.redo] },
    ],
  },
  {
    id: 'editor',
    label: 'help.shortcuts.editor',
    rows: [
      { action: 'editor.undo', shortcuts: [editorShortcuts.undo] },
      { action: 'editor.redo', shortcuts: [editorShortcuts.redo] },
      { action: 'editor.save', shortcuts: [editorShortcuts.save] },
      { action: 'editor.back', shortcuts: [editorShortcuts.back] },
      { action: 'editor.stopComparing', shortcuts: [editorShortcuts.stopComparing] },
    ],
  },
] satisfies Array<{
  id: string
  label: string
  rows: Array<{ action: string; shortcuts: KeyboardShortcut[] }>
}>

const helpTabs = [
  { icon: Route, id: 'steps', label: 'help.stepsTitle' },
  { icon: Keyboard, id: 'shortcuts', label: 'help.shortcutsTitle' },
]

type HelpDialogProps = {
  onClose: () => void
}

export function HelpDialog({ onClose }: HelpDialogProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const onApplePlatform = useMemo(() => isApplePlatform(), [])
  const currentBrowser = useMemo(() => currentBrowserInTable(), [])
  const browsersTitleId = useId()
  const [selectedTab, setSelectedTab] = useState(helpTabs[0].id)
  const tabRefs = useRef(new Map<string, HTMLButtonElement>())

  const selectTabFromKeyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const count = helpTabs.length
    const nextIndex =
      event.key === 'ArrowRight'
        ? (index + 1) % count
        : event.key === 'ArrowLeft'
          ? (index - 1 + count) % count
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? count - 1
              : null

    if (nextIndex === null) return
    event.preventDefault()
    const nextTab = helpTabs[nextIndex].id
    setSelectedTab(nextTab)
    tabRefs.current.get(nextTab)?.focus()
  }

  // The guide is mounted only once it has been asked for, so it opens as it arrives. A first visit
  // opens it unasked, even on a page something has taken out of the document, where a browser
  // refuses to show a modal; nobody can see that page, so the guide stays closed there.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog?.isConnected || dialog.open) return
    dialog.showModal()
  }, [])

  const closeDialog = () => dialogRef.current?.close()

  return (
    <Dialog
      aria-labelledby="help-dialog-title"
      onClose={() => {
        rememberHelpWasSeen()
        onClose()
      }}
      ref={dialogRef}
      size="3xl"
    >
      <DialogHeader>
        <DialogTitle id="help-dialog-title">{t('help.title')}</DialogTitle>
        <DialogCloseButton label={t('help.close')} onClick={closeDialog} />
      </DialogHeader>
      <DialogBody>
        <div className="mx-4 mt-4 border border-[var(--crt-led)] bg-[color-mix(in_srgb,var(--crt-led)_12%,transparent)] px-3.5 py-2.5 text-sm leading-6 text-[var(--crt-ink)] shadow-[0_0_8px_var(--crt-led-glow)]">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="font-dot-matrix text-xs font-bold tracking-[0.18em] text-[var(--crt-led)] uppercase">
              {t('help.firmwareTitle')}
            </span>
            <a
              className="inline-flex items-center gap-1 text-xs text-[var(--crt-led)] underline underline-offset-2 hover:text-[var(--crt-ink)] focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              href={fm1VaUrl}
              rel="noreferrer"
              target="_blank"
            >
              <span>baudgirl.com</span>
              <ExternalLink aria-hidden="true" className="size-3" />
            </a>
          </div>
          <p>{t('help.firmwareBody')}</p>
        </div>
        <p className="px-4 pt-3 text-sm leading-6 text-[var(--crt-ink-3)]">{t('help.intro')}</p>

        {/*
            The callout and each step are labelled wells: the label sits
            astride the top border and breaks it, the way a panel legend does.
          */}
        <div className="crt-legend-box mx-4 mt-5 p-3.5">
          <span className="crt-legend text-[11px] tracking-[0.18em] text-[var(--crt-led)] uppercase">
            {t('help.truthTitle')}
          </span>
          <span className="block pt-1 text-sm leading-6 text-[var(--crt-ink-2)]">
            {t('help.truthBody')}
          </span>
        </div>

        <div
          aria-label={t('help.sections')}
          className="mt-5 flex gap-1.5 border-b-2 border-[var(--crt-shadow)] px-4"
          role="tablist"
        >
          {helpTabs.map(({ icon: Icon, id, label }, index) => {
            const selected = id === selectedTab
            return (
              <button
                aria-controls={`help-panel-${id}`}
                aria-selected={selected}
                className={cn(
                  'font-dot-matrix -mb-0.5 flex cursor-pointer items-center gap-1.5 border-2 border-b-0 px-3 py-1.5 text-[11px] tracking-[0.14em] uppercase transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--crt-led)]',
                  selected
                    ? 'border-[var(--crt-shadow)] bg-[var(--crt-bg-panel2)] text-[var(--crt-led)]'
                    : 'border-transparent text-[var(--crt-ink-3)] hover:text-[var(--crt-ink-2)]',
                )}
                id={`help-tab-${id}`}
                key={id}
                onClick={() => setSelectedTab(id)}
                onKeyDown={(event) => selectTabFromKeyboard(event, index)}
                ref={(button) => {
                  if (button) tabRefs.current.set(id, button)
                  else tabRefs.current.delete(id)
                }}
                role="tab"
                tabIndex={selected ? 0 : -1}
                type="button"
              >
                <Icon aria-hidden="true" className="size-3.5" />
                {t(label)}
              </button>
            )
          })}
        </div>

        <div
          aria-labelledby="help-tab-steps"
          hidden={selectedTab !== 'steps'}
          id="help-panel-steps"
          role="tabpanel"
        >
          <ol className="grid gap-x-4 gap-y-5 p-4 pt-5 sm:grid-cols-2">
            {steps.map(({ description, icon: Icon, title }, index) => (
              <li className="crt-legend-box p-3.5 pt-3" key={title}>
                <span className="crt-legend font-dot-matrix flex items-center gap-1.5 text-xs font-bold tracking-[0.12em] text-[var(--crt-acc-lt)] uppercase">
                  {index + 1}. <Icon aria-hidden="true" className="size-3.5" />
                  {t(title)}
                </span>
                <p className="text-sm leading-6 text-[var(--crt-ink-2)]">{t(description)}</p>
              </li>
            ))}
          </ol>

          <div className="crt-legend-box mx-4 mb-4 p-3.5 pt-3">
            <span
              className="crt-legend font-dot-matrix text-xs font-bold tracking-[0.12em] text-[var(--crt-acc-lt)] uppercase"
              id={browsersTitleId}
            >
              {t('help.browsers.title')}
            </span>
            <ul aria-labelledby={browsersTitleId} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {browserSupport.map((browser) => {
                const { drivesFm1, id, name } = browser
                const StatusIcon = drivesFm1 ? Check : X
                const isCurrent = id === currentBrowser
                // The browser in use glows rather than carrying a visible label, since people
                // know their browser's name; a screen reader still hears which one it is.
                return (
                  <li
                    className={cn(
                      'flex flex-col items-center gap-1 bg-[var(--crt-bg-well)] px-2 py-2.5 text-center',
                      isCurrent
                        ? 'border border-[var(--crt-led)] shadow-[0_0_8px_var(--crt-led-glow)]'
                        : 'crt-inset',
                    )}
                    key={id}
                  >
                    <span
                      className={cn(
                        'font-vt323 text-xl leading-6',
                        isCurrent
                          ? 'text-[var(--crt-led)] [text-shadow:0_0_8px_var(--crt-led-glow)]'
                          : 'text-[var(--crt-ink)]',
                      )}
                    >
                      {name}
                    </span>
                    {isCurrent ? <span className="sr-only">{t('help.browsers.yours')}</span> : null}
                    <span
                      className={cn(
                        'font-dot-matrix flex items-center justify-center gap-1 text-[11px] tracking-[0.12em] uppercase',
                        drivesFm1 ? 'text-[var(--crt-led)]' : 'text-destructive',
                      )}
                    >
                      <StatusIcon aria-hidden="true" className="size-3.5" />
                      <span>
                        {t(drivesFm1 ? 'help.browsers.works' : 'help.browsers.unsupported')}
                      </span>
                    </span>
                    {'where' in browser ? (
                      <span className="text-xs leading-4 text-[var(--crt-ink-3)]">
                        {t(`help.browsers.${browser.where}`)}
                      </span>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <div
          aria-labelledby="help-tab-shortcuts"
          hidden={selectedTab !== 'shortcuts'}
          id="help-panel-shortcuts"
          role="tabpanel"
        >
          <div className="grid gap-x-4 gap-y-5 p-4 pt-5 sm:grid-cols-2">
            {shortcutGroups.map(({ id, label, rows }) => (
              <div className="crt-legend-box p-3.5 pt-3" key={id}>
                <span className="crt-legend font-dot-matrix text-xs font-bold tracking-[0.12em] text-[var(--crt-acc-lt)] uppercase">
                  {t(label)}
                </span>
                <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1.5">
                  {rows.map(({ action, shortcuts }) => (
                    <Fragment key={`${id}-${action}`}>
                      <dt className="flex flex-wrap items-baseline gap-1">
                        {shortcuts.map((shortcut) => (
                          <kbd
                            className="crt-inset font-vt323 inline-block min-w-8 bg-[var(--crt-bg-well)] px-1.5 text-center text-[15px] leading-5 text-[var(--crt-led)]"
                            key={formatShortcut(shortcut, onApplePlatform)}
                          >
                            {formatShortcut(shortcut, onApplePlatform)}
                          </kbd>
                        ))}
                      </dt>
                      <dd className="text-sm leading-5 text-[var(--crt-ink-2)]">{t(action)}</dd>
                    </Fragment>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button className="shrink-0" onClick={closeDialog} type="button">
          {t('help.start')}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
