# ForgeAI — System Design

This document describes the complete architecture, API, data flow, failure modes, and security model of ForgeAI.

---

## 1. High-Level Architecture

```
Browser (Next.js 14 SPA)
  │
  ├── UI: prompt input, settings, API key management
  ├── Preview: iframe with generated site
  ├── Visual Editor: click-to-edit overlay
  └── Export: ZIP download
  │
  ▼
API Orchestrator (Hono / Node.js)
  │
  ├── /api/generate    → AI pipeline
  ├── /api/generate/component → Differential edit
  ├── /api/deploy      → Vercel / E2B deploy
  ├── /api/export      → ZIP assembly
  ├── /api/db/bind     → Supabase schema gen
  ├── /api/templates   → Template gallery
  └── /api/health      → Status check
  │
  ▼
External APIs (called with user keys)
  ├── OpenRouter      → Intent + fallback code gen
  ├── HuggingFace     → Primary code gen
  ├── Vercel Build API → Deploy
  ├── E2B Sandbox     → Alternative deploy
  └── Supabase        → Database schema + storage
```

### Key principle: API keys never touch server storage
User API keys are stored in browser **IndexedDB**. They are sent as `Authorization` headers per-request. The orchestrator forwards them to the provider and immediately discards them. No key is logged or persisted on the server.

---

## 2. API Endpoints

### 2.1 Generate

#### `POST /api/generate`

**Request:**
```json
{
  "prompt": "Landing page for yoga studio with booking form",
  "config": {
    "model": "deepseek/deepseek-chat",
    "fallback": ["Qwen/Qwen2.5-Coder", "glm-4"],
    "type": "landing",
    "palette": "auto",
    "components": ["hero", "features", "pricing", "contact-form"],
    "dbRequired": true
  }
}
```

**Response (Server-Sent Events):**
```
event: intent
data: {"type":"landing","sections":["hero","features","pricing","contact"],"palette":"calm-green","dbRequired":true}

event: component
data: {"name":"Hero","code":"...","status":"generated"}

event: component
data: {"name":"Features","code":"...","status":"generated"}

event: validate
data: {"status":"passed","errors":[]}

event: done
data: {"projectId":"proj_abc123","files":{"src/app/page.tsx":"..."}}
```

**Errors:**
- `400` — Empty prompt
- `401` — No API key provided
- `429` — Rate limited by provider (triggers fallback)
- `502` — All models in fallback chain failed
- `500` — Orchestrator internal error

#### `POST /api/generate/component`

Differential regeneration of a single component.

**Request:**
```json
{
  "projectId": "proj_abc123",
  "componentName": "Hero",
  "currentCode": "...",
  "instruction": "Make the button red and bigger",
  "config": { "model": "deepseek/deepseek-chat" }
}
```

**Response:**
```json
{
  "component": "Hero",
  "code": "...",
  "status": "updated"
}
```

### 2.2 Deploy

#### `POST /api/deploy`

**Request:**
```json
{
  "projectId": "proj_abc123",
  "provider": "vercel",
  "files": { "package.json": "...", "src/app/page.tsx": "..." }
}
```

**Response:**
```json
{
  "url": "https://forgeai-abc.vercel.app",
  "deployId": "dpl_123"
}
```

#### `GET /api/deploy/:id/status`

**Response:**
```json
{
  "status": "ready",
  "url": "https://forgeai-abc.vercel.app"
}
```

### 2.3 Export

#### `POST /api/export`

**Request:**
```json
{
  "projectId": "proj_abc123",
  "files": { "package.json": "...", "src/...": "..." },
  "format": "zip"
}
```

**Response:** Binary ZIP file.

### 2.4 Database Binding

#### `POST /api/db/bind`

**Request:**
```json
{
  "projectId": "proj_abc123",
  "supabaseUrl": "https://xxx.supabase.co",
  "supabaseKey": "sb_xxx",
  "forms": [
    {
      "name": "contact-form",
      "fields": [
        { "name": "email", "type": "email", "required": true },
        { "name": "message", "type": "textarea" }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "tablesCreated": ["ai_gen_contact_form"],
  "schema": "CREATE TABLE ai_gen_contact_form (...)"
}
```

### 2.5 Template Gallery

#### `GET /api/templates`

Query: `?type=website&topic=pitch-decks&search=yoga&page=1&limit=20`

**Response:**
```json
{
  "total": 15560,
  "page": 1,
  "limit": 20,
  "templates": [
    { "id": "tpl-001", "name": "Business pitch deck", "type": "presentation", "thumbnail": "/templates/tpl-001.png" }
  ]
}
```

#### `POST /api/templates/:id/customize`

**Request:**
```json
{
  "userInput": "Fintech startup called PayFlow, seed round $2M",
  "customization": { "colors": ["#0F172A", "#3B82F6"] }
}
```

**Response (SSE):**
```
event: analyzing
data: {"extracted":{"company":"PayFlow"}}

event: slide
data: {"id":"slide-1","status":"filled"}

event: done
data: {"projectId":"proj_xyz","slides":[...]}
```

