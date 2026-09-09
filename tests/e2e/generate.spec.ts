import { test, expect } from '@playwright/test'

const sseStream = [
  'event: intent\ndata: {"name":"yoga","type":"landing","palette":"calm","tone":"friendly","style":"modern","sections":[{"name":"Hero"},{"name":"Features"}]}',
  'event: component\ndata: {"name":"Hero","code":"export default function Hero() { return <section>Hero</section> }","status":"ready","version":1}',
  'event: component\ndata: {"name":"Features","code":"export default function Features() { return <section>Features</section> }","status":"ready","version":1}',
  'event: done\ndata: {"projectId":"test-project"}',
].join('\n\n') + '\n\n'

test.describe('ForgeAI home', () => {
  test('loads the prompt input page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/ForgeAI/)
    await expect(page.getByPlaceholder('Describe the website you want...')).toBeVisible()
    await expect(page.getByText('Build a website from one sentence.')).toBeVisible()
  })

  test('prompt input accepts text and shows model selector', async ({ page }) => {
    await page.goto('/')
    const input = page.getByPlaceholder('Describe the website you want...')
    await input.fill('A landing page for a yoga studio')
    await expect(input).toHaveValue('A landing page for a yoga studio')
    await expect(page.getByText('Auto (any key)')).toBeVisible()
  })

  test('generates a project with mocked API', async ({ page }) => {
    await page.goto('/')

    // Open settings and set a fake key so Generate is enabled
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.locator('#openrouter').fill('sk-or-test')
    await page.getByRole('button', { name: 'Save' }).click()

    await page.route('/api/health*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' }),
      })
    })

    await page.route('/api/models*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          models: [{ id: 'deepseek/deepseek-chat', name: 'DeepSeek V3' }],
        }),
      })
    })

    await page.route('/api/generate', async (route, request) => {
      if (request.method() !== 'POST') {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: {
          'Cache-Control': 'no-cache',
        },
        body: sseStream,
      })
    })

    await page.getByPlaceholder('Describe the website you want...').fill('A landing page for a yoga studio')
    await page.getByRole('button', { name: /^Generate$/ }).click()

    // Success screen appears after the stream finishes
    await expect(page.getByText('Your project is ready')).toBeVisible({ timeout: 5000 })

    // Intent summary is rendered
    await expect(page.getByText('Landing')).toBeVisible()
    await expect(page.getByText('Calm')).toBeVisible()

    // Component count and rows are shown
    await expect(page.getByText('2 components')).toBeVisible()
    await expect(page.getByText('Hero')).toBeVisible()
    await expect(page.getByText('Features')).toBeVisible()
  })
})

