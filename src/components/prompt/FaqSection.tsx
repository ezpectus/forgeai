'use client'

import { HelpCircle } from 'lucide-react'

const faqs = [
  {
    q: 'Which API key should I use?',
    a: 'Use the free Google Gemini key for the easiest start. OpenRouter and HuggingFace work too. Add one or more in Settings.',
  },
  {
    q: 'Is generation free?',
    a: 'Yes, if you use the free tier of Gemini, OpenRouter free models, or HuggingFace inference. You bring your own key; we do not bill you.',
  },
  {
    q: 'What can I generate?',
    a: 'Websites, slides, images, videos, chat bots, reports, canvases, carousels, audio pages, and spreadsheets. Pick a mode in the left sidebar.',
  },
  {
    q: 'How do model selection and fallback work?',
    a: 'Pick a provider and model, or leave it on Auto. If the chosen model fails or is rate-limited, ForgeAI tries your other saved keys automatically.',
  },
  {
    q: 'Where are my keys stored?',
    a: 'Only in your browser (IndexedDB). They are never sent to our servers except as part of direct API calls to the providers.',
  },
]

export function FaqSection() {
  return (
    <details className="group rounded border bg-background p-3 text-sm">
      <summary className="flex cursor-pointer items-center gap-2 font-medium text-foreground">
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
        FAQ
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        {faqs.map((item) => (
          <div key={item.q}>
            <p className="font-medium">{item.q}</p>
            <p className="text-muted-foreground">{item.a}</p>
          </div>
        ))}
      </div>
    </details>
  )
}
