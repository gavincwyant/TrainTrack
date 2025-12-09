import { prisma } from '@/lib/db'

/**
 * Clean the database by truncating all tables in the correct order (respecting foreign key dependencies)
 * This is faster than recreating the entire database between tests
 */
export async function cleanDatabase() {
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
