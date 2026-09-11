import { OpenRouter } from './openrouter'
import { Gemini } from './gemini'
import { HuggingFace } from './huggingface'

/**
 * Fallback order: OpenRouter first, then Gemini, HuggingFace last (slowest).
 * `buildProviderChain` consumes this array directly.
 */
export const providers = [OpenRouter, Gemini, HuggingFace]
