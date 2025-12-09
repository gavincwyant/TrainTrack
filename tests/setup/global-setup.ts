import { beforeEach, afterAll } from 'vitest'
import { cleanDatabase, disconnectDatabase } from './test-db'
import dotenv from 'dotenv'
import path from 'path'

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') })

// Only clean database if the test file requires it
// Unit tests that don't use the database will skip this
beforeEach(async (context) => {
  // Skip database cleanup for tests that don't need it
  const testPath = context.task?.file?.filepath || ''
  const needsDatabase = testPath.includes('/integration/') ||
                       testPath.includes('/e2e/') ||
                       testPath.includes('/services/') || // Service tests need database
                       testPath.includes('database')

  if (needsDatabase) {
    try {
      await cleanDatabase()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.warn('Database cleanup skipped - database not available:', errorMessage)
    }
  }
})

// Disconnect from database after all tests
afterAll(async () => {
  try {
    await disconnectDatabase()
  } catch (error) {
    // Ignore disconnect errors in tests that don't use database
  }
})
