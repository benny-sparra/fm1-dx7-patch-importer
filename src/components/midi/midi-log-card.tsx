import { Check, Clipboard } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { type MidiLogEntry } from '@/lib/midi'

type MidiLogCardProps = {
  log: MidiLogEntry[]
}

export function MidiLogCard({ log }: MidiLogCardProps) {
  const { t } = useTranslation()
  const [selectedEntry, setSelectedEntry] = useState<MidiLogEntry | null>(null)
  const [copied, setCopied] = useState(false)
  const formattedData = useMemo(() => {
    if (!selectedEntry?.data) return ''

    const bytes = Array.from(selectedEntry.data)
    return Array.from({ length: Math.ceil(bytes.length / 16) }, (_, row) =>
      bytes
        .slice(row * 16, row * 16 + 16)
        .map((byte) => byte.toString(16).padStart(2, '0').toUpperCase())
        .join(' '),
    ).join('\n')
  }, [selectedEntry])

  function viewData(entry: MidiLogEntry) {
    setSelectedEntry((current) => (current?.id === entry.id ? null : entry))
    setCopied(false)
  }

  async function copyData() {
    await navigator.clipboard.writeText(formattedData.replaceAll('\n', ' '))
    setCopied(true)
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-foreground">{t('midi.log')}</CardTitle>
        <CardDescription className="font-medium text-foreground">
          {t('midi.recent')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          aria-label={t('midi.entries')}
          className="max-h-[55vh] overflow-y-auto pr-2"
          role="region"
          tabIndex={0}
        >
          <div className="space-y-2">
            {log.map((entry) => (
              <div
                className="grid grid-cols-[54px_1fr] gap-3 rounded-md border bg-background p-3 text-xs text-foreground"
                key={entry.id}
              >
                <span className="font-vt323 font-bold text-foreground">{entry.createdAt}</span>
                <span className="min-w-0 font-medium break-words text-foreground">
                  <Badge
                    className="mr-2 align-middle"
                    variant={
                      entry.direction === 'out'
                        ? 'default'
                        : entry.direction === 'in'
                          ? 'secondary'
                          : 'outline'
                    }
                  >
                    {entry.direction}
                  </Badge>
                  {entry.message}
                  {entry.data ? (
                    <button
                      className="ml-2 font-semibold text-primary underline-offset-4 hover:underline"
                      onClick={() => viewData(entry)}
                      type="button"
                    >
                      {selectedEntry?.id === entry.id ? t('midi.hideData') : t('midi.viewData')}
                    </button>
                  ) : null}
                </span>
                {selectedEntry?.id === entry.id ? (
                  <div className="col-span-2 space-y-3 border-t pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm">
                        <span className="font-semibold">
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
                        {copied ? <Check className="size-4" /> : <Clipboard className="size-4" />}
                        {copied ? t('midi.copied') : t('midi.copyHex')}
                      </Button>
                    </div>
                    <pre className="font-vt323 max-h-[40vh] overflow-auto rounded-lg border bg-muted/40 p-4 text-xs leading-5 whitespace-pre">
                      {formattedData}
                    </pre>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
