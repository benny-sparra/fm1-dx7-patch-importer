import { loadEnv } from 'vite'
import { configDefaults, defineConfig } from 'vitest/config'
import { sentryVitePlugin, type SentryVitePluginOptions } from '@sentry/vite-plugin'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

type SourceMapMode = 'hidden' | 'none' | 'public'

/**
 * The build this bundle came from, so a Sentry event names an exact deployment rather than leaving
 * the revision to be guessed from the date. Cloudflare Pages and GitHub Actions each supply the
 * commit themselves; SENTRY_RELEASE overrides both for a build made anywhere else.
 */
export function resolveSentryRelease(env: Record<string, string | undefined>) {
  const candidates = [env.SENTRY_RELEASE, env.CF_PAGES_COMMIT_SHA, env.GITHUB_SHA]
  return candidates.map((value) => value?.trim()).find((value) => value) || undefined
}

export function resolveSentrySourceMapUpload(
  env: Record<string, string | undefined>,
  sourceMapMode: SourceMapMode,
): SentryVitePluginOptions | undefined {
  const variableNames = ['SENTRY_AUTH_TOKEN', 'SENTRY_ORG', 'SENTRY_PROJECT'] as const
  const values = Object.fromEntries(
    variableNames.map((name) => [name, env[name]?.trim() || undefined]),
  ) as Record<(typeof variableNames)[number], string | undefined>
  const configuredVariables = variableNames.filter((name) => values[name])

  if (configuredVariables.length === 0) return undefined

  const missingVariables = variableNames.filter((name) => !values[name])
  if (missingVariables.length > 0) {
    throw new Error(
      `Incomplete Sentry source-map upload configuration. Missing ${missingVariables.join(', ')}.`,
    )
  }
  if (sourceMapMode === 'none') {
    throw new Error('Sentry source-map upload requires SOURCE_MAPS to be public or hidden.')
  }

  // Uploaded maps must be filed under the same release the client reports, or a resolved stack
  // trace will not be found for the event that needs it.
  const release = resolveSentryRelease(env)

  return {
    authToken: values.SENTRY_AUTH_TOKEN,
    org: values.SENTRY_ORG,
    project: values.SENTRY_PROJECT,
    ...(release ? { release: { name: release } } : {}),
    sourcemaps: {
      assets: './dist/assets/**',
    },
    telemetry: false,
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const sourceMapModes = {
    hidden: 'hidden',
    none: false,
    public: true,
  } as const
  const sourceMapMode = (env.SOURCE_MAPS || 'public') as SourceMapMode
  if (!(sourceMapMode in sourceMapModes)) {
    throw new Error(`Invalid SOURCE_MAPS value "${sourceMapMode}". Use public, hidden, or none.`)
  }
  const sentrySourceMapUpload =
    command === 'build' ? resolveSentrySourceMapUpload(env, sourceMapMode) : undefined
  const https =
    mode === 'https'
      ? {
          key: fs.readFileSync(path.resolve(__dirname, '.cert/localhost-key.pem')),
          cert: fs.readFileSync(path.resolve(__dirname, '.cert/localhost.pem')),
        }
      : undefined

  return {
    build: {
      manifest: true,
      sourcemap: sourceMapModes[sourceMapMode as keyof typeof sourceMapModes],
    },
    define: {
      'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(resolveSentryRelease(env) ?? ''),
    },
    plugins: [
      react(),
      tailwindcss(),
      ...(sentrySourceMapUpload ? sentryVitePlugin(sentrySourceMapUpload) : []),
    ],
    preview: {
      host: '127.0.0.1',
      https,
    },
    server: {
      https,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      // Agent worktrees under .claude/ hold other branches' tests, which must not run here.
      exclude: [...configDefaults.exclude, '.claude/**'],
      // Repairs the Node 26 / jsdom Web Storage collision. See the setup file.
      setupFiles: ['./src/test/web-storage.ts'],
    },
  }
})
