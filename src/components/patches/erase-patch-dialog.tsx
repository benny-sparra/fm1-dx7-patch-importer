import { Eraser } from 'lucide-react'
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
import { FM1_VOICE_NAME_LENGTH } from '@/lib/fm1-parameters'
import {
  erasableFm1VaEngines,
  makeErasedFm1VaPreset,
  type ErasableFm1VaEngine,
} from '@/lib/fm1-va-erased-preset'
import { patchSlotCode, type PatchLibrarySnapshot } from '@/lib/patch-library'
import { cn } from '@/lib/utils'

type ErasePatchDialogProps = {
  /** The engine chosen as the dialog opens: the patch's own. */
  engine: ErasableFm1VaEngine
  library: Pick<PatchLibrary, 'replaceVoice' | 'replaceWithVirtualAnalog'>
  /** Reports the name the blank was given, as its voice bytes hold it. */
  onChanged: (name: string, changed: PatchLibrarySnapshot | null) => void
  onClose: () => void
  patch: Patch
}

/**
 * Replaces a patch with the blank preset the FM1's own Erase Preset makes for the chosen engine,
 * under a name chosen here (docs/feature-backlog.md, FM-1+VA item 6). It changes only the library,
 * which Undo reverses; the FM1 takes the blank when the patch is next written to it. It opens as
 * soon as it is rendered and reports closing, so the page can drop it.
 */
export function ErasePatchDialog({
  engine: initialEngine,
  library,
  onChanged,
  onClose,
  patch,
}: ErasePatchDialogProps) {
  const { t } = useTranslation()
  // The action sits in the pinned footer, outside the form, and submits it by its id.
  const formId = useId()
  const titleId = useId()
  const warningId = useId()
  const engineName = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [engine, setEngine] = useState(initialEngine)
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
    const preset = makeErasedFm1VaPreset(engine, name)
    const changed =
      preset.engine === 'fm'
        ? library.replaceVoice(
            patch.bank,
            patch.number,
            preset.voice,
            preset.effects,
            preset.record,
          )
        : library.replaceWithVirtualAnalog(
            patch.bank,
            patch.number,
            preset.voice,
            preset.effects,
            preset.record,
          )
    dialogRef.current?.close()
    onChanged(preset.name, changed)
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
          {t('erasePatch.title', { patch: patch.name, slot: patchSlotCode(patch) })}
        </DialogTitle>
        <DialogCloseButton label={t('common.close')} onClick={() => dialogRef.current?.close()} />
      </DialogHeader>
      <DialogBody>
        <form className="grid gap-5 p-5" id={formId} onSubmit={submit}>
          <WarningNotice>
            <p id={warningId}>{t('erasePatch.warning')}</p>
          </WarningNotice>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-semibold">{t('erasePatch.engine')}</legend>
            {/* The editor's segmented control: one sunken track, with the chosen engine raised out
                of it. Focus rings the whole track, and the arrow keys move the choice. */}
            <div className="crt-inset grid grid-cols-2 gap-[2px] bg-[var(--crt-bg-1)] p-[2px] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--crt-led)]">
              {erasableFm1VaEngines.map((choice) => (
                <label className="min-w-0 cursor-pointer" key={choice}>
                  <input
                    checked={engine === choice}
                    className="peer sr-only"
                    name={engineName}
                    onChange={() => setEngine(choice)}
                    type="radio"
                  />
                  <span
                    className={cn(
                      'flex h-9 items-center justify-center px-3 text-center text-sm font-semibold transition-colors',
                      engine === choice
                        ? 'border-t border-r border-b border-l border-t-[var(--crt-bevel-lt)] border-r-[var(--crt-shadow)] border-b-[var(--crt-shadow)] border-l-[var(--crt-bevel-lt)] bg-[var(--crt-btn)] text-[var(--crt-ink)]'
                        : 'border border-transparent text-[var(--crt-ink-3)] hover:text-[var(--crt-acc-lt)]',
                    )}
                  >
                    {t(choice === 'fm' ? 'erasePatch.fm' : 'erasePatch.virtualAnalog')}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="grid gap-1 text-sm font-semibold">
            {t('erasePatch.name')}
            <input
              autoComplete="off"
              className="name-caret h-10 rounded-md border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
              maxLength={FM1_VOICE_NAME_LENGTH}
              onChange={(event) => setName(event.target.value)}
              ref={nameInputRef}
              value={name}
            />
          </label>
          <p className="text-xs text-[var(--crt-ink-3)]">{t('erasePatch.fm1Note')}</p>
        </form>
      </DialogBody>
      <DialogFooter>
        <Button form={formId} type="submit" variant="destructive">
          <Eraser />
          <span>{t('erasePatch.action')}</span>
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
