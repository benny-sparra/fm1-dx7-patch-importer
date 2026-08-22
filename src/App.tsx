import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LoaderCircle } from 'lucide-react'

import { useMidi } from '@/hooks/use-midi'
import { usePatchLibrary } from '@/hooks/use-patch-library'
import { LibrarianPage } from '@/routes/librarian-page'
import { RootLayout } from '@/routes/root-layout'
import { normalizeFm1Effects } from '@/lib/fm1-effects'
import { useToast } from '@/components/ui/toast'
import { WorkspacePersistenceStatus } from '@/components/workspace-persistence-status'

const PatchEditorPage = lazy(() =>
  import('@/routes/patch-editor-page').then((module) => ({
    default: module.PatchEditorPage,
  })),
)

function App() {
  const { t } = useTranslation()
  const toast = useToast()
  const midi = useMidi()
  const library = usePatchLibrary()
  const [selectedPatchId, setSelectedPatchId] = useState('')
  const [auditionedPatchId, setAuditionedPatchId] = useState('')
  const selectedPatch = library.patches.find((patch) => patch.id === selectedPatchId)
  const selectedVoice = selectedPatch ? library.voices[selectedPatch.id] : undefined
  const editPatch = (patchId: string) => {
    const patch = library.patches.find((candidate) => candidate.id === patchId)
    if (!patch) return
    midi.sendProgramChange(patch.program)
    setAuditionedPatchId(patch.id)
    setSelectedPatchId(patch.id)
  }
  const loadingSection = (label: string) => (
    <section
      aria-live="polite"
      className="mx-auto flex min-h-svh max-w-[90rem] items-center justify-center px-4 py-8 text-sm font-semibold text-muted-foreground"
      role="status"
    >
      <div className="flex flex-col items-center gap-3 rounded-md bg-white px-6 py-5">
        <LoaderCircle
          aria-hidden="true"
          className="size-7 animate-spin text-primary motion-reduce:animate-none"
        />
        {label}
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
            <Suspense fallback={loadingSection(t('common.loading'))}>
              <PatchEditorPage
                key={selectedPatch.id}
                midi={midi}
                onBack={() => setSelectedPatchId('')}
                effects={normalizeFm1Effects(library.effects[selectedPatch.id])}
                onSave={(voice, effects) => {
                  library.updatePatch(selectedPatch.id, voice, effects)
                  toast.success(t('toasts.patchSaved', { patch: selectedPatch.name }))
                }}
                patch={selectedPatch}
                voice={selectedVoice}
              />
            </Suspense>
          ) : (
            <LibrarianPage
              activePatchId={auditionedPatchId}
              library={library}
              midi={midi}
              onEditPatch={(patch) => editPatch(patch.id)}
            />
          )}
        </>
      )}
    </RootLayout>
  )
}

export default App
