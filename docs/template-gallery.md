# ForgeAI — Template Gallery

> **15,000+ ready-made templates.** Search by keyword, pick a category, and customize any template with a prompt.

---

## 1. Concept

Templates are pre-built starting points. Instead of writing a prompt from scratch, the user picks a template, sees its structure and design, enters their own content, and ForgeAI fills the template for them.

### Example Flow

```
User: "I need a pitch deck"
  → Opens gallery
  → Searches "pitch deck"
  → Sees 50+ templates
  → Selects "Business pitch deck"
  → Sees 10-slide preview with placeholders
  → Types: "Fintech startup called PayFlow, seed round $2M"
  → AI extracts: company=PayFlow, industry=fintech, round=seed, amount=$2M
  → AI fills placeholders and generates missing content
  → 10-slide deck with design and copy is ready
```

---

## 2. Template Categories

### By Type

| Type | Count | Examples |
|------|-------|----------|
| Websites | 5,000+ | Landing pages, portfolios, dashboards, blogs |
| Presentations | 7,000+ | Pitch decks, sales, educational, reports |
| Carousels | 3,000+ | Instagram, LinkedIn, X multi-slide posts |
| Reports | 500+ | Research, analysis, summaries |

### By Topic

| Topic | Examples |
|-------|----------|
| Portfolio | Photographer, designer, developer |
| Pitch decks | Business pitch, SaaS pitch, seed round |
| Landing pages | SaaS, app, product launch, waitlist |
| Business | Company overview, quarterly review, SOP |
| Education | Lesson plan, course outline, thesis |
| Marketing | Strategy, content calendar, campaign |
| Branding | Brand book, logo presentation, rebrand |
| Technology | Product launch, tech stack, API docs |
| Fashion & beauty | Lookbook, catalog, collection |
| Food & drink | Menu, restaurant, recipe cards |
| Real estate | Property listing, agent portfolio |
| Finance | Financial report, budget, investment memo |
| Photography | Gallery, wedding, travel blog |
| Health | Clinic landing, wellness, fitness plan |
| Productivity | Habits, time management, workflows |

---

## 3. Template Structure

Each template is a JSON file with this structure:

```json
{
  "id": "tpl-business-pitch-deck-001",
  "name": "Business pitch deck",
  "type": "presentation",
  "topic": "pitch-decks",
  "description": "10-slide pitch deck for startups seeking funding",
  "thumbnail": "/templates/thumbnails/tpl-001.png",
  "tags": ["startup", "funding", "investor"],
  "popularity": 4.8,
  "usesCount": 12450,

  "structure": {
    "slides": [
      {
        "id": "slide-1",
        "type": "TitleSlide",
        "layout": "centered",
        "placeholders": {
          "title": "{{companyName}}",
          "subtitle": "{{tagline}}"
        },
        "design": {
          "background": "gradient",
          "colors": ["#0F172A", "#3B82F6"],
          "font": "Inter"
        }
      }
    ]
  },

  "aiPrompt": {
    "systemPrompt": "Fill this pitch deck template using the user's input. Keep the structure and design. Replace {{placeholders}} only.",
    "userPromptTemplate": "Fill this pitch deck for: {{userInput}}",
    "placeholders": ["companyName", "tagline", "problemDescription", "solutionDescription"]
  },

  "customization": {
    "colors": true,
    "fonts": true,
    "layout": false,
    "addSlides": true,
    "removeSlides": true,
    "reorderSlides": true
  },

  "export": ["pdf", "pptx", "png"]
}
```

---

## 4. Customization Flow

1. User selects a template
2. User sees a preview with placeholder text
3. User types their context
4. ForgeAI:
   - Extracts entities from the input
   - Fills placeholders
   - Generates missing content
   - Preserves structure and design
5. User can inline-edit any slide/section
6. User exports to PDF, PPTX, PNG, ZIP, etc.

---

## 5. API

### List Templates

`GET /api/templates?type=website&topic=pitch-decks&search=yoga&page=1&limit=20`

```json
{
  "total": 15560,
  "page": 1,
  "limit": 20,
  "templates": [
    {
      "id": "tpl-001",
      "name": "Business pitch deck",
      "type": "presentation",
      "topic": "pitch-decks",
      "thumbnail": "/templates/thumbnails/tpl-001.png",
      "popularity": 4.8,
      "usesCount": 12450
    }
  ]
}
```

### Get Template

`GET /api/templates/:id`

Returns the full template JSON with structure, placeholders, and AI prompt.

### Customize Template

`POST /api/templates/:id/customize`

```json
{
  "userInput": "Fintech startup called PayFlow, seed round $2M",
  "customization": {
    "colors": ["#0F172A", "#3B82F6"],
    "font": "Inter"
  }
}
```

Response is an SSE stream:
```
event: analyzing
data: {"extracted":{"company":"PayFlow"}}

event: slide
data: {"id":"slide-1","status":"filled"}

event: done
data: {"projectId":"proj_xyz","slides":[...]}
```

### Create Community Template

`POST /api/templates`

```json
{
  "name": "My custom pitch deck",
  "type": "presentation",
  "topic": "pitch-decks",
  "structure": { ... },
  "aiPrompt": { ... },
  "isPublic": true
}
```

---

## 6. Directory Structure

```
public/templates/
├── thumbnails/
│   ├── tpl-001.png
│   └── ...
├── websites/
│   ├── portfolio/
│   ├── landing-pages/
│   ├── business/
│   ├── food-drink/
│   ├── real-estate/
│   └── health/
├── presentations/
│   ├── pitch-decks/
│   ├── business/
│   ├── education/
│   ├── marketing/
│   └── technology/
├── carousels/
│   ├── mental-health/
│   ├── finance/
│   ├── education/
│   └── ...
├── reports/
│   ├── finance/
│   ├── research/
│   └── ...
└── index.json
```

---

## 7. Community Templates

- Users can create and publish their own templates
- Auto-moderation: AST scan for unsafe patterns
- Manual review for Featured section
- Rating system (1-5 stars)
- Fork any template, customize, republish
- Tags and search
- Categories: Featured, Trending, New, Popular

---

## 8. UI Example

```
┌────────────────────────────────────────────────────────────┐
│  Start from a template that already works.                │
│  15,000+ of them.                                          │
│                                                            │
│  [Search by keyword...]                                    │
│                                                            │
│  Type:  [All] [Websites] [Presentations] [Carousels]       │
│  Topic: [All] [Portfolio] [Pitch decks] [Landing pages] ▼  │
│                                                            │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │  📊     │ │  🎨     │ │  💼     │ │  🚀     │          │
│  │ Business│ │ Creative│ │ Skincare│ │ Product │          │
│  │ pitch   │ │ brain-  │ │ brand   │ │ launch  │          │
│  │ deck    │ │ storming│ │         │ │ timeline│          │
│  │         │ │         │ │         │ │         │          │
│  │ presen- │ │ presen- │ │ presen- │ │ presen- │          │
│  │ tation  │ │ tation  │ │ tation  │ │ tation  │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                            │
│  Page 1 of 649   [Next →]                                 │
└────────────────────────────────────────────────────────────┘
```

---

## 9. Adding a Template

1. Create a JSON file in `public/templates/{type}/{topic}/`
2. Add a thumbnail in `public/templates/thumbnails/`
3. Test with at least 3 different prompts
4. Run the validation pipeline
5. Submit a PR with the `template` label

For the full template JSON schema, see [docs/templates.md](templates.md).
