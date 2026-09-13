import './dynamic-import-recovery'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.css'
import './index.css'
import { i18nReady } from './i18n'
import App from './App.tsx'
import { ToastProvider } from './components/ui/toast.tsx'
import { initializeMonitoring, type MonitoringRootOptions } from './lib/monitoring.ts'
import { runWhenIdle } from './lib/run-when-idle.ts'

void i18nReady.then(() => {
  let monitoringRootOptions: MonitoringRootOptions = {}
  createRoot(document.getElementById('root')!, {
    onCaughtError(error, errorInfo) {
      monitoringRootOptions.onCaughtError?.(error, errorInfo)
    },
    onRecoverableError(error, errorInfo) {
      monitoringRootOptions.onRecoverableError?.(error, errorInfo)
    },
    onUncaughtError(error, errorInfo) {
      monitoringRootOptions.onUncaughtError?.(error, errorInfo)
    },
  }).render(
    <StrictMode>
      <ToastProvider>
        <App />
      </ToastProvider>
    </StrictMode>,
  )

  // The Sentry SDK is optional, so download it only once the page has loaded and gone idle.
  runWhenIdle(() => {
    void initializeMonitoring().then((options) => {
      monitoringRootOptions = options
    })
  })
})
