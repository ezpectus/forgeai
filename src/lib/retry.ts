import { generateComponent } from './generate-component'
import { validateComponent } from './validate'
import type { ComponentSpec, ComponentState } from '@/types'

export async function retryComponent(
  prompt: string,
  config: ComponentSpec,
  componentName: string,
  currentCode: string,
  validationErrors: string[],
  auth: Record<string, string>,
  attempt = 0
): Promise<ComponentState> {
  if (attempt >= 2) {
    return {
      name: componentName,
      code: currentCode,
      status: 'error',
      version: attempt,
      error: `Max retries reached. ${validationErrors.join('; ')}`,
    }
  }

  const fixPrompt = `Fix this component. Current code:\n${currentCode}\n\nErrors:\n${validationErrors.join(
    '\n'
  )}\n\nReturn only the fixed component code. Do not explain.`

  const result = await generateComponent(fixPrompt, config, componentName, auth)

  if (result.status === 'error') {
    return result
  }

  const validation = await validateComponent(
    componentName,
    result.code,
    [
      'syntax',
      'hasDefaultExport',
      'noDangerousHtml',
      'noEval',
      'usesTailwindOnly',
      'imagesHaveAlt',
      'formsHaveNames',
      'noForbiddenImports',
    ],
    {
      allowed: config.constraints?.allowedDependencies as string[] | undefined,
      forbidden: config.constraints?.forbiddenDependencies as
        string[] | undefined,
    }
  )

  if (validation.valid) {
    return result
  }

  return retryComponent(
    prompt,
    config,
    componentName,
    result.code,
    validation.errors,
    auth,
    attempt + 1
  )
}
