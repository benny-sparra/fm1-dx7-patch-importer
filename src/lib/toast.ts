type ToastKind = 'success'

export type ToastAction = {
  label: string
  onAction: () => void
}

export type ToastMessage = {
  action?: ToastAction
  id: number
  kind: ToastKind
  message: string
}

export function appendToast(current: ToastMessage[], toast: ToastMessage, limit = 4) {
  const message = toast.message.trim()
  if (!message) return current
  return [...current, { ...toast, message }].slice(-Math.max(1, limit))
}

export function removeToast(current: ToastMessage[], id: number) {
  return current.filter((toast) => toast.id !== id)
}
