import { faker } from '@faker-js/faker'
import { prisma } from '@/lib/db'
import { hash } from 'bcryptjs'
import type { User, Workspace, ClientProfile, TrainerSettings, Appointment } from '@prisma/client'

export interface TestWorkspace {
  workspace: Workspace
  trainer: User
  client: User
  clientProfile: ClientProfile
  trainerSettings: TrainerSettings
}

export interface WorkspaceOptions {
  billingFrequency?: 'PER_SESSION' | 'MONTHLY'
  sessionRate?: number
  autoInvoiceEnabled?: boolean
  trainerEmail?: string
  clientEmail?: string
  monthlyInvoiceDay?: number
}

/**
 * Create a complete test workspace with trainer, client, and settings
 */
export async function createTestWorkspace(
  options: WorkspaceOptions = {}
): Promise<TestWorkspace> {
  const password = await hash('TestPassword123!', 10)
  const trainerEmail = options.trainerEmail || faker.internet.email()
  const trainerName = faker.person.fullName()

  // Create workspace with trainer in a single transaction
  const workspace = await prisma.workspace.create({
    data: {
      name: trainerName + "'s Training",
      trainer: {
        create: {
          email: trainerEmail,
          passwordHash: password,
          fullName: trainerName,
          role: 'TRAINER',
          phone: faker.phone.number(),
        },
      },
    },
    include: {
      trainer: true,
    },
  })

  const trainer = workspace.trainer

  // Create trainer settings
  const trainerSettings = await prisma.trainerSettings.create({
    data: {
      workspaceId: workspace.id,
      trainerId: trainer.id,
      autoInvoicingEnabled: true,
      monthlyInvoiceDay: options.monthlyInvoiceDay || 1,
      timezone: 'America/New_York',
      dayStartTime: '09:00',
      dayEndTime: '17:00',
    },
  })

  // Create client
  const client = await prisma.user.create({
    data: {
      email: options.clientEmail || faker.internet.email(),
      passwordHash: password,
      fullName: faker.person.fullName(),
      role: 'CLIENT',
      workspaceId: workspace.id,
      phone: faker.phone.number(),
    },
  })

  // Create client profile
  const clientProfile = await prisma.clientProfile.create({
    data: {
      userId: client.id,
      workspaceId: workspace.id,
      billingFrequency: options.billingFrequency || 'PER_SESSION',
      sessionRate: options.sessionRate || 100,
      autoInvoiceEnabled: options.autoInvoiceEnabled ?? true,
    },
  })

  return {
    workspace,
    trainer,
    client,
    clientProfile,
    trainerSettings,
  }
}

/**
 * Create a test client in an existing workspace
 */
export async function createTestClient(options: {
  workspaceId: string
  billingFrequency?: 'PER_SESSION' | 'MONTHLY'
  sessionRate?: number
  email?: string
}): Promise<{ user: User; profile: ClientProfile }> {
  const password = await hash('TestPassword123!', 10)

  const user = await prisma.user.create({
    data: {
      email: options.email || faker.internet.email(),
      passwordHash: password,
      fullName: faker.person.fullName(),
      role: 'CLIENT',
      workspaceId: options.workspaceId,
      phone: faker.phone.number(),
    },
  })

  const profile = await prisma.clientProfile.create({
    data: {
      userId: user.id,
      workspaceId: options.workspaceId,
      billingFrequency: options.billingFrequency || 'PER_SESSION',
      sessionRate: options.sessionRate || 100,
      autoInvoiceEnabled: true,
    },
  })

  return { user, profile }
}

/**
 * Create a test appointment
 */
export async function createAppointment(options: {
  trainerId: string
  clientId: string
  workspaceId: string
  startTime?: Date | string
  endTime?: Date | string
  status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED'
}): Promise<Appointment> {
  const startTime = options.startTime
    ? new Date(options.startTime)
    : new Date(Date.now() + 86400000) // Tomorrow

  const endTime = options.endTime
    ? new Date(options.endTime)
    : new Date(startTime.getTime() + 3600000) // 1 hour later

  return await prisma.appointment.create({
    data: {
      workspaceId: options.workspaceId,
      trainerId: options.trainerId,
      clientId: options.clientId,
      startTime,
      endTime,
      status: options.status || 'SCHEDULED',
    },
  })
}

/**
 * Create a completed appointment (in the past)
 */
export async function createCompletedAppointment(options?: {
  trainerId?: string
  clientId?: string
  workspaceId?: string
  hoursAgo?: number
}): Promise<Appointment & { workspace: TestWorkspace }> {
  // If no workspace provided, create one
  const workspace =
    options?.workspaceId && options?.trainerId && options?.clientId
      ? null
      : await createTestWorkspace()

  const hoursAgo = options?.hoursAgo || 2
  const endTime = new Date(Date.now() - hoursAgo * 3600000)
  const startTime = new Date(endTime.getTime() - 3600000)

  const appointment = await createAppointment({
    trainerId: options?.trainerId || workspace!.trainer.id,
    clientId: options?.clientId || workspace!.client.id,
    workspaceId: options?.workspaceId || workspace!.workspace.id,
    startTime,
    endTime,
    status: 'COMPLETED',
  })

  return {
    ...appointment,
    workspace: workspace!,
  }
}

/**
 * Create a test user with specific role
 */
export async function createTestUser(options: {
  workspaceId: string
  role: 'TRAINER' | 'CLIENT'
  email?: string
}): Promise<User> {
  const password = await hash('TestPassword123!', 10)

  return await prisma.user.create({
    data: {
      email: options.email || faker.internet.email(),
      passwordHash: password,
      fullName: faker.person.fullName(),
      role: options.role,
      workspaceId: options.workspaceId,
    },
  })
}

/**
 * Get a random client from a workspace
 */
export async function getRandomClient(workspaceId: string): Promise<User> {
  const clients = await prisma.user.findMany({
    where: { workspaceId, role: 'CLIENT' },
  })

  if (clients.length === 0) {
    throw new Error('No clients found in workspace')
  }

  return clients[Math.floor(Math.random() * clients.length)]
}
