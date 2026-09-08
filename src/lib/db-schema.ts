export interface FormField {
  name: string
  type: string
}

export interface FormIntent {
  name: string
  fields: FormField[]
}

function pgType(tsType: string): string {
  switch (tsType) {
    case 'email':
      return 'text'
    case 'number':
      return 'numeric'
    case 'textarea':
    case 'text':
    default:
      return 'text'
  }
}

export function generateSchema(forms: FormIntent[], projectId: string): string {
  const lines: string[] = []

  for (const form of forms) {
    const tableName = `ai_gen_${projectId}_${form.name}`

    lines.push(`CREATE TABLE IF NOT EXISTS ${tableName} (`)
    lines.push(`  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),`)

    for (const field of form.fields) {
      lines.push(`  ${field.name} ${pgType(field.type)} NOT NULL,`)
    }

    lines.push(`  created_at timestamptz DEFAULT now()`)
    lines.push(`);`)
    lines.push('')
    lines.push(`ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`)
    lines.push(`CREATE POLICY allow_all ON ${tableName} FOR ALL USING (true);`)
    lines.push('')
  }

  return lines.join('\n')
}
