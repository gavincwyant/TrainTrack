import { test, expect } from '../helpers/fixtures'
import { signupAsTrainer } from '../helpers/auth'
import { faker } from '@faker-js/faker'

/**
 * E2E Flow: Trainer Onboarding → First Appointment
 *
 * User Story:
 * As a new trainer, I want to sign up, add my first client,
 * and create an appointment so I can start tracking sessions.
 */

test.describe('Trainer Onboarding Flow', () => {
  test('should complete signup → add client', async ({ page }) => {
    // Step 1: Sign up as a new trainer
    const trainerName = faker.person.fullName()
    const trainerEmail = faker.internet.email().toLowerCase()
    const password = 'TestPassword123!'

    await signupAsTrainer(page, {
      fullName: trainerName,
      email: trainerEmail,
      password,
    })

    // Verify we're on the dashboard
    await expect(page).toHaveURL('/trainer/dashboard')

    // Step 2: Navigate to add client page
    await page.goto('/trainer/clients/new')
    await page.waitForURL('/trainer/clients/new')

    // Verify we're on the add client page
    await expect(page.locator('h1')).toContainText('Add New Client')

    // Step 3: Fill out client form
    const clientName = faker.person.fullName()
    const clientEmail = faker.internet.email().toLowerCase()

    await page.fill('input[name="fullName"]', clientName)
    await page.fill('input[name="email"]', clientEmail)
    await page.fill('input[name="phone"]', faker.phone.number())

    // Select billing frequency (already defaulted to PER_SESSION)
    await page.selectOption('select[name="billingFrequency"]', 'PER_SESSION')

    // Set session rate
    await page.fill('input[name="sessionRate"]', '100')

    // Manual account is already selected by default

    // Submit the form
    await page.click('button[type="submit"]')

    // Wait for redirect to clients list
    await page.waitForURL('/trainer/clients', { timeout: 5000 })

    // Verify client appears in list
    await expect(page.locator(`text=${clientName}`)).toBeVisible()
  })

  test('should show validation errors for incomplete signup', async ({ page }) => {
    await page.goto('/signup')

    // Try to submit empty form
    await page.click('button[type="submit"]')

    // Should show validation errors (check for at least one specific error)
    await expect(page.locator('.text-red-600').first()).toBeVisible()
  })

  test('should show error for duplicate email signup', async ({ page, context }) => {
    // Sign up first trainer in this page
    const email = faker.internet.email().toLowerCase()
    await signupAsTrainer(page, { email })

    // Open a new page (simulating a different browser session)
    const page2 = await context.newPage()

    // Try to sign up with same email in the new page
    await page2.goto('http://localhost:3001/signup')
    await page2.fill('input[name="fullName"]', faker.person.fullName())
    await page2.fill('input[name="email"]', email)
    await page2.fill('input[name="workspaceName"]', 'Test Workspace')
    await page2.fill('input[name="password"]', 'TestPassword123!')
    await page2.fill('input[name="confirmPassword"]', 'TestPassword123!')
    await page2.click('button[type="submit"]')

    // Should stay on signup page (not redirect to login)
    await page2.waitForTimeout(1000)
    await expect(page2).toHaveURL(/signup/)

    // Should show error message
    await expect(page2.locator('.text-red-800, .text-red-600').first()).toBeVisible({ timeout: 5000 })

    await page2.close()
  })

  test('should successfully add multiple clients', async ({ page }) => {
    // Sign up trainer
    await signupAsTrainer(page)

    // Add first client
    await page.goto('/trainer/clients/new')

    const clientName1 = faker.person.fullName()
    await page.fill('input[name="fullName"]', clientName1)
    await page.fill('input[name="email"]', faker.internet.email())
    await page.selectOption('select[name="billingFrequency"]', 'PER_SESSION')
    await page.fill('input[name="sessionRate"]', '100')
    await page.click('button[type="submit"]')

    await page.waitForURL('/trainer/clients')
    await expect(page.locator(`text=${clientName1}`)).toBeVisible()

    // Add second client
    await page.goto('/trainer/clients/new')

    const clientName2 = faker.person.fullName()
    await page.fill('input[name="fullName"]', clientName2)
    await page.fill('input[name="email"]', faker.internet.email())
    await page.selectOption('select[name="billingFrequency"]', 'MONTHLY')
    await page.fill('input[name="sessionRate"]', '500')
    await page.click('button[type="submit"]')

    await page.waitForURL('/trainer/clients')

    // Both clients should be visible
    await expect(page.locator(`text=${clientName1}`)).toBeVisible()
    await expect(page.locator(`text=${clientName2}`)).toBeVisible()
  })
})
