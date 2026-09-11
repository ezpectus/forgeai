# ForgeAI — Vision

> **Prompt → Live URL → Full Code. Open-source, BYOK, self-hostable.**

ForgeAI is an open-source prompt-to-live-URL generator. You type a sentence, and ForgeAI turns it into a deployed, working website or mini-app in about 15 seconds. You own the code, you bring your own API keys, and you pay only for what you use.

---

## Why ForgeAI Exists

Modern AI website builders are powerful, but they come with serious trade-offs:

- **Closed source** — you cannot see, modify, or self-host the platform
- **Expensive** — $20–$100/month subscriptions for something that costs ~$0.002 to run
- **Vendor lock-in** — you do not own the generated code
- **No model choice** — you are stuck with whatever models the vendor chooses
- **Hidden markups** — you pay the platform, not the AI provider directly

ForgeAI fixes all of this. It is **open-source**, **self-hostable**, **BYOK** (Bring Your Own Keys), and gives you **full ownership** of the generated code.

---

## Core Principles

### 1. User Owns the Code

Every generated project can be exported as a complete ZIP archive with a `package.json`, TypeScript, Tailwind, and full source code. You can fork it, extend it, deploy it somewhere else, or sell it.

### 2. BYOK (Bring Your Own Keys)

You connect your own API keys for OpenRouter, Gemini, HuggingFace, Supabase, and Vercel. Keys are stored in your browser's IndexedDB and never touch our servers. You pay providers directly, so there is no middleman markup.

### 3. Ultra-Low Cost

The default stack uses free-tier and low-cost models:

- **Intent analysis:** OpenRouter / Gemini / HuggingFace fallback chain (~$0.0003)
- **Code generation:** Gemini 1.5 Flash, DeepSeek Coder or OpenRouter fallback (~$0.0012)
- **Validation retry:** Same code-gen model (~$0.0003)
- **Layout assembly:** OpenRouter / Gemini fallback (~$0.0005)

**Total: ~$0.002 per generation with paid models; $0 with Gemini free tier.** Compare this to ~$0.15–$0.30 with GPT-4o.

### 4. Config-Driven Generation

Instead of asking AI to generate an entire website at once (which produces broken, messy code), ForgeAI breaks the problem into small, scoped components. Each component has:

- A strict system prompt
- A pre-defined skeleton
- A response schema
- Validation rules
- A model fallback chain

This means the AI generates small, focused, testable pieces of code that are validated and assembled into a full project.

### 5. Minimal Dependencies

The production dependency count is intentionally small. No Redux, no Axios, no Lodash, no Moment. Every dependency must earn its place:

- Next.js 16
- Tailwind CSS
- shadcn/ui
- Zustand
- Hono
- esbuild
- JSZip
- Lucide React
- Supabase client

### 6. Extensible by Plugins

You can add your own:

- AI providers
- Deploy providers
- Templates
- Components

No core code changes are needed. Provider plugins live in `src/plugins/providers/` and must implement the `AIProvider` interface (name, supportedModels, defaultModel, generate, health, and optional estimateCost).

---

## What ForgeAI Can Build

ForgeAI is built around a **Plan → Build → Grow** workflow.

### Plan

You type your idea. ForgeAI asks clarifying questions (audience, tone, features needed) and shows a visual plan with sections, components, and database tables before generating anything. You approve or adjust the plan.

### Build

ForgeAI generates each component independently, validates it with esbuild and AST checks, assembles a full Next.js project, and deploys it to a live URL.

### Grow

After deployment, ForgeAI automates growth tasks:

- SEO optimization (meta tags, sitemap, structured data)
- Analytics dashboard (visitors, conversions)
- Automated email reminders for sign-ups and bookings
- FAQ auto-responses
- A/B testing for headlines and CTAs
- Social media scheduling

---

## Output Types

ForgeAI is designed to support multiple output types over time:

| Output              | Description                                               |
| ------------------- | --------------------------------------------------------- |
| **AI Websites**     | Full-stack landing pages, portfolios, dashboards, blogs   |
| **AI Slides**       | Pitch decks, sales presentations, educational slides      |
| **AI Images**       | Text-to-image, background removal, upscaling, region edit |
| **AI Videos**       | Text-to-video, motion control, effects                    |
| **AI Chat**         | Agent with code execution, web search, sandbox            |
| **AI Reports**      | Research reports with citations and charts                |
| **AI Canvas**       | Freeform visual workspace for images and videos           |
| **AI Carousel**     | Multi-slide social media posts                            |
| **AI Audio**        | TTS, music, voice cloning, sound effects, dubbing         |
| **AI Spreadsheets** | Formulas, charts, XLSX/CSV import-export                  |

