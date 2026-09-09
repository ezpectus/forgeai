# Changelog

All notable changes to ForgeAI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- Last prompt draft is persisted in `localStorage` and restored in `PromptInput`.
- Clear button next to the prompt textarea to quickly reset the draft.
- Last selected active mode (website/landing/…) is persisted in `localStorage` and restored via `Sidebar`.

### Fixed

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
