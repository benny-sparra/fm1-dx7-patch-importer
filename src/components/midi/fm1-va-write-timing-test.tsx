import { Copy } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { ErrorNotice } from '@/components/ui/error-notice'
import { useFm1VaPresetReader } from '@/hooks/use-fm1-va-preset-reader'
import { useFm1VaPresetWriter } from '@/hooks/use-fm1-va-preset-writer'
import { fm1VaPresetCount, fm1VaPresetNumber } from '@/lib/fm1-va-preset-read'
import {
  fm1VaWriteTimings,
  runFm1VaWriteTiming,
  type Fm1VaWriteTiming,
  type Fm1VaWriteTimingResult,
} from '@/lib/fm1-va-write-timing'

type Fm1VaWriteTimingTestProps = {
  firmware: string
  midi: Parameters<typeof useFm1VaPresetReader>[0] & Parameters<typeof useFm1VaPresetWriter>[0]
}

type Crackle = 'heard' | 'none' | 'unnoted'

const crackleChoices: { label: string; value: Crackle }[] = [
  { label: 'Not noted', value: 'unnoted' },
  { label: 'None heard', value: 'none' },
  { label: 'Heard crackle', value: 'heard' },
]

/** A finished run, kept for the ledger with what was heard during it. */
type Run = {
  crackle: Crackle
  failure?: string
  firstSlot: number
  presets: number
  results: Fm1VaWriteTimingResult[]
  timing: Fm1VaWriteTiming
}

type Progress = { done: number; stage: 'reading' | 'writing'; total: number }

function seconds(ms: number) {
  return `${(ms / 1000).toFixed(2)} s`
}

/** How a run ended, in a few words. */
function outcome({ failure, presets, results }: Run) {
  const mismatch = results.find(({ matches }) => !matches)
  if (mismatch) return `Stopped: ${fm1VaPresetNumber(mismatch.slot)} did not read back as written`
  if (failure) return `Failed: ${failure}`
  if (results.length < presets) return `Stopped after ${results.length} of ${presets}`
  return `All ${presets} landed`
}

/** The average time from one write to the next, over the whole run. */
function perPreset({ results }: Run) {
  const last = results.at(-1)
  return last ? seconds((last.sentAtMs + last.readBackMs) / results.length) : '—'
}

/**
 * Development only. Writes a run of stored presets back to the FM1 exactly as read, at one of the
 * timings `docs/fm1-va-096-tests.md` §6 names, to find how closely FM-1+VA's preset writes can
 * follow each other. Each preset is read first and read back after its write, and a run stops at
 * the first that does not read back the same. Each finished run is logged with whether crackle was
 * heard, and the log copies as JSON for the ledger.
 */
