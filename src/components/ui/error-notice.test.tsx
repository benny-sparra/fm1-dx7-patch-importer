// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ErrorNotice } from './error-notice'

afterEach(cleanup)

describe('ErrorNotice', () => {
  it('announces its explanation as an alert', () => {
    render(<ErrorNotice>This file looks damaged.</ErrorNotice>)

    expect(screen.getByRole('alert').textContent).toBe('This file looks damaged.')
  })
})
