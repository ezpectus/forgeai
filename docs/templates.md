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
| Frontend framework | Next.js 14 App Router                     | Nuxt, SvelteKit, Remix, CRA                           |
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
- `eval()` / `new Function()` / `setTimeout(string)`
- Inline `<script>` with dynamic content
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

Every generated artifact runs through:

1. `tsc --noEmit` — TypeScript check
2. `next build` — production build
3. `eslint` — lint rules
4. `prettier --check` — formatting
5. `esbuild transform` — syntax validation
6. AST scan — forbidden patterns
7. Dependency check — whitelist only
8. Accessibility scan — labels, alts, roles
9. Dead code check — unused imports/vars

If any step fails, the component is retried with the exact error (max 2 retries).

---

## 3. Per-Function Configs

All function configs live in `configs/templates/`. Each config contains:

| Field             | Purpose                              |
| ----------------- | ------------------------------------ |
| `id`              | Unique function identifier           |
| `name`            | Display name                         |
| `scope.allowed`   | What the AI can generate             |
| `scope.forbidden` | What the AI must not generate        |
| `stack`           | Technologies to use                  |
| `constraints`     | Limits and rules                     |
| `components`      | Allowed component names              |
| `formConstraints` | Form rules (if applicable)           |
| `generation`      | Pipeline settings                    |
| `validation`      | Auto-tests and static analysis rules |
| `model`           | Models and fallback chain            |
| `export`          | Output formats                       |
| `ui`              | Default and example prompts          |

### 3.1 AI Website Builder

**File:** `configs/templates/website.json`

**Allowed:** Landing pages, multi-page sites, portfolios, simple dashboards, forms, e-commerce fronts, blogs.

**Forbidden:** Complex backend APIs, WebSocket chats, video streaming, payment backend, RBAC admin panels, crypto, P2P.

**Stack:** Next.js 14, Tailwind, shadcn/ui, Supabase, Stripe checkout links, Lucide React.

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

**Stack:** Next.js, Tailwind, shadcn/ui, Recharts, html2canvas, jsPDF, pptxgenjs.

**Constraints:**

- Max 15 slides
- Max 6 elements per slide
- Fixed color palette (1 primary, 1 secondary, 1 background, 1 text)
- One or two fonts

### 3.3 AI Images

**File:** `configs/templates/images.json`

**Allowed:** Text-to-image, batch, background removal, upscaling, region edit.

**Forbidden:** NSFW, deepfakes, face swap without consent, bulk web scraping.

**Stack:** Next.js API route, HTML5 Canvas, Replicate / HuggingFace.

**Constraints:**

- Max image size: 2048×2048
- Max 4 images per batch
- Formats: PNG, JPEG, WebP
- All API calls through server route (no client API key)

### 3.4 AI Videos

**File:** `configs/templates/videos.json`

**Allowed:** Text-to-video, image-to-video, background removal, motion control, simple timeline.

**Forbidden:** Long-form > 60s, live streaming, complex video editor, bulk processing.

**Stack:** Next.js API route, HTML5 `<video>`, Replicate / Kling / Luma.

**Constraints:**

- Max duration: 60s
- Max resolution: 1080p
- Formats: MP4, WebM

### 3.5 AI Chat

**File:** `configs/templates/chat.json`

**Allowed:** AI chat, code execution in sandbox, web search, file analysis, multi-step tasks.

**Forbidden:** Local shell access, file system access, infinite autonomous loops, unauthorized commands.

**Stack:** Next.js, Hono, OpenRouter, E2B sandbox, Supabase.

**Constraints:**

- Code runs only in E2B sandbox
- Max 10 attachments, 25MB each
- Tool calls visible to user
- Chat history persisted to Supabase

### 3.6 AI Reports

**File:** `configs/templates/reports.json`

**Allowed:** Research reports, executive summaries, competitive analysis, SWOT, market sizing.

**Forbidden:** Plagiarism, fabricated citations, reports > 50 pages.

**Stack:** Next.js, Tailwind, react-markdown, html2canvas, jsPDF, Tavily search, Supabase.

**Constraints:**

- Max 50 pages
- All claims need `[source]`
- Structure: Title, Summary, Introduction, Body, Conclusion, Sources

### 3.7 AI Canvas

**File:** `configs/templates/canvas.json`

**Allowed:** Freeform workspace, image upload, image generation, arrange, region edit, motion control.

**Forbidden:** Copyright infringement, auto public share, > 50 layers.

