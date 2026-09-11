# Changelog

All notable changes to ForgeAI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Local preview, no deploy needed.** `POST /api/preview` server-bundles generated files (esbuild virtual-fs + compiled Tailwind) into a sandboxed `srcdoc` iframe with multi-page routing and click-to-edit.
- **Retry failed sections.** When a stream dies mid-generation, the error screen offers "Retry N failed sections": each is regenerated via `/api/generate/component` and the project is reassembled via the new `POST /api/assemble`.
- **Project restore.** History records persist components+intent; "Open" in My Projects brings back the preview and file browser after a refresh.
- **Cost budget.** `MAX_GENERATION_COST_USD` (default $0.25) stops a generation with a dedicated "Cost budget reached" screen instead of silently spending.
- **Preview device toggle.** Desktop / 768px / 390px widths over the local preview.
- **My Projects: rename + duplicate.** Inline rename on click; duplicate makes a copy with a fresh id and no inherited deploy URL.
- **Settings: "Test all keys"** � one-click health check across every entered AI provider.
- **Edit cancellation.** Closing the editor aborts the in-flight regeneration (AbortSignal threaded to the provider call).
- **AI live-drive.** `scripts/pw-drive.ts` runs a headed Playwright session through the full flow (seed key > mocked stream > real preview bundle > click-to-edit > ZIP export > gallery). `PW_HEADLESS=1` for unattended runs.
- New e2e specs: local preview render + click-to-edit, failed-section retry, gallery open/search/customize, onboarding > Settings.
- Route-level vitest coverage for `/api/assemble` including traversal sanitization.

### Fixed

- **Clipped hero on short viewports** � `justify-center` on the scrollable main cut content off at the top; switched to an auto-margin wrapper.
- **Generated projects now `next build` clean**: FormHandler's `SubmitEvent`>`EventListener` cast removed, `sitemap.ts`/`robots.ts` get `force-static` for `output:'export'`.
- **`/api/assemble` traversal** � client-supplied intent is re-sanitized (`toIdentifier`/`toPageSlug`) before assembly.
- **No more phantom nav** � the assembler drops AI-generated nav/navigation/navbar/header sections since the layout always renders its own `<Nav/>`.
- **No more 404 images** � new `noLocalImageRefs` validation rule rejects `<img src="/...">`; generated projects ship no image files.
- Deflaked the cancel-generation e2e (wait for Generate to unlock after key save).
- Settings dialog no longer leaves its overlay up to eat clicks after saving.

### Removed

- Fake Grow/analytics layer (reports dashboard that measured nothing, `lib/grow/*`), dead plugin-registry remnants; template submission behind `ALLOW_TEMPLATE_SUBMISSIONS`.
- `internal/` planning graveyard and stale `docs/features.md` + `docs/system-design.md` (truth lives in README + `docs/architecture.md`).

### Changed

- **Generation prompts rewritten** — the component system prompt now teaches design principles (real copy, data-driven markup, layout rhythm, lucide icons) in addition to the hard rules; intent analysis no longer plans nav sections or requests images that can't exist.
- README rewritten to match the code (Next.js 16, local preview, real commands, honest roadmap, mermaid pipeline). `docs/architecture.md` documents the preview bundler + sequences.

## [1.1.0] - 2026-09-09

### Added

- Pre-generation provider health check in `src/lib/health.ts`.
  - Validates the selected or auto-detected provider before starting generation.
  - Returns exact HTTP status and provider error message (e.g. `[400] API key not valid`).
  - In `Auto` mode, picks the first healthy key and passes it to intent analysis and component generation.
- My Projects history now persists generated files (`ProjectRecord.files`) and supports:
  - Downloading the project ZIP from the history list.
  - Redeploying a saved project to Vercel.
  - Opening the previously deployed URL.
