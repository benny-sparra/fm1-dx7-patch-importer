// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { DeviceSelect } from '@/components/midi/device-select'
import { type MidiDevice, type MidiPort } from '@/lib/midi'

afterEach(cleanup)

const devices = [
  { id: 'other', manufacturer: 'Other', name: 'Other synth', port: {}, state: 'connected' },
] as unknown as MidiDevice<MidiPort>[]

function renderSelect(value: string) {
  render(
    <DeviceSelect devices={devices} icon={null} label="Output" onChange={vi.fn()} value={value} />,
  )
  return screen.getByRole('combobox', { name: 'Output' }) as HTMLSelectElement
}

describe('DeviceSelect', () => {
  it('shows that no device is selected instead of the first device', () => {
    const select = renderSelect('')

    expect(select.selectedOptions[0]?.textContent).toBe('No device selected')
  })

  it('offers only devices once one is selected', () => {
    const select = renderSelect('other')

    expect(Array.from(select.options, (option) => option.textContent)).toEqual(['Other synth'])
  })
})
