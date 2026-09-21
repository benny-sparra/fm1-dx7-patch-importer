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
  release?: string
}

const sentryDsn =
  'https://7b1d3bf3196f9dcdac24f9ea0401f275@o4511966934859776.ingest.de.sentry.io/4511966958846032'
const androidNavigationLoggerUrl = 'iabjs://navigation_performance_logger_android'

function removeUrlDetails(value: string) {
  return value.replace(/[?#].*$/u, '')
}

// Each browser words a failed lazy-chunk request differently; Vite adds its own for stylesheets.
// Pages answers a removed chunk with the app's HTML, which Safari reports as a MIME type error.
const dynamicImportFailureMessages = [
  /^Failed to fetch dynamically imported module\b/u,
  /^error loading dynamically imported module\b/u,
  /^Importing a module script failed\b/u,
  /^'text\/html' is not a valid JavaScript MIME type\b/u,
  /^Unable to preload CSS for\b/u,
]

/**
 * A lazy chunk fails to load when a tab outlives a deployment. An error boundary that caught it
 * has already told the user to reload, so reporting it would only add noise after every deploy.
 */
function isContainedDynamicImportFailure(error: unknown) {
  return (
    error instanceof Error &&
    dynamicImportFailureMessages.some((pattern) => pattern.test(error.message))
  )
}

function isAndroidNavigationLoggerError(event: {
  exception?: {
    values?: { stacktrace?: { frames?: { filename?: string }[] } }[]
  }
}) {
  const filenames =
    event.exception?.values?.flatMap(
      (exception) => exception.stacktrace?.frames?.flatMap((frame) => frame.filename ?? []) ?? [],
    ) ?? []
  const attributableFilenames = filenames.filter((filename) => filename !== '<anonymous>')

  return (
    attributableFilenames.length > 0 &&
    attributableFilenames.every((filename) => filename.startsWith(androidNavigationLoggerUrl))
  )
}

export function createMonitoringInitializer({
  dsn,
  enableVerificationMetrics = false,
  environment,
  loadSdk,
  onInitialized,
  release,
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
            if (isAndroidNavigationLoggerError(event)) return null

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
          release,
          replaysOnErrorSampleRate: 0,
          replaysSessionSampleRate: 0,
          tracesSampleRate: 0,
        })

        const reactErrorHandler = sentry.reactErrorHandler()
        onInitialized?.(sentry)
        const reportUnlessContainedDynamicImportFailure = (
          error: unknown,
          errorInfo: ErrorInfo,
        ) => {
          if (isContainedDynamicImportFailure(error)) return
          reactErrorHandler(error, errorInfo)
        }

        return {
          onCaughtError: reportUnlessContainedDynamicImportFailure,
          // React reports a failed lazy chunk here as well as to the boundary that caught it.
          onRecoverableError: reportUnlessContainedDynamicImportFailure,
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

/**
 * Which operating-system family the browser runs on, as one of a fixed set. Linux browsers send
 * MIDI through the ALSA sequencer, which drops a bank that overruns its output buffer, so a
 * transfer failure there is a known environment limit rather than a fault to investigate. Nothing
 * finer than the family is reported, and an unrecognised platform stays `other`.
 */
export type CoarsePlatform = 'android' | 'ios' | 'linux' | 'macos' | 'other' | 'windows'

type CoarsePlatformSource = {
  platform?: string
  userAgent?: string
  userAgentData?: { platform?: string }
}

export function resolveCoarsePlatform(source: CoarsePlatformSource | undefined): CoarsePlatform {
  const hint =
    `${source?.userAgentData?.platform ?? ''} ${source?.platform ?? ''} ${source?.userAgent ?? ''}`.toLowerCase()
  const names = (...values: string[]) => values.some((value) => hint.includes(value))

  // Android names Linux and iPadOS names Macintosh, so the more specific family is matched first.
  if (names('android')) return 'android'
  if (names('iphone', 'ipad', 'ipod')) return 'ios'
  if (names('mac')) return 'macos'
  if (names('win')) return 'windows'
  if (names('linux', 'x11')) return 'linux'
  return 'other'
}

function currentCoarsePlatform(): CoarsePlatform {
  try {
    return resolveCoarsePlatform(globalThis.navigator as CoarsePlatformSource | undefined)
  } catch {
    // A blocked or absent navigator leaves the platform unknown rather than losing the report.
    return 'other'
  }
}

export function captureBankTransferFailure(
  sentry: BankTransferCaptureSdk,
  context: BankTransferFailureContext,
  platform: CoarsePlatform = currentCoarsePlatform(),
) {
  const midiTransferContext: Record<string, boolean | number | string> = {
    channel: context.channel,
    platform,
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
  // A build served without one, such as a local production build, reports no release at all rather
  // than filing its events under a name that matches no deployment.
  release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
  onInitialized(sentry) {
    initializedSentry = sentry
  },
})
