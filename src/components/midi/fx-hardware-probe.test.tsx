// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { FxHardwareProbe } from './fx-hardware-probe'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
})
afterEach(cleanup)

async function openProbe() {
  const send = vi.fn((_controller: number, _value: number, _mode: string) => true)
  const user = userEvent.setup()
  render(<FxHardwareProbe send={send} />)
  await user.click(screen.getByRole('button', { name: 'FX probe (dev)' }))
  return { send, user }
}

describe('FxHardwareProbe', () => {
  it('sends V15’s controllers as the firmware profile allows by default', async () => {
    const { send, user } = await openProbe()

    await user.click(screen.getByRole('button', { name: 'Send 127' }))

    expect(send).toHaveBeenCalledWith(0, 127, 'profile')
  })

  it('offers V16’s CC 70–93 in V16 research and sends them in that mode', async () => {
    const { send, user } = await openProbe()

    await user.selectOptions(screen.getByLabelText('Controller map'), 'v16-research')
    const controller = screen.getByLabelText<HTMLSelectElement>('Controller')
    expect(controller.value).toBe('70')
    expect(controller.options).toHaveLength(48)
    await user.selectOptions(controller, '74')
    await user.click(screen.getByRole('button', { name: 'Send 64' }))

    expect(send).toHaveBeenCalledWith(74, 64, 'v16-research')
  })
})
