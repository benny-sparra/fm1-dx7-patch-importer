import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import type { Dx7Voice } from '@/lib/dx7'
import { cn } from '@/lib/utils'

// Enough names to recognise a bank by, on one line at the narrowest dialog.
const namesShown = 4

type FileBankPickerProps = {
  /** Each bank in the file in order, with null for a damaged one. */
  banks: (Dx7Voice[] | null)[]
  chosen: number
  disabled?: boolean
  onChoose: (index: number) => void
}

/** Chooses one bank from a file that joins several, each shown by its first patch names. */
export function FileBankPicker({ banks, chosen, disabled = false, onChoose }: FileBankPickerProps) {
  const { i18n, t } = useTranslation()
  const name = useId()
  const numberFormat = new Intl.NumberFormat(i18n.resolvedLanguage)
  const damagedCount = banks.filter((voices) => voices === null).length

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-semibold">{t('bankFile.legend')}</legend>
      <p className="flex flex-wrap gap-x-1 text-xs text-[var(--crt-ink-3)]">
        <span>{t('bankFile.help', { count: banks.length })}</span>
        {damagedCount > 0 ? (
          <span>{t('bankFile.damagedBanks', { count: damagedCount })}</span>
        ) : null}
      </p>
      <ul className="grid max-h-60 gap-1 overflow-y-auto">
        {banks.map((voices, index) => {
          const bank = t('bankFile.bank', { number: numberFormat.format(index + 1) })
          const contents =
            voices === null
              ? t('bankFile.damaged')
              : `${voices
                  .slice(0, namesShown)
                  .map((voice) => voice.name.trim())
                  .join(', ')}…`
          return (
            <li key={index}>
              <label
                className={cn(
                  'flex min-h-9 items-center gap-2 border px-2 py-1 text-sm',
                  voices === null
                    ? 'cursor-not-allowed border-dashed border-[var(--crt-line)] text-[var(--crt-ink-3)]'
                    : index === chosen
                      ? 'cursor-pointer border-[var(--crt-acc)] bg-[var(--crt-sel-bg)]'
                      : 'cursor-pointer border-[var(--crt-line)] bg-[var(--crt-bg-panel3)] hover:bg-[var(--crt-bg-head)]',
                )}
              >
                <input
                  aria-label={t('bankFile.option', { bank, contents })}
                  checked={index === chosen}
                  className="size-4 shrink-0 accent-[var(--crt-acc)]"
                  disabled={disabled || voices === null}
                  name={name}
                  onChange={() => onChoose(index)}
                  type="radio"
                />
                <span className="shrink-0 font-semibold">{bank}</span>
                <span className="font-dot-matrix min-w-0 truncate text-[13px]">{contents}</span>
              </label>
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}

/** The bank a file's picker starts on: its first that can be read. */
export function firstReadableBank(banks: (Dx7Voice[] | null)[]) {
  return banks.findIndex((voices) => voices !== null)
}
