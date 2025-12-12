import { prisma } from '@/lib/db'

/**
 * Clean the database by truncating all tables in the correct order (respecting foreign key dependencies)
 * This is faster than recreating the entire database between tests
 *
 * SAFETY: This function includes multiple safeguards to prevent accidental production database cleanup
 */
export async function cleanDatabase() {
  // CRITICAL SAFETY CHECK #1: Verify we're using the test database
  const databaseUrl = process.env.DATABASE_URL || ''
  if (!databaseUrl.includes('traintrack_test')) {
    throw new Error(
      `🚨 SAFETY VIOLATION: Attempted to clean non-test database!\n` +
      `Database URL: ${databaseUrl}\n` +
      `cleanDatabase() can ONLY be used with 'traintrack_test' database.\n` +
      `Current environment: ${process.env.NODE_ENV}`
    )
  }

  // CRITICAL SAFETY CHECK #2: Verify NODE_ENV is 'test'
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      `🚨 SAFETY VIOLATION: cleanDatabase() called outside test environment!\n` +
      `NODE_ENV must be 'test', got: ${process.env.NODE_ENV}`
    )
  }

  // CRITICAL SAFETY CHECK #3: Query the actual database name from PostgreSQL
  const result = await prisma.$queryRaw<[{ current_database: string }]>`SELECT current_database()`
  const actualDbName = result[0]?.current_database

  if (actualDbName !== 'traintrack_test') {
    throw new Error(
      `🚨 SAFETY VIOLATION: Connected to wrong database!\n` +
      `Expected: traintrack_test\n` +
      `Actual: ${actualDbName}\n` +
      `REFUSING to clean production database.`
    )
  }

  console.log(`✅ Safety checks passed. Cleaning test database: ${actualDbName}`)

  // Disable foreign key checks temporarily for faster cleanup
  await prisma.$executeRawUnsafe('SET session_replication_role = replica;')

  try {
    // Delete in order of dependencies (children first, parents last)
    await prisma.$transaction([
      // Calendar and workout-related tables
      prisma.calendarEventMapping.deleteMany(),
      prisma.workoutSession.deleteMany(),
      prisma.customMetricDefinition.deleteMany(),

      // Invoice-related tables
      prisma.invoiceLineItem.deleteMany(),
      prisma.invoice.deleteMany(),

      // Appointment-related tables
      prisma.appointment.deleteMany(),
      prisma.pendingAppointment.deleteMany(),

      // Availability and scheduling
      prisma.availabilityBlock.deleteMany(),
      prisma.blockedTime.deleteMany(),

      // Client-related tables
      prisma.groupSessionAllowedClient.deleteMany(),
      prisma.clientTrainer.deleteMany(),
      prisma.pendingClientProfile.deleteMany(),
      prisma.clientProfile.deleteMany(),

      // Settings
      prisma.trainerSettings.deleteMany(),

      // Users and workspaces (parent tables)
      prisma.user.deleteMany(),
      prisma.workspace.deleteMany(),
    ])
  } finally {
    // Re-enable foreign key checks
    await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;')
  }
}

/**
 * Disconnect from the database
 */
export async function disconnectDatabase() {
  await prisma.$disconnect()
}
