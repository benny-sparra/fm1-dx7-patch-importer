import { Copy, FileMusic } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { bankErrorMessage } from '@/components/patches/bank-error-message'
import { ErrorNotice } from '@/components/ui/error-notice'
import { LoadFailedNotice } from '@/components/ui/load-failed-notice'
import type { Patch } from '@/data/patches'
import type { Dx7Voice } from '@/lib/dx7'
import { makeDefaultFm1Effects } from '@/lib/fm1-effects'
import type { NamedBank } from '@/lib/named-bank'
import { librarianShortcuts, matchesShortcut } from '@/lib/keyboard-shortcuts'
import type { Dx7CatalogIndex } from '@/lib/search-everywhere'
import { cn } from '@/lib/utils'

type SearchModule = typeof import('@/lib/search-everywhere')

/**
 * The search code and the catalog's patch names, loaded together when the search first widens, with
 * this search's own cache of the catalog banks it plays from.
 */
type Searcher = {
  index: Dx7CatalogIndex
  loadVoice: ReturnType<SearchModule['createCatalogVoiceLoader']>
  module: SearchModule
}

async function loadSearcher(): Promise<Searcher> {
  const module = await import('@/lib/search-everywhere')
  return { index: module.dx7CatalogIndex, loadVoice: module.createCatalogVoiceLoader(), module }
}

// A short search such as one letter matches hundreds of catalog patches, so each group shows this
// many and asks for more letters rather than rendering them all.
const resultLimit = 60

const emptyGroup: ResultGroupContent = { hidden: 0, results: [] }

/** A sound found outside the workspace, ready to copy into a workspace slot. */
export type SearchResultSound = {
  /** Absent for a catalog sound, which has no FM1 effects of its own. */
  effects?: Uint8Array
  name: string
  /** Where it comes from, as the copy dialog shows it. */
  origin: string
  slot: number
  voice: Dx7Voice
}

type Result = {
  bankName: string
  key: string
  load: () => Promise<{ effects?: Uint8Array; voice: Dx7Voice }>
  name: string
  slot: number
}

type SearchEverywhereResultsProps = {
  /** The lit workspace slot. While one is lit, no result here is. */
  activePatchId: string
  hasDamagedNamedBanks: boolean
  namedBanks: NamedBank[]
  namedBanksLoadFailed: boolean
  /** `edit` asks for the editor to open on the copy, as double-clicking a result does. */
  onCopy: (sound: SearchResultSound, edit: boolean) => void
  onPlay: (voice: Dx7Voice, effects: Uint8Array | undefined) => void
  search: string
  workspaceEffects: Record<string, Uint8Array>
  /** The workspace results above. A result that sounds exactly like one of them is left out. */
  workspaceMatches: Pick<Patch, 'id'>[]
  workspaceVoices: Record<string, Dx7Voice>
}

type ResultGroupContent = { hidden: number; results: Result[] }

const slotNumber = (slot: number) => String(slot).padStart(2, '0')

/**
 * Search results from saved banks and the bundled catalog, below the workspace's own. A result plays
 * through the FM1 edit buffer and can be copied into a workspace slot, but it is not a slot itself,
 * so it cannot be edited or reordered where it is.
 */
