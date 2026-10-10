import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

export type PatchEngine = 'eight-bit' | 'fm' | 'virtual-analog'
/** The engine of a preset whose voice bytes are not a DX7 voice. */
export type PresetEngine = Exclude<PatchEngine, 'fm'>

/** The engine's name, for assistive technology and a slot's tooltip. */
export function engineName(t: TFunction, engine: PatchEngine) {
  if (engine === 'fm') return t('banks.fmPatch')
  return engine === 'virtual-analog' ? t('banks.virtualAnalogPatch') : t('banks.eightBitPatch')
}

function engineTag(t: TFunction, engine: PatchEngine) {
  if (engine === 'fm') return t('banks.fmTag')
  return engine === 'virtual-analog' ? t('banks.virtualAnalogTag') : t('banks.eightBitTag')
}

/**
 * Marks a slot's engine between its slot code and its name: FM, VA, or 8B in a small box, the
 * letters stacked so it is one character wide, since a patch card has little room to spare beside
 * a full ten-character name. Lit for Virtual Analogue and 8-Bit and dim for FM, so a bank of FM
 * patches stays quiet. Decorative: the slot names its engine in its text and its tooltip.
 */
export function EngineTag({
  className,
  engine,
}: {
  /**
   * Placement and colour. The default sits the tag in a patch card's row, letting clicks through to
   * the slot's own button, in its engine's colour; with a class name it takes the colour of the text
   * around it.
   */
  className?: string
  engine: PatchEngine
}) {
  const { t } = useTranslation()
  const tag = engineTag(t, engine)

  return (
    <span
      aria-hidden="true"
      className={cn(
        'font-vt323 flex flex-col items-center border px-0.5 py-0.5 text-[11px] leading-[11px]',
        className ??
          cn(
            'pointer-events-none shrink-0',
            engine === 'fm'
              ? 'border-[var(--crt-line)] text-[var(--crt-ink-4)]'
              : 'border-[var(--crt-led)] text-[var(--crt-led)]',
          ),
      )}
      translate="no"
    >
      {Array.from(tag, (letter, index) => (
        <span key={index}>{letter}</span>
      ))}
    </span>
  )
}
