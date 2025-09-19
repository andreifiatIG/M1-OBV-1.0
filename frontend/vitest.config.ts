/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // Test environment setup
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        'dist/',
        '.next/',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },

    // Test file patterns
    include: [
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'components/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'app/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'lib/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],

    // Test timeout
    testTimeout: 10000,

    // Mock configuration
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      '@/components': resolve(__dirname, './components'),
      '@/lib': resolve(__dirname, './lib'),
      '@/app': resolve(__dirname, './app'),
      '@/types': resolve(__dirname, './types'),
    },
  },

  define: {
    // Define environment variables for tests
    'process.env.NODE_ENV': '"test"',
    'process.env.NEXT_PUBLIC_API_URL': '"http://localhost:4001"',
  },
})