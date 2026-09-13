// @vitest-environment jsdom

import { cleanup, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { i18nReady, idleTasks, initializeMonitoring, resolveI18n, runWhenIdle } = vi.hoisted(() => {
  let resolvePendingI18n: () => void
  const pendingI18n = new Promise<void>((resolve) => {
    resolvePendingI18n = resolve
  })
  const pendingIdleTasks: (() => void)[] = []

  return {
    i18nReady: pendingI18n,
    idleTasks: pendingIdleTasks,
    initializeMonitoring: vi.fn(() => new Promise(() => {})),
    resolveI18n: () => resolvePendingI18n(),
    runWhenIdle: vi.fn((task: () => void) => {
      pendingIdleTasks.push(task)
    }),
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

vi.mock('./lib/run-when-idle.ts', () => ({ runWhenIdle }))

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

  it('defers loading monitoring until the page is idle', async () => {
    await import('./main.tsx')
    resolveI18n()
    await screen.findByText('Application rendered')

    expect(initializeMonitoring).not.toHaveBeenCalled()
    expect(idleTasks).toHaveLength(1)

    idleTasks[0]()
    expect(initializeMonitoring).toHaveBeenCalledOnce()
  })
})
