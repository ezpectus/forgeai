import { test, expect } from '@playwright/test'

test('gallery opens and shows templates', async ({ page }) => {
  await page.goto('/')
  await page.locator('main').getByRole('button', { name: 'Templates' }).click()
  await expect(page.getByText('Template Gallery')).toBeVisible({ timeout: 10000 })
  await expect(page.getByRole('heading', { name: 'Restaurant' })).toBeVisible({ timeout: 10000 })
})
