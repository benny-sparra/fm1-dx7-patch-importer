export const fm1Colorways = [
  { label: 'Black', swatch: '#25282a', value: 'black' },
  { label: 'Purple', swatch: '#b77dcc', value: 'purple' },
  { label: 'Orange', swatch: '#c66f4f', value: 'orange' },
  { label: 'Black-Green', swatch: '#72d4c5', value: 'black-green' },
  { label: 'Cool Gray', swatch: '#d9d4cd', value: 'cool-gray' },
  { label: 'White-Blue', swatch: '#6588aa', value: 'white-blue' },
] as const

export type Fm1Colorway = (typeof fm1Colorways)[number]['value']

export function normalizeFm1Colorway(value: string | null): Fm1Colorway {
  return fm1Colorways.some((colorway) => colorway.value === value)
    ? (value as Fm1Colorway)
    : 'black'
}

/**
 * The SMK-37's finishes, offered while an SMK-37 is identified. White is the one photographed so
 * far; another is added with its photo.
 */
export const smk37Colorways = [{ label: 'White', swatch: '#e4e5e2', value: 'smk-white' }] as const

export type Smk37Colorway = (typeof smk37Colorways)[number]['value']

/** A finish of either device, as the page's tokens and favicon name it. */
export type Colorway = Fm1Colorway | Smk37Colorway

export function normalizeSmk37Colorway(value: string | null): Smk37Colorway {
  return smk37Colorways.some((colorway) => colorway.value === value)
    ? (value as Smk37Colorway)
    : 'smk-white'
}
