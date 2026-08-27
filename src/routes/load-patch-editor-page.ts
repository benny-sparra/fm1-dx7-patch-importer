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
