export type ProviderKeys = Partial<{
  openrouter: string | null
  gemini: string | null
  huggingface: string | null
}>

interface HealthCheckResult {
  ok: boolean
  provider?: string
  error?: string
}

const HEALTH_ORDER = ['openrouter', 'gemini', 'huggingface'] as const

// Cache health checks so rapid clicks / repeated Generate presses do not hammer the provider.
const HEALTH_CACHE_TTL = 30_000
interface CacheEntry {
  result: HealthCheckResult
  ts: number
}
const healthCache = new Map<string, CacheEntry>()

type ProviderKey = 'openrouter' | 'gemini' | 'huggingface'

async function checkOne(provider: string, key: string): Promise<HealthCheckResult> {
  const cacheKey = `${provider}:${key}`
  const cached = healthCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < HEALTH_CACHE_TTL) {
    return cached.result
  }

  try {
    const res = await fetch(`/api/health?provider=${provider}`, {
      headers: { Authorization: `Bearer ${key.trim()}` },
    })
    const data = (await res.json()) as {
      status: 'ok' | 'error'
      error?: string
      statusCode?: number
    }

    const result: HealthCheckResult =
      data.status === 'ok'
        ? { ok: true, provider }
        : {
            ok: false,
            provider,
            error: `${provider}: [${data.statusCode ?? res.status}] ${data.error ?? 'Health check failed'}`,
          }

    healthCache.set(cacheKey, { result, ts: Date.now() })
    return result
  } catch (err) {
    const result: HealthCheckResult = {
      ok: false,
      provider,
      error: `${provider}: ${err instanceof Error ? err.message : String(err)}`,
    }
    healthCache.set(cacheKey, { result, ts: Date.now() })
    return result
  }
}

/**
 * Check whether the selected provider (or any provider in auto mode) is healthy.
 * Returns the first healthy provider for auto mode, or the requested provider.
 */
export async function checkProviderHealth(
  provider: string,
  keys: ProviderKeys
): Promise<HealthCheckResult> {
  if (provider === 'auto') {
    const available = HEALTH_ORDER.filter((p) => Boolean(keys[p as keyof ProviderKeys]))

    if (available.length === 0) {
      return { ok: false, error: 'No API keys configured. Add one in Settings.' }
    }

    const results = await Promise.all(
      available.map((p) => checkOne(p, keys[p as keyof ProviderKeys] as string))
    )

    const firstOk = results.find((r) => r.ok)
    if (firstOk) return firstOk

    return { ok: false, error: results.map((r) => r.error).join('; ') }
  }

  const key = keys[provider as keyof ProviderKeys]
  if (!key) {
    return { ok: false, error: `No ${provider} API key configured. Add it in Settings.` }
  }

  return checkOne(provider, key)
}

/**
 * Pick the first working model for a provider. Falls back to a known default.
 */
export async function loadFirstModel(
  provider: string,
  keys: ProviderKeys
): Promise<string> {
  if (provider === 'auto') return ''

  const key = keys[provider as keyof ProviderKeys]
  if (!key) return ''

  try {
    const res = await fetch(`/api/models?provider=${provider}`, {
      headers: { Authorization: `Bearer ${key.trim()}` },
    })
    const data = (await res.json()) as { models?: { id: string }[]; error?: string }
    if (res.ok && data.models && data.models.length > 0) {
      return data.models[0].id
    }
  } catch {
    // ignore, use default
  }

  const defaults: Record<ProviderKey, string> = {
    openrouter: 'deepseek/deepseek-chat',
    gemini: 'gemini-1.5-flash',
    huggingface: 'deepseek-ai/deepseek-coder-6.7b-instruct',
  }

  return defaults[provider as ProviderKey] ?? ''
}

interface ResolvedProvider {
  provider: string
  model: string
  token: string
}

export async function resolveGenerationProvider(
  provider: string,
  model: string,
  keys: ProviderKeys
): Promise<{ ok: true } & ResolvedProvider | { ok: false; error: string }> {
  const health = await checkProviderHealth(provider, keys)
  if (!health.ok) {
    return { ok: false, error: health.error ?? 'Provider health check failed' }
  }

  const resolvedProvider = health.provider ?? provider
  const resolvedModel =
    resolvedProvider === provider && model
      ? model
      : await loadFirstModel(resolvedProvider, keys)

  let token = ''
  if (resolvedProvider === 'openrouter') token = keys.openrouter ?? ''
  else if (resolvedProvider === 'gemini') token = keys.gemini ?? ''
  else if (resolvedProvider === 'huggingface') token = keys.huggingface ?? ''
  else token = keys.openrouter || keys.gemini || keys.huggingface || ''

  return { ok: true, provider: resolvedProvider, model: resolvedModel, token }
}
