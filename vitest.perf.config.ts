/** Dedicated runner for `pnpm perf`; deliberately outside `pnpm check` (D-063 A1). */
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['scripts/perf.budget.ts'],
    testTimeout: 600_000,
    hookTimeout: 600_000,
    reporters: ['verbose'],
  },
})
