import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const sourceMapModes = {
    hidden: 'hidden',
    none: false,
    public: true,
  } as const
  const sourceMapMode = env.SOURCE_MAPS || 'public'
  if (!(sourceMapMode in sourceMapModes)) {
    throw new Error(`Invalid SOURCE_MAPS value "${sourceMapMode}". Use public, hidden, or none.`)
  }
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
    plugins: [react(), tailwindcss()],
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