export function Fm1VaWriteTimingTest({ firmware, midi }: Fm1VaWriteTimingTestProps) {
  const [first, setFirst] = useState('97')
  const [count, setCount] = useState('16')
  const [timingId, setTimingId] = useState(fm1VaWriteTimings[0].id)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [runs, setRuns] = useState<Run[]>([])
  const [failure, setFailure] = useState<string | null>(null)
  const run = useRef<AbortController | null>(null)
  const ids = { count: useId(), first: useId(), heading: useId(), timing: useId() }
  const timing = fm1VaWriteTimings.find(({ id }) => id === timingId) ?? fm1VaWriteTimings[0]
  const { canRead, readPreset } = useFm1VaPresetReader(midi)
  // The test waits its own gap, so the writer adds no spacing of its own.
  const { canWrite, writePreset } = useFm1VaPresetWriter(midi, {
    listenMs: timing.listenMs,
    spacingMs: 0,
  })

  useEffect(() => () => run.current?.abort(), [])

  const firstSlot = Number(first) - 1
  const total = Number(count)
  const valid =
    Number.isInteger(firstSlot) &&
    Number.isInteger(total) &&
    firstSlot >= 0 &&
    total >= 1 &&
    firstSlot + total <= fm1VaPresetCount

  async function start() {
    const controller = new AbortController()
    run.current = controller
    setFailure(null)
    let results: Fm1VaWriteTimingResult[] = []
    let runFailure: string | undefined
    try {
      const presets = []
      for (let index = 0; index < total; index += 1) {
        setProgress({ done: index, stage: 'reading', total })
        presets.push(await readPreset(firstSlot + index, controller.signal))
      }
      setProgress({ done: 0, stage: 'writing', total })
      results = await runFm1VaWriteTiming(presets, {
        gapMs: timing.gapMs,
        onResult: (sofar) => {
          results = sofar
          setProgress({ done: sofar.length, stage: 'writing', total })
        },
        read: (slot) => readPreset(slot),
        signal: controller.signal,
        write: (slot, voice, record) => writePreset(slot, voice, record),
      })
    } catch (caughtError) {
      runFailure = caughtError instanceof Error ? caughtError.message : 'The test failed.'
    } finally {
      if (run.current === controller) run.current = null
      setProgress(null)
    }
    // Stopping while the presets are still being read writes nothing, so there is no run to log.
    if (results.length === 0) {
      if (runFailure && !controller.signal.aborted) setFailure(runFailure)
      return
    }
    setRuns((logged) => [
      ...logged,
      { crackle: 'unnoted', failure: runFailure, firstSlot, presets: total, results, timing },
    ])
  }

  function noteCrackle(index: number, crackle: Crackle) {
    setRuns((logged) => logged.map((entry, at) => (at === index ? { ...entry, crackle } : entry)))
  }

  async function copyRuns() {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          {
            firmware,
            runs: runs.map((entry) => ({
              crackle: entry.crackle,
              firstPreset: fm1VaPresetNumber(entry.firstSlot),
              gapMs: entry.timing.gapMs,
              listenMs: entry.timing.listenMs,
              outcome: outcome(entry),
              perPreset: perPreset(entry),
              presets: entry.presets,
              results: entry.results.map(({ slot, ...result }) => ({
                preset: fm1VaPresetNumber(slot),
                ...result,
              })),
              test: entry.timing.id,
            })),
          },
          null,
          2,
        ),
      )
    } catch {
      setFailure('The runs could not be copied.')
    }
  }

  const running = progress !== null

  return (
    <section aria-labelledby={ids.heading} className="space-y-3 border-t pt-3">
      <h3 className="font-semibold" id={ids.heading}>
        Write timing
      </h3>
      <p className="leading-6 text-[var(--crt-ink-3)]">
        Finds how quickly presets can be written one after another (docs/fm1-va-096-tests.md §6).
        Each preset is read, written back with exactly the same bytes, and read again to check it
        landed, so the FM1 ends up holding what it held. Back up the FM1 in Baud Girl&rsquo;s Device
        Manager before the first run.
      </p>
      <ol className="list-decimal space-y-4 pl-5">
        <li className="space-y-2">
          <p>Choose the presets. 097 and 16 are the 8-Bit pack; 001 and 32 are a whole bank.</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 font-medium" htmlFor={ids.first}>
              First preset
              <input
                className="h-10 w-24 rounded-md border bg-background px-2"
                disabled={running}
                id={ids.first}
                inputMode="numeric"
                max={fm1VaPresetCount}
                min="1"
                onChange={(event) => setFirst(event.target.value)}
                type="number"
                value={first}
              />
            </label>
            <label className="flex flex-col gap-1 font-medium" htmlFor={ids.count}>
              How many
              <input
                className="h-10 w-24 rounded-md border bg-background px-2"
                disabled={running}
                id={ids.count}
                inputMode="numeric"
                max={fm1VaPresetCount}
                min="1"
                onChange={(event) => setCount(event.target.value)}
                type="number"
                value={count}
              />
            </label>
          </div>
        </li>
        <li className="space-y-2">
          <p>
            Choose the timing. Start with T1, then work down the T2 timings, one run each, until a
            run crackles or stops.
          </p>
          <label className="flex flex-col gap-1 font-medium" htmlFor={ids.timing}>
            Timing
            <select
              className="h-10 rounded-md border bg-background px-2"
              disabled={running}
              id={ids.timing}
              onChange={(event) => setTimingId(event.target.value)}
              value={timingId}
            >
              {fm1VaWriteTimings.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </li>
        <li className="space-y-2">
          <p>Hold a note on the FM1, press Start, and listen for crackle until the run ends.</p>
          <div className="flex flex-wrap items-center gap-2">
            {running ? (
              <Button onClick={() => run.current?.abort()} type="button" variant="secondary">
                <span>Stop after this write</span>
              </Button>
            ) : (
              <Button
                disabled={!canRead || !canWrite || !valid}
                onClick={() => void start()}
                type="button"
              >
                <span>Start</span>
              </Button>
            )}
            <p role="status">
              {progress
                ? progress.stage === 'reading'
                  ? `Reading the presets first: ${progress.done} of ${progress.total}…`
                  : `Writing: ${progress.done} of ${progress.total} done…`
                : ''}
            </p>
          </div>
          {failure ? <ErrorNotice>{failure}</ErrorNotice> : null}
        </li>
        <li className="space-y-2">
          <p>In the run&rsquo;s row below, say whether you heard crackle.</p>
          {runs.length > 0 ? (
            <table className="w-full text-left text-xs">
              <caption className="sr-only">Runs</caption>
              <thead>
                <tr>
                  <th scope="col">Timing</th>
                  <th scope="col">Presets</th>
                  <th scope="col">Result</th>
                  <th scope="col">Per preset</th>
                  <th scope="col">Crackle</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((entry, index) => (
                  <tr key={index}>
                    <td>{entry.timing.id}</td>
                    <td>
                      {fm1VaPresetNumber(entry.firstSlot)}, {entry.presets}
                    </td>
                    <td>{outcome(entry)}</td>
                    <td>{perPreset(entry)}</td>
                    <td>
                      <select
                        aria-label={`Crackle in run ${index + 1}`}
                        className="h-8 rounded-md border bg-background px-1"
                        onChange={(event) =>
                          noteCrackle(
                            index,
                            crackleChoices.find(({ value }) => value === event.target.value)
                              ?.value ?? 'unnoted',
                          )
                        }
                        value={entry.crackle}
                      >
                        {crackleChoices.map(({ label, value }) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-[var(--crt-ink-3)]">No runs yet.</p>
          )}
        </li>
        <li className="space-y-2">
          <p>When you have finished, copy the runs and paste them into the chat or the ledger.</p>
          <Button
            disabled={running || runs.length === 0}
            onClick={() => void copyRuns()}
            type="button"
            variant="secondary"
          >
            <Copy aria-hidden="true" />
            <span>Copy all runs</span>
          </Button>
        </li>
      </ol>
    </section>
  )
}
