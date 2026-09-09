# Free API options for ForgeAI

ForgeAI is BYOK (bring your own key). You can run most of it for free by using the free tiers listed below.

## Required for generation

You need at least one of these. ForgeAI will fall back automatically if one fails.

| Provider | Free tier | Get a key | Notes |
| --- | --- | --- | --- |
| **Google Gemini** | 1,500 requests/day for `gemini-1.5-flash` | https://aistudio.google.com/app/apikey | Best free option. No credit card. |
| **OpenRouter** | Rate-limited free models (e.g. `deepseek/deepseek-chat`) | https://openrouter.ai/keys | Works with many models; some are paid. |
| **HuggingFace** | Free serverless inference for some models | https://hf.co/settings/tokens | Slower; good as a fallback. |

## Optional providers

| Provider | Use in ForgeAI | Free tier | Get a key |
| --- | --- | --- | --- |
| **Supabase** | Database, forms, auth, storage | 1 GB database, 1 GB storage | https://supabase.com |
| **Vercel** | Deploy to live URL | Hobby plan, free static/function deploys | https://vercel.com/account/tokens |
| **GitHub Models** | Code/vision (via OpenRouter endpoint) | Free tier available | Use OpenRouter key |

## Quick setup (free)

1. Start the API server and the Next.js dev server in two terminals:
   ```bash
   npm run api      # terminal 1 — runs on http://localhost:3001
   npm run dev      # terminal 2 — runs on http://localhost:3000
   ```
2. Get a Gemini API key at https://aistudio.google.com/app/apikey.
3. Paste it in **Settings > Gemini API Key**.
4. Click **Test**, then **Save**.
5. Type a prompt and hit **Generate**.

If the API server is not running, the **Test** button will show a "non-JSON response" error. Make sure `npm run api` is started first.

If you also add an OpenRouter or HuggingFace key, ForgeAI will try them in order if Gemini is rate-limited.
