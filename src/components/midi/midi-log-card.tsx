import { Check, Clipboard } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { type MidiLogEntry } from '@/lib/midi'

type MidiLogCardProps = {
  log: MidiLogEntry[]
}

export function MidiLogCard({ log }: MidiLogCardProps) {
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
    <Card>
      <CardHeader>
        <CardTitle>MIDI log</CardTitle>
        <CardDescription>Recent browser MIDI activity.</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          aria-label="Recent MIDI log entries"
          className="max-h-[55vh] overflow-y-auto pr-2"
          tabIndex={0}
        >
          <div className="space-y-2">
              {log.map((entry) => (
                <div
                  className="grid grid-cols-[54px_1fr] gap-3 rounded-md border bg-background p-3 text-xs"
                  key={entry.id}
                >
                  <span className="font-mono text-muted-foreground">
                    {entry.createdAt}
                  </span>
                  <span className="min-w-0 break-words">
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
                        {selectedEntry?.id === entry.id ? 'Hide data' : 'View data'}
                      </button>
                    ) : null}
                  </span>
                  {selectedEntry?.id === entry.id ? (
                    <div className="col-span-2 space-y-3 border-t pt-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm">
                          <span className="font-semibold">
                            {entry.data?.length.toLocaleString()}
                          </span>{' '}
                          bytes
                          {entry.data?.[0] === 0xf0
                            ? ' · Complete SysEx message'
                            : ''}
                        </p>
                        <Button
                          onClick={copyData}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          {copied ? (
                            <Check className="size-4" />
                          ) : (
                            <Clipboard className="size-4" />
                          )}
                          {copied ? 'Copied' : 'Copy hex'}
                        </Button>
                      </div>
                      <pre className="max-h-[40vh] overflow-auto whitespace-pre rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-5">
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
