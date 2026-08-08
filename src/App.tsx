import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LoaderCircle } from 'lucide-react'

import { useMidi } from '@/hooks/use-midi'
import { usePatchLibrary } from '@/hooks/use-patch-library'
import { LibrarianPage } from '@/routes/librarian-page'
import { RootLayout } from '@/routes/root-layout'
import { normalizeFm1Effects } from '@/lib/fm1-effects'

const PatchEditorPage = lazy(() => import('@/routes/patch-editor-page').then((module) => ({
  default: module.PatchEditorPage,
})))

function App() {
  const { t } = useTranslation()
  const midi = useMidi()
  const library = usePatchLibrary()
  const [selectedPatchId, setSelectedPatchId] = useState('')
  const [auditionedPatchId, setAuditionedPatchId] = useState('')
  const [transferredBankFingerprints, setTransferredBankFingerprints] = useState<Record<string, string>>({})
  const selectedPatch = library.patches.find((patch) => patch.id === selectedPatchId)
  const selectedVoice = selectedPatch ? library.voices[selectedPatch.id] : undefined
  const editPatch = (patchId: string) => {
    const patch = library.patches.find((candidate) => candidate.id === patchId)
    if (!patch) return
    midi.sendProgramChange(patch.program)
    setAuditionedPatchId(patch.id)
    setSelectedPatchId(patch.id)
  }

  return (
    <RootLayout compact={Boolean(selectedPatch && selectedVoice)} midi={midi}>
      {selectedPatch && selectedVoice ? (
        <Suspense fallback={(
          <section
            aria-live="polite"
            className="mx-auto flex min-h-64 max-w-[90rem] flex-col items-center justify-center gap-3 px-4 py-8 text-sm font-semibold text-muted-foreground"
            role="status"
          >
            <LoaderCircle aria-hidden="true" className="size-7 animate-spin text-primary motion-reduce:animate-none" />
            {t('common.loading')}
          </section>
        )}
        >
          <PatchEditorPage
            key={selectedPatch.id}
            midi={midi}
            onBack={() => setSelectedPatchId('')}
            effects={normalizeFm1Effects(library.effects[selectedPatch.id])}
            onSave={(voice, effects) => library.updatePatch(selectedPatch.id, voice, effects)}
            patch={selectedPatch}
            voice={selectedVoice}
          />
        </Suspense>
      ) : (
        <LibrarianPage
          activePatchId={auditionedPatchId}
          library={library}
          midi={midi}
          onBankTransferred={(bank, fingerprint) => {
            setTransferredBankFingerprints((current) => ({ ...current, [bank]: fingerprint }))
          }}
          onEditPatch={(patch) => editPatch(patch.id)}
          onPatchAuditioned={(patch) => setAuditionedPatchId(patch.id)}
          transferredBankFingerprints={transferredBankFingerprints}
        />
      )}
    </RootLayout>
  )
}

export default App
