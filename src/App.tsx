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
import { useVoiceSetup } from '@/hooks/use-voice-setup'
import { LibrarianPage } from '@/routes/librarian-page'
import { RootLayout } from '@/routes/root-layout'
import type { Patch } from '@/data/patches'
import { dx7BankVoiceCount, type Dx7Voice } from '@/lib/dx7'
import type { CopiedOperator } from '@/lib/operator-clipboard'
import { favouritesBank } from '@/lib/favourites'
import { normalizeFm1Effects } from '@/lib/fm1-effects'
import {
  browserBanks,
  eightBitFamily,
  isRenumberedByBankDeletion,
  patchSlotCode,
  virtualAnalogFamily,
} from '@/lib/patch-library'
import { fm1VaEightBitName } from '@/lib/fm1-va-eight-bit'
import { fm1VaVirtualAnalogName } from '@/lib/fm1-va-virtual-analog'
import { resolveFirmwareProfile } from '@/lib/firmware-profile'
import { aimedVoice, assignVoicePreset } from '@/lib/voice-setup'
import { visibleBox, zoomRects } from '@/lib/zoom-rects'
import {
  beginDynamicImportRecovery,
  cancelDynamicImportRecovery,
  getDynamicImportRecoveryIntent,
} from '@/lib/dynamic-import-recovery'
import { useToast } from '@/components/ui/toast'
import { PatchEditorErrorBoundary } from '@/components/editor/patch-editor-error-boundary'
import { WorkspacePersistenceStatus } from '@/components/workspace-persistence-status'
import {
  loadEightBitEditorPage,
  loadPatchEditorPage,
  loadVirtualAnalogEditorPage,
} from '@/routes/load-patch-editor-page'

const PatchEditorPage = lazy(loadPatchEditorPage)
const VirtualAnalogEditorPage = lazy(loadVirtualAnalogEditorPage)
const EightBitEditorPage = lazy(loadEightBitEditorPage)

function LoadedPatchEditorPage(props: ComponentProps<typeof PatchEditorPage>) {
  useEffect(() => cancelDynamicImportRecovery(), [])
  return <PatchEditorPage {...props} />
}

function LoadedVirtualAnalogEditorPage(props: ComponentProps<typeof VirtualAnalogEditorPage>) {
  useEffect(() => cancelDynamicImportRecovery(), [])
  return <VirtualAnalogEditorPage {...props} />
}

function LoadedEightBitEditorPage(props: ComponentProps<typeof EightBitEditorPage>) {
  useEffect(() => cancelDynamicImportRecovery(), [])
  return <EightBitEditorPage {...props} />
}

