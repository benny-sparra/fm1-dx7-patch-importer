export function createBankFileSelectionTarget() {
  let bank: string | null = null

  return {
    begin(nextBank: string) {
      bank = nextBank
    },
    consume() {
      const selectedBank = bank
      bank = null
      return selectedBank
    },
  }
}
