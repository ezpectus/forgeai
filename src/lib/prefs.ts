const STORAGE_KEYS = {
  provider: 'forgeai:lastProvider',
  model: 'forgeai:lastModel',
  prompt: 'forgeai:lastPrompt',
  activeMode: 'forgeai:lastActiveMode',
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
  activeMode: string
} {
  if (typeof window === 'undefined') {
    return { provider: 'auto', model: '', prompt: '', activeMode: 'website' }
  }

  return {
    provider: localStorage.getItem(STORAGE_KEYS.provider) ?? 'auto',
    model: localStorage.getItem(STORAGE_KEYS.model) ?? '',
    prompt: localStorage.getItem(STORAGE_KEYS.prompt) ?? '',
    activeMode: localStorage.getItem(STORAGE_KEYS.activeMode) ?? 'website',
  }
}

export function setLastGenerationPrefs(
  prefs: Partial<{
    provider: string
    model: string
    prompt: string
    activeMode: string
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

  if (prefs.activeMode !== undefined) {
    localStorage.setItem(STORAGE_KEYS.activeMode, prefs.activeMode)
  }
}
