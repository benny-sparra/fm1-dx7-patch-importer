const fm1BankSelectionDismissalKey = 'fm1-bank-selection-dialog-dismissed'

export function dismissFm1BankSelectionDialogForSession() {
  sessionStorage.setItem(fm1BankSelectionDismissalKey, 'true')
}

export function shouldShowFm1BankSelectionDialog() {
  return sessionStorage.getItem(fm1BankSelectionDismissalKey) !== 'true'
}
