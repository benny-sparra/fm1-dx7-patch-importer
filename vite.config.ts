import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const https =
    mode === 'https'
      ? {
          key: fs.readFileSync(path.resolve(__dirname, '.cert/localhost-key.pem')),
          cert: fs.readFileSync(path.resolve(__dirname, '.cert/localhost.pem')),
        }
      : undefined

  return {
    build: {
      sourcemap: true,
    },
    plugins: [react(), tailwindcss()],
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
