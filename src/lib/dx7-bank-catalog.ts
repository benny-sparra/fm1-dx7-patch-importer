import { findDx7CatalogBank } from '@/data/dx7-bank-catalog'
import { parseDx7Bank, type Dx7Voice } from '@/lib/dx7'

type FetchBank = (input: string) => Promise<Pick<Response, 'arrayBuffer' | 'ok'>>

export async function loadDx7CatalogBank(
  id: string,
  fetchBank: FetchBank = (input) => fetch(input),
): Promise<Dx7Voice[]> {
  const bank = findDx7CatalogBank(id)
  if (!bank) throw new Error('Choose a sound bank from the catalog.')

  const response = await fetchBank(bank.file)
  if (!response.ok) throw new Error(`The ${bank.name} sound bank could not be loaded.`)
  return parseDx7Bank(await response.arrayBuffer())
}
