# Features — Full Spec

Полный список фич, которые должны быть в проекте. Всё что есть у закрытых конкурентов — но open-source, с BYOK.

---

## 1. Output Types (Что генерирует агент)

### 1.1 AI Websites

- Full-stack web apps: React + Tailwind + Next.js
- Database (Supabase auto-binding)
- File storage (Supabase Storage)
- Stripe payments integration
- Custom domain support
- SEO + Analytics built-in
- Live URL on deploy
- AI voice agent on deployed site (future)

### 1.2 AI Slides

- Professional presentations from prompt
- Edit text, layouts, visuals directly on each slide
- Inline AI editing (click slide → describe change → updates)
- Export to PDF and PPTX
- Nano Banana mode — visually bold slide style
- Slide-by-slide plan preview before generation
- Version history per slide

### 1.3 AI Images

- Text-to-image generation
- Background removal
- Image upscaling (up to 4x)
- Text edits inside images
- Region-based editing (paint over area → describe change)
- Multiple model support (FLUX, Seedream, etc.)

### 1.4 AI Videos

- Video from text or images
- Motion control (animate between two images)
- Background removal
- Timeline editing (combine clips)
- AI effects (cinematic, stylized, creative)
- Virtual try-ons (show product on a real person)

### 1.5 AI Chat

- Chat with AI agent
- Writes code, runs commands
- Searches the web
- Builds full projects inside private sandbox
- Text-only answers and document analysis

### 1.6 AI Reports

- Research-grade reports with citations
- Charts and structured analysis
- Markdown editor with version history
- Executive summaries
- Competitive analysis
- Internal documentation, SOPs, proposals

### 1.7 AI Canvas

- Freeform visual workspace
- Generate, upload, arrange images and videos
- Edit every detail with precision tools
- Mark Edit — paint over any part, describe the change
- Motion Control — animate between images
- AI Effects — cinematic, stylized, creative
- Virtual try-ons

### 1.8 AI Carousel

- Multi-slide carousel posts for Instagram, LinkedIn, Twitter/X
- Generate from templates or prompt
- Brand-consistent styling
- Export as images

### 1.9 AI Audio

- Text-to-speech
- Music generation
- Voice cloning
- Sound effects
- Dubbing for international audiences
- Transcription

### 1.10 AI Spreadsheets

- Spreadsheets with formulas
- Charts and formatting
- XLSX/CSV import and export
- Interactive grid editing
- Cash-flow models, budgets, trackers

---

## 2. Interaction Modes

### 2.1 Agent Mode (default)

- Agent writes code, runs commands, generates media
- Builds websites, presentations, reports
- Full toolkit: code execution, web search, file I/O
- Private sandbox — isolated from user's machine
- Real-time: user sees every action as it runs
- Model tiers: Lite (fast/cheap), Pro (balanced), Max (complex reasoning)
- Cannot pick specific model — pick a tier, agent uses corresponding model
- Cannot run multiple agent tasks simultaneously in same chat

### 2.2 Chat Mode

- Text-only answers and analysis
- Consumes fewer credits
- Document analysis
- No code execution, no media generation
- User picks specific model (Claude, Gemini, GPT, Grok)

### 2.3 Plan Mode

- Agent researches request before touching code
- Asks smart clarifying questions: audience, tone, style, specific needs
- Writes a structured build plan for user approval
- Shows visual plan: slide-by-slide, section-by-section, page-by-page
- User approves or adjusts before generation starts
- Use for anything with auth, payments, database, or multiple integrations
- Prevents having to redo significant work later

---

## 3. Plan → Build → Grow Workflow

### 3.1 Plan

- User types goal in plain language
- Agent asks about audience, tone, specific needs
- Agent shows structure of what it will build
- User approves or adjusts
- Only then does generation start

### 3.2 Build

- Agent uses the right tools: generates images, writes code, searches web, creates slides
- User sees every step in real time
- Generated artifacts appear in side panel as they're created
- User can interact immediately
- Live preview updates in real time as agent adds features

### 3.3 Grow

After deployment, automate repetitive work:

