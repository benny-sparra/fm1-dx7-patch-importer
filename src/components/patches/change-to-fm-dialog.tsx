import { ArrowRightLeft } from 'lucide-react'
import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { WarningNotice } from '@/components/ui/warning-notice'
import type { Patch } from '@/data/patches'
import type { PatchLibrary } from '@/hooks/use-patch-library'
import { updateDx7VoiceName, type Dx7Voice } from '@/lib/dx7'
import { FM1_VOICE_NAME_LENGTH } from '@/lib/fm1-parameters'
import { makeInitDx7Voice } from '@/lib/init-voice'
import { patchSlotCode, type PatchLibrarySnapshot } from '@/lib/patch-library'

type ChangeToFmDialogProps = {
  library: Pick<PatchLibrary, 'effects' | 'replaceVoice'>
  onChanged: (voice: Dx7Voice, changed: PatchLibrarySnapshot | null) => void
  onClose: () => void
  /** The Virtual Analog patch to replace. */
  patch: Patch
}

/**
 * Replaces a Virtual Analog patch with INIT VOICE, an FM patch, under a name chosen here
 * (docs/feature-backlog.md, FM-1+VA item 6). Nothing carries over between the engines but the FM1
 * effects, so the dialog says the sound is replaced, and Undo puts it back. The new patch has no
 * FM-1+VA settings record, so a write leaves a Virtual Analog preset in that FM1 slot alone.
 * It opens as soon as it is rendered and reports closing, so the page can drop it.
 */
export function ChangeToFmDialog({ library, onChanged, onClose, patch }: ChangeToFmDialogProps) {
  const { t } = useTranslation()
  // The action sits in the pinned footer, outside the form, and submits it by its id.
  const formId = useId()
  const titleId = useId()
  const warningId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(patch.name.slice(0, FM1_VOICE_NAME_LENGTH))

  // Focused with the name selected, so typing replaces it and Enter confirms, as the editor's name
  // field does.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || dialog.open) return
    dialog.showModal()
    window.requestAnimationFrame(() => nameInputRef.current?.select())
  }, [])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // The name keeps the characters a DX7 voice name can hold; any other becomes a space.
    const voice = updateDx7VoiceName(makeInitDx7Voice(), name)
    const changed = library.replaceVoice(patch.bank, patch.number, voice, library.effects[patch.id])
    dialogRef.current?.close()
    onChanged(voice, changed)
  }

  return (
    <Dialog
      aria-describedby={warningId}
      aria-labelledby={titleId}
      onClose={onClose}
      ref={dialogRef}
      size="md"
    >
      <DialogHeader>
        <DialogTitle id={titleId}>
          {t('changeToFm.title', { patch: patch.name, slot: patchSlotCode(patch) })}
        </DialogTitle>
        <DialogCloseButton label={t('common.close')} onClick={() => dialogRef.current?.close()} />
      </DialogHeader>
      <DialogBody>
        <form className="grid gap-5 p-5" id={formId} onSubmit={submit}>
          <WarningNotice>
            <p id={warningId}>{t('changeToFm.warning')}</p>
          </WarningNotice>
          <label className="grid gap-1 text-sm font-semibold">
            {t('changeToFm.name')}
            <input
              autoComplete="off"
              className="name-caret h-10 rounded-md border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
              maxLength={FM1_VOICE_NAME_LENGTH}
              onChange={(event) => setName(event.target.value)}
              ref={nameInputRef}
              value={name}
            />
          </label>
          <p className="text-xs text-[var(--crt-ink-3)]">{t('changeToFm.fm1Note')}</p>
        </form>
      </DialogBody>
      <DialogFooter>
        <Button form={formId} type="submit" variant="destructive">
          <ArrowRightLeft />
          <span>{t('changeToFm.action')}</span>
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
