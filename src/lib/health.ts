import { providers } from '@/plugins/providers'

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

// The providers array is the single source of truth for provider order.
const HEALTH_ORDER = providers.map((p) => p.name)

// Cache health checks so rapid clicks / repeated Generate presses do not hammer the provider.
const HEALTH_CACHE_TTL = 30_000
const CACHE_MAX_ENTRIES = 50
interface CacheEntry {
  result: HealthCheckResult
  ts: number
}
const healthCache = new Map<string, CacheEntry>()

function boundedSet<V>(map: Map<string, V>, key: string, value: V) {
  if (map.size >= CACHE_MAX_ENTRIES && !map.has(key)) {
    const now = Date.now()
    for (const [k, entry] of map) {
      if ((entry as { ts: number }).ts < now - 5 * 60_000) map.delete(k)
    }
    if (map.size >= CACHE_MAX_ENTRIES) {
      const oldest = map.keys().next().value
      if (oldest !== undefined) map.delete(oldest)
    }
  }
  map.set(key, value)
}

// Never keep the raw API key in a cache key — hash it so the in-memory map
// can't be dumped into a credential list.
function keyId(key: string): string {
  let h = 5381
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h) ^ key.charCodeAt(i)
  return (h >>> 0).toString(36)
}

async function checkOne(provider: string, key: string): Promise<HealthCheckResult> {
  const cacheKey = `${provider}:${keyId(key)}`
  const cached = healthCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < HEALTH_CACHE_TTL) {
    return cached.result
  }

  try {
    const res = await fetch(`/api/health?provider=${provider}`, {
      headers: { Authorization: `Bearer ${key.trim()}` },
    })

    let raw: string | undefined
    let data: { status: 'ok' | 'error'; error?: string; statusCode?: number }
    try {
      raw = await res.text()
      data = JSON.parse(raw) as {
        status: 'ok' | 'error'
        error?: string
        statusCode?: number
      }
    } catch {
      const body = raw?.slice(0, 120).replace(/\s+/g, ' ') ?? ''
      data = {
        status: 'error',
        error: `Server returned ${res.status} with non-JSON response. Is the API server (npm run api) running? ${body}`,
        statusCode: res.status,
      }
    }

    const result: HealthCheckResult =
      data.status === 'ok'
        ? { ok: true, provider }
        : {
            ok: false,
            provider,
            error: `${provider}: [${data.statusCode ?? res.status}] ${data.error ?? 'Health check failed'}`,
          }

    boundedSet(healthCache, cacheKey, { result, ts: Date.now() })
    return result
  } catch (err) {
    const result: HealthCheckResult = {
      ok: false,
      provider,
      error: `${provider}: ${err instanceof Error ? err.message : String(err)}`,
    }
    boundedSet(healthCache, cacheKey, { result, ts: Date.now() })
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

  const models = await fetchModels(provider, key)
  if (models.length > 0) {
    return models[0].id
  }

  return providers.find((p) => p.name === provider)?.defaultModel ?? ''
}

export interface ModelSummary {
  id: string
  name: string
  free?: boolean
}

const MODEL_CACHE_TTL = 60_000
interface ModelCacheEntry {
  models: ModelSummary[]
  ts: number
}
const modelCache = new Map<string, ModelCacheEntry>()

/**
 * Fetch the list of models for a provider. Results are cached for 60 seconds
 * so opening the dropdown or auto-resolving a model does not hit the API repeatedly.
 */
export async function fetchModels(
  provider: string,
  token?: string | null
): Promise<ModelSummary[]> {
  const cacheKey = `${provider}:${token ? keyId(token) : ''}`
  const cached = modelCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < MODEL_CACHE_TTL) {
    return cached.models
  }

  const headers: Record<string, string> = {}
  if (token) {
    headers.Authorization = `Bearer ${token.trim()}`
  }

  try {
    const res = await fetch(`/api/models?provider=${provider}`, { headers })

    let raw: string | undefined
    let data: { models?: ModelSummary[]; error?: string } = {}
    try {
      raw = await res.text()
      data = JSON.parse(raw) as { models?: ModelSummary[]; error?: string }
    } catch {
      const body = raw?.slice(0, 120).replace(/\s+/g, ' ') ?? ''
      data = {
        error: `Server returned ${res.status} with non-JSON response. Is the API server (npm run api) running? ${body}`,
      }
    }

    const models = res.ok && data.models ? data.models : []
    boundedSet(modelCache, cacheKey, { models, ts: Date.now() })
    return models
  } catch {
    return []
  }
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

  let token = ''
  if (resolvedProvider === 'openrouter') token = keys.openrouter ?? ''
  else if (resolvedProvider === 'gemini') token = keys.gemini ?? ''
  else if (resolvedProvider === 'huggingface') token = keys.huggingface ?? ''
  else token = keys.openrouter || keys.gemini || keys.huggingface || ''

  // Respect the user's model selection. Always send it to the API — the
  // provider will reject it with a 400 if the ID is truly invalid, and the
  // fallback chain handles that. Silently replacing the user's choice based
  // on a cached/incomplete live list was causing the wrong model to be used.
  let resolvedModel = model || ''
  if (!resolvedModel) {
    resolvedModel = await loadFirstModel(resolvedProvider, keys)
  }

  return { ok: true, provider: resolvedProvider, model: resolvedModel, token }
}