- **Sign-ups and reminders** — automated email sequences
- **FAQ auto-responses** — common customer questions answered automatically
- **Customer list updates** — new entries sync automatically
- **Social media scheduling** — posts and replies continue between episodes
- **Open rate tracking** — email analytics after every send
- **Deadline tracking** — renewal dates, next deadlines stay on radar
- **Price drop tracking** — monitor and alert on price changes
- **SEO optimization** — meta tags, sitemap, structured data
- **Analytics dashboard** — visitors, page views, conversions
- **A/B testing** — headlines, CTAs, layouts

---

## 4. Editing & Version Control

### 4.1 Inline Editing

- Click any headline, section, or image on the live output
- Describe the change in natural language
- AI updates it in place
- No separate builder, no code export needed
- Ask for structural changes (add pricing section, swap color scheme)
- Live site updates immediately

### 4.2 Version History

- Every edit is a version
- Roll back to any previous state with one click
- Works like chat message history
- Applies to websites, slides, reports, all artifacts

### 4.3 Branch Conversations

- Branch the conversation to try a different direction
- Without losing current work
- Switch between branches

### 4.4 Differential Prompting

- Edits send only the changed component, not the whole page
- Faster, cheaper, more precise
- Component-level regeneration (~3s vs ~15s full regen)

---

## 5. Auto-Provisioned Infrastructure

When agent builds a website, it provisions automatically:

| Component     | What you get                                      |
| ------------- | ------------------------------------------------- |
| Live preview  | Instant preview URL that updates as agent codes   |
| Database      | SQL database for storing app data (Supabase)      |
| File storage  | Object storage for uploads, images, files         |
| AI gateway    | API key for adding AI features to the website     |
| Environment   | `.env.local` with all config pre-filled           |
| Stripe        | Payment integration ready out of the box          |
| Custom domain | Connect your domain to deployed site              |
| SEO           | Meta tags, sitemap, structured data — zero config |
| Analytics     | Dashboard showing visitors and behavior           |

---

## 6. Agent Skills & Memory

### 6.1 Agent Skills

- Reusable workflows for repeatable work
- Built-in skills for: websites, slides, images, videos, reports, audio, carousels
- Custom skills: define your own workflow, plug into engine
- Invoke with `/skill-name`
- Skills handle specific repeatable parts while full project context stays in agent

### 6.2 Connectors

- Link agent to 3000+ external apps
- Slack, Discord, Telegram integration (RunClaw)
- Chat and run tasks without leaving messaging app
- File attachments (up to 10 files, 25MB each)

### 6.3 Memory

- Tell agent your preferences once
- Remembers brand colors, tone, defaults
- Persists across every conversation
- No need to re-explain context

---

## 7. Canvas Mode

Single visual workspace for images and videos:

- Generate images from multiple models
- Generate videos from text or images
- Mark Edit — paint over any part of an image, describe the change
- Motion Control — animate between two images with smooth transitions
- AI Effects — cinematic, stylized, creative, for both images and videos
- Virtual try-ons — show a product on a real person
- No chat-download-edit shuffle — everything in one workspace

---

## 8. AI Voice Agent

Add an AI voice agent to any deployed website:

- Visitors speak — AI listens, understands, responds in real time
- Handles FAQs, bookings, support questions
- Voice cloning for brand consistency
- Text-to-speech in multiple languages
- Dubbing for international audiences

---

## 9. Messaging Integration

Use the agent from messaging platforms:

- Telegram
- Slack
- Discord
- Chat and run tasks without leaving the app
- Full agent capabilities available in messaging

---

## 10. Mobile Apps

- iOS and iPad app
- Android app
- Windows app (future)
- Some features limited on mobile (canvas editing, full artifact creation)

---

## 11. Export & Sharing

- Download as PDF, PPTX, MP4, PNG, XLSX, CSV
- Deploy website live with custom domain
- Share public link
- Export full code as ZIP (Next.js project)
- Export database schema as SQL migration

---

## 12. Model Support

