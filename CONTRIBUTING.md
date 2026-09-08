# Contributing to ForgeAI

Thank you for your interest in contributing! This guide covers everything you need.

---

## Quick Start

```bash
git clone https://github.com/your-username/forgeai.git
cd forgeai
npm install
npm run dev
```

Open `http://localhost:3000`.

---

## Ways to Contribute

### 1. Report Bugs
- Open an issue with the `bug` label
- Include: steps to reproduce, expected vs actual, browser/OS, console errors

### 2. Suggest Features
- Open an issue with the `feature` label
- Describe the use case, not just the solution

### 3. Add a Plugin

#### AI Provider Plugin
```typescript
// src/plugins/providers/my-provider.ts
import type { AIProvider } from '@/types';

export const MyProvider: AIProvider = {
  name: 'my-provider',
  async generate(prompt: string, config: GenConfig): Promise<GenResult> {
    const res = await fetch('https://my-api.com/generate', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.apiKey}` },
      body: JSON.stringify({ prompt, model: config.model })
    });
    return res.json();
  },
  async health(): Promise<boolean> {
    try {
      await fetch('https://my-api.com/health');
      return true;
    } catch {
      return false;
    }
  }
};
```

Register in `src/plugins/index.ts`:
```typescript
import { MyProvider } from './providers/my-provider';
export const providers = [OpenRouter, HuggingFace, MyProvider];
```

#### Deployer Plugin
```typescript
// src/plugins/deployers/my-deployer.ts
import type { Deployer } from '@/types';

export const MyDeployer: Deployer = {
  name: 'my-deployer',
  async deploy(files: Record<string, string>): Promise<DeployResult> {
    // deploy logic
    return { url: 'https://...', deployId: '...' };
  },
  async status(deployId: string): Promise<DeployStatus> {
    return { status: 'ready', url: '...' };
  }
};
```

#### Template Plugin
Create a JSON file in `configs/templates/` following the schema in `docs/templates.md`.

### 4. Add a Template
- Create a JSON file in `public/templates/` following `docs/template-gallery.md`
- Include thumbnail (1024x768 PNG)
- Test with at least 3 different prompts
- Submit PR with `template` label

### 5. Improve Docs
- Fix typos, add examples, translate
- Docs are in `docs/` folder
- PR with `docs` label

---

## Code Style

- TypeScript strict mode
- Functional components (no class components)
- `const`/`let` only (no `var`)
- `async/await` over `.then()` chains
- Tailwind CSS only (no inline styles, no CSS-in-JS)
- Comments only when logic is non-obvious
- Mobile-first responsive classes

### Linting
```bash
npm run lint     # ESLint
npm run typecheck # tsc --noEmit
npm run format    # Prettier
```

All must pass before PR merge.

---

## PR Process

1. Fork the repo
2. Create a branch: `git checkout -b feat/my-feature`
3. Make changes, keep commits focused
4. Run: `npm run lint && npm run typecheck && npm run build`
5. Open PR with description:
   - What changed
   - Why
   - Screenshots (if UI)
   - Breaking changes (if any)

---

## Project Structure

```
src/
├── app/          # Next.js App Router pages
├── components/   # React components (shadcn/ui based)
├── stores/       # Zustand stores
├── lib/          # Utilities, validation, helpers
├── configs/      # Config-driven generation specs
│   └── templates/ # Per-function AI constraints (JSON)
└── plugins/      # Extensible plugins
    ├── providers/  # AI providers
    ├── deployers/  # Deploy providers
    └── templates/  # Site templates
api/              # Hono orchestrator
docs/             # Documentation
configs/templates/ # Template constraint configs
```

---

## Commit Convention

```
feat: add new AI provider plugin
fix: resolve fallback chain skipping first model
docs: update BYOK section in README
template: add 5 new pitch deck templates
refactor: simplify validation pipeline
```

---

## Questions?

- Open an issue with `question` label
- Or join discussions in the Issues tab

---

## License

By contributing, you agree your contributions are licensed under MIT.
