export function loadPatchEditorPage() {
  const moduleRequest = import('@/routes/patch-editor-page') as Promise<
    typeof import('@/routes/patch-editor-page') | undefined
  >

  return moduleRequest.then((module) => {
    if (module) return { default: module.PatchEditorPage }

    // Vite resolves the failed import without a module after recovery prevents the error.
    // Keep Suspense pending only for the brief interval before the requested page reload.
    return new Promise<never>(() => {})
  })
}

/**
 * The Virtual Analog editor shares the voice editor's chunk. A chunk of its own made the bundler
 * split the code both editors share with the entry out of it, costing 1.5 KiB of the initial budget.
 */
export function loadVirtualAnalogEditorPage() {
  const moduleRequest = import('@/routes/patch-editor-page') as Promise<
    typeof import('@/routes/patch-editor-page') | undefined
  >

  return moduleRequest.then((module) => {
    if (module) return { default: module.VirtualAnalogEditorPage }

    // As for the voice editor: pending only until the requested page reload.
    return new Promise<never>(() => {})
  })
}
