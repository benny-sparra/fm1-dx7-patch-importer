import { TriangleAlert } from 'lucide-react'
import { type ReactNode } from 'react'

import fm1HeaderImage from '@/assets/fm1-header.webp'
import mVaveLogo from '@/assets/m-vave-logo.png'
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
import { type ThemePreference } from '@/hooks/use-theme'
import { useFm1Colorway } from '@/hooks/use-fm1-colorway'
import { isChromiumBrowser } from '@/lib/browser'
import { Fm1ColorwayPicker } from '@/components/ui/fm1-colorway-picker'

type RootLayoutProps = {
  children: ReactNode
  compact?: boolean
  midi: MidiController
  theme: {
    theme: ThemePreference
    setTheme: (theme: ThemePreference) => void
  }
}

export function RootLayout({ children, compact = false, midi, theme }: RootLayoutProps) {
  const isChromium = isChromiumBrowser()
  const { colorway, setColorway } = useFm1Colorway()

  return (
    <main className="synthwave-shell min-h-screen text-foreground">
      <section
        className="synthwave-hero border-b"
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
                        ? 'h-4 w-auto shrink-0 mix-blend-screen sm:h-5'
                        : 'h-6 w-auto shrink-0 mix-blend-screen sm:h-7'}
                      height="124"
                      src={mVaveLogo}
                      width="427"
                    />
                  </span>
                  <span>FM1</span>
                  <span className="text-primary">editor &amp; librarian</span>
                </h1>
                <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                  <Fm1ColorwayPicker onChange={setColorway} value={colorway} />
                  <a
                    aria-label="View the FM1 editor and librarian source code on GitHub"
                    className="flex size-10 items-center justify-center rounded-md text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    href="https://github.com/benny-sparra/fm1-dx7-patch-importer"
                    rel="noreferrer"
                    target="_blank"
                    title="View on GitHub"
                  >
                    <svg
                      aria-hidden="true"
                      className="size-7 fill-current"
                      viewBox="0 0 19 19"
                    >
                      <path
                        clipRule="evenodd"
                        d="M9.356 1.85C5.05 1.85 1.57 5.356 1.57 9.694a7.84 7.84 0 0 0 5.324 7.44c.387.079.528-.168.528-.376 0-.182-.013-.805-.013-1.454-2.165.467-2.616-.935-2.616-.935-.349-.91-.864-1.143-.864-1.143-.71-.48.051-.48.051-.48.787.051 1.2.805 1.2.805.695 1.194 1.817.857 2.268.649.064-.507.27-.857.49-1.052-1.728-.182-3.545-.857-3.545-3.87 0-.857.31-1.558.8-2.104-.078-.195-.349-1 .077-2.078 0 0 .657-.208 2.14.805a7.5 7.5 0 0 1 1.946-.26c.657 0 1.328.092 1.946.26 1.483-1.013 2.14-.805 2.14-.805.426 1.078.155 1.883.078 2.078.502.546.799 1.247.799 2.104 0 3.013-1.818 3.675-3.558 3.87.284.247.528.714.528 1.454 0 1.052-.012 1.896-.012 2.156 0 .208.142.455.528.377a7.84 7.84 0 0 0 5.324-7.441c.013-4.338-3.48-7.844-7.773-7.844"
                        fillRule="evenodd"
                      />
                    </svg>
                  </a>
                  <HelpDialog />
                  <MidiSettingsMenu midi={midi} theme={theme} />
                </div>
              </div>
              {!compact ? (
                <p className="mt-3 text-sm leading-6 text-white/65">
                  Edit, organise, audition, and transfer sounds for your FM1. Import
                  standard DX7 SysEx banks when you want to bring in more voices.{' '}
                  <Dx7BankSourcesDialog /> for a list of sites with banks to download.
                </p>
              ) : null}

              <div className={compact ? 'mt-2 flex flex-wrap items-center gap-2' : 'mt-auto flex flex-wrap items-center gap-3 pt-5'}>
                <MidiConnectActions midi={midi} />
                <PianoKeyboardDialog midi={midi} />
                <MidiLogDialog log={midi.log} />
              </div>
            </div>

            <div className={compact ? 'hidden' : 'hidden flex-col gap-3 lg:col-start-3 lg:flex'}>
              <figure
                className="overflow-hidden rounded-lg shadow-[0_10px_28px_hsl(260_70%_5%_/_0.35),0_0_22px_hsl(315_100%_60%_/_0.12)]"
              >
                <img
                  alt="M-VAVE FM1 synthesiser front panel"
                  className="aspect-video h-full w-full object-cover"
                  decoding="async"
                  height="504"
                  src={fm1HeaderImage}
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
                <span className="font-semibold">Unsupported browser.</span>{' '}
                This librarian needs a Chromium-based browser such as Chrome,
                Edge, or Opera for Web MIDI and SysEx support.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {children}
    </main>
  )
}
