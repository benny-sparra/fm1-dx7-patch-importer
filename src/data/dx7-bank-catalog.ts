/** Catalog groups in the order the bank picker lists them. */
export const dx7BankCatalogCategories = [
  'Factory',
  'FM-1 Factory',
  'VRC Voice ROMs',
  'Grey Matter E!',
] as const

type Dx7BankCatalogEntry = {
  category: (typeof dx7BankCatalogCategories)[number]
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
  category: 'Factory',
  description,
  file: `/dx7-banks/factory/${id}.syx`,
  id,
  name,
}))

// The M-VAVE FM-1's own stock presets, recovered from M-VAVE's preset-restore tool by
// KingParamount and released under CC0: https://github.com/KingParamount/fm1-factory-presets
// (commit 18ea89eab2b27c4c2c51c095ab063253ae658b88). The files are unchanged, including the
// device's naming quirks. The voices trace to Yamaha ROM/VRC cartridges and the Dexed_cart 1.0
// collection, as selected and renamed by M-VAVE. Descriptions use the FM-1's category names.
const fm1FactoryBanks: Dx7BankCatalogEntry[] = [
  'PIANO, ORGAN, SYN LEAD, SYN PAD',
  'GUITAR, DS GUITAR, BASS, SYN BASS',
  'BRASS, WOODWIND, STRING, VOICE',
  'Percussion & effects',
].map((description, index) => ({
  category: 'FM-1 Factory',
  description,
  file: `/dx7-banks/fm1/bank${index + 1}.syx`,
  id: `fm1-bank${index + 1}`,
  name: `FM-1 Bank ${index + 1}`,
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

/** Banks bundled locally so imports work without a third-party request. */
export const dx7BankCatalog = [...factoryBanks, ...fm1FactoryBanks, ...vrcBanks, ...greyMatterBanks]

const catalogCategoryLabelKeys: Partial<Record<Dx7BankCatalogEntry['category'], string>> = {
  Factory: 'banks.catalogFactory',
  'FM-1 Factory': 'banks.catalogFm1Factory',
}

/** The locale key for a translated group name; product names have none and stay as written. */
export function dx7BankCatalogCategoryLabelKey(category: Dx7BankCatalogEntry['category']) {
  return catalogCategoryLabelKeys[category]
}

export function findDx7CatalogBank(id: string) {
  return dx7BankCatalog.find((bank) => bank.id === id)
}
