export function loadPatchEditorPage() {
  const moduleRequest = import('@/routes/patch-editor-page') as Promise<
    typeof import('@/routes/patch-editor-page') | undefined
  >
  // The editor's help text travels with the editor rather than with the shell; see
  // `src/i18n/lazy-namespace.ts`.
  const helpText = import('@/i18n/editor-help').then((module) => module.loadEditorHelpNamespace())

  return Promise.all([moduleRequest, helpText]).then(([module]) => {
    if (module) return { default: module.PatchEditorPage }

    // Vite resolves the failed import without a module after recovery prevents the error.
    // Keep Suspense pending only for the brief interval before the requested page reload.
    return new Promise<never>(() => {})
  })
}
