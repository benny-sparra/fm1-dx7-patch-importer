import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/doto/index.css'
import '@fontsource-variable/space-grotesk/index.css'
import './index.css'
import './i18n'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
