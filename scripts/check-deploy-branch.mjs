import { pathToFileURL } from 'node:url'

/**
 * The only branch Cloudflare Workers Builds may build. Its deploy command publishes every build to
 * fm1-editor.com, so on 2026-10-07 a push to an unmerged branch replaced the production site and
 * took the firmware page, which that branch predated, with it.
 */
export const productionBranch = 'main'

/**
 * Why this build must not go on, or undefined when it may. Only Workers Builds sets
 * `WORKERS_CI_BRANCH`, so local builds, CI, and Playwright are never stopped.
 */
export function deployBranchFailure(env) {
  const branch = env.WORKERS_CI_BRANCH?.trim()
  if (!branch || branch === productionBranch) return undefined
  return (
    `Cloudflare Workers Builds is building "${branch}", but only "${productionBranch}" may be ` +
    'deployed: the deploy command publishes every build to production.'
  )
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const failure = deployBranchFailure(process.env)
  if (failure) {
    console.error(failure)
    process.exit(1)
  }
}
