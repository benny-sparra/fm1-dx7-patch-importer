// @vitest-environment jsdom

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { AlgorithmPanel } from '@/components/editor/editor-workspace'
import { LfoWaveControl } from '@/components/editor/parameter-controls'
import { PatchEditorHeader } from '@/components/editor/patch-editor-header'
import { LoadNamedBankDialog } from '@/components/patches/load-named-bank-dialog'
import { createNamedBank } from '@/lib/named-bank'
import { emptyPatchLibrary, importVoices, makeDemoVoices } from '@/lib/patch-library'
import { Fm1ColorwayPicker } from '@/components/ui/fm1-colorway-picker'

afterEach(cleanup)

const classTokens = (element: Element | null) => element?.getAttribute('class')?.split(/\s+/) ?? []

/*
  jsdom does not evaluate media queries or run transitions, so these check that each motion
  declares its reduced-motion snap rather than observing the motion itself.
*/
describe('reduced motion', () => {
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
        onPreset={noop}
        onInitVoice={noop}
        onRandomise={noop}
        onRedo={noop}
        onResend={noop}
        onRevert={noop}
        onSave={noop}
        onUndo={noop}
        patch={{ bank: 'A', family: 'Keys', id: 'a-1', name: 'INIT', number: 1, program: 0 }}
        presetsMenuRef={createRef<HTMLDetailsElement>()}
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
          onPreset={noop}
          onInitVoice={noop}
          onRandomise={noop}
          onRedo={noop}
          onResend={noop}
          onRevert={noop}
          onSave={noop}
          onUndo={noop}
          patch={{ bank: 'A', family: 'Keys', id: 'a-1', name: 'INIT', number: 1, program: 0 }}
          presetsMenuRef={createRef<HTMLDetailsElement>()}
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
      </>,
    )

    const arrows = container.querySelectorAll('svg.lucide-chevron-down')
    expect(arrows).toHaveLength(4)
    for (const arrow of arrows) {
      expect(classTokens(arrow)).toContain('motion-reduce:transition-none')
    }
  })

  it('keeps the colourway swatches from sliding when reduced motion is requested', () => {
    const { container } = render(<Fm1ColorwayPicker onChange={vi.fn()} value="black" />)

    expect(classTokens(container.querySelector('fieldset'))).toContain(
      'motion-reduce:transition-none',
    )
    for (const swatch of container.querySelectorAll('label')) {
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
})
