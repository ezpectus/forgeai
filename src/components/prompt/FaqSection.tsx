'use client'

import { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const faqs = [
  {
    q: 'Which API key should I use?',
    a: 'Google Gemini is the easiest free start — get a key at Google AI Studio. OpenRouter gives 200+ models. HuggingFace is free for open-source models.',
  },
  {
    q: 'Is it free to generate?',
    a: 'Yes, with Gemini, HuggingFace, or OpenRouter free models. You pay providers directly, never us. A typical landing page costs ~$0.002.',
  },
  {
    q: 'What can I make?',
    a: 'Websites, slides, images, videos, chat bots, reports, canvases, carousels, audio pages, and spreadsheets. Select a mode in the left sidebar and the example ideas update automatically.',
  },
  {
    q: 'How do I pick a model?',
    a: 'Choose Auto or a provider in the model selector. The app fetches the live list of available models. If your chosen model fails, ForgeAI falls back to your other saved keys.',
  },
  {
    q: 'Where are my API keys stored?',
    a: 'Only in your browser (IndexedDB). They are never stored on our server. They are sent straight to the AI provider with each request.',
  },
  {
    q: 'Why did generation fail?',
    a: 'Usually an invalid API key, no credit, a rate limit, or a model that is temporarily unavailable. Check the key in Settings and try the Test button.',
  },
]

export function FaqSection() {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div className="rounded border bg-background p-3 text-sm">
      <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
        Frequently asked questions
      </div>
      <div className="flex flex-col gap-2">
        {faqs.map((item) => {
          const isOpen = open === item.q
          return (
            <div
              key={item.q}
              className="rounded border-b last:border-b-0 pb-2 last:pb-0"
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : item.q)}
                className="flex w-full items-center justify-between py-1 text-left font-medium"
              >
                {item.q}
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    isOpen && 'rotate-180'
                  )}
                />
              </button>
              {isOpen && (
                <p className="pt-1 text-muted-foreground">{item.a}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
