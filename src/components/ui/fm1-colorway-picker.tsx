import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { fm1Colorways, type Fm1Colorway } from '@/lib/fm1-colorway'

type Fm1ColorwayPickerProps = {
  onChange: (colorway: Fm1Colorway) => void
  value: Fm1Colorway
}

export function Fm1ColorwayPicker({ onChange, value }: Fm1ColorwayPickerProps) {
  const { t } = useTranslation()
  const selected = fm1Colorways.find((colorway) => colorway.value === value) ?? fm1Colorways[0]
  const orderedColorways = [
    selected,
    ...fm1Colorways.filter((colorway) => colorway.value !== selected.value),
  ]

  return (
    <div className="relative h-[38px] w-[42px] shrink-0">
      <div className="fm1-finish-picker group absolute right-0 top-0 z-40 flex items-center rounded-md border border-white/15 bg-black/70 px-2 py-1.5 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-lg focus-within:shadow-lg">
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-[10px] font-black uppercase tracking-[0.14em] text-white/55 opacity-0 transition-[max-width,margin,opacity] duration-200 group-hover:mr-2 group-hover:max-w-20 group-hover:opacity-100 group-focus-within:mr-2 group-focus-within:max-w-20 group-focus-within:opacity-100">
        {t('colorway.finish')}
      </span>
      <fieldset className="flex items-center gap-0 transition-[gap] duration-200 group-hover:gap-1 group-focus-within:gap-1">
        <legend className="sr-only">{t('colorway.legend')}</legend>
        {orderedColorways.map((colorway) => {
          const isSelected = colorway.value === value

          return (
            <label
              className={`relative grid cursor-pointer place-items-center rounded-full shadow-sm transition-[width,height,opacity,transform] duration-200 hover:scale-110 has-focus-visible:outline-none has-focus-visible:ring-2 has-focus-visible:ring-white has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-slate-950 ${
                isSelected
                  ? 'size-6 border border-white/35'
                  : 'pointer-events-none invisible size-0 scale-75 opacity-0 group-hover:pointer-events-auto group-hover:visible group-hover:size-6 group-hover:scale-100 group-hover:border group-hover:border-white/35 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:size-6 group-focus-within:scale-100 group-focus-within:border group-focus-within:border-white/35 group-focus-within:opacity-100'
              }`}
              key={colorway.value}
              style={{ backgroundColor: colorway.swatch }}
              title={t(`colorway.${colorway.value.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())}`)}
            >
              <input
                aria-label={t('colorway.option', { colour: t(`colorway.${colorway.value.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())}`) })}
                checked={isSelected}
                className="sr-only"
                name="fm1-colorway"
                onChange={() => onChange(colorway.value)}
                type="radio"
                value={colorway.value}
              />
              {isSelected ? (
                <Check
                  aria-hidden="true"
                  className="size-3.5 text-white drop-shadow-[0_1px_1px_rgb(0_0_0_/_0.9)]"
                  strokeWidth={3}
                />
              ) : null}
            </label>
          )
        })}
      </fieldset>
      </div>
    </div>
  )
}