The MVP focuses on **AI Websites**. Other output types are in the roadmap.

---

## Who ForgeAI Is For

- **Small business owners** — get a website with booking, contact forms, or lead capture in 5 minutes
- **Content creators** — landing pages for podcasts, videos, newsletters, courses
- **Solo founders** — validate an idea with a live site before writing code
- **Developers** — skip boilerplate and get a full Next.js project they can extend
- **Open-source community** — contribute models, templates, deploy providers, and components

---

## Comparison with Closed-Source Tools

| Feature          | ForgeAI     | bolt.new   | Lovable    | v0         | Runable |
| ---------------- | ----------- | ---------- | ---------- | ---------- | ------- |
| Open Source      | ✅ MIT      | ❌         | ❌         | ❌         | ❌      |
| Own the code     | ✅ Full ZIP | ⚠️ Limited | ⚠️ Limited | ⚠️ Limited | ❌      |
| BYOK             | ✅          | ❌         | ❌         | ❌         | ❌      |
| Self-host        | ✅          | ❌         | ❌         | ❌         | ❌      |
| Cost/generation  | ~$0.002     | $20+/mo    | $20+/mo    | $20+/mo    | $20+/mo |
| Plugin system    | ✅          | ❌         | ❌         | ❌         | ❌      |
| Template gallery | ✅ (growing) | ❌         | ❌         | ❌         | ✅      |
| Visual editor    | ✅          | ✅         | ✅         | ❌         | ✅      |
| Auto-database    | ✅ Supabase | ❌         | ⚠️         | ❌         | ✅      |
| **Grow layer**       | ✅ v1.0     | ❌         | ❌         | ❌         | ✅      |

---

## Business Model

ForgeAI itself is free and open-source under MIT. Optional monetization can come later as a **hosted SaaS version** for users who do not want to self-host. Even then:

- The open-source code remains free
- Users can still self-host and BYOK
- The hosted version would only charge for convenience, not for generations

---

## Technical Stack

| Layer            | Technology                          | Why                                 |
| ---------------- | ----------------------------------- | ----------------------------------- |
| Frontend         | Next.js 14 + Tailwind + shadcn/ui   | Fast, beautiful, SSR                |
| API Orchestrator | Hono (Node.js)                      | 15KB, minimal, fast                 |
| AI Intent        | OpenRouter / Gemini / HuggingFace   | Fallback chain, BYOK                |
| AI Code Gen      | Same provider chain                 | Free tiers, open-source models      |
| Deploy           | Vercel Build API                    | Instant live URL                    |
| Database         | Supabase                            | Free tier, PostgreSQL, auto-binding |
| State            | Zustand                             | 3KB, no boilerplate                 |
| Export           | JSZip                               | ZIP archive                         |
| Validation       | esbuild                             | Fast code parsing and bundling      |

---

## Roadmap

| Version    | Status         | Deliverable                                                 |
| ---------- | -------------- | ----------------------------------------------------------- |
| **v0.0**   | Done           | Docs, brand, package.json, types, repo setup                |
| **v0.1**   | Done           | Prompt → generated code + config-driven generation          |
| **v0.2**   | Done           | Prompt → live URL + multi-model fallback                    |
| **v0.3**   | Done           | Visual editor overlay + differential prompting              |
| **v0.4**   | Done           | ZIP export + Supabase auto-binding                          |
| **v0.5**   | Done           | Template gallery + community templates                      |
| **v0.6**   | Done           | Multi-page generation                                       |
| **v0.7**   | Done           | Plugin system                                               |
| **v1.0**   | Done           | SEO, analytics, email automation, A/B testing, security, performance, tests, release |
| **Future** | Planned        | AI voice agent, messaging integration, canvas, audio, video |

---

## Get Involved

- Try the [Quick Start](../README.md#getting-started)
- Read the [System Design](system-design.md)
- Check out [Contributing](../CONTRIBUTING.md)
- Join the discussions on GitHub
