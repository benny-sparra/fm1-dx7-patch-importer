// @vitest-environment jsdom

import { cleanup, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { i18nReady, initializeMonitoring, resolveI18n } = vi.hoisted(() => {
  let resolvePendingI18n: () => void
  const pendingI18n = new Promise<void>((resolve) => {
    resolvePendingI18n = resolve
  })

  return {
    i18nReady: pendingI18n,
    initializeMonitoring: vi.fn(() => new Promise(() => {})),
    resolveI18n: () => resolvePendingI18n(),
  }
})

vi.mock('./App.tsx', () => ({
  default: () => <p>Application rendered</p>,
}))

vi.mock('./components/ui/toast.tsx', () => ({
  ToastProvider: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('./i18n', () => ({ i18nReady }))

vi.mock('./lib/monitoring.ts', () => ({ initializeMonitoring }))

describe('application startup', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders after localisation without waiting for optional monitoring', async () => {
    document.body.innerHTML = '<div id="root"></div>'

    await import('./main.tsx')
    resolveI18n()

    expect(await screen.findByText('Application rendered')).toBeTruthy()
  })
})
