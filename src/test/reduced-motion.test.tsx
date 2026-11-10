// @vitest-environment jsdom

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { Fm1Wireframe } from '@/components/fm1-wireframe'
import { attractIdleMs, installAttractIdle } from '@/lib/attract-idle'
import { AlgorithmPanel } from '@/components/editor/editor-workspace'
import { OscillatorScope } from '@/components/editor/oscillator-scope'
import { LfoWaveControl, PicturePickerControl } from '@/components/editor/parameter-controls'
import { PatchEditorHeader } from '@/components/editor/patch-editor-header'
import { LoadNamedBankDialog } from '@/components/patches/load-named-bank-dialog'
import { createNamedBank } from '@/lib/named-bank'
import { emptyPatchLibrary, importVoices, makeDemoVoices } from '@/lib/patch-library'
import { Fm1ColorwayPicker } from '@/components/ui/fm1-colorway-picker'
import { ToastProvider } from '@/components/ui/toast'
import { makeFakeCanvas } from '@/test/fake-canvas'

afterEach(cleanup)

const classTokens = (element: Element | null) => element?.getAttribute('class')?.split(/\s+/) ?? []

/*
  jsdom does not evaluate media queries or run transitions, so these check that each motion
  declares its reduced-motion snap rather than observing the motion itself.
*/
describe('reduced motion', () => {
  it('snaps every transition on the firmware page when reduced motion is requested', async () => {
    const css = (await readFile(path.resolve('src/firmware-page.css'), 'utf8')).replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    )
    const reducedMotionBlocks = css
      .split('@media (prefers-reduced-motion: reduce)')
      .slice(1)
      .map((block) => block.slice(0, block.indexOf('\n  }\n')))
      .join('\n')
    const transitioned = [
      ...css.matchAll(/\n  ([^{}@]+?)\s*\{[^}]*\btransition:(?!\s*none)/g),
    ].flatMap(([, selectors]) => selectors.split(',').map((selector) => selector.trim()))

    expect(transitioned.length).toBeGreaterThan(0)
    for (const selector of transitioned) {
      expect(reducedMotionBlocks).toContain(selector)
    }
  })

  it('stops the MIDI switch thumb sliding when reduced motion is requested', async () => {
    const css = await readFile(path.resolve('src/index.css'), 'utf8')
    const reducedMotionBlocks = css
      .split('@media (prefers-reduced-motion: reduce)')
      .slice(1)
      .map((block) => block.slice(0, block.indexOf('\n  }\n')))

    expect(
      reducedMotionBlocks.some((block) =>
        /\.midi-switch-track::after\s*\{\s*transition:\s*none;/.test(block),
      ),
    ).toBe(true)
  })

  it('lets an open panel’s dropdowns overflow at once when reduced motion is requested', async () => {
    const css = await readFile(path.resolve('src/index.css'), 'utf8')
    const reducedMotionBlocks = css
      .split('@media (prefers-reduced-motion: reduce)')
      .slice(1)
      .map((block) => block.slice(0, block.indexOf('\n  }\n')))

    expect(
      reducedMotionBlocks.some((block) =>
        /\.rack-collapsible\[data-overflow='open'\]\[data-collapsed='false'\],[^{]*\{\s*transition:\s*none;/.test(
          block,
        ),
      ),
    ).toBe(true)
  })

  it('stops the copy readout flickering when reduced motion is requested', async () => {
    const css = await readFile(path.resolve('src/index.css'), 'utf8')
    const reducedMotionBlocks = css
      .split('@media (prefers-reduced-motion: reduce)')
      .slice(1)
      .map((block) => block.slice(0, block.indexOf('\n  }\n')))

    expect(
      reducedMotionBlocks.some((block) => /\.copy-readout\s*\{\s*animation:\s*none;/.test(block)),
    ).toBe(true)
  })

  it('holds a changed slot lit without fading when reduced motion is requested', async () => {
    const css = await readFile(path.resolve('src/index.css'), 'utf8')
    const reducedMotionBlocks = css
      .split('@media (prefers-reduced-motion: reduce)')
      .slice(1)
      .map((block) => block.slice(0, block.indexOf('\n  }\n')))

    expect(
      reducedMotionBlocks.some((block) =>
        /\.patch-cell-changed\s*\{[^}]*animation:\s*none;/.test(block),
      ),
    ).toBe(true)
  })

  it('leaves out the menu flash, the name scramble, and the readout afterglow when reduced motion is requested', async () => {
    const css = await readFile(path.resolve('src/index.css'), 'utf8')
    const reducedMotionBlocks = css
      .split('@media (prefers-reduced-motion: reduce)')
      .slice(1)
      .map((block) => block.slice(0, block.indexOf('\n  }\n')))
    const snaps = (pattern: RegExp) => reducedMotionBlocks.some((block) => pattern.test(block))

    expect(snaps(/\.menu-flash-copy,\s*\.phosphor-afterglow\s*\{\s*display:\s*none;/)).toBe(true)
    expect(snaps(/\.patch-name\[data-scramble\]::after\s*\{\s*content:\s*none;/)).toBe(true)
  })

  it('never starts attract mode, and snaps its fade, when reduced motion is requested', async () => {
    const css = await readFile(path.resolve('src/index.css'), 'utf8')
    const reducedMotionBlocks = css
      .split('@media (prefers-reduced-motion: reduce)')
      .slice(1)
      .map((block) => block.slice(0, block.indexOf('\n  }\n')))
    expect(
      reducedMotionBlocks.some((block) => /\.attract-mode\s*\{\s*animation:\s*none;/.test(block)),
    ).toBe(true)

    vi.useFakeTimers()
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const load = vi.fn(() => new Promise<never>(() => {}))
    const uninstall = installAttractIdle({ addResourceBundle: vi.fn(), t: vi.fn() } as never, load)
    await vi.advanceTimersByTimeAsync(attractIdleMs * 3)
    expect(load).not.toHaveBeenCalled()
    uninstall()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('leaves the degauss out when reduced motion is requested', async () => {
    const css = await readFile(path.resolve('src/index.css'), 'utf8')
    const reducedMotionBlocks = css
      .split('@media (prefers-reduced-motion: reduce)')
      .slice(1)
      .map((block) => block.slice(0, block.indexOf('\n  }\n')))

    expect(
      reducedMotionBlocks.some(
        (block) =>
          /\.synthwave-shell\[data-degauss\]\s*\{\s*animation:\s*none;/.test(block) &&
          /\.degauss\s*\{\s*display:\s*none;/.test(block),
      ),
    ).toBe(true)
  })

  it('keeps the marching ants still when reduced motion is requested', async () => {
    const css = await readFile(path.resolve('src/index.css'), 'utf8')
    const reducedMotionBlocks = css
      .split('@media (prefers-reduced-motion: reduce)')
      .slice(1)
      .map((block) => block.slice(0, block.indexOf('\n  }\n')))

    expect(
      reducedMotionBlocks.some((block) =>
        /\.bank-tab\[data-drop-target\]::after,\s*\.effect-box\[data-dragging\]::after,\s*\.patch-cell\[data-dragging\]::after\s*\{\s*animation:\s*none;/.test(
          block,
        ),
      ),
    ).toBe(true)
  })

  it('hides the zoom rectangles when reduced motion is requested', async () => {
    const css = await readFile(path.resolve('src/index.css'), 'utf8')
    const reducedMotionBlocks = css
      .split('@media (prefers-reduced-motion: reduce)')
      .slice(1)
      .map((block) => block.slice(0, block.indexOf('\n  }\n')))

    expect(
      reducedMotionBlocks.some((block) => /\.zoom-rects\s*\{\s*display:\s*none;/.test(block)),
    ).toBe(true)
  })

  it('hides the CRT switch-off when reduced motion is requested', async () => {
    const css = await readFile(path.resolve('src/index.css'), 'utf8')
    const reducedMotionBlocks = css
      .split('@media (prefers-reduced-motion: reduce)')
      .slice(1)
      .map((block) => block.slice(0, block.indexOf('\n  }\n')))

    expect(
      reducedMotionBlocks.some((block) =>
        /\.crt-switch-off-picture\s*\{\s*display:\s*none;/.test(block),
      ),
    ).toBe(true)
  })

  it('keeps the barber pole still when reduced motion is requested', async () => {
    const css = await readFile(path.resolve('src/index.css'), 'utf8')
    const reducedMotionBlocks = css
      .split('@media (prefers-reduced-motion: reduce)')
      .slice(1)
      .map((block) => block.slice(0, block.indexOf('\n  }\n')))

    expect(
      reducedMotionBlocks.some((block) =>
        /\.barber-pole,\s*\.midi-switch\[data-busy\] \.midi-switch-track\s*\{\s*animation:\s*none;/.test(
          block,
        ),
      ),
    ).toBe(true)
  })

  it('holds the tape loader’s stripes and reels, and the footer’s horizon, still when reduced motion is requested', async () => {
    const css = await readFile(path.resolve('src/index.css'), 'utf8')
    const reducedMotionBlocks = css
      .split('@media (prefers-reduced-motion: reduce)')
      .slice(1)
      .map((block) => block.slice(0, block.indexOf('\n  }\n')))

    expect(
      reducedMotionBlocks.some((block) =>
        /\.tape-loader::before,\s*\.tape-loader::after,\s*footer\.hero-footer-text::after\s*\{\s*animation:\s*none;/.test(
          block,
        ),
      ),
    ).toBe(true)
  })

  it('stops the preset read LEDs flashing when reduced motion is requested', async () => {
    const css = await readFile(path.resolve('src/index.css'), 'utf8')
    const reducedMotionBlocks = css
      .split('@media (prefers-reduced-motion: reduce)')
      .slice(1)
      .map((block) => block.slice(0, block.indexOf('\n  }\n')))

    expect(
      reducedMotionBlocks.some((block) =>
        /\.read-led\[data-state\]\s*\{\s*animation:\s*none;/.test(block),
      ),
    ).toBe(true)
  })

  it('stops the compare notice switching on when reduced motion is requested', async () => {
    const css = await readFile(path.resolve('src/index.css'), 'utf8')
    const reducedMotionBlocks = css
      .split('@media (prefers-reduced-motion: reduce)')
      .slice(1)
      .map((block) => block.slice(0, block.indexOf('\n  }\n')))

    expect(
      reducedMotionBlocks.some((block) => /\.compare-notice\s*\{\s*animation:\s*none;/.test(block)),
    ).toBe(true)
  })

  it('spins the resend icon only when motion is allowed', () => {
    const noop = vi.fn()
    const { container } = render(
      <PatchEditorHeader
        canSync
        canRedo={false}
        canUndo={false}
        isComparing={false}
        isDirty
        liveName="INIT"
        onBack={noop}
        onCompare={noop}
        onStopCompare={noop}
        onNameBlur={noop}
        onNameChange={noop}
        onRedo={noop}
        onShowNotice={null}
        onResend={noop}
        onRevert={noop}
        onSave={noop}
        onUndo={noop}
        patch={{ bank: 'A', family: 'Keys', id: 'a-1', name: 'INIT', number: 1, program: 0 }}
        presets={{
          items: [],
          label: 'Voice presets',
          menuRef: createRef<HTMLDetailsElement>(),
        }}
        saveMenuRef={createRef<HTMLDetailsElement>()}
        syncState="sending"
      />,
    )

    const icon = classTokens(container.querySelector('svg.lucide-refresh-cw'))
    expect(icon).toContain('motion-safe:animate-spin')
    expect(icon).not.toContain('animate-spin')
  })

  it('stops the dropdown arrows turning when reduced motion is requested', () => {
    const noop = vi.fn()
    const { container } = render(
      <>
        <PatchEditorHeader
          canSync
          canRedo={false}
          canUndo={false}
          isComparing={false}
          isDirty
          liveName="INIT"
          onBack={noop}
          onCompare={noop}
          onStopCompare={noop}
          onNameBlur={noop}
          onNameChange={noop}
          onRedo={noop}
          onShowNotice={null}
          onResend={noop}
          onRevert={noop}
          onSave={noop}
          onUndo={noop}
          patch={{ bank: 'A', family: 'Keys', id: 'a-1', name: 'INIT', number: 1, program: 0 }}
          presets={{
            items: [],
            label: 'Voice presets',
            menuRef: createRef<HTMLDetailsElement>(),
          }}
          saveMenuRef={createRef<HTMLDetailsElement>()}
          syncState="live"
        />
        <AlgorithmPanel
          algorithm={0}
          feedback={0}
          onAlgorithmChange={noop}
          onFeedbackChange={noop}
          onFeedbackGestureEnd={noop}
          onFeedbackGestureStart={noop}
          operatorFrequencies={['1.00×', '1.00×', '1.00×', '1.00×', '1.00×', '1.00×']}
        />
        <LfoWaveControl onChange={noop} value={0} />
        <PicturePickerControl
          label="Waveform"
          onChange={noop}
          options={[{ label: 'Saw', picture: () => null }]}
          value={0}
        />
      </>,
    )

    const arrows = container.querySelectorAll('svg.lucide-chevron-down')
    expect(arrows).toHaveLength(5)
    for (const arrow of arrows) {
      expect(classTokens(arrow)).toContain('motion-reduce:transition-none')
    }
  })

  it('holds the algorithm wireframe still, with no frames scheduled, only when reduced motion is requested', () => {
    vi.useFakeTimers()
    const { context } = makeFakeCanvas()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    )
    localStorage.setItem('fm1-algorithm-view', '3d')
    const noop = vi.fn()
    const renderWireframe = () =>
      render(
        <AlgorithmPanel
          algorithm={0}
          feedback={0}
          onAlgorithmChange={noop}
          onFeedbackChange={noop}
          onFeedbackGestureEnd={noop}
          onFeedbackGestureStart={noop}
          operatorFrequencies={['1.00×', '1.00×', '1.00×', '1.00×', '1.00×', '1.00×']}
        />,
      )
    try {
      vi.stubGlobal('matchMedia', () => ({ matches: true }))
      renderWireframe()
      vi.advanceTimersByTime(500)
      expect(vi.getTimerCount()).toBe(0)
      cleanup()

      vi.stubGlobal('matchMedia', () => ({ matches: false }))
      renderWireframe()
      vi.advanceTimersByTime(500)
      expect(vi.getTimerCount()).toBe(1)
    } finally {
      cleanup()
      localStorage.clear()
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
      vi.useRealTimers()
    }
  })

  it('holds the oscillator scope still, with no frames requested, only when reduced motion is requested', () => {
    const requestFrame = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    const renderScope = () =>
      render(<OscillatorScope coarse={2} detune={3} fine={0} mode="ratio" outputLevel={99} />)
    try {
      vi.stubGlobal('matchMedia', () => ({ matches: true }))
      renderScope()
      expect(requestFrame).not.toHaveBeenCalled()
      cleanup()

      vi.stubGlobal('matchMedia', () => ({ matches: false }))
      renderScope()
      expect(requestFrame).toHaveBeenCalled()
    } finally {
      cleanup()
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
    }
  })

  it('keeps the colourway swatches from sliding when reduced motion is requested', () => {
    const { container } = render(<Fm1ColorwayPicker onChange={vi.fn()} value="black" />)

    expect(classTokens(container.querySelector('fieldset'))).toContain(
      'motion-reduce:transition-none',
    )
    for (const swatch of container.querySelectorAll('fieldset label')) {
      expect(classTokens(swatch)).toContain('motion-reduce:transition-none')
    }
  })

  it('scrolls to the saved-bank form smoothly only when motion is allowed', async () => {
    const scrollTo = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: scrollTo,
    })
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = true
      },
    })
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    const bank = createNamedBank(importVoices(emptyPatchLibrary(), 'A', makeDemoVoices()), 'A', {
      description: '',
      id: 'bank-1',
      name: 'Stage',
      now: '2026-09-14T00:00:00.000Z',
    })
    const user = userEvent.setup()
    render(
      <LoadNamedBankDialog
        destinationBank="A"
        library={{
          bankNames: {},
          copyNamedBank: vi.fn(),
          deleteNamedBank: vi.fn(),
          hasDamagedNamedBanks: false,
          loadSavedBank: vi.fn(),
          loadedBanks: ['A'],
          namedBanks: [bank],
          namedBanksLoadFailed: false,
          namedBanksLoading: false,
          updateNamedBankDetails: vi.fn(),
          workspaceBanks: ['A'],
        }}
      />,
      { wrapper: ToastProvider },
    )

    await user.click(screen.getByRole('button', { name: 'Edit Stage' }))

    // The dialog's body is what scrolls, so it is the element that must scroll smoothly.
    expect(scrollTo).toHaveBeenCalledWith({ top: 0 })
    expect(classTokens(scrollTo.mock.contexts[0] as HTMLElement)).toContain(
      'motion-safe:scroll-smooth',
    )
    vi.unstubAllGlobals()
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo')
  })
  it('holds the welcome’s FM1 outline still: no spin, no animation loop', () => {
    const strokes: string[] = []
    let stroke: string[] = []
    const context = {
      beginPath: () => (stroke = []),
      fillRect: () => {},
      fillStyle: '',
      font: '',
      lineTo: (x: number, y: number) => stroke.push(`${x},${y}`),
      lineWidth: 1,
      measureText: () => ({ width: 40 }),
      moveTo: (x: number, y: number) => stroke.push(`${x},${y}`),
      setTransform: () => {},
      stroke: () => strokes.push(stroke.join(';')),
      strokeStyle: '',
      strokeText: () => {},
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D,
    )
    const requestFrame = vi.fn()
    vi.stubGlobal('requestAnimationFrame', requestFrame)
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    const { container } = render(<Fm1Wireframe colorway="black" fallback={null} />)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    const resting = strokes.join('|')

    expect(requestFrame).not.toHaveBeenCalled()
    // Drawn once and left; a second look at the same view is the same picture.
    const canvas = container.querySelector('canvas')!
    fireEvent.pointerDown(canvas, { clientX: 0, clientY: 0, pointerId: 1 })
    fireEvent.pointerMove(canvas, { clientX: 0, clientY: 0, pointerId: 1 })
    expect(strokes.slice(strokes.length / 2).join('|')).toBe(
      strokes.slice(0, strokes.length / 2).join('|'),
    )
    expect(resting.length).toBeGreaterThan(0)

    // Turning it by hand still works, since the viewer asked for that motion.
    fireEvent.pointerMove(canvas, { clientX: 60, clientY: 0, pointerId: 1 })
    expect(strokes.join('|')).not.toBe(`${resting}|${resting}`)

    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })
})

describe('reduced motion for the retro decoration', () => {
  async function reducedBlocks() {
    const css = await readFile(path.resolve('src/index.css'), 'utf8')
    return css
      .split('@media (prefers-reduced-motion: reduce)')
      .slice(1)
      .map((block) => block.slice(0, block.indexOf('\n  }\n')))
      .join('\n')
  }

  it('shows notifications at once, with no step in or out', async () => {
    const blocks = await reducedBlocks()

    expect(blocks).toMatch(/\.toast-surface,[^{]*\{\s*animation:\s*none;/)
    expect(blocks).toMatch(/\.toast-step-out,[^{]*\{\s*display:\s*none;/)
  })

  it('shows the firmware badge whole, with no typing or cursor', async () => {
    const blocks = await reducedBlocks()

    expect(blocks).toMatch(
      /span\[title\]:has\(> \.sr-only\),\s*span\[title\]:has\(> \.sr-only\)::after\s*\{\s*animation:\s*none;/,
    )
    expect(blocks).toMatch(/span\[title\]:has\(> \.sr-only\)::after,[^{]*\{\s*display:\s*none;/)
  })

  it('skips the photo screen wake and shows only the receive wizard’s text line', async () => {
    const blocks = await reducedBlocks()

    expect(blocks).toMatch(/\.fm1-photo-wake,[^{]*\{\s*display:\s*none;/)
    expect(blocks).toMatch(/\.receive-ladder\s*\{\s*display:\s*none;/)
  })
})
