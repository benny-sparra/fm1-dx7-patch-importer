import type { ErrorInfo } from 'react'

type ReactErrorHandler = (error: unknown, errorInfo: ErrorInfo) => void

export type MonitoringRootOptions = {
  onCaughtError?: ReactErrorHandler
  onRecoverableError?: ReactErrorHandler
  onUncaughtError?: ReactErrorHandler
}

type SentryModule = typeof import('./sentry-sdk')
type SentrySdk = Pick<SentryModule, 'captureException' | 'init' | 'reactErrorHandler'> & {
  logger: Pick<SentryModule['logger'], 'info'>
  metrics: Pick<SentryModule['metrics'], 'count'>
}

type MonitoringConfiguration = {
  dsn?: string
  enableVerificationMetrics?: boolean
  environment: string
  loadSdk: () => Promise<SentrySdk>
  onInitialized?: (sentry: SentrySdk) => void
}

const sentryDsn =
  'https://7b1d3bf3196f9dcdac24f9ea0401f275@o4511966934859776.ingest.de.sentry.io/4511966958846032'

function removeUrlDetails(value: string) {
  return value.replace(/[?#].*$/u, '')
}

export function createMonitoringInitializer({
  dsn,
  enableVerificationMetrics = false,
  environment,
  loadSdk,
  onInitialized,
}: MonitoringConfiguration) {
  let initialization: Promise<MonitoringRootOptions> | undefined

  return function initializeMonitoring(): Promise<MonitoringRootOptions> {
    if (!dsn?.trim()) return Promise.resolve({})

    initialization ??= loadSdk()
      .then((sentry) => {
        sentry.init({
          beforeBreadcrumb(breadcrumb) {
            if (breadcrumb.category === 'console' || breadcrumb.category === 'ui.click') return null

            const data = breadcrumb.data
            if (!data) return breadcrumb

            return {
              ...breadcrumb,
              data: Object.fromEntries(
                Object.entries(data).map(([key, value]) => [
                  key,
                  (key === 'from' || key === 'to' || key === 'url') && typeof value === 'string'
                    ? removeUrlDetails(value)
                    : value,
                ]),
              ),
            }
          },
          beforeSend(event) {
            delete event.user
            if (event.request) {
              delete event.request.cookies
              delete event.request.data
              delete event.request.headers
              if (event.request.url) event.request.url = removeUrlDetails(event.request.url)
            }
            return event
          },
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
          dsn,
          enableLogs: true,
          enableMetrics: enableVerificationMetrics,
          environment,
          replaysOnErrorSampleRate: 0,
          replaysSessionSampleRate: 0,
          tracesSampleRate: 0,
        })

        const reactErrorHandler = sentry.reactErrorHandler()
        onInitialized?.(sentry)
        return {
          onCaughtError: reactErrorHandler,
          onRecoverableError: reactErrorHandler,
          onUncaughtError: reactErrorHandler,
        }
      })
      .catch(() => ({}))

    return initialization
  }
}

type SentryVerificationSdk = Pick<SentrySdk, 'logger' | 'metrics'>

type BankTransferFailureContext = {
  channel: number
  stage: 'controller' | 'page'
  sysexAvailable: boolean
  voiceCount?: number
}

type BankTransferCaptureSdk = Pick<SentrySdk, 'captureException'>

export function captureBankTransferFailure(
  sentry: BankTransferCaptureSdk,
  context: BankTransferFailureContext,
) {
  const midiTransferContext: Record<string, boolean | number | string> = {
    channel: context.channel,
    stage: context.stage,
    sysex_available: context.sysexAvailable,
  }
  if (context.voiceCount !== undefined) midiTransferContext.voice_count = context.voiceCount

  try {
    sentry.captureException(new Error('MIDI bank transfer failed'), {
      contexts: { midi_transfer: midiTransferContext },
      tags: {
        analytics_event: 'bank_transfer_failed',
        failure_reason: 'transport',
      },
    })
  } catch {
    // Monitoring is best-effort and must never interrupt MIDI recovery.
  }
}

export function runSentryVerification(sentry: SentryVerificationSdk): never {
  sentry.logger.info('User triggered test error', {
    action: 'test_error_button_click',
  })
  sentry.metrics.count('test_counter', 1)
  throw new Error('This is your first error!')
}

let initializedSentry: SentrySdk | undefined

export function triggerSentryVerification(): never {
  if (!initializedSentry) {
    throw new Error('Sentry verification requires initialized production monitoring.')
  }
  return runSentryVerification(initializedSentry)
}

export function reportBankTransferFailure(context: BankTransferFailureContext) {
  if (!initializedSentry) return
  captureBankTransferFailure(initializedSentry, context)
}

export const initializeMonitoring = createMonitoringInitializer({
  dsn: import.meta.env.PROD ? sentryDsn : undefined,
  enableVerificationMetrics: import.meta.env.VITE_SENTRY_VERIFY === 'true',
  environment: import.meta.env.MODE,
  loadSdk: () => import('./sentry-sdk'),
  onInitialized(sentry) {
    initializedSentry = sentry
  },
})
