import { test, expect } from '@playwright/test'

const heroCode =
  'export default function Hero(){return <section className="bg-slate-900 text-white p-10" data-component="Hero"><h1 className="text-4xl font-bold">preview e2e</h1></section>}'

// Mirrors assembleProject output: a wrapped section with the click-to-edit
// postMessage handler, plus the minimal files /api/preview needs to bundle.
const mockFiles = {
  'src/app/page.tsx':
    `'use client'\n` +
    `import Hero from '@/components/sections/Hero'\n` +
    `export default function Page(){return <main><div data-component="Hero" onClick={() => { if (window.parent !== window && document.referrer) window.parent.postMessage({ action:'select', component:'Hero' }, new URL(document.referrer).origin) }}><Hero /></div></main>}`,
  'src/components/sections/Hero.tsx': heroCode,
  'src/app/globals.css': '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n',
}

const sseStream = [
  'event: intent\ndata: {"name":"e2e","type":"landing","palette":"calm","tone":"friendly","style":"modern","sections":[{"name":"Hero"}]}',
  `event: component\ndata: {"name":"Hero","code":${JSON.stringify(heroCode)},"status":"ready","version":1}`,
  `event: done\ndata: ${JSON.stringify({ projectId: 'e2e-preview', files: mockFiles })}`,
].join('\n\n') + '\n\n'

test.describe('Local preview', () => {
  test('renders the bundled site and opens the editor on section click', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Settings' }).click()
    await page.locator('#openrouter').fill('sk-or-test')
    await page.getByRole('button', { name: 'Save' }).click()

    await page.route('/api/health*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) })
    })
    await page.route('/api/models*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ models: [{ id: 'deepseek/deepseek-chat', name: 'DeepSeek V3' }] }),
      })
    })
    await page.route('/api/generate', async (route, request) => {
      if (request.method() !== 'POST') {
        await route.continue()
        return
      }
      await route.fulfill({ status: 200, contentType: 'text/event-stream', headers: { 'Cache-Control': 'no-cache' }, body: sseStream })
    })

    await page.getByPlaceholder('Describe the website you want...').fill('A landing page for a yoga studio')
    await page.getByRole('button', { name: /^Generate$/ }).click()

    await expect(page.getByText('Your project is ready')).toBeVisible({ timeout: 5000 })

    // /api/preview is NOT mocked — the real API bundles react + Tailwind.
    const frame = page.frameLocator('iframe[title="Local project preview"]')
    await expect(frame.locator('h1')).toHaveText('preview e2e', { timeout: 30_000 })

    // Click-to-edit through the opaque-origin srcdoc iframe (S108 path).
    await frame.locator('div[data-component="Hero"]').dispatchEvent('click')
    await expect(page.getByText('Edit Hero')).toBeVisible({ timeout: 5000 })
  })
})
