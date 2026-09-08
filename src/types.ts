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
  error?: string
}

export interface ProjectState {
  projectId: string | null
  prompt: string
  intent: IntentResult | null
  components: ComponentState[]
  status: ProjectStatus
  deployUrl: string | null
  error: string | null
}

export interface KeysState {
  openrouter: string | null
  huggingface: string | null
  supabaseUrl: string | null
  supabaseKey: string | null
  vercel: string | null
}

export interface UIState {
  settingsOpen: boolean
  editorOpen: boolean
  selectedComponent: string | null
  deployStatus: 'idle' | 'deploying' | 'deployed' | 'failed'
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
}

export interface SectionIntent {
  name: string
  type: string
  description: string
  priority: number
  requiresForm?: boolean
  requiresImages?: boolean
}

// ------------------------------------------------------------------------
// AI Provider Plugin
// ------------------------------------------------------------------------

export interface GenConfig {
  model: string
  fallback?: string[]
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  schema?: Record<string, unknown>
}

export interface GenResult {
  code: string
  tokensIn?: number
  tokensOut?: number
  model: string
  provider: string
  cost?: number
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
  health(apiKey: string): Promise<boolean>
  /**
   * Calculate cost based on token usage.
   */
  estimateCost?(tokensIn: number, tokensOut: number, model: string): number
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
   */
  deploy(files: DeployFiles, apiKey: string): Promise<DeployResult>
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

export interface ValidationRule {
  name: string
  enabled: boolean
  except?: string[]
  params?: Record<string, unknown>
}

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
  components: string[]
  generation: {
    stages: string[]
    planModeRequiredFor?: string[]
    askClarifyingQuestions: boolean
    showPlanBeforeBuild: boolean
    parallelComponentGeneration: boolean
    maxRetriesPerComponent: number
  }
  validation: {
    autoTest: string[]
    staticAnalysisRules: string[]
    buildCommands?: string[]
  }
  model: {
    intentModel: string
    codeModel: string
    fallback: string[]
  }
  export: {
    formats: string[]
    includeDatabaseSchema: boolean
    includeReadme: boolean
    includeEnvExample: boolean
  }
  ui: {
    defaultPrompt: string
    examplePrompts: string[]
  }
}

// ------------------------------------------------------------------------
// Template Gallery
// ------------------------------------------------------------------------

export interface Template {
  id: string
  name: string
  type:
    | 'website'
    | 'presentation'
    | 'carousel'
    | 'report'
    | 'image'
    | 'video'
    | 'audio'
  topic: string
  description: string
  thumbnail: string
  tags: string[]
  popularity: number
  usesCount: number
  structure: TemplateStructure
  aiPrompt: TemplateAiPrompt
  customization: TemplateCustomization
  export: string[]
}

export interface TemplateStructure {
  slides?: TemplateSlide[]
  sections?: TemplateSection[]
  pages?: TemplatePage[]
}

export interface TemplateSlide {
  id: string
  type: string
  layout: string
  placeholders: Record<string, string>
  design: Record<string, unknown>
}

export interface TemplateSection {
  id: string
  type: string
  layout: string
  placeholders: Record<string, string>
  design: Record<string, unknown>
}

export interface TemplatePage {
  id: string
  name: string
  path: string
  sections: TemplateSection[]
}

export interface TemplateAiPrompt {
  systemPrompt: string
  userPromptTemplate: string
  placeholders: string[]
}

export interface TemplateCustomization {
  colors: boolean
  fonts: boolean
  layout: boolean
  addSlides: boolean
  removeSlides: boolean
  reorderSlides: boolean
}

// ------------------------------------------------------------------------
// API Request / Response Types
// ------------------------------------------------------------------------

export interface GenerateRequest {
  prompt: string
  config?: GenConfig
  templateId?: string | null
}

export interface GenerateComponentRequest {
  projectId: string
  componentName: string
  currentCode: string
  instruction: string
  config?: GenConfig
}

export interface DeployRequest {
  projectId: string
  provider: string
  files: DeployFiles
}

export interface ExportRequest {
  projectId: string
  files: DeployFiles
  format?: 'zip' | 'json'
}

export interface DbBindRequest {
  projectId: string
  supabaseUrl: string
  supabaseKey: string
  forms: Array<{
    name: string
    fields: Array<{
      name: string
      type: string
      required?: boolean
    }>
  }>
}

// ------------------------------------------------------------------------
// Cost & Metrics
// ------------------------------------------------------------------------

export interface CostBreakdown {
  step: string
  model: string
  provider: string
  tokensIn: number
  tokensOut: number
  cost: number
}

export interface GenerationMetrics {
  totalCost: number
  totalTimeMs: number
  steps: CostBreakdown[]
  retries: number
}
