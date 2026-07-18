import { motion } from 'motion/react'
import { TriangleAlert } from 'lucide-react'
import { type ReactNode } from 'react'

import fm1HeaderImage from '@/assets/fm1-header.png'
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
import { isChromiumBrowser } from '@/lib/browser'

type RootLayoutProps = {
  children: ReactNode
  midi: MidiController
  theme: {
    theme: ThemePreference
    setTheme: (theme: ThemePreference) => void
  }
}

export function RootLayout({ children, midi, theme }: RootLayoutProps) {
  const isChromium = isChromiumBrowser()

  return (
    <main className="min-h-screen bg-background text-foreground">
      <motion.section
        animate={{ opacity: 1, y: 0 }}
        className="border-b bg-muted/35"
        initial={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6 lg:px-8">
          <div className="grid gap-3 lg:grid-cols-3 lg:items-stretch lg:gap-x-4">
            <div className="flex flex-col lg:col-span-2 lg:pt-2">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                  M-VAVE FM1 patch importer
                </h1>
                <MidiSettingsMenu midi={midi} theme={theme} />
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Use this librarian to import DX7-style patch banks into the FM1.{' '}
                <Dx7BankSourcesDialog /> for a list of sites with banks to download.
              </p>

              <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
                <MidiConnectActions midi={midi} />
                <PianoKeyboardDialog midi={midi} />
                <MidiLogDialog log={midi.log} />
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:col-start-3">
              <motion.figure
                animate={{ opacity: 1, scale: 1 }}
                className="overflow-hidden rounded-lg border border-primary/30 bg-primary shadow-sm"
                initial={{ opacity: 0, scale: 0.985 }}
                transition={{ delay: 0.08, duration: 0.28, ease: 'easeOut' }}
              >
                <img
                  alt="M-VAVE FM1 synthesiser front panel"
                  className="aspect-video h-full w-full object-cover"
                  src={fm1HeaderImage}
                />
              </motion.figure>
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
      </motion.section>

      {children}
    </main>
  )
}
