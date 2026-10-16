import { ArrowLeft, ArrowRight } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/dialog'
import { InfoNotice } from '@/components/ui/info-notice'
import '@/i18n/librarian-dialogs'
import { sysexFileAccept } from '@/lib/sysex-file'

/*
 * The pieces the librarian's step-by-step dialogs share: **Add new bank…** and **Import DX7
 * bank…** each put one decision on a screen, moved through with Back and Next in the footer.
 */

/** Focuses a screen's first control: its chosen radio, or else its first field or button. */
function focusFirstControl(form: HTMLFormElement | null) {
  const control =
    form?.querySelector<HTMLElement>('input:checked, input:not(:disabled), textarea') ??
    form?.querySelector<HTMLElement>('button')
  control?.focus({ preventScroll: true })
}

/**
 * Which of `screens` is showing. A screen list that changes as choices are made, such as one that
 * gains a bank screen for a file joining several, keeps the place by its number. Moving to another
 * screen puts focus on its first control, as a change of page would; `onMove` clears whatever the
 * last screen showed, such as an error.
 */
export function useWizardScreens<Screen extends string>(
  screens: readonly Screen[],
  { initialIndex = 0, onMove }: { initialIndex?: number; onMove?: () => void } = {},
) {
  const formRef = useRef<HTMLFormElement>(null)
  // Whether the user has moved between screens, since only then does focus follow.
  const movedRef = useRef(false)
  const [index, setIndex] = useState(initialIndex)
  const screenIndex = Math.min(index, screens.length - 1)
  const screen = screens[screenIndex]

  useEffect(() => {
    if (movedRef.current) focusFirstControl(formRef.current)
  }, [screen])

  const goToScreen = (next: number) => {
    movedRef.current = true
    onMove?.()
    setIndex(next)
  }

  return {
    focusFirstControl: () => focusFirstControl(formRef.current),
    formRef,
    goToScreen,
    isLastScreen: screenIndex === screens.length - 1,
    screen,
    screenIndex,
  }
}

type WizardFooterProps = {
  /** The last screen's action, which takes Next's place. */
  action: { icon: ReactNode; label: string; variant?: 'default' | 'destructive' } | null
  /** Whether Next or the action cannot be used yet. */
  disabled: boolean
  /** The form the footer's button submits, so Enter in a field and the button move on alike. */
  formId: string
  onBack: () => void
  screenIndex: number
  /** Whether the dialog's action is under way, which holds Back as well. */
  working: boolean
}

/** Back at the left, hidden on the first screen, and Next or the last screen's action at the right. */
export function WizardFooter({
  action,
  disabled,
  formId,
  onBack,
  screenIndex,
  working,
}: WizardFooterProps) {
  const { t } = useTranslation()
  return (
    <DialogFooter className="flex-wrap justify-between gap-2">
      {screenIndex > 0 ? (
        <Button disabled={working} onClick={onBack} variant="ghost">
          <ArrowLeft />
          <span>{t('banks.wizardBack')}</span>
        </Button>
      ) : null}
      <Button
        className="ml-auto"
        disabled={working || disabled}
        form={formId}
        type="submit"
        variant={action?.variant ?? 'default'}
      >
        {action?.icon}
        <span>{action ? action.label : t('banks.wizardNext')}</span>
        {action ? null : <ArrowRight />}
      </Button>
    </DialogFooter>
  )
}

type BankFileScreenProps = {
  disabled?: boolean
  file: File | null
  onChoose: (file: File | null) => void
}

/** The screen choosing a DX7 SysEx bank file, saying what it accepts. */
export function BankFileScreen({ disabled = false, file, onChoose }: BankFileScreenProps) {
  const { t } = useTranslation()
  return (
    <>
      <label className="modal-input-surface flex min-h-11 cursor-pointer items-center rounded-md border border-dashed border-input px-3 text-sm transition-colors focus-within:outline-2 focus-within:outline-[var(--crt-led)] hover:bg-muted/50">
        <span className="min-w-0 truncate">{file?.name ?? t('banks.chooseSysexFile')}</span>
        <input
          accept={sysexFileAccept}
          className="sr-only"
          disabled={disabled}
          onChange={(event) => onChoose(event.target.files?.[0] ?? null)}
          type="file"
        />
      </label>
      <InfoNotice>
        <ul className="list-disc space-y-1 pl-4">
          <li>{t('banks.addBankFileNoteFormat')}</li>
          <li>{t('banks.addBankFileNoteSeveral')}</li>
          <li>{t('banks.addBankFileNotePrivacy')}</li>
        </ul>
      </InfoNotice>
    </>
  )
}
