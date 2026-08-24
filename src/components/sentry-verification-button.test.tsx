// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { expectNoAxeViolations } from '@/test/accessibility'

import { SentryVerificationButton } from './sentry-verification-button'

afterEach(cleanup)

describe('SentryVerificationButton', () => {
  it('stays absent when verification is not explicitly enabled', () => {
    render(<SentryVerificationButton enabled={false} onVerify={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Send Sentry test error' })).toBeNull()
  })

  it('runs the verification action from the temporary control', async () => {
    const user = userEvent.setup()
    const onVerify = vi.fn()
    render(<SentryVerificationButton enabled onVerify={onVerify} />)

    await user.click(screen.getByRole('button', { name: 'Send Sentry test error' }))

    expect(onVerify).toHaveBeenCalledOnce()
  })

  it('keeps the temporary warning and control accessible', async () => {
    const { container } = render(<SentryVerificationButton enabled onVerify={vi.fn()} />)

    expect(screen.getByText('Sentry verification enabled.')).toBeTruthy()
    await expectNoAxeViolations(container)
  })
})
