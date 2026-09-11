import { test, expect } from '@playwright/test'

// Stream that dies mid-generation after a failed section — drives the
// GenerationError retry path (a failed component alone doesn't error the
// flow; the stream must emit `error` or close without `done`).
const heroCode =
  'export default function Hero(){return <section><h1>recovered</h1></section>}'
const sseStream = [
  'event: intent\ndata: {"name":"retry","type":"landing","palette":"calm","tone":"x","style":"x","sections":[{"name":"Hero"},{"name":"Footer"}]}',
  `event: component\ndata: {"name":"Hero","code":${JSON.stringify(heroCode)},"status":"ready","version":1}`,
  'event: component\ndata: {"name":"Footer","status":"error","error":"provider blew up"}',
  'event: error\ndata: {"message":"Stream aborted mid-generation"}',
].join('\n\n') + '\n\n'

test.describe('Failed-section retry', () => {
  test('retries a failed section via /api/assemble', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Settings' }).click()
    await page.locator('#openrouter').fill('sk-or-test')
    await page.getByRole('button', { name: 'Save' }).click()

    await page.route('/api/health*', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"ok"}' })
    )
    await page.route('/api/models*', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: '{"models":[]}' })
    )
    await page.route('/api/generate', async (route, request) => {
      if (request.method() !== 'POST') return route.continue()
      await route.fulfill({ status: 200, contentType: 'text/event-stream', body: sseStream })
    })
    // The single-component regen returns a fixed Footer.
    await page.route('/api/generate/component', (r) =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          component: {
            name: 'Footer',
            status: 'ready',
            version: 1,
            code: 'export default function Footer(){return <footer>ok</footer>}',
          },
        }),
      })
    )

    await page.getByPlaceholder('Describe the website you want...').fill('A landing page for a yoga studio')
    const generateBtn = page.getByRole('button', { name: /^Generate$/ })
    await expect(generateBtn).toBeEnabled({ timeout: 10_000 })
    await generateBtn.click()

    // A failed section leaves the flow in an error state with a retry action.
    const retryBtn = page.getByRole('button', { name: /Retry \d+ failed section/ })
    await expect(retryBtn).toBeVisible({ timeout: 10_000 })
    await retryBtn.click()

    // /api/assemble is REAL — the rebuilt project lands in the ready state
    // with the file browser populated.
    await expect(page.getByText('Your project is ready')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Project files \(\d+\)/)).toBeVisible({ timeout: 10_000 })
  })
})
