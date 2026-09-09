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
  // Use a single shared submissions table instead of per-form/per-project tables.
  // The generated FormHandler inserts { project_id, form_name, payload } here.
  void forms
  void projectId

  return `CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL,
  form_name text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_inserts" ON submissions FOR INSERT TO anon WITH CHECK (true);`
}
