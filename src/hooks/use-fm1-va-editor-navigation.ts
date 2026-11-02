import { useEffect, useRef, useState, type RefObject } from 'react'

import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { editorShortcuts } from '@/lib/keyboard-shortcuts'

type Options = {
  browserBackRef?: RefObject<(() => void) | null>
  editor: {
    getState: () => { isComparing: boolean }
    redo: () => void
    revertToSaved: () => void
    undo: () => void
  }
  isComparing: boolean
  isDirty: boolean
  onBack: () => void
  saveToLibrary: () => void
  syncState: string
  toggleCompare: () => void
}

export function useFm1VaEditorNavigation({
  browserBackRef,
  editor,
  isComparing,
  isDirty,
  onBack,
  saveToLibrary,
  syncState,
  toggleCompare,
}: Options) {
  const [isNavigationPending, setIsNavigationPending] = useState(false)
  const [isResolvingNavigation, setIsResolvingNavigation] = useState(false)
  const unsavedDialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (!isDirty) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [isDirty])
  const requestNavigation = () => {
    if (editor.getState().isComparing || isNavigationPending) return
    if (!isDirty) {
      onBack()
      return
    }
    setIsNavigationPending(true)
    unsavedDialogRef.current?.showModal()
  }

  const finishPendingNavigation = (choice: 'discard' | 'save') => {
    if (!isNavigationPending) return
    setIsResolvingNavigation(true)
    if (choice === 'save') saveToLibrary()
    else editor.revertToSaved()
    setIsResolvingNavigation(false)
    unsavedDialogRef.current?.close()
    setIsNavigationPending(false)
    onBack()
  }

  useEffect(() => {
    if (!browserBackRef) return
    browserBackRef.current = requestNavigation
    return () => {
      browserBackRef.current = null
    }
  })

  const stopComparing = () => {
    if (editor.getState().isComparing) toggleCompare()
  }

  useKeyboardShortcuts([
    { ...editorShortcuts.redo, onTrigger: editor.redo },
    { ...editorShortcuts.undo, onTrigger: editor.undo },
    {
      ...editorShortcuts.save,
      onTrigger: () => {
        if (isDirty) saveToLibrary()
      },
    },
    { ...editorShortcuts.stopComparing, enabled: isComparing, onTrigger: stopComparing },
    {
      ...editorShortcuts.back,
      enabled: syncState !== 'sending' && !isComparing,
      onTrigger: requestNavigation,
    },
  ])

  return {
    finishPendingNavigation,
    isResolvingNavigation,
    requestNavigation,
    setIsNavigationPending,
    stopComparing,
    unsavedDialogRef,
  }
}
