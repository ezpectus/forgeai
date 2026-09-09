import { callWithFallback } from './fallback'
import { buildSystemPrompt, buildUserPrompt } from './prompt-builder'
import { HuggingFace } from '@/plugins/providers/huggingface'
import { OpenRouter } from '@/plugins/providers/openrouter'
import { Gemini } from '@/plugins/providers/gemini'
import { providers } from '@/plugins/providers'
import type { AIProvider, ComponentSpec, ComponentState, IntentResult } from '@/types'

// Build the ordered list of AI providers to try, based on which keys the user has set.
function buildChain(
  auth: Record<string, string>,
  preferred?: { provider: string; model: string }
) {
  const chain: { provider: AIProvider; model: string }[] = []
  const seen = new Set<string>()

  if (preferred && auth[preferred.provider]) {
    const provider = providers.find((p) => p.name === preferred.provider)
    if (provider) {
      chain.push({ provider, model: preferred.model })
      seen.add(provider.name)
    }
  }

  if (auth.openrouter && !seen.has('openrouter')) {
    chain.push({ provider: OpenRouter, model: OpenRouter.defaultModel })
    seen.add('openrouter')
  }

  if (auth.gemini && !seen.has('gemini')) {
    chain.push({ provider: Gemini, model: Gemini.defaultModel })
    seen.add('gemini')
  }

  if (auth.huggingface && !seen.has('huggingface')) {
    chain.push({ provider: HuggingFace, model: HuggingFace.defaultModel })
    seen.add('huggingface')
  }

  return chain
}

/**
 * Generate a single component (e.g. Hero, Features) from a template config,
 * using the user's fallback chain of AI providers.
 */
export async function generateComponent(
  prompt: string,
  config: ComponentSpec,
  componentName: string,
  auth: Record<string, string>,
  intent: IntentResult,
  preferred?: { provider: string; model: string }
): Promise<ComponentState> {
  // Use the config passed in — it may come from configs/templates/ OR
  // public/templates/. Re-reading from disk would break for public templates.
  const systemPrompt = buildSystemPrompt(config, componentName)

  const userPrompt = buildUserPrompt(intent, componentName, prompt)
  const chain = buildChain(auth, preferred)

  if (chain.length === 0) {
    return {
      name: componentName,
      code: '',
      status: 'error',
      version: 0,
      error: 'No API keys available',
    }
  }

  try {
    const result = await callWithFallback(
      userPrompt,
      { systemPrompt, temperature: 0.2, maxTokens: 4096 },
      auth,
      chain
    )

    return {
      name: componentName,
      code: result.code,
      status: 'ready',
      version: 1,
      cost: result.cost,
      provider: result.provider,
      model: result.model,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      name: componentName,
      code: '',
      status: 'error',
      version: 0,
      error: message,
    }
  }
}

/**
 * Re-generate one existing component with a specific instruction, used by the
 * visual editor overlay for differential edits.
 */
export async function regenerateComponent(
  config: ComponentSpec,
  componentName: string,
  currentCode: string,
  instruction: string,
  auth: Record<string, string>,
  preferred?: { provider: string; model: string }
): Promise<ComponentState> {
  // Use the config passed in — no need to re-read from disk.
  const systemPrompt = buildSystemPrompt(config, componentName)
  const userPrompt = `Current component code:\n${currentCode}\n\nInstruction: ${instruction}\n\nMake minimal changes. Preserve structure. Return only the TypeScript React component code. No markdown, no explanation.`

  const chain = buildChain(auth, preferred)

  if (chain.length === 0) {
    return {
      name: componentName,
      code: '',
      status: 'error',
      version: 0,
      error: 'No API keys available',
    }
  }

  try {
    const result = await callWithFallback(
      userPrompt,
      { systemPrompt, temperature: 0.2, maxTokens: 4096 },
      auth,
      chain
    )

    return {
      name: componentName,
      code: result.code,
      status: 'ready',
      version: 1,
      cost: result.cost,
      provider: result.provider,
      model: result.model,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      name: componentName,
      code: '',
      status: 'error',
      version: 0,
      error: message,
    }
  }
}
