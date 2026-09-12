// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useKeyboardShortcuts, type ShortcutBinding } from './use-keyboard-shortcuts'

function ShortcutHost({ bindings }: { bindings: readonly ShortcutBinding[] }) {
  useKeyboardShortcuts(bindings)

  return <input aria-label="Patch name" />
}

afterEach(cleanup)

describe('useKeyboardShortcuts', () => {
  it('runs the binding whose keys were pressed', async () => {
    const user = userEvent.setup()
    const onTrigger = vi.fn()
    render(<ShortcutHost bindings={[{ key: 's', mod: true, onTrigger }]} />)

    await user.keyboard('{Meta>}s{/Meta}')

    expect(onTrigger).toHaveBeenCalledTimes(1)
  })

  it('stops at the first match so one press never runs two bindings', async () => {
    const user = userEvent.setup()
    const onRedo = vi.fn()
    const onUndo = vi.fn()
    render(
      <ShortcutHost
        bindings={[
          { key: 'z', mod: true, onTrigger: onRedo, shift: true },
          { key: 'z', mod: true, onTrigger: onUndo },
        ]}
      />,
    )

    await user.keyboard('{Meta>}{Shift>}z{/Shift}{/Meta}')

    expect(onRedo).toHaveBeenCalledTimes(1)
    expect(onUndo).not.toHaveBeenCalled()
  })

  it('lets a disabled binding fall through instead of firing', async () => {
    const user = userEvent.setup()
    const onTrigger = vi.fn()
    render(<ShortcutHost bindings={[{ enabled: false, key: 's', mod: true, onTrigger }]} />)

    await user.keyboard('{Meta>}s{/Meta}')

    expect(onTrigger).not.toHaveBeenCalled()
  })

  it('reads the current handler rather than the one bound on the first render', async () => {
    const user = userEvent.setup()
    const first = vi.fn()
    const second = vi.fn()
    const view = render(<ShortcutHost bindings={[{ key: 's', mod: true, onTrigger: first }]} />)

    view.rerender(<ShortcutHost bindings={[{ key: 's', mod: true, onTrigger: second }]} />)
    await user.keyboard('{Meta>}s{/Meta}')

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('claims the key press so the browser does not act on it too', async () => {
    const user = userEvent.setup()
    const pressed: KeyboardEvent[] = []
    const collect = (event: KeyboardEvent) => pressed.push(event)
    document.addEventListener('keydown', collect)
    render(<ShortcutHost bindings={[{ key: 's', mod: true, onTrigger: vi.fn() }]} />)

    await user.keyboard('{Meta>}s{/Meta}')
    document.removeEventListener('keydown', collect)

    expect(pressed.find((event) => event.key === 's')?.defaultPrevented).toBe(true)
  })

  it('stops listening once the view unmounts', async () => {
    const user = userEvent.setup()
    const onTrigger = vi.fn()
    const view = render(<ShortcutHost bindings={[{ key: 's', mod: true, onTrigger }]} />)

    view.unmount()
    await user.keyboard('{Meta>}s{/Meta}')

    expect(onTrigger).not.toHaveBeenCalled()
  })
})
