import { defineConfig, loadEnv } from 'vite'
import { sentryVitePlugin, type SentryVitePluginOptions } from '@sentry/vite-plugin'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

type SourceMapMode = 'hidden' | 'none' | 'public'

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

  return {
    authToken: values.SENTRY_AUTH_TOKEN,
    org: values.SENTRY_ORG,
    project: values.SENTRY_PROJECT,
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
  }
})
