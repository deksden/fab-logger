/**
 * @file vitest.config.ts
 * @version 1.0.0
 */
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['**/node_modules/**', 'dist/**', '.idea/**', '.git/**'],
    testTimeout: 10000,
    hookTimeout: 10000,
    isolate: true,
    // threads: false,
    sequence: {
      hooks: 'list'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      exclude: [
        'coverage/**',
        'dist/**',
        '**/node_modules/**',
        '**/*.test.ts',
        '**/test/**',
        'test/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@': './src'
    }
  }
})
