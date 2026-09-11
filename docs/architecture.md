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
        HealthAPI["/api/health"]
    end

    subgraph AIPipeline["AI Pipeline"]
        Intent["Intent Analysis"]
        ComponentGen["Component Generation<br/>sequential per config"]
        Validate["Validation<br/>esbuild + pattern rules"]
        Assemble["Assemble page.tsx"]
    end

    subgraph Providers["External APIs (BYOK)"]
        OpenRouter["OpenRouter<br/>free :free models"]
        Gemini["Gemini<br/>3.x Flash"]
        HuggingFace["HuggingFace<br/>router inference"]
        Vercel["Vercel Build API"]
        Supabase["Supabase<br/>PostgreSQL"]
    end

    UI -->|Authorization: Bearer key| CORS
    CORS --> GenAPI
    CORS --> CompAPI
    CORS --> DeployAPI
    CORS --> ExportAPI
    CORS --> HealthAPI

    GenAPI -->|1. analyze prompt| Intent
    Intent -->|2. generate components| ComponentGen
    ComponentGen -->|3. validate| Validate
    Validate -->|4. assemble| Assemble
    Assemble -->|5. deploy| DeployAPI
    DeployAPI --> Vercel
    ExportAPI --> Export

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

    O->>O: assemble project files
    O->>U: SSE: done + files

    Note right of U: Deploy is a separate user action (needs Vercel token)
    U->>O: POST /api/deploy (files)
    O->>D: deploy files
    D-->>O: live URL
```

---

## Data Flow

```
1. Browser sends prompt + API keys in the request body (BYOK)
2. Orchestrator analyzes intent via OpenRouter / Gemini / HuggingFace fallback chain
3. Loads the template config for the selected mode (configs/templates/)
4. Calls AI for each section sequentially (deterministic order)
5. Validates each component (esbuild transform + pattern rules + dep allowlist)
6. Retries failed components with exact errors (max 2 attempts)
7. Assembles page files, package.json, tailwind config
8. Returns all files to the browser (SSE done event)
9. Browser can then POST files to /api/deploy → Vercel live URL
10. (Optional) Generated project includes Supabase wiring when dbRequired
11. Browser shows the deployed site in an iframe
12. User clicks component → only that component regenerates
```
