import { callWithFallback } from './fallback'
import { buildProviderChain } from './provider-chain'
import { buildSystemPrompt, buildUserPrompt } from './prompt-builder'
import type { ComponentSpec, ComponentState, IntentResult } from '@/types'

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
  preferred?: { provider: string; model: string },
  signal?: AbortSignal
): Promise<ComponentState> {
  // Use the config passed in — it may come from configs/templates/ OR
  // public/templates/. Re-reading from disk would break for public templates.
  const systemPrompt = buildSystemPrompt(config, componentName)

  const userPrompt = buildUserPrompt(intent, componentName, prompt)
  const chain = buildProviderChain(auth, preferred)

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
      { systemPrompt, temperature: 0.2, maxTokens: 4096, signal },
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

  const chain = buildProviderChain(auth, preferred)

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
