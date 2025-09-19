/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // Test environment setup for Node.js
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,ts}'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        'dist/',
        'src/migrations/',
        'prisma/',
        'scripts/',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },

    // Test file patterns
    include: [
      'src/**/*.{test,spec}.{js,ts}',
    ],

    // Test timeout for database operations
    testTimeout: 30000,

    // Sequential execution for database tests
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },

    // Mock configuration
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/routes': resolve(__dirname, './src/routes'),
      '@/services': resolve(__dirname, './src/services'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/shared': resolve(__dirname, './src/shared'),
      '@/types': resolve(__dirname, './src/types'),
    },
  },

  define: {
    // Define environment variables for tests
    'process.env.NODE_ENV': '"test"',
    'process.env.DATABASE_URL': '"postgresql://test:test@localhost:5432/villa_test"',
    'process.env.PORT': '"4002"',
  },
})