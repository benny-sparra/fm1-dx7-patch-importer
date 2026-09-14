import { findDx7CatalogBank } from '@/data/dx7-bank-catalog'
import { parseDx7Bank, type Dx7Voice } from '@/lib/dx7'

type FetchBank = (input: string) => Promise<Pick<Response, 'arrayBuffer' | 'ok'>>

/** A catalog bank that could not be downloaded, for example while offline. */
export class Dx7CatalogBankUnavailableError extends Error {
  constructor(bankName: string, cause?: unknown) {
    super(`The ${bankName} sound bank could not be loaded.`, { cause })
    this.name = 'Dx7CatalogBankUnavailableError'
  }
}

export async function loadDx7CatalogBank(
  id: string,
  fetchBank: FetchBank = (input) => fetch(input),
): Promise<Dx7Voice[]> {
  const bank = findDx7CatalogBank(id)
  if (!bank) throw new Error('Choose a sound bank from the catalog.')

  let response: Awaited<ReturnType<FetchBank>>
  try {
    response = await fetchBank(bank.file)
  } catch (error) {
    throw new Dx7CatalogBankUnavailableError(bank.name, error)
  }
  if (!response.ok) throw new Dx7CatalogBankUnavailableError(bank.name)
  return parseDx7Bank(await response.arrayBuffer())
}
