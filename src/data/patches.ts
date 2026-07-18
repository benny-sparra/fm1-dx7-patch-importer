export type Patch = {
  id: string
  bank: string
  number: number
  program: number
  name: string
  family: string
}

const families = [
  'Keys',
  'Bell',
  'Bass',
  'Lead',
  'Pad',
  'Organ',
  'Pluck',
  'Perc',
]

const names = [
  'E.Piano',
  'Glass Bell',
  'Rubber Bass',
  'Mono Lead',
  'Warm Pad',
  'Drawbar',
  'Toy Pluck',
  'Metal Hit',
]

export const patches: Patch[] = Array.from({ length: 128 }, (_, index) => {
  const bankIndex = Math.floor(index / 32)
  const slot = (index % 32) + 1
  const family = families[index % families.length]

  return {
    id: `factory-${index + 1}`,
    bank: String.fromCharCode(65 + bankIndex),
    number: slot,
    program: index,
    name: `${names[index % names.length]} ${Math.floor(index / families.length) + 1}`,
    family,
  }
})
