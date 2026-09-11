import { test, expect } from '@playwright/test'

test.describe('Template gallery', () => {
  test('opens, searches, and shows template cards', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Templates' }).first().click()

    const search = page.getByPlaceholder('Search templates...')
    await expect(search).toBeVisible()

    // Cards render from the real /api/templates
    await expect(page.getByText('templates').first()).toBeVisible()

    await search.fill('yoga')
    await page.waitForTimeout(600) // client-side debounce/filter
    await expect(page.getByText(/yoga/i).first()).toBeVisible()
  })

  test('customize opens the customize panel', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Templates' }).first().click()
    await page.getByRole('button', { name: 'Customize' }).first().click()
    await expect(page.locator('#customize-input')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Onboarding', () => {
  test('welcome dialog opens settings', async ({ page }) => {
    await page.goto('/')
    // The shared storageState seeds forgeai_welcome_seen — clear it and
    // reload to simulate a real first visit.
    await page.evaluate(() => localStorage.removeItem('forgeai_welcome_seen'))
    await page.reload()
    await expect(page.getByText('Welcome to ForgeAI')).toBeVisible({ timeout: 5000 })
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Open settings' })
      .click()
    // Settings dialog opens with key fields
    await expect(page.locator('#openrouter')).toBeVisible({ timeout: 5000 })
  })
})
