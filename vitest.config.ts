import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/global-setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['node_modules', '.next', 'tests/e2e/**'],
    // Run tests sequentially to avoid database deadlocks
    // Unit tests don't access DB, so they can run in parallel
    // Integration tests need sequential execution
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      // Enable all reporters for comprehensive coverage tracking
      reporter: ['text', 'text-summary', 'html', 'lcov', 'json'],
      // Output directory for coverage reports
      reportsDirectory: './coverage',
      // Exclude files that don't need testing
      exclude: [
        // Dependencies and build output
        'node_modules/',
        '.next/',
        'out/',
        'build/',
        // Test files themselves
        'tests/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        // Configuration files
        '**/*.config.ts',
        '**/*.config.js',
        'vitest.config.ts',
        'playwright.config.ts',
        'next.config.ts',
        'next.config.js',
        'tailwind.config.ts',
        'postcss.config.js',
        // Type definitions
        '**/*.d.ts',
        'types/**',
        // Database migrations
        'prisma/migrations/**',
        'prisma/seed.ts',
        // Scripts
        'scripts/**',
        // Prisma client initialization - logging config doesn't need testing
        'lib/db.ts',
        // Next.js app structure files that are primarily routing/layout
        'app/**/layout.tsx',
        'app/**/loading.tsx',
        'app/**/error.tsx',
        'app/**/not-found.tsx',
        // Middleware (tested via integration tests)
        'middleware.ts',
      ],
      // Global coverage thresholds
      // Note: Vitest doesn't support per-directory thresholds directly
      // Service layer coverage is monitored through the HTML report and CI checks
      // Manual verification: lib/services/** should maintain 90%+ coverage
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
        // Enable per-file thresholds (each file must meet global thresholds)
        perFile: true,
      },
      // Clean coverage directory before each run
      clean: true,
      // Include source files for coverage analysis
      include: [
        'app/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
      ],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
