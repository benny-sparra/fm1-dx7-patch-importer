import { describe, expect, it } from 'vitest'

import { deployBranchFailure } from './check-deploy-branch.mjs'

describe('deployBranchFailure', () => {
  it('allows a build outside Cloudflare Workers Builds', () => {
    expect(deployBranchFailure({})).toBeUndefined()
  })

  it('allows Workers Builds to build main', () => {
    expect(deployBranchFailure({ WORKERS_CI_BRANCH: 'main' })).toBeUndefined()
  })

  it('stops Workers Builds building any other branch', () => {
    expect(deployBranchFailure({ WORKERS_CI_BRANCH: 'fm1-va-editor' })).toContain('fm1-va-editor')
  })
})
