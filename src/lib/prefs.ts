const STORAGE_KEYS = {
  provider: 'forgeai:lastProvider',
  model: 'forgeai:lastModel',
  prompt: 'forgeai:lastPrompt',
}

/**
 * Persist the last used provider/model/prompt so the user does not have to
 * re-select or re-type them on every page load. Provider/model fall back to
 * `auto` and an empty model; prompt falls back to an empty string.
 */
export function getLastGenerationPrefs(): {
  provider: string
  model: string
  prompt: string
} {
  if (typeof window === 'undefined') {
    return { provider: 'auto', model: '', prompt: '' }
  }

  return {
    provider: localStorage.getItem(STORAGE_KEYS.provider) ?? 'auto',
    model: localStorage.getItem(STORAGE_KEYS.model) ?? '',
    prompt: localStorage.getItem(STORAGE_KEYS.prompt) ?? '',
  }
}

export function setLastGenerationPrefs(
  prefs: Partial<{
    provider: string
    model: string
    prompt: string
  }>
) {
  if (typeof window === 'undefined') return

  if (prefs.provider !== undefined) {
    localStorage.setItem(STORAGE_KEYS.provider, prefs.provider)
  }

  if (prefs.model !== undefined) {
    localStorage.setItem(STORAGE_KEYS.model, prefs.model)
  }

  if (prefs.prompt !== undefined) {
    localStorage.setItem(STORAGE_KEYS.prompt, prefs.prompt)
  }
}
