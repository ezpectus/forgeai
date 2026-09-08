export interface Variant {
  id: string
  name: string
  weight: number
  content: string
}

export interface ConversionSummary {
  variantId: string
  count: number
}

export function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash)
}

export function getVariant(variants: Variant[], visitorId: string): Variant {
  if (variants.length === 0) {
    throw new Error('At least one variant is required')
  }

  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0)
  const hash = hashString(visitorId)
  const scaled = hash % totalWeight

  let cumulative = 0
  for (const variant of variants) {
    cumulative += variant.weight
    if (scaled < cumulative) {
      return variant
    }
  }

  return variants[variants.length - 1]
}

export function getWinner(
  variants: Variant[],
  counts: Record<string, number>
): Variant | null {
  let winner: Variant | null = null
  let max = -1

  for (const variant of variants) {
    const count = counts[variant.id] ?? 0
    if (count > max) {
      max = count
      winner = variant
    } else if (count === max) {
      winner = null
    }
  }

  return winner
}
