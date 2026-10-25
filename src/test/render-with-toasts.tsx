import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'

import { ToastProvider } from '@/components/ui/toast'

/** Renders a page that says things as toasts, inside the provider the app mounts above it. */
export function renderWithToasts(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { ...options, wrapper: ToastProvider })
}
