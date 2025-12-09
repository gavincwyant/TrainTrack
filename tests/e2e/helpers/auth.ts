import { Page } from '@playwright/test'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { faker } from '@faker-js/faker'

/**
 * E2E test helpers for authentication flows
 */

export interface TestUser {
  id: string
  email: string
  password: string
  fullName: string
  role: 'TRAINER' | 'CLIENT'
  workspaceId: string
}

/**
 * Create a test user in the database and return credentials
 */
export async function createTestUser(options: {
  role: 'TRAINER' | 'CLIENT'
  workspaceId?: string
}): Promise<TestUser> {
  const password = 'TestPassword123!'
  const passwordHash = await bcrypt.hash(password, 10)
  const email = faker.internet.email().toLowerCase()
  const fullName = faker.person.fullName()

  let workspaceId = options.workspaceId
  let user

  // If trainer and no workspace, create user first then workspace
  if (options.role === 'TRAINER' && !workspaceId) {
    // Create trainer user first without workspace
    user = await prisma.user.create({
      data: {
        email,
        fullName,
        passwordHash,
        role: options.role,
      },
    })

    // Now create workspace with trainerId
    const workspace = await prisma.workspace.create({
      data: {
        name: `${fullName}'s Training`,
        trainerId: user.id,
      },
    })
    workspaceId = workspace.id

    // Update user with workspaceId
    user = await prisma.user.update({
      where: { id: user.id },
      data: { workspaceId },
    })
  } else {
    if (!workspaceId) {
      throw new Error('Workspace ID required for CLIENT users')
    }

    user = await prisma.user.create({
      data: {
        email,
        fullName,
        passwordHash,
        role: options.role,
        workspaceId,
      },
    })
  }

  // Create trainer settings if trainer
  if (options.role === 'TRAINER') {
    // Check if trainer settings already exist
    const existingSettings = await prisma.trainerSettings.findUnique({
      where: { trainerId: user.id },
    })

    if (!existingSettings) {
      await prisma.trainerSettings.create({
        data: {
          trainerId: user.id,
          workspaceId,
          invoiceDueDays: 30,
          monthlyInvoiceDay: 1,
        },
      })
    }
  }

  return {
    id: user.id,
    email,
    password,
    fullName,
    role: options.role,
    workspaceId,
  }
}

/**
 * Sign up a new trainer through the UI
 */
export async function signupAsTrainer(page: Page, options?: {
  email?: string
  password?: string
  fullName?: string
  workspaceName?: string
}) {
  const email = options?.email || faker.internet.email().toLowerCase()
  const password = options?.password || 'TestPassword123!'
  const fullName = options?.fullName || faker.person.fullName()
  const workspaceName = options?.workspaceName || `${fullName}'s Training`

  await page.goto('/signup')
  await page.fill('input[name="fullName"]', fullName)
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="workspaceName"]', workspaceName)
  await page.fill('input[name="password"]', password)
  await page.fill('input[name="confirmPassword"]', password)
  await page.click('button[type="submit"]')

  // Wait for redirect to login page
  await page.waitForURL('/login?registered=true', { timeout: 10000 })

  // Now login automatically
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')

  // Wait for redirect to dashboard
  await page.waitForURL('/trainer/dashboard', { timeout: 10000 })

  return { email, password, fullName, workspaceName }
}

/**
 * Login as an existing user through the UI
 */
export async function loginAs(page: Page, credentials: { email: string; password: string }) {
  await page.goto('/login')
  await page.fill('input[name="email"]', credentials.email)
  await page.fill('input[name="password"]', credentials.password)
  await page.click('button[type="submit"]')

  // Wait for redirect (could be /trainer/dashboard or /client/dashboard)
  await page.waitForLoadState('networkidle')
}

/**
 * Logout the current user
 */
export async function logout(page: Page) {
  // Click user menu button
  await page.click('[data-testid="user-menu"]').catch(() => {
    // Fallback: look for logout link
  })

  // Click logout
  await page.click('text=Log out')

  // Wait for redirect to login
  await page.waitForURL('/login')
}
