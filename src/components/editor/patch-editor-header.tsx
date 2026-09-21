import {
  ArrowLeft,
  ChevronDown,
  Dices,
  Eraser,
  GitCompareArrows,
  Pencil,
  Redo2,
  RefreshCw,
  RotateCcw,
  Save,
  Undo2,
  WandSparkles,
} from 'lucide-react'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { CompareNotice } from '@/components/editor/compare-overlay'
import { Button, buttonVariants } from '@/components/ui/button'
import type { Patch } from '@/data/patches'
import { FM1_VOICE_NAME_LENGTH } from '@/lib/fm1-parameters'
import {
  editorShortcuts,
  formatShortcut,
  isApplePlatform,
  type KeyboardShortcut,
} from '@/lib/keyboard-shortcuts'
import type { PatchSyncState } from '@/lib/patch-sync-coordinator'
import { soundPresets, type SoundPresetId } from '@/lib/sound-presets'
import { cn } from '@/lib/utils'
import { patchSlotCode } from '@/lib/patch-library'

type PatchEditorHeaderProps = {
  canSync: boolean
  canRedo: boolean
  canUndo: boolean
  isComparing: boolean
  isDirty: boolean
  liveName: string
  onBack: () => void
  onCompare: () => void
  onStopCompare: () => void
  onNameBlur: () => void
  onNameChange: (name: string) => void
  onPreset: (id: SoundPresetId) => void
  onInitVoice: () => void
  onRandomise: () => void
  onRedo: () => void
  onResend: () => void
  onRevert: () => void
  onSave: () => void
  onUndo: () => void
  patch: Patch
  presetsMenuRef: RefObject<HTMLDetailsElement | null>
  saveMenuRef: RefObject<HTMLDetailsElement | null>
  syncState: PatchSyncState
}

const presetItemClass =
  'grid w-full gap-0.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50'

/** Separates the toolbar's history, voice, and save groups. */
function ToolbarDivider() {
  return <span aria-hidden="true" className="mx-1 h-7 w-px shrink-0 bg-[var(--crt-bevel)]" />
}

