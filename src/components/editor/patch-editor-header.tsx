import {
  ArrowLeft,
  ChevronDown,
  Dices,
  Pencil,
  Redo2,
  RefreshCw,
  RotateCcw,
  Save,
  Undo2,
  WandSparkles,
} from 'lucide-react'
import { type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { type Patch } from '@/data/patches'
import { type PatchSyncState } from '@/lib/patch-sync-coordinator'
import { soundPresets, type SoundPresetId } from '@/lib/sound-presets'
import { cn } from '@/lib/utils'

type PatchEditorHeaderProps = {
  canRedo: boolean
  canUndo: boolean
  isDirty: boolean
  liveName: string
  onBack: () => void
  onNameBlur: () => void
  onNameChange: (name: string) => void
  onPreset: (id: SoundPresetId) => void
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

export function PatchEditorHeader({
  canRedo,
  canUndo,
  isDirty,
  liveName,
  onBack,
  onNameBlur,
  onNameChange,
  onPreset,
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
  return (
    <header className="sticky top-0 z-20 ml-[calc(50%_-_50vw)] w-screen min-w-0 border-b border-primary/15 bg-white py-3 shadow-sm">
      <div className="relative mx-auto flex max-w-[90rem] flex-wrap items-center gap-3 px-3 sm:px-5 lg:px-8">
        <Button
          aria-label={t('editor.back')}
          className="border-[color-mix(in_srgb,var(--fm1-finish-tint)_72%,var(--color-border))] bg-[color-mix(in_srgb,var(--fm1-finish-tint)_38%,white)] text-foreground hover:border-[var(--fm1-finish-tint)] hover:bg-[var(--fm1-finish-tint)] hover:text-[var(--fm1-finish-foreground)]"
          disabled={syncState === 'sending'}
          onClick={onBack}
          size="icon"
          type="button"
          variant="outline"
        >
          <ArrowLeft />
        </Button>
        <div className="min-w-0">
          <p className="text-[10px] font-black tracking-[0.2em] text-primary uppercase">
            {patch.bank}
            {String(patch.number).padStart(2, '0')}
          </p>
          <div className="flex items-center gap-2">
            <label className="min-w-0" title={t('editor.editName')}>
              <span className="sr-only">{t('editor.patchName')}</span>
              <span className="flex items-center gap-1">
                <input
                  aria-label={t('editor.patchName')}
                  className="font-dot-matrix -ml-1 w-[12ch] max-w-[42vw] rounded border border-transparent bg-transparent px-1 text-xl font-black text-foreground uppercase transition outline-none hover:border-border hover:bg-card/60 focus:border-ring focus:bg-card focus:ring-2 focus:ring-ring/30"
                  maxLength={10}
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
                className="size-2 rounded-full bg-amber-500"
                title={t('editor.unsaved')}
              />
            ) : null}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            aria-label={t('editor.undo')}
            disabled={!canUndo}
            onClick={onUndo}
            size="icon"
            title={t('editor.undo')}
            type="button"
            variant="outline"
          >
            <Undo2 />
          </Button>
          <Button
            aria-label={t('editor.redo')}
            disabled={!canRedo}
            onClick={onRedo}
            size="icon"
            title={t('editor.redo')}
            type="button"
            variant="outline"
          >
            <Redo2 />
          </Button>
          <details className="group static sm:relative" ref={presetsMenuRef}>
            <summary
              aria-label={t('editor.presets')}
              className="flex h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-bold transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden"
              title={t('editor.presets')}
            >
              <WandSparkles className="size-4" />
              <span className="hidden xl:inline">{t('editor.presetsShort')}</span>
              <ChevronDown className="hidden size-3.5 transition-transform group-open:rotate-180 xl:block" />
            </summary>
            <div className="editor-menu-surface absolute top-[calc(100%+0.5rem)] right-0 left-0 z-40 grid max-h-[min(26rem,calc(100vh-1.5rem))] gap-1 overflow-y-auto rounded-lg border bg-popover p-2 text-popover-foreground sm:top-12 sm:left-auto sm:max-h-none sm:w-[min(22rem,calc(100vw-1.5rem))]">
              <div className="px-2 pt-1 pb-2">
                <p className="text-sm font-bold">{t('editor.presets')}</p>
                <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                  {t('editor.presetsHelp')}
                </p>
              </div>
              {soundPresets.map((preset) => (
                <button
                  className="grid w-full gap-0.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50"
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
          <Button
            aria-label={t('editor.randomise')}
            className="font-vt323"
            disabled={syncState === 'sending'}
            onClick={onRandomise}
            title={t('editor.randomise')}
            type="button"
            variant="outline"
          >
            <Dices />
            <span className="hidden xl:inline">{t('editor.randomise')}</span>
          </Button>
          <div className="flex items-center">
            <Button
              className="font-vt323 rounded-r-none pr-3"
              disabled={!isDirty}
              onClick={onSave}
              type="button"
            >
              <Save />
              <span className="hidden sm:inline">{t('editor.save')}</span>
            </Button>
            <details className="group relative" ref={saveMenuRef}>
              <summary
                aria-haspopup="menu"
                aria-label={t('editor.moreSave')}
                className="flex h-10 w-9 cursor-pointer list-none items-center justify-center rounded-r-md border-l border-primary-foreground/25 bg-primary text-primary-foreground shadow-[0_0_14px_hsl(315_100%_60%_/_0.16)] transition-all hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden"
                title={t('editor.moreSave')}
              >
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
              </summary>
              <div
                className="editor-menu-surface absolute top-12 right-0 z-40 grid w-64 gap-1 rounded-lg border bg-popover p-2 text-popover-foreground"
                role="menu"
              >
                <button
                  className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50"
                  disabled={syncState === 'sending'}
                  onClick={onResend}
                  role="menuitem"
                  type="button"
                >
                  <RefreshCw
                    className={cn(
                      'mt-0.5 size-4 shrink-0',
                      syncState === 'sending' && 'animate-spin',
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
    </header>
  )
}
