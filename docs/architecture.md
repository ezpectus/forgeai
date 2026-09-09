# Architecture

> Visual overview of ForgeAI's architecture.

---

## Mermaid Diagram

```mermaid
flowchart TB
    subgraph Browser["Browser (Next.js 16 + Tailwind)"]
        UI["Prompt Input, Settings, Template Gallery"]
        Progress["Live Progress (steps + elapsed time)"]
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
        OpenRouter["OpenRouter<br/>DeepSeek / Qwen / 200+"]
        Gemini["Gemini<br/>1.5 / 2.5 / 3.x Flash"]
        HuggingFace["HuggingFace<br/>DeepSeek Coder / GLM-4"]
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
    GenAPI -->|fallback| HuggingFace
    ComponentGen -->|fallback| OpenRouter
    ComponentGen -->|fallback| Gemini
    ComponentGen -->|fallback| HuggingFace

    CompAPI -->|differential prompt| ComponentGen
    CompAPI --> Validate

    Preview -->|hot reload| Assemble
    Editor -->|click component| CompAPI

    style Browser fill:#e1f5fe
    style Orchestrator fill:#fff3e0
    style AIPipeline fill:#e8f5e9
    style Providers fill:#f3e5f5
```

---

## Sequence: Prompt → Live URL

```mermaid
sequenceDiagram
    participant U as User
    participant B as Browser
    participant O as Orchestrator
    participant I as Intent AI
    participant C as Code AI
    participant V as Validator
    participant D as Deployer
    participant S as Supabase

    U->>B: type prompt
    B->>O: POST /api/generate (SSE)
    O->>I: analyze prompt
    I-->>O: sections, palette, dbRequired
    O->>U: SSE: intent

    loop per section
        O->>C: generate component
        C-->>O: code
        O->>V: validate
        V-->>O: pass/fail + errors
        alt fail
            O->>C: retry with error
        end
        O->>U: SSE: component ready
    end

    O->>O: assemble page.tsx
    O->>V: build + typecheck
    V-->>O: pass

    alt dbRequired
        O->>S: create tables
    end

    O->>D: deploy files
    D-->>O: live URL
    O->>U: SSE: done + url
```

---

## Data Flow

```
1. Browser sends prompt + Authorization header (user API key)
2. Orchestrator forwards to OpenRouter / Gemini / HuggingFace fallback chain
3. Based on intent, loads per-component config from configs/
4. Calls AI for each component in parallel
5. Validates each component (esbuild, AST, lint)
6. Retries failed components with exact error
7. Assembles page.tsx, package.json, tailwind.config
8. Runs build/typecheck on assembled project
9. Deploys to Vercel or E2B
10. (Optional) Creates Supabase tables and binds forms
11. Returns live URL to browser
12. Browser shows live preview in iframe
13. User clicks component → only that component regenerates
```
