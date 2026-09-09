# Free API options for ForgeAI

ForgeAI is BYOK (bring your own key). You can run most of it for free by using the free tiers listed below.

## Required for generation

You need at least one of these. ForgeAI will fall back automatically if one fails.

| Provider | Free tier | Get a key | Notes |
| --- | --- | --- | --- |
| **Google Gemini** | 1,500 requests/day for `gemini-1.5-flash` / `gemini-1.5-flash-8b` | https://aistudio.google.com/app/apikey | Best free option. No credit card. Tries `gemini-1.5-flash` first, then `gemini-1.5-flash-8b`, `gemini-2.5-flash`, `gemini-3.6-flash` if a model is unavailable/overloaded. |
| **OpenRouter** | Rate-limited free models (e.g. `deepseek/deepseek-chat:free`, `google/gemma-4-31b-it:free`) | https://openrouter.ai/keys | Tried first if you have a key. Falls through `:free` models if a paid model has no credits. |
| **HuggingFace** | Free serverless inference for some models | https://hf.co/settings/tokens | Slower; tried last. Falls back to `THUDM/glm-4-9b-chat` if the first model fails. |

## Optional providers

| Provider | Use in ForgeAI | Free tier | Get a key |
| --- | --- | --- | --- |
| **Supabase** | Database, forms, auth, storage | 1 GB database, 1 GB storage | https://supabase.com |
| **Vercel** | Deploy to live URL | Hobby plan, free static/function deploys | https://vercel.com/account/tokens |
| **GitHub Models** | Code/vision (via OpenRouter endpoint) | Free tier available | Use OpenRouter key |

## Quick setup (free)

1. Start the app. You can either use one terminal:
   ```bash
   npm run dev:all  # starts both the API (3001) and the frontend (3000)
   ```
   Or run them in two terminals:
   ```bash
   npm run api      # terminal 1 — runs on http://localhost:3001
   npm run dev      # terminal 2 — runs on http://localhost:3000
   ```
2. Get a Gemini API key at https://aistudio.google.com/app/apikey.
3. Paste it in **Settings > Gemini API Key**.
4. Click **Test**, then **Save**.
5. Type a prompt and hit **Generate**.

If the API server is not running, the **Test** button will show a "non-JSON response" error. Make sure `npm run api` is started first.

## Checking your Gemini quota

Gemini rate limits are tied to your **Google Cloud project**, not to each API key. Limits are measured as:

- **RPM** — requests per minute
- **TPM** — tokens per minute (input)
- **RPD** — requests per day

Exceeding any single limit will return `429`. The daily counter resets at midnight Pacific time.

To see your exact limits and current usage:

1. Go to your API key page: https://aistudio.google.com/app/apikey
2. Open the project selector and click the project linked to that key.
3. Open the rate-limit dashboard (or https://ai.google.dev/gemini-api/docs/rate-limits) to see the RPM / RPD numbers for your tier.
4. Free-tier projects start at modest limits; adding a billing account raises them automatically.

If the ForgeAI **Test** button shows `Gemini rate limit exceeded` or a `429` in the Console, you have hit one of those caps. Wait a minute or switch to another provider key until the quota window resets.

If you add multiple keys, ForgeAI tries them in this order: **OpenRouter → Gemini → HuggingFace**. Each provider has its own fallback models and a 120-second request timeout.

- **429 (rate limit / quota)** — all providers fail fast, so you get the error immediately instead of a silent hang.
- **503 (capacity)** and **404/deprecated** — they fall back to the next model without sleeps.
- **402 (OpenRouter, no credits)** — OpenRouter falls back to `:free` models automatically.
- **401/403 (bad key)** — the engine moves to the next provider instantly.
