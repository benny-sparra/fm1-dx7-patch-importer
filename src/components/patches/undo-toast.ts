import type { TFunction } from 'i18next'

import type { PatchLibrary } from '@/hooks/use-patch-library'
import type { PatchLibrarySnapshot } from '@/lib/patch-library'

/**
 * The Undo button for the notification after a library change that replaced or removed sounds.
 * Nothing is offered when the change did not happen. `beforeUndo` runs first, such as closing an
 * editor that was opened on the sound the undo removes.
 */
export function undoToastOptions(
  t: TFunction,
  library: Pick<PatchLibrary, 'undoChange'>,
  changed: PatchLibrarySnapshot | null,
  beforeUndo?: () => void,
) {
  if (!changed) return undefined
  return {
    action: {
      label: t('toasts.undo'),
      onAction: () => {
        beforeUndo?.()
        library.undoChange(changed)
      },
    },
  }
}
