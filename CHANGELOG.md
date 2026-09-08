# Changelog

All notable changes to ForgeAI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
