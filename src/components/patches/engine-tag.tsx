import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

export type PatchEngine = 'fm' | 'virtual-analog'

/**
 * Marks a slot's engine between its slot code and its name: FM or VA in a small box, the letters
 * stacked so it is one character wide, since a patch card has little room to spare beside a full
 * ten-character name. Lit for Virtual Analogue and dim for FM, so a bank of FM patches stays quiet.
 * Decorative: the slot names its engine in its text and its tooltip.
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
  const tag = engine === 'fm' ? t('banks.fmTag') : t('banks.virtualAnalogTag')

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
