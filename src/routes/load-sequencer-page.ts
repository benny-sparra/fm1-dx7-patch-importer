/**
 * Loads the sequencer view and its translations together, so the view never renders before the
 * text it needs has arrived.
 *
 * Both imports are dynamic: the sequencer keeps its strings in its own namespace rather than in the
 * eager one, and the module that knows how to load them travels with the view instead of with the
 * application shell. See `src/i18n/sequencer/index.ts`.
 */
export function loadSequencerPage() {
  const moduleRequest = import('@/routes/sequencer-page') as Promise<
    typeof import('@/routes/sequencer-page') | undefined
  >
  const translations = import('@/i18n/sequencer').then((module) => module.loadSequencerNamespace())

  return Promise.all([moduleRequest, translations]).then(([module]) => {
    if (module) return { default: module.SequencerPage }

    // Vite resolves the failed import without a module after recovery prevents the error.
    // Keep Suspense pending only for the brief interval before the requested page reload.
    return new Promise<never>(() => {})
  })
}
