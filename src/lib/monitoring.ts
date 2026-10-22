import type { ErrorInfo } from 'react'

import type { BankTransferFailureContext, SentrySdk } from './monitoring-setup'

type ReactErrorHandler = (error: unknown, errorInfo: ErrorInfo) => void

export type MonitoringRootOptions = {
  onCaughtError?: ReactErrorHandler
  onRecoverableError?: ReactErrorHandler
  onUncaughtError?: ReactErrorHandler
}

type MonitoringSetup = typeof import('./monitoring-setup')

type StartedMonitoring = { sentry: SentrySdk; setup: MonitoringSetup }

type MonitoringConfiguration = {
  dsn?: string
  environment: string
  loadSdk: () => Promise<SentrySdk>
  loadSetup?: () => Promise<MonitoringSetup>
  onInitialized?: (monitoring: StartedMonitoring) => void
  release?: string
}

const sentryDsn =
  'https://7b1d3bf3196f9dcdac24f9ea0401f275@o4511966934859776.ingest.de.sentry.io/4511966958846032'

/**
 * Only this wrapper is in the initial JavaScript. The SDK and the app's privacy filters
 * (`monitoring-setup`) load together once the page asks for monitoring.
 */
export function createMonitoringInitializer({
  dsn,
  environment,
  loadSdk,
  loadSetup = () => import('./monitoring-setup'),
  onInitialized,
  release,
}: MonitoringConfiguration) {
  let initialization: Promise<MonitoringRootOptions> | undefined

  return function initializeMonitoring(): Promise<MonitoringRootOptions> {
    if (!dsn?.trim()) return Promise.resolve({})

    initialization ??= Promise.all([loadSdk(), loadSetup()])
      .then(([sentry, setup]) => {
        const rootOptions = setup.startMonitoring(sentry, { dsn, environment, release })
        onInitialized?.({ sentry, setup })
        return rootOptions
      })
      .catch(() => ({}))

    return initialization
  }
}

let startedMonitoring: StartedMonitoring | undefined

export function triggerSentryVerification(): never {
  if (!startedMonitoring) {
    throw new Error('Sentry verification requires initialized production monitoring.')
  }
  return startedMonitoring.setup.runSentryVerification(startedMonitoring.sentry)
}

export function reportBankTransferFailure(context: BankTransferFailureContext) {
  if (!startedMonitoring) return
  startedMonitoring.setup.captureBankTransferFailure(startedMonitoring.sentry, context)
}

export const initializeMonitoring = createMonitoringInitializer({
  dsn: import.meta.env.PROD ? sentryDsn : undefined,
  environment: import.meta.env.MODE,
  loadSdk: () => import('./sentry-sdk'),
  // A build served without one, such as a local production build, reports no release at all rather
  // than filing its events under a name that matches no deployment.
  release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
  onInitialized(monitoring) {
    startedMonitoring = monitoring
  },
})
