import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { type PatchLibrary } from '@/hooks/use-patch-library'

type PersistenceLibrary = Pick<
  PatchLibrary,
  | 'continueWithoutWorkspaceSaving'
  | 'persistenceError'
  | 'persistenceStatus'
  | 'retryWorkspaceLoading'
  | 'retryWorkspaceSaving'
>

export function WorkspacePersistenceStatus({ library }: { library: PersistenceLibrary }) {
  const { t } = useTranslation()
  const { persistenceError, persistenceStatus } = library

  if (
    persistenceStatus === 'loading' ||
    persistenceStatus === 'ready' ||
    persistenceStatus === 'saving'
  )
    return null

  const technicalDetails = persistenceError?.detail ? (
    <details className="text-xs">
      <summary className="cursor-pointer font-semibold">
        {t('persistence.technicalDetails')}
      </summary>
      <p className="mt-1 font-mono break-words opacity-80">{persistenceError.detail}</p>
    </details>
  ) : null

  if (persistenceStatus === 'load-error') {
    const code = persistenceError?.code ?? 'read-failed'
    return (
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-5 lg:px-8">
        <div
          className="raised-surface flex flex-col gap-4 rounded-lg border border-destructive/35 bg-white p-5 text-foreground sm:p-6"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-destructive" />
            <div className="grid gap-2">
              <h2 className="text-lg font-bold">{t(`persistence.loadErrors.${code}.title`)}</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                {t(`persistence.loadErrors.${code}.body`)}
              </p>
              {technicalDetails}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={library.retryWorkspaceLoading} type="button">
              {t('persistence.retryLoading')}
            </Button>
            <Button
              onClick={library.continueWithoutWorkspaceSaving}
              type="button"
              variant="outline"
            >
              {t('persistence.continueSessionOnly')}
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-5 lg:px-8">
      <div
        className="flex flex-col gap-3 rounded-lg border border-amber-700/35 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm sm:flex-row sm:items-start sm:justify-between"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-700" />
          <div className="grid gap-1">
            <p className="font-bold">
              {t(
                persistenceStatus === 'save-error'
                  ? 'persistence.saveErrorTitle'
                  : 'persistence.sessionOnlyTitle',
              )}
            </p>
            <p className="text-sm leading-5">
              {t(
                persistenceStatus === 'save-error'
                  ? 'persistence.saveErrorBody'
                  : 'persistence.sessionOnlyBody',
              )}
            </p>
            {technicalDetails}
          </div>
        </div>
        {persistenceStatus === 'save-error' ? (
          <Button
            className="self-start"
            onClick={library.retryWorkspaceSaving}
            size="sm"
            type="button"
            variant="outline"
          >
            {t('persistence.retrySaving')}
          </Button>
        ) : null}
      </div>
    </section>
  )
}
