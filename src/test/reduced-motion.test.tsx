// @vitest-environment jsdom

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { cleanup, render } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import { AlgorithmPanel } from '@/components/editor/editor-workspace'
import { LfoWaveControl } from '@/components/editor/parameter-controls'
import { PatchEditorHeader } from '@/components/editor/patch-editor-header'
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

  it('spins the resend icon only when motion is allowed', () => {
    const noop = vi.fn()
    const { container } = render(
      <PatchEditorHeader
        canSync
        canRedo={false}
        canUndo={false}
        isDirty
        liveName="INIT"
        onBack={noop}
        onNameBlur={noop}
        onNameChange={noop}
        onPreset={noop}
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
          isDirty
          liveName="INIT"
          onBack={noop}
          onNameBlur={noop}
          onNameChange={noop}
          onPreset={noop}
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
})
