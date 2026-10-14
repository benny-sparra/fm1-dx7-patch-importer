import { LibraryBig, Play } from 'lucide-react'
import { useEffect, useId, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { EngineTag, engineName, type PatchEngine } from '@/components/patches/engine-tag'
import type { SearchResultSound } from '@/components/patches/search-everywhere-results'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ErrorNotice } from '@/components/ui/error-notice'
import { LoadFailedNotice } from '@/components/ui/load-failed-notice'
import '@/i18n/librarian-dialogs'
import type { Dx7Voice } from '@/lib/dx7'
import {
  decodePatchSharePayload,
  PatchShareLinkError,
  type SharedPatch,
} from '@/lib/patch-share-link'
import { clearShareFragment } from '@/lib/share-link-fragment'

type SharedPatchDialogProps = {
  /** Whether a MIDI output is selected, without which Play has nowhere to send the patch. */
  canPlay: boolean
  /** Opens the copy dialog on the patch, which chooses its slot. */
  onAdd: (sound: SearchResultSound) => void
  onClose: () => void
  /** Sends a DX7 voice and its effects to the FM1's edit buffer, as a search result plays. */
  onPlay: (voice: Dx7Voice, effects: Uint8Array) => void
  /** The share link's payload, the text after `#p=`. */
  payload: string
}

type Decoded = { patch: SharedPatch } | { problem: 'damaged' | 'newer-version' }

function decode(payload: string): Decoded {
  try {
    return { patch: decodePatchSharePayload(payload) }
  } catch (error) {
    return {
      problem:
        error instanceof PatchShareLinkError && error.problem === 'newer-version'
          ? 'newer-version'
          : 'damaged',
    }
  }
}

function sharedEngine(patch: SharedPatch): PatchEngine {
  if ('voice' in patch) return 'fm'
  return 'virtualAnalog' in patch ? 'virtual-analog' : 'eight-bit'
}

/**
 * Shows the patch a share link carries, which plays on the FM1 and goes into the library only
 * through **Add to library…**, where its slot is chosen. The page opens it on a `#p=` link, without
 * a click, so it checks it can show itself first. The link's fragment leaves the address bar once
 * read, so a reload does not open it again, except a link from a newer release, which the reload
 * it offers opens with that release's code.
 */
export function SharedPatchDialog({
  canPlay,
  onAdd,
  onClose,
  onPlay,
  payload,
}: SharedPatchDialogProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const decoded = useMemo(() => decode(payload), [payload])
  const patch = 'patch' in decoded ? decoded.patch : undefined
  const keepsFragment = 'problem' in decoded && decoded.problem === 'newer-version'

  useEffect(() => {
    if (!keepsFragment) clearShareFragment()
    const dialog = dialogRef.current
    if (!dialog?.isConnected || dialog.open || typeof dialog.showModal !== 'function') return
    dialog.showModal()
  }, [keepsFragment])

  const closeDialog = () => dialogRef.current?.close()

  return (
    <Dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      onClose={() => {
        clearShareFragment()
        onClose()
      }}
      ref={dialogRef}
      size="md"
    >
      <DialogHeader>
        <DialogTitle id={titleId}>{t('shareLink.title')}</DialogTitle>
        <DialogCloseButton label={t('common.close')} onClick={closeDialog} />
      </DialogHeader>
      <DialogBody>
        <div className="grid gap-4 p-4 sm:p-5">
          {patch ? (
            <>
              <div className="crt-inset flex min-w-0 items-center gap-3 bg-[var(--crt-bg-1)] px-3 py-2.5">
                <EngineTag engine={sharedEngine(patch)} />
                <p className="min-w-0">
                  <span className="font-vt323 block truncate pb-1 text-[30px] leading-[1.15] whitespace-pre text-[var(--crt-led)] [text-shadow:0_0_10px_var(--crt-led-glow)]">
                    {patch.name}
                  </span>
                  <span className="block text-xs text-[var(--crt-ink-3)]">
                    {engineName(t, sharedEngine(patch))}
                  </span>
                </p>
              </div>
              <p className="text-sm leading-6 text-[var(--crt-ink-2)]" id={descriptionId}>
                {t('shareLink.intro')}
              </p>
              {'voice' in patch ? (
                <p className="text-xs leading-5 text-[var(--crt-ink-3)]">
                  {canPlay ? t('shareLink.playHelp') : t('shareLink.connectToPlay')}
                </p>
              ) : (
                <p className="text-xs leading-5 text-[var(--crt-ink-3)]">
                  {t('shareLink.presetPlaysOnFm1')}
                </p>
              )}
            </>
          ) : (
            <div id={descriptionId}>
              {keepsFragment ? (
                <LoadFailedNotice message={t('shareLink.newerVersion')} />
              ) : (
                <ErrorNotice>{t('shareLink.damaged')}</ErrorNotice>
              )}
            </div>
          )}
        </div>
      </DialogBody>
      <DialogFooter className="flex-wrap justify-end gap-2">
        <Button onClick={closeDialog} type="button" variant="ghost">
          {t('common.close')}
        </Button>
        {patch && 'voice' in patch ? (
          <Button
            disabled={!canPlay}
            onClick={() => onPlay(patch.voice, patch.effects)}
            type="button"
            variant="secondary"
          >
            <Play />
            <span>{t('shareLink.play')}</span>
          </Button>
        ) : null}
        {patch ? (
          <Button
            onClick={() => {
              onAdd({ ...patch, origin: t('shareLink.origin'), slot: 1 })
              closeDialog()
            }}
            type="button"
          >
            <LibraryBig />
            <span>{t('shareLink.add')}</span>
          </Button>
        ) : null}
      </DialogFooter>
    </Dialog>
  )
}