- Featured templates on the home prompt screen (`HomeTemplates`).
- Benefit-driven hero, feature cards, and a modern dark mode palette.
- Cancel button on the `GenerationProgress` UI; stores the active SSE client in `useProject`.
- Post-generation `GenerationSuccess` screen with project summary, component list, export, deploy and a "New project" action.
- Client-side 30-second cache on provider health checks (`/api/health`) to avoid hammering providers.
- Shared, cached `fetchModels()` helper used by the model dropdown and by `loadFirstModel` so `/api/models` is not fetched multiple times in a row.
- Copy code button on each `ComponentStatusRow` so generated component code can be copied to the clipboard.
- `Escape` key closes Settings, Projects, Gallery and Customize panels.
- `Ctrl/Cmd + Enter` submits the prompt from `PromptInput` and `CustomizePanel`.
- `Ctrl/Cmd + Enter` shortcut hint shown under the prompt and customize textareas.
- Last used provider and model are persisted in `localStorage` via `src/lib/prefs.ts` and restored in `PromptInput` and `CustomizePanel`.
- `Textarea` supports `autoResize` and prompt/customize textareas now grow with content up to 300px.
- Dedicated `GenerationError` view with error details, "Try again" and "New project" actions.
- TopBar buttons now have `title` and `aria-label` tooltips for accessibility.
- `PromptInput` and `CustomizePanel` textareas use `aria-describedby` to link the Ctrl/Cmd+Enter hint.
- `ComponentStatusRow` copy and expand buttons now have `title` and `aria-label`.
- `ModelSelector` provider and model dropdowns now have `aria-label`.
- `ProjectsDialog` empty state now shows a friendly icon and message; delete button has `aria-label`.
- `GalleryView` template cards, rating stars, search input and type filter now have `aria-label`.
- `LivePreview` refresh and open-in-new-tab buttons now have `aria-label`.
- `SettingsForm` help links and clear-key buttons now have `aria-label`.
- `MainArea` announces view changes via a dedicated screen-reader-only `aria-live` region.
- `GenerationSuccess` now shows real-time deploy status (`Deploying…` / `Deploy failed`) using the existing `deployStatus` state.
- New `ReportsView` dashboard reachable via the **Reports** sidebar mode. Surfaces analytics summary, recent events, an A/B test playground and email template previews using the existing `src/lib/grow` libraries.
- Multi-page website assembly: `SectionIntent` now supports a `page` field, `assemble.ts` builds per-page `page.tsx` files, generates a shared `Nav` component in the layout, and updates `sitemap.ts` with all pages.
- First-run onboarding dialog (`OnboardingDialog`) appears the first time a user opens the app, with steps for adding API keys, choosing a mode and generating.
- Playwright E2E now starts both the Next.js frontend and the Hono API server, and sets `RATE_LIMIT_RPM=1000` during tests to prevent the in-memory rate limiter from flaking the gallery test.
- Last prompt draft is persisted in `localStorage` and restored in `PromptInput`.
- Clear button next to the prompt textarea to quickly reset the draft.
- Clear button next to the customize textarea to quickly reset the customization prompt.
- Last selected active mode (website/landing/…) is persisted in `localStorage` and restored via `Sidebar`.

### Security

- Upgraded dependencies to resolve all `npm audit` vulnerabilities:
  - `next` 14.2.5 → 16.3.4
  - `eslint` 8.57.0 → ^9.0.0
  - `eslint-config-next` 14.2.5 → 16.3.4
  - `vitest` 2.1.9 → ^4.1.11
  - `esbuild` 0.23.0 → ^0.25.0
  - `postcss` 8.4.40 → ^8.5.23
- Added `eslint.config.mjs` for ESLint 9 flat config and `package.json` overrides to force safe transitive versions (`postcss`, `glob`, `vite`).
- `npm audit` now reports **0 vulnerabilities**.

### Fixed

