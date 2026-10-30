import type { ErrorInfo } from 'react'

import type { MonitoringRootOptions } from './monitoring'

type SentryModule = typeof import('./sentry-sdk')
export type SentrySdk = Pick<SentryModule, 'captureException' | 'init' | 'reactErrorHandler'> & {
  logger: Pick<SentryModule['logger'], 'info'>
  metrics: Pick<SentryModule['metrics'], 'count'>
}

type MonitoringOptions = {
  dsn: string
  environment: string
  release?: string
}

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

// iOS apps that add Web MIDI to a WKWebView (WebMIDIAPIShimForiOS and its forks) call these globals
// from native code, but the shim defines them only once the page requests MIDI access. Input that
// arrives before then, such as after a reload, raises a ReferenceError the app never caused.
const iosWebMidiShimCallbackError =
  /^Can't find variable: _callback_(?:addDestination|addSource|onNotReady|onReady|receiveMIDIMessage|removeDestination|removeSource)$/u

function isIosWebMidiShimCallbackError(event: {
  exception?: { values?: { type?: string; value?: string }[] }
}) {
  const exceptions = event.exception?.values ?? []
  return (
    exceptions.length > 0 &&
    exceptions.every(
      (exception) =>
        exception.type === 'ReferenceError' &&
        iosWebMidiShimCallbackError.test(exception.value ?? ''),
    )
  )
}

// Safari rejects an extension content script's `runtime.sendMessage()` with this error when the
// tab it ran in has gone. The app has no extension API to call, and the error reaches the page's
// rejection handler from the extension's own world, so it carries no stack frame at all.
const safariExtensionMessageError = /^Invalid call to runtime\.sendMessage\(\)\. Tab not found\.$/u

function isSafariExtensionMessageError(event: {
  exception?: {
    values?: { stacktrace?: { frames?: unknown[] }; type?: string; value?: string }[]
  }
}) {
  const exceptions = event.exception?.values ?? []
  return (
    exceptions.length > 0 &&
    exceptions.every(
      (exception) =>
        exception.type === 'Error' &&
        safariExtensionMessageError.test(exception.value ?? '') &&
        !exception.stacktrace?.frames?.length,
    )
  )
}

// A script injected into a WKWebView, such as an in-app browser's or a content blocker's, reads
// `window.webkit.messageHandlers` where the host has not defined it. The app never touches
// `window.webkit`, and the rejection reaches the page with native frames only.
const webkitMessageHandlersError =
  /^undefined is not an object \(evaluating 'window\.webkit\.messageHandlers'\)$/u

function isWebkitMessageHandlersError(event: {
  exception?: {
    values?: {
      stacktrace?: { frames?: { filename?: string }[] }
      type?: string
      value?: string
    }[]
  }
}) {
  const exceptions = event.exception?.values ?? []
  return (
    exceptions.length > 0 &&
    exceptions.every(
      (exception) =>
        exception.type === 'TypeError' &&
        webkitMessageHandlersError.test(exception.value ?? '') &&
        (exception.stacktrace?.frames ?? []).every(
          (frame) => !frame.filename || frame.filename === '[native code]',
        ),
    )
  )
}

// The browser's own rejection event always carries `reason`, so Sentry reports the event object
// itself only when another script, such as an extension or a Bluebird-style promise library,
// dispatches an `unhandledrejection` event of its own with nothing in it the app rejected.
function isSyntheticUnhandledRejection(originalException: unknown) {
  return (
    typeof Event !== 'undefined' &&
    originalException instanceof Event &&
    originalException.type === 'unhandledrejection' &&
    !originalException.isTrusted
  )
}

/**
 * Starts Sentry with the app's privacy filters and returns the React root's error handlers. It
 * loads beside the SDK once the page is idle, so none of it is in the initial JavaScript.
 */
export function startMonitoring(
  sentry: SentrySdk,
  { dsn, environment, release }: MonitoringOptions,
): MonitoringRootOptions {
  sentry.init({
    beforeBreadcrumb(breadcrumb) {
      // Every `ui.*` breadcrumb describes an element by its accessible name and title, which
      // can hold patch names: `ui.input` records keypresses in fields as well as clicks.
      if (breadcrumb.category === 'console' || breadcrumb.category?.startsWith('ui.')) {
        return null
      }

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
    beforeSend(event, hint) {
      if (
        isAndroidNavigationLoggerError(event) ||
        isIosWebMidiShimCallbackError(event) ||
        isSafariExtensionMessageError(event) ||
        isWebkitMessageHandlersError(event) ||
        isSyntheticUnhandledRejection(hint.originalException)
      ) {
        return null
      }

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
    environment,
    release,
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,
    tracesSampleRate: 0,
  })

  const reactErrorHandler = sentry.reactErrorHandler()
  const reportUnlessContainedDynamicImportFailure = (error: unknown, errorInfo: ErrorInfo) => {
    if (isContainedDynamicImportFailure(error)) return
    reactErrorHandler(error, errorInfo)
  }

  return {
    onCaughtError: reportUnlessContainedDynamicImportFailure,
    // React reports a failed lazy chunk here as well as to the boundary that caught it.
    onRecoverableError: reportUnlessContainedDynamicImportFailure,
    onUncaughtError: reactErrorHandler,
  }
}

type SentryVerificationSdk = Pick<SentrySdk, 'logger' | 'metrics'>

export type BankTransferFailureContext = {
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
