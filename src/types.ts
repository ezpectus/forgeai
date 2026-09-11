/**
 * Core type definitions for ForgeAI.
 *
 * These types enforce the plugin architecture and config-driven generation
 * described in docs/system-design.md.
 */

// ------------------------------------------------------------------------
// Project / Component State
// ------------------------------------------------------------------------

export type ProjectStatus = 'idle' | 'generating' | 'ready' | 'error'
export type ComponentStatus =
  'pending' | 'generating' | 'ready' | 'error' | 'editing'

export interface ComponentState {
  name: string
  code: string
  status: ComponentStatus
  version: number
  cost?: number
  error?: string
  /** Provider that produced this component (e.g. 'openrouter'). */
  provider?: string
  /** Exact model ID that produced this component. */
  model?: string
}

export interface Cancellable {
  disconnect: () => void
}

export interface ProjectState {
  projectId: string | null
  prompt: string
  intent: IntentResult | null
  components: ComponentState[]
  status: ProjectStatus
  deployUrl: string | null
  cost: number
  error: string | null
  generationClient: Cancellable | null
  /** Timestamp used by GenerationError to request a regeneration in PromptInput. */
  regenerateAt: number
  /** Template / mode used to generate the project (e.g. 'website', 'slides'). */
  templateId: string | null
  /** Full assembled project files from the generate SSE 'done' event. */
  files: Record<string, string> | null
}

export interface ProjectRecord {
  id: string
  /** User-assigned display name; falls back to the prompt when unset. */
  title?: string
  prompt: string
  mode: string
  provider: string
  model: string
  cost: number
  componentCount: number
  status: ProjectStatus
  createdAt: string
  files?: Record<string, string>
  /** Restorable generation state — lets "Open" rebuild the preview session. */
  components?: ComponentState[]
  intent?: IntentResult
  deployUrl?: string
}

export interface KeysState {
  openrouter: string | null
  huggingface: string | null
  gemini: string | null
  supabaseUrl: string | null
  supabaseKey: string | null
  vercel: string | null
}

export interface UIState {
  settingsOpen: boolean
  editorOpen: boolean
  galleryOpen: boolean
  customizeTemplateId: string | null
  selectedComponent: string | null
  deployStatus: 'idle' | 'deploying' | 'deployed' | 'failed'
  mobileSidebarOpen: boolean
  activeMode: string
  projectsOpen: boolean
}

// ------------------------------------------------------------------------
// Intent Analysis
// ------------------------------------------------------------------------

export interface IntentResult {
  type: string
  sections: SectionIntent[]
  palette: string
  dbRequired: boolean
  dbForms: string[]
  pages?: string[]
  audience?: string
  tone?: string
  style?: string
  /** Set when the intent was built from defaults due to a provider or parse failure. */
  warning?: string
}

export interface SectionIntent {
  name: string
  type: string
  description: string
  priority: number
  requiresForm?: boolean
  requiresImages?: boolean
  page?: string
}

// ------------------------------------------------------------------------
// AI Provider Plugin
// ------------------------------------------------------------------------

export interface GenConfig {
  model?: string
  fallback?: string[]
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  schema?: Record<string, unknown>
  /** External cancellation (client cancel/disconnect). Providers must
   *  combine it with their own request timeout. */
  signal?: AbortSignal
}

export interface GenResult {
  code: string
  tokensIn?: number
  tokensOut?: number
  model: string
  provider: string
  cost?: number
}

export interface HealthResult {
  ok: boolean
  status?: number
  error?: string
}

export interface AIProvider {
  name: string
  supportedModels: string[]
  defaultModel: string
  /**
   * Generate code/content from a prompt.
   * Must throw on failure so fallback logic can catch it.
   */
  generate(
    prompt: string,
    config: GenConfig,
    apiKey: string
  ): Promise<GenResult>
  /**
   * Check whether the provider is reachable.
   */
  health(apiKey: string): Promise<boolean | HealthResult>
  /**
   * Calculate cost based on token usage. Returns undefined when the model's
   * price is unknown — callers must not show a fake $0.
   */
  estimateCost?(
    tokensIn: number,
    tokensOut: number,
    model: string
  ): number | undefined
}

export class ProviderError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

// ------------------------------------------------------------------------
// Deployer Plugin
// ------------------------------------------------------------------------

export interface DeployFiles {
  [path: string]: string
}

export interface DeployResult {
  url: string
  deployId: string
  /** True when the deploy URL was returned before Vercel confirmed READY. */
  pending?: boolean
}

export interface DeployStatus {
  status: 'building' | 'ready' | 'error'
  url: string
  logs?: string
  error?: string
}

export interface Deployer {
  name: string
  /**
   * Deploy a set of files and return a live URL.
   * `env` carries build-time public env vars (e.g. NEXT_PUBLIC_PROJECT_ID).
   */
  deploy(
    files: DeployFiles,
    apiKey: string,
    env?: Record<string, string>
  ): Promise<DeployResult>
  /**
   * Check deployment status.
   */
  status(deployId: string, apiKey: string): Promise<DeployStatus>
  /**
   * Delete a deployed project.
   */
  delete?(deployId: string, apiKey: string): Promise<boolean>
}

// ------------------------------------------------------------------------
// Component / Template Spec
// ------------------------------------------------------------------------

/**
 * The fields that are actually read by the pipeline: `buildSystemPrompt`
 * consumes scope/stack/constraints, and routes read constraints for
 * validation deps. Template JSONs carry only these fields.
 */
export interface ComponentSpec {
  id: string
  name: string
  description: string
  scope: {
    allowed: string[]
    forbidden: string[]
  }
  stack: Record<string, string | string[]>
  constraints: Record<string, unknown>
}
