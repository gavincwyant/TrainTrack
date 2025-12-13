import { faker } from '@faker-js/faker'
import { prisma } from '@/lib/db'
import { hash } from 'bcryptjs'
import type { User, Workspace, ClientProfile, TrainerSettings, Appointment, GroupSessionAllowedClient, BlockedTime } from '@prisma/client'

export type GroupSessionPermission = 'NO_GROUP_SESSIONS' | 'ALLOW_ALL_GROUP' | 'ALLOW_SPECIFIC_CLIENTS'

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
  groupSessionRate?: number
  autoInvoiceEnabled?: boolean
  trainerEmail?: string
  clientEmail?: string
  monthlyInvoiceDay?: number
  groupSessionMatchingLogic?: 'EXACT_MATCH' | 'START_MATCH' | 'END_MATCH' | 'ANY_OVERLAP'
  defaultGroupSessionRate?: number
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

  // Update trainer to have workspaceId (needed for queries that filter by workspaceId)
  const trainer = await prisma.user.update({
    where: { id: workspace.trainer.id },
    data: { workspaceId: workspace.id },
  })

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
      groupSessionMatchingLogic: options.groupSessionMatchingLogic || 'EXACT_MATCH',
      defaultGroupSessionRate: options.defaultGroupSessionRate,
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
      groupSessionRate: options.groupSessionRate,
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
  groupSessionRate?: number
  email?: string
  autoInvoiceEnabled?: boolean
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
      groupSessionRate: options.groupSessionRate,
      autoInvoiceEnabled: options.autoInvoiceEnabled ?? true,
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

/**
 * Create a test client with specific group session settings
 */
export async function createClientWithGroupSettings(options: {
  workspaceId: string
  permission?: GroupSessionPermission
  discoverable?: boolean
  email?: string
  fullName?: string
}): Promise<{ user: User; profile: ClientProfile }> {
  const password = await hash('TestPassword123!', 10)

  const user = await prisma.user.create({
    data: {
      email: options.email || faker.internet.email(),
      passwordHash: password,
      fullName: options.fullName || faker.person.fullName(),
      role: 'CLIENT',
      workspaceId: options.workspaceId,
      phone: faker.phone.number(),
    },
  })

  const profile = await prisma.clientProfile.create({
    data: {
      userId: user.id,
      workspaceId: options.workspaceId,
      billingFrequency: 'PER_SESSION',
      sessionRate: 100,
      autoInvoiceEnabled: true,
      groupSessionPermission: options.permission || 'NO_GROUP_SESSIONS',
      groupSessionDiscoverable: options.discoverable ?? false,
    },
  })

  return { user, profile }
}

/**
 * Add an allowed client relationship for group sessions
 */
export async function addAllowedClient(
  allowerProfileId: string,
  allowedProfileId: string
): Promise<GroupSessionAllowedClient> {
  return await prisma.groupSessionAllowedClient.create({
    data: {
      allowerProfileId,
      allowedProfileId,
    },
  })
}

/**
 * Update a client profile's group session settings
 */
export async function updateGroupSessionSettings(
  profileId: string,
  settings: {
    permission?: GroupSessionPermission
    discoverable?: boolean
  }
): Promise<ClientProfile> {
  return await prisma.clientProfile.update({
    where: { id: profileId },
    data: {
      ...(settings.permission && { groupSessionPermission: settings.permission }),
      ...(settings.discoverable !== undefined && { groupSessionDiscoverable: settings.discoverable }),
    },
  })
}

/**
 * Create a blocked time for a trainer
 */
export async function createBlockedTime(options: {
  trainerId: string
  workspaceId: string
  startTime: Date
  endTime: Date
  reason?: string
  isRecurring?: boolean
  dayOfWeek?: number
}): Promise<BlockedTime> {
  return await prisma.blockedTime.create({
    data: {
      trainerId: options.trainerId,
      workspaceId: options.workspaceId,
      startTime: options.startTime,
      endTime: options.endTime,
      reason: options.reason,
      isRecurring: options.isRecurring ?? false,
      dayOfWeek: options.dayOfWeek,
    },
  })
}

/**
 * Create an appointment with group session override
 */
export async function createAppointmentWithGroupOverride(options: {
  trainerId: string
  clientId: string
  workspaceId: string
  startTime?: Date | string
  endTime?: Date | string
  status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED'
  groupSessionOverride?: 'ALLOW_ALL' | 'ALLOW_SPECIFIC' | 'NO_GROUP' | null
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
      groupSessionOverride: options.groupSessionOverride ?? null,
    },
  })
}

/**
 * Setup a complete group session test scenario
 * Returns workspace, trainer, and multiple clients with various permissions
 */
export async function setupGroupSessionTestScenario(): Promise<{
  workspace: TestWorkspace
  clientAllowAll: { user: User; profile: ClientProfile }
  clientAllowSpecific: { user: User; profile: ClientProfile }
  clientNoGroup: { user: User; profile: ClientProfile }
  clientDiscoverable: { user: User; profile: ClientProfile }
}> {
  const workspace = await createTestWorkspace()

  // Client A - allows all group sessions
  const clientAllowAll = await createClientWithGroupSettings({
    workspaceId: workspace.workspace.id,
    permission: 'ALLOW_ALL_GROUP',
    discoverable: true,
    fullName: 'Client AllowAll',
  })

  // Client B - allows specific clients only
  const clientAllowSpecific = await createClientWithGroupSettings({
    workspaceId: workspace.workspace.id,
    permission: 'ALLOW_SPECIFIC_CLIENTS',
    discoverable: true,
    fullName: 'Client AllowSpecific',
  })

  // Client C - no group sessions allowed (default)
  const clientNoGroup = await createClientWithGroupSettings({
    workspaceId: workspace.workspace.id,
    permission: 'NO_GROUP_SESSIONS',
    discoverable: false,
    fullName: 'Client NoGroup',
  })

  // Client D - discoverable but default permissions
  const clientDiscoverable = await createClientWithGroupSettings({
    workspaceId: workspace.workspace.id,
    permission: 'NO_GROUP_SESSIONS',
    discoverable: true,
    fullName: 'Client Discoverable',
  })

  return {
    workspace,
    clientAllowAll,
    clientAllowSpecific,
    clientNoGroup,
    clientDiscoverable,
  }
}
