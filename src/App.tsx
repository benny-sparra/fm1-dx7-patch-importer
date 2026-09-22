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

import { useLibrarianView } from '@/hooks/use-librarian-view'
import { useMidi } from '@/hooks/use-midi'
import { usePatchLibrary } from '@/hooks/use-patch-library'
import { LibrarianPage } from '@/routes/librarian-page'
import { RootLayout } from '@/routes/root-layout'
import type { Patch } from '@/data/patches'
import type { Dx7Voice } from '@/lib/dx7'
import type { CopiedOperator } from '@/lib/operator-clipboard'
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
import { loadSequencerPage } from '@/routes/load-sequencer-page'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { LoadFailedNotice } from '@/components/ui/load-failed-notice'

const PatchEditorPage = lazy(loadPatchEditorPage)
const SequencerPage = lazy(loadSequencerPage)

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
  const [sequencerOpen, setSequencerOpen] = useState(false)
  const librarianView = useLibrarianView()
  // Held here rather than in the editor, which remounts for each sound, so an operator copied in
  // one sound can be pasted into another. It is never stored.
  const [copiedOperator, setCopiedOperator] = useState<CopiedOperator | null>(null)
  // What the last edit-buffer audition put in the FM1, from an added bank or a search result, so
  // clicking the same unchanged sound again, as a double-click does, does not send it twice.
  // Anything else that replaces the edit buffer clears it.
  const editBufferAudition = useRef<{
    effects: Uint8Array | undefined
    outputId: string
    voice: Dx7Voice
  } | null>(null)
  const selectedPatch = library.patches.find((patch) => patch.id === selectedPatchId)
  const selectedVoice = selectedPatch ? library.voices[selectedPatch.id] : undefined
  const findPatch = (patchId: string) =>
    library.patches.find((candidate) => candidate.id === patchId)
  // A slot in banks A–D selects its FM1 program. A DX7 bank carries no effects, so the saved
  // effects follow the Program Change. An added bank has no FM1 slot, so its sound is auditioned
  // through the edit buffer instead, with its effects, just as the editor sends it.
  const auditionPatch = (patch: Patch) => {
    if (patch.program !== undefined) {
      editBufferAudition.current = null
      if (midi.sendProgramChange(patch.program)) {
        void midi.sendEffectSettings(normalizeFm1Effects(library.effects[patch.id]))
      }
      return
    }
    const voice = library.voices[patch.id]
    if (voice) auditionInEditBuffer(voice, library.effects[patch.id])
  }
  // Sends a sound to the FM1 edit buffer with its effects. A sound without effects, such as one
  // from the catalog, gets the defaults, so it does not play through the previous sound's effects.
  const auditionInEditBuffer = (voice: Dx7Voice, storedEffects: Uint8Array | undefined) => {
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
  // A search result from outside the workspace has no slot, so no slot stays lit for it.
  const playSearchResult = (voice: Dx7Voice, effects: Uint8Array | undefined) => {
    auditionInEditBuffer(voice, effects)
    setAuditionedPatchId('')
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
    <RootLayout
      compact={Boolean(selectedPatch && selectedVoice)}
      midi={midi}
      onOpenSequencer={selectedPatch && selectedVoice ? undefined : () => setSequencerOpen(true)}
    >
      {library.workspaceLoading ? (
        loadingSection(t('common.loadingLibrary'))
      ) : library.persistenceStatus === 'load-error' ? (
        <WorkspacePersistenceStatus library={library} />
      ) : (
        <>
          <WorkspacePersistenceStatus library={library} />
          {sequencerOpen ? (
            // A chunk from a replaced deployment cannot load; the notice offers the reload that
            // fetches the current one, and the librarian behind it keeps working either way.
            <ErrorBoundary
              fallback={<LoadFailedNotice className="p-4" message={t('ui.sequencerOpenFailed')} />}
            >
              <Suspense fallback={loadingSection(t('common.loadingSequencer'))}>
                <SequencerPage midi={midi} onBack={() => setSequencerOpen(false)} />
              </Suspense>
            </ErrorBoundary>
          ) : selectedPatch && selectedVoice ? (
            <PatchEditorErrorBoundary key={selectedPatch.id} onBack={closeEditor}>
              <Suspense fallback={loadingSection(t('common.loading'))}>
                <LoadedPatchEditorPage
                  copiedOperator={copiedOperator}
                  midi={midi}
                  onBack={closeEditor}
                  onCopyOperator={(copied) => {
                    setCopiedOperator(copied)
                    toast.success(t('toasts.operatorCopied', { number: copied.operator }))
                  }}
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
              onCloseEditor={closeEditor}
              onEditPatch={(patch) => editPatch(patch.id)}
              onPlaySearchResult={playSearchResult}
              onSelectPatch={(patch) => selectPatch(patch.id)}
              view={librarianView}
            />
          )}
        </>
      )}
    </RootLayout>
  )
}

export default App
