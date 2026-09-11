# ForgeAI — Template & Function Constraints

> Every AI function has strict constraints. This prevents context drift, ensures the right stack, and guarantees testable, statically-analyzable code.

---

## 1. Concept

When a user clones the repo and runs `npm run dev`, they can pick a **function** (Website, Slides, Chat, Images, etc.) and type a prompt. AI then works **within that function's config**: scope, stack, constraints, validation rules, static analysis rules, and code style.

Each function is defined by a JSON config in `configs/templates/`. AI does not go outside these boundaries.

---

## 2. Global Constraints

### 2.1 Allowed Stack

| Layer              | Technology                                | Forbidden Alternatives                                |
| ------------------ | ----------------------------------------- | ----------------------------------------------------- |
| Frontend framework | Next.js 16 App Router                     | Nuxt, SvelteKit, Remix, CRA                           |
| Styling            | Tailwind CSS 3.4                          | CSS-in-JS (styled-components, emotion), inline styles |
| Components         | React Server Components + shadcn/ui       | Vue, Angular, Svelte                                  |
| State              | Zustand                                   | Redux, MobX, Jotai unless justified                   |
| Icons              | Lucide React                              | Any other icon library                                |
| Animation          | CSS transitions / Framer Motion (complex) | GSAP unless plugin                                    |
| Database           | Supabase (PostgreSQL)                     | MongoDB, Firebase, MySQL unless plugin                |
| Auth               | Supabase Auth                             | Auth0, NextAuth, Clerk unless plugin                  |
| Payments           | Stripe                                    | PayPal unless plugin                                  |
| Forms              | React controlled + shadcn/ui form         | Formik, React Hook Form unless plugin                 |
| Validation         | Zod                                       | Yup, Joi unless plugin                                |
| Build              | Next.js built-in                          | Vite, Parcel, Rollup                                  |

### 2.2 Forbidden Patterns (Global)

- `dangerouslySetInnerHTML`
- `eval()` / `new Function()` / `setTimeout(string)` <!-- security-scan:ignore documentation of forbidden patterns -->
- Inline `<script>` with dynamic content <!-- security-scan:ignore documentation of forbidden patterns -->
- `document.write`
- Hard-coded API keys in generated code
- Native `alert()` / `confirm()`
- jQuery
- CDN scripts in `<Head>` (except analytics via config)
- CSS-in-JS libraries
- `var` — use `const` / `let`
- `any` in TypeScript without justification

### 2.3 Code Style Rules

- TypeScript strict mode
- Functional components only
- Default export for section components
- Named exports for utilities and hooks
- `async/await` instead of `.then()` chains
- Error handling for all async operations
- `use client` only when necessary
- Accessibility: `aria-label`, `role`, semantic HTML
- Mobile-first Tailwind classes
- Meaningful comments only

### 2.4 Validation Pipeline

Every generated component runs through `validateComponent` (`src/lib/validate.ts`):

1. `esbuild transform` — syntax check (output also scanned for code-level patterns)
2. Pattern rules — `hasDefaultExport`, `noDangerousHtml`, `noEval`, `noScript`, `noPromptInjection`, `noPrototypePollution`, `noForbiddenImports`, `noServerSecrets`, `usesTailwindOnly`, `imagesHaveAlt`, `formsHaveNames`, `hasTitleAndMeta`
3. Dependency check — `constraints.allowedDependencies` whitelist

If validation fails, the component is retried with the exact errors (max 2 attempts). There is no `tsc`, `next build`, `eslint`, or `prettier` step inside the pipeline — those run on the host repo, not on generated output.

---

## 3. Per-Function Configs

All function configs live in `configs/templates/`. The fields the engine actually reads:

| Field             | Purpose                                                            |
| ----------------- | ------------------------------------------------------------------ |
| `id`              | Unique function identifier (matches the sidebar mode id)           |
| `name`            | Display name — fed into the intent prompt for gallery customize    |
| `description`     | Same — describes the template to the intent model                  |
| `scope.allowed`   | What the AI can generate (system prompt)                           |
| `scope.forbidden` | What the AI must not generate (system prompt)                      |
| `stack`           | Technologies to use (system prompt blob)                           |
| `constraints`     | `allowedDependencies`/`forbiddenDependencies` drive dep validation |

Earlier revisions listed more fields (`components`, `generation`, `validation`,
`model`, `export`, `ui`, `formConstraints`) — they were never consumed and have
been removed from the JSONs.

### 3.1 AI Website Builder

**File:** `configs/templates/website.json`

**Allowed:** Landing pages, multi-page sites, portfolios, simple dashboards, forms, e-commerce fronts, blogs.

**Forbidden:** Complex backend APIs, WebSocket chats, video streaming, payment backend, RBAC admin panels, crypto, P2P.

**Stack:** Next.js 16, Tailwind, shadcn-style markup, lucide-react, optional Supabase.

**Constraints:**

- Max 10 sections per page
- Max 5 forms per page
- Max 20 components total
- No inline styles
- No client-side env access
- All forms must use Supabase client
- All images must have `alt`

**Validation:**

- `hasDefaultExport`
- `noForbiddenImports`
- `noServerSecrets`
- `usesTailwindOnly`
- `hasTitleAndMeta`
- `formsHaveNames`
- `imagesHaveAlt`
- `buttonsHaveType`
- `noUnusedImports`

### 3.2 AI Slides

**File:** `configs/templates/slides.json`

**Allowed:** Pitch decks, sales, educational, reports, chart slides.

**Forbidden:** Games, interactive apps, real-time collaboration, video.

**Stack:** Next.js, Tailwind, shadcn-style markup, lucide-react.

**Constraints:**

