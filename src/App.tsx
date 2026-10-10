import {
  lazy,
  Suspense,
  type ComponentProps,
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'

import { useEditorHistoryEntry } from '@/hooks/use-editor-history-entry'
import { useLibrarianView } from '@/hooks/use-librarian-view'
import { useMidi } from '@/hooks/use-midi'
import { usePatchLibrary } from '@/hooks/use-patch-library'
import { LibrarianPage } from '@/routes/librarian-page'
import { RootLayout } from '@/routes/root-layout'
import type { Patch } from '@/data/patches'
import type { Dx7Voice } from '@/lib/dx7'
import type { CopiedOperator } from '@/lib/operator-clipboard'
import { favouritesBank } from '@/lib/favourites'
import { normalizeFm1Effects } from '@/lib/fm1-effects'
import {
  eightBitFamily,
  isRenumberedByBankDeletion,
  virtualAnalogFamily,
} from '@/lib/patch-library'
import { fm1VaVirtualAnalogName } from '@/lib/fm1-va-virtual-analog'
import { trackAnalyticsEvent } from '@/lib/analytics'
import { visibleBox, zoomRects } from '@/lib/zoom-rects'
import {
  beginDynamicImportRecovery,
  cancelDynamicImportRecovery,
  getDynamicImportRecoveryIntent,
} from '@/lib/dynamic-import-recovery'
import { useToast } from '@/components/ui/toast'
import { PatchEditorErrorBoundary } from '@/components/editor/patch-editor-error-boundary'
import { WorkspacePersistenceStatus } from '@/components/workspace-persistence-status'
import { loadPatchEditorPage, loadVirtualAnalogEditorPage } from '@/routes/load-patch-editor-page'

const PatchEditorPage = lazy(loadPatchEditorPage)
const VirtualAnalogEditorPage = lazy(loadVirtualAnalogEditorPage)

function LoadedPatchEditorPage(props: ComponentProps<typeof PatchEditorPage>) {
  useEffect(() => cancelDynamicImportRecovery(), [])
  return <PatchEditorPage {...props} />
}

function LoadedVirtualAnalogEditorPage(props: ComponentProps<typeof VirtualAnalogEditorPage>) {
  useEffect(() => cancelDynamicImportRecovery(), [])
  return <VirtualAnalogEditorPage {...props} />
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
  const librarianView = useLibrarianView()
  // Held here rather than in the editor, which remounts for each sound, so an operator copied in
  // one sound can be pasted into another. It is never stored.
  const [copiedOperator, setCopiedOperator] = useState<CopiedOperator | null>(null)
  // What the last edit-buffer audition put in the FM1, and the program it selected first, so
  // clicking the same unchanged sound again, as a double-click does, does not send it twice.
  // Anything else that replaces the edit buffer clears it.
  const editBufferAudition = useRef<{
    effects: Uint8Array | undefined
    outputId: string
    program: number | undefined
    voice: Dx7Voice
  } | null>(null)
  const selectedPatch = library.patches.find((patch) => patch.id === selectedPatchId)
  const selectedVoice = selectedPatch ? library.voices[selectedPatch.id] : undefined
  // A Virtual Analog preset opens its own editor, which needs its settings record too.
  const selectedVirtualAnalog = selectedPatch && {
    record: library.records[selectedPatch.id],
    voice: library.virtualAnalog[selectedPatch.id],
  }
  const editsVirtualAnalog = Boolean(selectedVirtualAnalog?.voice && selectedVirtualAnalog.record)
  const isEditorOpen = Boolean(selectedPatch && (selectedVoice || editsVirtualAnalog))
  // The loaded editor leaves through its own back action, which asks about unsaved changes. Until
  // it has loaded, or after it failed to, browser Back simply closes it.
  const editorBrowserBack = useRef<(() => void) | null>(null)
  const findPatch = (patchId: string) =>
    library.patches.find((candidate) => candidate.id === patchId)
  // A patch opens from its slot, and closes back into it, with the classic Mac zoom rectangles.
  // A patch opened from anywhere else, such as a search result with no slot, simply opens.
  const slotBox = (patchId: string) =>
    visibleBox(
      [...document.querySelectorAll<HTMLElement>('[data-patch-id]')].find(
        (slot) => slot.dataset.patchId === patchId,
      ) ?? null,
    )
  const viewAreaBox = () => visibleBox(document.querySelector('[data-view-area]'))
  // Where the open editor was on screen as it closed, kept until the patch banks are back.
  const closingEditor = useRef<{ from: ReturnType<typeof viewAreaBox>; patchId: string } | null>(
    null,
  )
  // Clicking a slot in banks A–D selects its FM1 program, so the FM1 shows that slot, then sends the
  // library's voice and effects to the edit buffer, so the click plays the library's sound even
  // when the FM1 stores another there. Without SysEx only the program and its saved effects can be
  // sent. An added bank has no FM1 slot, so only its sound is sent. A Virtual Analog preset's bytes
  // are not a DX7 voice and no message but the preset write carries one, so its slot sends only its
  // program, which plays whatever the FM1 stores there, and an added bank's sends nothing. An 8-Bit
  // preset's slot is the same.
  const auditionPatch = (patch: Patch) => {
    if (patch.family === virtualAnalogFamily || patch.family === eightBitFamily) {
      editBufferAudition.current = null
      if (patch.program !== undefined) midi.sendProgramChange(patch.program)
      return
    }
    const voice = library.voices[patch.id]
    const effects = library.effects[patch.id]
    if (patch.program === undefined) {
      if (voice) auditionInEditBuffer(voice, effects)
      return
    }
    if (voice && midi.sysexAvailable) {
      auditionInEditBuffer(voice, effects, patch.program)
      return
    }
    editBufferAudition.current = null
    if (midi.sendProgramChange(patch.program)) {
      void midi.sendEffectSettings(normalizeFm1Effects(effects))
    }
  }
  // Sends a sound to the FM1 edit buffer with its effects, after selecting its program when it has
  // one. A sound without effects, such as one from the catalog, gets the defaults, so it does not
  // play through the previous sound's effects.
  const auditionInEditBuffer = (
    voice: Dx7Voice,
    storedEffects: Uint8Array | undefined,
    program?: number,
  ) => {
    const previous = editBufferAudition.current
    if (
      previous?.voice === voice &&
      previous.effects === storedEffects &&
      previous.outputId === midi.selectedOutputId &&
      previous.program === program
    ) {
      return
    }
    // The voice follows the Program Change, so it replaces the preset the change selected.
    if (program !== undefined && !midi.sendProgramChange(program)) {
      editBufferAudition.current = null
      return
    }
    const audition = { effects: storedEffects, outputId: midi.selectedOutputId, program, voice }
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
    // An 8-Bit preset has no editor yet.
    if (!patch || patch.family === eightBitFamily) return
    // The editor sends an added bank's sound itself as it opens, so only a slot in banks A–D is
    // selected on the way in.
    editBufferAudition.current = null
    if (patch.program !== undefined) midi.sendProgramChange(patch.program)
    zoomRects(slotBox(patch.id), viewAreaBox())
    setAuditionedPatchId(patch.id)
    beginDynamicImportRecovery(patch.id)
    setSelectedPatchId(patch.id)
    trackAnalyticsEvent({ name: 'editor_opened' })
  }
  const closeEditor = () => {
    cancelDynamicImportRecovery()
    if (isEditorOpen) closingEditor.current = { from: viewAreaBox(), patchId: selectedPatchId }
    setSelectedPatchId('')
  }
  // The slot exists again only once the patch banks have rendered, and the rectangles are drawn
  // before that frame is painted.
  useLayoutEffect(() => {
    const closing = closingEditor.current
    if (isEditorOpen || !closing) return
    closingEditor.current = null
    zoomRects(closing.from, slotBox(closing.patchId))
  }, [isEditorOpen])
  useEditorHistoryEntry(
    isEditorOpen ? selectedPatchId : '',
    () => (editorBrowserBack.current ?? closeEditor)(),
    editPatch,
  )
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
    <RootLayout compact={isEditorOpen} midi={midi}>
      {library.workspaceLoading ? (
        loadingSection(t('common.loadingLibrary'))
      ) : library.persistenceStatus === 'load-error' ? (
        <WorkspacePersistenceStatus library={library} />
      ) : (
        <>
          <WorkspacePersistenceStatus library={library} />
          {selectedPatch && selectedVirtualAnalog?.voice && selectedVirtualAnalog.record ? (
            <PatchEditorErrorBoundary key={selectedPatch.id} onBack={closeEditor}>
              <Suspense fallback={loadingSection(t('common.loading'))}>
                <LoadedVirtualAnalogEditorPage
                  browserBackRef={editorBrowserBack}
                  effects={normalizeFm1Effects(library.effects[selectedPatch.id])}
                  midi={midi}
                  onBack={closeEditor}
                  onSave={(voice, effects, record) => {
                    library.replaceWithVirtualAnalog(
                      selectedPatch.bank,
                      selectedPatch.number,
                      voice,
                      effects,
                      record,
                    )
                    toast.success(
                      t('toasts.patchSaved', { patch: fm1VaVirtualAnalogName(voice).trimEnd() }),
                    )
                  }}
                  patch={selectedPatch}
                  record={selectedVirtualAnalog.record}
                  voice={selectedVirtualAnalog.voice}
                />
              </Suspense>
            </PatchEditorErrorBoundary>
          ) : selectedPatch && selectedVoice ? (
            <PatchEditorErrorBoundary key={selectedPatch.id} onBack={closeEditor}>
              <Suspense fallback={loadingSection(t('common.loading'))}>
                <LoadedPatchEditorPage
                  browserBackRef={editorBrowserBack}
                  copiedOperator={copiedOperator}
                  midi={midi}
                  onBack={closeEditor}
                  onCopyOperator={(copied) => {
                    setCopiedOperator(copied)
                    toast.success(t('toasts.operatorCopied', { number: copied.operator }))
                  }}
                  effects={normalizeFm1Effects(library.effects[selectedPatch.id])}
                  onSave={(voice, effects, record) => {
                    const linked = library.updatePatch(selectedPatch.id, voice, effects, record)
                    // Name the sound as saved: the editor may have renamed it since it opened.
                    const patch = voice.name
                    // A favourite and the slot it came from are one sound, so say where else it went.
                    toast.success(
                      linked === 0
                        ? t('toasts.patchSaved', { patch })
                        : selectedPatch.bank === favouritesBank
                          ? t('favourites.savedWithBanks', { patch })
                          : t('favourites.savedWithFavourites', { patch }),
                    )
                  }}
                  patch={selectedPatch}
                  record={library.records[selectedPatch.id]}
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
