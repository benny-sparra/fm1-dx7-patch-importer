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
