import { prisma } from '../lib/db'

/**
 * Data migration script to populate ClientTrainer join table
 * from existing ClientProfile records.
 *
 * For each ClientProfile, creates a ClientTrainer record linking
 * the client to the workspace's trainer.
 *
 * Run with: npx tsx scripts/migrate-client-trainer-relations.ts
 */
async function main() {
  console.log('Starting ClientTrainer migration...')

  // Get all client profiles with their associated workspace
  const clientProfiles = await prisma.clientProfile.findMany({
    include: {
      user: true,
      workspace: {
        include: {
          trainer: true
        }
      }
    }
  })

  console.log(`Found ${clientProfiles.length} client profiles to migrate`)

  let created = 0
  let skipped = 0
  let errors = 0

  for (const profile of clientProfiles) {
    try {
      // Check if the relationship already exists
      const existing = await prisma.clientTrainer.findUnique({
        where: {
          clientId_trainerId_workspaceId: {
            clientId: profile.userId,
            trainerId: profile.workspace.trainerId,
            workspaceId: profile.workspaceId
          }
        }
      })

      if (existing) {
        skipped++
        continue
      }

      // Create the ClientTrainer relationship
      await prisma.clientTrainer.create({
        data: {
          clientId: profile.userId,
          trainerId: profile.workspace.trainerId,
          workspaceId: profile.workspaceId,
          isActive: true,
          startDate: profile.createdAt // Use client creation date as start date
        }
      })

      created++
      console.log(`  Created: ${profile.user.fullName} -> ${profile.workspace.trainer.fullName}`)
    } catch (error) {
      errors++
      console.error(`  Error for client ${profile.user.email}:`, error)
    }
  }

  console.log('\nMigration complete!')
  console.log(`  Created: ${created}`)
  console.log(`  Skipped (already exists): ${skipped}`)
  console.log(`  Errors: ${errors}`)
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
