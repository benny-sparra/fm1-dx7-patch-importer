import { useTranslation } from 'react-i18next'

import { PIANO_KEY_WIDTH, type PianoKey } from '@/lib/piano-keyboard'
import { cn } from '@/lib/utils'

type PianoKeyButtonProps = {
  isActive: boolean
  noteKey: PianoKey
  onStart: (key: PianoKey) => void
  onStop: (note: number) => void
}

export function PianoKeyButton({ isActive, noteKey, onStart, onStop }: PianoKeyButtonProps) {
  const { t } = useTranslation()
  const isBlack = noteKey.kind === 'black'

  return (
    <button
      aria-label={t('ui.playNote', { note: noteKey.label })}
      className={cn(
        'touch-none border font-semibold transition-[background,box-shadow,transform,color] duration-100 select-none focus-visible:ring-2 focus-visible:ring-[var(--fm1-accent)] focus-visible:outline-none',
        isBlack
          ? 'synthwave-piano-key-black absolute top-2 z-10 flex h-32 w-9 items-end justify-center rounded-b-[0.45rem] pb-3 text-[0.7rem] text-white'
          : 'synthwave-piano-key-white relative flex h-52 items-end justify-center rounded-b-[0.5rem] pb-4 text-xs text-[#25213c]',
        isActive &&
          (isBlack ? 'synthwave-piano-key-black-active' : 'synthwave-piano-key-white-active'),
      )}
      onKeyDown={(event) => {
        if (!event.repeat && (event.key === 'Enter' || event.key === ' ')) onStart(noteKey)
      }}
      onKeyUp={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onStop(noteKey.note)
      }}
      onPointerCancel={() => onStop(noteKey.note)}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        onStart(noteKey)
      }}
      onPointerLeave={() => onStop(noteKey.note)}
      onPointerUp={() => onStop(noteKey.note)}
      style={
        isBlack
          ? { left: `${(noteKey.position ?? 0) * PIANO_KEY_WIDTH + PIANO_KEY_WIDTH - 10}px` }
          : undefined
      }
      type="button"
    >
      <span className="flex flex-col items-center gap-1">
        {noteKey.computerKey ? (
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-[0.65rem] uppercase',
              isBlack ? 'bg-white/15 text-white' : 'bg-violet-950/10 text-violet-950/80',
            )}
          >
            {noteKey.computerKey}
          </span>
        ) : null}
        <span>{noteKey.label}</span>
      </span>
    </button>
  )
}
