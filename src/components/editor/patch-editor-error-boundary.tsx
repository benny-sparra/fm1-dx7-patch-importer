import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Component, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

type ErrorBoundaryProps = {
  children: ReactNode
  fallback: ReactNode
}

class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

type PatchEditorErrorBoundaryProps = {
  children: ReactNode
  onBack: () => void
}

export function PatchEditorErrorBoundary({ children, onBack }: PatchEditorErrorBoundaryProps) {
  const { t } = useTranslation()
  const fallback = (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-5 lg:px-8">
      <div
        className="raised-surface flex flex-col gap-4 rounded-lg border border-destructive/35 bg-white p-5 text-foreground sm:p-6"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-destructive" />
          <div className="grid gap-2">
            <h2 className="text-lg font-bold">{t('common.editorLoadErrorTitle')}</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {t('common.editorLoadErrorBody')}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => window.location.reload()} type="button">
            <RefreshCw aria-hidden="true" />
            {t('common.reloadApp')}
          </Button>
          <Button onClick={onBack} type="button" variant="outline">
            {t('common.backToLibrary')}
          </Button>
        </div>
      </div>
    </section>
  )

  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>
}
