import { CodeXml, MessageCircleWarning, TriangleAlert } from 'lucide-react'
import { lazy, Suspense, useEffect, useState, type ComponentProps, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { HelpButton } from '@/components/help-button'
import {
  MidiConnectActions,
  MidiConnectionError,
  MidiFirmwareBadge,
  MidiSettingsMenu,
} from '@/components/midi/midi-controls'
import { MidiLogDialog } from '@/components/midi/midi-log-dialog'
import { FxHardwareProbe } from '@/components/midi/fx-hardware-probe'
import type { Fm1VaPresetProbe as PresetProbe } from '@/components/midi/fm1-va-preset-probe'
import { MidiPanicButton } from '@/components/midi/midi-panic-button'
import { PianoKeyboard } from '@/components/midi/piano-keyboard'
import { Dx7BankSourcesDialog } from '@/components/patches/dx7-bank-sources-dialog'
import type { MidiController } from '@/hooks/use-midi'
import { useFm1Colorway } from '@/hooks/use-fm1-colorway'
import { useMediaQuery } from '@/hooks/use-media-query'
import { isUnsupportedBrowser } from '@/lib/browser'
import { fm1ColorwayImages, type Fm1ColorwayImages } from '@/lib/fm1-colorway-images'
import { Fm1ColorwayPicker } from '@/components/ui/fm1-colorway-picker'

// Development builds alone load the preset probe. Importing it statically gave the entry a path
// to the preset read, so the bundler kept that code in the entry once the FM-1+VA import dialog
// used it too.
const Fm1VaPresetProbe = import.meta.env.DEV
  ? lazy(() =>
      import('@/components/midi/fm1-va-preset-probe').then((module) => ({
        default: module.Fm1VaPresetProbe,
      })),
    )
  : null

// The intro marks the words that open the bank sources as <link>…</link>, so each language puts
// the link where its own sentence needs it.
function splitIntroLink(intro: string) {
  const match = /^(.*)<link>(.*)<\/link>(.*)$/s.exec(intro)
  return match
    ? { before: match[1], link: match[2], after: match[3] }
    : { before: intro, link: null, after: '' }
}

type RootLayoutProps = {
  children: ReactNode
  compact?: boolean
  midi: ComponentProps<typeof MidiConnectActions>['midi'] &
    ComponentProps<typeof MidiConnectionError>['midi'] &
    ComponentProps<typeof MidiFirmwareBadge>['midi'] &
    ComponentProps<typeof MidiPanicButton>['midi'] &
    ComponentProps<typeof MidiSettingsMenu>['midi'] &
    ComponentProps<typeof PianoKeyboard>['midi'] &
    ComponentProps<typeof PresetProbe>['midi'] &
    Pick<MidiController, 'logStore' | 'sendEffectDiagnosticControl'>
}

export function RootLayout({ children, compact = false, midi }: RootLayoutProps) {
  const { t } = useTranslation()
  const intro = splitIntroLink(t('root.intro'))
  const unsupportedBrowser = isUnsupportedBrowser()
  const { colorway, setColorway } = useFm1Colorway()
  const showColorwayImage = useMediaQuery('(min-width: 1024px)')
  const showHardwareBay = !compact && showColorwayImage
  const showFm1VaImage = showHardwareBay && midi.firmware.kind === 'fm1-va'
  const [fm1VaColorwayImages, setFm1VaColorwayImages] = useState<Fm1ColorwayImages>()
  const colorwayImage = ((showFm1VaImage && fm1VaColorwayImages) || fm1ColorwayImages)[colorway]

  // Only an FM1 running FM-1+VA loads its photos. They are decorative, so a chunk that fails to
  // load leaves the stock photo showing, and the next identification tries again.
  useEffect(() => {
    if (showFm1VaImage) {
      import('@/lib/fm1-va-colorway-images')
        .then((module) => setFm1VaColorwayImages(module.fm1VaColorwayImages))
        .catch(() => {})
    }
  }, [showFm1VaImage])

  return (
    <main className="synthwave-shell flex min-h-screen flex-col text-foreground">
      <section className="synthwave-header synthwave-hero border-b">
        <div
          className={
            compact
              ? 'mx-auto flex max-w-[90rem] flex-col gap-3 px-4 py-3 sm:px-5 lg:px-8'
              : 'mx-auto flex max-w-7xl flex-col gap-4 px-4 pt-4 pb-3.5 sm:px-5 lg:px-8'
          }
        >
          {/*
           * Masthead grid. The title block and the header controls share the
           * first row; the MIDI actions run underneath both, so the right-hand
           * action lines up with the kebab above it. The hardware bay spans
           * both rows and the spare height falls to the action row, pinning it
           * to the bottom of the bay.
           */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_1fr] gap-x-3 gap-y-2 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div className="flex min-w-0 flex-col gap-[7px]">
              <h1
                data-layout={compact ? 'compact' : 'full'}
                className="synthwave-title min-w-0 items-baseline gap-x-[0.3em] gap-y-[7px]"
              >
                <span className="synthwave-brand-row">M-VAVE</span>
                <span>FM1</span>
                <span className="synthwave-hero-accent">{t('root.subtitle')}</span>
              </h1>
              {!compact ? (
                <div className="hero-supporting-text text-xs leading-5 text-balance">
                  <span>{intro.before}</span>
                  {intro.link ? <Dx7BankSourcesDialog>{intro.link}</Dx7BankSourcesDialog> : null}
                  <span>{intro.after}</span>
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2 self-start">
              <Fm1ColorwayPicker onChange={setColorway} value={colorway} />
              <HelpButton />
              <MidiSettingsMenu midi={midi} />
            </div>

            <div
              className={
                compact
                  ? 'col-span-2 flex flex-wrap items-center gap-2'
                  : 'col-span-2 flex flex-wrap items-center gap-2.5 self-end pt-2'
              }
            >
              <MidiConnectActions midi={midi} />
              {/* On a phone the badge takes the last line, so the MIDI buttons keep one row. */}
              <MidiFirmwareBadge
                className="order-last inline-flex min-h-8 w-full items-center gap-2 sm:order-none sm:w-auto"
                midi={midi}
              />
              <PianoKeyboard midi={midi} />
              <MidiPanicButton midi={midi} />
            </div>

            {showHardwareBay ? (
              // The hardware photo sits in a recessed bay, not a rounded card.
              <figure className="crt-inset col-start-3 row-span-2 row-start-1 hidden w-[250px] self-start bg-[var(--crt-bg-2)] p-1 lg:block">
                <img
                  alt={t('root.synthAlt')}
                  className="aspect-[242/146] h-auto w-full object-contain"
                  decoding="async"
                  height={colorwayImage.height}
                  sizes="242px"
                  src={colorwayImage.src}
                  srcSet={colorwayImage.srcSet}
                  width={colorwayImage.width}
                />
              </figure>
            ) : null}
          </div>

          <MidiConnectionError midi={midi} />
          {unsupportedBrowser ? (
            <div
              className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              role="alert"
            >
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <p>
                <span className="font-semibold">{t('root.unsupportedTitle')}</span>{' '}
                {t('root.unsupportedBody')}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <div className="flex-1">{children}</div>

      <footer className="hero-footer-text synthwave-hero border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs sm:px-5 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span>{t('root.localOnly')}</span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <MidiLogDialog logStore={midi.logStore} />
              <nav
                aria-label={t('root.projectLinks')}
                className="flex flex-wrap items-center gap-x-4 gap-y-2"
              >
                <a
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  href="https://github.com/benny-sparra/fm1-dx7-patch-importer"
                  rel="noreferrer"
                  target="_blank"
                >
                  <CodeXml aria-hidden="true" className="size-3.5" />
                  GitHub
                </a>
                <a
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  href="https://github.com/benny-sparra/fm1-dx7-patch-importer/issues/new"
                  rel="noreferrer"
                  target="_blank"
                >
                  <MessageCircleWarning aria-hidden="true" className="size-3.5" />
                  {t('root.reportIssue')}
                </a>
              </nav>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-white/10 pt-3 text-[0.6875rem] leading-relaxed sm:flex-row sm:items-center sm:justify-between">
            <p>{t('root.disclaimer')}</p>
            {import.meta.env.DEV ? (
              <span className="flex flex-wrap gap-x-4 gap-y-2">
                <FxHardwareProbe send={midi.sendEffectDiagnosticControl} />
                {Fm1VaPresetProbe ? (
                  <Suspense fallback={null}>
                    <Fm1VaPresetProbe midi={midi} />
                  </Suspense>
                ) : null}
              </span>
            ) : null}
          </div>
        </div>
      </footer>
    </main>
  )
}
