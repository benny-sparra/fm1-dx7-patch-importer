import { describe, expect, it } from 'vitest'

import { createBankFileSelectionTarget } from '@/lib/bank-file-selection'

describe('bank file selection target', () => {
  it('retains the bank whose menu opened the file chooser until the file is selected', () => {
    const target = createBankFileSelectionTarget()

    target.begin('A')
    target.begin('B')

    expect(target.consume()).toBe('B')
    expect(target.consume()).toBeNull()
  })
})
