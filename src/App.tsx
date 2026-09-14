import {
  lazy,
  Suspense,
  type ComponentProps,
  type CSSProperties,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'

import { useMidi } from '@/hooks/use-midi'
import { usePatchLibrary } from '@/hooks/use-patch-library'
import { LibrarianPage } from '@/routes/librarian-page'
import { RootLayout } from '@/routes/root-layout'
import { type Patch } from '@/data/patches'
import { type Dx7Voice } from '@/lib/dx7'
import { normalizeFm1Effects } from '@/lib/fm1-effects'
import { isRenumberedByBankDeletion } from '@/lib/patch-library'
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
  // What the last added-bank audition put in the FM1 edit buffer, so clicking the same unchanged
  // sound again, as a double-click does, does not send it twice. Anything else that replaces the
  // edit buffer clears it.
  const editBufferAudition = useRef<{
    effects: Uint8Array | undefined
    outputId: string
    voice: Dx7Voice
  } | null>(null)
  const selectedPatch = library.patches.find((patch) => patch.id === selectedPatchId)
  const selectedVoice = selectedPatch ? library.voices[selectedPatch.id] : undefined
  const findPatch = (patchId: string) =>
    library.patches.find((candidate) => candidate.id === patchId)
  // A slot in banks A–D selects its FM1 program. An added bank has no FM1 slot, so its sound is
  // auditioned through the edit buffer instead, with its effects, just as the editor sends it.
  const auditionPatch = (patch: Patch) => {
    if (patch.program !== undefined) {
      editBufferAudition.current = null
      midi.sendProgramChange(patch.program)
      return
    }
    const voice = library.voices[patch.id]
    if (!voice) return
    const storedEffects = library.effects[patch.id]
    const previous = editBufferAudition.current
    if (
      previous?.voice === voice &&
      previous.effects === storedEffects &&
      previous.outputId === midi.selectedOutputId
    ) {
      return
    }
    const audition = { effects: storedEffects, outputId: midi.selectedOutputId, voice }
    editBufferAudition.current = audition
    void midi.sendVoice(voice).then((sent) => {
      if (!sent) {
        // Let the next click try again rather than assume the sound arrived.
        if (editBufferAudition.current === audition) editBufferAudition.current = null
        return
      }
      void midi.sendEffectSettings(normalizeFm1Effects(storedEffects))
    })
  }
  const selectPatch = (patchId: string) => {
    const patch = findPatch(patchId)
    if (!patch) return
    auditionPatch(patch)
    setAuditionedPatchId(patch.id)
  }
  const editPatch = (patchId: string) => {
    const patch = findPatch(patchId)
    if (!patch) return
    // The editor sends an added bank's sound itself as it opens, so only a slot in banks A–D is
    // selected on the way in.
    editBufferAudition.current = null
    if (patch.program !== undefined) midi.sendProgramChange(patch.program)
    setAuditionedPatchId(patch.id)
    beginDynamicImportRecovery(patch.id)
    setSelectedPatchId(patch.id)
    trackAnalyticsEvent({ name: 'editor_opened' })
  }
  const closeEditor = () => {
    cancelDynamicImportRecovery()
    setSelectedPatchId('')
  }
  // Deleting a bank moves later banks up a letter, so a lit slot in or after it would name another
  // sound, one the FM1 never received.
  const forgetRenumberedAudition = (deletedBank: string) => {
    const patch = findPatch(auditionedPatchId)
    if (patch && isRenumberedByBankDeletion(library.workspaceBanks, deletedBank, patch.bank)) {
      setAuditionedPatchId('')
    }
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
              onBankDeleted={forgetRenumberedAudition}
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
