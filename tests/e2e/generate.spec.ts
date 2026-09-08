import { test, expect } from '@playwright/test'

test.describe('ForgeAI home', () => {
  test('loads the prompt input page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/ForgeAI/)
    await expect(page.getByPlaceholder('Describe the website you want...')).toBeVisible()
    await expect(page.getByText('Open-source prompt-to-live-URL generator')).toBeVisible()
  })

  test('prompt input accepts text and shows model selector', async ({ page }) => {
    await page.goto('/')
    const input = page.getByPlaceholder('Describe the website you want...')
    await input.fill('A landing page for a yoga studio')
    await expect(input).toHaveValue('A landing page for a yoga studio')
    await expect(page.getByText('deepseek-v3')).toBeVisible()
  })
})
