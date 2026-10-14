import { describe, expect, it } from 'vitest'

import { sharedPatchPayload } from './share-link-fragment'

describe('sharedPatchPayload', () => {
  it('reads the payload after #p=', () => {
    expect(sharedPatchPayload('#p=AQAB-_')).toBe('AQAB-_')
  })

  it('finds no share link in another fragment or none', () => {
    expect(sharedPatchPayload('')).toBeNull()
    expect(sharedPatchPayload('#help')).toBeNull()
    expect(sharedPatchPayload('#q=AQAB')).toBeNull()
  })
})
