import type { Announcements, UniqueIdentifier } from '@dnd-kit/core'
import type { TFunction } from 'i18next'

/**
 * What a screen reader hears while something is dragged, in the interface language. dnd-kit's own
 * announcements and instructions are English and name an item only by its id, so every drag
 * context passes these. `nameOf` gives what an id is called aloud, or nothing for an id that is
 * not an item; nothing is announced for one. `instructions` replaces the shared instructions for a
 * context whose drag does more than move, as the slot grid's copies onto a bank tab.
 */
export function makeDragAccessibility(
  t: TFunction,
  nameOf: (id: UniqueIdentifier) => string | undefined,
  instructions = t('ui.drag.instructions'),
) {
  const announcements: Announcements = {
    onDragCancel: ({ active }) => {
      const name = nameOf(active.id)
      return name === undefined ? undefined : t('ui.drag.cancelled', { name })
    },
    onDragEnd: ({ active, over }) => {
      const name = nameOf(active.id)
      if (name === undefined) return undefined
      const target = over ? nameOf(over.id) : undefined
      return target === undefined || over?.id === active.id
        ? t('ui.drag.droppedInPlace', { name })
        : t('ui.drag.dropped', { name, target })
    },
    onDragOver: ({ active, over }) => {
      const name = nameOf(active.id)
      const target = over ? nameOf(over.id) : undefined
      if (name === undefined || target === undefined || over?.id === active.id) return undefined
      return t('ui.drag.over', { name, target })
    },
    onDragStart: ({ active }) => {
      const name = nameOf(active.id)
      return name === undefined ? undefined : t('ui.drag.pickedUp', { name })
    },
  }
  return {
    announcements,
    screenReaderInstructions: { draggable: instructions },
  }
}
