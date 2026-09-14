import { CheckCircle2, X } from 'lucide-react'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'

import { appendToast, removeToast, type ToastAction, type ToastMessage } from '@/lib/toast'

const toastDuration = 4_500

type ToastContextValue = {
  success: (message: string, options?: { action?: ToastAction }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

function ToastItem({ dismiss, toast }: { dismiss: (id: number) => void; toast: ToastMessage }) {
  const { t } = useTranslation()
  // A notification under the pointer or holding keyboard focus is being read, so it waits, and gets
  // its full time again once attention moves on. The listeners are native because a status message
  // is not a control.
  const itemRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const paused = hovered || focused

  useEffect(() => {
    const item = itemRef.current
    if (!item) return
    const enter = () => setHovered(true)
    const leave = () => setHovered(false)
    const focusIn = () => setFocused(true)
    const focusOut = (event: FocusEvent) => {
      if (!item.contains(event.relatedTarget as Node | null)) setFocused(false)
    }
    item.addEventListener('pointerenter', enter)
    item.addEventListener('pointerleave', leave)
    item.addEventListener('focusin', focusIn)
    item.addEventListener('focusout', focusOut)
    return () => {
      item.removeEventListener('pointerenter', enter)
      item.removeEventListener('pointerleave', leave)
      item.removeEventListener('focusin', focusIn)
      item.removeEventListener('focusout', focusOut)
    }
  }, [])

  useEffect(() => {
    if (paused) return
    const timeout = window.setTimeout(() => dismiss(toast.id), toastDuration)
    return () => window.clearTimeout(timeout)
  }, [dismiss, paused, toast.id])

  return (
    <div
      className="toast-surface pointer-events-auto flex w-full items-start gap-3 rounded-lg border border-emerald-400/25 bg-card px-4 py-3 text-foreground"
      ref={itemRef}
      role="status"
    >
      <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-400" />
      <p className="min-w-0 flex-1 text-sm leading-5 font-semibold">{toast.message}</p>
      {toast.action ? (
        <button
          className="-my-1 shrink-0 cursor-pointer rounded px-2 py-1 text-sm font-bold text-[var(--crt-acc-lt)] transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          onClick={() => {
            toast.action?.onAction()
            dismiss(toast.id)
          }}
          type="button"
        >
          {toast.action.label}
        </button>
      ) : null}
      <button
        aria-label={t('toasts.dismiss')}
        className="-mr-1 grid size-7 shrink-0 cursor-pointer place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        onClick={() => dismiss(toast.id)}
        type="button"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const nextId = useRef(0)
  const dismiss = useCallback((id: number) => {
    setToasts((current) => removeToast(current, id))
  }, [])
  const success = useCallback((message: string, options: { action?: ToastAction } = {}) => {
    const toast: ToastMessage = {
      action: options.action,
      id: ++nextId.current,
      kind: 'success',
      message,
    }
    setToasts((current) => appendToast(current, toast))
  }, [])
  const value = useMemo(() => ({ success }), [success])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <section
        aria-label={t('toasts.notifications')}
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-3 z-[100] ml-auto grid w-auto max-w-sm gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-full"
      >
        {toasts.map((toast) => (
          <ToastItem dismiss={dismiss} key={toast.id} toast={toast} />
        ))}
      </section>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider.')
  return context
}
