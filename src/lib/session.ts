const fm1BankSelectionDismissalKey = 'fm1-bank-selection-dialog-dismissed'

// Session storage can be blocked or throw. Sending a bank must still work, so a failure only means
// the bank selection guide shows again.

export function dismissFm1BankSelectionDialogForSession() {
  try {
    sessionStorage.setItem(fm1BankSelectionDismissalKey, 'true')
  } catch {
    // The dismissal is not remembered, and the guide returns on the next send.
  }
}

export function shouldShowFm1BankSelectionDialog() {
  try {
    return sessionStorage.getItem(fm1BankSelectionDismissalKey) !== 'true'
  } catch {
    return true
  }
}
