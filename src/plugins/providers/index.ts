import { OpenRouter } from './openrouter'
import { HuggingFace } from './huggingface'
import { registry } from '../registry'

export const providers = [OpenRouter, HuggingFace]

export function registerProviders() {
  registry.registerProvider('openrouter', OpenRouter)
  registry.registerProvider('huggingface', HuggingFace)
}
