import { readFile } from 'fs/promises'
import { join } from 'path'
import { analyzeIntent } from './intent'
import { callWithFallback } from './fallback'
import { buildSystemPrompt, buildUserPrompt } from './prompt-builder'
import { HuggingFace } from '@/plugins/providers/huggingface'
import { OpenRouter } from '@/plugins/providers/openrouter'
import type { ComponentSpec, ComponentState, IntentResult } from '@/types'

function buildChain(auth: Record<string, string>) {
  const chain: { provider: typeof OpenRouter; model: string }[] = []

  if (auth.openrouter) {
    chain.push({ provider: OpenRouter, model: 'deepseek/deepseek-chat' })
  }

  if (auth.huggingface) {
    chain.push({
      provider: HuggingFace,
      model: 'deepseek-ai/deepseek-coder-6.7b-instruct',
    })
  }

  return chain
}

const DEFAULT_INTENT: IntentResult = {
  type: 'landing',
  sections: [
    { name: 'hero', type: 'hero', description: 'Hero section', priority: 1 },
    {
      name: 'features',
      type: 'features',
      description: 'Features section',
      priority: 2,
    },
    {
      name: 'pricing',
      type: 'pricing',
      description: 'Pricing section',
      priority: 3,
    },
    {
      name: 'contact-form',
      type: 'contact-form',
      description: 'Contact form',
      priority: 4,
      requiresForm: true,
    },
    { name: 'footer', type: 'footer', description: 'Footer', priority: 5 },
  ],
  palette: 'slate-blue',
  dbRequired: true,
  dbForms: ['contact-form'],
  pages: ['index'],
  audience: 'general',
  tone: 'professional',
  style: 'modern',
}

export async function generateComponent(
  prompt: string,
  config: ComponentSpec,
  componentName: string,
  auth: Record<string, string>
): Promise<ComponentState> {
  const filePath = join(process.cwd(), 'configs/templates', `${config.id}.json`)
  const raw = await readFile(filePath, 'utf-8')
  const template = JSON.parse(raw) as ComponentSpec

  const systemPrompt = buildSystemPrompt(template, componentName)
  const intent = auth.openrouter
    ? await analyzeIntent(prompt, auth.openrouter)
    : DEFAULT_INTENT

  const userPrompt = buildUserPrompt(intent, componentName, prompt)
  const chain = buildChain(auth)

  if (chain.length === 0) {
    return {
      name: componentName,
      code: '',
      status: 'error',
      version: 0,
      error: 'No API keys available',
    }
  }

  const result = await callWithFallback(
    userPrompt,
    { systemPrompt, temperature: 0.2, maxTokens: 2048 },
    auth,
    chain
  )

  return {
    name: componentName,
    code: result.code,
    status: 'ready',
    version: 1,
  }
}
