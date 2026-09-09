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

If you add multiple keys, ForgeAI tries them in this order: **OpenRouter → Gemini → HuggingFace**. Each provider also has its own fallback models and a 120-second request timeout with automatic retries on network/rate-limit errors.
