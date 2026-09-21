import { CodeXml, MessageCircleWarning, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { HelpDialog } from '@/components/help-dialog'
import {
  MidiConnectActions,
  MidiConnectionError,
  MidiSettingsMenu,
} from '@/components/midi/midi-controls'
import { MidiLogDialog } from '@/components/midi/midi-log-dialog'
import { FxHardwareProbe } from '@/components/midi/fx-hardware-probe'
import { PianoKeyboard } from '@/components/midi/piano-keyboard'
import { Dx7BankSourcesDialog } from '@/components/patches/dx7-bank-sources-dialog'
import type { MidiController } from '@/hooks/use-midi'
import { useFm1Colorway } from '@/hooks/use-fm1-colorway'
import { useMediaQuery } from '@/hooks/use-media-query'
import { isUnsupportedBrowser } from '@/lib/browser'
import { fm1ColorwayImages } from '@/lib/fm1-colorway-images'
import { Fm1ColorwayPicker } from '@/components/ui/fm1-colorway-picker'

type RootLayoutProps = {
  children: ReactNode
  compact?: boolean
  midi: MidiController
}

export function RootLayout({ children, compact = false, midi }: RootLayoutProps) {
  const { t } = useTranslation()
  const unsupportedBrowser = isUnsupportedBrowser()
  const { colorway, setColorway } = useFm1Colorway()
  const showColorwayImage = useMediaQuery('(min-width: 1024px)')
  const colorwayImage = fm1ColorwayImages[colorway]

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
                <div className="hero-supporting-text text-xs leading-5">
                  {t('root.intro')} <Dx7BankSourcesDialog />
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2 self-start">
              <Fm1ColorwayPicker onChange={setColorway} value={colorway} />
              <HelpDialog />
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
              <PianoKeyboard midi={midi} />
            </div>

            {!compact && showColorwayImage ? (
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
              <FxHardwareProbe send={midi.sendEffectDiagnosticControl} />
            ) : null}
          </div>
        </div>
      </footer>
    </main>
  )
}