- Max 15 slides
- Max 6 elements per slide
- Fixed color palette (1 primary, 1 secondary, 1 background, 1 text)
- One or two fonts

### 3.3 AI Images

**File:** `configs/templates/images.json`

**Allowed:** Text-to-image, batch, background removal, upscaling, region edit.

**Forbidden:** NSFW, deepfakes, face swap without consent, bulk web scraping.

**Stack:** Next.js, Tailwind, shadcn-style markup, lucide-react.

**Constraints:**

- Max image size: 2048×2048
- Max 4 images per batch
- Formats: PNG, JPEG, WebP
- All API calls through server route (no client API key)

### 3.4 AI Videos

**File:** `configs/templates/videos.json`

**Allowed:** Text-to-video, image-to-video, background removal, motion control, simple timeline.

**Forbidden:** Long-form > 60s, live streaming, complex video editor, bulk processing.

**Stack:** Next.js, Tailwind, shadcn-style markup, lucide-react, HTML5 `<video>`.

**Constraints:**

- Max duration: 60s
- Max resolution: 1080p
- Formats: MP4, WebM

### 3.5 AI Chat

**File:** `configs/templates/chat.json`

**Allowed:** AI chat, code execution in sandbox, web search, file analysis, multi-step tasks.

**Forbidden:** Local shell access, file system access, infinite autonomous loops, unauthorized commands.

**Stack:** Next.js, Tailwind, shadcn-style markup, lucide-react (chat UI is rendered statically; a real bot needs a backend not in scope).

**Constraints:**

- Max 10 attachments, 25MB each
- Tool calls visible to user
- Chat history persisted to Supabase

### 3.6 AI Reports

**File:** `configs/templates/reports.json`

**Allowed:** Research reports, executive summaries, competitive analysis, SWOT, market sizing.

**Forbidden:** Plagiarism, fabricated citations, reports > 50 pages.

**Stack:** Next.js, Tailwind, shadcn-style markup, lucide-react.

**Constraints:**

- Max 50 pages
- All claims need `[source]`
- Structure: Title, Summary, Introduction, Body, Conclusion, Sources

### 3.7 AI Canvas

**File:** `configs/templates/canvas.json`

**Allowed:** Freeform workspace, image upload, image generation, arrange, region edit, motion control.

**Forbidden:** Copyright infringement, auto public share, > 50 layers.

**Stack:** Next.js, Tailwind, shadcn-style markup, lucide-react, HTML5 Canvas.

**Constraints:**

- Max canvas size: 4096×4096
- Max 50 layers
- Auto-save every 30s

### 3.8 AI Carousel

**File:** `configs/templates/carousel.json`

**Allowed:** Instagram, LinkedIn, X carousels.

**Forbidden:** Animated carousels, video in carousels, > 15 slides.

**Stack:** Next.js, Tailwind, shadcn-style markup, lucide-react, HTML5 Canvas/SVG.

**Constraints:**

- 3-15 slides
- Fixed aspect ratio: 1:1, 4:5, or 16:9
- Max 3 colors
- Max 2 fonts

### 3.9 AI Audio

**File:** `configs/templates/audio.json`

**Allowed:** TTS, music, voice cloning (with consent), sound effects, dubbing, transcription.

**Forbidden:** Voice cloning without consent, NSFW audio, live streaming.

**Stack:** Next.js, Tailwind, shadcn-style markup, lucide-react.

**Constraints:**

- Max audio duration: 10 minutes
- Transcription files max 100MB
- Formats: MP3, WAV

### 3.10 AI Spreadsheets

**File:** `configs/templates/spreadsheets.json`

**Allowed:** Cash-flow, budgets, trackers, formulas, charts, XLSX/CSV import-export.

**Forbidden:** SQL queries, macros/VBA, real-time collab > 2 users.

**Stack:** Next.js, Tailwind, shadcn-style markup, lucide-react.

**Constraints:**

- Max 1000 rows, 50 columns
- Allowed formulas: SUM, AVERAGE, IF, VLOOKUP, COUNT, MAX, MIN, ROUND, TODAY
- Chart types: line, bar, pie, doughnut
- No circular references

---

## 4. Config Schema Example

The real `configs/templates/website.json` (all fields above are optional except `id`):

```json
{
  "id": "website",
  "name": "AI Website Builder",
  "description": "Generates a multi-section marketing or product site.",
  "scope": {
    "allowed": ["landing", "multi-page", "portfolio", "forms"],
    "forbidden": ["backend-api", "websocket-chat", "video-streaming"]
  },
  "stack": {
    "framework": "nextjs-14",
    "styling": "tailwind",
    "components": "react",
    "icons": "lucide-react",
    "database": "supabase (optional, when dbRequired)"
  },
  "constraints": {
    "allowedDependencies": ["react", "react-dom", "next", "lucide-react", "@supabase/supabase-js"],
    "forbiddenDependencies": ["jquery", "axios", "lodash", "moment"]
  }
}
```

---

## 5. Plan Mode

Not implemented — the UI generates immediately from the prompt. Listed here as a design goal only.

---

## 6. Validation & Static Analysis

Actual pipeline (`src/lib/validate.ts`):

```
esbuild transform        → syntax + provides the code scanned by pattern rules
pattern rules            → forbidden patterns, a11y basics, default export
dependency check         → constraints.allowedDependencies whitelist
retry with errors        → max 2 attempts
```

---

## 7. For Plugin Authors

Add a new function by creating a config in `configs/templates/{name}.json` and adding a sidebar entry in `src/components/layout/Sidebar.tsx` (`functions` array) — there is no `index.json` registry.

For AI provider or deployer plugins, see [CONTRIBUTING.md](../CONTRIBUTING.md).