function App() {
  const { t } = useTranslation()
  const toast = useToast()
  const midi = useMidi()
  const library = usePatchLibrary()
  const { aimed, setup: voiceSetup } = useVoiceSetup()
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
  // Anything else that replaces the edit buffer clears it. The channel counts, as Official Open
  // puts the sound in the track on it.
  const editBufferAudition = useRef<{
    channel: number
    effects: Uint8Array | undefined
    outputId: string
    program: number | undefined
    /** Whether the voice arrived, which an editor opened by a double-click waits on. */
    sent: Promise<boolean>
    voice: Dx7Voice
  } | null>(null)
  // The send a double-click's first click started, which the editor it opens takes over rather
  // than sending the patch a second time.
  const [openingSend, setOpeningSend] = useState<Promise<boolean>>()
  const selectedPatch = library.patches.find((patch) => patch.id === selectedPatchId)
  const selectedVoice = selectedPatch ? library.voices[selectedPatch.id] : undefined
  // A Virtual Analog or 8-Bit preset opens its engine's own editor, which needs its settings record
  // too.
  const selectedVirtualAnalog = selectedPatch && {
    record: library.records[selectedPatch.id],
    voice: library.virtualAnalog[selectedPatch.id],
  }
  const editsVirtualAnalog = Boolean(selectedVirtualAnalog?.voice && selectedVirtualAnalog.record)
  const selectedEightBit = selectedPatch && {
    record: library.records[selectedPatch.id],
    voice: library.eightBit[selectedPatch.id],
  }
  const editsEightBit = Boolean(selectedEightBit?.voice && selectedEightBit.record)
  const isEditorOpen = Boolean(
    selectedPatch && (selectedVoice || editsVirtualAnalog || editsEightBit),
  )
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
  // preset's slot is the same. M-VAVE's Official Open takes a Program Change as replacing a track's
  // voice with a built-in sound, so there a slot sends no program, as an added bank's does.
  const slotProgram = (patch: Patch) =>
    resolveFirmwareProfile(midi.firmware).capabilities.programChanges ? patch.program : undefined
  // M-VAVE's V16 shares one FX group among its eight Voices, so playing a patch there leaves the
  // effects alone; they reach the FM1 only as they are edited.
  const sendPlayedEffects = (effects: Uint8Array | undefined) => {
    if (!resolveFirmwareProfile(midi.firmware).capabilities.presetEffects) return
    void midi.sendEffectSettings(normalizeFm1Effects(effects))
  }
  const auditionPatch = (patch: Patch) => {
    const program = slotProgram(patch)
    if (patch.family === virtualAnalogFamily || patch.family === eightBitFamily) {
      editBufferAudition.current = null
      if (program !== undefined) midi.sendProgramChange(program)
      return
    }
    const voice = library.voices[patch.id]
    const effects = library.effects[patch.id]
    if (program === undefined) {
      if (voice) auditionInEditBuffer(voice, effects)
      return
    }
    if (voice && midi.sysexAvailable) {
      auditionInEditBuffer(voice, effects, program)
      return
    }
    editBufferAudition.current = null
    if (midi.sendProgramChange(program)) sendPlayedEffects(effects)
  }
  // Sends a sound to the FM1 edit buffer with its effects, after selecting its program when it has
  // one. A sound without effects, such as one from the catalog, gets the defaults, so it does not
  // play through the previous sound's effects.
  const auditionInEditBuffer = (
    voice: Dx7Voice,
    storedEffects: Uint8Array | undefined,
    program?: number,
  ) => {
    if (currentAudition(voice, storedEffects, program)) return
    // The voice follows the Program Change, so it replaces the preset the change selected.
    if (program !== undefined && !midi.sendProgramChange(program)) {
      editBufferAudition.current = null
      return
    }
    const sending = midi.sendVoice(voice)
    const audition = {
      channel: midi.channel,
      effects: storedEffects,
      outputId: midi.selectedOutputId,
      program,
      sent: sending,
      voice,
    }
    editBufferAudition.current = audition
    void sending.then((sent) => {
      if (!sent) {
        // Let the next click try again rather than assume the sound arrived.
        if (editBufferAudition.current === audition) editBufferAudition.current = null
        return
      }
      sendPlayedEffects(storedEffects)
    })
  }
  // The last audition, if it put this same sound in the FM1 through the same output and channel.
  const currentAudition = (
    voice: Dx7Voice,
    effects: Uint8Array | undefined,
    program: number | undefined,
  ) => {
    const previous = editBufferAudition.current
    return previous?.voice === voice &&
      previous.channel === midi.channel &&
      previous.effects === effects &&
      previous.outputId === midi.selectedOutputId &&
      previous.program === program
      ? previous
      : null
  }
  // On V16 with the Voice strip on, a slot's Program Change goes to the Voice listening on the note
  // channel, so that Voice now plays the slot's preset, whether or not MIDI is online to send it.
  const assignToAimedVoice = (program: number | undefined) => {
    const voice = aimedVoice(voiceSetup, midi.channel, aimed)
    if (
      program !== undefined &&
      voice !== null &&
      voiceSetup.enabled &&
      resolveFirmwareProfile(midi.firmware).capabilities.multitimbral
    ) {
      assignVoicePreset(voice, program)
    }
  }
  // Each Voice's preset on its own channel. The Voice on the note channel then plays its stored
  // preset rather than the sound a click put in the edit buffer, so that click is forgotten.
  const sendVoiceSetup = () => {
    editBufferAudition.current = null
    return voiceSetup.voices.filter(
      (voice) => voice.preset !== null && midi.sendProgramChange(voice.preset, voice.channel),
    ).length
  }
  const selectPatch = (patchId: string) => {
    const patch = findPatch(patchId)
    if (!patch) return
    assignToAimedVoice(slotProgram(patch))
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
    // selected on the way in. A double-click's first click has already selected it and sent its
    // sound, so the editor waits for that send rather than repeating both.
    const program = slotProgram(patch)
    assignToAimedVoice(program)
    const voice = library.voices[patch.id]
    const playing = voice && currentAudition(voice, library.effects[patch.id], program)
    editBufferAudition.current = null
    if (program !== undefined && !playing) midi.sendProgramChange(program)
    setOpeningSend(playing ? playing.sent : undefined)
    zoomRects(slotBox(patch.id), viewAreaBox())
    setAuditionedPatchId(patch.id)
    beginDynamicImportRecovery(patch.id)
    setSelectedPatchId(patch.id)
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
  // The patch banks and the editor both run past the fold, so their stand-in does too, keeping the
  // footer out of view until they arrive; on a phone a shorter one let it show and then jump down.
  const loadingSection = (label: string) => (
    <section
      aria-live="polite"
      className="mx-auto flex min-h-svh max-w-[90rem] items-center justify-center px-4 py-8"
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
      compact={isEditorOpen}
      midi={midi}
      voices={{
        onSendSetup: sendVoiceSetup,
        presetLabel: (preset) => {
          const patch = library.patches.find((candidate) => candidate.program === preset)
          return patch
            ? `${patchSlotCode(patch)} ${patch.name}`
            : patchSlotCode({
                bank: browserBanks[Math.floor(preset / dx7BankVoiceCount)],
                number: (preset % dx7BankVoiceCount) + 1,
              })
        },
      }}
    >
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
          ) : selectedPatch && selectedEightBit?.voice && selectedEightBit.record ? (
            <PatchEditorErrorBoundary key={selectedPatch.id} onBack={closeEditor}>
              <Suspense fallback={loadingSection(t('common.loading'))}>
                <LoadedEightBitEditorPage
                  browserBackRef={editorBrowserBack}
                  effects={normalizeFm1Effects(library.effects[selectedPatch.id])}
                  midi={midi}
                  onBack={closeEditor}
                  onSave={(voice, effects, record) => {
                    library.replaceWithEightBit(
                      selectedPatch.bank,
                      selectedPatch.number,
                      voice,
                      effects,
                      record,
                    )
                    toast.success(
                      t('toasts.patchSaved', { patch: fm1VaEightBitName(voice).trimEnd() }),
                    )
                  }}
                  patch={selectedPatch}
                  record={selectedEightBit.record}
                  voice={selectedEightBit.voice}
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
                  openingSend={openingSend}
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
