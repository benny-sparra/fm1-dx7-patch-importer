// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'

import '@/i18n'

import { PresetSelect } from './preset-select'

afterEach(cleanup)

it('applies the same preset twice and keeps each selector at its placeholder', async () => {
  const user = userEvent.setup()
  const apply = vi.fn()
  const options = [{ id: 'one', name: 'One' }]
  render(
    <>
      <PresetSelect
        accessibleLabel="First"
        label="Preset"
        help="Help"
        options={options}
        onApply={apply}
        placeholder="Choose"
      />
      <PresetSelect
        accessibleLabel="Second"
        label="Preset"
        help="Help"
        options={options}
        onApply={apply}
        placeholder="Choose"
        variant="effect"
      />
    </>,
  )
  const first = screen.getByRole('combobox', { name: 'First' })
  const second = screen.getByRole('combobox', { name: 'Second' })
  await user.selectOptions(first, 'one')
  await user.selectOptions(first, 'one')
  expect(apply).toHaveBeenCalledTimes(2)
  expect(first).toBeInstanceOf(HTMLSelectElement)
  expect(second).toBeInstanceOf(HTMLSelectElement)
  if (!(first instanceof HTMLSelectElement) || !(second instanceof HTMLSelectElement))
    throw new Error('Expected selects')
  expect(first.value).toBe('')
  expect(second.value).toBe('')
})
