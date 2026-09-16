import { lazy, Suspense, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { type MidiController } from '@/hooks/use-midi'

// The keyboard body loads when it is first opened; the trigger stays in the initial bundle.
const PianoKeyboardDialog = lazy(() =>
  import('@/components/midi/piano-keyboard-dialog').then((module) => ({
    default: module.PianoKeyboardDialog,
  })),
)

function PianoKeysIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <rect height="16" rx="2" width="18" x="3" y="4" />
      <path d="M9 13v7M15 13v7" />
      <rect fill="currentColor" height="9" rx="1" stroke="none" width="4" x="7" y="4" />
      <rect fill="currentColor" height="9" rx="1" stroke="none" width="4" x="13" y="4" />
    </svg>
  )
}

type PianoKeyboardProps = {
  midi: MidiController
}

export function PianoKeyboard({ midi }: PianoKeyboardProps) {
  const { t } = useTranslation()
  const triggerRef = useRef<HTMLButtonElement>(null)
  // Once requested, the dialog stays mounted so its octave survives closing and reopening.
  const [requested, setRequested] = useState(false)
  const [open, setOpen] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  return (
    <>
      <Button
        className="font-vt323 ml-auto"
        disabled={!midi.hasMidiOutput}
        onClick={() => {
          setLoadFailed(false)
          setRequested(true)
          setOpen(true)
        }}
        ref={triggerRef}
        title={
          !midi.midiAccess
            ? t('midi.switchOnFirst')
            : !midi.hasMidiOutput
              ? t('midi.chooseOutput')
              : undefined
        }
        type="button"
        variant="secondary"
      >
        <PianoKeysIcon />
        {t('ui.keyboard')}
      </Button>
      {loadFailed ? (
        <p className="text-sm text-destructive" role="alert">
          {t('ui.keyboardOpenFailed')}
        </p>
      ) : null}
      {requested ? (
        <ErrorBoundary
          onError={() => {
            setRequested(false)
            setOpen(false)
            setLoadFailed(true)
          }}
        >
          <Suspense fallback={null}>
            <PianoKeyboardDialog
              midi={midi}
              onClose={() => setOpen(false)}
              open={open}
              triggerRef={triggerRef}
            />
          </Suspense>
        </ErrorBoundary>
      ) : null}
    </>
  )
}
