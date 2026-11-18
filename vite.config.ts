import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const srcDir = fileURLToPath(new URL('./src', import.meta.url))
// T-092: the Settings stamp can never drift from the manifest that CI publishes.
const version = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
  .version as string

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  // Dev-only: allow reaching the dev server from other devices on the LAN/tailnet.
  // OPFS requires a secure context, so use the Tailscale HTTPS URL on remote devices.
  server: { allowedHosts: ['.ts.net', '192.168.0.169'] },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Coaching Manager',
        short_name: 'Coaching',
        description: 'Offline-first coaching center management for the front desk.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#ffffff',
        theme_color: '#0f766e',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Include the sqlite-wasm binary: startup migration runs before render, so without it
        // the app cannot boot offline (BUG-004).
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,wasm}'],
        cleanupOutdatedCaches: true,
        // Claim the page as soon as the worker installs, so the first visit is already offline-ready.
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // The app is fully local: no API caching is needed.
            urlPattern: /^https?:\/\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': srcDir,
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Rolldown (Vite 8) takes a function here, not an object map.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules\/(react|react-dom|react-router|scheduler)\//.test(id)) {
            return 'vendor-react'
          }
          if (/node_modules\/@tanstack\//.test(id)) return 'vendor-query'
          if (/node_modules\/(react-hook-form|@hookform|zod)\//.test(id)) return 'vendor-forms'
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/test/**', 'src/main.tsx'],
    },
  },
})
