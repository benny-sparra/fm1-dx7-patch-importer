import { fm1VaPresetBanks } from '@/lib/fm1-va-preset-file'
import { fm1VaPresetCount } from '@/lib/fm1-va-preset-read'

const presetsPerBank = fm1VaPresetCount / fm1VaPresetBanks.length

/**
 * One LED per preset, a row for each bank, lit as each preset arrives from the FM1, with the next
 * one blinking. The progress bar beside it carries the count for assistive technology.
 */
export function Fm1VaReadLeds({ readCount }: { readCount: number }) {
  return (
    <div aria-hidden="true" className="grid gap-1">
      {fm1VaPresetBanks.map((bank, bankIndex) => (
        <div className="flex items-center gap-1.5" key={bank}>
          <span className="font-vt323 w-2 text-sm leading-none text-[var(--crt-ink-3)]">
            {bank}
          </span>
          <span
            className="grid flex-1 gap-px"
            style={{ gridTemplateColumns: `repeat(${presetsPerBank}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: presetsPerBank }, (_, slot) => {
              const index = bankIndex * presetsPerBank + slot
              return (
                <span
                  className="read-led"
                  data-state={
                    index < readCount ? 'read' : index === readCount ? 'reading' : undefined
                  }
                  key={slot}
                />
              )
            })}
          </span>
        </div>
      ))}
    </div>
  )
}
