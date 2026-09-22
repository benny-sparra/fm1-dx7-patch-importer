import { describe, expect, it } from 'vitest'

import { resolveSentryRelease, resolveSentrySourceMapUpload } from './vite.config.ts'

describe('Sentry release resolution', () => {
  it('reports no release for a build with no revision to name', () => {
    expect(resolveSentryRelease({})).toBeUndefined()
  })

  it('names the release from the deploying platform', () => {
    expect(resolveSentryRelease({ CF_PAGES_COMMIT_SHA: '  0c23a69  ' })).toBe('0c23a69')
    expect(resolveSentryRelease({ GITHUB_SHA: '0dce878' })).toBe('0dce878')
  })

  it('prefers an explicitly configured release over the platform revision', () => {
    expect(
      resolveSentryRelease({
        CF_PAGES_COMMIT_SHA: '0c23a69',
        GITHUB_SHA: '0dce878',
        SENTRY_RELEASE: 'v1.2.3',
      }),
    ).toBe('v1.2.3')
  })

  it('skips a platform variable that is present but blank', () => {
    expect(resolveSentryRelease({ CF_PAGES_COMMIT_SHA: '   ', GITHUB_SHA: '0dce878' })).toBe(
      '0dce878',
    )
  })
})

describe('Sentry source-map upload configuration', () => {
  it('keeps an ordinary build offline when no Sentry build variables are set', () => {
    expect(resolveSentrySourceMapUpload({}, 'public')).toBeUndefined()
  })

  it('configures authenticated source-map upload without build telemetry', () => {
    expect(
      resolveSentrySourceMapUpload(
        {
          SENTRY_AUTH_TOKEN: '  secret-token  ',
          SENTRY_ORG: '  example-org  ',
          SENTRY_PROJECT: '  example-project  ',
        },
        'public',
      ),
    ).toEqual({
      authToken: 'secret-token',
      org: 'example-org',
      project: 'example-project',
      sourcemaps: { assets: './dist/assets/**' },
      telemetry: false,
    })
  })

  it('files uploaded source maps under the release the client will report', () => {
    expect(
      resolveSentrySourceMapUpload(
        {
          CF_PAGES_COMMIT_SHA: '0c23a69',
          SENTRY_AUTH_TOKEN: 'secret-token',
          SENTRY_ORG: 'example-org',
          SENTRY_PROJECT: 'example-project',
        },
        'public',
      ),
    ).toMatchObject({ release: { name: '0c23a69' } })
  })

  it('rejects a partial upload configuration instead of silently skipping it', () => {
    expect(() =>
      resolveSentrySourceMapUpload({ SENTRY_AUTH_TOKEN: 'secret-token' }, 'public'),
    ).toThrow('Missing SENTRY_ORG, SENTRY_PROJECT')
  })

  it('rejects an enabled upload when source maps are disabled', () => {
    expect(() =>
      resolveSentrySourceMapUpload(
        {
          SENTRY_AUTH_TOKEN: 'secret-token',
          SENTRY_ORG: 'example-org',
          SENTRY_PROJECT: 'example-project',
        },
        'none',
      ),
    ).toThrow('requires SOURCE_MAPS to be public or hidden')
  })
})
