# ForgeAI

> **Prompt → Live URL → Full Code. Open-source, BYOK, self-hostable.**

Turn a single sentence into a deployed, working website with database, forms, and custom domain — in ~15 seconds. You bring your own API keys, you own the code, you pay fractions of a cent per generation.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/ezpectus/forgeai/pulls)
[![Made with Next.js](https://img.shields.io/badge/Made%20with-Next.js-black)](https://nextjs.org/)
[![Powered by OpenRouter](https://img.shields.io/badge/Powered%20by-OpenRouter-purple)](https://openrouter.ai/)

---

## Why This Exists

Existing AI website builders are closed, expensive, and lock you in. You don't own the code, you can't choose your models, you can't self-host, and you pay $20-100/month for something that costs $0.002 to actually run.

This project is the open-source alternative. You connect your own API keys (OpenRouter, HuggingFace, Supabase), pay only for what you use, and export the full project as code. MIT licensed, self-hostable, extensible.

---

## Who This Is For

- **Small business owners** — need a website with booking, contact forms, or lead capture in 5 minutes, not 5 weeks
- **Content creators** — landing pages for podcasts, videos, newsletters, courses
- **Solo founders** — validate an idea with a live site before writing any code
- **Developers** — skip the boilerplate. Get a full Next.js project you own and can extend
- **Open-source community** — contribute models, templates, deploy providers, components

---

## Features

### Plan → Build → Grow

The agent follows a three-phase workflow:

**1. Plan** — You type your idea. The agent parses intent (type, sections, palette, tone) and shows a visual plan: what components it will build and whether a database is needed. You see the plan live in the generation progress UI before any code is generated.

**2. Build** — The agent generates each component separately using config-driven specs (not one giant blob of code), validates every component with esbuild, and assembles a complete Next.js project. You get:

- Live URL (deployed via Vercel or E2B sandbox, when you have a Vercel token)
- Full React + Tailwind code, downloadable as ZIP
- Auto-generated database schema (Supabase) if your site has forms
- Inline visual editor — click any block, describe a change, it re-generates that single component

**3. Grow** 🔄 Roadmap — After deployment, automate growth work:

- SEO optimization (meta tags, sitemap, structured data)
- Analytics dashboard (visitors, page views, conversions)
- Automated email reminders and FAQ auto-responses
- A/B testing for headlines and CTAs

### Core Capabilities

| Feature                  | Status     | Description                                                                                    |
| ------------------------ | ---------- | ---------------------------------------------------------------------------------------------- |
| Prompt-to-Live-URL       | ✅ v1.0    | Type a sentence → get a deployed URL (mocked in tests, needs real keys for full run)          |
| Config-driven generation | ✅ v1.0    | Components are generated from strict specs and validation rules                               |
| Multi-model fallback        | ✅ v1.0    | OpenRouter, HuggingFace, Gemini with dynamic model list and automatic fallback                     |
| Pre-generation health check | ✅ Done    | Validates API keys before spending tokens, shows exact provider error, auto-picks a working key    |
| My Projects history         | ✅ Done    | Saves generations locally; download ZIP or redeploy to Vercel from the history list              |
| Home template preview       | ✅ Done    | Featured template cards on the prompt screen for one-click start                                 |
| Modern dark mode            | ✅ Done    | Reworked dark palette with a brand accent                                                        |
| Cancel generation           | ✅ Done    | Stop a running stream from the progress UI                                                       |
| Post-generation success     | ✅ Done    | Summary, component list, export, deploy and "new project" in one screen                         |
| Prompt validation           | ✅ Done    | Live character count, min-length hint and 2000-character limit                                  |
| Example prompt cards        | ✅ Done    | Clickable mini-cards with mode-aware suggestions                                                |
| Generation progress steps   | ✅ Done    | Live step label (Analyzing → Building → Assembling) and elapsed timer                           |
| Health check cache          | ✅ Done    | Caches provider health results for 30s so repeated clicks do not waste quota                     |
| Visual editor overlay       | ✅ v1.0    | Live preview iframe with selection and edit triggers                                             |
| Differential prompting      | ✅ v1.0    | Sends only the changed component on re-generation                                              |
| ZIP export                  | ✅ v1.0    | Download the full Next.js project as a ZIP                                                       |
| Auto-database binding       | ✅ v1.0    | Detects forms and generates Supabase SQL schema                                                  |
| Template library            | ✅ v1.0    | Template gallery with search, filter and customization panel                                     |
| Security & validation       | ✅ v1.0    | esbuild parse, AST scan, prompt-injection tests, CSP, rate limiting                              |
| Unit + E2E tests            | ✅ v1.0    | Vitest + Playwright with mocked API                                                              |
| Multi-page generation       | ✅ Done    | Home, About, Contact, Blog with navigation and shared `Nav` component                            |
| Plugin system            | 🔄 Roadmap | Add custom AI models, deployers, templates (interface exists, sample in README)               |
| Grow layer               | ✅ Done    | SEO, analytics, email automation, A/B testing after deployment (via Reports dashboard)         |
| AI voice agent           | 🔄 Future  | Add a voice agent to any deployed site                                                        |
| Messaging integration    | 🔄 Future  | Run the agent from Telegram, Slack, Discord                                                   |

### How Generation Works

```
Your prompt: "Landing for yoga studio with booking form"

Step 1: Intent Analysis
  → AI parses: type=landing, sections=[navbar, hero, features, pricing, contact-form, footer]
  → palette=calm-green, dbRequired=true, dbForms=[contact-form]

Step 2: Component Generation (parallel, each from its own config spec)
  → navbar.config.ts  → AI generates Navbar.tsx
  → hero.config.ts    → AI generates Hero.tsx
  → features.config.ts → AI generates Features.tsx
  → pricing.config.ts → AI generates Pricing.tsx
  → contact-form.config.ts → AI generates ContactForm.tsx (+ Supabase wiring)
  → footer.config.ts  → AI generates Footer.tsx

Step 3: Validation
  → esbuild parses each component
  → AST check: default export? no forbidden imports? no XSS? has Tailwind classes?

Step 4: Live Progress
  → Browser shows the current step, elapsed time and per-component status in real time via SSE.

Step 5: Assembly & Deploy
  → All components → page.tsx, package.json, tailwind.config, tsconfig, globals.css
  → Vercel Build API or E2B sandbox → live URL
  → If any component fails → auto-retry with the exact error message

Step 6: DB Binding (if forms detected)
  → SQL schema generated → Supabase tables created → form wired up
```

Each component config includes:

- **System prompt** — strict rules (React + Tailwind only, return JSON, no inline styles)
- **Skeleton** — base file structure pre-written, AI fills the content
- **Schema** — expected response shape
- **Validation rules** — what to check after generation
- **Model fallback chain** — which AI models to try, in order

This means the AI generates small, focused, validated components — not a giant blob of broken code.

---

## Architecture

```mermaid
flowchart TB
    subgraph Browser["Browser (Next.js 14 + Tailwind)"]
        UI["Prompt Input, Settings, Template Gallery"]
        Preview["Live Preview (iframe)"]
        Editor["Visual Editor Overlay"]
        Export["ZIP Export"]
        Keys[("API Keys<br/>IndexedDB")]
    end

    subgraph Orchestrator["API Orchestrator (Hono / Node.js)"]
        CORS["CORS + Rate Limit"]
        GenAPI["/api/generate"]
        CompAPI["/api/generate/component"]
        DeployAPI["/api/deploy"]
        ExportAPI["/api/export"]
        DbAPI["/api/db/bind"]
        HealthAPI["/api/health"]
    end

    subgraph AIPipeline["AI Pipeline"]
        Intent["Intent Analysis"]
        ComponentGen["Component Generation<br/>parallel per config"]
        Validate["Validation<br/>esbuild + AST"]
        Assemble["Assemble page.tsx"]
    end

    subgraph Providers["External APIs (BYOK)"]
        OpenRouter["OpenRouter<br/>DeepSeek / Qwen / 200+ models"]
        HuggingFace["HuggingFace<br/>DeepSeek Coder / GLM-4"]
        Gemini["Gemini<br/>Free tier"]
        Vercel["Vercel Build API"]
        E2B["E2B Sandbox"]
        Supabase["Supabase<br/>PostgreSQL"]
    end

    UI -->|Authorization: Bearer key| CORS
    CORS --> GenAPI
    CORS --> CompAPI
    CORS --> DeployAPI
    CORS --> ExportAPI
    CORS --> DbAPI
    CORS --> HealthAPI

    GenAPI -->|1. analyze prompt| Intent
    Intent -->|2. generate components| ComponentGen
    ComponentGen -->|3. validate| Validate
    Validate -->|4. assemble| Assemble
    Assemble -->|5. deploy| DeployAPI
    DeployAPI --> Vercel
    DeployAPI --> E2B
    ExportAPI --> Export
    DbAPI --> Supabase

    GenAPI -->|fallback| OpenRouter
    GenAPI -->|fallback| Gemini
    GenAPI -->|primary| HuggingFace
    ComponentGen -->|fallback| OpenRouter
    ComponentGen -->|fallback| Gemini
    ComponentGen -->|primary| HuggingFace

    CompAPI -->|differential prompt| ComponentGen
    CompAPI --> Validate

    Preview -->|hot reload| Assemble
    Editor -->|click component| CompAPI
```

For full sequence diagrams and data flow, see [docs/architecture.md](docs/architecture.md).

---

## Screenshots

Run the app, generate a project, then add your own PNGs to `public/screenshots/`:

- `public/screenshots/prompt.png`
- `public/screenshots/progress.png`
- `public/screenshots/editor.png`
- `public/screenshots/gallery.png`
- `public/screenshots/settings.png`

---

## Tech Stack

| Layer            | Technology                          | Why                                 |
| ---------------- | ----------------------------------- | ----------------------------------- |
| Frontend         | Next.js 14 + Tailwind + shadcn/ui   | Fast, beautiful, SSR                |
| API Orchestrator | Hono (Node.js)                      | 15KB, minimal, fast                 |
| AI Intent        | OpenRouter / Gemini / HuggingFace   | Cheap + free-tier options           |
| AI Code Gen      | HuggingFace (DeepSeek Coder, GLM-4) | Free tier, open-source models       |
|                  | + OpenRouter / Gemini fallback      | Multi-provider resilience           |
| Deploy           | Vercel Build API / E2B Sandbox      | Instant live URL                    |
| Database         | Supabase                            | Free tier, PostgreSQL, auto-binding |
| State            | Zustand                             | 3KB, no boilerplate                 |
| Export           | JSZip                               | ZIP archive                         |
| Validation       | esbuild                             | Fast code parsing and bundling      |

**9 production dependencies.** No Redux, no Axios, no Lodash, no Moment. Every dependency earns its place.

---

## Cost

| Step                      | Model                        | Cost        |
| ------------------------- | ---------------------------- | ----------- |
| Intent analysis           | DeepSeek V3 (OpenRouter)     | $0.0003     |
| Component generation (×6) | DeepSeek Coder (HuggingFace) | $0.0012     |
| Validation retry (avg 1)  | DeepSeek Coder (HuggingFace) | $0.0003     |
| Layout assembly           | DeepSeek V3 (OpenRouter)     | $0.0005     |
| **Total per generation**  |                              | **~$0.002** |

Compare: $0.15-0.30 with GPT-4o, $0.10-0.20 with Claude. This stack is **50-100x cheaper**.

---

## Getting Started

### Prerequisites

- Node.js 18+
- At least one AI key: OpenRouter, HuggingFace, or Gemini (see [docs/free-apis.md](docs/free-apis.md) for the full free options)
- Optional: Supabase project ([supabase.com](https://supabase.com)) for database features
- Optional: Vercel token ([vercel.com/account/tokens](https://vercel.com/account/tokens)) for deployment

### Quick Start — No Code Needed (Hosted Version)

Wait, you don't want to install anything? Same.

Once a hosted version exists, it will work like this:

1. Open the website
2. Enter your API key in Settings
3. Type your idea
4. Get a live URL

For now, self-host or ask a developer friend to run it for you.

### Install & Run — For Developers

```bash
git clone https://github.com/ezpectus/forgeai.git
cd forgeai
npm install
```

Start the API orchestrator in one terminal:

```bash
npm run api
```

Start the Next.js frontend in another:

```bash
npm run dev
```

Or run both at once with:

```bash
npm run dev:all
```

Open `http://localhost:3000`, enter your API keys in Settings, type your idea, and hit Generate.

> If you see `Failed to proxy http://localhost:3001/... ECONNREFUSED`, the API orchestrator is not running. Make sure `npm run api` is started, or use `npm run dev:all`.

The frontend proxies `/api/*` requests to the orchestrator via `API_URL` (default `http://localhost:3001`).

### Self-Hosting

```bash
# .env
OPENROUTER_API_KEY=sk-or-xxx
HUGGINGFACE_TOKEN=hf_xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=sb_xxx
VERCEL_TOKEN=xxx
API_PORT=3001
API_URL=http://localhost:3001
CORS_ORIGINS=http://localhost:3000

docker-compose up
```

Or run without Docker:

```bash
npm run build
npm start
```

---

## BYOK (Bring Your Own Keys)

Your API keys are stored in your browser's IndexedDB — never on our server. When you make a request, the key is sent as an Authorization header, forwarded to the provider, and immediately discarded from server memory.

For self-hosted deployments, you can put keys in `.env` instead.

**You pay the provider directly. We never see your keys, never charge you, never add a markup.**

---

## Plugin System

Add your own:

```typescript
// plugins/providers/my-provider.ts
import type { AIProvider } from '@/types'

export const MyProvider: AIProvider = {
  name: 'my-provider',
  async generate(prompt, config) {
    // call your API
    return { code: '...' }
  },
  async health() {
    return true
  },
}
```

```typescript
// plugins/deployers/my-deployer.ts
import type { Deployer } from '@/types'

export const MyDeployer: Deployer = {
  name: 'my-deployer',
  async deploy(files) {
    // deploy to your platform
    return { url: 'https://...', deployId: '...' }
  },
  async status(deployId) {
    return { status: 'ready', url: '...' }
  },
}
```

Register in `plugins/index.ts`. No core code changes needed.

---

## Project Structure

```
forgeai/
├── src/
│   ├── app/                    # Next.js app router
│   ├── components/             # UI components (shadcn/ui)
│   ├── stores/                 # Zustand stores (project, keys, ui)
│   ├── lib/                    # Utilities (validation, helpers)
│   │
│   ├── configs/                # Config-driven generation + template constraints
│   │   ├── templates/          # Template configs with strict AI scope (10 functions)
│   │   │   ├── website.json
│   │   │   ├── slides.json
│   │   │   ├── images.json
│   │   │   ├── videos.json
│   │   │   ├── chat.json
│   │   │   ├── reports.json
│   │   │   ├── canvas.json
│   │   │   ├── carousel.json
│   │   │   ├── audio.json
│   │   │   ├── spreadsheets.json
│   │   │   └── index.json
│   │   │
│   │   ├── intent.config.ts
│   │   ├── layout.config.ts
│   │   ├── components/         # Per-component configs
│   │   ├── deploy/             # Deploy provider configs
│   │   └── db/                 # Database schema configs
│   └── plugins/                # Extensible plugins
│       ├── providers/          # AI providers
│       ├── deployers/          # Deploy providers
│       └── templates/          # Site templates
├── api/                        # Hono orchestrator
├── docs/                       # Documentation
└── docker-compose.yml
```

---

## Status

ForgeAI v1.0.0 is released and stable. See [CHANGELOG.md](CHANGELOG.md) for the full feature list and [GitHub issues](https://github.com/ezpectus/forgeai/issues) for open tasks.

The core pipeline is complete: prompt → intent → multi-provider code generation → validation → ZIP export → Vercel deploy, with security scanning, rate limiting, provider health checks, and local project history.

Current focus areas are multi-page generation, a plugin system for custom providers/deployers, and the Grow layer (SEO, analytics, email, A/B).

---

## Contributing

MIT licensed. PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and [docs/system-design.md](docs/system-design.md) for architecture details.

---

## FAQ

**Where do I get API keys?**

- OpenRouter: [openrouter.ai/keys](https://openrouter.ai/keys) — sign up, create a key, add $1-5 credit
- HuggingFace: [hf.co/settings/tokens](https://hf.co/settings/tokens) — sign up, create a Read token (free)
- Gemini: [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) — free tier with generous limits
- Supabase: [supabase.com](https://supabase.com) — create a project (free tier), find keys in Settings > API
- Vercel: [vercel.com/account/tokens](https://vercel.com/account/tokens) — create a token

**How much does it cost?**
~$0.002 per generation. You pay the AI provider directly. $1 of OpenRouter credit = ~500 generations.

**Why does my API key fail even though the provider dashboard shows 0 usage?**
Dashboards like Google AI Studio show quota for the selected project. `0/60 RPM` means no requests were counted for that project in the last 28 days — it does not guarantee the key is active, attached to that project, or that the Generative Language API is enabled. ForgeAI runs a `/api/health` check before every generation and shows the exact error (e.g. `[400] API key not valid`). See `internal/bug-report.md` for a full diagnostic guide.

**Can I use GPT-4 or Claude?**
Yes. OpenRouter supports GPT-4o, Claude, Llama, and 200+ other models. Gemini has a free tier and works out of the box. Just change the provider/model in the dropdown. Cost will be higher (~$0.15-0.30 per generation with GPT-4o).

**Do you store my API keys?**
No. Keys are stored in your browser's IndexedDB and sent per-request as Authorization headers. The orchestrator forwards them to the provider and immediately discards them. For self-hosted, you can use `.env` instead.

**Can I self-host this?**
Yes. `docker-compose up` or `npm run build && npm start`. See `.env.example` for required variables.

**Can I add my own AI model?**
Yes. Create a plugin in `src/plugins/providers/`. See [CONTRIBUTING.md](CONTRIBUTING.md).

**Is there a hosted version?**
Not yet. Self-host for now. A hosted version may come later for those who don't want to set up keys.

**How is this different from bolt.new / Lovable / v0?**
Those are closed SaaS. You don't own the code, can't choose models, can't self-host, pay $20-100/month. ForgeAI is open-source, BYOK, self-hostable, and costs ~$0.002/generation.

---

## Comparison

| Feature          | ForgeAI       | bolt.new   | Lovable    | v0         | Runable |
| ---------------- | ------------- | ---------- | ---------- | ---------- | ------- |
| Open Source      | ✅ MIT        | ❌         | ❌         | ❌         | ❌      |
| Own the code     | ✅ ZIP export | ⚠️ limited | ⚠️ limited | ⚠️ limited | ❌      |
| BYOK             | ✅            | ❌         | ❌         | ❌         | ❌      |
| Self-host        | ✅            | ❌         | ❌         | ❌         | ❌      |
| Cost/generation  | ~$0.002       | $20+/mo    | $20+/mo    | $20+/mo    | $20+/mo |
| Plugin system    | 🔄 Roadmap    | ❌         | ❌         | ❌         | ❌      |
| Template gallery | ✅ Core       | ❌         | ❌         | ❌         | ✅      |
| Visual editor    | ✅            | ✅         | ✅         | ❌         | ✅      |
| Auto-database    | ✅ Supabase   | ❌         | ⚠️         | ❌         | ✅      |
| Grow layer       | 🔄 Roadmap    | ❌         | ❌         | ❌         | ✅      |

---

## GitHub Topics

```
ai, ai-agent, prompt-to-website, code-generation, nextjs, react, tailwindcss,
shadcn-ui, open-source, byok, self-hosted, supabase, openrouter, huggingface,
deepseek, text-to-code, low-code, no-code, landing-page-generator, website-builder,
template-engine, config-driven, plugin-architecture, vercel, e2b, typescript
```

---

## Star History

<!-- uncomment after first star
[![Star History Chart](https://api.star-history.com/svg?repos=ezpectus/forgeai&type=Date)](https://star-history.com/#ezpectus/forgeai&Date)
-->

---

## License

[MIT](LICENSE) — do whatever you want. Fork it, host it, sell it, extend it.

---

<p align="center">
  <strong>ForgeAI</strong> — Prompt → Live URL → Full Code<br>
  Open-source. BYOK. Self-hostable. ~$0.002 per generation.
</p>