export function SearchEverywhereResults({
  activePatchId,
  hasDamagedNamedBanks,
  namedBanks,
  namedBanksLoadFailed,
  onCopy,
  onPlay,
  search,
  workspaceEffects,
  workspaceMatches,
  workspaceVoices,
}: SearchEverywhereResultsProps) {
  const { i18n, t } = useTranslation()
  const [searcher, setSearcher] = useState<Searcher | null>(null)
  const [searcherFailed, setSearcherFailed] = useState(false)
  const [playedKey, setPlayedKey] = useState('')
  const [error, setError] = useState('')
  // Only the latest play or copy may act, so a slow catalog fetch cannot overtake a later click,
  // and nothing acts once the results have gone.
  const latestRequest = useRef(0)

  useEffect(() => {
    let cancelled = false
    void loadSearcher()
      .then((loaded) => {
        if (!cancelled) setSearcher(loaded)
      })
      .catch(() => {
        if (!cancelled) setSearcherFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const requests = latestRequest
    return () => {
      requests.current += 1
    }
  }, [])

  const [savedResults, catalogResults] = useMemo((): ResultGroupContent[] => {
    if (!searcher) return [emptyGroup, emptyGroup]
    const { findCatalogMatches, findSavedBankMatches, hideCopies, soundKey } = searcher.module
    const shown = workspaceMatches.flatMap(({ id }) => {
      const voice = workspaceVoices[id]
      return voice ? [soundKey(voice, workspaceEffects[id] ?? makeDefaultFm1Effects())] : []
    })
    const [saved, catalog] = hideCopies<{ result: Result; soundKey: string }>(shown, [
      findSavedBankMatches(namedBanks, search).map((match) => ({
        result: {
          bankName: match.bankName,
          key: `saved:${match.bankId}:${match.slot}`,
          load: () => Promise.resolve({ effects: match.effects, voice: match.voice }),
          name: match.name,
          slot: match.slot,
        },
        soundKey: match.soundKey,
      })),
      findCatalogMatches(searcher.index, search).map((match) => ({
        result: {
          bankName: match.bankName,
          key: `catalog:${match.bankId}:${match.slot}`,
          load: async () => ({ voice: await searcher.loadVoice(match.bankId, match.slot) }),
          name: match.name,
          slot: match.slot,
        },
        soundKey: match.soundKey,
      })),
    ])
    return [saved, catalog].map(({ hidden, matches }) => ({
      hidden,
      results: matches.map(({ result }) => result),
    }))
  }, [namedBanks, search, searcher, workspaceEffects, workspaceMatches, workspaceVoices])

  const formatCount = (count: number) => new Intl.NumberFormat(i18n.resolvedLanguage).format(count)

  const run = async (result: Result, action: 'copy' | 'edit' | 'play') => {
    latestRequest.current += 1
    const request = latestRequest.current
    setError('')
    try {
      const { effects, voice } = await result.load()
      if (request !== latestRequest.current) return
      if (action === 'play') {
        onPlay(voice, effects)
        setPlayedKey(result.key)
        return
      }
      onCopy(
        {
          effects,
          name: result.name,
          origin: `${slotNumber(result.slot)} ${result.name} · ${result.bankName}`,
          slot: result.slot,
          voice,
        },
        action === 'edit',
      )
    } catch (cause) {
      if (request !== latestRequest.current) return
      const fallback = action === 'play' ? t('banks.everywhere.playFailed') : t('banks.copyFailed')
      setError(bankErrorMessage(t, cause, fallback))
    }
  }

  const foundNothing =
    searcher !== null &&
    workspaceMatches.length === 0 &&
    savedResults.results.length === 0 &&
    catalogResults.results.length === 0

  return (
    <div className={cn('grid gap-4', workspaceMatches.length > 0 && 'mt-4')}>
      {namedBanksLoadFailed ? <ErrorNotice>{t('namedBanks.loadFailed')}</ErrorNotice> : null}
      {hasDamagedNamedBanks ? <ErrorNotice>{t('namedBanks.damagedBanks')}</ErrorNotice> : null}
      {error ? <ErrorNotice>{error}</ErrorNotice> : null}
      {searcherFailed ? (
        <LoadFailedNotice message={t('banks.everywhere.loadFailed')} />
      ) : searcher ? null : (
        <p aria-live="polite" className="text-xs text-[var(--crt-ink-3)]" role="status">
          {t('banks.everywhere.loading')}
        </p>
      )}
      <ResultGroup
        activeKey={activePatchId ? '' : playedKey}
        formatCount={formatCount}
        onCopy={(result) => void run(result, 'copy')}
        onEdit={(result) => void run(result, 'edit')}
        onPlay={(result) => void run(result, 'play')}
        {...savedResults}
        title={t('banks.everywhere.savedBanks')}
      />
      <ResultGroup
        activeKey={activePatchId ? '' : playedKey}
        formatCount={formatCount}
        onCopy={(result) => void run(result, 'copy')}
        onEdit={(result) => void run(result, 'edit')}
        onPlay={(result) => void run(result, 'play')}
        {...catalogResults}
        title={t('banks.everywhere.catalog')}
      />
      {foundNothing ? (
        <div className="grid min-h-72 place-items-center border border-dashed border-[var(--crt-line)] bg-[var(--crt-bg-well)] p-6 text-center">
          <div className="max-w-md">
            <FileMusic aria-hidden="true" className="mx-auto size-10 text-[var(--crt-acc-dim)]" />
            <h3 className="font-dot-matrix mt-3 text-base font-bold tracking-[0.08em] text-[var(--crt-acc-lt)] uppercase">
              {t('banks.noMatches')}
            </h3>
          </div>
        </div>
      ) : null}
    </div>
  )
}

type ResultGroupProps = ResultGroupContent & {
  activeKey: string
  formatCount: (count: number) => string
  onCopy: (result: Result) => void
  onEdit: (result: Result) => void
  onPlay: (result: Result) => void
  title: string
}

function ResultGroup({
  activeKey,
  formatCount,
  hidden,
  onCopy,
  onEdit,
  onPlay,
  results,
  title,
}: ResultGroupProps) {
  const { t } = useTranslation()
  const headingId = useId()
  // A group whose every match is a copy keeps its heading, so the note says where they went.
  if (results.length === 0 && hidden === 0) return null

  return (
    <section aria-labelledby={headingId}>
      <h3
        className="font-dot-matrix mb-2 text-[13px] font-bold tracking-[0.1em] text-[var(--crt-acc-lt)] uppercase"
        id={headingId}
      >
        {title}
      </h3>
      {results.length > 0 ? (
        <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
          {results.slice(0, resultLimit).map((result) => {
            const isActive = result.key === activeKey
            const origin = `${result.bankName} ${slotNumber(result.slot)}`
            return (
              <li
                className={cn(
                  'patch-cell patch-edge-gradient relative flex min-h-12 items-center gap-2 px-2 py-2 transition-colors duration-150',
                  'border-t border-r border-b border-l border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)]',
                  isActive
                    ? 'border-t-[var(--crt-bevel-lt)] border-l-[var(--crt-bevel-lt)] bg-[var(--crt-sel-bg)]'
                    : 'border-t-[var(--crt-bevel)] border-l-[var(--crt-bevel)] bg-[var(--crt-bg-panel3)] hover:bg-[var(--crt-bg-head)]',
                )}
                key={result.key}
              >
                <button
                  aria-current={isActive ? 'true' : undefined}
                  aria-label={t('banks.everywhere.play', { name: result.name, origin })}
                  className="absolute inset-0 z-0 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--crt-led)]"
                  onClick={() => onPlay(result)}
                  // Double-clicking edits, as on a slot, and Enter on the result just played does too.
                  // A result has no slot to edit, so both copy it into one first.
                  onDoubleClick={() => onEdit(result)}
                  onKeyDown={(event) => {
                    if (!isActive || !matchesShortcut(event, librarianShortcuts.openSlot)) return
                    event.preventDefault()
                    onEdit(result)
                  }}
                  title={t('banks.everywhere.playTitle', { name: result.name })}
                  type="button"
                />
                <span
                  className={cn(
                    'patch-slot font-vt323 pointer-events-none shrink-0 border bg-[var(--crt-bg-well)] px-1.5 pt-1.5 pb-1 text-[18px] leading-none',
                    isActive
                      ? 'border-[var(--crt-acc)] text-[var(--crt-acc-br)]'
                      : 'border-[var(--crt-line)] text-[var(--crt-acc-lt)]',
                  )}
                >
                  {slotNumber(result.slot)}
                </span>
                <span className="pointer-events-none min-w-0 flex-1">
                  <span
                    className={cn(
                      'patch-name font-dot-matrix block truncate text-[14px] font-bold whitespace-pre',
                      isActive ? 'text-white' : 'text-[var(--crt-ink)]',
                    )}
                  >
                    {result.name}
                  </span>
                  <span className="block truncate text-[11px] text-[var(--crt-ink-3)]">
                    {result.bankName}
                  </span>
                </span>
                {/* Above the result's own button, so copying does not also play it. */}
                <button
                  aria-label={t('banks.everywhere.copy', { name: result.name })}
                  className="z-[1] grid size-6 shrink-0 cursor-pointer place-items-center text-[var(--crt-ink-3)] transition-colors hover:text-[var(--crt-acc-lt)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--crt-led)]"
                  onClick={() => onCopy(result)}
                  title={t('banks.copySelected')}
                  type="button"
                >
                  <Copy aria-hidden="true" className="size-3.5" />
                </button>
                {isActive ? <span className="sr-only">{t('banks.auditioning')}</span> : null}
              </li>
            )
          })}
        </ul>
      ) : null}
      {results.length > resultLimit ? (
        <p className="mt-2 text-xs text-[var(--crt-ink-3)]">
          {t('banks.everywhere.truncated', {
            shown: formatCount(resultLimit),
            total: formatCount(results.length),
          })}
        </p>
      ) : null}
      {hidden > 0 ? (
        <p className="mt-2 text-xs text-[var(--crt-ink-3)]">{t('banks.everywhere.copiesHidden')}</p>
      ) : null}
    </section>
  )
}
