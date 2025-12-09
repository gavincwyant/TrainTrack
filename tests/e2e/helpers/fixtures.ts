import { test as base } from '@playwright/test'

/**
 * E2E test fixtures
 *
 * Note: Database cleanup is handled by test database reset between runs
 * The test database should be reset before running E2E tests
 */

export const test = base

export { expect } from '@playwright/test'
