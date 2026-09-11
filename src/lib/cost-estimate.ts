type Provider = 'openrouter' | 'gemini' | 'huggingface' | 'auto'

// Rough per-provider prices in USD per 1,000 tokens. Used only for a
// pre-generation estimate in the UI; real cost depends on the exact model.
const PRICING: Record<
  Provider,
  { inputPricePer1K: number; outputPricePer1K: number }
> = {
  auto: { inputPricePer1K: 0.0005, outputPricePer1K: 0.0015 },
  openrouter: { inputPricePer1K: 0.0005, outputPricePer1K: 0.0015 },
  gemini: { inputPricePer1K: 0.00025, outputPricePer1K: 0.0005 },
  huggingface: { inputPricePer1K: 0.0001, outputPricePer1K: 0.0002 },
}

/**
 * Returns a very rough USD cost estimate for a generation request.
 * Input tokens are estimated as prompt.length / 4. Output tokens are
 * estimated as 12x the input tokens (a typical generated site).
 */
export function estimateCost(
  prompt: string,
  provider: string,
  model: string
): number {
  // Free models cost $0 — check before looking up pricing.
  if (model.endsWith(':free') || model === 'openrouter/free') return 0

  const effectiveProvider = (provider in PRICING ? provider : 'auto') as
    | Provider
    | 'auto'
  const { inputPricePer1K, outputPricePer1K } = PRICING[effectiveProvider]

  const inputTokens = Math.max(1, Math.ceil(prompt.trim().length / 4))
  // Generated landing pages / reports are usually larger than the prompt.
  const outputTokens = inputTokens * 12

  const inputCost = (inputTokens / 1000) * inputPricePer1K
  const outputCost = (outputTokens / 1000) * outputPricePer1K

  return inputCost + outputCost
}

export function formatCost(value: number): string {
  if (value <= 0) return 'free'
  if (value < 0.01) return `< $0.01`
  return `~ $${value.toFixed(2)}`
}
