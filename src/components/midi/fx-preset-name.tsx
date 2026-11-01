import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorNotice } from '@/components/ui/error-notice'
import { fxLibraryPresetNameLength, type FxLibraryPreset } from '@/lib/fx-library-preset'
import '@/i18n/fx-presets'

/** Keeps an in-progress name and its original record together for conflict-safe rename. */
export function FxPresetName({
  disabled,
  onRename,
  preset,
}: {
  disabled: boolean
  onRename: (preset: FxLibraryPreset, name: string) => Promise<boolean>
  preset: FxLibraryPreset
}) {
  const { t } = useTranslation()
  const [edit, setEdit] = useState<{ name: string; preset: FxLibraryPreset } | null>(null)
  const [invalid, setInvalid] = useState(false)

  const commit = async () => {
    if (!edit) return
    const name = edit.name.trim()
    if (!name || Array.from(name).length > fxLibraryPresetNameLength) {
      setInvalid(true)
      return
    }
    if (name === edit.preset.name || (await onRename(edit.preset, name))) setEdit(null)
  }

  return (
    <div className="grid min-w-0 gap-1">
      <label className="flex w-[24ch] max-w-full min-w-0 items-center gap-1">
        <span className="sr-only">{t('fxPresets.name')}</span>
        <input
          aria-invalid={invalid || undefined}
          className="name-caret font-dot-matrix crt-field h-8 w-full min-w-0 bg-[var(--crt-bg-well)] px-1 text-xl font-black text-[var(--crt-led)] transition-colors outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--crt-led)] disabled:opacity-60"
          disabled={disabled}
          onBlur={() => void commit()}
          onChange={(event) => {
            setEdit({ name: event.target.value, preset: edit?.preset ?? preset })
            setInvalid(false)
          }}
          onFocus={() => setEdit((current) => current ?? { name: preset.name, preset })}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              setEdit(null)
              setInvalid(false)
            }
          }}
          spellCheck={false}
          value={edit?.name ?? preset.name}
        />
        <Pencil aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground/70" />
      </label>
      {invalid ? <ErrorNotice>{t('fxPresets.errors.name')}</ErrorNotice> : null}
    </div>
  )
}
