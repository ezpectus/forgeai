const STORAGE_KEYS = {
  provider: 'forgeai:lastProvider',
  model: 'forgeai:lastModel',
}

/**
 * Persist the last used provider/model so the user does not have to re-select
 * them on every page load. Falls back to `auto` and an empty model.
 */
export function getLastGenerationPrefs(): {
  provider: string
  model: string
} {
  if (typeof window === 'undefined') {
    return { provider: 'auto', model: '' }
  }

  return {
    provider: localStorage.getItem(STORAGE_KEYS.provider) ?? 'auto',
    model: localStorage.getItem(STORAGE_KEYS.model) ?? '',
  }
}

export function setLastGenerationPrefs(
  prefs: Partial<{
    provider: string
    model: string
  }>
) {
  if (typeof window === 'undefined') return

  if (prefs.provider !== undefined) {
    localStorage.setItem(STORAGE_KEYS.provider, prefs.provider)
  }

  if (prefs.model !== undefined) {
    localStorage.setItem(STORAGE_KEYS.model, prefs.model)
  }
}
