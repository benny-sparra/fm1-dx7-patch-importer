import { lazy, Suspense, type ComponentProps, type CSSProperties, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useMidi } from '@/hooks/use-midi'
import { usePatchLibrary } from '@/hooks/use-patch-library'
import { LibrarianPage } from '@/routes/librarian-page'
import { RootLayout } from '@/routes/root-layout'
import { normalizeFm1Effects } from '@/lib/fm1-effects'
import { trackAnalyticsEvent } from '@/lib/analytics'
import {
  beginDynamicImportRecovery,
  cancelDynamicImportRecovery,
  getDynamicImportRecoveryIntent,
} from '@/lib/dynamic-import-recovery'
import { useToast } from '@/components/ui/toast'
import { PatchEditorErrorBoundary } from '@/components/editor/patch-editor-error-boundary'
import { WorkspacePersistenceStatus } from '@/components/workspace-persistence-status'
import { loadPatchEditorPage } from '@/routes/load-patch-editor-page'

const PatchEditorPage = lazy(loadPatchEditorPage)

function LoadedPatchEditorPage(props: ComponentProps<typeof PatchEditorPage>) {
  useEffect(() => cancelDynamicImportRecovery(), [])
  return <PatchEditorPage {...props} />
}

function App() {
  const { t } = useTranslation()
  const toast = useToast()
  const midi = useMidi()
  const library = usePatchLibrary()
  const [selectedPatchId, setSelectedPatchId] = useState(() => {
    const recoveryPatchId = getDynamicImportRecoveryIntent()
    if (recoveryPatchId) beginDynamicImportRecovery(recoveryPatchId)
    return recoveryPatchId
  })
  const [auditionedPatchId, setAuditionedPatchId] = useState('')
  const selectedPatch = library.patches.find((patch) => patch.id === selectedPatchId)
  const selectedVoice = selectedPatch ? library.voices[selectedPatch.id] : undefined
  const selectPatch = (patchId: string) => {
    const patch = library.patches.find((candidate) => candidate.id === patchId)
    if (!patch) return
    midi.sendProgramChange(patch.program)
    setAuditionedPatchId(patch.id)
    return patch
  }
  const editPatch = (patchId: string) => {
    const patch = selectPatch(patchId)
    if (!patch) return
    beginDynamicImportRecovery(patch.id)
    setSelectedPatchId(patch.id)
    trackAnalyticsEvent({ name: 'editor_opened' })
  }
  const closeEditor = () => {
    cancelDynamicImportRecovery()
    setSelectedPatchId('')
  }
  const loadingSection = (label: string) => (
    <section
      aria-live="polite"
      className="mx-auto flex min-h-[60svh] max-w-[90rem] items-center justify-center px-4 py-8"
      role="status"
    >
      <div className="crt-boot crt-raised bg-card">
        <p className="crt-boot-line">
          <span aria-hidden="true" className="crt-boot-prompt">
            &gt;
          </span>
          {label}
          <span aria-hidden="true" className="crt-boot-cursor" />
        </p>
        <div aria-hidden="true" className="crt-boot-bar crt-well">
          {Array.from({ length: 12 }, (_, index) => (
            <span
              className="crt-boot-segment"
              key={index}
              style={{ '--crt-boot-index': index } as CSSProperties}
            />
          ))}
        </div>
      </div>
    </section>
  )

  return (
    <RootLayout compact={Boolean(selectedPatch && selectedVoice)} midi={midi}>
      {library.workspaceLoading ? (
        loadingSection(t('common.loadingLibrary'))
      ) : library.persistenceStatus === 'load-error' ? (
        <WorkspacePersistenceStatus library={library} />
      ) : (
        <>
          <WorkspacePersistenceStatus library={library} />
          {selectedPatch && selectedVoice ? (
            <PatchEditorErrorBoundary key={selectedPatch.id} onBack={closeEditor}>
              <Suspense fallback={loadingSection(t('common.loading'))}>
                <LoadedPatchEditorPage
                  midi={midi}
                  onBack={closeEditor}
                  effects={normalizeFm1Effects(library.effects[selectedPatch.id])}
                  onSave={(voice, effects) => {
                    library.updatePatch(selectedPatch.id, voice, effects)
                    toast.success(t('toasts.patchSaved', { patch: selectedPatch.name }))
                  }}
                  patch={selectedPatch}
                  voice={selectedVoice}
                />
              </Suspense>
            </PatchEditorErrorBoundary>
          ) : (
            <LibrarianPage
              activePatchId={auditionedPatchId}
              library={library}
              midi={midi}
              onEditPatch={(patch) => editPatch(patch.id)}
              onSelectPatch={(patch) => selectPatch(patch.id)}
            />
          )}
        </>
      )}
    </RootLayout>
  )
}

export default App
