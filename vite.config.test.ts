import { describe, expect, it } from 'vitest'

import { resolveSentrySourceMapUpload } from './vite.config.ts'

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
