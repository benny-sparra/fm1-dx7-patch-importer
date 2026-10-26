import {
  ExternalLink,
  HardDriveDownload,
  Keyboard,
  PlugZap,
  Route,
  Send,
  SlidersHorizontal,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

import '@/i18n/help'
import { Button } from '@/components/ui/button'
import { InfoNotice } from '@/components/ui/info-notice'
import type { MidiController } from '@/hooks/use-midi'
import { isUnsupportedBrowser } from '@/lib/browser'
import type { Fm1Colorway } from '@/lib/fm1-colorway'
import { fm1ColorwayImages } from '@/lib/fm1-colorway-images'
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

// The welcome's three steps, one line each, in the order a first visit takes them.
const quickSteps = ['help.quickSteps.connect', 'help.quickSteps.play', 'help.quickSteps.send']

// The guide's steps say a little more, and add the backup the welcome mentions only in passing.
const steps = [
  {
    description: 'help.steps.connectBody',
    icon: PlugZap,
    title: 'help.steps.connectTitle',
  },
  {
    description: 'help.steps.playBody',
    icon: SlidersHorizontal,
    title: 'help.steps.playTitle',
  },
  {
    description: 'help.steps.sendBody',
    icon: Send,
    title: 'help.steps.sendTitle',
  },
  {
    description: 'help.steps.backupBody',
    icon: HardDriveDownload,
    title: 'help.steps.backupTitle',
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
  colorway: Fm1Colorway
  /** Whether the guide opened itself on a first visit, which shows the short welcome first. */
  firstVisit: boolean
  midi: Pick<MidiController, 'firmware'>
  onClose: () => void
}

export function HelpDialog({ colorway, firstVisit, midi, onClose }: HelpDialogProps) {
  const { t } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const onApplePlatform = useMemo(() => isApplePlatform(), [])
  const unsupportedBrowser = useMemo(() => isUnsupportedBrowser(), [])
  const [view, setView] = useState<'guide' | 'welcome'>(firstVisit ? 'welcome' : 'guide')
  const [selectedTab, setSelectedTab] = useState(helpTabs[0].id)
  const tabRefs = useRef(new Map<string, HTMLButtonElement>())
  const focusTabsOnGuide = useRef(false)
  const photo = fm1ColorwayImages[colorway]

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
  // refuses to show a modal, or in a browser without modal dialogs, such as Safari before 15.4;
  // nobody can use the guide there, so it stays closed.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog?.isConnected || dialog.open || typeof dialog.showModal !== 'function') return
    dialog.showModal()
  }, [])

  // Full guide goes with the welcome it sits in, so focus moves to the guide's selected tab.
  useEffect(() => {
    if (view !== 'guide' || !focusTabsOnGuide.current) return
    focusTabsOnGuide.current = false
    tabRefs.current.get(helpTabs[0].id)?.focus()
  }, [view])

  const closeDialog = () => dialogRef.current?.close()

  const unsupportedNotice = unsupportedBrowser ? (
    <InfoNotice>
      <p>
        <strong className="font-bold text-[var(--crt-ink)]">{t('help.unsupportedTitle')}</strong>{' '}
        <span>{t('help.unsupportedBody')}</span>
      </p>
    </InfoNotice>
  ) : null

  return (
    <Dialog
      aria-labelledby="help-dialog-title"
      onClose={() => {
        rememberHelpWasSeen()
        onClose()
      }}
      ref={dialogRef}
      size={view === 'welcome' ? '2xl' : '3xl'}
    >
      <DialogHeader>
        <DialogTitle id="help-dialog-title">
          {t(view === 'welcome' ? 'help.title' : 'help.guideTitle')}
        </DialogTitle>
        <DialogCloseButton label={t('help.close')} onClick={closeDialog} />
      </DialogHeader>
      {/* Keyed, so a page translator's text in one view never meets React removing the other. */}
      {view === 'welcome' ? (
        <Fragment key="welcome">
          <DialogBody>
            <div className="grid gap-4 p-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                {/* The FM1 in the finish the page wears; the sentence beside it names it. */}
                <img
                  alt=""
                  className="h-auto w-[150px] shrink-0"
                  decoding="async"
                  height={photo.height}
                  sizes="150px"
                  src={photo.src}
                  srcSet={photo.srcSet}
                  width={photo.width}
                />
                <p className="min-w-48 flex-1 text-base leading-6 font-bold text-[var(--crt-ink)]">
                  {t('help.lead')}
                </p>
              </div>
              {/* Without Web MIDI nothing reaches the FM1, so the steps give way to where it works. */}
              {unsupportedBrowser ? (
                <>
                  {unsupportedNotice}
                  <p className="text-xs leading-5 text-[var(--crt-ink-3)]">
                    {t('help.stillWorks')}
                  </p>
                </>
              ) : (
                <>
                  <ol className="grid gap-2.5">
                    {quickSteps.map((step, index) => (
                      <li className="flex items-center gap-3" key={step}>
                        <span className="font-vt323 grid min-w-[26px] shrink-0 place-items-center border border-[var(--crt-line)] bg-[var(--crt-bg-well)] px-1.5 pt-1.5 pb-1 text-[18px] leading-none text-[var(--crt-acc-lt)]">
                          {index + 1}
                        </span>
                        <span className="text-sm leading-6 text-[var(--crt-ink-2)]">{t(step)}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="text-xs leading-5 text-[var(--crt-ink-3)]">
                    {t('help.savedInBrowser')}
                  </p>
                </>
              )}
            </div>
          </DialogBody>
          <DialogFooter className="flex-wrap justify-between gap-2">
            <Button
              onClick={() => {
                focusTabsOnGuide.current = true
                setView('guide')
              }}
              type="button"
              variant="ghost"
            >
              {t('help.fullGuide')}
            </Button>
            <Button className="shrink-0" onClick={closeDialog} type="button">
              {t('help.start')}
            </Button>
          </DialogFooter>
        </Fragment>
      ) : (
        <Fragment key="guide">
          <DialogBody>
            <p className="px-4 pt-4 text-sm leading-6 text-[var(--crt-ink-2)]">{t('help.lead')}</p>
            {unsupportedNotice ? <div className="mx-4 mt-4">{unsupportedNotice}</div> : null}

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
                    <span>{t(label)}</span>
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
              {/* Each step is a labelled well: the label sits astride the top border and breaks it,
                  the way a panel legend does. */}
              <ol className="grid gap-x-4 gap-y-5 p-4 pt-5 sm:grid-cols-2">
                {steps.map(({ description, icon: Icon, title }, index) => (
                  <li className="crt-legend-box p-3.5 pt-3" key={title}>
                    <span className="crt-legend font-dot-matrix flex items-center gap-1.5 text-xs font-bold tracking-[0.12em] text-[var(--crt-acc-lt)] uppercase">
                      {index + 1}. <Icon aria-hidden="true" className="size-3.5" />
                      <span>{t(title)}</span>
                    </span>
                    <p className="text-sm leading-6 text-[var(--crt-ink-2)]">{t(description)}</p>
                  </li>
                ))}
              </ol>

              {/* Only an FM1 identified as running FM-1+VA hears about it, as only it gets the
                  header's FM-1+VA photos. */}
              {midi.firmware.kind === 'fm1-va' ? (
                <div className="mx-4 mb-4 border border-[var(--crt-led)] bg-[color-mix(in_srgb,var(--crt-led)_12%,transparent)] px-3.5 py-2.5 text-sm leading-6 text-[var(--crt-ink)] shadow-[0_0_8px_var(--crt-led-glow)]">
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
              ) : null}
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
              {t('help.done')}
            </Button>
          </DialogFooter>
        </Fragment>
      )}
    </Dialog>
  )
}