**Stack:** Next.js, Tailwind, Fabric.js, Supabase Storage, Replicate.

**Constraints:**

- Max canvas size: 4096×4096
- Max 50 layers
- Auto-save every 30s

### 3.8 AI Carousel

**File:** `configs/templates/carousel.json`

**Allowed:** Instagram, LinkedIn, X carousels.

**Forbidden:** Animated carousels, video in carousels, > 15 slides.

**Stack:** Next.js, Tailwind, HTML5 Canvas/SVG, html2canvas.

**Constraints:**

- 3-15 slides
- Fixed aspect ratio: 1:1, 4:5, or 16:9
- Max 3 colors
- Max 2 fonts

### 3.9 AI Audio

**File:** `configs/templates/audio.json`

**Allowed:** TTS, music, voice cloning (with consent), sound effects, dubbing, transcription.

**Forbidden:** Voice cloning without consent, NSFW audio, live streaming.

**Stack:** Next.js API route, HTML5 `<audio>`, ElevenLabs / Replicate.

**Constraints:**

- Max audio duration: 10 minutes
- Transcription files max 100MB
- Formats: MP3, WAV

### 3.10 AI Spreadsheets

**File:** `configs/templates/spreadsheets.json`

**Allowed:** Cash-flow, budgets, trackers, formulas, charts, XLSX/CSV import-export.

**Forbidden:** SQL queries, macros/VBA, real-time collab > 2 users.

**Stack:** Next.js, Tailwind, xlsx library, Recharts, Zustand.

**Constraints:**

- Max 1000 rows, 50 columns
- Allowed formulas: SUM, AVERAGE, IF, VLOOKUP, COUNT, MAX, MIN, ROUND, TODAY
- Chart types: line, bar, pie, doughnut
- No circular references

---

## 4. Config Schema Example

```json
{
  "id": "website",
  "name": "AI Website Builder",
  "version": "1.0.0",
  "category": "build",

  "scope": {
    "allowed": ["landing", "multi-page", "portfolio", "forms"],
    "forbidden": ["backend-api", "websocket-chat", "video-streaming"]
  },

  "stack": {
    "framework": "nextjs-14",
    "styling": "tailwind",
    "components": "shadcn",
    "state": "zustand",
    "database": "supabase",
    "payments": "stripe-checkout-links"
  },

  "constraints": {
    "maxSectionsPerPage": 10,
    "maxFormsPerPage": 5,
    "allowInlineStyles": false,
    "allowedDependencies": ["react", "next", "lucide-react", "zustand"],
    "forbiddenDependencies": ["jquery", "axios", "lodash", "moment"]
  },

  "components": [
    "Navbar",
    "Hero",
    "Features",
    "Pricing",
    "ContactForm",
    "Footer"
  ],

  "validation": {
    "autoTest": ["build", "typecheck", "eslint", "ast-scan"],
    "staticAnalysisRules": [
      "hasDefaultExport",
      "noForbiddenImports",
      "noServerSecrets",
      "usesTailwindOnly",
      "hasTitleAndMeta",
      "formsHaveNames",
      "imagesHaveAlt"
    ]
  },

  "model": {
    "intentModel": "openrouter:deepseek/deepseek-chat",
    "codeModel": "huggingface:deepseek-coder-7b",
    "fallback": [
      "openrouter:deepseek/deepseek-chat",
      "openrouter:Qwen/Qwen2.5-Coder"
    ]
  }
}
```

---

## 5. Plan Mode

For complex functions (multi-page sites, dashboards, auth, payments), Plan Mode is enabled:

1. **Ask** — AI asks 3-5 clarifying questions
2. **Plan** — AI shows structure (sections, pages, DB tables)
3. **Approve** — User edits or approves
4. **Build** — Generation starts only after approval

This prevents rework and reduces token usage.

---

## 6. Validation & Static Analysis

```
tsc --noEmit       → TypeScript check
next build         → production build
eslint             → lint
prettier --check   → format
esbuild transform  → syntax
ast scan           → forbidden patterns
dependency check   → whitelist
a11y check         → accessibility
dead code check    → unused imports
```

If any step fails, the component is retried with the exact error message.

---

## 7. For Plugin Authors

You can add a new function by creating a config in `configs/templates/{name}.json` and registering it in `configs/templates/index.json`.

For AI provider or deployer plugins, see [CONTRIBUTING.md](../CONTRIBUTING.md).