- `Gemini.generate` no longer retries on 429 or waits 5s between 503 fallbacks, so a quota/capacity error is returned within seconds instead of hanging `GenerationProgress`.
- `analyzeIntent` now includes the actual provider error message in the "Using a default plan" warning.
- `generate.ts` now logs generation errors to the API console.
- `OpenRouter.generate` and `HuggingFace.generate` now also fail fast on 429 instead of silently trying every fallback model.
- `callWithFallback` no longer waits on 401/403/404, uses 2s backoff on 429/503, and 1s on other server errors, so a bad key or capacity error does not waste time before the next provider.
- `MainArea` now keeps the **Reports** view visible when it is the active sidebar mode, even if a generation is in progress, ready or errored.
- `Sidebar` top `Home` button now returns to the prompt view from **Reports** and only highlights one top-level nav item at a time.
- `OnboardingDialog` now persists its `seen` state when the user closes it via Escape or the backdrop.
- `PromptInput` no longer starts a second generation via the `Generate` button or `Ctrl/Cmd + Enter` while a generation is already running.
- `ModelSelector` falls back to `Auto` when the saved provider is no longer available (e.g. key removed).
- Removed duplicate `id` attributes from the email preview inputs in `ReportsView`.
- Added missing `title` and `aria-label` to icon-only close and copy/open buttons in `EditPanel`, `CustomizePanel` and `GenerationSuccess`.
- TopBar deploy button now sends the Vercel token as an `Authorization: Bearer` header.
- Sidebar active state now only highlights one top-level nav item at a time.
- Provider fallback chain (`callWithFallback`) now retries on 401, 403, 404 and 429 / >=500 errors, so an invalid key or removed model does not immediately kill generation.
- Live preview iframe sandbox now allows forms, popups and same-origin cookies so deployed sites are interactive.
- Settings Test button is now hidden for Supabase and Vercel since `/api/health` only supports AI providers.
- Settings Test uses the same cached `checkProviderHealth()` as the generation flow, so rapid test clicks and Generate share results.
- Model dropdown preserves the selected model when switching providers if that model also exists in the new list; otherwise it selects the first available model.
- `MainArea` now prioritizes the gallery and customize panel over the ready/success state so users can start a new template after generation.
- External URLs in `GenerationSuccess`, `LivePreview` and `ProjectsDialog` are opened via `openUrl()` with `rel="noopener noreferrer"`.

### Changed

- Updated README and docs to reflect the new health check, history, templates and dark mode features.
- README FAQ now explains why a provider dashboard may show `0/60 RPM` while the key still fails.
- Updated public docs (README, docs/README, docs/features) to reflect actual v1.0 feature set and roadmap status.
- Added human-readable comments to core functions in `src/lib/`, `src/stores/`, `api/` and `src/components/providers/`.
- CONTRIBUTING.md clone URL and comment style guideline updated.

## [1.0.0] - 2026-09-08

### Added

- Next.js 14 + Tailwind + shadcn/ui frontend shell (sidebar, top bar, main area, settings, gallery).
- Hono-based API orchestrator on Node.js/Bun with OpenRouter, HuggingFace, Vercel, E2B and Supabase integrations.
- Multi-model fallback pipeline: intent analysis, component generation, validation, auto-retry and assembly.
- Prompt-to-live-URL generation with SSE progress streaming and component-level status UI.
- Visual editor overlay with differential prompting, ZIP export and live preview.
- Template gallery and customization panel.
- API key management using client-side IndexedDB (BYOK).
- Zustand stores for project, UI and API keys.
- Component validation rules: syntax (esbuild), forbidden imports, no dangerous HTML, no eval, images alt, forms names, default export.
- Security and leak scanner (`npm run security`) detecting API keys, dangerous patterns and prototype pollution.
- CSP, X-Frame-Options, HSTS and other security headers in `next.config.js` and Hono middleware.
- Rate limiting middleware on all API routes.
- Unit and security tests with Vitest; Playwright E2E scaffold.
- `loading.tsx`, `error.tsx`, `not-found.tsx` and `manifest.json`.

### Fixed

- Missing `'use client'` directives causing Next.js build failures.
- Restored `security` script in `package.json`.
- Next.js dev frontend now proxies to the Hono API via rewrites.
