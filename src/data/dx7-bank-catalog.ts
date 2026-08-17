export type Dx7BankCatalogEntry = {
  category: 'Factory' | 'Grey Matter E!' | 'VRC Voice ROMs'
  description: string
  file: string
  id: string
  name: string
}

const factoryBanks: Dx7BankCatalogEntry[] = [
  ['rom1a', 'ROM1A Master', 'EU/JP'],
  ['rom1b', 'ROM1B Keyboard & Plucked', 'EU/JP'],
  ['rom2a', 'ROM2A Orchestral & Percussive', 'EU/JP'],
  ['rom2b', 'ROM2B Synth, Complex & Effects', 'EU/JP'],
  ['rom3a', 'ROM3A Master', 'US'],
  ['rom3b', 'ROM3B Keyboard & Plucked', 'US'],
  ['rom4a', 'ROM4A Orchestral & Percussive', 'US'],
  ['rom4b', 'ROM4B Synth, Complex & Effects', 'US'],
].map(([id, name, description]) => ({
  category: 'Factory', description, file: `/dx7-banks/factory/${id}.syx`, id, name,
}))

const vrcDescriptions = [
  'Keyboard, Plucked & Tuned Percussion',
  'Wind Instruments',
  'Sustain',
  'Percussion',
  'Sound Effects',
  'Synthesizer',
  'David Bristow Selection',
  'Gary Leuenberger Selection',
  'Studio 64',
  'Bo Tomlyn Selection',
  'Bo Tomlyn Selection II',
  'Live 64 – Akira Inoue',
]

const vrcBanks = vrcDescriptions.flatMap((description, index) => {
  const number = 101 + index
  return (['a', 'b'] as const).map((side) => {
    const id = `vrc${number}${side}`
    return {
      category: 'VRC Voice ROMs' as const,
      description,
      file: `/dx7-banks/vrc/${id}.syx`,
      id,
      name: `VRC${number}${side.toUpperCase()}`,
    }
  })
})

const greyMatterBanks: Dx7BankCatalogEntry[] = [2, 5, 7].map((number) => ({
  category: 'Grey Matter E!',
  description: `Soundbank Disk #${number}`,
  file: `/dx7-banks/greymatter/${number}.syx`,
  id: `greymatter-${number}`,
  name: `E! Card Disk #${number}`,
}))

/** Banks mirrored from Yamaha Black Boxes so imports work without a third-party request. */
export const dx7BankCatalog = [...factoryBanks, ...vrcBanks, ...greyMatterBanks]

export function findDx7CatalogBank(id: string) {
  return dx7BankCatalog.find((bank) => bank.id === id)
}
