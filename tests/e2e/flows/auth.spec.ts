import { test, expect } from '../helpers/fixtures'
import { faker } from '@faker-js/faker'

/**
 * Basic E2E Flow: Authentication
 *
 * Tests the fundamental authentication flows to verify E2E setup
 */

test.describe('Authentication Flow', () => {
  test('should sign up a new trainer and login', async ({ page }) => {
    const email = faker.internet.email().toLowerCase()
    const password = 'TestPassword123!'
    const fullName = faker.person.fullName()
    const businessName = `${fullName}'s Personal Training`

    // Step 1: Navigate to signup
    await page.goto('/signup')
    await expect(page.locator('h2')).toContainText('Create your free account')

    // Step 2: Fill out signup form (simplified: name, email, password)
    await page.fill('input[name="fullName"]', fullName)
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)

    // Step 3: Submit signup form
    await page.click('button[type="submit"]')

    // Step 4: Should redirect to login page with success message
    await page.waitForURL('/login?registered=true', { timeout: 10000 })
    await expect(page.locator('text=Account created')).toBeVisible()

    // Step 5: Login with new credentials
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.click('button[type="submit"]')

    // Step 6: Should redirect to onboarding for new users
    await page.waitForURL('/onboarding', { timeout: 10000 })

    // Step 7: Complete onboarding with business name
    await page.fill('input[name="businessName"]', businessName)
    await page.click('button[type="submit"]')

    // Step 8: Should redirect to trainer dashboard
    await page.waitForURL('/trainer/dashboard', { timeout: 10000 })
    await expect(page.locator('h1').first()).toContainText(/Welcome/i)
  })

  test('should show error for invalid login credentials', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[name="email"]', 'nonexistent@example.com')
    await page.fill('input[name="password"]', 'WrongPassword123!')
    await page.click('button[type="submit"]')

    // Should show error message
    await expect(page.locator('text=/Invalid email or password/i')).toBeVisible({ timeout: 5000 })
  })

  test('should show validation errors for empty signup form', async ({ page }) => {
    await page.goto('/signup')

    // Try to submit without filling anything
    await page.click('button[type="submit"]')

    // Should show validation errors (3 required fields: name, email, password)
    await expect(page.locator('.text-red-500')).toHaveCount(3, { timeout: 5000 })
  })
})
