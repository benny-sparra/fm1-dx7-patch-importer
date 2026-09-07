import { useTranslation } from 'react-i18next'

type Translate = ReturnType<typeof useTranslation>['t']

type WorkspaceBankNames = {
  bankNames: Record<string, string>
  workspaceBanks: string[]
}

/** The default title for the workspace bank in a given position, used until a user names it. */
export function defaultWorkspaceBankTitle(t: Translate, bankNumber: number) {
  return t(bankNumber < 10 ? 'banks.bank' : 'banks.bankShort', { bank: bankNumber })
}

/**
 * Resolves the name a user sees for a workspace bank. Prefer this over the bare bank letter in
 * anything user-facing, so a bank a user has named is not reported back to them as "C".
 */
export function useWorkspaceBankLabel({ bankNames, workspaceBanks }: WorkspaceBankNames) {
  const { t } = useTranslation()
  return (bank: string) =>
    bankNames[bank] ?? defaultWorkspaceBankTitle(t, workspaceBanks.indexOf(bank) + 1)
}
