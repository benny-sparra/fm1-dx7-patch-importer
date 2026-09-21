import { Check, Clipboard } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import type { MidiLogEntry } from '@/lib/midi'
import { formatMidiHexRows } from '@/lib/midi-log-file'
import { cn } from '@/lib/utils'

type MidiLogCardProps = {
  log: MidiLogEntry[]
}

const directionTagStyles = {
  in: 'border-[var(--crt-led)] text-[var(--crt-led)]',
  out: 'border-[var(--crt-acc-lt)] text-[var(--crt-acc-lt)]',
  system: 'border-[var(--crt-line-lt)] text-[var(--crt-ink-3)]',
} as const

/**
 * The log's entries, laid out to sit inside a `DialogBody` well as a
 * labelled well like the help guide's steps.
 */
export function MidiLogCard({ log }: MidiLogCardProps) {
  const { i18n, t } = useTranslation()
  const timeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.resolvedLanguage, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    [i18n.resolvedLanguage],
  )
  const [selectedEntry, setSelectedEntry] = useState<MidiLogEntry | null>(null)
  const [copyStatus, setCopyStatus] = useState<'copied' | 'idle' | 'unavailable'>('idle')
  const formattedData = useMemo(
    () => (selectedEntry?.data ? formatMidiHexRows(selectedEntry.data) : ''),
    [selectedEntry],
  )

  function viewData(entry: MidiLogEntry) {
    setSelectedEntry((current) => (current?.id === entry.id ? null : entry))
    setCopyStatus('idle')
  }

  async function copyData() {
    try {
      if (typeof navigator.clipboard?.writeText !== 'function') {
        throw new Error('The Clipboard API is unavailable.')
      }
      await navigator.clipboard.writeText(formattedData.replaceAll('\n', ' '))
      setCopyStatus('copied')
    } catch {
      setCopyStatus('unavailable')
    }
  }

  return (
    <div className="crt-legend-box m-4 mt-5 px-3.5 pt-3 pb-1.5">
      <span className="crt-legend font-dot-matrix text-xs font-bold tracking-[0.12em] text-[var(--crt-acc-lt)] uppercase">
        {t('midi.entries')}
      </span>
      <div
        aria-label={t('midi.entries')}
        className="max-h-[55vh] overflow-y-auto pr-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--crt-acc-lt)]"
        role="region"
        tabIndex={0}
      >
        <ol className="divide-y divide-dashed divide-[var(--crt-line)]">
          {log.map((entry) => (
            <li
              className="grid grid-cols-[auto_1fr] gap-x-3 py-2 text-sm leading-6 text-[var(--crt-ink-2)]"
              key={entry.id}
            >
              <span className="font-vt323 text-base text-[var(--crt-led)]">
                {timeFormat.format(entry.createdAt)}
              </span>
              <span className="min-w-0 break-words">
                <span
                  className={cn(
                    'mr-2 inline-block border px-1.5 align-[1px] text-[11px] leading-4 tracking-[0.12em] uppercase',
                    directionTagStyles[entry.direction],
                  )}
                >
                  {entry.direction}
                </span>
                {entry.message}
                {entry.data ? (
                  <button
                    className="ml-2 font-semibold text-[var(--crt-acc-lt)] underline-offset-4 hover:underline"
                    onClick={() => viewData(entry)}
                    type="button"
                  >
                    {selectedEntry?.id === entry.id ? t('midi.hideData') : t('midi.viewData')}
                  </button>
                ) : null}
              </span>
              {selectedEntry?.id === entry.id ? (
                <div className="col-span-2 mt-2 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-[var(--crt-ink-3)]">
                      <span className="font-semibold text-[var(--crt-ink-2)]">
                        {t('midi.bytes', { count: entry.data?.length ?? 0 })}
                      </span>
                      {entry.data?.[0] === 0xf0 ? ` · ${t('midi.completeSysex')}` : ''}
                    </p>
                    <Button
                      onClick={() => void copyData()}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {copyStatus === 'copied' ? (
                        <Check className="size-4" />
                      ) : (
                        <Clipboard className="size-4" />
                      )}
                      {/* A page translator replaces bare text nodes, so the label keeps its own
                          element for the icon swap to be inserted before. */}
                      <span>
                        {copyStatus === 'copied'
                          ? t('midi.copied')
                          : copyStatus === 'unavailable'
                            ? t('midi.copyUnavailable')
                            : t('midi.copyHex')}
                      </span>
                    </Button>
                  </div>
                  <pre className="font-vt323 max-h-[40vh] overflow-auto border border-[var(--crt-line)] bg-[var(--crt-bg-well)] p-3 text-base leading-5 whitespace-pre text-[var(--crt-ink-2)]">
                    {formattedData}
                  </pre>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
