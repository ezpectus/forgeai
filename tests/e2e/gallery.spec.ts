import { test, expect } from '@playwright/test'

test('gallery opens and shows templates', async ({ page }) => {
  await page.route('/api/health*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok' }),
    })
  })

  await page.route('/api/templates*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          {
            id: 'restaurant',
            name: 'Restaurant',
            type: 'websites',
            topic: 'restaurant',
            description: 'A restaurant website template.',
            thumbnail: '',
          },
        ],
        total: 1,
      }),
    })
  })

  await page.goto('/')
  await page.locator('main').getByRole('button', { name: 'Templates' }).click()
  await expect(page.getByText('Template Gallery')).toBeVisible({ timeout: 10000 })
  await expect(page.getByRole('heading', { name: 'Restaurant' })).toBeVisible({ timeout: 10000 })
})
