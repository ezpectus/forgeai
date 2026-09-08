import { OpenRouter } from './openrouter'
import { HuggingFace } from './huggingface'
import { Gemini } from './gemini'
import { registry } from '../registry'

export const providers = [OpenRouter, HuggingFace, Gemini]

export function registerProviders() {
  registry.registerProvider('openrouter', OpenRouter)
  registry.registerProvider('huggingface', HuggingFace)
  registry.registerProvider('gemini', Gemini)
}
