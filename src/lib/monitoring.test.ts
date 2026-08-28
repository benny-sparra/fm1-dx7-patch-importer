import { describe, expect, it, vi } from 'vitest'

import {
  captureBankTransferFailure,
  createMonitoringInitializer,
  runSentryVerification,
} from './monitoring'

function createSdk() {
  const reactErrorHandler = vi.fn()
  return {
    handler: reactErrorHandler,
    sdk: {
      captureException: vi.fn(),
      init: vi.fn(),
      logger: { info: vi.fn() },
      metrics: { count: vi.fn() },
      reactErrorHandler: vi.fn(() => reactErrorHandler),
    },
  }
}

describe('Sentry monitoring', () => {
  it('stays disabled without a configured DSN', async () => {
    const loadSdk = vi.fn()
    const initialize = createMonitoringInitializer({ dsn: '  ', environment: 'test', loadSdk })

    await expect(initialize()).resolves.toEqual({})
    expect(loadSdk).not.toHaveBeenCalled()
  })

  it('initializes error reporting and logs without broad user-data collection', async () => {
    const { sdk } = createSdk()
    const initialize = createMonitoringInitializer({
      dsn: 'https://public@example.invalid/123',
      environment: 'production',
      loadSdk: async () => sdk,
    })

    await initialize()

    expect(sdk.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dataCollection: {
          cookies: false,
          databaseQueryData: false,
          frameContextLines: 5,
          genAI: { inputs: false, outputs: false },
          graphQL: { document: false, variables: false },
          httpBodies: [],
          httpHeaders: { request: false, response: false },
          stackFrameVariables: false,
          urlQueryParams: false,
          userInfo: false,
        },
        dsn: 'https://public@example.invalid/123',
        enableLogs: true,
        enableMetrics: false,
        environment: 'production',
        replaysOnErrorSampleRate: 0,
        replaysSessionSampleRate: 0,
        tracesSampleRate: 0,
      }),
    )
  })

  it('enables metrics only for an explicitly configured verification build', async () => {
    const { sdk } = createSdk()
    const initialize = createMonitoringInitializer({
      dsn: 'https://public@example.invalid/123',
      enableVerificationMetrics: true,
      environment: 'production',
      loadSdk: async () => sdk,
    })

    await initialize()

    expect(sdk.init).toHaveBeenCalledWith(expect.objectContaining({ enableMetrics: true }))
  })

  it('removes potentially identifying breadcrumbs and URL details before sending', async () => {
    const { sdk } = createSdk()
    const initialize = createMonitoringInitializer({
      dsn: 'https://public@example.invalid/123',
      environment: 'production',
      loadSdk: async () => sdk,
    })

    await initialize()
    const options = sdk.init.mock.calls[0][0]

    expect(
      options.beforeBreadcrumb?.({ category: 'ui.click', message: 'Private patch name' }),
    ).toBe(null)
    expect(
      options.beforeBreadcrumb?.({
        category: 'navigation',
        data: { from: '/?secret=one#fragment', to: '/editor?secret=two', untouched: 3 },
      }),
    ).toEqual({
      category: 'navigation',
      data: { from: '/', to: '/editor', untouched: 3 },
    })

    const event = {
      request: {
        cookies: { private: 'cookie' },
        data: 'private body',
        headers: { authorization: 'private token' },
        url: 'https://example.com/editor?patch=private#operator',
      },
      user: { email: 'private@example.com' },
    }
    expect(options.beforeSend?.(event)).toEqual({
      request: { url: 'https://example.com/editor' },
    })
  })

  it('drops errors raised entirely by the Android in-app navigation logger', async () => {
    const { sdk } = createSdk()
    const initialize = createMonitoringInitializer({
      dsn: 'https://public@example.invalid/123',
      environment: 'production',
      loadSdk: async () => sdk,
    })

    await initialize()
    const options = sdk.init.mock.calls[0][0]
    const event = {
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Error invoking postMessage: Java exception was raised during method invocation',
            stacktrace: {
              frames: [
                { filename: 'iabjs://navigation_performance_logger_android' },
                { filename: 'iabjs://navigation_performance_logger_android' },
                { filename: '<anonymous>' },
              ],
            },
          },
        ],
      },
    }

    expect(options.beforeSend?.(event)).toBeNull()
  })

  it('keeps bridge errors that also contain an application frame', async () => {
    const { sdk } = createSdk()
    const initialize = createMonitoringInitializer({
      dsn: 'https://public@example.invalid/123',
      environment: 'production',
      loadSdk: async () => sdk,
    })

    await initialize()
    const options = sdk.init.mock.calls[0][0]
    const event = {
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Error invoking postMessage: Java exception was raised during method invocation',
            stacktrace: {
              frames: [
                { filename: 'iabjs://navigation_performance_logger_android' },
                { filename: 'https://fm1-editor.com/assets/index.js' },
              ],
            },
          },
        ],
      },
    }

    expect(options.beforeSend?.(event)).toBe(event)
  })

  it('provides Sentry handlers for React root errors', async () => {
    const { handler, sdk } = createSdk()
    const initialize = createMonitoringInitializer({
      dsn: 'https://public@example.invalid/123',
      environment: 'production',
      loadSdk: async () => sdk,
    })

    await expect(initialize()).resolves.toEqual({
      onCaughtError: handler,
      onRecoverableError: handler,
      onUncaughtError: handler,
    })
  })

  it('initializes the SDK only once when startup is repeated', async () => {
    const { sdk } = createSdk()
    const loadSdk = vi.fn(async () => sdk)
    const initialize = createMonitoringInitializer({
      dsn: 'https://public@example.invalid/123',
      environment: 'production',
      loadSdk,
    })

    await Promise.all([initialize(), initialize()])

    expect(loadSdk).toHaveBeenCalledOnce()
    expect(sdk.init).toHaveBeenCalledOnce()
  })

  it('lets the application start when the SDK chunk cannot load', async () => {
    const initialize = createMonitoringInitializer({
      dsn: 'https://public@example.invalid/123',
      environment: 'production',
      loadSdk: () => Promise.reject(new Error('stale deployment chunk')),
    })

    await expect(initialize()).resolves.toEqual({})
  })

  it('sends the fixed onboarding log and metric before throwing the verification error', () => {
    const { sdk } = createSdk()

    expect(() => runSentryVerification(sdk)).toThrow('This is your first error!')
    expect(sdk.logger.info).toHaveBeenCalledOnce()
    expect(sdk.logger.info).toHaveBeenCalledWith('User triggered test error', {
      action: 'test_error_button_click',
    })
    expect(sdk.metrics.count).toHaveBeenCalledOnce()
    expect(sdk.metrics.count).toHaveBeenCalledWith('test_counter', 1)
  })

  it('reports a bank transport stack with fixed privacy-safe diagnostics', () => {
    const { sdk } = createSdk()

    captureBankTransferFailure(sdk, {
      channel: 4,
      stage: 'controller',
      sysexAvailable: true,
      voiceCount: 32,
    })

    const [reportedError, captureContext] = sdk.captureException.mock.calls[0]
    expect(reportedError).toBeInstanceOf(Error)
    expect(reportedError.message).toBe('MIDI bank transfer failed')
    expect(reportedError.stack).toContain('captureBankTransferFailure')
    expect(captureContext).toEqual({
      contexts: {
        midi_transfer: {
          channel: 4,
          stage: 'controller',
          sysex_available: true,
          voice_count: 32,
        },
      },
      tags: {
        analytics_event: 'bank_transfer_failed',
        failure_reason: 'transport',
      },
    })
  })

  it('keeps a Sentry reporting failure from interrupting MIDI recovery', () => {
    const { sdk } = createSdk()
    sdk.captureException.mockImplementation(() => {
      throw new Error('Sentry unavailable')
    })

    expect(() =>
      captureBankTransferFailure(sdk, {
        channel: 1,
        stage: 'controller',
        sysexAvailable: true,
        voiceCount: 32,
      }),
    ).not.toThrow()
  })
})
