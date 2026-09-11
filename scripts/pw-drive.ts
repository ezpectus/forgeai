/**
 * AI-driven live browser session — headed Playwright so the user can WATCH.
 *
 * Usage:
 *   npx tsx scripts/pw-drive.ts            # full scripted tour
 *   npx tsx scripts/pw-drive.ts idle       # just open the app and stay
 *
 * Requires dev servers: npm run dev (:3000) + npm run api (:3001).
 * Generates a project against a MOCKED /api/generate so no keys are needed.
 */

import { chromium, type Page } from 'playwright'

const BASE = 'http://localhost:3000'

const heroCode =
  'export default function Hero(){return <section className="bg-slate-900 text-white p-10" data-component="Hero"><h1 className="text-4xl font-bold">pw-drive works</h1><p>Live bundled preview below.</p></section>}'

// Minimal but REAL project files — LocalPreview POSTs them to /api/preview,
// which server-bundles them (react + Tailwind) for the srcdoc iframe.
const mockFiles = {
  // Mirrors what assembleProject emits: the section is wrapped in a
  // data-component div whose onClick postMessages the selection upward.
  'src/app/page.tsx': `'use client'\nimport Hero from '@/components/sections/Hero'\nexport default function Page(){return <main><div data-component="Hero" onClick={() => { if (window.parent !== window && document.referrer) window.parent.postMessage({ action:'select', component:'Hero' }, new URL(document.referrer).origin) }}><Hero /></div></main>}`,
  'src/components/sections/Hero.tsx': heroCode,
  'src/app/globals.css': '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n',
}

const sseDone = {
  events: [
    { event: 'intent', data: { type: 'landing', sections: [{ name: 'Hero', type: 'hero', description: 'Hero', priority: 1 }], palette: 'slate', dbRequired: false, dbForms: [], pages: ['index'] } },
    { event: 'component', data: { name: 'Hero', status: 'generating' } },
    { event: 'component', data: { name: 'Hero', status: 'ready', version: 1, code: heroCode } },
    { event: 'done', data: { projectId: 'pw-drive', files: mockFiles } },
  ],
}

function sseBody(events: { event: string; data: unknown }[]) {
  return events.map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`).join('')
}

async function log(step: string) {
  console.log(`▶ ${step}`)
}

async function main() {
  const mode = process.argv[2] ?? 'tour'
  // PW_HEADLESS=1 runs without a window (for the AI to verify unattended);
  // default is headed + slowMo so the human can watch every step.
  const headless = process.env.PW_HEADLESS === '1'
  const browser = await chromium.launch({ headless, slowMo: headless ? 0 : 400 })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  page.on('console', (m) => {
    if (m.type() === 'error') console.log(`  [console.error] ${m.text().slice(0, 160)}`)
  })
  page.on('pageerror', (e) => console.log(`  [pageerror] ${String(e).slice(0, 200)}`))
  page.on('response', (r) => {
    if (r.url().includes('/api/')) {
      console.log(`  [api] ${r.request().method()} ${new URL(r.url()).pathname}${new URL(r.url()).search} → ${r.status()}`)
    }
  })

  // `**/api/...` globs — a leading-slash pattern matches only the path and
  // silently misses URLs with query strings (mount-time /api/health?provider=
  // calls leak through to the real server and 401).
  await page.route('**/api/health**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) })
  )
  await page.route('**/api/models**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ models: [{ id: 'deepseek/deepseek-chat', name: 'DeepSeek V3' }] }) })
  )
  await page.route('**/api/generate', (r) =>
    r.fulfill({ status: 200, contentType: 'text/event-stream', body: sseBody(sseDone.events) })
  )

  await page.goto(BASE)
  await log('app loaded')

  if (mode === 'idle') {
    await log('idle — watching. Close the browser to exit.')
    if (!headless) await page.waitForEvent('close', { timeout: 0 })
    await browser.close()
    return
  }

  // Dismiss onboarding if present — it mounts async; a bare isVisible()
  // check races the dialog animation and leaves the overlay eating clicks.
  const gotIt = page.getByRole('button', { name: 'Got it' })
  await gotIt.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {})
  if (await gotIt.isVisible().catch(() => false)) {
    await gotIt.click()
    await page.waitForTimeout(300)
    await log('onboarding dismissed')
  }

  // Seed a fake provider key via Settings so Generate is enabled (BYOK).
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.locator('#openrouter').fill('sk-or-test')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.waitForTimeout(400)
  await log('fake OpenRouter key saved — Generate unlocked')

  // Type a prompt and generate (mocked)
  const textarea = page.locator('textarea').first()
  await textarea.fill('Landing for a coffee roastery')
  await log('prompt typed')
  await page.getByRole('button', { name: 'Generate', exact: true }).click()
  await log('generation started (mocked stream)')

  let userClosed = false
  page.on('close', () => (userClosed = true))

  const ready = await page
    .getByText('Your project is ready')
    .waitFor({ timeout: 15_000 })
    .then(() => true)
    .catch(() => false)
  if (!ready) {
    const state = await page.evaluate(() =>
      document.body.innerText.slice(0, 600)
    )
    console.log('  [debug] ready text never appeared; page shows:\n', state)
    await page.screenshot({ path: 'runtime-docs/pw-drive-stuck.png' })
    await browser.close()
    process.exit(1)
  }
  await log('project ready — LocalPreview should be bundling now')

  // Wait for the preview iframe to render real content
  const frame = page.frameLocator('iframe[title="Local project preview"]')
  await frame.locator('h1').filter({ hasText: 'pw-drive' }).waitFor({ timeout: 20_000 })
  await log('LIVE PREVIEW RENDERED — bundled site is visible in the iframe')

  // Click-to-edit through the opaque-origin iframe. dispatchEvent bypasses
  // Playwright's hit-test (it gets confused by sandboxed-frame coordinates
  // under page overlays) but still fires the React onClick → postMessage.
  await frame.locator('div[data-component="Hero"]').dispatchEvent('click')
  await page.waitForTimeout(800)
  const editorOpen = await page.getByText(/^Edit /).isVisible().catch(() => false)
  await log(`click-to-edit ${editorOpen ? 'OPENED the editor' : 'did not open (check S108 path)'}`)

  await page.screenshot({ path: 'runtime-docs/pw-drive.png', fullPage: false })
  await log('screenshot → runtime-docs/pw-drive.png')

  await log('tour done' + (headless ? ' (headless) — exiting.' : ' — browser stays open for you to poke around. Close it to exit.'))
  if (!headless) await page.waitForEvent('close', { timeout: 0 })
  await browser.close()
}

main().catch((e) => {
  const msg = String(e)
  // Closing the watched window mid-tour is a valid exit, not a failure.
  if (msg.includes('has been closed')) {
    console.log('▶ browser closed by user — session over')
    return
  }
  console.error('pw-drive failed:', e)
  process.exit(1)
})

export type { Page }