export function PatchEditorHeader({
  canSync,
  canRedo,
  canUndo,
  isComparing,
  isDirty,
  liveName,
  onBack,
  onCompare,
  onNameBlur,
  onStopCompare,
  onNameChange,
  onPreset,
  onInitVoice,
  onRandomise,
  onRedo,
  onResend,
  onRevert,
  onSave,
  onUndo,
  patch,
  presetsMenuRef,
  saveMenuRef,
  syncState,
}: PatchEditorHeaderProps) {
  const { t } = useTranslation()
  const onApplePlatform = useMemo(() => isApplePlatform(), [])
  // The accessible name stays plain; the hint only rides along in the tooltip.
  const withShortcut = (label: string, shortcut: KeyboardShortcut) =>
    `${label} (${formatShortcut(shortcut, onApplePlatform)})`
  const compareButtonRef = useRef<HTMLButtonElement>(null)
  const compareDisabled = syncState === 'sending' || (!isDirty && !isComparing)
  const wasComparing = useRef(isComparing)
  const restoreCompareFocus = useRef(false)

  // Closing the notice removes the focused close control, so focus returns to the Compare button,
  // once it is enabled again after the edits are sent, unless the user has moved focus meanwhile.
  useEffect(() => {
    if (wasComparing.current && !isComparing) {
      const active = document.activeElement
      restoreCompareFocus.current = !active || active === document.body
    }
    wasComparing.current = isComparing
    if (!restoreCompareFocus.current || compareDisabled) return
    restoreCompareFocus.current = false
    const active = document.activeElement
    if (!active || active === document.body) compareButtonRef.current?.focus()
  }, [compareDisabled, isComparing])

  return (
    <header className="crt-hatch sticky top-0 z-20 ml-[calc(50%_-_50vw)] w-screen min-w-0 border-b-2 border-[var(--crt-shadow)] py-1.5 shadow-sm">
      <div className="relative mx-auto flex max-w-[90rem] flex-wrap items-center gap-3 px-3 sm:px-5 lg:px-8">
        <Button
          aria-label={t('editor.back')}
          className="text-[var(--crt-ink-2)]"
          disabled={syncState === 'sending' || isComparing}
          onClick={onBack}
          size="icon"
          title={withShortcut(t('editor.back'), editorShortcuts.back)}
          type="button"
          variant="outline"
        >
          <ArrowLeft />
        </Button>
        <div className="flex min-w-0 items-center gap-2">
          {/* The library grid's slot shape, in the header's LED colour beside the patch name. */}
          <span className="patch-slot crt-inset font-vt323 flex h-8 shrink-0 items-center border bg-[var(--crt-bg-well)] px-1.5 pt-1.5 pb-1 text-[18px] leading-none text-[var(--crt-led)]">
            {patchSlotCode(patch)}
          </span>
          <div className="flex min-w-0 items-center gap-2">
            <label className="min-w-0" title={t('editor.editName')}>
              <span className="sr-only">{t('editor.patchName')}</span>
              <span className="flex items-center gap-1">
                <input
                  aria-label={t('editor.patchName')}
                  className="font-dot-matrix crt-inset h-8 w-[12ch] max-w-[42vw] bg-[var(--crt-bg-well)] px-1 text-xl font-black text-[var(--crt-led)] uppercase transition-colors outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:opacity-60"
                  disabled={isComparing}
                  maxLength={FM1_VOICE_NAME_LENGTH}
                  onBlur={onNameBlur}
                  onChange={(event) => onNameChange(event.target.value.toUpperCase())}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur()
                  }}
                  spellCheck={false}
                  value={liveName}
                />
                <Pencil aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground/70" />
              </span>
            </label>
            {isDirty ? (
              <span
                aria-label={t('editor.unsaved')}
                className="size-2 rounded-full bg-[var(--crt-led)]"
                title={t('editor.unsaved')}
              />
            ) : null}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            aria-label={t('editor.undo')}
            disabled={!canUndo || isComparing}
            onClick={onUndo}
            size="icon"
            title={withShortcut(t('editor.undo'), editorShortcuts.undo)}
            type="button"
            variant="outline"
          >
            <Undo2 />
          </Button>
          <Button
            aria-label={t('editor.redo')}
            disabled={!canRedo || isComparing}
            onClick={onRedo}
            size="icon"
            title={withShortcut(t('editor.redo'), editorShortcuts.redo)}
            type="button"
            variant="outline"
          >
            <Redo2 />
          </Button>
          <ToolbarDivider />
          {/* A summary cannot be disabled, so the menu is made inert while comparing. */}
          <details className="group static sm:relative" inert={isComparing} ref={presetsMenuRef}>
            <summary
              aria-label={t('editor.presets')}
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'font-vt323 list-none [&::-webkit-details-marker]:hidden',
                isComparing && 'opacity-50',
              )}
              title={t('editor.presets')}
            >
              <WandSparkles />
              <span className="hidden xl:inline">{t('editor.presetsShort')}</span>
              <ChevronDown className="hidden transition-transform group-open:rotate-180 motion-reduce:transition-none xl:block" />
            </summary>
            <div className="editor-menu-surface absolute top-[calc(100%+0.5rem)] right-0 left-0 z-40 grid max-h-[min(26rem,calc(100vh-1.5rem))] gap-1 overflow-y-auto rounded-lg border bg-popover p-2 text-popover-foreground sm:left-auto sm:max-h-none sm:w-[min(22rem,calc(100vw-1.5rem))]">
              {/* Init voice leads the list as the blank starting point, then Randomise. */}
              <button
                className={presetItemClass}
                disabled={syncState === 'sending'}
                onClick={onInitVoice}
                type="button"
              >
                <span className="flex items-center gap-1.5 text-sm font-bold">
                  <Eraser aria-hidden="true" className="size-3.5 shrink-0" />
                  <span>{t('editor.initVoice')}</span>
                </span>
                <span className="text-xs leading-4 text-muted-foreground">
                  {t('editor.initVoiceHelp')}
                </span>
              </button>
              <button
                className={presetItemClass}
                disabled={syncState === 'sending'}
                onClick={onRandomise}
                type="button"
              >
                <span className="flex items-center gap-1.5 text-sm font-bold">
                  <Dices aria-hidden="true" className="size-3.5 shrink-0" />
                  <span>{t('editor.randomise')}</span>
                </span>
                <span className="text-xs leading-4 text-muted-foreground">
                  {t('editor.randomiseHelp')}
                </span>
              </button>
              {soundPresets.map((preset) => (
                <button
                  className={presetItemClass}
                  disabled={syncState === 'sending'}
                  key={preset.id}
                  onClick={() => onPreset(preset.id)}
                  type="button"
                >
                  <span className="text-sm font-bold">
                    {t(`editor.presetOptions.${preset.id}.name`)}
                  </span>
                  <span className="text-xs leading-4 text-muted-foreground">
                    {t(`editor.presetOptions.${preset.id}.description`)}
                  </span>
                </button>
              ))}
            </div>
          </details>
          <ToolbarDivider />
          {/* The name stays the same in both states; pressed means the saved version is playing. */}
          <Button
            aria-label={t('editor.compare')}
            aria-pressed={isComparing}
            className={cn(
              'font-vt323',
              isComparing &&
                'bg-[var(--crt-led)] text-[var(--crt-bg-0)] hover:bg-[var(--crt-led)] hover:text-[var(--crt-bg-0)]',
            )}
            disabled={compareDisabled}
            onClick={onCompare}
            ref={compareButtonRef}
            title={t('editor.compare')}
            type="button"
            variant="outline"
          >
            <GitCompareArrows />
            <span className="hidden xl:inline">{t('editor.compareShort')}</span>
          </Button>
          <div className="flex items-center">
            <Button
              className="font-vt323"
              disabled={!isDirty || isComparing}
              onClick={onSave}
              title={withShortcut(t('editor.save'), editorShortcuts.save)}
              type="button"
            >
              <Save />
              <span className="hidden sm:inline">{t('editor.save')}</span>
            </Button>
            <details className="group relative" inert={isComparing} ref={saveMenuRef}>
              <summary
                aria-haspopup="menu"
                aria-label={t('editor.moreSave')}
                className={cn(
                  buttonVariants({ size: 'icon' }),
                  'list-none border-l-[var(--crt-bevel-lt)] [&::-webkit-details-marker]:hidden',
                  isComparing && 'opacity-50',
                )}
                title={t('editor.moreSave')}
              >
                <ChevronDown className="transition-transform group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <div
                className="editor-menu-surface absolute top-[calc(100%+0.5rem)] right-0 z-40 grid w-64 gap-1 rounded-lg border bg-popover p-2 text-popover-foreground"
                role="menu"
              >
                <button
                  className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50"
                  disabled={!canSync || syncState === 'sending'}
                  onClick={onResend}
                  role="menuitem"
                  type="button"
                >
                  <RefreshCw
                    className={cn(
                      'mt-0.5 size-4 shrink-0',
                      syncState === 'sending' && 'motion-safe:animate-spin',
                    )}
                  />
                  <span>
                    <span className="block text-sm font-bold">{t('editor.resend')}</span>
                    <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                      {t('editor.resendHelp')}
                    </span>
                  </span>
                </button>
                <button
                  className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50"
                  disabled={!isDirty || syncState === 'sending'}
                  onClick={onRevert}
                  role="menuitem"
                  title={t('ui.revertTitle')}
                  type="button"
                >
                  <RotateCcw className="mt-0.5 size-4 shrink-0" />
                  <span>
                    <span className="block text-sm font-bold">{t('editor.revert')}</span>
                    <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">
                      {t('editor.revertHelp')}
                    </span>
                  </span>
                </button>
              </div>
            </details>
          </div>
        </div>
      </div>
      <CompareNotice
        closeTitle={withShortcut(t('editor.stopComparing'), editorShortcuts.stopComparing)}
        isComparing={isComparing}
        onClose={onStopCompare}
      />
    </header>
  )
}