- OpenRouter: DeepSeek V3, Qwen, GLM-4, Llama 3, and hundreds more
- HuggingFace: DeepSeek Coder, GLM-4, and open-source models
- User picks model or tier
- Multi-model fallback: if one is down, switch automatically
- Cost transparency: show tokens used and cost per generation

---

## 13. Security

- API keys in browser IndexedDB (not localStorage)
- Keys never sent to our server storage
- Keys never logged
- CORS strict (only our domain)
- Sandbox iframe for preview (no allow-same-origin)
- AST scan for dangerous patterns (eval, dangerouslySetInnerHTML)
- CSP headers on deployed sites
- Supabase RLS policies by default
- Rate limiting on orchestrator
- Prompt injection protection

---

## 15. Template Gallery

### 15.1 Browse 15,000+ Templates

- Search by keyword
- Filter by type: All, Websites, Presentations, Carousels, Reports
- Filter by topic: Portfolio, Pitch decks, Landing pages, Business, Education, Marketing, Branding, Technology, Fashion & beauty, Food & drink, Real estate, Finance, Photography, Health, Sustainability, Leadership, Sports, Religion, Personal finance, Productivity
- Pagination (20 per page, 649+ pages)
- Thumbnail preview for each template
- Popularity rating (stars) + uses count
- Trending / New / Featured sections

### 15.2 Template Customization

- Select template → see preview with placeholders
- Type your info (e.g. "Fintech startup called PayFlow, seed round $2M")
- AI extracts entities from input → fills placeholders
- AI generates missing content (descriptions, stats, copy)
- Structure and design from template preserved
- Inline edit any slide/section after fill
- Export to PDF, PPTX, PNG, ZIP, XLSX, CSV

### 15.3 Community Templates

- Users can create and publish custom templates
- Template moderation (auto AST scan + manual for featured)
- Rating system (1-5 stars)
- Fork any template → customize → republish
- Tags for searchability
- Categories: Featured, Trending, New, Popular

### 15.4 Template Structure

Each template contains:

- **Metadata** — id, name, type, topic, description, thumbnail, tags, popularity
- **Structure** — slides/sections with layout, placeholders, design
- **AI Prompt** — system prompt for filling placeholders, user prompt template
- **Customization** — which aspects can be changed (colors, fonts, layout, add/remove slides)
- **Export** — supported output formats

See `docs/template-gallery.md` for full spec.

---

## 16. Feature Priority Matrix

### MVP (v0.1 – v0.4)

- [x] AI Websites (prompt → live URL)
- [x] Config-driven component generation
- [x] Multi-model fallback
- [x] Plan Mode (ask questions → show plan → approve → build)
- [x] Inline editing (click → describe → update)
- [x] Version history with rollback
- [x] Differential prompting
- [x] ZIP export
- [x] Auto-database binding (Supabase)
- [x] Auto-provisioned infrastructure

### Near-term (v0.5 – v0.7)

- [ ] Template gallery (15,000+ templates, search, filter, customize)
- [ ] Community templates (create, publish, fork, rate)
- [ ] Multi-page generation
- [ ] Plugin system (custom providers, deployers, templates)
- [ ] AI Slides generation
- [ ] AI Reports generation
- [ ] AI Carousel generation
- [ ] Agent Skills (reusable workflows)
- [ ] Memory (brand preferences, tone, defaults)
- [ ] Connectors (external app integrations)

### Full release (v1.0)

- [ ] Grow layer (SEO, analytics, email automation, A/B testing)
- [ ] AI Images (text-to-image, background removal, upscaling, region edit)
- [ ] AI Videos (text-to-video, motion control, effects)
- [ ] AI Canvas (freeform visual workspace)
- [ ] AI Audio (TTS, music, voice cloning, dubbing, transcription)
- [ ] AI Spreadsheets (formulas, charts, import/export)
- [ ] AI Chat (code execution, web search, sandbox)

### Future (v1.0+)

- [ ] AI Voice agent on deployed sites
- [ ] Messaging integration (Telegram, Slack, Discord)
- [ ] Mobile apps (iOS, Android)
- [ ] Branch conversations
- [ ] Custom skills marketplace
- [ ] Stripe payments in generated sites
- [ ] Custom domain support
