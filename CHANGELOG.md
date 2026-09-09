# Changelog

All notable changes to ForgeAI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `PromptInput` now shows a benefit-first headline, a richer placeholder, live character count with a 2000-character limit and a minimum-length hint.
- `ExampleChips` are now rendered as clickable mini-cards with a Sparkles icon and accessible `aria-label`.
- `GenerationProgress` now displays the current step label (`Analyzing`, `Generating <component>`, `Assembling project`) and an elapsed timer.
- `GenerationSuccess` now uses a card-based layout with clearer export, deploy and new-project actions.
- `ModelSelector` now shows a health dot for each provider and `free` / `recommended` badges for models.
- `GenerationError` now provides **Edit prompt** and **Regenerate** actions in addition to **New project**.
- `SSEClient` now uses an `AbortController` and enforces a 60s connection timeout and a 120s read timeout. The API sends an immediate `ping` event to clear the connection timeout during long first-token waits.
- Added explicit 120s generate / 30s health request timeouts for OpenRouter, Gemini and HuggingFace.
- Added per-model fallback and retry logic inside each provider, including 503 capacity / 429 rate-limit retry (5s for 503, 2s for 429) and immediate 404 skip.
- Gemini now defaults to `gemini-1.5-flash` with fallback chain `1.5-flash-8b → 2.5-flash → 3.6-flash → 3.5-flash`.
- `callWithFallback` now waits 5s before the next provider on 503 and 2s on 429, instead of a flat 1s.
- Added screen-reader-only labels to `PromptInput` and `CustomizePanel` textareas.
- Added E2E Playwright coverage for cancel, regenerate after error and Vercel deploy.
- Added `internal/release-notes-v1.2.0.md` with a draft of the v1.2.0 release notes.

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
