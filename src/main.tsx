import './dynamic-import-recovery'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.css'
import './index.css'
import { i18nReady } from './i18n'
import App from './App.tsx'
import { ToastProvider } from './components/ui/toast.tsx'
import { initializeMonitoring } from './lib/monitoring.ts'

void Promise.all([i18nReady, initializeMonitoring()]).then(([, monitoringRootOptions]) => {
  createRoot(document.getElementById('root')!, monitoringRootOptions).render(
    <StrictMode>
      <ToastProvider>
        <App />
      </ToastProvider>
    </StrictMode>,
  )
})
