import { test, expect } from '@playwright/test'

const sseStream = [
  'event: intent\ndata: {"name":"yoga","type":"landing","palette":"calm","tone":"friendly","style":"modern","sections":[{"name":"Hero"},{"name":"Features"}]}',
  'event: component\ndata: {"name":"Hero","code":"export default function Hero() { return <section>Hero</section> }","status":"ready","version":1}',
  'event: component\ndata: {"name":"Features","code":"export default function Features() { return <section>Features</section> }","status":"ready","version":1}',
  'event: done\ndata: {"projectId":"test-project","files":{"package.json":"{}"}}',
].join('\n\n') + '\n\n'

const sseError = [
  'event: error\ndata: {"message":"Provider refused the request"}',
].join('\n\n') + '\n\n'

const promptPlaceholder = 'Describe the website you want...'
const promptHeading = 'Generate website from one sentence.'

test.describe('ForgeAI home', () => {
  test('loads the prompt input page', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/ForgeAI/)
    await expect(page.getByPlaceholder(promptPlaceholder)).toBeVisible()
    await expect(page.getByText(promptHeading)).toBeVisible()
  })

  test('prompt input accepts text and shows model selector', async ({ page }) => {
    await page.goto('/')
    const input = page.getByPlaceholder(promptPlaceholder)
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

    await page.getByPlaceholder(promptPlaceholder).fill('A landing page for a yoga studio')
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

  test('cancels a running generation', async ({ page }) => {
    await page.goto('/')

    // Open settings and set a fake key
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

    // Override fetch so the SSE stream hangs until aborted
    await page.evaluate(() => {
      const originalFetch = (window as typeof window & { __originalFetch?: typeof fetch }).fetch
      ;(window as typeof window & { __originalFetch?: typeof fetch }).__originalFetch = originalFetch

      window.fetch = async (input, init) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.href
              : (input as Request).url

        if (url === '/api/generate') {
          // Hang until the page's AbortController cancels the request
          return new Promise<never>((_, reject) => {
            const onAbort = () =>
              reject(new DOMException('Generation cancelled', 'AbortError'))

            if (init?.signal?.aborted) {
              onAbort()
              return
            }

            init?.signal?.addEventListener('abort', onAbort, { once: true })
          })
        }

        return originalFetch(input, init)
      }
    })

    await page.getByPlaceholder(promptPlaceholder).fill('A landing page for a yoga studio')
    await page.getByRole('button', { name: /^Generate$/ }).click()

    // Wait for the progress screen
    await expect(page.getByText('Generating...')).toBeVisible({ timeout: 5000 })

    // Click the Cancel button inside the progress view
    await page.locator('main').getByRole('button', { name: 'Cancel' }).click()

    // Cancel is not an error — the UI returns to the prompt input
    await expect(page.getByPlaceholder(promptPlaceholder)).toBeVisible({ timeout: 5000 })
  })

  test('regenerates after a generation error', async ({ page }) => {
    await page.goto('/')

    // Open settings and set a fake key
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

    let requestCount = 0
    await page.route('/api/generate', async (route, request) => {
      if (request.method() !== 'POST') {
        await route.continue()
        return
      }
      requestCount++
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: { 'Cache-Control': 'no-cache' },
        body: requestCount === 1 ? sseError : sseStream,
      })
    })

    await page.getByPlaceholder(promptPlaceholder).fill('A landing page for a yoga studio')
    await page.getByRole('button', { name: /^Generate$/ }).click()

    // Error screen appears
    await expect(
      page.getByRole('heading', { name: 'Generation failed' })
    ).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Provider refused the request')).toBeVisible()

    // Click Regenerate to run the same prompt again
    await page.getByRole('button', { name: 'Regenerate' }).click()

    // Success screen appears after the second stream finishes
    await expect(page.getByText('Your project is ready')).toBeVisible({ timeout: 10000 })
  })

  test('deploys a generated project to Vercel', async ({ page }) => {
    await page.goto('/')

    // Open settings and set OpenRouter and Vercel keys
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.locator('#openrouter').fill('sk-or-test')
    await page.locator('#vercel').fill('vercel-token-test')
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
        headers: { 'Cache-Control': 'no-cache' },
        body: sseStream,
      })
    })

    await page.route('/api/deploy', async (route, request) => {
      if (request.method() !== 'POST') {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://forgeai-test.vercel.app',
          deployId: 'test-deploy',
        }),
      })
    })

    await page.getByPlaceholder(promptPlaceholder).fill('A landing page for a yoga studio')
    await page.getByRole('button', { name: /^Generate$/ }).click()

    await expect(page.getByText('Your project is ready')).toBeVisible({ timeout: 5000 })

    // Deploy the generated project
    await page.locator('main').getByRole('button', { name: 'Deploy' }).click()

    // Live URL appears in the success panel
    await expect(page.getByText('https://forgeai-test.vercel.app')).toBeVisible({ timeout: 5000 })
  })
})