### 2.6 Health

#### `GET /api/health`

**Response:**
```json
{
  "status": "ok",
  "providers": [
    { "name": "openrouter", "healthy": true },
    { "name": "huggingface", "healthy": true }
  ]
}
```

---

## 3. Data Flow: Prompt → Live URL

```
1. User opens browser → localhost:3000
2. If no keys set → Settings modal opens
3. User enters API keys (stored in IndexedDB)
4. User types prompt: "Landing for yoga studio with booking form"
5. Browser sends POST /api/generate with Authorization header
6. Orchestrator calls OpenRouter for intent analysis
7. Intent returns: type=landing, sections=[navbar, hero, features, pricing, contact-form, footer]
8. Orchestrator loads per-component configs from configs/templates/website.json
9. Orchestrator calls AI for each component in parallel
10. Each component is validated (esbuild, AST, lint)
11. Failed components are retried with the exact error message
12. Components are assembled into page.tsx
13. Full build/typecheck is run
14. Project is deployed to Vercel or E2B
15. (Optional) Supabase tables are created for detected forms
16. Live URL is returned to the browser
17. Browser shows live preview in a sandboxed iframe
18. User clicks a component → only that component regenerates
```

---

## 4. Config-Driven Generation

Every component is generated from a config. This is the core mechanism that keeps code clean.

### 4.1 Config Structure

```typescript
interface ComponentConfig {
  id: string;
  name: string;
  scope: { allowed: string[]; forbidden: string[] };
  stack: Record<string, string>;
  constraints: Record<string, unknown>;
  components: string[];
  formConstraints?: Record<string, unknown>;
  generation: {
    stages: string[];
    planModeRequiredFor?: string[];
    askClarifyingQuestions: boolean;
    showPlanBeforeBuild: boolean;
    parallelComponentGeneration: boolean;
    maxRetriesPerComponent: number;
  };
  validation: {
    autoTest: string[];
    staticAnalysisRules: string[];
    buildCommands?: string[];
  };
  model: {
    intentModel: string;
    codeModel: string;
    fallback: string[];
  };
  export: { formats: string[]; includeDatabaseSchema: boolean; includeReadme: boolean };
  ui: { defaultPrompt: string; examplePrompts: string[] };
}
```

### 4.2 Why It Works

- **Small scope** — AI generates one component at a time, not an entire app
- **Strict system prompts** — "Use React + Tailwind only. Return JSON with `code` field. No inline styles."
- **Skeletons** — Base file structure is pre-written; AI fills in content
- **Validation** — Every component is parsed before deployment
- **Auto-retry** — Failed components get the exact error and try again
- **Isolation** — An error in one component does not break the whole project

---

## 5. Complexity and Failure Modes

| Problem | Cause | Mitigation |
|---------|-------|------------|
| Broken AI code | Hallucinated imports, syntax errors, wrong types | esbuild parse, AST scan, auto-retry, fallback models |
| AI provider down | Rate limit, outage | Multi-model fallback chain: HF → OpenRouter → next model |
| Deploy fails | Vercel build error, invalid files | Local build/typecheck before deploy; deploy to E2B fallback |
| API key leak | Key sent to malicious code | Keys never stored on server; only in IndexedDB; AST scan for hard-coded secrets |
| XSS / malicious code | AI generates `<script>` or `dangerouslySetInnerHTML` | AST scan for forbidden patterns; sandboxed iframe preview |
| Database conflicts | Table already exists | Prefix `ai_gen_`; dry-run SQL; versioned migrations |
| Timeouts | Slow model, large prompt | Per-component timeouts; streaming; max retries |
| High costs | Using expensive model | Default to cheap models; cost estimate shown before generation |
| Browser memory | Large generated project | Component streaming; lazy load preview; ZIP export on server |
| Concurrent edits | Multiple edits at once | Component-level locking; version numbers |

---

## 6. Stack and Architecture Decisions

### 6.1 Minimal Dependencies

| Dependency | Size | Purpose |
|------------|------|---------|
| next | 35MB | Framework |
| tailwindcss | 5MB | Styling |
| shadcn/ui | 0MB (copy-paste components) | UI components |
| hono | 15KB | API orchestrator |
| esbuild | 11MB | Validation + bundling |
| jszip | 25KB | ZIP export |
| lucide-react | 20KB | Icons |
| zustand | 3KB | State |
| @supabase/supabase-js | 100KB | Database client |

### 6.2 What Is Deliberately Excluded

| Excluded | Reason |
|----------|--------|
| Redux | Overkill for this scope; Zustand is enough |
| Axios | Native `fetch` is sufficient |
| Lodash | Native JS covers 99% of use cases |
| Moment | Native `Intl` or `date-fns` if needed later |
| CSS-in-JS | Tailwind only; keeps generated code simple |
| Heavy animation libs | CSS transitions + Framer Motion for complex cases only |

### 6.3 Plugin Architecture

