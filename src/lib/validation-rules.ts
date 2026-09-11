/**
 * The validation rule set applied to every generated component — shared by the
 * generate route, the templates/customize route, the component-edit route, and
 * the retry loop so the lists can never drift apart.
 */
export const COMPONENT_RULES: string[] = [
  'syntax',
  'hasDefaultExport',
  'noDangerousHtml',
  'noEval',
  'usesTailwindOnly',
  'imagesHaveAlt',
  'noLocalImageRefs',
  'formsHaveNames',
  'noForbiddenImports',
]
