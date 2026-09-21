import type { TFunction } from 'i18next'

import type { PatchLibrary } from '@/hooks/use-patch-library'
import type { PatchLibrarySnapshot } from '@/lib/patch-library'

/**
 * The Undo button for the notification after a library change that replaced or removed sounds.
 * Nothing is offered when the change did not happen.
 */
export function undoToastOptions(
  t: TFunction,
  library: Pick<PatchLibrary, 'undoChange'>,
  changed: PatchLibrarySnapshot | null,
) {
  if (!changed) return undefined
  return { action: { label: t('toasts.undo'), onAction: () => library.undoChange(changed) } }
}