```typescript
// src/plugins/providers/openrouter.ts
import { AIProvider } from '@/types';

export const OpenRouter: AIProvider = {
  name: 'openrouter',
  supportedModels: ['deepseek/deepseek-chat', 'Qwen/Qwen2.5-Coder'],
  defaultModel: 'deepseek/deepseek-chat',
  async generate(prompt, config, apiKey) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'system', content: config.systemPrompt }, { role: 'user', content: prompt }]
      })
    });
    const json = await res.json();
    return { code: json.choices[0].message.content };
  },
  async health(apiKey) {
    const res = await fetch('https://openrouter.ai/api/v1/auth', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    return res.ok;
  }
};
```

---

## 7. BYOK (Bring Your Own Keys) in Detail

```
Browser IndexedDB
  └── forgeai-db
       └── keys
            ├── openrouter: "sk-or-xxx..."
            ├── huggingface: "hf_xxx..."
            ├── supabaseUrl: "https://xxx.supabase.co"
            └── supabaseKey: "sb_xxx..."

Per request:
  1. UI reads key from IndexedDB
  2. Sends as Authorization: Bearer <key>
  3. Orchestrator receives request
  4. Orchestrator forwards key to provider
  5. After response, key is removed from memory
  6. Key is NEVER logged or persisted on disk
```

Self-hosted users can also put keys in `.env`.

---

## 8. Application Logic

### 8.1 State Management

```typescript
// stores/project.ts
interface ProjectStore {
  projectId: string | null;
  prompt: string;
  intent: IntentResult | null;
  components: ComponentState[];
  status: 'idle' | 'generating' | 'ready' | 'error';
  deployUrl: string | null;
  error: string | null;
}

// stores/keys.ts
interface KeysStore {
  openrouter: string | null;
  huggingface: string | null;
  supabaseUrl: string | null;
  supabaseKey: string | null;
}
```

### 8.2 Fallback Logic

```typescript
async function callWithFallback(
  prompt: string,
  config: GenConfig,
  auth: string
): Promise<GenResult> {
  const chain = [
    { provider: 'huggingface', model: config.codeModel },
    { provider: 'openrouter', model: 'deepseek/deepseek-chat' },
    { provider: 'openrouter', model: 'Qwen/Qwen2.5-Coder' }
  ];

  for (const target of chain) {
    try {
      return await callProvider({ ...target, auth, prompt });
    } catch (err: any) {
      if (err.status === 429 || err.status >= 500) {
        await backoff(chain.indexOf(target));
        continue;
      }
      throw err;
    }
  }

  throw new Error('All providers failed');
}
```

### 8.3 Validation Pipeline

```typescript
async function validateComponent(
  name: string,
  code: string,
  rules: string[]
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    await esbuild.transform(code, { loader: 'tsx' });
  } catch (e: any) {
    errors.push(`Syntax error: ${e.message}`);
    return { valid: false, errors };
  }

  if (rules.includes('noForbiddenImports')) {
    const imports = getImports(code);
    const bad = imports.filter(i => !allowed.includes(i));
    if (bad.length) errors.push(`Forbidden imports: ${bad.join(', ')}`);
  }

  if (rules.includes('noDangerouslySetInnerHTML')) {
    if (code.includes('dangerouslySetInnerHTML')) {
      errors.push('dangerouslySetInnerHTML is forbidden');
    }
  }

  if (rules.includes('noInlineStyles')) {
    if (code.includes('style={{')) errors.push('Inline styles detected');
  }

  return { valid: errors.length === 0, errors };
}
```

---

## 9. Security Checklist

- [x] API keys in IndexedDB, not localStorage
- [x] Keys not logged on the server
- [x] Strict CORS (only allowed origins)
- [x] Sandboxed iframe for preview
- [x] AST scan for dangerous patterns
- [x] CSP headers on deployed sites
- [x] Supabase RLS policies by default
- [x] Table prefix `ai_gen_` for auto-generated tables
- [x] Dry-run SQL before execution
- [x] Rate limiting on orchestrator
- [x] Prompt injection protection
- [x] Stateless orchestrator (no key persistence)

---

## 10. Cost Estimate

| Step | Model | Tokens | Cost |
|------|-------|--------|------|
| Intent analysis | DeepSeek V3 (OpenRouter) | ~500 in / 200 out | $0.0003 |
| Component gen (×6) | DeepSeek Coder (HF) | ~1000 in / 800 out × 6 | $0.0012 |
| Validation retry | DeepSeek Coder (HF) | ~1200 in / 800 out | $0.0003 |
| Layout assembly | DeepSeek V3 (OpenRouter) | ~2000 in / 500 out | $0.0005 |
| **Total** | | | **~$0.002** |

---

## 11. Generated Project Structure

```
generated-project/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js
├── .gitignore
├── README.md
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── Pricing.tsx
│   │   ├── ContactForm.tsx
│   │   └── Footer.tsx
│   └── lib/
│       └── supabase.ts
└── .env.local.example
```
