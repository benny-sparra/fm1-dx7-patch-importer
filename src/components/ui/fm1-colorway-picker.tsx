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
    // The current colourway is a lit bevelled swatch; the others slide out to
    // its left on hover or focus, so the header row keeps its width.
    <div className="relative size-[26px] shrink-0">
      <fieldset className="group absolute top-0 right-0 z-40 flex flex-row-reverse items-center gap-0 transition-[gap] duration-200 focus-within:gap-1.5 hover:gap-1.5">
        <legend className="sr-only">{t('colorway.legend')}</legend>
        {orderedColorways.map((colorway) => {
          const isSelected = colorway.value === value

          return (
            <label
              className={`relative grid shrink-0 cursor-pointer place-items-center overflow-hidden transition-[width,opacity] duration-200 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[var(--crt-led)] ${
                isSelected
                  ? 'crt-raised-lit size-[26px] bg-[var(--crt-sel-bg)]'
                  : 'crt-raised-thin pointer-events-none invisible h-[26px] w-0 border-x-0 bg-[var(--crt-btn-face)] opacity-0 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:w-[26px] group-focus-within:border-x group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:visible group-hover:w-[26px] group-hover:border-x group-hover:opacity-100 hover:bg-[var(--crt-sel-bg)]'
              }`}
              key={colorway.value}
              title={t(
                `colorway.${colorway.value.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())}`,
              )}
            >
              <input
                aria-label={t('colorway.option', {
                  colour: t(
                    `colorway.${colorway.value.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())}`,
                  ),
                })}
                checked={isSelected}
                className="sr-only"
                name="fm1-colorway"
                onChange={() => onChange(colorway.value)}
                type="radio"
                value={colorway.value}
              />
              <span
                aria-hidden="true"
                className="block size-3.5 shrink-0 border border-[var(--crt-shadow)]"
                style={{ backgroundColor: colorway.swatch }}
              />
            </label>
          )
        })}
      </fieldset>
    </div>
  )
}
