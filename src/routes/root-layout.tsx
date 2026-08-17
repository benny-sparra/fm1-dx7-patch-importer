import { CodeXml, MessageCircleWarning, TriangleAlert } from 'lucide-react'
import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import mVaveLogo from '@/assets/m-vave-logo.svg'
import { HelpDialog } from '@/components/help-dialog'
import {
  MidiConnectActions,
  MidiConnectionError,
  MidiSettingsMenu,
} from '@/components/midi/midi-controls'
import { MidiLogDialog } from '@/components/midi/midi-log-dialog'
import { PianoKeyboardDialog } from '@/components/midi/piano-keyboard-dialog'
import { Dx7BankSourcesDialog } from '@/components/patches/dx7-bank-sources-dialog'
import { type MidiController } from '@/hooks/use-midi'
import { useFm1Colorway } from '@/hooks/use-fm1-colorway'
import { isChromiumBrowser } from '@/lib/browser'
import { fm1ColorwayImages } from '@/lib/fm1-colorway-images'
import { Fm1ColorwayPicker } from '@/components/ui/fm1-colorway-picker'

type RootLayoutProps = {
  children: ReactNode
  compact?: boolean
  midi: MidiController
}

export function RootLayout({ children, compact = false, midi }: RootLayoutProps) {
  const { t } = useTranslation()
  const isChromium = isChromiumBrowser()
  const { colorway, setColorway } = useFm1Colorway()

  return (
    <main className="synthwave-shell flex min-h-screen flex-col text-foreground">
      <section
        className="synthwave-header synthwave-hero border-b"
      >
        <div className={compact
          ? 'mx-auto flex max-w-[90rem] flex-col gap-3 px-4 py-3 sm:px-5 lg:px-8'
          : 'mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-5 lg:px-8'}
        >
          <div className="grid gap-3 lg:grid-cols-3 lg:items-stretch lg:gap-x-4">
            <div className={compact ? 'flex flex-col lg:col-span-3' : 'flex flex-col lg:col-span-2 lg:pt-2'}>
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <h1 className={compact
                  ? 'synthwave-title flex min-w-0 flex-wrap items-baseline gap-x-2 text-xl font-bold leading-tight tracking-tight sm:text-2xl'
                  : 'synthwave-title flex min-w-0 flex-wrap items-baseline gap-x-3 text-4xl font-bold leading-tight tracking-tight sm:text-5xl'}
                >
                  <span className="flex basis-full">
                    <img
                      alt="M-VAVE"
                      className={compact
                        ? 'h-2.5 w-auto shrink-0 mix-blend-screen sm:h-3.5'
                        : 'h-4 w-auto shrink-0 mix-blend-screen sm:h-[1.125rem]'}
                      height="124"
                      src={mVaveLogo}
                      width="405"
                    />
                  </span>
                  <span>FM1</span>
                  <span className="synthwave-hero-accent">{t('root.subtitle')}</span>
                </h1>
                <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                  <Fm1ColorwayPicker onChange={setColorway} value={colorway} />
                  <HelpDialog />
                  <MidiSettingsMenu midi={midi} />
                </div>
              </div>
              {!compact ? (
                <div className="font-vt323 mt-3 text-lg leading-6 text-white/65">
                  {t('root.intro')}{' '}<Dx7BankSourcesDialog />
                </div>
              ) : null}

              <div className={compact ? 'mt-2 flex flex-wrap items-center gap-2' : 'mt-auto flex flex-wrap items-center gap-3 pt-5'}>
                <MidiConnectActions midi={midi} />
                <PianoKeyboardDialog midi={midi} />
                <MidiLogDialog logStore={midi.logStore} />
              </div>
            </div>

            <div className={compact ? 'hidden' : 'hidden flex-col gap-3 lg:col-start-3 lg:flex'}>
              <figure
                className="overflow-hidden rounded-[1.5rem] shadow-[0_10px_28px_hsl(260_70%_5%_/_0.35),0_0_22px_hsl(315_100%_60%_/_0.12)]"
              >
                <img
                  alt={t('root.synthAlt')}
                  className="aspect-video h-full w-full object-cover"
                  decoding="async"
                  height="504"
                  src={fm1ColorwayImages[colorway]}
                  width="844"
                />
              </figure>
            </div>
          </div>

          <MidiConnectionError midi={midi} />
          {!isChromium ? (
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

      <footer className="synthwave-hero border-t border-white/10 text-white/65">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs sm:px-5 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span>{t('root.localOnly')}</span>
              <span aria-hidden="true" className="text-white/25">•</span>
              <span>{t('root.requires')}</span>
            </div>

            <nav aria-label={t('root.projectLinks')} className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <a
                className="inline-flex items-center gap-1.5 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href="https://github.com/benny-sparra/fm1-dx7-patch-importer"
                rel="noreferrer"
                target="_blank"
              >
                <CodeXml aria-hidden="true" className="size-3.5" />
                GitHub
              </a>
              <a
                className="inline-flex items-center gap-1.5 transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                href="https://github.com/benny-sparra/fm1-dx7-patch-importer/issues/new"
                rel="noreferrer"
                target="_blank"
              >
                <MessageCircleWarning aria-hidden="true" className="size-3.5" />
                {t('root.reportIssue')}
              </a>
            </nav>
          </div>

          <p className="border-t border-white/10 pt-3 text-[0.6875rem] leading-relaxed">
            {t('root.disclaimer')}
          </p>
        </div>
      </footer>
    </main>
  )
}
