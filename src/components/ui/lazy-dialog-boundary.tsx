import { Suspense, type ReactNode } from 'react'

import { ErrorBoundary } from '@/components/ui/error-boundary'

/** Keeps a lazy dialog's load failure with the action that opened it. */
export function LazyDialogBoundary({
  children,
  onError,
}: {
  children: ReactNode
  onError: (error: unknown) => void
}) {
  return (
    <ErrorBoundary onError={onError}>
      <Suspense fallback={null}>{children}</Suspense>
    </ErrorBoundary>
  )
}
