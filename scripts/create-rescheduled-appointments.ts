import { prisma } from '../lib/db'

async function main() {
  // Find workspace with clients
  const workspaceWithClients = await prisma.user.findFirst({
    where: { role: 'CLIENT' },
    select: { workspaceId: true },
  })

  if (!workspaceWithClients) {
    console.error('No workspace with clients found')
    return
  }

  const workspaceId = workspaceWithClients.workspaceId

  // Get the trainer for this workspace
  const trainer = await prisma.user.findFirst({
    where: {
      role: 'TRAINER',
      workspaceId,
    },
  })

  if (!trainer || !trainer.workspaceId) {
    console.error('No trainer found in workspace with clients')
    return
  }

  console.log(`Found trainer: ${trainer.fullName} (Workspace: ${workspaceId})`)

  const clients = await prisma.user.findMany({
    where: {
      role: 'CLIENT',
      workspaceId,
    },
    take: 2,
  })

  console.log(`Found ${clients.length} clients`)

  // Create appointment 1: Tuesday December 10th, 2025, 10:00 - 11:00 AM
  const appointment1 = await prisma.appointment.create({
    data: {
      workspaceId: trainer.workspaceId,
      trainerId: trainer.id,
      clientId: clients[0].id,
      startTime: new Date('2025-12-09T10:00:00'),
      endTime: new Date('2025-12-09T11:00:00'),
      status: 'RESCHEDULED',
    },
    include: {
      client: { select: { fullName: true } },
    },
  })

  console.log(`Created appointment 1: ${appointment1.client.fullName} on Tuesday Dec 9, 2025, 10-11 AM`)

  // Create appointment 2: Thursday December 11th, 2025, 1:00 - 2:00 PM
  const appointment2 = await prisma.appointment.create({
    data: {
      workspaceId: trainer.workspaceId,
      trainerId: trainer.id,
      clientId: clients[clients.length > 1 ? 1 : 0].id,
      startTime: new Date('2025-12-11T13:00:00'),
      endTime: new Date('2025-12-11T14:00:00'),
      status: 'RESCHEDULED',
    },
    include: {
      client: { select: { fullName: true } },
    },
  })

  console.log(`Created appointment 2: ${appointment2.client.fullName} on Thursday Dec 11, 2025, 1-2 PM`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
